/**
 * Represents metadata for a zip file
 */
export interface ZipMetadata {
	fileName: string;
	size: number;
	lastModified: Date;
}

/**
 * Type for supported zip file extensions
 */
export type ZipExtension = '.zip' | '.7z' | '.rar';

/**
 * Checks if a given file name has a zip extension
 */
export function isZipFile(fileName: string): boolean {
	const validExtensions: ZipExtension[] = ['.zip', '.7z', '.rar'];
	const ext = fileName
		.toLowerCase()
		.slice(fileName.lastIndexOf('.')) as ZipExtension;
	return validExtensions.includes(ext);
}
