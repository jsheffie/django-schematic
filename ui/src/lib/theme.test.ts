// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
} from "./theme";

// Issue #132: a per-viewer theme preference (System, Light, Dark), kept in the
// browser and never in exported configs.

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = "";
});

const throwingStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("theme preference storage", () => {
  it("defaults to System", () => {
    expect(readThemePreference()).toBe("system");
  });

  it("remembers the choice between visits", () => {
    writeThemePreference("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readThemePreference()).toBe("dark");
  });

  it("ignores a stored value it does not know", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference()).toBe("system");
  });

  it("falls back to System when storage is blocked, and saving does not throw", () => {
    expect(readThemePreference(throwingStorage)).toBe("system");
    expect(() => writeThemePreference("dark", throwingStorage)).not.toThrow();
  });
});

describe("resolveTheme", () => {
  it("follows the system setting for System", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("uses an explicit choice whatever the system says", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("applyTheme", () => {
  it("marks the document so the CSS tokens and native controls follow", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});
