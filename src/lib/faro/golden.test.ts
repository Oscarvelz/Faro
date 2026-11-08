// Batería dorada de Estructura (1.3.133, paso 0 de la reforma de plantillas aprobada por Oscar el 2026-11-07).
// EL CONTRATO: ocultar es presentación y acceso, NUNCA dato. Sobre un libro fijo, en seis estados de
// estructura (nacimiento/completa, Familia, Soltero, Estudiante, Negocio y ajustes a mano con userVis),
// TODAS las cifras del motor y del Asesor deben ser idénticas, la suma de las rebanadas de Estudio debe
// ser idéntica, y el total de savingsOf debe ser idéntico. Si alguna vez la visibilidad mueve una cifra,
// esta batería grita antes de que la versión exista. Las comparaciones de consejos/insights van sin
// textos (solo cifras): los NOMBRES de categorías ocultas son asunto de la regla de nombres («Otros»),
// no de las cifras. Datos sintéticos.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { applyTemplate, createInitial, makeNamer, markUserVis, structureStatusLine, templateExample, templatePreview } from "./defaults.ts";
import { buildAdvice, buildInsights, categorySlices, studyBoard, summarize } from "./engine.ts";
import { isPrimerica, retiroHidden, retiroSub, seedRetiro } from "./retiro.ts";
import { buildWidgetSnapshot, savingsOf } from "./widget.ts";
import type { LedgerState, Line, LineKind, Structure } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = new Date(2026, 9, 22);

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "USD",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "USD",
    icon: "",
    history: [],
    ...partial,
  };
}

/** The fixed golden ledger: lines in Familia (fija y variable), Casa, Seguros y Ahorro — with a
 * vault-type sub (PayPal) and a Retiro line carrying a balance, the two corners the audit flagged. */
function goldenLedger(): LedgerState {
  const ledger = createInitial("es", "claro");
  ledger.settings.display = "USD";
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings category");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  const rows: Array<[string, LineKind, string, number, string, string, Partial<Line>?]> = [
    ["salario", "income-fixed", "Salario", 300000, "", ""],
    ["renta", "expense-fixed", "Renta", 95000, "f-casa", "f.casa.renta"],
    ["hipoteca", "expense-fixed", "Hipoteca", 60000, "f-casa", "f.casa.hipoteca"],
    ["colegiaturas", "expense-fixed", "Colegiaturas", 45000, "f-familia", "f.familia.colegiaturas"],
    ["hijo1", "expense-fixed", "Hijo 1", 20000, "f-familia", "f.familia.hijo1"],
    ["funeraria", "expense-fixed", "Funeraria", 1038, "f-familia", "f.familia.funeraria"],
    ["libros", "expense-variable", "Libros", 15000, "v-familia", "v.familia.libros"],
    ["juguetes", "expense-variable", "Juguetes", 8000, "v-familia", "v.familia.juguetes"],
    ["vida", "expense-fixed", "Seguro de vida", 12000, "f-seguros", "f.seguros.vida"],
    ["meta", "expense-fixed", "Meta", 30000, "f-ahorro", "f.ahorro.meta"],
    ["retiro", "expense-fixed", "Retiro", 20000, "f-ahorro", "f.ahorro.retiro", { balanceMinor: 510000 }],
    ["emergencia", "expense-fixed", "Emergencia", 10000, "f-ahorro", "f.ahorro.emergencia"],
    ["paypal", "expense-fixed", "PayPal", 129900, "f-ahorro", "f.ahorro.paypal", { balanceMinor: 129900 }],
    ["despensa", "expense-variable", "Despensa", 42050, "f-alimentos", "f.alimentos.despensa"],
    ["youtube", "subscription", "YouTube", 505, "f-casa", "f.casa.youtube"],
  ];
  ledger.months[KEY] = {
    lines: rows.map(([id, kind, concept, amountMinor, categoryId, subId, extra]) =>
      line({ id, kind, concept, amountMinor, categoryId, subId, recurring: kind !== "expense-variable", ...(extra ?? {}) }),
    ),
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "salario9", kind: "income-fixed", concept: "Salario", amountMinor: 300000, monthKey: PREV, recurring: true }),
      line({ id: "renta9", kind: "expense-fixed", concept: "Renta", amountMinor: 95000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: PREV, recurring: true }),
      line({ id: "colegiaturas9", kind: "expense-fixed", concept: "Colegiaturas", amountMinor: 45000, categoryId: "f-familia", subId: "f.familia.colegiaturas", monthKey: PREV, recurring: true }),
      line({ id: "meta9", kind: "expense-fixed", concept: "Meta", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.meta", monthKey: PREV, recurring: true }),
    ],
  };
  return ledger;
}

/** Exactly what the eye in Estructura does: flip the flag and record the hand (markUserVis). */
function eyeCat(structure: Structure, catId: string, hidden: boolean): Structure {
  return markUserVis({ ...structure, categories: structure.categories.map((c) => (c.id === catId ? { ...c, hidden } : c)) }, [catId], hidden);
}
function eyeSub(structure: Structure, catId: string, subId: string, hidden: boolean): Structure {
  return markUserVis(
    { ...structure, categories: structure.categories.map((c) => (c.id === catId ? { ...c, subs: c.subs.map((s) => (s.id === subId ? { ...s, hidden } : s)) } : c)) },
    [subId],
    hidden,
  );
}

/** The six structure states of the contract. */
function sixStates(base: LedgerState): Array<{ name: string; ledger: LedgerState }> {
  const withStructure = (structure: Structure): LedgerState => ({ ...base, structure });
  const hand = applyTemplate(eyeSub(eyeCat(eyeCat(base.structure, "f-ahorro", true), "f-familia", true), "f-ahorro", "f.ahorro.paypal", true), "familia");
  return [
    { name: "nacimiento (completa)", ledger: base },
    { name: "Familia", ledger: withStructure(applyTemplate(base.structure, "familia")) },
    { name: "Soltero", ledger: withStructure(applyTemplate(base.structure, "soltero")) },
    { name: "Estudiante", ledger: withStructure(applyTemplate(base.structure, "estudiante")) },
    { name: "Negocio", ledger: withStructure(applyTemplate(base.structure, "negocio")) },
    { name: "a mano (userVis)", ledger: withStructure(hand) },
  ];
}

/** Every figure, no words: strings are blanked so name changes (regla «Otros») never look like figure changes. */
function figures(x: unknown): string {
  const norm = (v: unknown): unknown => {
    if (typeof v === "number" || typeof v === "boolean" || v === null) return v;
    if (typeof v === "string" || v === undefined) return "";
    if (Array.isArray(v)) return v.map(norm);
    if (typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = norm((v as Record<string, unknown>)[k]);
      return out;
    }
    return "";
  };
  return JSON.stringify(norm(x));
}

function capture(ledger: LedgerState) {
  const names = makeNamer(ledger.structure, "es");
  // El pareto de Insights queda fuera de la identidad de cifras a propósito: su conteo de partes
  // es una propiedad de la capa de NOMBRES (cuántos grupos nombrados alcanzan el 80%), y la regla 2
  // cambia esa capa al plegar lo oculto en «Otros». Su dinero se afirma aparte (prueba de nombres):
  // la fracción de «Otros» es exactamente la del dinero plegado, y la suma de rebanadas no se mueve.
  const insights = buildInsights(ledger, KEY, "es", names).filter((i) => i.id !== "pareto");
  // 1.3.147 (Oleada 2, arreglo 4): el donut de studyBoard lee ahora categorySlices — lo oculto se
  // pliega en «Otros» como manda la regla 2 — así que su AGRUPACIÓN es capa de nombres, igual que
  // el pareto: entra a la identidad solo su SUMA (el dinero no se mueve un centavo al plegar).
  // Antes el donut usaba slicesFor crudo y la identidad de cifras fijaba sin querer la fuga: las
  // categorías ocultas conservaban rebanada propia con su monto en cada estado.
  const boardRaw = studyBoard(ledger, KEY, "es", names);
  const board = { ...boardRaw, donut: boardRaw.donut.reduce((a, d) => a + d.minor, 0) };
  return {
    summary: figures(summarize(ledger, KEY, "es")),
    advisor: figures(readAdvisor(ledger, KEY, "es", names, { today: TODAY })),
    advice: figures(buildAdvice(ledger, KEY, "es", names)),
    insights: figures(insights),
    board: figures(board),
  };
}

describe("batería dorada de Estructura — el contrato", () => {
  const states = sixStates(goldenLedger());
  const birth = capture(states[0]!.ledger);

  it("las cifras del motor y del Asesor son idénticas en los seis estados", () => {
    for (const s of states.slice(1)) {
      const got = capture(s.ledger);
      assert.equal(got.summary, birth.summary, `summarize difiere en estado ${s.name}`);
      assert.equal(got.advisor, birth.advisor, `readAdvisor difiere en estado ${s.name}`);
      assert.equal(got.advice, birth.advice, `buildAdvice difiere en estado ${s.name}`);
      assert.equal(got.insights, birth.insights, `buildInsights difiere en estado ${s.name}`);
      assert.equal(got.board, birth.board, `studyBoard difiere en estado ${s.name}`);
    }
  });

  it("la suma de las rebanadas de Estudio es idéntica en los seis estados (solo los nombres pueden cambiar)", () => {
    const sumOf = (l: LedgerState) => categorySlices(l, KEY, makeNamer(l.structure, "es"), "es").reduce((a, s) => a + s.minor, 0);
    const want = sumOf(states[0]!.ledger);
    for (const s of states.slice(1)) assert.equal(sumOf(s.ledger), want, `suma de rebanadas difiere en estado ${s.name}`);
  });

  it("savingsOf es idéntico entre nacimiento y las cuatro plantillas", () => {
    const of = (l: LedgerState) => savingsOf(l, KEY, "es");
    const want = of(states[0]!.ledger);
    assert.ok(want.total > 0, "el libro dorado debe tener ahorro real");
    for (const s of states.slice(1, 5)) {
      const got = of(s.ledger);
      assert.equal(got.total, want.total, `savingsOf.total difiere en estado ${s.name}`);
      assert.equal(got.pocketTotal, want.pocketTotal, `savingsOf.pocketTotal difiere en estado ${s.name}`);
      assert.equal(got.accounts, want.accounts, `savingsOf.accounts difiere en estado ${s.name}`);
    }
  });

  // R-4 CERRADO en el paso 5 (1.3.138): savingsOf filtraba las categorías de ahorro por !hidden y el
  // dinero oculto desaparecía del total mostrado (0 contra 679900 del motor). Desde el paso 5 solo
  // los bolsillos con nombre siguen la visibilidad y lo oculto suma como resto genérico: el total es
  // idéntico en los SEIS estados, incluido el que oculta Ahorro entero a mano.
  // 1.3.147 (Oleada 2, arreglo 1): el total ya no lee solo el mes en curso — es el stock único
  // (savings.ts): al 679900 de octubre se suman los 30000 que la serie «meta9» depositó en
  // septiembre y que siguen ahorrados en octubre. 679900 → 709900; la identidad entre los seis
  // estados — el contrato de esta batería — no se mueve.
  it("savingsOf: el total es idéntico en los seis estados, incluso con Ahorro oculto a mano (R-4)", () => {
    const want = savingsOf(states[0]!.ledger, KEY, "es").total;
    assert.equal(want, 709900);
    for (const s of states.slice(1)) {
      assert.equal(savingsOf(s.ledger, KEY, "es").total, want, `savingsOf.total difiere en estado ${s.name}`);
    }
    // En el estado a mano, todo el ahorro vive en el resto genérico: ningún bolsillo con nombre.
    const hand = savingsOf(states[5]!.ledger, KEY, "es");
    assert.equal(hand.accounts, 0);
    assert.deepEqual(hand.pockets.map((p) => p.id), ["rest"]);
    assert.equal(hand.pocketTotal, 709900);
  });

  it("la base se registra: el nacimiento es «completa» y aplicar una plantilla la escribe con su parche", () => {
    const ledger = goldenLedger();
    assert.equal(ledger.structure.base, "completa");
    for (const id of ["soltero", "familia", "estudiante", "negocio"] as const) {
      assert.equal(applyTemplate(ledger.structure, id).base, id, `applyTemplate(${id}) debe registrar su base`);
    }
    // Un libro viejo (sin el campo) sigue sin base: jamás se adivina hacia atrás.
    const { base: _drop, ...sinBase } = ledger.structure;
    assert.equal((sinBase as Structure).base, undefined);
  });

  it("la línea de estado dice la verdad en cada lectura (base, sin base, con mano)", () => {
    const ledger = goldenLedger();
    assert.equal(structureStatusLine(ledger.structure, "es"), "Base: Completa — todo visible.");
    assert.equal(structureStatusLine(ledger.structure, "en"), "Base: Complete — everything visible.");
    const { base: _drop, ...sinBase } = ledger.structure;
    assert.match(structureStatusLine(sinBase as Structure, "es"), /^Sin base registrada/);
    assert.match(structureStatusLine(sinBase as Structure, "en"), /^No base registered/);
    const conBase = applyTemplate(ledger.structure, "familia");
    assert.equal(structureStatusLine(conBase, "es"), "Base: Familia.");
    const conMano = eyeCat(conBase, "f-casa", true);
    assert.match(structureStatusLine(conMano, "es"), /^Base: Familia · con tus ajustes a mano \(1 ajuste a mano\)/);
    assert.match(structureStatusLine(conMano, "en"), /^Base: Family · with your hand adjustments \(1 hand adjustment\)/);
  });

  it("la vista previa es calculada: diff real, conteo de movimientos y mano protegida", () => {
    const ledger = goldenLedger();
    const soltero = templatePreview(ledger, "soltero", "es");
    assert.equal(soltero.empty, false);
    // Desde el paso 6 (D-6), Soltero cubre la rama entera: también Libros y Juguetes (variable).
    assert.match(soltero.body, /Se oculta: Colegiaturas, Hijo 1, Hijo 2, Formativas, Funeraria, Libros, Juguetes\./);
    // KEY: colegiaturas + hijo1 + funeraria; PREV: colegiaturas — 4 movimientos bajo lo que se esconde.
    assert.match(soltero.body, /Tienes 4 movimientos en Familia: seguirán contando y reaparecerán cuando vuelvas a mostrar la rama\./);
    assert.match(soltero.body, /Tienes 2 movimientos en Familia: seguirán contando/);
    const familia = templatePreview(ledger, "familia", "es");
    assert.equal(familia.empty, true);
    assert.equal(familia.body, "No cambiaría nada en tu estructura.");
    const estudiante = templatePreview(ledger, "estudiante", "es");
    assert.match(estudiante.body, /Se oculta: Hipoteca, Predial, Vida\./);
    assert.match(estudiante.body, /Se agrega: Estudio\./);
    assert.match(estudiante.body, /Tienes 1 movimiento en Casa: seguirán contando/);
    const negocio = templatePreview(ledger, "negocio", "es");
    assert.match(negocio.body, /Se agrega: Negocio\./);
    assert.equal(/Se oculta/.test(negocio.body), false);
    // La mano protege: hipoteca mostrada a mano no se oculta ni se promete — se declara protegida.
    const conMano: LedgerState = { ...ledger, structure: eyeSub(ledger.structure, "f-casa", "f.casa.hipoteca", false) };
    const protegido = templatePreview(conMano, "estudiante", "es");
    assert.match(protegido.body, /Protegido por tu mano \(no cambia\): Hipoteca\./);
    assert.equal(/Se oculta: [^\n]*Hipoteca/.test(protegido.body), false);
  });

  it("los ejemplos son concretos y jamás el lema prohibido", () => {
    for (const id of ["soltero", "familia", "estudiante", "negocio"] as const) {
      for (const lang of ["es", "en"] as const) {
        const ex = templateExample(id, lang);
        assert.ok(ex.length > 10 && ex.length < 140, `ejemplo ${id}/${lang} debe ser una línea corta`);
        assert.equal(/lo que ves|lo que cuenta|what you see|what counts/i.test(ex), false, `ejemplo ${id}/${lang} sin lemas abstractos`);
      }
    }
    assert.match(templateExample("familia", "es"), /Vuelve a mostrar toda la rama de familia/);
  });

  it("regla de nombres: lo oculto se nombra «Otros» en Estudio, el widget y el Asesor", () => {
    const states = sixStates(goldenLedger());
    const hand = states[5]!.ledger; // f-familia oculta a mano (la plantilla Familia no la resucita)
    const slices = categorySlices(hand, KEY, makeNamer(hand.structure, "es"), "es");
    assert.equal(slices.some((s) => s.id === "f-familia"), false, "ninguna rebanada nombra la categoría oculta");
    const otros = slices.find((s) => s.id === "otros");
    assert.ok(otros, "debe existir la rebanada «otros»");
    assert.equal(otros.name, "Otros");
    // El estado a mano oculta DOS categorías: Familia fija (66038) y Ahorro entero (189900).
    assert.equal(otros.minor, 255938, "el dinero de las categorías ocultas suma igual, bajo «Otros»");
    assert.equal(slices.find((s) => s.id === "v-familia")?.minor, 23000, "la rama visible conserva su nombre");
    // Soltero oculta SUBconceptos, no la categoría: la rebanada sigue nombrando Familia, completa.
    const soltero = states[2]!.ledger;
    const sSoltero = categorySlices(soltero, KEY, makeNamer(soltero.structure, "es"), "es");
    assert.equal(sSoltero.find((s) => s.id === "f-familia")?.minor, 66038);
    assert.equal(sSoltero.some((s) => s.id === "otros"), false);
    // Widget de inicio: su top por categoría hereda la misma regla desde las rebanadas.
    const snap = buildWidgetSnapshot(hand, "es", { today: "2026-10-22", hide: false, lock: false });
    assert.ok(snap.cats.some((c) => c.name === "Otros" && c.amt === 255938), "el widget nombra «Otros», no la categoría oculta");
    // Insights (pareto): la parte «Otros» lleva la misma fracción del gasto que las categorías plegadas.
    const insights = buildInsights(hand, KEY, "es", makeNamer(hand.structure, "es"));
    const pareto = insights.find((i) => i.id === "pareto");
    const totalSlices = slices.reduce((a, s) => a + Math.max(0, s.minor), 0);
    const otrosPart = pareto?.viz?.kind === "parts" ? pareto.viz.parts.find((p) => p.name === "Otros") : undefined;
    assert.ok(otrosPart, "el pareto de Insights nombra «Otros»");
    assert.ok(Math.abs((otrosPart?.share ?? 0) - 255938 / totalSlices) < 1e-9, "la fracción de «Otros» es la del dinero plegado");
    // Asesor: las líneas de la categoría oculta se etiquetan «Otros»; visibles, con su nombre.
    const readHand = readAdvisor(hand, KEY, "es", makeNamer(hand.structure, "es"), { today: TODAY });
    assert.ok(readHand.lines.filter((l) => l.categoryId === "f-familia").every((l) => l.category === "Otros"));
    const readBirth = readAdvisor(states[0]!.ledger, KEY, "es", makeNamer(states[0]!.ledger.structure, "es"), { today: TODAY });
    assert.ok(readBirth.lines.filter((l) => l.categoryId === "f-familia").every((l) => l.category === "Familia"));
  });

  it("las funciones buscan por rol: Retiro resuelve aunque esté oculto, y lo oculto se declara", () => {
    const ledger = goldenLedger();
    assert.deepEqual(retiroSub(ledger), { catId: "f-ahorro", subId: "f.ahorro.retiro" });
    assert.equal(retiroHidden(ledger), false);
    const hiddenCat: LedgerState = { ...ledger, structure: eyeCat(ledger.structure, "f-ahorro", true) };
    assert.deepEqual(retiroSub(hiddenCat), { catId: "f-ahorro", subId: "f.ahorro.retiro" }, "ocultar la categoría ya no apaga el bolsillo");
    assert.equal(retiroHidden(hiddenCat), true);
    const hiddenSub: LedgerState = { ...ledger, structure: eyeSub(ledger.structure, "f-ahorro", "f.ahorro.retiro", true) };
    assert.deepEqual(retiroSub(hiddenSub), { catId: "f-ahorro", subId: "f.ahorro.retiro" });
    assert.equal(retiroHidden(hiddenSub), true);
    // Sembrar el bolsillo vuelve a funcionar con el bolsillo oculto (antes devolvía el estado intacto, en silencio).
    const seeded = seedRetiro(hiddenSub, KEY);
    assert.ok(seeded.months[KEY]?.lines.some((l) => l.subId === "f.ahorro.retiro" && isPrimerica(l)));
  });

  it("Soltero cubre la rama de familia entera, fija y variable (D-6)", () => {
    const ledger = goldenLedger();
    const next = applyTemplate(ledger.structure, "soltero");
    const vFam = next.categories.find((c) => c.id === "v-familia");
    assert.ok(vFam?.subs.every((s) => s.hidden), "libros y juguetes quedan ocultos");
    const fFam = next.categories.find((c) => c.id === "f-familia");
    assert.ok(fFam?.subs.filter((s) => s.id !== "f.familia.otros").every((s) => s.hidden));
  });

  it("el respaldo guarda TODO: estructura (con la mano) y ajustes sobreviven la ida y vuelta", () => {
    // El sobre del respaldo es el de src/spa/vault.ts (payload): el libro entero, tal cual.
    const ledger = states[5]!.ledger;
    const envelope = JSON.stringify({ app: "FARO", v: 1, exportedAt: new Date().toISOString(), ledger });
    const restored = (JSON.parse(envelope) as { ledger: LedgerState }).ledger;
    assert.deepEqual(restored.structure, ledger.structure);
    assert.deepEqual(restored.settings, ledger.settings);
    assert.ok(Object.keys(restored.structure.userVis ?? {}).length >= 3, "la mano (userVis) debe viajar en el respaldo");
  });
});
