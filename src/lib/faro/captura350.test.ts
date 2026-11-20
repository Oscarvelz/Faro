// «LAS PUERTAS DE CENTRAL» (Oscar, 2026-11-20 17:09–17:20 EST): los widgets
// existen para ahorrar tiempo — ese es el principio — sin descuidar la
// interconectividad: el selector y los gestos nacen integrados. Lo que
// fijan estas cercas:
//  - el toque simple en + / − abre el selector de puertas (Anotar ·
//    Escribir · Lista · Escanear) y cada fila es la puerta MISMA de la casa
//    (los componentes de entrada de siempre, nunca una puerta paralela);
//    Escanear solo vive en el −, porque Faro no escanea ingresos;
//  - un gesto (mantener · doble · deslizar) puede nombrar una puerta como
//    destino: el resolver de puertas vive APARTE del de áreas, valida su
//    asiento al disparar y gestureOf jamás lee una puerta como área;
//  - el Desk alberga las hojas de las puertas disparadas — las mismas que
//    abren las entradas — y la de Escanear nace desnuda (bare), anclada al
//    botón que el dedo dejó, y avisa al asentarse para desmontarse;
//  - deslizar es el tercer gesto de los TRES botones (también el de Pagos),
//    con su hueco en el mismo registro y su fila en la misma tarjeta,
//    grupos bien separados; el botón solo pierde su scroll cuando tiene
//    un deslizar asignado (touchAction none), nunca antes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const screens = read("components/faro/screens.tsx");
const scan = read("components/faro/receipt-scan.tsx");
const i18n = read("lib/faro/i18n.ts");
const topics = read("lib/manual/topics.ts");
const novedades = read("lib/faro/novedades.ts");

const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1;

describe("puertas de Central: el selector", () => {
  it("el toque simple levanta el selector y Anotar sigue al editor de siempre", () => {
    assert.ok(screens.includes('data-anchor="capture-choose"'), "el selector tiene su ancla");
    assert.ok(screens.includes('data-anchor="choose-note"'), "la fila Anotar existe");
    assert.ok(screens.includes("setChoose(mode)"), "corner() abre el selector, no el editor directo");
    assert.ok(screens.includes('className={`card where-sheet cap-choose'), "el selector viste la tarjeta de la casa (where-sheet)");
  });

  it("cada fila es la puerta misma de la casa, no una paralela", () => {
    const block = screens.slice(screens.indexOf('data-anchor="capture-choose"'), screens.indexOf('data-anchor="capture-choose"') + 2200);
    assert.ok(block.includes("<TextEntry />"), "Escribir es el TextEntry de siempre");
    assert.ok(block.includes("<ListEntry />"), "Lista es el ListEntry de siempre");
    assert.ok(block.includes('<ScanEntry from="expense-variable" />'), "Escanear es el ScanEntry de siempre");
    assert.ok(block.includes('choose === "out"'), "Escanear solo se ofrece en el − (Faro no escanea ingresos)");
  });
});

describe("puertas de Central: los gestos aprenden las puertas", () => {
  it("el resolver de puertas vive aparte y valida el asiento al disparar", () => {
    assert.ok(screens.includes("function doorOf("), "doorOf existe");
    assert.ok(screens.includes('raw === "door:text") return has("capture.text")'), "Escribir exige su asiento");
    assert.ok(screens.includes('raw === "door:list") return has("capture.list")'), "Lista exige su asiento");
    assert.ok(screens.includes('raw === "door:scan") return mode === "out"'), "Escanear solo en el −");
    assert.ok(screens.includes('if (kind === "door") return null;'), "gestureOf jamás lee una puerta como área");
  });

  it("el Desk alberga las hojas mismas que abren las entradas", () => {
    assert.ok(screens.includes('door?.which === "text" ? <CaptureTextSheet'), "la hoja de Escribir es CaptureTextSheet");
    assert.ok(screens.includes('door?.which === "list" ? <CaptureListSheet'), "la hoja de Lista es CaptureListSheet");
    assert.ok(screens.includes("bare startRect={door.rect}"), "Escanear nace desnuda, anclada al botón");
    assert.ok(screens.includes("onSettled={() => setDoor(null)}"), "al asentarse, el Desk la desmonta");
    assert.ok(scan.includes("bare?: boolean") && scan.includes("onSettled?: () => void"), "ScanEntry acepta el nacimiento desnudo sin tocar su conducta de siempre");
  });

  it("la tarjeta ofrece las puertas como destino, solo donde viven", () => {
    assert.equal(occurrences(screens, 'value: "door:text"'), 2, "Escribir se ofrece en + y en −");
    assert.equal(occurrences(screens, 'value: "door:list"'), 2, "Lista se ofrece en + y en −");
    assert.equal(occurrences(screens, 'value: "door:scan"'), 1, "Escanear se ofrece solo en −");
  });
});

describe("puertas de Central: deslizar, el tercer gesto", () => {
  it("la vigía de deslizar es compartida y dispara a los 30 px", () => {
    assert.ok(screens.includes("function swipeWatch("), "una sola vigía para los tres botones");
    assert.ok(screens.includes("< 30"), "el margen claro son 30 px");
    assert.ok(screens.includes('swipeWatch("due"'), "el botón de Pagos también desliza");
    assert.ok(screens.includes('dueGestureOf("due.swipe")'), "su hueco vive en el mismo registro");
  });

  it("la tarjeta gana la fila de deslizar y el botón solo pierde su scroll si tiene deslizar", () => {
    assert.ok(screens.includes('["hold", "double", "swipe"]'), "tres filas por botón");
    assert.equal(occurrences(i18n, '"gesture.swipe":'), 2, "gesture.swipe vive en ES y en EN");
    assert.ok(occurrences(screens, 'touchAction: "none"') >= 3, "los tres botones atan su scroll solo con deslizar asignado");
  });

  it("el Manual y las Novedades cuentan la ola entera", () => {
    const topic = topics.slice(topics.indexOf('id: "atajos-mas-menos"'), topics.indexOf('id: "atajos-mas-menos"') + 2600);
    assert.ok(topic.includes("selector de puertas"), "el tema nombra el selector");
    assert.ok(topic.includes("deslizar el dedo"), "el tema nombra el gesto de deslizar");
    assert.ok(topic.includes('"gesture.swipe"'), "el tema lista la clave nueva");
    const head = novedades.slice(novedades.indexOf("export const NEWS"), novedades.indexOf("export const NEWS") + 400);
    assert.ok(head.includes('"1.3.350"') && head.includes('"grande"'), "la nota mayor de la 1.3.350 abre el registro");
  });
});
