/**
 * Reads the schematic config out of an imported file (issue #129): a PNG
 * exported from schematic (config in its `schematic` tEXt chunk) or a JSON
 * config. Shared by the File menu pickers and drag and drop.
 */
import { extractTextChunk } from "./pngEmbed";

export type ConfigFileKind = "png" | "json";

/** A file that cannot be imported; the message is shown to the user as is. */
export class ConfigFileError extends Error {
  name = "ConfigFileError";
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

function isJsonFile(file: File): boolean {
  return file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
}

/**
 * The config JSON in `file`, and which kind of file held it. A PNG is
 * recognised by its bytes, so a renamed export still imports. Throws
 * ConfigFileError for a PNG without a config or a file of any other kind;
 * the JSON itself is validated later, by importConfig.
 */
export async function readConfigFile(file: File): Promise<{ kind: ConfigFileKind; json: string }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPng(bytes)) {
    const json = extractTextChunk(bytes, "schematic");
    if (!json) throw new ConfigFileError("This PNG does not contain an embedded schematic config.");
    return { kind: "png", json };
  }
  if (isJsonFile(file)) return { kind: "json", json: new TextDecoder().decode(bytes) };
  throw new ConfigFileError(`"${file.name}" is not a schematic file. Use a PNG exported from schematic or a JSON config.`);
}
