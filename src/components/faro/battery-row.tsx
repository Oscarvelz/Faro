import { useEffect, useState } from "react";
import { Battery, BatteryCharging, BatteryWarning } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { inAndroidApp, nativeBattAsk, nativeBattExempt } from "@/spa/native";
import "./sample-mode.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

/**
 * Ajustes → Protegida de la batería (1.3.150). Faro's alerts ride one inexact midnight alarm; with the
 * phone's battery optimisation on, Doze (and Samsung's sleeping apps) can defer or skip it, and a reboot
 * used to erase it until the next snapshot (the shell's BootReceiver now re-arms it). This card says the
 * phone's real state — read through the bridge, never guessed — and asks for the exemption with one tap.
 * On the web there is nothing to exempt: the card says it only works with the Android app, like Avisos.
 * A shell older than this one has no battery methods: the card announces the app update instead of
 * showing a control that cannot work.
 */
export function BatteryRow() {
  const { lang } = useFaro();
  const [exempt, setExempt] = useState<boolean | null>(() => nativeBattExempt());
  const [asked, setAsked] = useState(false);
  // The answer can change outside the app (the system dialog, the phone's settings): re-read on return.
  useEffect(() => {
    const reread = () => setExempt(nativeBattExempt());
    const onVis = () => { if (document.visibilityState === "visible") reread(); };
    window.addEventListener("focus", reread);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", reread); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const ask = () => {
    const after = nativeBattAsk();
    setExempt(after);
    if (after !== true) setAsked(true);
  };

  const title = (
    <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Protegida de la batería", "Safe from battery saving")}</h2><Hint topic="bateria-app" /></div>
  );

  if (!inAndroidApp()) {
    return (
      <section className="card manual-card aj-card smp-card" data-anchor="aj-battery">
        <div className="smp-in">
          <div className="manual-row aj-row smp-row">
            <Battery aria-hidden />
            <span className="manual-row-text">
              {title}
              <span className="aj-sub">{L(lang, "Solo con la app de Android", "Only with the Android app")}</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (exempt === null) {
    return (
      <section className="card manual-card aj-card smp-card" data-anchor="aj-battery">
        <div className="smp-in">
          <div className="manual-row aj-row smp-row">
            <Battery aria-hidden />
            <span className="manual-row-text">
              {title}
              <span className="aj-sub">{L(lang, "Llega con la actualización de la app", "Arrives with the app update")}</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-battery">
      <div className="smp-in">
        <div className="manual-row aj-row smp-row">
          {exempt ? <BatteryCharging aria-hidden /> : <BatteryWarning aria-hidden />}
          <span className="manual-row-text">
            {title}
            <span className="aj-sub">{exempt
              ? L(lang, "Llegan aunque no la abras", "They arrive even if you don't open it")
              : L(lang, "Puede frenar los avisos", "Battery saving can delay alerts")}</span>
          </span>
        </div>
        {!exempt ? (
          <div className="smp-acts">
            <button type="button" className="btn ghost smp-act" onClick={ask}>
              <BatteryCharging aria-hidden />{L(lang, "Proteger Faro", "Protect Faro")}
            </button>
          </div>
        ) : null}
        {!exempt && asked ? (
          <span className="aj-sub batt-note">{L(lang,
            "Si no apareció ningún diálogo, hazlo a mano: Ajustes → Apps → Faro → Batería → Sin restricciones.",
            "If no dialog appeared, do it by hand: Settings → Apps → Faro → Battery → Unrestricted.")}</span>
        ) : null}
      </div>
    </section>
  );
}
