// ─── SeverityBlip — the living legend indicator ───────────────────────────────
//
// A Canvas-rendered "sensor blip": an additive-glow halo, a white-hot core that
// breathes, and expanding shockwave rings. Color, size, and pulse rate all scale
// with severity, so a row's blip reads *how hot* that hazard kind is at a glance —
// mirroring the globe's marker language.
//
// Why Canvas, not CSS or WebGL: flat CSS reads cheap; a WebGL context per row
// blows the browser's context budget on mobile. Canvas 2D additive compositing
// is the tasteful, cheap middle — one 2D context per blip, no shared GL state.
//
// The severity → shape mapping is a pure function (`blipShape`) so it can be
// unit-tested without a DOM. Colors come from the portable severity ramp
// (`severityColor`) so the blip can never drift from the globe.

import { useEffect, useRef } from "react";
import { type Severity, severityColor } from "../hazards/types";

export interface BlipShape {
  /** Core radius as a fraction of the canvas radius. */
  size: number;
  /** Number of concurrent expanding shockwave rings. */
  rings: number;
  /** Pulse / ring speed (higher = more urgent). */
  rate: number;
}

// Pure: severity 1..5 → motion/size shape. Higher severity is bigger, faster,
// and throws more shockwave rings. Exported for unit testing.
export function blipShape(severity: Severity): BlipShape {
  const table: Record<Severity, BlipShape> = {
    1: { size: 0.12, rings: 1, rate: 0.3 },
    2: { size: 0.14, rings: 1, rate: 0.42 },
    3: { size: 0.16, rings: 2, rate: 0.6 },
    4: { size: 0.19, rings: 2, rate: 0.85 },
    5: { size: 0.23, rings: 3, rate: 1.2 },
  };
  return table[severity];
}

// Parse a #rrggbb hex into an [r, g, b] tuple. Exported for the ramp-sync test.
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

export interface SeverityBlipProps {
  /** 1..5 for a live severity; 0 (or inactive) renders the quiet hollow ring. */
  severity: Severity | 0;
  /** When false, the blip is dimmed to its quiet state (layer toggled off). */
  active?: boolean;
  /** CSS pixel size of the square canvas. */
  size?: number;
  /** Accessible label; when omitted the canvas is aria-hidden (decorative). */
  label?: string;
}

export default function SeverityBlip({
  severity,
  active = true,
  size = 34,
  label,
}: SeverityBlipProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = size * dpr;
    cv.width = px;
    cv.height = px;
    const R = px / 2;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const quiet = !active || severity < 1;

    if (quiet) {
      ctx.clearRect(0, 0, px, px);
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = active
        ? "rgba(89,107,115,0.75)"
        : "rgba(89,107,115,0.5)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(R, R, R * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    const sev = severity as Severity;
    const shape = blipShape(sev);
    const [r, g, b] = hexToRgb(severityColor(sev));
    const rc = `rgba(${r},${g},${b}`;

    const render = (t: number) => {
      ctx.clearRect(0, 0, px, px);
      const pulse = reduce ? 1 : 0.82 + 0.18 * Math.sin(t * shape.rate * 2.4);
      const core = R * shape.size * pulse;
      ctx.globalCompositeOperation = "lighter";

      // soft glow halo
      const halo = ctx.createRadialGradient(R, R, 0, R, R, R * 0.72);
      halo.addColorStop(0, `${rc},0.55)`);
      halo.addColorStop(0.4, `${rc},0.18)`);
      halo.addColorStop(1, `${rc},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(R, R, R * 0.72, 0, Math.PI * 2);
      ctx.fill();

      // expanding shockwave rings
      if (!reduce) {
        for (let i = 0; i < shape.rings; i++) {
          const phase = (t * shape.rate * 0.55 + i / shape.rings) % 1;
          const rr = core + phase * (R * 0.86 - core);
          const a = (1 - phase) * 0.5;
          ctx.strokeStyle = `${rc},${a})`;
          ctx.lineWidth = (1.6 - phase) * dpr;
          ctx.beginPath();
          ctx.arc(R, R, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // white-hot core bleeding to the severity color
      const cg = ctx.createRadialGradient(R, R, 0, R, R, core);
      cg.addColorStop(0, "rgba(255,255,255,0.96)");
      cg.addColorStop(0.45, `${rc},0.95)`);
      cg.addColorStop(1, `${rc},0.08)`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(R, R, core, 0, Math.PI * 2);
      ctx.fill();
    };

    if (reduce) {
      render(0.0001);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      render((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [severity, active, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: "block" }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
