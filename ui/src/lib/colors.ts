/**
 * Color palette system for app-label-based node coloring.
 *
 * All palettes use a deterministic hash so each app always gets the same color.
 * "Schema Graph" mirrors the palette used by django-schema-view.
 */

export type ColorPalette = "pastel" | "schema-graph" | "muted";

interface PaletteEntry {
  border: string;
  bg: string;
}

// Vibrant borders, soft pastel backgrounds — mirrors django-schema-view
const SCHEMA_GRAPH: PaletteEntry[] = [
  { border: "#e91e63", bg: "#fce4ec" }, // pink
  { border: "#1976d2", bg: "#e3f2fd" }, // blue
  { border: "#388e3c", bg: "#e8f5e9" }, // green
  { border: "#f57c00", bg: "#fff3e0" }, // orange
  { border: "#7b1fa2", bg: "#f3e5f5" }, // purple
  { border: "#00796b", bg: "#e0f2f1" }, // teal
  { border: "#d32f2f", bg: "#ffebee" }, // red
  { border: "#f9a825", bg: "#fffde7" }, // amber
  { border: "#303f9f", bg: "#e8eaf6" }, // indigo
  { border: "#0097a7", bg: "#e0f7fa" }, // cyan
];

// Low-saturation, professional
const MUTED: PaletteEntry[] = [
  { border: "#64748b", bg: "#f8fafc" }, // slate
  { border: "#16a34a", bg: "#f0fdf4" }, // green
  { border: "#2563eb", bg: "#eff6ff" }, // blue
  { border: "#dc2626", bg: "#fef2f2" }, // red
  { border: "#7c3aed", bg: "#f5f3ff" }, // violet
  { border: "#ea580c", bg: "#fff7ed" }, // orange
  { border: "#0d9488", bg: "#f0fdfa" }, // teal
  { border: "#ca8a04", bg: "#fefce8" }, // yellow
];

function hashApp(appLabel: string): number {
  let hash = 0;
  for (let i = 0; i < appLabel.length; i++) {
    hash = appLabel.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function appColors(appLabel: string, palette: ColorPalette = "pastel"): PaletteEntry {
  const h = hashApp(appLabel);
  if (palette === "schema-graph") {
    return SCHEMA_GRAPH[h % SCHEMA_GRAPH.length];
  }
  if (palette === "muted") {
    return MUTED[h % MUTED.length];
  }
  // pastel: full HSL hue space, soft tones
  const hue = h % 360;
  return {
    border: `hsl(${hue}, 55%, 45%)`,
    bg: `hsl(${hue}, 40%, 96%)`,
  };
}

/** Single border color — used by MiniMap and legacy callers. */
export function appColor(appLabel: string, palette: ColorPalette = "pastel"): string {
  return appColors(appLabel, palette).border;
}

/** Light background color for node fill. */
export function appColorBg(appLabel: string, palette: ColorPalette = "pastel"): string {
  return appColors(appLabel, palette).bg;
}
