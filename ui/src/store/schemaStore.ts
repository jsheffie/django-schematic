import { create } from "zustand";

interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

interface SchemaStore {
  visibleNodeIds: Set<string>;
  expandedNodeIds: Set<string>;
  pinnedPositions: Map<string, { x: number; y: number }>;
  collapsedApps: Set<string>;
  viewportState: ViewportState;
  activeLayout: "organic" | "dagre-lr" | "dagre-tb" | "elk";

  // Node visibility
  setAllVisible: (ids: string[]) => void;
  toggleNodeVisibility: (id: string) => void;
  showApp: (appLabel: string, nodeIds: string[]) => void;
  hideApp: (appLabel: string, nodeIds: string[]) => void;

  // Field expansion
  toggleFieldExpansion: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
  expandNodes: (ids: string[]) => void;   // add these ids without touching others
  collapseNodes: (ids: string[]) => void; // remove these ids without touching others

  // App collapse (group node)
  toggleAppCollapse: (appLabel: string) => void;
  collapseAllApps: (labels: string[]) => void;
  expandAllApps: () => void;

  // Pinning
  pinNode: (id: string, pos: { x: number; y: number }) => void;
  unpinNode: (id: string) => void;

  // Viewport
  setViewport: (v: ViewportState) => void;

  // Layout
  setLayout: (layout: SchemaStore["activeLayout"]) => void;

  // Import signal
  importId: number;
  bumpImportId: () => void;

  // Reset
  resetConfig: () => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  visibleNodeIds: new Set(),
  expandedNodeIds: new Set(),
  pinnedPositions: new Map(),
  collapsedApps: new Set(),
  viewportState: { x: 0, y: 0, zoom: 1 },
  activeLayout: "elk",
  importId: 0,

  setAllVisible: (ids) => set({ visibleNodeIds: new Set(ids) }),

  toggleNodeVisibility: (id) =>
    set((s) => {
      const next = new Set(s.visibleNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { visibleNodeIds: next };
    }),

  showApp: (_, nodeIds) =>
    set((s) => {
      const next = new Set(s.visibleNodeIds);
      nodeIds.forEach((id) => next.add(id));
      return { visibleNodeIds: next };
    }),

  hideApp: (_, nodeIds) =>
    set((s) => {
      const next = new Set(s.visibleNodeIds);
      nodeIds.forEach((id) => next.delete(id));
      return { visibleNodeIds: next };
    }),

  toggleFieldExpansion: (id) =>
    set((s) => {
      const next = new Set(s.expandedNodeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedNodeIds: next };
    }),

  expandAll: (ids) => set({ expandedNodeIds: new Set(ids) }),
  collapseAll: () => set({ expandedNodeIds: new Set() }),

  expandNodes: (ids) =>
    set((s) => {
      const next = new Set(s.expandedNodeIds);
      ids.forEach((id) => next.add(id));
      return { expandedNodeIds: next };
    }),

  collapseNodes: (ids) =>
    set((s) => {
      const next = new Set(s.expandedNodeIds);
      ids.forEach((id) => next.delete(id));
      return { expandedNodeIds: next };
    }),

  toggleAppCollapse: (appLabel) =>
    set((s) => {
      const next = new Set(s.collapsedApps);
      if (next.has(appLabel)) next.delete(appLabel);
      else next.add(appLabel);
      return { collapsedApps: next };
    }),

  collapseAllApps: (labels) => set({ collapsedApps: new Set(labels) }),
  expandAllApps: () => set({ collapsedApps: new Set() }),

  pinNode: (id, pos) =>
    set((s) => {
      const next = new Map(s.pinnedPositions);
      next.set(id, pos);
      return { pinnedPositions: next };
    }),

  unpinNode: (id) =>
    set((s) => {
      const next = new Map(s.pinnedPositions);
      next.delete(id);
      return { pinnedPositions: next };
    }),

  setViewport: (v) => set({ viewportState: v }),

  setLayout: (layout) => set({ activeLayout: layout }),

  bumpImportId: () => set((s) => ({ importId: s.importId + 1 })),

  resetConfig: () =>
    set({
      expandedNodeIds: new Set(),
      pinnedPositions: new Map(),
      collapsedApps: new Set(),
      viewportState: { x: 0, y: 0, zoom: 1 },
      activeLayout: "elk",
    }),
}));
