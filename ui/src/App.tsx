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
      <div className="relative h-full w-full overflow-hidden">
        <SidebarDrawer schema={schema} />
        <SettingsHandle />
        <Toolbar />
        <SchemaCanvas schema={schema} />
      </div>
      <HelpDialog />
      <AutomationBridge />
    </ReactFlowProvider>
  );
}
