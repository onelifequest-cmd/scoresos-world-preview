# v3g9 self-critique (both Meshy GLBs)

**Grade: B / B+**

## What landed
- **Robot** `robot-b.glb`: 2.0 MB, ~102k tris, meshopt+webp 2048 (from 154 MB / 3.4M). Visor silhouette clean; chrome reads under neutral shaft key + emerald rim; contact shadow on crown.
- **Maxine** `maxine-c.glb`: 1.2 MB, ~77k tris, meshopt+webp 2048 (from 20.8 MB / 483k). Face/hair held at this ratio. Authored split: `maxine-suit` roughness 0.45 (satin) + `maxine-arm-chrome` metalness 0.9 / roughness 0.2 (~13% tris by albedo heuristic — Meshy shipped a single material).
- Pair ~45–55% frame height; feet on pedestal; top halo above heads; gauge between at chest with **742** readable at 1280; credit floaters visible at edges.
- Lighting: green wash largely gone; chrome bloom only; mild haze; GLB idle sway ±18° (billboard fallback still ±8°).
- Raws gitignored (`v3/media/meshy/*-raw.glb`); billboard PNGs remain as Suspense fallback.

## Residual issues
- Gauge bloom still kisses the numeral / halo at some angles.
- Maxine chrome split is UV-albedo heuristic — a few dark suit panels may go chrome; not a true Meshy material ID.
- Swiftshader QA understates real-GPU specular; live check required.
- Floaters identifiable but not yet “Lumea density poetry.”
- No Patrick / Canvas contact; scoresos.com untouched.

## QA set (local)
- `v3/qa/hero-v3g9-1280x800.png`
- `v3/qa/hero-v3g9-1440x900.png`
- `v3/qa/chars-crop-v3g9.png`
- `v3/qa/v3g9-vs-lumea-sidebyside.png`
- `v3/qa/hero-v3g9-12s.mp4`
