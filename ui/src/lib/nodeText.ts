/**
 * Text classes for model nodes and the field editor (issue #132). Shared so
 * nodeContrast.test.ts measures exactly what the components draw: each must
 * reach WCAG AA on every palette's node fill in both themes, and the field
 * row classes also over every field color tint (a swatch at alpha 0x4D).
 */
export const NODE_TEXT = {
  /** Field name. */
  name: "text-gray-900",
  /** Name of a relation field (FK, O2O, M2M). */
  relation: "text-blue-800 dark:text-blue-200",
  /** Field type and the `null` marker. */
  type: "text-gray-700",
  /** Notes on the node itself: abstract, proxy, through, no fields, N hidden. */
  note: "text-gray-600",
} as const;

/** Classes drawn over field color tints, not just the node fill. */
export const ON_FIELD_TINTS: readonly (keyof typeof NODE_TEXT)[] = ["name", "relation", "type"];
