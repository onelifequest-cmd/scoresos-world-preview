

import { BackdropPanel } from "./backdrop-panel";
import { CameraPanel } from "./camera-panel";
import { ContentPanel } from "./content-panel";
import { DebrisPanel } from "./debris-panel";
import { RingPanel } from "./ring-panel";

const columnClass =
  "pointer-events-auto fixed top-4 z-50 flex max-h-[calc(100vh-2rem)] w-64 flex-col gap-3 overflow-y-auto";

/**
 * Dev-only dock: two fixed, scrollable columns of tuning panels. Rendered only
 * in development by the hero, and dynamically imported so it never ships.
 */
export const DevPanels = () => (
  <>
    <div className={`${columnClass} left-4`}>
      <ContentPanel />
      <RingPanel />
    </div>
    <div className={`${columnClass} right-4`}>
      <CameraPanel />
      <BackdropPanel />
      <DebrisPanel />
    </div>
  </>
);
