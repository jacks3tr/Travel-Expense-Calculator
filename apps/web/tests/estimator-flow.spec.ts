import { describe, expect, it } from "vitest";
import { calculateBudget, defaultRates } from "../src/lib/calculator";
import { formatWordTable } from "../src/features/export/wordTableFormatter";
import { getReferenceEstimate } from "../src/features/reference/referenceService";

describe("estimator flow", () => {
  it("calculates category totals for mixed events", () => {
    const result = calculateBudget(defaultRates, [
      { name: "A", trips: 1, days: 2, people: 2, cars: 1, hours: 16 },
      { name: "B", trips: 2, days: 1, people: 1, cars: 1, hours: 8 }
    ]);

    expect(result.events).toHaveLength(2);
    expect(result.totals.grand_total).toBeGreaterThan(0);
    expect(result.totals.flight).toBeGreaterThan(0);
  });

  it("flags invalid rows and excludes them from totals", () => {
    const result = calculateBudget(defaultRates, [
      { name: "Good", trips: 1, days: 2, people: 2, cars: 1, hours: 16 },
      { name: "Bad", trips: 1, days: 2, people: 0, cars: 1, hours: 16 }
    ]);

    expect(result.invalidRows).toContain("Bad");
    expect(result.events).toHaveLength(1);
  });

  it("creates word copy output with stable headers", () => {
    const result = calculateBudget(defaultRates, [{ name: "A", trips: 1, days: 1, people: 1, cars: 1, hours: 4 }]);
    const text = formatWordTable(result);
    expect(text.startsWith("Event\tFlight\tCar\tHotel\tFood\tLabor\tVariance\tTotal")).toBe(true);
    expect(text).toContain("Totals");
  });

  it("reference lookup stays separate from manual input", async () => {
    const manualInput = [{ name: "Stable", trips: 1, days: 3, people: 2, cars: 1, hours: 10 }];
    const before = calculateBudget(defaultRates, manualInput);
    const reference = await getReferenceEstimate({ destination: "Denver" });
    const after = calculateBudget(defaultRates, manualInput);
    expect(reference.provider.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });

  it("returns non-fatal fallback when reference provider fails", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        throw new Error("network down");
      };

      const result = await getReferenceEstimate({ destination: "Nowhere" });
      expect(result.provider).toBe("offline");
      expect(result.airfare).toBe("Unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
