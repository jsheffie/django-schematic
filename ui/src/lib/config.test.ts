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
  });
});

describe("exportConfig v3", () => {
  it("exports version 3 with fieldEdits", () => {
    const config = JSON.parse(exportConfig());
    expect(config.version).toBe(3);
    expect(config.fieldEdits).toEqual({ "testapp.Order": EDITS });
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
  });

  it("still rejects unknown versions", () => {
    expect(() => importConfig(JSON.stringify({ version: 4 }))).toThrow(
      "Unknown config version",
    );
  });
});
