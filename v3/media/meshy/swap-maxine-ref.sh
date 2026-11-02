#!/usr/bin/env bash
# Optimize Patrick's ref Meshy and flip MAXINE_GLB_FILE in one shot.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
RAW="$ROOT/v3/media/meshy/maxine-ref-raw.glb"
OUT="$ROOT/v3/media/meshy/maxine-ref.glb"
[[ -f "$RAW" ]] || { echo "missing $RAW"; exit 1; }
npx --yes @gltf-transform/cli@4.1.1 optimize "$RAW" "$OUT" \
  --compress meshopt --meshopt-level high \
  --texture-compress webp --texture-size 2048 \
  --simplify true --simplify-ratio 0.05 --simplify-error 0.02 \
  --weld true --join false --flatten false --instance false --palette false
ls -lah "$OUT"
npx --yes @gltf-transform/cli@4.1.1 inspect "$OUT" | head -40
for dest in \
  "$ROOT/v3/lumea-port/src/scene/assets/characters/maxine-ref.glb" \
  "$ROOT/v3/lumea-port/public/assets/characters/maxine-ref.glb" \
  "$ROOT/v3/hero-r3f/assets/characters/maxine-ref.glb"; do
  cp -f "$OUT" "$dest"
  echo "copied → $dest"
done
# Flip the one path constant
CFG="$ROOT/v3/lumea-port/src/scene/scene-config.ts"
sed -i 's/export const MAXINE_GLB_FILE = "maxine-c.glb"/export const MAXINE_GLB_FILE = "maxine-ref.glb"/' "$CFG"
rg -n 'MAXINE_GLB_FILE' "$CFG"
echo "Next: cd v3/lumea-port && npm run build && commit/push/trigger_deploy"
