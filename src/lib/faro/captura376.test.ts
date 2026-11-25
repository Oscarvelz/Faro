import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextAskEntry, suggestionTrio } from "./askpresets";
import { bankChips } from "./ask2";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const boxSrc = read("../../components/faro/ask-box.tsx");
const topicsSrc = read("../manual/topics.ts");
const newsSrc = read("./novedades.ts");

// 1.3.376 — TUS PREGUNTAS, PRIMERAS DE VERDAD. La captura de Oscar
// (2026-11-21 21:07): Ajustes promete «tus preguntas, primeras en la
// caja del Asesor» y la caja pintaba las sugerencias del banco encima
// de las suyas. Su fallo: las suyas primeras; las sugerencias con su
// propio rótulo; solo tres; rotando en cada entrada; debajo de «A la
// mano».

test("376-1 · el trío: siempre tres, rota por entradas y recorre la bolsa", () => {
  const pool = bankChips("es");
  assert.equal(pool.length, 6, "la bolsa del banco sigue siendo de seis");
  const t0 = suggestionTrio(pool, 0);
  const t1 = suggestionTrio(pool, 1);
  assert.equal(t0.length, 3, "la entrada 0 sirve tres");
  assert.equal(t1.length, 3, "la entrada 1 sirve tres");
  assert.notDeepEqual(t1, t0, "cada entrada cambia el trío");
  assert.deepEqual([...t0, ...t1], pool, "dos entradas recorren la bolsa entera, en su orden");
  assert.deepEqual(suggestionTrio(pool, 2), t0, "el ciclo se cierra: la entrada 2 vuelve al primer trío");
  assert.deepEqual(suggestionTrio(["a", "b"], 5), ["a", "b"], "una bolsa corta se sirve entera");
});

test("376-2 · el contador de entradas avanza de uno en uno", () => {
  const a = nextAskEntry();
  const b = nextAskEntry();
  assert.equal(b, a + 1, "cada montaje de la caja toma el número siguiente");
});

test("376-3 · en la caja: «A la mano» antes que las sugerencias, y estas con su rótulo", () => {
  const presets = boxSrc.indexOf('data-anchor="ask-presets"');
  const suggest = boxSrc.indexOf('data-anchor="ask-suggest"');
  assert.ok(presets > 0 && suggest > presets, "las sugerencias se rinden después de la fila «A la mano»");
  const suggestBlock = boxSrc.slice(suggest, suggest + 700);
  assert.ok(suggestBlock.includes('L("Sugerencias", "Suggestions")'), "las sugerencias llevan su propio rótulo, en los dos idiomas");
  assert.ok(suggestBlock.includes("suggestionTrio(chips, entry)"), "el trío sale de la función cercada, con la entrada del montaje");
  assert.ok(boxSrc.includes("useState(() => nextAskEntry())"), "cada montaje toma su número de entrada");
  const row = boxSrc.indexOf('className="ask-row"');
  // ENMIENDA 1.3.445 (puerto de la Rama Agente): la puerta de reposo
  // gana su tercer término (!relato) — con la tarjeta del relato viva
  // la caja no está en reposo. La ley no cambia: una sola puerta.
  // ENMIENDA 1.3.446 (E3): el cuarto término (!programa) llega con la
  // tarjeta de la programación — la misma ley, la misma puerta única.
  const idleGate = boxSrc.indexOf("{!result && !caps && !relato && !programa ? (");
  assert.ok(idleGate > presets, "la única puerta de reposo (las sugerencias) vive tras «A la mano»: entre el campo y las preguntas de la persona no hay chips sueltos");
  assert.equal(boxSrc.split("{!result && !caps && !relato && !programa ? (").length - 1, 1, "una sola puerta de reposo en toda la caja");
  assert.ok(row > 0 && row < presets, "el campo sigue arriba de todo");
});

test("376-4 · el Manual y Novedades cuentan la forma nueva", () => {
  assert.ok(topicsSrc.includes("tus preguntas son las primeras de la caja") && topicsSrc.includes("your questions are the first in the box"), "el tema preguntas-a-la-mano dice que las suyas van primeras");
  assert.ok(topicsSrc.includes("el trío cambia en cada visita") && topicsSrc.includes("the trio changes on every visit"), "y que el trío rota, en los dos idiomas");
  const i376 = newsSrc.indexOf('version: "1.3.376"');
  assert.ok(i376 > 0 && i376 < newsSrc.indexOf('version: "1.3.375"'), "la nota de la 376 existe y va primera");
  const entry = newsSrc.slice(i376, newsSrc.indexOf('version: "1.3.375"'));
  assert.ok(entry.includes("van primeras") && entry.includes("come first"), "la nota promete solo lo que la caja cumple");
});
