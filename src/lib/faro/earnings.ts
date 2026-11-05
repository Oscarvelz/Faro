/**
 * Earnings by source (1.3.109, Estudio "De dónde viene tu dinero"): what came in during a year, grouped by where it came
 * from, with credit card rewards (cash back) as their own source "Recompensas de tarjetas" (per card, per month).
 * - Income lines are grouped by concept (the part before " · "); repayments of money lent go under one source.
 * - Card rewards count when they are EARNED: each rewards reading that grew (cards.ts rewardsEarned), or the bank's own
 *   "year to date" reading when it is larger.
 * - A rewards deposit (Canjear → Depósito, an income line with rwCard) is that same money arriving, so it is left out of
 *   the income sources: the rewards are never counted twice. A statement credit is not income at all.
 * Pure: no DOM. Amounts in minor units of the view currency.
 */
import { convertMinor } from "./money";
import { cardsOf, rewardsEarned, storedCards } from "./cards";
import type { LedgerState, Line } from "./types";

export type EarnSource = { id: string; name: string; minor: number; rewards?: boolean };
export type EarnCard = { id: string; name: string; minor: number; card: ReturnType<typeof cardsOf>[number] };
export type Earnings = {
  year: number;
  total: number;
  sources: EarnSource[];
  rewards: { minor: number; cards: EarnCard[]; months: number[]; share: number };
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const isIncome = (l: Line) => l.active && (l.kind === "income-fixed" || l.kind === "income-variable");

export function earningsBySource(state: LedgerState | null | undefined, year: number, lang: "es" | "en" = "es", keep = 5): Earnings {
  const empty: Earnings = { year, total: 0, sources: [], rewards: { minor: 0, cards: [], months: Array(12).fill(0), share: 0 } };
  if (!state) return empty;
  const { display, rateE4 } = state.settings;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const groups = new Map<string, EarnSource>();
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    for (const line of state.months[key]?.lines ?? []) {
      if (!isIncome(line) || line.rwCard) continue;
      const minor = convertMinor(line.amountMinor, line.currency, display, rateE4);
      if (minor <= 0) continue;
      const base = line.lentId ? "" : (line.concept || "").split(" · ")[0].trim();
      const id = line.lentId ? "lent" : fold(base) || "otros";
      const name = line.lentId ? L("Abonos que te pagaron", "Repayments to you") : base || L("Sin nombre", "No name");
      const g = groups.get(id) ?? { id, name, minor: 0 };
      g.minor += minor;
      groups.set(id, g);
    }
  }
  // Rewards earned this year, per card (archived cards keep their history).
  const months = Array(12).fill(0) as number[];
  const cards: EarnCard[] = [];
  for (const card of [...cardsOf(state), ...storedCards(state).filter((c) => c.archived)]) {
    let minor = 0;
    for (const e of rewardsEarned(card)) {
      if (Number(e.on.slice(0, 4)) !== year) continue;
      const v = convertMinor(e.minor, card.currency, display, rateE4);
      minor += v;
      months[Number(e.on.slice(5, 7)) - 1] += v;
    }
    // The bank's own "year to date" figure, when read, is the better total: the part the readings did not see goes to
    // the month of that reading (it is info only; it never adds to the money the user has).
    const ytd = [...(card.rw ?? [])].reverse().find((s) => s.earnedMinor !== undefined && s.earnedSpan !== "life" && Number(s.on.slice(0, 4)) === year);
    if (ytd) {
      const v = convertMinor(ytd.earnedMinor!, card.currency, display, rateE4);
      if (v > minor) { months[Number(ytd.on.slice(5, 7)) - 1] += v - minor; minor = v; }
    }
    if (minor > 0) cards.push({ id: card.id, name: card.name, minor, card });
  }
  cards.sort((a, b) => b.minor - a.minor);
  const rw = cards.reduce((s, c) => s + c.minor, 0);
  const ranked = [...groups.values()].sort((a, b) => b.minor - a.minor);
  const head = ranked.slice(0, keep);
  const rest = ranked.slice(keep).reduce((s, g) => s + g.minor, 0);
  if (rest > 0) head.push({ id: "otros", name: L("Otros ingresos", "Other income"), minor: rest });
  if (rw > 0) head.push({ id: "rewards", name: L("Recompensas de tarjetas", "Card rewards"), minor: rw, rewards: true });
  head.sort((a, b) => b.minor - a.minor);
  const total = head.reduce((s, g) => s + g.minor, 0);
  return { year, total, sources: head, rewards: { minor: rw, cards, months, share: total > 0 ? rw / total : 0 } };
}
