import { create } from "zustand";

interface IntroStore {
  started: boolean;
  sceneReady: boolean;
  sceneCompiled: boolean;
  start: () => void;
  setSceneReady: () => void;
  setSceneCompiled: () => void;
}

export const useIntroStore = create<IntroStore>((set) => ({
  started: true, // embed: no preloader — start immediately
  sceneReady: false,
  sceneCompiled: false,
  start: () => set({ started: true }),
  setSceneReady: () => set({ sceneReady: true }),
  setSceneCompiled: () => set({ sceneCompiled: true }),
}));
