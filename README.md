# Sentinel — Planetary Hazard Monitor

A living, always-on 3D globe that watches Earth for natural disasters —
earthquakes, wildfires, volcanoes, severe storms, floods, landslides and more —
and quietly surfaces what's **new or worsening** on its own.

Sentinel is a **standalone single-page app** (Vite + React + Three.js). It
fetches live data directly in the browser and builds to static assets — no
backend, no server, no API keys required. An *optional* serverless proxy adds a
Google Earth Engine raster overlay (see [`docs/gee.md`](docs/gee.md)).

## What it does

- **Live multi-hazard globe.** Real-time hazards plotted on a tactical 3D Earth,
  each kind colour- and size-coded by severity, with its own marker (fire embers,
  volcano eruptions, storm swirls, flood ripples, quake rings).
- **Notices for you.** A diff engine compares each fetch to the last and surfaces
  only genuinely new, escalating, or worsening events — not a wall of noise.
- **Proactive.** After you go idle, Sentinel auto-flies to the most severe recent
  event and shows a quiet cue — it stops waiting to be asked.
- **Demo mode.** Open `?demo` for a seeded, globe-wide dataset with zero network —
  bulletproof for a venue with flaky wifi.

## Data sources (real, live, free, no API key)

| Source | Hazards | Access |
|---|---|---|
| [USGS Earthquake feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Earthquakes (past 24h) | GeoJSON, no key, CORS |
| [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) | Wildfires, volcanoes, severe storms, floods, landslides, drought, sea/lake ice, dust/haze | JSON, no key, HTTPS |
| [Open-Meteo](https://open-meteo.com/) | Weather overlay + derived **extreme heat / cold** hazards | JSON, no key, CORS |
| Curated indicators | **Global warming** & **ozone depletion** hotspots (documented, ongoing phenomena) | bundled, marked `INDICATOR` |
| [Google Earth Engine](https://earthengine.google.com/) *(optional)* | Raster overlay: land temp / active fire / vegetation / temp anomaly / ozone | via `api/` proxy |

## Architecture

Everything runs in the browser. Each adapter fetches a live API and normalizes
it into a single `HazardEvent`; the noticing engine diffs successive fetches and
drives the globe, the feed, and the proactive fly-to.

```
fetch USGS + EONET ─▶ normalize (HazardEvent[]) ─▶ diff / notice ─▶ globe + feed + fly-to
```

- `src/frontend/src/hazards/` — the portable core:
  - `types.ts` — unified `HazardEvent` model, kinds, severity, per-kind metadata.
  - `sources.ts` — live source adapters (USGS, EONET) → `HazardEvent[]`.
  - `noticing.ts` — the diff/notice engine (new / escalating / worsening).
  - `climate.ts` — extreme heat/cold derived from weather + curated global-warming / ozone indicators.
  - `demo.ts` — seeded dataset for `?demo` / offline.
  - `gee.ts` — optional Earth Engine overlay client.
  - `*.test.ts` — vitest unit tests.
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers, overlay).
- `src/frontend/src/App.tsx` — composition, HUD, layer toggles, proactive fly-to.
- `api/gee-tiles.mjs` — optional serverless GEE tile proxy (Vercel function).

## Develop

From the repo root (root scripts fan out to the frontend workspace):

```bash
pnpm install --prefer-offline
pnpm dev          # live globe at http://localhost:5173 (add ?demo for offline)
pnpm test         # vitest unit tests
pnpm typecheck    # tsc --noEmit
pnpm check        # biome lint
pnpm build        # static bundle in src/frontend/dist/
```

CI (`.github/workflows/ci.yml`) runs typecheck · lint · test · build on every
push and pull request.

## Deploy to Vercel

The repo ships a `vercel.json`, so deployment is one step:

1. Import the repo into Vercel (or `vercel --prod` from the CLI). No settings to
   change — `vercel.json` sets the install/build commands and output directory.
2. Done. The static globe is live and pulls its data client-side.

`pnpm build` also produces a plain static `src/frontend/dist/` that serves from
any static host (Netlify, GitHub Pages, Cloudflare Pages, S3) — `pnpm preview`
runs it locally.

The Earth Engine overlay is **optional** and off by default; Sentinel never
crashes without it. To enable it, follow [`docs/gee.md`](docs/gee.md) (add the
`@google/earthengine` dep + set `GEE_SERVICE_ACCOUNT_JSON`).

## Tech stack

React 19 · TypeScript (strict) · Vite 5 · Three.js + @react-three/fiber ·
Biome (lint/format) · Vitest. No CSS framework — inline styles + a small set of
CSS utilities in `src/index.css`.
