import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { exportConfig, importConfig } from "../lib/config";

export default function Toolbar() {
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setLayout = useSchemaStore((s) => s.setLayout);
  const resetConfig = useSchemaStore((s) => s.resetConfig);

  const appMode = usePhysicsStore((s) => s.appMode);
  const applyPreset = usePhysicsStore((s) => s.applyPreset);
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);

  function handleExport() {
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

  const btnClass =
    "px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700";
  const activeBtnClass =
    "px-2 py-1 rounded text-xs bg-blue-600 border border-blue-600 text-white";

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow px-2 py-1.5">
      {/* Mode preset pill — inactive uses bg-gray-100 so both buttons are visible */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden mr-1">
        <button
          className={`px-2.5 py-1 text-xs font-medium border-r border-gray-200 transition-colors ${
            appMode === "normal"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => applyPreset("normal")}
          title="Clean hierarchical layout with precise step edges"
        >
          Normal
        </button>
        <button
          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
            appMode === "fun"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          onClick={() => applyPreset("fun")}
          title="Force physics with smooth edges and live drag"
        >
          Fun
        </button>
      </div>

      <div className="w-px h-4 bg-gray-200 mx-0.5" />

      {/* Layout switcher */}
      <span className="text-xs text-gray-400 mr-1">Layout</span>
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

      <div className="w-px h-4 bg-gray-200 mx-1" />

      {/* Config */}
      <button className={btnClass} onClick={handleExport}>
        Export
      </button>
      <button className={btnClass} onClick={handleImport}>
        Import
      </button>
      <button className={btnClass} onClick={resetConfig}>
        Reset
      </button>

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
