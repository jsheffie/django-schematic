import { usePhysicsStore } from "../store/physicsStore";

export default function HelpDialog() {
  const helpOpen = usePhysicsStore((s) => s.helpOpen);
  const setHelpOpen = usePhysicsStore((s) => s.setHelpOpen);

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setHelpOpen(false)}
      />

      {/* Dialog */}
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

          {/* Mode presets */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Normal / Fun</h3>
            <p className="text-gray-500 mb-2">One-click presets that configure layout, edge style, and physics together.</p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-1 font-medium text-gray-500 w-1/3"></th>
                  <th className="pb-1 font-medium text-gray-500">Normal</th>
                  <th className="pb-1 font-medium text-gray-500">Fun</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr><td className="py-1 text-gray-500">Layout</td><td>Left → Right</td><td>Force</td></tr>
                <tr><td className="py-1 text-gray-500">Edges</td><td>Step (angular)</td><td>Bezier (smooth)</td></tr>
                <tr><td className="py-1 text-gray-500">Live drag</td><td>Off</td><td>On</td></tr>
                <tr><td className="py-1 text-gray-500">Physics</td><td>Default</td><td>Slower settle</td></tr>
              </tbody>
            </table>
          </section>

          {/* Layout buttons */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Layout</h3>
            <dl className="flex flex-col gap-1.5">
              <div>
                <dt className="font-medium inline">Force —</dt>
                <dd className="inline text-gray-500"> physics simulation; nodes repel each other and edges act as springs. Nodes bounce and settle naturally. Drag a node to pin it in place.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Left → Right —</dt>
                <dd className="inline text-gray-500"> dagre hierarchical layout flowing left to right. Clean and readable for dependency trees.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Top → Bottom —</dt>
                <dd className="inline text-gray-500"> dagre hierarchical layout flowing top to bottom.</dd>
              </div>
            </dl>
          </section>

          {/* Config buttons */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Export / Import / Reset</h3>
            <dl className="flex flex-col gap-1.5">
              <div>
                <dt className="font-medium inline">Export —</dt>
                <dd className="inline text-gray-500"> saves visible models, pinned positions, expanded fields, viewport, and physics settings to a JSON file.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Import —</dt>
                <dd className="inline text-gray-500"> restores a previously exported JSON config, including positions and physics settings.</dd>
              </div>
              <div>
                <dt className="font-medium inline">Reset —</dt>
                <dd className="inline text-gray-500"> clears pinned positions and collapses all expanded fields. Does not affect visibility.</dd>
              </div>
            </dl>
          </section>

          {/* Settings drawer */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">⚙ Appearance & Physics</h3>
            <p className="text-gray-500 mb-2">Opens the settings drawer on the right side.</p>

            <h4 className="font-medium text-gray-800 mb-1">Edge Style</h4>
            <dl className="flex flex-col gap-1 mb-3">
              <div><dt className="font-medium inline">Step —</dt><dd className="inline text-gray-500"> edges route through 90° bends. Precise and architectural.</dd></div>
              <div><dt className="font-medium inline">Bezier —</dt><dd className="inline text-gray-500"> smooth curved edges. Closer to the traditional graph feel.</dd></div>
              <div><dt className="font-medium inline">Floating —</dt><dd className="inline text-gray-500"> center-to-center routing, edges follow wherever you drag a node (coming soon).</dd></div>
            </dl>

            <h4 className="font-medium text-gray-800 mb-1">Live Drag Physics</h4>
            <p className="text-gray-500 mb-3">When on, other nodes react in real time while you drag one. When off, only the dragged node moves.</p>

            <h4 className="font-medium text-gray-800 mb-1">Force Simulation Sliders</h4>
            <p className="text-gray-500 mb-1">Only active when Force layout is selected. Click <span className="font-medium text-gray-700">Apply to running sim</span> to update a live simulation without restarting.</p>
            <dl className="flex flex-col gap-1">
              <div><dt className="font-medium inline">Alpha Decay —</dt><dd className="inline text-gray-500"> how quickly the simulation cools. Lower = longer, bouncier settle.</dd></div>
              <div><dt className="font-medium inline">Alpha Min —</dt><dd className="inline text-gray-500"> energy threshold where the simulation stops. Lower = runs longer.</dd></div>
              <div><dt className="font-medium inline">Velocity Decay —</dt><dd className="inline text-gray-500"> friction. Lower (floaty) = nodes travel farther before slowing. Higher (snappy) = stops quickly.</dd></div>
              <div><dt className="font-medium inline">Charge Strength —</dt><dd className="inline text-gray-500"> how hard nodes repel each other. More negative = stronger repulsion = more spread out.</dd></div>
              <div><dt className="font-medium inline">Link Distance —</dt><dd className="inline text-gray-500"> the natural resting length of edges. Shorter = tighter cluster.</dd></div>
              <div><dt className="font-medium inline">Collision Radius —</dt><dd className="inline text-gray-500"> minimum distance nodes maintain. Prevents overlap.</dd></div>
            </dl>
          </section>

          {/* Mouse controls */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">Mouse Controls</h3>
            <dl className="flex flex-col gap-1">
              <div><dt className="font-medium inline">Scroll —</dt><dd className="inline text-gray-500"> zoom in / out.</dd></div>
              <div><dt className="font-medium inline">Click + drag canvas —</dt><dd className="inline text-gray-500"> pan.</dd></div>
              <div><dt className="font-medium inline">Click + drag node —</dt><dd className="inline text-gray-500"> move and pin node.</dd></div>
              <div><dt className="font-medium inline">Click node header —</dt><dd className="inline text-gray-500"> expand / collapse fields.</dd></div>
            </dl>
          </section>

        </div>
      </div>
    </div>
  );
}
