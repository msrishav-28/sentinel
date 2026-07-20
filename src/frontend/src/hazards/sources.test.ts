import { describe, expect, it } from "vitest";
import { parseEonet, parseUsgs } from "./sources";

describe("parseUsgs", () => {
  const sample = {
    features: [
      {
        id: "nc73872510",
        properties: {
          mag: 5.2,
          place: "10km N of Somewhere",
          time: 1_700_000_000_000,
          url: "https://x",
        },
        geometry: { coordinates: [-122.5, 37.8, 8.1] }, // [lon, lat, depth]
      },
      // Malformed: missing mag → skipped.
      {
        id: "bad",
        properties: { place: "nowhere" },
        geometry: { coordinates: [1, 2] },
      },
    ],
  };

  it("maps a feature with correct lat/lng order and severity", () => {
    const out = parseUsgs(sample);
    expect(out).toHaveLength(1);
    const q = out[0];
    expect(q.kind).toBe("earthquake");
    expect(q.lat).toBe(37.8);
    expect(q.lng).toBe(-122.5);
    expect(q.severity).toBe(4); // mag 5.2 → severe
    expect(q.id).toBe("usgs:nc73872510");
    expect(q.source).toBe("USGS");
  });

  it("is defensive against empty / garbage input", () => {
    expect(parseUsgs({})).toEqual([]);
    expect(parseUsgs(null)).toEqual([]);
    expect(parseUsgs({ features: [] })).toEqual([]);
  });
});

describe("parseEonet", () => {
  const sample = {
    events: [
      {
        id: "EONET_1",
        title: "Wildfire A",
        categories: [{ id: "wildfires", title: "Wildfires" }],
        sources: [{ url: "https://src" }],
        geometry: [
          {
            date: "2026-07-01T00:00:00Z",
            type: "Point",
            coordinates: [10, 20],
          },
          {
            date: "2026-07-02T00:00:00Z",
            type: "Point",
            coordinates: [11, 21],
          }, // latest wins
        ],
      },
      {
        id: "EONET_2",
        title: "Volcano B",
        categories: [{ id: "volcanoes" }],
        geometry: [
          {
            date: "2026-07-02T00:00:00Z",
            type: "Point",
            coordinates: [-30, -5],
          },
        ],
      },
      // Category Sentinel doesn't surface → skipped.
      {
        id: "EONET_3",
        categories: [{ id: "manmade" }],
        geometry: [{ coordinates: [0, 0] }],
      },
    ],
  };

  it("maps categories to kinds and uses the most recent geometry", () => {
    const out = parseEonet(sample);
    expect(out.map((h) => h.kind)).toEqual(["wildfire", "volcano"]);
    const fire = out[0];
    expect(fire.lat).toBe(21); // latest geometry, [lon,lat] → lat=21
    expect(fire.lng).toBe(11);
    expect(fire.source).toBe("EONET");
  });

  it("computes a centroid for polygon geometry", () => {
    const poly = {
      events: [
        {
          id: "P",
          categories: [{ id: "floods" }],
          geometry: [
            {
              type: "Polygon",
              coordinates: [
                [
                  [0, 0],
                  [10, 0],
                  [10, 10],
                  [0, 10],
                ],
              ],
            },
          ],
        },
      ],
    };
    const out = parseEonet(poly);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("flood");
    expect(out[0].lng).toBeCloseTo(5);
    expect(out[0].lat).toBeCloseTo(5);
  });

  it("is defensive against empty / garbage input", () => {
    expect(parseEonet({})).toEqual([]);
    expect(parseEonet(null)).toEqual([]);
  });
});
