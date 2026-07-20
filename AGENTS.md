# Project Guidance

Sentinel is a standalone Vite + React + Three.js single-page app. No backend,
no canister, no proprietary toolchain — it fetches live hazard data directly in
the browser and builds to static assets.

## Verified Commands

Run from `src/frontend/` (or use the root passthrough scripts):

- **install**: `pnpm install --prefer-offline`
- **dev**: `pnpm dev` (live globe against real APIs)
- **typecheck**: `pnpm typecheck`
- **lint**: `pnpm check` · **lint-fix**: `pnpm fix`
- **build**: `pnpm build` (outputs static `dist/`)
- **preview**: `pnpm preview`

## Architecture

- `src/frontend/src/hazards/` — portable core: unified `HazardEvent` model
  (`types.ts`), live source adapters (`sources.ts`: USGS + NASA EONET), and the
  diff/noticing engine (`noticing.ts`).
- `src/frontend/src/GlobeView.tsx` — the 3D globe (tiles, camera, markers). Its
  core is treated as stable; extend via additive props, don't rewrite it.
- `src/frontend/src/App.tsx` — composition, HUD, per-kind layer toggles,
  proactive fly-to.

## Conventions

- Keep new source adapters defensive: never throw; a dead source returns `[]`.
- Keep everything typechecked and lint-clean (`biome`).
