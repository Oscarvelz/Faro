import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import { FaroProvider } from "@/components/faro/provider";
import { Shell } from "@/components/faro/shell";
import { Mark } from "@/components/faro/icons";
import { CLOUD_READY, emitUser, lastUser, rememberUser, supabase } from "@/spa/cloud";
import { useFaroUser } from "@/spa/gates";
import { Login } from "@/spa/login";
import { lockCredential, unlock } from "@/spa/lock";
import { w } from "@/spa/words";

function Boot() {
  return (
    <main className="splash">
      <div className="splash-beam" aria-hidden />
      <div className="brand-lockup">
        <Mark className="size-14" />
        <h1 className="serif text-6xl">Faro</h1>
        <p className="tagline">{w("app.tagline")}</p>
      </div>
    </main>
  );
}

function Locked({ uid, onOpen }: { uid: string; onOpen: () => void }) {
  const [err, setErr] = useState("");
  const tried = useRef(false);
  const go = async () => {
    setErr("");
    try { if (await unlock(uid)) onOpen(); else setErr(w("lock.failed")); } catch { setErr(w("lock.failed")); }
  };
  useEffect(() => { if (!tried.current) { tried.current = true; void go(); } });
  return (
    <main className="splash">
      <div className="splash-beam" aria-hidden />
      <div className="brand-lockup">
        <Mark className="size-14" />
        <h1 className="serif text-5xl">Faro</h1>
        <p className="tagline">{w("lock.title")}</p>
      </div>
      <section className="splash-card">
        <button type="button" className="btn" onClick={() => void go()}>{err ? w("lock.again") : w("lock.open")}</button>
        {err ? <p className="text-sm text-bad">{err}</p> : null}
      </section>
    </main>
  );
}

const RELOCK_MS = 60_000;

function App() {
  const user = useFaroUser();
  const [booted, setBooted] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [expired, setExpired] = useState(false);
  const [open, setOpen] = useState(false);
  const hiddenAt = useRef(0);

  useEffect(() => {
    if (!CLOUD_READY) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (session) {
        setExpired(false);
        emitUser(rememberUser(session));
      }
    });
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (data.session) emitUser(rememberUser(data.session));
        else if (!error && lastUser() && navigator.onLine) {
          // Online but no valid session (signed out elsewhere or refresh expired):
          // keep the local books available, but ask to sign in again to sync.
          setExpired(true);
        }
      } catch { /* offline: keep the remembered user */ }
      setBooted(true);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setOpen(false); return; }
    setOpen(!lockCredential(user.id));
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_MS && lockCredential(user.id)) setOpen(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user]);

  if (!CLOUD_READY) {
    // Accounts not connected yet: run on this device only.
    return (
      <FaroProvider userId="local">
        <Shell />
      </FaroProvider>
    );
  }
  if (!booted) return <Boot />;
  if (recovery) return <Login recovery />;
  if (!user || expired) return <Login note={expired ? w("acct.relogin") : undefined} />;
  if (!open) return <Locked uid={user.id} onOpen={() => setOpen(true)} />;
  return (
    <FaroProvider userId={user.id}>
      <Shell />
    </FaroProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw?.addEventListener("statechange", () => {
          if (nw.state === "activated" && navigator.serviceWorker.controller) location.reload();
        });
      });
      setInterval(() => void reg.update(), 60 * 60 * 1000);
    }).catch(() => undefined);
  });
}
