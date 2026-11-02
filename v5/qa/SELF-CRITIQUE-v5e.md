# v5e self-critique — pixel-checked (America/New_York 2026-11-02)

URL: `https://scoresos-world-preview.onrender.com/v5/?v=v5e` (preview only, noindex)
Runway spend: **0** (balance remains 49). v5d archived at `v5/archive/v5d/`. /v4/ untouched.

## Concrete pixel checks

### 1440×900 settle (`v5e-1440-settle.jpg` + `v5e-crop-wall.jpg`)
| Check | Value | Result |
|---|---|---|
| Copy box | x=51–351, y=492–842 (w300) | lower-left |
| Wall box | x=36–622, y=118–354 | upper-left |
| Gap wall→copy | **138px** | clear |
| Copy right edge vs Maxine | copy r=351; Maxine ~mid | no overlap |
| Robot | plate-right / window; body clear of copy | **no copy/robot overlap** |
| Tile ARs (main+mini) | 1.735 / 1.709 / 1.684 / 1.734 / 1.708 / 1.683 | wider-than-tall (~16:9 − rotateY 8°) |
| Tiles `.on` opacity | 1 | visible glass |
| Funding Approved | text exact, 12px, sw=cw=201, **fits** | no clip |
| Marble through glass | img opacity .42 + glass gradient | veining visible in wall crop |
| Beam | `.on`, path robot hand → score | visible cyan-gold |
| Score at settle | climbing ~730→742 | beam-land sync |

### 1280×800 settle (`v5e-1280-settle.jpg`)
| Check | Value | Result |
|---|---|---|
| Copy | x=40–330, y=415 | lower-left |
| Gap wall→copy | **109px** | clear |
| Tile ARs | 1.739 / 1.716 / 1.693 … | landscape |
| Funding | 11px, sw=cw=174, **fits** | no clip |
| Beam / tiles on | true | pass |

### Mid-reveal (`v5e-mid-reveal-flyin.jpg`, t≈6.0–6.7)
- Same copy geometry (x51–351, y492). Wall revealed, beam on, score climbing (~699). Funding fits. No copy/robot/Maxine overlap.

### 390×844 (`v5e-390-settle.jpg` / `v5e-390-viewport.jpg`)
| Check | Value | Result |
|---|---|---|
| Landscape loop | `display:none` | hidden |
| Poster | 390×464 (~55vh), sharp crop of robot+Maxine | **no blurry upscale** |
| Copy | below poster on warm scrim | legs do not enter eyebrow |
| Carousel cards | 277×156 **AR 1.778 exact 16:9** | under CTA |
| Funding card | text fits fully in card | pass |

### 12s clip (`v5e-hero-12s.mp4`)
- 1280×720 recording through reveal→beam→score. Copy stays lower-left; robot stays right; screens reveal and stay clear of copy.

## Fix checklist vs Canvas fails on v5d
1. Copy lower-left below screens, left of Maxine; robot right clear — **PASS**
2. Three real 16:9 glass screens + mini row; Funding one full line; marble through; cyan-gold edge + spill; Demo labels — **PASS**
3. Holo beam robot→score + tablet swipe pulse; score climb on beam land; 0 Runway — **PASS**
4. Mobile sharp poster crop + copy below + 16:9 rail — **PASS**

Brightness / nav / disclaimer / CROA kept from v5c lineage.
