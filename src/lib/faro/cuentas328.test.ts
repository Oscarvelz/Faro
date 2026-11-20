/**
 * FARO — 1.3.328: EL ACABADO PREMIUM DE LAS TARJETAS DE CUENTA (Oscar,
 * 2026-11-19, con su foto de Lafise en Cyberpunk).
 *
 * «Estoy seguro que estas pestañas en ahorros pueden tener un acabado más
 * premium para las cuentas, para que se vea de lo más precioso según el tema
 * escogido por el usuario.» La tarjeta era una fila plana y sus cifras de
 * compromiso corrían como una frase suelta bajo el nombre. La pieza es de
 * presentación pura: material en capas con luz alta, medallón con anillo en
 * la tinta del ahorro, el saldo en voz segura, y las cifras como
 * estadísticas sentadas bajo un filete (la anilla de saldo + «Ya tiene
 * nombre» y «Libre», cada una con su cifra). Tron añade su luz racionada al
 * medallón; Cyberpunk mantiene su disciplina plana (sin brillo ni sombra,
 * marco en su tono, 2px). Ni una cifra, ni un gesto, ni una puerta cambian:
 * los mismos pledgedByHost y minor de siempre componen las dos lecturas.
 *
 * ENMIENDA 1.3.330 (Oscar, 2026-11-19 22:20 EST, con su foto): la línea del
 * panel (save.panel.pledged) repetía las cifras de la tarjeta — duplicado
 * prohibido — y las filas a todo ancho dejaban el hueco en medio. La línea
 * del panel muere; la tira se integra: medidor de proporción + las dos
 * cifras como pares compactos (etiqueta y cifra juntas), y la tira entera
 * es la SourceNote que explica las cifras al tocarlas (las .what/.note del
 * panel sobreviven ahí). Las aserciones de la tira se re-dicen a esa forma.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { translate } from "./i18n.ts";

const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const fundCss = readFileSync(new URL("../../components/faro/fund.css", import.meta.url), "utf8");
const tronCss = readFileSync(new URL("../../components/faro/tron.css", import.meta.url), "utf8");
const cyberCss = readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const i18nSrc = readFileSync(new URL("./i18n.ts", import.meta.url), "utf8");

describe("cuentas328: la tira de estadísticas sustituye a la frase suelta", () => {
  it("screens compone la tira con la etiqueta y Libre, de las mismas cifras", () => {
    assert.match(screens, /className="save-acct-stats"/);
    assert.match(screens, /t\("save\.acct\.namedLab"\)/);
    assert.match(screens, /t\("save\.free"\)/);
    assert.match(screens, /className="acct-ring"/);
    assert.ok(!screens.includes("save-acct-line"), "la frase suelta ya no se pinta");
    assert.ok(!screens.includes("save.acct.named\""), "la llave de la frase ya no se consume");
  });

  it("1.3.330: la línea del panel murió y la tira se integra sin huecos", () => {
    assert.ok(!screens.includes("save-panel-line"), "la línea duplicada del panel ya no se pinta");
    assert.ok(!screens.includes('t("save.panel.pledged")'), "la frase del panel ya no se consume como texto");
    assert.match(screens, /className="acct-meter"/);
    assert.match(screens, /className="acct-pair"/);
    assert.match(screens, /t\("save\.panel\.pledged\.what"\)/, "la explicación de las cifras vive en la tira");
    assert.ok(!i18nSrc.includes("\"save.panel.pledged\":"), "save.panel.pledged retirada de ambos diccionarios");
  });

  it("el diccionario: la etiqueta vive en los dos idiomas y la frase murió", () => {
    assert.equal(translate("es", "save.acct.namedLab"), "Ya tiene nombre");
    assert.equal(translate("en", "save.acct.namedLab"), "Already named");
    assert.ok(!i18nSrc.includes("\"save.acct.named\":"), "save.acct.named retirada de ambos diccionarios");
  });

  it("fund.css lleva el material, el medallón y la tira", () => {
    assert.match(fundCss, /\.save-accounts > \.save-account \{[^}]*linear-gradient\(180deg, rgb\(255 255 255 \/ \.05\)/);
    assert.match(fundCss, /\.save-accounts \.look-mark \{[^}]*width: 36px/);
    assert.match(fundCss, /\.save-accounts \.bank-sum \{[^}]*font-weight: 650/);
    assert.match(fundCss, /\.acct-meter \{[^}]*height: 5px/);
    assert.match(fundCss, /\.acct-pair \{[^}]*display: inline-flex/);
    assert.ok(!fundCss.includes(".save-acct-line"), "la regla de la frase suelta se fue con ella");
    assert.ok(!fundCss.includes(".save-panel-line {"), "la regla de la línea del panel se fue con ella");
  });

  it("cada tema firma su mano: Tron ilumina el medallón, Cyberpunk aplana", () => {
    assert.match(tronCss, /\[data-theme="tron"\] \.save-accounts \.look-mark \{[^}]*box-shadow: 0 0 12px/);
    assert.match(cyberCss, /html\[data-theme="cyberpunk"\] \.save-accounts > \.save-account \{\s*background: #14100b; box-shadow: none;/);
    assert.match(cyberCss, /html\[data-theme="cyberpunk"\] \.save-accounts \.look-mark \{[^}]*border-radius: 2px/);
  });
});
