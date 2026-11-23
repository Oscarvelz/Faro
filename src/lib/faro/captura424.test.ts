/**
 * Captura 424 — tres rincones ganan su envoltorio.
 *
 * Oscar (2026-11-22 17:39 EST, con tres fotos): «Estos son algunos
 * espacios donde hace falta trabajo. El texto está suelto o pegado
 * literalmente al borde de la tabla. Un problema real sobre el saldo
 * proyectado día a día. Usa la ley de envoltorio para elevar su dignidad
 * al estilo de Faro y sus temas.»
 *
 * (1) La Lista de espera: su sección era una columna desnuda — el título
 * y el texto quedaban sueltos sobre el fondo. Ahora la sección es una
 * bandeja hundida de la casa y sus tarjetas se levantan sobre ella.
 * (2) La vista del año en Estudio: las filas de lo guardado llevaban
 * 2 px laterales y los meses 8 — pegados al borde de la tabla. Aire.
 * (3) El Saldo proyectado: su tarjeta no llevaba relleno — el texto
 * corría de borde a borde y la última línea se cortaba. Relleno.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const wlCss = read("../../components/faro/waitlist.css");
const projCss = read("../../components/faro/projection.css");
const styles = read("../../styles.css");

test("424 · la Lista de espera vive en su bandeja, no suelta sobre el fondo", () => {
  const sec = wlCss.slice(wlCss.indexOf(".wl-section {"), wlCss.indexOf(".wl-section {") + 320);
  assert.ok(sec.includes("border: 1px solid var(--line)"), "la sección lleva su borde");
  assert.ok(sec.includes("border-radius: 14px"), "y su radio de tarjeta");
  assert.ok(sec.includes("padding: 14px"), "y su relleno");
  assert.ok(sec.includes("color-mix(in oklab, var(--fg) 3%, transparent)"), "bandeja hundida: las tarjetas se levantan sobre ella");
});

test("424 · las filas del año respiran dentro de la tabla", () => {
  const srow = styles.slice(styles.indexOf(".year-srow {"), styles.indexOf(".year-srow {") + 200);
  assert.ok(srow.includes("padding: 7px 10px"), "lo guardado ya no pega al borde (era 5px 2px)");
  const month = styles.slice(styles.indexOf(".year-month {"), styles.indexOf(".year-month {") + 200);
  assert.ok(month.includes("padding: 8px 10px"), "los meses llevan su aire (era 6px 8px)");
});

test("424 · el Saldo proyectado lleva su relleno", () => {
  const card = projCss.slice(projCss.indexOf(".proj-card {"), projCss.indexOf(".proj-card {") + 200);
  assert.ok(card.includes("padding: 14px 16px 16px"), "la tarjeta respira por los cuatro lados");
});
