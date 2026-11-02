

import { create } from "zustand";

import { POST } from "./scene-config";

/** Post-processing controls exposed to a panel. */
interface PostStore {
  grain: number;
  setGrain: (value: number) => void;
  reset: () => void;
}

export const usePostStore = create<PostStore>((set) => ({
  grain: POST.noise.opacity,
  setGrain: (grain) => set({ grain }),
  reset: () => set({ grain: POST.noise.opacity }),
}));
