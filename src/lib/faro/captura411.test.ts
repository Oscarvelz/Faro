/* 1.3.411 — «Cambios de precio», dirección A de Oscar (2026-11-22): la
 * escalera con acabado y selección de doble vía. La escalera vive en su
 * bandeja hundida con el relleno del acento; el tramo del cambio elegido
 * va encendido (el escalón en su fecha y el nivel nuevo corriendo); la
 * tarjeta de detalle responde debajo (de cuánto a cuánto, el efecto al
 * mes, cuánto lleva a ese precio); y tocar un escalón de la escalera
 * elige el mismo cambio que su renglón en la lista. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const tsx = read("../../components/faro/price-watch.tsx");
const css = read("../../components/faro/price-watch.css");
const topics = read("../../lib/manual/topics.ts");

test("411 · la escalera vive en su bandeja, con el relleno del acento", () => {
  assert.ok(tsx.includes('className="pw-plot"'), "la bandeja envuelve la gráfica");
  assert.ok(css.includes(".pw-plot"), "la bandeja tiene su regla");
  assert.ok(css.includes("inset 0 2px 10px"), "la bandeja es hundida");
  assert.ok(tsx.includes('className="pw-area"'), "el relleno bajo la escalera se pinta");
  assert.ok(css.includes(".pw-area { fill: var(--accent);"), "el relleno es del acento del tema");
});

test("411 · el tramo del cambio elegido va encendido", () => {
  assert.ok(tsx.includes('className="pw-step-lit"'), "el tramo encendido se pinta");
  assert.ok(css.includes(".pw-step-lit { stroke: var(--accent); stroke-width: 3.5;"), "el tramo manda en grosor");
  assert.ok(tsx.includes("selIdx"), "el tramo se calcula del cambio elegido");
  assert.ok(tsx.includes('"pw-dot-sel"'), "el vértice del precio nuevo se marca");
});

test("411 · la tarjeta de detalle responde por el cambio", () => {
  assert.ok(tsx.includes('className="pw-detail"'), "la tarjeta existe");
  assert.ok(tsx.includes("pw-detail-old") && tsx.includes("pw-detail-new"), "de cuánto a cuánto");
  assert.ok(tsx.includes('"más al mes"') && tsx.includes('"menos al mes"'), "el efecto al mes lleva su dirección");
  assert.ok(tsx.includes("monthsAt(lang, current.to.on, today)"), "cuánto lleva a ese precio se calcula");
  assert.ok(tsx.includes('"desde el"'), "el detalle nombra desde cuándo");
});

test("411 · la selección es de doble vía: el escalón elige como el renglón", () => {
  assert.ok(tsx.includes("endsAt"), "cada vértice sabe qué cambio termina en él");
  assert.ok(tsx.includes('className="pw-hit"'), "los escalones se pueden tocar");
  assert.ok(tsx.includes("onPick(id)"), "el toque del escalón elige el cambio");
  assert.ok(tsx.includes("onClick={() => setPick(c.id)}"), "el renglón sigue eligiendo");
  assert.ok(tsx.includes("o un escalón de su escalera"), "la introducción lo dice en español");
  assert.ok(tsx.includes("or a step on its staircase"), "y en inglés");
});

test("411 · el Manual cuenta la forma nueva", () => {
  assert.ok(topics.includes("o el escalón mismo en la escalera"), "el cómo lo dice en español");
  assert.ok(topics.includes("or the step itself on the staircase"), "y en inglés");
});
