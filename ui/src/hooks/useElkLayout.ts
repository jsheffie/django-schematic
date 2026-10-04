/**
 * ELK-based hierarchical layout.
 *
 * Pass `nodeSizes` (built from `node.measured` in SchemaCanvas) so the layout
 * uses each node's actual rendered dimensions rather than a hardcoded constant.
 *
 * ELK is ~1.4 MB minified, so it is loaded on demand via dynamic import()
 * instead of being bundled into main.js. Vite emits it as a separate chunk
 * under chunks/ next to main.js (see vite.config.ts chunkFileNames).
 */
import type { Edge, Node } from "@xyflow/react";
import type { ELK as ElkInstance } from "elkjs/lib/elk.bundled.js";

// Module-level cache so the chunk is fetched and ELK instantiated only once.
// Reset on failure so a transient network error doesn't break ELK until reload.
let elkPromise: Promise<ElkInstance> | null = null;

export function loadElk(): Promise<ElkInstance> {
  if (!elkPromise) {
    elkPromise = import("elkjs/lib/elk.bundled.js")
      .then(({ default: ELK }) => new ELK())
      .catch((err: unknown) => {
        elkPromise = null;
        throw err;
      });
  }
  return elkPromise;
}

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 60;

export async function runElkLayout(
  nodes: Node[],
  edges: Edge[],
  nodeSizes: Map<string, { width: number; height: number }>
): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.nodeNode": "40",
    },
    children: nodes.map((n) => {
      const s = nodeSizes.get(n.id);
      return {
        id: n.id,
        width: s?.width ?? DEFAULT_WIDTH,
        height: s?.height ?? DEFAULT_HEIGHT,
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const elk = await loadElk();
  const layout = await elk.layout(elkGraph);

  return nodes.map((n) => {
    const child = layout.children?.find((c) => c.id === n.id);
    if (!child || child.x === undefined || child.y === undefined) return n;
    return { ...n, position: { x: child.x, y: child.y } };
  });
}
