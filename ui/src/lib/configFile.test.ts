import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConfigFileError, readConfigFile } from "./configFile";

// Issue #129: the File menu pickers and drag and drop share one reader that
// tells PNGs and JSON configs apart and pulls out the config JSON.

const FIXTURES = join(__dirname, "__fixtures__");
const PNG = readFileSync(join(FIXTURES, "export-v7.png"));
const JSON_CONFIG = readFileSync(join(FIXTURES, "config-v7.json"), "utf8");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function readError(file: File): Promise<ConfigFileError> {
  try {
    await readConfigFile(file);
  } catch (e) {
    if (e instanceof ConfigFileError) return e;
    throw e;
  }
  throw new Error("expected readConfigFile to reject");
}

describe("readConfigFile", () => {
  it("reads the config embedded in an exported PNG", async () => {
    const result = await readConfigFile(new File([PNG], "orders.png", { type: "image/png" }));
    expect(result.kind).toBe("png");
    expect(JSON.parse(result.json).version).toBe(7);
  });

  it("recognises a PNG by its bytes, whatever the name and type say", async () => {
    const result = await readConfigFile(new File([PNG], "orders", { type: "" }));
    expect(result.kind).toBe("png");
  });

  it("reads a JSON config", async () => {
    const result = await readConfigFile(new File([JSON_CONFIG], "orders.json", { type: "application/json" }));
    expect(result).toEqual({ kind: "json", json: JSON_CONFIG });
  });

  it("reads a .json file the browser gave no type", async () => {
    const result = await readConfigFile(new File([JSON_CONFIG], "Orders.JSON", { type: "" }));
    expect(result.kind).toBe("json");
  });

  it("rejects a PNG without an embedded config", async () => {
    const bare = new File([PNG_SIGNATURE], "screenshot.png", { type: "image/png" });
    expect((await readError(bare)).message).toBe("This PNG does not contain an embedded schematic config.");
  });

  it("rejects other files by name", async () => {
    const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "photo.jpg", { type: "image/jpeg" });
    expect((await readError(photo)).message).toBe(
      '"photo.jpg" is not a schematic file. Use a PNG exported from schematic or a JSON config.',
    );
  });
});
