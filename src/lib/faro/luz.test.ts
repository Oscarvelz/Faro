import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { formatMoneyShort } from "./money.ts";

// LA LUZ DE NATURALEZA Y SU EXPLICACIÓN (Oscar, chat de ventanas, 2026-11-16).
// Su veredicto con fotos: al tocar la luz, la explicación salía recortada por
// la propia tarjeta de la bolsa — «esas ventanas no pueden mostrarse en
// ninguna de estas ventanas». La auditoría lo probó con medidas: la línea
// necesita 240px y la tarjeta ofrece ~108, con la banda en overflow:hidden.
// Estas cercas pinchan la cura para que ninguna oleada la deshaga:
//   1. la explicación vive en la capa superior (portal al cuerpo), jamás
//      dentro de su anfitrión;
//   2. habla con la letra de lectura de la casa, no con la cara del nombre;
//   3. el signo queda en 6px (su orden: «por lo menos un 20%» menos que los 8px
//      que aún leían como botones) y su blanco de toque crece por halo;
//   5. la palabra «pila» no existe en los textos del modelo: su veredicto del
//      mismo día — «pila no pertenece y es confuso» — y la barrida la quitó de
//      las ocho claves donde vivía, en los dos idiomas;
//   4. nombre + luz son una sola unidad a todo ancho de tarjeta (cqi), sin el
//      escalón @container que dejaba caer la luz en el ancho corriente.

const here = path.dirname(new URL(import.meta.url).pathname);
const read = (rel: string) => fs.readFileSync(path.join(here, rel), "utf8");
const tsx = read("../../components/faro/fund-light.tsx");
const fundCss = read("../../components/faro/fund.css");
const styles = read("../../styles.css");
const screens = read("../../components/faro/screens.tsx");

const rule = (css: string, selector: string) => {
  const i = css.indexOf(selector);
  assert.ok(i >= 0, `falta la regla ${selector}`);
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
};

describe("la luz de naturaleza (ventanas, 2026-11-16)", () => {
  it("su explicación nace en la capa superior, nunca dentro de la tarjeta", () => {
    assert.match(tsx, /createPortal\(/);
    assert.match(tsx, /document\.body/);
    const portalAt = tsx.indexOf("createPortal(");
    const popAt = tsx.indexOf('className="fund-light-pop"');
    assert.ok(popAt > portalAt, "el pop debe rendirse dentro del portal");
    // Anclada y apretada a la ventana desde su luz; si la página se mueve, se cierra.
    assert.match(tsx, /getBoundingClientRect\(\)/);
    assert.match(tsx, /addEventListener\("scroll"/);
    assert.match(tsx, /addEventListener\("resize"/);
  });

  it("el pop es fijo, de la capa alta y con la letra de lectura de la casa", () => {
    const pop = rule(fundCss, ".fund-light-pop");
    assert.match(pop, /position:\s*fixed/);
    assert.match(pop, /font-family:\s*var\(--font-sans\)/);
    assert.match(pop, /font-weight:\s*400/);
    assert.match(pop, /max-width:\s*min\(240px/);
    assert.ok(!/position:\s*absolute/.test(pop), "el pop no vuelve a vivir dentro de su anfitrión");
  });

  it("el signo queda en 6px y su toque crece por halo, no por tamaño", () => {
    const light = rule(fundCss, ".fund-light {");
    assert.match(light, /width:\s*6px/);
    assert.match(light, /height:\s*6px/);
    const halo = rule(fundCss, ".fund-light::after");
    assert.match(halo, /inset:\s*-11px/);
  });

  it("«pila» no pertenece: ningún texto del modelo la nombra, en ningún idioma", () => {
    const i18n = read("../../lib/faro/i18n.ts");
    assert.ok(!/\bpila\b|\bpile\b/i.test(i18n), "la palabra desterrada no vuelve a los textos");
    assert.match(i18n, /"fund\.light\.aparte": "Dinero aparte: se acumula solo, por separado\."/);
    assert.match(i18n, /"fund\.light\.aparte": "Money set apart: it builds up on its own, kept separate\."/);
  });

  it("la tarjeta es un vistazo: cifra corta con K y la cajita del porcentaje en miniatura", () => {
    // La cifra exacta bajo mil; la corta de mil en adelante (su idea, 2026-11-16).
    assert.equal(formatMoneyShort(0, "NIO", "es"), "C$0.00");
    assert.equal(formatMoneyShort(85050, "NIO", "es"), "C$850.50");
    assert.equal(formatMoneyShort(99999, "NIO", "es"), "C$999.99");
    assert.equal(formatMoneyShort(100000, "NIO", "es"), "C$1K");
    assert.equal(formatMoneyShort(165000, "NIO", "es"), "C$1.65K");
    assert.equal(formatMoneyShort(105000, "NIO", "es"), "C$1.05K");
    assert.equal(formatMoneyShort(630000, "NIO", "es"), "C$6.3K");
    assert.equal(formatMoneyShort(99999999, "NIO", "es"), "C$1M");
    assert.equal(formatMoneyShort(125000000, "NIO", "es"), "C$1.25M");
    assert.equal(formatMoneyShort(165000, "USD", "en"), "$1.65K");
    assert.equal(formatMoneyShort(-165000, "NIO", "es"), "-C$1.65K");
    // La banda retrata la cifra corta y el porcentaje vive junto a ella, en su
    // cajita miniatura — la pastilla de fila entera no vuelve (su veredicto).
    assert.match(screens, /fmtShort\(s\.keptMinor\)/);
    assert.match(screens, /fmtShort\(s\.pledgedMinor\)/);
    assert.match(screens, /className="seg-pct"/);
    assert.ok(!screens.includes("<small>{pct}%</small>"), "la pastilla de fila entera no vuelve");
    const pct = rule(styles, ".save-seg .seg-pct {");
    assert.match(pct, /background:/, "la cajita miniatura tiene fondo");
    assert.match(pct, /box-shadow: inset/, "la cajita miniatura tiene filo");
    assert.match(pct, /padding: 1px 5px/, "la cajita abraza al número, no ocupa fila");
  });

  it("la K se explica: (?) en la banda y su tema en el manual, con ejemplos", () => {
    // Su orden (2026-11-16): un (?) pequeño con la ayuda y la referencia al manual.
    assert.match(screens, /<Hint topic="cifra-corta" \/>/);
    const topics = read("../../lib/manual/topics.ts");
    const topic = topics.slice(topics.indexOf('id: "cifra-corta"'), topics.indexOf('id: "cifra-corta"') + 1600);
    assert.match(topic, /depth: "manual"/, "el tema gana su «Más en el manual →»");
    assert.match(topic, /C\$1\.65K son C\$1,650/, "la burbuja trae su ejemplo");
    assert.match(topic, /C\$1\.65K is C\$1,650/, "the bubble carries its example");
    assert.match(topic, /C\$1\.25M/, "el manual llega hasta el millón");
    assert.ok(!/\bpila\b|\bpile\b/i.test(topic), "ni el tema nuevo usa la palabra desterrada");
  });

  it("AUDIT-2: ninguna luz vive como botón dentro de otro botón, en ninguna superficie", () => {
    // La cabecera de la lista de migración es un <button>: su luz va como span,
    // como en la banda — el defecto de la primera auditoría no reaparece al lado.
    assert.match(screens, /save-migrate-head[\s\S]{0,240}<FundLight cls="sin-declarar" asSpan \/>/);
  });

  it("AUDIT-2: el desglose de Apartado del mes declara su convención sobre lo sin declarar", () => {
    const i18n = read("../../lib/faro/i18n.ts");
    assert.match(i18n, /"vault\.aside\.aparte\.what": "[^"]*aún no declaras[^"]*"/);
    assert.match(i18n, /"vault\.aside\.aparte\.what": "[^"]*haven't declared yet[^"]*"/);
  });

  it("AUDIT-2: los porcentajes de Ajustes y de la tarjeta confirman dentro de 0–100", () => {
    const clamps = screens.match(/Math\.min\(100, Math\.max\(0, Number\(e\.target\.value\) \|\| 0\)\)/g) ?? [];
    assert.ok(clamps.length >= 4, "meta y semáforo confirman con abrazadera en todos sus asientos");
    assert.ok(!/savingsGoalPct: Number\(e\.target\.value\)/.test(screens), "ningún asiento de la meta confirma sin abrazadera");
  });

  it("AUDIT-2: el texto de las superficies de ahorro vive en i18n, no en ternarios de idioma", () => {
    assert.ok(!screens.includes("Retirement is hidden in Structure"), "la nota de Retiro oculto sale de i18n");
    assert.ok(!screens.includes("Restore default accounts"), "la restauración de la pieza de fábrica sale de i18n");
    assert.ok(!screens.includes("Restaurar cuentas de fábrica"), "la restauración de la pieza de fábrica sale de i18n");
    assert.match(screens, /t\("save\.retiroHidden"\)/);
    assert.match(screens, /t\("save\.restore\.body"\)/);
    assert.match(screens, /t\("save\.goalTerm"\)/);
  });

  it("nombre + luz: una unidad que no se parte a ningún ancho de tarjeta", () => {
    const strong = rule(styles, ".save-seg > strong { white-space: nowrap;");
    assert.match(strong, /font-size:\s*clamp\(\.62rem, 10\.5cqi, \.95rem\)/);
    assert.ok(
      !/strong\[data-long\]\s*\{\s*font-size/.test(styles),
      "el escalón [data-long] ≤90px no vuelve: dejaba caer la luz en el ancho corriente",
    );
  });
});
