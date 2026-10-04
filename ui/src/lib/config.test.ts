import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });

import { collectModelPositions, exportConfig, importConfig } from "./config";
import { useSchemaStore } from "../store/schemaStore";
import type { FieldEdits } from "./fieldEdits";
import type { Arrow, TextBlock } from "./annotations";

const EDITS: FieldEdits = {
  hiddenFields: ["notes"],
  fieldOrder: ["total", "id", "customer", "notes"],
  fieldColors: { total: "#ef4444" },
};

const BLOCK: TextBlock = {
  x: 10, y: 20, width: 200, height: 72, text: "denormalized", style: "note", color: "#f59e0b",
};
const ARROW: Arrow = {
  from: { nodeId: "tb_1" }, to: { nodeId: "testapp.Order" },
  label: "nightly", startHead: true, offset: { x: 4, y: -9 },
};

beforeEach(() => {
  useSchemaStore.getState().resetConfig();
  useSchemaStore.setState({
    visibleNodeIds: new Set(["testapp.Order"]),
    fieldEdits: new Map([["testapp.Order", EDITS]]),
    edgeOffsets: new Map([["testapp.Order->testapp.Customer:customer", { x: 30, y: -12 }]]),
    textBlocks: new Map([["tb_1", BLOCK]]),
    arrows: new Map([["ar_1", ARROW]]),
  });
});

describe("exportConfig v5", () => {
  it("exports version 5 with fieldEdits, edgeOffsets and annotations", () => {
    const config = JSON.parse(exportConfig());
    expect(config.version).toBe(5);
    expect(config.fieldEdits).toEqual({ "testapp.Order": EDITS });
    expect(config.edgeOffsets).toEqual({
      "testapp.Order->testapp.Customer:customer": { x: 30, y: -12 },
    });
    expect(config.annotations).toEqual({ textBlocks: { tb_1: BLOCK }, arrows: { ar_1: ARROW } });
  });
});

describe("collectModelPositions", () => {
  it("keeps model node positions and drops text blocks and anchors", () => {
    expect(
      collectModelPositions([
        { id: "testapp.Order", type: "model", position: { x: 1, y: 2 } },
        { id: "tb_1", type: "text", position: { x: 3, y: 4 } },
        { id: "anchor:ar_1:to", type: "anchor", position: { x: 5, y: 6 } },
      ]),
    ).toEqual({ "testapp.Order": { x: 1, y: 2 } });
  });
});

describe("importConfig", () => {
  it("round-trips fieldEdits losslessly", () => {
    const json = exportConfig();
    useSchemaStore.getState().resetConfig();
    useSchemaStore.setState({ fieldEdits: new Map() });
    importConfig(json);
    expect(useSchemaStore.getState().fieldEdits.get("testapp.Order")).toEqual(EDITS);
  });

  it("round-trips edgeOffsets losslessly", () => {
    const json = exportConfig();
    useSchemaStore.getState().resetConfig();
    importConfig(json);
    expect(
      useSchemaStore.getState().edgeOffsets.get("testapp.Order->testapp.Customer:customer"),
    ).toEqual({ x: 30, y: -12 });
  });

  it("round-trips annotations losslessly", () => {
    const json = exportConfig();
    useSchemaStore.setState({ textBlocks: new Map(), arrows: new Map() });
    importConfig(json);
    expect(useSchemaStore.getState().textBlocks.get("tb_1")).toEqual(BLOCK);
    expect(useSchemaStore.getState().arrows.get("ar_1")).toEqual(ARROW);
  });

  it("imports a v4 config with empty annotations, replacing any current ones", () => {
    const v4 = JSON.stringify({
      version: 4,
      activeLayout: "elk",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: { edgeStyle: "bezier", liveDragPhysics: false, forceParams: {}, appMode: "normal" },
      edgeOffsets: { "a->b:f": { x: 1, y: 1 } },
    });
    importConfig(v4);
    expect(useSchemaStore.getState().textBlocks.size).toBe(0);
    expect(useSchemaStore.getState().arrows.size).toBe(0);
    expect(useSchemaStore.getState().edgeOffsets.size).toBe(1);
  });

  it("imports a v5 config that omits annotations as empty maps", () => {
    const v5 = JSON.stringify({
      version: 5,
      activeLayout: "elk",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: { edgeStyle: "bezier", liveDragPhysics: false, forceParams: {}, appMode: "normal" },
    });
    expect(() => importConfig(v5)).not.toThrow();
    expect(useSchemaStore.getState().textBlocks.size).toBe(0);
    expect(useSchemaStore.getState().arrows.size).toBe(0);
  });

  it("imports a v3 config (no edgeOffsets) as an empty map but keeps fieldEdits", () => {
    const v3 = JSON.stringify({
      version: 3,
      activeLayout: "elk",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: {
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: {},
        appMode: "normal",
      },
      fieldEdits: { "testapp.Order": EDITS },
    });
    importConfig(v3);
    expect(useSchemaStore.getState().edgeOffsets.size).toBe(0);
    expect(useSchemaStore.getState().fieldEdits.get("testapp.Order")).toEqual(EDITS);
  });

  it("imports a v4 config that omits edgeOffsets entirely as an empty map", () => {
    const v4NoOffsets = JSON.stringify({
      version: 4,
      activeLayout: "elk",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: {
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: {},
        appMode: "normal",
      },
      fieldEdits: { "testapp.Order": EDITS },
      // edgeOffsets intentionally omitted
    });
    expect(() => importConfig(v4NoOffsets)).not.toThrow();
    expect(useSchemaStore.getState().edgeOffsets.size).toBe(0);
  });

  it("imports a v2 config (no fieldEdits) as an empty map", () => {
    const v2 = JSON.stringify({
      version: 2,
      activeLayout: "elk",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: {
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: {},
        appMode: "normal",
      },
    });
    importConfig(v2);
    expect(useSchemaStore.getState().fieldEdits.size).toBe(0);
    expect(useSchemaStore.getState().edgeOffsets.size).toBe(0);
  });

  it("imports a v1 config as an empty map", () => {
    const v1 = JSON.stringify({
      version: 1,
      visibleNodeIds: [],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
    importConfig(v1);
    expect(useSchemaStore.getState().fieldEdits.size).toBe(0);
    expect(useSchemaStore.getState().edgeOffsets.size).toBe(0);
  });

  it("maps the legacy 'force' layout name in v2 exports to 'organic'", () => {
    const v2Force = JSON.stringify({
      version: 2,
      activeLayout: "force",
      visibleNodeIds: ["testapp.Order"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      physics: {
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: {},
        appMode: "normal",
      },
    });
    importConfig(v2Force);
    expect(useSchemaStore.getState().activeLayout).toBe("organic");
  });

  it("still rejects unknown versions", () => {
    expect(() => importConfig(JSON.stringify({ version: 99 }))).toThrow(
      "Unknown config version",
    );
  });
});
