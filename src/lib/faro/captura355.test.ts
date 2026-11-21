/**
 * captura355 — LA FUSIÓN (1.3.355, decisión de Oscar del 2026-11-20).
 * La rama del banco entra como columna (banco.test.ts es su banco) y
 * estos especímenes son los injertos de la candidata preservada:
 *
 *  (1) EL ESCENARIO Y SU PREGUNTA DE VUELTA: «si sacara $20…» con
 *      ahorros en DOS bolsillos que cubren → ask-back con las cuentas
 *      por id; la vuelta clavada en una cuenta responde su efecto
 *      (lo libre que queda); clavada en una que no alcanza, lo dice.
 *  (2) CUENTA-ORIGEN directa: un solo bolsillo que cubre → respuesta
 *      sin preguntar; ninguno → la verdad primero.
 *  (3) YA PAGUÉ: la premisa se juzga — pagado nombra la línea; lo no
 *      encontrado se declara, no se inventa.
 *  (4) LAS PUERTAS DEL MAPA: cada entrada de FUNCTION_TOPIC resuelve
 *      a un tema del Manual con ruta (`go`) — la puerta de la caja
 *      nunca promete un salto que no existe.
 *  (5) LA CAJA: pregunta al banco (no al motor viejo suelto), rinde
 *      la pregunta de vuelta y la puerta de Faro mismo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FUNCTION_TOPIC } from "./askmap.ts";
import { answerBankQuestion } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import { findTopic } from "../manual/topics.ts";
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

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ahorro.subs.push({ id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "Banco", icon: "vault:bank", hidden: false, order: 11 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-10-05" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "banco", kind: "expense-fixed" as LineKind, concept: "Banco", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.banco" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es", pin?: { accountId: string }) {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY, pin);
}

describe("captura355 · el escenario y su pregunta de vuelta", () => {
  const ledger = fixture();

  it("«si sacara $20» con dos bolsillos que cubren pregunta de vuelta, con ids", () => {
    const r = ask(ledger, "Si sacara 20 dólares, ¿qué impacto tendría en mis ahorros?");
    assert.equal(r.kind, "ask-back");
    if (r.kind !== "ask-back") return;
    assert.equal(r.family, "cuenta-origen");
    assert.equal(r.options.length, 2);
    const ids = r.options.map((o) => o.id).sort();
    assert.deepEqual(ids, ["f.ahorro.banco", "f.ahorro.paypal"]);
    const banco = r.options.find((o) => o.id === "f.ahorro.banco");
    assert.equal(banco?.minor, 50000);
  });

  it("la vuelta clavada en Banco responde el efecto: quedan $480 libres", () => {
    const r = ask(ledger, "Si sacara 20 dólares, ¿qué impacto tendría en mis ahorros?", "es", { accountId: "f.ahorro.banco" });
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "cuenta-origen");
    assert.ok(r.verdict.includes("Banco"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(48000, "USD", "es")), r.verdict);
    assert.equal(r.pieces[1].minor, 48000);
  });

  it("la vuelta clavada en una cuenta que no alcanza lo dice entero", () => {
    const r = ask(ledger, "Si sacara 2000 dólares, ¿qué impacto tendría en mis ahorros?", "es", { accountId: "f.ahorro.banco" });
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(50000, "USD", "es")), r.verdict);
  });

  it("«¿de qué cuenta saco $20?» también pregunta de vuelta; $1,000 no — solo PayPal cubre", () => {
    const back = ask(ledger, "¿De qué cuenta saco $20?");
    assert.equal(back.kind, "ask-back");
    const one = ask(ledger, "¿De qué cuenta saco $1,000?");
    assert.equal(one.kind, "answer");
    if (one.kind !== "answer") return;
    assert.equal(one.family, "cuenta-origen");
    assert.ok(one.verdict.includes("PayPal"), one.verdict);
  });

  it("el escenario en inglés pregunta de vuelta igual", () => {
    const r = ask(ledger, "What if I took $20 out of my savings?", "en");
    assert.equal(r.kind, "ask-back");
  });
});

describe("captura355 · ya pagué juzga la premisa", () => {
  const ledger = fixture();

  it("lo pagado nombra su línea", () => {
    const r = ask(ledger, "¿Ya pagué el internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ya-pague");
    assert.ok(r.verdict.includes("Internet"), r.verdict);
  });

  it("lo que no existe se declara, no se inventa", () => {
    const r = ask(ledger, "¿Ya pagué el gimnasio?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ya-pague");
    assert.ok(r.verdict.includes("No lo encuentro"), r.verdict);
  });
});

describe("captura355 · las puertas del mapa y la caja", () => {
  it("cada puerta de FUNCTION_TOPIC resuelve a un tema con ruta", () => {
    const entries = Object.entries(FUNCTION_TOPIC);
    assert.ok(entries.length >= 12, `solo ${entries.length} puertas`);
    for (const [fn, tid] of entries) {
      const tp = findTopic(tid);
      assert.ok(tp, `${fn} → ${tid} no existe`);
      assert.ok(tp.go, `${fn} → ${tid} no tiene ruta`);
    }
  });

  it("la caja pregunta al banco y rinde la vuelta y la puerta", () => {
    const src = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
    assert.ok(src.includes("answerBankQuestion"), "la caja no pregunta al banco");
    assert.ok(src.includes('data-anchor="ask-back-chip"'), "la caja no rinde la pregunta de vuelta");
    assert.ok(src.includes('data-anchor="ask-door"'), "la caja no rinde la puerta de Faro mismo");
    assert.ok(src.includes("bankChips"), "los chips no son los del banco");
  });
});
