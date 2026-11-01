/**
 * Theme tokens for inline styles and SVG (issue #132). Each is a CSS custom
 * property declared in index.css under `@theme static` (always emitted) and
 * redefined for dark, so inline colors follow the theme like Tailwind classes.
 * SVG presentation attributes do not resolve var(): set these through `style`.
 */
const v = (name: string) => `var(--color-${name})`;

export const TOKEN_NAMES = [
  "foreground",
  "surface",
  "canvas",
  "inverse",
  "backdrop",
  "ink",
  "ink-selected",
  "guide",
  "canvas-dots",
  "canvas-lines",
  "minimap-mask",
  "edge-fk",
  "edge-o2o",
  "edge-m2m",
  "edge-subclass",
  "edge-proxy",
] as const;

export const THEME = {
  surface: v("surface"),
  canvas: v("canvas"),
  /** Default annotation ink: arrows and title text blocks. */
  ink: v("ink"),
  inkSelected: v("ink-selected"),
  /** Resize handles and selection outlines. */
  guide: v("guide"),
  canvasDots: v("canvas-dots"),
  canvasLines: v("canvas-lines"),
  minimapMask: v("minimap-mask"),
  edge: {
    fk: v("edge-fk"),
    o2o: v("edge-o2o"),
    m2m: v("edge-m2m"),
    subclass: v("edge-subclass"),
    proxy: v("edge-proxy"),
  },
} as const;

/** The resolved value of a token on the current document, for APIs that need a real color. */
export function resolvedToken(name: (typeof TOKEN_NAMES)[number]): string {
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}
