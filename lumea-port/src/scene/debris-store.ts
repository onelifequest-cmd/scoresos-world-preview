

import { create } from "zustand";

import { DEBRIS } from "./scene-config";

/** Live controls for the debris rocks — cursor repulsion + rotation speeds. */
export interface DebrisControls {
  repelRadius: number;
  repelStrength: number;
  /** Multiplier on each rock's per-frame self-spin (1 = the seeded base rate). */
  spin: number;
  /** Rotation speed of the whole spiral field (rad/s); negative reverses it. */
  drift: number;
}

interface DebrisStore extends DebrisControls {
  setControls: (patch: Partial<DebrisControls>) => void;
  reset: () => void;
}

const initialControls: DebrisControls = {
  repelRadius: DEBRIS.repel.radius,
  repelStrength: DEBRIS.repel.strength,
  spin: 4,
  drift: DEBRIS.spinSpeed,
};

export const useDebrisStore = create<DebrisStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
