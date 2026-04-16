import { useRef, useState, useEffect } from "react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";

type ActiveLayout = "organic" | "dagre-lr" | "dagre-tb" | "elk";

const LAYOUT_LABELS: Record<ActiveLayout, string> = {
  organic: "Organic",
  "dagre-lr": "Left → Right",
  "dagre-tb": "Top → Bottom",
  elk: "Auto-Layout",
};

function LayoutDropdown() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const layouts: ActiveLayout[] = ["organic", "dagre-lr", "dagre-tb", "elk"];

  return (
    <div ref={ref} className="relative">
      <button
        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap"
        onClick={() => setOpen(!open)}
        title="Change layout"
      >
        {LAYOUT_LABELS[activeLayout]}
        <span className="text-gray-400 text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[130px]">
          {layouts.map((layout) => (
            <button
              key={layout}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                activeLayout === layout ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-700"
              }`}
              onClick={() => { setLayout(layout); setOpen(false); }}
            >
              {LAYOUT_LABELS[layout]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Toolbar() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);

  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);
  const liveDragPhysics = usePhysicsStore((s) => s.liveDragPhysics);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const setForceParams = usePhysicsStore((s) => s.setForceParams);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const setSettingsTab = usePhysicsStore((s) => s.setSettingsTab);

  const isOrganic = activeLayout === "organic";

  function openPhysicsSettings() {
    setSettingsTab("physics");
    setDrawerOpen(true);
  }

  const modeBtnBase = "px-2 py-1 rounded text-xs border transition-colors";
  const modeActive = "bg-blue-600 border-blue-600 text-white";
  const modeInactive = "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Layout dropdown */}
      <span className="text-xs text-gray-400 mr-0.5">Layout</span>
      <LayoutDropdown />

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Mode: Static / Live */}
      <button
        className={`${modeBtnBase} ${!physicsEnabled ? modeActive : modeInactive}`}
        onClick={() => setPhysicsEnabled(false)}
        title="Static mode — physics off, drag freely"
      >
        Static
      </button>
      <button
        className={`${modeBtnBase} ${physicsEnabled ? modeActive : modeInactive}`}
        onClick={() => setPhysicsEnabled(true)}
        title="Live mode — physics on, nodes repel and attract"
      >
        Live
      </button>

      {/* LED indicators */}
      <div className="flex items-center gap-1 ml-0.5">
        <button
          onClick={openPhysicsSettings}
          title={physicsEnabled ? "Physics enabled — click to open settings" : "Physics disabled — click to open settings"}
          className="flex items-center justify-center w-4 h-4 rounded-full focus:outline-none"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${physicsEnabled ? "bg-green-500" : "bg-gray-300"}`}
          />
        </button>
        <button
          onClick={openPhysicsSettings}
          title={liveDragPhysics ? "Live drag physics enabled — click to open settings" : "Live drag physics disabled — click to open settings"}
          className="flex items-center justify-center w-4 h-4 rounded-full focus:outline-none"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full transition-colors ${liveDragPhysics ? "bg-green-500" : "bg-gray-300"}`}
          />
        </button>
      </div>

      {/* Play / Pause */}
      <button
        className={`${modeBtnBase} ${physicsEnabled ? modeActive : modeInactive}`}
        onClick={() => setPhysicsEnabled(!physicsEnabled)}
        title={physicsEnabled ? "Pause physics (Space)" : "Resume physics (Space)"}
      >
        {physicsEnabled ? "⏸" : "▶"}
      </button>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Spacing slider — always visible, disabled when not Organic */}
      <div
        className={`flex items-center gap-1.5 transition-opacity ${isOrganic ? "opacity-100" : "opacity-40"}`}
        title={isOrganic ? "Change distance between models" : "Only available in Organic layout"}
      >
        <span className="text-xs text-gray-400 select-none">Spacing</span>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={forceParams.linkDistance}
          onChange={(e) => setForceParams({ linkDistance: Number(e.target.value) })}
          disabled={!isOrganic}
          className={`w-24 accent-blue-500 ${isOrganic ? "cursor-pointer" : "cursor-not-allowed"}`}
        />
        <span className="text-xs text-gray-500 w-8 text-right tabular-nums select-none">
          {forceParams.linkDistance}
        </span>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* File dropdown */}
      <FileMenu />
    </div>
  );
}
