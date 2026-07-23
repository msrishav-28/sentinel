// ─── Design tokens — the single source of truth ──────────────────────────────
//
// Sentinel's redesign rule #1: drive every color / space / type value from
// tokens, never literals. These typed objects are that source of truth; the
// matching CSS custom properties live in `index.css` (kept in sync by name).
//
// Direction: "cinematic instrument" — Observatory substrate + JARVIS accent.
// Dark-only v1, but every value is a token so a light theme is a later swap,
// not a refactor.

// ── Color ─────────────────────────────────────────────────────────────────────
// Blue-biased near-blacks (space black). Bright cyan glows on glass; text stays
// calm. Severity hues live in `hazards/types.ts` (the portable core) so the globe
// and the UI agree — see `severityColor`.
export const color = {
  ground: "#04060c", // deepest — the void behind everything
  surface1: "#080c14", // panels
  surface2: "#0d1220", // raised panels / hero
  popover: "#111828", // detail panels, menus

  hairline: "rgba(120,180,210,0.16)", // 1px cool steel divider
  hairlineStrong: "rgba(120,180,210,0.34)",

  teal: "#3fb8cf", // instrument structure + calm accent
  cyan: "#62e6f4", // bright glass/glow — active / focus / hero only
  amber: "#ffb454", // the one warm intrusion: the proactive "noticed" moment

  text1: "#e7f1f5", // primary reading text (AA on all surfaces)
  text2: "#97b0ba", // secondary
  text3: "#596b73", // muted — decorative / texture tier only

  ok: "#3fd68a", // source online / success (semantic, not accent)
  off: "#5a6b74", // source offline / disabled
  danger: "#ff4d4d", // critical / destructive
} as const;

// ── Typography — "Mission Telemetry" ──────────────────────────────────────────
// Three faces, three jobs. Distinctive on purpose (never generic-SaaS Inter):
//   display → chrome, headers, labels, wordmark (Chakra Petch, cut-corner HUD)
//   data    → coords, counts, timestamps (Martian Mono, wide telemetry readout)
//   read    → event titles, prose (Saira, technical but readable)
//   alt     → the wordmark alternate (Orbitron)
export const font = {
  display: "'Chakra Petch', system-ui, sans-serif",
  data: "'Martian Mono', ui-monospace, 'JetBrains Mono', monospace",
  read: "'Saira', system-ui, -apple-system, sans-serif",
  alt: "'Orbitron', 'Chakra Petch', sans-serif",
} as const;

// Only these weights are embedded — using any other triggers faux-bold, so the
// map is deliberately restricted to what ships.
export const weight = {
  data: 400,
  read: 500,
  dataBold: 600,
  label: 600,
  display: 700,
  alt: 900,
} as const;

// Type scale in px. `micro` is the decorative-texture tier only (balanced-AA:
// never sole meaning). `xs` (12) is the floor for anything meaningful.
export const fontSize = {
  micro: 10,
  xs: 12,
  sm: 13,
  base: 14,
  lg: 16,
  xl: 19,
  display: 26,
} as const;

export const tracking = {
  tight: "0.02em",
  label: "0.1em", // uppercase HUD labels
  wide: "0.18em", // section headers
  wordmark: "0.06em",
} as const;

// ── Space / radius ────────────────────────────────────────────────────────────
export const space = {
  1: 2,
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  8: 16,
  10: 20,
  12: 24,
  16: 32,
} as const;

export const radius = {
  sm: 2, // squared, mechanical
  md: 3,
} as const;

// ── Motion ────────────────────────────────────────────────────────────────────
// The instrument nudges, it never startles. Anything moving must also honor
// prefers-reduced-motion at the component level.
export const duration = {
  fast: 120,
  base: 200,
  slow: 320,
  cinematic: 1000, // the hero fly-to
} as const;

export const easing = {
  tactical: "cubic-bezier(0.2, 0, 0, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

// ── z-index scale ─────────────────────────────────────────────────────────────
export const z = {
  globe: 100,
  hud: 800,
  sidebar: 900,
  overlay: 1500,
  detail: 2000,
} as const;
