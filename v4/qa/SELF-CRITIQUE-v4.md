# SELF-CRITIQUE — Scores OS homepage hero v4 (penthouse)

Date: 2026-11-02 (America/New_York)
Live: https://scoresos-world-preview.onrender.com/v4/?v=v4a2
Commits: b3a50d9 (v4 ship), 8ef10e0 (v4a2 wall seating)
Deploys: dep-dbk3fjutlv9c73entmqg → dep-dbk3groae00c73fnq6v0 (live)
Runway: gen-4-turbo I2V 10s · **50 credits** (349→299) · under 60 cap · no re-roll

## Verdict (brutally honest)

**Directionally right. Not yet “real filmed luxury ad” grade.**

Patrick rejected Lumea for looking fake / video-gamey / dark / empty. This build fixes those three: it is bright, the penthouse + skyline lead, Maxine/robot are a small cameo, and the goals wall is the product story. Compared to v3’s 3D pillar world, this feels closer to a lifestyle still from a brand film.

It still does **not** fully clear the “looks REAL” bar on close inspection.

## What works

- **Lifestyle first.** Infinity pool, river, golden-hour skyline, marble + brushed gold read premium. The view is open; screens sit on the left wall as requested.
- **Cameo scale.** Maxine + robot are mid-ground backs-to-camera, not the whole hero. Correct call after Patrick said he didn’t want it revolving around them.
- **CROA-safe.** Every tile has a Demo label; copy says illustrative / not guarantees; no bureau logos; Scores OS spelling; Syne headline; gold CTA; white mark.
- **Live layer behavior.** Staggered tile reveal, 612→742 tick, +N chips, cursor tilt/glow, scroll push-in, reduced-motion + mobile carousel. Loader fails open.
- **Media budget.** Plate + tiles via free GenerateImage; one 10s Runway take; ping-pong loop ~1.1MB mp4 + 0.86MB webm; poster jpg.

## What still looks fake / off

1. **AI film, not a camera.** gen-4-turbo keeps the plate mostly stable, but micro-morph on marble veins / pool edge / character silhouette is visible if you stare. A DP would call it “almost.” Patrick will feel it if he scrub-watches.
2. **Goals tiles ≠ mounted glass.** Even after v4a2 (softer rotateY, tighter slots), the six tiles still read a bit like HUD cards floating in front of the marble rather than recessed frameless screens filling the plate’s glowing slots. Empty slot outlines from the plate peek around edges on some angles.
3. **Maxine hair under golden hour.** Silver bob reads platinum/blonde in this light. Face is the approved non-lookalike, but hair color drifts from the white-suit reference.
4. **Score tile double messaging.** Tile art already paints “742 / climb”; our live overlay also paints a big number. Fine for demo, slightly busy.
5. **Headline over sky.** Syne lockup sits on the right sky as planned, but it competes with the sunset flare — premium, yet a bit “UI slapped on a stock plate.”
6. **No real motion on wins.** Jet/family tiles are stills (budget reserved for hero loop only). Live tick + chips do the motion job, but the jet doesn’t actually take off on the wall.
7. **Mobile.** Poster + copy work; wall is hidden (correct). Carousel below is serviceable, not cinematic.

## Real vs premium scorecard

| Criterion | Score (1–5) | Note |
|---|---|---|
| Bright / not dark | 5 | Golden hour, open view |
| Lifestyle > characters | 4 | Cameo correct; still a little “AI pair” |
| Photoreal / filmed | 3 | Good still; video barely holds |
| Premium (not graphic design) | 4 | Materials land; tiles slightly HUD |
| Not video-gamey | 4 | Clear win vs Lumea |
| Product story (wins wall) | 4 | Concept is the strongest part |

**Ship recommendation:** Show Patrick this URL now as the new direction. Do **not** polish more 3D. Next upgrades if he likes it: (a) one higher-tier I2V or a real locked-off plate plate with real light wraps, (b) hand-fit CSS matrix / three.js plane to the six recesses per frame, (c) optional short Runway loops only on jet + family within leftover credits.

## QA artifacts

- `v4/qa/hero-1440x900.png`
- `v4/qa/hero-1280x800.png`
- `v4/qa/hero-390x844.png`
- `v4/qa/hero-12s.mp4` (tile reveal + score tick + cursor sweep)
- `v4/qa/_wall-crop.png` (alignment inspect)

## Non-goals respected

- No touch to scoresos.com / DNS
- Preview-only noindex
- Never mentioned Conquest AI
- Runway ≤60 (spent 50)
