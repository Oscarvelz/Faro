/* captura386 — AHORROS: SELECCIÓN CLARA Y UNA A LA VEZ (1.3.386, Oscar
 * 2026-11-21 06:57 y 07:05, con su captura en Cyberpunk): dos
 * correcciones de la misma superficie.
 * (a) Las tarjetas anfitrionas (Meta · Retiro · Emergencia) mostraban
 * su selección demasiado sutil: la elegida sube de intensidad con los
 * tokens del tema — fondo al 42% de su color, aro completo y halo
 * suave, el nombre en su color — sin tocar el tratamiento de Tron,
 * que ya la marcaba fuerte.
 * (b) Una a la vez entre las cuatro del widget: el bloque de Ahorro
 * (Tus cuentas) podía aparecer DEBAJO de la tarjeta abierta de
 * cualquiera de las otras tres. Su orden: Ahorro se presenta PRIMERO
 * ocultando cualquier tarjeta abierta — abrir Ahorro cierra la
 * tarjeta (toggleAccounts) — y abrir una tarjeta cierra el bloque de
 * Ahorro (closeAccountsForPocket en pickSeg, el doble toque y el
 * anillo), salvo que el bloque esté fijado con su chincheta: la
 * fijación es su orden permanente y manda sobre el toque.
 *
 * La cerca clava las formas en sus asientos; el comportamiento se
 * prueba en el banco vivo (abrir Retiro, abrir Ahorro encima, y la
 * tarjeta ya no está). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("386 · una a la vez: Ahorro cierra la tarjeta; la tarjeta cierra Ahorro (salvo fijado)", () => {
  const screens = read("../../components/faro/screens.tsx");
  assert.match(screens, /UNA A LA VEZ entre las cuatro/);
  // Abrir Ahorro cierra la tarjeta abierta (la pareja openSave/saveOn).
  const at = screens.indexOf("function toggleAccounts()");
  assert.ok(at > 0, "toggleAccounts existe");
  const block = screens.slice(at, at + 200);
  assert.ok(block.includes("setOpenSave(null)") && block.includes("setSaveOn(null)"), block);
  // Los asientos de la cabeza usan el toggle con ley, no el volteo pelado.
  assert.match(screens, /data-anchor="desk-accounts"[^>]*onClick=\{toggleAccounts\}/);
  assert.match(screens, /className=\{`save-word[^`]*`\}\s*\n\s*onClick=\{toggleAccounts\}/);
  // Abrir una tarjeta cierra Ahorro salvo fijación: la guarda lee la chincheta viva.
  assert.match(screens, /function closeAccountsForPocket\(\) \{\s*\n\s*if \(!accountsPinLive\.current\) setAccountsOpen\(false\);/);
  const picks = screens.match(/closeAccountsForPocket\(\)/g) ?? [];
  assert.ok(picks.length >= 4, `closeAccountsForPocket en sus asientos (pickSeg ×2, doble toque, anillo): ${picks.length}`);
});

test("386 · la selección se lee: intensidad nueva en .save-seg.is-on", () => {
  const css = read("../../styles.css");
  const m = /\.save-seg\.is-on \{([^}]*)\}/.exec(css);
  assert.ok(m, "la regla is-on existe");
  assert.match(m[1], /42%/, "el fondo sube al 42% de su color");
  assert.match(m[1], /0 0 0 1px var\(--seg/, "aro completo en su color");
  assert.match(css, /\.save-seg\.is-on strong \{ color: var\(--seg/, "el nombre en su color");
  // Tron conserva su tratamiento propio (ya era fuerte): no se pisa.
  const tron = read("../../components/faro/tron.css");
  assert.match(tron, /\.save-seg\.is-on \{ border-color: var\(--seg\) !important/);
});
