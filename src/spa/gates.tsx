import { useEffect, useState } from "react";
import { lastUser, onUser, signOutEverywhereLocal, type FaroUser } from "./cloud";
import { disableLock, enableLock, lockCredential, lockSupported } from "./lock";
import { w } from "./words";
import { useFaro } from "@/components/faro/provider";
import { wipeLocalBackups } from "./vault";

export function useFaroUser(): FaroUser | null {
  const [u, setU] = useState<FaroUser | null>(() => lastUser());
  useEffect(() => onUser(setU), []);
  return u;
}

function wipeDevice(uid: string) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.includes(uid) || k.startsWith("faro.pack") || k.startsWith("faro.conflict")) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}

export function UserButton() {
  const user = useFaroUser();
  const { confirm } = useFaro();
  const [busy, setBusy] = useState(false);
  const [canLock, setCanLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState("");
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
      <div className="grid gap-1">
        <span className="text-sm font-medium">{w("lock.on")}</span>
        <span className="text-sm text-muted">{canLock ? w("lock.onHint") : w("lock.none")}</span>
        {canLock ? (
          <button
            type="button"
            className="btn secondary"
            onClick={async () => {
              setMsg("");
              if (locked) { disableLock(user.id); setLocked(false); return; }
              try { setLocked(await enableLock(user.id, user.email)); } catch { setMsg(w("lock.failed")); }
            }}
          >
            {locked ? w("lock.disable") : w("lock.enable")}
          </button>
        ) : null}
        {msg ? <span className="text-sm text-bad">{msg}</span> : null}
      </div>
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
              disableLock(user.id);
              await signOutEverywhereLocal();
            })();
          },
        })}
      >
        {w("acct.out")}
      </button>
    </div>
  );
}
