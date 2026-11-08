/**
 * Escanear (1.3.101): turns the OCR lines of a receipt photo or a subscriptions screenshot into draft ledger lines.
 * Pure: no DOM, no OCR (scanrun.ts reads the image on the device). Tolerant on purpose.
 * - Subscriptions (Google Play list/detail in EN/ES, Apple, confirmation emails): one screenshot → one draft per block.
 * - Receipts (store, restaurant, EN/ES, USD or C$): one draft (merchant, total, date).
 * Amounts in minor units. Fields the parser had to guess are listed in `unsure` (the review paints them amber).
 */
import { amountMinor, datesIn } from "./stmtocr";
import { matchBrand } from "./subs";
import { normCurrency } from "./money";

export type OcrBox = { x0: number; y0: number; x1: number; y1: number };
export type OcrLine = { text: string; box?: OcrBox };
export type ScanField = "concept" | "amount" | "date" | "cadence";
export type ScanBook = "subscription" | "purchase" | "expense-variable";
export type ScanDraft = {
  type: "subscription" | "receipt";
  concept: string;
  /** The plan ("Premium Yearly") or the receipt's extra line; becomes the line's note. */
  note: string;
  amountMinor: number | null;
  currency: "USD" | "NIO";
  /** Subscription: the next charge; receipt: the purchase day. YYYY-MM-DD or "". */
  date: string;
  /** Faro cadence token ("monthly", "yearly", "weekly") or "" for a receipt. */
  cadence: "" | "weekly" | "monthly" | "yearly";
  /** Cuotas library brand id ("googleone") or "". */
  brand: string;
  /** A generic library mark the name hints at ("g-book") when no brand matched: the last resort after the cropped app icon. */
  generic: string;
  /** Suggested book. */
  book: ScanBook;
  /** Compras category guess ("ropa", "tech", "hogar", "otros") or a Variables category id. */
  category: string;
  sub: string;
  unsure: ScanField[];
  /** Union of the source lines' boxes (image px), for the thumbnail and the icon crop. */
  box: OcrBox | null;
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const pad = (n: number) => String(n).padStart(2, "0");

/* ---------- small readers ---------- */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1, feb: 2, february: 2, febrero: 2, mar: 3, march: 3, marzo: 3, apr: 4, april: 4,
  abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, june: 6, junio: 6, jul: 7, july: 7, julio: 7, aug: 8, august: 8, ago: 8,
  agosto: 8, sep: 9, sept: 9, september: 9, set: 9, septiembre: 9, setiembre: 9, oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11, dec: 12, december: 12, dic: 12, diciembre: 12,
};
const MN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");

/** Every date on a line; a day + month with no year is its next occurrence on or after `today`. */
export function datesLoose(line: string, today: string, dmy = false): string[] {
  const full = datesIn(line, dmy);
  if (full.length) return full;
  const s = fold(line);
  const ty = Number(today.slice(0, 4));
  const out: string[] = [];
  const push = (mo: number, d: number) => {
    if (!mo || d < 1 || d > 31) return;
    let v = `${ty}-${pad(mo)}-${pad(d)}`;
    if (v < today) v = `${ty + 1}-${pad(mo)}-${pad(d)}`;
    out.push(v);
  };
  for (const m of s.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${MN})\\b\\.?`, "g"))) push(MONTHS[m[2]], Number(m[1]));
  if (!out.length) for (const m of s.matchAll(new RegExp(`\\b(${MN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*[:.]\\d)`, "g"))) push(MONTHS[m[1]], Number(m[2]));
  return out;
}

const CUR = /(US\$|U\$S|USD|C\$|NIO|\$)\s?(-?\d{1,3}(?:[,.]\d{3})+[.,]\d{2}|-?\d+[.,]\d{2})(?!\d)/g;
const CUR_AFTER = /(?<![\d.,])(\d{1,3}(?:[,.]\d{3})+[.,]\d{2}|\d+[.,]\d{2})\s?(US\$|USD|C\$|NIO|\$|cordobas|córdobas)/gi;
const BARE = /(?<![\d.,/:])(-?\d{1,3}(?:,\d{3})+\.\d{2}|-?\d{1,3}(?:\.\d{3})+,\d{2}|-?\d+[.,]\d{2})(?![\d%])/g;

/** Amounts on a line (minor units) in order; ones written with a currency sign come first. */
export function amountsIn(line: string): { v: number; cur: "USD" | "NIO" | ""; signed: boolean }[] {
  const s = line.replace(/(?<=\d)\s?[,.]\s(?=\d{2}\b)/g, ".");
  const out: { at: number; v: number; cur: "USD" | "NIO" | ""; signed: boolean }[] = [];
  const seen = new Set<number>();
  const curOf = (c: string) => (/c\$|nio|cord|córd/i.test(c) ? "NIO" : "USD") as "USD" | "NIO";
  for (const m of s.matchAll(CUR)) {
    const v = amountMinor(m[2]);
    if (v == null) continue;
    out.push({ at: m.index ?? 0, v, cur: curOf(m[1]), signed: true });
    for (let i = m.index ?? 0; i < (m.index ?? 0) + m[0].length; i++) seen.add(i);
  }
  for (const m of s.matchAll(CUR_AFTER)) {
    if (seen.has(m.index ?? 0)) continue;
    const v = amountMinor(m[1]);
    if (v == null) continue;
    out.push({ at: m.index ?? 0, v, cur: curOf(m[2]), signed: true });
    for (let i = m.index ?? 0; i < (m.index ?? 0) + m[0].length; i++) seen.add(i);
  }
  for (const m of s.matchAll(BARE)) {
    if (seen.has(m.index ?? 0) || seen.has((m.index ?? 0) + 1)) continue;
    const v = amountMinor(m[1]);
    if (v == null) continue;
    out.push({ at: m.index ?? 0, v, cur: "", signed: false });
  }
  return out.sort((a, b) => Number(b.signed) - Number(a.signed) || a.at - b.at).map(({ v, cur, signed }) => ({ v, cur, signed }));
}

/** OCR slips that matter for names: "Al" for "AI" inside a capitalised title, stray icon letters at the end, check marks. */
export function cleanOcr(t: string): string {
  return t
    .replace(/[|]{2,}/g, " ")
    .replace(/(?<=[A-Z][a-z]+ )Al(?= [A-Z(])/g, "AI")
    .replace(/(?<=^|\s)Al(?= (?:Plus|Pro|Premium|Fashion|Assistant|Chat|Plan|Ultra)\b)/g, "AI")
    .replace(/\s+[A-Z@©®&*#]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const titleCase = (s: string) =>
  s.split(/(\s+)/).map((w) => (/^[A-ZÁÉÍÓÚÑ&'.-]{2,}$/.test(w) && !/^(LLC|INC|USA|S\.?A\.?|CO|AT&T|CVS|H&M|IKEA|TJ|BJ'?S)$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w)).join("");

/* ---------- subscriptions ---------- */

const SUB_CUE = /(next payment|next billing|next charge|proximo pago|proximo cobro|proxima factur|renews|renewal|se renueva|renueva el|renovacion|billed|facturad|cobro|\/\s?(mes|month|mo|ano|year|yr|semana|week|wk)\b|per (month|year|week)|al mes|al ano|por mes|por ano|mensual|anual|monthly|yearly|annual|weekly|semanal|subscription|suscripcion)/;
const RENEW_DATE = /(next payment|next billing|next charge|proximo pago|proximo cobro|proxima factur|renews|renewal|se renueva|renueva|renovacion|expires|vence|caduca)/;
const SUB_SCREEN = /(subscriptions|suscripciones|next payment|proximo pago|se renueva|renews on|\/\s?(mes|month|year|ano)\b|subscription confirm|confirmacion de (la )?suscripcion|your subscription|tu suscripcion|manage subscription|administrar suscripcion)/;
const STOP = /^(your plan includes|tu plan incluye|el plan incluye|plan includes|benefits|beneficios|incluye|includes|what'?s included|que incluye|manage|administrar|cancel subscription|cancelar suscripcion|payment method|metodo de pago|update|actualizar)\b/;
const JUNK = /^(subscriptions?|suscripciones?|active|activas?|activa|inactive|expired|vencidas?|google play|play store|app store|apple|settings|ajustes|configuracion|account|cuenta|payments? (and|&) subscriptions|pagos y suscripciones|back|atras|edit|editar|see all|ver todo|\d{1,2}:\d{2}.*|[\W\d_]+|.{0,2})$/;
const CHECK = /^\s*[✓✔√VYvy]{1,2}\s+[A-Z]/;
const LABEL = /^(app|aplicacion|subscription|suscripcion|service|servicio|product|producto|item|articulo)\s*[:：]\s*(.+)$/;

function cadenceOf(text: string): "" | "weekly" | "monthly" | "yearly" {
  const s = fold(text);
  if (/\/\s?(ano|year|yr|anual)\b|yearly|annual|anual|per year|al ano|por ano|\bano\b.*\bplan\b|12 months|12 meses/.test(s)) return "yearly";
  if (/\/\s?(semana|week|wk)\b|weekly|semanal|per week|por semana|a la semana/.test(s)) return "weekly";
  if (/\/\s?(mes|month|mo)\b|monthly|mensual|per month|al mes|por mes|a month|cada mes/.test(s)) return "monthly";
  return "";
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

/** "Notefold - AI Notes Assistant" → "Notefold"; "Readwise Lite: Books Aloud" → "Readwise Lite". */
export function cleanAppName(name: string): string {
  let s = cleanOcr(name).replace(/^[•·*\-–\s]+/, "");
  const cut = s.split(/\s+[-–—|]\s+|:\s+|\s+\(/)[0].trim();
  if (cut.length >= 2) s = cut;
  return s.replace(/[.,;:]+$/, "").trim();
}

function boxOf(lines: OcrLine[]): OcrBox | null {
  const b = lines.map((l) => l.box).filter(Boolean) as OcrBox[];
  if (!b.length) return null;
  return { x0: Math.min(...b.map((x) => x.x0)), y0: Math.min(...b.map((x) => x.y0)), x1: Math.max(...b.map((x) => x.x1)), y1: Math.max(...b.map((x) => x.y1)) };
}

type Anchor = { i: number; amt: number | null; cur: "USD" | "NIO" | ""; date: string; end: number };

function parseSubs(lines: OcrLine[], today: string): ScanDraft[] {
  const t = lines.map((l) => cleanOcr(l.text));
  const f = t.map(fold);
  // Zones after "Your plan includes" (and benefit check lines) are never names.
  const dead = new Array(t.length).fill(false);
  let inStop = false;
  for (let i = 0; i < t.length; i++) {
    if (STOP.test(f[i])) inStop = true;
    const a = amountsIn(t[i]);
    if (inStop && a.length && SUB_CUE.test(f[i])) inStop = false;
    if (inStop || CHECK.test(t[i])) dead[i] = true;
  }
  const anchors: Anchor[] = [];
  for (let i = 0; i < t.length; i++) {
    if (dead[i]) continue;
    const a = amountsIn(t[i]);
    const ds = RENEW_DATE.test(f[i]) || a.length ? datesLoose(t[i], today) : [];
    const cue = SUB_CUE.test(f[i]);
    const amt = a.length && (cue || a[0].signed) ? a[0] : null;
    if (amt && (cue || ds.length)) anchors.push({ i, amt: amt.v, cur: amt.cur, date: ds[0] ?? "", end: i });
    else if (amt && a[0].signed && /\$/.test(t[i]) && t[i].replace(/[^A-Za-z]/g, "").length < 4 && !anchors.length) anchors.push({ i, amt: amt.v, cur: amt.cur, date: "", end: i });
    else if (!amt && ds.length && RENEW_DATE.test(f[i])) anchors.push({ i, amt: null, cur: "", date: ds[0], end: i });
  }
  // "$13.99/mes" then "Se renueva el 12 nov" (or the other way round) are one subscription.
  const merged: Anchor[] = [];
  for (const a of anchors) {
    const prev = merged[merged.length - 1];
    if (prev && a.i - prev.end <= 2 && ((prev.amt != null && !prev.date && a.amt == null && a.date) || (prev.amt == null && prev.date && a.amt != null && !a.date))) {
      merged[merged.length - 1] = { i: prev.i, amt: prev.amt ?? a.amt, cur: prev.cur || a.cur, date: prev.date || a.date, end: a.i };
      continue;
    }
    merged.push(a);
  }
  const out: ScanDraft[] = [];
  let from = 0;
  merged.forEach((a, k) => {
    const block = [] as number[];
    for (let j = from; j <= a.end; j++) if (!dead[j]) block.push(j);
    const nextStart = merged[k + 1]?.i ?? t.length;
    // A date on the line right after the anchor ("Renews Jan 28") belongs to it.
    let date = a.date;
    let end = a.end;
    if (!date && a.end + 1 < nextStart && !dead[a.end + 1]) {
      const d = datesLoose(t[a.end + 1], today);
      if (d.length && !amountsIn(t[a.end + 1]).length) { date = d[0]; end = a.end + 1; }
    }
    from = end + 1;
    // Name: a labelled "App: X" line, else the text before the amount on the anchor, else the first real line of the block.
    let name = "";
    const plan: string[] = [];
    let labelled = false;
    for (const j of block) {
      const m = LABEL.exec(f[j]);
      if (!m) continue;
      const v = t[j].slice(t[j].length - m[2].length).trim();
      if (!name) { name = v; labelled = true; } else plan.push(v);
    }
    const cand = block.filter((j) => j !== a.i && j !== a.end && !JUNK.test(f[j]) && !RENEW_DATE.test(f[j]) && !/^(price|precio|amount|monto|total)\b/.test(f[j]));
    if (!name) {
      const before = t[a.i].split(/(US\$|U\$S|C\$|\$|USD)\s?\d/)[0].replace(/[·•|,:\-–]+\s*$/, "").trim();
      if (before.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 3 && !SUB_CUE.test(fold(before)) && !cand.length) name = before;
      else if (cand.length) name = t[cand[0]];
      else if (before.replace(/[^A-Za-zÀ-ÿ]/g, "").length >= 3 && !RENEW_DATE.test(fold(before))) name = before.replace(SUB_CUE, "").trim();
    }
    if (!labelled) for (const j of cand) if (t[j] !== name && !LABEL.test(f[j])) plan.push(t[j]);
    const concept = cleanAppName(name);
    if (!concept && a.amt == null) return;
    const all = block.map((j) => t[j]).join(" ") + " " + (end !== a.end ? t[end] : "");
    let cadence = cadenceOf(all);
    const unsure: ScanField[] = [];
    if (!cadence) {
      unsure.push("cadence");
      cadence = date && daysBetween(today, date) > 62 ? "yearly" : "monthly";
    }
    if (!concept) unsure.push("concept");
    if (a.amt == null) unsure.push("amount");
    if (!date) unsure.push("date");
    const note = plan.map(cleanOcr).filter((p) => p && fold(p) !== fold(concept)).slice(0, 2).join(" · ");
    const hit = matchBrand(concept) || matchBrand(name) || "";
    const brand = hit.startsWith("g-") ? "" : hit;
    out.push({
      type: "subscription", concept, note, amountMinor: a.amt, currency: normCurrency(a.cur, "USD"), date, cadence, brand, generic: brand ? "" : hit,
      book: "subscription", category: "", sub: "", unsure, box: boxOf([...block, end].map((j) => lines[j])),
    });
  });
  return out;
}

/* ---------- receipts ---------- */

const TOTAL_STRONG = /\b(grand total|total due|amount due|balance due|total a pagar|importe total|total general|total factura|total venta|total sale|order total|monto total|total pagado|total paid|neto a pagar)\b/;
const TOTAL = /\b(total|importe|amount|monto|a pagar)\b/;
const NOT_TOTAL = /\b(sub\s?-?total|subtot|tax|iva|impuesto|savings|ahorro|ahorraste|you saved|discount|descuento|items?|articulos|count|cantidad|tip|propina sugerida|points|puntos|change|cambio|vuelto|cash|efectivo|tendered|recibido|pagado con|rounding)\b/;
const HEADER_JUNK = /^(receipt|recibo|factura|ticket|invoice|welcome|bienvenid[oa]s?|thank you|gracias|customer copy|copia cliente|store|tienda|sale|venta|order|pedido|tel|phone|telefono|ruc|nit|rif|cashier|cajer[oa]|www\.|http).*$|^\d[\d\s\-().]{6,}$|^\d+\s+\w+.*\b(st|street|ave|avenue|blvd|rd|road|hwy|dr|drive|calle|avenida|km)\b/;
const RESTAURANT = /\b(restaurant|restaurante|grill|bar|cafe|coffee|cafeteria|pizza|pizzeria|burger|taco|sushi|kitchen|cocina|diner|bistro|starbucks|mcdonald|subway|wendy|chipotle|kfc|dunkin|chick-fil-a|panera|domino|pollo|fritanga|propina|tip|server|mesero|mesa|table)\b/;
const COFFEE = /\b(cafe|coffee|starbucks|dunkin|cafeteria|bakery|panaderia)\b/;
const CLOTHES = /\b(zara|h&m|shein|ross|marshalls|tj maxx|old navy|gap|forever 21|nike|adidas|uniqlo|kohl|macy|burlington|ropa|boutique)\b/;
const TECH = /\b(best buy|apple store|micro center|newegg|b&h|electronics|electronica|gamestop|verizon|t-mobile|at&t|samsung)\b/;
const HOME = /\b(publix|walmart|target|costco|sam'?s club|aldi|kroger|whole foods|trader joe|winn-dixie|bj'?s|home depot|lowe'?s|ikea|la colonia|pali|maxi pali|la union|supermercado|supermarket|super market|market|mercado|grocery|walgreens|cvs|farmacia|pharmacy|dollar|ferreteria)\b/;
const GAS = /\b(shell|chevron|exxon|mobil|bp|texaco|sunoco|citgo|marathon|speedway|wawa|uno|puma|gas|gasolina|fuel|combustible)\b/;

function guessMerchant(t: string[], f: string[]): { name: string; sure: boolean } {
  for (let i = 0; i < Math.min(t.length, 6); i++) {
    const s = t[i].trim();
    const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
    if (letters < 3 || HEADER_JUNK.test(f[i]) || amountsIn(s).length || /\d{1,2}[/:-]\d{1,2}/.test(s)) continue;
    if (letters / Math.max(1, s.replace(/\s/g, "").length) < 0.6) continue;
    return { name: titleCase(s.replace(/[*#=_~]+/g, " ").replace(/\s{2,}/g, " ").trim()).slice(0, 40), sure: i <= 1 };
  }
  return { name: "", sure: false };
}

function parseReceipt(lines: OcrLine[], today: string): ScanDraft | null {
  const t = lines.map((l) => cleanOcr(l.text)).filter((x) => x.trim());
  if (!t.length) return null;
  const f = t.map(fold);
  const es = /(total a pagar|importe|fecha|gracias|cambio|efectivo|iva|cajero|factura|cordobas|c\$)/.test(f.join(" "));
  const nio = /(c\$|cordobas|\bnio\b)/.test(f.join(" "));
  // Total: the strongest TOTAL label wins; same strength → the larger amount. The amount may sit on the next line.
  let best: { v: number; rank: number } | null = null;
  for (let i = 0; i < t.length; i++) {
    if (NOT_TOTAL.test(f[i]) && !TOTAL_STRONG.test(f[i])) continue;
    const rank = TOTAL_STRONG.test(f[i]) ? 3 : /\btotal\b/.test(f[i]) ? 2 : TOTAL.test(f[i]) ? 1 : 0;
    if (!rank) continue;
    let a = amountsIn(t[i]);
    if (!a.length && i + 1 < t.length && !TOTAL.test(f[i + 1])) a = amountsIn(t[i + 1]);
    if (!a.length) continue;
    const v = Math.abs(a[a.length - 1].v);
    if (!best || rank > best.rank || (rank === best.rank && v > best.v)) best = { v, rank };
  }
  const unsure: ScanField[] = [];
  let amount: number | null = best?.v ?? null;
  if (amount == null) {
    // No TOTAL word: the largest amount that is not cash tendered or change.
    const all = t.flatMap((x, i) => (/(cash|efectivo|tendered|recibido|change|cambio|vuelto)/.test(f[i]) ? [] : amountsIn(x).map((a) => Math.abs(a.v)))).filter((v) => v > 0 && v < 10_000_000);
    amount = all.length ? Math.max(...all) : null;
    unsure.push("amount");
  }
  // Date: one labelled "Fecha/Date" first, else the first date on the receipt.
  let date = "";
  for (let i = 0; i < t.length && !date; i++) if (/\b(fecha|date|fec)\b/.test(f[i])) date = datesIn(t[i], es)[0] ?? "";
  for (let i = 0; i < t.length && !date; i++) date = datesIn(t[i], es)[0] ?? "";
  if (!date) unsure.push("date");
  else if (date > today) { /* a future date on a receipt is a misread; keep it but flag it */ unsure.push("date"); }
  const m = guessMerchant(t, f);
  if (!m.name || !m.sure) unsure.push("concept");
  const all = fold(t.slice(0, 8).join(" ") + " " + m.name);
  let book: ScanBook = "purchase";
  let category = CLOTHES.test(all) ? "ropa" : TECH.test(all) ? "tech" : HOME.test(all) ? "hogar" : "otros";
  let sub = "";
  if (RESTAURANT.test(all) && !HOME.test(all)) { book = "expense-variable"; category = COFFEE.test(all) ? "v-hormiga" : "v-entretenimiento"; sub = COFFEE.test(all) ? "v.hormiga.cafe" : "v.entretenimiento.restaurantes"; }
  else if (GAS.test(fold(m.name)) && !HOME.test(all)) { book = "expense-variable"; category = "v-transporte"; sub = ""; }
  return {
    type: "receipt", concept: m.name, note: "", amountMinor: amount, currency: nio ? "NIO" : "USD", date, cadence: "", brand: "", generic: "",
    book, category, sub, unsure, box: boxOf(lines),
  };
}

/* ---------- entry ---------- */

/** Which kind of picture this is. */
export function scanKind(text: string): "subscription" | "receipt" {
  const s = fold(text);
  const subScore = (s.match(new RegExp(SUB_SCREEN.source, "g")) ?? []).length;
  const recScore = (s.match(/\b(subtotal|total|tax|iva|cambio|change|cash|efectivo|visa|mastercard|debit|qty|cant)\b/g) ?? []).length;
  return subScore > 0 && subScore * 2 >= recScore ? "subscription" : "receipt";
}

/** All drafts in one picture. `today` = YYYY-MM-DD on the user's clock. */
export function parseScan(input: OcrLine[] | string, today: string): ScanDraft[] {
  const lines: OcrLine[] = typeof input === "string" ? input.split(/\r?\n/).map((text) => ({ text })) : input;
  const kept = lines.filter((l) => l.text && l.text.trim());
  if (!kept.length) return [];
  const kind = scanKind(kept.map((l) => l.text).join("\n"));
  if (kind === "subscription") {
    const subs = parseSubs(kept, today);
    if (subs.length) return subs;
  }
  const r = parseReceipt(kept, today);
  return r && (r.amountMinor != null || r.concept) ? [r] : [];
}

/** Is the draft already in the ledger (same concept, amount and day)? */
export function isDuplicate(d: { concept: string; amountMinor: number | null; date: string }, lines: { concept: string; amountMinor: number; bookedOn?: string; nextDue?: string; active?: boolean }[]): boolean {
  if (d.amountMinor == null) return false;
  const c = fold(d.concept).replace(/[^a-z0-9]/g, "");
  const day = d.date ? Number(d.date.slice(8, 10)) : 0;
  return lines.some((l) => {
    if (l.amountMinor !== d.amountMinor) return false;
    const lc = fold(l.concept).replace(/[^a-z0-9]/g, "");
    if (!c || !lc || (lc !== c && !lc.startsWith(c) && !c.startsWith(lc))) return false;
    if (!day) return true;
    const ld = l.nextDue || l.bookedOn || "";
    return !ld || Number(ld.slice(8, 10)) === day;
  });
}
