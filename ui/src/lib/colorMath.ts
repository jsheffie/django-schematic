/**
 * Small color toolkit for theme-aware palettes and WCAG contrast (issue #132):
 * parse hex / hsl() / oklch(), convert through OKLCH, composite, and measure
 * contrast. Colors are sRGB channels in 0..1 with an alpha.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export interface Oklch {
  l: number; // 0..1
  c: number;
  h: number; // degrees
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function parseHex(s: string): Rgba {
  let h = s.slice(1);
  if (h.length === 3 || h.length === 4) h = [...h].map((ch) => ch + ch).join("");
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), alpha: h.length === 8 ? n(6) : 1 };
}

function hslToRgb(h: number, s: number, l: number): Rgba {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4), alpha: 1 };
}

const num = (s: string) => (s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s));

export function parseColor(input: string): Rgba {
  const s = input.trim();
  if (s.startsWith("#")) return parseHex(s);
  const m = /^(hsla?|oklch)\(([^)]*)\)$/i.exec(s);
  if (!m) throw new Error(`unsupported color: ${input}`);
  const [main, alphaPart] = m[2].split("/");
  const parts = main.split(/[\s,]+/).filter(Boolean);
  const alpha = alphaPart ? num(alphaPart.trim()) : parts.length === 4 ? num(parts[3]) : 1;
  if (m[1].toLowerCase().startsWith("hsl")) {
    return { ...hslToRgb(parseFloat(parts[0]), num(parts[1]), num(parts[2])), alpha };
  }
  const l = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
  return { ...fromOklch({ l, c: parseFloat(parts[1]), h: parseFloat(parts[2]) }), alpha };
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function toOklch({ r, g, b }: Rgba): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

function oklchToLinear({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH to sRGB. Out-of-gamut colors keep their lightness and hue at the largest chroma that fits. */
export function fromOklch(color: Oklch): Rgba {
  const TOLERANCE = 1e-3; // rounding overshoot at the gamut edge, clamped below
  const fits = (c: number) => oklchToLinear({ ...color, c }).every((x) => x >= -TOLERANCE && x <= 1 + TOLERANCE);
  let c = color.c;
  if (!fits(c)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  const [r, g, b] = oklchToLinear({ ...color, c }).map((x) => clamp01(fromLinear(clamp01(x))));
  return { r, g, b, alpha: 1 };
}

export function toHex({ r, g, b }: Rgba): string {
  const h = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** `top` composited over an opaque `bottom` (straight alpha, sRGB). */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const a = top.alpha;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    alpha: 1,
  };
}

export function luminance(color: Rgba): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/** WCAG 2 contrast ratio between two opaque colors. */
export function contrast(a: string | Rgba, b: string | Rgba): number {
  const la = luminance(typeof a === "string" ? parseColor(a) : a);
  const lb = luminance(typeof b === "string" ? parseColor(b) : b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
