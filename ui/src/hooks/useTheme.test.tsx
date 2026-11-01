// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useApplyTheme } from "./useTheme";
import { usePhysicsStore } from "../store/physicsStore";
import { THEME_STORAGE_KEY } from "../lib/theme";
import { exportConfig } from "../lib/config";

// Issue #132: System follows the OS setting live; Light and Dark override it.

/** jsdom has no matchMedia: a controllable stand-in for `(prefers-color-scheme: dark)`. */
function mockSystemTheme(dark: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return dark;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };
  window.matchMedia = (() => mql) as unknown as typeof window.matchMedia;
  return (next: boolean) => {
    dark = next;
    listeners.forEach((cb) => cb());
  };
}

const html = document.documentElement;

beforeEach(() => usePhysicsStore.getState().setTheme("system"));
afterEach(() => {
  localStorage.clear();
  delete html.dataset.theme;
});

describe("useApplyTheme", () => {
  it("System follows the OS setting, live", () => {
    const setSystemDark = mockSystemTheme(false);
    const { result } = renderHook(() => useApplyTheme());
    expect(result.current).toBe("light");
    expect(html.dataset.theme).toBe("light");
    act(() => setSystemDark(true));
    expect(result.current).toBe("dark");
    expect(html.dataset.theme).toBe("dark");
  });

  it("an explicit choice overrides the OS setting", () => {
    mockSystemTheme(true);
    renderHook(() => useApplyTheme());
    act(() => usePhysicsStore.getState().setTheme("light"));
    expect(html.dataset.theme).toBe("light");
  });
});

describe("theme setting", () => {
  it("is remembered between visits", () => {
    usePhysicsStore.getState().setTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("is a personal preference, never written into an exported config", () => {
    usePhysicsStore.getState().setTheme("dark");
    expect(exportConfig(null)).not.toMatch(/theme/i);
  });
});
