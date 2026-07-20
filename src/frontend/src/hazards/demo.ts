// ─── Demo / offline seed data ─────────────────────────────────────────────────
//
// A hand-crafted, globally-spread set of realistic hazards used when the app is
// opened with `?demo` (or as a fallback when every live source is unreachable).
// Times are offset back from `now` so the noticing feed looks alive on load.

import type { HazardEvent, HazardKind, Severity } from "./types";

interface Seed {
  kind: HazardKind;
  lat: number;
  lng: number;
  title: string;
  severity: Severity;
  agoMin: number;
  magnitude?: number;
  magnitudeUnit?: string;
}

const SEEDS: Seed[] = [
  // Earthquakes
  {
    kind: "earthquake",
    lat: 38.3,
    lng: 142.4,
    title: "M6.1 off Tōhoku, Japan",
    severity: 5,
    agoMin: 4,
    magnitude: 6.1,
    magnitudeUnit: "Mw",
  },
  {
    kind: "earthquake",
    lat: -33.4,
    lng: -71.9,
    title: "M4.7 off Valparaíso, Chile",
    severity: 3,
    agoMin: 22,
    magnitude: 4.7,
    magnitudeUnit: "Mw",
  },
  {
    kind: "earthquake",
    lat: 37.4,
    lng: -118.4,
    title: "M3.2 Eastern California",
    severity: 2,
    agoMin: 51,
    magnitude: 3.2,
    magnitudeUnit: "Mw",
  },
  // Wildfires
  {
    kind: "wildfire",
    lat: 39.8,
    lng: -121.6,
    title: "Butte County wildfire complex",
    severity: 4,
    agoMin: 9,
    magnitude: 18000,
    magnitudeUnit: "acres",
  },
  {
    kind: "wildfire",
    lat: -33.7,
    lng: 150.3,
    title: "Blue Mountains bushfire, AU",
    severity: 3,
    agoMin: 33,
    magnitude: 4200,
    magnitudeUnit: "acres",
  },
  {
    kind: "wildfire",
    lat: 37.9,
    lng: 23.9,
    title: "Attica fire, Greece",
    severity: 3,
    agoMin: 70,
    magnitude: 1500,
    magnitudeUnit: "acres",
  },
  // Volcanoes
  {
    kind: "volcano",
    lat: 63.9,
    lng: -22.3,
    title: "Reykjanes eruption, Iceland",
    severity: 4,
    agoMin: 6,
    magnitude: 0,
  },
  {
    kind: "volcano",
    lat: -7.5,
    lng: 110.4,
    title: "Mt. Merapi activity, Indonesia",
    severity: 3,
    agoMin: 41,
    magnitude: 0,
  },
  {
    kind: "volcano",
    lat: 19.4,
    lng: -155.3,
    title: "Kīlauea, Hawaiʻi",
    severity: 2,
    agoMin: 88,
    magnitude: 0,
  },
  // Severe storms
  {
    kind: "severeStorm",
    lat: 24.5,
    lng: -74.0,
    title: "Hurricane in the Atlantic",
    severity: 5,
    agoMin: 3,
    magnitude: 105,
    magnitudeUnit: "kts",
  },
  {
    kind: "severeStorm",
    lat: 14.6,
    lng: 130.2,
    title: "Typhoon, W. Pacific",
    severity: 4,
    agoMin: 27,
    magnitude: 90,
    magnitudeUnit: "kts",
  },
  // Floods
  {
    kind: "flood",
    lat: 23.8,
    lng: 90.4,
    title: "Monsoon flooding, Bangladesh",
    severity: 4,
    agoMin: 12,
    magnitude: 0,
  },
  {
    kind: "flood",
    lat: -29.7,
    lng: -51.1,
    title: "Rio Grande do Sul floods, Brazil",
    severity: 3,
    agoMin: 64,
    magnitude: 0,
  },
  // Landslides
  {
    kind: "landslide",
    lat: 27.9,
    lng: 85.4,
    title: "Landslide, central Nepal",
    severity: 3,
    agoMin: 19,
    magnitude: 0,
  },
  {
    kind: "landslide",
    lat: -13.2,
    lng: -72.5,
    title: "Landslide, Cusco region, Peru",
    severity: 2,
    agoMin: 77,
    magnitude: 0,
  },
  // Drought
  {
    kind: "drought",
    lat: 6.0,
    lng: 45.0,
    title: "Drought, Horn of Africa",
    severity: 3,
    agoMin: 55,
    magnitude: 0,
  },
  // Sea / lake ice
  {
    kind: "seaLakeIce",
    lat: 74.0,
    lng: -95.0,
    title: "Sea ice breakup, Canadian Arctic",
    severity: 2,
    agoMin: 96,
    magnitude: 0,
  },
  // Dust / haze
  {
    kind: "dustHaze",
    lat: 21.0,
    lng: 10.0,
    title: "Saharan dust plume",
    severity: 2,
    agoMin: 44,
    magnitude: 0,
  },
  // Extreme heat / cold (normally derived live from weather)
  {
    kind: "extremeHeat",
    lat: 28.6,
    lng: 77.2,
    title: "Extreme heat at Delhi (46°C)",
    severity: 4,
    agoMin: 8,
    magnitude: 46,
    magnitudeUnit: "°C",
  },
  {
    kind: "extremeCold",
    lat: 62.0,
    lng: 129.7,
    title: "Extreme cold at Yakutsk (-38°C)",
    severity: 4,
    agoMin: 35,
    magnitude: -38,
    magnitudeUnit: "°C",
  },
  // Climate indicators
  {
    kind: "globalWarming",
    lat: 80.0,
    lng: 0.0,
    title: "Arctic amplification — warming ~4× global rate",
    severity: 5,
    agoMin: 15,
    magnitude: 0,
  },
  {
    kind: "ozone",
    lat: -82.0,
    lng: 0.0,
    title: "Antarctic ozone hole (seasonal)",
    severity: 4,
    agoMin: 50,
    magnitude: 0,
  },
];

export function seedHazards(now = Date.now()): HazardEvent[] {
  return SEEDS.map((s, i) => ({
    id: `demo:${s.kind}:${i}`,
    kind: s.kind,
    lat: s.lat,
    lng: s.lng,
    title: s.title,
    severity: s.severity,
    magnitude: s.magnitude,
    magnitudeUnit: s.magnitudeUnit,
    source: "DEMO",
    observedAt: now - s.agoMin * 60_000,
  }));
}
