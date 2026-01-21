import { assertEquals, assertRejects } from "@std/assert";
import {
  discoverFiles,
  isBinaryExtension,
  isBinaryFile,
} from "../src/discovery.ts";
import { join } from "@std/path";

// Helper to create a temporary directory with test files
async function withTempDir(
  fn: (tempDir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await Deno.makeTempDir({ prefix: "filecat_test_" });
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
  content = "",
): Promise<void> {
  const fullPath = join(dir, path);
  const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  await Deno.mkdir(parentDir, { recursive: true }).catch(() => {});
  await Deno.writeTextFile(fullPath, content);
}

Deno.test("discoverFiles - discovers files in directory", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file1.ts", "content1");
    await createFile(tempDir, "file2.ts", "content2");
    await createFile(tempDir, "file3.js", "content3");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 3);
    const relativePaths = files.map((f) => f.relativePath);
    assertEquals(relativePaths.includes("file1.ts"), true);
    assertEquals(relativePaths.includes("file2.ts"), true);
    assertEquals(relativePaths.includes("file3.js"), true);
  });
});

Deno.test("discoverFiles - discovers files in nested directories", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "root.ts", "");
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "src/lib/utils.ts", "");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 3);
    const relativePaths = files.map((f) => f.relativePath);
    assertEquals(relativePaths.includes("root.ts"), true);
    assertEquals(relativePaths.includes("src/main.ts"), true);
    assertEquals(relativePaths.includes("src/lib/utils.ts"), true);
  });
});

Deno.test("discoverFiles - skips excluded directories", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "node_modules/pkg/index.js", "");
    await createFile(tempDir, ".git/config", "");
    await createFile(tempDir, "dist/bundle.js", "");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "src/main.ts");
  });
});

Deno.test("discoverFiles - filters by extension", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file.ts", "");
    await createFile(tempDir, "file.tsx", "");
    await createFile(tempDir, "file.js", "");
    await createFile(tempDir, "file.py", "");

    const files = await discoverFiles(
      { roots: ["."], extensions: ["ts", "tsx"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    const extensions = files.map((f) => f.extension);
    assertEquals(extensions.includes("ts"), true);
    assertEquals(extensions.includes("tsx"), true);
  });
});

Deno.test("discoverFiles - filters with include patterns", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "src/lib/utils.ts", "");
    await createFile(tempDir, "test/main.test.ts", "");
    await createFile(tempDir, "docs/readme.md", "");

    const files = await discoverFiles(
      { roots: ["."], include: ["src/**"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.relativePath.startsWith("src/"), true);
    }
  });
});

Deno.test("discoverFiles - filters with exclude patterns", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "src/main.test.ts", "");
    await createFile(tempDir, "src/utils.ts", "");
    await createFile(tempDir, "src/utils.test.ts", "");

    const files = await discoverFiles(
      { roots: ["."], exclude: ["**/*.test.ts"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.relativePath.includes(".test.ts"), false);
    }
  });
});

Deno.test("discoverFiles - combines include and exclude patterns", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "src/main.test.ts", "");
    await createFile(tempDir, "lib/utils.ts", "");

    const files = await discoverFiles(
      {
        roots: ["."],
        include: ["src/**"],
        exclude: ["**/*.test.ts"],
        output: "stdout",
      },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "src/main.ts");
  });
});

Deno.test("discoverFiles - discovers single file", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "single.ts", "content");
    await createFile(tempDir, "other.ts", "other");

    const files = await discoverFiles(
      { roots: ["single.ts"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "single.ts");
  });
});

Deno.test("discoverFiles - handles multiple roots", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/main.ts", "");
    await createFile(tempDir, "lib/utils.ts", "");
    await createFile(tempDir, "other/file.ts", "");

    const files = await discoverFiles(
      { roots: ["src", "lib"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    const relativePaths = files.map((f) => f.relativePath);
    assertEquals(relativePaths.includes("src/main.ts"), true);
    assertEquals(relativePaths.includes("lib/utils.ts"), true);
  });
});

Deno.test("discoverFiles - returns files sorted by relative path", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "z.ts", "");
    await createFile(tempDir, "a.ts", "");
    await createFile(tempDir, "m/file.ts", "");
    await createFile(tempDir, "b.ts", "");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    const paths = files.map((f) => f.relativePath);
    const sortedPaths = [...paths].sort();
    assertEquals(paths, sortedPaths);
  });
});

Deno.test("discoverFiles - extracts correct extension", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file.ts", "");
    await createFile(tempDir, "file.test.ts", "");
    await createFile(tempDir, ".gitignore", "");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    const fileMap = new Map(files.map((f) => [f.relativePath, f.extension]));
    assertEquals(fileMap.get("file.ts"), "ts");
    assertEquals(fileMap.get("file.test.ts"), "ts");
    assertEquals(fileMap.get(".gitignore"), "gitignore");
  });
});

Deno.test("discoverFiles - handles empty directory", async () => {
  await withTempDir(async (tempDir) => {
    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );
    assertEquals(files.length, 0);
  });
});

Deno.test("discoverFiles - handles non-existent path gracefully", async () => {
  await withTempDir(async (tempDir) => {
    const files = await discoverFiles(
      { roots: ["nonexistent"], output: "stdout" },
      tempDir,
    );
    assertEquals(files.length, 0);
  });
});

Deno.test("discoverFiles - extension filter matches lowercase", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file.ts", "");
    await createFile(tempDir, "another.ts", "");
    await createFile(tempDir, "file.js", "");

    const files = await discoverFiles(
      { roots: ["."], extensions: ["ts"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.extension, "ts");
    }
  });
});

Deno.test("discoverFiles - default root is current directory", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file.ts", "");

    const files = await discoverFiles({ roots: [], output: "stdout" }, tempDir);

    assertEquals(files.length, 1);
  });
});

// ============================================
// Regex matching tests
// ============================================

Deno.test("discoverFiles - regex match filters by filename pattern", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "test_utils.ts", "");
    await createFile(tempDir, "test_main.ts", "");
    await createFile(tempDir, "utils.ts", "");
    await createFile(tempDir, "main.ts", "");

    const files = await discoverFiles(
      { roots: ["."], match: "^test_", output: "stdout", skipBinary: false },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.relativePath.startsWith("test_"), true);
    }
  });
});

Deno.test("discoverFiles - regex match filters by extension pattern", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "app.spec.ts", "");
    await createFile(tempDir, "utils.spec.ts", "");
    await createFile(tempDir, "app.ts", "");
    await createFile(tempDir, "utils.ts", "");

    const files = await discoverFiles(
      {
        roots: ["."],
        match: "\\.spec\\.",
        output: "stdout",
        skipBinary: false,
      },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.relativePath.includes(".spec."), true);
    }
  });
});

Deno.test("discoverFiles - regex match works on full relative path", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/components/Button.tsx", "");
    await createFile(tempDir, "src/utils/helpers.ts", "");
    await createFile(tempDir, "test/Button.test.ts", "");

    const files = await discoverFiles(
      {
        roots: ["."],
        match: "src/components",
        output: "stdout",
        skipBinary: false,
      },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "src/components/Button.tsx");
  });
});

Deno.test("discoverFiles - regex match is case sensitive", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "test_lower.ts", "");
    await createFile(tempDir, "Test_upper.ts", "");
    await createFile(tempDir, "other.ts", "");

    const files = await discoverFiles(
      { roots: ["."], match: "^test_", output: "stdout", skipBinary: false },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "test_lower.ts");
  });
});

Deno.test("discoverFiles - regex match with complex pattern", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "v1.0.0.ts", "");
    await createFile(tempDir, "v2.1.3.ts", "");
    await createFile(tempDir, "main.ts", "");
    await createFile(tempDir, "version.ts", "");

    const files = await discoverFiles(
      {
        roots: ["."],
        match: "^v\\d+\\.\\d+\\.\\d+",
        output: "stdout",
        skipBinary: false,
      },
      tempDir,
    );

    assertEquals(files.length, 2);
    const names = files.map((f) => f.relativePath);
    assertEquals(names.includes("v1.0.0.ts"), true);
    assertEquals(names.includes("v2.1.3.ts"), true);
  });
});

Deno.test("discoverFiles - invalid regex throws error", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "file.ts", "");

    await assertRejects(
      async () => {
        await discoverFiles(
          { roots: ["."], match: "[invalid", output: "stdout" },
          tempDir,
        );
      },
      Error,
      "Invalid regex pattern",
    );
  });
});

Deno.test("discoverFiles - regex match combined with extension filter", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "test_utils.ts", "");
    await createFile(tempDir, "test_utils.js", "");
    await createFile(tempDir, "test_main.ts", "");
    await createFile(tempDir, "utils.ts", "");

    const files = await discoverFiles(
      {
        roots: ["."],
        match: "^test_",
        extensions: ["ts"],
        output: "stdout",
        skipBinary: false,
      },
      tempDir,
    );

    assertEquals(files.length, 2);
    for (const file of files) {
      assertEquals(file.relativePath.startsWith("test_"), true);
      assertEquals(file.extension, "ts");
    }
  });
});

// ============================================
// Binary detection tests
// ============================================

Deno.test("isBinaryExtension - detects image extensions", () => {
  assertEquals(isBinaryExtension("png"), true);
  assertEquals(isBinaryExtension("jpg"), true);
  assertEquals(isBinaryExtension("jpeg"), true);
  assertEquals(isBinaryExtension("gif"), true);
  assertEquals(isBinaryExtension("webp"), true);
  assertEquals(isBinaryExtension("ico"), true);
});

Deno.test("isBinaryExtension - detects audio extensions", () => {
  assertEquals(isBinaryExtension("mp3"), true);
  assertEquals(isBinaryExtension("wav"), true);
  assertEquals(isBinaryExtension("flac"), true);
  assertEquals(isBinaryExtension("ogg"), true);
});

Deno.test("isBinaryExtension - detects video extensions", () => {
  assertEquals(isBinaryExtension("mp4"), true);
  assertEquals(isBinaryExtension("avi"), true);
  assertEquals(isBinaryExtension("mkv"), true);
  assertEquals(isBinaryExtension("mov"), true);
});

Deno.test("isBinaryExtension - detects archive extensions", () => {
  assertEquals(isBinaryExtension("zip"), true);
  assertEquals(isBinaryExtension("tar"), true);
  assertEquals(isBinaryExtension("gz"), true);
  assertEquals(isBinaryExtension("7z"), true);
  assertEquals(isBinaryExtension("rar"), true);
});

Deno.test("isBinaryExtension - detects executable extensions", () => {
  assertEquals(isBinaryExtension("exe"), true);
  assertEquals(isBinaryExtension("dll"), true);
  assertEquals(isBinaryExtension("so"), true);
  assertEquals(isBinaryExtension("dylib"), true);
});

Deno.test("isBinaryExtension - detects document extensions", () => {
  assertEquals(isBinaryExtension("pdf"), true);
  assertEquals(isBinaryExtension("doc"), true);
  assertEquals(isBinaryExtension("docx"), true);
  assertEquals(isBinaryExtension("xls"), true);
  assertEquals(isBinaryExtension("ppt"), true);
});

Deno.test("isBinaryExtension - detects font extensions", () => {
  assertEquals(isBinaryExtension("ttf"), true);
  assertEquals(isBinaryExtension("otf"), true);
  assertEquals(isBinaryExtension("woff"), true);
  assertEquals(isBinaryExtension("woff2"), true);
});

Deno.test("isBinaryExtension - returns false for text extensions", () => {
  assertEquals(isBinaryExtension("ts"), false);
  assertEquals(isBinaryExtension("js"), false);
  assertEquals(isBinaryExtension("py"), false);
  assertEquals(isBinaryExtension("md"), false);
  assertEquals(isBinaryExtension("txt"), false);
  assertEquals(isBinaryExtension("json"), false);
  assertEquals(isBinaryExtension("html"), false);
  assertEquals(isBinaryExtension("css"), false);
});

Deno.test("isBinaryExtension - is case insensitive", () => {
  assertEquals(isBinaryExtension("PNG"), true);
  assertEquals(isBinaryExtension("Png"), true);
  assertEquals(isBinaryExtension("MP3"), true);
});

Deno.test("isBinaryFile - detects text file as non-binary", async () => {
  await withTempDir(async (tempDir) => {
    const filePath = join(tempDir, "text.txt");
    await Deno.writeTextFile(filePath, "Hello, this is plain text content.");

    const result = await isBinaryFile(filePath);
    assertEquals(result, false);
  });
});

Deno.test("isBinaryFile - detects file with null bytes as binary", async () => {
  await withTempDir(async (tempDir) => {
    const filePath = join(tempDir, "binary.bin");
    const content = new Uint8Array([
      0x48,
      0x65,
      0x6c,
      0x6c,
      0x6f,
      0x00,
      0x57,
      0x6f,
      0x72,
      0x6c,
      0x64,
    ]);
    await Deno.writeFile(filePath, content);

    const result = await isBinaryFile(filePath);
    assertEquals(result, true);
  });
});

Deno.test("isBinaryFile - handles empty file as non-binary", async () => {
  await withTempDir(async (tempDir) => {
    const filePath = join(tempDir, "empty.txt");
    await Deno.writeTextFile(filePath, "");

    const result = await isBinaryFile(filePath);
    assertEquals(result, false);
  });
});

Deno.test("isBinaryFile - handles non-existent file gracefully", async () => {
  const result = await isBinaryFile("/nonexistent/path/file.txt");
  assertEquals(result, false);
});

Deno.test("discoverFiles - skips binary files by default", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "code.ts", "const x = 1;");
    await createFile(tempDir, "image.png", "fake png content");
    await createFile(tempDir, "doc.pdf", "fake pdf content");
    await createFile(tempDir, "style.css", ".class { }");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 2);
    const extensions = files.map((f) => f.extension);
    assertEquals(extensions.includes("ts"), true);
    assertEquals(extensions.includes("css"), true);
    assertEquals(extensions.includes("png"), false);
    assertEquals(extensions.includes("pdf"), false);
  });
});

Deno.test("discoverFiles - includes binary files when skipBinary is false", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "code.ts", "const x = 1;");
    await createFile(tempDir, "image.png", "fake png content");
    await createFile(tempDir, "style.css", ".class { }");

    const files = await discoverFiles(
      { roots: ["."], output: "stdout", skipBinary: false },
      tempDir,
    );

    assertEquals(files.length, 3);
    const extensions = files.map((f) => f.extension);
    assertEquals(extensions.includes("ts"), true);
    assertEquals(extensions.includes("css"), true);
    assertEquals(extensions.includes("png"), true);
  });
});

Deno.test("discoverFiles - skipBinary works with other filters", async () => {
  await withTempDir(async (tempDir) => {
    await createFile(tempDir, "src/app.ts", "");
    await createFile(tempDir, "src/logo.png", "");
    await createFile(tempDir, "src/icon.ico", "");
    await createFile(tempDir, "lib/utils.ts", "");

    const files = await discoverFiles(
      { roots: ["."], include: ["src/**"], output: "stdout" },
      tempDir,
    );

    assertEquals(files.length, 1);
    assertEquals(files[0].relativePath, "src/app.ts");
  });
});
