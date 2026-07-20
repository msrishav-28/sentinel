// ─── Google Earth Engine tile proxy ───────────────────────────────────────────
//
// A tiny, stateless serverless function. It holds the GEE service-account
// credential (never shipped to the browser), mints an XYZ tile-URL template for
// a chosen dataset via Earth Engine, and returns it. The browser then fetches
// those tiles directly (they need no auth once minted).
//
// Framework-agnostic Node handler: works on Vercel (`api/gee-tiles.js`),
// Netlify Functions, Google Cloud Functions, or a plain Node server.
//
// Configure with ONE env var, a service-account JSON key (stringified):
//   GEE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ... , "private_key":"..."}'
// The service account must be registered for Earth Engine access.
//
// If the credential is missing/invalid the function returns 200 with
// { tileUrlTemplate: null } so the frontend simply shows no overlay — never an
// error to the user. GEE not configured ⇒ no harm to the product.

import ee from "@google/earthengine";

let initPromise = null;

function initEarthEngine() {
  if (initPromise) return initPromise;
  initPromise = new Promise((resolve, reject) => {
    const raw = process.env.GEE_SERVICE_ACCOUNT_JSON;
    if (!raw) return reject(new Error("GEE_SERVICE_ACCOUNT_JSON not set"));
    let key;
    try {
      key = JSON.parse(raw);
    } catch {
      return reject(new Error("GEE_SERVICE_ACCOUNT_JSON is not valid JSON"));
    }
    ee.data.authenticateViaPrivateKey(
      key,
      () => ee.initialize(null, null, resolve, reject),
      reject,
    );
  });
  return initPromise;
}

// Map a layer id → an ee.Image + visualization params. Recent composites so the
// raster is current without asking the client for a date.
function buildLayer(layer) {
  if (layer === "fire") {
    // FIRMS thermal anomalies (fire brightness temperature), last 2 days.
    const now = Date.now();
    const image = ee
      .ImageCollection("FIRMS")
      .select("T21")
      .filterDate(ee.Date(now - 2 * 864e5), ee.Date(now))
      .max();
    return { image, vis: { min: 325, max: 400, palette: ["#ffce00", "#ff7a00", "#ff0000", "#ffffff"] } };
  }
  if (layer === "vegetation") {
    // MODIS NDVI — greenness (drought / vegetation stress context).
    const image = ee
      .ImageCollection("MODIS/061/MOD13A2")
      .select("NDVI")
      .limit(8, "system:time_start", false)
      .mean();
    return { image, vis: { min: 0, max: 9000, palette: ["#8b5a2b", "#d9a441", "#a3c34d", "#2e7d32"] } };
  }
  // default: land-surface temperature (°C) — a planetary heat map.
  const image = ee
    .ImageCollection("MODIS/061/MOD11A1")
    .select("LST_Day_1km")
    .limit(8, "system:time_start", false)
    .mean()
    .multiply(0.02)
    .subtract(273.15);
  return {
    image,
    vis: {
      min: -20,
      max: 45,
      palette: ["#2b6cff", "#00e0ff", "#7cfc00", "#ffd000", "#ff6a00", "#ff0000"],
    },
  };
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("cache-control", "public, max-age=1800");
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("access-control-allow-origin", "*");
    res.statusCode = 204;
    return res.end();
  }
  const url = new URL(req.url ?? "/", "http://localhost");
  const layer = url.searchParams.get("layer") || "temperature";

  try {
    await initEarthEngine();
  } catch {
    // Not configured → graceful empty response (no overlay, no error surfaced).
    return send(res, 200, { layer, tileUrlTemplate: null, configured: false });
  }

  try {
    const { image, vis } = buildLayer(layer);
    image.getMap(vis, (map, err) => {
      if (err || !map) return send(res, 200, { layer, tileUrlTemplate: null, configured: true });
      // Newer EE returns `urlFormat`; older returns mapid/token to build a URL.
      const template =
        map.urlFormat ||
        (map.mapid
          ? `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}`
          : null);
      send(res, 200, { layer, tileUrlTemplate: template, configured: true });
    });
  } catch (e) {
    send(res, 200, { layer, tileUrlTemplate: null, configured: true, error: String(e) });
  }
}
