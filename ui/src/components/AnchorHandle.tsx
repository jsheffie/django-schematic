import type { CSSProperties } from "react";
import { Handle, Position } from "@xyflow/react";

// Zero out React Flow's default 6x6 dot. The element still exists in the DOM so
// React Flow can measure its position into node.internals.handleBounds.
const HIDDEN: CSSProperties = {
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  background: "transparent",
  opacity: 0,
  pointerEvents: "none",
};

/**
 * Invisible, non-connectable handle whose only job is to let React Flow measure
 * a row's vertical position. The smart bezier edge reads it via
 * lib/smartEdge.ts (`handleY`). The parent row must be `position: relative`.
 *
 * Ids: `HEADER_HANDLE_ID` for the header, `fieldHandleId(name)` for field rows.
 */
export function AnchorHandle({ id }: { id: string }) {
  return (
    <Handle type="source" position={Position.Left} id={id} isConnectable={false} style={HIDDEN} />
  );
}
