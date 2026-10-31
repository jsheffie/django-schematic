/**
 * Exposes window.__schematic for headless Playwright automation.
 * Provides importConfig and exportPngBytes so CI can re-render diagrams
 * without clicking through the UI.
 */
import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Viewport } from "@xyflow/react";
import { importConfig } from "../lib/config";
import { captureCanvasPng } from "../lib/pngExport";
import { useSchemaStore } from "../store/schemaStore";
import type { SchemaGraph } from "../lib/types";
import { hasSchemaChanges } from "../lib/schemaChanges";

export default function AutomationBridge({ schema }: { schema: SchemaGraph }) {
  const { getNodes, setNodes, setViewport, fitView } = useReactFlow();
  const setLayout = useSchemaStore((s) => s.setLayout);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__schematic = {
      importConfig(json: string) {
        const result = importConfig(json, schema);
        setViewport({ x: result.x, y: result.y, zoom: result.zoom } as Viewport);
        if (hasSchemaChanges(result.schemaChanges)) {
          console.warn("[schematic] config was saved against a different schema:", result.schemaChanges);
        }
        return result.canvasSize ?? null;
      },

      applyLayout(layout: "organic" | "dagre-lr" | "dagre-tb" | "elk") {
        setLayout(layout);
      },

      waitForRender(): Promise<void> {
        return new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
      },

      async exportPngBytes(): Promise<string> {
        await fitView({ padding: 0.1, duration: 0 });
        const png = await captureCanvasPng({ getNodes, setNodes }, schema);

        // Chunked btoa to avoid call stack overflow on large PNGs
        let result = "";
        for (let i = 0; i < png.length; i += 8192) {
          result += String.fromCharCode(...png.subarray(i, i + 8192));
        }
        return btoa(result);
      },
    };
  }, [schema, getNodes, setNodes, setViewport, setLayout]);

  return null;
}
