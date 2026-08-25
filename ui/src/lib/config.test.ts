import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });

import { exportConfig, importConfig } from "./config";
import { useSchemaStore } from "../store/schemaStore";
import type { FieldEdits } from "./fieldEdits";

const EDITS: FieldEdits = {
  hiddenFields: ["notes"],
  fieldOrder: ["total", "id", "customer", "notes"],
  fieldColors: { total: "#ef4444" },
};

beforeEach(() => {
  useSchemaStore.getState().resetConfig();
  useSchemaStore.setState({
    visibleNodeIds: new Set(["testapp.Order"]),
    fieldEdits: new Map([["testapp.Order", EDITS]]),
    edgeOffsets: new Map([["testapp.Order->testapp.Customer:customer", { x: 30, y: -12 }]]),
  });
});

describe("exportConfig v4", () => {
  it("exports version 4 with fieldEdits and edgeOffsets", () => {
    const config = JSON.parse(exportConfig());
    expect(config.version).toBe(4);
    expect(config.fieldEdits).toEqual({ "testapp.Order": EDITS });
    expect(config.edgeOffsets).toEqual({
      "testapp.Order->testapp.Customer:customer": { x: 30, y: -12 },
    });
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

  it("still rejects unknown versions", () => {
    expect(() => importConfig(JSON.stringify({ version: 99 }))).toThrow(
      "Unknown config version",
    );
  });
});
