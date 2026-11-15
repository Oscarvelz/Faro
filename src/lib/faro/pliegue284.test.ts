// «EL PLIEGUE SERENO» (Oscar, 2026-11-14 23:37 EST, foto 235721_132_87r7):
// en Estructura (Tron), al plegar el editor de «Casa», «la transición no es
// suave, sino brusca y parpadea». El diagnóstico (captura fotograma a
// fotograma en banco, ~/workspace/faro-pliegue-study/DIAGNOSIS.md): la
// tarjeta del editor era la única superficie que la 1.3.231 no migró — se
// plegaba a sí misma (1.3.223: altura medida fijada en línea + .is-closing
// con transición de height/opacity/padding/margin sobre la tarjeta entera).
// Eso (a) refluía todo el árbol en cada fotograma — el pliegue por la fila
// pintó 5 fotogramas distintos donde el grupo (FoldShell) pintó 17 con la
// misma carga — y (b) fundía fondo, borde y contenido a opacidad 0, dejando
// ver el fondo del tema a través de la tarjeta y una rendija fantasma al
// final. Lo que fijan estas cercas:
//  - la tarjeta vive en la familia: concha .tree-open (rejilla 0fr→1fr con
//    los tokens --fold-*), clip .tree-open-clip sin pintura (overflow
//    hidden, contain: layout paint — la pista aterriza en 0 exacto) y la
//    pintura de la tarjeta un nivel adentro (.tree-open-card) — el
//    contenido se recorta, nunca se transparenta entero;
//  - la fase es la de FoldShell dentro de TreePanel: nace plegada (shown),
//    finish() invierte la fase y el temporizador de salida es el aterrizaje
//    de la familia (255ms = 225 de cierre + 30);
//  - la maquinaria de la 1.3.223 se fue entera: ni WAAPI de apertura, ni
//    .is-closing, ni alturas fijadas en línea en finish();
//  - el contrato de salida no se movió: el aviso de trabajo sin aplicar
//    sigue ANTES que el pliegue, la salida reducida sigue síncrona, y los
//    retornos de scroll siguen leyendo la altura viva (ahora de la concha);
//  - el chevron de la fila gira con el reloj de la familia (manda el estado
//    destino), como los de grupo desde la 1.3.231.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const screens = read("components/faro/screens.tsx");
const css = read("styles.css");
const pliegues = read("components/faro/pliegues.css");

const panelBody = screens.slice(screens.indexOf("function TreePanel("), screens.indexOf("function emptyInsDraft"));
const exitBody = screens.slice(screens.indexOf("const exitPanel ="), screens.indexOf("const exitSelfRef"));

describe("pliegue284: la tarjeta vive en la familia", () => {
  it("la raíz es la concha con su fase y el clip lleva el contenido", () => {
    assert.ok(panelBody.includes('className={shown ? "tree-open is-open" : "tree-open"}'));
    assert.ok(panelBody.includes('className="tree-open-clip"'));
    assert.ok(panelBody.includes("const [shown, setShown] = useState(false);"));
  });

  it("la concha es la rejilla de la familia, sin pintura propia", () => {
    assert.ok(css.includes(".tree-open { display: grid; grid-template-rows: 0fr; gap: 0; padding: 0; margin: 0; transition: grid-template-rows var(--fold-close-md) var(--fold-ease), margin var(--fold-close-md) var(--fold-ease); }"));
    assert.ok(css.includes(".tree-open.is-open { grid-template-rows: 1fr; margin: 6px 0 12px; transition: grid-template-rows var(--fold-open-md) var(--fold-ease), margin var(--fold-open-md) var(--fold-ease); }"));
  });

  it("el clip no lleva pintura (aterriza en 0 exacto) y la tarjeta vive adentro", () => {
    assert.ok(css.includes(".tree-open-clip { min-height: 0; overflow: hidden; contain: layout paint; opacity: 0; transform: translateY(-4px); transition: opacity var(--fold-fade-close) var(--fold-ease), transform var(--fold-fade-close) var(--fold-ease); }"));
    assert.ok(css.includes(".tree-open-card { display: grid; gap: 8px; background: color-mix(in oklab, var(--fg) 3%, var(--surface)); border: 1px solid var(--line); border-radius: 16px; padding: 12px; }"));
    assert.ok(css.includes(".tree-open.is-open .tree-open-clip { opacity: 1; transform: translateY(0); transition: opacity var(--fold-fade-open) var(--fold-ease) 40ms, transform var(--fold-fade-open) var(--fold-ease) 40ms; }"));
    assert.ok(panelBody.includes('className="tree-open-card"'));
  });

  it("la fase nace plegada y se muestra en doble rAF, como FoldShell", () => {
    assert.ok(panelBody.includes("const raf1 = window.requestAnimationFrame(() => { raf2 = window.requestAnimationFrame(() => setShown(true)); });"));
  });
});

describe("pliegue284: la maquinaria de la 1.3.223 se retiró", () => {
  it("ni WAAPI de apertura, ni .is-closing, ni alturas fijadas en finish()", () => {
    assert.equal(panelBody.includes("openAnimRef"), false);
    assert.equal(panelBody.includes(".animate("), false);
    assert.equal(css.includes(".tree-open.is-closing"), false);
    assert.equal(exitBody.includes('classList.add("is-closing")'), false);
    assert.equal(exitBody.includes("el.style.height"), false);
    assert.ok(exitBody.includes("setShown(false);"));
  });

  it("el temporizador de salida es el aterrizaje de la familia (255ms)", () => {
    assert.ok(exitBody.includes("}, 255);"));
    assert.equal(exitBody.includes("}, 330);"), false);
  });
});

describe("pliegue284: el contrato de salida no se movió", () => {
  it("el aviso de trabajo sin aplicar sigue ANTES que el pliegue", () => {
    const clean = exitBody.indexOf("if (!panelDirty) return finish();");
    const ask = exitBody.indexOf('confirm({ title: t("entry.leave")');
    assert.ok(clean > -1 && ask > clean);
  });

  it("la salida con movimiento reducido sigue síncrona", () => {
    assert.ok(exitBody.includes('window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return true; }'));
  });

  it("los retornos leen la altura viva de la raíz y el de Cancelar viaja a 225ms", () => {
    assert.ok(panelBody.includes("const fallen = hStart - panel.getBoundingClientRect().height;"));
    assert.ok(panelBody.includes("const p = Math.min(1, (now - t0) / 225);"));
  });

  it("el chevron de la fila gira con el reloj de la familia", () => {
    assert.ok(pliegues.includes(".tree-row .fold-chev { transition-duration: var(--fold-close-md); }"));
    assert.ok(pliegues.includes(".tree-row .fold-chev.is-open { transition-duration: var(--fold-open-md); }"));
  });
});
