import type { MouseEvent } from "react";

/**
 * Click handler for a modal backdrop that dismisses on a deliberate click but
 * not on the trailing click of a double-click.
 *
 * The button that opens a modal sits under the backdrop once the modal is up,
 * so a double-click on it opens the modal (first click) and then immediately
 * dismisses it (second click lands on the backdrop). Browsers mark the second
 * click with `detail === 2`; ignoring any click with detail > 1 keeps the modal
 * open while a later, separate click on the backdrop still closes it.
 */
export function backdropClick(dismiss: () => void): (e: MouseEvent) => void {
  return (e) => {
    if (e.detail > 1) return;
    dismiss();
  };
}
