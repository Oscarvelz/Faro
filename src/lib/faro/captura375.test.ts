import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const shellSrc = read("../../components/faro/shell.tsx");
const newsSrc = read("./novedades.ts");

// 1.3.375 — LA BARRA VUELVE A SU ORDEN. La única revocación de Oscar a
// la 1.3.374 (2026-11-21 20:51): el reordenamiento se deshace porque
// «hay un espacio necesario entre el calendario y la lupa» — la lupa
// vive fuera de la rejilla y el calendario dentro, y ese borde es el
// aire entre ambos. Todo lo demás de la 374 queda en pie.

test("375-1 · el Asesor y la lupa viven fuera de la rejilla; el calendario y la moneda, dentro", () => {
  const grid = shellSrc.indexOf('<div className="desk-grid">', shellSrc.indexOf("icon-desk-tools"));
  const at = (anchor: string) => shellSrc.indexOf(`data-anchor="${anchor}"`);
  assert.ok(at("top-ask") > 0 && at("top-ask") < grid, "el acceso al Asesor queda antes de la rejilla, en su hueco de la 372");
  assert.ok(at("top-search") > at("top-ask") && at("top-search") < grid, "la lupa queda antes de la rejilla, tras el Asesor");
  assert.ok(at("top-cal") > grid && at("top-coin") > at("top-cal"), "calendario y moneda quedan dentro de la rejilla, en ese orden");
});

test("375-2 · la revocación queda escrita en el código, con su razón", () => {
  assert.ok(shellSrc.includes("espacio necesario"), "el comentario de la barra nombra el espacio necesario");
  assert.ok(shellSrc.includes("1.3.375 lo"), "el comentario registra la ola que lo devuelve");
  assert.ok(shellSrc.includes("<Compass"), "la brújula queda: la revocación fue solo del orden");
});

test("375-3 · Novedades cuenta la vuelta, sin borrar la ida", () => {
  const i375 = newsSrc.indexOf('version: "1.3.375"');
  const i374 = newsSrc.indexOf('version: "1.3.374"');
  assert.ok(i375 > 0 && i374 > i375, "la nota de la 375 existe y va primero; la de la 374 queda como historia");
  const entry = newsSrc.slice(i375, i374);
  assert.ok(entry.includes("vuelve a leerse como antes") && entry.includes("reads as it did before"), "la nota dice la vuelta en los dos idiomas");
  assert.ok(entry.includes("Todo lo demás de la nota anterior queda") && entry.includes("Everything else from the previous note stays"), "y declara que el resto de la 374 queda");
});
