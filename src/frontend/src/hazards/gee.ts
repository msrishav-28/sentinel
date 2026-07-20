// ─── Google Earth Engine raster overlay (optional) ────────────────────────────
//
// Fetches an XYZ tile-URL template from the GEE tile proxy (see /server). The
// browser then renders those tiles as a raster overlay on the globe. Entirely
// optional: any failure (proxy not deployed, GEE not configured, network error)
// resolves to null and the app simply shows no overlay.

export type GeeLayerId = "temperature" | "fire" | "vegetation";

export const GEE_LAYERS: Array<{ id: GeeLayerId; label: string }> = [
  { id: "temperature", label: "LAND TEMP" },
  { id: "fire", label: "ACTIVE FIRE" },
  { id: "vegetation", label: "VEGETATION" },
];

interface GeeResponse {
  tileUrlTemplate?: string | null;
}

// Endpoint is configurable at build time; defaults to a same-origin function.
const GEE_ENDPOINT =
  (import.meta.env.VITE_GEE_TILES_URL as string | undefined) ??
  "/api/gee-tiles";

export async function fetchGeeTileTemplate(
  layer: GeeLayerId = "temperature",
): Promise<string | null> {
  try {
    const res = await fetch(
      `${GEE_ENDPOINT}?layer=${encodeURIComponent(layer)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GeeResponse;
    return data.tileUrlTemplate ?? null;
  } catch {
    return null;
  }
}
