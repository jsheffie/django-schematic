// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import Toolbar from "./Toolbar";
import { useSchemaStore } from "../store/schemaStore";
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
  useSchemaStore.setState({ fieldEdits: new Map(), visibleNodeIds: new Set(["shop.Tag"]) });
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
  it("sorts every table in the schema, visible or not", () => {
    const { getByRole } = renderToolbar();

    fireEvent.click(getByRole("button", { name: "Sort all tables by type" }));

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
