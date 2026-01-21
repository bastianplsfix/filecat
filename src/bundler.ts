import type { BundleFile, BundleOptions } from "./types.ts";
import { generateHeader } from "./comments.ts";

/**
 * Get the clipboard command for the current platform
 */
function getClipboardCommand(): { cmd: string; args: string[] } {
  const os = Deno.build.os;

  if (os === "darwin") {
    return { cmd: "pbcopy", args: [] };
  } else if (os === "linux") {
    // Try xclip first, fall back to xsel
    return { cmd: "xclip", args: ["-selection", "clipboard"] };
  } else if (os === "windows") {
    return { cmd: "clip", args: [] };
  }

  throw new Error(`Clipboard not supported on ${os}`);
}

/**
 * Copy content to the system clipboard
 */
async function copyToClipboard(content: string): Promise<void> {
  const { cmd, args } = getClipboardCommand();

  try {
    const command = new Deno.Command(cmd, {
      args,
      stdin: "piped",
    });
    const process = command.spawn();
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();
    const status = await process.status;
    if (!status.success) {
      throw new Error(`${cmd} exited with non-zero status`);
    }
  } catch (error) {
    // On Linux, if xclip fails, try xsel as fallback
    if (Deno.build.os === "linux" && cmd === "xclip") {
      try {
        const command = new Deno.Command("xsel", {
          args: ["--clipboard", "--input"],
          stdin: "piped",
        });
        const process = command.spawn();
        const writer = process.stdin.getWriter();
        await writer.write(new TextEncoder().encode(content));
        await writer.close();
        const status = await process.status;
        if (!status.success) {
          throw new Error("xsel exited with non-zero status");
        }
        return;
      } catch {
        // Both failed, throw original error
      }
    }
    throw new Error(
      `Failed to copy to clipboard: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Bundle files into a single output string
 */
export async function bundleFiles(files: BundleFile[]): Promise<string> {
  const parts: string[] = [];

  for (const file of files) {
    // Generate header
    const header = generateHeader(file.relativePath, file.extension);
    parts.push(header);

    // Read file contents
    try {
      const content = await Deno.readTextFile(file.absolutePath);
      parts.push(content);
    } catch (error) {
      // If file can't be read, add an error comment
      parts.push(
        `[Error reading file: ${
          error instanceof Error ? error.message : String(error)
        }]`,
      );
    }

    // Add separator (blank line)
    parts.push("");
  }

  return parts.join("\n");
}

/**
 * Output the bundled content to the specified target
 */
export async function outputBundle(
  content: string,
  options: BundleOptions,
): Promise<void> {
  switch (options.output) {
    case "stdout":
      console.log(content);
      break;

    case "file":
      if (!options.outputPath) {
        throw new Error("Output path required when output is 'file'");
      }
      await Deno.writeTextFile(options.outputPath, content);
      break;

    case "clipboard": {
      await copyToClipboard(content);
      break;
    }
  }
}
