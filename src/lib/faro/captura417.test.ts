/* 1.3.417 — Cada renglón, su tarjetita (Oscar, 2026-11-22 15:36, ley
 * permanente de diseño): los renglones de «Cambios de precio» eran
 * texto suelto sobre el fondo; ahora cada cambio lleva su propia
 * tarjeta — borde y superficie — APAGADA (atenuada) hasta que se
 * selecciona, y encendida con el acento al elegirse. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../components/faro/price-watch.css", import.meta.url), "utf8");
const row = css.slice(css.indexOf(".pw-row {"), css.indexOf(".pw-row-main"));
const picked = css.slice(css.indexOf(".pw-row.is-picked {"), css.indexOf(".pw-row-main"));

test("417 · el renglón es una tarjeta: borde y superficie propios", () => {
  assert.ok(row.includes("border: 1px solid var(--line);"), "el borde de la casa");
  assert.ok(row.includes("border-radius: 12px;"), "la esquina de la casa");
  assert.ok(row.includes("background: color-mix(in oklab, var(--fg) 3%, transparent);"), "su superficie tenue");
  assert.ok(!row.includes("background: none"), "nada de fondo desnudo");
});

test("417 · la tarjetita vive apagada hasta que se selecciona", () => {
  assert.ok(row.includes("opacity: .66;"), "apagada por defecto");
  assert.ok(picked.includes("opacity: 1;"), "encendida al elegirse");
  assert.ok(picked.includes("border-color: color-mix(in oklab, var(--accent) 55%, var(--line));"), "el borde se enciende con el acento");
});

test("417 · la fila conserva su foco visible", () => {
  assert.ok(css.includes(".pw-row:focus-visible { outline: 2px solid var(--accent);"), "el foco se ve");
});
