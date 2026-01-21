/**
 * Configuration options for the bundle CLI
 */
export interface BundleOptions {
  /** Root paths to start file discovery from */
  roots: string[];

  /** File extensions to include (without dots, e.g., ["ts", "tsx"]) */
  extensions?: string[];

  /** Glob patterns to include */
  include?: string[];

  /** Glob patterns to exclude */
  exclude?: string[];

  /** Use git-tracked files only */
  gitTracked?: boolean;

  /** Use staged files only */
  staged?: boolean;

  /** Use changed files (unstaged) */
  changed?: boolean;

  /** Base ref for --since comparison */
  since?: string;

  /** Output target: stdout, file, or clipboard */
  output: "stdout" | "file" | "clipboard";

  /** Output file path (when output is "file") */
  outputPath?: string;
}

/**
 * Represents a file to be bundled
 */
export interface BundleFile {
  /** Absolute path to the file */
  absolutePath: string;

  /** Relative path (for display) */
  relativePath: string;

  /** File extension (without dot) */
  extension: string;
}

/**
 * Comment style configuration
 */
export interface CommentStyle {
  prefix: string;
  suffix?: string;
}
