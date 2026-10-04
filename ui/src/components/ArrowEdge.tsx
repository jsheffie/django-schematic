/**
 * User-drawn annotation arrow (issue #100). Rendered as a React Flow edge
 * between the two nodes its ends refer to: a model node, a text block, or an
 * invisible anchor node for a free end. Geometry comes from lib/annotations.ts
 * and is recomputed every render from live node positions, so an arrow follows
 * the node it is attached to while that node is dragged.
 *
 * Visually distinct from relation edges: dark dashed ink with a filled head.
 * Selected: blue, with a small toolbar (start head, label, delete) above the
 * midpoint. In the bezier edge style the midpoint grip bows the arrow, same
 * interaction as the smart relation edge.
 */
import { useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type InternalNode,
} from "@xyflow/react";
import type { EdgeStyle } from "../store/physicsStore";
import { usePhysicsStore } from "../store/physicsStore";
import { useSchemaStore } from "../store/schemaStore";
import { nodeRect } from "../lib/smartEdge";
import type { Point } from "../lib/smartEdge";
import {
  ANCHOR_SIZE,
  isAttached,
  resolveArrowGeometry,
  type Arrow,
  type ArrowEndpoint,
  type EndGeometry,
} from "../lib/annotations";
import { ARROW_COLOR, ARROW_COLOR_SELECTED, ARROW_MARKER, ARROW_MARKER_SELECTED } from "../lib/markers";

export type ArrowEdgeData = Edge<{ arrowId: string; edgeStyle?: EdgeStyle }, "arrow">;

function endGeometry(ep: ArrowEndpoint, node: InternalNode): EndGeometry {
  if (isAttached(ep)) return { kind: "node", rect: nodeRect(node) };
  // Free end: the anchor node's centre, live from the store so a drag shows immediately.
  const pos = node.internals.positionAbsolute;
  return { kind: "point", point: { x: pos.x + ANCHOR_SIZE / 2, y: pos.y + ANCHOR_SIZE / 2 } };
}

export function ArrowEdge({ id, source, target, data, selected }: EdgeProps<ArrowEdgeData>) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const arrow: Arrow | undefined = useSchemaStore((s) => (data ? s.arrows.get(data.arrowId) : undefined));
  const setArrowOffset = useSchemaStore((s) => s.setArrowOffset);
  const clearArrowOffset = useSchemaStore((s) => s.clearArrowOffset);
  const updateArrow = useSchemaStore((s) => s.updateArrow);
  const removeArrow = useSchemaStore((s) => s.removeArrow);
  const setSelectedArrow = usePhysicsStore((s) => s.setSelectedArrow);
  const { screenToFlowPosition } = useReactFlow();
  const dragStart = useRef<{ flow: Point; offset: Point } | null>(null);

  if (!arrow || !data || !sourceNode || !targetNode) return null;
  const arrowId = data.arrowId;
  const style = data.edgeStyle ?? "bezier";

  const g = resolveArrowGeometry({
    from: endGeometry(arrow.from, sourceNode),
    to: endGeometry(arrow.to, targetNode),
    style,
    offset: arrow.offset,
  });

  const color = selected ? ARROW_COLOR_SELECTED : ARROW_COLOR;
  const marker = `url(#${selected ? ARROW_MARKER_SELECTED : ARROW_MARKER})`;
  const isBezier = style === "bezier";
  const showGrip = isBezier && (hovered || dragging || selected || arrow.offset !== undefined);

  const onGripPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    dragStart.current = {
      flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      offset: arrow.offset ?? { x: 0, y: 0 },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onGripPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d) return;
    const now = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setArrowOffset(arrowId, { x: d.offset.x + (now.x - d.flow.x), y: d.offset.y + (now.y - d.flow.y) });
  };
  const onGripPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={g.path}
        markerEnd={marker}
        markerStart={arrow.startHead ? marker : undefined}
        style={{ stroke: color, strokeWidth: 1.5, strokeDasharray: "6 3" }}
      />
      {/* Wide transparent hit area for hover and selection */}
      <path
        d={g.path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: "pointer" }}
      />
      <EdgeLabelRenderer>
        {arrow.label && (
          <div
            className="absolute rounded bg-white/90 px-1 text-xs"
            style={{
              color: ARROW_COLOR,
              transform: `translate(-50%, ${isBezier ? "-150%" : "-50%"}) translate(${g.mid.x}px,${g.mid.y}px)`,
              pointerEvents: "none",
            }}
          >
            {arrow.label}
          </div>
        )}
        {showGrip && (
          <div
            data-export-skip
            className="nodrag nopan absolute rounded-full border-2 bg-white"
            style={{
              width: 10,
              height: 10,
              borderColor: color,
              opacity: hovered || dragging || selected ? 1 : 0.35,
              pointerEvents: "all",
              cursor: dragging ? "grabbing" : "grab",
              touchAction: "none",
              zIndex: 1001, // above elevated nodes, same reason as the relation-edge grip
              transform: `translate(-50%, -50%) translate(${g.mid.x}px,${g.mid.y}px)`,
            }}
            title="Drag to bow the arrow. Double-click to straighten."
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={onGripPointerUp}
            onPointerCancel={onGripPointerUp}
            onDoubleClick={(e) => {
              e.stopPropagation();
              clearArrowOffset(arrowId);
            }}
          />
        )}
        {selected && (
          <div
            data-export-skip
            className="nodrag nopan absolute flex items-center gap-1 rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] shadow-md"
            style={{
              pointerEvents: "all",
              zIndex: 1001,
              transform: `translate(-50%, -100%) translate(${g.mid.x}px,${g.mid.y - 16}px)`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className={`rounded px-1.5 py-0.5 leading-none ${
                arrow.startHead ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
              aria-pressed={!!arrow.startHead}
              aria-label="Arrowhead at start"
              title="Arrowhead at start"
              onClick={() => updateArrow(arrowId, { startHead: !arrow.startHead })}
            >
              ◀▶
            </button>
            <input
              aria-label="Arrow label"
              placeholder="Label"
              className="w-24 rounded border border-gray-200 px-1 py-0.5 text-[10px] text-gray-800 outline-none focus:border-blue-500"
              value={arrow.label ?? ""}
              spellCheck={false}
              onChange={(e) => updateArrow(arrowId, { label: e.target.value || undefined })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                e.stopPropagation();
              }}
            />
            <button
              className="rounded px-1.5 py-0.5 leading-none text-gray-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete arrow"
              title="Delete arrow"
              onClick={() => {
                setSelectedArrow(null);
                removeArrow(arrowId);
              }}
            >
              ×
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
