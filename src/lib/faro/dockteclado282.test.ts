// «EL DOCK SE APARTA» (Oscar, 2026-11-14 19:54 EST, fotos 235582/235583):
// con un formulario abierto y el teclado arriba, el dock (Central · Libros ·
// Folios · Estudio) se pintaba SOBRE el teclado cuando el formulario estaba
// bajo, y solo se escondía al subirlo lo suficiente. Su regla: «no debería
// ponerse encima del teclado, incluso estando por debajo de la pantalla».
// El diagnóstico (~/workspace/faro-dockkeyboard-study/DIAGNOSIS.md): el
// formulario es EN LÍNEA (vive en el flujo de la página; su altura en
// pantalla ES el scrollY) y la única salida del dock era el recorrido del
// glide de scroll (~76px); nada en el glide sabía de formularios ni del
// teclado, y la carcasa Android (adjustResize) encoge la ventana al subir
// el teclado, con lo que el dock fijo se estacionaba encima si el recorrido
// no se había completado. Lo que fijan estas cercas:
//  - la excepción del dock, en la familia de la excepción de la cabecera
//    para search/cal/export: mientras un formulario vive, el objetivo del
//    dock es el recorrido completo a TODA altura de scroll — en step() y
//    reflejado en onScroll(), sin tocar ni un valor del glide;
//  - el estado «formulario abierto» se compone de los asientos del
//    proveedor (ui.draft / ui.editing) MÁS la raíz del propio formulario
//    (.form-block.is-fit), que es la que rinde todo asiento — también los
//    de estado local (el desk-edit de Central, el bolsillo de Ahorros);
//  - la pata del teclado para campos fuera del estado de formulario: el
//    gancho visualViewport existente marca el marco (data-kb) cuando la
//    vista visual cae materialmente (> 120px) bajo la altura de layout, y
//    la regla CSS hermana del precedente de panel dividido aparca el dock
//    vertical mientras la marca vive;
//  - el glide queda intacto en sus valores: la excepción solo AÑADE una
//    entrada, como las que ya existían.
// REFINADA en la 1.3.336 (Oscar, 2026-11-20): la excepción protege al
// teclado, no al formulario — con un formulario abierto y NINGÚN campo
// enfocado, el dock vuelve a obedecer al scroll (bajar lo esconde, subir lo
// trae), porque el editor no debe quitar el acceso a la barra inferior. Con
// un campo de texto enfocado, la excepción sigue exactamente como se fijó
// aquí. Las cercas de la excepción juzgan desde entonces la forma acotada
// (formOpen && kbUp()), con la razón escrita en su propio bloque.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const shell = read("components/faro/shell.tsx");
const css = read("styles.css");

const KB_RULE = ".app-frame[data-kb]:not(.is-split) .dock { display: none; }";
const HEADER_281 = ".app-frame:not(.is-split) .top-chrome { will-change: transform; }";
const SPLIT_PRECEDENT = ".app-frame.is-split .split-pane:has(> .tool-sheet.is-pane) .dock { display: none; }";

describe("el dock se aparta: la excepción por estado de formulario", () => {
  it("el estado se compone del proveedor y de la raíz del formulario, en una sola línea", () => {
    const seats = shell.match(/const formOpen = ui\.draft != null \|\| ui\.editing != null \|\| fitOpen;/g) ?? [];
    assert.equal(seats.length, 1, "formOpen se compone una sola vez: ui.draft, ui.editing y la raíz vigilada");
  });

  it("la raíz vigilada es la del formulario de líneas, observada en el documento", () => {
    assert.ok(shell.includes('document.querySelector(".form-block.is-fit")'), "la vigilancia busca la raíz .form-block.is-fit");
    assert.ok(shell.includes("new MutationObserver(check)"), "la vigilancia vive en un MutationObserver, idioma de la casa");
  });

  it("el glide recibe formOpen entre sus entradas, junto a las excepciones existentes", () => {
    const seats = shell.match(/\}, \[split, searchOpen, calOpen, exportOpen, formOpen, ready, !!session\]\);/g) ?? [];
    assert.equal(seats.length, 1, "formOpen entra en las dependencias del glide una sola vez");
  });

  // 1.3.336 (Oscar, 2026-11-20): la excepción se refinó POR SU PALABRA — con
  // el editor abierto, la barra inferior no volvía ni subiendo, y «así como
  // está este editor no me permite acceso a la barra inferior». La excepción
  // protege al TECLADO, no al formulario: sigue entera mientras un campo de
  // texto guarda el foco (kbUp()), y sin foco manda la ley del scroll. Las
  // dos cercas de abajo juzgan la ley refinada; la protección del 2026-11-14
  // no se retiró — se acotó a su propósito.
  it("step() lleva el objetivo del dock al recorrido completo mientras el formulario vive CON el teclado arriba", () => {
    const seats = shell.match(/if \(formOpen && kbUp\(\) && dock && T > 0\) dockTarget = T;/g) ?? [];
    assert.equal(seats.length, 1, "la excepción de step() existe una sola vez, acotada al teclado");
    const bare = shell.match(/if \(formOpen && dock && T > 0\) dockTarget = T;/g) ?? [];
    assert.equal(bare.length, 0, "la excepción sin acotar no vuelve: sin foco, manda el scroll");
  });

  it("onScroll() refleja la excepción acotada, como la de la cabecera", () => {
    const seats = shell.match(/if \(formOpen && kbUp\(\)\) dockTarget = measureDock\(\);/g) ?? [];
    assert.equal(seats.length, 1, "el reflejo en onScroll() existe una sola vez, acotado al teclado");
  });

  it("la señal del teclado es el foco en un campo de texto, y el lazo despierta con el foco", () => {
    assert.ok(shell.includes("const kbUp = () => {"), "kbUp() vive en el lazo del glide");
    assert.ok(shell.includes('a.tagName === "TEXTAREA" || a.isContentEditable'), "kbUp() reconoce textarea y contentEditable");
    assert.ok(shell.includes('ty !== "checkbox" && ty !== "radio"'), "los interruptores no cuentan como teclado: no lo abren");
    assert.ok(shell.includes('document.addEventListener("focusin", onFocus)'), "el lazo despierta al entrar el foco");
    assert.ok(shell.includes('document.addEventListener("focusout", onFocus)'), "el lazo despierta al salir el foco");
  });

  it("los valores del glide quedan intactos: la excepción añade una entrada, no retoca", () => {
    assert.ok(shell.includes("dy *= 0.8"), "la amortiguación del scroll sigue siendo 0.8");
    assert.ok(shell.includes("1 - Math.exp(-dt / 52)"), "la lerp del glide sigue en tau 52");
    const headerEx = shell.match(/if \(searchOpen \|\| calOpen \|\| exportOpen \|\| y <= 0\) headerTarget = 0;/g) ?? [];
    assert.equal(headerEx.length, 1, "la excepción de la cabecera en onScroll() sigue como estaba");
  });
});

describe("el dock se aparta: la pata del teclado (data-kb)", () => {
  it("la marca nace de la caída material de la vista visual: umbral 120", () => {
    assert.ok(shell.includes("window.innerHeight - vv.height > 120"), "el umbral de la marca es 120px bajo la altura de layout");
    const seats = shell.match(/frame\.dataset\.kb = "1";/g) ?? [];
    assert.equal(seats.length, 1, "la marca se pone en un solo lugar");
  });

  it("la marca se escucha en el gancho visualViewport y se retira al desmontar", () => {
    assert.ok(shell.includes('window.visualViewport?.addEventListener("resize", kbCheck)'), "kbCheck se suscribe al resize de visualViewport");
    assert.ok(shell.includes('window.visualViewport?.removeEventListener("resize", kbCheck)'), "kbCheck se desuscribe en la limpieza");
    assert.ok(shell.includes("delete frame.dataset.kb"), "la marca se borra del marco");
  });

  it("la regla CSS existe con el selector y la grafía exactos, una sola vez", () => {
    const seats = css.match(/\.app-frame\[data-kb\]:not\(\.is-split\) \.dock \{ display: none; \}/g) ?? [];
    assert.equal(seats.length, 1, "la regla del dock con teclado se sienta una sola vez");
  });

  it("la regla vive en la familia: tras la regla de la 281, con solo su comentario entre ambas", () => {
    const at281 = css.indexOf(HEADER_281);
    const atKb = css.indexOf(KB_RULE);
    assert.ok(at281 >= 0 && atKb > at281, "la regla data-kb se sienta tras la de la cabecera de la 281");
    const between = css.slice(at281 + HEADER_281.length, atKb).trim();
    assert.match(between, /^\/\* 1\.3\.282:[\s\S]*\*\/$/, "entre ambas reglas solo vive el comentario de la 282");
  });

  it("el precedente de panel dividido queda intacto", () => {
    assert.ok(css.includes(SPLIT_PRECEDENT), "la regla que aparca el dock del panel con hoja sigue como estaba");
  });
});
