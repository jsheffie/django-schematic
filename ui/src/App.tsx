import { ReactFlowProvider } from "@xyflow/react";
import SchemaCanvas from "./components/SchemaCanvas";
import SidebarDrawer from "./components/SidebarDrawer";
import Toolbar from "./components/Toolbar";
import SettingsHandle from "./components/SettingsHandle";
import HelpDialog from "./components/HelpDialog";
import AutomationBridge from "./components/AutomationBridge";
import { useSchema } from "./hooks/useSchema";

export default function App() {
  const { schema, loading, error } = useSchema();

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
      {/* overflow-clip, not overflow-hidden: a hidden box can still be scrolled, and
          focusing a control in the closed settings drawer (parked off the right
          edge) would scroll the whole app sideways. */}
      <div className="relative h-full w-full overflow-clip">
        <SidebarDrawer schema={schema} />
        <SettingsHandle />
        <Toolbar schema={schema} />
        <SchemaCanvas schema={schema} />
      </div>
      <HelpDialog />
      <AutomationBridge />
    </ReactFlowProvider>
  );
}
