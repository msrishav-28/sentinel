// ─── Google Earth Engine tile proxy (Vercel serverless function) ──────────────
//
// Optional. Mints an XYZ tile-URL template for a chosen Earth Engine dataset so
// Sentinel can show a raster overlay. The service-account credential lives here
// (server side) and is never shipped to the browser.
//
// This endpoint is deployed automatically by Vercel at /api/gee-tiles. It is
// designed to NEVER crash the product:
//   • Earth Engine is imported dynamically — if the dependency isn't installed,
//     it returns { tileUrlTemplate: null } instead of failing the build/runtime.
//   • If GEE_SERVICE_ACCOUNT_JSON is unset/invalid, same graceful null.
//   • The frontend treats null as "no overlay".
//
// To enable (all manual, one-time):
//   1. Create a Google Cloud project, enable the Earth Engine API, and register
//      a service account for Earth Engine.
//   2. Add the dependency for the function:  pnpm add @google/earthengine
//   3. Set the env var to the stringified key JSON:
//        GEE_SERVICE_ACCOUNT_JSON={"type":"service_account", ... }
//
// Is Earth Engine free? Yes for noncommercial / research / education use.
// Commercial use is billed through Google Cloud.

let eePromise = null;

// Dynamically load + initialize Earth Engine. Resolves to the `ee` module, or
// rejects if the dependency or credential is missing.
function initEarthEngine() {
  if (eePromise) return eePromise;
  eePromise = (async () => {
    const raw = process.env.GEE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("GEE_SERVICE_ACCOUNT_JSON not set");
    let key;
    try {
      key = JSON.parse(raw);
    } catch {
      throw new Error("GEE_SERVICE_ACCOUNT_JSON is not valid JSON");
    }
    // Dynamic import via a variable specifier so the bundler never tries to
    // resolve it at build time — an absent dependency degrades at runtime
    // (caught by the caller) instead of failing the build.
    const pkg = "@google/earthengine";
    const mod = await import(pkg);
    const ee = mod.default ?? mod;
    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        key,
        () => ee.initialize(null, null, resolve, reject),
        reject,
      );
    });
    return ee;
  })();
  return eePromise;
}

// Map a layer id → an ee.Image + visualization. Recent composites so the raster
// is current without the client passing a date.
function buildLayer(ee, layer) {
  const now = Date.now();
  if (layer === "fire") {
    const image = ee
      .ImageCollection("FIRMS")
      .select("T21")
      .filterDate(ee.Date(now - 2 * 864e5), ee.Date(now))
      .max();
    return { image, vis: { min: 325, max: 400, palette: ["#ffce00", "#ff7a00", "#ff0000", "#ffffff"] } };
  }
  if (layer === "vegetation") {
    const image = ee
      .ImageCollection("MODIS/061/MOD13A2")
      .select("NDVI")
      .limit(8, "system:time_start", false)
      .mean();
    return { image, vis: { min: 0, max: 9000, palette: ["#8b5a2b", "#d9a441", "#a3c34d", "#2e7d32"] } };
  }
  if (layer === "warming") {
    // Global-warming layer: ERA5-Land 2m-temperature anomaly (recent year vs the
    // 1991–2020 climatology), in °C. Diverging blue→red palette.
    const coll = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select("temperature_2m");
    const recent = coll.filterDate(ee.Date(now).advance(-1, "year"), ee.Date(now)).mean();
    const baseline = coll.filterDate("1991-01-01", "2020-12-31").mean();
    const image = recent.subtract(baseline);
    return {
      image,
      vis: { min: -3, max: 3, palette: ["#2166ac", "#67a9cf", "#d1e5f0", "#fddbc7", "#ef8a62", "#b2182b"] },
    };
  }
  if (layer === "ozone") {
    // Ozone-depletion layer: Sentinel-5P total-column ozone (recent mean). Low
    // values (depletion) render toward the dark end of the palette.
    const image = ee
      .ImageCollection("COPERNICUS/S5P/OFFL/L3_O3")
      .select("O3_column_number_density")
      .filterDate(ee.Date(now).advance(-14, "day"), ee.Date(now))
      .mean();
    return {
      image,
      vis: { min: 0.12, max: 0.16, palette: ["#3d0f5e", "#3b528b", "#21918c", "#5ec962", "#fde725"] },
    };
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
    vis: { min: -20, max: 45, palette: ["#2b6cff", "#00e0ff", "#7cfc00", "#ffd000", "#ff6a00", "#ff0000"] },
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

  let ee;
  try {
    ee = await initEarthEngine();
  } catch {
    // Not configured or dependency absent → graceful empty response.
    return send(res, 200, { layer, tileUrlTemplate: null, configured: false });
  }

  try {
    const { image, vis } = buildLayer(ee, layer);
    image.getMap(vis, (map, err) => {
      if (err || !map) return send(res, 200, { layer, tileUrlTemplate: null, configured: true });
      const template =
        map.urlFormat ||
        (map.mapid ? `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}` : null);
      send(res, 200, { layer, tileUrlTemplate: template, configured: true });
    });
  } catch (e) {
    send(res, 200, { layer, tileUrlTemplate: null, configured: true, error: String(e) });
  }
}
