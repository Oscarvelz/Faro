// Holidays (node --test --experimental-strip-types src/lib/faro/holidays.test.ts).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { easter, holidaysFor } from "./holidays.ts";

const days = (lang: "es" | "en", y: number, m: number) => holidaysFor(lang, y, m).map((h) => h.day);

describe("holidays", () => {
  it("computes Easter", () => {
    assert.deepEqual(easter(2026), [4, 5]);
    assert.deepEqual(easter(2027), [3, 28]);
    assert.deepEqual(easter(2024), [3, 31]);
    assert.deepEqual(easter(2025), [4, 20]);
  });
  it("Nicaragua 2026", () => {
    assert.deepEqual(days("es", 2026, 4), [2, 3]);
    assert.equal(holidaysFor("es", 2026, 4)[1].name, "Viernes Santo");
    assert.deepEqual(days("es", 2026, 9), [14, 15]);
    assert.deepEqual(days("es", 2026, 12), [7, 8, 25]);
    assert.equal(holidaysFor("es", 2026, 12)[0].kind, "fest");
    assert.deepEqual(days("es", 2026, 8), [1, 10]);
    assert.deepEqual(days("es", 2026, 5), [1, 30]);
    assert.deepEqual(days("es", 2026, 7), [19]);
    assert.deepEqual(days("es", 2026, 11), []);
  });
  it("Holy week crossing into March (2027)", () => {
    assert.deepEqual(days("es", 2027, 3), [25, 26]);
    assert.deepEqual(days("es", 2027, 4), []);
  });
  it("US federal 2026", () => {
    assert.deepEqual(days("en", 2026, 1), [1, 19]);
    assert.deepEqual(days("en", 2026, 2), [16]);
    assert.deepEqual(days("en", 2026, 5), [25]);
    assert.deepEqual(days("en", 2026, 9), [7]);
    assert.deepEqual(days("en", 2026, 10), [12]);
    assert.deepEqual(days("en", 2026, 11), [11, 26]);
    assert.deepEqual(days("en", 2027, 11), [11, 25]);
    assert.deepEqual(days("en", 2026, 6), [19]);
  });
});
