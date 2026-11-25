/**
 * captura373 — la cerca de la 1.3.373 «La descripción, ordenada; la
 * pregunta, cierra» (correcciones de Oscar, 2026-11-21 19:42, sobre la
 * .371 en su teléfono):
 *
 *  1. La descripción de «¿Qué puedes hacer?» se presenta en GRUPOS con
 *     renglón propio — la prosa cosida con punto y coma de la .371 se
 *     leía como texto suelto. Toda familia viva o heredada vive en
 *     exactamente un grupo (una capacidad nueva sin grupo rompe la
 *     cerca, no se esconde), ninguna línea lleva «;», y el bloque de
 *     límites conserva su forma y su texto (a Oscar le gustó tal cual).
 *  2. La tarjeta «Tu pregunta» es un botón: tocarla cierra la respuesta
 *     (resultado, descripción y la propia tarjeta) y las preguntas
 *     sugeridas del banco reaparecen.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QUESTION_BANK } from "./questionbank";
import { capabilitiesText } from "./askpresets";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const boxSrc = read("../../components/faro/ask-box.tsx");
const cssSrc = read("../../components/faro/advisor2.css");

test("373-1 · cada capacidad viva vive en exactamente un grupo, en los dos idiomas", () => {
  for (const lang of ["es", "en"] as const) {
    const t = capabilitiesText(lang);
    const live = QUESTION_BANK.filter((f) => f.status === "viva" || f.status === "heredada");
    assert.ok(t.groups.length >= 4, `la descripción tiene territorios (${lang})`);
    for (const g of t.groups) {
      assert.ok(g.title.trim().length > 2, `cada grupo lleva su nombre (${lang})`);
      assert.ok(g.items.length > 0, `ningún grupo vacío (${lang})`);
      for (const it of g.items) assert.ok(!it.includes(";"), `ninguna línea es una cadena de punto y coma (${lang})`);
    }
    const flat = t.groups.flatMap((g) => g.items);
    assert.equal(flat.length, live.length, `una línea por capacidad: ni una escondida ni una repetida (${lang})`);
    for (const f of live) {
      const hits = flat.filter((it) => it.toLowerCase().includes(f.cap[lang].toLowerCase())).length;
      assert.equal(hits, 1, `${f.id} aparece exactamente una vez (${lang})`);
    }
  }
});

test("373-2 · lo que todavía no va en su grupo, y los límites conservan su forma", () => {
  for (const lang of ["es", "en"] as const) {
    const t = capabilitiesText(lang);
    const pending = QUESTION_BANK.filter((f) => f.status === "declarada");
    assert.equal(t.notYet.length, pending.length, `cada declarada se nombra (${lang})`);
    assert.ok(t.notYetTitle.trim().length > 5, `el grupo de lo pendiente lleva su título (${lang})`);
    assert.ok(t.notYetNote.includes(lang === "en" ? "on its own" : "sola"), `la nota de cierre se mantiene (${lang})`);
    // El bloque de límites es el de la .371, palabra por palabra: a
    // Oscar le gustó su fuente y su forma (19:42) y no se toca.
    assert.ok(t.limits.startsWith(lang === "en" ? "My limits, stated plainly" : "Mis límites, dichos claros"), `los límites, intactos (${lang})`);
  }
});

test("373-3 · tocar la pregunta cierra la respuesta y vuelven las sugeridas", () => {
  assert.match(boxSrc, /<button[^>]*className="ask-q"[^>]*onClick=\{closeAnswer\}/, "la tarjeta de la pregunta es un botón que cierra");
  const close = boxSrc.slice(boxSrc.indexOf("function closeAnswer"), boxSrc.indexOf("function closeAnswer") + 220);
  assert.ok(close.includes("setResult(null)"), "el cierre apaga la respuesta");
  assert.ok(close.includes("setCaps(false)"), "el cierre apaga la descripción");
  assert.ok(close.includes('setAsked("")'), "el cierre retira la propia tarjeta");
  // ENMIENDA 1.3.445 (puerto de la Rama Agente): la puerta de reposo
  // gana su tercer término — con la tarjeta del relato viva tampoco
  // hay reposo: el relato es una respuesta en curso, no el reposo.
  // La ley no cambia: una sola puerta, y el cierre la devuelve.
  // ENMIENDA 1.3.446 (E3): el cuarto término llega con la tarjeta de
  // la programación — la misma ley, la misma puerta única.
  assert.ok(boxSrc.includes("{!result && !caps && !relato && !programa ? ("), "sin respuesta, las sugeridas del banco viven — el cierre las devuelve");
});

test("373-4 · el acabado: grupos con su marca, y el párrafo suelto retirado", () => {
  assert.ok(cssSrc.includes(".ask-caps-group"), "el grupo tiene su estilo");
  assert.ok(cssSrc.includes(".ask-caps-kicker"), "el kicker del territorio");
  assert.ok(cssSrc.includes(".ask-caps-list li::before"), "cada renglón lleva la marca del acento");
  assert.ok(!cssSrc.includes(".ask-caps-body"), "el cuerpo de párrafo de la .371 se retiró");
  assert.match(cssSrc, /\.ask-q \{[^}]*cursor: pointer/, "la tarjeta de la pregunta se ofrece al toque");
});
