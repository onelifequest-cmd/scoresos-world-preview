# SELF-CRITIQUE — v3g8a / v3g8b (Maxine + robot billboards)

Date: 2026-11-01 (America/New_York). Local QA against `http://127.0.0.1:8765/qa-hero.html?v=v3g8a|b`. Live: `https://scoresos-world-preview.onrender.com/v3/?v=v3g8a` and `?v=v3g8b`.

## What shipped
- Maxine C (approved face, silver bob, white suit, chrome arm) + robot B as alpha-matted full-body billboards on the Lumea pillar crown, framed by halos / light shaft.
- Variant **A** (`?v=v3g8a`): gold medallion floats just above/between them; needle climbs to **742**.
- Variant **B** (`?v=v3g8b`): robot projects translucent emerald/gold hologram gauge (physical medallion hidden); needle → 742.
- Credit-themed floaters keep replacing rocks; CTA solid `#C9A24A` / `#141210`; tagline 14.5px `#E8E2D0`; short 3D needle (no painted needle through 742).
- Lower-page robot + Maxine cameo beats removed (cameo layer `hidden` / display none) — characters now lead the hero.
- Cutouts: Runway nano-banana-2.1 Maxine full-body (~4 cr) + birefnet robot matte (~1 cr) + local rembg; **~5 credits** (under 30). Meshy deferred.

## Fix that mattered
First QA stills showed an empty pillar — billboards used `FrontSide` with yaw clamped to ±0.55 around **0**, while the Lumea camera sits in content-local **+X/−Z**. Planes faced away and were culled. Fixed: base yaw ≈ π (face −Z), clamp parallax around that, `DoubleSide` safety, slightly larger / forward placement, stronger rim + contact shadow.

## Integration — pasted vs present
**Honest read: billboards, not yet “in the world.”**

What works:
- Rim from the shaft + emerald bounce + soft contact shadows do ground the feet/thighs on the crown.
- Grade (`#e8ece8` + emerald emissive) keeps white suit / chrome from reading pure studio white against the void.
- Halos + shaft framing sell the “standing in the light” beat; gauge (A) or holo (B) gives a clear focal point between/near them.
- Parallax clamp keeps a readable ¾ without spinning like cardboard.

What still reads pasted:
- They are flat planes. Orbit/sway reveals the lack of volume; no foot contact deformation, no self-shadow from the dial onto faces.
- Maxine’s white suit still blooms under the key — silhouette softens vs the robot’s darker metal.
- Robot B cutout is **thighs-up**, not true full-body; seating the bottom on the crown reads slightly “sunk” / truncated.
- Holo (B) is a translucent dial near the robot with a soft cone — readable as projection, but not a volumetric HUD cast from the palm.
- Credit icons are clearer thematically than rocks, but still sparse at mid-frame vs Lumea’s edge debris density.

Verdict: **good enough for Patrick’s A/B gauge choice; not final.** Meshy (or posed full-body robot + better lighting match) is the right next upgrade if he picks a winner.

## QA artifacts
- `hero-v3g8a-1280x800.png`, `hero-v3g8a-1440x900.png`, `chars-emblem-crop-v3g8a.png`, `v3g8a-vs-lumea-sidebyside.png`, `hero-v3g8a-12s.mp4`
- same set for `v3g8b`
- Deploy scoresos-world-preview only: PASS intent (scoresos.com untouched)
- CROA / noindex / no Conquest AI wording: PASS

## Prefer
- If one ships: lean **A** for readable gold jewelry focal point; **B** if he wants the robot to “own” the score reveal.
