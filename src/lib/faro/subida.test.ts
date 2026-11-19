/**
 * FARO — 1.3.318: SUBIR TAMBIÉN CONFIRMA + LA COLUMNA FANTASMA (Oscar, 2026-11-18).
 *
 * Dos órdenes de su mensaje de las 19:45, con su foto del libro EJEMPLO:
 *
 * (1) «De la misma forma en que confirma para bajar, tiene que confirmar
 * para subir» — para no cambiar ni subir por error. Enmienda la decisión
 * base 2 de los modos (subir no preguntaba, solo avisaba): el toque local
 * en un modo mayor ya NO aplica al instante — plantea la pregunta en el
 * diálogo hermano (ModeReposedDialog) con su cuerpo fresco (mode.up.body),
 * la lista de lo que se destapa y la confirmación que compara premisas;
 * el letrero centrado sigue anunciando el aterrizaje confirmado. Las
 * llegadas (otra pestaña, la nube) no pasan por pickMode y no preguntan.
 *
 * (2) En Esencial, los íconos de la fila del hub (tema, vista, lupa) se
 * veían lejos de la moneda porque el calendario no estaba y su hueco
 * quedaba vacío entre la lupa y la moneda. A las 20:11 Oscar completó el
 * pensamiento: el calendario SÍ vive en Esencial — «el plan es esencial»
 * — pero no presentando todo lo que presenta en los otros modos. La cura
 * final: nav.calendar baja a Esencial con su cara de plan (días, puntos,
 * nombres, vencimientos, feriados) y el pie de totales del mes gana su
 * asiento (nav.calendar-totals, Ritmo). Con el calendario presente, la
 * fila queda llena y los íconos pegados a la moneda como pidió.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const screens = SRC("../../components/faro/screens.tsx");
const gate = SRC("../../components/faro/mode-gate.tsx");
const shell = SRC("../../components/faro/shell.tsx");
const i18n = SRC("./i18n.ts");

describe("1.3.318 §A — subir también confirma", () => {
  it("el brazo de subida de pickMode plantea el diálogo fresco, no aplica", () => {
    const arm = screens.slice(screens.indexOf("if (modeRank(target) > modeRank(currentMode)) {", screens.indexOf("const pickMode")));
    const body = arm.slice(0, arm.indexOf("const impact = modeImpact"));
    assert.ok(body.includes("setModeReposed({ target, from: currentMode, unlocked: unlockedGroups(session.ledger, currentMode, target), fresh: true })"), "la subida abre el diálogo hermano con fresh");
    assert.ok(!body.includes("applyMode(target)"), "la subida ya no se aplica sin preguntar");
  });
  it("el diálogo hermano lleva la variante fresca y su cuerpo propio", () => {
    assert.ok(gate.includes('fresh ? "mode.up.body" : "mode.reposed.body"'), "el cuerpo fresco se elige por la marca fresh");
    assert.ok(gate.includes("fresh?: boolean"), "la marca viaja en las props");
    assert.ok(screens.includes("fresh={modeReposed.fresh}"), "Ajustes pasa la marca al diálogo");
  });
  it("mode.up.body existe en los dos idiomas, con {from} y {name}", () => {
    const hits = i18n.match(/"mode\.up\.body": "[^"]*\{from\}[^"]*\{name\}[^"]*"/g) ?? [];
    assert.equal(hits.length, 2, "ES y EN, con las dos marcas");
  });
  it("el cuerpo re-planteado de siempre no se tocó", () => {
    assert.ok(i18n.includes("Mientras mirabas, tu modo cambió"), "el cuerpo del re-planteado sigue para su caso");
  });
});

describe("1.3.318 §B — el plan es esencial: el calendario en Esencial, sin el pie", () => {
  const mode = SRC("./mode.ts");
  it("nav.calendar es de Esencial y el pie de totales tiene su asiento en Ritmo", () => {
    assert.ok(mode.includes('"nav.calendar": E'), "el calendario vive en Esencial");
    assert.ok(mode.includes('"nav.calendar-totals": R'), "los totales del mes son de Ritmo");
  });
  it("el pie del calendario nace solo con su asiento", () => {
    assert.ok(shell.includes('has("nav.calendar-totals")'), "la puerta del pie existe");
    const gateAt = shell.indexOf('has("nav.calendar-totals")');
    const footAt = shell.indexOf('className="cal-foot"');
    assert.ok(gateAt >= 0 && footAt > gateAt, "la puerta envuelve el pie");
  });
  it("el ancla del calendario queda como estaba — con el calendario presente no hay hueco", () => {
    assert.ok(shell.includes('<div className="cal-anchor" ref={calRef} data-anchor="top-cal">'), "el ancla se pinta entera");
  });
});
