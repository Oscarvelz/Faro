// EL CABLEADO DEL HISTORIAL Y EL ARCHIVO (Oscar, 2026-11-12): las cercas de la
// oleada que les dio pantalla. Lo que fijan, en palabras del brief:
//  - el dock tiene CUATRO ciudadanos y el contenedor «Folios» se sienta entre
//    Libros y Estudio (corrección de Oscar, 2026-11-13: el ciudadano es el
//    contenedor de las dos pastillas, no el Archivo solo; Libros, a su capacidad,
//    no guarda puerta alguna del Historial);
//  - «archivo» e «historial» son lugares principales (navplace los guarda y el
//    arranque puede volver a ellos); Ajustes sigue siendo el único que no lo es;
//  - el proveedor es el único camino de la UI hacia descanso.ts (apartar, mostrar,
//    eliminar), para que la puerta anti-fuga se ponga y se quite en un solo sitio;
//  - el Historial lee el río y sus totales de historial.ts, y su verbo Ocultar es
//    LIGERO (sin puerta escrita: es ida y vuelta) mientras que eliminar un período
//    en el Archivo exige la puerta entera (eso lo cerca puerta-escrita.test.ts);
//  - ninguna cadena de las pantallas nuevas vive fuera de i18n: cada clave
//    hist./arch. que usan existe en español Y en inglés.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { bootPlace, isMainSection, validPlace } from "./navplace.ts";
import { SECTIONS, SWIPE_SECTIONS } from "./types.ts";
import { translate } from "./i18n.ts";
import { MANUAL_CHAPTERS, findTopic } from "../manual/topics.ts";
import { screenPatch } from "../manual/places.ts";

const root = path.join(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const shell = read("components/faro/shell.tsx");
const provider = read("components/faro/provider.tsx");
const historial = read("components/faro/historial.tsx");
const archivo = read("components/faro/archivo.tsx");
const screens = read("components/faro/screens.tsx");
const bookSide = read("components/faro/book-side.tsx");

describe("el dock: cuatro ciudadanos, Folios entre Libros y Estudio", () => {
  it("el orden en DockNav es Central · Libros · Folios · Estudio", () => {
    const fn = shell.slice(shell.indexOf("function DockNav"));
    const desk = fn.indexOf('t("nav.desk")');
    const books = fn.indexOf('t("hub.books")');
    const fol = fn.indexOf('data-anchor="nav-folios"');
    const study = fn.indexOf('t("hub.study")');
    assert.ok(desk >= 0 && books > desk && fol > books && study > fol, "Folios no está entre Libros y Estudio");
    // RE-FIJADO (corrección de Oscar, 2026-11-13, el contenedor «Folios»): el
    // ciudadano ya no es el Archivo ni aterriza siempre en él — lleva la etiqueta
    // del contenedor y aterriza en la última pastilla visitada (historial si
    // ninguna), y es el ciudadano encendido para AMBAS pastillas (hub "folios").
    assert.match(fn, /t\("nav\.folios"\)/);
    assert.match(fn, /hub === "folios"/);
    assert.match(fn, /onSection\(lastPastilla\.current\)/);
    assert.ok(!fn.includes('hub === "historial"'), "ninguna lógica de ciudadano puede colgar ya de la pastilla sola");
    assert.ok(!fn.includes("nav-archivo"), "el ancla vieja del ciudadano-Archivo no sobrevive");
  });

  it("Libros NO guarda puerta del Historial (corrección de Oscar, 2026-11-13)", () => {
    // La cerca de ayer afirmaba la puerta en BooksHub; la corrección la retira:
    // Libros está a su capacidad y vuelve a ser el de siempre, entero.
    const hub = shell.slice(shell.indexOf("function BooksHub"));
    assert.ok(!hub.includes("books-historial"), "la puerta del Historial no vive en Libros");
    assert.ok(!shell.includes("books-historial"), "el ancla de la puerta no sobrevive en ningún sitio");
    assert.ok(!shell.includes("hist-door"), "la puerta no deja ni su clase");
  });

  it("las dos pastillas van juntas en el orden de deslizamiento, historial → archivo", () => {
    // Oscar (2026-11-13): «un deslizamiento fácilmente puede ir del uno al otro».
    const i = SWIPE_SECTIONS.indexOf("historial");
    assert.ok(i >= 0 && SWIPE_SECTIONS[i + 1] === "archivo", "historial y archivo deben ser vecinas en SWIPE_SECTIONS");
  });
});

describe("el contenedor: hubOf, el nombre y los chips de Folios", () => {
  it("hubOf devuelve «folios» para las dos pastillas y el encabezado lo nombra", () => {
    assert.match(shell, /if \(section === "archivo" \|\| section === "historial"\) return "folios";/);
    assert.match(shell, /hub === "folios" \? t\("nav\.folios"\)/);
    // El (?) del hub lee el tema «folios» del manual (su capítulo propio).
    assert.match(shell, /hub === "folios" \? "folios"/);
    // Las dos ramas de pantalla (principal y SectionView) pintan la pastilla actual.
    const renders = shell.match(/hub === "folios" \? \(ui\.section === "archivo" \? <ArchivoScreen \/> : <HistorialScreen \/>\) : null/g) ?? [];
    assert.equal(renders.length, 2, "ambas superficies deben pintar la pastilla por el mismo camino");
  });

  it("ambas pantallas abren con el MISMO componente de chips, en la ropa del par de Estudio", () => {
    assert.match(historial, /import \{ FoliosChips \} from "\.\/folios-chips";/);
    assert.match(archivo, /import \{ FoliosChips \} from "\.\/folios-chips";/);
    assert.match(historial, /<FoliosChips \/>/);
    assert.match(archivo, /<FoliosChips \/>/);
    const chips = read("components/faro/folios-chips.tsx");
    // El modelo es shell.tsx (Estudio⇄Asesor): .seg.is-follow.is-pair, píldora
    // seguidora, role=tab/aria-current, icono y etiqueta nav.<sección>.
    assert.match(chips, /seg is-follow is-pair fol-chips/);
    assert.match(chips, /className="seg-pill"/);
    assert.match(chips, /role="tablist"/);
    assert.match(chips, /aria-current=\{ui\.section === id \? "page" : undefined\}/);
    assert.match(chips, /t\(`nav\.\$\{id\}`\)/);
    // El orden interno del contenedor: historial primero, archivo después.
    assert.match(chips, /\["historial", "archivo"\]/);
  });

  it("las claves del contenedor existen en ES y en EN (Folios no se traduce)", () => {
    assert.equal(translate("es", "nav.folios"), "Folios");
    assert.equal(translate("en", "nav.folios"), "Folios");
    assert.equal(translate("es", "nav.historial"), "Historial");
    assert.equal(translate("en", "nav.historial"), "History");
  });
});

describe("los lugares: archivo e historial son principales; Ajustes, el único que no", () => {
  it("SECTIONS y la partición principal los conocen", () => {
    assert.ok((SECTIONS as readonly string[]).includes("archivo"));
    assert.ok((SECTIONS as readonly string[]).includes("historial"));
    assert.ok((SWIPE_SECTIONS as readonly string[]).includes("archivo"));
    assert.ok((SWIPE_SECTIONS as readonly string[]).includes("historial"));
    assert.equal(isMainSection("archivo"), true);
    assert.equal(isMainSection("historial"), true);
    assert.equal(isMainSection("settings"), false);
  });

  it("navplace guarda y devuelve ambos lugares; el arranque puede volver a ellos", () => {
    for (const section of ["archivo", "historial"] as const) {
      const place = { section, year: 2026, month: 11, vault: null };
      assert.deepEqual(validPlace(place), place);
      assert.deepEqual(bootPlace(place), place, `el arranque no debe expulsar a ${section}`);
    }
  });
});

describe("el proveedor: el único camino hacia descanso.ts", () => {
  it("expone apartar / mostrar / eliminar llamando a descanso.*", () => {
    assert.match(provider, /hidePeriodRange: \(from, to, label\)/);
    assert.match(provider, /hidePeriod\(s, from, to, label\)\.state/);
    assert.match(provider, /restoreRestingSpan: \(spanId\)/);
    assert.match(provider, /restoreSpan\(s, spanId\)/);
    assert.match(provider, /deleteRestingSpan: \(spanId\)/);
    assert.match(provider, /deleteSpan\(s, spanId\)/);
  });
});

describe("las pantallas leen de la fase 1 y hablan por i18n", () => {
  it("el Historial construye el río y los totales de la vista con historial.ts", () => {
    assert.match(historial, /buildStream\(state, filters\)/);
    assert.match(historial, /streamTotals\(state, stream\)/);
    assert.match(historial, /periodRange\(lens, anchor, weekStart\)/);
    // La vista previa de Ocultar es la MISMA función pura que luego aparta.
    assert.match(historial, /hidePeriodDryRun\(state, range\.from, range\.to\)/);
    // Las vistas guardadas son del aparato: su clave vive aquí y en ningún libro.
    assert.match(historial, /"faro\.hist\.views"/);
  });

  it("Ocultar es ligero: el Historial jamás pide la puerta escrita", () => {
    assert.ok(!historial.includes("typeText"), "ocultar es ida y vuelta: no merece la puerta de GitHub");
    assert.match(historial, /hidePeriodRange\(range\.from, range\.to, periodLabel\)/);
  });

  it("el Archivo une por los mutadores de cada área, sin lógica nueva de restaurar", () => {
    assert.match(archivo, /restingEntries\(state\)/);
    assert.match(archivo, /restoreLent\(s, row\.id\)/);
    assert.match(archivo, /restoreLoan\(s, loan\.id\)/);
    assert.match(archivo, /restoreCard\(s, card\.id\)/);
    assert.match(archivo, /readDueFileRows\(browserPackStorage\(\)\)/);
    assert.match(archivo, /deleteRestingSpan\(e\.span\.id\)/);
  });

  it("toda clave hist./arch. usada en las pantallas existe en ES y en EN", () => {
    const keys = new Set<string>();
    for (const src of [historial, archivo]) {
      for (const m of src.matchAll(/t\("((?:hist|arch)\.[a-z0-9.]+)"/gi)) keys.add(m[1]);
    }
    // Las claves armadas por plantilla en el código, nombradas a mano:
    for (const k of ["hist.origin.widget", "hist.origin.import", "hist.f.in", "hist.f.out", "hist.f.xfer", "hist.f.manual", "hist.f.widget", "hist.f.import"]) keys.add(k);
    assert.ok(keys.size >= 30, `muy pocas claves para ser verdad: ${keys.size}`);
    for (const k of keys) {
      assert.notEqual(translate("es", k), k, `falta en español: ${k}`);
      assert.notEqual(translate("en", k), k, `falta en inglés: ${k}`);
    }
  });
});

describe("la segunda pasada: las pantallas que reimplementan lecturas (auditoría 2026-11-13)", () => {
  // Las puertas de los motores aguantaron la auditoría; los escapes vivían en sumas
  // y listas de pantalla que no pasan por ningún motor. Estas cercas de fuente fijan
  // el `!rest` de cada una (las cercas de igualdad viven en antifuga.test.ts).
  it("LinesBlock y la tabla de suscripciones no listan lo apartado (L1)", () => {
    const block = screens.slice(screens.indexOf("export function LinesBlock"));
    assert.match(block, /if \(l\.rest\) return false;/);
    assert.match(screens, /line\.kind === "subscription" && line\.active && !line\.rest/);
  });

  it("buildCal excluye lo apartado en su único filtro (L2)", () => {
    const cal = shell.slice(shell.indexOf("function buildCal"));
    assert.match(cal, /line\.active && !line\.rest/);
  });

  it("la comparación de libros salta lo apartado en los dos meses (L3)", () => {
    assert.equal(bookSide.match(/match\(l\) && !l\.rest/g)?.length, 2, "ni el nombre de lo apartado entra en la comparación");
  });

  it("las sumas derivadas de Ahorros llevan su !rest (L4)", () => {
    assert.match(screens, /!line\.active \|\| line\.rest \|\| !savingsIds\.has/);
    assert.match(screens, /line\.active && !line\.rest && line\.subId === s\.id/);
    assert.match(screens, /line\.active && !line\.rest && line\.kind === "expense-fixed"/);
    assert.match(screens, /l\.active && !l\.rest && \(l\.categoryId \|\| l\.kind\) === picked/);
    assert.match(screens, /line\.active && !line\.rest && line\.subId === subId/);
  });

  it("eliminar un período usa el commit SIN deshacer, y la ventana promete la copia anterior (D3)", () => {
    assert.match(provider, /commitFinal\(\(s\) => deleteSpan\(s, spanId\), "Eliminar período"\)/);
    assert.match(translate("es", "arch.del.body"), /copia de seguridad anterior/);
    assert.match(translate("en", "arch.del.body"), /older backup/);
  });
});

describe("el manual: el capítulo de Folios (Oscar, 2026-11-13)", () => {
  // La ley de Oscar para el manual: ayuda, no confunde ni repite lo que la
  // pantalla ya dice. El área cubre solo lo que no se ve — la separación de los
  // cuartos, Ocultar contra Eliminar, los totales de la vista, la procedencia —
  // en español y en inglés, con sus referencias ([[Término]]) como el resto del
  // manual (eso lo prueba además nombres.test.ts sobre todo el registro).
  it("el capítulo «folios» existe entre Ahorros y Estudio, el orden de la app", () => {
    const ids = MANUAL_CHAPTERS.map((c) => c.id);
    const at = ids.indexOf("folios");
    assert.ok(at > 0, "el capítulo de Folios existe");
    assert.equal(ids[at - 1], "ahorros");
    assert.equal(ids[at + 1], "estudio");
    const ch = MANUAL_CHAPTERS[at]!;
    assert.equal(ch.title[0], "Folios");
    assert.equal(ch.title[1], "Folios");
    assert.deepEqual(ch.topics.map((tp) => tp.id), ["folios", "folios-filtros", "folios-apartar", "folios-procedencia"]);
  });

  it("cada tema habla en los dos idiomas y lleva su destino (go) a su pastilla", () => {
    for (const id of ["folios", "folios-filtros", "folios-apartar", "folios-procedencia"]) {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} existe`);
      for (const f of ["title", "sum", "what"] as const) {
        assert.ok(tp[f][0].trim().length > 0 && tp[f][1].trim().length > 0, `${id}.${f} debe hablar ES y EN`);
      }
      assert.equal(tp.depth, "manual", `${id} es tema de manual: su (?) ofrece «Más en el manual»`);
      assert.ok(tp.go, `${id} lleva destino`);
    }
    assert.equal(screenPatch(findTopic("folios")!.go!).patch.section, "historial");
    assert.equal(screenPatch(findTopic("folios-filtros")!.go!).patch.section, "historial");
    assert.equal(screenPatch(findTopic("folios-procedencia")!.go!).patch.section, "historial");
    assert.equal(screenPatch(findTopic("folios-apartar")!.go!).patch.section, "archivo");
  });

  it("el tema mayor dice la ley anti-fuga en palabras llanas, en los dos idiomas", () => {
    const tp = findTopic("folios")!;
    assert.match(tp.what[0], /nunca muestra lo que descansa/);
    assert.match(tp.what[0], /nada de lo que descansa cuenta/);
    assert.match(tp.what[1], /never shows what rests/);
    assert.match(tp.what[1], /nothing that rests counts/);
  });

  it("Ocultar y Eliminar se distinguen con su referencia: la copia anterior puede devolver lo borrado", () => {
    const tp = findTopic("folios-apartar")!;
    assert.match(tp.what[0], /como si nunca hubiera existido/);
    assert.match(tp.what[0], /escribes el correo de tu sesión/);
    assert.match(tp.tip![0], /\[\[Copias de seguridad\]\]/);
    assert.match(tp.tip![1], /\[\[Backups\]\]/);
  });

  it("los totales son de la vista: el tema de filtros lo dice sin rodeos", () => {
    const tp = findTopic("folios-filtros")!;
    assert.match(tp.what[0], /son de lo que queda a la vista/);
    assert.match(tp.what[1], /belong to what stays in view/);
  });
});

describe("el panel de totales: «El veredicto» y la fila de folio (Oscar, 2026-11-13)", () => {
  // Oscar eligió el candidato B del estudio (NETO héroe, flujos como evidencia)
  // con una corrección al espécimen: la cuenta de movimientos NO vive en la
  // línea de NETO — va archivada en la fila de folio, con la identidad del
  // período, como metadato de la vista. Y la ley del color de SALIÓ se completa:
  // is-neg cuando salió algo, is-zero (tenue) cuando no salió nada.
  const totals = historial.slice(historial.indexOf('className="hist-totals"'), historial.indexOf('className="hist-tools"'));
  const css = read("components/faro/historial.css");

  it("la cuenta vive en la fila de folio, junto al período — nunca en la zona de NETO", () => {
    const folio = totals.slice(totals.indexOf('className="hist-folio"'), totals.indexOf('className="tb-net"'));
    assert.ok(folio.includes("hist-folio-period"), "la fila de folio lleva la identidad del período");
    assert.ok(folio.includes("periodLabel"), "la identidad es la etiqueta del período de la vista");
    assert.ok(folio.includes("hist-total-count"), "la cuenta está archivada en la fila de folio");
    const net = totals.slice(totals.indexOf('className="tb-net"'), totals.indexOf('className="tb-flows"'));
    assert.ok(net.includes('t("hist.net")'), "la zona de NETO lleva su etiqueta");
    assert.ok(!net.includes("hist-total-count") && !net.includes("hist.count"), "la cuenta no se cuela en la línea de NETO");
  });

  it("NETO va primero y los flujos son la evidencia: el orden del veredicto", () => {
    assert.ok(totals.indexOf('className="tb-net"') < totals.indexOf('className="tb-flows"'), "NETO precede a los flujos");
    const flows = totals.slice(totals.indexOf('className="tb-flows"'));
    assert.ok(flows.indexOf('t("hist.in")') < flows.indexOf('t("hist.out")'), "ENTRÓ precede a SALIÓ en la evidencia");
  });

  it("la ley del color de SALIÓ está completa: is-neg con salida, is-zero en cero", () => {
    assert.match(totals, /totals\.outMinor !== 0 \? "is-neg" : "is-zero"/);
    assert.match(css, /\.hist-totals \.is-zero \{ color: var\(--faint\); \}/);
  });

  it("la gramática del panel es la del espécimen: héroe 1.42rem, filetes --line, folio tenue", () => {
    assert.match(css, /\.tb-net > b \{[^}]*font-size: 1\.42rem/);
    assert.match(css, /\.tb-flows \{ border-left: 1px solid var\(--line\)/);
    assert.match(css, /\.hist-folio \{[^}]*border-bottom: 1px solid var\(--line\)/);
    assert.match(css, /\.hist-total-count \{ color: var\(--faint\); font-size: \.7rem/);
  });
});
