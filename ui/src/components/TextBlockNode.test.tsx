// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { TextBlockNode, type TextBlockNodeData } from "./TextBlockNode";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import type { TextBlock } from "../lib/annotations";

const ID = "tb_test";
const BLOCK: TextBlock = { x: 0, y: 0, width: 200, height: 72, text: "denormalized", style: "note" };

function props(selected = true): NodeProps<TextBlockNodeData> {
  return {
    id: ID,
    type: "text",
    data: { blockId: ID },
    selected,
    dragging: false,
    zIndex: 0,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    deletable: true,
    selectable: true,
    draggable: true,
    width: 200,
  };
}

function renderNode(selected = true) {
  return render(
    <ReactFlowProvider>
      <TextBlockNode {...props(selected)} />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  useSchemaStore.setState({ textBlocks: new Map([[ID, BLOCK]]), arrows: new Map() });
  usePhysicsStore.setState({ editingTextBlockId: null });
});
afterEach(cleanup);

describe("TextBlockNode", () => {
  it("renders the text and switches style from the toolbar", () => {
    renderNode();
    expect(screen.getByText("denormalized")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Title" }));
    expect(useSchemaStore.getState().textBlocks.get(ID)?.style).toBe("title");
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(useSchemaStore.getState().textBlocks.get(ID)?.style).toBe("note");
  });

  it("hides the toolbar when the block is not selected", () => {
    renderNode(false);
    expect(screen.queryByRole("button", { name: "Title" })).toBeNull();
  });

  it("picks a colour swatch and clears it", () => {
    renderNode();
    fireEvent.click(screen.getByLabelText("Color swatch #ef4444"));
    expect(useSchemaStore.getState().textBlocks.get(ID)?.color).toBe("#ef4444");
    fireEvent.click(screen.getByLabelText("Clear color"));
    expect(useSchemaStore.getState().textBlocks.get(ID)?.color).toBeUndefined();
  });

  it("removes the block from the hover x", () => {
    renderNode();
    fireEvent.click(screen.getByLabelText("Delete text block"));
    expect(useSchemaStore.getState().textBlocks.has(ID)).toBe(false);
  });

  it("enters edit mode on double-click and commits edited text on blur", () => {
    renderNode();
    fireEvent.doubleClick(screen.getByText("denormalized"));
    expect(usePhysicsStore.getState().editingTextBlockId).toBe(ID);
    const area = screen.getByLabelText("Text block content") as HTMLTextAreaElement;
    expect(area.value).toBe("denormalized");
    fireEvent.change(area, { target: { value: "rebuilt nightly  \n" } });
    fireEvent.blur(area);
    expect(useSchemaStore.getState().textBlocks.get(ID)?.text).toBe("rebuilt nightly");
    expect(usePhysicsStore.getState().editingTextBlockId).toBeNull();
  });

  it("Escape commits like blur", () => {
    usePhysicsStore.setState({ editingTextBlockId: ID });
    renderNode();
    const area = screen.getByLabelText("Text block content");
    fireEvent.change(area, { target: { value: "via escape" } });
    fireEvent.keyDown(area, { key: "Escape" });
    fireEvent.blur(area); // jsdom does not blur on our .blur() call reliably; the handler is blur-driven
    expect(useSchemaStore.getState().textBlocks.get(ID)?.text).toBe("via escape");
  });

  it("removes a block whose text is left empty", () => {
    usePhysicsStore.setState({ editingTextBlockId: ID });
    renderNode();
    const area = screen.getByLabelText("Text block content");
    fireEvent.change(area, { target: { value: "   \n" } });
    fireEvent.blur(area);
    expect(useSchemaStore.getState().textBlocks.has(ID)).toBe(false);
    expect(usePhysicsStore.getState().editingTextBlockId).toBeNull();
  });

  it("renders nothing for a block that no longer exists", () => {
    useSchemaStore.setState({ textBlocks: new Map() });
    const { container } = renderNode();
    expect(container.textContent).toBe("");
  });
});
