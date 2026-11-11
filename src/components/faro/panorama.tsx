import "./panorama.css";
import { Note } from "./finish";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronDown, ChevronRight, CircleHelp, Sparkles, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "@/components/faro/provider";
import { readCoach, SCORE_WEIGHTS, type Coach, type CoachLine, type Pillar, type Tone } from "@/lib/faro/coach";
import type { LineKind, SectionId } from "@/lib/faro/types";
import { StatFold, useFoldTopic } from "@/components/faro/charts";
import { Hint } from "./hint";
import { SubMark } from "./icons";
import { isTron } from "@/lib/faro/colors";
import { dateFmt } from "@/lib/faro/datefmt";

function sectionFor(kind: string): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  return "subs";
}

export function useCoach(): Coach | null {
  const { session, key, lang, names } = useFaro();
  return useMemo(() => (session ? readCoach(session.ledger, key, lang, names) : null), [session, key, lang, names]);
}

const toneVar: Record<Tone, string> = { good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)", neutral: "var(--muted)" };

/** A list of real lines; tapping one opens it in its book. */
export function LineList({ coach, ids, empty }: { coach: Coach; ids: string[]; empty?: string }) {
  const { fmt, setUi, lang } = useFaro();
  const rows = coach.lines.filter((l) => ids.includes(l.id)).sort((a, b) => b.minor - a.minor);
  if (!rows.length) return empty ? <Note>{empty}</Note> : null;
  const shown = rows.slice(0, 8);
  return (
    <ul className="pano-lines">
      {shown.map((row: CoachLine) => (
        <li key={row.id}>
          <button type="button" onClick={() => setUi({ section: sectionFor(row.kind as LineKind), highlight: row.id })}>
            <span className="pano-line-name">{row.name}<em>{row.category}</em></span>
            <strong className="num">{fmt(row.minor)}</strong>
            <ChevronRight aria-hidden />
          </button>
        </li>
      ))}
      {rows.length > shown.length ? <li className="pano-more">{lang === "en" ? `+${rows.length - shown.length} more` : `+${rows.length - shown.length} más`}</li> : null}
    </ul>
  );
}

/** Semicircle dial for the health score. */
export function ScoreDial({ score, tone, label, size = 168 }: { score: number; tone: Tone; label: string; size?: number }) {
  if (isTron()) return <TronDial score={score} tone={tone} label={label} size={size} />;
  const r = 70;
  const len = Math.PI * r;
  const on = (Math.max(0, Math.min(100, score)) / 100) * len;
  return (
    <div className="pano-dial" style={{ width: size, ["--s" as string]: `${size}px`, ["--sc" as string]: String(Math.max(0, Math.min(100, score))) }}>
      <svg viewBox="0 0 180 104" aria-hidden>
        <defs>
          <linearGradient id="dial-grad" x1="0" x2="1">
            <stop offset="0" stopColor="var(--bad)" />
            <stop offset="0.5" stopColor="var(--warn)" />
            <stop offset="1" stopColor="var(--good)" />
          </linearGradient>
        </defs>
        <path d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="var(--surface-2)" strokeWidth="14" strokeLinecap="round" />
        <path className="pano-dial-arc" d="M20 94 A70 70 0 0 1 160 94" fill="none" stroke="url(#dial-grad)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${on} ${len}`} />
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI - (i / 10) * Math.PI;
          return <line key={i} x1={90 + Math.cos(a) * 52} y1={94 - Math.sin(a) * 52} x2={90 + Math.cos(a) * 56} y2={94 - Math.sin(a) * 56} stroke="var(--line)" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="pano-dial-read">
        <strong className="num serif" style={{ color: toneVar[tone] }}>{score}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Tron only: the same score as a light-cycle speedometer. Same footprint, same reading. */
function TronDial({ score, tone, label, size }: { score: number; tone: Tone; label: string; size: number }) {
  const v = Math.max(0, Math.min(100, score));
  const cx = 90, cy = 94;
  const at = (p: number, r: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + Math.cos(a) * r, cy - Math.sin(a) * r] as const;
  };
  // 0-40 red, 40-70 orange, 70-100 teal: the same bands the score label uses.
  const band = (p: number) => (p < 40 ? "var(--bad)" : p < 70 ? "var(--warn)" : "var(--good)");
  const SEG = 30;
  const segs = Array.from({ length: SEG }, (_, i) => {
    const p0 = (i / SEG) * 100 + 0.9, p1 = ((i + 1) / SEG) * 100 - 0.9;
    const [x1, y1] = at(p0, 70), [x2, y2] = at(p1, 70), [x3, y3] = at(p1, 60), [x4, y4] = at(p0, 60);
    const lit = (i + 0.5) / SEG * 100 <= v;
    return { d: `M${x1.toFixed(2)} ${y1.toFixed(2)} A70 70 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${x3.toFixed(2)} ${y3.toFixed(2)} A60 60 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}Z`, lit, c: band((i + 0.5) / SEG * 100), i };
  });
  const rot = -90 + (v / 100) * 180;
  return (
    <div className="pano-dial t-speedo" style={{ width: size, ["--s" as string]: `${size}px`, ["--rot" as string]: `${rot}deg` }}>
      <svg viewBox="0 0 180 104" aria-hidden>
        <path className="t-speedo-bezel" d={`M${cx - 82} ${cy} A82 82 0 0 1 ${cx + 82} ${cy}`} />
        {Array.from({ length: 51 }, (_, i) => {
          const p = i * 2;
          const major = p % 10 === 0;
          const [x1, y1] = at(p, major ? 74 : 76), [x2, y2] = at(p, 80);
          return <line key={i} className={major ? "t-tick is-major" : "t-tick"} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {[0, 20, 40, 60, 80, 100].map((p) => {
          const [x, y] = at(p, 88);
          return <text key={p} className="t-speedo-num" x={x} y={y + 2.4} textAnchor="middle">{p}</text>;
        })}
        {segs.map((sg) => (
          <path key={sg.i} d={sg.d} className={sg.lit ? "t-seg is-lit" : "t-seg"} style={sg.lit ? { fill: sg.c, color: sg.c, animationDelay: `${sg.i * 22}ms` } : undefined} />
        ))}
        <g className="t-needle" style={{ color: band(v) }}>
          <path d={`M${cx - 1.6} ${cy - 46} L${cx} ${cy - 80} L${cx + 1.6} ${cy - 46}Z`} />
          <line x1={cx} y1={cy - 46} x2={cx} y2={cy - 80} />
        </g>
      </svg>
      <div className="pano-dial-read">
        <strong className="num serif" style={{ color: toneVar[tone] }}>{score}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function Head({ kicker, title, children, topic }: { kicker?: string; title: string; children?: ReactNode; topic?: string }) {
  // The card's (?) rides on the short kicker line (or after the title when there is none), so titles never re-wrap.
  const fold = useFoldTopic();
  const id = topic ?? fold;
  return (
    <div className="pano-head">
      {kicker ? <p className="pano-kicker">{id ? <span className="lab-head">{kicker}<Hint topic={id} /></span> : kicker}</p> : null}
      <h2 className={`serif text-2xl${!kicker && id ? " lab-head is-title" : ""}`}>{title}{!kicker && id ? <Hint topic={id} fitParent /> : null}</h2>
      {children}
    </div>
  );
}

/* 1 · Where the month's money went: ring of five buckets. */
export function PulseCard({ coach }: { coach: Coach }) {
  const { fmt, lang } = useFaro();
  const [pick, setPick] = useState<string | null>(null);
  const parts = coach.buckets.filter((b) => b.minor > 0);
  const total = parts.reduce((a, b) => a + b.minor, 0) || 1;
  const R = 62;
  const C = 2 * Math.PI * R;
  const gap = parts.length > 1 ? 3 : 0;
  let at = 0;
  const chosen = coach.buckets.find((b) => b.id === pick);
  const over = coach.left < 0;
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "This month" : "Este mes"} title={lang === "en" ? "Month at a glance" : "Tu mes de un vistazo"} />
      <div className="pano-pulse">
        <svg viewBox="0 0 160 160" className={`pano-ring${pick ? " has-pick" : ""}`} role="img" aria-label={coach.verdict}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="18" className="pano-ring-base" />
          {parts.map((b) => {
            const len = (b.minor / total) * C;
            const seg = (
              <circle
                key={b.id}
                className={`pano-seg${pick && pick !== b.id ? " is-dim" : ""}${pick === b.id ? " is-pick" : ""}`}
                style={{ ["--c" as string]: b.color }}
                cx="80" cy="80" r={R} fill="none" stroke={b.color} strokeWidth={pick === b.id ? 22 : 18}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-at}
                transform="rotate(-90 80 80)"
                role="button" tabIndex={0} aria-label={`${b.label} ${Math.round(b.pct)}%`} aria-pressed={pick === b.id}
                onClick={(e) => { e.stopPropagation(); setPick((cur) => (cur === b.id ? null : b.id)); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPick((cur) => (cur === b.id ? null : b.id)); } }}
              />
            );
            at += len;
            return seg;
          })}
        </svg>
        <div className="pano-ring-read">
          <span>{chosen ? chosen.label : over ? (lang === "en" ? "Short" : "Falta") : (lang === "en" ? "Left" : "Te queda")}</span>
          <strong className="num serif">{fmt(chosen ? chosen.minor : Math.abs(coach.left))}</strong>
          <em>{chosen ? `${Math.round(chosen.pct)}%` : coach.income > 0 ? `${Math.round((Math.abs(coach.left) / coach.income) * 100)}% ${lang === "en" ? "of income" : "del ingreso"}` : ""}</em>
        </div>
      </div>
      {coach.income > 0 ? <p className="pano-lead">{coach.verdict} {coach.verdictSub}</p> : <Note kind="pen">{coach.verdict} {coach.verdictSub}</Note>}
      <div className="pano-chips">
        {coach.buckets.map((b) => (
          <button key={b.id} type="button" aria-pressed={pick === b.id} disabled={b.minor <= 0} onClick={() => setPick((cur) => (cur === b.id ? null : b.id))}>
            <i style={{ background: b.color }} />
            <span>{b.label}</span>
            <strong className="num">{Math.round(b.pct)}%</strong>
          </button>
        ))}
      </div>
      {chosen ? (
        <div className="pano-pick">
          <p>{chosen.hint}</p>
          <LineList coach={coach} ids={chosen.lineIds} empty={chosen.id === "free" ? (lang === "en" ? "This is money with no job yet." : "Es dinero que todavía no tiene destino.") : undefined} />
        </div>
      ) : null}
    </section>
  );
}

/* 2 · Of every 100: a 10×10 waffle. */
export function WaffleCard({ coach }: { coach: Coach }) {
  const { fmt, lang, session } = useFaro();
  const [pick, setPick] = useState<string | null>(null);
  const unit = session?.ledger.settings.display === "USD" ? "$100" : "C$100";
  const squares: { id: string; color: string }[] = [];
  for (const cell of coach.per100) for (let i = 0; i < cell.count; i += 1) squares.push({ id: cell.id, color: cell.color });
  while (squares.length < 100) squares.push({ id: "", color: "" });
  const chosen = coach.per100.find((c) => c.id === pick);
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Simple math" : "Cuentas claras"} title={lang === "en" ? `Your ${unit}` : `Tus ${unit}`} />
      {coach.per100.length ? <p className="pano-lead">{coach.per100Line}</p> : <Note>{coach.per100Line}</Note>}
      <div className="pano-waffle" role="img" aria-label={coach.per100Line}>
        {squares.map((sq, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`${!sq.id ? "is-blank" : ""}${sq.id === "free" ? " is-free" : ""}${pick && sq.id !== pick ? " is-dim" : ""}`}
            style={{ background: sq.id === "free" ? undefined : sq.color || undefined, ["--c" as string]: sq.color || undefined, animationDelay: `${(i % 10) * 18 + Math.floor(i / 10) * 18}ms` }}
            onClick={() => sq.id && setPick((cur) => (cur === sq.id ? null : sq.id))}
            aria-hidden
          />
        ))}
      </div>
      <div className="pano-legend">
        {coach.per100.map((c) => (
          <button key={c.id} type="button" className={c.id === "free" ? "is-free" : undefined} aria-pressed={pick === c.id} onClick={() => setPick((cur) => (cur === c.id ? null : c.id))}>
            <i style={c.id === "free" ? undefined : { background: c.color }} />
            <span>{c.name}</span>
            <strong className="num">{c.count}</strong>
          </button>
        ))}
      </div>
      {chosen ? (
        <div className="pano-pick">
          <p>
            {lang === "en"
              ? `${chosen.name}: ${chosen.count} of every ${unit}, ${fmt(chosen.minor)} this month.`
              : `${chosen.name}: ${chosen.count} de cada ${unit}, ${fmt(chosen.minor)} este mes.`}
          </p>
          <LineList coach={coach} ids={chosen.lineIds} />
        </div>
      ) : null}
    </section>
  );
}

/* 3 · The 50/30/20 guide. */
export function RuleCard({ coach }: { coach: Coach }) {
  const { lang, fmt } = useFaro();
  const needs = coach.buckets.find((b) => b.id === "needs")!;
  const wants = coach.buckets.find((b) => b.id === "wants")!;
  const save = coach.buckets.find((b) => b.id === "save")!;
  const debt = coach.buckets.find((b) => b.id === "debt")!;
  const rows = [
    { id: "needs", label: needs.label, pct: needs.pct, minor: needs.minor, ideal: 50, more: false, color: needs.color },
    { id: "wants", label: wants.label, pct: wants.pct, minor: wants.minor, ideal: 30, more: false, color: wants.color },
    { id: "future", label: lang === "en" ? "Savings + debt" : "Ahorro + deudas", pct: save.pct + debt.pct, minor: save.minor + debt.minor, ideal: 20, more: true, color: save.color },
  ];
  const peak = Math.max(100, ...rows.map((r) => r.pct));
  const verdict = (r: (typeof rows)[number]) => {
    const diff = Math.round(r.pct - r.ideal);
    if (r.more) return diff >= 0 ? (lang === "en" ? "On target" : "En la meta") : lang === "en" ? `${-diff} points short` : `Faltan ${-diff} puntos`;
    if (diff <= 0) return lang === "en" ? "Within the guide" : "Dentro de la guía";
    return lang === "en" ? `${diff} points over` : `${diff} puntos arriba`;
  };
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "A simple guide" : "Una guía sencilla"} title={lang === "en" ? "The 50 · 30 · 20 rule" : "La regla 50 · 30 · 20"} />
      <p className="pano-lead">
        {lang === "en"
          ? "Of every 100 that come in: 50 for needs, 30 for wants, 20 for your future. The tick is the guide; the bar is you."
          : "De cada 100 que entran: 50 para lo necesario, 30 para gustos y 20 para tu futuro. La rayita es la guía; la barra eres tú."}
      </p>
      <div className="pano-rule">
        {rows.map((r) => {
          const ok = r.more ? r.pct >= r.ideal : r.pct <= r.ideal;
          return (
            <div key={r.id} className="pano-rule-row">
              <div className="pano-rule-top">
                <span><i style={{ background: r.color }} />{r.label}</span>
                <strong className="num">{Math.round(r.pct)}%</strong>
              </div>
              <div className="pano-rule-track">
                <b style={{ width: `${(Math.min(r.pct, peak) / peak) * 100}%`, background: r.color }} />
                <u style={{ left: `${(r.ideal / peak) * 100}%` }} />
              </div>
              <div className="pano-rule-foot">
                <em className={ok ? "good" : "warn"}>{verdict(r)}</em>
                <span className="num">{fmt(r.minor)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* 4 · How long the money lasts at this pace. */
export function PaceCard({ coach }: { coach: Coach }) {
  const { fmt, lang, ui } = useFaro();
  const now = new Date();
  const sameMonth = now.getFullYear() === ui.year && now.getMonth() + 1 === ui.month;
  const cover = coach.coverDays ?? 0;
  const extra = coach.coverDays !== null ? coach.coverDays - coach.daysInMonth : 0;
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Pace" : "Ritmo"} title={lang === "en" ? "How far it goes" : "Hasta dónde te alcanza"} />
      <div className="pano-pace-top">
        <div>
          <em>{lang === "en" ? "A day, on average" : "Al día, en promedio"}</em>
          <strong className="num serif">{fmt(coach.perDay)}</strong>
        </div>
        <div className={extra >= 0 ? "is-good" : "is-bad"}>
          <em>{lang === "en" ? "Income lasts" : "Tu ingreso dura"}</em>
          <strong className="num serif">{coach.coverDays === null ? "—" : `${coach.coverDays} ${lang === "en" ? "days" : "días"}`}</strong>
        </div>
      </div>
      <div className="pano-days" aria-hidden>
        {Array.from({ length: coach.daysInMonth }, (_, i) => {
          const day = i + 1;
          const state = coach.coverDays === null ? "" : day <= cover ? "is-on" : "is-off";
          return <i key={day} className={`${state}${sameMonth && day === now.getDate() ? " is-today" : ""}`} style={{ animationDelay: `${i * 14}ms` }} />;
        })}
        {extra > 0 ? <span className="pano-days-extra num">+{extra}</span> : null}
      </div>
      <div className="pano-days-scale"><span>1</span><span>{Math.ceil(coach.daysInMonth / 2)}</span><span>{coach.daysInMonth}</span></div>
      {coach.coverDays === null ? <Note kind="pen">{coach.paceNote}</Note> : <p className="pano-lead">{coach.paceNote}</p>}
    </section>
  );
}

/* 5 · What changed against last month. */
export function MoversCard({ coach }: { coach: Coach }) {
  const { fmt, lang } = useFaro();
  const peak = Math.max(1, ...coach.movers.map((m) => Math.abs(m.delta)));
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Vs. last month" : "Contra el mes pasado"} title={lang === "en" ? "What moved" : "Qué se movió"} />
      {coach.hasPrior ? <p className="pano-lead">{coach.moversNote}</p> : <Note kind="wait">{coach.moversNote}</Note>}
      {coach.movers.length ? (
        <div className="pano-movers">
          <div className="pano-movers-axis"><span>{lang === "en" ? "spent less" : "gastaste menos"}</span><span>{lang === "en" ? "spent more" : "gastaste más"}</span></div>
          {coach.movers.map((m) => {
            const w = (Math.abs(m.delta) / peak) * 50;
            const up = m.delta > 0;
            return (
              <div key={m.id} className={`pano-mover ${up ? "is-up" : "is-down"}`}>
                <span className="pano-mover-name">{m.name}</span>
                <div className="pano-mover-track">
                  <b style={up ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
                  <u />
                </div>
                <strong className="num">{up ? <ArrowUpRight aria-hidden /> : <ArrowDownRight aria-hidden />}{fmt(Math.abs(m.delta))}</strong>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

/* 6 · Twelve months of closing balance. */
export function HistoryCard({ coach }: { coach: Coach }) {
  const { fmt, lang, setUi } = useFaro();
  const [pick, setPick] = useState<string | null>(null);
  const peak = Math.max(1, ...coach.months.map((m) => Math.abs(m.net)));
  const any = coach.months.some((m) => m.income || m.expense);
  const chosen = coach.months.find((m) => m.key === pick);
  const H = 120;
  const mid = H / 2;
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "12 months" : "12 meses"} title={lang === "en" ? "How each month closed" : "Cómo cerró cada mes"} />
      <p className="pano-lead">{coach.historyNote}</p>
      {any ? (
        <>
          <svg viewBox={`0 0 ${coach.months.length * 26} ${H + 18}`} className="pano-history" role="img" aria-label={coach.historyNote}>
            <line x1="0" x2={coach.months.length * 26} y1={mid} y2={mid} stroke="var(--line)" strokeWidth="1" />
            {coach.months.map((m, i) => {
              const h = (Math.abs(m.net) / peak) * (mid - 6);
              const x = i * 26 + 5;
              const pos = m.net >= 0;
              const empty = !m.income && !m.expense;
              return (
                <g key={m.key} className={`pano-hbar${m.current ? " is-now" : ""}${pick === m.key ? " is-pick" : ""}`} onClick={() => !empty && setPick((cur) => (cur === m.key ? null : m.key))}>
                  <rect x={x - 3} y="0" width="22" height={H} fill="transparent" />
                  {empty ? (
                    <circle cx={x + 8} cy={mid} r="2" fill="var(--line)" />
                  ) : (
                    <rect className="pano-hbar-fill" x={x} y={pos ? mid - h : mid} width="16" height={Math.max(2, h)} rx="4" fill={pos ? "var(--good)" : "var(--bad)"} style={{ animationDelay: `${i * 40}ms` }} />
                  )}
                  <text x={x + 8} y={H + 14} textAnchor="middle">{m.label}</text>
                </g>
              );
            })}
          </svg>
          {chosen ? (
            <div className="pano-pick pano-month">
              <div><em>{lang === "en" ? "In" : "Entró"}</em><strong className="num">{fmt(chosen.income)}</strong></div>
              <div><em>{lang === "en" ? "Out" : "Salió"}</em><strong className="num">{fmt(chosen.expense)}</strong></div>
              <div><em>{lang === "en" ? "Closed" : "Cerró"}</em><strong className={`num ${chosen.net >= 0 ? "good" : "bad"}`}>{fmt(chosen.net)}</strong></div>
              <button type="button" className="btn secondary" onClick={() => setUi({ year: Number(chosen.key.slice(0, 4)), month: Number(chosen.key.slice(5, 7)) })}>
                {lang === "en" ? "Open that month" : "Abrir ese mes"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/* 7 · Dated payments in the next five weeks. */
export function AgendaCard({ coach }: { coach: Coach }) {
  const { fmt, lang } = useFaro();
  const peak = Math.max(1, ...coach.dues.map((d) => d.minor));
  const day = (iso: string) => dateFmt(lang === "en" ? "en-US" : "es-NI", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));
  const total = coach.dues.reduce((a, d) => a + d.minor, 0);
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Coming up" : "Lo que viene"} title={lang === "en" ? "Payments ahead" : "Próximos pagos"} />
      {coach.dues.length ? (
        <>
          <p className="pano-lead">
            {lang === "en"
              ? `${coach.dues.length} dated payment${coach.dues.length === 1 ? "" : "s"} in the next 5 weeks, ${fmt(total)} in all.`
              : `${coach.dues.length} pago${coach.dues.length === 1 ? "" : "s"} con fecha en las próximas 5 semanas, ${fmt(total)} en total.`}
          </p>
          <div className="pano-agenda" aria-hidden>
            <b />
            {[0, 7, 14, 21, 28, 35].map((d) => <span key={d} className="pano-agenda-tick" style={{ left: `${(d / 35) * 100}%` }}>{d === 0 ? (lang === "en" ? "today" : "hoy") : `${d}d`}</span>)}
            {coach.dues.map((d) => {
              const size = 10 + (d.minor / peak) * 18;
              return <i key={`${d.id}-${d.day}`} style={{ left: `${(d.inDays / 35) * 100}%`, width: size, height: size }} />;
            })}
          </div>
          <ul className="pano-due-list">
            {coach.dues.slice(0, 6).map((d) => (
              <li key={`${d.id}-${d.day}`}>
                {d.icon ? <SubMark id={d.icon.slice(4)} className="pano-due-mark" /> : <CalendarClock aria-hidden />}
                <span>{d.name}<em>{day(d.day)}{d.inDays <= 3 ? (lang === "en" ? " · soon" : " · pronto") : ""}</em></span>
                <strong className="num">{fmt(d.minor)}</strong>
              </li>
            ))}
            {coach.dues.length > 6 ? (
              <li className="pano-more">
                {lang === "en"
                  ? `+${coach.dues.length - 6} more · ${fmt(coach.dues.slice(6).reduce((a, d) => a + d.minor, 0))}`
                  : `+${coach.dues.length - 6} más · ${fmt(coach.dues.slice(6).reduce((a, d) => a + d.minor, 0))}`}
              </li>
            ) : null}
          </ul>
        </>
      ) : (
        <Note kind="date">
          {lang === "en"
            ? "No dated payments in the next weeks. Give your fixed bills a due date and they'll show up here before they're due."
            : "No hay pagos con fecha en las próximas semanas. Ponle fecha a tus pagos fijos y aparecerán aquí antes de que venzan."}
        </Note>
      )}
    </section>
  );
}

function PillarRow({ pillar, open, onToggle }: { pillar: Pillar; open: boolean; onToggle: () => void }) {
  return (
    <div className={`pano-pillar${open ? " is-open" : ""}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span className="pano-pillar-name">{pillar.label}</span>
        <span className="pano-pillar-track"><b className={`is-${pillar.tone}`} style={{ width: `${pillar.score}%`, background: toneVar[pillar.tone] }} /></span>
        <span className="pano-pillar-val">{pillar.value}</span>
        <ChevronDown aria-hidden />
      </button>
      {open ? (
        <div className="pano-pillar-more">
          <p>{pillar.note}</p>
          <p className="pano-tip">{pillar.tip}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Four equal bands: place the score inside its own band. */
function markAt(s: number, bands: { from: number; to: number }[]) {
  const i = Math.max(0, bands.findIndex((b) => s >= b.from && s <= b.to));
  const b = bands[i];
  const within = (s - b.from + 0.5) / (b.to - b.from + 1);
  return Math.min(96, Math.max(4, ((i + within) / bands.length) * 100));
}

/** Behind the "?": what the number means, where it sits on the scale, and how its points add up. */
function ScoreHelp({ coach, onClose }: { coach: Coach; onClose: () => void }) {
  const { lang } = useFaro();
  useLayer(true, onClose);
  const en = lang === "en";
  const rows = useMemo(() => {
    const raw = coach.pillars.map((p) => {
      const max = Math.round((SCORE_WEIGHTS[p.id] ?? 0) * 100);
      return { id: p.id, label: p.label, max, exact: (p.score * max) / 100, tone: p.tone };
    });
    // Round so the parts add up to exactly the score shown (largest remainder).
    const pts = raw.map((r) => Math.floor(r.exact));
    let left = coach.score - pts.reduce((a, b) => a + b, 0);
    raw.map((r, i) => ({ i, rem: r.exact - Math.floor(r.exact) })).sort((a, b) => b.rem - a.rem).forEach(({ i }) => {
      if (left > 0 && pts[i] < raw[i].max) { pts[i] += 1; left -= 1; }
    });
    return raw.map((r, i) => ({ ...r, pts: pts[i] }));
  }, [coach]);
  const gaps = rows.map((r) => ({ ...r, miss: r.max - r.pts })).filter((r) => r.miss > 0).sort((a, b) => b.miss - a.miss);
  const top = gaps.filter((g) => g.miss === gaps[0]?.miss).slice(0, 2);
  const bands = [
    { from: 0, to: 44, label: en ? "Fragile" : "Frágil", tone: "bad" },
    { from: 45, to: 64, label: en ? "Needs tuning" : "Por ajustar", tone: "warn" },
    { from: 65, to: 79, label: en ? "On track" : "Bien encaminada", tone: "good" },
    { from: 80, to: 100, label: en ? "Solid" : "Sólida", tone: "good" },
  ];
  const s = Math.max(0, Math.min(100, coach.score));
  const join = (xs: string[]) => xs.join(en ? " and " : " y ");
  return (
    <div className="pano-help" role="region" aria-label={en ? "About the score" : "Sobre la nota"}>
      <div className="pano-help-top">
        <strong>{en ? `What does ${coach.score} mean?` : `¿Qué significa ${coach.score}?`}</strong>
        <button type="button" className="pano-help-x" onClick={onClose} aria-label={en ? "Close" : "Cerrar"}><X size={16} /></button>
      </div>
      <p>
        {en
          ? "It's your money's grade this month, from 0 to 100. Like at school: higher is better. It's not a credit score; it only uses what you record in Faro."
          : "Es la nota de tu dinero este mes, de 0 a 100. Como en la escuela: más alto, mejor. No es tu puntaje de crédito; solo usa lo que anotas en Faro."}
      </p>
      <div className="pano-help-scale" aria-hidden>
        {bands.map((b) => (
          <span key={b.from} className={`is-${b.tone}${s >= b.from && s <= b.to ? " is-here" : ""}`}>
            <i />
            <em>{b.label}</em>
            <small>{b.from}–{b.to}</small>
          </span>
        ))}
        <b style={{ left: `${markAt(s, bands)}%` }}>{coach.score}</b>
      </div>
      <p className="pano-help-kicker">{en ? "How the points add up" : "Cómo se suman los puntos"}</p>
      <ul className="pano-help-sum">
        {rows.map((r) => (
          <li key={r.id}>
            <span>{r.label}</span>
            <span className="pano-help-bar"><i style={{ width: `${r.max ? (r.pts / r.max) * 100 : 0}%`, background: toneVar[r.tone] }} /></span>
            <span className="num">{en ? `${r.pts} of ${r.max}` : `${r.pts} de ${r.max}`}</span>
          </li>
        ))}
        <li className="is-total">
          <span>{en ? "Your score" : "Tu nota"}</span>
          <span />
          <span className="num">{en ? `${coach.score} of 100` : `${coach.score} de 100`}</span>
        </li>
      </ul>
      {top.length ? (
        <p className="pano-help-next">
          {en
            ? `Most points left in ${join(top.map((t) => t.label))} (${top[0].miss} points${top.length > 1 ? " each" : ""}). Open ${top.length > 1 ? "them" : "it"} below to see how.`
            : `Donde más puntos te faltan: ${join(top.map((t) => t.label))} (${top[0].miss} puntos${top.length > 1 ? " en cada uno" : ""}). Ábrelo${top.length > 1 ? "s" : ""} abajo para ver cómo subirlos.`}
        </p>
      ) : (
        <p className="pano-help-next">{en ? "Full marks in all five. Keep it up." : "Nota completa en las cinco. Sigue así."}</p>
      )}
    </div>
  );
}

/* 8 · Financial health: dial plus five pillars. */
export function HealthCard({ coach }: { coach: Coach }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const en = lang === "en";
  return (
    <section className="card pano-card">
      <Head kicker={en ? "Health" : "Salud"} title={en ? "Your money's health" : "La salud de tu dinero"} />
      <div className="pano-health">
        <div className="pano-dial-wrap">
          <ScoreDial score={coach.score} tone={coach.scoreTone} label={coach.scoreLabel} />
          <button
            type="button"
            className={`pano-help-btn${help ? " is-on" : ""}`}
            aria-expanded={help}
            aria-label={en ? `What does ${coach.score} mean?` : `¿Qué significa ${coach.score}?`}
            onClick={() => setHelp((v) => !v)}
          ><CircleHelp aria-hidden /></button>
        </div>
        {help ? <ScoreHelp coach={coach} onClose={() => setHelp(false)} /> : null}
        <p className="pano-lead">
          {lang === "en"
            ? "A 0–100 score from five things: how much you spend, save, owe, how big your cushion is, and how steady your income is."
            : "Una nota de 0 a 100 hecha con cinco cosas: cuánto gastas, ahorras y debes, qué tan grande es tu colchón y qué tan seguro es lo que entra."}
          <Hint topic="pilares" className="is-inline" avoid=".pano-health" />
        </p>
      </div>
      <div className="pano-pillars">
        {coach.pillars.map((p) => <PillarRow key={p.id} pillar={p} open={open === p.id} onToggle={() => setOpen((cur) => (cur === p.id ? null : p.id))} />)}
      </div>
    </section>
  );
}

export const PANORAMA_IDS = ["pulse", "waffle", "health", "rule", "pace", "movers", "history", "agenda"] as const;

export function panoramaLabels(lang: "es" | "en"): Record<(typeof PANORAMA_IDS)[number], string> {
  return lang === "en"
    ? { pulse: "Month at a glance", waffle: "Your 100", health: "Your money's health", rule: "The 50 · 30 · 20 rule", pace: "How far it goes", movers: "What moved", history: "How each month closed", agenda: "Payments ahead" }
    : { pulse: "Tu mes de un vistazo", waffle: "Tus 100", health: "La salud de tu dinero", rule: "La regla 50 · 30 · 20", pace: "Hasta dónde te alcanza", movers: "Qué se movió", history: "Cómo cerró cada mes", agenda: "Próximos pagos" };
}

/** The visual layer at the top of Estudio. Each card folds and sorts like the others. */
export function PanoramaCards() {
  const coach = useCoach();
  if (!coach) return null;
  return (
    <>
      <StatFold id="pulse"><PulseCard coach={coach} /></StatFold>
      <StatFold id="waffle"><WaffleCard coach={coach} /></StatFold>
      <StatFold id="health"><HealthCard coach={coach} /></StatFold>
      <StatFold id="rule"><RuleCard coach={coach} /></StatFold>
      <StatFold id="pace"><PaceCard coach={coach} /></StatFold>
      <StatFold id="movers"><MoversCard coach={coach} /></StatFold>
      <StatFold id="history"><HistoryCard coach={coach} /></StatFold>
      <StatFold id="agenda"><AgendaCard coach={coach} /></StatFold>
    </>
  );
}

/** Top of the Asesor: the month in plain words, a score, and three moves. */
export function CoachHero() {
  const coach = useCoach();
  const { fmt, lang } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  const [words, setWords] = useState(false);
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent).detail === "coach-words") setWords(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!coach) return null;
  return (
    <section className={`coach is-${coach.scoreTone}`} data-anchor="coach">
      <div className="coach-top">
        <div className="coach-copy">
          <p className="pano-kicker"><Sparkles aria-hidden /><span className="lab-head">{lang === "en" ? "Your month, plainly" : "Tu mes, en claro"}<Hint topic="tu-mes-en-claro" avoid=".coach-top @.pano-dial" /></span></p>
          <h2 className="serif coach-verdict">{coach.verdict}</h2>
          {coach.verdictSub ? <p className="coach-sub">{coach.verdictSub}</p> : null}
        </div>
        <ScoreDial score={coach.score} tone={coach.scoreTone} label={coach.scoreLabel} size={132} />
      </div>
      {coach.income > 0 ? (
        <div className="coach-bar" aria-hidden>
          {coach.buckets.filter((b) => b.minor > 0).map((b) => <i key={b.id} className={b.id === "free" ? "is-free" : undefined} style={{ flexGrow: b.minor, background: b.id === "free" ? undefined : b.color }} />)}
        </div>
      ) : null}
      {coach.income > 0 ? <p className="coach-line">{coach.per100Line}</p> : null}
      <h3 className="coach-h3 lab-head">{lang === "en" ? "What I'd do now" : "Lo que yo haría ahora"}<Hint topic="lo-que-haria" /></h3>
      <ol className="coach-steps" data-anchor="coach-steps">
        {coach.steps.map((s, i) => (
          <li key={s.id} className={`is-${s.tone}`}>
            <span className="coach-n">{i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.detail}</p>
            </div>
            {s.impactMinor > 0 ? <em className="num">{fmt(s.impactMinor)}</em> : null}
          </li>
        ))}
      </ol>
      <h3 className="coach-h3 lab-head">{lang === "en" ? "Five checks" : "Cinco chequeos"}<Hint topic="cinco-chequeos" /></h3>
      <div className="pano-pillars" data-anchor="coach-pillars">
        {coach.pillars.map((p) => <PillarRow key={p.id} pillar={p} open={open === p.id} onToggle={() => setOpen((cur) => (cur === p.id ? null : p.id))} />)}
      </div>
      <button type="button" data-anchor="coach-words" className="coach-words" aria-expanded={words} onClick={() => setWords((on) => !on)}>
        <span>{lang === "en" ? "Plain words" : "Palabras claras"}</span>
        <ChevronDown aria-hidden className={words ? "is-open" : ""} />
      </button>
      {words ? (
        <dl className="coach-glossary">
          {coach.glossary.map((g) => (
            <div key={g.term}><dt>{g.term}</dt><dd>{g.plain}</dd></div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
