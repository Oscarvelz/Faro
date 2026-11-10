// 1.3.189 — Cyberpunk: el registro del tema y sus cercas de legibilidad.
// El tema es piel solamente: estos tests cercan (a) que quedó registrado como
// tema de noche con nombre en ambos idiomas, (b) que sus tokens escritos en
// cyberpunk.css son los de la especificación y cumplen contraste WCAG sobre
// sus propios fondos, (c) que cyberize() enciende las categorías en neón
// SIN tocar la salida de tronize() (Tron es intocable), y (d) que ningún
// archivo del tema nuevo menciona a Tron: no comparten bloque de tokens.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { cyberize, tronize, PALETTE, SAVINGS_PURPLE } from "./colors.ts";
import { translate } from "./i18n.ts";
import { contrast } from "./palette.ts";
import { DAY_THEMES, NIGHT_THEMES, THEME_IDS } from "./types.ts";

const css = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const tronCss = fs.readFileSync(new URL("../../components/faro/tron.css", import.meta.url), "utf8");

describe("cyberpunk: registro", () => {
  it("es un tema conocido y de noche, no de día", () => {
    assert.ok(THEME_IDS.includes("cyberpunk"));
    assert.ok(NIGHT_THEMES.includes("cyberpunk"));
    assert.ok(!DAY_THEMES.includes("cyberpunk"));
  });
  it("tiene nombre en ambos idiomas y es su propio nombre (como Tron)", () => {
    assert.equal(translate("es", "theme.cyberpunk"), "Cyberpunk");
    assert.equal(translate("en", "theme.cyberpunk"), "Cyberpunk");
  });
  it("todo tema registrado tiene nombre en ambos idiomas", () => {
    for (const id of THEME_IDS) {
      assert.notEqual(translate("es", `theme.${id}`), `theme.${id}`, `falta el nombre ES de ${id}`);
      assert.notEqual(translate("en", `theme.${id}`), `theme.${id}`, `falta el nombre EN de ${id}`);
    }
  });
});

describe("cyberpunk: tokens y contraste (la legibilidad es sagrada)", () => {
  it("la hoja declara la identidad de la especificación", () => {
    // 1.3.197: la identidad pasa a la paleta cálida de la investigación —
    // fondo cálido #0b0a08 y panel #161310 (antes el negro azulado
    // #08080d/#111119 de la 189, que lo hacía leer Tron×Ion).
    assert.match(css, /--bg: #0b0a08/);
    assert.match(css, /--surface: #161310/);
    assert.match(css, /--accent: #fcee0a/);
    assert.match(css, /--cp-cyan: #00f0ff/);
    assert.match(css, /--cp-magenta: #ff2a6d/);
    assert.match(css, /--bad: #ff003c/);
    assert.match(css, /--cp-data: #00f0ff/);
  });
  it("el texto cumple sobre los fondos del tema", () => {
    const surface = "#161310", bg = "#0b0a08";
    assert.ok(contrast("#f2eee3", surface) >= 12, "fg sobre surface");
    assert.ok(contrast("#f2eee3", bg) >= 12, "fg sobre bg (la cifra héroe)");
    assert.ok(contrast("#aca294", surface) >= 7, "muted sobre surface");
    assert.ok(contrast("#968b78", surface) >= 4.5, "faint sobre surface");
    assert.ok(contrast("#fcee0a", surface) >= 12, "el amarillo como texto");
    assert.ok(contrast("#0b0a08", "#fcee0a") >= 12, "la tinta sobre el amarillo");
    assert.ok(contrast("#00f0ff", surface) >= 10, "cian (dato) sobre surface");
    assert.ok(contrast("#ff2a6d", surface) >= 4.5, "magenta (alertas) sobre surface");
    assert.ok(contrast("#00e67a", surface) >= 10, "good sobre surface");
    assert.ok(contrast("#ff7a00", surface) >= 7, "warn sobre surface");
    assert.ok(contrast("#ff003c", surface) >= 4.5, "rojo peligro sobre surface");
    assert.ok(contrast("#0b0a08", "#ff003c") >= 4.5, "la tinta sobre el rojo (rellenos de peligro)");
  });
});

describe("cyberpunk: las categorías se encienden sin tocar a Tron", () => {
  it("cyberize difiere del encendido de Tron en toda la paleta", () => {
    let differ = 0;
    for (const hex of PALETTE) {
      const neon = cyberize(hex);
      assert.notEqual(neon, hex, `${hex} quedó apagado`);
      if (neon !== tronize(hex)) differ += 1;
    }
    assert.ok(differ >= 20, `solo ${differ} colores difieren del encendido Tron`);
  });
  it("cyberize re-voz cálida: la banda fría cae en ácido o violeta (1.3.197)", () => {
    // El matiz cálido se conserva; el frío se re-voz: un azul de la paleta
    // (#079ed9) sale violeta y un turquesa (#52d7c1) sale verde ácido —
    // ningún color de categoría queda en la banda cian/azul (185–255°).
    const hueOf = (out: string): number => {
      const m = /rgb\((\d+) (\d+) (\d+)\)/.exec(out);
      assert.ok(m, `salida no rgb: ${out}`);
      const [r, g, b] = [+m[1] / 255, +m[2] / 255, +m[3] / 255];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d < 0.03) return -2;
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return Math.round((h * 60 + 360) % 360);
    };
    const blue = hueOf(cyberize("#079ed9"));
    assert.ok(blue >= 255 && blue <= 330, `el azul debía salir violeta, salió ${blue}`);
    const teal = hueOf(cyberize("#52d7c1"));
    assert.ok(teal >= 130 && teal < 185, `el turquesa debía salir ácido, salió ${teal}`);
    const hand = cyberize("#079ed9");
    assert.match(hand, /^rgb\(/, "el color a mano de paleta sale rgb");
    assert.match(cyberize("#1e6fd9"), /^hsl\(2[6-8]\d 100% 70%\)$/, "un azul a mano sale violeta en hsl");
  });
  it("Ahorros conserva su púrpura, en neón violeta propio", () => {
    assert.equal(cyberize(SAVINGS_PURPLE), "#cd7bff");
    assert.equal(tronize(SAVINGS_PURPLE), "#ba92fd", "el neón de Ahorros en Tron no se movió");
  });
  it("un color a mano conserva su matiz en hsl de neón", () => {
    assert.match(cyberize("#b7d4c4"), /^hsl\(147 100% 60%\)$/);
    assert.equal(cyberize("no-es-color"), "no-es-color");
  });
  it("ninguna hoja toca el territorio de la otra", () => {
    assert.ok(!css.includes('data-theme="tron"'), "cyberpunk.css no debe nombrar a Tron");
    assert.ok(!tronCss.includes("cyberpunk"), "tron.css no debe nombrar a Cyberpunk");
  });
});

describe("cyberpunk: el glitch (1.3.195) — naves sin cristal, tira contenida", () => {
  it("el cristal ya no pinta en las naves (ni la píldora ni el glide)", () => {
    assert.match(css, /:is\(\.dock-glass, \.dock-glide\) \{ display: none; \}/);
  });
  it("la ceremonia de las naves existe: ráfaga + tic en reposo, con los tokens", () => {
    assert.ok(css.includes("@keyframes cp-ship-burst"), "falta la ráfaga de las naves");
    assert.ok(css.includes("@keyframes cp-ship-idle"), "falta el tic en reposo de las naves");
    assert.ok(css.includes("cp-ship-burst .42s steps(1) 1, cp-ship-idle 7s steps(1) 1.4s infinite"), "la nave viva no lleva la ceremonia completa");
    assert.ok(css.includes("var(--cp-magenta)") && css.includes("var(--cp-cyan)"), "el glitch debe hablar con los tokens del tema");
  });
  it("la familia varía: al menos ocho miembros propios, no una sola copia", () => {
    const names = new Set([...css.matchAll(/@keyframes (cp-[a-z-]+)/g)].map((m) => m[1]));
    for (const n of ["cp-ship-burst", "cp-tab-burst", "cp-pair-burst", "cp-vault-burst", "cp-btn-press", "cp-btn-soft", "cp-danger-press", "cp-ask-press", "cp-icon-twitch", "cp-chip-burst", "cp-lens-flicker", "cp-pick-burst"]) {
      assert.ok(names.has(n), `falta el miembro de la familia: ${n}`);
    }
    assert.ok(names.size >= 8, `solo ${names.size} keyframes propios`);
  });
  it("la tira contiene a sus rectángulos: pista a 6px y luz solo hacia adentro", () => {
    assert.match(css, /\.seg\.is-follow:not\(\.is-pair\) \{\s*border-radius: 8px; padding: 6px;/, "la pista no tomó su esquina y su margen nuevos");
    assert.ok(!css.includes("0 0 14px rgb(252 238 10 / .28)"), "el brillo que se salía de la pista (14px sobre 4px) sigue vivo");
    // 1.3.197: el anillo interior de la 195 (inset 0 0 0 1.5px, tinte amarillo)
    // deja paso a la ley nueva — el amarillo es superficie plana con tinta
    // negra; la cerca ahora exige ese relleno plano en la pestaña viva.
    assert.match(css, /\.seg button\[aria-current="page"\] \{\s*background: var\(--accent\); color: var\(--accent-fg\);/, "la pestaña viva no lleva su relleno amarillo plano");
  });
  it("ningún keyframe de presión lleva clip-path (el corte se come el clic)", () => {
    // Lección medida en el banco: un clip-path en :active encoge el área de
    // toque a mitad de presión, el punto cae fuera de la rebanada y el
    // navegador nunca entrega el clic — el engranaje de Ajustes dejó de
    // responder bajo este tema. Los cortes viven solo en las ceremonias de
    // selección (naves y pestañas), nunca en las presiones.
    for (const n of ["cp-btn-press", "cp-danger-press", "cp-ask-press", "cp-icon-twitch", "cp-chip-burst", "cp-store-press"]) {
      const at = css.indexOf(`@keyframes ${n}`);
      assert.ok(at >= 0, `falta ${n}`);
      const block = css.slice(at, css.indexOf("\n}", at));
      assert.ok(!block.includes("clip-path"), `${n} no debe recortar: se comería el clic`);
    }
  });
  it("la píldora de la tira es un sólido amarillo plano (1.3.197)", () => {
    // 1.3.195 la hizo una celda encendida con tinte (linear-gradient .17/.07);
    // la 197 la convierte en superficie plana #fcee0a, sin gradiente ni brillo.
    assert.match(css, /\.seg\.is-follow \.seg-pill \{\s*background: #fcee0a;/);
  });
  it("todo el movimiento vive tras la guarda de no-preferencia y muere con reduce", () => {
    assert.ok(css.includes("@media (prefers-reduced-motion: no-preference)"), "falta la guarda de movimiento");
    const aplicaciones = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    assert.ok(aplicaciones.includes("cp-ship-burst") && aplicaciones.includes("cp-pick-burst"), "las aplicaciones del glitch deben vivir dentro de la guarda");
    const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.ok(reduce.includes(".seg button") && reduce.includes("animation: none"), "el bloque reduce no apaga la familia");
  });
});

describe("cyberpunk: la identidad cálida (1.3.197)", () => {
  it("el cian queda degradado a dato: ningún literal cian fuera de los tokens y la ceremonia", () => {
    // Se retiran las definiciones de los tokens de dato y TODAS las
    // referencias var(--cp-cyan)/var(--cp-data) (la ceremonia del glitch y
    // las micro-etiquetas de dato hablan por tokens); lo que quede no puede
    // contener el literal cian en ninguna forma: ni tinte, ni brillo, ni fondo.
    const resto = css
      .replace(/--cp-cyan: #00f0ff; ?/g, "")
      .replace(/--cp-data: #00f0ff; ?/g, "")
      .replace(/var\(--cp-cyan\)/g, "")
      .replace(/var\(--cp-data\)/g, "");
    assert.ok(!resto.includes("#00f0ff"), "queda un literal #00f0ff fuera de los tokens");
    assert.ok(!resto.includes("0 240 255"), "queda un rgb(0 240 255) fuera de los tokens");
    assert.ok(!resto.includes("#4deaff"), "queda el cian claro de las cifras de la 189");
  });
  it("el cristal y la luz de fondo murieron: ni sheen holográfico ni estela en la loseta", () => {
    assert.ok(!css.includes("cp-sheen"), "el sheen de cristal de la 189 sigue vivo");
    assert.ok(!css.includes("cp-trail"), "la estela cian de la loseta sigue viva");
    assert.ok(!css.includes("radial-gradient(55% 20%"), "el lavado cian del mundo sigue vivo");
  });
  it("las rayas de peligro marcan los umbrales: cabecera y loseta", () => {
    assert.ok(css.includes("repeating-linear-gradient(-45deg, #fcee0a 0 7px, #0b0a08 7px 14px)"), "falta la franja de peligro");
  });
  it("Rajdhani viene en el paquete, jamás de la red", () => {
    assert.ok(css.includes("@font-face"), "falta la cara auto-alojada");
    assert.ok(css.includes("rajdhani-latin-600.woff2"), "falta el archivo de la fuente en src/assets/fonts");
    assert.ok(!css.includes("fonts.googleapis"), "la fuente no puede venir de la red");
    assert.ok(css.includes("--cp-display:"), "falta el token de la voz condensada");
  });
  it("la nave viva es una celda amarilla plana con tinta negra", () => {
    assert.match(css, /:is\(\.dock, \.rail, \.side-dock\) \.nav-btn\[aria-current="page"\] \{\s*background: var\(--accent\); color: var\(--accent-fg\);/);
  });
  it("las voces del dinero: verde entra, naranja sale, rojo se debe", () => {
    assert.match(css, /\.amt-in \{ color: var\(--cp-green\); \}/);
    assert.match(css, /\.amt-out \{ color: var\(--cp-orange\); \}/);
    assert.match(css, /\.lens\.is-debt \{ box-shadow: inset 0 -2px 0 var\(--cp-red\); \}/);
  });
});

describe("cyberpunk: los lentes guardan su color y Ahorros se suma al glitch (1.3.198)", () => {
  it("el lente vivo lleva SU color de relleno, no el amarillo general", () => {
    // Veredicto de Oscar sobre la 197 en vivo: «instead of the yellow,
    // these chips use their respective color of the chips».
    assert.match(css, /\.lens\.is-have\[aria-pressed="true"\] \{ background: var\(--cp-green\); \}/, "Tengo vivo no lleva su verde");
    assert.match(css, /\.lens\.is-spend\[aria-pressed="true"\] \{ background: var\(--cp-orange\); \}/, "Gastaré vivo no lleva su naranja");
    assert.match(css, /\.lens\.is-debt\[aria-pressed="true"\] \{ background: var\(--cp-red\); \}/, "Pagos vivo no lleva su rojo");
    assert.ok(!/\.lenses \.lens\[aria-pressed="true"\] \{\s*background: var\(--accent\);/.test(css), "el relleno amarillo general de la 197 sigue vivo");
  });
  it("la tinta sobre cada relleno es negra por medición (el blanco cálido fracasa en los tres)", () => {
    assert.ok(contrast("#0b0a08", "#00e67a") >= 4.5, "tinta sobre verde");
    assert.ok(contrast("#0b0a08", "#ff7a00") >= 4.5, "tinta sobre naranja");
    assert.ok(contrast("#0b0a08", "#ff003c") >= 4.5, "tinta sobre rojo");
    assert.ok(contrast("#f2eee3", "#00e67a") < 4.5, "el blanco cálido debía fracasar sobre verde");
    assert.ok(contrast("#f2eee3", "#ff7a00") < 4.5, "el blanco cálido debía fracasar sobre naranja");
    assert.ok(contrast("#f2eee3", "#ff003c") < 4.5, "el blanco cálido debía fracasar sobre rojo");
    // Los controles que viajan sobre el lente lleno siguen a la tinta:
    // el disco de la esquina con su línea clave negra y el (?) en tinta.
    assert.match(css, /\.lens-wrap:has\(\.lens\[aria-pressed="true"\]\) \.lens-corner \{ box-shadow: 0 0 0 2px var\(--accent-fg\); \}/, "el disco no lleva su línea clave");
    assert.match(css, /\.lens-wrap:has\(\.lens\[aria-pressed="true"\]\) > \.hint\.is-lens \.ftip-btn \{ color: var\(--accent-fg\); \}/, "el (?) no toma la tinta del lente");
  });
  it("Pagos desgarra cian contra negro: su magenta es invisible sobre su rojo", () => {
    // La franja magenta sobre el relleno rojo mide 1.09:1 — el mismo
    // matiz a la misma luminancia: no se lee. Los otros dos lentes
    // conservan el par magenta/cian de la familia, intacto.
    assert.ok(contrast("#ff2a6d", "#ff003c") < 1.2, "la premisa medida: magenta sobre rojo no se lee");
    assert.ok(css.includes("@keyframes cp-lens-flicker-debt"), "falta el miembro de Pagos");
    assert.match(css, /\.lens\.is-debt\[aria-pressed="true"\] \.lens-kicker \{ animation: cp-lens-flicker-debt/, "Pagos no usa su desgarro propio");
    assert.ok(css.includes("@keyframes cp-lens-flicker"), "el flicker de la familia sigue para Tengo y Gastaré");
  });
  it("las tres naves de Ahorros tienen su ceremonia: marco, nombre y banda — nunca la cifra", () => {
    for (const n of ["cp-save-frame", "cp-save-burst", "cp-save-tear", "cp-save-idle", "cp-save-idle-band"]) {
      assert.ok(css.includes(`@keyframes ${n}`), `falta el miembro de Ahorros: ${n}`);
    }
    const aplicaciones = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    assert.ok(aplicaciones.includes(".save-seg[aria-pressed=\"true\"] { animation: cp-save-frame .46s steps(1) 1; }"), "el marco de la nave no toma al tocar");
    assert.ok(aplicaciones.includes("cp-save-burst .46s steps(1) 1, cp-save-idle 11s steps(1) 1.6s infinite"), "el nombre no lleva ráfaga + tic raro");
    assert.ok(aplicaciones.includes("cp-save-tear .46s steps(1) 1, cp-save-idle-band 11s steps(1) 1.6s infinite"), "la banda no lleva desgarro + tic raro");
    assert.ok(!/\.save-seg[^\n{]*\.num/.test(css), "ninguna regla del tema puede apuntar a la cifra de Ahorros");
  });
  it("el marco de Ahorros no recorta ni transforma el botón (la lección de la 195)", () => {
    const at = css.indexOf("@keyframes cp-save-frame");
    const block = css.slice(at, css.indexOf("\n}", at));
    assert.ok(!block.includes("clip-path"), "cp-save-frame no debe recortar: el botón es el blanco del toque");
    assert.ok(!block.includes("transform"), "cp-save-frame no debe transformar: la escala de presión de la casa se queda");
  });
});
