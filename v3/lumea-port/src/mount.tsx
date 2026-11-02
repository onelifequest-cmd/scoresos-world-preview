import { createRoot, type Root } from "react-dom/client";
import { StrictMode } from "react";
import MonkScene from "./scene/monk-scene";

export type MountOptions = {
  /** Called once the scene reports ready (post-compile frames). */
  onReady?: () => void;
};

let root: Root | null = null;

export function mountLumeaHero(
  el: HTMLElement,
  opts: MountOptions = {},
): () => void {
  // Poll intro store for ready → qa hook
  if (opts.onReady) {
    const check = () => {
      import("./use-intro-store").then(({ useIntroStore }) => {
        if (useIntroStore.getState().sceneReady) {
          opts.onReady?.();
          return;
        }
        requestAnimationFrame(check);
      });
    };
    requestAnimationFrame(check);
  }

  root = createRoot(el);
  root.render(
    <StrictMode>
      <MonkScene />
    </StrictMode>,
  );

  return () => {
    root?.unmount();
    root = null;
  };
}

// Auto-mount when a host element exists
const auto = document.getElementById("lumea-hero-root");
if (auto) {
  mountLumeaHero(auto, {
    onReady: () => {
      auto.dataset.qa = "ready";
      (window as any).__lumeaHero = { ready: true };
    },
  });
}

export default mountLumeaHero;
