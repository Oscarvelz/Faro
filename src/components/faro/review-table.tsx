/**
 * FARO — Captura Inteligente, Ola 1: la mesa de revisión universal
 * (brief BRIEF-OLA-1 §5-P2). Una sola mesa para todo lo que entra: filas
 * compactas con los tres estados (seguro, ámbar adivinado, rojo no
 * entendido) y toda duda con su herramienta en la misma fila (fallo D4).
 *
 * La mesa es UNA transacción: las correcciones viven en una copia local y
 * Guardar es un solo commit («Revisión») que parchea, crea las líneas de
 * las filas marcadas, retira esos borradores y aprende las correcciones —
 * Cancelar no toca nada. El detalle de una fila se edita con los campos
 * del editor de siempre (DayField, ThemeSelect, FreqPick, el selector de
 * casas del importador): no hay un segundo editor, y la línea solo nace
 * en el commit de la mesa — nunca hay línea y borrador gemelos.
 *
 * Forma simple (Esencial, capture.review): confirmar, corregir lo
 * esencial, descartar. Forma completa (Ritmo, capture.review-full):
 * reclasificar en bache y «recordar esta tienda así» sin salir de la mesa.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Trash2, X } from "lucide-react";
import { splitTarget, targets } from "@/lib/faro/bankbook";
import { freqPresetsOf } from "@/lib/faro/cadence";
import { commitDrafts, draftToLine, draftTotals, dropDraft, learnFromSaved, patchDraft, validateDraft } from "@/lib/faro/drafts";
import { parseAmount } from "@/lib/faro/money";
import type { Draft, Line } from "@/lib/faro/types";
import { useLayer } from "@/lib/manual/back";
import { FreqPick } from "./fit-pick";
import { Hint } from "./hint";
import { DayField, ThemeSelect } from "./line-form";
import { useFaro } from "./provider";
import "./scan.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const money = (minor: number | null) => (minor == null ? "" : (minor / 100).toFixed(2));
const sym = (c: string) => (c === "USD" ? "$" : "C$");
const fmtAmt = (minor: number, c: string) => `${sym(c)}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MISSING_PHRASE: Record<string, [string, string]> = {
  concept: ["No encontré el concepto", "I couldn't find what it is"],
  amount: ["No encontré el monto", "I couldn't find the amount"],
  currency: ["No supe la moneda", "I couldn't tell the currency"],
  sign: ["No supe si entra o sale", "I couldn't tell if it comes in or goes out"],
  day: ["No encontré el día", "I couldn't find the day"],
};

const targetOf = (d: Draft) => `${d.book}|${d.cat ?? ""}|${d.sub ?? ""}`;

export function ReviewTable({ onClose }: { onClose: () => void }) {
  const { session, commit, key, lang, names, has } = useFaro();
  const ledger = session?.ledger;
  const full = has("capture.review-full");
  const tray = useMemo(() => (ledger?.drafts ?? []).filter((d) => d.kind === "line"), [ledger]);
  const [work, setWork] = useState<Draft[]>(() => tray);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [checked, setChecked] = useState<Record<string, boolean>>(() => Object.fromEntries(tray.map((d) => [d.id, !d.dupOf])));
  const [amountText, setAmountText] = useState<Record<string, string>>(() => Object.fromEntries(tray.map((d) => [d.id, money(d.amountMinor)])));
  const [remember, setRemember] = useState<Record<string, boolean>>({});
  const [batchHouse, setBatchHouse] = useState("");
  useLayer(true, onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const houseOpts = useMemo(() => (ledger ? targets(ledger.structure, names) : []), [ledger, names]);
  const houseLabel = (d: Draft) => houseOpts.find((o) => o.value === targetOf(d))?.label
    ?? houseOpts.find((o) => o.value === `${d.book}|${d.cat ?? ""}|`)?.label
    ?? L(lang, "Sin casa", "No home");
  const dupLine = (d: Draft): Line | undefined => (d.dupOf && ledger
    ? Object.values(ledger.months).flatMap((m) => m.lines).find((l) => l.id === d.dupOf)
    : undefined);
  const presets = useMemo(() => (ledger ? freqPresetsOf(ledger) : []), [ledger]);

  const rows = work.filter((d) => !gone.has(d.id));
  const patch = (id: string, p: Partial<Draft>) => {
    setWork((w) => {
      const fake = { ...(ledger as NonNullable<typeof ledger>), drafts: w };
      return patchDraft(fake, id, p).drafts ?? w;
    });
  };
  // El texto del monto se queda crudo mientras se escribe (como en DraftCard);
  // el valor parseado viaja al borrador por el mismo patchDraft de la casa.
  const setAmount = (id: string, text: string) => {
    setAmountText((a) => ({ ...a, [id]: text }));
    patch(id, { amountMinor: parseAmount(text) });
  };
  const rememberOn = (d: Draft) => remember[d.id] ?? (targetOf(d) !== targetOf(tray.find((x) => x.id === d.id) ?? d));
  const checkedRows = rows.filter((d) => checked[d.id]);
  // El concepto vacío también bloquea: una línea sin nombre no nace (la
  // misma puerta del editor y del antiguo «ready» del escaneo).
  const redChecked = checkedRows.some((d) => validateDraft(d).missing.length > 0 || !d.concept.trim());
  const totals = draftTotals(checkedRows);
  const canSave = checkedRows.length > 0 && !redChecked;

  function save() {
    if (!ledger || !canSave || !has("capture.review")) return;
    const ctx = { monthKey: key, structure: ledger.structure, lang };
    const originals = new Map(tray.map((d) => [d.id, d]));
    const pairs = checkedRows
      .map((d) => {
        const line = draftToLine(d, ctx);
        const orig = originals.get(d.id);
        return line && orig ? { draft: orig, line, force: rememberOn(d) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
    const ids = checkedRows.map((d) => d.id);
    const edited = rows.filter((d) => JSON.stringify(d) !== JSON.stringify(originals.get(d.id)));
    commit((s) => {
      let next = s;
      for (const d of edited) {
        const { id: _i, source: _s, kind: _k, raw: _r, createdAt: _c, ...fields } = d;
        next = patchDraft(next, d.id, fields);
      }
      for (const id of gone) next = dropDraft(next, id);
      next = commitDrafts(next, ids, ctx);
      next = learnFromSaved(next, pairs);
      return next;
    }, L(lang, `Revisión ${ids.length}`, `Review ${ids.length}`));
    onClose();
  }

  const applyBatchHouse = () => {
    if (!batchHouse) return;
    const t = splitTarget(batchHouse);
    for (const d of checkedRows) patch(d.id, { book: t.kind, cat: t.categoryId, sub: t.subId });
    setBatchHouse("");
  };

  return createPortal(
    <div className="scn-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="scn-sheet rev-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Revisar la bandeja", "Review the tray")}>
        <div className="scn-head">
          <span className="scn-badge" aria-hidden><ClipboardList /></span>
          <h3 className="lab-head">{L(lang, "Revisar", "Review")}<Hint topic="captura-mesa" /></h3>
          <button type="button" className="scn-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="scn-body">
          {full && checkedRows.length > 0 ? (
            <div className="rev-batch">
              <span className="rev-batch-lab">{L(lang, "Casa para las marcadas", "Home for the checked rows")}</span>
              <ThemeSelect value={batchHouse} onChange={setBatchHouse} options={[{ value: "", label: L(lang, "Elegir casa…", "Choose a home…") }, ...houseOpts]} />
              <button type="button" className="btn secondary rev-batch-go" disabled={!batchHouse} onClick={applyBatchHouse}>{L(lang, "Aplicar", "Apply")}</button>
            </div>
          ) : null}
          {rows.map((d) => {
            const v = validateDraft(d);
            const missing = d.concept.trim() ? v.missing : ["concept", ...v.missing];
            const un = (f: string) => (d.unsure.includes(f) ? " is-unsure" : "");
            const dup = dupLine(d);
            const recur = d.book === "subscription" || d.book === "expense-fixed";
            return (
              <div key={d.id} className={`rev-row${checked[d.id] ? "" : " is-off"}${missing.length ? " is-missing" : ""}`} data-anchor="rev-row">
                <div className="rev-r1">
                  <button type="button" role="switch" className="scn-switch" aria-checked={!!checked[d.id]} aria-label={L(lang, "Incluir", "Include")} onClick={() => setChecked((c) => ({ ...c, [d.id]: !c[d.id] }))}><i /></button>
                  <input className={`field rev-concept${un("concept")}${missing.includes("concept") ? " is-missing-f" : ""}`} value={d.concept} placeholder={L(lang, "Concepto", "Concept")} aria-label={L(lang, "Concepto", "Concept")} onChange={(e) => patch(d.id, { concept: e.target.value })} />
                  <button type="button" className="scn-del" aria-label={L(lang, "Descartar", "Discard")} onClick={() => setGone((g) => new Set(g).add(d.id))}><Trash2 /></button>
                </div>
                <div className="rev-r2">
                  <span className={`scn-amt${un("amount")}${missing.includes("amount") ? " is-missing-f" : ""}`}>
                    <button type="button" className="scn-cur" aria-label={d.currency ?? L(lang, "Moneda", "Currency")} onClick={() => patch(d.id, { currency: d.currency === "USD" ? "NIO" : "USD" })}>{d.currency === "NIO" ? "C$" : "$"}</button>
                    <input className="field num" inputMode="decimal" value={amountText[d.id] ?? ""} placeholder="0.00" aria-label={L(lang, "Monto", "Amount")} onChange={(e) => setAmount(d.id, e.target.value)} />
                  </span>
                  <span className={`scn-day${un("date")}${missing.includes("day") ? " is-missing-f" : ""}`}><DayField value={d.day} onChange={(v) => patch(d.id, { day: v })} /></span>
                  {missing.includes("sign") ? (
                    <span className="rev-sign" role="group" aria-label={L(lang, "Entra o sale", "In or out")}>
                      <button type="button" className={d.sign === "in" ? "is-on" : ""} onClick={() => patch(d.id, { sign: "in" })}>{L(lang, "Entra", "In")}</button>
                      <button type="button" className={d.sign === "out" ? "is-on" : ""} onClick={() => patch(d.id, { sign: "out" })}>{L(lang, "Sale", "Out")}</button>
                    </span>
                  ) : null}
                  {recur && full ? <span className={`scn-freq${un("cadence")}`}><FreqPick value={d.cadence || "monthly"} presets={presets} onChange={(v) => patch(d.id, { cadence: v })} /></span> : null}
                </div>
                <div className="rev-r3">
                  {full
                    ? <span className="rev-house"><ThemeSelect value={targetOf(d)} onChange={(v) => { const t = splitTarget(v); patch(d.id, { book: t.kind, cat: t.categoryId, sub: t.subId }); }} options={[{ value: `${d.book}||`, label: L(lang, "Sin casa", "No home") }, ...houseOpts]} /></span>
                    : <span className="rev-house is-static">{houseLabel(d)}</span>}
                  <input className="field rev-note" value={d.note} placeholder={L(lang, "Nota", "Note")} aria-label={L(lang, "Nota", "Note")} onChange={(e) => patch(d.id, { note: e.target.value })} />
                </div>
                {full ? (
                  <label className="rev-remember">
                    <button type="button" role="switch" aria-checked={rememberOn(d)} className="scn-switch is-small" aria-label={L(lang, "Recordar esta tienda así", "Remember this store this way")} onClick={() => setRemember((r) => ({ ...r, [d.id]: !rememberOn(d) }))}><i /></button>
                    <span>{L(lang, "Recordar esta tienda así", "Remember this store this way")}</span>
                  </label>
                ) : null}
                {missing.map((f) => (
                  <p key={f} className="rev-missing">{L(lang, MISSING_PHRASE[f]![0], MISSING_PHRASE[f]![1])}</p>
                ))}
                {dup ? <p className="rev-dup">{L(lang, "Ya está en tus libros", "Already in your books")}: {dup.concept} · {fmtAmt(dup.amountMinor, dup.currency)}</p> : null}
              </div>
            );
          })}
          {!rows.length ? <p className="scn-empty">{L(lang, "La bandeja está vacía.", "The tray is empty.")}</p> : null}
        </div>
        <div className="scn-foot rev-foot">
          <div className="rev-totals" aria-live="polite">
            {totals.map((r) => (
              <span key={r.currency} className="rev-total">
                {r.outMinor ? <>{L(lang, "Salen", "Out")} <b>{fmtAmt(r.outMinor, r.currency)}</b></> : null}
                {r.outMinor && r.inMinor ? " · " : null}
                {r.inMinor ? <>{L(lang, "Entran", "In")} <b>{fmtAmt(r.inMinor, r.currency)}</b></> : null}
              </span>
            ))}
          </div>
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
          <button type="button" className="btn" disabled={!canSave} onClick={save}>{L(lang, `Guardar ${checkedRows.length}`, `Save ${checkedRows.length}`)}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
