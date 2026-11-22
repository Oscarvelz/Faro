import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePassiveRecord, passiveMonths, passiveRecordsOf, withPassiveRecord, withoutPassiveRecord } from "./exit.ts";
import { createInitial, isLedgerDeep } from "./defaults.ts";
import { scopeFilter } from "./world.ts";
import type { LedgerState, Line } from "./types.ts";

const book = () => createInitial("es");
const aLine = (over: Partial<Line> = {}): Line => ({
  id: "l-1", seriesId: "s-1", monthKey: "2026-11", kind: "expense-variable", concept: "Mercado", amountMinor: 4500,
  currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
  productCode: "", productUrl: "", cadence: "" as Line["cadence"], nextDue: "", aprBps: 0, balanceMinor: null,
  balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-03", by: "cuenta-maria", byName: "María", ...over,
});

test("libro398 · el registro nace de la copia del alcance: congelado y sin nada ajeno", () => {
  const s = book();
  const cat = s.structure.categories[0].id;
  const full: LedgerState = { ...s, months: { "2026-11": { lines: [aLine({ categoryId: cat })] }, "2026-10": { lines: [aLine({ id: "l-2", monthKey: "2026-10", amountMinor: 1000 })] } } };
  const scoped = scopeFilter(full, { cats: [cat] });
  const rec = makePassiveRecord(scoped, "duena-1", "es", "2026-11-22T10:00:00.000Z", "rec-1");
  assert.equal(rec.owner, "duena-1");
  assert.deepEqual(Object.keys(rec).sort(), ["at", "categories", "id", "months", "owner"]); // ni ajustes, ni cuentas, ni auditoría
  assert.equal(rec.categories.length, 1);
  assert.ok(rec.categories[0].name.length > 0);
  // Congelado: tocar el registro no toca el libro de origen.
  rec.months["2026-11"].lines[0].concept = "TOCADO";
  assert.equal(scoped.months["2026-11"].lines[0].concept, "Mercado");
  // La firma viaja con la historia.
  assert.equal(rec.months["2026-11"].lines[0].byName, "María");
});

test("libro398 · el registro vive en MI libro: guardarlo y borrarlo no toca nada más", () => {
  const mine = book();
  const before = JSON.stringify(mine.months);
  const rec = makePassiveRecord(book(), "duena-1", "es", "2026-11-22T10:00:00.000Z", "rec-1");
  const withRec = withPassiveRecord(mine, rec);
  assert.equal(passiveRecordsOf(withRec).length, 1);
  const without = withoutPassiveRecord(withRec, "rec-1");
  assert.equal(passiveRecordsOf(without).length, 0);
  assert.equal(JSON.stringify(without.months), before); // mis meses, intactos
  assert.equal(withoutPassiveRecord(mine, "no-existe"), mine); // id ajeno: el mismo estado
});

test("libro398 · la lectura con desconfianza y la puerta de carga", () => {
  const bad = { ...book(), passiveRecords: [{ id: "x" }, null, { id: "ok", at: "2026-11-22", owner: "d", months: {}, categories: [] }] } as unknown as LedgerState;
  assert.deepEqual(passiveRecordsOf(bad).map((r) => r.id), ["ok"]); // los malformados no entran
  const good = withPassiveRecord(book(), makePassiveRecord(book(), "d", "es", "2026-11-22T00:00:00.000Z", "r1"));
  assert.equal(isLedgerDeep(JSON.parse(JSON.stringify(good))), true); // el registro cruza la puerta de carga
  const poisoned = { ...good, passiveRecords: [{ id: "x" }] } as unknown as LedgerState;
  assert.equal(isLedgerDeep(poisoned), false); // uno malformado no pasa
});

test("libro398 · el folio se lee como historia: meses y totales, del reciente al viejo", () => {
  const s = book();
  const full: LedgerState = { ...s, months: { "2026-10": { lines: [aLine({ monthKey: "2026-10", amountMinor: 1000 })] }, "2026-11": { lines: [aLine({ amountMinor: 4500 }), aLine({ id: "l-9", amountMinor: 500 })] } } };
  const rec = makePassiveRecord(full, "d", "es", "2026-11-22T00:00:00.000Z", "r1");
  assert.deepEqual(passiveMonths(rec), [
    { monthKey: "2026-11", total: 5000, count: 2 },
    { monthKey: "2026-10", total: 1000, count: 1 },
  ]);
});

test("libro398 · las ceremonias en la fuente: la copia se lee antes de salir; el traspaso tiene sus dos puertas", () => {
  const view = readFileSync(new URL("../../components/faro/shared-view.tsx", import.meta.url), "utf8");
  const leaveFn = view.slice(view.indexOf("const leave = async"));
  assert.ok(leaveFn.indexOf("fetchSharedBook") < leaveFn.indexOf("leaveMembership"), "la copia se lee mientras el acceso vive, antes de salir");
  for (const a of ["leave-passive", "leave-export", "leave-nothing"]) assert.ok(view.includes(`data-anchor="${a}"`), `la elección ${a} existe`);
  assert.ok(view.includes("acceptTransfer"), "la aceptación del traspaso vive del lado del miembro");
  const mesa = readFileSync(new URL("../../components/faro/share-mesa.tsx", import.meta.url), "utf8");
  assert.ok(mesa.includes("offerTransfer"), "la oferta del traspaso vive en la mesa del dueño");
  const folios = readFileSync(new URL("../../components/faro/passive-folios.tsx", import.meta.url), "utf8");
  assert.ok(folios.includes("withoutPassiveRecord") && !folios.includes("upsertLine"), "el folio solo se borra; no escribe líneas");
});
