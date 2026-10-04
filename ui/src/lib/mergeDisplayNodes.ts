import type { Node } from "@xyflow/react";

/**
 * Sync the controlled React Flow node list with a freshly built one.
 *
 * Nodes already on the canvas keep their current position and their measured
 * size. Keeping `measured` matters: React Flow treats a node object without it
 * as unmeasured, drops its handle bounds, and unmounts every edge touching it
 * until the ResizeObserver reports again. On an import the incoming list is
 * taken as is, so the saved layout replaces the current one.
 *
 * A text block that was not on the canvas before was just added: it becomes
 * the selection so its toolbar and resize handles show right away.
 */
export function mergeDisplayNodes<N extends Node>(current: N[], next: N[], isImport: boolean): N[] {
  if (isImport) return next.map((n) => ({ ...n }));
  const prev = new Map(current.map((n) => [n.id, n]));
  const hasNewText = next.some((n) => n.type === "text" && !prev.has(n.id));
  return next.map((n) => {
    const was = prev.get(n.id);
    const isNewText = n.type === "text" && !was;
    return {
      ...n,
      position: was?.position ?? n.position,
      ...(was?.measured ? { measured: was.measured } : {}),
      selected: hasNewText ? isNewText : was?.selected,
    };
  });
}
