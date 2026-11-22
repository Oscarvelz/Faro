/* 1.3.412 — Las capacidades del Asesor en tarjetas desplegables
 * (Oscar, 2026-11-22, con su foto de la lista interminable): la
 * respuesta a «¿Qué puede hacer el asesor?» presenta cada grupo como
 * una tarjeta que se abre al tocarla — una abierta a la vez, todas
 * cerradas al llegar. La introducción y los límites se quedan; el
 * texto no cambia: sigue saliendo de capabilitiesText en el momento. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const box = read("../../components/faro/ask-box.tsx");
const css = read("../../components/faro/advisor2.css");
const presets = read("./askpresets.ts");

test("412 · cada grupo es una tarjeta desplegable con su cabecera al toque", () => {
  assert.ok(box.includes('className="ask-caps-head"'), "la cabecera de la tarjeta existe");
  assert.ok(box.includes('aria-expanded={capsOpen === i}'), "la cabecera declara su estado");
  assert.ok(box.includes('className="ask-caps-group"'), "el grupo viste la tarjeta de la casa");
  assert.ok(css.includes(".ask-caps-group { border: 1px solid var(--line);"), "la tarjeta tiene su borde");
  assert.ok(css.includes('.ask-caps-head[aria-expanded="true"] .ask-caps-chev'), "la flecha gira al abrir");
});

test("412 · una abierta a la vez, y todas cerradas al llegar", () => {
  assert.ok(box.includes("useState(-1)"), "el acordeón nace cerrado");
  assert.ok(box.includes("setCapsOpen((v) => (v === i ? -1 : i))"), "tocar la abierta la cierra; otra, la cambia");
  const show = box.slice(box.indexOf("function showCaps"), box.indexOf("function showCaps") + 200);
  assert.ok(show.includes("setCapsOpen(-1)"), "cada vez que la descripción llega, llega cerrada");
});

test("412 · la introducción y los límites se quedan; «lo que todavía no» es la última tarjeta", () => {
  assert.ok(box.includes('<p className="ask-verdict">{c.intro}</p>'), "la introducción abre la respuesta");
  assert.ok(box.includes('<p className="ask-note">{c.limits}</p>'), "los límites cierran, como siempre");
  assert.ok(box.includes("capsOpen === c.groups.length"), "el grupo de lo que falta es una tarjeta más, la última");
  assert.ok(box.includes('className="ask-caps-note"'), "su nota vive dentro de su tarjeta");
});

test("412 · el texto no cambia: sale del banco en el momento", () => {
  assert.ok(presets.includes("const CAP_GROUPS"), "los grupos siguen declarados en askpresets");
  assert.ok(presets.includes("export function capabilitiesText"), "la descripción se sigue generando");
  assert.ok(box.includes("capabilitiesText(lang)"), "la caja la rinde tal cual");
  assert.ok(!box.includes("Tu mes"), "la caja no escribe los títulos a mano");
});
