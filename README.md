# Sentinel — Planetary Hazard Monitor

A living, always-on 3D globe that watches Earth for natural disasters —
earthquakes, wildfires, volcanoes, severe storms, floods, landslides and more —
and quietly surfaces what's **new or worsening** on its own.

Sentinel is a **standalone single-page app** (Vite + React + Three.js). It
fetches live data directly in the browser and builds to static assets — no
backend, no server, no keys, deployable to any static host.

## What it does

- **Live multi-hazard globe.** Real-time hazards plotted on a tactical 3D Earth,
  each kind colour- and size-coded by severity.
- **Notices for you.** A diff-based engine compares each fetch to the last and
  surfaces only genuinely new, escalating, or worsening events — not a wall of
  unchanged noise.
- **Proactive.** After you go idle, Sentinel auto-flies the camera to the most
  severe recent event and shows a quiet cue — it stops waiting to be asked.

## Data sources (real, live, free, no API key)

| Source | Hazards | Access |
|---|---|---|
| [USGS Earthquake feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Earthquakes (past 24h) | GeoJSON, no key, CORS |
| [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) | Wildfires, volcanoes, severe storms, floods, landslides, drought, sea/lake ice, dust/haze | JSON, no key, HTTPS |
| [Open-Meteo](https://open-meteo.com/) | Weather overlay (context) | JSON, no key, CORS |

## Architecture

Everything runs in the browser. Each source adapter fetches a live API and
normalizes it into a single `HazardEvent` shape; the noticing engine diffs
successive fetches and drives the globe, the feed, and the proactive fly-to.

```
fetch USGS + EONET ─▶ normalize (HazardEvent[]) ─▶ diff / notice ─▶ globe + feed + fly-to
```

- `src/frontend/src/hazards/` — the portable core:
  - `types.ts` — unified `HazardEvent` model, kinds, severity.
  - `sources.ts` — live source adapters (USGS, EONET) → `HazardEvent[]`.
  - `noticing.ts` — the diff/notice engine (new / escalating / worsening).
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers).
- `src/frontend/src/App.tsx` — composition, HUD, layer toggles, proactive fly-to.

## Develop

```bash
cd src/frontend
pnpm install --prefer-offline
pnpm dev          # live globe against real data at http://localhost:5173
pnpm typecheck    # tsc --noEmit
pnpm check        # biome lint
pnpm build        # static bundle in dist/
```

## Deploy

`pnpm build` produces a static `dist/`. Serve it from any static host —
Vercel, Netlify, GitHub Pages, Cloudflare Pages, or `pnpm preview` locally.
