export type ZipEntry = [
	entryName: string,
	compressionType: number,
	rawDataPos: [start: number, end: number],
];

export type ZipProgressCallback = (
	filesProcessed: number,
	totalFiles: number,
) => void;

export interface ZipReader {
	/**
	 * Extracts all files from the archive to the specified directory
	 * @param directory - The target directory where all files will be extracted
	 * @param onProgress - Optional callback for progress updates
	 * @param concurrencyLimit - Optional limit for simultaneous extractions (defaults to 10)
	 * @returns Promise that resolves when all files have been extracted
	 */
	extractAll: (
		directory: string,
		onProgress?: ZipProgressCallback,
		concurrencyLimit?: number,
	) => Promise<void>;

	/**
	 * Gets a specific entry from the archive by its name
	 * @param entryName - The name of the entry to retrieve (e.g., 'file.txt', 'folder/file.json')
	 * @returns Entry handler object if found, undefined otherwise
	 */
	getEntry: (entryName: string) => EntryReturnType | undefined;
}

export interface EntryReturnType {
	/**
	 * Returns the raw decompressed buffer of the zip entry
	 * @returns Promise that resolves with the decompressed buffer
	 */
	getBuffer: () => Promise<Buffer>;

	/**
	 * Returns the content of the zip entry as text
	 * @param encoding - The character encoding to use (defaults to 'utf-8')
	 * @returns Promise that resolves with the text content
	 */
	getText: (encoding?: BufferEncoding) => Promise<string>;

	/**
	 * Extracts the zip entry to a file in the specified directory
	 * @param directory - The target directory where the file will be created
	 * @returns Promise that resolves when the file has been written
	 */
	extractTo: (directory: string) => Promise<void>;
}
