import { useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";
import { useReactFlow } from "@xyflow/react";
import { exportConfig, importConfig } from "../lib/config";
import { injectTextChunk, extractTextChunk } from "../lib/pngEmbed";
import { useSchemaStore } from "../store/schemaStore";
import type { Viewport } from "@xyflow/react";

interface FilenameDialogProps {
  open: boolean;
  defaultName: string;
  extension: string;
  title: string;
  onConfirm: (basename: string) => void;
  onCancel: () => void;
}

function FilenameDialog({ open, defaultName, extension, title, onConfirm, onCancel }: FilenameDialogProps) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset + auto-select on open
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    const id = requestAnimationFrame(() => inputRef.current?.select());
    return () => cancelAnimationFrame(id);
  }, [open, defaultName]);

  // Escape to dismiss
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  function confirm() {
    const trimmed = name.trim() || defaultName;
    onConfirm(trimmed);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <label className="text-xs text-gray-600 font-medium">Filename</label>
          <div className="flex items-stretch text-sm border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirm(); } }}
              className="flex-1 px-3 py-2 text-gray-800 bg-white outline-none min-w-0"
              spellCheck={false}
            />
            <span className="flex items-center px-3 bg-gray-50 text-gray-400 text-xs border-l border-gray-300 select-none whitespace-nowrap">
              {extension}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={confirm} className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Export</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ErrorDialogProps {
  message: string | null;
  onClose: () => void;
}

function ErrorDialog({ message, onClose }: ErrorDialogProps) {
  useEffect(() => {
    if (!message) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" || e.key === "Enter") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Import error</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-xs text-gray-700">{message}</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">OK</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type DialogState = { kind: "closed" } | { kind: "json" } | { kind: "png" };

export default function FileMenu() {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setDialog({ kind: "json" });
  }

  function confirmExportJson(basename: string) {
    setDialog({ kind: "closed" });
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
    a.download = `${basename}.json`;
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
          setErrorMsg("Invalid config file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExportPng() {
    setOpen(false);
    setDialog({ kind: "png" });
  }

  async function confirmExportPng(basename: string) {
    setDialog({ kind: "closed" });
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
    a.download = `${basename}.png`;
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
          setErrorMsg("This PNG does not contain an embedded schematic config.");
          return;
        }
        try {
          const viewport = importConfig(json);
          setViewport(viewport as Viewport);
        } catch {
          setErrorMsg("Failed to restore config from PNG.");
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

      <FilenameDialog
        open={dialog.kind === "json"}
        defaultName="schematic-config"
        extension=".json"
        title="Export config"
        onConfirm={confirmExportJson}
        onCancel={() => setDialog({ kind: "closed" })}
      />
      <FilenameDialog
        open={dialog.kind === "png"}
        defaultName="schematic"
        extension=".png"
        title="Export PNG"
        onConfirm={confirmExportPng}
        onCancel={() => setDialog({ kind: "closed" })}
      />
      <ErrorDialog
        message={errorMsg}
        onClose={() => setErrorMsg(null)}
      />
    </div>
  );
}
