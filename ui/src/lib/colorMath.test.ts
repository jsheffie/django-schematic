import { describe, expect, it } from "vitest";
import { blend, contrast, fromOklch, parseColor, toHex, toOklch } from "./colorMath";

// Issue #132: WCAG contrast checks need real color math.

describe("parseColor", () => {
  it("reads hex, hsl and oklch", () => {
    expect(toHex(parseColor("#fff"))).toBe("#ffffff");
    expect(toHex(parseColor("#1976d2"))).toBe("#1976d2");
    expect(toHex(parseColor("hsl(0, 100%, 50%)"))).toBe("#ff0000");
    expect(toHex(parseColor("hsl(120,55%,45%)"))).toBe("#34b234");
    expect(toHex(parseColor("oklch(100% 0 0)"))).toBe("#ffffff");
    expect(toHex(parseColor("oklch(62.8% 0.2577 29.23)"))).toBe("#ff0000");
  });

  it("reads an alpha suffix and color/alpha forms", () => {
    expect(parseColor("#ef44444D").alpha).toBeCloseTo(0x4d / 255);
    expect(parseColor("oklch(16% 0.016 262 / 0.7)").alpha).toBeCloseTo(0.7);
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrast("#6b7280", "#ffffff")).toBeCloseTo(4.83, 2);
  });
});

describe("oklch round trip", () => {
  it("converts to oklch and back", () => {
    const c = parseColor("#7b1fa2");
    expect(toHex(fromOklch(toOklch(c)))).toBe("#7b1fa2");
  });
});

describe("blend", () => {
  it("composites a translucent color over an opaque one", () => {
    expect(toHex(blend(parseColor("#00000080"), parseColor("#ffffff")))).toBe("#7f7f7f");
  });
});
