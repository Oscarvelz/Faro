/**
 * captura406 — La subida general + el censo (Oscar, 2026-11-22): las bolsas
 * de Ahorros subían la pantalla al abrirse hacia abajo; las fichas de
 * Central (Tengo, Gastaré, Pagos) no — su lista cambiaba lejos de la vista.
 * La ola lleva la subida a las fichas y, por censo, a la lista de cuentas,
 * al editor de cada cuenta y al panel de retiro; el botoncito de volver
 * arriba aparece a media pantalla; y el panel de retiro gana su bandeja
 * con la ventana de la burbuja al ancho entero de su fila (su interior,
 * intacto — a Oscar le encanta).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const styles = read("../../styles.css");
const toTop = read("../../components/faro/to-top.tsx");

describe("406 · la subida llega a las fichas y al censo", () => {
  it("tocar una ficha sube la pantalla a su lista (desk-list)", () => {
    const fn = screens.slice(screens.indexOf("function focusLens"), screens.indexOf("function focusLens") + 1400);
    assert.ok(fn.includes("revealEditor(document.querySelector<HTMLElement>('[data-anchor=\"desk-list\"]'))"), "la ficha encendida revela su lista");
  });
  it("abrir la lista de cuentas sube a su banda", () => {
    const fn = screens.slice(screens.indexOf("function toggleAccounts()"), screens.indexOf("function toggleAccounts()") + 700);
    assert.ok(fn.includes("revealEditor(document.querySelector<HTMLElement>('[data-anchor=\"vault-accounts\"]'))"), "las cuentas revelan su banda al abrir");
  });
  it("el editor de una cuenta sube a su fila al abrirse", () => {
    assert.ok(screens.includes("revealEditor(document.querySelector<HTMLElement>(`[data-bank=\"${id}\"]`))"), "la fila de la cuenta se revela");
    assert.ok(screens.includes("}, [accountFocus]);"), "el efecto sigue a accountFocus");
  });
  it("el panel de retiro de Central sube al abrirse", () => {
    assert.ok(screens.includes("revealEditor(document.querySelector<HTMLElement>(\".ah-form.is-retire\"))"), "el panel de retiro se revela");
    assert.ok(screens.includes("}, [retireDeskOpen]);"), "el efecto sigue a retireDeskOpen");
  });
  it("el botoncito de volver arriba aparece a media pantalla, con su histéresis", () => {
    assert.ok(toTop.includes("t > Math.max(300, vh * 0.5)"), "nace a media pantalla");
    assert.ok(toTop.includes("t > Math.min(180, vh * 0.25)"), "se va cerca del tope");
    assert.ok(!toTop.includes("vh * 0.9"), "el umbral viejo de casi una pantalla murió");
  });
});

describe("406 · el acabado del panel de retiro y de su fila", () => {
  it("el panel de retiro vive en su bandeja hundida", () => {
    assert.ok(styles.includes(".save-retire { margin-top: 6px; padding: 2px 12px 10px;"), "la bandeja existe");
    assert.ok(styles.includes("background: color-mix(in oklab, var(--ink) 4%, transparent); }"), "fondo hundido de la casa");
    assert.ok(styles.includes(".save-retire .save-line:first-child { border-top: 0; }"), "el primer renglón no repite filete");
  });
  it("la explicación del retiro va tras su filete, no suelta", () => {
    assert.ok(styles.includes(".save-retire .fund-note { margin-top: 8px; padding-top: 8px;"), "la nota del panel lleva su filete");
    assert.ok(styles.includes(".ah-form.is-retire .fund-note { margin-top: 4px; padding-top: 8px;"), "la gemela de Central también");
  });
  it("la fila respira igual a los dos lados", () => {
    assert.ok(styles.includes(".save-account { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-height: 48px; padding: 4px 12px;"), "relleno simétrico 12/12");
    assert.ok(!styles.includes("padding: 4px 12px 4px 6px"), "el 6/12 asimétrico murió");
  });
  it("la ventana de la burbuja ocupa el ancho entero de su fila", () => {
    assert.ok(styles.includes(".save-account .book-look { flex: 1 0 100%; }"), "la burbuja al ancho de la fila");
  });
});
