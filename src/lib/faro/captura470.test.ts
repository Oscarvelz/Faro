import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 1.3.470 · LA PAREJA SE REPARTE Y LA CASA TIENE SU COLOR (fallo de
 * Oscar, 2026-11-26, sobre la foto del banco de la 465): el hueco
 * muerto a la derecha de «Ahora no» violaba la proporción — la
 * pareja de la confirmación se reparte la fila entera de su
 * tarjeta, cada botón con su parte igual. Y la pregunta fija de la
 * casa («¿Qué puede hacer el asesor?») no comparte el amarillo
 * lleno de la confirmación: lleva la voz --house, que cada tema
 * dice con su paleta, y la brújula al frente. Esta cerca clava las
 * dos piezas.
 * ENMIENDA 1.3.502 (fallo de Oscar, 2026-11-27, sobre su foto del
 * botón): el fondo LLENO de la casa era exorbitante — realzaba
 * demasiado; y su segunda palabra sobre la misma foto: el magenta
 * DA FALSA ALARMA. La forma se queda; la voz vuelve al amarillo
 * que el botón tenía — el acento del tema — dicho en tinte sutil
 * (fondo translúcido, borde y letra en el acento), y lo que la
 * separa de la confirmación llena es el diseño: tinte contra
 * lleno. La aserción del lleno se re-apunta a esta forma. Los
 * tokens --house quedan definidos en los temas (sin uso en la
 * regla desde esta enmienda); el corte de Cyberpunk se queda. */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("470 · la pareja de la confirmación se reparte la fila de su tarjeta", () => {
  const css = read("../../components/faro/advisor2.css");
  assert.match(css, /\.ask-card \.ask-chips > \.ask-chip \{ flex: 1 1 0; text-align: center; \}/, "cada botón de la fila toma su parte igual, sin hueco muerto");
});

test("470 · la pregunta fija de la casa lleva su color propio, no el de la confirmación", () => {
  const box = read("../../components/faro/ask-box.tsx");
  assert.ok(box.includes('className="ask-chip is-house" data-anchor="ask-preset-fixed"'), "la fija se pinta con su clase propia y su ancla de siempre");
  const css = read("../../components/faro/advisor2.css");
  assert.match(css, /\.ask-chip\.is-house \{[^}]*background: color-mix\(in srgb, var\(--accent\) 13%, transparent\); color: var\(--accent\)/, "is-house dice su amarillo en tinte sutil (1.3.502): fondo translúcido y letra en el acento, nunca el fondo lleno ni el rojo que da falsa alarma");
  assert.match(css, /\.ask-chip\.is-fixed \{[^}]*background: var\(--accent\); color: var\(--accent-fg\)/, "la confirmación conserva el acento lleno, solo suyo");
});

test("470 · cada tema dice la voz de la casa con su paleta", () => {
  const cp = read("../../components/faro/cyberpunk.css");
  assert.match(cp, /--house: var\(--cp-magenta\); --house-fg: #0b0a08;/, "Cyberpunk la dice en su magenta");
  const hud = read("../../components/faro/cyberpunk-hud.css");
  assert.match(hud, /\[data-theme="cyberpunk"\] \.ask-chip\.is-house \{ clip-path: var\(--cp-cut-sm\); \}/, "y la presenta con el corte de la casa");
  const styles = read("../../styles.css");
  assert.match(styles, /\[data-theme="ion"\] \{ --house: var\(--glow\); --house-fg: #041016; \}/, "Ion la dice con su resplandor");
  assert.match(styles, /\[data-theme="ion-noche"\] \{ --house: var\(--glow\); --house-fg: #041016; \}/, "Ion noche también");
});
