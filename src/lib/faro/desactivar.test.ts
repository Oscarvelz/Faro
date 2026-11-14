// 1.3.259 — «Confirmar al desactivar» (Oscar, 2026-11-13, vía el chat principal,
// fotos 234892/234893): «En general pantalla de confirmación para desactivar
// botones como este — no queremos problemas o errores.» La ley que estas cercas
// guardan: DESACTIVAR un interruptor de Ajustes con consecuencia real pasa
// primero por la ventana de confirmación de la casa (qué hace hoy, qué deja de
// pasar, en palabras sencillas) y el cambio vive SOLO dentro del run de la
// ventana, por el mismo camino de escritura de siempre; ACTIVAR nunca pregunta.
// Cubiertos por el censo de la ola: Avisos (settings.notify), el «Ocultar
// montos» del Widget (pref del equipo faro-widget-hide — apagarlo es MOSTRAR el
// dinero en la pantalla de inicio) y el «Quitar huella» de Cuenta (un botón, no
// un interruptor, pero apaga una forma de entrar: su confirmación envuelve la
// llamada disableLock de siempre, sin tocar lock.ts). Fuera, a propósito: el
// ejemplo conserva su asimetría de 1.3.254 (encender pregunta, apagar no) y los
// selectores/elecciones de Ajustes (idioma, tema, gestos) no son interruptores.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const notify = fs.readFileSync(new URL("../../components/faro/notify-row.tsx", import.meta.url), "utf8");
const widget = fs.readFileSync(new URL("../../components/faro/widget-host.tsx", import.meta.url), "utf8");
const gates = fs.readFileSync(new URL("../../spa/gates.tsx", import.meta.url), "utf8");
const words = fs.readFileSync(new URL("../../spa/words.ts", import.meta.url), "utf8");
const sample = fs.readFileSync(new URL("../../components/faro/sample-mode.tsx", import.meta.url), "utf8");

const nflip = notify.slice(notify.indexOf("const flip = () => {"), notify.indexOf("if (!inAndroidApp())"));
const wflip = widget.slice(widget.indexOf("const applyFlip = () => {"), widget.indexOf("const android = inAndroidApp();"));

test("desactivar: Avisos encendidos — apagar abre la ventana de la casa antes de tocar nada", () => {
  assert.ok(nflip.includes('if (prefOn) {'), "the on→off direction is the gated one");
  assert.ok(nflip.includes("confirm({"), "turning notifications off opens the house confirm");
  assert.ok(nflip.indexOf("confirm({") < nflip.indexOf("notify: false"), "the window opens before any write exists");
});

test("desactivar: el apagado de Avisos vive SOLO dentro del run, por el camino de siempre", () => {
  assert.equal(nflip.split("notify: false").length - 1, 1, "exactly one off-write in the toggle");
  const run = nflip.slice(nflip.indexOf("run:"));
  assert.ok(run.includes("notify: false"), "the confirmed run writes notify off");
  assert.ok(run.includes('"Avisos apagados"'), "the run keeps the same commit label as before the gate");
});

test("desactivar: encender Avisos nunca pregunta — el camino directo sigue desnudo", () => {
  assert.ok(nflip.includes("notify: true"), "turning on still commits directly");
  const after = nflip.slice(nflip.indexOf("return;"));
  assert.ok(!after.includes("confirm"), "no window anywhere on the activation path");
});

test("desactivar: la ventana de Avisos dice lo que se pierde, en palabras sencillas y en los dos idiomas", () => {
  for (const s of [
    '"Desactivar avisos"', '"Turn off notifications"',
    '"Desactivar"', '"Turn off"',
    "Faro deja de avisarte de los vencimientos, el ritmo de gasto y el cierre del mes. Puedes volver a activarlos cuando quieras, aquí mismo.",
    "Faro will stop reminding you about due dates, your spending pace and the month-end close. You can turn them back on any time, right here.",
  ]) assert.ok(nflip.includes(s), `the window carries: ${s.slice(0, 60)}`);
});

test("desactivar: el interruptor de Avisos sigue pintando el estado guardado — nada se mueve mientras la ventana espera", () => {
  assert.ok(notify.includes("aria-checked={prefOn}"), "the switch paints session state, so an open window cannot fake the flip");
});

test("desactivar: Widget — desactivar «Ocultar montos» (mostrar el dinero) abre la ventana antes de escribir la pref", () => {
  assert.ok(wflip.includes("if (!on) { applyFlip(); return; }"), "hiding again — more privacy — stays the bare tap");
  assert.ok(wflip.includes("confirm({"), "revealing the amounts opens the house confirm");
  assert.ok(wflip.includes("run: applyFlip"), "the confirmed run is the same write path as before the gate");
});

test("desactivar: la escritura de la pref del Widget existe una sola vez y vive en applyFlip, tras la ventana", () => {
  assert.equal(widget.split("localStorage.setItem(WIDGET_HIDE_KEY").length - 1, 1, "exactly one pref write in the card");
  assert.ok(wflip.indexOf("localStorage.setItem(WIDGET_HIDE_KEY") < wflip.indexOf("const flip = () => {"), "the write sits inside applyFlip, which the window's run calls — never in the bare tap");
});

test("desactivar: la ventana del Widget nombra la consecuencia — el dinero a la vista — en los dos idiomas", () => {
  for (const s of [
    '"Mostrar montos en el widget"', '"Show amounts on the widget"',
    '"Mostrar"', '"Show"',
    "Los montos vuelven a verse en tu pantalla de inicio, a la vista de quien mire tu teléfono. Puedes volver a ocultarlos cuando quieras, aquí mismo.",
    "Your amounts will show on your home screen again, visible to anyone who looks at your phone. You can hide them again any time, right here.",
  ]) assert.ok(wflip.includes(s), `the window carries: ${s.slice(0, 60)}`);
});

test("desactivar: Quitar huella — el apagado de siempre vive dentro del run de la ventana, y es la única llamada", () => {
  assert.equal(gates.split("disableLock(").length - 1, 1, "exactly one disableLock call in gates — the existing path, no parallel machinery");
  const branch = gates.slice(gates.indexOf("if (locked) {"), gates.indexOf("try { setLocked(await enableLock"));
  assert.ok(branch.includes("confirm({"), "removing the fingerprint asks first");
  assert.ok(branch.includes("run: () => { disableLock(user.id); setLocked(false);"), "the confirmed run is byte-for-byte the old bare path");
  assert.ok(branch.includes('title: w("lock.disable")') && branch.includes('yes: w("lock.disable")'), "the window speaks with the button's own words");
});

test("desactivar: activar la huella no cambia — su camino queda byte a byte como estaba", () => {
  assert.ok(gates.includes('try { setLocked(await enableLock(user.id, user.email)); } catch { setMsg(w("lock.failed")); }'), "the enable path is untouched");
});

test("desactivar: la ventana de la huella explica la consecuencia en los dos diccionarios de words.ts", () => {
  for (const s of [
    "Faro deja de pedir tu huella o tu cara al abrir en este dispositivo: entrarás con tu contraseña. Puedes volver a activarla cuando quieras, aquí mismo.",
    "Faro will stop asking for your fingerprint or face when it opens on this device: you will sign in with your password. You can turn it back on any time, right here.",
  ]) assert.ok(words.includes(s), `words carries: ${s.slice(0, 60)}`);
  assert.equal(words.split('"lock.offBody"').length - 1, 2, "lock.offBody exists in both records — parity");
});

test("desactivar: la asimetría del ejemplo (1.3.254) NO se invierte — su apagado sigue desnudo", () => {
  const sflip = sample.slice(sample.indexOf("const flip = () => {"), sample.indexOf("return (", sample.indexOf("const flip = () => {")));
  assert.ok(sflip.includes("if (on) { setSampleMode(false); return; }"), "sample off stays the bare flip Oscar ordered in 254");
});
