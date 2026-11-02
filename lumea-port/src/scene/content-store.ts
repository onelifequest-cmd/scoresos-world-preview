

import { create } from "zustand";

import { CONTENT } from "./scene-config";

/** Transform applied to the whole scene content (monk + base + rocks + lights)
    as one unit, so the whole composition can be repositioned together. */
export interface ContentControls {
  posX: number;
  posY: number;
  posZ: number;
  rotationY: number;
  scale: number;
}

interface ContentStore extends ContentControls {
  setControls: (patch: Partial<ContentControls>) => void;
  reset: () => void;
}

const initialControls: ContentControls = {
  posX: CONTENT.position[0],
  posY: CONTENT.position[1],
  posZ: CONTENT.position[2],
  rotationY: CONTENT.rotationY,
  scale: CONTENT.scale,
};

export const useContentStore = create<ContentStore>((set) => ({
  ...initialControls,
  setControls: (patch) => set(patch),
  reset: () => set({ ...initialControls }),
}));
