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

/** Runs a FileMenu import item with `file` as the picked file. */
function importFile(utils: ReturnType<typeof renderMenu>, item: "Import PNG" | "Import config", file: File) {
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
  fireEvent.click(utils.getByRole("button", { name: /^File/ }));
  fireEvent.click(utils.getByRole("button", { name: item }));
  const picker = click.mock.contexts[0] as HTMLInputElement;
  Object.defineProperty(picker, "files", { value: [file] });
  fireEvent.change(picker);
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
