/**
 * captura345 — Preguntar al Asesor (Captura Ola 5a, mapa F8 + §8.4).
 * La misma pregunta en los tres registros y en los dos idiomas da la
 * misma intención; las trampas del mapa caen donde deben («gastar sin
 * tocar» es dinero libre, no gasto; sin monto no se adivina); y cada
 * respuesta se calcula a mano contra la Lectura del libro de la foto.
 * Cero fabricación: la pregunta desconocida es silencio honesto y el
 * motor de respuestas no conoce commit ni upsertLine.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { answerQuestion } from "./ask.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { duesWindow } from "./dues.ts";
import { cushionOf } from "./funds.ts";
import { askChips, parseQuestion } from "./lexicon.ts";
import { FEATURES } from "./mode.ts";
import { formatMoney } from "./money.ts";
import { savingsStock } from "./savings.ts";
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
  const rows: Array<[string, LineKind, string, number, string, string]> = [
    ["salario", "income-fixed", "Salario", 57041, "", ""],
    ["negocio", "income-variable", "Negocio propio", 39823, "", ""],
    ["casa", "expense-fixed", "Casa", 2457, "f-casa", "f.casa.servicios"],
    ["alimentos", "expense-fixed", "Alimentos", 9556, "f-alimentos", "f.alimentos.despensa"],
    ["paypal", "expense-fixed", "PayPal", 129900, "f-ahorro", "f.ahorro.paypal"],
  ];
  ledger.months[KEY] = { lines: rows.map(([id, kind, concept, amountMinor, categoryId, subId]) => line({ id, kind, concept, amountMinor, categoryId, subId, recurring: kind === "expense-fixed" })) };
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("captura345 · el léxico escucha en el registro del usuario", () => {
  const ledger = fixture();
  it("la misma pregunta en tres registros y dos idiomas da la misma intención", () => {
    const cases: Array<[string, string, string]> = [
      ["¿Puedo gastar $100 en zapatos?", "spend", "llano"],
      ["¿Me alcanza para gastar $100 en zapatos?", "spend", "coloquial"],
      ["¿Puedo gastar $100 manteniendo mi saldo disponible?", "spend", "tecnico"],
      ["Can I spend $100 on shoes?", "spend", "llano"],
      ["Can I afford $100 on shoes?", "spend", "llano"],
      ["¿Cuánto puedo sacar sin tocar mis ahorros?", "free", "llano"],
      ["¿Cuánto me sobra para sacar?", "free", "coloquial"],
      ["How much can I take out without touching my savings?", "free", "llano"],
      ["¿Cuánto me queda para el mes?", "left", "llano"],
      ["¿Cuánto me queda para el año?", "left", "llano"],
      ["How much do I have left for the month?", "left", "llano"],
      ["¿Cómo voy?", "how", "llano"],
      ["How am I doing?", "how", "llano"],
    ];
    for (const [raw, intent, register] of cases) {
      const q = parseQuestion(raw, ctx(ledger, raw.match(/[a-z]/i) && /can|how|what/i.test(raw) ? "en" : "es"));
      assert.ok(q, raw);
      assert.equal(q.intent, intent, raw);
      assert.equal(q.register, register, raw);
    }
  });

  it("el año se marca y el monto del gasto se lee de la misma pregunta", () => {
    const year = parseQuestion("¿Cuánto me queda para el año?", ctx(ledger));
    assert.equal(year?.year, true);
    const month = parseQuestion("¿Cuánto me queda para el mes?", ctx(ledger));
    assert.equal(month?.year, false);
    const spend = parseQuestion("¿Puedo gastar $100 en zapatos?", ctx(ledger));
    assert.equal(spend?.amountMinor, 10000);
    assert.equal(spend?.currency, "USD");
    assert.ok((spend?.concept ?? "").includes("zapatos"), spend?.concept);
  });

  it("las trampas: «gastar sin tocar» es free; lo desconocido es silencio", () => {
    const trap = parseQuestion("¿Cuánto puedo gastar sin tocar mis ahorros?", ctx(ledger));
    assert.equal(trap?.intent, "free");
    assert.equal(parseQuestion("¿Cuál es el sentido de la vida?", ctx(ledger)), null);
    assert.equal(parseQuestion("¿Qué tiempo hace hoy?", ctx(ledger)), null);
    assert.equal(askChips("es").length, 4);
    assert.equal(askChips("en").length, 4);
  });
});

describe("captura345 · las respuestas se calculan a mano", () => {
  const ledger = fixture();
  const reading = readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: new Date(`${TODAY}T12:00:00`) });

  it("spend: el veredicto y la queda con el gasto salen de la Lectura", () => {
    const r = ask(ledger, "¿Puedo gastar $100 en zapatos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    const leftAfter = reading.left - 10000;
    assert.equal(r.pieces[1].minor, leftAfter);
    assert.ok(r.verdict.includes(formatMoney(leftAfter, "USD", "es")), r.verdict);
    assert.equal(r.draft?.amountMinor, 10000);
    assert.equal(r.draft?.currency, "USD");
  });

  it("spend sin monto no adivina: pide el dato", () => {
    assert.equal(ask(ledger, "¿Puedo gastar en zapatos?").kind, "need-amount");
  });

  it("spend imposible: el veredicto lo dice y nombra lo que se rompe", () => {
    const r = ask(ledger, "¿Puedo gastar $99,999 en un carro?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.note?.includes("negativo"), r.note ?? "");
  });

  it("free: las piezas SON la resta del mapa, y suman el veredicto", () => {
    const stock = savingsStock(ledger, KEY);
    const saldo = stock.byClass.cuenta ?? 0;
    const dues = duesWindow(ledger, 14, TODAY).reduce((a, d) => a + (d.amt ?? 0), 0);
    const libre = saldo - stock.pledged - dues - cushionOf(stock).floorShortfall;
    const r = ask(ledger, "¿Cuánto puedo sacar sin tocar mis ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    const sum = r.pieces.reduce((a, p) => a + p.minor, 0);
    assert.equal(sum, libre);
    assert.ok(r.verdict.includes(formatMoney(libre, "USD", "es")), r.verdict);
  });

  it("left del mes es la queda de la Lectura; el del año dice su supuesto", () => {
    const m = ask(ledger, "¿Cuánto me queda para el mes?");
    assert.equal(m.kind, "answer");
    if (m.kind === "answer") assert.equal(m.pieces[2].minor, reading.left);
    const y = ask(ledger, "¿Cuánto me queda para el año?");
    assert.equal(y.kind, "answer");
    if (y.kind !== "answer") return;
    assert.equal(y.pieces[1].minor, reading.left * 3);
    assert.ok(y.note?.includes("supuesto"), y.note ?? "");
  });

  it("how trae el titular de la Lectura; lo desconocido se declara", () => {
    const h = ask(ledger, "¿Cómo voy?");
    assert.equal(h.kind, "answer");
    if (h.kind === "answer") assert.equal(h.verdict, reading.headline);
    assert.equal(ask(ledger, "¿Cuál es el sentido de la vida?").kind, "unknown");
  });

  it("cero fabricación: el motor no guarda ni mueve dinero", () => {
    const askSrc = readFileSync(new URL("./ask.ts", import.meta.url), "utf8");
    assert.ok(!/\bupsertLine\s*\(|\bcommit\s*\(|\baddDrafts\s*\(/.test(askSrc));
    assert.ok(askSrc.includes("readAdvisor"));
  });
});

describe("captura345 · la puerta", () => {
  it("los asientos nacen declarados: preguntar es Esencial, los escenarios Completo", () => {
    assert.equal(FEATURES["advisor.ask"], "esencial");
    assert.equal(FEATURES["advisor.ask-scenarios"], "completo");
    assert.equal(FEATURES["advisor.ask"], FEATURES["capture.tray"]);
  });

  // La 351 movió la caja bajo las Palabras claras (palabra posterior de
  // Oscar); el orden exacto lo fija captura351. Aquí queda su asiento.
  it("la caja vive en el Asesor, gobernada por su asiento", () => {
    const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
    assert.ok(box.includes('has("advisor.ask")'));
    assert.ok(box.includes('data-anchor="advisor-ask"'));
    assert.ok(box.includes("addDrafts"), "Registrarlo deja el gasto en la bandeja");
    const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    assert.ok(screens.includes("<AskBox />"));
  });

  it("el tema del Manual existe, con burbuja breve y su ancla rendida", () => {
    const topics = readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
    const at = topics.indexOf('id: "preguntar-asesor"');
    assert.ok(at >= 0);
    // El bloque se corta en el SIGUIENTE tema, no en una ventana fija:
    // la ventana de 4600 quedó corta cuando la 1.3.355 contó la batería
    // en el tema — el localizador mejora, las aserciones son las mismas.
    const next = topics.indexOf('\n        id: "', at + 10);
    const block = topics.slice(at, next > at ? next : at + 4600);
    assert.ok(block.includes("bubble:"));
    assert.ok(block.includes('anchor: "advisor-ask"'));
  });
});
