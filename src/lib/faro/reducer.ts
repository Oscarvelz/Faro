import { uid } from "./money";
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

export function commit(session: Session, recipe: (s: LedgerState) => LedgerState, detail: string): Session {
  const snap: LedgerState = session.ledger;
  const drafted = recipe(snap);
  const updatedAt = new Date().toISOString();
  const ledger: LedgerState = {
    ...drafted,
    revision: snap.revision + 1,
    updatedAt,
    audit: [{ id: uid(), at: updatedAt, detail }, ...snap.audit].slice(0, 80),
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
    .map((l) => ({ ...l, id: uid(), monthKey: to }));
  if (!additions.length) return { state, count: 0 };
  return {
    count: additions.length,
    state: { ...state, months: { ...state.months, [to]: { lines: [...dst, ...additions] } } },
  };
}
