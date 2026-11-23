/**
 * Captura 425 — el cumpleaños, en Central.
 *
 * Oscar (2026-11-22 17:40–17:41 EST, con foto de la tarjeta del
 * Asesor): la tarjeta del cumpleaños es tan importante que debe ir a
 * Central — su propia tarjeta de despliegue, que aparece tres días
 * antes, permanece el día mismo, se retira sola al pasar y se puede
 * quitar a mano; al desplegarse muestra lo básico (quién, qué día, lo
 * ya anotado). Y su refinamiento: NO viste la tarjeta común de Central
 * — lleva un acabado especial y distinguido, porque es especial, con
 * los tokens del tema.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const card = read("../../components/faro/birthday-card.tsx");
const css = read("../../components/faro/birthday.css");
const screens = read("../../components/faro/screens.tsx");
const mode = read("./mode.ts");

test("425 · la ventana es de tres días y solo cumpleaños", () => {
  assert.ok(card.includes("upcoming(activePeople(session.ledger), 3, todayIso())"), "la ventana nace de upcoming con 3 días");
  assert.ok(card.includes('o.kind === "birthday"'), "solo cumpleaños: las demás fechas quedan en el Asesor");
});

test("425 · lee la misma fuente que la tarjeta del Asesor", () => {
  assert.ok(card.includes('from "@/lib/faro/people"'), "people.ts es la única fuente");
  assert.ok(card.includes("personTotals(state, person, display, rateE4)"), "lo ya anotado y lo pasado salen de personTotals, como en el Asesor");
});

test("425 · su asiento en Central y su asiento de modo", () => {
  const due = screens.indexOf("<DueAlertsCard />");
  const bday = screens.indexOf("<BirthdayCards />");
  assert.ok(due > 0 && bday > due, "la tarjeta vive en Central, junto a los pagos que se acercan y sobre las fichas");
  assert.ok(mode.includes('"central.birthday": E'), "nace con su asiento: Esencial");
  assert.ok(card.includes('has("central.birthday")'), "la tarjeta obedece su asiento");
});

test("425 · el cierre manual es por instancia y la ✕ lo guarda", () => {
  assert.ok(card.includes('"faro-bday-dismissed"'), "el cierre vive en su llave propia");
  assert.ok(card.includes("`${person.id}|${occ.next.date}`"), "la instancia es persona + fecha: el año próximo la tarjeta vuelve");
});

test("425 · el acabado es especial y solo viste tokens del tema", () => {
  const base = css.slice(css.indexOf(".bday-card {"), css.indexOf(".bday-card {") + 500);
  assert.ok(base.includes("border: 1.5px solid color-mix(in oklab, var(--accent)"), "borde de acento, más presente que el común");
  assert.ok(base.includes("linear-gradient"), "el fondo lleva su lavado de acento");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(css), "ni un solo color propio: todo sale de los tokens del tema");
  /* Corrección de Oscar (2026-11-22 19:28, sobre la foto del banco):
   * «volver al color amarillo como que aburre también para el pastel»
   * — el medallón NO viste el acento: viste el color de la PERSONA,
   * con la receta de su cara en Personas (var(--pp)). */
  assert.ok(css.includes("color-mix(in oklab, var(--pp) 22%, var(--surface))"), "el medallón viste el tinte del color de la persona");
  assert.ok(card.includes("personHue(person)"), "el tono sale de personHue, la misma fuente que Personas");
});

test("425 · nada de blanco sobre amarillo: el frente del acento es --accent-fg", () => {
  /* Oscar (2026-11-22 19:28, con su recorte del botón «Verlo»): «texto
   * en blanco sobre la píldora amarilla, un error común». La causa: un
   * token fantasma, --on-accent, que no existe en ningún tema y caía a
   * #fff. El token verdadero es --accent-fg, definido en cada tema. */
  const bitacora = read("../../components/faro/bitacora.css");
  const bank = read("../../components/faro/bank.css");
  for (const [name, cssText] of [["bitacora.css", bitacora], ["bank.css", bank], ["birthday.css", css]] as const) {
    assert.ok(!cssText.includes("--on-accent"), `${name}: el token fantasma no vuelve`);
  }
  const btn = bitacora.slice(bitacora.indexOf(".lg-announce-btn {"), bitacora.indexOf(".lg-announce-btn {") + 220);
  assert.ok(btn.includes("color: var(--accent-fg)"), "«Verlo» lleva el frente del acento, no blanco");
});
