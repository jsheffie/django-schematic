import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { autoFieldOrder, orderedFields, FIELD_COLOR_SWATCHES } from "../lib/fieldEdits";
import type { FieldInfo } from "../lib/types";
import { IconEye, IconEyeSlash, IconSortByType } from "./icons";
import { AnchorHandle } from "./AnchorHandle";
import { fieldHandleId } from "../lib/smartEdge";

// Fallback when a row has no layout yet (or in jsdom), matching a text-xs row.
const DEFAULT_ROW_HEIGHT = 22;

function SwatchPopover({
  current,
  onPick,
}: {
  current?: string;
  onPick: (color: string | null) => void;
}) {
  return (
    <div
      data-swatch-popover
      className="absolute left-10 top-full z-20 mt-0.5 flex items-center gap-1 rounded border border-gray-200 bg-white p-1 shadow-md"
    >
      {FIELD_COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          className="h-4 w-4 shrink-0 rounded-full hover:scale-110"
          style={{
            backgroundColor: c,
            outline: current === c ? `2px solid ${c}` : "none",
            outlineOffset: 1,
          }}
          onClick={() => onPick(c)}
          title={c}
          aria-label={`Color swatch ${c}`}
        />
      ))}
      <button
        className="h-4 w-4 shrink-0 rounded-full border border-gray-300 text-[9px] leading-none text-gray-500 hover:bg-gray-100"
        onClick={() => onPick(null)}
        title="Clear color"
        aria-label="Clear color"
      >
        ⊘
      </button>
    </div>
  );
}

/** `order` with the item at `from` moved to `to`. */
function moveItem<T>(order: readonly T[], from: number, to: number): T[] {
  const next = [...order];
  if (from < 0 || from >= next.length) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** What a drag renders: the row being dragged, where it currently sits, and how far rows shift. */
interface DragState {
  name: string;
  from: number;
  to: number;
  /** Row height in layout px (pre-zoom): the translateY applied inside the node. */
  layoutRowH: number;
}

/** Per-drag measurements and targets; mutated by the pointer handlers, no re-render needed. */
interface DragInfo extends DragState {
  pointerId: number;
  startY: number;
  /** Row height in screen px (zoom-inclusive): maps pointer travel to row steps. */
  screenRowH: number;
  /** Field order when the drag started; what `from`/`to` index into. */
  committed: string[];
  handle: HTMLElement;
}

export function FieldEditor({ nodeId, fields }: { nodeId: string; fields: FieldInfo[] }) {
  const edits = useSchemaStore((s) => s.fieldEdits.get(nodeId));
  const toggleFieldHidden = useSchemaStore((s) => s.toggleFieldHidden);
  const setFieldColor = useSchemaStore((s) => s.setFieldColor);
  const resetFieldEdits = useSchemaStore((s) => s.resetFieldEdits);
  const setFieldOrder = useSchemaStore((s) => s.setFieldOrder);
  const setEditingNode = usePhysicsStore((s) => s.setEditingNode);

  const [swatchFor, setSwatchFor] = useState<string | null>(null);

  // Pointer-drag reorder (issue #101). Rows always render in the committed
  // order and the drag is shown purely with translateY, so React never moves
  // the handle's DOM node mid-drag: a captured element that is moved loses
  // pointer capture, which is what left rows "stuck" to the pointer before.
  // `drag` is state so a change re-renders the shifted rows; `dragInfo` is the
  // ref the window listeners read at event time, so they never go stale.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragInfo = useRef<DragInfo | null>(null);

  // Close the swatch popover on any pointerdown outside it (and outside the
  // toggle buttons, so clicking a different row's ▣ can still open that one).
  useEffect(() => {
    if (swatchFor === null) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest("[data-swatch-popover]")) return;
      if (target?.closest("[data-swatch-toggle]")) return;
      setSwatchFor(null);
    };
    // Capture phase: React Flow's d3-drag/d3-zoom handlers call stopImmediatePropagation
    // on pointerdown at the bubble phase, so a bubble listener here could miss clicks on
    // the node body or canvas pane. Capture runs before that.
    document.addEventListener("pointerdown", onPointerDownOutside, true);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside, true);
  }, [swatchFor]);

  const displayed = orderedFields(fields, edits);
  const committed = displayed.map((f) => f.name);
  const visualOrder = drag ? moveItem(committed, drag.from, drag.to) : committed;

  // Rows shift during a drag-reorder without changing node height; tell React
  // Flow to re-measure the anchor handles so edges follow the row live.
  const updateNodeInternals = useUpdateNodeInternals();
  const rowKey = visualOrder.join(" ");
  useEffect(() => {
    updateNodeInternals(nodeId);
  }, [nodeId, rowKey, updateNodeInternals]);

  /** Drop drag state without committing. Safe to call when no drag is active. */
  const endDrag = useCallback(() => {
    const d = dragInfo.current;
    dragInfo.current = null;
    setDrag(null);
    if (d && d.handle.hasPointerCapture(d.pointerId)) {
      d.handle.releasePointerCapture(d.pointerId);
    }
  }, []);

  // For the duration of a drag, listen on window so the release is seen no
  // matter which element ends up under the pointer. Escape, pointercancel and
  // a lost capture all cancel: the committed order is what is already rendered.
  const isDragging = drag !== null;
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragInfo.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const delta = Math.round((e.clientY - d.startY) / d.screenRowH);
      const to = Math.max(0, Math.min(d.committed.length - 1, d.from + delta));
      if (to === d.to) return;
      d.to = to;
      setDrag({ name: d.name, from: d.from, to, layoutRowH: d.layoutRowH });
    };
    const onUp = (e: PointerEvent) => {
      const d = dragInfo.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const order = moveItem(d.committed, d.from, d.to);
      endDrag();
      setFieldOrder(nodeId, order, fields.map((f) => f.name));
    };
    const onCancel = (e: PointerEvent) => {
      const d = dragInfo.current;
      if (d && e.pointerId === d.pointerId) endDrag();
    };
    const onLostCapture = (e: Event) => {
      if (dragInfo.current && e.target === dragInfo.current.handle) endDrag();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") endDrag();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("lostpointercapture", onLostCapture);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("lostpointercapture", onLostCapture);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDragging, nodeId, fields, setFieldOrder, endDrag]);

  const onHandleDown = (e: React.PointerEvent<HTMLElement>, name: string) => {
    if (e.button !== 0) return;
    // A drag whose release we never saw must not leak into this one.
    if (dragInfo.current) endDrag();

    const handle = e.currentTarget;
    const row = handle.closest("[data-fieldrow]") as HTMLElement | null;
    // getBoundingClientRect is transform-inclusive (reflects React Flow's zoom scale),
    // unlike offsetHeight which is in untransformed layout pixels. Pointer travel is
    // measured in the former; the translateY on rows is applied in the latter.
    const rect = row?.getBoundingClientRect();
    const screenRowH = rect && rect.height > 0 ? rect.height : DEFAULT_ROW_HEIGHT;
    const layoutRowH = row && row.offsetHeight > 0 ? row.offsetHeight : DEFAULT_ROW_HEIGHT;
    const from = committed.indexOf(name);
    if (from < 0) return;

    dragInfo.current = {
      name,
      from,
      to: from,
      pointerId: e.pointerId,
      startY: e.clientY,
      screenRowH,
      layoutRowH,
      committed,
      handle,
    };
    setDrag({ name, from, to: from, layoutRowH });
    setSwatchFor(null);
    handle.setPointerCapture(e.pointerId);
  };

  /** Vertical offset (layout px) a row renders at while a drag is in flight. */
  const rowShift = (index: number): number => {
    if (!drag) return 0;
    if (index === drag.from) return (drag.to - drag.from) * drag.layoutRowH;
    if (drag.from < index && index <= drag.to) return -drag.layoutRowH;
    if (drag.to <= index && index < drag.from) return drag.layoutRowH;
    return 0;
  };

  return (
    <div className="py-1">
      {displayed.length === 0 ? (
        <div className="px-2 py-0.5 text-xs text-gray-400">no fields</div>
      ) : (
        displayed.map((f, index) => {
          const name = f.name;
          const hidden = edits?.hiddenFields.includes(name) ?? false;
          const color = edits?.fieldColors[name];
          const isDragged = drag?.name === name;
          const shift = rowShift(index);
          return (
            <div
              key={name}
              data-fieldrow={name}
              data-dragging={isDragged ? "true" : undefined}
              className={`relative flex items-center gap-1.5 px-1.5 py-0.5 text-xs ${
                f.is_relation ? "text-blue-700 font-medium" : "text-gray-600"
              } ${hidden ? "opacity-40" : ""} ${isDragged ? "z-10 bg-blue-50 shadow-sm" : ""}`}
              style={{
                ...(color ? { backgroundColor: `${color}4D` } : undefined),
                ...(shift !== 0 ? { transform: `translateY(${shift}px)` } : undefined),
              }}
            >
              <AnchorHandle id={fieldHandleId(name)} />
              <span
                className="cursor-grab touch-none select-none px-0.5 text-gray-400 active:cursor-grabbing"
                title="Drag to reorder"
                onPointerDown={(e) => onHandleDown(e, name)}
              >
                ≡
              </span>
              <button
                className="shrink-0 select-none text-gray-500 hover:text-gray-800"
                onClick={() => toggleFieldHidden(nodeId, name)}
                title={hidden ? "Show field" : "Hide field"}
                aria-label={hidden ? "Show field" : "Hide field"}
              >
                {hidden ? <IconEyeSlash className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
              </button>
              <button
                data-swatch-toggle
                className="h-3 w-3 shrink-0 rounded-sm border border-gray-400"
                style={{ backgroundColor: color ?? "#ffffff" }}
                onClick={() => setSwatchFor(swatchFor === name ? null : name)}
                title="Field color"
                aria-label="Field color"
              />
              <span className="flex-1 truncate">{name}</span>
              <span className="text-gray-400 shrink-0">{f.field_type}</span>
              {swatchFor === name && (
                <SwatchPopover
                  current={color}
                  onPick={(c) => {
                    setFieldColor(nodeId, name, c);
                    setSwatchFor(null);
                  }}
                />
              )}
            </div>
          );
        })
      )}
      <div className="mt-1 flex items-center justify-end gap-2 border-t border-gray-200 px-2 pt-1">
        <button
          className="mr-auto inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-white"
          onClick={() => setFieldOrder(nodeId, autoFieldOrder(fields), fields.map((f) => f.name))}
          disabled={isDragging}
          title="Primary key, then relations, then fields grouped by type, then booleans, dates and times last"
        >
          <IconSortByType className="h-3.5 w-3.5" />
          Sort by type
        </button>
        <button
          className="text-xs text-gray-500 hover:text-gray-800"
          onClick={() => resetFieldEdits(nodeId)}
          title="Clear all field edits on this model"
        >
          Reset
        </button>
        <button
          className="rounded bg-gray-700 px-2 py-0.5 text-xs text-white hover:bg-gray-900"
          onClick={() => setEditingNode(null)}
        >
          Done
        </button>
      </div>
    </div>
  );
}
