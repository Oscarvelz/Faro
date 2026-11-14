/**
 * 1.3.258 «La trampa del ejemplo, cerrada»: el estudio faro-pinsdiag-257 probó la
 * cadena de las fijas sana eslabón a eslabón — y Oscar sin tarjeta, porque fijó
 * dentro del libro de EJEMPLO (donde todo se ve perfecto) mientras el widget, por
 * la ley de 1.3.237, fotografía el libro real. Tres cercas cierran la clase:
 *  1. LA SEÑAL: con el ejemplo activo, las superficies de la fija anuncian su
 *     libro (la fila del árbol con su subtítulo, el editor del catálogo con su
 *     línea, la tarjeta «Widget» con su nota); en modo real quedan intactas.
 *  2. EL PARTE: cada empujón de la foto deja su resultado en el equipo
 *     (faro-widget-lastpush) y la tarjeta lo lee — ningún resultado se traga.
 *  3. EL CONTRATO: la foto serializada lleva los campos EXACTOS que el parser
 *     de Kotlin lee (qpIn/qpOut/qsOut; c/s/n y store) — la costura entre los
 *     dos lenguajes deja de descansar en ojos.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createInitial } from "./defaults.ts";
import { buildWidgetSnapshot, parseWidgetPushRecord, WIDGET_LASTPUSH_KEY } from "./widget.ts";
import type { LedgerState } from "./types.ts";

const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const host = read("../../components/faro/widget-host.tsx");
const samplemode = read("./samplemode.ts");
const i18n = read("./i18n.ts");
const kotlin = read("../../../android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt");

describe("la señal del ejemplo en las superficies de la fija (1.3.258)", () => {
  it("la fila de la fija del árbol lleva el subtítulo del ejemplo, solo con el ejemplo activo", () => {
    assert.match(screens, /sampleOn\(\) \? <span className="tree-pin-sub">\{t\("widget\.pin\.sample"\)\}<\/span> : null/,
      "el subtítulo nace del flag del ejemplo y de ningún otro sitio");
    // En modo real la fila es la de siempre: su etiqueta y su interruptor intactos.
    assert.ok(screens.includes("{effPin(\"\") ? t(\"widget.pin.on\") : t(\"widget.pin\")}"), "la etiqueta de la fila no cambió");
    assert.ok(screens.includes("className=\"tree-pin-row smp-row\""), "la fila conserva su geometría y su clase");
  });

  it("el editor del catálogo anuncia su libro en el registro de sus avisos", () => {
    assert.match(screens, /sampleOn\(\) \? <p className="tree-hint">\{t\("widget\.pin\.sample"\)\}<\/p> : null/,
      "la línea del ejemplo cuelga del mismo flag, junto al aviso del arrastre");
    assert.ok(screens.includes("<p className=\"tree-hint\">{t(\"cat.dragHint\")}</p>"), "el aviso del arrastre sigue donde estaba");
  });

  it("la tarjeta «Widget» dice que su lista es la del ejemplo cuando el ejemplo manda", () => {
    assert.match(host, /sampleOn\(\) \? <span className="aj-sub wpin-note">\{t\("settings\.widgetpins\.sample"\)\}<\/span> : null/,
      "la nota de la lista nace del flag del ejemplo");
  });

  it("las palabras existen en los dos diccionarios", () => {
    const [esHalf, enHalf] = i18n.split("const en: Record<string, string>");
    for (const k of ["widget.pin.sample", "settings.widgetpins.sample"]) {
      assert.ok(esHalf.includes(`"${k}"`), `${k} está en español`);
      assert.ok(enHalf.includes(`"${k}"`), `${k} está en inglés`);
    }
  });
});

describe("el parte del empujón (1.3.258)", () => {
  it("la llave es la del equipo y el lector no se fía de la forma", () => {
    assert.equal(WIDGET_LASTPUSH_KEY, "faro-widget-lastpush");
    const ok = { at: "2026-11-13T21:00:00.000Z", branch: "sample", sent: false, why: "pack" };
    assert.deepEqual(parseWidgetPushRecord(JSON.stringify(ok)), ok);
    assert.deepEqual(parseWidgetPushRecord(JSON.stringify({ at: ok.at, branch: "real", sent: true })), { at: ok.at, branch: "real", sent: true });
    assert.equal(parseWidgetPushRecord(null), null);
    assert.equal(parseWidgetPushRecord(""), null);
    assert.equal(parseWidgetPushRecord("no json"), null);
    assert.equal(parseWidgetPushRecord(JSON.stringify({ at: "ayer", branch: "real", sent: true })), null, "una fecha que no parsea no es un parte");
    assert.equal(parseWidgetPushRecord(JSON.stringify({ at: ok.at, branch: "luna", sent: true })), null, "una rama desconocida no es un parte");
    assert.equal(parseWidgetPushRecord(JSON.stringify({ at: ok.at, branch: "real", sent: "sí" })), null, "sent tiene que ser booleano");
    assert.equal(parseWidgetPushRecord(JSON.stringify({ at: ok.at, branch: "real", sent: false, why: "magia" })), null, "un porqué desconocido no es un parte");
  });

  it("cada rama del empujón deja su parte — ninguna salida es muda", () => {
    assert.ok(host.includes("recordPush({ branch: \"sample\", sent: false, why: \"nopack\" })"), "sin paquete real: parte de nopack");
    assert.ok(host.includes("recordPush({ branch: \"sample\", sent: false, why: \"pack\" })"), "paquete que no pasa la comprobación: parte de pack");
    assert.ok(host.includes("recordPush({ branch: \"sample\", sent: true })"), "la rama de ejemplo también dice cuándo SÍ salió");
    assert.ok(host.includes("recordPush({ branch: \"sample\", sent: false, why: \"error\" })"), "el error de la rama de ejemplo deja parte");
    assert.ok(host.includes("recordPush({ branch: \"real\", sent: true })"), "la rama real registra su envío");
    assert.ok(host.includes("recordPush({ branch: \"real\", sent: false, why: \"error\" })"), "el error de la rama real deja parte");
    assert.ok(host.includes("recordPush({ branch: \"out\", sent: true })"), "el vaciado al cerrar sesión es un envío y se cuenta");
    // El parte viaja por el canal crudo: el modo de ejemplo no puede esconderlo.
    assert.ok(host.includes("personalSet(WIDGET_LASTPUSH_KEY"), "el parte se escribe por el canal crudo");
    assert.ok(host.includes("parseWidgetPushRecord(personalGet(WIDGET_LASTPUSH_KEY))"), "la tarjeta lo lee por el mismo canal");
    assert.ok(samplemode.includes("export function personalSet"), "samplemode ofrece la mitad de escritura del canal crudo");
  });

  it("la tarjeta lee el parte en su línea muda, con las palabras honestas de cada caso", () => {
    assert.ok(host.includes("t(\"widget.push.sent\")"), "el caso enviado se lee");
    assert.ok(host.includes("\"widget.push.fail.pack\""), "el libro real que no pasó la comprobación se dice");
    assert.ok(host.includes("\"widget.push.fail.nopack\""), "la ausencia de libro real se dice");
    assert.ok(host.includes("\"widget.push.fail.error\""), "el fallo del envío se dice");
    assert.match(host, /\{pushLine \? <span className="wpush-line">\{pushLine\}<\/span> : null\}/, "la línea se monta solo si hay parte");
    const [esHalf, enHalf] = i18n.split("const en: Record<string, string>");
    for (const k of ["widget.push.sent", "widget.push.now", "widget.push.min", "widget.push.hour", "widget.push.day", "widget.push.fail.pack", "widget.push.fail.nopack", "widget.push.fail.error"]) {
      assert.ok(esHalf.includes(`"${k}"`), `${k} está en español`);
      assert.ok(enHalf.includes(`"${k}"`), `${k} está en inglés`);
    }
  });

  it("los dos caminos de fijar refrescan la foto síncronos con el gesto", () => {
    const save = screens.slice(screens.indexOf("const savePanel"), screens.indexOf("const savePanel") + 2600);
    assert.ok(save.includes("if (pinChanges.length) { setStagedPins({}); window.dispatchEvent(new Event(WIDGET_REFRESH)); }"),
      "el Guardar del árbol con fijas preparadas dispara el refresco en el acto");
    const cat = screens.slice(screens.indexOf("const toggleStorePinFor"), screens.indexOf("const toggleStorePinFor") + 500);
    assert.ok(cat.includes("window.dispatchEvent(new Event(WIDGET_REFRESH))"), "la fija del catálogo, que se guarda al momento, también");
    assert.ok(screens.includes("import { WidgetCard, WIDGET_REFRESH } from \"./widget-host\";"), "el refresco es el del anfitrión, no otro inventado");
  });
});

describe("el contrato de la foto con el shell (1.3.258)", () => {
  const withPins = (pins: LedgerState["settings"]["widgetPins"]): LedgerState => {
    const s = createInitial("es");
    s.settings.widgetPins = pins;
    return s;
  };

  it("la foto serializada lleva los campos exactos que Kotlin lee — ni uno más, ni uno menos", () => {
    const s = withPins([{ c: "f-casa", s: "f.casa.renta" }, { c: "", s: "", store: "temu" }]);
    const snap = buildWidgetSnapshot(s, "es", { today: "2026-11-13", hide: false, lock: false });
    const wire = JSON.parse(JSON.stringify(snap)) as Record<string, unknown>;
    // Las tres listas viajan con sus nombres.
    for (const list of ["qpIn", "qpOut", "qsOut"]) assert.ok(Array.isArray(wire[list]), `${list} viaja como lista`);
    // La fija de categoría cae en qpOut (y en qpIn: sin recibos vive en las dos tarjetas).
    const cat = (wire.qpOut as Record<string, unknown>[]).find((h) => h.c === "f-casa");
    assert.ok(cat, "la fija de categoría está en la foto");
    assert.deepEqual(Object.keys(cat).sort(), ["c", "n", "s"], "una casa de categoría lleva exactamente c, s, n");
    assert.ok((wire.qpIn as Record<string, unknown>[]).some((h) => h.c === "f-casa"), "sin recibos, la fija vive en las dos tarjetas");
    // La fija de pieza viaja solo en qsOut, con su store.
    const store = (wire.qsOut as Record<string, unknown>[])[0];
    assert.ok(store && store.store === "temu", "la fija de pieza está en qsOut con su pieza");
    assert.deepEqual(Object.keys(store).sort(), ["c", "n", "s", "store"], "una casa de pieza lleva exactamente c, s, n, store");
    assert.ok((wire.qpOut as Record<string, unknown>[]).every((h) => !("store" in h)), "ninguna casa de categoría lleva store");
    // Todo valor es texto: el parser lee optString en cada campo.
    for (const list of ["qpIn", "qpOut", "qsOut"]) {
      for (const h of wire[list] as Record<string, unknown>[]) {
        for (const v of Object.values(h)) assert.equal(typeof v, "string", `${list}: cada campo es texto`);
      }
    }
  });

  it("el parser de Kotlin lee exactamente esos nombres — la costura se lee de los dos lados", () => {
    const fieldsOf = (list: string): string[] => {
      const m = kotlin.match(new RegExp(`arr\\(o, "${list}"\\)\\.map \\{ QHome\\((.+)\\) \\}`));
      assert.ok(m, `Kotlin parsea ${list} como casas QHome`);
      return [...m[1].matchAll(/optString\("(\w+)"\)/g)].map((x) => x[1]).sort();
    };
    assert.deepEqual(fieldsOf("qpIn"), ["c", "n", "s"]);
    assert.deepEqual(fieldsOf("qpOut"), ["c", "n", "s"]);
    assert.deepEqual(fieldsOf("qsOut"), ["c", "n", "s", "store"]);
  });
});
