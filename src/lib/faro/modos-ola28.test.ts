/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 28 — LA CURA (equipo amigo). Nueve familias:
 *
 *  F1 · LA RESOLUCIÓN DE PERSONAS, UNA SOLA LEY (Q28-1..Q28-5 +
 *       Q28-C2): frontera de palabra en el escaneo de nombres; la
 *       recencia inglesa con su puerta; el relleno no detiene la
 *       búsqueda tras «a»; la recencia sin envíos contradice como la
 *       suma; el nombre entero escrito manda sobre el alias de una
 *       palabra; el dativo inglés sin «to» resuelve o rehúsa nombrando.
 *       Ley de la familia: gana el encaje más largo/exacto; sin encaje,
 *       negativa nombrada; nunca degradación silenciosa a la global.
 *  F2 · LAS CANÓNICAS LLEGAN A SU FAMILIA (E28-1, E28-2, E28-4): el
 *       ancla del seguimiento tolera la «¿»; «¿Y en total?» gana su
 *       verbo (ensanchar); los huecos de fraseo y de concepto EN se
 *       cierran. LA CERCA ES EL BARRIDO MISMO: todas las canónicas del
 *       banco corren por el turno real contra un libro con sus datos,
 *       y cada una llega a su familia — o la excepción está escrita
 *       aquí con su razón.
 *  F3 · EL SILENCIO HONESTO DE IDENTIDAD, TAMBIÉN EN INGLÉS (E28-3):
 *       el parecido sin pago no lo reinterpreta ya-pague en ningún
 *       idioma.
 *  F4 · EL CIUDADANO MUERTO NO AFIRMA CERO (G28-1): la palabra
 *       aprendida de sub/categoría solo manda si el ciudadano vive en
 *       la estructura; si murió, el escaneo de nombres decide.
 *  F5 · LA PUERTA DE PATRONES, COMPLETADA (G28-2, G28-3, G28-4): el
 *       relleno no es aprendible en ninguna de las dos puertas; los
 *       contadores se juzgan en su dimensión (enteros, finitos, ≤ 10⁹);
 *       maskShape pliega los acentos como foldQ — el zombi «café»
 *       muere: o dispara o no entra.
 *  F6 · LA LLAVE DE FORMA ES SU IDENTIDAD DECLARADA (G28-5 + Q28-C1
 *       de Cara): noticeShapeKey pliega también los separadores de
 *       millar — cualquier agrupamiento cae en la misma llave — y no
 *       trunca; las reglas enseñadas con la llave vieja siguen
 *       silenciando (continuidad leída, nunca escrita).
 *  F7 · LA PUERTA DE noticeRules JUZGA ENTERA (G28-6): los cuatro
 *       campos; la regla toda vacía se rehúsa; `at` se juzga como
 *       fecha.
 *  F8 · LA PUERTA ISO JUZGA LA FECHA REAL (G28-7): ida y vuelta — el
 *       30 de febrero muere.
 *  F9 · EL DESCARTE FIRMA LO VIVO (Q28-C1 de Cambios): la firma del
 *       descarte de «Pagos que se acercan» se calcula desde
 *       dueAlerts(estado vivo, hoy) DENTRO de la receta del commit.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-28-G1, OBS-28-C1, OBS-27-G1,
 * F27-3, OBS-28-G2/G3/G4, H27-1, OBS-C8-1, A23-4. La jinete de
 * OBS-28-A3 («Where are my saved questions?») se cierra en la F2: es
 * la misma especie de puerta que Q27-C2 y su mapa ya existía.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { answerBankQuestion, answerFollowUp, bankChips, type AskFrame, type BankResult } from "./ask2";
import { aliasIn, aliasShapeOk, askPatternsOf, learnAlias, maskShape, type LearnedAlias } from "./asklearn";
import { dueAlerts, dueAlertsHidden, dueAlertsSig } from "./autopay";
import { putCard } from "./cards";
import { addLent } from "./debts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults";
import { foldQ } from "./lexicon";
import { interpretNotice, learnNoticeRule, noticeRulesOf, noticeShapeKey, type NoticeItem } from "./notices";
import { QUESTION_BANK } from "./questionbank";
import { blankSession, commit, type Session } from "./reducer";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind, NoticeRule, Wish } from "./types";

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
const ask = (ledger: LedgerState, lang: "es" | "en", raw: string, mode: Mode3 = "completo", learned: LearnedAlias[] = []): BankResult =>
  answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY, undefined, mode, learned);

/* ── EL LIBRO RICO DEL BARRIDO: cada familia encuentra SUS datos, en
 * el idioma del libro — como el libro de un usuario real. ─────────── */
function libroRico(lang: "es" | "en"): LedgerState {
  const es = lang === "es";
  let ledger = createInitial(lang, "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: es ? "Salario" : "Salary", amountMinor: 57041, bookedOn: "2026-10-05" }),
      line({ id: "negocio", kind: "income-variable" as LineKind, concept: es ? "Negocio propio" : "Side business", amountMinor: 39823, bookedOn: "2026-10-18" }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: es ? "Casa" : "Home", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "zap", kind: "purchase" as LineKind, concept: es ? "Zapatos" : "Shoes", amountMinor: 8000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-15" }),
      line({ id: "sup1", kind: "purchase" as LineKind, concept: es ? "Súper" : "Groceries", amountMinor: 12000, categoryId: "f-alimentos", storeId: "super", bookedOn: "2026-10-03" }),
      line({ id: "sup2", kind: "purchase" as LineKind, concept: es ? "Súper" : "Groceries", amountMinor: 9000, categoryId: "f-alimentos", storeId: "super", bookedOn: "2026-10-10" }),
      line({ id: "sup3", kind: "purchase" as LineKind, concept: es ? "Súper" : "Groceries", amountMinor: 11000, categoryId: "f-alimentos", storeId: "super", bookedOn: "2026-10-17" }),
      line({ id: "ff1", kind: "purchase" as LineKind, concept: es ? "Comida rápida" : "Fast food", amountMinor: 2500, categoryId: "f-alimentos", bookedOn: "2026-10-08" }),
      line({ id: "ff2", kind: "purchase" as LineKind, concept: es ? "Comida rápida" : "Fast food", amountMinor: 3500, categoryId: "f-alimentos", bookedOn: "2026-10-19" }),
      line({ id: "comida1", kind: "purchase" as LineKind, concept: es ? "Comida" : "Food", amountMinor: 20000, categoryId: "f-alimentos", bookedOn: "2026-10-11" }),
      line({ id: "trans", kind: "expense-variable" as LineKind, concept: es ? "Transporte" : "Transport", amountMinor: 4000, categoryId: "v-transporte", bookedOn: "2026-10-09" }),
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: es ? "Remesa" : "Remittance", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: es ? "Salario" : "Salary", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
      line({ id: "camisa", kind: "purchase" as LineKind, concept: es ? "Camisa" : "Shirt", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      line({ id: "sup0", kind: "purchase" as LineKind, concept: es ? "Súper" : "Groceries", amountMinor: 10000, categoryId: "f-alimentos", storeId: "super", bookedOn: "2026-09-14", monthKey: PREV }),
      line({ id: "remesa0", kind: "expense-fixed" as LineKind, concept: es ? "Remesa" : "Remittance", amountMinor: 15000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-09-10", monthKey: PREV, to: "mama" }),
    ],
  };
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLent(ledger, { id: "lent2", person: "Ana", kind: "plain", amountMinor: 10000, currency: "USD", aprBps: 0, startedOn: "2026-09-02", dueOn: "2026-12-01", note: "" });
  ledger.remitPeople = [{ id: "mama", name: es ? "Mamá" : "Mom" }];
  ledger = putCard(ledger, { id: "card-1", name: es ? "Tarjeta Azul" : "Blue Card", issuer: "Banco", mark: "", color: "", last4: "1234", currency: "USD", limitMinor: 100000, dueDay: 28, aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: "2026-10-15", at: "2026-10-15T10:00:00.000Z", balanceMinor: 45000, src: "manual" }] });
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

/* ═══ F2 · EL BARRIDO — la cerca es el barrido mismo ═══════════════ */
describe("ola28 · F2 el barrido: toda canónica llega a su familia", () => {
  /* LLEGAR, definido una vez: la familia se compromete con su nombre
   * — responde, o pide su monto (need-amount), o pregunta de vuelta
   * (ask-back) — pero jamás el silencio de unknown ni la respuesta de
   * otra familia. El puente llega con su puerta (la respuesta es de
   * otra familia y la puerta ES su entrega). La compuesta llega con
   * sus dos patas: las dos respondidas (piezas de las dos) o la
   * perdida NOMBRADA en la nota — su contrato declarado. */
  const llega = (fam: string, r: BankResult): boolean => {
    if (fam === "puente") return r.kind === "answer" && (r.actions?.length ?? 0) > 0;
    if (fam === "compuesta") return r.kind === "answer" && (r.pieces.length >= 2 || (r.note ?? "").length > 0);
    return r.kind !== "unknown" && r.family === fam;
  };
  /* LAS EXCEPCIONES ESCRITAS — cada una con su razón y con la familia
   * que HOY responde (o el silencio que hoy guarda): si una cura
   * futura la cierra, esta cerca se pone roja y la excepción se
   * borra. Ninguna es un hueco de fraseo de la Ola 28: son diseños
   * asentados de olas anteriores o huecos de capacidad nombrados. */
  const EXCEPCIONES = new Map<string, { familia: string; razon: string }>([
    ["ahorros|es|¿Cuánto llevo en mi meta?", { familia: "historia", razon: "el progreso contra la meta del deseo no lo mide ningún motor del banco hoy — hueco de CAPACIDAD, no de fraseo: historia responde con la cifra del mes y la excepción lo nombra en vez de fingir la llegada" }],
    ["ranking|es|¿En qué gasto más?", { familia: "relator", razon: "no nombra ciudadano: el ranking ordena personas, cuentas y tarjetas y no tiene rama de categorías; el relator responde con la misma sustancia (la categoría mayor del período, con sus piezas)" }],
    ["futuro|es|¿Cuánto tendré apartado en diciembre?", { familia: "ahorros", razon: "diseño asentado de la Ola 12 (CAZA-TIEMPO clase 4): la proyección del apartado a un mes nombrado la calcula la guarda de horizonte de ahorros con el supuesto dicho — no es el presente disfrazado de futuro" }],
    ["futuro|es|¿Cuánto me quedará el año que viene?", { familia: "left", razon: "la queda a horizonte la sirve el delegado heredado (left) con su propia lectura; la familia futuro del banco guarda el fin de las deudas, y su canónica de deudas sí llega" }],
    ["futuro|en|How much will I have set aside by December?", { familia: "ahorros", razon: "la gemela inglesa de la proyección de la Ola 12: la guarda de horizonte de ahorros la calcula como futuro, con el supuesto dicho" }],
    ["precio-tiempo|en|How many days of work does that cost?", { familia: "—", razon: "deíctico sin antecedente («that»): el turno sin estado no guarda el monto de la respuesta anterior y la familia no inventa uno; con monto o con nombre sirve — el espécimen positivo vive abajo" }],
  ]);
  for (const lang of ["es", "en"] as const) {
    const ledger = libroRico(lang);
    for (const f of QUESTION_BANK) {
      if (f.id === "seguimiento") continue; // su sección propia: vive del marco
      it(`${f.id} [${lang}] · sus canónicas llegan (estado ${f.status})`, () => {
        for (const q of f.canonical[lang]) {
          // Las canónicas de aprendizaje con su escenario cosido
          // («(tras confirmar que…)») no son preguntas: son la
          // descripción del escenario, y se conducen desnudas y con
          // su patrón enhebrado en su sección propia, abajo.
          if (q.includes("(tras confirmar")) continue;
          const r = ask(ledger, lang, q);
          if (f.status === "declarada") {
            assert.equal(r.kind, "unknown", `«${q}» — la familia declarada calla: ${r.kind === "answer" ? r.verdict : r.kind}`);
          } else {
            const exc = EXCEPCIONES.get(`${f.id}|${lang}|${q}`);
            if (exc) {
              if (exc.familia === "—") assert.equal(r.kind, "unknown", `la excepción escrita sigue viva («${q}»): ${exc.razon}`);
              else assert.ok(r.kind === "answer" && r.family === exc.familia, `la excepción escrita sigue viva («${q}» → ${exc.familia}): ${exc.razon}`);
            }
            else assert.ok(llega(f.id, r), `«${q}» debe llegar a ${f.id}: llegó ${r.kind}${r.kind !== "unknown" ? "/" + r.family : ""}`);
          }
        }
      });
    }
  }

  it("precio-tiempo · con monto o con nombre, la familia sirve (la otra mitad de la excepción)", () => {
    const en = libroRico("en");
    const r = ask(en, "en", "How many days of work does a $90 pair of shoes cost?");
    assert.ok(r.kind === "answer" && r.family === "precio-tiempo", `con monto sirve: ${r.kind}`);
    const es = libroRico("es");
    const r2 = ask(es, "es", "¿Cuántos días de trabajo me cuestan los zapatos de 80 dólares?");
    assert.ok(r2.kind === "answer" && r2.family === "precio-tiempo", `con nombre y monto sirve: ${r2.kind}`);
  });

  it("aprendizaje · las canónicas de escenario, desnudas y con su patrón enhebrado", () => {
    // «¿Cuánto gasté en la luz?» con «la luz» confirmado como los
    // servicios de la casa: la palabra aprendida filtra la historia.
    const es = libroRico("es");
    const storeLuz = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    const r = ask(es, "es", "¿Cuánto gasté en la luz?", "completo", storeLuz);
    assert.ok(r.kind === "answer" && r.family === "historia", `la luz filtra la historia: ${r.kind}`);
    if (r.kind === "answer") assert.equal(r.pieces[0]?.minor, 2457, "el total es el de los servicios, no el del mes");
    // «¿Cuánto le mandé a mami?» con «mami» confirmado como Mamá.
    const storeMami = learnAlias([], "mami", "mama", "person", "card-tap");
    const r2 = ask(libroRemesasA(), "es", "¿Cuánto le mandé a mami?", "completo", storeMami);
    assert.ok(r2.kind === "answer" && r2.family === "remesas", `mami resuelve a Mamá: ${r2.kind}`);
    if (r2.kind === "answer") assert.equal(r2.pieces[0]?.minor, 62000, "la suma viva de Mamá (octubre + septiembre)");
  });

  it("seguimiento · las cinco canónicas por su camino real (marco de historia)", () => {
    const ledger = libroRico("es");
    const names = makeNamer(ledger.structure, "es");
    const seed = ask(ledger, "es", "¿Cuánto gasté este mes?");
    assert.equal(seed.kind, "answer");
    if (seed.kind !== "answer") return;
    const frame: AskFrame | null = seed.frame ?? null;
    assert.ok(frame, "la semilla de historia deja marco");
    const turno = (q: string, lang: "es" | "en"): BankResult => {
      const fu = answerFollowUp(ledger, KEY, lang, makeNamer(ledger.structure, lang), q, ctx(ledger, lang), TODAY, frame, "completo", []);
      return fu ?? ask(ledger, lang, q);
    };
    void names;
    // E28-1a: la «¿» inicial ya no mata el desplazamiento.
    const shift = turno("¿Y el mes pasado?", "es");
    assert.ok(shift.kind === "answer" && shift.family === "historia", `«¿Y el mes pasado?» desplaza: ${shift.kind}`);
    if (shift.kind === "answer") {
      assert.match(shift.verdict, /mes pasado/);
      assert.equal(shift.pieces[0]?.minor, 30000, "el total desplazado es el del mes pasado ($300: camisa + súper + remesa)");
    }
    // E28-1b: «¿Y en total?» ensancha — el total sin filtro del período.
    const wide = turno("¿Y en total?", "es");
    assert.ok(wide.kind === "answer" && wide.family === "historia", `«¿Y en total?» ensancha: ${wide.kind}`);
    if (wide.kind === "answer" && frame?.kind === "period1") assert.equal(wide.pieces[0]?.minor, frame.total, "el ensanche da el total entero del marco");
    // La tercera canónica ES sigue llegando (estrechar).
    const narrow = turno("¿Y en tiendas?", "es");
    assert.ok(narrow.kind === "answer" && narrow.family === "historia", `«¿Y en tiendas?» estrecha: ${narrow.kind}`);
    // Las EN por el mismo camino.
    const shiftEn = turno("And last month?", "en");
    assert.ok(shiftEn.kind === "answer" && shiftEn.family === "historia", `"And last month?" desplaza: ${shiftEn.kind}`);
    const narrowEn = turno("And in stores?", "en");
    assert.ok(narrowEn.kind === "answer" && narrowEn.family === "historia", `"And in stores?" estrecha: ${narrowEn.kind}`);
  });

  it("puente · la canónica sin costura: el patrón de remesas llega con su puerta", () => {
    const ledger = libroRico("es");
    const fam = QUESTION_BANK.find((f) => f.id === "puente");
    const q = fam?.canonical.es[0] ?? "";
    assert.ok(!/\(y su puerta/.test(q), "la canónica ya no cose su anotación: la puerta vive en la respuesta");
    const r = ask(ledger, "es", q);
    assert.ok(r.kind === "answer" && (r.actions?.length ?? 0) > 0, `«${q}» llega con puerta: ${r.kind}`);
  });

  it("OBS-28-A3 (jinete) · «Where are my saved questions?» llega al mapa", () => {
    const ledger = libroRico("en");
    const r = ask(ledger, "en", "Where are my saved questions?");
    assert.ok(r.kind === "answer" && r.family === "faro-mismo", `llega a faro-mismo: ${r.kind}${r.kind === "answer" ? "/" + r.family : ""}`);
  });
});

/* ═══ F3 · identidad calla también en inglés ═══════════════════════ */
describe("ola28 · F3 el silencio honesto de identidad (E28-3)", () => {
  it("EN · «Have I paid something like this before?» no la reinterpreta ya-pague", () => {
    const r = ask(libroRico("en"), "en", "Have I paid something like this before?");
    assert.equal(r.kind, "unknown", `identidad declarada calla: ${r.kind === "answer" ? r.family + " — " + r.verdict : r.kind}`);
  });
  it("ES · la variante con «ya pagué» y parecido tampoco entra en ya-pague", () => {
    const r = ask(libroRico("es"), "es", "¿Ya pagué algo parecido antes?");
    assert.equal(r.kind, "unknown", `el parecido sin pago calla en los dos idiomas: ${r.kind === "answer" ? r.family : r.kind}`);
  });
  it("control · el pago verdadero sigue siendo de ya-pague", () => {
    const r = ask(libroRico("es"), "es", "¿Ya pagué el internet?");
    assert.ok(r.kind === "answer" && r.family === "ya-pague", `el pago nombrado se juzga: ${r.kind}`);
    const en = ask(libroRico("en"), "en", "Have I paid the internet?");
    assert.ok(en.kind === "answer" && en.family === "ya-pague", `EN control: ${en.kind}`);
  });
});

/* ── LOS LIBROS DE REMESAS DE LA FAMILIA 1 (los de la caza) ──────── */
function remitLine(id: string, monthKey: string, amountMinor: number, to: string, day: string): Line {
  return line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });
}
function libroRemesasA(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [{ id: "mama", name: "Mamá" }, { id: "primo", name: "Primo" }, { id: "tia", name: "Tía" }];
  ledger.months[KEY] = { lines: [remitLine("r-mama-oct", KEY, 32000, "mama", "12"), remitLine("r-primo-oct", KEY, 5000, "primo", "20")] };
  ledger.months[PREV] = { lines: [remitLine("r-mama-sep", PREV, 30000, "mama", "12")] };
  ledger.settings.display = "USD";
  return ledger;
}
function libroRemesasB(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [{ id: "ana", name: "Ana" }, { id: "primo", name: "Primo" }];
  ledger.months[KEY] = { lines: [remitLine("r-ana", KEY, 7500, "ana", "15"), remitLine("r-primo", KEY, 5000, "primo", "20")] };
  ledger.settings.display = "USD";
  return ledger;
}
function libroMarias(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = [{ id: "mj", name: "María José" }, { id: "mf", name: "María Fernanda" }];
  ledger.months[KEY] = { lines: [remitLine("r-mj", KEY, 10000, "mj", "05"), remitLine("r-mf", KEY, 20000, "mf", "06")] };
  ledger.settings.display = "USD";
  return ledger;
}

/* ═══ F1 · LA RESOLUCIÓN DE PERSONAS, UNA SOLA LEY ═════════════════ */
describe("ola28 · F1 la resolución de personas (Q28-1..Q28-5 + Q28-C2)", () => {
  it("Q28-1 · «semana» no es Ana: la pregunta global no recibe la suma de una persona", () => {
    const r = ask(libroRemesasB(), "es", "¿Cuánto mandé en remesas la semana pasada?");
    // OLA 30 (Familia 2, Q30-2) — ENMIENDA CON SU RAZÓN: la pregunta ES
    // una suma de remesas con período («la semana pasada»), y la
    // familia remesas-periodo que nace en la Cura 30 la sirve como tal
    // — antes la servía el patrón con el agregado de siempre. El
    // propósito de la cerca no se mueve: la cifra es la del PERÍODO y
    // no se viste con el nombre de Ana (abajo), y la pregunta por Ana
    // sigue dando SU suma (el control, intacto).
    assert.ok(r.kind === "answer" && r.family === "remesas-periodo", `sirve el período, no la persona: ${r.kind}${r.kind !== "unknown" ? "/" + r.family : ""}`);
    if (r.kind === "answer") assert.ok(!/A Ana le has mandado/.test(r.verdict), "el veredicto no viste la cifra global con el nombre de Ana");
    const control = ask(libroRemesasB(), "es", "¿Cuánto le mandé a Ana?");
    assert.ok(control.kind === "answer" && control.pieces[0]?.minor === 7500, "la pregunta por Ana sí da su suma ($75)");
  });

  it("Q28-2 · la recencia inglesa tiene puerta: la persona manda y la inventada se rehúsa nombrada", () => {
    const en = createInitial("en", "oscuro");
    en.remitPeople = [{ id: "mama", name: "Mom" }, { id: "primo", name: "Primo" }];
    en.months[KEY] = { lines: [remitLine("r-mom", KEY, 32000, "mama", "12"), remitLine("r-primo", KEY, 5000, "primo", "20")] };
    en.settings.display = "USD";
    const last = ask(en, "en", "When was the last remittance to Mom?");
    assert.ok(last.kind === "answer" && last.family === "recencia" && last.pieces[0]?.minor === 32000, `la última de Mom: ${last.kind}`);
    const amount = ask(en, "en", "What was the last amount I sent to Mom?");
    assert.ok(amount.kind === "answer" && amount.family === "recencia" && amount.pieces[0]?.minor === 32000, `el último monto a Mom: ${amount.kind}`);
    const invented = ask(en, "en", "When was the last remittance to Rosa?");
    assert.ok(invented.kind === "answer" && invented.family === "recencia" && /don't know who "rosa"/.test(invented.verdict), `la inventada se rehúsa nombrada en inglés: ${invented.kind === "answer" ? invented.verdict.slice(0, 60) : invented.kind}`);
  });

  it("Q28-3 · el relleno no detiene la búsqueda: «a la señora Pérez» nombra a Pérez", () => {
    const r = ask(libroRemesasA(), "es", "¿Cuándo fue la última remesa a la señora Pérez?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && /No sé quién es «perez»/.test(r.verdict), `la negativa nombra a Pérez tras el relleno: ${r.kind === "answer" ? r.verdict.slice(0, 60) : r.kind}`);
    // Y si Pérez SÍ es persona del libro, la misma pregunta la resuelve.
    const con = libroRemesasA();
    con.remitPeople = [...(con.remitPeople ?? []), { id: "perez", name: "Pérez" }];
    con.months[KEY] = { lines: [...con.months[KEY].lines, remitLine("r-perez", KEY, 21000, "perez", "18")] };
    const ok = ask(con, "es", "¿Cuándo fue la última remesa a la señora Pérez?");
    assert.ok(ok.kind === "answer" && ok.family === "recencia" && ok.pieces[0]?.minor === 21000, `con Pérez en el libro, resuelve: ${ok.kind}`);
    // El demostrativo con su nombre se nombra como frase, no como «esa».
    const dem = ask(libroRemesasA(), "es", "¿Cuándo fue la última remesa a esa persona?");
    assert.ok(dem.kind === "answer" && /«esa persona»/.test(dem.verdict), `la negativa nombra la frase: ${dem.kind === "answer" ? dem.verdict.slice(0, 60) : dem.kind}`);
  });

  it("Q28-4 · la recencia de la persona sin envíos da la contradicción declarada, como la suma", () => {
    const r = ask(libroRemesasA(), "es", "¿Cuándo fue la última remesa a Tía?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && /No hay envíos a Tía anotados/.test(r.verdict), `la contradicción, no el silencio: ${r.kind}`);
    const suma = ask(libroRemesasA(), "es", "¿Cuánto le mandé a Tía?");
    assert.ok(suma.kind === "answer" && /No hay envíos a Tía anotados/.test(suma.verdict), "la suma sigue diciendo lo mismo (control sostenido)");
  });

  it("Q28-5 · el nombre entero escrito manda sobre el alias de una palabra", () => {
    const store = learnAlias([], "maria", "mj", "person", "card-tap");
    const r = ask(libroMarias(), "es", "¿Cuánto le mandé a María Fernanda?", "completo", store);
    assert.ok(r.kind === "answer" && r.pieces[0]?.minor === 20000 && /María Fernanda/.test(r.verdict), `el nombre entero manda ($200 a MF): ${r.kind === "answer" ? r.verdict.slice(0, 60) : r.kind}`);
    const alias = ask(libroMarias(), "es", "¿Cuánto le mandé a María?", "completo", store);
    assert.ok(alias.kind === "answer" && alias.pieces[0]?.minor === 10000, "la palabra sola sí va al alias (MJ, $100): la ley es el largo del encaje");
  });

  it("Q28-C2 · el dativo inglés sin «to» resuelve o rehúsa nombrando", () => {
    const en = createInitial("en", "oscuro");
    en.remitPeople = [{ id: "mama", name: "Mom" }];
    en.months[KEY] = { lines: [remitLine("r-mom", KEY, 32000, "mama", "12")] };
    en.settings.display = "USD";
    const r = ask(en, "en", "How much did I send Rigoberto?");
    assert.ok(r.kind === "answer" && /don't know who "rigoberto"/.test(r.verdict), `rehúsa nombrando: ${r.kind === "answer" ? r.verdict.slice(0, 60) : r.kind}`);
    const con = createInitial("en", "oscuro");
    con.remitPeople = [{ id: "rigo", name: "Rigoberto" }];
    con.months[KEY] = { lines: [remitLine("r-rigo", KEY, 11000, "rigo", "09")] };
    con.settings.display = "USD";
    const ok = ask(con, "en", "How much did I send Rigoberto?");
    assert.ok(ok.kind === "answer" && ok.family === "remesas" && ok.pieces[0]?.minor === 11000, `con Rigoberto en el libro, resuelve: ${ok.kind}`);
  });

  it("controles sostenidos · el alias confirmado vence al ciudadano homónimo; la inventada se rehúsa", () => {
    // El espécimen sostenido de la Ola 28 (§1.1/§1.15): «primo» como
    // alias de Mamá vence al ciudadano Primo a igual largo.
    const store = learnAlias([], "primo", "mama", "person", "correction");
    const r = ask(libroRemesasA(), "es", "¿Cuándo fue la última remesa a primo?", "completo", store);
    assert.ok(r.kind === "answer" && r.family === "recencia" && r.pieces[0]?.minor === 32000 && /a Mamá/.test(r.verdict), `el alias manda: ${r.kind === "answer" ? r.verdict.slice(0, 60) : r.kind}`);
    const invented = ask(libroRemesasA(), "es", "¿Cuánto le mandé a Rosalía?");
    assert.ok(invented.kind === "answer" && /No sé quién es «rosalia»/.test(invented.verdict), "la inventada en español se rehúsa nombrada (control de la Ola 27)");
  });

  it("E28-4 · el chip «When did I last get paid?» llega a la recencia", () => {
    assert.ok(bankChips("en").includes("When did I last get paid?"), "el chip es el del banco");
    const r = ask(libroRico("en"), "en", "When did I last get paid?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && r.pieces[0]?.minor === 39823, `el chip llega (último ingreso: el negocio del 18): ${r.kind}`);
  });
});

/* ═══ F4 · EL CIUDADANO MUERTO NO AFIRMA CERO ══════════════════════ */
describe("ola28 · F4 el ciudadano muerto no afirma cero (G28-1)", () => {
  const libroServicios = (muerto: boolean): LedgerState => {
    const ledger = createInitial("es", "oscuro");
    if (muerto) {
      const casa = ledger.structure.categories.find((c) => c.id === "f-casa");
      if (casa) casa.subs = casa.subs.filter((s) => s.id !== "f.casa.servicios");
    }
    ledger.months[KEY] = {
      lines: [
        // El dinero DEL ciudadano aprendido (bajo su subcategoría):
        line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 7000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-06" }),
        // El dinero que el ESCANEO encuentra por el concepto, bajo
        // otra subcategoría viva — el $120 de G28-1:
        line({ id: "serv", kind: "expense-fixed" as LineKind, concept: "Servicios", amountMinor: 12000, categoryId: "f-casa", subId: "f.casa.internet", bookedOn: "2026-10-06" }),
      ],
    };
    ledger.settings.display = "USD";
    return ledger;
  };
  const store = () => learnAlias([], "servicios", "f.casa.servicios", "sub", "card-tap");

  it("con el ciudadano vivo, la palabra aprendida filtra (control)", () => {
    const r = ask(libroServicios(false), "es", "¿Cuánto gasté en servicios?", "completo", store());
    assert.ok(r.kind === "answer" && r.family === "historia" && r.pieces[0]?.minor === 7000, `vivo: la palabra aprendida manda y da el dinero de su ciudadano ($70): ${r.kind}`);
  });

  it("con el ciudadano muerto, la palabra cae al escaneo de nombres y no afirma cero", () => {
    const r = ask(libroServicios(true), "es", "¿Cuánto gasté en servicios?", "completo", store());
    assert.ok(r.kind === "answer" && r.family === "historia" && r.pieces[0]?.minor === 12000, `muerto: el concepto vivo responde $120, no $0.00: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });

  it("el estrechamiento del seguimiento tampoco afirma el cero del muerto", () => {
    const ledger = libroServicios(true);
    const names = makeNamer(ledger.structure, "es");
    const seed = ask(ledger, "es", "¿Cuánto gasté este mes?");
    assert.ok(seed.kind === "answer" && !!seed.frame, "la semilla deja marco");
    if (seed.kind !== "answer" || !seed.frame) return;
    const fu = answerFollowUp(ledger, KEY, "es", names, "¿Y en servicios?", ctx(ledger, "es"), TODAY, seed.frame, "completo", store());
    const composed = fu ?? ask(ledger, "es", "¿Y en servicios?", "completo", store());
    assert.ok(!(composed.kind === "answer" && composed.pieces[0]?.minor === 0), `el marco no se estrecha al cero del ciudadano muerto: ${composed.kind}`);
  });
});

/* ═══ F5 · LA PUERTA DE PATRONES, COMPLETADA ═══════════════════════ */
describe("ola28 · F5 la puerta de patrones (G28-2, G28-3, G28-4)", () => {
  const base = { word: "luz", targetId: "f.casa.servicios", kind: "sub" as const, hits: 1, learnedFrom: "card-tap" as const };

  it("G28-2 · el relleno puro no se aprende en ninguna de las dos puertas", () => {
    assert.equal(learnAlias([], "la", "f-casa", "cat", "card-tap").length, 0, "el escritor rehúsa «la»");
    assert.equal(learnAlias([], "de la", "f-casa", "cat", "card-tap").length, 0, "el escritor rehúsa «de la»");
    assert.equal(aliasShapeOk({ ...base, word: "la" }), false, "el juez rehúsa «la»");
    assert.equal(aliasShapeOk({ ...base, word: "the" }), false, "el juez rehúsa «the»");
    assert.equal(learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap").length, 1, "la frase con sustancia sí se aprende");
    assert.equal(aliasShapeOk(base), true, "la palabra con sustancia pasa");
    const dirty = { askPatterns: [{ ...base, word: "la" }, base] } as unknown as LedgerState;
    assert.deepEqual(askPatternsOf(dirty).map((a) => a.word), ["luz"], "el lector descarta el relleno y conserva la sustancia");
  });

  it("G28-3 · los contadores se juzgan en su dimensión: enteros, finitos, con techo", () => {
    assert.equal(aliasShapeOk({ ...base, hits: 1e21 }), false, "1e21 no es un conteo");
    assert.equal(aliasShapeOk({ ...base, uses: 1e21 }), false, "1e21 usos no es un conteo");
    assert.equal(aliasShapeOk({ ...base, hits: 2.5 }), false, "un conteo no es fraccionario");
    assert.equal(aliasShapeOk({ ...base, hits: -1 }), false, "un conteo no es negativo");
    assert.equal(aliasShapeOk({ ...base, hits: Number.NaN }), false, "NaN no es un conteo");
    assert.equal(aliasShapeOk({ ...base, hits: 1_000_000_000, uses: 999_999_999 }), true, "el techo mismo es un conteo cuerdo");
    assert.equal(aliasShapeOk({ ...base, hits: 1_000_000_001 }), false, "sobre el techo ya no es un conteo de una persona");
  });

  it("G28-4 · maskShape pliega los acentos: «café» se acuña «cafe» y DISPARA", () => {
    assert.equal(maskShape("¿Cuánto gasté en café?"), maskShape("¿Cuánto gasté en cafe?"), "la forma es la misma con y sin acento");
    assert.ok(!/[áéíóúüñ]/.test(maskShape("¿Cuánto gasté en café?")), "la forma no guarda acentos");
    const store = learnAlias([], "café", "f-hormiga", "cat", "correction");
    assert.equal(store[0]?.word, "cafe", "la palabra se acuña plegada");
    const hit = aliasIn(store, foldQ("¿Cuánto gasté en café?"));
    assert.ok(hit && hit.targetId === "f-hormiga", "el patrón dispara en la pregunta plegada: no es un zombi");
    assert.equal(aliasShapeOk({ ...base, word: "café" }), false, "la palabra guardada con acento ya no pasa la puerta: o dispara o no entra");
  });
});

/* ═══ F6 · LA LLAVE DE FORMA ES SU IDENTIDAD DECLARADA ═════════════ */
describe("ola28 · F6 la llave de forma (G28-5 + Q28-C1 de Cara)", () => {
  const item = (text: string): NoticeItem => ({ id: "n1", pkg: "com.samsung.android.spay", title: "Samsung Wallet", text, at: "2026-10-22T10:00:00.000Z" });
  const ctxN = (ledger: LedgerState): ParseCtx => ({ ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "d1", now: `${TODAY}T12:00:00.000Z` });

  it("cualquier agrupamiento cae en la misma llave: 1,200 ≡ 999 ≡ 1.200,50", () => {
    const a = noticeShapeKey(item("Compra aprobada por C$1,200 en Pali"));
    const b = noticeShapeKey(item("Compra aprobada por C$999 en Pali"));
    const c = noticeShapeKey(item("Compra aprobada por C$1.200,50 en Pali"));
    assert.equal(a, b, "el monto agrupado y el llano son la misma forma");
    assert.equal(a, c, "el agrupamiento europeo también");
  });

  it("la llave no trunca: dos avisos que difieren tras el carácter 90 no comparten llave", () => {
    const long = "Compra aprobada por C$500 en " + "una tienda con un nombre larguisimo de verdad ";
    const a = noticeShapeKey(item(long + "Pali"));
    const b = noticeShapeKey(item(long + "Rosti"));
    assert.notEqual(a, b, "la diferencia tardía no colisiona: silenciar uno no silencia al otro");
  });

  it("la regla enseñada con un monto silencia al hermano con otro monto", () => {
    let ledger = createInitial("es", "oscuro");
    ledger.settings.display = "USD";
    const taught = item("Compra aprobada por C$1,200 en Pali");
    assert.ok(interpretNotice(taught, ctxN(ledger)), "antes de enseñar, el aviso produce su borrador");
    ledger = learnNoticeRule(ledger, taught, "2026-10-22T10:05:00.000Z");
    assert.equal(interpretNotice(item("Compra aprobada por C$999 en Pali"), ctxN(ledger)), null, "enseñada a C$1,200, la forma silencia a C$999");
    assert.ok(interpretNotice(item("Compra aprobada por C$999 en Rosti"), ctxN(ledger)), "otra forma sigue produciendo su borrador");
  });

  it("continuidad: la regla enseñada con la LLAVE VIEJA sigue silenciando", () => {
    const foldOld = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); // la clase es U+0300–U+036F, como el fold de notices.ts
    const legacyKey = (it: NoticeItem) => `${it.pkg}|${foldOld(`${it.title} ${it.text}`).replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 90)}`;
    let ledger = createInitial("es", "oscuro");
    ledger.settings.display = "USD";
    const taught = item("Compra aprobada por C$1,200 en Pali");
    ledger = { ...ledger, noticeRules: [{ key: legacyKey(taught), app: "Samsung Wallet", label: "Compra en Pali", at: "2026-10-20T10:00:00.000Z" }] };
    assert.equal(interpretNotice(item("Compra aprobada por C$1,200 en Pali"), ctxN(ledger)), null, "lo enseñado antes de la cura no se desenseña: la llave vieja se honra al leer");
  });
});

/* ═══ F7 · LA PUERTA DE noticeRules JUZGA ENTERA ═══════════════════ */
describe("ola28 · F7 la puerta de noticeRules juzga entera (G28-6)", () => {
  const valid: NoticeRule = { key: "pkg|forma #", app: "Samsung Wallet", label: "Compra en Pali", at: "2026-10-20T10:00:00.000Z" };
  const book = (rules: unknown): LedgerState => {
    const ledger = createInitial("es", "oscuro");
    (ledger as unknown as Record<string, unknown>).noticeRules = rules;
    return ledger;
  };

  it("el lector conserva la regla entera y descarta la vacía, la de `at` imposible y la incompleta", () => {
    const rules = noticeRulesOf(book([
      valid,
      { key: "", app: "", label: "", at: "" },
      { key: "pkg|otra", app: "Samsung Wallet", label: "Otra", at: "ayer" },
      { key: "pkg|otra", app: "Samsung Wallet", label: "Otra", at: "" },
      { key: "pkg|otra", app: "", label: "Otra", at: "2026-10-20T10:00:00.000Z" },
    ]));
    assert.deepEqual(rules.map((r) => r.key), [valid.key], "solo la regla entera vive");
  });

  it("la puerta del libro juzga lo mismo que el lector", () => {
    assert.equal(isLedgerDeep(book([valid])), true, "la regla entera pasa la puerta");
    assert.equal(isLedgerDeep(book([{ key: "", app: "", label: "", at: "" }])), false, "la regla toda vacía muere en la puerta");
    assert.equal(isLedgerDeep(book([{ ...valid, at: "ayer" }])), false, "el `at` que no es fecha muere en la puerta");
    assert.equal(isLedgerDeep(book([{ ...valid, app: "" }])), false, "la regla sin app muere en la puerta");
  });
});

/* ═══ F8 · LA PUERTA ISO JUZGA LA FECHA REAL ═══════════════════════ */
describe("ola28 · F8 la puerta ISO juzga la fecha real (G28-7)", () => {
  const wishOk = (partial: Partial<Wish> & Pick<Wish, "id">): Wish => ({
    concept: "Zapatos", amountMinor: 12000, currency: "USD", store: "Tienda",
    createdAt: "2026-11-01T12:00:00.000Z", waitHours: 48,
    dueAt: "2026-11-03T12:00:00.000Z", askedAt: "", renewals: 0,
    permanent: false, status: "waiting", closedAt: "",
    ...partial,
  });
  const book = (w: Wish): LedgerState => {
    const ledger = createInitial("es", "oscuro");
    ledger.months = {};
    (ledger as unknown as Record<string, unknown>).wishes = [w];
    return ledger;
  };

  it("el 30 de febrero muere en las tres fechas del deseo; la fecha real pasa", () => {
    assert.equal(isLedgerDeep(book(wishOk({ id: "w1" }))), true, "la fecha verdadera pasa (control)");
    assert.equal(isLedgerDeep(book(wishOk({ id: "w2", dueAt: "2026-02-30T12:00:00.000Z" }))), false, "dueAt 30 de febrero: muere");
    assert.equal(isLedgerDeep(book(wishOk({ id: "w3", createdAt: "2026-02-30T12:00:00.000Z" }))), false, "createdAt 30 de febrero: muere");
    assert.equal(isLedgerDeep(book(wishOk({ id: "w4", closedAt: "2026-02-30T12:00:00.000Z", status: "bought" }))), false, "closedAt 30 de febrero: muere");
    assert.equal(isLedgerDeep(book(wishOk({ id: "w5", dueAt: "2025-02-29T12:00:00.000Z" }))), false, "el 29 de febrero no bisiesto muere");
    assert.equal(isLedgerDeep(book(wishOk({ id: "w6", dueAt: "2024-02-29T12:00:00.000Z" }))), true, "el 29 bisiesto pasa entero");
  });
});

/* ═══ F9 · EL DESCARTE FIRMA LO VIVO ═══════════════════════════════ */
describe("ola28 · F9 el descarte firma lo vivo (Q28-C1 de Cambios)", () => {
  const dueBook = (dues: Array<[string, string]>): LedgerState => {
    const ledger = createInitial("es", "oscuro");
    ledger.months = {
      "2026-11": {
        lines: dues.map(([id, on]) => line({
          id, kind: "subscription" as LineKind, concept: `Cuota ${id}`, amountMinor: 5000,
          categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: on, monthKey: "2026-11", bookedOn: "2026-11-01",
        })),
      },
    };
    ledger.settings.display = "USD";
    return ledger;
  };
  const HOY9 = "2026-11-22";
  // La receta VERBATIM de due-alerts.tsx tras la cura: la firma se
  // calcula desde dueAlerts(estado vivo, hoy) DENTRO de la receta.
  const recetaCurada = (today: string) => (s: LedgerState) =>
    ({ ...s, settings: { ...s.settings, dueAlertsDismissed: { sig: dueAlertsSig(dueAlerts(s, today)), day: today } } });

  it("un pago que entra entre la foto y la confirmación queda descartado: la firma es la del conjunto vivo", () => {
    const foto = dueBook([["s-a", "2026-11-25"]]);
    const vivo = dueBook([["s-a", "2026-11-25"], ["s-b", "2026-11-24"]]);
    // El escenario es real: la firma de la foto y la del vivo difieren.
    assert.notEqual(dueAlertsSig(dueAlerts(foto, HOY9)), dueAlertsSig(dueAlerts(vivo, HOY9)), "el pago nuevo cambia la firma");
    const sesion: Session = blankSession(vivo, false);
    const out = commit(sesion, recetaCurada(HOY9), "Tarjeta quitada de Central por ahora");
    assert.equal(out.ledger.settings.dueAlertsDismissed?.sig, dueAlertsSig(dueAlerts(vivo, HOY9)), "la firma guardada es la del estado vivo al confirmar");
    assert.equal(dueAlertsHidden(out.ledger, HOY9), true, "el descarte confirmado SÍ quita la tarjeta, con el pago nuevo dentro");
  });

  it("sin cambio entre foto y confirmación, el descarte quita como siempre (control)", () => {
    const vivo = dueBook([["s-a", "2026-11-25"]]);
    const sesion: Session = blankSession(vivo, false);
    const out = commit(sesion, recetaCurada(HOY9), "Tarjeta quitada de Central por ahora");
    assert.equal(dueAlertsHidden(out.ledger, HOY9), true, "el caso ordinario sigue funcionando");
  });
});
