# Design Brief — Cerebro Environmental Watcher

> A living-globe tactical instrument. You circle any place on an always-alive Earth and it hands back what's wrong there: fire, vanishing forest. It has weight — always in the room — and eventually stops waiting to be asked and starts telling you what it noticed.

## Tone & Differentiation
- Tactical instrument, not a dashboard. Piloting the planet, not filing a report on it.
- Dark-first, near-black with cyan foreground and orange accent. Monospace HUD.
- Differentiator: the globe is never static. It drifts, breathes, and then speaks first.

## Color Palette (OKLCH)
| Token | L C H | Use |
|---|---|---|
| background | 0.13 0.015 240 | Deep space black |
| foreground | 0.9 0.15 195 | Cyan tactical text |
| primary | 0.85 0.18 195 | Cyan instrument lines, reticle |
| accent | 0.85 0.25 85 | Orange threat highlight, active toggle |
| destructive | 0.62 0.24 25 | Red alert, critical |
| muted-foreground | 0.62 0.08 200 | Dim gridlines, labels |
| fire-ember | 0.62 0.24 28 | Fire marker core (red-orange) |
| fire-ember-hot | 0.7 0.22 55 | Fire marker hot edge |
| deforest-green | 0.45 0.12 145 | Forest patch start |
| deforest-brown | 0.4 0.08 55 | Cleared patch end |
| ambient-cyan | 0.7 0.1 195 | Idle drift haze |
| proactive-amber | 0.78 0.16 75 | Proactive surfacing cue |

## Typography
- Display + body: JetBrains Mono (tactical HUD numerals, labels). Geist Mono fallback.
- Single-family monospace reinforces instrument feel; no sans-serif dilution.
- Type tiers: HUD label 11px / data readout 13px / section head 15px / title 20px.

## Shape Language
- Radius 0.25rem — squared, mechanical. No pillowy corners.
- 1px borders in muted steel. Hairline separators, not heavy chrome.
- Depth via inset shadows and vignette, not elevation stacks.

## Structural Zones
| Zone | Surface | Treatment |
|---|---|---|
| Globe viewport | background | Radial vignette, ambient-haze overlay, always drifting |
| Left sidebar (DATA LAYERS) | sidebar | bg-sidebar, border-r, layer toggles + threat counts |
| Right HUD panel | card | bg-card, border-l, dense readouts, proactive cue slot |
| Top status bar | card | bg-card, border-b, system clock, layer tallies |
| Bottom feed ticker | muted/40 | border-t, scrolling event feed, blink cursor |

## Motion Storyboard
- Globe: ambient-presence drift (12s) when idle; pauses on user piloting.
- Fire embers: fire-pulse (1.8s) red-orange breathing glow on markers.
- Deforestation: deforestation-fade (8s) green-to-brown slow decay loop.
- Reticle: reticle-pulse (2.4s) on selected target.
- Scanline: scanline (6s) subtle vertical sweep over globe.
- Proactive surfacing: proactive-surface-cue (0.9s) warm amber nudge-in, then auto-fly camera to target.

## Component Patterns
- Layer toggles: square checkbox + count badge, accent on active.
- Threat markers: 3D globe meshes, color-coded, click → fly + feed entry.
- HUD readouts: monospace, tabular numerals, label/value pairs.
- Feed events: timestamped single-line rows, type-colored left border.

## Constraints (doNotBuild)
- No flood threat layer. No drought threat layer.
- No email or push notifications.
- No user-saved watch regions.

## Signature Detail
- The proactive nudge: after idle, a warm amber cue slides in and the camera auto-flies to a newly noticed threat — the instrument stops waiting to be asked and starts telling you. This is the moment the app earns "weight, always in the room with you."
