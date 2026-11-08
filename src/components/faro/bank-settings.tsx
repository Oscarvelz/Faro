/**
 * Ajustes → Bancos y recompensas (lazy): which savings account holds the PayPal balance, the card rewards profile,
 * and the merchant rules Faro learned. Everything lives in the ledger (sync, backups, undo).
 */
import { useEffect, useState, type ReactNode } from "react";
import { Note } from "./finish";
import { Archive, Check, ChevronDown, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { DEFAULT_SOURCES, ISSUERS, acctColor, archiveBank, bankGroups, editAccount, isDefaultAcct, restoreBank, type Acct, type BankGroup, restoreDefaultAccounts, REWARD_CLASSES, accounts, addAccount, archiveAccount, classOfLabel, importBook, newBonus, rcLabel, restoreAccount, rowApplies, targets, withBook, type Target } from "@/lib/faro/bankbook";
import type { AcctKind, BankSource, BonusRow } from "@/lib/faro/types";
import { FieldTip } from "./ui";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { ThemeSelect } from "./line-form";
import { TargetPicker, chipLabel } from "./bank-pick";
import { ColorPick } from "./color-pick";
import { RewardRealSettings } from "./rewards-real";
import { BANK_PATHS } from "@/lib/faro/bank-paths";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const own = (rc: string) => rc.slice(0, 2) === "b-";
const tipOf = (rc: string) => (own(rc) ? "imp-fila-propia" : `imp-tasa-${rc}`);
const short = (name: string) => name.split(" · ")[0];
const pctText = (bps: number | undefined) => (typeof bps === "number" ? String(Math.round(bps) / 100).replace(".", ",") : "");
const readPct = (s: string) => { const n = Number(s.replace(",", ".").replace("%", "").trim()); return Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 100) : null; };

/** A bank's mark: its colour plate with the Simple Icons glyph (Chase, Wells Fargo, PayPal…) or the name's initial. */
export function BankMark({ a, className }: { a: { bank: string; color?: string; name: string }; className?: string }) {
  const path = BANK_PATHS[a.bank];
  const fg = a.bank === "wellsfargo" && !a.color ? "#ffcd41" : "#fff";
  const ch = (a.name.trim()[0] ?? "•").toUpperCase();
  return (
    <svg viewBox="0 0 32 32" className={`bk-mark${className ? ` ${className}` : ""}`} data-bank={a.bank} aria-hidden style={{ ["--bk-c" as string]: acctColor(a) }}>
      <rect className="bk-mark-plate" width="32" height="32" rx="9" />
      {path ? <path className="bk-mark-glyph" d={path} fill={fg} transform="translate(7.5 7.5) scale(.7083)" /> : <text className="bk-mark-glyph" x="16" y="21.5" textAnchor="middle" fill={fg} fontFamily="Outfit, sans-serif" fontWeight="700" fontSize="15">{ch}</text>}
    </svg>
  );
}

/**
 * 1.3.152 (Oscar): a part of Bancos y recompensas as its own little fold card — Recompensas folded beside
 * Tus tarjetas y cuentas, each one unfolded on purpose instead of everything read at a glance. The header is
 * a div-button like Ajustes' own folds, so the heading's (?) and its tools stay real buttons inside it; the
 * tools stop their click (below) so they never toggle the fold. Hark's headings and bodies pass through
 * untouched — only the container is new.
 */
function BkFold({ id, head, open, onToggle, children }: { id: string; head: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className={`bk-fold${open ? " is-open" : ""}`} data-fold={id}>
      <div role="button" tabIndex={0} className="bk-fold-btn" aria-expanded={open} onClick={onToggle}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onToggle(); } }}>
        {head}
        <ChevronDown className={open ? "fold-chev is-open" : "fold-chev"} aria-hidden />
      </div>
      {open ? <div className="bk-fold-body">{children}</div> : null}
    </div>
  );
}

export default function BankSettings() {
  const { session, lang, commit, names, confirm } = useFaro();
  const [, bump] = useState(0);
  const [edit, setEdit] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // 1.3.151: remove/rename live in the pencil state (one switch for the table and the list), never beside a row at rest.
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // 1.3.152: the two fold cards are born folded and open independently (Oscar picks which to unfold first);
  // a manual or search jump names its fold (faro-open "bk-rewards" / "bk-cards") and that one opens.
  const [bkOpen, setBkOpen] = useState({ rewards: false, cards: false });
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "bk-rewards") setBkOpen((f) => (f.rewards ? f : { ...f, rewards: true }));
      else if (id === "bk-cards") setBkOpen((f) => (f.cards ? f : { ...f, cards: true }));
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  if (!session) return null;
  const state = session.ledger;
  const accts = accounts(state);
  const all = accounts(state, true);
  // Only cards earn rewards (the PayPal wallet and savings earn none of their own). A removed factory card keeps its
  // column as a slim restore at the same place; the user's own removed cards come back from their row in the list.
  const cols = all.filter((a) => a.kind === "card" && (!a.off || isDefaultAcct(a.id)));
  const cards = cols.filter((a) => !a.off);
  const book = importBook(state);
  const list = targets(state.structure, names);
  const vaults = state.structure.categories.filter((c) => c.role === "savings").flatMap((c) => c.subs.filter((s) => !s.hidden && (s.icon === "vault" || s.icon.startsWith("vault:"))).map((s) => ({ value: s.id, label: s.customName || names.sub(s.id) })));
  const paypal = accts.find((a) => a.kind === "paypal");
  const setSource = (id: string, fn: (s: BankSource) => BankSource, label: string) => commit((s) => withBook(s, (b) => ({ ...b, sources: b.sources.map((x) => (x.id === id ? fn(x) : x)) })), label);
  // Reward rows: the built-in kinds, then the user's own bonus rows.
  const bonus = book.bonus ?? [];
  const rows: string[] = [...REWARD_CLASSES, ...bonus.map((b) => b.id)];
  const label = (rc: string) => rcLabel(rc, lang, bonus).replace(/^./, (c) => c.toUpperCase());
  const groups = bankGroups(state);
  const kindName = (k: AcctKind) => k === "card" ? L(lang, "Tarjeta de crédito", "Credit card") : k === "checking" ? L(lang, "Débito o cuenta", "Debit or checking") : L(lang, "Ahorros o billetera", "Savings or wallet");
  const kindChip = (k: AcctKind) => k === "card" ? L(lang, "Crédito", "Credit") : k === "checking" ? L(lang, "Débito", "Debit") : k === "paypal" ? L(lang, "Billetera", "Wallet") : L(lang, "Ahorros", "Savings");
  const archive = (a: { id: string; name: string }) => confirm({ title: L(lang, `Quitar ${a.name}`, `Remove ${a.name}`), danger: true, yes: L(lang, "Quitar", "Remove"),
    body: L(lang, "Sale de la tabla, del importador y de los consejos. Sus movimientos, reglas e historial de recompensas se quedan; la flecha en su lugar la trae de vuelta.", "It leaves the table, the importer and the advice. Its entries, rules and rewards history stay; the arrow in its place brings it back."),
    run: () => commit((s) => archiveAccount(s, a.id), L(lang, `Quitar ${a.name}`, `Remove ${a.name}`)) });
  const archiveGroup = (g: BankGroup) => confirm({ title: L(lang, `Quitar ${g.name}`, `Remove ${g.name}`), danger: true, yes: L(lang, "Quitar", "Remove"),
    body: L(lang, `Salen sus ${g.live.length} cuentas de la tabla, del importador y de los consejos. Sus movimientos e historial se quedan; la flecha en su lugar lo trae de vuelta.`, `Its ${g.live.length} accounts leave the table, the importer and the advice. Their entries and history stay; the arrow in its place brings it back.`),
    run: () => commit((s) => archiveBank(s, g.key), L(lang, `Quitar ${g.name}`, `Remove ${g.name}`)) });
  const back = (a: { id: string; name: string }) => commit((s) => restoreAccount(s, a.id), L(lang, `Restaurar ${a.name}`, `Restore ${a.name}`));
  const backGroup = (g: BankGroup) => commit((s) => restoreBank(s, g.key), L(lang, `Restaurar ${g.name}`, `Restore ${g.name}`));
  // Under its bank, a row drops the bank's name ("Chase · tarjeta" → "Tarjeta"); any other name stays whole.
  const rowName = (g: BankGroup, a: Acct) => { const p = `${g.name} · `; return a.name.toLowerCase().startsWith(p.toLowerCase()) && a.name.length > p.length ? a.name.slice(p.length).replace(/^./, (c) => c.toUpperCase()) : a.name; };
  const pen = (
    <button type="button" className="sub-gear bk-pen" data-test="bk-edit" aria-pressed={manage} aria-label={manage ? L(lang, "Listo", "Done") : L(lang, "Editar bancos y tarjetas", "Edit banks and cards")} onClick={() => { setManage((v) => !v); setEditing(null); }}>{manage ? <Check /> : <Pencil />}</button>
  );
  const acts = (a: Acct) => manage ? (
    <span className="bk-acts">
      <button type="button" className="bk-act" data-test="bk-rename" aria-label={L(lang, `Editar ${a.name}`, `Edit ${a.name}`)} aria-pressed={editing === a.id} onClick={() => setEditing(editing === a.id ? null : a.id)}><Pencil /></button>
      <button type="button" className="bk-act is-danger" data-test="bk-archive" aria-label={L(lang, `Quitar ${a.name}`, `Remove ${a.name}`)} onClick={() => archive(a)}><Archive /></button>
    </span>
  ) : null;
  const ghost = (a: { id: string; name: string; off?: string }, onBack: () => void, mark?: ReactNode, text?: string) => (
    <li key={`off-${a.id}`} className="bk-acct is-off" data-test="bk-ghost">
      {mark}
      <span className="bk-acct-name"><span>{text ?? a.name}</span>{a.off ? <small>{L(lang, `Quitada el ${a.off}`, `Removed on ${a.off}`)}</small> : null}</span>
      <button type="button" className="sub-gear bk-back" data-test="bk-back" aria-label={L(lang, `Traer de vuelta ${a.name}`, `Bring back ${a.name}`)} onClick={onBack}><RotateCcw /></button>
    </li>
  );
  const editor = (a: Acct) => editing === a.id ? (
    <li key={`ed-${a.id}`} className="bk-acct-edit">
      <EditAcct lang={lang} a={a} onCancel={() => setEditing(null)} onSave={(p) => { commit((s) => editAccount(s, a.id, p), p.name || a.name); setEditing(null); }} />
    </li>
  ) : null;
  return (
    <div className={`bk-set${manage ? " is-manage" : ""}`}>
      <BkFold id="bk-rewards" open={bkOpen.rewards} onToggle={() => setBkOpen((f) => ({ ...f, rewards: !f.rewards }))} head={(
      <h3 className="bk-h lab-head" data-anchor="aj-rewards">{L(lang, "Recompensas por tarjeta", "Rewards by card")}<Hint topic="imp-recompensas" />
        <span className="bk-h-tools" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="sub-gear bk-reset" data-test="rates-reset" aria-label={L(lang, "Restaurar tasas", "Restore rates")} onClick={() => confirm({ title: L(lang, "Restaurar tasas", "Restore rates"), body: L(lang, "Vuelve a las tasas de fábrica de cada tarjeta.", "Goes back to each card's factory rates."), yes: L(lang, "Restaurar", "Restore"), run: () => { commit((s) => withBook(s, (b) => ({ ...b, sources: b.sources.map((x) => { const d = DEFAULT_SOURCES.find((y) => y.id === x.id || y.legacy === x.id); if (!d) return x; const n = { ...x, rates: { ...d.rates } }; delete n.elig; return n; }) })), L(lang, "Tasas de fábrica", "Factory rates")); bump((n) => n + 1); } })}><RotateCcw /></button>
          {pen}
        </span>
      </h3>
      )}>
      <div className="bk-scroll" data-many={cards.length > 3 ? "" : undefined} onScroll={(e) => { const el = e.currentTarget; if ((el.scrollLeft > 2) !== el.hasAttribute("data-scrolled")) el.toggleAttribute("data-scrolled", el.scrollLeft > 2); }}>
      <div className="bk-rates" style={{ ["--cols" as string]: String(Math.max(1, cards.length)), ["--bk-tpl" as string]: cols.map((a) => (a.off ? "var(--bk-ghost)" : "var(--bk-cell)")).join(" ") || "var(--bk-cell)" }}>
        <span className="bk-corner" aria-hidden />
        {cols.map((a) => a.off ? (
          <span key={a.id} className="bk-col is-off">
            <button type="button" className="sub-gear bk-back" data-test="bk-col-back" aria-label={L(lang, `Traer de vuelta ${a.name}`, `Bring back ${a.name}`)} onClick={() => back(a)}><RotateCcw /></button>
          </span>
        ) : (
          <span key={a.id} className="bk-col">
            <BankMark a={a} />
            <span className="bk-col-name">{short(a.name)}</span>
            {manage ? <button type="button" className="bk-act is-danger bk-col-x" data-test="bk-col-archive" aria-label={L(lang, `Quitar ${a.name}`, `Remove ${a.name}`)} onClick={() => archive(a)}><Archive /></button> : null}
          </span>
        ))}
        {rows.map((rc) => (
          <div key={rc} className="bk-rate-row">
            <span className="bk-rate-label lab-head"><span className="bk-rate-text">{label(rc)}</span><Hint topic={tipOf(rc)} />
              {rc.startsWith("b-") && manage ? <button type="button" className="bk-act is-danger bk-row-x" aria-label={L(lang, `Borrar fila ${label(rc)}`, `Delete row ${label(rc)}`)} onClick={() => confirm({ title: L(lang, "Borrar fila", "Delete row"), body: L(lang, `${label(rc)}: sus compras vuelven a Lo demás.`, `${label(rc)}: its purchases go back to Everything else.`), danger: true, yes: L(lang, "Borrar", "Delete"), run: () => commit((s) => withBook(s, (b) => ({ ...b, bonus: (b.bonus ?? []).filter((x) => x.id !== rc), sources: b.sources.map((x) => { if (!(rc in x.rates)) return x; const r = { ...x.rates }; delete r[rc]; return { ...x, rates: r }; }) })), label(rc)) })}><Trash2 /></button> : null}
            </span>
            {cols.map((a) => {
              if (a.off) return <span key={a.id} className="bk-gap" aria-hidden />;
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
              ) : <span key={a.id} className="bk-na" role="img" aria-label={L(lang, `${short(a.name)} no paga aparte en ${label(rc)}`, `${short(a.name)} pays nothing extra on ${label(rc)}`)}><i aria-hidden /></span>;
            })}
          </div>
        ))}
      </div>
      </div>
      <RewardRealSettings />
      </BkFold>

      <BkFold id="bk-cards" open={bkOpen.cards} onToggle={() => setBkOpen((f) => ({ ...f, cards: !f.cards }))} head={(
      <h3 className="bk-h lab-head" data-anchor="aj-cards">{L(lang, "Tus tarjetas y cuentas", "Your cards and accounts")}<Hint topic="imp-tarjetas" />
        <span className="bk-h-tools" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="sub-gear bk-h-restore" data-test="acct-restore" aria-label={L(lang, "Restaurar tarjetas de fábrica", "Restore factory cards")} onClick={() => confirm({ title: L(lang, "Restaurar tarjetas", "Restore cards"),
            body: L(lang, "Vuelven las tarjetas y cuentas de fábrica que quitaste. Las tuyas guardadas siguen guardadas y no se borra ningún movimiento.", "The factory cards and accounts you removed come back. Your own saved ones stay saved and no entry is deleted."),
            yes: L(lang, "Restaurar", "Restore"), run: () => commit((s) => restoreDefaultAccounts(s), L(lang, "Tarjetas de fábrica", "Factory cards")) })}><RotateCcw /></button>
          {pen}
        </span>
      </h3>
      )}>
      <ul className="bk-accts" data-anchor="aj-cards-off">
        {groups.map((g) => {
          const lead = g.accts[0];
          // A whole bank removed: one quiet line with its arrow, where the bank was.
          if (!g.live.length) return ghost({ id: g.key, name: g.name, off: g.accts.length === 1 ? lead.off : undefined }, () => backGroup(g), <BankMark a={{ ...lead, name: g.name }} className="is-off" />, g.name);
          if (g.accts.length === 1) return [
            <li key={lead.id} className="bk-acct" data-test="bk-acct">
              <BankMark a={lead} />
              <span className="bk-acct-name">{rowName(g, lead) !== lead.name ? <b>{g.name}</b> : <span>{lead.name}</span>}<em className="bk-kind">{kindChip(lead.kind)}</em></span>
              {acts(lead)}
            </li>,
            editor(lead),
          ];
          return [
            <li key={`g-${g.key}`} className="bk-acct is-bank" data-test="bk-bank">
              <BankMark a={{ ...lead, name: g.name }} />
              <span className="bk-acct-name"><b>{g.name}</b><small className="num">{g.live.length}</small></span>
              {manage ? <span className="bk-acts"><button type="button" className="bk-act is-danger" data-test="bk-bank-archive" aria-label={L(lang, `Quitar ${g.name}`, `Remove ${g.name}`)} onClick={() => archiveGroup(g)}><Archive /></button></span> : null}
            </li>,
            ...g.accts.flatMap((a) => a.off ? [ghost(a, () => back(a), <i className="bk-sub-dot" aria-hidden />, rowName(g, a))] : [
              <li key={a.id} className="bk-acct is-sub" data-test="bk-acct">
                <i className="bk-sub-dot" aria-hidden />
                <span className="bk-acct-name"><span>{rowName(g, a)}</span>{rowName(g, a).toLowerCase() === kindChip(a.kind).toLowerCase() ? null : <em className="bk-kind">{kindChip(a.kind)}</em>}</span>
                {acts(a)}
              </li>,
              editor(a),
            ]),
          ];
        })}
      </ul>
      {adding ? <AddCard lang={lang} list={list} bonus={bonus} kindName={kindName} onCancel={() => setAdding(false)}
        onSave={(n) => { commit((s) => addAccount(s, n).state, n.name); setAdding(false); }} />
        : <button type="button" className="btn secondary bk-add" data-anchor="aj-card-add" onClick={() => setAdding(true)}><Plus aria-hidden />{L(lang, "Añadir tarjeta o banco", "Add a card or bank")}</button>}

      {paypal ? (
        <label className="bk-pocket" data-anchor="aj-paypal-pocket">
          <span className="lab-head">{L(lang, "Saldo de PayPal en Ahorros", "PayPal balance in Savings")}<Hint topic="imp-bolsa-paypal" /></span>
          <ThemeSelect value={paypal.pocketId ?? ""} onChange={(v) => setSource(paypal.id, (s) => { const n = { ...s }; if (v) n.pocketId = v; else delete n.pocketId; return n; }, L(lang, "Saldo de PayPal", "PayPal balance"))} options={[{ value: "", label: L(lang, "No llevarlo", "Don't track it") }, ...vaults]} />
        </label>
      ) : null}
      </BkFold>

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
      ) : <Note>{L(lang, "Aún no hay reglas. Al importar, cada categoría que eliges queda aquí.", "No rules yet. When you import, each category you pick lands here.")}</Note>}
      {edit ? (() => { const r = book.rules.find((x) => x.key === edit); return r ? (
        <TargetPicker fixed lang={lang} targets={list} value={r.target} note={L(lang, `${r.label}: sus próximos movimientos irán aquí.`, `${r.label}: its next entries will go here.`)}
          onPick={(v) => { commit((s) => withBook(s, (b) => ({ ...b, rules: b.rules.map((x) => (x.key === r.key ? { ...x, target: v, n: 1 } : x)) })), r.label); setEdit(null); }} onClose={() => setEdit(null)} />
      ) : null; })() : null}
    </div>
  );
}

type RateRow = { rc: string; pct: string; name?: string; target?: string; isNew?: boolean };

/** New card or bank: name, kind, issuer, a base rate and optional category rates (from the user's own categories). */
export function AddCard({ lang, list, bonus, kindName, initialName, onCancel, onSave }: { lang: string; list: Target[]; bonus: BonusRow[]; kindName: (k: AcctKind) => string; initialName?: string; onCancel: () => void; onSave: (n: Parameters<typeof addAccount>[1]) => void }) {
  const [name, setName] = useState(initialName ?? "");
  const [kind, setKind] = useState<AcctKind>("card");
  const [bank, setBank] = useState("other");
  const [color, setColor] = useState<string | null>(null);
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
    onSave({ name: name.trim(), kind, bank, rates, bonus: add, ...(color ? { color } : {}) });
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
        <div className="is-wide"><ColorPoint lang={lang} value={color ?? acctColor({ bank })} onPick={setColor} /></div>
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

/** The folded colour point (same as Estructura's editor, 1.3.143): ball + «Color» + code; a tap opens the shared ColorPick. */
function ColorPoint({ lang, value, onPick }: { lang: string; value: string; onPick: (hex: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tree-color bk-color">
      <button type="button" className="tree-color-point" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <i className="tree-color-ball" style={{ ["--ball" as string]: value }} aria-hidden />
        <span className="tree-color-lab">{L(lang, "Color", "Colour")}<FieldTip topic="imp-tarjeta-color" /></span>
        <span className="tree-color-hex num">{value.toUpperCase()}</span>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
      </button>
      {open ? <ColorPick face="solid" value={value} label={L(lang, "Color", "Colour")} onPick={(hex) => { onPick(hex); setOpen(false); }} /> : null}
    </div>
  );
}

/** Pencil state of one account: its name, its mark's colour and, for an account of the user's own, its bank. Rates live in the table. */
function EditAcct({ lang, a, onCancel, onSave }: { lang: string; a: Acct; onCancel: () => void; onSave: (p: { name?: string; color?: string | null; bank?: string }) => void }) {
  const [name, setName] = useState(a.name);
  const [color, setColor] = useState(acctColor(a));
  const [bank, setBank] = useState(a.bank);
  const save = () => onSave({ ...(name.trim() && name.trim() !== a.name ? { name: name.trim() } : {}), ...(color !== acctColor(a) ? { color } : {}), ...(a.mine && bank !== a.bank ? { bank } : {}) });
  return (
    <div className="bk-edit" data-test="bk-edit-form">
      <label className="label">
        <span className="lab-head">{L(lang, "Nombre", "Name")}<FieldTip topic="imp-tarjeta-nombre" /></span>
        <span className="bk-edit-name"><BankMark a={{ bank: a.mine ? bank : a.bank, color, name: name || a.name }} /><input className="field" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }} /></span>
      </label>
      <ColorPoint lang={lang} value={color} onPick={setColor} />
      {a.mine ? (
        <div className="label">
          <span className="lab-head">{L(lang, "Banco", "Bank")}<FieldTip topic="imp-tarjeta-banco" /></span>
          <ThemeSelect value={bank} onChange={setBank} options={ISSUERS.map((x) => ({ value: x.value, label: x.label || L(lang, "Otro", "Other") }))} />
        </div>
      ) : null}
      <div className="ah-actions bk-edit-acts">
        <button type="button" className="btn secondary" onClick={onCancel}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" data-test="bk-edit-save" onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}
