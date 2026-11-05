/**
 * Estudio → "De dónde viene tu dinero" (1.3.109): the year's earnings by source, with card rewards (cash back) as their
 * own source, per card and month by month from the rewards readings. Money in is teal. Numbers live in lib/faro/earnings.ts.
 */
import "./earnings.css";
import { useLayoutEffect, useRef } from "react";
import { HandCoins, Star } from "lucide-react";
import { shortName } from "./cards";
import { useFaro } from "./provider";
import { Head } from "./panorama";
import { CardArt } from "./card-art";
import { earningsBySource } from "@/lib/faro/earnings";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

export function hasEarnings(state: Parameters<typeof earningsBySource>[0], year: number) {
  return earningsBySource(state, year).total > 0;
}

export function EarningsStudy() {
  const { session, lang, fmt, ui } = useFaro();
  const box = useRef<HTMLElement>(null);
  // Card names never get cut: the full name, else the short one (no network word); re-checked on resize.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => el.querySelectorAll<HTMLElement>(".ea-rw-card span").forEach((n) => { n.textContent = n.dataset.full ?? ""; if (n.scrollWidth > n.clientWidth + 1 && n.dataset.short) n.textContent = n.dataset.short; });
    fit();
    let w = el.clientWidth, raf = 0;
    const ro = new ResizeObserver(() => { if (el.clientWidth === w) return; w = el.clientWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    ro.observe(el);
    void document.fonts?.ready.then(() => requestAnimationFrame(fit));
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  });
  if (!session) return null;
  const e = earningsBySource(session.ledger, ui.year, lang === "en" ? "en" : "es");
  if (e.total <= 0) return null;
  const top = Math.max(1, ...e.sources.map((s) => s.minor));
  const peak = Math.max(1, ...e.rewards.months);
  const pct = (n: number) => `${Math.round((n / e.total) * 1000) / 10}%`;
  const monthAbbr = (i: number) => new Date(ui.year, i, 1).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { month: "narrow" });
  return (
    <section ref={box} className="card pano-card ea-study" data-section="time" data-anchor="study-earnings">
      <Head kicker={L(lang, `Ganancias\u00a0·\u00a0${ui.year}`, `Earnings\u00a0·\u00a0${ui.year}`)} title={L(lang, "De dónde viene tu dinero", "Where your money comes from")} topic="estudio-ganancias" />
      <div className="pp-hero is-study ea-hero">
        <span className="pp-pic ea-pic" aria-hidden><HandCoins /></span>
        <div className="pp-hero-text">
          <em>{L(lang, "Entró en el año", "Came in this year")}</em>
          <strong className="num">{fmt(e.total)}</strong>
          {e.rewards.minor > 0 ? <span>{L(lang, `${pct(e.rewards.minor)} vino de tus tarjetas`, `${pct(e.rewards.minor)} came from your cards`)}</span> : null}
        </div>
      </div>
      <ul className="pp-bars ea-bars">
        {e.sources.map((s) => (
          <li key={s.id} data-src={s.rewards ? "rewards" : s.id === "otros" ? "other" : undefined} style={{ ["--w" as string]: String(Math.max(0.04, s.minor / top)) }}>
            <span className="pp-bar-name ea-name">{s.rewards ? <Star aria-hidden /> : null}{s.name}</span>
            <b className="num">{fmt(s.minor)}</b>
            <i aria-hidden />
            <small className="num ea-pct">{pct(s.minor)}</small>
          </li>
        ))}
      </ul>
      {e.rewards.minor > 0 ? (
        <div className="ea-rw" data-anchor="study-earnings-rewards">
          <p className="ea-rw-head"><Star aria-hidden /><span>{L(lang, "Recompensas de tarjetas", "Card rewards")}</span><b className="num">{fmt(e.rewards.minor)}</b></p>
          {e.rewards.cards.map((c) => (
            <p key={c.id} className="ea-rw-card"><CardArt card={c.card} /><span data-full={c.name} data-short={shortName(c.name)}>{c.name}</span><b className="num">{fmt(c.minor)}</b></p>
          ))}
          <div className="ea-months" aria-label={L(lang, "Recompensas ganadas por mes", "Rewards earned by month")}>
            {e.rewards.months.map((v, i) => (
              <span key={i} className={v > 0 ? "is-on" : undefined}><i style={{ height: `${v > 0 ? Math.max(8, (v / peak) * 100) : 4}%` }} /><em>{monthAbbr(i)}</em></span>
            ))}
          </div>
          <p className="ea-note">{L(lang, "Cuentan cuando las ganas (cada lectura que sube). Si las depositas a tu banco no se suman otra vez.", "They count when you earn them (each reading that goes up). Depositing them to your bank does not add them again.")}</p>
        </div>
      ) : null}
    </section>
  );
}
