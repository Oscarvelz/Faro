/**
 * Captura 423 — el detalle de precio respira, y la cabecera viste su ficha.
 *
 * Oscar (2026-11-22 17:33 EST, con fotos): en el detalle de Cambios de
 * precio el efecto («≈ C$200.00 / más al mes») pegaba en el borde derecho
 * de la tarjeta y se cortaba — «debería respirar y dejar su espacio, como
 * lo hace el texto de abajo». La fila de números envuelve: si no cabe, el
 * efecto baja a su propia línea, a la derecha, dentro del relleno.
 *
 * Rider (18:02–18:03, CONSISTENCIA — principio de la ley de envoltorio):
 * «debes utilizar el mismo color que tienen las fichas originales cuando
 * las toco y bajo… el nuevo texto indicador refleja que la ficha está
 * seleccionada». El NOMBRE de la cabecera de lente (1.3.421) viste el
 * color exacto de su ficha seleccionada, como ya hacía la barrita.
 *
 * ENMIENDA 1.3.427 (Oscar, 19:38–19:41): aquello no bastó — la cabecera
 * seguía siendo un título genérico. La 427 la viste con la cara entera
 * de la ficha (ícono, fuente y color de su rótulo «lens-kicker»); las
 * reglas del nombre de la 423 y la barrita de la 421 quedan retiradas,
 * y la tercera prueba de esta cerca clava la retirada. La cara vive en
 * captura427.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const pwCss = read("../../components/faro/price-watch.css");
const screens = read("../../components/faro/screens.tsx");
const styles = read("../../styles.css");

test("423 · la fila del detalle envuelve y el efecto respira dentro de la tarjeta", () => {
  const nums = pwCss.slice(pwCss.indexOf(".pw-detail-nums"), pwCss.indexOf(".pw-detail-nums") + 260);
  assert.ok(nums.includes("flex-wrap: wrap"), "la fila de números envuelve");
  assert.ok(nums.includes("row-gap"), "la línea que baja lleva su aire");
  const fx = pwCss.slice(pwCss.indexOf(".pw-detail-fx {"), pwCss.indexOf(".pw-detail-fx {") + 200);
  assert.ok(fx.includes("margin-left: auto"), "el efecto sigue alineado a la derecha al bajar");
});

test("423 · la cabecera entera lleva la clase de su lente y su tono", () => {
  const head = screens.slice(screens.indexOf("desk-focus-head"), screens.indexOf("desk-focus-head") + 320);
  assert.ok(head.includes("desk-focus-head is-${lensMode}"), "la cabecera lleva la clase de su lente");
  assert.ok(head.includes('tone-${summary.tone}'), "y el tono del semáforo cuando es Pagos");
});

test("423 · el nombre viste el color exacto de su ficha seleccionada", () => {
  // Enmienda 1.3.427: las reglas del nombre en <strong> y la barrita
  // quedaron retiradas — la cabecera lleva la cara de la ficha (cerca 427).
  assert.ok(!styles.includes(".desk-focus-head.is-have strong"), "las reglas del nombre de la 423 están retiradas");
  assert.ok(!styles.includes(".desk-focus-head.is-debt.tone-bad strong"), "ningún tono pinta el nombre por su cuenta");
  assert.ok(!styles.includes(".desk-focus-bar"), "la barrita de la 421 también se retiró");
});
