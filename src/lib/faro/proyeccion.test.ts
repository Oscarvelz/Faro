import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";
/* HUECO 6 · LA PROYECCIÓN: el stock más el aporte repetido
 * hasta un horizonte, sin interés. El libro de la cerca trae
 * tres meses con 100 dólares mensuales apartados a la serie
 * de emergencia (ritmo medido: 100 al mes; stock: 300). */
const KEY = "2026-10";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string) {
  return answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY);
}
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}
function libroProyeccion(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  for (const mk of ["2026-08", "2026-09", "2026-10"]) {
    ledger.months[mk] = { lines: [
      line({ id: `sal${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `eme${mk}`, kind: "expense-variable" as LineKind, concept: "Emergencia", amountMinor: 10000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-06`, monthKey: mk }),
    ] };
  }
  ledger.settings.display = "USD";
  return ledger;
}
describe("hueco 6 · proyección: el stock más el aporte repetido", () => {
  it("P1: el aporte traído con su cadencia y su verbo: «si sigo metiendo 2000 córdobas al mes, ¿cuánto junto para Navidad?» → proyección", () => {
    const r = ask(libroProyeccion(), "Si sigo metiendo 2000 córdobas al mes, ¿cuánto junto para Navidad?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
  });
  it("P2: la cifra cierra: «con 100 dólares al mes, ¿cuánto tendré en 2 años?» → 300 de stock + 24 aportes de 100 = 2.700", () => {
    const r = ask(libroProyeccion(), "Con 100 dólares al mes, ¿cuánto tendré en 2 años?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
    const total = r.pieces[r.pieces.length - 1];
    assert.equal(total.minor, 270000);
  });
  it("P3: el ritmo actual sin monto traído: «proyecta mis ahorros para Navidad manteniendo el ritmo actual» → proyección con el ritmo medido", () => {
    const r = ask(libroProyeccion(), "Proyecta mis ahorros para Navidad manteniendo el ritmo actual");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
    assert.ok(r.verdict.includes("ritmo medido"), r.verdict);
  });
  it("P4: la meta que el libro no trae se declara desde cero: «¿cuánto habría en la meta de carro para marzo?» → proyección con la declaración", () => {
    const r = ask(libroProyeccion(), "¿Cuánto habría en la meta de carro para marzo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
    assert.ok(r.verdict.includes("tendrías") || r.note?.includes("no trae saldo anotado"), r.verdict);
  });
  it("P5: la llegada sin horizonte se calcula en meses: «¿llego a 500 dólares si sigo poniendo 100 cada mes?» → proyección, en 2 meses", () => {
    const r = ask(libroProyeccion(), "¿Llego a 500 dólares si sigo poniendo 100 cada mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
    assert.ok(r.verdict.includes("en 2 meses"), r.verdict);
  });
  it("P6: el futuro de una clase con su ritmo: «¿cuánto tendría en mi fondo de emergencia en 6 meses si sigo así?» → proyección sobre la clase", () => {
    const r = ask(libroProyeccion(), "¿Cuánto tendría en mi fondo de emergencia en 6 meses si sigo así?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "proyeccion");
    const total = r.pieces[r.pieces.length - 1];
    assert.equal(total.minor, 90000);
  });
  it("C1: la meta inversa no es proyección: «¿cuánto debo ahorrar cada mes para juntar 2000 en 4 meses?» no la abre", () => {
    const r = ask(libroProyeccion(), "¿Cuánto debo ahorrar cada mes para juntar 2000 dólares en 4 meses?");
    if (r.kind === "answer") assert.notEqual(r.family, "proyeccion");
  });
  it("C2: el stock de hoy no es proyección: «¿cuánto tengo en ahorros hoy?» no la abre", () => {
    const r = ask(libroProyeccion(), "¿Cuánto tengo en ahorros hoy?");
    if (r.kind === "answer") assert.notEqual(r.family, "proyeccion");
  });
  it("C4: la meta inversa con «debería» no es proyección: «¿cuánto debería ahorrar al mes para llegar a 5,000 en un año?» no la abre", () => {
    const r = ask(libroProyeccion(), "¿Cuánto debería ahorrar al mes para llegar a $5,000 en un año?");
    if (r.kind === "answer") assert.notEqual(r.family, "proyeccion");
  });
  it("C3: la premisa de ingreso no es proyección: «si ganara 500 más al mes, ¿cuánto tendría en un año?» no la abre", () => {
    const r = ask(libroProyeccion(), "Si ganara 500 dólares más al mes, ¿cuánto tendría en un año?");
    if (r.kind === "answer") assert.notEqual(r.family, "proyeccion");
  });
});
