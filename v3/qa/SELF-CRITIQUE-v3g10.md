# v3g10 self-critique (v3g9 FAIL fixes)

**Grade: B+** — preview shippable; seven FAIL items largely addressed; gauge seat still imperfect.

Date: 2026-11-02 ~01:20 America/New_York.  
Live: `https://scoresos-world-preview.onrender.com/v3/?v=v3g10` (noindex).  
Commit `308b94e` · deploy `dep-dbk2ijrbc2fs73e7uc80` · scoresos-world-preview only · scoresos.com untouched.

## Checklist vs FAIL review

| # | Ask | Result |
|---|---|---|
| 1 | Heads cropped → full figures under nav, ~45–50% VH, shaft-centered | **PASS** — head→boots clear of nav with headroom; pair ≈45% VH in light shaft (live 1280/1440). |
| 2 | Robot profile-left → face camera (¾ toward Maxine at most) | **PASS** — robot yaw locked at −π/2 + small bias; chest/visor read toward camera (¾). |
| 3 | 742 hidden; DEMO SCORE 580; settle ≤~2.5s | **MOSTLY PASS** — climbDuration 2.2s; live stills after settle show **742**; `#live-score` forced `display:none` under `#lumea-hero-root`. Gauge sits above/near the gap and is readable, but often reads slightly right of true between rather than cleanly nested in the torso gap. |
| 4 | Maxine suit blown out | **PASS** — suit color ×0.55, envMap 0.22, SlotLights 0.32, bloom intensity 0.18 / thr 1.35; satin folds read; face untreated. |
| 5 | Headline overlaps robot | **PASS** — Syne headline smaller (`clamp(1.9rem, 4.2vw, 3.1rem)`), shifted left (−4.5vw); left column clear of figures. |
| 6 | Crest reads SCORE OS | **PASS** — white mark redrawn; crest nameplate **SCORES OS** (verified on live still + asset crop). |
| 7 | Floaters denser / more visible, Lumea-style, clear of faces | **PASS** — count 30, brighter emissive, mid ring; faces clear. Occasional large near-camera chip still pops in corners. |

## What landed (delta from v3g9 / first v3g10 push)
- Camera: radius 4.95, height 1.62, lookAt mid-upper torso `[0, 1.88, 1.05]` so heads sit under nav with headroom (not co-lowering lookAt with CONTENT).
- CONTENT.y 0.58; character heights ~1.30 / 1.34.
- Robot `rotation [0, −π/2, 0]`, `yawBias −0.22` (QA `?robotYaw=` hook retained).
- EMBLEM `[0.01, 2.08, 0.62]`, diameter 0.78, swayAmp 0.12; climb 2.2s → 742.
- Maxine material darken + bloom raise; left headline CSS; denser DEBRIS.
- Crest asset already SCORES OS from prior v3g10 commit; retained.

## Honest problems
1. **Gauge seat** — 742 is readable and clear of bodies/halo more often than v3g9, but still tends to float above-right of Maxine rather than a textbook “between chests, slightly in front” lock. Sway + CONTENT.rotationY + billboard yaw fight a perfect seat.
2. **vs Lumea** — side-by-side still shows Lumea denser debris poetry and cleaner single-hero silhouette; our dual CTAs + Syne lockup + preview chrome crowd the frame.
3. **Swiftshader QA** understates real-GPU chrome/satin; robot looks flatter here than on device.
4. **Occasional oversized floater** in a near corner (perspective) — density OK, scale distribution still a bit hot.
5. Live 12s is 60 frames @ 5fps — motion proof only.

## QA artifacts
- `v3/qa/hero-v3g10-live-1280x800.png` (1.2 MB)
- `v3/qa/hero-v3g10-live-1440x900.png` (1.7 MB)
- `v3/qa/chars-crop-v3g10-live.png` (636 KB)
- `v3/qa/v3g10-vs-lumea-sidebyside-live.png` (570 KB)
- `v3/qa/hero-v3g10-live-12s.mp4` (5.2 MB)
- Mirrors: `hero-v3g10-1280x800.png`, `hero-v3g10-1440x900.png`, `chars-crop-v3g10.png`, `v3g10-vs-lumea-sidebyside.png`, `hero-v3g10-12s.mp4`
- This file: `v3/qa/SELF-CRITIQUE-v3g10.md`

## Next (if another pass)
- Pin gauge with a screen-space or lookAt-billboard helper so “between gap” survives CONTENT.rotationY.
- Soft-cap debris max projected size (or bias z further back) to kill corner plates.
- Optional real-GPU still for satin/chrome truth.
