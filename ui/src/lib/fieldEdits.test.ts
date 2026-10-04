import { describe, it, expect } from "vitest";
import {
  applyFieldEdits,
  autoFieldOrder,
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
  primary_key: false,
  internal_type: "CharField",
});

/** A field of the given type; `internal_type` defaults to `field_type`. */
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
const pk = (name: string, field_type: string, extra: Partial<FieldInfo> = {}) =>
  typed(name, field_type, { primary_key: true, ...extra });
const rel = (name: string, field_type: string) => typed(name, field_type, { is_relation: true });

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

describe("autoFieldOrder", () => {
  it("orders the issue #111 shop.Order example: pk, relations, grouped types, booleans, dates last", () => {
    const fields = [
      typed("created_at", "DateTimeField"),
      rel("customer", "ForeignKey"),
      pk("id", "BigAutoField"),
      typed("is_paid", "BooleanField"),
      typed("notes", "TextField"),
      typed("reference", "CharField"),
      typed("shipped_at", "DateTimeField"),
      typed("status", "CharField"),
      typed("total", "DecimalField"),
      typed("updated_at", "DateTimeField"),
      rel("warehouse", "ForeignKey"),
    ];
    expect(autoFieldOrder(fields)).toEqual([
      "id",
      "customer", "warehouse",
      "reference", "status", "total", "notes",
      "is_paid",
      "created_at", "shipped_at", "updated_at",
    ]);
  });

  it("puts the primary key first regardless of its name", () => {
    expect(autoFieldOrder([typed("aaa", "CharField"), pk("zzz", "AutoField")])).toEqual(["zzz", "aaa"]);
  });

  it("recognises a primary key that is not named id", () => {
    const fields = [typed("id", "IntegerField"), typed("name", "CharField"), pk("uuid", "UUIDField")];
    // `id` is an ordinary IntegerField here, so it sorts by type group after the CharField.
    expect(autoFieldOrder(fields)).toEqual(["uuid", "name", "id"]);
  });

  it("puts a relation that is also the pk (multi-table inheritance parent link) in the pk bucket", () => {
    const fields = [rel("author", "ForeignKey"), pk("book_ptr", "OneToOneField", { is_relation: true })];
    expect(autoFieldOrder(fields)).toEqual(["book_ptr", "author"]);
  });

  it("places FK, O2O and M2M together, alphabetical by name rather than by type", () => {
    const fields = [
      typed("title", "CharField"),
      rel("tags", "ManyToManyField"),
      rel("author", "ForeignKey"),
      rel("profile", "OneToOneField"),
      pk("id", "BigAutoField"),
    ];
    expect(autoFieldOrder(fields)).toEqual(["id", "author", "profile", "tags", "title"]);
  });

  it("groups the remaining fields by type name, then by field name inside each group", () => {
    const fields = [
      typed("zeta", "CharField"),
      typed("amount", "DecimalField"),
      typed("alpha", "CharField"),
      typed("body", "TextField"),
    ];
    expect(autoFieldOrder(fields)).toEqual(["alpha", "zeta", "amount", "body"]);
  });

  it("puts booleans after the other fields and directly above the date/time fields", () => {
    const fields = [
      typed("updated_at", "DateTimeField"),
      typed("is_active", "BooleanField"),
      typed("zeta", "TextField"),
      typed("archived", "BooleanField"),
      typed("alpha", "CharField"),
    ];
    expect(autoFieldOrder(fields)).toEqual(["alpha", "zeta", "archived", "is_active", "updated_at"]);
  });

  it("classifies the boolean bucket on internal_type so custom subclasses join it", () => {
    const fields = [
      typed("flag", "FlagField", { internal_type: "BooleanField" }),
      typed("zzz", "TextField"),
      typed("when", "DateField"),
    ];
    expect(autoFieldOrder(fields)).toEqual(["zzz", "flag", "when"]);
  });

  it("puts all four date/time types last, grouped by type then name", () => {
    const fields = [
      typed("elapsed", "DurationField"),
      typed("opens_at", "TimeField"),
      typed("born_on", "DateField"),
      typed("zzz", "TextField"),
      typed("updated_at", "DateTimeField"),
      typed("created_at", "DateTimeField"),
    ];
    expect(autoFieldOrder(fields)).toEqual([
      "zzz", "born_on", "created_at", "updated_at", "elapsed", "opens_at",
    ]);
  });

  it("classifies the date/time bucket on internal_type so custom subclasses land at the bottom", () => {
    const fields = [
      typed("created", "AutoCreatedField", { internal_type: "DateTimeField" }),
      typed("name", "CharField"),
    ];
    expect(autoFieldOrder(fields)).toEqual(["name", "created"]);
  });

  it("falls back to field_type when internal_type is empty", () => {
    const fields = [typed("when", "DateField", { internal_type: "" }), typed("name", "CharField")];
    expect(autoFieldOrder(fields)).toEqual(["name", "when"]);
  });

  it("compares names case-insensitively with the exact name as the final tie-break", () => {
    const fields = [typed("beta", "CharField"), typed("alpha", "CharField"), typed("Alpha", "CharField")];
    expect(autoFieldOrder(fields)).toEqual(["Alpha", "alpha", "beta"]);
  });

  it("includes every field exactly once so hidden fields keep their sorted position", () => {
    const fields = [
      typed("notes", "TextField"),
      typed("created_at", "DateTimeField"),
      pk("id", "BigAutoField"),
      typed("amount", "DecimalField"),
    ];
    const order = autoFieldOrder(fields);
    expect([...order].sort()).toEqual(fields.map((x) => x.name).sort());
    const r = applyFieldEdits(fields, edits({ fieldOrder: order, hiddenFields: ["amount"] }));
    expect(r.visible.map((x) => x.name)).toEqual(["id", "notes", "created_at"]);
    expect(r.hiddenCount).toBe(1);
  });

  it("returns an empty list for no fields", () => {
    expect(autoFieldOrder([])).toEqual([]);
  });

  it("does not mutate its input", () => {
    const fields = [typed("b", "CharField"), pk("a", "AutoField")];
    const before = fields.map((x) => x.name);
    autoFieldOrder(fields);
    expect(fields.map((x) => x.name)).toEqual(before);
  });
});
