// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import FileMenu from "./FileMenu";
import { useSchemaStore } from "../store/schemaStore";
import type { TextBlock } from "../lib/annotations";
import type { FieldInfo, NodeInfo, SchemaGraph } from "../lib/types";

const node = (id: string): NodeInfo => ({
  id,
  name: id.split(".")[1],
  app_label: "shop",
  app_name: "shop",
  tags: [],
  fields: [],
});

const SCHEMA: SchemaGraph = {
  nodes: [node("shop.Order"), node("shop.Customer"), node("shop.Item")],
  edges: [
    { source: "shop.Order", target: "shop.Customer", relation_type: "fk", field_name: "customer", related_name: null, target_field: "id" },
    { source: "shop.Item", target: "shop.Order", relation_type: "fk", field_name: "order", related_name: null, target_field: "id" },
  ],
  app_labels: ["shop"],
  app_names: { shop: "shop" },
};

const FIXTURES = join(__dirname, "../lib/__fixtures__");

const title = (text: string): TextBlock => ({ x: 0, y: 0, width: 320, height: 44, text, style: "title" });

beforeEach(() => {
  useSchemaStore.setState({
    documentName: null,
    textBlocks: new Map(),
    arrows: new Map(),
    visibleNodeIds: new Set(SCHEMA.nodes.map((n) => n.id)),
    schemaInitialized: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderMenu(schema: SchemaGraph = SCHEMA) {
  return render(
    <ReactFlowProvider>
      <FileMenu schema={schema} />
    </ReactFlowProvider>,
  );
}

function openDialog(utils: ReturnType<typeof renderMenu>, item: "Export PNG" | "Export config") {
  fireEvent.click(utils.getByRole("button", { name: /^File/ }));
  fireEvent.click(utils.getByRole("button", { name: item }));
  return utils.getByLabelText("Filename") as HTMLInputElement;
}

/**
 * Runs a FileMenu import item with `file` as the picked file. Import PNG opens
 * the import dialog first; its Choose file button opens the picker.
 */
function importFile(utils: ReturnType<typeof renderMenu>, item: "Import PNG" | "Import config", file: File) {
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
  fireEvent.click(utils.getByRole("button", { name: /^File/ }));
  fireEvent.click(utils.getByRole("button", { name: item }));
  if (item === "Import PNG") fireEvent.click(utils.getByRole("button", { name: "Choose file…" }));
  const picker = click.mock.contexts[0] as HTMLInputElement;
  Object.defineProperty(picker, "files", { value: [file] });
  fireEvent.change(picker);
  return picker;
}

describe("FileMenu export filename default", () => {
  it("defaults to the most related visible model", () => {
    const input = openDialog(renderMenu(), "Export PNG");
    expect(input.value).toBe("order");
  });

  it("uses the same default for the config export", () => {
    const input = openDialog(renderMenu(), "Export config");
    expect(input.value).toBe("order");
  });

  it("prefers a title block's slug", () => {
    useSchemaStore.setState({ textBlocks: new Map([["tb_1", title("Shop Orders")]]) });
    expect(openDialog(renderMenu(), "Export PNG").value).toBe("shop-orders");
  });

  it("prefers the document name over the title", () => {
    useSchemaStore.setState({ documentName: "orders", textBlocks: new Map([["tb_1", title("Shop Orders")]]) });
    expect(openDialog(renderMenu(), "Export PNG").value).toBe("orders");
  });

  it("keeps what the user typed when the store changes while the dialog is open", () => {
    const input = openDialog(renderMenu(), "Export PNG");
    fireEvent.change(input, { target: { value: "typed" } });
    useSchemaStore.setState({ textBlocks: new Map([["tb_1", title("New Title")]]) });
    expect(input.value).toBe("typed");
  });
});

describe("FileMenu document name", () => {
  it("an imported PNG's name becomes the export default", async () => {
    const png = readFileSync(join(FIXTURES, "export-v5.png"));
    const utils = renderMenu();
    importFile(utils, "Import PNG", new File([png], "orders (1).png", { type: "image/png" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("orders"));
    expect(openDialog(utils, "Export PNG").value).toBe("orders");
  });

  it("an imported config's name becomes the export default", async () => {
    const json = readFileSync(join(FIXTURES, "config-v5.json"), "utf8");
    const utils = renderMenu();
    importFile(utils, "Import config", new File([json], "shop-layout.json", { type: "application/json" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("shop-layout"));
  });

  it("a failed import leaves the name alone", async () => {
    useSchemaStore.setState({ documentName: "orders" });
    const utils = renderMenu();
    importFile(utils, "Import config", new File(["not json"], "broken.json", { type: "application/json" }));
    await waitFor(() => expect(utils.getByText("Invalid config file.")).toBeTruthy());
    expect(useSchemaStore.getState().documentName).toBe("orders");
  });

  it("shows the import error outside the toolbar too", async () => {
    const utils = renderMenu();
    importFile(utils, "Import config", new File(["not json"], "broken.json", { type: "application/json" }));
    const message = await utils.findByText("Invalid config file.");
    expect(utils.container.contains(message)).toBe(false);
  });

  function stubDownload() {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
  }

  it("accepting the derived default does not pin it: a later title still wins", () => {
    stubDownload();
    const utils = renderMenu();
    expect(openDialog(utils, "Export config").value).toBe("order");
    fireEvent.click(utils.getByRole("button", { name: "Export" }));
    expect(useSchemaStore.getState().documentName).toBeNull();
    useSchemaStore.setState({ textBlocks: new Map([["tb_1", title("Shop Orders")]]) });
    expect(openDialog(utils, "Export config").value).toBe("shop-orders");
  });

  it("exporting under a new name makes it the default next time, without a doubled extension", () => {
    stubDownload();
    const utils = renderMenu();
    const input = openDialog(utils, "Export config");
    fireEvent.change(input, { target: { value: "renamed.json" } });
    fireEvent.click(utils.getByRole("button", { name: "Export" }));
    expect(useSchemaStore.getState().documentName).toBe("renamed");
    expect(openDialog(utils, "Export PNG").value).toBe("renamed");
  });
});

describe("FileMenu schema change warning (issue #131)", () => {
  const field = (name: string, field_type: string): FieldInfo => ({
    name,
    field_type,
    internal_type: field_type,
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
  });
  const LIVE: SchemaGraph = {
    ...SCHEMA,
    nodes: [
      { ...node("shop.Order"), fields: [field("id", "BigAutoField"), field("status", "TextField")] },
      node("shop.Customer"),
      node("shop.Item"),
    ],
  };
  // Saved when Order still had `notes`, `status` was a CharField and shop.Coupon existed.
  const older = (version = 7) =>
    JSON.stringify({
      version,
      activeLayout: "elk",
      visibleNodeIds: ["shop.Order", "shop.Coupon"],
      expandedNodeIds: [],
      pinnedPositions: {},
      collapsedApps: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      fieldEdits: { "shop.Order": { hiddenFields: ["notes"], fieldOrder: null, fieldColors: {} } },
      schemaSnapshot: {
        "shop.Order": { id: "BigAutoField", status: "CharField", notes: "TextField" },
        "shop.Coupon": { id: "BigAutoField" },
        "shop.Customer": {},
        "shop.Item": {},
      },
      physics: { edgeStyle: "bezier", liveDragPhysics: false, forceParams: {}, appMode: "normal" },
    });

  it("lists removed models, removed fields and changed field types", async () => {
    const utils = renderMenu(LIVE);
    importFile(utils, "Import config", new File([older()], "orders.json", { type: "application/json" }));
    const dialog = await utils.findByRole("alertdialog", { name: "The schema has changed" });
    expect(dialog.textContent).toContain("shop.Coupon");
    expect(dialog.textContent).toContain("shop.Order.notes");
    expect(dialog.textContent).toContain("shop.Order.status: CharField to TextField");
    expect(dialog.textContent).toContain("won't be in future exports");
  });

  it("still applies the import and drops the removed entries", async () => {
    const utils = renderMenu(LIVE);
    importFile(utils, "Import config", new File([older()], "orders.json", { type: "application/json" }));
    await utils.findByRole("alertdialog");
    expect(useSchemaStore.getState().documentName).toBe("orders");
    expect([...useSchemaStore.getState().visibleNodeIds]).toEqual(["shop.Order"]);
    expect(useSchemaStore.getState().fieldEdits.has("shop.Order")).toBe(false);
  });

  it("renders outside the toolbar, so the toolbar's transform cannot clip it", async () => {
    const utils = renderMenu(LIVE);
    importFile(utils, "Import config", new File([older()], "orders.json", { type: "application/json" }));
    const dialog = await utils.findByRole("alertdialog");
    expect(utils.container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("closes with OK", async () => {
    const utils = renderMenu(LIVE);
    importFile(utils, "Import config", new File([older()], "orders.json", { type: "application/json" }));
    await utils.findByRole("alertdialog");
    fireEvent.click(utils.getByRole("button", { name: "OK" }));
    expect(utils.queryByRole("alertdialog")).toBeNull();
  });

  it("shows nothing when the schema has not changed", async () => {
    const same = JSON.parse(older());
    same.schemaSnapshot = { "shop.Order": { id: "BigAutoField", status: "TextField" } };
    same.visibleNodeIds = ["shop.Order"];
    same.fieldEdits = {};
    const utils = renderMenu(LIVE);
    importFile(utils, "Import config", new File([JSON.stringify(same)], "same.json", { type: "application/json" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("same"));
    expect(utils.queryByRole("alertdialog")).toBeNull();
  });
});

describe("FileMenu drag and drop import (issue #129)", () => {
  const drop = (...files: File[]) =>
    fireEvent.drop(window, { dataTransfer: { types: ["Files"], files, dropEffect: "none" } });

  it("a dropped PNG imports like Import PNG", async () => {
    const png = readFileSync(join(FIXTURES, "export-v7.png"));
    renderMenu();
    drop(new File([png], "orders (2).png", { type: "image/png" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("orders"));
  });

  it("a dropped JSON config imports like Import config", async () => {
    const json = readFileSync(join(FIXTURES, "config-v7.json"), "utf8");
    renderMenu();
    drop(new File([json], "shop-layout.json", { type: "application/json" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("shop-layout"));
  });

  it("a dropped file of another kind shows an import error and changes nothing", async () => {
    useSchemaStore.setState({ documentName: "orders" });
    const utils = renderMenu();
    drop(new File(["x"], "notes.txt", { type: "text/plain" }));
    await utils.findByText('"notes.txt" is not a schematic file. Use a PNG exported from schematic or a JSON config.');
    expect(useSchemaStore.getState().documentName).toBe("orders");
  });

  it("a dropped PNG without a config shows the same error as Import PNG", async () => {
    const utils = renderMenu();
    drop(new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "shot.png", { type: "image/png" }));
    await utils.findByText("This PNG does not contain an embedded schematic config.");
  });

  it("dropping several files at once shows an error", async () => {
    const json = readFileSync(join(FIXTURES, "config-v7.json"), "utf8");
    const utils = renderMenu();
    drop(new File([json], "a.json", { type: "application/json" }), new File([json], "b.json", { type: "application/json" }));
    await utils.findByText("Drop one file at a time.");
    expect(useSchemaStore.getState().documentName).toBeNull();
  });
});

describe("FileMenu import pickers", () => {
  it("Import config also accepts an exported PNG", async () => {
    const png = readFileSync(join(FIXTURES, "export-v7.png"));
    const utils = renderMenu();
    importFile(utils, "Import config", new File([png], "orders.png", { type: "image/png" }));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("orders"));
  });
});

describe("FileMenu Import PNG dialog (issue #129)", () => {
  const png = () => new File([readFileSync(join(FIXTURES, "export-v7.png"))], "orders.png", { type: "image/png" });
  const fileDrag = (...files: File[]) => ({ dataTransfer: { types: ["Files"], files, dropEffect: "none" } });

  function openImportPng(utils: ReturnType<typeof renderMenu>) {
    fireEvent.click(utils.getByRole("button", { name: /^File/ }));
    fireEvent.click(utils.getByRole("button", { name: "Import PNG" }));
    return utils.getByRole("dialog", { name: "Import PNG" });
  }

  it("offers a drop zone and a file chooser, outside the toolbar", () => {
    const utils = renderMenu();
    const dialog = openImportPng(utils);
    expect(dialog.textContent).toContain("Drop an exported PNG here");
    expect(utils.getByRole("button", { name: "Choose file…" })).toBeTruthy();
    expect(utils.container.contains(dialog)).toBe(false);
    // Canvas shortcuts (A, Delete) stay off while a modal is open.
    expect(document.querySelector("[data-dialog-backdrop]")).not.toBeNull();
  });

  it("Choose file opens a PNG picker, and the picked file imports and closes the dialog", async () => {
    const utils = renderMenu();
    const picker = importFile(utils, "Import PNG", png());
    expect(picker.accept).toBe(".png,image/png");
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("orders"));
    expect(utils.queryByRole("dialog", { name: "Import PNG" })).toBeNull();
  });

  it("a file dropped while it is open imports and closes it", async () => {
    const utils = renderMenu();
    openImportPng(utils);
    fireEvent.drop(window, fileDrag(png()));
    await waitFor(() => expect(useSchemaStore.getState().documentName).toBe("orders"));
    expect(utils.queryByRole("dialog", { name: "Import PNG" })).toBeNull();
  });

  it("while a file is dragged, its drop zone lights up instead of the full-screen message", () => {
    const utils = renderMenu();
    openImportPng(utils);
    fireEvent.dragEnter(window, fileDrag());
    expect(utils.getByText("Release to import")).toBeTruthy();
    expect(utils.queryByText("Drop anywhere to import")).toBeNull();
  });

  it("a dropped file that cannot be imported shows the error on its own", async () => {
    const utils = renderMenu();
    openImportPng(utils);
    fireEvent.drop(window, fileDrag(new File(["x"], "notes.txt", { type: "text/plain" })));
    await utils.findByText('"notes.txt" is not a schematic file. Use a PNG exported from schematic or a JSON config.');
    expect(utils.queryByRole("dialog", { name: "Import PNG" })).toBeNull();
  });

  it("Cancel and Escape close it without importing", () => {
    const utils = renderMenu();
    openImportPng(utils);
    fireEvent.click(utils.getByRole("button", { name: "Cancel" }));
    expect(utils.queryByRole("dialog", { name: "Import PNG" })).toBeNull();
    openImportPng(utils);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(utils.queryByRole("dialog", { name: "Import PNG" })).toBeNull();
    expect(useSchemaStore.getState().documentName).toBeNull();
  });
});
