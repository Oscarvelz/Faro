/**
 * Captura 430 — el candadito de las proyecciones.
 *
 * Oscar (2026-11-22 17:45, foto de la palanca «Si apartas» con su
 * candado dibujado en rojo BAJO el riel): bajo la palanca de monto de
 * las proyecciones a futuro importantes va un candadito; un toque lo
 * pone o lo quita; puesto, la palanca no se mueve por accidente, y
 * tocarla enseña una ventana corta que lo explica.
 *
 * El censo de palancas (arrastres que mueven una proyección): la
 * palanca «Si apartas» de Central — en sus dos formas, el riel
 * vertical desplegado y el riel plano — y la palanca «¿Y si apartara
 * cada mes…?» de Estudio. El selector de color no proyecta dinero y el
 * monto del Plan de pago se teclea (no se arrastra): quedan fuera,
 * dicho aquí para que el censo sea honesto.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const study2 = read("../../components/faro/study2.tsx");
const styles = read("../../styles.css");
const i18n = read("../../lib/faro/i18n.ts");
const topics = read("../../lib/manual/topics.ts");

test("430 · la palanca Si apartas: el candado guarda el arrastre y las flechas", () => {
  assert.ok(screens.includes('data-anchor="lever-lock"'), "el candado tiene su botón");
  assert.ok(screens.includes('readVaultPref("faro-vault-lever-lock", storeId)'), "el candado se recuerda por libro");
  const downAt = screens.indexOf('const down = (e: ReactPointerEvent<HTMLDivElement>, axis: "x" | "y")');
  const down = screens.slice(downAt, downAt + 320);
  assert.ok(down.includes("if (locked) { setLockNote(true); return; }"), "con el candado puesto, el arrastre no nace — y enseña la nota");
  const keys = screens.slice(screens.indexOf("const keys = "), screens.indexOf("const keys = ") + 200);
  assert.ok(keys.includes("if (locked) { setLockNote(true); return; }"), "y las flechas tampoco mueven");
  assert.ok(screens.indexOf("const toggleLock") < screens.indexOf("const lockBtn = ("), "toggleLock se declara ANTES del botón que lo usa — un TDZ aquí tumbó la app entera en el banco de la 430");
});

test("430 · el candado vive bajo el riel desplegado y junto al riel plano", () => {
  const side = screens.slice(screens.indexOf("vault-lever-side"), screens.indexOf("vault-lever-side") + 700);
  assert.ok(side.includes("vault-lever-rail"), "la columna lleva el riel");
  assert.ok(side.includes("{lockBtn}"), "y el candado debajo, como lo dibujó");
  assert.ok(styles.includes(".vault-lever-side {"), "la columna tiene su forma");
  // ENMIENDA 1.3.434 (Oscar, 2026-11-23): «más pequeño todavía» — el
  // marco baja de 24 a 20px (el detalle vive en captura434).
  assert.ok(styles.includes(".lever-lock { width: 20px; height: 20px;"), "el candado es chiquito — Oscar, 2026-11-22: «muy grande… tiene que ser más chiquito»; 2026-11-23: más pequeño todavía");
  assert.ok(styles.includes(".lever-lock.is-on {"), "puesto, el candado viste el tono de la palanca");
  assert.ok(styles.includes(".lever-note {"), "la nota corta tiene su forma");
});

test("430 · la palanca de Estudio también lleva su candado", () => {
  assert.ok(study2.includes('data-anchor="whatif-lock"'), "su botón bajo el riel");
  assert.ok(study2.includes('localStorage.getItem("faro-lever-lock:whatif")'), "y se recuerda");
  assert.ok(study2.includes("if (perLocked) { setPerLockNote(true); return; }"), "con el candado, el cambio no pasa");
});

test("430 · la nota y el Manual lo dicen en corto, en los dos idiomas", () => {
  assert.ok(i18n.includes('"lever.locked.note": "La palanca está bloqueada: toca el candado para moverla."'), "la nota en español");
  assert.ok(i18n.includes('"lever.locked.note": "The lever is locked: tap the lock to move it."'), "y en inglés");
  assert.ok(topics.includes("El candadito bajo la palanca la bloquea"), "el tema si-apartas lo cuenta");
  assert.ok(topics.includes("El candadito bajo la palanca la bloquea para que no se mueva"), "y el consejo de ¿Y si apartara…?");
});
