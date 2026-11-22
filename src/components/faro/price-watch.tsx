/**
 * FARO — El vigilante de fijos que suben (§19.3, 1.3.366): las dos
 * superficies de la serie de precios (prices.ts, el motor F-B2).
 * En el Asesor, el aviso: un fijo que llegó con otro monto se dice una
 * vez, en la voz del Asesor y sin colores de alarma; al tocarlo enseña
 * las dos líneas que lo prueban (procedencia). En Estudio, la
 * evidencia: la escalera del precio y la lista por impacto de los
 * últimos 12 meses, con su corte declarado. El color es del tema.
 * Asientos: Completo (advisor.price-watch / study.prices).
 * 1.3.411 (dirección A de Oscar): la escalera vive en su bandeja hundida
 * con el relleno del acento, el tramo del cambio elegido va encendido y
 * su tarjeta de detalle responde debajo; la selección es de doble vía —
 * el renglón de la lista y el escalón de la escalera son el mismo toque.
 */
import { useMemo, useState } from "react";
import { currentFixedChanges, priceWatch, type PriceChange } from "@/lib/faro/prices";
import { todayIso } from "@/lib/faro/loans";
import { formatMoney } from "@/lib/faro/money";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import "./price-watch.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

const MONTH_SHORT_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** «5 nov» / "Nov 5". */
function dayLabel(lang: string, iso: string): string {
  const d = Number(iso.slice(8, 10));
  const m = Number(iso.slice(5, 7)) - 1;
  return lang === "en" ? `${MONTH_SHORT_EN[m]} ${d}` : `${d} ${MONTH_SHORT_ES[m]}`;
}

function signed(lang: string, c: PriceChange): string {
  const sign = c.deltaMinor > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(c.deltaMinor), c.currency, lang === "en" ? "en" : "es")}`;
}

function changeSentence(lang: string, c: PriceChange): string {
  const up = c.deltaMinor > 0;
  const from = formatMoney(c.from.minor, c.currency, lang === "en" ? "en" : "es");
  const to = formatMoney(c.to.minor, c.currency, lang === "en" ? "en" : "es");
  return lang === "en"
    ? `${c.name} went ${up ? "up" : "down"}: ${from} → ${to} this month (${signed(lang, c)})`
    : `${c.name} ${up ? "subió" : "bajó"}: ${from} → ${to} desde este mes (${signed(lang, c)})`;
}

/* ------------------------------------------------------------ el aviso */

export function PriceNotice() {
  const { session, lang, has } = useFaro();
  const [openId, setOpenId] = useState<string | null>(null);
  const ledger = session?.ledger;
  const today = todayIso();
  const changes = useMemo(
    () => (ledger ? currentFixedChanges(ledger, today) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, today],
  );
  if (!has("advisor.price-watch") || !ledger || changes.length === 0) return null;
  const lg = lang === "en" ? "en" : "es";
  return (
    <section className="advice-card pw-card" data-anchor="advice-price-watch">
      <p className="advice-kicker">
        <span className="lab-head">
          {L(lang, "Cambios en tus fijos", "Changes in your fixed charges")}
          <Hint topic="cambios-precio" />
        </span>
      </p>
      <ul className="pw-list">
        {changes.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="pw-line"
              aria-expanded={openId === c.id}
              onClick={() => setOpenId((v) => (v === c.id ? null : c.id))}
            >
              <span className="pw-sentence">{changeSentence(lang, c)}</span>
            </button>
            {openId === c.id ? (
              <div className="pw-proof">
                <p>
                  <span>{L(lang, "Antes", "Before")} · {dayLabel(lang, c.from.on)}</span>
                  <strong className="num">{formatMoney(c.from.minor, c.currency, lg)}</strong>
                </p>
                <p>
                  <span>{L(lang, "Ahora", "Now")} · {dayLabel(lang, c.to.on)}</span>
                  <strong className="num">{formatMoney(c.to.minor, c.currency, lg)}</strong>
                </p>
                <p className="pw-note">
                  {L(lang,
                    "El monto nuevo es ahora el patrón de este fijo: el Asesor y tu saldo proyectado ya cuentan con él.",
                    "The new amount is now this charge's pattern: the Advisor and your projected balance already count on it.")}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------- el espacio en Estudio */

/** Cuánto lleva el precio nuevo sentado: la frase de la tarjeta de detalle. */
function monthsAt(lang: string, toOn: string, today: string): string {
  let n = (Number(today.slice(0, 4)) - Number(toOn.slice(0, 4))) * 12 + (Number(today.slice(5, 7)) - Number(toOn.slice(5, 7)));
  if (Number(today.slice(8, 10)) < Number(toOn.slice(8, 10))) n -= 1;
  if (n <= 0) return L(lang, "a este precio desde este mes", "at this price since this month");
  return lang === "en" ? `at this price for ${n} month${n === 1 ? "" : "s"}` : `lleva ${n} ${n === 1 ? "mes" : "meses"} a este precio`;
}

function StepChart({ lang, c, sel, endsAt, onPick }: { lang: string; c: PriceChange; sel: PriceChange; endsAt: Map<string, string>; onPick: (id: string) => void }) {
  const pts = c.series;
  if (pts.length < 2) return null;
  const W = 320;
  const H = 122;
  const PADX = 8;
  const PADTOP = 20;
  const PADBOT = 22;
  const t0 = Date.parse(pts[0]!.on);
  const t1 = Date.parse(pts[pts.length - 1]!.on);
  const span = Math.max(1, t1 - t0);
  const lo = Math.min(...pts.map((p) => p.minor));
  const hi = Math.max(...pts.map((p) => p.minor));
  const range = Math.max(1, hi - lo);
  const x = (on: string) => PADX + ((Date.parse(on) - t0) / span) * (W - PADX * 2);
  const y = (minor: number) => PADTOP + (1 - (minor - lo) / range) * (H - PADTOP - PADBOT);
  let d = `M ${x(pts[0]!.on).toFixed(1)} ${y(pts[0]!.minor).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H ${x(pts[i]!.on).toFixed(1)} V ${y(pts[i]!.minor).toFixed(1)}`;
  }
  d += ` H ${(W - PADX).toFixed(1)}`;
  const lg = lang === "en" ? "en" : "es";
  // Los vértices de la escalera: el primer punto, cada punto donde el precio
  // CAMBIA y el último. Solo ellos llevan rótulo — valor arriba, fecha abajo —
  // para que la gráfica se lea sin adivinar (Oscar, 2026-11-21).
  const verts = pts.filter((p, i) => i === 0 || i === pts.length - 1 || p.minor !== pts[i - 1]!.minor);
  const levels = [...new Set(verts.map((p) => p.minor))];
  const anchorOf = (p: (typeof pts)[number], i: number): "start" | "middle" | "end" =>
    i === 0 ? "start" : i === verts.length - 1 ? "end" : "middle";
  const labelX = (p: (typeof pts)[number], i: number): number => {
    const raw = x(p.on);
    if (anchorOf(p, i) === "middle") return Math.min(W - 34, Math.max(34, raw));
    return raw;
  };
  // 1.3.411: el tramo del cambio elegido va encendido — el escalón en su
  // fecha y el nivel nuevo corriendo hasta el punto siguiente: donde el
  // precio nuevo vive. Y el relleno suave del acento bajo la escalera.
  const selIdx = pts.findIndex((p) => p.on === sel.to.on && p.minor === sel.to.minor);
  const litD = selIdx > 0
    ? `M ${x(sel.to.on).toFixed(1)} ${y(sel.from.minor).toFixed(1)} V ${y(sel.to.minor).toFixed(1)} H ${(selIdx + 1 < pts.length ? x(pts[selIdx + 1]!.on) : W - PADX).toFixed(1)}`
    : null;
  const areaD = `${d} L ${(W - PADX).toFixed(1)} ${(H - PADBOT).toFixed(1)} L ${PADX.toFixed(1)} ${(H - PADBOT).toFixed(1)} Z`;
  const isSel = (p: (typeof pts)[number]) => p.on === sel.to.on && p.minor === sel.to.minor;
  return (
    <svg className="pw-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={c.name}>
      {levels.map((lv) => (
        <line key={lv} x1={PADX} x2={W - PADX} y1={y(lv)} y2={y(lv)} className="pw-grid" />
      ))}
      <path d={areaD} className="pw-area" />
      <path d={d} className="pw-step" fill="none" />
      {litD ? <path d={litD} className="pw-step-lit" /> : null}
      {pts.map((p, i) => (
        <circle key={`${p.on}-${i}`} cx={x(p.on)} cy={y(p.minor)} r={isSel(p) ? 4.5 : 3} className={isSel(p) ? "pw-dot-sel" : "pw-dot"} />
      ))}
      {pts.map((p, i) => {
        if (i === 0 || p.minor === pts[i - 1]!.minor) return null;
        const id = endsAt.get(`${p.on}|${p.minor}`);
        if (!id || id === sel.id) return null;
        return (
          <circle
            key={`h-${p.on}-${i}`}
            cx={x(p.on)}
            cy={y(p.minor)}
            r={13}
            className="pw-hit"
            role="button"
            aria-label={`${c.name}: ${formatMoney(p.minor, c.currency, lg)}`}
            onClick={() => onPick(id)}
          />
        );
      })}
      {verts.map((p, i) => (
        <text key={`a-${p.on}-${i}`} x={labelX(p, i)} y={Math.max(11, y(p.minor) - 7)} textAnchor={anchorOf(p, i)} className="pw-chart-amt">{formatMoney(p.minor, c.currency, lg)}</text>
      ))}
      {verts.map((p, i) => (
        <text key={`d-${p.on}-${i}`} x={labelX(p, i)} y={Math.min(H - 4, y(p.minor) + 15)} textAnchor={anchorOf(p, i)} className="pw-chart-day">{dayLabel(lang, p.on)}</text>
      ))}
    </svg>
  );
}

export function PriceWatchStudy() {
  const { session, lang, names } = useFaro();
  const [pick, setPick] = useState<string | null>(null);
  const ledger = session?.ledger;
  const today = todayIso();
  const watch = useMemo(
    () => (ledger ? priceWatch(ledger, today) : { rows: [], hidden: 0, total: 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, today],
  );
  if (!ledger || watch.rows.length === 0) return null;
  const lg = lang === "en" ? "en" : "es";
  const current = watch.rows.find((r) => r.id === pick) ?? watch.rows[0]!;
  // Los cambios del mismo grupo que la escalera pinta: cada vértice donde
  // el precio se movió sabe qué cambio termina en él (la doble vía).
  const endsAt = new Map<string, string>();
  for (const r of watch.rows) if (r.groupId === current.groupId) endsAt.set(`${r.to.on}|${r.to.minor}`, r.id);
  const detailFx = (c: PriceChange): { main: string; sub: string } => {
    if (c.cls === "fixed") {
      return {
        main: `≈ ${formatMoney(Math.round(c.monthlyMinor), c.currency, lg)}`,
        sub: c.deltaMinor > 0 ? L(lang, "más al mes", "more a month") : L(lang, "menos al mes", "less a month"),
      };
    }
    const pct = c.deltaBp === null ? "" : ` (${c.deltaBp > 0 ? "+" : "−"}${(Math.abs(c.deltaBp) / 100).toFixed(1)}%)`;
    return { main: formatMoney(Math.abs(c.deltaMinor), c.currency, lg), sub: `${L(lang, "por compra", "per purchase")}${pct}` };
  };
  const fx = detailFx(current);
  const impactOf = (c: PriceChange): string => {
    if (c.cls === "fixed") {
      const per = formatMoney(Math.round(c.monthlyMinor), c.currency, lg);
      return lang === "en" ? `≈ ${per} a month` : `≈ ${per} al mes`;
    }
    const pct = c.deltaBp === null ? "" : ` (${c.deltaBp > 0 ? "+" : "−"}${(Math.abs(c.deltaBp) / 100).toFixed(1)}%)`;
    const per = formatMoney(Math.abs(c.deltaMinor), c.currency, lg);
    return lang === "en" ? `${per} per purchase${pct}` : `${per} por compra${pct}`;
  };
  return (
    <section className="card pw-study" data-anchor="study-prices">
      <h2 className="serif text-2xl lab-head">
        {L(lang, "Cambios de precio", "Price changes")}
        <Hint topic="cambios-precio" />
      </h2>
      <p className="pw-intro">
        {L(lang,
          "Qué cambió de precio en los últimos 12 meses, lo de mayor efecto primero. Toca un cambio, o un escalón de su escalera, para ver su detalle.",
          "What changed price in the last 12 months, biggest effect first. Tap a change, or a step on its staircase, to see its detail.")}
      </p>
      <div className="pw-plot">
        <StepChart lang={lang} c={current} sel={current} endsAt={endsAt} onPick={setPick} />
      </div>
      <div className="pw-detail">
        <p className="pw-detail-name">
          {current.name}
          {current.cls === "product" && current.storeId ? <span className="pw-row-store"> · {names.catalog(current.storeId) || current.storeId}</span> : null}
        </p>
        <div className="pw-detail-nums">
          <span className="pw-detail-old num">{formatMoney(current.from.minor, current.currency, lg)}</span>
          <span className="pw-detail-arr">→</span>
          <span className="pw-detail-new num">{formatMoney(current.to.minor, current.currency, lg)}</span>
          <span className="pw-detail-fx">{fx.main}<small>{fx.sub}</small></span>
        </div>
        <p className="pw-detail-meta">
          {current.cls === "fixed" ? L(lang, "Fijo", "Fixed") : L(lang, "Producto", "Product")}
          {" · "}
          {L(lang, "desde el", "since")} {dayLabel(lang, current.to.on)}
          {" · "}
          {monthsAt(lang, current.to.on, today)}
        </p>
      </div>
      <ul className="pw-rows">
        {watch.rows.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`pw-row${c.id === current.id ? " is-picked" : ""}`}
              aria-pressed={c.id === current.id}
              onClick={() => setPick(c.id)}
            >
              <span className="pw-row-main">
                <span className="pw-row-name">
                  {c.name}
                  {c.cls === "product" && c.storeId ? <span className="pw-row-store"> · {names.catalog(c.storeId) || c.storeId}</span> : null}
                </span>
                <span className="pw-row-sub">
                  {c.cls === "fixed" ? L(lang, "Fijo", "Fixed") : L(lang, "Producto", "Product")} · {dayLabel(lang, c.to.on)}
                </span>
              </span>
              <span className="pw-row-figs">
                <span className="num">
                  {formatMoney(c.from.minor, c.currency, lg)} → {formatMoney(c.to.minor, c.currency, lg)}
                </span>
                <span className="pw-row-impact">{impactOf(c)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {watch.hidden > 0 ? (
        <p className="pw-more">
          {lang === "en"
            ? `And ${watch.hidden} smaller ${watch.hidden === 1 ? "change" : "changes"} below these.`
            : `Y ${watch.hidden} ${watch.hidden === 1 ? "cambio menor" : "cambios menores"} debajo de estos.`}
        </p>
      ) : null}
    </section>
  );
}
