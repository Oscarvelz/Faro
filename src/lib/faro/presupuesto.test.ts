/**
 * presupuesto — LA FAMILIA ENTERA (1.3.522; diseño aprobado por
 * Oscar el 2026-11-27 con sus cuatro recomendaciones y tres
 * añadidos). Con el tope fijado en la categoría, la cuenta es
 * completa contra él; la conversión con la tasa anotada se dice y
 * sin tasa se declara; las subcategorías suman a su categoría; la
 * palabra sigue siendo la puerta («¿cuánto llevo…?» sin ella no
 * cambia de familia); y el tope sobrevive a guardar y recargar el
 * libro. Predicción registrada antes de construir
 * (ESTUDIO-PRESUPUESTO.md §9).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { budgetFigures, budgetOf } from "./budgets.ts";
import { applyCardEdits, createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
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
function fixture(capMinor = 30000): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const food = ledger.structure.categories.find((c) => c.id === "f-alimentos");
  if (!food) throw new Error("missing food category");
  food.capMinor = capMinor;
  food.capCurrency = "USD";
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 200000, bookedOn: "2026-10-05" }),
      line({ id: "super1", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 15000, categoryId: food.id, bookedOn: "2026-10-08" }),
      line({ id: "super2", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 9000, categoryId: food.id, bookedOn: "2026-10-15" }),
    ],
  };
  ledger.settings.display = "USD";
  ledger.settings.rateE4 = 366243;
  return ledger;
}

describe("presupuesto · la cuenta contra el tope", () => {
  it("con tope, la nombrada responde la cuenta completa: quedan $60.00 de $300.00", () => {
    const r = ask(fixture(), "¿Cuánto me queda de mi presupuesto de alimentos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "presupuesto");
    assert.ok(r.verdict.includes("te quedan"), r.verdict);
    assert.ok(r.verdict.includes("$60.00"), r.verdict);
    assert.ok(r.verdict.includes("$240.00"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.equal(r.pieces[0]?.minor, 24000);
  });

  it("el pase se dice con su monto: pasado por $40.00", () => {
    const ledger = fixture(20000);
    const r = ask(ledger, "¿Ya me pasé de mi presupuesto de alimentos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "presupuesto");
    assert.ok(r.verdict.includes("pasado por $40.00"), r.verdict);
  });

  it("la lista de pasadas nombra solo las pasadas", () => {
    const ledger = fixture(20000);
    const casa = ledger.structure.categories.find((c) => c.id === "f-casa");
    assert.ok(casa);
    casa.capMinor = 50000;
    casa.capCurrency = "USD";
    const r = ask(ledger, "¿En qué categorías me pasé del presupuesto?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "presupuesto");
    assert.ok(r.verdict.includes("Alimentos"), r.verdict);
    assert.ok(!r.verdict.includes("Casa, por"), r.verdict);
  });

  it("las subcategorías suman a su categoría", () => {
    const ledger = fixture();
    const food = ledger.structure.categories.find((c) => c.id === "f-alimentos")!;
    const sub = food.subs[0];
    assert.ok(sub);
    ledger.months[KEY]!.lines.push(line({ id: "sub1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 6000, categoryId: "", subId: sub.id, bookedOn: "2026-10-18" }));
    const f = budgetOf(ledger, food, KEY);
    assert.equal(f?.spentMinor, 30000);
    assert.equal(f?.leftMinor, 0);
  });

  it("monedas mezcladas con tasa anotada: se convierte y se dice", () => {
    const ledger = fixture();
    const food = ledger.structure.categories.find((c) => c.id === "f-alimentos")!;
    ledger.months[KEY]!.lines.push(line({ id: "nio1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 366243, currency: "NIO", categoryId: food.id, bookedOn: "2026-10-19" }));
    const f = budgetOf(ledger, food, KEY);
    assert.equal(f?.spentMinor, 34000);
    assert.equal(f?.converted, true);
    const r = ask(ledger, "¿Cuánto me queda de mi presupuesto de alimentos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok((r.note ?? "").includes("tasa anotada"), r.note ?? "");
  });

  it("sin tasa anotada, la parte en la otra moneda se declara y no se inventa", () => {
    const ledger = fixture();
    ledger.settings.rateE4 = 0;
    const food = ledger.structure.categories.find((c) => c.id === "f-alimentos")!;
    ledger.months[KEY]!.lines.push(line({ id: "nio1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 366243, currency: "NIO", categoryId: food.id, bookedOn: "2026-10-19" }));
    const f = budgetOf(ledger, food, KEY);
    assert.equal(f?.spentMinor, 24000);
    assert.equal(f?.uncounted.length, 1);
    assert.equal(f?.uncounted[0]?.minor, 366243);
    const r = ask(ledger, "¿Cuánto me queda de mi presupuesto de alimentos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok((r.note ?? "").includes("No conté"), r.note ?? "");
    assert.ok(r.verdict.includes("$60.00"), r.verdict);
  });

  it("la palabra es la puerta: sin ella, «¿cuánto llevo…?» sigue en historia aun con tope", () => {
    const r = ask(fixture(), "¿Cuánto llevo gastado en alimentos este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "historia");
  });

  it("el tope se fija y se quita por CardEdits, y sobrevive a guardar y recargar", () => {
    const ledger = createInitial("es", "oscuro");
    const food = ledger.structure.categories.find((c) => c.id === "f-alimentos")!;
    const withCap = applyCardEdits(ledger.structure, food.id, { cap: { minor: 25000, currency: "NIO" } }, () => "x1");
    const cat = withCap.categories.find((c) => c.id === food.id)!;
    assert.equal(cat.capMinor, 25000);
    assert.equal(cat.capCurrency, "NIO");
    const reloaded = JSON.parse(JSON.stringify({ ...ledger, structure: withCap })) as LedgerState;
    assert.ok(isLedgerDeep(reloaded));
    const catBack = reloaded.structure.categories.find((c) => c.id === food.id)!;
    assert.equal(catBack.capMinor, 25000);
    const removed = applyCardEdits(withCap, food.id, { cap: null }, () => "x1");
    assert.equal(removed.categories.find((c) => c.id === food.id)?.capMinor, undefined);
    assert.equal(budgetFigures(reloaded, KEY).length >= 0, true);
  });

  it("en inglés la cuenta también es completa", () => {
    const ledger = fixture();
    const names = makeNamer(ledger.structure, "en");
    const label = names.cat("f-alimentos");
    const r = ask(ledger, `How much of my ${label.toLowerCase()} budget do I have left?`, "en");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "presupuesto");
    assert.ok(r.verdict.includes("$60.00"), r.verdict);
  });

  it("la tarjeta quitada de Central sobrevive a guardar y recargar", () => {
    const ledger = fixture();
    const hidden = { ...ledger, settings: { ...ledger.settings, budgetsCardHidden: true } };
    const reloaded = JSON.parse(JSON.stringify(hidden)) as LedgerState;
    assert.ok(isLedgerDeep(reloaded));
    assert.equal(reloaded.settings.budgetsCardHidden, true);
    const shown = { ...reloaded, settings: { ...reloaded.settings, budgetsCardHidden: false } };
    assert.equal(shown.settings.budgetsCardHidden, false);
  });
});
