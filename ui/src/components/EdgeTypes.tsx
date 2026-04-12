import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";
import type { EdgeStyle } from "../store/physicsStore";

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

  const [edgePath, labelX, labelY] =
    style === "bezier"
      ? getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
      : getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

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
