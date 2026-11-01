import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOKEN_NAMES } from "./themeTokens";

// Issue #132: a token used from TS must exist in both themes, or an inline
// color silently falls back to nothing in one of them.

const css = readFileSync(join(__dirname, "../index.css"), "utf8");
const block = (selector: string) => {
  const start = css.indexOf(selector);
  return css.slice(start, css.indexOf("}", start));
};
const light = block("@theme static {");
const dark = block(':root[data-theme="dark"] {');

describe("theme tokens", () => {
  it.each(TOKEN_NAMES)("--color-%s is defined for light and for dark", (name) => {
    expect(light).toContain(`--color-${name}:`);
    expect(dark).toContain(`--color-${name}:`);
  });
});
