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
    version: 3,
    activeLayout: s.activeLayout,
    visibleNodeIds: Array.from(s.visibleNodeIds),
    expandedNodeIds: Array.from(s.expandedNodeIds),
    pinnedPositions: allPositions,
    collapsedApps: Array.from(s.collapsedApps),
    viewport: s.viewportState,
    canvasSize: { width: window.innerWidth, height: window.innerHeight },
    canvasHidePositions: Object.fromEntries(s.canvasHidePositions),
    fieldEdits: Object.fromEntries(s.fieldEdits),
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
  const raw = JSON.parse(json) as ViewConfig | ViewConfigV2 | ViewConfigV1;

  if (raw.version !== 1 && raw.version !== 2 && raw.version !== 3) {
    throw new Error("Unknown config version");
  }

  const isV2OrHigher = raw.version >= 2;
  const rawLayout = isV2OrHigher ? ((raw as ViewConfigV2 | ViewConfig).activeLayout as string) : undefined;
  const activeLayout = rawLayout === "force" ? "organic" : (rawLayout as "organic" | "dagre-lr" | "dagre-tb" | "elk" | undefined);

  const v2OrHigher = isV2OrHigher ? (raw as ViewConfigV2 | ViewConfig) : null;
  const v3 = raw.version === 3 ? (raw as ViewConfig) : null;

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
      v3 && v3.fieldEdits
        ? new Map(Object.entries(v3.fieldEdits))
        : new Map(),
    schemaInitialized: true,
    ...(activeLayout ? { activeLayout } : {}),
  });

  if (isV2OrHigher && (raw as ViewConfigV2 | ViewConfig).physics) {
    const physics = (raw as ViewConfigV2 | ViewConfig).physics;
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
    canvasSize: isV2OrHigher ? (raw as ViewConfigV2 | ViewConfig).canvasSize : undefined,
  };
}
