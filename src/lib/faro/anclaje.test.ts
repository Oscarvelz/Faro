// 1.3.260 — «Confirmación del anclaje» (Oscar, 2026-11-13 19:37 EST, foto
// 234900): «El botón de anclaje requiere confirmación, ventana con explicación
// básica y sencilla de entender a dónde va esa información cuando se activa
// y se desactiva. ¿Qué hace?» La ley que estas cercas guardan: fijar Y
// desfijar pasan primero por la ventana de confirmación de la casa, que dice
// en palabras sencillas a dónde va el nombre (la tarjeta de apuntes de la
// pantalla de inicio) y que el libro no cambia — y la escritura de siempre
// vive SOLO dentro del run de la ventana, en los tres asientos:
//  · el árbol (categoría y subconceptos): la ventana llega al tocar, como el
//    aviso de ocultar de la 1.3.223 en la misma tarjeta, y su run PREPARA —
//    Guardar sigue siendo el único commit y cancelar no prepara nada;
//  · el catálogo (Tiendas e IA), que guarda al momento: la ventana precede a
//    la escritura, que vive en su run con su refresco de la foto;
//  · el Desfijar de Ajustes → Widget, inmediato: la ventana precede al commit.
// Con el ejemplo activo, cada cuerpo suma la verdad del ejemplo (1.3.258):
// nadie fija en el ejemplo sin encontrarse las dos verdades antes de escribir.
// Y el Manual (tema widget-android) enseña todo esto: las tres familias, la
// pregunta, a dónde van los nombres y la lista de Ajustes.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const host = read("../../components/faro/widget-host.tsx");
const i18n = read("./i18n.ts");
const topics = read("../manual/topics.ts");
const links = read("../manual/links.ts");

const askPin = screens.slice(screens.indexOf("const askPin"), screens.indexOf("const rootRef", screens.indexOf("const askPin")));
const catToggle = screens.slice(screens.indexOf("const toggleStorePinFor"), screens.indexOf("const toggleStorePinFor") + 1300);
const askUnpin = host.slice(host.indexOf("const askUnpin"), host.indexOf("const storeMark"));

describe("anclaje: el árbol pregunta al tocar y su run prepara (1.3.260)", () => {
  it("la fila de la categoría y el pin de cada subconcepto llaman a askPin, nunca a stagePin desnudo", () => {
    assert.ok(screens.includes('onClick={() => askPin("")}'), "la fila de la categoría pregunta");
    assert.ok(screens.includes("onClick={() => askPin(sub.id)}"), "el pin del subconcepto pregunta");
    assert.ok(!screens.includes("onClick={() => stagePin"), "ningún toque prepara ya sin ventana");
  });

  it("la ventana del árbol nombra a la pieza y su run es el preparar de siempre", () => {
    assert.ok(askPin.includes("confirm({"), "askPin abre la ventana de la casa");
    assert.ok(askPin.includes('.replace("{name}", name)'), "el título lleva el nombre de la pieza");
    assert.ok(askPin.includes("run: () => stagePin(subId)"), "la escritura vive solo dentro del run, y es el stagePin de siempre");
    assert.ok(askPin.includes('t("widget.pin.ask.staged")'), "el cuerpo dice que el cambio se aplica al Guardar");
    const runAt = askPin.indexOf("run: () => stagePin(subId)");
    assert.ok(!askPin.slice(0, askPin.indexOf("confirm({")).includes("stagePin("), "antes de la ventana no se prepara nada");
    assert.ok(runAt > askPin.indexOf("confirm({"), "el preparar queda tras la confirmación");
  });

  it("Guardar sigue confirmando las fijas preparadas en su commit único — la maquinaria no cambia", () => {
    assert.ok(screens.includes('if (hasWidgetPin(pins, c, sub ?? "") !== on) pins = toggleWidgetPin(pins, c, sub ?? "");'),
      "savePanel pliega las fijas por el camino de la 1.3.246");
  });
});

describe("anclaje: el catálogo pregunta antes de su guardado al momento (1.3.260)", () => {
  it("la ventana precede a la escritura y el guardado de siempre vive en su run", () => {
    assert.ok(catToggle.includes("confirm({"), "la mano pregunta primero");
    assert.ok(catToggle.includes("run: apply"), "la confirmación corre el guardado");
    const apply = catToggle.slice(catToggle.indexOf("const apply"), catToggle.indexOf("confirm({"));
    assert.ok(apply.includes("toggleStorePin(s.settings.widgetPins, item.id)"), "el guardado es el toggleStorePin de siempre");
    assert.ok(apply.includes("window.dispatchEvent(new Event(WIDGET_REFRESH))"), "el refresco de la foto viaja con el guardado");
    assert.ok(catToggle.includes('"widget.pin.ask.storeBody"'), "fijar una pieza explica la compra con su nombre");
  });

  it("el botón de la mano sigue siendo el pin de la casa y llama al toggle con ventana", () => {
    // RE-FIJADO en 1.3.271: el conjunto fijable se nombra en positivo — el pin
    // es de Tiendas e IA; las Suscripciones nunca lo tuvieron y el Seguro de
    // vida tampoco (en su asiento vive el botón de su plan). El contrato de
    // esta cerca no cambia: el botón es el pin de la casa y su gesto llama
    // al toggle con la ventana de la 1.3.260 delante.
    assert.match(screens, /\(item\.kind === "store" \|\| item\.kind === "ai"\) \? <button type="button" className="icon-btn cat-act pin-btn"[^>]*onClick=\{\(\) => toggleStorePinFor\(item\)\}/,
      "la mano conserva su botón y su gesto");
  });
});

describe("anclaje: el Desfijar de Ajustes pregunta antes del commit (1.3.260)", () => {
  it("askUnpin abre la ventana con la explicación de quitar y el commit vive en el run de cada botón", () => {
    assert.ok(askUnpin.includes("confirm({"), "Desfijar abre la ventana de la casa");
    assert.ok(askUnpin.includes('t("widget.pin.ask.offBody")'), "el cuerpo explica qué se quita");
    assert.ok(host.includes("askUnpin(label(p), () => commit("), "la fija de categoría pasa por la ventana hacia su commit");
    assert.ok(host.includes("askUnpin(names.catalog(p.store as string)"), "la fija de pieza pasa por la ventana hacia su commit");
    assert.ok(host.includes("toggleWidgetPin(s.settings.widgetPins, p.c, p.s)"), "el commit de la categoría es el de siempre");
    assert.ok(host.includes("toggleStorePin(s.settings.widgetPins, p.store as string)"), "el commit de la pieza es el de siempre");
  });
});

describe("anclaje: las dos verdades se encuentran — el ejemplo dentro de la ventana (1.3.260)", () => {
  it("cada asiento suma la frase del ejemplo a su cuerpo cuando el ejemplo manda", () => {
    assert.ok(askPin.includes('sampleOn() ? " " + t("widget.pin.sample") : ""'), "el árbol suma la verdad del ejemplo");
    assert.ok(catToggle.includes('sampleOn() ? " " + t("widget.pin.sample") : ""'), "el catálogo suma la verdad del ejemplo");
    assert.ok(askUnpin.includes('sampleOn() ? " " + t("settings.widgetpins.sample") : ""'), "el Desfijar suma la verdad de su lista");
  });
});

describe("anclaje: las palabras — sencillas, con nombre y en los dos idiomas (1.3.260)", () => {
  const [esHalf, enHalf] = i18n.split("const en: Record<string, string>");
  const keys = ["widget.pin.ask.title", "widget.pin.ask.offTitle", "widget.pin.ask.yes", "widget.pin.ask.body", "widget.pin.ask.storeBody", "widget.pin.ask.offBody", "widget.pin.ask.staged"];

  it("las siete claves existen en los dos diccionarios — paridad exacta", () => {
    for (const k of keys) {
      assert.ok(esHalf.includes(`"${k}"`), `${k} está en español`);
      assert.ok(enHalf.includes(`"${k}"`), `${k} está en inglés`);
    }
  });

  it("los cuerpos dicen a dónde va el nombre y que el libro no cambia", () => {
    for (const s of [
      "Su nombre saldrá en la tarjeta de apuntes de tu pantalla de inicio",
      "lo que anotes eligiéndolo se archiva en ese lugar",
      "entra en Compras con ese nombre",
      "Nada se borra ni se mueve",
      "El cambio se aplica al tocar Guardar.",
    ]) assert.ok(i18n.includes(s), `el español dice: ${s.slice(0, 52)}`);
    for (const s of [
      "Its name will show on the quick-note card on your home screen",
      "anything you jot by choosing it is filed in that place",
      "lands in Shopping under that name",
      "Nothing is deleted or moved",
      "The change applies when you tap Save.",
    ]) assert.ok(i18n.includes(s), `el inglés dice: ${s.slice(0, 52)}`);
  });

  it("los títulos llevan el nombre entre la pregunta, como los de ocultar", () => {
    assert.ok(i18n.includes('"widget.pin.ask.title": "¿Fijar {name} en el widget?"'), "fijar con nombre");
    assert.ok(i18n.includes('"widget.pin.ask.offTitle": "¿Quitar {name} del widget?"'), "quitar con nombre");
  });
});

describe("anclaje: el Manual enseña las fijas (1.3.260)", () => {
  const topic = topics.slice(topics.indexOf('id: "widget-android"'), topics.indexOf('id: "avisos-app"'));

  it("el tema del Widget enseña las tres familias, la pregunta y a dónde van los nombres", () => {
    assert.ok(topic.includes("whatAlt"), "la lección de las fijas vive en el segundo párrafo del tema");
    for (const s of ["[[Estructura]]", "[[Tiendas]]", "[[Widget]]", "tarjeta de apuntes", "Desfijar", "Fijadas"])
      assert.ok(topic.includes(s), `el tema nombra: ${s}`);
    for (const s of ["[[Structure]]", "[[Stores]]", "quick-note card", "Unpin", "Pinned"])
      assert.ok(topic.includes(s), `el tema nombra en inglés: ${s}`);
    assert.ok(topic.includes("Faro pregunta primero"), "la confirmación se enseña como parte del gesto");
  });

  it("el tema avisa de la trampa del ejemplo y de la foto, en su consejo", () => {
    assert.ok(topic.includes("no saldrá en el widget"), "la fija del ejemplo no llega al widget — se dice en el Manual");
    assert.ok(topic.includes("won't show on the widget"), "y en inglés");
    assert.ok(topic.includes("cuándo se envió su última foto"), "la línea de la foto del widget se explica");
  });

  it("el nombre Widget resuelve en el registro y los controles de la fija son nombres probados", () => {
    assert.ok(links.includes('Widget: "widget-android"'), "[[Widget]] llega a su tema");
    for (const n of ['"Fijar en el widget"', '"Fijada en el widget"', '"Desfijar"', '"Fijadas"', '"Pin to the widget"', '"Pinned to the widget"', '"Unpin"', '"Pinned"'])
      assert.ok(links.includes(n), `NAME_TERMS lleva ${n}`);
  });
});
