/**
 * captura380 — EL SEGUIMIENTO DEL ASESOR (§20, 1.3.380; fallo de
 * Oscar «Hazlo», 2026-11-21 20:11). Conversaciones SELLADAS de dos y
 * tres turnos: una cadena es un espécimen, no preguntas sueltas — la
 * última solo se puede responder con el hilo.
 *
 * El libro del espécimen trae LAS CIFRAS DE OSCAR de la noche del
 * fallo (2026-11-21 20:01): este mes $809.85 contra el pasado
 * $572.31, diferencia $237.54 — repartida por categoría con subidas
 * ($287.54) y una bajada ($50.00) para que la descomposición tenga
 * que CERRAR la aritmética exacta, no solo nombrar el mayor.
 *
 * Las leyes en la cerca: el marco se nombra en la primera línea
 * (L-S2); sin hilo, la lectura sola nombra su mes y jamás inventa
 * una comparación (L-S1); el cambio de tema abre marco nuevo y el
 * viejo no se filtra (L-S4); el marco vive en la conversación — el
 * libro queda byte a byte idéntico (cerca 2 del brief); proyectar
 * bajo el piso nombra el piso sin cifras (cerca 4).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, answerFollowUp, type AskFrame, type BankResult } from "./ask2.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const PREV2 = "2026-08";
const TODAY = "2026-10-22";
const CASA = "f-casa";
const FAMILIA = "f-familia";
const SEGUROS = "f-seguros";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function spend(id: string, monthKey: string, categoryId: string, amountMinor: number): Line {
  return line({ id, kind: "expense-variable" as LineKind, concept: id, amountMinor, categoryId, monthKey, bookedOn: `${monthKey}-10` });
}

function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  for (const id of [CASA, FAMILIA, SEGUROS]) {
    const cat = ledger.structure.categories.find((c) => c.id === id);
    if (!cat) throw new Error(`missing ${id}`);
    cat.role = ""; // el pool de gasto de la cerca no excluye por rol
  }
  // Las cifras de Oscar: oct 80985 · sep 57231 · dif 23754
  // (casa +15000 · seguros +13754 · familia −5000).
  ledger.months[KEY] = { lines: [spend("o-casa", KEY, CASA, 35000), spend("o-fam", KEY, FAMILIA, 20000), spend("o-seg", KEY, SEGUROS, 25985)] };
  ledger.months[PREV] = { lines: [spend("s-casa", PREV, CASA, 20000), spend("s-fam", PREV, FAMILIA, 25000), spend("s-seg", PREV, SEGUROS, 12231)] };
  ledger.months[PREV2] = { lines: [spend("a-casa", PREV2, CASA, 10000), spend("a-fam", PREV2, FAMILIA, 20000)] };
  ledger.settings.display = "USD";
  return ledger;
}

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
const moneyEs = (n: number) => formatMoney(n, "USD", "es");
const moneyEn = (n: number) => formatMoney(n, "USD", "en");

/** La conversación, como la caja la conduce: seguimiento primero,
 * cascada después; cada respuesta con marco lo reemplaza. */
function convo(ledger: LedgerState, lang: "es" | "en" = "es", mode: "esencial" | "completo" = "completo") {
  const names = makeNamer(ledger.structure, lang);
  let frame: AskFrame | null = null;
  const ask = (raw: string): BankResult => {
    const fu = answerFollowUp(ledger, KEY, lang, names, raw, ctx(ledger, lang), TODAY, frame, mode);
    const r = fu ?? answerBankQuestion(ledger, KEY, lang, names, raw, ctx(ledger, lang), TODAY, undefined, mode);
    if (r.kind === "answer") frame = r.frame ?? null;
    return r;
  };
  return { ask, names, frame: () => frame };
}

function answer(r: BankResult): Extract<BankResult, { kind: "answer" }> {
  assert.equal(r.kind, "answer");
  if (r.kind !== "answer") throw new Error("not an answer");
  return r;
}

describe("captura380 · espécimen n.º 1 — las dos preguntas de Oscar, con sus cifras", () => {
  it("comparar → «¿En qué gasté más?» descompone y la aritmética cierra exacta (ES)", () => {
    const { ask } = convo(fixture());
    const t1 = answer(ask("¿Gasté más este mes o el pasado?"));
    assert.equal(t1.family, "comparar");
    assert.deepEqual(t1.pieces.map((p) => p.minor), [80985, 57231]);
    const t2 = answer(ask("¿En qué gasté más?"));
    assert.ok(t2.verdict.startsWith("Siguiendo tu comparación"), t2.verdict);
    const byMinor = new Map(t2.pieces.map((p) => [p.minor, p.label]));
    assert.ok(byMinor.has(15000), "la subida de Casa (+$150) es pieza");
    assert.ok(byMinor.has(13754), "la subida de Seguros (+$137.54) es pieza");
    assert.ok(t2.note?.includes("La cuenta cierra"), t2.note ?? "");
    assert.ok(t2.note?.includes(moneyEs(28754)), "las subidas suman $287.54");
    assert.ok(t2.note?.includes(moneyEs(5000)), "la bajada de $50.00 se nombra");
    assert.ok(t2.note?.includes(moneyEs(23754)), "y cierran en la diferencia de Oscar: $237.54");
  });

  it("the same conversation in English", () => {
    const { ask } = convo(fixture(), "en");
    const t1 = answer(ask("Did I spend more this month or last month?"));
    assert.equal(t1.family, "comparar");
    const t2 = answer(ask("What did I spend the most on?"));
    assert.ok(t2.verdict.startsWith("Following your comparison"), t2.verdict);
    assert.ok(t2.note?.includes("The account closes"), t2.note ?? "");
    assert.ok(t2.note?.includes(moneyEn(23754)), t2.note ?? "");
  });
});

describe("captura380 · la cadena de tres y los demás verbos", () => {
  it("comparar → descomponer → estrechar («¿y en Casa?») clava el sujeto del marco", () => {
    const ledger = fixture();
    const { ask, names, frame } = convo(ledger);
    answer(ask("¿Gasté más este mes o el pasado?"));
    answer(ask("¿En qué gasté más?"));
    const t3 = answer(ask(`¿Y en ${names.cat(CASA)}?`));
    assert.ok(t3.verdict.startsWith("Siguiendo tu comparación"), t3.verdict);
    assert.deepEqual(t3.pieces.map((p) => p.minor), [35000, 20000]);
    const f = frame();
    assert.ok(f?.kind === "compare2" && f.filter?.kind === "category", "el marco queda estrechado a la categoría");
  });

  it("desplazar: comparar → «¿y el mes anterior?» corre la ventana un mes atrás", () => {
    const { ask, frame } = convo(fixture());
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿Y el mes anterior?"));
    assert.ok(t2.verdict.includes("un mes más atrás"), t2.verdict);
    assert.deepEqual(t2.pieces.map((p) => p.minor), [57231, 30000]);
    const f = frame();
    assert.ok(f?.kind === "compare2" && f.monthA === PREV && f.monthB === PREV2, "el marco nuevo es la ventana corrida");
  });

  it("explicar: comparar → «¿por qué subió?» lee la descomposición como causa, cerrando", () => {
    const { ask } = convo(fixture());
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿Por qué subió?"));
    assert.ok(t2.verdict.includes("sobre todo porque"), t2.verdict);
    assert.ok(t2.note?.includes("La cuenta cierra"), t2.note ?? "");
  });

  it("desplazar sobre historia: «¿cuánto gasté este mes?» → «¿y el mes anterior?»", () => {
    const { ask } = convo(fixture());
    const t1 = answer(ask("¿Cuánto gasté este mes?"));
    assert.equal(t1.family, "historia");
    const t2 = answer(ask("¿Y el mes anterior?"));
    assert.ok(t2.verdict.startsWith("Siguiendo tu pregunta"), t2.verdict);
    assert.deepEqual(t2.pieces.map((p) => p.minor), [57231]);
  });
});

describe("captura380 · las trampas", () => {
  it("sin hilo: «¿en qué gasté más?» en caja fresca es la mayor del mes en curso — sin comparación inventada (L-S1)", () => {
    const { ask, names } = convo(fixture());
    const t = answer(ask("¿En qué gasté más?"));
    assert.ok(t.verdict.startsWith("Este mes, tu mayor gasto es"), t.verdict);
    assert.ok(t.verdict.includes(names.cat(CASA)), t.verdict);
    assert.ok(!/comparación/i.test(t.verdict), "ningún marco de comparación se inventa");
    assert.deepEqual(t.pieces.map((p) => p.minor), [35000, 25985, 20000]);
  });

  it("cambio de tema: el marco viejo no se filtra a la respuesta nueva (L-S4)", () => {
    const { ask } = convo(fixture());
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿Cuánto gasté el mes pasado?"));
    assert.equal(t2.family, "historia");
    assert.deepEqual(t2.pieces.map((p) => p.minor), [57231]);
    const t3 = answer(ask("¿En qué gasté más?"));
    assert.ok(t3.verdict.startsWith("Siguiendo tu pregunta"), t3.verdict);
    assert.ok(!/comparación/i.test(t3.verdict), "la comparación vieja no resucita");
    assert.deepEqual(t3.pieces.map((p) => p.minor), [25000, 20000, 12231]);
  });

  it("una línea sin categoría se nombra «Sin categoría» en la descomposición — jamás una pieza en blanco", () => {
    const ledger = fixture();
    ledger.months[KEY] = { lines: [spend("o-x", KEY, "", 50000)] };
    ledger.months[PREV] = { lines: [spend("s-x", PREV, "", 30000)] };
    const { ask } = convo(ledger);
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿En qué gasté más?"));
    assert.equal(t2.pieces.length, 1);
    assert.equal(t2.pieces[0].label, "Sin categoría");
    assert.equal(t2.pieces[0].minor, 20000);
  });

  it("el marco jamás entra al libro: el ledger queda idéntico tras la conversación", () => {
    const ledger = fixture();
    const before = JSON.stringify(ledger);
    const { ask } = convo(ledger);
    answer(ask("¿Gasté más este mes o el pasado?"));
    answer(ask("¿En qué gasté más?"));
    answer(ask("¿Y el mes anterior?"));
    assert.equal(JSON.stringify(ledger), before);
  });
});

describe("captura380 · proyectar hereda el piso de la proyección (cerca 4)", () => {
  it("en Esencial nombra Completo y no entrega cifras", () => {
    const { ask } = convo(fixture(), "es", "esencial");
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿Y el mes que viene?"));
    assert.ok(t2.verdict.includes("Completo"), t2.verdict);
    assert.equal(t2.pieces.length, 0);
  });

  it("en Completo proyecta el ritmo con el supuesto dicho", () => {
    const { ask } = convo(fixture(), "es", "completo");
    answer(ask("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask("¿Y el mes que viene?"));
    assert.deepEqual(t2.pieces.map((p) => p.minor), [80985]);
    assert.ok(t2.note?.includes("El supuesto, dicho"), t2.note ?? "");
  });
});
