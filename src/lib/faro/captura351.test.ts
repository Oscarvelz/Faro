/**
 * captura351 — la pantalla del Asesor, acabada (Oscar, 2026-11-20):
 * «Pregúntale a tu Asesor» vuelve DEBAJO de «Palabras claras» (su palabra
 * posterior manda sobre la de la mañana: primero el consejo general,
 * después la pregunta); el envoltorio de la caja sube al material del
 * héroe del Coach, por tokens del tema; las Palabras claras dejan de ser
 * texto suelto — cada término en su propia pieza; y las barras de
 * búsqueda de Faro aprenden la ley: al tocarlas se selecciona todo el
 * texto y tras 30 s de reposo se limpian solas.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const advisor2 = read("../../components/faro/advisor2.css");
const panoramaCss = read("../../components/faro/panorama.css");
const behavior = read("../../components/faro/search-behavior.ts");

describe("351 · el orden: primero el consejo, después la pregunta", () => {
  it("Preguntar vive tras el Coach (y sus Palabras claras), no al tope", () => {
    const coach = screens.indexOf("<CoachHero />");
    const ask = screens.indexOf("<AskBox />");
    assert.ok(coach >= 0 && ask > coach, "AskBox se rinde después de CoachHero");
  });

  it("el tema del Manual cuenta el sitio nuevo, no el tope", () => {
    const topics = read("../manual/topics.ts");
    const at = topics.indexOf('id: "preguntar-asesor"');
    const block = topics.slice(at, at + 4600);
    assert.ok(block.includes("debajo de las Palabras claras"));
    assert.ok(!block.includes("Al tope del"), "nada de «al tope» en el tema");
  });
});

describe("351 · el envoltorio y las piezas", () => {
  it("la caja lleva el resplandor del héroe, por tokens del tema", () => {
    assert.ok(advisor2.includes("radial-gradient(90% 100% at 85% 0%, var(--accent)"), "el mismo resplandor del Coach, con el token del tema");
    assert.ok(advisor2.includes(".ask-ico"), "el medallón del icono vive");
    assert.ok(!/\.ask-box \{[^}]*#[0-9a-fA-F]{3,6}/.test(advisor2), "ningún color propio en la caja: manda el tema");
  });

  it("cada término de Palabras claras vive en su propia pieza", () => {
    assert.ok(panoramaCss.includes(".coach-glossary > div"), "la pieza por término existe");
    assert.ok(panoramaCss.includes("border-left: 3px solid color-mix(in oklab, var(--accent)"), "la raya del acento, familia de la tarjeta de respuesta");
  });
});

describe("351 · la ley de las barras de búsqueda", () => {
  it("la casa común existe: selección al tocar y limpieza a los 30 s", () => {
    assert.ok(behavior.includes("SEARCH_IDLE_MS = 30000"));
    assert.ok(behavior.includes("selectAllOnFocus"));
    assert.ok(behavior.includes("useIdleClear"));
  });

  it("toda barra de búsqueda pasa por la casa", () => {
    const sites: Array<[string, string]> = [
      ["../../components/faro/shell.tsx", "faro-search"],
      ["../../components/faro/manual.tsx", "manual.search"],
      ["../../components/faro/historial.tsx", "hist.search"],
      ["../../components/faro/screens.tsx", "Search currency"],
      ["../../components/faro/fit-pick.tsx", "pick-search"],
      ["../../components/faro/widget-host.tsx", "widgetpins.search"],
    ];
    for (const [rel, mark] of sites) {
      const src = read(rel);
      assert.ok(src.includes("useIdleClear"), `${rel}: la limpieza vive`);
      assert.ok(src.includes("selectAllOnFocus"), `${rel}: la selección vive`);
      assert.ok(src.includes(mark), `${rel}: su barra sigue ahí`);
    }
  });
});

describe("351 · Novedades", () => {
  it("la nota grande de la 351 abre el registro", () => {
    const news = read("./novedades.ts");
    const head = news.slice(news.indexOf("export const NEWS"), news.indexOf("export const NEWS") + 400);
    assert.ok(head.includes('"1.3.351"'));
    assert.ok(head.includes('"grande"'));
  });
});
