

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { subscribeToTicker } from "@/lib/animation/ticker";
import { frameBudgetMs, sceneShouldFreeze } from "./device";
import { subscribePointer } from "./pointer-state";
import { useIntroStore } from "../use-intro-store";

/** If Prewarm never reports (a model that fails to load), draw anyway. */
const COMPILE_FAILSAFE_MS = 9000;

/** After the intro, keep drawing a short while so we freeze on a formed frame. */
const FREEZE_SETTLE_MS = 1400;

/**
 * Drives the (on-demand) render loop from the one app-wide ticker, throttled to
 * the device's frame budget (30fps mobile / 45 tablet / uncapped desktop). It
 * also gates on `document.hidden` (a background tab paints nothing) and, on
 * reduced-motion / energy-saver, stops after the intro settles — WebGL keeps the
 * last frame, so a frozen scene costs zero. The Canvas runs `frameloop="demand"`,
 * so nothing renders unless `invalidate()` is called here.
 */
export const FrameGate = () => {
  const invalidate = useThree((state) => state.invalidate);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  // A re-size clears the drawing buffer — draw the next frame right away,
  // even on a frozen scene (reduced motion / energy saver), or the canvas
  // stays blank until the next tick (or for good, when frozen).
  useEffect(() => {
    if (!useIntroStore.getState().sceneCompiled) return;
    if (get().frameloop !== "demand") setFrameloop("demand");
    invalidate();
  }, [width, height, get, invalidate, setFrameloop]);

  useEffect(() => {
    const budget = frameBudgetMs();
    const freeze = sceneShouldFreeze();
    let frozen = false;
    let settleStart = 0;
    const mountedAt = performance.now();

    const unsubscribePointer = subscribePointer();
    const unsubscribeTicker = subscribeToTicker(
      () => {
        if (frozen) return;
        if (typeof document !== "undefined" && document.hidden) return;
        // Nothing to draw until Prewarm has compiled every program off the
        // main thread (the preloader covers the canvas until then).
        if (!useIntroStore.getState().sceneCompiled) {
          if (performance.now() - mountedAt < COMPILE_FAILSAFE_MS) return;
          setFrameloop("demand");
          useIntroStore.getState().setSceneCompiled();
        }
        // `<Canvas frameloop="never">` re-applies its props whenever it
        // re-renders — and it re-renders on every re-size (it measures its
        // box). That put the loop back to "never" after the first resize, and
        // every invalidate below was ignored: the scene went black for good
        // on the second resize (an iOS toolbar collapse, a rotation; owner
        // review, D-033). Re-open it.
        if (get().frameloop !== "demand") setFrameloop("demand");
        invalidate();

        if (freeze && useIntroStore.getState().started) {
          const now = performance.now();
          if (settleStart === 0) settleStart = now;
          else if (now - settleStart > FREEZE_SETTLE_MS) frozen = true;
        }
      },
      () => budget,
    );

    return () => {
      unsubscribeTicker();
      unsubscribePointer();
    };
  }, [get, invalidate, setFrameloop]);

  return null;
};
