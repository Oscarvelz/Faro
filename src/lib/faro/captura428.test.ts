/**
 * Captura 428 — diseño de verdad para dos superficies (la 426 del
 * tablero; publica como 428 porque la 427 de Oscar se adelantó).
 *
 * Oscar (2026-11-22 19:30 EST, foto de las dos superficies vivas tras
 * la 424): «Ambas cosas se siguen viendo planas, pobres, sueltas, sin
 * diseño alguno.» La cura no es más relleno:
 * (1) La Lista de espera gana su CARA — el medallón del reloj de arena
 *     que su propia hoja de anotar ya lleva — y su estado vacío deja
 *     la línea suelta y vive en su tarjetita apagada.
 * (2) El Saldo proyectado gana su FIGURA — el camino de lo libre
 *     dibujado como línea, día a día, con el día más apretado marcado
 *     sobre ella y su cifra nombrada: el significado de la tarjeta ES
 *     una forma (el valor explicativo).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const wl = read("../../components/faro/waitlist.tsx");
const wlCss = read("../../components/faro/waitlist.css");
const proj = read("../../components/faro/projection.tsx");
const projCss = read("../../components/faro/projection.css");
const topics = read("../../lib/manual/topics.ts");

test("428 · la Lista de espera lleva su medallón del reloj de arena", () => {
  const head = wl.slice(wl.indexOf("wl-head"), wl.indexOf("wl-head") + 400);
  assert.ok(head.includes("wl-badge"), "la cabecera lleva el medallón");
  assert.ok(head.includes("<Hourglass />"), "el medallón es el reloj de arena de su hoja");
  const badge = wlCss.slice(wlCss.indexOf(".wl-badge {"), wlCss.indexOf(".wl-badge {") + 260);
  assert.ok(badge.includes("border-radius: 11px"), "la forma de la insignia de su hoja");
  assert.ok(badge.includes("var(--accent)"), "el acento de la lista, el de su anillo");
});

test("428 · el estado vacío vive en su tarjetita apagada", () => {
  assert.ok(wl.includes('className="wl-empty-card"'), "el vacío tiene su tarjeta");
  assert.ok(!wl.includes('className="wl-empty"'), "la línea suelta se retiró");
  const card = wlCss.slice(wlCss.indexOf(".wl-empty-card {"), wlCss.indexOf(".wl-empty-card {") + 300);
  assert.ok(card.includes("border: 1px solid var(--line)"), "su borde propio");
  assert.ok(card.includes("border-radius: 12px"), "su radio");
  assert.ok(card.includes("opacity: .65"), "apagada hasta que haya deseos");
});

test("428 · el Saldo proyectado dibuja su camino como línea", () => {
  assert.ok(proj.includes("proj-chart"), "la figura existe en la tarjeta");
  assert.ok(proj.includes("reading.days"), "la línea camina los días del camino");
  assert.ok(proj.includes("reading.tightest"), "el día más apretado se marca");
  assert.ok(proj.includes("<polyline"), "es una línea, no barras");
  const line = projCss.slice(projCss.indexOf(".proj-chart-line {"), projCss.indexOf(".proj-chart-line {") + 200);
  assert.ok(line.includes("stroke: var(--accent)"), "el color es del tema: el futuro no se pinta");
  assert.ok(projCss.includes(".proj-chart-dot"), "la marca del día apretado tiene su forma");
  assert.ok(projCss.includes(".proj-chart-tight"), "y su cifra se nombra junto a la marca");
});

test("428 · el Manual cuenta la figura del camino", () => {
  assert.ok(topics.includes("dibuja ese camino"), "el tema saldo-proyectado nombra la línea (ES)");
  assert.ok(topics.includes("draws that walk"), "y en inglés (EN)");
});
