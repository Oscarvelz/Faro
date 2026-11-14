import { useEffect } from "react";
import { useFaro } from "@/components/faro/provider";
import { browserPackStorage } from "@/lib/faro/packguard";
import { clearPending, markAsked, readPending, wasAsked } from "@/lib/faro/lockoffer";
import { enableLock, lockCredential, lockSupported } from "./lock";
import { useFaroUser } from "./gates";
import { w } from "./words";

/**
 * La oferta de huella (1.3.257): vive montada en la carcasa y solo despierta cuando
 * rememberUser() dejó una oferta pendiente para el usuario que acaba de entrar —
 * es decir, en el registro genuino, una vez (lib/faro/lockoffer.ts tiene la decisión).
 * Es el primer eslabón de la cadena de primera vez que fijó Oscar: sesión → oferta
 * de huella → oferta de presentación → …; la presentación aún no existe, y este
 * asiento — dentro de la app, tras la sesión y antes que cualquier otra primera
 * cosa — le deja el sitio libre detrás.
 *
 * La ventana es la de la casa (el confirm del proveedor), con las palabras de la
 * propia Cuenta: aceptar corre enableLock, la MISMA maquinaria que el botón de
 * «Desbloqueo con huella». Si el aparato no puede (sin huella ni bloqueo de
 * pantalla, como Cuenta ya sabe decir), la invitación ni siquiera se hace: la
 * pendiente se consume en silencio y la puerta de Cuenta queda donde estaba.
 *
 * El efecto depende solo de la cuenta: el proveedor renace de identidad en cada
 * render y un guardián de «ya corrí» moriría con la primera limpieza. Por eso el
 * trabajo se reagenda en cada corrida mientras la pendiente exista, y show() la
 * reverifica al disparar — la marca de «ya se preguntó», no la memoria del
 * componente, es la que hace que sea una sola vez.
 */
export function LockOffer() {
  const user = useFaroUser();
  const { confirm, setUi } = useFaro();
  const uid = user?.id ?? null;

  useEffect(() => {
    if (!user || !uid) return;
    const store = browserPackStorage();
    if (!readPending(store, uid) || wasAsked(store, uid)) return;
    let live = true;
    const show = async () => {
      if (!live) return;
      // Otro intento ya la hizo (o la pendiente se fue): la marca manda.
      if (!readPending(store, uid) || wasAsked(store, uid)) return;
      if (!(await lockSupported())) { clearPending(store, uid); return; }
      if (!live) return;
      // Ya puesta (la activó en Cuenta antes de que la oferta saliera): nada que ofrecer.
      if (lockCredential(uid)) { clearPending(store, uid); return; }
      // Preguntada queda: acepte o decline, la pregunta no vuelve en este aparato.
      clearPending(store, uid);
      markAsked(store, uid);
      confirm({
        title: w("lock.offerTitle"),
        body: w("lock.offerBody"),
        yes: w("lock.enable"),
        no: w("lock.offerNo"),
        run: () => {
          void (async () => {
            // Como en Cuenta: si el aparato no confirma, su mensaje es lock.failed;
            // si el usuario cancela el aviso del aparato, silencio (quedó sin poner).
            try { await enableLock(user.id, user.email); } catch { setUi({ notice: w("lock.failed") }); }
            window.dispatchEvent(new Event("faro-widget-refresh"));
          })();
        },
      });
    };
    // Como la cerradura misma: la pregunta espera a que el splash se levante (el
    // temporizador cubre el arranque silencioso de una actualización, que no lo emite).
    let kicked = false;
    const kick = () => { if (!kicked) { kicked = true; void show(); } };
    window.addEventListener("faro-splash-gone", kick, { once: true });
    const t = window.setTimeout(kick, 1600);
    return () => { live = false; window.removeEventListener("faro-splash-gone", kick); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la cuenta es la única dependencia real; confirm/setUi son el conducto, no el gatillo
  }, [uid]);

  return null;
}
