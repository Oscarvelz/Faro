import { BellRing, ChevronRight, X } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { dueAlerts, dueAlertsHidden, dueAlertsSig } from "@/lib/faro/autopay";
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
 *
 * 1.3.381 (Oscar, 2026-11-21): la tarjeta vive ARRIBA de
 * Tengo · Gastaré · Pagos, para que las fichas se desplieguen
 * normalmente debajo de ella, y su ✕ la quita de Central SOLO por
 * ahora — tras confirmación: vuelve mañana o en cuanto cambie un
 * pago, y jamás toca los avisos del teléfono (la ventana lo dice).
 * Si las cuotas se pagan, el conjunto se vacía y la tarjeta — con su
 * opción de quitar — desaparece sola.
 */
export function DueAlertsCard() {
  const { session, fmt, lang, goTopic, has, confirm, commit } = useFaro();
  if (!session || !has("central.due-alerts")) return null;
  if (session.ledger.settings.dueAlerts === false) return null;
  const today = todayIso();
  const alerts = dueAlerts(session.ledger, today);
  if (!alerts.length) return null;
  if (dueAlertsHidden(session.ledger, today)) return null;
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
  const dismiss = () => {
    confirm({
      title: L(lang, "Quitar de Central por ahora", "Remove from Central for now"),
      body: L(lang,
        "La tarjeta vuelve mañana, o en cuanto cambie un pago. Esto solo la quita de Central: los avisos de tu teléfono no se tocan.",
        "The card comes back tomorrow, or as soon as a payment changes. This only removes it from Central: your phone notices are untouched."),
      yes: L(lang, "Quitar por ahora", "Remove for now"),
      // OLA 28 (Familia 9, Q28-C1 de Cambios): LA FIRMA SE CALCULA
      // DE LO VIVO, DENTRO DE LA RECETA. La firma cerraba sobre
      // `alerts` — la FOTO del render — y entre el toque en la ✕ y
      // la confirmación un pago podía entrar en la ventana: el acto
      // confirmado firmaba un conjunto que ya no era el vivo, la
      // firma nacía vieja y el descarte no quitaba nada, en silencio.
      // La receta recibe el estado vivo del commit y firma
      // dueAlerts(ese estado, hoy): lo que se descarta es lo que hay
      // al confirmar, como la Familia 8 de la Cura 27 re-lee dentro
      // de sus recetas. (`today` es el día del acto, no un dato del
      // libro: la foto del día es la correcta para firmar.)
      run: () => commit(
        (s) => ({ ...s, settings: { ...s.settings, dueAlertsDismissed: { sig: dueAlertsSig(dueAlerts(s, today)), day: today } } }),
        L(lang, "Tarjeta quitada de Central por ahora", "Card removed from Central for now")),
    });
  };
  return (
    <section className="card due-alerts" data-anchor="due-alerts">
      <div className="due-alerts-head">
        <BellRing aria-hidden />
        <h2 className="serif">{L(lang, "Pagos que se acercan", "Payments coming up")}</h2>
        <Hint topic="avisos-pagos" />
        <button type="button" className="due-alerts-x" data-anchor="due-alerts-dismiss" aria-label={L(lang, "Quitar de Central por ahora", "Remove from Central for now")} onClick={dismiss}>
          <X aria-hidden />
        </button>
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
