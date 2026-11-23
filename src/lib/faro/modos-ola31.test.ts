/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 31 — LA CURA (equipo amigo). Nueve familias:
 *
 *  F1 · EL VOCABULARIO DE PERÍODO ES UNO (Q31-1 de Cara + la costura
 *       de Q31-1 del Asesor): la caminata y la cascada conocen lo que
 *       periodOf y REMIT_PERIOD_MARKER ya conocen — «quincena», los
 *       meses («en agosto»), "pay period", "in august" jamás son
 *       candidatas a persona, y la pregunta de período llega a la
 *       familia remesas-periodo. Y el paso 7c NO sirve la suma del
 *       período cuando una persona fue preguntada y no resolvió: la
 *       persona nombrada manda sobre el período presente.
 *  F2 · «AL» CON CONTINUACIÓN (Q31-1 del Asesor): el guardia del
 *       apertor y el permiso de cierre de closesPhrase se reconcilian
 *       — el nombre de 2 letras que está en el libro resuelve también
 *       cuando la pregunta continúa, y el vocabulario de cierre
 *       aprendió «en + mes».
 *  F3 · EL «¿POR QUÉ?» RE-JUZGA EL PISO (Q31-2, dos frentes):
 *       porqueResult recibe el modo y nombra el piso sin desplegar
 *       las piezas congeladas de Completo — la misma ley que el §20
 *       ya cumple. El marco se conserva: al volver a subir, el
 *       despliegue revive. La suma por persona (preguntar básico,
 *       A23-4) no gana piso: su porqué se despliega en todo modo.
 *  F4 · EL MARCO CASA POR PALABRA ENTERA (Q31-3 del Asesor): la cura
 *       de Q28-1 llega al ConvoFrame — «semana» no pare «ana», la
 *       reescritura no fabrica «semrosa», y el eco «cambié solo la
 *       persona» solo se dice cuando la persona cambió de verdad.
 *  F5 · LA PROYECCIÓN SERVIDA DEJA SU MARCO (Q31-3 de Cara): la rama
 *       de Completo de proyectarSeguimiento devuelve la respuesta
 *       CON frame, como la de piso — el hilo del §20 sobrevive.
 *  F6 · EL EMPALME DEL SERVIDOR JUZGA LAS LÍNEAS Y LOS TIPOS
 *       (G31-1, G31-2): su conducta se corre en PGlite desde
 *       bench-cura31 (el SQL no corre en la suite de node); aquí no
 *       se clava por texto lo que el banco prueba corriendo.
 *  F7 · LA CEREMONIA ANUNCIA SOLO LO VERIFICADO (G31-3): el registro
 *       pasivo se juzga ANTES de la ceremonia (passiveRecordFromCopy)
 *       y la superficie cierra la membresía solo con el folio ya
 *       aterrizado — el orden se clava como cableado declarado.
 *  F8 · LA FUSIÓN COMPONE LOS REGISTROS Y LEE LA BASE (G31-4, G31-5):
 *       fuseBooks compone passiveRecords de ambos lados como compone
 *       meses y lápidas, y la unión de lápidas se siembra también
 *       desde base — la línea borrada en la base no resucita.
 *  F9 · LA NOVEDAD ANUNCIA CON SU PUERTA (registro de Enseñanza): las
 *       novedades que anuncian una pregunta o función (.400, .403)
 *       llevan su topic como las de la .382/.383.
 *
 * NO TOCADO (ante Oscar o declarado): OBS31-C3 (la síntesis sin
 * piso — juicio de Oscar), OBS-29-A1, OBS-29-C1, OBS-28-G1/C1,
 * OBS-27-G1, F27-3, H27-1, OBS-C8-1, la coexistencia DECLARADA,
 * OBS-C31-1, el empate posicional de instantes, A23-4 (CERRADO),
 * el tip de modos, la línea del Manual por familia.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { answerBankQuestion, answerFollowUp, convoAfterFollowUp, type AskFrame, type BankResult, type ConvoFrame } from "./ask2";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults";
import { makePassiveRecord, passiveRecordFromCopy, passiveRecordsOf, withPassiveRecord } from "./exit";
import { fuseBooks, type FuseSide } from "./fuse";
import { NEWS } from "./novedades";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind, PassiveRecord } from "./types";

const KEY = "2026-10";
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
const remit = (id: string, monthKey: string, amountMinor: number, to: string, day: string): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });
const spend = (id: string, monthKey: string, amountMinor: number, day: string): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept: id, amountMinor, categoryId: "", monthKey, bookedOn: `${monthKey}-${day}` });

/* El libro de la ola: cinco personas de remesas (Ana dentro de
 * «semana», Al de 2 letras) y envíos en la semana (320), octubre
 * (410), el mes pasado (180) y agosto (100); gasto de octubre 710
 * con las remesas. */
function libro(conAl = true): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [
    { id: "mama", name: "Mamá" }, { id: "primo", name: "Primo" },
    { id: "ana", name: "Ana" }, { id: "rosa", name: "Rosa" },
    ...(conAl ? [{ id: "al", name: "Al" }] : []),
  ];
  ledger.months["2026-10"] = { lines: [
    remit("r-ana", "2026-10", 15000, "ana", "19"),
    remit("r-primo", "2026-10", 5000, "primo", "20"),
    remit("r-mama", "2026-10", 12000, "mama", "21"),
    remit("r-al", "2026-10", 9000, "al", "06"),
    spend("g-1", "2026-10", 10000, "03"),
    spend("g-2", "2026-10", 20000, "12"),
  ] };
  ledger.months["2026-09"] = { lines: [
    remit("r-rosa-s", "2026-09", 10000, "rosa", "21"),
    remit("r-primo-s", "2026-09", 8000, "primo", "15"),
  ] };
  ledger.months["2026-08"] = { lines: [
    remit("r-primo-a", "2026-08", 7000, "primo", "10"),
    remit("r-mama-a", "2026-08", 3000, "mama", "05"),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}

/* La conversación conducida COMO LA CAJA (ask-box.tsx): seguimiento
 * §20 primero; cascada con el ConvoFrame después; el AskFrame se
 * reemplaza con cada respuesta y el ConvoFrame se renueva por la
 * costura cuando el §20 responde. */
class Convo {
  frame: AskFrame | null = null;
  convo: ConvoFrame | null = null;
  ledger: LedgerState;
  constructor(ledger: LedgerState) { this.ledger = ledger; }
  ask(raw: string, mode: Mode3 = "completo", lang: "es" | "en" = "es"): BankResult {
    const names = makeNamer(this.ledger.structure, lang);
    const ctx: ParseCtx = { ledger: this.ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
    const fu = answerFollowUp(this.ledger, KEY, lang, names, raw, ctx, TODAY, this.frame, mode, []);
    const r = fu ?? answerBankQuestion(this.ledger, KEY, lang, names, raw, ctx, TODAY, undefined, mode, [], this.convo);
    if (r.kind === "answer") {
      this.frame = r.frame ?? null;
      this.convo = fu ? convoAfterFollowUp(this.ledger, KEY, names, this.convo, raw, TODAY, r) : (r.convo ?? null);
    }
    return r;
  }
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");
const note = (r: BankResult): string => (r.kind === "answer" ? r.note ?? "" : "");
const family = (r: BankResult): string => (r.kind === "answer" ? r.family : r.kind);

describe("ola31 · F1 — el vocabulario de período es uno", () => {
  it("«esta quincena» llega a remesas-periodo, jamás acusa a «quincena» de persona", () => {
    const r = new Convo(libro()).ask("¿Cuánto mandé esta quincena?");
    assert.equal(family(r), "remesas-periodo");
    assert.match(verdict(r), /\$320\.00/);
    assert.doesNotMatch(verdict(r), /No sé quién es/);
  });
  it("«en agosto» sirve el mes nombrado, no acusa a «agosto»", () => {
    const r = new Convo(libro()).ask("¿Cuánto mandé en agosto?");
    assert.equal(family(r), "remesas-periodo");
    assert.match(verdict(r), /\$100\.00/);
    assert.doesNotMatch(verdict(r), /No sé quién es/);
  });
  it("EN: \"this pay period\" y \"in August\" sirven el período, no acusan a nadie", () => {
    const c = new Convo(libro());
    const a = c.ask("How much did I send this pay period?", "completo", "en");
    assert.equal(family(a), "remesas-periodo");
    assert.match(verdict(a), /\$320\.00/);
    const b = c.ask("How much did I send in August?", "completo", "en");
    assert.equal(family(b), "remesas-periodo");
    assert.match(verdict(b), /\$100\.00/);
    assert.doesNotMatch(verdict(b), /don't know who/);
  });
  it("la persona nombrada manda sobre el período: sin Al en el libro, el 7c no sirve la suma global", () => {
    const r = new Convo(libro(false)).ask("¿Cuánto le mandé a Al en el mes pasado?");
    assert.match(verdict(r), /No sé a quién te refieres/);
    assert.doesNotMatch(verdict(r), /\$180\.00/);
    assert.notEqual(family(r), "remesas-periodo");
  });
  it("control: «esta semana» y «al mes pasado» sin persona siguen sirviendo el período", () => {
    const c = new Convo(libro());
    assert.match(verdict(c.ask("¿Cuánto mandé esta semana?")), /\$320\.00/);
    assert.match(verdict(c.ask("¿Cuánto mandé al mes pasado?")), /\$180\.00/);
  });
});

describe("ola31 · F2 — «Al» con continuación", () => {
  it("«a Al en octubre» sirve lo de Al en octubre; «octubre» jamás es acusado", () => {
    const r = new Convo(libro()).ask("¿Cuánto le mandé a Al en octubre?");
    assert.match(verdict(r), /A Al le has mandado \$90\.00 en octubre/);
    assert.doesNotMatch(verdict(r), /No sé quién es/);
  });
  it("«a Al ayer» sirve el total de Al, no el silencio", () => {
    const r = new Convo(libro()).ask("¿Cuánto le mandé a Al ayer?");
    assert.match(verdict(r), /A Al le has mandado \$90\.00 en total/);
  });
  it("«a Al en el mes pasado» y «a Al esta semana» acotan la ausencia a Al; la global no se sirve", () => {
    const c = new Convo(libro());
    const a = c.ask("¿Cuánto le mandé a Al en el mes pasado?");
    assert.match(verdict(a), /No hay envíos a Al anotados en el mes pasado/);
    assert.doesNotMatch(verdict(a), /\$180\.00/);
    const b = c.ask("¿Cuánto le mandé a Al esta semana?");
    assert.match(verdict(b), /No hay envíos a Al anotados en esta semana/);
    assert.doesNotMatch(verdict(b), /\$320\.00/);
  });
  it("la recencia «a Al ayer» entrega la última remesa DE AL, con su nombre", () => {
    const r = new Convo(libro()).ask("¿Cuándo fue la última remesa a Al ayer?");
    assert.equal(family(r), "recencia");
    assert.match(verdict(r), /última remesa a Al/);
    assert.match(verdict(r), /\$90\.00/);
    // ENMIENDA (integración de la Ola 26·U6 del banco): la recencia
    // dice las fechas EN PALABRAS (fmtFecha) — «el 6 de octubre de
    // 2026», no la ISO. El hecho fijado es el mismo.
    assert.match(verdict(r), /6 de octubre de 2026/);
  });
  it("controles: «al banco» sigue acusado con su nombre y «al pastor Rosa» sirve a Rosa limpia", () => {
    const c = new Convo(libro());
    assert.match(verdict(c.ask("¿Cuánto le mandé al banco?")), /No sé quién es «banco»/);
    assert.match(verdict(c.ask("¿Cuánto le mandé al pastor Rosa?")), /A Rosa le has mandado \$100\.00 en total/);
  });
});

describe("ola31 · F3 — el «¿por qué?» re-juzga el piso", () => {
  it("el patrón ganado en Completo, tras bajar a Esencial, nombra el piso sin desplegar piezas", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé en remesas?", "completo");
    const r = c.ask("¿Por qué?", "esencial");
    assert.equal(family(r), "porque");
    assert.match(verdict(r), /vive en Completo/);
    assert.doesNotMatch(verdict(r), /contando estas piezas/);
    assert.doesNotMatch(verdict(r), /\$200\.00/);
  });
  it("el marco se conserva tras el veredicto de piso: al volver a Completo, el despliegue revive", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé en remesas?", "completo");
    c.ask("¿Por qué?", "esencial");
    const r = c.ask("¿Por qué?", "completo");
    assert.match(verdict(r), /contando estas piezas/);
    assert.match(verdict(r), /Primo \$200\.00/);
  });
  it("control: en Completo el porqué del patrón se despliega como siempre", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé en remesas?", "completo");
    const r = c.ask("¿Por qué?", "completo");
    assert.match(verdict(r), /contando estas piezas/);
  });
  it("la suma por persona no gana piso (A23-4): su porqué se despliega también en Esencial", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto le mandé a Mamá?", "completo");
    const r = c.ask("¿Por qué?", "esencial");
    assert.match(verdict(r), /contando estas piezas/);
    assert.match(verdict(r), /Mamá \$150\.00/);
    assert.doesNotMatch(verdict(r), /vive en Completo/);
  });
  it("la proyección servida en Completo: su porqué, tras bajar, nombra el piso sin la cifra del ritmo", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto gasté este mes?", "completo");
    c.ask("¿Y el mes que viene?", "completo");
    const r = c.ask("¿Por qué?", "esencial");
    assert.equal(family(r), "porque");
    assert.match(verdict(r), /vive en Completo/);
    assert.doesNotMatch(verdict(r), /\$710\.00/);
  });
});

describe("ola31 · F5 — la proyección servida deja su marco", () => {
  it("tras una proyección servida, el marco §20 sigue vivo y el mismo verbo vuelve a servir", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto gasté este mes?", "completo");
    const p = c.ask("¿Y el mes que viene?", "completo");
    assert.equal(family(p), "futuro");
    assert.notEqual(c.frame, null);
    const p2 = c.ask("¿Y el mes que viene?", "completo");
    assert.equal(family(p2), "futuro");
    assert.match(verdict(p2), /gastarías \$710\.00/);
  });
});

describe("ola31 · F4 — el marco casa por palabra entera", () => {
  it("«esta semana» no pare personName «ana»: el marco de la suma del período nace sin persona", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé esta semana?", "completo");
    assert.equal(c.convo?.personName ?? null, null);
  });
  it("«¿Y Ana?» tras la suma de la semana no re-sirve la global con el eco falso", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé esta semana?", "completo");
    const r = c.ask("¿Y Ana?", "completo");
    assert.doesNotMatch(note(r), /cambié solo la persona/);
    assert.doesNotMatch(verdict(r), /Esta semana mandaste \$320\.00/);
  });
  it("«¿Y Rosa?» no fabrica «semrosa» ni acusa a la palabra que la reescritura inventó", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé esta semana?", "completo");
    const r = c.ask("¿Y Rosa?", "completo");
    assert.doesNotMatch(verdict(r), /semrosa/);
    assert.doesNotMatch(note(r), /cambié solo la persona/);
  });
  it("el eje legítimo sigue vivo: con personName verdadero, «¿Y Ana?» sirve lo de Ana con su eco", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto le mandé a Rosa esta semana?", "completo");
    assert.equal(c.convo?.personName ?? null, "rosa");
    const r = c.ask("¿Y Ana?", "completo");
    assert.match(verdict(r), /A Ana le has mandado \$150\.00 en esta semana/);
    assert.match(note(r), /cambié solo la persona, a «ana»/);
  });
});

/* ── F7/F8: la ceremonia y la fusión ─────────────────────────────── */
function scopedBook(badLine: boolean): LedgerState {
  const ledger = createInitial("es", "oscuro");
  const l = remit("p-1", "2026-09", 5000, "primo", "10");
  if (badLine) (l as unknown as Record<string, unknown>).amountMinor = "100";
  ledger.months["2026-09"] = { lines: [l] };
  return ledger;
}
const recordOf = (id: string, lineId: string): PassiveRecord =>
  makePassiveRecord((() => { const s = createInitial("es", "oscuro"); s.months["2026-09"] = { lines: [remit(lineId, "2026-09", 5000, "primo", "10")] }; return s; })(), "dueno", "es", "2026-11-20T10:00:00.000Z", id);
const side = (state: LedgerState, revision: number): FuseSide => ({ state, revision, updatedAt: "2026-11-20T10:00:00.000Z" });

describe("ola31 · F7 — la ceremonia anuncia solo lo verificado", () => {
  it("passiveRecordFromCopy rehúsa la copia con una línea injuzgable: la ceremonia no nace", () => {
    assert.equal(passiveRecordFromCopy(scopedBook(true), "dueno", "es", "2026-11-20T10:00:00.000Z", "rec-x"), null);
  });
  it("con la copia sana, el registro nace juzgado y aterriza entero en el libro", () => {
    const rec = passiveRecordFromCopy(scopedBook(false), "dueno", "es", "2026-11-20T10:00:00.000Z", "rec-ok");
    assert.notEqual(rec, null);
    const stored = withPassiveRecord(createInitial("es", "oscuro"), rec!);
    assert.equal(passiveRecordsOf(stored).length, 1);
    assert.equal(passiveRecordsOf(stored)[0].id, "rec-ok");
  });
  it("cableado declarado: la superficie juzga el registro ANTES de cerrar la membresía y conoce el desenlace «record-failed»", () => {
    const src = readFileSync(new URL("../../components/faro/shared-view.tsx", import.meta.url), "utf8");
    const leaveAt = src.indexOf("const leave = async");
    const judgeAt = src.indexOf("passiveRecordFromCopy(", leaveAt);
    const closeAt = src.indexOf("leaveMembership(m.id)", leaveAt);
    assert.ok(judgeAt > leaveAt && closeAt > judgeAt, "el juicio del registro precede al cierre de la membresía");
    assert.match(src, /"record-failed"/);
  });
});

describe("ola31 · F8 — la fusión compone los registros y lee la base", () => {
  it("el registro del lado que pierde la revisión sobrevive en el fusionado (G31-4)", () => {
    const base = createInitial("es", "oscuro");
    const serverState = createInitial("es", "oscuro");
    const localState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-local", "p-l"));
    const { state } = fuseBooks(base, side(serverState, 5), side(localState, 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id), ["rec-local"]);
  });
  it("la unión de registros: uno por lado, ambos quedan; a igual id manda el ganador", () => {
    const base = createInitial("es", "oscuro");
    const serverState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-server", "p-s"));
    const localState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-local", "p-l"));
    const { state } = fuseBooks(base, side(serverState, 5), side(localState, 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id).sort(), ["rec-local", "rec-server"]);
  });
  it("la lápida que solo la base conserva mata igual: la línea borrada en la base no resucita (G31-5)", () => {
    const base = createInitial("es", "oscuro");
    base.months["2026-09"] = { lines: [remit("p-muerta", "2026-09", 5000, "primo", "10")] };
    base.tombstones = [{ id: "p-muerta", at: "2026-10-01T00:00:00.000Z", by: "dueno" }];
    const mkSide = () => { const s = createInitial("es", "oscuro"); s.months["2026-09"] = { lines: [remit("p-muerta", "2026-09", 5000, "primo", "10")] }; return s; };
    const { state } = fuseBooks(base, side(mkSide(), 5), side(mkSide(), 3));
    const alive = (state.months["2026-09"]?.lines ?? []).some((l) => l.id === "p-muerta");
    assert.equal(alive, false);
    assert.ok((state.tombstones ?? []).some((t) => t.id === "p-muerta"));
    assert.equal(isLedgerDeep(state), true);
  });
  it("control: sin registros en ningún lado, el campo no nace en el fusionado", () => {
    const base = createInitial("es", "oscuro");
    const { state } = fuseBooks(base, side(createInitial("es", "oscuro"), 5), side(createInitial("es", "oscuro"), 3));
    assert.equal("passiveRecords" in state, false);
  });
});

describe("ola31 · F9 — la novedad anuncia con su puerta", () => {
  it("las novedades .400 y .403, que anuncian preguntas del Asesor, llevan topic «preguntar-asesor»", () => {
    for (const v of ["1.3.400", "1.3.403"]) {
      const entry = NEWS.find((n) => n.version === v);
      assert.ok(entry, `la novedad ${v} existe`);
      assert.equal(entry!.topic, "preguntar-asesor");
    }
  });
  it("la puerta existe: el tema «preguntar-asesor» vive en el Manual", () => {
    const topics = readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
    assert.match(topics, /id: "preguntar-asesor"/);
  });
  it("control: las novedades .382/.383 conservan su topic (la forma de la casa no se movió)", () => {
    for (const v of ["1.3.382", "1.3.383"]) {
      const entry = NEWS.find((n) => n.version === v);
      assert.ok(entry, `la novedad ${v} existe`);
      assert.equal(typeof entry!.topic, "string");
    }
  });
});
