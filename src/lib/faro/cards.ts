/**
 * Credit cards (1.3.107): "el crédito es una forma de préstamo". Cards live under Debo → Préstamos → Tarjetas.
 * - A card's balance comes from dated readings (`snaps`: a screenshot of the bank app read on the device, or a manual
 *   update), kept forever, oldest first. The trend, the sparkline and "creciendo/bajando" read them.
 * - Paying a card ("Abonar") is a TRANSFER line (xfer, inactive, `cardId`), never spending: every purchase made with the
 *   card was already logged as an expense, so counting the payment too would count the same money twice. The payment
 *   lowers the card's balance until the next reading (a reading saved after it already includes it: `seen`).
 * - Presets (Chase Freedom Unlimited, Wells Fargo Active Cash, PayPal Cashback World Mastercard) are virtual: names,
 *   marks and colours only, never numbers. A preset is stored only once the user gives it data; removing one is
 *   remembered in `cardsOff` (synced, backed up, sample mode has its own ledger). Restore brings them back.
 * Pure: no DOM. Amounts in minor units of the card's currency.
 */
import { convertMinor } from "./money";
import { ISO_DAY, todayIso } from "./loans";
import type { CardSnap, CreditCard, Currency, LedgerState, Line, RewardSnap } from "./types";

export const CARD_PRESETS: { id: string; name: string; issuer: string; mark: string; color: string; network: string; manualOnly?: boolean }[] = [
  { id: "chase", name: "Chase Freedom Unlimited", issuer: "Chase", mark: "chase", color: "#117aca", network: "visa", manualOnly: true },
  { id: "wellsfargo", name: "Wells Fargo Active Cash", issuer: "Wells Fargo", mark: "wellsfargo", color: "#d71e28", network: "visa" },
  { id: "paypal", name: "PayPal Cashback World Mastercard", issuer: "PayPal", mark: "paypal", color: "#003087", network: "mastercard" },
];

/** Generic art styles for any other card (with the user's colour). */
export const ART_STYLES = ["wave", "band", "glow", "plain"] as const;
/** The art a card shows: its own choice, else its issuer's, else "wave". */
export function artOf(c: Pick<CreditCard, "art" | "mark">): string {
  if (c.art) return c.art;
  return c.mark === "chase" || c.mark === "wellsfargo" || c.mark === "paypal" ? c.mark : "wave";
}
/** Network a text names (Visa, Mastercard, Amex, Discover) or "". */
export function networkIn(text: string): string {
  return /\bvisa\b/i.test(text) ? "visa" : /master\s*card|masterca|world elite|\bworld\b/i.test(text) ? "mastercard" : /amex|american express/i.test(text) ? "amex" : /discover/i.test(text) ? "discover" : "";
}

/** Issuers the reader and the marks know (any other bank works too: generic mark, name match). */
export const ISSUERS: { mark: string; name: string; color: string; ink: string; mono: string; words: RegExp }[] = [
  { mark: "chase", name: "Chase", color: "#117aca", ink: "#ffffff", mono: "C", words: /\bchase\b|freedom (unlimited|flex)|sapphire/i },
  { mark: "wellsfargo", name: "Wells Fargo", color: "#d71e28", ink: "#ffcd41", mono: "WF", words: /wells\s*fargo|active cash|autograph|reflect/i },
  { mark: "paypal", name: "PayPal", color: "#003087", ink: "#4fc3f7", mono: "P", words: /pay\s*pal|cashback world/i },
  { mark: "capitalone", name: "Capital One", color: "#004879", ink: "#ffffff", mono: "C1", words: /capital\s*one|quicksilver|savor|venture/i },
  { mark: "discover", name: "Discover", color: "#ff6000", ink: "#ffffff", mono: "D", words: /\bdiscover\b/i },
  { mark: "amex", name: "American Express", color: "#2e77bc", ink: "#ffffff", mono: "AX", words: /american express|\bamex\b|blue cash/i },
  { mark: "citi", name: "Citi", color: "#056dae", ink: "#ffffff", mono: "citi", words: /\bciti(bank)?\b|double cash|custom cash/i },
  { mark: "bofa", name: "Bank of America", color: "#e31837", ink: "#ffffff", mono: "BA", words: /bank of america|\bbofa\b/i },
  { mark: "apple", name: "Apple Card", color: "#1d1d1f", ink: "#ffffff", mono: "A", words: /apple card|goldman/i },
];

export const issuerOf = (mark: string) => ISSUERS.find((i) => i.mark === mark);

/** The issuer a free text names ("WELLS FARGO ACTIVE CASH VISA") or "". */
export function issuerIn(text: string): string {
  return ISSUERS.find((i) => i.words.test(text))?.mark ?? "";
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);

function normalizeSnap(s: CardSnap): CardSnap | null {
  if (!s || typeof s.balanceMinor !== "number" || typeof s.on !== "string" || !ISO_DAY.test(s.on)) return null;
  return {
    on: s.on, at: typeof s.at === "string" ? s.at : `${s.on}T12:00:00.000Z`, balanceMinor: Math.round(s.balanceMinor),
    ...(num(s.availMinor) !== undefined ? { availMinor: num(s.availMinor) } : {}),
    ...(num(s.limitMinor) !== undefined ? { limitMinor: num(s.limitMinor) } : {}),
    ...(num(s.minMinor) !== undefined ? { minMinor: num(s.minMinor) } : {}),
    ...(num(s.statementMinor) !== undefined ? { statementMinor: num(s.statementMinor) } : {}),
    ...(typeof s.dueOn === "string" && ISO_DAY.test(s.dueOn) ? { dueOn: s.dueOn } : {}),
    ...(num(s.aprBps) ? { aprBps: num(s.aprBps) } : {}),
    src: s.src === "shot" ? "shot" : "manual",
    ...(num(s.lastPayMinor) !== undefined ? { lastPayMinor: num(s.lastPayMinor) } : {}),
    ...(typeof s.lastPayOn === "string" && ISO_DAY.test(s.lastPayOn) ? { lastPayOn: s.lastPayOn } : {}),
    ...(Array.isArray(s.notes) && s.notes.length ? { notes: s.notes.filter((n) => n && typeof n.label === "string" && typeof n.text === "string").map((n) => ({ label: n.label.slice(0, 60), text: n.text.slice(0, 40) })) } : {}),
    ...(Array.isArray(s.seen) && s.seen.length ? { seen: s.seen.filter((x) => typeof x === "string") } : {}),
  };
}

function normalizeRw(s: RewardSnap): RewardSnap | null {
  if (!s || typeof s.on !== "string" || !ISO_DAY.test(s.on)) return null;
  const amount = num(s.amountMinor);
  const points = num(s.points);
  const earned = num(s.earnedMinor);
  if (amount === undefined && points === undefined && earned === undefined && s.src !== "redeem") return null;
  return {
    on: s.on, at: typeof s.at === "string" ? s.at : `${s.on}T12:00:00.000Z`,
    ...(amount !== undefined ? { amountMinor: Math.max(0, amount) } : {}),
    ...(points !== undefined ? { points: Math.max(0, points) } : {}),
    ...(earned !== undefined ? { earnedMinor: Math.max(0, earned), earnedSpan: s.earnedSpan === "life" ? "life" : "year" } : {}),
    src: s.src === "shot" ? "shot" : s.src === "redeem" ? "redeem" : "manual",
    ...(s.src === "redeem" && num(s.redeemed) ? { redeemed: num(s.redeemed) } : {}),
    ...(s.src === "redeem" && (s.how === "credit" || s.how === "deposit") ? { how: s.how } : {}),
    ...(typeof s.lineId === "string" && s.lineId ? { lineId: s.lineId } : {}),
  };
}

export function normalizeCard(c: CreditCard): CreditCard {
  const rw = (Array.isArray(c.rw) ? c.rw : []).map(normalizeRw).filter((s): s is RewardSnap => !!s).sort((a, b) => a.on.localeCompare(b.on) || a.at.localeCompare(b.at));
  return {
    id: String(c.id),
    name: typeof c.name === "string" ? c.name : "",
    issuer: typeof c.issuer === "string" ? c.issuer : "",
    mark: typeof c.mark === "string" ? c.mark : "",
    color: typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#5b6b78",
    ...(typeof c.art === "string" && c.art ? { art: c.art } : {}),
    ...(typeof c.network === "string" && c.network ? { network: c.network } : {}),
    last4: typeof c.last4 === "string" ? c.last4.replace(/\D/g, "").slice(-4) : "",
    currency: c.currency === "NIO" ? "NIO" : "USD",
    limitMinor: typeof c.limitMinor === "number" && c.limitMinor > 0 ? Math.round(c.limitMinor) : null,
    dueDay: typeof c.dueDay === "number" && c.dueDay >= 1 && c.dueDay <= 31 ? Math.round(c.dueDay) : 0,
    aprBps: typeof c.aprBps === "number" && c.aprBps > 0 ? Math.round(c.aprBps) : 0,
    ...(typeof c.promoUntil === "string" && ISO_DAY.test(c.promoUntil) ? { promoUntil: c.promoUntil } : {}),
    autopay: c.autopay === true ? true : c.autopay === false ? false : null,
    rewards: typeof c.rewards === "string" ? c.rewards : "",
    ...(c.manualOnly ? { manualOnly: true } : {}),
    snaps: (Array.isArray(c.snaps) ? c.snaps : []).map(normalizeSnap).filter((s): s is CardSnap => !!s).sort((a, b) => a.on.localeCompare(b.on) || a.at.localeCompare(b.at)),
    ...(rw.length ? { rw } : {}),
    ...(c.preset ? { preset: String(c.preset) } : {}),
    ...(c.archived ? { archived: true, archivedOn: c.archivedOn ?? "" } : {}),
  };
}

export function presetCard(id: string, currency: Currency = "USD"): CreditCard | null {
  const p = CARD_PRESETS.find((x) => x.id === id);
  if (!p) return null;
  return normalizeCard({ id: `card-${p.id}`, name: p.name, issuer: p.issuer, mark: p.mark, color: p.color, network: p.network, last4: "", currency, limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", manualOnly: p.manualOnly, snaps: [], preset: p.id });
}

/** Stored cards only (archived too). */
export function storedCards(state: LedgerState | null | undefined): CreditCard[] {
  return Array.isArray(state?.cards) ? state!.cards!.filter((c) => c && typeof c.id === "string").map(normalizeCard) : [];
}

/** Every card on screen: stored ones (not archived) plus the presets not removed and not stored yet, in a stable order. */
export function cardsOf(state: LedgerState | null | undefined): CreditCard[] {
  const stored = storedCards(state);
  const off = new Set(state?.cardsOff ?? []);
  const out: CreditCard[] = [];
  for (const p of CARD_PRESETS) {
    const have = stored.find((c) => c.preset === p.id);
    if (have) { if (!have.archived && !off.has(p.id)) out.push(have); continue; }
    if (off.has(p.id)) continue;
    const fresh = presetCard(p.id);
    if (fresh) out.push(fresh);
  }
  for (const c of stored) if (!c.preset && !c.archived) out.push(c);
  return out;
}

/** Presets that Restore would bring back (removed, or archived after removal). */
export function presetsOff(state: LedgerState | null | undefined): string[] {
  const shown = new Set(cardsOf(state).map((c) => c.preset).filter(Boolean));
  return CARD_PRESETS.map((p) => p.id).filter((id) => !shown.has(id));
}

/** Writes a card (a preset becomes stored the first time it gets data or an edit). */
export function putCard(state: LedgerState, card: CreditCard): LedgerState {
  const c = normalizeCard(card);
  const list = storedCards(state);
  const i = list.findIndex((x) => x.id === c.id);
  const next = i >= 0 ? list.map((x, j) => (j === i ? c : x)) : [...list, c];
  const off = c.preset ? (state.cardsOff ?? []).filter((x) => x !== c.preset) : state.cardsOff;
  return { ...state, cards: next, ...(off ? { cardsOff: off } : {}) };
}

/** Card payment lines (transfers with cardId), oldest first. */
export function cardPays(state: LedgerState, id: string): Line[] {
  const out: Line[] = [];
  for (const bucket of Object.values(state.months)) for (const line of bucket.lines) if (line.cardId === id) out.push(line);
  return out.sort((a, b) => (a.bookedOn || a.monthKey).localeCompare(b.bookedOn || b.monthKey));
}

/**
 * Remove a card. One with readings or payments is archived (its history is never lost; Restore brings a preset back
 * with it); one without data is dropped. A preset is remembered in cardsOff either way.
 */
export function dropCard(state: LedgerState, id: string, today = todayIso()): LedgerState {
  const card = cardsOf(state).find((c) => c.id === id) ?? storedCards(state).find((c) => c.id === id);
  if (!card) return state;
  const keep = card.snaps.length > 0 || (card.rw?.length ?? 0) > 0 || cardPays(state, id).length > 0;
  const stored = storedCards(state);
  const cards = keep
    ? (stored.some((c) => c.id === id) ? stored.map((c) => (c.id === id ? { ...c, archived: true, archivedOn: today } : c)) : [...stored, { ...card, archived: true, archivedOn: today }])
    : stored.filter((c) => c.id !== id);
  const cardsOff = card.preset ? [...new Set([...(state.cardsOff ?? []), card.preset])] : state.cardsOff;
  return { ...state, cards, ...(cardsOff ? { cardsOff } : {}) };
}

/** "Empezar de cero": every preset off in one step (their history archived, restorable). User cards stay. */
export function dropPresets(state: LedgerState, today = todayIso()): LedgerState {
  return cardsOf(state).filter((c) => c.preset).reduce((s, c) => dropCard(s, c.id, today), state);
}

/** RotateCcw: presets come back, with their history when they had any. */
export function restorePresets(state: LedgerState): LedgerState {
  const cards = storedCards(state).map((c) => (c.preset && c.archived ? { ...c, archived: undefined, archivedOn: undefined } : c));
  const { cardsOff: _drop, ...rest } = state;
  return { ...(rest as LedgerState), cards: cards.map(normalizeCard) };
}

/* ---------- figures ---------- */

const payDay = (l: Line) => l.bookedOn || `${l.monthKey}-01`;

/** Payments that the latest reading does not include yet: dated on/after it and not seen when it was saved. */
function paidSince(state: LedgerState, card: CreditCard, snap: CardSnap | undefined, until?: string): number {
  return cardPays(state, card.id).reduce((s, l) => {
    const d = payDay(l);
    if (until && d > until) return s;
    if (snap && (d < snap.on || snap.seen?.includes(l.id))) return s;
    return s + convertMinor(l.amountMinor, l.currency, card.currency, state.settings.rateE4);
  }, 0);
}

export type CardFigures = {
  known: boolean;
  balance: number;
  limit: number | null;
  avail: number | null;
  /** 0–1+ (balance / limit), null when no limit is known. */
  util: number | null;
  min: number | null;
  dueOn: string;
  last: CardSnap | null;
  /** Change since the previous reading on another day (positive = the debt grew). */
  delta: number | null;
  since: string;
  paid: number;
};

/** The day of the next payment: the bank's date when it is still ahead, else the card's due day. */
export function nextDue(card: CreditCard, last: CardSnap | null, today = todayIso()): string {
  if (last?.dueOn && last.dueOn >= today) return last.dueOn;
  if (!card.dueDay) return "";
  const t = new Date(`${today}T12:00:00`);
  for (let k = 0; k < 2; k++) {
    const y = t.getFullYear(), m = t.getMonth() + k;
    const last = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(card.dueDay, last), 12);
    const iso = todayIso(d);
    if (iso >= today) return iso;
  }
  return "";
}

export function cardFigures(state: LedgerState, card: CreditCard, today = todayIso()): CardFigures {
  const last = card.snaps[card.snaps.length - 1] ?? null;
  const paid = last ? paidSince(state, card, last) : 0;
  const balance = last ? Math.max(0, last.balanceMinor - paid) : 0;
  const limit = card.limitMinor ?? last?.limitMinor ?? (last && last.availMinor != null ? last.balanceMinor + last.availMinor : null);
  const avail = limit != null ? Math.max(0, limit - balance) : null;
  const prev = last ? [...card.snaps].reverse().find((s) => s.on < last.on) ?? null : null;
  return {
    known: !!last, balance, limit, avail,
    util: limit && limit > 0 ? balance / limit : null,
    min: last?.minMinor ?? null,
    dueOn: nextDue(card, last, today),
    last, paid,
    delta: last && prev ? last.balanceMinor - prev.balanceMinor : null,
    since: prev?.on ?? "",
  };
}

/** Balance at the end of a day (for the debt chart): the last reading on/before it minus payments after it up to that day. */
export function cardBalanceAt(state: LedgerState, card: CreditCard, day: string): number {
  if (card.archived && card.archivedOn && card.archivedOn <= day) return 0;
  const snap = [...card.snaps].reverse().find((s) => s.on <= day);
  if (!snap) return 0;
  return Math.max(0, snap.balanceMinor - paidSince(state, card, snap, day));
}

/** Totals of the cards on screen, in the view currency. */
export function cardTotals(state: LedgerState | null | undefined, today = todayIso()) {
  const zero = { count: 0, known: 0, balance: 0, limit: 0, avail: 0, min: 0, util: null as number | null, limited: 0 };
  if (!state) return zero;
  const { display, rateE4 } = state.settings;
  const v = (m: number, c: Currency) => convertMinor(m, c, display, rateE4);
  const acc = cardsOf(state).reduce((a, c) => {
    const f = cardFigures(state, c, today);
    if (!f.known) return { ...a, count: a.count + 1 };
    return {
      ...a, count: a.count + 1, known: a.known + 1, balance: a.balance + v(f.balance, c.currency),
      limit: a.limit + (f.limit ? v(f.limit, c.currency) : 0), limited: a.limited + (f.limit ? v(f.balance, c.currency) : 0),
      avail: a.avail + (f.avail ? v(f.avail, c.currency) : 0), min: a.min + (f.min ? v(f.min, c.currency) : 0),
    };
  }, zero);
  return { ...acc, util: acc.limit > 0 ? acc.limited / acc.limit : null };
}

/* ---------- writing ---------- */

export type CardUpdate = { lastPayMinor?: number | null; lastPayOn?: string; notes?: { label: string; text: string }[]; aprBps?: number | null; balanceMinor: number; availMinor?: number | null; limitMinor?: number | null; minMinor?: number | null; dueOn?: string; statementMinor?: number | null; last4?: string; autopay?: boolean | null; on?: string; src: "shot" | "manual" };

/** Stores one reading (never replaces an older one; an identical repeat on the same day is skipped). */
export function addReading(state: LedgerState, cardId: string, u: CardUpdate, today = todayIso(), now = new Date().toISOString()): LedgerState {
  const card = cardsOf(state).find((c) => c.id === cardId) ?? storedCards(state).find((c) => c.id === cardId);
  if (!card || !Number.isFinite(u.balanceMinor) || u.balanceMinor < 0) return state;
  const on = u.on && ISO_DAY.test(u.on) ? u.on : today;
  const snap = normalizeSnap({
    on, at: now, balanceMinor: u.balanceMinor, src: u.src,
    ...(u.availMinor != null ? { availMinor: u.availMinor } : {}),
    ...(u.limitMinor != null ? { limitMinor: u.limitMinor } : {}),
    ...(u.minMinor != null ? { minMinor: u.minMinor } : {}),
    ...(u.statementMinor != null ? { statementMinor: u.statementMinor } : {}),
    ...(u.dueOn ? { dueOn: u.dueOn } : {}),
    ...(u.aprBps ? { aprBps: u.aprBps } : {}),
    ...(u.lastPayMinor != null ? { lastPayMinor: u.lastPayMinor } : {}),
    ...(u.lastPayOn ? { lastPayOn: u.lastPayOn } : {}),
    ...(u.notes?.length ? { notes: u.notes } : {}),
    seen: cardPays(state, card.id).map((l) => l.id),
  })!;
  const last = card.snaps[card.snaps.length - 1];
  const same = last && last.on === snap.on && last.balanceMinor === snap.balanceMinor && last.availMinor === snap.availMinor && last.minMinor === snap.minMinor && last.limitMinor === snap.limitMinor && last.dueOn === snap.dueOn;
  const snaps = same ? card.snaps : [...card.snaps, snap];
  const dueDay = snap.dueOn ? Number(snap.dueOn.slice(8, 10)) : card.dueDay;
  return putCard(state, {
    ...card, snaps, dueDay, archived: undefined, archivedOn: undefined,
    ...(u.last4 && /^\d{4}$/.test(u.last4) ? { last4: u.last4 } : {}),
    ...(u.autopay != null ? { autopay: u.autopay } : {}),
    ...(u.aprBps && u.aprBps > 0 ? { aprBps: u.aprBps } : {}),
  });
}

/** "Abonar": a transfer line toward the card (inactive xfer, so it never counts as spending), in the card's currency. */
export function payCard(state: LedgerState, cardId: string, amountMinor: number, date: string, id: string, label: string): LedgerState {
  const card = cardsOf(state).find((c) => c.id === cardId) ?? storedCards(state).find((c) => c.id === cardId);
  if (!card || amountMinor <= 0) return state;
  const day = ISO_DAY.test(date) ? date : todayIso();
  const line: Line = {
    id, seriesId: id, monthKey: day.slice(0, 7), kind: "expense-variable", concept: `${label} · ${card.name}`, amountMinor, currency: card.currency,
    active: false, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: card.aprBps, balanceMinor: null, balanceCurrency: card.currency, icon: "CreditCard", history: [],
    bookedOn: day, xfer: true, cardId,
  };
  const bucket = state.months[line.monthKey] ?? { lines: [] };
  const withLine = { ...state, months: { ...state.months, [line.monthKey]: { lines: [...bucket.lines, line] } } };
  // A preset paid before any reading becomes stored so the payment has its card.
  return storedCards(withLine).some((c) => c.id === card.id) ? withLine : putCard(withLine, card);
}

/** When a card has no APR yet the plan estimates with a typical card rate and says so. */
export const APR_GUESS_BPS = 2400;

/** Whole months from today until a promo 0% ends (0 when none or past). */
export function promoMonths(promoUntil: string | undefined, today = todayIso()): number {
  if (!promoUntil || promoUntil <= today) return 0;
  const a = new Date(`${today}T12:00:00`), b = new Date(`${promoUntil}T12:00:00`);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0));
}

/** Interest a card costs this month at its rate (0 inside a promo), in the card's currency. */
export function cardMonthlyInterest(card: CreditCard, balance: number, today = todayIso()): number {
  if (promoMonths(card.promoUntil, today) > 0) return 0;
  return Math.round((balance * (card.aprBps || APR_GUESS_BPS)) / (10000 * 12));
}

/** Card line in the payoff plan (view currency): revolving interest on what is left, its minimum payment. */
export function cardPlanDebts(state: LedgerState | null | undefined, today = todayIso()) {
  if (!state) return [];
  const { display, rateE4 } = state.settings;
  return cardsOf(state).map((c) => {
    const f = cardFigures(state, c, today);
    const left = convertMinor(f.balance, c.currency, display, rateE4);
    const apr = c.aprBps || APR_GUESS_BPS;
    const free = promoMonths(c.promoUntil, today);
    // A minimum the bank showed; else the usual floor (1% + interest, at least $25, never above the balance).
    const est = Math.max(convertMinor(2500, "USD", display, rateE4), Math.round(left * 0.01 + (free ? 0 : (left * apr) / (10000 * 12))));
    const min = Math.min(left, f.min != null && f.min > 0 ? convertMinor(f.min, c.currency, display, rateE4) : est);
    return {
      id: c.id, name: c.name, left, monthlyInterest: free ? 0 : Math.round((left * apr) / (10000 * 12)), aprBps: apr, revolving: true, min, card: true,
      minGuess: !(f.min != null && f.min > 0), aprGuess: !c.aprBps, freeMonths: free,
    };
  }).filter((d) => d.left > 0);
}

/** Utilization advice level: under 10% great, under 30% fine, under 50% high, else very high. */
export function utilLevel(util: number | null): "none" | "great" | "ok" | "high" | "max" {
  if (util == null) return "none";
  if (util < 0.1) return "great";
  if (util < 0.3) return "ok";
  if (util < 0.5) return "high";
  return "max";
}

/** What would bring utilization under 30% (view currency), 0 when already under. */
export function toThirty(balance: number, limit: number): number {
  return limit > 0 ? Math.max(0, balance - Math.floor(limit * 0.3)) : 0;
}

/* ---------- rewards (1.3.109) ---------- */
/*
 * A card's rewards (cash back) are money the bank holds for the user: an ASSET, counted on the "Me deben" side and in the
 * Balance neto, never subtracted from the card debt. Every update is a dated reading (`rw`), like the balance readings.
 * Canjear (redeem) never counts twice:
 * - statement credit: a transfer line toward the card (xfer, inactive, cardId + rwCard) lowers the card balance, and the
 *   rewards reading drops by the same amount. Asset and debt fall together; nothing is spending or income.
 * - deposit to the bank: an income line (rwCard) and the rewards reading drops by the same amount. The money moves from
 *   "rewards" to "income"; Estudio counts rewards when they are EARNED (reading increases), so it skips these lines.
 */

export type RewardsNow = { known: boolean; amount: number; points: number | null; on: string; last: RewardSnap | null };

/** The card's rewards today (card currency): the latest money reading (a redemption counts), points as a note. */
export function rewardsOf(card: Pick<CreditCard, "rw">): RewardsNow {
  const rw = card.rw ?? [];
  const money = [...rw].reverse().find((s) => s.amountMinor !== undefined) ?? null;
  const pts = [...rw].reverse().find((s) => s.points !== undefined) ?? null;
  return { known: !!money, amount: money?.amountMinor ?? 0, points: pts?.points ?? null, on: money?.on ?? pts?.on ?? "", last: money };
}

/** Rewards on/before a day (card currency), 0 before the first reading or after the card was archived. */
export function rewardsAt(card: CreditCard, day: string): number {
  if (card.archived && card.archivedOn && card.archivedOn <= day) return 0;
  const s = [...(card.rw ?? [])].reverse().find((x) => x.on <= day && x.amountMinor !== undefined);
  return s?.amountMinor ?? 0;
}

/** Rewards of the cards on screen, in the view currency, biggest first. Archived cards drop out (their history stays). */
export function rewardsTotals(state: LedgerState | null | undefined) {
  if (!state) return { total: 0, count: 0, rows: [] as { card: CreditCard; minor: number; view: number; points: number | null; on: string }[] };
  const { display, rateE4 } = state.settings;
  const rows = cardsOf(state).map((card) => {
    const r = rewardsOf(card);
    return { card, minor: r.amount, view: convertMinor(r.amount, card.currency, display, rateE4), points: r.points, on: r.on };
  }).filter((r) => r.minor > 0 || (r.points ?? 0) > 0).sort((a, b) => b.view - a.view);
  return { total: rows.reduce((s, r) => s + r.view, 0), count: rows.filter((r) => r.minor > 0).length, rows };
}

/**
 * What each reading added (card currency): increases since the previous money reading; after a redemption the count
 * starts again from what was left. A drop without a redemption in Faro (redeemed at the bank) just resets the base.
 */
export function rewardsEarned(card: Pick<CreditCard, "rw">): { on: string; minor: number }[] {
  const out: { on: string; minor: number }[] = [];
  let prev = 0;
  for (const s of card.rw ?? []) {
    if (s.amountMinor === undefined) continue;
    if (s.src !== "redeem" && s.amountMinor > prev) out.push({ on: s.on, minor: s.amountMinor - prev });
    prev = s.amountMinor;
  }
  return out;
}

export type RewardsUpdate = { amountMinor?: number | null; points?: number | null; earnedMinor?: number | null; earnedSpan?: "year" | "life" | null; src: "shot" | "manual"; on?: string };

/** Stores one rewards reading (never replaces an older one; the same values again on the same day are skipped). */
export function addRewards(state: LedgerState, cardId: string, u: RewardsUpdate, today = todayIso(), now = new Date().toISOString()): LedgerState {
  const card = cardsOf(state).find((c) => c.id === cardId) ?? storedCards(state).find((c) => c.id === cardId);
  const amount = u.amountMinor != null && Number.isFinite(u.amountMinor) && u.amountMinor >= 0 ? Math.round(u.amountMinor) : undefined;
  const points = u.points != null && Number.isFinite(u.points) && u.points >= 0 ? Math.round(u.points) : undefined;
  const earned = u.earnedMinor != null && Number.isFinite(u.earnedMinor) && u.earnedMinor >= 0 ? Math.round(u.earnedMinor) : undefined;
  if (!card || (amount === undefined && points === undefined && earned === undefined)) return state;
  const on = u.on && ISO_DAY.test(u.on) ? u.on : today;
  const rw = card.rw ?? [];
  const last = rw[rw.length - 1];
  if (last && last.on === on && last.amountMinor === amount && last.points === points && last.earnedMinor === earned) return state;
  const snap = normalizeRw({ on, at: now, src: u.src, ...(amount !== undefined ? { amountMinor: amount } : {}), ...(points !== undefined ? { points } : {}), ...(earned !== undefined ? { earnedMinor: earned, earnedSpan: u.earnedSpan === "life" ? "life" : "year" } : {}) })!;
  return putCard(state, { ...card, rw: [...rw, snap], archived: undefined, archivedOn: undefined });
}

/**
 * Canjear: uses `amountMinor` (card currency, at most what is there) of the card's rewards.
 * "credit" → a transfer toward the card (lowers its balance; never spending or income).
 * "deposit" → an income line "Recompensas de tarjetas" with the card as its source.
 * Either way the rewards reading drops by the same amount, so the money is never counted twice.
 */
export function redeemRewards(state: LedgerState, cardId: string, how: "credit" | "deposit", amountMinor: number, date: string, id: string, label: string, now = new Date().toISOString()): LedgerState {
  const card = cardsOf(state).find((c) => c.id === cardId) ?? storedCards(state).find((c) => c.id === cardId);
  if (!card) return state;
  const have = rewardsOf(card).amount;
  const use = Math.min(have, Math.round(amountMinor));
  if (!(use > 0)) return state;
  const day = ISO_DAY.test(date) ? date : todayIso();
  const base: Line = {
    id, seriesId: id, monthKey: day.slice(0, 7), kind: how === "credit" ? "expense-variable" : "income-variable", concept: `${label} · ${card.name}`, amountMinor: use, currency: card.currency,
    active: how === "deposit", note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "",
    cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: card.currency, icon: "BadgePercent", history: [], bookedOn: day, rwCard: card.id,
    ...(how === "credit" ? { xfer: true, cardId: card.id } : {}),
  };
  const bucket = state.months[base.monthKey] ?? { lines: [] };
  const withLine = { ...state, months: { ...state.months, [base.monthKey]: { lines: [...bucket.lines, base] } } };
  const snap = normalizeRw({ on: day, at: now, amountMinor: have - use, src: "redeem", redeemed: use, how, lineId: id })!;
  return putCard(withLine, { ...card, rw: [...(card.rw ?? []), snap] });
}

/** Redemption lines of a card (statement credits and deposits), oldest first. */
export function rewardLines(state: LedgerState, id: string): Line[] {
  const out: Line[] = [];
  for (const bucket of Object.values(state.months)) for (const line of bucket.lines) if (line.rwCard === id) out.push(line);
  return out.sort((a, b) => (a.bookedOn || a.monthKey).localeCompare(b.bookedOn || b.monthKey));
}
