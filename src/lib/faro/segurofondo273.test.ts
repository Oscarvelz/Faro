/**
 * FARO 1.3.273 — «El seguro, en el fondo» (órdenes de Oscar, 2026-11-14).
 *
 * Tres cercas, una por orden:
 *  - Estadísticas cuenta las primas anotadas al final: las del mes que se
 *    mira y la suma de todas. Suma líneas reales, nunca meses × importe.
 *  - El Asesor solo habla del seguro si la última prima anotada de una pieza
 *    cambió contra la anterior — aunque sea un centavo — y dice los dos
 *    importes. Mismo importe o primera anotación: silencio.
 *  - Los beneficiarios viven en la pieza como nombres, en el orden del
 *    usuario; se escriben o se traen SOLO por el selector web de contactos
 *    (navigator.contacts). Sin selector, el campo sigue siendo escribible.
 */
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer, withSeguroDeVida } from "./defaults.ts";
import { insPremiumChange, insTotals, syncInsLine } from "./insurance.ts";
import { adviceRules } from "./rules.ts";
import type { CatalogItem, InsPlan, LedgerState } from "./types.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = src("../../components/faro/screens.tsx");
const charts = src("../../components/faro/charts.tsx");
const native = src("../../spa/native.ts");
const i18n = src("./i18n.ts");
const topics = src("../manual/topics.ts");

const TODAY = "2026-11-14";
const PLAN_A: InsPlan = { amt: 10000, cur: "NIO", day: 8, src: "", start: "2026-09-01", note: "" };
const PLAN_B: InsPlan = { amt: 2000, cur: "USD", day: 8, src: "", start: "", note: "" };

function piece(id: string, name: string, plan: InsPlan, bens?: string[]): CatalogItem {
  return { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "ins", urlTemplate: "", ins: plan, ...(bens ? { bens } : {}) };
}

function book(pieces: CatalogItem[]): LedgerState {
  const s = createInitial("es");
  s.settings.display = "USD";
  s.settings.rateE4 = 360000; // C$36.00 por US$1, para una conversión comprobable a mano.
  return { ...s, structure: { ...s.structure, catalog: [...s.structure.catalog, ...pieces] } };
}

function filedBook(aNov = 10001): LedgerState {
  const a = piece("sega", "Seguro Andina", PLAN_A);
  const b = piece("segb", "Seguro Brisa", PLAN_B);
  let s = book([a, b]);
  s = syncInsLine(s, a, "2026-09-14");
  s = syncInsLine(s, a, "2026-10-14");
  s = syncInsLine(s, { ...a, ins: { ...PLAN_A, amt: aNov } }, TODAY);
  s = syncInsLine(s, b, "2026-10-14");
  s = syncInsLine(s, b, TODAY);
  return s;
}

describe("1.3.273 — la estadística del fondo", () => {
  it("suma las primas anotadas del mes y de toda la historia, por líneas reales", () => {
    // La superficie convierte línea a línea, como sus vecinas: cada C$100 → US$2.78.
    // A: US$2.78 × 3 = US$8.34. B: US$20.00 × 2 = US$40.00. Total US$48.34.
    // Noviembre: US$2.78 + US$20.00 = US$22.78.
    const totals = insTotals(filedBook(), "2026-11", TODAY);
    assert.deepEqual(totals, { monthMinor: 2278, totalMinor: 4834, count: 5 });
  });

  it("un cambio de importe no reescribe el pasado: la suma no es meses × importe", () => {
    const totals = insTotals(filedBook(12000), "2026-11", TODAY)!;
    // Si multiplicara el importe actual por los meses de A daría otra cifra;
    // la verdad son las tres líneas: C$100 + C$100 + C$120 = C$320 → US$8.89, + US$40 de B.
    assert.equal(totals.totalMinor, 4889);
    assert.equal(totals.monthMinor, 2000 + 333); // C$120 → US$3.33, más los US$20 de B.
  });

  it("respeta la fecha de inicio de cada pieza y no anuncia nada sin primas anotadas", () => {
    const late = piece("segtarde", "Seguro Tarde", { ...PLAN_A, start: "2026-10-01" });
    let s = book([late]);
    s = syncInsLine(s, late, "2026-09-14"); // anotada el 8 de septiembre: antes del inicio, no cuenta
    s = syncInsLine(s, late, "2026-10-14");
    assert.deepEqual(insTotals(s, "2026-10", TODAY), { monthMinor: 278, totalMinor: 278, count: 1 });
    const empty = book([piece("segvacio", "Seguro Vacío", PLAN_B)]);
    assert.equal(insTotals(empty, "2026-11", TODAY), null, "sin primas anotadas, la estadística no existe");
  });

  it("la carpeta nace al final de Estadísticas, tras Números clave, con su tema de ayuda", () => {
    assert.ok(screens.includes("insTotals(session.ledger, key, todayIso())"), "Estudio lee la lectura del módulo");
    assert.ok(screens.indexOf('{ id: "seguro"') > screens.indexOf('{ id: "numeros"'), "«seguro» va después de «numeros» en el registro");
    assert.ok(screens.includes('<StatFold id="seguro">'), "la carpeta se pinta");
    assert.ok(charts.includes('seguro: "seguro-vida"'), "el (?) de la carpeta abre la lección del seguro");
  });
});

describe("1.3.273 — el Asesor solo habla si la prima cambió", () => {
  const rulesFor = (s: LedgerState, key = "2026-11") => adviceRules(s, key, "es", makeNamer(s.structure, "es"), { today: new Date(2026, 10, 14, 12) });

  it("detecta una subida de un centavo y la regla dice cuánto era y cuánto es", () => {
    const change = insPremiumChange(filedBook(), TODAY)!;
    assert.equal(change.itemId, "sega");
    assert.equal(change.wasMinor, 10000);
    assert.equal(change.nowMinor, 10001);
    const rule = rulesFor(filedBook()).find((r) => r.id === "insurance")!;
    assert.equal(rule.tone, "calm");
    assert.equal(rule.topic, "seguro-vida");
    assert.equal(rule.v.was, 10000);
    assert.equal(rule.v.now, 10001);
    assert.match(rule.say, /subió/);
    assert.match(rule.say, /C\$100\.00/);
    assert.match(rule.say, /C\$100\.01/);
    assert.equal(rule.go.kind, "line");
    if (rule.go.kind === "line") assert.equal(rule.go.section, "fixed");
  });

  it("también habla si bajó, con la palabra bajó", () => {
    const rule = rulesFor(filedBook(9999)).find((r) => r.id === "insurance")!;
    assert.equal(rule.v.was, 10000);
    assert.equal(rule.v.now, 9999);
    assert.match(rule.say, /bajó/);
  });

  it("silencio: mismo importe, primera anotación u otro mes", () => {
    assert.equal(insPremiumChange(filedBook(10000), TODAY), null, "la última prima repite la anterior");
    assert.equal(rulesFor(filedBook(10000)).find((r) => r.id === "insurance"), undefined);
    const a = piece("sega", "Seguro Andina", PLAN_A);
    const one = syncInsLine(book([a]), a, TODAY);
    assert.equal(insPremiumChange(one, TODAY), null, "la primera anotación no tiene comparación");
    assert.equal(rulesFor(filedBook(), "2026-10").find((r) => r.id === "insurance"), undefined, "el aviso vive en el mes del cambio");
  });
});

describe("1.3.273 — beneficiarios en la pieza", () => {
  it("son nombres en orden, viajan con el libro y la semilla no los toca", () => {
    const bens = ["Ana María", "Luis", "Carmen"];
    const s = book([piece("sega", "Seguro Andina", PLAN_A, bens)]);
    const roundTripped = JSON.parse(JSON.stringify(s)) as LedgerState;
    const saved = roundTripped.structure.catalog.find((c) => c.id === "sega")!;
    assert.deepEqual(saved.bens, bens);
    assert.ok(saved.bens!.every((b) => typeof b === "string"), "solo nombres: ni porcentajes ni repartos");
    const seeded = withSeguroDeVida(roundTripped).ledger;
    assert.deepEqual(seeded.structure.catalog.find((c) => c.id === "sega")?.bens, bens, "la semilla no resucita ni borra beneficiarios");
  });

  it("el formulario los edita en el alta y en el plan, y el panel los nombra", () => {
    assert.ok(screens.includes("cleanInsBens(insDraft.bens)"), "el alta guarda los nombres limpios en la pieza");
    assert.ok(screens.includes("cleanInsBens(planDraft.bens)"), "el plan guarda los nombres limpios en la pieza");
    assert.ok(screens.includes("draftFromPlan(item.ins"), "el borrador del plan nace de la pieza");
    assert.ok(screens.includes("item.bens?.length"), "el panel solo nombra beneficiarios cuando los hay");
    assert.ok(screens.includes('t("ins.bens")'), "el panel lleva su título «Beneficiarios»");
    assert.ok(screens.includes('topic="f-seguro-beneficiarios"'), "el campo lleva su tarjetita de ayuda");
  });

  it("los contactos entran SOLO por el selector web; sin selector, escribir sigue abierto", () => {
    assert.ok(screens.includes('contacts.select(["name"], { multiple: true })'), "el selector web trae nombres");
    assert.ok(screens.includes("insContactsApi()"), "el botón nace de detectar navigator.contacts");
    assert.ok(!screens.includes("nativePickContacts"), "ninguna ruta nativa nueva para beneficiarios");
    assert.ok(!native.includes("pickContactNames") && !native.includes("contactPickerAvailable"), "native.ts no ganó superficie para esta ola");
  });

  it("las claves nuevas existen en los dos diccionarios y el Manual cuenta las tres órdenes", () => {
    const keys = ["ins.bens", "ins.bens.add", "ins.bens.contacts", "ins.bens.name", "ins.bens.remove", "ins.stat.count", "ins.stat.count1"];
    assert.equal(keys.length, 7);
    for (const k of keys) assert.equal(i18n.split(`"${k}"`).length - 1, 2, `${k} debe existir en es y en en`);
    assert.ok(topics.includes('id: "f-seguro-beneficiarios"'), "la tarjetita de beneficiarios existe");
    const lesson = topics.slice(topics.indexOf('id: "seguro-vida"'), topics.indexOf('id: "f-cat-arbol"'));
    assert.match(lesson, /beneficiarios/);
    assert.match(lesson, /beneficiaries/);
    assert.match(lesson, /final de \[\[Estudio\]\]/);
    assert.match(lesson, /end of \[\[Study\]\]/);
    assert.match(lesson, /solo menciona tu seguro si una prima anotada cambia/);
    assert.match(lesson, /only mentions your insurance if a filed premium changes/);
  });
});
