/**
 * Composition flag from ?v=… / ?holo=
 * v3g9 default = floating medallion between Maxine+robot (mode A).
 * Optional hologram (mode B): ?v=v3g9b or ?holo=1.
 */
export type CompositionVariant = "a" | "b";

export function getCompositionVariant(): CompositionVariant {
  if (typeof window === "undefined") return "a";
  const params = new URLSearchParams(window.location.search);
  const v = (params.get("v") || "").toLowerCase();
  const holo = (params.get("holo") || params.get("hologram") || "").toLowerCase();
  if (
    holo === "1" ||
    holo === "true" ||
    holo === "b" ||
    v.endsWith("b") ||
    v.includes("g8b") ||
    v.includes("g9b") ||
    v === "b"
  ) {
    return "b";
  }
  return "a";
}
