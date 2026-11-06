/**
 * Faro for Android widgets (1.3.121), the web half. Mounted only inside the Android app (inAndroidApp()); in a browser
 * or the installed PWA nothing here runs and nothing shows.
 * - Feeds the widgets: a privacy-safe snapshot (lib/faro/widget.ts) goes to FaroNative.setWidgetData whenever the
 *   ledger changes (debounced), when Faro opens, when it goes to the background, and when "Widget: ocultar montos" or
 *   the fingerprint lock changes. Sample mode never feeds them (the widget keeps the real books).
 * - Answers widget taps: the app keeps the target of the tap (Central, Pagos, a book, + / −) and the page takes it
 *   once it is open and unlocked, then goes there the same way the manual's "Ir allí" does.
 */
import { useEffect, useRef, useState } from "react";
import { EyeOff } from "lucide-react";
import { useFaroRoot } from "./provider";
import { Hint } from "./hint";
import { preferOweTab } from "./debts";
import { native } from "@/spa/native";
import { lastUser } from "@/spa/cloud";
import { lockCredential } from "@/spa/lock";
import { sampleOn } from "@/lib/faro/samplemode";
import { todayIso } from "@/lib/faro/loans";
import { buildWidgetSnapshot, widgetHide, WIDGET_HIDE_KEY, type WidgetGo } from "@/lib/faro/widget";
import type { GoLike } from "@/lib/manual/places";
import "./sample-mode.css";

export const WIDGET_REFRESH = "faro-widget-refresh";

function hidePref(): string | null {
  try { return localStorage.getItem(WIDGET_HIDE_KEY); } catch { return null; }
}
function lockOn(): boolean {
  const u = lastUser();
  return !!u && !!lockCredential(u.id);
}

export const WIDGET_PLACES: Record<WidgetGo, GoLike> = {
  desk: { screen: "desk" },
  pagos: { screen: "desk", lens: "debt" },
  cobros: { screen: "cobros" },
  "add-in": { screen: "desk" },
  "add-out": { screen: "desk" },
  tools: { screen: "tools" },
  stats: { screen: "stats" },
  income: { screen: "income" },
  fixed: { screen: "fixed" },
  variable: { screen: "variable" },
  shops: { screen: "shops" },
  subs: { screen: "subs" },
  "vault-save": { screen: "vault-save" },
  "vault-meta": { screen: "vault-meta" },
  "vault-retiro": { screen: "vault-retiro" },
  "vault-emergencia": { screen: "vault-emergencia" },
  "vault-owed": { screen: "vault-owed" },
  "vault-owe": { screen: "vault-owe" },
  "vault-loans": { screen: "vault-owe" },
};

/** Press Central's + or − once it is on screen (the same tap a finger makes: its list opens). */
function pressCorner(anchor: "desk-plus" | "desk-minus") {
  const t0 = Date.now();
  const step = () => {
    const b = Array.from(document.querySelectorAll<HTMLButtonElement>(`[data-anchor="${anchor}"]`)).find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest("[inert]");
    });
    if (b) { b.click(); return; }
    if (Date.now() - t0 < 4000) window.setTimeout(step, 90);
  };
  window.setTimeout(step, 160);
}

export default function WidgetHost() {
  const { session, lang, goTopic } = useFaroRoot();
  const ledger = session?.ledger ?? null;
  const live = useRef({ ledger, lang });
  live.current = { ledger, lang };
  const had = useRef(false);

  // Feed the widgets.
  useEffect(() => {
    const n = native();
    if (!n?.setWidgetData) return;
    const push = () => {
      const { ledger: l, lang: lg } = live.current;
      if (sampleOn()) return;
      if (!l) {
        // Signed out on this device: the widgets go back to "Abre Faro una vez".
        if (had.current) { try { n.setWidgetData?.(""); } catch { /* ignore */ } had.current = false; }
        return;
      }
      try {
        const lock = lockOn();
        const snap = buildWidgetSnapshot(l, lg, { today: todayIso(), hide: widgetHide(hidePref(), lock), lock });
        n.setWidgetData?.(JSON.stringify(snap));
        had.current = true;
      } catch { /* a widget never breaks the app */ }
    };
    const timer = window.setTimeout(push, 700);
    const now = () => { window.clearTimeout(timer); push(); };
    const onVis = () => { if (document.visibilityState === "hidden") now(); };
    window.addEventListener(WIDGET_REFRESH, now);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(WIDGET_REFRESH, now);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ledger, lang]);

  // Taps on the widget.
  const hasSession = !!session;
  useEffect(() => {
    const n = native();
    if (!n?.takeOpen || !hasSession) return;
    const take = () => {
      let go = "";
      try { go = n.takeOpen?.() ?? ""; } catch { go = ""; }
      const place = (WIDGET_PLACES as Record<string, GoLike>)[go];
      if (!place) return;
      if (go === "vault-loans") preferOweTab("loans");
      else if (go === "vault-owe") preferOweTab("dues");
      goTopic("widget", place);
      if (go === "add-in") pressCorner("desk-plus");
      if (go === "add-out") pressCorner("desk-minus");
    };
    take();
    window.addEventListener("faronative-open", take);
    return () => window.removeEventListener("faronative-open", take);
  }, [hasSession, goTopic]);

  return null;
}

/** Ajustes → "Widget: ocultar montos" (only inside the Android app). The same row and switch as Datos de ejemplo. */
export function WidgetRow() {
  const { lang } = useFaroRoot();
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [pref, setPref] = useState<string | null>(hidePref);
  const on = widgetHide(pref, lockOn());
  const flip = () => {
    const next = on ? "0" : "1";
    try { localStorage.setItem(WIDGET_HIDE_KEY, next); } catch { /* ignore */ }
    setPref(next);
    window.dispatchEvent(new Event(WIDGET_REFRESH));
  };
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-widget">
      <div className="smp-in">
        <div role="switch" tabIndex={0} aria-checked={on} className="manual-row aj-row smp-row" onClick={flip}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
          <EyeOff aria-hidden />
          <span className="manual-row-text">
            <div className="fold-title aj-title"><h2 className="serif">{L("Widget: ocultar montos", "Widget: hide amounts")}</h2><Hint topic="widget-android" /></div>
            <span className="aj-sub">{on ? L("Puntos en la pantalla de inicio", "Dots on the home screen") : L("Montos a la vista en el widget", "Amounts shown on the widget")}</span>
          </span>
          <i className="smp-switch" aria-hidden><b /></i>
        </div>
      </div>
    </section>
  );
}
