import { useMemo } from "react";
import { SCORE_WEIGHTS, type Coach } from "@/lib/faro/coach";
import { useCoach } from "./panorama";

/**
 * 1.3.420 — LAS FIGURAS DEL MANUAL (fallo de Oscar, 2026-11-22 13:53):
 * el Manual tiene la habitación entera, así que donde el caso lo amerita
 * DICE MÁS Y MUESTRA MÁS: la explicación también se dibuja, con los
 * números reales del libro de quien lee — nunca una ilustración genérica.
 * El banco no dibuja: declara; este es el registro de qué tema lleva qué
 * figura. La primera: la salud, con el mismo motor (coach) y la misma
 * escala que la tarjeta de ayuda de Estudio — una sola verdad, dos casas.
 */
const FIGURE_FOR: Record<string, "health"> = { salud: "health" };

export function ManualFigure({ topicId, lang }: { topicId: string; lang: "es" | "en" }) {
  const kind = FIGURE_FOR[topicId];
  if (kind === "health") return <HealthFigure lang={lang} />;
  return null;
}

const BANDS = [
  { from: 0, to: 44, es: "Frágil", en: "Fragile", tone: "bad" },
  { from: 45, to: 64, es: "Por ajustar", en: "Needs tuning", tone: "warn" },
  { from: 65, to: 79, es: "Bien encaminada", en: "On track", tone: "good" },
  { from: 80, to: 100, es: "Sólida", en: "Solid", tone: "good" },
] as const;

/** La misma colocación que la ayuda de Estudio: cuatro bandas iguales y
 * la nota dentro de la suya. */
function markAt(s: number, bands: readonly { from: number; to: number }[]) {
  const i = Math.max(0, bands.findIndex((b) => s >= b.from && s <= b.to));
  const b = bands[i]!;
  const within = (s - b.from + 0.5) / (b.to - b.from + 1);
  return Math.min(96, Math.max(4, ((i + within) / bands.length) * 100));
}

function HealthFigure({ lang }: { lang: "es" | "en" }) {
  const coach: Coach | null = useCoach();
  const en = lang === "en";
  const rows = useMemo(() => {
    if (!coach) return [];
    const raw = coach.pillars.map((p) => {
      const max = Math.round((SCORE_WEIGHTS[p.id] ?? 0) * 100);
      return { id: p.id, label: p.label, max, exact: (p.score * max) / 100, tone: p.tone };
    });
    // Los mismos redondeos que la ayuda de Estudio: las partes suman la nota exacta.
    const pts = raw.map((r) => Math.floor(r.exact));
    let left = coach.score - pts.reduce((a, b) => a + b, 0);
    raw.map((r, i) => ({ i, rem: r.exact - Math.floor(r.exact) })).sort((a, b) => b.rem - a.rem).forEach(({ i }) => {
      if (left > 0 && pts[i]! < raw[i]!.max) { pts[i] += 1; left -= 1; }
    });
    return raw.map((r, i) => ({ ...r, pts: pts[i]! }));
  }, [coach]);
  if (!coach || !rows.length) return null;
  const s = Math.max(0, Math.min(100, coach.score));
  const gaps = rows.map((r) => ({ ...r, miss: r.max - r.pts })).filter((r) => r.miss > 0).sort((a, b) => b.miss - a.miss);
  const top = gaps.filter((g) => g.miss === gaps[0]?.miss).slice(0, 2);
  const join = (xs: string[]) => xs.join(en ? " and " : " y ");
  return (
    <figure className="mn-fig" aria-label={en ? "Your grade, drawn" : "Tu nota, dibujada"}>
      <figcaption className="mn-fig-cap">{en ? "Your grade, on its scale" : "Tu nota, en su escala"}</figcaption>
      <div className="mn-fig-scale" aria-hidden>
        {BANDS.map((b) => (
          <span key={b.from} className={`mn-fig-band is-${b.tone}${s >= b.from && s <= b.to ? " is-here" : ""}`}>
            <i />
            <em>{en ? b.en : b.es}</em>
            <small>{b.from}–{b.to}</small>
          </span>
        ))}
        <b style={{ left: `${markAt(s, BANDS)}%` }}>{coach.score}</b>
      </div>
      <ul className="mn-fig-bars">
        {rows.map((r) => (
          <li key={r.id}>
            <span className="mn-fig-nm">{r.label}</span>
            <span className="mn-fig-track"><i style={{ width: `${r.max ? (r.pts / r.max) * 100 : 0}%` }} className={`is-${r.tone}`} /></span>
            <span className="mn-fig-pt">{en ? `${r.pts} of ${r.max}` : `${r.pts} de ${r.max}`}</span>
          </li>
        ))}
      </ul>
      <p className="mn-fig-note">
        {en ? <>The parts add up to your <b>{coach.score}</b>. </> : <>Las partes suman tu <b>{coach.score}</b>. </>}
        {top.length
          ? en
            ? <>Where you have most to gain is <b>{join(top.map((t) => t.label))}</b>: {top[0]!.miss} points to win{top.length > 1 ? " in each" : ""}.</>
            : <>Donde más te falta es en <b>{join(top.map((t) => t.label))}</b>: {top[0]!.miss} puntos por ganar{top.length > 1 ? " en cada una" : ""}.</>
          : en
            ? "No part is missing points: the grade is complete."
            : "A ninguna parte le faltan puntos: la nota está completa."}
      </p>
    </figure>
  );
}
