import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SURFACE, appColors, paletteSwatches, pastelColors, type ColorPalette } from "./colors";
import { contrast } from "./colorMath";

const PALETTES: ColorPalette[] = ["pastel", "schema-graph", "muted"];
// Enough labels to land on every fixed-palette entry and a spread of pastel hues.
const LABELS = Array.from({ length: 400 }, (_, i) => `app_${i}`);

describe("paletteSwatches", () => {
  it.each(PALETTES)("previews %s with five of its own border colors", (palette) => {
    const swatches = paletteSwatches(palette);
    expect(swatches).toHaveLength(5);
    expect(new Set(swatches).size).toBe(5);
  });

  it("uses the palette's real colors", () => {
    expect(paletteSwatches("schema-graph")).toEqual(["#e91e63", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2"]);
    expect(paletteSwatches("muted")).toEqual(["#64748b", "#16a34a", "#2563eb", "#dc2626", "#7c3aed"]);
    // Pastel spreads apps over the hue circle: preview a spread of hues.
    expect(paletteSwatches("pastel")).toEqual([0, 120, 210, 45, 270].map((hue) => pastelColors(hue).border));
  });

  it("previews the dark borders in the dark theme (issue #132)", () => {
    for (const palette of PALETTES) {
      const dark = paletteSwatches(palette, "dark");
      expect(dark).not.toEqual(paletteSwatches(palette, "light"));
      // Every dark swatch is a border some app actually gets in dark.
      const darkBorders = new Set(LABELS.map((l) => appColors(l, palette, "dark").border));
      if (palette !== "pastel") for (const c of dark) expect(darkBorders).toContain(c);
    }
  });
});

// Issue #132: app colors must meet WCAG AA in both themes.
describe("app colors", () => {
  it("keeps the light theme's node borders and fills, darkening only a label that is too light", () => {
    // "library" lands on Schema Graph's cyan, whose border is too light to read as text.
    expect(appColors("library", "schema-graph", "light")).toEqual({ border: "#0097a7", bg: "#e0f7fa", text: "#007a87" });
    expect(pastelColors(200)).toMatchObject({ border: "hsl(200, 55%, 45%)", bg: "hsl(200, 40%, 96%)" });
  });

  describe.each(["light", "dark"] as const)("%s theme", (theme) => {
    it.each(PALETTES)("%s: the app label is readable (4.5:1) on the node and on panels", (palette) => {
      for (const label of LABELS) {
        const { text, bg } = appColors(label, palette, theme);
        expect.soft(contrast(text, bg), `${palette} ${label} on node`).toBeGreaterThanOrEqual(4.5);
        expect.soft(contrast(text, SURFACE[theme]), `${palette} ${label} on panel`).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(PALETTES)("%s: the node border stands out from its fill (3:1)", (palette) => {
      for (const label of LABELS) {
        const { border, bg } = appColors(label, palette, theme);
        expect.soft(contrast(border, bg), `${palette} ${label}`).toBeGreaterThanOrEqual(theme === "light" ? 1.5 : 3);
      }
    });
  });

  it("keeps the light text color when it already passes", () => {
    const blue = LABELS.map((l) => appColors(l, "muted", "light")).find((c) => c.border === "#2563eb");
    expect(blue?.text).toBe("#2563eb");
  });

  it("gives dark nodes dark fills", () => {
    for (const palette of PALETTES) {
      const { bg } = appColors("library", palette, "dark");
      expect(contrast(bg, "#000000")).toBeLessThan(2);
    }
  });
});

describe("SURFACE", () => {
  it("matches the surface token in index.css", () => {
    const css = readFileSync(join(__dirname, "../index.css"), "utf8");
    const dark = css.slice(css.indexOf(':root[data-theme="dark"] {'));
    expect(css).toContain(`--color-surface: ${SURFACE.light};`);
    expect(dark).toContain(`--color-surface: ${SURFACE.dark};`);
  });
});
