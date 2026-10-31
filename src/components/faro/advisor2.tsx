// Asesor 2: each advice card leads with a picture; words come second.
import "./advisor2.css";
import { ChevronRight } from "lucide-react";
import { useFaro } from "@/components/faro/provider";
import type { AdviceCard, SectionId } from "@/lib/faro/types";
import type { readAdvisor } from "@/lib/faro/advisor";

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
            {parts.map((p) => <i key={p.id} style={{ flexGrow: p.minor, background: p.c }}><b className="num">{Math.round((p.minor / total) * 100)}%</b></i>)}
          </div>
          <div className="a2-chips">
            {parts.map((p) => <span key={p.id}><i style={{ background: p.c }} />{p.name}<strong className="num">{fmt(p.minor)}</strong></span>)}
          </div>
        </div>
      ) : null}
      {rows.length ? (
        <div className="a2-lines">
          <p className="a2-kick">{L(lang, "Los gastos que más pesaron", "The heaviest lines")}</p>
          {rows.map((r, i) => {
            const k = CLS[r.cls] ?? CLS.discretionary;
            return (
              <button key={r.id} type="button" className="a2-line" style={{ ["--c" as string]: k.c, animationDelay: `${i * 50}ms` }} onClick={() => setUi({ section: sectionFor(kindOf(r.id)), highlight: r.id })}>
                <span className="a2-line-name">{r.name}<em style={{ color: k.c }}>{lang === "en" ? k.en : k.es}</em></span>
                <strong className="num">{fmt(r.minor)}</strong>
                <ChevronRight aria-hidden />
                <span className="a2-line-bar"><b style={{ width: `${Math.max(4, (r.minor / peak) * 100)}%` }} /></span>
              </button>
            );
          })}
          <p className="a2-foot">
            <b style={{ color: CLS.unique.c }}>{L(lang, "Una vez", "One-time")}</b>{L(lang, ": ya salió; se puede devolver, vender o compensar. ", ": already gone; return, sell or offset it. ")}
            <b style={{ color: CLS["essential-fixed"].c }}>{L(lang, "Cada mes", "Monthly")}</b>{L(lang, ": aquí está el ahorro que dura.", ": this is where lasting savings live.")}
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
      <div className="a2-tiles">
        <div><em>{L(lang, "Pagas al mes", "You pay")}</em><strong className="num">{fmt(n.debt)}</strong></div>
        <div><em>{L(lang, "Zona cómoda", "Easy zone")}</em><strong className="num">{fmt(n.allowance)}</strong></div>
        <div className="is-wide"><em>{L(lang, "Espacio antes de salir de la zona", "Room before leaving the zone")}</em><strong className={`num ${room > 0 ? "good" : "bad"}`}>{fmt(room)}</strong></div>
      </div>
      {debts.length ? (
        <div className="a2-lines">
          {debts.map((d) => (
            <div key={d.id} className="a2-line is-static" style={{ ["--c" as string]: CLS.credit.c }}>
              <span className="a2-line-name">{d.name}<em style={{ color: CLS.credit.c }}>{L(lang, "Cuota del mes", "This month's payment")}</em></span>
              <strong className="num">{fmt(d.minor)}</strong>
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
          <strong className="num serif">{sum.left}<small>{L(lang, "queda", "left")}</small></strong>
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
