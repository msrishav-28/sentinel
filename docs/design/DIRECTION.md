# Phase 1 — Strategic Repositioning & Design Direction

**Status:** Delivered · awaiting confirmation of the recommended direction before
Phase 2 (detailed token + component system).
**Inputs that shaped this:** Phase 0 forensics ([`FORENSICS.md`](FORENSICS.md)) and
four locked decisions — audience = *both*, accessibility = *balanced AA*, platform
= *fully responsive*, deliverable = *docs first*.

---

## 1. Product positioning

### Category
A **planetary situational-awareness instrument** — an always-on, glanceable hazard
monitor. Explicitly *not* a dashboard, *not* a GIS console, *not* a disaster
news-feed. It occupies the small, distinctive niche between "raw data feed" and
"heavyweight ops platform."

### Unique value proposition
Every alternative makes *you* do the noticing. Sentinel does the noticing for you.

- **vs. raw feeds & weather globes** (USGS map, EONET, Windy, Ventusky,
  Zoom.earth): those are *query tools* — you go to them and ask "what's happening?"
  Sentinel *diffs the world and tells you what changed since you last looked*
  (`noticing.ts`), then physically turns to face it (the fly-to). That combination —
  **restraint + agency** — is the moat.
- **vs. ops platforms** (ArcGIS, Palantir-style): those are heavyweight,
  multi-user, workflow-first. Sentinel is zero-setup, zero-login, one-glance. It
  trades workflow depth for immediacy and presence.

### The feeling it should evoke
**Calm vigilance — quiet authority.** It should feel like a trusted watch-officer:
unhurried, always alert, speaks only when something matters, and when it speaks you
listen. The spectacle (the auto-fly) is the instrument *turning its head* — it
serves the calm, it does not replace it. This is how we satisfy both halves of the
"dazzle + hold up" mandate: the drama is rare, earned, and purposeful, so it reads
as authority rather than noise.

### It must never feel like
A noisy alert dashboard · a doomscroll of catastrophes · a gamified globe toy · a
cluttered GIS cockpit · a surveillance panopticon. Never anxiety-inducing, never
ambulance-chasing, and never **fake-precise** — the honest `INDICATOR` labelling is
a brand value, not a footnote. Keep it.

> **Team note (Product Strategist ↔ Brand Strategist).** We debated "high-stakes
> cockpit" vs. "calm observatory." Cockpit is where the current UI already lives and
> it's exciting for 60 seconds, but it structurally pushes toward density, alarm-red,
> and fatigue — the exact things the "hold up under real use" half of the mandate
> rejects. "Calm vigilance" keeps the tactical DNA while giving us license to fix
> legibility. Consensus: calm vigilance, with the cockpit energy concentrated into
> the one proactive moment.

---

## 2. Design principles (non-negotiable)

Specific, testable, and each traceable to a Phase 0 finding.

1. **Signal over noise — the feed earns every line.** Only genuinely new /
   escalating / worsening events reach the notice stream. System and telemetry
   chatter live in a separate, demoted channel. *(Enforces `noticing.ts`; fixes the
   two-feed dilution, Phase 0 §4.3.)*
2. **The globe is the interface; chrome defers to it.** The planet is always the
   brightest, most saturated thing on screen. Panels are quiet until summoned and
   recede when done. No frame competes with the Earth.
3. **Legible under pressure (balanced AA).** Every real number, label, and control
   meets WCAG 2.2 AA contrast and target size, with a hard functional type floor.
   Decorative HUD micro-text may stay dense as *texture* but never carries meaning
   on its own. *(Fixes Phase 0 §4.2.)*
4. **Severity is the spine.** One 1–5 severity scale drives color, size, order, and
   what surfaces — everywhere, identically. The eye finds "the worst thing" in under
   a second. *(Formalizes `types.ts` severity across the whole UI.)*
5. **It acts, but never startles.** Proactive motion is slow, warm, and
   interruptible; everything that moves respects `prefers-reduced-motion`. The
   instrument nudges — it never alarms. *(Fixes Phase 0 §4 motion gaps.)*
6. **Honest instrumentation.** Source, freshness, and confidence are always
   visible; `INDICATOR` is never blurred into live detection; failure states are
   shown, not swallowed. *(Elevates the silent-failure path, Phase 0 §2.)*
7. **One system, many surfaces.** Tokens — never literals — drive every color,
   space, and type value, so the identity holds from a 13″ laptop to a wall display
   to a phone bottom-sheet. *(Directly answers the token-disconnect debt +
   fully-responsive mandate.)*

---

## 3. Visual directions

We treat the current UI as **Direction 0 — "Tactical HUD"** (cyan/orange cockpit)
and propose three evolutions. Each is a viable whole; we recommend one.

### Direction A — "Observatory" (refined tactical) ★ Recommended
Mature the existing DNA from *military cockpit* to *modern observatory instrument*.
Keep dark-first, keep the mono voice for data, but fix legibility and let the
identity breathe.

- **References (precise):** Linear (precision, restraint), Bloomberg terminal
  (dense data done legibly), NASA/JPL Eyes & mission-control displays (instrument
  calm), Vercel/Geist dark surfaces (layered near-blacks).
- **Color strategy:** layered near-black neutrals for surfaces; **instrument-teal**
  as the structural primary — deliberately dialled back from raw `#00ffff`, which is
  both a contrast hazard and visually harsh; **severity ramp (teal → amber → red)**
  as the semantic spine for anything hazard-weighted; **warm amber reserved almost
  exclusively for the proactive "noticed" moment**, so warmth means "pay attention."
  Per-kind marker hues stay (they're learnable and good) but are normalized for
  min-contrast against space-black.
- **Typography:** dual family. **JetBrains Mono** keeps the instrument voice for
  numerals, coordinates, and labels (tabular figures). A **humanist sans**
  (Geist Sans or Inter) carries titles and any reading text — event descriptions,
  empty states, explanatory copy. This one change removes most of the "everything
  is tiny mono" legibility failure while keeping the tactical character.
- **Density philosophy:** *dense but breathing.* Density is chosen per zone, not
  applied uniformly. A hard target/hit-size floor; clear grouping; the numbers that
  matter (CRITICAL/SEVERE) are allowed to dominate.
- **Radius / elevation / surface:** keep the squared **0.25rem** mechanical radius
  and 1px hairline borders (`DESIGN.md` already commits to this). Depth via layered
  near-black surfaces + inset shadow + vignette — **not** floating drop-shadow
  stacks.
- **Motion:** slow ambient drift (interruptible); the **fly-to is the hero motion**
  — eased, ~1s, with the warm amber cue; all motion gated by
  `prefers-reduced-motion`.
- **Dark/light:** dark-first is the identity. **Recommend dark-only for v1**, built
  entirely on tokens so a light theme becomes a theme-swap later, not a refactor.
  *(This is the recorded default for open question #5.)*
- **How the "dashboard" nature is expressed:** as a single spatial **instrument**,
  not a grid of cards — one canvas (the globe), one persistent **watch panel** (the
  notice stream), and summonable detail. Responsive: three-column on desktop → one
  column + bottom-sheet controls on mobile.

### Direction B — "Aurora" (cinematic / editorial)
Lean hard into spectacle: volumetric atmospheric glow, aurora-gradient accents,
larger typographic moments, generous negative space, cinematic depth on the fly-to.
References: Zoom.earth × an Apple keynote × a planetarium.
- **Upside:** maximum "wow"; strongest as a hero/marketing artifact.
- **Downside:** drifts toward *toy / marketing site*; weaker as a sustained
  instrument; higher motion and GPU cost — in tension with "hold up under real use"
  and with fully-responsive performance on phones.

### Direction C — "Field Console" (utilitarian ops)
Strip the theatre, maximize function: flat, high-contrast, information-first, denser
tables, keyboard-driven, minimal motion. References: air-traffic / raw ops boards.
- **Upside:** best pure legibility and a11y; cheapest to run.
- **Downside:** discards the differentiator — the "it notices and turns to face it"
  magic — and reads generic. Contradicts the "dazzle" half of the mandate.

---

## 4. Recommendation

**Adopt Direction A — "Observatory."**

It is the only option that satisfies *both* halves of the audience decision. It
**sharpens** the signature spectacle (the fly-to becomes more cinematic and more
legible, not less) while directly repairing the three worst Phase 0 problems —
the dead token system, the 6–9px legibility failure, and the collapsed mobile IA.
B over-indexes on dazzle and undermines "hold up"; C over-indexes on function and
kills the magic. A is the synthesis, and it is the smallest, safest distance from
the current identity — an evolution the codebase and the brand can absorb without
whiplash (and without reintroducing the mode-sprawl that commit `4d6f061` already
pruned).

> **Team note (Frontend Designer ↔ Frontend Developer).** The Designer pushed for
> some of Aurora's atmospheric glow on the globe; the Developer flagged the GPU cost
> against the fully-responsive/mobile mandate and the existing per-marker `useFrame`
> load. **Resolution:** adopt Aurora's glow *only* on the hero fly-to moment (bounded,
> transient, reduced-motion-aware), not as an always-on ambient effect. Best of both;
> mobile stays smooth.

### What Phase 2 will specify (once you confirm A)
1. Complete token system — color (semantic), type scale, spacing, radius, shadow,
   border, opacity, motion.
2. Layout architecture — the responsive shell (desktop three-column → mobile
   single-column + bottom sheet), content-width strategy, and the unified
   **watch-panel** notice model that replaces the two competing feeds.
3. Key screens & every state — including the missing **"all clear"** empty state,
   real error surface, and skeletons.
4. Component strategy — atomic vs. composite, one unified detail/selection model,
   per-component a11y contracts, build-vs-adopt.
5. Technical implementation & migration — folder structure, how to retire the 121
   inline literals onto tokens incrementally, memoization/perf notes for the
   data-heavy poll loop, and whether to adopt a component/token toolchain.

---

## 5. Open questions blocking nothing (recorded defaults)

- **#5 Light mode** — default: **dark-only v1**, token-ready for light. Overturn if
  you want a light theme designed now.
- **#7 Deforestation / GEE / weather** — default: **remove** the dead deforestation
  path; keep **GEE + weather as optional context layers**, not first-class. Overturn
  if deforestation is meant to return with a real source.

Both are reversible and recorded in [`LEDGER.md`](LEDGER.md).
