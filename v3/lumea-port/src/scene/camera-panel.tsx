

import { useCameraStore, type CameraControls } from "./camera-store";
import { PanelDivider, PanelShell, Slider, Toggle } from "./panel-ui";

/**
 * A development-only overlay to dial in the camera and read its live world
 * coordinates. It writes to the camera store, which the in-canvas CameraRig
 * reads each frame; the live readout reflects the actual position including
 * sway/parallax. Gated to development in the caller, so it never ships.
 */
export const CameraPanel = () => {
  const store = useCameraStore();

  const set =
    <K extends keyof CameraControls>(key: K) =>
    (value: CameraControls[K]) =>
      store.setControls({ [key]: value } as Pick<CameraControls, K>);

  const snippet = `position: [${store.posX.toFixed(2)}, ${store.posY.toFixed(
    2,
  )}, ${store.posZ.toFixed(2)}]  target: [${store.targetX.toFixed(
    2,
  )}, ${store.targetY.toFixed(2)}, ${store.targetZ.toFixed(
    2,
  )}]  fov: ${store.fov.toFixed(0)}  roll: ${store.roll.toFixed(3)}`;

  return (
    <PanelShell title="Camera">
      <div className="mb-1 flex items-center gap-4">
        <Toggle label="auto-orbit" checked={store.autoOrbit} onChange={set("autoOrbit")} />
        <Toggle label="free" checked={store.free} onChange={set("free")} />
      </div>
      <Slider label="orbit spd" value={store.orbitSpeed} min={0} max={0.6} step={0.01} onChange={set("orbitSpeed")} />

      <PanelDivider />

      <Slider label="pos X" value={store.posX} min={-14} max={14} step={0.05} onChange={set("posX")} />
      <Slider label="pos Y" value={store.posY} min={-14} max={14} step={0.05} onChange={set("posY")} />
      <Slider label="pos Z" value={store.posZ} min={-14} max={14} step={0.05} onChange={set("posZ")} />

      <PanelDivider />

      <Slider label="tgt X" value={store.targetX} min={-6} max={6} step={0.05} onChange={set("targetX")} />
      <Slider label="tgt Y" value={store.targetY} min={-6} max={6} step={0.05} onChange={set("targetY")} />
      <Slider label="tgt Z" value={store.targetZ} min={-8} max={8} step={0.05} onChange={set("targetZ")} />

      <PanelDivider />

      <Slider label="fov" value={store.fov} min={15} max={75} step={1} onChange={set("fov")} />
      <Slider label="roll" value={store.roll} min={-0.4} max={0.4} step={0.005} onChange={set("roll")} />

      {store.free && (
        <p className="text-scene-foreground/50">
          drag to orbit · scroll to zoom · values sync below
        </p>
      )}
      <div className="mt-1 flex items-center gap-4">
        <Toggle label="sway" checked={store.sway} onChange={set("sway")} />
        <Toggle label="parallax" checked={store.parallax} onChange={set("parallax")} />
      </div>

      <PanelDivider />

      <div className="flex items-center justify-between text-scene-foreground/60">
        <span>live xyz</span>
        <span className="tabular-nums text-scene-foreground">
          {store.liveX.toFixed(2)}, {store.liveY.toFixed(2)},{" "}
          {store.liveZ.toFixed(2)}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(snippet)}
          className="flex-1 rounded border border-scene-foreground/20 px-2 py-1 transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-scene-foreground/10"
        >
          copy values
        </button>
        <button
          type="button"
          onClick={store.reset}
          className="flex-1 rounded border border-scene-foreground/20 px-2 py-1 transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-scene-foreground/10"
        >
          reset
        </button>
      </div>
    </PanelShell>
  );
};
