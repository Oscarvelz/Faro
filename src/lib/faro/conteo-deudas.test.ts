/**
 * conteo-deudas — LA RESPUESTA AFINADA A LA PREGUNTA (fallo de Oscar
 * sobre el banco de la 512, 2026-11-27): «¿Cuánta lana me debe
 * Carlos?» entraba por la puerta del conteo — «cuánta» suena a
 * cuántas — y salía con la lista entera de deudores y las piezas en
 * cero, cuando la pregunta pide la cifra de UNA persona. La cura:
 * sin la palabra de gente, la forma de monto (la palabra del dinero
 * junto a cuánta/cuánto, o el nombre de una persona del libro tras
 * el verbo de deber) cede del conteo a deudas, que responde
 * afinada; la rama del total de deudas oye «cuánta lana me deben»;
 * y el conteo de verdad conserva su veredicto pero sus piezas
 * llevan lo que cada persona de veras debe, nunca ceros.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  ledger = addLent(ledger, { person: "Carlos", amountMinor: 30000, currency: "USD", date: "2026-10-03", note: "" });
  ledger = addLent(ledger, { person: "Alvin", amountMinor: 5000, currency: "USD", date: "2026-10-04", note: "" });
  return ledger;
}
const ledger = fixture();

function ctx(l: LedgerState): ParseCtx {
  return { ledger: l, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(q: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), q, ctx(ledger), TODAY);
}

describe("conteo-deudas · la respuesta afinada a la pregunta", () => {
  it("«¿Cuánta lana me debe Carlos?» responde de Carlos, no la lista entera", () => {
    const plain = ask("¿Cuánto me debe Carlos?");
    const lana = ask("¿Cuánta lana me debe Carlos?");
    assert.equal(lana.kind, "answer");
    if (lana.kind !== "answer" || plain.kind !== "answer") return;
    assert.equal(lana.family, "deudas");
    assert.ok(lana.verdict.includes("Carlos"), lana.verdict);
    assert.equal(lana.pieces.length, 1);
    assert.equal(lana.pieces[0].label, "Carlos");
    assert.ok(lana.pieces[0].minor > 0);
    // La misma persona y la misma cifra que la forma de siempre.
    assert.equal(lana.verdict, plain.verdict);
  });

  it("«¿Cuánta plata me debe Alvin?» responde de Alvin", () => {
    const r = ask("¿Cuánta plata me debe Alvin?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("Alvin"), r.verdict);
    assert.equal(r.pieces.length, 1);
    assert.ok(r.pieces[0].minor > 0);
  });

  it("«¿Cuánta lana me deben?» da el total con las piezas verdaderas", () => {
    const r = ask("¿Cuánta lana me deben?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("en total"), r.verdict);
    assert.equal(r.pieces.length, 2);
    assert.ok(r.pieces.every((p) => p.minor > 0), JSON.stringify(r.pieces));
  });

  it("el conteo de verdad se queda, y sus piezas ya no salen en cero", () => {
    const r = ask("¿Cuántas personas me deben?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "conteo");
    assert.ok(r.verdict.includes("2"), r.verdict);
    assert.equal(r.pieces.length, 2);
    assert.ok(r.pieces.every((p) => p.minor > 0), JSON.stringify(r.pieces));
    const conDinero = ask("¿Cuántas personas me deben dinero?");
    assert.equal(conDinero.kind, "answer");
    if (conDinero.kind === "answer") assert.equal(conDinero.family, "conteo");
    const en = ask("How many people owe me?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.equal(en.family, "conteo");
  });
});
