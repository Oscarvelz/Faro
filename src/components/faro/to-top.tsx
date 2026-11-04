import { useEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import "./to-top.css";

// "Back to top" (after Brizna's ScrollTop): one small framed arrow for whichever element is scrolling
// (the window on phones, the Manual layer, a tool sheet, a split pane). Shows after a long scroll down,
// hides near the top, and keeps clear of the dock, the floating bubble and the edge drawer handle.
type Scroller = HTMLElement | null; // null = the window

const topOf = (s: Scroller) => (s ? s.scrollTop : window.scrollY || document.documentElement.scrollTop);
const viewOf = (s: Scroller) => (s ? s.clientHeight : window.innerHeight);
const vis = (e: Element | null): e is HTMLElement => {
  if (!e) return false;
  const r = e.getBoundingClientRect();
  const st = getComputedStyle(e);
  return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none" && Number(st.opacity) > 0.05;
};

export function ToTop({ lang }: { lang: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ right: 12, bottom: 88, z: 32 });
  const target = useRef<Scroller>(null);
  const shown = useRef(false);

  useEffect(() => {
    let raf = 0;
    const place = () => {
      const s = target.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      let bottom = 16;
      let right = 12;
      const dock = document.querySelector(".dock");
      if (vis(dock)) bottom = Math.max(bottom, H - dock.getBoundingClientRect().top + 12);
      document.querySelectorAll(".side-dock .dock-face, .dock-recall").forEach((e) => {
        if (!vis(e)) return;
        const r = e.getBoundingClientRect();
        if (r.left > W / 2) right = Math.max(right, W - r.left + 10);
      });
      // The floating bubble can be parked anywhere: lift the arrow over it when they would meet.
      const bub = document.querySelector(".float-bubble");
      if (vis(bub)) {
        const r = bub.getBoundingClientRect();
        const ax = W - right - 40;
        const ay = H - bottom - 40;
        if (r.left < W - right && r.right > ax && r.top < H - bottom && r.bottom > ay) bottom = H - r.top + 10;
      }
      let z = 32;
      if (s) {
        for (let e: HTMLElement | null = s; e; e = e.parentElement) {
          const st = getComputedStyle(e);
          if (st.position === "fixed" && st.zIndex !== "auto") { z = Number(st.zIndex) + 1; break; }
        }
      }
      setPos((p) => (p.right === right && p.bottom === bottom && p.z === z ? p : { right, bottom, z }));
    };
    const check = () => {
      raf = 0;
      const s = target.current;
      if (s && !s.isConnected) target.current = null;
      const t = topOf(target.current);
      const vh = viewOf(target.current);
      // Far down to appear (about a screen), near the top to go: no flicker in between.
      const next = shown.current ? t > Math.min(240, vh * 0.3) : t > Math.max(480, vh * 0.9);
      if (next !== shown.current) { shown.current = next; setShow(next); }
      if (next) place();
    };
    const onScroll = (e: Event) => {
      const el = e.target;
      if (el === document || el === document.documentElement || el === document.body) target.current = null;
      else if (el instanceof HTMLElement) {
        // Only page-sized scrollers count (not a chip strip or a small list inside a card).
        if (el.clientHeight < window.innerHeight * 0.55 || el.scrollHeight <= el.clientHeight + 4) return;
        target.current = el;
      } else return;
      if (!raf) raf = requestAnimationFrame(check);
    };
    const tick = window.setInterval(() => { if (shown.current) check(); }, 700);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", check);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", check);
      window.clearInterval(tick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const up = () => {
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const s = target.current;
    if (s) s.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  };

  return (
    <button
      type="button"
      className={`to-top${show ? " is-on" : ""}`}
      style={{ right: `calc(${pos.right}px + env(safe-area-inset-right, 0px))`, bottom: `max(${pos.bottom}px, calc(16px + env(safe-area-inset-bottom, 0px)))`, zIndex: pos.z }}
      aria-label={lang === "en" ? "Back to top" : "Volver arriba"}
      aria-hidden={show ? undefined : true}
      tabIndex={show ? 0 : -1}
      onClick={up}
    >
      <ChevronUp aria-hidden />
    </button>
  );
}
