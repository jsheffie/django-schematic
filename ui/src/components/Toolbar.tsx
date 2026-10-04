import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";
import { IconPanelLeft, IconPanelRight, IconSortByType } from "./icons";
import type { SchemaGraph } from "../lib/types";

function IconBtn({ onClick, title, label, active, children }: {
  onClick: () => void;
  title: string;
  /** Accessible name when `title` is a longer explanation rather than the control's name. */
  label?: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={label}
      className={`w-7 h-7 flex items-center justify-center rounded text-sm border transition-colors ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600"
      }`}
    >
      {children}
    </button>
  );
}

type ActiveLayout = "organic" | "dagre-lr" | "dagre-tb" | "elk";

// Auto and Organic on top (distinct engines); L→R and T→B below (dagre direction variants)
const LAYOUT_GRID: ActiveLayout[] = ["elk", "organic", "dagre-lr", "dagre-tb"];

const LAYOUT_SHORT: Record<ActiveLayout, string> = {
  elk: "Auto",
  "dagre-lr": "L→R",
  "dagre-tb": "T→B",
  organic: "Organic",
};

// Tooltip per layout. Names the engine so the four buttons are distinguishable
// by more than their arrow; wording mirrors the Layout section of HelpDialog.
const LAYOUT_TOOLTIP: Record<ActiveLayout, string> = {
  elk: "Auto-Layout: ELK layered algorithm, left to right. Async; best for large schemas.",
  organic: "Organic: d3-force physics simulation. The only layout where Node Spacing and Live mode apply.",
  "dagre-lr": "Left → Right: dagre hierarchical layout (rankdir LR). Synchronous.",
  "dagre-tb": "Top → Bottom: dagre hierarchical layout (rankdir TB). Same engine as L→R, direction only.",
};

export default function Toolbar({ schema }: { schema: SchemaGraph }) {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);
  const sortAllFieldsByType = useSchemaStore((s) => s.sortAllFieldsByType);

  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);
  const setLiveDragPhysics = usePhysicsStore((s) => s.setLiveDragPhysics);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const setForceParams = usePhysicsStore((s) => s.setForceParams);
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const sidebarOpen = usePhysicsStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePhysicsStore((s) => s.setSidebarOpen);
  const setSettingsTab = usePhysicsStore((s) => s.setSettingsTab);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);

  const isOrganic = activeLayout === "organic";

  function applyLayout(layout: ActiveLayout) {
    setLayout(layout);
    setPhysicsEnabled(layout === "organic");
    setLiveDragPhysics(layout === "organic");
  }

  const layoutBtnBase = "px-2 py-0.5 rounded text-xs border transition-colors leading-tight";
  const layoutActive = "bg-blue-600 border-blue-600 text-white font-medium";
  const layoutInactive = "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";

  const modeBtnBase = "px-2 py-0.5 rounded text-xs border transition-colors leading-tight";
  const modeActive = "bg-blue-600 border-blue-600 text-white font-medium";
  const modeInactive = "bg-white border-gray-200 hover:bg-gray-50 text-gray-700";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Layout section */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400 leading-none self-start">Layout</span>
        <div className="grid grid-cols-2 gap-0.5">
          {LAYOUT_GRID.map((layout) => (
            <button
              key={layout}
              className={`${layoutBtnBase} ${activeLayout === layout ? layoutActive : layoutInactive}`}
              onClick={() => applyLayout(layout)}
              title={LAYOUT_TOOLTIP[layout]}
            >
              {LAYOUT_SHORT[layout]}
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Mode section */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400 leading-none self-start">Mode</span>
        <div className="flex flex-col gap-0.5">
          <button
            className={`${modeBtnBase} ${!physicsEnabled ? modeActive : modeInactive}`}
            onClick={() => setPhysicsEnabled(false)}
            title="Static mode — physics off, drag freely"
          >
            Static
          </button>
          <button
            className={`${modeBtnBase} ${physicsEnabled ? modeActive : modeInactive}`}
            onClick={() => applyLayout("organic")}
            title="Live mode — switches to Organic layout with physics on"
          >
            Live
          </button>
        </div>
      </div>

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Spacing slider — only meaningful for Organic */}
      <div
        className={`flex flex-col gap-0.5 transition-opacity ${isOrganic ? "opacity-100" : "opacity-40"}`}
        title={isOrganic ? "Change distance between connected nodes" : "Only available in Organic layout"}
      >
        <span className="text-[10px] text-gray-400 leading-none">Node Spacing</span>
        <div className="flex items-center gap-1.5">
          <input
            type="range"
            min={50}
            max={800}
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
      </div>

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Sort all + drawers + Help + File cluster */}
      <div className="flex flex-col items-stretch gap-0.5">
        <div className="flex gap-0.5">
          <IconBtn
            onClick={() => sortAllFieldsByType(schema.nodes)}
            label="Sort all tables by type"
            title="Sort fields in every table by type: primary key, relations, fields grouped by type, booleans, dates and times last. Re-running replaces manual reorders."
          >
            <IconSortByType />
          </IconBtn>
          <IconBtn
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Models"
            active={sidebarOpen}
          >
            <IconPanelLeft open={sidebarOpen} />
          </IconBtn>
          <IconBtn
            onClick={() => { setSettingsTab("appearance"); setDrawerOpen(!drawerOpen); }}
            title="Settings"
            active={drawerOpen}
          >
            <IconPanelRight open={drawerOpen} />
          </IconBtn>
          <IconBtn
            onClick={() => setHelpOpen(true)}
            title="Help"
          >
            ?
          </IconBtn>
        </div>
        <FileMenu />
      </div>
    </div>
  );
}
