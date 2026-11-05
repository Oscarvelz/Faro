/**
 * Deudas in Libros (1.3.92): the middle row of Libros (Me deben · Debo) and what each side holds.
 * - DebtScale: the balance-scale selector (two halves, a pivot that leans toward the heavier side, a sliding plate).
 * - OwedSide: Me deben (ledger `lent`), shared by Central's Cobros panel and Libros.
 * - OweBook: Debo in Libros, sub-tabs Cuotas (the Cuotas book) · Préstamos (payoff plan, chart, loans).
 * - PersonSheet: one person's full history; NetLine; DebtChart; PayoffPlan.
 * The money rules live in lib/faro/debts.ts and lib/faro/loans.ts.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus, Scale, X } from "lucide-react";
import "./debts.css";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { Note } from "./finish";
import { useLayer } from "@/lib/manual/back";
import { CobroSpan, Subs } from "./screens";
import { DeboSum, DueLoans, LoanCard, LoanForm, deboTabNow, type LoanDraft } from "./loans";
import { convertMinor, parseAmount, uid } from "@/lib/faro/money";
import { todayIso } from "@/lib/faro/loans";
import { addLent, archiveLent, debtSeries, lentOf, lentPays, lentState, lentTotals, monthAhead, netBalance, payLent, payoffPlan, peopleOf, personKey, restoreLent, type Person } from "@/lib/faro/debts";
import type { Currency, Lent } from "@/lib/faro/types";

export type DebtSide = "owed" | "owe";
const stampOf = (iso: string) => (iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");

function useL() {
  const { lang } = useFaro();
  return (es: string, en: string) => (lang === "en" ? en : es);
}

function monthName(key: string, lang: string, year = true) {
  const d = new Date(`${key}-15T12:00:00`);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { month: "short", ...(year ? { year: "2-digit" } : {}) }).replace(".", "");
}

/* ---------- Central → Libros jump, and the way back ---------- */

let cobrosReturn: { depth: number; side: "in" | "out"; tab: "dues" | "loans" } | null = null;
let nextOweTab: "dues" | "loans" | null = null;
/** "Ver todo" in Central's Cobros: remember where Back should bring the user (that depth, that side, that tab). */
export function markCobrosReturn(depth: number, side: "in" | "out", tab: "dues" | "loans") {
  cobrosReturn = { depth, side, tab };
  nextOweTab = side === "out" ? tab : null;
}
/** Search / links: open Debo on this sub-tab next time it mounts. */
export function preferOweTab(tab: "dues" | "loans") {
  nextOweTab = tab;
}
/** Desk on mount: was it reached by Back from a "Ver todo" jump? Only at the very depth it left from, once. */
export function takeCobrosReturn(depth: number) {
  const r = cobrosReturn;
  if (!r) return null;
  if (depth !== r.depth) { if (depth < r.depth) cobrosReturn = null; return null; }
  cobrosReturn = null;
  if (r.side === "out" && r.tab === "loans") { try { localStorage.setItem("faro-debo-tab", "loans"); } catch { /* ignore */ } }
  return r;
}

/* ---------- the middle selector ---------- */

export function DebtScale({ value, onPick }: { value: DebtSide | null; onPick: (side: DebtSide) => void }) {
  const { session, fmt } = useFaro();
  const L = useL();
  const n = netBalance(session?.ledger);
  // The pivot leans toward the heavier side (at most 7°), like a real scale.
  const sum = n.owed + n.owe;
  const lean = sum > 0 ? Math.max(-7, Math.min(7, ((n.owe - n.owed) / sum) * 7)) : 0;
  return (
    <div className="debt-scale" data-on={value ?? undefined} role="tablist" aria-label={L("Deudas", "Debts")} data-anchor="debt-scale" style={{ ["--lean" as string]: `${lean.toFixed(2)}deg` }}>
      <i className="debt-plate" aria-hidden />
      <button type="button" role="tab" data-side="owed" aria-selected={value === "owed"} aria-current={value === "owed" ? "page" : undefined} onClick={() => onPick("owed")}>
        <span className="ds-lab">{L("Me deben", "Owed to me")}</span>
        <b className="num">{fmt(n.owed)}</b>
      </button>
      <span className="debt-pivot" aria-hidden><Scale /></span>
      <button type="button" role="tab" data-side="owe" aria-selected={value === "owe"} aria-current={value === "owe" ? "page" : undefined} onClick={() => onPick("owe")}>
        <span className="ds-lab">{L("Debo", "I owe")}</span>
        <b className="num">{fmt(n.owe)}</b>
      </button>
      <Hint topic="deudas" className="is-scale" corner overlay />
    </div>
  );
}

/* ---------- small shared parts ---------- */

export function NetLine() {
  const { session, fmt } = useFaro();
  const L = useL();
  const n = netBalance(session?.ledger);
  const tone = n.net > 0 ? "in" : n.net < 0 ? "out" : "zero";
  return (
    <div className="debt-net" data-tone={tone} data-anchor="debt-net">
      <span className="lab-head">{L("Balance neto", "Net balance")}<Hint topic="balance-neto" /></span>
      <strong className="num">{n.net > 0 ? "+" : n.net < 0 ? "−" : ""}{fmt(Math.abs(n.net))}</strong>
    </div>
  );
}

export function DebtChart() {
  const { session, fmt, lang } = useFaro();
  const L = useL();
  const pts = debtSeries(session?.ledger);
  if (!pts.length) return null;
  const peak = Math.max(1, ...pts.map((p) => Math.max(p.owe, p.owed)));
  const W = 300, H = 100, pad = 6;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, pts.length - 1);
  const y = (v: number) => H - pad - (v / peak) * (H - pad * 2);
  const path = (key: "owe" | "owed") => pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = (key: "owe" | "owed") => `${path(key)} L${x(pts.length - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const first = pts[0]!, last = pts[pts.length - 1]!;
  const moved = last.owe - first.owe;
  return (
    <section className="debt-chart" data-anchor="debt-chart">
      <div className="debt-chart-head">
        <span className="lab-head">{L("Últimos 6 meses", "Last 6 months")}<Hint topic="deudas-grafica" /></span>
        <span className="debt-legend">
          <i data-k="owe" />{L("Debo", "I owe")}
          <i data-k="owed" />{L("Me deben", "Owed")}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path className="dc-area is-owe" d={area("owe")} />
        <path className="dc-area is-owed" d={area("owed")} />
        <path className="dc-line is-owe" d={path("owe")} vectorEffect="non-scaling-stroke" />
        <path className="dc-line is-owed" d={path("owed")} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="debt-chart-months">{pts.map((p) => <span key={p.key}>{monthName(p.key, lang, false)}</span>)}</div>
      <p className="debt-chart-say">
        {moved < 0 ? <>{L("Tu deuda bajó", "Your debt fell")} <b className="num is-in">{fmt(-moved)}</b> {L("en 6 meses.", "in 6 months.")}</>
          : moved > 0 ? <>{L("Tu deuda subió", "Your debt rose")} <b className="num is-out">{fmt(moved)}</b> {L("en 6 meses.", "in 6 months.")}</>
            : L("Tu deuda no cambió en 6 meses.", "Your debt did not change in 6 months.")}
      </p>
    </section>
  );
}

/* ---------- one person's history ---------- */

export function PersonSheet({ person, onClose }: { person: Person; onClose: () => void }) {
  const { fmt } = useFaro();
  const L = useL();
  useLayer(true, onClose);
  const owed = person.side === "owed";
  return createPortal(
    <div className="ask-back debt-person-back" role="presentation" onMouseDown={onClose}>
      <div className={`debt-person${owed ? " is-owed" : " is-owe"}`} role="dialog" aria-modal="true" aria-label={person.name} onMouseDown={(e) => e.stopPropagation()}>
        <div className="dp-head">
          <b className="dp-face" aria-hidden>{person.name.slice(0, 1).toUpperCase()}</b>
          <strong>{person.name}</strong>
          <button type="button" className="dp-close" aria-label={L("Cerrar", "Close")} onClick={onClose}><X /></button>
        </div>
        <div className="dp-facts">
          <span><em>{L("Saldo", "Balance")}</em><strong className="num">{fmt(person.left)}</strong></span>
          <span><em>{L("Último pago", "Last payment")}</em><strong>{person.days === null ? L("Ninguno", "None yet") : person.days === 0 ? L("Hoy", "Today") : `${person.days} ${L(person.days === 1 ? "día" : "días", person.days === 1 ? "day" : "days")}`}</strong></span>
          <span><em>{L(owed ? "Préstamos" : "Préstamos", "Loans")}</em><strong className="num">{person.ids.length}</strong></span>
        </div>
        <ol className="dp-list">
          {person.events.map((ev) => (
            <li key={`${ev.kind}-${ev.id}`} data-kind={ev.kind}>
              <span className="num">{stampOf(ev.date)}</span>
              <span>{ev.kind === "loan" ? L(owed ? "Le prestaste" : "Te prestó", owed ? "You lent" : "Lent you") : L(owed ? "Te abonó" : "Abonaste", owed ? "Paid you" : "You paid")}</span>
              <strong className="num">{ev.kind === "pay" ? "−" : "+"}{fmt(ev.view)}</strong>
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  );
}

function usePerson(side: DebtSide) {
  const { session } = useFaro();
  const [open, setOpen] = useState<string | null>(null);
  const people = useMemo(() => peopleOf(session?.ledger, side), [session?.ledger, side]);
  const person = open ? people.find((p) => p.key === open) ?? null : null;
  const sheet = person ? <PersonSheet person={person} onClose={() => setOpen(null)} /> : null;
  return { people, openFor: (name: string) => setOpen(personKey(name)), sheet };
}

function sinceText(days: number | null, L: (es: string, en: string) => string) {
  if (days === null) return L("sin abonos", "no payments");
  if (days === 0) return L("abonó hoy", "paid today");
  return L(`último abono hace ${days} ${days === 1 ? "día" : "días"}`, `last paid ${days} ${days === 1 ? "day" : "days"} ago`);
}

/* ---------- Me deben ---------- */

/** Me deben, from the ledger. `libros` adds the person sheets, days since the last abono and the 6-month chart. */
export function OwedSide({ libros = false, dir }: { libros?: boolean; dir?: number }) {
  const { t, fmt, session, commit, lang } = useFaro();
  const L = useL();
  const [draft, setDraft] = useState(false);
  const [bonusFor, setBonusFor] = useState<string | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  useLayer(draft || !!bonusFor, () => { setDraft(false); setBonusFor(null); });
  useEffect(() => {
    const onOpen = (e: Event) => { const id = (e as CustomEvent<string>).detail; if (id === "cobros-file" || id === "debt-owed-file") setFileOpen(true); };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  const { people, openFor, sheet } = usePerson("owed");
  const ledger = session?.ledger;
  const display = ledger?.settings.display ?? "USD";
  const rate = ledger?.settings.rateE4 ?? 0;
  const view = (m: number, c: Currency) => convertMinor(m, c, display, rate);
  const all = lentOf(ledger);
  const active = all.filter((r) => !r.archived);
  const filed = all.filter((r) => r.archived);
  const sums = lentTotals(ledger);
  const today = todayIso();
  const nextOwed = ledger ? active.filter((r) => lentState(ledger, r).left > 0 && r.dueOn && r.dueOn >= today).map((r) => r.dueOn).sort()[0] ?? "" : "";
  function save(d: LoanDraft) {
    const row: Lent = { id: uid(), person: d.name, kind: d.kind, amountMinor: d.amountMinor, currency: d.currency, aprBps: d.aprBps, startedOn: todayIso(), dueOn: d.date, note: "" };
    commit((s) => addLent(s, row), d.name);
    setDraft(false);
  }
  const card = (row: Lent) => {
    if (!ledger) return null;
    const f = lentState(ledger, row);
    const who = people.find((p) => p.key === personKey(row.person));
    return (
      <LoanCard key={row.id} name={row.person} rate={row.kind === "interest"} leftView={view(f.left, row.currency)}
        amountView={view(row.amountMinor, row.currency)} amountLabel={t("cobro.lent")} dateIso={row.dueOn || row.startedOn} aprBps={row.aprBps}
        pays={lentPays(ledger, row.id).map((line) => ({ date: line.bookedOn || `${line.monthKey}-01`, view: view(line.amountMinor, line.currency) }))}
        extra={libros ? <p className="cobro-meta debt-since">{sinceText(who?.days ?? null, L)}{f.interest > 0 ? <> · {t("cobro.loan.interest")} <b className="num">{fmt(view(f.interest, row.currency))}</b></> : null}</p> : undefined}
        onWho={libros ? () => openFor(row.person) : undefined}
        payLabel={t("cobro.bonus")} paying={bonusFor === row.id} onPaying={(on) => setBonusFor(on ? row.id : null)}
        onPay={(minor, date) => commit((s) => payLent(s, row.id, convertMinor(minor, display, row.currency, rate), date, uid(), L("Abono", "Payment")), row.person)}
        archiveBody={t("cobro.archive.body")} onArchive={() => commit((s) => archiveLent(s, row.id), row.person)} hint="bono" />
    );
  };
  const group = (mode: "plain" | "interest") => {
    const list = active.filter((r) => (mode === "interest" ? r.kind === "interest" : r.kind !== "interest"));
    return (
      <div className={`cobro-group${mode === "interest" ? " is-rate" : ""}`}>
        <h3><i /><span>{t(mode === "interest" ? "cobro.rate" : "cobro.plain")}</span><b>{list.length}</b></h3>
        {list.length ? list.map(card) : <Note>{t("cobro.empty")}</Note>}
      </div>
    );
  };
  return (
    <div className="cobro-swap" data-dir={dir} data-anchor={libros ? "debt-owed" : "cobros-in"}>
      <div className="cobro-top">
        <div><strong className="num">{fmt(sums.left)}</strong></div>
        <button type="button" className="cobro-plus" aria-label={t("cobro.open")} aria-pressed={draft} onClick={() => setDraft((on) => !on)}><Plus /></button>
      </div>
      <DeboSum help="me-deben" empty={t("debo.sum.owed.empty")} parts={active.length ? [
        [`${people.filter((p) => p.active).length} ${t(people.filter((p) => p.active).length === 1 ? "debo.sum.person1" : "debo.sum.personN")}`],
        ...(sums.interest > 0 ? [[{ num: fmt(sums.interest) }, t("debo.sum.interest")]] : [[{ num: fmt(sums.paid) }, t("debo.sum.got")]]),
        ...(nextOwed ? [[`${t("debo.sum.nextGet")} ${new Date(`${nextOwed}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}`]] : []),
      ] : null} />
      {draft ? <LoanForm mode="lend" onCancel={() => setDraft(false)} onSave={save} /> : null}
      {libros ? <DebtChart /> : (
        <CobroSpan title={t("cobro.span")} total={sums.lent} events={all.map((r) => ({ date: r.startedOn, value: view(r.amountMinor, r.currency) }))}
          facts={[[t("cobro.lent"), sums.lent], [t("cobro.paid"), sums.paid], [t("cobro.left"), sums.left]]} />
      )}
      {group("plain")}
      {group("interest")}
      <div className={`cobro-file${fileOpen ? " is-open" : ""}`}>
        <div role="button" tabIndex={0} data-anchor={libros ? "debt-owed-file" : "cobros-file"} className="cobro-file-head" aria-expanded={fileOpen} onClick={() => setFileOpen((on) => !on)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFileOpen((on) => !on); } }}>
          <span className="lab-head">{t("cobro.file")}<Hint topic="archivar" /></span>
          <b>{filed.length}</b>
          <ChevronDown className={fileOpen ? "fold-chev is-open" : "fold-chev"} />
        </div>
        {fileOpen ? (filed.length ? filed.map((row) => (
          <article key={row.id} className="cobro-card is-file">
            <div className="cobro-who"><b>{row.person.slice(0, 1).toUpperCase()}</b><strong>{row.person}</strong></div>
            <p className="cobro-meta">
              {t("cobro.unpaid")} {fmt(view(row.unpaidMinor ?? 0, row.currency))}{" · "}{t("cobro.lent")} {fmt(view(row.amountMinor, row.currency))}{row.archivedOn ? ` · ${stampOf(row.archivedOn)}` : ""}
            </p>
            <div className="cobro-acts">
              <button type="button" className="btn secondary" onClick={() => commit((s) => restoreLent(s, row.id), row.person)}>{t("backup.restore")}</button>
            </div>
          </article>
        )) : <Note>{t("cobro.file.empty")}</Note>) : null}
      </div>
      {sheet}
    </div>
  );
}

/* ---------- payoff plan ---------- */

export function PayoffPlan() {
  const { session, fmt, commit, lang } = useFaro();
  const L = useL();
  const ledger = session?.ledger;
  const plan = payoffPlan(ledger);
  const display = ledger?.settings.display ?? "USD";
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(plan.fromUser ? (plan.budget / 100).toFixed(2) : ""); }, [plan.budget, plan.fromUser, editing]);
  const setOrder = (order: "avalanche" | "snowball") => commit((s) => ({ ...s, debtPlan: { order, monthlyMinor: s.debtPlan?.monthlyMinor ?? 0, currency: s.debtPlan?.currency ?? display } }), L("Plan de pago", "Payoff plan"));
  const saveBudget = () => {
    setEditing(false);
    const minor = text.trim() ? parseAmount(text) : 0;
    if (minor === null || minor < 0) return;
    if (minor === (plan.fromUser ? plan.budget : 0)) return;
    commit((s) => ({ ...s, debtPlan: { order: s.debtPlan?.order ?? "avalanche", monthlyMinor: minor, currency: display } }), L("Plan de pago", "Payoff plan"));
  };
  const name = (o: "avalanche" | "snowball") => (o === "avalanche" ? L("Avalancha", "Avalanche") : L("Bola de nieve", "Snowball"));
  const other = plan.order === "avalanche" ? "snowball" : "avalanche";
  const ch = plan.chosen;
  return (
    <section className="debt-plan" data-anchor="debt-plan">
      <div className="plan-head">
        <span className="lab-head">{L("Plan de pago", "Payoff plan")}<Hint topic="plan-pago" /></span>
      </div>
      <div className="plan-order" role="tablist" data-on={plan.order}>
        <i aria-hidden />
        {(["avalanche", "snowball"] as const).map((o) => (
          <button key={o} type="button" role="tab" aria-selected={plan.order === o} onClick={() => setOrder(o)}>
            <span>{name(o)}</span>
            <em>{o === "avalanche" ? L("la más cara", "most costly") : L("la más chica", "the smallest")}</em>
          </button>
        ))}
      </div>
      <label className="plan-budget">
        <span>{L("Puedo pagar al mes", "I can pay a month")}</span>
        <span className="plan-input">
          <input className="field num" inputMode="decimal" placeholder={plan.pace > 0 ? (plan.pace / 100).toFixed(2) : "0.00"} value={text}
            onFocus={() => setEditing(true)} onChange={(e) => setText(e.target.value)} onBlur={saveBudget} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        </span>
      </label>
      {!plan.debts.length ? <Note>{L("No hay préstamos con saldo: nada que planear.", "No loans with a balance: nothing to plan.")}</Note>
        : plan.budget <= 0 ? <Note kind="tip">{L("Pon cuánto puedes pagar al mes y verás qué pagar primero.", "Set what you can pay a month to see what to pay first.")}</Note>
          : !ch ? <Note kind="wait">{L(`Con ${fmt(plan.budget)} al mes no alcanza: el interés suma ${fmt(plan.minBudget)} al mes.`, `${fmt(plan.budget)} a month is not enough: interest adds ${fmt(plan.minBudget)} a month.`)}</Note>
            : (
              <>
                <div className="plan-facts">
                  <span><em>{L("Libre en", "Debt-free")}</em><strong>{monthName(monthAhead(ch.months), lang)}</strong></span>
                  <span><em>{L("Interés por pagar", "Interest to pay")}</em><strong className="num">{fmt(ch.interest)}</strong></span>
                  <span><em>{L("Meses", "Months")}</em><strong className="num">{ch.months}</strong></span>
                </div>
                <p className="plan-say">
                  {plan.saveInterest > 0 || plan.saveMonths > 0
                    ? <>{name(plan.order)} {L("ahorra", "saves")} <b className="num is-in">{fmt(Math.max(0, plan.saveInterest))}</b>{plan.saveMonths > 0 ? L(` y ${plan.saveMonths} ${plan.saveMonths === 1 ? "mes" : "meses"}`, ` and ${plan.saveMonths} ${plan.saveMonths === 1 ? "month" : "months"}`) : ""} {L("frente a", "versus")} {name(other)}.</>
                    : plan.saveInterest < 0 || plan.saveMonths < 0
                      ? <>{name(plan.order)} {L("cuesta", "costs")} <b className="num is-out">{fmt(-plan.saveInterest)}</b> {L("más que", "more than")} {name(other)}{plan.order === "snowball" ? L(", a cambio de cerrar antes la deuda más chica.", ", in exchange for closing the smallest debt sooner.") : "."}</>
                      : L("Aquí los dos órdenes cuestan lo mismo.", "Here both orders cost the same.")}
                  {!plan.fromUser ? <> {L("Uso tu ritmo de los últimos 3 meses.", "Using your pace of the last 3 months.")}</> : null}
                </p>
                <ol className="plan-list">
                  {ch.order.map((id, i) => {
                    const d = plan.debts.find((x) => x.id === id)!;
                    return (
                      <li key={id}>
                        <b className="num">{i + 1}</b>
                        <span>{d.name}</span>
                        <em>{d.aprBps > 0 ? `${(d.aprBps / 100).toLocaleString(lang === "en" ? "en-US" : "es-NI", { maximumFractionDigits: 2 })}%` : L("sin interés", "no interest")} · {monthName(monthAhead(ch.finish[id] ?? ch.months), lang)}</em>
                        <strong className="num">{fmt(d.left)}</strong>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
    </section>
  );
}

/* ---------- Debo in Libros ---------- */

export function OweBook() {
  const { session, fmt, lang } = useFaro();
  const L = useL();
  const [tab, setTab] = useState<"dues" | "loans">(() => { const v = nextOweTab ?? "dues"; nextOweTab = null; return v; });
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "debt-loans" || id === "debt-plan" || id === "cobros-loans-file") setTab("loans");
      else if (id === "debt-dues") setTab("dues");
    };
    window.addEventListener("faro-open", onOpen);
    return () => window.removeEventListener("faro-open", onOpen);
  }, []);
  const { openFor, sheet, people } = usePerson("owe");
  const plan = payoffPlan(session?.ledger);
  const ch = plan.chosen;
  const loanFacts = (id: string, interestSoFar: number) => {
    if (!ch || ch.finish[id] === undefined) return null;
    const total = interestSoFar + (ch.interestOf[id] ?? 0);
    const who = people.find((p) => p.ids.includes(id));
    return (
      <p className="cobro-meta debt-since">
        {L("libre en", "free by")} {monthName(monthAhead(ch.finish[id]!), lang)}{total > 0 ? <> · {L("interés total", "total interest")} <b className="num">{fmt(total)}</b></> : null}
        {who && who.days !== null ? <> · {L(`abono hace ${who.days} d`, `paid ${who.days} d ago`)}</> : null}
      </p>
    );
  };
  return (
    <>
      <div className="debo-tabs" role="tablist" data-anchor="debt-owe-tabs">
        <span className="debo-tab" data-on={tab === "dues" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "dues"} aria-pressed={tab === "dues"} onClick={() => setTab("dues")}>{L("Cuotas", "Dues")}</button>
          <Hint topic="debo" />
        </span>
        <span className="debo-tab" data-on={tab === "loans" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "loans"} aria-pressed={tab === "loans"} onClick={() => setTab("loans")}>{L("Préstamos", "Loans")}</button>
          <Hint topic="prestamos" />
        </span>
      </div>
      {tab === "dues" ? <div className="debt-dues" data-anchor="debt-dues"><Subs /></div> : (
        <div className="debt-loans" data-anchor="debt-loans">
          <DueLoans libros onWho={openFor} facts={loanFacts} between={<><PayoffPlan /><DebtChart /></>} />
        </div>
      )}
      {sheet}
    </>
  );
}

/** What Libros shows for the middle row. */
export function DebtBook({ side }: { side: DebtSide }) {
  return (
    <div className="debt-book" data-side={side}>
      <NetLine />
      {side === "owed" ? <OwedSide libros /> : <OweBook />}
    </div>
  );
}

/** "Ver todo" at the foot of each side of Central's Cobros. */
export function SeeAll({ side, onGo }: { side: "in" | "out"; onGo: () => void }) {
  const { setUi, depth } = useFaro();
  const L = useL();
  return (
    <button type="button" className="btn secondary cobro-all" data-anchor="cobros-see-all" onClick={() => {
      markCobrosReturn(depth, side, deboTabNow);
      onGo();
      setUi({ section: "income", vault: side === "in" ? "owed" : "owe" });
    }}>{L("Ver todo en Libros", "See all in Books")}</button>
  );
}
