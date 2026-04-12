import { useSchemaStore } from "../store/schemaStore";
import {
  usePhysicsStore,
  DEFAULT_FORCE_PARAMS,
  type EdgeStyle,
  type AppMode,
  type ForceParams,
} from "../store/physicsStore";

interface PhysicsConfig {
  edgeStyle: EdgeStyle;
  liveDragPhysics: boolean;
  forceParams: ForceParams;
  appMode: AppMode;
}

export interface ViewConfig {
  version: 2;
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
  physics: PhysicsConfig;
}

// Legacy v1 format (no physics key)
interface ViewConfigV1 {
  version: 1;
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
}

export function exportConfig(): string {
  const s = useSchemaStore.getState();
  const p = usePhysicsStore.getState();
  const config: ViewConfig = {
    version: 2,
    visibleNodeIds: Array.from(s.visibleNodeIds),
    expandedNodeIds: Array.from(s.expandedNodeIds),
    pinnedPositions: Object.fromEntries(s.pinnedPositions),
    collapsedApps: Array.from(s.collapsedApps),
    viewport: s.viewportState,
    physics: {
      edgeStyle: p.edgeStyle,
      liveDragPhysics: p.liveDragPhysics,
      forceParams: p.forceParams,
      appMode: p.appMode,
    },
  };
  return JSON.stringify(config, null, 2);
}

export function importConfig(json: string): void {
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
  });

  if (raw.version === 2 && raw.physics) {
    usePhysicsStore.setState({
      edgeStyle: raw.physics.edgeStyle,
      liveDragPhysics: raw.physics.liveDragPhysics,
      forceParams: { ...DEFAULT_FORCE_PARAMS, ...raw.physics.forceParams },
      appMode: raw.physics.appMode,
    });
  }
}
