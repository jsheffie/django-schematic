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
  version: 2;
  activeLayout: "force" | "dagre-lr" | "dagre-tb" | "elk";
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  physics: PhysicsConfig;
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
    version: 2,
    activeLayout: s.activeLayout,
    visibleNodeIds: Array.from(s.visibleNodeIds),
    expandedNodeIds: Array.from(s.expandedNodeIds),
    pinnedPositions: allPositions,
    collapsedApps: Array.from(s.collapsedApps),
    viewport: s.viewportState,
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

/** Returns the viewport from the config so the caller can apply it to React Flow. */
export function importConfig(json: string): { x: number; y: number; zoom: number } {
  const raw = JSON.parse(json) as ViewConfig | ViewConfigV1;

  if (raw.version !== 1 && raw.version !== 2) {
    throw new Error("Unknown config version");
  }

  useSchemaStore.setState({
    visibleNodeIds: new Set(raw.visibleNodeIds),
    expandedNodeIds: new Set(raw.expandedNodeIds),
    pinnedPositions: new Map(Object.entries(raw.pinnedPositions)),
    collapsedApps: new Set(raw.collapsedApps),
    viewportState: raw.viewport,
    ...(raw.version === 2 && raw.activeLayout
      ? { activeLayout: raw.activeLayout }
      : {}),
  });

  if (raw.version === 2 && raw.physics) {
    usePhysicsStore.setState({
      edgeStyle: raw.physics.edgeStyle,
      liveDragPhysics: raw.physics.liveDragPhysics,
      forceParams: { ...DEFAULT_FORCE_PARAMS, ...raw.physics.forceParams },
      appMode: raw.physics.appMode,
      ...(raw.physics.colorPalette ? { colorPalette: raw.physics.colorPalette } : {}),
      ...(raw.physics.backgroundStyle ? { backgroundStyle: raw.physics.backgroundStyle } : {}),
      ...(raw.physics.minimapVisible !== undefined ? { minimapVisible: raw.physics.minimapVisible } : {}),
      ...(raw.physics.sidebarOpen !== undefined ? { sidebarOpen: raw.physics.sidebarOpen } : {}),
    });
  }

  useSchemaStore.getState().bumpImportId();
  return raw.viewport;
}
