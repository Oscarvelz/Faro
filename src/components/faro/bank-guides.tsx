/* Importer "how to download" chips editor (1.3.79): same look as the Cuotas gear editors. Remove, reorder, add your own bank
 * or card (name, small icon, short steps); "Añadir tasas" opens the Bancos y recompensas card form, so its rates live in the same accounts. */
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Percent, Plus, X } from "lucide-react";
import { shrinkIcon } from "@/lib/faro/icon";
import { uid } from "@/lib/faro/money";
import { GUIDE_BUILTIN, guideName, importBook, targets, type NewAcct } from "@/lib/faro/bankbook";
import type { AcctKind, BankGuide, LedgerState } from "@/lib/faro/types";
import { AddCard } from "./bank-settings";
import { useFaro } from "./provider";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

export function GuideMark({ g }: { g: BankGuide }) {
  return g.icon ? <img className="sub-chip-mark" src={g.icon} alt="" /> : null;
}

export function GuideEditor({ lang, state, guides, onSave, onClose }: { lang: string; state: LedgerState; guides: BankGuide[]; onSave: (next: BankGuide[], fresh: Record<string, NewAcct>) => void; onClose: () => void }) {
  const { names } = useFaro();
  const [draft, setDraft] = useState<BankGuide[]>(guides);
  const [fresh, setFresh] = useState<Record<string, NewAcct>>({});
  const [rates, setRates] = useState<string | null>(null);
  const [own, setOwn] = useState("");
  const [ownIcon, setOwnIcon] = useState("");
  const [steps, setSteps] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const move = (i: number, d: number) => setDraft((list) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const patch = (i: number, p: Partial<BankGuide>) => setDraft((list) => list.map((g, k) => (k === i ? { ...g, ...p } : g)));
  const addOwn = () => {
    const n = own.trim();
    if (!n) return;
    setDraft((list) => [...list, { id: `g-${uid()}`, name: n.slice(0, 32), ...(ownIcon ? { icon: ownIcon } : {}), ...(steps.trim() ? { steps: steps.trim().slice(0, 600) } : {}) }]);
    setOwn(""); setOwnIcon(""); setSteps("");
  };
  const rest = Object.keys(GUIDE_BUILTIN).filter((id) => !draft.some((g) => g.id === id));
  const kindName = (k: AcctKind) => k === "card" ? L(lang, "Tarjeta de crédito", "Credit card") : k === "checking" ? L(lang, "Débito o cuenta", "Debit or checking") : L(lang, "Ahorros o billetera", "Savings or wallet");
  const ratesFor = draft.find((g) => g.id === rates);
  const save = () => {
    // A name typed but not yet added with + still counts.
    const all = own.trim() ? [...draft, { id: `g-${uid()}`, name: own.trim().slice(0, 32), ...(ownIcon ? { icon: ownIcon } : {}), ...(steps.trim() ? { steps: steps.trim().slice(0, 600) } : {}) }] : draft;
    const out: BankGuide[] = all.map((g): BankGuide => GUIDE_BUILTIN[g.id] ? { id: g.id } : { ...g, name: (g.name ?? "").trim() }).filter((g) => GUIDE_BUILTIN[g.id] || g.name);
    onSave(out, fresh);
    onClose();
  };
  return (
    <div className="sub-edit bg-edit" data-test="guide-edit">
      <ul className="sub-edit-list">
        {draft.map((g, i) => {
          const mine = !GUIDE_BUILTIN[g.id];
          const has = !!(g.acct || fresh[g.id]);
          return (
            <li key={g.id} className={mine ? "is-own" : undefined}>
              <GuideMark g={g} />
              {mine ? <input className="field" aria-label={L(lang, "Nombre", "Name")} value={g.name ?? ""} onChange={(e) => patch(i, { name: e.target.value })} />
                : <span className="field bg-fixed">{guideName(g)}</span>}
              {mine ? <button type="button" className={`bg-rates${has ? " is-set" : ""}`} aria-pressed={rates === g.id} aria-label={has ? L(lang, "Tasas añadidas", "Rates added") : L(lang, "Añadir tasas", "Add rates")} disabled={!!g.acct} onClick={() => setRates(rates === g.id ? null : g.id)}><Percent /></button> : null}
              <button type="button" aria-label={L(lang, "Subir", "Move up")} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></button>
              <button type="button" aria-label={L(lang, "Bajar", "Move down")} disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ChevronDown /></button>
              <button type="button" className="is-drop" aria-label={L(lang, `Quitar ${guideName(g)}`, `Remove ${guideName(g)}`)} onClick={() => { setDraft((list) => list.filter((_, k) => k !== i)); if (rates === g.id) setRates(null); }}><X /></button>
            </li>
          );
        })}
      </ul>
      {ratesFor ? (
        <AddCard lang={lang} list={targets(state.structure, names)} bonus={importBook(state).bonus ?? []} kindName={kindName} initialName={ratesFor.name}
          onCancel={() => setRates(null)} onSave={(n) => { setFresh({ ...fresh, [ratesFor.id]: n }); setRates(null); }} />
      ) : null}
      {ratesFor ? null : <>
      {rest.length ? (
        <div className="sub-edit-pool" aria-label={L(lang, "Añadir de la lista", "Add from the list")}>
          {rest.map((id) => <button key={id} type="button" onClick={() => setDraft((list) => [...list, { id }])}>{GUIDE_BUILTIN[id][1]}</button>)}
        </div>
      ) : null}
      <div className="sub-edit-own">
        <button type="button" className="sub-edit-icon" aria-label={L(lang, "Icono propio", "Own icon")} onClick={() => fileRef.current?.click()}>
          {ownIcon ? <img src={ownIcon} alt="" /> : <ImagePlus />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden data-test="guide-icon-file" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) { try { setOwnIcon(await shrinkIcon(file)); } catch { /* not an image */ } }
        }} />
        <input className="field" placeholder={L(lang, "Otro banco o tarjeta", "Other bank or card")} aria-label={L(lang, "Otro banco o tarjeta", "Other bank or card")} value={own} onChange={(e) => setOwn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }} />
        <button type="button" className="sub-edit-add" aria-label={L(lang, "Añadir", "Add")} disabled={!own.trim()} onClick={addOwn}><Plus /></button>
      </div>
      {own.trim() ? <textarea className="field bg-steps" rows={2} maxLength={600} placeholder={L(lang, "Cómo descargarlo (opcional)", "How to download it (optional)")} aria-label={L(lang, "Cómo descargarlo", "How to download it")} value={steps} onChange={(e) => setSteps(e.target.value)} /> : null}
      <div className="cobro-actions">
        <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
      </>}
    </div>
  );
}

