/**
 * Golden-file tests: real exports committed under __fixtures__/ must keep
 * importing with the current code. See __fixtures__/README.md for the rules
 * (never edit a fixture; a version bump needs a new one).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

vi.stubGlobal("window", { innerWidth: 1200, innerHeight: 800 });

import { exportConfig, importConfig } from "./config";
import { applyFieldEdits, orderedFields } from "./fieldEdits";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import type { FieldInfo } from "./types";

const FIXTURES = join(__dirname, "__fixtures__");
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), "utf8");

beforeEach(() => {
  useSchemaStore.getState().resetConfig();
  useSchemaStore.setState({ visibleNodeIds: new Set(), schemaInitialized: false });
  // Sentinels: a legacy import must not leave these untouched by accident.
  usePhysicsStore.setState({ edgeStyle: "step", colorPalette: "muted" });
});

describe("every committed config fixture still imports", () => {
  const files = readdirSync(FIXTURES).filter((f) => /^config-v\d+\.json$/.test(f));

  it("has at least one fixture per known version", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "config-v1.json", "config-v2.json", "config-v3.json", "config-v4.json", "config-v5.json",
      ]),
    );
  });

  it.each(files)("%s is accepted and reports the version in its filename", (file) => {
    const version = Number(/^config-v(\d+)\.json$/.exec(file)![1]);
    expect(JSON.parse(fixture(file)).version).toBe(version);
    expect(() => importConfig(fixture(file))).not.toThrow();
    expect(useSchemaStore.getState().schemaInitialized).toBe(true);
    expect(useSchemaStore.getState().visibleNodeIds.size).toBeGreaterThan(0);
  });
});

describe("config-v1.json", () => {
  it("restores visibility, pins and viewport; leaves layout and physics alone", () => {
    const viewport = importConfig(fixture("config-v1.json"));
    const s = useSchemaStore.getState();

    expect(s.visibleNodeIds).toEqual(new Set(["library.Author", "library.Book", "library.Genre"]));
    expect(s.expandedNodeIds).toEqual(new Set(["library.Book"]));
    expect(s.collapsedApps).toEqual(new Set(["auth", "store"]));
    expect(s.pinnedPositions).toEqual(
      new Map([
        ["library.Author", { x: 420, y: 180 }],
        ["library.Book", { x: 120, y: 60 }],
        ["library.Genre", { x: 420, y: -40 }],
      ]),
    );
    expect(viewport).toEqual({ x: 96, y: 48, zoom: 1.25, canvasSize: undefined });
    expect(s.viewportState).toEqual({ x: 96, y: 48, zoom: 1.25 });

    // Nothing v1 did not know about gets invented.
    expect(s.activeLayout).toBe("elk");
    expect(s.canvasHidePositions.size).toBe(0);
    expect(s.fieldEdits.size).toBe(0);
    expect(s.edgeOffsets.size).toBe(0);
    expect(usePhysicsStore.getState().edgeStyle).toBe("step");
    expect(usePhysicsStore.getState().colorPalette).toBe("muted");
  });
});

describe("config-v2.json", () => {
  it("restores layout, physics and collapsed apps; fieldEdits and edgeOffsets stay empty", () => {
    const viewport = importConfig(fixture("config-v2.json"));
    const s = useSchemaStore.getState();
    const p = usePhysicsStore.getState();

    expect(s.visibleNodeIds).toEqual(
      new Set([
        "account.EmailAddress",
        "account.EmailConfirmation",
        "auth.Group",
        "auth.Permission",
        "auth.User",
        "socialaccount.SocialAccount",
        "socialaccount.SocialApp",
        "socialaccount.SocialToken",
        "wagtailusers.UserProfile",
      ]),
    );
    expect(s.expandedNodeIds.size).toBe(58);
    expect(s.pinnedPositions.size).toBe(9);
    expect(s.pinnedPositions.get("auth.User")).toEqual({ x: 734, y: 574 });
    expect(s.pinnedPositions.get("auth.Group")).toEqual({ x: 1080.909090909091, y: 782.6561771561771 });
    expect(s.collapsedApps.size).toBe(19);
    expect(s.collapsedApps.has("wagtailcore")).toBe(true);
    expect(s.activeLayout).toBe("elk");
    expect(viewport).toEqual({
      x: 205.44207317073176,
      y: -31.46341463414629,
      zoom: 0.8719512195121951,
      canvasSize: undefined, // this export predates canvasSize
    });

    expect(s.canvasHidePositions.size).toBe(0);
    expect(s.fieldEdits.size).toBe(0);
    expect(s.edgeOffsets.size).toBe(0);

    expect(p.edgeStyle).toBe("floating");
    expect(p.liveDragPhysics).toBe(false);
    expect(p.appMode).toBe("normal");
    expect(p.colorPalette).toBe("pastel");
    expect(p.backgroundStyle).toBe("dots");
    expect(p.minimapVisible).toBe(true);
    expect(p.sidebarOpen).toBe(false);
    expect(p.forceParams).toMatchObject({
      alphaDecay: 0.0228,
      alphaMin: 0.001,
      velocityDecay: 0.4,
      chargeStrength: -400,
      linkDistance: 180,
      collisionRadius: 80,
    });
  });
});

describe("config-v3.json", () => {
  it("restores fieldEdits with hidden fields, a custom order and colors; edgeOffsets stay empty", () => {
    const viewport = importConfig(fixture("config-v3.json"));
    const s = useSchemaStore.getState();

    expect(s.visibleNodeIds).toEqual(
      new Set(["library.Author", "library.Book", "library.Genre", "library.Loan", "library.Member"]),
    );
    expect(s.pinnedPositions.size).toBe(5);
    expect(s.pinnedPositions.get("library.Loan")).toEqual({ x: 12, y: 45.33333333333334 });
    expect(s.collapsedApps.size).toBe(0);
    expect(s.activeLayout).toBe("elk");
    expect(viewport).toEqual({
      x: 42.3607843137255,
      y: 202.95555555555558,
      zoom: 1.6366013071895424,
      canvasSize: { width: 1376, height: 1018 },
    });

    expect(s.fieldEdits.size).toBe(1);
    expect(s.fieldEdits.get("library.Book")).toEqual({
      hiddenFields: ["isbn", "genre"],
      fieldOrder: ["title", "authors", "description", "genre", "id", "isbn", "published_on"],
      fieldColors: { title: "#3b82f6" },
    });
    expect(s.canvasHidePositions.size).toBe(0);
    expect(s.edgeOffsets.size).toBe(0);
    expect(usePhysicsStore.getState().colorPalette).toBe("pastel");
  });
});

describe("config-v4.json", () => {
  it("restores edgeOffsets, canvas-hidden nodes and pins for nodes that are not visible", () => {
    const viewport = importConfig(fixture("config-v4.json"));
    const s = useSchemaStore.getState();

    expect(s.visibleNodeIds).toEqual(
      new Set(["auth.User", "tracker.Comment", "tracker.Project", "tracker.Tag", "tracker.Task"]),
    );
    // Export captures every node position, not only visible ones.
    expect(s.pinnedPositions.size).toBe(10);
    expect(s.pinnedPositions.get("tracker.Task")).toEqual({ x: 419.34398976982106, y: 120.29219948849104 });
    expect(s.pinnedPositions.get("library.Genre")).toEqual({ x: 38.5, y: 258 });
    expect(s.canvasHidePositions).toEqual(
      new Map([
        ["auth.Group", { x: 1155, y: 166 }],
        ["auth.Permission", { x: 1451, y: 196.25 }],
      ]),
    );
    expect(s.activeLayout).toBe("elk");
    expect(viewport).toEqual({
      x: 60.54139534883711,
      y: 332.19953488372096,
      zoom: 1.4548837209302325,
      canvasSize: { width: 1720, height: 1294 },
    });

    expect(s.fieldEdits.size).toBe(6);
    expect(s.fieldEdits.get("tracker.Comment")).toEqual({
      hiddenFields: ["id"],
      fieldOrder: ["author", "task", "body", "created_at", "id", "updated_at"],
      fieldColors: {},
    });
    expect(s.fieldEdits.get("library.Member")).toEqual({
      hiddenFields: [],
      fieldOrder: ["id", "user", "notes", "joined_on"],
      fieldColors: {},
    });

    expect(s.edgeOffsets).toEqual(
      new Map([
        ["library.Loan->library.Member:member", { x: -0.236328125, y: 3.56640625 }],
        ["library.Loan->library.Book:book", { x: -52.66015625, y: 19.884765625 }],
        ["tracker.Task->tracker.Task:parent", { x: 274.50378886269175, y: 5.528255374840114 }],
        ["tracker.Project->auth.User:owner", { x: -47.450634890505114, y: 13.086312140345257 }],
      ]),
    );
    expect(usePhysicsStore.getState().edgeStyle).toBe("bezier");
  });
});

describe("config-v5.json", () => {
  it("restores text blocks and arrows exactly as exported", () => {
    const viewport = importConfig(fixture("config-v5.json"));
    const s = useSchemaStore.getState();

    expect(s.visibleNodeIds).toEqual(
      new Set(["library.Author", "library.Book", "library.Genre", "library.Loan", "library.Member"]),
    );
    // Export captures model positions only: no text block or anchor ids leak into pins.
    expect([...s.pinnedPositions.keys()].sort()).toEqual(
      ["library.Author", "library.Book", "library.Genre", "library.Loan", "library.Member"],
    );
    expect(viewport).toEqual({
      x: 69,
      y: 146.66666666666669,
      zoom: 2,
      canvasSize: { width: 1720, height: 1129 },
    });

    expect(s.textBlocks).toEqual(
      new Map([
        ["tb_muu6he9ispewcg", {
          x: 84, y: 270.0833333333333, width: 200, height: 72,
          text: "denormalized from Loan - rebuilt nightly", style: "note",
        }],
        ["tb_muu6m94ohv0d17", {
          x: 124.5, y: -19.583333333333343, width: 200, height: 72,
          text: "Library", style: "title",
        }],
      ]),
    );
    expect(s.arrows).toEqual(
      new Map([
        ["ar_muu6i3ksv56l6k", {
          from: { nodeId: "tb_muu6he9ispewcg" },
          to: { nodeId: "library.Book" },
          label: "nightly",
          startHead: true,
          offset: { x: -68, y: 40.49999999999997 },
        }],
        ["ar_muu6nil9hedchv", {
          from: { x: 690, y: 367.66666666666663 },
          to: { nodeId: "library.Author" },
          label: "owner",
        }],
      ]),
    );
    expect(s.edgeOffsets.size).toBe(0);
    expect(s.fieldEdits.size).toBe(0);
  });

  it("is what Reset leaves alone and what a v4 import replaces", () => {
    importConfig(fixture("config-v5.json"));
    useSchemaStore.getState().resetConfig();
    expect(useSchemaStore.getState().textBlocks.size).toBe(2);
    expect(useSchemaStore.getState().arrows.size).toBe(2);

    importConfig(fixture("config-v4.json"));
    expect(useSchemaStore.getState().textBlocks.size).toBe(0);
    expect(useSchemaStore.getState().arrows.size).toBe(0);
  });
});

describe("schema drift against a committed export", () => {
  const field = (name: string): FieldInfo => ({
    name,
    field_type: "CharField",
    internal_type: "CharField",
    is_relation: false,
    null: false,
    unique: false,
    primary_key: false,
  });

  it("drops order entries for fields that no longer exist and appends new ones", () => {
    importConfig(fixture("config-v4.json"));
    const edits = useSchemaStore.getState().fieldEdits.get("tracker.Project");
    // The file was exported when tracker.Project had: owner, created_at, description, id, name.
    expect(edits?.fieldOrder).toEqual(["owner", "created_at", "description", "id", "name"]);

    // Pretend the model has since dropped `created_at` and grown `slug`.
    const today = [field("id"), field("owner"), field("name"), field("slug"), field("description")];

    expect(orderedFields(today, edits).map((f) => f.name)).toEqual([
      "owner", "description", "id", "name", // saved order, minus the vanished field
      "slug", // new field appended in natural order
    ]);
    const { visible, hiddenCount } = applyFieldEdits(today, edits);
    expect(visible.map((f) => f.name)).toEqual(["owner", "description", "name", "slug"]);
    expect(hiddenCount).toBe(1);
  });
});

describe("version guard", () => {
  it("has a JSON and a PNG fixture for the version exportConfig() writes today", () => {
    const current: number = JSON.parse(exportConfig()).version;
    const files = readdirSync(FIXTURES);
    // If this fails you bumped ViewConfig.version: export a small diagram from
    // the app and commit it as the two files below. Never edit old fixtures.
    expect(files).toContain(`config-v${current}.json`);
    expect(files).toContain(`export-v${current}.png`);
  });
});
