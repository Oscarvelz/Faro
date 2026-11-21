/**
 * La Bitácora (1.3.367) — la tercera pastilla de Folios y el conductor
 * hermano de «Tu año en Faro».
 *
 * La sección guarda dos cosas: las fotos calladas de los meses del año
 * en curso (con su aviso permanente de encuadernación) y las ediciones
 * anuales ya encuadernadas, que se reabren IDÉNTICAS — la edición es un
 * documento congelado, no una consulta viva.
 *
 * El conductor toma la FORMA de la Presentación Guiada (una idea por
 * tarjeta, Interactivo ⇄ Automático en un reloj, hilo de progreso en el
 * acento del tema) sobre un guion compuesto del libro real. El escenario
 * sellado de Presentaciones no se toca: su ley lo prohíbe para datos
 * reales. Sin avance forzado: cada tarjeta espera a su lector, salir a
 * mitad no pide nada, y la serie recuerda la tarjeta en este aparato.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ChevronLeft, ChevronRight, Pause, Play, Sparkles, X } from "lucide-react";
import { logbookOf, markEditionSeen, monthName, pendingEdition } from "@/lib/faro/bitacora";
import { todayIso } from "@/lib/faro/loans";
import { formatMoney } from "@/lib/faro/money";
import type { LogCard, LogEdition, LogMonth } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Explain } from "./ui";
import { useFaro } from "./provider";
import "./bitacora.css";

type Lg = "es" | "en";
const W = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/* ============================================================ la serie */

function TrendChart({ card, big = false }: { card: LogCard; big?: boolean }) {
  const pts = card.points ?? [];
  if (pts.length < 2) return null;
  const w = big ? 560 : 320, h = big ? 180 : 120, pad = 10;
  const max = Math.max(...pts, 1);
  const step = (w - pad * 2) / (pts.length - 1);
  const xy = pts.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const mark = card.mark ?? -1;
  return (
    <svg className="lg-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden>
      <polyline points={line} fill="none" strokeWidth="2" className="lg-chart-line" />
      {mark >= 0 && xy[mark] ? <circle cx={xy[mark][0]} cy={xy[mark][1]} r={big ? 6 : 5} className="lg-chart-mark" /> : null}
    </svg>
  );
}

function CardBody({ card, lang, wide }: { card: LogCard; lang: Lg; wide: boolean }) {
  const t = (x: { es: string; en: string }) => x[lang];
  const explain = (
    <Explain
      title={t(card.title)}
      meaning={t(card.explain.what)}
      formula={t(card.explain.how)}
      implication={t(card.explain.so)}
      label={W(lang, "Qué significa esta cifra", "What this figure means")}
    />
  );
  if (card.kind === "cover") {
    return (
      <div className="lg-cover">
        <span className="lg-cover-star" aria-hidden><Sparkles /></span>
        <p className="lg-cover-kicker">{t(card.title)}</p>
        <p className="lg-card-context">{t(card.context)}</p>
        <div className="lg-explain-row">{explain}</div>
      </div>
    );
  }
  if (card.kind === "close") {
    return (
      <div className="lg-close">
        <p className="lg-card-title">{t(card.title)}</p>
        <p className="lg-close-prose">{t(card.context)}</p>
        <div className="lg-explain-row">{explain}</div>
      </div>
    );
  }
  if (card.kind === "trend") {
    return (
      <div className="lg-card">
        <p className="lg-card-title">{t(card.title)}</p>
        {wide ? null : <TrendChart card={card} />}
        {card.figure ? <p className="lg-figure">{formatMoney(card.figure.minor, card.figure.currency, lang)}</p> : null}
        {card.figureLabel ? <p className="lg-figure-label">{t(card.figureLabel)}</p> : null}
        <p className="lg-card-context">{t(card.context)}</p>
        <div className="lg-explain-row">{explain}</div>
      </div>
    );
  }
  if (card.kind === "compare") {
    return (
      <div className="lg-card">
        <p className="lg-card-title">{t(card.title)}</p>
        <div className="lg-compare">
          {card.before ? <span className="lg-compare-from">{formatMoney(card.before.minor, card.before.currency, lang)}</span> : null}
          <span className="lg-compare-arrow" aria-hidden>→</span>
          {card.figure ? <span className="lg-compare-to">{formatMoney(card.figure.minor, card.figure.currency, lang)}</span> : null}
        </div>
        {card.figureLabel ? <p className="lg-figure-label">{t(card.figureLabel)}</p> : null}
        <p className="lg-card-context">{t(card.context)}</p>
        <div className="lg-explain-row">{explain}</div>
      </div>
    );
  }
  return (
    <div className="lg-card">
      <p className="lg-card-title">{t(card.title)}</p>
      {card.figure ? <p className="lg-figure">{formatMoney(card.figure.minor, card.figure.currency, lang)}</p> : null}
      {card.figureLabel ? <p className="lg-figure-label">{t(card.figureLabel)}</p> : null}
      <p className="lg-card-context">{t(card.context)}</p>
      <div className="lg-explain-row">{explain}</div>
    </div>
  );
}

export function YearSeries({ edition, onClose }: { edition: LogEdition; onClose: () => void }) {
  const { session, lang, commit } = useFaro();
  const lg: Lg = lang === "en" ? "en" : "es";
  const cards = edition.cards;
  const posKey = `faro-log-pos-${edition.year}`;
  const [idx, setIdx] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(posKey));
      return Number.isInteger(raw) && raw > 0 && raw < cards.length ? raw : 0;
    } catch { return 0; }
  });
  const [auto, setAuto] = useState(false);
  const [wide, setWide] = useState<boolean>(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  const seenRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(posKey, String(idx)); } catch { /* el aparato no guarda: la serie empieza de nuevo */ }
  }, [idx, posKey]);

  const card = cards[idx];
  const words = useMemo(() => (card ? `${card.title[lg]} ${card.context[lg]}`.split(/\s+/).length : 0), [card, lg]);
  useEffect(() => {
    if (!auto) return;
    if (idx >= cards.length - 1) { setAuto(false); return; }
    const dwell = Math.min(12000, Math.max(3500, 2400 + words * 300));
    const id = window.setTimeout(() => setIdx((i) => Math.min(cards.length - 1, i + 1)), dwell);
    return () => window.clearTimeout(id);
  }, [auto, idx, words, cards.length]);

  const close = () => {
    if (!seenRef.current && !edition.seenAt && session?.ledger) {
      seenRef.current = true;
      commit((s) => markEditionSeen(s, edition.year, todayIso()), W(lg, "Bitácora vista", "Logbook seen"));
    }
    onClose();
  };
  useLayer(true, close);
  if (!card) return null;
  const last = idx >= cards.length - 1;

  return createPortal(
    <div className="lg-scrim" data-anchor="log-series" role="dialog" aria-modal="true" aria-label={`${edition.year}`}>
      <div className="lg-frame">
        <header className="lg-head">
          <div className="lg-segments" aria-hidden>
            {cards.map((c, i) => <span key={i} className={`lg-seg${i <= idx ? " is-done" : ""}`} />)}
          </div>
          <div className="lg-head-row">
            <span className="lg-count">{idx + 1} / {cards.length}</span>
            <span className="lg-year">{edition.year}</span>
            <span className="lg-head-actions">
              <button type="button" className="icon-btn" aria-label={auto ? W(lg, "Pausar", "Pause") : W(lg, "Automático", "Automatic")} onClick={() => setAuto((a) => !a)}>
                {auto ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <button type="button" className="icon-btn" aria-label={W(lg, "Salir", "Exit")} onClick={close}>
                <X className="size-4" aria-hidden />
              </button>
            </span>
          </div>
        </header>

        <div className={`lg-stage${wide ? " is-wide" : ""}`}>
          <div className="lg-main">
            <CardBody card={card} lang={lg} wide={wide} />
            {card.kind === "close" ? (
              <p className="lg-foot">
                {W(lg, `Contado el ${edition.countedOn} con los datos de ese día. Ya está en tu Bitácora.`,
                  `Counted on ${edition.countedOn} with that day's data. It is already in your Logbook.`)}
              </p>
            ) : null}
            <div className="lg-nav">
              <button type="button" className="lg-nav-btn" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} aria-label={W(lg, "Anterior", "Previous")}>
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              {idx === 0 ? (
                <span className="lg-resume-hint">{W(lg, "Desliza o usa las flechas: cada tarjeta espera a su lector.", "Swipe or use the arrows: each card waits for its reader.")}</span>
              ) : <span />}
              {last ? (
                <button type="button" className="lg-nav-done" onClick={close}>{W(lg, "Verla otro día", "See it another day")}</button>
              ) : (
                <button type="button" className="lg-nav-btn" onClick={() => setIdx((i) => Math.min(cards.length - 1, i + 1))} aria-label={W(lg, "Siguiente", "Next")}>
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              )}
            </div>
          </div>
          {wide ? (
            <aside className="lg-side">
              {card.kind === "trend" ? (
                <>
                  <p className="lg-side-title">{W(lg, "El año entero", "The whole year")}</p>
                  <TrendChart card={card} big />
                  <p className="lg-side-note">{card.title[lg]}</p>
                </>
              ) : (
                <>
                  <p className="lg-side-title">{W(lg, "La serie", "The series")}</p>
                  <ol className="lg-index">
                    {cards.map((c, i) => (
                      <li key={i}>
                        <button type="button" className={`lg-index-row${i === idx ? " is-active" : ""}`} onClick={() => setIdx(i)}>
                          <span className="lg-index-n">{i + 1}</span>
                          <span className="lg-index-t">{c.title[lg]}</span>
                          {c.figure ? <span className="lg-index-f">{formatMoney(c.figure.minor, c.figure.currency, lg)}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ================================================== la tarjeta de Central */

const OPEN_KEY = "faro-log-open";

export function YearAnnouncementCard() {
  const { session, lang, setUi } = useFaro();
  const lg: Lg = lang === "en" ? "en" : "es";
  const edition = session?.ledger ? pendingEdition(session.ledger) : null;
  if (!edition) return null;
  const open = () => {
    try { sessionStorage.setItem(OPEN_KEY, String(edition.year)); } catch { /* sin sesión: la sección la ofrece igual */ }
    setUi({ section: "bitacora" });
  };
  return (
    <section className="lg-announce" data-anchor="log-announce">
      <span className="lg-announce-star" aria-hidden><Sparkles /></span>
      <div className="lg-announce-body">
        <p className="lg-announce-title">{W(lg, `Tu año en Faro está listo`, `Your year in Faro is ready`)}</p>
        <p className="lg-announce-sub">{W(lg, `La edición de ${edition.year}, contada con tus propios números. Te espera sin prisa.`, `The ${edition.year} edition, counted with your own numbers. It waits, in no hurry.`)}</p>
      </div>
      <button type="button" className="lg-announce-btn" onClick={open}>{W(lg, "Verlo", "See it")}</button>
    </section>
  );
}

/* ============================================================ la sección */

function MonthRow({ m, lang }: { m: LogMonth; lang: Lg }) {
  return (
    <li className="lg-month" data-anchor="log-month">
      <span className="lg-month-name">{monthName(m.month, lang)}</span>
      <span className="lg-month-net">{formatMoney(m.net, m.currency, lang)}</span>
      {m.topName ? <span className="lg-month-top">{m.topName[lang]} · {formatMoney(m.topMinor, m.currency, lang)}</span> : null}
    </li>
  );
}

export function BitacoraScreen() {
  const { session, lang, has } = useFaro();
  const lg: Lg = lang === "en" ? "en" : "es";
  const state = session?.ledger ?? null;
  const book = useMemo(() => (state ? logbookOf(state) : { months: {}, editions: {} }), [state]);
  const [openYear, setOpenYear] = useState<number | null>(() => {
    try {
      const y = Number(sessionStorage.getItem(OPEN_KEY));
      sessionStorage.removeItem(OPEN_KEY);
      return Number.isInteger(y) && y > 0 ? y : null;
    } catch { return null; }
  });
  if (!state || !has("folios.logbook")) return null;
  const editions = Object.values(book.editions).sort((a, b) => b.year - a.year);
  const months = Object.values(book.months).sort((a, b) => (a.month < b.month ? 1 : -1));
  const byYear = new Map<string, LogMonth[]>();
  for (const m of months) {
    const y = m.month.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), m]);
  }
  const openEdition = openYear != null ? book.editions[String(openYear)] ?? null : null;
  const empty = editions.length === 0 && months.length === 0;
  return (
    <div className="lg-screen" data-anchor="logbook">
      <header className="lg-screen-head">
        <span className="lg-screen-ico" aria-hidden><BookOpen /></span>
        <div>
          <h2 className="lg-screen-title">{W(lg, "Bitácora", "Logbook")}</h2>
          <p className="lg-screen-sub">{W(lg, "El registro de tus meses y tus años, contado una sola vez y guardado tal como se contó.", "The record of your months and years, counted once and kept exactly as counted.")}</p>
        </div>
      </header>

      <p className="lg-binding-note">
        {W(lg, "Al cerrar el año, tus meses se encuadernan en «Tu año en Faro»: los folios sueltos se vuelven capítulos del tomo, y la edición lo dice en su primera línea.",
          "When the year closes, your months are bound into “Your year in Faro”: the loose folios become chapters of the volume, and the edition says so in its first line.")}
      </p>

      {empty ? (
        <div className="lg-empty" data-anchor="log-empty">
          <p>{W(lg, "Tu primera bitácora llegará al cerrar tu primer año con registro.", "Your first logbook will arrive when your first recorded year closes.")}</p>
          <p className="lg-empty-sub">{W(lg, "Cada mes cerrado guarda aquí su foto, callada. Con menos de unas seis semanas de registro todavía no hay edición: un estado vacío explicado vale más que una serie vacía.", "Each closed month quietly keeps its photo here. With less than about six weeks of record there is no edition yet: an explained empty state is worth more than an empty series.")}</p>
        </div>
      ) : null}

      {editions.length > 0 ? (
        <section className="lg-editions">
          <h3 className="lg-h">{W(lg, "Tus años", "Your years")}</h3>
          <ul className="lg-edition-list">
            {editions.map((e) => (
              <li key={e.year}>
                <button type="button" className="lg-edition" data-anchor="log-edition" onClick={() => setOpenYear(e.year)}>
                  <span className="lg-edition-year">{e.year}</span>
                  <span className="lg-edition-meta">
                    {W(lg, `Contado el ${e.countedOn} · ${e.cards.length} tarjetas`, `Counted on ${e.countedOn} · ${e.cards.length} cards`)}
                    {e.partial ? W(lg, " · año parcial", " · partial year") : ""}
                  </span>
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {[...byYear.entries()].map(([y, ms]) => (
        <section key={y} className="lg-months">
          <h3 className="lg-h">{W(lg, `Los meses de ${y}`, `The months of ${y}`)}</h3>
          <ul className="lg-month-list">
            {ms.map((m) => <MonthRow key={m.month} m={m} lang={lg} />)}
          </ul>
        </section>
      ))}

      {openEdition ? <YearSeries edition={openEdition} onClose={() => setOpenYear(null)} /> : null}
    </div>
  );
}
