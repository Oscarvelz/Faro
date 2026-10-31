import "./panorama.css";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { useFaro } from "@/components/faro/provider";
import { readCoach, type Coach, type CoachLine, type Pillar, type Tone } from "@/lib/faro/coach";
import type { LineKind, SectionId } from "@/lib/faro/types";
import { StatFold } from "@/components/faro/charts";

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
  if (!rows.length) return empty ? <p className="pano-empty">{empty}</p> : null;
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
  const r = 70;
  const len = Math.PI * r;
  const on = (Math.max(0, Math.min(100, score)) / 100) * len;
  return (
    <div className="pano-dial" style={{ width: size, ["--s" as string]: `${size}px` }}>
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

export function Head({ kicker, title, children }: { kicker?: string; title: string; children?: ReactNode }) {
  return (
    <div className="pano-head">
      {kicker ? <p className="pano-kicker">{kicker}</p> : null}
      <h2 className="serif text-2xl">{title}</h2>
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
      <Head kicker={lang === "en" ? "This month" : "Este mes"} title={lang === "en" ? "Your month at a glance" : "Tu mes de un vistazo"} />
      <div className="pano-pulse">
        <svg viewBox="0 0 160 160" className="pano-ring" role="img" aria-label={coach.verdict}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="18" />
          {parts.map((b) => {
            const len = (b.minor / total) * C;
            const seg = (
              <circle
                key={b.id}
                className={`pano-seg${pick && pick !== b.id ? " is-dim" : ""}`}
                cx="80" cy="80" r={R} fill="none" stroke={b.color} strokeWidth={pick === b.id ? 22 : 18}
                strokeDasharray={`${Math.max(0, len - gap)} ${C}`} strokeDashoffset={-at}
                transform="rotate(-90 80 80)"
                onClick={() => setPick((cur) => (cur === b.id ? null : b.id))}
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
      <p className="pano-lead">{coach.verdict} {coach.verdictSub}</p>
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
      <p className="pano-lead">{coach.per100Line}</p>
      <div className="pano-waffle" role="img" aria-label={coach.per100Line}>
        {squares.map((sq, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className={`${!sq.id ? "is-blank" : ""}${sq.id === "free" ? " is-free" : ""}${pick && sq.id !== pick ? " is-dim" : ""}`}
            style={{ background: sq.id === "free" ? undefined : sq.color || undefined, animationDelay: `${(i % 10) * 18 + Math.floor(i / 10) * 18}ms` }}
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
      <Head kicker={lang === "en" ? "Pace" : "Ritmo"} title={lang === "en" ? "How far your money goes" : "Hasta dónde te alcanza"} />
      <div className="pano-pace-top">
        <div>
          <em>{lang === "en" ? "A day, on average" : "Al día, en promedio"}</em>
          <strong className="num serif">{fmt(coach.perDay)}</strong>
        </div>
        <div className={extra >= 0 ? "is-good" : "is-bad"}>
          <em>{lang === "en" ? "Your income lasts" : "Tu ingreso dura"}</em>
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
      <p className="pano-lead">{coach.paceNote}</p>
    </section>
  );
}

/* 5 · What changed against last month. */
export function MoversCard({ coach }: { coach: Coach }) {
  const { fmt, lang } = useFaro();
  const peak = Math.max(1, ...coach.movers.map((m) => Math.abs(m.delta)));
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Against last month" : "Contra el mes pasado"} title={lang === "en" ? "What moved" : "Qué se movió"} />
      <p className="pano-lead">{coach.moversNote}</p>
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
  const day = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T12:00:00`));
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
                <CalendarClock aria-hidden />
                <span>{d.name}<em>{day(d.day)}{d.inDays <= 3 ? (lang === "en" ? " · soon" : " · pronto") : ""}</em></span>
                <strong className="num">{fmt(d.minor)}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="pano-lead">
          {lang === "en"
            ? "No dated payments in the next weeks. Give your fixed bills a due date and they'll show up here before they're due."
            : "No hay pagos con fecha en las próximas semanas. Ponle fecha a tus pagos fijos y aparecerán aquí antes de que venzan."}
        </p>
      )}
    </section>
  );
}

function PillarRow({ pillar, open, onToggle }: { pillar: Pillar; open: boolean; onToggle: () => void }) {
  return (
    <div className={`pano-pillar${open ? " is-open" : ""}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span className="pano-pillar-name">{pillar.label}</span>
        <span className="pano-pillar-track"><b style={{ width: `${pillar.score}%`, background: toneVar[pillar.tone] }} /></span>
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

/* 8 · Financial health: dial plus five pillars. */
export function HealthCard({ coach }: { coach: Coach }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="card pano-card">
      <Head kicker={lang === "en" ? "Health" : "Salud"} title={lang === "en" ? "Your money's health" : "La salud de tu dinero"} />
      <div className="pano-health">
        <ScoreDial score={coach.score} tone={coach.scoreTone} label={coach.scoreLabel} />
        <p className="pano-lead">
          {lang === "en"
            ? "A 0–100 score from five things: how much you spend, save, owe, how big your cushion is, and how steady your income is."
            : "Una nota de 0 a 100 hecha con cinco cosas: cuánto gastas, ahorras y debes, qué tan grande es tu colchón y qué tan seguro es lo que entra."}
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
    ? { pulse: "Your month at a glance", waffle: "Your 100", health: "Your money's health", rule: "The 50 · 30 · 20 rule", pace: "How far your money goes", movers: "What moved", history: "How each month closed", agenda: "Payments ahead" }
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
  if (!coach) return null;
  return (
    <section className={`coach is-${coach.scoreTone}`}>
      <div className="coach-top">
        <div className="coach-copy">
          <p className="pano-kicker"><Sparkles aria-hidden />{lang === "en" ? "Your month, plainly" : "Tu mes, en claro"}</p>
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
      <h3 className="coach-h3">{lang === "en" ? "What I'd do now" : "Lo que yo haría ahora"}</h3>
      <ol className="coach-steps">
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
      <h3 className="coach-h3">{lang === "en" ? "Five checks" : "Cinco chequeos"}</h3>
      <div className="pano-pillars">
        {coach.pillars.map((p) => <PillarRow key={p.id} pillar={p} open={open === p.id} onToggle={() => setOpen((cur) => (cur === p.id ? null : p.id))} />)}
      </div>
      <button type="button" className="coach-words" aria-expanded={words} onClick={() => setWords((on) => !on)}>
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
