import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

const elk = new ELK();

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export async function runElkLayout(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) return nodes;

  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "80",
      "elk.spacing.nodeNode": "40",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
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
