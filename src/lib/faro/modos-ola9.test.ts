/**
 * FARO — OLA 9 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: LOS ASIENTOS FANTASMA. El mapa §10 nombraba
 * dos asientos que ningún código consume — accounts.panel y
 * vault.retiro-fields — y las cercas cruzaban contra el fantasma y
 * quedaban verdes mientras la cara trabajaba en otro modo: el
 * formulario de movimiento de cuentas trabaja en Esencial y sus temas
 * anunciaban «Eso vive en Ritmo» (CARA-1); «Acumulado si no se toca»
 * pinta y se lee en Ritmo y su tema anunciaba Completo (CARA-2); y la
 * hermana f-cuenta-nombre colgaba del mismo fantasma, salvada solo por
 * la coincidencia de modos. La cura re-asienta los temas al asiento que
 * gobierna de verdad su superficie y hace nacer el CENSO DE
 * CONSUMIDORES (§A): todo asiento que el mapa nombra tiene un
 * consumidor real en el árbol, o una exención escrita con su mecanismo
 * — un fantasma ya no puede volver en silencio. La misma ola dejó dos
 * hallazgos de cerca: los testigos iconPicked/brandTouched, de cuyo
 * nacimiento falso cuelga la restauración del icono G-6, quedan fijados
 * junto a su especie en la §D de modos-ola7 (G9-1); y el censo de
 * familias de la Presentación, que ataba por ORTOGRAFÍA, se deriva
 * aquí de las BANDERAS de modo (§E, E9-1): un sufijo sin bandera y una
 * bandera con sufijo desconocido corren rojos en los dos sentidos.
 * Donde la rotura vive en un componente, la cerca es de fuente y el
 * banco CDP de la ronda la acompaña (shots-cura9/). Los libros son
 * especímenes fijados a mano sobre el 2026-11-17; jamás producción.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MODULES, TOPIC_SCENES, type Scene } from "./guion.ts";
import { FEATURES } from "./mode.ts";
import { MANUAL_TOPICS, topicMode } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const modeOf = (id: string) => {
  const t = MANUAL_TOPICS.find((x) => x.id === id);
  assert.ok(t, `el tema ${id} existe`);
  return topicMode(t!);
};

/* ═══════════ §A · EL CENSO DE CONSUMIDORES (la raíz de CARA-1/2) ═══════
 * El mapa §10 nombra 99 asientos. Hasta la ola 8, ninguna cerca
 * preguntaba si el árbol los CONSUME: §A (ola7) cruzaba tema↔asiento y
 * el asiento podía ser un fantasma — declarado en el registro, cruzado
 * en el mapa, y sin una sola puerta en el código. El censo deriva los
 * asientos del propio mapa y exige, para cada uno, una mención real
 * fuera de su declaración (una has(), un gate(), un featureForGo, una
 * tabla de composición) o una exención escrita aquí con su mecanismo
 * estructural. El corpus excluye los tests, el propio mapa, topics.ts
 * (que nombra temas, no asientos) e i18n.ts (cuyas claves coinciden a
 * veces con nombres de asiento sin serlo), y desnuda los comentarios:
 * una mención en un comentario no consume nada. */
const MAPA_SRC = SRC("./modos-ola5.test.ts");
const MAP_SEATS = new Set<string>();
for (const m of MAPA_SRC.matchAll(/\{ f: "([a-z0-9.-]+)", m: "(esencial|ritmo|completo)" \}/g)) MAP_SEATS.add(m[1]!);

/* El desnudado de comentarios (OLA 10 · CARA-3): la primera forma quitaba
 * los comentarios de bloque y las líneas que EMPIEZAN por // — pero un
 * comentario al final de una línea de código sobrevivía entero, y su
 * mención de un asiento entre comillas contaba como consumo: la caza
 * escenificó una puerta muerta (has("accounts.add") convertido en true)
 * que volvía a la vida con solo añadir `// la puerta muerta de
 * "accounts.add" ya no se consulta` a una línea viva (la suite pasaba
 * 14/14). Este desnudado camina el texto como un lexer mínimo: conoce las
 * cadenas ('…' y "…"), las plantillas con sus ${} anidados, las regex por
 * su contexto, y los comentarios de línea y de bloque EN CUALQUIER
 * POSICIÓN. Una mención solo cuenta si vive en código o en una cadena del
 * código — nunca en un comentario. Las comillas y las barras solo abren
 * cadena o regex en contexto de expresión (tras un operador, un paréntesis,
 * una palabra clave…): el apóstrofo de un texto JSX («Don't») es una letra,
 * no el arranque de una cadena, y la barra de un cierre JSX (</div>) es
 * texto, no una regex. Límite declarado: una regex tras `=>` sin
 * paréntesis ni tras un `>` de comparación se leería como división — en
 * este corpus no existe ninguna, y el censo de abajo verifica que los
 * conteos sobre el corpus real no cambian contra la forma vieja en
 * ningún asiento. */
const STRIP_KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "new", "delete", "void", "yield", "await", "throw", "else", "do"]);
const STRIP_CTX = new Set([..."(,=:[!&|?{};+-*%~^"]);
export function stripComments(src: string): string {
  let out = "";
  let prev = ""; // último carácter significativo emitido ("" = arranque)
  let sig = ""; // los dos últimos, para reconocer «=>»
  let word = ""; // identificador en curso
  let lastWord = ""; // último identificador completado
  type Frame = { tpl: true } | { expr: true; depth: number };
  const stack: Frame[] = [];
  let mode: "code" | "sq" | "dq" | "tpl" | "line" | "block" | "regex" | "regexClass" = "code";
  const emit = (s: string) => { out += s; };
  const note = (c: string) => { prev = c; sig = (sig + c).slice(-2); };
  const flushWord = () => { if (word) { lastWord = word; word = ""; } };
  const exprContext = () => prev === "" || STRIP_CTX.has(prev) || sig === "=>" || STRIP_KEYWORDS.has(lastWord);
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1] ?? "";
    if (mode === "line") { if (c === "\n") { mode = "code"; emit(c); } continue; }
    if (mode === "block") {
      if (c === "\n") emit(c);
      if (c === "*" && next === "/") { i++; mode = "code"; emit(" "); }
      continue;
    }
    if (mode === "sq" || mode === "dq") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) { mode = "code"; note('"'); lastWord = ""; }
      continue;
    }
    if (mode === "regex" || mode === "regexClass") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if (mode === "regex" && c === "[") mode = "regexClass";
      else if (mode === "regexClass" && c === "]") mode = "regex";
      else if (mode === "regex" && c === "/") { mode = "code"; note('"'); lastWord = ""; }
      continue;
    }
    if (mode === "tpl") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if (c === "`") { stack.pop(); mode = "code"; note('"'); lastWord = ""; continue; }
      if (c === "$" && next === "{") { emit(next); i++; stack.push({ expr: true, depth: 0 }); mode = "code"; note("{"); }
      continue;
    }
    /* mode === "code" */
    if (/[A-Za-z0-9_$]/.test(c)) { word += c; emit(c); note(c); continue; }
    flushWord();
    if (c === " " || c === "\t" || c === "\r" || c === "\n") { emit(c); continue; }
    if (c === "/" && next === "/") { i++; mode = "line"; continue; }
    if (c === "/" && next === "*") { i++; mode = "block"; continue; }
    if (c === "'" || c === '"') {
      if (exprContext()) mode = c === "'" ? "sq" : "dq";
      emit(c); note(c); continue;
    }
    if (c === "`") { stack.push({ tpl: true }); mode = "tpl"; emit(c); note(c); continue; }
    if (c === "/") {
      if (exprContext()) mode = "regex";
      emit(c); note(c); continue;
    }
    if (c === "{") {
      const top = stack[stack.length - 1];
      if (top && "expr" in top) top.depth++;
      emit(c); note(c); continue;
    }
    if (c === "}") {
      const top = stack[stack.length - 1];
      if (top && "expr" in top) {
        if (top.depth === 0) { stack.pop(); mode = "tpl"; emit(c); note(c); continue; }
        top.depth--;
      }
      emit(c); note(c); continue;
    }
    emit(c); note(c);
  }
  return out;
}

function corpus(): string {
  const root = new URL("../../", import.meta.url);
  const strip = stripComments;
  let out = "";
  const walk = (dir: URL, rel: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { walk(new URL(`${e.name}/`, dir), r); continue; }
      if (!/\.(ts|tsx)$/.test(e.name) || /\.test\.ts$/.test(e.name)) continue;
      if (r === "lib/manual/topics.ts" || r === "lib/faro/i18n.ts") continue;
      out += "\n" + strip(readFileSync(new URL(e.name, dir), "utf8"));
    }
  };
  walk(root, "");
  return out;
}
const CORPUS = corpus();
const consumed = (seat: string) => CORPUS.split(`"${seat}"`).length - 1 >= 2;

/* Las exenciones: asientos cuyo consumo es ESTRUCTURAL — la superficie
 * nace por composición (el libro, la sección, la hoja) y sus verbos
 * finos llevan sus propios asientos. Cada exención nombra el mecanismo
 * y su coordenada; la higiene de abajo exige que una exención muera el
 * día que nazca un consumidor textual, para que la tabla no pudra. */
const EXENTOS: Record<string, string> = {
  "accounts.move": "el movimiento nace en Esencial (fallo 7) y no necesita puerta positiva: la rama del editor de cuentas (screens.tsx) elige la forma por la puerta NEGATIVA de su hermana — sin accounts.opening despierto, la forma es siempre la de movimiento; accounts.opening gobierna la otra forma",
  "archive.hide-period": "los verbos del Archivo llevan sus asientos (archive.hide-selection en historial.tsx, archive.restore-span/delete-span en archivo.tsx); este declara la adjudicación del periodo apartado",
  "cards.ficha": "la ficha se gobierna campo a campo (cards.add-full gobierna la forma completa en cards.tsx; scan.card-capture, la captura): el asiento declara la adjudicación de la ficha entera en Completo",
  "cards.group": "el grupo de tarjetas pinta por composición dentro del lado Debo de Cobros (debts.tsx); su subgrupo de premios lleva cards.rewards-group",
  "cobros.timeline": "la línea de tiempo ES el libro de Cobros: su ordenación no es un widget con puerta, es la composición del libro (debts.tsx); sus lentes llevan sus asientos",
  "scan.receipt": "la hoja de escaneo nace por composición (share-inbox.tsx la monta; receipt-scan.tsx puertea sus filas con scan.receipt-full-review y scan.receipt-rewards-row); la entrada es de Esencial por el fallo 16",
  "settings.catalog-add": "el formulario de alta del CatalogEditor pinta sin puerta por adjudicación escrita en screens.tsx: añadir es Esencial; administrar lleva settings.catalog-admin",
  "subs.fixed-exists": "la existencia del libro de Cuotas se deriva en el hub (shell.tsx: la sección y su parada gate(\"books.subs\")); el asiento declara el fallo de que los cargos fijos existen y se leen en Esencial",
  "tools.converter": "el convertidor nace en Esencial y no tiene piso inferior que ocultar (instruments.tsx); sus verbos finos llevan sus asientos (tools.converter-send, tools.converter-chips-admin)",
  "tools.rate-view": "ver la tasa es de Esencial (instruments.tsx y la tasa del escritorio); refrescarla y fijarla a mano llevan tools.rate-refresh y tools.rate-manual",
  "vault.retiro-sheet": "la hoja del estado de cuenta de la serie de fábrica se revisa dentro del flujo de lectura del estado (stmt-scan.tsx, cuya entrada lleva scan.retirement-stmt); el asiento declara la adjudicación de la hoja completa en Completo",
};

describe("ola9 · §A: el censo de consumidores — ningún asiento fantasma", () => {
  it("todo asiento nombrado por el mapa §10 tiene un consumidor real o una exención escrita", () => {
    assert.ok(MAP_SEATS.size >= 95, `el censo deriva del mapa de verdad (${MAP_SEATS.size} asientos)`);
    for (const seat of MAP_SEATS) {
      assert.ok(consumed(seat) || seat in EXENTOS,
        `${seat}: el mapa lo nombra y nadie lo consume — un asiento fantasma (así nacieron CARA-1 y CARA-2)`);
    }
  });
  it("la higiene de las exenciones: cada una nombra un asiento del mapa que hoy no tiene consumidor textual", () => {
    for (const seat of Object.keys(EXENTOS)) {
      assert.ok(MAP_SEATS.has(seat), `${seat}: la exención nombra un asiento que el mapa ya no nombra — exención podrida`);
      assert.ok(!consumed(seat), `${seat}: ya tiene un consumidor textual — la exención sobra y debe morir`);
    }
  });
  it("los dos fantasmas probados no vuelven: el mapa ya no nombra accounts.panel ni vault.retiro-fields", () => {
    assert.ok(!MAP_SEATS.has("accounts.panel"),
      "accounts.panel no gobernaba nada (el panel se ancla en accounts.panel-simple y su desglose en nature.class-saldo): sus temas se re-asientan, el fantasma no se exime");
    assert.ok(!MAP_SEATS.has("vault.retiro-fields"),
      "vault.retiro-fields no gobernaba nada (la forma de Retiro no lleva puerta): su tema se re-asienta a vault.retiro");
  });
});

/* ── §A-bis (OLA 10 · CARA-3): EL DESNUDADO, PROBADO EN SUS ESQUINAS ──
 * El espécimen de la caza (M-c) y las esquinas que un lexer ingenuo se
 * comería: la URL dentro de una cadena no es un comentario, el /* dentro
 * de una cadena no abre un comentario, y el apóstrofo de un texto no
 * abre una cadena que se trague la puerta siguiente. */
describe("ola9 · §A-bis: el desnudado de comentarios no cuenta papel ni se come código", () => {
  it("M-c: un comentario al final de línea con el asiento entre comillas NO cuenta como consumo", () => {
    const muerto = `const open = true; // la puerta muerta de "accounts.add" ya no se consulta\nexport const x = open;`;
    assert.ok(!stripComments(muerto).includes('"accounts.add"'),
      "la mención vive en un comentario de cola: contarla resucita una puerta muerta (espécimen de la caza)");
  });
  it("un comentario de bloque con el asiento entre comillas tampoco cuenta, en cualquier posición", () => {
    assert.ok(!stripComments(`const a = 1; /* "cards.ficha" */ const b = 2;`).includes('"cards.ficha"'));
    assert.ok(!stripComments(`/* "cards.ficha" */\nconst b = 2;`).includes('"cards.ficha"'));
  });
  it("la puerta viva tras un comentario en la misma línea SÍ cuenta", () => {
    const vivo = `const g = has(/* el gobernador */ "cards.ficha");`;
    assert.ok(stripComments(vivo).includes('"cards.ficha"'), "el comentario se va; la llamada queda");
  });
  it("las cadenas no se desnudan: la URL y el // dentro de una cadena sobreviven", () => {
    const t = stripComments(`const u = "https://example.com/a//b"; const g = has("tools.rate-view");`);
    assert.ok(t.includes("https://example.com/a//b"), "una URL en una cadena no es un comentario");
    assert.ok(t.includes('"tools.rate-view"'), "la puerta tras la cadena sigue contando");
  });
  it("el /* dentro de una cadena no abre un comentario que se trague la puerta", () => {
    const t = stripComments(`const s = "/*"; const g = has("subs.fixed-exists");`);
    assert.ok(t.includes('"subs.fixed-exists"'));
  });
  it("la plantilla tampoco: el // dentro de un literal de plantilla es texto", () => {
    const t = stripComments("const s = `a//b ${1 + 1}`; const g = has(\"cards.ficha\");");
    assert.ok(t.includes("a//b") && t.includes('"cards.ficha"'));
  });
  it("el apóstrofo de un texto no abre una cadena: la puerta de la misma línea sobrevive", () => {
    const t = stripComments(`const el = <p>Don't wait</p>; const g = has("subs.fixed-exists");`);
    assert.ok(t.includes('"subs.fixed-exists"'), "si el apóstrofo abriera cadena, la puerta quedaría dentro de ella o tras un comentario falso");
  });
  it("la regex por contexto no se confunde con comentario ni se come la puerta", () => {
    const t = stripComments(`const ok = /^https?:\\/\\//.test(u); const g = has("tools.rate-view");`);
    assert.ok(t.includes('"tools.rate-view"'), "los \\/\\// de la regex no son un comentario de línea");
  });
});

/* ═══════════ §B · LOS TEMAS RE-ASENTADOS (CARA-1/2 y la hermana) ═══════
 * El tema sigue al asiento que GOBIERNA su superficie, no al que el
 * mapa soñaba. El formulario de movimiento de cuentas trabaja en
 * Esencial (la rama que lo pinta no conoce accounts.panel: en Esencial
 * siempre es el formulario de movimiento, fallo 7: accounts.move = E);
 * la forma de dar de alta una cuenta ES accounts.add (la envuelve su
 * has()); y «Acumulado si no se toca» se monta dentro de la forma de
 * Retiro, cuyo bolsillo gobierna vault.retiro = R. */
describe("ola9 · §B: los temas caídos se re-asientan a su gobernador real", () => {
  it("cuenta-movimiento y f-cuenta-monto viven en Esencial, bajo accounts.move", () => {
    assert.equal(modeOf("cuenta-movimiento"), "esencial", "el (?) del movimiento anuncia el modo donde el formulario trabaja");
    assert.equal(modeOf("f-cuenta-monto"), "esencial", "el (?) del importe, la misma verdad");
    assert.equal(FEATURES["accounts.move"], "esencial", "el registro confirma el asiento (fallo 7)");
  });
  it("f-cuenta-nombre vive en Ritmo, bajo accounts.add — su forma sí lleva la puerta", () => {
    assert.equal(modeOf("f-cuenta-nombre"), "ritmo");
    assert.equal(FEATURES["accounts.add"], "ritmo", "la forma de alta se envuelve en has(\"accounts.add\") en screens.tsx");
  });
  it("f-retiro-acumulado vive en Ritmo, bajo vault.retiro — la cara que lo pinta", () => {
    assert.equal(modeOf("f-retiro-acumulado"), "ritmo", "el campo pinta y se lee en la forma de Retiro de Ritmo; Completo era el fantasma");
    assert.equal(FEATURES["vault.retiro"], "ritmo");
  });
  it("la fuente ata los temas a la forma sin puerta: ningún has() nombra a los fantasmas", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('topic="cuenta-movimiento"') && screens.includes('topic="f-cuenta-monto"'),
      "los dos (?) se montan en el formulario de movimiento de screens.tsx");
    assert.ok(!CORPUS.includes('has("accounts.panel")') && !CORPUS.includes('has("vault.retiro-fields")'),
      "ninguna puerta del árbol nombra a los fantasmas: por eso el cruce contra ellos quedaba verde");
  });
});

/* ═══════════ §C · CARA-3: «tiendas» sigue a su función ═══════════════════
 * El tema enseñaba en Esencial «Toca una para mostrarla u ocultarla»,
 * un toque que en Esencial no existe en ninguna superficie: el único
 * (?) del tema se monta en la tira del engranaje del libro Compras, que
 * es cara de Ritmo, y su propio go ya confesaba el piso. El tema se
 * re-asienta a Ritmo ENTERO — la enseñanza de mostrar/ocultar se queda,
 * porque en su piso es verdad — y crear/elegir tiendas en el momento de
 * uso lo siguen enseñando en Esencial f-tienda y f-cat-compra
 * (settings.catalog-add), que es donde la mano crea de verdad. */
describe("ola9 · §C: «tiendas» vive donde vive su toque", () => {
  it("el tema es de Ritmo, bajo books.shops — el asiento de su único (?) y de su go", () => {
    assert.equal(modeOf("tiendas"), "ritmo", "en Esencial el tema dormía tras un anuncio falso; su superficie es la tira de Ritmo");
    assert.equal(FEATURES["books.shops"], "ritmo");
  });
  it("la enseñanza de mostrar/ocultar NO se borra: se queda, verdadera en su piso", () => {
    const t = MANUAL_TOPICS.find((x) => x.id === "tiendas");
    assert.ok(t!.what[0]!.includes("mostrarla u ocultarla"),
      "la cláusula era verdad en Ritmo y mentira en Esencial: la cura mueve el tema, no amputa la enseñanza");
  });
});

/* ═══════════ §D · LA DEUDA DE REGISTRO: books.shop-catalog-gear ═════════
 * El engranaje del catálogo de tiendas pinta y trabaja en Ritmo —
 * dentro de la sección del libro gobernada por books.shops — haciendo
 * exactamente el negocio de Ritmo (administrar el catálogo), y el
 * registro lo declaraba de Completo sin un solo consumidor que lo
 * desmintiera en una cara. Higiene del registro: el asiento dice el
 * piso donde su superficie trabaja; ninguna cara cambia. */
describe("ola9 · §D: books.shop-catalog-gear declara el piso donde trabaja", () => {
  it("el asiento es de Ritmo, como la tira que pinta", () => {
    assert.equal(FEATURES["books.shop-catalog-gear"], "ritmo",
      "declarado en Completo, el registro mentía sobre una superficie de Ritmo que ninguna cerca cruzaba");
  });
});

/* ═══════════ §E · E9-1: LA FAMILIA SE DERIVA DE LAS BANDERAS ═══════════
 * La §F de la ola 8 censaba las familias por ORTOGRAFÍA: conocía los
 * sufijos {h, c, r} y nada más. Dos especímenes escenificados por
 * Enseñanza IX lo probaron con la suite entera verde: una variante
 * verdadera con sufijo -x (m19-balanza-x, con su bandera de modo) no
 * heredaba puente alguno, y una lección inocente con sufijo -r y SIN
 * bandera heredaba el tema «libros» por su sola ortografía. Hoy
 * ortografía y condición de variante coinciden exactamente en el guion
 * (271 escenas) — y esta cerca lo FIJA en los dos sentidos: la variante
 * es la que lleva bandera (mode / notMode / minMode), y el sufijo solo
 * vale si la bandera lo acompaña y sceneBase sabe desnudarlo. */
const sceneBase = (id: string) => id.replace(/-(h|c|r)$/, "");
const SCENE_TOPIC: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_SCENES)
    .filter(([, t]) => t.moduleId !== "manual")
    .map(([topic, t]) => [t.sceneId, topic]),
);
const topicByBase: Record<string, string> = {};
for (const [sceneId, topic] of Object.entries(SCENE_TOPIC)) topicByBase[sceneBase(sceneId)] = topic;
const inherited = (id: string) => SCENE_TOPIC[id] ?? topicByBase[sceneBase(id)];
const flagged = (s: Scene) => s.mode !== undefined || s.notMode !== undefined || s.minMode !== undefined;

describe("ola9 · §E: la familia de escenas se deriva de las banderas, no de la ortografía", () => {
  it("ortografía ⇒ bandera: toda escena con sufijo de una letra es una variante declarada", () => {
    for (const mod of MODULES) for (const s of mod.scenes) {
      if (!/-[a-z]$/.test(s.id)) continue;
      assert.ok(flagged(s),
        `${mod.id}/${s.id}: termina en sufijo de variante pero no lleva bandera de modo — heredaría (o perdería) el puente por su sola ortografía (espécimen m3-fijos-r)`);
    }
  });
  it("bandera ⇒ sufijo conocido: toda variante usa una letra que sceneBase desnuda (h, c, r)", () => {
    for (const mod of MODULES) for (const s of mod.scenes) {
      if (!flagged(s)) continue;
      const m = /-([a-z])$/.exec(s.id);
      if (!m) continue;
      assert.ok(["h", "c", "r"].includes(m[1]!),
        `${mod.id}/${s.id}: variante con sufijo -${m[1]}, que sceneBase no desnuda — su familia no la ata y su puente no llega (espécimen m19-balanza-x)`);
    }
  });
  it("el puente es de la familia por banderas: dentro de una familia, toda variante hereda lo mismo", () => {
    /* OLA 10 (E10-1): la familia se agrupa por base GLOBAL, no por
     * módulo — topicByBase, el algoritmo, no conoce módulos, y medir con
     * un ámbito más estrecho que el suyo dejaba fuera de la foto a una
     * familia repartida entre dos módulos. Hoy ninguna base vive en dos
     * módulos y el agrupamiento coincide con el local; la herencia
     * cruzada en sí la acusa la §G de modos-ola10. */
    const gbase = (id: string) => id.replace(/-[a-z]$/, "");
    const fams = new Map<string, Scene[]>();
    for (const mod of MODULES) for (const s of mod.scenes) {
      const g = gbase(s.id);
      fams.set(g, [...(fams.get(g) ?? []), s]);
    }
    for (const [g, members] of fams) {
      if (members.length < 2) continue;
      const topics = new Set(members.filter(flagged).map((s) => inherited(s.id) ?? null));
      assert.ok(topics.size <= 1,
        `familia ${g}: las variantes heredan puentes distintos (${[...topics].join(", ")}) — una cara quedó fuera del puente de su familia`);
    }
  });
  it("toda variante con sufijo comparte su base con una hermana de su módulo (la §F, ahora por banderas)", () => {
    for (const mod of MODULES) {
      const scenes = mod.scenes;
      for (const s of scenes) {
        if (!flagged(s) || !/-(h|c|r)$/.test(s.id)) continue;
        const b = sceneBase(s.id);
        assert.ok(scenes.some((o) => o.id !== s.id && sceneBase(o.id) === b),
          `${mod.id}/${s.id}: su base ${b} no la comparte ninguna hermana — la variante quedó fuera de su familia`);
      }
    }
  });
});
