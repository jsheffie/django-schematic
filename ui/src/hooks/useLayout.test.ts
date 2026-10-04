import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import { runDagreLayout } from "./useLayout";

// Annotations share the canvas with model nodes but are never laid out.
const nodes: Node[] = [
  { id: "a.A", type: "model", position: { x: 0, y: 0 }, data: {} },
  { id: "a.B", type: "model", position: { x: 0, y: 0 }, data: {} },
  { id: "tb_1", type: "text", position: { x: 999, y: 888 }, data: {} },
  { id: "anchor:ar_1:to", type: "anchor", position: { x: -5, y: -6 }, data: {} },
];
const sizes = new Map([
  ["a.A", { width: 100, height: 40 }],
  ["a.B", { width: 100, height: 40 }],
]);

describe("runDagreLayout", () => {
  it("positions model nodes and passes every other node through untouched", () => {
    const out = runDagreLayout(nodes, [{ id: "e", source: "a.A", target: "a.B" }], "LR", sizes);
    expect(out).toHaveLength(4);
    expect(out.map((n) => n.id)).toEqual(nodes.map((n) => n.id)); // order kept
    expect(out.find((n) => n.id === "tb_1")?.position).toEqual({ x: 999, y: 888 });
    expect(out.find((n) => n.id === "anchor:ar_1:to")?.position).toEqual({ x: -5, y: -6 });
    expect(out.find((n) => n.id === "a.B")?.position.x).toBeGreaterThan(0);
  });

  it("ignores edges that touch a non-model node", () => {
    expect(() =>
      runDagreLayout(nodes, [{ id: "e", source: "tb_1", target: "a.A" }], "TB", sizes),
    ).not.toThrow();
  });
});
