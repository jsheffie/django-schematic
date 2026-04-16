/**
 * ELK-based hierarchical layout.
 *
 * Pass `nodeSizes` (built from `node.measured` in SchemaCanvas) so the layout
 * uses each node's actual rendered dimensions rather than a hardcoded constant.
 */
import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

const elk = new ELK();

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

  const layout = await elk.layout(elkGraph);

  return nodes.map((n) => {
    const child = layout.children?.find((c) => c.id === n.id);
    if (!child || child.x === undefined || child.y === undefined) return n;
    return { ...n, position: { x: child.x, y: child.y } };
  });
}
