import { parseArgs } from "@std/cli/parse-args";
import { bold, dim, green, setNoColor, yellow } from "./colors.ts";
import type { BundleOptions } from "./types.ts";
import { discoverFiles } from "./discovery.ts";
import { bundleFiles, outputBundle } from "./bundler.ts";
import { generateTreeReport } from "./tree.ts";
import { runInteractive } from "./interactive.ts";

function getHelpText() {
  return `
${bold("filecat")} - Concatenate files with smart comment headers

${bold(yellow("USAGE:"))}
  filecat [path]                 ${dim("Interactive mode (default)")}
  filecat [paths...] ${green("-n")}          ${dim("Non-interactive mode")}

${bold(yellow("ARGUMENTS:"))}
  ${
    cyan("paths")
  }          Root paths to concatenate (default: current directory)

${bold(yellow("OPTIONS:"))}
  ${green("-n")}, ${
    green("--no-interactive")
  }   Skip interactive mode, concatenate all files directly

  ${
    green("--ext")
  } <exts>           Filter by extensions (comma-separated, e.g., ts,tsx,md)
  ${
    green("--include")
  } <glob>       Include only files matching glob (can be repeated)
  ${
    green("--exclude")
  } <glob>       Exclude files matching glob (can be repeated)
  ${
    green("--match")
  } <regex>        Filter by regex pattern (e.g., "^test_.*" or "\\.spec\\.")

  ${green("--include-binary")}       Include binary files (excluded by default)

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

  ${green("--no-color")}             Disable all colors

  ${green("--help")}, ${green("-h")}             Show this help message

${bold(yellow("EXAMPLES:"))}
  ${dim("# Interactive file selection (default)")}
  filecat
  filecat src

  ${dim("# Non-interactive: concatenate all files")}
  filecat src -n
  filecat src --ext ts,tsx -n

  ${dim("# Concatenate by glob patterns")}
  filecat --include "src/**" --include "docs/**" -n

  ${dim("# Exclude test files")}
  filecat src --exclude "**/*.test.*" -n

  ${dim("# Filter by regex (test files)")}
  filecat src --match "^test_.*" -n
  filecat src --match "\\.spec\\." -n

  ${dim("# Concatenate staged changes")}
  filecat --staged

  ${dim("# Output to file")}
  filecat src --out file --output output.txt

  ${dim("# Copy to clipboard (macOS)")}
  filecat src --out clipboard

  ${dim("# Disable colors")}
  filecat src --no-color

${bold(yellow("INTERACTIVE CONTROLS:"))}
  ${dim("[space]")}  Toggle file/folder selection
  ${dim("[a]")}      Toggle all
  ${dim("[↑/↓]")}    Navigate
  ${dim("[←]")}      Collapse folder
  ${dim("[→]")}      Expand folder
  ${dim("[e]")}      Expand all folders
  ${dim("[c]")}      Collapse all folders
  ${dim("[f]")}      Jump to next folder
  ${dim("[F]")}      Jump to previous folder
  ${dim("[o]")}      Cycle output mode (stdout → clipboard → file)
  ${dim("[enter]")}  Confirm selection
  ${dim("[q]")}      Quit
`;
}

// Need to import cyan for help text
import { cyan } from "./colors.ts";

interface ParsedOptions {
  options: BundleOptions;
  interactive: boolean;
  showTree: boolean;
}

/**
 * Parse CLI arguments into BundleOptions
 */
function parseOptions(args: string[]): ParsedOptions | null {
  const parsed = parseArgs(args, {
    string: [
      "ext",
      "include",
      "exclude",
      "out",
      "output",
      "o",
      "since",
      "match",
    ],
    boolean: [
      "help",
      "h",
      "git",
      "staged",
      "changed",
      "no-tree",
      "quiet",
      "q",
      "no-interactive",
      "n",
      "no-color",
      "include-binary",
    ],
    collect: ["include", "exclude"],
    default: {
      out: "stdout",
    },
  });

  // Handle no-color first (before showing help)
  if (parsed["no-color"]) {
    setNoColor(true);
  }

  if (parsed.help || parsed.h) {
    console.log(getHelpText());
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
      yellow("Error:") + " --output path required when --out is 'file'",
    );
    Deno.exit(1);
  }

  // Interactive is default, unless -n/--no-interactive is passed
  // Also disable interactive for git modes (staged, changed) as they have specific file sets
  const noInteractive = parsed["no-interactive"] || parsed.n;
  const gitMode = parsed.git || parsed.staged || parsed.changed;
  const interactive = !noInteractive && !gitMode;

  const showTree = !parsed["no-tree"] && !parsed.quiet && !parsed.q;

  return {
    options: {
      roots: roots.map(String),
      extensions,
      include: parsed.include as string[],
      exclude: parsed.exclude as string[],
      match: parsed.match,
      skipBinary: !parsed["include-binary"],
      gitTracked: parsed.git,
      staged: parsed.staged,
      changed: parsed.changed,
      since: parsed.since,
      output,
      outputPath,
    },
    interactive,
    showTree,
  };
}

/**
 * Main CLI entry point
 */
export async function main(args: string[] = Deno.args): Promise<void> {
  const parsed = parseOptions(args);
  if (!parsed) {
    return; // Help was shown
  }

  const { options, interactive, showTree } = parsed;

  try {
    let files;

    if (interactive) {
      // Interactive mode (default)
      const rootPath = options.roots[0] || ".";
      const result = await runInteractive(rootPath);

      if (!result || result.files.length === 0) {
        console.error(yellow("No files selected."));
        Deno.exit(1);
      }

      files = result.files;
      options.output = result.outputMode;

      // If file output selected, prompt for path
      if (options.output === "file" && !options.outputPath) {
        const path = prompt("Output file path:");
        if (!path) {
          console.error(yellow("No output path provided."));
          Deno.exit(1);
        }
        options.outputPath = path;
      }
    } else {
      // Non-interactive mode
      files = await discoverFiles(options);

      if (files.length === 0) {
        console.error(
          yellow("No files found matching the specified criteria."),
        );
        Deno.exit(1);
      }
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
      yellow("Error:") +
        ` ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}
