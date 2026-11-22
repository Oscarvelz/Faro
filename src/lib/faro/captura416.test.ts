/* 1.3.416 — El catálogo de sugerencias en tarjetas (Oscar, 2026-11-22
 * 14:32): el administrador de «Preguntas a la mano» deja la lista
 * interminable por familia y agrupa el catálogo en tarjetas por
 * territorio — los seis de la descripción de capacidades — con títulos
 * cortos y su conteo, cerradas al llegar y una abierta a la vez.
 * Dentro de la tarjeta, añadir sigue a un toque y lo guardado se marca. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const mgr = read("../../components/faro/ask-presets.tsx");
const css = read("../../components/faro/advisor2.css");
const presets = read("./askpresets.ts");
const topics = read("../../lib/manual/topics.ts");

test("416 · el catálogo se agrupa por territorio, sin repetir preguntas", () => {
  assert.ok(presets.includes("export function presetCatalogByGroup"), "el agrupador existe");
  assert.ok(presets.includes("CAP_GROUPS.map"), "los territorios son los de la descripción");
  const mod = presets.slice(presets.indexOf("presetCatalogByGroup"), presets.indexOf("presetCatalogByGroup") + 900);
  assert.ok(mod.includes("seen.has(k)"), "dentro de la tarjeta no se repite");
});

test("416 · el administrador pinta tarjetas cerradas, una abierta a la vez", () => {
  assert.ok(mgr.includes('className="ap-cat-head"'), "la cabecera de la tarjeta existe");
  assert.ok(mgr.includes('aria-expanded={openGroup === gi}'), "la cabecera declara su estado");
  assert.ok(mgr.includes("useState(-1)"), "el catálogo llega cerrado");
  assert.ok(mgr.includes('className="ap-cat-count"'), "cada tarjeta dice cuánto guarda");
  assert.ok(css.includes(".ap-cat-card { border: 1px solid var(--line);"), "la tarjeta tiene su borde");
  assert.ok(!mgr.includes("ap-group-name"), "el rótulo por familia se retiró");
});

test("416 · dentro de la tarjeta, añadir sigue a un toque y lo guardado se marca", () => {
  assert.ok(mgr.includes('data-anchor="ap-cat-add"'), "el botón de añadir vive dentro");
  assert.ok(mgr.includes('data-anchor="ap-added"'), "lo guardado se marca dentro");
  assert.ok(mgr.includes("addAskPreset(s, q)"), "añadir guarda la pregunta tal cual");
});

test("416 · el Manual cuenta la forma nueva", () => {
  assert.ok(topics.includes("agrupadas por territorio en tarjetas que se abren al tocarlas"), "en español");
  assert.ok(topics.includes("grouped by territory in cards that open when tapped"), "en inglés");
});
