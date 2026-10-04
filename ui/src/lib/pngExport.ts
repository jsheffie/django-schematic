/**
 * Canvas → PNG capture shared by the File menu and the headless automation
 * bridge. Returns PNG bytes with the current view config already embedded in a
 * `schematic` tEXt chunk (see pngEmbed.ts).
 */
import { toPng } from "html-to-image";
import type { Node } from "@xyflow/react";
import { collectModelPositions, exportConfig } from "./config";
import { injectTextChunk } from "./pngEmbed";
import { usePhysicsStore } from "../store/physicsStore";

/** UI chrome that must not end up in the image. */
export function pngExportFilter(el: Element): boolean {
  const cls = el.classList;
  if (!cls) return true;
  if (cls.contains("react-flow__minimap") || cls.contains("minimap-close")) return false;
  // React Flow's resize handles and node toolbars.
  if (cls.contains("react-flow__resize-control") || cls.contains("react-flow__node-toolbar")) return false;
  return !(typeof el.hasAttribute === "function" && el.hasAttribute("data-export-skip"));
}

const twoFrames = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

export interface CanvasHandle {
  getNodes(): Node[];
  setNodes(updater: (nodes: Node[]) => Node[]): void;
}

export async function captureCanvasPng(rf: CanvasHandle): Promise<Uint8Array> {
  // Selection strokes, resize handles and an open text editor are not part of
  // the diagram: clear them and let React Flow repaint before capturing.
  rf.setNodes((nodes) => nodes.map((n) => (n.selected ? { ...n, selected: false } : n)));
  const ui = usePhysicsStore.getState();
  ui.setSelectedArrow(null);
  ui.setEditingTextBlock(null);
  await twoFrames();

  const json = exportConfig(collectModelPositions(rf.getNodes()));

  const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
  if (!flowEl) throw new Error("React Flow element not found");

  const dataUrl = await toPng(flowEl, { backgroundColor: "#ffffff", filter: pngExportFilter });

  const binary = atob(dataUrl.split(",")[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return injectTextChunk(bytes, "schematic", json);
}
