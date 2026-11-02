/**
 * Scene configuration — Lumea defaults kept for v3g7.
 * Emblem = single facing medallion (sway, no spin); pedestal from monk.glb;
 * debris cleared from the upper halo / headline zone.
 */

/** Asset base resolved from this module so drop-in under /hero-r3f/ works. */
const BUNDLE_BASE = new URL("./", import.meta.url);

/** Monk GLB — provides the two baked halo toruses (figure mesh is hidden). */
export const MODEL_URL = new URL("assets/monk.glb", BUNDLE_BASE).href;
/** Score OS emblem GLB — gold bezel only; dial is painted separately. */
export const EMBLEM_URL = new URL("assets/emblem.glb", BUNDLE_BASE).href;
export const ROCKS_URL = new URL("assets/rocks-lite.glb", BUNDLE_BASE).href;
export const DIAL_URL = new URL("assets/dial-face.png", BUNDLE_BASE).href;
export const SOFT_SHADOW_URL = new URL("assets/soft-shadow.png", BUNDLE_BASE).href;

/** Local Draco decoder (public/draco/). */
export const DRACO_PATH = new URL("draco/", BUNDLE_BASE).href;

/** Near-black void — matches Lumea `--raw-color-scene-void`. */
export const VOID_COLOR = "#05060a";

export const MASK_LAYER = 3;
export const OCCLUDER_LAYER = 4;

// --- Camera (Lumea shipped) ------------------------------------------------
export const CAMERA = {
  position: [-0.1, 1.4, 5.95] as const,
  target: [0.05, 1.55, -6.0] as const,
  fov: 34,
  roll: 0.17,
  orbit: {
    pivotX: 0,
    pivotZ: 1.05,
    radius: 4.9,
    height: 1.4,
    azimuth: 1.591,
    lookAt: [0, 1.7, 1.05] as const,
    speed: 0.24,
  },
  swayX: 0.22,
  swayY: 0.1,
  swaySpeedX: 0.14,
  swaySpeedY: 0.19,
  parallaxX: 0.18,
  parallaxY: 0.12,
  parallaxEase: 0.04,
  pointerOrbit: {
    azimuth: 0.5,
    height: 0.75,
    ease: 0.05,
  },
} as const;

// --- Model placement -------------------------------------------------------
export const MONK = {
  position: [0, 0, 0] as const,
  /** Small yaw — dial (+Z) faces the initial camera with a slight ¾. */
  rotationY: 0,
} as const;

export const CONTENT = {
  position: [0, 0.95, 1.05] as const,
  rotationY: 0.39,
  scale: 1,
} as const;

/** Halo rings — warm white-gold, Lumea intensity. */
export const RING = {
  /** Warm gold with a whisper of emerald in the inner glow. */
  emissiveColor: "#eef0c4",
  emissiveIntensity: 3.0,
  secondaryFactor: 1.0,
  color: "#e8ecc0",
} as const;

/**
 * Emblem seated on the monk.glb pedestal crown (where the monk sat).
 * Faces camera within ~15–25°; slow ±sway — no full spin.
 */
export const EMBLEM = {
  /** Center so the bottom edge rests just above the cut crown (~0.52). */
  position: [0, 1.00, 0] as const,
  /** ~20–22% of vertical FOV — ~18% larger than v3g6, clears top halo. */
  diameter: 0.97,
  /** Visible thickness (emblem.glb native depth scaled). */
  thickness: 0.13,
  /** Mild tip toward camera (~12°) — keep dial frontal. */
  tiltX: -0.18,
  /**
   * Yaw so dial (+Z) faces the Lumea camera (near +X in content space after
   * CONTENT.rotationY). ~98° keeps the face within ~15–25° of front at rest.
   */
  baseYaw: 1.72,
  /** Sway amplitude ±20° (rad). */
  swayAmp: 0.35,
  /** Sway angular speed. */
  swaySpeed: 0.42,
  /** Contact-shadow Y on the pedestal crown. */
  shadowY: 0.515,
} as const;

/** Pedestal cut from monk.glb mesh.001 (monk body removed above cutY). */
export const PILLAR = {
  /** Fallback procedural placement if GLB missing. */
  position: [0, -0.95, 0] as const,
  height: 1.28,
  radiusBottom: 0.42,
  radiusTop: 0.34,
  /** Local Y in mesh.001 where radial width collapses to the monk torso. */
  cutY: 0.52,
  /** Flat crown disc so the cut reads as a solid seat. */
  capRadius: 0.55,
  /** Warm dark stone tint over the original albedo (kills blue-CAD read). */
  tint: "#c8c2b6",
  color: "#2a2d36",
  roughness: 0.9,
  metalness: 0.04,
  emissiveColor: "#3d5e52",
  emissiveIntensity: 0.12,
} as const;

// --- Debris field ----------------------------------------------------------
// Lumea's config ships count 300; on-screen the still shows ~15–25 pieces at
// the edges. v3g6 uses denser edge debris (~34) explicitly so green wash can't
// resurrect a noisy field.
export const DEBRIS = {
  count: 34,
  minScale: 0.16,
  maxScale: 0.55,
  emissiveColor: "#4a6b5e",
  emissiveIntensity: 0.28,
  spiral: {
    turns: 5,
    radius: 4.2,
    radiusJitter: 1.6,
    yBottom: -4.0,
    ySpan: 11,
    yJitter: 0.7,
    angleJitter: 0.55,
    zCenter: -1.8,
  },
  /** Keep large shards out of the upper halo / headline column. */
  clearZone: {
    yMin: 0.8,
    yMax: 5.8,
    radius: 3.0,
    minPushRadius: 3.8,
  },
  spinSpeed: 0.04,
  selfSpin: 0.35,
  repel: {
    radius: 2.4,
    strength: 0.9,
    freqLight: 3.2,
    freqHeavy: 1.7,
    damping: 0.42,
  },
  seed: 1337,
} as const;

// --- Lighting (Lumea shipped) ----------------------------------------------
export const LIGHTS = {
  ambientIntensity: 0.2,
  hemisphere: {
    sky: "#aebbdd",
    ground: "#080910",
    intensity: 0.52,
  },
  key: {
    color: "#f3ede2",
    position: [0.4, 8.6, 1.4] as const,
    target: [0, 0.1, 0] as const,
    intensity: 132,
    angle: 0.66,
    penumbra: 1,
    distance: 26,
    decay: 1.45,
  },
  fill: {
    color: "#8593bb",
    position: [2.4, 2.2, 5.4] as const,
    intensity: 16,
    distance: 18,
    decay: 2,
  },
  sourceGlow: {
    color: "#fff6e6",
    position: [0.3, 6.2, 0.4] as const,
    radius: 0.22,
  },
  /** Soft emerald bounce on medallion + pillar crown (v3g7). */
  emeraldBounce: {
    color: "#3d9a72",
    position: [-0.55, 1.15, 1.4] as const,
    intensity: 9.5,
    distance: 5.5,
    decay: 2,
  },
} as const;

export const FOG = {
  color: "#15161f",
  near: 8,
  far: 34,
} as const;

export const BACKDROP = {
  topColor: "#2b2b31",
  bottomColor: "#050507",
  glowColor: "#000000",
  glowStrength: 0.65,
  glowY: 0.9,
  glowZ: 0.25,
  glowSharpness: 4.5,
} as const;

export const RAYS = {
  color: "#fff8eb",
  opacity: 0.31,
  position: [0, 7.6, 1.05] as const,
  width: 1.5,
  length: 13,
} as const;

export const PARTICLES = {
  count: 4200,
  color: "#eaf1ff",
  size: 0.03,
  opacity: 0.85,
  radius: 7,
  height: 11,
  center: [0, 1, 1.05] as const,
  driftSpeed: 0.05,
  seed: 99,
} as const;

export const POST = {
  bloom: {
    intensity: 0.66,
    luminanceThreshold: 0.82,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
  },
  dispersion: {
    strength: 0.01,
    colorA: "#ffffff",
    colorB: "#b0967d",
  },
  vignette: {
    offset: 0.26,
    darkness: 1,
  },
  noise: {
    opacity: 0.21,
  },
} as const;
