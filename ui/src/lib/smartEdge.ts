/**
 * Geometry for the "smart" bezier edge (issue #96).
 *
 * Every model-node row renders an invisible <AnchorHandle id> (header: "hdr",
 * field rows: "f:<name>"). React Flow measures those handles into
 * node.internals.handleBounds, which lets the edge anchor each end to the exact
 * field row. Only the handle's y is used; x is always the node's left or right
 * border so the line ends exactly on the node outline.
 *
 * All functions here are pure; the edge component supplies InternalNodes from
 * useInternalNode() and the per-edge offset from schemaStore.
 */
import type { InternalNode } from "@xyflow/react";

export type Side = "l" | "r";
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export const HEADER_HANDLE_ID = "hdr";
export const fieldHandleId = (name: string): string => `f:${name}`;

// Same fallbacks as floatingEdge.ts for not-yet-measured nodes.
const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 60;

/** Absolute bounding rect of a node (falls back to a default size before measurement). */
export function nodeRect(node: InternalNode): Rect {
  const pos = node.internals.positionAbsolute;
  return {
    x: pos.x,
    y: pos.y,
    width: node.measured?.width ?? DEFAULT_WIDTH,
    height: node.measured?.height ?? DEFAULT_HEIGHT,
  };
}

/**
 * Which side each end exits from. Target entirely right of source: S-curve
 * right-to-left; entirely left: left-to-right; any horizontal overlap: both
 * left (a U-curve). Pure function of positions, so it flips live while dragging.
 */
export function chooseSides(src: Rect, tgt: Rect): { source: Side; target: Side } {
  if (tgt.x >= src.x + src.width) return { source: "r", target: "l" };
  if (tgt.x + tgt.width <= src.x) return { source: "l", target: "r" };
  return { source: "l", target: "l" };
}

/** Absolute y of the vertical centre of handle `handleId`, or null if absent/unmeasured. */
export function handleY(node: InternalNode, handleId: string): number | null {
  const h = node.internals.handleBounds?.source?.find((b) => b.id === handleId);
  if (!h) return null;
  return node.internals.positionAbsolute.y + h.y + h.height / 2;
}

/**
 * Anchor point for one end of an edge.
 *   x: the node's left or right border, by `side`.
 *   y: the field's row, else the header row, else the node's vertical centre.
 * Collapsed nodes and hidden fields simply have no field handle, so they fall
 * through to the header automatically.
 */
export function resolveAnchor(node: InternalNode, fieldName: string | null, side: Side): Point {
  const rect = nodeRect(node);
  const x = side === "l" ? rect.x : rect.x + rect.width;
  const y =
    (fieldName ? handleY(node, fieldHandleId(fieldName)) : null) ??
    handleY(node, HEADER_HANDLE_ID) ??
    rect.y + rect.height / 2;
  return { x, y };
}

// --- Cubic path -------------------------------------------------------------

// Mirrors @xyflow/system's getBezierPath (curvature 0.25).
const CURVATURE = 0.25;
function controlOffset(distance: number): number {
  return distance >= 0 ? 0.5 * distance : CURVATURE * 25 * Math.sqrt(-distance);
}
function controlX(x: number, otherX: number, side: Side): number {
  return side === "r" ? x + controlOffset(otherX - x) : x - controlOffset(x - otherX);
}

// Shifting both control points by d moves the t=0.5 point by 0.75*d
// (B(0.5) = (P0 + 3C1 + 3C2 + P3) / 8), so divide the desired midpoint offset
// by this ratio to make the grip follow the cursor 1:1.
const MID_SHIFT_RATIO = 0.75;

export interface SmartPathArgs {
  source: Point;
  target: Point;
  sourceSide: Side;
  targetSide: Side;
  /** User midpoint offset relative to the natural midpoint. */
  offset?: Point;
}

export function smartBezierPath({
  source,
  target,
  sourceSide,
  targetSide,
  offset = { x: 0, y: 0 },
}: SmartPathArgs): { path: string; mid: Point } {
  const shiftX = offset.x / MID_SHIFT_RATIO;
  const shiftY = offset.y / MID_SHIFT_RATIO;
  const c1 = { x: controlX(source.x, target.x, sourceSide) + shiftX, y: source.y + shiftY };
  const c2 = { x: controlX(target.x, source.x, targetSide) + shiftX, y: target.y + shiftY };
  const mid = {
    x: (source.x + 3 * c1.x + 3 * c2.x + target.x) / 8,
    y: (source.y + 3 * c1.y + 3 * c2.y + target.y) / 8,
  };
  const path = `M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`;
  return { path, mid };
}
