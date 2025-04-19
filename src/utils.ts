import { mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

/**
 * Converts any error object or value into a string message.
 *
 * @param error - The error object or value to convert.
 * @returns A string representation of the error message.
 */
export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Ensures that the parent directory of the given target path exists.
 *
 * If the directory is not already tracked in `createdDirs`, it attempts to
 * create it recursively. If directory creation fails due to a race condition
 * or permissions issue, it checks if the directory already exists before throwing.
 *
 * @param targetPath - The full path whose parent directory should be ensured.
 * @param createdDirs - A Set tracking directories that have already been created.
 * @returns A Promise that resolves once the parent directory exists.
 * @throws {Error} If the directory cannot be created and does not already exist.
 */
export async function ensureDirectory(
	targetPath: string,
	createdDirs: Set<string>,
): Promise<void> {
	const parentDir = dirname(targetPath);
	if (!createdDirs.has(parentDir)) {
		try {
			await mkdir(parentDir, { recursive: true });
			createdDirs.add(parentDir);
		} catch (err) {
			// Handle potential race conditions or permission issues
			try {
				const stats = await stat(parentDir);
				if (!stats.isDirectory()) {
					throw new Error(
						`Failed to create directory '${parentDir}', and it's not a directory.`,
					);
				}
				// If it exists and is a directory, add it to the set
				createdDirs.add(parentDir);
			} catch {
				// If stat fails, the original error is likely the cause
				throw new Error(
					`Failed to create directory '${parentDir}': ${getErrorMessage(err)}`,
				);
			}
		}
	}
}

/**
 * Validates and normalizes a ZIP entry path to prevent directory traversal attacks.
 *
 * @param entryName - The name of the entry from the ZIP archive.
 * @param outputDir - The target directory where files will be extracted.
 * @returns A safe, normalized absolute path within the output directory.
 * @throws {Error} If the path would escape the output directory (zip slip attack).
 */
export function validatePath(entryName: string, outputDir: string): string {
	// Normalize & verify the path to avoid zip-slip attacks
	const safeName = entryName
		.replace(/\\/g, '/') // Convert backslashes to forward slashes
		.replace(/^(\.\.(\/?|$))+/, '') // Remove leading "../" sequences
		.replace(/^\/+/, '') // Remove leading slashes
		.replace(/^[A-Za-z]:(\/?|\\)/, ''); // Remove drive letters
	const targetPath = join(outputDir, safeName);
	const resolvedPath = resolve(targetPath);
	const resolvedOutputDir = resolve(outputDir);
	if (
		resolvedPath !== resolvedOutputDir &&
		!resolvedPath.startsWith(resolvedOutputDir + sep)
	) {
		throw new Error(`Rejected potentially unsafe path: ${safeName}`);
	}
	return targetPath;
}
