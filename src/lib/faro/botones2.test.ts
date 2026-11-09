// Oleada de botones 2 (1.3.171) — promesas pequeñas, cumplidas.
// R2 («Ver mes» vuelve a la cuadrícula sin cerrar el calendario), N3 (el (?) de «Oportunidad de
// mejora» alcanzable otra vez) y R14 (el nombre accesible del «+» de Me deben) viven en componentes
// y CSS; sus pruebas son las sondas de banco probe171-a.mjs / probe171-b.mjs (rojas sobre la
// 1.3.170 intacta, verdes aquí). Aquí queda cercado lo que sí es lógica pura: N2 (el orden de
// Estudio es UNA sola fuente y el modo solo mueve tarjetas que se ven) y R3 (el texto honesto del
// pliegue Cuenta en modo local existe en los dos idiomas). Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { swapVisible, visibleOrder } from "./studyorder.ts";
import { translate } from "./i18n.ts";

// El libro de ejemplo del censo: 20 tarjetas registradas, 15 se pintan (people, remesas, rewards,
// owed y loans no tienen datos y nunca aparecen como pliegues).
const PLACED = ["pulse", "health", "pace", "agenda", "waffle", "where", "people", "remesas", "rewards", "sankey", "rule", "plan", "movers", "time", "earnings", "year", "cushion", "owed", "loans", "numeros"];
const RENDERED = ["pulse", "health", "pace", "agenda", "waffle", "where", "sankey", "rule", "plan", "movers", "time", "earnings", "year", "cushion", "numeros"];
const SECTION: Record<string, string> = {
  pulse: "now", health: "now", pace: "now", agenda: "now",
  waffle: "spend", where: "spend", people: "spend", remesas: "spend", rewards: "spend", sankey: "spend",
  rule: "general", plan: "general", movers: "general",
  time: "time", earnings: "time", year: "time",
  cushion: "save", owed: "owed", loans: "owed", numeros: "keys",
};
const sectionOf = (id: string) => SECTION[id] ?? "";

describe("N2 — el modo de ordenar solo lista tarjetas que se pintan", () => {
  it("la lista visible es el orden colocado, sin fantasmas", () => {
    assert.deepEqual(visibleOrder(PLACED, RENDERED), RENDERED);
  });

  it("un Bajar sobre «where» lo cambia con «sankey» (la siguiente que se pinta), no con un fantasma", () => {
    const live = visibleOrder(PLACED, RENDERED);
    const at = live.indexOf("where");
    const next = swapVisible(PLACED, live, sectionOf, at, 1);
    assert.notEqual(next, PLACED);
    // En la lista visible, where y sankey quedan cambiados; los fantasmas conservan su sitio en el orden completo.
    assert.deepEqual(visibleOrder(next, RENDERED).slice(4, 7), ["waffle", "sankey", "where"]);
    assert.equal(next.indexOf("people"), PLACED.indexOf("people"));
    assert.equal(next.indexOf("remesas"), PLACED.indexOf("remesas"));
    assert.equal(next.length, PLACED.length);
  });

  it("en los bordes de la lista visible no se mueve nada", () => {
    const live = visibleOrder(PLACED, RENDERED);
    assert.equal(swapVisible(PLACED, live, sectionOf, 0, -1), PLACED);
    assert.equal(swapVisible(PLACED, live, sectionOf, live.length - 1, 1), PLACED);
  });

  it("cruzar de sección está prohibido, también entre visibles (cushion → numeros)", () => {
    const live = visibleOrder(PLACED, RENDERED);
    const at = live.indexOf("cushion");
    assert.equal(swapVisible(PLACED, live, sectionOf, at, 1), PLACED);
  });

  it("un intercambio dentro de la misma sección y sin fantasmas de por medio sigue funcionando", () => {
    const live = visibleOrder(PLACED, RENDERED);
    const next = swapVisible(PLACED, live, sectionOf, live.indexOf("pulse"), 1);
    assert.deepEqual(visibleOrder(next, RENDERED).slice(0, 2), ["health", "pulse"]);
  });
});

describe("R3 — el pliegue Cuenta en modo local dice la verdad, en los dos idiomas", () => {
  it("account.local resuelve a texto real en español y en inglés", () => {
    const es = translate("es", "account.local");
    const en = translate("en", "account.local");
    assert.ok(es.length > 40 && !es.includes("account.local"), `es: ${es}`);
    assert.ok(en.length > 40 && !en.includes("account.local"), `en: ${en}`);
    assert.notEqual(es, en);
    assert.match(es, /local/i);
    assert.match(en, /local/i);
  });
});
