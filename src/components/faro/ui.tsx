import { useEffect, useRef, type ReactNode } from "react";
import { Info } from "lucide-react";

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
  const box = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = box.current;
      if (!el?.open || el.contains(e.target as Node)) return;
      el.open = false;
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return (
    <details className="relative" ref={box}>
      <summary className="icon-btn list-none" aria-label={label}>
        <Info className="size-4" aria-hidden />
      </summary>
      <div className="card explain-pop text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-2">{meaning}</p>
        <p className="mt-2 text-muted">{formula}</p>
        <p className="mt-2">{implication}</p>
      </div>
    </details>
  );
}
