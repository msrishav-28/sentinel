# Design Brief — Sentinel

> A living-globe tactical instrument. You circle any place on an always-alive
> Earth and it hands back what's wrong there — a quake, a wildfire, an erupting
> volcano, a storm, a flood. It has weight, always in the room, and eventually
> stops waiting to be asked and starts telling you what it noticed.

## Product

Sentinel is a **planetary hazard monitor**: a live 3D globe that watches Earth
for many kinds of natural disaster, notices what's new or worsening on its own,
and quietly surfaces it. Standalone web app — no backend required.

## Tone & Differentiation

- Tactical instrument, not a dashboard. Piloting the planet, not filing a report.
- Dark-first, near-black with cyan foreground and warning-orange accent. Mono HUD.
- Differentiator: the globe is never static. It drifts, breathes, and then
  speaks first — auto-flying to the most severe recent event after you go idle.

## Hazard kinds

Earthquake · wildfire · volcano · severe storm · flood · landslide · drought ·
sea/lake ice · dust/haze. Each has a color + glyph and a 1–5 severity that
drives marker size and the noticing feed.

## Color Palette (OKLCH)

| Token | L C H | Use |
|---|---|---|
| background | 0.13 0.015 240 | Deep space black |
| foreground | 0.9 0.15 195 | Cyan tactical text |
| primary | 0.85 0.18 195 | Cyan instrument lines, reticle |
| accent | 0.85 0.25 85 | Orange threat highlight, active toggle |
| destructive | 0.62 0.24 25 | Red alert, critical |
| muted-foreground | 0.62 0.08 200 | Dim gridlines, labels |

Per-hazard marker colors live in `src/hazards/types.ts` (`KIND_META`); the
severity ramp (cyan → amber → red) lives alongside it.

## Typography

- JetBrains Mono (tactical HUD numerals, labels); Geist Mono fallback.
- Single-family monospace reinforces the instrument feel.

## Shape & depth

- Radius 0.25rem — squared, mechanical. 1px hairline borders in muted steel.
- Depth via inset shadows and vignette, not elevation stacks.

## Motion

- Globe: ambient drift when idle; pauses while piloting.
- Markers: fire embers pulse; volcanoes pulse + erupt; storms swirl; floods
  ripple; earthquakes ring.
- Proactive surfacing: after idle, a warm cue slides in and the camera auto-flies
  to the most severe recent event — the moment Sentinel earns its "weight."

## Signature detail

The proactive nudge: the instrument stops waiting to be asked and starts telling
you what it noticed — "SENTINEL noticed — …" — and flies you there.
