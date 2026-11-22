/**
 * MODOS · OLA 27 — la cerca de la cura de la Ola 27 (Equipo Amigo).
 * Nueve familias. Cada espécimen corre ROJO sobre la prístina de la
 * base (1.3.386) y VERDE aquí:
 *
 *  (1) La puerta de patrones juzga como el escritor (G27-1 + G27-3 +
 *      G27-4 + G27-5): un solo juez de forma (aliasShapeOk) para la
 *      puerta del libro y el lector — palabra plegada, no vacía, con
 *      su largo; ciudadano presente; contadores finitos y no
 *      negativos; los duplicados se resuelven con la ley del escritor
 *      (la última corrección manda) y un olvido borra UN ciudadano.
 *  (2) El settle no recompone sobre lo que no lee entero (G27-2): el
 *      sitio que el crudo tiene ocupado y el filtro no reconoce no se
 *      compone encima — la edición ilegible queda tal cual, sin
 *      anunciarse como nueva; el folio malformado, igual.
 *  (3) La comparación titula con lo vivo (Q27-1): descomponer y
 *      explicar derivan su diferencia de las piezas vivas del turno;
 *      la identidad impresa es la aritmética viva.
 *  (4) La familia seguimiento, viva (Q27-2/E27-1): el banco la
 *      declara viva, la descripción generada la cuenta entre lo que
 *      Faro sabe hacer (en «Faro y tu futuro»), y el encabezado de
 *      ask2 ya no la cuenta entre las declaradas.
 *  (5) El alias de persona enruta en las remesas (Q27-3): la recencia
 *      y la suma por persona consultan el ciudadano person; la
 *      persona que no se resuelve se nombra, jamás degrada a la
 *      última global; la suma por persona se sirve en los tres modos.
 *  (6) Los lugares caminan el catálogo (Q27-C1 de Cara): la tienda
 *      del catálogo con presencia viva en el libro es un lugar, con
 *      su puerta de Tiendas.
 *  (7) Las claves EN de a-la-mano y el verbo «exporto» (Q27-C2 de
 *      Cara + F27-1): la guarda de objeto de ahorros, la puerta del
 *      paso 12 con «exporto» y las formas de la fila, y la precedencia
 *      del compartir que cae.
 *  (8) Las recetas re-leen dentro del commit (Q27-C1 de Cambios): el
 *      olvido y el aprendizaje de la caja viajan por commitGuarded
 *      re-leyendo askPatternsOf(s) dentro — ninguna receta de
 *      patrones lee de la foto del render.
 *  (9) El seguimiento recibe los patrones (F27-2): answerFollowUp
 *      enhebra learned y estrechar hacia una palabra aprendida
 *      compone la respuesta con el marco sobreviviendo el turno.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { BookMode } from "./advisor.ts";
import { answerBankQuestion, answerFollowUp, type AskFrame, type BankResult } from "./ask2.ts";
import { aliasIn, askPatternsOf, forgetAlias, learnAlias, type LearnedAlias } from "./asklearn.ts";
import * as asklearnNs from "./asklearn.ts";
/** El juez único de forma (aliasShapeOk) NACE con esta cura: en la
 * prístina no existe. Se lee por el namespace para que la cerca corra
 * espécimen por espécimen sobre la prístina — los que nombran al juez
 * caen por su ausencia (shapeOk = false), y los demás juzgan la
 * conducta vieja de cada puerta, que es el rojo que importa. */
const shapeOk = (p: unknown): boolean =>
  (asklearnNs as { aliasShapeOk?: (p: unknown) => boolean }).aliasShapeOk?.(p) ?? false;
import { capabilitiesText } from "./askpresets.ts";
import { logbookOf, pendingEdition, settleLogbook } from "./bitacora.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import { QUESTION_BANK } from "./questionbank.ts";
import { searchPlaces } from "./search.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const TODAY = "2026-11-21";
const KEY = "2026-11";
const moneyEs = (n: number) => formatMoney(n, "USD", "es");

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function book(months: Record<string, Line[]>): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  for (const [k, lines] of Object.entries(months)) ledger.months[k] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es", mode: BookMode = "esencial"): BankResult {
  const ctx: ParseCtx = { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx, TODAY, undefined, mode, askPatternsOf(ledger));
}

function answer(r: BankResult): Extract<BankResult, { kind: "answer" }> {
  assert.equal(r.kind, "answer");
  if (r.kind !== "answer") throw new Error("not an answer");
  return r;
}

const srcOf = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

/* ════════════ §1 · Familia 1 — la puerta de patrones ════════════ */

const PAT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  word: "la luz", targetId: "f.casa.servicios", kind: "sub", hits: 1, learnedFrom: "correction", ...over,
});

describe("ola27 · (1) la puerta de patrones juzga como el escritor", () => {
  it("el patrón sano pasa las dos puertas y dispara (control)", () => {
    const store = askPatternsOf({ askPatterns: [PAT()] });
    assert.equal(store.length, 1);
    assert.equal(aliasIn(store, "cuanto gaste en la luz")?.targetId, "f.casa.servicios");
    const ledger = book({});
    ledger.askPatterns = [PAT()] as unknown as LearnedAlias[];
    assert.equal(isLedgerDeep(ledger), true, "el libro con el patrón sano pasa la puerta del libro");
  });

  it("G27-1: la palabra vacía no pasa ninguna puerta ni dispara contra cualquier pregunta", () => {
    assert.equal(shapeOk(PAT({ word: "" })), false);
    assert.deepEqual(askPatternsOf({ askPatterns: [PAT({ word: "" })] }), [], "el lector la descarta");
    const store = askPatternsOf({ askPatterns: [PAT({ word: "" })] });
    assert.equal(aliasIn(store, "cuanto gaste en comida"), null, "sin ciudadano fantasma en ES");
    assert.equal(aliasIn(store, "how much did i spend on food"), null, "ni en EN");
    const ledger = book({});
    ledger.askPatterns = [PAT({ word: "" })] as unknown as LearnedAlias[];
    assert.equal(isLedgerDeep(ledger), false, "la puerta del libro la rehúsa, como el escritor");
  });

  it("G27-5: la palabra sin plegar («La Luz») es zombi y las dos puertas la rehúsan; el targetId vacío, igual", () => {
    assert.equal(shapeOk(PAT({ word: "La Luz" })), false, "no es la forma que el escritor acuña");
    assert.deepEqual(askPatternsOf({ askPatterns: [PAT({ word: "La Luz" })] }), []);
    assert.equal(shapeOk(PAT({ targetId: "" })), false);
    assert.deepEqual(askPatternsOf({ askPatterns: [PAT({ targetId: "" })] }), [], "el lector ya lo descartaba");
    const ledger = book({});
    ledger.askPatterns = [PAT({ targetId: "" })] as unknown as LearnedAlias[];
    assert.equal(isLedgerDeep(ledger), false, "y ahora la puerta del libro también: las dos puertas dicen lo mismo");
  });

  it("G27-4: los contadores se juzgan con la finitud de la casa — NaN, Infinity y negativos fuera", () => {
    for (const bad of [{ hits: Number.NaN }, { hits: Number.POSITIVE_INFINITY }, { hits: -1 }, { uses: Number.NaN }, { uses: -2 }]) {
      assert.equal(shapeOk(PAT(bad)), false, `rehúsa ${JSON.stringify(bad)}`);
      assert.deepEqual(askPatternsOf({ askPatterns: [PAT(bad)] }), [], "el lector lo descarta");
    }
    assert.ok(shapeOk(PAT({ uses: 0 })), "el cero es un conteo sano");
    const ledger = book({});
    ledger.askPatterns = [PAT({ hits: Number.NaN })] as unknown as LearnedAlias[];
    assert.equal(isLedgerDeep(ledger), false, "la puerta del libro juzga igual");
  });

  it("G27-3: los duplicados se resuelven con la ley del escritor y un olvido borra UN ciudadano", () => {
    const raw = [PAT({ targetId: "f.casa.servicios" }), PAT({ targetId: "f.casa.agua", hits: 3 })];
    const store = askPatternsOf({ askPatterns: raw });
    assert.equal(store.length, 1, "una palabra, un ciudadano");
    assert.equal(store[0]!.targetId, "f.casa.agua", "la última corrección manda");
    assert.equal(aliasIn(store, "cuanto gaste en la luz")?.targetId, "f.casa.agua", "aliasIn sirve al ciudadano de la corrección");
    assert.deepEqual(forgetAlias(store, "la luz"), [], "un olvido borra exactamente ese ciudadano");
    const ledger = book({});
    ledger.askPatterns = raw as unknown as LearnedAlias[];
    assert.equal(isLedgerDeep(ledger), true, "la puerta del libro juzga la forma, no la unicidad: el libro duplicado no está dañado");
  });

  it("el escritor no cambió: learnAlias sigue rehusando la palabra vacía y la de dígitos (control)", () => {
    assert.deepEqual(learnAlias([], "", "x", "sub", "correction"), []);
    assert.deepEqual(learnAlias([], "piso 2", "x", "sub", "correction"), []);
  });
});

/* ════════════ §2 · Familia 2 — el settle no recompone ════════════ */

describe("ola27 · (2) el settle no recompone sobre lo que no lee entero", () => {
  const spend = (id: string, monthKey: string, amountMinor: number): Line =>
    line({ id, kind: "expense-variable" as LineKind, concept: id, amountMinor, categoryId: "f-casa", monthKey, bookedOn: `${monthKey}-10` });
  const yearBook = () => book({ "2025-10": [spend("y1", "2025-10", 10000)], "2025-11": [spend("y2", "2025-11", 12000)] });

  it("control: con el sitio libre, el año compone su edición como siempre", () => {
    const out = settleLogbook(yearBook(), "2026-01-15");
    assert.equal(out.changed, true);
    assert.ok(logbookOf(out.state).editions["2025"], "la edición nace");
  });

  it("G27-2: la edición con una tarjeta que cardOk rehúsa queda tal cual — ni se recompone ni se anuncia", () => {
    const composed = settleLogbook(yearBook(), "2026-01-15").state;
    const good = logbookOf(composed).editions["2025"]!;
    const badEd = {
      ...good, countedOn: "2025-12-31", seenAt: "2026-01-03",
      cards: good.cards.map((cd, i) => (i === 0 ? { ...cd, points: 42 } : cd)),
    };
    assert.equal(logbookOf({ ...yearBook(), logbook: { months: {}, editions: { "2025": badEd } } } as LedgerState).editions["2025"], undefined,
      "el filtro no la reconoce (una tarjeta malformada la vuelve invisible entera)");
    const host = yearBook();
    host.logbook = { months: {}, editions: { "2025": badEd } } as unknown as LedgerState["logbook"];
    const out = settleLogbook(host, "2026-02-01");
    const raw = (out.state.logbook as unknown as { editions: Record<string, unknown> }).editions["2025"];
    assert.deepEqual(raw, badEd, "la edición ilegible sobrevive byte a byte: su countedOn y su seenAt intactos");
    assert.equal(pendingEdition(out.state), null, "y no se anuncia como nueva");
  });

  it("G27-2 (gemelo): el folio malformado de un mes con líneas vivas no se re-fotografía; el mes limpio sí asienta", () => {
    const base = book({ "2025-03": [spend("m1", "2025-03", 9000)], "2026-10": [spend("m2", "2026-10", 7000)] });
    const withFolio = settleLogbook(base, TODAY).state;
    const goodFolio = logbookOf(withFolio).months["2025-03"]!;
    const badFolio = { ...goodFolio, income: "mucho" };
    const host = book({ "2025-03": [spend("m1", "2025-03", 9000)], "2026-10": [spend("m2", "2026-10", 7000)] });
    host.logbook = { months: { "2025-03": badFolio }, editions: {} } as unknown as LedgerState["logbook"];
    const out = settleLogbook(host, TODAY);
    const raw = (out.state.logbook as unknown as { months: Record<string, unknown> }).months["2025-03"];
    assert.deepEqual(raw, badFolio, "el folio ilegible queda tal cual");
    assert.ok(logbookOf(out.state).months["2026-10"], "y el asentamiento sigue obrando donde el sitio está libre");
  });
});

/* ════════════ §3 · Familia 3 — la comparación titula con lo vivo ════════════ */

describe("ola27 · (3) descomponer y explicar recomputan su titular", () => {
  const CASA = "f-casa", FAMILIA = "f-familia", SEGUROS = "f-seguros";
  const spend3 = (id: string, monthKey: string, categoryId: string, amountMinor: number): Line =>
    line({ id, kind: "expense-variable" as LineKind, concept: id, amountMinor, categoryId, monthKey, bookedOn: `${monthKey}-10` });
  function fixture3(): LedgerState {
    const ledger = createInitial("es", "oscuro");
    for (const id of [CASA, FAMILIA, SEGUROS]) {
      const cat = ledger.structure.categories.find((c) => c.id === id);
      if (cat) cat.role = "";
    }
    ledger.months["2026-10"] = { lines: [spend3("o-casa", "2026-10", CASA, 35000), spend3("o-fam", "2026-10", FAMILIA, 20000), spend3("o-seg", "2026-10", SEGUROS, 25985)] };
    ledger.months["2026-09"] = { lines: [spend3("s-casa", "2026-09", CASA, 20000), spend3("s-fam", "2026-09", FAMILIA, 25000), spend3("s-seg", "2026-09", SEGUROS, 12231)] };
    ledger.settings.display = "USD";
    return ledger;
  }
  function convo3(ledger: LedgerState) {
    const names = makeNamer(ledger.structure, "es");
    let frame: AskFrame | null = null;
    const ctx = (): ParseCtx => ({ ledger, lang: "es", today: "2026-10-22", display: "USD", makeId: () => "q1", now: "2026-10-22T12:00:00.000Z" });
    const ask3 = (raw: string): BankResult => {
      const fu = answerFollowUp(ledger, "2026-10", "es", names, raw, ctx(), "2026-10-22", frame, "completo");
      const r = fu ?? answerBankQuestion(ledger, "2026-10", "es", names, raw, ctx(), "2026-10-22", undefined, "completo");
      if (r.kind === "answer") frame = r.frame ?? null;
      return r;
    };
    return { ask3 };
  }

  it("Q27-1: si el libro cambia entre turnos, la identidad impresa es la aritmética viva", () => {
    const ledger = fixture3();
    const { ask3 } = convo3(ledger);
    answer(ask3("¿Gasté más este mes o el pasado?")); // el marco congela 80985 contra 57231
    ledger.months["2026-10"]!.lines.push(spend3("o-casa2", "2026-10", CASA, 10000)); // el libro cambia: octubre vivo = 90985
    const t2 = answer(ask3("¿En qué gasté más?"));
    assert.ok(t2.verdict.includes(moneyEs(33754)), `el titular es la diferencia viva ($337.54), no la del marco: ${t2.verdict}`);
    assert.ok(t2.note?.includes("La cuenta cierra"), t2.note ?? "");
    assert.ok(t2.note?.includes(moneyEs(38754)), "las subidas vivas suman $387.54");
    assert.ok(t2.note?.includes(moneyEs(5000)), "la bajada viva es $50.00");
    assert.ok(t2.note?.includes(moneyEs(33754)), "y cierran en la diferencia viva: 38754 − 5000 = 33754");
  });

  it("Q27-1: explicar también — su «gastó más» sale de las piezas del turno", () => {
    const ledger = fixture3();
    const { ask3 } = convo3(ledger);
    answer(ask3("¿Gasté más este mes o el pasado?"));
    ledger.months["2026-10"]!.lines.push(spend3("o-casa2", "2026-10", CASA, 10000));
    const t2 = answer(ask3("¿Por qué subió?"));
    assert.ok(t2.verdict.includes(moneyEs(33754)), `explicar titula con lo vivo: ${t2.verdict}`);
    assert.ok(t2.note?.includes(moneyEs(33754)), t2.note ?? "");
  });

  it("control: sin cambio entre turnos, la identidad es la de siempre ($237.54)", () => {
    const { ask3 } = convo3(fixture3());
    answer(ask3("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask3("¿En qué gasté más?"));
    assert.ok(t2.note?.includes(moneyEs(23754)), t2.note ?? "");
  });
});

/* ════════════ §4 · Familia 4 — la familia seguimiento, viva ════════════ */

describe("ola27 · (4) la familia seguimiento, viva", () => {
  it("el banco la declara viva y la descripción la cuenta entre lo que Faro sabe hacer, ES/EN", () => {
    const fam = QUESTION_BANK.find((f) => f.id === "seguimiento");
    assert.equal(fam?.status, "viva", "su motor nació en §20 (1.3.380): el banco ya no la niega");
    for (const lang of ["es", "en"] as const) {
      const text = capabilitiesText(lang);
      const future = text.groups.find((g) => g.title === (lang === "es" ? "Faro y tu futuro" : "Faro and your future"));
      assert.ok(future?.items.some((i) => i.toLowerCase().includes(lang === "es" ? "seguir una respuesta" : "following up on an answer")),
        `su cap vive en «Faro y tu futuro» (${lang})`);
      assert.ok(!text.notYet.some((i) => i.toLowerCase().includes(lang === "es" ? "seguir una respuesta" : "following up on an answer")),
        `ya no se cuenta entre lo que todavía no sabe (${lang})`);
    }
  });

  it("el encabezado de ask2 ya no la cuenta entre las declaradas", () => {
    const src = srcOf("./ask2.ts");
    assert.ok(!src.includes("identidad,\n *    seguimiento"), "la frase vieja se corrigió en su parte de seguimiento");
    assert.ok(src.includes("Seguimiento salió de esta lista en la Ola"), "con su razón escrita");
  });
});

/* ════════════ §5 · Familia 5 — el alias de persona en las remesas ════════════ */

describe("ola27 · (5) el alias de persona enruta en las remesas", () => {
  function remitBook(withAlias: boolean): LedgerState {
    const ledger = book({
      "2026-10": [
        line({ id: "r-mama", kind: "expense-variable" as LineKind, concept: "Remesa a Mamá", amountMinor: 32000, categoryId: "f-remesas", to: "p-mama", bookedOn: "2026-10-12", monthKey: "2026-10" }),
        line({ id: "r-primo", kind: "expense-variable" as LineKind, concept: "Remesa a Primo", amountMinor: 5000, categoryId: "f-remesas", to: "p-primo", bookedOn: "2026-10-20", monthKey: "2026-10" }),
      ],
    });
    ledger.remitPeople = [
      { id: "p-mama", name: "Mamá" },
      { id: "p-primo", name: "Primo" },
      { id: "p-tia", name: "Tía" },
    ];
    if (withAlias) {
      ledger.askPatterns = [{ word: "mami", targetId: "p-mama", kind: "person", hits: 1, learnedFrom: "correction" }] as unknown as LearnedAlias[];
    }
    return ledger;
  }

  it("Q27-3: la recencia resuelve «mami» por su alias confirmado — la remesa de Mamá, no la de Primo", () => {
    const r = answer(ask(remitBook(true), "¿Cuándo fue la última remesa a mami?"));
    assert.equal(r.family, "recencia");
    assert.ok(r.verdict.includes("Mamá"), r.verdict);
    assert.ok(r.verdict.includes(moneyEs(32000)), "su remesa: $320.00 del 2026-10-12");
    assert.ok(r.verdict.includes("2026-10-12"), r.verdict);
    assert.ok(!r.verdict.includes("Primo"), "jamás la de otra persona disfrazada");
  });

  it("control: con el nombre verdadero, la misma respuesta", () => {
    const r = answer(ask(remitBook(true), "¿Cuándo fue la última remesa a Mamá?"));
    assert.ok(r.verdict.includes(moneyEs(32000)) && r.verdict.includes("2026-10-12"), r.verdict);
  });

  it("Q27-3: la persona que no se resuelve se NOMBRA — nunca degrada a la última global", () => {
    const r = answer(ask(remitBook(false), "¿Cuándo fue la última remesa a mami?"));
    assert.ok(r.verdict.includes("No sé quién es «mami»"), r.verdict);
    assert.ok(!r.verdict.includes(moneyEs(5000)), "la remesa de Primo ($50.00) no se entrega como si fuera la suya");
    assert.ok(!r.verdict.includes("Primo"), r.verdict);
  });

  it("Q27-3: la suma por persona se sirve con alias y con nombre verdadero, en Esencial y en Completo", () => {
    for (const mode of ["esencial", "completo"] as const) {
      const a = answer(ask(remitBook(true), "¿Cuánto le mandé a mami?", "es", mode));
      assert.equal(a.family, "remesas");
      assert.ok(a.verdict.includes("Mamá") && a.verdict.includes(moneyEs(32000)), `${mode} · alias: ${a.verdict}`);
      const b = answer(ask(remitBook(true), "¿Cuánto he enviado a Mamá este año?", "es", mode));
      assert.ok(b.verdict.includes(moneyEs(32000)) && b.verdict.includes("este año"), `${mode} · nombre verdadero (la canónica del banco): ${b.verdict}`);
    }
  });

  it("Q27-3: la persona que existe y no ha recibido nada recibe su contradicción declarada, no la suma de otra", () => {
    const r = answer(ask(remitBook(true), "¿Cuánto le mandé a Tía?"));
    assert.ok(r.verdict.includes("No hay envíos a Tía"), r.verdict);
    assert.ok(!r.verdict.includes(moneyEs(32000)), r.verdict);
  });

  it("Q27-3: la suma a una persona que no se resuelve también se nombra; sin persona, el patrón sirve (control)", () => {
    const r = answer(ask(remitBook(false), "¿Cuánto le mandé a mami?"));
    assert.ok(r.verdict.includes("No sé quién es «mami»"), r.verdict);
    const agg = ask(remitBook(true), "¿Cuánto envío en remesas?", "es", "completo");
    assert.ok(agg.kind !== "answer" || !agg.verdict.includes("No sé quién es"), "sin persona nombrada no hay negativa: el patrón sigue siendo dueño");
  });
});

/* ════════════ §6 · Familia 6 — los lugares caminan el catálogo ════════════ */

describe("ola27 · (6) los lugares caminan el catálogo", () => {
  function shopBook(): LedgerState {
    return book({
      "2026-11": [line({ id: "p-shein", kind: "purchase" as LineKind, concept: "Compra en Shein", amountMinor: 145000, currency: "NIO", storeId: "shein" })],
    });
  }

  it("Q27-C1: la tienda del catálogo con compras vivas es un lugar, con su puerta de Tiendas", () => {
    const ledger = shopBook();
    const names = makeNamer(ledger.structure, "es");
    const hits = searchPlaces(ledger, "shein", "es", names);
    const store = hits.find((h) => h.kind === "store");
    assert.ok(store, `Shein se ofrece como lugar: ${JSON.stringify(hits)}`);
    assert.equal(store!.title, "Shein");
    assert.equal(store!.where, "Tienda · Tiendas");
    const namesEn = makeNamer(ledger.structure, "en");
    assert.equal(searchPlaces(ledger, "shein", "en", namesEn).find((h) => h.kind === "store")?.where, "Store · Shops");
  });

  it("controles: sin presencia viva no hay lugar; oculta, tampoco; la clase de compra sigue encontrándose", () => {
    const ledger = shopBook();
    const names = makeNamer(ledger.structure, "es");
    assert.ok(!searchPlaces(ledger, "temu", "es", names).some((h) => h.kind === "store"), "Temu está en el catálogo pero el libro no lo ha usado: no es lugar todavía");
    const hidden = shopBook();
    hidden.structure.catalog = hidden.structure.catalog.map((i) => (i.id === "shein" ? { ...i, hidden: true } : i));
    assert.ok(!searchPlaces(hidden, "shein", "es", names).some((h) => h.kind === "store"), "la tienda oculta no se ofrece");
    assert.ok(searchPlaces(ledger, "ropa", "es", names).some((h) => h.kind === "purchase"), "«Ropa» (clase de compra) sigue ofreciendo su puerta");
  });
});

/* ════════════ §7 · Familia 7 — claves EN y el verbo «exporto» ════════════ */

describe("ola27 · (7) las claves EN de a-la-mano y el verbo «exporto»", () => {
  it("Q27-C2: «save a question» y «saved questions» llegan a su puerta, no al saldo de ahorros", () => {
    for (const q of ["How do I save a question?", "Where do I see my saved questions?", "Where are my questions at hand?"]) {
      const r = answer(ask(book({}), q, "en", "esencial"));
      assert.equal(r.family, "faro-mismo", `${q} → la familia de faro-mismo`);
      assert.deepEqual(r.source, ["settings.ask-presets"], `${q} → su función, con su piso nombrado en el veredicto`);
    }
  });

  it("control ES: «¿Cómo guardo una pregunta?» sigue llegando (la cura de la Ola 26 no se mueve)", () => {
    const r = answer(ask(book({}), "¿Cómo guardo una pregunta?", "es", "esencial"));
    assert.deepEqual(r.source, ["settings.ask-presets"], r.verdict);
  });

  it("control: guardar DINERO sigue siendo de ahorros — la guarda mira el objeto, no el verbo", () => {
    const r = answer(ask(book({}), "How much do I have in savings?", "en", "esencial"));
    assert.equal(r.family, "ahorros", r.verdict);
  });

  it("F27-1: «¿Dónde exporto…?» y «¿Cómo exporto…?» llegan al mapa y nombran Ritmo; el inglés no se mueve", () => {
    for (const q of ["¿Dónde exporto mis números?", "¿Cómo exporto mis números?"]) {
      const r = answer(ask(book({}), q, "es", "esencial"));
      assert.equal(r.family, "faro-mismo", q);
      assert.deepEqual(r.source, ["ajustes.exportar"], `${q} → su función`);
      assert.ok(r.verdict.includes("Ritmo"), `bajo su piso, el veredicto lo nombra: ${r.verdict}`);
    }
    const en = answer(ask(book({}), "Where do I export my numbers?", "en", "esencial"));
    assert.deepEqual(en.source, ["ajustes.exportar"], en.verdict);
  });

  it("F27-1 (costura gemela): «¿Dónde cae lo que comparto desde otra app?» llega a inbox.link; compartir el libro, no (su guarda)", () => {
    const r = answer(ask(book({}), "¿Dónde cae lo que comparto desde otra app?", "es", "esencial"));
    assert.equal(r.family, "faro-mismo", r.verdict);
    assert.deepEqual(r.source, ["inbox.link"], r.verdict);
    const guard = ask(book({}), "¿Cómo comparto mi libro?", "es", "esencial");
    assert.ok(guard.kind !== "answer" || !guard.source.includes("inbox.link"), "la guarda de objeto de la Ola 26 sigue cerrando la puerta contraria");
  });
});

/* ════════════ §8 · Familia 8 — las recetas re-leen dentro del commit ════════════ */

describe("ola27 · (8) las recetas de patrones re-leen dentro del commit", () => {
  it("la forma en la caja: olvido y aprendizaje viajan por commitGuarded y re-leen askPatternsOf(s) dentro", () => {
    const box = srcOf("../../components/faro/ask-box.tsx");
    assert.ok(box.includes("commitGuarded"), "la caja usa la puerta guardada para los patrones");
    const reReads = box.split("askPatternsOf(s)").length - 1;
    assert.ok(reReads >= 3, `tres recetas re-leen dentro (toque, olvido, aprendizaje): hay ${reReads}`);
    assert.ok(!box.includes("commit((s) => ({ ...s, askPatterns: next })"), "la forma vieja — instalar la lista calculada de la foto — ya no existe");
  });

  it("la composición (espécimen de Cambios, en forma): lo ganado después de la foto sobrevive al olvido y al aprendizaje", () => {
    const SUB = "f.casa.servicios";
    const atPhoto = askPatternsOf({ askPatterns: [PAT({ word: "banco", targetId: "acct-banco", kind: "account" })] });
    // El estado vivo gana «la luz» DESPUÉS de la foto del render (otra superficie, otra pestaña).
    const live = learnAlias(atPhoto, "la luz", SUB, "sub", "correction");
    assert.equal(live.length, 2);
    // La forma vieja: la lista se calcula de la foto y se instala entera.
    const oldInstall = forgetAlias(atPhoto, "banco");
    assert.ok(!oldInstall.some((a) => a.word === "la luz"), "la forma vieja pierde «la luz» en el commit (el quiebre, compuesto)");
    // La forma curada: la receta re-lee el estado vivo dentro del commit.
    const newInstall = forgetAlias(askPatternsOf({ askPatterns: live }), "banco");
    assert.ok(newInstall.some((a) => a.word === "la luz"), "la forma nueva conserva lo ganado");
    assert.ok(!newInstall.some((a) => a.word === "banco"), "y el olvido ordenado sí ocurre");
    const learnedInstall = learnAlias(askPatternsOf({ askPatterns: live }), "banco", "acct-banco", "account", "card-tap");
    assert.ok(learnedInstall.some((a) => a.word === "la luz"), "el aprendizaje re-leído tampoco pisa lo ganado");
  });
});

/* ════════════ §9 · Familia 9 — el seguimiento recibe los patrones ════════════ */

describe("ola27 · (9) el seguimiento recibe los patrones", () => {
  const SUB = "f.casa.servicios";
  function luzBook(): LedgerState {
    const ledger = book({
      "2026-11": [
        line({ id: "l-luz", kind: "expense-variable" as LineKind, concept: "Recibo de luz", amountMinor: 42000, categoryId: "f-casa", subId: SUB, bookedOn: "2026-11-10" }),
        line({ id: "l-super", kind: "expense-variable" as LineKind, concept: "Súper", amountMinor: 30000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", bookedOn: "2026-11-11" }),
      ],
      "2026-10": [
        line({ id: "o-luz", kind: "expense-variable" as LineKind, concept: "Recibo de luz", amountMinor: 38000, categoryId: "f-casa", subId: SUB, bookedOn: "2026-10-10", monthKey: "2026-10" }),
      ],
    });
    ledger.askPatterns = [{ word: "la luz", targetId: SUB, kind: "sub", hits: 1, learnedFrom: "correction" }] as unknown as LearnedAlias[];
    return ledger;
  }
  /** La conversación, como la caja curada la conduce: los patrones se
   * enhebran al seguimiento Y a la cascada, como ask-box hace. */
  function convo9(ledger: LedgerState, withPatterns: boolean) {
    const names = makeNamer(ledger.structure, "es");
    let frame: AskFrame | null = null;
    const ctx = (): ParseCtx => ({ ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` });
    const patterns = askPatternsOf(ledger);
    const ask9 = (raw: string): BankResult => {
      const fu = answerFollowUp(ledger, KEY, "es", names, raw, ctx(), TODAY, frame, "esencial", withPatterns ? patterns : undefined);
      const r = fu ?? answerBankQuestion(ledger, KEY, "es", names, raw, ctx(), TODAY, undefined, "esencial", patterns);
      if (r.kind === "answer") frame = r.frame ?? null;
      return r;
    };
    return { ask9, frame: () => frame };
  }

  it("F27-2: «¿Y en la luz?» estrecha el marco con la palabra aprendida, y el marco sobrevive el turno", () => {
    const { ask9, frame } = convo9(luzBook(), true);
    const t1 = answer(ask9("¿Cuánto gasté este mes?"));
    assert.equal(t1.family, "historia");
    const before = frame();
    assert.ok(before?.kind === "period1", "hay marco vivo");
    const t2 = answer(ask9("¿Y en la luz?"));
    assert.ok(t2.verdict.startsWith("Siguiendo tu pregunta"), t2.verdict);
    assert.ok(t2.verdict.includes("«la luz»"), "nombra la palabra del usuario");
    assert.ok(t2.verdict.includes(moneyEs(42000)), "y entrega la cifra viva de su ciudadano ($420.00), no el total del mes");
    assert.ok(!t2.verdict.includes(moneyEs(72000)), t2.verdict);
    assert.deepEqual(frame(), before, "el marco sobrevive el turno intacto: la palabra aprendida no tiene descriptor fiel y no se finge uno");
  });

  it("F27-2: sobre una comparación, la palabra aprendida estrecha los dos meses", () => {
    const { ask9 } = convo9(luzBook(), true);
    answer(ask9("¿Gasté más este mes o el pasado?"));
    const t2 = answer(ask9("¿Y en la luz?"));
    assert.ok(t2.verdict.startsWith("Siguiendo tu comparación"), t2.verdict);
    assert.ok(t2.verdict.includes(moneyEs(42000)) && t2.verdict.includes(moneyEs(38000)), t2.verdict);
  });

  it("control: sin enhebrar los patrones, el mismo turno no se resuelve como seguimiento (el hueco cazado)", () => {
    const { ask9 } = convo9(luzBook(), false);
    answer(ask9("¿Cuánto gasté este mes?"));
    const t2 = ask9("¿Y en la luz?");
    assert.equal(t2.kind, "unknown", "con learned vacío el seguimiento no ve la palabra: cae a la cascada y la elipsis sola no significa nada");
  });

  it("control: la pregunta completa con la palabra aprendida se sirve como siempre", () => {
    const r = answer(ask(luzBook(), "¿Cuánto gasté en la luz?"));
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes(moneyEs(42000)), r.verdict);
  });
});
