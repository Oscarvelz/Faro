/**
 * Bank import, the heavy half (Nov 2026): reads statement files on the device (nothing is uploaded), finds duplicates,
 * transfers and PayPal↔card pairs, and turns the result into normal ledger lines in one commit.
 * Loaded only when the import sheet opens (with papaparse).
 * Formats: OFX/QFX (SGML and XML), QIF, CSV (Chase card, Chase checking, PayPal, or any bank with column detection).
 */
import Papa from "papaparse";
import { accounts, ensureAccounts, findRule, guessClass, importBook, learnRule, lineReward, merchantKey, merchantLabel, splitTarget, suggestTarget, targets, type Acct, type LineReward, type Target } from "./bankbook.ts";
import type { AcctKind, ColumnMap, ImportBook, LedgerState, Line, RewardClass } from "./types.ts";

export type RawTx = { date: string; amount: number; desc: string; memo?: string; id?: string; type?: string; category?: string; balance?: number; ref?: string; status?: string; currency?: string; name?: string; fundedByCard?: boolean };
export type Bank = "chase" | "statefarm" | "paypal" | "other";
export type ParsedFile = {
  name: string;
  format: "ofx" | "qif" | "csv";
  bank: Bank;
  kind?: AcctKind;
  tail?: string;
  /** Header signature: remembers the column map and the account chosen for files like this one. */
  sig: string;
  rows: RawTx[];
  csv?: { headers: string[]; data: string[][]; map: ColumnMap; auto: boolean };
  error?: string;
};

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
  const bank: Bank = /chase|\bb1\b|10898/.test(who) ? "chase" : /state ?farm|statefarm/.test(who) ? "statefarm" : /paypal/.test(who) ? "paypal" : "other";
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
  const bank: Bank = /paypal/.test(lname) ? "paypal" : /chase/.test(lname) ? "chase" : /state ?farm|statefarm/.test(lname) ? "statefarm" : "other";
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
  const bank: Bank = /state ?farm|statefarm/.test(lname) ? "statefarm" : /chase/.test(lname) ? "chase" : /paypal/.test(lname) ? "paypal" : "other";
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
  if (file.bank === "paypal") return by("paypal") ?? "";
  if (file.bank === "chase") return by("chase", file.kind ?? (file.rows.some((r) => r.category) ? "card" : "checking")) ?? by("chase") ?? "";
  if (file.bank === "statefarm") return by("statefarm", "card") ?? by("statefarm") ?? "";
  return "";
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
  /** This row is the same purchase as another row or line (PayPal + card): it is counted there. */
  paired: string;
  /** This PayPal row took in the card's copy (keeps the PayPal name). */
  pairs: string;
  include: boolean;
  reward: LineReward | null;
  balance?: number;
};

export type Review = { rows: Row[]; targets: Target[]; mods: Line[]; fallback: string };

const DAY = 86400000;
const dayGap = (a: string, b: string) => Math.abs(new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / DAY;
const XFER = /(AUTOPAY|AUTOMATIC PAYMENT|AUTO PAY|PAYMENT THANK YOU|PAYMENT - THANK|PAYMENT RECEIVED|INTERNET PAYMENT|ONLINE PAYMENT|MOBILE PAYMENT|CHASE CREDIT CRD|CHASE CARD SERV|PAYMENT TO CHASE CARD|STATE ?FARM (BANK|CREDIT|CARD|PMT|PAYMENT|ONLINE)|STATEFARM|PAYPAL\s*(INST XFER|TRANSFER|ECHECK|XFER)|ONLINE TRANSFER|TRANSFER (TO|FROM)|CREDIT CARD PAYMENT|CC PAYMENT|EPAY|ACCT_XFER|LOAN_PMT|PAGO (DE )?TARJETA|TRASPASO|TRANSFERENCIA PROPIA)/;
const PP_XFER = /(card deposit|bank deposit|add funds|withdrawal|transfer to bank|transfer from bank|currency conversion|account hold|authorization|general credit card deposit|bank transfer|move money|reserve)/i;

export function classify(r: RawTx, kind: AcctKind | undefined): Flow {
  const text = `${r.desc} ${r.memo ?? ""} ${r.type ?? ""}`.toUpperCase();
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

export function buildReview(state: LedgerState, files: ParsedFile[], sources: string[], names: Namer, lang = "es"): Review {
  const book = importBook(state);
  const accts = accounts(state);
  const list = targets(state.structure, names);
  const fallback = list.find((t) => /personales|personal/i.test(t.label) && t.sub && /otros|other/i.test(t.sub))?.value ?? list.find((t) => t.value.startsWith("expense-variable"))?.value ?? list[0]?.value ?? "expense-variable||";
  const rows: Row[] = [];
  let n = 0;
  files.forEach((f, fi) => {
    const src = accts.find((a) => a.id === sources[fi]);
    const kind = src?.kind ?? f.kind;
    for (const r of f.rows) {
      const flow = classify(r, kind);
      const raw = r.name || r.desc;
      const en = lang === "en";
      // PayPal's own rows have no merchant: name them by what they do; merchants keep PayPal's spelling (eBay, Etsy).
      const ppName = f.bank === "paypal" && f.format === "csv"
        ? (r.name ? r.name.replace(/,?\s+(inc\.?|llc|corp\.?|corporation|ltd\.?)$/i, "").trim()
          : /card deposit/i.test(r.type ?? "") ? (en ? "Card → PayPal" : "Tarjeta → PayPal")
          : /bank deposit|add funds|from bank/i.test(r.type ?? "") ? (en ? "Bank → PayPal" : "Banco → PayPal")
          : /withdraw|to bank/i.test(r.type ?? "") ? (en ? "PayPal → Bank" : "PayPal → Banco") : "")
        : "";
      const key = merchantKey(raw);
      const rule = findRule(book.rules, key);
      const guess = guessClass(key, r.category);
      let target = "", how: Row["how"] = "";
      if (isIncome(flow)) target = "income-variable||";
      else if (rule) { target = rule.target; how = "rule"; }
      else { const s = suggestTarget(list, guess.chase); if (s) { target = s; how = "seed"; } }
      const id = r.id ? (f.bank === "paypal" && f.format === "csv" ? `pp:${r.id}` : `${f.format === "qif" ? "qif" : "ofx"}:${src?.id ?? f.sig}:${r.id}`) : "";
      rows.push({
        uid: `r${n++}`, file: fi, date: r.date, month: r.date.slice(0, 7), raw, label: flow === "interest" ? (en ? "Interest" : "Intereses") : ppName || merchantLabel(raw), key, amount: r.amount, flow, target, how,
        rc: (rule?.rc ?? (kind === "paypal" ? "online" : guess.rc)) as RewardClass, elig: !!rule?.elig, id, sourceId: src?.id ?? "", via: "", dup: "", paired: "", pairs: "", include: false, reward: null, balance: r.balance,
      });
    }
    // PayPal funding rows ("General Card Deposit") are transfers; the purchase they paid stays.
    if (f.bank === "paypal") for (const [i, r] of f.rows.entries()) if (r.fundedByCard) { const row = rows[rows.length - f.rows.length + i]; if (row) row.via = "card"; }
  });

  // 1. Exact keys already in the books.
  const have = new Map<string, Line>();
  const all: Line[] = Object.values(state.months).flatMap((b) => b.lines);
  for (const l of all) for (const k of (l.importId ?? "").split("|").filter(Boolean)) have.set(k, l);
  for (const r of rows) if (r.id && have.has(r.id)) r.dup = "exact";

  // 2. PayPal ↔ card: the same purchase seen from both sides is counted once, under the PayPal name.
  const mods = new Map<string, Line>();
  const fileKind = (r: Row) => accts.find((a) => a.id === r.sourceId)?.kind ?? files[r.file].kind;
  const isCardCopy = (r: Row) => fileKind(r) !== "paypal" && /paypal|^pp\b/i.test(r.raw) && r.flow === "spend";
  const ppBuys = rows.filter((r) => fileKind(r) === "paypal" && r.flow === "spend" && !r.dup);
  for (const card of rows.filter((r) => isCardCopy(r) && !r.dup)) {
    const pp = ppBuys.find((p) => !p.pairs && p.amount === card.amount && dayGap(p.date, card.date) <= 4);
    if (pp) { card.paired = pp.uid; pp.pairs = card.uid; pp.sourceId = card.sourceId; pp.via = accts.find((a) => a.kind === "paypal")?.id ?? "paypal"; pp.rc = card.rc === "other" ? pp.rc : card.rc; pp.id = [pp.id, card.id].filter(Boolean).join("|"); continue; }
    // Already in the books from an earlier PayPal file.
    const line = all.find((l) => l.active && l.sourceId && accts.find((a) => a.id === l.sourceId)?.kind === "paypal" && !l.via && l.currency === "USD" && l.amountMinor === Math.abs(card.amount) && dayGap(lineDay(l), card.date) <= 4 && !mods.has(l.id));
    if (line) { card.paired = line.id; mods.set(line.id, { ...line, via: line.sourceId, sourceId: card.sourceId, rc: card.rc !== "other" ? card.rc : line.rc, importId: [line.importId, card.id].filter(Boolean).join("|") }); }
  }
  for (const pp of ppBuys.filter((p) => !p.pairs)) {
    // The card's copy is already in the books: keep one line, renamed to the PayPal merchant.
    const line = all.find((l) => l.active && l.sourceId && accts.find((a) => a.id === l.sourceId)?.kind !== "paypal" && /paypal|^pp\s*\*/i.test(`${l.concept} ${l.note}`) && l.currency === "USD" && l.amountMinor === Math.abs(pp.amount) && dayGap(lineDay(l), pp.date) <= 4 && !mods.has(l.id));
    if (line) { pp.paired = line.id; mods.set(line.id, { ...line, concept: pp.label, via: pp.sourceId, importId: [line.importId, pp.id].filter(Boolean).join("|") }); }
  }
  // A PayPal purchase paid by card with no card file yet keeps PayPal as its account; it pairs when the card file comes.

  // 3. Fuzzy duplicates: same amount, ±2 days, similar name — against the books, then across files of this batch.
  const used = new Set<string>();
  for (const r of rows) {
    if (r.dup || r.paired || r.flow === "skip") continue;
    const amt = lineAmount(r);
    const sch = r.id ? scheme(r.id) : "";
    const hit = all.find((l) => !used.has(l.id) && l.currency === "USD" && l.amountMinor === amt && (l.kind.startsWith("income") === isIncome(r.flow)) && dayGap(lineDay(l), r.date) <= 2
      && (similar(merchantKey(l.concept), r.key) || l.concept === r.label)
      && !(sch && (l.importId ?? "").split("|").some((k) => scheme(k) === sch)));
    if (hit) { r.dup = "fuzzy"; used.add(hit.id); }
  }
  const taken = new Set<string>();
  for (const r of rows) {
    if (r.dup || r.paired || r.flow === "skip") continue;
    const twin = rows.find((o) => o !== r && o.file < r.file && !taken.has(o.uid) && !o.paired && o.sourceId === r.sourceId && o.amount === r.amount && dayGap(o.date, r.date) <= 2 && similar(o.key, r.key));
    if (twin) { r.dup = "fuzzy"; taken.add(twin.uid); }
  }

  for (const r of rows) {
    if (!r.target && !isIncome(r.flow)) r.target = fallback;
    r.include = !r.dup && !r.paired && (r.flow === "spend" || r.flow === "refund" || isIncome(r.flow));
    r.reward = r.flow === "spend" ? lineReward({ amountMinor: lineAmount(r), sourceId: r.sourceId, via: r.via && r.via !== "card" ? r.via : undefined, rc: r.rc }, accts, r.elig) : null;
  }
  return { rows, targets: list, mods: [...mods.values()], fallback };
}

/** Recomputes rewards after the user changes a row's account or category. */
export function rewardFor(state: LedgerState, r: Row): LineReward | null {
  return r.flow === "spend" ? lineReward({ amountMinor: lineAmount(r), sourceId: r.sourceId, via: r.via && r.via !== "card" ? r.via : undefined, rc: r.rc }, accounts(state), r.elig) : null;
}

export type Counts = { fresh: number; dups: number; xfers: number; total: number };
export function counts(rows: Row[]): Counts {
  return {
    fresh: rows.filter((r) => r.include && r.flow !== "xfer").length,
    dups: rows.filter((r) => r.dup || r.paired).length,
    xfers: rows.filter((r) => r.flow === "xfer").length,
    total: rows.length,
  };
}

/* ------------------------------------------------------------------ commit */

function newLine(r: Row, batch: string): Line {
  const t = r.flow === "xfer" ? splitTarget("expense-variable||") : splitTarget(r.target);
  const id = crypto.randomUUID();
  return {
    id, seriesId: id, monthKey: r.month, kind: t.kind, concept: r.label, amountMinor: lineAmount(r), currency: "USD",
    active: r.flow !== "xfer", note: r.raw !== r.label ? r.raw.slice(0, 80) : "", categoryId: t.categoryId, subId: t.subId, recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: r.date, startedOn: "",
    ...(r.id ? { importId: r.id } : {}), ...(r.sourceId ? { sourceId: r.sourceId } : {}), ...(r.via && r.via !== "card" ? { via: r.via } : {}),
    ...(r.flow === "xfer" ? { xfer: true } : {}), ...(r.flow === "spend" || r.flow === "refund" ? { rc: r.rc } : {}), batch,
  };
}

export type Undo = { batch: string; added: number; before: Line[]; book: ImportBook | undefined };

/**
 * One commit for the whole batch: new lines (by their month), PayPal pairs folded into existing lines, learned rules,
 * the account remembered per file, and the PayPal balance on its savings account when the user linked one.
 */
export function applyImport(state: LedgerState, rv: Review, files: ParsedFile[], sources: string[], batch: string): { state: LedgerState; undo: Undo } {
  const prevBook = state.imports;
  let s = ensureAccounts(state);
  const before: Line[] = [];
  const months = { ...s.months };
  const put = (line: Line) => {
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
  for (const r of rv.rows) if (r.include) { put(newLine(r, batch)); added++; }
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
      ? { ...old, amountMinor: last.balance, balanceMinor: last.balance, currency: "USD", balanceCurrency: "USD", startedOn: old.startedOn || last.date }
      : { id, seriesId: acct.pocketId, monthKey: key, kind: "expense-fixed", concept: name, amountMinor: last.balance, currency: "USD", active: true, note: "", categoryId: cat.id, subId: acct.pocketId, recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: last.balance, balanceCurrency: "USD", icon: "vault", history: [], bookedOn: "", startedOn: last.date, batch };
    if (old) before.push(old);
    put(line);
  });
  s = { ...s, months, imports: book };
  return { state: s, undo: { batch, added, before, book: prevBook } };
}

/** Deshacer: takes the batch's lines out, puts back the lines it changed and the import settings as they were. */
export function revertImport(state: LedgerState, u: Undo): LedgerState {
  const months: LedgerState["months"] = {};
  const back = new Map(u.before.map((l) => [l.id, l]));
  for (const [k, b] of Object.entries(state.months)) months[k] = { lines: b.lines.filter((l) => l.batch !== u.batch || back.has(l.id)).map((l) => back.get(l.id) ?? l) };
  const next: LedgerState = { ...state, months };
  if (u.book) next.imports = u.book; else delete next.imports;
  return next;
}
