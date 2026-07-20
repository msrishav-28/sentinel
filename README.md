# Sentinel — Planetary Hazard Monitor

A living, always-on 3D globe that watches Earth for natural disasters —
earthquakes, wildfires, volcanoes, severe storms, floods, landslides and more —
and quietly surfaces what's **new or worsening** on its own.

Sentinel is a **standalone single-page app** (Vite + React + Three.js). It
fetches live data directly in the browser and builds to static assets — no
backend, no server, no API keys required. An *optional* serverless proxy adds a
Google Earth Engine raster overlay (see [`/server`](server/README.md)).

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
| [Open-Meteo](https://open-meteo.com/) | Weather overlay (context) | JSON, no key, CORS |
| [Google Earth Engine](https://earthengine.google.com/) *(optional)* | Raster overlay: land temp / active fire / vegetation | via `/server` proxy |

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
  - `demo.ts` — seeded dataset for `?demo` / offline.
  - `gee.ts` — optional Earth Engine overlay client.
  - `*.test.ts` — vitest unit tests.
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers, overlay).
- `src/frontend/src/App.tsx` — composition, HUD, layer toggles, proactive fly-to.
- `server/` — optional serverless GEE tile proxy.

## Develop

```bash
cd src/frontend
pnpm install --prefer-offline
pnpm dev          # live globe at http://localhost:5173 (add ?demo for offline)
pnpm test         # vitest unit tests
pnpm typecheck    # tsc --noEmit
pnpm check        # biome lint
pnpm build        # static bundle in dist/
```

## Deploy

`pnpm build` produces a static `dist/` — serve from any static host (Vercel,
Netlify, GitHub Pages, Cloudflare Pages) or `pnpm preview` locally.

The Earth Engine overlay is entirely optional; Sentinel works without it. To
enable it, deploy the [`/server`](server/README.md) function and set
`VITE_GEE_TILES_URL` (see `src/frontend/.env.example`).

## Tech stack

React 19 · TypeScript (strict) · Vite 5 · Three.js + @react-three/fiber ·
Biome (lint/format) · Vitest. No CSS framework — inline styles + a small set of
CSS utilities in `src/index.css`.
