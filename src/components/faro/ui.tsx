import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Calculator, CircleHelp, Compass, X } from "lucide-react";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";

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
  topic,
  title,
  meaning,
  formula,
  implication,
  label,
  legend,
}: {
  /** With a topic, the trigger is the standard (?) bubble and this sheet opens from its "Ver el cálculo". */
  topic?: string;
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
  }, [open]);
  // Esc and phone back close the sheet only (never also step the app back a screen).
  useLayer(open && !leaving, close);
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
      {topic ? (
        <Hint topic={topic} calc={() => setOpen(true)} />
      ) : (
        <button type="button" className="icon-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <CircleHelp className="size-4" aria-hidden />
        </button>
      )}
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

// A small "?" beside a field: one plain sentence about what it asks, read from the manual topic (same words as
// the manual's "Qué es"). One open at a time; a tap outside, Esc or phone back closes it.
export function FieldTip({ topic, alt = false }: { topic: string; alt?: boolean }) {
  return <Hint topic={topic} alt={alt} className="is-field" />;
}
