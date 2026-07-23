# Tasklist — Sentinel Design Engagement

Prioritized, actionable backlog. Grouped by phase; ordered within each group by
leverage. Status: ☐ todo · ◐ in progress · ☑ done · ⏸ blocked. IDs are stable so
the ledger and commits can reference them.

Legend for effort: **S** ≤ half a day · **M** ~1–2 days · **L** multi-day.

---

## Phase 0 — Forensics ☑ complete
- ☑ **F1** Full codebase read; product use-case reverse-engineered. → [`FORENSICS.md`](FORENSICS.md)
- ☑ **F2** Resolve gating ambiguities with the user (D1–D4). → [`LEDGER.md`](LEDGER.md)

## Phase 1 — Direction ☑ confirmed
- ☑ **P1-1** Positioning, principles, 3 visual directions, recommendation. → [`DIRECTION.md`](DIRECTION.md)
- ☑ **P1-2** Direction confirmed — "Observatory" pushed cinematic; type system locked (D7). Validated in a live artifact preview.
- ☐ **P1-3** ⏸ (optional) User may still overturn Q5 (light mode) / Q7 (deforestation/GEE); defaults hold.

---

## Phase 2 — Design system & layout 🔨 in progress

### Foundations ☑ landed (`theme/tokens.ts` + `index.css` + `ui/SeverityBlip.tsx`)
- ☑ **P2-1** Token system: semantic **color** tokens (surfaces, instrument-teal
  primary, severity ramp reconciled in `types.ts`, warm-amber accent). Per-kind
  marker-hue AA normalization still to do during globe migration.
- ☑ **P2-2** **Type** system — three faces (Chakra Petch / Martian Mono / Saira +
  Orbitron alt), embedded as woff2; scale + weights + tracking tokens; 12px floor.
- ☑ **P2-3** Spacing, radius, motion tokens (durations/easings) + a global
  reduced-motion guard in `index.css`.
- ☑ **P2-4** Token delivery decided: **typed `tokens.ts` + CSS custom properties,
  no framework** (matches the codebase's no-CSS-framework grain). Dead OKLCH token
  set + unused classes/animations removed.
- ☑ **P2-1b** Signature component: `SeverityBlip` (Canvas additive-glow, pure
  tested `blipShape`, reduced-motion aware).

### Layout architecture
- ☐ **P2-5** Responsive shell spec: desktop three-column → tablet → **mobile
  single-column + bottom-sheet controls**; content-width + globe-sizing strategy. **M**
- ☐ **P2-6** Unify the two feed models into one **watch panel** (notices are the
  product; system/telemetry logs demoted to a separate, collapsible channel). **M**
- ☐ **P2-7** Navigation/IA: fold "jump-to-severest" and the proactive fly-to into
  one targeting model; define the idle→surface interaction spec. **S**

### Screens & states
- ☐ **P2-8** Globe view — the resting state, HUD hierarchy (let CRITICAL/SEVERE
  dominate; kill the triple-printed "TRACKING n"). **M**
- ☐ **P2-9** Unified **detail/selection** model — one panel, one selection state,
  replacing the 4 near-duplicate `DetailPanel` call-sites. **M**
- ☐ **P2-10** Every state, explicitly: loading/skeleton, error surface (replace the
  silent-return failure), and the missing **"all clear / no active hazards"** empty
  state. **M**
- ☐ **P2-11** The hero **fly-to** moment: choreography, the warm-amber cue, and its
  reduced-motion fallback. **S**

### Components & a11y
- ☐ **P2-12** Component inventory: atomic (button, toggle, slider, chip, stat,
  source-dot) vs. composite (layer list, watch panel, detail panel, HUD corner);
  build-vs-adopt call. **M**
- ☐ **P2-13** Per-component a11y contracts: contrast, target size (fix 20px
  chevrons), focus-visible, keyboard path for the globe, ARIA for live notices. **M**

---

## Phase 3 — Implementation (docs-first; starts after Phase 2 sign-off) ⏸
- ☐ **I1** Land the token layer; wire `index.css` tokens into a typed theme. **M**
- ☐ **I2** Extract atomic components; retire the `btnStyle` inline pattern. **M**
- ☐ **I3** Migrate the 121 inline color literals onto tokens, kind by kind. **L**
- ☐ **I4** Rebuild the shell responsively (D4); implement the mobile bottom sheet. **L**
- ☐ **I5** Implement the unified watch panel + unified detail/selection model. **M**
- ☐ **I6** Add empty/error/skeleton states; add `prefers-reduced-motion` gating. **M**
- ☑ **I7** Removed dead code: deforestation path (both files), unused `.dark`
  class + dead CSS animations (in the `index.css` rebuild), orphan `GeistMono.woff2`.
- ☐ **I8** Perf pass: memoize derived hazard slices; audit poll-loop re-renders. **M**
- ☐ **I9** Add component/interaction/a11y tests (currently core-only). **M**

---

## Cross-cutting / do-not-regress
- ☐ **X1** Keep CI green (typecheck · lint · test · build) on every commit.
- ☐ **X2** Preserve the five Phase 0 strengths (fly-to, engine restraint, marker
  language, defensive core, coherent identity).
- ☐ **X3** Keep adapters defensive and optional features no-op when unconfigured.
