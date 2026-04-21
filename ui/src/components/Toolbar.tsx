import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";

type ActiveLayout = "organic" | "dagre-lr" | "dagre-tb" | "elk";

const LAYOUT_GRID: ActiveLayout[] = ["elk", "dagre-lr", "dagre-tb", "organic"];

const LAYOUT_SHORT: Record<ActiveLayout, string> = {
  elk: "Auto",
  "dagre-lr": "L→R",
  "dagre-tb": "T→B",
  organic: "Organic",
};

const LAYOUT_FULL: Record<ActiveLayout, string> = {
  elk: "Auto-Layout",
  "dagre-lr": "Left → Right",
  "dagre-tb": "Top → Bottom",
  organic: "Organic",
};

export default function Toolbar() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);

  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const setForceParams = usePhysicsStore((s) => s.setForceParams);

  const isOrganic = activeLayout === "organic";

  function applyLayout(layout: ActiveLayout) {
    setLayout(layout);
    setPhysicsEnabled(layout === "organic");
  }

  const layoutBtnBase = "px-2 py-0.5 rounded text-xs border transition-colors leading-tight";
  const layoutActive = "bg-blue-600 border-blue-600 text-white font-medium";
  const layoutInactive = "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";

  const modeBtnBase = "px-2 py-0.5 rounded text-xs border transition-colors leading-tight";
  const modeActive = "bg-blue-600 border-blue-600 text-white font-medium";
  const modeInactive = "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Layout buttons — 2×2 grid */}
      <div className="grid grid-cols-2 gap-0.5">
        {LAYOUT_GRID.map((layout) => (
          <button
            key={layout}
            className={`${layoutBtnBase} ${activeLayout === layout ? layoutActive : layoutInactive}`}
            onClick={() => applyLayout(layout)}
            title={LAYOUT_FULL[layout]}
          >
            {LAYOUT_SHORT[layout]}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Mode section: current layout label above Static/Live */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400 leading-none whitespace-nowrap">
          {LAYOUT_FULL[activeLayout]}
        </span>
        <div className="flex gap-0.5">
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
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Spacing slider — only meaningful for Organic */}
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

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* File dropdown */}
      <FileMenu />
    </div>
  );
}
