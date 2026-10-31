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

/* ── Ahorro y colchón: savings box + runway + savings rate in one card ─── */
export function CushionCard({ coach, pockets, goal }: { coach: Coach; pockets: { id: string; name: string; minor: number; color: string }[]; goal: number }) {
  const { fmt, lang } = useFaro();
  const have = pockets.reduce((a, p) => a + p.minor, 0);
  const months = coach.cushionMonths;
  const target = Math.max(1, coach.cushionTarget);
  const cells = Math.max(3, Math.min(12, Math.round(target)));
  const covered = months ?? 0;
  const saved = coach.saved;
  const goalPct = goal > 0 ? Math.max(0, Math.min(100, (saved / goal) * 100)) : 0;
  const gap = Math.max(0, goal - saved);
  const move = Math.min(gap, Math.max(0, coach.left));
  const peak = Math.max(...pockets.map((p) => p.minor), 1);
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <section className="card s2-cushion">
      <Head kicker={L(lang, "Ahorro", "Savings")} title={L(lang, "Si mañana no entrara nada", "If nothing came in tomorrow")} />
      <div className="s2-runway">
        <div className="s2-runway-big">
          <strong className="num serif">{months === null ? "—" : months.toFixed(1)}</strong>
          <span>{L(lang, `de ${target} meses`, `of ${target} months`)}</span>
        </div>
        <div className="s2-cells" aria-hidden>
          {Array.from({ length: cells }, (_, i) => {
            const fill = Math.max(0, Math.min(1, covered * (cells / target) - i));
            return <i key={i}><b style={{ width: `${fill * 100}%` }} /></i>;
          })}
        </div>
      </div>
      <p className="pano-lead">
        {months === null
          ? L(lang, "Anota tus gastos de casa y comida para saber cuánto colchón necesitas.", "Record your home and food costs to see how much cushion you need.")
          : L(lang, `Con lo guardado (${fmt(have)}) cubres ${months.toFixed(1)} meses de lo básico, que te cuesta ${fmt(coach.needsMonthly)} al mes. La meta sana son ${target}.`, `Your savings (${fmt(have)}) cover ${months.toFixed(1)} months of basics, which cost ${fmt(coach.needsMonthly)} a month. A healthy goal is ${target}.`)}
      </p>
      <div className="s2-month">
        <svg viewBox="0 0 80 80" className="s2-ring" aria-hidden>
          <circle cx="40" cy="40" r={R} className="s2-ring-bg" />
          <circle cx="40" cy="40" r={R} className="s2-ring-on" strokeDasharray={`${(goalPct / 100) * C} ${C}`} transform="rotate(-90 40 40)" />
          <text x="40" y="45" textAnchor="middle">{Math.round(goalPct)}%</text>
        </svg>
        <div>
          <em>{L(lang, "Este mes guardaste", "Saved this month")}</em>
          <strong className="num">{fmt(saved)} <small>/ {fmt(goal)}</small></strong>
          <p>
            {goal <= 0
              ? L(lang, "Pon una meta de ahorro en Ajustes.", "Set a savings goal in Settings.")
              : gap <= 0
                ? L(lang, "Meta del mes cumplida.", "Monthly goal reached.")
                : move > 0
                  ? L(lang, `Te sobraron ${fmt(coach.left)}. Pasa ${fmt(move)} al ahorro y ${move >= gap ? "cumples la meta" : "te acercas a la meta"}.`, `You had ${fmt(coach.left)} left. Move ${fmt(move)} to savings and ${move >= gap ? "you hit the goal" : "you get closer"}.`)
                  : L(lang, `Faltan ${fmt(gap)} para la meta.`, `${fmt(gap)} to go.`)}
          </p>
        </div>
      </div>
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

/* ── Números clave: the formula tiles as a clean list, empty ones hidden ─ */
const EMPTY = /^(—|-|[^\d]*0([.,]0+)?\s*%?|[^\d]*0([.,]0+)?\s*(en dólares|in dollars)?)$/i;
export function KeyNumbers({ items }: { items: Insight[] }) {
  const { lang } = useFaro();
  const [all, setAll] = useState(false);
  const shown = useMemo(() => items.filter((i) => !EMPTY.test(i.value.trim())), [items]);
  const list = all ? shown : shown.slice(0, 6);
  if (!shown.length) return null;
  return (
    <section className="card s2-keys">
      <Head title={L(lang, "Números clave", "Key numbers")}>
        <p className="pano-lead">{L(lang, "Las cuentas de fondo, con su fórmula en la i.", "The numbers underneath, with the formula behind the i.")}</p>
      </Head>
      <ul>
        {list.map((i) => (
          <li key={i.id}>
            <div className="s2-key-text">
              <span>{i.title}</span>
              <small>{i.detail}</small>
            </div>
            <strong className={`num serif ${i.tone === "neutral" ? "" : i.tone}`}>{i.value}</strong>
            <Explain title={i.title} meaning={i.meaning} formula={i.formula} implication={i.implication} label={i.title} />
          </li>
        ))}
      </ul>
      {shown.length > 6 ? (
        <button type="button" className="btn ghost s2-more" onClick={() => setAll((v) => !v)}>
          {all ? L(lang, "Ver menos", "Show less") : L(lang, `Ver los ${shown.length}`, `See all ${shown.length}`)}
        </button>
      ) : null}
    </section>
  );
}
