/**
 * captura383.test.ts — LA INTEGRACIÓN DEL BANCO (Olas 2–18) EN CANON.
 *
 * La pieza del banco (la copia faro-asesor-ola2, construida sobre
 * .362) entra en canon .382 por auditoría de tres vías (DERIVA-378):
 * ask2/questionbank los gana la pieza; ask/askmap/types/engine los
 * gana canon; y tres costuras se cosen a mano — (1) la delegación
 * reach de canon POR DELANTE de la cascada (el futuro con fecha tiene
 * un solo proyector), (2) el marco del Seguimiento §20 (los cinco
 * verbos de la 1.3.380, con historia y comparar dejando su marco
 * sobre el pool EXACTO de la cascada nueva), (3) las manos de la caja
 * (los patrones enhebrados, las señales forgetWord/touchAlias, la
 * propuesta como tarjeta, las acciones como puertas).
 *
 * Estos especímenes prueban las COSTURAS en canon — el banco trae
 * los suyos (banco.test, mundo.test) para las familias.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { answerBankQuestion, answerFollowUp } from "./ask2.ts";
import { askPatternsOf, learnAlias } from "./asklearn.ts";
import { FARO_FUNCTION_MAP, FUNCTION_TOPIC } from "./askmap.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { foldQ } from "./lexicon.ts";
import { FEATURES } from "./mode.ts";
import { MANUAL_TOPICS, findTopic } from "../manual/topics.ts";
import { NEWS } from "./novedades.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";
const TODAY = "2026-11-21";
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

/** El libro de las costuras: dos meses con gasto por categoría (Casa
 * sube $210, Comida $30), una suscripción viva, y una cuenta con
 * $1,000 para que el camino de §19.1 camine. */
function specimen(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.settings.display = "USD";
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.banco", nameKey: "", customName: "Banco", icon: "vault", hidden: false, order: 9 });
  ledger.months["2026-10"] = {
    lines: [
      line({ id: "oct-casa", kind: "expense-variable", concept: "Servicios", amountMinor: 10000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-05", monthKey: "2026-10" }),
      line({ id: "oct-comida", kind: "expense-variable", concept: "Súper", amountMinor: 5000, categoryId: "f-comida", subId: "f.comida.super", bookedOn: "2026-10-07", monthKey: "2026-10" }),
    ],
  };
  ledger.months[KEY] = {
    lines: [
      line({ id: "acct-1", kind: "expense-fixed", concept: "Banco", amountMinor: 100000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 100000, bookedOn: "2026-11-01" }),
      line({ id: "nov-casa", kind: "expense-variable", concept: "Servicios", amountMinor: 25000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-11-05" }),
      line({ id: "nov-net", kind: "subscription", concept: "Internet", amountMinor: 6000, categoryId: "f-casa", subId: "f.casa.internet", cadence: "monthly", nextDue: "2026-11-25", bookedOn: "2026-11-01" }),
      line({ id: "nov-comida", kind: "expense-variable", concept: "Súper", amountMinor: 8000, categoryId: "f-comida", subId: "f.comida.super", bookedOn: "2026-11-07" }),
    ],
  };
  return ledger;
}

function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

test("383 · la costura reach: el futuro con fecha lo responde el proyector de canon, delante de la cascada", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const r = answerBankQuestion(ledger, KEY, "es", names, "¿Cómo llego a fin de mes?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(r.kind, "answer");
  if (r.kind === "answer") assert.equal(r.family, "reach");
});

test("383 · el banco responde en canon: conteo, compuesta y calculadora de la calle", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const conteo = answerBankQuestion(ledger, KEY, "es", names, "¿Cuántas cuotas tengo?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(conteo.kind, "answer");
  if (conteo.kind === "answer") {
    assert.equal(conteo.family, "conteo");
    assert.match(conteo.verdict, /1/);
  }
  const compuesta = answerBankQuestion(ledger, KEY, "es", names, "¿Cuánto gasté este mes y cuánto me queda en ahorros?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(compuesta.kind, "answer");
  if (compuesta.kind === "answer") assert.ok(compuesta.source.length >= 2, "las dos patas traen su fuente");
  const calc = answerBankQuestion(ledger, KEY, "es", names, "¿Cuánto es la mitad de 90?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(calc.kind, "answer");
  if (calc.kind === "answer") {
    assert.equal(calc.family, "calculadora");
    assert.match(calc.verdict, /45/);
  }
});

test("383 · el Seguimiento vive sobre el banco: la comparación deja marco y «¿en qué?» cierra exacto", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const first = answerBankQuestion(ledger, KEY, "es", names, "¿Gasté más este mes o el pasado?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(first.kind, "answer");
  if (first.kind !== "answer") return;
  assert.equal(first.frame?.kind, "compare2");
  const fu = answerFollowUp(ledger, KEY, "es", names, "¿En qué gasté más?", ctx(ledger), TODAY, first.frame ?? null, "completo");
  assert.ok(fu && fu.kind === "answer");
  if (fu && fu.kind === "answer") {
    assert.match(fu.verdict, /Siguiendo tu comparación/);
    // La cuenta cierra: Casa +$210, Comida +$30 = la diferencia $240.
    assert.match(fu.note ?? "", /\$240/);
  }
});

test("383 · el aprendizaje cierra el círculo: patrón confirmado → la palabra del usuario filtra su libro", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
  assert.equal(store.length, 1);
  const r = answerBankQuestion(ledger, KEY, "es", names, "¿Cuánto gasté en la luz este mes?", ctx(ledger), TODAY, undefined, "completo", store);
  assert.equal(r.kind, "answer");
  if (r.kind === "answer") {
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0]?.minor, 25000);
  }
  // La cerca de los dígitos, en la puerta del libro y en el lector.
  const dirty = { ...ledger, askPatterns: [{ word: "cuenta 42", targetId: "f.casa.servicios", kind: "sub", hits: 1, learnedFrom: "card-tap" }] } as unknown as LedgerState;
  assert.equal(isLedgerDeep(dirty), false);
  assert.deepEqual(askPatternsOf(dirty), []);
  const clean = { ...ledger, askPatterns: store } as LedgerState;
  assert.equal(isLedgerDeep(clean), true);
  assert.equal(askPatternsOf(clean).length, 1);
});

test("383 · las acciones de una respuesta resuelven a un tema con puerta (la caja no pinta botones muertos)", () => {
  const ledger = specimen();
  const names = makeNamer(ledger.structure, "es");
  const r = answerBankQuestion(ledger, KEY, "es", names, "¿Cuánto gasté este mes?", ctx(ledger), TODAY, undefined, "completo");
  assert.equal(r.kind, "answer");
  if (r.kind !== "answer") return;
  assert.ok((r.actions ?? []).length >= 1, "historia trae su puerta del Puente");
  for (const a of r.actions ?? []) {
    const tid = FUNCTION_TOPIC[a.target];
    const byMap = tid ? findTopic(tid) : null;
    const byKey = MANUAL_TOPICS.find((t) => t.go && (t.keys ?? []).includes(a.target));
    assert.ok(byMap?.go || byKey?.go, `acción ${a.target} sin puerta`);
  }
});

test("383 · los asientos de la integración: mapa, modo, Manual, Novedades y las manos de la caja", () => {
  const entry = FARO_FUNCTION_MAP.find((f) => f.id === "asesor.aprender");
  assert.ok(entry, "la función del aprendizaje existe en el mapa");
  assert.ok(entry!.does.es.length > 0 && entry!.does.en.length > 0, "y trae su línea (L-B7)");
  assert.equal(FEATURES["settings.ask-learned"], "ritmo");
  const topic = findTopic("preguntar-asesor");
  assert.match(topic?.what[0] ?? "", /aprende tus palabras/);
  assert.match(topic?.what[1] ?? "", /learns your words/);
  const note = NEWS.find((n) => n.version === "1.3.383");
  assert.equal(note?.level, "grande");
  assert.equal(note?.topic, "preguntar-asesor");
  const box = read("../../components/faro/ask-box.tsx");
  assert.ok(box.includes("askPatternsOf(session.ledger)"), "la caja enhebra los patrones");
  assert.ok(box.includes("touchAlias") && box.includes("forgetWord"), "y aplica las dos señales del aprendizaje");
  assert.ok(box.includes("ask-action") && box.includes("ask-proposal"), "y pinta acciones y propuesta");
  const screens = read("../../components/faro/screens.tsx");
  assert.ok(screens.includes("AskLearnedManager"), "el pliegue de lo aprendido vive en Ajustes");
});
