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
