import { uid } from "./money.ts";
import { FREQ_DEFAULT, nextDueFrom } from "./cadence.ts";
import type { LedgerState, Line } from "./types";

export type Session = {
  ledger: LedgerState;
  past: LedgerState[];
  future: LedgerState[];
  dirty: boolean;
};

export function blankSession(ledger: LedgerState, dirty = false): Session {
  return { ledger, past: [], future: [], dirty };
}

export function commit(session: Session, recipe: (s: LedgerState) => LedgerState, detail: string | (() => string)): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  const updatedAt = new Date().toISOString();
  const ledger: LedgerState = {
    ...drafted,
    revision: snap.revision + 1,
    updatedAt,
    // 1.3.170: the detail may be a thunk, resolved only after the recipe ran, so the activity
    // entry can carry an outcome the recipe itself computed (the undo-import preserved count, N1).
    audit: [{ id: uid(), at: updatedAt, detail: typeof detail === "function" ? detail() : detail }, ...snap.audit].slice(0, 80),
  };
  return {
    ledger,
    past: [...session.past, snap].slice(-40),
    future: [],
    dirty: true,
  };
}

export function undo(session: Session): Session {
  const prev = session.past[session.past.length - 1];
  if (!prev) return session;
  const updatedAt = new Date().toISOString();
  return {
    ledger: { ...prev, revision: session.ledger.revision + 1, updatedAt },
    past: session.past.slice(0, -1),
    future: [session.ledger, ...session.future].slice(0, 40),
    dirty: true,
  };
}

export function redo(session: Session): Session {
  const next = session.future[0];
  if (!next) return session;
  const updatedAt = new Date().toISOString();
  return {
    ledger: { ...next, revision: session.ledger.revision + 1, updatedAt },
    past: [...session.past, session.ledger].slice(-40),
    future: session.future.slice(1),
    dirty: true,
  };
}

export function upsertLine(state: LedgerState, line: Line): LedgerState {
  const bucket = state.months[line.monthKey] ?? { lines: [] };
  const exists = bucket.lines.some((l) => l.id === line.id);
  const lines = exists ? bucket.lines.map((l) => (l.id === line.id ? line : l)) : [...bucket.lines, line];
  return { ...state, months: { ...state.months, [line.monthKey]: { lines } } };
}

export function deleteLine(state: LedgerState, monthKey: string, id: string): LedgerState {
  const bucket = state.months[monthKey];
  if (!bucket) return state;
  return {
    ...state,
    months: { ...state.months, [monthKey]: { lines: bucket.lines.filter((l) => l.id !== id) } },
  };
}

export function copyRecurring(state: LedgerState, from: string, to: string): { state: LedgerState; count: number } {
  if (from === to) return { state, count: 0 };
  const src = state.months[from]?.lines ?? [];
  const dst = state.months[to]?.lines ?? [];
  const have = new Set(dst.map((l) => l.seriesId || l.id));
  const additions = src
    .filter((l) => (l.recurring || l.kind === "subscription") && l.active)
    .filter((l) => !have.has(l.seriesId || l.id))
    .flatMap((l) => {
      // 1.3.76 intervals ("3m", "1d"…): carry only into a month the rhythm falls in, dated on that payment. Old words keep the old copy.
      const from0 = l.nextDue || l.bookedOn;
      if (!l.cadence || FREQ_DEFAULT.includes(l.cadence) || !from0) return [{ ...l, id: uid(), monthKey: to }];
      const due = nextDueFrom(from0, l.cadence, `${to}-01`);
      if (due.slice(0, 7) !== to) return [];
      return [{ ...l, id: uid(), monthKey: to, nextDue: due, bookedOn: due }];
    });
  if (!additions.length) return { state, count: 0 };
  return {
    count: additions.length,
    state: { ...state, months: { ...state.months, [to]: { lines: [...dst, ...additions] } } },
  };
}
