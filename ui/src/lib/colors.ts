/**
 * Deterministic HSL color from an app label string.
 * Produces visually distinct, pastel colors for each app.
 */
export function appColor(appLabel: string): string {
  let hash = 0;
  for (let i = 0; i < appLabel.length; i++) {
    hash = appLabel.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // Convert to 32-bit int
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

/**
 * Lighter background variant of an app color for node backgrounds.
 */
export function appColorBg(appLabel: string): string {
  let hash = 0;
  for (let i = 0; i < appLabel.length; i++) {
    hash = appLabel.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 40%, 96%)`;
}
