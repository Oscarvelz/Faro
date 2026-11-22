/* 1.3.418 — El botón de añadir, a su medida (Oscar, 2026-11-22 15:52):
 * los «+ Añadir» del catálogo estaban demasiado grandes sin necesidad;
 * la palabra y el + caben pequeños, y el ancho que el botón suelta deja
 * a muchas preguntas en una sola línea. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../../components/faro/advisor2.css");
const mgr = read("../../components/faro/ask-presets.tsx");
const add = css.slice(css.indexOf(".ap-add {"), css.indexOf(".ap-add:disabled"));

test("418 · el botón baja a su medida", () => {
  assert.ok(add.includes("padding: 4px 9px;"), "menos relleno");
  assert.ok(add.includes("font-size: .78rem;"), "la palabra más pequeña");
  assert.ok(!add.includes("padding: 7px 11px"), "la medida vieja se fue");
});

test("418 · el signo más también baja", () => {
  const pluses = mgr.match(/<Plus size=\{12\} \/>/g) ?? [];
  assert.equal(pluses.length, 2, "los dos asientos del botón (la tuya y el catálogo)");
  assert.ok(!mgr.includes("<Plus size={14}"), "ningún + grande queda");
});
