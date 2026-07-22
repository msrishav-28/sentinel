# Phase 0 — Codebase Forensics

**Engagement:** Sentinel product design & engineering review
**Status:** Complete · findings ratified into [`LEDGER.md`](LEDGER.md)
**Method:** Full read of every source, doc, and manifest. Every claim below is
anchored to a file/line. No product intent was invented; where the code is silent,
it is marked as an open question, not a conclusion.

---

## 1. Product identity & core use case

Sentinel is a **single-screen, client-only 3D globe** that plots live natural-hazard
events on a tactical Earth and **diffs each refresh to surface only what changed**,
then — after the viewer goes idle — **auto-flies the camera to the most severe
recent event on its own.**

- Definition: `README.md:1-5`, `DESIGN.md:1-12`, `project.json:2`.
- 13 hazard kinds, one union: `types.ts:10-23`.
- Pipeline: `fetch USGS + EONET → normalize → diff/notice → globe + feed + fly-to`
  (`README.md:40-42`; implemented `App.tsx:596-641`).
- Signature moment: proactive fly-to after 45s idle (`App.tsx:664-735`;
  narrated `DESIGN.md:63-65`).

**Primary user is not declared in code — this is the central ambiguity.** There is
no auth, account, role, or persisted user data beyond a few localStorage UI prefs
(`App.tsx:324-339`). The *vocabulary* is emergency-operations ("operator,"
"piloting" `App.tsx:554-559`; tactical reticle; MGRS + DMS readouts
`App.tsx:306-322`; "REC ●"; UTC clock). But the *capabilities* are pure ambient
viewing: no acknowledge, assign, annotate, region filter, threshold, alert, or
export. **The job-to-be-done the code supports is "at-a-glance planetary awareness
+ be-told-what's-new," not an operational workflow.** The tactical styling is
theatre around a viewer.

- Intent signals: `project.json:10` `"category": "showcase"`; `docs/gee.md:24`
  frames usage as "hackathon / demo / noncommercial." `AGENTS.md:3` "no canister"
  is a vestige of an Internet Computer origin.

**Value layers (as supported):**
- *Primary:* see active Earth hazards now, ranked by severity, in one glance.
- *Secondary:* inspect one event's detail (`App.tsx:1468-1624`).
- *Tertiary:* climate/context — derived extreme heat/cold (`climate.ts:34-70`),
  curated warming/ozone **INDICATOR** markers honestly labelled
  (`climate.ts:83-148`), optional GEE raster overlay, weather layer.

---

## 2. Information architecture

- **Routes:** one screen, **no router** (no routing dep; `main.tsx` renders
  `<App/>`). "Navigation" is spatial: orbit, "JUMP TO SEVEREST EVENT"
  (`App.tsx:2025-2051`), proactive fly-to. `?demo` is the only URL param.
- **Shell** (`App.tsx:849-2054`), fixed three columns:
  - **Left (270px):** brand → 13 Hazard Layer rows (glyph/label/count/ON-OFF) →
    Weather toggle → source-status dots → **Live Feed** → footer.
  - **Center:** circular-clipped globe + reticle SVG + 4 HUD corners + bottom
    detail panels.
  - **Right (260px):** Bloom/Sharpen sliders, HUD toggle, optional GEE controls,
    jump-to-severest.
- **Entities:** `HazardEvent` (`types.ts:30-46`) is the spine; `KindMeta`
  presentation (`types.ts:51-132`); `Notice {reason:new|escalating|worsening}`
  (`noticing.ts:15-24`); **and a separate** App-local `FeedEvent`
  typed `EQ|WEATHER|SYSTEM|FIRE|HAZARD` (`App.tsx:50-55`) — two feed models coexist.
- **Flows:** passive watch (60s/300s polls); idle→surface; click→detail;
  layer toggle; jump-to-severest; demo/offline. Edge paths exist: total-fetch
  failure returns silently → "UPD failed" (`App.tsx:602-607`); dead source → `[]`
  + hollow dot (`sources.ts:267-279`).

---

## 3. Technical reality

- **Stack:** Vite 5 · React 19 (strict TS) · Three.js 0.176 + `@react-three/fiber`
  9 + `drei` · Biome · Vitest. **No CSS framework.**
- **Routing:** none. **State:** local `useState`/`useRef` + hand-rolled
  localStorage. No global store, **no react-query/SWR** → no caching, dedupe,
  retry, or backoff on the polling fetches.
- **Components:** two God-components (`App.tsx` 2057 lines, `GlobeView.tsx` 1294
  lines) + small `DetailPanel`. Only styling abstraction is `btnStyle()`
  (`App.tsx:360-371`); everything else re-inlines styles.
- **⚠ Design system is documented but dead.** `index.css:40-185` declares a full
  OKLCH token set **and a `.dark` class** — but **no component consumes a single
  `var(--…)`**. Across `.tsx`: 3 `className` uses total, and **121 hardcoded color
  literals, 75 of them the cyan `#00ffff`/`0,255,255`.** Token *names*
  (`--card/--popover/--sidebar/--ring/--chart-*`) are the **shadcn/Tailwind**
  convention → fossil of a stripped-out scaffold. `DESIGN.md`'s palette is
  aspirational, not enforced. **Largest systemic debt.**
- **Undocumented dependency:** base tiles stream from **ArcGIS World_Imagery**
  (`GlobeView.tsx:210-212`). The tile LOD engine (two-layer base/detail, generation
  counters, distance-sorted loading, 400-tile eviction, `GlobeView.tsx:178-430`) is
  genuinely well-built.
- **Perf:** `App` recomputes derived slices every render, unmemoized
  (`App.tsx:536-543`), and re-renders the whole tree each poll. Markers
  hemisphere-culled (`GlobeView.tsx:992-996`). Continuous rAF: autoRotate +
  per-marker pulses.
- **Auth/tenancy/permissions:** none — anonymous, static. Only server surface is
  the optional GEE proxy holding a service-account credential (`api/gee-tiles.mjs`).
- **Tests:** 23 unit tests, **core only** (`hazards/*.test.ts`); `App`/`GlobeView`
  untested — no component/interaction/a11y tests.

---

## 4. Current UX & visual state

### Strengths — preserve
1. **A differentiated concept with a real signature moment** — the "SENTINEL
   noticed —" auto-fly (`App.tsx:664-735`). The soul of the product.
2. **Engine restraint** — no notice for unchanged/"lingering" events
   (`noticing.ts:6-9, 82`). "A hazard that hasn't changed isn't news."
3. **Legible-at-a-glance marker language** — per-kind animated markers
   (`GlobeView.tsx:554-957`).
4. **Defensive, tested data core** — never throws; pure parsers (`sources.ts`).
5. **A committed, coherent identity** — mono, cyan/orange, reticle, MGRS/DMS.

### Pain points / debt (prioritized)
1. **Token disconnect** (§3) — makes hand-maintained visual consistency impossible.
2. **Legibility & accessibility — most serious.** Pervasive **6–9px type**
   (`App.tsx:1203-1228`) and low-opacity cyan on black (`rgba(0,255,255,0.3–0.5)`)
   fail WCAG 2.2 AA on contrast (1.4.3) and target size (2.5.8 — 20px chevrons,
   `App.tsx:876-878`). No `prefers-reduced-motion` despite constant rotation +
   pulsing (2.3.3 / 2.2.2).
3. **The notice signal is diluted by log noise.** The Live Feed interleaves real
   notices with `SYSTEM`/`WEATHER`/selection chatter (`App.tsx:582-641`) —
   contradicting the product's own "not a wall of noise" thesis (`README.md:18`).
   Two feed models (`Notice` vs `FeedEvent`) never reconcile.
4. **Fragmented selection model** — 4 near-duplicate `DetailPanel` call-sites,
   3 `selected*` states, manual cross-clearing (`App.tsx:1295-1324, 1468-1624`).
5. **Dead/vestigial surfaces** — the whole **deforestation** path is wired but
   permanently empty (`deforestationData={[]}`, `App.tsx:1280`); `.dark` class and
   CSS animations `scanline/blink/ambient-drift/proactive-surface-cue`
   (`index.css:312-412`) are defined but unused.
6. **Mobile IA collapses to nothing.** Fixed 270/260px sidebars auto-collapse under
   768px (`App.tsx:566-576, 737-752`) → a bare globe + one status line, every
   control behind two 20px chevrons. No mobile pattern.
7. **Flat hierarchy / duplication.** Uniform ALLCAPS mono at near-identical tiny
   sizes → nothing leads; "TRACKING {n}" prints in three places
   (`App.tsx:1690, 1715, 1787`).
8. **Thin state coverage** — has init/waiting/failed strings but **no skeletons,
   no real error surface, and no "all clear / no active hazards" empty state**,
   which for a monitor is a first-class state.

**Verdict:** reads convincingly as a cockpit, but the aesthetic is winning against
usability at a legibility cost that would fail an audit and fatigue sustained use.

---

## 5. Ambiguities (as raised) and their resolution

| # | Ambiguity | Resolution |
|---|---|---|
| 1 | Audience & purpose | **Both** — dazzle + hold up. |
| 2 | Deliverable & fidelity | **Docs first** (direction + system), plus CLAUDE.md, ledger, tasklist. No app code yet. |
| 3 | Token/architecture reality | Deferred to Phase 2; principle set: tokens are the source of truth. |
| 4 | Accessibility vs. density | **Balanced AA** — AA for real content/controls; decorative chrome may stay dense. |
| 5 | Light mode | **OPEN** — default: dark-only v1, token-ready for light later. |
| 6 | Platform priority | **Fully responsive**, mobile first-class. |
| 7 | Deforestation / GEE / weather scope | **OPEN** — default: deforestation removed; GEE + weather remain optional context. |

Open items #5 and #7 carry recorded defaults in [`LEDGER.md`](LEDGER.md); proceeding
on them is reversible.
