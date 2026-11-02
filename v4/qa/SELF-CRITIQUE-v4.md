# SELF-CRITIQUE — Scores OS penthouse hero v4f

**URL:** https://scoresos-world-preview.onrender.com/v4/?v=v4f  
**Cache:** `styles.css?v=v4f` / `hero.js?v=v4f`  
**Date:** 2026-11-02 (America/New_York)

## Change
v4e size kept. Three nits:
1. Funding Approved was side-clipped (`nding Approv`) — new portrait plate (~461×800) + `object-fit: contain` so title + amount sit fully inside the cell with padding; funding `.cap` hidden (text baked in plate).
2. World Is Yours looked washed — brightened source + `.tile.on { opacity: 1 !important }` + post-reveal img saturate/contrast; world tile gets a stronger filter. QA stills taken after ≥6.5s so every reveal has finished.
3. Score tile settles on **742** (tick + 2s hard snap).

**No Runway spend.**

## Settled QA (Playwright, wait ≥6.5s)
| Check | Result |
|---|---|
| `#score-num` | `742` |
| all six `.tile` opacity | `1` |
| Funding title | full "Funding Approved" + amount visible in `_funding-tile.png` |
| World tile | full opacity / not washed in `_wall-crop.png` |

## QA files
`hero-1440x900.png`, `hero-1280x800.png`, `hero-390x844.png`, `_wall-crop.png`, `_funding-tile.png`, `hero-12s.mp4`

## Credits
Runway: **0** (balance still 249)
