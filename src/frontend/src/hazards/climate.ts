// ─── Climate hazards ──────────────────────────────────────────────────────────
//
// Two climate-flavoured sources that ride on top of the weather layer:
//
//  1. Extreme heat / cold — derived live from the same Open-Meteo readings the
//     weather overlay already fetches. A city crossing a heat/cold threshold
//     becomes a real hazard event.
//  2. Global-warming & ozone-depletion indicators — curated markers for
//     well-documented, ongoing phenomena that have no single real-time point
//     feed. Clearly labelled as indicators, not moment-to-moment events.

import { type HazardEvent, type Severity, clampSeverity } from "./types";

// Minimal shape of a weather reading (matches the app's WeatherPoint), kept
// local so this module doesn't depend on the globe view.
export interface WeatherLike {
  lat: number;
  lon: number;
  temp: number;
  city: string;
}

const HEAT_THRESHOLD_C = 40;
const COLD_THRESHOLD_C = -20;

function heatSeverity(t: number): Severity {
  return clampSeverity(t >= 48 ? 5 : t >= 45 ? 4 : t >= 42 ? 4 : 3);
}
function coldSeverity(t: number): Severity {
  return clampSeverity(t <= -40 ? 5 : t <= -30 ? 4 : 3);
}

// Turn current weather readings into extreme-heat / extreme-cold hazards.
export function deriveExtremeTemp(
  points: WeatherLike[],
  now = Date.now(),
): HazardEvent[] {
  const out: HazardEvent[] = [];
  for (const p of points) {
    if (typeof p.temp !== "number") continue;
    if (p.temp >= HEAT_THRESHOLD_C) {
      out.push({
        id: `extreme:heat:${p.city}`,
        kind: "extremeHeat",
        lat: p.lat,
        lng: p.lon,
        title: `Extreme heat at ${p.city} (${p.temp.toFixed(0)}°C)`,
        severity: heatSeverity(p.temp),
        magnitude: p.temp,
        magnitudeUnit: "°C",
        source: "Open-Meteo",
        observedAt: now,
      });
    } else if (p.temp <= COLD_THRESHOLD_C) {
      out.push({
        id: `extreme:cold:${p.city}`,
        kind: "extremeCold",
        lat: p.lat,
        lng: p.lon,
        title: `Extreme cold at ${p.city} (${p.temp.toFixed(0)}°C)`,
        severity: coldSeverity(p.temp),
        magnitude: p.temp,
        magnitudeUnit: "°C",
        source: "Open-Meteo",
        observedAt: now,
      });
    }
  }
  return out;
}

// Curated indicators of ongoing global warming and ozone depletion. These are
// documented, persistent phenomena rather than real-time point events — the
// source is marked "INDICATOR" so they're never mistaken for live detections.
interface Indicator {
  kind: "globalWarming" | "ozone";
  lat: number;
  lng: number;
  title: string;
  severity: Severity;
}

const INDICATORS: Indicator[] = [
  // Global warming
  {
    kind: "globalWarming",
    lat: 80,
    lng: 0,
    title: "Arctic amplification — warming ~4× the global rate",
    severity: 5,
  },
  {
    kind: "globalWarming",
    lat: 72,
    lng: -40,
    title: "Greenland ice-sheet mass loss",
    severity: 4,
  },
  {
    kind: "globalWarming",
    lat: -79,
    lng: -110,
    title: "West Antarctic ice-sheet destabilization",
    severity: 4,
  },
  {
    kind: "globalWarming",
    lat: -18.3,
    lng: 147.7,
    title: "Great Barrier Reef — mass coral bleaching",
    severity: 4,
  },
  {
    kind: "globalWarming",
    lat: 67,
    lng: 130,
    title: "Siberian permafrost thaw",
    severity: 3,
  },
  // Ozone depletion
  {
    kind: "ozone",
    lat: -82,
    lng: 0,
    title: "Antarctic ozone hole (seasonal)",
    severity: 4,
  },
  {
    kind: "ozone",
    lat: 88,
    lng: 0,
    title: "Arctic ozone depletion (episodic)",
    severity: 3,
  },
];

export function climateIndicators(now = Date.now()): HazardEvent[] {
  return INDICATORS.map((ind, i) => ({
    id: `indicator:${ind.kind}:${i}`,
    kind: ind.kind,
    lat: ind.lat,
    lng: ind.lng,
    title: ind.title,
    severity: ind.severity,
    source: "INDICATOR",
    observedAt: now,
  }));
}
