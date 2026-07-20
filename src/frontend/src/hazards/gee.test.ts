import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeeTileTemplate } from "./gee";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchGeeTileTemplate", () => {
  it("returns the template when the proxy responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tileUrlTemplate: "https://ee/tiles/{z}/{x}/{y}" }),
      })),
    );
    expect(await fetchGeeTileTemplate("temperature")).toBe(
      "https://ee/tiles/{z}/{x}/{y}",
    );
  });

  it("returns null when the proxy reports GEE is not configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tileUrlTemplate: null }),
      })),
    );
    expect(await fetchGeeTileTemplate()).toBeNull();
  });

  it("returns null on a network error (no overlay, no throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await fetchGeeTileTemplate()).toBeNull();
  });
});
