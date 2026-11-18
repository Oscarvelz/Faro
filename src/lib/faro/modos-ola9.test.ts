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

function corpus(): string {
  const root = new URL("../../", import.meta.url);
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
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
  "settings.templates": "las plantillas pintan dentro de la tarjeta de estructura, gobernada por settings.structure-card (screens.tsx); el asiento declara su adjudicación en Completo",
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
    const gbase = (id: string) => id.replace(/-[a-z]$/, "");
    for (const mod of MODULES) {
      const fams = new Map<string, Scene[]>();
      for (const s of mod.scenes) {
        const g = gbase(s.id);
        fams.set(g, [...(fams.get(g) ?? []), s]);
      }
      for (const [g, members] of fams) {
        if (members.length < 2) continue;
        const topics = new Set(members.filter(flagged).map((s) => inherited(s.id) ?? null));
        assert.ok(topics.size <= 1,
          `${mod.id}/${g}: las variantes de la familia heredan puentes distintos (${[...topics].join(", ")}) — una cara quedó fuera del puente de su familia`);
      }
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
