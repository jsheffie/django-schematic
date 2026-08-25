import { describe, it, expect } from "vitest";
import type { InternalNode } from "@xyflow/react";
import {
  HEADER_HANDLE_ID,
  fieldHandleId,
  nodeRect,
  chooseSides,
  handleY,
  resolveAnchor,
  smartBezierPath,
  flipSideTowardPull,
  smartBezierPathThrough,
  smartEdgeGeometry,
  type Rect,
} from "./smartEdge";

// Minimal InternalNode stand-in: only the properties smartEdge reads.
function makeNode(opts: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  handles?: Array<{ id: string; y: number; height?: number }>;
  measured?: boolean;
}): InternalNode {
  const measured = opts.measured ?? true;
  return {
    id: "n",
    position: { x: opts.x, y: opts.y },
    data: {},
    measured: measured ? { width: opts.width ?? 200, height: opts.height ?? 100 } : undefined,
    internals: {
      positionAbsolute: { x: opts.x, y: opts.y },
      z: 0,
      userNode: {},
      handleBounds: opts.handles
        ? {
            source: opts.handles.map((h) => ({
              id: h.id,
              nodeId: "n",
              type: "source",
              position: "left",
              x: 0,
              y: h.y,
              width: 1,
              height: h.height ?? 1,
            })),
            target: null,
          }
        : undefined,
    },
  } as unknown as InternalNode;
}

const rect = (x: number, width = 100): Rect => ({ x, y: 0, width, height: 50 });

describe("handle ids", () => {
  it("builds stable ids", () => {
    expect(HEADER_HANDLE_ID).toBe("hdr");
    expect(fieldHandleId("author")).toBe("f:author");
  });
});

describe("nodeRect", () => {
  it("uses absolute position and measured size", () => {
    expect(nodeRect(makeNode({ x: 10, y: 20, width: 300, height: 80 }))).toEqual({
      x: 10, y: 20, width: 300, height: 80,
    });
  });

  it("falls back to 160x60 when unmeasured", () => {
    expect(nodeRect(makeNode({ x: 0, y: 0, measured: false }))).toEqual({
      x: 0, y: 0, width: 160, height: 60,
    });
  });
});

describe("chooseSides", () => {
  it("target fully to the right: source exits right, target enters left", () => {
    expect(chooseSides(rect(0), rect(100))).toEqual({ source: "r", target: "l" });
    expect(chooseSides(rect(0), rect(500))).toEqual({ source: "r", target: "l" });
  });

  it("target fully to the left: source exits left, target enters right", () => {
    expect(chooseSides(rect(500), rect(0))).toEqual({ source: "l", target: "r" });
    expect(chooseSides(rect(100), rect(0))).toEqual({ source: "l", target: "r" });
  });

  it("horizontal overlap: both left (U-curve)", () => {
    expect(chooseSides(rect(0), rect(50))).toEqual({ source: "l", target: "l" });
    expect(chooseSides(rect(50), rect(0))).toEqual({ source: "l", target: "l" });
    expect(chooseSides(rect(0), rect(0))).toEqual({ source: "l", target: "l" });
  });
});

describe("handleY", () => {
  it("returns the absolute vertical centre of the handle", () => {
    const node = makeNode({ x: 10, y: 100, handles: [{ id: "f:author", y: 40, height: 6 }] });
    expect(handleY(node, "f:author")).toBe(143); // 100 + 40 + 3
  });

  it("returns null for a missing handle or an unmeasured node", () => {
    expect(handleY(makeNode({ x: 0, y: 0, handles: [] }), "f:author")).toBeNull();
    expect(handleY(makeNode({ x: 0, y: 0 }), "f:author")).toBeNull();
  });
});

describe("resolveAnchor", () => {
  const node = makeNode({
    x: 10, y: 100, width: 200, height: 120,
    handles: [{ id: "hdr", y: 10 }, { id: "f:author", y: 60 }],
  });

  it("x is the node's left or right border", () => {
    expect(resolveAnchor(node, "author", "l").x).toBe(10);
    expect(resolveAnchor(node, "author", "r").x).toBe(210);
  });

  it("y is the field row when its handle exists", () => {
    expect(resolveAnchor(node, "author", "l").y).toBe(160.5);
  });

  it("falls back to the header when the field handle is absent or fieldName is null", () => {
    expect(resolveAnchor(node, "missing", "l").y).toBe(110.5);
    expect(resolveAnchor(node, null, "l").y).toBe(110.5);
  });

  it("falls back to the node's vertical centre when nothing is measured", () => {
    const bare = makeNode({ x: 0, y: 0, width: 200, height: 120 });
    expect(resolveAnchor(bare, "author", "r")).toEqual({ x: 200, y: 60 });
  });
});

describe("smartBezierPath", () => {
  const S = { x: 0, y: 0 };
  const T = { x: 200, y: 100 };

  it("reproduces React Flow's control points for a right-to-left S-curve", () => {
    const { path, mid } = smartBezierPath({ source: S, target: T, sourceSide: "r", targetSide: "l" });
    // ctrl offset = 0.5 * 200 = 100 -> C1 (100,0), C2 (100,100)
    expect(path).toBe("M0,0 C100,0 100,100 200,100");
    expect(mid).toEqual({ x: 100, y: 50 }); // (0 + 300 + 300 + 200)/8, (0 + 0 + 300 + 100)/8
  });

  it("starts at source and ends at target regardless of offset", () => {
    const { path } = smartBezierPath({
      source: S, target: T, sourceSide: "r", targetSide: "l", offset: { x: 30, y: -40 },
    });
    expect(path.startsWith("M0,0 ")).toBe(true);
    expect(path.endsWith(" 200,100")).toBe(true);
  });

  it("moves the midpoint by exactly the offset", () => {
    const base = smartBezierPath({ source: S, target: T, sourceSide: "r", targetSide: "l" }).mid;
    const moved = smartBezierPath({
      source: S, target: T, sourceSide: "r", targetSide: "l", offset: { x: 30, y: -40 },
    }).mid;
    expect(moved.x - base.x).toBeCloseTo(30, 6);
    expect(moved.y - base.y).toBeCloseTo(-40, 6);
  });

  it("same-side (both left) curve bulges outward to the left", () => {
    const { path } = smartBezierPath({
      source: { x: 0, y: 0 }, target: { x: 50, y: 100 }, sourceSide: "l", targetSide: "l",
    });
    const c1x = Number(/ C(-?[\d.]+),/.exec(path)![1]);
    expect(c1x).toBeLessThan(0); // -(0.25 * 25 * sqrt(50))
  });

  it("same x, both-left: enforces the minimum bulge instead of collapsing to a line", () => {
    const { path, mid } = smartBezierPath({
      source: { x: 100, y: 0 }, target: { x: 100, y: 200 }, sourceSide: "l", targetSide: "l",
    });
    // controlOffset(0) = 0, so both controls fall back to MIN_SAME_SIDE_BULGE (40).
    expect(path).toBe("M100,0 C60,0 60,200 100,200");
    expect(mid).toEqual({ x: 70, y: 100 }); // (100+180+180+100)/8, (0+0+600+200)/8
  });

  it("small x difference: still uses the minimum bulge when the natural offset is smaller", () => {
    const { path } = smartBezierPath({
      source: { x: 100, y: 0 }, target: { x: 110, y: 100 }, sourceSide: "l", targetSide: "l",
    });
    const [c1x, c2x] = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].slice(1, 3).map((m) => Number(m[1]));
    // c1: 100 - max(controlOffset(-10)≈19.76, 40) = 60
    // c2: 110 - max(controlOffset(10)=5, 40) = 70
    expect(c1x).toBeCloseTo(60, 6);
    expect(c2x).toBeCloseTo(70, 6);
  });

  it("identical anchors (collapsed self-edge): bulges left and spreads vertically into a visible loop", () => {
    const { path, mid } = smartBezierPath({
      source: { x: 100, y: 50 }, target: { x: 100, y: 50 }, sourceSide: "l", targetSide: "l",
    });
    expect(path).toBe("M100,50 C60,25 60,75 100,50");
    expect(mid).toEqual({ x: 70, y: 50 }); // (100+180+180+100)/8, (50+75+225+50)/8
  });

  it("same-side plus user offset still moves the midpoint by exactly the offset", () => {
    const base = smartBezierPath({
      source: { x: 100, y: 0 }, target: { x: 100, y: 200 }, sourceSide: "l", targetSide: "l",
    }).mid;
    const moved = smartBezierPath({
      source: { x: 100, y: 0 }, target: { x: 100, y: 200 }, sourceSide: "l", targetSide: "l",
      offset: { x: 30, y: -40 },
    }).mid;
    expect(moved.x - base.x).toBeCloseTo(30, 6);
    expect(moved.y - base.y).toBeCloseTo(-40, 6);
  });
});

describe("flipSideTowardPull", () => {
  const R: Rect = { x: 100, y: 0, width: 200, height: 50 }; // left 100, right 300

  it("base l: flips to r only when pulled strictly past the right border", () => {
    expect(flipSideTowardPull("l", R, 301)).toBe("r");
    expect(flipSideTowardPull("l", R, 300)).toBe("l"); // boundary: no flip
    expect(flipSideTowardPull("l", R, 200)).toBe("l");
    expect(flipSideTowardPull("l", R, 50)).toBe("l");
  });

  it("base r: flips to l only when pulled strictly past the left border", () => {
    expect(flipSideTowardPull("r", R, 99)).toBe("l");
    expect(flipSideTowardPull("r", R, 100)).toBe("r"); // boundary: no flip
    expect(flipSideTowardPull("r", R, 200)).toBe("r");
    expect(flipSideTowardPull("r", R, 350)).toBe("r");
  });
});

describe("smartBezierPathThrough", () => {
  it("shifts both control points so B(0.5) lands exactly on `through`", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 200, y: 100 };
    const through = { x: 130, y: 10 };
    const { path, mid } = smartBezierPathThrough({
      source, target, sourceSide: "r", targetSide: "l", through,
    });
    expect(path.startsWith("M0,0 ")).toBe(true);
    expect(path.endsWith(" 200,100")).toBe(true);
    expect(path).toBe("M0,0 C140,-53.333333333333336 140,46.666666666666664 200,100");
    expect(mid.x).toBeCloseTo(130, 6);
    expect(mid.y).toBeCloseTo(10, 6);
    // Equivalent to calling smartBezierPath directly with the derived offset.
    expect(
      smartBezierPath({ source, target, sourceSide: "r", targetSide: "l", offset: { x: 30, y: -40 } }),
    ).toEqual(smartBezierPath({ source, target, sourceSide: "r", targetSide: "l", offset: { x: 30, y: -40 } }));
  });

  it("self-loop: through-point still controls the loop's horizontal position", () => {
    const source = { x: 100, y: 50 };
    const target = { x: 100, y: 50 };
    const through = { x: 40, y: 50 };
    const { c1, c2, mid } = (() => {
      const r = smartBezierPathThrough({ source, target, sourceSide: "l", targetSide: "l", through });
      const m = /^M[\d.-]+,[\d.-]+ C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) /.exec(r.path)!;
      return {
        c1: { x: Number(m[1]), y: Number(m[2]) },
        c2: { x: Number(m[3]), y: Number(m[4]) },
        mid: r.mid,
      };
    })();
    expect(c1).toEqual({ x: 20, y: 25 });
    expect(c2).toEqual({ x: 20, y: 75 });
    expect(mid.x).toBeCloseTo(40, 6);
  });
});

describe("smartEdgeGeometry", () => {
  const src = makeNode({
    x: 0, y: 0, width: 200, height: 100,
    handles: [{ id: "hdr", y: 10 }, { id: "f:author", y: 60 }],
  });
  const tgt = makeNode({
    x: 400, y: 0, width: 200, height: 100,
    handles: [{ id: "hdr", y: 10 }, { id: "f:id", y: 30 }],
  });

  it("offset undefined: byte-identical to the old chooseSides/resolveAnchor/smartBezierPath pipeline", () => {
    const base = chooseSides(nodeRect(src), nodeRect(tgt));
    const s0 = resolveAnchor(src, "author", base.source);
    const t0 = resolveAnchor(tgt, "id", base.target);
    const old = smartBezierPath({ source: s0, target: t0, sourceSide: base.source, targetSide: base.target });

    const g = smartEdgeGeometry({ sourceNode: src, targetNode: tgt, sourceField: "author", targetField: "id" });

    expect(g.sides).toEqual(base);
    expect(g.source).toEqual(s0);
    expect(g.target).toEqual(t0);
    expect(g.path).toBe(old.path);
    expect(g.mid).toEqual(old.mid);
  });

  it("dead zone: pull point still inside the target node keeps base sides", () => {
    const g = smartEdgeGeometry({
      sourceNode: src, targetNode: tgt, sourceField: "author", targetField: "id",
      offset: { x: 150, y: 0 },
    });
    expect(g.sides).toEqual({ source: "r", target: "l" });
    expect(g.target.x).toBe(400);
    expect(g.mid.x).toBeCloseTo(450, 6);
    expect(g.mid.y).toBeCloseTo(45.5, 6);
  });

  it("target flips: pulled past the target's right border", () => {
    const g = smartEdgeGeometry({
      sourceNode: src, targetNode: tgt, sourceField: "author", targetField: "id",
      offset: { x: 350, y: 0 },
    });
    expect(g.sides).toEqual({ source: "r", target: "r" });
    expect(g.target).toEqual({ x: 600, y: 30.5 });
    expect(g.path.endsWith(" 600,30.5")).toBe(true);
    expect(g.mid.x).toBeCloseTo(650, 6);
    expect(g.mid.y).toBeCloseTo(45.5, 6);
  });

  it("source flips: pulled past the source's left border", () => {
    const g = smartEdgeGeometry({
      sourceNode: src, targetNode: tgt, sourceField: "author", targetField: "id",
      offset: { x: -350, y: 0 },
    });
    expect(g.sides).toEqual({ source: "l", target: "l" });
    expect(g.source.x).toBe(0);
    expect(g.path.startsWith("M0,60.5 ")).toBe(true);
    expect(g.mid.x).toBeCloseTo(-50, 6);
    expect(g.mid.y).toBeCloseTo(45.5, 6);
  });

  it("mixed from an overlap base: source flips first, then target also flips", () => {
    const overlapSrc = makeNode({ x: 0, y: 0, width: 200, height: 100, handles: [{ id: "hdr", y: 10 }] });
    const overlapTgt = makeNode({ x: 100, y: 300, width: 200, height: 100, handles: [{ id: "hdr", y: 10 }] });

    const g1 = smartEdgeGeometry({
      sourceNode: overlapSrc, targetNode: overlapTgt, sourceField: null, targetField: null,
      offset: { x: 250, y: 0 },
    });
    expect(g1.sides).toEqual({ source: "r", target: "l" });
    expect(g1.source.x).toBe(200);
    expect(g1.target.x).toBe(100);

    const g2 = smartEdgeGeometry({
      sourceNode: overlapSrc, targetNode: overlapTgt, sourceField: null, targetField: null,
      offset: { x: 300, y: 0 },
    });
    expect(g2.sides).toEqual({ source: "r", target: "r" });
  });

  it("self-edge: same node as both ends, pulled past the shared right border", () => {
    const node = makeNode({ x: 100, y: 0, width: 200, height: 100, handles: [{ id: "hdr", y: 10 }] });

    const flipped = smartEdgeGeometry({
      sourceNode: node, targetNode: node, sourceField: "author", targetField: null,
      offset: { x: 240, y: 0 },
    });
    expect(flipped.sides).toEqual({ source: "r", target: "r" });
    expect(flipped.source.x).toBe(300);
    expect(flipped.target.x).toBe(300);
    expect(flipped.path.startsWith("M300,10.5 ")).toBe(true);
    expect(flipped.mid.x).toBeCloseTo(310, 6);

    const notYet = smartEdgeGeometry({
      sourceNode: node, targetNode: node, sourceField: "author", targetField: null,
      offset: { x: 200, y: 0 },
    });
    expect(notYet.sides).toEqual({ source: "l", target: "l" });
  });
});
