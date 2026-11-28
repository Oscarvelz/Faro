// CERCA DE LA GUARDA DE PERSONA (examen de conversaciones,
// 2026-11-28): el seguimiento que cambia de persona. La forma
// entera re-preguntada pasa por la reescritura con el período
// del marco intacto, el nombre dicho a medias («Diego» por
// «Primo Diego») resuelve a su persona, y las guardas de
// siempre no se mueven: la dirección contraria se declara y la
// persona que no existe se niega sin servir la cifra de otra.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import type { BankResult, ConvoFrame } from "./ask2.ts";
import { makeNamer } from "./defaults.ts";
import { HOY_PRUEBA, KEY_PRUEBA, libroPrueba } from "./libro-prueba.ts";
import type { LedgerState } from "./types.ts";
import type { ParseCtx } from "./textparse.ts";

class Box {
  frame: ConvoFrame | null = null;
  l: LedgerState;
  constructor(l: LedgerState) { this.l = l; }
  ask(raw: string): BankResult {
    const names = makeNamer(this.l.structure, "es");
    const ctx = { ledger: this.l, lang: "es", today: HOY_PRUEBA, display: "USD", makeId: () => "q1", now: `${HOY_PRUEBA}T12:00:00.000Z` } as ParseCtx;
    const r = answerBankQuestion(this.l, KEY_PRUEBA, "es", names, raw, ctx, HOY_PRUEBA, undefined, undefined, undefined, this.frame);
    if (r.kind === "answer" && r.convo) this.frame = r.convo;
    return r;
  }
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");

describe("guarda de persona · el cambio de persona en seguimiento", () => {
  test("la forma entera conserva el período del marco", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto le mandé a Mamá este año?");
    const r = b.ask("¿Y a Tía Rosa cuánto le mandé?");
    assert.match(verdict(r), /A Tía Rosa le has mandado \$480\.00 este año/);
  });
  test("el nombre dicho a medias resuelve a su persona", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto le mandé a Mamá este año?");
    b.ask("¿Y a Tía Rosa cuánto le mandé?");
    const r = b.ask("¿Y a Diego?");
    assert.match(verdict(r), /A Primo Diego le has mandado \$2,000\.00 este año/);
  });
  test("las guardas: la dirección contraria y la persona desconocida", () => {
    const b = new Box(libroPrueba());
    b.ask("¿Cuánto me debe Carlos?");
    assert.match(verdict(b.ask("¿Y Alvin cuánto me debe?")), /Al revés: Alvin no te debe a ti/);
    const b2 = new Box(libroPrueba());
    b2.ask("¿Cuánto le mandé a Mamá este año?");
    assert.match(verdict(b2.ask("¿Y cuánto le mandé a Juan este año?")), /no voy a darte la remesa de otra persona/);
  });
});
