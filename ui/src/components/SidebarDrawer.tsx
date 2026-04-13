import { usePhysicsStore } from "../store/physicsStore";
import Sidebar from "./Sidebar";
import type { SchemaGraph } from "../lib/types";

interface Props {
  schema: SchemaGraph;
}

// Must match the w-56 class on <aside> inside Sidebar.tsx
const DRAWER_WIDTH = 224;

export default function SidebarDrawer({ schema }: Props) {
  const sidebarOpen = usePhysicsStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePhysicsStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Full-screen backdrop — closes drawer on click outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer panel — slides in from the left */}
      <div
        className="fixed top-0 left-0 h-full z-30 shadow-xl"
        style={{
          width: DRAWER_WIDTH,
          transform: sidebarOpen ? "translateX(0)" : `translateX(-${DRAWER_WIDTH}px)`,
          transition: "transform 0.25s ease",
        }}
      >
        <Sidebar schema={schema} />
      </div>

      {/* Tab handle — rides the right edge of the drawer */}
      <button
        className="fixed top-16 z-30 flex items-center justify-center bg-white border border-l-0 border-gray-200 shadow-md hover:bg-gray-50 rounded-r-md text-gray-400 hover:text-gray-600 text-sm select-none"
        style={{
          left: DRAWER_WIDTH,
          width: 20,
          height: 48,
          transform: sidebarOpen ? "translateX(0)" : `translateX(-${DRAWER_WIDTH}px)`,
          transition: "transform 0.25s ease",
        }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Close model list" : "Open model list"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>
    </>
  );
}
