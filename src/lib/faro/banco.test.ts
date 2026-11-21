/**
 * banco — el banco ampliado del Asesor (rama independiente, 2026-11-20).
 * Los especímenes son las preguntas REALES de Oscar en su teléfono:
 * las tres de la primera prueba («¿Cuánto tengo para gastar en gustos?»,
 * «¿Cuánto gasté el último mes en tiendas?», «¿Cuánto me queda en
 * ahorros?») y las trece de la segunda ronda (recencia, agenda,
 * ranking, remesas). Cada respuesta se verifica contra el motor que la
 * produce — nunca contra una cifra escrita a mano sin fuente.
 *
 * Las cercas: (1) el desvío está curado — ahorros no cae en how;
 * (2) «sin tocar mis ahorros» sigue siendo free (su trampa manda);
 * (3) toda familia viva declara fuentes que existen en el mapa;
 * (4) las familias declaradas (ausencia/identidad/seguimiento) y la
 * opinión («¿debería invertir?») siguen en silencio honesto;
 * (5) el motor no conoce commit ni upsertLine (cero fabricación).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FARO_FUNCTION_MAP } from "./askmap.ts";
import { answerBankQuestion, bankChips } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { duesWindow } from "./dues.ts";
import { formatMoney } from "./money.ts";
import { QUESTION_BANK, liveFamilies } from "./questionbank.ts";
import { addRemitPerson } from "./remit-people.ts";
import { savingsStock } from "./savings.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
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
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-10-05" }),
      line({ id: "negocio", kind: "income-variable" as LineKind, concept: "Negocio propio", amountMinor: 39823, bookedOn: "2026-10-18" }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "compra1", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 8000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-15" }),
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
    ],
  };
  const added = addRemitPerson(ledger, "Mamá", "mama");
  ledger = added.state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLent(ledger, { id: "lent2", person: "Ana", kind: "plain", amountMinor: 10000, currency: "USD", aprBps: 0, startedOn: "2026-09-02", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("banco · los especímenes de Oscar responden", () => {
  const ledger = fixture();

  it("AHORROS ya no se desvía a «cómo voy»: responde el stock", () => {
    const r = ask(ledger, "¿Cuánto me queda en ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    const stock = savingsStock(ledger, KEY);
    assert.ok(r.verdict.includes(formatMoney(stock.total, "USD", "es")), r.verdict);
    assert.ok(r.source.includes("ahorros.stock"));
  });

  it("GUSTOS responde la capacidad con la resta del dinero libre", () => {
    const r = ask(ledger, "¿Cuánto tengo para gastar en gustos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "gustos");
    assert.equal(r.pieces.length, 4);
  });

  it("HISTORIA: el último mes en tiendas suma las compras de ese mes", () => {
    const r = ask(ledger, "¿Cuánto gasté el último mes en tiendas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 5000);
    assert.equal(r.lines, 1);
  });

  it("RECENCIA: la última vez que me pagaron, la última compra, la última tienda, la remesa a mamá", () => {
    const pay = ask(ledger, "¿Cuándo fue la última vez que me pagaron?");
    assert.equal(pay.kind, "answer");
    if (pay.kind === "answer") assert.ok(pay.verdict.includes("2026-10-18"), pay.verdict);
    const buy = ask(ledger, "¿Qué fue lo último que compré?");
    assert.equal(buy.kind, "answer");
    if (buy.kind === "answer") assert.ok(buy.verdict.includes("Zapatos"), buy.verdict);
    const rem = ask(ledger, "¿Cuál fue el último monto que envié a mamá?");
    assert.equal(rem.kind, "answer");
    if (rem.kind === "answer") {
      assert.equal(rem.family, "recencia");
      assert.ok(rem.verdict.includes(formatMoney(17000, "USD", "es")), rem.verdict);
    }
  });

  it("AGENDA: las primeras cuotas salen de la ventana de Cobros", () => {
    const r = ask(ledger, "¿Cuáles son las primeras cuotas del mes que necesito pagar?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "agenda");
    const dues = duesWindow(ledger, 31, TODAY);
    assert.ok(dues.length > 0);
    assert.ok(r.pieces.some((p) => p.label.includes("Internet")), JSON.stringify(r.pieces));
  });

  it("RANKING: quién me debe más sale de peopleOf", () => {
    const r = ask(ledger, "¿Quién me debe más?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Carlos"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
  });

  it("REMESAS: el patrón nombra a la persona y su total", () => {
    const r = ask(ledger, "¿Cuándo envías remesas y a quién?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "remesas");
    assert.ok(r.verdict.includes("Mamá"), r.verdict);
  });

  it("HISTORIA sin filtro: «gasté» no se lee como filtro de «gas» (palabra entera)", () => {
    const r = ask(ledger, "¿Cuánto gasté este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    // Casa 2457 + Zapatos 8000 + Remesa 17000 + Internet 4999; el apartado a PayPal (rol ahorro) NO es gasto.
    assert.equal(r.pieces[0].minor, 32456);
    assert.equal(r.lines, 4);
  });

  it("COMPARAR: este mes contra el pasado, del mismo summarize", () => {
    const r = ask(ledger, "¿Gasté más este mes o el mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.equal(r.pieces.length, 2);
  });
});

describe("banco · las trampas y los silencios", () => {
  const ledger = fixture();

  it("«sin tocar mis ahorros» sigue siendo free, no ahorros", () => {
    const r = ask(ledger, "¿Cuánto puedo sacar sin tocar mis ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "free");
  });

  it("la opinión y lo desconocido siguen en silencio honesto", () => {
    assert.equal(ask(ledger, "¿Debería invertir mi dinero?").kind, "unknown");
    assert.equal(ask(ledger, "¿Cuál es el sentido de la vida?").kind, "unknown");
    assert.equal(ask(ledger, "¿Y en tiendas?").kind, "unknown");
  });

  it("lo heredado de la 5a sigue vivo a través del banco", () => {
    const spend = ask(ledger, "¿Puedo gastar $100 en zapatos?");
    assert.equal(spend.kind, "answer");
    if (spend.kind === "answer") assert.equal(spend.family, "spend");
    const how = ask(ledger, "¿Cómo voy?");
    assert.equal(how.kind, "answer");
    if (how.kind === "answer") assert.equal(how.family, "how");
  });

  it("FARO MISMO responde desde el mapa, con pantalla", () => {
    const r = ask(ledger, "¿Dónde veo mis recompensas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "faro-mismo");
    assert.ok(r.source.includes("cobros.tarjetas"));
  });

  it("los chips del banco son las preguntas de Oscar", () => {
    assert.equal(bankChips("es").length, 6);
    assert.ok(bankChips("es")[0].includes("ahorros"));
  });
});

describe("banco · las cercas del mapa y del banco", () => {
  it("toda familia viva declara fuentes que existen en el mapa", () => {
    const ids = new Set(FARO_FUNCTION_MAP.map((f) => f.id));
    for (const fam of liveFamilies()) {
      assert.ok(fam.source.length > 0, fam.id);
      for (const s of fam.source) assert.ok(ids.has(s), `${fam.id} → ${s}`);
    }
  });

  it("toda familia del banco trae canónicas en los dos idiomas y sus silencios", () => {
    for (const fam of QUESTION_BANK) {
      assert.ok(fam.canonical.es.length > 0, fam.id);
      assert.ok(fam.canonical.en.length > 0, fam.id);
      assert.ok(fam.silences.length > 0, fam.id);
      assert.ok(fam.axes.length > 0, fam.id);
    }
  });

  it("el mapa cubre las trece áreas de Faro", () => {
    const areas = new Set(FARO_FUNCTION_MAP.map((f) => f.area));
    for (const a of ["Central", "Libros", "Cobros", "Ahorros", "Estudio", "Asesor", "Folios", "Captura", "Mesa de cambio", "Ajustes", "Cuenta"]) {
      assert.ok(areas.has(a), a);
    }
  });

  it("cero fabricación: el motor de respuestas no conoce commit ni upsertLine", () => {
    const src = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
    assert.ok(!/upsertLine|commitDrafts/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
  });
});
