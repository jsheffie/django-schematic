import { describe, expect, it } from "vitest";
import {
  basenameFromFile,
  defaultExportBasename,
  mostRelatedModelSlug,
  slugify,
  titleSlug,
} from "./exportFilename";
import type { TextBlock } from "./annotations";
import type { EdgeInfo, NodeInfo } from "./types";

const node = (id: string): NodeInfo => ({
  id,
  name: id.split(".")[1],
  app_label: id.split(".")[0],
  app_name: id.split(".")[0],
  tags: [],
  fields: [],
});

const edge = (source: string, target: string, relation_type: EdgeInfo["relation_type"] = "fk"): EdgeInfo => ({
  source,
  target,
  relation_type,
  field_name: "f",
  related_name: null,
  target_field: null,
});

const block = (text: string, x: number, y: number, style: TextBlock["style"] = "title"): TextBlock => ({
  x,
  y,
  width: 320,
  height: 44,
  text,
  style,
});

const blocks = (...list: TextBlock[]) => new Map(list.map((b, i) => [`tb_${i}`, b]));

describe("basenameFromFile", () => {
  it("strips the extension", () => {
    expect(basenameFromFile("orders.png")).toBe("orders");
    expect(basenameFromFile("orders.v2.json")).toBe("orders.v2");
  });

  it("strips the browser's duplicate-download suffix", () => {
    expect(basenameFromFile("orders (2).png")).toBe("orders");
    expect(basenameFromFile("orders(1).png")).toBe("orders");
  });

  it("keeps names without an extension and returns null for nothing usable", () => {
    expect(basenameFromFile("orders")).toBe("orders");
    expect(basenameFromFile(".png")).toBeNull();
    expect(basenameFromFile("  ")).toBeNull();
  });
});

describe("slugify", () => {
  it("lowercases and joins words with single dashes", () => {
    expect(slugify("Order Pipeline (v2)")).toBe("order-pipeline-v2");
    expect(slugify("  --Hello__World--  ")).toBe("hello-world");
  });

  it("folds accents", () => {
    expect(slugify("Café Menü")).toBe("cafe-menu");
  });

  it("returns an empty string when nothing alphanumeric remains", () => {
    expect(slugify("???")).toBe("");
    expect(slugify("注文")).toBe("");
  });

  it("caps the length without leaving a trailing dash", () => {
    const slug = slugify("a".repeat(10) + " " + "b".repeat(80));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(slugify("abcde fghij", 6)).toBe("abcde");
  });
});

describe("titleSlug", () => {
  it("slugs the first non-empty line of a title block", () => {
    expect(titleSlug(blocks(block("\n  Order Pipeline\nsubtitle", 0, 0)))).toBe("order-pipeline");
  });

  it("ignores note blocks and empty titles", () => {
    expect(titleSlug(blocks(block("A note", 0, 0, "note"), block("   ", 0, 0)))).toBeNull();
  });

  it("prefers the topmost title, then the leftmost", () => {
    expect(titleSlug(blocks(block("Lower", 0, 100), block("Upper", 50, 0), block("Left", -10, 0)))).toBe("left");
  });

  it("skips a title that slugs to nothing", () => {
    expect(titleSlug(blocks(block("???", 0, 0)))).toBeNull();
    expect(titleSlug(blocks(block("???", 0, 0), block("Real title", 0, 100)))).toBe("real-title");
  });
});

describe("mostRelatedModelSlug", () => {
  const nodes = ["shop.Order", "shop.Customer", "shop.Tag", "shop.Item"].map(node);

  it("picks the visible model with the most edges between visible models", () => {
    const edges = [
      edge("shop.Order", "shop.Customer"),
      edge("shop.Item", "shop.Order"),
      edge("shop.Order", "shop.Tag", "m2m"),
    ];
    expect(mostRelatedModelSlug(nodes, edges, new Set(nodes.map((n) => n.id)))).toBe("order");
  });

  it("only counts edges whose ends are both visible", () => {
    const edges = [
      edge("shop.Customer", "shop.Order"),
      edge("shop.Customer", "shop.Tag"),
      edge("shop.Customer", "shop.Item"),
      edge("shop.Order", "shop.Item"),
    ];
    expect(mostRelatedModelSlug(nodes, edges, new Set(nodes.map((n) => n.id)))).toBe("customer");
    // With Customer hidden its edges no longer count: Item and Order tie on 1, Item wins by name.
    expect(mostRelatedModelSlug(nodes, edges, new Set(["shop.Order", "shop.Item", "shop.Tag"]))).toBe("item");
  });

  it("counts subclass and proxy edges, and a self-relation once", () => {
    const edges = [
      edge("shop.Tag", "shop.Tag"),
      edge("shop.Item", "shop.Order", "subclass"),
      edge("shop.Item", "shop.Customer", "proxy"),
    ];
    expect(mostRelatedModelSlug(nodes, edges, new Set(nodes.map((n) => n.id)))).toBe("item");
  });

  it("breaks ties by model name", () => {
    expect(mostRelatedModelSlug(nodes, [], new Set(["shop.Tag", "shop.Order"]))).toBe("order");
  });

  it("returns null when no model is visible", () => {
    expect(mostRelatedModelSlug(nodes, [], new Set())).toBeNull();
  });
});

describe("defaultExportBasename", () => {
  const nodes = ["shop.Order", "shop.Customer"].map(node);
  const edges = [edge("shop.Order", "shop.Customer")];
  const visibleIds = new Set(["shop.Order", "shop.Customer"]);
  const base = { documentName: null, textBlocks: new Map<string, TextBlock>(), nodes, edges, visibleIds };

  it("uses the document name first", () => {
    expect(
      defaultExportBasename({ ...base, documentName: "orders", textBlocks: blocks(block("Title", 0, 0)) }),
    ).toBe("orders");
  });

  it("then the title block", () => {
    expect(defaultExportBasename({ ...base, textBlocks: blocks(block("My Shop", 0, 0)) })).toBe("my-shop");
  });

  it("then the most related model", () => {
    expect(defaultExportBasename(base)).toBe("customer");
  });

  it("falls back to schematic", () => {
    expect(defaultExportBasename({ ...base, visibleIds: new Set() })).toBe("schematic");
  });
});
