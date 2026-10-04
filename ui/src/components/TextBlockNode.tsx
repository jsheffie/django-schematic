/**
 * Free-form text block (issue #100): a `note` (card with a folded corner, the
 * UML comment shape) or a `title` (large text, no card). Not backed by a model.
 *
 * The block's content lives in schemaStore.textBlocks; only the React Flow
 * node id and position/size pass through props. Double-click edits in place;
 * Esc or clicking away saves. The stored height is a floor (min-height), so a
 * card grows with its text and a manual resize sets a new floor.
 */
import { memo, useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { FIELD_COLOR_SWATCHES } from "../lib/fieldEdits";
import type { TextBlockStyle } from "../lib/annotations";

export type TextBlockNodeData = Node<{ blockId: string }, "text">;

export const DEFAULT_NOTE_COLOR = "#f59e0b"; // amber swatch
const DEFAULT_TITLE_COLOR = "#1f2937";
const FOLD = 12; // px, the folded corner of a note

// Arrows attach to these; React Flow needs a source and a target handle on
// every node an edge touches. They are never shown or connectable by hand.
const HIDDEN_HANDLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  pointerEvents: "none",
};

function StyleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      className={`rounded px-1.5 py-0.5 leading-none ${
        active ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function BlockToolbar({
  style,
  color,
  onStyle,
  onColor,
}: {
  style: TextBlockStyle;
  color?: string;
  onStyle: (s: TextBlockStyle) => void;
  onColor: (c: string | undefined) => void;
}) {
  return (
    <div
      data-export-skip
      className="nodrag nopan absolute bottom-full left-0 mb-1.5 flex items-center gap-1 whitespace-nowrap rounded border border-gray-200 bg-white px-1 py-0.5 text-[10px] shadow-md"
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <StyleButton active={style === "note"} onClick={() => onStyle("note")}>Note</StyleButton>
      <StyleButton active={style === "title"} onClick={() => onStyle("title")}>Title</StyleButton>
      <span className="mx-0.5 h-3 w-px bg-gray-200" />
      {FIELD_COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          className="h-3.5 w-3.5 shrink-0 rounded-full hover:scale-110"
          style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 1 }}
          onClick={() => onColor(c)}
          title={c}
          aria-label={`Color swatch ${c}`}
        />
      ))}
      <button
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300 text-[9px] leading-none text-gray-500 hover:bg-gray-100"
        onClick={() => onColor(undefined)}
        title="Clear color"
        aria-label="Clear color"
      >
        ⊘
      </button>
    </div>
  );
}

export const TextBlockNode = memo(function TextBlockNode({ data, selected }: NodeProps<TextBlockNodeData>) {
  const block = useSchemaStore((s) => s.textBlocks.get(data.blockId));
  const updateTextBlock = useSchemaStore((s) => s.updateTextBlock);
  const removeTextBlock = useSchemaStore((s) => s.removeTextBlock);
  const editing = usePhysicsStore((s) => s.editingTextBlockId === data.blockId);
  const setEditingTextBlock = usePhysicsStore((s) => s.setEditingTextBlock);

  const [draft, setDraft] = useState(block?.text ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = block?.text ?? "";

  // Entering edit mode: start from the saved text and focus the editor.
  useEffect(() => {
    if (!editing) return;
    setDraft(text);
    const id = requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(id);
    // Only when edit mode toggles: a store text change while typing must not reset the draft.
  }, [editing]);

  // If the block leaves the canvas while being edited, exit edit mode.
  useEffect(
    () => () => {
      const p = usePhysicsStore.getState();
      if (p.editingTextBlockId === data.blockId) p.setEditingTextBlock(null);
    },
    [data.blockId],
  );

  if (!block) return null;

  const isTitle = block.style === "title";
  const color = block.color ?? (isTitle ? DEFAULT_TITLE_COLOR : DEFAULT_NOTE_COLOR);

  function commit() {
    const next = draft.replace(/\s+$/, "");
    if (next.trim() === "") removeTextBlock(data.blockId);
    else if (next !== text) updateTextBlock(data.blockId, { text: next });
    setEditingTextBlock(null);
  }

  function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (editing) setEditingTextBlock(null);
    removeTextBlock(data.blockId);
  }

  const textClass = isTitle
    ? "text-2xl font-semibold leading-tight tracking-tight"
    : "text-xs leading-relaxed";

  return (
    <div
      className="group relative flex flex-col"
      style={{ minHeight: block.height }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingTextBlock(data.blockId);
      }}
    >
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE} />

      <NodeResizer
        isVisible={!!selected}
        minWidth={80}
        minHeight={32}
        color={isTitle ? "#9ca3af" : color}
        onResizeEnd={(_, p) =>
          updateTextBlock(data.blockId, { x: p.x, y: p.y, width: p.width, height: p.height })
        }
      />

      {selected && (
        <BlockToolbar
          style={block.style}
          color={block.color}
          onStyle={(style) => updateTextBlock(data.blockId, { style })}
          onColor={(c) => updateTextBlock(data.blockId, { color: c })}
        />
      )}

      <div
        className={`relative flex flex-1 flex-col ${textClass} ${
          isTitle
            ? "annotation-title px-2 py-1"
            : "rounded-md border px-3 py-2 shadow-sm"
        }`}
        style={
          isTitle
            ? { color, outline: selected ? "1px dashed #9ca3af" : undefined, outlineOffset: 2 }
            : {
                borderColor: color,
                backgroundColor: `${color}26`,
                color: DEFAULT_TITLE_COLOR,
                clipPath: `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`,
              }
        }
      >
        {!isTitle && (
          <span
            aria-hidden
            className="absolute right-0 top-0"
            style={{
              width: FOLD,
              height: FOLD,
              background: `linear-gradient(to bottom left, transparent 50%, ${color}80 50%)`,
            }}
          />
        )}
        {editing ? (
          <textarea
            ref={textareaRef}
            aria-label="Text block content"
            className="nodrag nowheel nopan block w-full flex-1 resize-none bg-transparent p-0 outline-none"
            style={{ font: "inherit", color: "inherit", letterSpacing: "inherit", minHeight: "1.5em" }}
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.currentTarget.blur();
              }
              e.stopPropagation();
            }}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {block.text || <span className="text-gray-400">Double-click to edit</span>}
          </div>
        )}
      </div>

      <button
        data-export-skip
        aria-label="Delete text block"
        title="Delete"
        className="nodrag nopan absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] leading-none text-gray-500 opacity-0 shadow-sm transition-opacity hover:bg-gray-100 hover:text-gray-800 group-hover:opacity-100"
        onClick={remove}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        ×
      </button>
    </div>
  );
});
