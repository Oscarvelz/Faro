/**
 * FARO — El saldo proyectado, día a día (§19.1, 1.3.365): la lectura
 * del camino en casa del Asesor. El veredicto primero, sobre lo libre;
 * debajo, el camino entero — cada evento con su fuente dicha en su
 * línea — y el día más apretado marcado. Las cifras del veredicto se
 * tocan y abren el camino que las compone (la procedencia de la casa).
 * Sin pintar el futuro de verde o rojo: el color es del tema.
 * Asiento: Completo (advisor.projection) — sin su modo, ni la tarjeta.
 */
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { dayName, readProjection, type ProjEvent } from "@/lib/faro/projection";
import { todayIso } from "@/lib/faro/loans";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import "./projection.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

const MONTH_SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** La etiqueta corta de un día del camino: «14» en este mes, «3 dic» fuera. */
function shortDay(lang: string, isoDay: string, today: string): string {
  const d = Number(isoDay.slice(8, 10));
  const m = Number(isoDay.slice(5, 7)) - 1;
  if (isoDay.slice(0, 7) === today.slice(0, 7)) return `${d}`;
  return lang === "en" ? `${MONTH_SHORT_EN[m]} ${d}` : `${d} ${MONTH_SHORT_ES[m]}`;
}

export function ProjectionSection() {
  const { session, lang, has, fmt } = useFaro();
  const [open, setOpen] = useState(false);
  const ledger = session?.ledger;
  const today = todayIso();
  const reading = useMemo(
    () => (ledger ? readProjection(ledger, lang === "en" ? "en" : "es", today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, lang],
  );
  if (!has("advisor.projection") || !ledger || !reading) return null;

  const cut = reading.verdict.search(/[.:](\s|$)/);
  const lead = cut > 0 ? reading.verdict.slice(0, cut + 1) : reading.verdict;
  const rest = cut > 0 ? reading.verdict.slice(cut + 1).trim() : "";
  const tightDay = reading.tightest?.day ?? "";

  // 1.3.428 (Oscar, 2026-11-22): el camino también se DIBUJA — la línea
  // de lo libre, día a día, con el día más apretado marcado sobre ella
  // y su cifra en la etiqueta. El significado de esta tarjeta ES una
  // forma (el valor explicativo): la lista de eventos sigue debajo,
  // tras las cifras, como la procedencia de la línea.
  const chart = (() => {
    const days = reading.days;
    if (!reading.hasBase || days.length < 2) return null;
    const W = 320, TOP = 20, BOT = 88;
    let min = Math.min(...days.map((d) => d.free));
    let max = Math.max(...days.map((d) => d.free));
    if (max - min < 1) { max += 1; min -= 1; }
    const x = (i: number) => 8 + (i * (W - 16)) / (days.length - 1);
    const y = (v: number) => TOP + ((max - v) * (BOT - TOP)) / (max - min);
    const points = days.map((d, i) => `${x(i).toFixed(1)},${y(d.free).toFixed(1)}`).join(" ");
    const zeroY = min < 0 && max > 0 ? y(0) : null;
    let tight: { x: number; y: number; labelX: number; labelY: number; label: string } | null = null;
    if (reading.tightest && reading.events.length) {
      const ti = days.findIndex((d) => d.day === reading.tightest!.day);
      if (ti >= 0) {
        const tx = x(ti), ty = y(days[ti].free);
        tight = {
          x: tx, y: ty,
          labelX: Math.min(Math.max(tx, 52), W - 52),
          labelY: ty > TOP + 26 ? ty - 9 : ty + 15,
          label: `${shortDay(lang, days[ti].day, today)} · ${fmt(days[ti].free)}`,
        };
      }
    }
    return { points, zeroY, tight, first: shortDay(lang, days[0].day, today), last: shortDay(lang, days[days.length - 1].day, today) };
  })();

  const rowFor = (e: ProjEvent) => (
    <li key={`${e.day}|${e.kind}|${e.name}|${e.minor}`} className={`proj-row${e.day === tightDay ? " is-tight" : ""}`}>
      <span className="proj-day">{shortDay(lang, e.day, today)}</span>
      <span className="proj-what">
        <span className="proj-name">{e.name}</span>
        <span className="proj-src">{e.source}</span>
      </span>
      <span className={`proj-amt${e.minor > 0 ? " is-in" : ""}`}>
        {e.minor > 0 ? "+" : "−"}{fmt(Math.abs(e.minor))}
      </span>
    </li>
  );

  return (
    <section className="advice-card proj-card" data-anchor="advice-projection">
      <p className="advice-kicker">
        <span className="lab-head">
          {L(lang, "Saldo proyectado, día a día", "Projected balance, day by day")}
          <Hint topic="saldo-proyectado" />
        </span>
      </p>
      <p className="advice-lead"><strong>{lead}</strong>{rest ? <span> {rest}</span> : null}</p>
      {reading.hasBase && reading.tightestText ? <p className="proj-tight">{reading.tightestText}</p> : null}
      {reading.hasBase ? (
        <>
          <div className="proj-figs">
            <button type="button" className="proj-fig" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <em>{L(lang, "Saldo", "Balance")} · {dayName(lang === "en" ? "en" : "es", reading.horizonEnd, today)}</em>
              <strong className="num">{fmt(reading.endBalance)}</strong>
            </button>
            <button type="button" className="proj-fig" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <em>{L(lang, "Libre", "Free")} · {dayName(lang === "en" ? "en" : "es", reading.horizonEnd, today)}</em>
              <strong className="num">{fmt(reading.endFree)}</strong>
            </button>
            <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} aria-hidden />
          </div>
          <p className="proj-parts">
            {L(lang, "Parte de", "Starts from")} {fmt(reading.startMinor)}
            {reading.pledgedMinor > 0 ? L(lang, ` en cuentas; ${fmt(reading.pledgedMinor)} apartados no son libres.`, ` in accounts; ${fmt(reading.pledgedMinor)} set aside is not free.`) : L(lang, " en cuentas.", " in accounts.")}
          </p>
          {chart ? (
            <svg className="proj-chart" viewBox="0 0 320 104" role="img" aria-label={L(lang, "El camino de tu saldo libre, día a día", "Your free balance path, day by day")}>
              {chart.zeroY != null ? <line className="proj-chart-zero" x1="8" x2="312" y1={chart.zeroY} y2={chart.zeroY} /> : null}
              <polyline className="proj-chart-line" points={chart.points} />
              {chart.tight ? (
                <>
                  <circle className="proj-chart-dot" cx={chart.tight.x} cy={chart.tight.y} r="3.5" />
                  <text className="proj-chart-tight" x={chart.tight.labelX} y={chart.tight.labelY} textAnchor="middle">{chart.tight.label}</text>
                </>
              ) : null}
              <text className="proj-chart-day" x="8" y="101">{chart.first}</text>
              <text className="proj-chart-day" x="312" y="101" textAnchor="end">{chart.last}</text>
            </svg>
          ) : null}
          {open ? (
            reading.events.length ? (
              <ol className="proj-path">
                {reading.events.map(rowFor)}
              </ol>
            ) : (
              <p className="proj-none">{L(lang, "Nada vence ni entra en el camino: el saldo se queda como está.", "Nothing comes due or comes in along the way: the balance stays as it is.")}</p>
            )
          ) : null}
        </>
      ) : null}
    </section>
  );
}
