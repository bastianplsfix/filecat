import { walk } from "@std/fs/walk";
import { globToRegExp } from "@std/path/glob-to-regexp";
import { basename, extname, relative, resolve } from "@std/path";
import type { BundleFile, BundleOptions } from "./types.ts";

/**
 * Directories to always skip during filesystem walks
 */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "venv",
  ".venv",
  "env",
  ".env",
  "target", // Rust/Java
  "vendor",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  ".turbo",
  ".cache",
]);

/**
 * Get the extension from a file path (without the dot)
 */
function getExtension(filePath: string): string {
  const ext = extname(filePath);
  if (ext) {
    return ext.slice(1); // Remove the leading dot
  }
  // Handle dotfiles and special files
  const name = basename(filePath);
  if (name.startsWith(".")) {
    return name.slice(1);
  }
  // Handle files like "Makefile", "Dockerfile"
  const specialFiles: Record<string, string> = {
    makefile: "makefile",
    dockerfile: "dockerfile",
    jenkinsfile: "groovy",
    vagrantfile: "ruby",
  };
  return specialFiles[name.toLowerCase()] ?? "";
}

/**
 * Known binary file extensions
 */
const BINARY_EXTENSIONS = new Set([
  // Images
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "ico",
  "webp",
  "svg",
  "tiff",
  "tif",
  "psd",
  "ai",
  // Audio
  "mp3",
  "wav",
  "flac",
  "aac",
  "ogg",
  "wma",
  "m4a",
  // Video
  "mp4",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "flv",
  "webm",
  "m4v",
  // Archives
  "zip",
  "tar",
  "gz",
  "bz2",
  "xz",
  "7z",
  "rar",
  "jar",
  "war",
  // Executables/Libraries
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "o",
  "a",
  "lib",
  // Documents
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  // Fonts
  "ttf",
  "otf",
  "woff",
  "woff2",
  "eot",
  // Database
  "db",
  "sqlite",
  "sqlite3",
  "mdb",
  // Other binary
  "iso",
  "dmg",
  "img",
  "class",
  "pyc",
  "pyo",
  "wasm",
]);

/**
 * Check if a file is likely binary based on extension
 */
function isBinaryExtension(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * Check if a file is binary by reading first bytes and checking for null bytes
 */
async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const file = await Deno.open(filePath, { read: true });
    const buffer = new Uint8Array(8192);
    const bytesRead = await file.read(buffer);
    file.close();

    if (bytesRead === null || bytesRead === 0) {
      return false;
    }

    // Check for null bytes in the sample (common indicator of binary)
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if a path matches any of the given glob patterns
 */
function matchesGlobs(relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = globToRegExp(pattern, { extended: true, globstar: true });
    if (regex.test(relativePath)) {
      return true;
    }
    // For patterns starting with **/, also check against just the filename
    // This makes **/*.test.* match both "foo.test.ts" and "src/foo.test.ts"
    if (pattern.startsWith("**/")) {
      const filenamePattern = pattern.slice(3); // Remove "**/"
      const filenameRegex = globToRegExp(filenamePattern, {
        extended: true,
        globstar: true,
      });
      const filename = basename(relativePath);
      if (filenameRegex.test(filename)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Discover files using filesystem walk
 */
async function discoverFilesystem(
  roots: string[],
  cwd: string,
): Promise<string[]> {
  const files: string[] = [];

  for (const root of roots) {
    const absoluteRoot = resolve(cwd, root);

    try {
      const stat = await Deno.stat(absoluteRoot);
      if (stat.isFile) {
        // Single file specified
        files.push(absoluteRoot);
        continue;
      }
    } catch {
      // Path doesn't exist, skip
      continue;
    }

    for await (
      const entry of walk(absoluteRoot, {
        includeDirs: false,
        includeFiles: true,
        skip: [...SKIP_DIRECTORIES].map((dir) => new RegExp(`[\\\\/]${dir}$`)),
      })
    ) {
      files.push(entry.path);
    }
  }

  return files;
}

/**
 * Discover files using git ls-files (tracked files)
 */
async function discoverGitTracked(cwd: string): Promise<string[]> {
  const command = new Deno.Command("git", {
    args: ["ls-files"],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`git ls-files failed: ${errorText}`);
  }

  const output = new TextDecoder().decode(stdout);
  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((file) => resolve(cwd, file));
}

/**
 * Discover staged files using git diff --cached
 */
async function discoverGitStaged(cwd: string): Promise<string[]> {
  const command = new Deno.Command("git", {
    args: ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`git diff --cached failed: ${errorText}`);
  }

  const output = new TextDecoder().decode(stdout);
  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((file) => resolve(cwd, file));
}

/**
 * Discover changed files (unstaged) using git diff
 */
async function discoverGitChanged(
  cwd: string,
  since?: string,
): Promise<string[]> {
  const args = since
    ? ["diff", "--name-only", "--diff-filter=ACMR", since]
    : ["diff", "--name-only", "--diff-filter=ACMR"];

  const command = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`git diff failed: ${errorText}`);
  }

  const output = new TextDecoder().decode(stdout);
  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((file) => resolve(cwd, file));
}

/**
 * Filter files based on options (synchronous checks only)
 */
function filterFilesSync(
  files: string[],
  options: BundleOptions,
  cwd: string,
): BundleFile[] {
  const result: BundleFile[] = [];

  // Compile regex pattern if provided
  let matchRegex: RegExp | null = null;
  if (options.match) {
    try {
      matchRegex = new RegExp(options.match);
    } catch {
      throw new Error(`Invalid regex pattern: ${options.match}`);
    }
  }

  for (const absolutePath of files) {
    const relativePath = relative(cwd, absolutePath);
    const extension = getExtension(absolutePath);
    const filename = basename(absolutePath);

    // Skip if in excluded directories
    const pathParts = relativePath.split(/[\\/]/);
    if (pathParts.some((part) => SKIP_DIRECTORIES.has(part))) {
      continue;
    }

    // Extension filter
    if (options.extensions && options.extensions.length > 0) {
      if (!options.extensions.includes(extension.toLowerCase())) {
        continue;
      }
    }

    // Include patterns
    if (options.include && options.include.length > 0) {
      if (!matchesGlobs(relativePath, options.include)) {
        continue;
      }
    }

    // Exclude patterns
    if (options.exclude && options.exclude.length > 0) {
      if (matchesGlobs(relativePath, options.exclude)) {
        continue;
      }
    }

    // Regex match filter (matches against filename or full relative path)
    if (matchRegex) {
      if (!matchRegex.test(filename) && !matchRegex.test(relativePath)) {
        continue;
      }
    }

    // Quick binary check by extension (skip known binary extensions)
    if (options.skipBinary !== false && isBinaryExtension(extension)) {
      continue;
    }

    result.push({
      absolutePath,
      relativePath,
      extension,
    });
  }

  return result;
}

/**
 * Filter files based on options (async for binary content check)
 */
async function filterFiles(
  files: string[],
  options: BundleOptions,
  cwd: string,
): Promise<BundleFile[]> {
  // First pass: synchronous filters
  const candidates = filterFilesSync(files, options, cwd);

  // Second pass: async binary content check if enabled
  if (options.skipBinary !== false) {
    const result: BundleFile[] = [];
    for (const file of candidates) {
      // Skip content check for known text extensions
      const knownTextExtensions = new Set([
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "md",
        "txt",
        "html",
        "css",
        "scss",
        "yaml",
        "yml",
        "toml",
        "xml",
        "sh",
        "bash",
        "zsh",
        "py",
        "rb",
        "go",
        "rs",
        "java",
        "c",
        "cpp",
        "h",
        "hpp",
        "cs",
        "swift",
        "kt",
        "scala",
      ]);

      if (knownTextExtensions.has(file.extension.toLowerCase())) {
        result.push(file);
        continue;
      }

      // Check file content for binary
      if (!(await isBinaryFile(file.absolutePath))) {
        result.push(file);
      }
    }
    return result;
  }

  return candidates;
}

/**
 * Main discovery function - finds and filters files based on options
 */
export async function discoverFiles(
  options: BundleOptions,
  cwd: string = Deno.cwd(),
): Promise<BundleFile[]> {
  let files: string[];

  // Determine discovery mode
  if (options.staged) {
    files = await discoverGitStaged(cwd);
  } else if (options.changed) {
    files = await discoverGitChanged(cwd, options.since);
  } else if (options.gitTracked) {
    files = await discoverGitTracked(cwd);
  } else {
    // Default: filesystem walk
    const roots = options.roots.length > 0 ? options.roots : ["."];
    files = await discoverFilesystem(roots, cwd);
  }

  // Apply filters
  const filteredFiles = await filterFiles(files, options, cwd);

  // Sort for deterministic output
  filteredFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return filteredFiles;
}

// Export for use in interactive mode
export { isBinaryExtension, isBinaryFile };
