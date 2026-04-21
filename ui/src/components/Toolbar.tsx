import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";

function IconBtn({ onClick, title, active, children }: {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
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
  const setLiveDragPhysics = usePhysicsStore((s) => s.setLiveDragPhysics);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const setForceParams = usePhysicsStore((s) => s.setForceParams);
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
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
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Layout section */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400 leading-none self-start">Layout</span>
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

      <div className="w-px h-8 bg-gray-200 mx-0.5" />

      {/* Settings + Help + File cluster */}
      <div className="flex flex-col items-stretch gap-0.5">
        <div className="flex gap-0.5">
          <IconBtn
            onClick={() => { setSettingsTab("appearance"); setDrawerOpen(!drawerOpen); }}
            title="Settings"
            active={drawerOpen}
          >
            ⚙
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
