import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { backdropClick } from "../lib/backdrop";
import { IconImport } from "./icons";

interface Props {
  open: boolean;
  /** A file is being dragged over the window: a drop anywhere imports it. */
  dragging: boolean;
  /** Opens the system file picker. */
  onChoose: () => void;
  onCancel: () => void;
}

/**
 * File > Import PNG (issue #129): a drop zone, or Choose file for the system
 * picker. The drop itself is caught by FileDropOverlay, which goes quiet while
 * this dialog is open so the zone here is what lights up.
 */
export default function ImportPngDialog({ open, dragging, onChoose, onCancel }: Props) {
  const titleId = useId();
  const chooseRef = useRef<HTMLButtonElement>(null);

  // Enter on the focused Choose file button opens the picker.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => chooseRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  // Portaled: the File menu lives in the transformed toolbar, which would make `fixed` relative to it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div data-dialog-backdrop className="absolute inset-0 bg-black/30" onClick={backdropClick(onCancel)} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id={titleId} className="text-sm font-semibold text-gray-800">Import PNG</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <div
            data-active={dragging || undefined}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
            }`}
          >
            <IconImport className={`w-7 h-7 ${dragging ? "text-blue-600" : "text-gray-400"}`} />
            {dragging ? (
              <p className="text-sm font-semibold text-blue-700">Release to import</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Drop an exported PNG here</p>
                <p className="text-xs text-gray-500">or choose one with the button below</p>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={chooseRef}
              onClick={onChoose}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Choose file…
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
