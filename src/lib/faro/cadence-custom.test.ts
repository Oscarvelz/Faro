import assert from "node:assert/strict";
import test from "node:test";
import { customFreqsFor, customFreqsOf, customToken, dropFreq, intervalOf, monthlyFactor, nextDueFrom, rememberFreq, sameCadence, stepDate, cadenceLabel } from "./cadence.ts";
import { monthlyEquivalent, payDates } from "./money.ts";

const base: any = { v: 1, structure: {}, months: { "2026-11": { lines: [{ id: "x", cadence: "3w" }] } }, settings: { display: "USD" }, audit: [], revision: 2, updatedAt: "" };

test("custom tokens: bounds and canonical forms", () => {
  assert.equal(customToken(3, "w"), "3w");
  assert.equal(customToken(1, "w"), "weekly");
  assert.equal(customToken(10, "d"), "10d");
  assert.equal(customToken(1, "m"), "monthly");
  assert.equal(customToken(24, "m"), "2y");
  assert.equal(customToken(2, "y"), "2y");
  assert.equal(customToken(0, "d"), "");
  assert.equal(customToken(366, "d"), "");
  assert.equal(customToken(53, "w"), "");
  assert.equal(customToken(61, "m"), "");
  assert.equal(customToken(11, "y"), "");
  assert.equal(customToken(2.5, "w"), "");
});

test("custom cadence math is real: steps, pay dates, next due, monthly equivalent", () => {
  assert.deepEqual(intervalOf("3w"), { every: 21, unit: "d" });
  assert.equal(stepDate("2026-11-04", "3w"), "2026-11-25");
  assert.equal(stepDate("2026-01-31", "5m"), "2026-06-30");
  assert.equal(stepDate("2028-02-29", "2y"), "2030-02-28");
  assert.deepEqual(payDates("2026-11-01", "3w", "2026-12-31"), ["2026-11-01", "2026-11-22", "2026-12-13"]);
  assert.equal(nextDueFrom("2026-10-01", "10d", "2026-11-04"), "2026-11-10");
  assert.ok(Math.abs(monthlyFactor("3w") - 365 / (12 * 21)) < 1e-9);
  assert.equal(monthlyEquivalent(2100, "3w"), Math.round((2100 * 365) / 252));
  assert.equal(monthlyEquivalent(2400, "2y"), 100);
  assert.equal(monthlyEquivalent(500, "5m"), 100);
  assert.equal(cadenceLabel("3w", "es"), "Cada 3 semanas");
  assert.equal(cadenceLabel("3w", "en"), "Every 3 weeks");
  assert.equal(cadenceLabel("2y", "es"), "Cada 2 años");
});

test("same rhythm written two ways compares equal", () => {
  assert.ok(sameCadence("7d", "weekly"));
  assert.ok(sameCadence("2w", "14d"));
  assert.ok(sameCadence("12m", "yearly"));
  assert.ok(sameCadence("24m", "2y"));
  assert.ok(!sameCadence("15d", "2w"));
  assert.ok(!sameCadence("1m", "4w"));
});

test("remember: newest first, last 4, de-duplicated against presets and itself, lines untouched", () => {
  let s = rememberFreq(base, "3w");
  assert.deepEqual(s.freqCustom, ["3w"]);
  assert.equal(rememberFreq(s, "21d"), s, "same rhythm again is a no-op");
  assert.equal(rememberFreq(s, "weekly"), s, "a preset is never stored");
  assert.equal(rememberFreq(s, "3m"), s, "a pool preset (Trimestral) is never stored");
  for (const t of ["10d", "5m", "2y", "4w"]) s = rememberFreq(s, t);
  assert.deepEqual(s.freqCustom, ["4w", "2y", "5m", "10d"]);
  s = rememberFreq(s, "5m");
  assert.deepEqual(s.freqCustom, ["5m", "4w", "2y", "10d"], "re-using moves it first");
  assert.deepEqual(s.months, base.months);
  assert.equal(s.revision, 2);
  assert.deepEqual(customFreqsFor(s, ["weekly", "biweekly", "monthly", "yearly", "4w"]), ["5m", "2y", "10d"]);
  const j = JSON.parse(JSON.stringify(s));
  assert.deepEqual(customFreqsOf(j), ["5m", "4w", "2y", "10d"], "survives sync/backup JSON");
  assert.deepEqual(customFreqsOf({ ...base, freqCustom: ["nope", "3w", "21d", 4] }), ["3w"]);
});

test("drop forgets one; the last one removes the field", () => {
  let s = rememberFreq(rememberFreq(base, "3w"), "10d");
  s = dropFreq(s, "21d");
  assert.deepEqual(s.freqCustom, ["10d"]);
  s = dropFreq(s, "10d");
  assert.equal(s.freqCustom, undefined);
  assert.equal(dropFreq(s, "10d"), s);
  assert.equal(s.months["2026-11"].lines[0].cadence, "3w", "a line using it keeps it");
});
