import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

/* HUECO 6 DE COBERTURA · DERIVA (2026-11-27): la puerta de los
 * avisos solo oía «¿algo cambió?» en general (6 bien de 122 en
 * la cuenta) y la pregunta por UNA serie («¿mis gastos de
 * comida vienen subiendo?», «¿la luz está subiendo o fue el
 * mes del calor?», «¿mi ingreso se ha estancado?») caía en
 * silencio o en las vecinas. La rama nueva lee la serie mes a
 * mes con la vara de la casa: deriva a 15% del nivel reciente
 * contra la base, salto cuando un solo mes se despega 30% con
 * el anterior en su nivel, y declaración honesta con menos de
 * tres meses. */
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
const MESES = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
function libroDeriva(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const comida = [10000, 10000, 10000, 10000, 13000, 14000];
  const luz = [5000, 5000, 5000, 5000, 5000, 5000];
  const cafe = [2000, 2200, 2100, 2600, 3000, 3200];
  MESES.forEach((mk, i) => {
    ledger.months[mk] = { lines: [
      line({ id: `sal${i}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `com${i}`, kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: comida[i], categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: `${mk}-10`, monthKey: mk }),
      line({ id: `luz${i}`, kind: "expense-variable" as LineKind, concept: "Luz", amountMinor: luz[i], categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: `${mk}-11`, monthKey: mk }),
      line({ id: `caf${i}`, kind: "expense-variable" as LineKind, concept: "Starbucks", amountMinor: cafe[i], categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
    ] };
  });
  ledger.settings.display = "USD";
  return ledger;
}
function libroSalto(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const gas = [8000, 8000, 15000];
  ["2026-08", "2026-09", "2026-10"].forEach((mk, i) => {
    ledger.months[mk] = { lines: [
      line({ id: `sal${i}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `gas${i}`, kind: "expense-variable" as LineKind, concept: "Gasolina", amountMinor: gas[i], categoryId: "f-transporte", subId: "f.transporte.gasolina", bookedOn: `${mk}-10`, monthKey: mk }),
    ] };
  });
  ledger.settings.display = "USD";
  return ledger;
}
function libroCorto(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ["2026-09", "2026-10"].forEach((mk, i) => {
    ledger.months[mk] = { lines: [
      line({ id: `com${i}`, kind: "expense-variable" as LineKind, concept: "Comida", amountMinor: 10000 + i * 3000, categoryId: "f-alimentos", bookedOn: `${mk}-10`, monthKey: mk }),
    ] };
  });
  ledger.settings.display = "USD";
  return ledger;
}

describe("hueco 6 · deriva: la tendencia de una serie nombrada", () => {
  it("D1: «¿mis gastos de comida vienen subiendo poco a poco este año?» → deriva, y el veredicto dice que sube con sus cifras", () => {
    const r = ask(libroDeriva(), "¿Mis gastos de comida vienen subiendo poco a poco este año?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("viene subiendo"), r.verdict);
  });
  it("D2: la disyuntiva «¿la luz está subiendo o solo fue el mes del calor?» → deriva, y la lectura dice que se mantiene", () => {
    const r = ask(libroDeriva(), "¿La luz está subiendo o solo fue el mes del calor?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("se mantiene"), r.verdict);
  });
  it("D3: «¿mi ingreso se ha estancado?» → deriva (el ingreso plano también es una forma)", () => {
    const r = ask(libroDeriva(), "¿Mi ingreso se ha estancado en los últimos meses?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("D4: el salto de un mes se nombra salto, no tendencia: «¿la gasolina se disparó y se quedó?» sobre el libro del salto", () => {
    const r = ask(libroSalto(), "¿La gasolina se disparó este mes o ha ido aumentando de a poquito?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("saltó") || r.verdict.includes("salto"), r.verdict);
  });
  it("D5: con dos meses no se nombra tendencia: se declara lo que hay", () => {
    const r = ask(libroCorto(), "¿Mis gastos de comida vienen subiendo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("no te nombro una tendencia"), r.verdict);
  });
  it("D6: la forma general sigue en pie: «¿qué categoría cambió de nivel este año?» → deriva", () => {
    const r = ask(libroDeriva(), "¿Qué categoría cambió de nivel este año?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("D7: la negación de la cuenta cede de frecuencia: «no te pregunto cada cuánto voy al Starbucks, sino si lo que dejo ahí ha ido creciendo» → deriva", () => {
    const r = ask(libroDeriva(), "No te pregunto cada cuánto voy al Starbucks, sino si lo que dejo ahí ha ido creciendo.");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("C1: el total del mes no es deriva: «¿cuánto gasté en comida este mes?» no la abre", () => {
    const r = ask(libroDeriva(), "¿Cuánto gasté en comida este mes?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("C2: el mes fuerte no es deriva: «¿en qué mes gasto más en comida?» no la abre", () => {
    const r = ask(libroDeriva(), "¿En qué mes gasto más en comida?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("C3: la cuenta sí es de frecuencia cuando no se niega: «¿cada cuánto voy al Starbucks?» no es deriva", () => {
    const r = ask(libroDeriva(), "¿Cada cuánto voy al Starbucks?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("D8: la palabra tendencia llega entera a su puerta: «¿mis gastos de comida tienen tendencia?» → deriva (el reparador la volvía «tenencia»)", () => {
    const r = ask(libroDeriva(), "¿Mis gastos de comida tienen tendencia?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("D9: la serie nombrada que el libro no trae se declara, no se inventa: «¿mis gastos de mascota vienen trepando?» → deriva con la declaración de ausencia", () => {
    const r = ask(libroDeriva(), "¿Mis gastos de mascota vienen trepando?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("no encuentro una serie con ese nombre"), r.verdict);
  });
  it("D10: la subida con cadencia cede de factibilidad: «¿parece que cada mes gasto un poco más en comida?» → deriva", () => {
    const r = ask(libroDeriva(), "¿Parece que cada mes gasto un poco más en comida?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("D11: el «desde cuándo» del cambio cede de la antigüedad: «¿desde cuándo pago más de gasolina? Siento que se quedó arriba» → deriva", () => {
    const r = ask(libroDeriva(), "¿Desde cuándo pago más de gasolina? Siento que se quedó arriba.");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
  it("C4: lo que se movió HOY es de la cuenta del día, no deriva: «¿qué se movió hoy en la cuenta?» no la abre", () => {
    const r = ask(libroDeriva(), "¿Qué se movió hoy en la cuenta?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("C5: el mes contra mes nombrado es comparar aunque diga «se me fue más»: «¿en octubre se me fue más que en septiembre?» no es deriva", () => {
    const r = ask(libroDeriva(), "¿En octubre se me fue más que en septiembre?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("C6: el «¿en qué mes se me va más?» es estacionalidad, no deriva: el superlativo sobre los meses no abre esta puerta", () => {
    const r = ask(libroDeriva(), "¿En qué mes se me va más dinero?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("C7: «¿cuánto gano en un mes malo?» pregunta la cifra de un mes malo, no si el mes fue raro: es del ingreso, no deriva", () => {
    const r = ask(libroDeriva(), "¿Cuánto gano en un mes malo?");
    if (r.kind === "answer") assert.notEqual(r.family, "deriva");
  });
  it("D12: la disyuntiva del golpe cede de series: «¿el internet me lo subieron de golpe o ha ido aumentando de a poquito?» → deriva", () => {
    const r = ask(libroDeriva(), "¿El internet me lo subieron de golpe o ha ido aumentando de a poquito?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
  });
});
