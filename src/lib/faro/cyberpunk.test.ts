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
    // 1.3.199: la regla inferior del lente ya no se escribe por clase —
    // vive en la regla base del lente, teñida por la variable --lens que
    // cada clase declara (Pagos declara el rojo). La cerca sigue al
    // mecanismo nuevo; la voz medida es la misma.
    assert.match(css, /\.lens\.is-debt \{\s*--lens: var\(--cp-red\);/, "Pagos no declara su voz roja");
    assert.ok(css.includes("color-mix(in oklab, var(--cp-red) var(--lw1), transparent) 38%"), "el lavado en reposo de Pagos no habla con su voz");
    assert.ok(css.includes("inset 0 -2px 0 var(--cp-red)"), "la regla inferior de Pagos no lleva su rojo");
  });
});

describe("cyberpunk: la selección a la manera de Cadence (1.3.199) y Ahorros en el glitch (1.3.198)", () => {
  it("el bloque de color murió: ningún lente vivo lleva relleno plano", () => {
    // Veredicto de Oscar sobre la 198 en vivo: «the color block is not
    // the right way to proceed» — la selección se lee en oscuro, con el
    // color como estructura (marco, lavado, barra), nunca como sólido.
    for (const cls of ["is-have", "is-spend", "is-debt"]) {
      assert.ok(!new RegExp(`\\.lens\\.${cls}\\[aria-pressed="true"\\] \\{ background: var\\(--cp-`).test(css), `el relleno plano de ${cls} (1.3.198) sigue vivo`);
    }
    assert.ok(!css.includes('.lens[aria-pressed="true"] :is(.lens-kicker, .lens-value, .lens-note) { color: var(--accent-fg); }'), "la tinta negra del relleno sigue viva");
    // Los arreglos de la era del relleno se retiran con él: el disco de
    // la esquina y el (?) vuelven a su trato en reposo sobre el vivo.
    assert.ok(!css.includes('.lens-wrap:has(.lens[aria-pressed="true"]) .lens-corner { box-shadow: 0 0 0 2px var(--accent-fg); }'), "la línea clave negra del disco sigue viva");
    assert.ok(!css.includes('.lens-wrap:has(.lens[aria-pressed="true"]) > .hint.is-lens .ftip-btn { color: var(--accent-fg); }'), "el (?) sigue tomando la tinta del relleno");
  });
  it("el lente vivo se selecciona en oscuro: marco pleno, barra y lavado de su voz", () => {
    assert.match(css, /\.lenses \.lens\[aria-pressed="true"\] \{\s*background: linear-gradient\(180deg, transparent 16%, color-mix\(in oklab, var\(--lens\) var\(--lv1\), transparent\) 38%/, "el vivo no lleva el lavado fuerte de su voz");
    assert.ok(css.includes("box-shadow: inset 0 0 0 1px var(--lens), inset 0 -3px 0 var(--lens);"), "el vivo no lleva marco pleno ni barra de 3px en su voz");
    // En reposo el marco es la misma voz al 38% (la dosis de Cadence) y
    // la regla inferior es la de siempre, a 2px — escrito por lente,
    // porque el bloque nocturno compartido se re-basa por clase.
    for (const tok of ["--cp-green", "--cp-orange", "--cp-red"]) {
      assert.ok(css.includes(`box-shadow: inset 0 0 0 1px color-mix(in oklab, var(${tok}) 38%, transparent), inset 0 -2px 0 var(${tok});`), `el reposo no lleva marco al 38% + regla de 2px en ${tok}`);
    }
    // La cifra conserva la tinta cálida y el rótulo su voz en ambos estados.
    assert.match(css, /\.lens \.lens-value \{ color: #f2eee3; \}/);
    assert.match(css, /\.lens\.is-debt \.lens-kicker \{ color: var\(--cp-red\); \}/);
  });
  it("el lavado nunca come el rótulo y la cifra cumple sobre el lavado (medido)", () => {
    // Modelo del fondo efectivo: el lavado es color-mix(voz p%, transparente)
    // — la voz con alfa p — compuesto sobre --cp-panel (su brillo cálido
    // sobre el gradiente #171310 → #100d0a). El lavado vive en el cuerpo
    // (transparente hasta el 16%, pico al 38%, cola al 64%, fuera al 90%):
    // el rótulo queda sobre panel casi limpio y la cifra, con contraste
    // de sobra, es la que se sienta en el color. Los porcentajes se LEEN
    // de la propia hoja: si el diseño cambia los valores, la cerca los
    // vuelve a medir.
    const rgbOf = (h: string): number[] => [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
    const hexOf = (rgb: number[]): string => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
    const PANEL_T = rgbOf("171310"), PANEL_B = rgbOf("100d0a"), SHEEN = [255, 240, 200];
    const washA = (p1: number, p2: number, y: number): number => {
      const yp = y * 100;
      if (yp <= 16) return 0;
      if (yp <= 38) return (p1 * (yp - 16)) / 22;
      if (yp <= 64) return p1 + ((p2 - p1) * (yp - 38)) / 26;
      if (yp <= 90) return p2 * (1 - (yp - 64) / 26);
      return 0;
    };
    const effBg = (C: number[], p1: number, p2: number, y: number): string => {
      const sa = y * 100 < 36 ? 0.05 * (1 - (y * 100) / 36) : 0;
      const wa = washA(p1, p2, y);
      const under = PANEL_T.map((v, i) => sa * SHEEN[i] + (1 - sa) * (v + (PANEL_B[i] - v) * y));
      return hexOf(under.map((v, i) => wa * C[i] + (1 - wa) * v));
    };
    const FG = "#f2eee3", MUTED = "#aca294";
    const lenses: Array<[string, string, string]> = [["is-have", "--cp-green", "#00e67a"], ["is-spend", "--cp-orange", "#ff7a00"], ["is-debt", "--cp-red", "#ff003c"]];
    for (const [cls, token, voice] of lenses) {
      const m = new RegExp(`\\.lens\\.${cls} \\{\\s*--lens: var\\(${token.replace("-", "\\-")}\\); --lw1: ([\\d.]+)%; --lw2: ([\\d.]+)%; --lv1: ([\\d.]+)%; --lv2: ([\\d.]+)%;`).exec(css);
      assert.ok(m, `faltan las variables del lente ${cls}`);
      const [lw1, lw2, lv1, lv2] = m.slice(1).map((s) => Number(s) / 100);
      const C = rgbOf(voice.slice(1));
      for (const [state, p1, p2] of [["reposo", lw1, lw2], ["vivo", lv1, lv2]] as Array<[string, number, number]>) {
        assert.ok(contrast(FG, effBg(C, p1, p2, 0.38)) >= 4.5, `${cls} ${state}: la cifra sobre el pico del lavado`);
        assert.ok(contrast(FG, effBg(C, p1, p2, 0.5)) >= 4.5, `${cls} ${state}: la cifra sobre el lavado`);
        assert.ok(contrast(MUTED, effBg(C, p1, p2, 0.82)) >= 4.5, `${cls} ${state}: la nota sobre la cola del lavado`);
        // El rótulo, en el centro de su banda (y=0.19): las voces con
        // margen (verde, naranja) quedan ≥4.5 aún lavadas; la voz justa
        // (el rojo, cuyo par sobre panel plano ya cerca la 197: 4.69) se
        // cerca en relativo — el lavado no puede costarle más de 0.15
        // frente al mismo punto sin lavar, porque su valor absoluto en
        // el render es propiedad del brillo del panel, no de este lavado.
        const con = contrast(voice, effBg(C, p1, p2, 0.19));
        const sin = contrast(voice, effBg(C, 0, 0, 0.19));
        if (cls === "is-debt") {
          assert.ok(con >= sin - 0.15, `${cls} ${state}: el lavado le costó al rótulo ${sin.toFixed(2)} → ${con.toFixed(2)}`);
        } else {
          assert.ok(con >= 4.5, `${cls} ${state}: el rótulo lavado cae a ${con.toFixed(2)}`);
        }
      }
      // Marco y barra vivos contra el suelo de la ciudad: estructura con
      // voz plena, muy por encima del mínimo de componente (3:1).
      assert.ok(contrast(voice, "#0b0a08") >= 4.5, `${cls}: su voz plena sobre el suelo`);
    }
  });
  it("Pagos vuelve al flicker de la familia: su variante era hija del relleno", () => {
    // La premisa de la 198 era cierta SOBRE EL RELLENO (magenta/rojo
    // 1.09:1); sobre el interior oscuro la franja magenta se lee de
    // nuevo (5.11:1 sobre el panel) y la variante deja de existir.
    assert.ok(contrast("#ff2a6d", "#ff003c") < 1.2, "la premisa vieja sigue siendo cierta sobre el relleno");
    assert.ok(contrast("#ff2a6d", "#161310") >= 4.5, "sobre el panel oscuro la magenta sí se lee");
    assert.ok(!css.includes("cp-lens-flicker-debt"), "la variante de Pagos sigue viva");
    assert.ok(css.includes("@keyframes cp-lens-flicker"), "el flicker de la familia sigue");
    assert.ok(!css.includes('.lens.is-debt[aria-pressed="true"] .lens-kicker { animation:'), "Pagos sigue apuntando a una ceremonia propia");
  });
  it("las marcas HUD: tics punteados en los lentes y en la banda de totales", () => {
    // La familia de micro-detalle de Cadence, en la gramática de Faro:
    // tics de 22×4 (3px sí, 3px no) en la esquina superior derecha de
    // cada lente, con la voz del propio lente, y en la banda de totales
    // con el amarillo señal. Nunca sobre filas de datos.
    assert.match(css, /\.lens::before \{\s*content: ""; position: absolute; top: 8px; right: 10px; width: 22px; height: 4px;/, "faltan los tics del lente");
    assert.ok(css.includes("background: repeating-linear-gradient(90deg, var(--lens, #fcee0a) 0 3px, transparent 3px 6px);"), "los tics del lente no hablan con su voz");
    assert.match(css, /\.desk-bar::after \{\s*content: ""; position: absolute; top: 7px; right: 12px; width: 18px; height: 4px;/, "faltan los tics de la banda");
    assert.ok(css.includes("background: repeating-linear-gradient(90deg, var(--accent) 0 3px, transparent 3px 6px);"), "los tics de la banda no llevan el amarillo señal");
  });
  it("el split vive en la marca: permanente, rebanado, solo en la palabra", () => {
    // Oscar señaló el CADENCE de Cadence: el split como pintura de
    // identidad, no solo ceremonia. En Faro vive SOLO en la palabra de
    // la marca — la ley de degradación del cian sobrevive porque el
    // split no es pintura constante en ningún otro sitio.
    assert.match(css, /\.brand-word \{\s*position: relative; display: inline-block;/, "la palabra no toma su postura para las rebanadas");
    assert.ok(css.includes("text-shadow: -2px 0 var(--cp-magenta), 2px 0 var(--cp-cyan);"), "la palabra no lleva el split permanente con los tokens");
    assert.ok(css.includes('.brand-word::before, [data-theme="cyberpunk"] .brand-word::after {\n  content: "Faro";'), "faltan las copias rebanadas de la marca");
    assert.ok(css.includes("@keyframes cp-brand-a") && css.includes("@keyframes cp-brand-b"), "faltan los desgarros de la marca");
    const aplicaciones = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    assert.ok(aplicaciones.includes(".brand-word::before { animation: cp-brand-a 5.5s steps(1) infinite; }"), "la rebanada A no vive tras la guarda");
    assert.ok(aplicaciones.includes(".brand-word::after { animation: cp-brand-b 5.5s steps(1) infinite; }"), "la rebanada B no vive tras la guarda");
    const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    assert.ok(reduce.includes(".brand-word::before") && reduce.includes("display: none"), "con movimiento reducido las rebanadas no se esconden");
    // La palabra se repinta plana: fuera el degradado de la lámpara.
    assert.match(css, /\.brand-word \{[^}]*-webkit-text-fill-color: currentColor; color: var\(--accent\);/, "la palabra no se repintó plana en amarillo");
  });
  it("la celda viva se contiene en ángulo: naves y píldora con el chaflán de la casa", () => {
    assert.match(css, /:is\(\.dock, \.rail, \.side-dock\) \.nav-btn\[aria-current="page"\] \{\s*background: var\(--accent\); color: var\(--accent-fg\);\s*box-shadow: none;\s*clip-path: var\(--cp-cut-sm\);/, "la nave viva no lleva el chaflán");
    assert.match(css, /\.seg\.is-follow \.seg-pill \{\s*background: #fcee0a;\s*box-shadow: none;\s*\/\* 1\.3\.199[\s\S]*?clip-path: var\(--cp-cut-sm\);/, "la píldora viva no lleva el chaflán");
  });
  it("la línea de emergencia marcha despacio y sin salto (solo la de la cabecera)", () => {
    // Veredicto de Oscar con la foto en primer plano de la franja:
    // «Make this emergency line slowly as an animation». El patrón se
    // repite cada 14px sobre su eje de −45°: un período horizontal
    // completo son 14px × √2, y desplazar el fondo exactamente eso en
    // un ciclo lineal de 16s cierra el bucle sin salto visible.
    assert.ok(css.includes("@keyframes cp-hazard-march"), "falta la marcha de la línea");
    assert.ok(css.includes("background-position: calc(-14px * 1.41421356) 0;"), "el ciclo no cierra en el período exacto de la franja");
    const aplicaciones = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    assert.ok(aplicaciones.includes(".top-chrome::before { animation: cp-hazard-march 16s linear infinite; }"), "la marcha no vive tras la guarda a 16s lineal");
    assert.equal((css.match(/animation: cp-hazard-march/g) || []).length, 1, "la marcha debe animar SOLO la franja de la cabecera (loseta y diálogos quedan estáticos)");
  });
  it("Ahorros lleva su lavado: la voz del bolsillo en el cuerpo de la nave", () => {
    assert.ok(css.includes("color-mix(in oklab, var(--seg, #fcee0a) 10%, transparent) 62%"), "la nave de Ahorros no lleva el lavado de su bolsillo");
    assert.match(css, /\.save-seg \{\s*background: linear-gradient\(180deg, transparent 30%,/, "el lavado de Ahorros no vive en su regla");
  });
  it("las tres naves de Ahorros tienen su ceremonia: marco, nombre y banda — nunca la cifra", () => {
    for (const n of ["cp-save-frame", "cp-save-burst", "cp-save-tear"]) {
      assert.ok(css.includes(`@keyframes ${n}`), `falta el miembro de Ahorros: ${n}`);
    }
    // 1.3.199 (veredicto de Oscar: «the glitch takes too long»): la
    // ráfaga baja de 460ms a 280ms y el tic en reposo de 11s se retira —
    // los valores de la 198 quedan superados por este veredicto.
    assert.ok(!css.includes("cp-save-idle"), "el tic en reposo de Ahorros debía retirarse en la 199");
    const mediaAt = css.indexOf("@media (prefers-reduced-motion: no-preference)");
    const aplicaciones = css.slice(mediaAt);
    assert.ok(aplicaciones.includes(".save-seg[aria-pressed=\"true\"] { animation: cp-save-frame .28s steps(1) 1; }"), "el marco de la nave no toma al tocar en 280ms");
    assert.ok(aplicaciones.includes("cp-save-burst .28s steps(1) 1;"), "el nombre no lleva su ráfaga de 280ms, sin tic");
    assert.ok(aplicaciones.includes("cp-save-tear .28s steps(1) 1;"), "la banda no lleva su desgarro de 280ms, sin tic");
    // 1.3.217 (orden de Oscar, fotos del escritorio): la cifra de la
    // tarjeta toma la CARA de la ciudad (Rajdhani) como las demás
    // cifras de la flota — eso supera la mitad tipográfica de esta
    // guardia. La mitad de la ceremonia queda intacta y es la que
    // aquí se fija: ninguna ANIMACIÓN apunta jamás a la cifra. La
    // ventana de aplicaciones se acota al bloque de la ceremonia
    // (del @media a la sección de la 1.3.207): la rebanada abierta
    // hasta el fin de la hoja alcanzaría el bloque tipográfico de
    // la 1.3.217, que vive al cierre y no anima nada.
    const ceremonia = css.slice(mediaAt, css.indexOf("1.3.207", mediaAt));
    assert.ok(!/\.save-seg[^\n{]*\.num/.test(ceremonia), "ninguna animación del tema puede apuntar a la cifra de Ahorros: la ceremonia sigue sin ella");
  });
  it("el marco de Ahorros no recorta ni transforma el botón (la lección de la 195)", () => {
    const at = css.indexOf("@keyframes cp-save-frame");
    const block = css.slice(at, css.indexOf("\n}", at));
    assert.ok(!block.includes("clip-path"), "cp-save-frame no debe recortar: el botón es el blanco del toque");
    assert.ok(!block.includes("transform"), "cp-save-frame no debe transformar: la escala de presión de la casa se queda");
  });
});

describe("cyberpunk: el icono sobre el bloque (1.3.200)", () => {
  // Veredicto de Oscar (2026-11-10 18:00 EST, su foto de la tira de Libros
  // sobre la 1.3.199 en vivo): «Some icons are swallowed up by the color
  // block. I like the color block here in these chips, but make the icon
  // appear again.» La hoja base pinta el icono de la pestaña viva de las
  // tiras is-follow con el color de ACENTO (styles.css: .seg-ico bajo
  // [aria-current] lleva var(--accent)); en esta ciudad la píldora ES el
  // acento, así que el icono salía amarillo sobre amarillo (1.00:1 medido
  // en el banco) y desaparecía, con su palabra en negro al lado.
  it("el icono de la pestaña viva lleva la tinta oscura de su rótulo", () => {
    assert.match(css, /html\[data-theme="cyberpunk"\] \.seg\.is-follow button\[aria-current="page"\] \.seg-ico \{\s*color: var\(--accent-fg\);\s*\}/,
      "el icono sobre el bloque debe llevar var(--accent-fg), la tinta del rótulo");
  });
  it("la cura es una sola regla de color: no toca el bloque ni pinta fondos", () => {
    const at = css.indexOf("1.3.200");
    const block = css.slice(at, css.indexOf("}", at));
    assert.ok(!block.includes("background"), "la regla de la 1.3.200 no debe repintar ningún fondo: el bloque se queda");
    assert.ok(css.includes(".seg.is-follow .seg-pill {\n  background: #fcee0a;"), "la píldora sigue siendo el bloque amarillo plano que Oscar aprobó");
  });
  it("la tinta sobre el bloque mide como el rótulo; el acento sobre el acento medía 1", () => {
    assert.ok(contrast("#0b0a08", "#fcee0a") >= 15, "la tinta oscura sobre el amarillo señal debe medir ≥15:1 (la del rótulo)");
    assert.equal(contrast("#fcee0a", "#fcee0a"), 1, "el defecto medido: acento sobre acento = 1.00:1, el icono tragado");
  });
});

describe("cyberpunk: las ventanas de los bolsillos (1.3.207)", () => {
  // Orden de Oscar (2026-11-10 20:11 EST, foto larga de Libros): las
  // ventanas DESPLEGADAS de los bolsillos (Emergencia / Retiro / Meta)
  // y el panel de Todas / Apartado llevaban el acabado nocturno
  // compartido — burbujas brillantes que no hablan cyberpunk. «Haz que
  // estas ventanas se vean únicas en el cyberpunk, manteniendo sus
  // colores, la misma paleta… Deja los otros temas como están.»
  const at = css.indexOf("1.3.207");
  const block = css.slice(at, css.indexOf("/* ---------- Stillness", at));
  it("el vestido existe y vive cercado a la bóveda de Libros en este tema", () => {
    assert.ok(at > 0, "la sección de la 1.3.207 debe existir en la hoja del tema");
    assert.ok(block.includes('.save-band.is-records :is(.save-ledger, .save-view, .save-more, .vault-lever)'), "los paneles se visten bajo .save-band.is-records");
    assert.ok(!/\.save-band(?!\.is-records)/.test(block.replace(/\.save-band\.is-records/g, "")), "ninguna regla de la 207 viste la banda fuera de Libros (el escritorio queda fuera)");
  });
  it("los paneles toman el fondo plano cálido y el radio de 2px de la ciudad", () => {
    assert.ok(block.includes("var(--cp-panel)"), "el fondo es el material plano del tema");
    assert.ok(block.includes("border-radius: 2px;"), "las burbujas de 24px dan paso al sistema de 2px");
  });
  it("el corte va solo donde ningún pin vive fuera de la caja", () => {
    assert.ok(block.includes(":is(.save-view, .save-flow) {\n  clip-path: var(--cp-cut);"), "Fondos/Cuentas/Proyectos y Apartado toman el chaflán");
    assert.ok(!/:is\([^)]*\.save-ledger[^)]*\)\s*\{\s*clip-path/.test(block) && !block.includes(".save-more {\n  clip-path") && !block.includes(".vault-lever {\n  clip-path"), "libro, cuentas y palanca NO se recortan: su pin vive en top:-8/-9px y un clip lo amputaría");
  });
  it("la palanca pierde el brillo: riel y bola planos en el color del bolsillo", () => {
    assert.ok(block.includes(".vault-lever-rail i::after { background: var(--seg, #d5e2ea); box-shadow: 0 0 10px color-mix(in oklab, var(--seg, #d5e2ea) 65%, transparent); }"), "el relleno del riel es plano, sin el degradado con luz blanca (1.3.219: su luz es una sombra suave en el color del bolsillo)");
    assert.ok(block.includes(".vault-lever-rail b {\n  background: var(--seg, #d5e2ea);"), "la bola radial brillante es un disco plano del mismo color");
  });
  it("ninguna regla de la 207 asigna un color de bolsillo: solo los lee", () => {
    assert.ok(!/--(seg|save|sav)\s*:/.test(block), "«manteniendo sus colores»: --seg/--save/--sav se leen con var(), jamás se reescriben");
  });
  it("los + de estas ventanas son el primario plano; el lápiz y el pliegue quedan como herramientas", () => {
    assert.ok(block.includes(".save-ledger-head .icon-btn:not(.ledger-fold):not(.is-pen)"), "el + del libro excluye el pliegue y el lápiz del kit");
    assert.ok(block.includes(".kit-btn.is-add {\n  background: var(--accent); color: var(--accent-fg);"), "el + es el bloque amarillo señal con glifo oscuro");
  });
  it("titulares y cifras de las ventanas hablan Rajdhani", () => {
    assert.ok(block.includes(".save-view .save-ledger-head strong {\n  font-family: var(--cp-display);"), "el titular de la vista deja la serif compartida");
    assert.ok(block.includes(".num {\n  font-family: var(--cp-display);"), "las cifras de los paneles toman la fuente de la ciudad");
  });
  it("el medidor del Apartado es un relleno plano de su color", () => {
    assert.ok(block.includes(".save-flow-meter i { background: var(--save, #8fb9a6); }"), "el último degradado dentro de estas ventanas desaparece");
  });
});

describe("cyberpunk: los menús diarios de Libros (1.3.211)", () => {
  // Orden de Oscar (2026-11-10 23:53 EST, cuatro fotos de Libros): los
  // MENÚS de las cinco secciones diarias (Ingresos fijos / variables,
  // Gastos fijos / variables, Compras) llevaban el acabado compartido —
  // la barra MES burbuja brillante de 22px, el + moneda de oro, la
  // burbuja vacía translúcida. «Dale su toque cyberpunk a estas fichas
  // diarias… No toques a esas tarjetas principales, solo los menús.»
  const at = css.indexOf("1.3.211");
  const block = css.slice(at, css.indexOf("1.3.213", at));
  const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
  it("el vestido existe y cada regla vive cercada al gancho is-menu de Libros", () => {
    assert.ok(at > 0, "la sección de la 1.3.211 debe existir en la hoja del tema");
    const rules = block.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((s) => s.trim()).filter((s) => s.includes("{"));
    assert.ok(rules.length >= 8, "el bloque trae su familia de reglas");
    for (const r of rules) assert.ok(r.slice(0, r.indexOf("{")).includes(".card.income-book.is-menu"), `toda regla del bloque cuelga del gancho: ${r.slice(0, 60)}`);
    assert.ok(!block.includes(".save-band"), "el bloque no toca la banda de ahorros ni el vestido de la 1.3.208");
  });
  it("el gancho lo llevan las cinco secciones de Libros y, desde la 1.3.213, también Cuotas", () => {
    assert.ok(screens.includes('${menu ? " is-menu" : ""}'), "la sección pinta is-menu solo desde el prop menu");
    for (const kind of ["income-fixed", "income-variable", "expense-fixed", "expense-variable", "purchase"]) {
      assert.ok(new RegExp(`LinesBlock kind="${kind}"[^/>]*menu /`).test(screens), `la llamada de ${kind} lleva menu`);
    }
    // 1.3.213 (Oscar: «The last menus in me deben and debo»): the fence this
    // pin guarded in 1.3.211 moved by his order — Cuotas carries the hook now.
    assert.ok(/LinesBlock kind="subscription"[^/>]*menu/.test(screens), "Cuotas (la gemela del escritorio de Pagos) lleva el gancho desde la 1.3.213: es un menú de Libros");
  });
  it("el panel toma el fondo plano cálido con el respiro del acento, sin redeclarar el corte", () => {
    assert.ok(block.includes(".card.income-book.is-menu {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--accent) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);"), "el panel es el material plano del tema bajo el respiro del acento de su barra");
    assert.ok(!block.includes("clip-path"), "el chaflán sigue siendo el de la regla genérica de tarjetas: nada se rede­clara ni se amputa");
  });
  it("la barra MES pierde el brillo: fondo plano, radio 2px, sin sombra ni luz interior", () => {
    assert.ok(block.includes(".span-fold-bar {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--accent) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);\n  border-radius: 2px;\n  box-shadow: none;"), "la barra es material plano de la ciudad, no la burbuja de 22px con luz blanca");
  });
  it("la píldora del monto es lavado plano del acento con marco interior, en el sistema de 2px", () => {
    assert.ok(block.includes(".span-fold-main strong {\n  background: color-mix(in oklab, var(--accent) 16%, var(--surface));\n  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--accent) 32%, transparent);\n  border-radius: 2px;"), "la píldora: lavado 16% + marco interior 32%, como la fila MES de los bolsillos");
  });
  it("el filtro abierto SEMANA/MES/AÑO toma la gramática de selección 199 en el acento", () => {
    assert.ok(block.includes('.span-filter button[aria-pressed="true"] {\n  background: color-mix(in oklab, var(--accent) 24%, var(--surface)); color: var(--fg);\n  box-shadow: inset 0 0 0 1px var(--accent);'), "la opción viva: marco a plena fuerza y lavado dentro, nunca el bloque claro de la hoja base");
    assert.ok(block.includes(".span-filter { border-radius: 2px; }"), "el filtro entra en el sistema de 2px");
  });
  it("el + deja de ser la moneda de oro: bloque amarillo plano, círculos silenciados, glifo oscuro", () => {
    assert.ok(block.includes(".plus-mark {\n  background: var(--accent); border-radius: 2px; box-shadow: none;"), "el + es el primario plano de la ciudad");
    assert.ok(block.includes(".plus-mark svg circle {\n  fill: none; stroke: none;"), "la moneda muere por pintura: sin relleno degradado ni anillo; el trazo oscuro propio del SVG queda como glifo");
  });
  it("la burbuja vacía se asienta en el fondo oscuro con su marco punteado acabado en el acento", () => {
    assert.ok(block.includes(".fx-note.is-empty {\n  background: #14100b;\n  border-color: color-mix(in oklab, var(--accent) 38%, var(--line));\n  border-radius: 2px;"), "burbuja: fondo oscuro plano, marco al 38% del acento, radio 2px");
    assert.ok(!/\.fx-note\.is-empty \{[^}]*border-style/.test(block), "el punteado es de la hoja base y se queda punteado: el bloque no lo toca");
  });
  it("rótulo y cifra de la barra hablan Rajdhani", () => {
    assert.ok(block.includes(".span-fold-main span {\n  font-family: var(--cp-display); font-weight: 600;"), "el rótulo MES toma la fuente de la ciudad");
    assert.ok(block.includes("font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;"), "la cifra del monto toma la fuente de la ciudad");
  });
  it("el bloque no asigna colores de bolsillo ni de sección: solo lee el acento", () => {
    assert.ok(!/--(seg|save|sav)\s*:/.test(block), "ninguna variable de color se reescribe en los menús");
    assert.ok(!/--accent\s*:/.test(block), "ni siquiera el acento: se lee con var(), jamás se asigna");
  });
});

describe("cyberpunk: los últimos menús — Cuotas y Debo / Me deben (1.3.213)", () => {
  // Orden de Oscar (2026-11-11 07:22 EST, dos fotos de Libros): «The last
  // menus in me deben and debo.» + «For cyberpunk» + «You know what to do.»
  // Cuotas se une al vestido de los menús (el gancho, pin de la 1.3.211 ya
  // movido) y las vistas de personas de la fila media — cifra y +, gráfica
  // de 6 meses, paneles Sin interés / Con interés / Tarjetas con sus
  // burbujas vacías, y la fila Archivo — dejan el acabado compartido.
  const at = css.indexOf("1.3.213");
  // 1.3.214: la frontera de la rebanada se mueve a la sección nueva (las
  // aserciones de la 1.3.213 no cambian; la ruta del plan vive en su bloque).
  const block = css.slice(at, css.indexOf("1.3.214", at));
  it("el vestido existe y cada regla vive cercada al libro de Libros en este tema", () => {
    assert.ok(at > 0, "la sección de la 1.3.213 debe existir en la hoja del tema");
    const rules = block.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((s) => s.trim()).filter((s) => s.includes("{"));
    assert.ok(rules.length >= 5, "el bloque trae su familia de reglas");
    for (const r of rules) assert.ok(r.slice(0, r.indexOf("{")).includes(".debt-book"), `toda regla del bloque cuelga del libro de Libros: ${r.slice(0, 60)}`);
    assert.ok(!block.includes(".cobros"), "Central y su panel de Cobros quedan fuera: la cerca es el libro, no la clase compartida");
    assert.ok(!block.includes(".is-menu"), "el vestido del menú de Cuotas sigue siendo el bloque de la 1.3.211: aquí no se rede­clara");
  });
  it("los paneles toman el fondo plano cálido con el respiro del tono del lado, en el sistema de 2px y sin luz interior", () => {
    assert.ok(block.includes(":is(.cobro-group, .cobro-file),\nhtml[data-theme=\"cyberpunk\"] body .debt-book .debt-chart {\n  background:\n    linear-gradient(180deg, color-mix(in oklab, var(--tone) 8%, transparent) 0%, transparent 46%),\n    var(--cp-panel);\n  border-radius: 2px;\n  box-shadow: none;"), "paneles: material plano de la ciudad bajo el respiro del tono propio, radio 2px, la luz blanca interior muere");
  });
  it("el bloque no asigna ningún color: el tono del lado se lee, jamás se reescribe", () => {
    assert.ok(!/--(tone|in|owe|accent|seg|save|sav)\s*:/.test(block), "«manteniendo sus colores»: --tone/--in/--owe se leen con var(), jamás se asignan");
  });
  it("sin corte en este bloque: los paneles acolchan 12px, el chaflán mismo", () => {
    assert.ok(!block.includes("clip-path"), "ningún panel se recorta: su acolchado es el chaflán y el corte comería las esquinas de lo que guarda");
  });
  it("titulares y cifras de las vistas hablan Rajdhani", () => {
    assert.ok(block.includes(".cobro-group > h3 {\n  font-family: var(--cp-display); font-weight: 600;"), "los titulares de los paneles toman la fuente de la ciudad");
    assert.ok(block.includes(":is(.cobro-top strong.num, .debo-sum b.num, .debt-chart .num) {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;"), "la cifra mayor, las del resumen y las de la gráfica toman la fuente de la ciudad");
  });
  it("el + deja de ser la esfera azul: bloque amarillo plano con glifo oscuro en ambas vistas", () => {
    assert.ok(block.includes(".cobro-plus {\n  background: var(--accent); color: var(--accent-fg);\n  border-radius: 2px; box-shadow: none;"), "el + es el primario plano de la ciudad, no el degradado azul compartido");
  });
  it("las burbujas vacías se asientan en el fondo oscuro con su marco punteado acabado en el tono del lado", () => {
    assert.ok(block.includes(".fx-note.is-empty {\n  background: #14100b;\n  border-color: color-mix(in oklab, var(--tone) 38%, var(--line));\n  border-radius: 2px;"), "burbuja: fondo oscuro plano, marco al 38% del tono del lado, radio 2px");
    assert.ok(!/\.fx-note\.is-empty \{[^}]*border-style/.test(block), "el punteado es de la hoja base y se queda punteado: el bloque no lo toca");
  });
  it("lo que no es menú queda fuera: ni la banda, ni las pestañas, ni el plan, ni la fila del balance", () => {
    assert.ok(!block.includes(".debt-scale"), "la banda Me deben · Debo no se toca");
    assert.ok(!block.includes(".debo-tabs"), "el interruptor Cuotas · Préstamos es navegación, no menú: no se viste");
    assert.ok(!block.includes(".debt-plan"), "el Plan de pago es una herramienta con anatomía propia: queda fuera");
    assert.ok(!block.includes(".debt-net"), "la fila del Balance neto no se toca");
    assert.ok(!block.includes(".cobro-card"), "las filas de personas y préstamos conservan su acabado: ninguna regla viste una fila");
  });
});

describe("cyberpunk: la ruta del plan — la línea de tiempo del Asesor (1.3.214)", () => {
  // Orden de Oscar (2026-11-11 07:24 EST, una foto del Asesor): «For
  // cyberpunk only. Apply the style to this section in advisor.» La
  // sección es la ruta del plan (PlanRoute): 24 h / 7 d / 30 d / 90 d
  // dentro de «Por dónde empezar», que llevaba el latón compartido —
  // nodo vivo radial brillante con halo, anillos dorados, conector en
  // degradado dorado y titulares en la fuente del cuerpo.
  const at = css.indexOf("1.3.214");
  const block = css.slice(at, css.indexOf("/* ---------- Stillness", at));
  it("el vestido existe y cada regla cuelga de la ruta, cercada a este tema", () => {
    assert.ok(at > 0, "la sección de la 1.3.214 debe existir en la hoja del tema");
    const rules = block.replace(/\/\*[\s\S]*?\*\//g, "").split("}").map((s) => s.trim()).filter((s) => s.includes("{"));
    assert.ok(rules.length >= 6, "el bloque trae su familia de reglas");
    for (const r of rules) {
      const sel = r.slice(0, r.indexOf("{"));
      assert.ok(sel.includes("html[data-theme=\"cyberpunk\"]"), `toda regla nace cercada al tema: ${sel.slice(0, 60)}`);
      assert.ok(/\.a2-(route|stop)/.test(sel), `toda regla cuelga de la ruta del plan: ${sel.slice(0, 60)}`);
    }
  });
  it("fuera quedan el héroe, el resumen y la tarjeta: la ruta es la sección", () => {
    assert.ok(!block.includes(".a2-tower"), "el héroe del faro es de la oleada de arte (1.3.215): no se toca");
    assert.ok(!block.includes(".a2-plan-sum"), "la franja del resumen ya es plana por la ley de hairlines de la pila: nombrada y fuera");
    assert.ok(!block.includes(".advice-card"), "la tarjeta ya viste el HUD (cyberpunk-hud.css §3): aquí no se rede­clara");
    assert.ok(!block.includes(".a2-stop-rest"), "el cuerpo de cada paso conserva su tinta apagada de la hoja base");
  });
  it("el conector es una regla plana de acento: sin degradado y sin brillo", () => {
    assert.ok(block.includes(".a2-route::before {\n  background: color-mix(in oklab, var(--accent) 60%, transparent);"), "una sola tinta plana al 60% sustituye al degradado dorado que se desvanecía");
    assert.ok(!block.includes("#ffd98a"), "el latón (#ffd98a) desaparece del bloque entero");
    assert.ok(!block.includes("linear-gradient"), "ningún degradado viste la ruta");
  });
  it("el nodo vivo es el disco amarillo plano con sus horas oscuras en Rajdhani, y el halo muere", () => {
    assert.ok(block.includes("li:first-child .a2-stop {\n  background: var(--accent);\n  box-shadow: 0 0 0 4px var(--surface);"), "disco plano var(--accent); la sombra es solo el anillo que enmascara la regla, como en la hoja base");
    assert.ok(block.includes("li:first-child .a2-stop b {\n  font-family: var(--cp-display); font-weight: 700; color: var(--accent-fg);"), "las horas del paso vivo: Rajdhani oscura sobre el amarillo señal");
    assert.ok(!block.includes("radial-gradient"), "el radial brillante del nodo muere");
    assert.ok(!block.includes("18px"), "el halo de 18px muere: ninguna regla del bloque lo conserva");
  });
  it("los pasos que vienen se sientan en el material del panel, enmarcados en silencio", () => {
    assert.ok(block.includes("li:nth-child(n+2) .a2-stop {\n  background: var(--cp-panel);\n  border-color: color-mix(in oklab, var(--accent) 42%, var(--line));"), "disco plano del material del panel; marco de acento al 42%, la fuerza callada de las costuras de la casa");
    assert.ok(block.includes("li:nth-child(n+2) .a2-stop b {\n  font-family: var(--cp-display); font-weight: 700; color: var(--fg);"), "sus horas: Rajdhani en la tinta cálida, sin competir con el paso vivo");
  });
  it("los titulares hablan Rajdhani y el bloque no asigna ningún token", () => {
    assert.ok(block.includes(".a2-stop-head {\n  font-family: var(--cp-display); font-weight: 600; letter-spacing: .01em;"), "los titulares de los pasos toman la fuente de la ciudad; las fechas siguen calculándose igual");
    assert.ok(!/--(accent|seg|save|sav|tone|cp-panel)\s*:/.test(block), "el bloque lee los tokens con var(), jamás los asigna");
  });
});
