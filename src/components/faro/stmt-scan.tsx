/**
 * "Leer estado" (Retiro): photograph a paper statement, read it on the device (OCR, nothing uploaded), review, save.
 * The OCR code (lib/faro/ocrrun + ./ocr/) loads only when a photo is chosen. Nothing is saved until Guardar,
 * and the photo is never kept: only a small thumbnail lives in memory while the sheet is open.
 */
import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { STMT_KEYS, amountMinor, parseStatement, type StmtKey, type StmtRead } from "@/lib/faro/stmtocr";
import { useLayer } from "@/lib/manual/back";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import "./stmt.css";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const NAMES: Record<StmtKey, [string, string]> = {
  value: ["Valor de la cuenta", "Account value"],
  contrib: ["Aportes", "Contributions"],
  change: ["Cambio de valor", "Change in value"],
  withdraw: ["Retiros", "Withdrawals"],
  fees: ["Cargos", "Fees"],
};
const show = (minor: number | null) => (minor == null ? "" : `${minor < 0 ? "-" : ""}${(Math.abs(minor) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const parse = (v: string) => { const s = v.trim(); if (!s) return null; return amountMinor(/[.,]\d{2}$/.test(s) ? s : `${s}.00`); };

export type StmtSave = StmtRead;

type Draft = { read: StmtRead; text: Record<StmtKey, string>; on: Record<StmtKey, boolean>; thumb: string };

export function StmtScan({ seen, onSave }: { seen: (month: string) => boolean; onSave: (read: StmtSave) => void }) {
  const { session } = useFaro();
  const lang = session?.ledger.settings.lang ?? "es";
  const [busy, setBusy] = useState<{ stage: "load" | "read"; p: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fail, setFail] = useState("");

  async function take(file: File | undefined) {
    if (!file) return;
    setFail("");
    setBusy({ stage: "load", p: 0 });
    try {
      const run = await import("@/lib/faro/ocrrun");
      const injected = (window as Window & { __faroOcrText?: string }).__faroOcrText;
      const got = injected != null
        ? { text: injected, thumb: (await run.shrink(file)).thumb }
        : await run.readImage(file, (stage, p) => setBusy({ stage, p }));
      const read = parseStatement(got.text);
      const text = {} as Record<StmtKey, string>, on = {} as Record<StmtKey, boolean>;
      for (const k of STMT_KEYS) { text[k] = show(read[k]); on[k] = read[k] != null; }
      setDraft({ read, text, on, thumb: got.thumb });
    } catch {
      setFail(L(lang, "No pude leer la foto. Prueba con más luz.", "Could not read the photo. Try more light."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stm-row">
      <label className="stm-btn">
        <Camera aria-hidden />
        <span>{L(lang, "Leer estado", "Scan statement")}</span>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <label className="stm-btn is-icon" aria-label={L(lang, "Elegir foto", "Pick a photo")}>
        <ImageUp aria-hidden />
        <input type="file" accept="image/*" onChange={(e) => { void take(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <Hint topic="leer-estado" />
      {busy ? (
        <span className="stm-busy" role="status">
          <span>{busy.stage === "load" ? L(lang, "Preparando", "Preparing") : L(lang, "Leyendo", "Reading")}</span>
          <i aria-hidden><b style={{ width: `${Math.round(busy.p * 100)}%` }} /></i>
        </span>
      ) : fail ? <span className="stm-fail">{fail}</span> : null}
      {draft ? (
        <StmtReview
          draft={draft}
          lang={lang}
          seen={seen}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={(r) => { onSave(r); setDraft(null); }}
        />
      ) : null}
    </div>
  );
}

function StmtReview({ draft, lang, seen, onChange, onClose, onSave }: {
  draft: Draft; lang: string; seen: (month: string) => boolean;
  onChange: (d: Draft) => void; onClose: () => void; onSave: (r: StmtRead) => void;
}) {
  // The sheet owns a history entry: the phone's back closes it.
  useLayer(true, onClose);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const end = draft.read.end;
  const month = end.slice(0, 7);
  const dup = !!month && seen(month);
  const sym = draft.read.currency === "NIO" ? "C$" : "$";
  const anyOn = STMT_KEYS.some((k) => draft.on[k] && parse(draft.text[k]) != null);

  function save() {
    const out = { ...draft.read, month } as StmtRead;
    for (const k of STMT_KEYS) out[k] = draft.on[k] ? parse(draft.text[k]) : null;
    onSave(out);
  }

  return (
    <div className="stm-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="stm-sheet" role="dialog" aria-modal="true" aria-label={L(lang, "Leer estado", "Scan statement")}>
        <div className="stm-head">
          <span className="stm-badge" aria-hidden><Camera /></span>
          <h3 className="lab-head">{L(lang, "Revisar estado", "Check statement")}<Hint topic="leer-estado" /></h3>
          <button type="button" className="stm-x" aria-label={L(lang, "Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="stm-body">
          <div className="stm-top">
            {draft.thumb ? <img className="stm-thumb" src={draft.thumb} alt="" /> : null}
            <label className="stm-period">
              <span>{L(lang, "Fin del periodo", "Period end")}</span>
              <input className="field" type="date" value={end} onChange={(e) => onChange({ ...draft, read: { ...draft.read, end: e.target.value, month: e.target.value.slice(0, 7) } })} />
            </label>
          </div>
          {dup ? <p className="stm-warn" role="alert">{L(lang, "Este mes ya está guardado. Guardar lo reemplaza.", "This month is saved already. Save replaces it.")}</p> : null}
          <div className="stm-fields">
            {STMT_KEYS.map((k, i) => (
              <div key={k} className={`stm-field${draft.on[k] ? "" : " is-off"}`}>
                <button type="button" role="switch" className="stm-switch" aria-checked={draft.on[k]} aria-label={L(lang, NAMES[k][0], NAMES[k][1])} onClick={() => onChange({ ...draft, on: { ...draft.on, [k]: !draft.on[k] } })}><i /></button>
                <span className="stm-name">{L(lang, NAMES[k][0], NAMES[k][1])}</span>
                <span className="stm-amt">
                  <em aria-hidden>{sym}</em>
                  <input
                    ref={i === 0 ? first : undefined}
                    className="field num"
                    inputMode="decimal"
                    data-k={k}
                    value={draft.text[k]}
                    placeholder="0.00"
                    aria-label={L(lang, NAMES[k][0], NAMES[k][1])}
                    onChange={(e) => onChange({ ...draft, text: { ...draft.text, [k]: e.target.value }, on: { ...draft.on, [k]: e.target.value.trim() !== "" } })}
                  />
                </span>
              </div>
            ))}
          </div>
          <p className="stm-note">{L(lang, "La foto no se guarda ni sale del teléfono.", "The photo is never kept or sent anywhere.")}</p>
        </div>
        <div className="stm-foot">
          <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
          <button type="button" className="btn" disabled={!anyOn} onClick={save}>{L(lang, "Guardar", "Save")}</button>
        </div>
      </div>
    </div>
  );
}
