/**
 * cuanto-aporto — el hueco «¿cuánto aportó X?» (registro
 * HUECO-CUANTO-APORTO-REGISTRO.md, 2026-11-27): la suma de
 * historia sobre una fuente nombrada. La puerta de la suma no
 * oía «aportó» ni «trajo» y la pregunta caía en silencio. Es
 * suma sobre un filtro, no ranking. Todas las frases son
 * acuñadas en esta línea y el libro es inventado.
 *
 * El libro: octubre trae Salario 100000, Clases 30000 y
 * Ventas 12000 (entraron 142000); septiembre trae solo
 * Salario 100000. Carlos debe 5000 (persona del lado deuda,
 * no una fuente).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, classifyBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

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
  ledger.months[KEY] = {
    lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "cla", kind: "income-variable" as LineKind, concept: "Clases", amountMinor: 30000, bookedOn: "2026-10-12" }),
      line({ id: "ven", kind: "income-variable" as LineKind, concept: "Ventas", amountMinor: 12000, bookedOn: "2026-10-18" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-10-01" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "sal0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: PREV }),
      line({ id: "ren0", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-09-01", monthKey: PREV }),
    ],
  };
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 5000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("el hueco «¿cuánto aportó X?» · la suma sobre la fuente", () => {
  const libro = fixture();
  it("la forma medida del hueco: salario este mes, historia con 100000", () => {
    const r = ask(libro, "¿Cuánto aportó el salario este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 100000);
    assert.ok(r.verdict.includes("Salario"), r.verdict);
    assert.equal(classifyBankQuestion("¿Cuánto aportó el salario este mes?").family, "historia");
  });
  it("la forma desnuda: «¿cuánto aportó Salario?» también responde", () => {
    const r = ask(libro, "¿Cuánto aportó Salario?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 100000);
    assert.equal(classifyBankQuestion("¿Cuánto aportó Salario?").family, "historia");
  });
  it("con «trajo»: las Clases de este mes, 30000", () => {
    const r = ask(libro, "¿Cuánto trajo Clases este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 30000);
  });
  it("en plural: «¿cuánto aportaron las Ventas?», 12000", () => {
    const r = ask(libro, "¿Cuánto aportaron las Ventas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 12000);
  });
  it("el período manda: Clases el mes pasado suma cero, no el total de octubre", () => {
    const r = ask(libro, "¿Cuánto trajo Clases el mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 0);
  });
  it("en inglés: how much did Salario bring in", () => {
    const r = ask(libro, "How much did Salario bring in this month?", "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 100000);
  });
});

describe("el hueco «¿cuánto aportó X?» · las cercas", () => {
  const libro = fixture();
  it("una persona del lado deuda no se disfraza de fuente: Carlos no da la suma de ingreso", () => {
    const r = ask(libro, "¿Cuánto aportó Carlos?");
    assert.ok(!(r.kind === "answer" && r.family === "historia"), JSON.stringify(r.kind === "answer" ? r.family : r.kind));
  });
  it("la cerca 2 de ranking aguanta: la forma no es ranking ni de respuesta ni de etiqueta", () => {
    const r = ask(libro, "¿Cuánto aportó el salario este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.notEqual(r.family, "ranking");
    assert.notEqual(classifyBankQuestion("¿Cuánto aportó el salario este mes?").family, "ranking");
  });
  it("el superlativo sigue en ranking: «¿qué fuente aportó más?» no lo roba historia", () => {
    const r = ask(libro, "¿Qué fuente de ingreso me aportó más este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
  });
});
