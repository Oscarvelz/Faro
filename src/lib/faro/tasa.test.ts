/**
 * tasa — LA CERCA DEL HUECO 4 DE COBERTURA (registro
 * HUECO-TASA-AHORROS-REGISTRO.md en runpod-comparacion): la
 * tasa es una razón (lo apartado entre lo que entró) y sus
 * voces vivas son las de la razón: el porcentaje o la parte
 * con el verbo de apartar, la comparación contra la
 * referencia o el propio promedio, el suficiente sobre lo
 * que entra y el juicio de mucho o poco contra lo ganado.
 * El stock desnudo y el flujo del mes siguen en ahorros (su
 * voz de flujo, Ola P2) y la pregunta de poder cede a
 * factibilidad: ninguno trae la marca de la razón.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

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
/* El libro de la tasa: entran $1,000 al mes; se apartan
 * $100 (ago), $150 (sep) y $200 (oct): la tasa de octubre
 * es el 20% y el promedio medido, el 15%. */
function libroTasa(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const mk = (key: string, saved: number): Line[] => [
    line({ id: `sal-${key}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${key}-05`, monthKey: key }),
    line({ id: `ah-${key}`, kind: "expense-fixed" as LineKind, concept: "Apartado al colchón", amountMinor: saved, categoryId: "f-ahorro", subId: "f.ahorro.colchon", fund: "aparte", bookedOn: `${key}-06`, monthKey: key }),
    line({ id: `sup-${key}`, kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 30000, categoryId: "f-alimentos", bookedOn: `${key}-12`, monthKey: key }),
  ];
  ledger.months["2026-08"] = { lines: mk("2026-08", 10000) };
  ledger.months["2026-09"] = { lines: mk("2026-09", 15000) };
  ledger.months[KEY] = { lines: mk(KEY, 20000) };
  ledger.settings.display = "USD";
  return ledger;
}
function esTasa(raw: string) {
  const r = ask(libroTasa(), raw);
  assert.equal(r.kind, "answer", raw);
  if (r.kind !== "answer") return;
  assert.equal(r.family, "tasa", raw);
}

describe("hueco 4 de cobertura · la tasa oída por sus voces de razón", () => {
  it("T1: el porcentaje sobre lo que entró, sin la palabra ingreso", () => {
    esTasa("¿Qué porcentaje de lo que entró logré ahorrar este año?");
  });
  it("T2: la proporción contra lo que normalmente guardo", () => {
    esTasa("¿Estoy guardando más proporción de lo que normalmente guardo?");
  });
  it("T3: más o menos que lo que suelen recomendar", () => {
    esTasa("¿Estoy ahorrando más o menos que lo que suelen recomendar?");
  });
  it("T4: qué parte del ingreso terminé guardando", () => {
    esTasa("¿Qué parte de mi ingreso terminé guardando en septiembre?");
  });
  it("T5: el porcentaje con guardar, sin tildes", () => {
    esTasa("que porcentaje logre guardar este trimestre");
  });
  it("T6: la forma inglesa del porcentaje de ahorro", () => {
    esTasa("How's my savings percentage?");
  });
  it("T7: saving rate sin la s", () => {
    esTasa("Mi saving rate de este año, ¿cómo anda?");
  });
  it("T8: el signo % con el salario", () => {
    esTasa("cuanto % de mi salario se fue a ahorros en el año");
  });
  it("T9: guardando suficiente de lo que entra", () => {
    esTasa("estoy guardando suficiente de lo que entra");
  });
  it("T10: qué parte del sueldo se va al ahorro", () => {
    esTasa("Dime qué parte de mi sueldo se está yendo al ahorro");
  });
  it("T11: el juicio de mucho o poco contra lo ganado", () => {
    esTasa("¿Lo que ahorré en 2025 fue mucho para lo que gané, o poquito?");
  });
  it("T12: la relación entre ingresos y dinero apartado", () => {
    esTasa("Muéstrame la relación entre ingresos y dinero apartado");
  });
  it("T13: el veredicto trae la tasa del mes con su derivación", () => {
    const r = ask(libroTasa(), "¿Qué porcentaje de lo que entró logré ahorrar este año?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("20%"), r.verdict);
    assert.ok(r.verdict.includes("$200.00") && r.verdict.includes("$1,000.00"), r.verdict);
  });

  it("C1: el stock desnudo sigue en ahorros", () => {
    const r = ask(libroTasa(), "¿Cuánto tengo ahorrado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
  });
  it("C2: el flujo de lo ahorrado en un mes sigue en ahorros (su voz de flujo, Ola P2), no en tasa", () => {
    const r = ask(libroTasa(), "¿Cuánto ahorré en septiembre?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
  });
  it("C3: el promedio desnudo del flujo sigue en ahorros, no en tasa", () => {
    const r = ask(libroTasa(), "¿Cuánto ahorro en promedio al mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
  });
  it("C4: la pregunta de poder no es tasa", () => {
    const r = ask(libroTasa(), "¿Puedo apartar 200 dólares al mes?");
    if (r.kind === "answer") assert.notEqual(r.family, "tasa");
  });
  it("C5: la tasa de cambio sigue en el conversor", () => {
    const r = ask(libroTasa(), "¿A cómo está el dólar?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "conversor");
  });
  it("C7: el interés traído es de la meta: el % del interés no abre la tasa", () => {
    const r = ask(libroTasa(), "¿Cuánto debo ahorrar para juntar $2000 en 4 meses con un interés del 12%?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
  });
  it("C8: el flujo por clase no es tasa: «aparte» no es «parte» (la frontera dentro de la palabra)", () => {
    const r = ask(libroTasa(), "¿Cuánto aparté para emergencias este mes?");
    if (r.kind === "answer") assert.notEqual(r.family, "tasa");
  });
  it("C9-C14: la distribución del montón y el porcentaje rechazado son de ahorros, no de la tasa (el costo de la ampliación, cobrado por la cuenta)", () => {
    for (const q of [
      "¿Qué parte de mis ahorros está en emergencia?",
      "No el porcentaje, la cantidad: ¿cuánto tengo apartado ahorita?",
      "De todo lo que tengo ahorrado, ¿qué parte es para el retiro?",
      "Mi ahorro, ¿qué parte está en verdes y qué parte en córdobas?",
      "¿Dónde tengo parqueada la mayor parte del ahorro?",
      "Dejá el porcentaje; en plata contante, ¿cuánto he apartado en lo que va del año?",
    ]) {
      const r = ask(libroTasa(), q);
      if (r.kind === "answer") assert.notEqual(r.family, "tasa", q);
    }
  });
  it("C6: el porcentaje del ingreso sin verbo de apartar no es tasa", () => {
    const r = ask(libroTasa(), "¿Qué porcentaje de mi ingreso se va en el súper?");
    if (r.kind === "answer") assert.notEqual(r.family, "tasa");
  });
});
