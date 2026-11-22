/* 1.3.420 — EL MANUAL, EN SU FORMA PREMIUM (diseño cerrado con Oscar el
 * 2026-11-22, maquetas a6/a7; su fallo de las 13:53: el Manual permite
 * decir más y mostrar más donde el caso lo amerita): cabecera en tarjeta,
 * cada parte en su bandeja con la única cabecera en el acento, la idea
 * clave en su tarjeta ✦, el ejemplo en su asiento y la primera figura —
 * la salud, dibujada con los números reales del libro. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const manual = read("../../components/faro/manual.tsx");
const text = read("../../components/faro/manual-text.tsx");
const figure = read("../../components/faro/manual-figure.tsx");
const css = read("../../components/faro/manual.css");
const topics = read("../manual/topics.ts");

test("420 · la cabecera es una tarjeta y cada parte su bandeja", () => {
  assert.ok(manual.includes("function EntryBody"), "un solo cuerpo para toda entrada");
  assert.ok(manual.includes('className="mn-head"') && manual.includes('className="mn-plate"'), "la cabecera con su placa");
  assert.ok(manual.includes('className="mn-kick-ch"'), "el capítulo por rótulo");
  assert.ok(manual.includes("<Info") && manual.includes("<ListChecks") && manual.includes("<Lightbulb"), "los tres íconos de categoría");
  assert.ok((manual.match(/className="mn-tray"/g) ?? []).length >= 3, "tres bandejas");
  assert.ok(css.includes(".mn-tray-h::after") && css.includes("linear-gradient(90deg"), "la línea que se apaga tras el nombre");
  assert.ok(css.includes(".mn-head {"), "la tarjeta de cabecera existe en el CSS");
});

test("420 · la idea clave vive en su campo y en su tarjeta ✦", () => {
  assert.ok(topics.includes("idea?: L;"), "el campo nace en el tipo");
  assert.ok(manual.includes("function IdeaCard") && manual.includes("mn-idea-star"), "la tarjeta ✦ se pinta");
  assert.ok(manual.includes("<ManualFigure topicId={tp.id}"), "la figura vive en la bandeja «Qué es»");
  const salud = topics.slice(topics.indexOf('id: "salud"'), topics.indexOf('id: "salud-nota"'));
  assert.ok(salud.includes("idea: [\"No es tu puntaje de crédito"), "la idea de la salud es su frase clave");
  assert.ok(!salud.includes("tip: [\"No es tu puntaje"), "y salió del consejo: una sola casa");
  const avisos = topics.slice(topics.indexOf('id: "avisos-pagos"'), topics.indexOf('id: "bateria-app"'));
  assert.ok(avisos.includes("idea: [\"Quitarla no apaga ningún aviso"), "la idea de avisos-pagos es su frase clave");
  const what = avisos.slice(avisos.indexOf("what:"), avisos.indexOf("bubble:"));
  assert.ok(!what.includes("Quitarla no apaga"), "y salió del «Qué es»: no se duplica");
});

test("420 · el ejemplo gana su asiento y la sub-entrada su título", () => {
  assert.ok(text.includes("EXAMPLE_MARK") && text.includes('className="mn-example"'), "la marca de la casa gana su tarjeta");
  assert.ok(text.includes("MINI_LEAD") && text.includes('className="mn-mini-t"'), "el rótulo del renglón sale en negritas");
  assert.ok(css.includes(".mn-example {") && css.includes(".mn-list li {"), "ambas formas viven en el CSS");
  const marks = topics.match(/Ejemplo:|Example:/g) ?? [];
  assert.ok(marks.length >= 24, `la materia de ejemplos sigue en los datos (${marks.length} marcas ES+EN)`);
});

test("420 · la figura de la salud dibuja el libro real, con la escala de la casa", () => {
  assert.ok(figure.includes('salud: "health"') || figure.includes('"salud"'), "el registro declara la figura de la salud");
  assert.ok(figure.includes("useCoach"), "la figura se alimenta del mismo motor que Estudio");
  assert.ok(figure.includes("from: 0, to: 44") && figure.includes("from: 80, to: 100"), "las bandas son las de la app, no las de la maqueta");
  assert.ok(figure.includes("markAt"), "la nota se coloca dentro de su banda, como en Estudio");
  assert.ok(figure.includes("SCORE_WEIGHTS"), "las partes pesan lo que pesan en la app");
});
