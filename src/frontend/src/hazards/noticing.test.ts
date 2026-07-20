import { describe, expect, it } from "vitest";
import { type Notice, diffHazards, mergeFeed, rankNotices } from "./noticing";
import type { HazardEvent } from "./types";

function ev(partial: Partial<HazardEvent> & { id: string }): HazardEvent {
  return {
    kind: "earthquake",
    lat: 0,
    lng: 0,
    title: "test",
    severity: 3,
    source: "TEST",
    observedAt: 1_000,
    ...partial,
  };
}

function notice(partial: Partial<Notice> & { id: string }): Notice {
  return {
    kind: "earthquake",
    reason: "new",
    severity: 3,
    lat: 0,
    lng: 0,
    title: "t",
    noticedAt: 0,
    ...partial,
  };
}

describe("diffHazards", () => {
  it("emits a 'new' notice for a previously-unseen event at/above the threshold", () => {
    const { notices, index } = diffHazards(
      new Map(),
      [ev({ id: "a", severity: 3 })],
      100,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      id: "a",
      reason: "new",
      noticedAt: 100,
    });
    expect(index.has("a")).toBe(true);
  });

  it("suppresses low-severity new events (below minSeverityForNew)", () => {
    const { notices } = diffHazards(
      new Map(),
      [ev({ id: "a", severity: 1 })],
      0,
    );
    expect(notices).toHaveLength(0);
  });

  it("does NOT emit for an unchanged event — no lingering spam", () => {
    const prev = new Map([["a", ev({ id: "a", severity: 3, magnitude: 5 })]]);
    const { notices } = diffHazards(
      prev,
      [ev({ id: "a", severity: 3, magnitude: 5 })],
      0,
    );
    expect(notices).toHaveLength(0);
  });

  it("emits 'escalating' when severity crosses a band upward", () => {
    const prev = new Map([["a", ev({ id: "a", severity: 2 })]]);
    const { notices } = diffHazards(prev, [ev({ id: "a", severity: 4 })], 0);
    expect(notices).toHaveLength(1);
    expect(notices[0].reason).toBe("escalating");
  });

  it("emits 'worsening' when magnitude climbs >10% within the same band", () => {
    const prev = new Map([["a", ev({ id: "a", severity: 3, magnitude: 100 })]]);
    const { notices } = diffHazards(
      prev,
      [ev({ id: "a", severity: 3, magnitude: 120 })],
      0,
    );
    expect(notices).toHaveLength(1);
    expect(notices[0].reason).toBe("worsening");
  });

  it("does not treat a <10% magnitude bump as worsening", () => {
    const prev = new Map([["a", ev({ id: "a", severity: 3, magnitude: 100 })]]);
    const { notices } = diffHazards(
      prev,
      [ev({ id: "a", severity: 3, magnitude: 105 })],
      0,
    );
    expect(notices).toHaveLength(0);
  });
});

describe("rankNotices", () => {
  it("orders by severity desc, then recency", () => {
    const ranked = rankNotices([
      notice({ id: "a", severity: 2, noticedAt: 10 }),
      notice({ id: "b", severity: 5, noticedAt: 1 }),
      notice({ id: "c", severity: 5, noticedAt: 9 }),
    ]);
    expect(ranked.map((n) => n.id)).toEqual(["c", "b", "a"]);
  });
});

describe("mergeFeed", () => {
  it("prepends newest and caps length", () => {
    const existing = [notice({ id: "old" })];
    const incoming = [notice({ id: "new1" }), notice({ id: "new2" })];
    const merged = mergeFeed(existing, incoming, 2);
    expect(merged.map((n) => n.id)).toEqual(["new1", "new2"]);
  });

  it("returns existing unchanged when nothing is incoming", () => {
    const existing = [notice({ id: "old" })];
    expect(mergeFeed(existing, [], 200)).toBe(existing);
  });
});
