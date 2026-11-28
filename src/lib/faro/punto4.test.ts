// CERCA DEL PUNTO 4 (examen de conversaciones, 2026-11-28): los
// cuatro datos del motor que no cuadraban con el libro de prueba,
// cada uno con su pregunta y su cifra. El libro es el del examen
// (libro-prueba, hoy 2026-11-28): 2 tarjetas guardadas (Visa $645,
// Mastercard $237), préstamo del carro del Banco Nacional
// ($12,000, 21 cuotas de $285 pagadas, quedan $6,015), la luz de
// noviembre pagada ($45, día 5) y el apartado Carro ($200 este
// mes, $5,800 en total). Las preguntas son de esta línea, no del
// examen: el material quemado hecho regresión.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import type { BankResult } from "./ask2.ts";
import { makeNamer } from "./defaults.ts";
import { HOY_PRUEBA, KEY_PRUEBA, libroPrueba } from "./libro-prueba.ts";
import type { ParseCtx } from "./textparse.ts";

function ask(raw: string): BankResult {
  const l = libroPrueba();
  const names = makeNamer(l.structure, "es");
  const ctx = { ledger: l, lang: "es", today: HOY_PRUEBA, display: "USD", makeId: () => "q1", now: `${HOY_PRUEBA}T12:00:00.000Z` } as ParseCtx;
  return answerBankQuestion(l, KEY_PRUEBA, "es", names, raw, ctx, HOY_PRUEBA, undefined, undefined, undefined, null);
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");

describe("punto 4 · los cuatro datos contra el libro", () => {
  test("tarjetas: cuenta las guardadas, no el catálogo", () => {
    const r = ask("¿Cuántas tarjetas de crédito tengo?");
    assert.equal(r.kind, "answer");
    assert.match(verdict(r), /Tienes 2 tarjetas anotadas/);
  });
  test("préstamo: sus cuotas, su queda y su cuota tienen puerta", () => {
    assert.match(verdict(ask("¿Cuántas cuotas he pagado del préstamo del carro?")), /21 cuotas pagadas: \$5,985\.00 de los \$12,000\.00; te quedan \$6,015\.00/);
    assert.match(verdict(ask("¿Cuánto me queda por pagar del préstamo del carro?")), /te quedan \$6,015\.00 por pagar/);
    assert.match(verdict(ask("¿De cuánto es la cuota del préstamo del carro?")), /es de \$285\.00/);
  });
  test("luz: el nombre de 3 letras se encuentra pagado", () => {
    assert.match(verdict(ask("¿Ya pagué la luz de este mes?")), /Sí: «Luz» está pagado — \$45\.00/);
  });
  test("carro: la pregunta del mes recibe el flujo del mes", () => {
    assert.match(verdict(ask("¿Cuánto aparté para el carro este mes?")), /Este mes apartaste \$200\.00 para Carro\. En total, Carro suma \$5,800\.00/);
    // Sin período nombrado, la casa del bolsillo sigue siendo el stock.
    assert.match(verdict(ask("¿Cuánto llevo apartado para el carro?")), /Para Carro tienes \$5,800\.00 guardados/);
  });
  test("la existencia desnuda no la roba la puerta del préstamo", () => {
    const r = ask("¿Tengo algún préstamo?");
    assert.equal(r.kind, "answer");
    assert.doesNotMatch(verdict(r), /Del préstamo de .* te quedan/);
  });
});
