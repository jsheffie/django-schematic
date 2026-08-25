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
});
