import { assertEquals } from "@std/assert";
import { generateHeader, getCommentStyle } from "../src/comments.ts";

Deno.test("getCommentStyle - C-style comments", async (t) => {
  const cStyleExtensions = [
    "ts",
    "tsx",
    "js",
    "jsx",
    "mjs",
    "cjs",
    "java",
    "kt",
    "go",
    "rs",
    "c",
    "cpp",
    "h",
    "cs",
    "swift",
    "scala",
    "dart",
    "zig",
    "proto",
    "jsonc",
  ];

  for (const ext of cStyleExtensions) {
    await t.step(`returns // for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "//");
      assertEquals(style.suffix, undefined);
    });
  }
});

Deno.test("getCommentStyle - hash-style comments", async (t) => {
  const hashStyleExtensions = [
    "py",
    "rb",
    "sh",
    "bash",
    "zsh",
    "yml",
    "yaml",
    "toml",
    "env",
    "makefile",
    "dockerfile",
    "gitignore",
    "tf",
    "nix",
  ];

  for (const ext of hashStyleExtensions) {
    await t.step(`returns # for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "#");
      assertEquals(style.suffix, undefined);
    });
  }
});

Deno.test("getCommentStyle - HTML-style comments", async (t) => {
  const htmlStyleExtensions = [
    "html",
    "htm",
    "xml",
    "svg",
    "vue",
    "svelte",
    "astro",
    "md",
    "mdx",
  ];

  for (const ext of htmlStyleExtensions) {
    await t.step(`returns <!-- --> for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "<!--");
      assertEquals(style.suffix, "-->");
    });
  }
});

Deno.test("getCommentStyle - CSS-style comments", async (t) => {
  const cssStyleExtensions = ["css", "scss", "sass", "less", "styl", "stylus"];

  for (const ext of cssStyleExtensions) {
    await t.step(`returns /* */ for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "/*");
      assertEquals(style.suffix, "*/");
    });
  }
});

Deno.test("getCommentStyle - SQL-style comments", async (t) => {
  const sqlStyleExtensions = [
    "sql",
    "pgsql",
    "mysql",
    "sqlite",
    "lua",
    "hs",
    "elm",
    "ada",
  ];

  for (const ext of sqlStyleExtensions) {
    await t.step(`returns -- for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "--");
      assertEquals(style.suffix, undefined);
    });
  }
});

Deno.test("getCommentStyle - Lisp-style comments", async (t) => {
  const lispStyleExtensions = [
    "lisp",
    "cl",
    "el",
    "scm",
    "clj",
    "cljs",
    "cljc",
    "edn",
    "rkt",
  ];

  for (const ext of lispStyleExtensions) {
    await t.step(`returns ;; for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, ";;");
      assertEquals(style.suffix, undefined);
    });
  }
});

Deno.test("getCommentStyle - percent-style comments", async (t) => {
  const percentStyleExtensions = ["tex", "latex", "bib", "m", "erl"];

  for (const ext of percentStyleExtensions) {
    await t.step(`returns % for .${ext} files`, () => {
      const style = getCommentStyle(ext);
      assertEquals(style.prefix, "%");
      assertEquals(style.suffix, undefined);
    });
  }
});

Deno.test("getCommentStyle - rst comments", () => {
  const style = getCommentStyle("rst");
  assertEquals(style.prefix, "..");
  assertEquals(style.suffix, undefined);
});

Deno.test("getCommentStyle - unknown extension returns default", () => {
  const style = getCommentStyle("unknown");
  assertEquals(style.prefix, "#");
  assertEquals(style.suffix, undefined);
});

Deno.test("getCommentStyle - case insensitive", () => {
  const styleLower = getCommentStyle("ts");
  const styleUpper = getCommentStyle("TS");
  assertEquals(styleLower.prefix, styleUpper.prefix);
});

Deno.test("generateHeader - single-line comment style", () => {
  const header = generateHeader("src/main.ts", "ts");
  assertEquals(header, "// FILE: src/main.ts");
});

Deno.test("generateHeader - hash comment style", () => {
  const header = generateHeader("script.py", "py");
  assertEquals(header, "# FILE: script.py");
});

Deno.test("generateHeader - HTML comment style with suffix", () => {
  const header = generateHeader("index.html", "html");
  assertEquals(header, "<!-- FILE: index.html -->");
});

Deno.test("generateHeader - CSS comment style with suffix", () => {
  const header = generateHeader("styles.css", "css");
  assertEquals(header, "/* FILE: styles.css */");
});

Deno.test("generateHeader - nested path", () => {
  const header = generateHeader("src/components/Button.tsx", "tsx");
  assertEquals(header, "// FILE: src/components/Button.tsx");
});

Deno.test("generateHeader - unknown extension uses default", () => {
  const header = generateHeader("data.xyz", "xyz");
  assertEquals(header, "# FILE: data.xyz");
});
