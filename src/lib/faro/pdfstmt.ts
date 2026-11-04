/**
 * Monthly statement PDFs (Nov 2026): reads the text layer of the bank's own PDF statement and finds the transaction table.
 * Pure functions over positioned text (x, y per word), so the same code runs in the app (pdftext.ts feeds it) and in tests.
 * Issuers by header text: Chase checking, Chase credit card, Wells Fargo card, PayPal Cashback Mastercard (Synchrony),
 * PayPal Savings, PayPal account statement (ES/EN). Summary, interest-calculation and marketing sections are ignored;
 * the statement's own summary is read only to check that the rows add up (`recon`).
 * Sign convention of RawTx.amount: negative = money out of that account (a card purchase is negative, a payment positive).
 */
import type { AcctKind, RewardClass } from "./types.ts";

export type PdfItem = { s: string; x: number; y: number };
export type PdfDoc = { pages: PdfItem[][] };

/** One transaction as a PDF gives it. `flow` and `cat` are the parser's reading of the statement's own sections. */
export type PdfTx = {
  date: string; amount: number; desc: string; name?: string; id?: string; ref?: string;
  flow?: "spend" | "refund" | "income" | "interest" | "xfer" | "skip";
  /** Paid through PayPal (a PayPal checkout seen on a card statement, or a PayPal row funded by a card). */
  pp?: boolean;
  /** Funding source as the PayPal statement names it. */
  fund?: string;
  fundedByCard?: boolean;
  rc?: RewardClass; cat?: string; noReward?: boolean;
};
/** `soft`: the statement itself says this total may differ (held or pending money). */
export type ReconLine = { label: string; want: number; got: number; soft?: boolean };
export type PdfStatement = {
  issuer: "chase-checking" | "chase-card" | "wf-card" | "paypal-card" | "paypal-savings" | "paypal-account";
  bank: "chase" | "wellsfargo" | "paypal";
  kind: AcctKind;
  tail: string;
  period: { from: string; to: string };
  rows: PdfTx[];
  /** Pages with no text layer (scanned images). 1-based. */
  imagePages: number[];
  recon: ReconLine[];
  /** What the statement itself says was earned this period, as printed ("$3.32", "1,829 pts"). */
  rewards?: { cents?: number; points?: number; balanceCents?: number; text: string };
  begin?: number; end?: number; apyBps?: number;
};

/* ------------------------------------------------------------------ text helpers */

type Line = { y: number; items: PdfItem[]; text: string };
/** Words of one page grouped into lines (same baseline ±2), top to bottom, left to right. */
export function pageLines(items: PdfItem[]): Line[] {
  const rows: { y: number; items: PdfItem[] }[] = [];
  for (const it of items) {
    if (!it.s || !it.s.trim()) continue;
    let row = rows.find((r) => Math.abs(r.y - it.y) <= 2);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  return rows.sort((a, b) => b.y - a.y).map((r) => {
    const its = r.items.sort((a, b) => a.x - b.x);
    // pdf.js sometimes repeats a word drawn twice (bold by overprint): drop exact repeats at the same x.
    const uniq = its.filter((it, i) => !its.slice(0, i).some((o) => o.s === it.s && Math.abs(o.x - it.x) < 2));
    return { y: r.y, items: uniq, text: uniq.map((i) => i.s.trim()).join(" ").replace(/\s+/g, " ") };
  });
}

const MONEY = /^[-−–]?\s*\+?\s*\$?\s*[-−–]?\s*\d{1,3}(,\d{3})*\.\d{2}$/;
/** "$1,234.56", "-$700.00", "- 40.00", "+ 110.43", "−5.00" → cents. Null when it is not money. */
export function cents(raw: string): number | null {
  const s = (raw ?? "").replace(/[−–]/g, "-").trim();
  if (!MONEY.test(s)) return null;
  const neg = s.includes("-");
  const n = Math.round(Number(s.replace(/[^\d.]/g, "")) * 100);
  return neg ? -n : n;
}
const isMoney = (s: string) => cents(s) !== null;
/** A line's money words, joining a lone "-" with the number after it ("- 40.00"). */
function moneyItems(items: PdfItem[]): { x: number; v: number }[] {
  const out: { x: number; v: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const s = items[i].s.trim();
    if (/^[-−+]$/.test(s) && items[i + 1] && isMoney(items[i + 1].s) && items[i + 1].x - items[i].x < 14) {
      const v = cents(items[i + 1].s)!; out.push({ x: items[i].x, v: s === "+" ? Math.abs(v) : -Math.abs(v) }); i++; continue;
    }
    const v = cents(s);
    if (v !== null) out.push({ x: items[i].x, v });
  }
  return out;
}
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const MON: Record<string, number> = { jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12, dic: 12 };
const monthOf = (w: string) => MON[w.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\.$/, "").slice(0, 4)] ?? MON[w.toLowerCase().slice(0, 3)] ?? 0;
/** "September 26, 2026" / "Oct 01, 2026" / "sept 1, 2026" / "1 de oct. de 2026" → ISO. */
function wordDate(s: string): string {
  let m = s.match(/([A-Za-zé]{3,10})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && monthOf(m[1])) return iso(+m[3], monthOf(m[1]), +m[2]);
  m = s.match(/(\d{1,2})\s+(?:de\s+)?([A-Za-zé]{3,10})\.?\s+(?:de\s+)?(\d{4})/);
  if (m && monthOf(m[2])) return iso(+m[3], monthOf(m[2]), +m[1]);
  return "";
}
/** "09/07/26" or "09/07/2026" → ISO. */
function slashDate(s: string): string {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return "";
  const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  return iso(y, +m[1], +m[2]);
}
/** "MM/DD" of a row → ISO, the year taken from the statement period (a December row on a January statement is last year). */
export function rowDate(md: string, period: { from: string; to: string }): string {
  const m = md.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m || !period.to) return "";
  const mo = +m[1], d = +m[2];
  const toY = +period.to.slice(0, 4), toM = +period.to.slice(5, 7);
  const fromY = period.from ? +period.from.slice(0, 4) : toY;
  let y = toY;
  if (mo > toM) y = fromY < toY ? fromY : toY - 1;
  return iso(y, mo, d);
}
const allText = (doc: PdfDoc, upto = 99) => doc.pages.slice(0, upto).map((p) => pageLines(p).map((l) => l.text).join("\n")).join("\n");
const imagePages = (doc: PdfDoc) => doc.pages.map((p, i) => (p.filter((it) => it.s.trim()).length === 0 ? i + 1 : 0)).filter(Boolean);
const sum = (rows: PdfTx[], f: (r: PdfTx) => boolean) => rows.filter(f).reduce((s, r) => s + r.amount, 0);
/** The money on the first line whose text starts with `label` (or matches it). */
function labelled(lines: Line[], label: RegExp, minX = 0): number | null {
  for (const l of lines) if (label.test(l.text)) { const m = moneyItems(l.items).filter((x) => x.x >= minX); if (m.length) return m[m.length - 1].v; }
  return null;
}

/* ------------------------------------------------------------------ detection */

export function detectPdf(doc: PdfDoc): PdfStatement["issuer"] | null {
  const t = allText(doc, 3);
  if (/PayPal Savings Statement|Estado de cuenta de (PayPal )?Ahorros|PAYPAL SAVINGS ACCOUNT/i.test(t)) return "paypal-savings";
  if (/ESTADOS DE CUENTA|CUENTA DE PAYPAL|PAYPAL ACCOUNT STATEMENT|STATEMENTS?\s*\n[\s\S]{0,400}PAYPAL ACCOUNT/i.test(t) && /(FECHA|DATE)[^\n]*(DIVISA|CURRENCY)/i.test(t)) return "paypal-account";
  if (/PayPal Cashback|SYNCB|Synchrony/i.test(t) && /Transaction details|Account summary/i.test(t)) return "paypal-card";
  if (/(JPMorgan Chase|Chase (College|Total|Premier|Secure|Sapphire)? ?Checking)/i.test(t) && /TRANSACTION DETAIL|CHECKING SUMMARY/.test(t)) return "chase-checking";
  if (/CHASE (FREEDOM|SAPPHIRE|SLATE)|chase\.com\/cardhelp/i.test(t) && /ACCOUNT ACTIVITY|ACCOUNT SUMMARY/.test(t)) return "chase-card";
  if (/WELLS FARGO/.test(t) && /Account ending in \d{4}/.test(t) && /Statement Period/.test(t)) return "wf-card";
  return null;
}

export function parsePdfStatement(doc: PdfDoc): PdfStatement | null {
  const who = detectPdf(doc);
  if (!who) return null;
  const st = who === "chase-checking" ? chaseChecking(doc) : who === "chase-card" ? chaseCard(doc) : who === "wf-card" ? wfCard(doc) : who === "paypal-card" ? ppCard(doc) : who === "paypal-savings" ? ppSavings(doc) : ppAccount(doc);
  return { ...st, imagePages: imagePages(doc) };
}

/* ------------------------------------------------------------------ Chase checking */

function chaseChecking(doc: PdfDoc): PdfStatement {
  const lines = doc.pages.map(pageLines);
  const first = lines.flat();
  const pm = allText(doc, 1).match(/([A-Z][a-z]+ \d{1,2}, \d{4}) through ([A-Z][a-z]+ \d{1,2}, \d{4})/);
  const period = { from: pm ? wordDate(pm[1]) : "", to: pm ? wordDate(pm[2]) : "" };
  const tail = (allText(doc, 1).match(/Account Number:\s*\d*(\d{4})/) ?? [])[1] ?? "";
  const rows: PdfTx[] = [];
  let begin: number | null = null, end: number | null = null;
  for (const page of lines) {
    const head = page.findIndex((l) => /^DATE DESCRIPTION AMOUNT BALANCE$/i.test(l.text));
    if (head < 0) continue;
    const amtX = page[head].items.find((i) => /^AMOUNT$/i.test(i.s))!.x;
    const balX = page[head].items.find((i) => /^BALANCE$/i.test(i.s))!.x;
    let cur: (PdfTx & { more: number }) | null = null;
    for (const l of page.slice(head + 1)) {
      if (/^\*end\*|^Page \d|^Total /i.test(l.text)) break;
      if (/^Beginning Balance/i.test(l.text)) { begin = moneyItems(l.items).pop()?.v ?? begin; continue; }
      if (/^Ending Balance/i.test(l.text)) { end = moneyItems(l.items).pop()?.v ?? end; cur = null; break; }
      const d = l.items[0] && /^\d{2}\/\d{2}$/.test(l.items[0].s.trim()) && l.items[0].x < 60 ? l.items[0].s.trim() : "";
      const money = moneyItems(l.items);
      if (d && money.length) {
        // The amount sits under AMOUNT, the running balance under BALANCE.
        const amt = money.filter((m) => Math.abs(m.x - amtX) < Math.abs(m.x - balX)).pop() ?? money[0];
        const firstMoney = Math.min(...money.map((m) => m.x));
        const desc = l.items.slice(1).filter((i) => i.x < firstMoney - 1 && !/^[-−]$/.test(i.s.trim())).map((i) => i.s.trim()).join(" ");
        cur = { date: rowDate(d, period), amount: amt.v, desc, more: 0 };
        rows.push(cur);
      } else if (cur && !d && cur.more < 1 && l.items.length <= 3 && !/^(Ref|Info|Trn|Bref|Recd):/i.test(l.text)) {
        // A short wrapped tail ("LLC", card digits); bank reference blocks are left out.
        cur.desc = `${cur.desc} ${l.text}`.trim(); cur.more++;
      } else if (cur) cur.more = 9;
    }
  }
  for (const r of rows) {
    const t = r.desc.toUpperCase();
    if (/^REVERSAL\b/.test(t)) r.flow = "refund";
    if (/PAYROLL|NOMINA|SALARY|DIR(ECT)? ?DEP/.test(t) && r.amount > 0) r.cat = "payroll";
    delete (r as Partial<PdfTx & { more: number }>).more;
  }
  const want = (re: RegExp) => labelled(first.slice(0, 80), re, 250);
  const dep = want(/^Deposits and Additions/i), atm = want(/^ATM & Debit Card Withdrawals/i), elec = want(/^Electronic Withdrawals/i), other = want(/^(Other Withdrawals|Checks Paid|Fees)/i);
  const b = begin ?? want(/^Beginning Balance/i) ?? 0, e = end ?? want(/^Ending Balance/i) ?? 0;
  const ins = sum(rows, (r) => r.amount > 0), outs = sum(rows, (r) => r.amount < 0);
  const recon: ReconLine[] = [
    { label: "deposits", want: dep ?? 0, got: ins },
    { label: "withdrawals", want: (atm ?? 0) + (elec ?? 0) + (other ?? 0), got: outs },
    { label: "ending", want: e, got: b + ins + outs },
  ];
  return { issuer: "chase-checking", bank: "chase", kind: "checking", tail, period, rows, imagePages: [], recon, begin: b, end: e };
}

/* ------------------------------------------------------------------ Chase credit card */

function chaseCard(doc: PdfDoc): PdfStatement {
  const pages = doc.pages.map(pageLines);
  const flat = pages.flat();
  const t = allText(doc);
  const pm = t.match(/Opening\/Closing Date\s+(\d{2}\/\d{2}\/\d{2,4})\s*-\s*(\d{2}\/\d{2}\/\d{2,4})/);
  const period = { from: pm ? slashDate(pm[1]) : "", to: pm ? slashDate(pm[2]) : "" };
  const tail = (t.match(/Account Number:\s*(?:X{4}\s*){3}(\d{4})/i) ?? [])[1] ?? "";
  const rows: PdfTx[] = [];
  let sect = "";
  for (const page of pages) {
    let on = false;
    for (const l of page) {
      if (/^ACCOUNT ACTIVITY/i.test(l.text)) { on = true; continue; }
      if (!on) continue;
      if (/Totals Year-to-Date|^INTEREST CHARGES$|^Annual Percentage Rate|^Page \d+ of/i.test(l.text)) { on = false; continue; }
      if (/^PAYMENTS AND OTHER CREDITS$/i.test(l.text)) { sect = "credit"; continue; }
      if (/^PURCHASES?$/i.test(l.text)) { sect = "purchase"; continue; }
      if (/^INTEREST CHARGED$/i.test(l.text)) { sect = "interest"; continue; }
      if (/^FEES CHARGED$/i.test(l.text)) { sect = "fee"; continue; }
      if (/^CASH ADVANCES?$|^BALANCE TRANSFERS?$/i.test(l.text)) { sect = "cash"; continue; }
      const d = l.items[0] && /^\d{2}\/\d{2}$/.test(l.items[0].s.trim()) ? l.items[0].s.trim() : "";
      const money = moneyItems(l.items);
      if (!d || !money.length || !sect) continue;
      const v = money[money.length - 1].v;
      const desc = l.items.slice(1).filter((i) => i.x < money[money.length - 1].x - 1).map((i) => i.s.trim()).join(" ");
      const r: PdfTx = { date: rowDate(d, period), amount: -v, desc };
      if (sect === "credit") r.flow = /PAYMENT|AUTOPAY|THANK YOU/i.test(desc) ? "xfer" : "refund";
      else if (sect === "interest") { r.flow = "spend"; r.cat = "cardint"; r.noReward = true; }
      else if (sect === "fee") { r.flow = "spend"; r.cat = "fees"; r.noReward = true; }
      else r.flow = "spend";
      if (/CHASE TRAVEL/i.test(desc)) r.rc = "travel";
      rows.push(r);
    }
  }
  const want = (re: RegExp) => labelled(flat, re);
  const prev = want(/^Previous Balance/i) ?? 0, pc = want(/^Payment,? Credits/i) ?? 0, buys = want(/^Purchases/i) ?? 0, int = want(/^Interest Charged/i) ?? 0, fees = want(/^Fees Charged/i) ?? 0, cash = (want(/^Cash Advances/i) ?? 0) + (want(/^Balance Transfers/i) ?? 0), nb = want(/^New Balance/i) ?? 0;
  const credits = sum(rows, (r) => r.flow === "xfer" || r.flow === "refund");
  const purchases = -sum(rows, (r) => r.flow === "spend" && !r.cat);
  const interest = -sum(rows, (r) => r.cat === "cardint"), feeSum = -sum(rows, (r) => r.cat === "fees");
  // Points: every "earned"/"addl" line of the rewards summary, not the balances.
  let points = 0;
  for (const l of flat) if (/(earned on|addl on)/i.test(l.text)) { const n = l.items[l.items.length - 1].s.replace(/,/g, ""); if (/^\d+$/.test(n)) points += +n; }
  const recon: ReconLine[] = [
    { label: "payments+credits", want: -Math.abs(pc), got: -credits },
    { label: "purchases", want: buys, got: purchases },
    { label: "interest", want: int, got: interest },
    { label: "fees", want: fees, got: feeSum },
    { label: "new balance", want: nb, got: prev - credits + purchases + interest + feeSum + cash },
  ];
  return { issuer: "chase-card", bank: "chase", kind: "card", tail, period, rows, imagePages: [], recon, rewards: { points, text: `${points.toLocaleString("en-US")} pts` }, begin: prev, end: nb };
}

/* ------------------------------------------------------------------ Wells Fargo card */

function wfCard(doc: PdfDoc): PdfStatement {
  const pages = doc.pages.map(pageLines);
  const flat = pages.flat();
  const t = allText(doc);
  const pm = t.match(/Statement Period\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i);
  const period = { from: pm ? slashDate(pm[1]) : "", to: pm ? slashDate(pm[2]) : "" };
  const tail = (t.match(/Account ending in\s+(\d{4})/i) ?? [])[1] ?? "";
  const rows: PdfTx[] = [];
  for (const page of pages) {
    const head = page.findIndex((l) => /Credits/.test(l.text) && /Charges/.test(l.text) && /Description/.test(l.text));
    if (head < 0) continue;
    const credX = page[head].items.find((i) => i.s === "Credits")!.x, chgX = page[head].items.find((i) => i.s === "Charges")!.x;
    const descX = page[head].items.find((i) => i.s === "Description")?.x ?? 240;
    let sect = "";
    for (const l of page.slice(head + 1)) {
      if (/Totals Year-to-Date|^Interest Charge Calculation|^Wells Fargo News/i.test(l.text)) break;
      if (/^Payments$/i.test(l.text)) { sect = "pay"; continue; }
      if (/^Other Credits$/i.test(l.text)) { sect = "credit"; continue; }
      if (/^Purchases, Balance Transfers/i.test(l.text)) { sect = "buy"; continue; }
      if (/^Fees Charged$/i.test(l.text)) { sect = "fee"; continue; }
      if (/^Interest Charged$/i.test(l.text)) { sect = "int"; continue; }
      if (/^TOTAL /i.test(l.text)) continue;
      const dates = l.items.filter((i) => /^\d{2}\/\d{2}$/.test(i.s.trim()));
      const money = moneyItems(l.items);
      if (!dates.length || !money.length || !sect) continue;
      const m = money[money.length - 1];
      const credit = Math.abs(m.x - credX) < Math.abs(m.x - chgX);
      const refItem = l.items.find((i) => i.x > dates[dates.length - 1].x && i.x < descX - 2 && /^[A-Z0-9]{10,}$/.test(i.s.trim()));
      const desc = l.items.filter((i) => i.x >= descX - 2 && i.x < m.x - 1).map((i) => i.s.trim()).join(" ");
      if (m.v === 0) continue;
      const r: PdfTx = { date: rowDate(dates[0].s.trim(), period), amount: credit ? Math.abs(m.v) : -Math.abs(m.v), desc, ...(refItem ? { id: refItem.s.trim() } : {}) };
      if (sect === "pay") r.flow = "xfer";
      else if (sect === "credit") r.flow = "refund";
      else if (sect === "int") { r.flow = "spend"; r.cat = "cardint"; r.noReward = true; }
      else if (sect === "fee") { r.flow = "spend"; r.cat = "fees"; r.noReward = true; }
      else r.flow = credit ? "refund" : "spend";
      rows.push(r);
    }
  }
  const want = (re: RegExp) => labelled(flat, re);
  const prev = want(/^Previous Balance/i) ?? 0, pay = want(/^- Payments/i) ?? 0, oc = want(/^- Other Credits/i) ?? 0, buys = want(/^\+ Purchases, Balance Transfers/i) ?? 0, fees = want(/^\+ Fees Charged/i) ?? 0, int = want(/^\+ Interest Charged/i) ?? 0, cash = want(/^\+ Cash Advances/i) ?? 0, nb = want(/^= New Balance/i) ?? 0;
  const payments = sum(rows, (r) => r.flow === "xfer"), credits = sum(rows, (r) => r.flow === "refund");
  const purchases = -sum(rows, (r) => r.flow === "spend" && !r.cat), interest = -sum(rows, (r) => r.cat === "cardint"), feeSum = -sum(rows, (r) => r.cat === "fees");
  const bal = labelled(flat, /^Rewards balance as of/i);
  const recon: ReconLine[] = [
    { label: "payments", want: pay, got: payments },
    { label: "other credits", want: oc, got: credits },
    { label: "purchases", want: buys, got: purchases },
    { label: "interest", want: int, got: interest },
    { label: "fees", want: fees, got: feeSum },
    { label: "new balance", want: nb, got: prev - payments - credits + purchases + interest + feeSum + cash },
  ];
  return { issuer: "wf-card", bank: "wellsfargo", kind: "card", tail, period, rows, imagePages: [], recon, rewards: bal !== null ? { balanceCents: bal, text: `$${(bal / 100).toFixed(2)}` } : undefined, begin: prev, end: nb };
}

/* ------------------------------------------------------------------ PayPal Cashback Mastercard (Synchrony) */

function ppCard(doc: PdfDoc): PdfStatement {
  const pages = doc.pages.map(pageLines);
  const flat = pages.flat();
  const t = allText(doc);
  const pm = t.match(/billing cycle from\s+(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/i);
  const period = { from: pm ? slashDate(pm[1]) : "", to: pm ? slashDate(pm[2]) : "" };
  const tail = (t.match(/Account number:\s*(?:x{4}\s*){0,3}(\d{4})/i) ?? [])[1] ?? "";
  const rows: PdfTx[] = [];
  for (const page of pages) {
    const head = page.findIndex((l) => /^Date Reference # Description Amount$/i.test(l.text));
    if (head < 0) continue;
    const descX = page[head].items.find((i) => i.s === "Description")?.x ?? 180;
    let sect = "", cur: PdfTx | null = null;
    for (const l of page.slice(head + 1)) {
      if (/^Interest charge calculation|Year to date fees and interest|^When is interest charged/i.test(l.text)) break;
      if (/^Payments\b/i.test(l.text) && !/^\d/.test(l.text)) { sect = "pay"; cur = null; continue; }
      if (/^(Other )?credits\b/i.test(l.text)) { sect = "credit"; cur = null; continue; }
      if (/^Purchases and other debits/i.test(l.text)) { sect = "buy"; cur = null; continue; }
      if (/^Total (fees|interest) charged this period/i.test(l.text)) { sect = "int"; cur = null; continue; }
      const d = l.items[0] && /^\d{2}\/\d{2}$/.test(l.items[0].s.trim()) ? l.items[0].s.trim() : "";
      const money = moneyItems(l.items);
      if (d && money.length) {
        const m = money[money.length - 1];
        const ref = l.items.find((i) => i.x > l.items[0].x + 5 && i.x < descX - 2 && /^[A-Z0-9]{10,}$/.test(i.s.trim()));
        const desc = l.items.filter((i) => i.x >= descX - 2 && i.x < m.x - 1).map((i) => i.s.trim()).join(" ");
        if (m.v === 0) { cur = null; continue; }
        const r: PdfTx = { date: rowDate(d, period), amount: -m.v, desc, ...(ref ? { id: ref.s.trim() } : {}) };
        if (sect === "pay") r.flow = "xfer";
        else if (sect === "credit") r.flow = "refund";
        else if (sect === "int" || /INTEREST CHARGE/i.test(desc)) { r.flow = "spend"; r.cat = /FEE/i.test(desc) ? "fees" : "cardint"; r.noReward = true; }
        else r.flow = m.v < 0 ? "refund" : "spend";
        if (/PAYPAL PURCHASE/i.test(desc)) { r.pp = true; r.rc = "online"; }
        rows.push(r); cur = r;
      } else if (cur && !d && l.items[0]?.x >= descX - 2 && !money.length) {
        // PayPal checkouts print the store on the next line ("TEMU").
        if (cur.pp && !cur.name) cur.name = l.text;
        else if (!cur.pp) cur.desc = `${cur.desc} ${l.text}`.trim();
        cur = null;
      }
    }
  }
  const want = (re: RegExp) => labelled(flat, re, 200);
  const prev = want(/^Previous balance/i) ?? 0, pay = want(/^Payments\b/i) ?? 0, buys = want(/^Purchases & other debits/i) ?? 0, int = want(/^Interest charges/i) ?? 0, fees = want(/^Fees( charged)?\b/i) ?? 0, cr = want(/^(Other )?Credits\b/i) ?? 0, nb = want(/^New balance as of/i) ?? 0;
  const payments = sum(rows, (r) => r.flow === "xfer"), credits = sum(rows, (r) => r.flow === "refund");
  const purchases = -sum(rows, (r) => r.flow === "spend" && !r.cat), interest = -sum(rows, (r) => r.cat === "cardint"), feeSum = -sum(rows, (r) => r.cat === "fees");
  const earned = labelled(flat, /Cashback Earned this Period|Cash Rewards Earned This Period/i);
  const recon: ReconLine[] = [
    { label: "payments", want: -Math.abs(pay), got: -payments },
    { label: "credits", want: -Math.abs(cr), got: -credits },
    { label: "purchases", want: buys, got: purchases },
    { label: "interest", want: int, got: interest },
    { label: "fees", want: fees, got: feeSum },
    { label: "new balance", want: nb, got: prev - payments - credits + purchases + interest + feeSum },
  ];
  return { issuer: "paypal-card", bank: "paypal", kind: "card", tail, period, rows, imagePages: [], recon, rewards: earned !== null ? { cents: earned, text: `$${(earned / 100).toFixed(2)}` } : undefined, begin: prev, end: nb };
}

/* ------------------------------------------------------------------ PayPal Savings */

function ppSavings(doc: PdfDoc): PdfStatement {
  const pages = doc.pages.map(pageLines);
  const flat = pages.flat();
  const t = allText(doc, 1);
  const pm = t.match(/([A-Za-z]{3,9}\.? \d{1,2}, \d{4})\s*-\s*([A-Za-z]{3,9}\.? \d{1,2}, \d{4})/);
  const period = { from: pm ? wordDate(pm[1]) : "", to: pm ? wordDate(pm[2]) : "" };
  const rows: PdfTx[] = [];
  let begin: number | null = null, end: number | null = null;
  for (const page of pages) {
    const head = page.findIndex((l) => /(TYPE|TIPO)\b.*(DESCRIPTION|DESCRIPCI).*(AMOUNT|CANTIDAD|IMPORTE)/i.test(l.text));
    if (head < 0) continue;
    const amtX = page[head].items.find((i) => /^(AMOUNT|CANTIDAD|IMPORTE)$/i.test(i.s))?.x ?? 450;
    for (const l of page.slice(head + 1)) {
      const d = l.items[0] && /^\d{2}\/\d{2}\/\d{4}$/.test(l.items[0].s.trim()) ? l.items[0].s.trim() : "";
      const money = moneyItems(l.items);
      if (!d || !money.length) continue;
      if (/Beginning balance|Saldo inicial/i.test(l.text)) { begin = money[money.length - 1].v; continue; }
      if (/Ending balance|Saldo final/i.test(l.text)) { end = money[money.length - 1].v; continue; }
      const amt = money.reduce((a, b) => (Math.abs(b.x - amtX) < Math.abs(a.x - amtX) ? b : a));
      const words = l.items.filter((i) => !/^\d{2}\/\d{2}\/\d{4}$/.test(i.s.trim()) && cents(i.s) === null).map((i) => i.s.trim());
      const desc = words.join(" ").replace(/^(Credit|Debit|Crédito|Débito)\s+/i, "");
      const r: PdfTx = { date: slashDate(d), amount: amt.v, desc };
      r.flow = /interest|inter[eé]s/i.test(desc) ? "interest" : "xfer";
      if (r.flow === "xfer") r.cat = r.amount > 0 ? "x-pp-save" : "x-save-pp";
      rows.push(r);
    }
  }
  const want = (re: RegExp) => labelled(flat, re);
  const b = begin ?? want(/^\d{2}\/\d{2}\/\d{4} (Beginning|Saldo inicial)/i) ?? 0, e = end ?? want(/^\d{2}\/\d{2}\/\d{4} (Ending|Saldo final)/i) ?? 0;
  const cr = want(/^(Credits to PayPal Savings|Créditos)/i) ?? 0, db = want(/^(Debits from PayPal Savings|Débitos)/i) ?? 0;
  const apy = (t.match(/(?:Annual percentage yield earned|Rendimiento porcentual anual)[^\d]*(\d+(?:\.\d+)?)%/i) ?? [])[1];
  const recon: ReconLine[] = [
    { label: "credits", want: cr, got: sum(rows, (r) => r.amount > 0) },
    { label: "debits", want: db, got: sum(rows, (r) => r.amount < 0) },
    { label: "ending", want: e, got: b + sum(rows, () => true) },
  ];
  const tail = (t.match(/Account Number\s*\n?\s*\d*(\d{4})\b/i) ?? [])[1] ?? "";
  return { issuer: "paypal-savings", bank: "paypal", kind: "savings", tail, period, rows, imagePages: [], recon, begin: b, end: e, ...(apy ? { apyBps: Math.round(+apy * 100) } : {}) };
}

/* ------------------------------------------------------------------ PayPal account statement (two statements in one) */

const PP_FUND = /^(PayPal Mastercard|PayPal Cashback Mastercard|Saldo de PayPal|PayPal balance|PayPal Debit Mastercard|.+\bx-\d{4}\b|SYFSAVINGS\b.*|PayPal Savings\b.*|Ahorros de PayPal\b.*)/i;
function ppAccount(doc: PdfDoc): PdfStatement {
  const pages = doc.pages.map(pageLines);
  // Period from the left column of page 1 ("sept 1, 2026 - sept 30," + "2026" on the next line).
  const left = pageLines(doc.pages[0].filter((i) => i.x < 120)).map((l) => l.text).join(" ");
  const pm = left.match(/([A-Za-zé]{3,10}\.? \d{1,2}, \d{4})\s*-\s*([A-Za-zé]{3,10}\.? \d{1,2}),[^\d]*?(\d{4})/);
  const period = { from: pm ? wordDate(pm[1]) : "", to: pm ? wordDate(`${pm[2]}, ${pm[3]}`) : "" };
  type Raw = PdfTx & { total: number; fee: number; sect: "main" | "bal" };
  const all: Raw[] = [];
  let begin: number | null = null, end: number | null = null, feeSummary: number | null = null;
  for (const page of pages) {
    const text = page.map((l) => l.text).join("\n");
    const sect: Raw["sect"] = /^(CUENTA DE SALDO DE PAYPAL|PAYPAL BALANCE ACCOUNT)$/m.test(text) ? "bal" : "main";
    if (sect === "bal") {
      begin ??= labelled(page, /^(Disponibles al inicio|Available at (the )?(start|beginning)|Beginning available)/i);
      end ??= labelled(page, /^(Disponibles al final|Available at (the )?end|Ending available)/i);
      feeSummary ??= labelled(page, /^(Este período|This period)/i);
    }
    const head = page.findIndex((l) => /^(FECHA|DATE)\b/i.test(l.text) && /(DIVISA|CURRENCY)/i.test(l.text));
    if (head < 0) continue;
    const col = (re: RegExp) => page[head].items.find((i) => re.test(i.s))?.x ?? 0;
    const amtX = col(/^(CANTIDAD|AMOUNT|GROSS)$/i), feeX = col(/^(COMISIONES|FEES?)$/i), totX = col(/^TOTAL/i), curX = col(/^(DIVISA|CURRENCY)$/i);
    const descX = col(/^(DESCRIPCI|DESCRIPTION)/i) || 90;
    let cur: (Raw & { dateTail: string; tailOpen: boolean }) | null = null;
    const flush = () => { if (cur) { const { dateTail, tailOpen: _t, ...r } = cur; all.push({ ...r, date: slashDate(dateTail) }); } cur = null; };
    for (const l of page.slice(head + 1)) {
      if (/^[*º]+\s*(Para cada|For each)|^En caso de errores|^In case of errors|^Página \d|^Page \d/i.test(l.text)) { flush(); break; }
      const f = l.items[0];
      const isDate = f && f.x < descX - 10 && /^\d{2}\/\d{2}\/\d{3,4}$/.test(f.s.trim());
      if (isDate) {
        flush();
        const near = (x: number) => l.items.filter((i) => Math.abs(i.x - x) < 25 && cents(i.s) !== null).map((i) => cents(i.s)!)[0] ?? 0;
        const desc = l.items.filter((i) => i.x >= descX - 4 && i.x < curX - 4).map((i) => i.s.trim()).join(" ");
        cur = { date: "", amount: near(amtX), fee: near(feeX), total: near(totX), desc, sect, dateTail: f.s.trim(), tailOpen: f.s.trim().length < 10 };
        continue;
      }
      if (!cur) continue;
      // The year's last digit wraps onto the next line ("09/02/202" + "6").
      if (cur.tailOpen && f && f.x < descX - 10 && /^\d$/.test(f.s.trim())) { cur.dateTail += f.s.trim(); cur.tailOpen = false; l.items = l.items.slice(1); l.text = l.items.map((i) => i.s.trim()).join(" "); if (!l.items.length) continue; }
      const txt = l.text.trim();
      let m: RegExpMatchArray | null;
      if ((m = txt.match(/^(?:Id\.? de referencia|Reference ID|Ref(?:erence)? ID):?\s*(\S+)/i))) { cur.ref = m[1]; continue; }
      if ((m = txt.match(/^(?:Id\.|ID|Transaction ID):?\s*([A-Z0-9]{10,})/i))) { cur.id = m[1]; continue; }
      if (/^(USD|EUR|MXN|NIO|CAD|GBP)$/.test(txt) || /^[\d,]+\.\d{2}\s+(USD|EUR|MXN|NIO|CAD|GBP)$/.test(txt)) continue;
      if (PP_FUND.test(txt.replace(/\s+-?[\d,]+\.\d{2}(\s+[A-Z]{3})?$/, ""))) { cur.fund ??= txt.replace(/\s+-?[\d,]+\.\d{2}(\s+[A-Z]{3})?$/, "").trim(); continue; }
      if (!cur.fund && !cur.id) cur.desc = `${cur.desc} ${txt.replace(/\s+-$/, "")}`.replace(/\s+,/g, ",").trim();
    }
    flush();
  }
  const rowsAll = all;
  const seen = new Set<string>();
  const rows: PdfTx[] = [];
  const balRows = rowsAll.filter((r) => r.sect === "bal");
  for (const r of rowsAll) {
    if (r.id && seen.has(r.id)) continue; // the balance statement repeats rows of the account statement
    if (r.id) seen.add(r.id);
    const d = (r.desc.match(/^(.*?):\s*(.+)$/) ?? []);
    const what = (d[1] ?? r.desc).trim(), who = (d[2] ?? "").replace(/\s+-\s*$/, "").trim();
    const W = what.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const out: PdfTx = { date: r.date, amount: r.amount, desc: r.desc, ...(r.id ? { id: r.id } : {}), ...(r.ref ? { ref: r.ref } : {}), ...(r.fund ? { fund: r.fund } : {}) };
    // Transfers carry a kind (x-…) so the review can name them in the app's language.
    if (/^reembolso|^refund|^payment refund/.test(W)) { out.flow = "refund"; out.name = who; }
    else if (/deposito general|general (credit|debit) card deposit|card deposit|deposito bancario|bank deposit|add(ed)? funds/.test(W)) { out.flow = "xfer"; out.cat = /banc|bank/.test(W) ? "x-bank-pp" : "x-card-pp"; }
    else if (/^pago general|^general payment/.test(W)) { out.flow = "xfer"; out.cat = "x-ppcard-pay"; }
    else if (/cartera abierta|open wallet|transferencia (a|de) ahorros|transfer (to|from) savings/.test(W)) { out.flow = "xfer"; out.cat = r.amount < 0 ? "x-pp-save" : "x-save-pp"; }
    else if (/retiro iniciado|user initiated withdrawal|withdrawal|transferencia a banco|transfer to bank/.test(W)) { out.flow = "xfer"; out.cat = "x-pp-bank"; }
    else if (/pagos expres|express checkout|pago preaprobado|pre-?approved payment|transaccion general de paypal debit|paypal debit card|pago de compra|payment sent|pago enviado|mobile payment|website payment|pago en sitio web/.test(W)) { out.flow = "spend"; out.name = who.replace(/^Mastercard:\s*/i, ""); }
    else out.flow = r.amount < 0 ? "spend" : "income";
    if (/Mastercard:\s*/i.test(r.desc) && !out.name) out.name = who;
    if (out.name) out.name = out.name.replace(/^Mastercard:\s*/i, "");
    if (/^PayPal (Cashback )?Mastercard$/i.test(r.fund ?? "")) { out.pp = true; out.fundedByCard = true; }
    rows.push(out);
    // A withdrawal fee is money spent; it gets its own line.
    if (r.fee) rows.push({ date: r.date, amount: r.fee, desc: "PayPal fee", name: "PayPal", ...(r.id ? { id: `${r.id}-fee` } : {}), flow: "spend", cat: "fees", noReward: true });
  }
  // A purchase paid by a card shows a "card deposit" pointing at it (Id. de referencia).
  for (const dep of rows.filter((x) => x.flow === "xfer" && x.ref)) {
    const buy = rows.find((x) => x.id === dep.ref && x.flow === "spend");
    if (buy) { buy.fundedByCard = true; buy.pp = true; }
  }
  const balSum = balRows.filter((r, i) => !r.id || balRows.findIndex((o) => o.id === r.id) === i).reduce((s, r) => s + r.total, 0);
  const feeSum = rowsAll.filter((r, i) => !r.id || rowsAll.findIndex((o) => o.id === r.id) === i).reduce((s, r) => s + r.fee, 0);
  const recon: ReconLine[] = [];
  if (begin !== null && end !== null) recon.push({ label: "balance ending", want: end, got: begin + balSum, soft: true });
  if (feeSummary !== null) recon.push({ label: "fees", want: feeSummary, got: feeSum });
  return { issuer: "paypal-account", bank: "paypal", kind: "paypal", tail: "", period, rows, imagePages: [], recon, begin: begin ?? undefined, end: end ?? undefined };
}
