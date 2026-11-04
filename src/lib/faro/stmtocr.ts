/**
 * Reads a retirement statement's OCR text (Primerica first, any EN/ES statement after): the period, the account value,
 * contributions, change in value, withdrawals and fees. Pure: no DOM, no OCR. Tolerant on purpose; tuned on real photos later.
 * Amounts come back in minor units (cents). A field that is not found is null.
 */
export type StmtKey = "value" | "contrib" | "change" | "withdraw" | "fees";
export type StmtRead = {
  /** End of the statement period, YYYY-MM-DD ("" when no date was found). */
  end: string;
  /** Start of the period when the statement gives one. */
  start: string;
  /** YYYY-MM of `end`: the key that stops a statement being imported twice. */
  month: string;
  /** "NIO" when the statement writes C$, otherwise "USD" (Primerica). */
  currency: "USD" | "NIO";
} & Record<StmtKey, number | null>;

export const STMT_KEYS: StmtKey[] = ["value", "contrib", "change", "withdraw", "fees"];

// Labels in priority order (Primerica's own words first), accent-free and lower case.
const LABELS: Record<StmtKey, string[]> = {
  value: [
    "ending account value", "total account value", "account value", "valor total de la cuenta", "valor de la cuenta",
    "ending balance", "ending value", "closing balance", "total value", "market value", "saldo final", "valor final",
    "saldo al cierre", "balance final", "saldo actual", "valor actual",
  ],
  contrib: [
    "total contributions", "contributions", "contribution", "total de aportes", "aportes", "aportaciones",
    "contribuciones", "deposits", "depositos", "purchases",
  ],
  change: [
    "change in account value", "change in value", "change in market value", "gain/loss", "gains/losses", "gain (loss)",
    "investment gain", "investment earnings", "market change", "cambio de valor", "cambio en el valor",
    "ganancia/perdida", "ganancias o perdidas", "ganancia o perdida", "rendimiento",
  ],
  withdraw: ["total withdrawals", "withdrawals", "withdrawal", "distributions", "redemptions", "retiros", "distribuciones"],
  fees: ["total fees", "fees and charges", "fees", "fee", "charges", "cargos", "comisiones", "gastos"],
};
// A line with one of these is the period's opening figure, not its ending one.
const OPENING = /\b(beginning|begin|starting|opening|previous|prior|inicial|anterior|al inicio)\b/;

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const AMOUNT = /(\(?-?\s?[$S]?\s?-?\d{1,3}(?:[,.\s]\d{3})*[.,]\d{2}\)?|\(?-?\s?[$S]?\s?-?\d+[.,]\d{2}\)?)/g;

/** "1,234.56", "$ 1.234,56", "(12.00)", "-3.10" → minor units. */
export function amountMinor(raw: string): number | null {
  const neg = /\(.*\)/.test(raw) || /-/.test(raw);
  const digits = raw.replace(/[^\d.,]/g, "");
  const m = digits.match(/^(.*?)[.,](\d{2})$/);
  if (!m) return null;
  const whole = m[1].replace(/[.,\s]/g, "");
  if (!/^\d*$/.test(whole)) return null;
  const v = Number(whole || "0") * 100 + Number(m[2]);
  return neg ? -v : v;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, ene: 1, enero: 1, feb: 2, february: 2, febrero: 2, mar: 3, march: 3, marzo: 3, apr: 4, april: 4,
  abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, june: 6, junio: 6, jul: 7, july: 7, julio: 7, aug: 8, august: 8, ago: 8,
  agosto: 8, sep: 9, sept: 9, september: 9, set: 9, septiembre: 9, setiembre: 9, oct: 10, october: 10, octubre: 10,
  nov: 11, november: 11, noviembre: 11, dec: 12, december: 12, dic: 12, diciembre: 12,
};
const MNAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100 ? `${y}-${pad(m)}-${pad(d)}` : "");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Every date on a line, in order. `dmy` reads 03/04/2026 as 3 April. */
export function datesIn(line: string, dmy: boolean): string[] {
  const out: { at: number; d: string }[] = [];
  const s = fold(line);
  for (const m of s.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/g)) {
    const a = Number(m[1]), b = Number(m[2]);
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [mo, d] = a > 12 ? [b, a] : b > 12 ? [a, b] : dmy ? [b, a] : [a, b];
    const v = iso(y, mo, d);
    if (v) out.push({ at: m.index ?? 0, d: v });
  }
  for (const m of s.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const v = iso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (v) out.push({ at: m.index ?? 0, d: v });
  }
  for (const m of s.matchAll(new RegExp(`\\b(${MNAMES})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "g"))) {
    const v = iso(Number(m[3]), MONTHS[m[1]], Number(m[2]));
    if (v) out.push({ at: m.index ?? 0, d: v });
  }
  for (const m of s.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${MNAMES})\\.?,?\\s+(?:de\\s+|del\\s+)?(\\d{4})\\b`, "g"))) {
    const v = iso(Number(m[3]), MONTHS[m[2]], Number(m[1]));
    if (v) out.push({ at: m.index ?? 0, d: v });
  }
  if (!out.length) {
    // "September 2026" / "septiembre de 2026": the month's last day.
    for (const m of s.matchAll(new RegExp(`\\b(${MNAMES})\\.?\\s+(?:de\\s+|del\\s+)?(\\d{4})\\b`, "g"))) {
      const y = Number(m[2]), mo = MONTHS[m[1]];
      const v = iso(y, mo, lastDay(y, mo));
      if (v) out.push({ at: m.index ?? 0, d: v });
    }
  }
  return out.sort((x, y) => x.at - y.at).map((x) => x.d);
}

const PERIOD = /(statement period|period ending|period ended|for the period|statement date|as of|valuation date|periodo|fecha del estado|fecha de corte|al cierre|corte)/;

function findPeriod(lines: string[], dmy: boolean): { start: string; end: string } {
  for (const line of lines) {
    if (!PERIOD.test(fold(line))) continue;
    const ds = datesIn(line, dmy);
    if (ds.length) return { start: ds.length > 1 ? ds[0] : "", end: ds[ds.length - 1] };
  }
  // The label may sit on its own line with the dates under it.
  for (let i = 0; i < lines.length - 1; i++) {
    if (!PERIOD.test(fold(lines[i]))) continue;
    const ds = datesIn(lines[i + 1], dmy);
    if (ds.length) return { start: ds.length > 1 ? ds[0] : "", end: ds[ds.length - 1] };
  }
  const all = lines.flatMap((l) => datesIn(l, dmy)).sort();
  return { start: "", end: all[all.length - 1] ?? "" };
}

function amountsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(AMOUNT)) {
    const v = amountMinor(m[1]);
    if (v !== null) out.push(v);
  }
  return out;
}

function findField(lines: string[], folded: string[], key: StmtKey): number | null {
  for (const label of LABELS[key]) {
    for (let i = 0; i < lines.length; i++) {
      const f = folded[i];
      const at = f.indexOf(label);
      if (at < 0) continue;
      if (key !== "change" && OPENING.test(f)) continue;
      if (key === "value" && /change|cambio|gain|ganancia/.test(f)) continue;
      // Do not let "fee" match inside another word, or "contributions" inside "employer contributions YTD" headers only.
      const before = f[at - 1], after = f[at + label.length];
      if ((before && /[a-z]/.test(before)) || (after && /[a-z]/.test(after) && !/s/.test(after))) continue;
      const rest = lines[i].slice(at + label.length);
      let found = amountsIn(rest);
      if (!found.length && i + 1 < lines.length && !LABEL_ANY.test(folded[i + 1])) found = amountsIn(lines[i + 1]);
      if (!found.length) continue;
      let v = found[0];
      if (key === "change" && v > 0 && /\b(loss|perdida)\b/.test(f) && !/gain|ganancia/.test(f)) v = -v;
      if (key === "withdraw" || key === "fees" || key === "contrib" || key === "value") v = Math.abs(v);
      return v;
    }
  }
  return null;
}
const LABEL_ANY = new RegExp(Object.values(LABELS).flat().map((l) => l.replace(/[()/]/g, "\\$&")).join("|"));

export function parseStatement(text: string): StmtRead {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const folded = lines.map(fold);
  const all = folded.join(" ");
  const dmy = /\b(periodo|cuenta|saldo|aportes|valor)\b/.test(all) && !/\b(account|statement|value)\b/.test(all);
  const { start, end } = findPeriod(lines, dmy);
  const out = { start, end, month: end.slice(0, 7), currency: /C\s?\$|cordobas?\b|\bnio\b/.test(all) ? "NIO" : "USD" } as StmtRead;
  for (const k of STMT_KEYS) out[k] = findField(lines, folded, k);
  return out;
}
