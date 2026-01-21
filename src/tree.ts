import { blue, bold, dim, green, yellow } from "./colors.ts";
import type { BundleFile } from "./types.ts";

/**
 * Tree node representing a file or directory
 */
interface TreeNode {
  name: string;
  isDirectory: boolean;
  children: Map<string, TreeNode>;
}

/**
 * Build a tree structure from a list of files
 */
function buildTree(files: BundleFile[]): TreeNode {
  const root: TreeNode = {
    name: "",
    isDirectory: true,
    children: new Map(),
  };

  for (const file of files) {
    const parts = file.relativePath.split(/[\\/]/);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          isDirectory: !isLast,
          children: new Map(),
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

/**
 * Render a tree node to string lines
 */
function renderNode(
  node: TreeNode,
  prefix: string,
  lines: string[],
): void {
  // Sort children: directories first, then files, alphabetically within each group
  const sortedChildren = [...node.children.values()].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  for (let i = 0; i < sortedChildren.length; i++) {
    const child = sortedChildren[i];
    const childIsLast = i === sortedChildren.length - 1;
    const connector = childIsLast ? "└── " : "├── ";

    let displayName: string;
    if (child.isDirectory) {
      displayName = blue(child.name + "/");
    } else {
      displayName = child.name;
    }

    lines.push(dim(prefix + connector) + displayName);

    if (child.isDirectory && child.children.size > 0) {
      const newPrefix = prefix + (childIsLast ? "    " : "│   ");
      renderNode(child, newPrefix, lines);
    }
  }
}

/**
 * Generate a tree-style report of the bundled files
 */
export function generateTreeReport(files: BundleFile[]): string {
  if (files.length === 0) {
    return yellow("No files bundled.");
  }

  const tree = buildTree(files);
  const lines: string[] = [];

  // Header
  const count = bold(green(String(files.length)));
  const fileWord = files.length === 1 ? "file" : "files";
  lines.push(`Bundled ${count} ${fileWord}:`);
  lines.push("");

  // Render tree
  renderNode(tree, "", lines);

  return lines.join("\n");
}
