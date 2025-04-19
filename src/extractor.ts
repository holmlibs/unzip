import { writeFile } from 'node:fs/promises';
import { DEFAULT_CONCURRENCY } from './constants';
import { decompressEntry } from './reader';
import type { ZipEntry, ZipProgressCallback } from './types';
import { ensureDirectory, getErrorMessage, validatePath } from './utils';

/**
 * Extracts a single ZIP entry to the specified output directory.
 *
 * Skips extraction if the entry represents a directory. Ensures the parent directory exists before writing the decompressed file.
 *
 * @param buffer - The full ZIP archive buffer.
 * @param entry - The ZIP entry tuple containing entry name, compression type, and position data.
 * @param outputDir - The directory where the entry will be extracted.
 * @param createdDirs - An optional set used to track and avoid redundant directory creation.
 *
 * @returns A promise that resolves when the entry has been extracted.
 */
export async function extractEntry(
	buffer: Buffer,
	[entryName, compressionType, rawDataPos]: ZipEntry,
	outputDir: string,
	createdDirs?: Set<string>,
): Promise<void> {
	// Skip directories
	if (entryName.endsWith('/')) return;

	const targetPath = validatePath(entryName, outputDir);
	await ensureDirectory(targetPath, createdDirs ?? new Set<string>());

	// Decompress data (handles STORE and DEFLATE)
	const decompressedData = await decompressEntry(buffer, [
		entryName,
		compressionType,
		rawDataPos,
	]);

	// Write the file
	return writeFile(targetPath, decompressedData);
}

/**
 * Extracts all files from a ZIP or JAR archive to a specified directory.
 *
 * @param buffer - Buffer containing the ZIP or JAR archive data.
 * @param entries - Map of entries parsed from the central directory.
 * @param outputDir - Directory where files will be extracted.
 * @param onProgress - Optional callback invoked with the number of files extracted and the total number of entries.
 * @param concurrencyLimit - The maximum number of files to process concurrently.
 *
 * @returns A promise that resolves when extraction is complete.
 */
export async function extractAll(
	buffer: Buffer,
	entries: Map<string, ZipEntry>,
	outputDir: string,
	onProgress: ZipProgressCallback = () => {},
	concurrencyLimit: number = DEFAULT_CONCURRENCY,
): Promise<void> {
	const createdDirs = new Set<string>();
	const entryIterator = entries.values();
	const activePromises: Promise<void>[] = [];
	let iteratorResult = entryIterator.next();
	let current = 0;

	// Defensive: guarantee progress even with bad input
	const effectiveConcurrencyLimit =
		concurrencyLimit < 1 || !Number.isFinite(concurrencyLimit)
			? 1
			: concurrencyLimit;

	// Function to process a single entry
	const processEntry = async (entry: ZipEntry): Promise<void> => {
		try {
			await extractEntry(buffer, entry, outputDir, createdDirs);
		} catch (err) {
			// Log error for the specific entry but allow others to continue
			console.error(
				`Error extracting entry "${entry[0]}": ${getErrorMessage(err)}`,
			);
		} finally {
			// Update progress regardless of success/failure of individual file
			current++;
			onProgress(current, entries.size);
		}
	};

	onProgress(0, entries.size);

	// Loop to manage concurrency
	while (true) {
		// Fill the pool up to the concurrency limit as long as there are entries
		while (
			activePromises.length < effectiveConcurrencyLimit &&
			!iteratorResult.done
		) {
			const promise = processEntry(iteratorResult.value).then(() => {
				// When a promise finishes, remove it from the active pool
				const index = activePromises.indexOf(promise);
				if (index > -1) {
					activePromises.splice(index, 1);
				}
			});
			activePromises.push(promise);
			iteratorResult = entryIterator.next();
		}

		// If there are no more entries to queue and the pool is empty, we're done
		if (iteratorResult.done && activePromises.length === 0) {
			break; // Exit the main loop
		}

		// Wait for at least one promise in the pool to settle
		// If race rejects, the error will propagate out of 'extract' automatically
		if (activePromises.length > 0) {
			await Promise.race(activePromises);
		} else if (iteratorResult.done) {
			// Should have already broken the loop, but double-check
			break;
		}
	}
}
