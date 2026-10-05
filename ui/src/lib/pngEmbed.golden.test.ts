/**
 * Golden-file tests for the PNG import path a user takes with a file exported
 * by an older version: read the bytes, pull the `schematic` tEXt chunk, hand
 * it to importConfig. Fixtures live in __fixtures__/ and are never edited.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { extractTextChunk, injectTextChunk } from "./pngEmbed";
import { importConfig } from "./config";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";

const FIXTURES = join(__dirname, "__fixtures__");
const pngFixture = (name: string): Uint8Array => new Uint8Array(readFileSync(join(FIXTURES, name)));
const textFixture = (name: string): string => readFileSync(join(FIXTURES, name), "utf8");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isIendLast(bytes: Uint8Array): boolean {
  const o = bytes.length - 12;
  return (
    bytes[o] === 0 && bytes[o + 1] === 0 && bytes[o + 2] === 0 && bytes[o + 3] === 0 && // length 0
    String.fromCharCode(bytes[o + 4], bytes[o + 5], bytes[o + 6], bytes[o + 7]) === "IEND"
  );
}

beforeEach(() => {
  useSchemaStore.getState().resetConfig();
  useSchemaStore.setState({ visibleNodeIds: new Set(), schemaInitialized: false });
});

describe.each([
  ["export-v2.png", 2],
  ["export-v3.png", 3],
  ["export-v4.png", 4],
  ["export-v5.png", 5],
  ["export-v6.png", 6],
])("%s", (file, version) => {
  it("is a well-formed PNG with the config in a tEXt chunk before IEND", () => {
    const bytes = pngFixture(file);
    expect(Array.from(bytes.subarray(0, 8))).toEqual(PNG_SIGNATURE);
    expect(isIendLast(bytes)).toBe(true);

    const text = extractTextChunk(bytes, "schematic");
    expect(typeof text).toBe("string");
    expect(JSON.parse(text!).version).toBe(version);
    expect(extractTextChunk(bytes, "Schematic")).toBeNull(); // keyword match is exact
  });

  it("imports through importConfig like the File → Import PNG menu does", () => {
    const text = extractTextChunk(pngFixture(file), "schematic")!;
    expect(() => importConfig(text)).not.toThrow();
    const s = useSchemaStore.getState();
    expect(s.schemaInitialized).toBe(true);
    expect(s.visibleNodeIds.size).toBeGreaterThan(0);
    expect(s.pinnedPositions.size).toBeGreaterThanOrEqual(s.visibleNodeIds.size);
  });
});

describe("export-v2.png", () => {
  it("restores the library diagram: dagre-tb layout, schema-graph palette, no field edits", () => {
    const viewport = importConfig(extractTextChunk(pngFixture("export-v2.png"), "schematic")!);
    const s = useSchemaStore.getState();
    const p = usePhysicsStore.getState();

    expect(s.visibleNodeIds).toEqual(
      new Set(["library.Author", "library.Book", "library.Genre", "library.Loan", "library.Member"]),
    );
    expect(s.pinnedPositions.get("library.Loan")).toEqual({ x: 182.5, y: 0 });
    expect(s.pinnedPositions.get("library.Book")).toEqual({ x: 64.75, y: 261 });
    expect(s.activeLayout).toBe("dagre-tb");
    expect(s.collapsedApps.size).toBe(21);
    expect(viewport).toEqual({
      x: 697.1277966314731,
      y: 128.58333333333331,
      zoom: 1.0646053293112117,
      canvasSize: { width: 1919, height: 931 },
    });
    expect(s.fieldEdits.size).toBe(0);
    expect(s.edgeOffsets.size).toBe(0);
    expect(p.colorPalette).toBe("schema-graph");
    expect(p.backgroundStyle).toBe("none");
    expect(p.edgeStyle).toBe("floating");
  });
});

describe("export-v3.png", () => {
  it("restores fieldEdits for four nodes, including colors and a null order", () => {
    importConfig(extractTextChunk(pngFixture("export-v3.png"), "schematic")!);
    const s = useSchemaStore.getState();

    expect(s.visibleNodeIds.size).toBe(8);
    expect(s.visibleNodeIds.has("socialaccount.SocialToken")).toBe(true);
    expect(s.activeLayout).toBe("dagre-lr");
    expect(s.fieldEdits.size).toBe(4);
    expect(s.fieldEdits.get("library.Loan")).toEqual({
      hiddenFields: ["id"],
      fieldOrder: ["id", "member", "book", "status", "details", "due_on", "loaned_on", "returned_on"],
      fieldColors: { due_on: "#6b7280", loaned_on: "#6b7280", returned_on: "#6b7280" },
    });
    expect(s.fieldEdits.get("library.Book")?.fieldColors).toEqual({ published_on: "#22c55e" });
    expect(s.fieldEdits.get("library.Member")).toEqual({
      hiddenFields: ["id"],
      fieldOrder: null,
      fieldColors: {},
    });
    expect(s.edgeOffsets.size).toBe(0); // predates edgeOffsets
  });
});

describe("export-v4.png", () => {
  it("carries exactly the bytes committed as config-v4.json", () => {
    expect(extractTextChunk(pngFixture("export-v4.png"), "schematic")).toBe(textFixture("config-v4.json"));
  });

  it("yields the same store state as importing config-v4.json", () => {
    importConfig(textFixture("config-v4.json"));
    const fromJson = useSchemaStore.getState();
    const snapshot = {
      visibleNodeIds: fromJson.visibleNodeIds,
      pinnedPositions: fromJson.pinnedPositions,
      canvasHidePositions: fromJson.canvasHidePositions,
      fieldEdits: fromJson.fieldEdits,
      edgeOffsets: fromJson.edgeOffsets,
      viewportState: fromJson.viewportState,
      activeLayout: fromJson.activeLayout,
    };

    useSchemaStore.getState().resetConfig();
    useSchemaStore.setState({ visibleNodeIds: new Set() });
    importConfig(extractTextChunk(pngFixture("export-v4.png"), "schematic")!);
    const fromPng = useSchemaStore.getState();

    expect(fromPng).toMatchObject(snapshot);
    expect(fromPng.edgeOffsets.size).toBe(4);
    expect(fromPng.edgeOffsets.get("tracker.Task->tracker.Task:parent")).toEqual({
      x: 274.50378886269175,
      y: 5.528255374840114,
    });
  });
});

describe("export-v5.png", () => {
  it("carries exactly the bytes committed as config-v5.json", () => {
    expect(extractTextChunk(pngFixture("export-v5.png"), "schematic")).toBe(textFixture("config-v5.json"));
  });

  it("restores the annotations the way File → Import PNG does", () => {
    importConfig(extractTextChunk(pngFixture("export-v5.png"), "schematic")!);
    const s = useSchemaStore.getState();
    expect(s.textBlocks.size).toBe(2);
    expect(s.textBlocks.get("tb_muu6m94ohv0d17")?.style).toBe("title");
    expect(s.arrows.get("ar_muu6i3ksv56l6k")?.to).toEqual({ nodeId: "library.Book" });
    expect(s.arrows.get("ar_muu6nil9hedchv")?.from).toEqual({ x: 690, y: 367.66666666666663 });
  });
});

describe("export-v6.png", () => {
  it("carries exactly the bytes committed as config-v6.json", () => {
    expect(extractTextChunk(pngFixture("export-v6.png"), "schematic")).toBe(textFixture("config-v6.json"));
  });

  it("restores the type colors the way File → Import PNG does", () => {
    importConfig(extractTextChunk(pngFixture("export-v6.png"), "schematic")!);
    const s = useSchemaStore.getState();
    expect(s.typeColors).toEqual({ CharField: "#a855f7" });
    expect(s.fieldEdits.get("library.Genre")?.fieldColors).toEqual({ id: "#6b7280", name: "#a855f7" });
  });
});

describe("injectTextChunk on a real export", () => {
  it("adds a second chunk without disturbing the existing one or the IEND trailer", () => {
    const original = pngFixture("export-v2.png");
    const withExtra = injectTextChunk(original, "other", "hello");

    expect(withExtra.length).toBe(original.length + 12 + "other".length + 1 + "hello".length);
    expect(isIendLast(withExtra)).toBe(true);
    expect(extractTextChunk(withExtra, "other")).toBe("hello");
    expect(extractTextChunk(withExtra, "schematic")).toBe(extractTextChunk(original, "schematic"));
  });
});
