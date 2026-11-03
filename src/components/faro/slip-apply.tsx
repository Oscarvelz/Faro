import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { parseAmount } from "@/lib/faro/money";
import { upsertLine } from "@/lib/faro/reducer";
import type { Currency, LineKind } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { FieldTip } from "./ui";
import { ThemeSelect } from "./line-form";
import { lineTargets, plainLine } from "./people";

/** Guardados → one normal ledger line in the chosen category, in the month on screen (undo works like any edit). */
export function SlipApply({ minor, currency, label, onDone }: { minor: number; currency: Currency; label: string; onDone: () => void }) {
  const { session, lang, names, commit, key, setUi } = useFaro();
  const state = session!.ledger;
  const en = lang === "en";
  const options = useMemo(() => lineTargets(state, lang, names, true), [state.structure, lang]);
  const [target, setTarget] = useState(() => localStorage.getItem("faro-slip-target") && options.some((o) => o.value === localStorage.getItem("faro-slip-target")) ? localStorage.getItem("faro-slip-target")! : options.find((o) => o.value.startsWith("expense-variable|"))?.value ?? options[0]?.value ?? "");
  const [amount, setAmount] = useState((Math.abs(minor) / 100).toFixed(2));
  const [money, setMoney] = useState<Currency>(currency);
  const [sign, setSign] = useState<1 | -1>(1);
  const parsed = parseAmount(amount);
  const ok = parsed !== null && parsed > 0 && !!target;
  const save = () => {
    if (!ok) return;
    const [kind, categoryId] = target.split("|") as [LineKind, string];
    localStorage.setItem("faro-slip-target", target);
    const line = plainLine({ kind, categoryId, concept: label, amountMinor: sign * parsed!, currency: money, monthKey: key, note: en ? "From Saved" : "Desde Guardados" });
    commit((s) => upsertLine(s, line), `${sign > 0 ? "Sumar" : "Restar"} guardado`);
    setUi({ notice: en ? "Applied. Undo brings it back." : "Aplicado. Deshacer lo revierte." });
    onDone();
  };
  return (
    <div className="ah-form sc-form slip-apply">
      <div className="ah-grid">
        <div className="label is-wide">
          <span className="lab-head">{en ? "Category" : "Categoría"}<FieldTip topic="guardado-aplicar" /></span>
          <ThemeSelect value={target} onChange={setTarget} options={options} />
        </div>
        <label className="label">
          <span className="lab-head">{en ? "Amount" : "Monto"}</span>
          <input className="field num" inputMode="decimal" value={amount} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        </label>
        <div className="label">
          <span className="lab-head">{en ? "Currency" : "Moneda"}</span>
          <div className="ah-sign" role="group">
            <button type="button" aria-pressed={money === "NIO"} onClick={() => setMoney("NIO")}>C$</button>
            <button type="button" aria-pressed={money === "USD"} onClick={() => setMoney("USD")}>US$</button>
          </div>
        </div>
        <div className="ah-sign is-wide" role="group" aria-label={en ? "Add or subtract" : "Sumar o restar"}>
          <button type="button" aria-pressed={sign === 1} onClick={() => setSign(1)}><Plus />{en ? "Add" : "Sumar"}</button>
          <button type="button" aria-pressed={sign === -1} onClick={() => setSign(-1)}><Minus />{en ? "Subtract" : "Restar"}</button>
        </div>
      </div>
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onDone}>{en ? "Cancel" : "Cancelar"}</button>
        <button type="button" className="btn" disabled={!ok} onClick={save}>{en ? "Apply" : "Aplicar"}</button>
      </div>
    </div>
  );
}
