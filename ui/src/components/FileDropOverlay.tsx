import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconImport } from "./icons";

interface Props {
  /** The single file dropped on the window. */
  onDrop: (file: File) => void;
  /** A drop that cannot be imported; the message is shown to the user. */
  onReject: (message: string) => void;
}

/** Only drags that carry files from outside are ours; text dragged into a note is left alone. */
function carriesFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * Drag-and-drop import (issue #129): while a file is dragged over the window a
 * full-screen drop target is shown, and the dropped file goes to `onDrop`.
 *
 * Every file drag is claimed (preventDefault on dragover and drop), including
 * drops that are then rejected: otherwise the browser opens the file in place
 * of the app and the unsaved layout is lost.
 *
 * The overlay covers the whole window and its children ignore pointer events,
 * so a dragleave whose target is the overlay itself means the drag left the
 * window. relatedTarget is not used: Safari does not set it on drag events.
 *
 * The overlay element stays in the page and is only hidden, never unmounted.
 * Chrome on macOS fires a pointermove at the moment a file is released, just
 * before the drop, and sends the drop to the element that was under the cursor
 * at the last dragover: the overlay. An overlay removed by that pointermove
 * received the drop detached from the document, so it never bubbled to the
 * window listener and Chrome opened the file in a new tab instead.
 */
export default function FileDropOverlay({ onDrop, onReject }: Props) {
  const [active, setActive] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Window listeners are registered once; the latest callbacks are read through refs.
  const onDropRef = useRef(onDrop);
  const onRejectRef = useRef(onReject);
  onDropRef.current = onDrop;
  onRejectRef.current = onReject;

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (carriesFiles(e)) setActive(true);
    }
    function onDragOver(e: DragEvent) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    }
    function onDragLeave(e: DragEvent) {
      if (e.target === overlayRef.current) setActive(false);
    }
    function onWindowDrop(e: DragEvent) {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      setActive(false);
      // Files are only readable on drop; during dragenter/dragover the list is empty.
      const dropped = Array.from(e.dataTransfer?.files ?? []);
      if (dropped.length > 1) onRejectRef.current("Drop one file at a time.");
      else if (dropped.length === 1) onDropRef.current(dropped[0]);
    }
    // Pointer events do not fire during a drag, so one arriving means the drag
    // is over: clears an overlay whose drag ended without a dragleave or drop.
    function onPointerMove() {
      setActive(false);
    }
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onWindowDrop);
    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onWindowDrop);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  // Portaled: FileMenu, which owns the import, sits in the transformed toolbar.
  // z-[60] puts it above the toolbar (z-40) and open dialogs (z-50).
  // Always mounted, only hidden: see the comment above the component.
  return createPortal(
    <div
      ref={overlayRef}
      data-testid="file-drop-overlay"
      hidden={!active}
      className="fixed inset-0 z-[60] bg-blue-50/70 backdrop-blur-[2px]"
    >
      <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-blue-500 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center gap-2 text-center">
          <IconImport className="w-8 h-8 text-blue-600" />
          <p className="text-sm font-semibold text-gray-800">Drop anywhere to import</p>
          <p className="text-xs text-gray-500">A PNG exported from schematic, or a JSON config</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
