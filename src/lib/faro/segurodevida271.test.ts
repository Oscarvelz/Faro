/**
 * FARO 1.3.271 — «Seguro de vida» (Oscar, 2026-11-14 09:37–09:45 EST; steer
 * retrospectivo el mismo día, 09:48 EST).
 *
 * Su lógica, en sus palabras: un seguro de vida no es un retiro y desde luego
 * no es un ahorro, porque ese dinero no se puede retirar. Es protección que
 * se renta: la prima es un gasto fijo, el cobro es una obligación, y la
 * póliza NUNCA es un activo — contarla sería el pecado del dinero fantasma.
 * La personalización es la ley («the app should be shaped by the user
 * instead of the other way around»): su importe no aparece en ninguna
 * parte; la pieza de fábrica nace sin importe y el usuario pone el suyo,
 * con su momento (día fijo o semana del mes — su cobro cae en la segunda
 * semana) y su cuenta de cobro. Y el steer: la fecha de inicio y el conteo
 * retrospectivo — meses desde que empezó y las primas ANOTADAS sumadas,
 * nunca meses × importe.
 *
 * Lo que cercan estas pruebas:
 *  - La pieza y su grupo: una sola pieza de fábrica kind "ins", sin plan
 *    (sin importe), en su grupo propio del Catálogo.
 *  - El importe de Oscar no existe en src (ni su forma en centavos).
 *  - «Primerica» solo vive donde ya vivía (el preset de Retiro y su
 *    familia) más la pieza de fábrica y esta lección: nada nuevo la nombra.
 *  - La matemática de la semana: la ventana de la semana n abre el día
 *    7·(n−1)+1 y duesWindow la lee por la vía única, día a día.
 *  - No es un activo: con la prima anotada, savingsStock es idéntico al
 *    libro sin ella y el resumen la cuenta SOLO como gasto fijo.
 *  - La línea permanente: una, en Seguros · Vida, ligada por providerId,
 *    rueda con copyRecurring y los meses pasados no se reescriben.
 *  - Soberanía: la semilla pone la pieza una vez; borrada, no vuelve;
 *    oculta, sigue oculta; el inicio sobrevive a la semilla.
 *  - No se puede fijar: la mano solo ofrece pin a tiendas e IA (fuente) y
 *    el snapshot del widget no gana nada con una pieza de seguro fijada
 *    a la fuerza en los datos.
 *  - Libros no gana lente ni sección: SECTIONS queda byte a byte.
 *  - La retrospectiva: monthsSince exacto entre años, 0 hoy, null en el
 *    futuro; insPaid suma líneas anotadas y un cambio de importe a mitad
 *    de historia no reescribe el pasado.
 *  - i18n: las 27 claves nuevas existen en los dos diccionarios.
 *  - El Manual: la lección «seguro-vida» y el campo «f-seguro-inicio»
 *    existen, y las dos tarjetitas de ayuda están sembradas en la fuente.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, defaultStructure, withSeguroDeVida } from "./defaults.ts";
import { insDraftOn, insNextOn, insPaid, monthsSince, syncInsLine } from "./insurance.ts";
import { duesWindow } from "./dues.ts";
import { copyRecurring } from "./reducer.ts";
import { summarize } from "./engine.ts";
import { savingsStock } from "./savings.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import { SECTIONS } from "./types.ts";
import type { CatalogItem, InsPlan, LedgerState } from "./types.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = src("../../components/faro/screens.tsx");
const i18n = src("./i18n.ts");
const topics = src("../manual/topics.ts");

const TODAY = "2026-11-14";
const PLAN: InsPlan = { amt: 50000, cur: "NIO", week: 2, src: "bac", start: "2025-09-08", note: "" };

function bookWithPiece(plan?: InsPlan): { state: LedgerState; piece: CatalogItem } {
  const s = createInitial("es");
  const piece: CatalogItem = { id: "segandina", nameKey: "", customName: "Seguro Andina", icon: "Circle", hidden: false, order: 99, kind: "ins", urlTemplate: "", ...(plan ? { ins: plan } : {}) };
  return { state: { ...s, structure: { ...s.structure, catalog: [...s.structure.catalog, piece] } }, piece };
}
const dueEntriesFor = (state: LedgerState, days: number, today: string) =>
  duesWindow(state, days, today).filter((e) => e.line?.providerId === "segandina");

describe("1.3.271 — la pieza y su grupo", () => {
  it("la fábrica trae UNA pieza de seguro, sin importe: el importe es del usuario o no es", () => {
    const ins = defaultStructure().catalog.filter((c) => c.kind === "ins");
    assert.equal(ins.length, 1);
    assert.equal(ins[0].id, "primerica");
    assert.equal(ins[0].ins, undefined, "la pieza de fábrica nace sin plan: sin importe, sin momento, sin inicio");
  });
  it("el grupo vive en el Catálogo con su propio título", () => {
    assert.ok(screens.includes('{ kind: "ins", label: t("cat.g.ins") }'), "el grupo «Seguro de vida» está en la lista de grupos");
    assert.ok(screens.includes('(["store", "sub", "ins"] as const)'), "el alta ofrece la tercera clase");
  });
});

describe("1.3.271 — el importe de Oscar no existe; el nombre solo donde ya vivía", () => {
  const walk = (dir: URL, acc: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const child = new URL(name, dir);
      if (statSync(child).isDirectory()) walk(new URL(`${name}/`, dir), acc);
      else if (/\.tsx?$/.test(name)) acc.push(child.pathname);
    }
    return acc;
  };
  const files = walk(new URL("../../", import.meta.url));
  it("ni el importe ni su forma en centavos aparecen en src", () => {
    const dotted = ["46", "68"].join(".");
    const cents = ["46", "68"].join("");
    for (const f of files) {
      // La propia cerca se excluye: es el único archivo que nombra la cifra
      // para prohibirla (la aguja se construye por partes, nunca literal).
      if (f.endsWith("segurodevida271.test.ts")) continue;
      const text = readFileSync(f, "utf8");
      assert.ok(!text.includes(dotted), `${f} contiene el importe prohibido`);
      assert.ok(!text.includes(cents), `${f} contiene el importe prohibido en centavos`);
    }
  });
  it("«Primerica» solo aparece en la familia que ya la nombraba, la pieza y la lección", () => {
    const allowed = new Set([
      "src/components/faro/screens.tsx",
      "src/lib/faro/advisor.test.ts",
      "src/lib/faro/defaults.ts",
      "src/lib/faro/golden.test.ts",
      "src/lib/faro/retiro.ts",
      "src/lib/faro/stmtocr.test.ts",
      "src/lib/faro/stmtocr.ts",
      "src/lib/faro/subs.test.ts",
      "src/lib/manual/topics.ts",
      "src/lib/faro/segurodevida271.test.ts",
    ]);
    for (const f of files) {
      if (!readFileSync(f, "utf8").includes("Primerica")) continue;
      const rel = f.slice(f.indexOf("src/"));
      assert.ok(allowed.has(rel), `${rel} nombra a Primerica fuera de la lista cercada`);
    }
  });
});

describe("1.3.271 — la matemática de la semana del mes", () => {
  it("la ventana de la semana n abre el día 7·(n−1)+1 y la 4ª no rebasa el mes", () => {
    assert.equal(insDraftOn({ week: 1 }, "2026-11"), "2026-11-01");
    assert.equal(insDraftOn({ week: 2 }, "2026-11"), "2026-11-08");
    assert.equal(insDraftOn({ week: 3 }, "2026-11"), "2026-11-15");
    assert.equal(insDraftOn({ week: 4 }, "2026-11"), "2026-11-22");
    assert.equal(insDraftOn({ week: 4 }, "2026-02"), "2026-02-22");
    assert.equal(insDraftOn({ day: 31 }, "2026-11"), "2026-11-30", "el día fijo se acota al fin de mes");
  });
  it("el próximo cobro de la 2ª semana, día a día", () => {
    assert.equal(insNextOn({ week: 2 }, "2026-11-01"), "2026-11-08");
    assert.equal(insNextOn({ week: 2 }, "2026-11-07"), "2026-11-08");
    assert.equal(insNextOn({ week: 2 }, "2026-11-08"), "2026-11-08");
    assert.equal(insNextOn({ week: 2 }, "2026-11-14"), "2026-12-08");
    assert.equal(insNextOn({ week: 2 }, "2026-11-15"), "2026-12-08");
    assert.equal(insNextOn({ day: 8 }, "2026-11-14"), "2026-12-08");
  });
  it("duesWindow enseña el cobro desde el día 8, no antes, por la vía única", () => {
    const { state, piece } = bookWithPiece(PLAN);
    const synced = syncInsLine(state, piece, TODAY);
    assert.equal(dueEntriesFor(synced, 6, "2026-11-01").length, 0, "con ventana al día 7 el cobro aún no existe");
    assert.equal(dueEntriesFor(synced, 30, "2026-11-01").length, 1);
    assert.equal(dueEntriesFor(synced, 30, "2026-11-01")[0].on, "2026-11-08");
    assert.equal(dueEntriesFor(synced, 30, "2026-11-07").length, 1);
    assert.equal(dueEntriesFor(synced, 30, "2026-11-08").length, 1);
    assert.equal(dueEntriesFor(synced, 30, "2026-11-15").length, 1, "pasado el día, se lee como vencido, una sola vez");
    const rolled = copyRecurring(synced, "2026-11", "2026-12").state;
    assert.ok(rolled.months["2026-12"].lines.some((l) => l.providerId === "segandina" && l.recurring), "la línea rueda a diciembre como cualquier recurrente");
    assert.equal(dueEntriesFor(rolled, 30, "2026-12-05").length, 1, "en diciembre la serie se lee exactamente una vez");
  });
});

describe("1.3.271 — la prima es gasto y nunca activo", () => {
  it("savingsStock idéntico con y sin la prima; el resumen solo la ve como gasto fijo", () => {
    const { state, piece } = bookWithPiece(PLAN);
    const sinPrima = summarize(state, "2026-11", "es");
    const conLinea = syncInsLine(state, piece, TODAY);
    const conPrima = summarize(conLinea, "2026-11", "es");
    assert.equal(conPrima.fixed - sinPrima.fixed, PLAN.amt, "los fijos suben exactamente la prima");
    assert.equal(conPrima.expense - sinPrima.expense, PLAN.amt);
    assert.equal(sinPrima.opportunity - conPrima.opportunity, PLAN.amt, "lo que tengo baja la prima, como gasto");
    assert.equal(conPrima.income, sinPrima.income, "no toca lo que entra");
    assert.equal(conPrima.savingsFlow, sinPrima.savingsFlow, "no es flujo de ahorro");
    const a = savingsStock(state, "2026-11");
    const b = savingsStock(conLinea, "2026-11");
    assert.equal(b.total, a.total, "el stock total no la ve");
    assert.equal(b.emergency, a.emergency, "el bolsillo de emergencia no la ve");
    assert.equal(b.retirement, a.retirement, "el bolsillo de retiro no la ve");
    assert.equal(b.series.size, a.series.size, "ninguna serie nueva nace de una prima");
  });
  it("la línea permanente: una, en Seguros · Vida, ligada a la pieza, con su cuenta de cobro", () => {
    const { state, piece } = bookWithPiece(PLAN);
    const st = syncInsLine(state, piece, TODAY);
    const lines = (st.months["2026-11"]?.lines ?? []).filter((l) => l.providerId === "segandina");
    assert.equal(lines.length, 1);
    const l = lines[0];
    assert.equal(l.kind, "expense-fixed");
    assert.equal(l.categoryId, "f-seguros");
    assert.equal(l.subId, "f.seguros.vida");
    assert.equal(l.recurring, true);
    assert.equal(l.cadence, "monthly");
    assert.equal(l.nextDue, "2026-11-08");
    assert.equal(l.bookedOn, "2026-11-08");
    assert.equal(l.sourceId, "bac");
    assert.equal(l.concept, "Seguro Andina");
    const st2 = syncInsLine(st, { ...piece, ins: { ...PLAN, amt: 60000 } }, TODAY);
    const lines2 = (st2.months["2026-11"]?.lines ?? []).filter((x) => x.providerId === "segandina");
    assert.equal(lines2.length, 1, "re-guardar actualiza en sitio: no nace una segunda línea");
    assert.equal(lines2[0].id, l.id);
    assert.equal(lines2[0].amountMinor, 60000);
  });
  it("los meses pasados no se reescriben al editar el plan", () => {
    const { state, piece } = bookWithPiece(PLAN);
    const oct = syncInsLine(state, piece, "2026-10-05");
    const nov = syncInsLine(oct, { ...piece, ins: { ...PLAN, amt: 60000 } }, TODAY);
    const octLine = (nov.months["2026-10"]?.lines ?? []).find((l) => l.providerId === "segandina");
    assert.equal(octLine?.amountMinor, PLAN.amt, "octubre conserva su importe: es historia");
    assert.equal(octLine?.nextDue, "2026-10-08");
  });
  it("sin plan configurado no nace línea alguna", () => {
    const { state, piece } = bookWithPiece(undefined);
    const st = syncInsLine(state, piece, TODAY);
    assert.deepEqual(st.months, state.months);
  });
  it("el asiento: si falta Seguros · Vida, configurar lo repone; un renombre del usuario jamás se deshace", () => {
    const { state, piece } = bookWithPiece(PLAN);
    const sinAsiento: LedgerState = { ...state, structure: { ...state.structure, categories: state.structure.categories.filter((c) => c.id !== "f-seguros") } };
    const st = syncInsLine(sinAsiento, piece, TODAY);
    const cat = st.structure.categories.find((c) => c.id === "f-seguros");
    assert.ok(cat?.subs.some((s) => s.id === "f.seguros.vida"), "la categoría vuelve con su subconcepto Vida");
    const renombrada: LedgerState = { ...state, structure: { ...state.structure, categories: state.structure.categories.map((c) => (c.id === "f-seguros" ? { ...c, customName: "Mis seguros" } : c)) } };
    const st2 = syncInsLine(renombrada, piece, TODAY);
    assert.equal(st2.structure.categories.find((c) => c.id === "f-seguros")?.customName, "Mis seguros", "se enlaza por id; el nombre del usuario manda");
  });
});

describe("1.3.271 — soberanía de la pieza de fábrica", () => {
  const legacy = (): LedgerState => {
    const s = createInitial("es");
    return { ...s, structure: { ...s.structure, catalog: s.structure.catalog.filter((c) => c.kind !== "ins") }, settings: { ...s.settings, seeds: (s.settings.seeds ?? []).filter((x) => x !== "segurodevida") } };
  };
  it("la semilla la pone UNA vez en los libros anteriores, sin importe", () => {
    const once = withSeguroDeVida(legacy());
    assert.equal(once.added, true);
    const piece = once.ledger.structure.catalog.find((c) => c.id === "primerica");
    assert.equal(piece?.kind, "ins");
    assert.equal(piece?.ins, undefined);
    const twice = withSeguroDeVida(once.ledger);
    assert.equal(twice.added, false);
    assert.equal(twice.ledger, once.ledger, "con la bandera puesta, la semilla no toca el libro");
  });
  it("borrada por el usuario, no vuelve jamás; oculta, sigue oculta con su inicio intacto", () => {
    const base = legacy();
    const flagged: LedgerState = { ...base, settings: { ...base.settings, seeds: [...(base.settings.seeds ?? []), "segurodevida"] } };
    const after = withSeguroDeVida(flagged);
    assert.equal(after.ledger.structure.catalog.some((c) => c.kind === "ins"), false, "la bandera dice que ya fue suya: no resucita");
    const hiddenBook = withSeguroDeVida(legacy()).ledger;
    const withHidden: LedgerState = { ...hiddenBook, structure: { ...hiddenBook.structure, catalog: hiddenBook.structure.catalog.map((c) => (c.id === "primerica" ? { ...c, hidden: true, ins: { ...PLAN } } : c)) } };
    const again = withSeguroDeVida(withHidden);
    const piece = again.ledger.structure.catalog.find((c) => c.id === "primerica");
    assert.equal(piece?.hidden, true);
    assert.equal(piece?.ins?.start, PLAN.start, "la fecha de inicio sobrevive a la semilla y al ojo");
  });
});

describe("1.3.271 — la retrospectiva del steer", () => {
  it("monthsSince: exacto entre años, cero hoy, null en el futuro", () => {
    assert.equal(monthsSince("2025-03-03", "2026-11-14"), 20);
    assert.equal(monthsSince("2025-09-08", "2026-11-14"), 14);
    assert.equal(monthsSince("2025-03-15", "2026-11-14"), 19, "el día manda: aún no cumple el mes");
    assert.equal(monthsSince("2026-11-14", "2026-11-14"), 0);
    assert.equal(monthsSince("2026-11-15", "2026-11-14"), null, "un inicio futuro no pinta contador");
    assert.equal(monthsSince("", "2026-11-14"), null);
  });
  it("insPaid suma las líneas ANOTADAS: un cambio de importe no reescribe el pasado", () => {
    const { state, piece } = bookWithPiece({ ...PLAN, start: "2025-09-08" });
    const mkLine = (monthKey: string, day: string, amt: number, extra: Partial<import("./types.ts").Line> = {}) => ({
      id: `l-${monthKey}-${amt}`, seriesId: "s1", monthKey, kind: "expense-fixed" as const, concept: "Seguro Andina",
      amountMinor: amt, currency: "NIO" as const, active: true, note: "", categoryId: "f-seguros", subId: "f.seguros.vida",
      recurring: true, storeId: "", providerId: "segandina", productCode: "", productUrl: "", cadence: "monthly" as const,
      nextDue: day, aprBps: 0, balanceMinor: null, balanceCurrency: "NIO" as const, icon: "Heart", history: [], bookedOn: day, ...extra,
    });
    const st: LedgerState = { ...state, months: {
      "2025-08": { lines: [mkLine("2025-08", "2025-08-08", 99900)] },
      "2025-09": { lines: [mkLine("2025-09", "2025-09-08", 50000)] },
      "2025-10": { lines: [mkLine("2025-10", "2025-10-08", 55000), mkLine("2025-10", "2025-10-08", 77000, { active: false, id: "l-off" })] },
    } };
    const paid = insPaid(st, piece.id, "2025-09-08", TODAY);
    assert.equal(paid?.count, 2, "ni la de antes del inicio ni la apagada cuentan");
    assert.deepEqual(paid?.totals, [{ cur: "NIO", amt: 105000 }], "500 + 550 anotados — no 14 meses × importe de hoy");
    assert.equal(insPaid(st, piece.id, "", TODAY), null, "sin inicio no hay ventana honesta");
    assert.equal(insPaid(st, piece.id, "2027-01-01", TODAY), null, "inicio futuro: nada");
  });
});

describe("1.3.271 — no se puede fijar; Libros no gana nada", () => {
  it("la mano del catálogo solo ofrece pin a tiendas e IA; el seguro lleva su plan en ese asiento", () => {
    const catEd = screens.slice(screens.indexOf("function CatalogEditor"));
    const pinBtn = catEd.split("\n").find((l) => l.includes("pin-btn"));
    assert.ok(pinBtn?.includes('(item.kind === "store" || item.kind === "ai")'), "el pin de la mano es solo de tiendas e IA");
    const mark = catEd.split("\n").find((l) => l.includes("cat-pinmark") && l.includes("Pin size={12}"));
    assert.ok(mark?.includes('(item.kind === "store" || item.kind === "ai")'), "la marca en reposo sigue la misma ley");
    assert.ok(screens.includes('aria-label={t("ins.plan")}'), "el asiento del pin lo ocupa el botón del plan");
  });
  it("el snapshot del widget no gana nada con una pieza de seguro, ni fijada a la fuerza", () => {
    const { state } = bookWithPiece(PLAN);
    const pins = [{ c: "", s: "", store: "segandina" }, { c: "", s: "", store: "temu" }];
    const conIns: LedgerState = { ...state, settings: { ...state.settings, widgetPins: pins } };
    const sinIns: LedgerState = { ...conIns, structure: { ...conIns.structure, catalog: conIns.structure.catalog.filter((c) => c.id !== "segandina") } };
    const opts = { today: TODAY, hide: false, lock: false };
    const a = buildWidgetSnapshot(conIns, "es", opts);
    const b = buildWidgetSnapshot(sinIns, "es", opts);
    assert.deepEqual(a.qsOut, b.qsOut, "qsOut idéntico con y sin la pieza");
    assert.ok(a.qsOut.every((q) => q.store !== "segandina"), "la pieza de seguro nunca sale en el widget");
  });
  it("SECTIONS queda byte a byte: ninguna lente ni sección nueva en Libros", () => {
    assert.deepEqual([...SECTIONS], ["desk", "income", "fixed", "variable", "shops", "subs", "stats", "advice", "settings", "archivo", "historial"]);
  });
});

describe("1.3.271 — i18n y Manual", () => {
  it("las 27 claves nuevas existen en los dos diccionarios (paridad exacta)", () => {
    const keys = ["cat.g.ins", "add.kind.ins", "ins.plan", "ins.configure", "ins.edit", "ins.none", "ins.amount", "ins.timing", "ins.timing.day", "ins.timing.week", "ins.day", "ins.week.1", "ins.week.2", "ins.week.3", "ins.week.4", "ins.src", "ins.src.none", "ins.start", "ins.note", "ins.dayShort", "ins.since", "ins.months", "ins.month1", "ins.thisMonth", "ins.paid", "ins.paid1", "ins.needTiming"];
    assert.equal(keys.length, 27);
    for (const k of keys) assert.equal(i18n.split(`"${k}"`).length - 1, 2, `${k} debe existir en es y en en`);
  });
  it("la lección y las dos tarjetitas de ayuda existen y están sembradas", () => {
    assert.ok(topics.includes('id: "seguro-vida"'), "la lección del Manual existe");
    assert.ok(topics.includes('id: "f-seguro-inicio"'), "el tema del campo de inicio existe");
    assert.ok(screens.includes('<Hint topic="seguro-vida" alt />'), "la burbuja del conteo está en el panel");
    assert.ok(screens.includes('topic="f-seguro-inicio"'), "la burbuja del campo de inicio está en el formulario");
  });
});
