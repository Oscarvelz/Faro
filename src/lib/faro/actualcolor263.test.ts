// «EL ACTUAL SE DISTINGUE» (Oscar, 2026-11-14 04:10 EST, foto de la placa
// «Mes actual» en Tron): la placa del navegador del Historial, cuando dice
// «actual», viste su propio color — el acento de cada tema — para leerse
// distinta del nombre verdadero. Lo que fijan estas cercas:
//  - el gancho (is-now) cuelga de la MISMA onPresent de la 255/262: la placa
//    es su único asiento en la pantalla y no nace ninguna segunda noción de
//    presente (periodRange(lens, today, weekStart) sigue apareciendo una
//    sola vez);
//  - la gramática es una sola para los dieciocho temas: la letra encendida
//    pinta var(--accent) — el color nace de la variable del tema, jamás de
//    un hex en el componente ni de una regla por tema;
//  - el único acompañamiento permitido: el filete de Costa y de Océano, que
//    en reposo ya se teñía de acento, se fortalece hasta var(--accent) —
//    ningún otro tema gana regla is-now;
//  - fuera del presente NADA cambia: la regla base de la placa conserva su
//    var(--fg) y su forma; el folio del panel de totales jamás toma el
//    tratamiento (ni la clase ni el acento).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const tsx = read("components/faro/historial.tsx");
const css = read("components/faro/historial.css");
const temas = read("components/faro/hist-temas.css");

describe("el actual se distingue: el gancho", () => {
  it("is-now cuelga de onPresent en la placa, y solo en la placa", () => {
    assert.match(tsx, /className=\{onPresent \? "hist-period is-now" : "hist-period"\}/);
    const seats = tsx.match(/"hist-period is-now"/g) ?? [];
    assert.equal(seats.length, 1, "la clase encendida se sienta una sola vez en la pantalla: en la placa");
  });

  it("ninguna segunda noción de presente: periodRange(lens, today, …) sigue apareciendo una sola vez", () => {
    const calls = tsx.match(/periodRange\(lens, today, weekStart\)/g) ?? [];
    assert.equal(calls.length, 1, "el gancho reutiliza la onPresent de la 255; no computa otro presente");
  });
});

describe("el actual se distingue: la pintura", () => {
  it("la letra encendida viste var(--accent): una sola regla, sin hex, para todos los temas", () => {
    assert.match(css, /\.hist-period\.is-now \{ color: var\(--accent\); \}/);
    const rules = css.match(/\.hist-period\.is-now/g) ?? [];
    assert.equal(rules.length, 1, "la gramática del actual es una sola regla en historial.css");
  });

  it("el filete que ya se teñía (Costa, Océano) casa con la letra; ningún otro tema gana regla is-now", () => {
    assert.match(temas, /\[data-theme="costa"\] \.hist-period\.is-now \{ border-color: var\(--accent\); \}/);
    assert.match(temas, /\[data-theme="oceano"\] \.hist-period\.is-now \{ border-color: var\(--accent\); \}/);
    const rules = temas.match(/\.hist-period\.is-now/g) ?? [];
    assert.equal(rules.length, 2, "solo Costa y Océano acompañan con el filete; el resto es letra sola");
  });
});

describe("el actual se distingue: fuera del presente, nada cambia", () => {
  it("la regla base de la placa conserva su letra de siempre (var(--fg)) y su forma", () => {
    assert.match(css, /\.hist-period \{\s+flex: 1 1 auto; min-width: 0; min-height: 44px;/);
    assert.match(css, /color: var\(--fg\); background: var\(--surface\); border: 1px solid var\(--line\); border-radius: 999px;/);
  });

  it("el folio del panel de totales jamás toma el tratamiento", () => {
    assert.match(tsx, /<span className="hist-folio-period">\{periodLabel\}<\/span>/);
    assert.doesNotMatch(css, /hist-folio-period[^{]*\{[^}]*--accent/);
    assert.doesNotMatch(temas, /hist-folio-period[^{]*\{[^}]*--accent/);
    assert.doesNotMatch(temas, /hist-folio-period/);
  });
});
