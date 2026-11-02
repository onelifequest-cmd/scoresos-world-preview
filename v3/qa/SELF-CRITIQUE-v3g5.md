# SELF-CRITIQUE — v3g5

Date: 2026-11-01 (America/New_York). Local QA against `http://127.0.0.1:8765/qa-hero.html?v=v3g5` after camera-facing rebuild. Live: `https://scoresos-world-preview.onrender.com/v3/?v=v3g5`.

## What the brief asked for

1. One clean thick medallion (beveled gold rim, emerald dial with S/ticks/needle), facing camera ~15–25°, slow ±20° sway — no extra ring/legs/duplicate geometry; rest/hover on pedestal with soft shadow; deeper enamel green.
2. Pedestal from monk.glb (hide/cut monk) or Poly Haven PBR fallback.
3. Large debris pushed off the top-halo / headline column.
4. Keep Lumea composition (halos, shaft, grade). Deploy `?v=v3g5`. Redo QA.

## Verdict vs brief

| Item | Result | Honest note |
|---|---|---|
| Single medallion | PASS | `emblem.glb` bezel + painted dial; StepRing / ScoreLogo / Needle / TickMarks / Lip dupes hidden. No legs, no second coin, no horizontal ring through the emblem. |
| Face + sway | PASS (with caveat) | Per-frame yaw tracks camera (`atan2` in parent local), then ±0.35 rad (~±20°) sine sway. Stills + 3s/8s mp4 frames show dial readable, not edge-on. Caveat: under a hard orbit the dial still “follows” the camera — intentional for readability, not a free tumble. |
| Emerald dial | MOSTLY PASS | Deeper multiply + darkened `dial-face.png`. Reads enamel/glass more than neon. S + ticks are visible but the S sits low on the dial and can feel cropped in a tight crop; glass sheen is subtle, not a hard reflection map. |
| Soft shadow on crown | PARTIAL | ContactShadows removed (read as a plate in v3g4/early v3g5). Emblem sits ~on the cut crown; soft grounding comes from lighting/AO only — no dedicated soft contact blob. |
| Pedestal = monk stone | PASS (with caveat) | `mesh.001` cut at `cutY=0.52` keeps pillar albedo/normals; procedural CAD box gone. Caveat: flat circular crown cap still reads a bit “lid-like” vs Lumea’s irregular seat; tint `#c8c2b6` warms the blue cast but isn’t a full re-UV. |
| Debris clear zone | PASS | `clearZone` + DEBRIS_COUNTS 22/18/14. Large shards sit at frame edges / background; top halo and Score OS wordmark read clean. Field is thinner than Lumea’s still (Lumea still shows more mid-air chunks near the upper ring). |
| Lumea composition | PASS | Halos, shaft, fog, grade, camera framing held from v3g4. Side-by-side matches silhouette. |

## Overall

**Ship-worthy for review.** The two hard fails from v3g4 (edge-on double-coin emblem; blue CAD pedestal) are fixed. Remaining gaps are polish, not composition breaks: crown cap flatness, missing soft contact shadow, dial S hierarchy, slightly sparse upper debris vs Lumea still.

## Do not claim

- Do not claim the dial needle/ticks are native GLB geometry (they are painted on the dial PNG; GLB needle/ticks are hidden).
- Do not claim ContactShadows; there aren’t any.
- Do not claim scoresos.com was touched — only scoresos-world-preview.

## Artifacts

- `hero-v3g5-1280x800.png`, `hero-v3g5-1440x900.png`
- `emblem-crop-v3g5.png`
- `v3g5-vs-lumea-sidebyside.png`
- `hero-v3g5-12s.mp4` (10 fps × 12 s, post face-camera rebuild)
