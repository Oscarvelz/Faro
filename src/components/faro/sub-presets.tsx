/* Inline editor of the Cuotas preset chips (1.3.75): choose from the pool, add your own with a small icon, remove, reorder, rename. */
import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Repeat2, X } from "lucide-react";
import { SubMark } from "./icons";
import { shrinkIcon } from "@/lib/faro/icon";
import { uid } from "@/lib/faro/money";
import { SUB_POOL, poolName, presetName } from "@/lib/faro/subs";
import type { SubPreset } from "@/lib/faro/types";
import { FREQ_POOL, cadenceLabel, cadenceToken, type FreqUnit } from "@/lib/faro/cadence";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);

export function PresetMark({ p }: { p: SubPreset }) {
  if (p.icon) return <SubMark id={p.icon} className="sub-chip-mark" />;
  return SUB_POOL.some((row) => row[0] === p.id) ? <SubMark id={p.id} className="sub-chip-mark" /> : null;
}

export function SubPresetEditor({ lang, presets, onSave, onClose }: { lang: string; presets: SubPreset[]; onSave: (next: SubPreset[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SubPreset[]>(presets);
  const [own, setOwn] = useState("");
  const [ownIcon, setOwnIcon] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const move = (i: number, d: number) => setDraft((list) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const rename = (i: number, value: string) => setDraft((list) => list.map((p, k) => (k === i ? { ...p, name: value } : p)));
  const addOwn = () => {
    const n = own.trim();
    if (!n) return;
    setDraft((list) => [...list, { id: `c-${uid()}`, name: n.slice(0, 40), ...(ownIcon ? { icon: ownIcon } : {}) }]);
    setOwn("");
    setOwnIcon("");
  };
  const rest = SUB_POOL.filter((row) => !draft.some((p) => p.id === row[0]));
  const save = () => {
    // A pool name left equal to (or cleared back to) its brand name is stored bare, so the language switch still renames it.
    onSave(draft.map((p) => {
      const name = (p.name ?? "").trim();
      const pool = poolName(p.id, lang);
      if (pool && (!name || name === pool)) return { id: p.id };
      return { id: p.id, ...(name ? { name } : {}), ...(p.icon ? { icon: p.icon } : {}) };
    }).filter((p) => p.name || poolName(p.id, lang)));
    onClose();
  };
  return (
    <div className="sub-edit" data-test="sub-edit">
      <ul className="sub-edit-list">
        {draft.map((p, i) => (
          <li key={p.id}>
            <PresetMark p={p} />
            <input className="field" aria-label={L(lang, "Nombre", "Name")} value={p.name ?? presetName(p, lang)} onChange={(e) => rename(i, e.target.value)} />
            <button type="button" aria-label={L(lang, "Subir", "Move up")} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></button>
            <button type="button" aria-label={L(lang, "Bajar", "Move down")} disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ChevronDown /></button>
            <button type="button" className="is-drop" aria-label={L(lang, "Quitar", "Remove")} onClick={() => setDraft((list) => list.filter((_, k) => k !== i))}><X /></button>
          </li>
        ))}
      </ul>
      {rest.length ? (
        <div className="sub-edit-pool" aria-label={L(lang, "Añadir de la lista", "Add from the list")}>
          {rest.map((row) => (
            <button key={row[0]} type="button" onClick={() => setDraft((list) => [...list, { id: row[0] }])}>
              <SubMark id={row[0]} className="sub-chip-mark" />{poolName(row[0], lang)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sub-edit-own">
        <button type="button" className="sub-edit-icon" aria-label={L(lang, "Icono propio", "Own icon")} onClick={() => fileRef.current?.click()}>
          {ownIcon ? <img src={ownIcon} alt="" /> : <ImagePlus />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden data-test="sub-icon-file" onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) { try { setOwnIcon(await shrinkIcon(file)); } catch { /* not an image */ } }
        }} />
        <input className="field" placeholder={L(lang, "Otro servicio", "Other service")} aria-label={L(lang, "Otro servicio", "Other service")} value={own} onChange={(e) => setOwn(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOwn(); } }} />
        <button type="button" className="sub-edit-add" aria-label={L(lang, "Añadir", "Add")} disabled={!own.trim()} onClick={addOwn}><Plus /></button>
      </div>
      <div className="cobro-actions">
        <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}

/** 1.3.76: the Frecuencia chips editor (same look as the presets one): tap a row to swap it, remove, reorder, add from the pool or "Cada N días/semanas/meses". */
export function FreqPresetEditor({ lang, presets, onSave, onClose }: { lang: string; presets: string[]; onSave: (next: string[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<string[]>(presets);
  const [swap, setSwap] = useState<number | null>(null);
  const [n, setN] = useState("3");
  const [unit, setUnit] = useState<FreqUnit>("m");
  const move = (i: number, d: number) => setDraft((list) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const put = (token: string) => {
    if (swap !== null && swap < draft.length) {
      setDraft((list) => list.map((c, k) => (k === swap ? token : c)).filter((c, k, all) => all.indexOf(c) === k));
      setSwap(null);
    } else setDraft((list) => (list.includes(token) || list.length >= 12 ? list : [...list, token]));
  };
  const count = Number(n);
  const okN = Number.isInteger(count) && count >= 1 && count <= 999;
  const units: [FreqUnit, string, string][] = [["d", "días", "days"], ["w", "semanas", "weeks"], ["m", "meses", "months"]];
  const rest = FREQ_POOL.filter((c) => !draft.includes(c));
  return (
    <div className="sub-edit freq-edit" data-test="freq-edit">
      <ul className="sub-edit-list">
        {draft.map((c, i) => (
          <li key={c}>
            <button type="button" className={`freq-edit-name${swap === i ? " is-swap" : ""}`} aria-pressed={swap === i} aria-label={L(lang, "Cambiar por otra", "Swap for another")} onClick={() => setSwap(swap === i ? null : i)}>{cadenceLabel(c, lang)}<Repeat2 /></button>
            <button type="button" aria-label={L(lang, "Subir", "Move up")} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp /></button>
            <button type="button" aria-label={L(lang, "Bajar", "Move down")} disabled={i === draft.length - 1} onClick={() => move(i, 1)}><ChevronDown /></button>
            <button type="button" className="is-drop" aria-label={L(lang, "Quitar", "Remove")} disabled={draft.length <= 1} onClick={() => { setDraft((list) => list.filter((_, k) => k !== i)); setSwap(null); }}><X /></button>
          </li>
        ))}
      </ul>
      {rest.length ? (
        <div className="sub-edit-pool" aria-label={L(lang, "Añadir de la lista", "Add from the list")}>
          {rest.map((c) => <button key={c} type="button" onClick={() => put(c)}>{cadenceLabel(c, lang)}</button>)}
        </div>
      ) : null}
      <div className="freq-edit-own">
        <span>{L(lang, "Cada", "Every")}</span>
        <input className="field num" inputMode="numeric" aria-label={L(lang, "Cuántos", "How many")} value={n} onChange={(e) => setN(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        <div className="freq-edit-unit" role="group">
          {units.map(([u, es, en]) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}>{L(lang, es, en)}</button>)}
        </div>
        <button type="button" className="sub-edit-add" aria-label={L(lang, "Añadir", "Add")} disabled={!okN} onClick={() => okN && put(cadenceToken(count, unit))}><Plus /></button>
      </div>
      <div className="cobro-actions">
        <button type="button" className="btn secondary" onClick={onClose}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" disabled={!draft.length} onClick={() => { onSave(draft); onClose(); }}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}
