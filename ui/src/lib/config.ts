import { useSchemaStore } from "../store/schemaStore";

export interface ViewConfig {
  version: 1;
  visibleNodeIds: string[];
  expandedNodeIds: string[];
  pinnedPositions: Record<string, { x: number; y: number }>;
  collapsedApps: string[];
  viewport: { x: number; y: number; zoom: number };
}

export function exportConfig(): string {
  const s = useSchemaStore.getState();
  const config: ViewConfig = {
    version: 1,
    visibleNodeIds: Array.from(s.visibleNodeIds),
    expandedNodeIds: Array.from(s.expandedNodeIds),
    pinnedPositions: Object.fromEntries(s.pinnedPositions),
    collapsedApps: Array.from(s.collapsedApps),
    viewport: s.viewportState,
  };
  return JSON.stringify(config, null, 2);
}

export function importConfig(json: string): void {
  const config: ViewConfig = JSON.parse(json);
  if (config.version !== 1) throw new Error("Unknown config version");
  useSchemaStore.setState({
    visibleNodeIds: new Set(config.visibleNodeIds),
    expandedNodeIds: new Set(config.expandedNodeIds),
    pinnedPositions: new Map(Object.entries(config.pinnedPositions)),
    collapsedApps: new Set(config.collapsedApps),
    viewportState: config.viewport,
  });
}
