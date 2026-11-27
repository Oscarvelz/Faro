/**
 * reparto — LA CERCA DEL HUECO 3 DE COBERTURA (registro
 * HUECO-REPARTO-REGISTRO.md en runpod-comparacion): el reparto
 * igual entre personas nombradas traídas en la pregunta y la
 * suma de aportes con nombre. El libro manda primero (las
 * personas de Cobros y el puente de parentesco); el nombre que
 * el libro no conoce se toma como la pregunta lo trae. El
 * reparto por cuenta sin nombres sigue en la calculadora.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { addLent } from "./debts.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string) {
  return answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY);
}
function libroVacio(): LedgerState {
  const l = createInitial("es", "oscuro");
  l.settings.display = "USD";
  return l;
}

describe("hueco 3 de cobertura · el reparto entre nombrados y los aportes", () => {
  it("R1: «Divide 12,500 córdobas entre Ana, Luis y Patricia» — el verbo y los nombres traídos", () => {
    const r = ask(libroVacio(), "Divide 12,500 córdobas entre Ana, Luis y Patricia");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.label), ["Ana", "Luis", "Patricia"]);
    assert.deepEqual(r.pieces.map((p) => p.minor), [11377, 11377, 11376]);
  });

  it("R2: «Reparte 250 entre Pablo y Martina, mitad y mitad» — dos nombrados", () => {
    const r = ask(libroVacio(), "Reparte 250 entre Pablo y Martina, mitad y mitad");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.minor), [12500, 12500]);
  });

  it("R3: «¿Cuánto le toca a Juan, Luis, Marta y Eva de 120 dólares?» — la lista tras «toca a»", () => {
    const r = ask(libroVacio(), "¿Cuánto le toca a Juan, Luis, Marta y Eva de 120 dólares?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.minor), [3000, 3000, 3000, 3000]);
  });

  it("R4: «Reparte la luz de 2,348 córdobas entre los tres del apartamento: Rosa, Ernesto y yo»", () => {
    const r = ask(libroVacio(), "Reparte la luz de 2,348 córdobas entre los tres del apartamento: Rosa, Ernesto y yo");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.label), ["Rosa", "Ernesto", "Tú"]);
    assert.deepEqual(r.pieces.map((p) => p.minor), [2137, 2137, 2137]);
  });

  it("R5: los aportes sin verbo — «Ramón 40, Lissette 25, Junior 30 y yo 45» se suman", () => {
    const r = ask(libroVacio(), "Pusimos para la parrillada: Ramón 40, Lissette 25, Junior 30 y yo 45. ¿Cuánto fue en total?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 4);
    assert.equal(r.pieces.reduce((s, p) => s + p.minor, 0), 14000);
    assert.ok(r.verdict.includes("$140.00"), r.verdict);
  });

  it("R6: los aportes con dos puntos — «Toño, Lalo y Memo: 30, 20 y 25» se emparejan por orden", () => {
    const r = ask(libroVacio(), "Súmame lo que dieron Toño, Lalo y Memo para la carne asada: 30, 20 y 25");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.label), ["Toño", "Lalo", "Memo"]);
    assert.deepEqual(r.pieces.map((p) => p.minor), [3000, 2000, 2500]);
  });

  it("R7: la persona del libro manda — «Luis» de Cobros resuelve por el libro y «Ana» viene traída", () => {
    let l = libroVacio();
    l = addLent(l, { id: "lent1", person: "Luis", kind: "plain", amountMinor: 5000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
    const r = ask(l, "Divide 300 dólares entre Luis y Ana");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.minor), [15000, 15000]);
  });

  it("R8: «¿Cuánto le toca a cada uno de los 380 de la renta del local entre Daniel y Paty?» — no es factibilidad", () => {
    const r = ask(libroVacio(), "¿Cuánto le toca a cada uno de los 380 de la renta del local entre Daniel y Paty?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.minor), [19000, 19000]);
  });

  it("R9: la lista va primero — «Entre mi papá, mi hermana Fernanda y yo pagamos el seguro de 1,320 dólares»", () => {
    const r = ask(libroVacio(), "Entre mi papá, mi hermana Fernanda y yo pagamos el seguro de 1,320 dólares. ¿Cuánto es la parte de cada uno?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 3);
    assert.equal(r.pieces.reduce((s, p) => s + p.minor, 0), 132000);
  });

  it("R10: «¿Cuánto le toca a Camilo y a Juliana de los 480 dólares del viaje, mitad y mitad?»", () => {
    const r = ask(libroVacio(), "¿Cuánto le toca a Camilo y a Juliana de los 480 dólares del viaje, mitad y mitad?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.deepEqual(r.pieces.map((p) => p.minor), [24000, 24000]);
  });

  it("R11: la lista en minúscula del chat — «dividi 100 dolares entre yo, maria y pedro cuanto toca»", () => {
    const r = ask(libroVacio(), "dividi 100 dolares entre yo, maria y pedro cuanto toca");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 3);
    assert.equal(r.pieces.reduce((s, p) => s + p.minor, 0), 10000);
  });

  it("R12: la lista desnuda con su firma — «Kenia, Josué y yo, ¿a cuánto salimos?»", () => {
    const r = ask(libroVacio(), "El carro de alquiler fueron 715; Kenia, Josué y yo, ¿a cuánto salimos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 3);
    assert.equal(r.pieces.reduce((s, p) => s + p.minor, 0), 71500);
  });

  it("C1: el reparto por cuenta sin nombres no es reparto — «entre tres personas» queda fuera", () => {
    const r = ask(libroVacio(), "Parte 900 dólares entre tres personas");
    if (r.kind === "answer") assert.notEqual(r.family, "reparto");
  });

  it("C2: «¿Cuánto gasté este mes?» no es reparto", () => {
    const r = ask(libroVacio(), "¿Cuánto gasté este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.notEqual(r.family, "reparto");
  });
});
