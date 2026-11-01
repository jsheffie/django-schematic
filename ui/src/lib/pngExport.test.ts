// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import { toPng } from "html-to-image";
import { captureCanvasPng, pngExportFilter } from "./pngExport";

vi.mock("html-to-image", () => ({ toPng: vi.fn() }));

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

// Issue #132: the PNG is exported in the theme on screen.
describe("captureCanvasPng background", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.documentElement.style.removeProperty("--color-canvas");
  });

  it("fills the PNG with the current theme's canvas color", async () => {
    const png = readFileSync(join(__dirname, "__fixtures__/export-v7.png")).toString("base64");
    vi.mocked(toPng).mockResolvedValue(`data:image/png;base64,${png}`);
    document.body.innerHTML = '<div class="react-flow"></div>';
    document.documentElement.style.setProperty("--color-canvas", "rgb(20, 24, 33)");
    const schema = { nodes: [], edges: [], app_labels: [], app_names: {} };
    await captureCanvasPng({ getNodes: () => [], setNodes: vi.fn() }, schema);
    expect(vi.mocked(toPng).mock.calls[0][1]).toMatchObject({ backgroundColor: "rgb(20, 24, 33)" });
  });
});
