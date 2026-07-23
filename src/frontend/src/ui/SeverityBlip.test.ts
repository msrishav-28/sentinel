import { describe, expect, it } from "vitest";
import { HAZARD_KINDS, type Severity, severityColor } from "../hazards/types";
import { blipShape, hexToRgb } from "./SeverityBlip";

const SEVERITIES: Severity[] = [1, 2, 3, 4, 5];

describe("blipShape", () => {
  it("returns a shape for every severity", () => {
    for (const s of SEVERITIES) {
      const shape = blipShape(s);
      expect(shape.size).toBeGreaterThan(0);
      expect(shape.rings).toBeGreaterThanOrEqual(1);
      expect(shape.rate).toBeGreaterThan(0);
    }
  });

  it("scales monotonically with severity (bigger + faster = hotter)", () => {
    for (let i = 1; i < SEVERITIES.length; i++) {
      const lo = blipShape(SEVERITIES[i - 1]);
      const hi = blipShape(SEVERITIES[i]);
      expect(hi.size).toBeGreaterThan(lo.size);
      expect(hi.rate).toBeGreaterThan(lo.rate);
      expect(hi.rings).toBeGreaterThanOrEqual(lo.rings);
    }
  });
});

describe("hexToRgb", () => {
  it("parses #rrggbb into a byte tuple", () => {
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
    expect(hexToRgb("#4fb8c9")).toEqual([79, 184, 201]);
  });

  it("stays within byte range for the whole severity ramp", () => {
    for (const s of SEVERITIES) {
      for (const channel of hexToRgb(severityColor(s))) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe("sanity", () => {
  it("still tracks all 13 hazard kinds", () => {
    expect(HAZARD_KINDS).toHaveLength(13);
  });
});
