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
 *
 * Enmienda de la 1.3.373 (fallo de Oscar, 2026-11-21 19:42): la FORMA
 * de la descripción cambió — de la prosa seguida a grupos con renglón
 * propio — porque en su teléfono se leía como texto suelto. La 371-2 y
 * la 371-3 se re-fijaron a la forma nueva con la razón escrita en cada
 * una; la ley de fondo (describe, no lista; cada capacidad del banco,
 * en los dos idiomas) no se movió.
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
  // Re-fijada en la 1.3.373 (fallo de Oscar, 2026-11-21 19:42): la
  // descripción ya no son dos párrafos (areas / notYet en cadena de
  // punto y coma — texto suelto en su teléfono) sino GRUPOS con
  // renglón propio. La ley de fondo no cambia: cada capacidad viva se
  // cuenta una sola vez, ninguna declarada se promete, cada declarada
  // se nombra como lo que todavía no se sabe.
  for (const lang of ["es", "en"] as const) {
    const t = capabilitiesText(lang);
    const items = t.groups.flatMap((g) => g.items);
    const has = (xs: string[], cap: string) => xs.some((it) => it.toLowerCase().includes(cap.toLowerCase()));
    const live = QUESTION_BANK.filter((f) => f.status === "viva" || f.status === "heredada");
    const pending = QUESTION_BANK.filter((f) => f.status === "declarada");
    assert.equal(items.length, live.length, `una línea por capacidad viva, ni una más (${lang})`);
    for (const f of live) assert.ok(has(items, f.cap[lang]), `${f.id} está en lo que sí (${lang})`);
    for (const f of pending) {
      assert.ok(!has(items, f.cap[lang]), `${f.id} no se promete (${lang})`);
      assert.ok(has(t.notYet, f.cap[lang]), `${f.id} se nombra como límite (${lang})`);
    }
    assert.ok(t.limits.length > 40, `los límites se dicen (${lang})`);
    assert.ok(!items.join(" ").includes("?") && !t.notYet.join(" ").includes("?"), `la descripción describe, no pregunta (${lang})`);
    assert.ok(!items.some((it) => it.includes(";")), `ninguna línea lleva la cadena de punto y coma (${lang})`);
  }
});

test("371-3 · la tarjeta de la fija describe: ningún chip, ningún folio", () => {
  assert.ok(!boxSrc.includes("ask-cap-chip"), "el folio de preguntas desapareció de la caja");
  assert.ok(boxSrc.includes("capabilitiesText(lang)"), "la caja rinde la descripción generada");
  // La forma del cuerpo la corrigió la 1.3.373 (19:42): grupos con
  // renglón propio, no el párrafo seguido de la primera forma.
  assert.ok(boxSrc.includes('className="ask-caps-group"'), "la descripción viste los grupos de la casa");
  assert.ok(boxSrc.includes('className="ask-caps-list"'), "cada capacidad, su renglón");
});

test("371-4 · la fila vive debajo de la respuesta y siempre", () => {
  const rowAt = boxSrc.indexOf('data-anchor="ask-presets"');
  const qAt = boxSrc.indexOf('data-anchor="ask-q"');
  const answerAt = boxSrc.indexOf('{result?.kind === "answer" ? (');
  assert.ok(qAt > 0 && answerAt > qAt, "la pregunta y la respuesta van primero");
  assert.ok(rowAt > answerAt, "las predeterminadas, después de la respuesta");
});
