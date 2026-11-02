

import { useContentStore, type ContentControls } from "./content-store";
import { PanelDivider, PanelShell, Slider } from "./panel-ui";

/**
 * Development-only overlay to position the whole composition (monk + base rock +
 * all the debris rocks + lights) as one unit. Writes to the content store, which
 * ContentGroup applies to its wrapping group each frame. Gated to development in
 * the caller, so it never ships.
 */
export const ContentPanel = () => {
  const store = useContentStore();

  const set =
    <K extends keyof ContentControls>(key: K) =>
    (value: ContentControls[K]) =>
      store.setControls({ [key]: value } as Pick<ContentControls, K>);

  const snippet = `position: [${store.posX.toFixed(2)}, ${store.posY.toFixed(
    2,
  )}, ${store.posZ.toFixed(2)}]  rotationY: ${store.rotationY.toFixed(
    3,
  )}  scale: ${store.scale.toFixed(2)}`;

  return (
    <PanelShell title="Model + rocks">
      <Slider label="pos X" value={store.posX} min={-12} max={12} step={0.05} onChange={set("posX")} />
      <Slider label="pos Y" value={store.posY} min={-12} max={12} step={0.05} onChange={set("posY")} />
      <Slider label="pos Z" value={store.posZ} min={-12} max={12} step={0.05} onChange={set("posZ")} />

      <PanelDivider />

      <Slider label="rot Y" value={store.rotationY} min={-3.14} max={3.14} step={0.01} onChange={set("rotationY")} />
      <Slider label="scale" value={store.scale} min={0.2} max={3} step={0.01} onChange={set("scale")} />

      <PanelDivider />

      <div className="mt-1 flex gap-2">
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
