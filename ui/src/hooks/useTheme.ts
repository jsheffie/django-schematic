import { useLayoutEffect, useSyncExternalStore } from "react";
import { usePhysicsStore } from "../store/physicsStore";
import { DARK_QUERY, applyTheme, resolveTheme, systemPrefersDark, type ResolvedTheme } from "../lib/theme";

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** The theme in effect: the viewer's choice, or the OS setting for System (issue #132). */
export function useResolvedTheme(): ResolvedTheme {
  const preference = usePhysicsStore((s) => s.theme);
  const prefersDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => false);
  return resolveTheme(preference, prefersDark);
}

/** Keeps <html data-theme> in step with the resolved theme. Used once, by App. */
export function useApplyTheme(): ResolvedTheme {
  const theme = useResolvedTheme();
  useLayoutEffect(() => applyTheme(theme), [theme]);
  return theme;
}
