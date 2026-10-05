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
export function orderedFields<T extends { name: string }>(fields: T[], edits?: FieldEdits): T[] {
  if (!edits?.fieldOrder) return fields;
  const byName = new Map(fields.map((f) => [f.name, f]));
  const ordered: T[] = [];
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

/** Which of the five buckets a field sorts into; lower comes first. */
function sortBucket(f: FieldInfo): 0 | 1 | 2 | 3 | 4 {
  if (f.primary_key) return 0;
  if (f.is_relation) return 1;
  // Classify on what the field *is* (a custom DateTimeField subclass is still a
  // date/time); fall back to the class name when internal_type is missing.
  const kind = f.internal_type || f.field_type;
  if (DATE_TIME_TYPES.has(kind)) return 4;
  if (kind === "BooleanField") return 3;
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
 * groups alphabetical and names alphabetical within each group, then booleans,
 * then date and time fields last, the last two grouped the same way. Pure;
 * covers every field passed in (hidden ones included) so the result can be
 * handed to `setFieldOrder` as is.
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

// --- Color by type (issue #115) -----------------------------------------------

/**
 * Field type color overrides, keyed by group key (see `fieldGroupKey`):
 * "pk", "relation", "boolean", "datetime", or a middle-bucket `field_type`.
 * Sparse: a missing key means the bucket default, or Auto for a type.
 */
export type TypeColorMap = Record<string, string>;

/** Bucket group keys, in sort order around the middle (per-type) bucket. */
export type BucketKey = "pk" | "relation" | "boolean" | "datetime";

export const DEFAULT_TYPE_COLORS: Readonly<Record<BucketKey, string>> = {
  pk: "#6b7280", // gray
  relation: "#3b82f6", // blue
  boolean: "#22c55e", // green
  datetime: "#f59e0b", // amber
};

/**
 * What Auto types cycle through: every swatch the buckets do not use by
 * default, ordered so consecutive entries are never close in hue.
 */
export const AUTO_TYPE_COLORS: readonly string[] = [
  "#ef4444", // red
  "#6366f1", // indigo
  "#f97316", // orange
  "#a855f7", // purple
];

// Swatch pairs that are hard to tell apart as 30% row tints.
const NEAR_COLORS: ReadonlyArray<readonly [string, string]> = [
  ["#ef4444", "#f97316"], // red, orange
  ["#f97316", "#f59e0b"], // orange, amber
  ["#3b82f6", "#6366f1"], // blue, indigo
  ["#6366f1", "#a855f7"], // indigo, purple
];

function looksLike(a: string, b: string | null): boolean {
  if (b === null) return false;
  return a === b || NEAR_COLORS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

const BUCKET_KEYS = ["pk", "relation", "", "boolean", "datetime"] as const;

/**
 * The color group a field belongs to. Built on the sort's own bucket function
 * so coloring and sorting can never disagree: one key per bucket, except the
 * middle bucket, which (like the sort) groups by the shown `field_type`.
 */
export function fieldGroupKey(f: FieldInfo): string {
  const bucket = sortBucket(f);
  return bucket === 2 ? f.field_type : BUCKET_KEYS[bucket];
}

function isBucketKey(key: string): key is BucketKey {
  return Object.hasOwn(DEFAULT_TYPE_COLORS, key);
}

/** The middle-bucket types among `fields`, distinct and alphabetical: the per-type rows in Settings. */
export function typeColorGroups(fields: Iterable<FieldInfo>): string[] {
  const keys = new Set<string>();
  for (const f of fields) {
    const key = fieldGroupKey(f);
    if (!isBucketKey(key)) keys.add(key);
  }
  return [...keys].sort(compareNames);
}

/** The color a group always gets, or null when it is an Auto type. Non-swatch map entries are ignored. */
export function fixedTypeColor(key: string, typeColors: TypeColorMap): string | null {
  const picked = Object.hasOwn(typeColors, key) ? typeColors[key] : undefined;
  if (picked !== undefined && FIELD_COLOR_SWATCHES.includes(picked)) return picked;
  return isBucketKey(key) ? DEFAULT_TYPE_COLORS[key] : null;
}

/**
 * A color for every field (hidden ones included), by type group, for "Sort by
 * type" with Color by type on. Groups with a fixed color (a bucket, or a type
 * the user picked a color for) get it; Auto types cycle through
 * AUTO_TYPE_COLORS in sorted group order, skipping a color that matches or
 * looks like the group before or a fixed group after, so adjacent groups are
 * easy to tell apart. Pure.
 */
export function autoFieldColors(fields: FieldInfo[], typeColors: TypeColorMap = {}): Record<string, string> {
  const byName = new Map(fields.map((f) => [f.name, f]));
  // Groups in display order; autoFieldOrder keeps each group contiguous.
  const groups: { key: string; names: string[] }[] = [];
  for (const name of autoFieldOrder(fields)) {
    const key = fieldGroupKey(byName.get(name)!);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.names.push(name);
    else groups.push({ key, names: [name] });
  }

  const fixed = groups.map((g) => fixedTypeColor(g.key, typeColors));
  const colors: Record<string, string> = {};
  let previous: string | null = null;
  let cursor = 0;
  groups.forEach((group, i) => {
    let color = fixed[i];
    if (color === null) {
      const next = fixed[i + 1] ?? null;
      // Prefer a color unlike either neighbour, then one merely different, in cycle order.
      const tests = [
        (c: string) => !looksLike(c, previous) && !looksLike(c, next),
        (c: string) => c !== previous && c !== next,
        () => true,
      ];
      let index = cursor % AUTO_TYPE_COLORS.length;
      search: for (const ok of tests) {
        for (let step = 0; step < AUTO_TYPE_COLORS.length; step++) {
          const candidate = (cursor + step) % AUTO_TYPE_COLORS.length;
          if (ok(AUTO_TYPE_COLORS[candidate])) {
            index = candidate;
            break search;
          }
        }
      }
      color = AUTO_TYPE_COLORS[index];
      cursor = index + 1;
    }
    for (const name of group.names) colors[name] = color;
    previous = color;
  });
  return colors;
}
