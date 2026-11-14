// «MES ACTUAL» (Oscar, 2026-11-13 20:39 EST, a imagen del «Current Week» de
// Weekly): la placa del navegador del Historial, cuando el período mirado ES
// el presente, dice «Mes actual» en vez del nombre verdadero. «Obviamente
// solo aquí»: SOLO la placa. Lo que fijan estas cercas:
//  - las tres claves nuevas (hist.now.week/month/year) existen en español Y
//    en inglés con su letra exacta; el inglés va en Title Case — el registro
//    de los nombres de mes de la propia placa («November») y el del letrero
//    de Weekly que Oscar señaló («Current Week»);
//  - la etiqueta de la placa (plateLabel) nace de la MISMA onPresent de la
//    255 — una sola llamada periodRange(lens, today, weekStart) en toda la
//    pantalla, ninguna segunda noción de presente, ninguna fecha nueva;
//  - la placa es el ÚNICO asiento de plateLabel: la identidad del folio en
//    el panel de totales sigue siendo periodLabel (el nombre verdadero, aun
//    en el presente), la ventana de ocultar y el nombre del tramo que
//    descansa siguen saliendo de periodLabel, y periodLabel misma no cambia;
//  - la placa conserva su forma y su toque de la 255: botón .hist-period con
//    goPresent, y el aria nombra la acción solo fuera del presente (en el
//    presente no promete nada: el texto «Mes actual» se describe solo).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { translate } from "./i18n.ts";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const tsx = read("components/faro/historial.tsx");

describe("mes actual: las palabras", () => {
  it("las tres claves existen en ES y en EN, con su letra exacta", () => {
    assert.equal(translate("es", "hist.now.week"), "Semana actual");
    assert.equal(translate("es", "hist.now.month"), "Mes actual");
    assert.equal(translate("es", "hist.now.year"), "Año actual");
    assert.equal(translate("en", "hist.now.week"), "Current Week");
    assert.equal(translate("en", "hist.now.month"), "Current Month");
    assert.equal(translate("en", "hist.now.year"), "Current Year");
  });
});

describe("mes actual: una sola noción de presente", () => {
  it("la etiqueta de la placa cuelga de onPresent, la prueba de la 255", () => {
    assert.match(tsx, /const plateLabel = onPresent\s*\n?\s*\? t\(lens === "week" \? "hist\.now\.week" : lens === "year" \? "hist\.now\.year" : "hist\.now\.month"\)\s*\n?\s*: periodLabel;/);
  });

  it("no nace una segunda noción de presente: periodRange(lens, today, …) aparece una sola vez", () => {
    const calls = tsx.match(/periodRange\(lens, today, weekStart\)/g) ?? [];
    assert.equal(calls.length, 1, "la pantalla ya tenía su presente (presentRange); la etiqueta lo reutiliza");
  });
});

describe("mes actual: solo aquí", () => {
  it("la placa es el único asiento de plateLabel", () => {
    const seats = tsx.match(/\{plateLabel\}/g) ?? [];
    assert.equal(seats.length, 1, "plateLabel se pinta una sola vez: en la placa");
    // RE-FIJADO 1.3.263: la clase de la placa ahora cuelga de onPresent
    // («hist-period is-now» en el presente, para que el actual vista el
    // acento del tema); el asiento, el toque y el aria no cambian — la
    // intención de esta cerca queda intacta y el gancho nuevo lo cerca
    // actualcolor263.test.ts.
    assert.match(tsx, /<button type="button" className=\{onPresent \? "hist-period is-now" : "hist-period"\} onClick=\{goPresent\} aria-label=\{onPresent \? undefined : t\("hist\.now"\)\}>\{plateLabel\}<\/button>/);
  });

  it("el folio del panel de totales conserva el nombre verdadero (periodLabel)", () => {
    assert.match(tsx, /<span className="hist-folio-period">\{periodLabel\}<\/span>/);
  });

  it("ocultar sigue nombrando el período verdadero: ventana y tramo descansado salen de periodLabel", () => {
    assert.match(tsx, /\.replace\("\{period\}", periodLabel\)/);
    assert.match(tsx, /hidePeriodRange\(range\.from, range\.to, periodLabel\)/);
  });

  it("periodLabel misma no cambia: sigue naciendo del nombre del mes y del rango", () => {
    assert.match(tsx, /const periodLabel = lens === "month"\s*\n?\s*\? `\$\{monthName\(lang, Number\(range\.from\.slice\(5, 7\)\)\)\} \$\{range\.from\.slice\(0, 4\)\}`/);
  });

  it("la placa no cambia de forma ni de toque: el aria sigue nombrando la acción solo fuera del presente", () => {
    assert.match(tsx, /aria-label=\{onPresent \? undefined : t\("hist\.now"\)\}/);
    assert.equal(translate("es", "hist.now"), "Volver al presente");
    assert.equal(translate("en", "hist.now"), "Back to the present");
  });
});
