import { dirname, join, resolve, sep } from 'node:path';
import { mkdir, stat } from 'node:fs/promises';

export function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

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
