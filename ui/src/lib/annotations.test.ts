import { describe, it, expect } from "vitest";
import {
  ANCHOR_SIZE,
  anchorNodeId,
  arrowEndNodeId,
  borderPoint,
  defaultTextBlock,
  isArrowVisible,
  isAttached,
  isTextBlockId,
  newArrowId,
  newTextBlockId,
  resolveArrowGeometry,
} from "./annotations";

describe("ids", () => {
  it("prefixes ids and recognises text block ids", () => {
    expect(newTextBlockId()).toMatch(/^tb_[0-9a-z]+$/);
    expect(newArrowId()).toMatch(/^ar_[0-9a-z]+$/);
    expect(newTextBlockId()).not.toBe(newTextBlockId());
    expect(isTextBlockId("tb_abc")).toBe(true);
    expect(isTextBlockId("library.Book")).toBe(false);
  });

  it("names anchor nodes and resolves endpoint node ids", () => {
    expect(anchorNodeId("ar_1", "from")).toBe("anchor:ar_1:from");
    expect(arrowEndNodeId("ar_1", "to", { nodeId: "library.Book" })).toBe("library.Book");
    expect(arrowEndNodeId("ar_1", "to", { x: 1, y: 2 })).toBe("anchor:ar_1:to");
    expect(isAttached({ nodeId: "x" })).toBe(true);
    expect(isAttached({ x: 0, y: 0 })).toBe(false);
  });

  it("exposes the anchor size used to centre anchor nodes", () => {
    expect(ANCHOR_SIZE).toBe(12);
  });
});

describe("isArrowVisible", () => {
  const visible = new Set(["library.Book"]);
  const blocks = new Set(["tb_1"]);

  it("is visible when every attached end is a visible model or a known text block", () => {
    expect(
      isArrowVisible({ from: { nodeId: "tb_1" }, to: { nodeId: "library.Book" } }, visible, blocks),
    ).toBe(true);
    expect(isArrowVisible({ from: { x: 0, y: 0 }, to: { x: 5, y: 5 } }, visible, blocks)).toBe(true);
  });

  it("hides arrows attached to a hidden model, an unknown model or a missing text block", () => {
    expect(
      isArrowVisible({ from: { nodeId: "tb_1" }, to: { nodeId: "library.Author" } }, visible, blocks),
    ).toBe(false);
    expect(isArrowVisible({ from: { nodeId: "tb_404" }, to: { x: 0, y: 0 } }, visible, blocks)).toBe(false);
  });
});

describe("defaultTextBlock", () => {
  it("centres a note of the default size on the point", () => {
    const b = defaultTextBlock("note", { x: 100, y: 50 });
    expect(b).toMatchObject({ style: "note", text: "", width: 200, height: 72 });
    expect(b.x + b.width / 2).toBe(100);
    expect(b.y + b.height / 2).toBe(50);
  });

  it("titles are wider and shorter", () => {
    expect(defaultTextBlock("title", { x: 0, y: 0 })).toMatchObject({ width: 320, height: 44 });
  });
});

describe("borderPoint", () => {
  const rect = { x: 0, y: 0, width: 100, height: 50 };

  it("hits the right wall for a point to the right", () => {
    expect(borderPoint(rect, { x: 300, y: 25 })).toEqual({ x: 100, y: 25 });
  });

  it("hits the bottom wall for a point below", () => {
    expect(borderPoint(rect, { x: 50, y: 500 })).toEqual({ x: 50, y: 50 });
  });

  it("returns the centre for a coincident point", () => {
    expect(borderPoint(rect, { x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
  });
});

describe("resolveArrowGeometry", () => {
  const from = { kind: "node" as const, rect: { x: 0, y: 0, width: 100, height: 50 } };
  const to = { kind: "point" as const, point: { x: 300, y: 25 } };

  it("snaps an attached end to the border facing the other end; straight at zero offset", () => {
    const g = resolveArrowGeometry({ from, to, style: "bezier" });
    expect(g.source).toEqual({ x: 100, y: 25 });
    expect(g.target).toEqual({ x: 300, y: 25 });
    expect(g.mid).toEqual({ x: 200, y: 25 });
    expect(g.path).toBe("M100,25 Q200,25 300,25");
  });

  it("bows the bezier so its midpoint lands exactly on the offset grip", () => {
    const g = resolveArrowGeometry({ from, to, style: "bezier", offset: { x: 0, y: -40 } });
    expect(g.mid.y).toBeCloseTo((g.source.y + g.target.y) / 2 - 40);
    // Quadratic through T at t = 0.5: B(0.5) = 0.25 S + 0.5 C + 0.25 E must equal mid.
    const m = /Q([\d.-]+),([\d.-]+)/.exec(g.path)!;
    const cx = Number(m[1]);
    const cy = Number(m[2]);
    expect(0.25 * g.source.x + 0.5 * cx + 0.25 * g.target.x).toBeCloseTo(g.mid.x, 6);
    expect(0.25 * g.source.y + 0.5 * cy + 0.25 * g.target.y).toBeCloseTo(g.mid.y, 6);
  });

  it("aims an attached end at the bow point, not the other end, when bent", () => {
    const g = resolveArrowGeometry({ from, to, style: "bezier", offset: { x: 0, y: -400 } });
    expect(g.source.y).toBe(0); // leaves through the top wall
  });

  it("floating is a straight line between the resolved ends", () => {
    const g = resolveArrowGeometry({ from, to, style: "floating" });
    expect(g.path).toBe("M100,25 L300,25");
    expect(g.mid).toEqual({ x: 200, y: 25 });
  });

  it("step produces a smooth-step path starting and ending on the resolved ends", () => {
    const g = resolveArrowGeometry({ from, to, style: "step" });
    expect(g.path.startsWith("M100")).toBe(true);
    expect(g.path.endsWith("300 25") || g.path.endsWith("300,25")).toBe(true);
  });

  it("two free points keep their coordinates", () => {
    const g = resolveArrowGeometry({
      from: { kind: "point", point: { x: 0, y: 0 } },
      to: { kind: "point", point: { x: 10, y: 0 } },
      style: "floating",
    });
    expect(g.source).toEqual({ x: 0, y: 0 });
    expect(g.target).toEqual({ x: 10, y: 0 });
  });
});
