import ignore from "ignore";

const DEFAULT_IGNORES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  "*.min.js",
  "*.map",
  "*.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.pdf",
  "*.zip",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
  "*.ico",
  ".env*",
  "*.log"
];

export interface FileContent {
  path: string;
  content: string;
}

export async function pickAndReadWorkspace(): Promise<FileContent[]> {
  // Check browser compatibility
  if (!("showDirectoryPicker" in window)) {
    throw new Error("Your browser doesn't support folder selection. Please use Chrome/Edge or upload a .zip instead.");
  }

  try {
    // @ts-ignore - File System Access API is not in TS yet
    const dirHandle = await window.showDirectoryPicker();
    const files: { path: string; file: File }[] = [];

    async function walkDirectory(
      handle: FileSystemDirectoryHandle, 
      prefix = ""
    ): Promise<void> {
      // @ts-ignore - entries() method exists but not in TS types yet
      for await (const [name, entry] of handle.entries()) {
        const path = `${prefix}${name}`;
        
        // @ts-ignore
        if (entry.kind === "directory") {
          await walkDirectory(entry, `${path}/`);
        } else {
          const file = await (entry as FileSystemFileHandle).getFile();
          files.push({ path, file });
        }
      }
    }

    await walkDirectory(dirHandle);

    // Create ignore instance with default patterns
    const ig = ignore().add(DEFAULT_IGNORES);
    
    // Read .aiignore file if it exists
    const aiIgnoreFile = files.find(f => f.path === ".aiignore");
    if (aiIgnoreFile) {
      try {
        const content = await aiIgnoreFile.file.text();
        const customIgnores = content
          .split("\n")
          .map(line => line.trim())
          .filter(line => line && !line.startsWith("#"));
        ig.add(customIgnores);
      } catch (error) {
        console.warn("Failed to read .aiignore file:", error);
      }
    }
    
    // Filter and read files
    const result: FileContent[] = [];
    const maxFileSize = 1_000_000; // 1MB

    for (const { path, file } of files) {
      // Check if file should be ignored
      if (ig.ignores(path) || file.size > maxFileSize) {
        continue;
      }

      try {
        const content = await file.text();
        // Skip binary files (simple check for null bytes)
        if (content.includes("\0")) {
          continue;
        }
        result.push({ path, content });
      } catch (error) {
        console.warn(`Failed to read file ${path}:`, error);
      }
    }

    return result;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("File selection was cancelled by the user");
    }
    throw new Error(`Failed to read workspace: ${error.message}`);
  }
}