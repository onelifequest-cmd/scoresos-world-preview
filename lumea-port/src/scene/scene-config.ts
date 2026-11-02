/**
 * Scene configuration — every tunable constant for the monk hero lives here.
 *
 * Per obsidian/workflows/optimize-3d-scene.md ("no hardcoded values applies to
 * tier constants too"), scene magic numbers and colours are named constants in
 * one module, never sprinkled through the render code. Colours here are 3D
 * scene values (light/material inputs), not DOM styling — DOM styling still uses
 * the design tokens in globals.css. The clear/fog colour mirrors the
 * `--raw-color-scene-void` token.
 */

/** Models dropped in public/assets. The rocks ship as `rocks-lite.glb` — the
    master (`rocks.glb`, ~8.2k tris/rock) decimated offline to ~15% (~1.2k
    tris/rock). Instanced ×300 and drawn in up to three passes (main + shadow +
    dispersion mask), the full-res rocks were ~7M vertices per pass — the
    single biggest frame cost. At their on-screen size the decimation is
    invisible. Re-generate with meshopt `simplify` (ratio 0.15, error 0.02). */
/** Asset base resolved from this module so drop-in under /hero-r3f/ works. */
const ASSET_BASE = new URL("../", import.meta.url); // hero-r3f/ when bundled from scene/
// When Vite bundles scene-config into lumea-hero.js at hero-r3f/, import.meta.url is that file.
const BUNDLE_BASE = new URL("./", import.meta.url);

export const MODEL_URL = new URL("assets/emblem.glb", BUNDLE_BASE).href;
export const ROCKS_URL = new URL("assets/rocks-lite.glb", BUNDLE_BASE).href;

/** Local Draco decoder (public/draco/) — drei's default is a gstatic CDN
    round-trip on the critical path (optimize-3d-scene §12). */
export const DRACO_PATH = new URL("draco/", BUNDLE_BASE).href;

/** Near-black void — matches `--raw-color-scene-void` in globals.css. */
export const VOID_COLOR = "#050a07";

/** Render layer the debris rocks are tagged with, so the dispersion pass can
    mask the chromatic aberration to them alone (monk/rings/base never fringe). */
export const MASK_LAYER = 3;

/** Layer for the solid occluders (monk, base, rocks) used by the dispersion
    mask's depth pre-pass — so transparent volumetrics (shaft, dust, backdrop)
    are never treated as occluders. */
export const OCCLUDER_LAYER = 4;

// --- Camera ----------------------------------------------------------------
// Applied framing (user-supplied): the monk sits low with a strong dutch tilt.
// The camera auto-orbits the model on a circle derived from this pose.
export const CAMERA = {
  position: [-0.1, 1.4, 5.95] as const,
  target: [0.05, 1.55, -6.0] as const,
  fov: 34,
  /** Dutch tilt, radians (~9.7°). */
  roll: 0.17,
  /** Auto-orbit: the camera circles the model, keeping this elevation + tilt. */
  orbit: {
    /** XZ centre of the orbit — the model's ground position. */
    pivotX: 0,
    pivotZ: 1.05,
    /** Horizontal radius + camera height, derived from the applied pose. */
    radius: 4.9,
    height: 1.4,
    /** Starting azimuth (rad) so the first frame matches the applied pose. */
    azimuth: 1.591,
    /** Point the camera looks at while orbiting (above the monk → sits low). */
    lookAt: [0, 1.7, 1.05] as const,
    /** Orbit speed, rad/s. */
    speed: 0.24,
  },
  /** Idle sway amplitudes (world units) and pointer-parallax gains (static mode). */
  swayX: 0.22,
  swayY: 0.1,
  swaySpeedX: 0.14,
  swaySpeedY: 0.19,
  parallaxX: 0.18,
  parallaxY: 0.12,
  /** Low-pass factor for pointer parallax (0..1, higher = snappier). */
  parallaxEase: 0.04,
  /** Cursor-driven orbit (layered on the auto-orbit): moving the pointer nudges
      the camera around the model. `azimuth`/`height` are the max offsets (rad /
      world units); `ease` low-passes the pointer so it glides. */
  pointerOrbit: {
    azimuth: 0.5,
    height: 0.75,
    ease: 0.05,
  },
} as const;

// --- Model placement -------------------------------------------------------
export const MONK = {
  /** Figure bbox is centred on origin (y ∈ [-0.95, 0.95]). */
  position: [0, 0, 0] as const,
  rotationY: 0.35,
} as const;

/** Applied transform for the whole composition (monk + base + rocks + lights). */
export const CONTENT = {
  position: [0, 0.95, 1.05] as const,
  rotationY: 0.39,
  scale: 1,
} as const;

/** The two toruses baked into the glb, re-lit as glowing orbit lines. */
export const RING = {
  emissiveColor: "#d4af37",
  emissiveIntensity: 2.4,
  /** The smaller lower torus (Torus.002) is scaled down to a faint accent. */
  secondaryFactor: 1.0,
  color: "#c9a227",
} as const;

// --- Debris field (the user's rocks, wound into a vertical spiral) ---------
export const DEBRIS = {
  count: 300,
  /** Uniform-scale range applied per rock instance (rocks are ~0.4u native). */
  minScale: 0.16,
  maxScale: 0.7,
  /** Slight self-illumination so the shards read in the dark, away from the
      key light (added to a clone of the glb's rock material). */
  emissiveColor: "#5c6479",
  emissiveIntensity: 0.22,
  /** The vertical helix the rocks are wound onto. */
  spiral: {
    /** Full turns over the height. */
    turns: 6,
    radius: 3.6,
    radiusJitter: 1.7,
    yBottom: -4.5,
    ySpan: 12,
    yJitter: 0.7,
    angleJitter: 0.5,
    /** Push the helix centre back so rocks don't loom in the foreground. */
    zCenter: -1.6,
  },
  /** Slow rotation of the whole spiral (rad/s) — the rocks drift as one. */
  spinSpeed: 0.04,
  /** Max per-rock tumble speed (rad/s); each rock spins on a random axis at a
      random signed rate, so they turn smoothly in different directions. */
  selfSpin: 0.45,
  /** Cursor repulsion — rocks near the cursor ray drift radially away, then
      settle back. `radius` is the perpendicular-distance falloff (world units);
      `strength` the max push displacement at the cursor centre (world units).
      The motion is a mass-normalized damped oscillator toward the push target:
      the SMALLEST rocks get natural frequency `freqLight`, the biggest `freqHeavy`
      (lower = slower, heavier). `damping` is the ratio (<1 → the rock overshoots
      then settles). Kept low + slow + underdamped so the rocks feel like drifting
      boulders that lag, carry momentum, and settle with weight — not flicked motes. */
  repel: {
    radius: 2.4,
    strength: 0.9,
    freqLight: 3.2,
    freqHeavy: 1.7,
    damping: 0.42,
  },
  /** Deterministic PRNG seed — stable layout across reloads (no hydration jump). */
  seed: 1337,
} as const;

// --- Lighting --------------------------------------------------------------
export const LIGHTS = {
  ambientIntensity: 0.2,
  hemisphere: {
    sky: "#aebbdd",
    ground: "#080910",
    intensity: 0.52,
  },
  /** Key: soft-edged shaft from above, warm-white. Wide + high penumbra so the
      figure reads as evenly-lit marble instead of a blown-out hotspot. */
  key: {
    color: "#eef5e8",
    position: [0.4, 8.6, 1.4] as const,
    target: [0, 0.1, 0] as const,
    intensity: 155,
    angle: 0.66,
    penumbra: 1,
    distance: 26,
    decay: 1.45,
  },
  /** Cool front fill so the robe/face read against the dark. */
  fill: {
    color: "#8593bb",
    position: [2.4, 2.2, 5.4] as const,
    intensity: 16,
    distance: 18,
    decay: 2,
  },
  /** Bright emissive nub near the key origin — blooms into the top haze. */
  sourceGlow: {
    color: "#f0e6b8",
    position: [0.3, 6.2, 0.4] as const,
    radius: 0.22,
  },
} as const;

/** Fog fades debris into depth; blends with the backdrop's mid-tone. */
export const FOG = {
  color: "#0a120e",
  near: 8,
  far: 34,
} as const;

// --- Volumetric backdrop (replaces the flat background) --------------------
// A large sphere with a vertical gradient + a soft top glow (the light haze),
// exposed for tuning. Defaults seed the backdrop store.
export const BACKDROP = {
  topColor: "#2b2b31",
  bottomColor: "#050507",
  glowColor: "#000000",
  glowStrength: 0.65,
  /** Direction of the glow centre (roughly straight up, slightly toward camera). */
  glowY: 0.9,
  glowZ: 0.25,
  /** Angular tightness of the glow (higher = tighter). */
  glowSharpness: 4.5,
} as const;

// --- Volumetric light shaft (one soft additive beam, no visible source) -----
// A SINGLE world-vertical additive plane raking down onto the monk, billboarded
// around Y so it reads as the same shaft at every orbit angle. It renders as a
// BACKGROUND element (opaque queue, renderOrder -1) so all solid geometry cleanly
// draws over it — never a seam or a cut-out into the figure/pedestal/rocks. No
// sun disc in frame (unlike screen-space GodRays, which needs the source visible).
export const RAYS = {
  color: "#d4f0b8",
  opacity: 0.28,
  /** Source point high ABOVE the monk (monk is at CONTENT ≈ [0,0.95,1.05]). */
  position: [0, 7.6, 1.05] as const,
  width: 1.5,
  length: 13,
} as const;

// --- Dust particles --------------------------------------------------------
export const PARTICLES = {
  count: 4200,
  color: "#eaf1ff",
  size: 0.03,
  opacity: 0.85,
  /** Box the motes fill, centred on the monk. */
  radius: 7,
  height: 11,
  center: [0, 1, 1.05] as const,
  driftSpeed: 0.05,
  seed: 99,
} as const;

// --- Post-processing --------------------------------------------------------
export const POST = {
  bloom: {
    intensity: 0.38,
    luminanceThreshold: 0.88,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
  },
  /** Masked dispersion — see masked-dispersion.tsx. A radial RGB offset scaled
      by `strength`, applied ONLY where the debris-rock mask is set, so the
      chromatic split lives on the rocks and never touches the monk/rings/base.
      `colorA`/`colorB` are the two fringe tints: colourA's channels sample the
      +offset side, colourB's the −offset side. Default red/cyan reproduces a
      clean film aberration; both are live-tunable in the Rocks panel. */
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
    opacity: 0.14,
  },
} as const;
