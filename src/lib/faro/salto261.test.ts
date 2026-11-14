/**
 * 1.3.261 (pedido de Oscar) — EL SALTO SUAVE: con el editor de una categoría
 * abierto, tocar OTRA categoría era el movimiento duro que quedaba — la fila
 * tocada vive debajo de la tarjeta abierta y volaba hacia arriba toda su
 * altura al plegarse, sin que nadie acompañara el desplazamiento. Estas
 * cercas fijan la coreografía nueva y lo que NO se tocó:
 * - El salto ancla la fila tocada: startAnchorReturn acompaña el pliegue
 *   leyendo la altura viva de la tarjeta y cediendo el desplazamiento en la
 *   misma medida — la fila ni sube ni baja; es el idioma del retorno de
 *   Cancelar de la 1.3.225, anclado en la fila destino.
 * - Solo acompaña si la fila vive DEBAJO de la tarjeta (lo de arriba no se
 *   mueve con el pliegue) y si hay desplazamiento que ceder.
 * - Su dedo manda: toque o rueda lo cancelan todo, como en el retorno.
 * - El contrato de salida no cambió: el temporizador de 330ms, la clase
 *   is-closing, el aviso de trabajo sin aplicar ANTES que el pliegue, y los
 *   demás llamadores (la propia fila, el grupo, el dock, el Back/Esc) salen
 *   sin ancla, exactamente como siempre.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const screens = fs.readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const panelExit = fs.readFileSync(new URL("./panel-exit.ts", import.meta.url), "utf8");

const exitPanelBody = screens.slice(screens.indexOf("const exitPanel ="), screens.indexOf("const exitSelfRef"));

describe("salto261: el ancla viaja por el contrato de salida", () => {
  test("PanelExit acepta el ancla opcional como tercer dato", () => {
    assert.ok(panelExit.includes("export type PanelExit = (reveal: boolean, after?: () => void, anchor?: HTMLElement | null) => boolean;"));
  });

  test("guardPanelExit sigue entregando su navegación sin ancla", () => {
    assert.ok(panelExit.includes("exit(false, proceed);"));
  });

  test("exitPanel firma el ancla y el trampolín lo reenvía", () => {
    assert.ok(screens.includes("const exitPanel = (reveal: boolean, after?: () => void, anchor?: HTMLElement | null): boolean => {"));
    assert.ok(screens.includes("const trampoline: PanelExit = (reveal, after, anchor) => exitSelfRef.current(reveal, after, anchor);"));
  });

  test("el salto de fila entrega su propia fila como ancla", () => {
    assert.ok(screens.includes("exit(false, () => setOpenId(cat.id), e.currentTarget)"));
  });

  test("los demás llamadores salen sin ancla, como siempre", () => {
    assert.ok(screens.includes("if (open) { panelExitRef.current?.(false); return; }"));
    assert.ok(screens.includes("exit(false, () => foldGroup(group))"));
    assert.ok(screens.includes("useLayer(openId !== null, () => { panelExitRef.current?.(false); });"));
  });
});

describe("salto261: el acompañamiento", () => {
  test("startAnchorReturn existe y solo lo invoca el finish, con el ancla", () => {
    assert.ok(screens.includes("const startAnchorReturn = (panel: HTMLElement, anchor: HTMLElement)"));
    assert.equal(screens.split("startAnchorReturn(el, anchor)").length - 1, 1);
    assert.ok(screens.includes("const ret = reveal ? startReturn(el) : anchor ? startAnchorReturn(el, anchor) : null;"));
  });

  test("solo acompaña a la fila que vive DEBAJO de la tarjeta", () => {
    assert.ok(screens.includes("panel.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING"));
  });

  test("sin desplazamiento que ceder, no acompaña", () => {
    assert.ok(screens.includes("if (startY <= 0) return null;"));
  });

  test("cede el desplazamiento en la medida viva del pliegue", () => {
    assert.ok(screens.includes("const fallen = hStart - panel.getBoundingClientRect().height;"));
    assert.ok(screens.includes("const want = Math.max(0, Math.min(startY - fallen, maxY()));"));
  });

  test("su dedo manda: toque o rueda lo cancelan todo", () => {
    const body = screens.slice(screens.indexOf("const startAnchorReturn"));
    const mine = body.slice(0, body.indexOf("// 1.3.223"));
    assert.ok(mine.includes('window.addEventListener("touchstart", stop, { passive: true });'));
    assert.ok(mine.includes('window.addEventListener("wheel", stop, { passive: true });'));
  });
});

describe("salto261: el contrato de salida no se movió", () => {
  test("el aviso de trabajo sin aplicar sigue ANTES que el pliegue", () => {
    const clean = exitPanelBody.indexOf("if (!panelDirty) return finish();");
    const ask = exitPanelBody.indexOf('confirm({ title: t("entry.leave")');
    assert.ok(clean > -1 && ask > clean, "sin suciedad pliega; con suciedad pregunta primero");
  });

  test("la maquinaria del pliegue es la de siempre: is-closing y sus 330ms", () => {
    assert.ok(exitPanelBody.includes('el.classList.add("is-closing");'));
    assert.ok(exitPanelBody.includes("}, 330);"));
  });

  test("con movimiento reducido la salida sigue siendo síncrona, sin acompañamiento", () => {
    assert.ok(exitPanelBody.includes('window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return true; }'));
  });
});
