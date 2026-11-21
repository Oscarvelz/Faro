/**
 * F11 — el PDF propio vuelve a casa (Oscar, 2026-11-19; brief BRIEF-F11.md).
 * Faro's own exported PDF, read back through the Import door. Pure functions
 * over positioned words (the pdfstmt shape): the app feeds it pdftext.ts's
 * reading plus the PDF's attachments; tests feed it specimens.
 *
 * Two generations, one recognizer:
 *  - NEW PDFs carry a machine-readable copy of the very lines they print
 *    (an embedded file, faro-datos.json). If the copy is intact and agrees
 *    with the printed document, the return is EXACT: the same lines.
 *  - OLD PDFs (everything exported before 1.3.359) print a designed budget
 *    document, not a table: what is printed comes back (month, section kind,
 *    name, amount in the printed currency, the house named by its block),
 *    and what is not printed is DECLARED lost per line (loss codes on the
 *    row) — never silently invented.
 * A copy that is damaged or disagrees with the printed months loses to the
 * printed document, and the loss is said out loud (copy: "broken").
 */
import type { Currency, Line } from "./types.ts";
import { pageLines, type PdfDoc } from "./pdfstmt.ts";

export const FARO_ATTACHMENT = "faro-datos.json";

/* ------------------------------------------------------------------ the data copy */

/** The copy an export embeds: the exact lines the PDF prints, nothing else. */
export type FaroDataCopy = {
  app: "Faro";
  kind: "faro-lines";
  v: 1;
  exportedAt: string;
  display: Currency;
  months: string[];
  lines: Line[];
  /** FNV-1a over the canonical JSON of `lines`: a damaged copy accuses itself. */
  sum: string;
};

/** Canonical JSON (sorted keys, undefined dropped) — the checksum's one spelling. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function makeDataCopy(lines: Line[], display: Currency, exportedAt: string): FaroDataCopy {
  const months = [...new Set(lines.map((l) => l.monthKey))].sort();
  return { app: "Faro", kind: "faro-lines", v: 1, exportedAt, display, months, lines, sum: fnv1a(canonical(lines)) };
}

/** The attachment's bytes: the JSON with every non-ASCII char \u-escaped, so the
 * hand-rolled PDF writer's byte offsets (counted in chars) stay exact. JSON.parse
 * reads the escapes back to the true text — the file is valid JSON as it lies. */
export function encodeDataCopy(copy: FaroDataCopy): string {
  return JSON.stringify(copy).replace(/[\u0080-\uffff]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

const isLine = (v: unknown): v is Line => {
  const l = v as Line;
  return !!l && typeof l === "object" && typeof l.id === "string" && typeof l.monthKey === "string"
    && typeof l.kind === "string" && typeof l.concept === "string" && typeof l.amountMinor === "number"
    && (l.currency === "USD" || l.currency === "NIO");
};

/** Reads and validates a copy. "broken" = present but unusable (bad JSON, wrong
 * marker, checksum off, a line malformed, or its months disagree with the
 * printed document's) — the printed document then rules, out loud. */
export function readDataCopy(raw: string | Uint8Array | undefined, printedMonths: string[]): { copy?: FaroDataCopy; broken: boolean } {
  if (raw === undefined) return { broken: false };
  try {
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    const c = JSON.parse(text) as FaroDataCopy;
    if (!c || c.app !== "Faro" || c.kind !== "faro-lines" || c.v !== 1) return { broken: true };
    if (!Array.isArray(c.lines) || !c.lines.every(isLine)) return { broken: true };
    if (fnv1a(canonical(c.lines)) !== c.sum) return { broken: true };
    const months = [...new Set(c.lines.map((l) => l.monthKey))].sort();
    if (canonical(months) !== canonical([...printedMonths].sort())) return { broken: true };
    return { copy: c, broken: false };
  } catch {
    return { broken: true };
  }
}

/* ------------------------------------------------------------------ the printed document */

export type FaroRow = {
  date: string;
  /** Signed cents as the review speaks: income positive, spending negative. */
  amount: number;
  desc: string;
  currency: Currency;
  flow: "income" | "spend";
  /** The printed section's kind (income by column; expenses by region). */
  kindHint?: Line["kind"];
  /** The house as the document names it (the block's head), when it names one. */
  catName?: string;
  /** What the printed page does not carry, declared per line (codes). */
  loss?: string[];
  /** Generation 2: the line itself, for an exact return. */
  line?: Line;
};

export type FaroPdf = {
  months: string[];
  rows: FaroRow[];
  copy: "exact" | "none" | "broken";
};

const MONTH_NAMES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const monthKeyOf = (label: string): string => {
  const m = label.trim().match(/([A-Za-záéíóúñ]+)\s+(\d{4})/);
  if (!m) return "";
  const mo = MONTH_NAMES[m[1].toLowerCase()];
  return mo ? `${m[2]}-${String(mo).padStart(2, "0")}` : "";
};

/** "C$1,234.56" / "$1,234.56" / "-$5.00" → { cents, currency } (the printed money). */
export function faroMoney(raw: string): { cents: number; currency: Currency } | null {
  const s = (raw ?? "").trim();
  const cur: Currency = /^C\$/.test(s.replace(/^-/, "")) ? "NIO" : /\$/.test(s) ? "USD" : "USD";
  const body = s.replace(/^-/, "").replace(/^C\$/, "").replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(body)) return null;
  const cents = Math.round(Number(body) * 100);
  return { cents: s.startsWith("-") ? -cents : cents, currency: cur };
}

const TITLE = /^(Presupuesto mensual|Monthly budget)/;
const BANDS: Record<string, string> = { INGRESOS: "income", INCOME: "income", GASTOS: "expenses", EXPENSES: "expenses", AHORRO: "savings", SAVINGS: "savings" };
const COLS = [28, 284, 540];

type Section = "none" | "income" | "fixed" | "variable" | "savings" | "post";

/** The printed document, read honestly. Null when the signature is not Faro's:
 * the «Presupuesto mensual» title and at least one band must both be present —
 * no bank statement carries either, and no Faro PDF lacks them. */
export function parsePrintedFaro(doc: PdfDoc): { months: string[]; rows: FaroRow[] } | null {
  const rows: FaroRow[] = [];
  const months: string[] = [];
  let sawBand = false;
  let month = "";
  let section: Section = "none";
  let incomeHeads = false;
  const bucketCat: (string | undefined)[] = [undefined, undefined, undefined];
  const pushMonth = (mk: string) => { if (mk && !months.includes(mk)) months.push(mk); };

  for (const page of doc.pages) {
    for (const ln of pageLines(page)) {
      const text = ln.text;
      if (TITLE.test(text)) {
        const m = text.match(/(?:Mes|Month)\s+([A-Za-záéíóúñ]+ \d{4})/) ?? text.match(/·\s*([A-Za-záéíóúñ]+ \d{4})/);
        if (m) { const mk = monthKeyOf(m[1]); if (mk) { month = mk; pushMonth(mk); } }
        continue;
      }
      const band = BANDS[text.trim()];
      if (band) {
        sawBand = true;
        section = band === "income" ? "income" : band === "savings" ? "savings" : "none";
        incomeHeads = false;
        bucketCat.fill(undefined);
        continue;
      }
      if (!month) continue;
      if (section === "income") {
        if (/Ingresos fijos:|Fixed income:/.test(text)) { incomeHeads = true; continue; }
        if (/^(Total de ingresos|Total income)\b/.test(text)) { section = "post"; continue; }
        if (!incomeHeads) continue;
        // Two cells per line: fixed (concept x≈28, amount x≈250), variable (x≈420, x≈640).
        for (const [cx, ax, kind] of [[28, 250, "income-fixed"], [420, 640, "income-variable"]] as const) {
          const concept = ln.items.find((it) => Math.abs(it.x - cx) < 60 && it.s.trim() !== "—");
          const amt = ln.items.map((it) => (Math.abs(it.x - ax) < 60 ? faroMoney(it.s) : null)).find(Boolean);
          if (concept && amt) rows.push(printedRow(month, kind, concept.s.trim(), amt, undefined, ["dia", "nota", "casa"]));
        }
        continue;
      }
      if (/^(Dinero que apartas:|Money you set aside:)/.test(text)) continue; // the savings band's own subhead, not a house
      if (/^(Gastos fijos:|Fixed costs:)/.test(text)) { section = "fixed"; bucketCat.fill(undefined); continue; }
      if (/^(Gastos variables:|Variable costs:)/.test(text)) { section = "variable"; bucketCat.fill(undefined); continue; }
      if (/^Total gastos fijos\b/.test(text) || /^Total fixed expenses\b/.test(text)) { section = "none"; continue; }
      if (/^Total gastos variables\b/.test(text) || /^Total variable expenses\b/.test(text)) { section = "none"; continue; }
      if (/^Total de gastos\b/.test(text) || /^Total expenses\b/.test(text)) { section = "post"; continue; }
      if (/^Total apartado\b/.test(text) || /^Total set aside\b/.test(text)) { section = "post"; continue; }
      if (section === "fixed" || section === "variable" || section === "savings") {
        // Painted blocks in three columns: a bucket's head (text, no money) names
        // the house; an item carries its money at head-x + 150.
        for (let b = 0; b < 3; b++) {
          const base = COLS[b];
          const inBucket = ln.items.filter((it) => it.x >= base - 14 && it.x < base + 250);
          if (!inBucket.length) continue;
          const moneyIt = inBucket.map((it) => ({ it, m: it.x >= base + 120 ? faroMoney(it.s) : null })).find((x) => x.m);
          if (moneyIt?.m) {
            const name = inBucket.filter((it) => it !== moneyIt.it).map((it) => it.s.trim()).join(" ").trim();
            if (!name || name === "—") continue;
            const kind: Line["kind"] = section === "fixed" ? "expense-fixed" : section === "savings" ? "expense-fixed" : "expense-variable";
            const loss = ["dia", "nota"];
            if (section === "savings") loss.push("bolsillo");
            rows.push(printedRow(month, kind, name, moneyIt.m, bucketCat[b], loss));
          } else {
            const head = inBucket.map((it) => it.s.trim()).join(" ").trim();
            if (head) bucketCat[b] = head;
          }
        }
      }
    }
  }
  if (!sawBand || !months.length) return null;
  return { months, rows };
}

function printedRow(month: string, kind: Line["kind"], rawName: string, amt: { cents: number; currency: Currency }, catName: string | undefined, loss: string[]): FaroRow {
  const clipped = /\.\.\.$/.test(rawName);
  const name = clipped ? rawName.slice(0, -3).trimEnd() : rawName;
  const income = kind.startsWith("income");
  return {
    date: `${month}-01`,
    amount: income ? Math.abs(amt.cents) : -Math.abs(amt.cents),
    desc: name,
    currency: amt.currency,
    flow: income ? "income" : "spend",
    kindHint: kind,
    ...(catName ? { catName } : {}),
    loss: clipped ? [...loss, "recorte"] : loss,
  };
}

/** The whole recognition: signature first, then the copy against the print. */
export function parseFaroPdf(doc: PdfDoc, attachment?: string | Uint8Array): FaroPdf | null {
  const printed = parsePrintedFaro(doc);
  if (!printed) return null;
  const { copy, broken } = readDataCopy(attachment, printed.months);
  if (copy) {
    const rows: FaroRow[] = copy.lines.map((line) => ({
      date: line.bookedOn || `${line.monthKey}-01`,
      amount: line.kind.startsWith("income") ? Math.abs(line.amountMinor) : -Math.abs(line.amountMinor),
      desc: line.concept,
      currency: line.currency,
      flow: line.kind.startsWith("income") ? "income" : "spend",
      line,
    }));
    return { months: printed.months, rows, copy: "exact" };
  }
  return { months: printed.months, rows: printed.rows, copy: broken ? "broken" : "none" };
}
