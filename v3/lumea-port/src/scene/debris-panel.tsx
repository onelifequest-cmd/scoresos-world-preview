

import { useDebrisStore, type DebrisControls } from "./debris-store";
import { useDispersionStore, type DispersionControls } from "./dispersion-store";
import { ColorInput, PanelDivider, PanelShell, Slider } from "./panel-ui";

/** Development-only overlay: rock motion (repel + spin) and dispersion colours. */
export const DebrisPanel = () => {
  const store = useDebrisStore();
  const dispersion = useDispersionStore();

  const set =
    <K extends keyof DebrisControls>(key: K) =>
    (value: DebrisControls[K]) =>
      store.setControls({ [key]: value } as Pick<DebrisControls, K>);

  const setDispersion =
    <K extends keyof DispersionControls>(key: K) =>
    (value: DispersionControls[K]) =>
      dispersion.setControls({ [key]: value } as Pick<DispersionControls, K>);

  return (
    <PanelShell title="Rocks">
      <Slider label="repel radius" value={store.repelRadius} min={0} max={8} step={0.1} onChange={set("repelRadius")} />
      <Slider label="repel force" value={store.repelStrength} min={0} max={8} step={0.1} onChange={set("repelStrength")} />
      <Slider label="drift spd" value={store.drift} min={-0.15} max={0.15} step={0.005} onChange={set("drift")} />
      <Slider label="spin" value={store.spin} min={0} max={4} step={0.05} onChange={set("spin")} />

      <PanelDivider />

      <ColorInput label="disp A" value={dispersion.colorA} onChange={setDispersion("colorA")} />
      <ColorInput label="disp B" value={dispersion.colorB} onChange={setDispersion("colorB")} />
      <Slider label="disp amt" value={dispersion.strength} min={0} max={0.06} step={0.001} onChange={setDispersion("strength")} />

      <PanelDivider />

      <button
        type="button"
        onClick={() => {
          store.reset();
          dispersion.reset();
        }}
        className="rounded border border-scene-foreground/20 px-2 py-1 transition-colors duration-[var(--duration-fast)] ease-entrance hover:bg-scene-foreground/10"
      >
        reset
      </button>
    </PanelShell>
  );
};
