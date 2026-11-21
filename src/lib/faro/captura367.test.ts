/**
 * Captura Inteligente — LA BITÁCORA (brief BRIEF-BITACORA, ola 1.3.367).
 * La aceptación del brief sobre un libro calculado a mano: la serie se
 * compone en su arco fijo con sus umbrales (mínimo 4, máximo 9 — el
 * espécimen da 10 candidatas y la serie recorta el segundo mes); el año
 * delgado no tiene edición; los meses se congelan callados y el año se
 * encuaderna (los folios sueltos desaparecen); la edición guardada NO se
 * recalcula cuando el libro cambia; el año parcial se declara; y la
 * puerta juzga el contenedor sin mandar el libro a cuarentena.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { composeYearEdition, logbookOf, markEditionSeen, pendingEdition, recordedSpan, settleLogbook } from "./bitacora";
import { createInitial, isLedgerDeep } from "./defaults";
import { FEATURES } from "./mode";
import { NEWS } from "./novedades";
import { findTopic } from "../manual/topics";
import type { LedgerState, Line, Loan, Wish } from "./types";

const TODAY = "2026-01-15";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: "", monthKey: "2025-01", currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "",
    aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

/** El libro de la aceptación (año 2025, contado a mano): salario $2,000
 * cada mes + bono de $1,000 en diciembre; renta $900 y apartado $100
 * cada mes; un préstamo de $600 saldado en junio (6 pagos de $100);
 * la Leche sube 20% en 4 compras; julio gasta el triple (una compra de
 * $2,000); dos piezas de la espera dejadas por $120 en total. */
function specimen(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const put = (mk: string, l: Line) => { (ledger.months[mk] ??= { lines: [] }).lines.push({ ...l, monthKey: mk }); };
  for (let m = 1; m <= 12; m += 1) {
    const mk = `2025-${String(m).padStart(2, "0")}`;
    const dd = String(m).padStart(2, "0");
    put(mk, line({ id: `sal-${m}`, kind: "income-fixed", concept: "Salario", amountMinor: 200000, bookedOn: `2025-${dd}-15` }));
    put(mk, line({ id: `ren-${m}`, kind: "expense-fixed", concept: "Renta", amountMinor: 90000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: `2025-${dd}-05` }));
    put(mk, line({ id: `ap-${m}`, kind: "expense-fixed", concept: "Apartado", amountMinor: 10000, categoryId: "f-ahorro", subId: "f.ahorro.banco", fund: "saldo", fundHost: "f.ahorro.banco", bookedOn: `2025-${dd}-06` }));
    if (m <= 6) put(mk, line({ id: `lp-${m}`, kind: "expense-fixed", concept: "Pago préstamo", amountMinor: 10000, loanId: "loan-1", bookedOn: `2025-${dd}-20` }));
  }
  put("2025-12", line({ id: "bono", kind: "income-variable", concept: "Bono", amountMinor: 100000, bookedOn: "2025-12-20" }));
  put("2025-07", line({ id: "spike", kind: "purchase", concept: "Reparación", amountMinor: 200000, categoryId: "f-casa", bookedOn: "2025-07-11" }));
  for (const [mk, minor] of [["2025-01", 10000], ["2025-04", 10000], ["2025-07", 10000], ["2025-10", 12000]] as const) {
    put(mk, line({ id: `lec-${mk}`, kind: "purchase", concept: "Leche", amountMinor: minor, storeId: "super-1", bookedOn: `${mk}-03` }));
  }
  put("2025-01", line({ id: "host-1", kind: "expense-fixed", concept: "Banco", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 50000, bookedOn: "2025-01-02" }));
  put("2025-12", line({ id: "host-2", kind: "expense-fixed", concept: "Banco", amountMinor: 170000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 170000, bookedOn: "2025-12-02" }));
  const loan: Loan = { id: "loan-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 60000, currency: "USD", aprBps: 0, takenOn: "2025-01-10", book: "fixed", note: "" };
  ledger.loans = [loan];
  const wish = (id: string, minor: number, closedAt: string): Wish => ({
    id, concept: id, amountMinor: minor, currency: "USD", store: "", createdAt: "2025-03-01T00:00:00.000Z",
    waitHours: 48, dueAt: "2025-03-03T00:00:00.000Z", askedAt: "2025-03-03T00:00:00.000Z", renewals: 0,
    permanent: false, status: "left", closedAt,
  });
  ledger.wishes = [wish("deseo-1", 5000, "2025-04-01T00:00:00.000Z"), wish("deseo-2", 7000, "2025-09-01T00:00:00.000Z")];
  return ledger;
}

test("367 · la serie se compone en su arco y respeta el máximo de 9", () => {
  const ed = composeYearEdition(specimen(), 2025, TODAY, 12);
  assert.ok(ed, "el espécimen da edición");
  assert.equal(ed.year, 2025);
  assert.equal(ed.partial, false);
  assert.equal(ed.cards.length, 9, "10 candidatas, la serie recorta a 9");
  assert.equal(ed.cards[0].kind, "cover");
  assert.equal(ed.cards[ed.cards.length - 1].kind, "close");
  assert.match(ed.cards[0].context.es, /reúne tus bitácoras de cada mes/, "la encuadernación se dice en la primera línea");
  const kinds = ed.cards.map((c) => c.kind);
  assert.equal(kinds.filter((k) => k === "trend").length, 1, "el recorte cae sobre el segundo mes");
  const debts = ed.cards.find((c) => c.title.es === "Tus préstamos");
  assert.ok(debts && debts.kind === "compare", "la tarjeta de deudas existe por el préstamo saldado");
  assert.equal(debts.before?.minor, 60000, "al empezar el año se debían los $600 del préstamo");
  assert.equal(debts.figure?.minor, 0, "al cerrar, cero: está saldado");
  assert.match(debts.context.es, /Saliste de 1 préstamo/);
  const price = ed.cards.find((c) => c.title.es === "El precio que subió");
  assert.ok(price, "la Leche +20% en 4 compras es tarjeta");
  assert.equal(price.before?.minor, 10000);
  assert.equal(price.figure?.minor, 12000);
  const saved = ed.cards.find((c) => c.title.es === "Dinero no gastado");
  assert.ok(saved, "lo dejado en la espera ($120) supera el gasto de un día medio");
  assert.equal(saved.figure?.minor, 12000);
});

test("367 · sin meses encuadernados, la apertura no promete el tomo", () => {
  const ed = composeYearEdition(specimen(), 2025, TODAY, 0);
  assert.ok(ed);
  assert.doesNotMatch(ed.cards[0].context.es, /reúne tus bitácoras/);
});

test("367 · el año delgado no tiene edición (menos de ~6 semanas)", () => {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  (ledger.months["2025-11"] ??= { lines: [] }).lines.push(line({ id: "a", kind: "income-fixed", concept: "Salario", amountMinor: 100000, monthKey: "2025-11", bookedOn: "2025-11-10" }));
  (ledger.months["2025-11"]).lines.push(line({ id: "b", kind: "expense-fixed", concept: "Renta", amountMinor: 50000, monthKey: "2025-11", bookedOn: "2025-11-20" }));
  const span = recordedSpan(ledger, 2025);
  assert.equal(span.monthsWithLines, 1);
  const { state, changed } = settleLogbook(ledger, TODAY);
  assert.equal(changed, true, "el mes cerrado sí gana su foto callada");
  assert.equal(logbookOf(state).editions["2025"], undefined, "pero no hay edición: registro insuficiente");
  assert.ok(logbookOf(state).months["2025-11"], "la foto de noviembre existe");
});

test("367 · el asentamiento encuaderna: los meses del año desaparecen en la edición", () => {
  const ledger = specimen();
  // Fotos previas de algunos meses de 2025, como las dejó el año en curso.
  ledger.logbook = { months: {}, editions: {} };
  const pre = settleLogbook({ ...ledger, months: { ...ledger.months } }, "2025-08-01");
  assert.ok(logbookOf(pre.state).months["2025-01"], "en agosto ya había fotos de 2025");
  const bound = settleLogbook(pre.state, TODAY);
  assert.equal(bound.changed, true);
  const book = logbookOf(bound.state);
  assert.ok(book.editions["2025"], "la edición de 2025 existe");
  assert.equal(Object.keys(book.months).filter((k) => k.startsWith("2025-")).length, 0, "ningún folio suelto de 2025 queda");
  const again = settleLogbook(bound.state, TODAY);
  assert.equal(again.changed, false, "el asentamiento es idempotente");
});

test("367 · la edición es un documento: corregir el libro no la reescribe", () => {
  const { state } = settleLogbook(specimen(), TODAY);
  const frozen = logbookOf(state).editions["2025"];
  const edited = structuredClone(state);
  (edited.months["2025-03"] ??= { lines: [] }).lines.push(line({ id: "tarde", kind: "purchase", concept: "Capricho", amountMinor: 999999, monthKey: "2025-03", bookedOn: "2025-03-09" }));
  const recomposed = composeYearEdition(edited, 2025, TODAY, 12);
  assert.notDeepEqual(recomposed?.cards, frozen.cards, "recomponer daría otra serie: el libro cambió");
  assert.deepEqual(logbookOf(edited).editions["2025"], frozen, "la edición guardada sigue siendo la foto de su día");
});

test("367 · el año parcial se declara en la apertura", () => {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const put = (mk: string, l: Line) => { (ledger.months[mk] ??= { lines: [] }).lines.push({ ...l, monthKey: mk }); };
  for (let m = 8; m <= 12; m += 1) {
    const dd = String(m).padStart(2, "0");
    put(`2025-${dd}`, line({ id: `s-${m}`, kind: "income-fixed", concept: "Salario", amountMinor: 200000, bookedOn: `2025-${dd}-15` }));
    put(`2025-${dd}`, line({ id: `r-${m}`, kind: "expense-fixed", concept: "Renta", amountMinor: 90000, categoryId: "f-casa", bookedOn: `2025-${dd}-05` }));
  }
  const ed = composeYearEdition(ledger, 2025, TODAY, 5);
  assert.ok(ed, "cinco meses dan el esqueleto");
  assert.equal(ed.partial, true);
  assert.equal(ed.since, "2025-08");
  assert.match(ed.cards[0].context.es, /desde agosto/);
});

test("367 · vista y anuncio: pendingEdition y markEditionSeen", () => {
  const { state } = settleLogbook(specimen(), TODAY);
  const pending = pendingEdition(state);
  assert.ok(pending && pending.year === 2025, "Central anuncia la edición no vista");
  const seen = markEditionSeen(state, 2025, TODAY);
  assert.equal(pendingEdition(seen), null, "vista la serie, el anuncio se retira");
  assert.equal(logbookOf(seen).editions["2025"].seenAt, TODAY);
});

test("367 · la puerta y el censo: el contenedor se juzga, la entrada rota se filtra", () => {
  const ledger = specimen();
  ledger.logbook = { months: {}, editions: {} };
  assert.equal(isLedgerDeep(ledger), true, "un libro con bitácora vacía es válido");
  const broken = structuredClone(ledger) as unknown as Record<string, unknown>;
  broken.logbook = { months: "corrupto", editions: {} };
  assert.equal(isLedgerDeep(broken), false, "el contenedor roto sí es daño");
  const dirty = specimen();
  dirty.logbook = { months: { "2025-01": { month: "2025-02" } as never }, editions: { "2025": { year: 2024 } as never } };
  const read = logbookOf(dirty);
  assert.deepEqual(read, { months: {}, editions: {} }, "las entradas que no se reconocen no entran");
  assert.equal(FEATURES["folios.logbook"], "esencial", "el asiento nace declarado: leer la propia historia es esencial");
  const topic = findTopic("bitacora");
  assert.ok(topic, "el tema del Manual nace con la ola");
  assert.deepEqual(topic.keys, ["folios.logbook"]);
  assert.ok(NEWS.some((n) => n.version === "1.3.367" && n.topic === "bitacora"), "la nota de Novedades nace con su puerta");
});
