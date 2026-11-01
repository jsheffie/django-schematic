import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SURFACE, appColors, type ColorPalette } from "./colors";
import { blend, contrast, parseColor, type Rgba } from "./colorMath";
import { FIELD_COLOR_SWATCHES } from "./fieldEdits";
import { NODE_TEXT, ON_FIELD_TINTS } from "./nodeText";
import type { ResolvedTheme } from "./theme";

// Issue #132: every text a model node draws meets WCAG AA (4.5:1) in both
// themes: on each palette's node fill and the proxy fill, and on field rows
// tinted with any field color (drawn as the swatch at alpha 0x4D).

const tailwind = readFileSync(join(__dirname, "../../node_modules/tailwindcss/theme.css"), "utf8");
const css = readFileSync(join(__dirname, "../index.css"), "utf8");
const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"] {'));

function token(name: string, theme: ResolvedTheme): string {
  const source = theme === "dark" && darkBlock.includes(`--color-${name}:`) ? darkBlock : tailwind;
  const m = new RegExp(`--color-${name}:\\s*([^;]+);`).exec(source);
  if (!m) throw new Error(`no --color-${name} for ${theme}`);
  return m[1].trim();
}

/** The light and dark color token a class string draws: `text-x` and its `dark:text-y` variant. */
function textTokens(classes: string): Record<ResolvedTheme, string> {
  const light = /(?:^|\s)text-([a-z]+-\d+)/.exec(classes)![1];
  const dark = /dark:text-([a-z]+-\d+)/.exec(classes)?.[1] ?? light;
  return { light, dark };
}

const PALETTES: ColorPalette[] = ["pastel", "schema-graph", "muted"];
const LABELS = Array.from({ length: 120 }, (_, i) => `app_${i}`);

function fills(theme: ResolvedTheme): string[] {
  const set = new Set<string>([SURFACE[theme]]); // proxy models are drawn on the surface
  for (const palette of PALETTES) for (const label of LABELS) set.add(appColors(label, palette, theme).bg);
  return [...set];
}

const tint = (swatch: string | null, fill: Rgba): Rgba =>
  swatch ? blend(parseColor(`${swatch}4D`), fill) : fill;

describe.each(["light", "dark"] as const)("model node text, %s theme", (theme) => {
  const nodeFills = fills(theme).map((f) => parseColor(f));

  it.each(Object.keys(NODE_TEXT) as (keyof typeof NODE_TEXT)[])("%s text is readable on every fill and field color", (role) => {
    const fg = parseColor(token(textTokens(NODE_TEXT[role])[theme], theme));
    const swatches = ON_FIELD_TINTS.includes(role) ? [null, ...FIELD_COLOR_SWATCHES] : [null];
    let worst = Infinity;
    for (const fill of nodeFills) {
      for (const swatch of swatches) worst = Math.min(worst, contrast(fg, tint(swatch, fill)));
    }
    expect(worst).toBeGreaterThanOrEqual(4.5);
  });
});

describe("model node components", () => {
  it.each(["ModelNode.tsx", "FieldEditor.tsx"])("%s draws field text with NODE_TEXT, not raw classes", (file) => {
    const src = readFileSync(join(__dirname, "../components", file), "utf8");
    expect(src).toContain("NODE_TEXT.name");
    expect(src).toContain("NODE_TEXT.relation");
    expect(src).toContain("NODE_TEXT.type");
    expect(src).not.toMatch(/text-blue-[67]00/);
  });
});
