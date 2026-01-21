import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateTreeReport } from "../src/tree.ts";
import { setNoColor } from "../src/colors.ts";
import type { BundleFile } from "../src/types.ts";

// Disable colors for predictable test output
Deno.test({
  name: "tree tests setup",
  fn() {
    setNoColor(true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test("generateTreeReport - empty file list", () => {
  const report = generateTreeReport([]);
  assertEquals(report, "No files bundled.");
});

Deno.test("generateTreeReport - single file", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/file.ts", relativePath: "file.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "Bundled 1 file:");
  assertStringIncludes(report, "file.ts");
});

Deno.test("generateTreeReport - multiple files", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/a.ts", relativePath: "a.ts", extension: "ts" },
    { absolutePath: "/root/b.ts", relativePath: "b.ts", extension: "ts" },
    { absolutePath: "/root/c.ts", relativePath: "c.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "Bundled 3 files:");
  assertStringIncludes(report, "a.ts");
  assertStringIncludes(report, "b.ts");
  assertStringIncludes(report, "c.ts");
});

Deno.test("generateTreeReport - nested directory structure", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    {
      absolutePath: "/root/src/main.ts",
      relativePath: "src/main.ts",
      extension: "ts",
    },
    {
      absolutePath: "/root/src/lib/utils.ts",
      relativePath: "src/lib/utils.ts",
      extension: "ts",
    },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "Bundled 2 files:");
  assertStringIncludes(report, "src/");
  assertStringIncludes(report, "main.ts");
  assertStringIncludes(report, "lib/");
  assertStringIncludes(report, "utils.ts");
});

Deno.test("generateTreeReport - uses correct tree characters", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/a.ts", relativePath: "a.ts", extension: "ts" },
    { absolutePath: "/root/b.ts", relativePath: "b.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);

  // First item uses ├──
  assertStringIncludes(report, "├──");
  // Last item uses └──
  assertStringIncludes(report, "└──");
});

Deno.test("generateTreeReport - directories listed before files", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/z.ts", relativePath: "z.ts", extension: "ts" },
    {
      absolutePath: "/root/a/file.ts",
      relativePath: "a/file.ts",
      extension: "ts",
    },
    { absolutePath: "/root/a.ts", relativePath: "a.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);
  const lines = report.split("\n");

  // Find the line with "a/" directory and "a.ts" file
  const dirLineIndex = lines.findIndex((l) => l.includes("a/"));
  const fileALineIndex = lines.findIndex((l) =>
    l.includes("a.ts") && !l.includes("a/")
  );

  // Directory should come before file with same prefix
  assertEquals(
    dirLineIndex < fileALineIndex,
    true,
    "Directory should appear before file",
  );
});

Deno.test("generateTreeReport - alphabetical sorting within same type", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/z.ts", relativePath: "z.ts", extension: "ts" },
    { absolutePath: "/root/a.ts", relativePath: "a.ts", extension: "ts" },
    { absolutePath: "/root/m.ts", relativePath: "m.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);
  const lines = report.split("\n");

  const aLineIndex = lines.findIndex((l) => l.includes("a.ts"));
  const mLineIndex = lines.findIndex((l) => l.includes("m.ts"));
  const zLineIndex = lines.findIndex((l) => l.includes("z.ts"));

  assertEquals(aLineIndex < mLineIndex, true);
  assertEquals(mLineIndex < zLineIndex, true);
});

Deno.test("generateTreeReport - deeply nested structure", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    {
      absolutePath: "/root/a/b/c/d/file.ts",
      relativePath: "a/b/c/d/file.ts",
      extension: "ts",
    },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "a/");
  assertStringIncludes(report, "b/");
  assertStringIncludes(report, "c/");
  assertStringIncludes(report, "d/");
  assertStringIncludes(report, "file.ts");
});

Deno.test("generateTreeReport - multiple files in same directory", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    {
      absolutePath: "/root/src/a.ts",
      relativePath: "src/a.ts",
      extension: "ts",
    },
    {
      absolutePath: "/root/src/b.ts",
      relativePath: "src/b.ts",
      extension: "ts",
    },
    {
      absolutePath: "/root/src/c.ts",
      relativePath: "src/c.ts",
      extension: "ts",
    },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "Bundled 3 files:");
  assertStringIncludes(report, "src/");
  assertStringIncludes(report, "a.ts");
  assertStringIncludes(report, "b.ts");
  assertStringIncludes(report, "c.ts");
});

Deno.test("generateTreeReport - uses singular 'file' for one file", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/file.ts", relativePath: "file.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);
  assertStringIncludes(report, "1 file:");
});

Deno.test("generateTreeReport - uses plural 'files' for multiple", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/a.ts", relativePath: "a.ts", extension: "ts" },
    { absolutePath: "/root/b.ts", relativePath: "b.ts", extension: "ts" },
  ];

  const report = generateTreeReport(files);
  assertStringIncludes(report, "2 files:");
});

Deno.test("generateTreeReport - handles mixed directory depths", () => {
  setNoColor(true);
  const files: BundleFile[] = [
    { absolutePath: "/root/root.ts", relativePath: "root.ts", extension: "ts" },
    {
      absolutePath: "/root/src/main.ts",
      relativePath: "src/main.ts",
      extension: "ts",
    },
    {
      absolutePath: "/root/src/lib/deep/file.ts",
      relativePath: "src/lib/deep/file.ts",
      extension: "ts",
    },
  ];

  const report = generateTreeReport(files);

  assertStringIncludes(report, "Bundled 3 files:");
  assertStringIncludes(report, "root.ts");
  assertStringIncludes(report, "src/");
  assertStringIncludes(report, "main.ts");
  assertStringIncludes(report, "lib/");
  assertStringIncludes(report, "deep/");
  assertStringIncludes(report, "file.ts");
});
