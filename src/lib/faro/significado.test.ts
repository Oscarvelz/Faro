/**
 * significado — LA BATERÍA DE SIGNIFICADO (orden de Hark tras
 * las etapas 8 y 9, 2026-11-26): las trampas que ningún banco
 * de frases caza porque cada frase, palabra por palabra, es
 * inocente. Homónimos (una persona y un servicio con el mismo
 * nombre), nombres del libro que pisan palabras de familia,
 * modalidad («tengo» de saldo contra «tengo que» de obligación)
 * y la moneda oída a mitad de la pregunta.
 *
 * Cada espécimen afirma el comportamiento correcto; el que
 * cae es el mapa, no una sorpresa.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, classifyBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addRemitPerson } from "./remit-people.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.saldo", nameKey: "f.ahorro.saldo", customName: "Saldo", icon: "", hidden: false, order: 10 });
  ahorro.subs.push({ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "", hidden: false, order: 11 });
  const added = addRemitPerson(ledger, "Luz", "luz");
  ledger = added.state;
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "luz-servicio", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-08" }),
      line({ id: "remesa-luz", kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor: 7000, categoryId: "f-remesas", subId: "f.remesas.envios", to: "luz", bookedOn: "2026-10-10" }),
      line({ id: "comida", kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: 15000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-11" }),
      line({ id: "comida-nio", kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: 366243, currency: "NIO", categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-10-12" }),
      line({ id: "ap-saldo", kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.saldo", bookedOn: "2026-10-03" }),
      line({ id: "ap-colchon", kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.colchon", bookedOn: "2026-10-03" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: PREV }),
      line({ id: "luz-servicio0", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4200, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-08", monthKey: PREV }),
      line({ id: "remesa-luz0", kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor: 5000, categoryId: "f-remesas", subId: "f.remesas.envios", to: "luz", bookedOn: "2026-09-10", monthKey: PREV }),
    ],
  };
  return ledger;
}

function ctx(ledger: LedgerState, lang: Lang = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: TODAY + "T12:00:00.000Z" };
}
function ask(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}
function sum(r: ReturnType<typeof ask>): number {
  return r.kind === "answer" ? r.pieces.reduce((a, p) => a + p.minor, 0) : -1;
}

describe("homónimos: Luz la persona y la luz el servicio", () => {
  const ledger = fixture();
  it("«¿Cuánto pagué de luz este mes?» suma el servicio, no los envíos", () => {
    const r = ask(ledger, "¿Cuánto pagué de luz este mes?");
    assert.equal(r.kind, "answer");
    assert.equal(sum(r), 4500);
  });
  it("«¿Cuánto le mandé a Luz este mes?» suma los envíos a la persona", () => {
    const r = ask(ledger, "¿Cuánto le mandé a Luz este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "remesas");
    assert.equal(sum(r), 7000);
  });
  it("«¿Cuánto le envié a Luz el mes pasado?» da el envío de septiembre", () => {
    const r = ask(ledger, "¿Cuánto le envié a Luz el mes pasado?");
    assert.equal(r.kind, "answer");
    assert.equal(sum(r), 5000);
  });
  it("«¿Cuánto le debo a Luz?» no convierte ni el servicio ni la remesa en deuda", () => {
    const r = ask(ledger, "¿Cuánto le debo a Luz?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.equal(sum(r), 0);
  });
});

describe("nombres del libro: una cuenta llamada Saldo", () => {
  const ledger = fixture();
  it("«¿Cuánto tengo en Saldo?» lee la cuenta llamada Saldo, no el total", () => {
    const r = ask(ledger, "¿Cuánto tengo en Saldo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.pieces.some((p) => p.minor === 30000), "la pieza de la cuenta Saldo");
  });
  it("«¿Cuánto tengo de saldo?» sigue siendo la familia del total", () => {
    const r = ask(ledger, "¿Cuánto tengo de saldo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "total");
  });
});

describe("modalidad: el «tengo» de obligación no es el de saldo", () => {
  const ledger = fixture();
  it("«¿Cuánto tengo que pagar este mes?» no se oye como el total", () => {
    const r = ask(ledger, "¿Cuánto tengo que pagar este mes?");
    if (r.kind === "answer") assert.notEqual(r.family, "total");
  });
  it("«Tengo que pagar la luz mañana» no recibe respuesta segura del banco", () => {
    // La propiedad que importa: una afirmación no se contesta con
    // una cifra. Queda anotado, sin cerca: el clasificador la lee
    // como pregunta de agenda (isQuestion con familia «agenda»);
    // si esa lectura manda en alguna superficie, es trabajo de
    // esa superficie, no de esta batería.
    const r = ask(ledger, "Tengo que pagar la luz mañana");
    assert.equal(r.kind, "unknown");
  });
});

describe("la moneda oída en la pregunta", () => {
  const ledger = fixture();
  it("«¿Cuánto gasté en comida este mes?» convierte la línea en córdobas a la tasa del libro", () => {
    const r = ask(ledger, "¿Cuánto gasté en comida este mes?");
    assert.equal(r.kind, "answer");
    assert.equal(sum(r), 25000);
  });
  it("«¿Cuánto gasté en comida en córdobas?» responde en la moneda pedida", () => {
    // LA MONEDA SE OYE: el total se dice primero en la moneda
    // nombrada, con la tasa del libro nombrada y el total del
    // libro al lado; las piezas siguen en la moneda de vista.
    const r = ask(ledger, "¿Cuánto gasté en comida en córdobas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.match(r.verdict, /córdobas/);
    assert.ok(r.verdict.includes("C$9,156.08"), "el total convertido a la tasa del libro (36.6243)");
    assert.equal(sum(r), 25000);
  });
  it("«¿Cuánto gasté en comida en dólares?» en un libro en dólares no cambia nada", () => {
    const r = ask(ledger, "¿Cuánto gasté en comida en dólares?");
    assert.equal(r.kind, "answer");
    assert.equal(sum(r), 25000);
  });
});
