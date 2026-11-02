

import { useRingStore, type RingControls } from "./ring-store";
import { ColorInput, PanelDivider, PanelShell, Slider } from "./panel-ui";

/** Development-only overlay to tune the orbit rings' material. */
export const RingPanel = () => {
  const store = useRingStore();

  const set =
    <K extends keyof RingControls>(key: K) =>
    (value: RingControls[K]) =>
      store.setControls({ [key]: value } as Pick<RingControls, K>);

  return (
    <PanelShell title="Rings">
      <ColorInput label="emissive" value={store.emissiveColor} onChange={set("emissiveColor")} />
      <ColorInput label="base" value={store.baseColor} onChange={set("baseColor")} />
      <Slider label="glow" value={store.emissiveIntensity} min={0} max={3} step={0.05} onChange={set("emissiveIntensity")} />
      <Slider label="2nd ring" value={store.secondaryFactor} min={0} max={1} step={0.02} onChange={set("secondaryFactor")} />

      <PanelDivider />

      <button
        type="button"
        onClick={store.reset}
        className="rounded border border-scene-foreground/20 px-2 py-1 transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-scene-foreground/10"
      >
        reset
      </button>
    </PanelShell>
  );
};
