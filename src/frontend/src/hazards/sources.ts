// ─── Live hazard source adapters ──────────────────────────────────────────────
//
// Each adapter fetches a real, free, browser-reachable API and normalizes it
// into HazardEvent[]. Adapters are defensive: a network error or a malformed
// record yields an empty list / skipped row, never a throw, so one dead source
// can never take down the globe.
//
// Sources:
//   • USGS Earthquake feeds  — earthquakes (GeoJSON, no key, CORS)
//   • NASA EONET v3          — wildfires, volcanoes, storms, floods, landslides,
//                              drought, sea/lake ice, dust/haze (JSON, no key)
//
// Both report coordinates in GeoJSON order: [longitude, latitude].

import {
  type HazardEvent,
  type HazardKind,
  KIND_META,
  type Severity,
  clampSeverity,
} from "./types";

// ── USGS earthquakes ──────────────────────────────────────────────────────────

const USGS_ALL_DAY =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

interface UsgsFeature {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number | null;
    url?: string | null;
  };
  geometry?: { coordinates?: number[] | null } | null;
}

interface UsgsResponse {
  features?: UsgsFeature[];
}

// Richter magnitude → 1..5 severity band.
function quakeSeverity(mag: number): Severity {
  if (mag >= 6) return 5;
  if (mag >= 5) return 4;
  if (mag >= 4) return 3;
  if (mag >= 2.5) return 2;
  return 1;
}

export async function fetchEarthquakes(): Promise<HazardEvent[]> {
  try {
    const res = await fetch(USGS_ALL_DAY);
    if (!res.ok) return [];
    const data = (await res.json()) as UsgsResponse;
    const out: HazardEvent[] = [];
    for (const f of data.features ?? []) {
      const coords = f.geometry?.coordinates;
      const mag = f.properties?.mag;
      if (!coords || coords.length < 2 || typeof mag !== "number") continue;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      out.push({
        id: `usgs:${f.id ?? `${lat},${lng},${f.properties?.time ?? 0}`}`,
        kind: "earthquake",
        lat,
        lng,
        title: f.properties?.place ?? `M${mag.toFixed(1)} earthquake`,
        severity: quakeSeverity(mag),
        magnitude: mag,
        magnitudeUnit: "Mw",
        source: "USGS",
        observedAt: f.properties?.time ?? Date.now(),
        url: f.properties?.url ?? undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── NASA EONET (multi-hazard) ─────────────────────────────────────────────────

const EONET_EVENTS =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=20";

interface EonetGeometry {
  magnitudeValue?: number | null;
  magnitudeUnit?: string | null;
  date?: string | null;
  type?: string | null;
  coordinates?: unknown;
}

interface EonetEvent {
  id?: string;
  title?: string;
  link?: string;
  categories?: Array<{ id?: string; title?: string }>;
  sources?: Array<{ url?: string }>;
  geometry?: EonetGeometry[];
}

interface EonetResponse {
  events?: EonetEvent[];
}

// Map an EONET category id to a Sentinel HazardKind. Categories Sentinel does
// not surface (manmade, water colour, snow, temperature extremes) return null
// and are skipped — we track natural disasters, not every catalogued event.
function eonetCategoryToKind(categoryId: string): HazardKind | null {
  switch (categoryId) {
    case "wildfires":
      return "wildfire";
    case "volcanoes":
      return "volcano";
    case "severeStorms":
      return "severeStorm";
    case "floods":
      return "flood";
    case "landslides":
      return "landslide";
    case "drought":
      return "drought";
    case "seaLakeIce":
      return "seaLakeIce";
    case "dustHaze":
      return "dustHaze";
    case "earthquakes":
      return "earthquake";
    default:
      return null;
  }
}

// Reduce an EONET geometry `coordinates` (Point → [lon,lat]; Polygon → ring of
// [lon,lat]) to a single representative [lat, lng]. Returns null if unusable.
function eonetPoint(geom: EonetGeometry): { lat: number; lng: number } | null {
  const c = geom.coordinates;
  if (!Array.isArray(c)) return null;
  // Point: [lon, lat]
  if (typeof c[0] === "number" && typeof c[1] === "number") {
    return { lng: c[0], lat: c[1] };
  }
  // Polygon: [[[lon,lat], …]] → centroid of the first ring.
  const ring = (c as unknown[])[0];
  if (Array.isArray(ring) && ring.length > 0) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const p of ring as unknown[]) {
      if (
        Array.isArray(p) &&
        typeof p[0] === "number" &&
        typeof p[1] === "number"
      ) {
        sx += p[0];
        sy += p[1];
        n++;
      }
    }
    if (n > 0) return { lng: sx / n, lat: sy / n };
  }
  return null;
}

// Best-effort per-kind severity from EONET's magnitude, falling back to the
// kind's default floor when no usable magnitude is present.
function eonetSeverity(
  kind: HazardKind,
  mag: number | null | undefined,
  unit: string | null | undefined,
): Severity {
  const base = KIND_META[kind].defaultSeverity;
  if (typeof mag !== "number" || Number.isNaN(mag)) return base;
  const u = (unit ?? "").toLowerCase();
  if (kind === "wildfire") {
    // Fire radiative power (MW) or acres — larger = worse.
    if (u.includes("acre"))
      return clampSeverity(
        mag >= 50000 ? 5 : mag >= 10000 ? 4 : mag >= 1000 ? 3 : 2,
      );
    if (u.includes("mw"))
      return clampSeverity(
        mag >= 1000 ? 5 : mag >= 300 ? 4 : mag >= 100 ? 3 : 2,
      );
  }
  if (kind === "severeStorm") {
    // Wind in knots (Saffir–Simpson-ish) or central pressure in mb.
    if (u.includes("kts") || u.includes("knot"))
      return clampSeverity(mag >= 113 ? 5 : mag >= 96 ? 4 : mag >= 64 ? 3 : 2);
    if (u.includes("mb"))
      return clampSeverity(
        mag <= 940 ? 5 : mag <= 965 ? 4 : mag <= 990 ? 3 : 2,
      );
  }
  return base;
}

export async function fetchEonetHazards(): Promise<HazardEvent[]> {
  try {
    const res = await fetch(EONET_EVENTS);
    if (!res.ok) return [];
    const data = (await res.json()) as EonetResponse;
    const out: HazardEvent[] = [];
    for (const ev of data.events ?? []) {
      const categoryId = ev.categories?.[0]?.id;
      if (!categoryId) continue;
      const kind = eonetCategoryToKind(categoryId);
      if (!kind) continue;
      const geoms = ev.geometry ?? [];
      if (geoms.length === 0) continue;
      // Most recent geometry = current position of the event.
      const geom = geoms[geoms.length - 1];
      const point = eonetPoint(geom);
      if (!point) continue;
      const observedAt = geom.date ? Date.parse(geom.date) : Date.now();
      out.push({
        id: `eonet:${ev.id ?? `${point.lat},${point.lng}`}`,
        kind,
        lat: point.lat,
        lng: point.lng,
        title: ev.title ?? KIND_META[kind].label,
        severity: eonetSeverity(kind, geom.magnitudeValue, geom.magnitudeUnit),
        magnitude:
          typeof geom.magnitudeValue === "number"
            ? geom.magnitudeValue
            : undefined,
        magnitudeUnit: geom.magnitudeUnit ?? undefined,
        source: "EONET",
        observedAt: Number.isNaN(observedAt) ? Date.now() : observedAt,
        url: ev.sources?.[0]?.url ?? ev.link,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

export interface HazardFetchResult {
  hazards: HazardEvent[];
  // Per-source success so the UI can show which feeds are live vs. down.
  sourceOk: Record<string, boolean>;
}

// Fetch every source concurrently; a failed source contributes an empty list
// and a false flag rather than failing the whole batch.
export async function fetchAllHazards(): Promise<HazardFetchResult> {
  const [quakes, eonet] = await Promise.all([
    fetchEarthquakes(),
    fetchEonetHazards(),
  ]);
  return {
    hazards: [...quakes, ...eonet],
    sourceOk: {
      USGS: quakes.length > 0,
      EONET: eonet.length > 0,
    },
  };
}
