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
  primary_key: false,
  internal_type: "CharField",
}));
const NATURAL = FIELDS.map((f) => f.name);

const typed = (name: string, field_type: string, extra: Partial<FieldInfo> = {}): FieldInfo => ({
  name,
  field_type,
  internal_type: field_type,
  is_relation: false,
  null: false,
  unique: false,
  primary_key: false,
  ...extra,
});
// Alphabetical, as the Python side delivers it (issue #111 example, trimmed).
const MIXED: FieldInfo[] = [
  typed("created_at", "DateTimeField"),
  typed("customer", "ForeignKey", { is_relation: true }),
  typed("id", "BigAutoField", { primary_key: true }),
  typed("is_paid", "BooleanField"),
  typed("notes", "TextField"),
  typed("status", "CharField"),
];
const MIXED_SORTED = ["id", "customer", "status", "notes", "is_paid", "created_at"];

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

const ACCENT = "#123456";

function renderEditor(fields: FieldInfo[] = FIELDS) {
  const utils = render(
    <ReactFlowProvider>
      <FieldEditor nodeId={NODE} fields={fields} accentColor={ACCENT} />
    </ReactFlowProvider>,
  );
  const rows = () => [...utils.container.querySelectorAll("[data-fieldrow]")] as HTMLElement[];
  const domOrder = () => rows().map((r) => r.getAttribute("data-fieldrow"));
  const row = (name: string) => rows().find((r) => r.getAttribute("data-fieldrow") === name)!;
  const handle = (name: string) =>
    utils.getByRole("button", { name: `Reorder ${name}` }) as HTMLButtonElement;
  const draggingRows = () => rows().filter((r) => r.getAttribute("data-dragging") === "true");
  const sortButton = () => utils.getByRole("button", { name: "Sort by type" }) as HTMLButtonElement;
  const selectedRows = () =>
    rows()
      .filter((r) => r.getAttribute("aria-selected") === "true")
      .map((r) => r.getAttribute("data-fieldrow"));
  const liveText = () => utils.container.querySelector("[aria-live]")?.textContent ?? "";
  return { ...utils, rows, row, domOrder, handle, draggingRows, sortButton, selectedRows, liveText };
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

describe("FieldEditor sort by type", () => {
  it("reorders the rows and stores the sorted order on the node", () => {
    const { sortButton, domOrder } = renderEditor(MIXED);

    fireEvent.click(sortButton());

    expect(domOrder()).toEqual(MIXED_SORTED);
    expect(storedOrder()).toEqual(MIXED_SORTED);
  });

  it("keeps a hidden field in its sorted position", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([[NODE, { hiddenFields: ["status"], fieldOrder: null, fieldColors: {} }]]),
    });
    const { sortButton, domOrder } = renderEditor(MIXED);

    fireEvent.click(sortButton());

    expect(domOrder()).toEqual(MIXED_SORTED);
    expect(useSchemaStore.getState().fieldEdits.get(NODE)?.hiddenFields).toEqual(["status"]);
  });

  it("is a starting point: a drag afterwards moves one row and leaves the rest sorted", () => {
    const { sortButton, handle, domOrder } = renderEditor(MIXED);
    fireEvent.click(sortButton());

    // Move created_at (last) up two rows.
    fireEvent.pointerDown(handle("created_at"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: -ROW_H * 2 });
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: -ROW_H * 2 });

    const expected = ["id", "customer", "status", "created_at", "notes", "is_paid"];
    expect(domOrder()).toEqual(expected);
    expect(storedOrder()).toEqual(expected);
  });

  it("re-sorts from scratch, discarding manual tweaks", () => {
    const { sortButton, handle, domOrder } = renderEditor(MIXED);
    fireEvent.click(sortButton());
    fireEvent.pointerDown(handle("created_at"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: -ROW_H * 2 });
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: -ROW_H * 2 });
    expect(domOrder()).not.toEqual(MIXED_SORTED);

    fireEvent.click(sortButton());

    expect(domOrder()).toEqual(MIXED_SORTED);
    expect(storedOrder()).toEqual(MIXED_SORTED);
  });

  it("Reset returns to the natural order", () => {
    const { sortButton, domOrder, getByRole } = renderEditor(MIXED);
    fireEvent.click(sortButton());
    expect(domOrder()).toEqual(MIXED_SORTED);

    fireEvent.click(getByRole("button", { name: "Reset" }));

    expect(domOrder()).toEqual(MIXED.map((f) => f.name));
    expect(storedOrder()).toBeNull();
  });

  it("is disabled while a drag is in flight and enabled again after release", () => {
    const { sortButton, handle } = renderEditor(MIXED);
    expect(sortButton().disabled).toBe(false);

    fireEvent.pointerDown(handle("notes"), { ...pointer, clientY: 0 });
    expect(sortButton().disabled).toBe(true);

    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: 0 });
    expect(sortButton().disabled).toBe(false);
  });

  it("explains the ordering in its tooltip", () => {
    const { sortButton } = renderEditor(MIXED);
    expect(sortButton().title).toBe(
      "Primary key, then relations, then fields grouped by type, then booleans, dates and times last",
    );
  });
});

describe("FieldEditor keyboard reorder", () => {
  const key = (k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(document.activeElement ?? window, { key: k, ...init });

  it("exposes listbox semantics with one labelled reorder button per row", () => {
    const { getByRole, rows, handle } = renderEditor();
    expect(getByRole("listbox").getAttribute("aria-label")).toBe("Fields of Order");
    expect(rows().map((r) => r.getAttribute("role"))).toEqual(["option", "option", "option", "option"]);
    expect(rows().map((r) => r.getAttribute("aria-selected"))).toEqual(["false", "false", "false", "false"]);
    expect(handle("c").tagName).toBe("BUTTON");
    expect(handle("c").type).toBe("button");
  });

  it("clicking a row selects it, rings it in the accent color and focuses its handle", () => {
    const { row, handle, selectedRows } = renderEditor();
    fireEvent.click(row("b").querySelector(".flex-1")!);

    expect(selectedRows()).toEqual(["b"]);
    expect(row("b").style.outline).toBe("2px solid #123456");
    expect(row("a").style.outline).toBe("");
    expect(document.activeElement).toBe(handle("b"));

    fireEvent.click(row("d"));
    expect(selectedRows()).toEqual(["d"]);
  });

  it("clicking the eye or swatch button does not select the row", () => {
    const { row, selectedRows } = renderEditor();
    fireEvent.click(row("b").querySelector("[aria-label='Hide field']")!);
    fireEvent.click(row("c").querySelector("[aria-label='Field color']")!);
    expect(selectedRows()).toEqual([]);
  });

  it("focusing a handle with Tab selects its row", () => {
    const { handle, selectedRows } = renderEditor();
    fireEvent.focus(handle("c"));
    expect(selectedRows()).toEqual(["c"]);
  });

  it("j / k and the arrow keys move the selected field one row, edges and focus follow", () => {
    const { row, handle, domOrder, selectedRows } = renderEditor();
    fireEvent.click(row("a"));

    key("j");
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
    key("ArrowDown");
    expect(domOrder()).toEqual(["b", "c", "a", "d"]);
    expect(storedOrder()).toEqual(["b", "c", "a", "d"]);
    key("k");
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
    key("ArrowUp");
    expect(domOrder()).toEqual(NATURAL);
    expect(storedOrder()).toBeNull();

    // The row stays selected and keeps focus through every move.
    expect(selectedRows()).toEqual(["a"]);
    expect(document.activeElement).toBe(handle("a"));
  });

  it("Home / End and Shift+K / Shift+J move to the top and bottom", () => {
    const { row, domOrder } = renderEditor();
    fireEvent.click(row("b"));

    key("End");
    expect(domOrder()).toEqual(["a", "c", "d", "b"]);
    key("Home");
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
    key("J", { shiftKey: true });
    expect(domOrder()).toEqual(["a", "c", "d", "b"]);
    key("K", { shiftKey: true });
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
  });

  it("Caps Lock K without Shift moves one row, not to the top", () => {
    const { row, domOrder } = renderEditor();
    fireEvent.click(row("d"));
    key("K");
    expect(domOrder()).toEqual(["a", "b", "d", "c"]);
  });

  it("prevents the default scroll for handled keys only", () => {
    const { row } = renderEditor();
    fireEvent.click(row("b"));
    expect(key("ArrowDown")).toBe(false); // fireEvent returns !defaultPrevented
    expect(key("x")).toBe(true);
  });

  it("announces the new position, and nothing for a move past the end", () => {
    const { row, liveText } = renderEditor();
    fireEvent.click(row("a"));
    key("j");
    expect(liveText()).toBe("a moved to position 2 of 4");
    key("End");
    expect(liveText()).toBe("a moved to position 4 of 4");
    key("j");
    expect(liveText()).toBe("a moved to position 4 of 4");
    expect(storedOrder()).toEqual(["b", "c", "d", "a"]);
  });

  it("steps over hidden rows", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([[NODE, { hiddenFields: ["b"], fieldOrder: null, fieldColors: {} }]]),
    });
    const { row, domOrder } = renderEditor();
    fireEvent.click(row("a"));
    key("j");
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
  });

  it("a hidden row fades its contents, not its selection ring or tint", () => {
    useSchemaStore.setState({
      fieldEdits: new Map([
        [NODE, { hiddenFields: ["b"], fieldOrder: null, fieldColors: { b: "#ef4444" } }],
      ]),
    });
    const { row } = renderEditor();
    fireEvent.click(row("b"));

    expect(row("b").classList.contains("opacity-40")).toBe(false);
    expect(row("b").className).toContain("[&>*:not([data-swatch-popover])]:opacity-40");
    expect(row("b").style.outline).not.toBe("");
    expect(row("b").style.backgroundColor).toBe("rgba(239, 68, 68, 0.12)");
  });

  it("Escape deselects and later keys do nothing", () => {
    const { row, domOrder, selectedRows } = renderEditor();
    fireEvent.click(row("a"));
    key("Escape");
    expect(selectedRows()).toEqual([]);
    key("j");
    expect(domOrder()).toEqual(NATURAL);
  });

  it("a pointerdown outside the list deselects", () => {
    const { row, selectedRows, sortButton } = renderEditor();
    fireEvent.click(row("a"));
    fireEvent.pointerDown(document.body);
    expect(selectedRows()).toEqual([]);

    fireEvent.click(row("a"));
    fireEvent.pointerDown(sortButton());
    expect(selectedRows()).toEqual([]);

    fireEvent.click(row("a"));
    fireEvent.pointerDown(row("c"));
    expect(selectedRows()).toEqual(["a"]);
  });

  it("does nothing with no row selected", () => {
    const { domOrder } = renderEditor();
    fireEvent.keyDown(window, { key: "j" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(domOrder()).toEqual(NATURAL);
  });

  it("ignores keys typed into form fields and with modifiers held", () => {
    const { row, domOrder } = renderEditor();
    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      fireEvent.click(row("a"));
      fireEvent.keyDown(input, { key: "j" });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(domOrder()).toEqual(NATURAL);

      key("j", { metaKey: true });
      key("ArrowDown", { ctrlKey: true });
      key("j", { altKey: true });
      expect(domOrder()).toEqual(NATURAL);
    } finally {
      input.remove();
    }
  });

  it("ignores keys while a dialog is open", () => {
    const { row, domOrder } = renderEditor();
    const backdrop = document.createElement("div");
    backdrop.setAttribute("data-dialog-backdrop", "");
    document.body.appendChild(backdrop);
    try {
      fireEvent.click(row("a"));
      key("j");
      expect(domOrder()).toEqual(NATURAL);
    } finally {
      backdrop.remove();
    }
  });

  it("works from the window when focus is not on a handle", () => {
    const { row, domOrder } = renderEditor();
    fireEvent.click(row("a"));
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(window, { key: "j" });
    expect(domOrder()).toEqual(["b", "a", "c", "d"]);
  });

  it("keeps React Flow from handling keys inside the editor (nokey)", () => {
    const { getByRole } = renderEditor();
    expect(getByRole("listbox").closest(".nokey")).not.toBeNull();
  });

  it("a drag selects the dragged row and announces where it landed", () => {
    const { handle, selectedRows, liveText, domOrder } = renderEditor();
    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.pointerMove(window, { ...pointer, clientY: ROW_H * 2 });
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: ROW_H * 2 });

    expect(selectedRows()).toEqual(["a"]);
    expect(liveText()).toBe("a moved to position 3 of 4");

    // Keys pick up where the drag left off.
    key("j");
    expect(domOrder()).toEqual(["b", "c", "d", "a"]);
  });

  it("ignores keys while a drag is in flight", () => {
    const { handle, domOrder } = renderEditor();
    fireEvent.pointerDown(handle("a"), { ...pointer, clientY: 0 });
    fireEvent.keyDown(window, { key: "j" });
    expect(domOrder()).toEqual(NATURAL);
    fireEvent.pointerUp(window, { ...pointer, buttons: 0, clientY: 0 });
    expect(storedOrder()).toBeNull();
  });
});
