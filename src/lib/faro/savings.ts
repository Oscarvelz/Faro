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
 */
import { convertMinor } from "./money";
import type { LedgerState, Line } from "./types";

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

export type SavingsSeriesStock = { minor: number; subId: string; categoryId: string };
export type SavingsStock = {
  /** Whole savings stock in the view currency (minor units). */
  total: number;
  /** Stock whose determining line sits in an *.emergencia sub. */
  emergency: number;
  /** Stock whose determining line sits in an *.retiro sub. */
  retirement: number;
  /** Per-series stock with its attribution, for pocket displays. */
  series: Map<string, SavingsSeriesStock>;
};

type Placed = { line: Line; month: string; day: string };

/** Order inside a series: bucket month, then the booked day (only when it belongs to that month), then id. */
function orderOf(p: Placed): string {
  return `${p.month}|${p.day}|${p.line.id}`;
}

export function savingsStock(state: LedgerState, asOfKey: string): SavingsStock {
  const { display, rateE4 } = state.settings;
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
    const row: SavingsSeriesStock = { minor, subId: determining.line.subId, categoryId: determining.line.categoryId };
    series.set(sid, row);
    total += minor;
    if (row.subId.endsWith(".emergencia")) emergency += minor;
    else if (row.subId.endsWith(".retiro")) retirement += minor;
  }
  return { total, emergency, retirement, series };
}
