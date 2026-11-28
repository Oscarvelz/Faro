import { useState } from "react";
import { ChevronDown, ChevronRight, Wallet, X } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { budgetFigures, type BudgetFigure } from "@/lib/faro/budgets";
import type { Lang } from "@/lib/faro/types";
import { categoryColor } from "@/lib/faro/colors";
import { formatMoney } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import { findTopic } from "@/lib/manual/topics";
import "./budgets.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * EL PRESUPUESTO (1.3.522, diseño aprobado por Oscar) — la tarjeta de
 * Central y el pliegue de Estudio leen LA MISMA cuenta (budgets.ts) y
 * pintan LOS MISMOS renglones (BudgetRows): una categoría con tope por
 * renglón, su barra en su color, y las tres cifras — lo llevado, el
 * tope y lo que queda o el pase en palabras — cada una con su «?» al
 * tema del Manual, como mandó Oscar. El pase se dice en palabras, sin
 * color de alarma permanente. La tarjeta NACE solo si hay al menos un
 * tope fijado: sin topes no hay tarjeta ni pliegue.
 */
export function BudgetRows({ rows, lang, names }: { rows: BudgetFigure[]; lang: Lang; names: { cat: (id: string) => string } }) {
  return (
    <div className="bud-rows">
      {rows.map((f) => {
        const color = categoryColor(f.cat.id, f.cat.color);
        const pct = Math.min(100, (f.spentMinor / f.capMinor) * 100);
        return (
          <div key={f.cat.id} className="bud-row" data-anchor="budgets-row">
            <div className="bud-top">
              <span className="bud-dot" style={{ background: color }} aria-hidden />
              <span className="bud-name">{names.cat(f.cat.id)}</span>
            </div>
            <div className="bud-track" aria-hidden>
              <b style={{ width: `${Math.max(2, pct)}%`, background: color }} />
            </div>
            <p className="bud-figs">
              <span className="bud-fig">{L(lang, "llevas", "you've spent")} <b className="num">{formatMoney(f.spentMinor, f.capCurrency, lang)}</b><Hint topic="presupuestos" /></span>
              <span className="bud-fig">{L(lang, "de", "of")} <b className="num">{formatMoney(f.capMinor, f.capCurrency, lang)}</b><Hint topic="presupuestos" /></span>
              {f.over
                ? <span className="bud-fig">{L(lang, "pasado por", "over by")} <b className="num">{formatMoney(f.overMinor, f.capCurrency, lang)}</b><Hint topic="presupuestos" /></span>
                : <span className="bud-fig">{L(lang, "te quedan", "you have left")} <b className="num">{formatMoney(f.leftMinor, f.capCurrency, lang)}</b><Hint topic="presupuestos" /></span>}
            </p>
            {f.converted ? <p className="bud-note">{L(lang, `Convertido con la tasa anotada en tu libro: ${(f.rateE4 / 10000).toFixed(4).replace(/\.?0+$/, "")} córdobas por dólar.`, `Converted at the rate recorded in your book: ${(f.rateE4 / 10000).toFixed(4).replace(/\.?0+$/, "")} córdobas per dollar.`)}</p> : null}
            {f.uncounted.map((u) => (
              <p key={u.currency} className="bud-note">{L(lang, `Sin contar: ${formatMoney(u.minor, u.currency, lang)} en ${u.currency === "NIO" ? "córdobas" : "dólares"} — tu libro no trae una tasa anotada para convertirlos.`, `Not counted: ${formatMoney(u.minor, u.currency, lang)} in ${u.currency === "NIO" ? "córdobas" : "dollars"} — your book holds no recorded rate to convert them.`)}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** La puerta de regreso (1.3.522): si la tarjeta se quitó de Central,
 * el pliegue de Estudio ofrece volver a mostrarla — quitar nunca es
 * un callejón sin salida. Sin tarjeta quitada, la pastilla no nace. */
export function BudgetsShowCentralPill() {
  const { session, lang, commit } = useFaro();
  if (!session || !session.ledger.settings.budgetsCardHidden) return null;
  return (
    <button
      type="button"
      className="bud-quiet-btn"
      data-anchor="budgets-show-central"
      onClick={() => commit(
        (s) => ({ ...s, settings: { ...s.settings, budgetsCardHidden: false } }),
        L(lang, "Tarjeta de Presupuestos de vuelta en Central", "Budgets card back on Central"))}
    >
      {L(lang, "Mostrar en Central", "Show on Central")}
    </button>
  );
}

export function BudgetsCard() {
  const { session, lang, names, has, goTopic, confirm, commit } = useFaro();
  // 1.3.522 (Oscar, 2026-11-27): la tarjeta es DESPLEGABLE, como la de
  // pagos que se acercan — su estado se recuerda en el equipo — y se
  // puede QUITAR de Central: las tres pastillas (el «?», el despliegue
  // y la ✕) viven juntas en la cabecera. Quitarla no toca ningún tope:
  // el pliegue de Estudio queda, y desde él la tarjeta vuelve.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("faro-budgets-open") !== "0"; } catch { return true; }
  });
  if (!session || !has("central.budgets")) return null;
  if (session.ledger.settings.budgetsCardHidden) return null;
  const key = todayIso().slice(0, 7);
  const rows = budgetFigures(session.ledger, key);
  if (!rows.length) return null;
  const shown = rows.slice(0, 3);
  const more = rows.length - shown.length;
  const topic = findTopic("presupuestos");
  const toggle = () => {
    setOpen((v) => {
      try { localStorage.setItem("faro-budgets-open", v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };
  const hide = () => {
    confirm({
      title: L(lang, "Quitar la tarjeta de Central", "Remove the card from Central"),
      body: L(lang,
        "Los topes no se tocan y el pliegue de Presupuestos en Estudio queda: desde él puedes volver a mostrar la tarjeta cuando quieras.",
        "Your caps are untouched and the Budgets fold in Study stays: from there you can show the card again whenever you want."),
      yes: L(lang, "Quitar la tarjeta", "Remove the card"),
      run: () => commit(
        (s) => ({ ...s, settings: { ...s.settings, budgetsCardHidden: true } }),
        L(lang, "Tarjeta de Presupuestos quitada de Central", "Budgets card removed from Central")),
    });
  };
  return (
    <section className="card bud-card" data-anchor="budgets-card">
      <div className="bud-head">
        <Wallet aria-hidden />
        <h2 className="serif">{L(lang, "Presupuestos", "Budgets")}</h2>
        <span className="bud-head-actions">
          <Hint topic="presupuestos" />
          <button type="button" className="bud-pill" data-anchor="budgets-fold" aria-label={L(lang, open ? "Plegar" : "Desplegar", open ? "Fold" : "Unfold")} onClick={toggle}>
            {open ? <ChevronDown aria-hidden /> : <ChevronRight aria-hidden />}
          </button>
          <button type="button" className="bud-pill" data-anchor="budgets-hide" aria-label={L(lang, "Quitar de Central", "Remove from Central")} onClick={hide}>
            <X aria-hidden />
          </button>
        </span>
      </div>
      {open ? (
        <>
          <BudgetRows rows={shown} lang={lang} names={names} />
          {more > 0 && topic?.go ? (
            <button type="button" className="bud-more" data-anchor="budgets-more" onClick={() => goTopic(topic.id, topic.go!, "presupuestos")}>
              {L(lang, `Ver ${more === 1 ? "uno más" : `${more} más`} en Estudio`, `See ${more} more in Study`)}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
