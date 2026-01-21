import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { bundleFiles, outputBundle } from "../src/bundler.ts";
import { join } from "@std/path";
import type { BundleFile } from "../src/types.ts";

// Helper to create a temporary directory with test files
async function withTempDir(
  fn: (tempDir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await Deno.makeTempDir({ prefix: "filecat_bundler_test_" });
  try {
    await fn(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

// Helper to create a file in the temp directory
async function createFile(
  dir: string,
  path: string,
  content: string,
): Promise<string> {
  const fullPath = join(dir, path);
  const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  await Deno.mkdir(parentDir, { recursive: true }).catch(() => {});
  await Deno.writeTextFile(fullPath, content);
  return fullPath;
}

Deno.test("bundleFiles - bundles single file", async () => {
  await withTempDir(async (tempDir) => {
    const absolutePath = await createFile(tempDir, "file.ts", "const x = 1;");

    const files: BundleFile[] = [
      { absolutePath, relativePath: "file.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: file.ts");
    assertStringIncludes(result, "const x = 1;");
  });
});

Deno.test("bundleFiles - bundles multiple files", async () => {
  await withTempDir(async (tempDir) => {
    const path1 = await createFile(tempDir, "a.ts", "const a = 1;");
    const path2 = await createFile(tempDir, "b.ts", "const b = 2;");

    const files: BundleFile[] = [
      { absolutePath: path1, relativePath: "a.ts", extension: "ts" },
      { absolutePath: path2, relativePath: "b.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: a.ts");
    assertStringIncludes(result, "const a = 1;");
    assertStringIncludes(result, "// FILE: b.ts");
    assertStringIncludes(result, "const b = 2;");
  });
});

Deno.test("bundleFiles - uses correct comment style for each file type", async () => {
  await withTempDir(async (tempDir) => {
    const tsPath = await createFile(tempDir, "file.ts", "ts content");
    const pyPath = await createFile(tempDir, "file.py", "py content");
    const htmlPath = await createFile(tempDir, "file.html", "html content");

    const files: BundleFile[] = [
      { absolutePath: tsPath, relativePath: "file.ts", extension: "ts" },
      { absolutePath: pyPath, relativePath: "file.py", extension: "py" },
      { absolutePath: htmlPath, relativePath: "file.html", extension: "html" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: file.ts");
    assertStringIncludes(result, "# FILE: file.py");
    assertStringIncludes(result, "<!-- FILE: file.html -->");
  });
});

Deno.test("bundleFiles - separates files with blank lines", async () => {
  await withTempDir(async (tempDir) => {
    const path1 = await createFile(tempDir, "a.ts", "a");
    const path2 = await createFile(tempDir, "b.ts", "b");

    const files: BundleFile[] = [
      { absolutePath: path1, relativePath: "a.ts", extension: "ts" },
      { absolutePath: path2, relativePath: "b.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);
    const lines = result.split("\n");

    // There should be a blank line between files
    const firstFileEndIndex = lines.findIndex((l) => l === "a");
    assertEquals(lines[firstFileEndIndex + 1], "");
  });
});

Deno.test("bundleFiles - handles empty file", async () => {
  await withTempDir(async (tempDir) => {
    const absolutePath = await createFile(tempDir, "empty.ts", "");

    const files: BundleFile[] = [
      { absolutePath, relativePath: "empty.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: empty.ts");
  });
});

Deno.test("bundleFiles - handles file with multiple lines", async () => {
  await withTempDir(async (tempDir) => {
    const content = `line1
line2
line3`;
    const absolutePath = await createFile(tempDir, "multi.ts", content);

    const files: BundleFile[] = [
      { absolutePath, relativePath: "multi.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "line1");
    assertStringIncludes(result, "line2");
    assertStringIncludes(result, "line3");
  });
});

Deno.test("bundleFiles - handles unreadable file gracefully", async () => {
  const files: BundleFile[] = [
    {
      absolutePath: "/nonexistent/file.ts",
      relativePath: "file.ts",
      extension: "ts",
    },
  ];

  const result = await bundleFiles(files);

  assertStringIncludes(result, "// FILE: file.ts");
  assertStringIncludes(result, "[Error reading file:");
});

Deno.test("bundleFiles - preserves file content exactly", async () => {
  await withTempDir(async (tempDir) => {
    const content = "  indented\n\ttabbed\n  \n";
    const absolutePath = await createFile(tempDir, "file.ts", content);

    const files: BundleFile[] = [
      { absolutePath, relativePath: "file.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "  indented");
    assertStringIncludes(result, "\ttabbed");
  });
});

Deno.test("bundleFiles - handles empty file list", async () => {
  const result = await bundleFiles([]);
  assertEquals(result, "");
});

Deno.test("bundleFiles - includes relative path in header", async () => {
  await withTempDir(async (tempDir) => {
    const absolutePath = await createFile(
      tempDir,
      "src/lib/utils.ts",
      "content",
    );

    const files: BundleFile[] = [
      { absolutePath, relativePath: "src/lib/utils.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: src/lib/utils.ts");
  });
});

Deno.test("outputBundle - outputs to file", async () => {
  await withTempDir(async (tempDir) => {
    const outputPath = join(tempDir, "output.txt");
    const content = "test content";

    await outputBundle(content, {
      roots: [],
      output: "file",
      outputPath,
    });

    const written = await Deno.readTextFile(outputPath);
    assertEquals(written, content);
  });
});

Deno.test("outputBundle - throws error when file output without path", async () => {
  await assertRejects(
    async () => {
      await outputBundle("content", {
        roots: [],
        output: "file",
      });
    },
    Error,
    "Output path required",
  );
});

Deno.test("outputBundle - creates nested directories for file output", async () => {
  await withTempDir(async (tempDir) => {
    const outputPath = join(tempDir, "nested/dir/output.txt");
    const content = "test content";

    // Create parent directories first (since outputBundle doesn't create them)
    await Deno.mkdir(join(tempDir, "nested/dir"), { recursive: true });

    await outputBundle(content, {
      roots: [],
      output: "file",
      outputPath,
    });

    const written = await Deno.readTextFile(outputPath);
    assertEquals(written, content);
  });
});

Deno.test("bundleFiles - handles special characters in content", async () => {
  await withTempDir(async (tempDir) => {
    const content = "const emoji = '🎉';\nconst special = '<>&\"';";
    const absolutePath = await createFile(tempDir, "special.ts", content);

    const files: BundleFile[] = [
      { absolutePath, relativePath: "special.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "🎉");
    assertStringIncludes(result, '<>&"');
  });
});

Deno.test("bundleFiles - handles unicode filenames", async () => {
  await withTempDir(async (tempDir) => {
    const absolutePath = await createFile(tempDir, "файл.ts", "content");

    const files: BundleFile[] = [
      { absolutePath, relativePath: "файл.ts", extension: "ts" },
    ];

    const result = await bundleFiles(files);

    assertStringIncludes(result, "// FILE: файл.ts");
  });
});
