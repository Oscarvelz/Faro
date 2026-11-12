import { useEffect, useState } from "react";
import { askSignInAgain, deleteAccountForever, lastUser, onUser, sessionGone, signOutEverywhereLocal, type FaroUser } from "./cloud";
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
      </div>
      {gone ? (
        <div className="grid gap-2">
          <span className="text-sm text-muted">{w("acct.gone")}</span>
          <button type="button" className="btn" onClick={askSignInAgain}>{w("acct.again")}</button>
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
              if (locked) { disableLock(user.id); setLocked(false); window.dispatchEvent(new Event("faro-widget-refresh")); return; }
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
      {/* La zona de peligro (Oscar, chat de ventanas, 2026-11-11): eliminar la cuenta
          es el único acto de Faro sin regreso — por eso vive separado, tranquilo, y
          por eso su ventana lleva la puerta de GitHub que Cerrar sesión no merece. */}
      <div className="acct-del-zone">
        <span className="acct-del-cap">{w("acct.delZone")}</span>
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
