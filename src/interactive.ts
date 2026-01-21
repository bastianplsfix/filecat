import { blue, bold, cyan, dim, green, inverse, yellow } from "./colors.ts";
import { walk } from "@std/fs/walk";
import { basename, relative, resolve } from "@std/path";
import type { BundleFile } from "./types.ts";

export type OutputMode = "stdout" | "clipboard" | "file";

export interface InteractiveResult {
  files: BundleFile[];
  outputMode: OutputMode;
}

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
  "target",
  "vendor",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  ".turbo",
  ".cache",
]);

interface TreeItem {
  path: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
  depth: number;
  selected: boolean;
  expanded: boolean;
  children?: TreeItem[];
  parent?: TreeItem;
}

/**
 * Build a tree structure from a directory
 */
async function buildTree(rootPath: string, cwd: string): Promise<TreeItem[]> {
  const items: TreeItem[] = [];
  const dirMap = new Map<string, TreeItem>();

  // First pass: collect all files and directories
  const entries: { path: string; isDirectory: boolean; isFile: boolean }[] = [];

  try {
    for await (
      const entry of walk(rootPath, {
        includeDirs: true,
        includeFiles: true,
        maxDepth: 10,
        skip: [...SKIP_DIRECTORIES].map((dir) => new RegExp(`[\\\\/]${dir}$`)),
      })
    ) {
      entries.push({
        path: entry.path,
        isDirectory: entry.isDirectory,
        isFile: entry.isFile,
      });
    }
  } catch {
    return [];
  }

  // Sort entries by path for consistent ordering
  entries.sort((a, b) => a.path.localeCompare(b.path));

  // Build tree structure
  for (const entry of entries) {
    const relativePath = relative(cwd, entry.path);
    if (relativePath === "" || relativePath === ".") continue;

    const depth = relativePath.split(/[\\/]/).length - 1;
    const name = basename(entry.path);

    const item: TreeItem = {
      path: entry.path,
      relativePath,
      name,
      isDirectory: entry.isDirectory,
      depth,
      selected: false, // Nothing selected by default
      expanded: false, // All folders collapsed by default
      children: entry.isDirectory ? [] : undefined,
    };

    if (entry.isDirectory) {
      dirMap.set(entry.path, item);
    }

    // Find parent
    const parentPath = resolve(entry.path, "..");
    const parent = dirMap.get(parentPath);

    if (parent) {
      item.parent = parent;
      parent.children!.push(item);
    } else if (depth === 0) {
      items.push(item);
    }
  }

  return items;
}

/**
 * Flatten tree for display (respecting expanded state)
 */
function flattenTree(items: TreeItem[]): TreeItem[] {
  const result: TreeItem[] = [];

  function traverse(items: TreeItem[]) {
    for (const item of items) {
      result.push(item);
      if (item.isDirectory && item.expanded && item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return result;
}

/**
 * Toggle selection of an item and its children, then update parent state
 */
function toggleSelection(item: TreeItem, selected?: boolean) {
  const newState = selected ?? !item.selected;
  item.selected = newState;

  // Update all children
  if (item.children) {
    for (const child of item.children) {
      toggleSelection(child, newState);
    }
  }

  // Update parent folder selection state
  updateParentSelection(item.parent);
}

/**
 * Update parent folder selection based on children state
 */
function updateParentSelection(parent: TreeItem | undefined) {
  if (!parent) return;

  // A folder is selected if all its children are selected
  const allChildrenSelected =
    parent.children?.every((child) => child.selected) ?? false;
  parent.selected = allChildrenSelected;

  // Recursively update grandparents
  updateParentSelection(parent.parent);
}

/**
 * Toggle all items
 */
function toggleAll(items: TreeItem[], selected: boolean) {
  for (const item of items) {
    toggleSelection(item, selected);
  }
}

/**
 * Check if all items are selected
 */
function allSelected(items: TreeItem[]): boolean {
  for (const item of items) {
    if (!item.selected) return false;
    if (item.children && !allSelected(item.children)) return false;
  }
  return true;
}

/**
 * Expand or collapse all folders
 */
function setAllExpanded(items: TreeItem[], expanded: boolean) {
  for (const item of items) {
    if (item.isDirectory) {
      item.expanded = expanded;
      if (item.children) {
        setAllExpanded(item.children, expanded);
      }
    }
  }
}

/**
 * Find next folder index in flat list
 */
function findNextFolder(flatItems: TreeItem[], currentIndex: number): number {
  for (let i = currentIndex + 1; i < flatItems.length; i++) {
    if (flatItems[i].isDirectory) {
      return i;
    }
  }
  // Wrap around to beginning
  for (let i = 0; i < currentIndex; i++) {
    if (flatItems[i].isDirectory) {
      return i;
    }
  }
  return currentIndex;
}

/**
 * Find previous folder index in flat list
 */
function findPrevFolder(flatItems: TreeItem[], currentIndex: number): number {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (flatItems[i].isDirectory) {
      return i;
    }
  }
  // Wrap around to end
  for (let i = flatItems.length - 1; i > currentIndex; i--) {
    if (flatItems[i].isDirectory) {
      return i;
    }
  }
  return currentIndex;
}

/**
 * Get selected files from tree
 */
function getSelectedFiles(items: TreeItem[], cwd: string): BundleFile[] {
  const files: BundleFile[] = [];

  function traverse(items: TreeItem[]) {
    for (const item of items) {
      if (item.selected && !item.isDirectory) {
        const ext = item.name.includes(".")
          ? item.name.split(".").pop() || ""
          : "";
        files.push({
          absolutePath: item.path,
          relativePath: item.relativePath,
          extension: ext,
        });
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return files;
}

/**
 * Format output mode for display
 */
function formatOutputMode(mode: OutputMode): string {
  const modes: OutputMode[] = ["stdout", "clipboard", "file"];
  return modes
    .map((m) => (m === mode ? cyan(`[${m}]`) : dim(m)))
    .join("  ");
}

/**
 * Render the tree view
 */
function render(
  flatItems: TreeItem[],
  cursorIndex: number,
  terminalHeight: number,
  scrollOffset: number,
  outputMode: OutputMode,
  showHelp: boolean,
): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(bold(" filecat ") + dim("- Select files to concatenate"));
  lines.push("");

  if (showHelp) {
    lines.push(
      dim(
        " [space] toggle  [a] toggle all  [o] output  [enter] confirm  [q] quit",
      ),
    );
    lines.push(
      dim(
        " [↑/↓] navigate  [←/→] collapse/expand  [e] expand all  [c] collapse all  [f/F] jump folder",
      ),
    );
    lines.push("");
  }

  lines.push(" Output: " + formatOutputMode(outputMode) + dim("    [?] help"));
  lines.push("");

  const headerLines = lines.length;
  const availableHeight = terminalHeight - headerLines - 2;

  // Calculate visible range
  const visibleItems = flatItems.slice(
    scrollOffset,
    scrollOffset + availableHeight,
  );

  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const actualIndex = scrollOffset + i;
    const isCursor = actualIndex === cursorIndex;

    // Build line
    const indent = "  ".repeat(item.depth);
    const checkbox = item.selected ? green("[✓]") : dim("[ ]");

    let icon: string;
    let name: string;

    if (item.isDirectory) {
      icon = item.expanded ? "▼ " : "▶ ";
      name = blue(item.name + "/");
    } else {
      icon = "  ";
      name = item.name;
    }

    let line = ` ${checkbox} ${indent}${icon}${name}`;

    if (isCursor) {
      line = inverse(line);
    }

    lines.push(line);
  }

  // Footer
  lines.push("");
  const selectedCount = getSelectedFiles(flatItems.map((i) => i), ".").length;
  lines.push(dim(` ${selectedCount} files selected`));

  return lines.join("\n");
}

/**
 * Clear screen and move cursor to top
 */
function clearScreen() {
  console.log("\x1b[2J\x1b[H");
}

/**
 * Cycle to next output mode
 */
function nextOutputMode(current: OutputMode): OutputMode {
  const modes: OutputMode[] = ["stdout", "clipboard", "file"];
  const idx = modes.indexOf(current);
  return modes[(idx + 1) % modes.length];
}

/**
 * Run interactive file selector
 */
export async function runInteractive(
  rootPath: string = ".",
): Promise<InteractiveResult | null> {
  const cwd = Deno.cwd();
  const absoluteRoot = resolve(cwd, rootPath);

  // Build initial tree
  const tree = await buildTree(absoluteRoot, cwd);

  if (tree.length === 0) {
    console.error(yellow("No files found in the specified directory."));
    Deno.exit(1);
  }

  let cursorIndex = 0;
  let scrollOffset = 0;
  let outputMode: OutputMode = "clipboard"; // Default to clipboard
  let showHelp = false;

  // Get terminal size
  const getTerminalSize = () => {
    try {
      const { rows } = Deno.consoleSize();
      return rows;
    } catch {
      return 24;
    }
  };

  // Set raw mode for keyboard input
  Deno.stdin.setRaw(true);

  const decoder = new TextDecoder();
  const buffer = new Uint8Array(64);

  try {
    while (true) {
      const flatItems = flattenTree(tree);
      const terminalHeight = getTerminalSize();

      // Adjust scroll to keep cursor visible
      const visibleHeight = terminalHeight - 10;
      if (cursorIndex < scrollOffset) {
        scrollOffset = cursorIndex;
      } else if (cursorIndex >= scrollOffset + visibleHeight) {
        scrollOffset = cursorIndex - visibleHeight + 1;
      }

      // Render
      clearScreen();
      console.log(
        render(
          flatItems,
          cursorIndex,
          terminalHeight,
          scrollOffset,
          outputMode,
          showHelp,
        ),
      );

      // Read input
      const bytesRead = await Deno.stdin.read(buffer);
      if (bytesRead === null) break;

      const input = decoder.decode(buffer.subarray(0, bytesRead));

      // Handle input
      if (input === "q" || input === "\x03") {
        // q or Ctrl+C - quit without selection
        return null;
      }

      if (input === "\r" || input === "\n") {
        // Enter - confirm selection
        return {
          files: getSelectedFiles(tree, cwd),
          outputMode,
        };
      }

      if (input === "o") {
        // O - cycle output mode
        outputMode = nextOutputMode(outputMode);
      }

      if (input === "?") {
        // ? - toggle help
        showHelp = !showHelp;
      }

      if (input === " ") {
        // Space - toggle selection
        const item = flatItems[cursorIndex];
        if (item) {
          toggleSelection(item);
        }
      }

      if (input === "a") {
        // A - toggle all
        const allSel = allSelected(tree);
        toggleAll(tree, !allSel);
      }

      if (input === "\x1b[A") {
        // Up arrow
        cursorIndex = Math.max(0, cursorIndex - 1);
      }

      if (input === "\x1b[B") {
        // Down arrow
        cursorIndex = Math.min(flatItems.length - 1, cursorIndex + 1);
      }

      if (input === "\x1b[D") {
        // Left arrow - collapse
        const item = flatItems[cursorIndex];
        if (item?.isDirectory && item.expanded) {
          item.expanded = false;
        } else if (item?.parent) {
          // Go to parent
          const parentIndex = flatItems.indexOf(item.parent);
          if (parentIndex >= 0) {
            cursorIndex = parentIndex;
          }
        }
      }

      if (input === "\x1b[C") {
        // Right arrow - expand
        const item = flatItems[cursorIndex];
        if (item?.isDirectory && !item.expanded) {
          item.expanded = true;
        }
      }
      if (input === "e") {
        // E - expand all folders
        setAllExpanded(tree, true);
      }

      if (input === "c") {
        // C - collapse all folders
        setAllExpanded(tree, false);
        // Move cursor to a visible item (root level)
        cursorIndex = 0;
      }

      if (input === "f") {
        // F - jump to next folder
        cursorIndex = findNextFolder(flatItems, cursorIndex);
      }

      if (input === "F") {
        // Shift+F - jump to previous folder
        cursorIndex = findPrevFolder(flatItems, cursorIndex);
      }
    }
  } finally {
    Deno.stdin.setRaw(false);
    clearScreen();
  }

  return null;
}
