import { translate } from "@/lib/faro/i18n";
import { MODES, type Mode } from "@/lib/faro/mode";
import type { ModeImpact } from "@/lib/faro/mode";
import type { Lang } from "@/lib/faro/types";
import { importToast } from "./bank-dock";
import "./mode-gate.css";

/**
 * La pantalla inicial de elección (tres modos, etapa 1, D-1): la pone el
 * proveedor como puerta de una cuenta nueva, antes de la primera sesión útil.
 * Presenta los tres modos con sus funciones en puntos — la idea original de
 * Alvin — y no esconde su salida: saltar es una elección que aterriza en
 * Esencial AVISADA (el aviso sale al saltar), nunca impuesta en silencio.
 * Elegir o saltar escriben el campo por los commits del proveedor; esta
 * pantalla no escribe nada por su cuenta.
 */
export function ModeGate({ lang, onChoose, onSkip }: { lang: Lang; onChoose: (mode: Mode) => void; onSkip: () => void }) {
  const t = (key: string) => translate(lang, key);
  return (
    <div className="mode-gate" role="dialog" aria-modal="true" aria-label={t("mode.gate.title")} data-anchor="modo-puerta">
      <div className="mode-gate-card">
        <p className="mode-gate-kicker">{t("mode.gate.kicker")}</p>
        <h2 className="mode-gate-title">{t("mode.gate.title")}</h2>
        <p className="mode-gate-sub">{t("mode.gate.sub")}</p>
        <div className="mode-gate-modes">
          {MODES.map((mode) => (
            <section key={mode} className="mode-gate-mode" data-anchor={`modo-puerta-${mode}`}>
              <h3 className="mode-gate-name">{t(`mode.${mode}`)}</h3>
              <p className="mode-gate-line">{t(`mode.${mode}.line`)}</p>
              <ul className="mode-gate-points">
                {[1, 2, 3, 4].map((i) => (
                  <li key={i}>{t(`mode.gate.b.${mode}.${i}`)}</li>
                ))}
              </ul>
              <button type="button" className="mode-gate-go" data-anchor={`modo-puerta-go-${mode}`} onClick={() => onChoose(mode)}>
                {t("mode.gate.choose").replace("{name}", t(`mode.${mode}`))}
              </button>
            </section>
          ))}
        </div>
        <button
          type="button"
          className="mode-gate-skip"
          data-anchor="modo-puerta-skip"
          onClick={() => {
            onSkip();
            importToast({ text: t("mode.skip.notice") });
          }}
        >
          {t("mode.gate.skip")}
        </button>
      </div>
    </div>
  );
}

/**
 * La pantalla de impacto (tres modos, etapa 1): bajar de modo la abre SOLO
 * cuando hay algo real que avisar (conteos > 0, contados por modeImpact).
 * Nombra lo que duerme con su número y los avisos que dejan de llegar, dice
 * «nada se borra» en claro, y exige confirmación — bajar es desactivar, y
 * desactivar pregunta primero. Vive en la familia visual de .ask, la casa de
 * las confirmaciones.
 */
/**
 * La pantalla de impacto RE-PLANTEADA (ola 3, Cambios C3-1): la persona
 * aceptó una BAJADA, pero mientras el diálogo estaba abierto su modo cambió
 * por otra puerta (otra pestaña, la nube) y el destino ya queda ARRIBA del
 * modo vivo — confirmar sería ejecutar una subida con palabras de bajada y
 * sin nombrar lo destapado. El diálogo se vuelve a plantear en la dirección
 * verdadera: dice que el modo cambió, nombra lo que la subida destapa en
 * este libro y pide su propia confirmación («Subir a…»). Una subida jamás se
 * aplica con el gesto de una bajada.
 */
export function ModeReposedDialog({ lang, target, from, unlocked, fresh, onConfirm, onCancel }: { lang: Lang; target: Mode; from: Mode; unlocked: { id: string; labelKey: string; count: number }[]; fresh?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const t = (key: string) => translate(lang, key);
  const name = t(`mode.${target}`);
  return (
    <div className="ask-back" role="presentation" onMouseDown={onCancel}>
      <div className="ask" data-anchor="modo-replanteado" role="alertdialog" aria-modal="true" aria-label={t("mode.reposed.title").replace("{name}", name)} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="ask-title">{t("mode.reposed.title").replace("{name}", name)}</h2>
        <div className="ask-body mode-impact-body">
          {/* 1.3.318: fresh = la pregunta nace del toque de la persona
              (subir también confirma, palabra de Oscar) y su cuerpo es la
              pregunta fresca; sin fresh es el re-planteado de siempre,
              cuyo cuerpo cuenta que el modo cambió mientras miraba. */}
          <p>{t(fresh ? "mode.up.body" : "mode.reposed.body").replace("{from}", t(`mode.${from}`)).replace("{name}", name)}</p>
          {unlocked.length > 0 ? (
            <>
              <p>{t("mode.reposed.list")}</p>
              <ul className="mode-impact-list">
                {unlocked.map((g) => (
                  <li key={g.id}>
                    <b>{g.count}</b> {t(g.labelKey)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <div className="ask-actions">
          <button type="button" className="ask-btn is-quiet" data-anchor="modo-replanteado-no" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="button" className="ask-btn is-go" data-anchor="modo-replanteado-yes" autoFocus onClick={onConfirm}>
            {t("mode.reposed.yes").replace("{name}", name)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModeImpactDialog({ lang, target, impact, refreshed, onConfirm, onCancel }: { lang: Lang; target: Mode; impact: ModeImpact; refreshed?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const t = (key: string) => translate(lang, key);
  const name = t(`mode.${target}`);
  return (
    <div className="ask-back" role="presentation" onMouseDown={onCancel}>
      <div className="ask" data-anchor="modo-impacto" role="alertdialog" aria-modal="true" aria-label={t("mode.impact.title").replace("{name}", name)} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="ask-title">{t("mode.impact.title").replace("{name}", name)}</h2>
        <div className="ask-body mode-impact-body">
          {refreshed ? <p className="mode-impact-refreshed">{t("mode.impact.refreshed")}</p> : null}
          <p>{t("mode.impact.intro").replace("{name}", name)}</p>
          <ul className="mode-impact-list">
            {impact.groups.map((g) => (
              <li key={g.id}>
                <b>{g.count}</b> {t(g.labelKey)}
              </li>
            ))}
          </ul>
          {impact.alerts.length > 0 ? (
            <>
              <p>{t("mode.impact.alerts")}</p>
              <ul className="mode-impact-list">
                {impact.alerts.map((a) => (
                  <li key={a.id}>
                    <b>{a.count}</b> {t(`mode.a.${a.id}`)}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p>{t("mode.impact.keeper")}</p>
        </div>
        <div className="ask-actions">
          <button type="button" className="ask-btn is-quiet" data-anchor="modo-impacto-no" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="button" className="ask-btn is-go" data-anchor="modo-impacto-yes" autoFocus onClick={onConfirm}>
            {t("mode.impact.yes").replace("{name}", name)}
          </button>
        </div>
      </div>
    </div>
  );
}
