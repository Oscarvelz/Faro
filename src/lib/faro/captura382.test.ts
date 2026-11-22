/**
 * captura382.test.ts — §21: LA BÚSQUEDA EN SU NATURALEZA (fallo de
 * Oscar, 2026-11-21 21:03 + enmienda 21:07; ESTUDIO-BUSQUEDA.md y
 * BRIEF-BUSQUEDA.md). La lupa encuentra lo que existe; el Asesor
 * calcula lo que no existe como objeto. Las cercas de la pieza:
 *
 *  (1) LA FORMA: la detección reconoce la pregunta por su forma
 *      ES/EN — generosa, sin clasificar familias — y la referencia
 *      lleva la pregunta VERBATIM.
 *  (2) LA SEPARACIÓN (L-B1, cerca 1 y 2 del brief): el código de la
 *      búsqueda no importa al intérprete del Asesor, y el índice de
 *      funciones no recibe el libro: ninguna cifra cruza.
 *  (3) LUGARES PRIMERO: la cuenta nombrada encabeza los lugares; la
 *      entrada natural despoja las muletillas y caza la sustancia.
 *  (4) EL ÍNDICE DE FUNCIONES (L-B7): toda entrada del registro trae
 *      su línea «qué hace» en los dos idiomas y se encuentra por su
 *      propio nombre; «exportar» encuentra a Exportar con su puerta,
 *      y su piso se nombra desde un modo menor, sin contenido.
 *  (5) EL TRASPASO Y EL RETORNO, en la fuente: la puerta despacha la
 *      pregunta por «faro-ask-seed», la caja la escucha, y la cáscara
 *      guarda la búsqueda para restaurarla al volver.
 *  (6) MANUAL Y NOVEDADES en la misma ola: el tema «buscar» cuenta la
 *      referencia y los grupos; «preguntar-asesor» la nombra como
 *      camino de llegada; la nota es grande y abre en «buscar».
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createInitial, makeNamer } from "./defaults.ts";
import { searchLedger, searchPlaces } from "./search.ts";
import { looksVerbal, questionShape, referenceFor, searchFunctions } from "./searchfn.ts";
import { FARO_FUNCTION_MAP, FUNCTION_TOPIC } from "./askmap.ts";
import { findTopic } from "../manual/topics.ts";
import { NEWS } from "./novedades.ts";
import type { LedgerState, Line } from "./types.ts";

const srcOf = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

let seq = 0;
function line(partial: Partial<Line>): Line {
  seq += 1;
  return {
    id: `l${seq}`, kind: "expense-variable", concept: "", amountMinor: 1000, currency: "USD",
    categoryId: "", subId: "", storeId: "", sourceId: "", bookedOn: "", note: "", voice: false,
    active: true, ...partial,
  } as Line;
}

function fixture(): LedgerState {
  const s = createInitial("es", "oscuro");
  s.months["2026-11"] = { lines: [
    line({ id: "dep", kind: "income-variable", concept: "Depósito a ahorros", amountMinor: 50000, bookedOn: "2026-11-03" }),
    line({ id: "tab", kind: "purchase", concept: "Tabletas", amountMinor: 12000, bookedOn: "2026-11-05" }),
  ] };
  return s;
}

describe("captura382 · §21 la búsqueda en su naturaleza", () => {
  it("(1) la forma: la pregunta se reconoce por su forma, en los dos idiomas", () => {
    for (const q of [
      "¿Cuánto me queda en ahorros?",
      "cuánto me queda en ahorros",
      "¿Puedo gastar $100 en zapatos?",
      "cuando me toca pagar el internet",
      "How much do I have left in savings?",
      "how much is left in savings?",
      "can I spend $100 on shoes?",
      "What did I buy last?",
    ]) assert.equal(questionShape(q), true, q);
    for (const q of ["tabletas", "café", "salario noviembre", "internet", "tarjeta visa"]) {
      assert.equal(questionShape(q), false, q);
    }
    // La referencia lleva la pregunta VERBATIM, carácter a carácter.
    const q = "¿Cuánto me queda en ahorros?";
    assert.equal(referenceFor(q)?.question, q);
    assert.equal(referenceFor("tabletas"), null);
  });

  it("(2) la separación: la búsqueda no importa al Asesor ni recibe el libro", () => {
    for (const f of ["./search.ts", "./searchfn.ts"]) {
      const src = srcOf(f);
      assert.ok(!/from\s+"\.\/(ask|ask2|questionbank)\.ts"/.test(src), `${f} no importa el intérprete del Asesor`);
    }
    // El índice y la referencia firman sin el libro: (texto) y
    // (consulta, idioma, modo) — ninguna cifra puede cruzar (L-B1).
    assert.equal(referenceFor.length, 1);
    assert.equal(searchFunctions.length, 3);
    assert.equal(searchPlaces.length, 4); // (libro, consulta, idioma, nombres): lugares del libro, sin cifras del Asesor
  });

  it("(3) lugares primero y entrada natural: la sustancia manda", () => {
    const s = fixture();
    const es = makeNamer(s.structure, "es");
    const en = makeNamer(s.structure, "en");
    const places = searchPlaces(s, "¿cuánto me queda en ahorros?", "es", es);
    assert.ok(places.length >= 1);
    assert.equal(places[0]!.title, "Ahorro");
    assert.equal(places[0]!.kind, "cat");
    assert.equal(searchPlaces(s, "savings", "en", en)[0]!.title, "Savings");
    assert.deepEqual(searchPlaces(s, "tabletas", "es", es), []);
    // La línea de la sustancia se encuentra bajo la pregunta entera…
    const hits = searchLedger(s, "¿cuánto me queda en ahorros?", "es", es);
    assert.ok(hits.some((h) => h.id.includes("dep")), "la línea de ahorros aparece");
    // …y una consulta de puras muletillas no caza nada ni rompe nada.
    assert.deepEqual(searchLedger(s, "de la en un", "es", es), []);
    assert.deepEqual(searchPlaces(s, "de la en un", "es", es), []);
    // La búsqueda pura sigue intacta (aditividad, L-B4).
    assert.ok(searchLedger(s, "tabletas", "es", es).some((h) => h.id.includes("tab")));
  });

  it("(4) el índice de funciones: cobertura, la de exportar y su piso nombrado", () => {
    for (const e of FARO_FUNCTION_MAP) {
      assert.ok(e.does.es.length > 10 && e.does.en.length > 10, `${e.id} trae su línea en los dos idiomas`);
      assert.ok(!e.does.es.includes(";") && !e.does.en.includes(";"), `${e.id} sin cadena de punto y coma`);
      const found = searchFunctions(e.name.es, "es", "completo");
      assert.ok(found.some((h) => h.id === e.id), `${e.id} se encuentra por su propio nombre`);
    }
    // El espécimen 7 del estudio: «exportar» → su función, con puerta.
    const exp = searchFunctions("exportar", "es", "completo");
    assert.equal(exp[0]!.id, "ajustes.exportar");
    assert.equal(exp[0]!.topic, "exportar");
    assert.equal(FUNCTION_TOPIC["ajustes.exportar"], "exportar");
    assert.ok(findTopic("exportar")?.go, "el tema «exportar» tiene puerta");
    // Su piso se nombra desde Esencial; en su piso, la puerta va limpia.
    assert.equal(searchFunctions("exportar", "es", "esencial")[0]!.floor, "ritmo");
    assert.equal(searchFunctions("exportar", "es", "ritmo")[0]!.floor, undefined);
    // La forma de verbo manda el orden de los grupos; el sustantivo, no.
    assert.equal(looksVerbal("exportar el mes"), true);
    assert.equal(looksVerbal("imprimir"), true);
    assert.equal(looksVerbal("ahorros"), false);
  });

  it("(5) el traspaso y el retorno viven en la fuente", () => {
    const shell = srcOf("../../components/faro/shell.tsx");
    assert.ok(shell.includes('data-anchor="search-ref"'), "la puerta de la referencia se pinta");
    assert.ok(shell.includes('new CustomEvent("faro-ask-seed", { detail: q })'), "el traspaso despacha la pregunta");
    assert.ok(/setSearchBack\(\{ q: ui\.query, section: ui\.section \}\)/.test(shell), "la búsqueda se guarda antes del viaje");
    assert.ok(shell.includes("searchPlaces(session.ledger") && shell.includes("searchFunctions(ui.query"), "lugares y funciones se derivan en la cáscara");
    const box = srcOf("../../components/faro/ask-box.tsx");
    assert.ok(box.includes('window.addEventListener("faro-ask-seed"'), "la caja escucha la semilla");
    assert.ok(box.includes("seedRef.current = ask"), "la semilla se envía como pregunta escrita en la caja");
  });

  it("(6) Manual y Novedades en la misma ola", () => {
    const buscar = findTopic("buscar");
    assert.ok(buscar?.what[0].includes("brújula") && buscar.what[0].includes("Lugares"), "el tema de buscar cuenta la referencia y los grupos (ES)");
    assert.ok(buscar?.what[1].includes("compass") && buscar.what[1].includes("Places"), "…y en inglés");
    const preguntar = findTopic("preguntar-asesor");
    assert.ok(preguntar?.what[0].includes("desde la búsqueda"), "preguntar nombra la referencia como llegada (ES)");
    assert.ok(preguntar?.what[1].includes("arrive from search"), "…y en inglés");
    const n = NEWS.find((x) => x.version === "1.3.382");
    assert.ok(n && n.level === "grande" && n.topic === "buscar", "la nota de la 1.3.382 es grande y abre en «buscar»");
  });
});
