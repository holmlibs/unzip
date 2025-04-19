import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inflateRaw } from 'node:zlib';
import {
	CENTRAL_DIR_HEADER,
	DEFAULT_CONCURRENCY,
	DEFLATE,
	EOCD_MIN_SIZE,
	EOCD_SIGNATURE,
	MIN_CDFH_SIZE,
	MIN_LOCAL_HEADER_SIZE,
	STORE,
} from './constants';
import { extractAll } from './extractor';
import type { ZipEntry, ZipReader } from './types';

/**
 * Finds the End of Central Directory (EOCD) record offset in the buffer.
 * Searches backwards from the end of the buffer.
 *
 * @param buffer - The buffer containing the ZIP archive data.
 * @returns The offset of the EOCD signature, or -1 if not found.
 */
function findEOCD(buffer: Buffer): number {
	const maxScanLen = Math.min(buffer.length, 65535 + EOCD_MIN_SIZE); // Max comment size + EOCD size
	const startScanOffset = buffer.length - EOCD_MIN_SIZE;

	for (
		let offset = startScanOffset;
		offset >= buffer.length - maxScanLen;
		offset--
	) {
		if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
			return offset;
		}
	}
	return -1;
}

/**
 * Parses the ZIP archive buffer using the Central Directory.
 *
 * @param buffer - The buffer containing the ZIP archive data.
 * @returns A map where each key is an entry name and each value is the corresponding {@link ZipEntry}.
 * @throws {Error} If the EOCD record is not found or the archive seems corrupt.
 */
export function getEntries(buffer: Buffer): Map<string, ZipEntry> {
	const eocdOffset = findEOCD(buffer);
	if (eocdOffset === -1) {
		throw new Error('End of Central Directory record not found.');
	}

	// Read EOCD fields
	const entryCount = buffer.readUInt16LE(eocdOffset + 10); // Use total entries field
	const centralDirSize = buffer.readUInt32LE(eocdOffset + 12); // Corrected: Size is at offset 12
	const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

	if (centralDirOffset + centralDirSize > eocdOffset) {
		// Basic sanity check
		throw new Error('Central Directory information seems corrupt.');
	}

	const entries: Map<string, ZipEntry> = new Map([]);
	let currentOffset = centralDirOffset;
	const centralDirEnd = centralDirOffset + centralDirSize;

	for (let i = 0; i < entryCount && currentOffset < centralDirEnd; i++) {
		if (buffer.readUInt32LE(currentOffset) !== CENTRAL_DIR_HEADER) {
			console.warn(
				`Expected Central Directory Header not found at offset ${currentOffset}. Skipping remaining entries.`,
			);
			break; // Stop parsing if structure is broken
		}

		if (currentOffset + MIN_CDFH_SIZE > centralDirEnd) {
			console.warn(
				`Incomplete Central Directory Header found at offset ${currentOffset}. Stopping parse.`,
			);
			break;
		}

		// Parse CDFH
		const compressionType = buffer.readUInt16LE(currentOffset + 10);
		const compressedSize = buffer.readUInt32LE(currentOffset + 20);
		const fileNameLength = buffer.readUInt16LE(currentOffset + 28);
		const extraFieldLength = buffer.readUInt16LE(currentOffset + 30);
		const fileCommentLength = buffer.readUInt16LE(currentOffset + 32);
		const localHeaderOffset = buffer.readUInt32LE(currentOffset + 42);

		const cdfhHeaderEnd = currentOffset + MIN_CDFH_SIZE;
		const fileNameEnd = cdfhHeaderEnd + fileNameLength;
		const extraFieldEnd = fileNameEnd + extraFieldLength;
		const fileCommentEnd = extraFieldEnd + fileCommentLength;

		if (fileCommentEnd > centralDirEnd) {
			console.warn(
				`Central Directory Header lengths exceed directory bounds at offset ${currentOffset}. Stopping parse.`,
			);
			break;
		}

		const entryName = buffer.subarray(cdfhHeaderEnd, fileNameEnd).toString();

		// Now, we need the actual data. We use the localHeaderOffset to find the LFH,
		// read its variable parts (filename, extra field) to find where the data starts.
		if (localHeaderOffset + MIN_LOCAL_HEADER_SIZE > buffer.length) {
			console.warn(
				`Local header offset ${localHeaderOffset} for entry "${entryName}" is out of bounds. Skipping.`,
			);
			currentOffset = fileCommentEnd; // Move to next CDFH
			continue;
		}

		// Read LFH to find data start offset
		const lfhFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
		const lfhExtraFieldLength = buffer.readUInt16LE(localHeaderOffset + 28);
		const dataStartOffset =
			localHeaderOffset +
			MIN_LOCAL_HEADER_SIZE +
			lfhFileNameLength +
			lfhExtraFieldLength;
		const dataEndOffset = dataStartOffset + compressedSize;

		if (dataEndOffset > buffer.length) {
			console.warn(
				`Calculated data end offset ${dataEndOffset} for entry "${entryName}" is out of bounds. Skipping.`,
			);
			currentOffset = fileCommentEnd; // Move to next CDFH
			continue;
		}

		// Store the entry using the same ZipEntry structure
		entries.set(entryName, [
			entryName,
			compressionType,
			[dataStartOffset, dataEndOffset],
		]);

		// Move to the next CDFH entry
		currentOffset = fileCommentEnd;
	}

	if (entries.size !== entryCount) {
		console.warn(
			`Expected ${entryCount} entries based on EOCD, but parsed ${entries.size}. Archive might be truncated or corrupt.`,
		);
	}

	return entries;
}

/**
 * Decompresses a ZIP entry using the specified compression method.
 *
 * @param buffer - The full ZIP archive buffer.
 * @param entry - The ZIP entry tuple containing entry name, compression type, and position data.
 * @returns A promise that resolves to the decompressed buffer.
 *
 * @throws {Error} If the compression method is unsupported.
 * @throws {Error} If decompression fails or results in an empty buffer.
 */
export function decompressEntry(
	buffer: Buffer,
	[, compressionType, [start, end]]: ZipEntry,
): Promise<Buffer> {
	const rawData = buffer.subarray(start, end);
	switch (compressionType) {
		case STORE:
			return Promise.resolve(rawData);

		case DEFLATE: {
			// Handle potentially zero-byte compressed data for DEFLATE (e.g., empty file)
			if (rawData.length === 0) {
				return Promise.resolve(Buffer.alloc(0));
			}
			return new Promise((resolve, reject) => {
				inflateRaw(rawData, (error, decompressed) => {
					if (error) {
						reject(new Error(`Decompression failed: ${error.message}`));
						return;
					}
					// Decompression might legitimately result in an empty buffer if original was empty
					resolve(decompressed ?? Buffer.alloc(0));
				});
			});
		}

		default:
			return Promise.reject(
				new Error(`Unsupported compression method: ${compressionType}`),
			);
	}
}

/**
 * Creates a ZIP or JAR archive reader that provides methods to extract all files or access individual entries.
 *
 * @param archivePath - Path to the ZIP or JAR file.
 * @returns An object with methods to extract all files, retrieve a specific entry, read entry contents as a buffer or text, and extract individual entries.
 *
 * @example
 * const zip = createZipReader('archive.zip');
 * const entry = zip.getEntry('file.txt');
 * if (entry) {
 *   const text = await entry.getText();
 *   await entry.extractTo('output/dir');
 * }
 * await zip.extractAll('output/dir');
 */
export function createZipReader(archivePath: string): ZipReader {
	const buffer = readFileSync(archivePath);
	const entries = getEntries(buffer);

	return {
		extractAll: (
			directory,
			onProgress = () => {},
			concurrencyLimit = DEFAULT_CONCURRENCY,
		) => extractAll(buffer, entries, directory, onProgress, concurrencyLimit),
		getEntries: () => entries,
		getEntry: (entryName) => {
			const entry = entries.get(entryName);
			if (!entry) return;

			// Store the entry data, but don't decompress yet
			const originalEntryData = entry;
			// Cache for the decompression promise, initialized lazily
			let decompressedDataPromise: Promise<Buffer> | null = null;

			// Helper function to get or create the decompression promise
			const getDecompressedPromise = (): Promise<Buffer> => {
				if (!decompressedDataPromise) {
					// Decompress only when first needed
					decompressedDataPromise = decompressEntry(buffer, originalEntryData);
				}
				return decompressedDataPromise;
			};

			return {
				getBuffer: () => getDecompressedPromise(),
				getText: async (encoding = 'utf8') => {
					const decompressed = await getDecompressedPromise();
					return decompressed.toString(encoding);
				},
				extractTo: async (directory) => {
					const decompressed = await getDecompressedPromise();
					// Use the original entryName for the path
					return writeFile(join(directory, originalEntryData[0]), decompressed);
				},
			};
		},
	};
}
