import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";
/* HUECO 6 · LAS CAPACIDADES: la pregunta SOBRE el Asesor — el
 * menú de lo que puede hacer, la sonda de un poder nombrado,
 * el «aparte de sumar» y la frontera de lo que no puede. La
 * familia existía desde la ola 3 y se describe desde el banco;
 * el hueco era su puerta: solo oía «qué puedes hacer» al pie
 * de la letra y el resto caía en silencio o lo robaba la
 * familia de la palabra suelta (tendencias, la lista, la
 * tasa). El libro de la cerca es el mínimo: un salario y un
 * gasto, porque estas respuestas no leen cifras. */
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
function libroBase(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 40000, bookedOn: "2026-10-06", categoryId: "f-casa" }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}
const fam = (r: ReturnType<typeof ask>) => (r.kind === "answer" ? r.family : r.kind);
describe("hueco 6 · capacidades: el menú, la sonda y la frontera", () => {
  it("P1: el menú pedido de frente: «¿Qué cosas puedes analizar de mis gastos?» → la lista del banco", () => {
    const r = ask(libroBase(), "¿Qué cosas puedes analizar de mis gastos?");
    assert.equal(fam(r), "capacidades");
    assert.ok(r.kind === "answer" && r.pieces.length > 10);
  });
  it("P2: el menú por su nombre: «Enumera los tipos de análisis que manejas» → capacidades", () => {
    const r = ask(libroBase(), "Enumera los tipos de análisis que manejas");
    assert.equal(fam(r), "capacidades");
  });
  it("P3: el menú en habla corta: «q sabes hacer» → capacidades", () => {
    const r = ask(libroBase(), "q sabes hacer");
    assert.equal(fam(r), "capacidades");
  });
  it("P4: la sonda de un poder: «¿Puedes detectar tendencias o solo sacar totales?» → capacidades, y la respuesta confirma el poder", () => {
    const r = ask(libroBase(), "¿Puedes detectar tendencias o solo sacar totales?");
    assert.equal(fam(r), "capacidades");
    assert.ok(r.kind === "answer" && /vigilo|Sí:/.test(r.verdict));
  });
  it("P5: la sonda del precio en horas: «¿Sabes calcular cuántas horas de trabajo me cuesta algo?» → capacidades", () => {
    const r = ask(libroBase(), "¿Sabes calcular cuántas horas de trabajo me cuesta algo, o eso no lo haces?");
    assert.equal(fam(r), "capacidades");
  });
  it("P6: la sonda del reparto sin monto: «¿Tú sabes repartir una cuenta entre varias personas?» → capacidades", () => {
    const r = ask(libroBase(), "¿Tú sabes repartir una cuenta entre varias personas?");
    assert.equal(fam(r), "capacidades");
  });
  it("P7: el «aparte de sumar»: «¿Para qué te uso, aparte de sumar?» → el menú", () => {
    const r = ask(libroBase(), "¿Para qué te uso, aparte de sumar?");
    assert.equal(fam(r), "capacidades");
    assert.ok(r.kind === "answer" && r.pieces.length > 10);
  });
  it("P8: la frontera: «¿Qué cosas no podés responder?» → capacidades, con lo declarado en las piezas", () => {
    const r = ask(libroBase(), "¿Qué cosas no podés responder?");
    assert.equal(fam(r), "capacidades");
  });
  it("P9: la sonda de la tasa: «¿Me ayudas con la tasa de ahorro o solo con gastos?» → capacidades (la tasa cede)", () => {
    const r = ask(libroBase(), "¿Me ayudas con la tasa de ahorro o solo con gastos?");
    assert.equal(fam(r), "capacidades");
  });
  it("C1 (contraria): la pregunta de dinero con «puedes» de cortesía no es sonda: «¿Puedes decirme cuánto gasté en la renta?» → historia o el total, nunca capacidades", () => {
    const r = ask(libroBase(), "¿Puedes decirme cuánto gasté en la renta?");
    assert.notEqual(fam(r), "capacidades");
  });
  it("C2 (contraria): la proyección con su dato no es sonda: «¿Cuánto tendré en diciembre si sigo apartando 100 al mes?» → proyeccion", () => {
    const r = ask(libroBase(), "¿Cuánto tendré en diciembre si sigo apartando 100 al mes?");
    assert.equal(fam(r), "proyeccion");
  });
  it("C3 (contraria): el reparto con monto y nombres no es sonda: «Reparte 300 entre Ana y Luis» → reparto", () => {
    const r = ask(libroBase(), "Reparte 300 entre Ana y Luis");
    assert.notEqual(fam(r), "capacidades");
  });
  it("C4 (contraria): la tasa pedida de verdad no es sonda: «¿Cuál es mi tasa de ahorro?» → tasa", () => {
    const r = ask(libroBase(), "¿Cuál es mi tasa de ahorro?");
    assert.equal(fam(r), "tasa");
  });
  it("P10: el menú con imperativo y clítico: «Hazme un menú de lo que puedo preguntarte» → capacidades (el reparador volvía «hazme» en «hace»)", () => {
    const r = ask(libroBase(), "Hazme un menú de lo que puedo preguntarte");
    assert.equal(fam(r), "capacidades");
  });
  it("C5 (contraria): el «hace» del tiempo no es verbo de capacidad: «¿Hace cuánto no le cae remesa a mi tío?» no es capacidades", () => {
    const r = ask(libroBase(), "¿Hace cuánto no le cae remesa a mi tío?");
    assert.notEqual(fam(r), "capacidades");
  });
});
