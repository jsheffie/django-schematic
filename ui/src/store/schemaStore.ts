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
  layoutVersion: number;

  // Canvas-initiated hide positions — nodes hidden via double-click store their
  // last position here so they can be restored without triggering layout recalc.
  canvasHidePositions: Map<string, { x: number; y: number }>;
  // Increments on every canvas hide/restore so SchemaCanvas can detect and skip layout.
  canvasLayoutSuppressVersion: number;

  // Node visibility
  setAllVisible: (ids: string[]) => void;
  toggleNodeVisibility: (id: string) => void;
  showApp: (appLabel: string, nodeIds: string[]) => void;
  hideApp: (appLabel: string, nodeIds: string[]) => void;
  hideNodeFromCanvas: (id: string, position: { x: number; y: number }) => void;
  restoreCanvasHiddenNode: (id: string) => void;

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

  // True once visibleNodeIds has been intentionally populated (by setAllVisible or importConfig)
  schemaInitialized: boolean;

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
  layoutVersion: 0,
  importId: 0,
  schemaInitialized: false,
  canvasHidePositions: new Map(),
  canvasLayoutSuppressVersion: 0,

  setAllVisible: (ids) => set({ visibleNodeIds: new Set(ids), schemaInitialized: true }),

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

  hideNodeFromCanvas: (id, position) =>
    set((s) => {
      const nextVisible = new Set(s.visibleNodeIds);
      nextVisible.delete(id);
      const nextHidePositions = new Map(s.canvasHidePositions);
      nextHidePositions.set(id, position);
      return {
        visibleNodeIds: nextVisible,
        canvasHidePositions: nextHidePositions,
        canvasLayoutSuppressVersion: s.canvasLayoutSuppressVersion + 1,
      };
    }),

  restoreCanvasHiddenNode: (id) =>
    set((s) => {
      const nextVisible = new Set(s.visibleNodeIds);
      nextVisible.add(id);
      const nextHidePositions = new Map(s.canvasHidePositions);
      const savedPos = nextHidePositions.get(id);
      nextHidePositions.delete(id);
      const nextPinned = new Map(s.pinnedPositions);
      if (savedPos) nextPinned.set(id, savedPos);
      return {
        visibleNodeIds: nextVisible,
        canvasHidePositions: nextHidePositions,
        pinnedPositions: nextPinned,
        canvasLayoutSuppressVersion: s.canvasLayoutSuppressVersion + 1,
      };
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

  setLayout: (layout) => set((s) => ({ activeLayout: layout, layoutVersion: s.layoutVersion + 1 })),

  bumpImportId: () => set((s) => ({ importId: s.importId + 1, schemaInitialized: true })),

  resetConfig: () =>
    set({
      expandedNodeIds: new Set(),
      pinnedPositions: new Map(),
      collapsedApps: new Set(),
      viewportState: { x: 0, y: 0, zoom: 1 },
      activeLayout: "elk",
      layoutVersion: 0,
      canvasHidePositions: new Map(),
    }),
}));
