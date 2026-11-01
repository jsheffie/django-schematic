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

describe("FileDropOverlay", () => {
  it("shows a drop target while a file is dragged over the window", () => {
    setup();
    expect(overlay()).toBeNull();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    expect(overlay()).not.toBeNull();
    expect(overlay()!.textContent).toContain("Drop to import");
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
    expect(overlay()).toBeNull();
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
    expect(overlay()).toBeNull();
    expect(fireEvent.dragOver(window, { dataTransfer: text() })).toBe(true);
    expect(fireEvent.drop(window, { dataTransfer: text() })).toBe(true);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("hides when the drag leaves the window", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.dragLeave(overlay()!, { dataTransfer: files() });
    expect(overlay()).toBeNull();
  });

  it("stays up while the drag moves over its own message", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.dragLeave(screen.getByText("Drop to import"), { dataTransfer: files() });
    expect(overlay()).not.toBeNull();
  });

  it("clears a drop target left behind by a drag that ended elsewhere", () => {
    setup();
    fireEvent.dragEnter(window, { dataTransfer: files() });
    fireEvent.pointerMove(window);
    expect(overlay()).toBeNull();
  });

  it("renders outside the toolbar, so the toolbar's transform cannot clip it", () => {
    const utils = render(<FileDropOverlay onDrop={vi.fn()} onReject={vi.fn()} />);
    fireEvent.dragEnter(window, { dataTransfer: files() });
    expect(utils.container.contains(overlay())).toBe(false);
  });
});
