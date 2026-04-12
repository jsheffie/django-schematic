import { ReactFlowProvider } from "@xyflow/react";
import SchemaCanvas from "./components/SchemaCanvas";
import SidebarDrawer from "./components/SidebarDrawer";
import Toolbar from "./components/Toolbar";
import HelpDialog from "./components/HelpDialog";
import { useSchema } from "./hooks/useSchema";
import { usePhysicsStore } from "./store/physicsStore";

export default function App() {
  const { schema, loading, error } = useSchema();
  const sidebarOpen = usePhysicsStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePhysicsStore((s) => s.setSidebarOpen);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading schema…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  if (!schema) return null;

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full overflow-hidden">
        {/* Sidebar slides in from left as an overlay */}
        <SidebarDrawer schema={schema} />

        {/* Sidebar toggle button — top-left corner */}
        <button
          className={`absolute top-2 left-2 z-30 px-2 py-1.5 rounded border text-xs transition-colors ${
            sidebarOpen
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
          }`}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? "Close model list" : "Open model list"}
        >
          ☰
        </button>

        {/* Toolbar and canvas fill the full viewport */}
        <Toolbar />
        <SchemaCanvas schema={schema} />
      </div>
      <HelpDialog />
    </ReactFlowProvider>
  );
}
