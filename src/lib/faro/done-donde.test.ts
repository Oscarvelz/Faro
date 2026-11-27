/**
 * done-donde — el hueco «done» → «donde» (registro
 * DONE-DONDE-REGISTRO.md, 2026-11-27): la palabra inglesa
 * «done» no estaba en el vocabulario y el reparador la
 * convertía en «donde». Fijarla tal cual se probó y se
 * retiró: atraía a «don» (el fragmento de «don't») y a
 * «one», y el espécimen de cargo caía. La cura cierra los
 * dos flancos: las contracciones se blindan antes de
 * reparar y «one» es intocable; con eso, «done» entra.
 * Todas las frases son acuñadas o canónicas declaradas y
 * el libro es inventado.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, normalizeEs, repairGateTypos } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { foldQ } from "./lexicon.ts";
import type { ParseCtx } from "./textparse.ts";
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

function libroCargo(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = {
    lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "tv", kind: "purchase" as LineKind, concept: "Televisor", amountMinor: 35000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-18" }),
      line({ id: "raro", kind: "expense-variable" as LineKind, concept: "XYZ Corp", amountMinor: 1234, bookedOn: "2026-10-20" }),
    ],
  };
  ledger.settings.display = "USD";
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function askEn(ledger: LedgerState, raw: string) {
  return answerBankQuestion(ledger, KEY, "en", makeNamer(ledger.structure, "en"), raw, ctx(ledger, "en"), TODAY);
}
function pipe(raw: string): string {
  return normalizeEs(repairGateTypos(foldQ(raw)));
}

describe("el hueco «done» · la palabra y sus dos flancos", () => {
  it("«done» ya no se mueve a «donde» en el pipeline entero", () => {
    const out = pipe("If I pay $50 extra a month on my card, when am I done and what do I save?");
    assert.ok(out.includes("done"), out);
    assert.ok(!out.includes("donde"), out);
  });
  it("la canónica de simulador sigue respondiendo su familia", () => {
    const r = askEn(libroCargo(), "If I pay $50 extra a month on my card, when am I done and what do I save?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "simulador");
  });
  it("la contracción blindada: «don't» sale del reparador intacta", () => {
    const out = pipe("I don't recognize a $12.34 charge");
    assert.ok(out.includes("don't"), out);
    const out2 = pipe("I can't pay this month");
    assert.ok(out2.includes("can't"), out2);
  });
  it("«one» es intocable: no se mueve a «done»", () => {
    const out = pipe("the one from Amazon");
    assert.ok(out.includes(" one "), ` ${out} `);
    assert.ok(!out.includes("done"), out);
  });
  it("el blindaje es de lista cerrada: la errata «cna't» sí se repara a «can't»", () => {
    const out = pipe("What cna't you do?");
    assert.ok(out.includes("can't"), out);
    const r = askEn(libroCargo(), "What cna't you do?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "limites");
  });
});

describe("el hueco «done» · la cerca registrada: el espécimen de cargo", () => {
  it("«What was the Amazon charge?» responde cargo", () => {
    const r = askEn(libroCargo(), "What was the Amazon charge?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "cargo");
    assert.ok(r.verdict.includes("Televisor"), r.verdict);
  });
  it("«I don't recognize a $12.34 charge» responde cargo, con su nota", () => {
    const r = askEn(libroCargo(), "I don't recognize a $12.34 charge");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "cargo");
    assert.ok((r.note ?? "").includes("can't judge"), r.note ?? "");
  });
});
