import { describe, expect, it } from "vitest";
import { climateIndicators, deriveExtremeTemp } from "./climate";

describe("deriveExtremeTemp", () => {
  const points = [
    { city: "Hot", lat: 30, lon: 50, temp: 47 },
    { city: "Mild", lat: 40, lon: 0, temp: 22 },
    { city: "Cold", lat: 70, lon: 100, temp: -35 },
  ];

  it("surfaces only readings beyond the heat/cold thresholds", () => {
    const out = deriveExtremeTemp(points, 1000);
    expect(out.map((h) => h.kind).sort()).toEqual([
      "extremeCold",
      "extremeHeat",
    ]);
  });

  it("weights severity by how extreme the reading is", () => {
    const [heat] = deriveExtremeTemp([{ city: "H", lat: 0, lon: 0, temp: 49 }]);
    expect(heat.severity).toBe(5);
    const [cold] = deriveExtremeTemp([
      { city: "C", lat: 0, lon: 0, temp: -41 },
    ]);
    expect(cold.severity).toBe(5);
  });

  it("carries the temperature as magnitude and uses a stable id", () => {
    const [h] = deriveExtremeTemp([
      { city: "Delhi", lat: 28, lon: 77, temp: 44 },
    ]);
    expect(h.magnitude).toBe(44);
    expect(h.magnitudeUnit).toBe("°C");
    expect(h.id).toBe("extreme:heat:Delhi");
  });
});

describe("climateIndicators", () => {
  it("returns curated global-warming and ozone indicators with stable ids", () => {
    const out = climateIndicators();
    const kinds = new Set(out.map((h) => h.kind));
    expect(kinds.has("globalWarming")).toBe(true);
    expect(kinds.has("ozone")).toBe(true);
    expect(out.every((h) => h.source === "INDICATOR")).toBe(true);
    expect(new Set(out.map((h) => h.id)).size).toBe(out.length);
  });
});
