/**
 * Ajustes → Bancos y recompensas (lazy): which savings account holds the PayPal balance, the card rewards profile,
 * and the merchant rules Faro learned. Everything lives in the ledger (sync, backups, undo).
 */
import { useState } from "react";
import { Archive, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { DEFAULT_SOURCES, ISSUERS, REWARD_CLASSES, accounts, addAccount, archiveAccount, classOfLabel, importBook, newBonus, rcLabel, restoreAccount, rowApplies, targets, withBook, type Target } from "@/lib/faro/bankbook";
import type { AcctKind, BankSource, BonusRow } from "@/lib/faro/types";
import { FieldTip } from "./ui";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { ThemeSelect } from "./line-form";
import { TargetPicker, chipLabel } from "./bank-pick";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const own = (rc: string) => rc.slice(0, 2) === "b-";
const tipOf = (rc: string) => (own(rc) ? "imp-fila-propia" : `imp-tasa-${rc}`);
const short = (name: string) => name.split(" · ")[0];
const pctText = (bps: number | undefined) => (typeof bps === "number" ? String(Math.round(bps) / 100).replace(".", ",") : "");
const readPct = (s: string) => { const n = Number(s.replace(",", ".").replace("%", "").trim()); return Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 100) : null; };

export default function BankSettings() {
  const { session, lang, commit, names, confirm } = useFaro();
  const [, bump] = useState(0);
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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
  // Reward rows: the built-in kinds, then the user's own bonus rows.
  const bonus = book.bonus ?? [];
  const rows: string[] = [...REWARD_CLASSES, ...bonus.map((b) => b.id)];
  const label = (rc: string) => rcLabel(rc, lang, bonus).replace(/^./, (c) => c.toUpperCase());
  const off = accounts(state, true).filter((a) => a.off);
  const kindName = (k: AcctKind) => k === "card" ? L(lang, "Tarjeta de crédito", "Credit card") : k === "checking" ? L(lang, "Débito o cuenta", "Debit or checking") : L(lang, "Ahorros o billetera", "Savings or wallet");
  const archive = (a: { id: string; name: string }) => confirm({ title: L(lang, `Quitar ${a.name}`, `Remove ${a.name}`), danger: true, yes: L(lang, "Quitar", "Remove"),
    body: L(lang, "Sale de la tabla, del importador y de los consejos. Sus movimientos, reglas e historial de recompensas se quedan; la restauras en Tarjetas guardadas.", "It leaves the table, the importer and the advice. Its entries, rules and rewards history stay; restore it under Saved cards."),
    run: () => commit((s) => archiveAccount(s, a.id), L(lang, `Quitar ${a.name}`, `Remove ${a.name}`)) });
  return (
    <div className="bk-set">
      <h3 className="bk-h lab-head" data-anchor="aj-rewards">{L(lang, "Recompensas por tarjeta", "Rewards by card")}<Hint topic="imp-recompensas" /></h3>
      <div className="bk-scroll" data-many={cards.length > 3 ? "" : undefined} onScroll={(e) => { const el = e.currentTarget; if ((el.scrollLeft > 2) !== el.hasAttribute("data-scrolled")) el.toggleAttribute("data-scrolled", el.scrollLeft > 2); }}>
      <div className="bk-rates" style={{ ["--cols" as string]: String(Math.max(1, cards.length)) }}>
        <span className="bk-corner" aria-hidden />
        {cards.map((a) => <span key={a.id} className="bk-col">{short(a.name)}</span>)}
        {rows.map((rc) => (
          <div key={rc} className="bk-rate-row">
            <span className="bk-rate-label lab-head">{label(rc)}<Hint topic={tipOf(rc)} />
              {rc.startsWith("b-") ? <button type="button" className="icon-btn line-act is-danger bk-row-x" aria-label={L(lang, `Borrar fila ${label(rc)}`, `Delete row ${label(rc)}`)} onClick={() => confirm({ title: L(lang, "Borrar fila", "Delete row"), body: L(lang, `${label(rc)}: sus compras vuelven a Lo demás.`, `${label(rc)}: its purchases go back to Everything else.`), danger: true, yes: L(lang, "Borrar", "Delete"), run: () => commit((s) => withBook(s, (b) => ({ ...b, bonus: (b.bonus ?? []).filter((x) => x.id !== rc), sources: b.sources.map((x) => { if (!(rc in x.rates)) return x; const r = { ...x.rates }; delete r[rc]; return { ...x, rates: r }; }) })), label(rc)) })}><Trash2 className="size-4" /></button> : null}
            </span>
            {cards.map((a) => {
              const own = a.rates[rc];
              const shown = typeof own === "number" ? own : a.rates.other;
              // "Pago con PayPal" is the PayPal card's own category; Chase Travel is Chase's (unless a card has its own rate).
              const applies = rowApplies(a, rc);
              return applies ? (
                <label key={a.id} className={`bk-pct${typeof own === "number" ? "" : " is-inherit"}`}>
                  <input className="field num" inputMode="decimal" defaultValue={pctText(shown)} key={`${a.id}-${rc}-${shown}`} aria-label={`${a.name} · ${label(rc)}`}
                    onBlur={(e) => { const v = readPct(e.target.value); if (v === null || v === shown) { e.target.value = pctText(shown); return; } setSource(a.id, (s) => ({ ...s, rates: { ...s.rates, [rc]: v } }), `${short(a.name)} ${rcLabel(rc, lang)} ${v / 100}%`); }} />
                  <i aria-hidden>%</i>
                </label>
              ) : <span key={a.id} className="bk-na" aria-hidden>—</span>;
            })}
          </div>
        ))}
      </div>
      </div>
      <button type="button" className="btn secondary bk-reset" onClick={() => confirm({ title: L(lang, "Restaurar tasas", "Restore rates"), body: L(lang, "Vuelve a las tasas de fábrica de cada tarjeta.", "Goes back to each card's factory rates."), yes: L(lang, "Restaurar", "Restore"), run: () => { commit((s) => withBook(s, (b) => ({ ...b, sources: b.sources.map((x) => { const d = DEFAULT_SOURCES.find((y) => y.id === x.id || y.legacy === x.id); if (!d) return x; const n = { ...x, rates: { ...d.rates } }; delete n.elig; return n; }) })), L(lang, "Tasas de fábrica", "Factory rates")); bump((n) => n + 1); } })}>
        <RotateCcw aria-hidden />{L(lang, "Restaurar tasas", "Restore rates")}
      </button>


      <h3 className="bk-h lab-head" data-anchor="aj-cards">{L(lang, "Tus tarjetas y cuentas", "Your cards and accounts")}<Hint topic="imp-tarjetas" /></h3>
      <ul className="bk-accts">
        {accts.map((a) => (
          <li key={a.id} className="bk-acct">
            <span className="bk-acct-name">{a.name}<small>{kindName(a.kind === "paypal" ? "savings" : a.kind)}</small></span>
            <button type="button" className="icon-btn line-act is-danger" aria-label={L(lang, `Quitar ${a.name}`, `Remove ${a.name}`)} onClick={() => archive(a)}><Archive className="size-4" /></button>
          </li>
        ))}
      </ul>
      {adding ? <AddCard lang={lang} list={list} bonus={bonus} kindName={kindName} onCancel={() => setAdding(false)}
        onSave={(n) => { commit((s) => addAccount(s, n).state, n.name); setAdding(false); }} />
        : <button type="button" className="btn secondary bk-add" data-anchor="aj-card-add" onClick={() => setAdding(true)}><Plus aria-hidden />{L(lang, "Añadir tarjeta o banco", "Add a card or bank")}</button>}
      {off.length ? (
        <div className="bk-off" data-anchor="aj-cards-off">
          <h3 className="bk-h lab-head">{L(lang, "Tarjetas guardadas", "Saved cards")}<Hint topic="imp-guardadas" /></h3>
          <ul className="bk-accts">
            {off.map((a) => (
              <li key={a.id} className="bk-acct is-off">
                <span className="bk-acct-name">{a.name}<small>{L(lang, `Quitada el ${a.off}`, `Removed on ${a.off}`)}</small></span>
                <button type="button" className="btn secondary bk-restore" onClick={() => commit((s) => restoreAccount(s, a.id), L(lang, `Restaurar ${a.name}`, `Restore ${a.name}`))}><RotateCcw aria-hidden />{L(lang, "Restaurar", "Restore")}</button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

type RateRow = { rc: string; pct: string; name?: string; target?: string; isNew?: boolean };

/** New card or bank: name, kind, issuer, a base rate and optional category rates (from the user's own categories). */
function AddCard({ lang, list, bonus, kindName, onCancel, onSave }: { lang: string; list: Target[]; bonus: BonusRow[]; kindName: (k: AcctKind) => string; onCancel: () => void; onSave: (n: Parameters<typeof addAccount>[1]) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AcctKind>("card");
  const [bank, setBank] = useState("other");
  const [base, setBase] = useState("1");
  const [rows, setRows] = useState<RateRow[]>([]);
  const [picking, setPicking] = useState(false);
  const card = kind === "card";
  const set = (i: number, p: Partial<RateRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  // A picked category: a kind the table already has (comida fuera, farmacia…) sets that row; any other category gets its own bonus row.
  const pick = (v: string) => {
    setPicking(false);
    const t = list.find((x) => x.value === v); if (!t) return;
    const rc = classOfLabel(t.label, "other");
    const have = bonus.find((b) => b.target === v);
    const row: RateRow = rc !== "other" ? { rc, pct: "" } : have ? { rc: have.id, pct: "" } : { rc: `new:${v}`, pct: "", name: t.sub && !/^(otros|other)$/i.test(t.sub) ? t.sub : t.cat, target: v, isNew: true };
    if (!rows.some((r) => r.rc === row.rc)) setRows([...rows, row]);
  };
  const okName = name.trim().length > 0;
  const save = () => {
    if (!okName) return;
    const rates: Record<string, number> = { other: card ? readPct(base) ?? 0 : 0 };
    const add: BonusRow[] = [];
    if (card) for (const r of rows) {
      const v = readPct(r.pct); if (v === null || !r.pct.trim()) continue;
      if (r.isNew) { if (!r.name?.trim()) continue; const b = newBonus(r.name, r.target); add.push(b); rates[b.id] = v; }
      else rates[r.rc] = v;
    }
    onSave({ name: name.trim(), kind, bank, rates, bonus: add });
  };
  const rowName = (r: RateRow) => r.isNew ? "" : rcLabel(r.rc, lang, bonus).replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="ah-form sc-form bk-form" data-anchor="aj-card-form">
      <div className="ah-grid">
        <label className="label is-wide">
          <span className="lab-head">{L(lang, "Nombre", "Name")}<FieldTip topic="imp-tarjeta-nombre" /></span>
          <input className="field" value={name} autoFocus placeholder={L(lang, "Citi · tarjeta", "Citi · card")} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Tipo", "Kind")}<FieldTip topic="imp-tarjeta-tipo" /></span>
          <ThemeSelect value={kind} onChange={(v) => setKind(v as AcctKind)} options={(["card", "checking", "savings"] as AcctKind[]).map((k) => ({ value: k, label: kindName(k) }))} />
        </div>
        <div className="label is-wide">
          <span className="lab-head">{L(lang, "Banco", "Bank")}<FieldTip topic="imp-tarjeta-banco" /></span>
          <ThemeSelect value={bank} onChange={setBank} options={ISSUERS.map((x) => ({ value: x.value, label: x.label || L(lang, "Otro", "Other") }))} />
        </div>
        {card ? (
          <>
            <label className="label is-wide bk-form-base">
              <span className="lab-head">{L(lang, "Todo lo demás", "Everything else")}<FieldTip topic="imp-tarjeta-base" /></span>
              <span className="bk-pct"><input className="field num" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} /><i aria-hidden>%</i></span>
            </label>
            {rows.map((r, i) => (
              <div key={r.rc} className="label is-wide bk-form-row">
                <span className="lab-head">{r.isNew ? L(lang, "Fila propia", "Own row") : rowName(r)}<FieldTip topic={r.isNew ? "imp-fila-propia" : "imp-tarjeta-cat"} /></span>
                <div className="bk-form-line">
                  {r.isNew ? <input className="field" value={r.name ?? ""} aria-label={L(lang, "Nombre de la fila", "Row name")} placeholder={L(lang, "Viajes Chase", "Chase Travel")} onChange={(e) => set(i, { name: e.target.value })} /> : <span className="bk-form-fill" aria-hidden />}
                  <span className="bk-pct"><input className="field num" inputMode="decimal" value={r.pct} placeholder={base} aria-label={`${r.name || rowName(r)} %`} onChange={(e) => set(i, { pct: e.target.value })} /><i aria-hidden>%</i></span>
                  <button type="button" className="pp-x bk-x" aria-label={L(lang, "Quitar fila", "Remove row")} onClick={() => setRows(rows.filter((_, j) => j !== i))}><X className="size-4" /></button>
                </div>
              </div>
            ))}
            <div className="bk-more is-wide">
              <button type="button" className="pp-more" onClick={() => setPicking(true)}><Plus className="size-4" />{L(lang, "Categoría", "Category")}</button>
              <button type="button" className="pp-more" onClick={() => setRows([...rows, { rc: `new:${Date.now()}`, pct: "", name: "", isNew: true }])}><Plus className="size-4" />{L(lang, "Fila propia", "Own row")}</button>
            </div>
          </>
        ) : null}
      </div>
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onCancel}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" disabled={!okName} onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
      {picking ? <TargetPicker fixed lang={lang} targets={list.filter((t) => !t.value.startsWith("income"))} value="" note={L(lang, "Lo que esta tarjeta paga en esa categoría.", "What this card pays in that category.")} onPick={pick} onClose={() => setPicking(false)} /> : null}
    </div>
  );
}
