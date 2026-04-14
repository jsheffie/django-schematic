import { useState } from "react";
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
  related_name: string | null;
  edgeStyle?: EdgeStyle;
}, 'schema'>;

const EDGE_COLORS: Record<string, string> = {
  fk: "#6b7280",       // gray
  o2o: "#2563eb",      // blue
  m2m: "#7c3aed",      // purple
  subclass: "#059669", // green
  proxy: "#d97706",    // amber
};

const RELATION_LABELS: Record<string, string> = {
  fk: "one-to-many",
  o2o: "one-to-one",
  m2m: "many-to-many",
  subclass: "subclass",
  proxy: "proxy",
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
  markerStart,
}: EdgeProps<SchemaEdgeData>) {
  const [hovered, setHovered] = useState(false);

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
        markerStart={markerStart}
        style={{
          stroke: color,
          strokeWidth: relType === "subclass" || relType === "proxy" ? 2 : 1.5,
          strokeDasharray: relType === "proxy" ? "5 3" : undefined,
        }}
      />
      {/* Wider transparent hit area for reliable hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "default" }}
      />
      <EdgeLabelRenderer>
        {hovered ? (
          /* Hover tooltip: type / field / reverse */
          <div
            className="absolute bg-white border border-gray-200 rounded shadow-lg px-2 py-1.5 text-xs pointer-events-none z-50"
            style={{
              transform: `translate(-50%, -120%) translate(${labelX}px,${labelY}px)`,
              minWidth: 140,
            }}
          >
            <div className="flex gap-2">
              <span className="text-gray-400 w-12 shrink-0">type</span>
              <span className="text-gray-700">{RELATION_LABELS[relType] ?? relType}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 w-12 shrink-0">field</span>
              <span className="text-gray-700">{data?.field_name}</span>
            </div>
            {data?.related_name && (
              <div className="flex gap-2">
                <span className="text-gray-400 w-12 shrink-0">reverse</span>
                <span className="text-gray-700">{data.related_name}</span>
              </div>
            )}
          </div>
        ) : (
          data?.field_name && (
            <div
              className="absolute text-xs text-gray-500 bg-white px-0.5 rounded pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              }}
            >
              {data.field_name}
            </div>
          )
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes: EdgeTypes = {
  schema: SchemaEdge,
} as unknown as EdgeTypes;
