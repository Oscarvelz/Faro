import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { inAndroidApp, native } from "@/spa/native";
import "./sample-mode.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * Ajustes → Avisos (1.3.148). Until this row existed there was no notification switch anywhere:
 * the only gate was the one-shot Android permission prompt, and the web got nothing, silently.
 * The row says the truth on every platform: on the web, notifications simply do not exist; in the
 * app, the switch is the user's own preference (settings.notify, carried in the widget snapshot to
 * FaroNotify) and the line under it reports the phone's real permission — read through the bridge,
 * never guessed. An older shell without the bridge methods still gets the switch, with a sub-line
 * that says the app asks the permission itself.
 */
export function NotifyRow() {
  const { lang, session, commit } = useFaro();
  const prefOn = session ? session.ledger.settings.notify !== false : true;
  const bridge = native();
  const canState = !!bridge?.notifyState;
  const [perm, setPerm] = useState<string | null>(() => {
    try { return bridge?.notifyState?.() ?? null; } catch { return null; }
  });
  // The answer can change outside the app (the system prompt, the phone's settings): re-read on return.
  useEffect(() => {
    if (!canState) return;
    const reread = () => { try { setPerm(bridge?.notifyState?.() ?? null); } catch { /* ignore */ } };
    const onVis = () => { if (document.visibilityState === "visible") reread(); };
    window.addEventListener("focus", reread);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", reread); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canState]);

  const flip = () => {
    commit((s) => ({ ...s, settings: { ...s.settings, notify: !prefOn } }),
      L(lang, prefOn ? "Avisos apagados" : "Avisos encendidos", prefOn ? "Notifications off" : "Notifications on"));
  };

  if (!inAndroidApp()) {
    return (
      <section className="card manual-card aj-card smp-card" data-anchor="aj-notify">
        <div className="smp-in">
          <div className="manual-row aj-row smp-row">
            <BellOff aria-hidden />
            <span className="manual-row-text">
              <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Avisos", "Notifications")}</h2><Hint topic="avisos-app" /></div>
              <span className="aj-sub">{L(lang, "Solo con la app de Android", "Only with the Android app")}</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  const sub = !canState
    ? L(lang, "El permiso lo pide la app misma", "The app itself asks for permission")
    : perm === "denied"
      ? L(lang, "El teléfono no los permite todavía", "The phone does not allow them yet")
      : prefOn
        ? L(lang, "Activados: vencimientos, ritmo y cierre", "On: due dates, pace and month-end")
        : L(lang, "Apagados por ti", "Turned off by you");
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-notify">
      <div className="smp-in">
        <div role="switch" tabIndex={0} aria-checked={prefOn} className="manual-row aj-row smp-row" onClick={flip}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
          <Bell aria-hidden />
          <span className="manual-row-text">
            <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Avisos", "Notifications")}</h2><Hint topic="avisos-app" /></div>
            <span className="aj-sub">{sub}</span>
          </span>
          <i className="smp-switch" aria-hidden><b /></i>
        </div>
        {canState && perm === "denied" ? (
          <div className="smp-acts">
            <button type="button" className="btn ghost smp-act" onClick={() => { try { bridge?.requestNotify?.(); } catch { /* ignore */ } }}>
              <Bell aria-hidden />{L(lang, "Pedir permiso", "Ask permission")}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
