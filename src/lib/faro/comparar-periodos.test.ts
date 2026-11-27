/**
 * comparar-periodos — LA CERCA DEL HUECO 2 DE COBERTURA
 * (registro HUECO-COMPARAR-PERIODOS-REGISTRO.md en
 * runpod-comparacion): la semana, la quincena y los meses
 * nombrados comparan a igual tramo, con la doctrina del fallo
 * de los meses extendida tramo a tramo. El libro es el de la
 * cuenta de cobertura (hoy 2026-10-22, jueves): esta semana
 * (lun 19 a hoy) no trae salidas; la pasada al mismo día
 * (lun 12 a jue 15) trae remesa Luz 7000, comida 15000 y ropa
 * 9000 = 31000. Esta quincena (16 a hoy) trae la comida en
 * córdobas que se ve 10000; la pasada al mismo día (1 a 7)
 * trae la renta 80000 y las dos suscripciones que el libro
 * fecha el día 1 de su mes (4999 + 3000) = 87999, por la
 * convención de lineDate de la casa. Octubre y septiembre,
 * a igual tramo, suman 181499 y 131199: todas sus líneas
 * caen dentro del tramo por esa misma convención.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, classifyBankQuestion } from "./ask2.ts";
import { addReading, cardsOf, payCard } from "./cards.ts";
import { addLent } from "./debts.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLoan } from "./loans.ts";
import { addRemitPerson } from "./remit-people.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const PREV2 = "2026-08";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function libro(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "cla1", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 18000, bookedOn: "2026-10-12" }),
      line({ id: "cla2", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 12000, bookedOn: "2026-10-19" }),
      line({ id: "ven", kind: "income-variable" as LineKind, concept: "Ventas", amountMinor: 12000, bookedOn: "2026-10-20" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-10-03" }),
      line({ id: "luz", kind: "expense-variable" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-09" }),
      line({ id: "des", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 25000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-11" }),
      line({ id: "com1", kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: 15000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-14" }),
      line({ id: "com2", kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: 366243, currency: "NIO", categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-16" }),
      line({ id: "gas", kind: "expense-variable" as LineKind, concept: "Gasolina", amountMinor: 6000, categoryId: "f-transporte", subId: "f.transporte.gasolina", bookedOn: "2026-10-08" }),
      line({ id: "rop", kind: "purchase" as LineKind, concept: "Ropa", amountMinor: 9000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-15" }),
      line({ id: "apa1", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal", bookedOn: "2026-10-06" }),
      line({ id: "apa2", kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: "2026-10-06" }),
      line({ id: "rem1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      line({ id: "rem2", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 7000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-13", to: "luz" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
      line({ id: "gim", kind: "subscription" as LineKind, concept: "Gimnasio", amountMinor: 3000, recurring: true, nextDue: "2026-11-01", bookedOn: "2026-08-15" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "sal0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: PREV }),
      line({ id: "cla0", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 20000, bookedOn: "2026-09-15", monthKey: PREV }),
      line({ id: "ren0", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-09-03", monthKey: PREV }),
      line({ id: "luz0", kind: "expense-variable" as LineKind, concept: "Luz", amountMinor: 4200, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-09", monthKey: PREV }),
      line({ id: "des0", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 22000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-09-11", monthKey: PREV }),
      line({ id: "gas0", kind: "expense-variable" as LineKind, concept: "Gasolina", amountMinor: 5000, categoryId: "f-transporte", subId: "f.transporte.gasolina", bookedOn: "2026-09-08", monthKey: PREV }),
      line({ id: "rem0", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 15000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-09-10", monthKey: PREV, to: "mama" }),
      line({ id: "apa0", kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 15000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: "2026-09-06", monthKey: PREV }),
      line({ id: "net0", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, bookedOn: "2026-08-28", monthKey: PREV }),
    ],
  };
  ledger.months[PREV2] = {
    lines: [
      line({ id: "sal00", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-08-05", monthKey: PREV2 }),
      line({ id: "ren00", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-08-03", monthKey: PREV2 }),
      line({ id: "des00", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 20000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-08-11", monthKey: PREV2 }),
      line({ id: "rem00", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 12000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-08-10", monthKey: PREV2, to: "mama" }),
    ],
  };
  ledger = addRemitPerson(ledger, "Mamá", "mama").state;
  ledger = addRemitPerson(ledger, "Luz", "luz").state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLent(ledger, { id: "lent2", person: "Ana", kind: "plain", amountMinor: 10000, currency: "USD", aprBps: 0, startedOn: "2026-09-02", dueOn: "2026-12-01", note: "" });
  ledger = addLoan(ledger, { id: "loan1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 100000, currency: "USD", aprBps: 0, takenOn: "2026-06-15", book: "fixed", note: "" });
  const card = cardsOf(ledger)[0];
  if (card) {
    ledger = addReading(ledger, card.id, { balanceMinor: 45000, availMinor: 55000, src: "shot", on: "2026-10-15" }, TODAY);
    ledger = payCard(ledger, card.id, 10000, "2026-10-18", "pago1", "Pago de tarjeta");
  }
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string) {
  return answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY);
}

describe("hueco 2 de cobertura · comparar con semana, quincena y meses nombrados", () => {
  const ledger = libro();

  it("S1: «compara mis gastos de esta semana con la anterior» — semana contra semana a igual tramo", () => {
    const r = ask(ledger, "Compara mis gastos de esta semana con la anterior");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor), [0, 31000]);
    assert.ok(r.verdict.includes("A igual tramo"), r.verdict);
  });

  it("S2: «¿En qué gasté más esta semana comparado con la pasada?» — la comparación se recupera de historia", () => {
    const r = ask(ledger, "¿En qué gasté más esta semana comparado con la pasada?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
  });

  it("Q1: «diferencia de gastos entre esta quincena y la pasada» — quincena contra quincena a igual tramo", () => {
    const r = ask(ledger, "Diferencia de gastos entre esta quincena y la pasada");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor), [10000, 87999]);
  });

  it("Q2: «diferencia de ingresos entre esta quincena y la pasada» — la dirección de ingreso manda", () => {
    const r = ask(ledger, "Diferencia de ingresos entre esta quincena y la pasada");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor), [24000, 100000]);
  });

  it("M1: «comparame octubre contra septiembre en gastos» — dos meses nombrados, el en curso a igual tramo", () => {
    const r = ask(ledger, "Comparame octubre contra septiembre en gastos");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor).sort((x, y) => x - y), [131199, 181499]);
  });

  it("M1b: «¿Este mes me rindió más el dinero que en septiembre?» — este mes contra un mes nombrado, en ingreso", () => {
    const r = ask(ledger, "¿Este mes me rindió más el dinero que en septiembre?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor).sort((x, y) => x - y), [120000, 142000]);
  });

  it("M2: «este mes contra el pasado sin contar la renta» — la exclusión en los dos lados", () => {
    const r = ask(ledger, "Este mes contra el pasado sin contar la renta");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.deepEqual(r.pieces.map((p) => p.minor), [101499, 51199]);
  });

  it("C1: «¿cuánto gasté este mes?» sigue en historia", () => {
    const r = ask(ledger, "¿Cuánto gasté este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
  });

  it("C2: «¿Gasté más en comida o en transporte?» sigue en la rama de dos filtros", () => {
    const r = ask(ledger, "¿Gasté más en comida o en transporte?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.pieces.some((p) => p.minor === 25000), JSON.stringify(r.pieces));
    assert.ok(!r.pieces.some((p) => p.minor === 181499), JSON.stringify(r.pieces));
  });

  it("C3: el clasificador oye la semana y la quincena como comparar", () => {
    assert.equal(classifyBankQuestion("¿Cómo van mis gastos de esta semana contra la anterior?").family, "comparar");
    assert.equal(classifyBankQuestion("¿Cuál es la diferencia de gastos entre esta quincena y la pasada?").family, "comparar");
  });
});
