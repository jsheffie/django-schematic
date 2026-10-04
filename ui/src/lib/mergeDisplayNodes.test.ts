import { describe, it, expect } from "vitest";
import type { Node } from "@xyflow/react";
import { mergeDisplayNodes } from "./mergeDisplayNodes";

const node = (id: string, type: string, extra: Partial<Node> = {}): Node => ({
  id, type, position: { x: 0, y: 0 }, data: {}, ...extra,
});

describe("mergeDisplayNodes", () => {
  it("keeps the current position and measured size of nodes already on the canvas", () => {
    const current = [node("a.A", "model", { position: { x: 50, y: 60 }, measured: { width: 220, height: 80 }, selected: true })];
    const next = [node("a.A", "model", { position: { x: 0, y: 0 } })];
    expect(mergeDisplayNodes(current, next, false)).toEqual([
      { ...next[0], position: { x: 50, y: 60 }, measured: { width: 220, height: 80 }, selected: true },
    ]);
  });

  it("takes incoming positions and drops measurements on an import", () => {
    const current = [node("a.A", "model", { position: { x: 50, y: 60 }, measured: { width: 220, height: 80 } })];
    const next = [node("a.A", "model", { position: { x: 7, y: 8 } })];
    const out = mergeDisplayNodes(current, next, true);
    expect(out[0].position).toEqual({ x: 7, y: 8 });
    expect(out[0].measured).toBeUndefined();
  });

  it("selects a text block that just appeared and deselects everything else", () => {
    const current = [node("a.A", "model", { selected: true }), node("tb_old", "text")];
    const next = [node("a.A", "model"), node("tb_old", "text"), node("tb_new", "text", { position: { x: 1, y: 2 } })];
    const out = mergeDisplayNodes(current, next, false);
    expect(out.map((n) => [n.id, n.selected ?? false])).toEqual([
      ["a.A", false], ["tb_old", false], ["tb_new", true],
    ]);
    expect(out[2].position).toEqual({ x: 1, y: 2 });
  });

  it("does not touch the selection when no text block was added", () => {
    const current = [node("a.A", "model", { selected: true }), node("anchor:ar_1:to", "anchor")];
    const next = [node("a.A", "model"), node("anchor:ar_1:to", "anchor"), node("anchor:ar_2:to", "anchor")];
    const out = mergeDisplayNodes(current, next, false);
    expect(out.map((n) => n.selected)).toEqual([true, undefined, undefined]);
  });
});
