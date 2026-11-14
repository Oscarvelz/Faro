/**
 * FARO 1.3.267 — «Fijar desde el widget» (Oscar, 2026-11-14 07:50–07:51 EST).
 *
 * Su orden: dentro de la tarjeta «Widget» de Ajustes, una barra de búsqueda
 * encuentra cualquier categoría o subconcepto de la Estructura escogida por
 * el usuario y lo fija ahí mismo; y lo encontrado y lo fijado se leen bajo
 * DOS grupos plegables — los de entrada y los de salida — con las filas a
 * UNA línea (el signo lo dice el grupo; la palabra del signo bajo el nombre
 * se retira).
 *
 * Lo que cercan estas pruebas:
 *  - El universo de la búsqueda es la Estructura fijable viva: categorías y
 *    subs en su orden; la categoría de Ahorros y sus subs nunca aparecen
 *    (jamás pueden ser casas del widget); las ocultas ENTRAN, marcadas —
 *    el espejo del editor de Estructura, que las pinta mudas y deja fijar.
 *  - El grupo de cada candidato sale de pinSigns — la derivación del
 *    propio sistema de fijas (de sus líneas: la data no guarda un signo
 *    estructural por categoría), la misma que decide en qué tarjeta de
 *    apuntes vive cada fija: un grupo aquí nunca puede discrepar con el
 *    widget allá. Solo ingreso → Entrada; solo gasto → Salida; ambos o
 *    ninguno → los dos grupos.
 *  - La búsqueda pliega mayúsculas y acentos (la disciplina de las
 *    búsquedas insignia) y encuentra una sub por su nombre o por su
 *    camino «Categoría · Sub».
 *  - pinGroups ordena la lista de fijadas bajo los mismos dos grupos:
 *    las de categoría en su orden de fijado (una de ambos signos, en los
 *    dos grupos) y las del catálogo tras ellas, solo en Salida.
 *  - De fuente: el buscador vive en la sección de fijas de la tarjeta;
 *    fijar y desfijar desde un resultado pasan por la ventana de la
 *    1.3.260 (el toggle vive solo dentro de su run, con su refresco de la
 *    foto) y con el ejemplo activo suman la frase del ejemplo de los
 *    asientos de fijar; las filas ya no gastan la segunda línea del signo
 *    (signWord retirado); los grupos cuelgan del pliegue de la casa
 *    (FoldShell, nacido abierto, estado en sesión); las parejas de i18n
 *    nuevas existen en los dos diccionarios y el Manual enseña el asiento.
 */
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial } from "./defaults.ts";
import { foldPinText, hasWidgetPin, pinCandidates, pinGroups, searchPinCandidates, toggleWidgetPin } from "./quickadd.ts";
import type { LedgerState, Line } from "./types.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const host = src("../../components/faro/widget-host.tsx");
const screens = src("../../components/faro/screens.tsx");
const i18n = src("./i18n.ts");
const topics = src("../manual/topics.ts");

const named = (id: string, customName: string, order: number, extra: object = {}) =>
  ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });

/** Un libro con estructura a medida: salario (solo ingreso), Casa con Renta
 * (solo gasto), Alimentación (ninguna línea), Ahorros (rol savings, fuera) y
 * una categoría oculta con su sub. */
const book = (): LedgerState => {
  const st = createInitial("es");
  (st.structure as unknown as { categories: unknown[] }).categories = [
    named("c-salario", "Salario", 1, { group: "fixed", role: "", subs: [] }),
    named("c-casa", "Casa", 2, { group: "fixed", role: "", subs: [named("s-renta", "Renta", 1), named("s-luz", "Luz", 2, { hidden: true })] }),
    named("c-comida", "Alimentación", 3, { group: "variable", role: "", subs: [] }),
    named("c-ahorro", "Ahorros", 4, { group: "variable", role: "savings", subs: [named("s-meta", "Meta", 1)] }),
    named("c-oculta", "Oculta", 5, { group: "variable", role: "", hidden: true, subs: [named("s-secreta", "Secreta", 1)] }),
  ];
  (st.structure as unknown as { catalog: unknown[] }).catalog = [named("tienda-x", "Tienda X", 1, { kind: "store" })];
  const mk = (kind: string, categoryId: string, subId: string) =>
    ({ id: `${kind}-${categoryId}-${subId}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "USD", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
  st.months = { "2026-11": { lines: [mk("income-fixed", "c-salario", ""), mk("expense-fixed", "c-casa", "s-renta")] } };
  return st;
};

describe("1.3.267 — el universo de la búsqueda de fijas", () => {
  it("categorías y subs en el orden de la Estructura; Ahorros y sus subs, fuera", () => {
    const all = pinCandidates(book());
    assert.deepEqual(all.map((c) => `${c.c}|${c.s}`), [
      "c-salario|", "c-casa|", "c-casa|s-renta", "c-casa|s-luz", "c-comida|", "c-oculta|", "c-oculta|s-secreta",
    ]);
    assert.ok(!all.some((c) => c.c === "c-ahorro" || c.s === "s-meta"), "la categoría de Ahorros y sus subs nunca son candidatas");
  });

  it("las ocultas entran marcadas (la categoría arrastra su marca a sus subs)", () => {
    const all = pinCandidates(book());
    const by = (c: string, s: string) => all.find((x) => x.c === c && x.s === s);
    assert.equal(by("c-casa", "s-luz")?.hidden, true, "la sub oculta va marcada");
    assert.equal(by("c-oculta", "")?.hidden, true);
    assert.equal(by("c-oculta", "s-secreta")?.hidden, true, "la sub de una categoría oculta hereda la marca");
    assert.equal(by("c-casa", "s-renta")?.hidden, false);
  });

  it("el signo de cada candidato sale de pinSigns: solo ingreso, solo gasto, ninguno → ambos", () => {
    const all = pinCandidates(book());
    const by = (c: string, s: string) => all.find((x) => x.c === c && x.s === s);
    assert.deepEqual(by("c-salario", "")?.signs, ["in"]);
    assert.deepEqual(by("c-casa", "")?.signs, ["out"], "el signo es de la categoría: lo heredan sus subs");
    assert.deepEqual(by("c-casa", "s-renta")?.signs, ["out"]);
    assert.deepEqual(by("c-comida", "")?.signs, ["in", "out"], "sin líneas todavía: candidata en los dos grupos, como vive en las dos tarjetas");
  });
});

describe("1.3.267 — la búsqueda", () => {
  it("pliega acentos y mayúsculas: «alimentacion» encuentra «Alimentación»", () => {
    assert.equal(foldPinText("Alimentación"), "alimentacion");
    const r = searchPinCandidates(book(), "ALIMENTACION", "es");
    assert.deepEqual(r.inn.map((c) => c.c), ["c-comida"]);
    assert.deepEqual(r.out.map((c) => c.c), ["c-comida"], "sin signo único, vive en los dos grupos");
  });

  it("una sub se encuentra por su nombre y por su camino «Categoría · Sub»", () => {
    const byName = searchPinCandidates(book(), "renta", "es");
    assert.deepEqual(byName.out.map((c) => `${c.c}|${c.s}`), ["c-casa|s-renta"]);
    assert.deepEqual(byName.inn, []);
    const byPath = searchPinCandidates(book(), "casa · renta", "es");
    assert.deepEqual(byPath.out.map((c) => `${c.c}|${c.s}`), ["c-casa|s-renta"]);
    const byCat = searchPinCandidates(book(), "casa", "es");
    assert.deepEqual(byCat.out.map((c) => `${c.c}|${c.s}`), ["c-casa|", "c-casa|s-renta", "c-casa|s-luz"], "la categoría trae a sus subs por el camino");
  });

  it("agrupa por signo y nunca mezcla: salario solo en Entrada", () => {
    const r = searchPinCandidates(book(), "salario", "es");
    assert.deepEqual(r.inn.map((c) => c.c), ["c-salario"]);
    assert.deepEqual(r.out, []);
  });

  it("sin texto no hay resultados; sin coincidencias, los dos grupos vacíos", () => {
    assert.deepEqual(searchPinCandidates(book(), "   ", "es"), { inn: [], out: [] });
    assert.deepEqual(searchPinCandidates(book(), "zzz", "es"), { inn: [], out: [] });
  });

  it("el estado fijado se lee con hasWidgetPin sobre la misma lista", () => {
    const st = book();
    st.settings.widgetPins = toggleWidgetPin(st.settings.widgetPins, "c-casa", "s-renta");
    assert.equal(hasWidgetPin(st.settings.widgetPins, "c-casa", "s-renta"), true);
    assert.equal(hasWidgetPin(st.settings.widgetPins, "c-casa", ""), false);
  });
});

describe("1.3.267 — los grupos de la lista de fijadas", () => {
  it("pinGroups: orden de fijado, ambos signos en los dos grupos, tiendas solo en Salida", () => {
    const st = book();
    st.settings.widgetPins = [
      { c: "c-comida", s: "" },          // ambos signos → los dos grupos
      { c: "c-salario", s: "" },         // solo ingreso
      { c: "c-casa", s: "s-renta" },     // solo gasto
      { c: "", s: "", store: "tienda-x" }, // catálogo → solo Salida, tras las de categoría
    ];
    const g = pinGroups(st);
    assert.deepEqual(g.inn.map((p) => `${p.c}|${p.s}`), ["c-comida|", "c-salario|"]);
    assert.deepEqual(g.out.map((p) => (p.store ? `store|${p.store}` : `${p.c}|${p.s}`)), ["c-comida|", "c-casa|s-renta", "store|tienda-x"]);
  });

  it("sin fijas, los dos grupos vacíos (la sección pinta su línea de vacío)", () => {
    assert.deepEqual(pinGroups(book()), { inn: [], out: [] });
  });
});

describe("1.3.267 — cercas de fuente", () => {
  it("el buscador vive en la sección de fijas de la tarjeta «Widget»", () => {
    assert.ok(host.includes("function WidgetPinsSection("), "la sección es su propio componente");
    assert.ok(host.includes("<WidgetPinsSection />"), "la tarjeta lo monta");
    assert.ok(host.includes('className="search-pill wpin-search"'), "la pastilla de búsqueda de la casa");
    assert.ok(host.includes('t("settings.widgetpins.search")'), "su placeholder sale del diccionario");
    assert.ok(host.includes("searchPinCandidates(ledger, q, lang)"), "busca sobre el libro vivo");
    assert.ok(host.includes('t("settings.widgetpins.none")'), "el estado sin resultados tiene su línea");
    // El estado de la sección muere con el pliegue de la tarjeta: el
    // componente se monta dentro de su bloque abierto, como su contenido.
    assert.ok(host.indexOf("<WidgetPinsSection />") > host.indexOf("{open ? ("), "la sección vive dentro del pliegue de la tarjeta");
  });

  it("fijar y desfijar desde un resultado pasan por la ventana de la 1.3.260", () => {
    const askPin = host.slice(host.indexOf("const askPin"), host.indexOf("const searching"));
    assert.ok(askPin.includes("confirm({"), "la ventana de la casa abre antes de escribir");
    assert.ok(askPin.includes('"widget.pin.ask.title"') && askPin.includes('"widget.pin.ask.body"'), "fijar lleva el título y el cuerpo de destino de las categorías");
    assert.ok(askPin.includes('"widget.pin.ask.offTitle"') && askPin.includes('"widget.pin.ask.offBody"'), "una ya fijada ofrece la ventana de desfijar con el cuerpo compartido");
    assert.ok(askPin.includes('sampleOn() ? " " + t("widget.pin.sample") : ""'), "con el ejemplo activo, la ventana suma la frase del ejemplo de los asientos de fijar");
    assert.ok(askPin.includes("hasWidgetPin(pins, cand.c, cand.s)"), "el estado fijado decide qué ventana abre");
    const run = askPin.slice(askPin.indexOf("run: () =>"));
    assert.ok(run.includes("toggleWidgetPin(s.settings.widgetPins, cand.c, cand.s)"), "la escritura es el toggle compartido, dentro del run");
    assert.ok(run.includes("window.dispatchEvent(new Event(WIDGET_REFRESH))"), "el guardado inmediato refresca la foto, como el asiento del catálogo");
    // Ningún atajo: la fila del resultado solo abre la ventana.
    const hit = host.slice(host.indexOf("const hitRow"), host.indexOf("</button>", host.indexOf("const hitRow")) + "</button>".length);
    assert.ok(hit.includes("onClick={() => askPin(cand)}") && !hit.includes("toggleWidgetPin"), "tocar un resultado abre la ventana; no escribe");
    assert.ok(hit.includes('t("widget.pin.state")'), "la fila anuncia su estado «Fijada»");
  });

  it("las filas son de UNA línea: la palabra del signo bajo el nombre se retira", () => {
    assert.ok(!host.includes("signWord"), "el cómputo de la segunda línea desaparece de la tarjeta");
    assert.ok(!host.includes('t("widget.pin.signboth")'), "la palabra «Ingreso y gasto» ya no se pinta por fila");
    const pinRow = host.slice(host.indexOf("const pinRow"), host.indexOf("const hitRow"));
    assert.ok(pinRow.includes("<strong>{label(p)}</strong>"), "la fila de categoría lleva marca, nombre y Desfijar");
    assert.ok(pinRow.includes("<strong>{names.catalog(p.store as string) || p.store}</strong>"), "la fila de tienda lleva su nombre a una línea");
    assert.ok(!pinRow.includes('t("widget.pin.signout")'), "ni la fila de tienda gasta ya la palabra del signo: lo dice su grupo");
  });

  it("los grupos llevan los sustantivos de la familia y cuelgan del pliegue de la casa", () => {
    assert.ok(host.includes('t("widget.pin.signin")') && host.includes('t("widget.pin.signout")'), "las cabeceras son «Ingreso» y «Gasto»");
    assert.ok(host.includes("pinGroups(ledger)"), "la lista de fijadas se agrupa con la misma derivación");
    const grp = host.slice(host.indexOf("function PinGroup"), host.indexOf("function WidgetPinsSection"));
    assert.ok(grp.includes("useState(true)"), "el grupo nace abierto: rápido de accionar");
    assert.ok(grp.includes('aria-expanded={open}'), "su botón anuncia el pliegue");
    assert.ok(grp.includes("<FoldShell open={open}>"), "el cuerpo cuelga de FoldShell — el pliegue interior de la casa");
    assert.ok(screens.includes("export function FoldShell("), "FoldShell se exporta para que la tarjeta lo comparta");
  });

  it("las parejas nuevas existen en los dos diccionarios y el Manual enseña el asiento", () => {
    for (const key of ["settings.widgetpins.search", "settings.widgetpins.none", "widget.pin.state"]) {
      assert.equal(i18n.split(`"${key}"`).length - 1, 2, `${key} vive en ES y en EN`);
    }
    assert.ok(topics.includes("su buscador encuentra cualquier categoría o subconcepto de tu estructura"), "el Manual, en español, nombra el asiento nuevo");
    assert.ok(topics.includes("its search finds any category or subcategory in your structure"), "…y en inglés");
  });
});
