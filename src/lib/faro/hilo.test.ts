// BATERÍA PERMANENTE · OLA 75 — EL HILO: conversaciones de varios
// turnos perturbadas a nivel de diálogo (MORTAR, de la segunda
// lectura) y las mutaciones de discurso de la tercera. Cada
// conversación nace con su libro fresco (la lección del laboratorio
// de la tercera lectura: el corredor no comparte estado entre la
// base y la variante) y la caja simulada guarda el marco como la
// caja de verdad: una respuesta con marco lo reemplaza, una sin
// marco lo conserva. Libro: octubre comida $150, renta $800 (total
// $950), septiembre comida $120, renta $800; apartado PayPal $500.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import type { BankResult, ConvoFrame } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";
import type { ParseCtx } from "./textparse.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";

function libro75(): LedgerState {
  const l = createInitial("es", "claro");
  l.settings.display = "USD";
  const ahorro = l.structure.categories.find((c) => c.id === "f-ahorro");
  if (ahorro && !ahorro.subs.some((s) => s.id === "f.ahorro.paypal")) ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  const line = (p: Partial<Line> & { id: string; kind: LineKind; amountMinor: number }): Line => ({
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, bookedOn: `${KEY}-05`, concept: "", subId: "", ...p,
  } as Line);
  l.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed", amountMinor: 100000, concept: "Salario", bookedOn: `${KEY}-01` }),
    line({ id: "renta", kind: "expense-fixed", amountMinor: 80000, concept: "Renta", categoryId: "f-casa", subId: "f.casa.renta", bookedOn: `${KEY}-03` }),
    line({ id: "comida", kind: "expense-variable", amountMinor: 15000, concept: "Comida", categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: `${KEY}-10` }),
    line({ id: "ap", kind: "expense-fixed", amountMinor: 50000, concept: "PayPal", categoryId: "f-ahorro", subId: "f.ahorro.paypal", bookedOn: `${KEY}-02` }),
  ] };
  l.months[PREV] = { lines: [
    line({ id: "sal0", kind: "income-fixed", amountMinor: 100000, concept: "Salario", monthKey: PREV, bookedOn: `${PREV}-01` }),
    line({ id: "renta0", kind: "expense-fixed", amountMinor: 80000, concept: "Renta", categoryId: "f-casa", subId: "f.casa.renta", monthKey: PREV, bookedOn: `${PREV}-03` }),
    line({ id: "comida0", kind: "expense-variable", amountMinor: 12000, concept: "Comida", categoryId: "f-alimentos", subId: "f.alimentos.super", monthKey: PREV, bookedOn: `${PREV}-10` }),
  ] };
  return l;
}

function ctx(l: LedgerState): ParseCtx {
  return { ledger: l, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` } as ParseCtx;
}

class Box {
  // ADAPTACIÓN DE CANON (integración de la Ola 75): la copia maneja
  // la conversación con el AskFrame (§20) como único marco; canon
  // lleva DOS marcos — el AskFrame de la respuesta y el ConvoFrame
  // conversacional, que es el que la caja de verdad guarda y
  // devuelve (buildConvoFrame/convoAfterFollowUp) y el que la
  // maquinaria de seguimiento de canon consume. La caja simulada
  // guarda el ConvoFrame, como la caja real: una respuesta con
  // convo lo reemplaza; una sin convo lo conserva.
  frame: ConvoFrame | null = null;
  l: LedgerState;
  constructor(l: LedgerState) { this.l = l; }
  ask(raw: string): BankResult {
    const names = makeNamer(this.l.structure, "es");
    const r = answerBankQuestion(this.l, KEY, "es", names, raw, ctx(this.l), TODAY, undefined, undefined, undefined, this.frame);
    if (r.kind === "answer" && r.convo) this.frame = r.convo;
    return r;
  }
}

function ans(r: BankResult): Extract<BankResult, { kind: "answer" }> {
  assert.equal(r.kind, "answer");
  return r as Extract<BankResult, { kind: "answer" }>;
}
const total = (r: BankResult): number => ans(r).pieces.reduce((s, p) => s + Math.max(0, p.minor), 0);

describe("hilo · MORTAR: la perturbación no rompe la conversación", () => {
  test("el seguimiento desnudo y el reformulado dan la misma cifra", () => {
    const a = new Box(libro75());
    a.ask("¿Cuánto gasté en comida este mes?");
    const plain = a.ask("¿y el mes pasado?");
    assert.equal(total(plain), 12000);
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    const reworded = b.ask("¿y cuánto fue el mes pasado?");
    assert.equal(total(reworded), 12000);
    assert.equal(ans(reworded).verdict, ans(plain).verdict);
  });
  test("el turno nulo no rompe el hilo: calla y el seguimiento posterior acierta", () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    assert.equal(b.ask("gracias").kind, "unknown");
    assert.equal(total(b.ask("¿y el mes pasado?")), 12000);
  });
  test("el seguimiento duplicado es idempotente", () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    const one = ans(b.ask("¿y el mes pasado?"));
    const two = ans(b.ask("¿y el mes pasado?"));
    assert.equal(two.verdict, one.verdict);
    assert.equal(total(two), 12000);
  });
  test("el orden de dos preguntas independientes no cambia ninguna respuesta", () => {
    const a = new Box(libro75());
    const aFood = ans(a.ask("¿Cuánto gasté en comida este mes?")).verdict;
    const aTotal = ans(a.ask("¿Cuánto gasté este mes?")).verdict;
    const b = new Box(libro75());
    const bTotal = ans(b.ask("¿Cuánto gasté este mes?")).verdict;
    const bFood = ans(b.ask("¿Cuánto gasté en comida este mes?")).verdict;
    assert.equal(aFood, bFood);
    assert.equal(aTotal, bTotal);
    // Y una pregunta independiente no se disfraza de seguimiento.
    assert.ok(!(ans(b.ask("¿Cuánto gasté este mes?")).note ?? "").includes("Viene de tu pregunta anterior"));
  });
});

describe("hilo · las mutaciones de discurso (tercera lectura)", () => {
  test("la corrección reemplaza el período, y el hilo sigue desde el período corregido", () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    const fixed = ans(b.ask("En realidad quise decir septiembre"));
    assert.equal(total(fixed), 12000);
    assert.match(fixed.note ?? "", /septiembre/);
    // El siguiente seguimiento actúa sobre septiembre, no sobre octubre.
    const back = ans(b.ask("¿y en octubre?"));
    assert.equal(total(back), 15000);
  });
  test("la suma añade: los dos períodos responden y el primero no desaparece", () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    const both = ans(b.ask("Muéstrame septiembre también"));
    assert.equal(total(both), 15000 + 12000);
    assert.match(both.note ?? "", /no desaparece/);
  });
  test("la exclusión se revoca y se reinstaura, declarando el estado en cada vuelta", () => {
    const b = new Box(libro75());
    assert.equal(total(b.ask("¿Cuánto gasté este mes?")), 95000);
    assert.equal(total(b.ask("sin la renta")), 15000);
    const back = ans(b.ask("con la renta, mejor"));
    assert.equal(total(back), 95000);
    assert.match(back.note ?? "", /volví a contar/);
    assert.equal(total(b.ask("no, sin la renta")), 15000);
  });
  test("el envenenamiento: tras cambiar de tema, el seguimiento nombra la pregunta que hereda", () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    b.ask("¿Cuánto tengo apartado?");
    const follow = ans(b.ask("¿y en septiembre?"));
    // El resultado válido no es qué contexto gana: es que la herencia
    // se DECLARA con la pregunta nombrada, nunca se cuela en silencio.
    assert.match(follow.note ?? "", /cuanto tengo apartado/);
  });
  // PENDIENTE DE SU OLA (acta de la integración de la 75): este
  // espécimen es de la Ola P3, que en la cola de canon entra tras
  // la P2; el archivo llegó entero desde la copia acumulativa. Se
  // salta con su razón escrita y el puerto de la P3 lo reactiva.
  test("OLA P3 · el eje del ciudadano: «¿y en la renta?» cambia el concepto, y tras la horquilla vuelve al período de la pregunta", { skip: "llega con la Ola P3 (el eje del ciudadano), tras la P2 en la cola de canon" }, () => {
    const b = new Box(libro75());
    assert.equal(total(b.ask("¿Cuánto gasté en comida este mes?")), 15000);
    const swap = ans(b.ask("¿y en la renta?"));
    assert.equal(total(swap), 80000);
    assert.match(swap.note ?? "", /cambié solo el ciudadano/);
    const b2 = new Box(libro75());
    assert.equal(total(b2.ask("¿Cuánto gasté en comida este mes?")), 15000);
    assert.equal(total(b2.ask("¿y el mes pasado?")), 12000);
    const rebased = ans(b2.ask("¿y en la renta?"));
    assert.equal(total(rebased), 80000);
    assert.match(rebased.note ?? "", /el período volvió/);
    const b3 = new Box(libro75());
    b3.ask("¿Cuánto gasté en la renta este mes?");
    const withPeriod = ans(b3.ask("¿y en comida el mes pasado?"));
    assert.equal(total(withPeriod), 12000);
  });
  test("OLA P3 · la reparación ya no trae las piezas del marco: explica sin cifrar", { skip: "llega con la Ola P3 (la reparación sin piezas), tras la P2 en la cola de canon" }, () => {
    const b = new Box(libro75());
    b.ask("¿Cuánto gasté en comida este mes?");
    const rep = ans(b.ask("¿y en comida?"));
    assert.equal(rep.family, "porque");
    assert.equal(rep.pieces.length, 0);
  });
});
