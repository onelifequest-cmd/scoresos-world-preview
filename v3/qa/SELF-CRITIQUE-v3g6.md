# SELF-CRITIQUE — v3g6

## Ask
Fix dial UV (whole face centered in gold rim), remove grey plate under medallion + soft contact shadow, denser mid-size edge debris. Deploy `?v=v3g6`. Regenerate stills / emblem crop / side-by-side / 12s mp4. No other changes.

## What changed
1. **Dial UV** — `applyPlanarDialUVs` (XY → 0–1, center, max span) + ClampToEdge / repeat 1 / offset 0 / rotation 0. Painted `dial-face.png` (emerald, centered S + OS, ticks, needle).
2. **Plate** — ContactShadows + crown cylinder/circle caps already gone. Soft hard-edge circle replaced with radial-alpha `soft-shadow.png` plane (no slab edge).
3. **Debris** — desktop/tablet/mobile 34/28/20; mid/large edge bias; clearZone around top halo/headline kept.

## QA evidence (local Chrome / swiftshader)
| Artifact | Verdict |
|---|---|
| `emblem-crop-v3g6.png` | Full dial centered: S, OS, ticks, needle, arc. No empty upper-left. |
| `dial-only-v3g6.png` | Same; UV pass. |
| `pedestal-top-v3g6.png` | No grey plate; faint soft contact shadow only. |
| `hero-v3g6-1280x800.png` / `1440x900` | Composition holds; mid debris at far L/R; clear zone OK. |
| `v3g6-vs-lumea-sidebyside.png` | Framing matches Lumea pedestal/halos/shaft. |
| `hero-v3g6-12s.mp4` | 12s @ 10fps regenerated. |

## Residual risk
- Soft shadow is a flat blob, not real ContactShadows — fine at this camera; may look flat if camera moves a lot.
- Dial foreshortening from `tiltX` still makes the lower half slightly more dominant in hero framing; crop confirms UV is complete.
- Auto-deploy sometimes needs a manual Render trigger.

## Out of scope (kept)
No Patrick ping. scoresos.com untouched. Noindex / CROA-safe / no Conquest AI wording.
