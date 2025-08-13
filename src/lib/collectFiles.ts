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
        
        if (entry.kind === "directory") {
          await walkDirectory(entry, `${path}/`);
        } else {
          const file = await (entry as FileSystemFileHandle).getFile();
          files.push({ path, file });
        }
      }
    }

    await walkDirectory(dirHandle);

    // Check for .aiignore file
    const aiIgnoreFile = files.find(f => f.path === ".aiignore");
    let ignorePatterns = [...DEFAULT_IGNORES];
    
    if (aiIgnoreFile) {
      try {
        const ignoreContent = await aiIgnoreFile.file.text();
        const customIgnores = ignoreContent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('#'));
        ignorePatterns.push(...customIgnores);
      } catch (error) {
        console.warn("Failed to read .aiignore file:", error);
      }
    }

    // Filter and read files
    const results: FileContent[] = [];
    const maxFileSize = 1_000_000; // 1MB

    for (const { path, file } of files) {
      // Skip if matches ignore patterns
      const shouldIgnore = ignorePatterns.some(pattern => {
        if (pattern.endsWith('/')) {
          return path.startsWith(pattern);
        }
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(path);
        }
        return path === pattern || path.endsWith(`/${pattern}`);
      });

      if (shouldIgnore) continue;
      if (file.size > maxFileSize) continue;

      // Try to read as text
      try {
        const content = await file.text();
        // Skip binary files by checking for null bytes
        if (content.includes('\0')) continue;
        
        results.push({ path, content });
      } catch (error) {
        // Skip files that can't be read as text
        continue;
      }
    }

    return results;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('File selection was cancelled');
    }
    throw new Error(`Failed to read workspace: ${error.message}`);
  }
}