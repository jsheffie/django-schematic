/**
 * Actions shared by the toolbar buttons and the keyboard shortcuts (issue #100).
 * Must be used inside the ReactFlowProvider: the viewport centre comes from
 * React Flow's screenToFlowPosition.
 */
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { defaultTextBlock, type TextBlockStyle } from "../lib/annotations";

export function useAnnotationActions() {
  const { screenToFlowPosition } = useReactFlow();
  const addTextBlock = useSchemaStore((s) => s.addTextBlock);

  /** Adds an empty block centred in the viewport and opens it for editing. */
  const addTextBlockAtCenter = useCallback(
    (style: TextBlockStyle = "note"): string => {
      const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      const id = addTextBlock(defaultTextBlock(style, center));
      const ui = usePhysicsStore.getState();
      ui.setAnnotationTool(null);
      ui.setSelectedArrow(null);
      ui.setEditingTextBlock(id);
      return id;
    },
    [screenToFlowPosition, addTextBlock],
  );

  const toggleArrowTool = useCallback(() => {
    const ui = usePhysicsStore.getState();
    ui.setAnnotationTool(ui.annotationTool === "arrow" ? null : "arrow");
  }, []);

  return { addTextBlockAtCenter, toggleArrowTool };
}
