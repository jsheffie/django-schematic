/**
 * Color palette system for app-label-based node coloring.
 *
 * All palettes use a deterministic hash so each app always gets the same color.
 * "Schema Graph" mirrors the palette used by django-schema-view.
 */

import { contrast, fromOklch, parseColor, toHex, toOklch } from "./colorMath";
import type { ResolvedTheme } from "./theme";

export type ColorPalette = "pastel" | "schema-graph" | "muted";

interface PaletteEntry {
  border: string;
  bg: string;
}

/** A node's colors in one theme: border, fill, and the app label's text color. */
export interface AppColors extends PaletteEntry {
  text: string;
}

/** The panel surface token in index.css (`--color-surface`), per theme. */
export const SURFACE: Record<ResolvedTheme, string> = {
  light: "#ffffff",
  dark: "oklch(23% 0.02 262)",
};

const AA_TEXT = 4.5;

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

function paletteEntry(appLabel: string, palette: ColorPalette): PaletteEntry {
  const h = hashApp(appLabel);
  if (palette === "schema-graph") {
    return SCHEMA_GRAPH[h % SCHEMA_GRAPH.length];
  }
  if (palette === "muted") {
    return MUTED[h % MUTED.length];
  }
  // pastel: full HSL hue space, soft tones
  return pastelColors(h % 360);
}

/**
 * `color` moved in OKLCH lightness (darker in light, lighter in dark) just
 * far enough to reach WCAG AA text contrast against every background. A color
 * that already passes is returned as is.
 */
function readableOn(color: string, backgrounds: string[], theme: ResolvedTheme): string {
  const passes = (c: string) => backgrounds.every((bg) => contrast(c, bg) >= AA_TEXT);
  if (passes(color)) return color;
  const base = toOklch(parseColor(color));
  const step = theme === "light" ? -0.005 : 0.005;
  for (let l = base.l; l >= 0 && l <= 1; l += step) {
    const candidate = toHex(fromOklch({ ...base, l }));
    if (passes(candidate)) return candidate;
  }
  return theme === "light" ? "#000000" : "#ffffff";
}

/** The dark version of a node: same hue, a dark tinted fill and a lighter border. */
function darkEntry({ border }: PaletteEntry): PaletteEntry {
  const { c, h } = toOklch(parseColor(border));
  return {
    border: toHex(fromOklch({ l: 0.68, c: Math.min(c, 0.16), h })),
    bg: toHex(fromOklch({ l: 0.28, c: Math.min(c * 0.3, 0.045), h })),
  };
}

const cache = new Map<string, AppColors>();

/**
 * A node's colors for its app (issue #132: per theme, WCAG AA). Light keeps
 * each palette's border and fill; the label text is darkened only where the
 * border color itself is too light to read. Dark derives fill and border from
 * the same hue.
 */
export function appColors(
  appLabel: string,
  palette: ColorPalette = "pastel",
  theme: ResolvedTheme = "light",
): AppColors {
  const key = `${theme}|${palette}|${appLabel}`;
  let colors = cache.get(key);
  if (!colors) {
    const light = paletteEntry(appLabel, palette);
    const entry = theme === "light" ? light : darkEntry(light);
    colors = { ...entry, text: readableOn(entry.border, [entry.bg, SURFACE[theme]], theme) };
    cache.set(key, colors);
  }
  return colors;
}

export function pastelColors(hue: number): PaletteEntry {
  return {
    border: `hsl(${hue}, 55%, 45%)`,
    bg: `hsl(${hue}, 40%, 96%)`,
  };
}

/** Five border colors that preview a palette in Settings > Appearance, as nodes show them in `theme`. */
export function paletteSwatches(palette: ColorPalette, theme: ResolvedTheme = "light"): string[] {
  const entries =
    palette === "schema-graph"
      ? SCHEMA_GRAPH.slice(0, 5)
      : palette === "muted"
        ? MUTED.slice(0, 5)
        : [0, 120, 210, 45, 270].map((hue) => pastelColors(hue));
  return entries.map((e) => (theme === "light" ? e : darkEntry(e)).border);
}

/** Single border color — used by MiniMap and legacy callers. */
export function appColor(appLabel: string, palette: ColorPalette = "pastel", theme: ResolvedTheme = "light"): string {
  return appColors(appLabel, palette, theme).border;
}
