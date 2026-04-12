/**
 * Geometry helpers for floating (center-to-center) edge routing.
 *
 * Instead of connecting from fixed handles, floating edges compute the point
 * on each node's bounding-box border that lies along the line between the two
 * node centers. This gives the vis-network-style behavior where dragging a node
 * to any side of another just changes the angle of the connecting line.
 */
import type { InternalNode } from "@xyflow/react";

/**
 * Returns the center point of a node in absolute canvas coordinates.
 */
export function getNodeCenter(node: InternalNode): { x: number; y: number } {
  const pos = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 160;
  const h = node.measured?.height ?? 60;
  return { x: pos.x + w / 2, y: pos.y + h / 2 };
}

/**
 * Returns the point on `node`'s rectangular border that lies along the line
 * from `node`'s center toward `targetCx, targetCy`.
 *
 * Uses parametric ray–rectangle intersection: find the smallest t > 0 such
 * that (cx + t·dx, cy + t·dy) touches a border edge.
 */
export function getNodeBorderPoint(
  node: InternalNode,
  targetCx: number,
  targetCy: number,
): { x: number; y: number } {
  const { x: cx, y: cy } = getNodeCenter(node);
  const w = node.measured?.width ?? 160;
  const h = node.measured?.height ?? 60;

  const dx = targetCx - cx;
  const dy = targetCy - cy;

  // Degenerate case: nodes perfectly overlapping
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cx, y: cy };
  }

  // t at which the ray hits each of the four walls.
  // For each axis: t = (half-dimension) / |component| — always positive.
  const tx = dx !== 0 ? Math.abs((w / 2) / dx) : Infinity;
  const ty = dy !== 0 ? Math.abs((h / 2) / dy) : Infinity;
  const t = Math.min(tx, ty);

  return { x: cx + t * dx, y: cy + t * dy };
}
