/**
 * People (Nov 2026): someone the user spends on, usually gifts. There is no second money system:
 * a gift is a normal expense line with `personId`. This file only reads those lines.
 */
import { convertMinor } from "./money";
import type { Currency, Lang, LedgerState, Line, Person } from "./types";

export function peopleOf(state: LedgerState | null | undefined): Person[] {
  return Array.isArray(state?.people) ? state!.people! : [];
}

/** Day the line counts on: its own date, or the middle of its month. */
export function lineDay(line: Line): string {
  return line.bookedOn && /^\d{4}-\d{2}-\d{2}/.test(line.bookedOn) ? line.bookedOn.slice(0, 10) : `${line.monthKey}-15`;
}

/** Every spending line tagged with this person (income never counts). */
export function personLines(state: LedgerState, id: string): Line[] {
  const out: Line[] = [];
  for (const bucket of Object.values(state.months)) for (const line of bucket.lines) if (line.personId === id && line.active && !line.kind.startsWith("income")) out.push(line);
  return out.sort((a, b) => lineDay(b).localeCompare(lineDay(a)));
}

const DAY = 86400000;
const at = (iso: string) => new Date(`${iso}T12:00:00`).getTime();
const pad = (n: number) => String(n).padStart(2, "0");

/** The birthday in a given year (29 Feb falls on 28 Feb in other years). */
export function birthdayIn(birthday: string, year: number): string {
  const m = Number(birthday.slice(5, 7));
  let d = Number(birthday.slice(8, 10));
  const last = new Date(year, m, 0).getDate();
  if (d > last) d = last;
  return `${year}-${pad(m)}-${pad(d)}`;
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Next birthday on or after today: its date, days left and the age it brings when the year is known. */
export function nextBirthday(birthday: string, today = todayIso()): { date: string; days: number; age: number | null } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const y = Number(today.slice(0, 4));
  let date = birthdayIn(birthday, y);
  if (date < today) date = birthdayIn(birthday, y + 1);
  const born = Number(birthday.slice(0, 4));
  return { date, days: Math.round((at(date) - at(today)) / DAY), age: born > 1900 ? Number(date.slice(0, 4)) - born : null };
}

/** The birthday a gift belongs to: the nearest one to the day it was bought (before or after). */
export function birthdayYear(day: string, birthday: string): number {
  const y = Number(day.slice(0, 4));
  let best = y;
  let gap = Infinity;
  for (const year of [y - 1, y, y + 1]) {
    const g = Math.abs(at(birthdayIn(birthday, year)) - at(day));
    if (g < gap || (g === gap && year > best)) { gap = g; best = year; }
  }
  return best;
}

export type PersonTotals = { total: number; count: number; years: { year: number; minor: number }[]; byBirthday: boolean };

/** Total given, and per birthday year (or per calendar year when no birthday is set), in the view currency. */
export function personTotals(state: LedgerState, person: Person, display: Currency, rateE4: number): PersonTotals {
  const lines = personLines(state, person.id);
  const byBirthday = /^\d{4}-\d{2}-\d{2}$/.test(person.birthday);
  const years = new Map<number, number>();
  let total = 0;
  for (const line of lines) {
    const minor = convertMinor(line.amountMinor, line.currency, display, rateE4);
    total += minor;
    const day = lineDay(line);
    const year = byBirthday ? birthdayYear(day, person.birthday) : Number(day.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + minor);
  }
  return { total, count: lines.length, byBirthday, years: [...years.entries()].map(([year, minor]) => ({ year, minor })).sort((a, b) => b.year - a.year) };
}

/** Spending by person in one calendar year (Estudio). */
export function spendByPerson(state: LedgerState, year: number, display: Currency, rateE4: number) {
  const people = peopleOf(state);
  const rows = people.map((person) => {
    let minor = 0;
    for (const line of personLines(state, person.id)) if (line.monthKey.startsWith(`${year}-`)) minor += convertMinor(line.amountMinor, line.currency, display, rateE4);
    return { person, minor };
  }).filter((r) => r.minor !== 0).sort((a, b) => b.minor - a.minor);
  let spent = 0;
  for (const [key, bucket] of Object.entries(state.months)) {
    if (!key.startsWith(`${year}-`)) continue;
    for (const line of bucket.lines) if (line.active && !line.kind.startsWith("income")) spent += convertMinor(line.amountMinor, line.currency, display, rateE4);
  }
  return { rows, total: rows.reduce((s, r) => s + r.minor, 0), spent };
}

/** Birthdays in the next `within` days, soonest first. */
export function upcoming(people: Person[], within = 45, today = todayIso()) {
  return people
    .map((person) => ({ person, next: nextBirthday(person.birthday, today) }))
    .filter((x): x is { person: Person; next: NonNullable<ReturnType<typeof nextBirthday>> } => !!x.next && x.next.days <= within)
    .sort((a, b) => a.next.days - b.next.days);
}

export type PeopleAdvice = { name: string; days: number; last: number; ready: number; weekly: number; year: number; given: number; share: number | null; kind: "soon" | "year" };

/**
 * One insight for the Asesor. A birthday within 30 days: what you gave last time and how much a week sets it aside.
 * Otherwise: what gifts took this year and their share of spending.
 */
export function peopleAdvice(state: LedgerState, display: Currency, rateE4: number, today = todayIso()): PeopleAdvice | null {
  const people = peopleOf(state);
  if (!people.length) return null;
  const soon = upcoming(people, 30, today)[0];
  const year = Number(today.slice(0, 4));
  const yearly = spendByPerson(state, year, display, rateE4);
  if (soon) {
    const totals = personTotals(state, soon.person, display, rateE4);
    const nextYear = Number(soon.next.date.slice(0, 4));
    const last = totals.years.find((y) => y.year === nextYear - 1)?.minor ?? 0;
    const ready = totals.years.find((y) => y.year === nextYear)?.minor ?? 0;
    const weeks = Math.max(1, Math.ceil(soon.next.days / 7));
    return { kind: "soon", name: soon.person.name, days: soon.next.days, last, ready, weekly: last > 0 ? Math.ceil(last / weeks / 100) * 100 : 0, year, given: yearly.total, share: yearly.spent > 0 ? yearly.total / yearly.spent : null };
  }
  if (yearly.total <= 0) return null;
  return { kind: "year", name: yearly.rows[0]?.person.name ?? "", days: 0, last: 0, ready: 0, weekly: 0, year, given: yearly.total, share: yearly.spent > 0 ? yearly.total / yearly.spent : null };
}

export function dayLabel(iso: string, lang: Lang): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(/\.$/, "");
}
