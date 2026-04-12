import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";
import type { EdgeStyle } from "../store/physicsStore";
import { getNodeBorderPoint, getNodeCenter } from "../lib/floatingEdge";

export type SchemaEdgeData = Edge<{
  relation_type: "fk" | "o2o" | "m2m" | "subclass" | "proxy";
  field_name: string;
  edgeStyle?: EdgeStyle;
}, 'schema'>;

const EDGE_COLORS: Record<string, string> = {
  fk: "#6b7280",       // gray
  o2o: "#2563eb",      // blue
  m2m: "#7c3aed",      // purple
  subclass: "#059669", // green
  proxy: "#d97706",    // amber
};

export function SchemaEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<SchemaEdgeData>) {
  const relType = data?.relation_type ?? "fk";
  const color = EDGE_COLORS[relType] ?? "#6b7280";
  const style = data?.edgeStyle ?? "step";

  // Always call hooks — floating edge needs live node positions from RF store.
  // Results are only used when style === "floating".
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (style === "floating" && sourceNode && targetNode) {
    const targetCenter = getNodeCenter(targetNode);
    const sourceCenter = getNodeCenter(sourceNode);
    const sp = getNodeBorderPoint(sourceNode, targetCenter.x, targetCenter.y);
    const tp = getNodeBorderPoint(targetNode, sourceCenter.x, sourceCenter.y);
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sp.x,
      sourceY: sp.y,
      targetX: tp.x,
      targetY: tp.y,
    });
  } else if (style === "bezier") {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: relType === "subclass" || relType === "proxy" ? 2 : 1.5,
          strokeDasharray: relType === "proxy" ? "5 3" : undefined,
        }}
      />
      {data?.field_name && (
        <EdgeLabelRenderer>
          <div
            className="absolute text-xs text-gray-500 bg-white px-0.5 rounded pointer-events-none"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data.field_name}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes: EdgeTypes = {
  schema: SchemaEdge,
} as unknown as EdgeTypes;
