// (() => {
// 	const startTime = Date.now();
// 	// getEntriesFromCentralDirectory(readFileSync('out/forge-1.21.5-55.0.4.jar'));
// 	// getEntries(readFileSync('out/forge-1.21.5-55.0.4.jar'));
// 	// console.log(result.keys());
// 	console.log(`${Date.now() - startTime}ms`);
// })();

// (async () => {
// 	const startTime = Date.now();
// 	const zipper = createZipReader('out/forge-installer.jar');
// 	await zipper.getEntry('install_profile.json')?.getText();
// 	await zipper.extractAll('out/forge-installer');
// 	console.log(`${Date.now() - startTime}ms`);
// })();

// async function extractZip(zipFilePath: string, outputDir: string) {
// 	try {
// 		const startTime = Date.now();
// 		console.log(`Extracting ${zipFilePath} to ${outputDir}`);
// 		await extract(zipFilePath, outputDir, (processed, total) => {
// 			const percentage = Math.round((processed / total) * 100);
// 			process.stdout.write(`Extracting... ${percentage}%\r`);
// 		});
// 		const endTime = Date.now();
// 		const duration = (endTime - startTime) / 1000;
// 		console.log(`\nExtraction completed in ${duration.toFixed(2)}s`);
// 		return true;
// 	} catch (error) {
// 		console.error('Error extracting ZIP file:', error);
// 		return false;
// 	}
// }
// extractZip('out/forge-installer.jar', 'out/forge-installer');
