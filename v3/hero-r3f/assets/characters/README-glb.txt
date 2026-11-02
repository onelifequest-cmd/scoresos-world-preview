Character hero slots (billboard PNG + Meshy GLB).

Swap Maxine in ONE place: scene-config.ts → MAXINE_GLB_FILE
  - "maxine-c.glb"     placeholder (current)
  - "maxine-ref.glb"   Patrick ref face (from v3/media/meshy/maxine-ref-raw.glb)

Robot: ROBOT_GLB_FILE = "robot-b.glb" (final for v3g9).

Pipeline for a new raw:
  gltf-transform optimize *-raw.glb <name>.glb (weld/simplify/webp/meshopt)
  cp to this folder + public/assets/characters/ + rebuild
  raws are gitignored (v3/media/meshy/*-raw.glb)

Face policy: Maxine face must match refs/maxine-ref.png — do not retexture/swap faces.
