/**
 * captura450 — 1.3.450 «Las figuras se dibujan»: el dibujo del
 * censo de figuras en la caja del Asesor. La 449 dejó las figuras
 * DECLARADAS en el banco; esta las DIBUJA dentro de la tarjeta de
 * la respuesta, con los tokens del tema.
 *
 * Lo que esta cerca clava:
 *  1. EL COMPONENTE: bank-figure.tsx dibuja las SEIS formas del
 *     censo (escala, barras, camino, lado, meses, árbol) desde la
 *     declaración — no calcula ninguna cifra: puntos, banda y
 *     marcas vienen en los datos.
 *  2. LAS BARRAS QUE SUMAN tienen sus dos cuerpos honestos: una
 *     barra partida cuando las piezas suman el total, y filas
 *     firmadas cuando la figura es una resta.
 *  3. EL ASIENTO: la figura vive en la tarjeta de la respuesta,
 *     bajo sus piezas y antes de la nota, SIN asiento de modo —
 *     la respuesta no se castiga.
 *  4. EL ENVOLTORIO: .ask-fig lleva su propio borde y superficie
 *     en advisor2.css, con los tokens del tema (--accent, --bad,
 *     --warn, --line).
 *  5. EL MANUAL lo cuenta en «Preguntar al Asesor», en los dos
 *     idiomas, con la condición de exactitud dicha.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const fig = readFileSync(new URL("../../components/faro/bank-figure.tsx", import.meta.url), "utf8");
const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");
const topics = readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

describe("captura450 · las figuras se dibujan en la caja", () => {
  it("el componente dibuja las seis formas desde la declaración, sin calcular cifras", () => {
    for (const kind of ["escala", "barras", "camino", "lado", "meses", "arbol"]) {
      assert.ok(fig.includes(`figure.kind === "${kind}"`), `la forma ${kind} tiene su dibujo`);
    }
    assert.ok(fig.includes('data-anchor="ask-figure"'), "la figura lleva su ancla");
    assert.ok(fig.includes("ninguna cifra se calcula aquí"), "la ley del dibujo está escrita: dibuja lo declarado");
  });

  it("las barras que suman: barra partida si suman el total, filas firmadas si es una resta", () => {
    assert.ok(fig.includes("sum === total"), "la barra partida solo cuando la suma cierra exacta");
    assert.ok(fig.includes('p.minor < 0 ? " is-neg"'), "la pieza negativa se dibuja firmada");
    assert.ok(fig.includes("ask-fig-stack"), "la barra partida existe");
  });

  it("el asiento: en la tarjeta, bajo las piezas, antes de la nota, sin asiento de modo", () => {
    const at = box.indexOf("result.figure ? <BankFigureView");
    assert.ok(at > 0, "la caja dibuja la figura declarada");
    assert.ok(box.slice(at - 1400, at).includes("ask-pieces"), "va tras las piezas");
    assert.ok(box.slice(at, at + 400).includes("result.note"), "va antes de la nota");
    assert.ok(box.includes('import { BankFigureView } from "./bank-figure";'), "la caja importa el dibujo");
    assert.ok(!box.slice(at - 200, at).includes('has("'), "ningún modo castiga la figura de una respuesta");
  });

  it("el envoltorio: la figura lleva su tarjeta, con los tokens del tema", () => {
    assert.ok(css.includes(".ask-fig { margin: 10px 0 2px; border: 1px solid var(--line);"), "su propio borde y superficie");
    assert.ok(css.includes(".ask-fig-path { fill: none; stroke: var(--accent);"), "el camino se dibuja con el acento del tema");
    assert.ok(css.includes(".ask-fig-dot.is-minimo"), "el mínimo del camino se marca");
  });

  it("el Manual lo cuenta, con la condición de exactitud, y la cerca está registrada", () => {
    assert.ok(topics.includes("la respuesta la dibuja bajo sus piezas"), "el qué de Preguntar al Asesor lo cuenta en español");
    assert.ok(topics.includes("the answer draws it under its pieces"), "y en inglés");
    assert.ok(topics.includes("Donde una cifra no se puede medir con exactitud, la respuesta no trae figura"), "la condición de exactitud está dicha");
    assert.ok(pkg.includes("src/lib/faro/captura450.test.ts"), "captura450 registrada en test:faro");
  });
});
