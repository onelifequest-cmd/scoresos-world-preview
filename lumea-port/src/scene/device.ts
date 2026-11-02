/**
 * Device tiering — the single source of truth for how heavy the scene may be.
 *
 * Ported from the `optimize-3d-scene` skill (`helion`/`mycelia` `device.ts`).
 * Read ONCE at scene construction: a device does not change tier mid-session,
 * and rebuilding buffers on resize costs more than the mismatch is worth. DPR,
 * particle counts, bloom, MSAA, frame budget and whether the pointer is even
 * listened to all read from here so they can never drift apart.
 */

export type DeviceTier = "mobile" | "tablet" | "desktop";

const TABLET_MAX = 1180;
const MOBILE_MAX = 768;

export const deviceTier = (): DeviceTier => {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (width < MOBILE_MAX || coarse) return "mobile";
  if (width < TABLET_MAX) return "tablet";
  return "desktop";
};

/** The scene has hard-edged elements (thin glowing rings, dust motes), so we hold
 *  mobile at 1.0 rather than dropping below — sub-1 aliases the rings visibly.
 *  Still a big cut from an uncapped 2–3× phone (each × is squared in fragments). */
export const clampedPixelRatio = (tier: DeviceTier = deviceTier()): number => {
  if (typeof window === "undefined") return 1;
  const dpr = window.devicePixelRatio || 1;
  if (tier === "mobile") return Math.min(dpr, 1);
  if (tier === "tablet") return Math.min(Math.max(dpr, 0.75), 1.25);
  return Math.min(Math.max(dpr, 0.75), 1.5);
};

/** Minimum ms between rendered frames. 30fps on a phone is the biggest single win
 *  — the scene is fill-bound, not motion-bound (the orbit + dust evolve slowly). */
export const frameBudgetMs = (tier: DeviceTier = deviceTier()): number => {
  if (tier === "mobile") return 1000 / 30;
  if (tier === "tablet") return 1000 / 45;
  return 0; // desktop: every rAF tick
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Nearest web-exposed proxy for iOS Low Power Mode (which has no API). */
export const isEnergySaver = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData === true) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0) {
    return nav.deviceMemory <= 2;
  }
  return false;
};

/** Play the intro, then stop drawing on a settled frame. WebGL keeps the last
 *  frame on the canvas, so a frozen scene costs nothing. */
export const sceneShouldFreeze = (tier: DeviceTier = deviceTier()): boolean =>
  prefersReducedMotion() || (tier === "mobile" && isEnergySaver());

/** Whether pointer-driven effects (rock repulsion, cursor orbit) run at all. */
export const wantsPointer = (tier: DeviceTier = deviceTier()): boolean =>
  tier !== "mobile";

/** Per-tier dust + debris counts. Cut the sparse end hardest — the phone dies on
 *  fill, and a third of the motes read the same. */
export const PARTICLE_COUNTS: Record<DeviceTier, number> = {
  desktop: 4200,
  tablet: 2400,
  mobile: 1400,
};

export const DEBRIS_COUNTS: Record<DeviceTier, number> = {
  desktop: 300,
  tablet: 200,
  mobile: 130,
};

/** MSAA on the composer — expensive on a phone; the DPR clamp + fewer motes hide
 *  its absence there. 4× on desktop: 8× doubled the resolve bandwidth of every
 *  composer pass for no visible gain over 4× at the clamped 1.5 DPR (and SMAA
 *  no longer stacks on top — it renders only where MSAA is 0). */
export const MULTISAMPLING: Record<DeviceTier, number> = {
  desktop: 4,
  tablet: 2,
  mobile: 0,
};
