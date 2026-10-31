import { describe, it, expect } from "vitest";
import { diffSchema, hasSchemaChanges, referencedSnapshot, snapshotSchema } from "./schemaChanges";
import type { PrunableState } from "./pruneToSchema";
import type { FieldInfo, SchemaGraph } from "./types";

// Issue #131: tell the user what changed between the schema a config was
// saved against and the live one.

function field(name: string, field_type = "CharField"): FieldInfo {
  return {
    name,
    field_type,
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
    internal_type: field_type,
  };
}

const LIVE: SchemaGraph = {
  nodes: [
    {
      id: "store.Order",
      name: "Order",
      app_label: "store",
      app_name: "store",
      tags: [],
      fields: [field("id", "BigAutoField"), field("status", "TextField"), field("total", "DecimalField")],
    },
    { id: "store.Customer", name: "Customer", app_label: "store", app_name: "store", tags: [], fields: [field("id", "BigAutoField")] },
  ],
  edges: [],
  app_labels: ["store"],
  app_names: { store: "store" },
};

describe("snapshotSchema", () => {
  it("maps every model to its field types", () => {
    expect(snapshotSchema(LIVE)).toEqual({
      "store.Order": { id: "BigAutoField", status: "TextField", total: "DecimalField" },
      "store.Customer": { id: "BigAutoField" },
    });
  });
});

describe("diffSchema", () => {
  it("reports nothing when the saved schema matches", () => {
    const changes = diffSchema(snapshotSchema(LIVE), LIVE);
    expect(hasSchemaChanges(changes)).toBe(false);
  });

  it("reports removed models, removed fields and changed field types", () => {
    const saved = {
      "store.Order": { id: "BigAutoField", status: "CharField", notes: "TextField", total: "DecimalField" },
      "store.Legacy": { id: "AutoField", name: "CharField" },
      "store.Customer": { id: "BigAutoField" },
    };
    expect(diffSchema(saved, LIVE)).toEqual({
      removedModels: ["store.Legacy"],
      removedFields: [{ model: "store.Order", field: "notes" }],
      changedFields: [{ model: "store.Order", field: "status", from: "CharField", to: "TextField" }],
    });
  });

  it("does not report a type change when the saved type is unknown", () => {
    const changes = diffSchema({ "store.Order": { status: null, notes: null } }, LIVE);
    expect(changes).toEqual({
      removedModels: [],
      removedFields: [{ model: "store.Order", field: "notes" }],
      changedFields: [],
    });
  });

  it("ignores models and fields added since the save", () => {
    expect(hasSchemaChanges(diffSchema({ "store.Order": { id: "BigAutoField" } }, LIVE))).toBe(false);
  });
});

describe("referencedSnapshot (configs saved before v7)", () => {
  it("collects the models and fields a config names, with unknown types", () => {
    const state: PrunableState = {
      visibleNodeIds: new Set(["store.Order", "store.Legacy"]),
      expandedNodeIds: new Set(["store.Customer"]),
      pinnedPositions: new Map([["store.Gone", { x: 0, y: 0 }]]),
      canvasHidePositions: new Map(),
      fieldEdits: new Map([
        ["store.Order", { fieldOrder: ["id", "notes"], hiddenFields: ["status"], fieldColors: { total: "#ef4444" } }],
      ]),
      edgeOffsets: new Map(),
    };
    expect(referencedSnapshot(state)).toEqual({
      "store.Order": { id: null, notes: null, status: null, total: null },
      "store.Legacy": {},
      "store.Customer": {},
      "store.Gone": {},
    });
  });
});
