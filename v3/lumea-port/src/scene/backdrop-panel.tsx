

import { useBackdropStore, type BackdropControls } from "./backdrop-store";
import { useRaysStore, type RaysControls } from "./rays-store";
import { usePostStore } from "./post-store";
import { ColorInput, PanelDivider, PanelShell, Slider } from "./panel-ui";

/** Development-only overlay to tune the backdrop, light beam, and film grain. */
export const BackdropPanel = () => {
  const store = useBackdropStore();
  const rays = useRaysStore();
  const grain = usePostStore((state) => state.grain);
  const setGrain = usePostStore((state) => state.setGrain);
  const resetPost = usePostStore((state) => state.reset);

  const set =
    <K extends keyof BackdropControls>(key: K) =>
    (value: BackdropControls[K]) =>
      store.setControls({ [key]: value } as Pick<BackdropControls, K>);

  const setRay =
    <K extends keyof RaysControls>(key: K) =>
    (value: RaysControls[K]) =>
      rays.setControls({ [key]: value } as Pick<RaysControls, K>);

  return (
    <PanelShell title="Background">
      <ColorInput label="top" value={store.topColor} onChange={set("topColor")} />
      <ColorInput label="bottom" value={store.bottomColor} onChange={set("bottomColor")} />
      <ColorInput label="glow" value={store.glowColor} onChange={set("glowColor")} />
      <Slider label="glow amt" value={store.glowStrength} min={0} max={2} step={0.02} onChange={set("glowStrength")} />
      <Slider label="glow Y" value={store.glowY} min={-1} max={1} step={0.02} onChange={set("glowY")} />
      <Slider label="glow Z" value={store.glowZ} min={-1} max={1} step={0.02} onChange={set("glowZ")} />
      <Slider label="sharp" value={store.glowSharpness} min={1} max={16} step={0.1} onChange={set("glowSharpness")} />

      <PanelDivider />

      <ColorInput label="beam" value={rays.color} onChange={setRay("color")} />
      <Slider label="beam amt" value={rays.opacity} min={0} max={1} step={0.01} onChange={setRay("opacity")} />

      <PanelDivider />

      <Slider label="grain" value={grain} min={0} max={0.3} step={0.005} onChange={setGrain} />

      <PanelDivider />

      <button
        type="button"
        onClick={() => {
          store.reset();
          rays.reset();
          resetPost();
        }}
        className="rounded border border-scene-foreground/20 px-2 py-1 transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-scene-foreground/10"
      >
        reset
      </button>
    </PanelShell>
  );
};
