# SELF-CRITIQUE — v3g7

## Ask
Canvas-close fail after Patrick-pass v3g6. Exactly five fixes: credit-score gauge dial (not clock), drop OS, +15–20% medallion, readable tagline + solid-gold CTA, subtle emerald accents. Deploy `?v=v3g7`. QA stills / crop / side-by-side / 12s mp4. Report headline font vs concept-v1.

## What changed (only these)
1. **Dial** — new `dial-face.png`: deep emerald enamel; 270° arc gap-at-bottom; red→gold→emerald gradient (300–850); end labels; needle in upper-right good zone; big cream **742**; small **S** above; **OS dropped**.
2. **Scale** — `EMBLEM.diameter` 0.82 → 0.97 (~18%); `position.y` 0.92 → 1.00 so it still seats on crown without kissing the top halo.
3. **Aside CSS** — tagline 14.5px / `#E8E2D0` / line-height 1.65; CTA solid `#C9A24A` fill, `#141210` text, larger padding + type.
4. **Emerald accents** — bezel emissive rim; pillar emissive; debris glint tint; halo emissive nudged green-gold; soft emerald bounce `pointLight` near medallion/crown.

## Headline font (honest)
- **Hero headline (“Score OS”)** uses **Cormorant Garamond** (serif), not Syne.
- Aside / CTA / body use **Inter**.
- Global `--display` is still Syne (used by pricing/loader/other sections), but the fixed hero stack is **Cormorant Garamond + Inter**.
- Concept-v1 was **Syne + Inter**. So v3g7 hero ≠ concept-v1 display pairing.

## QA evidence
| Artifact | Path | Verdict |
|---|---|---|
| Hero 1280×800 | `v3/qa/hero-v3g7-1280x800.png` | Gauge reads credit-score; CTA solid gold; tagline readable |
| Hero 1440×900 | `v3/qa/hero-v3g7-1440x900.png` | Same |
| Emblem crop | `v3/qa/emblem-crop-v3g7.png` | 742 + S + arc + 300/850; no OS; no halo clip |
| Side-by-side | `v3/qa/v3g7-vs-lumea-sidebyside.png` | Framing still Lumea-class |
| 12s mp4 | `v3/qa/hero-v3g7-12s.mp4` | Regenerated |

## Residual risk / honesty
- 300/850 labels are small on the painted dial — legible in emblem crop, soft at hero distance.
- Needle can wash toward white under bloom/swiftshader; still sits in the good zone.
- Emerald accents are intentionally subtle; if Canvas wants “more green,” bump bounce intensity / bezel emissive next — not done here.
- Medallion +18%: clears top halo in stills; if camera eases in, re-check clearance.

## Out of scope
No other scene/composition changes. No Patrick ping. scoresos.com untouched. noindex kept.
