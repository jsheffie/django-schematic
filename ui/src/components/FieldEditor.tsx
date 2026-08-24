import { useRef, useState } from "react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { orderedFields, FIELD_COLOR_SWATCHES } from "../lib/fieldEdits";
import type { FieldInfo } from "../lib/types";

function SwatchPopover({
  current,
  onPick,
}: {
  current?: string;
  onPick: (color: string | null) => void;
}) {
  return (
    <div className="absolute left-10 top-full z-20 mt-0.5 flex items-center gap-1 rounded border border-gray-200 bg-white p-1 shadow-md">
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

export function FieldEditor({ nodeId, fields }: { nodeId: string; fields: FieldInfo[] }) {
  const edits = useSchemaStore((s) => s.fieldEdits.get(nodeId));
  const toggleFieldHidden = useSchemaStore((s) => s.toggleFieldHidden);
  const setFieldColor = useSchemaStore((s) => s.setFieldColor);
  const resetFieldEdits = useSchemaStore((s) => s.resetFieldEdits);
  const setFieldOrder = useSchemaStore((s) => s.setFieldOrder);
  const setEditingNode = usePhysicsStore((s) => s.setEditingNode);

  const [swatchFor, setSwatchFor] = useState<string | null>(null);

  // Pointer-drag reorder: rows are uniform height, so target index is
  // derived from vertical distance travelled since pointerdown.
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragInfo = useRef<{ name: string; startY: number; rowH: number } | null>(null);
  const startOrder = useRef<string[]>([]);

  const displayed = orderedFields(fields, edits);
  const byName = new Map(displayed.map((f) => [f.name, f]));
  const rowNames = dragOrder ?? displayed.map((f) => f.name);

  const onHandleDown = (e: React.PointerEvent<HTMLSpanElement>, name: string) => {
    const row = (e.currentTarget as HTMLElement).closest("[data-fieldrow]") as HTMLElement | null;
    dragInfo.current = { name, startY: e.clientY, rowH: row?.offsetHeight ?? 22 };
    startOrder.current = displayed.map((f) => f.name);
    setDragOrder(startOrder.current);
    setSwatchFor(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = dragInfo.current;
    if (!d) return;
    const from = startOrder.current.indexOf(d.name);
    const delta = Math.round((e.clientY - d.startY) / d.rowH);
    const to = Math.max(0, Math.min(startOrder.current.length - 1, from + delta));
    const next = [...startOrder.current];
    next.splice(from, 1);
    next.splice(to, 0, d.name);
    setDragOrder(next);
  };

  const onHandleUp = () => {
    if (dragInfo.current && dragOrder) {
      setFieldOrder(nodeId, dragOrder, fields.map((f) => f.name));
    }
    dragInfo.current = null;
    setDragOrder(null);
  };

  return (
    <div className="py-1">
      {displayed.length === 0 ? (
        <div className="px-2 py-0.5 text-xs text-gray-400">no fields</div>
      ) : (
        rowNames.map((name) => {
          const f = byName.get(name);
          if (!f) return null;
          const hidden = edits?.hiddenFields.includes(name) ?? false;
          const color = edits?.fieldColors[name];
          const isDragging = dragInfo.current?.name === name;
          return (
            <div
              key={name}
              data-fieldrow
              className={`relative flex items-center gap-1.5 px-1.5 py-0.5 text-xs ${
                f.is_relation ? "text-blue-700 font-medium" : "text-gray-600"
              } ${hidden ? "opacity-40" : ""} ${isDragging ? "bg-blue-50 shadow-sm" : ""}`}
              style={
                color
                  ? {
                      backgroundColor: `${color}4D`,
                      boxShadow: `inset 0 0 0 1px ${color}`,
                      borderRadius: 3,
                    }
                  : undefined
              }
            >
              <span
                className="cursor-grab touch-none select-none px-0.5 text-gray-400 active:cursor-grabbing"
                title="Drag to reorder"
                onPointerDown={(e) => onHandleDown(e, name)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
              >
                ≡
              </span>
              <button
                className="shrink-0 select-none"
                onClick={() => toggleFieldHidden(nodeId, name)}
                title={hidden ? "Show field" : "Hide field"}
              >
                {hidden ? "🚫" : "👁"}
              </button>
              <button
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
