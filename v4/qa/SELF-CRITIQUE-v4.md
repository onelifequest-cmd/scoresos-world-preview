# SELF-CRITIQUE — Scores OS penthouse hero v4e

**URL:** https://scoresos-world-preview.onrender.com/v4/?v=v4e  
**Cache:** `styles.css?v=v4e1`  
**Date:** 2026-11-02 (America/New_York)

## Change
v4d wall regressed (tiny + left-clipped). v4e restores head→knees scale with a locked 1440 AABB and proportional 1280 scaling. Copy vignette + Funding card from v4d kept. **No Runway spend.**

## 1440×900 lock (measured)
| Target | Measured |
|---|---|
| left ≥24, ≈40 | ~38–40 |
| top ≈120 | ~121 |
| right ≈380 (clear of Maxine ≈410) | ~375–385 |
| bottom ≈520 | ~521 |
| gap | 14px |
| label size | ~12px |

## Notes
- `rotateY(22°)` foreshortens width; layout width is pre-compensated so the post-transform AABB hits the lock.
- Within x40–380 × y120–520 and 14px gaps, cells are taller than 4:3 (~0.54). Full-bleed imagery + gradient caps kept (no black label band). Strict landscape 4:3 cannot also span head→knees while staying left of Maxine.
- Mobile unchanged (wall `display:none`).

## QA
`hero-1440x900.png`, `hero-1280x800.png`, `hero-390x844.png`, `_wall-crop.png`, `hero-12s.mp4`

## Credits
Runway: **0**
