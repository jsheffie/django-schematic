// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import TypeColorSettings from "./TypeColorSettings";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import type { FieldInfo, SchemaGraph } from "../lib/types";
import type { FieldEdits } from "../lib/fieldEdits";

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

const node = (id: string, fields: FieldInfo[]) => ({
  id,
  name: id.split(".")[1],
  app_label: id.split(".")[0],
  app_name: id.split(".")[0],
  tags: [],
  fields,
});

const SCHEMA: SchemaGraph = {
  nodes: [
    node("shop.Order", [
      field("id", "UUIDField", { primary_key: true }), // a pk, so no UUIDField row
      field("customer", "ForeignKey", { is_relation: true }),
      field("status", "CharField"),
      field("total", "DecimalField"),
      field("created", "AutoCreatedField", { internal_type: "DateTimeField" }),
    ]),
    node("shop.Tag", [field("name", "CharField"), field("is_live", "BooleanField")]),
  ],
  edges: [],
  app_labels: ["shop"],
  app_names: { shop: "shop" },
};

beforeEach(() => {
  useSchemaStore.setState({ typeColors: {} });
  usePhysicsStore.setState({ colorByType: false });
});

afterEach(cleanup);

const rowLabels = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-type-color-row]")].map((r) => r.getAttribute("data-type-color-row"));

describe("TypeColorSettings", () => {
  it("lists the buckets and every middle type in the schema, in sort order", () => {
    const { container } = render(<TypeColorSettings schema={SCHEMA} />);
    expect(rowLabels(container)).toEqual(["pk", "relation", "CharField", "DecimalField", "boolean", "datetime"]);
  });

  it("shows bucket defaults and Auto for types without a pick", () => {
    const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);
    expect(getByRole("button", { name: "Primary key color: #6b7280" })).toBeTruthy();
    expect(getByRole("button", { name: "Dates and times color: #f59e0b" })).toBeTruthy();
    expect(getByRole("button", { name: "CharField color: Auto" })).toBeTruthy();
  });

  it("picks a color for a type, then sets it back to Auto", () => {
    const { getByRole, queryByRole } = render(<TypeColorSettings schema={SCHEMA} />);

    fireEvent.click(getByRole("button", { name: "CharField color: Auto" }));
    fireEvent.click(getByRole("button", { name: "Color swatch #22c55e" }));

    expect(useSchemaStore.getState().typeColors).toEqual({ CharField: "#22c55e" });
    // Picking closes the picker.
    expect(queryByRole("button", { name: "Color swatch #22c55e" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "CharField color: #22c55e" }));
    fireEvent.click(getByRole("button", { name: "Auto" }));
    expect(useSchemaStore.getState().typeColors).toEqual({});
  });

  it("changes a bucket color and puts it back to its default", () => {
    const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);

    fireEvent.click(getByRole("button", { name: "Relations color: #3b82f6" }));
    fireEvent.click(getByRole("button", { name: "Color swatch #a855f7" }));
    expect(useSchemaStore.getState().typeColors).toEqual({ relation: "#a855f7" });

    fireEvent.click(getByRole("button", { name: "Relations color: #a855f7" }));
    fireEvent.click(getByRole("button", { name: "Default" }));
    expect(useSchemaStore.getState().typeColors).toEqual({});
  });

  it("Restore defaults clears every pick and is disabled when there are none", () => {
    useSchemaStore.setState({ typeColors: { CharField: "#22c55e", pk: "#ef4444" } });
    const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);
    const restore = getByRole("button", { name: "Restore defaults" }) as HTMLButtonElement;
    expect(restore.disabled).toBe(false);

    fireEvent.click(restore);

    expect(useSchemaStore.getState().typeColors).toEqual({});
    expect(restore.disabled).toBe(true);
  });

  it("hosts the shared Color by type switch", () => {
    const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);
    const toggle = getByRole("switch", { name: "Color by type when sorting" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(usePhysicsStore.getState().colorByType).toBe(true);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  describe("Clear colors on all tables", () => {
    const colored = () =>
      new Map<string, FieldEdits>([
        ["shop.Order", { hiddenFields: [], fieldOrder: ["id", "status"], fieldColors: { id: "#6b7280" } }],
        ["shop.Tag", { hiddenFields: [], fieldOrder: null, fieldColors: { name: "#ef4444" } }],
        ["shop.Plain", { hiddenFields: ["x"], fieldOrder: null, fieldColors: {} }],
      ]);

    it("is disabled when no table has a field color", () => {
      useSchemaStore.setState({ fieldEdits: new Map() });
      const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);
      expect((getByRole("button", { name: "Clear colors on all tables" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("asks first, naming how many tables, and Cancel changes nothing", () => {
      useSchemaStore.setState({ fieldEdits: colored() });
      const { getByRole, getByText, queryByRole } = render(<TypeColorSettings schema={SCHEMA} />);

      fireEvent.click(getByRole("button", { name: "Clear colors on all tables" }));
      expect(getByText("Remove the field colors from 2 tables? Order and hidden fields stay.")).toBeTruthy();
      expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldColors).toEqual({ id: "#6b7280" });

      fireEvent.click(getByRole("button", { name: "Cancel" }));
      expect(queryByRole("button", { name: "Clear colors" })).toBeNull();
      expect(useSchemaStore.getState().fieldEdits.get("shop.Tag")?.fieldColors).toEqual({ name: "#ef4444" });
    });

    it("confirming clears every table's colors and keeps everything else", () => {
      useSchemaStore.setState({ fieldEdits: colored() });
      const { getByRole } = render(<TypeColorSettings schema={SCHEMA} />);

      fireEvent.click(getByRole("button", { name: "Clear colors on all tables" }));
      fireEvent.click(getByRole("button", { name: "Clear colors" }));

      const edits = useSchemaStore.getState().fieldEdits;
      expect(edits.get("shop.Order")).toEqual({ hiddenFields: [], fieldOrder: ["id", "status"], fieldColors: {} });
      expect(edits.has("shop.Tag")).toBe(false);
      expect(edits.get("shop.Plain")?.hiddenFields).toEqual(["x"]);
      expect((getByRole("button", { name: "Clear colors on all tables" }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("says 1 table, not 1 tables", () => {
      useSchemaStore.setState({
        fieldEdits: new Map([["shop.Tag", { hiddenFields: [], fieldOrder: null, fieldColors: { name: "#ef4444" } }]]),
      });
      const { getByRole, getByText } = render(<TypeColorSettings schema={SCHEMA} />);
      fireEvent.click(getByRole("button", { name: "Clear colors on all tables" }));
      expect(getByText("Remove the field colors from 1 table? Order and hidden fields stay.")).toBeTruthy();
    });
  });
});
