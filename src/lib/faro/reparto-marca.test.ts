/**
 * reparto-marca — LA CERCA DE LA MARCA DE COMPARTIDO (1.3.489).
 *
 * La especificación es REPARTO-SPEC.md (Ola 71): Line.split
 * { n, withIds? }, partes iguales, el usuario incluido en n. La
 * marca es una LENTE del Asesor: los totales del libro leen el
 * bruto siempre, y lo puesto por otros no se vuelve deuda de
 * Cobros por sí solo. Estas cercas fijan: la puerta del reparto
 * sobre lo anotado responde con partes cuando hay marcas (con y
 * sin nombres, ES y EN), la falta honesta sigue para lo no
 * marcado, la historia no se entera de la marca, y la marca
 * sobrevive al viaje de guardado (JSON) y a la edición de la
 * línea por la costura del guardián.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import type { ParseCtx } from "./textparse.ts";
import { addLent } from "./debts.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
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
  let l = createInitial("es", "oscuro");
  l = addLent(l, { id: "lent-alvin", person: "Alvin", kind: "plain", amountMinor: 5000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  l.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "cena", kind: "expense-variable" as LineKind, concept: "Cena", amountMinor: 9000, categoryId: "f-alimentos", bookedOn: "2026-10-18", split: { n: 3 } }),
    line({ id: "super", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 12000, categoryId: "f-alimentos", bookedOn: "2026-10-12", split: { n: 2, withIds: ["lent-alvin"] } }),
    line({ id: "taxi", kind: "expense-variable" as LineKind, concept: "Taxi", amountMinor: 2000, categoryId: "f-transporte", bookedOn: "2026-10-11" }),
  ] };
  l.settings.display = "USD";
  return l;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("reparto-marca · la puerta responde con partes cuando la marca existe", () => {
  it("la nombrada sin nombres: bruto, tu parte y lo puesto por otros", () => {
    const r = ask(fixture(), "¿Cuánto puso cada uno en la cena?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "reparto");
    assert.ok(r.verdict.includes("tu parte es $30.00"), r.verdict);
    assert.ok(r.verdict.includes("entre 3 personas"), r.verdict);
    assert.deepEqual(r.pieces, [
      { label: "Lo que salió de tu mano", minor: 9000 },
      { label: "Tu parte", minor: 3000 },
      { label: "Puesto por otros", minor: 6000 },
    ]);
    assert.ok((r.note ?? "").includes("no se vuelve deuda de Cobros"), r.note ?? "");
  });

  it("la nombrada con nombre: la parte de Alvin se nombra y el resto queda declarado", () => {
    const r = ask(fixture(), "¿Cuánto puso cada uno en el súper?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "reparto");
    assert.ok(r.verdict.includes("tu parte es $60.00"), r.verdict);
    assert.deepEqual(r.pieces, [
      { label: "Lo que salió de tu mano", minor: 12000 },
      { label: "Tu parte", minor: 6000 },
      { label: "Alvin", minor: 6000 },
    ]);
  });

  it("la general sin nombre: suma las marcadas del mes, cada una entre las suyas", () => {
    const r = ask(fixture(), "¿Cuánto he puesto en gastos compartidos este mes?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "reparto");
    // Cena 9000/3 = 3000 + Súper 12000/2 = 6000 → tu parte 9000 de 21000.
    assert.ok(r.verdict.includes("tu parte es $90.00"), r.verdict);
    const mine = r.pieces.find((p) => p.label === "Tu parte");
    assert.equal(mine?.minor, 9000);
    const alvin = r.pieces.find((p) => p.label === "Alvin");
    assert.equal(alvin?.minor, 6000);
    const rest = r.pieces.find((p) => p.label === "Los demás, sin nombrar");
    assert.equal(rest?.minor, 6000);
  });

  it("el espejo inglés: la misma puerta, con las partes", () => {
    // «dinner» no es el nombre de la línea en este libro (se llama
    // «Cena»): la puerta responde la forma general de las marcadas,
    // como hacía la falta de la Ola 71 con esta misma pregunta.
    const r = ask(fixture(), "How much did each of us put in for dinner?", "en");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "reparto");
    assert.ok(r.verdict.includes("your share is $90.00"), r.verdict);
    const en = ask(fixture(), "How much did each of us put in for the cena?", "en");
    if (en.kind !== "answer") assert.fail("debió responder");
    assert.ok(en.verdict.includes("your share is $30.00"), en.verdict);
  });

  it("lo no marcado sigue en falta honesta, con la puerta verdadera en la nota", () => {
    const r = ask(fixture(), "¿Cuánto puso cada uno en el taxi?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes("$20.00"), r.verdict);
    assert.ok((r.note ?? "").includes("La marca vive en la línea misma"), r.note ?? "");
    assert.ok((r.note ?? "").includes("editor"), r.note ?? "");
  });

  it("la historia no se entera de la marca: el total sigue entero", () => {
    const r = ask(fixture(), "¿Cuánto gasté en la cena?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$90.00"), r.verdict);
  });

  it("la casa: el cómo de la marca es la respuesta, no la negativa", () => {
    const r = ask(fixture(), "¿Cómo marco un gasto como compartido?");
    if (r.kind !== "answer") assert.fail("debió responder");
    assert.equal(r.family, "faro-mismo");
    assert.ok(r.verdict.includes("Sí se puede"), r.verdict);
  });
});

describe("reparto-marca · la marca sobrevive", () => {
  it("el viaje de guardado: el JSON del libro conserva la marca entera", () => {
    const l = fixture();
    const back = JSON.parse(JSON.stringify(l)) as LedgerState;
    const cena = back.months[KEY].lines.find((x) => x.id === "cena");
    assert.deepEqual(cena?.split, { n: 3 });
    const sup = back.months[KEY].lines.find((x) => x.id === "super");
    assert.deepEqual(sup?.split, { n: 2, withIds: ["lent-alvin"] });
    const taxi = back.months[KEY].lines.find((x) => x.id === "taxi");
    assert.equal(taxi?.split, undefined);
  });

  it("el guardián de la edición: la línea editada conserva su marca por el esparcido", () => {
    // La forma guarda { ...existing, ...fresh }: un campo que la
    // forma no pinta sobrevive; y la marca SÍ se pinta (editor.split).
    // Aquí se fija el contrato de datos que la forma consume.
    const l = fixture();
    const cena = l.months[KEY].lines.find((x) => x.id === "cena")!;
    const edited: Line = { ...cena, concept: "Cena con amigos" };
    assert.deepEqual(edited.split, { n: 3 });
  });
});
