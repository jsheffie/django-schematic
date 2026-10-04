# Golden export fixtures

Snapshots of what the app actually shipped, one per `ViewConfig` version.
`config.golden.test.ts` and `pngEmbed.golden.test.ts` import every file here
with the *current* code and assert on the values inside. If a change to
`config.ts` or `pngEmbed.ts` stops accepting a file people already have on
disk, those tests fail.

## Rules

- **Never edit or regenerate an existing fixture.** The whole point is that
  the file predates the code under test. Fixing a fixture to make a test pass
  defeats the test.
- **Bumping `version` in `config.ts` requires two new files:**
  `config-v<N>.json` and `export-v<N>.png`. The version guard in
  `config.golden.test.ts` fails until both exist. Produce them from the app
  (File → Export JSON / Export PNG) against the testbed project, with a small
  diagram that exercises whatever the new version added.
- Keep the diagram small. PNGs here are a few hundred KB each; do not add
  full-screen exports of large schemas.

## Provenance

| File | Version | Produced | Source |
|------|---------|----------|--------|
| `config-v1.json` | 1 | reconstructed | No v1 export survived (v1 shipped for one day, 2026-04-11). Written by hand to the exact shape `exportConfig()` emitted at commit `748b575`: same keys, same order, `JSON.stringify(config, null, 2)`. |
| `config-v2.json` | 2 | 2026-04-26 | Real File → Export JSON from the testbed (allauth / wagtail apps). Has `canvasHidePositions` but no `canvasSize`. |
| `config-v3.json` | 3 | 2026-08-23 | Real File → Export JSON from the testbed `library` app, the day v3 shipped. `fieldEdits` on `library.Book` carries `hiddenFields`, a non-null `fieldOrder` and `fieldColors`. |
| `config-v4.json` | 4 | 2026-08-25 | The `schematic` tEXt payload of `export-v4.png`, byte for byte. No standalone v4 JSON export was on hand; Export JSON and Export PNG embed the same `exportConfig()` output, so this is what Export JSON would have written at that moment. |
| `export-v2.png` | 2 | 2026-04-28 | Real File → Export PNG from the testbed `library` app, dagre-tb layout, `schema-graph` palette. v2 is the format most existing PNGs on disk use. |
| `export-v3.png` | 3 | 2026-08-23 | Real File → Export PNG, `library` + `socialaccount` apps, four nodes with `fieldEdits` including colors and a `null` order. |
| `export-v4.png` | 4 | 2026-08-25 | Real File → Export PNG, `tracker` app + `auth.User`, four `edgeOffsets` (one on a self-referencing FK), `canvasHidePositions`, and `pinnedPositions` for nodes that are not visible. |

The "Produced" date is the file's modification time when it was copied in.
