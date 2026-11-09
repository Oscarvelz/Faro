/**
 * People (Nov 2026): someone the user spends on, usually gifts. There is no second money system:
 * a gift is a normal expense line with `personId`. This file only reads those lines.
 */
import { dateFmt } from "./datefmt";
import { convertMinor } from "./money";
import type { Currency, Lang, LedgerState, Line, OccasionKind, Person, PersonDate } from "./types";
import { NO_YEAR, type ImportedContact } from "./vcard";

/** Preset occasions (with a usual Nicaraguan date when it is fixed). */
export const OCCASIONS: { kind: Exclude<OccasionKind, "custom">; es: string; en: string; md?: string }[] = [
  { kind: "anniversary", es: "Aniversario", en: "Anniversary" },
  { kind: "mother", es: "Día de la Madre", en: "Mother's Day", md: "05-30" },
  { kind: "father", es: "Día del Padre", en: "Father's Day", md: "06-23" },
  { kind: "christmas", es: "Navidad", en: "Christmas", md: "12-25" },
  { kind: "graduation", es: "Graduación", en: "Graduation" },
  { kind: "saint", es: "Santo", en: "Saint's day" },
];

/** Old dates had only a label: read a matching preset, otherwise keep it as a custom label. */
function normalizeDate(d: PersonDate): PersonDate {
  if (d.kind) return d;
  const key = (d.label ?? "").trim().toLowerCase();
  const hit = OCCASIONS.find((o) => o.es.toLowerCase() === key || o.en.toLowerCase() === key);
  return { ...d, label: d.label ?? "", kind: hit ? hit.kind : "custom" };
}
export function normalizePerson(p: Person): Person {
  return { ...p, birthday: p.birthday ?? "", note: p.note ?? "", dates: Array.isArray(p.dates) ? p.dates.map(normalizeDate) : [] };
}

export function occasionLabel(d: PersonDate, lang: Lang): string {
  const o = d.kind && d.kind !== "custom" ? OCCASIONS.find((x) => x.kind === d.kind) : undefined;
  if (o) return lang === "en" ? o.en : o.es;
  return d.label.trim() || (lang === "en" ? "Date" : "Fecha");
}

export const archivedSuffix = (lang: Lang) => (lang === "en" ? " · deleted" : " · eliminada");
export function personName(p: Person, lang: Lang): string {
  return p.archived ? `${p.name}${archivedSuffix(lang)}` : p.name;
}


/** Everyone, archived included (history and totals still name them). Old data is normalized on read. */
export function peopleOf(state: LedgerState | null | undefined): Person[] {
  return Array.isArray(state?.people) ? state!.people!.map(normalizePerson) : [];
}
/** People shown in Personas and the pickers. */
export function activePeople(state: LedgerState | null | undefined): Person[] {
  return peopleOf(state).filter((p) => !p.archived);
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
  return { date, days: Math.round((at(date) - at(today)) / DAY), age: born > NO_YEAR ? Number(date.slice(0, 4)) - born : null };
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

export type PersonTotals = { total: number; count: number; years: { year: number; minor: number }[]; byBirthday: boolean; occasions: { id: string; minor: number }[] };

/** Total given, and per birthday year (or per calendar year when no birthday is set), in the view currency. */
export function personTotals(state: LedgerState, person: Person, display: Currency, rateE4: number): PersonTotals {
  const lines = personLines(state, person.id);
  const byBirthday = /^\d{4}-\d{2}-\d{2}$/.test(person.birthday);
  const years = new Map<number, number>();
  const occ = new Map<string, number>();
  let total = 0;
  for (const line of lines) {
    const minor = convertMinor(line.amountMinor, line.currency, display, rateE4);
    total += minor;
    const oid = line.occasionId && (line.occasionId === "birthday" || person.dates.some((d) => d.id === line.occasionId)) ? line.occasionId : "";
    occ.set(oid, (occ.get(oid) ?? 0) + minor);
    const day = lineDay(line);
    const year = byBirthday ? birthdayYear(day, person.birthday) : Number(day.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + minor);
  }
  // The breakdown only means something once at least one gift names its occasion.
  const occasions = [...occ.keys()].some(Boolean) ? [...occ.entries()].map(([id, minor]) => ({ id, minor })).sort((a, b) => (a.id === "" ? 1 : b.id === "" ? -1 : b.minor - a.minor)) : [];
  return { total, count: lines.length, byBirthday, occasions, years: [...years.entries()].map(([year, minor]) => ({ year, minor })).sort((a, b) => b.year - a.year) };
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

export type Occasion = { person: Person; id: string; kind: OccasionKind | "birthday"; date: PersonDate | null; next: { date: string; days: number; age: number | null } };

/** Every yearly date of one person (birthday first), with its next day on or after today. */
export function occasionsOf(person: Person, today = todayIso()): Occasion[] {
  const out: Occasion[] = [];
  const bd = nextBirthday(person.birthday, today);
  if (bd) out.push({ person, id: "birthday", kind: "birthday", date: null, next: bd });
  for (const d of person.dates ?? []) {
    const n = nextBirthday(d.date, today);
    if (n) out.push({ person, id: d.id, kind: d.kind ?? "custom", date: d, next: { ...n, age: null } });
  }
  return out.sort((x, y) => x.next.days - y.next.days);
}

export function occasionName(o: Pick<Occasion, "kind" | "date">, lang: Lang): string {
  if (o.kind === "birthday" || !o.date) return lang === "en" ? "Birthday" : "Cumpleaños";
  return occasionLabel(o.date, lang);
}

/** Yearly dates (birthdays and other occasions) in the next `within` days, soonest first. Archived people are left out. */
export function upcoming(people: Person[], within = 45, today = todayIso()): Occasion[] {
  return people.filter((p) => !p.archived).flatMap((p) => occasionsOf(p, today)).filter((o) => o.next.days <= within).sort((a, b) => a.next.days - b.next.days);
}

export type PeopleAdvice = { name: string; occasion: string; birthday: boolean; days: number; last: number; ready: number; weekly: number; year: number; given: number; share: number | null; kind: "soon" | "year" };

/** What was given for one non-birthday occasion in a calendar year (gifts tagged to it). */
function occasionYear(state: LedgerState, person: Person, id: string, year: number, display: Currency, rateE4: number): number {
  let minor = 0;
  for (const line of personLines(state, person.id)) if (line.occasionId === id && lineDay(line).startsWith(`${year}-`)) minor += convertMinor(line.amountMinor, line.currency, display, rateE4);
  return minor;
}

/**
 * One insight for the Asesor. A date within 30 days: what you gave last time and how much a week sets it aside.
 * Otherwise: what gifts took this year and their share of spending.
 */
export function peopleAdvice(state: LedgerState, display: Currency, rateE4: number, today = todayIso(), lang: Lang = "es"): PeopleAdvice | null {
  const people = peopleOf(state);
  if (!people.length) return null;
  const soon = upcoming(people, 30, today)[0];
  const year = Number(today.slice(0, 4));
  const yearly = spendByPerson(state, year, display, rateE4);
  const share = yearly.spent > 0 ? yearly.total / yearly.spent : null;
  if (soon) {
    const nextYear = Number(soon.next.date.slice(0, 4));
    let last: number;
    let ready: number;
    if (soon.kind === "birthday") {
      const totals = personTotals(state, soon.person, display, rateE4);
      last = totals.years.find((y) => y.year === nextYear - 1)?.minor ?? 0;
      ready = totals.years.find((y) => y.year === nextYear)?.minor ?? 0;
    } else {
      last = occasionYear(state, soon.person, soon.id, nextYear - 1, display, rateE4);
      ready = occasionYear(state, soon.person, soon.id, nextYear, display, rateE4);
    }
    const weeks = Math.max(1, Math.ceil(soon.next.days / 7));
    return { kind: "soon", name: soon.person.name, occasion: occasionName(soon, lang), birthday: soon.kind === "birthday", days: soon.next.days, last, ready, weekly: last > 0 ? Math.ceil(last / weeks / 100) * 100 : 0, year, given: yearly.total, share };
  }
  if (yearly.total <= 0) return null;
  return { kind: "year", name: yearly.rows[0]?.person.name ?? "", occasion: "", birthday: false, days: 0, last: 0, ready: 0, weekly: 0, year, given: yearly.total, share };
}

/** Name key for de-duplication: case, accents and extra spaces do not matter. */
export const nameKey = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Adds imported contacts to the people list. Same name → the same person: a missing birthday or date is filled,
 * an archived person comes back. Returns the new list and what happened.
 */
export function mergeContacts(people: Person[], contacts: ImportedContact[], makeId: () => string) {
  const next = people.map((p) => ({ ...p, dates: [...(p.dates ?? [])] }));
  let added = 0;
  let restored = 0;
  let updated = 0;
  const noBirthday: string[] = [];
  for (const c of contacts) {
    const key = nameKey(c.name);
    if (!key) continue;
    let p = next.find((x) => nameKey(x.name) === key);
    if (!p) {
      p = { id: makeId(), name: c.name.trim(), birthday: "", dates: [], note: "" };
      next.push(p);
      added++;
    } else if (p.archived) { delete p.archived; restored++; }
    else updated++;
    if (c.birthday && !p.birthday) p.birthday = c.birthday;
    for (const d of c.dates) {
      if (!p.dates.some((x) => x.date.slice(5) === d.date.slice(5) && (x.kind ?? "custom") === d.kind)) p.dates.push({ id: makeId(), label: d.label, date: d.date, kind: d.kind });
    }
    if (!p.birthday) noBirthday.push(p.name);
  }
  return { people: next, added, restored, updated, noBirthday };
}

export function dayLabel(iso: string, lang: Lang): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return dateFmt(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(d).replace(/\.$/, "");
}
