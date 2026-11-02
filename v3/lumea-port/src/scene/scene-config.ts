/**
 * Scene configuration — Lumea defaults restored for v3g4.
 * Only asset URL resolution and a tighter debris count (visual Lumea density)
 * diverge; colour grade, camera, rings, shaft, lights match shipped Lumea.
 */

/** Asset base resolved from this module so drop-in under /hero-r3f/ works. */
const BUNDLE_BASE = new URL("./", import.meta.url);

/** Monk GLB — provides the two baked halo toruses (figure mesh is hidden). */
export const MODEL_URL = new URL("assets/monk.glb", BUNDLE_BASE).href;
/** Score OS emblem GLB — gold bezel only; dial is painted separately. */
export const EMBLEM_URL = new URL("assets/emblem.glb", BUNDLE_BASE).href;
export const ROCKS_URL = new URL("assets/rocks-lite.glb", BUNDLE_BASE).href;
export const DIAL_URL = new URL("assets/dial-face.png", BUNDLE_BASE).href;

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
  emissiveColor: "#ffe3b3",
  emissiveIntensity: 3.0,
  secondaryFactor: 1.0,
  color: "#ffe3b3",
} as const;

/**
 * Emblem seated on the pillar top (where the monk sat).
 * Diameter ~0.62 ≈ 18% of vertical FOV at Lumea camera (≈3.0u tall).
 */
export const EMBLEM = {
  /** Seated clearly ABOVE the pillar crown (monk torso height). */
  position: [0, 0.55, 0] as const,
  /** ~18–20% of vertical FOV at Lumea camera. */
  diameter: 0.85,
  /** Visible thickness of the medallion body. */
  thickness: 0.14,
  /** Tip toward camera for a ¾ read of the dial. */
  tiltX: -0.22,
  /** Slow Y spin (rad/s). */
  spinSpeed: 0.08,
} as const;

/** Tall dark stone pillar approximating the fused Lumea pedestal. */
export const PILLAR = {
  /** Bottom centre in content space (pedestal foot). */
  position: [0, -0.95, 0] as const,
  /** Height from foot to platform (crown below emblem). */
  height: 1.28,
  radiusBottom: 0.42,
  radiusTop: 0.34,
  /** Dark grey stone — matches debris emissive family, no green. */
  color: "#2a2d36",
  roughness: 0.92,
  metalness: 0.03,
  emissiveColor: "#5c6479",
  emissiveIntensity: 0.12,
} as const;

// --- Debris field ----------------------------------------------------------
// Lumea's config ships count 300; on-screen the still shows ~15–25 pieces at
// the edges. v3g4 uses that visual density explicitly so green wash can't
// resurrect a noisy field.
export const DEBRIS = {
  count: 22,
  minScale: 0.22,
  maxScale: 0.72,
  emissiveColor: "#5c6479",
  emissiveIntensity: 0.22,
  spiral: {
    turns: 5,
    radius: 3.8,
    radiusJitter: 1.5,
    yBottom: -4.0,
    ySpan: 11,
    yJitter: 0.7,
    angleJitter: 0.55,
    zCenter: -1.6,
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
