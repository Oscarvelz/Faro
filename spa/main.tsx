import { installSampleMode } from "@/lib/faro/samplemode";
import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@/styles.css";
import { FaroProvider } from "@/components/faro/provider";
import { useSampleEpoch } from "@/components/faro/sample-mode";
import { Shell } from "@/components/faro/shell";
import { Mark } from "@/components/faro/icons";
import { CLOUD_READY, emitUser, keepSignedIn, lastUser, rememberUser, setSessionGone, supabase } from "@/spa/cloud";
import { useFaroUser } from "@/spa/gates";
import { Login } from "@/spa/login";
import { lockCredential, unlock } from "@/spa/lock";
import { w } from "@/spa/words";
import { clearGlow } from "@/lib/manual/nav";
import { startFit } from "@/spa/fit";
import { startStatusBar } from "@/spa/statusbar";
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

let splashOver = false;
function Locked({ uid, onOpen }: { uid: string; onOpen: () => void }) {
  const [err, setErr] = useState("");
  useEffect(() => { clearGlow(); }, []); // the "Ir allí" ring never shows over the lock
  const tried = useRef(false);
  const go = async () => {
    setErr("");
    try { if (await unlock(uid)) onOpen(); else setErr(w("lock.failed")); } catch { setErr(w("lock.failed")); }
  };
  // Ask for the fingerprint only once the launch splash has finished, so it can be enjoyed first (Oscar, Nov 1 2026).
  useEffect(() => {
    if (tried.current) return;
    const fire = () => { if (!tried.current) { tried.current = true; void go(); } };
    if (splashOver || QUIET_BOOT) { fire(); return; }
    window.addEventListener("faro-splash-gone", fire, { once: true });
    return () => window.removeEventListener("faro-splash-gone", fire);
  });
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

// Fingerprint lock works like Journey (Oscar, Nov 1 2026: "ask for my fingerprint or password after I leave the app"):
// leaving the app (home, another app, screen off) or opening it fresh asks again. A short grace absorbs flickers
// (notification shade, system dialogs), and a photo/backup file picker opened from inside Faro never counts as leaving.
const LEAVE_GRACE_MS = 10_000;
// Working mode (Oscar, Nov 1: switching back and forth while actively working shouldn't ask): if he touched Faro in the
// last 2 minutes before leaving, a trip to another app of up to 5 minutes comes back open.
const ACTIVE_WINDOW_MS = 2 * 60_000;
const WORK_GRACE_MS = 5 * 60_000;
let touchedAt = 0;
if (typeof document !== "undefined") {
  const touch = () => { touchedAt = Date.now(); };
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) document.addEventListener(ev, touch, { capture: true, passive: true });
}
const SEEN = (uid: string) => `faro.seen.${uid}`;
const markSeen = (uid: string) => { try { localStorage.setItem(SEEN(uid), String(Date.now())); } catch { /* ignore */ } };
let pickerAt = 0;
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const el = e.target as Element | null;
    try { if (el?.closest?.('input[type="file"], label:has(input[type="file"])')) pickerAt = Date.now(); } catch { if (el?.closest?.("label, input")?.querySelector?.('input[type="file"]') || (el as HTMLInputElement | null)?.type === "file") pickerAt = Date.now(); }
  }, true);
}

// A reload made only to pick up an update skips the launch animation (no second splash).
const QUIET_BOOT = (() => {
  try { const q = sessionStorage.getItem("faro-quiet-boot") === "1"; sessionStorage.removeItem("faro-quiet-boot"); return q; } catch { return false; }
})();

function App() {
  const [splash, setSplash] = useState(!QUIET_BOOT);
  const [minDone, setMinDone] = useState(false);
  const [capDone, setCapDone] = useState(false);
  useEffect(() => {
    const a = window.setTimeout(() => setMinDone(true), SPLASH_MIN_MS);
    const b = window.setTimeout(() => setCapDone(true), 9000);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  const [ready, setReady] = useState(false);
  const gone = useCallback(() => { document.documentElement.classList.remove("booting"); setSplash(false); splashOver = true; window.dispatchEvent(new Event("faro-splash-gone")); }, []);
  useEffect(() => { if (QUIET_BOOT) splashOver = true; }, []);
  useEffect(() => { if (QUIET_BOOT) document.documentElement.classList.remove("booting"); }, []);
  // The dark boot background only has to cover until the splash starts fading. Drop it as the fade
  // begins, so the theme's own page shows through instead of a black frame behind the cards.
  const leaving = (minDone && ready) || capDone;
  useEffect(() => { if (leaving) document.documentElement.classList.remove("booting"); }, [leaving]);
  const view = <Gate onReady={setReady} />;
  return (
    <>
      {view}
      {splash ? <Splash done={leaving} onGone={gone} /> : null}
    </>
  );
}

function Gate({ onReady }: { onReady: (v: boolean) => void }) {
  const user = useFaroUser();
  const epoch = useSampleEpoch();
  const [booted, setBooted] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [expiredRaw, setExpired] = useState(false);
  const [relogin, setRelogin] = useState(false);
  // "Mantener sesión abierta": an ended cloud session doesn't block the books; Ajustes offers to sign in again.
  const softExpired = expiredRaw && keepSignedIn() && !relogin;
  const expired = expiredRaw && !softExpired;
  useEffect(() => { setSessionGone(expiredRaw); }, [expiredRaw]);
  useEffect(() => {
    const go = () => setRelogin(true);
    window.addEventListener("faro-relogin", go);
    return () => window.removeEventListener("faro-relogin", go);
  }, []);
  const [open, setOpen] = useState(false);
  const hiddenAt = useRef(0);
  const openRef = useRef(false);
  const graceRef = useRef(LEAVE_GRACE_MS);

  useEffect(() => {
    if (!CLOUD_READY) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (session) {
        setExpired(false);
        setRelogin(false);
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

  // Hold the launch splash until the screen behind it is really drawn, so the books'
  // own loading view never shows as a second splash.
  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    const on = () => setShellReady(true);
    window.addEventListener("faro:shell-ready", on);
    return () => window.removeEventListener("faro:shell-ready", on);
  }, []);
  const willShell = !CLOUD_READY || (booted && !recovery && !!user && !expired && open);
  useEffect(() => {
    if (!CLOUD_READY) { if (shellReady) onReady(true); return; }
    if (booted) onReady(!willShell || shellReady);
  }, [booted, willShell, shellReady]);

  useEffect(() => {
    if (!user) { setOpen(false); return; }
    const uid = user.id;
    // Fresh launch asks, except the silent reload that installs an update right after use.
    const quietResume = (() => { try { return QUIET_BOOT && Date.now() - Number(localStorage.getItem(SEEN(uid)) || 0) < LEAVE_GRACE_MS * 6; } catch { return false; } })();
    const locked = !!lockCredential(uid) && !quietResume;
    openRef.current = !locked;
    setOpen(!locked);
    if (!locked) markSeen(uid);
    hiddenAt.current = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        markSeen(uid);
        // Only a hide while the app is open counts; the fingerprint prompt itself hides the page while locked.
        hiddenAt.current = openRef.current && Date.now() - pickerAt > 3_000 ? Date.now() : 0;
        graceRef.current = Date.now() - touchedAt < ACTIVE_WINDOW_MS ? WORK_GRACE_MS : LEAVE_GRACE_MS;
        return;
      }
      const left = hiddenAt.current;
      hiddenAt.current = 0;
      if (left && lockCredential(uid) && Date.now() - left > graceRef.current) { openRef.current = false; setOpen(false); }
      else markSeen(uid);
    };
    const onHide = () => markSeen(uid);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", onHide); };
  }, [user]);

  if (!CLOUD_READY && /[?&]gate=(in|up|reset)/.test(location.search)) {
    const m = location.search.match(/gate=(in|up|reset)/)?.[1];
    return <Login recovery={m === "reset"} />;
  }
  if (!CLOUD_READY) {
    // Accounts not connected yet: run on this device only.
    return (
      <FaroProvider key={epoch} userId="local">
        <Shell />
      </FaroProvider>
    );
  }
  if (!booted) return <Boot />;
  if (recovery) return <Login recovery />;
  if (!user || expired) return <Login note={expired ? w("acct.relogin") : undefined} />;
  if (!open) return <Locked uid={user.id} onOpen={() => { markSeen(user.id); hiddenAt.current = 0; openRef.current = true; setOpen(true); }} />;
  return (
    <FaroProvider key={epoch} userId={user.id}>
      <Shell />
    </FaroProvider>
  );
}

installSampleMode();
startFit();
startStatusBar();
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
          if (nw.state === "activated" && navigator.serviceWorker.controller) {
            try { sessionStorage.setItem("faro-quiet-boot", "1"); } catch { /* ignore */ }
            location.reload();
          }
        });
      });
      setInterval(() => void reg.update(), 60 * 60 * 1000);
    }).catch(() => undefined);
  });
}

// Tron (and any living theme) pauses its light while the tab is hidden.
if (typeof document !== "undefined") {
  const markHidden = () => { if (document.hidden) document.documentElement.dataset.hidden = ""; else delete document.documentElement.dataset.hidden; };
  document.addEventListener("visibilitychange", markHidden);
  markHidden();
}

// Cadence ripple on the six chips: ink in the chip's own tone grows from the finger. Tron keeps its own tap language.
document.addEventListener("pointerdown", (e) => {
  if (document.documentElement.dataset.theme === "tron") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const host = (e.target as Element | null)?.closest?.(".lens, .save-seg");
  if (!(host instanceof HTMLElement)) return;
  let well = host.querySelector<HTMLElement>(":scope > .ripple-well");
  if (!well) {
    well = document.createElement("span");
    well.className = "ripple-well";
    well.setAttribute("aria-hidden", "true");
    host.appendChild(well);
  }
  const rect = well.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const size = Math.hypot(rect.width, rect.height);
  const x = (e as PointerEvent).clientX - rect.left;
  const y = (e as PointerEvent).clientY - rect.top;
  const ink = document.createElement("span");
  ink.className = "cadence-ripple";
  ink.style.width = `${size}px`;
  ink.style.height = `${size}px`;
  ink.style.left = `${x - size / 2}px`;
  ink.style.top = `${y - size / 2}px`;
  ink.style.background = `color-mix(in srgb, var(--tone, var(--fg)) 36%, transparent)`;
  well.appendChild(ink);
  window.setTimeout(() => ink.remove(), 640);
}, { passive: true });
