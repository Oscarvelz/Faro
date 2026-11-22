import { useEffect, useState } from "react";
import { BellOff, ChevronDown, Wallet } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { inAndroidApp, native } from "@/spa/native";
import { NOTICE_SENDERS, forgetNoticeRule, noticeRulesOf } from "@/lib/faro/notices";
import "./sample-mode.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * Ajustes → «Billetera por notificaciones» (Ola 8, 1.3.388; diseño
 * DISENO-OLA-8-BILLETERA). Solo existe en la app Android: iOS no deja
 * a ninguna app leer los avisos de otras, y en la web no hay nada que
 * escuchar — fuera de Android la fila ni nace. La hoja dice en prosa
 * llana qué se lee, qué jamás se toca y qué pasa al apagar; el permiso
 * es del sistema y su estado se lee de él por el puente, nunca se
 * supone; la elección (interruptor + apps) viaja a la cáscara por
 * listenApps y la cáscara obedece. Asientos: escuchar es capturar
 * (Esencial); elegir apps y administrar las formas silenciadas es
 * administrar (Ritmo). Apagar pide confirmación, como manda la casa;
 * encender, no.
 */
export function NoticesFold() {
  const { lang, session, commit, confirm, has } = useFaro();
  const [open, setOpen] = useState(false);
  const bridge = native();
  const canState = !!bridge?.noticesState;
  const [perm, setPerm] = useState<string | null>(() => {
    try { return bridge?.noticesState?.() ?? null; } catch { return null; }
  });
  useEffect(() => {
    if (!canState) return;
    const reread = () => { try { setPerm(bridge?.noticesState?.() ?? null); } catch { /* ignore */ } };
    const onVis = () => { if (document.visibilityState === "visible") reread(); };
    window.addEventListener("focus", reread);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", reread); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canState]);

  const settings = session?.ledger.settings;
  const on = settings?.noticesListen === true;
  const apps = settings?.noticesApps ?? NOTICE_SENDERS.map((s) => s.pkg);
  const rules = session ? noticeRulesOf(session.ledger) : [];
  const canAdmin = has("capture.notices-admin");

  // La elección manda en la cáscara: se le entrega al montar y en cada cambio.
  useEffect(() => {
    try { bridge?.listenApps?.(JSON.stringify({ on, apps })); } catch { /* cáscara vieja: la hoja lo declara */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, apps.join(","), canState]);

  if (!session || !inAndroidApp() || !has("capture.notices")) return null;

  const flip = () => {
    if (on) {
      confirm({
        title: L(lang, "Dejar de escuchar", "Stop listening"),
        body: L(lang,
          "Faro deja de escuchar los avisos de tu billetera en el acto. Lo ya anotado no se toca, y los borradores que esperan en la bandeja se quedan donde están.",
          "Faro stops listening to your wallet's notices right away. What is already noted is untouched, and drafts waiting in the tray stay where they are."),
        yes: L(lang, "Dejar de escuchar", "Stop listening"),
        run: () => commit((s) => ({ ...s, settings: { ...s.settings, noticesListen: false } }),
          L(lang, "Escucha apagada", "Listening off")),
      });
      return;
    }
    commit((s) => ({ ...s, settings: { ...s.settings, noticesListen: true, noticesApps: s.settings.noticesApps ?? NOTICE_SENDERS.map((x) => x.pkg) } }),
      L(lang, "Escucha encendida", "Listening on"));
  };
  const toggleApp = (pkg: string) => {
    const next = apps.includes(pkg) ? apps.filter((p) => p !== pkg) : [...apps, pkg];
    commit((s) => ({ ...s, settings: { ...s.settings, noticesApps: next } }),
      L(lang, "Apps escuchadas", "Listened apps"));
  };

  const sub = !canState
    ? L(lang, "Necesita la cáscara más nueva de la app", "Needs the app's newest shell")
    : perm !== "granted"
      ? L(lang, "Falta el permiso del sistema", "The system permission is missing")
      : on
        ? L(lang, `Escuchando ${apps.length} ${apps.length === 1 ? "app" : "apps"}`, `Listening to ${apps.length} ${apps.length === 1 ? "app" : "apps"}`)
        : L(lang, "Apagada por ti", "Turned off by you");

  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-notices">
      <div className="smp-in">
        <div className="manual-row aj-row smp-row" onClick={() => setOpen((o) => !o)}>
          <Wallet aria-hidden />
          <span className="manual-row-text">
            <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Billetera por notificaciones", "Wallet by notifications")}</h2><Hint topic="billetera-notificaciones" /></div>
            <span className="aj-sub">{sub}</span>
          </span>
          <ChevronDown className={open ? "is-open" : ""} aria-hidden />
        </div>
        {open ? (
          <div className="aj-body">
            <p className="aj-note">{L(lang,
              "Faro lee los avisos de pago de las apps que elijas aquí — Samsung Wallet, Google Wallet — y redacta un borrador en tu bandeja con el monto y el comercio. Nada se anota sin que lo revises en la mesa.",
              "Faro reads the payment notices of the apps you choose here — Samsung Wallet, Google Wallet — and drafts an entry in your tray with the amount and the store. Nothing is noted without your review at the table.")}</p>
            <p className="aj-note">{L(lang,
              "Los códigos de verificación se ignoran siempre: no se leen, no se guardan, no llegan a la bandeja. Ningún aviso sale de tu teléfono. Si apagas la escucha, deja de escuchar en el acto y lo ya anotado no se toca.",
              "Verification codes are always ignored: never read, never kept, never reaching the tray. No notice ever leaves your phone. If you turn listening off, it stops at once and what is already noted is untouched.")}</p>
            {canState && perm !== "granted" ? (
              <div className="aj-row-line">
                <span className="aj-sub">{L(lang, "Android concede este permiso en su propia pantalla, fuera de la app.", "Android grants this permission on its own screen, outside the app.")}</span>
                <button type="button" className="btn secondary" data-anchor="notices-perm" onClick={() => { try { bridge?.requestNotices?.(); } catch { /* ignore */ } }}>
                  {L(lang, "Abrir los ajustes del sistema", "Open the system settings")}
                </button>
              </div>
            ) : null}
            {!canState ? (
              <p className="aj-note">{L(lang, "Esta cáscara de la app todavía no trae el oyente: actualiza la app y la escucha aparece aquí.", "This app shell does not carry the listener yet: update the app and listening appears here.")}</p>
            ) : (
              <>
                <div role="switch" tabIndex={0} aria-checked={on} className="manual-row aj-row smp-row" data-anchor="notices-switch" onClick={flip}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
                  <span className="manual-row-text">
                    <span className="aj-title-line">{L(lang, "Escuchar los avisos de pago", "Listen to payment notices")}</span>
                    <span className="aj-sub">{on ? L(lang, "Encendida", "On") : L(lang, "Apagada", "Off")}</span>
                  </span>
                  <i className="smp-switch" aria-hidden><b /></i>
                </div>
                {canAdmin ? (
                  <div data-anchor="notices-apps">
                    <p className="aj-note">{L(lang, "Qué apps se escuchan — una lista cerrada, elegida por ti, nunca «todas»:", "Which apps are listened to — a closed list, chosen by you, never “all of them”:")}</p>
                    {NOTICE_SENDERS.map((s) => (
                      <label key={s.pkg} className="aj-check">
                        <input type="checkbox" checked={apps.includes(s.pkg)} onChange={() => toggleApp(s.pkg)} />
                        <span>{s.app}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="aj-note">{L(lang, `Apps escuchadas: ${NOTICE_SENDERS.filter((s) => apps.includes(s.pkg)).map((s) => s.app).join(" · ") || "—"}`, `Listened apps: ${NOTICE_SENDERS.filter((s) => apps.includes(s.pkg)).map((s) => s.app).join(" · ") || "—"}`)}</p>
                )}
                {canAdmin && rules.length ? (
                  <div data-anchor="notices-rules">
                    <p className="aj-note">{L(lang, "Formas que enseñaste que no son un movimiento — ya no producen borradores:", "Shapes you taught are not a movement — they no longer produce drafts:")}</p>
                    {rules.map((r) => (
                      <div key={r.key} className="aj-row-line">
                        <span className="aj-sub"><BellOff aria-hidden /> {r.app} · {r.label}</span>
                        <button type="button" className="btn ghost" onClick={() => commit((s) => forgetNoticeRule(s, r.key), L(lang, "Forma olvidada", "Shape forgotten"))}>
                          {L(lang, "Olvidar", "Forget")}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
