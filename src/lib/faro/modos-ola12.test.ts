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
import { MANUAL_TOPICS } from "../manual/topics.ts";
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
  "lib/faro/coach.ts:readCoach:m.expense": ["gasto", "monthTotals.expense es solo-gasto por construcción (separa por rol)"],
  "lib/faro/coach.ts:readCoach:t.expense": ["gasto", "monthTotals.expense es solo-gasto por construcción (separa por rol)"],
  "lib/faro/coach.ts:readCoach:t.saved": ["movimiento", "monthTotals.saved: el apartado nombrado como apartado en el coach"],
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
  "lib/faro/widget.ts:buildWidgetSnapshot:s.opportunity": ["movimiento", "el widget nombra la caja como lo que queda"],
  "lib/faro/widget.ts:buildWidgetSnapshot:s.savingsFlow": ["movimiento", "el widget nombra el ahorro del mes como ahorro"],
  "lib/faro/year.ts:yearReport:s.expense": ["interna", "compone el YearReport; su cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.opportunity": ["interna", "compone los netos de la rejilla del año; la cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.savingsFlow": ["interna", "compone savedFlow del año (BR12-5b); su cara clasificada es YearCard"],
  "lib/faro/year.ts:yearReport:s.spend": ["interna", "compone spend del año (BR12-5b); su cara clasificada es YearCard"],
};

const AGREGADORES: Record<string, [Clase, string]> = {
  "components/faro/advisor2.tsx:ShortVisual": ["gasto", "el resto de «los gastos que más pesaron»: suma las líneas del río ya clasificadas SIN las transferencias (el apartado fuera)"],
  "components/faro/archivo.tsx:ArchivoScreen": ["interna", "suma lo archivado para la vista del Archivo, nombrado como archivo; no es una frase del mes vivo"],
  "components/faro/book-side.tsx:BookSide": ["interna", "totales por libro de la barra lateral (el saldo de cada libro), no frases de gasto del mes"],
  "components/faro/cards.tsx:CardScan": ["interna", "suma las partidas del escaneo de la tarjeta antes de guardar; no agrega el libro"],
  "components/faro/receipt-scan.tsx:ScanSheet": ["interna", "suma las partidas del recibo escaneado en la hoja de revisión; no agrega el libro"],
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
  "lib/faro/awake.ts:savingsPicture": ["movimiento", "la foto al despertar nombra lo guardado como guardado: es la superficie del apartado"],
  "lib/faro/bankbook.ts:rewardsMonth": ["interna", "suma recompensas de tarjetas (ganadas y perdidas), no gasto ni salida del mes"],
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
    assert.match(s, /const liveCard = storedCard \?\? \(!isAdd && !freshId \? cardsOf\(s\)\.find\(\(c\) => c\.id === bornId\) : undefined\);/);
    assert.match(s, /if \(!isAdd && !freshId && !liveCard\) return s;/);
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
 * se fusiona por id con su testigo (fusePerson). */
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
    assert.match(s, /const savePeople = \(fn: \(live: Person\[\]\) => Person\[\], detail: string\) => commit\(\(s\) => \(\{ \.\.\.s, people: fn\(peopleOf\(s\)\) \}\), detail\);/);
    assert.ok(!/people: next/.test(s), "la escritura desde la foto del render está fuera");
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
  const importsCache = new Map<string, Map<string, string>>();
  const importsOf = (rel: string): Map<string, string> => {
    let m = importsCache.get(rel);
    if (m) return m;
    m = new Map();
    const text = byRel.get(rel);
    if (text) {
      const dir = rel.split("/").slice(0, -1);
      const resolveSpec = (spec: string): string | null => {
        let parts: string[];
        if (spec.startsWith("@/")) parts = spec.slice(2).split("/");
        else if (spec.startsWith(".")) {
          parts = [...dir];
          for (const seg of spec.split("/")) { if (seg === "..") parts.pop(); else if (seg !== ".") parts.push(seg); }
        } else return null;
        const base = parts.join("/");
        for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) if (byRel.has(cand)) return cand;
        return null;
      };
      const visit = (n: ts.Node) => {
        if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
          const target = resolveSpec(n.moduleSpecifier.text);
          const clause = n.importClause;
          if (target && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) m!.set(el.name.text, target);
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(parse(rel, text));
    }
    importsCache.set(rel, m);
    return m;
  };
  const resolveHelper = (name: string, fromRel: string): { rel: string; node: ts.Node } | null => {
    const local = defsOf(fromRel).get(name);
    if (local) return { rel: fromRel, node: local };
    const target = importsOf(fromRel).get(name);
    if (target) { const d = defsOf(target).get(name); if (d) return { rel: target, node: d }; }
    return null;
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
        (COLL_ACCESSORS.has(n.expression.text) || FORM_WRITERS.has(n.expression.text) || ROOT_WRITERS.has(n.expression.text))) yes = true;
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
   * : {}) }) no son la base del reemplazo y no acusan. */
  const mapVivoViolations = (root: ts.Node, out: string[]) => {
    const judgeLiteral = (lit: ts.ObjectLiteralExpression, param: string, recvName: string) => {
      const spreads = lit.properties.filter((p) => ts.isSpreadAssignment(p));
      if (!spreads.length) return;
      const ok = spreads.some((sp) => (ts.isIdentifier(sp.expression) && sp.expression.text === param) || ts.isCallExpression(sp.expression));
      if (!ok) out.push(`map sobre ${recvName}: el reemplazo esparce «${(spreads[0]!.expression as ts.Node).getText()}» en vez del elemento vivo «${param}» — compone desde fuera del map (M-C)`);
    };
    const replacements = (e: ts.Node, param: string, recvName: string) => {
      if (ts.isObjectLiteralExpression(e)) { judgeLiteral(e, param, recvName); return; }
      if (ts.isConditionalExpression(e)) { replacements(e.whenTrue, param, recvName); replacements(e.whenFalse, param, recvName); return; }
      if (ts.isParenthesizedExpression(e)) { replacements(e.expression, param, recvName); return; }
      if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
        replacements(e.left, param, recvName); replacements(e.right, param, recvName);
      }
    };
    const scan = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "map") {
        const recv = n.expression.expression;
        if (ts.isCallExpression(recv) && ts.isIdentifier(recv.expression) && COLL_ACCESSORS.has(recv.expression.text)) {
          const cb = n.arguments[0];
          if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters.length && ts.isIdentifier(cb.parameters[0]!.name)) {
            const param = (cb.parameters[0]!.name as ts.Identifier).text;
            const recvName = (recv.expression as ts.Identifier).text;
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
  /** La firma FOTO sobre el cuerpo de un ayudante delegado: ninguna
   * llave de colección se asigna desde un identificador desnudo que no
   * nazca del estado recibido (ni literal, ni llamada, ni composición):
   * `people: foto` acusa (M-B). Un ayudante que LEE las colecciones del
   * estado (hidePeriod lee state.months y construye las suyas de esa
   * lectura) compone de lo vivo por construcción: sus variables locales
   * nacen de la lectura y la firma no las acusa. */
  const fotoViolations = (helper: ts.Node, stateParam: string | null, out: string[]) => {
    if (!stateParam) return;
    let readsBook = false;
    const readScan = (n: ts.Node) => {
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === stateParam && BOOK_TOUCHES.has(n.name.text)) readsBook = true;
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && COLL_ACCESSORS.has(n.expression.text) &&
        n.arguments.some((a) => ts.isIdentifier(a) && a.text === stateParam)) readsBook = true;
      ts.forEachChild(n, readScan);
    };
    readScan(helper);
    if (readsBook) return;
    const derived = new Set<string>([stateParam]);
    const scan = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
        if (new RegExp(`\\b${stateParam}\\b`).test(n.initializer.getText())) derived.add(n.name.text);
      }
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && COLL_KEYS_B.has(n.name.text) && ts.isIdentifier(n.initializer)) {
        if (!derived.has(n.initializer.text)) out.push(`la llave ${n.name.text} se asigna desde «${n.initializer.text}», que no nace del estado recibido — compone desde la foto (M-B)`);
      }
      ts.forEachChild(n, scan);
    };
    scan(helper);
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
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "commit") {
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
              if (ts.isIdentifier(n.expression) && (FORM_WRITERS.has(n.expression.text) || (rel === "components/faro/line-form.tsx" && ROOT_WRITERS.has(n.expression.text)))) called.add(n.expression.text);
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
          const delegatedHelpers: { name: string; node: ts.Node }[] = [];
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
              if (COLL_ACCESSORS.has(name) || FORM_WRITERS.has(name) || ROOT_WRITERS.has(name)) continue; // ya censados por su brazo
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
              delegatedHelpers.push({ name, node: r.node });
              const hparams = (r.node as ts.FunctionLikeDeclarationBase).parameters ?? [];
              const hState = hparams.length && ts.isIdentifier(hparams[0]!.name) ? (hparams[0]!.name as ts.Identifier).text : null;
              fotoViolations(r.node, hState, siteViolations);
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
            mapVivoViolations(body, siteViolations);
            for (const h of delegatedHelpers) mapVivoViolations(h.node, siteViolations);
            /* la firma FUSIONA: el subárbol del sitio (el updater y sus
             * ayudantes) llama a una fusión nombrada (fuse…) o aplica el
             * fn del llamante sobre un accesor vivo (la forma savePeople).
             * Las firmas se asientan POR LLAVE DE CADA BRAZO: dos brazos
             * pueden compartir la cuerda «fn#n» (OwedSide#2 es la fusión
             * en línea y restoreLent en delegadas) y ninguna pisa a otra. */
            let hasFusion = false;
            const fusionScan = (n: ts.Node) => {
              if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
                if (/^fuse[A-Z]/.test(n.expression.text)) hasFusion = true;
                if (params.has(n.expression.text) && n.arguments.some((a) => ts.isCallExpression(a) && ts.isIdentifier(a.expression) && COLL_ACCESSORS.has(a.expression.text))) hasFusion = true;
              }
              ts.forEachChild(n, fusionScan);
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
  }
  return { inline, writers, delegated, violations, unresolved, fusion };
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
  "components/faro/people.tsx:savePeople#1": ["fusiona", "aplica la transformación sobre peopleOf(s) vivo; la ficha editada fusiona por id con su testigo (Personas)"],
  "components/faro/people.tsx:run#1": ["campo", "archiva una persona por id con map sobre el vivo (el run de su confirmación)"],
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
  "components/faro/screens.tsx:savePlan#1": ["campo", "la pieza editada se mapea sobre el catálogo vivo y su línea se sincroniza en el mismo commit"],
};

const FORMAS_ESCRITOR: Record<string, [Doctrina, string, string]> = {
  "components/faro/cards.tsx:proceed#1": ["fusiona", "CardForm: el candidato se fusiona (fuseCardDraft) contra el registro del commit y putCard escribe el resultado; las lecturas del alta se anexan", "addReading,addRewards,putCard"],
  "components/faro/cards.tsx:save#1": ["anexa", "el modo update de CardForm anexa lecturas y recompensas por id sobre el registro vivo (addReading busca en cardsOf)", "addReading,addRewards"],
  "components/faro/cards.tsx:save#2": ["anexa", "CardScan: crea la tarjeta nueva o anexa las lecturas del escaneo por id; no edita campos gobernados de la ficha", "addReading,addRewards,putCard"],
  "components/faro/bank-settings.tsx:editor#1": ["fusiona", "EditAcct: editAccount aplica el parche {name?, color?, bank?} sobre el registro vivo dentro del commit", "editAccount"],
  "components/faro/rewards-real.tsx:save#1": ["campo", "setRewardReal escribe la figura de la cuenta dentro del commit, sobre el libro vivo", "setRewardReal"],
  "components/faro/line-form.tsx:save#1": ["fusiona", "la raíz: upsertLine recibe la línea ya fusionada ({...existing, ...fresh} con sus testigos de toque)", "declareSeries,upsertLine"],
};

/* ── OLA 13 · BRAZO C: LAS RUTAS DELEGADAS (G13-2) ────────────────────
 * Todo commit cuyo updater entrega el estado a un ayudante que compone
 * (en el archivo o en la librería) y cuyo resultado vuelve como estado
 * nuevo. La entrada nombra a su ayudante: si el ayudante cambia, la ruta
 * se re-clasifica. El Deshacer de la importación — el precedente vivo
 * que la caza nombró — queda clasificado por su conducta real: compone
 * desde el s vivo dentro del commit. */
const FORMAS_DELEGADAS: Record<string, [Doctrina, string, string]> = {
  "components/faro/archivo.tsx:ArchivoScreen#1": ["campo", "restaura el «Me deben» archivado por id sobre el vivo, dentro del commit", "restoreLent"],
  "components/faro/archivo.tsx:ArchivoScreen#2": ["campo", "restaura el préstamo archivado por id sobre el vivo, dentro del commit", "restoreLoan"],
  "components/faro/archivo.tsx:ArchivoScreen#3": ["campo", "restaura la tarjeta archivada por id sobre el vivo, dentro del commit", "restoreCard"],
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
  "components/faro/screens.tsx:savePlan#1": ["campo", "syncInsLine sincroniza la línea del plan sobre el vivo en el mismo commit (el sitio además compone en línea)", "syncInsLine"],
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
