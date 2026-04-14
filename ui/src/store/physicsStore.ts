import { create } from "zustand";
import { useSchemaStore } from "./schemaStore";
import type { ColorPalette } from "../lib/colors";

export type { ColorPalette };
export type EdgeStyle = "step" | "bezier" | "floating";
export type AppMode = "stiff" | "normal" | "fun" | "excitation" | "auto-layout";
export type BackgroundStyle = "dots" | "lines" | "none";

export interface ForceParams {
  alphaDecay: number;      // d3 default: 0.0228
  alphaMin: number;        // d3 default: 0.001
  velocityDecay: number;   // d3 default: 0.4
  chargeStrength: number;
  linkDistance: number;
  collisionRadius: number;
}

// Stiff: snappy settle, high friction, tighter spacing
export const STIFF_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.08,
  alphaMin: 0.005,
  velocityDecay: 0.7,
  chargeStrength: -300,
  linkDistance: 120,
  collisionRadius: 60,
};

// Normal: balanced defaults
export const DEFAULT_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.0228,
  alphaMin: 0.001,
  velocityDecay: 0.4,
  chargeStrength: -400,
  linkDistance: 180,
  collisionRadius: 80,
};

// Fun: slow settle, bouncy, slightly looser spacing
export const FUN_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.005,
  alphaMin: 0.001,
  velocityDecay: 0.45,
  chargeStrength: -350,
  linkDistance: 160,
  collisionRadius: 90,
};

// Excitation: very slow decay, low friction, strong repulsion — nodes fly
export const EXCITATION_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.002,
  alphaMin: 0.0005,
  velocityDecay: 0.15,
  chargeStrength: -900,
  linkDistance: 280,
  collisionRadius: 120,
};

interface PhysicsStore {
  edgeStyle: EdgeStyle;
  liveDragPhysics: boolean;
  forceParams: ForceParams;
  drawerOpen: boolean;
  helpOpen: boolean;
  sidebarOpen: boolean;
  minimapVisible: boolean;
  appMode: AppMode;
  colorPalette: ColorPalette;
  backgroundStyle: BackgroundStyle;

  setEdgeStyle: (s: EdgeStyle) => void;
  setLiveDragPhysics: (v: boolean) => void;
  setForceParams: (p: Partial<ForceParams>) => void;
  setDrawerOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  setMinimapVisible: (v: boolean) => void;
  setColorPalette: (p: ColorPalette) => void;
  setBackgroundStyle: (s: BackgroundStyle) => void;
  applyPreset: (mode: AppMode) => void;
}

export const usePhysicsStore = create<PhysicsStore>((set) => ({
  edgeStyle: "floating",
  liveDragPhysics: false,
  forceParams: DEFAULT_FORCE_PARAMS,
  drawerOpen: false,
  helpOpen: false,
  sidebarOpen: true,
  minimapVisible: true,
  appMode: "normal",
  colorPalette: "pastel",
  backgroundStyle: "dots",

  setEdgeStyle: (edgeStyle) => set({ edgeStyle }),
  setLiveDragPhysics: (liveDragPhysics) => set({ liveDragPhysics }),
  setForceParams: (p) =>
    set((s) => ({ forceParams: { ...s.forceParams, ...p } })),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setMinimapVisible: (minimapVisible) => set({ minimapVisible }),
  setColorPalette: (colorPalette) => set({ colorPalette }),
  setBackgroundStyle: (backgroundStyle) => set({ backgroundStyle }),

  applyPreset: (mode) => {
    if (mode === "auto-layout") {
      useSchemaStore.getState().setLayout("elk");
      set({
        appMode: "auto-layout",
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: DEFAULT_FORCE_PARAMS,
      });
      return;
    }
    useSchemaStore.getState().setLayout("force");
    if (mode === "stiff") {
      set({
        appMode: "stiff",
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: STIFF_FORCE_PARAMS,
      });
    } else if (mode === "normal") {
      set({
        appMode: "normal",
        edgeStyle: "floating",
        liveDragPhysics: false,
        forceParams: DEFAULT_FORCE_PARAMS,
      });
    } else if (mode === "fun") {
      set({
        appMode: "fun",
        edgeStyle: "floating",
        liveDragPhysics: true,
        forceParams: FUN_FORCE_PARAMS,
      });
    } else if (mode === "excitation") {
      set({
        appMode: "excitation",
        edgeStyle: "floating",
        liveDragPhysics: true,
        forceParams: EXCITATION_FORCE_PARAMS,
      });
    }
  },
}));
