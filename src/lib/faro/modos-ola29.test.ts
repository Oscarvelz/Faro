/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 29 — LA CURA (equipo amigo). Seis familias:
 *
 *  F1 · LA CAMINATA APRENDE EL IDIOMA (Q29-1 + Q29-2 + Q29-C1): la
 *       caminata de remitPersonWordOf conoce los apertores (a, al,
 *       para, to), camina MÁS ALLÁ de los tratamientos (doctor/
 *       doctora, dr/dra, niño/niña) hasta el nombre, no se detiene en
 *       una pieza de menos de 3 letras, y jamás nombra como candidata
 *       una palabra de período (esta/este/ese, this/last/next y los
 *       nombres de período). Ley de la familia: la negativa nombra
 *       solo una candidata que la caminata entera no pudo resolver a
 *       persona ni a palabra del idioma; ante la duda entre palabra
 *       común y nombre, manda el escaneo del libro.
 *  F2 · UN SOLO JUEZ DE LÁPIDAS (G29-1 + §F29-1 de Cambios): nace
 *       tombstoneShapeOk y juzga en la puerta del libro, en el lector
 *       (tombstonesOf) y en el escritor (withTombstone rehúsa acuñar
 *       lo que la puerta rehusaría); la unión de la fusión compara
 *       instantes juzgados, no texto.
 *  F3 · UNA SOLA LEY DE FECHA (G29-2): noticeRuleShapeOk juzga su
 *       `at` con la ida y vuelta de isIsoDateStrD — la misma ley que
 *       los deseos y las lápidas; el parser viejo (isDateStrD) se
 *       retira: su único consumidor que quedaba era este juez.
 *  F4 · LA CERCA JUZGA EL JUICIO, NO EL TEXTO (G29-3): la enmienda
 *       vive en libro392.test.ts (la puerta de lápidas se corre
 *       contra lápidas malformadas, no contra una regex); aquí se
 *       clava la conducta de las tres puertas de la F2.
 *  F5 · LAS DOS RENDIJAS DEL BARRIDO SE CIERRAN (E29-F1 + E29-F2):
 *       la bolsa ENTERA de bankChips (los 12 + la fija, ES/EN) corre
 *       por el turno real en Completo y en Esencial exigiendo su
 *       familia viva; y el barrido del mapa: cada entrada de askmap
 *       se alcanza por TODAS sus keys vía functionOfQuestion, con
 *       dos excepciones escritas (llaves compartidas).
 *  F6 · LA COEXISTENCIA LÍNEA+LÁPIDA (§F29-2 de Cambios): DECLARADA,
 *       no curada — con su razón escrita y sus tres patas clavadas
 *       como declaración (ver la sección F6 abajo): la puerta admite
 *       el paquete que las trae conviviendo, en casa la línea sigue
 *       contando (ningún ejecutor local), y la fusión la resuelve
 *       muerta. Si una cura futura la cierra, esta sección se pone
 *       roja y la declaración se revisa.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-29-C1-Cara, OBS-29-C1-
 * Cambios, OBS-29-A1, OBS-29-A2, OBS-29-G1/G2/G3, OBS-28-G1/C1,
 * OBS-27-G1, F27-3, H27-1, OBS-C8-1, A23-4 (CERRADO), el tip de
 * modos, la .395 (mesa de invitación).
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { answerBankQuestion, bankChips, type BankResult } from "./ask2";
import { FARO_FUNCTION_MAP, functionOfQuestion } from "./askmap";
import { FIXED_PRESET_Q } from "./askpresets";
import { putCard } from "./cards";
import { addLent } from "./debts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults";
import { fuseBooks, tombstonesOf, withTombstone } from "./fuse";
import { foldQ } from "./lexicon";
import { noticeRulesOf } from "./notices";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind, NoticeRule } from "./types";

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

/* ── EL LIBRO DE PRIMO (el de la caza): una sola persona, una remesa
 * de $50 el 20-10; Pérez y Rosa NO están en el libro. ────────────── */
function remitLine(id: string, monthKey: string, amountMinor: number, to: string, day: string): Line {
  return line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });
}
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

/* ═══ F1 · LA CAMINATA APRENDE EL IDIOMA ═══════════════════════════ */
describe("ola29 · F1 la caminata aprende el idioma (Q29-1 + Q29-2 + Q29-C1)", () => {
  it("Q29-1 · «al doctor Pérez» no entrega la remesa global: rehúsa nombrando a Pérez", () => {
    const r = ask(libroPrimo(), "es", "¿Cuándo fue la última remesa al doctor Pérez?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && /No sé quién es «perez»/.test(r.verdict),
      `la negativa nombra a Pérez, no la global de Primo: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-1 · «para la niña Rosa» (recencia) rehúsa nombrando a Rosa", () => {
    const r = ask(libroPrimo(), "es", "¿Cuándo fue la última remesa para la niña Rosa?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && /No sé quién es «rosa»/.test(r.verdict),
      `la negativa nombra a Rosa tras «para» y «niña»: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-2 · «a la doctora Pérez» acusa a Pérez, jamás a «doctora»", () => {
    const r = ask(libroPrimo(), "es", "¿Cuánto le mandé a la doctora Pérez?");
    assert.ok(r.kind === "answer" && /No sé quién es «perez»/.test(r.verdict) && !/«doctora»/.test(r.verdict),
      `la negativa nombra el nombre, no el tratamiento: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-2 · «¿Cuánto le mandé para Rosa?» acusa a Rosa, jamás a «para»", () => {
    const r = ask(libroPrimo(), "es", "¿Cuánto le mandé para Rosa?");
    assert.ok(r.kind === "answer" && /No sé quién es «rosa»/.test(r.verdict) && !/«para»/.test(r.verdict),
      `el apertor no es la persona: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-2 · «a la niña Rosa» (suma) acusa a Rosa, jamás a «nina»", () => {
    const r = ask(libroPrimo(), "es", "¿Cuánto le mandé a la niña Rosa?");
    assert.ok(r.kind === "answer" && /No sé quién es «rosa»/.test(r.verdict) && !/«nina»/.test(r.verdict),
      `el tratamiento no es la persona: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-1 · EN «to Dr. Rosa»: la captura corta no cierra la búsqueda — se nombra a Rosa", () => {
    const r = ask(libroPrimoEn(), "en", "When was the last remittance to Dr. Rosa?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && /don't know who "rosa"/.test(r.verdict),
      `la caminata sigue tras «dr» hasta «rosa»: ${r.kind === "answer" ? r.verdict.slice(0, 70) : r.kind}`);
  });
  it("Q29-C1 · «¿Cuánto mandé esta semana?» no acusa a «esta» ni viste la cifra con otro nombre", () => {
    const r = ask(libroPrimo(), "es", "¿Cuánto mandé esta semana?");
    assert.ok(r.kind === "unknown", `sin candidata no nace negativa: cae a su camino (unknown honesto): ${r.kind}${r.kind === "answer" ? "/" + r.family + " — " + r.verdict.slice(0, 60) : ""}`);
  });
  it("Q29-C1 · «este mes» y «el mes pasado» tampoco nacen como personas", () => {
    const a = ask(libroPrimo(), "es", "¿Cuánto mandé este mes?");
    assert.ok(!(a.kind === "answer" && /«este»/.test(a.verdict)), `«este» no es una persona: ${a.kind}`);
    const b = ask(libroPrimo(), "es", "¿Cuánto mandé el mes pasado?");
    assert.equal(b.kind, "unknown", `el período sigue su camino: ${b.kind}`);
  });
  it("Q29-C1 · EN «last month» / «this week» no acusan a «last» ni a «this»", () => {
    const a = ask(libroPrimoEn(), "en", "How much did I send last month?");
    assert.ok(!(a.kind === "answer" && /"last"/.test(a.verdict)), `«last» no es una persona: ${a.kind}`);
    const b = ask(libroPrimoEn(), "en", "How much did I send this week?");
    assert.equal(b.kind, "unknown", `el período sigue su camino: ${b.kind}`);
  });
  it("control · si Pérez SÍ está en el libro, «al doctor Pérez» lo resuelve (manda el escaneo)", () => {
    const con = libroPrimo();
    con.remitPeople = [...(con.remitPeople ?? []), { id: "perez", name: "Pérez" }];
    con.months[KEY] = { lines: [...con.months[KEY].lines, remitLine("r-perez", KEY, 21000, "perez", "18")] };
    const r = ask(con, "es", "¿Cuándo fue la última remesa al doctor Pérez?");
    assert.ok(r.kind === "answer" && r.family === "recencia" && r.pieces[0]?.minor === 21000,
      `con Pérez en el libro, la misma frase sirve SU remesa ($210): ${r.kind}`);
  });
  it("control sostenido · «a la señora Pérez» sigue nombrando a Pérez y «to my aunt Rosa» a Rosa", () => {
    const a = ask(libroPrimo(), "es", "¿Cuándo fue la última remesa a la señora Pérez?");
    assert.ok(a.kind === "answer" && /No sé quién es «perez»/.test(a.verdict), "el relleno de la Ola 28 sigue caminado");
    const b = ask(libroPrimoEn(), "en", "When was the last remittance to my aunt Rosa?");
    assert.ok(b.kind === "answer" && /don't know who "rosa"/.test(b.verdict), "el tratamiento EN sigue caminado");
  });
});

/* ═══ F2 + F3 · UN SOLO JUEZ DE LÁPIDAS, UNA SOLA LEY DE FECHA ═════ */
const PIEDRA_BUENA = { id: "l-casa", at: "2026-11-21T09:00:00.000Z", by: "cuenta-duena" };
function libroCon(over: Record<string, unknown>): LedgerState {
  const b = createInitial("es", "oscuro") as unknown as Record<string, unknown>;
  Object.assign(b, over);
  return b as unknown as LedgerState;
}
function libroConLineaYPiedras(stones: unknown[]): LedgerState {
  const b = createInitial("es", "oscuro");
  b.months[KEY] = { lines: [line({ id: "l-casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 12000, categoryId: "f-casa", subId: "f.casa.servicios" })] };
  (b as unknown as Record<string, unknown>).tombstones = stones;
  return b;
}
const todasLasLineas = (s: LedgerState): Line[] => Object.values(s.months).flatMap((m) => m.lines);

describe("ola29 · F2 un solo juez de lápidas (G29-1 + §F29-1)", () => {
  it("la puerta del libro rehúsa la lápida basura, la sin firmante y la sin id", () => {
    assert.equal(isLedgerDeep(libroCon({ tombstones: [PIEDRA_BUENA] })), true, "la bien formada pasa");
    assert.equal(isLedgerDeep(libroCon({ tombstones: [{ ...PIEDRA_BUENA, at: "basura" }] })), false, "at libre muere");
    assert.equal(isLedgerDeep(libroCon({ tombstones: [{ ...PIEDRA_BUENA, at: "" }] })), false, "at vacío muere");
    assert.equal(isLedgerDeep(libroCon({ tombstones: [{ ...PIEDRA_BUENA, at: "2026-02-30" }] })), false, "el 30 de febrero muere");
    assert.equal(isLedgerDeep(libroCon({ tombstones: [{ ...PIEDRA_BUENA, by: "" }] })), false, "sin firmante muere");
    assert.equal(isLedgerDeep(libroCon({ tombstones: [{ ...PIEDRA_BUENA, id: "" }] })), false, "sin id muere — puerta y lector ya no discrepan");
  });
  it("el lector filtra con el mismo juez: la lápida basura no está activa", () => {
    const b = libroConLineaYPiedras([{ id: "l-casa", at: "zzzz", by: "cuenta-x" }, { id: "l-casa", at: "2026-11-21T09:00:00.000Z", by: "" }]);
    assert.deepEqual(tombstonesOf(b), [], "ninguna de las dos lápidas plantadas pasa el lector");
    const buena = libroConLineaYPiedras([PIEDRA_BUENA]);
    assert.equal(tombstonesOf(buena).length, 1, "la bien formada sí se lee");
  });
  it("el escritor rehúsa acuñar lo que la puerta rehusaría: el acto entero no sucede", () => {
    const b = libroConLineaYPiedras([]);
    const negado = withTombstone(b, "l-casa", "", "basura");
    assert.equal(negado, b, "sin firmante y con fecha basura: el estado vuelve intacto");
    assert.equal(negado.months[KEY].lines.length, 1, "la línea NO se borró sin firmar");
    const negado2 = withTombstone(b, "l-casa", "cuenta-duena", "2026-02-30");
    assert.equal(negado2.months[KEY].lines.length, 1, "con fecha imposible tampoco se borra");
    const hecho = withTombstone(b, "l-casa", "cuenta-duena", "2026-11-22T10:00:00.000Z");
    assert.equal(hecho.months[KEY].lines.length, 0, "bien firmada, la línea sale");
    assert.deepEqual(tombstonesOf(hecho), [{ id: "l-casa", at: "2026-11-22T10:00:00.000Z", by: "cuenta-duena" }], "y la lápida queda, juzgable");
    assert.equal(isLedgerDeep(hecho), true, "lo acuñado por el escritor pasa la puerta");
  });
  it("la unión compara instantes juzgados: la lápida basura no gana ni entra (§F29-1)", () => {
    const base = libroConLineaYPiedras([]);
    const sinLinea = (stones: unknown[]): LedgerState => {
      const b = libroConLineaYPiedras(stones);
      b.months[KEY] = { lines: [] };
      return b;
    };
    const legitima = { id: "l-casa", at: "2026-11-21T09:00:00.000Z", by: "cuenta-duena" };
    const basura = { id: "l-casa", at: "zzzz-no-es-una-fecha", by: "cuenta-x" };
    const fused = fuseBooks(base,
      { state: sinLinea([legitima]), revision: 2, updatedAt: "2026-11-21T10:00:00Z", by: "cuenta-duena" },
      { state: sinLinea([basura]), revision: 2, updatedAt: "2026-11-21T10:00:00Z", by: "cuenta-x" });
    assert.deepEqual(tombstonesOf(fused.state), [legitima], "gana la legítima; la basura ni siquiera entra");
    assert.equal(todasLasLineas(fused.state).filter((l) => l.id === "l-casa").length, 0, "la línea queda muerta por la lápida verdadera");
  });
  it("la lápida plantada sin firmante no mata la línea editada por su dueño", () => {
    const base = libroConLineaYPiedras([]);
    const plantada = { id: "l-casa", at: "2026-11-22T00:00:00.000Z", by: "" };
    const conPiedra = libroConLineaYPiedras([plantada]);
    const fused = fuseBooks(base,
      { state: conPiedra, revision: 2, updatedAt: "2026-11-22T01:00:00Z", by: "cuenta-x" },
      { state: base, revision: 1, updatedAt: "2026-11-21T10:00:00Z", by: "cuenta-duena" });
    assert.equal(fused.state.months[KEY].lines.length, 1, "la línea del dueño sobrevive: la lápida sin firmante no es un hecho");
    assert.deepEqual(tombstonesOf(fused.state), [], "y ninguna lápida queda activa");
  });
});

describe("ola29 · F3 una sola ley de fecha (G29-2)", () => {
  const regla = (at: string): NoticeRule => ({ key: "#banco#aviso#", app: "Banco", label: "Banco · Aviso", at });
  it("noticeRuleShapeOk juzga `at` con la ida y vuelta: el 30 de febrero muere en las dos puertas", () => {
    assert.equal(isLedgerDeep(libroCon({ noticeRules: [regla("2026-02-30")] })), false, "la puerta del libro rehúsa el 30 de febrero");
    assert.equal(isLedgerDeep(libroCon({ noticeRules: [regla("Feb 30, 2026")] })), false, "y el texto que Date normaliza");
    assert.deepEqual(noticeRulesOf(libroCon({ noticeRules: [regla("2026-02-30")] })), [], "el lector la descarta con el mismo juez");
    assert.equal(isLedgerDeep(libroCon({ noticeRules: [regla("2026-11-22T10:00:00.000Z")] })), true, "la regla del reloj ISO pasa la puerta");
    assert.equal(noticeRulesOf(libroCon({ noticeRules: [regla("2026-11-22T10:00:00.000Z")] })).length, 1, "y el lector la honra");
  });
});

/* ═══ F5 · LAS DOS RENDIJAS DEL BARRIDO ════════════════════════════ */
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

/* La familia viva de cada chip, en el orden en que bankChips los
 * emite (medida por la caza y por esta cerca: el chip ES la canónica
 * de su familia — si un chip cambia de casa, se enmienda aquí con su
 * razón). */
const CHIP_FAMILIA: Record<string, string> = {
  "¿Cuánto me queda en ahorros?": "ahorros",
  "¿Cuánto tengo para gastar en gustos?": "gustos",
  "¿Cuándo fue la última vez que me pagaron?": "recencia",
  "¿Quién me debe más?": "ranking",
  "¿Cuáles son las primeras cuotas del mes?": "agenda",
  "¿Cuánto gasté el último mes en tiendas?": "historia",
  "How much do I have in savings?": "ahorros",
  "How much do I have for treats?": "gustos",
  "When did I last get paid?": "recencia",
  "Who owes me the most?": "ranking",
  "What are the first dues I need to pay?": "agenda",
  "How much did I spend last month in stores?": "historia",
};

describe("ola29 · F5a la bolsa entera de chips llega viva (E29-F1)", () => {
  it("los 12 chips + la fija, ES/EN, en Completo y en Esencial, cada uno a SU familia", () => {
    for (const lang of ["es", "en"] as const) {
      const ledger = libroRico(lang);
      for (const mode of ["completo", "esencial"] as Mode3[]) {
        for (const chip of bankChips(lang)) {
          const r = ask(ledger, lang, chip, mode);
          assert.ok(r.kind === "answer" && r.family === CHIP_FAMILIA[chip],
            `chip ${lang}/${mode} «${chip}» -> ${r.kind}${r.kind !== "unknown" ? "/" + r.family : ""} (esperada: ${CHIP_FAMILIA[chip]})`);
        }
        const fija = ask(ledger, lang, FIXED_PRESET_Q[lang], mode);
        assert.ok(fija.kind === "answer" && fija.family === "capacidades",
          `la fija ${lang}/${mode} -> ${fija.kind}${fija.kind !== "unknown" ? "/" + fija.family : ""}`);
      }
    }
  });
});

/* EXCEPCIONES ESCRITAS DEL BARRIDO DEL MAPA (la práctica de la F2 de
 * la Ola 28): llaves COMPARTIDAS — la palabra nombra dos casas y el
 * desempate por orden del mapa es determinista y está nombrado aquí;
 * cada excepción afirma a qué entrada llega la llave, para que la
 * cerca se ponga roja si la resolución cambia. */
const MAPA_EXCEPCIONES: Record<string, { llega: string; razon: string }> = {
  "ahorros.colchon|emergencia": {
    llega: "ahorros.stock",
    razon: "«emergencia» es llave de las DOS casas del ahorro (el colchón y el stock); a igual puntaje manda la primera del mapa, y la llave larga «fondo de emergencia» sí llega al colchón — la palabra sola nombra el ahorro guardado.",
  },
  "ajustes.exportar|excel": {
    llega: "captura.importar",
    razon: "«excel» nombra las dos puertas del archivo (importar del banco y exportar la hoja); la palabra sola resuelve a la importación por orden del mapa, y la exportación se alcanza por sus palabras propias («exportar», «export», «descargar», «imprimir»).",
  },
};

describe("ola29 · F5b el barrido del mapa: cada entrada se alcanza por sus keys (E29-F2)", () => {
  it("las 38 entradas × sus keys por functionOfQuestion, con las excepciones escritas", () => {
    assert.equal(FARO_FUNCTION_MAP.length, 38, "el mapa tiene 38 entradas");
    for (const f of FARO_FUNCTION_MAP) {
      for (const k of f.keys) {
        const got = functionOfQuestion(foldQ(k))?.id ?? null;
        const ex = MAPA_EXCEPCIONES[`${f.id}|${k}`];
        if (ex) {
          assert.equal(got, ex.llega, `excepción escrita: «${k}» de ${f.id} llega a ${ex.llega} — ${ex.razon}`);
        } else {
          assert.equal(got, f.id, `la key «${k}» alcanza su entrada ${f.id} (llegó a ${got})`);
        }
      }
    }
  });
});

/* ═══ F6 · LA COEXISTENCIA, DECLARADA ══════════════════════════════
 * §F29-2 de Cambios: una línea y su lápida pueden coexistir en el
 * mismo libro y ningún ejecutor LOCAL hace cumplir la lápida. La
 * decisión de esta cura: DECLARADA, no curada. LA RAZÓN, escrita:
 * (1) la ley de la puerta del cargador es la preservación — «gana
 * siempre la preservación» — y rehusar el libro entero por un par
 * conviviendo perdería el libro por una lápida, la enfermedad
 * contraria a la de la Ola 26 (perder en silencio); (2) la lápida es
 * por su propia declaración una ley DE LA FUSIÓN («el hecho queda
 * para la fusión»), no un ejecutor local: en casa, sin fusión, no
 * hay dos escritores que arbitrar; (3) el único acuñador de la casa
 * (withTombstone) retira la línea en el mismo acto, así que ningún
 * camino enviado produce la coexistencia — solo un pack extranjero
 * puede traerla escrita; (4) hacerla cumplir en casa escondería la
 * línea de los totales SIN anunciar nada: el reverso exacto de la
 * enfermedad que esta campaña caza. Las tres patas quedan clavadas
 * como DECLARACIÓN: si una cura futura la cierra, esta sección se
 * pone roja y la declaración se revisa con su razón nueva. */
describe("ola29 · F6 la coexistencia línea+lápida, DECLARADA (§F29-2)", () => {
  it("pata 1 · la puerta ADMITE el libro que las trae conviviendo (preservación)", () => {
    const b = libroConLineaYPiedras([PIEDRA_BUENA]);
    assert.equal(isLedgerDeep(b), true, "DECLARADO: la puerta juzga los campos, no su significado conjunto");
  });
  it("pata 2 · en casa la lápida no cambia NADA: ningún ejecutor local (declarado)", () => {
    // La vara exacta de la declaración: el mismo libro con y sin la
    // lápida conviviendo responde IDÉNTICO en casa — la lápida es
    // invisible para el motor local; solo la fusión la ejecuta.
    const con = ask(libroConLineaYPiedras([PIEDRA_BUENA]), "es", "¿Cuánto gasté en casa?");
    const sin = ask(libroConLineaYPiedras([]), "es", "¿Cuánto gasté en casa?");
    assert.ok(con.kind === "answer" && sin.kind === "answer", "la pregunta responde en los dos libros");
    if (con.kind === "answer" && sin.kind === "answer") {
      assert.equal(con.verdict, sin.verdict, "DECLARADO: el veredicto en casa es el mismo con la lápida presente");
      assert.deepEqual(con.pieces, sin.pieces, "DECLARADO: y las cifras también — la línea sigue contando entera");
    }
  });
  it("pata 3 · la fusión SÍ la resuelve: con lápida, la línea muere al fusionar", () => {
    const base = libroConLineaYPiedras([]);
    const conPiedra = libroConLineaYPiedras([PIEDRA_BUENA]);
    conPiedra.months[KEY] = { lines: [] };
    const fused = fuseBooks(base,
      { state: conPiedra, revision: 2, updatedAt: "2026-11-21T10:00:00Z", by: "cuenta-duena" },
      { state: base, revision: 1, updatedAt: "2026-11-21T09:00:00Z", by: "cuenta-duena" });
    assert.equal(todasLasLineas(fused.state).filter((l) => l.id === "l-casa").length, 0, "la lápida es ley de la fusión: al fusionar, la línea muere");
    assert.deepEqual(tombstonesOf(fused.state), [PIEDRA_BUENA], "y el hecho queda");
  });
});
