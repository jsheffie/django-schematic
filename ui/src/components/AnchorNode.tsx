/**
 * Invisible node standing in for a free arrow end, so the arrow is an ordinary
 * edge between two nodes. Dragging it moves the end; a grab dot shows only
 * while the arrow is selected.
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { usePhysicsStore } from "../store/physicsStore";
import { ANCHOR_SIZE, type ArrowEnd } from "../lib/annotations";
import { ARROW_COLOR_SELECTED } from "../lib/markers";

export type AnchorNodeData = Node<{ arrowId: string; end: ArrowEnd }, "anchor">;

const HIDDEN_HANDLE: React.CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  pointerEvents: "none",
};

export const AnchorNode = memo(function AnchorNode({ data }: NodeProps<AnchorNodeData>) {
  const selected = usePhysicsStore((s) => s.selectedArrowId === data.arrowId);
  return (
    <div
      className="nopan relative flex items-center justify-center"
      style={{ width: ANCHOR_SIZE, height: ANCHOR_SIZE, cursor: selected ? "grab" : "default" }}
      title={selected ? "Drag to move the arrow end" : undefined}
    >
      <Handle type="target" position={Position.Left} style={HIDDEN_HANDLE} />
      <Handle type="source" position={Position.Right} style={HIDDEN_HANDLE} />
      {selected && (
        <span
          data-export-skip
          className="block rounded-full bg-white"
          style={{ width: 8, height: 8, border: `2px solid ${ARROW_COLOR_SELECTED}` }}
        />
      )}
    </div>
  );
});
