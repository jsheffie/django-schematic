import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Issue #132: every color the UI draws comes from a theme token in index.css,
// so light and dark cannot drift apart. These checks catch the usual ways a
// light-only color slips back in. Palette data (lib/colors.ts, lib/fieldEdits.ts)
// is exempt: those swatch values are saved in configs and read the same in both.

const SRC = join(__dirname, "..");
const files = [
  ...readdirSync(join(SRC, "components"))
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
    .map((f) => join("components", f)),
  "App.tsx",
  "lib/markers.tsx",
  "lib/pngExport.ts",
];

function offending(pattern: RegExp, linePredicate: (line: string) => boolean = () => true): string[] {
  const hits: string[] = [];
  for (const file of files) {
    readFileSync(join(SRC, file), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return; // comments may name colors (and issue numbers)
        if (pattern.test(line) && linePredicate(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
      });
  }
  return hits;
}

describe("theme guard", () => {
  it("uses the surface token, not white, for backgrounds and fills", () => {
    expect(offending(/\b(bg|fill|from|to|border|ring|outline|stroke)-white\b/)).toEqual([]);
  });

  it("uses the backdrop token, not black, for modal backdrops", () => {
    expect(offending(/\bbg-black\b/)).toEqual([]);
  });

  it("puts text-inverse, not text-white, on gray surfaces, which turn light in dark", () => {
    expect(offending(/\btext-white\b/, (line) => /\bbg-gray-\d/.test(line))).toEqual([]);
  });

  it("has no hard-coded hex, rgb or hsl colors", () => {
    expect(offending(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|"white"|"black"|,\s*white\)/)).toEqual([]);
  });
});
