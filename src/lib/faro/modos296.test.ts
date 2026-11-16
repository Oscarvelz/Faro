/**
 * FARO — «Los tres modos», etapa 3.2 (Estudio y Asesor recompuestos).
 *
 * Lo que cercan estas pruebas:
 *
 *  - A-1, EL ASESOR SOLO HABLA DE LO QUE PUEDE MOSTRAR: los textos del Asesor
 *    nacen acotados al modo EN LA FUENTE (advisor/rules/coach/awake/area/
 *    engine leen el modo del propio libro, sin importar el registro — la
 *    cerca de grep de la etapa 2 sigue verde). En Esencial NINGÚN texto del
 *    Asesor lleva el carácter «%» (ni % de ingreso, ni meses de colchón, ni
 *    montos proyectados); en Ritmo no hay frases de proyección ni desglose
 *    por naturalezas. Lo esencial (pagos, huecos reales, qué hacer hoy) se
 *    dice en los tres modos.
 *  - LAS TABLAS LOCALES SON EL REGISTRO: las tablas de modo mínimo que cada
 *    motor lleva dentro (reglas, pasos, hallazgos de área) coinciden fila a
 *    fila con FEATURES / RULE_MIN_MODE — verificadas contra el registro, no
 *    de memoria.
 *  - EL CEREBRO NO DUERME: las cifras de la lectura, del coach, del resumen
 *    y de la foto de ahorros son idénticas en los tres modos para el mismo
 *    libro; solo cambia lo que se dice y lo que se muestra.
 *  - E-2/E-3 (cableado): la salud desagregada se retira del Estudio y del
 *    héroe del Asesor con el mismo gesto (la misma familia has()); el
 *    Estudio filtra su lista `visible` por el modo con el mismo mecanismo
 *    que la filtra por datos, y cada carpeta nombra su función.
 *  - ROUND-TRIP: un libro guardado en Esencial reabre en Completo con los
 *    campos dormidos byte a byte (el paquete viaja entero).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { bookMode, readAdvisor, type Reading } from "./advisor.ts";
import { areaReport, type AreaId } from "./area-advice.ts";
import { wake } from "./awake.ts";
import { readCoach } from "./coach.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { buildAdvice, summarize } from "./engine.ts";
import { FEATURES, RULE_MIN_MODE, hasFeature, type FeatureId, type Mode } from "./mode.ts";
import { paceReading, paceSay } from "./patron.ts";
import { adviceRules } from "./rules.ts";
import { withSampleArc } from "./sample.ts";
import { savingsStock } from "./savings.ts";
import type { LedgerState } from "./types.ts";

const MODES: Mode[] = ["esencial", "ritmo", "completo"];
const RANK: Record<Mode, number> = { esencial: 0, ritmo: 1, completo: 2 };
const has = (mode: Mode, f: string) => hasFeature(mode, f as FeatureId);

/** La casa de muestra (el arco completo) fijada en un modo. */
function house(mode: Mode | null, lang: "es" | "en" = "es"): { book: LedgerState; key: string } {
  const book = withSampleArc(createInitial(lang, "claro")).ledger;
  if (mode) book.settings.mode = mode;
  const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
  return { book, key };
}
const cloneAs = (book: LedgerState, mode: Mode): LedgerState => {
  const c = structuredClone(book);
  c.settings.mode = mode;
  return c;
};

/** Todo lo que el Asesor dice de un libro, como lista de textos con nombre. */
function asesorTexts(book: LedgerState, key: string, lang: "es" | "en"): [string, string][] {
  const names = makeNamer(book.structure, lang);
  const today = new Date();
  const r = readAdvisor(book, key, lang, names);
  const rules = adviceRules(book, key, lang, names, { today });
  const coach = readCoach(book, key, lang, names, today);
  const cards = buildAdvice(book, key, lang, names);
  const out: [string, string][] = [];
  const push = (tag: string, v: string | null | undefined) => { if (v) out.push([tag, v]); };
  push("headline", r.headline); push("action", r.action); push("alert", r.alert);
  push("creditBlurb", r.creditBlurb); push("classificationError", r.classificationError);
  push("trendNote", r.trendNote); push("antNote", r.antNote); push("remitNote", r.remitNote);
  push("splitNote", r.splitNote); push("paceNote", r.paceNote); push("vagueQuestion", r.vagueQuestion);
  push("calendarNote", r.calendarNote); push("compareNote", r.compareNote); push("toneLabel", r.toneLabel);
  push("plan", r.plan);
  for (const lv of r.levers) push(`lever.${lv.id}`, lv.text);
  for (const [id, p] of Object.entries(r.parts)) push(`part.${id}`, p.rule);
  for (const rule of rules) { push(`rule.${rule.id}.say`, rule.say); push(`rule.${rule.id}.num`, rule.num); push(`rule.${rule.id}.title`, rule.title); push(`rule.${rule.id}.kicker`, rule.kicker); }
  push("verdict", coach.verdict); push("verdictSub", coach.verdictSub); push("coachPace", coach.paceNote); push("per100", coach.per100Line);
  for (const s of coach.steps) push(`step.${s.id}`, `${s.title} — ${s.detail}`);
  for (const g of coach.glossary) push(`gloss.${g.term}`, g.plain);
  for (const c of cards) {
    push(`card.${c.horizon}.title`, c.title); push(`card.${c.horizon}.lead`, c.lead); push(`card.${c.horizon}.evidence`, c.evidence);
    for (const p of c.points) push(`card.${c.horizon}.pt.${p.label}`, `${p.value}. ${p.note}`);
    if (c.meter) push(`card.${c.horizon}.meter`, c.meter.caption);
  }
  // La capa despierta: un ingreso anotado entre dos fotos del mismo libro.
  const before = structuredClone(book);
  const after = structuredClone(book);
  after.months[key] = { lines: [...(after.months[key]?.lines ?? []), { ...(after.months[key]!.lines[0]!), id: "wake-probe-296", seriesId: "wake-probe-296", kind: "income-variable", concept: "Extra", amountMinor: 50000 }] };
  const w = wake({ before, after, monthKey: key, lang, names: { cat: () => "", sub: (id: string) => id }, planCopied: true, at: new Date().toISOString() });
  push("wake.notice", w.notice);
  for (const f of w.findings) { push(`wake.finding.${f.id}.title`, f.title); push(`wake.finding.${f.id}.body`, f.body); }
  for (const a of AREAS) {
    const rep = areaReport(book, key, lang, names, a, { today });
    push(`area.${a}.caption`, rep.caption); push(`area.${a}.calm`, rep.calm);
    for (const it of rep.items) { push(`area.${a}.item.${it.id}`, `${it.title} ${it.say} ${it.num} ${it.act}`); }
  }
  return out;
}
const AREAS: AreaId[] = ["income", "fixed", "variable", "shops", "subs", "loans", "owed", "save", "meta", "retiro", "emergencia", "remit", "central", "spend"];

describe("modos296: el modo se lee del libro (bookMode)", () => {
  it("sin modo anotado — o con basura — el libro es Completo (X-7)", () => {
    const { book } = house(null);
    assert.equal(bookMode(book), "completo");
    const dirty = structuredClone(book);
    (dirty.settings as { mode?: string }).mode = "turbo";
    assert.equal(bookMode(dirty), "completo");
    assert.equal(bookMode(cloneAs(book, "ritmo")), "ritmo");
  });
});

describe("modos296: en Esencial el Asesor no dice ningún % (A-1)", () => {
  for (const lang of ["es", "en"] as const) {
    it(`casa de muestra, ${lang}: ningún texto del Asesor lleva «%»`, () => {
      const { book, key } = house("esencial", lang);
      const texts = asesorTexts(book, key, lang);
      assert.ok(texts.length > 25, `la cosecha es rica (${texts.length} textos)`);
      for (const [tag, text] of texts) assert.ok(!text.includes("%"), `${tag} dice «%» en Esencial: ${text.slice(0, 120)}`);
    });
  }
  it("los campos de Completo y Ritmo nacen vacíos, no escondidos", () => {
    const { book, key } = house("esencial");
    const names = makeNamer(book.structure, "es");
    const r = readAdvisor(book, key, "es", names);
    assert.equal(r.alert, "");
    assert.equal(r.creditBlurb, "");
    assert.equal(r.toneLabel, "");
    assert.equal(r.classificationError, null);
    assert.equal(r.trendNote, null);
    assert.equal(r.antNote, null);
    assert.equal(r.remitNote, null);
    assert.equal(r.splitNote, null);
    assert.equal(r.contradiction, null);
    assert.deepEqual(r.scenarios, []);
    assert.ok(r.levers.every((l) => l.id === "keep" || l.id === "income"), "en Esencial solo quedan las palancas de hecho");
    assert.ok(r.top.every((t) => t.pctOfOut === null), "el top 5 en Esencial es solo dinero (fallo 29)");
    assert.ok(!r.plan.includes("90 días") && !r.plan.includes("Remesas:"), "el plan en Esencial termina en 30 días y no arrastra la nota de remesas");
    const coach = readCoach(book, key, "es", names, new Date());
    assert.equal(coach.verdictSub, "");
    assert.ok(coach.steps.every((s) => ["income", "vague", "keep"].includes(s.id)), "los pasos de Esencial son anotar, nombrar y seguir así");
  });
  it("lo esencial sí se dice en Esencial: pagos con fecha, hueco y qué hacer", () => {
    const { book, key } = house("esencial");
    const names = makeNamer(book.structure, "es");
    const rules = adviceRules(book, key, "es", names, { today: new Date() });
    assert.ok(rules.length >= 1 && rules.every((x) => x.id === "due"), "en Esencial solo habla la regla de pagos");
    const r = readAdvisor(book, key, "es", names);
    assert.ok(r.calendarNote && r.calendarNote.length > 0, "los pagos de los próximos 30 días se dicen");
    assert.ok(r.action.startsWith("Qué hacer:"), "el qué hacer hoy existe");
  });
});

describe("modos296: en Ritmo no hay proyección ni naturalezas (A-1)", () => {
  const BANNED = [/cerrarías en unos/, /you'd close near/, /en un año si nada cambia/, /in a year if nothing changes/, /quedas libre en/, /debt-free in/, /llegas al faro/, /you get there in/i, /en cuántos meses terminas/, /in how many months you finish/];
  for (const lang of ["es", "en"] as const) {
    it(`casa de muestra, ${lang}: ninguna frase prohibida`, () => {
      const { book, key } = house("ritmo", lang);
      for (const [tag, text] of asesorTexts(book, key, lang)) {
        for (const re of BANNED) assert.ok(!re.test(text), `${tag} proyecta en Ritmo (${re}): ${text.slice(0, 120)}`);
      }
    });
  }
  it("la lectura de Ritmo no trae contradicción de naturalezas ni tarjeta larga", () => {
    const { book, key } = house("ritmo");
    const names = makeNamer(book.structure, "es");
    const r = readAdvisor(book, key, "es", names);
    assert.equal(r.contradiction, null);
    assert.deepEqual(buildAdvice(book, key, "es", names).map((c) => c.horizon), ["short", "medium"]);
    const e = buildAdvice(cloneAs(book, "esencial"), key, "es", names);
    assert.deepEqual(e.map((c) => c.horizon), ["short", "medium"]);
    const c = buildAdvice(cloneAs(book, "completo"), key, "es", names);
    assert.deepEqual(c.map((x) => x.horizon), ["short", "medium", "long"]);
  });
  it("la acción de la lectura no mide el colchón en meses fuera de Completo", () => {
    const { book, key } = house(null);
    for (const mode of ["esencial", "ritmo"] as const) {
      const b = cloneAs(book, mode);
      const r = readAdvisor(b, key, "es", makeNamer(b.structure, "es"));
      assert.ok(!/meses de lo esencial/.test(r.action), `${mode}: ${r.action.slice(0, 140)}`);
    }
  });
  it("la tarjeta mediana fuera de Completo no promete meses ni ordena pagos", () => {
    const { book, key } = house("ritmo");
    const names = makeNamer(book.structure, "es");
    for (const mode of ["esencial", "ritmo"] as const) {
      const med = buildAdvice(cloneAs(book, mode), key, "es", names).find((c) => c.horizon === "medium")!;
      assert.equal(med.meter, null, "sin medidor de crédito fuera de Completo");
      assert.equal(med.nums?.cardUtil, -1, "el uso de tarjetas no viaja en los números fuera de Completo");
      for (const p of med.points) {
        assert.ok(p.label !== "Primero" && p.label !== "Plan de pago" && p.label !== "Recompensas de tarjetas", `punto de Completo en ${mode}: ${p.label}`);
        assert.ok(!/meses terminas|months you finish/.test(p.note), `promesa de fin en ${mode}: ${p.note.slice(0, 100)}`);
      }
    }
  });
});

describe("modos296: las reglas nacen acotadas (registro §3.5)", () => {
  it("Esencial = {due}; Ritmo = {due, category, outlier, recurring, pace}; Completo las contiene", () => {
    const { book, key } = house(null);
    const names = makeNamer(book.structure, "es");
    const sets = Object.fromEntries(MODES.map((m) => [m, new Set(adviceRules(cloneAs(book, m), key, "es", names, { today: new Date() }).map((r) => r.id))])) as Record<Mode, Set<string>>;
    assert.ok([...sets.esencial].every((id) => id === "due"), `Esencial trae ${[...sets.esencial]}`);
    assert.ok([...sets.ritmo].every((id) => ["due", "category", "outlier", "recurring", "pace"].includes(id)), `Ritmo trae ${[...sets.ritmo]}`);
    for (const id of sets.ritmo) assert.ok(sets.completo.has(id), `${id} habla en Ritmo y debe hablar en Completo`);
    for (const id of sets.completo) {
      const min = RULE_MIN_MODE[id as keyof typeof RULE_MIN_MODE];
      assert.ok(min, `${id} sin fila en RULE_MIN_MODE`);
    }
  });
  it("la regla pace en Ritmo es descripción: sin % de hoy ni cierre proyectado", () => {
    const { book, key } = house("ritmo");
    const names = makeNamer(book.structure, "es");
    const pace = adviceRules(book, key, "es", names, { today: new Date() }).find((r) => r.id === "pace");
    assert.ok(pace, "la casa de muestra hace hablar a la regla pace en Ritmo");
    assert.ok(!/cerrarías en unos/.test(pace.say), pace.say);
    assert.ok(!/%/.test(pace.num), pace.num);
  });
  it("paceSay: la forma de Ritmo es lineal y la de Completo conserva el patrón", () => {
    const { book, key } = house(null);
    const rd = paceReading(book, key, new Date());
    assert.ok(rd.day >= 1 && rd.dim >= 28, "la lectura del patrón trae día y días del mes (la descripción lineal los lee)");
    const money = (n: number) => `C$${(n / 100).toFixed(2)}`;
    const lin = paceSay(rd, "es", money, 3547600, "ritmo");
    assert.ok(!lin.say.includes("%"), lin.say);
    assert.ok(!/cerrarías/.test(lin.say), lin.say);
  });
});

describe("modos296: el cerebro no duerme — las cifras no conocen el modo", () => {
  it("lectura, coach, resumen y foto de ahorros: idénticos en los tres modos", () => {
    const { book, key } = house(null);
    const names = makeNamer(book.structure, "es");
    const nums = (b: LedgerState) => {
      const r = readAdvisor(b, key, "es", names);
      const c = readCoach(b, key, "es", names, new Date());
      const s = summarize(b, key, "es");
      const stock = savingsStock(b, key);
      return {
        income: r.income, recurrent: r.recurrentMinor, unique: r.uniqueMinor, transfer: r.transferMinor,
        left: r.left, debt: r.debtMinor, out: r.outTotal, realSpend: r.realSpend, cushionStock: r.cushionStock,
        cushionMinor: r.cushionMinor, topMinors: r.top.map((t) => t.minor), partsMinors: [r.parts.base.minor, r.parts.unique.minor, r.parts.transfer.minor],
        score: c.score, cushionMonths: c.cushionMonths, buckets: c.buckets.map((x) => x.minor), dues: c.dues.map((d) => d.minor),
        sumIncome: s.income, sumExpense: s.expense, sumDebt: s.debt,
        kept: stock ? stock.series.size : 0,
      };
    };
    const base = nums(cloneAs(book, "completo"));
    assert.deepEqual(nums(cloneAs(book, "esencial")), base);
    assert.deepEqual(nums(cloneAs(book, "ritmo")), base);
  });
  it("la capa despierta: la foto numérica es la misma; los hallazgos de destino solo nacen en Completo", () => {
    const { book, key } = house(null);
    const names = { cat: () => "", sub: (id: string) => id };
    const run = (mode: Mode) => {
      const b = cloneAs(book, mode);
      return wake({ before: b, after: b, monthKey: key, lang: "es", names, planCopied: true, at: new Date().toISOString() });
    };
    const [e, r, c] = MODES.map(run);
    assert.deepEqual(e!.snapshot, c!.snapshot);
    assert.deepEqual(r!.snapshot, c!.snapshot);
    assert.ok(e!.findings.every((f) => f.id !== "unassigned" && !f.id.startsWith("horizon")), "en Esencial no nacen hallazgos de destino ni de horizonte");
    assert.ok(r!.findings.every((f) => f.id !== "unassigned" && !f.id.startsWith("horizon")), "en Ritmo tampoco");
    assert.equal(e!.stalePlan, false, "el aviso de plan viejo nace en Ritmo, no en Esencial");
  });
  it("las áreas: los caminos no se dibujan hacia adelante fuera de Completo", () => {
    const { book, key } = house(null);
    const names = makeNamer(book.structure, "es");
    for (const mode of ["esencial", "ritmo"] as const) {
      for (const a of AREAS) {
        const rep = areaReport(cloneAs(book, mode), key, "es", names, a, { today: new Date() });
        if (rep.chart?.type === "path") assert.deepEqual(rep.chart.ahead, [], `el camino de ${a} proyecta en ${mode}`);
      }
    }
  });
});

/* ---------- Las tablas locales de los motores son el registro ---------- */

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/** Lee un literal `const NAME: ... = { ... };` de un archivo y lo devuelve como mapa. */
function tableOf(source: string, name: string): Record<string, string> {
  const m = source.match(new RegExp(`const ${name}[^=]*= \\{([^}]*)\\}`));
  assert.ok(m, `no se encontró la tabla ${name}`);
  const out: Record<string, string> = {};
  for (const pair of m[1]!.matchAll(/"?([\w-]+)"?\s*:\s*"(\w+)"/g)) out[pair[1]!] = pair[2]!;
  return out;
}

describe("modos296: las tablas locales coinciden con el registro", () => {
  it("rules.ts RULE_MIN === RULE_MIN_MODE de mode.ts, fila a fila", () => {
    const local = tableOf(SRC("./rules.ts"), "RULE_MIN");
    assert.deepEqual(local, { ...RULE_MIN_MODE });
  });
  it("coach.ts STEP_MIN === las filas advisor.step-* del registro", () => {
    const local = tableOf(SRC("./coach.ts"), "STEP_MIN");
    const map: Record<string, FeatureId> = {
      income: "advisor.step-income", gap: "advisor.step-close-gap", save: "advisor.step-set-aside",
      cushion: "advisor.step-cushion", wants: "advisor.step-wants-30", debt: "advisor.step-debts",
      subs: "advisor.step-subs", vague: "advisor.step-name", keep: "advisor.step-keep",
    };
    assert.deepEqual(Object.keys(local).sort(), Object.keys(map).sort());
    for (const [step, feature] of Object.entries(map)) assert.equal(local[step], FEATURES[feature], `el paso ${step} discrepa del registro (${feature})`);
  });
  it("area-advice.ts ITEM_MIN === las filas area.* del registro", () => {
    const local = tableOf(SRC("./area-advice.ts"), "ITEM_MIN");
    const map: Record<string, FeatureId> = {
      "owed-late": "area.overdue", "income-steady": "area.income-drift", "save-aside": "area.setaside",
      "retiro-paused": "area.retiro-paused", "remit-up": "area.remit-up", "loans-plan": "area.debt-free", "loans-noplan": "area.debt-stuck",
    };
    assert.deepEqual(Object.keys(local).sort(), Object.keys(map).sort());
    for (const [item, feature] of Object.entries(map)) assert.equal(local[item], FEATURES[feature], `el hallazgo ${item} discrepa del registro (${feature})`);
  });
  it("los motores leen el modo del libro y NO importan el registro (la cerca de grep sigue verde)", () => {
    for (const f of ["./advisor.ts", "./rules.ts", "./coach.ts", "./awake.ts", "./area-advice.ts", "./engine.ts", "./patron.ts"]) {
      const src = SRC(f);
      assert.ok(!/from\s+"[^"]*lib\/faro\/mode"|from\s+"\.\/mode"/.test(src), `${f} importa mode.ts`);
      assert.ok(!/\bFEATURES\b|\bhasFeature\b|\bfeatureForGo\b|\bfeatureMinMode\b/.test(src), `${f} toca el registro`);
    }
    assert.ok(SRC("./advisor.ts").includes("export function bookMode"), "bookMode vive en advisor.ts, la casa común de los motores");
  });
});

/* ---------- Cableado de las caras (E-2, E-3, A-2…A-7) ---------- */

describe("modos296: el cableado de las caras vive en sus asientos", () => {
  const screens = SRC("../../components/faro/screens.tsx");
  const advisor2 = SRC("../../components/faro/advisor2.tsx");
  const panorama = SRC("../../components/faro/panorama.tsx");
  const study2 = SRC("../../components/faro/study2.tsx");
  const areaAdvisor = SRC("../../components/faro/area-advisor.tsx");
  const shell = SRC("../../components/faro/shell.tsx");

  it("E-3: el Estudio filtra `visible` por el modo con el mecanismo de datos, y cada carpeta nombra su función", () => {
    assert.ok(screens.includes("visible={modeVisible}"), "el proveedor recibe la lista ya filtrada por el modo");
    assert.ok(screens.includes("const modeVisible = visible.filter((id) => has(FOLD_FEATURE[id as keyof typeof FOLD_FEATURE]"), "el filtro es has() sobre la misma lista de datos");
    const folds = ["pulse", "health", "pace", "agenda", "waffle", "where", "rule", "movers", "time", "cushion", "plan", "numeros", "sankey", "owed", "loans", "people", "remesas", "earnings", "year", "rewards", "seguro"];
    for (const id of folds) assert.ok(new RegExp(`${id}: "[a-z0-9.-]+"`).test(screens.slice(screens.indexOf("const FOLD_FEATURE"), screens.indexOf("const modeVisible"))), `la carpeta ${id} no nombra su función en FOLD_FEATURE`);
    assert.ok(screens.includes('agenda: "pano.next-dues-reduced"'), "la agenda del Estudio cuelga de la forma reducida (fallo 27)");
    assert.ok(screens.includes('health: "pano.health-note"'), "la salud del Estudio cuelga de pano.health-note");
    assert.ok(screens.includes('cushion: "study.month-jar"'), "la tarjeta de ahorro monta en Ritmo por su frasco (X-11)");
    assert.ok(screens.includes('year: "study.income-sources"') && screens.includes('rewards: "cards.rewards"') && screens.includes('seguro: "ins.premiums-paid"'), "X-12: año, recompensas y seguro cuelgan de su familia");
    // Y el montaje mismo: StatFold dibuja su cascarón siempre, así que la
    // puerta de cada carpeta es su condición de render (el mismo asiento que
    // usa la ausencia por datos) — cada carpeta con modo > Esencial la lleva.
    const gates: [string, string][] = [
      ["pulse", "pano.month-ring"], ["health", "pano.health-note"], ["pace", "pano.runway-linear"], ["waffle", "pano.hundred"],
      ["rule", "pano.rule-503020"], ["movers", "pano.movers"], ["cushion", "study.month-jar"], ["remesas", "study.remit"],
      ["year", "study.income-sources"], ["earnings", "study.income-sources"], ["plan", "study.budget-caps"], ["numeros", "study.key-numbers"],
      ["owed", "study.owed"], ["loans", "study.loans"], ["people", "study.people"], ["rewards", "cards.rewards"], ["seguro", "ins.premiums-paid"],
    ];
    for (const [id, f] of gates) assert.ok(screens.includes(`has("${f}")`), `la carpeta ${id} no monta tras ${f} en screens.tsx`);
    const charts = SRC("../../components/faro/charts.tsx");
    assert.ok(charts.includes('has("study.sankey")') && charts.includes('has("study.where")'), "sankey y where montan tras su función en StudyCharts");
    assert.ok(charts.includes('has("study.where-stores")') && charts.includes('has("study.where-top")'), "los sub-bloques de where (tiendas, top) tras su fila");
  });
  it("E-2: la salud desagregada se retira del héroe y del Estudio con la misma familia has()", () => {
    assert.ok((panorama.match(/has\("advisor\.pillars"\)/g) ?? []).length >= 2, "el héroe retira dial y chequeos tras advisor.pillars");
    assert.ok(panorama.includes("coach.steps.length ?"), "sin pasos en el modo, la sección de pasos se retira entera — nada de encabezado sobre lista vacía");
    assert.ok(screens.includes('health: "pano.health-note"'), "y el Estudio retira su carpeta de salud tras pano.health-note: el mismo gesto");
  });
  it("A-2/A-3: el teaser se computa con has() y el bloque del patrón solo monta en Completo", () => {
    assert.ok(advisor2.includes("export function adviceTeaser(card: AdviceCard, reading: Reading, fmt: (n: number) => string, lang: string, days: number, has: FaroHas)"), "adviceTeaser recibe el filtro");
    assert.ok(screens.includes("adviceTeaser(card, reading, fmt, lang, new Date(ui.year, ui.month, 0).getDate() || 30, has)"), "la pantalla pasa su has al teaser");
    assert.ok(advisor2.includes('r.id === "pace" && has("patron.verdict") ? <PatternBlock'), "PatternBlock monta solo con patron.verdict (Completo)");
    assert.ok(advisor2.includes('has("advisor.credit-meter")'), "el medidor de la tarjeta mediana es de Completo");
    assert.ok(advisor2.includes('has("advisor.cards-usage")'), "la celda de uso de las tarjetas es de Completo (y su (?) muere con ella, A-7)");
    assert.ok(advisor2.includes('has("advisor.month-detail")'), "el detalle del mes es de Ritmo en adelante");
  });
  it("A-4/A-6: la tarjeta de tarjetas y el simulador del plan son de Completo; copiar el plan queda", () => {
    assert.ok(screens.includes('has("loans.payoff-plan") ? <DeferredCard force={forceBelow}><CardsAdvisor'), "CardsAdvisor monta solo con el plan de pago (Completo)");
    assert.ok(screens.includes('has("advisor.scenarios") ? ('), "el simulador monta solo con advisor.scenarios");
    assert.ok(screens.includes('has("advisor.people-tip")') && screens.includes('has("advisor.rewards-note")'), "personas y recompensas del Asesor tras su función");
  });
  it("X-11/E-6: la tarjeta del colchón se parte por sus filas y el lead de topes habla por modo", () => {
    assert.ok(study2.includes('has("study.cushion-dial")'), "viaje y dial tras cushion-dial");
    assert.ok(study2.includes('has("study.committed")'), "«Lo comprometido» tras study.committed");
    assert.ok(study2.includes('has("study.month-jar")') && study2.includes('has("study.pockets-list")'), "frasco y bolsillos tras su fila");
    assert.ok(study2.includes("De lo que te queda por gastar, así va cada categoría"), "el lead de Ritmo de E-6 está escrito");
    assert.ok(study2.includes('const simple = !has("study.flow")'), "la forma simple de Entra/sale/queda nace de study.flow (fallo 28)");
  });
  it("A-5/X-9: el Asesor de área no monta en Esencial y en Ritmo es reducido", () => {
    assert.ok(areaAdvisor.includes('if (!has("area.bars-6m")) return null;'), "sin barras del modo, no hay columna");
    assert.ok(areaAdvisor.includes("is-reduced"), "la forma reducida de Ritmo existe");
    assert.ok(areaAdvisor.includes('(area === "meta" || area === "retiro" || area === "emergencia" || area === "loans")'), "las áreas de Completo no montan en Ritmo");
    assert.ok(shell.includes('const sideArea: AreaId | null = sideAreaRaw && has("area.bars-6m") ? sideAreaRaw : null;'), "el cascarón anula el área en Esencial y la clase has-side la sigue");
    assert.ok(screens.includes('tabletOneAA && has("area.bars-6m")'), "Central tampoco monta el Asesor de área en Esencial");
  });
  it("fallo 27: la AgendaCard en Esencial es el próximo pago y el total, sin línea de tiempo", () => {
    assert.ok(panorama.includes('const reduced = !has("pano.next-dues-timeline");'), "la forma reducida nace de la fila de la línea de tiempo");
    assert.ok(panorama.includes("coach.dues.slice(0, 1)"), "reducida = solo el próximo pago");
  });
});

/* ---------- Round-trip: lo dormido vuelve byte a byte ---------- */

describe("modos296: guardar en Esencial y reabrir en Completo no pierde nada", () => {
  it("el paquete entero viaja byte a byte con el modo anotado", () => {
    const { book } = house("esencial");
    const back = JSON.parse(JSON.stringify(book)) as LedgerState;
    assert.equal(isLedgerDeep(back), true);
    assert.deepEqual(back, book);
    assert.equal(back.settings.mode, "esencial", "el modo viaja con el libro (principio 7)");
    const reopened = cloneAs(back, "completo");
    const names = makeNamer(reopened.structure, "es");
    const key = Object.keys(reopened.months).filter((k) => (reopened.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
    const full = readAdvisor(reopened, key, "es", names);
    const { book: bornFull } = house("completo");
    const born = readAdvisor(bornFull, key, "es", makeNamer(bornFull.structure, "es"));
    assert.equal(full.headline, born.headline, "al reabrir en Completo la lectura entera vuelve, sin pérdida");
    assert.equal(full.creditBlurb, born.creditBlurb);
    assert.deepEqual(full.scenarios.length, born.scenarios.length);
  });
});
