/**
 * FARO — OLA 12 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: EL APARTADO EN LAS FRASES (la cura 11 clasificó
 * PRODUCTORES y dejó las FRASES y las CARAS fuera), LAS FORMAS QUE GUARDAN
 * SIN FUSIONAR (la guarda del fantasma preguntaba al mapa equivocado; el
 * préstamo, su gemela y las personas guardaban la foto vieja), LOS GESTOS
 * MUDOS (la pulsación larga moría tras el chequeo de permiso sin susurrar),
 * LA PROSA DE LA LEY REVERTIDA (el Manual y el guion seguían enseñando la
 * subida sin pregunta que la .318 revirtió), EL REFRESCO QUE REESCRIBE LA
 * NATURALEZA DEL DIÁLOGO (C12-1) y TRES CERCAS QUE CONTABAN TEXTO EN VEZ
 * DE GOBIERNO (§B por lista, el censo de consumidores por menciones, el
 * de testigos por formas). Cada familia queda clavada aquí con su
 * espécimen corriendo rojo antes y verde después. Donde la rotura vive en
 * un componente, la cerca es de fuente y el banco CDP de la ronda la
 * acompaña (shots-cura12/).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import ts from "typescript";
import { cardsOf, fuseCardDraft, putCard, storedCards } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { MANUAL_CHAPTERS, MANUAL_TOPICS } from "../manual/topics.ts";
import { MODULES } from "./guion.ts";
import { modeDialogReaction, unlockedGroups } from "./mode.ts";
import { buildInsights, summarize } from "./engine.ts";
import { buildSheets, type ExportPick } from "./export-docs.ts";
import { fuseLoanFields } from "./loans.ts";
import { fusePerson } from "./people.ts";
import { yearReport } from "./year.ts";
import type { CreditCard, LedgerState, Lent, Line, Loan, Person } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ── Libros de ficción (jamás producción): la forma de los especímenes de
 * la caza (bench-ola12/ases12.ts). El apartado vive en la categoría semilla
 * de ahorro «f-ahorro» (role savings), como gasto fijo. ───────────────── */
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
const book = (months: Record<string, Line[]>, lang: "es" | "en" = "es"): LedgerState => {
  const b = createInitial(lang, "claro");
  (b.settings as { mode?: string }).mode = "completo";
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const ingreso = (key: string, minor = 3_000_000) => line({ kind: "income-fixed", concept: "Salario", amountMinor: minor }, key);
const gasto = (key: string, minor: number, concept = "Mercado") => line({ kind: "expense-variable", concept, amountMinor: minor }, key);
const apartado = (key: string, minor: number) =>
  line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: minor, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key);
const insight = (b: LedgerState, key: string, id: string, lang: "es" | "en" = "es") =>
  buildInsights(b, key, lang, makeNamer(b.structure, lang)).find((i) => i.id === id);

/* ═══════════ §A · BR12-1: «SPENT» COHERENTE ═══════════════════════════
 * El espécimen de la caza: ingreso 30,000 · gasto 27,000 · apartado 9,000.
 * La base pintaba value 90.0% (sobre spend) y detail «C$36,000.00 de
 * C$30,000.00» (sobre expense): la misma tarjeta, dos verdades. La cura:
 * detalle y meaning leen spend; el apartado se nombra como lo que es. */
describe("§A · BR12-1 — «spent»: el detalle lee la misma cifra que el valor", () => {
  const b = () => book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_700_000), apartado("2026-11", 900_000)] });
  it("value 90% y detalle C$27,000 de C$30,000 — una sola verdad", () => {
    const sp = insight(b(), "2026-11", "spent")!;
    assert.equal(sp.value, "90.0%");
    assert.equal(sp.detail, "C$27,000.00 de C$30,000.00");
  });
  it("el meaning dice gasto y nombra el apartado como dinero que sigue siendo tuyo", () => {
    const sp = insight(b(), "2026-11", "spent")!;
    assert.match(sp.meaning, /apartas no cuenta como gasto/);
    const spEn = insight(b(), "2026-11", "spent", "en")!;
    assert.match(spEn.meaning, /set aside does not count as spending/);
    assert.equal(spEn.detail, "C$27,000.00 of C$30,000.00");
  });
});

/* ═══════════ §A · BR12-2: «LARGEST» NO CORONA AL APARTADO ═════════════
 * La base coronaba «Apartado a Meta» C$9,000 como «el gasto activo más
 * grande» con el 66.7% de la suma ancha. La cura: compiten solo las
 * líneas de gasto (isSpendLine) y la parte se mide contra el gasto. */
describe("§A · BR12-2 — «largest»: el apartado no compite como gasto", () => {
  const b = () => book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 400_000), line({ kind: "subscription", concept: "Netflix", amountMinor: 50_000 }, "2026-11"), apartado("2026-11", 900_000)] });
  it("la línea que manda es Mercado C$4,000, no el apartado", () => {
    const lg = insight(b(), "2026-11", "largest")!;
    assert.equal(lg.detail, "Mercado");
    assert.equal(lg.value, "C$4,000.00");
  });
  it("su parte se mide contra el gasto (4,000 de 4,500 = 88.9%), no contra la suma", () => {
    const lg = insight(b(), "2026-11", "largest")!;
    assert.equal(lg.viz?.kind, "share");
    if (lg.viz?.kind === "share") assert.ok(Math.abs(lg.viz.pct - (400_000 / 450_000) * 100) < 0.01, `pct=${lg.viz.pct}`);
  });
  it("un mes con SOLO apartado no tiene «línea que manda»: no hay gasto", () => {
    const b2 = book({ "2026-11": [ingreso("2026-11"), apartado("2026-11", 900_000)] });
    const lg = insight(b2, "2026-11", "largest")!;
    assert.equal(lg.value, "—");
    assert.equal(lg.detail, "Sin gastos.");
  });
});

/* ═══════════ §A · BR12-3: LA ALARMA «BREAK» NO ACUSA AL APARTADO ══════
 * La base: gastar 20,000 y apartar 15,000 anunciaba en tono bad el mismo
 * día 25 que gastar 35,000. La cura: el día nace del gasto; si lo anotado
 * pasa del ingreso solo por el apartado, la tarjeta lo dice como guardar
 * y no alarma; el tono sigue a la causa verdadera. */
describe("§A · BR12-3 — «break»: el día es del gasto; el apartado se nombra como causa", () => {
  it("solo cruza el apartado → «Cierra», tono good, y la frase nombra lo apartado", () => {
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_000_000), apartado("2026-11", 1_500_000)] });
    const brk = insight(b, "2026-11", "break")!;
    assert.equal(brk.value, "Cierra");
    assert.equal(brk.tone, "good");
    assert.match(brk.detail, /apartaste: C\$15,000\.00/);
    assert.match(brk.detail, /guardar, no gastar/);
    assert.match(brk.implication, /No hay que bajar gasto/);
  });
  it("control vivo: el gasto real de 35,000 sigue anunciando su día en tono bad", () => {
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 3_500_000)] });
    const brk = insight(b, "2026-11", "break")!;
    assert.equal(brk.value, "25");
    assert.equal(brk.tone, "bad");
  });
  it("el día se calcula sobre el gasto aunque también haya apartado", () => {
    // gasto 35,000 + apartado 9,000: el día del gasto (30,000/35,000×30=25)
    // — con la suma ancha la base habría dicho 20 (30,000/44,000×30).
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 3_500_000), apartado("2026-11", 900_000)] });
    const brk = insight(b, "2026-11", "break")!;
    assert.equal(brk.value, "25");
    assert.equal(brk.tone, "bad");
  });
  it("sin cruce de nada, la fila no nace (el filtro sigue siendo la salida)", () => {
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_000_000)] });
    assert.equal(insight(b, "2026-11", "break"), undefined);
  });
});

/* ═══════════ §A · BR12-4: «PARETO» ES DEL GASTO ═══════════════════════
 * La base: «Ahorro C$9,000.00» alcanzaba sola el 80% del «gasto». La cura:
 * numerador y denominador son gasto; la rebanada de rol ahorro sale de la
 * pila y del dibujo. */
describe("§A · BR12-4 — «pareto»: ni numerador ni denominador llevan apartado", () => {
  it("el 80% lo forman las categorías de gasto; «Ahorro» no aparece", () => {
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 50_000), line({ kind: "subscription", concept: "Netflix", amountMinor: 30_000 }, "2026-11"), apartado("2026-11", 900_000)] });
    const par = insight(b, "2026-11", "pareto")!;
    assert.equal(par.value, "2");
    assert.doesNotMatch(par.detail, /Ahorro/);
    assert.match(par.detail, /Mercado C\$500\.00 · Netflix C\$300\.00/);
    if (par.viz?.kind === "parts") {
      const total = par.viz.parts.reduce((a, p) => a + p.share, 0);
      assert.ok(Math.abs(total - 1) < 0.001, `las partes del dibujo suman ${total}, no 1: el denominador es el gasto`);
    }
  });
});

/* ═══════════ §A · BR12-5: EL LENTE Y LA TARJETA DEL AÑO NOMBRAN ═══════
 * La lectura contraria («todo lo que sale») se juzgó con el expediente:
 * la cifra del lente y el «Sale» del año SE QUEDAN (su tema y su lista
 * focal los definen), y la ley se cumple nombrando la composición en la
 * misma pantalla — el patrón absuelto de las baldosas del Asesor. */
describe("§A · BR12-5 — el lente y el año nombran la composición en su pantalla", () => {
  it("yearReport gana spend y savedFlow sin mover expense ni net", () => {
    const b = book({ "2026-11": [ingreso("2026-11", 4_500_000), gasto("2026-11", 2_700_000), apartado("2026-11", 900_000)] });
    const r = yearReport(b, 2026, "es", makeNamer(b.structure, "es"));
    assert.equal(r.expense, 3_600_000);
    assert.equal(r.spend, 2_700_000);
    assert.equal(r.savedFlow, 900_000);
    assert.equal(r.spend + r.savedFlow, r.expense);
    assert.equal(r.net, 900_000);
  });
  it("la YearCard pinta Gasto y Apartado junto al Sale cuando hay apartado (fuente)", () => {
    const s = SRC("../../components/faro/screens.tsx");
    assert.match(s, /r\.savedFlow > 0 \? <div><em>\{t\("study\.year\.gasto"\)\}/);
    assert.match(s, /r\.savedFlow > 0 \? <div><em>\{t\("study\.year\.apartado"\)\}/);
  });
  it("la nota del lente nombra el apartado con su monto cuando lo hay (fuente)", () => {
    const s = SRC("../../components/faro/screens.tsx");
    assert.match(s, /summary\.savingsFlow > 0 \? t\("desk\.spend\.note\.saved"\)\.replace\("\{x\}", fmt\(summary\.savingsFlow\)\) : t\("desk\.spend\.note"\)/);
  });
});

/* ═══════════ §A · BR12-6: EL CASHFLOW — UNA SOLA VERDAD POR PAREJA ════
 * La base: la leyenda leía el Summary (Sale 36,000 · queda −6,000) y la
 * línea dibujaba el punto (27,000 · +3,000). La cura: la leyenda lee el
 * punto activo que el gráfico dibuja. */
describe("§A · BR12-6 — la leyenda del CashFlow lee el punto que se dibuja", () => {
  it("netValue/inValue/outValue nacen de activePoint (fuente)", () => {
    const s = SRC("../../components/faro/screens.tsx");
    assert.match(s, /netValue: activePoint \? fmt\(Math\.round\(\(activePoint\.income - activePoint\.expense\) \* 100\)\)/);
    assert.match(s, /outValue: activePoint \? fmt\(Math\.round\(activePoint\.expense \* 100\)\)/);
    assert.match(s, /const activePoint = points\.find\(\(p\) => p\.key === activeKey\)/);
  });
  it("el gráfico dibuja ese mismo punto (charts.tsx lee p.expense/p.income del punto)", () => {
    const c = SRC("../../components/faro/charts.tsx");
    assert.match(c, /points\.map\(\(p\) => p\.income - p\.expense\)/);
  });
});

/* ═══════════ §A · BR12-7: LA HOJA «FLUJO» NOMBRA TODO LO QUE LLEVA ════
 * La base: Neto = ingresos − gastos-del-punto (27,000) = +3,000, sumando
 * en silencio lo apartado como si quedara libre. La cura: la columna
 * «Apartado» entra y el Neto vuelve a ser la caja (como antes de la 11). */
describe("§A · BR12-7 — la hoja Flujo gana la columna del apartado", () => {
  it("cabecera de cinco columnas y Neto = ingresos − gastos − apartado", () => {
    const b = book({ "2026-11": [ingreso("2026-11"), gasto("2026-11", 2_700_000), apartado("2026-11", 900_000)] });
    const pick: ExportPick = { scope: "year", activeOnly: false, kinds: [], savings: true, debt: true, summary: true, charts: true, advice: false, remit: false };
    const flujo = buildSheets(b, "2026-11", "es", makeNamer(b.structure, "es"), pick).find((sh) => sh.name === "Flujo")!;
    const val = (c: unknown): unknown => (c && typeof c === "object" ? (c as { v: unknown }).v : c);
    assert.deepEqual(flujo.rows[1]!.map(val), ["Mes", "Ingresos", "Gastos", "Apartado", "Neto"]);
    const nov = flujo.rows.find((row) => typeof val(row[0]) === "string" && /nov/i.test(val(row[0]) as string))!;
    assert.deepEqual(nov.map(val), ["nov", 30000, 27000, 9000, -6000]);
  });
});

/* ═══════════ §A · E12-1: LA CERCA DE LA CLASE — CARAS Y AGREGADORES ═══
 * La cerca de la ola 11 contaba LLAMADAS a 12 productores: el espécimen
 * M2 de la caza (una función que suma líneas por su cuenta, sin llamar a
 * ningún productor) pasó 31/31 verde — invisible por construcción. Y las
 * CARAS que reciben el Summary por props sin llamar a nadie (el lente de
 * Central, la YearCard) tampoco existían para el censo. Esta cerca
 * enumera, derivándolo del AST (el analizador de TypeScript, no regex
 * sobre texto: las cadenas y los comentarios no son accesos):
 *
 *   · CARAS — todo acceso `receptor.campo` a los campos cargados de
 *     doctrina (expense, spend, opportunity, savingsFlow, saved,
 *     outTotal, realSpend, transferMinor), atribuido a su función con
 *     nombre más cercana, clasificado gasto / movimiento / interna con
 *     su razón escrita.
 *   · AGREGADORES — toda función con nombre que toca líneas del mes
 *     (.lines / monthLines) y acumula (reduce / +=) sin llamar a un
 *     productor ni SER un productor: clasificada con su razón.
 *
 * Una cara nueva sin enumerar, un agregador nuevo sin clasificar y una
 * entrada muerta corren rojos. Los especímenes M1 (un sitio nuevo de
 * llamada a un productor) y M2 (el agregador propio) corren sobre
 * archivos virtuales por la MISMA maquinaria pura: la cerca los ve. */
const CAMPOS = new Set(["expense", "spend", "opportunity", "savingsFlow", "saved", "outTotal", "realSpend", "transferMinor"]);
const PRODUCTORES = new Set(["summarize", "yearPoints", "spanPoints", "compareSpans", "studyBoard", "buildInsights", "readCoach", "readAdvisor", "yearReport", "monthTotals", "categorySlices", "spendCategorySlices", "cashSankey"]);
type Clase = "gasto" | "movimiento" | "interna";

const fnNameOf = (node: ts.Node): string | null => {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node)) {
    const nm = node.name;
    return nm && (ts.isIdentifier(nm) || ts.isStringLiteral(nm)) ? nm.text : null;
  }
  if (ts.isArrowFunction(node)) {
    const p = node.parent;
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
    if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return (p.name as ts.Identifier | ts.StringLiteral).text;
    return null;
  }
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return node.name.getText();
  return null;
};
const isFnLike = (n: ts.Node) =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n) || ts.isConstructorDeclaration(n);

/** La maquinaria pura del censo: entra el árbol como pares (ruta, texto)
 * y salen las caras, los agregadores propios y los sitios de productores. */
function scanTree(files: { rel: string; text: string }[]) {
  const faces = new Set<string>();
  const aggregators = new Set<string>();
  const producerSites = new Set<string>();
  for (const { rel, text } of files) {
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node: ts.Node, stack: string[]) => {
      let st = stack;
      if (isFnLike(node)) {
        const nm = fnNameOf(node);
        if (nm) st = [...stack, nm];
        if (nm && !PRODUCTORES.has(nm) && (node as { body?: ts.Node }).body) {
          let touches = false, accumulates = false, callsProducer = false;
          const scan = (n: ts.Node) => {
            if (ts.isCallExpression(n)) {
              const callee = n.expression;
              if (ts.isIdentifier(callee) && PRODUCTORES.has(callee.text)) callsProducer = true;
              if (ts.isIdentifier(callee) && callee.text === "monthLines") touches = true;
              if (ts.isPropertyAccessExpression(callee) && callee.name.text === "reduce") accumulates = true;
            }
            if (ts.isPropertyAccessExpression(n) && n.name.text === "lines") touches = true;
            if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) accumulates = true;
            ts.forEachChild(n, scan);
          };
          scan((node as { body: ts.Node }).body);
          if (touches && accumulates && !callsProducer) aggregators.add(`${rel}:${nm}`);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && PRODUCTORES.has(node.expression.text)) {
        producerSites.add(`${rel}:${node.expression.text}`);
      }
      if (ts.isPropertyAccessExpression(node) && CAMPOS.has(node.name.text)) {
        faces.add(`${rel}:${st[st.length - 1] ?? "(top)"}:${node.expression.getText()}.${node.name.text}`);
      }
      ts.forEachChild(node, (c) => visit(c, st));
    };
    visit(sf, []);
  }
  return { faces, aggregators, producerSites };
}
const walkSrc = (dir: URL, prefix: string): { rel: string; text: string }[] => {
  const out: { rel: string; text: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...walkSrc(new URL(`${e.name}/`, dir), `${prefix}${e.name}/`));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push({ rel: `${prefix}${e.name}`, text: readFileSync(new URL(e.name, dir), "utf8") });
  }
  return out;
};

const CARAS: Record<string, [Clase, string]> = {
  "components/faro/advisor2.tsx:MonthTower:reading.outTotal": ["movimiento", "la torre pinta el total del río como movimiento, con su desglose al lado"],
  "components/faro/advisor2.tsx:MonthTower:reading.transferMinor": ["movimiento", "«Al ahorro»: el apartado nombrado como apartado"],
  "components/faro/advisor2.tsx:ShortVisual:reading.outTotal": ["movimiento", "el visual corto re-presenta el total del río como movimiento"],
  "components/faro/advisor2.tsx:ShortVisual:reading.transferMinor": ["movimiento", "el apartado nombrado en el mismo visual"],
  "components/faro/charts.tsx:CashFlow:p.expense": ["gasto", "los puntos son solo-gasto (pointSums) y la leyenda lee el mismo punto (BR12-6)"],
  "components/faro/charts.tsx:CompareRail:p.expense": ["gasto", "puntos de compareSpans: pair suma solo-gasto y saved aparte"],
  "components/faro/charts.tsx:CompareRail:picked.expense": ["gasto", "el punto elegido del riel es de la misma familia solo-gasto"],
  "components/faro/charts.tsx:StudyCharts:p.expense": ["gasto", "el punto que alimenta los gráficos del Estudio es solo-gasto"],
  "components/faro/panorama.tsx:HistoryCard:chosen.expense": ["gasto", "monthTotals separa por rol: su expense es solo-gasto y saved va aparte"],
  "components/faro/panorama.tsx:HistoryCard:m.expense": ["gasto", "cada mes del historial es un monthTotals: expense solo-gasto"],
  "components/faro/presentacion.tsx:Theater:snap.spend": ["gasto", "la foto de la Presentación pinta spend, el solo-gasto del Summary"],
  "components/faro/screens.tsx:Advisor:reading.realSpend": ["gasto", "«Gasto real» de las baldosas del Asesor: el río sin transferencias"],
  "components/faro/screens.tsx:Advisor:summary.expense": ["movimiento", "«Sale» de las baldosas: se pinta junto a «Gasto real» cuando difieren — la pareja nombrada"],
  "components/faro/screens.tsx:Advisor:summary.opportunity": ["movimiento", "lo libre del Asesor: caja (ingreso − salida), jamás nombrado gasto"],
  "components/faro/screens.tsx:Desk:summary.expense": ["movimiento", "el lente «Gastaré»: todo lo que sale, y su nota nombra el apartado cuando lo hay (BR12-5a)"],
  "components/faro/screens.tsx:Desk:summary.opportunity": ["movimiento", "«Queda» del lente: la caja del mes, ingreso − salida"],
  "components/faro/screens.tsx:Desk:summary.savingsFlow": ["movimiento", "el apartado nombrado como apartado en Central (la banda y la nota del lente)"],
  "components/faro/screens.tsx:Study:activePoint.expense": ["gasto", "la leyenda del CashFlow lee el punto dibujado: solo-gasto (BR12-6)"],
  "components/faro/screens.tsx:Study:p.expense": ["gasto", "puntos del Estudio (spanPoints): solo-gasto"],
  "components/faro/screens.tsx:Study:summary.expense": ["interna", "solo el repliegue de la leyenda cuando no hay punto activo: sin línea dibujada con la que discrepar"],
  "components/faro/screens.tsx:Study:summary.opportunity": ["interna", "el mismo repliegue para «Lo que queda» cuando no hay punto activo"],
  "components/faro/screens.tsx:Study:summary.savingsFlow": ["movimiento", "el apartado del mes nombrado en el Estudio como ahorro"],
  "components/faro/screens.tsx:YearCard:m.expense": ["movimiento", "la rejilla de meses pinta entra/sale/neto: sale es la salida y neto la caja, coherentes"],
  "components/faro/waitlist.tsx:WaitlistSection:year.saved": ["interna", "la cuenta del año de la lista de espera (5c, 1.3.360): suma los precios de los deseos DEJADOS — dinero no gastado, derivado de los deseos y no de líneas del libro; su cara lo nombra «la espera te ahorró»"],
  "components/faro/screens.tsx:YearCard:r.expense": ["movimiento", "«Sale» del año: la misma tarjeta nombra Gasto y Apartado cuando los hay (BR12-5b)"],
  "components/faro/screens.tsx:YearCard:r.spend": ["gasto", "el «Gasto» del año, nombrado junto al «Apartado» en la misma tarjeta (BR12-5b)"],
  "components/faro/screens.tsx:val:point.expense": ["interna", "el panel de corte recompone el total de herramienta sumando saved; sin etiqueta descriptiva propia"],
  "components/faro/screens.tsx:val:point.saved": ["interna", "la otra mitad de la recomposición del panel de corte"],
  "components/faro/shell.tsx:Shell:cal.expense": ["gasto", "los totales del calendario fluyen de buildCal y su puerta anti-fuga: lo apartado no se suma"],
  "components/faro/study2.tsx:CushionCard:coach.saved": ["movimiento", "el colchón nombra lo guardado como guardado (monthTotals.saved)"],
  "components/faro/study2.tsx:TimeCard:a.expense": ["gasto", "punto de compareSpans: solo-gasto"],
  "components/faro/study2.tsx:TimeCard:b.expense": ["gasto", "punto de compareSpans: solo-gasto"],
  "components/faro/study2.tsx:TimeCard:p.expense": ["gasto", "los puntos de la TimeCard son solo-gasto: su «Salió» es gasto"],
  "components/faro/study2.tsx:TimeCard:sel.expense": ["gasto", "el punto seleccionado de la TimeCard: solo-gasto"],
  "components/faro/study2.tsx:TimeCard:top.expense": ["gasto", "el punto mayor del tramo: solo-gasto"],
  "lib/faro/bitacora.ts:logbookOf:v.expense": ["interna", "el lector defensivo de la Bitácora (1.3.367) valida la forma de la foto mensual congelada; no presenta ni suma — la cifra ya vive contada en la foto"],
  "lib/faro/bitacora.ts:monthSnap:s.expense": ["movimiento", "la foto del mes de la Bitácora (1.3.367) congela el «sale» del resumen — la salida del mes con su nombre de movimiento — y la edición lo presenta como salidas, nunca como gasto a secas"],
  "lib/faro/bitacora.ts:monthSnap:s.opportunity": ["movimiento", "la foto del mes de la Bitácora (1.3.367) congela lo que quedó del mes — la caja, ingreso menos salida — y su fila lo presenta como la cifra del mes, jamás como gasto"],
  "lib/faro/bitacora.ts:monthSnap:s.savingsFlow": ["movimiento", "la foto del mes de la Bitácora (1.3.367) congela el apartado del mes nombrado como apartado; la edición lo suma en su tarjeta «Lo que apartaste»"],
  "lib/faro/bitacora.ts:composeYearEdition:rep.expense": ["movimiento", "la tarjeta «El año en una cifra» de la edición (1.3.367) lo presenta como «salieron», junto a «entraron» y la diferencia como «te quedó»"],
  "lib/faro/bitacora.ts:composeYearEdition:rep.spend": ["gasto", "el solo-gasto del año en la edición (1.3.367): es el denominador de «Dónde se fue más» («9 de cada 10 que gastaste») y la vara del dinero no gastado"],
  "lib/faro/bitacora.ts:composeYearEdition:m.expense": ["movimiento", "la salida de cada mes del informe anual en la edición (1.3.367): alimenta la comparación entre meses y la gráfica de la tarjeta del mes con precedente — la misma familia entra/sale del informe"],
  "lib/faro/bitacora.ts:composeYearEdition:x.expense": ["movimiento", "la serie de salidas mensuales que dibuja la tarjeta del mes con precedente de la edición (1.3.367): la forma del año en salidas, nombrada como el mes"],
  "lib/faro/bitacora.ts:composeYearEdition:ya.saved": ["interna", "las piezas guardadas al cerrar el año en la edición (1.3.367): vara interna para pesar la tarjeta del dinero no gastado; la tarjeta presenta las piezas dejadas, no esta cifra"],
  "lib/faro/coach.ts:readCoach:m.expense": ["gasto", "monthTotals.expense es solo-gasto por construcción (separa por rol)"],
  "lib/faro/coach.ts:readCoach:t.expense": ["gasto", "monthTotals.expense es solo-gasto por construcción (separa por rol)"],
  "lib/faro/coach.ts:readCoach:t.saved": ["movimiento", "monthTotals.saved: el apartado nombrado como apartado en el coach"],

  "lib/faro/ask.ts:leftAnswer:reading.outTotal": ["movimiento", "«Salió»: el total del río nombrado como salida junto a «Entró», nunca como gasto a secas"],
  "lib/faro/ask2.ts:ahorrosAnswer:sum.savingsFlow": ["movimiento", "la nota de ahorros del banco nombra el flujo como «flujo hacia el ahorro»: el apartado nombrado en la respuesta"],
  "lib/faro/ask2.ts:compararAnswer:a.spend": ["gasto", "la comparación de gastos del banco lee el spend de cada lado: solo-gasto en ambos lados"],
  "lib/faro/ask2.ts:compararAnswer:b.spend": ["gasto", "el otro lado de la misma comparación: solo-gasto, simétrico"],
  // 1.3.383 (la integración del banco): la comparación canónica del
  // banco nombra su lado presente «now» — la misma vara solo-gasto.
  "lib/faro/ask2.ts:compararAnswer:now.spend": ["gasto", "el lado presente de la comparación del banco (Ola 2–18): solo-gasto, la misma vara que a/b"],
  "lib/faro/ask2.ts:compararAnswer:before.spend": ["gasto", "el lado pasado de la comparación del banco (Ola 2–18): solo-gasto, simétrico de now"],
  "lib/faro/ask2.ts:compararAnswer:s.spend": ["gasto", "el resumen corrido de la comparación del banco al desplazar el eje (§20 sobre la pieza): solo-gasto, la misma vara"],
  "lib/faro/ask2.ts:compararAnswer:sum.spend": ["gasto", "el resumen de cada lado en la comparación de categorías del banco: solo-gasto, la misma vara"],
  "lib/faro/ask2.ts:compararAnswer:summarize(c.state, k1, c.lang).spend": ["gasto", "un lado de la comparación del banco leído directo del productor: solo-gasto"],
  "lib/faro/ask2.ts:compararAnswer:summarize(c.state, k2, c.lang).spend": ["gasto", "el otro lado de la misma comparación, simétrico: solo-gasto"],
  "lib/faro/ask2.ts:promedioAnswer:sum.spend": ["gasto", "el promedio verdadero del banco divide el spend del productor entre sus meses: solo-gasto"],
  "lib/faro/ask2.ts:reglaAnswer:sum.spend": ["gasto", "la regla 50·30·20 del banco reparte el spend del productor en sus tres cubos: solo-gasto, nombrado por cubo"],
  "lib/faro/ask2.ts:totalOf:summarize(c.state, k, c.lang).spend": ["gasto", "el desplazamiento del seguimiento (§20, 1.3.380) relee el spend de cada mes de la ventana corrida: solo-gasto, la misma vara de compararAnswer"],
  "lib/faro/ask2.ts:ensanchar:summarize(c.state, f.monthA, c.lang).spend": ["gasto", "el ensanche del seguimiento (Ola 28, Familia 2) relee el mes del marco SIN el filtro, con el resumen entero del productor: solo-gasto, la misma vara de totalOf"],
  "lib/faro/ask2.ts:ensanchar:summarize(c.state, f.monthB, c.lang).spend": ["gasto", "el otro mes del marco comparado en el mismo ensanche, simétrico: solo-gasto"],
  "lib/faro/ask2.ts:proyectarSeguimiento:summarize(c.state, c.key, c.lang).spend": ["gasto", "la proyección del seguimiento (§20, 1.3.380) repite el ritmo del mes en curso: el spend nombrado como ritmo, con su supuesto dicho en la nota"],
  "lib/faro/engine.ts:buildAdvice:reading.outTotal": ["movimiento", "las baldosas del Asesor nombran «Sale» junto a «Gasto real» y «Al ahorro»"],
  "lib/faro/engine.ts:buildAdvice:reading.realSpend": ["gasto", "«Gasto real»: el río sin la transferencia al ahorro"],
  "lib/faro/engine.ts:buildAdvice:reading.transferMinor": ["movimiento", "«Al ahorro»: el apartado nombrado en las baldosas"],
  "lib/faro/engine.ts:buildAdvice:s.opportunity": ["interna", "compone las frases de lo libre de buildInsights; la cara clasificada es la tarjeta"],
  "lib/faro/engine.ts:buildAdvice:s.savingsFlow": ["interna", "compone la frase del apartado de buildInsights; la cara clasificada es la tarjeta"],
  "lib/faro/engine.ts:buildBudget:s.savingsFlow": ["interna", "el presupuesto lee el flujo apartado para su composición; sin frase de gasto propia"],
  "lib/faro/engine.ts:buildInsights:s.expense": ["interna", "tras la cura, solo composición: el nacimiento de la fila break y la causa savedCross (BR12-3); ninguna frase la pinta"],
  "lib/faro/engine.ts:buildInsights:s.opportunity": ["interna", "las frases de lo libre («quedan libres», «se cierra con»): caja, no gasto"],
  "lib/faro/engine.ts:buildInsights:s.spend": ["gasto", "las frases del Asesor tras las curas 11/12: spent, largest, pareto y break hablan de gasto"],
  "lib/faro/engine.ts:studyBoard:s.expense": ["interna", "solo dentro de la tasa del tablero ((ingreso − salida) / ingreso); el nombre de esa tasa es el sospechoso registrado y no se toca a palabra de Oscar"],
  "lib/faro/engine.ts:studyBoard:s.opportunity": ["interna", "compone el neto del tablero; la cara clasificada es el Estudio"],
  "lib/faro/engine.ts:studyBoard:s.savingsFlow": ["interna", "compone el ahorro del tablero; la cara clasificada es el Estudio"],
  "lib/faro/engine.ts:studyBoard:s.spend": ["gasto", "el burn del tablero quema solo gasto en ambos lados tras la cura 11"],
  "lib/faro/export-docs.ts:budgetSheet:S.spend": ["gasto", "la hoja de presupuesto pinta spend: solo-gasto"],
  "lib/faro/export-docs.ts:buildPdfPages:point.expense": ["gasto", "puntos solo-gasto en las páginas del PDF"],
  "lib/faro/export-docs.ts:buildSheets:point.expense": ["gasto", "la columna «Gastos» de Flujo y las barras: puntos solo-gasto"],
  "lib/faro/export-docs.ts:buildSheets:point.saved": ["movimiento", "la columna «Apartado» de Flujo (BR12-7): el apartado nombrado en la hoja"],
  "lib/faro/export-docs.ts:buildSheets:summary.opportunity": ["movimiento", "«Queda» de la hoja Resumen: la caja, con su nombre"],
  "lib/faro/export-docs.ts:buildSheets:summary.savingsFlow": ["movimiento", "«Ahorro del mes» de la hoja Resumen: el apartado nombrado"],
  "lib/faro/today.ts:todaySpend:summarize(state, key, state.settings.lang).opportunity": ["interna", "lo libre por día («disponible»): caja repartida, jamás nombrado gasto"],
  "lib/faro/widget.ts:buildWidgetSnapshot:m.expense": ["gasto", "monthTotals del widget: expense solo-gasto"],
  "lib/faro/widget.ts:buildWidgetSnapshot:s.expense": ["movimiento", "el widget pinta entra/sale como flujos nombrados; usedPct = spentPct (solo-gasto)"],
  "lib/faro/widget.ts:buildWidgetSnapshot:s.spend": ["gasto", "ola 14 (Asesor A3): el gasto verdadero viaja a la cáscara en la foto — FaroNotify decide y habla con él y la barra héroe se llena con él; spend (expense) sigue siendo la suma ancha que «Gastaré» nombra"],
  "lib/faro/widget.ts:buildWidgetSnapshot:s.opportunity": ["movimiento", "el widget nombra la caja como lo que queda"],
  "lib/faro/widget.ts:buildWidgetSnapshot:s.savingsFlow": ["movimiento", "el widget nombra el ahorro del mes como ahorro"],
  "lib/faro/year.ts:yearReport:s.expense": ["interna", "compone el YearReport; su cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.opportunity": ["interna", "compone los netos de la rejilla del año; la cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.savingsFlow": ["interna", "compone savedFlow del año (BR12-5b); su cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.spend": ["interna", "compone spend del año (BR12-5b); su cara clasificada es YearCard"],
};

/* ENMIENDA CAPTURA OLA 1: sale «receipt-scan.tsx:ScanSheet» — la hoja ya
 * no suma partidas: enseña resúmenes de solo lectura y los borradores
 * caen en la bandeja; la suma vive en la mesa (draftTotals, librería). */
const AGREGADORES: Record<string, [Clase, string]> = {
  "lib/faro/ask2.ts:incomeKit": ["movimiento", "el kit del ingreso volátil (Ola 30 del banco) suma las líneas de ingreso de cada mes anotado para medir mediana, piso y excedente: lee movimientos de ingreso; no gasta, no escribe"],
  "lib/faro/ask2.ts:ausenciaAnswer": ["movimiento", "la ausencia (Ola 35 del banco) recorre las líneas de los meses anotados para medir el ritmo propio de cada categoría (meses con historia y día típico de primera aparición) y nombrar la que este mes no llegó: lee movimientos; no gasta, no escribe"],
  "lib/faro/ask2.ts:monthOut": ["gasto", "el mes de gasto de la vara del ahorro (Ola 41 del banco): suma las salidas activas de UN mes anotado, fuera el apartado, para medir el mes típico contra el que se juzga el ahorro: es gasto medido del libro; no escribe"],
  "lib/faro/ask2.ts:monthIn": ["movimiento", "el mes de ingreso de la vara del ahorro (Ola 41 del banco): suma las entradas activas de UN mes anotado para medir el ingreso típico contra el que se juzga el ahorro: lee movimientos de ingreso; no gasta, no escribe"],
  "lib/faro/ask2.ts:anoContraAnoAnswer": ["movimiento", "el año contra el año (Ola 47 del banco): suma las líneas de los dos tramos anuales que compara (enero al mes en curso, este año y el pasado) para decir la diferencia con su porcentaje: lee movimientos de los dos años; no gasta, no escribe"],
  "lib/faro/ask2.ts:deudasAnswer": ["movimiento", "las deudas contadas de la fuente única (Ola 44 del banco): suma los saldos vivos por persona y las piezas del total (netBalance de debts.ts) para decir cuánto se debe y cuánto te deben: lee movimientos de deuda; no gasta, no escribe"],
  "lib/faro/exit.ts:passiveMonths": ["interna", "la lectura del registro pasivo (Pieza C8, 1.3.398): suma las líneas CONGELADAS de un folio de historia en el Archivo; no es una cifra del libro vivo — ningún motor la compone con el presente, y su cara la nombra historia"],
  "components/faro/advisor2.tsx:ShortVisual": ["gasto", "el resto de «los gastos que más pesaron»: suma las líneas del río ya clasificadas SIN las transferencias (el apartado fuera)"],
  "components/faro/archivo.tsx:ArchivoScreen": ["interna", "suma lo archivado para la vista del Archivo, nombrado como archivo; no es una frase del mes vivo"],
  "components/faro/book-side.tsx:BookSide": ["interna", "totales por libro de la barra lateral (el saldo de cada libro), no frases de gasto del mes"],
  "components/faro/cards.tsx:CardScan": ["interna", "suma las partidas del escaneo de la tarjeta antes de guardar; no agrega el libro"],
  "components/faro/screens.tsx:Desk": ["interna", "subtotales por tienda de la vista elegida, nombrados por tienda; el Summary viene del proveedor"],
  "components/faro/screens.tsx:DueOwe": ["movimiento", "suma cobros y pagos por su nombre (lo que te deben / lo que debes): no es gasto"],
  "components/faro/screens.tsx:PotReport": ["movimiento", "el reporte de bolsillos suma el ahorro por bolsillo, nombrado como ahorro"],
  "components/faro/screens.tsx:ShopBoard": ["interna", "totales por tienda del tablero, nombrados por tienda"],
  "components/faro/screens.tsx:inflowOf": ["movimiento", "suma solo líneas de ahorro del sub de retiro: es el apartado, y su cara lo nombra retiro"],
  "components/faro/shell.tsx:buildCal": ["gasto", "buildCal suma los vencimientos del día tras la puerta anti-fuga de descanso: lo apartado no entra en sus totales"],
  "lib/faro/advisor.ts:projectLeft": ["interna", "aritmética de escenarios sobre las líneas YA clasificadas del río (la transferencia separada por cls): no re-suma el libro"],
  "lib/faro/advisor.ts:readAdvisorFresh": ["movimiento", "la definición del río: nace outTotal (movimiento), realSpend (solo-gasto) y transferMinor (apartado), separados por cls"],
  "lib/faro/advisor.ts:seenIn": ["interna", "cuenta MESES en que una línea se vio (0–3): no suma dinero"],
  "lib/faro/area-advice.ts:areaMonths": ["movimiento", "barras por área: cada área se nombra a sí misma y el área de ahorro es ahorro a la vista"],
  "lib/faro/area-advice.ts:areaPicture": ["interna", "compone la foto del área sobre areaMonths y el resumen; sin suma descriptiva propia nueva"],
  "lib/faro/area-advice.ts:pocketStock": ["interna", "stock de un bolsillo (saldos a una fecha), no flujo del mes ni frase de gasto"],
  // 1.3.383 (la integración del banco): savInMonth suma las líneas
  // del mes cuyo papel es AHORRO — el apartado nombrado como ahorro
  // en cada una de sus caras (el porcentaje guardado, el ritmo).
  "lib/faro/ask2.ts:savInMonth": ["movimiento", "suma solo líneas de papel ahorro del mes: es el apartado, y sus caras lo nombran ahorro"],
  "lib/faro/ask2.ts:estacionalidadAnswer": ["gasto", "la estacionalidad del banco (Ola 15) suma el gasto de cada mes anotado para hallar el más fuerte y la media: solo-gasto, nombrado como gasto"],
  "lib/faro/ask2.ts:contrafactualAnswer": ["gasto", "el contrafactual del banco (Ola 9) suma el gasto histórico del filtro nombrado para medir cuánto se juntaría sin él: solo-gasto, nombrado como gasto"],
  "lib/faro/ask2.ts:frecuenciaAnswer": ["gasto", "la frecuencia del banco (Ola 9) cuenta cada concepto y suma su gasto para acompañar el conteo: solo-gasto, nombrado por concepto"],
  "lib/faro/awake.ts:savingsPicture": ["movimiento", "la foto al despertar nombra lo guardado como guardado: es la superficie del apartado"],
  "lib/faro/autopay.ts:settleAutopay": ["interna", "mecánica de asentamiento de la Ola 6 (1.3.356): anota las instancias vencidas de las cuotas con pago automático; no presenta sumas — los cargos que crea los clasifican los motores de siempre"],
  "lib/faro/bankbook.ts:rewardsMonth": ["interna", "suma recompensas de tarjetas (ganadas y perdidas), no gasto ni salida del mes"],
  "lib/faro/bitacora.ts:recordedSpan": ["interna", "el tramo registrado de la Bitácora (1.3.367): recorre las líneas para hallar el primer y el último día con registro; no suma dinero"],
  "lib/faro/bitacora.ts:yearPrices": ["interna", "la serie de precios del año de la Bitácora (1.3.367): sigue el precio de cada concepto y fijo a lo largo del año para su tarjeta; no suma totales del libro — su cara nombra el precio"],
  "lib/faro/bankparse.ts:buildReview": ["interna", "compone la revisión de la importación: partidas por archivo y cuenta, con su nombre en la revisión"],
  "lib/faro/defaults.ts:sumLines": ["interna", "resumen de líneas de la casa semilla (saldos arrastrados), no frases del libro vivo"],
  "lib/faro/descanso.ts:hideLines": ["interna", "mecánica de ocultar: suma entra/sale del tramo para su confirmación, nombrados como el tramo oculto"],
  "lib/faro/descanso.ts:hidePeriod": ["interna", "mecánica de ocultar un período: la misma puerta que hideLines"],
  "lib/faro/descanso.ts:restingEntries": ["interna", "enumera lo que descansa para la puerta anti-fuga; no presenta sumas"],
  "lib/faro/earnings.ts:earningsBySource": ["interna", "solo ingresos por fuente y recompensas: el apartado no es ingreso y no entra"],
  "lib/faro/people.ts:spendByPerson": ["gasto", "tras BR13-A1: denominador y filas por isSpendLine (activa y sin descansar en ambos lados); personLines sigue entera para el historial, la agregación filtra"],
  "lib/faro/remesas.ts:remitTrend": ["movimiento", "remesas por mes, nombradas como remesas"],
  "lib/faro/sample.ts:countSampleRows": ["interna", "cuenta filas de la casa de muestra: no suma dinero"],
  "lib/faro/savings.ts:savingsStock": ["interna", "stock de ahorro (saldos a una fecha), no flujo del mes: su cara lo nombra «guardado»"],
  "lib/faro/projection.ts:projectWalk": ["interna", "la caminata del saldo proyectado (§19.1, 1.3.365): suma solo obligaciones futuras ya comprometidas (series, tarjetas, patrones) sobre el stock de savingsStock — no re-suma el libro ni alimenta ningún total del mes; su cara lo nombra «proyectado»"],
};

describe("§A · E12-1 — el censo de caras y agregadores, derivado del AST", () => {
  const found = scanTree(walkSrc(new URL("../../", import.meta.url), ""));
  it("toda cara del árbol está enumerada, con clase y razón; ninguna entrada muerta", () => {
    for (const key of found.faces) {
      assert.ok(CARAS[key], `CARA SIN ENUMERAR: ${key} — enumérala (gasto / movimiento / interna) con su razón`);
    }
    for (const [key, [clase, razon]] of Object.entries(CARAS)) {
      assert.ok(found.faces.has(key), `entrada muerta del censo de caras: ${key} — la cara ya no existe; retira la entrada`);
      assert.ok(["gasto", "movimiento", "interna"].includes(clase), `${key}: clase inválida`);
      assert.ok(razon.length > 10, `${key}: la clasificación lleva su razón escrita`);
    }
  });
  it("todo agregador propio está clasificado, con clase y razón; ninguna entrada muerta", () => {
    for (const key of found.aggregators) {
      assert.ok(AGREGADORES[key], `AGREGADOR SIN CLASIFICAR: ${key} — clasifícalo (gasto / movimiento / interna) con su razón`);
    }
    for (const [key, [clase, razon]] of Object.entries(AGREGADORES)) {
      assert.ok(found.aggregators.has(key), `entrada muerta del censo de agregadores: ${key} — retira la entrada`);
      assert.ok(["gasto", "movimiento", "interna"].includes(clase), `${key}: clase inválida`);
      assert.ok(razon.length > 10, `${key}: la clasificación lleva su razón escrita`);
    }
  });
  it("M1 · un sitio NUEVO de llamada a un productor se ve (la cerca de la ola 11 lo acusa)", () => {
    const virtual = scanTree([{ rel: "lib/faro/inventado.ts", text: "export const x = (s: never, k: string) => summarize(s, k, 'es').spend;" }]);
    assert.ok(virtual.producerSites.has("lib/faro/inventado.ts:summarize"), "el sitio nuevo de summarize no fue detectado");
    assert.ok(!CARAS["lib/faro/inventado.ts:(top):summarize" as never] && !AGREGADORES["lib/faro/inventado.ts:x"], "el espécimen virtual no debe estar clasificado");
  });
  it("M2 · un agregador que suma líneas por su cuenta, sin productor, ACUSA", () => {
    const m2 = [
      "import { monthLines, inView } from './engine.ts';",
      "export function sumaPropia(state: never, key: string): number {",
      "  return monthLines(state, key).reduce((a: number, l: never) => a + inView(l, 'NIO', 0), 0);",
      "}",
    ].join("\n");
    const virtual = scanTree([{ rel: "lib/faro/inventado.ts", text: m2 }]);
    assert.ok(virtual.aggregators.has("lib/faro/inventado.ts:sumaPropia"), "M2 no fue detectado como agregador propio");
    assert.ok(!AGREGADORES["lib/faro/inventado.ts:sumaPropia"], "M2 no debe estar clasificado: en el árbol real correría rojo");
  });
  it("control: una función que llama a un productor no es agregador propio", () => {
    const ok = "export function caraNueva(state: never, key: string) { const s = summarize(state, key, 'es'); return s.spend; }";
    const virtual = scanTree([{ rel: "lib/faro/inventado.ts", text: ok }]);
    assert.equal(virtual.aggregators.size, 0);
    assert.ok(virtual.faces.has("lib/faro/inventado.ts:caraNueva:s.spend"), "la cara nueva se ve: sin enumerar, correría roja");
  });
});

/* ═══════════ §B · S1: EL PRESET EXISTE — LA GUARDA PREGUNTA EN cardsOf ═
 * El espécimen de la caza (en vivo): editar «Chase Freedom Unlimited»
 * (preset jamás guardado) cerraba la forma sin una palabra y sin guardar
 * nada — la segunda cerradura buscaba en storedCards, donde el preset no
 * vive. La cura: la existencia se pregunta en cardsOf (donde el preset
 * vive); la composición cae sobre su foto virtual y putCard lo
 * materializa, como antes de la cura 11. El fantasma verdadero (ni
 * guardada ni en cardsOf) sigue devolviendo el estado intacto. */
describe("§B · S1 — la primera edición de un preset se materializa; el fantasma sigue intacto", () => {
  it("la guarda del commit pregunta la existencia en cardsOf, no solo en storedCards (fuente)", () => {
    const s = SRC("../../components/faro/cards.tsx");
    // ENMIENDA OLA 14 (G14-5): la guarda pregunta ahora con la pregunta
    // única de tres estados (cardExistence, en la librería): el preset
    // virtual sigue vivo por cardsOf dentro de esa pregunta, y la
    // composición conserva la misma caída (storedCards, luego cardsOf)
    // cuando la tarjeta vive; lo archivado no funde y lo destruido
    // devuelve el estado intacto, como mandaba S1.
    assert.match(s, /const existence = !isAdd && !freshId \? cardExistence\(s, bornId\) : "alive";/);
    // ENMIENDA OLA 15 (G15-3): los dos retornos intactos ahora dejan
    // primero su veredicto en saveVerdict (el aborto re-anuncia en vez
    // de cerrar en silencio); la doctrina que S1 clava no cambia — lo
    // destruido y lo que no vive en ninguna casa devuelven el estado
    // intacto dentro del commit.
    // ENMIENDA OLA 18 (BR18-1): esos abortos devuelven ahora null por
    // la puerta GUARDADA (commitGuarded): el estado queda intacto y,
    // además, sin marco — el envoltorio ordinario anteponía la entrada
    // de Actividad con el nombre tecleado sobre un guardado que la
    // receta acababa de negar (BR18-1). La doctrina de S1 no cambia.
    assert.match(s, /if \(existence === "gone"\) \{ saveVerdict\.current = \{ applied: false, existence \}; return null; \}/);
    assert.match(s, /storedCard \?\? \(!isAdd && !freshId \? cardsOf\(s\)\.find\(\(c\) => c\.id === bornId\) : undefined\)/);
    assert.match(s, /if \(!isAdd && !freshId && !liveCard\) \{ saveVerdict\.current = \{ applied: false, existence: "gone" \}; return null; \}/);
  });
  it("el preset vive en cardsOf sin estar en storedCards, y putCard lo materializa con la edición", () => {
    const b = book({});
    const preset = cardsOf(b).find((c) => c.preset);
    assert.ok(preset, "la casa semilla ofrece presets");
    assert.ok(!storedCards(b).some((c) => c.id === preset!.id), "el preset no está guardado todavía");
    const edited = { ...preset!, name: "Chase Editada Ola12", limitMinor: 500_000 };
    const after = putCard(b, edited);
    const stored = storedCards(after).find((c) => c.id === preset!.id);
    assert.ok(stored, "la primera edición materializa el preset");
    assert.equal(stored!.name, "Chase Editada Ola12");
    assert.equal(stored!.limitMinor, 500_000);
  });
});

/* ═══════════ §B · F5: EL CAMPO DERIVADO SIGUE A SU FUENTE ═════════════
 * El espécimen de la caza (sobre la función real): la tarjeta nació sin
 * red; A la renombra a un nombre clasificable; el candidato deriva la
 * red y la fusión la descartaba leyendo la de lo vivo (ninguna). */
describe("§B · F5 — fuseCardDraft: la red derivada del nombre tocado entra", () => {
  const base: CreditCard = {
    id: "cc-9", name: "Banco", issuer: "", mark: "", color: "#079ed9", last4: "", currency: "USD",
    limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [],
  };
  const draftBase: Record<string, string> = {
    name: "Banco", last4: "", apr: "", promo: "", limit: "", dueDay: "", autopay: "", rewards: "",
    art: "", color: "#079ed9", balance: "", avail: "", min: "", dueOn: "", mark: "", issuer: "", network: "", rw: "",
  };
  it("renombrar a «Mastercard Oro» le da su red: la derivada manda sobre lo vivo", () => {
    const born = { ...draftBase };
    const draft = { ...draftBase, name: "Mastercard Oro" }; // solo el nombre tocado
    const candidate: CreditCard = { ...base, name: "Mastercard Oro", network: "mastercard" }; // proceed derivó
    const fused = fuseCardDraft(base, candidate, draft, born);
    assert.equal(fused.name, "Mastercard Oro");
    assert.equal(fused.network, "mastercard");
  });
  it("control: sin tocar el nombre, la red se sigue leyendo de lo vivo", () => {
    const born = { ...draftBase };
    const draft = { ...draftBase, apr: "30" }; // solo la tasa tocada
    const live: CreditCard = { ...base, network: "visa" };
    const candidate: CreditCard = { ...base, aprBps: 3000, network: "mastercard" };
    const fused = fuseCardDraft(live, candidate, draft, born);
    assert.equal(fused.network, "visa");
    assert.equal(fused.aprBps, 3000);
  });
});

/* ═══════════ §B · S2: EL PRÉSTAMO Y SU GEMELA FUSIONAN ════════════════
 * El espécimen de la caza (en vivo): B fija la tasa 24 y guarda; A, con
 * su foto en 10, guarda solo el nombre — el registro final leía 1000.
 * La cura: el borrador viaja con su testigo (touchedFields contra el
 * nacido) y fuseLoanFields lee lo no tocado de la fila viva del commit. */
describe("§B · S2 — fuseLoanFields: lo no tocado se lee del registro vivo", () => {
  const MAP: ReadonlyArray<readonly [keyof Loan, string]> = [
    ["lender", "name"], ["who", "who"], ["kind", "kind"], ["amountMinor", "amount"], ["currency", "currency"],
    ["aprBps", "apr"], ["takenOn", "date"], ["book", "book"], ["dueDay", "dueDay"],
  ];
  const liveLoan: Loan = {
    id: "ln-1", lender: "Banco", who: "entity", kind: "interest", amountMinor: 1_000_000, currency: "USD",
    aprBps: 2400, takenOn: "2026-10-01", book: "fixed", note: "nota viva", dueDay: 15,
  };
  it("guardar solo el nombre conserva la tasa que la otra pestaña fijó", () => {
    const candidate: Loan = { ...liveLoan, lender: "Banco Cruce A", aprBps: 1000 }; // la foto de A
    const fused = fuseLoanFields(liveLoan, candidate, new Set(["name"]), MAP);
    assert.equal(fused.lender, "Banco Cruce A");
    assert.equal(fused.aprBps, 2400);
    assert.equal(fused.note, "nota viva");
  });
  it("lo tocado manda: la tasa editada entra, y el dueDay tocado a 0 sale", () => {
    const candidate: Loan = { ...liveLoan, aprBps: 3000 };
    delete (candidate as { dueDay?: number }).dueDay;
    const fused = fuseLoanFields(liveLoan, candidate, new Set(["apr", "dueDay"]), MAP);
    assert.equal(fused.aprBps, 3000);
    assert.equal(fused.dueDay, undefined);
  });
  it("el dueDay no tocado se conserva de lo vivo aunque el candidato lo borre", () => {
    const candidate: Loan = { ...liveLoan, lender: "Otro" };
    delete (candidate as { dueDay?: number }).dueDay;
    const fused = fuseLoanFields(liveLoan, candidate, new Set(["name"]), MAP);
    assert.equal(fused.dueDay, 15);
  });
  it("la gemela (Lent) fusiona con su propio mapa", () => {
    const LENT_MAP: ReadonlyArray<readonly [keyof Lent, string]> = [
      ["person", "name"], ["kind", "kind"], ["amountMinor", "amount"], ["aprBps", "apr"], ["dueOn", "date"],
    ];
    const live: Lent = { id: "lt-1", person: "Ana", kind: "interest", amountMinor: 500_000, currency: "USD", aprBps: 2400, startedOn: "2026-10-01", dueOn: "2026-12-01", note: "" };
    const candidate: Lent = { ...live, person: "Ana Cruce", aprBps: 1000 };
    const fused = fuseLoanFields(live, candidate, new Set(["name"]), LENT_MAP);
    assert.equal(fused.person, "Ana Cruce");
    assert.equal(fused.aprBps, 2400);
  });
  it("la forma calcula el testigo y lo entrega en el borrador (fuente)", () => {
    const s = SRC("../../components/faro/loans.tsx");
    assert.match(s, /touched: touchedFields\(baseRef\.current \?\? \{\}, \{ kind, who, name, amount, currency, date, apr, book, dueDay \}\)/);
    assert.match(s, /fuseLoanFields\(l, composed, d\.touched, LOAN_FIELD_MAP, LOAN_DERIVED_FROM\)/);
    const d = SRC("../../components/faro/debts.tsx");
    assert.match(d, /fuseLoanFields\(r, composed, d\.touched, LENT_FIELD_MAP, LOAN_DERIVED_FROM\)/);
  });
});

/* ═══════════ §B · PERSONAS: EL COMMIT COMPONE SOBRE LO VIVO ══════════
 * El espécimen de la caza (nivel commit, composición verbatim): B añade
 * a Beto; A guarda su edición de Ana desde su foto — Beto desaparecía; y
 * el renombre de B retrocedía. La cura: savePeople aplica la
 * transformación dentro del commit sobre peopleOf(s), y la ficha editada
 * se fusiona por id con su testigo (fusePerson).
 *
 * ENMIENDA OLA 19 (G19-3): la puerta de savePeople es ahora la
 * GUARDADA y la receta ata lo vivo antes de aplicar la transformación
 * (`const live = peopleOf(s); const next = fn(live);`), devolviendo su
 * propio estado cuando el resultado es elemento a elemento idéntico —
 * la negativa de la transformación (la persona nombrada ya no vive) no
 * deja marco. La doctrina de esta sección no se mueve: la
 * transformación sigue corriendo dentro del commit sobre la colección
 * viva. El pin de fuente se enmienda a la forma nueva, y los jueces de
 * esta cerca (la firma «fusiona» y el detector de mecanismo
 * fn-sobre-vivo) aprenden la atadura: un identificador atado a la
 * llamada del accesor cuenta como el accesor mismo — la misma doctrina
 * que la ola 19 trae a las cercas TS (la atadura de la llamada alimenta
 * como la llamada en línea). La atadura a la foto sigue acusando. */
describe("§B · Personas — el commit compone contra la colección viva y fusiona la ficha", () => {
  const ana: Person = { id: "p-ana", name: "Ana", birthday: "1990-01-01", dates: [], note: "nota de B", color: "#123456", archived: false };
  it("fusePerson: lo tocado gana; lo no tocado y lo no gobernado se lee de lo vivo", () => {
    const edited: Person = { id: "p-ana", name: "Ana Nueva", birthday: "1990-01-01", dates: [], note: "nota vieja de A" };
    const fused = fusePerson(ana, edited, new Set(["name"]));
    assert.equal(fused.name, "Ana Nueva");
    assert.equal(fused.note, "nota de B"); // la nota que B guardó sobrevive
    assert.equal(fused.color, "#123456"); // lo que la forma ni trae, de lo vivo
  });
  it("la persona añadida por la otra pestaña sobrevive a la edición (la transformación corre sobre lo vivo)", () => {
    const beto: Person = { id: "p-beto", name: "Beto", birthday: "", dates: [], note: "" };
    const live: Person[] = [ana, beto]; // el libro YA tiene a Beto cuando el commit de A corre
    const edited: Person = { ...ana, name: "Ana Nueva" };
    const next = live.map((x) => (x.id === ana.id ? fusePerson(x, edited, new Set(["name"])) : x));
    assert.deepEqual(next.map((p) => p.id), ["p-ana", "p-beto"]);
    assert.equal(next[0]!.name, "Ana Nueva");
  });
  it("savePeople aplica la transformación dentro del commit (fuente)", () => {
    const s = SRC("../../components/faro/people.tsx");
    /* ENMIENDA OLA 19 (G19-3): la forma clavada es la curada — puerta
     * guardada, lo vivo atado antes de aplicar fn, y el retorno intacto
     * cuando la transformación no tocó nada. La prohibición vieja
     * («people: next» fuera) apuntaba a la foto del render; aquí `next`
     * ES el resultado de fn sobre lo vivo, y este pin certifica su
     * origen en la atadura en vez de prohibir su nombre. */
    assert.match(s, /const savePeople = \(fn: \(live: Person\[\]\) => Person\[\], detail: string\) => commitGuarded\(\(s\) => \{\n    const live = peopleOf\(s\);\n    const next = fn\(live\);/);
    assert.ok(!/people: fn\(/.test(s), "ninguna escritura aplica la transformación saltándose la atadura viva");
  });
});

/* ═══════════ §B · LA CERCA DE LA CLASE: EL CENSO DE FORMAS QUE GUARDAN ═
 * La tabla de la caza (OLA12-GUARDIAN, terreno 3) queda como cerca. Dos
 * brazos derivados del AST sobre components/:
 *   A · COMPOSICIONES EN LÍNEA — todo updater de commit que compone una
 *       colección en el acto (map sobre un accesor de colección, o la
 *       asignación de una llave de colección en el objeto devuelto).
 *   B · ESCRITORES DE FORMA — todo updater de commit que llama a un
 *       escritor de fichas de la librería (putCard, editAccount,
 *       setRewardReal, addReading, addRewards; y en line-form.tsx, la
 *       raíz upsertLine/declareSeries).
 * Cada sitio, clasificado por su doctrina al cometer: «fusiona» (lo no
 * tocado se lee del registro vivo), «campo» (escribe campos dentro del
 * commit desde el estado vivo), «naturaleza» (reemplaza por naturaleza
 * de su objeto: la lista o la plantilla ES el registro), «anexa» (nace o
 * anexa sobre el vivo por id). Un sitio nuevo sin clasificar — y una
 * entrada muerta — corren rojos. */
const COLL_ACCESSORS = new Set(["loansOf", "lentOf", "peopleOf", "storedCards", "cardsOf", "activePeople", "accounts", "importBook"]);
const COLL_KEYS_B = new Set(["people", "loans", "lent", "cards", "debtPlan", "structure", "months", "cardsOff", "bank", "subPresets", "freqPresets", "remitPeople"]);
const FORM_WRITERS = new Set(["putCard", "editAccount", "setRewardReal", "addReading", "addRewards"]);
const ROOT_WRITERS = new Set(["upsertLine", "declareSeries"]);
/* OLA 14 (G14-6): los escritores de línea entera y sus parches se miran
 * en TODO el árbol, no solo en line-form.tsx — la cerca vieja dejaba
 * ~15 sitios de upsertLine fuera de su único archivo vigilado, y en
 * ellos la foto del render se escribía entera al nivel del commit.
 * patchLine/patchLineWith entran como escritores vigilados: parchean
 * contra lo vivo por construcción del ayudante, y cada sitio suyo se
 * clasifica «campo» con su razón, como cualquier otra ruta. */
const PATCH_WRITERS = new Set(["patchLine", "patchLineWith"]);
type Doctrina = "fusiona" | "campo" | "naturaleza" | "anexa";

/* ── OLA 13 (G13-2/G13-3): LA DELEGACIÓN Y LA FIRMA DE CONDUCTA ────────
 * La caza de la ola 13 probó las dos cegueras de esta cerca:
 *   G13-2 · LA DELEGACIÓN — la misma enfermedad delegada a un ayudante
 *     (`commit((s) => guardarDesdeLaFoto(s, foto))`) corría VERDE: ningún
 *     brazo miraba dentro del ayudante. Y la forma delegada ya era el
 *     hábito de la casa (el Deshacer de la importación compone en
 *     revertImportCounted; addLoan, payCard, hideLines… componen en la
 *     librería): el censo no veía ~30 rutas de guardado. Ahora todo
 *     identificador llamado dentro de un updater se RESUELVE (en el
 *     archivo o por su importación) y la composición se censura DONDE
 *     VIVA: un ayudante que recibe el estado del updater y cuyo resultado
 *     vuelve como estado nuevo hace del sitio una ruta DELEGADA,
 *     clasificada con su ayudante nombrado; el que no compone (lee) no es
 *     ruta; lo IRRESOLUBLE acusa en voz alta.
 *   G13-3 · LA FIRMA — la tabla clasificaba SITIOS y confiaba en la razón
 *     escrita: la mutación M-C cambió UNA letra en people.tsx (el map
 *     compone desde la foto `p` en vez del elemento vivo `x`) y la cerca
 *     absolvió la doctrina nueva. Ahora cada sitio lleva una FIRMA DE
 *     CONDUCTA verificada en el sitio: en todo map sobre un accesor vivo,
 *     el objeto que reemplaza a un elemento ESPARCE EL ELEMENTO DEL MAP
 *     (nunca un identificador de fuera); en un ayudante delegado, ninguna
 *     llave de colección se asigna desde un identificador que no nazca
 *     del estado que recibió (la foto acusa); y un sitio «fusiona» lleva
 *     su llamada de fusión (o la forma fn-sobre-vivo de savePeople). */
const BOOK_TOUCHES = new Set([...COLL_KEYS_B, "imports"]);
const GATE_GLOBALS = new Set(["Number", "String", "Boolean", "Array", "Object", "Math", "JSON", "Date", "Set", "Map", "WeakMap", "Promise", "Error", "parseInt", "parseFloat", "isNaN", "isFinite", "structuredClone", "console"]);

function scanForms(files: { rel: string; text: string }[]) {
  const inline = new Set<string>();
  const writers = new Map<string, string>();
  const delegated = new Map<string, string>();
  const violations = new Map<string, string[]>();
  const unresolved = new Set<string>();
  const fusion = new Map<string, boolean>();
  const fnSites: string[] = [];
  const byRel = new Map(files.map((f) => [f.rel, f.text]));
  const parse = (rel: string, text: string) => ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const defsCache = new Map<string, Map<string, ts.Node>>();
  const defsOf = (rel: string): Map<string, ts.Node> => {
    let d = defsCache.get(rel);
    if (d) return d;
    d = new Map();
    const text = byRel.get(rel);
    if (text) {
      const visit = (n: ts.Node) => {
        if (isFnLike(n)) { const nm = fnNameOf(n); if (nm && !d!.has(nm)) d!.set(nm, n); }
        ts.forEachChild(n, visit);
      };
      visit(parse(rel, text));
    }
    defsCache.set(rel, d);
    return d;
  };
  const resolveSpecFrom = (fromRel: string, spec: string): string | null => {
    let parts: string[];
    const dir = fromRel.split("/").slice(0, -1);
    if (spec.startsWith("@/")) parts = spec.slice(2).split("/");
    else if (spec.startsWith(".")) {
      parts = [...dir];
      for (const seg of spec.split("/")) { if (seg === "..") parts.pop(); else if (seg !== ".") parts.push(seg); }
    } else return null;
    const base = parts.join("/");
    for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) if (byRel.has(cand)) return cand;
    return null;
  };
  /* OLA 16 (Guardián G16-4): la importación nombra DOS nombres — el
   * local (el alias con el que el archivo llama) y el ORIGINAL (el que
   * el archivo destino declara). La resolución vieja guardaba solo el
   * local y buscaba ese nombre en el destino: un ayudante sano
   * importado con alias (`import { componer as c }`) o a través de un
   * barril (`export { componer } from "…"`) quedaba IRRESOLUBLE y el
   * árbol sano correría rojo por la cerca de lo irresoluble. Ahora la
   * entrada lleva el nombre original y la resolución sigue las
   * re-exportaciones por barril hasta el cuerpo. */
  const importsCache = new Map<string, Map<string, { target: string; orig: string }>>();
  const importsOf = (rel: string): Map<string, { target: string; orig: string }> => {
    let m = importsCache.get(rel);
    if (m) return m;
    m = new Map();
    const text = byRel.get(rel);
    if (text) {
      const visit = (n: ts.Node) => {
        if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
          const target = resolveSpecFrom(rel, n.moduleSpecifier.text);
          const clause = n.importClause;
          if (target && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) m!.set(el.name.text, { target, orig: el.propertyName?.text ?? el.name.text });
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(parse(rel, text));
    }
    importsCache.set(rel, m);
    return m;
  };
  const reexportsCache = new Map<string, Map<string, { from: string; orig: string }>>();
  const reexportsOf = (rel: string): Map<string, { from: string; orig: string }> => {
    let m = reexportsCache.get(rel);
    if (m) return m;
    m = new Map();
    const text = byRel.get(rel);
    if (text) {
      const visit = (n: ts.Node) => {
        if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier) && n.exportClause && ts.isNamedExports(n.exportClause)) {
          const from = resolveSpecFrom(rel, n.moduleSpecifier.text);
          if (from) for (const el of n.exportClause.elements) m!.set(el.name.text, { from, orig: el.propertyName?.text ?? el.name.text });
        }
        ts.forEachChild(n, visit);
      };
      visit(parse(rel, text));
    }
    reexportsCache.set(rel, m);
    return m;
  };
  const resolveExported = (name: string, rel: string, seen: Set<string>): { rel: string; node: ts.Node } | null => {
    const d = defsOf(rel).get(name);
    if (d) return { rel, node: d };
    const key = `${rel}#${name}`;
    if (seen.has(key)) return null;
    const re = reexportsOf(rel).get(name);
    if (!re) return null;
    return resolveExported(re.orig, re.from, new Set([...seen, key]));
  };
  const resolveHelper = (name: string, fromRel: string): { rel: string; node: ts.Node } | null => {
    const local = defsOf(fromRel).get(name);
    if (local) return { rel: fromRel, node: local };
    const imp = importsOf(fromRel).get(name);
    if (imp) return resolveExported(imp.orig, imp.target, new Set());
    return null;
  };
  /** ¿El valor DERIVA de alguna de las raíces? (la composición se
   * absuelve si alguna parte nace de la raíz; la selección exige todas
   * sus ramas). OLA 15 (G15-4): una llamada a un identificador ya no
   * absuelve por tener un argumento enraizado — el llamado se RESUELVE
   * y su cuerpo debe devolver un valor derivado del argumento que
   * recibió enraizado (el selector con señuelo, que ignora el estado y
   * devuelve la foto, no deriva); los globales de lenguaje son
   * mecanismo, no selector.
   * OLA 16 (Guardián G16-3): el TOPE DE PROFUNDIDAD murió — a los
   * cuatro saltos la derivación abandonaba la resolución y volvía a la
   * regla condenada (algún argumento enraizado absuelve), y un relé de
   * cinco selectores que terminaba en la foto pasaba entero. Ahora la
   * derivación sigue el relé HASTA SU FIN, y la seguridad ante ciclos
   * es un conjunto de nodos ya en la cadena: re-entrar en un ayudante
   * de la propia cadena no certifica derivación (un relé circular
   * acusa por la llave que lo reciba, nunca absuelve por profundidad). */
  const derivesFrom = (e: ts.Node, roots: Set<string>, fromRel: string, seen: Set<string> = new Set()): boolean => {
    if (ts.isIdentifier(e)) return roots.has(e.text);
    if (ts.isSpreadAssignment(e) || ts.isSpreadElement(e)) return derivesFrom(e.expression, roots, fromRel, seen);
    if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return derivesFrom(e.expression, roots, fromRel, seen);
    if (ts.isCallExpression(e)) {
      if (ts.isPropertyAccessExpression(e.expression) && derivesFrom(e.expression.expression, roots, fromRel, seen)) return true;
      if (ts.isIdentifier(e.expression) && !COLL_ACCESSORS.has(e.expression.text) && !GATE_GLOBALS.has(e.expression.text)) {
        const idx = e.arguments.findIndex((a) => derivesFrom(a, roots, fromRel, seen));
        if (idx < 0) return false;
        const r = resolveHelper(e.expression.text, fromRel);
        if (!r) return e.arguments.some((a) => derivesFrom(a, roots, fromRel, seen)); // fuera del árbol caminado: la regla vieja
        const key = `${r.rel}#${e.expression.text}`;
        if (seen.has(key)) return false; // el relé circular no certifica: volver a un nodo de la cadena no deriva
        return bodyDerives(r.node, r.rel, idx, new Set([...seen, key]));
      }
      return e.arguments.some((a) => derivesFrom(a, roots, fromRel, seen));
    }
    if (ts.isArrayLiteralExpression(e)) return e.elements.some((el) => derivesFrom(el, roots, fromRel, seen));
    if (ts.isObjectLiteralExpression(e)) return e.properties.some((p) => ts.isSpreadAssignment(p) ? derivesFrom(p.expression, roots, fromRel, seen) : ts.isPropertyAssignment(p) ? derivesFrom(p.initializer, roots, fromRel, seen) : ts.isShorthandPropertyAssignment(p) ? roots.has(p.name.text) : false);
    if (ts.isConditionalExpression(e)) return derivesFrom(e.whenTrue, roots, fromRel, seen) && derivesFrom(e.whenFalse, roots, fromRel, seen);
    if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) return derivesFrom(e.expression, roots, fromRel, seen);
    if (ts.isBinaryExpression(e)) {
      // la selección con un literal vacío de un lado no trae foto (la
      // misma neutralidad que rooted() ya concedía): `state?.x ?? []`
      // nace del estado — sin esto, el accesor remitPeopleOf, que
      // devuelve `state?.remitPeople ?? []`, no derivaba de su estado.
      const empty = (x: ts.Node) => (ts.isArrayLiteralExpression(x) && x.elements.length === 0) || (ts.isObjectLiteralExpression(x) && x.properties.length === 0);
      return (derivesFrom(e.left, roots, fromRel, seen) || empty(e.left)) && (derivesFrom(e.right, roots, fromRel, seen) || empty(e.right));
    }
    if (ts.isTemplateExpression(e)) return e.templateSpans.some((sp) => derivesFrom(sp.expression, roots, fromRel, seen));
    if (ts.isPrefixUnaryExpression(e)) return derivesFrom(e.operand, roots, fromRel, seen);
    return false;
  };
  /** ¿El cuerpo de un ayudante devuelve, en TODAS sus salidas, un valor
   * derivado de su parámetro número `paramIdx`? Los locales que nacen
   * de él cuentan como raíz (fijación). */
  const bodyDerives = (fn: ts.Node, rel: string, paramIdx: number, seen: Set<string> = new Set()): boolean => {
    const ps = (fn as ts.FunctionLikeDeclarationBase).parameters ?? [];
    const p = ps[paramIdx];
    if (!p || !ts.isIdentifier(p.name)) return false;
    const body = (fn as { body?: ts.Node }).body;
    if (!body) return false;
    const roots = new Set<string>([p.name.text]);
    for (let pass = 0; pass < 6; pass++) {
      let grew = false;
      const scan = (n: ts.Node) => {
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !roots.has(n.name.text) && derivesFrom(n.initializer, roots, rel, seen)) { roots.add(n.name.text); grew = true; }
        if (isFnLike(n) && n !== fn) return;
        ts.forEachChild(n, scan);
      };
      scan(body);
      if (!grew) break;
    }
    const returns: ts.Node[] = [];
    if (!ts.isBlock(body)) returns.push(body);
    else {
      const rs = (m: ts.Node) => {
        if (ts.isReturnStatement(m) && m.expression) returns.push(m.expression);
        if (isFnLike(m) && m !== fn) return;
        ts.forEachChild(m, rs);
      };
      ts.forEachChild(body, rs);
    }
    return returns.length > 0 && returns.every((r) => derivesFrom(r, roots, rel, seen));
  };
  /** ¿El cuerpo de un ayudante COMPONE el libro? Toca una colección,
   * llama a un accesor o a un escritor, o asigna una llave de colección.
   * (Lo que solo toca settings — withDeskSeedFlag — no es una forma que
   * guarda: es una marca sobre el estado, fuera del censo.) */
  const helperComposes = (node: ts.Node): boolean => {
    let yes = false;
    const scan = (n: ts.Node) => {
      if (ts.isPropertyAccessExpression(n) && BOOK_TOUCHES.has(n.name.text)) yes = true;
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && COLL_KEYS_B.has(n.name.text)) yes = true;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) &&
        (COLL_ACCESSORS.has(n.expression.text) || FORM_WRITERS.has(n.expression.text) || ROOT_WRITERS.has(n.expression.text) || PATCH_WRITERS.has(n.expression.text))) yes = true;
      ts.forEachChild(n, scan);
    };
    scan(node);
    return yes;
  };
  /** La firma MAP-VIVO sobre un subárbol: en todo map cuyo receptor es
   * un accesor de colección, el objeto literal en posición de reemplazo
   * (lo que el callback devuelve, rama a rama) esparce el parámetro del
   * propio map (el elemento vivo) o una llamada (la fusión) — M-C
   * ({ ...p } con la foto del render) rompe la firma. Los esparcidos
   * condicionales que AÑADEN campos ({ ...l, ...(d.dueDay ? { dueDay }
   * : {}) }) no son la base del reemplazo y no acusan.
   * OLA 14 (G14-4): el receptor también puede ser una CADENA DE
   * PROPIEDADES enraizada en un parámetro de la función que contiene el
   * map (`s.structure.catalog.map(...)`, `s.months[k].lines.map(...)`):
   * la ola 13 solo juzgaba el receptor-llamada a un accesor, y el map
   * que componía desde la foto sobre el catálogo vivo escapaba — era la
   * forma exacta de savePlan antes de su cura. */
  const mapVivoViolations = (root: ts.Node, out: string[], roots: Set<string> = new Set()) => {
    const judgeLiteral = (lit: ts.ObjectLiteralExpression, param: string, recvName: string) => {
      const spreads = lit.properties.filter((p) => ts.isSpreadAssignment(p));
      /* OLA 16 (Guardián G16-2): el literal que RECOGE campos sin
       * esparcir también reemplaza — `{ id: x.id }` construido desde el
       * elemento vivo tira en el commit todo campo no recogido, y la
       * firma vieja volvía en silencio cuando no había esparcidos: la
       * muerte por recogida y la muerte por esparcido de la foto son
       * la misma muerte. Un reemplazo que no esparce el elemento ni es
       * una llamada de fusión acusa nazca como nazca. (Los mapas que
       * construyen VISTAS viven fuera de las rutas de guardado — este
       * juez solo camina updaters y ayudantes delegados de guardado,
       * como siempre.) */
      if (!spreads.length) {
        out.push(`map sobre ${recvName}: el reemplazo recoge campos («${lit.getText().slice(0, 44)}») sin esparcir el elemento vivo «${param}» — lo no recogido muere en el commit (G16-2)`);
        return;
      }
      const ok = spreads.some((sp) => (ts.isIdentifier(sp.expression) && sp.expression.text === param) || ts.isCallExpression(sp.expression));
      if (!ok) { out.push(`map sobre ${recvName}: el reemplazo esparce «${(spreads[0]!.expression as ts.Node).getText()}» en vez del elemento vivo «${param}» — compone desde fuera del map (M-C)`); return; }
      /* OLA 15 (Guardián G15-4) · EL ESPARCIDO TESTIGO: la firma vieja
       * comprobaba PRESENCIA del elemento vivo, no su DOMINIO —
       * `{ ...x, ...foto }` pasaba, y el esparcido de la foto, DESPUÉS
       * del vivo, lo pisaba campo a campo con el mismo daño que
       * `{ ...foto }` a secas. El esparcido de objeto del elemento vivo
       * debe ser el ÚLTIMO esparcido de objeto del reemplazo: todo
       * esparcido de un identificador posterior que no sea el elemento
       * acusa. (Los esparcidos condicionales que añaden campos y las
       * llamadas de fusión no son esparcidos de objeto y no entran.) */
      const identSpreads = spreads.filter((sp) => ts.isIdentifier(sp.expression));
      const lastIdent = identSpreads[identSpreads.length - 1];
      if (lastIdent && (lastIdent.expression as ts.Identifier).text !== param) {
        out.push(`map sobre ${recvName}: el reemplazo esparce «${(lastIdent.expression as ts.Node).getText()}» DESPUÉS del elemento vivo «${param}» — el esparcido posterior pisa al vivo campo a campo (esparcido testigo)`);
      }
    };
    const replacements = (e: ts.Node, param: string, recvName: string) => {
      if (ts.isObjectLiteralExpression(e)) { judgeLiteral(e, param, recvName); return; }
      if (ts.isConditionalExpression(e)) { replacements(e.whenTrue, param, recvName); replacements(e.whenFalse, param, recvName); return; }
      if (ts.isParenthesizedExpression(e)) { replacements(e.expression, param, recvName); return; }
      if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
        replacements(e.left, param, recvName); replacements(e.right, param, recvName);
      }
    };
    /** La raíz de una cadena de propiedades: el identificador del que cuelga. */
    const chainRoot = (e: ts.Node): string | null => {
      if (ts.isIdentifier(e)) return e.text;
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return chainRoot(e.expression);
      return null;
    };
    const scan = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "map") {
        const recv = n.expression.expression;
        const isAccessorCall = ts.isCallExpression(recv) && ts.isIdentifier(recv.expression) && COLL_ACCESSORS.has(recv.expression.text);
        const rootName = !isAccessorCall && (ts.isPropertyAccessExpression(recv) || ts.isElementAccessExpression(recv)) ? chainRoot(recv) : null;
        if (isAccessorCall || (rootName !== null && roots.has(rootName))) {
          const cb = n.arguments[0];
          if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters.length && ts.isIdentifier(cb.parameters[0]!.name)) {
            const param = (cb.parameters[0]!.name as ts.Identifier).text;
            const recvName = isAccessorCall ? (recv.expression as ts.Identifier).text : recv.getText().slice(0, 40);
            if (cb.body) {
              if (!ts.isBlock(cb.body)) replacements(cb.body, param, recvName);
              else {
                const retScan = (m: ts.Node) => {
                  if (ts.isReturnStatement(m) && m.expression) replacements(m.expression, param, recvName);
                  if (isFnLike(m)) return;
                  ts.forEachChild(m, retScan);
                };
                ts.forEachChild(cb.body, retScan);
              }
            }
          }
        }
      }
      ts.forEachChild(n, scan);
    };
    scan(root);
  };
  /** La firma FOTO sobre el cuerpo de un ayudante delegado, POR LLAVE y
   * POR VALOR (OLA 14, Guardián G14-1): ninguna llave de colección se
   * asigna desde un valor que no nazca del estado recibido, venga
   * envuelto como venga — `people: foto` acusa, y también
   * `foto.slice()`, `[...foto]` y `foto.map()` (la ola 13 solo acusaba
   * el identificador desnudo, y absolvía ENTERO al ayudante que leyera
   * el libro una vez: la mutación M14-A leyó `lent` de lo vivo y compuso
   * `people` desde la foto con la cerca verde). La procedencia se sigue
   * por fijación: el parámetro de estado, lo que de él se lee, las
   * variables que nacen de valores enraizados, los patrones de
   * desestructuración sobre valores enraizados y los acumuladores que
   * reciben escrituras de elemento o anexos enraizados (la forma del
   * Deshacer: un objeto vacío que se llena desde el estado ES del
   * estado). Leer el libro ya no absuelve nada: cada llave se juzga por
   * su propio valor. */
  const fotoViolations = (helper: ts.Node, stateParam: string | null, out: string[], helperRel = "") => {
    if (!stateParam) return;
    /** ¿El valor se compone DESDE el estado recibido? La composición
     * (literales, llamadas, anexos) se absuelve si ALGUNA de sus partes
     * nace del estado — la base viva con campos del gesto encima es la
     * doctrina «campo» —; la SELECCIÓN (condicional, ??/||) exige que
     * TODAS sus ramas nazcan de él: una rama que devuelve la foto
     * entera es la foto. Un valor hecho SOLO de fuera (la foto, un
     * parámetro-dato reemplazando la colección) no nace del estado. */
    const rooted = (e: ts.Node, derived: Set<string>): boolean => {
      if (ts.isIdentifier(e)) return derived.has(e.text);
      if (ts.isSpreadAssignment(e) || ts.isSpreadElement(e)) return rooted(e.expression, derived);
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return rooted(e.expression, derived);
      if (ts.isCallExpression(e)) {
        if (ts.isPropertyAccessExpression(e.expression) && rooted(e.expression.expression, derived)) return true;
        if (ts.isIdentifier(e.expression)) {
          const nm = e.expression.text;
          if (COLL_ACCESSORS.has(nm) && e.arguments.some((a) => rooted(a, derived))) return true;
          if (GATE_GLOBALS.has(nm)) return e.arguments.some((a) => rooted(a, derived));
          /* OLA 15 (Guardián G15-4) · EL SELECTOR CON SEÑUELO: la
           * regla vieja absolvía TODA llamada con algún argumento
           * enraizado — `elegir(s, foto)`, cuyo cuerpo ignora el estado
           * y devuelve la foto entera, pasaba por composición. Ahora el
           * llamado se resuelve y su cuerpo debe devolver un valor
           * derivado del argumento enraizado que recibió (bodyDerives,
           * la resolución de G14-2 aplicada recursivamente); un llamado
           * irresoluble con argumentos mezclados NO absuelve: el valor
           * no nace del estado y la llave que lo reciba acusa. */
          const idx = e.arguments.findIndex((a) => rooted(a, derived));
          if (idx < 0) return false;
          const r = resolveHelper(nm, helperRel);
          if (!r) return false;
          return bodyDerives(r.node, r.rel, idx);
        }
        return e.arguments.some((a) => rooted(a, derived));
      }
      if (ts.isObjectLiteralExpression(e)) return e.properties.some((p) => {
        if (ts.isSpreadAssignment(p)) return rooted(p.expression, derived);
        if (ts.isPropertyAssignment(p)) return rooted(p.initializer, derived);
        if (ts.isShorthandPropertyAssignment(p)) return derived.has(p.name.text);
        return false;
      });
      if (ts.isArrayLiteralExpression(e)) return e.elements.some((el) => rooted(el, derived));
      if (ts.isConditionalExpression(e)) return rooted(e.whenTrue, derived) && rooted(e.whenFalse, derived);
      if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) return rooted(e.expression, derived);
      if (ts.isBinaryExpression(e)) {
        // la selección con un literal vacío de un lado no trae foto:
        // `state.remitPeople ?? []` nace del estado; `foto ?? []`, no.
        const empty = (x: ts.Node) => (ts.isArrayLiteralExpression(x) && x.elements.length === 0) || (ts.isObjectLiteralExpression(x) && x.properties.length === 0);
        return (rooted(e.left, derived) || empty(e.left)) && (rooted(e.right, derived) || empty(e.right));
      }
      if (ts.isTemplateExpression(e)) return e.templateSpans.some((sp) => rooted(sp.expression, derived));
      if (ts.isPrefixUnaryExpression(e)) return rooted(e.operand, derived);
      return false;
    };
    const derived = new Set<string>([stateParam]);
    // Fijación de procedencia: repetir hasta que ninguna variable nueva nazca.
    for (let pass = 0; pass < 8; pass++) {
      let grew = false;
      const scan = (n: ts.Node) => {
        if (ts.isVariableDeclaration(n) && n.initializer) {
          const names: string[] = [];
          const collect = (nm: ts.BindingName) => {
            if (ts.isIdentifier(nm)) names.push(nm.text);
            else for (const el of nm.elements) if (ts.isBindingElement(el)) collect(el.name);
          };
          collect(n.name);
          if (names.length && names.some((x) => !derived.has(x)) && rooted(n.initializer!, derived)) {
            for (const x of names) if (!derived.has(x)) { derived.add(x); grew = true; }
          }
        }
        // en el AST, la declaración de un for…of no lleva inicializador:
        // la expresión iterada vive en la sentencia — sin esto, `bucket`
        // de `for (const [k, bucket] of Object.entries(state.months))`
        // nunca nace y todo lo compuesto desde él parece foto.
        if ((ts.isForOfStatement(n) || ts.isForInStatement(n)) && ts.isVariableDeclarationList(n.initializer)) {
          for (const d of n.initializer.declarations) {
            const names: string[] = [];
            const collect = (nm: ts.BindingName) => {
              if (ts.isIdentifier(nm)) names.push(nm.text);
              else for (const el of nm.elements) if (ts.isBindingElement(el)) collect(el.name);
            };
            collect(d.name);
            if (names.length && names.some((x) => !derived.has(x)) && rooted(n.expression, derived)) {
              for (const x of names) if (!derived.has(x)) { derived.add(x); grew = true; }
            }
          }
        }
        // el acumulador: `acc[k] = <enraizado>`, `acc.campo = <enraizado>`, `acc.push(<enraizado>)`
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          (ts.isElementAccessExpression(n.left) || ts.isPropertyAccessExpression(n.left)) &&
          ts.isIdentifier(n.left.expression) && !derived.has(n.left.expression.text) && rooted(n.right, derived)) {
          derived.add(n.left.expression.text); grew = true;
        }
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) &&
          (n.expression.name.text === "push" || n.expression.name.text === "add") &&
          ts.isIdentifier(n.expression.expression) && !derived.has(n.expression.expression.text) &&
          n.arguments.some((a) => rooted(a, derived))) {
          derived.add(n.expression.expression.text); grew = true;
        }
        ts.forEachChild(n, scan);
      };
      scan(helper);
      if (!grew) break;
    }
    /* El juez: solo las llaves de colección de los literales en POSICIÓN
     * DE ESTADO — el cuerpo devuelto, los retornos, los inicializadores
     * y las asignaciones (y el literal tras una llave `state` de uno de
     * ellos, la forma { state, preserved } de los contados). Un campo
     * anidado dentro de un registro-dato (el `bank` de una fuente nueva
     * dentro de imports) no es la llave del estado y no se juzga aquí:
     * su valor se juzga como parte del inicializador de SU llave. */
    const marked = new Set<ts.ObjectLiteralExpression>();
    const markExpr = (e: ts.Node | undefined): void => {
      if (!e) return;
      if (ts.isObjectLiteralExpression(e)) {
        if (marked.has(e)) return;
        // el envoltorio { state, … }: el literal es un REGISTRO de
        // resultado (la forma HideResult de descanso, { state, preserved }
        // de los contados) — se juzga el estado que envuelve, no las
        // llaves hermanas del registro (su `months` es una lista de
        // claves afectadas, no el mapa del libro).
        const stateProp = e.properties.find((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && ts.isIdentifier(p.name) && p.name.text === "state");
        if (stateProp) {
          if (ts.isPropertyAssignment(stateProp)) markExpr(stateProp.initializer);
          return;
        }
        marked.add(e);
        for (const p of e.properties) if (ts.isSpreadAssignment(p)) markBranches(p.expression);
        return;
      }
      if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) { markExpr(e.expression); return; }
      if (ts.isConditionalExpression(e)) { markExpr(e.whenTrue); markExpr(e.whenFalse); }
    };
    const markBranches = (e: ts.Node): void => {
      if (ts.isConditionalExpression(e)) { markExpr(e.whenTrue); markExpr(e.whenFalse); return; }
      if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) { markBranches(e.expression); return; }
      markExpr(e);
    };
    const rootsScan = (n: ts.Node) => {
      if (ts.isReturnStatement(n)) markExpr(n.expression);
      if (ts.isVariableDeclaration(n)) markExpr(n.initializer);
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken) markExpr(n.right);
      if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && !ts.isBlock(n.body)) markExpr(n.body);
      ts.forEachChild(n, rootsScan);
    };
    rootsScan(helper);
    for (const lit of marked) {
      for (const p of lit.properties) {
        if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && COLL_KEYS_B.has(p.name.text)) {
          if (!rooted(p.initializer, derived)) out.push(`la llave ${p.name.text} se asigna desde «${p.initializer.getText().slice(0, 40)}», que no nace del estado recibido — compone desde la foto (M-B)`);
        }
      }
    }
  };

  /* ── OLA 15 (Guardián G15-1): EL CENSO DE PARCHES RESUELVE A CUERPOS ──
   * La cura 14 resolvió el mecanismo fn-sobre-vivo a su cuerpo (G14-2),
   * pero patchLineWith — nacido en esa misma cura — nunca recibió el
   * tratamiento: el censo lo clasificaba «campo» por el NOMBRE del
   * ayudante y ninguna firma miraba la flecha entregada. La mutación de
   * la caza (reportUse componiendo su historial desde la foto del
   * render, `line.history` en vez de `live.history`) corrió la suite
   * entera verde con la razón clavada mintiendo. Ahora cada sitio de
   * patchLineWith resuelve la función entregada a su cuerpo y juzga el
   * parche devuelto: leer un campo de línea de la FOTO — el objeto cuyo
   * id se está parchando, u otro objeto que no nace del parámetro vivo —
   * acusa; el literal del gesto y lo compuesto desde el parámetro
   * absuelven. Y patchLine juzga la procedencia de su objeto-parche
   * (el literal en el sitio, o el literal al que el identificador se
   * ata en el ámbito que envuelve): un parche que esparce o lee la foto
   * acusa; el literal del gesto absuelve. */
  const LINE_FIELDS = new Set(["id", "seriesId", "monthKey", "kind", "concept", "amountMinor", "currency", "active", "note", "categoryId", "subId", "recurring", "storeId", "providerId", "productCode", "productUrl", "cadence", "nextDue", "aprBps", "balanceMinor", "balanceCurrency", "icon", "history", "bookedOn", "startedOn", "xfer", "cardId", "personId", "occasionId"]);
  type PatchCtx = { idRoot: string | null; param: string | null; rooted: Set<string>; locals: Map<string, ts.ObjectLiteralExpression>; bindings: Map<string, ts.Node>; enclosingParams: Set<string>; foreign: number; rel: string; depth: number };
  const patchViolations = (root: ts.Node, fromRel: string, enclosingParams: Set<string>, out: string[]) => {
    /** La raíz y el primer campo de una cadena de acceso (x.a.b → raíz x, campo a). */
    const chainOf = (e: ts.Node): { root: string | null; field: string | null } => {
      let cur = e;
      let field: string | null = null;
      while (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur)) {
        if (ts.isPropertyAccessExpression(cur)) field = cur.name.text;
        cur = cur.expression;
      }
      return { root: ts.isIdentifier(cur) ? cur.text : null, field };
    };
    /* OLA 17 (Guardián G17-2/G17-3): la procedencia de un argumento —
     * la misma prueba que el brazo de llamadas de G16-1 hacía en
     * privado, elevada al ámbito del juez para que la expansión de
     * miembros y de llamadas-resultado la compartan. */
    const carriesArg = (a: ts.Node, ctx: PatchCtx): boolean => {
      if (ts.isIdentifier(a)) return a.text === ctx.idRoot || a.text === ctx.param || ctx.rooted.has(a.text) || ctx.locals.has(a.text);
      if (ts.isPropertyAccessExpression(a) || ts.isElementAccessExpression(a)) { const r = chainOf(a).root; return r !== null && (r === ctx.idRoot || r === ctx.param || ctx.rooted.has(r)); }
      if (ts.isSpreadElement(a) || ts.isSpreadAssignment(a)) return carriesArg(a.expression, ctx);
      if (ts.isObjectLiteralExpression(a)) return a.properties.some((p) => carriesArg(p, ctx));
      if (ts.isArrayLiteralExpression(a)) return a.elements.some((el) => carriesArg(el, ctx));
      if (ts.isCallExpression(a)) return a.arguments.some((x) => carriesArg(x, ctx));
      if (ts.isConditionalExpression(a)) return carriesArg(a.whenTrue, ctx) || carriesArg(a.whenFalse, ctx);
      if (ts.isParenthesizedExpression(a) || ts.isAsExpression(a) || ts.isTypeAssertionExpression(a)) return carriesArg(a.expression, ctx);
      if (ts.isPropertyAssignment(a)) return carriesArg(a.initializer, ctx);
      if (ts.isShorthandPropertyAssignment(a)) return carriesArg(a.name, ctx);
      return false;
    };
    /** Las expresiones que una función devuelve (sin bajar a las anidadas). */
    const fnReturns = (fnNode: ts.Node): ts.Node[] => {
      const body = (fnNode as { body?: ts.Node }).body;
      const out2: ts.Node[] = [];
      if (!body) return out2;
      if (!ts.isBlock(body)) { out2.push(body); return out2; }
      const rs = (m: ts.Node) => {
        if (ts.isReturnStatement(m) && m.expression) out2.push(m.expression);
        if (isFnLike(m) && m !== fnNode) return;
        ts.forEachChild(m, rs);
      };
      ts.forEachChild(body, rs);
      return out2;
    };
    /* OLA 17 (G17-2): una función IDENTIDAD devuelve su parámetro i
     * tal cual en cada devolución — `identidad(fn)` ENTREGA fn, y el
     * juez juzga el argumento, no la llamada. Devuelve el índice del
     * parámetro devuelto, o -1 si la función no es identidad. */
    const identityIndex = (fnNode: ts.Node): number => {
      const fn = fnNode as ts.FunctionLikeDeclarationBase;
      const params = fn.parameters ?? [];
      const rets = fnReturns(fnNode);
      if (!rets.length) return -1;
      let idx = -1;
      for (const ret of rets) {
        let x: ts.Node = ret;
        while (ts.isParenthesizedExpression(x)) x = x.expression;
        if (!ts.isIdentifier(x)) return -1;
        const i = params.findIndex((p) => ts.isIdentifier(p.name) && (p.name as ts.Identifier).text === (x as ts.Identifier).text);
        if (i < 0) return -1;
        if (idx >= 0 && idx !== i) return -1;
        idx = i;
      }
      return idx;
    };
    /** La función-fábrica: cada devolución es el MISMO literal de función. */
    const returnedFnLiteral = (fnNode: ts.Node): ts.Node | null => {
      const rets = fnReturns(fnNode);
      if (!rets.length) return null;
      let lit: ts.Node | null = null;
      for (const ret of rets) {
        let x: ts.Node = ret;
        while (ts.isParenthesizedExpression(x)) x = x.expression;
        if (!ts.isArrowFunction(x) && !ts.isFunctionExpression(x)) return null;
        if (lit && lit !== x) return null;
        lit = x;
      }
      return lit;
    };
    /** Los literales-objeto que una función devuelve (vacío si alguna devolución no lo es). */
    const returnedObjectLiterals = (fnNode: ts.Node): ts.ObjectLiteralExpression[] => {
      const rets = fnReturns(fnNode);
      if (!rets.length) return [];
      const lits: ts.ObjectLiteralExpression[] = [];
      for (const ret of rets) {
        let x: ts.Node = ret;
        while (ts.isParenthesizedExpression(x)) x = x.expression;
        if (!ts.isObjectLiteralExpression(x)) return [];
        lits.push(x);
      }
      return lits;
    };
    /* OLA 17 (G17-3): el contexto remapeado de una llamada — el mismo
     * gesto que el brazo de llamadas de G16-1 hace para juzgar los
     * CUERPOS devueltos, aquí para juzgar el MIEMBRO que se lee del
     * resultado o el literal esparcido: el parámetro del ayudante toma
     * la procedencia del argumento (la foto como raíz de id, lo vivo
     * como raíz viva, el literal como atadura). */
    const remapCallCtx = (call: ts.CallExpression, ctx: PatchCtx): { subCtx: PatchCtx; fnNode: ts.Node } | null => {
      if (!ts.isIdentifier(call.expression)) return null;
      const r = resolveHelper(call.expression.text, ctx.rel);
      if (!r || !isFnLike(r.node)) return null;
      const hfn = r.node as ts.FunctionLikeDeclarationBase;
      const paramName = (i: number): string | null => {
        const p = hfn.parameters[i];
        return p && ts.isIdentifier(p.name) ? (p.name as ts.Identifier).text : null;
      };
      let subIdRoot: string | null = null;
      let subParam: string | null = null;
      const subRooted = new Set<string>();
      const subLocals = new Map<string, ts.ObjectLiteralExpression>();
      const subBindings = new Map<string, ts.Node>();
      call.arguments.forEach((a, i) => {
        const pn = paramName(i);
        if (!pn) return;
        const root = ts.isIdentifier(a) ? a.text : (ts.isPropertyAccessExpression(a) || ts.isElementAccessExpression(a)) ? chainOf(a).root : null;
        if (root === ctx.idRoot && ctx.idRoot) subIdRoot = pn;
        if (root !== null && root === ctx.param) { subParam = pn; subRooted.add(pn); }
        else if (root !== null && ctx.rooted.has(root)) subRooted.add(pn);
        if (ts.isIdentifier(a) && ctx.locals.has(a.text)) subRooted.add(pn);
        if (ts.isObjectLiteralExpression(a)) { subLocals.set(pn, a); subBindings.set(pn, a); }
        else if (ts.isIdentifier(a) && ctx.bindings.has(a.text)) subBindings.set(pn, ctx.bindings.get(a.text)!);
      });
      const subBody = (hfn as { body?: ts.Node }).body;
      if (subBody) {
        for (let pass = 0; pass < 6; pass++) {
          let grew = false;
          const scan = (n: ts.Node) => {
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
              if (!subBindings.has(n.name.text)) subBindings.set(n.name.text, n.initializer);
              if (ts.isObjectLiteralExpression(n.initializer) && !subLocals.has(n.name.text)) subLocals.set(n.name.text, n.initializer);
              if (!subRooted.has(n.name.text)) {
                let refs = false;
                const walk = (m: ts.Node) => { if (ts.isIdentifier(m) && subRooted.has(m.text)) refs = true; ts.forEachChild(m, walk); };
                walk(n.initializer);
                if (refs) { subRooted.add(n.name.text); grew = true; }
              }
            }
            if (isFnLike(n) && n !== hfn) return;
            ts.forEachChild(n, scan);
          };
          scan(subBody);
          if (!grew && pass > 0) break;
        }
      }
      const subCtx: PatchCtx = { idRoot: subIdRoot, param: subParam, rooted: subRooted, locals: subLocals, bindings: subBindings, enclosingParams: ctx.enclosingParams, foreign: 0, rel: r.rel, depth: ctx.depth + 1 };
      return { subCtx, fnNode: r.node };
    };
    /* OLA 18 (Guardián G18-1): LA CAPTURA POR CIERRE — la resolución de
     * la ola 17 seguía el canal del ARGUMENTO: todo lo que acusaba
     * pasaba la foto (o lo vivo) como argumento de la llamada. El
     * invocado SIN argumentos cuyo cuerpo lee una atadura de su ámbito
     * que aliasa la foto cruzaba en silencio en cuatro especímenes
     * (P2d: el método local sin argumentos; P3e: la ayudante desnuda
     * leída por su miembro; P3a/P3b: el método de un literal atado, en
     * línea o atado su resultado). Ahora la llamada sin argumentos en
     * posición de parche ABRE el cuerpo del invocado y lo juzga con el
     * ambiente de su ámbito de DEFINICIÓN: las ataduras visibles desde
     * donde el invocado nace (su módulo, su función envolvente), con
     * lo vivo capturado enraizado y la foto capturada juzgada como
     * foto. Un cuerpo que compone el parche desde datos capturados con
     * forma de línea acusa por las reglas de siempre; el literal puro
     * absuelve. */
    const scopeEnvOf = (node: ts.Node): { bindings: Map<string, ts.Node>; params: Set<string> } => {
      const bindings = new Map<string, ts.Node>();
      const params = new Set<string>();
      let cur: ts.Node | undefined = node.parent;
      while (cur) {
        if (isFnLike(cur)) {
          for (const p of (cur as ts.FunctionLikeDeclarationBase).parameters ?? []) if (ts.isIdentifier(p.name)) params.add(p.name.text);
          const b = (cur as { body?: ts.Node }).body;
          if (b && ts.isBlock(b)) for (const st of b.statements) {
            if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
              if (ts.isIdentifier(d.name) && d.initializer && !bindings.has(d.name.text)) bindings.set(d.name.text, d.initializer);
            }
          }
        }
        if (ts.isSourceFile(cur)) {
          for (const st of cur.statements) {
            if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
              if (ts.isIdentifier(d.name) && d.initializer && !bindings.has(d.name.text)) bindings.set(d.name.text, d.initializer);
            }
          }
        }
        cur = cur.parent;
      }
      return { bindings, params };
    };
    const closureCtx = (fnNode: ts.Node, rel: string, ctx: PatchCtx): PatchCtx => {
      const env = scopeEnvOf(fnNode);
      const bindings = new Map<string, ts.Node>(env.bindings);
      const locals = new Map<string, ts.ObjectLiteralExpression>();
      // la foto misma NO entra en locals: su nombre se juzga como foto
      // (la raíz de id), no se expande a su literal — expandirla la
      // absolvería por la rama del identificador.
      for (const [n, init] of bindings) if (n !== ctx.idRoot && ts.isObjectLiteralExpression(init)) locals.set(n, init);
      const rooted = new Set<string>();
      for (const p of env.params) if (p === ctx.param || ctx.rooted.has(p)) rooted.add(p);
      const body = (fnNode as { body?: ts.Node }).body;
      if (body) {
        for (let pass = 0; pass < 6; pass++) {
          let grew = false;
          const scan = (n: ts.Node) => {
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
              if (!bindings.has(n.name.text)) bindings.set(n.name.text, n.initializer);
              if (n.name.text !== ctx.idRoot && ts.isObjectLiteralExpression(n.initializer) && !locals.has(n.name.text)) locals.set(n.name.text, n.initializer);
            }
            if (isFnLike(n) && n !== fnNode) return;
            ts.forEachChild(n, scan);
          };
          scan(body);
          for (const [n, init] of bindings) {
            if (rooted.has(n)) continue;
            let refs = false;
            const walk = (m: ts.Node) => { if (ts.isIdentifier(m) && rooted.has(m.text)) refs = true; ts.forEachChild(m, walk); };
            walk(init);
            if (refs) { rooted.add(n); grew = true; }
          }
          if (!grew && pass > 0) break;
        }
      }
      const fn = fnNode as ts.FunctionLikeDeclarationBase;
      const param = fn.parameters?.length && ts.isIdentifier(fn.parameters[0]!.name) ? (fn.parameters[0]!.name as ts.Identifier).text : null;
      return { idRoot: ctx.idRoot, param, rooted, locals, bindings, enclosingParams: ctx.enclosingParams, foreign: 0, rel, depth: ctx.depth + 1 };
    };
    /** El cuerpo detrás de una llamada: identificador (atadura local o
     * ayudante resuelto) o método de un objeto literal alcanzable
     * (atadura del contexto, del ámbito de la llamada o ayudante). */
    const resolveCalleeBody = (call: ts.CallExpression, ctx: PatchCtx): { fnNode: ts.Node; rel: string } | null => {
      if (ts.isIdentifier(call.expression)) {
        const nm = call.expression.text;
        const b = ctx.bindings.get(nm);
        if (b && (ts.isArrowFunction(b) || ts.isFunctionExpression(b))) return { fnNode: b, rel: ctx.rel };
        const r = resolveHelper(nm, ctx.rel);
        if (r && isFnLike(r.node)) return { fnNode: r.node, rel: r.rel };
        return null;
      }
      if (ts.isPropertyAccessExpression(call.expression) && ts.isIdentifier(call.expression.expression)) {
        const objName = call.expression.expression.text;
        const method = call.expression.name.text;
        let objNode: ts.Node | undefined = ctx.bindings.get(objName) ?? scopeEnvOf(call).bindings.get(objName);
        if (!objNode) {
          const r = resolveHelper(objName, ctx.rel);
          if (r) objNode = (r.node as { initializer?: ts.Node }).initializer ?? r.node;
        }
        if (objNode && ts.isObjectLiteralExpression(objNode)) {
          for (const p of objNode.properties) {
            if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === method &&
              (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))) return { fnNode: p.initializer, rel: ctx.rel };
            if (ts.isMethodDeclaration(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === method) return { fnNode: p, rel: ctx.rel };
          }
        }
        return null;
      }
      return null;
    };
    const judgeZeroArgCall = (call: ts.CallExpression, ctx: PatchCtx): boolean => {
      if (call.arguments.length > 0) return false;
      const resolved = resolveCalleeBody(call, ctx);
      if (!resolved) return false;
      if (ctx.depth >= 4) { out.push("la llamada sin argumentos en posición de parche se anida más allá de lo que el censo sigue: no se certifica lo que no se ve (G18-1)"); return true; }
      const subCtx = closureCtx(resolved.fnNode, resolved.rel, ctx);
      for (const ret of fnReturns(resolved.fnNode)) judgeExpr(ret, subCtx);
      ctx.foreign += subCtx.foreign;
      return true;
    };
    /* OLA 17 (G17-2): una FUNCIÓN entregada como valor en posición de
     * parche — el argumento-flecha de `identidad(...)`, el resultado
     * de una llamada — se juzga como lo que es: una función de parche.
     * Su parámetro es su línea viva; sus devoluciones se juzgan con el
     * mismo juez, heredando la raíz de id y las ataduras del ámbito
     * que la envuelve (la flecha interna cierra sobre ellas). Antes
     * judgeExpr no tenía rama para expresiones de función: la flecha
     * cruzaba en silencio y la foto dentro de ella con ella. */
    const judgeDeliveredFn = (fnNode: ts.Node, baseCtx: PatchCtx): void => {
      if (baseCtx.depth >= 4) { out.push("la función entregada como valor en posición de parche se anida más allá de lo que el censo sigue: no se certifica lo que no se ve (G17-2)"); return; }
      const fn = fnNode as ts.FunctionLikeDeclarationBase;
      const param = fn.parameters.length && ts.isIdentifier(fn.parameters[0]!.name) ? (fn.parameters[0]!.name as ts.Identifier).text : null;
      const rooted = new Set<string>(baseCtx.rooted);
      if (param) rooted.add(param);
      const locals = new Map<string, ts.ObjectLiteralExpression>(baseCtx.locals);
      const bindings = new Map<string, ts.Node>(baseCtx.bindings);
      let paramUsed = false;
      const body = (fn as { body?: ts.Node }).body;
      if (body) {
        for (let pass = 0; pass < 6; pass++) {
          let grew = false;
          const scan = (n: ts.Node) => {
            if (ts.isIdentifier(n) && param && n.text === param) paramUsed = true;
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
              if (!bindings.has(n.name.text)) bindings.set(n.name.text, n.initializer);
              if (ts.isObjectLiteralExpression(n.initializer) && !locals.has(n.name.text)) locals.set(n.name.text, n.initializer);
              if (!rooted.has(n.name.text)) {
                let refs = false;
                const walk = (m: ts.Node) => { if (ts.isIdentifier(m) && rooted.has(m.text)) refs = true; ts.forEachChild(m, walk); };
                walk(n.initializer);
                if (refs) { rooted.add(n.name.text); grew = true; }
              }
            }
            if (isFnLike(n) && n !== fn) return;
            ts.forEachChild(n, scan);
          };
          scan(body);
          if (!grew && pass > 0) break;
        }
      }
      const ctx2: PatchCtx = { idRoot: baseCtx.idRoot, param, rooted, locals, bindings, enclosingParams: baseCtx.enclosingParams, foreign: 0, rel: baseCtx.rel, depth: baseCtx.depth + 1 };
      for (const ret of fnReturns(fnNode)) judgeExpr(ret, ctx2);
      baseCtx.foreign += ctx2.foreign;
      if ((!param || !paramUsed) && ctx2.foreign > 0) {
        out.push("la función entregada como valor en posición de parche compone el parche leyendo campos de línea de fuera sin leer jamás su parámetro vivo: el parche nace de una foto (G17-2)");
      }
    };
    /* OLA 17 (G17-3): la procedencia por ACCESO A MIEMBRO se sigue —
     * `e.copia` con `e` atado a un literal (`{ copia: foto }`), a una
     * llamada (`envolver(foto)`) o en línea (`envolver(foto).copia`)
     * entrega el valor de esa propiedad, y ese valor se juzga. Antes
     * el juez miraba solo la raíz de la cadena y el nombre del campo:
     * «copia» no es un campo de línea y «e» no es la foto, así que la
     * foto cruzaba entera dentro del miembro, en silencio. */
    const expandMember = (e: ts.Node, ctx: PatchCtx): void => {
      if (!ts.isPropertyAccessExpression(e)) return;
      const prop = e.name.text;
      let base: ts.Node = e.expression;
      for (let guard = 0; guard < 4 && ts.isIdentifier(base); guard++) {
        const b = ctx.bindings.get((base as ts.Identifier).text);
        if (!b) return;
        base = b;
      }
      if (ts.isIdentifier(base)) return;
      if (ts.isObjectLiteralExpression(base)) {
        for (const p of base.properties) {
          if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === prop) { judgeExpr(p.initializer, ctx); return; }
          if (ts.isShorthandPropertyAssignment(p) && p.name.text === prop) { judgeExpr(p.name, ctx); return; }
        }
        return;
      }
      if (ts.isCallExpression(base)) {
        if (ctx.depth >= 4) { out.push(`el miembro «${prop}» de una llamada en posición de parche se anida más allá de lo que el censo sigue: no se certifica lo que no se ve (G17-3)`); return; }
        /* OLA 18 (G18-1): la llamada SIN argumentos no tiene canal que
         * remapear — aunque el nombre se resuelva, el remapeo de la
         * ola 17 juzgaba el cuerpo solo a través de sus argumentos.
         * Su cuerpo se abre con el ambiente de su ámbito de
         * definición y el miembro se lee de SUS literales devueltos. */
        if (base.arguments.length === 0) {
          const resolved = resolveCalleeBody(base, ctx);
          if (resolved) {
            const subCtx = closureCtx(resolved.fnNode, resolved.rel, ctx);
            for (const lit of returnedObjectLiterals(resolved.fnNode)) {
              for (const p of lit.properties) {
                if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === prop) judgeExpr(p.initializer, subCtx);
                else if (ts.isShorthandPropertyAssignment(p) && p.name.text === prop) judgeExpr(p.name, subCtx);
              }
            }
            ctx.foreign += subCtx.foreign;
            return;
          }
        }
        const remapped = remapCallCtx(base, ctx);
        if (!remapped) {
          if (base.arguments.some((a) => carriesArg(a, ctx))) out.push(`el miembro «${prop}» se lee del resultado de una llamada que lleva la foto o lo vivo y no se resuelve a un cuerpo: el censo no certifica lo que no ve (G17-3)`);
          return;
        }
        for (const lit of returnedObjectLiterals(remapped.fnNode)) {
          for (const p of lit.properties) {
            if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === prop) judgeExpr(p.initializer, remapped.subCtx);
            else if (ts.isShorthandPropertyAssignment(p) && p.name.text === prop) judgeExpr(p.name, remapped.subCtx);
          }
        }
        ctx.foreign += remapped.subCtx.foreign;
      }
    };
    const judgeExpr = (e: ts.Node, ctx: PatchCtx): void => {
      /* OLA 16 (Guardián G16-1): el identificador desnudo se juzga —
       * el parche devuelto POR NOMBRE se expande a su literal atado, y
       * la foto misma devuelta por nombre ES el parche de la foto. La
       * ola 15 juzgaba el literal en el sitio y el identificador atado
       * en judgePatchObject, pero un `return p` dentro de la función
       * entregada — o la foto pasada como argumento desnudo a un
       * ayudante — cruzaba sin juez. */
      /* OLA 17 (Guardián G17-2): la expresión de función en posición
       * de parche se juzga como función de parche entregada — sin
       * esta rama, la flecha que `identidad(...)` devuelve cruzaba el
       * juez entera, sin que ninguna regla mirara su cuerpo. */
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) { judgeDeliveredFn(e, ctx); return; }
      if (ts.isIdentifier(e)) {
        const lit = ctx.locals.get(e.text);
        if (lit) { judgeExpr(lit, ctx); return; }
        if (ctx.idRoot && e.text === ctx.idRoot) out.push(`el parche ES la foto («${e.text}») entregada por nombre — el registro del render reemplaza a la línea viva del commit (G16-1)`);
        return;
      }
      if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) {
        const { root: r, field } = chainOf(e);
        if (r) {
          if (ctx.idRoot && r === ctx.idRoot && r !== ctx.param) out.push(`el parche lee «${e.getText().slice(0, 44)}» de la foto cuyo id se parchea, no del parámetro vivo — el cruce de la otra pestaña muere en el commit (G15-1)`);
          else if (field && LINE_FIELDS.has(field) && !ctx.rooted.has(r)) ctx.foreign++;
          if (field === "history" && !ctx.rooted.has(r)) out.push(`el parche lee el historial de «${r}», que no es la línea viva del commit — anexar sobre la foto entierra el cruce (G15-1)`);
        }
        /* OLA 17 (G17-3): y el VALOR del miembro se juzga — la raíz y
         * el campo no cuentan de dónde sale `e.copia` cuando `e` es un
         * literal o el resultado de una llamada. */
        expandMember(e, ctx);
        return;
      }
      if (ts.isSpreadAssignment(e) || ts.isSpreadElement(e)) {
        const x = e.expression;
        if (ts.isIdentifier(x)) {
          if (ctx.idRoot && x.text === ctx.idRoot) { out.push(`el parche esparce la foto entera («...${x.text}») en vez de componer desde la línea viva (G15-1)`); return; }
          const lit = ctx.locals.get(x.text);
          if (lit) { judgeExpr(lit, ctx); return; }
          /* OLA 17 (G17-3): el nombre atado al RESULTADO de una
           * llamada se resuelve como el miembro: el literal que el
           * ayudante devuelve, con su parámetro remapeado, es lo que
           * se esparce — y se juzga. */
          const bnd = ctx.bindings.get(x.text);
          if (bnd && ts.isCallExpression(bnd)) {
            if (ctx.depth >= 4) { out.push(`el parche esparce el resultado de «${x.text}», atado a una llamada anidada más allá de lo que el censo sigue: no se certifica lo que no se ve (G17-3)`); return; }
            const remapped = remapCallCtx(bnd, ctx);
            if (!remapped) {
              if (bnd.arguments.some((a) => carriesArg(a, ctx))) out.push(`el parche esparce el resultado de una llamada que lleva la foto o lo vivo y no se resuelve a un cuerpo: el censo no certifica lo que no ve (G17-3)`);
              return;
            }
            for (const rl of returnedObjectLiterals(remapped.fnNode)) judgeExpr(rl, remapped.subCtx);
            ctx.foreign += remapped.subCtx.foreign;
            return;
          }
          if (!ctx.rooted.has(x.text) && !ctx.enclosingParams.has(x.text)) out.push(`el parche esparce «${x.text}», que no nace de la línea viva ni es un literal del gesto (G15-1)`);
          return;
        }
        judgeExpr(x, ctx);
        return;
      }
      if (ts.isObjectLiteralExpression(e)) { for (const p of e.properties) { if (ts.isSpreadAssignment(p)) judgeExpr(p, ctx); else if (ts.isPropertyAssignment(p)) judgeExpr(p.initializer, ctx); } return; }
      if (ts.isArrayLiteralExpression(e)) { for (const el of e.elements) judgeExpr(el, ctx); return; }
      if (ts.isCallExpression(e)) {
        if (ts.isPropertyAccessExpression(e.expression)) judgeExpr(e.expression, ctx);
        /* OLA 17 (Guardián G17-2): la llamada IDENTIDAD entrega su
         * argumento tal cual, y la llamada FÁBRICA entrega su literal
         * de función — en posición de parche, el valor entregado ES
         * ese argumento o ese literal, y es eso lo que se juzga (la
         * flecha entregada cae en la rama de funciones de este juez).
         * Sin este desenvuelto, `identidad(fn)` era un agujero: la
         * llamada no lleva la procedencia según la prueba de G16-1
         * (una flecha no «lleva» nada) y sus argumentos se juzgaban
         * uno a uno sin rama que mirara el cuerpo de la flecha. */
        if (ts.isIdentifier(e.expression) && !GATE_GLOBALS.has(e.expression.text) && !COLL_ACCESSORS.has(e.expression.text)) {
          const rId = resolveHelper(e.expression.text, ctx.rel);
          if (rId && isFnLike(rId.node)) {
            const idx = identityIndex(rId.node);
            if (idx >= 0 && e.arguments[idx]) { judgeExpr(e.arguments[idx]!, ctx); return; }
            const fnLit = returnedFnLiteral(rId.node);
            if (fnLit) { judgeExpr(fnLit, ctx); return; }
          }
        }
        /* OLA 16 (Guardián G16-1): una llamada en posición de parche
         * que lleva la procedencia (la foto, el parámetro vivo, un
         * local enraizado) se RESUELVE a su cuerpo y el cuerpo se juzga
         * con el contexto remapeado — la foto como argumento desnudo a
         * un ayudante y el segundo salto por identificador ya no
         * cruzan sin juez, y una llamada con procedencia que no se
         * resuelve acusa como la función entregada irresoluble de la
         * ola 15. Las llamadas sin procedencia se juzgan como siempre,
         * argumento a argumento. */
        if (ts.isIdentifier(e.expression) && !GATE_GLOBALS.has(e.expression.text) && !COLL_ACCESSORS.has(e.expression.text)) {
          /* OLA 17: la prueba de procedencia vive ahora en el ámbito
           * del juez (carriesArg) — la comparten este brazo, la
           * expansión de miembros y el esparcido de llamadas. */
          const carries = (a: ts.Node): boolean => carriesArg(a, ctx);
          if (e.arguments.some((a) => carries(a))) {
            const nm = e.expression.text;
            if (ctx.depth >= 4) { out.push(`la cadena de ayudantes en posición de parche («${nm}») excede lo que el censo sigue llevando la procedencia: no se certifica lo que no se ve (G16-1)`); return; }
            const r = resolveHelper(nm, ctx.rel);
            if (!r || !(ts.isArrowFunction(r.node) || ts.isFunctionExpression(r.node) || ts.isFunctionDeclaration(r.node))) {
              out.push(`la llamada «${nm}» en posición de parche lleva la foto o lo vivo y no se resuelve a un cuerpo: el censo no certifica lo que no ve (G16-1)`);
              return;
            }
            const hfn = r.node as ts.FunctionLikeDeclarationBase;
            const paramName = (i: number): string | null => {
              const p = hfn.parameters[i];
              return p && ts.isIdentifier(p.name) ? (p.name as ts.Identifier).text : null;
            };
            let subIdRoot: string | null = null;
            let subParam: string | null = null;
            const subRooted = new Set<string>();
            e.arguments.forEach((a, i) => {
              const pn = paramName(i);
              if (!pn) return;
              const root = ts.isIdentifier(a) ? a.text : (ts.isPropertyAccessExpression(a) || ts.isElementAccessExpression(a)) ? chainOf(a).root : null;
              if (root === ctx.idRoot && ctx.idRoot) subIdRoot = pn;
              if (root !== null && root === ctx.param) { subParam = pn; subRooted.add(pn); }
              else if (root !== null && ctx.rooted.has(root)) subRooted.add(pn);
              if (ts.isIdentifier(a) && ctx.locals.has(a.text)) subRooted.add(pn);
            });
            const subLocals = new Map<string, ts.ObjectLiteralExpression>();
            const subBindings = new Map<string, ts.Node>();
            const subBody = (hfn as { body?: ts.Node }).body;
            if (subBody) {
              for (let pass = 0; pass < 6; pass++) {
                let grew = false;
                const scan = (n: ts.Node) => {
                  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
                    if (!subBindings.has(n.name.text)) subBindings.set(n.name.text, n.initializer);
                    if (ts.isObjectLiteralExpression(n.initializer) && !subLocals.has(n.name.text)) subLocals.set(n.name.text, n.initializer);
                    if (!subRooted.has(n.name.text)) {
                      let refs = false;
                      const walk = (m: ts.Node) => { if (ts.isIdentifier(m) && subRooted.has(m.text)) refs = true; ts.forEachChild(m, walk); };
                      walk(n.initializer);
                      if (refs) { subRooted.add(n.name.text); grew = true; }
                    }
                  }
                  if (isFnLike(n) && n !== hfn) return;
                  ts.forEachChild(n, scan);
                };
                scan(subBody);
                if (!grew && pass > 0) break;
              }
            }
            const subCtx: PatchCtx = { idRoot: subIdRoot, param: subParam, rooted: subRooted, locals: subLocals, bindings: subBindings, enclosingParams: ctx.enclosingParams, foreign: 0, rel: r.rel, depth: ctx.depth + 1 };
            const subReturns: ts.Node[] = [];
            if (subBody) {
              if (!ts.isBlock(subBody)) subReturns.push(subBody);
              else {
                const rs = (m: ts.Node) => {
                  if (ts.isReturnStatement(m) && m.expression) subReturns.push(m.expression);
                  if (isFnLike(m) && m !== hfn) return;
                  ts.forEachChild(m, rs);
                };
                ts.forEachChild(subBody, rs);
              }
            }
            for (const ret of subReturns) judgeExpr(ret, subCtx);
            ctx.foreign += subCtx.foreign;
            if (subParam && subCtx.foreign > 0) {
              let used = false;
              const uw = (m: ts.Node) => { if (ts.isIdentifier(m) && m.text === subParam) used = true; ts.forEachChild(m, uw); };
              for (const ret of subReturns) uw(ret);
              if (!used) out.push(`el ayudante «${nm}» compone el parche leyendo campos de línea de fuera sin leer jamás el valor vivo que recibió: el parche nace de una foto (G16-1)`);
            }
            return;
          }
        }
        /* OLA 18 (G18-1): la llamada SIN argumentos en posición de
         * parche — ningún argumento lleva la procedencia, así que el
         * brazo de la ola 16 no la abría jamás: su cuerpo se juzga con
         * el ambiente de su ámbito de definición (la captura por
         * cierre acusa; el literal puro absuelve). */
        if (e.arguments.length === 0 && judgeZeroArgCall(e, ctx)) return;
        for (const a of e.arguments) judgeExpr(a, ctx);
        return;
      }
      if (ts.isConditionalExpression(e)) { judgeExpr(e.condition, ctx); judgeExpr(e.whenTrue, ctx); judgeExpr(e.whenFalse, ctx); return; }
      if (ts.isBinaryExpression(e)) { judgeExpr(e.left, ctx); judgeExpr(e.right, ctx); return; }
      if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || ts.isPrefixUnaryExpression(e)) { judgeExpr((e as { expression?: ts.Node; operand?: ts.Node }).expression ?? (e as { operand?: ts.Node }).operand!, ctx); return; }
      if (ts.isTemplateExpression(e)) { for (const sp of e.templateSpans) judgeExpr(sp.expression, ctx); return; }
    };
    /** Los literales-objeto atados a un nombre en los ámbitos que envuelven la llamada. */
    const findObjectBinding = (call: ts.Node, name: string): ts.ObjectLiteralExpression | null => {
      let cur: ts.Node = call;
      while (cur.parent) {
        const anc = cur.parent;
        if (isFnLike(anc) || ts.isSourceFile(anc)) {
          let found: ts.ObjectLiteralExpression | null = null;
          const scan = (n: ts.Node): void => {
            if (found) return;
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer && ts.isObjectLiteralExpression(n.initializer)) { found = n.initializer; return; }
            if (isFnLike(n) && n !== anc) {
              let has = false;
              const w = (m: ts.Node) => { if (m === call) has = true; ts.forEachChild(m, w); };
              w(n);
              if (!has) return;
            }
            ts.forEachChild(n, scan);
          };
          scan((anc as { body?: ts.Node }).body ?? anc);
          if (found) return found;
        }
        cur = anc;
      }
      return null;
    };
    const judgePatchFn = (call: ts.CallExpression) => {
      const fnArg = call.arguments[2];
      if (!fnArg) return;
      const idArg = call.arguments[1];
      const idRoot = idArg && ts.isPropertyAccessExpression(idArg) && ts.isIdentifier(idArg.expression) ? idArg.expression.text : null;
      /* OLA 17 (Guardián G17-2): la función entregada puede venir como
       * RESULTADO de una llamada — `identidad(fn)` entrega fn, una
       * fábrica entrega su literal — y se desenvuelve hasta el cuerpo
       * entregado antes de juzgarla irresoluble. Lo que no desenvuelve
       * a un cuerpo sigue acusando en voz alta, como en la ola 15:
       * ni violación ni irresoluble EN SILENCIO. */
      let fnExpr: ts.Node = fnArg;
      for (let guard = 0; guard < 4 && ts.isCallExpression(fnExpr) && ts.isIdentifier(fnExpr.expression); guard++) {
        const r = resolveHelper(fnExpr.expression.text, fromRel);
        if (!r || !isFnLike(r.node)) break;
        const idx = identityIndex(r.node);
        if (idx >= 0 && fnExpr.arguments[idx]) { fnExpr = fnExpr.arguments[idx]!; continue; }
        const fnLit = returnedFnLiteral(r.node);
        if (fnLit) { fnExpr = fnLit; continue; }
        break;
      }
      let fnNode: ts.Node | null = null;
      if (ts.isArrowFunction(fnExpr) || ts.isFunctionExpression(fnExpr)) fnNode = fnExpr;
      else if (ts.isIdentifier(fnExpr)) { const r = resolveHelper(fnExpr.text, fromRel); if (r) fnNode = r.node; }
      if (!fnNode || !(ts.isArrowFunction(fnNode) || ts.isFunctionExpression(fnNode) || ts.isFunctionDeclaration(fnNode))) {
        out.push("la función entregada a patchLineWith no se resuelve a un cuerpo: el censo no puede certificar lo que no ve (G15-1)");
        return;
      }
      const fn = fnNode as ts.FunctionLikeDeclarationBase;
      const param = fn.parameters.length && ts.isIdentifier(fn.parameters[0]!.name) ? (fn.parameters[0]!.name as ts.Identifier).text : null;
      const rooted = new Set<string>(param ? [param] : []);
      const locals = new Map<string, ts.ObjectLiteralExpression>();
      const bindings = new Map<string, ts.Node>();
      let paramUsed = false;
      if (fn.body) {
        for (let pass = 0; pass < 6; pass++) {
          let grew = false;
          const scan = (n: ts.Node) => {
            if (ts.isIdentifier(n) && param && n.text === param) paramUsed = true;
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
              if (!bindings.has(n.name.text)) bindings.set(n.name.text, n.initializer);
              if (ts.isObjectLiteralExpression(n.initializer) && !locals.has(n.name.text)) locals.set(n.name.text, n.initializer);
              if (!rooted.has(n.name.text)) {
                let refs = false;
                const walk = (m: ts.Node) => { if (ts.isIdentifier(m) && rooted.has(m.text)) refs = true; ts.forEachChild(m, walk); };
                walk(n.initializer);
                if (refs) { rooted.add(n.name.text); grew = true; }
              }
            }
            if (isFnLike(n) && n !== fn) return;
            ts.forEachChild(n, scan);
          };
          scan(fn.body);
          if (!grew && pass > 0) break;
        }
      }
      const ctx: PatchCtx = { idRoot, param, rooted, locals, bindings, enclosingParams, foreign: 0, rel: fromRel, depth: 0 };
      const returns: ts.Node[] = [];
      if (fn.body) {
        if (!ts.isBlock(fn.body)) returns.push(fn.body);
        else {
          const rs = (m: ts.Node) => {
            if (ts.isReturnStatement(m) && m.expression) returns.push(m.expression);
            if (isFnLike(m) && m !== fn) return;
            ts.forEachChild(m, rs);
          };
          ts.forEachChild(fn.body, rs);
        }
      }
      for (const ret of returns) judgeExpr(ret, ctx);
      if ((!param || !paramUsed) && ctx.foreign > 0) {
        out.push("la función de patchLineWith compone el parche leyendo campos de línea de fuera sin leer jamás su parámetro vivo: el parche nace de una foto (G15-1)");
      }
    };
    const judgePatchObject = (call: ts.CallExpression) => {
      const patchArg = call.arguments[2];
      if (!patchArg) return;
      const idArg = call.arguments[1];
      const idRoot = idArg && ts.isPropertyAccessExpression(idArg) && ts.isIdentifier(idArg.expression) ? idArg.expression.text : null;
      const ctx: PatchCtx = { idRoot, param: null, rooted: new Set<string>(), locals: new Map(), bindings: new Map(), enclosingParams, foreign: 0, rel: fromRel, depth: 0 };
      if (ts.isObjectLiteralExpression(patchArg)) { judgeExpr(patchArg, ctx); return; }
      if (ts.isIdentifier(patchArg)) {
        if (enclosingParams.has(patchArg.text)) return; // el parche es un parámetro del mecanismo (paintLine): se juzga en sus llamantes, no aquí
        const lit = findObjectBinding(call, patchArg.text);
        if (lit) judgeExpr(lit, ctx);
        return;
      }
      judgeExpr(patchArg, ctx);
    };
    const scan = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && PATCH_WRITERS.has(n.expression.text)) {
        if (n.expression.text === "patchLineWith") judgePatchFn(n);
        else judgePatchObject(n);
      }
      ts.forEachChild(n, scan);
    };
    scan(root);
  };

  for (const { rel, text } of files) {
    if (!rel.startsWith("components/")) continue;
    const sf = parse(rel, text);
    const ordinals = new Map<string, number>();
    const wordinals = new Map<string, number>();
    const dordinals = new Map<string, number>();
    const visit = (node: ts.Node, stack: string[], outerParams: Set<string>) => {
      let st = stack;
      let params = outerParams;
      if (isFnLike(node)) {
        const nm = fnNameOf(node);
        if (nm) st = [...stack, nm];
        const ps = new Set(outerParams);
        const fnNode = node as ts.FunctionLikeDeclarationBase;
        if (fnNode.parameters) for (const p of fnNode.parameters) if (ts.isIdentifier(p.name)) ps.add(p.name.text);
        params = ps;
      }
      /* OLA 18 (BR18-1): el censo conoce las DOS puertas de commit de la
       * casa — la ordinaria y la guardada (commitGuarded, cuyas recetas
       * pueden abortar sin marco devolviendo null). Una forma que guarda
       * por la puerta guardada es una ruta de guardado como cualquier
       * otra: nace con la misma llave (su función envolvente) y se
       * clasifica con la misma vara. */
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "commit" || node.expression.text === "commitGuarded")) {
        let updater = node.arguments[0];
        let delegatedVia: string | null = null;
        if (updater && ts.isIdentifier(updater)) {
          const r = resolveHelper(updater.text, rel);
          if (r && (ts.isArrowFunction(r.node) || ts.isFunctionExpression(r.node) || ts.isFunctionDeclaration(r.node))) {
            delegatedVia = updater.text;
            updater = r.node as ts.ArrowFunction;
          }
        }
        if (updater && (ts.isArrowFunction(updater) || ts.isFunctionExpression(updater))) {
          const fn = st[st.length - 1] ?? "(top)";
          const body = updater.body;
          let composes = false;
          const called = new Set<string>();
          const scan = (n: ts.Node) => {
            if (ts.isCallExpression(n)) {
              if (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "map") {
                const recv = n.expression.expression;
                if (ts.isCallExpression(recv) && ts.isIdentifier(recv.expression) && COLL_ACCESSORS.has(recv.expression.text)) composes = true;
              }
              if (ts.isIdentifier(n.expression) && (FORM_WRITERS.has(n.expression.text) || ROOT_WRITERS.has(n.expression.text) || PATCH_WRITERS.has(n.expression.text))) called.add(n.expression.text);
            }
            if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && COLL_KEYS_B.has(n.name.text)) composes = true;
            ts.forEachChild(n, scan);
          };
          scan(body);
          /* ── la delegación: el estado entra, el resultado vuelve ── */
          const containsNode = (root: ts.Node, target: ts.Node): boolean => {
            let found = false;
            const walk = (n: ts.Node) => { if (n === target) { found = true; return; } ts.forEachChild(n, walk); };
            walk(root);
            return found;
          };
          const referencesId = (root: ts.Node, name: string): boolean => {
            let found = false;
            const walk = (n: ts.Node) => { if (ts.isIdentifier(n) && n.text === name) found = true; ts.forEachChild(n, walk); };
            walk(root);
            return found;
          };
          const stateParam = updater.parameters.length && ts.isIdentifier(updater.parameters[0]!.name)
            ? (updater.parameters[0]!.name as ts.Identifier).text : null;
          const delegatedHelpers: { name: string; node: ts.Node; rel: string }[] = [];
          const siteViolations: string[] = [];
          if (stateParam) {
            // valores que nacen del estado (taint): el parámetro, lo que
            // se le lee y el resultado de llamarlo a un ayudante con él.
            const derived = new Set<string>([stateParam]);
            const derivedExpr = (e: ts.Node): boolean => {
              if (ts.isIdentifier(e)) return derived.has(e.text);
              if (ts.isPropertyAccessExpression(e)) return derivedExpr(e.expression);
              if (ts.isCallExpression(e)) return e.arguments.some((a) => derivedExpr(a));
              if (ts.isSpreadAssignment(e)) return derivedExpr(e.expression);
              if (ts.isObjectLiteralExpression(e)) return e.properties.some((p) => derivedExpr(p));
              if (ts.isPropertyAssignment(e)) return derivedExpr(e.initializer);
              return false;
            };
            const deriveScan = (n: ts.Node) => {
              if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && derivedExpr(n.initializer)) derived.add(n.name.text);
              ts.forEachChild(n, deriveScan);
            };
            deriveScan(body);
            const returns: ts.Node[] = [];
            if (!ts.isBlock(body)) returns.push(body);
            else {
              const retScan = (n: ts.Node) => {
                if (ts.isReturnStatement(n) && n.expression) returns.push(n.expression);
                if (isFnLike(n)) return; // las funciones anidadas no devuelven por el updater
                ts.forEachChild(n, retScan);
              };
              ts.forEachChild(body, retScan);
            }
            // el grafo de variables del updater: quién nace de quién, y
            // qué llamadas trae cada variable — el flujo de vuelta de un
            // ayudante puede ser una CADENA (applied → next → return).
            const varRefs = new Map<string, Set<string>>();
            const varCalls = new Map<string, ts.CallExpression[]>();
            const graphScan = (n: ts.Node) => {
              const bind = (name: string, init: ts.Node) => {
                const refs = new Set<string>();
                const calls: ts.CallExpression[] = [];
                const walk = (m: ts.Node) => {
                  if (ts.isIdentifier(m)) refs.add(m.text);
                  if (ts.isCallExpression(m)) calls.push(m);
                  ts.forEachChild(m, walk);
                };
                walk(init);
                varRefs.set(name, refs);
                varCalls.set(name, calls);
              };
              if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) bind(n.name.text, n.initializer);
              if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) bind(n.left.text, n.right);
              ts.forEachChild(n, graphScan);
            };
            graphScan(body);
            const resultFlows = (call: ts.CallExpression): boolean => {
              if (returns.some((ret) => containsNode(ret, call))) return true;
              let start: string | null = null;
              for (const [v, calls] of varCalls) if (calls.includes(call)) { start = v; break; }
              if (!start) return false;
              const seen = new Set<string>([start]);
              const queue = [start];
              while (queue.length) {
                const v = queue.pop()!;
                if (returns.some((ret) => referencesId(ret, v))) return true;
                for (const [w, refs] of varRefs) if (refs.has(v) && !seen.has(w)) { seen.add(w); queue.push(w); }
              }
              return false;
            };
            // los portadores del estado: el parámetro, lo derivado de él
            // y el ACUMULADOR de un reduce que arranca de él (la forma
            // `ids.reduce((acc, id) => dropPocketLine(acc, …), s0)`).
            const stateVars = new Set<string>(derived);
            const accScan = (n: ts.Node) => {
              if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "reduce") {
                const cb = n.arguments[0];
                const init = n.arguments[1];
                if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters.length && ts.isIdentifier(cb.parameters[0]!.name) &&
                  init && derivedExpr(init)) stateVars.add((cb.parameters[0]!.name as ts.Identifier).text);
              }
              ts.forEachChild(n, accScan);
            };
            accScan(body);
            const helperCalls: { name: string; call: ts.CallExpression }[] = [];
            const callScan = (n: ts.Node) => {
              if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) &&
                n.arguments.some((a) => ts.isIdentifier(a) && stateVars.has(a.text))) {
                helperCalls.push({ name: n.expression.text, call: n });
              }
              ts.forEachChild(n, callScan);
            };
            callScan(body);
            for (const { name, call } of helperCalls) {
              if (params.has(name) || GATE_GLOBALS.has(name)) continue; // un parámetro del llamante o un global: mecanismo, no ayudante
              if (COLL_ACCESSORS.has(name) || FORM_WRITERS.has(name) || ROOT_WRITERS.has(name) || PATCH_WRITERS.has(name)) continue; // ya censados por su brazo
              if (!resultFlows(call)) continue; // su resultado no vuelve como estado: es una lectura
              const r = resolveHelper(name, rel);
              if (!r) {
                const ord = (dordinals.get(fn) ?? 0) + 1;
                dordinals.set(fn, ord);
                unresolved.add(`${rel}:${fn}#${ord}`);
                continue;
              }
              const hbody = (r.node as { body?: ts.Node }).body;
              if (!hbody || !helperComposes(r.node)) continue; // lee, no compone: no es ruta de guardado
              delegatedHelpers.push({ name, node: r.node, rel: r.rel });
              const hparams = (r.node as ts.FunctionLikeDeclarationBase).parameters ?? [];
              const hState = hparams.length && ts.isIdentifier(hparams[0]!.name) ? (hparams[0]!.name as ts.Identifier).text : null;
              fotoViolations(r.node, hState, siteViolations, r.rel);
            }
          }
          /* ── los sitios, en el orden de la fuente ── */
          const siteKeys: string[] = [];
          let inlineKey: string | null = null;
          if (composes) {
            const ord = (ordinals.get(fn) ?? 0) + 1;
            ordinals.set(fn, ord);
            inlineKey = `${rel}:${fn}#${ord}`;
            inline.add(inlineKey);
            siteKeys.push(inlineKey);
          }
          if (called.size) {
            const ord = (wordinals.get(fn) ?? 0) + 1;
            wordinals.set(fn, ord);
            const key = `${rel}:${fn}#${ord}`;
            writers.set(key, [...called].sort().join(","));
            siteKeys.push(key);
          }
          if (delegatedHelpers.length || delegatedVia) {
            const ord = (dordinals.get(fn) ?? 0) + 1;
            dordinals.set(fn, ord);
            const key = `${rel}:${fn}#${ord}`;
            delegated.set(key, [...new Set([...(delegatedVia ? [delegatedVia] : []), ...delegatedHelpers.map((h) => h.name)])].sort().join(","));
            siteKeys.push(key);
          }
          if (siteKeys.length) {
            const paramNames = (fnNode: ts.Node): Set<string> => {
              const out = new Set<string>();
              const ps = (fnNode as ts.FunctionLikeDeclarationBase).parameters ?? [];
              for (const p of ps) if (ts.isIdentifier(p.name)) out.add(p.name.text);
              return out;
            };
            mapVivoViolations(body, siteViolations, paramNames(updater));
            for (const h of delegatedHelpers) mapVivoViolations(h.node, siteViolations, paramNames(h.node));
            /* OLA 15 (G15-1): los parches dentro del sitio se juzgan
             * por su cuerpo — la función entregada a patchLineWith se
             * resuelve y el objeto-parche de patchLine se sigue a su
             * literal; la llamada ya no certifica nada por su nombre. */
            patchViolations(body, rel, params, siteViolations);
            for (const h of delegatedHelpers) patchViolations(h.node, h.rel, paramNames(h.node), siteViolations);
            /* la firma FUSIONA: el subárbol del sitio (el updater y sus
             * ayudantes) llama a una fusión nombrada (fuse…) o aplica el
             * fn del llamante sobre un accesor vivo (la forma savePeople).
             * Las firmas se asientan POR LLAVE DE CADA BRAZO: dos brazos
             * pueden compartir la cuerda «fn#n» (OwedSide#2 es la fusión
             * en línea y restoreLent en delegadas) y ninguna pisa a otra. */
            let hasFusion = false;
            const fusionScan = (root: ts.Node) => {
              /* OLA 19: la atadura alimenta como la llamada en línea —
               * `const live = peopleOf(s); fn(live)` aplica el fn del
               * llamante sobre lo vivo igual que `fn(peopleOf(s))`: un
               * identificador atado a una llamada de accesor de
               * colección cuenta como el accesor mismo. La atadura a
               * otra cosa (la foto del render) NO absuelve: fn(foto)
               * sigue sin contar como fusión. */
              const liveBindings = new Set<string>();
              const bindScan = (n: ts.Node) => {
                if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && COLL_ACCESSORS.has(n.initializer.expression.text)) liveBindings.add(n.name.text);
                ts.forEachChild(n, bindScan);
              };
              bindScan(root);
              const scan = (n: ts.Node) => {
                if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
                  if (/^fuse[A-Z]/.test(n.expression.text)) hasFusion = true;
                  if (params.has(n.expression.text) && n.arguments.some((a) => (ts.isCallExpression(a) && ts.isIdentifier(a.expression) && COLL_ACCESSORS.has(a.expression.text)) || (ts.isIdentifier(a) && liveBindings.has(a.text)))) hasFusion = true;
                }
                ts.forEachChild(n, scan);
              };
              scan(root);
            };
            fusionScan(body);
            for (const h of delegatedHelpers) fusionScan(h.node);
            for (const key of siteKeys) {
              if (siteViolations.length) violations.set(key, [...(violations.get(key) ?? []), ...siteViolations]);
            }
            /* la firma de fusión se clavea por el brazo EN LÍNEA: dos
             * brazos comparten la cuerda «fn#n» (OwedSide#2 es la fusión
             * en línea y restoreLent en delegadas) y un mapa único se
             * pisaría a sí mismo. */
            if (inlineKey) fusion.set(inlineKey, hasFusion);
          }
        }
      }
      ts.forEachChild(node, (c) => visit(c, st, params));
    };
    visit(sf, [], new Set());
    /* ── OLA 14 (G14-2): EL MECANISMO FN-SOBRE-VIVO SE RESUELVE A SU CUERPO ──
     * Una función que aplica uno de sus parámetros a un accesor vivo
     * (savePeople: `fn(peopleOf(s))`) certificaba la LLAMADA, no la
     * función que el llamante entrega: `(live) => fotoDelRender` pasaba
     * la firma entera. Ahora los argumentos-función de sus llamantes se
     * resuelven a sus cuerpos: el valor devuelto debe DERIVAR del primer
     * parámetro de la flecha entregada (componer desde él: mapearlo,
     * esparcirlo, filtrarlo), no ser un valor de fuera. */
    if (rel.startsWith("components/")) {
      // OLA 15: el análisis de derivación es UNO solo para toda la
      // cerca (derivesFrom, arriba): la resolución de llamados que
      // G15-4 trajo a rooted() es la misma que aquí juzga los cuerpos
      // entregados — un selector que ignora lo vivo no deriva en
      // ninguna de las dos firmas.
      const derives = (e: ts.Node, param: string): boolean => derivesFrom(e, new Set([param]), rel);
      const mechanisms = new Map<string, number>();
      for (const [name, def] of defsOf(rel)) {
        const ps = (def as ts.FunctionLikeDeclarationBase).parameters ?? [];
        const body = (def as { body?: ts.Node }).body;
        if (!body) continue;
        ps.forEach((p, i) => {
          if (!ts.isIdentifier(p.name) || mechanisms.has(name)) return;
          const pname = p.name.text;
          let applies = false;
          /* OLA 19: la misma resolución de ataduras que la firma
           * «fusiona» — un mecanismo que ata lo vivo (`const live =
           * peopleOf(s)`) y aplica su parámetro a la atadura ES un
           * mecanismo fn-sobre-vivo, y sus llamantes se siguen juzgando
           * por derivación. Sin esto, la forma con atadura apagaría el
           * detector en silencio y los cuerpos entregados dejarían de
           * juzgarse. */
          const liveBindings = new Set<string>();
          const bindScan = (n: ts.Node) => {
            if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && COLL_ACCESSORS.has(n.initializer.expression.text)) liveBindings.add(n.name.text);
            ts.forEachChild(n, bindScan);
          };
          bindScan(body);
          const scan = (n: ts.Node) => {
            if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === pname &&
              n.arguments.some((a) => (ts.isCallExpression(a) && ts.isIdentifier(a.expression) && COLL_ACCESSORS.has(a.expression.text)) || (ts.isIdentifier(a) && liveBindings.has(a.text)))) applies = true;
            ts.forEachChild(n, scan);
          };
          scan(body);
          if (applies) mechanisms.set(name, i);
        });
      }
      if (mechanisms.size) {
        const callScan = (n: ts.Node) => {
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && mechanisms.has(n.expression.text)) {
            const arg = n.arguments[mechanisms.get(n.expression.text)!];
            if (arg && (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) && arg.parameters.length && ts.isIdentifier(arg.parameters[0]!.name)) {
              const param = (arg.parameters[0]!.name as ts.Identifier).text;
              const returns: ts.Node[] = [];
              if (!ts.isBlock(arg.body)) returns.push(arg.body);
              else {
                const rs = (m: ts.Node) => {
                  if (ts.isReturnStatement(m) && m.expression) returns.push(m.expression);
                  if (isFnLike(m)) return;
                  ts.forEachChild(m, rs);
                };
                ts.forEachChild(arg.body, rs);
              }
              for (const ret of returns) {
                if (!derives(ret, param)) fnSites.push(`${rel}: el llamante de ${n.expression.text} entrega una función que no deriva de «${param}»: «${ret.getText().slice(0, 50)}» — la firma fn-sobre-vivo certifica el cuerpo entregado, no la llamada (G14-2)`);
              }
            }
          }
          ts.forEachChild(n, callScan);
        };
        callScan(sf);
      }
    }
  }
  /* OLA 15 (G15-5): la identidad de un ayudante es su NODO resuelto
   * (archivo#nombre), no la cuerda de su nombre — dos cuerpos con el
   * mismo nombre en archivos distintos son dos ayudantes, y el libro
   * de delegadas debe poder decirlo. */
  const resolveNode = (name: string, fromRel: string): string | null => {
    const r = resolveHelper(name, fromRel);
    return r ? `${r.rel}#${name}` : null;
  };
  return { inline, writers, delegated, violations, unresolved, fusion, fnSites, resolveNode };
}

const FORMAS_INLINE: Record<string, [Doctrina, string]> = {
  "components/faro/debts.tsx:OwedSide#1": ["campo", "renombra por id dentro del commit, desde lentOf(s0) vivo"],
  "components/faro/debts.tsx:OwedSide#2": ["fusiona", "la edición de «Me deben»: fuseLoanFields con el testigo de la forma (S2)"],
  "components/faro/debts.tsx:setOrder#1": ["campo", "un campo del plan (order) dentro del commit, desde s.debtPlan vivo"],
  "components/faro/debts.tsx:setCadence#1": ["campo", "un campo del plan (cadence) dentro del commit, desde s.debtPlan vivo"],
  "components/faro/debts.tsx:saveBudget#1": ["campo", "el monthlyMinor del plan dentro del commit, desde s.debtPlan vivo"],
  "components/faro/fit-pick.tsx:onDropMany#1": ["campo", "oculta tiendas por ids con map sobre el catálogo vivo (el onDropMany de StorePick)"],
  "components/faro/fit-pick.tsx:onRename#1": ["campo", "renombra una tienda por id dentro del commit (el onRename de StorePick)"],
  "components/faro/fit-pick.tsx:onRename#2": ["campo", "renombra una tienda por id dentro del commit (el onRename de StorePick)"],
  "components/faro/fit-pick.tsx:onAdd#1": ["anexa", "añade una tienda nueva al catálogo vivo (el onAdd de StorePick)"],
  "components/faro/fit-pick.tsx:onDropMany#2": ["campo", "oculta categorías de compra por ids sobre el vivo (el onDropMany de PurchaseCatPick)"],
  "components/faro/fit-pick.tsx:onRename#3": ["campo", "renombra una categoría de compra por id dentro del commit (el onRename de PurchaseCatPick)"],
  "components/faro/fit-pick.tsx:onColor#1": ["campo", "recolorea una categoría de compra por id dentro del commit (el onColor de PurchaseCatPick)"],
  "components/faro/fit-pick.tsx:onRename#4": ["campo", "renombra una categoría de compra por id dentro del commit (el onRename de PurchaseCatPick)"],
  "components/faro/fit-pick.tsx:onAdd#2": ["anexa", "añade una categoría de compra nueva sobre el vivo (el onAdd de PurchaseCatPick)"],
  "components/faro/fit-pick.tsx:patch#1": ["campo", "aplica la función de parche sobre cada categoría viva dentro del commit"],
  "components/faro/fit-pick.tsx:onDropMany#3": ["campo", "oculta categorías por ids con map sobre el vivo (el onDropMany de CategoryPick)"],
  "components/faro/fit-pick.tsx:onAdd#3": ["anexa", "añade una categoría nueva sobre el vivo (el onAdd de CategoryPick)"],
  "components/faro/fit-pick.tsx:patchSubs#1": ["campo", "parchea las subs de una categoría dentro del commit, desde el vivo"],
  "components/faro/fit-pick.tsx:onDropMany#4": ["campo", "oculta subs por ids con map sobre el vivo (el onDropMany de SubPick)"],
  "components/faro/loans.tsx:DueLoans#1": ["campo", "renombra por id dentro del commit, desde loansOf(s0) vivo"],
  "components/faro/loans.tsx:DueLoans#2": ["fusiona", "la edición del préstamo: fuseLoanFields con el testigo de la forma (S2)"],
  "components/faro/people.tsx:useImport#1": ["campo", "mergeContacts compone sobre peopleOf(s) vivo dentro del commit"],
  "components/faro/people.tsx:savePeople#1": ["fusiona", "aplica la transformación sobre peopleOf(s) vivo; la ficha editada fusiona por id con su testigo (Personas). Ola 19 (G19-3): la puerta es la guardada y la receta devuelve su estado cuando la transformación no tocó ningún elemento — la negativa no enmarca; la fusión sobre lo vivo es la misma."],
  // OLA 19: la entrada «components/faro/people.tsx:run#1» se retiró —
  // el run de la confirmación de borrado ya no compone en línea: viaja
  // por savePeople (el mecanismo fn-sobre-vivo de esta misma cerca, que
  // juzga su cuerpo por derivación) y su puerta es la guardada.
  "components/faro/screens.tsx:DueOwe#1": ["naturaleza", "SubPresetEditor: la lista ES el registro — el editor la reescribe entera por naturaleza de su objeto"],
  "components/faro/screens.tsx:DueOwe#2": ["naturaleza", "FreqPresetEditor: la lista ES el registro — el editor la reescribe entera por naturaleza de su objeto"],
  "components/faro/screens.tsx:Desk#1": ["anexa", "siembra las bóvedas conocidas sobre la estructura viva"],
  "components/faro/screens.tsx:Desk#2": ["anexa", "siembra las bóvedas que faltan sobre la estructura viva"],
  "components/faro/screens.tsx:addAccount#1": ["anexa", "añade la subcuenta y su línea de apertura sobre el vivo"],
  "components/faro/screens.tsx:run#1": ["campo", "renombra una sub por id dentro del commit (el run de su confirmación)"],
  "components/faro/screens.tsx:run#2": ["campo", "retira la sub y sus líneas dentro del commit, desde el vivo (el run de su confirmación)"],
  "components/faro/screens.tsx:rankAccounts#1": ["campo", "reordena las bóvedas desde la estructura viva"],
  "components/faro/screens.tsx:paintBank#1": ["campo", "el icono del banco por id dentro del commit"],
  "components/faro/screens.tsx:saveStore#1": ["anexa", "añade una tienda nueva al catálogo vivo"],
  "components/faro/screens.tsx:saveCat#1": ["anexa", "añade una categoría de compra nueva sobre el vivo"],
  "components/faro/screens.tsx:Shops#1": ["campo", "muestra/oculta una tienda por id dentro del commit"],
  "components/faro/screens.tsx:Shops#2": ["campo", "muestra/oculta una categoría de compra por id dentro del commit"],
  "components/faro/screens.tsx:Shops#3": ["campo", "recolorea una categoría de compra por id dentro del commit"],
  "components/faro/screens.tsx:Settings#1": ["naturaleza", "aplicar una plantilla reescribe la estructura entera: es el objeto elegido, no una edición de campos"],
  "components/faro/screens.tsx:Settings#2": ["naturaleza", "mostrar toda la estructura es una transformación entera de la estructura, por su naturaleza"],
  "components/faro/screens.tsx:onRowPointerUp#1": ["campo", "reordena las categorías desde el vivo en el mismo commit"],
  "components/faro/screens.tsx:addCat#1": ["anexa", "añade una categoría nueva sobre la estructura viva"],
  "components/faro/screens.tsx:savePanel#1": ["campo", "applyCardEdits compone los ajustes sobre la estructura viva dentro del commit"],
  "components/faro/screens.tsx:patch#1": ["campo", "aplica la función de parche sobre la categoría viva dentro del commit"],
  "components/faro/screens.tsx:run#3": ["campo", "retira la sub y sus líneas dentro del commit, desde el vivo (el run de su confirmación)"],
  "components/faro/screens.tsx:addItem#1": ["anexa", "añade la pieza al catálogo vivo (y su línea si trae plan)"],
  "components/faro/screens.tsx:saveRename#1": ["campo", "renombra una pieza del catálogo por id dentro del commit"],
  "components/faro/screens.tsx:run#4": ["campo", "retira una pieza del catálogo por id dentro del commit (el run de su confirmación)"],
  "components/faro/screens.tsx:apply#1": ["campo", "muestra/oculta una pieza del catálogo por id dentro del commit"],
  "components/faro/screens.tsx:applyReplace#1": ["naturaleza", "reemplazar una pieza por otra es la operación entera elegida; replaceCatalogItem compone sobre el vivo"],
  "components/faro/screens.tsx:onCardPointerUp#1": ["campo", "reordena el catálogo desde el vivo en el mismo commit"],
  "components/faro/screens.tsx:savePlan#1": ["campo", "la pieza editada se mapea sobre el catálogo vivo y su línea se sincroniza en el mismo commit. Ola 18 (BR18-1): viaja por la puerta guardada — la pieza que ya no vive aborta sin marco"],
  "components/faro/share-product.tsx:toStore#1": ["anexa", "1.3.362 (§18.1): la cuarta puerta de la hoja del producto compone la pieza de la tienda EN LÍNEA y la anexa al catálogo vivo dentro del commit — la pieza nace con la forma de cualquier pieza a mano de Tiendas y servicios; ninguna línea ni total se toca"],
};

/* ENMIENDA CAPTURA OLA 1: sale «receipt-scan.tsx:save#1» — el save() de
 * la hoja murió con la migración: las líneas ya no nacen en la hoja sino
 * en la mesa (commitDrafts), y la hoja solo aterriza borradores
 * (addDrafts) y guarda sus recompensas por su camino de siempre. */
const FORMAS_ESCRITOR: Record<string, [Doctrina, string, string]> = {
  "components/faro/cards.tsx:commitDraft#1": ["fusiona", "CardForm: el candidato se fusiona (fuseCardDraft) contra el registro del commit y putCard escribe el resultado; las lecturas del alta se anexan. Ola 14: proceed se llama commitDraft — la misma ruta con su salida de restaurar (G14-5). Ola 18 (BR18-1): la ruta viaja por la puerta GUARDADA (commitGuarded) — sus abortos devuelven null y no dejan marco (ni entrada, ni revisión, ni Deshacer); la composición que aterriza es esta misma.", "addReading,addRewards,putCard"],
  "components/faro/cards.tsx:commitUpdate#1": ["anexa", "ola 15 (G15-2): la actualización manual de CardForm vive en su propia ruta (commitUpdate) — pregunta cardExistence DENTRO del commit y anexa lecturas y recompensas por id sobre el registro vivo (addReading busca en cardsOf); lo archivado solo se restaura por restoreCard dentro del mismo commit, con la palabra de la persona. Antes era save#1, en línea en save(). Ola 18 (BR18-1): viaja por la puerta guardada, como commitDraft — sus abortos no dejan marco.", "addReading,addRewards"],
  "components/faro/cards.tsx:save#1": ["anexa", "CardScan: crea la tarjeta nueva o anexa las lecturas del escaneo por id; no edita campos gobernados de la ficha. (Era save#2: la ola 15 movió la ruta update de CardForm a commitUpdate y la numeración por función se recorrió.)", "addReading,addRewards,putCard"],
  "components/faro/bank-settings.tsx:editor#1": ["fusiona", "EditAcct: editAccount aplica el parche {name?, color?, bank?} sobre el registro vivo dentro del commit", "editAccount"],
  "components/faro/rewards-real.tsx:save#1": ["campo", "setRewardReal escribe la figura de la cuenta dentro del commit, sobre el libro vivo", "setRewardReal"],
  "components/faro/line-form.tsx:save#1": ["fusiona", "la raíz: upsertLine recibe la línea ya fusionada ({...existing, ...fresh} con sus testigos de toque)", "declareSeries,upsertLine"],
  /* ── OLA 14 (G14-6): el brazo B mira los escritores de línea en TODO
   * el árbol. upsertLine solo anexa donde la línea NACE en el gesto
   * (id fresco, composición nueva); donde la línea ya vive, el sitio
   * parchea contra lo vivo con patchLine/patchLineWith («campo» por
   * construcción del ayudante: busca la línea dentro del estado del
   * commit y aplica solo el parche). */
  "components/faro/people.tsx:save#1": ["anexa", "el regalo nace como línea nueva (plainLine con id fresco) en el commit", "upsertLine"],
  "components/faro/remesas.tsx:save#1": ["anexa", "la remesa enviada nace como línea nueva (plainLine) en el commit", "upsertLine"],
  "components/faro/slip-apply.tsx:save#1": ["anexa", "la línea aplicada desde Guardados nace nueva (plainLine) en el commit", "upsertLine"],
  "components/faro/screens.tsx:onGlyph#1": ["campo", "el glifo de la línea se parchea contra lo vivo (patchLine por id)", "patchLine"],
  "components/faro/screens.tsx:onColor#1": ["campo", "el color de la línea se parchea contra lo vivo (patchLine por id)", "patchLine"],
  "components/faro/screens.tsx:reportUse#1": ["campo", "el uso del bote se anexa al historial de la línea VIVA (patchLineWith lee live.history)", "patchLineWith"],
  "components/faro/screens.tsx:applyMove#1": ["campo", "mover líneas entre tableros parchea categoría/sub sobre cada línea viva por id", "patchLine"],
  "components/faro/screens.tsx:applyMove#2": ["campo", "mover líneas (el segundo tablero) parchea categoría/sub sobre cada línea viva por id", "patchLine"],
  "components/faro/screens.tsx:LinesBlock#1": ["campo", "el kit renombra la línea parcheando su concepto contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:LinesBlock#2": ["campo", "el kit recolorea la línea parcheando su color contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:LinesBlock#3": ["campo", "el kit cambia el icono de la línea parcheando contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:addDue#1": ["anexa", "la suscripción nueva nace como línea fresca (id nuevo) en el commit", "upsertLine"],
  "components/faro/screens.tsx:archive#1": ["campo", "archivar la línea parchea active:false contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:declareInside#1": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:declareAparte#1": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:declareOne#1": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:Desk#1": ["anexa", "la siembra del Escritorio inserta líneas nuevas (ids frescos) sobre el estado del commit", "upsertLine"],
  "components/faro/screens.tsx:Desk#2": ["anexa", "la siembra del Escritorio inserta líneas nuevas (ids frescos) sobre el estado del commit", "upsertLine"],
  "components/faro/screens.tsx:Desk#3": ["anexa", "la siembra del Escritorio inserta líneas nuevas (ids frescos) sobre el estado del commit", "upsertLine"],
  "components/faro/screens.tsx:meetFixedModes#1": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:meetFixedModes#2": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:declareFromMigration#1": ["campo", "declareSeries compone la serie desde las líneas vivas dentro del commit", "declareSeries"],
  "components/faro/screens.tsx:savKit#1": ["campo", "el kit de Ahorros renombra el bolsillo parcheando su concepto contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:rekind#1": ["campo", "el cambio de tipo parchea kind contra la línea viva por id", "patchLine"],
  "components/faro/screens.tsx:relocate#1": ["campo", "reubicar parchea categoría/sub contra la línea viva por id", "patchLine"],
  "components/faro/screens.tsx:addAccount#1": ["anexa", "la cuenta nueva nace con su línea de apertura fresca en el mismo commit que su sub", "upsertLine"],
  "components/faro/screens.tsx:run#1": ["campo", "el renombre del bolsillo (run de su confirmación) parchea el concepto contra lo vivo por id", "patchLine"],
  "components/faro/screens.tsx:setOpening#1": ["campo", "el saldo de apertura de la cuenta existente se parchea desde la línea viva (patchLineWith)", "patchLineWith"],
  "components/faro/screens.tsx:setOpening#2": ["anexa", "la cuenta sin línea nace fresca con su saldo de apertura", "upsertLine"],
  "components/faro/screens.tsx:adjustAccount#1": ["campo", "el ajuste de la cuenta se calcula DESDE la línea viva dentro del commit (patchLineWith: base, saldo e historial)", "patchLineWith"],
  "components/faro/screens.tsx:adjustAccount#2": ["anexa", "la cuenta sin línea nace fresca con el ajuste como saldo", "upsertLine"],
  "components/faro/screens.tsx:addPocket#1": ["anexa", "el bolsillo nuevo nace como línea fresca (freshLine) en el commit", "upsertLine"],
  "components/faro/screens.tsx:paintLine#1": ["campo", "paintLine aplica su parche (color/icono) contra la línea viva por id", "patchLine"],
  "components/faro/screens.tsx:saveRetire#1": ["campo", "la línea de Retiro existente se parchea desde lo vivo (patchLineWith: arranque, cadencia y saldo leen live)", "patchLineWith"],
  "components/faro/screens.tsx:saveRetire#2": ["anexa", "la línea de Retiro que no existe nace fresca con el arranque del formulario", "upsertLine"],
  "components/faro/screens.tsx:applyStatement#1": ["campo", "el estado de cuenta se aplica sobre el historial VIVO de la línea de Retiro (patchLineWith)", "patchLineWith"],
  "components/faro/screens.tsx:applyStatement#2": ["anexa", "sin línea de Retiro, el estado nace como línea fresca con su historial", "upsertLine"],
};

/* ── OLA 13 · BRAZO C: LAS RUTAS DELEGADAS (G13-2) ────────────────────
 * Todo commit cuyo updater entrega el estado a un ayudante que compone
 * (en el archivo o en la librería) y cuyo resultado vuelve como estado
 * nuevo. La entrada nombra a su ayudante: si el ayudante cambia, la ruta
 * se re-clasifica. El Deshacer de la importación — el precedente vivo
 * que la caza nombró — queda clasificado por su conducta real: compone
 * desde el s vivo dentro del commit. */
const FORMAS_DELEGADAS: Record<string, [Doctrina, string, string]> = {
  "components/faro/ask-box.tsx:confirmRelato#1": ["campo", "1.3.445 (puerto de la Rama Agente): «Asentarlo así» asienta el relato delegando en settleRelatoDrafts, que compone las líneas del relato DESDE el s vivo dentro del commit — los borradores viajan como dato y la composición es de la librería (relato-settle), que jamás asienta un duplicado", "settleRelatoDrafts"],
  "components/faro/bitacora.tsx:close#1": ["campo", "la Bitácora (1.3.367): al cerrar la serie, markEditionSeen anota el seenAt de la edición sobre el libro vivo dentro del commit — la foto no se toca, solo la marca de leída", "markEditionSeen"],
  "components/faro/review-table.tsx:save#1": ["anexa", "Captura Ola 1: la mesa guarda en UN commit compuesto desde el s vivo — commitDrafts anexa las líneas nacidas de los borradores marcados, patchDraft/dropDraft resuelven los demás, y learnFromSaved aprende la regla del comercio cuya casa se corrigió (ley 9)", "learnFromSaved"],
  "components/faro/archivo.tsx:ArchivoScreen#1": ["campo", "restaura el «Me deben» archivado por id sobre el vivo, dentro del commit", "restoreLent"],
  "components/faro/archivo.tsx:ArchivoScreen#2": ["campo", "restaura el préstamo archivado por id sobre el vivo, dentro del commit", "restoreLoan"],
  "components/faro/archivo.tsx:ArchivoScreen#3": ["campo", "restaura la tarjeta archivada por id sobre el vivo, dentro del commit", "restoreCard"],
  "components/faro/archivo.tsx:restoreDue#1": ["campo", "restaura la cuota archivada delegando en reactivateDueSeries (duefile): la mecánica única de reanudar — busca la línea inactiva más reciente de la serie DENTRO del estado del commit y la reactiva sobre la viva. Nació como el patrón sano original en línea (brazo B hasta la 1.3.338); la 1.3.339 lo mudó a la librería para que las dos puertas — este Archivo mayor y la carpeta de Cuotas de Debo — reanuden con la misma receta. Ola 18 (BR18-1): viaja por la puerta guardada — si la serie ya no vive, la receta devuelve null y aborta sin marco", "reactivateDueSeries"],
  "components/faro/screens.tsx:moveDue#1": ["campo", "la carpeta de Cuotas de la pestaña de Debo (1.3.339): «Mover» reanuda la cuota delegando en reactivateDueSeries, la mecánica única de duefile — la misma receta que el Archivo mayor, por la puerta guardada", "reactivateDueSeries"],
  "components/faro/bank-import.tsx:save#1": ["campo", "applyImport compone el estado de la importación DESDE el s vivo dentro del commit — y captura su deshacer de ESE commit, no del render", "applyImport"],
  "components/faro/bank-import.tsx:undo#1": ["campo", "el Deshacer por delegación: revertImportCounted compone desde el s vivo que el commit le entrega (respeta las ediciones posteriores)", "revertImportCounted"],
  "components/faro/bank-settings.tsx:setSource#1": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit", "withBook"],
  "components/faro/bank-settings.tsx:run#1": ["campo", "archiva el banco por su llave sobre el vivo, dentro del commit", "archiveBank"],
  "components/faro/bank-settings.tsx:backGroup#1": ["campo", "restaura el banco archivado sobre el vivo, dentro del commit", "restoreBank"],
  "components/faro/bank-settings.tsx:run#2": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit", "withBook"],
  "components/faro/bank-settings.tsx:run#3": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit", "withBook"],
  "components/faro/bank-settings.tsx:run#4": ["campo", "restaura las cuentas por defecto sobre la estructura viva, dentro del commit", "restoreDefaultAccounts"],
  "components/faro/bank-settings.tsx:BankSettings#1": ["anexa", "addAccount nace la cuenta nueva sobre el vivo, dentro del commit", "addAccount"],
  "components/faro/bank-settings.tsx:run#5": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit", "withBook"],
  "components/faro/bank-settings.tsx:BankSettings#2": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit", "withBook"],
  "components/faro/cards.tsx:commitDraft#1": ["fusiona", "ola 14 (G14-5): el guardado pregunta su existencia DENTRO del commit con cardExistence — la respuesta gobierna si la composición funde, restaura o aborta; la composición misma es la del brazo B (fuseCardDraft + putCard). Ola 18 (BR18-1): el aborto viaja por la puerta guardada y devuelve null — «devuelve el estado intacto» se dice ahora sin marco: ni entrada, ni revisión, ni Deshacer", "cardExistence"],
  "components/faro/cards.tsx:run#1": ["campo", "dropCard archiva o quita la tarjeta por id sobre el vivo (su historial decide), dentro del commit", "dropCard"],
  "components/faro/cards.tsx:run#2": ["campo", "dropPresets quita los presets marcados sobre el vivo, dentro del commit", "dropPresets"],
  "components/faro/cards.tsx:restore#1": ["campo", "restorePresets trae de vuelta los presets sobre el vivo, dentro del commit", "restorePresets"],
  "components/faro/cards.tsx:pay#1": ["campo", "payCard aplica el pago sobre la tarjeta viva por id (escribe por putCard dentro de la librería)", "payCard"],
  "components/faro/cards.tsx:save#1": ["campo", "redeemRewards aplica el canje sobre la tarjeta viva por id (escribe por putCard dentro de la librería)", "redeemRewards"],
  "components/faro/debts.tsx:save#1": ["anexa", "addLent nace el «Me deben» nuevo sobre el vivo, dentro del commit", "addLent"],
  "components/faro/debts.tsx:card#1": ["campo", "payLent aplica el cobro sobre el registro vivo por id, dentro del commit", "payLent"],
  "components/faro/debts.tsx:card#2": ["campo", "archiveLent archiva el «Me deben» por id sobre el vivo, dentro del commit", "archiveLent"],
  "components/faro/debts.tsx:OwedSide#1": ["campo", "archiveLent archiva el «Me deben» por id sobre el vivo, dentro del commit", "archiveLent"],
  "components/faro/debts.tsx:OwedSide#2": ["campo", "restoreLent trae de vuelta el «Me deben» archivado por id, sobre el vivo", "restoreLent"],
  "components/faro/loans.tsx:save#1": ["anexa", "addLoan nace el préstamo nuevo sobre el vivo, dentro del commit", "addLoan"],
  "components/faro/loans.tsx:DueLoans#1": ["campo", "archiveLoan archiva el préstamo por id sobre el vivo, dentro del commit", "archiveLoan"],
  "components/faro/loans.tsx:DueLoans#2": ["campo", "payLoan aplica el pago sobre el préstamo vivo por id, dentro del commit", "payLoan"],
  "components/faro/loans.tsx:DueLoans#3": ["campo", "payLoan aplica el pago dividido sobre el préstamo vivo por id, dentro del commit", "payLoan"],
  "components/faro/loans.tsx:DueLoans#4": ["campo", "archiveLoan archiva el préstamo por id sobre el vivo, dentro del commit", "archiveLoan"],
  "components/faro/loans.tsx:DueLoans#5": ["campo", "restoreLoan trae de vuelta el préstamo archivado por id, sobre el vivo", "restoreLoan"],
  "components/faro/provider.tsx:hidePeriodRange#1": ["campo", "hidePeriod pone a descansar el tramo sobre el vivo (la puerta anti-fuga compone dentro del commit)", "hidePeriod"],
  "components/faro/provider.tsx:restoreRestingSpan#1": ["campo", "restoreSpan devuelve el tramo descansado sobre el vivo, dentro del commit", "restoreSpan"],
  "components/faro/provider.tsx:hideLineSelection#1": ["campo", "hideLines pone a descansar la selección sobre el vivo, dentro del commit", "hideLines"],
  "components/faro/remesas.tsx:undo#1": ["campo", "el deshacer de la remesa borra su línea por id sobre el vivo (deleteLine del reducer)", "deleteLine"],
  "components/faro/remit-people.tsx:add#1": ["anexa", "addRemitPerson nace la persona de remesa sobre la lista viva, dentro del commit", "addRemitPerson"],
  "components/faro/remit-people.tsx:drop#1": ["campo", "dropRemitPeople retira las personas marcadas de la lista viva, dentro del commit", "dropRemitPeople"],
  "components/faro/remit-people.tsx:rename#1": ["campo", "renameRemitPerson renombra por id sobre la lista viva, dentro del commit", "renameRemitPerson"],
  "components/faro/remit-people.tsx:color#1": ["campo", "colorRemitPerson recolorea por id sobre la lista viva, dentro del commit", "colorRemitPerson"],
  "components/faro/remit-people.tsx:icon#1": ["campo", "iconRemitPerson cambia el icono por id sobre la lista viva, dentro del commit", "iconRemitPerson"],
  "components/faro/rewards-real.tsx:save#1": ["campo", "withBook aplica la función sobre el libro de la cuenta, vivo, dentro del commit (el sitio además escribe por setRewardReal)", "withBook"],
  "components/faro/sample-mode.tsx:run#1": ["naturaleza", "stripSample ES la operación: el estado sin las filas de muestra es su objeto, compuesto desde el vivo", "stripSample"],
  "components/faro/screens.tsx:run#1": ["campo", "deleteLine borra la línea por id sobre el vivo (el reducer), dentro del commit", "deleteLine"],
  "components/faro/screens.tsx:LinesBlock#1": ["campo", "deleteLine borra la línea por id sobre el vivo (el reducer), dentro del commit", "deleteLine"],
  "components/faro/screens.tsx:run#2": ["campo", "deleteLine borra la línea por id sobre el vivo (el reducer), dentro del commit", "deleteLine"],
  "components/faro/screens.tsx:Desk#1": ["anexa", "seedRetiro siembra la línea de Retiro sobre la estructura viva, dentro del commit", "seedRetiro"],
  "components/faro/screens.tsx:savKit#1": ["campo", "dropPocketLine aplica la regla del bolsillo (archiva o quita) por id sobre el vivo, vía el acumulador del reduce", "dropPocketLine"],
  "components/faro/screens.tsx:run#3": ["campo", "restoreRetiro trae de vuelta la línea de Retiro sobre el vivo, dentro del commit", "restoreRetiro"],
  "components/faro/screens.tsx:run#4": ["campo", "dropPocketLine aplica la regla del bolsillo por id sobre el vivo, dentro del commit", "dropPocketLine"],
  "components/faro/screens.tsx:run#5": ["campo", "restoreRetiro trae de vuelta la línea de Retiro sobre el vivo, dentro del commit", "restoreRetiro"],
  "components/faro/screens.tsx:run#6": ["campo", "restoreDefaultCategories trae de vuelta las categorías por defecto sobre la estructura viva", "restoreDefaultCategories"],
  "components/faro/screens.tsx:addItem#1": ["campo", "syncInsLine sincroniza la línea de la pieza sobre el vivo en el mismo commit (el sitio además compone en línea)", "syncInsLine"],
  "components/faro/screens.tsx:savePlan#1": ["campo", "la pieza editada se mapea sobre el catálogo vivo y su línea se sincroniza en el mismo commit. Ola 18 (BR18-1): el sitio viaja por la puerta guardada — si la pieza ya no vive, aborta sin marco", "syncInsLine"],
  "components/faro/widget-host.tsx:file#1": ["anexa", "ingestQuick ingiere las entradas como líneas nuevas sobre el vivo (upsertLine dentro del ayudante)", "ingestQuick"],
};

describe("§B · el censo de formas que guardan: toda ruta de guardado, clasificada", () => {
  const found = scanForms(walkSrc(new URL("../../", import.meta.url), ""));
  it("brazo A: toda composición en línea está clasificada, con doctrina y razón; ninguna muerta", () => {
    for (const key of found.inline) {
      assert.ok(FORMAS_INLINE[key], `RUTA DE GUARDADO SIN CLASIFICAR: ${key} — clasifícala (fusiona / campo / naturaleza / anexa) con su razón`);
    }
    for (const [key, [doctrina, razon]] of Object.entries(FORMAS_INLINE)) {
      assert.ok(found.inline.has(key), `entrada muerta del censo de formas: ${key} — retira la entrada`);
      assert.ok(["fusiona", "campo", "naturaleza", "anexa"].includes(doctrina), `${key}: doctrina inválida`);
      assert.ok(razon.length > 10, `${key}: la clasificación lleva su razón escrita`);
    }
  });
  it("brazo B: todo sitio que guarda por escritor de librería está clasificado; ninguna muerta", () => {
    for (const [key, called] of found.writers) {
      assert.ok(FORMAS_ESCRITOR[key], `RUTA DE GUARDADO SIN CLASIFICAR: ${key} (llama a ${called}) — clasifícala con su razón`);
      assert.equal(FORMAS_ESCRITOR[key]![2], called, `${key}: los escritores cambiaron (${called}) — re-clasifica el sitio`);
    }
    for (const key of Object.keys(FORMAS_ESCRITOR)) {
      assert.ok(found.writers.has(key), `entrada muerta del censo de escritores: ${key} — retira la entrada`);
    }
  });
  it("brazo C: toda ruta DELEGADA está clasificada, con doctrina, razón y su ayudante nombrado; ninguna muerta", () => {
    for (const [key, helpers] of found.delegated) {
      assert.ok(FORMAS_DELEGADAS[key], `RUTA DELEGADA SIN CLASIFICAR: ${key} (delega en ${helpers}) — clasifícala con su razón`);
      assert.equal(FORMAS_DELEGADAS[key]![2], helpers, `${key}: los ayudantes cambiaron (${helpers}) — re-clasifica el sitio`);
    }
    for (const [key, [doctrina, razon]] of Object.entries(FORMAS_DELEGADAS)) {
      assert.ok(found.delegated.has(key), `entrada muerta del censo de delegadas: ${key} — retira la entrada`);
      assert.ok(["fusiona", "campo", "naturaleza", "anexa"].includes(doctrina), `${key}: doctrina inválida`);
      assert.ok(razon.length > 10, `${key}: la clasificación lleva su razón escrita`);
    }
  });
  it("ningún ayudante llamado desde un updater queda IRRESOLUBLE en el árbol vivo (G13-2)", () => {
    assert.deepEqual([...found.unresolved], [], "un ayudante que no se resuelve acusa en voz alta, no pasa en silencio");
  });
  it("la FIRMA DE CONDUCTA se verifica en cada sitio: ningún map compone desde fuera, ningún ayudante desde la foto (G13-3)", () => {
    const bad: string[] = [];
    for (const [key, vs] of found.violations) bad.push(...vs.map((v) => `${key} — ${v}`));
    assert.deepEqual(bad, [], `la doctrina cambió bajo una clasificación vieja:\n${bad.join("\n")}`);
  });
  it("la firma «fusiona»: todo sitio clasificado fusiona lleva su llamada de fusión (o la forma fn-sobre-vivo)", () => {
    for (const [key, [doctrina]] of Object.entries(FORMAS_INLINE)) {
      if (doctrina !== "fusiona") continue;
      assert.equal(found.fusion.get(key), true, `${key}: clasificado «fusiona» pero su subárbol no llama a ninguna fusión — la clasificación ya no describe la conducta`);
    }
  });
  /* ── OLA 14 (G14-2): el cuerpo entregado al mecanismo fn-sobre-vivo ── */
  it("los cuerpos entregados a un mecanismo fn-sobre-vivo derivan de su parámetro en todo el árbol vivo", () => {
    assert.deepEqual(found.fnSites, [], `un llamante entrega una función que no compone desde lo vivo:\n${found.fnSites.join("\n")}`);
  });
  it("espécimen V3: el llamante que entrega la foto acusa; el que compone desde lo vivo, limpio", () => {
    const mk = (caller: string) => scanForms([{
      rel: "components/faro/inventada14.tsx",
      text: [
        "type S = { people: unknown[] };",
        "const peopleOf = (s: S) => s.people;",
        "const fotoDelRender: unknown[] = [];",
        "export function Forma() {",
        "  const savePeople = (fn: (live: unknown[]) => unknown[], detail: string) => commit((s: S) => ({ ...s, people: fn(peopleOf(s)) }), detail);",
        `  const save = () => savePeople(${caller}, 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    const bad = mk("(live) => fotoDelRender");
    assert.equal(bad.fnSites.length, 1, "la foto entregada como valor acusa: la firma resuelve el cuerpo, no la llamada");
    assert.match(bad.fnSites[0]!, /G14-2/);
    const good = mk("(live) => live.map((x) => x)");
    assert.deepEqual(good.fnSites, [], "componer desde el parámetro es la forma sana: limpia");
    const good2 = mk("(live) => [...live, nueva]");
    assert.deepEqual(good2.fnSites, [], "anexar sobre lo vivo es la forma sana: limpia");
  });
  /* ── OLA 14 (G14-3) + OLA 15 (G15-5): la doctrina cuelga del AYUDANTE,
   * y el ayudante es su NODO — la comprobación de la ola 14 agrupaba
   * por la CUERDA del nombre: dos cuerpos con el mismo nombre en
   * archivos distintos compartían etiqueta sin que ninguna firma lo
   * notara (la resolución local-primero hace la colisión fácil de
   * nacer: un `restoreLoan` local sombrea al de la librería y heredaba
   * su etiqueta). Ahora la doctrina única se verifica POR NODO
   * RESUELTO (archivo#nombre), y un nombre que resuelve a dos nodos
   * distintos acusa — salvo que ambos nodos compartan una sola
   * doctrina verificada, en cuyo caso la etiqueta dice la verdad de
   * los dos. */
  const doctrineConflicts = (book: Record<string, [Doctrina, string, string]>, resolve: (name: string, fromRel: string) => string | null): string[] => {
    const byNode = new Map<string, Map<string, string[]>>();
    const byName = new Map<string, Map<string, Set<string>>>();
    const conflicts: string[] = [];
    for (const [key, [doctrina, , helpers]] of Object.entries(book)) {
      const siteRel = key.split(":")[0]!;
      for (const h of helpers.split(",")) {
        const node = resolve(h, siteRel);
        if (!node) { conflicts.push(`${key}: el ayudante «${h}» no se resuelve a ningún cuerpo — el libro nombra a un ayudante que no existe (G15-5)`); continue; }
        if (!byNode.has(node)) byNode.set(node, new Map());
        const m = byNode.get(node)!;
        if (!m.has(doctrina)) m.set(doctrina, []);
        m.get(doctrina)!.push(key);
        if (!byName.has(h)) byName.set(h, new Map());
        if (!byName.get(h)!.has(node)) byName.get(h)!.set(node, new Set());
        byName.get(h)!.get(node)!.add(doctrina);
      }
    }
    for (const [node, m] of byNode) {
      if (m.size > 1) conflicts.push(`${node}: ${[...m.entries()].map(([d, ks]) => `«${d}» en ${ks.join(", ")}`).join(" contra ")}`);
    }
    for (const [h, nodes] of byName) {
      if (nodes.size < 2) continue;
      const all = new Set<string>();
      for (const ds of nodes.values()) for (const d of ds) all.add(d);
      if (all.size > 1) conflicts.push(`«${h}» resuelve a ${nodes.size} cuerpos distintos (${[...nodes.keys()].join(", ")}) con doctrinas distintas (${[...all].join(", ")}) — la cuerda compartía una etiqueta que no puede decir la verdad de los dos: renombra uno o unifica su doctrina (G15-5)`);
    }
    return conflicts;
  };
  it("cada ayudante delegado tiene UNA sola doctrina — por NODO resuelto, no por cuerda (G14-3 + G15-5)", () => {
    assert.deepEqual(doctrineConflicts(FORMAS_DELEGADAS, found.resolveNode), [], "la doctrina es del cuerpo resuelto, no del sitio ni de la cuerda");
  });
  it("espécimen G15-5: mismo nombre, dos cuerpos — la colisión acusa si las doctrinas difieren y absuelve si coinciden", () => {
    const mkFile = (rel: string, helper: string, call: string) => ({
      rel,
      text: [
        "type S = { people: { id: string }[] };",
        helper,
        `export function Forma() { const save = () => commit((s: S) => ${call}, 'x'); return null; }`,
      ].join("\n"),
    });
    const virtual = scanForms([
      mkFile("components/faro/inventada15a.tsx", "const restaurar = (s: S) => ({ ...s, people: s.people.map((x) => x) });", "restaurar(s)"),
      mkFile("components/faro/inventada15b.tsx", "const restaurar = (s: S, foto: unknown[]) => ({ ...s, people: foto });", "restaurar(s, fotoDelRender)"),
    ]);
    const kA = "components/faro/inventada15a.tsx:save#1";
    const kB = "components/faro/inventada15b.tsx:save#1";
    assert.equal(virtual.delegated.get(kA), "restaurar", "el sitio A delega en «restaurar»");
    assert.equal(virtual.delegated.get(kB), "restaurar", "el sitio B delega en «restaurar» — la misma cuerda para otro cuerpo");
    const nA = virtual.resolveNode("restaurar", "components/faro/inventada15a.tsx");
    const nB = virtual.resolveNode("restaurar", "components/faro/inventada15b.tsx");
    assert.ok(nA && nB && nA !== nB, "los dos cuerpos son dos nodos: el libro ya puede decirlo");
    const book: Record<string, [Doctrina, string, string]> = {
      [kA]: ["campo", "el cuerpo A compone desde el estado", "restaurar"],
      [kB]: ["naturaleza", "el cuerpo B reemplaza por naturaleza de su objeto", "restaurar"],
    };
    const conflicts = doctrineConflicts(book, virtual.resolveNode);
    assert.equal(conflicts.length, 1, "la colisión con doctrinas distintas acusa una sola vez, por el nombre");
    assert.match(conflicts[0]!, /G15-5/);
    const bookSame: Record<string, [Doctrina, string, string]> = {
      [kA]: ["campo", "el cuerpo A compone desde el estado", "restaurar"],
      [kB]: ["campo", "el cuerpo B también compone desde el estado", "restaurar"],
    };
    assert.deepEqual(doctrineConflicts(bookSame, virtual.resolveNode), [], "la misma doctrina verificada en los dos cuerpos: la etiqueta dice la verdad y la colisión no acusa");
  });
  it("espécimen M-B: la enfermedad DELEGADA a un ayudante se ve, se clasifica como ruta y su firma acusa la foto", () => {
    const virtual = scanForms([{
      rel: "components/faro/inventada13.tsx",
      text: [
        "type S = { people: unknown[] };",
        "const guardarDesdeLaFoto = (s: S, foto: unknown[]) => ({ ...s, people: foto });",
        "export function Forma() { const save = () => commit((s: S) => guardarDesdeLaFoto(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    const key = "components/faro/inventada13.tsx:save#1";
    assert.ok(virtual.delegated.has(key), "la ruta delegada se detecta en el sitio del llamante");
    assert.ok(!FORMAS_DELEGADAS[key], "el espécimen no debe estar clasificado: en el árbol real correría rojo");
    assert.match((virtual.violations.get(key) ?? []).join(" "), /foto/, "y su firma acusa: compone la colección desde la foto, no del estado");
  });
  it("espécimen M-C: UNA letra — el map que esparce la foto en vez del elemento vivo — rompe la firma", () => {
    const virtual = scanForms([{
      rel: "components/faro/inventada13.tsx",
      text: "export function Forma(p: { id: string }) { const run = () => commit((s: never) => ({ ...s, people: peopleOf(s).map((x) => (x.id === p.id ? { ...p, archived: true } : x)) }), 'x'); return null; }",
    }]);
    const key = "components/faro/inventada13.tsx:run#1";
    assert.ok(virtual.inline.has(key), "el sitio se detecta como composición en línea");
    assert.match((virtual.violations.get(key) ?? []).join(" "), /elemento vivo/, "la firma acusa el esparcido de fuera del map: la clasificación vieja ya no absuelve la doctrina nueva");
  });
  /* ── OLA 15 (G15-1): el censo de parches resuelve la función
   * entregada — la mutación de la caza (reportUse componiendo desde
   * `line.history`, la foto del render) corrió la suite entera verde;
   * estos especímenes son esa mutación y sus sanos. ── */
  it("espécimen G15-1: el parche se juzga por el cuerpo entregado — la foto acusa, el vivo absuelve", () => {
    const key = "components/faro/inventada15.tsx:save#1";
    const mkPatch = (fnBody: string) => scanForms([{
      rel: "components/faro/inventada15.tsx",
      text: [
        "type S = { months: unknown };",
        "const line = { id: 'l1', history: [] as unknown[] };",
        "const foto = { id: 'l9', history: [] as unknown[] };",
        "export function Forma() {",
        `  const save = () => commit((s: S) => patchLineWith(s, line.id, ${fnBody}), 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    assert.deepEqual(mkPatch("(live) => ({ history: [...live.history, { id: 'u1' }] })").violations.get(key) ?? [], [], "sano: el historial se anexa sobre la línea viva del commit");
    assert.ok((mkPatch("(live) => ({ history: [...line.history, { id: 'u1' }] })").violations.get(key) ?? []).some((v) => /G15-1/.test(v)), "la mutación de la caza: el historial leído de la foto del render acusa (antes: 75/75 verde)");
    assert.ok((mkPatch("() => ({ history: [...foto.history, { id: 'u1' }] })").violations.get(key) ?? []).some((v) => /G15-1/.test(v)), "la función sin parámetro que lee el historial de fuera acusa");
    const mkPatchObj = (pre: string, patchArg: string) => scanForms([{
      rel: "components/faro/inventada15.tsx",
      text: [
        "type S = { months: unknown };",
        "const fotoLine = { id: 'l9', concept: 'Foto', color: '#000000' };",
        "export function Forma() {",
        `  const save = () => { ${pre} commit((s: S) => patchLine(s, fotoLine.id, ${patchArg}), 'x'); };`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    assert.deepEqual(mkPatchObj("", "{ color: '#123456' }").violations.get(key) ?? [], [], "sano: el literal del gesto absuelve");
    assert.ok((mkPatchObj("const patch = { ...fotoLine, color: '#123456' };", "patch").violations.get(key) ?? []).some((v) => /G15-1/.test(v)), "el parche calculado en el cierre que esparce la foto acusa por su procedencia");
  });
  /* ── OLA 15 (G15-4): las firmas resuelven los invocados y verifican
   * dominio — los dos especímenes que la caza clavó como deuda (S1 el
   * selector con señuelo, S3 el esparcido testigo) ahora acusan, y sus
   * sanos absuelven. ── */
  it("espécimen G15-4: el selector con señuelo acusa y el esparcido testigo acusa; los sanos absuelven", () => {
    const key = "components/faro/inventada15.tsx:save#1";
    const mkSel = (elegirBody: string, inner: string) => scanForms([{
      rel: "components/faro/inventada15.tsx",
      text: [
        "type S = { people: unknown[] };",
        `const elegir = ${elegirBody};`,
        `const componer = (s: S, foto: unknown[]) => ({ ...s, people: ${inner} });`,
        "export function Forma() { const save = () => commit((s: S) => componer(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    assert.ok((mkSel("(s, foto) => foto", "elegir(s, foto)").violations.get(key) ?? []).length > 0, "el selector con señuelo: recibe el estado y devuelve la foto — la resolución a cuerpos lo caza (antes absolvía)");
    assert.ok((mkSel("(s, foto) => foto", "elegir(foto)").violations.get(key) ?? []).length > 0, "control: el selector sin el estado acusa, como antes");
    assert.deepEqual(mkSel("(s, foto) => s.people", "elegir(s, foto)").violations.get(key) ?? [], [], "sano: el selector que deriva del argumento enraizado absuelve");
    const mkW = (inner: string) => scanForms([{
      rel: "components/faro/inventada15.tsx",
      text: [
        "type S = { people: { id: string }[] };",
        `const editar = (s: S, foto: unknown) => ({ ...s, people: s.people.map((x) => (x.id === '1' ? ${inner} : x)) });`,
        "export function Forma() { const save = () => commit((s: S) => editar(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    assert.ok((mkW("{ ...x, ...foto }").violations.get(key) ?? []).some((v) => /esparcido testigo/.test(v)), "el esparcido testigo: la foto esparcida DESPUÉS del vivo lo pisa y acusa (antes absolvía)");
    assert.deepEqual(mkW("{ ...foto, ...x }").violations.get(key) ?? [], [], "sano: la foto primero y el vivo después — el vivo domina y absuelve");
    assert.deepEqual(mkW("{ ...x, archived: true }").violations.get(key) ?? [], [], "sano: el vivo con campos del gesto absuelve");
  });
  /* ── OLA 16 (G16-1): el juez de parches resuelve llamadas y expande
   * identificadores — el daño del anexo que muere en el commit, en sus
   * tres grafías, y sus sanos. ── */
  it("espécimen G16-1: la foto como argumento desnudo, el parche devuelto por nombre y el segundo salto por identificador acusan", () => {
    const key = "components/faro/inventada16.tsx:save#1";
    const mkPatch = (pre: string, fnBody: string) => scanForms([{
      rel: "components/faro/inventada16.tsx",
      text: [
        "type S = { months: unknown };",
        "const foto = { id: 'l9', history: [] as unknown[] };",
        pre,
        "export function Forma() {",
        `  const save = () => commit((s: S) => patchLineWith(s, foto.id, ${fnBody}), 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    // (a) la foto como argumento desnudo a un ayudante que la esparce —
    // la resolución de G16-1 entrega el cuerpo y la regla de la casa
    // (el esparcido de la foto, G15-1) condena dentro de él
    assert.ok((mkPatch("const componer = (x: unknown) => ({ ...x, concept: 'Anexo' });", "(live) => componer(foto)").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G16-1a: componer(foto) — la foto desnuda entra en el ayudante y el ayudante la esparce: el anexo de la otra pestaña muere en el commit");
    // (b) el parche devuelto por nombre
    assert.ok((mkPatch("", "(live) => { const p = { ...foto, color: '#123456' }; return p; }").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G16-1b: el literal atado a un nombre y devuelto por ese nombre se expande y acusa");
    // (c) el segundo salto por identificador: el ayudante reenvía la foto a otro
    assert.ok((mkPatch("const dos = (y: unknown) => ({ ...y, concept: 'Anexo' }); const uno = (x: unknown) => dos(x);", "(live) => uno(foto)").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G16-1c: el relé por identificador sigue hasta el cuerpo que esparce la foto");
    // sanos: el vivo viaja por el ayudante, y el literal atado es del gesto
    assert.deepEqual(mkPatch("const componer = (l: { history: unknown[] }) => ({ history: [...l.history, { id: 'u1' }] });", "(live) => componer(live)").violations.get(key) ?? [], [],
      "sano: el parámetro vivo viaja por el ayudante y el parche se compone desde él");
    assert.deepEqual(mkPatch("", "(live) => { const p = { color: '#123456' }; return p; }").violations.get(key) ?? [], [],
      "sano: el parche devuelto por nombre, cuando es literal del gesto, absuelve");
    // la llamada con procedencia que no se resuelve acusa en voz alta
    assert.ok((mkPatch("", "(live) => ayudanteQueNoExiste(foto)").violations.get(key) ?? []).some((v) => /G16-1/.test(v)),
      "G16-1d: la llamada que lleva la foto y no se resuelve acusa, como la función entregada irresoluble");
  });
  /* ── OLA 17 (Guardián G17-2): el parche entregado como RESULTADO de
   * una llamada se resuelve — `identidad(fn)` y su familia. La caza
   * clavó el silencio: la función entregada `(live) => identidad((l)
   * => ({ history: [...foto.history] }))` corría la batería entera
   * verde, porque judgeExpr no tenía rama para la flecha-argumento y
   * la prueba de procedencia de G16-1 no veía la flecha como
   * portadora. Ahora la llamada identidad se desenvuelve a su
   * argumento y la flecha entregada se juzga como función de parche:
   * ni violación ni irresoluble EN SILENCIO. ── */
  it("espécimen G17-2: el parche tras una llamada identidad acusa por su cuerpo resuelto; el sano absuelve", () => {
    const key = "components/faro/inventada17.tsx:save#1";
    const mkPatch = (pre: string, fnBody: string) => scanForms([{
      rel: "components/faro/inventada17.tsx",
      text: [
        "type S = { months: unknown };",
        "const foto = { id: 'l9', history: [] as unknown[] };",
        pre,
        "export function Forma() {",
        `  const save = () => commit((s: S) => patchLineWith(s, foto.id, ${fnBody}), 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    const ID_GEN = "const identidad = <T,>(f: T): T => f;";
    const ID_ANK = "const identidad = (f: unknown) => f;";
    // A2: la identidad genérica devuelve la flecha culpable — su cuerpo acusa
    assert.ok((mkPatch(ID_GEN, "(live) => identidad((l) => ({ history: [...foto.history, { id: 'u1' }] }))").violations.get(key) ?? []).some((v) => /foto|historial/.test(v)),
      "G17-2/A2: identidad(fn) con genéricos — la flecha resuelta lee el historial de la foto y acusa (antes: silencio total)");
    // A2b: la identidad sin genéricos, la misma enfermedad
    assert.ok((mkPatch(ID_ANK, "(live) => identidad((l) => ({ history: [...foto.history, { id: 'u1' }] }))").violations.get(key) ?? []).some((v) => /foto|historial/.test(v)),
      "G17-2/A2b: identidad(fn) sin genéricos — la misma resolución, la misma acusación");
    // la posición misma de la función entregada: patchLineWith recibe identidad(fn)
    assert.ok((mkPatch(ID_GEN, "identidad((live) => ({ history: [...foto.history, { id: 'u1' }] }))").violations.get(key) ?? []).some((v) => /foto|historial/.test(v)),
      "G17-2: la función entregada como resultado de la llamada se desenvuelve en judgePatchFn y su cuerpo acusa");
    // sanos: la identidad que devuelve la flecha sana, y la identidad sobre lo vivo desnudo
    assert.deepEqual(mkPatch(ID_GEN, "(live) => identidad((l) => ({ history: [...l.history, { id: 'u1' }] }))").violations.get(key) ?? [], [],
      "sano: identidad(fn) donde fn compone desde su parámetro vivo absuelve — desenvolver no condena lo sano");
    assert.deepEqual(mkPatch(ID_ANK, "(live) => identidad(live)").violations.get(key) ?? [], [],
      "sano: identidad(live) entrega el parámetro vivo tal cual: limpio");
    // lo que no desenvuelve a un cuerpo acusa en voz alta, jamás en silencio
    assert.ok((mkPatch("const fabrica = (n: number) => n;", "fabrica(3)").violations.get(key) ?? []).some((v) => /no se resuelve/.test(v)),
      "G17-2: una llamada que no entrega función ni desenvuelve acusa como irresoluble (G15-1), no pasa muda");
  });
  /* ── OLA 17 (Guardián G17-3): la procedencia por ACCESO A MIEMBRO —
   * `e.copia` con `e` atado a un literal, a una llamada o en línea.
   * La caza clavó los tres caminos en silencio (B4/B1/B2) y su control
   * sano (B3): el juez miraba la raíz de la cadena («e») y el campo
   * («copia», que no es campo de línea) y no veía la foto que el
   * miembro transportaba. Ahora el miembro se expande a su valor y el
   * valor se juzga con el parámetro remapeado. ── */
  it("espécimen G17-3: el miembro que transporta la foto acusa por sus tres caminos; el control sano absuelve", () => {
    const key = "components/faro/inventada17.tsx:save#1";
    const mkPatch = (pre: string, fnBody: string) => scanForms([{
      rel: "components/faro/inventada17.tsx",
      text: [
        "type S = { months: unknown };",
        "const foto = { id: 'l9', history: [] as unknown[] };",
        pre,
        "export function Forma() {",
        `  const save = () => commit((s: S) => patchLineWith(s, foto.id, ${fnBody}), 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    const ENV = "const envolver = (x: unknown) => ({ copia: x });";
    // B4: el miembro de un literal atado
    assert.ok((mkPatch("", "(live) => { const e = { copia: foto }; return { ...e.copia, concept: 'Anexo' }; }").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G17-3/B4: e = { copia: foto } — el miembro se expande al literal y la foto acusa");
    // B1: el miembro de un nombre atado a una llamada
    assert.ok((mkPatch(ENV, "(live) => { const e = envolver(foto); return { ...e.copia, concept: 'Anexo' }; }").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G17-3/B1: e = envolver(foto) — el miembro se resuelve por el cuerpo del ayudante con su parámetro remapeado a la foto");
    // B2: el miembro de la llamada en línea
    assert.ok((mkPatch(ENV, "(live) => ({ ...envolver(foto).copia, concept: 'Anexo' })").violations.get(key) ?? []).some((v) => /foto/.test(v)),
      "G17-3/B2: envolver(foto).copia en línea — el mismo camino sin nombre intermedio");
    // B3: el control sano — el miembro transporta lo vivo
    assert.deepEqual(mkPatch(ENV, "(live) => { const e = envolver(live); return { ...e.copia, history: [...live.history, { id: 'u1' }] }; }").violations.get(key) ?? [], [],
      "G17-3/B3 sano: envolver(live) y el historial anexado sobre lo vivo — la expansión remapea el parámetro y absuelve");
  });
  /* ── OLA 18 (Guardián G18-1): la captura por cierre. La resolución
   * de la 17 seguía el canal del argumento; el invocado SIN
   * argumentos cuyo cuerpo lee la foto capturada en su ámbito cruzaba
   * en silencio (P2d, P3e, P3a, P3b). Ahora su cuerpo se juzga con el
   * ambiente de su ámbito de definición. ── */
  it("espécimen G18-1: el invocado sin argumentos que captura la foto acusa por sus cuatro caminos; los controles absuelven", () => {
    const key = "components/faro/inventada18.tsx:save#1";
    const mkPatch = (pre: string, fnBody: string) => scanForms([{
      rel: "components/faro/inventada18.tsx",
      text: [
        "type S = { months: unknown };",
        "const foto = { id: 'l9', history: [] as unknown[] };",
        pre,
        "export function Forma() {",
        `  const save = () => commit((s: S) => patchLineWith(s, foto.id, ${fnBody}), 'x');`,
        "  return null;",
        "}",
      ].join("\n"),
    }]);
    const acusaFoto = (r: ReturnType<typeof scanForms>) => (r.violations.get(key) ?? []).some((v) => /foto|historial/.test(v)) || r.unresolved.has(key);
    // P2d: el método local SIN argumentos que captura la foto en su cuerpo
    assert.ok(acusaFoto(mkPatch("const cajaLocal = { build: () => ({ history: [...foto.history, { id: 'u1' }] }) };", "(live) => cajaLocal.build()")),
      "G18-1/P2d: cajaLocal.build() — el cuerpo del método se abre con su ambiente y la foto capturada acusa");
    // P3e: la ayudante desnuda sin argumentos, leída por su miembro
    assert.ok(acusaFoto(mkPatch("", "(live) => { const dame = () => ({ copia: foto }); return { ...dame().copia, concept: 'Anexo' }; }")),
      "G18-1/P3e: dame().copia — el miembro se lee de los literales que la ayudante sin argumentos devuelve, juzgados con su cierre");
    // P3a: el método de un literal atado, en línea
    assert.ok(acusaFoto(mkPatch("", "(live) => { const e = { fn: () => ({ copia: foto }) }; return { ...e.fn().copia, concept: 'Anexo' }; }")),
      "G18-1/P3a: e.fn().copia — el método del literal atado se resuelve y su captura acusa");
    // P3b: el mismo resultado atado antes de leerse
    assert.ok(acusaFoto(mkPatch("", "(live) => { const e = { fn: () => ({ copia: foto }) }; const r = e.fn(); return { ...r.copia, concept: 'Anexo' }; }")),
      "G18-1/P3b: r = e.fn(); …r.copia — el nombre atado al resultado no esconde la captura");
    // P2c (el canal del argumento, de la caza): el método local CON la foto sigue acusando
    assert.ok(acusaFoto(mkPatch("const cajaLocal = { build: (x: { history: unknown[] }) => ({ history: [...x.history, { id: 'u1' }] }) };", "(live) => cajaLocal.build(foto)")),
      "G18-1/P2c: el método que recibe la foto como argumento acusa, como en la caza");
    // P3d sano: el intermedio por método que guarda LO VIVO absuelve, sin irresoluble
    const sano = mkPatch("", "(live) => { const e = { fn: () => ({ copia: live }) }; return { ...e.fn().copia, history: [...live.history, { id: 'u1' }] }; }");
    assert.deepEqual(sano.violations.get(key) ?? [], [], "G18-1/P3d sano: e.fn() captura el parámetro vivo del mecanismo — enraizado en su ambiente — y absuelve");
    assert.ok(!sano.unresolved.has(key), "G18-1/P3d sano: y no queda irresoluble");
    // sano: el invocado sin argumentos que devuelve un literal puro absuelve
    const puro = mkPatch("", "(live) => { const dame = () => ({ copia: { color: '#123456' } }); return { ...dame().copia, concept: 'Anexo' }; }");
    assert.deepEqual(puro.violations.get(key) ?? [], [], "G18-1 sano: la ayudante sin argumentos que devuelve un literal del gesto absuelve");
    assert.ok(!puro.unresolved.has(key), "G18-1 sano: y no queda irresoluble");
  });
  /* ── OLA 16 (G16-2): el literal que recoge campos sin esparcidos ── */
  it("espécimen G16-2: el map que recoge campos sin esparcir el vivo acusa; el que esparce, absuelve", () => {
    const key = "components/faro/inventada16.tsx:run#1";
    const mk = (inner: string) => scanForms([{
      rel: "components/faro/inventada16.tsx",
      text: "export function Forma(p: { id: string }) { const run = () => commit((s: never) => ({ ...s, people: peopleOf(s).map((x) => (x.id === p.id ? " + inner + " : x)) }), 'x'); return null; }",
    }]);
    assert.ok((mk("{ id: x.id, archived: true }").violations.get(key) ?? []).some((v) => /G16-2/.test(v)),
      "G16-2: la recogida de campos sin esparcido tira lo no recogido — la muerte por recogida es la muerte por esparcido de la foto");
    assert.deepEqual(mk("{ ...x, archived: true }").violations.get(key) ?? [], [],
      "control: el reemplazo que esparce el elemento vivo absuelve, como siempre");
  });
  /* ── OLA 16 (G16-3): el relé de selectores sin tope — la derivación
   * sigue hasta su fin; el relé circular acusa, nunca absuelve. ── */
  it("espécimen G16-3: el relé de cinco selectores que termina en la foto acusa; el que termina en lo vivo absuelve; el circular acusa", () => {
    const key = "components/faro/inventada16.tsx:save#1";
    const mkRelay = (chain: string, last: string) => scanForms([{
      rel: "components/faro/inventada16.tsx",
      text: [
        "type S = { people: unknown[] };",
        chain,
        `const componer = (s: S, foto: unknown[]) => ({ ...s, people: ${last} });`,
        "export function Forma() { const save = () => commit((s: S) => componer(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    const five = [
      "const r1 = (s: S, foto: unknown[]) => r2(s, foto);",
      "const r2 = (s: S, foto: unknown[]) => r3(s, foto);",
      "const r3 = (s: S, foto: unknown[]) => r4(s, foto);",
      "const r4 = (s: S, foto: unknown[]) => r5(s, foto);",
      "const r5 = (s: S, foto: unknown[]) => foto;",
    ].join("\n");
    assert.ok((mkRelay(five, "r1(s, foto)").violations.get(key) ?? []).length > 0,
      "G16-3: el relé de cinco selectores que termina en la foto acusa — el tope de profundidad ya no lo absuelve (antes: verde)");
    const fiveLive = five.replace("const r5 = (s: S, foto: unknown[]) => foto;", "const r5 = (s: S, foto: unknown[]) => s.people;");
    assert.deepEqual(mkRelay(fiveLive, "r1(s, foto)").violations.get(key) ?? [], [],
      "control: el relé de cinco que termina en lo vivo absuelve — seguir hasta el fin no condena lo sano");
    const circular = [
      "const r1 = (s: S, foto: unknown[]) => r2(s, foto);",
      "const r2 = (s: S, foto: unknown[]) => r1(s, foto);",
    ].join("\n");
    assert.ok((mkRelay(circular, "r1(s, foto)").violations.get(key) ?? []).length > 0,
      "G16-3b: el relé circular acusa — re-entrar en la cadena no certifica derivación");
  });
  /* ── OLA 16 (G16-4): la resolución honra alias y barriles ── */
  it("espécimen G16-4: el ayudante sano importado con alias o vía barril resuelve y no acusa por irresoluble", () => {
    const site = "components/faro/inventada16.tsx:save#1";
    const ayuda = {
      rel: "components/faro/ayuda16.ts",
      text: "type S = { people: unknown[] }; export const componerBien = (s: S, foto: unknown[]) => ({ ...s, people: s.people.map((x) => x) });",
    };
    const aliased = scanForms([ayuda, {
      rel: "components/faro/inventada16.tsx",
      text: [
        "import { componerBien as componer } from \"./ayuda16\";",
        "type S = { people: unknown[] };",
        "export function Forma() { const save = () => commit((s: S) => componer(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    assert.equal(aliased.delegated.get(site), "componer", "el sitio delega por su nombre local, el alias");
    assert.deepEqual(aliased.violations.get(site) ?? [], [], "el ayudante sano importado con alias resuelve a su cuerpo: limpio");
    assert.ok(!aliased.unresolved.has(site), "y no queda irresoluble");
    const barril = {
      rel: "components/faro/barril16.ts",
      text: "export { componerBien } from \"./ayuda16\";",
    };
    const viaBarrel = scanForms([ayuda, barril, {
      rel: "components/faro/inventada16.tsx",
      text: [
        "import { componerBien } from \"./barril16\";",
        "type S = { people: unknown[] };",
        "export function Forma() { const save = () => commit((s: S) => componerBien(s, fotoDelRender), 'x'); return null; }",
      ].join("\n"),
    }]);
    assert.equal(viaBarrel.delegated.get(site), "componerBien", "el sitio delega por el barril");
    assert.deepEqual(viaBarrel.violations.get(site) ?? [], [], "el ayudante sano vía barril resuelve a su cuerpo: limpio");
    assert.ok(!viaBarrel.unresolved.has(site), "y no queda irresoluble");
  });
  it("espécimen: un ayudante IRRESOLUBLE llamado con el estado acusa en voz alta", () => {
    const virtual = scanForms([{
      rel: "components/faro/inventada13.tsx",
      text: "export function Forma() { const save = () => commit((s: never) => ayudanteQueNoExiste(s), 'x'); return null; }",
    }]);
    assert.ok(virtual.unresolved.has("components/faro/inventada13.tsx:save#1"), "lo irresoluble no pasa en silencio: acusa");
  });
  it("control: el ayudante que compone DESDE el estado vivo (la forma del Deshacer) clasifica limpio, sin violación de firma", () => {
    const virtual = scanForms([{
      rel: "components/faro/inventada13.tsx",
      text: [
        "type S = { months: Record<string, { lines: unknown[] }> };",
        "const revertir = (state: S, u: { id: string }) => { const months: S['months'] = {}; for (const [k, b] of Object.entries(state.months)) months[k] = { lines: b.lines.filter((l) => l !== u) }; return { ...state, months }; };",
        "export function Forma() { const undo = () => commit((s: S) => { const r = revertir(s, u); return r; }, 'x'); return null; }",
      ].join("\n"),
    }]);
    const key = "components/faro/inventada13.tsx:undo#1";
    assert.ok(virtual.delegated.has(key), "la delegación segura se detecta como ruta");
    assert.deepEqual(virtual.violations.get(key) ?? [], [], "y su firma está limpia: compone desde el estado que recibió");
  });
  it("espécimen: una ruta nueva de guardado sin clasificar ACUSA en los dos brazos", () => {
    const virtual = scanForms([{
      rel: "components/faro/inventada.tsx",
      text: "export function FormaNueva() { const save = () => { commit((s) => ({ ...s, people: fotoDelRender }), 'x'); commit((s) => putCard(s, foto), 'y'); }; return null; }",
    }]);
    assert.ok(virtual.inline.has("components/faro/inventada.tsx:save#1"), "la composición nueva no fue detectada");
    assert.ok(virtual.writers.has("components/faro/inventada.tsx:save#1"), "el escritor nuevo no fue detectado");
    assert.ok(!FORMAS_INLINE["components/faro/inventada.tsx:save#1"] && !FORMAS_ESCRITOR["components/faro/inventada.tsx:save#1"], "el espécimen no debe estar clasificado: en el árbol real correría rojo");
  });
});

/* ═══════════ §C · LOS GESTOS MUDOS SUSURRAN (BR12-1/2) ════════════════
 * La .319 le dio voz al TOQUE de la fila del río y dejó mudos a sus
 * gestos hermanos: la pulsación larga del río (su destino, la selección
 * para ocultar, vive en Completo) ni siquiera montaba el bind fuera de
 * Completo, y la de las líneas de los libros moría tras
 * `if (!canSelect) return;` en Esencial (la selección vive en Ritmo).
 * La cura cablea los dos gestos al mismo Susurro: la frase nombra el
 * modo actual y dónde vive el gesto, con los nombres punteados, y la
 * tarjeta archiva la pregunta del modo nombrado. */
describe("§C · BR12-1 — la pulsación larga del río susurra su destino (Completo)", () => {
  const s = SRC("../../components/faro/historial.tsx");
  it("el río monta un bind de susurro fuera de Completo y StreamRow lo recibe", () => {
    assert.match(s, /const lpWhisper = useLongPress\(\(\) => whisperHoldRow\(\)\);/);
    assert.match(s, /hold=\{canRest \? undefined : \{ bind: lpWhisper\.bind \}\}/);
    assert.match(s, /t\("mode\.whisper\.hold-row"\)/);
  });
  it("StreamRow monta el bind del susurro y el click que persigue a la presión se traga en whisperRow", () => {
    assert.match(s, /\{\.\.\.\(sel \? sel\.bind\(m\.lineId\) : hold \? hold\.bind\(m\.lineId\) : \{\}\)\}/);
    assert.match(s, /if \(lpWhisper\.consumeClick\(\)\) return;/);
    // el cable de la .319 queda intacto, byte a byte como su cerca lo clavó
    assert.match(s, /onWhisper=\{canRest \? undefined : whisperRow\}/);
    assert.match(s, /onClick=\{sel \? \(\) => \{ if \(!sel\.consumeClick\(\)\) sel\.onTap\(m\); \} : onWhisper\}/);
  });
});

describe("§C · BR12-2 — la pulsación larga de las líneas susurra su destino (Ritmo)", () => {
  const s = SRC("../../components/faro/screens.tsx");
  it("ningún callback de presión larga muere ya tras el chequeo de permiso", () => {
    assert.ok(!/if \(!canSelect\) return;/.test(s), "la muerte silenciosa tras el chequeo está fuera");
  });
  it("los dos tableros (Libros y Compras) susurran con la misma frase y destino", () => {
    const hits = s.match(/t\("mode\.whisper\.hold-line"\)/g) ?? [];
    assert.equal(hits.length, 2);
    const targets = s.match(/"ritmo",\s*\)/g) ?? [];
    assert.ok(targets.length >= 2, "el susurro archiva la pregunta de Ritmo");
  });
  it("las frases del Susurro existen en los dos idiomas, con modo y dueño", () => {
    const i18n = SRC("./i18n.ts");
    for (const k of ["mode.whisper.hold-row", "mode.whisper.hold-line"]) {
      const hits = i18n.match(new RegExp(`"${k}":`, "g")) ?? [];
      assert.equal(hits.length, 2, `${k} en ES y EN`);
    }
    assert.match(i18n, /"mode\.whisper\.hold-row": "Estás en el modo \{mode\}\. Mantener una fila/);
    assert.match(i18n, /"mode\.whisper\.hold-line": "You're in \{mode\} mode\. Holding a line/);
  });
});

/* ═══════════ §D · LA PROSA DE LA LEY REVERTIDA (CARA-1 + BR12-3) ═══════
 * La .318 revirtió la ley de la subida y la prosa que la enseñaba quedó
 * fuera de su radio: el tema «modos» prometía «Subir no pide nada» y la
 * escena m15-subir, «Subir no pregunta». La cura reescribe ambas a la ley
 * viva (subir pregunta con su pregunta; el letrero anuncia el aterrizaje
 * confirmado; lo que llega de otro aparato solo se anuncia) y deja LA
 * CERCA DE LA CLASE: un escaneo de la familia de frases condenadas sobre
 * TODO el texto de enseñanza — cada par ES/EN que un tema o una escena
 * lleve, recogido caminando los registros (ningún campo enumerado a
 * mano: el campo que nazca mañana entra solo). */
describe("§D · la prosa enseña la ley .318 y la familia vieja está condenada en todo el corpus", () => {
  /* OLA 13 (Enseñanza, obs. §D): la recogida deja de caminar la llave
   * `chapter` — el enlace que el runtime añade a cada tema arrastraba la
   * prosa del capítulo (y de su título) al corpus de CADA tema hermano:
   * la atribución era ruidosa y la misma frase se contaba una vez por
   * tema. Una sola llave, como ya hacía la §B de la ola 11; la prosa del
   * capítulo se juzga en su propia línea (§B, CHAPTER_MODE). */
  const pairsOf = (v: unknown, out: string[] = []): string[] => {
    if (Array.isArray(v)) {
      if (v.length === 2 && v.every((x) => typeof x === "string")) { out.push(v[0]!, v[1]!); return out; }
      for (const x of v) pairsOf(x, out);
      return out;
    }
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k !== "chapter") pairsOf(x, out); }
    return out;
  };
  const corpus: { where: string; text: string }[] = [];
  for (const tp of MANUAL_TOPICS) for (const text of pairsOf(tp)) corpus.push({ where: `tema ${tp.id}`, text });
  for (const md of MODULES) for (const sc of md.scenes) for (const text of pairsOf(sc)) corpus.push({ where: `escena ${sc.id}`, text });
  /* OLA 14 (Enseñanza): los capítulos entran como entradas PROPIAS del
   * corpus («capítulo <id>», título + intro en los dos idiomas) — la
   * ola 13 sacó la llave `chapter` de la recogida de temas (la prosa
   * del capítulo se contaba una vez por tema hermano) y su comentario
   * prometió que la §B la juzga «en su propia línea», pero la §B juzga
   * VERBOS gobernados, no frases de ley: la frase vieja inyectada SOLO
   * en la intro de un capítulo corría verde 94/94. La familia de frases
   * condenadas ahora camina también los capítulos, con su nombre. */
  for (const ch of MANUAL_CHAPTERS) for (const text of pairsOf({ title: ch.title, intro: ch.intro })) corpus.push({ where: `capítulo ${ch.id}`, text });
  /* OLA 16 (Enseñanza ENS16-1): los registros de MÓDULO entran como
   * entradas propias («módulo <id>», título + promesa), como los
   * capítulos entraron en la cura 14. La frase condenada plantada SOLO
   * en la promesa de un módulo corría la suite entera verde: la §D
   * caminaba temas, escenas y capítulos, y la §B de la ola 11 juzga
   * título+promesa por VERBOS gobernados, no por frases de ley — la
   * promesa quedaba fuera del corpus de la ley revertida. */
  for (const md of MODULES) for (const text of pairsOf({ title: md.title, promise: md.promise })) corpus.push({ where: `módulo ${md.id}`, text });
  /* OLA 17 (Enseñanza ENS17-1): los pares Chapter.title del GUION
   * entran como entradas propias («capítulo del guion <id>»), el mismo
   * gesto que MANUAL_CHAPTERS en la cura 14 y que los módulos en la
   * 16. El corpus caminaba temas, escenas, capítulos del manual y
   * registros de módulo — pero no los títulos de capítulo de la
   * Presentación (MODULES[i].chapters): la frase condenada plantada
   * SOLO en un título de capítulo del guion corría la batería entera
   * verde (la caza la clavó: 322/322 con la frase viva). La §B de la
   * ola 11 juzga esos títulos por verbos gobernados, no por frases de
   * ley; la familia de la ley revertida los camina ahora por su
   * nombre. */
  for (const md of MODULES) for (const ch of md.chapters) for (const text of pairsOf({ title: ch.title })) corpus.push({ where: `capítulo del guion ${ch.id}`, text });

  const CONDENADAS: [string, RegExp][] = [
    ["subir no pide/pregunta", /\bsubir\b[^.!?]*\bno\s+(pide|pregunta)/i],
    ["subir sin preguntar/pedir", /\bsubir\b[^.!?]*\bsin\s+(preguntar|pedir)/i],
    ["subir al instante", /\bsubir\b[^.!?]*\bal instante\b/i],
    ["no pide nada", /\bno pide nada\b/i],
    ["no pregunta (frase entera)", /\bno pregunta\b/i],
    ["moving up asks nothing", /\b(moving up|upgrade)\b[^.!?]*\basks nothing\b/i],
    ["moving up never asks", /\b(moving up|upgrade)\b[^.!?]*\bnever asks\b/i],
    ["moving up doesn't ask", /\b(moving up|upgrade)\b[^.!?]*\b(doesn't|does not) ask\b/i],
    ["moving up without asking", /\b(moving up|upgrade)\b[^.!?]*\bwithout asking\b/i],
    ["moving up at once", /\b(moving up|upgrade)\b[^.!?]*\bat once\b/i],
    ["asks nothing (frase entera)", /\basks nothing\b/i],
  ];

  it("el corpus recogido es el corpus entero (temas y escenas, en los dos idiomas)", () => {
    assert.ok(corpus.length > 1500, `textos recogidos: ${corpus.length}`);
  });
  it("ninguna frase condenada de la ley vieja vive en el texto de enseñanza", () => {
    const hits: string[] = [];
    for (const c of corpus) for (const [name, re] of CONDENADAS) if (re.test(c.text)) hits.push(`${c.where} — ${name}: «${c.text.slice(0, 90)}»`);
    assert.deepEqual(hits, [], `la ley vieja sigue enseñándose:\n${hits.join("\n")}`);
  });
  it("el tema modos dice la ley viva: subir pregunta, el letrero anuncia, lo remoto no pregunta", () => {
    const modos = MANUAL_TOPICS.find((x) => x.id === "modos")!;
    assert.match(modos.how![0], /Subir pregunta antes, como bajar/);
    assert.match(modos.how![0], /letrero en el centro anuncia el modo al que llegaste/);
    assert.match(modos.how![0], /si el modo cambia en otro aparato, aquí solo se anuncia/);
    assert.match(modos.how![1], /Moving up asks first, like moving down/);
    assert.match(modos.how![1], /only announced/);
  });
  it("la escena m15-subir enseña la confirmación, no la destapada instantánea", () => {
    const sc = MODULES.flatMap((md) => md.scenes).find((x) => x.id === "m15-subir")!;
    const texts = pairsOf(sc).join(" ");
    assert.match(texts, /Subir pregunta, como bajar/);
    assert.match(texts, /solo tu confirmar aplica/);
    assert.match(texts, /Moving up asks, like moving down/);
  });
  it("espécimen: la frase vieja, reinyectada en cualquier campo, corre roja", () => {
    const vieja = "Subir no pide nada: aplica y te avisa qué se destapó.";
    const hits = CONDENADAS.filter(([, re]) => re.test(vieja)).map(([n]) => n);
    assert.ok(hits.length >= 2, `la frase vieja debe caer en la familia: ${hits.join(", ")}`);
    const viejaEn = "Moving up never asks: it uncovers the new mode at once.";
    const hitsEn = CONDENADAS.filter(([, re]) => re.test(viejaEn)).map(([n]) => n);
    assert.ok(hitsEn.length >= 2, `la frase vieja EN debe caer en la familia: ${hitsEn.join(", ")}`);
  });
  it("espécimen ola 16: la frase vieja SOLO en la promesa de un módulo corre roja (la §D camina los módulos)", () => {
    const staged = { title: ["Módulo de prueba", "Test module"], promise: ["Subir no pide nada: aplica y te avisa qué se destapó.", "Moving up never asks: it uncovers the new mode at once."] };
    const texts = pairsOf(staged);
    assert.equal(texts.length, 4, "la recogida ve título y promesa del módulo en los dos idiomas");
    const hits = texts.flatMap((text) => CONDENADAS.filter(([, re]) => re.test(text)).map(([n]) => n));
    assert.ok(hits.length >= 2, `la promesa escenificada acusa en la familia de frases: ${hits.join(", ")}`);
    // y el corpus vivo lleva los módulos con su nombre propio
    assert.ok(corpus.some((c) => c.where.startsWith("módulo ")), "el corpus nombra a los módulos como entradas propias");
    assert.ok(corpus.filter((c) => c.where.startsWith("módulo ")).length >= 40, "el corpus recoge título y promesa de cada módulo en los dos idiomas");
  });
  it("espécimen ola 14: la frase vieja SOLO en la intro de un capítulo corre roja (la §D camina los capítulos)", () => {
    const staged = { title: ["Capítulo de prueba", "Test chapter"], intro: ["Subir no pide nada: aplica y te avisa qué se destapó.", "Moving up never asks: it uncovers the new mode at once."] };
    const texts = pairsOf(staged);
    assert.equal(texts.length, 4, "la recogida ve título e intro del capítulo en los dos idiomas");
    const hits = texts.flatMap((text) => CONDENADAS.filter(([, re]) => re.test(text)).map(([n]) => n));
    assert.ok(hits.length >= 2, `la intro escenificada acusa en la familia de frases: ${hits.join(", ")}`);
    // y el corpus vivo lleva los capítulos con su nombre propio
    assert.ok(corpus.some((c) => c.where.startsWith("capítulo ")), "el corpus nombra a los capítulos como entradas propias");
  });
  it("espécimen ola 17: la frase vieja SOLO en el título de un capítulo del GUION corre roja (la §D camina los Chapter.title)", () => {
    const staged = { title: ["Subir no pide nada: aplica y te avisa qué se destapó.", "Moving up never asks: it uncovers the new mode at once."] };
    const texts = pairsOf(staged);
    assert.equal(texts.length, 2, "la recogida ve el título del capítulo del guion en los dos idiomas");
    const hits = texts.flatMap((text) => CONDENADAS.filter(([, re]) => re.test(text)).map(([n]) => n));
    assert.ok(hits.length >= 2, `el título de capítulo del guion acusa en la familia de frases: ${hits.join(", ")}`);
    // y el corpus vivo lleva los capítulos del guion con su nombre propio
    assert.ok(corpus.some((c) => c.where.startsWith("capítulo del guion ")), "el corpus nombra a los capítulos del guion como entradas propias");
    assert.ok(corpus.filter((c) => c.where.startsWith("capítulo del guion ")).length >= 100, "el corpus recoge el título de cada capítulo del guion en los dos idiomas (55 capítulos × 2)");
  });
});

/* ═══════════ §E · C12-1 — EL REFRESCO CONSERVA LA NATURALEZA ═══════════
 * La pregunta fresca de la .318 (subir también confirma) comparte diálogo
 * con el re-planteado; su vigilante, al refrescar por una llegada,
 * reconstruía el estado SIN el flag fresh: una llegada del MISMO modo
 * con otros conteos reescribía el cuerpo con «Mientras mirabas, tu modo
 * cambió…» — la narración de un cambio de modo que jamás ocurrió. La
 * cura: la reacción pura conserva la naturaleza cuando el modo no se
 * movió (live === from) y la deja caer solo cuando el modo se movió de
 * verdad, donde la narración del re-planteado es la verdad. */
describe("§E · C12-1 — el refresco del diálogo conserva fresh si el modo no se movió", () => {
  const bookWithCards = (n: number): LedgerState => {
    const s = createInitial("es", "claro");
    s.settings.mode = "esencial";
    s.cards = Array.from({ length: n }, (_, i) => ({ id: `cc-${i + 1}` }) as NonNullable<LedgerState["cards"]>[number]);
    return s;
  };
  const react = (args: Parameters<typeof modeDialogReaction>[0]) => modeDialogReaction(args);

  it("S-9 clavado: pregunta fresca E→R, llegada del mismo modo con una tarjeta menos → refresco con fresh y los conteos nuevos", () => {
    const posed = bookWithCards(2);
    const arrived = bookWithCards(1);
    const r = react({
      dialog: "reposed", from: "esencial", target: "ritmo", live: "esencial",
      state: arrived, lang: "es", fresh: true,
      currentUnlocked: unlockedGroups(posed, "esencial", "ritmo"),
    });
    assert.equal(r.kind, "refresh-reposed");
    if (r.kind !== "refresh-reposed") return;
    assert.equal(r.fresh, true, "la narración sigue siendo la de subir: el modo no se movió");
    assert.equal(r.unlocked.find((g) => g.id === "tarjetas")?.count, 1, "y los conteos son los de ahora");
  });
  it("si el modo SÍ se movió (llegada entre origen y destino), la pregunta se re-plantea y fresh cae", () => {
    const posed = bookWithCards(2);
    const r = react({
      dialog: "reposed", from: "esencial", target: "completo", live: "ritmo",
      state: bookWithCards(2), lang: "es", fresh: true,
      currentUnlocked: unlockedGroups(posed, "esencial", "completo"),
    });
    assert.equal(r.kind, "refresh-reposed");
    if (r.kind !== "refresh-reposed") return;
    assert.ok(!r.fresh, "el cuerpo del re-planteado narra un cambio que SÍ ocurrió");
    assert.equal(r.from, "ritmo");
  });
  it("un diálogo que no nació fresco jamás gana fresh en un refresco", () => {
    const posed = bookWithCards(2);
    const r = react({
      dialog: "reposed", from: "esencial", target: "ritmo", live: "esencial",
      state: bookWithCards(3), lang: "es",
      currentUnlocked: unlockedGroups(posed, "esencial", "ritmo"),
    });
    assert.equal(r.kind, "refresh-reposed");
    if (r.kind !== "refresh-reposed") return;
    assert.ok(!r.fresh);
  });
  it("el vigilante de Ajustes pasa la naturaleza a la reacción y la escribe de vuelta", () => {
    const s = SRC("../../components/faro/screens.tsx");
    assert.match(s, /currentUnlocked: modeReposed\.unlocked,\s*fresh: modeReposed\.fresh,/);
    assert.match(s, /setModeReposed\(\{ target: modeReposed\.target, from: r\.from, unlocked: r\.unlocked, fresh: r\.fresh \}\)/);
  });
});
