import { usePhysicsStore } from "../store/physicsStore";
import Sidebar from "./Sidebar";
import type { SchemaGraph } from "../lib/types";

interface Props {
  schema: SchemaGraph;
}

export default function SidebarDrawer({ schema }: Props) {
  const sidebarOpen = usePhysicsStore((s) => s.sidebarOpen);
  const setSidebarOpen = usePhysicsStore((s) => s.setSidebarOpen);

  return (
    <div
      className="absolute top-0 left-0 h-full z-20 flex"
      style={{ pointerEvents: sidebarOpen ? "auto" : "none" }}
    >
      {/* Backdrop — closes drawer on click outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0"
          style={{ pointerEvents: "auto" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer panel — slides in from the left */}
      <div
        className="relative h-full shadow-xl"
        style={{
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          pointerEvents: "auto",
        }}
      >
        <Sidebar schema={schema} />
      </div>
    </div>
  );
}
