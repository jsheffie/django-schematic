/**
 * Theme preference (issue #132): System (follows `prefers-color-scheme`),
 * Light or Dark. A per-viewer setting kept in localStorage, never in the
 * exported config: the theme is a personal preference, not part of a diagram.
 *
 * The resolved theme is set as `data-theme` on <html>; every color is a CSS
 * token in index.css that switches on it. The Django template runs the same
 * logic in an inline <head> script before the stylesheet loads, so a dark page
 * never flashes light (keep THEME_STORAGE_KEY in sync with
 * schematic/templates/schematic/index.html).
 */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "django-schematic:theme";
export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked site data, sandboxed frame
  }
}

export function readThemePreference(storage: Storage | null = browserStorage()): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(stored as ThemePreference) ? (stored as ThemePreference) : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(pref: ThemePreference, storage: Storage | null = browserStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Not remembered between visits, but still applied for this one.
  }
}

export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === "system") return systemPrefersDark ? "dark" : "light";
  return pref;
}

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

/** Marks <html> so the CSS tokens and native controls (scrollbars, inputs) follow. */
export function applyTheme(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
