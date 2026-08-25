import { useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
} from "@xyflow/react";
import type { EdgeStyle } from "../store/physicsStore";
import { getNodeBorderPoint, getNodeCenter } from "../lib/floatingEdge";
import { useSchemaStore } from "../store/schemaStore";
import { smartEdgeGeometry } from "../lib/smartEdge";
import type { Point } from "../lib/smartEdge";

export type SchemaEdgeData = Edge<{
  relation_type: "fk" | "o2o" | "m2m" | "subclass" | "proxy";
  field_name: string;
  related_name: string | null;
  target_field: string | null;
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

  // Always call hooks — floating and smart bezier edges need live node
  // positions from the RF store. Results are only used for those styles.
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  // Smart bezier: per-edge user midpoint offset (sparse map; undefined = none).
  const offset = useSchemaStore((s) => s.edgeOffsets.get(id));
  const isSmart = style === "bezier" && !!sourceNode && !!targetNode;

  const setEdgeOffset = useSchemaStore((s) => s.setEdgeOffset);
  const clearEdgeOffset = useSchemaStore((s) => s.clearEdgeOffset);
  const { screenToFlowPosition } = useReactFlow();
  const [dragging, setDragging] = useState(false);
  // Pointer + offset at drag start; deltas are computed in flow coordinates so
  // zoom and pan are accounted for.
  const dragStart = useRef<{ flow: Point; offset: Point } | null>(null);

  const onGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    dragStart.current = {
      flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      offset: offset ?? { x: 0, y: 0 },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d) return;
    const now = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setEdgeOffset(id, { x: d.offset.x + (now.x - d.flow.x), y: d.offset.y + (now.y - d.flow.y) });
  };
  const onGripPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const showGrip = isSmart && (hovered || dragging || offset !== undefined);

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
  } else if (isSmart && sourceNode && targetNode) {
    // Side-aware, field-anchored cubic. Sides and anchors are recomputed every
    // render from live node positions, so the curve flips sides while dragging
    // and follows the field row when fields are reordered or the node collapses.
    // Dragging the grip past a node's far border also re-attaches that end to
    // the near side (see smartEdgeGeometry / flipSideTowardPull); the pull
    // point is computed from the base (unflipped) sides so there's no
    // sides -> mid -> pull -> sides feedback loop.
    const g = smartEdgeGeometry({
      sourceNode,
      targetNode,
      sourceField: data?.field_name || null,
      targetField: data?.target_field ?? null,
      offset,
    });
    edgePath = g.path;
    labelX = g.mid.x;
    labelY = g.mid.y;
  } else if (style === "bezier") {
    // Nodes not in the RF store yet (first frame): plain bezier fallback.
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
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
            className="absolute bg-white border border-gray-200 rounded shadow-lg px-2 py-1.5 text-xs pointer-events-none z-[1001]"
            style={{
              // React Flow assigns nodes z-index from internals.z (0 normally,
              // 1000 when selected/elevated); the edge-label-renderer layer has
              // no stacking context of its own, so a child z-index competes
              // directly with nodes. z-[1001] keeps the tooltip visible even
              // over a selected node. (pointer-events stays none — decorative.)
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
                transform: `translate(-50%, ${isSmart ? "-150%" : "-50%"}) translate(${labelX}px,${labelY}px)`,
              }}
            >
              {data.field_name}
            </div>
          )
        )}
        {showGrip && (
          <div
            className="nodrag nopan absolute rounded-full border-2 bg-white"
            style={{
              width: 10,
              height: 10,
              borderColor: color,
              opacity: hovered || dragging ? 1 : 0.35,
              pointerEvents: "all",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              // Nodes paint above the edge-label-renderer layer (React Flow
              // gives nodes z-index from internals.z, up to 1000 when
              // selected/elevated); the grip's midpoint commonly lands over a
              // node after a far-border side flip, so without an explicit
              // z-index above 1000 the node intercepts pointer events and the
              // grip becomes unclickable (drag-to-start and double-click-to-
              // reset both fail) whenever that happens.
              zIndex: 1001,
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            title="Drag to reshape. Double-click to reset."
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={onGripPointerUp}
            onPointerCancel={onGripPointerUp}
            onDoubleClick={(e) => {
              e.stopPropagation();
              clearEdgeOffset(id);
            }}
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes: EdgeTypes = {
  schema: SchemaEdge,
} as unknown as EdgeTypes;
