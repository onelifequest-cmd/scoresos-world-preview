

import { create } from "zustand";

import { POST } from "./scene-config";

/** Live controls for the rocks' masked chromatic aberration. */
export interface DispersionControls {
  /** Fringe tint sampled on the +offset side (default red). */
  colorA: string;
  /** Fringe tint sampled on the −offset side (default cyan). */
  colorB: string;
  strength: number;
}

interface DispersionStore extends DispersionControls {
  setControls: (patch: Partial<DispersionControls>) => void;
  reset: () => void;
}

const initialControls: DispersionControls = {
  colorA: POST.dispersion.colorA,
  colorB: POST.dispersion.colorB,
  strength: POST.dispersion.strength,
};

export const useDispersionStore = create<DispersionStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
