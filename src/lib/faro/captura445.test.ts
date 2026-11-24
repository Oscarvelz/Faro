// Captura 445 — EL RELATO QUE SE ASIENTA (puerto de la Rama Agente,
// E1+E2; la idea de Alvin traída por Oscar el 2026-11-23): la caja del
// Asesor oye el cuento de lo ya hecho y lo vuelve borradores con su
// eco; el toque asienta. Las cercas de esta captura son las de la
// costura, no las del motor (el motor trae las suyas en relato.test.ts
// y relato-settle.test.ts):
//  (1) LA PUERTA: el relato solo se intenta con lo que NO es pregunta
//      según el clasificador de la casa — una pregunta jamás se
//      asienta y un relato jamás roba una pregunta.
//  (2) EL ASIENTO ES DEL TOQUE: la caja asienta por settleRelatoDrafts
//      tras la confirmación; parseRelato por sí solo no escribe.
//  (3) CADA BORRADOR, SU TARJETITA: los renglones del eco llevan su
//      propio borde y superficie, y el duplicado se lee apagado.
//  (4) EL ASIENTO DE MODO: advisor.relato nace declarado en Esencial.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const advisorCss = readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");
const mode = readFileSync(new URL("./mode.ts", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

test("445 · la puerta del relato es el clasificador: solo lo que no es pregunta", () => {
  assert.ok(box.includes("classifyBankQuestion(clean)"), "la caja juzga la forma con el clasificador de la casa");
  assert.ok(box.includes("if (!cls.isQuestion)"), "el relato se intenta solo sin forma de pregunta");
  assert.ok(box.includes('has("advisor.relato")'), "la costura vive tras su asiento de modo");
  assert.ok(box.includes("parseRelato(session.ledger, key, lang, names, clean, todayLocal())"), "el relato se oye contra el libro vivo");
});

test("445 · el asiento es del toque: confirmar asienta por la costura, nunca al oír", () => {
  assert.ok(box.includes("settleRelatoDrafts(s, drafts, lang)"), "confirmar asienta por relato-settle");
  assert.ok(box.includes('data-anchor="ask-relato-yes"'), "la tarjeta trae su confirmación");
  assert.ok(box.includes('data-anchor="ask-relato"'), "la tarjeta del relato tiene su ancla");
});

test("445 · cada borrador, su tarjetita; el duplicado, apagado", () => {
  assert.ok(advisorCss.includes(".ask-relato-row {"), "el renglón del borrador tiene su regla");
  assert.ok(advisorCss.includes("border: 1px solid var(--line); border-radius: 10px;"), "su propio borde y su radio");
  assert.ok(advisorCss.includes(".ask-relato-row.is-dup { opacity: .62; }"), "el duplicado se lee apagado");
});

test("445 · el asiento de modo y las baterías en la suite", () => {
  assert.ok(mode.includes('"advisor.relato": E'), "advisor.relato nace en Esencial");
  assert.ok(pkg.includes("src/lib/faro/relato.test.ts"), "la batería del relato corre en la suite");
  assert.ok(pkg.includes("src/lib/faro/relato-settle.test.ts"), "la batería del asiento corre en la suite");
  assert.ok(pkg.includes("src/lib/faro/captura445.test.ts"), "esta captura corre en la suite");
});
