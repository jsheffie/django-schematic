import { useMemo, useState } from "react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import {
  AUTO_TYPE_COLORS,
  FIELD_COLOR_SWATCHES,
  fixedTypeColor,
  typeColorGroups,
  type BucketKey,
} from "../lib/fieldEdits";
import type { SchemaGraph } from "../lib/types";

const BUCKET_LABELS: Record<BucketKey, string> = {
  pk: "Primary key",
  relation: "Relations",
  boolean: "Booleans",
  datetime: "Dates and times",
};

// What an Auto swatch shows: the colors it cycles through.
const AUTO_SWATCH = `linear-gradient(135deg, ${AUTO_TYPE_COLORS.map(
  (c, i, all) => `${c} ${(i / all.length) * 100}% ${((i + 1) / all.length) * 100}%`,
).join(", ")})`;

interface Row {
  key: string;
  label: string;
  bucket: boolean;
}

/**
 * Settings → Fields (issue #115): the Color by type switch and the color each
 * type group gets when a table is sorted with it on. Rows follow the sort's
 * group order, with one row per middle-bucket type in the loaded schema.
 */
export default function TypeColorSettings({ schema }: { schema: SchemaGraph }) {
  const typeColors = useSchemaStore((s) => s.typeColors);
  const setTypeColor = useSchemaStore((s) => s.setTypeColor);
  const resetTypeColors = useSchemaStore((s) => s.resetTypeColors);
  const clearAllFieldColors = useSchemaStore((s) => s.clearAllFieldColors);
  // Tables that carry at least one field color, whether from a sort or picked by hand.
  const coloredTables = useSchemaStore((s) => {
    let n = 0;
    for (const e of s.fieldEdits.values()) if (Object.keys(e.fieldColors).length > 0) n++;
    return n;
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const colorByType = usePhysicsStore((s) => s.colorByType);
  const setColorByType = usePhysicsStore((s) => s.setColorByType);
  const [picking, setPicking] = useState<string | null>(null);

  const rows = useMemo<Row[]>(() => {
    const bucket = (key: BucketKey): Row => ({ key, label: BUCKET_LABELS[key], bucket: true });
    const types = typeColorGroups(schema.nodes.flatMap((n) => n.fields));
    return [
      bucket("pk"),
      bucket("relation"),
      ...types.map((key) => ({ key, label: key, bucket: false })),
      bucket("boolean"),
      bucket("datetime"),
    ];
  }, [schema]);

  const hasPicks = Object.keys(typeColors).length > 0;

  return (
    <>
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Color by type
        </p>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs text-gray-700">Color fields when sorting</span>
          <button
            role="switch"
            aria-checked={colorByType}
            aria-label="Color by type when sorting"
            onClick={() => setColorByType(!colorByType)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              colorByType ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                colorByType ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </section>

      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Type colors
        </p>
        <p className="text-[10px] text-gray-400 mb-2">
          Auto types take turns through the remaining colors, so neighbouring groups in a table
          always differ.
        </p>
        <div className="flex flex-col">
          {rows.map(({ key, label, bucket }) => {
            const color = fixedTypeColor(key, typeColors);
            const open = picking === key;
            return (
              <div key={key} data-type-color-row={key} className="border-b border-gray-50">
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className={`truncate text-xs leading-4 ${bucket ? "text-gray-700" : "text-gray-500"}`}>
                    {label}
                  </span>
                  <button
                    onClick={() => setPicking(open ? null : key)}
                    aria-label={`${label} color: ${color ?? "Auto"}`}
                    aria-expanded={open}
                    title={color ? "Change color" : "Auto: pick a color to use it in every table"}
                    className={`flex h-5 shrink-0 items-center gap-1.5 rounded px-1 leading-none hover:bg-gray-50 ${
                      open ? "bg-gray-100" : ""
                    }`}
                  >
                    {color === null && <span className="text-[10px] text-gray-400">Auto</span>}
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-sm border border-gray-300"
                      style={{ background: color ?? AUTO_SWATCH }}
                    />
                  </button>
                </div>
                {open && (
                  <div className="flex items-center justify-end gap-1 pb-1.5">
                    {FIELD_COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        className="h-4 w-4 shrink-0 rounded-full hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: color === c ? `2px solid ${c}` : "none",
                          outlineOffset: 1,
                        }}
                        onClick={() => {
                          setTypeColor(key, c);
                          setPicking(null);
                        }}
                        title={c}
                        aria-label={`Color swatch ${c}`}
                      />
                    ))}
                    <button
                      className="ml-1 rounded border border-gray-200 px-1.5 text-[10px] leading-4 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      onClick={() => {
                        setTypeColor(key, null);
                        setPicking(null);
                      }}
                    >
                      {bucket ? "Default" : "Auto"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={() => {
            resetTypeColors();
            setPicking(null);
          }}
          disabled={!hasPicks}
          className="mt-2 w-full rounded-md border border-gray-200 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
        >
          Restore defaults
        </button>
      </section>

      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Table colors
        </p>
        {confirmClear && coloredTables > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
            <p>
              Remove the field colors from {coloredTables} {coloredTables === 1 ? "table" : "tables"}? Order and
              hidden fields stay.
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllFieldColors();
                  setConfirmClear(false);
                }}
                className="rounded-md bg-red-600 px-2.5 py-1 text-white hover:bg-red-700"
              >
                Clear colors
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            disabled={coloredTables === 0}
            title={coloredTables === 0 ? "No table has field colors" : undefined}
            className="w-full rounded-md border border-gray-200 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white"
          >
            Clear colors on all tables
          </button>
        )}
      </section>
    </>
  );
}
