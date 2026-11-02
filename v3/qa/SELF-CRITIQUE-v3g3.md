# v3g3 QA self-critique — 2026-11-01 ~21:20 ET (America/New_York)

Compared against Lumea `scene-still-desktop.webp` (canonical composition) and FB reel library tiles. Stills: `hero-1280x800.png`, `hero-1440x900.png`, `hero-emblem-crop.png`, `v3g3-vs-lumea-sidebyside.png`, `hero-v3g3-12s.mp4`.

## Checklist vs v3g2 FAIL notes

1. **SCALE/FRAMING — PASS (with caveats)**  
   Emblem sits ~30–40% of frame height on a fully visible rock pedestal, centered/slightly right, with dark void around it. Camera pulled back vs v3g2 (radius 7.8 / fov 38). Rock is a boulder pedestal, not Lumea’s tall pillar — silhouette differs, but framing distance matches the brief.

2. **EMPTY DIAL — CONDITIONAL PASS**  
   Dial now reads as a gauge: gold tick ring, gold needle, embossed **S** + **OS**, green face (~7.9k greenish pixels in emblem crop). Implemented as painted `dial-face.png` + unlit `MeshBasicMaterial` because transmission/clearcoat washed white under SwiftShader. **Honest gap:** not true glass (no transmission/env refraction). Depth is suggested by the paint + soft coat, not real IOR. Bright enough under bloom to read instantly; still darker/murkier than a luxury watch glass would be on real GPU.

3. **LIGHT SHAFT — PARTIAL**  
   Dual-plane additive shaft + motes are present and visible in stills. Weaker and softer than Lumea’s thick white volumetric column. Readable as a shaft, not yet Lumea-weight.

4. **ORBIT LINES — PASS**  
   Thin gold-amber tubes, pushed to z≈-1.35/-1.55 so they sit mostly behind the emblem. No longer thick saturated yellow slices across the face.

5. **COPY — PASS**  
   Aside: “The operating system for credit repair and funding agencies.” + Get Started CTA. Headline “Score OS” readable with slight overlap. No Conquest AI wording. noindex intact. scoresos.com untouched.

6. **DEPLOY TARGET**  
   scoresos-world-preview only, `?v=v3g3`.

## Verdict

**Not a clean Lusion-class pass.** Framing + copy + orbits + dial *legibility* clear the v3g2 fail bar. Remaining gaps vs Lumea still: weaker volumetric shaft, painted (not glass) dial, rock silhouette not a tall pillar, debris/cursor-parting fidelity not audited in the 12s mp4 as carefully as stills. Do **not** show Patrick as “done” until parent agrees these gaps are acceptable or wants another pass (true glass on real GPU, stronger shaft).
