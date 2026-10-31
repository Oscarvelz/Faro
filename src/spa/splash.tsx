import { useEffect, useState } from "react";
import { w } from "@/spa/words";
import "@/spa/splash.css";

const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const SPLASH_MIN_MS = reduce ? 700 : 2300;
const EXIT_MS = reduce ? 200 : 560;

/** Cold-start splash: the lighthouse builds itself, lights up, and sweeps once. */
export function Splash({ done, onGone }: { done: boolean; onGone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", "#0e1114");
    return () => { if (meta && prev) meta.setAttribute("content", prev); };
  }, []);
  useEffect(() => {
    if (!done) return;
    setLeaving(true);
    const t = window.setTimeout(onGone, EXIT_MS);
    return () => window.clearTimeout(t);
  }, [done, onGone]);
  return (
    <div className={`sp${leaving ? " is-leaving" : ""}`} role="status" aria-label="Faro">
      <i className="sp-ambient" aria-hidden />
      <div className="sp-lockup">
        <div className="sp-mark" aria-hidden>
          <i className="sp-beam" />
          <i className="sp-halo" />
          <svg viewBox="0 0 32 32">
            <path className="sp-base" d="M7.5 27h17" />
            <rect className="sp-tower" x="14.2" y="13" width="3.6" height="10.5" rx="1" />
            <path className="sp-lamp" d="M16 4.5 20.4 13H11.6L16 4.5Z" />
          </svg>
        </div>
        <h1 className="sp-word" aria-hidden>
          {"FARO".split("").map((c, i) => <span key={i} style={{ animationDelay: `${720 + i * 85}ms` }}>{c}</span>)}
        </h1>
        <p className="sp-tag">{w("app.tagline")}</p>
      </div>
    </div>
  );
}
