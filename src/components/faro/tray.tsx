/**
 * FARO — Captura Inteligente, Ola 1: la bandeja (brief BRIEF-OLA-1 §5-P3).
 * La tarjeta vive en Central SOLO cuando hay borradores esperando — con
 * cero, no existe: nada de tarjetas fantasma. Su hoja lista los borradores
 * por día de llegada, cada uno con su origen en una palabra, y dos caminos:
 * Revisar (abre la mesa con todos) y la papelera (con su confirmación de
 * dos toques, como manda el gradiente de verbos de la casa).
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Inbox, Trash2, X } from "lucide-react";
import { draftTotals, dropDraft } from "@/lib/faro/drafts";
import type { Draft, DraftSource } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { Hint } from "./hint";
import { useFaro } from "./provider";
import { ReviewTable } from "./review-table";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SOURCE_WORD: Record<DraftSource, [string, string]> = {
  photo: ["Foto", "Photo"],
  bank: ["Banco", "Bank"],
  text: ["Texto", "Text"],
  voice: ["Voz", "Voice"],
  excel: ["Excel", "Excel"],
  pdf: ["PDF", "PDF"],
  list: ["Lista", "List"],
  notice: ["Aviso", "Notice"],
};

export function TrayCard() {
  const { session, lang, has } = useFaro();
  const [view, setView] = useState<"none" | "sheet" | "table">("none");
  const drafts = useMemo(
    () => (session?.ledger.drafts ?? []).filter((d) => d.kind === "line"),
    [session],
  );
  if (!has("capture.tray") || drafts.length === 0) return null;
  const totals = draftTotals(drafts);
  const allHaveAmount = drafts.every((d) => d.amountMinor != null && d.currency != null);
  return (
    <>
      <button type="button" className="tray-card" data-anchor="capture-tray" onClick={() => setView("sheet")}>
        <span className="tray-ic" aria-hidden><Inbox /></span>
        <span className="tray-txt">
          <strong>{L(lang, "Bandeja", "Tray")}</strong>
          <span>{L(lang, `${drafts.length} por revisar`, `${drafts.length} to review`)}</span>
        </span>
        {allHaveAmount && totals.length ? (
          <span className="tray-total num">{totals.map((r) => fmtAmt(r.inMinor + r.outMinor, r.currency)).join(" · ")}</span>
        ) : null}
      </button>
      {view === "sheet" ? <TraySheet onClose={() => setView("none")} onReview={() => setView("table")} /> : null}
      {view === "table" ? <ReviewTable onClose={() => setView("none")} /> : null}
    </>
  );
}

function TraySheet({ onClose, onReview }: { onClose: () => void; onReview: () => void }) {
  const { session, commitGuarded, lang, has } = useFaro();
  const canTray = has("capture.tray");
  const [armed, setArmed] = useState<string | null>(null);
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const drafts = (session?.ledger.drafts ?? []).filter((d) => d.kind === "line");
  const groups = useMemo(() => {
    const by = new Map<string, Draft[]>();
    for (const d of drafts) {
      const day = d.createdAt.slice(0, 10);
      by.set(day, [...(by.get(day) ?? []), d]);
    }
    return [...by.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [drafts]);
  const drop = (d: Draft) => {
    if (!canTray) return;
    if (armed !== d.id) { setArmed(d.id); return; }
    /* Ola 19 (integración): dropDraft se niega por identidad cuando el
     * borrador ya no vive (otra pestaña lo descartó o lo guardó) — la
     * negativa no deja marco: puerta guardada, como manda la clase A. */
    commitGuarded((s) => dropDraft(s, d.id), L(lang, "Descartar borrador", "Discard draft"));
    setArmed(null);
  };
  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet tray-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Bandeja", "Tray")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><Inbox /></span>
          <h3 className="lab-head">{L(lang, "Bandeja", "Tray")}<Hint topic="captura-mesa" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {groups.map(([day, ds]) => (
            <div key={day} className="tray-group">
              <p className="tray-day">{day}</p>
              {ds.map((d) => (
                <div key={d.id} className="tray-row" data-anchor="tray-row">
                  <span className="tray-src">{L(lang, SOURCE_WORD[d.source][0], SOURCE_WORD[d.source][1])}</span>
                  <span className="tray-main">
                    <strong>{d.concept || L(lang, "(sin concepto)", "(no concept)")}</strong>
                    <span>{d.amountMinor != null && d.currency ? fmtAmt(d.amountMinor, d.currency) : L(lang, "sin monto", "no amount")} · {d.day}</span>
                  </span>
                  <button type="button" className={`tray-drop${armed === d.id ? " is-armed" : ""}`} aria-label={L(lang, "Descartar", "Discard")} onClick={() => drop(d)}>
                    {armed === d.id ? L(lang, "¿Descartar?", "Discard?") : <Trash2 />}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {!drafts.length ? <p className="scn-empty">{L(lang, "La bandeja está vacía.", "The tray is empty.")}</p> : null}
        </div>
        <div className="scn-foot">
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cerrar", "Close")}</button>
          <button type="button" className="btn" disabled={!drafts.length} onClick={onReview}>{L(lang, "Revisar", "Review")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
