// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import SettingsDrawer from "./SettingsDrawer";
import { usePhysicsStore } from "../store/physicsStore";
import type { SchemaGraph } from "../lib/types";

const SCHEMA: SchemaGraph = { nodes: [], edges: [], app_labels: [], app_names: {} };

beforeEach(() => {
  usePhysicsStore.setState({ drawerOpen: true, settingsTab: "appearance" });
  usePhysicsStore.getState().setTheme("system");
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Settings > Appearance > Theme (issue #132)", () => {
  const themeGroup = () => {
    const utils = render(<SettingsDrawer schema={SCHEMA} onReheat={vi.fn()} />);
    return within(utils.getByRole("radiogroup", { name: "Theme" }));
  };

  it("offers System, Light and Dark, with System selected by default", () => {
    const group = themeGroup();
    const options = group.getAllByRole("radio");
    expect(options.map((o) => o.textContent)).toEqual(["System", "Light", "Dark"]);
    expect(group.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("true");
  });

  it("choosing Dark sets the theme", () => {
    const group = themeGroup();
    fireEvent.click(group.getByRole("radio", { name: "Dark" }));
    expect(usePhysicsStore.getState().theme).toBe("dark");
    expect(group.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(group.getByRole("radio", { name: "System" }).getAttribute("aria-checked")).toBe("false");
  });

  it("arrow keys move the choice, wrapping around", () => {
    const group = themeGroup();
    const system = group.getByRole("radio", { name: "System" });
    fireEvent.keyDown(system, { key: "ArrowRight" });
    expect(usePhysicsStore.getState().theme).toBe("light");
    fireEvent.keyDown(system, { key: "ArrowLeft" });
    fireEvent.keyDown(system, { key: "ArrowLeft" });
    expect(usePhysicsStore.getState().theme).toBe("dark");
  });
});
