/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 33 — LA CURA (equipo amigo). Ocho familias:
 *
 *  F1 · EL DETECTOR PREFIERE LA COINCIDENCIA MÁS LARGA (Q33-1):
 *       framePersonHit/frameAccountIn resuelven como los escaneos
 *       que sirven — el nombre completo manda sobre su primer
 *       nombre cuando ambos casan («Ana María» sobre «ana», «Casa
 *       Grande» sobre «casa»), en los dos órdenes del libro; el
 *       marco nace con la persona/fondo que la pregunta sirvió, la
 *       costura cose sobre ese nombre y el porqué cita la pregunta
 *       verdadera.
 *  F2 · FRAME_PERIODS ENTRA EN LA FUENTE ÚNICA (Q33-2): el
 *       vocabulario de período del marco ES el de la casa
 *       (PERIOD_HALF_ALL incluido, desde la fuente) — tras «la
 *       primera quincena» el marco guarda su frase y «¿Y la segunda
 *       quincena?» estrecha; «la semana» también tiene su forma.
 *  F3 · LOS MODIFICADORES DE LA QUINCENA MUEREN EN SILENCIO HONESTO
 *       (Q33-3): «próxima», «1ra» y su especie, pegados a su cabeza,
 *       son vocabulario de período en la caminata y jamás se acusan
 *       como personas; sin persona resuelta, la pregunta muere en
 *       unknown — no sirve la quincena en curso disfrazada. EL
 *       ALCANCE se clava también: suelto, sin su cabeza, el
 *       modificador NO es vocabulario (la negativa nombra a
 *       «proxima» cuando es el nombre que traen), y con persona
 *       resuelta manda el paso 7b de siempre (la especie de
 *       OBS-33-A2, registrada, no es esta cura).
 *  F4 · EL ECO COMPARA LA PERSONA, NO LA CADENA (Q33-4): las dos
 *       formas del detector de la MISMA persona no cuentan como
 *       cambio (Juan ~ Juan Pérez, en los dos sentidos), y la frase
 *       de período se compara sin su cabeza («la semana» ~ «esta
 *       semana»); el cambio verdadero sigue trayendo su nota.
 *  F5 · LA PUERTA DE LA REGLA OYE SU NOMBRE ENTERO (Q33-5):
 *       «50/30/20», «50-30-20», «50·30·20» y «rule» abren la
 *       familia en los dos idiomas; "How am I doing with the
 *       50/30/20 rule?" la sirve nombrándola.
 *  F6 · EL ESPEJO DE LA FINITUD, EXACTO TAMBIÉN POR ABAJO (G33-1):
 *       faro_num_ok en el SQL — su conducta se corre en PGlite
 *       desde bench-cura33 (el SQL no corre en la suite de node);
 *       aquí no se clava por texto lo que el banco prueba corriendo.
 *  F7 · EL EMPALME CASA LA CATEGORÍA POR IDENTIDAD (G33-2):
 *       faro_cat_in en el SQL — banco PGlite en bench-cura33, como
 *       F6. La razón de que el juicio viva en los predicados y no
 *       en faro_line_ok va escrita en el SQL y en CURA-OLA33.
 *  F8 · EL FOLIO PINTA SU FECHA EN EL DÍA LOCAL (Q33-1-Cara):
 *       cableado declarado — la tarjeta fecha el instante con el
 *       todayIso de la casa (el día local de quien mira), no con
 *       el corte UTC.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-33-G1 (la copia
 * injuzgable cuenta como ausencia en la unión — medida, sin
 * juicio), OBS-33-A1/A2/A3, los tres registros de Enseñanza (el
 * principal cuelga de F27-3), la novedad .405 sin topic (pluma del
 * carril), OBS-32-G1/G2, OBS-29-A1, OBS-28-C1/G1, OBS-27-G1,
 * F27-3, H27-1, A23-4 (CERRADO), la síntesis sin piso (FALLADA),
 * el tip de modos, OBS-C8-1, OBS-C31-1.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { answerBankQuestion, answerFollowUp, convoAfterFollowUp, type AskFrame, type BankResult, type ConvoFrame } from "./ask2";
import { createInitial, makeNamer } from "./defaults";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind } from "./types";

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
const remit = (id: string, monthKey: string, amountMinor: number, to: string, day: string): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });

function book(people: { id: string; name: string }[], lines: Line[], prevLines: Line[] = []): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = people;
  ledger.months[KEY] = { lines };
  if (prevLines.length) ledger.months[PREV] = { lines: prevLines };
  ledger.settings.display = "USD";
  return ledger;
}
/** Las dos Anas: Ana $100 (oct-19), Ana María $260 (oct-12), Rosa
 * $150 (oct-15). El ORDEN de remitPeople es el parámetro — el
 * detector viejo devolvía el primer acierto de su iteración. */
const fixtureAnas = (largaPrimero: boolean) => book(
  largaPrimero
    ? [{ id: "ana-maria", name: "Ana María" }, { id: "ana", name: "Ana" }, { id: "rosa", name: "Rosa" }]
    : [{ id: "ana", name: "Ana" }, { id: "ana-maria", name: "Ana María" }, { id: "rosa", name: "Rosa" }],
  [remit("r-ana", KEY, 10000, "ana", "19"), remit("r-anamaria", KEY, 26000, "ana-maria", "12"), remit("r-rosa", KEY, 15000, "rosa", "15")],
);
/** Cuentas con prefijo: Casa $500, Casa Grande $900, Carro $300. */
const fixtureCuentas = () => {
  const ledger = book([], []);
  const cat = ledger.structure.categories.find((c) => c.id === "f-ahorro")!;
  cat.subs.push(
    { id: "f.ahorro.casa", nameKey: "f.ahorro.casa", customName: "Casa", icon: "vault", hidden: false, order: 9 },
    { id: "f.ahorro.casagrande", nameKey: "f.ahorro.casagrande", customName: "Casa Grande", icon: "vault", hidden: false, order: 10 },
    { id: "f.ahorro.carro", nameKey: "f.ahorro.carro", customName: "Carro", icon: "vault", hidden: false, order: 11 },
  );
  ledger.months[KEY] = { lines: [
    line({ id: "s-casa", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.casa", monthKey: KEY, bookedOn: `${KEY}-05` }),
    line({ id: "s-grande", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 90000, categoryId: "f-ahorro", subId: "f.ahorro.casagrande", monthKey: KEY, bookedOn: `${KEY}-06` }),
    line({ id: "s-carro", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.carro", monthKey: KEY, bookedOn: `${KEY}-07` }),
  ] };
  return ledger;
};
/** Juan Pérez $210 (oct-18) y Rosa $150 (oct-15). */
const fixtureJuan = () => book(
  [{ id: "juan-perez", name: "Juan Pérez" }, { id: "rosa", name: "Rosa" }],
  [remit("r-juan", KEY, 21000, "juan-perez", "18"), remit("r-rosa", KEY, 15000, "rosa", "15")],
);
/** Cadena: Rosa $150 (oct-20), Ana $100 (oct-19), Primo $50
 * (oct-05); septiembre: Rosa $200, Primo $80. La semana (19–25)
 * suma $250. */
const fixtureCadena = () => book(
  [{ id: "rosa", name: "Rosa" }, { id: "ana", name: "Ana" }, { id: "primo", name: "Primo" }],
  [remit("r-rosa", KEY, 15000, "rosa", "20"), remit("r-ana", KEY, 10000, "ana", "19"), remit("r-primo", KEY, 5000, "primo", "05")],
  [remit("r-rosa0", PREV, 20000, "rosa", "15"), remit("r-primo0", PREV, 8000, "primo", "10")],
);
/** P33 · Octubre: primera quincena $100 (Rosa 40 el 03 + Primo 60
 * el 10), segunda $350 (Rosa 150 el 20 + Mamá 200 el 25);
 * septiembre: segunda quincena $110. */
const fixtureP33 = () => book(
  [{ id: "rosa", name: "Rosa" }, { id: "primo", name: "Primo" }, { id: "mama", name: "Mamá" }],
  [remit("r-r1", KEY, 4000, "rosa", "03"), remit("r-p1", KEY, 6000, "primo", "10"),
   remit("r-r2", KEY, 15000, "rosa", "20"), remit("r-m1", KEY, 20000, "mama", "25")],
  [remit("r-r0", PREV, 7000, "rosa", "05"), remit("r-p0", PREV, 8000, "primo", "20"), remit("r-r0b", PREV, 3000, "rosa", "28")],
);
/** El libro de la regla: ingreso $3,000; necesidades $1,800 (60%),
 * gustos $450, ahorro $300. */
function guiaBook(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "i-1", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000, monthKey: KEY, bookedOn: `${KEY}-01` }),
    line({ id: "e-renta", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 120000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: KEY, bookedOn: `${KEY}-02` }),
    line({ id: "e-despensa", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 60000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", monthKey: KEY, bookedOn: `${KEY}-09` }),
    line({ id: "e-restaurante", kind: "expense-variable" as LineKind, concept: "Restaurante", amountMinor: 45000, categoryId: "v-entretenimiento", subId: "v.entretenimiento.restaurantes", monthKey: KEY, bookedOn: `${KEY}-14` }),
    line({ id: "e-apartado", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.meta", monthKey: KEY, bookedOn: `${KEY}-05` }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}

/* La conversación conducida COMO LA CAJA (ask-box.tsx): el §20
 * primero; la cascada con el ConvoFrame Y el AskFrame enhebrados;
 * cada marco se reemplaza con la respuesta que lo trae. */
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
function loose(ledger: LedgerState, lang: "es" | "en", raw: string, mode: Mode3 = "completo"): BankResult {
  const names = makeNamer(ledger.structure, lang);
  const ctx: ParseCtx = { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
  return answerBankQuestion(ledger, KEY, lang, names, raw, ctx, TODAY, undefined, mode, [], null, null);
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");
const note = (r: BankResult): string => (r.kind === "answer" ? r.note ?? "" : "");
const family = (r: BankResult): string => (r.kind === "answer" ? r.family : r.kind);
const total = (r: BankResult): number => (r.kind === "answer" ? r.pieces.reduce((a, p) => a + p.minor, 0) : -1);
const accuses = (r: BankResult, word: string) => verdict(r).includes(`«${word}»`) || verdict(r).includes(`"${word}"`);

describe("ola33 · F1 — el detector prefiere la coincidencia más larga (persona)", () => {
  for (const largaPrimero of [false, true]) {
    const tag = largaPrimero ? "larga primero" : "corta primero";
    it(`con «Ana» ${tag}: el marco de Ana María nace con «ana maria» y la costura no fabrica palabras`, () => {
      const c = new Convo(fixtureAnas(largaPrimero));
      const t1 = c.ask("¿Cuánto le mandé a Ana María?");
      assert.equal(total(t1), 26000);
      assert.equal(c.convo?.personName, "ana maria");
      const t2 = c.ask("¿Y Rosa?");
      assert.equal(total(t2), 15000);
      const t3 = c.ask("¿Por qué?");
      assert.match(verdict(t3), /a rosa/);
      assert.doesNotMatch(verdict(t3), /rosa maria/);
    });
    it(`con «Ana» ${tag}: «¿Y Ana?» sobre el marco de Ana María sirve lo de ANA ($100), con su eco verdadero`, () => {
      const c = new Convo(fixtureAnas(largaPrimero));
      c.ask("¿Cuánto le mandé a Ana María?");
      const u2 = c.ask("¿Y Ana?");
      assert.equal(total(u2), 10000);
      assert.match(note(u2), /cambié solo la persona/);
    });
  }
});

describe("ola33 · F1 — el detector prefiere la coincidencia más larga (cuenta)", () => {
  it("el marco de Casa Grande nace con «casa grande»; «¿Y Casa?» sirve Casa ($500), no la grande en silencio", () => {
    const c = new Convo(fixtureCuentas());
    const t1 = c.ask("¿Cuánto tengo en Casa Grande?");
    assert.match(verdict(t1), /Casa Grande/);
    assert.equal(c.convo?.accountName, "casa grande");
    const u2 = c.ask("¿Y Casa?");
    assert.match(verdict(u2), /500/);
    assert.doesNotMatch(verdict(u2), /900/);
  });
  it("el camino inverso: «¿Y Casa Grande?» sobre el marco de Casa sirve la grande ($900)", () => {
    const c = new Convo(fixtureCuentas());
    c.ask("¿Cuánto tengo en Casa?");
    const v2 = c.ask("¿Y Casa Grande?");
    assert.match(verdict(v2), /900/);
  });
});

describe("ola33 · F2 — FRAME_PERIODS entra en la fuente única", () => {
  it("tras «la primera quincena» el marco guarda su frase y «¿Y la segunda quincena?» estrecha ($350)", () => {
    const c = new Convo(fixtureP33());
    const t1 = c.ask("¿Cuánto mandé la primera quincena?");
    assert.equal(family(t1), "remesas-periodo");
    assert.equal(total(t1), 10000);
    assert.equal(c.convo?.periodPhrase, "primera quincena");
    const t2 = c.ask("¿Y la segunda quincena?");
    assert.equal(total(t2), 35000);
    assert.match(note(t2), /cambié solo el período/);
  });
  it("control: «esta quincena» → «¿Y la quincena pasada?» sirve la mitad anterior ($100)", () => {
    const c = new Convo(fixtureP33());
    c.ask("¿Cuánto mandé esta quincena?");
    const u2 = c.ask("¿Y la quincena pasada?");
    assert.equal(total(u2), 10000);
  });
  it("«¿Y la primera quincena?» también estrecha desde un marco de semana ($100)", () => {
    const c = new Convo(fixtureP33());
    c.ask("¿Cuánto mandé esta semana?");
    const v2 = c.ask("¿Y la primera quincena?");
    assert.equal(total(v2), 10000);
  });
});

describe("ola33 · F3 — los modificadores de la quincena mueren en silencio honesto", () => {
  it("«la próxima quincena» no acusa a «proxima» y no sirve la quincena en curso disfrazada: muere en unknown", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto mandé la próxima quincena?");
    assert.equal(r.kind, "unknown");
    assert.ok(!accuses(r, "proxima"));
  });
  it("«la 1ra quincena» no acusa a «1ra» y muere en unknown", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto mandé la 1ra quincena?");
    assert.equal(r.kind, "unknown");
    assert.ok(!accuses(r, "1ra"));
  });
  it("«la quincena próxima» (modificador detrás) muere igual: unknown, sin acusación", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto mandé la quincena próxima?");
    assert.equal(r.kind, "unknown");
    assert.ok(!accuses(r, "proxima"));
  });
  it("control: «la última quincena» sigue sirviendo lo suyo (la recencia de la casa), sin acusar a «ultima»", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto mandé la última quincena?");
    assert.equal(family(r), "recencia");
    assert.ok(!accuses(r, "ultima"));
  });
  it("alcance: suelto, sin su cabeza, el modificador NO es vocabulario — la negativa nombra a «proxima»", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto le mandé a Proxima?");
    assert.ok(accuses(r, "proxima"));
  });
  it("alcance: con persona resuelta manda el 7b de siempre — «a Rosa la próxima quincena» sirve a Rosa sin acusar al modificador (su lectura de período es la especie de OBS-33-A2, no esta cura)", () => {
    const r = loose(fixtureP33(), "es", "¿Cuánto le mandé a Rosa la próxima quincena?");
    assert.equal(r.kind, "answer");
    assert.ok(!accuses(r, "proxima"));
  });
});

describe("ola33 · F4 — el eco compara la persona, no la cadena", () => {
  it("«¿Y Juan?» sobre el marco de Juan Pérez sirve sus $210 SIN nota de cambio", () => {
    const c = new Convo(fixtureJuan());
    c.ask("¿Cuánto le mandé a Juan Pérez?");
    const w2 = c.ask("¿Y Juan?");
    assert.equal(total(w2), 21000);
    assert.doesNotMatch(note(w2), /cambié solo la persona/);
  });
  it("el sentido inverso: «¿Y Juan Pérez?» sobre el marco de Juan sirve sus $210 SIN nota de cambio", () => {
    const c = new Convo(fixtureJuan());
    c.ask("¿Cuánto le mandé a Juan?");
    const w2 = c.ask("¿Y Juan Pérez?");
    assert.equal(total(w2), 21000);
    assert.doesNotMatch(note(w2), /cambié solo la persona/);
  });
  it("«¿Y la semana?» sobre el marco de «esta semana» sirve la misma semana ($250) SIN nota de cambio de período", () => {
    const c = new Convo(fixtureCadena());
    c.ask("¿Cuánto mandé esta semana?");
    const u2 = c.ask("¿Y la semana?");
    assert.equal(total(u2), 25000);
    assert.doesNotMatch(note(u2), /cambié solo el período/);
  });
  it("control: el cambio verdadero sigue trayendo su nota («¿Y Rosa?» sobre el marco de Juan Pérez)", () => {
    const c = new Convo(fixtureJuan());
    c.ask("¿Cuánto le mandé a Juan Pérez?");
    const w2 = c.ask("¿Y Rosa?");
    assert.equal(total(w2), 15000);
    assert.match(note(w2), /cambié solo la persona/);
  });
});

describe("ola33 · F5 — la puerta de la regla oye su nombre entero", () => {
  it("las grafías con signo abren la familia en español: «50/30/20», «50-30-20», «50·30·20» — también sin la palabra «regla» al lado", () => {
    for (const grafia of ["50/30/20", "50-30-20", "50·30·20"]) {
      const r = loose(guiaBook(), "es", `¿Estoy dentro de la regla ${grafia}?`);
      assert.equal(family(r), "regla", grafia);
      const r2 = loose(guiaBook(), "es", `¿Estoy dentro del ${grafia}?`);
      assert.equal(family(r2), "regla", `${grafia} sin «regla»`);
    }
  });
  it("EN: el numeral con signos y «rule» abren la familia", () => {
    for (const q of ["Am I within the 50/30/20 rule?", "Am I within the 50-30-20 rule?", "How am I doing against the rule?"]) {
      const r = loose(guiaBook(), "en", q);
      assert.equal(family(r), "regla", q);
    }
  });
  it("la robada vuelve a casa: \"How am I doing with the 50/30/20 rule?\" la sirve la familia regla, nombrándola", () => {
    const r = loose(guiaBook(), "en", "How am I doing with the 50/30/20 rule?");
    assert.equal(family(r), "regla");
    assert.match(verdict(r), /50·30·20 rule/);
  });
  it("controles: la forma con espacios y «should go to needs» siguen abriendo la puerta", () => {
    assert.equal(family(loose(guiaBook(), "es", "¿Estoy dentro de la regla 50 30 20?")), "regla");
    assert.equal(family(loose(guiaBook(), "en", "How much should go to needs?")), "regla");
  });
});

describe("ola33 · F8 — el folio pinta su fecha en el día local", () => {
  it("la tarjeta fecha el instante con el todayIso de la casa, no con el corte UTC", () => {
    const src = readFileSync(new URL("../../components/faro/passive-folios.tsx", import.meta.url), "utf8");
    assert.match(src, /dayLabel\(lang, folioDay\(r\.at\)\)/);
    assert.doesNotMatch(src, /dayLabel\(lang, r\.at\.slice/);
    assert.match(src, /todayIso\(d\)/);
  });
});
