// Captura 446 — PROGRAMAR POR RELATO (puerto de la Rama Agente, E3;
// la segunda idea de Alvin traída por Oscar el 2026-11-23): la misma
// caja oye la orden de programar lo que viene y la vuelve borradores
// con su eco; el toque programa. Las cercas de esta captura son las
// de la costura, no las del motor (el motor trae las suyas en
// relato.test.ts y programa-settle.test.ts):
//  (1) LA PUERTA: programar se intenta solo con lo que no es
//      pregunta y no fue relato — una pregunta jamás se programa y
//      un relato jamás se programa como futuro.
//  (2) LA PROGRAMACIÓN ES DEL TOQUE: la caja programa por
//      settleProgramaDrafts tras la confirmación; parsePrograma por
//      sí solo no escribe.
//  (3) CADA BORRADOR, SU TARJETITA: la tarjeta de programación
//      reusa los renglones-tarjetita del relato, con el duplicado
//      apagado.
//  (4) EL ASIENTO DE MODO: programar vive tras el mismo asiento del
//      oído, advisor.relato en Esencial — un solo oído para la caja.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const mode = readFileSync(new URL("./mode.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

test("446 · la puerta de programar: tras la pregunta y tras el relato", () => {
  assert.ok(box.includes("parsePrograma(session.ledger, key, lang, names, clean, todayLocal())"), "programar se oye contra el libro vivo");
  const relatoAt = box.indexOf("parseRelato(session.ledger");
  const programaAt = box.indexOf("parsePrograma(session.ledger");
  assert.ok(relatoAt >= 0 && programaAt > relatoAt, "el relato de lo hecho se intenta antes que la orden de programar");
  assert.ok(box.includes('has("advisor.relato")'), "la costura vive tras el asiento de modo del oído");
});

test("446 · la programación es del toque: confirmar programa por la costura, nunca al oír", () => {
  assert.ok(box.includes("settleProgramaDrafts(s, drafts)"), "confirmar programa por programa-settle");
  assert.ok(box.includes('data-anchor="ask-programa-yes"'), "la tarjeta trae su confirmación");
  assert.ok(box.includes('data-anchor="ask-programa"'), "la tarjeta de programación tiene su ancla");
});

test("446 · cada borrador, su tarjetita; el recordatorio se nombra", () => {
  assert.ok(box.includes("ask-relato-row"), "la tarjeta reusa los renglones-tarjetita del relato");
  assert.ok(box.includes("solo recordatorio"), "el recordatorio se nombra en su renglón");
  assert.ok(box.includes("ya estaba programado"), "el duplicado se nombra en su renglón");
});

test("446 · el asiento de modo y las baterías en la suite", () => {
  assert.ok(mode.includes('"advisor.relato": E'), "el oído vive en Esencial");
  assert.ok(pkg.includes("src/lib/faro/programa-settle.test.ts"), "la batería de la programación corre en la suite");
  assert.ok(pkg.includes("src/lib/faro/captura446.test.ts"), "esta captura corre en la suite");
});
