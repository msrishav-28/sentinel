# Sentinel — Planetary Hazard Monitor

A living, always-on 3D globe that watches Earth for natural disasters —
earthquakes, wildfires, volcanoes, severe storms, floods, landslides and more —
and quietly surfaces what's **new or worsening** on its own. Built on the
Internet Computer (Motoko backend canister + React/Three.js frontend canister).

## What it does

- **Live multi-hazard globe.** Real-time hazards plotted on a tactical 3D Earth,
  each kind colour- and size-coded by severity.
- **Notices for you.** A diff-based noticing engine compares each fetch to the
  last and surfaces only genuinely new, escalating, or worsening events — not a
  wall of unchanged noise.
- **Proactive.** After you go idle, Sentinel auto-flies the camera to the most
  severe recent event and shows a quiet cue — it stops waiting to be asked.

## Data sources (real, live, free)

| Source | Hazards | Access |
|---|---|---|
| [USGS Earthquake feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) | Earthquakes (past 24h) | GeoJSON, no key, CORS |
| [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3) | Wildfires, volcanoes, severe storms, floods, landslides, drought, sea/lake ice, dust/haze | JSON, no key, HTTPS |
| [Open-Meteo](https://open-meteo.com/) | Weather overlay (context) | JSON, no key, CORS |

## Architecture

The browser is the **sensor**, the canister is the **brain**. Because Internet
Computer HTTP outcalls require replica consensus on exact response bytes — which
live, second-to-second feeds break — Sentinel fetches sources **in the browser**
(no consensus to fight), normalizes everything into one `HazardEvent` shape, and
runs the noticing engine client-side so the globe stays live even if the
canister is unreachable. The canister persists history and serves the proactive
feed on-chain (see `src/backend`).

```
Browser (sensor)                         Canister (brain, on-chain)
  fetch USGS + EONET ─▶ normalize ─▶ HazardEvent[] ─▶ ingest snapshot
       │                                  │                  │
       ▼                                  ▼                  ▼
   globe markers                 client noticing        persist + notice feed
```

## Frontend layout

- `src/frontend/src/hazards/` — the portable core:
  - `types.ts` — the unified `HazardEvent` model, kinds, severity.
  - `sources.ts` — live source adapters (USGS, EONET) → `HazardEvent[]`.
  - `noticing.ts` — the diff/notice engine (new / escalating / worsening).
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers).
- `src/frontend/src/App.tsx` — composition, HUD, layer toggles, proactive fly-to.

## Develop

```bash
# Frontend (from src/frontend/)
pnpm install --prefer-offline
pnpm typecheck
pnpm build
pnpm dev            # live globe against real data

# Backend (from repo root) — requires the Caffeine Motoko toolchain
mops install
mops build
```

This source was originally exported from [Caffeine](https://caffeine.ai/).
