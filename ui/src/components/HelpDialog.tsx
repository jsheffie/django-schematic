import { usePhysicsStore } from "../store/physicsStore";

export default function HelpDialog() {
  const helpOpen = usePhysicsStore((s) => s.helpOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setHelpOpen(false)}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Help</h2>
          <button
            onClick={() => setHelpOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5 text-xs text-gray-700">

          {/* Presets */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Presets — Stiff / Normal / Fun / Excitation</h3>
            <p className="text-gray-500 mb-2">One-click presets that configure layout, edges, and physics together. Found in Settings → Physics. The <span className="font-medium text-gray-700">Auto-Layout</span> preset triggers the ELK hierarchical algorithm — see Layout section below.</p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-1 font-medium text-gray-400 w-1/4"></th>
                  <th className="pb-1 font-medium text-gray-500">Stiff</th>
                  <th className="pb-1 font-medium text-gray-500">Normal</th>
                  <th className="pb-1 font-medium text-gray-500">Fun</th>
                  <th className="pb-1 font-medium text-gray-500">Excitation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr><td className="py-1 text-gray-400">Layout</td><td>Force</td><td>Force</td><td>Force</td><td>Force</td></tr>
                <tr><td className="py-1 text-gray-400">Edges</td><td>Floating</td><td>Floating</td><td>Floating</td><td>Floating</td></tr>
                <tr><td className="py-1 text-gray-400">Live drag</td><td>Off</td><td>Off</td><td>On</td><td>On</td></tr>
                <tr><td className="py-1 text-gray-400">Feel</td><td>Snappy</td><td>Balanced</td><td>Bouncy</td><td>Chaotic</td></tr>
              </tbody>
            </table>
          </section>

          {/* Layout */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Layout</h3>
            <dl className="flex flex-col gap-1.5">
              <div>
                <dt className="font-medium inline">Force —</dt>
                <dd className="inline text-gray-500"> physics simulation; nodes repel and edges act as springs. Drag a node to pin it.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Left → Right —</dt>
                <dd className="inline text-gray-500"> dagre hierarchical layout, left to right.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Top → Bottom —</dt>
                <dd className="inline text-gray-500"> dagre hierarchical layout, top to bottom.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Auto-Layout (ELK) —</dt>
                <dd className="inline text-gray-500"> ELK layered algorithm; automatically positions nodes in a clean left-to-right hierarchy. Best for large schemas. Available in the toolbar or via the Auto-Layout preset in Settings → Physics.</dd>
              </div>
            </dl>
          </section>

          {/* Edges */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Connector lines</h3>
            <p className="text-gray-500 mb-1.5">Hover over any connector to see its details — <span className="text-gray-700 font-medium">type</span>, <span className="text-gray-700 font-medium">field</span>, and <span className="text-gray-700 font-medium">reverse</span> name.</p>
            <p className="text-gray-500 mb-2">Colors indicate relation type:</p>
            <dl className="flex flex-col gap-1">
              <div className="flex items-center gap-2"><span className="w-3 h-px bg-gray-500 inline-block"></span><dt className="inline">FK —</dt><dd className="inline text-gray-500"> one-to-many (gray)</dd></div>
              <div className="flex items-center gap-2"><span className="w-3 h-px bg-blue-600 inline-block"></span><dt className="inline">O2O —</dt><dd className="inline text-gray-500"> one-to-one (blue)</dd></div>
              <div className="flex items-center gap-2"><span className="w-3 h-px bg-purple-700 inline-block"></span><dt className="inline">M2M —</dt><dd className="inline text-gray-500"> many-to-many (purple)</dd></div>
              <div className="flex items-center gap-2"><span className="w-3 h-px bg-green-600 inline-block"></span><dt className="inline">Subclass —</dt><dd className="inline text-gray-500"> inheritance (green)</dd></div>
              <div className="flex items-center gap-2"><span className="w-3 h-px bg-amber-600 inline-block" style={{ borderTop: '2px dashed' }}></span><dt className="inline">Proxy —</dt><dd className="inline text-gray-500"> proxy model (amber, dashed)</dd></div>
            </dl>
          </section>

          {/* File */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">File menu</h3>
            <dl className="flex flex-col gap-1.5">
              <div><dt className="font-medium inline">Export config —</dt><dd className="inline text-gray-500"> saves node positions, visible models, expanded fields, viewport, and physics settings to a JSON file.</dd></div>
              <div><dt className="font-medium inline">Import config —</dt><dd className="inline text-gray-500"> restores a previously exported JSON config, including positions.</dd></div>
              <div><dt className="font-medium inline">Export PNG —</dt><dd className="inline text-gray-500"> downloads the canvas as a PNG image with the full config embedded inside. The layout and settings can be restored later via Import PNG.</dd></div>
              <div><dt className="font-medium inline">Import PNG —</dt><dd className="inline text-gray-500"> reads an exported PNG and restores the embedded config, including positions, visibility, and physics settings.</dd></div>
              <div><dt className="font-medium inline">Reset —</dt><dd className="inline text-gray-500"> clears pinned positions and collapses all expanded fields.</dd></div>
            </dl>
          </section>

          {/* Sidebar */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Sidebar (Models)</h3>
            <p className="text-gray-500 mb-2">Open with the › tab on the left edge. App names show as full dotted paths (e.g. <span className="font-medium text-gray-700">django.contrib.auth</span>).</p>

            <h4 className="font-medium text-gray-800 mb-1">Toolbar icons (top of sidebar)</h4>
            <dl className="flex flex-col gap-1 mb-3">
              <div><dt className="font-medium inline">Eye-slash / Eye —</dt><dd className="inline text-gray-500"> hide all or show all models at once.</dd></div>
              <div><dt className="font-medium inline">Compress / Expand —</dt><dd className="inline text-gray-500"> collapse or expand all app sections in the list.</dd></div>
              <div><dt className="font-medium inline">∧ / ∨ —</dt><dd className="inline text-gray-500"> close or open field details on every model node on the canvas.</dd></div>
            </dl>

            <h4 className="font-medium text-gray-800 mb-1">Per-app row</h4>
            <dl className="flex flex-col gap-1 mb-3">
              <div><dt className="font-medium inline">Chevron or app name —</dt><dd className="inline text-gray-500"> fold/unfold the model list for that app.</dd></div>
              <div><dt className="font-medium inline">⟨◇⟩ (expand icon) —</dt><dd className="inline text-gray-500"> open or close field details for only the models in that app.</dd></div>
              <div><dt className="font-medium inline">Eye icon —</dt><dd className="inline text-gray-500"> show or hide all models in that app.</dd></div>
            </dl>

            <h4 className="font-medium text-gray-800 mb-1">Per-model row</h4>
            <dl className="flex flex-col gap-1">
              <div><dt className="font-medium inline">Eye icon —</dt><dd className="inline text-gray-500"> toggle a single model's visibility on the canvas. Open eye = visible; crossed eye = hidden.</dd></div>
              <div><dt className="font-medium inline">A / P badge —</dt><dd className="inline text-gray-500"> marks abstract or proxy models.</dd></div>
            </dl>
          </section>

          {/* Settings */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">⚙ Settings</h3>
            <p className="text-gray-500 mb-2">Two tabs: <span className="font-medium text-gray-700">Appearance</span> (colors, background, edge style) and <span className="font-medium text-gray-700">Physics</span> (preset, live drag, force simulation sliders).</p>

            <h4 className="font-medium text-gray-800 mb-1">Edge Style</h4>
            <dl className="flex flex-col gap-1 mb-3">
              <div><dt className="font-medium inline">Step —</dt><dd className="inline text-gray-500"> 90° bends, clean and architectural.</dd></div>
              <div><dt className="font-medium inline">Bezier —</dt><dd className="inline text-gray-500"> smooth curves.</dd></div>
              <div><dt className="font-medium inline">Floating —</dt><dd className="inline text-gray-500"> center-to-center straight lines that follow node movement.</dd></div>
            </dl>

            <h4 className="font-medium text-gray-800 mb-1">Live Drag Physics</h4>
            <p className="text-gray-500 mb-3">Other nodes react in real time while you drag one (Force layout only).</p>

            <h4 className="font-medium text-gray-800 mb-1">Force Simulation Sliders</h4>
            <p className="text-gray-500 mb-1">Active in Force layout. Hit <span className="font-medium text-gray-700">Apply to running sim</span> to update without restarting.</p>
            <dl className="flex flex-col gap-1">
              <div><dt className="font-medium inline">Alpha Decay —</dt><dd className="inline text-gray-500"> cooling rate. Lower = longer, bouncier animation.</dd></div>
              <div><dt className="font-medium inline">Alpha Min —</dt><dd className="inline text-gray-500"> energy floor where the sim stops.</dd></div>
              <div><dt className="font-medium inline">Velocity Decay —</dt><dd className="inline text-gray-500"> friction. Lower = floaty; higher = snappy.</dd></div>
              <div><dt className="font-medium inline">Charge Strength —</dt><dd className="inline text-gray-500"> repulsion between nodes. More negative = more spread out.</dd></div>
              <div><dt className="font-medium inline">Link Distance —</dt><dd className="inline text-gray-500"> natural edge length. Shorter = tighter cluster.</dd></div>
              <div><dt className="font-medium inline">Collision Radius —</dt><dd className="inline text-gray-500"> minimum spacing between nodes.</dd></div>
            </dl>
          </section>

          {/* Mouse */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-1.5">Mouse Controls</h3>
            <dl className="flex flex-col gap-1">
              <div><dt className="font-medium inline">Scroll —</dt><dd className="inline text-gray-500"> zoom.</dd></div>
              <div><dt className="font-medium inline">Drag canvas —</dt><dd className="inline text-gray-500"> pan.</dd></div>
              <div><dt className="font-medium inline">Drag node —</dt><dd className="inline text-gray-500"> move and pin in place.</dd></div>
              <div><dt className="font-medium inline">Click node header —</dt><dd className="inline text-gray-500"> expand / collapse field list.</dd></div>
              <div><dt className="font-medium inline">Double-click node header —</dt><dd className="inline text-gray-500"> prompt to hide the model from the canvas.</dd></div>
              <div><dt className="font-medium inline">Hover connector —</dt><dd className="inline text-gray-500"> show relation type, field name, and reverse lookup.</dd></div>
            </dl>
          </section>

        </div>
      </div>
    </div>
  );
}
