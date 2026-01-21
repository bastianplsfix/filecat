import type { BundleFile, BundleOptions } from "./types.ts";
import { generateHeader } from "./comments.ts";

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
      parts.push(`[Error reading file: ${error instanceof Error ? error.message : String(error)}]`);
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
  options: BundleOptions
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
      // macOS clipboard using pbcopy
      const command = new Deno.Command("pbcopy", {
        stdin: "piped",
      });
      const process = command.spawn();
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(content));
      await writer.close();
      const status = await process.status;
      if (!status.success) {
        throw new Error("Failed to copy to clipboard");
      }
      break;
    }
  }
}
