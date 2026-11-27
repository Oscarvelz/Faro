/**
 * historia-lista — LA CERCA DEL HUECO 1 DE COBERTURA (registro
 * HUECO-HISTORIA-LISTA-REGISTRO.md en runpod-comparacion): la
 * lista de movimientos dentro de historia y las formas
 * coloquiales de la suma. El libro es el de la cuenta de
 * cobertura: octubre trae 11 movimientos de salida que no son
 * ahorro (renta 80000, remesa Mamá 17000, despensa 25000,
 * comida 15000 y comida NIO que se ve 10000, remesa Luz 7000,
 * ropa 9000, gasolina 6000, internet 4999, gimnasio 3000 y luz
 * 4500; total 181499) y septiembre 6.
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

describe("hueco 1 de cobertura · la lista de movimientos y la suma coloquial", () => {
  const ledger = libro();

  it("L1: «muéstrame los movimientos de este mes» — la lista del mes, con su suma", () => {
    const r = ask(ledger, "Muéstrame los movimientos de este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 11);
    assert.ok(r.verdict.includes("$1,814.99"), r.verdict);
    assert.equal(r.pieces.length, 5);
  });

  it("L2: «dame el historial de septiembre» — la lista del mes nombrado", () => {
    const r = ask(ledger, "Dame el historial de septiembre");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 6);
  });

  it("L3: «buscame los gastos de gasolina de este mes» — la lista con filtro", () => {
    const r = ask(ledger, "Buscame los gastos de gasolina de este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 1);
    assert.ok(r.verdict.includes("$60.00"), r.verdict);
  });

  it("L4: «movimientos mayores a 100 dólares de este mes» — la lista con umbral", () => {
    // El umbral cae sobre la vista: la comida en córdobas se ve
    // en 10000 exactos y entra; quedan renta, despensa, las dos
    // comidas y la remesa de Mamá: 5 líneas.
    const r = ask(ledger, "Movimientos mayores a 100 dólares de este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 5);
  });

  it("L5: «¿Qué compré el sábado pasado?» — el día sin líneas declara su lista vacía", () => {
    const r = ask(ledger, "¿Qué compré el sábado pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 0);
  });

  it("S1: «cuanto se me fue en comida este mes» — la suma coloquial, en forma de suma", () => {
    const r = ask(ledger, "Cuanto se me fue en comida este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].label, "este mes");
    assert.equal(r.pieces[0].minor, 25000);
  });

  it("S2: «¿Qué tanto he dejado en gasolina este mes?» — la suma con «qué tanto»", () => {
    const r = ask(ledger, "¿Qué tanto he dejado en gasolina este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 6000);
  });

  it("S3: «gasto en transporte este mes» — la forma desnuda con ciudadano", () => {
    const r = ask(ledger, "Gasto en transporte este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 6000);
  });

  it("S4: «total gastado en despensa este mes» — la forma desnuda con «total»", () => {
    const r = ask(ledger, "Total gastado en despensa este mes");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 50000);
  });

  it("L6: «¿Qué pagos se cobraron ayer en la tarjeta?» — la lista del día (el plegado dice «pago»)", () => {
    const r = ask(ledger, "¿Qué pagos se cobraron ayer en la tarjeta?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 0);
  });

  it("L7: «muéstrame los últimos 10 gastos» — la lista en plural con cuenta es lista, no recencia", () => {
    const r = ask(ledger, "Muéstrame los últimos 10 gastos");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.lines, 11);
  });

  it("S5: «¿En qué se me fueron esos 2,800 córdobas del martes?» — la suma del «en qué se me fue»", () => {
    const r = ask(ledger, "¿En qué se me fueron esos 2,800 córdobas del martes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
  });

  it("C0a: «¿Cuáles son las fechas en las que pago mis cuotas?» no es historia (es agenda)", () => {
    const r = ask(ledger, "¿Cuáles son las fechas en las que pago mis cuotas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.notEqual(r.family, "historia");
  });

  it("C0b: «¿En qué se me va el dinero?» no es historia (es relator: el presente «se me va» no entra)", () => {
    const r = ask(ledger, "¿En qué se me va el dinero?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.notEqual(r.family, "historia");
  });

  it("C1: «¿cuál fue mi último gasto?» sigue en recencia, no en la lista", () => {
    const r = ask(ledger, "¿Cuál fue mi último gasto?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "recencia");
  });

  it("C2: «¿cuánto gasté en comida este mes?» sigue en la suma de la puerta 5", () => {
    const r = ask(ledger, "¿Cuánto gasté en comida este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].label, "este mes");
    assert.equal(r.pieces[0].minor, 25000);
  });

  it("C3: «¿Cuál fue mi gasto más grande?» sigue en extremos", () => {
    const r = ask(ledger, "¿Cuál fue mi gasto más grande?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "extremos");
  });

  it("C4: el clasificador oye las formas nuevas como historia", () => {
    assert.equal(classifyBankQuestion("¿Cuánto se me fue en comida este mes?").family, "historia");
    assert.equal(classifyBankQuestion("Muéstrame los movimientos de este mes").family, "historia");
  });
});
