import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Calculator, CircleHelp, Compass, X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="faro-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="faro-dialog-title" className="serif text-2xl font-medium">
          {title}
        </h2>
        <div className="mt-3 grid gap-3">{children}</div>
      </div>
    </div>
  );
}

export function Explain({
  title,
  meaning,
  formula,
  implication,
  label,
  legend,
}: {
  title: string;
  meaning: string;
  formula: string;
  implication: string;
  label: string;
  legend?: string;
}) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const en = typeof document !== "undefined" && document.documentElement.lang === "en";
  const close = () => { setLeaving(true); window.setTimeout(() => { setOpen(false); setLeaving(false); }, 180); };
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // Shrink the text step by step until the whole explanation fits on screen without scrolling.
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const fit = () => {
      const el = sheet.current;
      if (!el) return;
      let sc = 1;
      el.style.setProperty("--xp-s", "1");
      while (el.scrollHeight > el.clientHeight + 1 && sc > 0.66) { sc -= 0.03; el.style.setProperty("--xp-s", sc.toFixed(2)); }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [open]);
  const parts = [
    { key: "what", Icon: BookOpen, head: en ? "What it is" : "Qué es", text: meaning },
    { key: "how", Icon: Calculator, head: en ? "How it's worked out" : "Cómo se calcula", text: formula },
    { key: "so", Icon: Compass, head: en ? "What it means for you" : "Qué significa para ti", text: implication },
    { key: "line", Icon: null, head: en ? "The amber dashed line" : "La línea ámbar punteada", text: legend ?? "" },
  ].filter((p) => p.text);
  return (
    <>
      <button type="button" className="icon-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <CircleHelp className="size-4" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div className={`xp-scrim${leaving ? " is-leaving" : ""}`} onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
              <div ref={sheet} className="xp-sheet" role="dialog" aria-modal="true" aria-label={title}>
                <i className="xp-grip" aria-hidden />
                <header className="xp-head">
                  <span className="xp-badge" aria-hidden><CircleHelp /></span>
                  <h3>{title}</h3>
                  <button ref={closeBtn} type="button" className="xp-x" aria-label={en ? "Close" : "Cerrar"} onClick={close}><X /></button>
                </header>
                <div className="xp-body">
                  {parts.map(({ key, Icon, head, text }) => (
                    <section key={key} className={`xp-part is-${key}`}>
                      <span className="xp-ico" aria-hidden>{Icon ? <Icon /> : null}</span>
                      <div>
                        <h4>{head}</h4>
                        <p>{text}</p>
                      </div>
                    </section>
                  ))}
                </div>
                <button type="button" className="xp-ok" onClick={close}>{en ? "Got it" : "Entendido"}</button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

// A small "?" beside a field: tap for one plain sentence about what it asks. One open at a time; tap anywhere to close.
export function FieldTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const pop = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { const n = e.target as Node; if (!ref.current?.contains(n) && !pop.current?.contains(n)) setOpen(false); };
    const other = (e: Event) => { if ((e as CustomEvent).detail !== ref.current) setOpen(false); };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("faro-tip", other);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("faro-tip", other); };
  }, [open]);
  useLayoutEffect(() => {
    const el = pop.current;
    if (!open || !el) return;
    // Fixed to the viewport so no card edge can clip it; kept 10px inside the screen.
    const btn = ref.current?.getBoundingClientRect();
    if (!btn) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.max(10, Math.min(btn.left - 10, window.innerWidth - 10 - w));
    const below = btn.bottom + 6;
    const top = below + h > window.innerHeight - 10 ? Math.max(10, btn.top - 6 - h) : below;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    const shut = () => setOpen(false);
    window.addEventListener("scroll", shut, { capture: true, passive: true, once: true });
    return () => window.removeEventListener("scroll", shut, { capture: true } as EventListenerOptions);
  }, [open]);
  return (
    <span className="ftip" ref={ref}>
      <button type="button" className="ftip-btn" aria-label={text} aria-expanded={open} onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        if (!open) document.dispatchEvent(new CustomEvent("faro-tip", { detail: ref.current }));
        setOpen((v) => !v);
      }}><CircleHelp aria-hidden /></button>
      {open ? createPortal(<span ref={pop} className="ftip-pop" role="tooltip" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}>{text}</span>, document.body) : null}
    </span>
  );
}

