import { describe, it, expect, beforeEach } from "vitest";
import { useSchemaStore } from "./schemaStore";
import { usePhysicsStore } from "./physicsStore";

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
