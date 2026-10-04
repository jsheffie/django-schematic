/**
 * Draw-arrow mode: while physicsStore.annotationTool is "arrow", this layer
 * covers the canvas and turns a drag into an arrow. An end over a model or
 * text block attaches to it; anywhere else is a free end. Release creates and
 * selects the arrow and leaves the mode. Esc is handled by the canvas.
 */
import { useRef, useState } from "react";
import { useReactFlow, type Node } from "@xyflow/react";
import { usePhysicsStore } from "../store/physicsStore";
import { useSchemaStore } from "../store/schemaStore";
import { borderPoint, type ArrowEndpoint, type Point, type Rect } from "../lib/annotations";
import { ARROW_COLOR } from "../lib/markers";

const MIN_DRAG_PX = 8;

interface PointerSample {
  screen: Point;
  flow: Point;
  node: Node | null;
}

function rectOf(node: Node): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.measured?.width ?? node.width ?? 160,
    height: node.measured?.height ?? node.height ?? 60,
  };
}

export default function ArrowDrawLayer() {
  const active = usePhysicsStore((s) => s.annotationTool === "arrow");
  const { screenToFlowPosition, flowToScreenPosition, getIntersectingNodes, setNodes } = useReactFlow();
  const addArrow = useSchemaStore((s) => s.addArrow);
  const [start, setStart] = useState<PointerSample | null>(null);
  const [current, setCurrent] = useState<PointerSample | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  if (!active) return null;

  // The topmost model or text node under the pointer, if any.
  function sample(e: React.PointerEvent): PointerSample {
    const screen = { x: e.clientX, y: e.clientY };
    const flow = screenToFlowPosition(screen);
    const hits = getIntersectingNodes({ x: flow.x, y: flow.y, width: 1, height: 1 }).filter(
      (n) => n.type !== "anchor",
    );
    return { screen, flow, node: hits.at(-1) ?? null };
  }

  function toEndpoint(s: PointerSample): ArrowEndpoint {
    return s.node ? { nodeId: s.node.id } : s.flow;
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = sample(e);
    setStart(s);
    setCurrent(s);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!start) return;
    setCurrent(sample(e));
  }

  function finish(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const from = start;
    const to = start ? sample(e) : null;
    setStart(null);
    setCurrent(null);
    if (!from || !to) return;
    const dist = Math.hypot(to.screen.x - from.screen.x, to.screen.y - from.screen.y);
    if (dist < MIN_DRAG_PX) return; // a click, not a drag
    if (from.node && to.node && from.node.id === to.node.id) return; // both ends on one node
    const id = addArrow({ from: toEndpoint(from), to: toEndpoint(to) });
    // The new arrow becomes the selection.
    setNodes((nodes) => nodes.map((n) => (n.selected ? { ...n, selected: false } : n)));
    const ui = usePhysicsStore.getState();
    ui.setSelectedArrow(id);
    ui.setAnnotationTool(null);
  }

  // Preview in screen space, snapped to a node border where applicable.
  const layerBox = layerRef.current?.getBoundingClientRect();
  const toLocal = (p: Point): Point => ({ x: p.x - (layerBox?.left ?? 0), y: p.y - (layerBox?.top ?? 0) });
  let preview: { a: Point; b: Point } | null = null;
  if (start && current) {
    const a = start.node
      ? flowToScreenPosition(borderPoint(rectOf(start.node), current.node ? rectCenterOf(current.node) : current.flow))
      : start.screen;
    const b = current.node
      ? flowToScreenPosition(borderPoint(rectOf(current.node), start.flow))
      : current.screen;
    preview = { a: toLocal(a), b: toLocal(b) };
  }

  return (
    <div
      ref={layerRef}
      data-export-skip
      className="absolute inset-0 z-30 cursor-crosshair select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <marker id="arrow-draw-preview" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="strokeWidth" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={ARROW_COLOR} />
          </marker>
        </defs>
        {preview && (
          <line
            x1={preview.a.x}
            y1={preview.a.y}
            x2={preview.b.x}
            y2={preview.b.y}
            stroke={ARROW_COLOR}
            strokeWidth={1.5}
            strokeDasharray="6 3"
            markerEnd="url(#arrow-draw-preview)"
          />
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-900/90 px-3 py-1 text-xs text-white shadow">
        Drag to draw an arrow. Esc cancels.
      </div>
    </div>
  );
}

function rectCenterOf(node: Node): Point {
  const r = rectOf(node);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
