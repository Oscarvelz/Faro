/* 1.3.122 tablet only: "Asesor de esta área", the Asesor for one book, in the right column under the comparison pane.
   Same family as the full Asesor (advice-card head, mark, kicker, serif title, chevron), at most three findings from the
   Asesor's rules filtered to this area (each: its backing number with its (?), and one tap to act), else one calm
   sentence about the data. A small chart that adds what the book and its pane do not show. Mounted only on a one-pane
   screen >= 1100 wide (useTabletOne), so phones never render or compute it. Nothing animates unless tapped. */
import "./area-advisor.css";
import { ArrowRight, ChevronDown, ChevronRight, Compass } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { isTron, tronize } from "@/lib/faro/colors";
import { AREA_TONE, areaReport, type AreaChart, type AreaId, type AreaItem, type AreaTone } from "@/lib/faro/area-advice";
import { readStoredGoals } from "@/lib/faro/awake";

/* Same tones as the full Asesor's rule rows (advisor2.tsx RULE_C). */
const RULE_C: Record<AreaTone, string> = { good: "#7fb2a0", calm: "#7fa6cf", warn: "#e0a35c", bad: "#d0837a" };
const tc = (c: string) => (isTron() ? tronize(c) : c);

/* Folded state lasts for this run only (like the full Asesor's Desplegar): open by default, per area. */
const folded = new Set<AreaId>();
/* Memo across mounts: a ledger object is immutable, so (ledger, key, lang, area, day) fully decides the report. */
const cache = new WeakMap<object, Map<string, ReturnType<typeof areaReport>>>();

const NAME: Record<AreaId, [string, string]> = {
  income: ["Ingresos", "Income"], fixed: ["Fijos", "Fixed"], variable: ["Variables", "Variable"], shops: ["Compras", "Purchases"],
  subs: ["Cuotas", "Plans"], loans: ["Préstamos", "Loans"], owed: ["Me deben", "Owed"], save: ["Ahorros", "Savings"],
  meta: ["Meta", "Goal"], retiro: ["Retiro", "Retire"], emergencia: ["Emergencia", "Emergency"], remit: ["Remesas", "Remits"],
  central: ["Central", "Desk"], spend: ["Gastaré", "Spend"],
};

export function AreaAdvisor({ area, label, onLeave }: { area: AreaId; label?: string; onLeave?: () => void }) {
  const { session, key, lang, names, fmt, goTopic, setUi, markSpot } = useFaro();
  const [open, setOpen] = useState(() => !folded.has(area));
  const today = new Date();
  const day = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const ledger = session?.ledger;
  const report = useMemo(() => {
    if (!ledger) return null;
    let m = cache.get(ledger);
    if (!m) { m = new Map(); cache.set(ledger, m); }
    const id = `${key}|${lang}|${area}|${day}`;
    let r = m.get(id);
    if (!r) {
      const g = area === "meta" || area === "save" ? readStoredGoals(ledger.settings.display, ledger.settings.rateE4).find((x) => x.id === "meta") : null;
      const goal = g && g.totalMinor > 0 ? { totalMinor: g.totalMinor, years: g.years, monthlyMinor: Math.round(g.totalMinor / (12 * g.years)) } : null;
      r = areaReport(ledger, key, lang, names, area, { today, goal });
      m.set(id, r);
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, key, lang, area, day, names]);
  if (!ledger || !report) return null;
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const name = label ?? NAME[area][lang === "en" ? 1 : 0];
  const tone = isTron() ? tronize(AREA_TONE[area]) : AREA_TONE[area];
  const go = (it: AreaItem) => {
    const g = it.go;
    // Every action is its own step (markSpot), so Back returns here — also on a second tap of the same book or line.
    // The host (Central with a lens) notes what Back must bring back before the step is taken.
    onLeave?.();
    markSpot();
    if (g.kind === "line") setUi({ section: g.section, vault: null, highlight: g.lineId });
    else if (g.kind === "book") setUi({ section: g.section, vault: null });
    else goTopic(g.topic, { screen: g.screen, anchor: g.anchor, fold: g.fold });
  };
  const toggle = () => {
    setOpen((on) => {
      if (on) folded.add(area); else folded.delete(area);
      return !on;
    });
  };
  return (
    <section className={`advice-card is-area${open ? " is-open" : ""}`} data-area={area} data-anchor={`area-advisor-${area}`} style={{ ["--area" as string]: tone }} aria-label={`${L("Asesor", "Advisor")} · ${name}`}>
      <div role="button" tabIndex={0} className="advice-head" aria-expanded={open} onClick={toggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}>
        <span className="advice-mark" aria-hidden><Compass className="size-4" /></span>
        <div>
          <p className="advice-kicker"><span className="lab-head">{L("Asesor de esta área", "This area's Advisor")}<Hint topic="asesor-area" /></span></p>
          <h2 className="serif">{L("Asesor", "Advisor")} · {name}</h2>
          {!open ? <p className="advice-teaser">{report.items.length ? <><strong className="num">{report.items[0]!.num}</strong><span>{report.items[0]!.title}</span></> : <span>{report.calm}</span>}</p> : null}
        </div>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
      </div>
      {open ? (
        <div className="aa-body">
          {report.chart ? <AreaFigure chart={report.chart} caption={report.caption} fmt={fmt} lang={lang} /> : null}
          {report.items.length ? (
            <div className="a2-lines aa-items">
              {report.items.map((it) => (
                <div key={it.id} role="button" tabIndex={0} data-rule={it.id} data-test="aa-go" className={`a2-line a2-rule aa-item is-${it.tone}`} style={{ ["--c" as string]: tc(RULE_C[it.tone]) }} aria-label={`${it.title}: ${it.num}. ${it.act}`}
                  onClick={(e) => { if ((e.target as HTMLElement).closest(".ftip, .hint-btn, button")) return; go(it); }} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(it); } }}>
                  <span className="a2-line-name">{it.title}<em style={{ color: tc(RULE_C[it.tone]) }}>{it.kicker}</em></span>
                  <span className="a2-line-amt"><strong className="num">{it.num}</strong><Hint topic={it.topic} /><ChevronRight aria-hidden /></span>
                  <span className="a2-line-bar" aria-hidden><b style={{ width: `${Math.max(4, Math.round(Math.max(0, Math.min(1, it.fill)) * 100))}%` }} /></span>
                  <p className="a2-rule-say">{it.say}</p>
                  <span className="aa-act">{it.act}<ArrowRight aria-hidden /></span>
                </div>
              ))}
            </div>
          ) : <p className="aa-calm">{report.calm}</p>}
        </div>
      ) : null}
    </section>
  );
}

const MON = (k: string, lang: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" }).format(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)).replace(".", "");

function AreaFigure({ chart, caption, fmt, lang }: { chart: NonNullable<AreaChart>; caption: string; fmt: (n: number) => string; lang: string }) {
  if (chart.type === "bars") {
    const peak = Math.max(1, chart.ref, ...chart.bars.map((b) => b.minor));
    const H = 64;
    const y = (v: number) => H - Math.round((v / peak) * (H - 6));
    const n = chart.bars.length;
    return (
      <figure className="aa-fig is-bars" data-chart="bars">
        <div className="aa-plot">
          <svg viewBox={`0 0 ${n * 40} ${H}`} preserveAspectRatio="none" aria-hidden>
            {chart.bars.map((b, i) => <rect key={b.key} className={i === n - 1 ? "is-now" : ""} x={i * 40 + 8} y={y(b.minor)} width={24} height={Math.max(b.minor > 0 ? 2 : 0, H - y(b.minor))} rx={3} />)}
            {chart.ref > 0 ? <line className="aa-ref" x1={0} x2={n * 40} y1={y(chart.ref)} y2={y(chart.ref)} vectorEffect="non-scaling-stroke" /> : null}
          </svg>
        </div>
        <div className="aa-axis" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
          {chart.bars.map((b, i) => <span key={b.key} className={i === n - 1 ? "is-now" : ""}>{MON(b.key, lang)}</span>)}
        </div>
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }
  if (chart.type === "path") {
    const pts = [...chart.past, ...chart.ahead];
    const peak = Math.max(1, chart.target, ...pts.map((p) => p.minor));
    const W = 240, H = 64;
    const x = (i: number) => (pts.length > 1 ? Math.round((i / (pts.length - 1)) * W) : 0);
    const y = (v: number) => H - 4 - Math.round((v / peak) * (H - 10));
    const past = chart.past.map((p, i) => `${x(i)},${y(p.minor)}`).join(" ");
    const join = chart.past.length - 1;
    const ahead = chart.ahead.length ? [`${x(join)},${y(chart.past[join]!.minor)}`, ...chart.ahead.map((p, i) => `${x(join + 1 + i)},${y(p.minor)}`)].join(" ") : "";
    const end = pts[pts.length - 1]!;
    return (
      <figure className="aa-fig is-path" data-chart="path">
        <div className="aa-plot">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
            {chart.target > 0 ? <line className="aa-ref" x1={0} x2={W} y1={y(chart.target)} y2={y(chart.target)} vectorEffect="non-scaling-stroke" /> : null}
            <polyline className="aa-line" points={past} vectorEffect="non-scaling-stroke" />
            {ahead ? <polyline className="aa-line is-ahead" points={ahead} vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          <i className="aa-dot is-now" style={{ left: `${(x(join) / W) * 100}%`, top: `${(y(chart.past[join]!.minor) / H) * 100}%` }} aria-hidden />
          {chart.ahead.length ? <i className="aa-dot is-end" style={{ left: `${(x(pts.length - 1) / W) * 100}%`, top: `${(y(end.minor) / H) * 100}%` }} aria-hidden /> : null}
        </div>
        <div className="aa-axis is-at" aria-hidden>
          {x(join) / W > 0.16 ? <span style={{ left: 0 }}>{MON(chart.past[0]!.key, lang)}</span> : null}
          <span className="is-now" style={{ left: `${(x(join) / W) * 100}%`, transform: x(join) / W > 0.9 ? "translateX(-100%)" : x(join) / W > 0.08 ? "translateX(-50%)" : undefined }}>{lang === "en" ? "now" : "hoy"}</span>
          {chart.ahead.length && chart.endKey && x(join) / W < 0.8 ? <span style={{ right: 0 }}>{`${MON(chart.endKey, lang)} ${chart.endKey.slice(2, 4)}`}</span> : null}
        </div>
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }
  if (chart.type === "ticks") {
    const peak = Math.max(1, ...chart.ticks.map((t) => t.minor));
    return (
      <figure className="aa-fig is-ticks" data-chart="ticks">
        <div className="aa-plot aa-track">
          {chart.ticks.map((t, i) => (
            <i key={i} className={t.late ? "is-late" : ""} style={{ left: `${(Math.max(0, Math.min(chart.days, t.day)) / chart.days) * 100}%`, height: `${30 + Math.round((t.minor / peak) * 70)}%` }} title={`${t.name} ${fmt(t.minor)}`} />
          ))}
        </div>
        <div className="aa-axis is-ends" aria-hidden><span>{lang === "en" ? "today" : "hoy"}</span><span>{chart.days / 2} d</span><span>{chart.days} d</span></div>
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }
  return null;
}

/** The right column on a tablet book: the comparison pane (when the book has one) and this area's Asesor under it.
 *  It sticks under the top bar while it fits; when taller than the screen it sticks by its bottom edge instead, so
 *  nothing in it is ever out of reach. Measured with a ResizeObserver (no layout read during a swipe). */
export function SideCol({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const set = () => { const h = el.offsetHeight; el.style.setProperty("--col-top", `${Math.min(140, window.innerHeight - h - 16)}px`); };
    const ro = new ResizeObserver(set);
    ro.observe(el);
    window.addEventListener("resize", set);
    set();
    return () => { ro.disconnect(); window.removeEventListener("resize", set); };
  }, []);
  return <div className="book-side-col" ref={ref}>{children}</div>;
}
