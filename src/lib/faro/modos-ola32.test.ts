/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 32 — LA CURA (equipo amigo). Once familias:
 *
 *  F1 · EL VOCABULARIO DE PERÍODO, TERCER ANILLO (Q32-1): las frases
 *       que periodOf mismo habla llegan a su familia — «la primera
 *       quincena», «la segunda quincena», "the first/second half",
 *       "this half month" sirven su quincena; y los nombres de
 *       período que ninguna puerta sirve («trimestre», «semestre»,
 *       "quarter", "fortnight") mueren en silencio honesto, jamás
 *       acusados como personas. Una sola fuente: PERIOD_HALF_PHRASES.
 *  F2 · LA COSTURA COSE POR PALABRA ENTERA (Q32-2): followUpRewrite
 *       reemplaza la palabra/frase entera del eje — «rosario» no se
 *       toca al cambiar Rosa por Ana — y el «¿Por qué?» cita la
 *       pregunta real del usuario con el eje cambiado.
 *  F3 · EL ECO SOLO CUANDO CAMBIÓ (Q32-3): la reescritura compara el
 *       valor nuevo con el que el marco ya trae (persona y período
 *       clavados aquí; la cuenta pasa por la misma comparación) —
 *       sin cambio no hay nota de cambio.
 *  F4 · EL PORQUÉ NO CORTA EL HILO §20 (Q32-4): porqueResult
 *       devuelve el AskFrame que la caja le enhebra, como la
 *       proyección servida aprendió en la Cura 31 — tras «¿Por
 *       qué?», el estrechamiento sigue el hilo.
 *  F5 · EL ESPEJO JUZGA LA FINITUD (G32-1): faro_num_ok en el SQL —
 *       su conducta se corre en PGlite desde bench-cura32 (el SQL no
 *       corre en la suite de node); aquí no se clava por texto lo
 *       que el banco prueba corriendo.
 *  F6 · LA LÍNEA SIN CATEGORÍA QUEDA INTACTA (G32-2): el predicado
 *       «kept» (y la guarda gemela de la unión de lápidas) tratan la
 *       categoría ausente como fuera de alcance — banco PGlite en
 *       bench-cura32, como F5.
 *  F7 · LA PUERTA DE LA CEREMONIA REHÚSA, NUNCA EXPLOTA (G32-3):
 *       passiveRecordFromCopy cumple «registro o null» también con
 *       categorías de forma vieja — el constructor defiende el
 *       nombre (nameKey/customName leídos con su forma) y la
 *       construcción va guardada. La puerta del libro NO aprende
 *       los campos de nombre: la razón va en CURA-OLA32.
 *  F8 · LA UNIÓN DE PASIVOS LEE LA BASE (G32-4): la ausencia
 *       compone como en las líneas — el folio borrado por un lado
 *       que trae el campo no resucita desde el otro, y el registro
 *       que solo la base trae sobrevive cuando ningún lado trae el
 *       campo.
 *  F9 · LA CEREMONIA ESPERA LA PERSISTENCIA REAL (Q32-1 de Cara):
 *       cableado declarado — la superficie cierra la membresía solo
 *       cuando commitFlushed confirma el folio en el pack escrito.
 *  F10 · LA TARJETITA DE PRECIOS NACE APAGADA (Q32-2 de Cara):
 *       cableado declarado — sin toque no hay fila encendida (sin
 *       respaldo a la primera fila) y el detalle espera su sujeto.
 *  F11 · LA RUTA DEL AVISO NOMBRA SU PISO (Q32-3 de Cara): la forma
 *       del Susurro — al llegar en Esencial, el Estudio susurra el
 *       mes que el aviso nombró y el piso donde vive entero; la
 *       clave vive en los dos idiomas.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-32-G1 (el instante sin
 * zona — sin quiebre), OBS-32-G2 (dos lecturas, sin fallo),
 * OBS-32-A1..A4, los dos registros de Enseñanza (la novedad .405
 * sin topic es pluma del carril; la .406 sin re-enseñanza, con su
 * lectura B), OBS-29-A1, OBS-29-C1, OBS-28-G1/C1, OBS-27-G1,
 * F27-3, H27-1, OBS-C8-1, la coexistencia DECLARADA, OBS-C31-1,
 * A23-4 (CERRADO), la síntesis sin piso (FALLADA por Oscar), el
 * tip de modos, la línea del Manual por familia.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { answerBankQuestion, answerFollowUp, convoAfterFollowUp, type AskFrame, type BankResult, type ConvoFrame } from "./ask2";
import { createInitial, makeNamer } from "./defaults";
import { passiveRecordFromCopy, passiveRecordsOf, withPassiveRecord } from "./exit";
import { fuseBooks, type FuseSide } from "./fuse";
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

/* El libro de la ola (el de la cerca 31): cinco personas de remesas
 * y envíos en la semana (320), octubre (410), el mes pasado (180) y
 * agosto (100); gasto de octubre 710 con las remesas. La primera
 * quincena de octubre trae solo el envío de Al (90, el día 06); la
 * segunda, 320 (19, 20 y 21). */
function libro(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [
    { id: "mama", name: "Mamá" }, { id: "primo", name: "Primo" },
    { id: "ana", name: "Ana" }, { id: "rosa", name: "Rosa" },
    { id: "al", name: "Al" },
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

/* El libro del rosario (F2): Rosa y Ana, cada una con su envío
 * «Rosario» de octubre — 150 y 40. */
function libroRosario(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [{ id: "rosa", name: "Rosa" }, { id: "ana", name: "Ana" }];
  ledger.months["2026-10"] = { lines: [
    line({ id: "r-rosa", kind: "expense-variable" as LineKind, concept: "Rosario", amountMinor: 15000, categoryId: "f-remesas", to: "rosa", monthKey: KEY, bookedOn: "2026-10-10" }),
    line({ id: "r-ana", kind: "expense-variable" as LineKind, concept: "Rosario", amountMinor: 4000, categoryId: "f-remesas", to: "ana", monthKey: KEY, bookedOn: "2026-10-11" }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}

/* La conversación conducida COMO LA CAJA CURADA (ask-box.tsx): el
 * §20 primero; la cascada con el ConvoFrame Y el AskFrame vivo
 * enhebrados (la costura de la Familia 4); cada marco se reemplaza
 * con la respuesta que lo trae. */
class Convo {
  frame: AskFrame | null = null;
  convo: ConvoFrame | null = null;
  ledger: LedgerState;
  constructor(ledger: LedgerState) { this.ledger = ledger; }
  ask(raw: string, mode: Mode3 = "completo", lang: "es" | "en" = "es"): BankResult {
    const names = makeNamer(this.ledger.structure, lang);
    const ctx: ParseCtx = { ledger: this.ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
    const fu = answerFollowUp(this.ledger, KEY, lang, names, raw, ctx, TODAY, this.frame, mode, []);
    const r = fu ?? answerBankQuestion(this.ledger, KEY, lang, names, raw, ctx, TODAY, undefined, mode, [], this.convo, this.frame);
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

describe("ola32 · F1 — el vocabulario de período, tercer anillo", () => {
  it("«la primera quincena» sirve SU quincena (90), jamás acusa a «primera»", () => {
    const r = new Convo(libro()).ask("¿Cuánto mandé la primera quincena?");
    assert.equal(family(r), "remesas-periodo");
    assert.match(verdict(r), /\$90\.00/);
    assert.doesNotMatch(verdict(r), /No sé quién es/);
  });
  it("«la segunda quincena» sirve la suya (320), jamás acusa a «segunda»", () => {
    const r = new Convo(libro()).ask("¿Cuánto mandé la segunda quincena?");
    assert.equal(family(r), "remesas-periodo");
    assert.match(verdict(r), /\$320\.00/);
    assert.doesNotMatch(verdict(r), /No sé quién es/);
  });
  it("EN: \"the first half\" (90), \"the second half\" (320) y \"this half month\" (320) sirven su quincena", () => {
    const c = new Convo(libro());
    const a = c.ask("How much did I send the first half?", "completo", "en");
    assert.equal(family(a), "remesas-periodo");
    assert.match(verdict(a), /\$90\.00/);
    const b = c.ask("How much did I send the second half?", "completo", "en");
    assert.match(verdict(b), /\$320\.00/);
    const d = c.ask("How much did I send this half month?", "completo", "en");
    assert.equal(family(d), "remesas-periodo");
    assert.match(verdict(d), /\$320\.00/);
    assert.doesNotMatch(verdict(d), /don't know who/);
  });
  it("los períodos sin puerta («trimestre», «semestre», \"quarter\", \"fortnight\") no acusan a nadie ni se sirven como período", () => {
    const c = new Convo(libro());
    for (const q of ["¿Cuánto mandé este trimestre?", "¿Cuánto mandé este semestre?"]) {
      const r = c.ask(q);
      assert.doesNotMatch(verdict(r), /No sé quién es/, q);
      assert.notEqual(family(r), "remesas-periodo", q);
    }
    const e = new Convo(libro());
    for (const q of ["How much did I send this quarter?", "How much did I send this fortnight?"]) {
      const r = e.ask(q, "completo", "en");
      assert.doesNotMatch(verdict(r), /don't know who/, q);
      assert.notEqual(family(r), "remesas-periodo", q);
    }
  });
  it("control: «esta quincena» sigue sirviendo 320 y la persona real con nombre de período resuelve por el escaneo", () => {
    const c = new Convo(libro());
    const r = c.ask("¿Cuánto mandé esta quincena?");
    assert.equal(family(r), "remesas-periodo");
    assert.match(verdict(r), /\$320\.00/);
    assert.match(verdict(c.ask("¿Cuánto le mandé a Rosa?")), /\$100\.00/);
  });
});

describe("ola32 · F2 — la costura cose por palabra entera", () => {
  it("«¿Y Ana?» tras el rosario de Rosa sirve lo de Ana (40), no lo de Rosa con el nombre cambiado", () => {
    const c = new Convo(libroRosario());
    const first = c.ask("¿Cuánto mandé por el rosario a Rosa?");
    assert.match(verdict(first), /\$150\.00/);
    const r = c.ask("¿Y Ana?");
    assert.match(verdict(r), /\$40\.00/);
    assert.doesNotMatch(verdict(r), /\$150\.00/);
    assert.match(note(r), /cambié solo la persona, a «ana»/);
  });
  it("el «¿Por qué?» cita la pregunta real cosida — «rosario a ana», jamás «anario»", () => {
    const c = new Convo(libroRosario());
    c.ask("¿Cuánto mandé por el rosario a Rosa?");
    c.ask("¿Y Ana?");
    const r = c.ask("¿Por qué?");
    assert.match(verdict(r), /por el rosario a ana/);
    assert.doesNotMatch(verdict(r), /anario/);
  });
});

describe("ola32 · F3 — el eco solo cuando cambió", () => {
  it("eje persona: «¿Y Rosa?» tras preguntar por Rosa sirve su cifra SIN nota de cambio", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto le mandé a Rosa?");
    const r = c.ask("¿Y Rosa?");
    assert.match(verdict(r), /\$100\.00/);
    assert.doesNotMatch(note(r), /cambié/);
  });
  it("eje período: «¿Y en octubre?» tras preguntar por octubre sirve su suma SIN nota de cambio", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto mandé en octubre?");
    const r = c.ask("¿Y en octubre?");
    assert.match(verdict(r), /\$410\.00/);
    assert.doesNotMatch(note(r), /cambié/);
  });
  it("control: el cambio verdadero conserva su eco («¿Y Ana?» tras Rosa, con su nota)", () => {
    const c = new Convo(libro());
    c.ask("¿Cuánto le mandé a Rosa esta semana?");
    const r = c.ask("¿Y Ana?");
    assert.match(note(r), /cambié solo la persona, a «ana»/);
  });
});

describe("ola32 · F4 — el porqué no corta el hilo §20", () => {
  it("tras «¿Por qué?», el marco §20 sigue vivo y «¿Y en alimentos?» estrecha sobre él", () => {
    const ledger = libro();
    for (const l of ledger.months[KEY].lines) if (l.id === "g-1" || l.id === "g-2") l.categoryId = "f-alimentos";
    const c = new Convo(ledger);
    const first = c.ask("¿Cuánto gasté este mes?");
    assert.match(verdict(first), /\$710\.00/);
    assert.notEqual(c.frame, null);
    const why = c.ask("¿Por qué?");
    assert.equal(family(why), "porque");
    assert.notEqual(c.frame, null, "el porqué devolvió el marco: el hilo no se cortó");
    const r = c.ask("¿Y en alimentos?");
    assert.notEqual(family(r), "unknown");
    assert.match(verdict(r), /\$300\.00/);
  });
  it("control: sin pregunta previa, el porqué dice que no hay cifra — y no fabrica marco", () => {
    const c = new Convo(libro());
    const r = c.ask("¿Por qué?");
    assert.equal(family(r), "porque");
    assert.match(verdict(r), /Todavía no hay una cifra/);
    assert.equal(c.frame, null);
  });
});

/* ── F7/F8: la ceremonia y la fusión ─────────────────────────────── */
const recordOf = (id: string, lineId: string): PassiveRecord =>
  passiveRecordFromCopy((() => { const s = createInitial("es", "oscuro"); s.months["2026-09"] = { lines: [remit(lineId, "2026-09", 5000, "primo", "10")] }; return s; })(), "dueno", "es", "2026-11-20T10:00:00.000Z", id)!;
const side = (state: LedgerState, revision: number): FuseSide => ({ state, revision, updatedAt: "2026-11-20T10:00:00.000Z" });

function scopedOldShape(cats: unknown): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months["2026-09"] = { lines: [remit("p-1", "2026-09", 5000, "primo", "10")] };
  (ledger.structure as unknown as Record<string, unknown>).categories = cats;
  return ledger;
}

describe("ola32 · F7 — la puerta de la ceremonia rehúsa, nunca explota", () => {
  it("la categoría de forma vieja (id y subs, sin nombre) da registro, no excepción — con su id por nombre", () => {
    const rec = passiveRecordFromCopy(scopedOldShape([{ id: "c-vieja", subs: [] }]), "dueno", "es", "2026-11-20T10:00:00.000Z", "rec-vieja");
    assert.notEqual(rec, null);
    assert.equal(rec!.categories[0]?.name, "c-vieja");
    const stored = withPassiveRecord(createInitial("es", "oscuro"), rec!);
    assert.equal(passiveRecordsOf(stored).length, 1);
  });
  it("el customName que no es texto tampoco explota la puerta: el registro nace con el respaldo", () => {
    const rec = passiveRecordFromCopy(scopedOldShape([{ id: "c-num", nameKey: "", customName: 42, subs: [] }]), "dueno", "es", "2026-11-20T10:00:00.000Z", "rec-num");
    assert.notEqual(rec, null);
    assert.equal(rec!.categories[0]?.name, "c-num");
  });
  it("control: la copia con una línea injuzgable sigue rehusada en null (la puerta juzga, no traga)", () => {
    const bad = createInitial("es", "oscuro");
    const l = remit("p-1", "2026-09", 5000, "primo", "10");
    (l as unknown as Record<string, unknown>).amountMinor = "100";
    bad.months["2026-09"] = { lines: [l] };
    assert.equal(passiveRecordFromCopy(bad, "dueno", "es", "2026-11-20T10:00:00.000Z", "rec-x"), null);
  });
});

describe("ola32 · F8 — la unión de pasivos lee la base", () => {
  it("el folio borrado por el lado ganador no resucita desde el perdedor (G32-4)", () => {
    const base = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-base", "p-b"));
    const winnerState = createInitial("es", "oscuro");
    winnerState.passiveRecords = [];
    const loserState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-base", "p-b"));
    const { state } = fuseBooks(base, side(winnerState, 5), side(loserState, 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id), []);
  });
  it("el folio borrado por el lado perdedor tampoco resucita: la ausencia de quien trae el campo manda", () => {
    const base = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-base", "p-b"));
    const winnerState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-base", "p-b"));
    const loserState = createInitial("es", "oscuro");
    loserState.passiveRecords = [];
    const { state } = fuseBooks(base, side(winnerState, 5), side(loserState, 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id), []);
  });
  it("el registro que solo la base trae sobrevive cuando ningún lado trae el campo (formato viejo)", () => {
    const base = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-base", "p-b"));
    const { state } = fuseBooks(base, side(createInitial("es", "oscuro"), 5), side(createInitial("es", "oscuro"), 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id), ["rec-base"]);
  });
  it("control: la unión de la Ola 31 sigue — el registro del perdedor sobrevive y a igual id manda el ganador", () => {
    const base = createInitial("es", "oscuro");
    const serverState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-server", "p-s"));
    const localState = withPassiveRecord(createInitial("es", "oscuro"), recordOf("rec-local", "p-l"));
    const { state } = fuseBooks(base, side(serverState, 5), side(localState, 3));
    assert.deepEqual(passiveRecordsOf(state).map((r) => r.id).sort(), ["rec-local", "rec-server"]);
  });
  it("control: sin registros en la base ni en los lados, el campo no nace en el fusionado", () => {
    const base = createInitial("es", "oscuro");
    const { state } = fuseBooks(base, side(createInitial("es", "oscuro"), 5), side(createInitial("es", "oscuro"), 3));
    assert.equal("passiveRecords" in state, false);
  });
});

/* ── F9/F10/F11: el cableado declarado de la cara ────────────────── */
describe("ola32 · F9/F10/F11 — el cableado de la cara", () => {
  it("F9: la ceremonia espera el folio en disco (commitFlushed) ANTES de cerrar la membresía", () => {
    const src = readFileSync(new URL("../../components/faro/shared-view.tsx", import.meta.url), "utf8");
    const leaveAt = src.indexOf("const leave = async");
    const flushAt = src.indexOf("commitFlushed(", leaveAt);
    const closeAt = src.indexOf("leaveMembership(m.id)", leaveAt);
    assert.ok(flushAt > leaveAt && closeAt > flushAt, "la espera de la escritura precede al cierre de la membresía");
    const prov = readFileSync(new URL("../../components/faro/provider.tsx", import.meta.url), "utf8");
    assert.match(prov, /commitFlushed: \(recipe/);
    assert.match(prov, /settleFlush\(session\.ledger, true\)/);
  });
  it("F10: sin toque no hay fila encendida — la primera fila ya no es el respaldo del detalle", () => {
    const src = readFileSync(new URL("../../components/faro/price-watch.tsx", import.meta.url), "utf8");
    assert.doesNotMatch(src, /\?\? watch\.rows\[0\]/);
    assert.match(src, /pick \? watch\.rows\.find/);
    assert.match(src, /pw-idle/);
  });
  it("F11: la ruta del aviso susurra su piso en Esencial, y la clave vive en los dos idiomas", () => {
    const src = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
    assert.match(src, /mode\.whisper\.history-month/);
    const i18n = readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");
    const hits = i18n.split("mode.whisper.history-month").length - 1;
    assert.ok(hits >= 2, "la clave del susurro existe en español y en inglés");
  });
});
