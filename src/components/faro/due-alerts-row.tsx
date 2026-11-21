import { BellRing } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import "./sample-mode.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * Ajustes → «Avisos de pagos» (Ola 6, 1.3.356): el interruptor de los
 * avisos DENTRO de la app de los pagos que se acercan (la tarjeta de
 * Central). Vive junto a la fila de Avisos del teléfono porque en la
 * mente de la persona es el mismo territorio: avisos. Como su hermana
 * (1.3.259), APAGAR pide confirmación primero — se pierde el aviso de
 * un pago que va a salir — y ENCENDER es el toque desnudo.
 */
export function DueAlertsRow() {
  const { lang, session, commit, confirm, has } = useFaro();
  if (!session || !has("settings.due-alerts")) return null;
  const on = session.ledger.settings.dueAlerts !== false;
  const flip = () => {
    if (on) {
      confirm({
        title: L(lang, "Desactivar avisos de pagos", "Turn off payment notices"),
        body: L(lang,
          "Faro deja de mostrarte en Central los pagos que se acercan. Los pagos siguen venciendo igual; solo se apaga el aviso. Puedes volver a activarlo cuando quieras, aquí mismo.",
          "Faro will stop showing you upcoming payments on Central. The payments still come due; only the notice turns off. You can turn it back on any time, right here."),
        yes: L(lang, "Desactivar", "Turn off"),
        run: () => commit((s) => ({ ...s, settings: { ...s.settings, dueAlerts: false } }),
          L(lang, "Avisos de pagos apagados", "Payment notices off")),
      });
      return;
    }
    commit((s) => ({ ...s, settings: { ...s.settings, dueAlerts: true } }),
      L(lang, "Avisos de pagos encendidos", "Payment notices on"));
  };
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-due-alerts">
      <div className="smp-in">
        <div role="switch" tabIndex={0} aria-checked={on} className="manual-row aj-row smp-row" onClick={flip}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
          <BellRing aria-hidden />
          <span className="manual-row-text">
            <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Avisos de pagos", "Payment notices")}</h2><Hint topic="avisos-pagos" /></div>
            <span className="aj-sub">{on
              ? L(lang, "En Central, cuando un pago se acerca", "On Central, when a payment is near")
              : L(lang, "Apagados por ti", "Turned off by you")}</span>
          </span>
          <i className="smp-switch" aria-hidden><b /></i>
        </div>
      </div>
    </section>
  );
}
