// La guardia del editor de línea (1.3.336): toda navegación que cambia de
// sección con el editor abierto se entrega a guardEditorExit en vez de
// ejecutarse — el hueco de Oscar (2026-11-20): cambiar de carpeta desmontaba
// el editor en silencio y el trabajo sin guardar desaparecía. El contrato,
// probado con salidas de mentira que calcan a la del editor real: sin editor,
// la navegación corre al momento; con el editor limpio, su salida lo cierra y
// la navegación corre detrás, una sola vez; sucio, la navegación no corre
// hasta que él confirma el aviso — y si el aviso se rechaza (la confirmación
// jamás corre), no corre nunca.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearEditorExit, guardEditorExit, hasEditorExit, setEditorExit, type EditorExit } from "./editor-exit.ts";

// Una salida LIMPIA de mentira: cierra el editor al momento y corre el
// proceed detrás, exactamente como la salida real cuando no hay trabajo.
const cleanExit = (log: string[]): EditorExit => (proceed) => { log.push("close"); proceed(); };
// Una salida SUCIA de mentira: levanta el aviso (no cierra, no corre nada) y
// deja el proceed viajando en la confirmación que el aviso guardó.
const dirtyExit = (box: { confirm?: () => void }): EditorExit => (proceed) => { box.confirm = proceed; };

describe("la guardia del editor — guardEditorExit", () => {
  it("sin editor registrado, la navegación corre al momento", () => {
    setEditorExit(null);
    assert.equal(hasEditorExit(), false);
    let ran = 0;
    guardEditorExit(() => { ran++; });
    assert.equal(ran, 1);
  });

  it("con el editor limpio, la salida lo cierra y la navegación corre una sola vez", () => {
    const log: string[] = [];
    setEditorExit(cleanExit(log));
    assert.equal(hasEditorExit(), true);
    let ran = 0;
    guardEditorExit(() => { ran++; log.push("nav"); });
    assert.equal(ran, 1);
    assert.deepEqual(log, ["close", "nav"]); // primero cierra el editor; la navegación, detrás
    setEditorExit(null);
  });

  it("con trabajo sin guardar, la navegación NO corre hasta que él confirma", () => {
    const box: { confirm?: () => void } = {};
    setEditorExit(dirtyExit(box));
    let ran = 0;
    guardEditorExit(() => { ran++; });
    assert.equal(ran, 0); // el aviso está arriba; nada ha navegado
    assert.equal(typeof box.confirm, "function");
    box.confirm!(); // él confirma la salida: el editor se cierra y la navegación viaja detrás
    assert.equal(ran, 1);
    setEditorExit(null);
  });

  it("si él rechaza el aviso, la navegación no corre nunca", () => {
    const box: { confirm?: () => void } = {};
    setEditorExit(dirtyExit(box));
    let ran = 0;
    guardEditorExit(() => { ran++; });
    // El rechazo cierra el aviso sin correr su run: la confirmación jamás se invoca.
    assert.equal(ran, 0);
    setEditorExit(null);
  });

  it("clearEditorExit solo retira el registro de su dueño", () => {
    const mine = cleanExit([]);
    const other = cleanExit([]);
    setEditorExit(mine);
    clearEditorExit(other); // no es el registrado: el registro sobrevive
    assert.equal(hasEditorExit(), true);
    let ran = 0;
    guardEditorExit(() => { ran++; });
    assert.equal(ran, 1); // la salida registrada siguió mandando
    clearEditorExit(mine); // el dueño sí lo retira
    assert.equal(hasEditorExit(), false);
    setEditorExit(null);
  });
});
