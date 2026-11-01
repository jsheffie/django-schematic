// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { snapshotDbNames } from "./dbNames";
import { exportConfig, importConfig } from "./config";
import { extractTextChunk, injectTextChunk } from "./pngEmbed";
import type { FieldInfo, SchemaGraph } from "./types";

// Issue #135: an export carries the physical table and column names, so a tool
// that only has the PNG (no running Django) can map database writes back to
// nodes, field rows and m2m edges.

function field(name: string, column: string | null, field_type = "CharField"): FieldInfo {
  return {
    name,
    field_type,
    internal_type: field_type,
    is_relation: field_type.endsWith("Key") || field_type === "ManyToManyField",
    null: false,
    unique: false,
    primary_key: name === "id",
    column,
  };
}

// 1x1 transparent PNG.
const BLANK_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const SCHEMA: SchemaGraph = {
  nodes: [
    {
      id: "orders.Order",
      name: "Order",
      app_label: "orders",
      app_name: "acme.orders",
      tags: [],
      db_table: "acme_legacy_orders",
      fields: [
        field("id", "id", "BigAutoField"),
        field("quantity", "qty_ordered", "IntegerField"),
        field("company", "company_id", "ForeignKey"),
        field("tags", null, "ManyToManyField"),
      ],
    },
    { id: "orders.Tag", name: "Tag", app_label: "orders", app_name: "acme.orders", tags: [], db_table: "orders_tag", fields: [field("id", "id", "BigAutoField")] },
    { id: "orders.Base", name: "Base", app_label: "orders", app_name: "acme.orders", tags: ["abstract"], db_table: null, fields: [] },
  ],
  edges: [
    { source: "orders.Order", target: "orders.Tag", relation_type: "m2m", field_name: "tags", related_name: null, target_field: "id", through_db_table: "acme_orders_order_tags" },
  ],
  app_labels: ["orders"],
  app_names: { orders: "acme.orders" },
};

describe("snapshotDbNames", () => {
  it("records each model's table, its fields' columns and its m2m through tables", () => {
    expect(snapshotDbNames(SCHEMA)).toEqual({
      "orders.Order": {
        table: "acme_legacy_orders",
        columns: { id: "id", quantity: "qty_ordered", company: "company_id" },
        through: { tags: "acme_orders_order_tags" },
      },
      "orders.Tag": { table: "orders_tag", columns: { id: "id" }, through: {} },
      "orders.Base": { table: null, columns: {}, through: {} },
    });
  });
});

describe("db names in the export", () => {
  it("are written with the exact database strings (config v8)", () => {
    const config = JSON.parse(exportConfig(SCHEMA));
    expect(config.version).toBe(8);
    expect(config.dbNames["orders.Order"].table).toBe("acme_legacy_orders");
    expect(config.dbNames["orders.Order"].columns.quantity).toBe("qty_ordered");
  });

  it("round-trip through a PNG export unchanged", () => {
    // A fresh canvas image with no schematic chunk yet, as html-to-image returns it.
    const png = new Uint8Array(Buffer.from(BLANK_PNG, "base64"));
    const embedded = injectTextChunk(png, "schematic", exportConfig(SCHEMA));
    const dbNames = JSON.parse(extractTextChunk(embedded, "schematic")!).dbNames;
    expect(dbNames["orders.Order"]).toEqual({
      table: "acme_legacy_orders",
      columns: { id: "id", quantity: "qty_ordered", company: "company_id" },
      through: { tags: "acme_orders_order_tags" },
    });
  });

  it("a v8 config imports again", () => {
    expect(() => importConfig(exportConfig(SCHEMA), SCHEMA)).not.toThrow();
  });
});
