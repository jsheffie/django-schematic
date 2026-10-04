import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { backdropClick } from "../lib/backdrop";

interface Props {
  open: boolean;
  /** Labels of the tables whose custom field order the sort would replace. */
  affected: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const MAX_NAMES = 6;

/**
 * Confirmation shown by the toolbar's "Sort all tables by type" (issue #117
 * follow-up). Always shown: it says what the sort does and, when some tables
 * already have a custom field order, names them. Same modal recipe as
 * FilenameDialog and HelpDialog. The confirm button takes focus so Enter /
 * Space proceed and Escape cancels.
 *
 * Rendered through a portal: the toolbar that owns this dialog is positioned
 * with a CSS transform, which would make it the containing block for a
 * `fixed` child and pin the modal to the toolbar instead of the viewport.
 */
export default function SortAllDialog({ open, affected, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => confirmRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const count = affected.length;
  const shown = affected.slice(0, MAX_NAMES);
  const more = count - shown.length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div data-dialog-backdrop className="absolute inset-0 bg-black/30" onClick={backdropClick(onCancel)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sort-all-dialog-title"
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="sort-all-dialog-title" className="text-sm font-semibold text-gray-800">Sort all tables by type</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">×</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3 text-xs text-gray-600">
          <p>
            Every table's fields will be put in the same order: primary key, relations, fields grouped
            by type, booleans, dates and times last. Hidden fields and colors are kept.
          </p>
          {count === 0 ? (
            <p className="text-gray-500">
              No table has a custom field order yet, so nothing arranged by hand will be replaced.
            </p>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              <span className="font-medium">
                {count === 1
                  ? "1 table already has a custom field order"
                  : `${count} tables already have a custom field order`}
              </span>
              {" "}from dragging or an earlier sort. {count === 1 ? "It" : "They"} will be replaced:{" "}
              <span className="font-medium">{shown.join(", ")}</span>
              {more > 0 ? ` and ${more} more` : ""}.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sort all tables
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
