# SELF-CRITIQUE — v3g4

**Verdict: CONDITIONAL PASS vs Lumea** — much closer than v3g3. Framing/grade/halos/debris density now track Lumea; residual gaps are pedestal authenticity and emblem seating polish.

## What improved (honest)

1. **Debris** — Cut to 22 dark-grey pieces at spiral edges. No yellow-green wash. Reads like Lumea’s sparse field, not a noisy particle cloud.
2. **Grade / shaft** — Restored Lumea VOID/FOG/LIGHTS/RAYS/POST. Warm-white shaft (`#fff8eb`), neutral void. Green is dial-only.
3. **Halos** — Real Torus + Torus.002 from `monk.glb` with Lumea RING emissive (`#ffe3b3` @ 3.0). No custom thin ellipses.
4. **Emblem** — Thick beveled medallion on the pillar top, ~15–20% frame height, slow spin, painted dial (S + green arc) readable at ¾.
5. **Camera / content** — Restored Lumea radius 4.9 / fov 34 / CONTENT pose. Headline + copy + CTA untouched.

## What still fails / is weaker than Lumea

1. **Pillar authenticity** — Procedural weathered cylinder ≠ Lumea’s fused stone pedestal in `monk.glb`. Silhouette is “tall dark column” but material is flatter/CAD-like vs the original carved ruin. Extracting the real pedestal without the monk would need mesh surgery.
2. **Emblem seating** — Coin still kisses the crown and can look slightly recessed depending on orbit angle; Lumea’s monk sits cleanly *on* a flat platform. Needs a clearer platform lip / 2–3 cm raise.
3. **Dial presence** — Readable in stills now, but green is subtle at full-frame vs the monk’s white robe; bloom can still crush gauge detail on swiftshader.
4. **Halo thickness in stills** — GLB toruses are correct, but under our bloom/swiftshader they can read thinner than Lumea’s marketing still. Live GPU should bloom more.
5. **No true DOF** — Lumea still’s soft edge rocks are fog + marketing DOF. We rely on fog only; foreground rocks are sharper than the reference still.

## Ship checklist

- Live: `https://scoresos-world-preview.onrender.com/v3/?v=v3g4`
- QA: `hero-v3g4-1280x800.png`, `hero-v3g4-1440x900.png`, `v3g4-vs-lumea-sidebyside.png`, `hero-v3g4-12s.mp4`, `emblem-crop-v3g4.png`
- scoresos.com untouched; no Patrick notify until parent pass.
