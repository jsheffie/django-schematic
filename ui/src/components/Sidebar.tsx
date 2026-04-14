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
  const collapsedApps = useSchemaStore((s) => s.collapsedApps);
  const toggleAppCollapse = useSchemaStore((s) => s.toggleAppCollapse);
  const setAllVisible = useSchemaStore((s) => s.setAllVisible);

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
  const allVisible = allNodeIds.length > 0 && allNodeIds.every((id) => visibleNodeIds.has(id));
  const noneVisible = allNodeIds.every((id) => !visibleNodeIds.has(id));

  function handleShowAll() {
    setAllVisible(allNodeIds);
  }

  function handleHideAll() {
    setAllVisible([]);
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white overflow-y-auto text-sm h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="font-semibold text-gray-800 mb-2 text-base">Django Schematic</div>

        {/* Global show / hide all */}
        <div className="flex gap-1 mb-2">
          <button
            className="flex-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
            onClick={handleShowAll}
            disabled={allVisible}
          >
            Show all
          </button>
          <button
            className="flex-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-40"
            onClick={handleHideAll}
            disabled={noneVisible}
          >
            Hide all
          </button>
        </div>

        {/* Field expand / collapse */}
        <div className="flex gap-1">
          <button
            className="flex-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
            onClick={() => expandAll(allNodeIds)}
          >
            Expand all
          </button>
          <button
            className="flex-1 px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700"
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
          const allAppVisible = nodeIds.every((id) => visibleNodeIds.has(id));
          const someAppVisible = nodeIds.some((id) => visibleNodeIds.has(id));
          const isCollapsed = collapsedApps.has(appLabel);
          const color = appColor(appLabel);

          return (
            <div key={appLabel} className="border-b border-gray-100">
              {/* App header row */}
              <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-50">
                {/* Fold/unfold chevron */}
                <button
                  className="text-gray-400 hover:text-gray-600 shrink-0 w-4 text-center leading-none"
                  onClick={() => toggleAppCollapse(appLabel)}
                  title={isCollapsed ? "Expand app" : "Collapse app"}
                >
                  {isCollapsed ? "›" : "⌄"}
                </button>

                {/* App color dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />

                {/* App label */}
                <span
                  className="flex-1 font-medium text-gray-700 truncate cursor-pointer select-none"
                  onClick={() => toggleAppCollapse(appLabel)}
                >
                  {appLabel}
                </span>

                {/* Show / hide app models */}
                <button
                  className={`text-xs shrink-0 px-1 py-0.5 rounded ${
                    someAppVisible
                      ? "text-gray-500 hover:text-gray-800"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  onClick={() =>
                    allAppVisible
                      ? hideApp(appLabel, nodeIds)
                      : showApp(appLabel, nodeIds)
                  }
                  title={allAppVisible ? "Hide all in app" : "Show all in app"}
                >
                  {allAppVisible ? "hide" : "show"}
                </button>
              </div>

              {/* Model list — hidden when app is collapsed */}
              {!isCollapsed &&
                nodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-1.5 pl-7 pr-2 py-0.5 hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleNodeVisibility(node.id)}
                  >
                    <input
                      type="checkbox"
                      className="shrink-0 cursor-pointer"
                      checked={visibleNodeIds.has(node.id)}
                      onChange={() => toggleNodeVisibility(node.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span
                      className={`truncate flex-1 ${
                        visibleNodeIds.has(node.id)
                          ? "text-gray-700"
                          : "text-gray-400"
                      }`}
                    >
                      {node.name}
                    </span>
                    {node.tags.includes("abstract") && (
                      <span className="text-xs text-gray-400 shrink-0" title="Abstract">A</span>
                    )}
                    {node.tags.includes("proxy") && (
                      <span className="text-xs text-gray-400 shrink-0" title="Proxy">P</span>
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
