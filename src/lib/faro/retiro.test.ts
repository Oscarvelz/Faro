import test from "node:test";
import assert from "node:assert/strict";
import { dropPocketLine, restoreRetiro, seedRetiro } from "./retiro.ts";

const base: any = { v: 1, structure: { categories: [{ id: "f-ahorro", role: "savings", hidden: false, subs: [{ id: "f.ahorro.retiro", hidden: false, icon: "Flag" }] }] }, months: {}, settings: { display: "USD" }, audit: [], revision: 0, updatedAt: "" };
const pr = (s: any) => (s.months["2026-11"]?.lines ?? []).filter((l: any) => l.icon === "brand:primerica");

test("seed once, drop remembers, restore brings back", () => {
  const a = seedRetiro(base, "2026-11");
  assert.equal(pr(a).length, 1);
  assert.equal(seedRetiro(a, "2026-11"), a);
  const id = pr(a)[0].id;
  const d = dropPocketLine(a, "2026-11", id);
  assert.equal(d.archived, false);
  assert.equal(pr(d.state).length, 0);
  assert.deepEqual(d.state.retiroOff, ["primerica"]);
  assert.equal(seedRetiro(d.state, "2026-11"), d.state);
  const r = restoreRetiro(d.state, "2026-11");
  assert.equal(pr(r).length, 1);
  assert.equal(r.retiroOff, undefined);
});

test("line with history is archived and revived with it", () => {
  const a = seedRetiro(base, "2026-11");
  const l = pr(a)[0];
  const withH = { ...a, months: { "2026-11": { lines: [{ ...l, balanceMinor: 1300000, history: [{ id: "h", date: "2026-10-31", amountMinor: 1300000, currency: "USD", note: "estado:2026-10:valor" }] }] } } };
  const d = dropPocketLine(withH as any, "2026-11", l.id);
  assert.equal(d.archived, true);
  const kept = d.state.months["2026-11"].lines[0];
  assert.equal(kept.archived, true); assert.equal(kept.active, false); assert.equal(kept.history.length, 1);
  const r = restoreRetiro(d.state, "2026-11");
  assert.equal(r.months["2026-11"].lines.length, 1);
  assert.equal(r.months["2026-11"].lines[0].active, true);
  assert.equal(r.months["2026-11"].lines[0].history.length, 1);
});
