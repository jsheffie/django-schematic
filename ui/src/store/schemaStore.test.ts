import { describe, it, expect, beforeEach } from "vitest";
import { useSchemaStore } from "./schemaStore";
import { usePhysicsStore } from "./physicsStore";
import type { FieldInfo } from "../lib/types";

const NODE = "testapp.Order";
const NATURAL = ["id", "customer", "total", "notes"];

beforeEach(() => {
  useSchemaStore.setState({ fieldEdits: new Map() });
});

describe("toggleFieldHidden", () => {
  it("hides then re-shows a field, removing the entry when empty again", () => {
    const s = () => useSchemaStore.getState();
    s().toggleFieldHidden(NODE, "notes");
    expect(s().fieldEdits.get(NODE)?.hiddenFields).toEqual(["notes"]);
    s().toggleFieldHidden(NODE, "notes");
    expect(s().fieldEdits.has(NODE)).toBe(false);
  });
});

describe("setFieldOrder", () => {
  it("stores a custom order", () => {
    useSchemaStore.getState().setFieldOrder(NODE, ["total", "id", "customer", "notes"], NATURAL);
    expect(useSchemaStore.getState().fieldEdits.get(NODE)?.fieldOrder).toEqual([
      "total", "id", "customer", "notes",
    ]);
  });

  it("normalizes an order identical to natural order to null (entry removed)", () => {
    const s = () => useSchemaStore.getState();
    s().setFieldOrder(NODE, ["total", "id", "customer", "notes"], NATURAL);
    s().setFieldOrder(NODE, NATURAL, NATURAL);
    expect(s().fieldEdits.has(NODE)).toBe(false);
  });

  it("keeps other edits when order resets to natural", () => {
    const s = () => useSchemaStore.getState();
    s().toggleFieldHidden(NODE, "notes");
    s().setFieldOrder(NODE, NATURAL, NATURAL);
    expect(s().fieldEdits.get(NODE)?.hiddenFields).toEqual(["notes"]);
    expect(s().fieldEdits.get(NODE)?.fieldOrder).toBeNull();
  });
});

describe("setFieldColor", () => {
  it("sets and clears a color, removing the entry when empty again", () => {
    const s = () => useSchemaStore.getState();
    s().setFieldColor(NODE, "total", "#ef4444");
    expect(s().fieldEdits.get(NODE)?.fieldColors).toEqual({ total: "#ef4444" });
    s().setFieldColor(NODE, "total", null);
    expect(s().fieldEdits.has(NODE)).toBe(false);
  });
});

describe("resetFieldEdits / resetConfig", () => {
  it("resetFieldEdits removes only that node's entry", () => {
    const s = () => useSchemaStore.getState();
    s().toggleFieldHidden(NODE, "notes");
    s().toggleFieldHidden("testapp.Customer", "name");
    s().resetFieldEdits(NODE);
    expect(s().fieldEdits.has(NODE)).toBe(false);
    expect(s().fieldEdits.has("testapp.Customer")).toBe(true);
  });

  it("resetConfig clears all fieldEdits", () => {
    const s = () => useSchemaStore.getState();
    s().toggleFieldHidden(NODE, "notes");
    s().resetConfig();
    expect(s().fieldEdits.size).toBe(0);
  });
});

describe("physicsStore.editingNodeId", () => {
  it("defaults to null and is settable", () => {
    expect(usePhysicsStore.getState().editingNodeId).toBeNull();
    usePhysicsStore.getState().setEditingNode(NODE);
    expect(usePhysicsStore.getState().editingNodeId).toBe(NODE);
    usePhysicsStore.getState().setEditingNode(null);
    expect(usePhysicsStore.getState().editingNodeId).toBeNull();
  });
});

describe("edgeOffsets", () => {
  const EDGE = "testapp.Order->testapp.Customer:customer";
  const s = () => useSchemaStore.getState();

  beforeEach(() => {
    useSchemaStore.setState({ edgeOffsets: new Map() });
  });

  it("stores an offset per edge id", () => {
    s().setEdgeOffset(EDGE, { x: 30, y: -12 });
    expect(s().edgeOffsets.get(EDGE)).toEqual({ x: 30, y: -12 });
  });

  it("drops the entry when the offset is (near) zero", () => {
    s().setEdgeOffset(EDGE, { x: 30, y: -12 });
    s().setEdgeOffset(EDGE, { x: 0.4, y: -0.9 });
    expect(s().edgeOffsets.has(EDGE)).toBe(false);
  });

  it("clearEdgeOffset removes only that edge", () => {
    s().setEdgeOffset(EDGE, { x: 30, y: -12 });
    s().setEdgeOffset("other", { x: 5, y: 5 });
    s().clearEdgeOffset(EDGE);
    expect(s().edgeOffsets.has(EDGE)).toBe(false);
    expect(s().edgeOffsets.get("other")).toEqual({ x: 5, y: 5 });
  });

  it("resetConfig clears all offsets", () => {
    s().setEdgeOffset(EDGE, { x: 30, y: -12 });
    s().resetConfig();
    expect(s().edgeOffsets.size).toBe(0);
  });

  it("does not mutate the previous map (new reference per update)", () => {
    const before = s().edgeOffsets;
    s().setEdgeOffset(EDGE, { x: 1, y: 1 });
    expect(s().edgeOffsets).not.toBe(before);
    expect(before.size).toBe(0);
  });
});

describe("sortAllFieldsByType", () => {
  const field = (
    name: string,
    field_type: string,
    extra: Partial<FieldInfo> = {},
  ): FieldInfo => ({
    name,
    field_type,
    internal_type: field_type,
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
    ...extra,
  });
  // Alphabetical, as the Python side delivers it.
  const order = {
    id: "shop.Order",
    fields: [
      field("created_at", "DateTimeField"),
      field("customer", "ForeignKey", { is_relation: true }),
      field("id", "BigAutoField", { primary_key: true }),
      field("is_paid", "BooleanField"),
      field("status", "CharField"),
    ],
  };
  // Alphabetical [code, name]; sorted by type group is [name (Char), code (Slug)].
  const tag = {
    id: "shop.Tag",
    fields: [field("code", "SlugField"), field("name", "CharField")],
  };
  // Already in sorted order: pk, then one CharField.
  const author = {
    id: "shop.Author",
    fields: [field("id", "BigAutoField", { primary_key: true }), field("name", "CharField")],
  };

  beforeEach(() => {
    useSchemaStore.setState({ fieldEdits: new Map() });
  });

  it("stores the sorted order for every node in one update", () => {
    const seen: number[] = [];
    const unsub = useSchemaStore.subscribe((s) => seen.push(s.fieldEdits.size));

    useSchemaStore.getState().sortAllFieldsByType([order, tag, author]);
    unsub();

    const edits = useSchemaStore.getState().fieldEdits;
    expect(edits.get("shop.Order")?.fieldOrder).toEqual([
      "id", "customer", "status", "is_paid", "created_at",
    ]);
    expect(edits.get("shop.Tag")?.fieldOrder).toEqual(["name", "code"]);
    expect(seen).toEqual([2]);
  });

  it("stores no entry for a node whose natural order is already sorted", () => {
    useSchemaStore.getState().sortAllFieldsByType([author]);
    expect(useSchemaStore.getState().fieldEdits.has("shop.Author")).toBe(false);
  });

  it("leaves hidden fields and colors on each node untouched", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([
        ["shop.Order", { hiddenFields: ["status"], fieldOrder: null, fieldColors: { id: "#ef4444" } }],
      ]),
    });

    useSchemaStore.getState().sortAllFieldsByType([order, tag]);

    const e = useSchemaStore.getState().fieldEdits.get("shop.Order");
    expect(e?.hiddenFields).toEqual(["status"]);
    expect(e?.fieldColors).toEqual({ id: "#ef4444" });
    expect(e?.fieldOrder).toEqual(["id", "customer", "status", "is_paid", "created_at"]);
  });

  it("replaces a manual order on every node when run again", () => {
    useSchemaStore.getState().setFieldOrder(
      "shop.Order",
      ["status", "created_at", "is_paid", "id", "customer"],
      order.fields.map((f) => f.name),
    );
    useSchemaStore.getState().sortAllFieldsByType([order, tag]);
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual([
      "id", "customer", "status", "is_paid", "created_at",
    ]);
  });

  it("drops the entry for a node whose manual order sorts back to natural", () => {
    useSchemaStore.getState().setFieldOrder(
      "shop.Author",
      ["name", "id"],
      author.fields.map((f) => f.name),
    );
    expect(useSchemaStore.getState().fieldEdits.has("shop.Author")).toBe(true);

    useSchemaStore.getState().sortAllFieldsByType([author]);
    expect(useSchemaStore.getState().fieldEdits.has("shop.Author")).toBe(false);
  });
});
