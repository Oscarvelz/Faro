/**
 * Captura 427 — la cabecera del lente lleva la cara de su ficha.
 *
 * Oscar (2026-11-22 19:38–19:41 EST, tres fotos; la última con su flecha
 * roja de la ficha «Gastaré» a la cabecera de abajo): «Usa el mismo color
 * de las fichas para ubicarlo abajo de nuevo, y utiliza la misma fuente
 * y el mismo ícono, pero abajo en su color. Y para hacerlo clarísimo es
 * para tengo, gastaré y pagos.» La cabecera de la 421/423 — barrita y
 * nombre en blanco o en token de tema — era un título genérico que se
 * leía como cualquier otro. La 427 la viste con el rótulo de la ficha:
 * su «lens-kicker» — la marca con su ícono, su fuente y su color — en
 * tamaño de cabecera. Si el rótulo de una ficha cambia de color en un
 * tema, la cabecera cambia con él: las reglas son gemelas.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const styles = read("../../styles.css");
const cyber = read("../../components/faro/cyberpunk.css");
const tron = read("../../components/faro/tron.css");

test("427 · la cabecera lleva el rótulo de su ficha, con su ícono", () => {
  const head = screens.slice(screens.indexOf("desk-focus-head"), screens.indexOf("desk-focus-head") + 700);
  assert.ok(head.includes('className="lens-kicker"'), "la cabecera lleva el rótulo (lens-kicker)");
  assert.ok(head.includes('className="lens-mark"'), "el rótulo lleva su marca");
  for (const icon of ["ArrowDownLeft", "ArrowUpRight", "CreditCard"]) {
    assert.ok(head.includes(icon), `el ícono de la ficha: ${icon}`);
  }
  assert.ok(!head.includes("desk-focus-bar"), "la barrita genérica se retiró");
  assert.ok(!head.includes("<strong>"), "el título genérico se retiró");
});

test("427 · la forma del rótulo en la cabecera (styles.css)", () => {
  const at = styles.indexOf(".desk-focus-head .lens-kicker");
  assert.ok(at >= 0, "la regla del rótulo de cabecera existe");
  const rule = styles.slice(at, at + 300);
  for (const pin of ["text-transform: uppercase", "font-weight: 600", "font-size: 1.05rem"]) {
    assert.ok(rule.includes(pin), `el rótulo de cabecera conserva: ${pin}`);
  }
  assert.ok(styles.includes(".desk-focus-head .lens-mark"), "la marca tiene su forma");
  assert.ok(!styles.includes(".desk-focus-bar"), "sin reglas de la barrita");
  assert.ok(!styles.includes(".desk-focus-head strong"), "sin reglas del título genérico");
});

test("427 · el color de la cabecera es el del rótulo de su ficha, tema por tema", () => {
  // Grupo oscuro y grupo claro de styles.css: los mismos valores que
  // lleva el rótulo de la ficha en cada grupo.
  for (const pin of [
    ".desk-focus-head.is-have .lens-kicker { color: #eef7f2; }",
    ".desk-focus-head.is-spend .lens-kicker { color: #f8f1e6; }",
    ".desk-focus-head.is-debt .lens-kicker { color: #f8eceb; }",
    ".desk-focus-head.is-have .lens-kicker { color: #163028; }",
    ".desk-focus-head.is-spend .lens-kicker { color: #2a261e; }",
    ".desk-focus-head.is-debt .lens-kicker { color: #4a1814; }",
  ]) assert.ok(styles.includes(pin), `falta la gemela: ${pin}`);
  // Cyberpunk: las gemelas de --cp-green / --cp-orange / --cp-red, los
  // colores del rótulo en ese tema.
  for (const pin of [
    ".desk-focus-head.is-have .lens-kicker { color: var(--cp-green); }",
    ".desk-focus-head.is-spend .lens-kicker { color: var(--cp-orange); }",
    ".desk-focus-head.is-debt .lens-kicker { color: var(--cp-red); }",
  ]) assert.ok(cyber.includes(pin), `falta la gemela cyberpunk: ${pin}`);
  // Tron: las gemelas con !important y el espaciado del rótulo tron.
  for (const pin of [
    ".desk-focus-head.is-have .lens-kicker { color: #6fe2fa !important; }",
    ".desk-focus-head.is-spend .lens-kicker { color: #ffad4d !important; }",
    ".desk-focus-head.is-debt .lens-kicker { color: #ff5a4e !important;",
    ".desk-focus-head .lens-kicker { letter-spacing: .12em; }",
  ]) assert.ok(tron.includes(pin), `falta la gemela tron: ${pin}`);
});
