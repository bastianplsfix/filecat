# filecat

A CLI tool that concatenates files into a single output with smart comment headers and a tree-style report.

## Installation

### Compile to binary

```bash
deno task compile
```

This creates a `filecat` executable in the project root.

### Run directly

```bash
deno task filecat [args...]
```

## Usage

```
filecat [paths...] [options]
```

### Arguments

- `paths` - Root paths to concatenate (default: current directory)

### Options

**Filtering:**

| Option | Description |
|--------|-------------|
| `--ext <exts>` | Filter by extensions (comma-separated, e.g., `ts,tsx,md`) |
| `--include <glob>` | Include only files matching glob (can be repeated) |
| `--exclude <glob>` | Exclude files matching glob (can be repeated) |

**Git modes:**

| Option | Description |
|--------|-------------|
| `--git` | Use git-tracked files only |
| `--staged` | Use staged files only |
| `--changed` | Use changed files only |
| `--since <ref>` | Base ref for `--changed` comparison (e.g., `main`) |

**Output:**

| Option | Description |
|--------|-------------|
| `--out <target>` | Output target: `stdout` (default), `file`, `clipboard` |
| `--output <path>`, `-o` | Output file path (required when `--out file`) |
| `--quiet`, `-q` | Suppress tree report |

## Examples

### Concatenate a directory

```bash
# Concatenate everything under src/
filecat src

# Concatenate only TypeScript files
filecat src --ext ts,tsx

# Concatenate multiple directories
filecat src lib
```

### Use glob patterns

```bash
# Include specific patterns
filecat --include "src/**" --include "docs/**"

# Exclude test files
filecat src --exclude "**/*.test.*" --exclude "**/__tests__/**"
```

### Git-aware selection

```bash
# Only git-tracked files (respects .gitignore)
filecat src --git

# Only staged changes
filecat --staged

# Changes since main branch
filecat --changed --since main
```

### Output options

```bash
# Write to file
filecat src --out file --output output.txt
filecat src --out file -o output.txt

# Copy to clipboard (macOS)
filecat src --out clipboard

# Suppress tree report (useful for piping)
filecat src -q | pbcopy
```

## Output format

Each file is preceded by a header comment using the appropriate syntax for that file type:

```typescript
// FILE: src/index.ts
export function main() {
  // ...
}

// FILE: src/utils.ts
export function helper() {
  // ...
}
```

Comment styles are auto-detected:

| Style | Extensions |
|-------|------------|
| `// FILE: path` | ts, tsx, js, jsx, java, go, rs, c, cpp, swift, ... |
| `# FILE: path` | py, rb, sh, yml, yaml, toml, Makefile, Dockerfile, ... |
| `<!-- FILE: path -->` | html, xml, svg, md, vue, svelte, ... |
| `/* FILE: path */` | css, scss, less, ... |
| `-- FILE: path` | sql, lua, hs, elm, ... |

After concatenation, a tree report is printed to stderr:

```
Bundled 6 files:

└── src/
    ├── cli.ts
    ├── comments.ts
    ├── discovery.ts
    ├── bundler.ts
    ├── tree.ts
    └── types.ts
```

## Excluded directories

The following directories are automatically skipped during filesystem walks:

`node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `.nuxt`, `__pycache__`, `venv`, `.venv`, `target`, `vendor`, `.idea`, `.vscode`, `coverage`, `.turbo`, `.cache`

## License

MIT
