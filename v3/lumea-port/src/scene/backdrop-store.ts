

import { create } from "zustand";

import { BACKDROP } from "./scene-config";

/** Controls for the volumetric gradient backdrop. */
export interface BackdropControls {
  topColor: string;
  bottomColor: string;
  glowColor: string;
  glowStrength: number;
  glowY: number;
  glowZ: number;
  glowSharpness: number;
}

interface BackdropStore extends BackdropControls {
  setControls: (patch: Partial<BackdropControls>) => void;
  reset: () => void;
}

const initialControls: BackdropControls = {
  topColor: BACKDROP.topColor,
  bottomColor: BACKDROP.bottomColor,
  glowColor: BACKDROP.glowColor,
  glowStrength: BACKDROP.glowStrength,
  glowY: BACKDROP.glowY,
  glowZ: BACKDROP.glowZ,
  glowSharpness: BACKDROP.glowSharpness,
};

export const useBackdropStore = create<BackdropStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
