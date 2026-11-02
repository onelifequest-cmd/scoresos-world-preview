

import { useState, type ReactNode } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/** Labeled range input with a live numeric readout. */
export const Slider = ({ label, value, min, max, step, onChange }: SliderProps) => (
  <label className="flex items-center gap-2 text-scene-foreground/80">
    <span className="w-14 shrink-0 text-scene-foreground/60">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="min-w-0 flex-1"
      style={{ accentColor: "var(--scene-foreground)" }}
    />
    <output className="w-12 shrink-0 text-right tabular-nums">
      {value.toFixed(2)}
    </output>
  </label>
);

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorInput = ({ label, value, onChange }: ColorInputProps) => (
  <label className="flex items-center gap-2 text-scene-foreground/80">
    <span className="w-14 shrink-0 text-scene-foreground/60">{label}</span>
    <input
      type="color"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-5 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
    />
    <span className="flex-1 text-right tabular-nums text-scene-foreground/50">
      {value}
    </span>
  </label>
);

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle = ({ label, checked, onChange }: ToggleProps) => (
  <label className="flex items-center gap-2 text-scene-foreground/80">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      style={{ accentColor: "var(--scene-foreground)" }}
    />
    {label}
  </label>
);

/** Thin divider between control groups. */
export const PanelDivider = () => (
  <div className="my-1 h-px bg-scene-foreground/10" />
);

interface PanelShellProps {
  title: string;
  children: ReactNode;
}

/** Collapsible panel card, themed with the scene tokens. Positioned by the dock.
    Collapsed by default so the scene loads unobstructed — click "show" to open. */
export const PanelShell = ({ title, children }: PanelShellProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full rounded-lg border border-scene-foreground/15 bg-surface-scene/85 p-3 font-sans text-xs text-scene-foreground shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="font-medium tracking-wide">{title}</span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="text-scene-foreground/60 transition-colors duration-[var(--duration-fast)] ease-entrance hover:text-scene-foreground"
        >
          {open ? "hide" : "show"}
        </button>
      </div>
      {open && <div className="mt-3 flex flex-col gap-1.5">{children}</div>}
    </div>
  );
};
