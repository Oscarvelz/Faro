// Captura 435 — LOS BORDES DE ESTUDIO, CON PRESENCIA (Oscar, 2026-11-22,
// sobre la ayuda de Salud que le pareció preciosa: «su único cambio: el
// borde más visible… Quizás aumentar la visibilidad de los bordes es algo
// que necesita ser implementado universalmente en el estudio»).
// La pila de Estudio gana su PROPIA línea (--line-study), más cercana a su
// texto y derivada de los tokens del tema — jamás un color escogido — y
// los bordes de la casa la visten: tarjetas, filetes, el riel de la agenda,
// las fichas y las cajas de la guía. La burbuja de ayuda, la superficie
// señalada, lleva el borde más fuerte: la línea subida casada con el
// acento, más la sombra suave que la despega de su tarjeta.
// LECCIÓN QUE LA CERCA CLAVA: --line NO se redefine sobre sí misma en
// .study-stack — la referencia cíclica nace inválida y el borde de la
// ayuda cayó a blanco en el primer banco; la línea subida vive en su
// propio nombre.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pano = readFileSync(new URL("../../components/faro/panorama.css", import.meta.url), "utf8");
const cyber = readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");

test("435 · la pila de Estudio gana su línea propia, derivada de sus tokens", () => {
  assert.ok(
    pano.includes(".study-stack { --line-study: color-mix(in oklab, var(--line) 55%, var(--fg)); }"),
    "la línea de Estudio se acerca a su texto en cada tema, sin tocar la --line del resto de la app",
  );
  assert.ok(
    !/\.study-stack \{ --line:/.test(pano),
    "prohibido redefinir --line sobre sí misma: la referencia cíclica nace inválida (el banco la cazó)",
  );
});

test("435 · los bordes de la casa en Estudio visten la línea subida", () => {
  assert.ok(pano.includes(".study-stack .card { border-color: var(--line-study); }"), "las tarjetas de pliegue");
  assert.ok(pano.includes(".study-stack .pano-lines li + li"), "los filetes de las listas");
  assert.ok(pano.includes(".study-stack .pano-agenda > b { background: var(--line-study); }"), "el riel de la agenda");
});

test("435 · la burbuja de ayuda lleva el borde más presente, con el acento del tema", () => {
  assert.ok(
    pano.includes(".study-stack .pano-help {") && pano.includes("border-color: color-mix(in oklab, var(--accent) 32%, var(--line-study, var(--line)));"),
    "el borde de la ayuda casa la línea subida con el acento del tema",
  );
  assert.ok(
    /\.study-stack \.pano-help \{[^}]*box-shadow:/.test(pano),
    "la burbuja se despega de su tarjeta con la sombra suave de la casa",
  );
});

test("435 · Cyberpunk no se queda fuera: su hoja viste la línea subida dentro de Estudio", () => {
  // La hoja de Cyberpunk fija el borde de sus tarjetas en #3a332a con la
  // misma especificidad que la regla de la pila y carga después: sin esta
  // línea, la subida no llegaba a sus tarjetas de Estudio (el banco lo
  // midió: el borde no se movía). El resto de la app conserva su #3a332a.
  assert.ok(
    cyber.includes('[data-theme="cyberpunk"] .study-stack :is(.card, .ridge, .cs-card, .cobro-card, .form-block) { border-color: var(--line-study); }'),
    "las tarjetas de Estudio en Cyberpunk visten --line-study",
  );
});

test("435 · ningún color escogido a mano en la subida", () => {
  const block = pano.slice(pano.indexOf(".study-stack { --line-study"), pano.indexOf(".pano-card {"));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block), "todo nace de los tokens del tema");
});
