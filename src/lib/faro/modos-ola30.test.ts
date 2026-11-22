/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 30 — LA CURA (equipo amigo). Siete familias:
 *
 *  F1 · LA LEY DE LA CAMINATA SE INVIERTE (Q30-3 + Q30-1): la negativa
 *       solo nace si la caminata consumió TODO el camino entre el
 *       verbo y la candidata como vocabulario de función (apertores,
 *       relleno, tratamientos y parentescos en posición de título,
 *       frases hechas como clases) y la candidata es el resto final
 *       (1–2 piezas). Si queda una palabra común sin consumir, la
 *       puntería es ambigua: silencio honesto sin nombre y sin
 *       cifras. Y el escaneo casa el nombre exacto de 2 letras en
 *       posición de persona («Al» en el libro resuelve; el apertor
 *       «al» cede ante el acierto).
 *  F2 · NACE LA FAMILIA DEL PERÍODO (Q30-2): remesas-periodo suma las
 *       remesas del período nombrado, ES/EN, en los tres modos; con
 *       persona, manda la persona con su período; historia conserva
 *       su puerta («gasté en remesas»); el patrón sirve sin período.
 *  F3 · FUSEBOOKS HEREDA LA LEY DEL ESCRITOR (G30-1): la fusión solo
 *       acuña lápidas que pasan tombstoneShapeOk; con el instante del
 *       lado que borró injuzgable, el borrado se queda y no se acuña
 *       — la salida de fuseBooks pasa siempre isLedgerDeep.
 *  F4 · EL EMPALME DEL SERVIDOR: su conducta se corre en PGlite desde
 *       bench-cura30 (el SQL no corre en la suite de node); aquí no
 *       se clava por texto lo que el banco prueba corriendo.
 *  F5 · LA PIEZA C8 JUZGA EL CONTENIDO (G30-3): un solo juez del
 *       registro pasivo (passiveRecordShapeOk) en la puerta, el
 *       lector y el escritor, juzgando lo que la cara desreferencia.
 *  F6 · LIBRO393 JUZGA EL JUICIO (G30-F1): la enmienda vive en
 *       libro393.test.ts (conducta contra isLedgerDeep).
 *  F7 · EL BANNER DICE LA VERDAD (Q30-C1): la fórmula del desenlace
 *       vive en packguard (tabConflictOutcome) y se clava aquí como
 *       conducta; el cableado del provider se clava como cableado.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-30-A1, OBS-29-A1,
 * OBS-29-C1-Cara/Cambios, OBS-28-G1/C1, OBS-27-G1, F27-3, H27-1,
 * OBS-C8-1, la coexistencia DECLARADA, A23-4 (CERRADO), el tip de
 * modos, la construcción .400+ del banco.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { answerBankQuestion, type BankResult } from "./ask2";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults";
import { makePassiveRecord, passiveMonths, passiveRecordsOf, withPassiveRecord } from "./exit";
import { fuseBooks, type FuseSide } from "./fuse";
import { tabConflictOutcome } from "./packguard";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind, PassiveRecord } from "./types";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";
type Mode3 = "esencial" | "ritmo" | "completo";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  } as Line;
}
const ctx = (ledger: LedgerState, lang: "es" | "en"): ParseCtx =>
  ({ ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` });
const ask = (ledger: LedgerState, lang: "es" | "en", raw: string, mode: Mode3 = "completo"): BankResult =>
  answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY, undefined, mode, []);

function remitLine(id: string, monthKey: string, amountMinor: number, to: string, day: string): Line {
  return line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });
}
/* El libro de Primo (el de la caza): una persona, una remesa de $50
 * el 20-10. Rosa y Pérez NO están en el libro. */
function libroPrimo(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [{ id: "primo", name: "Primo" }];
  ledger.months[KEY] = { lines: [remitLine("r-primo", KEY, 5000, "primo", "20")] };
  ledger.settings.display = "USD";
  return ledger;
}
function libroPrimoEn(): LedgerState {
  const ledger = createInitial("en", "oscuro");
  ledger.remitPeople = [{ id: "primo", name: "Primo" }];
  ledger.months[KEY] = { lines: [remitLine("r-primo", KEY, 5000, "primo", "20")] };
  ledger.settings.display = "USD";
  return ledger;
}

/* ═══ F1 · LA CAMINATA INVERTIDA ═══════════════════════════════════ */
describe("ola30 · F1 la caminata se invierte (Q30-3 + Q30-1)", () => {
  it("Q30-3 · las frases hechas se consumen como clase: la negativa nombra a la persona, no a la frase", () => {
    const casos: [string, string][] = [
      ["¿Cuándo fue la última remesa a través de Rosa?", "«rosa»"],
      ["¿Cuándo fue la última remesa por medio de Rosa?", "«rosa»"],
      ["¿Cuánto le mandé a favor de Rosa?", "«rosa»"],
      ["¿Cuánto le mandé a nombre de Rosa?", "«rosa»"],
      ["¿Cuándo fue la última remesa al padre Pérez?", "«perez»"],
      ["¿Cuánto le mandé a mi hermano Rosa?", "«rosa»"],
      ["¿Cuándo fue la última remesa a la hermana Rosa?", "«rosa»"],
    ];
    for (const [q, nombre] of casos) {
      const r = ask(libroPrimo(), "es", q);
      assert.ok(r.kind === "answer" && r.verdict.includes(`No sé quién es ${nombre}`),
        `«${q}» nombra ${nombre}: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
    }
    const en: [string, string][] = [
      ["When was the last remittance through Rosa?", "\"rosa\""],
      ["When was the last remittance via Rosa?", "\"rosa\""],
      ["When was the last remittance to Sister Rosa?", "\"rosa\""],
      ["How much did I send on behalf of Rosa?", "\"rosa\""],
    ];
    for (const [q, nombre] of en) {
      const r = ask(libroPrimoEn(), "en", q);
      assert.ok(r.kind === "answer" && r.verdict.includes(`don't know who ${nombre}`),
        `«${q}» names ${nombre}: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
    }
  });

  it("Q30-3 · el cebo de la próxima ola, medido hoy: «pastor» viaja con el nombre y «brother» se camina", () => {
    const a = ask(libroPrimo(), "es", "¿Cuánto le mandé al pastor Rosa?");
    assert.ok(a.kind === "answer" && /No sé quién es «pastor rosa»/.test(a.verdict),
      `el resto final de dos piezas se nombra entero (la persona va dentro, sin cifras): ${a.kind === "answer" ? a.verdict.slice(0, 70) : a.kind}`);
    const b = ask(libroPrimoEn(), "en", "How much did I send to my brother Rosa?");
    assert.ok(b.kind === "answer" && /don't know who "rosa"/.test(b.verdict),
      `el parentesco en posición de título se consume en inglés también: ${b.kind === "answer" ? b.verdict.slice(0, 70) : b.kind}`);
  });

  it("Q30-3 · si el camino no se consume entero, NO nace negativa: silencio honesto sin nombre y sin cifras", () => {
    const r = ask(libroPrimo(), "es", "¿Cuánto le mandé a Rosa de Lima?");
    assert.ok(r.kind === "answer" && r.family === "remesas" && /No sé a quién te refieres/.test(r.verdict) && !/No sé quién es/.test(r.verdict) && r.pieces.length === 0,
      `«Rosa de Lima» no acusa a «rosa» ni entrega la cifra de Primo: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
    const rec = ask(libroPrimo(), "es", "¿Cuándo fue la última remesa a Rosa de Lima?");
    assert.ok(rec.kind === "answer" && rec.family === "recencia" && /No sé a quién te refieres/.test(rec.verdict) && rec.pieces.length === 0,
      `la recencia tampoco degrada a la global: ${rec.kind === "answer" ? rec.verdict.slice(0, 70) : rec.kind}`);
  });

  it("Q30-1 · el nombre de dos letras en el libro resuelve: el libro arbitra y el apertor cede", () => {
    const libro = createInitial("es", "oscuro");
    libro.remitPeople = [{ id: "al", name: "Al" }, { id: "ed", name: "Ed" }, { id: "primo", name: "Primo" }];
    libro.months[KEY] = { lines: [remitLine("r-al", KEY, 9000, "al", "06"), remitLine("r-ed", KEY, 7000, "ed", "09"), remitLine("r-primo", KEY, 5000, "primo", "20")] };
    libro.settings.display = "USD";
    const rec = ask(libro, "es", "¿Cuándo fue la última remesa a Al?");
    assert.ok(rec.kind === "answer" && rec.family === "recencia" && rec.pieces[0]?.minor === 9000,
      `la última de Al es la suya ($90), no la de Primo: ${rec.kind === "answer" ? rec.verdict.slice(0, 70) : rec.kind}`);
    const suma = ask(libro, "es", "¿Cuánto le mandé a Al?");
    assert.ok(suma.kind === "answer" && suma.pieces[0]?.minor === 9000, `la suma de Al es la suya: ${suma.kind}`);
    const ed = ask(libro, "es", "¿Cuánto le mandé a Ed?");
    assert.ok(ed.kind === "answer" && ed.pieces[0]?.minor === 7000, `Ed resuelve igual: ${ed.kind}`);
    const en = createInitial("en", "oscuro");
    en.remitPeople = libro.remitPeople;
    en.months[KEY] = libro.months[KEY];
    en.settings.display = "USD";
    const bare = ask(en, "en", "How much did I send Al?");
    assert.ok(bare.kind === "answer" && bare.pieces[0]?.minor === 9000, `el dativo inglés desnudo también lo resuelve: ${bare.kind}`);
  });

  it("Q30-1 · la guarda: «al banco» no resuelve a Al — ahí «al» trabaja de apertor", () => {
    const libro = createInitial("es", "oscuro");
    libro.remitPeople = [{ id: "al", name: "Al" }, { id: "primo", name: "Primo" }];
    libro.months[KEY] = { lines: [remitLine("r-al", KEY, 9000, "al", "06"), remitLine("r-primo", KEY, 5000, "primo", "20")] };
    libro.settings.display = "USD";
    const r = ask(libro, "es", "¿Cuánto le mandé al banco?");
    assert.ok(r.kind === "answer" && /No sé quién es «banco»/.test(r.verdict),
      `la candidata es «banco», no la suma de Al: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });

  it("control sostenido · «a la señora Pérez» sigue nombrando a Pérez y el parentesco final se nombra a sí mismo", () => {
    const a = ask(libroPrimo(), "es", "¿Cuándo fue la última remesa a la señora Pérez?");
    assert.ok(a.kind === "answer" && /No sé quién es «perez»/.test(a.verdict), "el relleno de las Olas 28–29 sigue caminado");
    const b = ask(libroPrimo(), "es", "¿Cuánto le mandé a mi padre?");
    assert.ok(b.kind === "answer" && /No sé quién es «padre»/.test(b.verdict),
      `«padre» como resto final ES la candidata (eco honesto): ${b.kind === "answer" ? b.verdict.slice(0, 60) : b.kind}`);
  });
});

/* ═══ F2 · LA FAMILIA DEL PERÍODO ══════════════════════════════════ */
function libroPeriodos(lang: "es" | "en" = "es"): LedgerState {
  const ledger = createInitial(lang, "oscuro");
  ledger.remitPeople = [{ id: "primo", name: "Primo" }, { id: "rosa", name: "Rosa" }];
  ledger.months[KEY] = { lines: [
    remitLine("r-w1", KEY, 10000, "primo", "20"),
    remitLine("r-w2", KEY, 15000, "primo", "21"),
    remitLine("r-m1", KEY, 8000, "primo", "05"),
  ] };
  ledger.months[PREV] = { lines: [remitLine("r-p1", PREV, 30000, "primo", "12")] };
  ledger.settings.display = "USD";
  return ledger;
}
describe("ola30 · F2 la familia del período (Q30-2)", () => {
  it("la suma del período, con su cifra viva y su nombre, ES/EN", () => {
    const semana = ask(libroPeriodos(), "es", "¿Cuánto mandé esta semana?");
    assert.ok(semana.kind === "answer" && semana.family === "remesas-periodo" && semana.pieces[0]?.minor === 25000,
      `esta semana = $250 (20 + 21): ${semana.kind}${semana.kind === "answer" ? "/" + semana.family : ""}`);
    const mes = ask(libroPeriodos(), "es", "¿Cuánto mandé este mes?");
    assert.ok(mes.kind === "answer" && mes.family === "remesas-periodo" && mes.pieces[0]?.minor === 33000, `este mes = $330: ${mes.kind}`);
    const pasado = ask(libroPeriodos(), "es", "¿Cuánto mandé el mes pasado?");
    assert.ok(pasado.kind === "answer" && pasado.family === "remesas-periodo" && pasado.pieces[0]?.minor === 30000, `el mes pasado = $300: ${pasado.kind}`);
    const enWeek = ask(libroPeriodos("en"), "en", "How much did I send this week?");
    assert.ok(enWeek.kind === "answer" && enWeek.family === "remesas-periodo" && enWeek.pieces[0]?.minor === 25000, `this week = $250: ${enWeek.kind}`);
    const enMonth = ask(libroPeriodos("en"), "en", "How much did I send last month?");
    assert.ok(enMonth.kind === "answer" && enMonth.family === "remesas-periodo" && enMonth.pieces[0]?.minor === 30000, `last month = $300: ${enMonth.kind}`);
  });

  it("en los tres modos: preguntar por los propios envíos es básico (A23-4)", () => {
    for (const mode of ["esencial", "ritmo", "completo"] as Mode3[]) {
      const r = ask(libroPeriodos(), "es", "¿Cuánto mandé esta semana?", mode);
      assert.ok(r.kind === "answer" && r.family === "remesas-periodo" && r.pieces[0]?.minor === 25000, `en ${mode} sirve igual: ${r.kind}`);
    }
  });

  it("con la palabra «remesas» el período manda: no el agregado de siempre disfrazado", () => {
    const r = ask(libroPeriodos(), "es", "¿Cuánto mandé en remesas esta semana?");
    assert.ok(r.kind === "answer" && r.family === "remesas-periodo" && r.pieces[0]?.minor === 25000 && !/en total/.test(r.verdict),
      `la semana con su cifra ($250), no el total ($630): ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });

  it("persona Y período: manda la persona con SU período, y su ausencia se dice acotada", () => {
    const r = ask(libroPeriodos(), "es", "¿Cuánto le mandé a Primo esta semana?");
    assert.ok(r.kind === "answer" && r.family === "remesas" && r.pieces[0]?.minor === 25000, `Primo en la semana = $250: ${r.kind}`);
    const p = ask(libroPeriodos(), "es", "¿Cuánto le mandé a Primo el mes pasado?");
    assert.ok(p.kind === "answer" && p.family === "remesas" && p.pieces[0]?.minor === 30000, `Primo el mes pasado = $300: ${p.kind}`);
    const none = ask(libroPeriodos(), "es", "¿Cuánto le mandé a Rosa esta semana?");
    assert.ok(none.kind === "answer" && /No hay envíos a Rosa anotados en esta semana/.test(none.verdict) && none.pieces.length === 0,
      `la ausencia de Rosa se dice con su período, no con su total: ${none.kind === "answer" ? none.verdict.slice(0, 70) : none.kind}`);
  });

  it("las puertas vecinas no se mueven: «gasté en remesas» es historia y sin período sirve el patrón", () => {
    const h = ask(libroPeriodos(), "es", "¿Cuánto gasté en remesas esta semana?");
    assert.ok(h.kind === "answer" && h.family === "historia", `historia conserva su puerta: ${h.kind}${h.kind === "answer" ? "/" + h.family : ""}`);
    const pat = ask(libroPeriodos(), "es", "¿Cuánto envío en remesas al mes?");
    assert.ok(pat.kind === "answer" && pat.family === "remesas", `el patrón sirve su canónica sin período: ${pat.kind}${pat.kind === "answer" ? "/" + pat.family : ""}`);
  });
});

/* ═══ F3 · LA FUSIÓN HEREDA LA LEY DEL ESCRITOR ════════════════════ */
describe("ola30 · F3 fuseBooks acuña con la ley del escritor (G30-1)", () => {
  const baseBook = (): LedgerState => {
    const b = createInitial("es", "oscuro");
    b.months[KEY] = { lines: [line({ id: "l-casa", kind: "expense-variable" as LineKind, concept: "Casa", amountMinor: 10000 })] };
    return b;
  };
  const side = (state: LedgerState, over: Partial<FuseSide>): FuseSide =>
    ({ state, revision: 2, updatedAt: "2026-11-21T09:00:00.000Z", ...over });

  it("con el updatedAt del lado que borró injuzgable, el borrado se queda, no se acuña y la salida pasa su puerta", () => {
    for (const basura of ["basura", "", "2026-02-30"]) {
      const base = baseBook();
      const serverState = baseBook();
      serverState.months = {};
      const localState = baseBook();
      localState.months[KEY].lines[0] = { ...localState.months[KEY].lines[0], amountMinor: 12000 };
      const { state } = fuseBooks(base, side(serverState, { updatedAt: basura, by: "cuenta-duena" }), side(localState, {}));
      assert.equal((state.tombstones ?? []).some((t) => t.id === "l-casa"), false, `con updatedAt «${basura}» no nace lápida injuzgable`);
      assert.equal(Object.values(state.months).every((m) => m.lines.every((l) => l.id !== "l-casa")), true, "la línea borrada no resucita");
      assert.equal(isLedgerDeep(state), true, "la salida de la fusión pasa isLedgerDeep");
    }
  });

  it("control · con el instante válido la fusión acuña como siempre, firmada por el lado que borró", () => {
    const base = baseBook();
    const serverState = baseBook();
    serverState.months = {};
    const localState = baseBook();
    localState.months[KEY].lines[0] = { ...localState.months[KEY].lines[0], amountMinor: 12000 };
    const { state } = fuseBooks(base, side(serverState, { by: "cuenta-duena" }), side(localState, {}));
    const stone = (state.tombstones ?? []).find((t) => t.id === "l-casa");
    assert.ok(stone && stone.by === "cuenta-duena" && stone.at === "2026-11-21T09:00:00.000Z", "la lápida nace con su instante y su firmante");
    assert.equal(isLedgerDeep(state), true);
    // Y el espejo: el local borra con su instante basura.
    const base2 = baseBook();
    const serverState2 = baseBook();
    serverState2.months[KEY].lines[0] = { ...serverState2.months[KEY].lines[0], amountMinor: 12000 };
    const localState2 = baseBook();
    localState2.months = {};
    const out2 = fuseBooks(base2, side(serverState2, {}), side(localState2, { updatedAt: "zzzz", by: "cuenta-local" }));
    assert.equal((out2.state.tombstones ?? []).some((t) => t.id === "l-casa"), false, "el espejo tampoco acuña basura");
    assert.equal(isLedgerDeep(out2.state), true);
  });
});

/* ═══ F5 · LA C8 JUZGA EL CONTENIDO ════════════════════════════════ */
describe("ola30 · F5 el registro pasivo se juzga por su contenido (G30-3)", () => {
  const goodRecord = (): PassiveRecord => {
    const s = createInitial("es", "oscuro");
    s.months[KEY] = { lines: [line({ id: "l-1", kind: "expense-variable" as LineKind, concept: "Mercado", amountMinor: 4500, categoryId: s.structure.categories[0].id })] };
    return makePassiveRecord(s, "duena-1", "es", "2026-11-22T10:00:00.000Z", "rec-1");
  };
  const bookWith = (rec: unknown): LedgerState =>
    ({ ...createInitial("es", "oscuro"), passiveRecords: [rec] } as unknown as LedgerState);
  const malformed: [string, unknown][] = [
    ["las líneas del mes como texto", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: { "2026-11": { lines: "corrupt" } }, categories: [] }],
    ["una línea null dentro del mes", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: { "2026-11": { lines: [null] } }, categories: [] }],
    ["el amountMinor como texto", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: { "2026-11": { lines: [{ id: "l", kind: "expense", concept: "X", currency: "USD", amountMinor: "100" }] } }, categories: [] }],
    ["una categoría null", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: {}, categories: [null] }],
    ["una categoría sin nombre", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: {}, categories: [{ id: "c" }] }],
    ["el at que no es fecha", { id: "r", at: "basura", owner: "d", months: {}, categories: [] }],
    ["el at imposible (30 de febrero)", { id: "r", at: "2026-02-30T10:00:00.000Z", owner: "d", months: {}, categories: [] }],
    ["months como lista", { id: "r", at: "2026-11-22T10:00:00.000Z", owner: "d", months: [], categories: [] }],
  ];

  it("la puerta del libro rehúsa cada espécimen y admite el registro bien formado", () => {
    assert.equal(isLedgerDeep(bookWith(goodRecord())), true, "el registro bien formado pasa");
    for (const [nombre, rec] of malformed) {
      assert.equal(isLedgerDeep(bookWith(rec)), false, `la puerta rehúsa: ${nombre}`);
    }
  });

  it("el lector filtra con la misma ley: de los malformados no entra ninguno (ni el mes fantasma)", () => {
    for (const [nombre, rec] of malformed) {
      assert.deepEqual(passiveRecordsOf(bookWith(rec)), [], `el lector rehúsa: ${nombre}`);
    }
    const mixed = { ...createInitial("es", "oscuro"), passiveRecords: [malformed[0][1], goodRecord()] } as unknown as LedgerState;
    assert.deepEqual(passiveRecordsOf(mixed).map((r) => r.id), ["rec-1"], "solo el bien formado se lee");
  });

  it("el escritor rehúsa guardar lo que la puerta rehusaría, y guarda lo bueno", () => {
    const s = createInitial("es", "oscuro");
    for (const [nombre, rec] of malformed) {
      assert.equal(withPassiveRecord(s, rec as PassiveRecord), s, `el escritor no guarda: ${nombre}`);
    }
    const withGood = withPassiveRecord(s, goodRecord());
    assert.equal(passiveRecordsOf(withGood).length, 1, "el bueno sí se guarda");
    assert.deepEqual(passiveMonths(goodRecord()), [{ monthKey: KEY, total: 4500, count: 1 }], "el folio bueno se lee sin romperse");
  });
});

/* ═══ F7 · EL BANNER DICE LA VERDAD ════════════════════════════════ */
describe("ola30 · F7 el banner solo anuncia lo que aterrizó (Q30-C1)", () => {
  it("la fórmula del desenlace: sin aterrizaje no hay banner — hay aviso de copia dañada", () => {
    assert.equal(tabConflictOutcome(true, true), "banner", "apartado guardado + adopción aterrizada: el banner dice la verdad");
    assert.equal(tabConflictOutcome(false, true), "none", "sin apartado no hay promesa que hacer");
    assert.equal(tabConflictOutcome(true, false), "notice-corrupt", "el espécimen de la caza: apartado sí, adopción no — el banner NO se levanta");
    assert.equal(tabConflictOutcome(false, false), "notice-corrupt", "sin aterrizaje, el aviso de dañada manda sobre cualquier otra palabra");
  });

  it("el cableado: adoptStoredPack devuelve su desenlace y surfaceTabConflict decide con él", () => {
    const provider = readFileSync(new URL("../../components/faro/provider.tsx", import.meta.url), "utf8");
    assert.match(provider, /function adoptStoredPack\(missedText: string \| null = null\): boolean/, "la adopción devuelve si aterrizó");
    assert.match(provider, /const landed = adoptStoredPack\(missedText\);/, "el conflicto de pestaña adopta guardando el desenlace");
    assert.match(provider, /tabConflictOutcome\(kept, landed\)/, "el banner se decide con la fórmula de packguard");
    assert.match(provider, /setUi\(\{ notice: translate\(cur\?\.ledger\.settings\.lang \?\? "es", "pack\.corrupt"\) \}\)/, "la rama de fallo levanta el aviso de copia dañada, como el arranque");
  });
});
