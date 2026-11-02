# v3g9 self-critique (Maxine ref + vendors + brand)

**Grade: B** — shippable preview; not Lumea-class yet.

Date: 2026-11-02 ~00:42 America/New_York.  
Live: `https://scoresos-world-preview.onrender.com/v3/?v=v3g9` (noindex).  
Commit `f6de4d2` · deploy `dep-dbk1vl142hec73ed42dg` · scoresos-world-preview only · scoresos.com untouched.

## What landed
- **Maxine ref** `maxine-ref.glb`: 1.2 MB, **91,558 tris**, meshopt + webp 2K from `maxine-ref-raw.glb` (21 MB / 508k) via `swap-maxine-ref.sh --simplify-ratio 0.18`. Face/textures unaltered (no retexture). `MAXINE_GLB_FILE = "maxine-ref.glb"`.
- **Robot** `robot-b.glb`: 2.0 MB / ~102k tris (unchanged).
- **Vendor 404s fixed**: real files for `gsap` / `ScrollTrigger` / `lenis` / `three` (no broken symlinks). Live curl all **200**. `main.js` guards so missing gsap cannot block loader.
- **Loader really completes**: live QA waited on `#loader.done` naturally (pct 100%, no forced `.done`). Vendor 404 list empty.
- **Brand (Patrick)**: "Scores OS" in title/meta/nav/loader/headline/legal; character nav label **Maxine**; headline **Syne** 800 / −0.03em (Inter body); white monochrome mark `logo-white.svg` (tinted from existing logo asset, not a redesign) on dark nav.
- Framing ~45–55% pair height on pedestal in shaft; neutral key + emerald rim present; credit floaters (chips / $ / houses) readable at edges; 742 gauge between them when climb settles.

## Honest problems
1. **Maxine white suit blooms out** under shaft + bloom — high-key white fabric loses fold detail; chrome arm still reads, face is ok but overall she looks "lit for product" not "lit for film."
2. **742 is easy to miss in stills.** Live stills often catch mid-climb (**580 DEMO SCORE** on the pedestal face) or the halo/bloom eats the dial numeral. Need a longer settle or a clearer dial treatment so 742 wins the glance test.
3. **vs Lumea (side-by-side):** Lumea has denser debris poetry, stronger single-hero silhouette, and cleaner light falloff. Our pair + UI chrome (preview ribbon, nav, dual CTAs, Syne lockup) crowd the frame; floaters are identifiable but sparse.
4. **White logo still reads "SCORE OS" inside the mark** (tint-only, per brief — not a redraw). Wordmark next to it correctly says Scores OS; the crest glyph is behind.
5. **Syne at display size** is legible but slightly blocky vs Cormorant’s editorial calm; tracking is tuned (−0.03em) — still competes with the 3D for attention on the left third.
6. **Swiftshader QA** understates real-GPU specular; chrome/robot look flatter here than on a real device.
7. Local 12s capture was slow (soft-raster); live 12s is 60 frames @ 5fps — fine for motion proof, not for polish review of sway.

## Pass / fail vs brief
| Check | Result |
|---|---|
| Maxine ref face, no retexture, <5 MB, ~80–100k tris | PASS (91.5k / 1.2 MB) |
| Vendor 404s fixed; loader finishes alone | PASS |
| Framing 45–55%, pedestal, shaft, emerald rim, floaters | PASS (with bloom caveat) |
| 742 clear of halo | MIXED — composition ok, still timing/bloom hurt |
| Deploy preview only `?v=v3g9` noindex | PASS |
| Scores OS / Maxine / Syne / white mark | PASS |

## QA artifacts
- `v3/qa/hero-v3g9-live-1280x800.png` (1.2 MB)
- `v3/qa/hero-v3g9-live-1440x900.png` (1.5 MB)
- `v3/qa/chars-crop-v3g9-live.png` (653 KB)
- `v3/qa/v3g9-vs-lumea-sidebyside-live.png` (576 KB)
- `v3/qa/hero-v3g9-live-12s.mp4` (5.5 MB)
- Mirrors: `hero-v3g9-1280x800.png`, `hero-v3g9-1440x900.png`, `chars-crop-v3g9.png`, `v3g9-vs-lumea-sidebyside.png`, `hero-v3g9-12s.mp4`

## Next (if Patrick wants another pass)
- Pull Maxine suit exposure down (or bloom threshold up) so white satin holds detail.
- Force still capture after `restScore` settle; consider hiding the pedestal "DEMO SCORE 580" once climb completes.
- Optional: redraw crest word to "SCORES" only if he wants the mark itself updated (out of tint-only scope).
