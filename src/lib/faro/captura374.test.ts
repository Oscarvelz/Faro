/**
 * captura374 — la cerca de la 1.3.374 «La barra, en su orden; el
 * aterrizaje, completo» (palabra de Oscar sobre la 372 en su teléfono,
 * 2026-11-21 20:22):
 *
 *  1. El orden de la barra: la lupa al lugar del calendario, el
 *     calendario al del Asesor, el Asesor al de la lupa — tema ·
 *     calendario · Asesor · lupa · moneda; el Asesor, tercero leído de
 *     derecha a izquierda.
 *  2. La marca del Asesor es la brújula — en la barra y en la cabecera
 *     de la caja, una sola cara — y la burbuja con interrogación no
 *     queda en ninguno de los dos sitios: nada en Faro debe leerse
 *     como «IA», porque no lo es.
 *  3. El toque aterriza en la CAJA ENTERA: el desplazamiento va a la
 *     caja con block:"start" (nunca más el campo centrado que la dejaba
 *     partida) y el foco llega con preventScroll; la caja lleva su
 *     margen de desplazamiento.
 *  4. Vista y Subir miden 31 (36 menos el 13 % que pidió); la
 *     aritmética de burbujas de Subir usa el mismo 31.
 *  5. Sin escritorio no hay altura de escritorio: con el Manual
 *     abierto, el deslizamiento publica el recorrido completo (los
 *     flotantes bajan a su esquina natural) y la ley del scroll vuelve
 *     al cerrarlo — la misma excepción que guarda al teclado.
 *  6. El botón de Vista VIVE sobre el Manual (z sobre la capa), en su
 *     esquina: de dónde dividir se decide desde donde se esté; al
 *     elegir una vista, el Manual se cierra y la vista queda delante —
 *     un botón que promete y no cumple sería peor que su ausencia.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const shellSrc = read("../../components/faro/shell.tsx");
const askBoxSrc = read("../../components/faro/ask-box.tsx");
const toTopSrc = read("../../components/faro/to-top.tsx");
const toTopCss = read("../../components/faro/to-top.css");
const floatCss = read("../../components/faro/float.css");
const advisorCss = read("../../components/faro/advisor2.css");
const topicsSrc = read("../manual/topics.ts");

test("374-1 · el orden de la barra (re-fijado por la 1.3.375: la revocación de Oscar)", () => {
  // La 1.3.374 ordenó la barra tema · calendario · Asesor · lupa ·
  // moneda por su palabra de las 20:22; la misma noche (20:51) la
  // revocó él mismo: «hay un espacio necesario entre el calendario y
  // la lupa». El orden vuelve a su asiento anterior y esta cerca lo
  // clava así; lo demás de la 374 (brújula, aterrizaje, 31 px, la
  // esquina) queda intacto y cercado abajo.
  const at = (anchor: string) => shellSrc.indexOf(`data-anchor="${anchor}"`);
  const theme = at("top-theme"), cal = at("top-cal"), ask = at("top-ask"), search = at("top-search"), coin = at("top-coin");
  assert.ok(theme > 0 && ask > theme, "el Asesor vuelve a su hueco tras el tema");
  assert.ok(search > ask, "la lupa sigue al Asesor, fuera de la rejilla");
  assert.ok(cal > search, "el calendario vive en la rejilla, tras la lupa — el espacio entre ambos es el de la rejilla");
  assert.ok(coin > cal, "la moneda cierra la fila, como siempre");
});

test("374-2 · una sola cara para el Asesor: la brújula, en la barra y en la caja", () => {
  assert.ok(shellSrc.includes("<Compass"), "la barra lleva la brújula");
  assert.ok(askBoxSrc.includes("<Compass"), "la cabecera de la caja lleva la misma brújula");
  assert.ok(!shellSrc.includes("MessageCircleQuestion") && !askBoxSrc.includes("MessageCircleQuestion"), "la burbuja con interrogación no queda en ningún sitio");
  assert.ok(topicsSrc.includes("icono de la brújula") && topicsSrc.includes("the compass icon"), "el Manual nombra la brújula, en los dos idiomas");
});

test("374-3 · el aterrizaje enmarca la caja entera", () => {
  const goAsk = shellSrc.slice(shellSrc.indexOf("const goAsk"), shellSrc.indexOf("const toggleFloat"));
  assert.ok(goAsk.includes('[data-anchor="advisor-ask"]'), "el desplazamiento busca la caja, no el campo");
  assert.ok(goAsk.includes('scrollIntoView({ block: "start" })'), "la caja se encuadra desde su inicio");
  assert.ok(goAsk.includes("focus({ preventScroll: true })"), "el foco no vuelve a partir el encuadre");
  assert.ok(!goAsk.includes('block: "center"'), "el campo centrado de la 372 se fue");
  assert.ok(/\.ask-box \{[^}]*scroll-margin-top: 12px/.test(advisorCss), "la caja lleva su margen de desplazamiento");
});

test("374-4 · Vista y Subir, 31px, y la aritmética de Subir con el mismo número", () => {
  assert.ok(/\.to-top \{[^}]*width: 31px; height: 31px/.test(toTopCss), "Subir mide 31");
  assert.ok(/\.view-fab \{[^}]*width: 31px; height: 31px/.test(floatCss), "Vista mide 31");
  assert.ok(toTopSrc.includes("const ax = W - right - 31") && toTopSrc.includes("const ay = H - bottom - 31"), "la burbuja de Subir se calcula con 31");
  assert.ok(!toTopSrc.includes("- 36;"), "ningún 36 queda en la aritmética");
});

test("374-5 · con el Manual abierto no hay escritorio: los flotantes bajan a la esquina", () => {
  assert.ok(shellSrc.includes("const manualOpen = ui.manual !== null"), "la cáscara sabe que el Manual vive");
  assert.ok(shellSrc.includes("if (manualOpen && dock && T > 0) dockTarget = T"), "el paso del deslizamiento hunde los flotantes con la capa abierta");
  assert.ok(shellSrc.includes("manualOpen, ready"), "el lazo se despierta cuando la capa abre y cierra");
});

test("374-6 · el botón de Vista vive sobre el Manual, y elegir una vista lo cierra", () => {
  assert.ok(shellSrc.includes("is-over-manual"), "el ancla sabe que está sobre la capa");
  assert.ok(/\.view-fab-anchor\.is-over-manual \{ z-index: 81; \}/.test(floatCss), "se sienta uno por encima de la capa (80)");
  assert.ok(shellSrc.includes("overManual={manualOpen}"), "la cáscara le pasa el estado de la capa");
  const vf = shellSrc.slice(shellSrc.indexOf("<ViewFloat"), shellSrc.indexOf("<LockOffer"));
  assert.ok((vf.match(/manual: null/g) ?? []).length >= 3, "elegir vista, pisos o ventana cierra el Manual y deja la vista delante");
  assert.ok(topicsSrc.includes("También vive sobre el Manual") && topicsSrc.includes("It also lives over the Manual"), "el tema Vista lo cuenta, en los dos idiomas");
});
