import { useSchemaStore } from "../store/schemaStore";
import {
  usePhysicsStore,
  DEFAULT_FORCE_PARAMS,
  type EdgeStyle,
  type AppMode,
  type ForceParams,
  type ColorPalette,
  type BackgroundStyle,
} from "../store/physicsStore";
import type { FieldEdits } from "./fieldEdits";
import type { Annotations } from "./annotations";

interface PhysicsConfig {
  edgeStyle: EdgeStyle;
  liveDragPhysics: boolean;
  forceParams: ForceParams;
  appMode: AppMode;
  colorPalette?: ColorPalette;
  backgroundStyle?: BackgroundStyle;
  minimapVisible?: boolean;
  sidebarOpen?: boolean;
}

export interface ViewConfig {
  // Bumping this requires a new `__fixtures__/config-v<N>.json` and
  // `__fixtures__/export-v<N>.png` exported from the app; do not edit existing
  // fixtures. See __fixtures__/README.md. config.golden.test.ts enforces it.
  version: 5;
  activeLayout: "organic" | "dagre-lr" | "dagre-tb" | "elk";
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  physics: PhysicsConfig;
  canvasHidePositions?: Record<string, { x: number; y: number }>;
  fieldEdits?: Record<string, FieldEdits>;
  edgeOffsets?: Record<string, { x: number; y: number }>; // smart bezier midpoint offsets (issue #96)
  annotations?: Annotations; // text blocks and arrows
}

// Legacy v4 format (no annotations)
interface ViewConfigV4 {
  version: 4;
  activeLayout: "organic" | "dagre-lr" | "dagre-tb" | "elk";
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  physics: PhysicsConfig;
  canvasHidePositions?: Record<string, { x: number; y: number }>;
  fieldEdits?: Record<string, FieldEdits>;
  edgeOffsets?: Record<string, { x: number; y: number }>;
}

// Legacy v3 format (no edgeOffsets)
interface ViewConfigV3 {
  version: 3;
  activeLayout: "organic" | "dagre-lr" | "dagre-tb" | "elk";
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  physics: PhysicsConfig;
  canvasHidePositions?: Record<string, { x: number; y: number }>;
  fieldEdits?: Record<string, FieldEdits>;
}

// Legacy v2 format (no fieldEdits)
interface ViewConfigV2 {
  version: 2;
  activeLayout: "organic" | "dagre-lr" | "dagre-tb" | "elk";
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  canvasSize?: { width: number; height: number };
  physics: PhysicsConfig;
  canvasHidePositions?: Record<string, { x: number; y: number }>;
}

// Legacy v1 format (no physics or activeLayout)
interface ViewConfigV1 {
  version: 1;
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
}

/**
 * Positions to export: model nodes only. Text blocks carry their own x/y in
 * `annotations` and anchor nodes are derived from arrow endpoints, so neither
 * belongs in `pinnedPositions`.
 */
export function collectModelPositions(
  nodes: ReadonlyArray<{ id: string; type?: string; position: { x: number; y: number } }>,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) if (n.type === "model") out[n.id] = n.position;
  return out;
}

/**
 * Export current view state to JSON.
 *
 * Pass `currentPositions` (from useReactFlow().getNodes()) to capture all
 * node positions — not just those explicitly pinned via drag. Store-pinned
 * positions take precedence so manual pins are preserved exactly.
 */
export function exportConfig(
  currentPositions?: Record<string, { x: number; y: number }>,
): string {
  const s = useSchemaStore.getState();
  const p = usePhysicsStore.getState();

  // Merge: current display positions as base, then overlay explicit store pins
  const allPositions: Record<string, { x: number; y: number }> = {
    ...(currentPositions ?? {}),
    ...Object.fromEntries(s.pinnedPositions),
  };

  const config: ViewConfig = {
    version: 5,
    activeLayout: s.activeLayout,
    visibleNodeIds: Array.from(s.visibleNodeIds),
    expandedNodeIds: Array.from(s.expandedNodeIds),
    pinnedPositions: allPositions,
    collapsedApps: Array.from(s.collapsedApps),
    viewport: s.viewportState,
    canvasSize: { width: window.innerWidth, height: window.innerHeight },
    canvasHidePositions: Object.fromEntries(s.canvasHidePositions),
    fieldEdits: Object.fromEntries(s.fieldEdits),
    edgeOffsets: Object.fromEntries(s.edgeOffsets),
    annotations: {
      textBlocks: Object.fromEntries(s.textBlocks),
      arrows: Object.fromEntries(s.arrows),
    },
    physics: {
      edgeStyle: p.edgeStyle,
      liveDragPhysics: p.liveDragPhysics,
      forceParams: p.forceParams,
      appMode: p.appMode,
      colorPalette: p.colorPalette,
      backgroundStyle: p.backgroundStyle,
      minimapVisible: p.minimapVisible,
      sidebarOpen: p.sidebarOpen,
    },
  };
  return JSON.stringify(config, null, 2);
}

/** Returns the viewport and original canvas size from the config so the caller can apply them. */
export function importConfig(json: string): { x: number; y: number; zoom: number; canvasSize?: { width: number; height: number } } {
  const raw = JSON.parse(json) as ViewConfig | ViewConfigV4 | ViewConfigV3 | ViewConfigV2 | ViewConfigV1;

  if (![1, 2, 3, 4, 5].includes(raw.version)) {
    throw new Error("Unknown config version");
  }

  type V2Plus = ViewConfigV2 | ViewConfigV3 | ViewConfigV4 | ViewConfig;
  const isV2OrHigher = raw.version >= 2;
  const rawLayout = isV2OrHigher ? ((raw as V2Plus).activeLayout as string) : undefined;
  const activeLayout = rawLayout === "force" ? "organic" : (rawLayout as "organic" | "dagre-lr" | "dagre-tb" | "elk" | undefined);

  const v2OrHigher = isV2OrHigher ? (raw as V2Plus) : null;
  const v3OrHigher = raw.version >= 3 ? (raw as ViewConfigV3 | ViewConfigV4 | ViewConfig) : null;
  const v4OrHigher = raw.version >= 4 ? (raw as ViewConfigV4 | ViewConfig) : null;
  const v5 = raw.version === 5 ? (raw as ViewConfig) : null;

  useSchemaStore.setState({
    visibleNodeIds: new Set(raw.visibleNodeIds),
    expandedNodeIds: new Set(raw.expandedNodeIds),
    pinnedPositions: new Map(Object.entries(raw.pinnedPositions)),
    collapsedApps: new Set(raw.collapsedApps),
    viewportState: raw.viewport,
    canvasHidePositions: v2OrHigher && v2OrHigher.canvasHidePositions
      ? new Map(Object.entries(v2OrHigher.canvasHidePositions))
      : new Map(),
    fieldEdits:
      v3OrHigher && v3OrHigher.fieldEdits
        ? new Map(Object.entries(v3OrHigher.fieldEdits))
        : new Map(),
    edgeOffsets:
      v4OrHigher && v4OrHigher.edgeOffsets
        ? new Map(Object.entries(v4OrHigher.edgeOffsets))
        : new Map(),
    textBlocks: v5?.annotations ? new Map(Object.entries(v5.annotations.textBlocks ?? {})) : new Map(),
    arrows: v5?.annotations ? new Map(Object.entries(v5.annotations.arrows ?? {})) : new Map(),
    schemaInitialized: true,
    ...(activeLayout ? { activeLayout } : {}),
  });

  if (isV2OrHigher && (raw as V2Plus).physics) {
    const physics = (raw as V2Plus).physics;
    const importedAppMode: AppMode =
      (physics.appMode as string) === "auto-layout" ? "normal" : physics.appMode;
    usePhysicsStore.setState({
      edgeStyle: physics.edgeStyle,
      liveDragPhysics: physics.liveDragPhysics,
      forceParams: { ...DEFAULT_FORCE_PARAMS, ...physics.forceParams },
      appMode: importedAppMode,
      ...(physics.colorPalette ? { colorPalette: physics.colorPalette } : {}),
      ...(physics.backgroundStyle ? { backgroundStyle: physics.backgroundStyle } : {}),
      ...(physics.minimapVisible !== undefined ? { minimapVisible: physics.minimapVisible } : {}),
      ...(physics.sidebarOpen !== undefined ? { sidebarOpen: physics.sidebarOpen } : {}),
    });
  }

  useSchemaStore.getState().bumpImportId();
  return {
    ...raw.viewport,
    canvasSize: isV2OrHigher ? (raw as V2Plus).canvasSize : undefined,
  };
}
