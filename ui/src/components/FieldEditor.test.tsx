// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { FieldEditor } from "./FieldEditor";
import { useSchemaStore } from "../store/schemaStore";
import type { FieldInfo } from "../lib/types";

const NODE = "testapp.Order";
const FIELDS: FieldInfo[] = ["a", "b", "c", "d"].map((name) => ({
  name,
  field_type: "CharField",
  is_relation: false,
  null: false,
  unique: false,
}));
const NATURAL = FIELDS.map((f) => f.name);

// jsdom does not implement pointer capture; FieldEditor calls these on the handle.
beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  proto.setPointerCapture ??= () => {};
  proto.releasePointerCapture ??= () => {};
  proto.hasPointerCapture ??= () => false;
});

beforeEach(() => {
  useSchemaStore.setState({ fieldEdits: new Map() });
});

afterEach(cleanup);

function renderEditor() {
  const utils = render(
    <ReactFlowProvider>
      <FieldEditor nodeId={NODE} fields={FIELDS} />
    </ReactFlowProvider>,
  );
  const rows = () => [...utils.container.querySelectorAll("[data-fieldrow]")] as HTMLElement[];
  const domOrder = () => rows().map((r) => r.getAttribute("data-fieldrow"));
  const handle = (name: string) =>
    rows()
      .find((r) => r.getAttribute("data-fieldrow") === name)!
      .querySelector("[title='Drag to reorder']") as HTMLElement;
  const draggingRows = () => rows().filter((r) => r.getAttribute("data-dragging") === "true");
  return { ...utils, rows, domOrder, handle, draggingRows };
}

const storedOrder = () => useSchemaStore.getState().fieldEdits.get(NODE)?.fieldOrder ?? null;

// Rows have no layout in jsdom, so FieldEditor falls back to a 22px row height.
const ROW_H = 22;
const pointer = { pointerId: 1, button: 0, buttons: 1 };

describe("FieldEditor drag reorder", () => {
  it("commits the order on pointerup anywhere, and later pointer moves change nothing", () => {
    const { handle, domOrder, draggingRows } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    // Two rows down, delivered to window (not the handle) as during a real drag.
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 + 3 });
    fireEvent.pointerUp(document.body, { ...pointer, buttons: 0, clientY: ROW_H * 2 + 3 });

    expect(storedOrder()).toEqual(["b", "c", "a", "d"]);
    expect(domOrder()).toEqual(["b", "c", "a", "d"]);
    expect(draggingRows()).toHaveLength(0);

    // The pointer is up: wandering over the node must not resume the drag.
    fireEvent.pointerMove(window, { pointerId: 1, buttons: 0, clientY: ROW_H * 10 });
    fireEvent.pointerMove(handle("a"), { pointerId: 1, buttons: 0, clientY: ROW_H * 10 });
    fireEvent.pointerMove(handle("d"), { pointerId: 1, buttons: 0, clientY: -ROW_H * 10 });

    expect(storedOrder()).toEqual(["b", "c", "a", "d"]);
    expect(domOrder()).toEqual(["b", "c", "a", "d"]);
    expect(draggingRows()).toHaveLength(0);
  });

  it("keeps DOM order stable during the drag and displaces rows with translateY", () => {
    const { handle, rows, domOrder, draggingRows } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });

    // Nothing committed yet and the captured node has not moved in the DOM.
    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(["a", "b", "c", "d"]);
    expect(draggingRows().map((r) => r.getAttribute("data-fieldrow"))).toEqual(["a"]);

    const transforms = rows().map((r) => r.style.transform);
    expect(transforms).toEqual([
      `translateY(${ROW_H * 2}px)`,
      `translateY(${-ROW_H}px)`,
      `translateY(${-ROW_H}px)`,
      "",
    ]);

    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: ROW_H * 2 });
    expect(domOrder()).toEqual(["b", "c", "a", "d"]);
    expect(rows().map((r) => r.style.transform)).toEqual(["", "", "", ""]);
  });

  it("clamps the target index to the list bounds", () => {
    const { handle } = renderEditor();

    fireEvent.pointerDown(handle("b"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 50 });
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: ROW_H * 50 });

    expect(storedOrder()).toEqual(["a", "c", "d", "b"]);
  });

  it("Escape cancels the drag and a following pointerup commits nothing", () => {
    const { handle, domOrder, rows, draggingRows } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });
    fireEvent.keyDown(window, { key: "Escape" });

    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);
    expect(rows().map((r) => r.style.transform)).toEqual(["", "", "", ""]);
    expect(draggingRows()).toHaveLength(0);

    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 3 });
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: ROW_H * 3 });
    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);
  });

  it("lostpointercapture mid-drag cancels instead of leaving the row stuck", () => {
    const { handle, domOrder, draggingRows } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });
    fireEvent(handle("a"), new Event("lostpointercapture", { bubbles: true }));

    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);
    expect(draggingRows()).toHaveLength(0);

    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 3 });
    expect(domOrder()).toEqual(NATURAL);
    expect(draggingRows()).toHaveLength(0);
  });

  it("pointercancel cancels the drag", () => {
    const { handle, domOrder } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });
    fireEvent.pointerCancel(window, { ...pointer, buttons: 0 });

    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);
  });

  it("a new pointerdown while a drag is in flight discards the stale drag", () => {
    const { handle, domOrder } = renderEditor();

    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });
    // No pointerup: simulate a release the component never saw.
    fireEvent.pointerDown(handle("d"), { ...pointer, pointerId: 2, clientY: 100 });

    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);

    fireEvent.pointerMove(window, { ...pointer, pointerId: 2, clientY: 100 - ROW_H * 3 });
    fireEvent.pointerUp(window, { ...pointer, pointerId: 2, buttons: 0, clientY: 100 - ROW_H * 3 });

    expect(storedOrder()).toEqual(["d", "a", "b", "c"]);
    expect(domOrder()).toEqual(["d", "a", "b", "c"]);
  });

  it("ignores non-primary buttons", () => {
    const { handle, domOrder, draggingRows } = renderEditor();

    fireEvent.pointerDown(handle("a"), { pointerId: 1, button: 2, buttons: 2, clientY: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, buttons: 2, clientY: ROW_H * 2 });
    fireEvent.pointerUp(window, { pointerId: 1, button: 2, buttons: 0, clientY: ROW_H * 2 });

    expect(storedOrder()).toBeNull();
    expect(domOrder()).toEqual(NATURAL);
    expect(draggingRows()).toHaveLength(0);
  });
});
