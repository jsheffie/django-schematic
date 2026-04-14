import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { useReactFlow } from "@xyflow/react";
import { exportConfig, importConfig } from "../lib/config";
import { injectTextChunk, extractTextChunk } from "../lib/pngEmbed";
import { useSchemaStore } from "../store/schemaStore";
import type { Viewport } from "@xyflow/react";

export default function FileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetConfig = useSchemaStore((s) => s.resetConfig);
  const { getNodes, setViewport } = useReactFlow();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleExport() {
    setOpen(false);
    const name = window.prompt("Save config as:", "schematic-config");
    if (name === null) return; // user cancelled
    // Capture all current display positions, not just manually pinned ones
    const positions: Record<string, { x: number; y: number }> = {};
    getNodes().forEach((n) => {
      positions[n.id] = n.position;
    });
    const json = exportConfig(positions);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\.json$/i, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    setOpen(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const viewport = importConfig(ev.target?.result as string);
          // Restore the exact viewport saved at export time
          setViewport(viewport as Viewport);
        } catch {
          alert("Invalid config file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function handleExportPng() {
    setOpen(false);
    const positions: Record<string, { x: number; y: number }> = {};
    getNodes().forEach((n) => {
      positions[n.id] = n.position;
    });
    const json = exportConfig(positions);

    const flowEl = document.querySelector(".react-flow") as HTMLElement | null;
    if (!flowEl) return;

    const dataUrl = await toPng(flowEl, { backgroundColor: "#ffffff" });

    // Convert base64 dataURL → Uint8Array
    const base64 = dataUrl.split(",")[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const pngWithMeta = injectTextChunk(bytes, "schematic", json);
    const blob = new Blob([pngWithMeta.buffer as ArrayBuffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schematic.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportPng() {
    setOpen(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,image/png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const buffer = ev.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);
        const json = extractTextChunk(bytes, "schematic");
        if (!json) {
          alert("This PNG does not contain an embedded schematic config.");
          return;
        }
        try {
          const viewport = importConfig(json);
          setViewport(viewport as Viewport);
        } catch {
          alert("Failed to restore config from PNG.");
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }

  function handleReset() {
    setOpen(false);
    resetConfig();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        className={`px-2 py-1 rounded text-xs border transition-colors flex items-center gap-0.5 ${
          open
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
        }`}
        onClick={() => setOpen((v) => !v)}
        title="File operations"
      >
        File
        <span className="text-[9px] ml-0.5">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[110px] py-1">
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleExport}
          >
            Export config
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleImport}
          >
            Import config
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleExportPng}
          >
            Export PNG
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleImportPng}
          >
            Import PNG
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
