# Scores OS `/v4/` self-critique — **v4c**

**URL:** https://scoresos-world-preview.onrender.com/v4/?v=v4c  
**Commit:** `1930a88` (plate/CSS) · QA `cf9bdfb`+  
**Deploy:** `dep-dbk3vhou01pc738vv4j0` (live; prior `dep-dbk3tu5g1s2s7397uh80`)  
**Runway:** 50 credits this pass (299→249). Failed take1 charged 0; take2 gen-4-turbo 10s succeeded. Cap respected.

## Canvas FAIL items → v4c response

1. **Wall ~1.6–1.8× / no grey plate / gold into marble / harder perspective.**  
   CSS wall now **32.5% × 47.5%** (~1.7× prior 19.2×28). `.wall::before` grey niche removed. Thin gold tile bezels only. `perspective(1400px) rotateY(26deg)` pushes tiles into the room toward the window. Height reads roughly Maxine head→knees on the 1440 still.
2. **Table “742” hologram.**  
   New plate + per-frame paint-out on the I2V clip; soft dark **copy scrim** also blankets the table zone under the right-hand copy. Live 1440 still: no readable table hologram; plus soft CSS radial veil over the table corner (v4c1).
3. **Disclaimer readability.**  
   `.croa` at **75% white**; copy block sits on a soft dark scrim / blur.
4. **Characters too big.**  
   New GenerateImage plate (edit of goals-wall-v5) + gen-4-turbo loop with smaller / farther Maxine+robot; video `object-position: 48% 42%` pulls back slightly. Cameos sit right of the larger grid on desktop QA.

**Minors:** Ribbon → `Preview only · not live scoresos.com`. Score tile: clear green **612→742** pill + glow. Mobile carousel under CTA unchanged (passes).

## What still looks fake / off

1. **AI film.** gen-4-turbo micro-morph on marble/pool if you stare — same class as v4b.
2. **Wall vs architecture.** Bezels sit in marble without a grey plate, but tiles still read as a fitted UI layer more than poured glass. Perspective helps; one-tile-per-panel alignment is approximate, not laser-matched to every gold inlay.
3. **Cameo scale.** Better than v4b; against the bigger grid they can still feel mid-room rather than tiny balcony cameos. Further shrink would need another plate + another 50cr.
4. **Score glyph over chart.** Intentional overlay; green climb is now unmistakable.
5. **Wins still static.** Only score tick + chips animate.

## Real vs premium scorecard

| Criterion | Score (1–5) | Note |
|---|---|---|
| Bright / not dark | 5 | Golden hour held |
| Lifestyle > characters | 4 | Smaller cameos; grid dominates left |
| Photoreal / filmed | 3 | Still plate + I2V |
| Premium (not graphic design) | 4 | No grey niche; scrim helps copy |
| Not video-gamey | 4 | Clear vs Lumea |
| Product story (wins wall) | 4 | Bigger readable wall + green climb |
| Canvas blockers cleared | 4 | All four addressed; wall seating still “UI on marble” |

**Ship recommendation:** Show Patrick `?v=v4c`. Next only if asked: (a) tighter per-panel tile matrix, (b) another plate with balcony-scale cameos.

## QA artifacts

- `v4/qa/hero-1440x900.png`
- `v4/qa/hero-1280x800.png`
- `v4/qa/hero-390x844.png` (carousel under CTA)
- `v4/qa/hero-12s.mp4`
- `v4/qa/_wall-crop.png`

## Non-goals respected

- No touch to scoresos.com / DNS
- Preview-only noindex
- Never mentioned Conquest AI
- Runway ≤50 this pass (exactly 50)
