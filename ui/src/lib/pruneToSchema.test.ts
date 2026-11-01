import { describe, it, expect } from "vitest";
import { pruneToSchema, type PrunableState } from "./pruneToSchema";
import type { FieldInfo, SchemaGraph } from "./types";

// Issue #131: a config exported before a model changed must not carry names
// that no longer exist in the live schema.

function field(name: string, extra: Partial<FieldInfo> = {}): FieldInfo {
  return {
    name,
    field_type: "CharField",
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
    column: name,
    internal_type: "CharField",
    ...extra,
  };
}

// Live schema: Order lost its `notes` field; the `Legacy` model is gone.
const SCHEMA: SchemaGraph = {
  nodes: [
    {
      id: "store.Order",
      name: "Order",
      app_label: "store",
      app_name: "store",
      tags: [],
      db_table: null,
      fields: [field("id", { primary_key: true }), field("customer", { is_relation: true }), field("status")],
    },
    {
      id: "store.Customer",
      name: "Customer",
      app_label: "store",
      app_name: "store",
      tags: [],
      db_table: null,
      fields: [field("id", { primary_key: true }), field("phone")],
    },
  ],
  edges: [
    {
      source: "store.Order",
      target: "store.Customer",
      relation_type: "fk",
      field_name: "customer",
      related_name: null,
      target_field: "id",
      through_db_table: null,
    },
  ],
  app_labels: ["store"],
  app_names: { store: "store" },
};

function state(overrides: Partial<PrunableState> = {}): PrunableState {
  return {
    visibleNodeIds: new Set(),
    expandedNodeIds: new Set(),
    pinnedPositions: new Map(),
    canvasHidePositions: new Map(),
    fieldEdits: new Map(),
    edgeOffsets: new Map(),
    ...overrides,
  };
}

describe("pruneToSchema: field edits", () => {
  it("drops removed fields from fieldOrder, hiddenFields and fieldColors", () => {
    const pruned = pruneToSchema(
      state({
        fieldEdits: new Map([
          [
            "store.Order",
            {
              fieldOrder: ["status", "notes", "id", "customer"],
              hiddenFields: ["notes", "customer"],
              fieldColors: { notes: "#6366f1", status: "#ef4444" },
            },
          ],
        ]),
      }),
      SCHEMA,
    );
    expect(pruned.fieldEdits.get("store.Order")).toEqual({
      fieldOrder: ["status", "id", "customer"],
      hiddenFields: ["customer"],
      fieldColors: { status: "#ef4444" },
    });
  });

  it("stores an order that becomes the natural order as null", () => {
    const pruned = pruneToSchema(
      state({
        fieldEdits: new Map([
          ["store.Order", { fieldOrder: ["id", "notes", "customer", "status"], hiddenFields: [], fieldColors: { id: "#6b7280" } }],
        ]),
      }),
      SCHEMA,
    );
    expect(pruned.fieldEdits.get("store.Order")?.fieldOrder).toBeNull();
  });

  it("drops a node's entry when nothing is left after pruning", () => {
    const pruned = pruneToSchema(
      state({
        fieldEdits: new Map([
          ["store.Order", { fieldOrder: null, hiddenFields: ["notes"], fieldColors: { notes: "#6366f1" } }],
        ]),
      }),
      SCHEMA,
    );
    expect(pruned.fieldEdits.has("store.Order")).toBe(false);
  });

  it("drops field edits for models no longer in the schema", () => {
    const pruned = pruneToSchema(
      state({
        fieldEdits: new Map([["store.Legacy", { fieldOrder: null, hiddenFields: ["id"], fieldColors: {} }]]),
      }),
      SCHEMA,
    );
    expect(pruned.fieldEdits.size).toBe(0);
  });
});

describe("pruneToSchema: models and relations", () => {
  it("drops removed model ids from visibility, expansion and positions", () => {
    const pruned = pruneToSchema(
      state({
        visibleNodeIds: new Set(["store.Order", "store.Legacy"]),
        expandedNodeIds: new Set(["store.Legacy", "store.Customer"]),
        pinnedPositions: new Map([
          ["store.Order", { x: 1, y: 2 }],
          ["store.Legacy", { x: 3, y: 4 }],
        ]),
        canvasHidePositions: new Map([["store.Legacy", { x: 5, y: 6 }]]),
      }),
      SCHEMA,
    );
    expect([...pruned.visibleNodeIds]).toEqual(["store.Order"]);
    expect([...pruned.expandedNodeIds]).toEqual(["store.Customer"]);
    expect([...pruned.pinnedPositions.keys()]).toEqual(["store.Order"]);
    expect(pruned.canvasHidePositions.size).toBe(0);
  });

  it("drops edge offsets for relations no longer in the schema", () => {
    const pruned = pruneToSchema(
      state({
        edgeOffsets: new Map([
          ["store.Order->store.Customer:customer", { x: 10, y: 0 }],
          ["store.Order->store.Legacy:legacy", { x: 0, y: 10 }],
        ]),
      }),
      SCHEMA,
    );
    expect([...pruned.edgeOffsets.keys()]).toEqual(["store.Order->store.Customer:customer"]);
  });

  it("keeps everything that still matches the schema", () => {
    const input = state({
      visibleNodeIds: new Set(["store.Order", "store.Customer"]),
      expandedNodeIds: new Set(["store.Order"]),
      pinnedPositions: new Map([["store.Customer", { x: 1, y: 2 }]]),
      fieldEdits: new Map([
        ["store.Order", { fieldOrder: ["status", "id", "customer"], hiddenFields: ["status"], fieldColors: { id: "#6b7280" } }],
      ]),
      edgeOffsets: new Map([["store.Order->store.Customer:customer", { x: 10, y: 0 }]]),
    });
    expect(pruneToSchema(input, SCHEMA)).toEqual(input);
  });
});
