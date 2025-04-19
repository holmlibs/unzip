# @holmlibs/unzip

A fast and efficient ZIP file extraction library for Bun. This library provides a simple API for reading and extracting ZIP files with support for both single-file and batch extraction operations.

## Features

- 🚀 Fast ZIP file extraction
- 📦 Support for both single-file and batch extraction
- 📊 Progress tracking for extraction operations
- 🔄 Concurrent file extraction with customizable limits
- 💡 Simple and intuitive API

## Installation

```bash
bun add @holmlibs/unzip
```

## Usage

### Basic Example

```typescript
import { createZipReader } from '@holmlibs/unzip';

// Create a ZIP reader
const reader = createZipReader('path/to/archive.zip');

// Extract all files
await reader.extractAll('output/directory', (current, total) => {
  console.log(`Progress: ${current}/${total} files`);
});

// Extract a single file
const entry = reader.getEntry('example.txt');
if (entry) {
  // Get file content as text
  const text = await entry.getText();
  console.log(text);

  // Or extract to a specific location
  await entry.extractTo('output/directory');
}
```

## API Reference

### `createZipReader(archivePath: string): ZipReader`

Creates a new ZIP reader instance for the specified archive.

### ZipReader Interface

#### `extractAll(directory: string, onProgress?: (current: number, total: number) => void, concurrencyLimit?: number): Promise<void>`

Extracts all files from the archive to the specified directory.

- `directory`: Target directory for extraction
- `onProgress`: Optional callback for progress tracking
- `concurrencyLimit`: Optional limit for concurrent extractions (default: 100)

#### `getEntry(entryName: string): ZipEntry | undefined`

Retrieves a specific entry from the archive.

### ZipEntry Interface

#### `getBuffer(): Promise<Buffer>`

Returns the entry's content as a Buffer.

#### `getText(encoding?: string): Promise<string>`

Returns the entry's content as text.

#### `extractTo(directory: string): Promise<void>`

Extracts the entry to the specified directory.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
