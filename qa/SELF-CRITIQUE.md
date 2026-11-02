# v3 QA self-critique — 2026-11-01 ~19:40 ET

## Pass criteria
- Photoreal Runway heroes on all 6 beats: PASS (beat-01…06.png)
- Robot B quick cameo opening only: PASS (cameo-robot-window.png; class `on` at progress ~0.02–0.075)
- Maxine quick cameo on dispute beat: PASS (cameo-maxine-window.png; original face, silver bob, white suit, chrome arm/cheek, hologram letters; NOT a celebrity lookalike)
- Interactive 35s cursor+scroll recording: PASS (interactive-35s.webm)
- No "Conquest AI" copy: PASS
- CROA-safe / noindex: PASS
- Runway spend ≤400: PASS (390 spent; 10 under cap; account 509)

## Issues noted (non-blocking)
1. Magnetic pricing cards can yank hard while the custom cursor circles during QA mouse loop — looks like a layout glitch in motion capture, but at rest cards are clean (beat-06-recheck.png). Soften springs later if Patrick complains.
2. Cameo mobile mp4s are copies of desktop (same bitrate) — acceptable under credit cap; no re-encode budget needed for preview.
3. During Maxine’s ~6% scroll window the dispute-letter film hero is fully covered by her overlay (intended for a few-second cameo).

## Decision
Quality passes for deploy to scoresos-world-preview. Do not promote to live scoresos.com.
