# CLAUDE.md — Working Guide for Claude Code

> Sentinel is a standalone Vite + React + Three.js single-page app: a living 3D
> globe that watches Earth for natural disasters, notices what's **new or
> worsening** on its own, and quietly surfaces it. No backend, no CSS framework —
> it fetches live hazard data directly in the browser and builds to static assets.
> An optional serverless proxy in `/api` adds a Google Earth Engine raster overlay.

This file is the fast-start guide for Claude Code sessions. It complements
[`AGENTS.md`](AGENTS.md) (the canonical short-form guidance) and
[`README.md`](README.md) (the human overview). When they disagree, `AGENTS.md`
wins on commands and conventions; this file wins on where things live and how to
work on the active **design engagement**.

---

## Verified commands

Run from `src/frontend/` or use the root passthrough scripts (they fan out to the
frontend workspace via pnpm):

| Task | Command |
|---|---|
| install | `pnpm install --prefer-offline` |
| dev | `pnpm dev` (append `?demo` for offline seeded data) |
| test | `pnpm test` (vitest) |
| typecheck | `pnpm typecheck` (`tsc --noEmit`) |
| lint | `pnpm check` (biome) · fix: `pnpm fix` |
| build | `pnpm build` (static `src/frontend/dist/`) |
| preview | `pnpm preview` |

CI (`.github/workflows/ci.yml`) runs **typecheck · lint · test · build** on every
push and PR. Keep all four green before committing.

---

## Where things live

```
src/frontend/src/
  hazards/                  portable, framework-agnostic core (fully unit-tested)
    types.ts                unified HazardEvent model, 13 HazardKinds, severity, KIND_META
    sources.ts              live adapters: USGS (quakes) + NASA EONET (multi-hazard)
    noticing.ts             the diff engine — new / escalating / worsening
    climate.ts              derived extreme heat/cold + curated warming/ozone INDICATORs
    demo.ts                 seeded offline dataset for ?demo
    gee.ts                  optional Earth Engine overlay client
    *.test.ts               vitest suites (23 tests; core only)
  theme/tokens.ts           typed design tokens — the single source of truth (color/type/space/motion)
  ui/                       token-driven component kit (SeverityBlip = the living-legend indicator)
  GlobeView.tsx             the 3D globe: tile LOD engine, camera, per-kind markers, overlay
  App.tsx                   composition, HUD, sidebars, live feed, proactive fly-to
  index.css                 reset + @font-face + CSS custom properties (mirror tokens.ts) + utilities
  main.tsx                  entry (no router, no StrictMode)
api/gee-tiles.mjs           optional Vercel serverless GEE tile proxy (degrades to no-op)
docs/gee.md                 how to enable the Earth Engine overlay
docs/design/                ← the active design engagement (see below)
```

Base map tiles stream from **ArcGIS World_Imagery** (`GlobeView.tsx`, `getTileUrl`).
This is a live third-party dependency not listed in the README's data-source table.

---

## Architecture in one line

```
fetch USGS + EONET (+ derived climate) ─▶ normalize HazardEvent[] ─▶ diff/notice ─▶ globe + feed + fly-to
```

- Every adapter normalizes into one `HazardEvent` shape. Add a hazard kind by
  appending to `HazardKind` + `KIND_META` + `HAZARD_KINDS` in `types.ts`; the
  engine, globe, and sidebar pick it up with no structural change.
- State is local React (`useState`/`useRef`) + `localStorage` prefs. No Redux/
  Zustand/Context, no react-query. Polling: hazards every 60s, weather every 300s.

## Conventions (from AGENTS.md — do not regress)

- **Adapters are defensive: never throw.** A dead source returns `[]`; the globe
  survives. Keep `fetch` and pure parse functions separate so parsers stay
  unit-testable against fixtures.
- **Optional features degrade to a no-op** when unconfigured (GEE is the model).
- Keep everything **typechecked, biome-clean, and tested** before committing.

---

## Active work: the design engagement

A product design + engineering review is in progress. Its documents live in
[`docs/design/`](docs/design/) and are the source of truth for design decisions:

| File | Purpose |
|---|---|
| [`docs/design/LEDGER.md`](docs/design/LEDGER.md) | **Start here.** Running decision ledger + open questions + changelog. |
| [`docs/design/TASKS.md`](docs/design/TASKS.md) | Prioritized, actionable backlog across phases. |
| [`docs/design/FORENSICS.md`](docs/design/FORENSICS.md) | Phase 0 — evidence-backed codebase analysis. |
| [`docs/design/DIRECTION.md`](docs/design/DIRECTION.md) | Phase 1 — positioning, principles, and the recommended visual direction. |

**Locked decisions** (see the ledger for rationale):

1. **Audience = both** — a showcase that dazzles *and* holds up under real use.
   Design the proactive fly-to as the entry moment; harden legibility/states/IA
   underneath it.
2. **Accessibility = balanced AA** — WCAG 2.2 AA for all real content and
   controls; decorative HUD micro-chrome may stay dense as texture but must never
   carry sole meaning.
3. **Platform = fully responsive** — phone and tablet are first-class, not
   graceful degradation.
4. **Visual direction = confirmed** — "Observatory" pushed toward a **cinematic
   instrument** (HUD framing, planetary-limb glow, title-sequence hero). Type
   system: **Chakra Petch** (chrome) · **Martian Mono** (telemetry) · **Saira**
   (reading) · **Orbitron** (wordmark alt) — not the generic Inter/JetBrains
   pairing. Legend indicators are Canvas "sensor blips" (`ui/SeverityBlip.tsx`).

**Foundation is built** (`src/theme/tokens.ts`, `src/index.css`, `src/ui/`). If you
are implementing UI, **drive every color/space/type value from tokens, not
literals** — import from `theme/tokens.ts` or use the `--c-*/--f-*/--sev-*` CSS
vars. The legacy code still hardcodes ~121 color literals; migrate them onto tokens
as you touch each surface. Keep all four CI gates green before committing.
