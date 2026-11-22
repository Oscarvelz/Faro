/**
 * MODOS · OLA 26 — la cerca de la cura de la Ola 26 (Equipo Amigo).
 * Once familias; la octava (la cáscara M26) vive en modos-ola14 §B,
 * como la séptima de la ola 25. Cada espécimen corre ROJO sobre la
 * prístina de la base (1.3.379, con ask2.ts re-basado al §20 en curso)
 * y VERDE aquí:
 *
 *  (1) G26-1 — convertir también compone: patchLineWith compone
 *      migrateAutopayConfig en su ruta del mismo mes; el censo de
 *      recetas clasifica RECETAS (patchLine, patchLineWith,
 *      deleteLine), no archivos — el punto ciego de la cura 25.
 *  (2) G26-2 — la puerta juzga las fechas del deseo como ISO, la
 *      forma que sus lectores cortan y comparan.
 *  (3) G26-3 — cardOk juzga los opcionales que la cara desreferencia
 *      (points, figure, before, figureLabel, mark).
 *  (4) E26-1 — words.ts, el tercer diccionario: su frase del nombre
 *      dice la misma doctrina que i18n (los temas quedaron clavados
 *      en la cerca de la ola 25, §6).
 *  (5) El mapa, tercera vez — projection, prices, price-watch,
 *      logbook y la fila a la mano; precedencias de patrón; la guarda
 *      de objeto del compartir; la fórmula solo donde hay cifras.
 *  (6) La descripción — las líneas de profundidad Completo nombran
 *      su piso y reach entra en el inventario del banco.
 *  (7) Q26-C1 — las dos salidas convertidas de la tarjeta re-juzgan
 *      la existencia almacenada al escribir, sin compuerta de
 *      revisión (la conducta vive en el banco CDP de Cambios; aquí
 *      se clava la forma que la carrera de J2.1 falsó).
 *  (9) La Bitácora conserva lo que no reconoce (fallo de Oscar,
 *      2026-11-21 23:41 EST): settleLogbook y markEditionSeen parten
 *      del libro crudo y arrastran lo no reconocido, intacto.
 *  (10) El área del mapa, en los dos idiomas (fallo de Oscar,
 *      2026-11-21 23:42 EST): cada entrada declara {es, en} y el
 *      veredicto EN no nombra ningún área en español.
 *  (11) Cada pregunta predeterminada, con su número único (fallo de
 *      Oscar, 2026-11-21 23:43 EST): el nacimiento se juzga contra
 *      los ids vivos y el libro que llega duplicado se re-llavea en
 *      el lector, sin perder ninguna.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { BookMode } from "./advisor.ts";
import { FARO_FUNCTION_MAP, FUNCTION_TOPIC } from "./askmap.ts";
import { answerBankQuestion } from "./ask2.ts";
import { addAskPreset, askPresetsOf, capabilitiesText, removeAskPreset } from "./askpresets.ts";
import { seriesAutopayConfig, settleAutopay } from "./autopay.ts";
import { logbookOf, markEditionSeen, settleLogbook } from "./bitacora.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { translate } from "./i18n.ts";
import { QUESTION_BANK } from "./questionbank.ts";
import { deleteLine, patchLine } from "./reducer.ts";
import { findTopic } from "../manual/topics.ts";
import { w } from "../../spa/words.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind, LogCard, Wish } from "./types.ts";

const TODAY = "2026-11-21";
const NOW = new Date("2026-11-21T12:00:00.000Z");
void NOW;

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: "2026-11", currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function cuota(id: string, series: string, monthKey: string, due: string, cadence: Line["cadence"], extra: Partial<Line> = {}): Line {
  return line({
    id, kind: "subscription" as LineKind, concept: "Cuota", amountMinor: 1299,
    seriesId: series, monthKey, recurring: true, cadence,
    nextDue: due, bookedOn: due, ...extra,
  });
}

function book(months: Record<string, Line[]>): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  for (const [k, lines] of Object.entries(months)) ledger.months[k] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

const AUTO = { autopay: true, autopayAccountId: "acct-banco" } as Partial<Line>;

const srcOf = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
function bodyOf(src: string, marker: string): string {
  const at = src.indexOf(marker);
  assert.ok(at >= 0, `marcador presente: ${marker}`);
  const rest = src.slice(at);
  const end = rest.indexOf("\nexport ", 1);
  return end > 0 ? rest.slice(0, end) : rest;
}

/* ════════════ §1 · Familia 1 (G26-1) — convertir también compone ════════════ */

describe("ola26 · (1) la conversión compone la migración, y el censo clasifica recetas", () => {
  it("el censo de recetas: patchLineWith y deleteLine componen; patchLine delega en la que compone", () => {
    const red = srcOf("./reducer.ts");
    assert.match(bodyOf(red, "export function patchLineWith"), /migrateAutopayConfig/,
      "patchLineWith compone la migración en su propio cuerpo (la ruta del mismo mes incluida)");
    assert.match(bodyOf(red, "export function deleteLine"), /migrateAutopayConfig/,
      "deleteLine sigue componiendo (control de las olas 24/25)");
    assert.match(bodyOf(red, "export function patchLine("), /patchLineWith/,
      "patchLine no tiene ruta propia: delega en patchLineWith, que compone");
  });

  const armedBook = () => book({
    "2026-10": [cuota("oct", "serie-rk", "2026-10", "2026-10-15", "monthly", { ...AUTO })],
    "2026-11": [cuota("nov", "serie-rk", "2026-11", "2026-11-15", "monthly")],
  });

  it("CURADO: la conversión (rekind) migra la instrucción y la serie sigue asentando con su cuenta", () => {
    const after = patchLine(armedBook(), "oct", { kind: "expense-fixed" });
    const nov = after.months["2026-11"]!.lines[0]!;
    assert.equal(nov.autopay, true, "la conversión compone: noviembre hereda la instrucción");
    assert.equal(nov.autopayAccountId, "acct-banco");
    assert.deepEqual(seriesAutopayConfig([nov]), { on: true, accountId: "acct-banco" });
    const r = settleAutopay(after, "2026-12-20");
    assert.deepEqual(r.settled.map((x) => x.seriesId), ["serie-rk"], "la serie asienta tras la conversión");
    assert.equal(r.state.months["2026-12"]!.lines[0]!.autopayAccountId, "acct-banco", "y asienta con su cuenta");
  });

  it("CURADO: convertida y luego borrada, la portadora no se lleva la instrucción — diciembre asienta", () => {
    const away = patchLine(armedBook(), "oct", { kind: "expense-fixed" });
    const gone = deleteLine(away, "2026-10", "oct");
    const r = settleAutopay(gone, "2026-12-20");
    assert.deepEqual(r.settled.map((x) => x.seriesId), ["serie-rk"],
      "la instrucción ya vivía en la instancia que queda: la serie no muere con la portadora convertida");
  });
});

/* ════════════ §2 · Familia 2 (G26-2) — las fechas del deseo, ISO ════════════ */

function wishOk(partial: Partial<Wish> & Pick<Wish, "id">): Wish {
  return {
    concept: "Zapatos", amountMinor: 12000, currency: "USD", store: "Tienda",
    createdAt: "2026-11-01T12:00:00.000Z", waitHours: 48,
    dueAt: "2026-11-03T12:00:00.000Z", askedAt: "", renewals: 0,
    permanent: false, status: "waiting", closedAt: "",
    ...partial,
  };
}

function bookWishes(wishes: unknown): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  (ledger as unknown as Record<string, unknown>).wishes = wishes;
  return ledger;
}

describe("ola26 · (2) la puerta juzga las fechas del deseo como fechas ISO", () => {
  it("CURADO: «Nov 21, 2026» ya no entra en ningún campo de fecha del deseo", () => {
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w1", status: "bought", closedAt: "Nov 21, 2026" })])), false,
      "closedAt parseable pero no ISO: la cuenta del año lo perdería en silencio — la puerta lo detiene");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w2", dueAt: "Nov 21, 2026" })])), false, "dueAt en la misma grafía");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w3", createdAt: "21/11/2026" })])), false, "createdAt en otra grafía no ISO");
  });

  it("las formas buenas en todos los estados siguen entrando enteras (control)", () => {
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-espera" })])), true, "esperando, con closedAt vacío");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-comprado", status: "bought", closedAt: "2026-11-20T09:30:00.000Z" })])), true, "comprado, con su cierre ISO");
    assert.equal(isLedgerDeep(bookWishes([wishOk({ id: "w-dejado", status: "left", closedAt: "2026-11-20" })])), true, "dejado, con su cierre ISO de solo fecha");
  });
});

/* ════════════ §3 · Familia 3 (G26-3) — la puerta juzga los opcionales ════════════ */

const cardBuena: LogCard = {
  kind: "trend",
  title: { es: "El año", en: "The year" },
  context: { es: "Contexto", en: "Context" },
  explain: { what: { es: "Qué", en: "What" }, how: { es: "Cómo", en: "How" }, so: { es: "Y qué", en: "So what" } },
  figure: { minor: 12500, currency: "USD" },
  figureLabel: { es: "El mayor", en: "The biggest" },
  points: [10, 20, 30],
  mark: 1,
};

function bookLogbook(editions: unknown, months: unknown = {}): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = {};
  (ledger as unknown as Record<string, unknown>).logbook = { months, editions };
  return ledger;
}

const edicionCon = (card: unknown) => ({
  "2026": {
    year: 2026, countedOn: "2026-11-01", partial: false, since: "2026-01",
    currency: "USD", cards: [card], seenAt: "",
  },
});

describe("ola26 · (3) cardOk juzga los opcionales que la cara desreferencia", () => {
  it("CURADO: la tarjeta con un opcional malformado no entra — la edición no llega a la cara", () => {
    const malas: [string, unknown][] = [
      ["points como número", { ...cardBuena, points: 42 }],
      ["points con un NaN", { ...cardBuena, points: [1, Number.NaN, 3] }],
      ["points con texto", { ...cardBuena, points: [1, "2", 3] }],
      ["figure como número", { ...cardBuena, figure: 42 }],
      ["figure con minor de texto", { ...cardBuena, figure: { minor: "125", currency: "USD" } }],
      ["figure con moneda fuera de la unión", { ...cardBuena, figure: { minor: 125, currency: "EUR" } }],
      ["before malformado", { ...cardBuena, before: 7 }],
      ["figureLabel como cadena", { ...cardBuena, figureLabel: "El mayor" }],
      ["mark como cadena", { ...cardBuena, mark: "1" }],
    ];
    for (const [nombre, card] of malas) {
      assert.deepEqual(logbookOf(bookLogbook(edicionCon(card))).editions, {}, `${nombre}: la edición queda fuera del lector`);
    }
  });

  it("la tarjeta bien formada, con todos sus opcionales, entra entera (control)", () => {
    const out = logbookOf(bookLogbook(edicionCon(cardBuena)));
    assert.equal(out.editions["2026"]!.cards.length, 1);
    assert.deepEqual(out.editions["2026"]!.cards[0]!.points, [10, 20, 30]);
    const sinOpcionales: LogCard = { kind: "cover", title: cardBuena.title, context: cardBuena.context, explain: cardBuena.explain };
    assert.equal(logbookOf(bookLogbook(edicionCon(sinOpcionales))).editions["2026"]!.cards.length, 1,
      "y la tarjeta sin opcionales sigue entrando como siempre");
  });
});

/* ════════════ §4 · Familia 4 (E26-1) — words.ts, el tercer diccionario ════════════ */

describe("ola26 · (4) la frase del nombre dice la misma doctrina en los tres diccionarios", () => {
  it("words.ts (ES y EN) coincide con i18n, palabra por palabra", () => {
    assert.equal(w("name.note", "es"), translate("es", "name.note"));
    assert.equal(w("name.note", "en"), translate("en", "name.note"));
    assert.equal(w("name.note", "es"), "Aparece solo cuando el Asesor te habla de frente y en la pregunta de la lista de espera.");
    assert.equal(w("name.note", "en"), "It appears only when the Advisor speaks to you directly, and in the waiting list's question.");
  });

  it("ninguna de las dos promete Bitácora ni firma en presente", () => {
    for (const lang of ["es", "en"] as const) {
      const frase = w("name.note", lang);
      assert.ok(!/bitácora|bitacora|logbook|firma|signature|year in faro/i.test(frase), `${lang}: solo los dos umbrales vivos`);
    }
  });
});

/* ════════ §5 · Familias 5 y 10 — el mapa, tercera vez; el área bilingüe ════════ */

const KEY = "2026-11";
function fixture(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months = { [KEY]: { lines: [] } };
  ledger.settings.display = "USD";
  return ledger;
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es", mode: BookMode = "esencial") {
  const ctx: ParseCtx = { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx, TODAY, undefined, mode);
}

describe("ola26 · (5) el mapa aprende la proyección, los precios, la Bitácora y la fila a la mano", () => {
  it("las cinco entradas existen, con su tema, y el tema existe con su puerta", () => {
    for (const [id, tema] of [
      ["advisor.projection", "saldo-proyectado"],
      ["study.prices", "cambios-precio"],
      ["advisor.price-watch", "cambios-precio"],
      ["folios.logbook", "bitacora"],
      ["settings.ask-presets", "preguntas-a-la-mano"],
    ] as const) {
      const fn = FARO_FUNCTION_MAP.find((f) => f.id === id);
      assert.ok(fn, `${id} está en FARO_FUNCTION_MAP`);
      assert.equal(FUNCTION_TOPIC[id], tema, `${id} → tema ${tema}`);
      const t = findTopic(tema);
      assert.ok(t && t.go, `el tema ${tema} existe y tiene puerta (go)`);
    }
  });

  it("«¿Dónde veo mi saldo proyectado?» llega a la proyección — en Esencial nombra Completo, sin cifras", () => {
    const r = ask(fixture(), "¿Dónde veo mi saldo proyectado?", "es", "esencial");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "faro-mismo");
    assert.deepEqual(r.source, ["advisor.projection"], "la precedencia de patrón gana a central.tengo");
    assert.match(r.verdict, /Completo/, "bajo su piso, el veredicto nombra el piso (LA FRONTERA)");
    assert.ok(!r.verdict.includes("mismas cifras"), "y no promete las cifras de la caminata");
    const rc = ask(fixture(), "¿Dónde veo mi saldo proyectado?", "es", "completo");
    assert.equal(rc.kind, "answer");
    if (rc.kind !== "answer") return;
    assert.deepEqual(rc.source, ["advisor.projection"], "en Completo, la misma puerta");
    assert.ok(rc.verdict.includes("mismas cifras"), "en su piso, la fórmula sí: su casa guarda las cifras de la caminata");
  });

  it("«¿Dónde veo los cambios de precio?» llega a Estudio — no a la mesa de cambio", () => {
    const r = ask(fixture(), "¿Dónde veo los cambios de precio?", "es", "esencial");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.deepEqual(r.source, ["study.prices"], "«cambios de precio» gana a la mesa: no es conversión");
    assert.match(r.verdict, /Completo/);
    const rv = ask(fixture(), "¿Dónde veo el aviso de precio?", "es", "esencial");
    assert.equal(rv.kind, "answer");
    if (rv.kind !== "answer") return;
    assert.deepEqual(rv.source, ["advisor.price-watch"], "el aviso tiene su propia puerta: el Vigilante");
  });

  it("la Bitácora y la fila a la mano responden en su piso, y la fila no promete cifras", () => {
    const rb = ask(fixture(), "¿Dónde veo mi Bitácora?", "es", "esencial");
    assert.equal(rb.kind, "answer");
    if (rb.kind !== "answer") return;
    assert.deepEqual(rb.source, ["folios.logbook"], "la Bitácora vive en Esencial y el mapa la conoce");
    const rp = ask(fixture(), "¿Cómo guardo una pregunta?", "es", "esencial");
    assert.equal(rp.kind, "answer");
    if (rp.kind !== "answer") return;
    assert.deepEqual(rp.source, ["settings.ask-presets"], "la fila de la propia caja se explica");
    assert.match(rp.verdict, /Ritmo/, "administrarla nombra su piso");
    assert.ok(!rp.verdict.includes("cifras"), "sin la fórmula ni su sombra: su casa no guarda cifras");
    const rr = ask(fixture(), "¿Cómo guardo una pregunta?", "es", "ritmo");
    assert.equal(rr.kind, "answer");
    if (rr.kind !== "answer") return;
    assert.ok(!rr.verdict.includes("mismas cifras"), "en su piso, tampoco: no hay cifras que ver");
  });

  it("la fórmula solo donde hay cifras: el nombre y el recibir comparten sin prometerlas", () => {
    const rn = ask(fixture(), "¿Cómo cambio mi nombre?", "es", "esencial");
    assert.equal(rn.kind, "answer");
    if (rn.kind !== "answer") return;
    assert.deepEqual(rn.source, ["account.name"]);
    assert.ok(!rn.verdict.includes("mismas cifras"), "el nombre no guarda cifras: su veredicto no las promete");
    const rl = ask(fixture(), "¿Dónde veo lo que me compartieron?", "es", "esencial");
    assert.equal(rl.kind, "answer");
    if (rl.kind !== "answer") return;
    assert.deepEqual(rl.source, ["inbox.link"], "la ruta de recibir sigue llegando a su puerta (control)");
    assert.ok(!rl.verdict.includes("mismas cifras"), "el compartir tampoco guarda cifras");
  });

  it("la guarda de objeto: compartir EL LIBRO no cae en la puerta contraria", () => {
    for (const [raw, lang] of [["¿Cómo comparto mi libro?", "es"], ["How do I share my book?", "en"]] as const) {
      const r = ask(fixture(), raw, lang, "esencial");
      assert.equal(r.kind, "unknown", `«${raw}»: silencio honesto, no el compartir hacia dentro`);
    }
  });
});

describe("ola26 · (10) el área del mapa, en los dos idiomas — cada idioma preserva su autoría", () => {
  it("toda entrada declara el nombre de su zona en los dos idiomas", () => {
    for (const f of FARO_FUNCTION_MAP) {
      assert.ok(typeof f.area?.es === "string" && f.area.es.length > 0, `${f.id}: área en español`);
      assert.ok(typeof f.area?.en === "string" && f.area.en.length > 0, `${f.id}: área en inglés`);
    }
  });

  it("el veredicto EN nombra las zonas por su cara inglesa — ningún área en español", () => {
    const casos: [string, string, string][] = [
      ["How do I change my name?", "Account", "Cuenta"],
      ["How do I share a link with Faro?", "Capture", "Captura"],
      ["How do I exchange dollars?", "Exchange desk", "Mesa de cambio"],
      ["Where do I see my projected balance?", "Advisor", "Asesor"],
    ];
    for (const [raw, caraEn, caraEs] of casos) {
      const r = ask(fixture(), raw, "en", "completo");
      assert.equal(r.kind, "answer", `«${raw}» responde`);
      if (r.kind !== "answer") return;
      assert.ok(r.verdict.includes(caraEn), `«${raw}» nombra ${caraEn}: ${r.verdict}`);
      assert.ok(!r.verdict.includes(caraEs), `«${raw}» no nombra ${caraEs} en un libro EN`);
    }
    const rEs = ask(fixture(), "¿Cómo cambio mi nombre?", "es", "esencial");
    assert.equal(rEs.kind, "answer");
    if (rEs.kind !== "answer") return;
    assert.ok(rEs.verdict.includes("Cuenta"), "y el veredicto ES sigue nombrando su área en español (control)");
  });
});

/* ════════════ §6 · Familia 6 — la descripción cuenta reach y nombra pisos ════════════ */

describe("ola26 · (6) la descripción: reach entra en el inventario; la profundidad nombra su piso", () => {
  it("el banco lleva la familia reach, viva, y faro-mismo la cita entre sus fuentes", () => {
    const reach = QUESTION_BANK.find((f) => f.id === "reach");
    assert.ok(reach, "reach está en el banco");
    assert.equal(reach.status, "viva");
    const fm = QUESTION_BANK.find((f) => f.id === "faro-mismo");
    for (const id of ["advisor.projection", "study.prices", "advisor.price-watch", "folios.logbook", "settings.ask-presets"]) {
      assert.ok(fm!.source.includes(id), `faro-mismo cita ${id}`);
    }
  });

  it("la descripción generada cuenta el alcance día a día, en los dos idiomas", () => {
    const es = capabilitiesText("es").groups.flatMap((g) => g.items);
    assert.ok(es.some((i) => i.includes("saldo proyectado") && i.includes("día más apretado")),
      "la línea de reach aparece en la descripción ES");
    const en = capabilitiesText("en").groups.flatMap((g) => g.items);
    assert.ok(en.some((i) => i.includes("projected balance") && i.includes("tightest day")),
      "y en la EN");
  });

  it("ninguna línea de profundidad Completo promete en presente sin nombrar su piso", () => {
    const es = capabilitiesText("es").groups.flatMap((g) => g.items);
    const remesas = es.find((i) => i.includes("patrón de remesas"));
    assert.ok(remesas && remesas.includes("en Completo"), "el patrón de remesas nombra Completo en su línea");
    const futuro = es.find((i) => i.includes("supuesto dicho en voz alta"));
    assert.ok(futuro && futuro.includes("en Completo"), "las proyecciones nombran Completo en su línea");
    const en = capabilitiesText("en").groups.flatMap((g) => g.items);
    const remit = en.find((i) => i.includes("remittance pattern"));
    assert.ok(remit && remit.includes("in Complete"), "y en inglés, cada idioma con su autoría");
  });
});

/* ════════════ §7 · Familia 7 (Q26-C1) — re-juzgar la existencia al escribir ════════════ */

describe("ola26 · (7) las salidas convertidas re-juzgan el paquete almacenado sin compuerta de revisión", () => {
  it("las dos recetas (commitDraft y commitUpdate) juzgan stored.ex siempre que el paquete exista", () => {
    const src = srcOf("../../components/faro/cards.tsx");
    const seg = src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));
    const guardas = seg.match(/stored && stored\.ex !== "alive"/g) ?? [];
    assert.ok(guardas.length >= 2, `las dos salidas convertidas llevan el re-juicio sin compuerta (halladas: ${guardas.length})`);
    assert.ok(!/stored\.revision > s\.revision/.test(seg),
      "la compuerta de revisión — la rendija por la que la adopción de J2.1 aterrizó a mitad del commit — ya no existe en la forma");
  });
});

/* ════════════ §8 · Familia 9 — la Bitácora conserva lo que no reconoce ════════════ */

describe("ola26 · (9) lo no reconocido se conserva: nada se evapora al reescribir el logbook", () => {
  const fotoValida = {
    month: "2025-09", countedOn: "2025-10-01", currency: "USD",
    income: 100, expense: 40, net: 60, savedFlow: 0, topName: null, topMinor: 0,
  };
  const edicionValida = {
    year: 2026, countedOn: "2026-11-01", partial: false, since: "2026-01",
    currency: "USD", cards: [cardBuena], seenAt: "",
  };

  it("CURADO: settleLogbook asienta lo nuevo y la entrada no reconocida sigue ahí, byte a byte", () => {
    const ledger = book({ "2026-10": [line({ id: "g1", kind: "expense-fixed", concept: "Mercado", amountMinor: 500 })] });
    (ledger as unknown as Record<string, unknown>).logbook = {
      months: { "2025-09": fotoValida, "2025-10": { foto: "dañada", campos: [1, 2] } },
      editions: { "2024": { edicion: "sin reconocer", rota: true } },
    };
    const r = settleLogbook(ledger, TODAY);
    assert.equal(r.changed, true, "el asentamiento obra: fotografía octubre de 2026");
    const out = r.state.logbook as unknown as { months: Record<string, unknown>; editions: Record<string, unknown> };
    assert.ok(out.months["2026-10"], "la foto nueva existe");
    assert.deepEqual(out.months["2025-10"], { foto: "dañada", campos: [1, 2] },
      "la foto no reconocida de 2025-10 NO se evaporó al asentarse la de 2026-10 (OBS-26-G1, medida por el Guardián)");
    assert.deepEqual(out.editions["2024"], { edicion: "sin reconocer", rota: true },
      "la edición no reconocida también sigue en el libro");
    assert.deepEqual(out.months["2025-09"], fotoValida, "y la foto reconocida sigue intacta");
  });

  it("CURADO: markEditionSeen marca la vista y conserva lo no reconocido", () => {
    const ledger = book({});
    (ledger as unknown as Record<string, unknown>).logbook = {
      months: { "2025-10": { foto: "dañada" } },
      editions: { "2026": edicionValida, "2024": { edicion: "sin reconocer" } },
    };
    const out = markEditionSeen(ledger, 2026, TODAY).logbook as unknown as { months: Record<string, unknown>; editions: Record<string, { seenAt?: string }> };
    assert.equal(out.editions["2026"]!.seenAt, TODAY, "la edición quedó marcada vista");
    assert.deepEqual(out.editions["2024"], { edicion: "sin reconocer" }, "la no reconocida se conserva al marcar");
    assert.deepEqual(out.months["2025-10"], { foto: "dañada" }, "y la foto no reconocida también");
  });

  it("la declaración de diseño muerta quedó reescrita con el fallo en defaults.ts", () => {
    const src = srcOf("./defaults.ts");
    assert.match(src, /Eso va en contra de nuestras reglas/, "el comentario cita el fallo de Oscar y su razón");
    assert.match(src, /Familia 9/, "y nombra la familia que lo cura");
  });
});

/* ════════════ §9 · Familia 11 — cada pregunta, con su número único ════════════ */

describe("ola26 · (11) el nacimiento nunca repite un id vivo; el libro duplicado se re-llavea", () => {
  const bookPresets = (presets: unknown): LedgerState => {
    const ledger = createInitial("es", "oscuro");
    ledger.months = {};
    (ledger as unknown as Record<string, unknown>).askPresets = presets;
    return ledger;
  };

  it("CURADO: un libro que llega con el id duplicado se re-llavea sin perder ninguna, ni texto ni orden", () => {
    const s = bookPresets([
      { id: "a", text: "¿Uno?" },
      { id: "a", text: "¿Dos?" },
      { id: "a~2", text: "¿Tres?" },
      { id: "a", text: "¿Cuatro?" },
    ]);
    const out = askPresetsOf(s);
    assert.equal(out.length, 4, "ninguna se pierde");
    assert.deepEqual(out.map((p) => p.text), ["¿Uno?", "¿Dos?", "¿Tres?", "¿Cuatro?"], "el texto y el orden intactos");
    assert.equal(new Set(out.map((p) => p.id)).size, 4, "cada una con su id propio");
    assert.equal(out[0]!.id, "a", "la primera conserva el suyo");
    assert.deepEqual(askPresetsOf(s), out, "el re-llaveo es determinista: la misma lectura en cada lectura");
    const persisted = { ...s, askPresets: out };
    const trasQuitar = removeAskPreset(persisted, out[1]!.id);
    assert.deepEqual(askPresetsOf(trasQuitar).map((p) => p.text), ["¿Uno?", "¿Tres?", "¿Cuatro?"],
      "quitar una quita exactamente esa");
  });

  it("CURADO: el nacimiento se juzga contra los ids vivos — ni con el azar en contra", () => {
    const FIJO = "123e4567-e89b-12d3-a456-426614174000";
    const s = bookPresets([{ id: FIJO, text: "¿La semilla?" }]);
    const real = crypto.randomUUID.bind(crypto);
    (crypto as unknown as { randomUUID: () => string }).randomUUID = () => FIJO;
    try {
      const after = addAskPreset(s, "¿La nueva?");
      const out = askPresetsOf(after);
      assert.equal(out.length, 2);
      assert.equal(new Set(out.map((p) => p.id)).size, 2,
        "la nueva no nace gemela de la semilla aunque uid() devuelva su id");
      assert.equal(out[0]!.id, FIJO, "la semilla conserva el suyo");
    } finally {
      (crypto as unknown as { randomUUID: () => string }).randomUUID = real;
    }
  });
});
