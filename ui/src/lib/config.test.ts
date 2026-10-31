import { describe, it, expect, beforeEach, vi } from "vitest";

vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });

import { collectModelPositions, exportConfig, importConfig } from "./config";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import type { FieldEdits } from "./fieldEdits";
import type { Arrow, TextBlock } from "./annotations";
import type { FieldInfo, NodeInfo, SchemaGraph } from "./types";

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

describe("exportConfig v7", () => {
  it("exports version 7 with fieldEdits, edgeOffsets and annotations", () => {
    const config = JSON.parse(exportConfig(null));
    expect(config.version).toBe(7);
    expect(config.fieldEdits).toEqual({ "testapp.Order": EDITS });
    expect(config.edgeOffsets).toEqual({
      "testapp.Order->testapp.Customer:customer": { x: 30, y: -12 },
    });
    expect(config.annotations).toEqual({ textBlocks: { tb_1: BLOCK }, arrows: { ar_1: ARROW } });
  });
});

describe("type colors (issue #115)", () => {
  const MINIMAL = {
    activeLayout: "elk",
    visibleNodeIds: ["testapp.Order"],
    expandedNodeIds: [],
    pinnedPositions: {},
    collapsedApps: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    physics: { edgeStyle: "bezier", liveDragPhysics: false, forceParams: {}, appMode: "normal" },
  };

  beforeEach(() => {
    useSchemaStore.setState({ typeColors: {} });
    usePhysicsStore.setState({ colorByType: false });
  });

  it("exports the type color map at the top level and colorByType with the physics prefs", () => {
    useSchemaStore.setState({ typeColors: { CharField: "#22c55e", pk: "#ef4444" } });
    usePhysicsStore.setState({ colorByType: true });
    const config = JSON.parse(exportConfig(null));
    expect(config.typeColors).toEqual({ CharField: "#22c55e", pk: "#ef4444" });
    expect(config.physics.colorByType).toBe(true);
  });

  it("round-trips both", () => {
    useSchemaStore.setState({ typeColors: { TextField: "#6366f1" } });
    usePhysicsStore.setState({ colorByType: true });
    const json = exportConfig(null);
    useSchemaStore.setState({ typeColors: {} });
    usePhysicsStore.setState({ colorByType: false });

    importConfig(json, null);
    expect(useSchemaStore.getState().typeColors).toEqual({ TextField: "#6366f1" });
    expect(usePhysicsStore.getState().colorByType).toBe(true);
  });

  it("imports a v6 config that omits both: no overrides, toggle untouched", () => {
    useSchemaStore.setState({ typeColors: { TextField: "#6366f1" } });
    usePhysicsStore.setState({ colorByType: true });
    importConfig(JSON.stringify({ version: 6, ...MINIMAL }), null);
    expect(useSchemaStore.getState().typeColors).toEqual({});
    expect(usePhysicsStore.getState().colorByType).toBe(true);
  });

  it("imports a v5 config with no overrides, leaving the toggle as it was", () => {
    useSchemaStore.setState({ typeColors: { TextField: "#6366f1" } });
    usePhysicsStore.setState({ colorByType: true });
    importConfig(JSON.stringify({ version: 5, ...MINIMAL }), null);
    expect(useSchemaStore.getState().typeColors).toEqual({});
    expect(usePhysicsStore.getState().colorByType).toBe(true);
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
    const json = exportConfig(null);
    useSchemaStore.getState().resetConfig();
    useSchemaStore.setState({ fieldEdits: new Map() });
    importConfig(json, null);
    expect(useSchemaStore.getState().fieldEdits.get("testapp.Order")).toEqual(EDITS);
  });

  it("round-trips edgeOffsets losslessly", () => {
    const json = exportConfig(null);
    useSchemaStore.getState().resetConfig();
    importConfig(json, null);
    expect(
      useSchemaStore.getState().edgeOffsets.get("testapp.Order->testapp.Customer:customer"),
    ).toEqual({ x: 30, y: -12 });
  });

  it("round-trips annotations losslessly", () => {
    const json = exportConfig(null);
    useSchemaStore.setState({ textBlocks: new Map(), arrows: new Map() });
    importConfig(json, null);
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
    importConfig(v4, null);
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
    expect(() => importConfig(v5, null)).not.toThrow();
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
    importConfig(v3, null);
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
    expect(() => importConfig(v4NoOffsets, null)).not.toThrow();
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
    importConfig(v2, null);
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
    importConfig(v1, null);
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
    importConfig(v2Force, null);
    expect(useSchemaStore.getState().activeLayout).toBe("organic");
  });

  it("still rejects unknown versions", () => {
    expect(() => importConfig(JSON.stringify({ version: 99 }), null)).toThrow(
      "Unknown config version",
    );
  });
});

describe("importing an older config against the live schema (issue #131)", () => {
  const field = (name: string, extra: Partial<FieldInfo> = {}): FieldInfo => ({
    name,
    field_type: "CharField",
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
    internal_type: "CharField",
    ...extra,
  });
  const model = (id: string, fields: FieldInfo[]): NodeInfo => ({
    id,
    name: id.split(".")[1],
    app_label: "testapp",
    app_name: "testapp",
    tags: [],
    fields,
  });
  const FK = {
    source: "testapp.Order",
    target: "testapp.Customer",
    relation_type: "fk" as const,
    field_name: "customer",
    related_name: null,
    target_field: "id",
  };

  // Live schema: since the export, Order lost `notes`, `total` went from an
  // IntegerField to a CharField, and the Legacy model is gone.
  const LIVE: SchemaGraph = {
    nodes: [
      model("testapp.Order", [field("id", { primary_key: true }), field("customer", { is_relation: true }), field("total")]),
      model("testapp.Customer", [field("id", { primary_key: true })]),
    ],
    edges: [FK],
    app_labels: ["testapp"],
    app_names: { testapp: "testapp" },
  };
  const OLDER: SchemaGraph = {
    ...LIVE,
    nodes: [
      model("testapp.Order", [
        field("id", { primary_key: true }),
        field("customer", { is_relation: true }),
        field("total", { field_type: "IntegerField", internal_type: "IntegerField" }),
        field("notes", { field_type: "TextField", internal_type: "TextField" }),
      ]),
      model("testapp.Customer", [field("id", { primary_key: true })]),
      model("testapp.Legacy", [field("id", { primary_key: true })]),
    ],
  };

  beforeEach(() => {
    useSchemaStore.setState({
      visibleNodeIds: new Set(["testapp.Order", "testapp.Legacy"]),
      fieldEdits: new Map<string, FieldEdits>([
        ["testapp.Order", { ...EDITS, fieldColors: { total: "#ef4444", notes: "#6366f1" } }],
        ["testapp.Legacy", { hiddenFields: ["id"], fieldOrder: null, fieldColors: {} }],
      ]),
    });
  });

  it("exports version 7 with a snapshot of the schema's field types", () => {
    const config = JSON.parse(exportConfig(OLDER));
    expect(config.version).toBe(7);
    expect(config.schemaSnapshot["testapp.Order"]).toEqual({
      id: "CharField",
      customer: "CharField",
      total: "IntegerField",
      notes: "TextField",
    });
  });

  it("drops stale field and model entries on import, so the next export no longer has them", () => {
    const older = exportConfig(OLDER);
    useSchemaStore.getState().resetConfig();

    importConfig(older, LIVE);

    const reexported = JSON.parse(exportConfig(LIVE));
    expect(reexported.visibleNodeIds).toEqual(["testapp.Order"]);
    expect(reexported.fieldEdits).toEqual({
      "testapp.Order": { hiddenFields: [], fieldOrder: ["total", "id", "customer"], fieldColors: { total: "#ef4444" } },
    });
    expect(JSON.stringify(reexported)).not.toContain("notes");
    expect(JSON.stringify(reexported)).not.toContain("Legacy");
  });

  it("returns what changed since the config was saved", () => {
    const older = exportConfig(OLDER);
    const { schemaChanges } = importConfig(older, LIVE);
    expect(schemaChanges).toEqual({
      removedModels: ["testapp.Legacy"],
      removedFields: [{ model: "testapp.Order", field: "notes" }],
      changedFields: [{ model: "testapp.Order", field: "total", from: "IntegerField", to: "CharField" }],
    });
  });

  it("reports no changes when the schema is the same", () => {
    const { schemaChanges } = importConfig(exportConfig(LIVE), LIVE);
    expect(schemaChanges).toEqual({ removedModels: [], removedFields: [], changedFields: [] });
  });

  it("reports removed names a pre-v7 config refers to (no types to compare)", () => {
    const v6 = JSON.parse(exportConfig(OLDER));
    v6.version = 6;
    delete v6.schemaSnapshot;
    const { schemaChanges } = importConfig(JSON.stringify(v6), LIVE);
    expect(schemaChanges).toEqual({
      removedModels: ["testapp.Legacy"],
      removedFields: [{ model: "testapp.Order", field: "notes" }],
      changedFields: [],
    });
  });

  it("keeps annotations attached to a removed model (they are content)", () => {
    const older = exportConfig(OLDER);
    useSchemaStore.getState().resetConfig();
    importConfig(older, { ...LIVE, nodes: LIVE.nodes.filter((n) => n.id !== "testapp.Order"), edges: [] });
    expect(useSchemaStore.getState().arrows.get("ar_1")).toEqual(ARROW);
  });
});
