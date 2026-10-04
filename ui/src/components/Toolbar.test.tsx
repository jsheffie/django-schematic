// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import Toolbar from "./Toolbar";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import type { FieldInfo, SchemaGraph } from "../lib/types";

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

const SCHEMA: SchemaGraph = {
  nodes: [
    {
      id: "shop.Order",
      name: "Order",
      app_label: "shop",
      app_name: "shop",
      tags: [],
      fields: [
        field("created_at", "DateTimeField"),
        field("customer", "ForeignKey", { is_relation: true }),
        field("id", "BigAutoField", { primary_key: true }),
        field("status", "CharField"),
      ],
    },
    {
      id: "shop.Tag",
      name: "Tag",
      app_label: "shop",
      app_name: "shop",
      tags: [],
      // Alphabetical [code, name]; sorted by type group is [name (Char), code (Slug)].
      fields: [field("code", "SlugField"), field("name", "CharField")],
    },
  ],
  edges: [],
  app_labels: ["shop"],
  app_names: { shop: "shop" },
};

beforeEach(() => {
  // Only one node visible: the sort must still cover every node in the schema.
  useSchemaStore.setState({
    fieldEdits: new Map(),
    visibleNodeIds: new Set(["shop.Tag"]),
    textBlocks: new Map(),
    arrows: new Map(),
  });
  usePhysicsStore.setState({ annotationTool: null, editingTextBlockId: null });
});

afterEach(cleanup);

function renderToolbar() {
  return render(
    <ReactFlowProvider>
      <Toolbar schema={SCHEMA} />
    </ReactFlowProvider>,
  );
}

describe("Toolbar sort all tables by type", () => {
  it("sorts every table in the schema, visible or not, once confirmed", () => {
    const { getByRole } = renderToolbar();

    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));
    expect(useSchemaStore.getState().fieldEdits.size).toBe(0);
    fireEvent.click(getByRole("button", { name: "Sort all tables" }));

    const edits = useSchemaStore.getState().fieldEdits;
    expect(edits.get("shop.Order")?.fieldOrder).toEqual(["id", "customer", "status", "created_at"]);
    expect(edits.get("shop.Tag")?.fieldOrder).toEqual(["name", "code"]);
  });

  it("says what it does and that it replaces manual reorders", () => {
    const { getByRole } = renderToolbar();
    const title = (getByRole("button", { name: "Sort all tables by type" }) as HTMLButtonElement).title;
    expect(title).toContain("every table");
    expect(title).toContain("manual reorders");
  });
});

describe("Toolbar sort all: confirmation when a custom order exists", () => {
  const manualOrder = ["status", "id", "customer", "created_at"];
  const naturalTag = ["code", "name"];

  function withManualOrderOnOrder() {
    useSchemaStore.setState({
      fieldEdits: new Map([
        ["shop.Order", { hiddenFields: [], fieldOrder: manualOrder, fieldColors: {} }],
      ]),
    });
  }

  it("always asks; with no custom order it says nothing will be replaced", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([
        ["shop.Order", { hiddenFields: ["status"], fieldOrder: null, fieldColors: { id: "#ef4444" } }],
      ]),
    });
    const { getByRole } = renderToolbar();

    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    const dialog = getByRole("dialog", { name: "Sort all tables by type" });
    expect(dialog.textContent).toContain("No table has a custom field order yet");
    expect(dialog.textContent).not.toContain("already has");
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toBeNull();

    fireEvent.click(getByRole("button", { name: "Sort all tables" }));
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual([
      "id", "customer", "status", "created_at",
    ]);
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.hiddenFields).toEqual(["status"]);
  });

  it("asks first, naming the tables whose order would be replaced, and changes nothing yet", () => {
    withManualOrderOnOrder();
    const { getByRole } = renderToolbar();

    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    const dialog = getByRole("dialog", { name: "Sort all tables by type" });
    expect(dialog.textContent).toContain("1 table already has a custom field order");
    expect(dialog.textContent).toContain("Order");
    expect(dialog.textContent).not.toContain("Tag");
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual(manualOrder);
    expect(useSchemaStore.getState().fieldEdits.has("shop.Tag")).toBe(false);
  });

  it("Cancel keeps every existing order and closes the dialog", () => {
    withManualOrderOnOrder();
    const { getByRole, queryByRole } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    fireEvent.click(getByRole("button", { name: "Cancel" }));

    expect(queryByRole("dialog")).toBeNull();
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual(manualOrder);
    expect(useSchemaStore.getState().fieldEdits.has("shop.Tag")).toBe(false);
  });

  it("Escape closes the dialog without sorting", () => {
    withManualOrderOnOrder();
    const { getByRole, queryByRole } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    fireEvent.keyDown(window, { key: "Escape" });

    expect(queryByRole("dialog")).toBeNull();
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual(manualOrder);
  });

  it("confirming sorts every table and closes the dialog", () => {
    withManualOrderOnOrder();
    const { getByRole, queryByRole } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    fireEvent.click(getByRole("button", { name: "Sort all tables" }));

    expect(queryByRole("dialog")).toBeNull();
    const edits = useSchemaStore.getState().fieldEdits;
    expect(edits.get("shop.Order")?.fieldOrder).toEqual(["id", "customer", "status", "created_at"]);
    expect(edits.get("shop.Tag")?.fieldOrder).toEqual(["name", "code"]);
    expect(naturalTag).toEqual(["code", "name"]);
  });

  it("pluralises the count when several tables have a custom order", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([
        ["shop.Order", { hiddenFields: [], fieldOrder: manualOrder, fieldColors: {} }],
        ["shop.Tag", { hiddenFields: [], fieldOrder: ["name", "code"], fieldColors: {} }],
      ]),
    });
    const { getByRole } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

    expect(getByRole("dialog").textContent).toContain("2 tables already have a custom field order");
  });
});

describe("Toolbar sort all: double-click must not dismiss the confirmation", () => {
  beforeEach(() => {
    useSchemaStore.setState({
      fieldEdits: new Map([
        ["shop.Order", { hiddenFields: [], fieldOrder: ["status", "id", "customer", "created_at"], fieldColors: {} }],
      ]),
    });
  });

  // The first click of a double-click opens the dialog; the second lands on the
  // backdrop that now covers the toolbar. Browsers mark it with detail = 2.
  it("keeps the dialog open when the second click of a double-click hits the backdrop", () => {
    const { getByRole, queryByRole, baseElement } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }), { detail: 1 });
    expect(queryByRole("dialog")).not.toBeNull();

    const backdrop = baseElement.querySelector("[data-dialog-backdrop]") as HTMLElement;
    fireEvent.click(backdrop, { detail: 2 });

    expect(queryByRole("dialog")).not.toBeNull();
    expect(useSchemaStore.getState().fieldEdits.get("shop.Order")?.fieldOrder).toEqual([
      "status", "id", "customer", "created_at",
    ]);
  });

  it("still cancels on a deliberate single click on the backdrop", () => {
    const { getByRole, queryByRole, baseElement } = renderToolbar();
    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }), { detail: 1 });

    const backdrop = baseElement.querySelector("[data-dialog-backdrop]") as HTMLElement;
    fireEvent.click(backdrop, { detail: 1 });

    expect(queryByRole("dialog")).toBeNull();
  });
});

describe("Annotate section (issue #100)", () => {
  it("Text button adds a note at the viewport centre and opens it for editing", () => {
    const { getByLabelText } = renderToolbar();
    fireEvent.click(getByLabelText("Add text block"));
    const blocks = [...useSchemaStore.getState().textBlocks];
    expect(blocks).toHaveLength(1);
    const [id, block] = blocks[0];
    expect(block).toMatchObject({ style: "note", text: "", width: 200, height: 72 });
    expect(usePhysicsStore.getState().editingTextBlockId).toBe(id);
  });

  it("Arrow button toggles draw-arrow mode and shows as active while on", () => {
    const { getByLabelText } = renderToolbar();
    const btn = getByLabelText("Draw arrow");
    fireEvent.click(btn);
    expect(usePhysicsStore.getState().annotationTool).toBe("arrow");
    expect(btn.className).toContain("bg-blue-600");
    fireEvent.click(btn);
    expect(usePhysicsStore.getState().annotationTool).toBeNull();
  });

  it("adding a text block leaves draw-arrow mode", () => {
    const { getByLabelText } = renderToolbar();
    fireEvent.click(getByLabelText("Draw arrow"));
    fireEvent.click(getByLabelText("Add text block"));
    expect(usePhysicsStore.getState().annotationTool).toBeNull();
  });
});
