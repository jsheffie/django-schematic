/**
 * Geometry for the "smart" bezier edge.
 *
 * Every model-node row renders an invisible <AnchorHandle id> (header: "hdr",
 * field rows: "f:<name>"). React Flow measures those handles into
 * node.internals.handleBounds, which lets the edge anchor each end to the exact
 * field row. Only the handle's y is used; x is always the node's left or right
 * border so the line ends exactly on the node outline.
 *
 * All functions here are pure; the edge component supplies InternalNodes from
 * useInternalNode() and the per-edge offset from schemaStore.
 *
 * Far-border re-attach: dragging the grip past a node's far border re-attaches
 * that end to the near side (see smartEdgeGeometry / flipSideTowardPull).
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
// `minOffset` guards the same-side case: controlOffset(0) is 0 (RF's formula
// returns 0 at distance 0), so without a floor the two control points sit
// exactly on the anchors and the intended U-curve collapses into a straight
// segment. controlOffset is non-negative for every input, so passing
// minOffset=0 (the opposite-side callsites) is a no-op and leaves that math
// byte-identical.
function controlX(x: number, otherX: number, side: Side, minOffset = 0): number {
  const offset = Math.max(controlOffset(side === "r" ? otherX - x : x - otherX), minOffset);
  return side === "r" ? x + offset : x - offset;
}

// Same-side (U-curve) tuning, both in flow units:
//   MIN_SAME_SIDE_BULGE: floor on the horizontal control-point offset so a
//     same-x pair (e.g. a vertical chain under dagre-tb, where equal node
//     widths give identical left borders) still bulges instead of degenerating
//     into a straight line.
//   SELF_LOOP_HALF_HEIGHT: when both anchors are (near-)identical — a
//     self-referential FK on a collapsed node, where source and target are
//     the same header point — the bulge alone still draws a zero-length path
//     (both ends coincide), so the control points are also spread vertically
//     to trace a visible loop.
const MIN_SAME_SIDE_BULGE = 40;
const SELF_LOOP_HALF_HEIGHT = 25;

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
  const sameSide = sourceSide === targetSide;
  const minOffset = sameSide ? MIN_SAME_SIDE_BULGE : 0;

  const c1 = { x: controlX(source.x, target.x, sourceSide, minOffset) + shiftX, y: source.y + shiftY };
  const c2 = { x: controlX(target.x, source.x, targetSide, minOffset) + shiftX, y: target.y + shiftY };

  // Collapsed self-edge: same side AND (near-)identical anchors. The bulge
  // above still produces a zero-length path since both endpoints coincide, so
  // spread the controls vertically into a visible loop. Checked on the raw
  // anchors (before shiftY) so the offset is still applied uniformly below.
  if (sameSide && Math.abs(source.y - target.y) < 1 && Math.abs(source.x - target.x) < 1) {
    c1.y = source.y - SELF_LOOP_HALF_HEIGHT + shiftY;
    c2.y = target.y + SELF_LOOP_HALF_HEIGHT + shiftY;
  }

  const mid = {
    x: (source.x + 3 * c1.x + 3 * c2.x + target.x) / 8,
    y: (source.y + 3 * c1.y + 3 * c2.y + target.y) / 8,
  };
  const path = `M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`;
  return { path, mid };
}

// --- Grip-driven side switching ---------------------------------------------
//
// The grip only bends the curve; it never used to change which side an edge
// exits from. Now, when the grip is dragged far enough past a node's far
// border, that end re-attaches to the near side instead. The pull point P is
// computed from the *base* sides (chooseSides's natural pick, zero offset) —
// never from the current/flipped sides — so there is no sides -> mid -> P ->
// sides feedback loop. Strict inequalities and "past the far border" (not the
// near one) make the node's own width a dead zone, so a small drag can't
// flicker the side back and forth.

/** Far-border re-attach. Strict inequalities; the node's own width is the dead zone. */
export function flipSideTowardPull(base: Side, rect: Rect, pullX: number): Side {
  if (base === "l" && pullX > rect.x + rect.width) return "r";
  if (base === "r" && pullX < rect.x) return "l";
  return base;
}

/** Same as smartBezierPath but the curve's B(0.5) lands exactly on `through`. */
export function smartBezierPathThrough(
  { through, ...args }: Omit<SmartPathArgs, "offset"> & { through: Point },
): { path: string; mid: Point } {
  const natural = smartBezierPath(args);
  return smartBezierPath({
    ...args,
    offset: { x: through.x - natural.mid.x, y: through.y - natural.mid.y },
  });
}

export interface SmartEdgeGeometryArgs {
  sourceNode: InternalNode;
  targetNode: InternalNode;
  sourceField: string | null;
  targetField: string | null;
  /** User midpoint offset relative to the *base* natural midpoint. */
  offset?: Point;
}

export interface SmartEdgeGeometry {
  sides: { source: Side; target: Side };
  source: Point; // final anchor
  target: Point; // final anchor
  path: string;
  mid: Point; // === baseMid + offset (grip/label position)
}

/**
 * Orchestrates side selection, anchoring, and path generation for the smart
 * bezier edge, including grip-driven side re-attachment. With `offset`
 * undefined this reproduces today's output exactly (no flip logic runs).
 */
export function smartEdgeGeometry({
  sourceNode,
  targetNode,
  sourceField,
  targetField,
  offset,
}: SmartEdgeGeometryArgs): SmartEdgeGeometry {
  const srcRect = nodeRect(sourceNode);
  const tgtRect = nodeRect(targetNode);
  const base = chooseSides(srcRect, tgtRect);
  const s0 = resolveAnchor(sourceNode, sourceField, base.source);
  const t0 = resolveAnchor(targetNode, targetField, base.target);

  if (offset === undefined) {
    const { path, mid } = smartBezierPath({
      source: s0, target: t0, sourceSide: base.source, targetSide: base.target,
    });
    return { sides: base, source: s0, target: t0, path, mid };
  }

  const baseMid = smartBezierPath({
    source: s0, target: t0, sourceSide: base.source, targetSide: base.target,
  }).mid;
  const P = { x: baseMid.x + offset.x, y: baseMid.y + offset.y };

  const sides = {
    source: flipSideTowardPull(base.source, srcRect, P.x),
    target: flipSideTowardPull(base.target, tgtRect, P.x),
  };

  // y never depends on side; x moves to the other border of the same rect
  // when the side changed, so no need to re-read handleBounds.
  const source =
    sides.source === base.source ? s0 : { x: sides.source === "l" ? srcRect.x : srcRect.x + srcRect.width, y: s0.y };
  const target =
    sides.target === base.target ? t0 : { x: sides.target === "l" ? tgtRect.x : tgtRect.x + tgtRect.width, y: t0.y };

  const { path, mid } = smartBezierPathThrough({
    source, target, sourceSide: sides.source, targetSide: sides.target, through: P,
  });
  return { sides, source, target, path, mid };
}
