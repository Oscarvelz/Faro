import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cadenceLabel, cadenceToken, freqPresetsOf, intervalOf, monthlyFactor, nextDueFrom, stepDate } from "./cadence.ts";
import { monthlyEquivalent, payDates } from "./money.ts";
import { copyRecurring } from "./reducer.ts";

describe("cadence intervals (1.3.76)", () => {
  it("old words load unchanged", () => {
    assert.deepStrictEqual(intervalOf("weekly"), { every: 7, unit: "d" });
    assert.deepStrictEqual(intervalOf("biweekly"), { every: 15, unit: "d" });
    assert.strictEqual(monthlyEquivalent(1200, "yearly"), 100);
    assert.deepStrictEqual(payDates("2026-01-31", "monthly", "2026-04-30"), ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("any interval steps and labels", () => {
    assert.strictEqual(stepDate("2026-11-04", "3m"), "2027-02-04");
    assert.strictEqual(stepDate("2026-11-30", "3m"), "2027-02-28");
    assert.strictEqual(stepDate("2026-11-04", "2w"), "2026-11-18");
    assert.strictEqual(stepDate("2026-11-04", "1d"), "2026-11-05");
    assert.deepStrictEqual(payDates("2026-01-31", "3m", "2026-12-31"), ["2026-01-31", "2026-04-30", "2026-07-31", "2026-10-31"]);
    assert.strictEqual(nextDueFrom("2026-10-04", "3m", "2026-11-04"), "2027-01-04");
    assert.strictEqual(cadenceLabel("3m", "es"), "Trimestral");
    assert.strictEqual(cadenceLabel("4m", "es"), "Cada 4 meses");
    assert.strictEqual(cadenceLabel("10d", "en"), "Every 10 days");
    assert.strictEqual(cadenceToken(1, "m"), "monthly");
    assert.ok(Math.abs(monthlyFactor("6m") - (1 / 6)) < 1e-9);
    assert.strictEqual(monthlyEquivalent(300, "3m"), 100);
  });
  it("presets default and sanitise", () => {
    assert.deepStrictEqual(freqPresetsOf(null), ["weekly", "biweekly", "monthly", "yearly"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assert.deepStrictEqual(freqPresetsOf({ freqPresets: ["3m", "bad", "3m", "monthly"] } as any), ["3m", "monthly"]);
  });
  it("a 3-month due carries only into its months, dated on the payment", () => {
    const line = { id: "a", seriesId: "a", monthKey: "2026-11", kind: "subscription", concept: "X", amountMinor: 100, currency: "USD", active: true, recurring: true, cadence: "3m", nextDue: "2026-11-04", bookedOn: "2026-11-04" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st: any = { months: { "2026-11": { lines: [line] } } };
    assert.strictEqual(copyRecurring(st, "2026-11", "2026-12").count, 0);
    const r = copyRecurring(st, "2026-11", "2027-02");
    assert.strictEqual(r.count, 1);
    assert.strictEqual(r.state.months["2027-02"].lines[0].nextDue, "2027-02-04");
  });
});
