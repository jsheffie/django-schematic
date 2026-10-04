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

// --- Automatic ordering (issue #111) ------------------------------------------

/** Django internal types that sort into the final "date / time" bucket. */
const DATE_TIME_TYPES: ReadonlySet<string> = new Set([
  "DateField",
  "DateTimeField",
  "TimeField",
  "DurationField",
]);

/** Which of the four buckets a field sorts into; lower comes first. */
function sortBucket(f: FieldInfo): 0 | 1 | 2 | 3 {
  if (f.primary_key) return 0;
  if (f.is_relation) return 1;
  // Classify on what the field *is* (a custom DateTimeField subclass is still a
  // date/time); fall back to the class name when internal_type is missing.
  if (DATE_TIME_TYPES.has(f.internal_type || f.field_type)) return 3;
  return 2;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Case-insensitive, with the exact string as the tie-break so the result is deterministic. */
function compareNames(a: string, b: string): number {
  return compareStrings(a.toLowerCase(), b.toLowerCase()) || compareStrings(a, b);
}

/**
 * Field names in "sort by type" order: primary key first, then relations
 * (alphabetical by name), then everything else grouped by `field_type` with
 * groups alphabetical and names alphabetical within each group, then date and
 * time fields last, grouped the same way. Pure; covers every field passed in
 * (hidden ones included) so the result can be handed to `setFieldOrder` as is.
 */
export function autoFieldOrder(fields: FieldInfo[]): string[] {
  return [...fields]
    .sort((a, b) => {
      const bucketA = sortBucket(a);
      const bucketB = sortBucket(b);
      if (bucketA !== bucketB) return bucketA - bucketB;
      // Relations are ordered by name only; the other buckets group by the shown type first.
      if (bucketA !== 1) {
        const byType = compareNames(a.field_type, b.field_type);
        if (byType !== 0) return byType;
      }
      return compareNames(a.name, b.name);
    })
    .map((f) => f.name);
}
