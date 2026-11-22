import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { notifyKindsOf } from "./widget";
import { createInitial } from "./defaults";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const rowSrc = read("../../components/faro/notify-row.tsx");
const widgetSrc = read("./widget.ts");
const topicsSrc = read("../manual/topics.ts");
const newsSrc = read("./novedades.ts");
const notifyKt = read("../../../android/app/src/main/java/com/oscarvelz/faro/FaroNotify.kt");
const widgetsKt = read("../../../android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt");
const dueRowSrc = read("../../components/faro/due-alerts-row.tsx");

// 1.3.377 — NOTIFICACIONES, A TU MANERA. Fallo de Oscar (2026-11-21
// 21:26, captura de Ajustes): «Avisos» se renombra «Notificaciones»
// (más universal); «Avisos de pagos» CONSERVA su nombre; y la tarjeta
// se despliega para elegir qué tipos llegan — no solo apagar todo.

test("377-1 · los tipos efectivos: el maestro manda y cada tipo nace encendido", () => {
  const base = createInitial("es", "claro").settings;
  assert.deepEqual(notifyKindsOf(base), { dues: true, pace: true, close: true }, "un libro sin campos: todo llega, como hoy");
  assert.deepEqual(notifyKindsOf({ ...base, notifyKinds: { pace: false } }), { dues: true, pace: false, close: true }, "apagar un tipo apaga solo ese tipo");
  assert.deepEqual(notifyKindsOf({ ...base, notify: false, notifyKinds: { dues: true, pace: true, close: true } }), { dues: false, pace: false, close: false }, "el maestro apagado apaga todos, aunque los tipos digan lo contrario");
  assert.deepEqual(notifyKindsOf({ ...base, notifyKinds: { dues: false, pace: false, close: false } }), { dues: false, pace: false, close: false }, "los tres tipos apagados: nada llega con el maestro encendido");
});

test("377-2 · la foto lleva los tres tipos compuestos", () => {
  for (const f of ["notifyDues", "notifyPace", "notifyClose"]) {
    assert.ok(widgetSrc.includes(`${f}: boolean`), `el tipo de la foto declara ${f}`);
    assert.ok(widgetSrc.includes(`${f}: notifyKindsOf(state.settings).`), `el constructor compone ${f} con el ayudante cercado`);
  }
});

test("377-3 · la fila: nombre nuevo, despliegue y un interruptor por tipo", () => {
  assert.ok(!rowSrc.includes('L(lang, "Avisos", "Notifications")'), "el título «Avisos» murió en las dos caras de la fila");
  assert.equal(rowSrc.split('L(lang, "Notificaciones", "Notifications")').length - 1, 2, "«Notificaciones» nombra la cara web y la de la app");
  assert.ok(rowSrc.includes('data-anchor="aj-notify-unfold"') && rowSrc.includes("aria-expanded={open}"), "la flecha despliega la tarjeta");
  assert.ok(rowSrc.includes("aj-notify-${kind}"), "cada fila de tipo lleva su ancla por tipo");
  for (const k of ["dues", "pace", "close"]) {
    assert.ok(rowSrc.includes(`kindRow("${k}"`), `el tipo ${k} se rinde con su fila`);
  }
  assert.ok(rowSrc.includes('has("widget.face-pace")'), "el ritmo solo se ofrece donde el teléfono lo emite (la cara del Patrón, Completo)");
  assert.ok(rowSrc.includes("notifyKinds: { ...s.settings.notifyKinds, [kind]: next }"), "cada toque de un tipo guarda solo ese tipo");
  assert.ok(rowSrc.includes('L(lang, "Activados: ninguno", "On: none")'), "con el maestro encendido y ningún tipo, la línea lo dice");
  assert.ok(dueRowSrc.length > 0, "la fila hermana existe");
});

test("377-4 · «Avisos de pagos» conserva su nombre y su pieza", () => {
  assert.ok(!rowSrc.includes('L(lang, "Avisos de pagos"'), "la fila renombrada no rinde el nombre de la otra pieza");
  assert.ok(newsSrc.includes("conserva su nombre") && newsSrc.includes("keeps its name"), "Novedades lo declara en los dos idiomas");
});

test("377-5 · la carcasa juzga cada aviso contra su tipo, con caída al maestro", () => {
  assert.ok(notifyKt.includes("!s.notifyDues") && notifyKt.includes("!s.notifyPace") && notifyKt.includes("!s.notifyClose"), "cada check de FaroNotify lleva la puerta de su tipo");
  for (const f of ["notifyDues", "notifyPace", "notifyClose"]) {
    assert.ok(widgetsKt.includes(`o.optBoolean("${f}", o.optBoolean("notify", true))`), `Snap lee ${f} cayendo al maestro en fotos viejas`);
    assert.ok(widgetsKt.includes(`${f} = ${f}`), `withHide conserva ${f}`);
  }
});

test("377-6 · el Manual nombra Notificaciones y cuenta el despliegue", () => {
  const topic = topicsSrc.slice(topicsSrc.indexOf('id: "avisos-app"'), topicsSrc.indexOf('id: "avisos-pagos"'));
  assert.ok(topic.includes('title: ["Notificaciones", "Notifications"]'), "el tema se titula con el nombre nuevo");
  assert.ok(topic.includes("Ajustes → Notificaciones"), "la puerta del tema apunta al nombre nuevo");
  assert.ok(topic.includes("cada tipo lleva su interruptor") && topic.includes("each kind carries its own switch"), "el cómo cuenta los interruptores por tipo, en los dos idiomas");
  assert.ok(!topic.includes("→ Avisos enciendes"), "la frase vieja del nombre murió");
  const i377 = newsSrc.indexOf('version: "1.3.377"');
  assert.ok(i377 > 0 && i377 < newsSrc.indexOf('version: "1.3.376"'), "la nota de la 377 existe y va primera");
});
