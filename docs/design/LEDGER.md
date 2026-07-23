# Design Ledger — Sentinel

The running record for the design + engineering engagement: decisions, their
rationale, open questions with recorded defaults, and a dated changelog. **This is
the index — start here.** Companion docs: [`FORENSICS.md`](FORENSICS.md) (Phase 0),
[`DIRECTION.md`](DIRECTION.md) (Phase 1), [`TASKS.md`](TASKS.md) (backlog).

Update discipline: when a decision is made or reversed, add a row to **Decisions**
and a line to the **Changelog**. When an open question resolves, move it from
**Open Questions** into **Decisions**.

---

## Status

| | |
|---|---|
| Phase 0 — Forensics | ✅ Complete |
| Phase 1 — Direction | ✅ Confirmed — "Observatory", pushed cinematic (see D7) |
| Phase 2 — Design system & layout | 🔨 In progress — foundation landed (see D8) |
| Implementation | 🔨 In progress — build authorized ($500k), foundation committed |

**Next action (team):** build outward onto the foundation — global type/color
migration, then the left sidebar (living legend), HUD, detail panel, proactive
cue, and the responsive shell. Open questions Q5/Q7 still carry their defaults.

---

## Decisions

| ID | Decision | Rationale | Source |
|---|---|---|---|
| D1 | **Audience = both** (dazzle *and* hold up). Design the proactive fly-to as the entry moment; harden legibility, states, and IA underneath. | Code supports ambient awareness; styling implies ops. Serving only one loses either the magic or the usability. | User, Phase 0 Q1 |
| D2 | **Deliverable = docs first** — direction + system as documents, plus `CLAUDE.md`, this ledger, and `TASKS.md`. No `App.tsx`/`GlobeView.tsx` changes yet. | Approve the design before touching ~3,300 lines of God-components. | User, Phase 0 Q2 |
| D3 | **Accessibility = balanced AA.** WCAG 2.2 AA for all real content and controls; decorative HUD micro-chrome may stay dense as texture but never carries sole meaning. | Current 6–9px low-opacity cyan structurally fails AA; a pragmatic floor keeps the aesthetic while fixing real usability. | User, Phase 0 Q4 |
| D4 | **Platform = fully responsive.** Phone and tablet are first-class targets. | Today the app is a bare globe on phones (both sidebars auto-collapse). | User, Phase 0 Q6 |
| D5 | **Recommended visual direction = "Observatory"** (refined tactical). *Awaiting user confirmation.* | Only direction that satisfies both halves of D1 while fixing the three worst Phase 0 defects; smallest safe distance from current identity. | Team, [`DIRECTION.md`](DIRECTION.md) §4 |
| D6 | **Tokens are the source of truth.** Every color/space/type value comes from tokens, not literals. | Phase 0's largest debt: a full OKLCH token set exists in `index.css` but 0 components use it; 121 hardcoded color literals instead. | Team, Phase 0 §3 |
| D7 | **Direction confirmed and pushed cinematic.** Observatory substrate + JARVIS accent, dialed toward a "cinematic instrument" (HUD framing, planetary-limb glow, title-sequence hero). **Type system = Chakra Petch (chrome) · Martian Mono (telemetry) · Saira (reading) · Orbitron (wordmark alt)** — deliberately not the generic Inter/JetBrains SaaS pairing. Legend indicators = Canvas additive-glow "sensor blips" (not CSS). | User + team, look-&-feel iterations v0.1→v0.3 |
| D8 | **Build authorized ($500k), foundation-first.** Land the token layer before any screen: embedded fonts, `theme/tokens.ts` (typed source of truth), `index.css` rebuilt onto tokens, and the `SeverityBlip` component. Severity ramp reconciled in the portable core (`types.ts`) so globe + UI agree. | User directive |

---

## Open questions (with recorded defaults — reversible)

| ID | Question | Recorded default | Impact if changed |
|---|---|---|---|
| Q5 | Is **light mode** in scope? | **Dark-only v1**, built on tokens so light is a later theme-swap, not a refactor. | Adds a full light palette + toggle to Phase 2 scope. |
| Q7 | **Deforestation / GEE / weather** scope? | ✅ Deforestation path **removed** (enacted 2026-07-23). GEE + weather **remain optional context**, not first-class. | If deforestation returns, it needs a real data source and re-earns IA weight. |

Lower-priority, proceeding on team judgement unless you object: merge vs. split the
system-log and notice streams (**default: split** — notices are the product, logs
are demoted); unify jump-to-severest with the proactive fly-to (**default: unify**
the targeting logic); operator-vs-viewer naming (**default: neutral "watch" language**).

---

## Constraints carried into every phase

- Adapters never throw; a dead source returns `[]` (do not regress `sources.ts`).
- Optional features degrade to a no-op when unconfigured (GEE is the model).
- Keep CI green: typecheck · lint (biome) · test · build.
- Preserve the five Phase 0 strengths: the proactive fly-to, the engine's
  restraint, the per-kind marker language, the defensive tested core, and the
  coherent identity.

---

## Changelog

| Date | Entry |
|---|---|
| 2026-07-22 | Engagement opened. Phase 0 forensics completed against full codebase; findings ratified. |
| 2026-07-22 | Decisions D1–D4 locked from user answers; D5–D6 added by team. Open questions Q5, Q7 recorded with defaults. |
| 2026-07-22 | Phase 1 direction delivered; **Direction A "Observatory"** recommended. Scaffolding created: `CLAUDE.md`, `docs/design/{FORENSICS,DIRECTION,LEDGER,TASKS}.md`. |
| 2026-07-23 | Look-&-feel iterated in a live artifact preview (v0.1→v0.3). Direction confirmed and pushed cinematic; type system locked (D7). Balanced-AA, fully-responsive, dark-only-v1 all reaffirmed. |
| 2026-07-23 | **Build kickoff (D8).** Foundation committed: 6 embedded faces, `theme/tokens.ts`, rebuilt `index.css` (dead OKLCH tokens + dead classes/animations removed), `ui/SeverityBlip.tsx` + tests, severity ramp reconciled in `types.ts`. CI green: typecheck · lint · test (28) · build. |
| 2026-07-23 | First integrated slice: the **living legend** — sidebar hazard-layer rows rebuilt onto tokens (Chakra Petch labels, Martian Mono counts, `.pill` toggles) with a per-kind `SeverityBlip` driven by peak severity. CI green. |
| 2026-07-23 | Cleanup (no orphans): **deforestation path removed end-to-end** (`GlobeView` type/component/prop/render + `App` state/panel/handlers) per Q7; orphaned `GeistMono.woff2` deleted. CI green. |
| 2026-07-23 | **DetailPanel** extracted from `App.tsx` into a tokenized `ui/DetailPanel.tsx` (Chakra Petch labels, Martian Mono values, popover surface, `.pill` close). Upgrades all three panels at once; `App.tsx` 2057 → 1950 lines. CI green. |
| 2026-07-23 | **Full chrome tokenization**: brand, HUD status bar + all four corners, sidebars, live feed, right-rail controls, reticle, and the `btnStyle`/`feedTypeColor` helpers migrated onto tokens + the telemetry fonts. `App.tsx` color literals 86 → 5 (the 5 are intentional accent-alpha tints). **JetBrains Mono fully retired** (stack + @font-face + woff2 deleted). CI green. |
