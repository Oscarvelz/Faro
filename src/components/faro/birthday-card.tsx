import "./birthday.css";
import { useState } from "react";
import { Cake, ChevronDown, X } from "lucide-react";
import { dateFmt } from "@/lib/faro/datefmt";
import { formatMoney } from "@/lib/faro/money";
import { activePeople, personTotals, todayIso, upcoming, type Occasion } from "@/lib/faro/people";
import type { Lang, Person } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { personHue } from "./people";

/* 1.3.425 (Oscar, 2026-11-22): el cumpleaños tiene su tarjeta propia EN
 * CENTRAL — aparece tres días antes, permanece el día mismo y se retira
 * sola al pasar; se puede quitar a mano (✕, por instancia: persona +
 * fecha, para que el año próximo vuelva). No viste la tarjeta común:
 * lleva un acabado especial, celebratorio, con los tokens del tema.
 * Lee la MISMA fuente que la tarjeta del Asesor (people.ts: upcoming +
 * personTotals), para que las dos digan lo mismo. */

const L = (lang: Lang, es: string, en: string) => (lang === "en" ? en : es);
const DISMISS_KEY = "faro-bday-dismissed";

function readDismissed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch { return []; }
}

function whenWord(days: number, lang: Lang) {
  if (days === 0) return L(lang, "hoy", "today");
  if (days === 1) return L(lang, "mañana", "tomorrow");
  return L(lang, `en ${days} días`, `in ${days} days`);
}

function fullDate(iso: string, lang: Lang) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return dateFmt(lang === "en" ? "en-US" : "es-NI", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function BirthdayCard({ occ, dismiss }: { occ: Occasion; dismiss: (key: string) => void }) {
  const { session, lang } = useFaro();
  const [open, setOpen] = useState(false);
  if (!session) return null;
  const state = session.ledger;
  const { display, rateE4 } = state.settings;
  const person: Person = occ.person;
  const nextYear = Number(occ.next.date.slice(0, 4));
  const totals = personTotals(state, person, display, rateE4);
  const ready = totals.years.find((y) => y.year === nextYear)?.minor ?? 0;
  const last = totals.years.find((y) => y.year === nextYear - 1)?.minor ?? 0;
  const money = (m: number) => formatMoney(m, display, lang);
  const today = occ.next.days === 0;
  return (
    <section className={`bday-card${today ? " is-today" : ""}`} data-anchor="central-birthday">
      <div className="bday-head">
        <span className="bday-pic" style={{ ["--pp" as string]: personHue(person) }} aria-hidden><Cake /></span>
        <button type="button" className="bday-main" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span className="bday-kick">✦ {L(lang, "Cumpleaños", "Birthday")}</span>
          <strong className="serif bday-name">{person.name}</strong>
          <span className="bday-sub">
            {today
              ? L(lang, "¡Cumple hoy!", "It's today!")
              : L(lang, `Cumple ${whenWord(occ.next.days, lang)}`, `Birthday ${whenWord(occ.next.days, lang)}`)}
          </span>
        </button>
        <ChevronDown className={`bday-chev${open ? " is-open" : ""}`} aria-hidden />
        <button
          type="button"
          className="bday-x"
          aria-label={L(lang, "Quitar esta tarjeta", "Dismiss this card")}
          onClick={() => dismiss(`${person.id}|${occ.next.date}`)}
        >
          <X className="size-4" />
        </button>
      </div>
      {open ? (
        <div className="bday-body">
          <p className="bday-row">
            <em>{L(lang, "Fecha", "Date")}</em>
            <strong>{fullDate(occ.next.date, lang)}</strong>
          </p>
          {occ.next.age !== null ? (
            <p className="bday-row">
              <em>{L(lang, "Cumple", "Turns")}</em>
              <strong>{L(lang, `${occ.next.age} años`, `${occ.next.age}`)}</strong>
            </p>
          ) : null}
          {ready > 0 ? (
            <p className="bday-row">
              <em>{L(lang, "Ya anotaste", "Already noted")}</em>
              <strong className="num">{money(ready)}</strong>
            </p>
          ) : (
            <p className="bday-note">{L(lang, "Todavía no anotas nada para este cumpleaños.", "Nothing noted for this birthday yet.")}</p>
          )}
          {last > 0 ? (
            <p className="bday-row">
              <em>{L(lang, "El cumpleaños pasado", "Last birthday")}</em>
              <strong className="num">{money(last)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function BirthdayCards() {
  const { session, has } = useFaro();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  if (!session || !has("central.birthday")) return null;
  const soon = upcoming(activePeople(session.ledger), 3, todayIso())
    .filter((o) => o.kind === "birthday" && !dismissed.includes(`${o.person.id}|${o.next.date}`));
  if (!soon.length) return null;
  const dismiss = (key: string) => {
    const next = [...dismissed, key];
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  return (
    <>
      {soon.map((o) => (
        <BirthdayCard key={`${o.person.id}|${o.next.date}`} occ={o} dismiss={dismiss} />
      ))}
    </>
  );
}
