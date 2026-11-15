// «ATAJOS DE CENTRAL» (Oscar, 2026-11-14 20:00–20:08 EST, foto 235617):
// reabrió la tarjeta «Atajos de + y −» meses después y no supo de qué botones
// eran los cuatro selectores («es tan genérico eso»): la tarjeta configuraba
// solo el + de Tengo y el − de Gastaré sin nombrar sus casas, y el botón de
// Pagos ni siquiera estaba. Sus órdenes: (1) explicar y organizar la tarjeta
// nombrando de dónde salen los atajos; (2) añadir el tercer botón — el de
// Pagos — al sistema de gestos, con sus dos huecos propios; (3) renombrar la
// tarjeta: «Atajos de Central»; (4) los destinos de Pagos, en su orden:
// Me deben · Debo · Cuotas · Préstamos. Lo que fijan estas cercas:
//  - los huecos nuevos viven en el mismo registro (settings.gestures) con el
//    idioma de la casa: due.hold / due.double; los cuatro viejos no se tocan;
//  - el resolver de Pagos valida exactamente los cuatro destinos y cada uno
//    aterriza en un asiento real de Cobros, por los mismos ids «Ir allí»
//    (cobros-in / cobros-out / cobros-loans / cobros-debo-tabs);
//  - la detección es la maquinaria de corner() con sus constantes intactas
//    (mantener 1000 ms, ventana de doble 170 ms) y el toque simple del botón
//    de Pagos conserva su lógica entera (cobroTap, extraída sin cambios);
//  - la tarjeta se organiza por botón con su casa nombrada y las filas dicen
//    solo el gesto; el Manual, el registro de nombres y la Presentación
//    (m5-atajos: «Los seis atajos…») hablan el nombre nuevo en la misma ola.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const screens = read("components/faro/screens.tsx");
const i18n = read("lib/faro/i18n.ts");
const topics = read("lib/manual/topics.ts");
const links = read("lib/manual/links.ts");
const guion = read("lib/faro/guion.ts");
const css = read("styles.css");
const types = read("lib/faro/types.ts");
const defaults = read("lib/faro/defaults.ts");

const occurrences = (hay: string, needle: string) => hay.split(needle).length - 1;

describe("atajos de Central: las palabras", () => {
  it("el título es el nombre puesto por Oscar, en los dos idiomas", () => {
    assert.ok(i18n.includes('"gesture.title": "Atajos de Central"'), "ES: Atajos de Central");
    assert.ok(i18n.includes('"gesture.title": "Central shortcuts"'), "EN: Central shortcuts");
  });

  it("las claves viejas de fila desaparecen y las nuevas existen dos veces (ES+EN)", () => {
    for (const old of ["gesture.inHold", "gesture.inDouble", "gesture.outHold", "gesture.outDouble"]) {
      assert.equal(occurrences(i18n, `"${old}"`), 0, `${old} ya no existe en el diccionario`);
      assert.equal(occurrences(screens, old), 0, `${old} ya no se usa en la tarjeta`);
    }
    for (const key of ["gesture.btnIn", "gesture.btnOut", "gesture.btnDue", "gesture.hold", "gesture.double"]) {
      assert.equal(occurrences(i18n, `"${key}":`), 2, `${key} vive en ES y en EN`);
    }
  });

  it("la ayuda ancla la escena: tres tarjetas, tres botones, su esquina", () => {
    assert.ok(i18n.includes("+ en Tengo, − en Gastaré y el de Pagos"), "la ayuda ES nombra los tres botones");
    assert.ok(i18n.includes("+ on Tengo, − on Gastaré, and the Pagos button"), "la ayuda EN nombra los tres botones");
  });

  it("ninguna superficie sigue llamando a la tarjeta por el nombre viejo", () => {
    for (const [name, src] of [["i18n", i18n], ["topics", topics], ["links", links], ["guion", guion], ["screens", screens]] as const) {
      assert.ok(!src.includes("Atajos de + y −"), `${name}: «Atajos de + y −» ya no aparece`);
      assert.ok(!src.includes("+/− shortcuts"), `${name}: «+/− shortcuts» ya no aparece`);
    }
  });
});

describe("atajos de Central: la tarjeta se organiza por botón", () => {
  it("tres grupos con su casa, en orden Tengo · Gastaré · Pagos", () => {
    const a = screens.indexOf('"gesture.btnIn"');
    const b = screens.indexOf('"gesture.btnOut"');
    const c = screens.indexOf('"gesture.btnDue"');
    assert.ok(a >= 0 && b > a && c > b, "los encabezados de grupo van en el orden de las tarjetas");
    assert.ok(screens.includes('className="gesture-group"'), "cada grupo tiene su bloque");
    assert.ok(screens.includes('className="gesture-group-head"'), "cada grupo lleva su encabezado");
    assert.ok(css.includes(".gesture-group-head"), "el encabezado tiene su regla en styles.css");
  });

  it("las filas dicen solo el gesto", () => {
    assert.ok(screens.includes('"gesture.hold"'), "la fila de mantener usa gesture.hold");
    assert.ok(screens.includes('"gesture.double"'), "la fila de doble usa gesture.double");
  });

  it("los destinos de Pagos son los cuatro de Oscar y en su orden", () => {
    const block = screens.slice(screens.indexOf('mode === "due"'), screens.indexOf('mode === "due"') + 600);
    const owed = block.indexOf('"owed"');
    const owe = block.indexOf('"owe",');
    const dues = block.indexOf('"dues"');
    const loans = block.indexOf('"loans"');
    assert.ok(owed >= 0 && owe > owed && dues > owe && loans > dues, "Me deben · Debo · Cuotas · Préstamos, en ese orden");
    assert.ok(block.includes('t("cobro.owed")') && block.includes('t("cobro.owe")'), "las etiquetas salen de las claves de Cobros");
    assert.ok(block.includes('t("cobro.tab.dues")') && block.includes('t("cobro.tab.loans")'), "las pestañas salen de las claves de Cobros");
  });
});

describe("atajos de Central: el botón de Pagos entra al sistema", () => {
  it("los huecos nuevos se llaman due.hold y due.double, en el mismo registro", () => {
    assert.ok(screens.includes('dueGestureOf("due.hold")'), "el hueco de mantener se lee de settings.gestures");
    assert.ok(screens.includes('dueGestureOf("due.double")'), "el hueco de doble se lee de settings.gestures");
    assert.ok(types.includes("gestures?: Record<string, string>"), "el registro sigue siendo el mismo Record");
    assert.ok(defaults.includes("gestures: {},"), "el defecto sigue siendo el registro vacío");
  });

  it("el resolver valida exactamente los cuatro destinos", () => {
    assert.ok(
      screens.includes('raw === "owed" || raw === "owe" || raw === "dues" || raw === "loans"'),
      "un valor desconocido no aterriza en ninguna parte",
    );
  });

  it("cada destino aterriza en un asiento real de Cobros, por los ids «Ir allí»", () => {
    assert.ok(screens.includes('dest === "owed" ? "cobros-in"'), "Me deben → cobros-in");
    assert.ok(screens.includes('dest === "loans" ? "cobros-loans"'), "Préstamos → cobros-loans");
    assert.ok(screens.includes('dest === "dues" ? "cobros-out"'), "Cuotas → cobros-out");
    assert.ok(screens.includes('"cobros-debo-tabs"'), "Debo → cobros-debo-tabs (el lado, sin forzar la pestaña)");
    assert.ok(screens.includes('localStorage.setItem("faro-debo-tab", "loans")'), "Préstamos en frío deja la bandera de una sola vez");
    assert.ok(screens.includes('setCobrosSide(dest === "owed" ? "in" : "out")'), "el lado de nacimiento sale del destino");
  });

  it("la detección hereda las constantes de corner(): 1000 ms y 170 ms", () => {
    const due = screens.slice(screens.indexOf("function cornerDue()"), screens.indexOf("function cornerDue()") + 2600);
    assert.ok(due.includes("}, 1000);"), "mantener = 1000 ms, como en corner()");
    assert.ok(due.includes("< 170"), "la ventana de doble = 170 ms, como en corner()");
    assert.ok(due.includes("}, 170);"), "el toque espera la ventana de doble solo si hay atajo de doble");
  });

  it("el botón conserva su ancla y su toque simple entero", () => {
    assert.ok(screens.includes('data-anchor="desk-cobro"'), "el ancla desk-cobro no se mueve");
    assert.ok(screens.includes("{...cornerDue()}"), "el botón monta los gestos");
    const tap = screens.slice(screens.indexOf("function cobroTap()"), screens.indexOf("function cobroTap()") + 1600);
    assert.ok(tap.includes("cobros && !cobrosLit"), "el toque conserva la rama de «detrás de una tarjeta» (1.3.106)");
    assert.ok(tap.includes("window.innerHeight - 60"), "el toque conserva la rama de «abierto pero fuera de vista»");
    assert.ok(tap.includes('setCobrosSide("out")'), "el toque simple sigue naciendo en el lado Debo, como siempre");
  });
});

describe("atajos de Central: sin obsolescencia", () => {
  it("el tema del Manual se llama como la tarjeta y lista las claves nuevas", () => {
    const topic = topics.slice(topics.indexOf('id: "atajos-mas-menos"'), topics.indexOf('id: "atajos-mas-menos"') + 1600);
    assert.ok(topic.includes('title: ["Atajos de Central", "Central shortcuts"]'), "el título del tema es el nombre nuevo");
    assert.ok(topic.includes('"gesture.btnDue"'), "el tema lista las claves nuevas");
    assert.ok(!topic.includes("gesture.inHold"), "el tema ya no lista las claves viejas");
    assert.ok(topic.includes("[[Me deben]]") && topic.includes("[[Préstamos]]"), "el tema nombra los destinos de Pagos");
    assert.ok(topic.includes("Ajustes → Atajos de Central"), "el «Ir allí» del tema nombra la tarjeta nueva");
  });

  it("el registro de nombres resuelve el nombre nuevo al mismo tema", () => {
    assert.ok(links.includes('"Atajos de Central": "atajos-mas-menos"'), "LINKS: Atajos de Central → atajos-mas-menos");
    assert.ok(links.includes('"Central shortcuts": "atajos-mas-menos"'), "LINKS: Central shortcuts → atajos-mas-menos");
  });

  it("la Presentación cuenta seis atajos y nombra la tarjeta nueva (m5-atajos)", () => {
    assert.ok(guion.includes("Los seis atajos se asignan en Ajustes, «Atajos de Central»."), "el contexto de m5-atajos dice seis y el nombre nuevo");
    assert.ok(guion.includes("The six shortcuts are assigned in Settings, “Central shortcuts”."), "el contexto EN dice seis y el nombre nuevo");
    assert.ok(!guion.includes("cuatro atajos"), "ya ningún texto cuenta cuatro atajos");
  });
});
