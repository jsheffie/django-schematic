import type { PrunableState } from "./pruneToSchema";
import type { SchemaGraph } from "./types";

/**
 * Model id → field name → `field_type`, as the schema was when a config was
 * exported (config v7+). A null type means unknown: configs saved before v7
 * only name fields, they never stored types.
 */
export type SchemaSnapshot = Record<string, Record<string, string | null>>;

/** What changed between the schema a config was saved against and the live one (issue #131). */
export interface SchemaChanges {
  removedModels: string[];
  removedFields: { model: string; field: string }[];
  changedFields: { model: string; field: string; from: string; to: string }[];
}

export function snapshotSchema(schema: SchemaGraph): Record<string, Record<string, string>> {
  return Object.fromEntries(
    schema.nodes.map((n) => [n.id, Object.fromEntries(n.fields.map((f) => [f.name, f.field_type]))]),
  );
}

/**
 * The models and fields a config refers to, with unknown types. Used for
 * configs saved before v7, which have no snapshot: only names that carry a
 * setting (visibility, position, field order, hidden, color) are known.
 */
export function referencedSnapshot(state: PrunableState): SchemaSnapshot {
  const snapshot: SchemaSnapshot = {};
  const addModel = (id: string) => (snapshot[id] ??= {});
  for (const id of state.visibleNodeIds) addModel(id);
  for (const id of state.expandedNodeIds) addModel(id);
  for (const id of state.pinnedPositions.keys()) addModel(id);
  for (const id of state.canvasHidePositions.keys()) addModel(id);
  for (const [id, edits] of state.fieldEdits) {
    const fields = addModel(id);
    const names = [...(edits.fieldOrder ?? []), ...edits.hiddenFields, ...Object.keys(edits.fieldColors)];
    for (const name of names) fields[name] ??= null;
  }
  return snapshot;
}

/**
 * Models and fields in `saved` that the live schema no longer has, and fields
 * whose type changed. Additions are not changes: new models and fields simply
 * show up. Sorted for stable output.
 */
export function diffSchema(saved: SchemaSnapshot, schema: SchemaGraph): SchemaChanges {
  const live = snapshotSchema(schema);
  const changes: SchemaChanges = { removedModels: [], removedFields: [], changedFields: [] };
  for (const model of Object.keys(saved).sort()) {
    const liveFields = live[model];
    if (!liveFields) {
      changes.removedModels.push(model);
      continue;
    }
    for (const field of Object.keys(saved[model]).sort()) {
      const from = saved[model][field];
      const to = liveFields[field];
      if (to === undefined) changes.removedFields.push({ model, field });
      else if (from !== null && from !== to) changes.changedFields.push({ model, field, from, to });
    }
  }
  return changes;
}

export function hasSchemaChanges(c: SchemaChanges): boolean {
  return c.removedModels.length + c.removedFields.length + c.changedFields.length > 0;
}

export const NO_SCHEMA_CHANGES: SchemaChanges = { removedModels: [], removedFields: [], changedFields: [] };

