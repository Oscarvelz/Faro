// Estudio 2: the cards that replaced the overlapping charts (time, cushion, limits, key numbers).
import "./study2.css";
import { useMemo, useState } from "react";
import { useFaro } from "@/components/faro/provider";
import { Head } from "@/components/faro/panorama";
import { Explain } from "@/components/faro/ui";
import type { Coach } from "@/lib/faro/coach";
import type { Insight } from "@/lib/faro/types";

type Point = { key: string; label: string; income: number; expense: number };
type Span = "week" | "month" | "year";
const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/* ── Con el tiempo: one card instead of five ─────────────────────────── */
export function TimeCard({ points, span, onSpan, activeKey }: { points: Point[]; span: Span; onSpan: (s: Span) => void; activeKey: string }) {
  const { fmt, lang } = useFaro();
  const [pick, setPick] = useState<string | null>(null);
  const m = (v: number) => Math.round(v * 100);
  const rows = points.map((p) => ({ ...p, net: p.income - p.expense }));
  const sel = rows.find((p) => p.key === pick) ?? rows.find((p) => p.key === activeKey) ?? rows.find((p) => p.income || p.expense) ?? rows[0];
  const max = Math.max(...rows.map((p) => Math.max(p.income, p.expense)), 0.01);
  const tIn = rows.reduce((a, p) => a + p.income, 0);
  const tOut = rows.reduce((a, p) => a + p.expense, 0);
  const busy = rows.filter((p) => p.expense > 0);
  const top = busy.length ? busy.reduce((a, b) => (b.expense > a.expense ? b : a)) : null;
  const live = rows.filter((p) => p.income > 0 || p.expense > 0).length;
  const unit = span === "year" ? L(lang, "mes", "month") : span === "month" ? L(lang, "semana", "week") : L(lang, "día", "day");
  const word = span === "year" ? L(lang, "En el año", "This year") : span === "month" ? L(lang, "En el mes", "This month") : L(lang, "En la semana", "This week");
  const pct = sel && sel.income > 0 ? Math.round((sel.net / sel.income) * 100) : null;
  // Net line over the bars, drawn on the same scale (negatives sit on the floor in red).
  const n = Math.max(rows.length, 1);
  const pts = rows.map((p, i) => ({ x: ((i + 0.5) / n) * 100, y: 100 - (Math.max(0, p.net) / max) * 100, neg: p.net < 0, has: p.income > 0 || p.expense > 0 }));
  const path = pts.filter((p) => p.has).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return (
    <section className="card s2-time">
      <Head title={L(lang, "Entra, sale y queda", "In, out and left")} />
      <div className="s2-seg" role="tablist">
        {(["week", "month", "year"] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={span === id} onClick={() => { onSpan(id); setPick(null); }}>
            {id === "week" ? L(lang, "Semana", "Week") : id === "month" ? L(lang, "Mes", "Month") : L(lang, "Año", "Year")}
          </button>
        ))}
      </div>
      {sel ? (
        <div className="s2-readout" aria-live="polite">
          <p className="s2-when">{sel.label}</p>
          <div className="s2-trio">
            <div><em>{L(lang, "Entró", "In")}</em><strong className="num s2-in">{fmt(m(sel.income))}</strong></div>
            <div><em>{L(lang, "Salió", "Out")}</em><strong className="num s2-out">{fmt(m(sel.expense))}</strong></div>
            <div><em>{L(lang, "Quedó", "Left")}</em><strong className={`num ${sel.net < 0 ? "s2-bad" : "s2-net"}`}>{fmt(m(sel.net))}</strong></div>
          </div>
          <p className="s2-say">
            {sel.income <= 0 && sel.expense <= 0
              ? L(lang, "Nada anotado aquí todavía.", "Nothing recorded here yet.")
              : sel.income <= 0
                ? L(lang, "Salió dinero sin que entrara nada en este periodo.", "Money went out with nothing coming in this period.")
                : sel.net >= 0
                  ? L(lang, `De cada C$100 que entraron, te quedaron C$${pct}.`, `Of every 100 that came in, ${pct} stayed with you.`)
                  : L(lang, `Gastaste ${fmt(m(-sel.net))} más de lo que entró.`, `You spent ${fmt(m(-sel.net))} more than came in.`)}
          </p>
        </div>
      ) : null}
      <div className="s2-chart">
        <div className="s2-bars" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {rows.map((p) => (
            <button key={p.key} type="button" className={p.key === sel?.key ? "is-on" : undefined} aria-pressed={p.key === sel?.key} aria-label={`${p.label}: ${fmt(m(p.income))} / ${fmt(m(p.expense))}`} onClick={() => setPick(p.key)}>
              <span className="s2-pair">
                <i className="s2-in" style={{ height: `${p.income > 0 ? Math.max(3, (p.income / max) * 100) : 0}%` }} />
                <i className="s2-out" style={{ height: `${p.expense > 0 ? Math.max(3, (p.expense / max) * 100) : 0}%` }} />
              </span>
              <b>{p.label}</b>
            </button>
          ))}
        </div>
        {live > 1 ? (
          <svg className="s2-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={path} vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}
      </div>
      <div className="s2-legend">
        <span><i className="s2-in" />{L(lang, "Entra", "In")}</span>
        <span><i className="s2-out" />{L(lang, "Sale", "Out")}</span>
        <span><i className="s2-netkey" />{L(lang, "Queda", "Left")}</span>
      </div>
      <p className="pano-lead">
        {word}: {L(lang, "entró", "in")} <strong className="num">{fmt(m(tIn))}</strong>, {L(lang, "salió", "out")} <strong className="num">{fmt(m(tOut))}</strong>
        {top && live > 1 ? L(lang, `. El ${unit} de más gasto: ${top.label} (${fmt(m(top.expense))}).`, `. Biggest-spending ${unit}: ${top.label} (${fmt(m(top.expense))}).`) : "."}
        {" "}{L(lang, "Toca una barra para verla.", "Tap a bar to see it.")}
      </p>
    </section>
  );
}

/* ── Ahorro y colchón: a voyage to the lighthouse, a jar, and a what-if dial ─ */
export function CushionCard({ coach, pockets, goal }: { coach: Coach; pockets: { id: string; name: string; minor: number; color: string }[]; goal: number }) {
  const { fmt, lang } = useFaro();
  const have = pockets.reduce((a, p) => a + p.minor, 0);
  const months = coach.cushionMonths;
  const target = Math.max(1, coach.cushionTarget);
  const need = coach.needsMonthly;
  const covered = Math.max(0, months ?? 0);
  const reach = Math.min(1, covered / target);
  const saved = coach.saved;
  const goalPct = goal > 0 ? Math.max(0, Math.min(100, (saved / goal) * 100)) : 0;
  const gap = Math.max(0, goal - saved);
  const move = Math.min(gap, Math.max(0, coach.left));
  const peak = Math.max(...pockets.map((p) => p.minor), 1);
  const locale = lang === "en" ? "en-US" : "es-NI";
  const day = (d: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d).replace(".", "");
  const mon = (d: Date) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
  const today = new Date();
  const until = new Date(today.getTime() + covered * 30.44 * 86400000);
  // What-if dial: how long to the full cushion if you set aside X a month.
  const missing = Math.max(0, target * need - have);
  const step = Math.max(100, Math.round(need / 2000) * 100);
  const top = Math.max(step * 4, Math.round(Math.max(coach.left, goal, need / 2) * 1.5 / step) * step);
  const [per, setPer] = useState(() => Math.min(top, Math.max(step, Math.round((goal || need / 4) / step) * step)));
  const runs = per > 0 && missing > 0 ? Math.ceil(missing / per) : 0;
  const land = new Date(today.getFullYear(), today.getMonth() + runs, 1);
  // Voyage geometry (viewBox 320 × 120).
  const x0 = 26, x1 = 282;
  const bx = x0 + (x1 - x0) * reach;
  const ticks = Array.from({ length: Math.round(target) + 1 }, (_, i) => i);
  const done = reach >= 1;
  return (
    <section className="card s2-cushion">
      <Head kicker={L(lang, "Ahorro", "Savings")} title={L(lang, "Si mañana no entrara nada", "If nothing came in tomorrow")} />
      <div className={`s2-voyage${done ? " is-home" : ""}`}>
        <svg viewBox="0 0 320 124" role="img" aria-label={L(lang, `Cubres ${covered.toFixed(1).replace(/\.0$/, "")} de ${target} meses`, `${covered.toFixed(1).replace(/\.0$/, "")} of ${target} months covered`)}>
          <defs>
            <linearGradient id="s2-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a4b63" /><stop offset="1" stopColor="#0f1d2a" /></linearGradient>
            <linearGradient id="s2-beam" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#ffd98a" stopOpacity=".55" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
            <clipPath id="s2-clip"><rect x="0" y="0" width="320" height="124" rx="18" /></clipPath>
          </defs>
          <g clipPath="url(#s2-clip)">
            <rect width="320" height="124" fill="#0c1520" />
            {[[40, 18], [92, 30], [150, 14], [210, 26], [250, 12], [118, 44], [180, 40]].map(([x, y], i) => <circle key={i} className="s2-star" cx={x} cy={y} r={i % 3 ? 0.9 : 1.3} style={{ animationDelay: `${i * 0.6}s` }} />)}
            <polygon className="s2-beamcone" points={`${x1 + 6},50 ${Math.max(x0, bx + 10)},38 ${Math.max(x0, bx + 10)},66`} fill="url(#s2-beam)" />
            <rect y="78" width="320" height="46" fill="url(#s2-sea)" />
            <path className="s2-wave a" d="M0 80 Q 20 75 40 80 T 80 80 T 120 80 T 160 80 T 200 80 T 240 80 T 280 80 T 320 80 T 360 80 T 400 80 V124 H0Z" />
            <path className="s2-wave b" d="M0 88 Q 25 83 50 88 T 100 88 T 150 88 T 200 88 T 250 88 T 300 88 T 350 88 T 400 88 V124 H0Z" />
            <line x1={x0} y1="104" x2={x1} y2="104" className="s2-route" />
            <line x1={x0} y1="104" x2={bx} y2="104" className="s2-route-on" />
            {ticks.map((i) => {
              const tx = x0 + ((x1 - x0) * i) / target;
              const d = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
              return (
                <g key={i} className={i / target <= reach ? "s2-tick is-on" : "s2-tick"}>
                  <circle cx={tx} cy="104" r="2.6" />
                  <text x={tx} y="118" textAnchor="middle">{i === 0 ? L(lang, "hoy", "today") : day(d)}</text>
                </g>
              );
            })}
            {/* lighthouse */}
            <g transform={`translate(${x1 + 4} 30)`} className="s2-house">
              <path d="M-7 50 L-4 8 L4 8 L7 50 Z" fill="#e9e2d0" />
              <path d="M-6.2 38 L6.2 38 L6.6 44 L-6.6 44 Z M-5.2 22 L5.2 22 L5.6 28 L-5.6 28 Z" fill="#c45c4a" />
              <rect x="-5" y="2" width="10" height="7" rx="1.5" className="s2-lamp" />
              <path d="M-6 2 L0 -4 L6 2 Z" fill="#c45c4a" />
              <rect x="-10" y="49" width="20" height="4" rx="2" fill="#3a4a56" />
            </g>
            {/* boat */}
            <g className="s2-boat" style={{ transform: `translate(${bx}px, 0px)` }}>
              <g className="s2-bob">
                <path d="M-11 92 L11 92 L7 99 L-7 99 Z" fill="#d7b48a" />
                <path d="M0 91 L0 72 L10 89 Z" fill="#f4efe4" />
                <path d="M-1 91 L-1 76 L-8 89 Z" fill="#cfd8de" />
              </g>
            </g>
          </g>
        </svg>
        <div className="s2-voyage-read">
          <div>
            <em>{L(lang, "Te alcanzaría hasta", "It would last until")}</em>
            <strong className="serif">{months === null ? "—" : covered < 0.034 ? L(lang, "hoy mismo", "today") : day(until)}</strong>
          </div>
          <div>
            <em>{L(lang, "Meses cubiertos", "Months covered")}</em>
            <strong className="serif num">{months === null ? "—" : covered.toFixed(1).replace(/\.0$/, "")}<small> / {target}</small></strong>
          </div>
        </div>
      </div>
      <p className="pano-lead">
        {months === null
          ? L(lang, "Anota tus gastos de casa y comida para trazar la ruta.", "Record your home and food costs to chart the route.")
          : done
            ? L(lang, `Llegaste al faro: lo guardado (${fmt(have)}) cubre ${covered.toFixed(1).replace(/\.0$/, "")} meses de lo básico.`, `You reached the lighthouse: your savings (${fmt(have)}) cover ${covered.toFixed(1).replace(/\.0$/, "")} months of basics.`)
            : L(lang, `Lo básico te cuesta ${fmt(need)} al mes. El faro está a ${target} meses: ${fmt(target * need)} guardados.`, `Basics cost ${fmt(need)} a month. The lighthouse is ${target} months out: ${fmt(target * need)} saved.`)}
      </p>

      <div className="s2-month">
        <div className="s2-jar" aria-hidden>
          <div className="s2-jar-glass">
            <div className="s2-jar-water" style={{ height: `${Math.max(goalPct, 3)}%` }}>
              <svg viewBox="0 0 120 12" preserveAspectRatio="none"><path d="M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 V12 H0Z" /></svg>
            </div>
            <span className="num">{Math.round(goalPct)}%</span>
          </div>
          <i className="s2-jar-lid" />
        </div>
        <div>
          <em>{L(lang, "Este mes guardaste", "Saved this month")}</em>
          <strong className="num">{fmt(saved)} <small>/ {fmt(goal)}</small></strong>
          <p>
            {goal <= 0
              ? L(lang, "Pon una meta de ahorro en Ajustes.", "Set a savings goal in Settings.")
              : gap <= 0
                ? L(lang, "Frasco lleno: meta del mes cumplida.", "Jar full: monthly goal reached.")
                : move > 0
                  ? L(lang, `Te sobraron ${fmt(coach.left)}. Pasa ${fmt(move)} al ahorro y ${move >= gap ? "llenas el frasco" : "te acercas"}.`, `You had ${fmt(coach.left)} left. Move ${fmt(move)} to savings and ${move >= gap ? "the jar is full" : "you get closer"}.`)
                  : L(lang, `Faltan ${fmt(gap)} para llenar el frasco.`, `${fmt(gap)} to fill the jar.`)}
          </p>
        </div>
      </div>

      {months !== null && missing > 0 ? (
        <div className="s2-whatif">
          <p className="s2-whatif-q">{L(lang, "¿Y si apartara cada mes…?", "What if I set aside each month…?")}</p>
          <div className="s2-whatif-amt num serif">{fmt(per)}</div>
          <input type="range" min={step} max={top} step={step} value={per} onChange={(e) => setPer(Number(e.target.value))} aria-label={L(lang, "Ahorro al mes", "Monthly saving")} style={{ ["--p" as string]: `${((per - step) / Math.max(1, top - step)) * 100}%` }} />
          <div className="s2-whatif-dots" aria-hidden>
            {Array.from({ length: Math.min(runs, 36) }, (_, i) => <i key={i} style={{ animationDelay: `${i * 18}ms` }} />)}
            {runs > 36 ? <b className="num">+{runs - 36}</b> : null}
          </div>
          <p className="s2-whatif-a">
            {L(lang, "Llegas al faro en ", "You reach the lighthouse in ")}
            <strong>{runs} {runs === 1 ? L(lang, "mes", "month") : L(lang, "meses", "months")}</strong>
            {L(lang, `, hacia ${mon(land)}.`, `, around ${mon(land)}.`)}
          </p>
        </div>
      ) : null}

      {pockets.some((p) => p.minor > 0) ? (
        <div className="s2-pockets">
          {pockets.filter((p) => p.minor > 0).map((p) => (
            <div key={p.id} className="s2-pocket">
              <span><i style={{ background: p.color }} />{p.name}</span>
              <strong className="num">{fmt(p.minor)}</strong>
              <div className="s2-track"><b style={{ width: `${Math.max(4, (p.minor / peak) * 100)}%`, background: p.color }} /></div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ── Topes: spent vs what you planned, in plain words ─────────────────── */
export function LimitsCard({ rows }: { rows: { name: string; budget: number; actual: number }[] }) {
  const { fmt, lang } = useFaro();
  return (
    <section className="card s2-limits">
      <Head kicker={L(lang, "Tu plan", "Your plan")} title={L(lang, "¿Vas dentro del tope?", "Within your limits?")} />
      <p className="pano-lead">{L(lang, "Cuánto llevas gastado de lo que te alcanza en cada grupo, después de apartar tu ahorro.", "How much of each group's room you've used, after setting savings aside.")}</p>
      {rows.map((r) => {
        const used = r.budget > 0 ? (r.actual / r.budget) * 100 : r.actual > 0 ? 150 : 0;
        const over = r.actual > r.budget;
        return (
          <div key={r.name} className={`s2-limit${over ? " is-over" : used >= 85 ? " is-near" : ""}`}>
            <div className="s2-limit-top">
              <span>{r.name}</span>
              <strong className="num">{over ? L(lang, `Te pasaste ${fmt(r.actual - r.budget)}`, `Over by ${fmt(r.actual - r.budget)}`) : L(lang, `Te quedan ${fmt(r.budget - r.actual)}`, `${fmt(r.budget - r.actual)} left`)}</strong>
            </div>
            <div className="s2-track s2-limit-track">
              <b style={{ width: `${Math.min(100, used)}%` }} />
              {over ? <i style={{ width: `${Math.min(100, used - 100)}%` }} /> : null}
            </div>
            <p className="s2-limit-sub num">{fmt(r.actual)} {L(lang, "de", "of")} {fmt(r.budget)} · {Math.round(used)}%</p>
          </div>
        );
      })}
    </section>
  );
}

/* ── Números clave: each number with its own small picture; formulas stay behind the i ─ */
const EMPTY = /^(—|-|[^\d]*0([.,]0+)?\s*%?|[^\d]*0([.,]0+)?\s*(en dólares|in dollars)?)$/i;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function Ring({ pct, mark, tone }: { pct: number; mark?: number; tone: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const over = pct > 100;
  const f = clamp01(pct / 100);
  const m = mark !== undefined ? clamp01(mark / 100) * 2 * Math.PI - Math.PI / 2 : null;
  return (
    <svg viewBox="0 0 56 56" className={`kn-viz is-${tone}`} aria-hidden>
      <circle cx="28" cy="28" r={r} className="kn-track" />
      <circle cx="28" cy="28" r={r} className={`kn-arc${over ? " is-over" : ""}`} strokeDasharray={`${f * c} ${c}`} transform="rotate(-90 28 28)" />
      {m !== null ? <line x1={28 + Math.cos(m) * 16} y1={28 + Math.sin(m) * 16} x2={28 + Math.cos(m) * 27.5} y2={28 + Math.sin(m) * 27.5} className="kn-mark" /> : null}
      <text x="28" y="31.5" className="kn-in">{Math.round(pct)}%</text>
    </svg>
  );
}

function Viz({ item }: { item: Insight }) {
  const v = item.viz;
  const tone = item.tone === "neutral" ? "calm" : item.tone;
  if (!v) return <span className="kn-viz kn-blank" aria-hidden />;
  if (v.kind === "ring" || v.kind === "share") return <Ring pct={v.pct} mark={v.kind === "ring" ? v.mark : undefined} tone={tone} />;
  if (v.kind === "parts") {
    const r = 22;
    const c = 2 * Math.PI * r;
    let at = 0;
    return (
      <svg viewBox="0 0 56 56" className="kn-viz" aria-hidden>
        <circle cx="28" cy="28" r={r} className="kn-track" />
        {v.parts.map((p, i) => {
          const len = p.share * c;
          const el = <circle key={i} cx="28" cy="28" r={r} className="kn-part" style={{ stroke: p.color, opacity: i < v.cut ? 1 : 0.22 }} strokeDasharray={`${Math.max(0, len - 1.2)} ${c}`} strokeDashoffset={-at} transform="rotate(-90 28 28)" />;
          at += len;
          return el;
        })}
        <text x="28" y="32.5" className="kn-in is-big">{v.cut}</text>
      </svg>
    );
  }
  if (v.kind === "split") {
    const tot = v.a + v.b || 1;
    const r = 22;
    const c = 2 * Math.PI * r;
    const fa = v.a / tot;
    return (
      <svg viewBox="0 0 56 56" className="kn-viz" aria-hidden>
        <circle cx="28" cy="28" r={r} className="kn-arc is-b" strokeDasharray={`${c} ${c}`} />
        <circle cx="28" cy="28" r={r} className="kn-arc is-a" strokeDasharray={`${fa * c} ${c}`} transform="rotate(-90 28 28)" />
        <text x="28" y="26" className="kn-in is-sm">{v.aLabel}</text>
        <text x="28" y="37" className="kn-in">{Math.round(fa * 100)}%</text>
      </svg>
    );
  }
  if (v.kind === "cover") {
    const goal = Math.max(1, Math.round(v.goal));
    const cells = Array.from({ length: goal }, (_, i) => clamp01(v.months - i));
    const h = 40 / goal;
    return (
      <svg viewBox="0 0 56 56" className={`kn-viz is-${tone}`} aria-hidden>
        <rect x="16" y="6" width="24" height="44" rx="6" className="kn-jar" />
        {cells.map((f, i) => (
          <g key={i}>
            <rect x="19" y={48 - (i + 1) * h + 1} width="18" height={h - 2} rx="2.5" className="kn-cell" />
            {f > 0 ? <rect x="19" y={48 - i * h - 1 - (h - 2) * f} width="18" height={(h - 2) * f} rx="2.5" className="kn-fill" /> : null}
          </g>
        ))}
      </svg>
    );
  }
  if (v.kind === "days") {
    const cols = 7;
    const rows = Math.ceil(v.days / cols);
    const gap = 44 / cols;
    return (
      <svg viewBox="0 0 56 56" className={`kn-viz is-${v.day ? "bad" : "good"}`} aria-hidden>
        {Array.from({ length: v.days }, (_, i) => (
          <circle key={i} cx={6 + (i % cols) * gap + gap / 2 - 0.5} cy={28 - (rows * gap) / 2 + Math.floor(i / cols) * gap + gap / 2} r={2.1} className={v.day && i + 1 > v.day ? "kn-dot is-off" : "kn-dot"} />
        ))}
      </svg>
    );
  }
  // delta: last month vs this month, two bars on one scale
  const max = Math.max(v.now, v.prev, 1);
  const hp = (v.prev / max) * 38;
  const hn = (v.now / max) * 38;
  return (
    <svg viewBox="0 0 56 56" className={`kn-viz is-${v.now > v.prev ? "warn" : "good"}`} aria-hidden>
      <line x1="8" y1="47" x2="48" y2="47" className="kn-base" />
      <rect x="14" y={47 - hp} width="11" height={hp} rx="3" className="kn-bar is-prev" />
      <rect x="31" y={47 - hn} width="11" height={hn} rx="3" className="kn-bar is-now" />
    </svg>
  );
}

const CAPTION: Record<string, [string, string]> = {
  petty: ["del ingreso, al mes", "of income, monthly"],
  subs: ["del ingreso", "of income"],
  remit: ["del ingreso", "of income"],
  largest: ["del gasto del mes", "of the month's spending"],
  flex: ["del ingreso", "of income"],
};

export function KeyNumbers({ items }: { items: Insight[] }) {
  const { lang } = useFaro();
  const [all, setAll] = useState(false);
  const shown = useMemo(() => items.filter((i) => !EMPTY.test(i.value.trim())), [items]);
  const list = all ? shown : shown.slice(0, 6);
  if (!shown.length) return null;
  return (
    <section className="card s2-keys">
      <Head title={L(lang, "Números clave", "Key numbers")}>
        <p className="pano-lead">{L(lang, "Lo que hay debajo de tu mes. Toca la i para ver cómo se calcula.", "What sits under your month. Tap the i to see how it's worked out.")}</p>
      </Head>
      <ul className="kn-list">
        {list.map((i, n) => {
          const cap = CAPTION[i.id];
          const pct = i.viz && (i.viz.kind === "share" || i.viz.kind === "ring") ? i.viz.pct : null;
          return (
            <li key={i.id} className={`kn-row tone-${i.tone}`} style={{ ["--n" as string]: String(n) }}>
              <Viz item={i} />
              <div className="kn-text">
                <span className="kn-title">{i.title}</span>
                <strong className={`kn-value num ${i.tone === "neutral" ? "" : i.tone}`}>{i.value}</strong>
                <small className="kn-detail">
                  {cap && pct !== null && i.viz?.kind === "share" ? `${Math.round(pct)}% ${L(lang, cap[0], cap[1])} · ` : ""}
                  {i.detail}
                </small>
              </div>
              <Explain title={i.title} meaning={i.meaning} formula={i.formula} implication={i.implication} label={i.title} />
            </li>
          );
        })}
      </ul>
      {shown.length > 6 ? (
        <button type="button" className="btn ghost s2-more" onClick={() => setAll((v) => !v)}>
          {all ? L(lang, "Ver menos", "Show less") : L(lang, `Ver los ${shown.length}`, `See all ${shown.length}`)}
        </button>
      ) : null}
    </section>
  );
}
