import { describe, it, expect } from "vitest";
import {
  applyFieldEdits,
  orderedFields,
  isEmptyEdits,
  EMPTY_FIELD_EDITS,
  type FieldEdits,
} from "./fieldEdits";
import type { FieldInfo } from "./types";

const f = (name: string): FieldInfo => ({
  name,
  field_type: "CharField",
  is_relation: false,
  null: false,
  unique: false,
});

const FIELDS = [f("id"), f("customer"), f("total"), f("notes")];

const edits = (partial: Partial<FieldEdits>): FieldEdits => ({
  ...EMPTY_FIELD_EDITS,
  ...partial,
});

describe("orderedFields", () => {
  it("returns natural order when edits are undefined", () => {
    expect(orderedFields(FIELDS, undefined).map((x) => x.name)).toEqual([
      "id", "customer", "total", "notes",
    ]);
  });

  it("returns natural order when fieldOrder is null", () => {
    expect(orderedFields(FIELDS, edits({})).map((x) => x.name)).toEqual([
      "id", "customer", "total", "notes",
    ]);
  });

  it("applies a custom order", () => {
    const e = edits({ fieldOrder: ["total", "id", "notes", "customer"] });
    expect(orderedFields(FIELDS, e).map((x) => x.name)).toEqual([
      "total", "id", "notes", "customer",
    ]);
  });

  it("ignores order entries for fields that no longer exist (drift)", () => {
    const e = edits({ fieldOrder: ["total", "deleted_field", "id", "customer", "notes"] });
    expect(orderedFields(FIELDS, e).map((x) => x.name)).toEqual([
      "total", "id", "customer", "notes",
    ]);
  });

  it("appends fields missing from the saved order at the end, in natural order (drift)", () => {
    const e = edits({ fieldOrder: ["notes", "id"] });
    expect(orderedFields(FIELDS, e).map((x) => x.name)).toEqual([
      "notes", "id", "customer", "total",
    ]);
  });

  it("includes hidden fields", () => {
    const e = edits({ hiddenFields: ["notes"], fieldOrder: ["notes", "id", "customer", "total"] });
    expect(orderedFields(FIELDS, e).map((x) => x.name)).toEqual([
      "notes", "id", "customer", "total",
    ]);
  });
});

describe("applyFieldEdits", () => {
  it("passes through untouched fields with hiddenCount 0", () => {
    const r = applyFieldEdits(FIELDS, undefined);
    expect(r.visible.map((x) => x.name)).toEqual(["id", "customer", "total", "notes"]);
    expect(r.hiddenCount).toBe(0);
  });

  it("filters hidden fields and counts them", () => {
    const r = applyFieldEdits(FIELDS, edits({ hiddenFields: ["notes", "customer"] }));
    expect(r.visible.map((x) => x.name)).toEqual(["id", "total"]);
    expect(r.hiddenCount).toBe(2);
  });

  it("does not count hidden entries for fields that no longer exist (drift)", () => {
    const r = applyFieldEdits(FIELDS, edits({ hiddenFields: ["notes", "deleted_field"] }));
    expect(r.visible.map((x) => x.name)).toEqual(["id", "customer", "total"]);
    expect(r.hiddenCount).toBe(1);
  });

  it("applies order and hiding together", () => {
    const r = applyFieldEdits(
      FIELDS,
      edits({ fieldOrder: ["total", "id", "notes", "customer"], hiddenFields: ["id"] }),
    );
    expect(r.visible.map((x) => x.name)).toEqual(["total", "notes", "customer"]);
    expect(r.hiddenCount).toBe(1);
  });
});

describe("isEmptyEdits", () => {
  it("is true for EMPTY_FIELD_EDITS", () => {
    expect(isEmptyEdits(EMPTY_FIELD_EDITS)).toBe(true);
  });
  it("is false when any edit is present", () => {
    expect(isEmptyEdits(edits({ hiddenFields: ["x"] }))).toBe(false);
    expect(isEmptyEdits(edits({ fieldOrder: ["a", "b"] }))).toBe(false);
    expect(isEmptyEdits(edits({ fieldColors: { a: "#ef4444" } }))).toBe(false);
  });
});
