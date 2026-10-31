import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
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
import { startFit } from "@/spa/fit";
import "@/spa/gate.css";
import { Splash, SPLASH_MIN_MS } from "@/spa/splash";

function Night() {
  return (
    <div className="gate-sky" aria-hidden>
      <i className="gate-stars" />
      <i className="gate-stars is-far" />
      <i className="gate-beam" />
      <svg className="gate-sea" viewBox="0 0 400 80" preserveAspectRatio="none">
        <path className="wave-a" d="M0 34 Q50 24 100 34 T200 34 T300 34 T400 34 V80 H0Z" />
        <path className="wave-b" d="M0 48 Q50 40 100 48 T200 48 T300 48 T400 48 V80 H0Z" />
      </svg>
    </div>
  );
}

function Boot() {
  return (
    <main className="gate is-still">
      <Night />
      <header className="gate-brand">
        <span className="gate-lamp"><Mark className="size-10" /></span>
        <h1 className="serif">Faro</h1>
        <p>{w("app.tagline")}</p>
      </header>
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
    <main className="gate">
      <Night />
      <header className="gate-brand">
        <span className="gate-lamp"><Mark className="size-10" /></span>
        <h1 className="serif">Faro</h1>
        <p>{w("lock.title")}</p>
      </header>
      <section className="gate-card">
        <button type="button" className="gate-go" onClick={() => void go()}><span>{err ? w("lock.again") : w("lock.open")}</span></button>
        {err ? <p className="gate-note is-bad">{err}</p> : null}
      </section>
    </main>
  );
}

const RELOCK_MS = 60_000;

function App() {
  const [splash, setSplash] = useState(true);
  const [minDone, setMinDone] = useState(false);
  const [capDone, setCapDone] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    const b = window.setTimeout(() => setCapDone(true), 5000);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  const [ready, setReady] = useState(!CLOUD_READY);
  const gone = useCallback(() => setSplash(false), []);
  const view = <Gate onReady={setReady} />;
  return (
    <>
      {view}
      {splash ? <Splash done={(minDone && ready) || capDone} onGone={gone} /> : null}
    </>
  );
}

function Gate({ onReady }: { onReady: (v: boolean) => void }) {
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
      onReady(true);
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

  if (!CLOUD_READY && /[?&]gate=(in|up|reset)/.test(location.search)) {
    const m = location.search.match(/gate=(in|up|reset)/)?.[1];
    return <Login recovery={m === "reset"} />;
  }
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

startFit();
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
