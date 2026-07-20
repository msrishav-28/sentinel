# Google Earth Engine overlay (optional)

Sentinel can show a Google Earth Engine raster overlay on the globe. It's
**entirely optional** — without it the product runs normally and the overlay
control simply hides itself. Nothing crashes if it isn't set up.

## How it works

- `api/gee-tiles.mjs` is a serverless function (auto-deployed by Vercel at
  `/api/gee-tiles`). It holds the Earth Engine service-account credential
  server-side, mints an XYZ **tile-URL template** for the requested `?layer=`,
  and returns it. The browser fetches those tiles directly.
- The client (`src/frontend/src/hazards/gee.ts`) calls it and resolves to `null`
  on any failure, so the globe just skips the overlay.

Layers: `temperature` (land-surface temp, default) · `fire` (FIRMS active fire) ·
`vegetation` (NDVI) · `warming` (ERA5 temperature anomaly) · `ozone` (Sentinel-5P
total-column ozone).

## Is Earth Engine free?

- **Yes for noncommercial / research / education use** — free to sign up and use.
- **Commercial use is billed through Google Cloud.** For a hackathon / demo /
  noncommercial project the free tier is enough; this function's usage (a few
  `getMapId` calls, cached 30 min) is tiny.

## Enable it (all manual, one-time)

1. Create a Google Cloud project, enable the **Earth Engine API**, and register a
   **service account** for Earth Engine.
2. Add the dependency so the function can load Earth Engine:
   ```bash
   pnpm add -w @google/earthengine
   ```
   (Add it to the root `package.json` so Vercel installs it for the function.)
3. Set the environment variable to the **stringified** service-account key JSON.
   On Vercel: Project → Settings → Environment Variables:
   ```
   GEE_SERVICE_ACCOUNT_JSON = {"type":"service_account","project_id":"…","private_key":"…", …}
   ```
4. Redeploy. The overlay control appears in Sentinel's right sidebar.

If the proxy runs on a different origin than the app, set `VITE_GEE_TILES_URL`
for the frontend build (see `src/frontend/.env.example`). On Vercel, same-origin
`/api/gee-tiles` works with no client config.

## Local development

The function is a standard `(req, res)` Node handler. Run it under `vercel dev`
(which serves `/api/*` alongside the Vite app), or point `VITE_GEE_TILES_URL` at
any host running it. Without it, `pnpm dev` still works — no overlay.
