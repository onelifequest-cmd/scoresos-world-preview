

import { wantsPointer } from "./device";

/**
 * "Has the pointer ever moved." Pointer-driven effects (rock repulsion, cursor
 * orbit) MUST gate on this: before the first move, r3f's `pointer` is NDC (0,0)
 * — dead centre — so an ungated repulsion punches a hole through the middle of
 * the scene on every touch device and every untouched desktop load. The listener
 * is never attached on the mobile tier, so `hasPointer()` stays false there.
 */

let pointerMoved = false;
let listeners = 0;
let attached = false;

const onMove = () => {
  pointerMoved = true;
};

export const subscribePointer = (): (() => void) => {
  if (typeof window === "undefined" || !wantsPointer()) return () => {};
  if (!attached) {
    window.addEventListener("pointermove", onMove, { passive: true });
    attached = true;
  }
  listeners += 1;
  return () => {
    listeners -= 1;
    if (listeners === 0 && attached) {
      window.removeEventListener("pointermove", onMove);
      attached = false;
    }
  };
};

export const hasPointer = (): boolean => pointerMoved;
