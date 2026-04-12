import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import FileMenu from "./FileMenu";

export default function Toolbar() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);

  const appMode = usePhysicsStore((s) => s.appMode);
  const applyPreset = usePhysicsStore((s) => s.applyPreset);
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);
  const sidebarOpen = usePhysicsStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePhysicsStore((s) => s.setSidebarOpen);

  const btnClass =
    "px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700";
  const activeBtnClass =
    "px-2 py-1 rounded text-xs bg-blue-600 border border-blue-600 text-white";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Sidebar toggle */}
      <button
        className={`px-2 py-1 rounded text-xs border transition-colors ${
          sidebarOpen
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
        }`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Close model list" : "Open model list"}
      >
        ☰
      </button>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Mode preset pill */}
      <div className="flex">
        <button
          className={`px-3 py-1 text-xs font-semibold rounded-l-md border transition-colors ${
            appMode === "normal"
              ? "bg-blue-600 text-white border-blue-600 z-10"
              : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
          onClick={() => applyPreset("normal")}
          title="Clean hierarchical layout with step edges"
        >
          Normal
        </button>
        <button
          className={`px-3 py-1 text-xs font-semibold rounded-r-md border border-l-0 transition-colors ${
            appMode === "fun"
              ? "bg-blue-600 text-white border-blue-600 z-10"
              : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
          }`}
          onClick={() => applyPreset("fun")}
          title="Force physics with floating edges and live drag"
        >
          Fun
        </button>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

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
        title="Left to Right"
      >
        LR
      </button>
      <button
        className={activeLayout === "dagre-tb" ? activeBtnClass : btnClass}
        onClick={() => setLayout("dagre-tb")}
        title="Top to Bottom"
      >
        TB
      </button>

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
        title="Appearance & Physics settings"
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
