import { isEmptyEdits, normalizeFieldOrder, type FieldEdits } from "./fieldEdits";
import type { SchemaGraph } from "./types";

type Point = { x: number; y: number };

/** The parts of the schema store that name models, fields or relations. */
export interface PrunableState {
  visibleNodeIds: Set<string>;
  expandedNodeIds: Set<string>;
  pinnedPositions: Map<string, Point>;
  canvasHidePositions: Map<string, Point>;
  fieldEdits: Map<string, FieldEdits>;
  edgeOffsets: Map<string, Point>;
}

/** React Flow id of a relation edge; must match the id SchemaCanvas builds. */
export const schemaEdgeId = (e: { source: string; target: string; field_name: string }): string =>
  `${e.source}->${e.target}:${e.field_name}`;

function pruneFieldEdits(edits: FieldEdits, fieldNames: string[]): FieldEdits {
  const known = new Set(fieldNames);
  const fieldOrder = edits.fieldOrder
    ? normalizeFieldOrder(edits.fieldOrder.filter((name) => known.has(name)), fieldNames)
    : null;
  return {
    hiddenFields: edits.hiddenFields.filter((name) => known.has(name)),
    fieldOrder,
    fieldColors: Object.fromEntries(Object.entries(edits.fieldColors).filter(([name]) => known.has(name))),
  };
}

/**
 * Drops entries naming models, fields or relations that are not in `schema`
 * (issue #131). The live schema decides what exists; a config exported before
 * a model changed must not carry stale names forward, or a field later
 * re-added under the same name would get its old order, hidden state and color
 * back. Annotations are content and are left alone. Pure.
 */
export function pruneToSchema(state: PrunableState, schema: SchemaGraph): PrunableState {
  const fieldsByNode = new Map(schema.nodes.map((n) => [n.id, n.fields.map((f) => f.name)]));
  const edgeIds = new Set(schema.edges.map(schemaEdgeId));
  const hasNode = (id: string) => fieldsByNode.has(id);

  const fieldEdits = new Map<string, FieldEdits>();
  for (const [nodeId, edits] of state.fieldEdits) {
    const fieldNames = fieldsByNode.get(nodeId);
    if (!fieldNames) continue;
    const pruned = pruneFieldEdits(edits, fieldNames);
    if (!isEmptyEdits(pruned)) fieldEdits.set(nodeId, pruned);
  }

  return {
    visibleNodeIds: new Set([...state.visibleNodeIds].filter(hasNode)),
    expandedNodeIds: new Set([...state.expandedNodeIds].filter(hasNode)),
    pinnedPositions: new Map([...state.pinnedPositions].filter(([id]) => hasNode(id))),
    canvasHidePositions: new Map([...state.canvasHidePositions].filter(([id]) => hasNode(id))),
    fieldEdits,
    edgeOffsets: new Map([...state.edgeOffsets].filter(([id]) => edgeIds.has(id))),
  };
}
