/**
 * Canvas annotations: text blocks and user-drawn arrows not backed by a model.
 * Pure types, ids, visibility rules and arrow geometry; schemaStore holds the
 * data and SchemaCanvas renders it (`text` nodes, `anchor` nodes for free
 * arrow ends, `arrow` edges).
 */
import { Position, getSmoothStepPath } from "@xyflow/react";
import type { EdgeStyle } from "../store/physicsStore";

export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }

export type TextBlockStyle = "note" | "title";

export interface TextBlock {
  x: number;
  y: number;
  width: number;
  /** Minimum height: the card grows with its text, a manual resize sets the floor. */
  height: number;
  text: string;
  style: TextBlockStyle;
  /** Swatch hex from FIELD_COLOR_SWATCHES; undefined = the style's default. */
  color?: string;
}

/** An attached end follows a node (model id or text block id); a free end is a canvas point. */
export type ArrowEndpoint = { nodeId: string } | { x: number; y: number };

export interface Arrow {
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  label?: string;
  startHead?: boolean;
  /** Bezier midpoint offset relative to the natural midpoint (same idea as edgeOffsets). */
  offset?: Point;
}

/** The shape stored in ViewConfig v5. */
export interface Annotations {
  textBlocks: Record<string, TextBlock>;
  arrows: Record<string, Arrow>;
}

// --- Ids ----------------------------------------------------------------------

const TEXT_BLOCK_PREFIX = "tb_";
const ARROW_PREFIX = "ar_";

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const newTextBlockId = (): string => TEXT_BLOCK_PREFIX + randomId();
export const newArrowId = (): string => ARROW_PREFIX + randomId();
export const isTextBlockId = (id: string): boolean => id.startsWith(TEXT_BLOCK_PREFIX);

export const isAttached = (ep: ArrowEndpoint): ep is { nodeId: string } => "nodeId" in ep;

export type ArrowEnd = "from" | "to";

/** Side of the invisible square node that stands in for a free arrow end. */
export const ANCHOR_SIZE = 12;

export const anchorNodeId = (arrowId: string, end: ArrowEnd): string => `anchor:${arrowId}:${end}`;

/** The React Flow node id an arrow end connects to: the node itself, or the end's anchor. */
export const arrowEndNodeId = (arrowId: string, end: ArrowEnd, ep: ArrowEndpoint): string =>
  isAttached(ep) ? ep.nodeId : anchorNodeId(arrowId, end);

/** Visible while every attached end is a visible model or an existing text block. */
export function isArrowVisible(
  arrow: Arrow,
  visibleModelIds: ReadonlySet<string>,
  textBlockIds: ReadonlySet<string>,
): boolean {
  const ok = (ep: ArrowEndpoint): boolean =>
    !isAttached(ep) || visibleModelIds.has(ep.nodeId) || textBlockIds.has(ep.nodeId);
  return ok(arrow.from) && ok(arrow.to);
}

// --- Text blocks ------------------------------------------------------------

const DEFAULT_SIZE: Record<TextBlockStyle, { width: number; height: number }> = {
  note: { width: 200, height: 72 },
  title: { width: 320, height: 44 },
};

/** A new, empty block of the style's default size centred on `center`. */
export function defaultTextBlock(style: TextBlockStyle, center: Point): TextBlock {
  const { width, height } = DEFAULT_SIZE[style];
  return { x: center.x - width / 2, y: center.y - height / 2, width, height, text: "", style };
}

// --- Geometry ---------------------------------------------------------------

export const rectCenter = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/**
 * Point on `rect`'s border along the ray from its centre toward `toward`
 * (same ray-rectangle math as floatingEdge.ts, on a plain Rect).
 */
export function borderPoint(rect: Rect, toward: Point): Point {
  const c = rectCenter(rect);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return c;
  const tx = dx !== 0 ? Math.abs(rect.width / 2 / dx) : Infinity;
  const ty = dy !== 0 ? Math.abs(rect.height / 2 / dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: c.x + t * dx, y: c.y + t * dy };
}

/** Which wall of `rect` the border point `p` sits on (for the step path's exit direction). */
function wallOf(rect: Rect, p: Point): Position {
  const eps = 0.5;
  if (Math.abs(p.x - rect.x) < eps) return Position.Left;
  if (Math.abs(p.x - (rect.x + rect.width)) < eps) return Position.Right;
  if (Math.abs(p.y - rect.y) < eps) return Position.Top;
  return Position.Bottom;
}

/** Dominant direction from `from` to `to` (exit direction of a free end). */
function directionOf(from: Point, to: Point): Position {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? Position.Right : Position.Left;
  return dy >= 0 ? Position.Bottom : Position.Top;
}

/** One end of an arrow: a node to snap to, or an absolute point. */
export type EndGeometry = { kind: "node"; rect: Rect } | { kind: "point"; point: Point };

export interface ArrowGeometryArgs {
  from: EndGeometry;
  to: EndGeometry;
  style: EdgeStyle;
  offset?: Point;
}

export interface ArrowGeometry {
  source: Point;
  target: Point;
  path: string;
  /** Grip and label position. For bezier this is exactly the natural midpoint plus `offset`. */
  mid: Point;
}

const fmt = (p: Point): string => `${p.x},${p.y}`;
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Where an arrow starts and ends, and the path between them. Attached ends
 * snap to the node border toward the other end (or toward the bow point when
 * bent); the bow point comes from the reference centres so snapping never
 * feeds back into itself.
 *   bezier   quadratic, straight at zero offset; C = 2T - (S + E) / 2 puts B(0.5) on the grip
 *   step     React Flow smooth step, exiting through the snapped wall
 *   floating straight line
 */
export function resolveArrowGeometry({ from, to, style, offset }: ArrowGeometryArgs): ArrowGeometry {
  const fromRef = from.kind === "node" ? rectCenter(from.rect) : from.point;
  const toRef = to.kind === "node" ? rectCenter(to.rect) : to.point;
  const refMid = midpoint(fromRef, toRef);
  const bow = offset ? { x: refMid.x + offset.x, y: refMid.y + offset.y } : null;

  const source = from.kind === "node" ? borderPoint(from.rect, bow ?? toRef) : from.point;
  const target = to.kind === "node" ? borderPoint(to.rect, bow ?? fromRef) : to.point;
  const mid0 = midpoint(source, target);

  if (style === "bezier") {
    const through = offset ? { x: mid0.x + offset.x, y: mid0.y + offset.y } : mid0;
    const c = { x: 2 * through.x - mid0.x, y: 2 * through.y - mid0.y };
    return { source, target, mid: through, path: `M${fmt(source)} Q${fmt(c)} ${fmt(target)}` };
  }

  if (style === "step") {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX: source.x,
      sourceY: source.y,
      sourcePosition: from.kind === "node" ? wallOf(from.rect, source) : directionOf(source, target),
      targetX: target.x,
      targetY: target.y,
      targetPosition: to.kind === "node" ? wallOf(to.rect, target) : directionOf(target, source),
    });
    return { source, target, mid: { x: labelX, y: labelY }, path };
  }

  return { source, target, mid: mid0, path: `M${fmt(source)} L${fmt(target)}` };
}
