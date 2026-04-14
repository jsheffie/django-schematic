import { useState } from "react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore, type EdgeStyle, type ForceParams, type ColorPalette, type BackgroundStyle } from "../store/physicsStore";
import SliderInput from "./SliderInput";

interface Props {
  onReheat: (params: ForceParams) => void;
}

export default function SettingsDrawer({ onReheat }: Props) {
  const [activeTab, setActiveTab] = useState<"appearance" | "physics">("appearance");

  const drawerOpen = usePhysicsStore((s) => s.drawerOpen);
  const setDrawerOpen = usePhysicsStore((s) => s.setDrawerOpen);
  const edgeStyle = usePhysicsStore((s) => s.edgeStyle);
  const setEdgeStyle = usePhysicsStore((s) => s.setEdgeStyle);
  const liveDragPhysics = usePhysicsStore((s) => s.liveDragPhysics);
  const setLiveDragPhysics = usePhysicsStore((s) => s.setLiveDragPhysics);
  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const setForceParams = usePhysicsStore((s) => s.setForceParams);
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const colorPalette = usePhysicsStore((s) => s.colorPalette);
  const setColorPalette = usePhysicsStore((s) => s.setColorPalette);
  const backgroundStyle = usePhysicsStore((s) => s.backgroundStyle);
  const setBackgroundStyle = usePhysicsStore((s) => s.setBackgroundStyle);
  const appMode = usePhysicsStore((s) => s.appMode);
  const applyPreset = usePhysicsStore((s) => s.applyPreset);

  const forceActive = activeLayout === "force";

  return (
    <div
      className="absolute top-0 right-0 h-full z-20 flex"
      style={{ pointerEvents: drawerOpen ? "auto" : "none" }}
    >
      {/* Backdrop — closes drawer on click */}
      {drawerOpen && (
        <div
          className="fixed inset-0"
          style={{ pointerEvents: "auto" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className="relative h-full w-72 bg-white border-l border-gray-200 shadow-xl flex flex-col overflow-y-auto"
        style={{
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease",
          pointerEvents: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Settings</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          <button
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeTab === "appearance"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            Appearance
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              activeTab === "physics"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("physics")}
          >
            Physics
          </button>
        </div>

        <div className="px-4 py-3 flex flex-col gap-4">

          {activeTab === "appearance" && (
            <>
              {/* Color Palette */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Color Palette
                </p>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { value: "pastel" as ColorPalette, label: "Pastel", desc: "Soft HSL colors, one per app", swatches: ["hsl(0,55%,45%)", "hsl(120,55%,45%)", "hsl(210,55%,45%)", "hsl(45,55%,45%)", "hsl(270,55%,45%)"] },
                      { value: "schema-graph" as ColorPalette, label: "Schema Graph", desc: "Vibrant", swatches: ["#e91e63", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2"] },
                      { value: "muted" as ColorPalette, label: "Muted", desc: "Subdued, professional tones", swatches: ["#64748b", "#16a34a", "#2563eb", "#dc2626", "#7c3aed"] },
                    ] satisfies { value: ColorPalette; label: string; desc: string; swatches: string[] }[]
                  ).map(({ value, label, desc, swatches }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 border ${
                        colorPalette === value
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="colorPalette"
                        value={value}
                        checked={colorPalette === value}
                        onChange={() => setColorPalette(value)}
                        className="accent-blue-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-700">{label}</span>
                          <div className="flex gap-0.5">
                            {swatches.map((c, i) => (
                              <span key={i} className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              {/* Background Style */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Background
                </p>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "dots" as BackgroundStyle, label: "Dots" },
                      { value: "lines" as BackgroundStyle, label: "Grid" },
                      { value: "none" as BackgroundStyle, label: "None" },
                    ] satisfies { value: BackgroundStyle; label: string }[]
                  ).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setBackgroundStyle(value)}
                      className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                        backgroundStyle === value
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Edge Style */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Edge Style
                </p>
                <div className="flex flex-col gap-1.5">
                  {(
                    [
                      { value: "step" as EdgeStyle, label: "Step", desc: "Angular, 90° corners", disabled: false },
                      { value: "bezier" as EdgeStyle, label: "Bezier", desc: "Smooth curves", disabled: false },
                      { value: "floating" as EdgeStyle, label: "Floating", desc: "Center-to-center, follows the node", disabled: false },
                    ]
                  ).map(({ value, label, desc, disabled }) => (
                    <label
                      key={value}
                      className={`flex items-start gap-2 cursor-pointer rounded-md px-2 py-1.5 border ${
                        edgeStyle === value
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-100 hover:bg-gray-50"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="edgeStyle"
                        value={value}
                        checked={edgeStyle === value}
                        disabled={disabled}
                        onChange={() => setEdgeStyle(value)}
                        className="mt-0.5 accent-blue-500"
                      />
                      <div>
                        <span className="text-xs font-medium text-gray-700">{label}</span>
                        <p className="text-[10px] text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}

          {activeTab === "physics" && (
            <>
              {/* Preset */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Preset
                </p>
                <div className="flex rounded-md overflow-hidden border border-gray-200">
                  {(
                    [
                      { mode: "stiff", label: "Stiff", title: "Snappy settle, high friction" },
                      { mode: "normal", label: "Normal", title: "Balanced defaults" },
                      { mode: "fun", label: "Fun", title: "Slow settle, bouncy, live drag" },
                      { mode: "excitation", label: "Excitation", title: "Low friction, strong repulsion" },
                      { mode: "auto-layout", label: "Auto-Layout", title: "ELK hierarchical layout, floating edges" },
                    ] as const
                  ).map(({ mode, label, title }, i) => (
                    <button
                      key={mode}
                      className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                        i > 0 ? "border-l border-gray-200" : ""
                      } ${
                        appMode === mode
                          ? "bg-blue-600 text-white"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      }`}
                      onClick={() => applyPreset(mode)}
                      title={title}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Physics Simulation toggle */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Physics Simulation
                </p>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-700">Enable physics (Space)</span>
                  <button
                    role="switch"
                    aria-checked={physicsEnabled}
                    onClick={() => setPhysicsEnabled(!physicsEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      physicsEnabled ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        physicsEnabled ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </section>

              {/* Live Drag Physics */}
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Live Drag Physics
                </p>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-700">Nodes react while you drag</span>
                  <button
                    role="switch"
                    aria-checked={liveDragPhysics}
                    onClick={() => setLiveDragPhysics(!liveDragPhysics)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      liveDragPhysics ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        liveDragPhysics ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </label>
              </section>

              {/* Force Simulation */}
              <section className={!forceActive ? "opacity-40 pointer-events-none" : ""}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Force Simulation
                </p>
                {!forceActive && (
                  <p className="text-[10px] text-gray-400 mb-2">Switch to Force layout to enable</p>
                )}

                <SliderInput
                  label="Alpha Decay"
                  value={forceParams.alphaDecay}
                  min={0.001}
                  max={0.1}
                  step={0.001}
                  onChange={(v) => setForceParams({ alphaDecay: v })}
                  leftLabel="slow settle"
                  rightLabel="fast settle"
                />
                <SliderInput
                  label="Alpha Min"
                  value={forceParams.alphaMin}
                  min={0.0001}
                  max={0.05}
                  step={0.0001}
                  onChange={(v) => setForceParams({ alphaMin: v })}
                />
                <SliderInput
                  label="Velocity Decay"
                  value={forceParams.velocityDecay}
                  min={0.1}
                  max={0.9}
                  step={0.01}
                  onChange={(v) => setForceParams({ velocityDecay: v })}
                  leftLabel="floaty"
                  rightLabel="snappy"
                />
                <SliderInput
                  label="Charge Strength"
                  value={forceParams.chargeStrength}
                  min={-1200}
                  max={-50}
                  step={10}
                  onChange={(v) => setForceParams({ chargeStrength: v })}
                  leftLabel="weak"
                  rightLabel="strong"
                />
                <SliderInput
                  label="Link Distance"
                  value={forceParams.linkDistance}
                  min={50}
                  max={500}
                  step={10}
                  onChange={(v) => setForceParams({ linkDistance: v })}
                />
                <SliderInput
                  label="Collision Radius"
                  value={forceParams.collisionRadius}
                  min={20}
                  max={200}
                  step={5}
                  onChange={(v) => setForceParams({ collisionRadius: v })}
                />

                <button
                  onClick={() => onReheat(forceParams)}
                  disabled={!physicsEnabled}
                  title={!physicsEnabled ? "Resume physics to apply" : undefined}
                  className={`w-full mt-1 py-1.5 text-xs font-medium text-white rounded-md transition-colors ${
                    physicsEnabled
                      ? "bg-blue-500 hover:bg-blue-600"
                      : "bg-blue-300 cursor-not-allowed"
                  }`}
                >
                  Apply to running sim
                </button>
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
