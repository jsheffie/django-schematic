/**
 * Exposes window.__schematic for headless Playwright automation.
 * Provides importConfig and exportPngBytes so CI can re-render diagrams
 * without clicking through the UI.
 */
import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { toPng } from "html-to-image";
import type { Viewport } from "@xyflow/react";
import { exportConfig, importConfig } from "../lib/config";
import { injectTextChunk } from "../lib/pngEmbed";

export default function AutomationBridge() {
  const { getNodes, setViewport, fitView } = useReactFlow();

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__schematic = {
      importConfig(json: string) {
        const result = importConfig(json);
        setViewport({ x: result.x, y: result.y, zoom: result.zoom } as Viewport);
        return result.canvasSize ?? null;
      },

      async exportPngBytes(): Promise<string> {
        await fitView({ padding: 0.1, duration: 0 });
        const positions: Record<string, { x: number; y: number }> = {};
        getNodes().forEach((n) => {
          positions[n.id] = n.position;
        });
        const json = exportConfig(positions);

        const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
        if (!flowEl) throw new Error("React Flow element not found");

        const dataUrl = await toPng(flowEl, {
          backgroundColor: "#ffffff",
          filter: (el) =>
            !el.classList?.contains("react-flow__minimap") &&
            !el.classList?.contains("minimap-close"),
        });

        const base64 = dataUrl.split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        const png = injectTextChunk(bytes, "schematic", json);

        // Chunked btoa to avoid call stack overflow on large PNGs
        let result = "";
        for (let i = 0; i < png.length; i += 8192) {
          result += String.fromCharCode(...png.subarray(i, i + 8192));
        }
        return btoa(result);
      },
    };
  }, [getNodes, setViewport]);

  return null;
}
