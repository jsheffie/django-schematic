import { usePhysicsStore } from "../store/physicsStore";

const DRAWER_WIDTH = 288; // matches w-72 in SettingsDrawer

export default function SettingsHandle() {
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);

  return (
    <>
      {/* Right-edge handle — rides with the settings drawer */}
      <button
        className="fixed top-16 z-30 flex items-center justify-center bg-white border border-r-0 border-gray-200 shadow-md hover:bg-gray-50 rounded-l-md text-gray-400 hover:text-gray-600 text-sm select-none"
        style={{
          right: drawerOpen ? DRAWER_WIDTH : 0,
          width: 20,
          height: 48,
          transition: "right 0.25s ease",
        }}
        onClick={() => setDrawerOpen(!drawerOpen)}
        title={drawerOpen ? "Close settings" : "Open settings"}
      >
        {drawerOpen ? "›" : "‹"}
      </button>
    </>
  );
}
