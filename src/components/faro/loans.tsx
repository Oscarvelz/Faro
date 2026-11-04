/**
 * Loans UI (Nov 2026), shared by both sides of Cobros:
 * - LoanForm and LoanCard are the one form and the one card for a loan, used by Me deben (lend) and Debo → Préstamos (borrow).
 * - DeboSide holds the Debo sub-tabs (Cuotas | Préstamos); DueLoans is the Préstamos group; LoansStudy is its Estudio card.
 * The money rule lives in lib/faro/loans.ts.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { useFaro } from "./provider";
import { FieldTip } from "./ui";
import { Hint } from "./hint";
import { useLayer } from "@/lib/manual/back";
import { DayField } from "./line-form";
import { CobroSpan } from "./screens";
import { convertMinor, parseAmount, uid } from "@/lib/faro/money";
import { ISO_DAY, addLoan, archiveLoan, restoreLoan, loanPays, loanState, loanTotals, loansOf, payLoan, todayIso } from "@/lib/faro/loans";
import type { Currency, Group, Loan } from "@/lib/faro/types";

export type LoanDraft = { name: string; who: "person" | "entity"; kind: "plain" | "interest"; amountMinor: number; currency: Currency; aprBps: number; date: string; book: Group };

const stampOf = (iso: string) => (iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");
const TINTS = ["#7aa2c4", "#8fb9a6", "#e7c27a", "#d7a08a", "#a9b4de"];

/** The loan form. mode "lend" = Me deben (as it always was); "borrow" = Préstamos (lender kind, currency, book). */
export function LoanForm({ mode, onCancel, onSave }: { mode: "lend" | "borrow"; onCancel: () => void; onSave: (draft: LoanDraft) => void }) {
  const { t, session } = useFaro();
  const display = session?.ledger.settings.display ?? "USD";
  const borrow = mode === "borrow";
  const [kind, setKind] = useState<"plain" | "interest">("plain");
  const [who, setWho] = useState<"person" | "entity">("person");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>(display);
  const [date, setDate] = useState(borrow ? todayIso() : "");
  const [apr, setApr] = useState("");
  const [book, setBook] = useState<Group>("fixed");
  function save() {
    const minor = parseAmount(amount);
    const clean = name.trim();
    if (!clean || minor === null || minor <= 0) return;
    const pct = Number(apr.trim().replace(",", "."));
    onSave({
      name: clean, who, kind, amountMinor: minor, currency: borrow ? currency : display,
      aprBps: kind === "interest" && Number.isFinite(pct) && pct > 0 ? Math.round(pct * 100) : 0,
      date: ISO_DAY.test(date) ? date : todayIso(), book,
    });
  }
  return (
    <div className={`form-block cobro-form ${borrow ? "is-owe is-loan" : "is-lend"}`}>
      <div className="cobro-grid">
        <div className="label is-wide">
          <span className="lab-head">{t("cobro.kind")}<FieldTip topic={borrow ? "prestamo-interes" : "con-interes"} /></span>
          <div className="cobro-kind">
            <button type="button" aria-pressed={kind === "plain"} onClick={() => setKind("plain")}>{t("cobro.plain")}</button>
            <button type="button" aria-pressed={kind === "interest"} onClick={() => setKind("interest")}>{t("cobro.rate")}</button>
          </div>
        </div>
        {borrow ? (
          <div className="label is-wide">
            <span className="lab-head">{t("cobro.loan.lender")}<FieldTip topic="f-prestamo-quien" /></span>
            <div className="cobro-kind">
              <button type="button" aria-pressed={who === "person"} onClick={() => setWho("person")}>{t("cobro.loan.who.person")}</button>
              <button type="button" aria-pressed={who === "entity"} onClick={() => setWho("entity")}>{t("cobro.loan.who.entity")}</button>
            </div>
            <input className="field" aria-label={t("cobro.loan.lender")} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : (
          <label className="label is-wide">
            <span className="lab-head">{t("cobro.person")}<FieldTip topic="f-cobro-persona" /></span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="label">
          <span className="lab-head">{t("cobro.amount")}<FieldTip topic={borrow ? "f-prestamo-monto" : "f-cobro-monto"} /></span>
          <input className="field num" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="label is-right">
          <span className="lab-head">{t(borrow ? "cobro.loan.on" : "cobro.due")}<FieldTip topic={borrow ? "f-prestamo-fecha" : "f-cobro-fecha"} /></span>
          <DayField value={date} onChange={setDate} />
        </div>
        {borrow ? (
          <div className="label is-wide">
            <span className="lab-head">{t("cobro.loan.currency")}<FieldTip topic="f-prestamo-moneda" /></span>
            <div className="cobro-kind">
              <button type="button" aria-pressed={currency === "NIO"} onClick={() => setCurrency("NIO")}>C$ NIO</button>
              <button type="button" aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")}>$ USD</button>
            </div>
          </div>
        ) : null}
        {kind === "interest" ? (
          <label className="label is-wide">
            <span className="lab-head">{t("cobro.apr")}<FieldTip topic={borrow ? "f-prestamo-interes" : "f-cobro-interes"} /></span>
            <span className="cobro-pct"><input className="field num" inputMode="decimal" placeholder="0" value={apr} onChange={(e) => setApr(e.target.value)} /><i aria-hidden>%</i></span>
          </label>
        ) : null}
        {borrow ? (
          <div className="label is-wide">
            <span className="lab-head">{t("cobro.loan.book")}<FieldTip topic="f-prestamo-libro" /></span>
            <div className="cobro-kind">
              <button type="button" aria-pressed={book === "fixed"} onClick={() => setBook("fixed")}>{t("cobro.loan.book.fixed")}</button>
              <button type="button" aria-pressed={book === "variable"} onClick={() => setBook("variable")}>{t("cobro.loan.book.variable")}</button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="cobro-actions">
        <button type="button" className="btn secondary" onClick={onCancel}>{t("cancel")}</button>
        <button type="button" className="btn" onClick={save}>{t("save")}</button>
      </div>
    </div>
  );
}

/** One loan's card: who, pending, amount · date · rate, its payments, then Pay/Bono and Archive. Amounts arrive in the view currency. */
export function LoanCard({ name, rate, leftView, amountView, amountLabel, dateIso, aprBps, pays, payLabel, paying, onPaying, onPay, archiveBody, onArchive, hint, extra }: {
  name: string; rate: boolean; leftView: number; amountView: number; amountLabel: string; dateIso: string; aprBps: number;
  pays: { date: string; view: number }[]; payLabel: string; paying: boolean; onPaying: (on: boolean) => void;
  onPay: (displayMinor: number, date: string) => void; archiveBody: string; onArchive: () => void; hint: string; extra?: ReactNode;
}) {
  const { t, fmt, lang, confirm } = useFaro();
  const [amt, setAmt] = useState("");
  const [on, setOn] = useState("");
  useEffect(() => { if (paying) { setAmt(""); setOn(todayIso()); } }, [paying]);
  const tint = TINTS[name.charCodeAt(0) % 5];
  return (
    <article className={`cobro-card${rate ? " is-rate" : ""}`}>
      <div className="cobro-row">
        <div className="cobro-who">
          <b style={{ background: tint }}>{name.slice(0, 1).toUpperCase()}</b>
          <strong>{name}</strong>
        </div>
        <strong className="num">{fmt(leftView)}</strong>
      </div>
      <p className="cobro-meta">
        {amountLabel} {fmt(amountView)}
        {" · "}
        {stampOf(dateIso)}
        {rate && aprBps > 0 ? ` · ${(aprBps / 100).toLocaleString(lang === "en" ? "en-US" : "es-NI", { maximumFractionDigits: 2 })}%` : ""}
      </p>
      {extra}
      {pays.length ? <p className="cobro-meta">{pays.map((p) => `${stampOf(p.date)} ${fmt(p.view)}`).join(" · ")}</p> : null}
      {paying ? (
        <div className="form-block cobro-form is-bonus">
          <div className="cobro-grid">
            <label className="label">
              <span className="lab-head">{t("cobro.amount")}<FieldTip topic="f-bono-monto" /></span>
              <input className="field num" inputMode="decimal" placeholder="0.00" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </label>
            <div className="label is-right">
              <span className="lab-head">{t("cobro.bonus.on")}<FieldTip topic="f-bono-fecha" /></span>
              <DayField value={on} onChange={setOn} />
            </div>
          </div>
          <div className="cobro-actions">
            <button type="button" className="btn secondary" onClick={() => onPaying(false)}>{t("cancel")}</button>
            <button type="button" className="btn" onClick={() => {
              const minor = parseAmount(amt);
              if (minor === null || minor <= 0) return;
              onPay(minor, ISO_DAY.test(on) ? on : todayIso());
              onPaying(false);
            }}>{t("save")}</button>
          </div>
        </div>
      ) : (
        <div className="cobro-acts">
          <button type="button" className="btn secondary" onClick={() => onPaying(true)}>{payLabel}</button>
          <button type="button" className="btn secondary" onClick={() => confirm({ title: t("cobro.archive"), body: `${name}. ${archiveBody} ${fmt(leftView)}`, yes: t("cobro.archive"), run: onArchive })}>{t("cobro.archive")}</button>
          <Hint topic={hint} className="is-acts" corner />
        </div>
      )}
    </article>
  );
}

const TAB_KEY = "faro-debo-tab";
function readTab(): "dues" | "loans" {
  // Always opens on Cuotas (Oscar, Nov 3); only an "Ir allí" to Préstamos leaves a one-shot flag.
  try { const v = localStorage.getItem(TAB_KEY); localStorage.removeItem(TAB_KEY); return v === "loans" ? "loans" : "dues"; } catch { return "dues"; }
}

/** Debo: a light underline tab pair (Cuotas | Préstamos) under the big pills; only the chosen group shows. The choice is remembered. */
export function DeboSide({ dues }: { dues: ReactNode }) {
  const { t } = useFaro();
  const [tab, setTab] = useState<"dues" | "loans">(readTab);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "cobros-loans" || id === "cobros-loans-file") pick("loans");
      else if (id === "cobros-out" || id === "cobros-out-file") pick("dues");
      // Debo is already mounted, so the one-shot flag Cobros leaves for a fresh mount is not needed: drop it after
      // Cobros' own listener (which runs after this one) so the next plain open is on Cuotas again.
      window.setTimeout(() => { try { localStorage.removeItem(TAB_KEY); } catch { /* ignore */ } }, 0);
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  function pick(next: "dues" | "loans") {
    setTab(next);
  }
  return (
    <>
      <div className="debo-tabs" role="tablist" data-anchor="cobros-debo-tabs">
        <span className="debo-tab" data-on={tab === "dues" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "dues"} aria-pressed={tab === "dues"} onClick={() => pick("dues")}>{t("cobro.tab.dues")}</button>
          <Hint topic="debo" />
        </span>
        <span className="debo-tab" data-on={tab === "loans" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "loans"} aria-pressed={tab === "loans"} onClick={() => pick("loans")}>{t("cobro.tab.loans")}</button>
          <Hint topic="prestamos" />
        </span>
      </div>
      {tab === "loans" ? <DueLoans key="loans" /> : dues}
    </>
  );
}

/** The line under a Debo total: short facts that add to the number (count, next date, interest, paid), never a restatement.
 *  Parts are plain text or amounts (amounts get .num, amber in Tron). Empty → one hint. */
export function DeboSum({ parts, empty, help }: { parts: Array<Array<string | { num: string }>> | null; empty: string; help?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const sig = JSON.stringify(parts);
  // Never wraps, never clips: when the line is wider than its row (narrow phones, large text), the count goes first, then the middle fact.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const bits = [...el.querySelectorAll<HTMLElement>(".debo-sum-bit")];
      bits.forEach((b) => { b.hidden = false; });
      const order = bits.length > 2 ? [bits[0], bits[1]] : bits.length > 1 ? [bits[0]] : [];
      for (const b of order) { if (el.scrollWidth <= el.clientWidth + 1) break; b.hidden = true; }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sig]);
  const tip = help ? <Hint topic={help} /> : null;
  if (!parts) return <p className="debo-sum is-empty">{empty}{tip}</p>;
  return (
    <p className="debo-sum" ref={ref}>
      {parts.map((group, i) => (
        <span key={i} className="debo-sum-bit">
          {group.map((part, j) => <Fragment key={j}>{j ? " " : null}{typeof part === "string" ? part : <b className="num">{part.num}</b>}</Fragment>)}
        </span>
      ))}
      {tip}
    </p>
  );
}

/** Debo → Préstamos: loans received, kept in the ledger. Payments become normal lines in the loan's book. */
export function DueLoans() {
  const { t, fmt, session, commit } = useFaro();
  const [adding, setAdding] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  useLayer(adding || !!payFor, () => { setAdding(false); setPayFor(null); });
  useEffect(() => {
    const onOpen = (e: Event) => { if ((e as CustomEvent<string>).detail === "cobros-loans-file") setFileOpen(true); };
    const onClose = () => { setAdding(false); setPayFor(null); };
    window.addEventListener("faro-open", onOpen);
    window.addEventListener("faro-loans-close", onClose);
    return () => { window.removeEventListener("faro-open", onOpen); window.removeEventListener("faro-loans-close", onClose); };
  }, []);
  const ledger = session?.ledger;
  const display = ledger?.settings.display ?? "USD";
  const rate = ledger?.settings.rateE4 ?? 0;
  const view = (minor: number, currency: Currency) => convertMinor(minor, currency, display, rate);
  const all = loansOf(ledger);
  const active = all.filter((l) => !l.archived);
  const filed = all.filter((l) => l.archived);
  const sums = loanTotals(ledger);
  function save(d: LoanDraft) {
    const loan: Loan = { id: uid(), lender: d.name, who: d.who, kind: d.kind, amountMinor: d.amountMinor, currency: d.currency, aprBps: d.aprBps, takenOn: d.date, book: d.book, note: "" };
    commit((s) => addLoan(s, loan), d.name);
    setAdding(false);
  }
  return (
    <div className="cobro-swap" data-anchor="cobros-loans">
      <div className="cobro-top">
        <div>
          <strong className="num">{fmt(sums.left)}</strong>
        </div>
        <button type="button" className="cobro-plus" aria-pressed={adding} aria-label={t("cobro.loan.add")} onClick={() => setAdding((on) => !on)}><Plus /></button>
      </div>
      <DeboSum empty={t("debo.sum.loans.empty")} parts={sums.count ? [
        [`${sums.count} ${t(sums.count === 1 ? "debo.sum.loan1" : "debo.sum.loanN")}`],
        ...(sums.interest > 0 ? [[t("debo.sum.interest"), { num: fmt(sums.interest) }]] : []),
        [{ num: fmt(sums.paid) }, t("debo.sum.paid")],
      ] : null} />
      {adding ? <LoanForm mode="borrow" onCancel={() => setAdding(false)} onSave={save} /> : null}
      <CobroSpan out help="prestamos-tiempo" title={t("cobro.loan.span")} total={sums.borrowed}
        events={all.map((l) => ({ date: l.takenOn, value: view(l.amountMinor, l.currency) }))}
        facts={[[t("cobro.loan.got"), sums.borrowed], [t("cobro.loan.paid"), sums.paid], [t("cobro.loan.left"), sums.left]]} />
      {ledger && active.length ? active.map((loan) => {
        const f = loanState(ledger, loan);
        return (
          <LoanCard key={loan.id} name={loan.lender} rate={loan.kind === "interest"} leftView={view(f.left, loan.currency)}
            amountView={view(loan.amountMinor, loan.currency)} amountLabel={t("cobro.loan.got")} dateIso={loan.takenOn} aprBps={loan.aprBps}
            pays={loanPays(ledger, loan.id).map((line) => ({ date: line.bookedOn || `${line.monthKey}-01`, view: view(line.amountMinor, line.currency) }))}
            extra={<p className="cobro-meta loan-book">{t(loan.who === "entity" ? "cobro.loan.who.entity" : "cobro.loan.who.person")} · {t(loan.book === "variable" ? "cobro.loan.book.variable" : "cobro.loan.book.fixed")}{f.interest > 0 ? <> · {t("cobro.loan.interest")} <b className="num">{fmt(view(f.interest, loan.currency))}</b></> : null}</p>}
            payLabel={t("cobro.loan.pay")} paying={payFor === loan.id} onPaying={(on) => setPayFor(on ? loan.id : null)}
            onPay={(minor, date) => commit((s) => payLoan(s, loan.id, convertMinor(minor, display, loan.currency, rate), date, uid(), t("cobro.loan.pay.line")), loan.lender)}
            archiveBody={t("cobro.loan.archive.body")} onArchive={() => commit((s) => archiveLoan(s, loan.id), loan.lender)} hint="prestamo-abono" />
        );
      }) : <p className="cobro-empty">{t("cobro.loan.empty")}</p>}
      <div className={`cobro-file${fileOpen ? " is-open" : ""}`}>
        <div role="button" tabIndex={0} data-anchor="cobros-loans-file" className="cobro-file-head" aria-expanded={fileOpen} onClick={() => setFileOpen((on) => !on)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFileOpen((on) => !on); } }}>
          <span className="lab-head">{t("cobro.file")}<Hint topic="prestamo-archivo" /></span>
          <b>{filed.length}</b>
          <ChevronDown className={fileOpen ? "fold-chev is-open" : "fold-chev"} />
        </div>
        {fileOpen ? (ledger && filed.length ? filed.map((loan) => (
          <article key={loan.id} className="cobro-card is-file">
            <div className="cobro-who">
              <b>{loan.lender.slice(0, 1).toUpperCase()}</b>
              <strong>{loan.lender}</strong>
            </div>
            <p className="cobro-meta">
              {t("cobro.loan.unpaid")} {fmt(view(loan.unpaidMinor ?? 0, loan.currency))}
              {" · "}
              {t("cobro.loan.got")} {fmt(view(loan.amountMinor, loan.currency))}
              {loan.archivedOn ? ` · ${stampOf(loan.archivedOn)}` : ""}
            </p>
            {loanPays(ledger, loan.id).length ? <p className="cobro-meta">{loanPays(ledger, loan.id).map((line) => `${stampOf(line.bookedOn || "")} ${fmt(view(line.amountMinor, line.currency))}`).join(" · ")}</p> : null}
            <div className="cobro-acts">
              <button type="button" className="btn secondary" onClick={() => commit((s) => restoreLoan(s, loan.id), loan.lender)}>{t("backup.restore")}</button>
            </div>
          </article>
        )) : <p className="cobro-empty">{t("cobro.loan.file.empty")}</p>) : null}
      </div>
    </div>
  );
}

/** Estudio card: loans received, pending with today's interest. */
export function LoansStudy() {
  const { t, fmt, session } = useFaro();
  const ledger = session?.ledger;
  const sums = loanTotals(ledger);
  const display = ledger?.settings.display ?? "USD";
  const rate = ledger?.settings.rateE4 ?? 0;
  const rows = ledger ? loansOf(ledger).filter((l) => !l.archived).map((l) => ({ id: l.id, name: l.lender, left: convertMinor(loanState(ledger, l).left, l.currency, display, rate) })).sort((a, b) => b.left - a.left).slice(0, 5) : [];
  const peak = Math.max(...rows.map((r) => r.left), 1);
  const whole = Math.max(sums.paid + sums.left, 1);
  return (
    <section className="card">
      <div className="stat-head">
        <h2 className="serif text-2xl lab-head">{t("study.loans.title")}<Hint topic="estudio-prestamos" fitParent /></h2>
      </div>
      <p className="num serif text-3xl">{fmt(sums.left)}</p>
      <p className="text-sm text-muted">{t("study.loans.still")}</p>
      <div className="bar-track owed-track" aria-hidden><div className="bar-fill" style={{ width: `${(sums.paid / whole) * 100}%` }} /></div>
      <div className="span-facts">
        <div><em>{t("cobro.loan.got")}</em><strong className="num">{fmt(sums.borrowed)}</strong></div>
        <div><em>{t("cobro.loan.paid")}</em><strong className="num">{fmt(sums.paid)}</strong></div>
        <div><em>{t("cobro.loan.interest")}</em><strong className="num">{fmt(sums.interest)}</strong></div>
      </div>
      {rows.map((r) => (
        <div key={r.id} className="share">
          <span className="share-name">{r.name}</span>
          <span className="num">{fmt(r.left)}</span>
          <div className="bar-track"><div className="bar-fill tone-4" style={{ width: `${Math.max(r.left > 0 ? 6 : 0, (r.left / peak) * 100)}%` }} /></div>
        </div>
      ))}
    </section>
  );
}
