/**
 * Scene configuration — v3g9 full-body Maxine+robot, closer framing, visible credit floaters.
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
  position: [-0.08, 1.35, 5.15] as const,
  target: [0.05, 1.7, -6.0] as const,
  fov: 34,
  roll: 0.14,
  orbit: {
    pivotX: 0,
    pivotZ: 1.05,
    /** Between v3g8 (4.9) and overshot 3.95 — pair ~48% of frame height. */
    radius: 4.10,
    /** Slight low angle; lookAt at mid-torso so heads stay in frame. */
    height: 1.30,
    azimuth: 1.591,
    lookAt: [0, 1.88, 1.05] as const,
    speed: 0.22,
  },
  swayX: 0.16,
  swayY: 0.08,
  swaySpeedX: 0.12,
  swaySpeedY: 0.17,
  parallaxX: 0.12,
  parallaxY: 0.08,
  parallaxEase: 0.04,
  pointerOrbit: {
    azimuth: 0.35,
    height: 0.5,
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
  /**
   * Mode A (v3g9): float between the pair at chest-to-head height, slightly
   * in front (z+) so it sits clear of the top halo (raised above heads).
   */
  position: [0, 1.32, 0.48] as const,
  /** Sized so 742 + arc read at 1280; chest height, in front of pair. */
  diameter: 0.78,
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
  /** 12–18 mid-size credit floaters near frame edges / mid-depth. */
  count: 16,
  minScale: 0.48,
  maxScale: 0.86,
  emissiveColor: "#7ae8a8",
  emissiveIntensity: 1.35,
  spiral: {
    turns: 3.2,
    radius: 3.45,
    radiusJitter: 0.7,
    yBottom: 0.2,
    ySpan: 3.4,
    yJitter: 0.45,
    angleJitter: 0.7,
    zCenter: -0.55,
  },
  /** Keep floaters off the pair + gauge + headline column; park at edges. */
  clearZone: {
    yMin: 0.15,
    yMax: 3.0,
    radius: 1.85,
    minPushRadius: 2.85,
  },
  spinSpeed: 0.028,
  selfSpin: 0.18,
  repel: {
    radius: 2.8,
    strength: 1.15,
    freqLight: 2.6,
    freqHeavy: 1.4,
    damping: 0.48,
  },
  seed: 20261101,
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
    /** Soft rim only — bodies stay neutrally keyed from the shaft. */
    intensity: 1.4,
    distance: 5.5,
    decay: 2,
  },
} as const;

export const FOG = {
  color: "#15161f",
  /** Mild depth haze — characters (~4 m) barely touched; floaters deepen. */
  near: 5.2,
  far: 18,
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
    intensity: 0.42,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.28,
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

// --- Characters (alpha billboards on pillar crown) -------------------------
const CHAR_BASE = new URL("assets/characters/", BUNDLE_BASE);
/**
 * Single swap points for Meshy character meshes (copied into assets/characters/).
 * Maxine: placeholder is maxine-c.glb until Patrick's ref Meshy lands —
 * optimize v3/media/meshy/maxine-ref-raw.glb → maxine-ref.glb, copy here, flip
 * MAXINE_GLB_FILE to "maxine-ref.glb". Face must match refs/maxine-ref.png.
 * Robot: robot-b.glb is final for v3g9.
 */
export const MAXINE_GLB_FILE = "maxine-ref.glb"; // Patrick ref face (from maxine-ref-raw.glb)
export const ROBOT_GLB_FILE = "robot-b.glb";
export const MAXINE_GLB_URL = new URL(MAXINE_GLB_FILE, CHAR_BASE).href;
export const ROBOT_GLB_URL = new URL(ROBOT_GLB_FILE, CHAR_BASE).href;
/**
 * Per-character hero slot. Billboard PNG is the v3g9 fallback; when a Meshy
 * GLB lands under assets/characters/, set `glbUrl` and the slot swaps to the
 * mesh while keeping the same position / height(scale) / yaw / lighting.
 */
export type CharacterSlotConfig = {
  /** Billboard cutout (always present as fallback). */
  url: string;
  /** Optional Meshy GLB — when set, replaces the billboard plane. */
  glbUrl: string | null;
  position: readonly [number, number, number];
  /** World height of the figure (billboard plane height / GLB uniform scale target). */
  height: number;
  /** Billboard width/height. Ignored for GLB. */
  aspect: number;
  yawBias: number;
  /** Extra Euler XYZ for GLB (radians). Billboard uses yawBias only. */
  rotation: readonly [number, number, number];
};

export const CHARACTERS: { maxine: CharacterSlotConfig; robot: CharacterSlotConfig } = {
  maxine: {
    url: new URL("maxine-C-cutout.png", CHAR_BASE).href,
    /** Patrick-approved Meshy from maxine-f-fullbody-still / refs/maxine-ref.png — face unaltered. */
    glbUrl: MAXINE_GLB_URL,
    /** Feet on crown (~0.515); full-body with boots visible. */
    position: [-0.48, 0.515, 0.18],
    /** ~1.36 world units ≈ 48% of FOV height at radius 4.35. */
    height: 1.50,
    aspect: 0.305,
    yawBias: 0.06,
    rotation: [0, Math.PI, 0],
  },
  robot: {
    url: new URL("robot-B-cutout.png", CHAR_BASE).href,
    /** Optimized Meshy mesh (meshopt + webp, ~2 MB / ~102k tris). */
    glbUrl: ROBOT_GLB_URL,
    /** True full-body (head→feet) matching robot-B-approved. */
    position: [0.50, 0.515, 0.16],
    height: 1.55,
    aspect: 0.341,
    yawBias: -0.05,
    rotation: [0, Math.PI, 0],
  },
};

/** Credit-themed floating debris icons (replace rocks). */
const ICON_BASE = new URL("assets/credit-icons/", BUNDLE_BASE);
export const CREDIT_ICONS = [
  { url: new URL("chip-680.png", ICON_BASE).href, aspect: 256 / 160 },
  { url: new URL("chip-720.png", ICON_BASE).href, aspect: 256 / 160 },
  { url: new URL("chip-742.png", ICON_BASE).href, aspect: 256 / 160 },
  { url: new URL("chip-801.png", ICON_BASE).href, aspect: 256 / 160 },
  { url: new URL("chip-up.png", ICON_BASE).href, aspect: 256 / 160 },
  { url: new URL("house.png", ICON_BASE).href, aspect: 1 },
  { url: new URL("card.png", ICON_BASE).href, aspect: 200 / 128 },
  { url: new URL("dollar.png", ICON_BASE).href, aspect: 1 },
  { url: new URL("key.png", ICON_BASE).href, aspect: 192 / 96 },
  { url: new URL("trend.png", ICON_BASE).href, aspect: 192 / 128 },
  { url: new URL("approved.png", ICON_BASE).href, aspect: 220 / 100 },
  { url: new URL("check.png", ICON_BASE).href, aspect: 1 },
] as const;

/**
 * Animated 3D gauge needle — dial arc is ~270° with gap at bottom
 * (300 at ~7:30, 850 at ~4:30). Short pointer from hub so it never
 * crosses the big "742" numeral.
 */
export const GAUGE = {
  scoreMin: 300,
  scoreMax: 850,
  restScore: 742,
  /** Seconds to climb from startScore → restScore. */
  climbDuration: 3.6,
  startScore: 520,
  /** Local dial-plane: 0 = 12 o'clock; negative = CCW toward 300. */
  startAngle: (-135 * Math.PI) / 180,
  sweep: (270 * Math.PI) / 180,
  /** Hub sits slightly below dial center (matches painted hub). */
  hubY: -0.06,
  /** Short outer pointer length in dial-local units (pre-scale). */
  length: 0.78,
  thickness: 0.045,
} as const;

export function scoreToNeedleAngle(score: number): number {
  const t = Math.min(
    1,
    Math.max(0, (score - GAUGE.scoreMin) / (GAUGE.scoreMax - GAUGE.scoreMin)),
  );
  return GAUGE.startAngle + t * GAUGE.sweep;
}
