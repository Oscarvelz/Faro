/* 1.3.410 — EL TOQUE DEL AVISO LLEVA SU MES (Oscar, 2026-11-22 14:03, con
   su foto de los tres cierres): el aviso de cierre sabía su mes, pero el
   toque solo decía «abre Estudio» y la persona quedaba en la puerta a
   buscar el reporte por su cuenta. La ruta viaja ahora «close|<yyyy-MM>»
   de punta a punta: el shell la emite, la puerta del shell la admite, el
   anfitrión la lee y Estudio abre con ese mes marcado en «Cómo cerró
   cada mes», con su pliegue abierto y la tarjeta a la vista. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const notify = read("../../../android/app/src/main/java/com/oscarvelz/faro/FaroNotify.kt");
const mainAct = read("../../../android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt");
const host = read("../../components/faro/widget-host.tsx");
const pano = read("../../components/faro/panorama.tsx");
const screens = read("../../components/faro/screens.tsx");
const novedades = read("./novedades.ts");
const topics = read("../manual/topics.ts");
const fundCss = read("../../components/faro/fund.css");
const stylesCss = read("../../styles.css");

describe("410 · el toque del aviso de cierre lleva su mes", () => {
  it("el shell emite la ruta con el mes del cierre", () => {
    assert.ok(notify.includes('body, "close|${f.key}")'), "la ruta del cierre lleva su mes");
    assert.ok(!notify.includes('body, "stats")'), "la ruta genérica a Estudio ya no sale del cierre");
  });
  it("la puerta del shell admite la ruta con mes sin abrir la validación", () => {
    assert.ok(mainAct.includes('Regex("^([a-z-]{2,24}|close\\\\|\\\\d{4}-\\\\d{2})$")'), "la validación admite «close|<yyyy-MM>» y nada más ancho");
  });
  it("el anfitrión lee la ruta y deja el mes en la tarjeta de los cierres", () => {
    assert.ok(host.includes('/^close\\|(\\d{4}-\\d{2})$/'), "la ruta se reconoce entera");
    assert.ok(host.includes("preferHistoryMonth(closeM[1])"), "el mes se deja en su asiento");
    assert.ok(host.includes('goTopic("estudio", { screen: "stats" })'), "el salto va a Estudio con su tema");
  });
  it("el Estudio recoge el mes: se pone en él y abre «Entra, sale y queda» en él", () => {
    assert.ok(pano.includes("export function preferHistoryMonth(key: string)"), "el asiento existe");
    assert.ok(pano.includes("export function takeHistoryMonth(): string | null"), "la recogida es de un solo uso");
    assert.ok(screens.includes("takeHistoryMonth()"), "el Estudio recoge el mes al montar");
    assert.ok(screens.includes("setUi({ year, month })"), "el Estudio se pone en ese mes por su asiento de siempre");
    assert.ok(screens.includes('new CustomEvent("faro-open", { detail: "time" })'), "el pliegue del tiempo se abre por la puerta de la casa");
    assert.ok(screens.includes('[data-anchor="time"]'), "la tarjeta se pone a la vista");
  });
  it("los dos retoques de su veredicto sobre la 409 viajan en esta ola", () => {
    // Las tarjetas de naturaleza: apiladas en el teléfono, lado a lado en tableta.
    assert.ok(fundCss.includes(".fund-opts { display: grid; grid-template-columns: minmax(0, 1fr);"), "en el teléfono, una sobre la otra");
    assert.ok(fundCss.includes('@media (min-width: 768px) { .fund-opts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }'), "en tableta, lado a lado");
    // El marco blanco del navegador no vuelve a los botones del diálogo.
    assert.ok(stylesCss.includes(".ask-btn:focus { outline: none; }"), "sin marco del navegador al abrir");
    assert.ok(stylesCss.includes(".ask-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }"), "el foco de teclado conserva su anillo, en el acento");
  });
  it("el anuncio y el Manual cuentan el toque nuevo", () => {
    assert.ok(novedades.includes('version: "1.3.410"'), "la entrada de novedades existe");
    assert.ok(novedades.includes('topic: "avisos-app"'), "su puerta es el tema de los avisos");
    assert.ok(topics.includes("Cada aviso te lleva a lo que anuncia"), "el tema de Notificaciones gana el consejo del toque");
  });
});
