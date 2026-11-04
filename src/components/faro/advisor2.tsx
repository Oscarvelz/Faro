// Asesor 2: each advice card leads with a picture; words come second.
import "./advisor2.css";
import { ChevronRight, House, PiggyBank, ShoppingBag, Wallet } from "lucide-react";
import { useId } from "react";
import type React from "react";
import { useFaro } from "@/components/faro/provider";
import { Hint } from "./hint";
import type { AdviceCard, SectionId } from "@/lib/faro/types";
import type { readAdvisor } from "@/lib/faro/advisor";
import { isTron, tronize } from "@/lib/faro/colors";
const tc = (c: string) => (isTron() ? tronize(c) : c);

type Reading = ReturnType<typeof readAdvisor>;
const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const CLS: Record<string, { es: string; en: string; c: string }> = {
  "essential-fixed": { es: "Cada mes", en: "Monthly", c: "#7fb2a0" },
  "essential-variable": { es: "Cada mes", en: "Monthly", c: "#9cc3a8" },
  discretionary: { es: "Gusto", en: "Want", c: "#e0a35c" },
  unique: { es: "Una vez", en: "One-time", c: "#d0837a" },
  credit: { es: "Crédito", en: "Credit", c: "#b49bd6" },
  transfer: { es: "Ahorro", en: "Saved", c: "#7fa6cf" },
};
function sectionFor(kind: string): SectionId {
  if (kind.startsWith("income")) return "income";
  if (kind === "expense-fixed") return "fixed";
  if (kind === "expense-variable") return "variable";
  if (kind === "purchase") return "shops";
  return "subs";
}
function useDays() {
  const { ui } = useFaro();
  return new Date(ui.year, ui.month, 0).getDate() || 30;
}

/** One-line preview shown on a closed card so it is worth opening. */
export function adviceTeaser(card: AdviceCard, reading: Reading, fmt: (n: number) => string, lang: string, days: number) {
  if (card.horizon === "short") return { big: fmt(Math.round(reading.recurrentMinor / days)), small: L(lang, "al día en lo de cada mes", "a day on the usual") };
  if (card.horizon === "medium") {
    const n = card.nums;
    if (!n || n.debt <= 0) return { big: L(lang, "Sin cuotas", "No payments"), small: L(lang, "este mes", "this month") };
    return { big: `${n.pct.toFixed(1)}%`, small: L(lang, `de lo que entra · cómodo hasta ${n.green}%`, `of income · easy up to ${n.green}%`) };
  }
  const n = card.nums;
  if (!n) return null;
  return n.year >= 0
    ? { big: fmt(Math.abs(n.year)), small: L(lang, "en un año si nada cambia", "in a year if nothing changes") }
    : { big: `−${fmt(Math.abs(n.year))}`, small: L(lang, "de hueco en un año", "short in a year") };
}

/* ── Qué pasó ───────────────────────────────────────────────────────── */
export function ShortVisual({ reading }: { reading: Reading }) {
  const { fmt, lang, setUi, session, ui } = useFaro();
  const days = useDays();
  const perDay = Math.round(reading.recurrentMinor / days);
  const total = Math.max(reading.outTotal, 1);
  const parts = [
    { id: "base", name: L(lang, "De cada mes", "Every month"), minor: reading.recurrentMinor, c: "#7fb2a0" },
    { id: "unique", name: L(lang, "De una vez", "One-time"), minor: reading.uniqueMinor, c: "#d0837a" },
    { id: "transfer", name: L(lang, "Al ahorro", "To savings"), minor: reading.transferMinor, c: "#7fa6cf" },
  ].filter((p) => p.minor > 0);
  const rows = [...reading.lines].sort((a, b) => b.minor - a.minor).slice(0, 7);
  const peak = Math.max(...rows.map((r) => r.minor), 1);
  const kindOf = (id: string) => session?.ledger.months[`${ui.year}-${String(ui.month).padStart(2, "0")}`]?.lines.find((l) => l.id === id)?.kind ?? "expense-variable";
  const now = new Date();
  const today = now.getFullYear() === ui.year && now.getMonth() + 1 === ui.month ? now.getDate() : 0;
  return (
    <div className="a2">
      <div className="a2-day">
        <div>
          <em>{L(lang, "Lo de cada mes te cuesta", "The usual costs you")}</em>
          <strong className="num serif">{fmt(perDay)}</strong>
          <span>{L(lang, "por día", "a day")}</span>
        </div>
        <div className="a2-cal" aria-hidden>
          {Array.from({ length: days }, (_, i) => <i key={i} className={i + 1 === today ? "is-today" : i + 1 < today ? "is-past" : ""} style={{ animationDelay: `${i * 12}ms` }} />)}
        </div>
      </div>
      {parts.length ? (
        <div className="a2-river">
          <p className="a2-kick">{L(lang, "Todo lo que salió", "Everything that went out")} · <span className="num">{fmt(reading.outTotal)}</span></p>
          <div className="a2-river-bar">
            {parts.map((p) => <i key={p.id} style={{ flexGrow: p.minor, background: tc(p.c) }}><b className="num">{Math.round((p.minor / total) * 100)}%</b></i>)}
          </div>
          <div className="a2-chips">
            {parts.map((p) => <span key={p.id}><i style={{ background: tc(p.c) }} />{p.name}<strong className="num">{fmt(p.minor)}</strong></span>)}
          </div>
        </div>
      ) : null}
      {rows.length ? (
        <div className="a2-lines">
          <p className="a2-kick">{L(lang, "Los gastos que más pesaron", "The heaviest lines")}</p>
          {rows.map((r, i) => {
            const k = CLS[r.cls] ?? CLS.discretionary;
            return (
              <button key={r.id} type="button" className="a2-line" style={{ ["--c" as string]: tc(k.c), animationDelay: `${i * 50}ms` }} onClick={() => setUi({ section: sectionFor(kindOf(r.id)), highlight: r.id })}>
                <span className="a2-line-name">{r.name}<em style={{ color: tc(k.c) }}>{lang === "en" ? k.en : k.es}</em></span>
                <span className="a2-line-amt"><strong className="num">{fmt(r.minor)}</strong><ChevronRight aria-hidden /></span>
                <span className="a2-line-bar"><b style={{ width: `${Math.max(4, (r.minor / peak) * 100)}%` }} /></span>
              </button>
            );
          })}
          <p className="a2-foot">
            <b style={{ color: tc(CLS.unique.c) }}>{L(lang, "Una vez", "One-time")}</b>{L(lang, ": ya salió; se puede devolver, vender o compensar. ", ": already gone; return, sell or offset it. ")}
            <b style={{ color: tc(CLS["essential-fixed"].c) }}>{L(lang, "Cada mes", "Monthly")}</b>{L(lang, ": aquí está el ahorro que dura.", ": this is where lasting savings live.")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── Cómo va mi crédito ─────────────────────────────────────────────── */
export function MediumVisual({ card, reading }: { card: AdviceCard; reading: Reading }) {
  const { fmt, lang } = useFaro();
  const n = card.nums ?? { debt: 0, pct: 0, green: 30, yellow: 40, allowance: 0, income: 0 };
  const max = Math.max(n.yellow * 1.5, n.pct * 1.15, 50);
  const ang = (v: number) => Math.PI * (1 - Math.min(v, max) / max);
  const pt = (v: number, r: number) => [100 + r * Math.cos(ang(v)), 100 - r * Math.sin(ang(v))];
  const arc = (a: number, b: number, r: number) => {
    const [x1, y1] = pt(a, r);
    const [x2, y2] = pt(b, r);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const [nx, ny] = pt(n.pct, 62);
  const zone = n.pct <= n.green ? "good" : n.pct <= n.yellow ? "warn" : "bad";
  const room = Math.max(0, n.allowance - n.debt);
  const debts = reading.lines.filter((l) => l.cls === "credit").sort((a, b) => b.minor - a.minor);
  if (n.debt <= 0) return <p className="a2-empty">{L(lang, "Este mes no hay cuotas de crédito. Buena noticia: todo lo que entra trabaja para ti.", "No credit payments this month. Everything that comes in works for you.")}</p>;
  return (
    <div className="a2">
      <div className={`a2-gauge is-${zone}`}>
        <svg viewBox="0 0 200 116" role="img" aria-label={`${n.pct.toFixed(1)}%`}>
          <path d={arc(0, n.green, 80)} className="z-good" />
          <path d={arc(n.green, n.yellow, 80)} className="z-warn" />
          <path d={arc(n.yellow, max, 80)} className="z-bad" />
          {[0, n.green, n.yellow].map((v) => {
            const [x, y] = pt(v, 96);
            return <text key={v} x={x} y={y + 3} textAnchor="middle">{Math.round(v)}%</text>;
          })}
          <line x1="100" y1="100" x2={nx} y2={ny} className="a2-needle" />
          <circle cx="100" cy="100" r="6" className="a2-hub" />
        </svg>
        <div className="a2-gauge-read">
          <strong className="num serif">{n.pct.toFixed(1)}%</strong>
          <span>{L(lang, "de lo que entra va a cuotas", "of income goes to payments")}</span>
        </div>
      </div>
      <div className="a2-load">
        <div className="a2-load-pair">
          <div><em>{L(lang, "Pagas al mes", "Monthly pay")}</em><strong className="num is-pay">{fmt(n.debt)}</strong></div>
          <i aria-hidden />
          <div><em>{L(lang, "Zona cómoda", "Comfort zone")}</em><strong className="num">{fmt(n.allowance)}</strong></div>
        </div>
        <div className={`a2-load-room ${room > 0 ? "is-good" : "is-bad"}`}>
          <em>{L(lang, "Margen en zona", "Room in zone")}</em>
          <strong className="num">{fmt(room)}</strong>
          <span className="a2-load-bar" aria-hidden><b style={{ width: `${n.allowance > 0 ? Math.min(100, (n.debt / n.allowance) * 100) : 100}%` }} /></span>
        </div>
      </div>
      {debts.length ? (
        <div className="a2-lines">
          {debts.map((d) => (
            <div key={d.id} className="a2-line is-static" style={{ ["--c" as string]: tc(CLS.credit.c) }}>
              <span className="a2-line-name">{d.name}<em style={{ color: tc(CLS.credit.c) }}>{L(lang, "Cuota del mes", "This month's payment")}</em></span>
              <span className="a2-line-amt"><strong className="num">{fmt(d.minor)}</strong></span>
              <span className="a2-line-bar"><b style={{ width: `${n.allowance > 0 ? Math.min(100, (d.minor / n.allowance) * 100) : 0}%` }} /></span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="a2-foot">{L(lang, "Anota cuánto debes, la tasa y el pago mínimo, y te digo en cuántos meses terminas.", "Add the balance, rate and minimum payment and I'll tell you when you finish.")}</p>
    </div>
  );
}

/* ── Si cada mes fuera así ──────────────────────────────────────────── */
export function LongVisual({ card }: { card: AdviceCard }) {
  const { fmt, lang } = useFaro();
  const n = card.nums;
  if (!n) return null;
  const save = n.pace > 0 ? n.pace : Math.max(0, n.monthly);
  const months = Array.from({ length: 12 }, (_, i) => n.stock + save * (i + 1));
  const hole = n.monthly < 0;
  const series = hole ? Array.from({ length: 12 }, (_, i) => n.monthly * (i + 1)) : months;
  const top = Math.max(...series.map(Math.abs), n.target, 1);
  const hit = !hole && n.target > 0 ? series.findIndex((v) => v >= n.target) : -1;
  const now = new Date();
  const mo = (i: number) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { month: "short" }).format(new Date(now.getFullYear(), now.getMonth() + i + 1, 1)).replace(".", "");
  const have = n.target > 0 ? Math.min(100, (n.stock / n.target) * 100) : 0;
  return (
    <div className="a2">
      <div className="a2-year">
        <em>{hole ? L(lang, "Hueco en un año", "Short in a year") : L(lang, "En un año juntarías", "In a year you'd gather")}</em>
        <strong className={`num serif ${hole ? "bad" : ""}`}>{fmt(Math.abs(n.year))}</strong>
        <span>{L(lang, `${fmt(Math.abs(n.monthly))} al mes × 12, sin compras de una vez`, `${fmt(Math.abs(n.monthly))} a month × 12, no one-offs`)}</span>
      </div>
      <div className={`a2-stack${hole ? " is-hole" : ""}`}>
        {n.target > 0 && !hole ? <div className="a2-goal" style={{ bottom: `${(n.target / top) * 100}%` }}><span>{L(lang, "Colchón", "Cushion")} · {fmt(n.target)}</span></div> : null}
        {series.map((v, i) => (
          <div key={i} className={`a2-col${i === hit ? " is-hit" : ""}${hit >= 0 && i >= hit ? " is-full" : ""}`}>
            <i style={{ height: `${Math.max(2, (Math.abs(v) / top) * 100)}%`, animationDelay: `${i * 45}ms` }} />
            <b>{mo(i)}</b>
          </div>
        ))}
      </div>
      <p className="a2-say">
        {hole
          ? L(lang, "Así, cada mes el hueco crece. Primero hay que cerrar el mes en verde.", "Like this, the hole grows every month. Close the month in the green first.")
          : hit >= 0
            ? L(lang, `Si guardas lo que sobra, tu colchón se llena en ${mo(hit)} (mes ${hit + 1}). Todo lo demás es tuyo para metas.`, `Saving what's left fills your cushion by ${mo(hit)} (month ${hit + 1}). The rest is yours for goals.`)
            : L(lang, "A este ritmo el colchón no se llena en un año. Sube un poco lo que apartas.", "At this pace the cushion isn't full within a year. Set aside a little more.")}
      </p>
      <div className="a2-tiles">
        <div><em>{L(lang, "Meta de colchón", "Cushion goal")}</em><strong className="num">{n.target > 0 ? fmt(n.target) : "—"}</strong></div>
        <div><em>{L(lang, "Ya tienes", "You have")}</em><strong className="num">{n.stock > 0 ? fmt(n.stock) : L(lang, "Nada anotado", "Nothing yet")}</strong></div>
        <div className="is-wide">
          <em>{L(lang, "Te falta", "To go")}</em>
          <strong className="num">{n.gap > 0 ? fmt(n.gap) : L(lang, "Listo", "Done")}</strong>
          <span className="a2-mini"><b style={{ width: `${Math.max(have, 2)}%` }} /></span>
        </div>
      </div>
      {n.stock <= 0 ? <p className="a2-foot">{L(lang, "Anota el saldo de tu ahorro en su línea y la cuenta se vuelve real.", "Enter your savings balance on its line and this becomes real.")}</p> : null}
    </div>
  );
}

/* ── Por dónde empezar ──────────────────────────────────────────────── */
export function PlanRoute({ steps, sum }: { steps: { chip: string; text: string }[]; sum: { title: string; body: string; left: string } | null }) {
  const { lang } = useFaro();
  const split = (t: string) => {
    const m = t.match(/^(.+?[.:])\s+(.*)$/);
    return m ? [m[1], m[2]] : [t, ""];
  };
  return (
    <div className="a2">
      {sum ? (
        <div className="a2-plan-sum">
          <div>
            <em>{sum.title}</em>
            <p>{sum.body}</p>
          </div>
          <strong className="num serif">{sum.left.replace(/^-/, "")}<small>{sum.left.startsWith("-") ? L(lang, "falta", "short") : L(lang, "queda", "left")}</small></strong>
        </div>
      ) : null}
      <ol className="a2-route">
        {steps.map((s, i) => {
          const [head, rest] = split(s.text);
          return (
            <li key={s.chip} style={{ animationDelay: `${i * 80}ms` }}>
              <span className="a2-stop"><b>{s.chip}</b></span>
              <div>
                <p className="a2-stop-head">{head}</p>
                {rest ? <p className="a2-stop-rest">{rest}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Este mes, hecho: a calm lighthouse, then a plain subtraction ── */
export function MonthTower({ reading, income, left, openPart, onPart, more, onMore, children }: {
  reading: Reading; income: number; left: number; openPart: string | null; onPart: (id: "base" | "unique" | "transfer") => void;
  more: boolean; onMore: () => void; children?: React.ReactNode;
}) {
  const { fmt, lang } = useFaro();
  const uid = useId().replace(/:/g, "");
  const short = left < 0;
  const hundred = fmt(10000).replace(/[.,]00$/, "");
  const pctLeft = income > 0 ? Math.round((Math.max(0, left) / income) * 100) : 0;
  const rows = [
    { id: "base" as const, Icon: House, name: L(lang, "Cuentas de cada mes", "Monthly bills"), hint: L(lang, "casa, comida, cuotas", "home, food, payments"), minor: reading.recurrentMinor },
    { id: "unique" as const, Icon: ShoppingBag, name: L(lang, "Compras de una vez", "One-time buys"), hint: L(lang, "no se repiten", "won't repeat"), minor: reading.uniqueMinor },
    { id: "transfer" as const, Icon: PiggyBank, name: L(lang, "Lo que guardaste", "What you saved"), hint: L(lang, "sigue siendo tuyo", "still yours"), minor: reading.transferMinor },
  ].filter((r) => r.minor > 0);
  const scale = Math.max(income, reading.outTotal, 1);
  const action = reading.action.replace(/^(Qué hacer|What to do):\s*/, "");
  const cap = action.charAt(0).toUpperCase() + action.slice(1);
  const m = cap.match(/^(.+?\.)\s+(.*)$/);
  const [doHead, doRest] = m ? [m[1], m[2]] : [cap, ""];
  const glow = short ? 0.35 : 0.55 + Math.min(0.45, pctLeft / 60);
  return (
    <div className={`a2-tower${short ? " is-short" : ""}`}>
      <div className="a2-tower-top">
        <svg viewBox="0 0 120 210" className="a2-tower-art" aria-hidden style={{ ["--glow" as string]: glow }}>
          <defs>
            <linearGradient id={`${uid}-wall`} x1="0" x2="1">
              <stop offset="0" stopColor="#c9d1da" /><stop offset=".35" stopColor="#f6f8fa" /><stop offset=".7" stopColor="#e3e8ee" /><stop offset="1" stopColor="#9aa6b3" />
            </linearGradient>
            <linearGradient id={`${uid}-band`} x1="0" x2="1">
              <stop offset="0" stopColor="#8f3a33" /><stop offset=".35" stopColor="#c9584d" /><stop offset=".7" stopColor="#b44a40" /><stop offset="1" stopColor="#6e2b25" />
            </linearGradient>
            <radialGradient id={`${uid}-glow`}><stop offset="0" stopColor={short ? "#ff9a8a" : "#fff1c4"} /><stop offset="1" stopColor={short ? "#ff9a8a" : "#ffd98a"} stopOpacity="0" /></radialGradient>
            <linearGradient id={`${uid}-beam`} gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="400" y2="0"><stop offset="0" stopColor="#fff4d0" stopOpacity=".62" /><stop offset=".12" stopColor="#ffe7a8" stopOpacity=".34" /><stop offset=".35" stopColor="#ffd98a" stopOpacity=".14" /><stop offset=".65" stopColor="#ffd98a" stopOpacity=".05" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></linearGradient>
            <linearGradient id={`${uid}-core`} gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="250" y2="0"><stop offset="0" stopColor="#fffaf0" stopOpacity=".55" /><stop offset="1" stopColor="#fffaf0" stopOpacity="0" /></linearGradient>
            <filter id={`${uid}-soft`} x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2.4" /></filter>
            <clipPath id={`${uid}-body`}><path d="M40 66 L80 66 L90 192 L30 192 Z" /></clipPath>
          </defs>
          {!short ? <g className="a2-beam" filter={`url(#${uid}-soft)`}><path d="M62 42 L400 -24 L400 124 L62 50 Z" fill={`url(#${uid}-beam)`} /><path d="M62 44.5 L250 36 L250 56 L62 47.5 Z" fill={`url(#${uid}-core)`} /></g> : null}
          <circle cx="60" cy="46" r="32" fill={`url(#${uid}-glow)`} className="a2-halo" />
          <path d="M43 34 Q60 16 77 34 Z" fill={`url(#${uid}-band)`} />
          <circle cx="60" cy="19" r="2.2" fill="#c9584d" />
          <rect x="45" y="34" width="30" height="22" rx="2.5" className="a2-lantern" />
          <path d="M52 34 V56 M60 34 V56 M68 34 V56" className="a2-mullion" />
          <circle cx="60" cy="45" r="5.5" className="a2-lamp" fill={short ? "#ff9a8a" : "#fff1c4"} />
          <rect x="38" y="56" width="44" height="5" rx="1.5" className="a2-gallery" />
          <path d="M38 61 H82 M40 61 V66 M47 61 V66 M54 61 V66 M61 61 V66 M68 61 V66 M75 61 V66 M80 61 V66" className="a2-rail" />
          <path d="M40 66 L80 66 L90 192 L30 192 Z" fill={`url(#${uid}-wall)`} />
          <g clipPath={`url(#${uid}-body)`}>
            <rect x="20" y="96" width="80" height="22" fill={`url(#${uid}-band)`} />
            <rect x="20" y="146" width="80" height="22" fill={`url(#${uid}-band)`} />
          </g>
          <rect x="56.5" y="78" width="7" height="11" rx="3.5" className="a2-window" />
          <rect x="56.5" y="128" width="7" height="11" rx="3.5" className="a2-window" />
          <path d="M54 192 V178 Q60 171 66 178 V192 Z" className="a2-door" />
          <path d="M14 194 Q36 186 60 189 Q86 186 106 194 L106 206 L14 206 Z" className="a2-rock" />
        </svg>
        <div className="a2-tower-say">
          <em className="lab-head">{short ? L(lang, "Este mes te faltan", "Short this month") : L(lang, "Este mes te quedan", "Left this month")}<Hint topic="faro-del-mes" avoid=".a2-tower-say" /></em>
          <strong className={`num serif ${short ? "bad" : ""}`}>{fmt(Math.abs(left))}</strong>
          {!short && income > 0 ? <span className="a2-badge">{L(lang, `${pctLeft} de cada ${hundred}`, `${pctLeft} of every ${hundred}`)}</span> : null}
        </div>
      </div>
      <div className="a2-sum" role="list">
        <div className="a2-sum-row is-in" role="listitem">
          <span className="a2-op"><Wallet aria-hidden /></span>
          <span className="a2-sum-name"><b className="a2-sum-label">{L(lang, "Entró", "Came in")}</b><em>{L(lang, "tu punto de partida", "where you start")}</em></span>
          <strong className="num">{fmt(income)}</strong>
        </div>
        {rows.map((r) => (
          <button key={r.id} type="button" role="listitem" className={`a2-sum-row${openPart === r.id ? " is-open" : ""}`} aria-expanded={openPart === r.id} onClick={() => onPart(r.id)}>
            <span className="a2-op"><r.Icon aria-hidden /></span>
            <span className="a2-sum-name"><b className="a2-sum-label">{r.name}</b><em>{r.hint}</em></span>
            <strong className="num"><i className="a2-sign">−</i>{fmt(r.minor)}</strong>
            <span className="a2-sum-bar" aria-hidden><b style={{ width: `${Math.max(2, (r.minor / scale) * 100)}%` }} /></span>
            {openPart === r.id ? <p className="a2-sum-rule">{reading.parts[r.id].rule}</p> : null}
          </button>
        ))}
        <div className={`a2-sum-row is-total${short ? " is-short" : ""}`} role="listitem">
          <span className="a2-op a2-lampdot" aria-hidden />
          <span className="a2-sum-name">{short ? L(lang, "Te faltan", "Short") : L(lang, "Te quedan", "Left")}</span>
          <strong className="num">{fmt(Math.abs(left))}</strong>
        </div>
      </div>
      <div className="a2-do">
        <span className="a2-do-ico" aria-hidden>➜</span>
        <div>
          <p className="a2-do-head">{doHead}</p>
          {doRest ? <p className="a2-do-rest">{doRest}</p> : null}
        </div>
      </div>
      <div className="a2-more-row">
        <button type="button" className="a2-more" aria-expanded={more} onClick={onMore}><span>{more ? L(lang, "Ocultar detalle", "Hide detail") : L(lang, "Ver el detalle", "See the detail")}</span><ChevronRight aria-hidden className="a2-more-chev" /></button>
        {more ? <Hint topic="cifras-asesor" className="is-detail" /> : null}
      </div>
      {more ? <div className="a2-detail">{children}</div> : null}
    </div>
  );
}
