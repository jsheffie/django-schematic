/**
 * Dagre-based hierarchical layout.
 *
 * `runDagreLayout` is a pure function — it takes the current React Flow nodes
 * and edges, runs the dagre algorithm, and returns new nodes with updated
 * positions. Call it from a useEffect in SchemaCanvas when activeLayout changes.
 */
import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;

export function runDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB"
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } };
  });
}
