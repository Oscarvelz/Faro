/**
 * deuda-existencia — la pregunta desnuda de existencia de la
 * familia de deudas («¿Tengo alguna deuda?»), asentada por el
 * fallo de Oscar del 2026-11-27: la pregunta más sencilla de la
 * familia caía en «no lo sé responder» porque ninguna rama la
 * oía (todas piden cuánto, quién o a quién), y no estaba en el
 * banco. La rama responde sí o no con la cifra de la fuente
 * única (netBalance), en los dos libros y los dos idiomas, y
 * cierra la trampa inglesa que leía «anything» como un nombre.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addLoan } from "./loans.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}
function fixture(withDebt: boolean): LedgerState {
  let ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [] };
  if (withDebt) {
    ledger = addLoan(ledger, { id: "loan1", person: "Mamá", kind: "plain", amountMinor: 50000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
    ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  }
  ledger.settings.display = "USD";
  return ledger;
}

const ES_FORMS = ["¿Tengo alguna deuda?", "¿Tengo deudas?", "¿Debo algo?", "¿Debo dinero?", "¿Estoy endeudado?", "¿Tengo algún préstamo?"];

describe("deuda-existencia · la pregunta desnuda se responde", () => {
  it("con deuda: sí, con la cifra de la fuente única y su pieza", () => {
    const ledger = fixture(true);
    for (const q of ES_FORMS) {
      const r = ask(ledger, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "deudas", q);
      assert.ok(r.verdict.startsWith("Sí:"), `${q} → ${r.verdict}`);
      assert.ok(r.verdict.includes("$500.00"), `${q} → ${r.verdict}`);
      assert.equal(r.pieces.length, 1, q);
      assert.equal(r.pieces[0].minor, 50000, q);
    }
  });

  it("sin deuda: no, dicho entero, en todas las formas", () => {
    const ledger = fixture(false);
    for (const q of ES_FORMS) {
      const r = ask(ledger, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "deudas", q);
      assert.ok(r.verdict.startsWith("No debes nada anotado"), `${q} → ${r.verdict}`);
    }
  });

  it("inglés: la existencia y la trampa de «anything» como nombre", () => {
    const ledger = fixture(true);
    for (const q of ["Do I have any debt?", "Do I owe anything?"]) {
      const r = ask(ledger, q, "en");
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "deudas", q);
      assert.ok(r.verdict.startsWith("Yes:"), `${q} → ${r.verdict}`);
      assert.ok(!/Anything/.test(r.verdict), `${q} → ${r.verdict}`);
    }
  });

  it("el nombre resuelto sigue mandando: «¿Cuánto me debe Carlos?» no es esta rama", () => {
    const ledger = fixture(true);
    const r = ask(ledger, "¿Cuánto me debe Carlos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("Carlos"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.ok(!r.verdict.startsWith("Sí:"), r.verdict);
  });
});
