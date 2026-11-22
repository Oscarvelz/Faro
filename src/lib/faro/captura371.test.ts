/**
 * captura371 — la cerca de la 1.3.371 «La fija describe; la respuesta,
 * arriba» (corrección de Oscar, 2026-11-21 18:46, sobre su teléfono):
 *
 *  1. «¿Qué puedes hacer?» DESCRIBE, no lista: su respuesta es prosa
 *     honesta generada del banco — lo que el Asesor puede hacer, lo que
 *     todavía no (nombrado como límite) y sus limitaciones de siempre.
 *     Ningún folio de preguntas: la tarjeta de la fija no rinde chips.
 *  2. Cada familia del banco lleva su frase de capacidad (`cap`) en los
 *     dos idiomas: la descripción se compone de datos, y crece sola
 *     cuando el banco crece.
 *  3. La fila «A la mano» vive DEBAJO de la respuesta (la .369 la había
 *     puesto encima y la respuesta quedaba sepultada: «se ve horrible»)
 *     — y sigue rindiéndose siempre.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QUESTION_BANK } from "./questionbank";
import { capabilitiesText } from "./askpresets";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const boxSrc = read("../../components/faro/ask-box.tsx");

test("371-1 · cada familia lleva su frase de capacidad en ES y EN", () => {
  for (const f of QUESTION_BANK) {
    assert.ok(f.cap?.es?.trim().length > 10, `la familia ${f.id} describe su capacidad en español`);
    assert.ok(f.cap?.en?.trim().length > 10, `la familia ${f.id} describe su capacidad en inglés`);
    assert.ok(!f.cap.es.trim().endsWith("."), `la frase de ${f.id} se lee dentro de la enumeración, sin punto`);
  }
});

test("371-2 · la descripción se genera del banco: lo que sí, lo que no, los límites", () => {
  for (const lang of ["es", "en"] as const) {
    const t = capabilitiesText(lang);
    const live = QUESTION_BANK.filter((f) => f.status === "viva" || f.status === "heredada");
    const pending = QUESTION_BANK.filter((f) => f.status === "declarada");
    for (const f of live) assert.ok(t.areas.includes(f.cap[lang]), `${f.id} está en lo que sí (${lang})`);
    for (const f of pending) {
      assert.ok(!t.areas.includes(f.cap[lang]), `${f.id} no se promete (${lang})`);
      assert.ok(t.notYet.includes(f.cap[lang]), `${f.id} se nombra como límite (${lang})`);
    }
    assert.ok(t.limits.length > 40, `los límites se dicen (${lang})`);
    assert.ok(!t.areas.includes("?") && !t.notYet.includes("?"), `la descripción es prosa, no preguntas (${lang})`);
  }
});

test("371-3 · la tarjeta de la fija es prosa: ningún chip, ningún folio", () => {
  assert.ok(!boxSrc.includes("ask-cap-chip"), "el folio de preguntas desapareció de la caja");
  assert.ok(boxSrc.includes("capabilitiesText(lang)"), "la caja rinde la descripción generada");
  assert.ok(boxSrc.includes('className="ask-caps-body"'), "la descripción viste el cuerpo de la casa");
});

test("371-4 · la fila vive debajo de la respuesta y siempre", () => {
  const rowAt = boxSrc.indexOf('data-anchor="ask-presets"');
  const qAt = boxSrc.indexOf('data-anchor="ask-q"');
  const answerAt = boxSrc.indexOf('{result?.kind === "answer" ? (');
  assert.ok(qAt > 0 && answerAt > qAt, "la pregunta y la respuesta van primero");
  assert.ok(rowAt > answerAt, "las predeterminadas, después de la respuesta");
});
