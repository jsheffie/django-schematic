// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FileDropOverlay from "./FileDropOverlay";

// Issue #129: drop a PNG or JSON config anywhere on the app to import it.

afterEach(cleanup);

const png = () => new File([new Uint8Array([0x89, 0x50])], "orders.png", { type: "image/png" });

/** A stand-in DataTransfer: jsdom has none, and testing-library passes this object through as is. */
function files(...list: File[]) {
  return { types: ["Files"], files: list, dropEffect: "none" };
}
const text = () => ({ types: ["text/plain"], files: [], dropEffect: "none" });

function setup() {
  const onDrop = vi.fn();
  const onReject = vi.fn();
  render(<FileDropOverlay onDrop={onDrop} onReject={onReject} />);
  return { onDrop, onReject };
}

const overlay = () => screen.queryByTestId("file-drop-overlay");
/** The overlay stays in the page between drags (see the regression test below); this is whether it shows. */
const shown = () => overlay() !== null && !overlay()!.hidden;

describe("FileDropOverlay", () => {
  it("shows a drop target while a file is dragged over the window", () => {
    setup();
    expect(shown()).toBe(false);
    fireEvent.dragEnter(window, { dataTransfer: files() });
    expect(shown()).toBe(true);
    expect(overlay()!.textContent).toContain("Drop anywhere to import");
  });

  it("claims file drags so the browser never opens the file in place of the app", () => {
    setup();
    const dataTransfer = files();
    expect(fireEvent.dragOver(window, { dataTransfer })).toBe(false);
    expect(dataTransfer.dropEffect).toBe("copy");
    expect(fireEvent.drop(window, { dataTransfer: files(png()) })).toBe(false);
  });

  it("imports the dropped file and hides the drop target", () => {
    const { onDrop, onReject } = setup();
    const file = png();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.drop(window, { dataTransfer: files(file) });
    expect(onDrop).toHaveBeenCalledWith(file);
    expect(onReject).not.toHaveBeenCalled();
    expect(shown()).toBe(false);
  });

  // Chrome on macOS fires a pointermove at the moment a file is released,
  // just before the drop, and sends the drop to the element under the cursor
  // at the last dragover: the overlay. Removing the overlay on that
  // pointermove sent the drop to a detached element, so it never reached the
  // window listener and Chrome opened the file in a new tab (issue #129).
  it("still imports when the release's pointermove hides the overlay just before the drop", () => {
    const { onDrop } = setup();
    const file = png();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    const dropTarget = overlay()!;
    fireEvent.pointerMove(dropTarget);
    expect(fireEvent.drop(dropTarget, { dataTransfer: files(file) })).toBe(false);
    expect(onDrop).toHaveBeenCalledWith(file);
  });

  it("rejects more than one file, still keeping the browser from opening them", () => {
    const { onDrop, onReject } = setup();
    expect(fireEvent.drop(window, { dataTransfer: files(png(), png()) })).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith("Drop one file at a time.");
  });

  it("leaves other drags alone, such as text dragged into a note", () => {
    const { onDrop } = setup();
    fireEvent.dragEnter(window, { dataTransfer: text() });
    expect(shown()).toBe(false);
    expect(fireEvent.dragOver(window, { dataTransfer: text() })).toBe(true);
    expect(fireEvent.drop(window, { dataTransfer: text() })).toBe(true);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("hides when the drag leaves the window", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.dragLeave(overlay()!, { dataTransfer: files() });
    expect(shown()).toBe(false);
  });

  it("stays up while the drag moves over its own message", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.dragLeave(screen.getByText("Drop anywhere to import"), { dataTransfer: files() });
    expect(shown()).toBe(true);
  });

  it("clears a drop target left behind by a drag that ended elsewhere", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.pointerMove(window);
    expect(shown()).toBe(false);
  });

  it("renders outside the toolbar, so the toolbar's transform cannot clip it", () => {
    const utils = render(<FileDropOverlay onDrop={vi.fn()} onReject={vi.fn()} />);
    fireEvent.dragEnter(window, { dataTransfer: files() });
    expect(utils.container.contains(overlay())).toBe(false);
  });

  describe("quiet, while the Import PNG dialog shows its own drop zone", () => {
    it("is still a full-window drop target but draws nothing over the dialog", () => {
      render(<FileDropOverlay onDrop={vi.fn()} onReject={vi.fn()} quiet />);
      fireEvent.dragEnter(window, { dataTransfer: files() });
      expect(shown()).toBe(true);
      expect(screen.queryByText("Drop anywhere to import")).toBeNull();
      expect(overlay()!.className).not.toMatch(/backdrop-blur|bg-/);
    });

    it("turning quiet mid-drag keeps the same element, so the drop still lands", () => {
      const onDrop = vi.fn();
      const utils = render(<FileDropOverlay onDrop={onDrop} onReject={vi.fn()} />);
      fireEvent.dragEnter(window, { dataTransfer: files() });
      const dropTarget = overlay()!;
      utils.rerender(<FileDropOverlay onDrop={onDrop} onReject={vi.fn()} quiet />);
      expect(overlay()).toBe(dropTarget);
      const file = png();
      expect(fireEvent.drop(dropTarget, { dataTransfer: files(file) })).toBe(false);
      expect(onDrop).toHaveBeenCalledWith(file);
    });
  });

  it("reports when a file drag starts and ends", () => {
    const onActiveChange = vi.fn();
    render(<FileDropOverlay onDrop={vi.fn()} onReject={vi.fn()} onActiveChange={onActiveChange} />);
    fireEvent.dragEnter(window, { dataTransfer: files() });
    expect(onActiveChange).toHaveBeenLastCalledWith(true);
    fireEvent.drop(window, { dataTransfer: files(png()) });
    expect(onActiveChange).toHaveBeenLastCalledWith(false);
  });
});
