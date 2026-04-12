import { create } from "zustand";
import { useSchemaStore } from "./schemaStore";

export type EdgeStyle = "step" | "bezier" | "floating";
export type AppMode = "normal" | "fun";

export interface ForceParams {
  alphaDecay: number;      // d3 default: 0.0228
  alphaMin: number;        // d3 default: 0.001
  velocityDecay: number;   // d3 default: 0.4
  chargeStrength: number;
  linkDistance: number;
  collisionRadius: number;
}

export const DEFAULT_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.0228,
  alphaMin: 0.001,
  velocityDecay: 0.4,
  chargeStrength: -400,
  linkDistance: 180,
  collisionRadius: 80,
};

export const FUN_FORCE_PARAMS: ForceParams = {
  alphaDecay: 0.005,
  alphaMin: 0.001,
  velocityDecay: 0.3,
  chargeStrength: -600,
  linkDistance: 220,
  collisionRadius: 100,
};

interface PhysicsStore {
  edgeStyle: EdgeStyle;
  liveDragPhysics: boolean;
  forceParams: ForceParams;
  drawerOpen: boolean;
  appMode: AppMode;

  setEdgeStyle: (s: EdgeStyle) => void;
  setLiveDragPhysics: (v: boolean) => void;
  setForceParams: (p: Partial<ForceParams>) => void;
  setDrawerOpen: (v: boolean) => void;
  applyPreset: (mode: AppMode) => void;
}

export const usePhysicsStore = create<PhysicsStore>((set) => ({
  edgeStyle: "step",
  liveDragPhysics: false,
  forceParams: DEFAULT_FORCE_PARAMS,
  drawerOpen: false,
  appMode: "normal",

  setEdgeStyle: (edgeStyle) => set({ edgeStyle }),
  setLiveDragPhysics: (liveDragPhysics) => set({ liveDragPhysics }),
  setForceParams: (p) =>
    set((s) => ({ forceParams: { ...s.forceParams, ...p } })),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

  applyPreset: (mode) => {
    if (mode === "fun") {
      useSchemaStore.getState().setLayout("force");
      set({
        appMode: "fun",
        edgeStyle: "bezier",
        liveDragPhysics: true,
        forceParams: FUN_FORCE_PARAMS,
      });
    } else {
      useSchemaStore.getState().setLayout("dagre-lr");
      set({
        appMode: "normal",
        edgeStyle: "step",
        liveDragPhysics: false,
        forceParams: DEFAULT_FORCE_PARAMS,
      });
    }
  },
}));
