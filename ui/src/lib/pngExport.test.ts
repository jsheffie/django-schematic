// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { pngExportFilter } from "./pngExport";

function el(className: string, attrs: Record<string, string> = {}): Element {
  const e = document.createElement("div");
  e.className = className;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

describe("pngExportFilter", () => {
  it("keeps diagram content", () => {
    expect(pngExportFilter(el("react-flow__node"))).toBe(true);
    expect(pngExportFilter(el("react-flow__edge"))).toBe(true);
  });

  it("drops UI chrome", () => {
    expect(pngExportFilter(el("react-flow__minimap"))).toBe(false);
    expect(pngExportFilter(el("react-flow__resize-control"))).toBe(false);
    expect(pngExportFilter(el("react-flow__node-toolbar"))).toBe(false);
    expect(pngExportFilter(el("toolbar", { "data-export-skip": "" }))).toBe(false);
  });

  it("drops the zoom controls panel", () => {
    expect(pngExportFilter(el("react-flow__panel react-flow__controls bottom left"))).toBe(false);
  });
});
