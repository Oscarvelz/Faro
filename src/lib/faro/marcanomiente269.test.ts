/**
 * FARO 1.3.269 — «La marca no miente» (Oscar, 2026-11-14 08:26 EST).
 *
 * Su reporte, con la foto de la tarjeta plegada de Temu: tocó la marca
 * amarilla del pin con la tarjeta cerrada, la marca pareció apagarse —
 * «desactivó» la fijación —, y al abrir la tarjeta el pin seguía puesto.
 * Ninguna ventana de confirmación apareció jamás, aunque desde la 1.3.260
 * todo fijar y desfijar pasa por la ventana de la casa. Su veredicto:
 * «ese botón amarillo que está encima cuando está plegada es falso
 * porque no hace lo que el usuario vendría a pensar». Sus dos salidas
 * honestas: (A) que no se pueda cambiar desde ahí — la marca es un
 * signo puro —; o (B) que sí se pueda, pero lo haga de verdad (ventana
 * + escritura). La dirección es A, declarada y no revocada: es el fallo
 * que la casa ya dio para el signo ⇄ en la 1.3.230 («nunca como botón»,
 * su toque inerte por la exención de la puerta).
 *
 * El censo (faro-pinmark-study/DIAGNOSIS.md, probado en banco) nombró el
 * mecanismo: la marca .cat-pinmark es un SVG sin handler; su toque caía
 * en la puerta de la tarjeta porque la guardia eximía «button, input, a,
 * .cat-badge» pero NO a la marca — el toque abría la mano, y la marca,
 * que solo se pinta con la mano cerrada, se desmontaba en el mismo
 * gesto: el pin «se apagaba» bajo el dedo, sin ventana y sin escritura
 * (el paquete quedaba byte a byte idéntico). La misma mentira vivía en
 * .sub-pinmark, la marca del subconcepto fijado dentro del editor de
 * categoría. La marca de la fila de categoría (.tree-pinmark) no puede
 * mentir: vive dentro del botón de la fila y su visibilidad cuelga solo
 * del estado guardado — no se toca.
 *
 * Lo que cercan estas pruebas (la conducta se prueba en banco; aquí se
 * fija la forma de la fuente):
 *  - Las dos guardias eximen a sus marcas: el toque sobre la marca es
 *    inerte, como el del ⇄ desde la 1.3.230.
 *  - La exención del ⇄ queda intacta, en su sitio y con su fallo.
 *  - Las marcas se pintan SOLO del estado real de la fija (la guardada
 *    del catálogo; la efectiva —preparada ?? guardada— del sub) y no
 *    llevan handler alguno: son dibujos, no controles.
 *  - Las puertas honestas no se mueven ni una línea: la fila del pin
 *    del árbol y el pin de la mano del sub siguen pasando por askPin;
 *    el pin de la mano del catálogo, por toggleStorePinFor — cada uno
 *    con la ventana de la 1.3.260 delante, como hasta hoy.
 *  - La marca de la fila no gana exención ni la necesita: su única
 *    aparición en la fuente sigue siendo su pintado.
 *  - Y el steer de Oscar de las 09:05 EST, plegado en esta misma ola:
 *    aceptadas las suscripciones como no fijables, «que no quede en
 *    silencio eso» — la sección «Fijadas» lo dice a su pie con una nota
 *    pequeña y muda, siempre, en los dos idiomas.
 */
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = src("../../components/faro/screens.tsx");
const host = src("../../components/faro/widget-host.tsx");
const i18n = src("./i18n.ts");
const lines = screens.split("\n");
const lineWith = (needle: string) => lines.filter((l) => l.includes(needle));

describe("1.3.269 — la marca no miente (las guardias eximen a las marcas)", () => {
  it("la puerta del catálogo exime a .cat-pinmark: su toque es inerte", () => {
    assert.ok(
      screens.includes('if ((e.target as HTMLElement).closest("button, input, a, .cat-badge, .cat-pinmark")) return;'),
      "la guardia de la puerta del catálogo debe eximir a la marca del pin",
    );
  });

  it("la puerta de la tarjeta del sub exime a .sub-pinmark: su toque es inerte", () => {
    assert.ok(
      screens.includes('if ((e.target as HTMLElement).closest("button, input, a, .sub-pinmark")) return;'),
      "la guardia de la tarjeta del sub debe eximir a la marca del pin",
    );
  });

  it("la exención del ⇄ (.cat-badge) queda intacta, con su fallo de la 1.3.230", () => {
    assert.ok(screens.includes("it is a sign, not a button (1.3.222), so its tap must be inert"));
    assert.ok(screens.includes('className="cat-badge"'), "el signo ⇄ sigue pintándose como signo");
    // El ⇄ se exime UNA sola vez: en la puerta del catálogo, donde vive.
    assert.equal(
      lines.filter((l) => l.includes("closest(") && l.includes(".cat-badge")).length,
      1,
      "solo la puerta del catálogo exime al ⇄",
    );
  });
});

describe("1.3.269 — las marcas se pintan solo del estado real y no son controles", () => {
  it("la marca del catálogo cuelga de la fija guardada (storePinned) y de la mano cerrada", () => {
    // RE-FIJADO en 1.3.271: la condición nombra el conjunto fijable en
    // positivo (Tiendas e IA) — el Seguro de vida, como las Suscripciones,
    // no se puede fijar y su marca no existe. La ley de esta cerca no
    // cambia: la marca cuelga de la fija guardada y de la mano cerrada.
    assert.ok(
      screens.includes('{toolsFor !== item.id && (item.kind === "store" || item.kind === "ai") && storePinned(item) ? <Pin size={12} className="cat-pinmark" fill="currentColor" aria-hidden /> : null}'),
    );
    assert.ok(
      screens.includes("const storePinned = (item: CatalogItem) => hasStorePin(session?.ledger.settings.widgetPins, item.id);"),
      "storePinned lee el paquete guardado — la verdad del libro",
    );
  });

  it("la marca del sub cuelga de la fija efectiva (preparada ?? guardada) y de la mano cerrada", () => {
    assert.ok(
      screens.includes('{toolsForSub !== sub.id && effPin(sub.id) ? <Pin size={12} className="sub-pinmark" fill="currentColor" aria-hidden /> : null}'),
    );
    assert.ok(
      screens.includes("const effPin = (subId: string) => stagedPins[pinKeyOf(subId)] ?? hasWidgetPin(savedPins, cat.id, subId);"),
      "effPin es la verdad de la sesión del editor, como la declaró la 1.3.251",
    );
  });

  it("ninguna marca lleva handler: son dibujos, no botones disfrazados", () => {
    for (const mark of ["cat-pinmark", "sub-pinmark", "tree-pinmark"]) {
      const found = lineWith(mark).filter((l) => l.includes("<Pin"));
      assert.equal(found.length, 1, `una sola pintura para .${mark}`);
      assert.ok(!found[0].includes("onClick"), `.${mark} no puede llevar onClick`);
      assert.ok(found[0].includes("aria-hidden"), `.${mark} se anuncia como lo que es: un signo`);
    }
  });

  it("la marca de la fila (.tree-pinmark) no gana exención ni la necesita", () => {
    assert.ok(
      screens.includes('{catPinned ? <Pin size={12} className="tree-pinmark" fill="currentColor" aria-hidden /> : null}'),
      "su pintado sigue colgando solo del estado guardado",
    );
    assert.equal(
      lines.filter((l) => l.includes("closest(") && l.includes(".tree-pinmark")).length,
      0,
      "ninguna guardia nombra a la marca de la fila: vive dentro del botón de la fila",
    );
  });
});

describe("1.3.269 — las puertas honestas no se mueven (la ventana de la 1.3.260 sigue delante)", () => {
  it("el árbol y la mano del sub siguen pasando por askPin", () => {
    assert.ok(screens.includes("const askPin = (subId: string) => {"));
    assert.ok(
      screens.includes('<button type="button" className="tree-pin-row smp-row" role="switch" aria-checked={effPin("")} onClick={() => askPin("")}>'),
      "la fila del pin de la categoría, intacta",
    );
    assert.ok(
      screens.includes('aria-pressed={effPin(sub.id)} onClick={() => askPin(sub.id)}'),
      "el pin de la mano del sub, intacto",
    );
  });

  it("la mano del catálogo sigue pasando por toggleStorePinFor", () => {
    assert.ok(screens.includes("const toggleStorePinFor = (item: CatalogItem) => {"));
    assert.ok(
      screens.includes('aria-pressed={storePinned(item)} onClick={() => toggleStorePinFor(item)}'),
      "el pin de la mano del catálogo, intacto",
    );
  });
});

describe("1.3.269 (steer de Oscar, 09:05 EST) — lo que no se puede fijar no queda en silencio", () => {
  it("la nota vive al pie de la sección «Fijadas», en su registro mudo, y siempre", () => {
    const note = '<span className="aj-sub wpin-note">{t("settings.widgetpins.nosubs")}</span>';
    assert.ok(host.includes(note), "la nota se pinta en la sección, sin condición de libro");
    // Al pie: DESPUÉS de la lista de fijadas (o de su línea de vacío) — cierra
    // la sección; la nota del ejemplo, condicional, vive en la cabeza (1.3.258).
    assert.ok(
      host.indexOf(note) > host.indexOf('t("settings.widgetpins.empty")'),
      "la nota cierra la sección, bajo la lista",
    );
    assert.ok(
      host.indexOf(note) > host.indexOf('t("settings.widgetpins.sample")'),
      "la nota no se confunde con la del ejemplo: va al pie, no en la cabeza",
    );
  });

  it("la pareja existe en los dos diccionarios, con el texto exacto de Oscar", () => {
    assert.ok(i18n.includes('"settings.widgetpins.nosubs": "Las suscripciones no se pueden fijar."'));
    assert.ok(i18n.includes('"settings.widgetpins.nosubs": "Subscriptions can\'t be pinned."'));
  });
});
