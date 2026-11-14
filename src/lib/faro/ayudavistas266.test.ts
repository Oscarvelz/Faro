// «LA AYUDA DE VISTAS GUARDADAS» (Oscar, 2026-11-14, desde su foto del
// Historial en Tron: «Añade una ayuda con signo de pregunta pequeño cerca
// de vistas guardadas para explicar esa ventana. Si existe en el manual,
// añade su referencia.»). Lo que fijan estas cercas:
//  - junto a la pastilla «Vistas guardadas» vive el (?) de la casa — el
//    mismo componente Hint de siempre, ni uno nuevo ni hecho a mano — y la
//    pastilla misma no se mueve ni se redimensiona: su botón queda byte a
//    byte como estaba;
//  - la burbuja explica LA VENTANA de vistas (qué guarda una vista, que un
//    toque la reaplica, que aquí mismo se borra) con el texto alternativo
//    (whatAlt) del tema que la cubre, en los dos idiomas;
//  - el censo del manual quedó así: NO existe un tema dedicado a las
//    vistas guardadas; las cubre el tema mayor «folios-filtros» (su `how`
//    ya manda guardar la vista y sus `terms` ya indexan «Vistas
//    guardadas»). Por eso el (?) apunta a ese tema con `alt`, y como el
//    tema es de profundidad «manual», la burbuja lleva su referencia —
//    «Más en el manual →» — que aterriza exactamente en ese tema;
//  - el comportamiento de las vistas no se toca: guardar, aplicar y
//    borrar siguen siendo las mismas líneas de siempre.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { bubbleText, findTopic } from "../manual/topics.ts";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const tsx = read("components/faro/historial.tsx");
const i18n = read("lib/faro/i18n.ts");

const PILL = '<button type="button" className={`btn secondary hist-tool-btn${viewsOpen ? " is-on" : ""}`} aria-expanded={viewsOpen} onClick={() => setViewsOpen((on) => !on)}>{t("hist.views")}</button>';

describe("la ayuda de Vistas guardadas: el (?) de la casa, junto a la pastilla", () => {
  it("la pastilla queda intacta y el (?) vive inmediatamente después, dentro de la fila de herramientas", () => {
    assert.ok(tsx.includes(PILL), "el botón de «Vistas guardadas» no cambia ni de forma ni de sitio");
    const at = tsx.indexOf(PILL);
    const hint = tsx.indexOf('<Hint topic="folios-filtros" alt />');
    assert.ok(hint > at, "el (?) va tras la pastilla");
    assert.ok(hint < tsx.indexOf("{viewsOpen ? ("), "el (?) queda dentro de .hist-tools, antes del panel de vistas");
    assert.equal(tsx.split("<Hint").length - 1, 1, "un solo (?) nuevo en la pantalla");
  });

  it("es el componente de la casa: Hint, con su etiqueta accesible de siempre en los dos idiomas", () => {
    assert.ok(tsx.includes('import { Hint } from "./hint";'), "se importa el Hint compartido, no se inventa otro");
    assert.ok(i18n.includes('"hint.label": "Qué es esto"'), "la etiqueta ES del (?) es la de la casa");
    assert.ok(i18n.includes('"hint.label": "What is this"'), "la etiqueta EN del (?) es la de la casa");
  });

  it("el comportamiento de las vistas no se toca: guardar, aplicar y borrar, las líneas de siempre", () => {
    assert.ok(tsx.includes("const applyView = (v: SavedView) => {"), "aplicar sigue siendo applyView");
    assert.ok(tsx.includes("saveViews([...views.filter((x) => x.name !== name), { name, lens, filters }])"), "guardar sigue guardando lente + filtros bajo el nombre");
    assert.ok(tsx.includes("onClick={() => saveViews(views.filter((x) => x.name !== v.name))}"), "borrar sigue siendo el mismo gesto");
    assert.ok(tsx.includes('const VIEWS_KEY = "faro.hist.views";'), "las vistas siguen viviendo en este aparato, jamás en el libro");
  });
});

describe("la ayuda de Vistas guardadas: el tema que la cubre y su referencia", () => {
  it("no hay tema dedicado: el mayor «folios-filtros» es quien cubre las vistas (su how y sus terms)", () => {
    const tp = findTopic("folios-filtros");
    assert.ok(tp, "el tema mayor existe");
    assert.match(tp.how![0], /guárdala como vista/, "su `how` ES ya enseña a guardar la vista");
    assert.match(tp.how![1], /save it as a view/, "su `how` EN ya enseña a guardar la vista");
    assert.ok((tp.terms ?? []).some(([es, en]) => es === "Vistas guardadas" && en === "Saved views"), "sus terms indexan «Vistas guardadas»");
  });

  it("la burbuja (alt) explica la ventana de vistas en los dos idiomas, directa y al punto", () => {
    const tp = findTopic("folios-filtros")!;
    assert.ok(tp.whatAlt, "el tema lleva el texto alternativo de las vistas");
    assert.equal(bubbleText(tp, "es", true), tp.whatAlt![0], "la burbuja ES es el whatAlt");
    assert.equal(bubbleText(tp, "en", true), tp.whatAlt![1], "la burbuja EN es el whatAlt");
    assert.match(tp.whatAlt![0], /guarda la lente y los filtros/, "dice qué guarda una vista (ES)");
    assert.match(tp.whatAlt![0], /vuelve a esa vista al instante/, "dice que un toque la reaplica (ES)");
    assert.match(tp.whatAlt![0], /la borras aquí mismo/, "dice dónde se borra (ES)");
    assert.match(tp.whatAlt![1], /keeps the lens and the filters/, "dice qué guarda una vista (EN)");
    assert.match(tp.whatAlt![1], /returns to that view at once/, "dice que un toque la reaplica (EN)");
    assert.match(tp.whatAlt![1], /delete it right here/, "dice dónde se borra (EN)");
    // La burbuja sin alt sigue siendo la de los filtros: el (?) de este tema en su estado base no cambia.
    assert.equal(bubbleText(tp, "es"), tp.what[0], "sin alt, la burbuja sigue siendo el `what` de los filtros");
  });

  it("la referencia existe porque el tema es de manual: «Más en el manual →» aterriza en folios-filtros", () => {
    const tp = findTopic("folios-filtros")!;
    assert.equal(tp.depth, "manual", "profundidad manual: la burbuja ofrece «Más en el manual →»");
    assert.equal(tp.moreId ?? tp.id, "folios-filtros", "la referencia aterriza en el tema que cubre las vistas");
    assert.ok(i18n.includes('"manual.more": "Más en el manual"'), "la etiqueta de la referencia existe (ES)");
    assert.ok(i18n.includes('"manual.more": "More in the manual"'), "la etiqueta de la referencia existe (EN)");
  });
});
