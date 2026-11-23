/* LA BATERÍA DE UTILIDAD (Ola 36, PARADISE — Walker et al. 1997):
 * la satisfacción es κ·éxito − costos del diálogo. Esta batería no
 * pregunta «¿responde?» — eso lo juzgan las baterías por familia —
 * sino «¿la respuesta SIRVE?», con las varas de la casa:
 *
 *  A · Toda respuesta se explica sola: trae su fuente (del mapa),
 *     y si trae piezas, su veredicto nombra una cifra.
 *  B · Comprensión en frecuencias naturales: las tasas se dicen
 *     con su denominador («de cada…», «cada N días»), no en
 *     decimales desnudos.
 *  C · Invarianza ante la paráfrasis: la misma pregunta en tres
 *     voces da la misma familia y la misma cifra clave.
 *  D · Direccionalidad: el sí y el no de las pruebas caen del lado
 *     que la aritmética manda.
 *  E · Costo del diálogo: un seguimiento se resuelve en un turno;
 *     dos desvaríos seguidos abren la puerta (el presupuesto de
 *     reparación de la Ola 28, contado).
 *  F · Calidad de la abstención (la puntuación publicada):
 *     fabricar una cifra sobre una trampa = −3; abstenerse
 *     nombrando el hueco = 0; acertar un control = +1. La batería
 *     exige cero fabricaciones.
 *  G · El lint de la vergüenza y del consejo imperativo: ninguna
 *     respuesta del corpus avergüenza ni ordena.
 *  H · El presupuesto de avisos: las candidatas de la deriva nunca
 *     pasan de tres, vienen ordenadas y honran la supresión.
 *
 * Juzga retroactivamente a las Olas 27–35: su corpus corre sobre
 * las familias que esas olas construyeron.
 *
 * NOTA DE INTEGRACIÓN (canon): el corpus de la vara A crece con
 * cada ola que se integra — las preguntas de las Olas 37–43 que la
 * copia ya trae entran cuando sus familias aterricen en canon.
 * La vara E usa el marco conversacional de canon (convo), no el
 * frame único de la copia. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { answerBankQuestion, driftCandidates, type BankResult } from "./ask2.ts";
import { FARO_FUNCTION_MAP } from "./askmap.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & { id: string }): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "USD", icon: "", history: [], ...partial,
  } as Line;
}

function ask(state: LedgerState, raw: string, lang: Lang = "es"): BankResult {
  const names = makeNamer(state.structure, lang);
  const parseCtx = { ledger: state, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` } as never;
  return answerBankQuestion(state, KEY, lang, names, raw, parseCtx, TODAY);
}

/** El libro chico de la verificación: queda $750.01, ritmo $75.00. */
function libroBase(): LedgerState {
  const l = createInitial("es", "oscuro");
  l.months["2026-09"] = { lines: [
    line({ id: "net0", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", nextDue: "2026-09-28", bookedOn: "2026-09-28", monthKey: "2026-09" }),
  ] };
  l.months[KEY] = { lines: [
    line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", bookedOn: "2026-10-01" }),
    line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
  ] };
  l.settings.display = "USD";
  return l;
}

/** Siete meses con la comida derivando (el libro de la Ola 33). */
function libroRico(): LedgerState {
  const l = createInitial("es", "oscuro");
  const meses = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  const comida = [20000, 21000, 19000, 20500, 19500, 24000, 28000];
  meses.forEach((mk, i) => {
    l.months[mk] = { lines: [
      line({ id: `s${i}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `c${i}`, kind: "expense-fixed" as LineKind, concept: "Comida", amountMinor: comida[i], categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
    ] };
  });
  l.settings.display = "USD";
  return l;
}

const MAP_IDS = new Set(FARO_FUNCTION_MAP.map((f) => f.id));
const corpus: BankResult[] = [];
function run(state: LedgerState, q: string): BankResult {
  const r = ask(state, q);
  corpus.push(r);
  return r;
}

describe("utilidad · A: toda respuesta se explica sola (fuente del mapa, cifra en el veredicto)", () => {
  it("el corpus de las olas 27–35 pasa la vara", () => {
    const base = libroBase();
    const rico = libroRico();
    const qs: Array<[LedgerState, string]> = [
      [base, "¿Me alcanza el mes?"],
      [base, "¿Puedo pagar $200 el día 28?"],
      [base, "¿Tengo $20 para gastar hoy?"],
      [base, "¿Qué es Internet?"],
      [base, "¿Qué me falta este mes?"],
      [rico, "¿Algo cambió en mi libro?"],
      [rico, "¿Cuánto gasté en comida este mes?"],
      [rico, "¿Cuál es mi piso de ingreso?"],
      [base, "¿Cuánto debo ahorrar para juntar $2000 en 4 meses?"],
      [base, "¿Qué tan viejas son mis deudas?"],
      [base, "¿Si la casa sube a $300, cómo quedo?"],
      [base, "Si me compro un boleto de avion por $500, y rento una casa por $1200, podría asumir el gasto?"],
      [base, "¿Con cuánto llegaría a fin de mes?"],
      [base, "¿Puedo prestarle $200 a mi hermano?"],
      [base, "¿Puedo ayudar a mi mamá con $300 este mes?"],
      [base, "¿Cuánto es lo máximo que puedo pagar de renta?"],
      [base, "¿Me alcanza hasta el próximo pago?"],
      [base, "¿Voy a terminar el mes en negativo?"],
      [base, "¿Cuándo se me acaba el dinero?"],
      [base, "¿Cuánto necesito para terminar el mes?"],
      [base, "¿Cuánto pago de intereses al mes?"],
      [base, "¿Qué pago primero?"],
      [base, "¿Cuánto debería estar ahorrando?"],
      [base, "¿Estoy ahorrando bien?"],
      [base, "¿Puedo sacar $200 de mis ahorros?"],
      [base, "¿Cuánto necesito al mes para vivir?"],
      [base, "¿Me alcanza con lo que gano?"],
      [base, "¿Qué porcentaje de lo que gano se va en la casa?"],
      [base, "¿Cuánto tiempo aguanto sin ingresos?"],
      [base, "¿En qué se me está yendo el dinero?"],
      [base, "¿Este mes he gastado mucho?"],
    ];
    for (const [book, q] of qs) {
      const r = run(book, q);
      assert.equal(r.kind, "answer", `«${q}» debe responder`);
      if (r.kind !== "answer") continue;
      assert.ok(r.source.length > 0, `«${q}» sin fuente`);
      for (const s of r.source) assert.ok(MAP_IDS.has(s), `«${q}» cita una fuente fuera del mapa: ${s}`);
      if (r.pieces.length) assert.ok(/\$\d/.test(r.verdict), `«${q}» trae piezas pero su veredicto no nombra una cifra: ${r.verdict}`);
    }
  });
});

describe("utilidad · B: frecuencias naturales, con su denominador nombrado", () => {
  it("la frecuencia dice «cada» y su número; el ritmo dice su período", () => {
    const r = run(libroBase(), "¿Cada cuánto pago el Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(/cada/.test(r.verdict.toLowerCase()), r.verdict);
    const v = run(libroBase(), "¿Tengo $20 para gastar hoy?");
    assert.equal(v.kind, "answer");
    if (v.kind === "answer") assert.ok(/hoy|día/.test(v.verdict), v.verdict);
  });
});

describe("utilidad · C: invarianza ante la paráfrasis (tres voces, una cifra)", () => {
  it("la comida de octubre en tres voces: misma familia, misma cifra", () => {
    const rico = libroRico();
    const voices = ["¿Cuánto gasté en comida este mes?", "¿Cuánto fue lo que gasté en comida este mes?", "¿Cuánto gasté en comida en octubre?"];
    const rs = voices.map((q) => run(rico, q));
    for (const r of rs) {
      assert.equal(r.kind, "answer");
      if (r.kind === "answer") {
        assert.equal(r.family, "historia");
        assert.ok(r.verdict.includes("$280.00"), r.verdict);
      }
    }
  });

  it("la verificación de $20 en tres voces: misma familia, mismo sí", () => {
    const base = libroBase();
    const voices = ["¿Tengo $20 para gastar hoy?", "¿Puedo gastar $20 hoy?", "¿Me alcanza con $20 para hoy?"];
    const rs = voices.map((q) => run(base, q));
    for (const r of rs) {
      assert.equal(r.kind, "answer");
      if (r.kind === "answer") {
        assert.equal(r.family, "promedio");
        assert.ok(r.verdict.includes("$20.00"), r.verdict);
      }
    }
  });
});

describe("utilidad · D: direccionalidad (el sí y el no caen donde la aritmética manda)", () => {
  it("el día 28: $200 sí cabe tras lo programado, $800 no — y los veredictos lo dicen al derecho", () => {
    const base = libroBase();
    const si = run(base, "¿Puedo pagar $200 el día 28?");
    const no = run(base, "¿Puedo pagar $800 el día 28?");
    assert.equal(si.kind, "answer"); assert.equal(no.kind, "answer");
    if (si.kind === "answer") assert.ok(si.verdict.startsWith("Sí"), si.verdict);
    if (no.kind === "answer") assert.ok(no.verdict.startsWith("No"), no.verdict);
  });
});

describe("utilidad · E: el costo del diálogo (un turno por seguimiento; dos desvaríos, la puerta)", () => {
  it("la cadena se cuenta: seguimiento aplicado = 1 turno; desvarío 1 = reparación; desvarío 2 = puerta", () => {
    const rico = libroRico();
    const names = makeNamer(rico.structure, "es");
    const parseCtx = { ledger: rico, lang: "es" as Lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` } as never;
    const full = (raw: string, frame?: never) => answerBankQuestion(rico, KEY, "es", names, raw, parseCtx, TODAY, undefined, undefined, undefined, frame);
    const r1 = full("¿Cuánto gasté en comida en septiembre?");
    assert.equal(r1.kind, "answer");
    if (r1.kind !== "answer" || !r1.convo) return;
    corpus.push(r1);
    const r2 = full("¿y en octubre?", r1.convo as never);
    assert.equal(r2.kind, "answer");
    if (r2.kind === "answer") { assert.ok(r2.verdict.includes("$280.00"), r2.verdict); corpus.push(r2); }
    if (r2.kind !== "answer" || !r2.convo) return;
    const r3 = full("¿y en la luna?", r2.convo as never);
    assert.equal(r3.kind, "answer");
    if (r3.kind === "answer") corpus.push(r3);
    if (r3.kind !== "answer" || !r3.convo) return;
    const r4 = full("¿y en marte?", r3.convo as never);
    assert.equal(r4.kind, "answer");
    if (r4.kind === "answer") {
      corpus.push(r4);
      assert.ok((r4.actions ?? []).some((a) => a.id === "goto"), "el segundo desvarío abre la puerta");
    }
  });
});

describe("utilidad · F: la calidad de la abstención (fabricar = −3, nombrar el hueco = 0, acertar = +1)", () => {
  it("cero fabricaciones sobre las trampas; los controles puntúan", () => {
    let score = 0;
    const traps = [
      "¿Cuál es mi puntaje de crédito?",
      "¿Cuál es mi patrimonio neto?",
      "¿Qué es este cargo de $33?",
      "¿Cuánto llevo puesto en la tanda?",
    ];
    for (const q of traps) {
      const r = run(libroBase(), q);
      assert.equal(r.kind, "answer", `la trampa «${q}» merece una abstención NOMBRADA, no un silencio`);
      if (r.kind !== "answer") { score -= 3; continue; }
      const namesGap = /(falta|no (está|esta|hay|encuentro|lleva)|no existe|no se puede|no lo|sin ese dato|buc?ro|no tengo)/i.test(r.verdict + " " + (r.note ?? ""));
      assert.ok(namesGap, `la trampa «${q}» debe nombrar su hueco: ${r.verdict}`);
      score += 0;
    }
    const controls: Array<[string, string]> = [
      ["¿Tengo $20 para gastar hoy?", "$20.00"],
      ["¿Cuánto gasté en comida este mes?", "$0"],
    ];
    const rico = libroRico();
    const c1 = run(libroBase(), controls[0][0]);
    if (c1.kind === "answer" && c1.verdict.includes(controls[0][1])) score += 1;
    const c2 = run(rico, "¿Cuánto gasté en comida este mes?");
    if (c2.kind === "answer" && c2.verdict.includes("$280.00")) score += 1;
    assert.equal(score, 2, "los dos controles puntúan y ninguna trampa fabricó");
  });
});

describe("utilidad · G: el lint de la vergüenza y del consejo imperativo (sobre todo el corpus)", () => {
  it("ninguna respuesta del corpus avergüenza ni ordena", () => {
    const lint = /(deber[ií]as|tienes que|te recomiendo|hay que|debes (pagar|ahorrar|gastar|dejar)|qu[eé] mal|irresponsable|vergüenza|no seas)/i;
    assert.ok(corpus.length >= 20, "el corpus debe ser ancho para que el lint signifique algo");
    for (const r of corpus) {
      if (r.kind !== "answer") continue;
      const text = r.verdict + " " + (r.note ?? "");
      assert.ok(!lint.test(text), `consejo o vergüenza en: ${text.slice(0, 120)}`);
    }
  });
});

describe("utilidad · H: el presupuesto de avisos (tres, ordenadas, suprimibles)", () => {
  it("driftCandidates nunca pasa de tres, viene ordenado por peso y honra la supresión", () => {
    const rico = libroRico();
    const names = makeNamer(rico.structure, "es");
    const alerts = driftCandidates(rico, KEY, "es", names, TODAY);
    assert.ok(alerts.length >= 1 && alerts.length <= 3);
    for (let i = 1; i < alerts.length; i++) assert.ok(alerts[i - 1].score >= alerts[i].score, "ordenadas por peso");
    const ids = new Set(alerts.map((a) => a.id));
    assert.equal(ids.size, alerts.length, "sin episodios duplicados");
    const sup = driftCandidates(rico, KEY, "es", names, TODAY, ids);
    assert.equal(sup.length, 0, "la supresión confirmada se honra entera");
  });
});
