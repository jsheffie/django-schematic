import { create } from "zustand";
import { EMPTY_FIELD_EDITS, autoFieldOrder, isEmptyEdits, type FieldEdits } from "../lib/fieldEdits";
import type { NodeInfo } from "../lib/types";
import {
  isAttached,
  newArrowId,
  newTextBlockId,
  type Arrow,
  type TextBlock,
} from "../lib/annotations";

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

  // Per-node field presentation edits (issue #93). Sparse: only edited nodes
  // have entries; an entry whose edits are all cleared is removed.
  fieldEdits: Map<string, FieldEdits>;

  // Per-edge midpoint offsets for the smart bezier style (issue #96), relative
  // to the curve's natural midpoint. Sparse: keyed by React Flow edge id
  // (`${source}->${target}:${field}`); near-zero offsets are removed.
  edgeOffsets: Map<string, { x: number; y: number }>;

  // Canvas annotations, keyed by generated ids (lib/annotations.ts). Content,
  // not presentation: resetConfig leaves them alone.
  textBlocks: Map<string, TextBlock>;
  arrows: Map<string, Arrow>;

  // Basename of the file last imported or exported; the default export name.
  // Not part of the config, and resetConfig leaves it alone.
  documentName: string | null;
  setDocumentName: (name: string | null) => void;

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

  // Field editing
  toggleFieldHidden: (nodeId: string, fieldName: string) => void;
  setFieldOrder: (nodeId: string, order: string[], naturalOrder: string[]) => void;
  // "Sort all tables by type" (issue #117): autoFieldOrder on every node, in one update.
  sortAllFieldsByType: (nodes: ReadonlyArray<Pick<NodeInfo, "id" | "fields">>) => void;
  setFieldColor: (nodeId: string, fieldName: string, color: string | null) => void;
  resetFieldEdits: (nodeId: string) => void;

  // Edge shaping
  setEdgeOffset: (id: string, offset: { x: number; y: number }) => void;
  clearEdgeOffset: (id: string) => void;

  // Annotations
  addTextBlock: (block: TextBlock) => string;
  updateTextBlock: (id: string, patch: Partial<TextBlock>) => void;
  removeTextBlock: (id: string) => void; // also removes arrows attached to it
  addArrow: (arrow: Arrow) => string;
  updateArrow: (id: string, patch: Partial<Arrow>) => void;
  removeArrow: (id: string) => void;
  setArrowOffset: (id: string, offset: { x: number; y: number }) => void;
  clearArrowOffset: (id: string) => void;

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

// An order identical to the node's natural order is stored as null (no override).
function normalizeFieldOrder(order: string[], naturalOrder: string[]): string[] | null {
  const isNatural =
    order.length === naturalOrder.length && order.every((name, i) => name === naturalOrder[i]);
  return isNatural ? null : [...order];
}

// Returns a new map with `edits` stored under `nodeId`, or the entry removed
// if the edits are all cleared — keeps the map sparse.
function commitFieldEdits(
  map: Map<string, FieldEdits>,
  nodeId: string,
  edits: FieldEdits,
): Map<string, FieldEdits> {
  const next = new Map(map);
  if (isEmptyEdits(edits)) next.delete(nodeId);
  else next.set(nodeId, edits);
  return next;
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
  fieldEdits: new Map(),
  edgeOffsets: new Map(),
  textBlocks: new Map(),
  arrows: new Map(),
  documentName: null,

  setDocumentName: (documentName) => set({ documentName }),

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

  toggleFieldHidden: (nodeId, fieldName) =>
    set((s) => {
      const cur = s.fieldEdits.get(nodeId) ?? EMPTY_FIELD_EDITS;
      const hiddenFields = cur.hiddenFields.includes(fieldName)
        ? cur.hiddenFields.filter((n) => n !== fieldName)
        : [...cur.hiddenFields, fieldName];
      return { fieldEdits: commitFieldEdits(s.fieldEdits, nodeId, { ...cur, hiddenFields }) };
    }),

  setFieldOrder: (nodeId, order, naturalOrder) =>
    set((s) => {
      const cur = s.fieldEdits.get(nodeId) ?? EMPTY_FIELD_EDITS;
      const fieldOrder = normalizeFieldOrder(order, naturalOrder);
      return { fieldEdits: commitFieldEdits(s.fieldEdits, nodeId, { ...cur, fieldOrder }) };
    }),

  sortAllFieldsByType: (nodes) =>
    set((s) => {
      let next = s.fieldEdits;
      for (const node of nodes) {
        const cur = next.get(node.id) ?? EMPTY_FIELD_EDITS;
        const fieldOrder = normalizeFieldOrder(
          autoFieldOrder(node.fields),
          node.fields.map((f) => f.name),
        );
        next = commitFieldEdits(next, node.id, { ...cur, fieldOrder });
      }
      return { fieldEdits: next };
    }),

  setFieldColor: (nodeId, fieldName, color) =>
    set((s) => {
      const cur = s.fieldEdits.get(nodeId) ?? EMPTY_FIELD_EDITS;
      const fieldColors = { ...cur.fieldColors };
      if (color === null) delete fieldColors[fieldName];
      else fieldColors[fieldName] = color;
      return { fieldEdits: commitFieldEdits(s.fieldEdits, nodeId, { ...cur, fieldColors }) };
    }),

  resetFieldEdits: (nodeId) =>
    set((s) => {
      const next = new Map(s.fieldEdits);
      next.delete(nodeId);
      return { fieldEdits: next };
    }),

  setEdgeOffset: (id, offset) =>
    set((s) => {
      const next = new Map(s.edgeOffsets);
      if (Math.abs(offset.x) < 1 && Math.abs(offset.y) < 1) next.delete(id);
      else next.set(id, offset);
      return { edgeOffsets: next };
    }),

  clearEdgeOffset: (id) =>
    set((s) => {
      const next = new Map(s.edgeOffsets);
      next.delete(id);
      return { edgeOffsets: next };
    }),

  addTextBlock: (block) => {
    const id = newTextBlockId();
    set((s) => ({ textBlocks: new Map(s.textBlocks).set(id, block) }));
    return id;
  },

  updateTextBlock: (id, patch) =>
    set((s) => {
      const cur = s.textBlocks.get(id);
      if (!cur) return {};
      return { textBlocks: new Map(s.textBlocks).set(id, { ...cur, ...patch }) };
    }),

  removeTextBlock: (id) =>
    set((s) => {
      const textBlocks = new Map(s.textBlocks);
      textBlocks.delete(id);
      // An arrow whose end pointed at the block has nothing to point at.
      const touches = (a: Arrow) =>
        (isAttached(a.from) && a.from.nodeId === id) || (isAttached(a.to) && a.to.nodeId === id);
      const arrows = new Map([...s.arrows].filter(([, a]) => !touches(a)));
      return { textBlocks, arrows };
    }),

  addArrow: (arrow) => {
    const id = newArrowId();
    set((s) => ({ arrows: new Map(s.arrows).set(id, arrow) }));
    return id;
  },

  updateArrow: (id, patch) =>
    set((s) => {
      const cur = s.arrows.get(id);
      if (!cur) return {};
      return { arrows: new Map(s.arrows).set(id, { ...cur, ...patch }) };
    }),

  removeArrow: (id) =>
    set((s) => {
      const arrows = new Map(s.arrows);
      arrows.delete(id);
      return { arrows };
    }),

  setArrowOffset: (id, offset) =>
    set((s) => {
      const cur = s.arrows.get(id);
      if (!cur) return {};
      const next: Arrow = { ...cur };
      if (Math.abs(offset.x) < 1 && Math.abs(offset.y) < 1) delete next.offset;
      else next.offset = offset;
      return { arrows: new Map(s.arrows).set(id, next) };
    }),

  clearArrowOffset: (id) =>
    set((s) => {
      const cur = s.arrows.get(id);
      if (!cur) return {};
      const next: Arrow = { ...cur };
      delete next.offset;
      return { arrows: new Map(s.arrows).set(id, next) };
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
      fieldEdits: new Map(),
      edgeOffsets: new Map(),
    }),
}));
