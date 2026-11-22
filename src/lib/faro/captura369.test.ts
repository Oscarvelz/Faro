/**
 * captura369.test.ts — LAS CERCAS DE LAS PREGUNTAS PREDETERMINADAS (1.3.369).
 *
 * El conflicto de Oscar: (a) el iconito de ajustes para guardar las
 * preguntas no se veía; (b) el ORDEN de las predeterminadas lo manda la
 * persona; (c) tras una respuesta no había vuelta a verlas. Las cercas:
 * la fila vive SIEMPRE en la fuente de la caja (no cuelga de !result),
 * el engranaje existe con su asiento, la lista se lee con desconfianza
 * y conserva el orden, mover/quitar obedecen, la puerta de carga juzga
 * la forma, y la respuesta a «¿Qué puedes hacer?» se genera SOLO de
 * familias que el motor responde (vivas y heredadas — jamás declaradas).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { addAskPreset, askPresetsOf, capabilitiesText, FIXED_PRESET_Q, moveAskPreset, presetCatalog, removeAskPreset } from "./askpresets";
import { createInitial, isLedgerDeep } from "./defaults";
import { FEATURES } from "./mode";
import { QUESTION_BANK } from "./questionbank";
import type { LedgerState } from "./types";

const boxSrc = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const mgrSrc = readFileSync(new URL("../../components/faro/ask-presets.tsx", import.meta.url), "utf8");
const scrSrc = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");

function book(presets?: unknown): LedgerState {
  return { askPresets: presets } as unknown as LedgerState;
}

test("369-1 el asiento: administrar es de Ritmo; la fija existe en las dos lenguas", () => {
  assert.equal(FEATURES["settings.ask-presets"], "ritmo");
  assert.equal(FIXED_PRESET_Q.es, "¿Qué puedes hacer?");
  assert.equal(FIXED_PRESET_Q.en, "What can you do?");
});

test("369-2 la fila «A la mano» vive siempre: no cuelga del resultado", () => {
  assert.ok(boxSrc.includes('data-anchor="ask-presets"'), "la fila existe en la caja");
  assert.ok(boxSrc.includes('data-anchor="ask-preset-fixed"'), "la fija se pinta en la caja");
  assert.ok(boxSrc.includes("onClick={showCaps}"), "la fija abre su descripción");
  // La fila se rinde sin condición de resultado. SU SITIO lo corrigió
  // Oscar (2026-11-21 18:46, la .371): la respuesta sepultada bajo las
  // predeterminadas «se ve horrible» — la fila vive ahora DESPUÉS de los
  // bloques de respuesta; lo que la .369 cura (que nunca desaparezca)
  // no cambia.
  const rowAt = boxSrc.indexOf('data-anchor="ask-presets"');
  const answerAt = boxSrc.indexOf('{result?.kind === "answer" ? (');
  assert.ok(rowAt > 0 && rowAt > answerAt, "la fila sigue a la tarjeta de respuesta (fallo de las 18:46)");
  const rowBlock = boxSrc.slice(boxSrc.lastIndexOf("{/*", rowAt), rowAt);
  assert.ok(!rowBlock.includes("!result") && !rowBlock.includes("result ?"), "la fila no está condicionada al resultado");
});

test("369-3 el engranaje de la cabecera lleva al pliegue, con su asiento", () => {
  assert.ok(boxSrc.includes('data-anchor="ask-presets-gear"'), "el engranaje existe");
  assert.ok(boxSrc.includes('has("settings.ask-presets")'), "el engranaje cuelga de su asiento");
  assert.ok(boxSrc.includes('findTopic("preguntas-a-la-mano")'), "el engranaje va por la vía del tema");
  assert.ok(scrSrc.includes('id="askpresets"'), "el pliegue existe en Ajustes");
  assert.ok(scrSrc.includes('topic="preguntas-a-la-mano"'), "el pliegue lleva su tema");
  assert.ok(scrSrc.includes("<AskPresetsManager />"), "el pliegue rinde el administrador");
});

test("369-4 el orden es de la persona: añadir, mover y quitar obedecen", () => {
  let s = book(undefined);
  s = addAskPreset(s, "¿Cuánto tengo libre?");
  s = addAskPreset(s, "¿Quién me debe más?");
  s = addAskPreset(s, "¿Cómo voy?");
  assert.deepEqual(askPresetsOf(s).map((p) => p.text), ["¿Cuánto tengo libre?", "¿Quién me debe más?", "¿Cómo voy?"]);
  const second = askPresetsOf(s)[1];
  s = moveAskPreset(s, second.id, -1);
  assert.deepEqual(askPresetsOf(s).map((p) => p.text), ["¿Quién me debe más?", "¿Cuánto tengo libre?", "¿Cómo voy?"], "subir la segunda la pone primera");
  const first = askPresetsOf(s)[0];
  s = moveAskPreset(s, first.id, -1);
  assert.equal(askPresetsOf(s)[0].id, first.id, "en el extremo no se mueve");
  s = removeAskPreset(s, first.id);
  assert.deepEqual(askPresetsOf(s).map((p) => p.text), ["¿Cuánto tengo libre?", "¿Cómo voy?"]);
  // Duplicada (sin distinguir mayúsculas ni espacios) no entra dos veces:
  const before = askPresetsOf(s).length;
  s = addAskPreset(s, "  ¿cuánto tengo libre? ");
  assert.equal(askPresetsOf(s).length, before, "la misma pregunta no se duplica");
});

test("369-5 el lector filtra lo dañado y la puerta juzga la forma entera", () => {
  const dirty = book([{ id: "a", text: "¿Cómo voy?" }, { id: 7, text: "x" }, { text: "sin id" }, null, "suelto", { id: "b", text: "  " }]);
  assert.deepEqual(askPresetsOf(dirty).map((p) => p.id), ["a"], "solo entra la entrada sana");
  const real = (presets?: unknown): LedgerState => ({ ...createInitial("es"), askPresets: presets } as LedgerState);
  assert.equal(isLedgerDeep(real([{ id: "a", text: "¿Cómo voy?" }])), true);
  assert.equal(isLedgerDeep(real("no-es-lista")), false);
  assert.equal(isLedgerDeep(real([{ id: "a" }])), false, "sin texto, la puerta lo rechaza");
  assert.equal(isLedgerDeep(real(undefined)), true, "ausente es forma vieja, válida");
});

test("369-6 «¿Qué puedes hacer?» describe solo lo que el motor responde (texto corregido en la .371)", () => {
  // La forma original (el inventario de canónicas) la corrigió Oscar el
  // 2026-11-21 18:46: la respuesta es una DESCRIPCIÓN en prosa generada
  // del banco — lo que sí, lo que todavía no, y los límites. La ley de
  // fondo no cambia: ninguna declarada se promete como capacidad.
  const text = capabilitiesText("es");
  const liveCaps = QUESTION_BANK.filter((f) => f.status === "viva" || f.status === "heredada").map((f) => f.cap.es);
  for (const c of liveCaps) assert.ok(text.areas.includes(c), "cada capacidad viva se cuenta en la descripción");
  const declaredCaps = QUESTION_BANK.filter((f) => f.status === "declarada").map((f) => f.cap.es);
  for (const d of declaredCaps) {
    assert.ok(!text.areas.includes(d), "ninguna declarada se promete como capacidad");
    assert.ok(text.notYet.includes(d), "cada declarada se nombra como lo que todavía no se sabe");
  }
  assert.ok(liveCaps.length >= 10, "la descripción es real");
  const liveFirsts = QUESTION_BANK.filter((f) => f.status === "viva" || f.status === "heredada").map((f) => f.canonical.es[0]);
  const cat = presetCatalog("en");
  assert.ok(cat.length === liveFirsts.length, "el catálogo del pliegue cubre las mismas familias");
  assert.ok(cat.every((g) => g.questions.length > 0), "ningún grupo vacío");
});

test("369-7 el administrador ofrece subir, bajar, quitar, catálogo y la propia", () => {
  for (const anchor of ["ap-up", "ap-down", "ap-remove", "ap-cat-add", "ap-own-add", "ap-own-input"]) {
    assert.ok(mgrSrc.includes(`data-anchor="${anchor}"`), `el administrador trae ${anchor}`);
  }
  assert.ok(mgrSrc.includes("moveAskPreset") && mgrSrc.includes("removeAskPreset") && mgrSrc.includes("addAskPreset"), "el administrador usa las operaciones del libro");
});
