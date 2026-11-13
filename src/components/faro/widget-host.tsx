/**
 * Faro for Android widgets (1.3.121), the web half. Mounted only inside the Android app (inAndroidApp()); in a browser
 * or the installed PWA nothing here runs and nothing shows.
 * - Feeds the widgets: a privacy-safe snapshot (lib/faro/widget.ts) goes to FaroNative.setWidgetData whenever the
 *   ledger changes (debounced), when Faro opens, when it goes to the background, and when "Widget → Ocultar montos" or
 *   the fingerprint lock changes. Sample mode never feeds them (the widget keeps the real books).
 *   1.3.235: the feed ALSO pushes on every foreground (visible again / the shell's onResume signal / focus),
 *   whether or not anything changed — a session that merely resumes the page can no longer leave the
 *   widgets carrying a photo from before the quick-note homes existed (Oscar's second test: the card
 *   still showed the stale line after the app had been opened, because that open changed nothing and,
 *   being a sample session, pushed nothing at all).
 *   1.3.237: the photo now ALWAYS describes the real book — in a sample session the feed computes it
 *   from the real book's saved pack, read through the personal channel (samplemode's personalGet:
 *   reading never writes, the pack stays byte-identical and no sample datum ever enters the photo —
 *   what is photographed is the real book itself). Oscar's law, from his third test: a surface that
 *   needs the app opened in the right mode to complete itself is pointless — after ANY single app
 *   run of any kind, the widgets carry the real photo, homes included.
 * - Answers widget taps: the app keeps the target of the tap (Central, Pagos, a book, + / −) and the page takes it
 *   once it is open and unlocked, then goes there the same way the manual's "Ir allí" does.
 */
import { useEffect, useRef, useState } from "react";
import { EyeOff, Pin } from "lucide-react";
import { useFaro, useFaroRoot } from "./provider";
import { Hint } from "./hint";
import { preferOweTab } from "./debts";
import { inAndroidApp, native } from "@/spa/native";
import { lastUser } from "@/spa/cloud";
import { lockCredential } from "@/spa/lock";
import { personalGet, sampleOn } from "@/lib/faro/samplemode";
import { packKeyOf, packLedgerOk } from "@/lib/faro/packguard";
import type { LedgerState, WidgetPin } from "@/lib/faro/types";
import { todayIso } from "@/lib/faro/loans";
import { buildWidgetSnapshot, widgetHide, WIDGET_HIDE_KEY, type WidgetGo } from "@/lib/faro/widget";
import { ingestQuick, parseQuickEntries, pinSigns, toggleWidgetPin, type QuickEntry } from "@/lib/faro/quickadd";
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
  const { session, lang, goTopic, commit, userId } = useFaroRoot();
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
      if (sampleOn()) {
        // 1.3.237: con el ejemplo en pantalla, la foto se calcula del libro REAL guardado —
        // el mismo pack que el proveedor lee al arrancar en modo real — y se empuja igual.
        // El ejemplo no se fotografía jamás (su almacén es otro) y su sesión no escribe
        // nada personal: personalGet solo lee. Sin pack real válido (el libro real nunca
        // se guardó en este aparato) no hay foto que renovar: la que haya queda como está.
        try {
          const raw = personalGet(packKeyOf(userId));
          if (!raw || !packLedgerOk(raw)) return;
          const real = (JSON.parse(raw) as { ledger: LedgerState }).ledger;
          const lock = lockOn();
          const snap = buildWidgetSnapshot(real, real.settings.lang === "en" ? "en" : "es", {
            today: todayIso(), hide: widgetHide(personalGet(WIDGET_HIDE_KEY), lock), lock,
          });
          n.setWidgetData?.(JSON.stringify(snap));
          had.current = true;
        } catch { /* la foto queda como está */ }
        return;
      }
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
    // Leaving pushes (the photo is fresh when the launcher comes back) and so does every
    // foreground (1.3.235): a no-change resume refreshes the photo too, homes included.
    const onVis = () => { if (document.visibilityState === "hidden" || document.visibilityState === "visible") now(); };
    window.addEventListener(WIDGET_REFRESH, now);
    window.addEventListener("faronative-resume", now);
    window.addEventListener("focus", now);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(WIDGET_REFRESH, now);
      window.removeEventListener("faronative-resume", now);
      window.removeEventListener("focus", now);
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

  // Apuntes rápidos del widget (línea de ventanas, 2026-11-12): los + / − ya no abren la app —
  // el shell guarda cada apunte en su cola y aquí se archivan en el libro por el camino normal
  // (commit, con Deshacer y sincronía). En modo de ejemplo NO se recoge: la cola espera al libro
  // real, como la foto del widget. Recoger es idempotente (el id del apunte es el de la línea).
  useEffect(() => {
    const n = native();
    if (!n?.takeQuickEntries || !hasSession) return;
    const file = (raw: string): QuickEntry[] => {
      const entries = parseQuickEntries(raw);
      if (!entries.length) return entries;
      commit((s) => ingestQuick(s, entries, lang), lang === "en" ? "Widget quick entry" : "Apunte rápido del widget");
      return entries;
    };
    const drain = () => {
      if (sampleOn()) return;
      try {
        if (n.peekQuickEntries && n.ackQuickEntries) {
          // Entrega en dos fases (1.3.234): se mira la cola SIN vaciarla, se archiva en el
          // libro y solo entonces el shell retira los ids archivados. Si la página muere
          // entre la lectura y el archivo, los apuntes siguen en la cola y se recogen a la
          // próxima (recoger dos veces no duplica: el id del apunte es el de la línea).
          // Lo que el parseo descarta por mal formado NUNCA se confirma: no se pierde.
          const filed = file(n.peekQuickEntries() ?? "");
          if (filed.length) n.ackQuickEntries(JSON.stringify(filed.map((e) => e.id)));
        } else {
          // Shelles anteriores a 1.3.234: la recogida de siempre, en una sola vez.
          file(n.takeQuickEntries?.() ?? "");
        }
      } catch { /* la cola espera a la próxima recogida */ }
    };
    drain();
    const onVis = () => { if (document.visibilityState === "visible") drain(); };
    window.addEventListener("faronative-open", drain);
    // 1.3.234: el shell avisa al volver a la app (onResume) — la recogida ya no depende solo
    // de que el WebView surfacee foco/visibilidad al resumir una página que nunca se recargó.
    window.addEventListener("faronative-resume", drain);
    window.addEventListener("focus", drain);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("faronative-open", drain);
      window.removeEventListener("faronative-resume", drain);
      window.removeEventListener("focus", drain);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hasSession, commit, lang]);

  return null;
}

/**
 * Ajustes → «Widget» (1.3.250; Oscar, 2026-11-13 16:36 EST): UNA sola tarjeta con las
 * dos ventanas del widget juntas — antes eran dos tarjetas sueltas («Widget: ocultar
 * montos» y «Categorías fijas del widget»). Dentro, en el orden en que ya se apilaban:
 * primero el interruptor de ocultar montos (dato local del equipo, solo dentro de la
 * app Android — fuera de ella la sección simplemente no se pinta, como siempre) y
 * debajo la gestión de las fijas (dato del libro, por el camino normal de commit).
 * Ningún control cambia de comportamiento ni de almacén; lo que cambia es la casa.
 *
 * Las fijas NACEN en Estructura (el editor de cada categoría/sub las prepara y Guardar
 * las confirma); aquí se ven todas — con el signo que sus recibos les derivan — y se
 * desfijan (desfijar no borra nada: la categoría y su dinero quedan intactos, y su
 * asiento de hábito puede volver solo). Sin fijas, la sección dice dónde nacen: lo que
 * no se anuncia no existe (su principio del usuario frío).
 *
 * La cara de la sección de fijas (su orden, foto 234809): el título de 1.3.246,
 * «CATEGORÍAS FIJAS DEL WIDGET», se salía por el borde derecho de la tarjeta en la
 * letra de exhibición de los temas — la T final quedaba cortada contra el marco. La
 * palabra se adapta, el diseño no se estira: dentro de una tarjeta que ya se llama
 * «Widget», el encabezado de sección dice «Categorías fijadas» / "Pinned categories",
 * en el registro de sección (un paso bajo el título de la tarjeta), y cabe con margen
 * en ambos idiomas al ancho del teléfono.
 */
export function WidgetCard() {
  const { t, session, commit, names } = useFaro();
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
  const android = inAndroidApp();
  const ledger = session?.ledger ?? null;
  if (!android && !ledger) return null;
  const pins = ledger?.settings.widgetPins ?? [];
  const label = (p: WidgetPin) => (p.s ? `${names.cat(p.c)} · ${names.sub(p.s)}` : names.cat(p.c)) || p.c;
  const signWord = (p: WidgetPin) => {
    if (!ledger) return "";
    const signs = pinSigns(ledger, p);
    return signs.length === 2 ? t("widget.pin.signboth") : signs[0] === "in" ? t("widget.pin.signin") : t("widget.pin.signout");
  };
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-widget">
      <div className="smp-in">
        <div className="fold-title aj-title wcard-head"><h2 className="serif">Widget</h2></div>
        {android ? (
          <div role="switch" tabIndex={0} aria-checked={on} className="manual-row aj-row smp-row" onClick={flip}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}>
            <EyeOff aria-hidden />
            <span className="manual-row-text">
              <div className="fold-title aj-title"><strong>{L("Ocultar montos", "Hide amounts")}</strong><Hint topic="widget-android" /></div>
              <span className="aj-sub">{on ? L("Puntos en la pantalla de inicio", "Dots on the home screen") : L("Montos a la vista en el widget", "Amounts shown on the widget")}</span>
            </span>
            <i className="smp-switch" aria-hidden><b /></i>
          </div>
        ) : null}
        {ledger ? (
          <>
            <div className="wpin-sec">
              <div className="fold-title aj-title"><h2 className="serif wpin-h">{t("settings.widgetpins")}</h2></div>
              <span className="aj-sub">{t("settings.widgetpins.sub")}</span>
            </div>
            {pins.length ? pins.map((p) => (
              <div key={`${p.c}|${p.s}`} className="manual-row aj-row smp-row">
                <Pin aria-hidden />
                <span className="manual-row-text">
                  <strong>{label(p)}</strong>
                  <span>{signWord(p)}</span>
                </span>
                <button type="button" className="btn ghost" onClick={() => commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleWidgetPin(s.settings.widgetPins, p.c, p.s) } }), label(p))}>{t("widget.pin.remove")}</button>
              </div>
            )) : <span className="aj-sub wpin-empty">{t("settings.widgetpins.empty")}</span>}
          </>
        ) : null}
      </div>
    </section>
  );
}
