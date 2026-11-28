import { useEffect, useState } from "react";
import { askSignInAgain, deleteAccountForever, lastUser, onUser, saveChosenName, sessionGone, signOutEverywhereLocal, type FaroUser } from "./cloud";
import { LOCK_ASK_KEY } from "@/lib/faro/lockoffer";
import { chosenNameOf, NAME_ASK_KEY } from "@/lib/faro/personname";
import { disableLock, enableLock, lockCredential, lockSupported } from "./lock";
import { w } from "./words";
import { useFaro } from "@/components/faro/provider";
import { Hint } from "@/components/faro/hint";
import { wipeLocalBackups } from "./vault";

export function useFaroUser(): FaroUser | null {
  const [u, setU] = useState<FaroUser | null>(() => lastUser());
  useEffect(() => onUser(setU), []);
  return u;
}

function wipeDevice(uid: string) {
  try {
    for (const k of Object.keys(localStorage)) {
      // The fingerprint choice survives signing out, so signing back in on this device never asks to set it up again.
      if (k === `faro.lock.${uid}`) continue;
      // 1.3.257: the asked-once fact survives too — declining the fingerprint offer is forever on this device.
      if (k === LOCK_ASK_KEY(uid)) continue;
      // Pieza 0 (1.3.363): la pregunta del nombre también se hace una sola vez por aparato.
      if (k === NAME_ASK_KEY(uid)) continue;
      if (k.includes(uid) || k.startsWith("faro.pack") || k.startsWith("faro.conflict")) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

export function UserButton() {
  const user = useFaroUser();
  const { confirm, exportJson } = useFaro();
  const [busy, setBusy] = useState(false);
  const [canLock, setCanLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState("");
  const [gone, setGone] = useState(sessionGone);
  useEffect(() => {
    const on = () => setGone(sessionGone());
    window.addEventListener("faro-session", on);
    return () => window.removeEventListener("faro-session", on);
  }, []);
  useEffect(() => {
    void lockSupported().then(setCanLock);
    if (user) setLocked(Boolean(lockCredential(user.id)));
  }, [user]);
  if (!user) return null;
  const label = user.name || user.email || "Faro";
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">{label.charAt(0).toUpperCase()}</span>
        <span className="text-sm font-medium">{user.email || label}</span>
        <Hint topic="privacidad" />
      </div>
      {gone ? (
        <div className="grid gap-2">
          <span className="text-sm text-muted">{w("acct.gone")}</span>
          <button type="button" className="btn" onClick={askSignInAgain}>{w("acct.again")}</button>
          <Hint topic="entrar-de-nuevo" />
        </div>
      ) : null}
      <div className="grid gap-1">
        <span className="text-sm font-medium lab-head">{w("lock.on")}<Hint topic="huella" /></span>
        <span className="text-sm text-muted">{canLock ? w("lock.onHint") : w("lock.none")}</span>
        {canLock ? (
          <button
            type="button"
            className="btn secondary"
            onClick={async () => {
              setMsg("");
              // 1.3.121: the Android widget hides amounts by default while the lock is on (until its own switch is used).
              // 1.3.259 (Oscar, 2026-11-13): «no queremos problemas o errores» — QUITAR la huella
              // pide confirmación primero, con la ventana de la casa: quitarla apaga una forma
              // de entrar en este dispositivo. El apagado confirmado corre EXACTAMENTE el camino
              // de siempre (el mismo disableLock de lock.ts, ni una línea más); lock.ts no se toca.
              if (locked) {
                confirm({
                  title: w("lock.disable"),
                  body: w("lock.offBody"),
                  yes: w("lock.disable"),
                  run: () => { disableLock(user.id); setLocked(false); window.dispatchEvent(new Event("faro-widget-refresh")); },
                });
                return;
              }
              try { setLocked(await enableLock(user.id, user.email)); } catch { setMsg(w("lock.failed")); }
              window.dispatchEvent(new Event("faro-widget-refresh"));
            }}
          >
            {locked ? w("lock.disable") : w("lock.enable")}
          </button>
        ) : null}
        {msg ? <span className="text-sm text-bad">{msg}</span> : null}
      </div>
      <div className="acct-out-row">
        <button
          type="button"
          className="btn danger"
          disabled={busy}
          onClick={() => confirm({
            title: w("acct.out"),
            body: w("acct.outWarn"),
            danger: true,
            yes: w("acct.out"),
            run: () => {
              void (async () => {
                setBusy(true);
                wipeDevice(user.id);
                await wipeLocalBackups(user.id);
                await signOutEverywhereLocal();
              })();
            },
          })}
        >
          {w("acct.out")}
        </button>
        <Hint topic="cerrar-sesion" />
      </div>
      {/* Eliminar cuenta (Oscar, chat de ventanas, 2026-11-11): es el único acto de
          Faro sin regreso — por eso vive separado, tranquilo, tras su propio borde
          y SIN rótulo (corrección de Oscar, 2026-11-12: «No quiero 'zona de
          peligro'»), y por eso su ventana lleva la puerta de GitHub que Cerrar
          sesión no merece. */}
      <div className="acct-del-zone">
        <button
          type="button"
          className="btn danger"
          disabled={busy}
          onClick={() => confirm({
            title: w("acct.delTitle"),
            body: w("acct.delWarn"),
            danger: true,
            typeText: user.email || undefined,
            extraLabel: w("acct.delGetBook"),
            extraRun: () => exportJson(),
            yes: w("acct.delYes"),
            run: () => {
              void (async () => {
                setBusy(true);
                // Primero el servidor confirma el borrado; si no lo confirma, la
                // cuenta sigue viva y NO se toca nada local (sería mentir).
                const gone = await deleteAccountForever();
                if (!gone) { setBusy(false); setMsg(w("acct.delFail")); return; }
                wipeDevice(user.id);
                await wipeLocalBackups(user.id);
                await signOutEverywhereLocal();
              })();
            },
          })}
        >
          {w("acct.del")}
        </button>
        <Hint topic="eliminar-cuenta" />
      </div>
    </div>
  );
}

/**
 * The Cuenta fold's honest body when this device has no account (local mode): UserButton renders
 * nothing then, and an empty fold is the one wrong answer (1.3.171, censo R3). With an account —
 * including the sessionless door, where lastUser() still names the owner — this renders nothing
 * and UserButton carries the fold exactly as before.
 */
export function AccountLocalNote() {
  const user = useFaroUser();
  if (user) return null;
  return <p className="text-sm text-muted">{w("account.local")}</p>;
}

/**
 * Pieza 0 (1.3.363) — la fila «Cómo te nombra Faro» del pliegue Cuenta.
 * Muestra el nombre elegido o «Sin nombre todavía» y abre la hoja mínima:
 * el campo, la explicación de una línea y guardar. El nombre vive en la
 * cuenta (saveChosenName), jamás en un libro; quitarlo vuelve a Faro a
 * hablar como siempre. Sin cuenta no hay fila (AccountLocalNote cubre el
 * modo local), y con la sesión caída se dice, como hace UserButton.
 */
export function NameRow() {
  const user = useFaroUser();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [gone, setGone] = useState(sessionGone);
  useEffect(() => {
    const on = () => setGone(sessionGone());
    window.addEventListener("faro-session", on);
    return () => window.removeEventListener("faro-session", on);
  }, []);
  if (!user) return null;
  const name = chosenNameOf(user);
  const save = async (value: string) => {
    setBusy(true);
    setMsg("");
    const u = await saveChosenName(value);
    setBusy(false);
    if (!u) { setMsg(w("name.failed")); return; }
    try { localStorage.setItem(NAME_ASK_KEY(user.id), "1"); } catch { /* ignore */ }
    setOpen(false);
  };
  return (
    <div className="grid gap-1" data-anchor="aj-name">
      <span className="text-sm font-medium lab-head">{w("name.row")}<Hint topic="nombre" /></span>
      {gone ? (
        <span className="text-sm text-muted">{w("acct.gone")}</span>
      ) : open ? (
        <div className="grid gap-2">
          <input
            className="field"
            value={draft}
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={name ?? ""}
            aria-label={w("name.row")}
          />
          <span className="text-sm text-muted">{w("name.note")}</span>
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={busy} onClick={() => void save(draft)}>{w("name.save")}</button>
            {name ? (
              <button type="button" className="btn secondary" disabled={busy} onClick={() => void save("")}>{w("name.remove")}</button>
            ) : null}
            <button type="button" className="btn secondary" disabled={busy} onClick={() => setOpen(false)}>{w("name.cancel")}</button>
          </div>
          {msg ? <span className="text-sm text-bad">{msg}</span> : null}
        </div>
      ) : (
        <button
          type="button"
          className="btn secondary"
          onClick={() => { setDraft(name ?? ""); setMsg(""); setOpen(true); }}
        >
          {name ?? w("name.none")}
        </button>
      )}
    </div>
  );
}

/**
 * Pieza 0 (1.3.363) — la pregunta al instalar: tras la cuenta y antes del
 * primer libro, una sola vez por cuenta y aparato. «Ponerlo después» es
 * una salida entera: la marca queda puesta y la pregunta no vuelve a
 * interrumpir jamás (espera en Ajustes, en la fila de arriba). Si la
 * persona ya tiene nombre — lo escribió al registrarse — la marca se
 * pone sola y la pregunta ni aparece. Sin cuenta, no hay pregunta.
 */
export function NameAsk() {
  const user = useFaroUser();
  const [state, setState] = useState<"wait" | "ask" | "done">("wait");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user || state !== "wait") return;
    let asked = false;
    try { asked = localStorage.getItem(NAME_ASK_KEY(user.id)) === "1"; } catch { /* ignore */ }
    if (asked) { setState("done"); return; }
    if (chosenNameOf(user)) {
      try { localStorage.setItem(NAME_ASK_KEY(user.id), "1"); } catch { /* ignore */ }
      setState("done");
      return;
    }
    setState("ask");
  }, [user, state]);
  if (!user || state !== "ask") return null;
  const finish = async (value: string | null) => {
    try { localStorage.setItem(NAME_ASK_KEY(user.id), "1"); } catch { /* ignore */ }
    if (value === null) { setState("done"); return; }
    setBusy(true);
    await saveChosenName(value);
    setBusy(false);
    setState("done");
  };
  return (
    <div className="modal-back" role="dialog" aria-label={w("name.ask.title")}>
      <section className="modal" style={{ display: "grid", gap: 12 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: "1.5rem" }}>{w("name.ask.title")}</h2>
        <p className="text-sm text-muted" style={{ margin: 0 }}>{w("name.ask.body")}</p>
        <input
          className="field"
          value={draft}
          maxLength={60}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={w("name.ask.title")}
        />
        <button type="button" className="btn" disabled={busy || !draft.trim()} onClick={() => void finish(draft)}>
          {w("name.ask.go")}
        </button>
        <button type="button" className="btn secondary" disabled={busy} onClick={() => void finish(null)}>
          {w("name.ask.later")}
        </button>
      </section>
    </div>
  );
}
