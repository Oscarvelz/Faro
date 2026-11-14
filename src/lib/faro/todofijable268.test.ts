/**
 * FARO 1.3.268 — «Todo lo que se puede fijar» (Oscar, 2026-11-14 08:20 EST).
 *
 * Su palabra, ampliando el asiento de la 1.3.267: «De hecho. Debe existir
 * cualquier cosa que pueda preestablecerse.» La búsqueda de la tarjeta
 * «Widget» cubría la Estructura (categorías y subconceptos) y dejaba fuera
 * las piezas del catálogo por una lectura de alcance declarada; él la
 * amplía: el universo fijable entero vive en esa misma búsqueda.
 *
 * Lo que cercan estas pruebas:
 *  - El universo del catálogo es EXACTAMENTE el que su tarjeta ofrece
 *    fijar: las piezas de Tiendas y de IA, en el orden del catálogo. Las
 *    de Suscripciones no aparecen — no se fijan en NINGUNA parte (ninguna
 *    línea guarda su id: es un hecho del modelo, no una elección de
 *    alcance) — y las de cuentas tampoco son casas de la tarjeta.
 *  - Las piezas viven SOLO bajo «Gasto»: su signo no se deriva, una
 *    compra es gasto y su fija viaja en qsOut, la tarjeta del −.
 *  - En el grupo, las piezas cierran tras las de categoría — el orden en
 *    que la tarjeta de apuntes las ofrece (quickPins antes que
 *    quickStorePins) y en que pinGroups lee la lista de fijadas.
 *  - Lo oculto entra marcado, como en el resto del universo.
 *  - De fuente: en la tarjeta, elegir una pieza abre la MISMA ventana de
 *    la 1.3.260 que su asiento del catálogo — el cuerpo de las tiendas al
 *    fijar, el compartido al quitar, la frase del ejemplo con el ejemplo
 *    activo — y la escritura es el toggleStorePin de siempre dentro del
 *    run, con su refresco de la foto; la fila lleva su marca y anuncia
 *    «Fijada»; el Manual completa la lección del buscador.
 */
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial } from "./defaults.ts";
import { hasStorePin, pinStoreCandidates, searchPinCandidates, toggleStorePin } from "./quickadd.ts";
import type { LedgerState, Line } from "./types.ts";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const host = src("../../components/faro/widget-host.tsx");
const topics = src("../manual/topics.ts");

const named = (id: string, customName: string, order: number, extra: object = {}) =>
  ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });

/** Un libro con dos categorías firmadas por sus líneas y un catálogo con
 *  una tienda, una IA, una tienda oculta, una suscripción y una cuenta. */
const book = (): LedgerState => {
  const st = createInitial("es");
  (st.structure as unknown as { categories: unknown[] }).categories = [
    named("c-salario", "Salario", 1, { group: "fixed", role: "", subs: [] }),
    named("c-casa", "Casa", 2, { group: "fixed", role: "", subs: [] }),
  ];
  (st.structure as unknown as { catalog: unknown[] }).catalog = [
    named("temu", "Temu", 1, { kind: "store" }),
    named("casa-grande", "Casa Grande", 2, { kind: "store" }),
    named("claude", "Claude", 3, { kind: "ai" }),
    named("tienda-oculta", "Tienda Oculta", 4, { kind: "store", hidden: true }),
    named("metropcs", "MetroPCS", 5, { kind: "sub" }),
    named("banco", "Banco", 6, { kind: "acct" }),
  ];
  const mk = (kind: string, categoryId: string) =>
    ({ id: `${kind}-${categoryId}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "USD", active: true, note: "", categoryId, subId: "", recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
  st.months = { "2026-11": { lines: [mk("income-fixed", "c-salario"), mk("expense-fixed", "c-casa")] } };
  return st;
};

describe("1.3.268 — el universo del catálogo en la búsqueda", () => {
  it("Tiendas e IA, en el orden del catálogo; suscripciones y cuentas, fuera", () => {
    const all = pinStoreCandidates(book());
    assert.deepEqual(all.map((c) => c.store), ["temu", "casa-grande", "claude", "tienda-oculta"]);
    assert.ok(!all.some((c) => c.store === "metropcs"), "una suscripción no es candidata: no se fija en ninguna parte");
    assert.ok(!all.some((c) => c.store === "banco"), "una cuenta no es casa de la tarjeta");
  });

  it("toda pieza vive solo en Salida y lleva c/s vacíos, como su fija", () => {
    for (const cand of pinStoreCandidates(book())) {
      assert.deepEqual(cand.signs, ["out"], "una compra es gasto: el signo no se deriva");
      assert.equal(cand.c, "");
      assert.equal(cand.s, "");
    }
  });

  it("lo oculto entra marcado, como en el resto del universo", () => {
    const all = pinStoreCandidates(book());
    assert.equal(all.find((c) => c.store === "tienda-oculta")?.hidden, true);
    assert.equal(all.find((c) => c.store === "temu")?.hidden, false);
  });
});

describe("1.3.268 — la búsqueda encuentra las piezas", () => {
  it("«tem» encuentra Temu solo bajo «Gasto»", () => {
    const r = searchPinCandidates(book(), "tem", "es");
    assert.deepEqual(r.out.filter((c) => c.store).map((c) => c.store), ["temu"]);
    assert.deepEqual(r.inn, [], "ninguna pieza vive en Entrada");
  });

  it("«clau» encuentra la IA; «metro» no encuentra la suscripción", () => {
    const r = searchPinCandidates(book(), "clau", "es");
    assert.deepEqual(r.out.filter((c) => c.store).map((c) => c.store), ["claude"]);
    const none = searchPinCandidates(book(), "metro", "es");
    assert.deepEqual(none.out.filter((c) => c.store), [], "MetroPCS no existe para la búsqueda: su fija no tendría archivo");
  });

  it("en «Gasto», las de categoría van antes que las piezas", () => {
    const r = searchPinCandidates(book(), "casa", "es");
    assert.deepEqual(r.out.map((c) => c.store ?? `${c.c}|${c.s}`), ["c-casa|", "casa-grande"],
      "la categoría «Casa» abre y la tienda «Casa Grande» cierra — el orden de la tarjeta de apuntes");
    assert.deepEqual(r.inn, []);
  });

  it("la escritura es toggleStorePin: la fija lleva la forma { c:'', s:'', store }", () => {
    let pins = toggleStorePin(undefined, "temu");
    assert.deepEqual(pins, [{ c: "", s: "", store: "temu" }]);
    assert.equal(hasStorePin(pins, "temu"), true);
    pins = toggleStorePin(pins, "temu");
    assert.deepEqual(pins, []);
    assert.equal(hasStorePin(pins, "temu"), false);
  });
});

describe("1.3.268 — cercas de fuente", () => {
  it("elegir una pieza abre la misma ventana de la 1.3.260 que el catálogo usa", () => {
    const ask = host.slice(host.indexOf("const askStorePin"), host.indexOf("const searching"));
    assert.ok(ask.includes("confirm({"), "la ventana de la casa abre antes de escribir");
    assert.ok(ask.includes('"widget.pin.ask.storeBody"'), "fijar lleva el cuerpo de destino de las tiendas");
    assert.ok(ask.includes('"widget.pin.ask.offBody"'), "una ya fijada ofrece la ventana de quitar con el cuerpo compartido");
    assert.ok(ask.includes('sampleOn() ? " " + t("widget.pin.sample") : ""'), "con el ejemplo activo, la ventana suma la frase del ejemplo de los asientos de fijar");
    assert.ok(ask.includes("hasStorePin(pins, id)"), "el estado fijado decide qué ventana abre");
    const run = ask.slice(ask.indexOf("run: () =>"));
    assert.ok(run.includes("toggleStorePin(s.settings.widgetPins, id)"), "la escritura es el toggle compartido de las tiendas, dentro del run");
    assert.ok(run.includes("window.dispatchEvent(new Event(WIDGET_REFRESH))"), "el guardado inmediato refresca la foto, como el asiento del catálogo");
  });

  it("la fila de una pieza lleva su marca y anuncia «Fijada»; la de categoría sigue abriendo la suya", () => {
    const hit = host.slice(host.indexOf("const hitRow"), host.indexOf("return (", host.indexOf("const hitRow")));
    assert.ok(host.indexOf("onClick={() => askPin(cand)}") < host.indexOf("onClick={() => askStorePin(cand)}"), "la rama de categoría se lee primero: su gesto no cambia");
    assert.ok(hit.includes("if (!cand.store)"), "la fila se bifurca por la pieza");
    const storeRow = host.slice(host.indexOf("// 1.3.268: la fila de una pieza del catálogo"));
    assert.ok(storeRow.includes("{storeMark(cand.store)}"), "la marca de la pieza abre su fila (la diferenciación de la 1.3.251)");
    assert.ok(storeRow.includes('t("widget.pin.state")'), "la pieza fijada anuncia «Fijada» como las de categoría");
    assert.ok(storeRow.includes("hasStorePin(pins, cand.store)"), "su estado se lee de la misma lista de fijas");
  });

  it("la línea de sin-resultados dice la verdad del universo ampliado (misma pareja, paridad intacta)", () => {
    const i18n = src("./i18n.ts");
    assert.ok(i18n.includes('"settings.widgetpins.none": "Ninguna categoría, subcategoría, tienda ni IA con ese nombre."'), "la línea, en español, ya no esconde las tiendas ni las IA");
    assert.ok(i18n.includes('"settings.widgetpins.none": "No category, subcategory, store or AI with that name."'), "…ni en inglés");
  });

  it("el Manual completa la lección: el buscador también encuentra tiendas e IA", () => {
    assert.ok(topics.includes("y encuentra también tus tiendas y tus IA, bajo Gasto"), "el Manual, en español, cierra la lección");
    assert.ok(topics.includes("it also finds your stores and your AIs, under Expense"), "…y en inglés");
  });
});
