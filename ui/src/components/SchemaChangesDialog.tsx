import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { backdropClick } from "../lib/backdrop";
import { hasSchemaChanges, type SchemaChanges } from "../lib/schemaChanges";

interface Props {
  changes: SchemaChanges | null;
  onClose: () => void;
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title} <span className="font-normal">({items.length})</span>
      </h3>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item} className="font-mono text-[11px] text-gray-800 break-all">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Warning shown after an import whose config was saved against a schema that
 * has since changed (issue #131). The import has already been applied; this
 * only tells the user what no longer matches.
 */
export default function SchemaChangesDialog({ changes, onClose }: Props) {
  const titleId = useId();
  const open = changes !== null && hasSchemaChanges(changes);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Portaled: the File menu lives in the transformed toolbar, which would make `fixed` relative to it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div data-dialog-backdrop className="absolute inset-0 bg-black/30" onClick={backdropClick(onClose)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id={titleId} className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span aria-hidden className="text-amber-500">⚠</span>
            The schema has changed
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">
            ×
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4 min-h-0">
          <p className="text-xs text-gray-700">
            This file was saved against a different version of your models. Its layout was applied to what still
            exists. Settings for removed models and fields were dropped and won't be in future exports.
          </p>
          <div className="flex flex-col gap-3 overflow-y-auto min-h-0 rounded-lg bg-gray-50 px-3 py-2.5">
            <Section title="Removed models" items={changes.removedModels} />
            <Section title="Removed fields" items={changes.removedFields.map((f) => `${f.model}.${f.field}`)} />
            <Section
              title="Changed field types"
              items={changes.changedFields.map((f) => `${f.model}.${f.field}: ${f.from} to ${f.to}`)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
