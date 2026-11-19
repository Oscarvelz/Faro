/**
 * FARO — OLA 11 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: EL APARTADO FUERA DEL CENSO DE LA .316, LA PROSA
 * DE LOS VECINOS, Y TRES CENSOS QUE CONTABAN TEXTO EN VEZ DE GOBIERNO.
 * La adjudicación «apartar no es salir» (OBS-A7-1) barrió la librería en la
 * .316 y dejó tres superficies vivas fuera de su censo: el río de la Lectura
 * titulaba «Todo lo que salió» sobre la suma con apartado y el apartado
 * encabezaba «los gastos que más pesaron» (BR11-1); el insight «Contra el
 * mes anterior» acusaba gasto cuando solo crecía el apartado, contándolo dos
 * veces (BR11-2); los puntos del Estudio definían expense = todo lo
 * no-ingreso y alimentaban el «Salió» de la TimeCard también en Esencial
 * (BR11-3). La prosa de f-categoria y f-sub enseñaba en Esencial los verbos
 * de Ritmo (CARA-1/2) tras un escaneo de doctrina de lista de dos; el censo
 * de consumidores contaba menciones de texto como gobierno y condenaba como
 * fantasma a un asiento gobernado por una puerta dinámica (CARA-3/4); el
 * censo de testigos medía formas de declaración y no llamadas (G11-1);
 * CardForm guardaba la foto entera del borrador contra el registro vivo
 * (G11-2) y resucitaba en silencio una tarjeta borrada (C11-1); y los
 * destinos exactos de TOPIC_SCENES solo estaban clavados por lista para 6
 * de 23 puentes (E11-1). Cada familia queda clavada aquí con su espécimen
 * corriendo rojo antes y verde después. Donde la rotura vive en un
 * componente, la cerca es de fuente y el banco CDP de la ronda la acompaña
 * (shots-cura11/).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { buildInsights, compareSpans, roleOf, spanPoints, studyBoard, summarize, yearPoints } from "./engine.ts";
import type { LedgerState, Line } from "./types.ts";
import { CHAPTER_MODE, MANUAL_CHAPTERS, MANUAL_TOPICS, findTopic, topicMode, type Topic } from "../manual/topics.ts";
import { FEATURES } from "./mode.ts";
import { MODULES, TOPIC_SCENES } from "./guion.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ── Libros de ficción (jamás producción): la forma de los especímenes de
 * la caza (bench-ola11/ases11*.ts). El apartado vive en la categoría semilla
 * de ahorro «f-ahorro» (role savings), como gasto fijo — la forma exacta
 * que la .316 no alcanzó fuera de la librería. ─────────────────────────── */
let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (months: Record<string, Line[]>): LedgerState => {
  const b = createInitial("es", "claro");
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const ingreso = (key: string, minor = 3_000_000) => line({ kind: "income-fixed", concept: "Salario", amountMinor: minor }, key);
const gasto = (key: string, minor: number) => line({ kind: "expense-variable", concept: "Mercado", amountMinor: minor }, key);
const apartado = (key: string, minor: number) =>
  line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: minor, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key);

/* ═══════════ §A · BR11-2: EL RESUMEN Y EL INSIGHT CUENTAN GASTO ════════
 * El espécimen de la caza (ases11b): gasto idéntico en ambos meses
 * (C$27,000) y el apartado crece de 0 a C$9,000. La base acusa: «Gastaste
 * C$9,000.00 más que el mes pasado» en tono warn — y al revés felicita.
 * La cura: summarize gana `spend` (las clases de gasto sin el rol ahorro,
 * la definición del coach por rol) y spentPct hereda esa verdad; `expense`
 * NO se mueve (es la salida por clases de la que vive opportunity, lo
 * libre — tocarla mentiría al revés); el insight compara gasto con gasto
 * en ambos lados. */
const momBook = () => book({
  "2026-10": [ingreso("2026-10"), gasto("2026-10", 2_700_000)],
  "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_700_000), apartado("2026-11", 900_000)],
});
const momBookR = () => book({
  "2026-10": [ingreso("2026-10"), gasto("2026-10", 2_700_000), apartado("2026-10", 900_000)],
  "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_700_000)],
});

describe("§A · BR11-2 — summarize: spend es solo-gasto; expense (lo libre) no se mueve", () => {
  it("la semilla del espécimen es la categoría de ahorro", () => {
    const b = momBook();
    assert.equal(roleOf(b.structure, "f-ahorro"), "savings");
  });
  it("spend excluye el apartado; expense y savingsFlow quedan como la base", () => {
    const s = summarize(momBook(), "2026-11", "es");
    assert.equal(s.spend, 2_700_000);
    assert.equal(s.expense, 3_600_000); // la salida por clases, intacta: de ella vive opportunity
    assert.equal(s.savingsFlow, 900_000);
    assert.equal(s.opportunity, 3_000_000 - 3_600_000); // lo libre sigue sin contar el apartado como libre
  });
  it("el resumen es coherente consigo mismo: spend + apartado-en-clases = expense", () => {
    const s = summarize(momBook(), "2026-11", "es");
    assert.equal(s.spend + s.savingsFlow, s.expense);
  });
  it("spentPct hereda la verdad: 90% gastado, no 120%", () => {
    const s = summarize(momBook(), "2026-11", "es");
    assert.equal(s.spentPct, 90);
  });
});

describe("§A · BR11-2 — «Contra el mes anterior» compara gasto con gasto", () => {
  const mom = (b: LedgerState, key: string) =>
    buildInsights(b, key, "es", makeNamer(b.structure, "es")).find((i) => i.id === "mom")!;
  it("solo creció el apartado → «Gastaste lo mismo», sin warn", () => {
    const m = mom(momBook(), "2026-11");
    assert.equal(m.value, "=");
    assert.match(m.detail, /^Gastaste lo mismo que el mes pasado/);
    assert.notEqual(m.tone, "warn");
  });
  it("al revés (el apartado bajó, el gasto no) → tampoco felicita por gastar menos", () => {
    const m = mom(momBookR(), "2026-11");
    assert.equal(m.value, "=");
    assert.match(m.detail, /^Gastaste lo mismo que el mes pasado/);
  });
  it("control vivo: si el GASTO sí sube, el insight acusa el gasto, sin el apartado", () => {
    const b = book({
      "2026-10": [ingreso("2026-10"), gasto("2026-10", 2_700_000), apartado("2026-10", 900_000)],
      "2026-11": [ingreso("2026-11"), gasto("2026-11", 3_000_000), apartado("2026-11", 900_000)],
    });
    const m = mom(b, "2026-11");
    assert.equal(m.tone, "warn");
    assert.match(m.detail, /^Gastaste C\$3,000\.00 más que el mes pasado/);
  });
});

/* ═══════════ §A · BR11-3: LOS PUNTOS DEL ESTUDIO ═══════════════════════
 * expense en yearPoints/spanPoints/compareSpans era «todo lo no-ingreso»:
 * el «Salió» de la TimeCard, el «mes de más gasto», las barras del año y la
 * columna «Gastos» de la hoja Flujo sumaban el apartado como gasto. La
 * cura: expense = solo-gasto (la definición del coach) y el punto gana
 * `saved` — el trío puede nombrar el apartado aparte y el neto en efectivo
 * (income − expense − saved) sigue siendo derivable y verdadero. */
describe("§A · BR11-3 — los puntos: expense solo-gasto, saved nombrado aparte", () => {
  it("yearPoints: noviembre gasta 27,000, aparta 9,000, entran 30,000", () => {
    const pts = yearPoints(momBook(), 2026, "es");
    const nov = pts.find((p) => p.key === "2026-11")!;
    assert.equal(nov.income, 30000);
    assert.equal(nov.expense, 27000);
    assert.equal(nov.saved, 9000);
    const oct = pts.find((p) => p.key === "2026-10")!;
    assert.equal(oct.expense, 27000);
    assert.equal(oct.saved, 0);
  });
  it("spanPoints (mes): los tramos suman el mismo gasto y el mismo apartado", () => {
    const pts = spanPoints(momBook(), 2026, 11, "month", "es");
    assert.equal(pts.reduce((a, p) => a + p.expense, 0), 27000);
    assert.equal(pts.reduce((a, p) => a + p.saved, 0), 9000);
  });
  it("compareSpans (años): el punto del año hereda la misma verdad", () => {
    const pts = compareSpans(momBook(), 2026, 11, "year", 3, "es");
    const y2026 = pts.find((p) => p.key === "2026")!;
    assert.equal(y2026.expense, 54000);
    assert.equal(y2026.saved, 9000);
  });
  it("el «Gasto por día» del tablero (studyBoard) no quema el apartado, en ningún lado", () => {
    const b = book({
      "2026-09": [ingreso("2026-09"), gasto("2026-09", 3_000_000), apartado("2026-09", 600_000)],
      "2026-10": [ingreso("2026-10"), gasto("2026-10", 3_100_000), apartado("2026-10", 500_000)],
    });
    const board = studyBoard(b, "2026-10", "es", makeNamer(b.structure, "es"));
    assert.equal(board.burn, Math.round(3_100_000 / 31));
    assert.equal(board.burnPrev, Math.round(3_000_000 / 30));
  });
});

/* ═══════════ §A · BR11-1: EL RÍO DE LA LECTURA ═════════════════════════
 * El dato ya era verdad desde la .316 (outTotal = movimiento, realSpend =
 * gasto, transferMinor nombrado): lo que mentía era la cara — el título
 * «Todo lo que salió» sobre outTotal y la lista «Los gastos que más
 * pesaron» ordenando TODAS las líneas, apartado incluido. La cura nombra
 * el total como movimiento (la forma «movió» del motor) y la lista de
 * gastos no lleva ninguna línea de apartado. */
describe("§A · BR11-1 — el río: el total se nombra movimiento y la lista es de gastos", () => {
  it("el dato de la Lectura sostiene la cura (contrato intacto de la .316)", () => {
    const r = readAdvisor(momBook(), "2026-11", "es", makeNamer(momBook().structure, "es"));
    assert.equal(r.outTotal, 3_600_000);
    assert.equal(r.realSpend, 2_700_000);
    assert.equal(r.transferMinor, 900_000);
    assert.ok(r.lines.some((l) => l.cls === "transfer" && l.minor === 900_000));
  });
  it("la cara: el título del río es la forma «se movió», no «salió»", () => {
    const src = SRC("../../components/faro/advisor2.tsx");
    const seg = src.slice(src.indexOf("function ShortVisual"), src.indexOf("export function MediumVisual"));
    assert.ok(seg.length > 0);
    assert.ok(!seg.includes("Todo lo que salió"), "el río ya no titula «salió» sobre el movimiento");
    assert.ok(!seg.includes("Everything that went out"));
    assert.ok(seg.includes("Todo lo que se movió"));
    assert.ok(seg.includes("Everything that moved"));
  });
  it("la cara: la lista de los gastos que más pesaron excluye las líneas transfer", () => {
    const src = SRC("../../components/faro/advisor2.tsx");
    const seg = src.slice(src.indexOf("function ShortVisual"), src.indexOf("export function MediumVisual"));
    assert.match(seg, /filter\(\(l\) => l\.cls !== "transfer"\)/);
  });
});

/* ═══════════ §A · LA CERCA DE LA CLASE: EL CENSO DEL APARTADO ══════════
 * Toda superficie que agrega líneas con un productor del motor queda
 * clasificada: «gasto» (solo-gasto: el apartado jamás dentro), «movimiento»
 * (el total se nombra como movimiento/flujo y el apartado va nombrado
 * aparte en la misma superficie) o «interna» (composición sin etiqueta
 * propia: la cara que la presenta tiene su propia entrada). El censo se
 * DERIVA del árbol: escanea los sitios reales de llamada/definición de los
 * productores; una superficie nueva sin clasificar corre roja, y una
 * entrada muerta (la superficie ya no existe) también.
 * OLA 13 (E13-1): el censo aprende a ver REBANADAS — spendCategorySlices
 * entra en los productores y cada consumidor de rebanadas queda
 * clasificado por el reclamo de su cara: «gasto» las que su rótulo nombra
 * gasto (el donut del Estudio, la hoja Categorias), «movimiento» las que
 * componen por categoría y nombran su composición (el widget, la página
 * del Estudio en PDF, el sankey vía cashSankey), «interna» la que compone
 * otra cara clasificada (el top del año). Un consumidor nuevo de
 * rebanadas sin clasificar acusa como cualquier superficie. */
describe("§A · el censo del apartado: toda superficie agregadora, clasificada", () => {
  const PRODUCERS = [
    "summarize", "yearPoints", "spanPoints", "compareSpans", "studyBoard",
    "buildInsights", "readCoach", "readAdvisor", "yearReport", "monthTotals",
    "categorySlices", "spendCategorySlices", "cashSankey",
  ] as const;
  type Clase = "gasto" | "movimiento" | "interna";
  const REGISTRO: Record<string, [Clase, string]> = {
    "components/faro/panorama.tsx:readCoach": ["gasto", "el coach separa el apartado por rol (monthTotals); Panorama presenta esas frases"],
    "components/faro/provider.tsx:buildInsights": ["gasto", "las notas del Asesor; «Contra el mes anterior» compara gasto con gasto tras la cura"],
    "components/faro/provider.tsx:spendCategorySlices": ["gasto", "las rebanadas del proveedor alimentan UNA cara, el donut del Estudio bajo «En qué se va el gasto»: solo-gasto desde BR13-A3"],
    "components/faro/provider.tsx:summarize": ["interna", "compone el Summary que las caras etiquetan; las etiquetas viven en las caras"],
    "components/faro/screens.tsx:cashSankey": ["movimiento", "flujos con nombre propio, el ahorro es un destino nombrado"],
    "components/faro/screens.tsx:compareSpans": ["gasto", "hereda pair: los tramos comparados suman solo-gasto y saved aparte"],
    "components/faro/screens.tsx:readAdvisor": ["movimiento", "la Lectura en Central: «Sale» (outTotal) junto a «Gasto real» (realSpend), la pareja nombrada"],
    "components/faro/screens.tsx:spanPoints": ["gasto", "la TimeCard («Salió») y el panel de corte, que recompone expense+saved para su total de herramienta"],
    "components/faro/screens.tsx:studyBoard": ["gasto", "«Gasto por día» (burn/burnPrev) solo-gasto en ambos lados tras la cura"],
    "components/faro/screens.tsx:yearReport": ["movimiento", "«Sale» sobre el año y la sección de lo guardado en la misma tarjeta"],
    "lib/faro/advisor.ts:readAdvisor": ["movimiento", "la definición: outTotal = movimiento, realSpend = solo-gasto, transferMinor nombrado «Al ahorro»"],
    "lib/faro/area-advice.ts:readAdvisor": ["interna", "re-presenta la Lectura ya clasificada; no agrega sumas propias"],
    "lib/faro/awake.ts:readAdvisor": ["interna", "despierta lecturas; no presenta sumas"],
    "lib/faro/coach.ts:monthTotals": ["gasto", "la definición doctrinal: income / expense / saved separados por rol"],
    "lib/faro/coach.ts:readAdvisor": ["interna", "el coach compone sobre la Lectura"],
    "lib/faro/coach.ts:readCoach": ["gasto", "la definición del coach: presenta monthTotals"],
    "lib/faro/engine.ts:buildInsights": ["gasto", "la definición; la mom curada compara gasto con gasto"],
    "lib/faro/engine.ts:cashSankey": ["movimiento", "la definición: flujos nombrados"],
    "lib/faro/engine.ts:categorySlices": ["movimiento", "la definición: rebanadas por categoría con su nombre"],
    "lib/faro/engine.ts:spendCategorySlices": ["gasto", "la definición (BR13-A3): la pila del gasto — sin el rol ahorro, con el corte ANTES del pliegue"],
    "lib/faro/engine.ts:compareSpans": ["gasto", "la definición sobre pair"],
    "lib/faro/engine.ts:readAdvisor": ["interna", "composición: buildInsights y studyBoard leen la Lectura"],
    "lib/faro/engine.ts:spanPoints": ["gasto", "la definición sobre pair"],
    "lib/faro/engine.ts:studyBoard": ["gasto", "la definición; el burn curado quema solo gasto"],
    "lib/faro/engine.ts:summarize": ["interna", "la definición: expense = salida por clases (de ella vive lo libre); spend = solo-gasto; spentPct = spend"],
    "lib/faro/engine.ts:yearPoints": ["gasto", "la definición: expense solo-gasto y saved aparte tras la cura"],
    "lib/faro/export-docs.ts:categorySlices": ["movimiento", "la página del Estudio en el PDF: barras nombradas por categoría bajo «A dónde se va»; la de ahorro se nombra ahorro"],
    "lib/faro/export-docs.ts:spendCategorySlices": ["gasto", "la hoja «Categorias» («A dónde se va el gasto»): solo-gasto desde BR13-A3"],
    "lib/faro/export-docs.ts:summarize": ["movimiento", "hoja Resumen: cada clase con su nombre, sin total «gastos»; «Queda» = opportunity; «Ahorro del mes» = savingsFlow"],
    "lib/faro/export-docs.ts:yearPoints": ["gasto", "hoja «Flujo» (columna «Gastos») y las barras del Estudio, sobre los puntos curados"],
    "lib/faro/remesas.ts:summarize": ["interna", "lee remittance del resumen; no nombra gasto"],
    "lib/faro/rules.ts:readAdvisor": ["interna", "las reglas leen la Lectura; no presentan sumas"],
    "lib/faro/today.ts:summarize": ["interna", "lee opportunity (lo libre); no nombra gasto"],
    "lib/faro/widget.ts:categorySlices": ["movimiento", "rebanadas del widget con su nombre"],
    "lib/faro/widget.ts:summarize": ["movimiento", "flujos entra/sale del widget; usedPct = spentPct, solo-gasto tras la cura"],
    "lib/faro/year.ts:categorySlices": ["interna", "compone el top del año; la cara clasificada es YearCard (screens:yearReport)"],
    "lib/faro/year.ts:summarize": ["interna", "compone YearReport sumando los meses"],
    "lib/faro/year.ts:yearReport": ["movimiento", "la definición; su cara nombra «Sale» y muestra lo guardado en la misma tarjeta"],
  };
  const walk = (dir: URL, prefix: string): string[] => {
    const out: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) out.push(...walk(new URL(`${e.name}/`, dir), `${prefix}${e.name}/`));
      else if (/\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push(`${prefix}${e.name}`);
    }
    return out;
  };
  it("el escaneo derivado y el registro coinciden exactamente, con clase y razón", () => {
    const root = new URL("../../", import.meta.url);
    const found = new Set<string>();
    for (const rel of walk(root, "")) {
      const text = readFileSync(new URL(rel, root), "utf8");
      for (const p of PRODUCERS) {
        if (new RegExp(`\\b${p}\\s*\\(`).test(text)) found.add(`${rel}:${p}`);
      }
    }
    for (const key of found) {
      assert.ok(REGISTRO[key], `superficie agregadora SIN CLASIFICAR: ${key} — clasifícala (gasto / movimiento / interna) con su razón`);
    }
    for (const [key, [clase, razon]] of Object.entries(REGISTRO)) {
      assert.ok(found.has(key), `entrada muerta del censo: ${key} — la superficie ya no existe; retira la entrada`);
      assert.ok(["gasto", "movimiento", "interna"].includes(clase), `${key}: clase inválida`);
      assert.ok(razon.length > 10, `${key}: la clasificación lleva su razón escrita`);
    }
  });
});

/* ═══════════ §B · CARA-1/2: LA PROSA DE LOS VECINOS ════════════════════
 * La §B de la ola 10 clavó la doctrina en DOS temas nombrados
 * (f-tienda-elegir, f-cat-elegir) — y la enfermedad vivía en los vecinos:
 * f-categoria enseñaba en Esencial «cambia nombre y color u oculta varias
 * con una confirmación» (CARA-1) y f-sub «renombra u oculta en la misma
 * hoja» (CARA-2), sobre la mano de solo renombre. La frase fresca
 * escenificada por la caza en f-tienda pasó 96/96 verde: la lista no
 * guarda la clase. Y al derivar el escaneo, la cerca cazó un tercer
 * ejemplar que la caza no vio: libro-herramientas (piso Esencial) enseña
 * la mano de multiselección de los libros (books.multiselect = Ritmo):
 * borrar varias con una sola confirmación y cambiarles el color con el
 * lápiz, sin atribuir.
 *
 * LA CURA DE LA CLASE: el escaneo se DERIVA del censo de temas por piso
 * (MANUAL_TOPICS + topicMode, la misma fuente del runtime): toda frase de
 * un tema cuyo piso no posee un verbo gobernado (ocultar datos, recolorear,
 * borrar en masa, fusionar — las manos de administración cuyos asientos
 * viven en Ritmo) debe nombrar a Ritmo EN LA MISMA FRASE, o el tema sube.
 * Dos absoluciones con su doctrina escrita: ocultar cuyo objeto es el
 * cromo o la privacidad (la barra de navegación, los montos tras puntos)
 * no es el verbo gobernado — no administra datos del libro; y nombrar el
 * piso en la frase ES la atribución, venga como [[Ritmo]] o como «de
 * Ritmo». La familia de verbos de Completo está vacía hoy por
 * adjudicación: ningún verbo se ha declarado solo-de-Completo en prosa
 * (las [[Plantillas]] se nombran con el tratamiento de nombre oficial,
 * asentado en la caza de la ola 11); el día que uno se declare, entra en
 * la tabla y la escalera lo aplica a los temas de Ritmo. */
describe("§B · la doctrina derivada del censo por piso (CARA-1/2 y la clase)", () => {
  /* Ola 12 (CARA-2): la derivación dejó de derivar a medias — la ola 11
   * derivó los TEMAS y dejó enumerados los verbos, los campos y la
   * absolución, y la enfermedad subió un nivel (cuatro mutaciones de la
   * caza corrían verdes). Ahora: los CAMPOS se recogen caminando el
   * registro del tema (todo par ES/EN que la cara puede pintar — what,
   * how, tip, whatAlt, sum, bubble y el que nazca mañana — entra sin
   * lista); los VERBOS trabajan por RAÍZ en los dos idiomas, con sus
   * formas (participios ingleses: merged/merging; sinónimos de la misma
   * mano: eliminar varias, unir dos); y la absolución de CROMO juzga el
   * OBJETO del verbo ocultar — la frase que respira cromo pero oculta
   * datos acusa, y solo el objeto-cromo absuelve. */
  /* OLA 13 (CARA-2): la derivación sube su tercer nivel. La ola 12 derivó
   * los campos y las raíces y la caza volvió con cuatro formas más:
   * (F) los campos que el RENDERIZADOR pinta sin ser pares — registros
   * {es,en}, campos sueltos …Es/…En, arreglos de tres — no entraban;
   * (V) la morfología viva escapaba a las raíces: «Ocúltalas» (acento y
   * enclítico), «Suprime varias», «Combina dos», «Cámbiales el color», y
   * ARCHIVAR no era familia; (A) la absolución miraba por una ventana de
   * 60 caracteres y «movimientos» no era vocabulario de datos. Ahora:
   * los campos se recogen caminando las FORMAS que el renderizador
   * pinta; las frases se juzgan con la morfología NORMALIZADA (acentos
   * plegados, minúsculas) y las familias se derivan de las MANOS
   * GOBERNADAS del registro — cada familia cita sus asientos y la cerca
   * verifica que viven en Ritmo —; la absolución juzga la FRASE ENTERA
   * con el vocabulario de datos de la propia app; MANUAL_CHAPTERS entra
   * al corpus con el piso de su línea (CHAPTER_MODE); y el escaneo se
   * extiende a los PIES DE ESCENA con el piso EFECTIVO de la escena
   * (CARA-1: m3-lapiz predicaba la mano de Ritmo en todo piso). */
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  /** Las familias de verbos gobernados y los asientos del registro que
   * las gobiernan: la familia acusa en Esencial porque su mano vive en
   * Ritmo, y la cerca lo verifica contra el registro, no contra una
   * lista escrita a mano. El recolorear de la familia es el de MASA (la
   * mano de administrar: «cámbiales», «their colour»): la paleta de UNA
   * línea es editor.icon-color, de Esencial, y su prosa es libre. El
   * marco de fusionar no enumera cantidades: verbo de juntar + cualquier
   * marca de pluralidad o unidad en la frase. */
  const FAMILIAS: { nombre: string; asientos: string[]; re: RegExp }[] = [
    { nombre: "ocultar datos", asientos: ["editor.picker-manage"], re: /ocult\w*|escond\w*|\bhid\w*\b/i },
    { nombre: "recolorear", asientos: ["editor.picker-manage"], re: /recolore\w*|recolou?r\w*|cambia nombre y color|changes name and colour|cambia\w*(?:les|las|los)\s+(?:el\s+)?color|chang\w*\s+(?:their|them)\s+colou?r|chang\w*\s+the\s+colou?r\s+of\s+(?:several|the ticked|the marked)/i },
    { nombre: "borrar en masa", asientos: ["editor.picker-manage", "books.multiselect"], re: /(?:borr|elimin|quit|suprim)\w*\s+(?:\w+\s+)?(?:varias|varios|several|many)|(?:delet|remov|purg|drop)\w*\s+(?:\w+\s+)?(?:several|many|all)\b/i },
    // OLA 14 (B2): fusionar ya no es una regex sobre la frase — es una
    // FUNCIÓN con la disciplina de ARCHIVAR (fusionarHit, abajo): la
    // regex vieja condenó tres frases inocentes («las muestra juntas»,
    // «combina dos colores», "combines two colours") porque plegaba el
    // adverbio al verbo y no exigía objeto-registro. La entrada queda
    // en la tabla por sus asientos (la cerca de pisos los verifica);
    // el juicio lo hace fusionarHit y su regex no casa nada.
    { nombre: "fusionar", asientos: ["editor.picker-manage"], re: /$^/ },
  ];
  const VERBOS_RITMO: [string, RegExp][] = FAMILIAS.filter((f) => f.nombre !== "fusionar").map((f) => [f.nombre, f.re]);
  /** FUSIONAR con la disciplina de ARCHIVAR (OLA 14 · B2): el verbo de
   * juntar acusa solo cuando LA FRASE (la que juzgar aisló — desde la
   * ola 15 el «;» no la parte: B1) lleva a la vez una marca de
   * pluralidad o unidad Y un objeto-REGISTRO (tiendas, categorías,
   * líneas, personas, tarjetas, cuentas, libros y sus gemelas
   * inglesas — «fondo» NO es objeto: es cromo). El objeto puede ir
   * antes del verbo, «…tiendas… y unir dos en una». Y el junt*
   * ADVERBIAL se absuelve: «juntas» tras un verbo de mostrar/ver/
   * quedar («las muestra juntas») es una al lado de otra, no la mano
   * de unir. Sin objeto-registro no hay mano que enseñar: combinar
   * colores es apariencia, no administración. */
  const FUSION_VERBO = /\bfusion\w*\b|\bmerg\w*\b|\bcombin\w*\b|\bjoin\w*\b|\bjunt\w*\b|\bunific\w*\b|\bun(?:e|es|en|io|idas|idos|ir)\b/gi;
  const FUSION_MARCA = /\b(?:dos|tres|varias|varios|ambas|ambos|pair|two|three|several|couple|into one|together|en una|en un|as one|in one)\b/i;
  const FUSION_OBJETO = /\btiendas?\b|\bcategorias?\b|subcategor\w*|\blineas?\b|\bpersonas?\b|\btarjetas?\b|\bcuentas?\b|\blibros?\b|\bstores?\b|\bcategories\b|\blines?\b|\bpeople\b|\bperson\b|\bcards?\b|\baccounts?\b|\bbooks?\b/i;
  const JUNT_ADVERBIAL = /(?:muestra|muestran|ve|ven|queda|quedan|aparece|muestr\w*|shows?|appears?|sits?)\s+junt(?:o|a|os|as)$/i;
  const fusionarHit = (s: string): boolean => {
    // OLA 15 (Cara B1): el segmento ya no corta en «;». juzgar ya aisló
    // LA FRASE; el punto y coma la partía en dos y la marca de
    // pluralidad caía en el segmento sin verbo ni objeto — «Fusiona
    // las tiendas repetidas; dos quedan en una.» escapaba entera, y su
    // control sin interrupción acusaba. Verbo, marca y objeto se
    // juzgan ahora sobre la frase completa que la cerca aisló; los
    // escudos quedan: la absolución adverbial de junt* se mide sobre
    // el texto que precede al verbo dentro de la frase, y el par
    // objeto-antes-que-verbo de 12C sigue en la misma frase.
    for (const seg of s.split(/[.!?]/)) {
      if (!FUSION_MARCA.test(seg) || !FUSION_OBJETO.test(seg)) continue;
      for (const m of seg.matchAll(FUSION_VERBO)) {
        if (/^junt/i.test(m[0]) && JUNT_ADVERBIAL.test(seg.slice(0, m.index! + m[0].length))) continue; // «las muestra juntas»: adverbio, no verbo
        return true;
      }
    }
    return false;
  };
  /** ARCHIVAR, la familia nueva: archivar un REGISTRO (préstamo, tarjeta,
   * persona, cuenta, línea, libro, deuda) es mano de Ritmo — sus asientos
   * son cobros.archive, lent.archive y loans.archive, los tres R. El
   * Archivo como LUGAR («el Archivo», con determinante) no es el verbo, y
   * el objeto se busca en el resto de la proposición tras el verbo
   * (desde la ola 15: la subordinada tras una coma no lo amputa, el «;»
   * sí lo cierra — B1). */
  const ARCHIV_ASIENTOS = ["cobros.archive", "lent.archive", "loans.archive"];
  const ARCHIV_OBJETO = /\b(?:prestamo|loan|tarjeta|card|persona|people|person|cuenta|account|linea|line|libro|book|deuda|debt)\b/i;
  const archivarHit = (s: string): boolean => {
    const re = /archiv\w*|\barchive\w*/gi;
    for (const m of s.matchAll(re)) {
      const before = s.slice(Math.max(0, m.index! - 14), m.index!);
      if (/(?:^|\s)(?:el|la|los|las|un|una|este|esta|ese|esa|del|al|the|an|a)\s+$/.test(before)) continue; // «el Archivo» es el lugar
      // OLA 15 (Cara B1): el objeto se busca en el resto de la
      // PROPOSICIÓN tras el verbo, no en la cláusula hasta la primera
      // coma — la subordinada de «Archiva, cuando puedas, el préstamo
      // cerrado.» dejaba la cláusula vacía y el objeto fuera de la
      // ventana. La coma es ruido subordinado; el «;» SÍ es frontera:
      // tras él empieza otra proposición, y su objeto no es el del
      // verbo (la frase viva de widget-android lo prueba: «…se
      // archivará en ese lugar; tu libro no cambia en nada más» —
      // archivar apuntes en un lugar no archiva el libro). El escudo
      // queda entero: el determinante que protege «el Archivo» el
      // lugar se mide ANTES del verbo, como siempre.
      const clause = s.slice(m.index! + m[0].length).split(/[.!?;]/)[0]!;
      if (ARCHIV_OBJETO.test(clause)) return true;
    }
    return false;
  };
  const OBJETO_CROMO = /barra|\bbar\b|navegaci|navigation|monto|amount|cifras|figures|puntos|dots|widget|pantalla|screen|selector/i;
  const OBJETO_DATO = /tienda|categor|subconcept|\bstores?\b|subcategor|linea|\blines?\b|persona|\bpeople\b|\bperson\b|tarjeta|\bcards?\b|cuenta|\baccounts?\b|libro|\bbooks?\b|prestamo|\bloans?\b|vista guardada|saved view|movimiento|\bmovements?\b/i;
  const ATRIBUCION = /\[\[ritmo\]\]|\[\[rhythm\]\]|\britmo\b|\brhythm\b/i;
  const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
  /** Todo texto que el RENDERIZADOR puede pintar de un registro —
   * derivado caminando sus FORMAS, jamás una lista de campos (OLA 13):
   * el par [ES,EN], el arreglo de tres [ES,EN,«»], el registro {es,en},
   * los campos sueltos …Es/…En y todo par anidado entran solos. Las
   * llaves que no son prosa pintada (keys de búsqueda, anchors, id) no
   * entran. El enlace `chapter` que el runtime añade no es prosa del
   * tema (el capítulo entra al corpus por su propia línea); una FORMA
   * de prosa bajo la llave chapter propia del tema sí es suya (F6). */
  const esPar = (v: unknown): v is string[] => Array.isArray(v) && v.length >= 2 && v.length <= 3 && v.every((x) => typeof x === "string");
  const esRegistro = (v: unknown): v is { es: string; en: string } =>
    !!v && typeof v === "object" && typeof (v as { es?: unknown }).es === "string" && typeof (v as { en?: unknown }).en === "string";
  const proseOf = (root: unknown): string[] => {
    const out: string[] = [];
    const walk = (v: unknown, key: string): void => {
      if (key === "keys" || key === "anchors" || key === "id") return;
      if (typeof v === "string") { if (/(Es|En)$/.test(key)) out.push(v); return; }
      if (Array.isArray(v)) {
        if (esPar(v)) { out.push(...v.filter((x) => x.length > 0)); return; }
        for (const x of v) walk(x, "");
        return;
      }
      if (v && typeof v === "object") {
        if (key === "chapter") { if (esPar(v) || esRegistro(v)) walk(v, ""); return; }
        if (esRegistro(v)) out.push(v.es, v.en);
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
          if (esRegistro(v) && (k === "es" || k === "en")) continue;
          walk(x, k);
        }
      }
    };
    walk(root, "");
    return out;
  };
  /** La absolución de cromo, sobre la FRASE ENTERA (OLA 13): la ventana
   * de 60 caracteres absolvía lo que no veía — cromo primero y el dato
   * más allá de la ventana quedaba absuelto (A1). Ahora: un objeto-dato
   * en cualquier parte de la frase acusa; solo cromo/privacidad en toda
   * la frase absuelve; y la enumeración desnuda («ocultar, apartar,
   * descartar», tras dos puntos y sin objeto alguno) nombra el concepto,
   * no enseña la mano. El vocabulario de datos es el de la propia app:
   * «movimientos» es como la casa nombra a sus líneas (A2). */
  const ocultarAbsuelto = (s: string): boolean => {
    if (OBJETO_DATO.test(s)) return false; // oculta datos: acusa, respire lo que respire la frase
    if (OBJETO_CROMO.test(s)) return true; // solo cromo/privacidad: no administra datos
    if (/:/.test(s) && !/\b(?:de|del|la|el|las|los)\s+\w+\s+(?:se\s+)?(?:ocult|escond|hid)/i.test(s)) return true; // enumeración desnuda
    return false; // objeto no reconocido: la cerca no absuelve lo que no conoce
  };
  const juzgar = (id: string, prose: string[]): string[] => {
    const out: string[] = [];
    for (const text of prose) {
      for (const raw of sentences(text)) {
        const s = norm(raw);
        const hits = VERBOS_RITMO.filter(([, re]) => re.test(s)).map(([n]) => n);
        if (fusionarHit(s)) hits.push("fusionar");
        if (archivarHit(s)) hits.push("archivar");
        if (!hits.length) continue;
        if (hits.length === 1 && hits[0] === "ocultar datos" && ocultarAbsuelto(s)) continue; // cromo/privacidad: no administra datos
        if (ATRIBUCION.test(s)) continue; // nombrar al dueño en la frase es la atribución
        out.push(`${id}: «${raw.trim()}» enseña ${hits.join(" + ")} en Esencial sin nombrar a Ritmo`);
      }
    }
    return out;
  };
  const violaciones = (topic: Topic & { chapter?: unknown }): string[] => {
    const floor = topicMode(topic as never);
    if (floor !== "esencial") return []; // la escalera: solo los verbos de un piso SUPERIOR acusan
    return juzgar(topic.id, proseOf(topic));
  };
  it("ningún tema vivo enseña en su piso un verbo de un piso superior sin nombrarlo", () => {
    const all = MANUAL_TOPICS.flatMap((t) => violaciones(t as never));
    assert.deepEqual(all, []);
  });
  it("el espécimen escenificado de la caza (f-tienda) corre rojo bajo la cerca derivada", () => {
    const tienda = MANUAL_TOPICS.find((t) => t.id === "f-tienda")!;
    assert.equal(topicMode(tienda as never), "esencial");
    const staged = {
      ...tienda,
      what: [
        `${tienda.what![0]} El lápiz oculta varias de una vez con una confirmación.`,
        `${tienda.what![1]} The pencil hides several at once with one confirmation.`,
      ],
    };
    const v = violaciones(staged as never);
    assert.equal(v.length, 2, `la cerca derivada acusa la frase fresca en ES y EN: ${v.join(" | ")}`);
  });
  it("las cuatro mutaciones de la ola 12 (12A–D) corren rojas bajo la cerca derivada entera", () => {
    const tienda = MANUAL_TOPICS.find((t) => t.id === "f-tienda")!;
    const stage = (patch: Partial<Topic>) => violaciones({ ...tienda, ...patch } as never);
    // 12A · la absolución ya no clavea en la palabra «monto»: ocultar
    // TIENDAS acusa aunque la frase respire cromo.
    const a = stage({ what: ["Desde esta hoja ocultas las tiendas que ya no usas y ves el monto de cada compra.", "From this sheet you hide the stores you no longer use and see the amount of each purchase."] });
    assert.equal(a.length, 2, `12A acusa en ES y EN: ${a.join(" | ")}`);
    // 12B · el participio inglés ya no escapa a la familia fusionar.
    const b = stage({ what: ["Dos tiendas se pueden fusionar en una desde esta hoja.", "Two stores can be merged into one from this sheet."] });
    assert.equal(b.length, 2, `12B acusa en ES y EN: ${b.join(" | ")}`);
    // 12C · los sinónimos de la misma mano ya no escapan a la tabla.
    const c = stage({ what: ["Con el lápiz puedes eliminar varias tiendas con una sola confirmación y unir dos en una.", "With the pencil you can remove several stores with one confirmation and join two into one."] });
    assert.equal(c.length, 2, `12C acusa en ES y EN: ${c.join(" | ")}`);
    // 12D · la cláusula condenada ya no se esconde en whatAlt ni en bubble:
    // todo campo que la cara pinta está bajo el escaneo.
    const d = stage({ whatAlt: ["El lápiz oculta varias de una vez con una confirmación.", "The pencil hides several at once with one confirmation."] });
    assert.equal(d.length, 2, `12D (whatAlt) acusa en ES y EN: ${d.join(" | ")}`);
    const d2 = stage({ bubble: ["El lápiz oculta varias de una vez con una confirmación.", "The pencil hides several at once with one confirmation."] });
    assert.equal(d2.length, 2, `12D (bubble) acusa en ES y EN: ${d2.join(" | ")}`);
    // Y el control de la absolución por objeto: ocultar CROMO sigue absuelto.
    const chrome = stage({ what: ["Desde Ajustes ocultas la barra de navegación si te estorba.", "From Settings you hide the navigation bar if it gets in your way."] });
    assert.deepEqual(chrome, [], "ocultar la barra (cromo) no administra datos: absuelto por su objeto");
  });
  it("las cláusulas condenadas no vuelven: f-categoria y f-sub dicen la verdad de Esencial", () => {
    const cat = findTopic("f-categoria")!;
    assert.ok(!cat.what![0].includes("cambia nombre y color u oculta"), "f-categoria ES sin la cláusula condenada");
    assert.ok(!cat.what![1].includes("changes name and colour or hides"), "f-categoria EN sin la cláusula condenada");
    assert.match(cat.what![0], /corrige el nombre/); // la verdad de Esencial: el lápiz corrige el nombre
    const sub = findTopic("f-sub")!;
    assert.ok(!sub.what![0].includes("u oculta en la misma hoja"), "f-sub ES sin la cláusula condenada");
    assert.ok(!sub.what![1].includes("or hide it in the same sheet"), "f-sub EN sin la cláusula condenada");
    assert.match(sub.what![0], /renombra en la misma hoja/); // renombrar SÍ es de Esencial en esa hoja
  });
  it("libro-herramientas: la mano de multiselección se nombra de Ritmo donde se enseña", () => {
    const t = findTopic("libro-herramientas")!;
    assert.deepEqual(violaciones(MANUAL_TOPICS.find((x) => x.id === "libro-herramientas") as never), []);
    assert.match(t.what![0], /\[\[Ritmo\]\]/);
  });
  /* ── OLA 13: la derivación, tercer nivel ─────────────────────────── */
  it("las familias de verbos viven donde el registro dice: sus asientos son de Ritmo", () => {
    for (const f of FAMILIAS) for (const seat of f.asientos) {
      assert.equal(FEATURES[seat as keyof typeof FEATURES], "ritmo", `${f.nombre}: su asiento ${seat} declara el piso de su mano`);
    }
    for (const seat of ARCHIV_ASIENTOS) {
      assert.equal(FEATURES[seat as keyof typeof FEATURES], "ritmo", `archivar: su asiento ${seat} es de Ritmo`);
    }
  });
  it("los capítulos entran al corpus con el piso de su línea (CHAPTER_MODE)", () => {
    const hits: string[] = [];
    for (const ch of MANUAL_CHAPTERS) {
      if ((CHAPTER_MODE[ch.id] ?? "completo") !== "esencial") continue;
      hits.push(...juzgar(`capítulo ${ch.id}`, proseOf({ title: ch.title, intro: ch.intro })));
    }
    assert.deepEqual(hits, [], `la prosa de los capítulos de Esencial acusa:\n${hits.join("\n")}`);
    // y la cerca los VE: un capítulo escenificado con la mano de Ritmo acusa
    const staged = juzgar("capítulo escenificado", ["Oculta varias tiendas con una sola confirmación.", "Hide several stores with one confirmation."]);
    assert.equal(staged.length, 2, "el corpus de capítulos no es decorativo: la frase fresca acusa en los dos idiomas");
  });
  it("los pies de escena se escanean con el piso EFECTIVO de la escena (CARA-1)", () => {
    const ORDEN = ["esencial", "ritmo", "completo"];
    const piso = (modMode: string, sc: { mode?: string; minMode?: string }): string => {
      if (sc.mode) return sc.mode;
      let f = modMode;
      if (sc.minMode && ORDEN.indexOf(sc.minMode) > ORDEN.indexOf(f)) f = sc.minMode;
      return f;
    };
    const hits: string[] = [];
    for (const mod of MODULES) for (const sc of mod.scenes) {
      if (piso(mod.mode ?? "completo", sc as { mode?: string; minMode?: string }) !== "esencial") continue;
      hits.push(...juzgar(`escena ${sc.id}`, proseOf(sc)));
    }
    assert.deepEqual(hits, [], `una escena enseña en Esencial una mano de Ritmo:\n${hits.join("\n")}`);
    // el espécimen de la clase, clavado: la escena partida dice la verdad de cada piso
    const e = MODULES.flatMap((m) => m.scenes).find((s) => s.id === "m3-lapiz")!;
    const r = MODULES.flatMap((m) => m.scenes).find((s) => s.id === "m3-lapiz-r")!;
    assert.equal(e.mode, "esencial", "m3-lapiz es la cara de Esencial");
    assert.equal(r.minMode, "ritmo", "m3-lapiz-r nace en Ritmo");
    assert.deepEqual(juzgar("escena m3-lapiz", proseOf(e)), [], "el pie de Esencial solo nombra el renombre");
    assert.match(proseOf(r).join(" "), /recolorea, borra en grupo/, "el pie de Ritmo lleva la mano entera, verdadera en su piso");
  });
  it("mut13-b a doctrina: las formas no-par entran, la morfología acusa, la absolución mira la frase entera", () => {
    const tienda = MANUAL_TOPICS.find((t) => t.id === "f-tienda")!;
    const deudas = MANUAL_TOPICS.find((t) => t.id === "deudas")!;
    const COND = ["El lápiz oculta varias de una vez con una confirmación.", "The pencil hides several at once with one confirmation."];
    // CAMPOS: las cuatro formas que la cerca vieja no veía
    assert.equal(violaciones({ ...tienda, nota: { es: COND[0], en: COND[1] } } as never).length, 2, "F2 · el registro {es,en} entra");
    assert.equal(violaciones({ ...tienda, notaEs: COND[0], notaEn: COND[1] } as never).length, 2, "F3 · los campos sueltos …Es/…En entran");
    assert.equal(violaciones({ ...tienda, nota: [COND[0], COND[1], ""] } as never).length, 2, "F4 · el arreglo de tres entra");
    assert.equal(violaciones({ ...tienda, mode: "esencial", chapter: COND } as never).length, 2, "F6 · la prosa bajo la chapter PROPIA del tema entra");
    const stage = (base: Topic, es: string, en: string) => violaciones({ ...base, what: [es, en] } as never);
    // VERBOS: la morfología viva
    assert.equal(stage(tienda, "Ocúltalas con una sola confirmación desde esta hoja.", "Hide them all with one confirmation from this sheet.").length, 2, "V1 · el imperativo con enclítico y acento acusa");
    assert.equal(stage(tienda, "Suprime varias tiendas con una sola confirmación.", "Purge several stores with one confirmation.").length, 2, "V2 · suprimir/purge es la mano de borrar en masa");
    assert.equal(stage(tienda, "Combina dos tiendas en una desde esta hoja.", "Combine two stores into one from this sheet.").length, 2, "V3 · combinar es la mano de fusionar");
    assert.equal(stage(tienda, "Cámbiales el color desde esta hoja.", "Change their colour from this sheet.").length, 2, "V4 · el recolorear de masa acusa con su pronombre");
    assert.equal(stage(tienda, "Fusiona dos tiendas en una desde esta hoja.", "Merge a pair of stores together from this sheet.").length, 2, "V5 · el marco de fusión no enumera cantidades: «a pair… together» acusa");
    assert.equal(stage(deudas, "Archiva un préstamo cerrado desde esta hoja, con todo su historial.", "Archive a closed loan from this sheet, with all its history.").length, 2, "V6 · ARCHIVAR es familia: archivar un registro acusa en Esencial");
    // ABSOLUCIÓN: la frase entera
    assert.equal(stage(tienda, "Oculta la barra de navegación de la pantalla principal de la casa y las tiendas que ya no usas.", "Hide the navigation bar at the top of the main screen of the house and the stores you no longer use.").length, 2, "A1 · el cromo primero no absuelve el dato que la frase esconde más allá de la ventana");
    assert.equal(stage(tienda, "Oculta la barra y los movimientos viejos desde esta hoja.", "Hide the bar and the old movements from this sheet.").length, 2, "A2 · «movimientos» es vocabulario de datos de la propia app");
  });
  /* ── OLA 14: el registro MÓDULO entra al corpus (B1) y FUSIONAR
   * gana la disciplina de ARCHIVAR (B2) ─────────────────────────── */
  it("B1 (ola 14): title+promise de cada módulo se juzgan con su piso efectivo", () => {
    const hits: string[] = [];
    for (const mod of MODULES) {
      if ((mod.mode ?? "completo") !== "esencial") continue; // la escalera: solo el piso que no posee la mano acusa
      hits.push(...juzgar(`módulo ${mod.id}`, proseOf({ title: mod.title, promise: mod.promise })));
    }
    assert.deepEqual(hits, [], `una promesa de módulo enseña en Esencial una mano de Ritmo:\n${hits.join("\n")}`);
    // el espécimen de la caza, con la mano en su forma gobernada: la
    // promesa de «anotar» (Esencial) predicando la multiselección acusa
    const anotar = MODULES.find((m) => m.id === "anotar")!;
    assert.equal(anotar.mode, "esencial");
    const staged = juzgar("módulo anotar (escenificado)", [
      "Al salir, borras varias líneas con el lápiz, en grupo y sin dudar.",
      "By the end, you delete several lines with the pencil, in a group and without hesitating.",
    ]);
    assert.equal(staged.length, 2, `la promesa escenificada acusa en los dos idiomas: ${staged.join(" | ")}`);
    assert.deepEqual(juzgar("módulo anotar", proseOf({ title: anotar.title, promise: anotar.promise })), [],
      "y la promesa viva de anotar dice la verdad de su piso");
  });
  it("B2 (ola 14): las tres frases inocentes absuelven y las fusiones verdaderas siguen acusando", () => {
    const tienda = MANUAL_TOPICS.find((t) => t.id === "f-tienda")!;
    const stage = (es: string, en: string) => violaciones({ ...tienda, what: [es, en] } as never);
    // las inocentes de la caza: el adverbio, y combinar sin objeto-registro
    assert.deepEqual(stage("Con dos tiendas abiertas, la hoja las muestra juntas en una sola lista.", "With two stores open, the sheet shows them together in one list."), [],
      "«las muestra juntas» es adverbio (una al lado de otra): la raíz junt* ya no lo pliega al verbo");
    assert.deepEqual(stage("El tema oscuro combina dos colores en una pantalla: fondo y tinta.", "The dark theme combines two colours in one screen: background and ink."), [],
      "combinar COLORES no es fusionar registros: sin objeto-registro no hay mano que enseñar (fondo es cromo, no objeto)");
    // las verdaderas, en sus formas clavadas de las olas 12 y 13
    assert.equal(stage("Dos tiendas se pueden fusionar en una desde esta hoja.", "Two stores can be merged into one from this sheet.").length, 2, "12B sigue acusando");
    assert.equal(stage("Con el lápiz puedes eliminar varias tiendas con una sola confirmación y unir dos en una.", "With the pencil you can remove several stores with one confirmation and join two into one.").length, 2, "12C sigue acusando: el objeto va antes del verbo, en el mismo segmento");
    assert.equal(stage("Combina dos tiendas en una desde esta hoja.", "Combine two stores into one from this sheet.").length, 2, "V3 sigue acusando");
    assert.equal(stage("Fusiona dos tiendas en una desde esta hoja.", "Merge a pair of stores together from this sheet.").length, 2, "V5 sigue acusando");
  });
  it("B1 (ola 15): la interrupción dentro de la frase ya no es salida — las cuatro evasiones acusan y los escudos quedan", () => {
    const tienda = MANUAL_TOPICS.find((t) => t.id === "f-tienda")!;
    const stage = (es: string, en: string) => violaciones({ ...tienda, what: [es, en] } as never);
    // las evasiones de la caza: la marca tras el «;» y el objeto tras la subordinada
    assert.equal(stage("Fusiona las tiendas repetidas; dos quedan en una.", "Merge the stores you no longer need; two become one.").length, 2,
      "la marca de pluralidad tras el punto y coma vuelve a la frase: fusionar acusa en los dos idiomas");
    assert.equal(stage("Archiva, cuando puedas, el préstamo cerrado.", "Archive, when you can, the closed loan.").length, 2,
      "el objeto tras la subordinada vuelve a la frase: archivar acusa en los dos idiomas");
    // los controles de la caza (las mismas frases sin interrupción) acusaban ya y acusan
    assert.equal(stage("Fusiona dos tiendas en una.", "Merge two stores into one.").length, 2, "el control de fusión acusa");
    assert.equal(stage("Archiva el préstamo cerrado.", "Archive the closed loan.").length, 2, "el control de archivar acusa");
    // los escudos, bajo las ventanas nuevas
    assert.deepEqual(stage("Con dos tiendas abiertas, la hoja las muestra juntas en una sola lista.", "With two stores open, the sheet shows them together in one list."), [],
      "la inocente del adverbio sigue absuelta con la frase entera por segmento");
    assert.deepEqual(stage("El tema oscuro combina dos colores en una pantalla: fondo y tinta.", "The dark theme combines two colours in one screen: background and ink."), [],
      "la inocente sin objeto-registro sigue absuelta");
    assert.deepEqual(stage("Ve al Archivo y revisa el préstamo cerrado.", "Go to the Archive and check the closed loan."), [],
      "«el Archivo» el lugar sigue protegido por su determinante aunque el objeto viva en el resto de la frase");
    assert.deepEqual(stage("Al tocar el ancla, Faro pregunta primero: lo que anotes eligiéndolo se archivará en ese lugar; tu libro no cambia en nada más.", "On tapping the anchor, Faro asks first: what you note by choosing it will be archived in that place; your book changes in nothing else."), [],
      "la frase viva de widget-android: archivar apuntes EN UN LUGAR no archiva el libro — el «;» cierra la proposición del verbo y su objeto no cruza");
  });
});

/* ═══════════ §D · G11-2 + C11-1: CARDFORM FUSIONA Y NO RESUCITA ═══════
 * G11-2: el guardado de CardForm componía el registro entero desde el
 * borrador (nacido o aparcado) y putCard lo reemplazaba — sin testigo de
 * toque ni fusión: A aparca una edición de solo-nombre, B fija la tasa
 * (aprBps 2400) y añade una lectura en otra pestaña, A restaura y guarda
 * → la tasa de B volvía a 0 en silencio. La cura lleva la doctrina de la
 * raíz de LineForm a la segunda forma: el testigo de toque es la
 * comparación borrador/nacido por campo (el nacido viaja en el
 * aparcamiento), el candidato se compone DENTRO del commit sobre el
 * registro vigente, y fuseCardDraft devuelve a la base viva todo campo
 * gobernado no tocado. C11-1: la misma forma, en edición sobre una
 * tarjeta borrada con la forma abierta (formCard = null), componía
 * `card ?? {id: uid()}` y la insertaba como tarjeta nueva sin palabra;
 * ahora Guardar anuncia la verdad («esta tarjeta ya no existe») y ofrece
 * guardar-como-nueva EXPLÍCITO o descartar — y el commit de edición sin
 * registro vivo devuelve el estado intacto, jamás un alta muda. El
 * préstamo del mismo borde aguantó entero y es el control: no se toca. */
import { fuseCardDraft } from "./cards.ts";
import type { CreditCard } from "./types.ts";

describe("§D · G11-2 — fuseCardDraft: lo no tocado se lee del registro vigente", () => {
  const snap = { on: "2026-11-05", at: "2026-11-05T10:00:00.000Z", balanceMinor: 120_000, src: "manual" } as CreditCard["snaps"][number];
  const cc1: CreditCard = {
    id: "cc-1", name: "Banco", issuer: "", mark: "", color: "#079ed9", last4: "1234", currency: "USD",
    limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [],
  };
  const draftBase: Record<string, string> = {
    name: "Banco", last4: "1234", apr: "", promo: "", limit: "", dueDay: "", autopay: "", rewards: "",
    art: "", color: "#079ed9", balance: "", avail: "", min: "", dueOn: "", mark: "", issuer: "", network: "", rw: "",
  };
  it("el cruce del aparcamiento: el nombre aparcado gana; la tasa y la lectura de la otra pestaña sobreviven", () => {
    const born = { ...draftBase }; // la foto con la que la forma nació (tasa 0, sin lecturas)
    const draft = { ...draftBase, name: "Banco Ola11" }; // A tocó SOLO el nombre y aparcó
    const live: CreditCard = { ...cc1, aprBps: 2400, limitMinor: 900_000, snaps: [snap] }; // B fijó la tasa, subió el límite y leyó
    const candidate: CreditCard = { ...live, name: "Banco Ola11", aprBps: 0, limitMinor: null }; // lo que el guardado viejo habría escrito
    const fused = fuseCardDraft(live, candidate, draft, born);
    assert.equal(fused.name, "Banco Ola11");
    assert.equal(fused.aprBps, 2400);
    assert.equal(fused.limitMinor, 900_000);
    assert.deepEqual(fused.snaps, [snap]);
  });
  it("el cruce sin aparcar: forma abierta, la otra pestaña edita la tasa, guardar solo-nombre → la tasa sobrevive", () => {
    const born = { ...draftBase };
    const draft = { ...draftBase, name: "Banco Nuevo" };
    const live: CreditCard = { ...cc1, aprBps: 2400 };
    const candidate: CreditCard = { ...live, name: "Banco Nuevo", aprBps: 0 };
    const fused = fuseCardDraft(live, candidate, draft, born);
    assert.equal(fused.name, "Banco Nuevo");
    assert.equal(fused.aprBps, 2400);
  });
  it("control: lo que la mano SÍ tocó manda sobre el registro vigente", () => {
    const born = { ...draftBase };
    const draft = { ...draftBase, apr: "30" }; // A fijó la tasa en su sesión
    const live: CreditCard = { ...cc1, aprBps: 2400 };
    const candidate: CreditCard = { ...live, aprBps: 3000 };
    assert.equal(fuseCardDraft(live, candidate, draft, born).aprBps, 3000);
  });
  it("el nacido viaja en el aparcamiento: la forma aparca { d, born }, no solo el borrador", () => {
    const src = SRC("../../components/faro/cards.tsx");
    const seg = src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));
    assert.match(seg, /parkFlow\(parkKey, \{ d, born \}\)/);
    assert.match(seg, /fuseCardDraft\(liveCard, candidate, d/);
    assert.match(seg, /storedCards\(s\)\.find\(\(c\) => c\.id === bornId\)/);
  });
});

describe("§D · C11-1 — guardar sobre un fantasma no resucita en silencio", () => {
  const seg = (() => {
    const src = SRC("../../components/faro/cards.tsx");
    return src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));
  })();
  it("la composición muda ya no existe: nada de `card ?? { id: uid() }` en la forma", () => {
    assert.ok(!/card \?\? \{ id: uid\(\)/.test(seg), "el alta muda sobre el fantasma está fuera");
  });
  it("Guardar en edición sin registro vivo anuncia, no guarda", () => {
    // ENMIENDA OLA 14 (G14-5): el anuncio ya no cuelga del prop del
    // render — pregunta al libro con la pregunta única de tres estados
    // (cardExistence): lo que vive se guarda, lo archivado y lo
    // destruido anuncian cada uno su verdad.
    assert.match(seg, /const ex = cardExistence\(session\?\.ledger, bornId\);/);
    assert.match(seg, /setGhost\(ex\);/);
    assert.ok(seg.includes("Esta tarjeta ya no existe"));
    assert.ok(seg.includes("This card no longer exists"));
    assert.ok(seg.includes("se archivó mientras la editabas"));
    assert.ok(seg.includes("was archived while you were editing it"));
    assert.ok(seg.includes("Restaurarla y guardar"));
    assert.ok(seg.includes("tendrás las dos"), "guardar como nueva dice que la archivada se queda: ninguna convivencia en silencio");
  });
  it("guardar como nueva es una elección explícita, con su botón y su camino", () => {
    assert.ok(seg.includes("Guardar como tarjeta nueva"));
    assert.ok(seg.includes("Save as a new card"));
    assert.match(seg, /const saveAsNew = \(\) => \{ setGhost\(null\); proceed\(true\); \};/);
    assert.match(seg, /const proceedRestore = \(\) => \{ setGhost\(null\); commitDraft\(false, true\); \};/, "restaurarla y guardar es su propio camino explícito: un commit que desarchiva lo vivo y funde");
  });
  it("el commit de edición sin registro vivo devuelve el estado intacto", () => {
    // ENMIENDA OLA 15 (G15-3): el aborto ahora deja su veredicto en el
    // canal antes de devolver el estado intacto — la doctrina no
    // cambia (el estado se devuelve intacto, jamás un alta muda); la
    // forma creció con la escritura del veredicto, como en las
    // enmiendas de las olas 12 y 14 sobre la misma línea.
    assert.match(seg, /if \(!isAdd && !freshId && !liveCard\) \{ saveVerdict\.current = \{ applied: false, existence: "gone" \}; return s; \}/);
  });
});

/* ═══════════ §E · E11-1: EL CENSO DE DESTINOS EXACTOS, POR CONSTRUCCIÓN ═
 * Los puentes de TOPIC_SCENES tenían tres guardias (la llave no se pisa,
 * la escena vive en el módulo declarado, la herencia no cruza módulos) y
 * ninguna medía EL DESTINO: re-apuntar un puente a otra lección de su
 * propio módulo — módulo veraz, escena existente, llave única — pasaba
 * con la suite entera verde, salvo en los 5 puentes de la lista de
 * modos299 y la familia balanza de la §J. El espécimen MUT-J de la caza
 * (folios → m9-vistas) lo probó con delta cero; su control MUT-K
 * (deudas-hechos → m19-cierre-h) ya corría rojo y sigue rojo. La cura es
 * el censo entero, derivado del mapa: los 23 destinos exactos con su
 * razón escrita; re-apuntar un puente exige enmendar el censo con su
 * razón, y un puente nuevo sin censar — o una entrada muerta — acusa. */
describe("§E · E11-1 — los 23 destinos de TOPIC_SCENES, censados por construcción", () => {
  const DESTINOS: Record<string, [string, string, string]> = {
    // tema: [módulo, escena, por qué esa lección y no otra]
    "queda": ["manual", "m2-aterriza-tema", "el aterrizaje del tema se enseña en la lección del Manual"],
    "huella": ["puertas", "m11-huella", "la huella es la puerta de entrada"],
    "cerrar-sesion": ["puertas", "m11-sesion", "cerrar sesión vive en la lección de las puertas"],
    "estructura": ["estructura", "m10-estructura", "el árbol se enseña en su propia escena"],
    "seguro-vida": ["estructura", "m10-seguro", "el seguro de vida cuelga de la estructura"],
    "copias": ["estructura", "m10-copias", "las copias se explican junto a la estructura"],
    "folios": ["folios", "m9-folios", "el folio se enseña en la escena de los folios, no en la de las vistas (MUT-J)"],
    "central": ["mapa", "m1-central", "Central es la primera escena del mapa"],
    "estudio": ["estadisticas", "m7-estudio", "el Estudio abre el módulo de estadísticas"],
    "asesor": ["asesor", "m8-asesor", "el Asesor entero tiene su módulo y su escena"],
    "libros": ["anotar", "m3-fijos", "los libros se presentan desde los fijos de Anotar"],
    "ajustes": ["mapa", "m1-ajustes", "los ajustes viven en el mapa, junto a Central"],
    "donde-vive": ["pregunta", "m12-pregunta", "la pregunta «dónde vive» es su propia lección"],
    "ahorros-banda": ["totales", "m13-titular", "la banda de ahorros es el titular de Totales"],
    "cuentas": ["totales", "m13-cuentas", "las cuentas se leen en Totales"],
    "apartado-mes": ["totales", "m13-apartado", "el apartado del mes se lee en Totales"],
    "bolsas": ["totales", "m13-luces", "las bolsas son las luces de Totales"],
    "colchon": ["colchon", "m14-piso", "el colchón se enseña desde su piso"],
    "modos": ["modos", "m15-modos", "los modos se enseñan en su módulo (el 15)"],
    "puedes-gastar-hoy": ["hoy", "m16-numero", "el número de hoy es la escena del módulo Hoy"],
    "asesor-esencial": ["asesor-esencial", "m17-asesor", "el Asesor de Esencial tiene su propio módulo (el 17)"],
    "asesor-ritmo": ["asesor-ritmo", "m18-asesor", "el Asesor de Ritmo tiene su propio módulo (el 18)"],
    "deudas-hechos": ["deudas", "m19-balanza-h", "las deudas como hechos abren en la balanza de hechos, no en el cierre (MUT-K)"],
  };
  type Mapa = Record<string, { moduleId: string; sceneId: string }>;
  const errores = (mapa: Mapa): string[] => {
    const out: string[] = [];
    const sceneModule = new Map<string, string>();
    for (const m of MODULES) for (const s of m.scenes) sceneModule.set(s.id, m.id);
    for (const [tema, dest] of Object.entries(mapa)) {
      const censo = DESTINOS[tema];
      if (!censo) { out.push(`${tema}: puente sin censar — su destino exige entrada con su razón`); continue; }
      if (dest.moduleId !== censo[0] || dest.sceneId !== censo[1]) {
        out.push(`${tema}: el puente apunta a ${dest.moduleId}/${dest.sceneId} y el censo dice ${censo[0]}/${censo[1]} (${censo[2]}) — re-apuntar exige enmendar el censo con su razón`);
      }
      if (sceneModule.get(dest.sceneId) !== dest.moduleId) {
        out.push(`${tema}: la escena ${dest.sceneId} no vive en el módulo ${dest.moduleId}`);
      }
    }
    for (const tema of Object.keys(DESTINOS)) {
      if (!(tema in mapa)) out.push(`${tema}: entrada muerta del censo — el puente ya no existe`);
    }
    return out;
  };
  it("el mapa vivo cae entero dentro del censo: 23 puentes, 23 destinos exactos", () => {
    assert.equal(Object.keys(TOPIC_SCENES).length, 23);
    assert.equal(Object.keys(DESTINOS).length, 23);
    assert.deepEqual(errores(TOPIC_SCENES), []);
  });
  it("MUT-J corre rojo: folios re-apuntado dentro de su propio módulo acusa", () => {
    const staged: Mapa = { ...TOPIC_SCENES, folios: { moduleId: "folios", sceneId: "m9-vistas" } };
    const e = errores(staged);
    assert.equal(e.length, 1);
    assert.match(e[0]!, /folios: el puente apunta a folios\/m9-vistas/);
  });
  it("MUT-K sigue rojo: deudas-hechos al cierre acusa", () => {
    const staged: Mapa = { ...TOPIC_SCENES, "deudas-hechos": { moduleId: "deudas", sceneId: "m19-cierre-h" } };
    const e = errores(staged);
    assert.ok(e.some((x) => x.startsWith("deudas-hechos: el puente apunta a deudas/m19-cierre-h")), e.join(" | "));
  });
  it("un puente nuevo sin censar acusa; una entrada sin puente, también", () => {
    const conNuevo: Mapa = { ...TOPIC_SCENES, "tema-nuevo": { moduleId: "mapa", sceneId: "m1-central" } };
    assert.ok(errores(conNuevo).some((x) => x.startsWith("tema-nuevo: puente sin censar")));
    const sinPuente: Mapa = { ...TOPIC_SCENES };
    delete sinPuente["modos"];
    assert.ok(errores(sinPuente).some((x) => x.startsWith("modos: entrada muerta")));
  });
});
