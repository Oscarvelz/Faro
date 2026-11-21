// F11 (1.3.359) — el PDF propio vuelve a casa. The real round trip runs through
// pdf.js itself (the same reader the app uses): export a month to PDF, read it
// back, and judge both generations — the data copy (exact) and the print alone
// (honest, with its losses declared per line).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyImport, buildReview, counts, fromFaroPdf, pickSource } from "./bankparse.ts";
import { accounts, importBook } from "./bankbook.ts";
import { makeNamer } from "./defaults.ts";
import { pdfFile, type ExportPick } from "./export-docs.ts";
import { FARO_ATTACHMENT, canonical, parseFaroPdf, parsePrintedFaro, type FaroPdf } from "./faropdf.ts";
import { detectPdf, parsePdfStatement, type PdfDoc } from "./pdfstmt.ts";
import type { Category, LedgerState, Line } from "./types.ts";

/* ------------------------------------------------------------ specimens */

const sub = (id: string, name: string, icon = "Circle") => ({ id, nameKey: "", customName: name, icon, hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: ReturnType<typeof sub>[], role = ""): Category =>
  ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role, subs });

function ledger(lines: Line[]): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [],
    months: lines.length ? { "2026-11": { lines } } : {},
    settings: { lang: "es", theme: "claro", display: "NIO", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} } as LedgerState["settings"],
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [sub("f.alimentos.despensa", "Despensa")]),
        cat("f-ahorro", "fixed", "Ahorro", [sub("vault-pp", "PayPal Ahorro", "vault")], "savings"),
        cat("v-entretenimiento", "variable", "Entretenimiento", [sub("v.e.restaurantes", "Restaurantes")]),
        cat("v-personales", "variable", "Personales", [sub("v.p.otros", "Otros")]),
      ],
      purchases: [{ id: "super", nameKey: "", customName: "Supermercado", icon: "Package", hidden: false, order: 0 }],
      catalog: [{ id: "prov-netflix", nameKey: "", customName: "Netflix", icon: "Tv", hidden: false, order: 0, kind: "sub" } as never],
    },
  } as LedgerState;
}

let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; concept: string; amountMinor: number }): Line => {
  const id = `L${++seq}`;
  return {
    id, seriesId: id, monthKey: "2026-11", currency: "NIO", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "",
    aprBps: 0, balanceMinor: null, balanceCurrency: "NIO", icon: "", history: [], bookedOn: "2026-11-10", startedOn: "",
    ...partial,
  } as Line;
};

const LINES: Line[] = [
  line({ kind: "income-fixed", concept: "Salario", amountMinor: 300000, bookedOn: "2026-11-01" }),
  line({ kind: "income-variable", concept: "Venta de muebles", amountMinor: 45000, bookedOn: "2026-11-18" }),
  line({ kind: "expense-fixed", concept: "Arroz y frijoles", amountMinor: 25000, categoryId: "f-alimentos", note: "nota que no se imprime", bookedOn: "2026-11-05" }),
  line({ kind: "expense-variable", concept: "Cena fuera", amountMinor: 18000, categoryId: "v-entretenimiento", subId: "v.e.restaurantes", bookedOn: "2026-11-20" }),
  line({ kind: "purchase", concept: "Detergente", amountMinor: 9500, categoryId: "super", bookedOn: "2026-11-07" }),
  line({ kind: "subscription", concept: "Netflix", amountMinor: 15000, categoryId: "v-entretenimiento", providerId: "prov-netflix", bookedOn: "2026-11-03" }),
  line({ kind: "expense-fixed", concept: "Apartado PayPal", amountMinor: 20000, categoryId: "f-ahorro", subId: "vault-pp", bookedOn: "2026-11-02" }),
  line({ kind: "expense-variable", concept: "Un gasto con un nombre bastante largo de verdad", amountMinor: 5000, categoryId: "v-personales", bookedOn: "2026-11-09" }),
];
const PICK: ExportPick = { scope: "month", activeOnly: false, kinds: ["income-fixed", "income-variable", "expense-fixed", "expense-variable", "purchase", "subscription"], savings: true, debt: false, summary: false, charts: false, advice: false, remit: false };

/** pdf.js, exactly as pdftext.ts reads: positioned words + the attachments. */
async function extract(buf: ArrayBuffer): Promise<PdfDoc & { attachments?: Record<string, Uint8Array> }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    new URL("../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).pathname;
  const task = (pdfjs as { getDocument: (o: object) => { promise: Promise<never> } }).getDocument({ data: new Uint8Array(buf), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = (await task.promise) as unknown as {
    numPages: number;
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str?: string; transform: number[] }[] }>; cleanup: () => void }>;
    getAttachments: () => Promise<Map<string, { filename?: string }> | Record<string, { filename?: string }> | null>;
    getAttachmentContent: (id: string) => Promise<{ content?: Uint8Array } | Uint8Array>;
  };
  const pages: PdfDoc["pages"] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const words: PdfDoc["pages"][number] = [];
    for (const it of tc.items) {
      if (!it.str) continue;
      words.push({ s: it.str, x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10 });
    }
    pages.push(words);
    page.cleanup();
  }
  const atts = await doc.getAttachments();
  const attachments: Record<string, Uint8Array> = {};
  if (atts) {
    const entries = (atts instanceof Map ? [...atts.entries()] : Object.entries(atts)) as [string, { filename?: string }][];
    for (const [id, att] of entries) {
      const full = (await doc.getAttachmentContent(id)) as { content?: Uint8Array } | Uint8Array;
      const content = full instanceof Uint8Array ? full : full?.content;
      if (content) attachments[att?.filename || id] = content;
    }
  }
  return { pages, attachments };
}

async function exported() {
  const state = ledger(LINES);
  const names = makeNamer(state.structure);
  const file = pdfFile(state, "2026-11", "es", names, PICK);
  const buf = await file.arrayBuffer();
  const doc = await extract(buf);
  return { state, names, doc };
}

const review = (state: LedgerState, faro: FaroPdf) => {
  const f = fromFaroPdf("Faro_2026-11.pdf", faro);
  const srcs = [pickSource(f, importBook(state), accounts(state))];
  const rv = buildReview(state, [f], srcs, makeNamer(state.structure), "es");
  return { f, rv, srcs };
};

/* ------------------------------------------------------------ generation 2: the copy */

describe("F11 · la copia de datos", () => {
  it("ida y vuelta exacta: exportar → importar a un libro vacío reproduce las líneas campo a campo", async () => {
    const { doc } = await exported();
    const faro = parseFaroPdf(doc, doc.attachments?.[FARO_ATTACHMENT]);
    assert.ok(faro, "el PDF propio se reconoce");
    assert.equal(faro.copy, "exact");
    assert.equal(faro.rows.length, LINES.length);
    for (const src of LINES) {
      const row = faro.rows.find((r) => r.line?.id === src.id);
      assert.ok(row, `la línea ${src.concept} vuelve`);
      assert.equal(canonical(row.line), canonical(src), `${src.concept}: campo a campo`);
    }
    const empty = ledger([]);
    const { f, rv, srcs } = review(empty, faro);
    assert.equal(counts(rv.rows).fresh, LINES.length);
    const applied = applyImport(empty, rv, [f], srcs, "batch-f11");
    const back = applied.state.months["2026-11"].lines;
    assert.equal(back.length, LINES.length);
    for (const src of LINES) {
      const got = back.find((l) => l.id === src.id);
      assert.ok(got, `${src.concept} restaurada con su id`);
      assert.equal(canonical({ ...got, batch: undefined }), canonical({ ...src, batch: undefined }), `${src.concept}: idéntica salvo el lote`);
    }
  });

  it("duplicados: reimportar sobre el mismo libro marca todo y guardar no crea ni una línea", async () => {
    const { state, doc } = await exported();
    const faro = parseFaroPdf(doc, doc.attachments?.[FARO_ATTACHMENT])!;
    const { f, rv, srcs } = review(state, faro);
    assert.equal(counts(rv.rows).dups, LINES.length);
    assert.equal(counts(rv.rows).fresh, 0);
    const applied = applyImport(state, rv, [f], srcs, "batch-f11-dup");
    assert.equal(applied.undo.added, 0);
    assert.equal(applied.state.months["2026-11"].lines.length, LINES.length);
  });

  it("copia rota: un dígito cambiado en la copia → manda lo impreso y se dice", async () => {
    const { doc } = await exported();
    const raw = new TextDecoder().decode(doc.attachments![FARO_ATTACHMENT]);
    const tampered = raw.replace("300000", "300001");
    assert.notEqual(tampered, raw);
    const faro = parseFaroPdf(doc, tampered)!;
    assert.equal(faro.copy, "broken");
    assert.ok(faro.rows.every((r) => !r.line), "ninguna fila viene de la copia rota");
    assert.ok(faro.rows.length >= 6, "lo impreso sí vuelve");
  });

  it("copia de otro mes: no cuadra con lo impreso → rota", async () => {
    const { doc } = await exported();
    const base = ledger([]);
    const other: LedgerState = { ...base, months: { "2026-10": { lines: [line({ kind: "expense-fixed", concept: "Otro mes", amountMinor: 100, monthKey: "2026-10", bookedOn: "2026-10-02" })] } } };
    const names = makeNamer(other.structure);
    const otherDoc = await extract(await pdfFile(other, "2026-10", "es", names, { ...PICK }).arrayBuffer());
    const faro = parseFaroPdf(doc, otherDoc.attachments![FARO_ATTACHMENT])!;
    assert.equal(faro.copy, "broken");
  });
});

/* ------------------------------------------------------------ generation 1: the print alone */

describe("F11 · lo impreso, honestamente", () => {
  it("sin copia: lo impreso vuelve con sus pérdidas declaradas por línea", async () => {
    const { doc } = await exported();
    const faro = parseFaroPdf(doc, undefined)!;
    assert.equal(faro.copy, "none");
    const byDesc = (d: string) => faro.rows.find((r) => r.desc === d);
    const arroz = byDesc("Arroz y frijoles")!;
    assert.equal(arroz.kindHint, "expense-fixed");
    assert.equal(arroz.catName, "Alimentos");
    assert.equal(arroz.amount, -25000);
    assert.equal(arroz.currency, "NIO");
    assert.equal(arroz.date, "2026-11-01");
    assert.deepEqual(arroz.loss, ["dia", "nota"]);
    const salario = byDesc("Salario")!;
    assert.equal(salario.kindHint, "income-fixed");
    assert.equal(salario.amount, 300000);
    assert.ok(salario.loss!.includes("casa"), "el ingreso no imprime su casa: declarado");
    const cena = byDesc("Cena fuera")!;
    assert.equal(cena.catName, "Entretenimiento");
    assert.equal(cena.kindHint, "expense-variable");
    const apartado = byDesc("Apartado PayPal")!;
    assert.equal(apartado.catName, "Ahorro");
    assert.ok(apartado.loss!.includes("bolsillo"), "el bolsillo no se imprime: declarado");
    const largo = faro.rows.find((r) => r.desc.startsWith("Un gasto con un nombr"))!;
    assert.ok(!largo.desc.endsWith("..."), "el nombre vuelve sin los puntos suspensivos");
    assert.ok(largo.loss!.includes("recorte"), "el recorte se declara");
  });

  it("la revisión casa por nombre, resuelve la compra, y la duda queda con su herramienta", async () => {
    const { doc } = await exported();
    const faro = parseFaroPdf(doc, undefined)!;
    const { rv } = review(ledger([]), faro);
    const byLabel = (d: string) => rv.rows.find((r) => r.label === d);
    assert.equal(byLabel("Arroz y frijoles")!.target, "expense-fixed|f-alimentos|");
    assert.equal(byLabel("Cena fuera")!.target, "expense-variable|v-entretenimiento|");
    assert.equal(byLabel("Detergente")!.target, "purchase|super|", "el bloque del Supermercado se resuelve como compra");
    assert.equal(byLabel("Salario")!.target, "income-fixed||");
    const netflix = byLabel("Netflix")!;
    assert.ok(netflix.loss!.includes("casa"), "el proveedor impreso no es una casa: la duda se declara");
    assert.ok(netflix.target, "y la fila nace con la ficha de la casa como herramienta");
  });

  it("duplicados de la generación 1: el mismo libro reconoce sus líneas por mes, monto y nombre", async () => {
    const { state, doc } = await exported();
    const faro = parseFaroPdf(doc, undefined)!;
    const { f, rv, srcs } = review(state, faro);
    const fresh = rv.rows.filter((r) => r.include);
    assert.equal(fresh.length, 0, `ninguna fila entra nueva: ${fresh.map((r) => r.label).join(", ")}`);
    const applied = applyImport(state, rv, [f], srcs, "batch-f11-g1");
    assert.equal(applied.undo.added, 0);
  });

  it("la reina: importar no mueve ningún total hasta guardar, y al guardar mueve exactamente lo aceptado", async () => {
    const { doc } = await exported();
    const faro = parseFaroPdf(doc, undefined)!;
    const empty = ledger([]);
    const { f, rv, srcs } = review(empty, faro);
    const sum = (s: LedgerState) => Object.values(s.months).flatMap((b) => b.lines).reduce((a, l) => a + (l.kind.startsWith("income") ? l.amountMinor : -l.amountMinor), 0);
    assert.equal(sum(empty), 0);
    const applied = applyImport(empty, rv, [f], srcs, "batch-f11-q");
    const want = LINES.reduce((a, l) => a + (l.kind.startsWith("income") ? l.amountMinor : -l.amountMinor), 0);
    assert.equal(sum(applied.state), want, "el neto del mes vuelve entero");
  });
});

/* ------------------------------------------------------------ the cross fence */

describe("F11 · la cerca cruzada", () => {
  it("un estado de banco jamás se reconoce como Faro, ni un PDF de Faro como banco", async () => {
    const bankDoc: PdfDoc = {
      pages: [[
        { s: "Chase", x: 28, y: 574 }, { s: "Total Checking", x: 80, y: 574 },
        { s: "Presupuesto mensual", x: 28, y: 500 }, // ni aun con la frase suelta…
      ]],
    };
    assert.equal(parsePrintedFaro(bankDoc), null, "sin bandas no hay firma");
    assert.equal(parseFaroPdf(bankDoc, undefined), null);
    const { doc } = await exported();
    assert.equal(detectPdf(doc), null, "el documento de Faro no es de ningún banco");
    assert.equal(parsePdfStatement(doc), null);
  });

  it("un PDF sin capa de texto no es de Faro: no se adivina", () => {
    assert.equal(parseFaroPdf({ pages: [[]] }, undefined), null);
  });
});
