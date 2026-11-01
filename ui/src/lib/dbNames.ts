/**
 * Physical database names for an export (issue #135). A tool that watches the
 * database (e.g. a logical replication slot) sees tables and columns, not
 * models and fields; config v8 carries this map so it can resolve them from
 * the PNG alone, without a running Django server or guessing naming rules.
 */
import type { SchemaGraph } from "./types";

export interface ModelDbNames {
  /** `Meta.db_table`; null for abstract models, which have no table. */
  table: string | null;
  /** Field name -> database column, e.g. `company` -> `company_id`. Fields without a column (M2M) are left out. */
  columns: Record<string, string>;
  /** M2M field name -> the table holding its links (auto-created or an explicit `through` model). */
  through: Record<string, string>;
}

/** Model id -> its database names, for every model in the schema. */
export type DbNames = Record<string, ModelDbNames>;

export function snapshotDbNames(schema: SchemaGraph): DbNames {
  const names: DbNames = {};
  for (const node of schema.nodes) {
    const columns: Record<string, string> = {};
    for (const f of node.fields) if (f.column !== null) columns[f.name] = f.column;
    names[node.id] = { table: node.db_table, columns, through: {} };
  }
  for (const edge of schema.edges) {
    if (edge.relation_type === "m2m" && edge.through_db_table && names[edge.source]) {
      names[edge.source].through[edge.field_name] = edge.through_db_table;
    }
  }
  return names;
}
