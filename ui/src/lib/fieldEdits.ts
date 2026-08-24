import type { FieldInfo } from "./types";

// Per-node field presentation overrides (issue #93).
// Stored sparsely in schemaStore.fieldEdits — only edited nodes have entries.
export interface FieldEdits {
  hiddenFields: string[];              // field names hidden on this node
  fieldOrder: string[] | null;         // full display order (visible + hidden); null = natural order
  fieldColors: Record<string, string>; // field name → swatch hex color
}

export const EMPTY_FIELD_EDITS: FieldEdits = {
  hiddenFields: [],
  fieldOrder: null,
  fieldColors: {},
};

// Tailwind-500-ish, legible over all three app palettes.
export const FIELD_COLOR_SWATCHES: readonly string[] = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#6b7280", // gray
];

export function isEmptyEdits(edits: FieldEdits): boolean {
  return (
    edits.hiddenFields.length === 0 &&
    edits.fieldOrder === null &&
    Object.keys(edits.fieldColors).length === 0
  );
}

/**
 * Fields in display order, hidden fields INCLUDED (edit mode shows them grayed out).
 * Drift-safe: order entries naming unknown fields are ignored; fields missing
 * from the saved order are appended at the end in natural order.
 */
export function orderedFields(fields: FieldInfo[], edits?: FieldEdits): FieldInfo[] {
  if (!edits?.fieldOrder) return fields;
  const byName = new Map(fields.map((f) => [f.name, f]));
  const ordered: FieldInfo[] = [];
  for (const name of edits.fieldOrder) {
    const field = byName.get(name);
    if (field) {
      ordered.push(field);
      byName.delete(name);
    }
  }
  for (const field of fields) {
    if (byName.has(field.name)) ordered.push(field);
  }
  return ordered;
}

/** Fields in display order with hidden fields removed, plus how many were hidden. */
export function applyFieldEdits(
  fields: FieldInfo[],
  edits?: FieldEdits,
): { visible: FieldInfo[]; hiddenCount: number } {
  const ordered = orderedFields(fields, edits);
  if (!edits || edits.hiddenFields.length === 0) {
    return { visible: ordered, hiddenCount: 0 };
  }
  const hidden = new Set(edits.hiddenFields);
  const visible = ordered.filter((f) => !hidden.has(f.name));
  return { visible, hiddenCount: ordered.length - visible.length };
}
