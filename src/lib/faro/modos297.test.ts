/**
 * FARO — «Los tres modos», etapa 3.3 (Folios, Ajustes, widget y salidas).
 *
 * Lo que cercan estas pruebas:
 *
 *  - T-5: el censo de alertas se DERIVA en la fuente — `alertCensus` corre los
 *    constructores como Completo y sin filtro, así que sus conteos son los de
 *    `adviceRules` en Completo diga lo que diga el modo del libro, y
 *    `modeImpact` solo cuenta lo que hoy llega y en el destino deja de llegar
 *    (X-19: pace cambia de forma en Ritmo, no deja de llegar; en Esencial sí).
 *  - T-1/X-17: la foto del widget se compone por modo en la fuente — las
 *    cifras héroe y los datos de los avisos universales (vencimientos, flujo)
 *    son idénticos en los tres modos; los bloques de cara dormidos salen en
 *    cero o vacíos; el bloque pace viaja siempre presente (real en Completo,
 *    descriptivo sin veredicto ni proyección en Ritmo, vacío en Esencial) y
 *    ninguna proyección sale de la foto fuera de Completo.
 *  - Fo-4: `intersectViewFilters` apaga al aplicar los filtros cuya función
 *    duerme, sin mutar la copia del aparato.
 *  - Fo-5/X-21/X-22: `pickForMode` intersecta en la entrada del motor de
 *    documentos — ningún documento lleva secciones dormidas y el Resumen es
 *    idéntico en los tres modos.
 *  - El respaldo del libro es entero en todo modo: el payload de vault.ts
 *    envuelve el ledger completo, sin filtro de modo, y el libro viaja byte
 *    a byte (con sus ajustes dormidos intactos tras el viaje de modos).
 *  - Fo-1/S-3: la cara lectora de deudas no lleva ningún verbo (ni commit,
 *    ni pago, ni archivo) y todas las puertas de deuda validan en el punto
 *    único (featureForGo).
 *  - J-7: esconder el ajuste y esconder la función son el mismo gesto — los
 *    pares ajuste/función del registro comparten modo mínimo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { buildSheets, pickForMode, EXPORT_KINDS, type ExportPick } from "./export-docs.ts";
import { buildStream, intersectViewFilters, type StreamFilters } from "./historial.ts";
import { FEATURES, featureForGo, hasFeature, modeImpact, type FeatureId, type Mode } from "./mode.ts";
import { paceReading } from "./patron.ts";
import { adviceRules, alertCensus } from "./rules.ts";
import { withSampleArc } from "./sample.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import type { LedgerState } from "./types.ts";

const MODES: Mode[] = ["esencial", "ritmo", "completo"];
const has = (mode: Mode, f: string) => hasFeature(mode, f as FeatureId);
const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

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

/* ---------- T-5: el censo derivado en la fuente ---------- */

describe("modos297: el censo de alertas nace en la fuente (T-5)", () => {
  it("alertCensus cuenta lo que adviceRules construye en Completo, en cualquier modo del libro", () => {
    const { book, key } = house("completo");
    const names = makeNamer(book.structure, "es");
    const today = new Date(`${key}-15T12:00:00`);
    const perId = new Map<string, number>();
    for (const r of adviceRules(book, key, "es", names, { today })) perId.set(r.id, (perId.get(r.id) ?? 0) + 1);
    const census = alertCensus(book, key, "es", names, { today });
    assert.deepEqual(new Map(census.map((c) => [c.id, c.count])), perId, "el censo es la construcción misma, sin el filtro del modo");
    // El censo no depende del modo anotado en el libro: se deriva como Completo.
    for (const m of MODES) {
      const again = alertCensus(cloneAs(book, m), key, "es", names, { today });
      assert.deepEqual(again, census, `el censo de un libro en ${m} es el mismo: nace antes del filtro`);
    }
  });

  it("modeImpact cuenta solo lo que deja de llegar (X-19: pace cambia de forma en Ritmo)", () => {
    const { book } = house("completo");
    const names = makeNamer(book.structure, "es");
    const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
    const census = alertCensus(book, key, "es", names, { today: new Date(`${key}-15T12:00:00`) });
    const paceCount = census.find((c) => c.id === "pace")?.count ?? 0;
    const toRitmo = modeImpact(book, "ritmo", "es");
    const toEsencial = modeImpact(book, "esencial", "es");
    const toCompleto = modeImpact(book, "completo", "es");
    assert.equal(toCompleto.alerts.length, 0, "sin bajada no hay impacto de avisos");
    assert.ok(!toRitmo.alerts.some((a) => a.id === "pace"), "bajar a Ritmo NO cuenta pace: sigue llegando en forma lineal");
    if (paceCount > 0) {
      const lost = toEsencial.alerts.find((a) => a.id === "pace");
      assert.equal(lost?.count, paceCount, "bajar a Esencial sí cuenta pace, con el conteo del censo");
    }
    for (const a of [...toRitmo.alerts, ...toEsencial.alerts]) {
      const c = census.find((x) => x.id === a.id);
      assert.ok(c && a.count <= c.count, `ningún impacto inventa avisos: ${a.id} ≤ censo`);
    }
  });
});

/* ---------- T-1/X-17: la foto del widget se compone por modo ---------- */

describe("modos297: la foto del widget (T-1)", () => {
  const snap = (book: LedgerState, key: string, mode: Mode) =>
    buildWidgetSnapshot(cloneAs(book, mode), "es", { today: `${key}-15`, hide: false, lock: false });

  it("las cifras héroe y los datos de avisos universales no conocen el modo", () => {
    const { book, key } = house("completo");
    const [e, r, c] = MODES.map((m) => snap(book, key, m));
    for (const s of [r, c]) {
      assert.equal(s.have, e.have); assert.equal(s.spend, e.spend);
      assert.equal(s.left, e.left); assert.equal(s.tone, e.tone);
      assert.deepEqual(s.dues, e.dues, "los vencimientos viajan reales: su aviso es de Esencial");
      assert.deepEqual(s.flow, e.flow, "el flujo viaja real: su aviso de cierre es de todos los modos");
    }
    // ENMIENDA OLA 3 (BR3-3): usedPct ya no es cifra héroe — es spentPct,
    // la semilla de la proyección expulsada de la torre en la ola 2, y en
    // la foto solo la consume la torre de ritmo (Completo): viaja con
    // valor SOLO en Completo y null en Esencial y en Ritmo. tone, en
    // cambio, SIGUE sin conocer el modo, y la razón queda escrita: es el
    // color del semáforo de deuda (pagos contra los topes propios), cuya
    // cara vive en los tres modos — estado honesto, no la cifra de ritmo.
    assert.equal(e.usedPct, null, "Esencial: usedPct no viaja con valor");
    assert.equal(r.usedPct, null, "Ritmo: usedPct no viaja con valor");
    assert.equal(typeof c.usedPct, "number", "Completo: usedPct viaja con su valor");
    assert.equal(e.mode, "esencial"); assert.equal(r.mode, "ritmo"); assert.equal(c.mode, "completo");
  });

  it("los bloques de cara dormidos salen en cero o vacíos; Σ bolsillos = saveTotal donde la cara vive", () => {
    const { book, key } = house("completo");
    const [e, r, c] = MODES.map((m) => snap(book, key, m));
    assert.equal(e.pay, 0); assert.equal(e.owed, 0); assert.equal(e.owe, 0);
    assert.equal(e.saveTotal, 0); assert.equal(e.saveMonth, 0); assert.equal(e.saveGoal, 0);
    assert.equal(e.saveKept, 0); assert.equal(e.savePledged, 0);
    assert.deepEqual(e.pockets, []); assert.deepEqual(e.cats, []);
    assert.deepEqual(e.qhIn, []); assert.deepEqual(e.qhOut, []);
    assert.deepEqual(e.qpIn, []); assert.deepEqual(e.qpOut, []); assert.deepEqual(e.qsOut, []);
    for (const s of [r, c]) {
      assert.equal(s.pay, c.pay); assert.equal(s.owed, c.owed); assert.equal(s.owe, c.owe);
      assert.equal(s.saveTotal, c.saveTotal);
      assert.equal(s.pockets.reduce((a, p) => a + p.amt, 0), s.saveTotal, "Σ bolsillos == saveTotal, siempre");
      assert.deepEqual(s.cats.map((x) => [x.name, x.amt]), c.cats.map((x) => [x.name, x.amt]), "las categorías de Ritmo son las de Completo, sin la comparación");
    }
    assert.ok(r.cats.every((x) => x.prev === 0), "en Ritmo prev viaja en cero: solo lo pinta la comparación (Completo)");
    assert.ok(c.cats.some((x) => x.prev > 0), "en Completo la comparación trae el mes pasado real");
    assert.ok(r.pockets.every((p) => !("fund" in p)), "la luz de naturaleza de un bolsillo es solo de Completo");
  });

  it("el bloque pace viaja siempre presente y ninguna proyección sale fuera de Completo (X-17)", () => {
    const { book, key } = house("completo");
    const [e, r, c] = MODES.map((m) => snap(book, key, m));
    const reading = paceReading(cloneAs(book, "completo"), key, new Date(`${key}-15T12:00:00`));
    assert.equal(c.pace.status, reading.status);
    assert.equal(c.pace.projected, reading.projectedMinor, "en Completo la foto lleva la lectura entera");
    assert.deepEqual(e.pace, { status: "learning", verdict: null, spent: 0, expected: 0, projected: 0, income: 0 },
      "en Esencial el bloque viaja vacío: presente, para que el shell no proyecte por su cuenta");
    assert.equal(r.pace.status, "learning");
    assert.equal(r.pace.verdict, null);
    assert.equal(r.pace.projected, 0, "en Ritmo no hay proyección que imprimir");
    assert.equal(r.pace.spent, c.pace.spent, "la descripción de Ritmo es la real (gastado)");
    assert.equal(r.pace.expected, c.pace.expected, "la descripción de Ritmo es la real (esperado)");
  });

  it("las fijas dormidas se filtran de la foto y vuelven al subir, sin tocar la lista guardada", () => {
    const { book, key } = house("completo");
    const store = book.structure.catalog.find((x) => (x.kind === "store" || x.kind === "ai") && !x.hidden);
    assert.ok(store, "la casa de muestra trae una pieza fijable del catálogo");
    book.settings.widgetPins = [...(book.settings.widgetPins ?? []), { c: "", s: "", store: store.id }];
    const [e, r, c] = MODES.map((m) => snap(book, key, m));
    assert.ok(c.qpOut.length + c.qpIn.length > 0, "las fijas del dueño viven en Completo");
    assert.equal(r.qpOut.length + r.qpIn.length, c.qpOut.length + c.qpIn.length, "las fijas del dueño viven desde Ritmo");
    assert.equal(e.qpOut.length + e.qpIn.length, 0, "en Esencial ninguna fija del dueño viaja");
    assert.equal(c.qsOut.length, 1, "la fija del catálogo vive en Completo");
    assert.equal(r.qsOut.length, 0, "la fija del catálogo duerme en Ritmo");
    assert.equal(e.qsOut.length, 0, "la fija del catálogo duerme en Esencial");
    assert.ok((book.settings.widgetPins ?? []).some((p) => p.store === store.id), "la lista guardada no se toca al fotografiar");
  });
});

/* ---------- Fo-4/Fo-2: los filtros de Folios se intersectan al aplicar ---------- */

describe("modos297: los filtros del río y el modo (Fo-4)", () => {
  const full: StreamFilters = {
    from: "2026-11-01", to: "2026-11-30", direction: "out", categoryId: "cat.x", subId: "sub.x",
    group: "fixed", merchantId: "temu", accountId: "acct.1", minMinor: 100, maxMinor: 5000,
    origin: "import", batchId: "lote.1", recurring: true, text: "algo",
  };

  it("un filtro cuya función duerme no se aplica; lo universal pasa intacto y la entrada no se muta", () => {
    const before = structuredClone(full);
    const eff = intersectViewFilters(full, (f) => has("esencial", f));
    assert.deepEqual(full, before, "la copia del aparato jamás se reescribe: la intersección no muta su entrada");
    assert.equal(eff.group, undefined); assert.equal(eff.merchantId, undefined);
    assert.equal(eff.accountId, undefined); assert.equal(eff.minMinor, undefined);
    assert.equal(eff.maxMinor, undefined); assert.equal(eff.recurring, undefined);
    assert.equal(eff.origin, undefined); assert.equal(eff.batchId, undefined);
    assert.equal(eff.direction, "out"); assert.equal(eff.categoryId, "cat.x");
    assert.equal(eff.from, "2026-11-01"); assert.equal(eff.to, "2026-11-30"); assert.equal(eff.text, "algo");
    assert.deepEqual(intersectViewFilters(full, (f) => has("completo", f)), full, "en Completo todo filtro pasa");
    const ritmo = intersectViewFilters(full, (f) => has("ritmo", f));
    assert.equal(ritmo.group, "fixed"); assert.equal(ritmo.accountId, "acct.1");
    assert.equal(ritmo.origin, undefined, "el origen duerme en Ritmo (X-20)");
    assert.equal(ritmo.batchId, undefined, "sin origen no hay lote");
  });

  it("el lote cae sin su función aunque el origen viva, y el río obedece la intersección", () => {
    const eff = intersectViewFilters(full, (f) => f !== "hist.filter-import-lot");
    assert.equal(eff.origin, "import"); assert.equal(eff.batchId, undefined);
    const { book } = house("completo");
    const acct = Object.values(book.months).flatMap((m) => m.lines).find((l) => l.sourceId || l.cardId);
    assert.ok(acct, "la casa trae líneas con cuenta o tarjeta");
    const view: StreamFilters = { accountId: (acct.sourceId || acct.cardId) as string };
    const sum = (rows: ReturnType<typeof buildStream>) => rows.reduce((a, m) => a + m.amountMinor, 0);
    const filtered = buildStream(book, intersectViewFilters(view, (f) => has("completo", f)));
    const dormant = buildStream(book, intersectViewFilters(view, (f) => has("esencial", f)));
    const unfiltered = buildStream(book, {});
    assert.equal(sum(dormant), sum(unfiltered), "en Esencial la vista guardada no filtra por la cuenta dormida");
    assert.ok(filtered.length < unfiltered.length, "en Completo la misma vista sí filtra");
  });
});

/* ---------- Fo-5: las salidas presentan lo que su panel presenta ---------- */

describe("modos297: las salidas por modo (Fo-5)", () => {
  const fullPick: ExportPick = {
    scope: "month", activeOnly: false, kinds: [...EXPORT_KINDS],
    savings: true, debt: true, summary: true, charts: true, advice: true, remit: true,
  };
  const FORBIDDEN = ["Prestamos", "Tarjetas", "Recompensas", "Me deben", "Plan de pago", "Remesas", "Asesor", "Flujo", "Categorias"];

  it("pickForMode intersecta por modo y no toca la elección de Completo", () => {
    assert.deepEqual(pickForMode(fullPick, "completo"), fullPick);
    const r = pickForMode(fullPick, "ritmo");
    assert.deepEqual([r.savings, r.debt, r.charts, r.advice, r.remit], [true, false, false, false, false], "Ritmo conserva Ahorros (X-22) y apaga la familia de Completo");
    const e = pickForMode(fullPick, "esencial");
    assert.deepEqual([e.savings, e.debt, e.charts, e.advice, e.remit], [false, false, false, false, false]);
    assert.equal(e.summary, true); assert.equal(r.summary, true);
  });

  it("ningún documento lleva secciones dormidas y el Resumen es el mismo en los tres modos", () => {
    const { book, key } = house("completo");
    const names = makeNamer(book.structure, "es");
    const sheetsOf = (m: Mode) => buildSheets(cloneAs(book, m), key, "es", names, fullPick);
    const resumen = (m: Mode) => sheetsOf(m).find((s) => s.name === "Resumen");
    assert.deepEqual(resumen("esencial"), resumen("completo"), "el Resumen no conoce el modo");
    assert.deepEqual(resumen("ritmo"), resumen("completo"));
    for (const m of ["esencial", "ritmo"] as Mode[]) {
      const names33 = sheetsOf(m).map((s) => s.name);
      for (const f of FORBIDDEN) assert.ok(!names33.includes(f), `en ${m} no sale la hoja dormida «${f}»`);
    }
    const completoNames = sheetsOf("completo").map((s) => s.name);
    assert.ok(completoNames.includes("Asesor") && completoNames.includes("Plan de pago"), "en Completo el documento entero sale");
    const movs = (m: Mode) => sheetsOf(m).find((s) => s.name === "Movimientos")?.rows.length ?? 0;
    assert.ok(movs("esencial") <= movs("ritmo") && movs("ritmo") <= movs("completo"), "las líneas de Movimientos nunca crecen al bajar de modo");
    assert.ok(sheetsOf("ritmo").length < sheetsOf("completo").length, "el documento de Ritmo es el de Completo menos sus secciones dormidas");
    // El PDF pasa por la MISMA intersección en su entrada: buildPdfPages no se
    // exporta, así que la cerca lee la fuente del motor — las dos entradas
    // (hojas y páginas) aplican pickForMode con el modo del propio libro.
    const docs = SRC("./export-docs.ts");
    assert.equal((docs.match(/pick = pickForMode\(pick, bookModeOf\(ledger\)\)/g) ?? []).length, 2,
      "buildSheets y buildPdfPages intersectan la elección en su entrada: ningún llamante cuela una bandera dormida");
  });
});

/* ---------- El respaldo es entero; los ajustes dormidos sobreviven ---------- */

describe("modos297: el respaldo del libro y el viaje de modos", () => {
  it("el payload del respaldo envuelve el ledger entero, sin filtro de modo (vault.ts)", () => {
    const vault = SRC("../../spa/vault.ts");
    const payload = vault.slice(vault.indexOf("function payload"), vault.indexOf("export async function gzip"));
    assert.ok(payload.includes("ledger"), "el respaldo lleva el ledger como va");
    assert.ok(!/settings\.mode|hasFeature|pickForMode|modeOf/.test(payload), "ningún filtro de modo toca el respaldo: copiar no es mostrar");
  });

  it("un ajuste dormido sobrevive al viaje Esencial → guardado → Completo, byte a byte", () => {
    const { book } = house("completo");
    book.settings.emergencyMonths = 5;
    book.settings.savingsGoalPct = 25;
    const pinsBefore = structuredClone(book.settings.widgetPins ?? []);
    const dropped = cloneAs(book, "esencial");
    const back = JSON.parse(JSON.stringify(dropped)) as LedgerState;
    assert.equal(isLedgerDeep(back), true);
    assert.deepEqual(back, dropped, "el paquete guardado en Esencial viaja entero");
    const reopened = cloneAs(back, "completo");
    assert.equal(reopened.settings.emergencyMonths, 5, "el colchón (su ajuste duerme en Esencial) vuelve intacto");
    assert.equal(reopened.settings.savingsGoalPct, 25, "la meta de ahorro vuelve intacta");
    assert.deepEqual(reopened.settings.widgetPins ?? [], pinsBefore, "las fijas dormidas vuelven intactas");
    assert.deepEqual(reopened.months, book.months, "los meses no se tocan en el viaje");
    assert.deepEqual(reopened.structure, book.structure, "la estructura no se toca en el viaje");
  });
});

/* ---------- Fo-1/S-3: el Archivo no es puerta trasera; las puertas cierran en un punto ---------- */

describe("modos297: la cara lectora no tiene verbos y las puertas de deuda cierran en un punto", () => {
  it("DebtsReadOnly no lleva commit, ni pago, ni archivo: es lectura pura", () => {
    const debts = SRC("../../components/faro/debts.tsx");
    const body = debts.slice(debts.indexOf("export function DebtsReadOnly"), debts.indexOf("export function SeeAll"));
    assert.ok(body.length > 500, "la cara lectora existe y tiene cuerpo");
    for (const verb of ["commit(", "PaySheet", "ArchiveSheet", "toggleArchive", "onPay", "deleteLine"]) {
      assert.ok(!body.includes(verb), `la cara lectora no conoce el verbo ${verb}`);
    }
  });

  it("featureForGo conoce todas las puertas de deuda y de salida (S-3)", () => {
    assert.equal(featureForGo({ screen: "cobros" }), "debt.facts");
    assert.equal(featureForGo({ screen: "vault-owed" }), "debt.facts");
    assert.equal(featureForGo({ screen: "vault-owe" }), "debt.facts");
    assert.equal(featureForGo({ screen: "vault-owed", anchor: "debt-scale" }), "debt.scale");
    assert.equal(featureForGo({ screen: "vault-owe", anchor: "debt-plan" }), "loans.payoff-plan");
    assert.equal(featureForGo({ screen: "desk", lens: "debt" }), "central.lens-pagos");
    assert.equal(featureForGo({ screen: "top", anchor: "top-export" }), "export.panel");
    // Y la validación las duerme donde el registro manda:
    assert.equal(has("esencial", "debt.facts"), true, "los hechos de deuda se leen en Esencial: la lectora tiene puerta");
    assert.equal(has("esencial", "debt.scale"), false);
    assert.equal(has("esencial", "export.panel"), false);
    assert.equal(has("ritmo", "export.panel"), true);
  });

  it("el host del widget remapea en Esencial y valida todo toque por goTopic (T-1)", () => {
    const host = SRC("../../components/faro/widget-host.tsx");
    assert.ok(host.includes('go === "pagos"'), "el toque de cuota se remapea sin la escala");
    assert.ok(host.includes('place = { screen: "desk" }'), "el remapeo cae en Central, donde las cuotas se leen");
    assert.ok(host.includes("goTopic("), "todo toque del widget pasa por el punto único de validación");
    assert.ok(host.includes('has("widget.pins-manage")') && host.includes('has("widget.pin-from-catalog")') && host.includes('has("widget.last-push")'),
      "la tarjeta del widget se recompone: gestión de fijas, buscador y parte del empujón con su puerta");
  });
});

/* ---------- J-2/J-3/J-5/J-7: Ajustes se recompone con el mismo gesto ---------- */

describe("modos297: Ajustes recompuesto (J-2, J-3, J-5, J-7)", () => {
  it("el cableado de la recomposición vive en las superficies", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('has("settings.banks")'), "Bancos se esconde como componente entero (J-3)");
    assert.ok(screens.includes('has("settings.import-row")'), "la fila de importar sigue a su función (J-3)");
    assert.ok(screens.includes('has("settings.savings-goal")'), "el pliegue de la tasa se disuelve sin su función (J-2)");
    assert.ok((screens.match(/\{rateRow\}/g) ?? []).length >= 2, "la fila de la tasa es UNA pieza con dos asientos: pliegue y fila suelta (J-2)");
    assert.ok(screens.includes('has("subs.cuota")'), "el grupo de gestos de cuotas se esconde entero (J-5)");
    const notify = SRC("../../components/faro/notify-row.tsx");
    assert.ok(notify.includes('has("widget.face-pace")'), "el texto de avisos nombra el ritmo solo donde el ritmo suena (J-4)");
    const panel = SRC("../../components/faro/export-panel.tsx");
    assert.ok(panel.includes("pickForMode"), "el panel corre y comparte la elección ya intersectada (Fo-5)");
    const shell = SRC("../../components/faro/shell.tsx");
    assert.ok(shell.includes('has("export.panel")'), "el panel no monta en Esencial (X-21)");
  });

  it("esconder el ajuste y esconder la función son el mismo gesto (J-7)", () => {
    const pairs: [FeatureId, FeatureId][] = [
      ["settings.banks", "settings.bank-sources"],
      ["settings.import-row", "import.bank"],
      ["settings.savings-goal", "vault.meta"],
      ["settings.widget-pins", "widget.pins-manage"],
      ["widget.pins-manage", "widget.face-pins"],
    ];
    for (const [a, b] of pairs) {
      assert.equal(FEATURES[a], FEATURES[b], `${a} y ${b} comparten modo mínimo: un solo gesto los esconde`);
    }
  });
});
