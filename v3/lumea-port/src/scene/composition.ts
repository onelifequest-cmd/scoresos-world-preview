/**
 * Composition flag from ?v=… — v3g8a = floating medallion between Maxine+robot;
 * v3g8b = robot projects hologram gauge. Defaults to "a".
 */
export type CompositionVariant = "a" | "b";

export function getCompositionVariant(): CompositionVariant {
  if (typeof window === "undefined") return "a";
  const v = (new URLSearchParams(window.location.search).get("v") || "").toLowerCase();
  if (v.endsWith("b") || v.includes("g8b") || v === "b") return "b";
  return "a";
}
