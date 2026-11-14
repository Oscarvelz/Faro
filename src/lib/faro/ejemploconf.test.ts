// 1.3.254 — «Confirmar el ejemplo» (Oscar, 2026-11-13, foto 234874): «Añade
// botón de confirmación para activar el ejemplo.» El interruptor de «Datos de
// ejemplo» en Ajustes cambiaba el libro visible con un toque desnudo. La ley
// que estas cercas guardan: ACTIVAR pasa primero por la ventana de
// confirmación de la casa (la misma confirm() que guarda ocultar, restaurar y
// borrar), con la explicación sencilla de qué se va a ver y de que lo suyo
// queda intacto; APAGAR vuelve a su libro sin ceremonia, como siempre. La
// puerta vive en el asiento del interruptor (SampleRow) — la maquinaria
// setSampleMode no se toca. (RE-FIJADO 1.3.256: la otra puerta que activaba
// el ejemplo — el botón del escritorio con el libro vacío, desk.sample —
// fue RETIRADA por orden de Oscar: «Basta con las que tenemos ya en ajustes.»
// El interruptor de Ajustes es ahora la ÚNICA puerta, y la cerca de censo
// de abajo guarda exactamente eso.)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const row = fs.readFileSync(new URL("../../components/faro/sample-mode.tsx", import.meta.url), "utf8");
const mode = fs.readFileSync(new URL("./samplemode.ts", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");

const flip = row.slice(row.indexOf("const flip = () => {"), row.indexOf("return (", row.indexOf("const flip = () => {")));

test("ejemploconf: apagar vuelve sin ceremonia — el camino de apagado llama setSampleMode(false) y sale antes de cualquier ventana", () => {
  assert.ok(flip.includes("if (on) { setSampleMode(false); return; }"), "turning off is the bare flip it always was");
  assert.ok(flip.indexOf("setSampleMode(false)") < flip.indexOf("confirm({"), "the off path returns before the confirm exists");
});

test("ejemploconf: activar pasa por la ventana de la casa, y setSampleMode(true) vive SOLO dentro de su run", () => {
  assert.ok(flip.includes("confirm({"), "activation opens the house confirm");
  assert.equal(flip.split("setSampleMode(true)").length - 1, 1, "exactly one activation call in the toggle");
  const run = flip.slice(flip.indexOf("run:"));
  assert.ok(run.includes("run: () => setSampleMode(true)"), "the confirmed run is the same activation path as before the gate");
});

test("ejemploconf: la ventana dice lo que importa, en palabras sencillas y en los dos idiomas", () => {
  for (const s of [
    '"Activar datos de ejemplo"', '"Turn on sample data"',
    '"Activar"', '"Turn on"',
    "Verás el libro de ejemplo: los números de una casa inventada, para explorar y aprender Faro. Tu libro queda intacto — nada se borra ni se mezcla — y al apagar el ejemplo vuelve tal como estaba.",
    "You will see the sample book: a made-up household's numbers, to explore and learn Faro. Your book stays untouched — nothing is erased or mixed — and when you turn the sample off it comes back exactly as it was.",
  ]) assert.ok(flip.includes(s), `the window carries: ${s.slice(0, 60)}`);
});

test("ejemploconf: la maquinaria no se toca — setSampleMode no conoce ninguna ventana", () => {
  assert.ok(!mode.includes("confirm"), "samplemode.ts stays pure machinery; the gate lives at the toggle's seat");
  assert.ok(mode.includes("export function setSampleMode(next: boolean)"), "the switch itself is unchanged");
});

// RE-FIJADO 1.3.256: esta cerca nació (1.3.254) guardando que la puerta del
// escritorio seguía directa y fuera de la confirmación. La orden de Oscar en
// 1.3.256 retiró esa puerta; la cerca guarda ahora la ley nueva — una sola
// puerta — con la misma intención de censo: ninguna otra superficie activa
// el ejemplo.
test("ejemploconf: censo de puertas — una sola puerta: el escritorio ya no activa el ejemplo (RE-FIJADO 1.3.256)", () => {
  assert.ok(!screens.includes("setSampleMode"), "screens.tsx carries no sample activation at all — the desk door is gone");
  assert.ok(!screens.includes("desk.sample"), "the retired desk.sample offer is referenced nowhere in the desk");
  assert.ok(row.includes('data-anchor="aj-ejemplo"'), "the gated toggle is the Ajustes card, anchor aj-ejemplo");
});
