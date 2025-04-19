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

## High-Level API Examples

The high-level API provides a convenient interface using `createZipReader`.

### Extract All Files

```typescript
await createZipReader('test.zip').extractAll('test');
```
Extracts all files from 'test.zip' to the 'test' directory.

### Extract Single File

```typescript
await createZipReader('test.zip').getEntry('example.txt')?.extractTo('test');
```
Extracts only 'example.txt' from the ZIP file to the 'test' directory.

### List All Entries

```typescript
createzipReader('test.zip').getEntries();
```
Returns a Map containing all entries in the ZIP file.

### Get File Buffer

```typescript
await createZipReader('test.zip').getEntry('example.txt')?.getBuffer();
```
Returns the raw buffer content of 'example.txt'.

### Get File Text

```typescript
await createZipReader('test.zip').getEntry('example.txt')?.getText();
```
Returns the text content of 'example.txt' (assumes UTF-8 encoding).

## Low-Level API Examples

The low-level API provides more control over the extraction process.

### List Entry Details

```typescript
const buffer = readFileSync('test.zip');
const entries = getEntries(buffer);
entries.forEach((entry) => {
    console.log('Entry name', entry[0]); 
    console.log('Compression method', entry[1]);
    console.log('Position data', entry[2]);
});
```
Lists detailed information about each entry in the ZIP file.

### Extract All Files (Low-Level)

```typescript
const buffer = readFileSync('test.zip');
const entries = getEntries(buffer);
await extractAll(buffer, entries, 'test');
```
Extracts all files using the low-level API.

### Extract Single File (Low-Level)

```typescript
const buffer = readFileSync('test.zip');
const entries = getEntries(buffer);
const entry = entries.get('example.txt');
if(entry)
    await extractEntry(buffer, entry, 'test');
```
Extracts a single file using the low-level API.

### Manual Decompression

```typescript
const buffer = readFileSync('test.zip');
const entries = getEntries(buffer);
const entry = entries.get('example.txt');
if(entry){
    const decompressed = await decompressEntry(buffer, entry);
    await writeFile(join('test', entry[0]), decompressed);
}
```
Manually decompresses and writes a file using the lowest-level API functions.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
