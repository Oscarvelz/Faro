/**
 * captura370 — la cerca de la 1.3.370 «Folios en armonía» (fallos de Oscar,
 * 2026-11-21 17:20 y corrección 17:29, y su queja del envoltorio 17:29):
 *
 *  1. El orden de las pastillas de Folios es Bitácora · Historial ·
 *     Archivo — su razón: Historial está más cerca en función de Archivo
 *     que la Bitácora de Archivo; la Bitácora es otra cosa y abre.
 *  2. La fila es de TRES columnas en una sola línea: la rejilla del par
 *     (dos columnas) dejaba caer la tercera pastilla a una segunda fila.
 *  3. Nada de textos sueltos: el aviso de encuadernación y el estado
 *     vacío de la Bitácora visten la Note de la casa (finish.tsx), como
 *     sus hermanas Historial y Archivo — las clases a medio hacer
 *     (lg-binding-note, lg-empty) no vuelven.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const chipsSrc = read("../../components/faro/folios-chips.tsx");
const stylesSrc = read("../../styles.css");
const bitSrc = read("../../components/faro/bitacora.tsx");
const bitCss = read("../../components/faro/bitacora.css");

test("370-1 · el orden fallado: Bitácora · Historial · Archivo", () => {
  const arr = chipsSrc.match(/const PASTILLAS[^;]+;/);
  assert.ok(arr, "la fila declara sus pastillas");
  const order = [...arr[0].matchAll(/"(bitacora|historial|archivo)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ["bitacora", "historial", "archivo"]);
});

test("370-2 · tres columnas, una línea: la rejilla de Folios es de tres", () => {
  assert.match(stylesSrc, /\.seg\.is-follow\.fol-chips\s*\{\s*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

test("370-3 · la Bitácora viste la Note de la casa, sin textos sueltos", () => {
  assert.match(bitSrc, /import \{ Note \} from "\.\/finish";/);
  assert.match(bitSrc, /<Note kind="tip">/);
  assert.match(bitSrc, /<Note kind="empty">/);
  assert.ok(!bitSrc.includes("lg-binding-note"), "el aviso ya no es un párrafo a medio enmarcar");
  assert.ok(!bitSrc.includes('className="lg-empty"'), "el vacío ya no es una caja de guiones propia");
  assert.ok(!bitCss.includes(".lg-binding-note") && !bitCss.includes(".lg-empty"), "las clases viejas no quedan en la hoja");
});
