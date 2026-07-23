// ─── DetailPanel — the summoned inspector for a selected event ────────────────
//
// One tokenized panel shared by every selection (quake / fire / hazard). `accent`
// carries the per-hazard or per-severity color; everything else is driven by
// design tokens. Observatory-calm: quiet surface, hairline rows, the accent only
// tinting the title and frame.

import { color, font } from "../theme/tokens";

export interface DetailPanelProps {
  title: string;
  /** Per-hazard / per-severity accent color (hex). */
  accent: string;
  rows: Array<[string, string]>;
  onClose: () => void;
}

export default function DetailPanel({
  title,
  accent,
  rows,
  onClose,
}: DetailPanelProps) {
  return (
    <div
      style={{
        background: color.popover,
        border: `1px solid ${accent}66`,
        borderRadius: 3,
        padding: "12px 14px",
        minWidth: 210,
        maxWidth: 280,
        boxShadow: `0 0 26px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      <div
        style={{
          fontFamily: font.display,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: accent,
          marginBottom: 8,
          borderBottom: `1px solid ${accent}44`,
          paddingBottom: 6,
        }}
      >
        {title}
      </div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            padding: "4px 0",
            borderBottom: `1px solid ${color.hairline}`,
          }}
        >
          <span
            style={{
              fontFamily: font.display,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: color.text3,
              whiteSpace: "nowrap",
            }}
          >
            {k}
          </span>
          <span
            style={{
              fontFamily: font.data,
              fontSize: 12,
              color: color.text1,
              textAlign: "right",
            }}
          >
            {v}
          </span>
        </div>
      ))}
      <button
        type="button"
        onClick={onClose}
        className="pill"
        style={{ width: "100%", marginTop: 10 }}
      >
        CLOSE
      </button>
    </div>
  );
}
