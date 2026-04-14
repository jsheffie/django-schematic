import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";

export default function Toolbar() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);

  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);
  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);

  const btnClass =
    "px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700";
  const activeBtnClass =
    "px-2 py-1 rounded text-xs bg-blue-600 border border-blue-600 text-white";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Layout switcher */}
      <span className="text-xs text-gray-400 mr-0.5">Layout</span>
      <button
        className={activeLayout === "force" ? activeBtnClass : btnClass}
        onClick={() => setLayout("force")}
      >
        Force
      </button>
      <button
        className={activeLayout === "dagre-lr" ? activeBtnClass : btnClass}
        onClick={() => setLayout("dagre-lr")}
      >
        Left → Right
      </button>
      <button
        className={activeLayout === "dagre-tb" ? activeBtnClass : btnClass}
        onClick={() => setLayout("dagre-tb")}
      >
        Top → Bottom
      </button>
      <button
        className={activeLayout === "elk" ? activeBtnClass : btnClass}
        onClick={() => setLayout("elk")}
      >
        Auto-Layout
      </button>

      {/* Physics pause/resume — only shown for force layout */}
      {activeLayout === "force" && (
        <>
          <div className="w-px h-4 bg-gray-200 mx-0.5" />
          <button
            className={physicsEnabled ? activeBtnClass : btnClass}
            onClick={() => setPhysicsEnabled(!physicsEnabled)}
            title={physicsEnabled ? "Pause physics (Space)" : "Resume physics (Space)"}
          >
            {physicsEnabled ? "⏸" : "▶"}
          </button>
        </>
      )}

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* File dropdown */}
      <FileMenu />

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Settings drawer toggle */}
      <button
        className={`px-2 py-1 rounded text-xs border transition-colors ${
          drawerOpen
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
        }`}
        onClick={() => setDrawerOpen(!drawerOpen)}
        title="Settings"
      >
        ⚙
      </button>

      {/* Help */}
      <button
        className="px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700"
        onClick={() => setHelpOpen(true)}
        title="Help"
      >
        ?
      </button>
    </div>
  );
}
