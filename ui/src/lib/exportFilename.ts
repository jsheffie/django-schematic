/**
 * Default basename for the Export PNG / Export config dialogs, in order:
 * the document name (last imported or exported file), the slug of the canvas
 * title block, the slug of the most related visible model, then "schematic".
 */
import type { TextBlock } from "./annotations";
import type { EdgeInfo, NodeInfo } from "./types";

const FALLBACK = "schematic";
const MAX_SLUG_LENGTH = 60;

/** "orders (2).png" -> "orders": drops the extension and the browser's duplicate-download suffix. */
export function basenameFromFile(filename: string): string | null {
  const base = filename
    .trim()
    .replace(/\.[^.]*$/, "")
    .replace(/\s*\(\d+\)$/, "")
    .trim();
  return base || null;
}

/** Lowercase ASCII words joined by single dashes; "" when nothing alphanumeric remains. */
export function slugify(text: string, maxLength = MAX_SLUG_LENGTH): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}

/** Slug of the first line of the topmost (then leftmost) title block that slugs to something. */
export function titleSlug(textBlocks: ReadonlyMap<string, TextBlock>): string | null {
  const titles = [...textBlocks.values()]
    .filter((b) => b.style === "title")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  for (const title of titles) {
    const firstLine = title.text.split("\n").find((line) => line.trim()) ?? "";
    const slug = slugify(firstLine);
    if (slug) return slug;
  }
  return null;
}

/**
 * Slug of the visible model with the most relationships drawn on the canvas:
 * every edge between two visible models counts, whatever its relation type,
 * and a self-relation counts once. Ties break by model name.
 */
export function mostRelatedModelSlug(
  nodes: ReadonlyArray<NodeInfo>,
  edges: ReadonlyArray<EdgeInfo>,
  visibleIds: ReadonlySet<string>,
): string | null {
  const counts = new Map<string, number>();
  for (const e of edges) {
    if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) continue;
    counts.set(e.source, (counts.get(e.source) ?? 0) + 1);
    if (e.target !== e.source) counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
  }
  const best = nodes
    .filter((n) => visibleIds.has(n.id))
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name))[0];
  return best ? slugify(best.name) || null : null;
}

export interface ExportNameInputs {
  documentName: string | null;
  textBlocks: ReadonlyMap<string, TextBlock>;
  nodes: ReadonlyArray<NodeInfo>;
  edges: ReadonlyArray<EdgeInfo>;
  visibleIds: ReadonlySet<string>;
}

export function defaultExportBasename({ documentName, textBlocks, nodes, edges, visibleIds }: ExportNameInputs): string {
  return documentName || titleSlug(textBlocks) || mostRelatedModelSlug(nodes, edges, visibleIds) || FALLBACK;
}
