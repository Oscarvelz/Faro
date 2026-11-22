import { useEffect, useState } from "react";
import { Bell, BellOff, CalendarCheck, CalendarClock, ChevronDown, Gauge } from "lucide-react";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { inAndroidApp, native } from "@/spa/native";
import "./sample-mode.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

type NotifyKind = "dues" | "pace" | "close";

/**
 * Ajustes → Notificaciones (1.3.148, con el nombre de entonces: Avisos).
 * Until this row existed there was no notification switch anywhere:
 * the only gate was the one-shot Android permission prompt, and the web got nothing, silently.
 * The row says the truth on every platform: on the web, notifications simply do not exist; in the
 * app, the switch is the user's own preference (settings.notify, carried in the widget snapshot to
 * FaroNotify) and the line under it reports the phone's real permission — read through the bridge,
 * never guessed. An older shell without the bridge methods still gets the switch, with a sub-line
 * that says the app asks the permission itself.
 * 1.3.259 (Oscar, 2026-11-13): «no queremos problemas o errores» — APAGAR pide confirmación
 * primero, con la ventana de la casa: qué avisos llegan hoy y qué deja de llegar, en palabras
 * sencillas. El interruptor no cambia hasta que la ventana confirma (su commit vive dentro
 * del run, por el mismo camino de siempre); ENCENDER sigue siendo el toque desnudo de antes.
 * 1.3.377 (Oscar, 2026-11-21 21:26, desde su teléfono): la fila se renombra
 * «Notificaciones» — más universal — y se DESPLIEGA: dentro van los tres
 * tipos (vencimientos, ritmo, cierre) con su propio interruptor, sin
 * confirmación — elegir cuáles llegan es el control fino que él pidió,
 * no otro apagado total. Los tipos viven en settings.notifyKinds (ausente
 * por tipo = encendido) y viajan compuestos en la foto (notifyDues /
 * notifyPace / notifyClose); la carcasa nueva juzga cada aviso contra su
 * tipo y una carcasa vieja, que no los trae, sigue al maestro como hoy.
 * «Avisos de pagos» (la tarjeta de Central) conserva su nombre: es otra
 * pieza, y él lo falló así expresamente.
 */
export function NotifyRow() {
  const { lang, session, commit, confirm, has } = useFaro();
  const prefOn = session ? session.ledger.settings.notify !== false : true;
  const savedKinds = session?.ledger.settings.notifyKinds;
  const kindOn = (k: NotifyKind) => savedKinds?.[k] !== false;
  // J-4 (tres modos, etapa 3.3): el interruptor sigue único; su texto se
  // compone por modo nombrando solo los avisos que el teléfono emite en ese
  // modo (el censo T-5 manda sobre los nombres): vencimientos y cierre llegan
  // siempre; el ritmo es la cara del Patrón, solo Completo (widget.face-pace).
  const paceWord = has("widget.face-pace") ? L(lang, "ritmo", "pace") : null;
  const [open, setOpen] = useState(false);
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

  // 1.3.377: el interruptor de cada tipo — sin ventana (es el control fino
  // que Oscar pidió: activar y desactivar desde ahí mismo) y sin efecto
  // con el maestro apagado, que manda sobre todos. Las etiquetas de la
  // entrada se escriben enteras por tipo: nada de componer género.
  const KIND_LABEL: Record<NotifyKind, { on: [string, string]; off: [string, string] }> = {
    dues: { on: ["Vencimientos activados", "Due dates on"], off: ["Vencimientos desactivados", "Due dates off"] },
    pace: { on: ["Ritmo de gasto activado", "Spending pace on"], off: ["Ritmo de gasto desactivado", "Spending pace off"] },
    close: { on: ["Cierre del mes activado", "Month's close on"], off: ["Cierre del mes desactivado", "Month's close off"] },
  };
  const flipKind = (kind: NotifyKind) => {
    if (!prefOn) return;
    const next = !kindOn(kind);
    const label = KIND_LABEL[kind][next ? "on" : "off"];
    commit((s) => ({ ...s, settings: { ...s.settings, notifyKinds: { ...s.settings.notifyKinds, [kind]: next } } }),
      L(lang, label[0], label[1]));
  };

  const flip = () => {
    if (prefOn) {
      confirm({
        title: L(lang, "Desactivar notificaciones", "Turn off notifications"),
        // J-4: la frase entera depende del modo — con la cara de ritmo
        // (Completo) nombra el ritmo; sin ella, solo lo que el teléfono
        // sigue emitiendo: vencimientos y cierre. Dos frases completas,
        // nunca una plantilla: la ventana dice lo que se pierde, entero.
        body: paceWord
          ? L(lang,
            "Faro deja de avisarte de los vencimientos, el ritmo de gasto y el cierre del mes. Puedes volver a activarlos cuando quieras, aquí mismo.",
            "Faro will stop reminding you about due dates, your spending pace and the month-end close. You can turn them back on any time, right here.")
          : L(lang,
            "Faro deja de avisarte de los vencimientos y el cierre del mes. Puedes volver a activarlos cuando quieras, aquí mismo.",
            "Faro will stop reminding you about due dates and the month-end close. You can turn them back on any time, right here."),
        yes: L(lang, "Desactivar", "Turn off"),
        run: () => commit((s) => ({ ...s, settings: { ...s.settings, notify: false } }),
          L(lang, "Notificaciones apagadas", "Notifications off")),
      });
      return;
    }
    commit((s) => ({ ...s, settings: { ...s.settings, notify: true } }),
      L(lang, "Notificaciones encendidas", "Notifications on"));
  };

  if (!inAndroidApp()) {
    return (
      <section className="card manual-card aj-card smp-card" data-anchor="aj-notify">
        <div className="smp-in">
          <div className="manual-row aj-row smp-row">
            <BellOff aria-hidden />
            <span className="manual-row-text">
              <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Notificaciones", "Notifications")}</h2><Hint topic="avisos-app" /></div>
              <span className="aj-sub">{L(lang, "Solo con la app de Android", "Only with the Android app")}</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  // La línea de estado nombra solo los tipos encendidos (1.3.377): con el
  // maestro encendido y ningún tipo, lo dice — ninguno llega.
  const enabledNames: string[] = [];
  if (kindOn("dues")) enabledNames.push(L(lang, "vencimientos", "due dates"));
  if (paceWord && kindOn("pace")) enabledNames.push(paceWord);
  if (kindOn("close")) enabledNames.push(L(lang, "cierre", "month-end"));
  const sub = !canState
    ? L(lang, "El permiso lo pide la app misma", "The app itself asks for permission")
    : perm === "denied"
      ? L(lang, "El teléfono no los permite todavía", "The phone does not allow them yet")
      : prefOn
        ? enabledNames.length
          ? L(lang, `Activados: ${enabledNames.join(", ")}`, `On: ${enabledNames.join(", ")}`)
          : L(lang, "Activados: ninguno", "On: none")
        : L(lang, "Apagados por ti", "Turned off by you");

  const kindRow = (kind: NotifyKind, Icon: typeof CalendarClock, esName: string, enName: string, esSub: string, enSub: string) => {
    const on = kindOn(kind);
    return (
      <div key={kind} role="switch" tabIndex={prefOn ? 0 : -1} aria-checked={on} aria-disabled={!prefOn || undefined}
        className="manual-row aj-row smp-row notify-kind-row" data-anchor={`aj-notify-${kind}`}
        onClick={() => flipKind(kind)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipKind(kind); } }}>
        <Icon aria-hidden />
        <span className="manual-row-text">
          <span className="notify-kind-name">{L(lang, esName, enName)}</span>
          <span className="aj-sub">{L(lang, esSub, enSub)}</span>
        </span>
        <i className="smp-switch" aria-hidden><b /></i>
      </div>
    );
  };

  return (
    <section className="card manual-card aj-card smp-card" data-anchor="aj-notify">
      <div className="smp-in">
        <div role="switch" tabIndex={0} aria-checked={prefOn} className="manual-row aj-row smp-row notify-head-row" onClick={flip}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flip(); } }}>
          <Bell aria-hidden />
          <span className="manual-row-text">
            <div className="fold-title aj-title"><h2 className="serif">{L(lang, "Notificaciones", "Notifications")}</h2><Hint topic="avisos-app" /></div>
            <span className="aj-sub">{sub}</span>
          </span>
          <button type="button" className="notify-chev" aria-expanded={open} data-anchor="aj-notify-unfold"
            aria-label={L(lang, "Elegir qué notificaciones llegan", "Choose which notifications arrive")}
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            <ChevronDown size={17} className={open ? "is-open" : ""} aria-hidden />
          </button>
          <i className="smp-switch" aria-hidden><b /></i>
        </div>
        {open ? (
          <div className="notify-kinds">
            {kindRow("dues", CalendarClock, "Vencimientos", "Due dates", "Cuando un pago vence o está por vencer", "When a payment is due or about to be")}
            {paceWord ? kindRow("pace", Gauge, "Ritmo de gasto", "Spending pace", "Una vez por semana, si tu gasto se sale de tu patrón", "Once a week, if your spending leaves your pattern") : null}
            {kindRow("close", CalendarCheck, "Cierre del mes", "Month's close", "El resumen del mes que termina", "The finished month's summary")}
          </div>
        ) : null}
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
