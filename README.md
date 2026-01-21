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
filecat [path]                  # Interactive mode (default)
filecat [paths...] -n           # Non-interactive mode
```

### Arguments

- `paths` - Root paths to concatenate (default: current directory)

### Options

**Mode:**

| Option | Description |
|--------|-------------|
| `-n`, `--no-interactive` | Skip interactive mode, concatenate all files directly |

**Filtering:**

| Option | Description |
|--------|-------------|
| `--ext <exts>` | Filter by extensions (comma-separated, e.g., `ts,tsx,md`) |
| `--include <glob>` | Include only files matching glob (can be repeated) |
| `--exclude <glob>` | Exclude files matching glob (can be repeated) |

**Git modes** (automatically non-interactive):

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

### Interactive mode (default)

```bash
# Select files interactively from current directory
filecat

# Select files interactively from src/
filecat src
```

**Interactive controls:**

| Key | Action |
|-----|--------|
| `space` | Toggle file/folder selection |
| `a` | Toggle all |
| `↑` / `↓` | Navigate |
| `←` | Collapse folder |
| `→` | Expand folder |
| `enter` | Confirm selection |
| `q` | Quit |

### Non-interactive mode

```bash
# Concatenate everything under src/
filecat src -n

# Concatenate only TypeScript files
filecat src --ext ts,tsx -n

# Concatenate multiple directories
filecat src lib -n
```

### Use glob patterns

```bash
# Include specific patterns
filecat --include "src/**" --include "docs/**" -n

# Exclude test files
filecat src --exclude "**/*.test.*" --exclude "**/__tests__/**" -n
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

# Copy to clipboard (macOS)
filecat src --out clipboard

# Suppress tree report (useful for piping)
filecat src -n -q | pbcopy
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
