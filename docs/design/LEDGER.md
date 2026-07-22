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
| Phase 1 — Direction | ✅ Delivered · awaiting confirmation of Direction A |
| Phase 2 — Design system & layout | ⏳ Blocked on Direction A sign-off |
| Implementation | ⏳ Not started (docs-first per D2) |

**Next action (user):** confirm **Direction A — "Observatory"** (or pick B/C), and
optionally resolve open questions Q5 and Q7. Then Phase 2 begins.

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

---

## Open questions (with recorded defaults — reversible)

| ID | Question | Recorded default | Impact if changed |
|---|---|---|---|
| Q5 | Is **light mode** in scope? | **Dark-only v1**, built on tokens so light is a later theme-swap, not a refactor. | Adds a full light palette + toggle to Phase 2 scope. |
| Q7 | **Deforestation / GEE / weather** scope? | **Remove** the dead deforestation path; keep **GEE + weather as optional context**, not first-class. | If deforestation returns, it needs a real data source and re-earns IA weight. |

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
