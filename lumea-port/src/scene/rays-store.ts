

import { create } from "zustand";

import { RAYS } from "./scene-config";

/** Live controls for the volumetric light beam. */
export interface RaysControls {
  color: string;
  opacity: number;
}

interface RaysStore extends RaysControls {
  setControls: (patch: Partial<RaysControls>) => void;
  reset: () => void;
}

const initialControls: RaysControls = {
  color: RAYS.color,
  opacity: RAYS.opacity,
};

export const useRaysStore = create<RaysStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
