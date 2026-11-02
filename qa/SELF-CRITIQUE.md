# v3g1 QA self-critique — 2026-11-01 ~20:05 ET (America/New_York)

## Pass criteria
- Lumea live WebGL hero (SVGLoader + ExtrudeGeometry emblem, rock, fog/moonlight, amber rings, debris): PASS (`qa/hero-emblem.png`)
- Massive SCORE OS wordmark behind monolith: PASS (3D plate; HTML layer a11y duplicate — bloom/fog made HTML-under-canvas opaque)
- Maxine C glamorous ~30 original face, silver bob, white high-neck, chrome+blue, bright office, NO garbled holo text: PASS (`qa/cameo-maxine-window.jpg`, mid)
- Pricing finale Agency $199 / DIY $49.99 glass cards: PASS (`qa/finale.png`, live HTML)
- CROA-safe / noindex: PASS
- Free tools only (no Meshy/Tripo): PASS
- Deploy scoresos-world-preview only: PASS

## Gaps vs Lusion / wishlist
1. Theatre.js core not wired — camera orbit is hand-rolled; would tighten keyframed flight.
2. Rapier not wired — debris uses spring/repulsion InstancedMesh (works; physics upgrade optional).
3. No GLTF emblem export / gltf-transform yet — procedural SVG extrude is live; Blender apt unavailable (no root).
4. Full-page interactive scroll/debris mp4 for v3g1 not re-captured (headless stuck on Runway video preload; prior interactive-35s.mp4 is pre-Lumea). Parent/desktop subagent should scrub live URL.
5. Magnetic pricing cards still a bit springy (noted v3).

## Credits
- Maxine C pass ~65 (stills+I2V); account remaining ~359. Session well under original 400 cap after prior v3 spends.
- No new Runway this polish.

## Decision
Preview quality OK to show parent/Canvas; do **not** hand to Patrick until parent pass. Live scoresos.com untouched.
