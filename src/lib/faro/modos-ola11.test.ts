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
import { MANUAL_TOPICS, findTopic, topicMode, type Topic } from "../manual/topics.ts";
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
 * entrada muerta (la superficie ya no existe) también. */
describe("§A · el censo del apartado: toda superficie agregadora, clasificada", () => {
  const PRODUCERS = [
    "summarize", "yearPoints", "spanPoints", "compareSpans", "studyBoard",
    "buildInsights", "readCoach", "readAdvisor", "yearReport", "monthTotals",
    "categorySlices", "cashSankey",
  ] as const;
  type Clase = "gasto" | "movimiento" | "interna";
  const REGISTRO: Record<string, [Clase, string]> = {
    "components/faro/panorama.tsx:readCoach": ["gasto", "el coach separa el apartado por rol (monthTotals); Panorama presenta esas frases"],
    "components/faro/provider.tsx:buildInsights": ["gasto", "las notas del Asesor; «Contra el mes anterior» compara gasto con gasto tras la cura"],
    "components/faro/provider.tsx:categorySlices": ["movimiento", "rebanadas con su nombre propio; la de ahorro se nombra ahorro"],
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
    "lib/faro/engine.ts:compareSpans": ["gasto", "la definición sobre pair"],
    "lib/faro/engine.ts:readAdvisor": ["interna", "composición: buildInsights y studyBoard leen la Lectura"],
    "lib/faro/engine.ts:spanPoints": ["gasto", "la definición sobre pair"],
    "lib/faro/engine.ts:studyBoard": ["gasto", "la definición; el burn curado quema solo gasto"],
    "lib/faro/engine.ts:summarize": ["interna", "la definición: expense = salida por clases (de ella vive lo libre); spend = solo-gasto; spentPct = spend"],
    "lib/faro/engine.ts:yearPoints": ["gasto", "la definición: expense solo-gasto y saved aparte tras la cura"],
    "lib/faro/export-docs.ts:categorySlices": ["movimiento", "la hoja de categorías nombra cada una; la de ahorro se nombra ahorro"],
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
  const VERBOS_RITMO: [string, RegExp][] = [
    ["ocultar datos", /ocult|escond|\bhide|\bhiding/i],
    ["recolorear", /cambia nombre y color|changes name and colour|cambiar( el)? color|change (the )?colou?r|recolore|recolou?r/i],
    ["borrar en masa", /borrar varias|delete several/i],
    ["fusionar", /fusiona|\bmerge\b|\bmerging\b/i],
  ];
  const CROMO = /monto|amount|barra|\bbar\b|navigation/i;
  const ATRIBUCION = /\[\[Ritmo\]\]|\[\[Rhythm\]\]|\bRitmo\b|\bRhythm\b/i;
  const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
  const violaciones = (topic: Topic & { chapter?: unknown }): string[] => {
    const floor = topicMode(topic as never);
    if (floor !== "esencial") return []; // la escalera: solo los verbos de un piso SUPERIOR acusan
    const out: string[] = [];
    const prose = [...(topic.sum ?? []), ...(topic.what ?? []), ...(topic.how ?? []), ...(topic.tip ?? [])];
    for (const text of prose) {
      for (const s of sentences(text)) {
        const hits = VERBOS_RITMO.filter(([, re]) => re.test(s)).map(([n]) => n);
        if (!hits.length) continue;
        if (hits.length === 1 && hits[0] === "ocultar datos" && CROMO.test(s)) continue; // cromo/privacidad: no administra datos
        if (ATRIBUCION.test(s)) continue; // nombrar al dueño en la frase es la atribución
        out.push(`${topic.id}: «${s.trim()}» enseña ${hits.join(" + ")} en Esencial sin nombrar a Ritmo`);
      }
    }
    return out;
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
    assert.match(seg, /if \(!isAdd && !card\) \{ setGhost\(true\); return; \}/);
    assert.ok(seg.includes("Esta tarjeta ya no existe"));
    assert.ok(seg.includes("This card no longer exists"));
  });
  it("guardar como nueva es una elección explícita, con su botón y su camino", () => {
    assert.ok(seg.includes("Guardar como tarjeta nueva"));
    assert.ok(seg.includes("Save as a new card"));
    assert.match(seg, /const saveAsNew = \(\) => \{ setGhost\(false\); proceed\(true\); \};/);
  });
  it("el commit de edición sin registro vivo devuelve el estado intacto", () => {
    assert.match(seg, /if \(!isAdd && !freshId && !liveCard\) return s;/);
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
