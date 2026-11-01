// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import HelpDialog from "./HelpDialog";
import { usePhysicsStore } from "../store/physicsStore";
import pkg from "../../package.json";

afterEach(() => {
  cleanup();
  usePhysicsStore.getState().setHelpOpen(false);
});

describe("HelpDialog", () => {
  it("shows the release version from package.json (issue #128)", () => {
    usePhysicsStore.getState().setHelpOpen(true);
    const { getByTestId } = render(<HelpDialog />);
    expect(getByTestId("app-version").textContent).toBe(`django-schematic v${pkg.version}`);
  });

  it("explains drag and drop import in the File menu section (issue #129)", () => {
    usePhysicsStore.getState().setHelpOpen(true);
    const { getByText } = render(<HelpDialog />);
    expect(getByText(/^Drag and drop/).parentElement!.textContent).toContain("PNG exported from schematic or a JSON config");
  });
});
