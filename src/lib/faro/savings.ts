/**
 * The ONE savings stock (1.3.147, Oleada 2). Before this module, "how much is saved" had three
 * answers: the Asesor walked all history (latest snapshot per series by month + EVERY balance-less
 * deposit, even ones a later snapshot already included — a double count), Estudio's runway read only
 * balance lines sitting in the current month's bucket, and the widget read only the current month
 * with no series dedup. Every surface now consumes this single walk:
 *
 * Per series (seriesId, falling back to the line id), over active lines in a savings-role category
 * booked in months ≤ the as-of month:
 * - the LATEST balance snapshot (a line carrying balanceMinor) wins — latest by bookedOn within its
 *   month, deterministic tie-break by line id;
 * - plus the deposits (balance-less lines of the same series) booked AFTER that snapshot and at or
 *   before the as-of month — a deposit the snapshot already includes is never counted twice;
 * - a series with no snapshot is simply the sum of its deposits ≤ as-of.
 *
 * Amounts come back in the view currency. The per-series attribution (the sub of the series'
 * determining line: its snapshot, else its latest deposit) feeds the widget's pockets and the
 * Asesor's Emergency/Retirement split without re-walking the book.
 *
 * Wave 1 of the savings model (1.3.287) adds the CLASS PARTITION over this same walk: every
 * series falls into exactly one class — cuenta (its determining line sits in a vault sub),
 * retiro (the *.retiro suffix), aparte / saldo (the nature the series' determining line
 * declares in `fund`), or sin-declarar (no declaration: read as a pile, as always). The
 * partition is pure classification: the five classes sum exactly to `total`, for declared
 * and undeclared books alike, so no figure moves until a later wave reads the classes.
 */
import { convertMinor } from "./money";
import type { LedgerState, Line } from "./types";

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

export type SavingsSeriesStock = {
  minor: number;
  subId: string;
  categoryId: string;
  /** The class this series falls into in the partition (savings model, 1.3.287). */
  cls: SavingsClass;
  /** The series' declared nature, read from its determining line (absent = undeclared).
   *  Data verbatim: for cuenta/retiro series the class rules and this field is ignored. */
  fund?: "saldo" | "aparte";
  /** Host account (sub id) when the determining line declares one for a "saldo" fund. */
  fundHost?: string;
};

/** The five classes of the partition: every series falls into exactly one. */
export type SavingsClass = "cuenta" | "retiro" | "aparte" | "saldo" | "sin-declarar";

export type SavingsStock = {
  /** Whole savings stock in the view currency (minor units). */
  total: number;
  /** Stock whose determining line sits in an *.emergencia sub. */
  emergency: number;
  /** Stock whose determining line sits in an *.retiro sub. */
  retirement: number;
  /** Per-series stock with its attribution, for pocket displays. */
  series: Map<string, SavingsSeriesStock>;
  /** The partition by class: the subtotal of each class. The five sum EXACTLY to total. */
  byClass: Record<SavingsClass, number>;
  /** Kept apart from accounts ("Lo guardado" without accounts) = aparte + retiro. */
  kept: number;
  /** Kept, per pocket (sub id). */
  keptByPocket: Map<string, number>;
  /** Pledged against balances ("Lo comprometido") = Σ saldo. A reading, never a summand. */
  pledged: number;
  /** Pledged, per pocket (sub id). */
  pledgedByPocket: Map<string, number>;
  /** Pledged, per host account (sub id); key "" = a saldo fund with no host written. */
  pledgedByHost: Map<string, number>;
  /** Σ sin-declarar: read as a pile in every total (as always), but reported apart. */
  undeclared: number;
  /** Undeclared, per pocket (sub id). */
  undeclaredByPocket: Map<string, number>;
};

type Placed = { line: Line; month: string; day: string };

/** Order inside a series: bucket month, then the booked day (only when it belongs to that month), then id. */
function orderOf(p: Placed): string {
  return `${p.month}|${p.day}|${p.line.id}`;
}

export function savingsStock(state: LedgerState, asOfKey: string): SavingsStock {
  const { display, rateE4 } = state.settings;
  // Account subs (icon "vault" / "vault:…"): a series whose determining line sits in one
  // is an account — the base itself — never a fund (same test advisor.ts/awake.ts use).
  const vaultSubs = new Set<string>();
  for (const c of state.structure.categories) {
    for (const s of c.subs) {
      if (s.icon === "vault" || s.icon.startsWith("vault:")) vaultSubs.add(s.id);
    }
  }
  const snaps = new Map<string, Placed>();
  const deposits = new Map<string, Placed[]>();
  const placed = (line: Line, month: string): Placed => ({
    line,
    month,
    day: line.bookedOn && line.bookedOn.startsWith(month) ? line.bookedOn : "",
  });
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    if (monthKey > asOfKey) continue;
    for (const line of bucket.lines) {
      if (!line.active || line.rest || roleOf(state, line.categoryId) !== "savings") continue;
      const sid = line.seriesId || line.id;
      const p = placed(line, monthKey);
      if (line.balanceMinor != null) {
        const prev = snaps.get(sid);
        if (!prev || orderOf(p) > orderOf(prev)) snaps.set(sid, p);
      } else {
        const list = deposits.get(sid) ?? [];
        list.push(p);
        deposits.set(sid, list);
      }
    }
  }
  const series = new Map<string, SavingsSeriesStock>();
  let total = 0;
  let emergency = 0;
  let retirement = 0;
  // The partition (savings model, wave 1): the same walk, classified. Nothing here moves a
  // figure — for a book with no declarations every series lands in cuenta/retiro/sin-declarar
  // and the five classes sum exactly to the total this walk has always returned.
  const byClass: Record<SavingsClass, number> = { cuenta: 0, retiro: 0, aparte: 0, saldo: 0, "sin-declarar": 0 };
  let kept = 0;
  let pledged = 0;
  let undeclared = 0;
  const keptByPocket = new Map<string, number>();
  const pledgedByPocket = new Map<string, number>();
  const pledgedByHost = new Map<string, number>();
  const undeclaredByPocket = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const sids = new Set([...snaps.keys(), ...deposits.keys()]);
  for (const sid of sids) {
    const snap = snaps.get(sid);
    const deps = deposits.get(sid) ?? [];
    let minor = 0;
    if (snap) minor += convertMinor(snap.line.balanceMinor as number, snap.line.balanceCurrency || snap.line.currency, display, rateE4);
    for (const d of deps) {
      // A deposit counts on top of the snapshot only when it was booked after it (same month needs
      // both days known and the deposit's later); anything earlier is already inside the snapshot.
      if (snap && !(d.month > snap.month || (d.month === snap.month && d.day !== "" && snap.day !== "" && d.day > snap.day))) continue;
      minor += convertMinor(d.line.amountMinor, d.line.currency, display, rateE4);
    }
    const determining = snap ?? deps.reduce((a, b) => (orderOf(b) > orderOf(a) ? b : a));
    // The declared nature is read from the determining line — the same line that attributes
    // the series to its pocket — and read with distrust: only the two known words count.
    const dl = determining.line;
    const fund = dl.fund === "saldo" || dl.fund === "aparte" ? dl.fund : undefined;
    const fundHost = fund === "saldo" && typeof dl.fundHost === "string" && dl.fundHost !== "" ? dl.fundHost : undefined;
    // Class precedence: an account is the base itself; Retirement is its class by suffix and
    // never carries the field (a stray stamp on either is ignored, never reclassifies it).
    let cls: SavingsClass;
    if (vaultSubs.has(dl.subId)) cls = "cuenta";
    else if (dl.subId.endsWith(".retiro")) cls = "retiro";
    else if (fund === "saldo") cls = "saldo";
    else if (fund === "aparte") cls = "aparte";
    else cls = "sin-declarar";
    const row: SavingsSeriesStock = { minor, subId: dl.subId, categoryId: dl.categoryId, cls, ...(fund ? { fund } : {}), ...(fundHost ? { fundHost } : {}) };
    series.set(sid, row);
    total += minor;
    if (row.subId.endsWith(".emergencia")) emergency += minor;
    else if (row.subId.endsWith(".retiro")) retirement += minor;
    byClass[cls] += minor;
    if (cls === "aparte" || cls === "retiro") {
      kept += minor;
      bump(keptByPocket, row.subId, minor);
    } else if (cls === "saldo") {
      pledged += minor;
      bump(pledgedByPocket, row.subId, minor);
      bump(pledgedByHost, fundHost ?? "", minor);
    } else if (cls === "sin-declarar") {
      undeclared += minor;
      bump(undeclaredByPocket, row.subId, minor);
    }
  }
  return { total, emergency, retirement, series, byClass, kept, keptByPocket, pledged, pledgedByPocket, pledgedByHost, undeclared, undeclaredByPocket };
}
