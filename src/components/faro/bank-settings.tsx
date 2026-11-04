/**
 * Ajustes → Bancos y recompensas (lazy): which savings account holds the PayPal balance, the card rewards profile,
 * and the merchant rules Faro learned. Everything lives in the ledger (sync, backups, undo).
 */
import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { DEFAULT_SOURCES, REWARD_CLASSES, accounts, importBook, rcLabel, targets, withBook } from "@/lib/faro/bankbook";
import type { BankSource, RewardClass } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { ThemeSelect } from "./line-form";
import { TargetPicker, chipLabel } from "./bank-pick";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const short = (name: string) => name.split(" · ")[0];
const pctText = (bps: number | undefined) => (typeof bps === "number" ? String(Math.round(bps) / 100).replace(".", ",") : "");
const readPct = (s: string) => { const n = Number(s.replace(",", ".").replace("%", "").trim()); return Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 100) : null; };

export default function BankSettings() {
  const { session, lang, commit, names, confirm } = useFaro();
  const [, bump] = useState(0);
  const [edit, setEdit] = useState<string | null>(null);
  if (!session) return null;
  const state = session.ledger;
  const accts = accounts(state);
  // Only cards earn rewards (the PayPal wallet and savings earn none of their own).
  const cards = accts.filter((a) => a.kind === "card");
  const book = importBook(state);
  const list = targets(state.structure, names);
  const vaults = state.structure.categories.filter((c) => c.role === "savings").flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))).map((s) => ({ value: s.id, label: s.customName || names.sub(s.id) })));
  const paypal = accts.find((a) => a.kind === "paypal");
  const setSource = (id: string, fn: (s: BankSource) => BankSource, label: string) => commit((s) => withBook(s, (b) => ({ ...b, sources: b.sources.map((x) => (x.id === id ? fn(x) : x)) })), label);
  const classes: RewardClass[] = REWARD_CLASSES;
  return (
    <div className="bk-set">
      <h3 className="bk-h lab-head" data-anchor="aj-rewards">{L(lang, "Recompensas por tarjeta", "Rewards by card")}<Hint topic="imp-recompensas" /></h3>
      <div className="bk-rates" style={{ ["--cols" as string]: String(cards.length) }}>
        <span className="bk-corner" aria-hidden />
        {cards.map((a) => <span key={a.id} className="bk-col">{short(a.name)}</span>)}
        {classes.map((rc) => (
          <div key={rc} className="bk-rate-row">
            <span className="bk-rate-label lab-head">{rcLabel(rc, lang).replace(/^./, (c) => c.toUpperCase())}<Hint topic={`imp-tasa-${rc}`} /></span>
            {cards.map((a) => {
              const own = a.rates[rc];
              const shown = typeof own === "number" ? own : a.rates.other;
              // "Pago con PayPal" is the PayPal card's own category; Chase Travel is Chase's.
              const applies = rc === "online" ? a.bank === "paypal" : rc === "travel" ? a.bank === "chase" : true;
              return applies ? (
                <label key={a.id} className={`bk-pct${typeof own === "number" ? "" : " is-inherit"}`}>
                  <input className="field num" inputMode="decimal" defaultValue={pctText(shown)} key={`${a.id}-${rc}-${shown}`} aria-label={`${a.name} · ${rcLabel(rc, lang)}`}
                    onBlur={(e) => { const v = readPct(e.target.value); if (v === null || v === shown) { e.target.value = pctText(shown); return; } setSource(a.id, (s) => ({ ...s, rates: { ...s.rates, [rc]: v } }), `${short(a.name)} ${rcLabel(rc, lang)} ${v / 100}%`); }} />
                  <i aria-hidden>%</i>
                </label>
              ) : <span key={a.id} className="bk-na" aria-hidden>—</span>;
            })}
          </div>
        ))}
      </div>
      <button type="button" className="btn secondary bk-reset" onClick={() => confirm({ title: L(lang, "Restaurar tasas", "Restore rates"), body: L(lang, "Vuelve a las tasas de fábrica de cada tarjeta.", "Goes back to each card's factory rates."), yes: L(lang, "Restaurar", "Restore"), run: () => { commit((s) => withBook(s, (b) => ({ ...b, sources: b.sources.map((x) => { const d = DEFAULT_SOURCES.find((y) => y.id === x.id || y.legacy === x.id); if (!d) return x; const n = { ...x, rates: { ...d.rates } }; delete n.elig; return n; }) })), L(lang, "Tasas de fábrica", "Factory rates")); bump((n) => n + 1); } })}>
        <RotateCcw aria-hidden />{L(lang, "Restaurar tasas", "Restore rates")}
      </button>

      {paypal ? (
        <label className="bk-pocket" data-anchor="aj-paypal-pocket">
          <span className="lab-head">{L(lang, "Saldo de PayPal en Ahorros", "PayPal balance in Savings")}<Hint topic="imp-bolsa-paypal" /></span>
          <ThemeSelect value={paypal.pocketId ?? ""} onChange={(v) => setSource(paypal.id, (s) => { const n = { ...s }; if (v) n.pocketId = v; else delete n.pocketId; return n; }, L(lang, "Saldo de PayPal", "PayPal balance"))} options={[{ value: "", label: L(lang, "No llevarlo", "Don't track it") }, ...vaults]} />
        </label>
      ) : null}

      <h3 className="bk-h lab-head" data-anchor="aj-rules-bank">{L(lang, "Reglas de comercios", "Merchant rules")}<Hint topic="imp-reglas" /></h3>
      {book.rules.length ? (
        <ul className="bk-rules">
          {[...book.rules].sort((a, b) => a.label.localeCompare(b.label)).map((r) => (
            <li key={r.key} className="bk-rule">
              <span className="bk-rule-name">{r.label}</span>
              <div className="bk-rule-edit">
                <button type="button" className="imp-chip is-rule bk-rule-chip" onClick={() => setEdit(r.key)}><span>{chipLabel(list.find((t) => t.value === r.target), lang)}</span></button>
                <button type="button" className="icon-btn line-act is-danger" aria-label={L(lang, `Borrar regla ${r.label}`, `Delete rule ${r.label}`)} onClick={() => confirm({ title: L(lang, "Borrar regla", "Delete rule"), body: r.label, danger: true, yes: L(lang, "Borrar", "Delete"), run: () => commit((s) => withBook(s, (b) => ({ ...b, rules: b.rules.filter((x) => x.key !== r.key) })), r.label) })}><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="bk-empty">{L(lang, "Aún no hay reglas. Al importar, cada categoría que eliges queda aquí.", "No rules yet. When you import, each category you pick lands here.")}</p>}
      {edit ? (() => { const r = book.rules.find((x) => x.key === edit); return r ? (
        <TargetPicker fixed lang={lang} targets={list} value={r.target} note={L(lang, `${r.label}: sus próximos movimientos irán aquí.`, `${r.label}: its next entries will go here.`)}
          onPick={(v) => { commit((s) => withBook(s, (b) => ({ ...b, rules: b.rules.map((x) => (x.key === r.key ? { ...x, target: v, n: 1 } : x)) })), r.label); setEdit(null); }} onClose={() => setEdit(null)} />
      ) : null; })() : null}
    </div>
  );
}
