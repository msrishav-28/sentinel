# Sentinel — Google Earth Engine tile proxy

A tiny, **optional** serverless function that lets Sentinel show a Google Earth
Engine raster overlay on the globe (planetary heat, active fire, or vegetation)
without ever exposing credentials to the browser.

**Sentinel works fully without this.** If the proxy isn't deployed or isn't
configured, the frontend just shows no overlay — no errors, no degraded UX.

## What it does

1. Holds a GEE **service-account** credential (server-side only).
2. Calls Earth Engine to mint an XYZ **tile-URL template** for the requested
   `?layer=` (`temperature` (default) · `fire` · `vegetation`).
3. Returns `{ tileUrlTemplate }`. The browser fetches those tiles directly.

## Is Earth Engine free?

- **Yes for noncommercial / research / education use** — free to sign up and use.
- **Commercial use requires a paid Google Cloud project** (Earth Engine is billed
  through Cloud). For a hackathon/demo/noncommercial project, the free tier is
  sufficient and this function's usage (a few `getMapId` calls, cached 30 min) is
  tiny.
- You need a Google Cloud project with the Earth Engine API enabled and a
  **service account** registered for Earth Engine.

## Configure

Set one environment variable to the **stringified** service-account JSON key:

```
GEE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"…","private_key":"…", …}
```

## Deploy

**Vercel** — copy `gee-tiles.mjs` to `api/gee-tiles.js` (or add this folder as a
serverless function), run `npm install`, set the env var in the project settings.
The endpoint is then `https://<your-app>/api/gee-tiles`.

**Netlify / Cloud Functions / Node** — the default export is a standard
`(req, res)` handler; wire it to your platform's function entrypoint.

## Point the frontend at it

Set `VITE_GEE_TILES_URL` for the frontend build (defaults to `/api/gee-tiles`,
which is correct when the function is hosted on the same origin as the app):

```
VITE_GEE_TILES_URL=https://<your-app>/api/gee-tiles
```
