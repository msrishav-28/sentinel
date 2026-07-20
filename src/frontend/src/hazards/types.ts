// ─── Unified hazard model ─────────────────────────────────────────────────────
//
// Sentinel monitors many kinds of natural disaster from several live sources
// (USGS, NASA EONET, …). Rather than carry a bespoke shape per source, every
// adapter normalizes into a single `HazardEvent`. The globe, the source
// adapters, and the noticing engine all speak this one shape.

// The kinds of natural hazard Sentinel tracks. Structured as a string union so
// new kinds can be appended without touching the engine.
export type HazardKind =
  | "earthquake"
  | "wildfire"
  | "volcano"
  | "severeStorm"
  | "flood"
  | "landslide"
  | "drought"
  | "seaLakeIce"
  | "dustHaze"
  | "extremeHeat"
  | "extremeCold"
  | "globalWarming"
  | "ozone";

// Severity is a 1..5 weighting, low → critical, shared across all kinds so the
// feed, the proactive surfacing, and the marker sizing can rank uniformly.
export type Severity = 1 | 2 | 3 | 4 | 5;

// A single normalized hazard observation.
export interface HazardEvent {
  // Stable id, source-prefixed (e.g. "usgs:nc73872510"). Stable across polls so
  // the noticing engine can diff the same physical event between fetches.
  id: string;
  kind: HazardKind;
  lat: number;
  lng: number;
  title: string;
  severity: Severity;
  // Native magnitude in the source's own unit (Richter, brightness K, wind kts,
  // area ha, …). Optional because not every source reports one.
  magnitude?: number;
  magnitudeUnit?: string;
  source: string; // "USGS" | "EONET" | "Open-Meteo" | …
  observedAt: number; // epoch milliseconds
  url?: string; // canonical link to the source record, when available
}

// Presentation + weighting metadata per kind. Colors follow the tactical
// palette (fire red-orange, water blues, earth browns) so the globe reads at a
// glance. `defaultSeverity` is the floor used when a source gives no magnitude.
export interface KindMeta {
  label: string;
  glyph: string;
  color: string;
  defaultSeverity: Severity;
}

export const KIND_META: Record<HazardKind, KindMeta> = {
  earthquake: {
    label: "EARTHQUAKE",
    glyph: "⊕",
    color: "#ff4400",
    defaultSeverity: 2,
  },
  wildfire: {
    label: "WILDFIRE",
    glyph: "🔥",
    color: "#ff5a1f",
    defaultSeverity: 3,
  },
  volcano: {
    label: "VOLCANO",
    glyph: "🌋",
    color: "#ff2d55",
    defaultSeverity: 3,
  },
  severeStorm: {
    label: "SEVERE STORM",
    glyph: "🌀",
    color: "#4aa8ff",
    defaultSeverity: 3,
  },
  flood: { label: "FLOOD", glyph: "🌊", color: "#2f9be0", defaultSeverity: 3 },
  landslide: {
    label: "LANDSLIDE",
    glyph: "⛰",
    color: "#b5651d",
    defaultSeverity: 3,
  },
  drought: {
    label: "DROUGHT",
    glyph: "☀",
    color: "#d9a441",
    defaultSeverity: 2,
  },
  seaLakeIce: {
    label: "SEA/LAKE ICE",
    glyph: "❄",
    color: "#9fd8ff",
    defaultSeverity: 2,
  },
  dustHaze: {
    label: "DUST/HAZE",
    glyph: "≋",
    color: "#c9a06a",
    defaultSeverity: 2,
  },
  extremeHeat: {
    label: "EXTREME HEAT",
    glyph: "♨",
    color: "#ff4d2e",
    defaultSeverity: 3,
  },
  extremeCold: {
    label: "EXTREME COLD",
    glyph: "❆",
    color: "#66d0ff",
    defaultSeverity: 3,
  },
  globalWarming: {
    label: "GLOBAL WARMING",
    glyph: "🌡",
    color: "#ff8a3d",
    defaultSeverity: 3,
  },
  ozone: {
    label: "OZONE DEPLETION",
    glyph: "◍",
    color: "#b892ff",
    defaultSeverity: 3,
  },
};

// Ordered list of the kinds, for stable iteration (sidebar toggles, legends).
export const HAZARD_KINDS: HazardKind[] = [
  "earthquake",
  "wildfire",
  "volcano",
  "severeStorm",
  "flood",
  "landslide",
  "drought",
  "seaLakeIce",
  "dustHaze",
  "extremeHeat",
  "extremeCold",
  "globalWarming",
  "ozone",
];

// Severity colour ramp (cyan → amber → red) matching the HUD aesthetic.
const SEVERITY_COLORS: Record<Severity, string> = {
  1: "#7fd4d4",
  2: "#ffd166",
  3: "#ff9f45",
  4: "#ff6b35",
  5: "#ff3b3b",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  1: "LOW",
  2: "MODERATE",
  3: "HIGH",
  4: "SEVERE",
  5: "CRITICAL",
};

export function severityColor(s: Severity): string {
  return SEVERITY_COLORS[s];
}

export function severityLabel(s: Severity): string {
  return SEVERITY_LABELS[s];
}

// Clamp an arbitrary number into the 1..5 severity band.
export function clampSeverity(n: number): Severity {
  const r = Math.round(n);
  if (r <= 1) return 1;
  if (r >= 5) return 5;
  return r as Severity;
}
