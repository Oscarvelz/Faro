import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMirror, funderOf, fundingMapOf, makeDeclaration, makeMirror, mirrorExists, stampFunding } from "./funding.ts";
import { createInitial, isLedgerDeep } from "./defaults.ts";
import { previewFor } from "./share.ts";
import type { Line } from "./types.ts";

const book = () => createInitial("es");
const MARIA = { id: "cuenta-maria", name: "María" };
let n = 0;
const ids = () => `m-${++n}`;
const aLine = (over: Partial<Line> = {}): Line => ({
  id: "l-1", seriesId: "s-1", monthKey: "2026-11", kind: "expense-variable", concept: "Mercado", amountMinor: 4500,
  currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
  productCode: "", productUrl: "", cadence: "" as Line["cadence"], nextDue: "", aprBps: 0, balanceMinor: null,
  balanceCurrency: "USD", icon: "", history: [], bookedOn: "2026-11-03", ...over,
});

test("libro396 · el mapa manda: quién financia cada área, y el sello al nacer", () => {
  const s = book();
  const cat = s.structure.categories[0].id;
  assert.equal(funderOf(s, cat), null); // sin mapa: el dueño
  const withMap = { ...s, funding: { [cat]: "cuenta-maria" } };
  assert.equal(funderOf(withMap, cat), "cuenta-maria");
  assert.equal(funderOf({ ...s, funding: { [cat]: "  " } }, cat), null); // lectura desconfiada
  const line = aLine({ categoryId: cat });
  assert.equal(stampFunding(line, withMap).fundedBy, "cuenta-maria");
  assert.equal(stampFunding(line, s).fundedBy, undefined); // el dinero del dueño no se marca
  assert.equal(stampFunding({ ...line, fundedBy: "cuenta-maria" }, s).fundedBy, undefined); // el mapa manda: marca vieja fuera
  assert.ok(fundingMapOf(withMap).find((f) => f.cat === cat && f.by === "cuenta-maria"));
});

test("libro396 · la vista previa lee el mapa (la C5 dice la verdad del dinero)", () => {
  const s = book();
  const cat = s.structure.categories[0].id;
  const pv = previewFor({ ...s, funding: { [cat]: "cuenta-maria" } }, { all: true }, "note");
  assert.equal(pv.fundedBy.find((f) => f.cat === cat)?.by, "cuenta-maria");
  assert.equal(pv.fundedBy.find((f) => f.cat !== cat)?.by, "owner");
});

test("libro396 · el reflejo: nace una vez, enlazado, y queda si la compartida muere", () => {
  const hers = book();
  const cat = hers.structure.categories[0].id;
  const shared = aLine({ id: "shared-1", categoryId: cat, fundedBy: "cuenta-maria", by: "cuenta-maria", byName: "María" });
  const once = applyMirror(hers, shared, "dueno-1", ids);
  assert.ok(mirrorExists(once, "dueno-1", "shared-1"));
  const mirror = Object.values(once.months).flatMap((m) => m.lines).find((l) => l.mirrorOf);
  assert.ok(mirror);
  assert.equal(mirror!.fundedBy, undefined); // en su libro es dinero propio: sin marca
  assert.equal(mirror!.by, "cuenta-maria"); // la procedencia queda
  const twice = applyMirror(once, shared, "dueno-1", ids);
  assert.equal(twice, once); // deduplicado por el enlace: la misma referencia
  // La compartida muere (lápida en SU libro): el reflejo ni se entera.
  const sharedBook = { ...book(), tombstones: [{ id: "shared-1", at: "2026-11-22T00:00:00.000Z", by: "dueno-1" }] };
  assert.equal(sharedBook.tombstones!.length, 1);
  assert.ok(mirrorExists(twice, "dueno-1", "shared-1"));
  const direct = makeMirror(shared, hers, "dueno-1", ids);
  assert.equal(direct.categoryId, cat); // la categoría existe en su estructura: se conserva
});

test("libro396 · la declaración: firmada, marcada, con SU nombre de cuenta — y ninguna cuenta de la casa", () => {
  const base = aLine({ id: "d-1" });
  const decl = makeDeclaration(base, MARIA, "  Mi cuenta del banco  ");
  assert.equal(decl.declaration, true);
  assert.equal(decl.declaredAccount, "Mi cuenta del banco"); // su nombre, recortado
  assert.equal(decl.fundedBy, "cuenta-maria");
  assert.equal(decl.by, "cuenta-maria");
  assert.equal(decl.byName, "María"); // firmada como declaración, no como hecho
});

test("libro396 · el cargador profundo admite las formas nuevas y rechaza las rotas", () => {
  const s = book();
  const cat = s.structure.categories[0].id;
  const line = aLine({ categoryId: cat, fundedBy: "cuenta-maria", mirrorOf: { book: "b", line: "l" }, declaration: true, declaredAccount: "X" });
  const good = { ...s, funding: { [cat]: "cuenta-maria" }, months: { "2026-11": { lines: [line] } } };
  assert.equal(isLedgerDeep(good), true);
  const badMirror = { ...good, months: { "2026-11": { lines: [{ ...line, mirrorOf: { book: 3, line: "l" } }] } } };
  assert.equal(isLedgerDeep(badMirror as never), false);
  const badFunding = { ...good, funding: { [cat]: 7 } };
  assert.equal(isLedgerDeep(badFunding as never), false);
});
