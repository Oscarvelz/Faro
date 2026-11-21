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
import { livePlans, planRows, planTotals } from "@/lib/faro/plan";
import type { Draft, DraftSource } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { CaptureTextSheet } from "./capture-text";
import { CaptureListSheet } from "./capture-list";
import { PlanSheet } from "./plan-sheet";
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
  /* La lista-plan (D6): la tarjeta aprende una segunda línea SOLO cuando
   * hay planes vivos — dos esperas distintas en una misma casa, cada una
   * con su conteo; el widget del teléfono no las suma (mezclarlas
   * mentiría). Sin planes, la tarjeta es la de siempre. */
  const plans = useMemo(
    () => (session && has("capture.plan") ? livePlans(session.ledger) : []),
    [session, has],
  );
  /* Ola 21 (Q21-1): el guardia anti-cadáver gobierna la TARJETA, no la
   * vida de la hoja que hospeda. Antes, el `return null` con la bandeja
   * vacía se llevaba también la hoja y la mesa abiertas cuando otra
   * mano resolvía la bandeja bajo ellas: la superficie moría en
   * silencio con lo tecleado dentro. Ahora la tarjeta nace solo con
   * borradores (y su asiento), y el null exige además que ninguna
   * vista esté abierta: una vista abierta vive hasta que la persona
   * la cierra — la hoja trae su palabra de vacío y la mesa, la suya. */
  const cardLive = has("capture.tray") && (drafts.length > 0 || plans.length > 0);
  if (!cardLive && view === "none") return null;
  const totals = draftTotals(drafts);
  const allHaveAmount = drafts.length > 0 && drafts.every((d) => d.amountMinor != null && d.currency != null);
  return (
    <>
      {cardLive ? (
      <button type="button" className="tray-card" data-anchor="capture-tray" onClick={() => setView("sheet")}>
        <span className="tray-ic" aria-hidden><Inbox /></span>
        <span className="tray-txt">
          <strong>{L(lang, "Bandeja", "Tray")}</strong>
          <span>{drafts.length ? L(lang, `${drafts.length} por revisar`, `${drafts.length} to review`) : L(lang, "Nada por revisar", "Nothing to review")}</span>
          {plans.length ? (
            <span>{L(lang, `Planes · ${plans.length} en curso`, `Plans · ${plans.length} under way`)}</span>
          ) : null}
        </span>
        {allHaveAmount && totals.length ? (
          <span className="tray-total num">{totals.map((r) => fmtAmt(r.inMinor + r.outMinor, r.currency)).join(" · ")}</span>
        ) : null}
      </button>
      ) : null}
      {view === "sheet" ? <TraySheet onClose={() => setView("none")} onReview={() => setView("table")} /> : null}
      {view === "table" ? <ReviewTable onClose={() => setView("none")} /> : null}
    </>
  );
}

function TraySheet({ onClose, onReview }: { onClose: () => void; onReview: () => void }) {
  const { session, commitGuarded, lang, has } = useFaro();
  const canTray = has("capture.tray");
  const canText = has("capture.text");
  const canList = has("capture.list");
  const canPlan = has("capture.plan");
  const [armed, setArmed] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [listing, setListing] = useState(false);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const plans = session && canPlan ? livePlans(session.ledger) : [];
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
          {canText ? (
            <button type="button" className="btn secondary tray-write" data-anchor="tray-write" onClick={() => setWriting(true)}>
              {L(lang, "Escribir como pienso", "Write it as I think it")}
            </button>
          ) : null}
          {canList ? (
            <button type="button" className="btn secondary tray-write" data-anchor="tray-list" onClick={() => setListing(true)}>
              {L(lang, "Pegar una lista", "Paste a list")}
            </button>
          ) : null}
          {groups.map(([day, ds]) => (
            <div key={day} className="tray-group">
              <p className="tray-day">{day}</p>
              {ds.map((d) => (
                <div key={d.id} className="tray-row" data-anchor="tray-row">
                  <span className="tray-src">{L(lang, SOURCE_WORD[d.source][0], SOURCE_WORD[d.source][1])}</span>
                  <span className="tray-main">
                    <strong>{d.concept || L(lang, "(sin concepto)", "(no concept)")}</strong>
                    <span className="tray-meta">{d.day}</span>
                  </span>
                  {d.amountMinor != null && d.currency
                    ? <span className="tray-amt num">{fmtAmt(d.amountMinor, d.currency)}</span>
                    : <span className="tray-amt is-none">{L(lang, "sin monto", "no amount")}</span>}
                  <button type="button" className={`tray-drop${armed === d.id ? " is-armed" : ""}`} aria-label={L(lang, "Descartar", "Discard")} onClick={() => drop(d)}>
                    {armed === d.id ? L(lang, "¿Descartar?", "Discard?") : <Trash2 />}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {!drafts.length && !plans.length ? <p className="scn-empty">{L(lang, "La bandeja está vacía.", "The tray is empty.")}</p> : null}
          {plans.length ? (
            <div data-anchor="tray-plans">
              <p className="tray-plans-head">{L(lang, "Planes", "Plans")}</p>
              {plans.map((p) => {
                const rows = session ? planRows(session.ledger, p.id) : [];
                const t = planTotals(rows);
                return (
                  <button key={p.id} type="button" className="tray-plan-card" data-anchor="tray-plan-card" onClick={() => setOpenPlan(p.id)}>
                    <span className="plan-main">
                      <strong>{p.name}</strong>
                      <span className="plan-note">{L(lang, `${t.bought} de ${t.total}`, `${t.bought} of ${t.total}`)}</span>
                    </span>
                    <span className="plan-bar" aria-hidden><span className="plan-bar-fill" style={{ width: `${t.total ? Math.round((t.bought / t.total) * 100) : 0}%` }} /></span>
                    {t.real.length ? <span className="tray-amt num">{t.real.map((r) => fmtAmt(r.minor, r.currency)).join(" · ")}</span> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="scn-foot">
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cerrar", "Close")}</button>
          <button type="button" className="btn" disabled={!drafts.length} onClick={onReview}>{L(lang, "Revisar", "Review")}</button>
        </div>
      </div>
      {writing ? <CaptureTextSheet onClose={() => setWriting(false)} onReview={() => { setWriting(false); onReview(); }} /> : null}
      {listing ? <CaptureListSheet onClose={() => setListing(false)} onReview={() => { setListing(false); onReview(); }} /> : null}
      {openPlan ? <PlanSheet planId={openPlan} onClose={() => setOpenPlan(null)} /> : null}
    </div>,
    document.body,
  );
}
