# Project Guidance

Sentinel is a standalone Vite + React + Three.js single-page app. No backend,
no canister, no CSS framework — it fetches live hazard data directly in the
browser and builds to static assets. An optional serverless proxy in `/server`
adds a Google Earth Engine raster overlay.

## Verified Commands

Run from `src/frontend/` (or use the root passthrough scripts):

- **install**: `pnpm install --prefer-offline`
- **dev**: `pnpm dev` (append `?demo` for offline seeded data)
- **test**: `pnpm test` (vitest)
- **typecheck**: `pnpm typecheck`
- **lint**: `pnpm check` · **lint-fix**: `pnpm fix`
- **build**: `pnpm build` (outputs static `dist/`)
- **preview**: `pnpm preview`

## Architecture

- `src/frontend/src/hazards/` — portable core: unified `HazardEvent` model
  (`types.ts`), live source adapters (`sources.ts`: USGS + NASA EONET), the
  diff/noticing engine (`noticing.ts`), demo seed (`demo.ts`), optional GEE
  client (`gee.ts`), and their `*.test.ts` suites.
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers,
  optional raster overlay). Treat its core as stable; extend via additive props.
- `src/frontend/src/App.tsx` — composition, HUD, per-kind layer toggles.
- `server/` — optional Earth Engine tile proxy (its own package.json).

## Conventions

- Keep source adapters defensive: never throw; a dead source returns `[]`.
- Parsers are pure and unit-tested; keep fetch and parse separate.
- Keep everything typechecked, lint-clean (biome), and tested before committing.
- Optional features (GEE) must degrade to a no-op when unconfigured.
