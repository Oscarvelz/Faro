import { BellRing, ChevronRight } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { dueAlerts } from "@/lib/faro/autopay";
import { findTopic } from "@/lib/manual/topics";
import { todayIso } from "@/lib/faro/loans";
import "./due-alerts.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * Ola 6 (1.3.356) — «Pagos que se acercan» en Central, por orden de
 * Oscar: un pago recurrente con fecha se anuncia cuando se acerca —
 * aunque el cargo sea automático en línea — invitando a aplicar
 * cambios: cada fila ES la puerta al lugar del pago (la vía del Manual,
 * como las puertas de Novedades y del Asesor). Se apaga en Ajustes
 * (settings.dueAlerts); sin pagos cerca, la tarjeta no nace.
 */
export function DueAlertsCard() {
  const { session, fmt, lang, goTopic, has } = useFaro();
  if (!session || !has("central.due-alerts")) return null;
  if (session.ledger.settings.dueAlerts === false) return null;
  const today = todayIso();
  const alerts = dueAlerts(session.ledger, today);
  if (!alerts.length) return null;
  const shown = alerts.slice(0, 3);
  const more = alerts.length - shown.length;
  const days = (on: string) => Math.round((new Date(`${on}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 864e5);
  const when = (on: string) => {
    const d = days(on);
    return d < 0 ? L(lang, `venció hace ${-d} d`, `${-d} d overdue`) : d === 0 ? L(lang, "hoy", "today") : d === 1 ? L(lang, "mañana", "tomorrow") : L(lang, `en ${d} días`, `in ${d} days`);
  };
  const door = (kind: string) => {
    const tp = findTopic(kind === "card" ? "tarjetas" : "cuotas");
    if (tp?.go) goTopic(tp.id, tp.go, "central");
  };
  return (
    <section className="card due-alerts" data-anchor="due-alerts">
      <div className="due-alerts-head">
        <BellRing aria-hidden />
        <h2 className="serif">{L(lang, "Pagos que se acercan", "Payments coming up")}</h2>
        <Hint topic="avisos-pagos" />
      </div>
      <div className="due-alerts-rows">
        {shown.map((a) => (
          <button key={`${a.kind}-${a.id}-${a.on}`} type="button" className="due-alert-row" data-anchor="due-alert-row" onClick={() => door(a.kind)}>
            <span className="due-alert-name">{a.name}</span>
            <span className="due-alert-when" data-tone={days(a.on) < 0 ? "bad" : days(a.on) <= 1 ? "warn" : undefined}>{when(a.on)}</span>
            <b className="num">{a.amt != null ? fmt(a.amt) : "—"}</b>
            <ChevronRight aria-hidden />
          </button>
        ))}
      </div>
      {more > 0 ? <p className="due-alerts-more">{L(lang, `y ${more} más en Cobros`, `and ${more} more in Collections`)}</p> : null}
    </section>
  );
}
