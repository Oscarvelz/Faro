/**
 * presupuesto-cerca — la cerca de la familia presupuesto (1.3.519;
 * el sí de Oscar y la adenda de Grok, 2026-11-27). Mientras el
 * libro no guarda ningún tope, la frase que nombra presupuesto o
 * tope responde la verdad del dato ausente, firmada por
 * presupuesto, y NUNCA cae en la queda del mes ni en la mitad sin
 * vara. Predicción registrada antes de construirla
 * (ESTUDIO-PRESUPUESTO.md §8): las 38 «¿cuánto llevo…?» del corpus
 * no cambian de familia (meta 0) y las robadas bajan a 0.
 * Medido antes de la cerca, sobre el conjunto de 15 formas:
 * left robaba 2, historia 2, identidad 1, silencio honesto 10.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}
function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const food = ledger.structure.categories.find((c) => c.id === "f-alimentos");
  if (!food) throw new Error("missing food category");
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 200000, bookedOn: "2026-10-05" }),
      line({ id: "super1", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 15000, categoryId: food.id, bookedOn: "2026-10-08" }),
      line({ id: "super2", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 9000, categoryId: food.id, bookedOn: "2026-10-15" }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

const ES = ["¿Cuánto me queda de mi presupuesto de comida?", "¿Cuánto llevo de mi presupuesto este mes?", "¿Ya me pasé de mi presupuesto?", "¿En qué categorías me pasé del presupuesto?", "¿Cuánto llevo gastado contra mi presupuesto?", "¿Cuál es mi presupuesto para comida?", "¿Tengo presupuesto para este mes?", "¿Cuánto me queda del presupuesto?", "¿Me pasé del tope de comida?", "¿Cuál es mi tope de gasto en comida?"];
const EN = ["How much of my food budget do I have left?", "Am I over budget this month?", "How much have I spent against my budget?", "What is my budget for food?", "Do I have a budget for this month?"];

describe("presupuesto-cerca · la ausencia dicha, nunca la queda disfrazada", () => {
  it("las 15 formas medidas firman presupuesto con la ausencia", () => {
    const ledger = fixture();
    for (const q of ES) {
      const r = ask(ledger, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "presupuesto", `${q} → ${r.family}`);
      assert.ok(r.verdict.includes("No tienes presupuesto fijado"), `${q} → ${r.verdict}`);
    }
    for (const q of EN) {
      const r = ask(ledger, q, "en");
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "presupuesto", `${q} → ${r.family}`);
      assert.ok(r.verdict.includes("no budget set"), `${q} → ${r.verdict}`);
    }
  });

  it("la categoría nombrada trae su mitad contada: lo gastado del mes, como pieza", () => {
    const ledger = fixture();
    const r = ask(ledger, "¿Cuánto me queda de mi presupuesto de alimentos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.pieces.length, 1);
    assert.equal(r.pieces[0].minor, 24000);
    assert.ok(r.verdict.includes("$240.00"), r.verdict);
  });

  it("la meta de la predicción: «¿cuánto llevo…?» sin la palabra no cambia de familia", () => {
    const ledger = fixture();
    for (const q of ["¿Cuánto llevo gastado en comida este mes?", "¿Cuánto llevo en súper?", "¿Cuánto llevo pagado de luz?"]) {
      const r = ask(ledger, q);
      if (r.kind === "answer") assert.notEqual(r.family, "presupuesto", `${q} → ${r.family}`);
    }
    const r = ask(ledger, "¿Cuánto llevo gastado en comida este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "historia");
  });
});
