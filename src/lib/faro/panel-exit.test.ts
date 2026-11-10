// Guardias de la tarjeta (1.3.182): las dos salidas que la 1.3.179 declaró sin
// guardia — el dock y el pliegue de la sección de Ajustes — entregan su
// navegación a guardPanelExit en vez de ejecutarla. El contrato, probado con
// salidas de mentira que calcan a exitPanel de la tarjeta: sin tarjeta, la
// navegación corre al momento; con la tarjeta limpia, su salida la pliega y la
// navegación corre dentro de su finish, una sola vez; con trabajo pendiente,
// la navegación no corre hasta que él confirma el aviso — y si el aviso se
// rechaza (la confirmación jamás corre), no corre nunca.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearPanelExit, guardPanelExit, setPanelExit, type PanelExit } from "./panel-exit.ts";

// Una salida LIMPIA de mentira: pliega al momento y corre el `after` dentro de
// su propio finish, exactamente como exitPanel cuando la tarjeta no está sucia.
const cleanExit = (log: string[]): PanelExit => (_reveal, after) => { log.push("fold"); after?.(); return true; };
// Una salida SUCIA de mentira: levanta el aviso (no pliega, no corre nada) y
// deja el `after` viajando en la confirmación que el aviso guardó.
const dirtyExit = (box: { confirm?: () => void }): PanelExit => (_reveal, after) => { box.confirm = () => after?.(); return false; };

describe("guardias — guardPanelExit", () => {
  it("sin tarjeta registrada, la navegación corre al momento", () => {
    setPanelExit(null);
    let ran = 0;
    guardPanelExit(() => { ran++; });
    assert.equal(ran, 1);
  });

  it("con la tarjeta limpia, la salida la pliega y la navegación corre una sola vez", () => {
    const log: string[] = [];
    setPanelExit(cleanExit(log));
    let ran = 0;
    guardPanelExit(() => { ran++; log.push("nav"); });
    assert.equal(ran, 1);
    assert.deepEqual(log, ["fold", "nav"]); // primero pliega la tarjeta; la navegación, dentro de su finish
    setPanelExit(null);
  });

  it("con trabajo pendiente, la navegación NO corre hasta que él confirma", () => {
    const box: { confirm?: () => void } = {};
    setPanelExit(dirtyExit(box));
    let ran = 0;
    guardPanelExit(() => { ran++; });
    assert.equal(ran, 0); // el aviso está arriba; nada ha navegado
    assert.equal(typeof box.confirm, "function");
    box.confirm!(); // él confirma el descarte: la tarjeta se pliega y la navegación viaja detrás
    assert.equal(ran, 1);
    setPanelExit(null);
  });

  it("si él rechaza el aviso, la navegación no corre nunca", () => {
    const box: { confirm?: () => void } = {};
    setPanelExit(dirtyExit(box));
    let ran = 0;
    guardPanelExit(() => { ran++; });
    // El rechazo cierra el aviso sin correr su run: la confirmación jamás se invoca.
    assert.equal(ran, 0);
    setPanelExit(null);
  });

  it("clearPanelExit solo retira el registro de su dueño", () => {
    const mine = cleanExit([]);
    const other = cleanExit([]);
    setPanelExit(mine);
    clearPanelExit(other); // no es el registrado: el registro sobrevive
    const box: { confirm?: () => void } = {};
    let ran = 0;
    guardPanelExit(() => { ran++; });
    assert.equal(ran, 1); // la salida registrada siguió mandando (corrió su finish)
    clearPanelExit(mine); // el dueño sí lo retira
    setPanelExit(dirtyExit(box)); // y una tarjeta nueva puede registrar la suya
    let ran2 = 0;
    guardPanelExit(() => { ran2++; });
    assert.equal(ran2, 0);
    setPanelExit(null);
  });

  it("un registro nuevo reemplaza al anterior (hay una sola tarjeta)", () => {
    const box: { confirm?: () => void } = {};
    setPanelExit(dirtyExit(box));
    setPanelExit(null); // la tarjeta se cerró sin clearPanelExit ordenado: el puesto queda libre
    let ran = 0;
    guardPanelExit(() => { ran++; });
    assert.equal(ran, 1);
  });
});
