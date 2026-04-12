import { ReactFlowProvider } from "@xyflow/react";
import SchemaCanvas from "./components/SchemaCanvas";
import Sidebar from "./components/Sidebar";
import Toolbar from "./components/Toolbar";
import HelpDialog from "./components/HelpDialog";
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
      <div className="flex h-full w-full overflow-hidden">
        <Sidebar schema={schema} />
        <div className="relative flex-1">
          <Toolbar />
          <SchemaCanvas schema={schema} />
        </div>
      </div>
      <HelpDialog />
    </ReactFlowProvider>
  );
}
