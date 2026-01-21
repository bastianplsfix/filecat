import { assertEquals, assertRejects } from "@std/assert";
import { discoverFiles } from "../src/discovery.ts";
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
