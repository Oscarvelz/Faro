import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { isMainSection, lastMainPlace } from "./navplace.ts";
import { SECTIONS, type SectionId } from "./types.ts";

// La ley de la salida (Oscar, chat de ventanas, 2026-11-10): «It should not be
// possible to leave the app from the settings. I should at least be in any of
// the main pages outside.» El hueco: el lugar guardado (1.3.180) reconstruye el
// piso EN Ajustes tras cada bloqueo, así que el primer Atrás allí era de raíz y
// preguntaba «¿Salir de Faro?» parado en Ajustes; y el camino del caparazón
// (faro-root-back) preguntaba sin mirar dónde estaba parado. Estas cercas
// fijan la puerta: la pregunta solo nace en una página principal; en Ajustes,
// el Atrás sale de Ajustes.

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const provider = read("../../components/faro/provider.tsx");

describe("la ley de la salida — desde Ajustes no se sale de la app", () => {
  it("toda sección menos Ajustes es página principal", () => {
    for (const s of SECTIONS) {
      assert.equal(isMainSection(s), s !== "settings", `${s}: isMainSection`);
    }
    assert.equal(isMainSection("settings"), false);
    assert.equal(isMainSection("desk"), true);
  });

  it("lastMainPlace elige el lugar principal más hondo; sin ninguno, null", () => {
    const at = (section: SectionId) => ({ section });
    assert.equal(lastMainPlace([]), null);
    assert.equal(lastMainPlace([at("settings")]), null);
    assert.equal(lastMainPlace([at("settings"), at("settings")]), null);
    assert.equal(lastMainPlace([at("desk"), at("settings")])?.section, "desk");
    assert.equal(lastMainPlace([at("desk"), at("fixed"), at("settings")])?.section, "fixed");
    assert.equal(lastMainPlace([at("settings"), at("stats")])?.section, "stats");
  });

  it("el Atrás de raíz en el navegador pasa por la puerta antes de preguntar", () => {
    assert.match(provider, /if \(!isMainSection\(live\.section\)\) \{ guardPanelExit\(leaveSettings\); return; \}/);
  });

  it("el Atrás de raíz del caparazón (faro-root-back) pasa por la misma puerta", () => {
    assert.match(provider, /if \(!isMainSection\(uiRef\.current\.section\)\) \{ guardPanelExit\(leaveSettings\); return; \}/);
    assert.match(provider, /const onRootBack = \(\) => \{\s*if \(confirmRef\.current\) return;/);
  });

  it("leaveSettings aterriza en la última principal o en Central, y rearma la guardia", () => {
    assert.match(provider, /const leaveSettings = \(\) => \{/);
    assert.match(provider, /section: "desk",/);
    assert.match(provider, /places\.current = \[dest\];/);
    assert.match(provider, /history\.pushState\(\{ faro: 1 \}, ""\);/);
  });
});
