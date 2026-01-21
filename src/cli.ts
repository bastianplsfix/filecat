import { parseArgs } from "@std/cli/parse-args";
import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";
import type { BundleOptions } from "./types.ts";
import { discoverFiles } from "./discovery.ts";
import { bundleFiles, outputBundle } from "./bundler.ts";
import { generateTreeReport } from "./tree.ts";

const HELP_TEXT = `
${bold("filecat")} - Concatenate files with smart comment headers

${bold(yellow("USAGE:"))}
  filecat [paths...] [options]

${bold(yellow("ARGUMENTS:"))}
  ${cyan("paths")}          Root paths to bundle (default: current directory)

${bold(yellow("OPTIONS:"))}
  ${
  green("--ext")
} <exts>           Filter by extensions (comma-separated, e.g., ts,tsx,md)
  ${
  green("--include")
} <glob>       Include only files matching glob (can be repeated)
  ${
  green("--exclude")
} <glob>       Exclude files matching glob (can be repeated)

  ${green("--git")}                  Use git-tracked files only
  ${green("--staged")}               Use staged files only (git diff --cached)
  ${green("--changed")}              Use changed files only (git diff)
  ${
  green("--since")
} <ref>          Base ref for --changed comparison (e.g., main)

  ${
  green("--out")
} <target>         Output target: stdout (default), file, clipboard
  ${green("--output")} <path>        Output file path (required when --out file)
  ${green("-o")} <path>              Alias for --output

  ${green("--no-tree")}              Don't print the tree report
  ${green("--quiet")}, ${
  green("-q")
}            Suppress tree report (alias for --no-tree)

  ${green("--help")}, ${green("-h")}             Show this help message

${bold(yellow("EXAMPLES:"))}
  ${dim("# Concatenate everything under src/")}
  filecat src

  ${dim("# Concatenate only TypeScript files")}
  filecat src --ext ts,tsx

  ${dim("# Concatenate by glob patterns")}
  filecat --include "src/**" --include "docs/**"

  ${dim("# Exclude test files")}
  filecat src --exclude "**/*.test.*" --exclude "**/__tests__/**"

  ${dim("# Concatenate staged changes")}
  filecat --staged

  ${dim("# Concatenate changes since main branch")}
  filecat --changed --since main

  ${dim("# Output to file")}
  filecat src --out file --output output.txt

  ${dim("# Copy to clipboard (macOS)")}
  filecat src --out clipboard
`;

/**
 * Parse CLI arguments into BundleOptions
 */
function parseOptions(args: string[]): BundleOptions | null {
  const parsed = parseArgs(args, {
    string: ["ext", "include", "exclude", "out", "output", "o", "since"],
    boolean: ["help", "h", "git", "staged", "changed", "no-tree", "quiet", "q"],
    collect: ["include", "exclude"],
    default: {
      out: "stdout",
    },
  });

  if (parsed.help || parsed.h) {
    console.log(HELP_TEXT);
    return null;
  }

  // Remaining arguments are root paths
  const roots = parsed._ as string[];

  // Parse extensions
  let extensions: string[] | undefined;
  if (parsed.ext) {
    extensions = parsed.ext.split(",").map((e: string) =>
      e.trim().replace(/^\./, "")
    );
  }

  // Determine output target
  const output = parsed.out as "stdout" | "file" | "clipboard";
  const outputPath = parsed.output || parsed.o;

  if (output === "file" && !outputPath) {
    console.error(
      red("Error:") + " --output path required when --out is 'file'",
    );
    Deno.exit(1);
  }

  return {
    roots: roots.map(String),
    extensions,
    include: parsed.include as string[],
    exclude: parsed.exclude as string[],
    gitTracked: parsed.git,
    staged: parsed.staged,
    changed: parsed.changed,
    since: parsed.since,
    output,
    outputPath,
  };
}

/**
 * Main CLI entry point
 */
export async function main(args: string[] = Deno.args): Promise<void> {
  const options = parseOptions(args);
  if (!options) {
    return; // Help was shown
  }

  const parsed = parseArgs(args, {
    boolean: ["no-tree", "quiet", "q"],
  });
  const showTree = !parsed["no-tree"] && !parsed.quiet && !parsed.q;

  try {
    // Discover files
    const files = await discoverFiles(options);

    if (files.length === 0) {
      console.error(yellow("No files found matching the specified criteria."));
      Deno.exit(1);
    }

    // Bundle files
    const content = await bundleFiles(files);

    // Output content
    await outputBundle(content, options);

    // Print tree report (to stderr so it doesn't mix with stdout output)
    if (showTree) {
      const report = generateTreeReport(files);
      console.error("\n" + report);
    }
  } catch (error) {
    console.error(
      red("Error:") +
        ` ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
