import { useRef, useState, useEffect } from "react";
import { exportConfig, importConfig } from "../lib/config";
import { useSchemaStore } from "../store/schemaStore";

export default function FileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetConfig = useSchemaStore((s) => s.resetConfig);

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
    const json = exportConfig();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schematic-config.json";
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
          importConfig(ev.target?.result as string);
        } catch {
          alert("Invalid config file");
        }
      };
      reader.readAsText(file);
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
