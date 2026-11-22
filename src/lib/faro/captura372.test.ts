/**
 * captura372 — la cerca de la 1.3.372 «El Asesor en la barra; las vistas,
 * flotantes» (fallo de Oscar, 2026-11-21 17:31):
 *
 *  1. El hueco de Vista en la barra superior lo ocupa el acceso directo a
 *     Preguntar al Asesor (ancla top-ask, mapea a advisor.ask en el
 *     registro de saltos); el menú de Vista ya no vive en la barra.
 *  2. Las vistas bajan a un botón flotante permanente abajo a la
 *     izquierda que conserva el ancla top-view (el mapa y la Presentación
 *     apuntan al control, viva donde viva) y el menú entero.
 *  3. La sincronía es UN reloj: el deslizamiento del cromo publica
 *     --dock-drop y --dock-travel en la raíz del documento (los botones
 *     viven fuera del marco; en el marco la variable no les llegaba —
 *     cazado en el banco), y Subir y el botón de Vista consumen la
 *     misma variable — nunca dos mediciones.
 *  4. Ambos botones miden 36px (el ~10 % menos que falló Oscar).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { featureForGo } from "./mode";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const shellSrc = read("../../components/faro/shell.tsx");
const toTopSrc = read("../../components/faro/to-top.tsx");
const toTopCss = read("../../components/faro/to-top.css");
const floatCss = read("../../components/faro/float.css");

test("372-1 · la barra lleva el acceso directo al Asesor, no el menú de Vista", () => {
  assert.ok(shellSrc.includes('data-anchor="top-ask"'), "el acceso directo existe");
  assert.ok(shellSrc.includes("MessageCircleQuestion"), "lleva la marca de la caja de preguntas");
  assert.ok(shellSrc.includes("const goAsk"), "un toque lleva a la caja y le da el foco");
  const toolsAt = shellSrc.indexOf('className="icon-desk-tools"');
  const askAt = shellSrc.indexOf('data-anchor="top-ask"');
  const searchAt = shellSrc.indexOf('data-anchor="top-search"');
  assert.ok(toolsAt > 0 && askAt > toolsAt && askAt < searchAt, "el acceso ocupa el hueco de Vista, entre el tema y la lupa");
  assert.equal(featureForGo({ screen: "top", anchor: "top-ask" }), "advisor.ask", "el salto mapea a preguntar, Esencial");
});

test("372-2 · las vistas viven en el flotante, con su ancla y su menú enteros", () => {
  assert.ok(shellSrc.includes("function ViewFloat"), "el botón flotante existe");
  assert.ok(shellSrc.includes('className={`view-fab'), "viste la piel de la familia de Subir");
  assert.ok(shellSrc.includes('data-anchor="top-view"'), "el ancla top-view se conserva en el flotante");
  assert.ok(shellSrc.includes('data-anchor="view-menu"'), "el menú viaja con el botón");
  assert.ok(shellSrc.includes('data-anchor="view-one"') && shellSrc.includes('data-anchor="view-rows"'), "las vistas del menú siguen");
  assert.equal(featureForGo({ screen: "top", anchor: "top-view" }), "nav.tablet-views", "el mapa de saltos no se movió");
});

test("372-3 · un solo reloj para la barra: --dock-drop lo publica el cromo y lo consumen los dos", () => {
  assert.ok(shellSrc.includes('setProperty("--dock-drop"'), "el deslizamiento publica el descenso");
  assert.ok(shellSrc.includes('setProperty("--dock-travel"'), "y el recorrido total");
  assert.ok(toTopCss.includes("translate: 0 var(--dock-drop, 0px)"), "Subir consume la variable");
  assert.ok(floatCss.includes("translate: 0 var(--dock-drop, 0px)"), "el botón de Vista consume la misma");
  assert.ok(floatCss.includes("var(--dock-travel, 0px) + 12px"), "su altura de casa sale del recorrido de la barra");
  assert.ok(toTopSrc.includes("offsetHeight"), "Subir mide su casa sin el deslizamiento (offsetHeight no siente el transform)");
});

test("372-4 · ambos botones, ~10 % más pequeños: 36px", () => {
  assert.ok(/\.to-top \{[^}]*width: 36px; height: 36px/.test(toTopCss), "Subir mide 36");
  assert.ok(/\.view-fab \{[^}]*width: 36px; height: 36px/.test(floatCss), "Vista mide 36");
  assert.ok(!/\.to-top \{[^}]*width: 40px/.test(toTopCss), "el 40 viejo no queda");
});
