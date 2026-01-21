import type { CommentStyle } from "./types.ts";

/**
 * Mapping of file extensions to their comment styles
 */
const COMMENT_STYLES: Record<string, CommentStyle> = {
  // C-style single line: //
  ts: { prefix: "//" },
  tsx: { prefix: "//" },
  js: { prefix: "//" },
  jsx: { prefix: "//" },
  mjs: { prefix: "//" },
  cjs: { prefix: "//" },
  java: { prefix: "//" },
  kt: { prefix: "//" },
  kts: { prefix: "//" },
  go: { prefix: "//" },
  rs: { prefix: "//" },
  c: { prefix: "//" },
  cpp: { prefix: "//" },
  cc: { prefix: "//" },
  cxx: { prefix: "//" },
  h: { prefix: "//" },
  hpp: { prefix: "//" },
  cs: { prefix: "//" },
  swift: { prefix: "//" },
  scala: { prefix: "//" },
  dart: { prefix: "//" },
  v: { prefix: "//" },
  zig: { prefix: "//" },
  proto: { prefix: "//" },
  jsonc: { prefix: "//" },

  // Hash-style: #
  py: { prefix: "#" },
  pyw: { prefix: "#" },
  rb: { prefix: "#" },
  sh: { prefix: "#" },
  bash: { prefix: "#" },
  zsh: { prefix: "#" },
  fish: { prefix: "#" },
  yml: { prefix: "#" },
  yaml: { prefix: "#" },
  toml: { prefix: "#" },
  env: { prefix: "#" },
  ps1: { prefix: "#" },
  r: { prefix: "#" },
  R: { prefix: "#" },
  pl: { prefix: "#" },
  pm: { prefix: "#" },
  tcl: { prefix: "#" },
  makefile: { prefix: "#" },
  mk: { prefix: "#" },
  dockerfile: { prefix: "#" },
  gitignore: { prefix: "#" },
  dockerignore: { prefix: "#" },
  editorconfig: { prefix: "#" },
  conf: { prefix: "#" },
  cfg: { prefix: "#" },
  ini: { prefix: "#" },
  tf: { prefix: "#" },
  tfvars: { prefix: "#" },
  hcl: { prefix: "#" },
  nix: { prefix: "#" },
  awk: { prefix: "#" },
  sed: { prefix: "#" },

  // HTML-style: <!-- -->
  html: { prefix: "<!--", suffix: "-->" },
  htm: { prefix: "<!--", suffix: "-->" },
  xml: { prefix: "<!--", suffix: "-->" },
  svg: { prefix: "<!--", suffix: "-->" },
  vue: { prefix: "<!--", suffix: "-->" },
  svelte: { prefix: "<!--", suffix: "-->" },
  astro: { prefix: "<!--", suffix: "-->" },

  // CSS-style: /* */
  css: { prefix: "/*", suffix: "*/" },
  scss: { prefix: "/*", suffix: "*/" },
  sass: { prefix: "/*", suffix: "*/" },
  less: { prefix: "/*", suffix: "*/" },
  styl: { prefix: "/*", suffix: "*/" },
  stylus: { prefix: "/*", suffix: "*/" },

  // SQL-style: --
  sql: { prefix: "--" },
  pgsql: { prefix: "--" },
  mysql: { prefix: "--" },
  sqlite: { prefix: "--" },
  lua: { prefix: "--" },
  hs: { prefix: "--" },
  lhs: { prefix: "--" },
  elm: { prefix: "--" },
  ada: { prefix: "--" },

  // Lisp-style: ;;
  lisp: { prefix: ";;" },
  cl: { prefix: ";;" },
  el: { prefix: ";;" },
  scm: { prefix: ";;" },
  clj: { prefix: ";;" },
  cljs: { prefix: ";;" },
  cljc: { prefix: ";;" },
  edn: { prefix: ";;" },
  rkt: { prefix: ";;" },

  // Percent: %
  tex: { prefix: "%" },
  latex: { prefix: "%" },
  bib: { prefix: "%" },
  m: { prefix: "%" }, // MATLAB/Octave
  erl: { prefix: "%" },
  hrl: { prefix: "%" },

  // Markdown/text (no comment syntax, use HTML)
  md: { prefix: "<!--", suffix: "-->" },
  mdx: { prefix: "<!--", suffix: "-->" },
  rst: { prefix: ".." },
};

/**
 * Default comment style for unknown extensions
 */
const DEFAULT_COMMENT_STYLE: CommentStyle = { prefix: "#" };

/**
 * Get the comment style for a given file extension
 */
export function getCommentStyle(extension: string): CommentStyle {
  // Handle special filenames (without extension)
  const lowerExt = extension.toLowerCase();
  return COMMENT_STYLES[lowerExt] ?? DEFAULT_COMMENT_STYLE;
}

/**
 * Generate a header comment for a file
 */
export function generateHeader(relativePath: string, extension: string): string {
  const style = getCommentStyle(extension);
  const content = `FILE: ${relativePath}`;

  if (style.suffix) {
    return `${style.prefix} ${content} ${style.suffix}`;
  }
  return `${style.prefix} ${content}`;
}
