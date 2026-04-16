import { useMemo } from "react";
import type { ReactNode } from "react";
import type { SchemaGraph, NodeInfo } from "../lib/types";
import { useSchemaStore } from "../store/schemaStore";
import { appColor } from "../lib/colors";

interface Props {
  schema: SchemaGraph;
}

// ─── Inline SVG icon components ──────────────────────────────────────────────

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconEyeSlash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function IconCompress() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="4 14 10 14 10 20"/>
      <polyline points="20 10 14 10 14 4"/>
      <line x1="10" y1="14" x2="3" y2="21"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>
  );
}

function IconExpandArrows() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="15 3 21 3 21 9"/>
      <polyline points="9 21 3 21 3 15"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
      <line x1="3" y1="21" x2="10" y2="14"/>
    </svg>
  );
}

function IconChevronUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function IconVerticalExpand() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="7 10 12 5 17 10"/>
      <polyline points="7 14 12 19 17 14"/>
    </svg>
  );
}

// ─── Reusable icon button ─────────────────────────────────────────────────────

interface IconButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: ReactNode;
}

function IconButton({ onClick, title, disabled = false, children }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Sidebar({ schema }: Props) {
  const visibleNodeIds = useSchemaStore((s) => s.visibleNodeIds);
  const expandedNodeIds = useSchemaStore((s) => s.expandedNodeIds);
  const toggleNodeVisibility = useSchemaStore((s) => s.toggleNodeVisibility);
  const showApp = useSchemaStore((s) => s.showApp);
  const hideApp = useSchemaStore((s) => s.hideApp);
  const expandAll = useSchemaStore((s) => s.expandAll);
  const collapseAll = useSchemaStore((s) => s.collapseAll);
  const expandNodes = useSchemaStore((s) => s.expandNodes);
  const collapseNodes = useSchemaStore((s) => s.collapseNodes);
  const collapsedApps = useSchemaStore((s) => s.collapsedApps);
  const toggleAppCollapse = useSchemaStore((s) => s.toggleAppCollapse);
  const collapseAllApps = useSchemaStore((s) => s.collapseAllApps);
  const expandAllApps = useSchemaStore((s) => s.expandAllApps);
  const setAllVisible = useSchemaStore((s) => s.setAllVisible);

  // Group nodes by app label, preserving insertion order
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
  const allAppLabels = Array.from(byApp.keys());

  const allVisible =
    allNodeIds.length > 0 && allNodeIds.every((id) => visibleNodeIds.has(id));
  const noneVisible =
    allNodeIds.length > 0 && allNodeIds.every((id) => !visibleNodeIds.has(id));

  return (
    <aside className="flex flex-col w-72 shrink-0 border-r border-gray-200 bg-white text-sm h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-gray-200 shrink-0">
        <div className="font-semibold text-gray-800 mb-2.5 text-base tracking-tight">
          Django Schematic
        </div>

        {/* Global icon toolbar — 6 buttons in one row */}
        <div className="flex items-center gap-0.5">
          <IconButton
            onClick={() => setAllVisible([])}
            title="Hide all"
            disabled={noneVisible}
          >
            <IconEyeSlash />
          </IconButton>

          <IconButton
            onClick={() => setAllVisible(allNodeIds)}
            title="Show all"
            disabled={allVisible}
          >
            <IconEye />
          </IconButton>

          <span className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />

          <IconButton
            onClick={() => collapseAllApps(allAppLabels)}
            title="Collapse all apps"
          >
            <IconCompress />
          </IconButton>

          <IconButton
            onClick={() => expandAllApps()}
            title="Expand all apps"
          >
            <IconExpandArrows />
          </IconButton>

          <span className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />

          <IconButton
            onClick={() => collapseAll()}
            title="Close model details"
          >
            <IconChevronUp />
          </IconButton>

          <IconButton
            onClick={() => expandAll(allNodeIds)}
            title="Open model details"
          >
            <IconChevronDown />
          </IconButton>
        </div>
      </div>

      {/* ── App groups ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(byApp.entries()).map(([appLabel, nodes]) => {
          const nodeIds = nodes.map((n) => n.id);
          const noneAppVisible = nodeIds.every((id) => !visibleNodeIds.has(id));
          const allAppExpanded = nodeIds.every((id) => expandedNodeIds.has(id));
          const isCollapsed = collapsedApps.has(appLabel);
          const color = appColor(appLabel);
          // Full dotted name (e.g. "django.contrib.auth") when available
          const displayName = schema.app_names?.[appLabel] ?? appLabel;

          return (
            <div key={appLabel} className="border-b border-gray-100 last:border-b-0">

              {/* ── App header row ──────────────────────────────────────────── */}
              <div className="flex items-center gap-1 px-1.5 py-1 hover:bg-gray-50">

                {/* Fold/unfold chevron */}
                <button
                  className="flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
                  onClick={() => toggleAppCollapse(appLabel)}
                  title={isCollapsed ? "Expand app" : "Collapse app"}
                >
                  {isCollapsed ? (
                    <IconChevronRight />
                  ) : (
                    <IconChevronDown />
                  )}
                </button>

                {/* App name — full dotted path, styled in app color */}
                <span
                  className="flex-1 font-bold truncate cursor-pointer select-none leading-tight min-w-0"
                  style={{ color }}
                  onClick={() => toggleAppCollapse(appLabel)}
                  title={displayName}
                >
                  {displayName}
                </span>

                {/* Expand/collapse field details for this app's nodes */}
                <button
                  className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0 transition-colors"
                  onClick={() =>
                    allAppExpanded ? collapseNodes(nodeIds) : expandNodes(nodeIds)
                  }
                  title={allAppExpanded ? "Close model details" : "Open model details"}
                >
                  <IconVerticalExpand />
                </button>

                {/* Show / hide all models in this app */}
                <button
                  className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 shrink-0 transition-colors"
                  onClick={() =>
                    noneAppVisible
                      ? showApp(appLabel, nodeIds)
                      : hideApp(appLabel, nodeIds)
                  }
                  title={noneAppVisible ? "Show app" : "Hide app"}
                >
                  {noneAppVisible ? <IconEyeSlash /> : <IconEye />}
                </button>
              </div>

              {/* ── Model list — hidden when app is collapsed ───────────────── */}
              {!isCollapsed &&
                nodes.map((node) => {
                  const isVisible = visibleNodeIds.has(node.id);
                  return (
                    <div
                      key={node.id}
                      className="flex items-center gap-1.5 pl-6 pr-1.5 py-0.5 hover:bg-gray-50"
                    >
                      {/* Model name */}
                      <span
                        className={`flex-1 truncate leading-5 min-w-0 ${
                          isVisible ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {node.name}
                      </span>

                      {/* Abstract / proxy badges */}
                      {node.tags.includes("abstract") && (
                        <span
                          className="text-xs text-gray-400 shrink-0 font-medium"
                          title="Abstract"
                        >
                          A
                        </span>
                      )}
                      {node.tags.includes("proxy") && (
                        <span
                          className="text-xs text-gray-400 shrink-0 font-medium"
                          title="Proxy"
                        >
                          P
                        </span>
                      )}

                      {/* Visibility toggle — always visible when hidden, fades in on row hover when visible */}
                      <button
                        className="flex items-center justify-center w-6 h-6 rounded shrink-0 transition-colors hover:bg-gray-100 hover:text-gray-700 text-gray-400"
                        onClick={() => toggleNodeVisibility(node.id)}
                        title={isVisible ? "Hide model" : "Show model"}
                      >
                        {isVisible ? <IconEye /> : <IconEyeSlash />}
                      </button>
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
