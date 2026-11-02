

import { create } from "zustand";

import { RING } from "./scene-config";

/** Material controls for the two baked orbit rings. */
export interface RingControls {
  emissiveColor: string;
  emissiveIntensity: number;
  /** The smaller lower ring's emissive is scaled by this. */
  secondaryFactor: number;
  baseColor: string;
}

interface RingStore extends RingControls {
  setControls: (patch: Partial<RingControls>) => void;
  reset: () => void;
}

const initialControls: RingControls = {
  emissiveColor: RING.emissiveColor,
  emissiveIntensity: RING.emissiveIntensity,
  secondaryFactor: RING.secondaryFactor,
  baseColor: RING.color,
};

export const useRingStore = create<RingStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
