import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";
/* LAS LLEGADAS (fallo de Oscar en el hueco 1, 2026-11-27):
 * la pregunta «¿ya cayó X?» entra como recencia y la
 * respuesta debe CONFIRMAR la llegada con su fecha («sí,
 * cayó el martes»). La vara de honestidad es el mes en
 * curso: la última entrada que calza es de este mes → sí,
 * con su fecha; es del mes pasado → todavía no, con la
 * fecha de la última; el libro no trae el nombre → se
 * declara. El libro de la cerca: salario el 5 de octubre
 * y el 5 de septiembre, clases el 12 de octubre; hoy es
 * 22 de octubre de 2026. */
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
function libroLlegadas(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months["2026-09"] = { lines: [
    line({ id: "sal09", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: "2026-09" }),
  ] };
  ledger.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "cla", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 18000, bookedOn: "2026-10-12" }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}
const fam = (r: ReturnType<typeof ask>) => (r.kind === "answer" ? r.family : r.kind);
describe("las llegadas: recencia confirma con su fecha", () => {
  it("P1: «¿Ya cayó el salario?» → recencia, y confirma con la fecha (el lunes 5 de octubre)", () => {
    const r = ask(libroLlegadas(), "¿Ya cayó el salario?");
    assert.equal(fam(r), "recencia");
    assert.ok(r.kind === "answer" && /^Sí:/.test(r.verdict) && /lunes 5 de octubre/.test(r.verdict));
  });
  it("P2: «¿Ya entró el pago de las clases?» → recencia, confirma el 12 de octubre", () => {
    const r = ask(libroLlegadas(), "¿Ya entró el pago de las clases?");
    assert.equal(fam(r), "recencia");
    assert.ok(r.kind === "answer" && /^Sí:/.test(r.verdict) && /12 de octubre/.test(r.verdict));
  });
  it("P3: «¿Ya cayó el depósito?» → recencia: el depósito a secas es la última entrada", () => {
    const r = ask(libroLlegadas(), "¿Ya cayó el depósito?");
    assert.equal(fam(r), "recencia");
    assert.ok(r.kind === "answer" && /^Sí:/.test(r.verdict));
  });
  it("P4: el nombre que el libro no trae se declara: «¿Ya apareció el reembolso?» sin reembolso anotado → recencia que lo dice", () => {
    const ledger = libroLlegadas();
    const r = ask(ledger, "¿Ya apareció el reembolso?");
    assert.equal(fam(r), "recencia");
  });
  it("P5 (la honestidad): sin salario este mes, «¿ya cayó el salario?» → todavía no, con la fecha de la última", () => {
    const ledger = libroLlegadas();
    delete ledger.months[KEY].lines[0];
    ledger.months[KEY].lines = ledger.months[KEY].lines.filter((l) => l.id !== "sal");
    const r = ask(ledger, "¿Ya cayó el salario?");
    assert.equal(fam(r), "recencia");
    assert.ok(r.kind === "answer" && /^Todavía no:/.test(r.verdict) && /septiembre/.test(r.verdict));
  });
  it("C1 (contraria): la suma de entradas no es llegada: «¿Cuánto entró este mes?» no responde con la confirmación de llegada", () => {
    const r = ask(libroLlegadas(), "¿Cuánto entró este mes?");
    assert.ok(r.kind !== "answer" || !/^Sí: cayó/.test(r.verdict));
  });
  it("C2 (contraria): la recencia de siempre sigue: «¿Cuál fue mi último gasto?» no es llegada", () => {
    const r = ask(libroLlegadas(), "¿Cuál fue mi último gasto?");
    assert.ok(r.kind !== "answer" || !/^Sí: cayó/.test(r.verdict));
  });
});
