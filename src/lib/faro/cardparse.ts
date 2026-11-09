/**
 * Credit card screenshots (1.3.107): turns the OCR lines of a bank app's credit account screen into card readings.
 * Pure (no DOM, no OCR). EN and ES wording, light or dark screenshots (scanrun inverts dark ones before reading).
 * Reads: card title / issuer / last 4, current (or outstanding) balance, available credit, credit limit, minimum payment,
 * payment due date, statement balance, APR, autopay. 1.3.109: also the rewards balance ("$58.20 cash rewards", "Rewards
 * balance", "Cash back", "Recompensas", "Reembolso en efectivo"): money only when it carries a currency sign; points are a
 * note. Earned-this-year figures, rates ("1.5% en todo"), offers and ads are ignored. A FICO score, when shown, is returned
 * as an info note only (never money). One screenshot can hold several cards (a bank's home screen).
 * Amounts in minor units. Fields the reader had to guess are listed in `unsure` (the preview paints them amber).
 */
import { amountsIn, datesLoose, type OcrLine } from "./receiptparse";
import { issuerIn } from "./cards";
import { normCurrency } from "./money";

export type CardField = "balance" | "avail" | "limit" | "min" | "due" | "statement" | "apr" | "name" | "rewards" | "earned" | "lastPay";
/** 1.3.109: a labelled number the reader found but has no field for ("Otros datos"): shown, kept as a note only if ticked. */
export type CardExtra = { label: string; text: string; ad: boolean };
export type CardRead = {
  title: string;
  issuer: string;
  last4: string;
  balanceMinor: number | null;
  availMinor: number | null;
  limitMinor: number | null;
  minMinor: number | null;
  dueOn: string;
  statementMinor: number | null;
  aprBps: number | null;
  autopay: boolean | null;
  fico: number | null;
  /** 1.3.109: rewards balance (cash back, money) and points (a note, never money). */
  rewardsMinor: number | null;
  rewardsPoints: number | null;
  /** 1.3.109: rewards EARNED (year to date or lifetime): info for Estudio, never money the user has. */
  earnedMinor: number | null;
  earnedSpan: "year" | "life" | null;
  /** Last payment the bank shows (amount, day). */
  lastPayMinor: number | null;
  lastPayOn: string;
  /** Every other labelled number on the screen. */
  extras: CardExtra[];
  /** Issuer the rewards wording points to when the screen shows no card name ("cash rewards" = Wells Fargo): a guess. */
  rwHint: string;
  currency: "USD" | "NIO";
  unsure: CardField[];
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const L_BAL = /\b(current balance|outstanding balance|balance actual|saldo actual|saldo pendiente|saldo de la cuenta|saldo total|total balance|account balance|current bal)\b/;
const L_BAL_LOOSE = /^(balance|saldo|you owe|debes)\b/;
const L_STMT = /\b(statement balance|last statement balance|saldo (del|de) (estado|corte)|saldo al corte|new balance|nuevo saldo)\b/;
const L_AVAIL = /\b(available credit|credit available|credito disponible|disponible para compras|available to spend|available)\b/;
const L_LIMIT = /\b(credit limit|credit line|total credit line|limite de credito|limite|linea de credito)\b/;
const L_MIN = /\b(min(imum)?\.? payment( due)?|minimum due|min due|pago minimo( a pagar)?|pago min\.?)\b/;
const L_DUE = /\b(payment due date|due date|due on|due by|fecha (de|limite de) pago|fecha de vencimiento|fecha limite|pagar antes del|vence el)\b/;
const L_APR = /\b(purchase apr|apr|tasa de interes( anual)?|tasa anual|tasa de compras|interest rate)\b/;
const L_AUTO = /\b(autopay|auto ?pay|pago automatico|pagos automaticos)\b/;
const NOISE = /\b(reward|rewards|cash ?back|recompensa|puntos|points|miles|millas|offer|offers|oferta|ofertas|enjoy|bonus|bono de|earn|gana|explore|year to date|ytd|en el ano|redeem|canjear|credit score|fico|puntaje)\b/;
// 1.3.109: rewards balance labels (EN/ES). Lines about what was earned this year, offers or rates are not a balance.
const L_RWD = /\b(cash rewards?|rewards? balance|rewards? available|available rewards?|rewards?|reward dollars|cash[ -]?back( balance| bonus)?|recompensas?( disponibles?| en efectivo)?|reembolsos?( en efectivo)?|saldo de recompensas|bonificacion(es)?|points|puntos)\b/;
// Earned-total wording (year to date, lifetime): info, not a balance.
const L_EARNED = /\b(year to date|ytd|this year|earned( this year| to date)?|lifetime|all time|total earned|este ano|en el ano|ganad[oa]s?( este ano| en el ano)?|acumulad[oa]s? (este|en el) ano|de por vida|historico)\b/;
const L_CURRENT = /\b(current|available|disponibles?|actual|balance|saldo|to redeem|para canjear|redeemable)\b/;
const L_LASTPAY = /\b(last payment|last payment amount|payment received|ultimo pago|pago recibido)\b/;
const RWD_NOT = /\b(earn up to|gana hasta|offers?|ofertas?|enjoy|explore|learn|terms|protect)\b|%/;
const PTS = /(\d{1,3}(?:[,.\s]\d{3})+|\d{2,7})\s*(points|pts|puntos|ptos)\b/i;
const CARD_WORD = /\b(visa|mastercard|master card|amex|discover|card|tarjeta|credit|credito|signature|world)\b/;
const LAST4 = /(?:\.{2,}|…|•+|\*{2,}|x{2,}|ending in|termina(?:da)? en|terminacion)\s*(\d{4})\b/i;

/** Amount on a line, ignoring numbers that look like a year, a day or a FICO score. */
function amountOn(text: string): { v: number; cur: "USD" | "NIO" } | null {
  const a = amountsIn(text).find((x) => x.signed) ?? amountsIn(text)[0];
  return a ? { v: a.v, cur: normCurrency(a.cur, "USD") } : null;
}

const amountOnly = (text: string) => !!amountOn(text) && fold(text).replace(/[^a-z]/g, "").length <= 3;

type Hit = { v: number; cur: "USD" | "NIO"; near: boolean; at: number };

/** Value for a label: on its own line, else the amount-only line just below, else just above (Wells Fargo puts it above). */
/** Lines whose amount a field already took (per block). */
let taken = new Set<number>();
function valueFor(lines: string[], i: number): Hit | null {
  const own = amountOn(lines[i]);
  if (own) return { ...own, near: false, at: i };
  const next = lines[i + 1];
  if (next !== undefined && amountOnly(next) && !taken.has(i + 1)) return { ...amountOn(next)!, near: true, at: i + 1 };
  const prev = lines[i - 1];
  if (prev !== undefined && amountOnly(prev) && !taken.has(i - 1)) return { ...amountOn(prev)!, near: true, at: i - 1 };
  if (next !== undefined && amountOn(next) && !hasLabel(next) && !isRewards(next) && !taken.has(i + 1)) return { ...amountOn(next)!, near: true, at: i + 1 };
  return null;
}

/** A line that names a rewards balance (not a card title, not an "earned this year"/offer/rate line). */
const isRewards = (t: string) => { const f = fold(t); return (L_RWD.test(f) || (L_EARNED.test(f) && /\b(cash|back|reward|recompens|reembols)/.test(f))) && !RWD_NOT.test(f) && !isTitle(t); };

const hasLabel = (t: string) => {
  const f = fold(t);
  return [L_BAL, L_STMT, L_AVAIL, L_LIMIT, L_MIN, L_DUE, L_APR].some((r) => r.test(f));
};

function cleanTitle(t: string): string {
  return t
    .replace(LAST4, "")
    .replace(/(\.{2,}|…)\s*$/, "")
    .replace(/[®©™]/g, "")
    .replace(/\s+[xX×<>»›]\s*$/, "")
    .replace(/(\.{2,}|…)\s*$/, "")
    .replace(/\bMaster\w{0,5}$/i, "Mastercard")
    .replace(/\bSignat\w{0,3}$/i, "Signature")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isTitle(t: string): boolean {
  const f = fold(t);
  if (hasLabel(t)) return false;
  if (amountOn(t) && !LAST4.test(t)) return false;
  if (issuerIn(t) && t.length >= 6 && !/\b(year to date|offers?|ofertas?|rewards?|recompensas?)\b/.test(f)) return true;
  if (NOISE.test(f)) return false;
  return !!issuerIn(t) || (CARD_WORD.test(f) && (LAST4.test(t) || /\b(visa|mastercard|amex|discover)\b/.test(f)));
}

/**
 * The reader sometimes returns a label column and a value column as separate lines ("Available credit" … "$4,567.90"
 * far right). With boxes, lines that share a row (vertical overlap over half the shorter one) are joined left to right.
 */
export function rowsOf(input: OcrLine[]): string[] {
  const boxed = input.filter((l) => l.box);
  if (boxed.length < input.length || !boxed.length) return input.map((l) => l.text);
  const sorted = [...input].sort((a, b) => (a.box!.y0 + a.box!.y1) - (b.box!.y0 + b.box!.y1));
  const rows: OcrLine[][] = [];
  for (const l of sorted) {
    const b = l.box!;
    const row = rows.find((r) => r.some((x) => {
      const o = Math.min(b.y1, x.box!.y1) - Math.max(b.y0, x.box!.y0);
      return o > 0.5 * Math.min(b.y1 - b.y0, x.box!.y1 - x.box!.y0);
    }));
    if (row) row.push(l); else rows.push([l]);
  }
  return rows.map((r) => r.sort((a, b) => a.box!.x0 - b.box!.x0).map((x) => x.text).join(" "));
}

/** Reads one screenshot. `today` dates a "Nov 25" with no year. Returns one reading per card block that has a balance. */
export function parseCardShot(input: OcrLine[] | string, today: string): CardRead[] {
  const raw = (typeof input === "string" ? input.split(/\r?\n/) : rowsOf(input)).map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
  // A card's title can wrap over two lines ("WELLS FARGO ACTIVE CASH VISA®" / "CARD ...1234"): join a short tail.
  const lines: string[] = [];
  for (const t of raw) {
    const prev = lines[lines.length - 1];
    if (prev && isTitle(prev) && !hasLabel(t) && !amountOn(t.replace(LAST4, "")) && t.length <= 24 && (LAST4.test(t) || /^(card|tarjeta|visa|mastercard)\b/i.test(t))) { lines[lines.length - 1] = `${prev} ${t}`; continue; }
    lines.push(t);
  }
  const starts: number[] = [];
  lines.forEach((t, i) => { if (isTitle(t)) starts.push(i); });
  const blocks: [number, number][] = starts.length ? starts.map((s, k) => [k === 0 ? 0 : s, starts[k + 1] ?? lines.length]) : [[0, lines.length]];
  const reads: CardRead[] = [];
  for (const [a, b] of blocks) {
    const r = readBlock(lines.slice(a, b), today);
    if (r && (r.balanceMinor != null || r.availMinor != null || r.rewardsMinor != null || r.rewardsPoints != null || r.earnedMinor != null)) reads.push(r);
  }
  return reads;
}

function readBlock(lines: string[], today: string): CardRead | null {
  const unsure: CardField[] = [];
  const titleLine = lines.find(isTitle) ?? "";
  const lastLine = lines.find((t) => LAST4.test(t) && !amountOnly(t));
  const out: CardRead = {
    title: cleanTitle(titleLine), issuer: issuerIn(lines.join(" ")), last4: lastLine?.match(LAST4)?.[1] ?? "",
    balanceMinor: null, availMinor: null, limitMinor: null, minMinor: null, dueOn: "", statementMinor: null, aprBps: null,
    autopay: null, fico: null, rewardsMinor: null, rewardsPoints: null, earnedMinor: null, earnedSpan: null, lastPayMinor: null, lastPayOn: "", extras: [], rwHint: "", currency: "USD", unsure,
  };
  taken = new Set<number>();
  const mark = (h: Hit | null) => { if (h) taken.add(h.at); return h; };
  let loose: Hit | null = null;
  const used = new Set<number>();
  lines.forEach((t, i) => {
    const f = fold(t);
    if (/\bfico\b|credit score|puntaje/.test(f)) {
      const near = [t, lines[i + 1] ?? "", lines[i - 1] ?? ""].join(" ").replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ");
      const m = near.match(/(?<![\d$.,])([3-8]\d{2})\d?(?![\d.,])/);
      if (m) { const n = Number(m[1]); if (n >= 300 && n <= 850) out.fico = n; }
      taken.add(i); if (amountOnly(lines[i + 1] ?? "")) taken.add(i + 1);
      return;
    }
    if (isRewards(t) && !hasLabel(t)) { readRewards(lines, i, out, today); return; }
    if (L_LASTPAY.test(f)) { const h = mark(valueFor(lines, i)); if (h && out.lastPayMinor == null) out.lastPayMinor = h.v; const d = datesLoose(`${t} ${lines[i + 1] ?? ""}`, today)[0]; if (d) out.lastPayOn = d; return; }
    if (NOISE.test(f) && !hasLabel(t)) return;
    const take = (re: RegExp) => re.test(f);
    // 1.3.163 (audit P3): ONE line carrying BOTH a balance and a credit-limit label ("Credit limit
    // $5,000.00 Current balance $250.00"). The old chain let the balance branch take the line's
    // FIRST amount — the limit silently became the balance. Now each figure is read after its own
    // label, and BOTH are flagged unsure: the review sheet paints them amber and nothing is taken
    // on faith from a shared line.
    if (take(L_BAL) && take(L_LIMIT)) {
      const after = (re: RegExp): Hit | null => {
        const m = f.match(re);
        if (!m || m.index == null) return null;
        const a = amountOn(f.slice(m.index + m[0].length));
        return a ? { ...a, near: false, at: i } : null;
      };
      const hb = after(L_BAL), hl = after(L_LIMIT);
      if (hb && out.balanceMinor == null) { out.balanceMinor = hb.v; out.currency = hb.cur; }
      if (hl && out.limitMinor == null) out.limitMinor = hl.v;
      if (hb || hl) taken.add(i);
      if (!unsure.includes("balance")) unsure.push("balance");
      if (!unsure.includes("limit")) unsure.push("limit");
      return;
    }
    if (take(L_STMT)) { const h = mark(valueFor(lines, i)); if (h && out.statementMinor == null) out.statementMinor = h.v; return; }
    if (take(L_BAL)) { const h = mark(valueFor(lines, i)); if (h && out.balanceMinor == null) { out.balanceMinor = h.v; out.currency = h.cur; } return; }
    if (take(L_AVAIL) && !take(L_LIMIT)) { const h = mark(valueFor(lines, i)); if (h && out.availMinor == null) out.availMinor = h.v; return; }
    if (take(L_LIMIT)) { const h = mark(valueFor(lines, i)); if (h && out.limitMinor == null) out.limitMinor = h.v; return; }
    if (take(L_MIN)) { const h = mark(valueFor(lines, i)); if (h && out.minMinor == null) out.minMinor = h.v; const d = datesLoose(t, today)[0]; if (d && !out.dueOn) out.dueOn = d; return; }
    if (take(L_DUE)) {
      const d = datesLoose(t, today)[0] ?? datesLoose(lines[i + 1] ?? "", today)[0] ?? "";
      if (d && !out.dueOn) { out.dueOn = d; if (!/\b20\d{2}\b/.test(`${t} ${lines[i + 1] ?? ""}`)) unsure.push("due"); }
      return;
    }
    if (take(L_APR)) {
      const m = `${t} ${lines[i + 1] ?? ""}`.match(/(\d{1,2}(?:[.,]\d{1,3})?)\s?%/);
      if (m && out.aprBps == null) { const v = Math.round(Number(m[1].replace(",", ".")) * 100); if (v > 0 && v < 6000) out.aprBps = v; taken.add(i); }
      return;
    }
    if (take(L_AUTO)) {
      const s = fold(`${t} ${lines[i + 1] ?? ""}`);
      out.autopay = /\b(off|desactivad[oa]|apagado|inactivo|no)\b/.test(s) ? false : /\b(on|activad[oa]|encendido|activo|enrolled|inscrito)\b/.test(s) ? true : null;
      return;
    }
    if (!loose && L_BAL_LOOSE.test(f)) { const h = mark(valueFor(lines, i)); if (h) loose = h; }
    used.add(i);
  });
  if (out.balanceMinor == null && loose) { out.balanceMinor = (loose as Hit).v; taken.add((loose as Hit).at); unsure.push("balance"); }
  // A big amount alone right under the title, with no label (some apps): the balance, flagged.
  if (out.balanceMinor == null) {
    const at = lines.findIndex(isTitle);
    const cand = lines.slice(at + 1, at + 3).find(amountOnly);
    if (cand) { out.balanceMinor = amountOn(cand)!.v; taken.add(lines.indexOf(cand)); unsure.push("balance"); }
  }
  // 1.3.109: never silently drop a recognised number: every other labelled amount becomes an "Otros datos" row.
  lines.forEach((t, i) => {
    if (taken.has(i) || isTitle(t)) return;
    const whole = t.match(/(?:US)?\$\s?(\d{1,3}(?:,\d{3})*|\d+)(?![\d.,]\d)/);
    const a = amountsIn(t).find((x) => x.signed) ?? (whole ? { v: Number(whole[1].replace(/,/g, "")) * 100 } : null);
    if (!a) return;
    let label = t.replace(/[-−]?\s?(US)?\s?(C\$|\$|USD|NIO)\s?[\d.,\s]+|[\d.,]+\s?(USD|NIO)\b/gi, " ").replace(/[<>»›|]/g, " ").replace(/\s{2,}/g, " ").trim();
    if (fold(label).replace(/[^a-z]/g, "").length < 3) {
      const cap = lines[i + 1];
      if (cap && !amountOn(cap) && !hasLabel(cap) && cap.length <= 32) label = cap; else return;
    }
    out.extras.push({ label, text: `$${(a.v / 100).toFixed(2)}`, ad: /\b(offer|oferta|enjoy|bonus|bono|earn|gana|open|abre|new|nueva?)\b/.test(fold(t)) });
  });
  if (!out.title) { out.title = out.issuer ? "" : ""; unsure.push("name"); }
  return out;
}

/** A signed (currency) amount on a line, the first one (a "Current | Year to date" pair gives the current). */
function signedOn(text: string): number | null {
  if (/%/.test(text) && !/[$]/.test(text)) return null;
  const a = amountsIn(text).find((x) => x.signed);
  return a ? a.v : null;
}

/** Which column a caption names: the redeemable balance or the earned total. */
const capKind = (t: string): "cur" | "earned" | null => { const f = fold(t); return L_EARNED.test(f) ? (L_CURRENT.test(f.replace(L_EARNED, "")) ? null : "earned") : L_CURRENT.test(f) ? "cur" : null; };
const spanOf = (t: string): "year" | "life" => (/\b(lifetime|all time|total earned|de por vida|historico)\b/.test(fold(t)) ? "life" : "year");

/**
 * Rewards from a label line ("Cash back", "Rewards", "$58.20 cash rewards", "Recompensas", "Reembolso en efectivo").
 * - A $ amount on the label itself: a balance, unless the line says it was earned (year to date, lifetime) → earned.
 * - Values under the label, side by side ("$12.34 $98.76" / "Current Year to Date") or stacked, each with its caption
 *   under it ("$12.34" / "Current" / "$98.76" / "Year to Date"): Current / available / disponible = balance;
 *   Year to date / YTD / en el año / lifetime = earned (info). No caption: the first value is the balance (flagged).
 * - Points ("12,345 points"): a note, never money.
 */
function readRewards(lines: string[], i: number, out: CardRead, _today: string) {
  const t = lines[i];
  const f = fold(t);
  if (!out.rwHint) out.rwHint = /\bcash rewards\b/.test(f) ? "wellsfargo" : /\bultimate rewards\b/.test(f) ? "chase" : /\bcashback bonus\b/.test(f) ? "discover" : /\bcash ?back\b/.test(f) ? "paypal" : "";
  const own = signedOn(t);
  if (own != null) {
    taken.add(i);
    if (L_EARNED.test(f)) { if (out.earnedMinor == null) { out.earnedMinor = own; out.earnedSpan = spanOf(t); } }
    else if (out.rewardsMinor == null) out.rewardsMinor = own;
    return;
  }
  const vals: { v: number; kind: "cur" | "earned" | null; span: "year" | "life"; at: number }[] = [];
  for (let k = i + 1; k <= Math.min(lines.length - 1, i + 6); k++) {
    const line = lines[k];
    if (taken.has(k)) continue;
    if (hasLabel(line) || (isRewards(line) && signedOn(line) == null && !capKind(line))) break;
    if (!amountOnly(line)) { if (!capKind(line)) break; continue; }
    const amounts = amountsIn(line).filter((x) => x.signed).map((x) => x.v);
    if (!amounts.length) break;
    const cap = lines[k + 1] ?? "";
    const capF = fold(cap);
    // Captions in the order they appear on the caption line ("Current Year to Date" → cur, earned).
    const kinds: { kind: "cur" | "earned"; at: number }[] = [];
    const e = capF.search(L_EARNED), c = capF.replace(L_EARNED, (m) => " ".repeat(m.length)).search(L_CURRENT);
    if (c >= 0) kinds.push({ kind: "cur", at: c });
    if (e >= 0) kinds.push({ kind: "earned", at: e });
    kinds.sort((a, b) => a.at - b.at);
    amounts.forEach((v, j) => vals.push({ v, kind: kinds[j]?.kind ?? null, span: spanOf(cap), at: k }));
    taken.add(k);
    if (kinds.length) k++;
  }
  for (const x of vals) {
    if (x.kind === "earned") { if (out.earnedMinor == null) { out.earnedMinor = x.v; out.earnedSpan = x.span; } }
    else if (x.kind === "cur" || (x.kind == null && out.rewardsMinor == null && vals.indexOf(x) === 0)) {
      if (out.rewardsMinor == null) { out.rewardsMinor = x.v; if (x.kind == null && L_EARNED.test(f) === false && vals.length > 1) out.unsure.push("rewards"); }
    }
  }
  if (L_EARNED.test(f) && out.rewardsMinor != null && vals.length === 1 && vals[0].kind == null) { out.earnedMinor = out.rewardsMinor; out.earnedSpan = spanOf(t); out.rewardsMinor = null; }
  const pts = `${t} ${lines[i + 1] ?? ""}`.match(PTS);
  if (pts && out.rewardsPoints == null) { out.rewardsPoints = Number(pts[1].replace(/[,.\s]/g, "")); taken.add(i + 1); }
}

/** The limit a reading implies: the one it shows, else balance + available. */
export function readLimit(r: Pick<CardRead, "limitMinor" | "balanceMinor" | "availMinor">): number | null {
  if (r.limitMinor != null) return r.limitMinor;
  if (r.balanceMinor != null && r.availMinor != null) return r.balanceMinor + r.availMinor;
  return null;
}

/** How sure a reading belongs to a card: last4 (strongest), issuer, name words. 0 = no match. */
export function matchScore(r: Pick<CardRead, "title" | "issuer" | "last4">, card: { name: string; issuer: string; mark: string; last4: string }): number {
  if (r.last4 && card.last4) return r.last4 === card.last4 ? 100 : 0;
  let s = 0;
  if (r.issuer && (r.issuer === card.mark || fold(card.issuer).includes(fold(r.issuer)) || issuerIn(card.name) === r.issuer)) s += 50;
  const words = (x: string) => new Set(fold(x).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^(card|tarjeta|visa|mastercard|credit|credito|the)$/.test(w)));
  const a = words(r.title), b = words(card.name);
  let common = 0;
  for (const w of a) if (b.has(w)) common++;
  if (common) s += Math.min(40, common * 15);
  if (r.issuer && card.mark && r.issuer !== card.mark && issuerIn(card.name) !== r.issuer) return 0;
  return s;
}

/** Best card for a reading: its id when clearly ahead (score ≥ 50 and 15 over the next), else "" (ask the user). */
export function matchCard<T extends { id: string; name: string; issuer: string; mark: string; last4: string }>(r: Pick<CardRead, "title" | "issuer" | "last4">, cards: T[]): { id: string; sure: boolean; options: string[] } {
  const scored = cards.map((c) => ({ id: c.id, s: matchScore(r, c) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
  if (!scored.length) return { id: "", sure: false, options: [] };
  const [top, next] = scored;
  const sure = top.s >= 50 && (!next || top.s - next.s >= 15);
  return { id: top.id, sure, options: scored.map((x) => x.id) };
}
