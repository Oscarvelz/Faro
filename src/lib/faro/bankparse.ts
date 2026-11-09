/**
 * Bank import, the heavy half (Nov 2026): reads statement files on the device (nothing is uploaded), finds duplicates,
 * transfers and PayPal↔card pairs, and turns the result into normal ledger lines in one commit.
 * Loaded only when the import sheet opens (with papaparse).
 * Formats: OFX/QFX (SGML and XML), QIF, CSV (Chase card, Chase checking, PayPal, or any bank with column detection).
 */
import Papa from "papaparse";
import { accounts, bonusFor, CASH_SOURCE, ensureAccounts, findRule, guessClass, importBook, learnRule, lineReward, merchantKey, merchantLabel, splitTarget, suggestTarget, targets, type Acct, type LineReward, type Target } from "./bankbook.ts";
import type { AcctKind, ColumnMap, Currency, ImportBook, LedgerState, Line, RewardClass, Structure, Sub } from "./types.ts";
import type { PdfStatement } from "./pdfstmt.ts";

export type RawTx = {
  date: string; amount: number; desc: string; memo?: string; id?: string; type?: string; category?: string; balance?: number; ref?: string; status?: string; currency?: string; name?: string; fundedByCard?: boolean;
  /** Set by PDF parsers, which know the statement's sections: the row's flow, "went through PayPal", reward class, kind of spending. */
  flow?: Flow; pp?: boolean; fund?: string; rc?: RewardClass; cat?: string; noReward?: boolean;
};
export type Bank = "chase" | "wellsfargo" | "statefarm" | "paypal" | "other";
export type ParsedFile = {
  name: string;
  format: "ofx" | "qif" | "csv" | "pdf";
  bank: Bank;
  kind?: AcctKind;
  tail?: string;
  /** Header signature: remembers the column map and the account chosen for files like this one. */
  sig: string;
  rows: RawTx[];
  csv?: { headers: string[]; data: string[][]; map: ColumnMap; auto: boolean };
  /** A monthly statement PDF: its period, pages without text, the check against its own summary, its rewards line. */
  pdf?: Pick<PdfStatement, "issuer" | "period" | "imagePages" | "recon" | "rewards" | "begin" | "end" | "apyBps">;
  error?: string;
};

/** A parsed statement PDF as a file of rows (pdfstmt.ts reads the PDF; this only reshapes it). */
export function fromPdf(name: string, st: PdfStatement): ParsedFile {
  const rows: RawTx[] = st.rows.map((r) => ({ date: r.date, amount: r.amount, desc: r.desc, ...(r.name ? { name: r.name } : {}), ...(r.id ? { id: r.id } : {}), ...(r.ref ? { ref: r.ref } : {}),
    ...(r.flow ? { flow: r.flow } : {}), ...(r.pp ? { pp: true } : {}), ...(r.fund ? { fund: r.fund } : {}), ...(r.fundedByCard ? { fundedByCard: true } : {}), ...(r.rc ? { rc: r.rc } : {}), ...(r.cat ? { cat: r.cat } : {}), ...(r.noReward ? { noReward: true } : {}) }));
  const { issuer, period, imagePages, recon, rewards, begin, end, apyBps } = st;
  return { name, format: "pdf", bank: st.bank, kind: st.kind, tail: st.tail, sig: `pdf:${issuer}:${st.tail}`, rows, pdf: { issuer, period, imagePages, recon, rewards, begin, end, apyBps } };
}

/* ------------------------------------------------------------------ small readers */

const ES_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n: number) => String(n).padStart(2, "0");
function ymd(y: number, m: number, d: number): string {
  if (y < 100) y += 2000;
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100)) return "";
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "11/03/2026", "03/11/2026" (dmy), "2026-11-03", "20261103120000[-5:EST]", "11/ 3'26", "3 nov 2026", "Nov 3, 2026". */
export function parseDate(raw: string, dmy = false): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";
  let m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.'’]\s*(\d{2,4})/);
  if (m) return dmy ? ymd(+m[3], +m[2], +m[1]) : ymd(+m[3], +m[1], +m[2]);
  const mon = (w: string) => { const k = w.slice(0, 3).normalize("NFD").replace(/[\u0300-\u036f]/g, ""); const i = ES_MONTHS.indexOf(k); return i >= 0 ? i + 1 : EN_MONTHS.indexOf(k) + 1; };
  m = s.match(/^(\d{1,2})[\s-]*(?:de\s+)?([a-zé]{3,})\.?[\s-]*(?:de\s+)?(\d{2,4})/);
  if (m && mon(m[2])) return ymd(+m[3], mon(m[2]), +m[1]);
  m = s.match(/^([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && mon(m[1])) return ymd(+m[3], mon(m[1]), +m[2]);
  return "";
}

/** Money in cents: "-1,234.56", "1.234,56", "(12.50)", "12,50-", "US$ 5", "$-3.10". Null when it is not a number. */
export function parseMoney(raw: string): number | null {
  let s = String(raw ?? "").trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/-\s*$/.test(s)) { neg = true; s = s.replace(/-\s*$/, ""); }
  s = s.replace(/(US\$|USD|C\$|NIO|\$|€|\s|\u00a0)/gi, "");
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;
  const lastDot = s.lastIndexOf("."), lastComma = s.lastIndexOf(",");
  let whole = s, frac = "";
  if (lastDot >= 0 && lastComma >= 0) {
    const at = Math.max(lastDot, lastComma);
    whole = s.slice(0, at); frac = s.slice(at + 1);
  } else if (lastComma >= 0) {
    if (/,\d{1,2}$/.test(s) && (s.match(/,/g) ?? []).length === 1) { whole = s.slice(0, lastComma); frac = s.slice(lastComma + 1); }
  } else if (lastDot >= 0) {
    if (/\.\d{3}$/.test(s) && (s.match(/\./g) ?? []).length > 1) { /* 1.234.567 thousands */ }
    else { whole = s.slice(0, lastDot); frac = s.slice(lastDot + 1); }
  }
  whole = whole.replace(/[.,]/g, "");
  const cents = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(cents)) return null;
  return neg ? -cents : cents;
}

const fold = (s: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ OFX / QFX */

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

export function parseOfx(text: string, name = "file.qfx"): ParsedFile {
  const body = text.slice(Math.max(0, text.search(/<OFX>/i)));
  const org = tag(body, "ORG"), fid = tag(body, "FID"), bid = (text.match(/INTU\.BID[>:]\s*(\d+)/i) ?? [])[1] ?? "";
  const acctType = tag(body, "ACCTTYPE").toUpperCase();
  const card = /<CCSTMTRS>|<CCACCTFROM>/i.test(body) || acctType === "CREDITLINE";
  const acctId = tag(body, "ACCTID");
  const who = `${org} ${fid} ${bid} ${name}`.toLowerCase();
  const bank: Bank = /chase|\bb1\b|10898/.test(who) ? "chase" : /wells ?fargo|wellsfargo|\bwf\b/.test(who) ? "wellsfargo" : /state ?farm|statefarm/.test(who) ? "statefarm" : /paypal/.test(who) ? "paypal" : "other";
  const rows: RawTx[] = [];
  for (const m of body.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi)) {
    const b = m[1];
    const amount = parseMoney(tag(b, "TRNAMT"));
    const date = parseDate(tag(b, "DTPOSTED") || tag(b, "DTUSER"));
    if (amount === null || !date) continue;
    const nm = tag(b, "NAME"), memo = tag(b, "MEMO");
    rows.push({ date, amount, desc: nm || memo, memo: nm ? memo : "", id: tag(b, "FITID") || undefined, type: tag(b, "TRNTYPE").toUpperCase() });
  }
  const kind: AcctKind = bank === "paypal" ? "paypal" : card ? "card" : "checking";
  // The statement's own declared currency (CURDEF), when it is one Faro keeps: the review's default for this file.
  const curdef = tag(body, "CURDEF").toUpperCase();
  if (curdef === "USD" || curdef === "NIO") for (const r of rows) r.currency = curdef;
  return { name, format: "ofx", bank, kind, tail: acctId.slice(-4), sig: `ofx:${bank}:${kind}:${acctId.slice(-4)}`, rows };
}

/* ------------------------------------------------------------------ QIF */

export function parseQif(text: string, name = "file.qif"): ParsedFile {
  const lines = text.split(/\r?\n/);
  const head = (lines.find((l) => /^!Type:/i.test(l)) ?? "").toLowerCase();
  const rows: RawTx[] = [];
  let cur: Record<string, string> = {};
  // US QIF dates are month first; a day over 12 in the first place means the file is day first.
  const dates = lines.filter((l) => l.startsWith("D")).map((l) => l.slice(1));
  const dmy = dates.some((d) => +(d.split(/[/.-]/)[0] ?? 0) > 12);
  const flush = () => {
    const amount = parseMoney(cur.T ?? cur.U ?? "");
    const date = parseDate(cur.D ?? "", dmy);
    if (amount !== null && date) rows.push({ date, amount, desc: cur.P || cur.M || "", memo: cur.P ? cur.M ?? "" : "", category: cur.L, id: cur.N && !/^\d{1,5}$/.test(cur.N) ? cur.N : undefined });
    cur = {};
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l || l.startsWith("!")) continue;
    if (l.startsWith("^")) { flush(); continue; }
    cur[l[0]] = l.slice(1).trim();
  }
  if (Object.keys(cur).length) flush();
  const lname = name.toLowerCase();
  const bank: Bank = /paypal/.test(lname) ? "paypal" : /chase/.test(lname) ? "chase" : /wells ?fargo|wellsfargo/.test(lname) ? "wellsfargo" : /state ?farm|statefarm/.test(lname) ? "statefarm" : "other";
  const kind: AcctKind | undefined = bank === "paypal" ? "paypal" : /ccard/.test(head) ? "card" : /bank/.test(head) ? undefined : undefined;
  return { name, format: "qif", bank, kind, sig: `qif:${bank}:${head.replace(/[^a-z]/g, "")}`, rows };
}

/* ------------------------------------------------------------------ CSV */

const H = {
  date: /^(transaction date|fecha( de)? (operacion|transaccion|movimiento)|date|fecha|posting date|posted date|fecha valor|f\. ?valor|fecha contable)$/,
  datePref: /transaction date|operacion|transaccion|movimiento/,
  desc: /(descrip|concepto|detalle|merchant|payee|^name$|^nombre|comercio|beneficiario|referencia|memo|narrative)/,
  amount: /^(amount|importe|monto|valor|cantidad|amt|net|neto|gross|bruto)( \(.*\))?$/,
  debit: /(debit|debito|cargo|debe|retiro|withdrawal|salida|egreso|money out)/,
  credit: /(credit|credito|abono|haber|deposito|deposit|entrada|ingreso|money in)/,
  skip: /(balance|saldo|disponible|available)/,
};

/** Guess the date, description and amount columns of an unknown bank's CSV (Spanish or English). */
export function guessColumns(headers: string[], data: string[][]): { map: ColumnMap; auto: boolean } {
  const hs = headers.map(fold);
  const sample = data.slice(0, 40);
  const col = (i: number) => sample.map((r) => r[i] ?? "").filter((v) => v.trim());
  const share = (i: number, ok: (v: string) => boolean) => { const v = col(i); return v.length ? v.filter(ok).length / v.length : 0; };
  const pick = (re: RegExp, not?: RegExp) => hs.findIndex((h) => re.test(h) && !(not && not.test(h)));
  let date = hs.findIndex((h) => H.date.test(h) && H.datePref.test(h));
  if (date < 0) date = pick(H.date);
  if (date < 0) date = hs.findIndex((_, i) => share(i, (v) => !!parseDate(v) || !!parseDate(v, true)) > 0.8);
  let amount = pick(H.amount, H.skip);
  let debit = amount < 0 ? pick(H.debit, H.skip) : -1;
  let credit = amount < 0 ? pick(H.credit, H.skip) : -1;
  if (amount < 0 && (debit < 0 || credit < 0)) {
    debit = credit = -1;
    amount = hs.findIndex((h, i) => i !== date && !H.skip.test(h) && share(i, (v) => parseMoney(v) !== null) > 0.9);
  }
  let desc = pick(H.desc);
  if (desc < 0) {
    let best = -1, len = 0;
    hs.forEach((_, i) => { if (i === date || i === amount) return; const avg = col(i).reduce((s, v) => s + (parseMoney(v) === null ? v.length : 0), 0) / Math.max(1, col(i).length); if (avg > len) { len = avg; best = i; } });
    desc = best;
  }
  const dvals = date >= 0 ? col(date) : [];
  const firstBig = dvals.some((v) => { const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-]/); return !!m && +m[1] > 12; });
  const secondBig = dvals.some((v) => { const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-]/); return !!m && +m[2] > 12; });
  const spanish = hs.some((h) => /fecha|concepto|importe|monto|cargo|abono|descripcion/.test(h));
  const dmy = firstBig ? true : secondBig ? false : spanish;
  let invert = false;
  if (amount >= 0 && debit < 0) {
    const vals = col(amount).map(parseMoney).filter((v): v is number => v !== null);
    invert = vals.length > 3 && vals.filter((v) => v > 0).length / vals.length > 0.7 && !hs.some((h) => /tipo|type/.test(h));
  }
  const map: ColumnMap = { date, desc, amount: debit >= 0 ? -1 : amount, debit, credit, invert, dmy };
  const ok = date >= 0 && desc >= 0 && (map.amount >= 0 || (debit >= 0 && credit >= 0));
  const parsedOk = ok && sample.length ? sample.filter((r) => rowFromMap(r, map) !== null).length / sample.length > 0.8 : false;
  return { map, auto: ok && parsedOk };
}

export function rowFromMap(r: string[], map: ColumnMap): RawTx | null {
  const date = parseDate(r[map.date] ?? "", map.dmy);
  if (!date) return null;
  let amount: number | null;
  if (map.amount >= 0) amount = parseMoney(r[map.amount] ?? "");
  else {
    const d = parseMoney(r[map.debit] ?? ""), c = parseMoney(r[map.credit] ?? "");
    amount = d === null && c === null ? null : (c ?? 0) - Math.abs(d ?? 0);
  }
  if (amount === null) return null;
  if (map.invert) amount = -amount;
  return { date, amount, desc: (r[map.desc] ?? "").trim() };
}

function csvRows(text: string): string[][] {
  const res = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { skipEmptyLines: "greedy" });
  return (res.data as string[][]).map((r) => r.map((c) => String(c ?? "").trim()));
}

export function parseCsv(text: string, name = "file.csv", maps: Record<string, ColumnMap> = {}): ParsedFile {
  const all = csvRows(text);
  // Some banks put a few lines of account info first: the header is the first wide row followed by a dated row.
  let hi = 0;
  for (let i = 0; i < Math.min(all.length - 1, 15); i++) {
    const next = all[i + 1] ?? [];
    if (all[i].filter(Boolean).length >= 3 && !all[i].some((c) => parseDate(c)) && next.some((c) => !!parseDate(c) || !!parseDate(c, true))) { hi = i; break; }
  }
  const headers = all[hi] ?? [];
  const data = all.slice(hi + 1).filter((r) => r.some(Boolean));
  const hs = headers.map(fold);
  const has = (...names: string[]) => names.every((n) => hs.includes(n));
  const at = (n: string) => hs.indexOf(n);
  const sig = `csv:${hs.join(",")}`;
  const lname = name.toLowerCase();
  if (has("transaction date", "post date", "description", "amount")) {
    const rows = data.map((r): RawTx | null => {
      const amount = parseMoney(r[at("amount")]); const date = parseDate(r[at("transaction date")]);
      return amount === null || !date ? null : { date, amount, desc: r[at("description")], category: at("category") >= 0 ? r[at("category")] : undefined, type: at("type") >= 0 ? r[at("type")] : undefined, memo: at("memo") >= 0 ? r[at("memo")] : undefined };
    }).filter((x): x is RawTx => !!x);
    return { name, format: "csv", bank: "chase", kind: "card", sig, rows };
  }
  if (has("details", "posting date", "description", "amount")) {
    const rows = data.map((r): RawTx | null => {
      const amount = parseMoney(r[at("amount")]); const date = parseDate(r[at("posting date")]);
      return amount === null || !date ? null : { date, amount, desc: r[at("description")], type: at("type") >= 0 ? r[at("type")] : undefined, balance: parseMoney(r[at("balance")] ?? "") ?? undefined };
    }).filter((x): x is RawTx => !!x);
    return { name, format: "csv", bank: "chase", kind: "checking", sig, rows };
  }
  if (hs.includes("transaction id") && (hs.includes("gross") || hs.includes("net"))) {
    const get = (r: string[], n: string) => (at(n) >= 0 ? r[at(n)] ?? "" : "");
    const dates = data.map((r) => get(r, "date"));
    const dmy = dates.some((v) => +(v.split(/[/.-]/)[0] ?? 0) > 12);
    const rows = data.map((r): RawTx | null => {
      const amount = parseMoney(get(r, "net") || get(r, "gross")); const date = parseDate(get(r, "date"), dmy);
      if (amount === null || !date) return null;
      const nm = get(r, "name") || get(r, "to email address") || get(r, "item title");
      return { date, amount, desc: nm || get(r, "type"), name: nm, id: get(r, "transaction id") || undefined, type: get(r, "type"), status: get(r, "status"), currency: get(r, "currency") || "USD", balance: parseMoney(get(r, "balance")) ?? undefined, ref: get(r, "reference txn id") || undefined };
    }).filter((x): x is RawTx => !!x);
    // A purchase paid with a card shows a matching "General Card Deposit" row pointing at it.
    for (const dep of rows.filter((x) => /card deposit|credit card deposit|debit card deposit/i.test(x.type ?? ""))) {
      const buy = rows.find((x) => x !== dep && x.amount === -dep.amount && ((dep.ref && x.id === dep.ref) || x.date === dep.date));
      if (buy) buy.fundedByCard = true;
    }
    return { name, format: "csv", bank: "paypal", kind: "paypal", sig: "csv:paypal", rows };
  }
  const saved = maps[sig];
  const guess = saved ? { map: saved, auto: true } : guessColumns(headers, data);
  const rows = guess.auto ? data.map((r) => rowFromMap(r, guess.map)).filter((x): x is RawTx => !!x) : [];
  const bank: Bank = /wells ?fargo|wellsfargo/.test(lname) ? "wellsfargo" : /state ?farm|statefarm/.test(lname) ? "statefarm" : /chase/.test(lname) ? "chase" : /paypal/.test(lname) ? "paypal" : "other";
  return { name, format: "csv", bank, sig, rows, csv: { headers, data, map: guess.map, auto: guess.auto } };
}

/** Reads one file by its content (not its extension). */
export function parseFile(name: string, text: string, maps: Record<string, ColumnMap> = {}): ParsedFile {
  try {
    if (/<OFX>|OFXHEADER/i.test(text.slice(0, 4000))) return parseOfx(text, name);
    if (/^\s*!Type:/im.test(text.slice(0, 400))) return parseQif(text, name);
    if (/BEGIN:VCARD/i.test(text.slice(0, 400))) return { name, format: "csv", bank: "other", sig: "vcard", rows: [], error: "vcard" };
    return parseCsv(text, name, maps);
  } catch {
    return { name, format: "csv", bank: "other", sig: `bad:${name}`, rows: [], error: "unreadable" };
  }
}

/** Applies a column map chosen by hand (the user's fix for a CSV Faro could not read by itself). */
export function remap(file: ParsedFile, map: ColumnMap): ParsedFile {
  if (!file.csv) return file;
  const rows = file.csv.data.map((r) => rowFromMap(r, map)).filter((x): x is RawTx => !!x);
  return { ...file, rows, csv: { ...file.csv, map, auto: true } };
}

/* ------------------------------------------------------------------ which account */

/** The account a file most likely belongs to: the one remembered for its signature, otherwise by bank and kind. */
export function pickSource(file: ParsedFile, book: ImportBook, accts: Acct[]): string {
  const known = book.files?.[file.sig];
  if (known && accts.some((a) => a.id === known)) return known;
  const by = (bank: string, kind?: AcctKind) => accts.find((a) => a.bank === bank && (!kind || a.kind === kind))?.id;
  if (file.bank === "paypal") return by("paypal", file.kind ?? "paypal") ?? by("paypal") ?? "";
  if (file.bank === "chase") return by("chase", file.kind ?? (file.rows.some((r) => r.category) ? "card" : "checking")) ?? by("chase") ?? "";
  // The Wells Fargo card used to be the "State Farm" preset: files named either way go to it.
  if (file.bank === "wellsfargo" || file.bank === "statefarm") return by("wellsfargo", "card") ?? by("statefarm", "card") ?? "";
  // Any other issuer the user added (Citi, Amex…): its one account of that bank; otherwise the user picks.
  const same = file.bank && file.bank !== "other" ? accts.filter((a) => a.bank === file.bank) : [];
  return same.length === 1 ? same[0].id : "";
}

/* ------------------------------------------------------------------ review */

export type Flow = "spend" | "refund" | "income" | "interest" | "xfer" | "skip";
export type Row = {
  uid: string;
  file: number;
  date: string;
  month: string;
  raw: string;
  label: string;
  key: string;
  /** Signed cents as the statement says it: negative = money out. */
  amount: number;
  flow: Flow;
  target: string;
  /** "rule" = learned, "seed" = suggested from the bank's category (confirmed by importing), "" = none yet. */
  how: "rule" | "seed" | "";
  rc: RewardClass;
  elig: boolean;
  id: string;
  sourceId: string;
  via: string;
  dup: "" | "exact" | "fuzzy";
  /** For a fuzzy duplicate: the book line it matched, so the review can say WHICH of his lines it is (1.3.153). */
  dupOf?: { concept: string; day: string };
  /** This row is the same purchase as another row or line (PayPal + card): it is counted there. */
  paired: string;
  /** This PayPal row took in the card's copy (keeps the PayPal name). */
  pairs: string;
  include: boolean;
  /** The currency this row's amounts are in: chosen per file in the review (the file's own word, else the book's display currency). */
  currency: Currency;
  reward: LineReward | null;
  balance?: number;
  /** Went through PayPal (pairs with the PayPal side). */
  pp: boolean;
  /** Interest or a fee: no card rewards. */
  noReward: boolean;
  /** The other side of this transfer in another file (a card payment and the card's "payment received"): counted once. */
  xpair: string;
  /** Cancelled by a reversal in the same statement (both rows stay out). */
  voided: boolean;
};

/** A savings statement's ending balance, offered as a pocket in Ahorros (created on import when missing). */
export type PocketOffer = { file: number; sourceId: string; name: string; endCents: number; month: string; date: string; apyBps?: number; subId: string; create: boolean; currency: Currency };
/** `dateless`: rows dropped because their date could not be read — they never reach a month (not even ""). */
export type Review = { rows: Row[]; targets: Target[]; mods: Line[]; fallback: string; pocket?: PocketOffer; dateless: number };

const DAY = 86400000;
const dayGap = (a: string, b: string) => Math.abs(new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / DAY;
const XFER = /(REAL TIME TRANSFER|RTP (CREDIT|DEBIT)|CCPYMT|CC PYMT|CARD PYMT|PAYPAL\s*\*.*VISA DIRECT|PAYMENT TO .*CARD ENDING|AUTOPAY|AUTOMATIC PAYMENT|AUTO PAY|PAYMENT THANK YOU|PAYMENT - THANK|PAYMENT RECEIVED|INTERNET PAYMENT|ONLINE PAYMENT|MOBILE PAYMENT|CHASE CREDIT CRD|CHASE CARD SERV|PAYMENT TO CHASE CARD|STATE ?FARM (BANK|CREDIT|CARD|PMT|PAYMENT|ONLINE)|STATEFARM|PAYPAL\s*(INST XFER|TRANSFER|ECHECK|XFER)|ONLINE TRANSFER|TRANSFER (TO|FROM)|CREDIT CARD PAYMENT|CC PAYMENT|EPAY|ACCT_XFER|LOAN_PMT|PAGO (DE )?TARJETA|TRASPASO|TRANSFERENCIA PROPIA)/;
const PP_XFER = /(card deposit|bank deposit|add funds|withdrawal|transfer to bank|transfer from bank|currency conversion|account hold|authorization|general credit card deposit|bank transfer|move money|reserve)/i;

export function classify(r: RawTx, kind: AcctKind | undefined): Flow {
  if (r.flow) return r.flow;
  const text = `${r.desc} ${r.memo ?? ""} ${r.type ?? ""}`.toUpperCase();
  if (kind === "savings") return /INTEREST|INTERES/.test(text) ? "interest" : "xfer";
  if (kind === "paypal") {
    if (r.status && !/completed|completado|terminado/i.test(r.status)) return "skip";
    if (r.currency && r.currency.toUpperCase() !== "USD") return "skip";
    if (/interest|interes/i.test(r.type ?? "") || /INTEREST/.test(text)) return "interest";
    if (PP_XFER.test(r.type ?? "") || (!r.type && /(TRANSFER|BANK|DEPOSIT|ADD FUNDS|WITHDRAW)/.test(text))) return "xfer";
    if (r.amount > 0 && /refund|reversal|reembolso/i.test(r.type || text)) return "refund";
    return r.amount < 0 ? "spend" : "income";
  }
  if (/LOAN_PMT|ACCT_XFER/.test(r.type?.toUpperCase() ?? "")) return "xfer";
  if (kind === "card") {
    if (/^PAYMENT$/i.test(r.type ?? "") || (r.amount > 0 && XFER.test(text))) return "xfer";
    if (r.amount > 0) return /INTEREST/.test(text) ? "refund" : "refund";
    return "spend";
  }
  if (XFER.test(text)) return "xfer";
  if (r.amount > 0) return /INTEREST|INTERES/.test(text) ? "interest" : "income";
  return "spend";
}

const words = (k: string) => new Set(k.split(" ").filter((w) => w.length > 1));

/**
 * The key the FUZZY duplicate hunt compares (1.3.153). merchantKey's own aliases already turn "AMZN Mktp",
 * "Amazon Mktpl" or "Amazon.com" into "amazon"; this adds only what it leaves behind — a bare "amzn" and
 * "amazon mktp" — and it lives ONLY on this matching path: merchantKey itself feeds the learned merchant
 * rules, and moving it would orphan rules Oscar already taught Faro.
 */
const MATCH_ALIAS: [RegExp, string][] = [
  [/^amzn\b.*/, "amazon"],
  [/^amazon mktp\b.*/, "amazon"],
];
function canonMatch(key: string): string {
  for (const [re, to] of MATCH_ALIAS) if (re.test(key)) return to;
  return key;
}
export function matchKey(raw: string): string {
  return canonMatch(merchantKey(raw));
}
function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return false;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size) >= 0.5;
}
const lineDay = (l: Line) => (l.bookedOn && /^\d{4}-\d{2}-\d{2}/.test(l.bookedOn) ? l.bookedOn.slice(0, 10) : `${l.monthKey}-15`);
/** What a row becomes as a line amount: spending positive, refunds negative, income positive. */
export const lineAmount = (r: Pick<Row, "flow" | "amount">) => (r.flow === "refund" ? -Math.abs(r.amount) : Math.abs(r.amount));
const isIncome = (f: Flow) => f === "income" || f === "interest";
const scheme = (id: string) => id.split(":").slice(0, 2).join(":");

type Namer = { cat: (id: string) => string; sub: (id: string) => string; purchase: (id: string) => string };

/** Names for rows that are not a store (statement PDFs mark them), [es, en]. */
const CAT_LABEL: Record<string, [string, string]> = {
  cardint: ["Intereses de tarjeta", "Card interest"],
  fees: ["Comisión", "Fee"],
  "x-card-pp": ["Tarjeta → PayPal", "Card → PayPal"],
  "x-bank-pp": ["Banco → PayPal", "Bank → PayPal"],
  "x-pp-bank": ["PayPal → Banco", "PayPal → Bank"],
  "x-pp-save": ["PayPal → Ahorros", "PayPal → Savings"],
  "x-save-pp": ["Ahorros → PayPal", "Savings → PayPal"],
  "x-ppcard-pay": ["Pago de PayPal Mastercard", "PayPal Mastercard payment"],
};
/** Which bank a payment's wording names (to pair it with that card's statement). */
export function bankHint(raw: string): string {
  const t = raw.toLowerCase();
  if (/paypal|ppcr|syncb|synchrony/.test(t)) return "paypal";
  if (/wells fargo|wellsfargo|\bwf\b/.test(t)) return "wellsfargo";
  if (/chase/.test(t)) return "chase";
  return "";
}

/** The currency a file's own data declares, when it declares one Faro keeps (OFX CURDEF, a CSV currency column): the majority of its rows. "" when the file says nothing. */
export function detectedCurrency(file: ParsedFile): Currency | "" {
  const tally = new Map<Currency, number>();
  for (const r of file.rows) if (r.currency === "USD" || r.currency === "NIO") tally.set(r.currency, (tally.get(r.currency) ?? 0) + 1);
  let best: Currency | "" = "", n = 0;
  for (const [c, k] of tally) if (k > n) { best = c; n = k; }
  return best;
}

export function buildReview(state: LedgerState, files: ParsedFile[], sources: string[], names: Namer, lang = "es", currencies?: (Currency | "")[]): Review {
  const book = importBook(state);
  const accts = accounts(state);
  const list = targets(state.structure, names);
  const fallback = list.find((t) => /personales|personal/i.test(t.label) && t.sub && /otros|other/i.test(t.sub))?.value ?? list.find((t) => t.value.startsWith("expense-variable"))?.value ?? list[0]?.value ?? "expense-variable||";
  const rows: Row[] = [];
  let n = 0;
  let dateless = 0;
  files.forEach((f, fi) => {
    const src = accts.find((a) => a.id === sources[fi]);
    const kind = src?.kind ?? f.kind;
    // Per-file currency: the review's choice, else what the file itself declares, else the book's display currency — never a silent constant.
    const fileCur: Currency = currencies?.[fi] || detectedCurrency(f) || state.settings.display;
    // Rows with no readable date belong to no month: they are counted and dropped here, never imported into a phantom month.
    const dated = f.rows.filter((r) => r.date);
    dateless += f.rows.length - dated.length;
    for (const r of dated) {
      const flow = classify(r, kind);
      const raw = r.name || r.desc;
      const en = lang === "en";
      // PayPal's own rows have no merchant: name them by what they do; merchants keep PayPal's spelling (eBay, Etsy).
      const named = r.cat ? CAT_LABEL[r.cat]?.[en ? 1 : 0] : undefined;
      const paidCard = !named && flow === "xfer" && kind === "card" && f.format === "pdf" ? (en ? "Payment received" : "Pago recibido") : "";
      const ppName = named ? (r.cat === "fees" && r.name ? `${named} ${r.name}` : named) : paidCard ? paidCard
        : f.format === "pdf" && r.name ? merchantLabel(r.name)
        : f.bank === "paypal" && f.format === "csv"
        ? (r.name ? r.name.replace(/,?\s+(inc\.?|llc|corp\.?|corporation|ltd\.?)$/i, "").trim()
          : /card deposit/i.test(r.type ?? "") ? (en ? "Card → PayPal" : "Tarjeta → PayPal")
          : /bank deposit|add funds|from bank/i.test(r.type ?? "") ? (en ? "Bank → PayPal" : "Banco → PayPal")
          : /withdraw|to bank/i.test(r.type ?? "") ? (en ? "PayPal → Bank" : "PayPal → Banco") : "")
        : "";
      const key = merchantKey(raw);
      const rule = findRule(book.rules, key);
      const guess = r.cat ? { rc: "other" as RewardClass, chase: r.cat } : guessClass(key, r.category);
      let target = "", how: Row["how"] = "";
      if (isIncome(flow)) target = flow === "income" && (r.cat === "payroll" || /\b(payroll|nomina|salary)\b/.test(key)) ? "income-fixed||" : "income-variable||";
      else if (rule) { target = rule.target; how = "rule"; }
      else { const s = suggestTarget(list, guess.chase); if (s) { target = s; how = "seed"; } }
      // PayPal's transaction ids are the same in its CSV and its PDF: one scheme, so either file finds the other's rows.
      const ppId = f.bank === "paypal" && (f.format === "csv" || (f.format === "pdf" && kind === "paypal"));
      const id = r.id ? (ppId ? `pp:${r.id}` : `${f.format === "qif" ? "qif" : f.format === "pdf" ? "pdf" : "ofx"}:${src?.id ?? f.sig}:${r.id}`) : "";
      // A PayPal row funded by the PayPal card is that card's purchase (PayPal keeps the store's name).
      const fundCard = kind === "paypal" && r.pp && /mastercard/i.test(r.fund ?? "") ? accts.find((a) => a.kind === "card" && a.bank === "paypal") : undefined;
      rows.push({
        uid: `r${n++}`, file: fi, date: r.date, month: r.date.slice(0, 7), raw, label: flow === "interest" ? (en ? "Interest" : "Intereses") : ppName || merchantLabel(raw), key, amount: r.amount, flow, target, how,
        rc: (r.rc ?? rule?.rc ?? (kind === "paypal" && (f.format !== "pdf" || r.pp) ? "online" : guess.rc)) as RewardClass, elig: !!rule?.elig, id, sourceId: fundCard?.id ?? src?.id ?? "", via: fundCard && src ? src.id : "", dup: "", paired: "", pairs: "", include: false, currency: fileCur, reward: null, balance: r.balance,
        pp: !!r.pp, noReward: !!r.noReward, xpair: "", voided: false,
      });
    }
    // PayPal funding rows ("General Card Deposit") are transfers; the purchase they paid stays.
    if (f.bank === "paypal" && f.kind === "paypal") for (const [i, r] of dated.entries()) if (r.fundedByCard) { const row = rows[rows.length - dated.length + i]; if (row && !row.via) row.via = "card"; }
  });

  // 1. Exact keys already in the books.
  const have = new Map<string, Line>();
  const all: Line[] = Object.values(state.months).flatMap((b) => b.lines);
  for (const l of all) for (const k of (l.importId ?? "").split("|").filter(Boolean)) have.set(k, l);
  for (const r of rows) if (r.id && have.has(r.id)) r.dup = "exact";

  // 1b. The same import id twice inside ONE file (1.3.163, audit P1): a statement that lists one
  // FITID twice imported both copies — the twin pass at the bottom only compares ACROSS files
  // (o.file < r.file). The second copy is born a duplicate of the first, exactly as if the first
  // were already in the books, with the first copy named as its reason.
  const inFile = new Map<string, Row>();
  for (const r of rows) {
    if (!r.id) continue;
    const k = `${r.file} ${r.id}`;
    const first = inFile.get(k);
    if (first) { if (!r.dup) { r.dup = "exact"; r.dupOf = { concept: first.label, day: first.date }; } }
    else inFile.set(k, r);
  }

  // 2. PayPal ↔ card: the same purchase seen from both sides is counted once, under the PayPal name.
  const mods = new Map<string, Line>();
  const fileKind = (r: Row) => accts.find((a) => a.id === sources[r.file])?.kind ?? files[r.file].kind;
  const buyish = (f: Flow) => f === "spend" || f === "refund";
  const isCardCopy = (r: Row) => fileKind(r) !== "paypal" && (r.pp || /paypal|^pp\b/i.test(r.raw)) && buyish(r.flow);
  const ppBuys = rows.filter((r) => fileKind(r) === "paypal" && buyish(r.flow) && !r.dup);
  for (const card of rows.filter((r) => isCardCopy(r) && !r.dup)) {
    const pp = ppBuys.filter((p) => !p.pairs && p.flow === card.flow && p.amount === card.amount && dayGap(p.date, card.date) <= 4).sort((a, b) => dayGap(a.date, card.date) - dayGap(b.date, card.date))[0];
    if (pp) { card.paired = pp.uid; pp.pairs = card.uid; pp.sourceId = card.sourceId; pp.via = accts.find((a) => a.kind === "paypal")?.id ?? "paypal"; pp.rc = card.rc === "other" ? pp.rc : card.rc; pp.id = [pp.id, card.id].filter(Boolean).join("|"); continue; }
    // Already in the books from an earlier PayPal file.
    const line = all.find((l) => l.active && l.sourceId && accts.find((a) => a.id === l.sourceId)?.kind === "paypal" && !l.via && l.currency === card.currency && l.amountMinor === Math.abs(card.amount) && dayGap(lineDay(l), card.date) <= 4 && !mods.has(l.id));
    if (line) { card.paired = line.id; mods.set(line.id, { ...line, via: line.sourceId, sourceId: card.sourceId, rc: card.rc !== "other" ? card.rc : line.rc, importId: [line.importId, card.id].filter(Boolean).join("|") }); }
  }
  for (const pp of ppBuys.filter((p) => !p.pairs && p.flow === "spend")) {
    // The card's copy is already in the books: keep one line, renamed to the PayPal merchant.
    const line = all.find((l) => l.active && l.sourceId && accts.find((a) => a.id === l.sourceId)?.kind !== "paypal" && /paypal|^pp\s*\*/i.test(`${l.concept} ${l.note}`) && l.currency === pp.currency && l.amountMinor === Math.abs(pp.amount) && dayGap(lineDay(l), pp.date) <= 4 && !mods.has(l.id));
    if (line) { pp.paired = line.id; mods.set(line.id, { ...line, concept: pp.label, via: pp.sourceId, importId: [line.importId, pp.id].filter(Boolean).join("|") }); }
  }
  // A PayPal purchase paid by card with no card file yet keeps PayPal as its account; it pairs when the card file comes.

  // 2b. One transfer seen from both accounts (checking → card payment, PayPal → bank, balance ↔ savings): counted once.
  const xfers = rows.filter((r) => r.flow === "xfer");
  for (const a of xfers) {
    if (a.xpair) continue;
    // A card's "payment received" pairs only with a payment that names that card's bank.
    const fits = (card: Row, other: Row) => fileKind(card) !== "card" || bankHint(other.raw) === (accts.find((x) => x.id === sources[card.file])?.bank ?? files[card.file].bank);
    const b = xfers.filter((o) => o !== a && !o.xpair && o.file !== a.file && o.amount === -a.amount && dayGap(o.date, a.date) <= 5 && fits(a, o) && fits(o, a)).sort((x, y) => dayGap(x.date, a.date) - dayGap(y.date, a.date))[0];
    if (b) { a.xpair = b.uid; b.xpair = a.uid; }
  }
  // 2c. A reversal cancels the charge it names (same statement, same amount, within 10 days): neither is spending.
  for (const rev of rows.filter((r) => /^reversal\b|^reverso\b/i.test(r.raw) && r.amount > 0)) {
    const orig = rows.find((o) => o.file === rev.file && !o.voided && o.amount === -rev.amount && o.date <= rev.date && dayGap(o.date, rev.date) <= 10 && similar(o.key, merchantKey(rev.raw.replace(/^(reversal|reverso):?\s*/i, ""))));
    if (orig) { orig.voided = rev.voided = true; orig.flow = rev.flow = "skip"; }
  }

  // 3. Fuzzy duplicates: same amount and ±4 days — against the books, then across files of this batch.
  // Against the books, the ACCOUNT is a first-class witness (1.3.153): when the book line and the row both
  // name their account, same account + amount + currency + side is the same money whatever the names say,
  // and a different account is never the same purchase. When either side names none, the name decides,
  // exactly as before. Cash lines never match (cash leaves no statement), an inactive line cannot claim a
  // match through its account, and a line born from the same statement feed is only ever an exact match.
  const used = new Set<string>();
  for (const r of rows) {
    if (r.dup || r.paired || r.flow === "skip") continue;
    const amt = lineAmount(r);
    const sch = r.id ? scheme(r.id) : "";
    const rowAcct = sources[r.file] ?? "";
    const rk = canonMatch(r.key);
    const hit = all.find((l) => {
      if (used.has(l.id) || l.sourceId === CASH_SOURCE) return false;
      if (!(l.currency === r.currency && l.amountMinor === amt && (l.kind.startsWith("income") === isIncome(r.flow)) && dayGap(lineDay(l), r.date) <= 4)) return false;
      if (sch && (l.importId ?? "").split("|").some((k) => scheme(k) === sch)) return false;
      const lineAcct = l.sourceId ?? "";
      if (lineAcct && rowAcct) return lineAcct === rowAcct && l.active;
      // 1.3.163 (audit P2): the name fallback obeys the same law as the account path — an
      // inactive line never claims an incoming row, on ANY path.
      return l.active && (similar(matchKey(l.concept), rk) || l.concept === r.label);
    });
    if (hit) { r.dup = "fuzzy"; r.dupOf = { concept: hit.concept, day: lineDay(hit) }; used.add(hit.id); }
  }
  const taken = new Set<string>();
  for (const r of rows) {
    if (r.dup || r.paired || r.flow === "skip") continue;
    const twin = rows.find((o) => o !== r && o.file < r.file && !taken.has(o.uid) && !o.paired && o.sourceId === r.sourceId && o.amount === r.amount && dayGap(o.date, r.date) <= 2 && similar(o.key, r.key));
    if (twin) { r.dup = "fuzzy"; taken.add(twin.uid); }
  }

  for (const r of rows) {
    if (!r.target && !isIncome(r.flow)) r.target = fallback;
    // A bonus row of the user's own linked to this category is what the card pays for it.
    const bon = r.flow === "spend" && r.rc !== "online" && r.rc !== "travel" ? bonusFor(book.bonus, r.target) : undefined;
    if (bon) r.rc = bon.id as RewardClass;
    r.include = !r.dup && !r.paired && (r.flow === "spend" || r.flow === "refund" || isIncome(r.flow));
    r.reward = r.flow === "spend" && !r.noReward ? lineReward({ amountMinor: lineAmount(r), sourceId: r.sourceId, via: r.via && r.via !== "card" ? r.via : undefined, rc: r.rc }, accts, r.elig) : null;
  }
  return { rows, targets: list, mods: [...mods.values()], fallback, pocket: pocketOffer(state, files, sources, accts, lang, currencies), dateless };
}

/** The savings account's pocket in Ahorros: the one linked before, else one with the same name, else a new purple one. */
function pocketOffer(state: LedgerState, files: ParsedFile[], sources: string[], accts: Acct[], lang: string, currencies?: (Currency | "")[]): PocketOffer | undefined {
  const fi = files.findIndex((f, i) => (accts.find((a) => a.id === sources[i])?.kind ?? f.kind) === "savings" && typeof f.pdf?.end === "number");
  if (fi < 0) return undefined;
  const f = files[fi], acct = accts.find((a) => a.id === sources[fi]);
  const name = lang === "en" ? `${acct?.bank === "paypal" ? "PayPal" : acct?.name ?? "Savings"} Savings` : `${acct?.bank === "paypal" ? "PayPal" : acct?.name ?? ""} Ahorros`.trim();
  const cat = state.structure.categories.find((c) => c.role === "savings"); // Por rol (contrato, regla 4): el destino existe aunque esté oculto.
  const subs = cat?.subs ?? [];
  const fold2 = (x: string) => fold(x);
  const sub = subs.find((s) => s.id === acct?.pocketId) ?? subs.find((s) => [fold2("PayPal Ahorros"), fold2("PayPal Savings"), fold2(name)].includes(fold2(s.customName || "")));
  const date = f.pdf!.period.to || f.rows.map((r) => r.date).sort().pop() || "";
  const currency: Currency = currencies?.[fi] || detectedCurrency(f) || state.settings.display;
  return { file: fi, sourceId: acct?.id ?? "", name: sub?.customName || name, endCents: f.pdf!.end!, month: date.slice(0, 7), date, apyBps: f.pdf!.apyBps, subId: sub?.id ?? "", create: !sub, currency };
}

/** Recomputes rewards after the user changes a row's account or category. */
export function rewardFor(state: LedgerState, r: Row): LineReward | null {
  return r.flow === "spend" && !r.noReward ? lineReward({ amountMinor: lineAmount(r), sourceId: r.sourceId, via: r.via && r.via !== "card" ? r.via : undefined, rc: r.rc }, accounts(state), r.elig) : null;
}

/**
 * One file's reconciliation (1.3.153), in signed cents (spending positive, refunds negative — lineAmount).
 * Only spend/refund rows count: transfers are the accounts' own plumbing and rows a reversal cancelled
 * (flow "skip") already cancel each other inside the statement. Every counted row lands in exactly one
 * bucket — included → incoming; duplicate or paired and left out → already; anything else → the residual —
 * so Total = Incoming + Already + Diff holds by construction, never by rounding.
 */
export type FileRecon = { rows: number; total: number; incoming: number; already: number; diff: number };
export function fileRecon(rows: Row[], file: number): FileRecon {
  let n = 0, total = 0, incoming = 0, already = 0;
  for (const r of rows) {
    if (r.file !== file || (r.flow !== "spend" && r.flow !== "refund")) continue;
    const amt = lineAmount(r);
    n++; total += amt;
    if (r.include) incoming += amt;
    else if (r.dup || r.paired) already += amt;
  }
  return { rows: n, total, incoming, already, diff: total - incoming - already };
}

/** A reconciliation adjustment the user confirmed in the review: one normal line for a file's standing difference. */
export type ImportAdjustment = { file: number; diffMinor: number; concept: string; note: string };

export type Counts = { fresh: number; dups: number; xfers: number; total: number };
export function counts(rows: Row[]): Counts {
  return {
    fresh: rows.filter((r) => r.include && r.flow !== "xfer").length,
    dups: rows.filter((r) => r.dup || r.paired).length,
    // A transfer seen on both accounts counts once.
    xfers: rows.filter((r) => r.flow === "xfer" && !(r.xpair && rows.findIndex((o) => o.uid === r.xpair) < rows.indexOf(r))).length,
    total: rows.length,
  };
}

/* ------------------------------------------------------------------ commit */

function newLine(r: Row, batch: string): Line {
  const t = r.flow === "xfer" ? splitTarget("expense-variable||") : splitTarget(r.target);
  const id = crypto.randomUUID();
  return {
    id, seriesId: id, monthKey: r.month, kind: t.kind, concept: r.label, amountMinor: lineAmount(r), currency: r.currency,
    active: r.flow !== "xfer", note: r.raw !== r.label ? r.raw.slice(0, 80) : "", categoryId: t.categoryId, subId: t.subId, recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: r.currency, icon: "", history: [], bookedOn: r.date, startedOn: "",
    ...(r.id ? { importId: r.id } : {}), ...(r.sourceId ? { sourceId: r.sourceId } : {}), ...(r.via && r.via !== "card" ? { via: r.via } : {}),
    ...(r.flow === "xfer" ? { xfer: true } : {}), ...((r.flow === "spend" || r.flow === "refund") && !r.noReward ? { rc: r.rc } : {}), batch,
  };
}

export type Undo = {
  batch: string; added: number; before: Line[]; book: ImportBook | undefined; structure?: Structure;
  /**
   * Procedencia por línea (oleada 2 del corazón, 1.3.166 — arreglo P6): la versión EXACTA de
   * cada línea que este lote escribió al importar. El deshacer solo revierte lo que sigue
   * idéntico a lo escrito; una línea que el usuario editó después sobrevive. Los lotes legados
   * (sin `written`) conservan el comportamiento histórico y no ganan ningún poder nuevo.
   */
  written?: Line[];
};

/**
 * One commit for the whole batch: new lines (by their month), PayPal pairs folded into existing lines, learned rules,
 * the account remembered per file, and the PayPal balance on its savings account when the user linked one.
 */
export function applyImport(state: LedgerState, rv: Review, files: ParsedFile[], sources: string[], batch: string, pocketOn = true, adjustments: ImportAdjustment[] = []): { state: LedgerState; undo: Undo } {
  const prevBook = state.imports;
  const prevStructure = state.structure;
  let s = ensureAccounts(state);
  const before: Line[] = [];
  const months = { ...s.months };
  const writtenById = new Map<string, Line>();
  const put = (line: Line) => {
    if (!line.monthKey) return; // Never write a phantom month: a line with no month belongs nowhere.
    writtenById.set(line.id, line); // Provenance (P6): the last version this batch wrote wins.
    const bucket = months[line.monthKey]?.lines ?? [];
    const i = bucket.findIndex((l) => l.id === line.id);
    months[line.monthKey] = { lines: i >= 0 ? bucket.map((l) => (l.id === line.id ? line : l)) : [...bucket, line] };
  };
  const pairedIds = new Set(rv.rows.filter((r) => r.paired).map((r) => r.paired));
  for (const m of rv.mods) if (pairedIds.has(m.id)) {
    const old = Object.values(s.months).flatMap((b) => b.lines).find((l) => l.id === m.id);
    if (old) { before.push(old); put(m); }
  }
  let added = 0;
  for (const r of rv.rows) if (r.include && r.month) { put(newLine(r, batch)); added++; }
  // Reconciliation adjustments confirmed in the review (1.3.153): ONE normal line per file for the standing
  // difference, in this same batch (the import's Undo takes it out with the rest). Sign: a positive
  // difference means the statement shows more spending than the books took in → an expense line on the
  // review's fallback target; a negative one means the books hold more → money back, an income line.
  for (const adj of adjustments) {
    if (!adj.diffMinor) continue;
    const fileRows = rv.rows.filter((r) => r.file === adj.file);
    const lastDay = fileRows.map((r) => r.date).sort().pop();
    if (!lastDay) continue;
    const t = adj.diffMinor > 0 ? splitTarget(rv.fallback) : splitTarget("income-variable||");
    const acctId = sources[adj.file] ?? "";
    const cur = fileRows[0]?.currency ?? state.settings.display;
    const id = crypto.randomUUID();
    put({
      id, seriesId: id, monthKey: lastDay.slice(0, 7), kind: t.kind, concept: adj.concept, amountMinor: Math.abs(adj.diffMinor), currency: cur,
      active: true, note: adj.note, categoryId: t.categoryId, subId: t.subId, recurring: false, storeId: "", providerId: "",
      productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: cur, icon: "", history: [], bookedOn: lastDay, startedOn: "",
      ...(acctId ? { sourceId: acctId } : {}), batch,
    });
    added++;
  }
  let book = importBook(s);
  for (const r of rv.rows) if (r.include && (r.flow === "spend" || r.flow === "refund") && r.key && r.target) book = { ...book, rules: learnRule(book.rules, r.key, r.label, r.target, r.rc) };
  const filesMap = { ...(book.files ?? {}) };
  files.forEach((f, i) => { if (sources[i]) filesMap[f.sig] = sources[i]; });
  book = { ...book, files: filesMap };
  // PayPal balance → the savings account the user linked to PayPal (latest balance in the file).
  const accts = accounts({ ...s, imports: book });
  files.forEach((f, i) => {
    const acct = accts.find((a) => a.id === sources[i]);
    if (!acct?.pocketId || acct.kind !== "paypal") return;
    const last = rv.rows.filter((r) => r.file === i && typeof r.balance === "number").sort((a, b) => a.date.localeCompare(b.date)).pop();
    if (!last || typeof last.balance !== "number") return;
    const cat = s.structure.categories.find((c) => c.subs.some((x) => x.id === acct.pocketId));
    if (!cat) return;
    const key = last.month;
    const bucket = months[key]?.lines ?? [];
    const old = bucket.find((l) => l.subId === acct.pocketId);
    const name = cat.subs.find((x) => x.id === acct.pocketId)?.customName || "PayPal";
    const id = crypto.randomUUID();
    const line: Line = old
      ? { ...old, amountMinor: last.balance, balanceMinor: last.balance, currency: last.currency, balanceCurrency: last.currency, startedOn: old.startedOn || last.date }
      : { id, seriesId: acct.pocketId, monthKey: key, kind: "expense-fixed", concept: name, amountMinor: last.balance, currency: last.currency, active: true, note: "", categoryId: cat.id, subId: acct.pocketId, recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: last.balance, balanceCurrency: last.currency, icon: "vault", history: [], bookedOn: "", startedOn: last.date, batch };
    if (old) before.push(old);
    put(line);
  });
  // A savings statement: its ending balance goes to its pocket in Ahorros (purple, created once when missing), APY in the note.
  let structure = s.structure, touched = false;
  const po = rv.pocket;
  const cat = structure.categories.find((c) => c.role === "savings"); // Por rol (contrato, regla 4).
  if (po && pocketOn && cat && po.month) {
    let subId = po.subId;
    if (!subId || !cat.subs.some((x) => x.id === subId)) {
      subId = `sub-pocket-${po.sourceId || "savings"}`;
      if (!cat.subs.some((x) => x.id === subId)) {
        const sub: Sub = { id: subId, nameKey: "", customName: po.name, icon: "PiggyBank", hidden: false, order: 60 + cat.subs.length };
        structure = { ...structure, categories: structure.categories.map((c) => (c.id === cat.id ? { ...c, subs: [...c.subs, sub] } : c)) };
        touched = true;
      }
    }
    const bucket = months[po.month]?.lines ?? [];
    const old = bucket.find((l) => l.subId === subId && l.categoryId === cat.id);
    const note = po.apyBps ? `APY ${(po.apyBps / 100).toFixed(2)}%` : old?.note ?? "";
    const id = crypto.randomUUID();
    const line: Line = old
      ? { ...old, balanceMinor: po.endCents, balanceCurrency: po.currency, note, startedOn: old.startedOn || po.date }
      : { id, seriesId: id, monthKey: po.month, kind: "expense-fixed", concept: po.name, amountMinor: 0, currency: po.currency, active: true, note, categoryId: cat.id, subId, recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: po.endCents, balanceCurrency: po.currency, icon: "", history: [], bookedOn: po.date, startedOn: po.date, batch };
    if (old) before.push(old);
    put(line);
    if (po.sourceId) book = { ...book, sources: book.sources.map((x) => (x.id === po.sourceId ? { ...x, pocketId: subId, ...(po.apyBps ? { apyBps: po.apyBps } : {}) } : x)) };
  }
  s = { ...s, structure, months, imports: book };
  return { state: s, undo: { batch, added, before, book: prevBook, ...(touched ? { structure: prevStructure } : {}), written: [...writtenById.values()] } };
}

/** Orden canónico para comparar líneas por contenido (claves ordenadas, undefined fuera). */
function canonicalLine(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalLine).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalLine(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

/**
 * Deshacer con procedencia (oleada 2 del corazón, 1.3.166 — arreglo P6): el deshacer solo
 * deshace lo que el lote AÚN posee intacto. Por cada línea del libro:
 * - si el lote registró lo que escribió (`written`) y la línea sigue idéntica → se revierte
 *   como siempre (vuelve la versión previa si el lote la modificó; si el lote la creó, sale);
 * - si el lote la escribió pero la línea YA NO es idéntica → el usuario la editó después: la
 *   línea se conserva tal cual y cuenta en `preserved`;
 * - sin registro de procedencia pero tocada por el lote (en `before`, ya sin la marca del lote)
 *   → no se puede probar que esté intacta: gana la palabra del usuario, se conserva y cuenta;
 * - sin procedencia registrada en absoluto (lote legado, sin `written`) → el algoritmo histórico,
 *   byte a byte, y `preserved` = 0: el legado no gana ningún poder destructivo nuevo.
 */
export function revertImportCounted(state: LedgerState, u: Undo): { state: LedgerState; preserved: number } {
  if (!u.written) return { state: revertImport(state, u), preserved: 0 };
  const back = new Map(u.before.map((l) => [l.id, l]));
  const written = new Map(u.written.map((l) => [l.id, l]));
  let preserved = 0;
  const months: LedgerState["months"] = {};
  for (const [k, b] of Object.entries(state.months)) {
    const lines: Line[] = [];
    for (const l of b.lines) {
      const w = written.get(l.id);
      if (w) {
        if (canonicalLine(l) === canonicalLine(w)) {
          const prev = back.get(l.id);
          if (prev) lines.push(prev); // intacta y modificada por el lote: vuelve la previa
          // intacta y creada por el lote: sale (no se empuja nada)
        } else {
          preserved++; lines.push(l); // editada después del import: la palabra del usuario
        }
        continue;
      }
      if (l.batch === u.batch) continue; // del lote, sin procedencia propia: sale como siempre
      if (back.has(l.id)) { preserved++; lines.push(l); continue; } // tocada y ya sin marca: se conserva
      lines.push(l);
    }
    months[k] = { lines };
  }
  const next: LedgerState = { ...state, months, ...(u.structure ? { structure: { ...state.structure, categories: u.structure.categories } } : {}) };
  if (u.book) next.imports = u.book; else delete next.imports;
  return { state: next, preserved };
}

/** Deshacer: takes the batch's lines out, puts back the lines it changed and the import settings as they were. */
export function revertImport(state: LedgerState, u: Undo): LedgerState {
  if (u.written) return revertImportCounted(state, u).state;
  const months: LedgerState["months"] = {};
  const back = new Map(u.before.map((l) => [l.id, l]));
  for (const [k, b] of Object.entries(state.months)) months[k] = { lines: b.lines.filter((l) => l.batch !== u.batch || back.has(l.id)).map((l) => back.get(l.id) ?? l) };
  const next: LedgerState = { ...state, months, ...(u.structure ? { structure: { ...state.structure, categories: u.structure.categories } } : {}) };
  if (u.book) next.imports = u.book; else delete next.imports;
  return next;
}
