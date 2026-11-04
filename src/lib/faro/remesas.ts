// Remesas (1.3.86): money sent to family, read from normal ledger lines in a remittance category (Fijos or Variables).
import { convertMinor } from "./money.ts";
import type { LedgerState, Line } from "./types";

export const REMIT_IDS = new Set(["f-remesas", "v-remesas"]);

/** A line counts as a remittance when its category has the remittance role (or is a default Remesas id, even after the category was deleted). */
export function isRemit(state: LedgerState, line: Line): boolean {
  if (!line.active || (line.kind !== "expense-fixed" && line.kind !== "expense-variable")) return false;
  if (REMIT_IDS.has(line.categoryId)) return true;
  return state.structure.categories.find((c) => c.id === line.categoryId)?.role === "remittance";
}

export type RemitMonth = { key: string; usd: number; nio: number; count: number; income: number };
export type RemitTrend = {
  months: RemitMonth[];
  now: RemitMonth;
  prev: RemitMonth;
  /** Percent change vs last month in USD, null when last month had nothing. */
  deltaPct: number | null;
  /** Average of the months that had a remittance, in USD minor. */
  avgUsd: number;
  /** Share of this month's income (USD), null when there is no income. */
  sharePct: number | null;
  any: boolean;
};

const shift = (key: string, d: number) => {
  const [y, m] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1 + d, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** The last n months (oldest first) ending at `key`, totals in US$ and C$ minor at the ledger's rate. */
export function remitTrend(state: LedgerState, key: string, n = 6): RemitTrend {
  const rate = state.settings.rateE4;
  const months: RemitMonth[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = shift(key, -i);
    const lines = state.months[k]?.lines ?? [];
    let usd = 0, count = 0, income = 0;
    for (const l of lines) {
      if (l.active && (l.kind === "income-fixed" || l.kind === "income-variable")) income += convertMinor(l.amountMinor, l.currency, "USD", rate);
      if (!isRemit(state, l)) continue;
      usd += convertMinor(l.amountMinor, l.currency, "USD", rate);
      count++;
    }
    months.push({ key: k, usd, nio: convertMinor(usd, "USD", "NIO", rate), count, income });
  }
  const now = months[months.length - 1]!;
  const prev = months[months.length - 2] ?? { key: shift(key, -1), usd: 0, nio: 0, count: 0, income: 0 };
  const live = months.filter((m) => m.usd > 0);
  return {
    months,
    now,
    prev,
    deltaPct: prev.usd > 0 ? Math.round(((now.usd - prev.usd) / prev.usd) * 100) : null,
    avgUsd: live.length ? Math.round(live.reduce((a, m) => a + m.usd, 0) / live.length) : 0,
    sharePct: now.income > 0 ? Math.round((now.usd / now.income) * 1000) / 10 : null,
    any: live.length > 0,
  };
}
