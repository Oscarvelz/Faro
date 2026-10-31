import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Calculator, Compass, Info, X } from "lucide-react";

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
}: {
  title: string;
  meaning: string;
  formula: string;
  implication: string;
  label: string;
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
  const parts = [
    { key: "what", Icon: BookOpen, head: en ? "What it is" : "Qué es", text: meaning },
    { key: "how", Icon: Calculator, head: en ? "How it's worked out" : "Cómo se calcula", text: formula },
    { key: "so", Icon: Compass, head: en ? "What it means for you" : "Qué significa para ti", text: implication },
  ].filter((p) => p.text);
  return (
    <>
      <button type="button" className="icon-btn" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Info className="size-4" aria-hidden />
      </button>
      {open
        ? createPortal(
            <div className={`xp-scrim${leaving ? " is-leaving" : ""}`} onPointerDown={(e) => { if (e.target === e.currentTarget) close(); }}>
              <div className="xp-sheet" role="dialog" aria-modal="true" aria-label={title}>
                <i className="xp-grip" aria-hidden />
                <header className="xp-head">
                  <span className="xp-badge" aria-hidden><Info /></span>
                  <h3>{title}</h3>
                  <button ref={closeBtn} type="button" className="xp-x" aria-label={en ? "Close" : "Cerrar"} onClick={close}><X /></button>
                </header>
                <div className="xp-body">
                  {parts.map(({ key, Icon, head, text }) => (
                    <section key={key} className={`xp-part is-${key}`}>
                      <span className="xp-ico" aria-hidden><Icon /></span>
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
