// CERCA DE LA HERENCIA (examen de conversaciones, 2026-11-28): el
// turno corto que sigue a una respuesta. Tres rutas cazadas con
// sondas propias sobre el libro de prueba: el eco aritmético
// sobre la cifra del marco, el eco de comparación que conserva
// el asunto del hilo, y el veto del robo genérico que cae en la
// reparación honesta en vez de servir la respuesta de otra
// familia. Y las guardas: un pivote con verbo propio no se veta
// y la exclusión de siempre sigue sirviendo.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import type { BankResult, ConvoFrame } from "./ask2.ts";
import { makeNamer } from "./defaults.ts";
import { HOY_PRUEBA, KEY_PRUEBA, libroPrueba } from "./libro-prueba.ts";
import type { LedgerState } from "./types.ts";
import type { ParseCtx } from "./textparse.ts";

class Box {
  frame: ConvoFrame | null = null;
  l: LedgerState;
  constructor(l: LedgerState) { this.l = l; }
  ask(raw: string): BankResult {
    const names = makeNamer(this.l.structure, "es");
    const ctx = { ledger: this.l, lang: "es", today: HOY_PRUEBA, display: "USD", makeId: () => "q1", now: `${HOY_PRUEBA}T12:00:00.000Z` } as ParseCtx;
    const r = answerBankQuestion(this.l, KEY_PRUEBA, "es", names, raw, ctx, HOY_PRUEBA, undefined, undefined, undefined, this.frame);
    if (r.kind === "answer" && r.convo) this.frame = r.convo;
    return r;
  }
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");
const family = (r: BankResult): string => (r.kind === "answer" ? String(r.family) : r.kind);

describe("herencia · el turno corto sobre el marco", () => {
  test("el eco aritmético transforma la cifra del marco", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto gasté en gasolina este mes?");
    const r = b.ask("¿Y el doble de eso cuánto es?");
    assert.equal(family(r), "calculadora");
    assert.match(verdict(r), /El doble de «este mes» — \$110\.00 — son \$220\.00/);
  });
  test("el eco de comparación conserva el asunto del hilo", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto pagué de luz este mes?");
    const r = b.ask("¿Y el mes pasado fue más?");
    assert.match(verdict(r), /El mes pasado fue más: \$53\.00 contra \$45\.00 de este mes/);
  });
  test("el veto: el total anafórico no sirve el gasto del mes", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto aparté para el carro este mes?");
    const r = b.ask("¿Y en total cuánto llevo?");
    assert.equal(family(r), "porque");
    assert.doesNotMatch(verdict(r), /\$3,434\.44/);
  });
  test("las guardas: el pivote con verbo propio y la exclusión no se vetan", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto gasté en comida este mes?");
    const deuda = b.ask("¿Y cuánto debo en total?");
    assert.equal(family(deuda), "deudas");
    const b2 = new Box(libroPrueba());
    b2.ask("¿Cuánto gasté este mes?");
    const sin = b2.ask("¿Y sin la renta?");
    assert.match(verdict(sin), /\$2,484\.44/);
  });
});
