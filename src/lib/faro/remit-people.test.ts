import test from "node:test";
import assert from "node:assert/strict";
import { addRemitPerson, colorRemitPerson, dropRemitPeople, isRemitCat, recipientName, remitByPerson, remitHistory, renameRemitPerson } from "./remit-people.ts";

// Synthetic ledger: rate C$36.6243 per US$ (rateE4 366243). Names and amounts are made up.
const cats = [
  { id: "f-remesas", group: "fixed", role: "remittance", hidden: false, subs: [] },
  { id: "v-remesas", group: "variable", role: "remittance", hidden: false, subs: [] },
  { id: "v-comida", group: "variable", role: "food", hidden: false, subs: [] },
];
let n = 0;
const ln = (o: any) => ({ id: `l${++n}`, seriesId: "", monthKey: "", kind: "expense-variable", concept: "Envío", amountMinor: 0, currency: "USD", active: true, note: "", categoryId: "v-remesas", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...o });
const base = (): any => ({
  v: 1, structure: { categories: cats, purchases: [], catalog: [] }, settings: { display: "USD", rateE4: 366243 }, audit: [], revision: 0, updatedAt: "",
  remitPeople: [{ id: "pa", name: "Persona A" }, { id: "pb", name: "Persona B" }],
  months: {
    "2025-12": { lines: [ln({ to: "pa", amountMinor: 5000, bookedOn: "2025-12-20" })] },
    "2026-10": { lines: [ln({ to: "pa", kind: "expense-fixed", categoryId: "f-remesas", amountMinor: 10000, bookedOn: "2026-10-05" }), ln({ to: "pb", currency: "NIO", amountMinor: 366243, bookedOn: "2026-10-09" })] },
    "2026-11": { lines: [
      ln({ to: "pa", amountMinor: 12345, bookedOn: "2026-11-02" }),
      ln({ amountMinor: 2000, bookedOn: "2026-11-03" }), // Sin persona
      ln({ to: "pa", amountMinor: 999999, active: false }), // inactive: never counts
      ln({ to: "pa", categoryId: "v-comida", amountMinor: 777 }), // not Remesas
    ] },
  },
});

test("totals per person: month, year, all time, both currencies in integer minor units", () => {
  const s = base();
  const r = remitByPerson(s, "2026-11");
  const a = r.rows.find((x) => x.id === "pa")!;
  assert.deepEqual(a.month, { usd: 12345, nio: 452127 });
  assert.equal(a.year.usd, 22345);
  assert.equal(a.all.usd, 27345);
  assert.equal(a.count, 3);
  assert.equal(a.last, "2026-11-02");
  const b = r.rows.find((x) => x.id === "pb")!;
  assert.deepEqual(b.year, { usd: 10000, nio: 366243 });
  assert.deepEqual(b.month, { usd: 0, nio: 0 });
  const none = r.rows.find((x) => x.id === "")!;
  assert.equal(none.person, null);
  assert.equal(none.month.usd, 2000);
  for (const row of r.rows) for (const p of [row.month, row.year, row.all]) { assert.ok(Number.isInteger(p.usd)); assert.ok(Number.isInteger(p.nio)); }
  assert.equal(r.all.usd, 27345 + 10000 + 2000);
  assert.equal(r.month.usd, 12345 + 2000);
  assert.equal(r.rows[r.rows.length - 1]!.id, "", "Sin persona goes last");
});

test("history newest first, with book and both currencies", () => {
  const h = remitHistory(base(), "pa");
  assert.deepEqual(h.map((e) => e.date), ["2026-11-02", "2026-10-05", "2025-12-20"]);
  assert.equal(h[1]!.book, "fixed");
  assert.equal(h[0]!.nio, 452127);
});

test("add (no duplicate by name), rename, colour", () => {
  let s = base();
  const r1 = addRemitPerson(s, "  Persona C ", "pc");
  assert.equal(r1.id, "pc");
  s = r1.state;
  assert.equal(addRemitPerson(s, "persona c", "pd").id, "pc");
  s = renameRemitPerson(s, "pc", "Persona Ce");
  s = colorRemitPerson(s, "pc", "#123456");
  assert.deepEqual(s.remitPeople.find((p: any) => p.id === "pc"), { id: "pc", name: "Persona Ce", color: "#123456" });
  assert.equal(remitByPerson(s, "2026-11").rows.find((x) => x.id === "pc")!.all.usd, 0, "a new person is listed at zero");
});

test("deleting a person keeps every amount: their lines become Sin persona", () => {
  const s = base();
  const before = remitByPerson(s, "2026-11");
  const d = dropRemitPeople(s, ["pa"]);
  const after = remitByPerson(d, "2026-11");
  assert.equal(after.all.usd, before.all.usd);
  assert.equal(after.rows.find((x) => x.id === "pa"), undefined);
  assert.equal(after.rows.find((x) => x.id === "")!.all.usd, 27345 + 2000);
  assert.equal(Object.values(d.months).flatMap((b: any) => b.lines).filter((l: any) => l.to === "pa").length, 0);
  assert.equal(Object.values(d.months).flatMap((b: any) => b.lines).length, Object.values(s.months).flatMap((b: any) => b.lines).length);
  // A dangling tag (person gone elsewhere) also counts as Sin persona.
  const dangling = { ...s, remitPeople: [] };
  assert.equal(remitByPerson(dangling, "2026-11").rows.length, 1);
});

test("helpers", () => {
  const s = base();
  assert.ok(isRemitCat(s, "f-remesas"));
  assert.ok(!isRemitCat(s, "v-comida"));
  assert.equal(recipientName(s, s.months["2026-11"].lines[0]), "Persona A");
  assert.equal(recipientName(s, s.months["2026-11"].lines[1]), "");
});
