/* 1.3.114 tablet only: the pane beside a book (Fijos, Compras, savings). It never repeats the list: it compares this month
   with the month before, line by line (what went up, what went down, what is new, what is gone), which the book itself
   does not show anywhere. Rendered only on a one-pane screen >= 1100 wide; phones never mount it. */
import { useLayoutEffect, useState } from "react";
import { useFaro } from "./provider";
import { monthLines } from "@/lib/faro/engine";
import { convertMinor } from "@/lib/faro/money";
import type { Line } from "@/lib/faro/types";

export const TABLET_ONE_MQ = "(min-width: 1100px) and (min-height: 600px)";
export function useTabletOne(): boolean {
  const read = () => typeof window !== "undefined" && window.matchMedia(TABLET_ONE_MQ).matches && !document.querySelector(".app-frame")?.classList.contains("is-split");
  const [on, setOn] = useState(read);
  useLayoutEffect(() => {
    const mq = window.matchMedia(TABLET_ONE_MQ);
    const pick = () => setOn(read());
    pick();
    mq.addEventListener("change", pick);
    const f = document.querySelector(".app-frame");
    const mo = f ? new MutationObserver(pick) : null;
    if (f && mo) mo.observe(f, { attributes: true, attributeFilter: ["class"] });
    return () => { mq.removeEventListener("change", pick); mo?.disconnect(); };
  }, []);
  return on;
}

function shiftKey(key: string, delta: number): string {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type SideBook = "fixed" | "shops" | "save";

export function BookSide({ book }: { book: SideBook }) {
  const { session, key, fmt, lang } = useFaro();
  if (!session) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const st = session.ledger;
  const { display, rateE4 } = st.settings;
  const roleOf = (l: Line) => st.structure.categories.find((c) => c.id === l.categoryId)?.role;
  const match = (l: Line) => book === "shops" ? l.kind === "purchase" : book === "fixed" ? l.kind === "expense-fixed" && roleOf(l) !== "savings" : roleOf(l) === "savings";
  const prev = shiftKey(key, -1);
  const val = (l: Line) => (l.active ? convertMinor(l.amountMinor, l.currency, display, rateE4) : 0);
  const idOf = (l: Line) => l.seriesId || l.concept.trim().toLowerCase();
  const rows = new Map<string, { name: string; now: number; then: number; isNew: boolean; gone: boolean }>();
  for (const l of monthLines(st, prev).filter(match)) {
    const r = rows.get(idOf(l)) ?? { name: l.concept || "—", now: 0, then: 0, isNew: false, gone: true };
    r.then += val(l); rows.set(idOf(l), r);
  }
  for (const l of monthLines(st, key).filter(match)) {
    const r = rows.get(idOf(l)) ?? { name: l.concept || "—", now: 0, then: 0, isNew: true, gone: false };
    r.now += val(l); r.gone = false; r.name = l.concept || r.name; rows.set(idOf(l), r);
  }
  const all = [...rows.values()];
  const nowT = all.reduce((a, r) => a + r.now, 0), thenT = all.reduce((a, r) => a + r.then, 0);
  const diff = nowT - thenT;
  const moved = all.filter((r) => r.now !== r.then).sort((a, b) => Math.abs(b.now - b.then) - Math.abs(a.now - a.then));
  const same = all.length - moved.length;
  // More spent is "up" (warn) in Fijos/Compras; more set aside is good in savings.
  const tone = (d: number) => (d === 0 ? "zero" : (d > 0) === (book === "save") ? "good" : "bad");
  const month = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "long" }).format(new Date(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)) - 1, 1));
  const sign = (d: number) => (d > 0 ? "+" : d < 0 ? "−" : "");
  return (
    <aside className="book-side" data-book={book} aria-label={L(`Comparado con ${month}`, `Compared with ${month}`)}>
      <div className="bs-head">
        <span className="bs-kick">{L("Contra", "Versus")} {month}</span>
        <span className="bs-total"><strong className="num">{fmt(nowT)}</strong><em className="num" data-tone={tone(diff)}>{diff === 0 ? L("igual", "same") : `${sign(diff)}${fmt(Math.abs(diff))}`}</em></span>
        <span className="bs-was">{L("antes", "before")} <b className="num">{fmt(thenT)}</b></span>
      </div>
      {moved.length ? (
        <ul className="bs-rows">
          {moved.slice(0, 8).map((r, i) => (
            <li key={i}>
              <span className="bs-name">{r.name}{r.isNew ? <i className="bs-tag">{L("nuevo", "new")}</i> : r.gone ? <i className="bs-tag">{L("ya no", "gone")}</i> : null}</span>
              <span className="bs-pair num">{fmt(r.then)} → {fmt(r.now)}</span>
              <b className="num" data-tone={tone(r.now - r.then)}>{sign(r.now - r.then)}{fmt(Math.abs(r.now - r.then))}</b>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="bs-foot">
        {!all.length ? L(`Nada anotado ni este mes ni en ${month}.`, `Nothing recorded this month or in ${month}.`)
          : moved.length ? (moved.length > 8 ? L(`Y ${moved.length - 8} cambios más. `, `And ${moved.length - 8} more changes. `) : "") + (same ? L(`${same} sin cambio.`, `${same} unchanged.`) : "")
          : L(`Todo igual que en ${month}.`, `Everything as in ${month}.`)}
      </p>
    </aside>
  );
}

/* Beside Debo → Cuotas: what is due next, in date order with the days left, which the Cuotas list (grouped by
   category, no dates side by side) does not give at a glance. */
export function DueSide() {
  const { session, key, fmt, lang } = useFaro();
  if (!session) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const st = session.ledger;
  const { display, rateE4 } = st.settings;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = monthLines(st, key)
    .filter((l) => l.kind === "subscription" && l.active && /^\d{4}-\d{2}-\d{2}/.test(l.nextDue || ""))
    .map((l) => {
      const d = new Date(Number(l.nextDue.slice(0, 4)), Number(l.nextDue.slice(5, 7)) - 1, Number(l.nextDue.slice(8, 10)));
      return { name: l.concept || "—", date: d, days: Math.round((d.getTime() - today.getTime()) / 864e5), amt: convertMinor(l.amountMinor, l.currency, display, rateE4) };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const soon = rows.filter((r) => r.days >= 0 && r.days <= 30);
  const late = rows.filter((r) => r.days < 0);
  const fmtDay = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" });
  const left = (n: number) => (n < 0 ? L(`hace ${-n} d`, `${-n} d ago`) : n === 0 ? L("hoy", "today") : n === 1 ? L("mañana", "tomorrow") : L(`en ${n} d`, `in ${n} d`));
  const list = [...late, ...soon];
  return (
    <aside className="book-side due-side" aria-label={L("Próximos 30 días", "Next 30 days")}>
      <div className="bs-head">
        <span className="bs-kick">{L("Próximos 30 días", "Next 30 days")}</span>
        <span className="bs-total"><strong className="num">{fmt(soon.reduce((a, r) => a + r.amt, 0))}</strong>{late.length ? <em data-tone="bad">{L(`${late.length} vencida${late.length > 1 ? "s" : ""}`, `${late.length} overdue`)}</em> : null}</span>
      </div>
      {list.length ? (
        <ul className="bs-rows">
          {list.slice(0, 10).map((r, i) => (
            <li key={i}>
              <span className="bs-name">{r.name}</span>
              <span className="bs-pair">{fmtDay.format(r.date)} · <span data-tone={r.days < 0 ? "bad" : r.days <= 3 ? "warn" : "zero"}>{left(r.days)}</span></span>
              <b className="num">{fmt(r.amt)}</b>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="bs-foot">{rows.length ? (list.length ? "" : L("Nada vence en los próximos 30 días.", "Nothing due in the next 30 days.")) : L("Ponle fecha a una cuota y aparece aquí, en orden.", "Give a cuota a date and it shows here, in order.")}{list.length > 10 ? L(`+${list.length - 10} más · ${fmt(list.slice(10).reduce((a, r) => a + r.amt, 0))}`, `+${list.length - 10} more · ${fmt(list.slice(10).reduce((a, r) => a + r.amt, 0))}`) : ""}</p>
    </aside>
  );
}
