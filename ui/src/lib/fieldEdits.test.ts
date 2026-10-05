import { describe, it, expect } from "vitest";
import {
  applyFieldEdits,
  autoFieldColors,
  autoFieldOrder,
  fieldGroupKey,
  orderedFields,
  typeColorGroups,
  AUTO_TYPE_COLORS,
  DEFAULT_TYPE_COLORS,
  FIELD_COLOR_SWATCHES,
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

// --- Color by type (issue #115) ----------------------------------------------

const GRAY = "#6b7280";
const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const ORANGE = "#f97316";
const INDIGO = "#6366f1";
const PURPLE = "#a855f7";

/** Colors in sorted display order, so tests read top to bottom like the table. */
const colorsInOrder = (fields: FieldInfo[], typeColors = {}) => {
  const colors = autoFieldColors(fields, typeColors);
  return autoFieldOrder(fields).map((name) => [name, colors[name]]);
};

describe("type color defaults", () => {
  it("are all existing swatches, with the auto cycle disjoint from the fixed buckets", () => {
    const fixed = Object.values(DEFAULT_TYPE_COLORS);
    for (const c of [...fixed, ...AUTO_TYPE_COLORS]) expect(FIELD_COLOR_SWATCHES).toContain(c);
    expect(DEFAULT_TYPE_COLORS).toEqual({ pk: GRAY, relation: BLUE, boolean: GREEN, datetime: AMBER });
    expect(AUTO_TYPE_COLORS.filter((c) => fixed.includes(c))).toEqual([]);
    expect([...AUTO_TYPE_COLORS, ...fixed].sort()).toEqual([...FIELD_COLOR_SWATCHES].sort());
    // Ordered so that plain cycling never puts two look-alike hues next to each other.
    expect(AUTO_TYPE_COLORS).toEqual([RED, INDIGO, ORANGE, PURPLE]);
  });
});

describe("fieldGroupKey", () => {
  it("names the four buckets and keys the rest by the shown type", () => {
    expect(fieldGroupKey(pk("id", "BigAutoField"))).toBe("pk");
    expect(fieldGroupKey(rel("author", "ForeignKey"))).toBe("relation");
    expect(fieldGroupKey(pk("book_ptr", "OneToOneField", { is_relation: true }))).toBe("pk");
    expect(fieldGroupKey(typed("flag", "FlagField", { internal_type: "BooleanField" }))).toBe("boolean");
    expect(fieldGroupKey(typed("created", "AutoCreatedField", { internal_type: "DateTimeField" }))).toBe("datetime");
    expect(fieldGroupKey(typed("elapsed", "DurationField"))).toBe("datetime");
    expect(fieldGroupKey(typed("title", "CharField"))).toBe("CharField");
    // Shown type, not internal type: the sort groups the middle bucket on field_type too.
    expect(fieldGroupKey(typed("slug", "AutoSlugField", { internal_type: "SlugField" }))).toBe("AutoSlugField");
  });
});

describe("typeColorGroups", () => {
  it("lists the distinct middle-bucket types alphabetically, using the same classifier as the sort", () => {
    const fields = [
      typed("title", "CharField"),
      pk("id", "UUIDField"), // a UUIDField that is the pk is not a UUIDField group
      rel("author", "ForeignKey"),
      typed("flag", "FlagField", { internal_type: "BooleanField" }),
      typed("body", "TextField"),
      typed("name", "CharField"),
      typed("amount", "decimalField"),
      typed("when", "DateField"),
    ];
    expect(typeColorGroups(fields)).toEqual(["CharField", "decimalField", "TextField"]);
    for (const key of typeColorGroups(fields)) {
      expect(fields.some((x) => fieldGroupKey(x) === key)).toBe(true);
    }
  });
});

describe("autoFieldColors", () => {
  const ORDER_FIELDS = [
    typed("created_at", "DateTimeField"),
    rel("customer", "ForeignKey"),
    pk("id", "BigAutoField"),
    typed("is_paid", "BooleanField"),
    typed("notes", "TextField"),
    typed("reference", "CharField"),
    typed("shipped_at", "DateField"),
    typed("status", "CharField"),
    typed("total", "DecimalField"),
    rel("warehouse", "ForeignKey"),
  ];

  it("colors the issue #111 shop.Order example by group", () => {
    expect(colorsInOrder(ORDER_FIELDS)).toEqual([
      ["id", GRAY],
      ["customer", BLUE], ["warehouse", BLUE],
      ["reference", RED], ["status", RED],
      ["total", INDIGO],
      ["notes", ORANGE],
      ["is_paid", GREEN],
      ["shipped_at", AMBER], ["created_at", AMBER], // the whole date/time bucket is one group
    ]);
  });

  it("colors every field, including ones the caller will show as hidden", () => {
    expect(Object.keys(autoFieldColors(ORDER_FIELDS)).sort()).toEqual(ORDER_FIELDS.map((x) => x.name).sort());
  });

  it("cycles the auto colors and never gives two adjacent groups the same color", () => {
    const fields = ["A", "B", "C", "D", "E", "F", "G", "H", "I"].map((t) => typed(t.toLowerCase(), `${t}Field`));
    const colors = colorsInOrder(fields).map(([, c]) => c);
    expect(colors).toEqual([RED, INDIGO, ORANGE, PURPLE, RED, INDIGO, ORANGE, PURPLE, RED]);
  });

  it("uses an explicit type color for that type wherever it appears", () => {
    const fields = [typed("a", "CharField"), typed("b", "TextField")];
    expect(colorsInOrder(fields, { TextField: GREEN })).toEqual([["a", RED], ["b", GREEN]]);
  });

  it("lets the map override the bucket defaults", () => {
    const fields = [pk("id", "AutoField"), rel("owner", "ForeignKey"), typed("ok", "BooleanField"), typed("at", "DateField")];
    const map = { pk: PURPLE, relation: RED, boolean: INDIGO, datetime: ORANGE };
    expect(colorsInOrder(fields, map)).toEqual([["id", PURPLE], ["owner", RED], ["ok", INDIGO], ["at", ORANGE]]);
  });

  it("steps an auto group past the color of the group before it", () => {
    // CharField is pinned to red, so TextField (auto) must not also start at red.
    const fields = [typed("a", "CharField"), typed("b", "TextField")];
    expect(colorsInOrder(fields, { CharField: RED }).map(([, c]) => c)).toEqual([RED, INDIGO]);
  });

  it("steps an auto group past a fixed color in the group after it", () => {
    // TextField is pinned to red; CharField (auto) comes first and would otherwise take red too.
    const fields = [typed("a", "CharField"), typed("b", "TextField")];
    expect(colorsInOrder(fields, { TextField: RED }).map(([, c]) => c)).toEqual([INDIGO, RED]);
  });

  it("steps past a bucket color the user moved into the auto range", () => {
    const fields = [rel("owner", "ForeignKey"), typed("a", "CharField")];
    expect(colorsInOrder(fields, { relation: RED }).map(([, c]) => c)).toEqual([RED, INDIGO]);
  });

  it("steps past a color that looks like a neighbour, not only an equal one", () => {
    // The third type would cycle to orange (~ the amber dates below), then purple (~ the
    // indigo above), so it takes red.
    const fields = [typed("a", "CharField"), typed("b", "TextField"), typed("c", "UUIDField"), typed("at", "DateField")];
    expect(colorsInOrder(fields).map(([, c]) => c)).toEqual([RED, INDIGO, RED, AMBER]);
  });

  it("settles for merely different when every auto color looks like a neighbour", () => {
    // Between orange and indigo: red ~ orange, indigo and orange are taken, purple ~ indigo.
    const fields = [typed("a", "AField"), typed("b", "BField"), typed("c", "CField")];
    expect(colorsInOrder(fields, { AField: ORANGE, CField: INDIGO }).map(([, c]) => c)).toEqual([ORANGE, RED, INDIGO]);
  });

  it("ignores map entries that are not swatches", () => {
    const fields = [typed("a", "CharField")];
    expect(colorsInOrder(fields, { CharField: "not-a-color" })).toEqual([["a", RED]]);
  });

  it("returns an empty map for no fields", () => {
    expect(autoFieldColors([])).toEqual({});
  });
});
