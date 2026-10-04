import { describe, expect, it, vi } from "vitest";
import type { MouseEvent } from "react";
import { backdropClick } from "./backdrop";

const click = (detail: number) => ({ detail }) as unknown as MouseEvent;

describe("backdropClick", () => {
  it("dismisses on a single click", () => {
    const dismiss = vi.fn();
    backdropClick(dismiss)(click(1));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores the trailing click of a double-click", () => {
    const dismiss = vi.fn();
    backdropClick(dismiss)(click(2));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("dismisses on a synthetic click with detail 0 (keyboard / element.click())", () => {
    const dismiss = vi.fn();
    backdropClick(dismiss)(click(0));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
