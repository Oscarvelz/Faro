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
 *   1.3.258: every push leaves a trace — its outcome (which branch, whether the photo was sent or
 *   why not, when) is recorded device-locally (faro-widget-lastpush, written through the raw
 *   channel so sample mode cannot hide it in its own namespace) and the Ajustes «Widget» card
 *   reads it back in one muted line. Until this version every outcome was swallowed, and a stale
 *   photo could not be diagnosed from outside (the faro-pinsdiag-257 study).
 * - Answers widget taps: the app keeps the target of the tap (Central, Pagos, a book, + / −) and the page takes it
 *   once it is open and unlocked, then goes there the same way the manual's "Ir allí" does.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, EyeOff, LayoutGrid, Pin, Search, X } from "lucide-react";
import { useFaro, useFaroRoot } from "./provider";
import { FoldShell } from "./screens";
import { Hint } from "./hint";
import { preferOweTab } from "./debts";
import { inAndroidApp, native } from "@/spa/native";
import { lastUser } from "@/spa/cloud";
import { lockCredential } from "@/spa/lock";
import { personalGet, personalSet, sampleOn } from "@/lib/faro/samplemode";
import { packKeyOf, packLedgerOk } from "@/lib/faro/packguard";
import type { LedgerState, WidgetPin } from "@/lib/faro/types";
import { todayIso } from "@/lib/faro/loans";
import { buildWidgetSnapshot, parseWidgetPushRecord, widgetHide, WIDGET_HIDE_KEY, WIDGET_LASTPUSH_KEY, type WidgetGo, type WidgetPushRecord } from "@/lib/faro/widget";
import { hasStorePin, hasWidgetPin, ingestQuick, parseQuickEntries, pinGroups, searchPinCandidates, toggleStorePin, toggleWidgetPin, type PinCandidate, type QuickEntry } from "@/lib/faro/quickadd";
import { BrandMark, Glyph } from "./icons";
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

/**
 * 1.3.258: el parte del empujón — cada push deja su resultado en la llave del
 * equipo (canal crudo: legible en los dos modos, porque un empujón de la rama de
 * ejemplo fotografía el libro real y su parte importa también fuera del ejemplo).
 * Registrar nunca rompe nada: si hasta escribir el parte falla, la foto manda.
 */
function recordPush(rec: Omit<WidgetPushRecord, "at">) {
  try { personalSet(WIDGET_LASTPUSH_KEY, JSON.stringify({ ...rec, at: new Date().toISOString() })); } catch { /* el parte nunca rompe la foto */ }
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
        // 1.3.258: cada salida de esta rama deja su parte (recordPush) — hasta hoy la
        // vuelta temprana era muda y una foto vieja no se podía diagnosticar.
        try {
          const raw = personalGet(packKeyOf(userId));
          if (!raw) { recordPush({ branch: "sample", sent: false, why: "nopack" }); return; }
          if (!packLedgerOk(raw)) { recordPush({ branch: "sample", sent: false, why: "pack" }); return; }
          const real = (JSON.parse(raw) as { ledger: LedgerState }).ledger;
          const lock = lockOn();
          const snap = buildWidgetSnapshot(real, real.settings.lang === "en" ? "en" : "es", {
            today: todayIso(), hide: widgetHide(personalGet(WIDGET_HIDE_KEY), lock), lock,
          });
          n.setWidgetData?.(JSON.stringify(snap));
          recordPush({ branch: "sample", sent: true });
          had.current = true;
        } catch { recordPush({ branch: "sample", sent: false, why: "error" }); /* la foto queda como está */ }
        return;
      }
      if (!l) {
        // Signed out on this device: the widgets go back to "Abre Faro una vez".
        // 1.3.258: el vaciado también es un envío y deja su parte; sin nada que
        // vaciar no pasó nada que contar y el último parte queda como está.
        if (had.current) {
          try { n.setWidgetData?.(""); recordPush({ branch: "out", sent: true }); }
          catch { recordPush({ branch: "out", sent: false, why: "error" }); /* ignore */ }
          had.current = false;
        }
        return;
      }
      try {
        const lock = lockOn();
        const snap = buildWidgetSnapshot(l, lg, { today: todayIso(), hide: widgetHide(hidePref(), lock), lock });
        n.setWidgetData?.(JSON.stringify(snap));
        recordPush({ branch: "real", sent: true });
        had.current = true;
      } catch { recordPush({ branch: "real", sent: false, why: "error" }); /* a widget never breaks the app */ }
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
 * 1.3.251: la lista crece con la segunda familia — las piezas de Tiendas e IA
 * fijadas en el catálogo cuelgan de la misma sección, con la marca de su pieza y
 * su Desfijar, y el encabezado se acorta a «Fijadas» / "Pinned" para seguir
 * diciendo la verdad sobre las dos familias sin crecer un milímetro.
 * 1.3.253 (Oscar, 2026-11-13 18:38 EST): «Sigue la lógica de ajustes. Que se
 * pliegue por favor, así está abierta completamente.» La tarjeta se pliega
 * como las demás de Ajustes: entra en el acordeón compartido de la pantalla
 * (openFold, id «widget» — nace plegada en cada visita, como sus vecinas, y
 * abrir otra la pliega) con su misma fila de cabecera (manual-row fold-btn
 * aj-row, aria-expanded, chevron fold-chev) y el contenido montado solo al
 * abrir, en el mismo <div className="mt-3"> del componente Fold de la casa.
 * El salto del Manual (tema widget-android, fold: "widget") la abre por el
 * faro-open de siempre, igual que Idioma o Copias. Nada de su contenido
 * cambia: el interruptor y las fijas viven dentro del pliegue, en su orden.
 * 1.3.258: dos líneas nuevas al pie de ese orden — con el ejemplo activo, una
 * nota dice que la lista de fijas que se está leyendo es la del libro de
 * ejemplo (la foto del widget enseña el real: una fija del ejemplo no llega
 * nunca a la tarjeta); y la línea del último empujón (el parte que WidgetHost
 * registra en el equipo) cierra la tarjeta dentro de la app Android. Y la
 * cabecera gana su subtítulo de una línea («Tu pantalla de inicio: montos y
 * fijas»), en el hueco de las vecinas — orden suya del mismo día (foto
 * 235299) que sustituye la decisión de 1.3.253 de dejarla sin subtítulo.
 * 1.3.259: desactivar «Ocultar montos» pide confirmación (la ventana de la
 * casa explica que los montos vuelven a la vista en la pantalla de inicio);
 * la escritura de la pref vive dentro del run de la ventana.
 * 1.3.260: Desfijar pide la misma ventana antes de escribir (askUnpin): la
 * explicación de qué se quita y el commit de siempre dentro de su run.
 * 1.3.267 (Oscar, 2026-11-14): la sección de fijas se hace su propio
 * componente (WidgetPinsSection, bajo esta tarjeta) y gana el tercer
 * asiento — su buscador — y la organización por signo que él pidió el
 * mismo día: dos grupos plegables, «Ingreso» y «Gasto», con las filas a
 * una sola línea (el signo lo dice el grupo; la segunda línea de la fila
 * se retira). El estado de la sección (la búsqueda, los pliegues de los
 * grupos) nace y muere con el pliegue de la tarjeta, como su contenido.
 */
export function WidgetCard({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { t, session, confirm } = useFaro();
  const { lang } = useFaroRoot();
  const L = (es: string, en: string) => (lang === "en" ? en : es);
  const [pref, setPref] = useState<string | null>(hidePref);
  const on = widgetHide(pref, lockOn());
  const applyFlip = () => {
    const next = on ? "0" : "1";
    try { localStorage.setItem(WIDGET_HIDE_KEY, next); } catch { /* ignore */ }
    setPref(next);
    window.dispatchEvent(new Event(WIDGET_REFRESH));
  };
  // 1.3.259 (Oscar, 2026-11-13): «no queremos problemas o errores» — DESACTIVAR
  // «Ocultar montos» pide confirmación primero, con la ventana de la casa: apagar
  // este interruptor es MOSTRAR el dinero en la pantalla de inicio, y eso se
  // explica antes de hacerlo. La pref no se escribe hasta que la ventana
  // confirma (vive dentro de su run, por el camino de siempre); ocultar de
  // nuevo —más privacidad— sigue siendo el toque desnudo de antes.
  const flip = () => {
    if (!on) { applyFlip(); return; }
    confirm({
      title: L("Mostrar montos en el widget", "Show amounts on the widget"),
      body: L(
        "Los montos vuelven a verse en tu pantalla de inicio, a la vista de quien mire tu teléfono. Puedes volver a ocultarlos cuando quieras, aquí mismo.",
        "Your amounts will show on your home screen again, visible to anyone who looks at your phone. You can hide them again any time, right here."),
      yes: L("Mostrar", "Show"),
      run: applyFlip,
    });
  };
  const android = inAndroidApp();
  const ledger = session?.ledger ?? null;
  if (!android && !ledger) return null;
  // 1.3.258: el parte del último empujón, en una línea muda al pie de la tarjeta —
  // solo dentro de la app Android (fuera no hay widget que fotografiar) y solo si
  // el equipo guarda un parte: así un «la foto no se actualizó» se diagnostica solo.
  const pushRec = android ? parseWidgetPushRecord(personalGet(WIDGET_LASTPUSH_KEY)) : null;
  const pushLine = !pushRec ? null : !pushRec.sent
    ? t(pushRec.why === "pack" ? "widget.push.fail.pack" : pushRec.why === "nopack" ? "widget.push.fail.nopack" : "widget.push.fail.error")
    : (() => {
        const mins = Math.max(0, Math.floor((Date.now() - Date.parse(pushRec.at)) / 60000));
        const when = mins < 1 ? t("widget.push.now")
          : mins < 60 ? t("widget.push.min").replace("{n}", String(mins))
          : mins < 1440 ? t("widget.push.hour").replace("{n}", String(Math.floor(mins / 60)))
          : t("widget.push.day").replace("{n}", String(Math.floor(mins / 1440)));
        return `${t("widget.push.sent")} ${when}`;
      })();
  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-widget" data-fold="widget">
      <div role="button" tabIndex={0} className="manual-row fold-btn aj-row" aria-expanded={open} onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}>
        <LayoutGrid aria-hidden />
        <span className="manual-row-text">
          <div className="fold-title aj-title"><h2 className="serif">Widget</h2></div>
          {/* 1.3.258 (Oscar, 2026-11-13 21:56 EST, foto 235299): «debajo de Widget le
              hacen falta las letras, como en todos los ajustes» — la cabecera gana su
              subtítulo de una línea en el mismo hueco de las vecinas (Manual de uso:
              «Cada función, explicada»), diciendo lo que la tarjeta guarda: el
              interruptor de montos y la lista de fijas. SU PALABRA SUSTITUYE la
              decisión declarada de 1.3.253, que la dejó sin subtítulo a propósito. */}
          <span className="aj-sub">{L("Tu pantalla de inicio: montos y fijas", "Your home screen: amounts and pins")}</span>
        </span>
        <ChevronDown className={open ? "fold-chev is-open" : "fold-chev"} />
      </div>
      {open ? (
        <div className="mt-3">
          <div className="smp-in">
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
            {ledger ? <WidgetPinsSection /> : null}
            {pushLine ? <span className="wpush-line">{pushLine}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * Un grupo de signo de la sección de fijas (1.3.267): su cabecera es un
 * botón con el chevrones de pliegue de la casa y su cuerpo cuelga de
 * FoldShell — el mismo pliegue interior que los grupos de Estructura y las
 * puertas del Catálogo (la gramática de la 1.3.231), no el acordeón de
 * tarjetas de Ajustes. Nace abierto — «fácil de identificar, rápido de
 * accionar» — y su estado vive en la sesión de la tarjeta: ni se guarda ni
 * sobrevive al pliegue de la tarjeta, como el resto de su contenido.
 */
function PinGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="wpin-group">
      <button type="button" className="wpin-group-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} aria-hidden />
        <span className="wpin-group-name">{title}</span>
      </button>
      <FoldShell open={open}>{children}</FoldShell>
    </div>
  );
}

/**
 * La sección de fijas de la tarjeta «Widget» (componente propio desde
 * 1.3.267 para que su estado — la búsqueda y los pliegues de los grupos —
 * nazca y muera con el pliegue de la tarjeta, que solo monta su contenido
 * al abrir). Dos órdenes de Oscar del 2026-11-14 viven aquí:
 *  · el tercer asiento de las fijas: un buscador sobre la Estructura viva
 *    (categorías y subconceptos; desde 1.3.268 también las piezas del
 *    catálogo — Tiendas e IA — bajo «Gasto»: «Debe existir cualquier cosa
 *    que pueda preestablecerse»). Elegir un resultado abre la misma
 *    ventana de la 1.3.260 que los demás asientos — fijar y desfijar
 *    preguntan — y su run escribe por el toggleWidgetPin de siempre, con
 *    su refresco de la foto, como el asiento inmediato del catálogo.
 *  · la organización por signo: lo encontrado y lo fijado se leen bajo dos
 *    grupos plegables, «Ingreso» y «Gasto» — los sustantivos de la propia
 *    familia de las fijas (widget.pin.signin/signout) — y cada fila gasta
 *    UNA línea: el signo lo dice el grupo, así que la segunda línea de la
 *    fila (la palabra del signo bajo el nombre) se retira. El grupo se
 *    alimenta de pinGroups/pinSigns (quickadd): la derivación del sistema,
 *    la misma que decide en qué tarjeta de apuntes vive cada fija.
 */
function WidgetPinsSection() {
  const { t, session, commit, names, confirm } = useFaro();
  const { lang } = useFaroRoot();
  const [q, setQ] = useState("");
  const ledger = session?.ledger ?? null;
  if (!ledger) return null;
  const pins = ledger.settings.widgetPins ?? [];
  const label = (p: { c: string; s: string }) => (p.s ? `${names.cat(p.c)} · ${names.sub(p.s)}` : names.cat(p.c)) || p.c;
  // 1.3.260 (pedido de Oscar): Desfijar también pregunta — esta lista es un
  // asiento inmediato, así que la ventana de la casa llega antes de la
  // escritura: explica qué se quita (el nombre deja de salir en la tarjeta de
  // apuntes; nada se borra) y el commit de siempre vive solo dentro de su
  // run — cancelar deja la fija puesta. Con el ejemplo activo, el cuerpo suma
  // la verdad de la nota de la 1.3.258: la lista que se está leyendo es la del
  // libro de ejemplo, no la del real que el widget enseña.
  const askUnpin = (name: string, run: () => void) => confirm({
    title: t("widget.pin.ask.offTitle").replace("{name}", name),
    body: t("widget.pin.ask.offBody") + (sampleOn() ? " " + t("settings.widgetpins.sample") : ""),
    yes: t("widget.pin.remove"),
    run,
  });
  // La cara de una pieza fijada: su marca, como la pintan las tarjetas del catálogo
  // y las filas de Compras (la marca de fábrica si la trae; la de su id si es tienda;
  // su glifo para el resto).
  const storeMark = (id: string) => {
    const item = ledger.structure.catalog.find((c) => c.id === id);
    if (!item) return <Pin aria-hidden />;
    return item.icon.startsWith("brand:") ? <BrandMark id={item.icon.slice(6)} className="size-6" /> : item.kind === "store" ? <BrandMark id={item.id} className="size-6" /> : <Glyph name={item.icon} className="size-6" />;
  };
  // 1.3.267: el buscador fija y desfija por la misma ventana de la 1.3.260
  // que el catálogo usa en su asiento inmediato — el cuerpo de fijar es el de
  // las categorías y, con el ejemplo activo, suma la verdad del ejemplo de
  // los asientos de fijar (widget.pin.sample). La escritura es el
  // toggleWidgetPin de siempre dentro del run, con el refresco de la foto
  // que acompaña a los guardados inmediatos desde la 1.3.258; cancelar no
  // escribe nada.
  const askPin = (cand: PinCandidate) => {
    const name = label(cand);
    const pinned = hasWidgetPin(pins, cand.c, cand.s);
    confirm({
      title: t(pinned ? "widget.pin.ask.offTitle" : "widget.pin.ask.title").replace("{name}", name),
      body: t(pinned ? "widget.pin.ask.offBody" : "widget.pin.ask.body") + (sampleOn() ? " " + t("widget.pin.sample") : ""),
      yes: pinned ? t("widget.pin.remove") : t("widget.pin.ask.yes"),
      run: () => {
        commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleWidgetPin(s.settings.widgetPins, cand.c, cand.s) } }), name);
        window.dispatchEvent(new Event(WIDGET_REFRESH));
      },
    });
  };
  // 1.3.268: fijar y desfijar una pieza del catálogo desde el buscador pasa
  // por la MISMA ventana que su asiento del catálogo (1.3.260): el cuerpo de
  // las tiendas al fijar, el compartido al quitar, y con el ejemplo activo
  // la frase del ejemplo de los asientos de fijar. La escritura es el
  // toggleStorePin de siempre dentro del run, con su refresco de la foto;
  // cancelar no escribe nada.
  const askStorePin = (cand: PinCandidate) => {
    const id = cand.store as string;
    const name = names.catalog(id) || id;
    const pinned = hasStorePin(pins, id);
    confirm({
      title: t(pinned ? "widget.pin.ask.offTitle" : "widget.pin.ask.title").replace("{name}", name),
      body: t(pinned ? "widget.pin.ask.offBody" : "widget.pin.ask.storeBody") + (sampleOn() ? " " + t("widget.pin.sample") : ""),
      yes: pinned ? t("widget.pin.remove") : t("widget.pin.ask.yes"),
      run: () => {
        commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleStorePin(s.settings.widgetPins, id) } }), name);
        window.dispatchEvent(new Event(WIDGET_REFRESH));
      },
    });
  };
  const searching = q.trim().length > 0;
  const results = searching ? searchPinCandidates(ledger, q, lang) : { inn: [] as PinCandidate[], out: [] as PinCandidate[] };
  const groups = pinGroups(ledger);
  // La fila de una fija, a una línea (1.3.267): marca · nombre · Desfijar —
  // el signo lo lleva el grupo que la contiene, no la fila.
  const pinRow = (p: WidgetPin) => p.store ? (
    <div key={`store|${p.store}`} className="manual-row aj-row smp-row">
      {storeMark(p.store as string)}
      <span className="manual-row-text">
        <strong>{names.catalog(p.store as string) || p.store}</strong>
      </span>
      <button type="button" className="btn ghost" onClick={() => askUnpin(names.catalog(p.store as string) || (p.store as string), () => commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleStorePin(s.settings.widgetPins, p.store as string) } }), names.catalog(p.store as string)))}>{t("widget.pin.remove")}</button>
    </div>
  ) : (
    <div key={`${p.c}|${p.s}`} className="manual-row aj-row smp-row">
      <Pin aria-hidden />
      <span className="manual-row-text">
        <strong>{label(p)}</strong>
      </span>
      <button type="button" className="btn ghost" onClick={() => askUnpin(label(p), () => commit((s) => ({ ...s, settings: { ...s.settings, widgetPins: toggleWidgetPin(s.settings.widgetPins, p.c, p.s) } }), label(p)))}>{t("widget.pin.remove")}</button>
    </div>
  );
  // La fila de un resultado: la fila entera es el gesto (elegirla abre la
  // ventana); el ancla llena y la palabra «Fijada» anuncian la que ya está.
  const hitRow = (cand: PinCandidate) => {
    if (!cand.store) {
      const pinned = hasWidgetPin(pins, cand.c, cand.s);
      return (
        <button key={`${cand.c}|${cand.s}`} type="button" className="manual-row aj-row smp-row wpin-hit" onClick={() => askPin(cand)}>
          <Pin aria-hidden fill={pinned ? "currentColor" : "none"} />
          <span className="manual-row-text">
            <strong className={cand.hidden ? "is-muted" : undefined}>{label(cand)}</strong>
          </span>
          {pinned ? <span className="wpin-state">{t("widget.pin.state")}</span> : null}
        </button>
      );
    }
    // 1.3.268: la fila de una pieza del catálogo — su marca al principio (la
    // diferenciación de la 1.3.251) y la palabra «Fijada» cuando ya está,
    // como las de categoría anuncian la suya.
    const pinnedStore = hasStorePin(pins, cand.store);
    return (
      <button key={`store|${cand.store}`} type="button" className="manual-row aj-row smp-row wpin-hit" onClick={() => askStorePin(cand)}>
        {storeMark(cand.store)}
        <span className="manual-row-text">
          <strong className={cand.hidden ? "is-muted" : undefined}>{names.catalog(cand.store) || cand.store}</strong>
        </span>
        {pinnedStore ? <span className="wpin-state">{t("widget.pin.state")}</span> : null}
      </button>
    );
  };
  return (
    <>
      <div className="wpin-sec">
        <div className="fold-title aj-title"><h2 className="serif wpin-h">{t("settings.widgetpins")}</h2></div>
        <span className="aj-sub">{t("settings.widgetpins.sub")}</span>
      </div>
      {/* 1.3.258: con el ejemplo activo, esta lista lee el libro DE EJEMPLO —
          la línea lo dice en la misma tarjeta, porque la foto del widget
          enseña siempre el libro real (ley de 1.3.237) y una fija del
          ejemplo jamás llega a la tarjeta de apuntes. */}
      {sampleOn() ? <span className="aj-sub wpin-note">{t("settings.widgetpins.sample")}</span> : null}
      {/* 1.3.267: el buscador del tercer asiento — la pastilla de búsqueda de
          la casa (la del Historial), con su ✕ para limpiarla. Busca sobre la
          Estructura viva; los resultados cuelgan bajo el campo, agrupados
          por signo como la lista de fijadas. */}
      <label className="search-pill wpin-search">
        <Search className="size-4" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("settings.widgetpins.search")} aria-label={t("settings.widgetpins.search")} />
        {q ? <button type="button" className="wpin-x" aria-label={t("hist.clearFilters")} onClick={() => setQ("")}><X className="size-4" /></button> : null}
      </label>
      {searching ? (
        results.inn.length || results.out.length ? (
          <>
            {results.inn.length ? <PinGroup title={t("widget.pin.signin")}>{results.inn.map(hitRow)}</PinGroup> : null}
            {results.out.length ? <PinGroup title={t("widget.pin.signout")}>{results.out.map(hitRow)}</PinGroup> : null}
          </>
        ) : <span className="aj-sub wpin-empty">{t("settings.widgetpins.none")}</span>
      ) : null}
      {pins.length ? (
        <>
          {groups.inn.length ? <PinGroup title={t("widget.pin.signin")}>{groups.inn.map(pinRow)}</PinGroup> : null}
          {groups.out.length ? <PinGroup title={t("widget.pin.signout")}>{groups.out.map(pinRow)}</PinGroup> : null}
        </>
      ) : <span className="aj-sub wpin-empty">{t("settings.widgetpins.empty")}</span>}
      {/* 1.3.269 (steer de Oscar, 2026-11-14 09:05 EST): que el hecho no quede en
          silencio — las suscripciones no se fijan en ninguna parte (ninguna línea
          del libro guarda su id: su fija no tendría archivo honesto) y la sección
          lo dice a su pie, en el registro mudo de la nota del ejemplo y siempre,
          con el ejemplo o sin él: es un hecho del sistema, no de este libro. */}
      <span className="aj-sub wpin-note">{t("settings.widgetpins.nosubs")}</span>
    </>
  );
}
