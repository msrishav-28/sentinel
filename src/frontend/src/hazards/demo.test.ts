import { describe, expect, it } from "vitest";
import { seedHazards } from "./demo";
import { HAZARD_KINDS } from "./types";

describe("seedHazards", () => {
  it("returns well-formed events spanning many kinds", () => {
    const s = seedHazards(1_000_000);
    expect(s.length).toBeGreaterThan(10);
    for (const h of s) {
      expect(h.id).toMatch(/^demo:/);
      expect(HAZARD_KINDS).toContain(h.kind);
      expect(h.severity).toBeGreaterThanOrEqual(1);
      expect(h.severity).toBeLessThanOrEqual(5);
      expect(h.observedAt).toBeLessThanOrEqual(1_000_000);
      expect(Math.abs(h.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(h.lng)).toBeLessThanOrEqual(180);
    }
    expect(new Set(s.map((h) => h.kind)).size).toBeGreaterThanOrEqual(6);
  });

  it("uses unique ids", () => {
    const s = seedHazards();
    expect(new Set(s.map((h) => h.id)).size).toBe(s.length);
  });
});
