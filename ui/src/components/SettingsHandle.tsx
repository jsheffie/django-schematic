import { usePhysicsStore } from "../store/physicsStore";

const DRAWER_WIDTH = 288; // matches w-72 in SettingsDrawer

export default function SettingsHandle() {
  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);
  const setSettingsTab = usePhysicsStore((s) => s.setSettingsTab);

  function openSettings() {
    setSettingsTab("appearance");
    setDrawerOpen(true);
  }

  return (
    <>
      {/* Top-right icon cluster */}
      <div className="fixed top-3 right-16 z-30 flex items-center gap-1">
        <button
          onClick={openSettings}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            drawerOpen
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow"
          }`}
          title="Settings"
        >
          ⚙
        </button>
        <button
          onClick={() => setHelpOpen(true)}
          className="px-2 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow"
          title="Help"
        >
          ?
        </button>
      </div>

      {/* Right-edge handle — rides with the settings drawer */}
      <button
        className="fixed top-1/2 -translate-y-1/2 z-30 flex items-center justify-center bg-white border border-r-0 border-gray-200 shadow-md hover:bg-gray-50 rounded-l-md text-gray-400 hover:text-gray-600 text-sm select-none"
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
