/**
 * Captura 434 — seis arreglos de envoltorio, de las fotos de Oscar
 * (2026-11-23 17:08–17:14 EST). «Excelentes diseños», dijo de la 428 y
 * la 430 — y corrigió el acabado, como siempre:
 *
 * (1) El candadito de la palanca: MÁS PEQUEÑO (marco de 20px, glifo de
 *     10) y SUBIDO a la línea de la tarjeta de al lado (la del AÑO):
 *     el riel baja de 148 a 126px y la columna respira 6px, para que
 *     el centro del candado caiga en la línea de esa tarjeta.
 * (2) Las tarjetas del bolsillo (Casa, Viaje «y las que se le
 *     parecen») ganan su hueco: ya no se tocan como un solo bloque.
 * (3) La cabecera de la Lista de espera: «sin corte de frase» — el
 *     título y el botón, cada uno en UNA línea, mejor enmarcados.
 * (4) La tarjeta de la Lista de espera: la bandeja hundida de la 424
 *     se lavaba contra el fondo; ahora es una tarjeta plena, a la
 *     altura de las demás. El texto y su distribución no cambian.
 * (5) El Saldo proyectado, día a día: el ORDEN del texto no se toca
 *     (él lo ama así) — el veredicto vive en su propia tarjeta, la
 *     etiqueta del día apretado viaja en su pastilla (la línea ya no
 *     la cruza), la flechita suelta que no reaccionaba es un botón de
 *     verdad, y cada día del camino lleva su tarjetita.
 * (6) Guardado al cerrar el año: la misma distribución, con los
 *     renglones en tarjetitas premium — lo guardado y los meses.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const styles = read("../../styles.css");
const wlCss = read("../../components/faro/waitlist.css");
const proj = read("../../components/faro/projection.tsx");
const projCss = read("../../components/faro/projection.css");

test("434 · el candado, más pequeño y en la línea de la tarjeta del AÑO", () => {
  assert.ok(styles.includes(".lever-lock { width: 20px; height: 20px;"), "el marco baja a 20px (era 24 en la 430, 30 antes)");
  assert.ok(styles.includes(".lever-lock svg { width: 10px; height: 10px; }"), "el glifo baja a 10px");
  assert.ok(styles.includes(".vault-lever-rail { position: relative; height: 117px;"), "el riel se acorta (148 → 117, medido en el banco) y el candado sube a la línea del AÑO");
  assert.ok(styles.includes(".vault-lever-side { display: flex; flex-direction: column; align-items: center; gap: 6px; }"), "la columna respira 6px, no 8");
});

test("434 · las tarjetas del bolsillo ya no se tocan", () => {
  assert.ok(styles.includes(".save-ledger .pocket-row + .pocket-row { margin-top: 8px; }"), "cada tarjeta del bolsillo respira con su hueco de 8px");
});

test("434 · la cabecera de la Lista de espera, sin corte de frase", () => {
  const title = wlCss.slice(wlCss.indexOf(".wl-title {"), wlCss.indexOf(".wl-title {") + 200);
  assert.ok(title.includes("white-space: nowrap"), "el título no se parte en dos líneas");
  assert.ok(wlCss.includes(".wl-head > .btn { flex: none; white-space: nowrap;"), "ni el botón tampoco");
});

test("434 · la Lista de espera es una tarjeta con contraste", () => {
  const sec = wlCss.slice(wlCss.indexOf(".wl-section {"), wlCss.indexOf(".wl-section {") + 420);
  assert.ok(sec.includes("background: var(--surface)"), "superficie plena, no el lavado del 3%");
  assert.ok(sec.includes("border: 1px solid color-mix(in oklab, var(--accent) 26%, var(--line))"), "el borde lleva la tinta de su acento");
  assert.ok(sec.includes("box-shadow:"), "y su sombra la separa del fondo");
});

test("434 · el veredicto del Saldo proyectado vive en su tarjeta — el orden no cambia", () => {
  const at = proj.indexOf('className="proj-verdict"');
  assert.ok(at > 0, "el texto del veredicto tiene su tarjeta");
  const lead = proj.indexOf('className="advice-lead"', at);
  const tight = proj.indexOf('className="proj-tight"', at);
  const figs = proj.indexOf('className="proj-figs"', at);
  assert.ok(lead > at && (tight < 0 || lead < tight) && (tight < 0 || tight < figs), "veredicto, día apretado y cifras — el orden de siempre");
  assert.ok(projCss.includes(".proj-verdict {"), "y su forma en la hoja");
});

test("434 · la flechita es un botón de verdad y la etiqueta viaja en su pastilla", () => {
  assert.ok(proj.includes('className="proj-fold-btn"'), "la flecha es un botón con su marco");
  assert.ok(proj.includes('aria-expanded={open}'), "que anuncia su estado");
  assert.ok(proj.includes('className="proj-chart-chip"'), "la etiqueta del día apretado lleva su pastilla");
  assert.ok(projCss.includes(".proj-chart-chip rect {"), "la pastilla se pinta tras el texto — la línea pasa por detrás");
});

test("434 · cada día del camino y cada renglón del año, en su tarjetita", () => {
  const row = projCss.slice(projCss.indexOf(".proj-row {"), projCss.indexOf(".proj-row {") + 320);
  assert.ok(row.includes("border: 1px solid"), "el día del camino lleva su borde");
  assert.ok(row.includes("border-radius: 12px"), "y su radio de tarjeta");
  const srow = styles.slice(styles.indexOf(".year-srow {"), styles.indexOf(".year-srow {") + 320);
  assert.ok(srow.includes("border: 1px solid"), "lo guardado del año, en su tarjeta");
  assert.ok(srow.includes("border-radius: 12px"), "con su radio");
  const month = styles.slice(styles.indexOf(".year-month {"), styles.indexOf(".year-month {") + 420);
  assert.ok(month.includes("border: 1px solid"), "el mes del año, en su tarjeta");
  assert.ok(month.includes("grid-template-columns: 3.4em 1fr 1fr 1fr"), "con la distribución de siempre — no se mueve una columna");
  assert.ok(!styles.includes(".year-srow + .year-srow { border-top:"), "el filete entre renglones muere: cada tarjeta lleva su propio borde");
});
