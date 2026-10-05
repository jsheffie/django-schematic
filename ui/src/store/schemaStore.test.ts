import { describe, it, expect, beforeEach } from "vitest";
import { useSchemaStore } from "./schemaStore";
import { usePhysicsStore } from "./physicsStore";
import type { FieldInfo } from "../lib/types";
import type { FieldEdits } from "../lib/fieldEdits";

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

describe("moveField", () => {
  const s = () => useSchemaStore.getState();
  const order = () => s().fieldEdits.get(NODE)?.fieldOrder ?? null;

  it("moves a field down and up one position", () => {
    s().moveField(NODE, "id", 1, NATURAL);
    expect(order()).toEqual(["customer", "id", "total", "notes"]);
    s().moveField(NODE, "total", -1, NATURAL);
    expect(order()).toEqual(["customer", "total", "id", "notes"]);
  });

  it("moves from the current custom order, not the natural one", () => {
    s().setFieldOrder(NODE, ["notes", "total", "customer", "id"], NATURAL);
    s().moveField(NODE, "customer", -1, NATURAL);
    expect(order()).toEqual(["notes", "customer", "total", "id"]);
  });

  it("moves to the top and bottom with infinite deltas", () => {
    s().moveField(NODE, "total", -Infinity, NATURAL);
    expect(order()).toEqual(["total", "id", "customer", "notes"]);
    s().moveField(NODE, "total", Infinity, NATURAL);
    expect(order()).toEqual(["id", "customer", "notes", "total"]);
  });

  it("clamps at both ends and leaves state untouched for a no-op", () => {
    s().moveField(NODE, "id", -1, NATURAL);
    expect(s().fieldEdits.has(NODE)).toBe(false);

    s().moveField(NODE, "notes", 5, NATURAL);
    expect(s().fieldEdits.has(NODE)).toBe(false);

    s().moveField(NODE, "customer", 10, NATURAL);
    expect(order()).toEqual(["id", "total", "notes", "customer"]);
    const before = s().fieldEdits;
    s().moveField(NODE, "customer", 1, NATURAL);
    expect(s().fieldEdits).toBe(before);
  });

  it("steps over a hidden field like any other row and keeps it hidden", () => {
    s().toggleFieldHidden(NODE, "customer");
    s().moveField(NODE, "id", 1, NATURAL);
    expect(order()).toEqual(["customer", "id", "total", "notes"]);
    expect(s().fieldEdits.get(NODE)?.hiddenFields).toEqual(["customer"]);
  });

  it("drops the order override when a move restores the natural order", () => {
    s().moveField(NODE, "id", 1, NATURAL);
    s().moveField(NODE, "id", -1, NATURAL);
    expect(s().fieldEdits.has(NODE)).toBe(false);
  });

  it("includes fields missing from a stored order, after the ordered ones", () => {
    // A stored order from an older schema that lacks "notes".
    s().setFieldOrder(NODE, ["total", "id", "customer"], NATURAL);
    s().moveField(NODE, "notes", -1, NATURAL);
    expect(order()).toEqual(["total", "id", "notes", "customer"]);
  });

  it("ignores an unknown field name", () => {
    const before = s().fieldEdits;
    s().moveField(NODE, "nope", 1, NATURAL);
    expect(s().fieldEdits).toBe(before);
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

describe("sort by type with colors (issue #115)", () => {
  const field = (name: string, field_type: string, extra: Partial<FieldInfo> = {}): FieldInfo => ({
    name,
    field_type,
    internal_type: field_type,
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
    ...extra,
  });
  const fields = [
    field("created_at", "DateTimeField"),
    field("customer", "ForeignKey", { is_relation: true }),
    field("id", "BigAutoField", { primary_key: true }),
    field("is_paid", "BooleanField"),
    field("status", "CharField"),
  ];
  const TYPE_COLORS = {
    id: "#6b7280", customer: "#3b82f6", status: "#ef4444", is_paid: "#22c55e", created_at: "#f59e0b",
  };
  const s = () => useSchemaStore.getState();

  beforeEach(() => {
    useSchemaStore.setState({ fieldEdits: new Map(), typeColors: {} });
  });

  it("sorts and colors in a single store update", () => {
    let updates = 0;
    const unsub = useSchemaStore.subscribe(() => updates++);
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    unsub();

    expect(updates).toBe(1);
    expect(s().fieldEdits.get("shop.Order")).toEqual({
      hiddenFields: [],
      fieldOrder: ["id", "customer", "status", "is_paid", "created_at"],
      fieldColors: TYPE_COLORS,
    });
  });

  it("replaces a row's override when run again with colors on", () => {
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    s().setFieldColor("shop.Order", "status", "#a855f7");
    s().setFieldColor("shop.Order", "ghost", "#a855f7"); // a field no longer in the schema
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    expect(s().fieldEdits.get("shop.Order")?.fieldColors).toEqual(TYPE_COLORS);
  });

  it("leaves colors alone with colors off", () => {
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    s().setFieldColor("shop.Order", "status", "#a855f7");
    s().sortFieldsByType("shop.Order", fields, { withColors: false });
    expect(s().fieldEdits.get("shop.Order")?.fieldColors).toEqual({ ...TYPE_COLORS, status: "#a855f7" });
  });

  it("keeps hidden fields, and colors them too", () => {
    s().toggleFieldHidden("shop.Order", "status");
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    const e = s().fieldEdits.get("shop.Order");
    expect(e?.hiddenFields).toEqual(["status"]);
    expect(e?.fieldColors.status).toBe("#ef4444");
  });

  it("reads the type color map from the store", () => {
    s().setTypeColor("CharField", "#6366f1");
    s().setTypeColor("pk", "#a855f7");
    s().sortFieldsByType("shop.Order", fields, { withColors: true });
    expect(s().fieldEdits.get("shop.Order")?.fieldColors).toMatchObject({ status: "#6366f1", id: "#a855f7" });
  });

  it("sorts and colors every node at once from the toolbar", () => {
    const tag = { id: "shop.Tag", fields: [field("code", "SlugField"), field("name", "CharField")] };
    let updates = 0;
    const unsub = useSchemaStore.subscribe(() => updates++);
    s().sortAllFieldsByType([{ id: "shop.Order", fields }, tag], { withColors: true });
    unsub();

    expect(updates).toBe(1);
    expect(s().fieldEdits.get("shop.Order")?.fieldColors).toEqual(TYPE_COLORS);
    expect(s().fieldEdits.get("shop.Tag")).toEqual({
      hiddenFields: [],
      fieldOrder: ["name", "code"],
      fieldColors: { name: "#ef4444", code: "#6366f1" },
    });
  });

  it("keeps a node whose natural order is already sorted when it gains colors", () => {
    const author = {
      id: "shop.Author",
      fields: [field("id", "BigAutoField", { primary_key: true }), field("name", "CharField")],
    };
    s().sortAllFieldsByType([author], { withColors: true });
    expect(s().fieldEdits.get("shop.Author")).toEqual({
      hiddenFields: [],
      fieldOrder: null,
      fieldColors: { id: "#6b7280", name: "#ef4444" },
    });
  });
});

describe("typeColors", () => {
  const s = () => useSchemaStore.getState();
  beforeEach(() => useSchemaStore.setState({ typeColors: {} }));

  it("stores and clears one entry at a time, staying sparse", () => {
    s().setTypeColor("CharField", "#22c55e");
    s().setTypeColor("pk", "#ef4444");
    expect(s().typeColors).toEqual({ CharField: "#22c55e", pk: "#ef4444" });
    s().setTypeColor("CharField", null);
    expect(s().typeColors).toEqual({ pk: "#ef4444" });
  });

  it("restores defaults by clearing every entry", () => {
    s().setTypeColor("CharField", "#22c55e");
    s().resetTypeColors();
    expect(s().typeColors).toEqual({});
  });

  it("is a setting, so File > Reset leaves it alone", () => {
    s().setTypeColor("CharField", "#22c55e");
    s().resetConfig();
    expect(s().typeColors).toEqual({ CharField: "#22c55e" });
  });
});

describe("clearAllFieldColors", () => {
  const s = () => useSchemaStore.getState();

  it("removes every field color on every table in one update, keeping order and hidden fields", () => {
    useSchemaStore.setState({
      fieldEdits: new Map<string, FieldEdits>([
        ["shop.Order", { hiddenFields: ["notes"], fieldOrder: ["id", "total", "notes"], fieldColors: { id: "#6b7280" } }],
        ["shop.Tag", { hiddenFields: [], fieldOrder: ["name", "code"], fieldColors: { name: "#ef4444", code: "#6366f1" } }],
      ]),
    });
    let updates = 0;
    const unsub = useSchemaStore.subscribe(() => updates++);
    s().clearAllFieldColors();
    unsub();

    expect(updates).toBe(1);
    expect(s().fieldEdits.get("shop.Order")).toEqual({
      hiddenFields: ["notes"], fieldOrder: ["id", "total", "notes"], fieldColors: {},
    });
    expect(s().fieldEdits.get("shop.Tag")?.fieldColors).toEqual({});
  });

  it("drops entries that held nothing but colors, keeping the map sparse", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([["shop.Genre", { hiddenFields: [], fieldOrder: null, fieldColors: { id: "#6b7280" } }]]),
    });
    s().clearAllFieldColors();
    expect(s().fieldEdits.size).toBe(0);
  });

  it("leaves the type color map alone", () => {
    useSchemaStore.setState({ typeColors: { CharField: "#a855f7" } });
    s().clearAllFieldColors();
    expect(s().typeColors).toEqual({ CharField: "#a855f7" });
  });
});

describe("physicsStore.colorByType", () => {
  it("defaults to off and toggles", () => {
    expect(usePhysicsStore.getState().colorByType).toBe(false);
    usePhysicsStore.getState().setColorByType(true);
    expect(usePhysicsStore.getState().colorByType).toBe(true);
    usePhysicsStore.getState().setColorByType(false);
  });
});

describe("annotations", () => {
  beforeEach(() => useSchemaStore.setState({ textBlocks: new Map(), arrows: new Map() }));
  const block = { x: 0, y: 0, width: 200, height: 72, text: "hi", style: "note" as const };

  it("adds, updates and removes a text block", () => {
    const s = () => useSchemaStore.getState();
    const id = s().addTextBlock(block);
    expect(id).toMatch(/^tb_/);
    s().updateTextBlock(id, { text: "changed", color: "#ef4444" });
    expect(s().textBlocks.get(id)).toMatchObject({ text: "changed", color: "#ef4444", width: 200 });
    s().removeTextBlock(id);
    expect(s().textBlocks.has(id)).toBe(false);
  });

  it("ignores updates to a block that does not exist", () => {
    useSchemaStore.getState().updateTextBlock("tb_missing", { text: "x" });
    expect(useSchemaStore.getState().textBlocks.size).toBe(0);
  });

  it("removing a text block cascades to arrows attached to it", () => {
    const s = () => useSchemaStore.getState();
    const tb = s().addTextBlock(block);
    const attached = s().addArrow({ from: { nodeId: tb }, to: { nodeId: "library.Book" } });
    const attachedAtTo = s().addArrow({ from: { x: 0, y: 0 }, to: { nodeId: tb } });
    const other = s().addArrow({ from: { x: 0, y: 0 }, to: { nodeId: "library.Book" } });
    s().removeTextBlock(tb);
    expect(s().arrows.has(attached)).toBe(false);
    expect(s().arrows.has(attachedAtTo)).toBe(false);
    expect(s().arrows.has(other)).toBe(true);
  });

  it("adds, updates and removes arrows", () => {
    const s = () => useSchemaStore.getState();
    const id = s().addArrow({ from: { x: 1, y: 2 }, to: { nodeId: "library.Book" } });
    expect(id).toMatch(/^ar_/);
    s().updateArrow(id, { label: "nightly", startHead: true });
    expect(s().arrows.get(id)).toMatchObject({ label: "nightly", startHead: true, from: { x: 1, y: 2 } });
    s().removeArrow(id);
    expect(s().arrows.has(id)).toBe(false);
  });

  it("stores arrow offsets sparsely and drops near-zero ones", () => {
    const s = () => useSchemaStore.getState();
    const id = s().addArrow({ from: { x: 0, y: 0 }, to: { x: 9, y: 9 } });
    s().setArrowOffset(id, { x: 12, y: -3 });
    expect(s().arrows.get(id)?.offset).toEqual({ x: 12, y: -3 });
    s().setArrowOffset(id, { x: 0.4, y: -0.2 });
    expect(s().arrows.get(id)?.offset).toBeUndefined();
    s().setArrowOffset(id, { x: 5, y: 5 });
    s().clearArrowOffset(id);
    expect(s().arrows.get(id)?.offset).toBeUndefined();
  });

  it("resetConfig leaves annotations alone", () => {
    const s = () => useSchemaStore.getState();
    const tb = s().addTextBlock(block);
    const ar = s().addArrow({ from: { nodeId: tb }, to: { x: 0, y: 0 } });
    s().resetConfig();
    expect(s().textBlocks.has(tb)).toBe(true);
    expect(s().arrows.has(ar)).toBe(true);
  });
});

describe("documentName", () => {
  const s = () => useSchemaStore.getState();

  it("starts unset and is set by setDocumentName", () => {
    useSchemaStore.setState({ documentName: null });
    s().setDocumentName("orders");
    expect(s().documentName).toBe("orders");
  });

  it("resetConfig keeps it: the canvas is still the same document", () => {
    s().setDocumentName("orders");
    s().resetConfig();
    expect(s().documentName).toBe("orders");
  });
});
