/**
 * Recompensas: estimado vs real (1.3.155). Faro's estimate never needed the bank — it is his spending times
 * his saved rates. The REAL figure is his to note: typed, or read ON DEVICE from his bank app's screenshot
 * through the same OCR as receipts (scanrun + parseCardShot, the reader that already knows a cash rewards
 * balance from points). Reading only PREFILLS this form; nothing becomes a figure until he taps Guardar on
 * the exact amount, card and date he sees. Figures live in the import book (book.rewardReal), money only.
 */
import { useRef, useState } from "react";
import { Camera, Pencil } from "lucide-react";
import { accounts, rewardRealCards, rewardRealRows, setRewardReal, withBook, type Acct } from "@/lib/faro/bankbook";
import { parseCardShot } from "@/lib/faro/cardparse";
import { convertMinor, formatMoney, parseAmount } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import type { Currency } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { DayField, ThemeSelect } from "./line-form";

const L = (lang: string, es: string, en: string) => (lang === "en" ? en : es);
const MONTHS: [string[], string[]] = [["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"], ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]];
const dayText = (iso: string, lang: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return lang === "en" ? `${MONTHS[1][+m[2] - 1]} ${+m[3]}` : `${+m[3]} ${MONTHS[0][+m[2] - 1]}`;
};
const moneyText = (minor: number) => (minor / 100).toFixed(2);
/** His keyboards write 1,5 as often as 1.5: a lone comma is a decimal comma. */
const readMoney = (s: string) => parseAmount(s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s);
const short = (name: string) => name.split(" · ")[0];

type Cand = { amountMinor: number; currency: Currency; issuer: string; label: string };

/** The note form. Local state only — the single commit in the whole flow is Guardar. */
function RewardRealForm({ cards, startAcct, initial, onDone }: {
  cards: Acct[];
  startAcct: string;
  initial: { amountMinor: number; asOf: string } | null;
  onDone: () => void;
}) {
  const { session, commit, lang } = useFaro();
  const display: Currency = session?.ledger.settings.display ?? "USD";
  const rateE4 = session?.ledger.settings.rateE4 ?? 0;
  const [acctId, setAcctId] = useState(startAcct);
  const [amount, setAmount] = useState(initial ? moneyText(initial.amountMinor) : "");
  const [date, setDate] = useState(initial?.asOf ?? todayIso());
  const [cands, setCands] = useState<Cand[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [missed, setMissed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = readMoney(amount);
  const ok = !!acctId && parsed != null && parsed >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const applyCand = (c: Cand) => {
    setAmount(moneyText(convertMinor(c.amountMinor, c.currency, display, rateE4)));
    const byIssuer = cards.find((a) => a.bank === c.issuer);
    if (byIssuer) setAcctId(byIssuer.id);
  };
  const readImage = async (f: File) => {
    setBusy(true); setMissed(false); setCands(null);
    try {
      const run = await import("@/lib/faro/scanrun");
      const scanner = await run.openScanner();
      try {
        const img = await scanner.read(f, () => {});
        const seen = new Set<string>();
        const found = parseCardShot(img.lines, todayIso())
          .filter((r) => r.rewardsMinor != null)
          .map((r) => ({ amountMinor: r.rewardsMinor!, currency: r.currency, issuer: r.issuer, label: r.title || r.issuer }))
          .filter((c) => { const k = `${c.amountMinor}|${c.currency}`; if (seen.has(k)) return false; seen.add(k); return true; });
        if (!found.length) { setMissed(true); return; }
        setCands(found);
        if (found.length === 1) applyCand(found[0]);
      } finally { scanner.stop(); }
    } catch { setMissed(true); } finally { setBusy(false); }
  };
  const save = () => {
    if (!ok) return;
    commit((s) => withBook(s, (b) => setRewardReal(b, acctId, { amountMinor: parsed!, asOf: date, currency: display })), L(lang, "Saldo real de recompensas", "Real rewards balance"));
    onDone();
  };

  return (
    <div className="rw-real-form" data-anchor="rewards-real-form">
      <div className="rw-real-frow">
        <span className="lab-head">{L(lang, "Tarjeta", "Card")}</span>
        <ThemeSelect value={acctId} onChange={setAcctId} options={cards.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="rw-real-frow">
        <span className="lab-head">{L(lang, "Saldo real", "Real balance")}</span>
        <span className="rw-real-amt"><span>{display === "NIO" ? "C$" : "$"}</span>
          <input className="field num" inputMode="decimal" value={amount} placeholder="0.00" aria-label={L(lang, "Saldo real", "Real balance")} onChange={(e) => setAmount(e.target.value)} />
        </span>
      </div>
      <div className="rw-real-frow">
        <span className="lab-head">{L(lang, "Fecha", "Date")}</span>
        <DayField value={date} onChange={setDate} />
      </div>
      <div className="rw-real-frow">
        <button type="button" className="btn secondary rw-real-img" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Camera aria-hidden />{busy ? L(lang, "Leyendo…", "Reading…") : L(lang, "Leer de una imagen", "Read from an image")}
        </button>
        <input ref={fileRef} className="rw-real-file" type="file" accept="image/*" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void readImage(f); }} />
      </div>
      {cands && cands.length > 1 ? (
        <div className="rw-real-cands"><span>{L(lang, "Leí estos saldos: toca el tuyo.", "I read these balances: tap yours.")}</span>
          {cands.map((c, i) => (
            <button key={i} type="button" className="imp-chip" onClick={() => applyCand(c)}>
              {formatMoney(convertMinor(c.amountMinor, c.currency, display, rateE4), display, lang)}{c.label ? ` · ${c.label}` : ""}
            </button>
          ))}
        </div>
      ) : null}
      {missed ? <p className="rw-real-miss">{L(lang, "No leí un saldo de recompensas en la imagen; escríbelo tú.", "I couldn't read a rewards balance in that picture; type it yourself.")}</p> : null}
      <div className="ah-actions">
        <button type="button" className="btn secondary" onClick={onDone}>{L(lang, "Cancelar", "Cancel")}</button>
        <button type="button" className="btn" data-test="rewards-real-save" disabled={!ok} onClick={save}>{L(lang, "Guardar", "Save")}</button>
      </div>
    </div>
  );
}

/** Estudio: under the Recompensas card's action line — per-card estimate, his real figure when noted, and the difference. */
export function RewardRealBlock() {
  const { session, lang, key } = useFaro();
  const [edit, setEdit] = useState<string | null>(null);
  if (!session) return null;
  const { display, rateE4 } = session.ledger.settings;
  const rows = rewardRealRows(session.ledger, key, display, rateE4);
  const cards = accounts(session.ledger).filter((a) => a.kind === "card");
  if (!rows.length && edit == null) return null;
  const money = (n: number) => formatMoney(n, display, lang);
  const editing = edit ? rows.find((r) => r.acct.id === edit) : undefined;
  return (
    <div className="rw-real" data-anchor="rewards-real">
      {rows.map((r) => (
        <div key={r.acct.id} className="rw-real-row">
          <span className="rw-real-name">{short(r.acct.name)}</span>
          {r.real ? (
            <button type="button" className="rw-real-figs" data-acct={r.acct.id} onClick={() => setEdit(r.acct.id)}
              aria-label={L(lang, `Editar el saldo real de ${r.acct.name}`, `Edit ${r.acct.name}'s real balance`)}>
              <span><em>{L(lang, "Estimado", "Estimated")}</em><b className="num">{money(r.estimated)}</b></span>
              <span><em>{L(lang, "Real · tu banco", "Real · your bank")} · {dayText(r.real.asOf, lang)}</em><b className="num">{money(r.real.amountMinor)}</b></span>
              <span><em>{L(lang, "Diferencia", "Difference")}</em><b className="num">{r.diff != null && r.diff > 0 ? `+${money(r.diff)}` : money(r.diff ?? 0)}</b></span>
            </button>
          ) : (
            <span className="rw-real-est">
              <b className="num">{money(r.estimated)}</b>
              <button type="button" className="rw-real-add" data-acct={r.acct.id} onClick={() => setEdit(r.acct.id)}>{L(lang, "Anotar saldo real", "Note real balance")}</button>
            </span>
          )}
        </div>
      ))}
      {rows.some((r) => r.real) ? (
        <p className="rw-real-note">{L(lang, "Las recompensas del banco llegan con atraso; la diferencia es una referencia, no un error.", "Your bank's rewards arrive with a delay; the difference is a reference, not an error.")}</p>
      ) : null}
      {edit != null ? (
        <RewardRealForm cards={cards} startAcct={edit}
          initial={editing?.real ? { amountMinor: editing.real.amountMinor, asOf: editing.real.asOf } : null}
          onDone={() => setEdit(null)} />
      ) : null}
    </div>
  );
}

/** Ajustes, inside the Recompensas fold under Hark's rates table: every card's real figure — the always-reachable door. */
export function RewardRealSettings() {
  const { session, lang } = useFaro();
  const [edit, setEdit] = useState<string | null>(null);
  if (!session) return null;
  const { display, rateE4 } = session.ledger.settings;
  const rows = rewardRealCards(session.ledger);
  const cards = rows.map((r) => r.acct);
  if (!cards.length) return null;
  const money = (n: number) => formatMoney(n, display, lang);
  const editing = edit ? rows.find((r) => r.acct.id === edit) : undefined;
  return (
    <div className="bk-real" data-anchor="aj-rewards-real">
      <h4 className="bk-h lab-head">{L(lang, "Saldo real según tu banco", "Real balance at your bank")}<Hint topic="imp-recompensas" /></h4>
      {rows.map(({ acct, fig }) => (
        <div key={acct.id} className="rw-real-row">
          <span className="rw-real-name">{short(acct.name)}</span>
          {fig ? (
            <button type="button" className="rw-real-one" data-acct={acct.id} onClick={() => setEdit(acct.id)}
              aria-label={L(lang, `Editar el saldo real de ${acct.name}`, `Edit ${acct.name}'s real balance`)}>
              <b className="num">{money(convertMinor(fig.amountMinor, fig.currency, display, rateE4))}</b>
              <small>{dayText(fig.asOf, lang)}</small>
              <Pencil aria-hidden />
            </button>
          ) : (
            <button type="button" className="rw-real-add" data-acct={acct.id} onClick={() => setEdit(acct.id)}>{L(lang, "Anotar saldo real", "Note real balance")}</button>
          )}
        </div>
      ))}
      {edit != null ? (
        <RewardRealForm cards={cards} startAcct={edit}
          initial={editing?.fig ? { amountMinor: convertMinor(editing.fig.amountMinor, editing.fig.currency, display, rateE4), asOf: editing.fig.asOf } : null}
          onDone={() => setEdit(null)} />
      ) : null}
    </div>
  );
}
