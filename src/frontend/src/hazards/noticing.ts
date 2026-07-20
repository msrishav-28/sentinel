// ─── Noticing engine ──────────────────────────────────────────────────────────
//
// Sentinel's differentiator is that it *notices*: between two fetches it works
// out what is genuinely new, escalating, or worsening — and surfaces only that.
//
// Design note vs. the original backend engine: we deliberately do NOT emit a
// notice for events that are merely still-present-and-unchanged ("lingering").
// The old engine emitted one every cycle for every stable event, which drowned
// the feed. A hazard that hasn't changed isn't news.

import type { HazardEvent, HazardKind, Severity } from "./types";

export type NoticeReason = "new" | "escalating" | "worsening";

export interface Notice {
  id: string; // the hazard event id this notice is about
  kind: HazardKind;
  reason: NoticeReason;
  severity: Severity;
  lat: number;
  lng: number;
  title: string;
  noticedAt: number; // epoch ms
}

export interface NoticingResult {
  notices: Notice[];
  // Fresh index (by id) of the current world, to be carried into the next diff.
  index: Map<string, HazardEvent>;
}

function toNotice(ev: HazardEvent, reason: NoticeReason, now: number): Notice {
  return {
    id: ev.id,
    kind: ev.kind,
    reason,
    severity: ev.severity,
    lat: ev.lat,
    lng: ev.lng,
    title: ev.title,
    noticedAt: now,
  };
}

export interface DiffOptions {
  // New events below this severity are tracked/rendered but not surfaced to the
  // feed, so a swarm of tiny quakes doesn't bury the signal. Default 2.
  minSeverityForNew?: Severity;
}

// Diff the previous world against the freshly fetched one and return the
// notices worth surfacing, plus the new index to carry forward.
export function diffHazards(
  prev: Map<string, HazardEvent>,
  next: HazardEvent[],
  now: number,
  opts: DiffOptions = {},
): NoticingResult {
  const minNew = opts.minSeverityForNew ?? 2;
  const notices: Notice[] = [];
  const index = new Map<string, HazardEvent>();

  for (const ev of next) {
    index.set(ev.id, ev);
    const before = prev.get(ev.id);

    if (!before) {
      if (ev.severity >= minNew) notices.push(toNotice(ev, "new", now));
      continue;
    }
    if (ev.severity > before.severity) {
      // Crossed a severity band upward — always worth surfacing.
      notices.push(toNotice(ev, "escalating", now));
    } else if (
      typeof ev.magnitude === "number" &&
      typeof before.magnitude === "number" &&
      ev.magnitude > before.magnitude * 1.1
    ) {
      // Same band, but intensified by >10% on its native magnitude.
      notices.push(toNotice(ev, "worsening", now));
    }
    // Otherwise unchanged → no notice.
  }

  return { notices, index };
}

// Rank notices for display / proactive surfacing: most severe first, then most
// recent. Returns a new array (does not mutate the input).
export function rankNotices(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.noticedAt - a.noticedAt;
  });
}

// Merge freshly-noticed events onto the front of the rolling feed, newest
// first, capped at `cap` entries.
export function mergeFeed(
  existing: Notice[],
  incoming: Notice[],
  cap = 200,
): Notice[] {
  if (incoming.length === 0) return existing;
  const combined = [...incoming, ...existing];
  return combined.length <= cap ? combined : combined.slice(0, cap);
}
