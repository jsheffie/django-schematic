import { useMemo } from "react";
import type { SchemaGraph, NodeInfo } from "../lib/types";
import { useSchemaStore } from "../store/schemaStore";
import { appColor } from "../lib/colors";

interface Props {
  schema: SchemaGraph;
}

export default function Sidebar({ schema }: Props) {
  const visibleNodeIds = useSchemaStore((s) => s.visibleNodeIds);
  const toggleNodeVisibility = useSchemaStore((s) => s.toggleNodeVisibility);
  const showApp = useSchemaStore((s) => s.showApp);
  const hideApp = useSchemaStore((s) => s.hideApp);
  const expandAll = useSchemaStore((s) => s.expandAll);
  const collapseAll = useSchemaStore((s) => s.collapseAll);

  // Group nodes by app
  const byApp = useMemo(() => {
    const groups = new Map<string, NodeInfo[]>();
    for (const node of schema.nodes) {
      const group = groups.get(node.app_label) ?? [];
      group.push(node);
      groups.set(node.app_label, group);
    }
    return groups;
  }, [schema.nodes]);

  const allNodeIds = schema.nodes.map((n) => n.id);

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto text-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="font-semibold text-gray-800 mb-2">Django Schematic</div>
        <div className="flex gap-1 text-xs">
          <button
            className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => expandAll(allNodeIds)}
          >
            Expand all
          </button>
          <button
            className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => collapseAll()}
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* App groups */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(byApp.entries()).map(([appLabel, nodes]) => {
          const nodeIds = nodes.map((n) => n.id);
          const allVisible = nodeIds.every((id) => visibleNodeIds.has(id));
          const color = appColor(appLabel);

          return (
            <div key={appLabel} className="border-b border-gray-100">
              {/* App header */}
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="flex-1 font-medium text-gray-700 truncate">
                  {appLabel}
                </span>
                <button
                  className="text-xs text-gray-400 hover:text-gray-700"
                  onClick={() =>
                    allVisible
                      ? hideApp(appLabel, nodeIds)
                      : showApp(appLabel, nodeIds)
                  }
                >
                  {allVisible ? "hide" : "show"}
                </button>
              </div>

              {/* Model list */}
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-1 pl-5 pr-2 py-0.5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleNodeVisibility(node.id)}
                >
                  <input
                    type="checkbox"
                    className="shrink-0"
                    checked={visibleNodeIds.has(node.id)}
                    onChange={() => toggleNodeVisibility(node.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    className={`truncate ${
                      visibleNodeIds.has(node.id)
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {node.name}
                  </span>
                  {node.tags.includes("abstract") && (
                    <span className="text-xs text-gray-400 shrink-0">A</span>
                  )}
                  {node.tags.includes("proxy") && (
                    <span className="text-xs text-gray-400 shrink-0">P</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
