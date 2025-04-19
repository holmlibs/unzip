import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "fs/promises";
import JSZip from "jszip";
import { join } from "path";
import { createZipReader } from "../src/reader";

const TEST_DIR = "test/temp";
const TEST_ZIP = join(TEST_DIR, "test.zip");
const EXTRACT_DIR = join(TEST_DIR, "extracted");

describe("ZipReader", () => {
  beforeAll(async () => {
    // Create test directory and a simple zip file for testing
    await mkdir(TEST_DIR, { recursive: true });
    
    // Create a test zip file using JSZip
    const zip = new JSZip();
    zip.file("test.txt", "Hello, World!");
    const zipContent = await zip.generateAsync({type: "nodebuffer"});
    await writeFile(TEST_ZIP, zipContent);
  });

  afterAll(async () => {
    // Cleanup test directory
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  test("createZipReader should create a valid reader", () => {
    const reader = createZipReader(TEST_ZIP);
    expect(reader).toBeDefined();
    expect(typeof reader.extractAll).toBe("function");
    expect(typeof reader.getEntry).toBe("function");
    expect(typeof reader.getEntries).toBe("function");
  });

  test("getEntry should return undefined for non-existent entry", () => {
    const reader = createZipReader(TEST_ZIP);
    const entry = reader.getEntry("non-existent.txt");
    expect(entry).toBeUndefined();
  });

  test("getEntry should return valid entry for existing file", () => {
    const reader = createZipReader(TEST_ZIP);
    const entry = reader.getEntry("test.txt");
    expect(entry).toBeDefined();
    expect(typeof entry?.getBuffer).toBe("function");
    expect(typeof entry?.getText).toBe("function");
    expect(typeof entry?.extractTo).toBe("function");
  });

  test("getText should return correct content", async () => {
    const reader = createZipReader(TEST_ZIP);
    const entry = reader.getEntry("test.txt");
    const content = await entry?.getText();
    expect(content).toBe("Hello, World!");
  });

  test("extractAll should extract all files", async () => {
    const reader = createZipReader(TEST_ZIP);
    await reader.extractAll(EXTRACT_DIR);
    
    // Verify extracted file
    const extractedContent = await Bun.file(join(EXTRACT_DIR, "test.txt")).text();
    expect(extractedContent).toBe("Hello, World!");
  });

  test("extractAll should handle progress callback", async () => {
    const reader = createZipReader(TEST_ZIP);
    let progressCalled = false;
    let lastProgress = 0;
    
    await reader.extractAll(EXTRACT_DIR, (current, total) => {
      progressCalled = true;
      lastProgress = current / total;
    });

    expect(progressCalled).toBe(true);
    expect(lastProgress).toBe(1);
  });

  test("extractTo should extract single file", async () => {
    const reader = createZipReader(TEST_ZIP);
    const entry = reader.getEntry("test.txt");
    await entry?.extractTo(EXTRACT_DIR);
    
    const extractedContent = await Bun.file(join(EXTRACT_DIR, "test.txt")).text();
    expect(extractedContent).toBe("Hello, World!");
  });
});