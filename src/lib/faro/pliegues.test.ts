/**
 * 1.3.231 (pedido de Oscar) — LOS PLIEGUES: la familia de tarjetas de
 * Estructura se despliega y se pliega con una transición hermosa en vez de
 * abrir de golpe. Estas cercas fijan el contrato de movimiento:
 * - UNA curva, la de la casa (cubic-bezier(.22,1,.36,1)), como token, y la
 *   familia de duraciones asimétrica (300/225 la tarjeta, 200/150 la mano).
 * - La técnica es la rejilla 0fr→1fr con su clip; nada de alturas medidas
 *   ni de max-height fantasma en la hoja de pliegues.
 * - Con movimiento reducido los tokens colapsan: el pliegue es instantáneo.
 * - Las cuatro superficies viven conectadas a FoldShell en screens.tsx y la
 *   mano del Catálogo florece con su escalonamiento y su fantasma is-bye.
 * - La tarjeta de categoría conserva SU maquinaria de la 1.3.223 con la
 *   misma curva (la apertura WAAPI canta la misma nota que el token).
 * - La ayuda del Catálogo lleva el texto corto final de Oscar, carácter a
 *   carácter, en los dos idiomas; el texto largo anterior ya no existe.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../../components/faro/pliegues.css", import.meta.url), "utf8");
const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../../components/faro/shell.tsx", import.meta.url), "utf8");
const topics = fs.readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");

describe("pliegues: un solo lenguaje de movimiento", () => {
  test("la curva es la de la casa y vive como token", () => {
    assert.ok(css.includes("--fold-ease: cubic-bezier(.22, 1, .36, 1);"));
  });

  test("la familia de duraciones: abrir respira más que cerrar", () => {
    assert.ok(css.includes("--fold-open-md: 300ms;"));
    assert.ok(css.includes("--fold-close-md: 225ms;"));
    assert.ok(css.includes("--fold-open-sm: 200ms;"));
    assert.ok(css.includes("--fold-close-sm: 150ms;"));
  });

  test("la técnica es la rejilla 0fr→1fr con su clip, sin alturas fantasma", () => {
    assert.ok(css.includes("grid-template-rows: 0fr;"));
    assert.ok(css.includes("grid-template-rows: 1fr;"));
    assert.ok(css.includes(".fold-clip"));
    assert.ok(css.includes("overflow: hidden;"));
    assert.ok(css.includes("min-height: 0;"));
    assert.equal(/max-height/.test(css), false);
  });

  test("con movimiento reducido los tokens colapsan a 1ms", () => {
    const at = css.indexOf("prefers-reduced-motion: reduce");
    assert.ok(at > 0);
    const block = css.slice(at);
    assert.ok(block.includes("--fold-open-md: 1ms;"));
    assert.ok(block.includes("--fold-close-sm: 1ms;"));
    assert.ok(block.includes("animation: none;"));
  });

  test("la hoja viaja importada tras principal.css", () => {
    assert.ok(shell.includes('import "./pliegues.css";'));
    assert.ok(shell.indexOf('import "./principal.css";') < shell.indexOf('import "./pliegues.css";'));
  });

  test("los chevrons de las puertas giran en el reloj de su superficie", () => {
    assert.ok(css.includes(".tree-kick-row .fold-chev { transition-duration: var(--fold-close-md); }"));
    assert.ok(css.includes(".tree-kick-row .fold-chev.is-open { transition-duration: var(--fold-open-md); }"));
    assert.ok(css.includes(".tree-row .fold-chev { transition-duration: 300ms; }"));
  });
});

describe("pliegues: las superficies conectadas", () => {
  test("FoldShell existe y desmonta SOLO al aterrizar el cierre", () => {
    assert.ok(screens.includes("function FoldShell("));
    assert.ok(screens.includes("FOLD_CLOSE_MS"));
    assert.ok(screens.includes('window.matchMedia("(prefers-reduced-motion: reduce)")'));
  });

  test("los grupos, el alta y el Catálogo cuelgan de FoldShell", () => {
    assert.ok(screens.includes("<FoldShell open={groupOpen}>"));
    assert.ok(screens.includes("<FoldShell open={addOpen}>"));
    assert.ok(screens.includes("<FoldShell open={catalogOpen}><CatalogEditor /></FoldShell>"));
  });

  test("el panel de Reemplazar se pliega en la rejilla, en el nivel pequeño", () => {
    assert.ok(screens.includes('tier="sm" className="fold-grid-panel"'));
    assert.ok(css.includes(".fold-shell.fold-grid-panel { grid-column: 1 / -1; }"));
  });

  test("la mano del Catálogo florece escalonada y se despide como fantasma", () => {
    assert.ok(css.includes("@keyframes fold-bloom"));
    assert.ok(css.includes("calc(var(--i, 0) * 25ms)"));
    assert.ok(css.includes(".cat-tools.is-bye"));
    assert.ok(screens.includes("byeHand === item.id"));
    assert.ok(screens.includes('"--i": 0'));
    assert.ok(screens.includes('"--i": 3'));
  });

  test("la tarjeta de categoría conserva su apertura de la 1.3.223 con la misma curva", () => {
    assert.ok(screens.includes('easing: "cubic-bezier(.22,1,.36,1)"'));
    assert.ok(screens.includes("openAnimRef"));
  });
});

describe("pliegues: la ayuda corta de Oscar", () => {
  test("el texto final vive carácter a carácter en los dos idiomas", () => {
    assert.ok(topics.includes("Keeps your stores, subscriptions, and other services, each kind under its own heading. Tap the title to fold or unfold the tools."));
    assert.ok(topics.includes("Guarda tus tiendas, suscripciones y otros servicios, cada clase bajo su propio título. Toca el título para plegar o desplegar las herramientas."));
  });

  test("el texto largo anterior ya no existe", () => {
    assert.equal(topics.includes("las empresas de IA que eliges al anotar compras y cuotas"), false);
    assert.equal(topics.includes("The section folds and unfolds by tapping its title."), false);
  });
});
