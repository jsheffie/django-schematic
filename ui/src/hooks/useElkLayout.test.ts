import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Edge, Node } from "@xyflow/react";

// Count how many times the ELK constructor runs and let tests make it fail.
const ctor = vi.fn();
let failNext = false;

vi.mock("elkjs/lib/elk.bundled.js", () => ({
  default: class {
    constructor() {
      ctor();
      if (failNext) {
        failNext = false;
        throw new Error("chunk load failed");
      }
    }
    layout(graph: { children: { id: string }[] }) {
      return Promise.resolve({
        ...graph,
        children: graph.children.map((c, i) => ({ ...c, x: i * 100, y: 50 })),
      });
    }
  },
}));

const nodes: Node[] = [
  { id: "a", position: { x: 0, y: 0 }, data: {} },
  { id: "b", position: { x: 0, y: 0 }, data: {} },
];
const edges: Edge[] = [{ id: "a-b", source: "a", target: "b" }];

describe("runElkLayout (lazy ELK)", () => {
  beforeEach(() => {
    vi.resetModules();
    ctor.mockClear();
    failNext = false;
  });

  it("does not instantiate ELK on module import", async () => {
    await import("./useElkLayout");
    expect(ctor).not.toHaveBeenCalled();
  });

  it("does not load ELK for an empty graph", async () => {
    const { runElkLayout } = await import("./useElkLayout");
    expect(await runElkLayout([], [], new Map())).toEqual([]);
    expect(ctor).not.toHaveBeenCalled();
  });

  it("loads ELK once and reuses the instance across calls", async () => {
    const { runElkLayout } = await import("./useElkLayout");
    const first = await runElkLayout(nodes, edges, new Map());
    await runElkLayout(nodes, edges, new Map());
    await Promise.all([
      runElkLayout(nodes, edges, new Map()),
      runElkLayout(nodes, edges, new Map()),
    ]);
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(first.map((n) => n.position)).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ]);
  });

  it("retries the load after a failure instead of caching the rejection", async () => {
    const { runElkLayout } = await import("./useElkLayout");
    failNext = true;
    await expect(runElkLayout(nodes, edges, new Map())).rejects.toThrow("chunk load failed");
    const positioned = await runElkLayout(nodes, edges, new Map());
    expect(positioned[1].position).toEqual({ x: 100, y: 50 });
    expect(ctor).toHaveBeenCalledTimes(2);
  });
});
