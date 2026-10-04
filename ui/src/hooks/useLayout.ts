/**
 * Dagre-based hierarchical layout.
 *
 * `runDagreLayout` is a pure function — it takes the current React Flow nodes
 * and edges, runs the dagre algorithm, and returns new nodes with updated
 * positions. Call it from a useEffect in SchemaCanvas when activeLayout changes.
 *
 * Pass `nodeSizes` (built from `node.measured` in SchemaCanvas) so the layout
 * uses each node's actual rendered dimensions rather than a hardcoded constant.
 */
import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 60;

// Only model nodes (and the edges between them) go to dagre; annotations pass through untouched.
const isModel = (n: Node): boolean => n.type === "model";

export function runDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB",
  nodeSizes: Map<string, { width: number; height: number }>
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 80, nodesep: 40 });

  const modelNodes = nodes.filter(isModel);
  const modelIds = new Set(modelNodes.map((n) => n.id));
  modelNodes.forEach((n) => {
    const s = nodeSizes.get(n.id);
    g.setNode(n.id, { width: s?.width ?? DEFAULT_WIDTH, height: s?.height ?? DEFAULT_HEIGHT });
  });
  edges
    .filter((e) => modelIds.has(e.source) && modelIds.has(e.target))
    .forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    if (!isModel(n)) return n;
    const { x, y } = g.node(n.id);
    const s = nodeSizes.get(n.id);
    const w = s?.width ?? DEFAULT_WIDTH;
    const h = s?.height ?? DEFAULT_HEIGHT;
    return { ...n, position: { x: x - w / 2, y: y - h / 2 } };
  });
}
