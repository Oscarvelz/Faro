/**
 * Deudas in Libros (1.3.92): the middle row of Libros (Me deben · Debo) and what each side holds.
 * - DebtScale: the balance-scale selector (two halves, a pivot that leans toward the heavier side, a sliding plate).
 * - OwedSide: Me deben (ledger `lent`), shared by Central's Cobros panel and Libros.
 * - OweBook: Debo in Libros, sub-tabs Cuotas (the Cuotas book) · Préstamos (payoff plan, chart, loans).
 * - PersonSheet: one person's full history; NetLine; DebtChart; PayoffPlan.
 * The money rules live in lib/faro/debts.ts and lib/faro/loans.ts.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ChevronDown, HandCoins, Plus, RefreshCw, Scale, X } from "lucide-react";
import "./debts.css";
import "./top-scale.css";
import { useFaro } from "./provider";
import { Hint } from "./hint";
import { Note } from "./finish";
import { useLayer } from "@/lib/manual/back";
import { CobroSpan, Subs } from "./screens";
import { DueSide, TABLET_ONE_MQ, useTabletOne } from "./book-side";
import { AreaAdvisor, SideCol } from "./area-advisor";
import { FreqPick } from "./fit-pick";
import { freqPresetsOf, cadenceLabel } from "@/lib/faro/cadence";
import { DeboSum, DueLoans, LoanCard, LoanForm, deboTabNow, type LoanDraft } from "./loans";
import { RewardsGroup } from "./cards";
import { BookKit } from "./book-kit";
import { rewardsTotals } from "@/lib/faro/cards";
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
let oweTabMem: "dues" | "loans" = "dues";
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

/* A side picked by a person (a tap, or a swipe that lands on it): the scale answers in that side's colour (a bloom from
   the tap point, the dot pulses, the beam settles), then what opens below says "here I am" once. Never on load or Back. */
let helloSide: DebtSide | null = null;
let helloAt = 0;
export function debtHello(side: DebtSide, point?: { x: number; y: number }) {
  helloSide = side;
  helloAt = Date.now();
  window.dispatchEvent(new CustomEvent("faro-debt-tap", { detail: { side, point } }));
}
function takeHello(side: DebtSide): boolean {
  if (helloSide !== side || Date.now() - helloAt > 900) return false;
  helloSide = null;
  return true;
}
const HELLO: Record<DebtSide, string> = { owe: ".debo-tab", owed: ".debt-book > .cobro-swap > .cobro-top, .debt-book .cobro-group" };

export function DebtScale({ value, onPick, top = false }: { value: DebtSide | null; onPick: (side: DebtSide) => void; top?: boolean }) {
  const { session, fmt } = useFaro();
  const L = useL();
  const n = netBalance(session?.ledger);
  const root = useRef<HTMLDivElement>(null);
  const [tap, setTap] = useState<{ side: DebtSide; x: number; y: number; n: number } | null>(null);
  // 1.3.120 (tablet/desktop top bar): at rest only the scale emblem shows; a tap slides Me deben · Debo out from behind it.
  // Open is its own layer (one Back entry); the emblem again, Back or a tap outside folds them back in.
  const [open, setOpen] = useState(false);
  const [poke, setPoke] = useState(0);
  useLayer(top && open, () => setOpen(false));
  // A compositor transition that never got a start time (Chrome, nothing else repainting) would leave the halves at their
  // start (1.3.114 drawer lesson): anything still pending shortly after the tap is finished, so they are always where the state says.
  const firstFold = useRef(true);
  useEffect(() => {
    if (!top) return;
    if (firstFold.current) { firstFold.current = false; return; }
    // A second look after the longest transition (.5s + .04s delay) finishes any that a busy main thread left behind.
    const settle = (all: boolean) => () => {
      const el = root.current;
      if (!el) return;
      for (const a of el.getAnimations({ subtree: true })) {
        if (!(a instanceof CSSTransition)) continue;
        if (all || a.pending || a.currentTime === 0 || a.currentTime === null) a.finish();
      }
    };
    const id = window.setTimeout(settle(false), 140);
    const late = window.setTimeout(settle(true), 720);
    return () => { window.clearTimeout(id); window.clearTimeout(late); };
  }, [top, open]);
  useEffect(() => {
    if (!top || !open) return;
    const away = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || !t.isConnected || root.current?.contains(t) || t.closest('[role="dialog"], .ftip-pop, .ask-back')) return;
      setOpen(false);
    };
    document.addEventListener("click", away, true);
    return () => document.removeEventListener("click", away, true);
  }, [top, open]);
  useEffect(() => {
    let clear = 0;
    const on = (e: Event) => {
      const { side, point } = (e as CustomEvent<{ side: DebtSide; point?: { x: number; y: number } }>).detail;
      const btn = root.current?.querySelector<HTMLElement>(`button[data-side="${side}"]`);
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const x = point ? point.x - r.left : r.width / 2;
      const y = point ? point.y - r.top : r.height / 2;
      setTap((t) => ({ side, x, y, n: (t?.n ?? 0) + 1 }));
      window.clearTimeout(clear);
      clear = window.setTimeout(() => setTap(null), 760);
    };
    window.addEventListener("faro-debt-tap", on);
    return () => { window.removeEventListener("faro-debt-tap", on); window.clearTimeout(clear); };
  }, []);
  // The pivot leans toward the heavier side (at most 7°), like a real scale.
  const sum = n.owed + n.owe;
  const lean = sum > 0 ? Math.max(-7, Math.min(7, ((n.owe - n.owed) / sum) * 7)) : 0;
  const pick = (side: DebtSide) => (e: React.MouseEvent) => {
    debtHello(side, e.detail > 0 ? { x: e.clientX, y: e.clientY } : undefined);
    onPick(side);
  };
  const bloom = (side: DebtSide) => (tap?.side === side ? <span key={tap.n} className="ds-bloom" aria-hidden style={{ left: tap.x, top: tap.y }} /> : null);
  const shut = top && !open;
  const hide = shut ? { tabIndex: -1, "aria-hidden": true as const } : {};
  return (
    <div ref={root} className={`debt-scale${top ? " is-top" : ""}`} data-on={value ?? undefined} data-tap={tap?.side} data-tapn={tap ? tap.n % 2 : undefined} data-fold={top ? (open ? "open" : "shut") : undefined} data-has-in={top && n.owed > 0 ? "" : undefined} data-has-owe={top && n.owe > 0 ? "" : undefined} role="tablist" aria-label={L("Deudas", "Debts")} data-anchor="debt-scale" style={{ ["--lean" as string]: `${lean.toFixed(2)}deg` }}>
      {top ? <><i className="ds-shell is-l" aria-hidden /><i className="ds-shell is-r" aria-hidden /></> : null}
      <i className="debt-plate" aria-hidden />
      <button type="button" role="tab" data-side="owed" aria-selected={value === "owed"} aria-current={value === "owed" ? "page" : undefined} onClick={pick("owed")} {...hide}>
        {bloom("owed")}
        <span className="ds-lab">{L("Me deben", "Owed to me")}</span>
        <b className="num">{fmt(n.owed)}</b>
      </button>
      {top ? (
        <button type="button" className="ds-emblem" data-poke={poke ? poke % 2 : undefined} aria-expanded={open} aria-label={`${L("Deudas", "Debts")}: ${L("Me deben", "Owed to me")} ${fmt(n.owed)} · ${L("Debo", "I owe")} ${fmt(n.owe)}`} onClick={() => { setPoke((k) => k + 1); setOpen((o) => !o); }}>
          <i className="ts-aura is-in" aria-hidden />
          <i className="ts-aura is-owe" aria-hidden />
          {poke ? <i key={poke} className="ts-ring" aria-hidden /> : null}
          <ScaleEmblem lean={lean} />
        </button>
      ) : <span className="debt-pivot" aria-hidden><Scale /></span>}
      <button type="button" role="tab" data-side="owe" aria-selected={value === "owe"} aria-current={value === "owe" ? "page" : undefined} onClick={pick("owe")} {...hide}>
        {bloom("owe")}
        <span className="ds-lab">{L("Debo", "I owe")}</span>
        <b className="num">{fmt(n.owe)}</b>
      </button>
      <Hint topic="deudas" className="is-scale" corner overlay />
    </div>
  );
}

/** The top-bar emblem (1.3.120): a drawn balance scale, one stroke weight, both pans hanging straight down from the beam
 *  ends as the beam leans toward the heavier side. Teal pan = Me deben, amber pan = Debo. 40-unit grid, crisp at any size. */
function ScaleEmblem({ lean }: { lean: number }) {
  const a = (lean * Math.PI) / 180, arm = 13;
  const dx = arm - arm * Math.cos(a), dy = arm * Math.sin(a);
  const pan = (x: number) => `M${x - 4.6} 23.2 H${x + 4.6} A4.6 3.4 0 0 1 ${x - 4.6} 23.2 Z`;
  return (
    <svg className="ts-scale" viewBox="0 0 40 40" aria-hidden focusable="false">
      <g className="ts-frame">
        <path d="M20 7.9 V32.4" />
        <path d="M15.6 32.4 H24.4" />
        <path d="M12.6 35.2 H27.4" />
      </g>
      <g className="ts-pan is-in" style={{ transform: `translate(${dx.toFixed(3)}px, ${(-dy).toFixed(3)}px)` }}>
        <path className="ts-cord" d="M7 10.6 L2.4 23.2 M7 10.6 L11.6 23.2" />
        <path className="ts-bowl" d={pan(7)} />
      </g>
      <g className="ts-pan is-owe" style={{ transform: `translate(${(-dx).toFixed(3)}px, ${dy.toFixed(3)}px)` }}>
        <path className="ts-cord" d="M33 10.6 L28.4 23.2 M33 10.6 L37.6 23.2" />
        <path className="ts-bowl" d={pan(33)} />
      </g>
      <g className="ts-beam">
        <path d="M6.2 10.6 H33.8" />
        <circle className="ts-pin" cx="20" cy="10.6" r="1.55" />
      </g>
      <circle className="ts-finial" cx="20" cy="6.2" r="1.7" />
    </svg>
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
  const tabletOne = useTabletOne();
  const { t, fmt, session, commit, lang } = useFaro();
  const L = useL();
  const [draft, setDraft] = useState(false);
  const [bonusFor, setBonusFor] = useState<string | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [editFor, setEditFor] = useState<string | null>(null);
  useLayer(draft || !!bonusFor, () => { setDraft(false); setBonusFor(null); });
  useLayer(!!editFor, () => setEditFor(null));
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
  // 1.3.109: card rewards are money owed to the user (by the bank): the top figure is people + rewards, split below.
  const rwSum = rewardsTotals(ledger);
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
        <div><strong className="num" data-anchor="owed-total">{fmt(sums.left + rwSum.total)}</strong></div>
        {libros ? (
          <span className="cobro-kit">
            <BookKit title={lang === "en" ? "Owed to me" : "Me deben"} test="owed-kit" word={["persona", "personas", "person", "people"]} verb={["Archivar", "Archive"]}
              body={lang === "en" ? "They move to the Archive with their payments and what was left. Restore brings them back." : "Pasan al Archivo con sus abonos y lo que faltaba. Restaurar los devuelve."}
              rows={active.map((r) => ({ id: r.id, label: r.person }))}
              onEdit={(id) => { setDraft(false); setEditFor(id); }}
              onDrop={(ids) => commit((s0) => ids.reduce((acc, id) => archiveLent(acc, id), s0), ids.length === 1 ? (active.find((r) => r.id === ids[0])?.person ?? "") : `${ids.length}`)}
              onRename={(id, name) => commit((s0) => ({ ...s0, lent: lentOf(s0).map((r) => (r.id === id ? { ...r, person: name } : r)) }), name)} />
          </span>
        ) : null}
        <button type="button" className="cobro-plus" aria-label={t("cobro.open")} aria-pressed={draft} onClick={() => { setEditFor(null); setDraft((on) => !on); }}><Plus /></button>
      </div>
      <DeboSum help="me-deben" empty={t("debo.sum.owed.empty")} parts={active.length && rwSum.total > 0 ? [
        [`${people.filter((p) => p.active).length} ${t(people.filter((p) => p.active).length === 1 ? "debo.sum.person1" : "debo.sum.personN")}`],
        [lang === "en" ? "People" : "Personas", { num: fmt(sums.left) }],
        [lang === "en" ? "Rewards" : "Recompensas", { num: fmt(rwSum.total) }],
      ] : active.length ? [
        [`${people.filter((p) => p.active).length} ${t(people.filter((p) => p.active).length === 1 ? "debo.sum.person1" : "debo.sum.personN")}`],
        ...(sums.interest > 0 ? [[{ num: fmt(sums.interest) }, t("debo.sum.interest")]] : [[{ num: fmt(sums.paid) }, t("debo.sum.got")]]),
        ...(nextOwed ? [[`${t("debo.sum.nextGet")} ${new Date(`${nextOwed}T12:00:00`).toLocaleDateString(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).replace(".", "")}`]] : []),
      ] : rwSum.total > 0 ? [
        [`${rwSum.count} ${lang === "en" ? (rwSum.count === 1 ? "card" : "cards") : (rwSum.count === 1 ? "tarjeta" : "tarjetas")}`],
        [{ num: fmt(rwSum.total) }, lang === "en" ? "in card rewards" : "en recompensas"],
      ] : null} />
      {draft ? <LoanForm mode="lend" onCancel={() => setDraft(false)} onSave={save} /> : null}
      {(() => {
        const row = editFor ? active.find((r) => r.id === editFor) : null;
        if (!row) return null;
        return <LoanForm key={row.id} mode="lend" initial={{ name: row.person, who: "person", kind: row.kind === "interest" ? "interest" : "plain", amountMinor: row.amountMinor, currency: row.currency, aprBps: row.aprBps, date: row.dueOn || "", book: "fixed" }}
          onCancel={() => setEditFor(null)}
          onSave={(d) => { commit((s0) => ({ ...s0, lent: lentOf(s0).map((r) => (r.id === row.id ? { ...r, person: d.name, kind: d.kind, amountMinor: d.amountMinor, aprBps: d.aprBps, dueOn: d.date } : r)) }), d.name); setEditFor(null); }} />;
      })()}
      {libros ? <DebtChart /> : (
        <CobroSpan title={t("cobro.span")} total={sums.lent} events={all.map((r) => ({ date: r.startedOn, value: view(r.amountMinor, r.currency) }))}
          facts={[[t("cobro.lent"), sums.lent], [t("cobro.paid"), sums.paid], [t("cobro.left"), sums.left]]} />
      )}
      {group("plain")}
      {group("interest")}
      <RewardsGroup />
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
      {libros && tabletOne ? <AreaAdvisor area="owed" /> : null}
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
  useEffect(() => { if (!editing) setText(plan.fromUser ? (plan.perPay / 100).toFixed(2) : ""); }, [plan.perPay, plan.fromUser, editing]);
  const setOrder = (order: "avalanche" | "snowball") => commit((s) => ({ ...s, debtPlan: { ...s.debtPlan, order, monthlyMinor: s.debtPlan?.monthlyMinor ?? 0, currency: s.debtPlan?.currency ?? display } }), L("Plan de pago", "Payoff plan"));
  // 1.3.107: how often the user pays (the editor's frequency sheet, "Otro…" and remembered custom rhythms included).
  const setCadence = (cadence: string) => commit((s) => ({ ...s, debtPlan: { order: s.debtPlan?.order ?? "avalanche", monthlyMinor: s.debtPlan?.monthlyMinor ?? 0, currency: s.debtPlan?.currency ?? display, cadence } }), L("Plan de pago", "Payoff plan"));
  const saveBudget = () => {
    setEditing(false);
    const minor = text.trim() ? parseAmount(text) : 0;
    if (minor === null || minor < 0) return;
    if (minor === (plan.fromUser ? plan.perPay : 0)) return;
    commit((s) => ({ ...s, debtPlan: { ...s.debtPlan, order: s.debtPlan?.order ?? "avalanche", monthlyMinor: minor, currency: display } }), L("Plan de pago", "Payoff plan"));
  };
  const name = (o: "avalanche" | "snowball") => (o === "avalanche" ? L("Avalancha", "Avalanche") : L("Bola de nieve", "Snowball"));
  const other = plan.order === "avalanche" ? "snowball" : "avalanche";
  const ch = plan.chosen;
  return (
    <section className="debt-plan" data-anchor="debt-plan">
      <div className="plan-head">
        <span className="lab-head">{L("Plan de pago", "Payoff plan")}<Hint topic="plan-pago" /></span>
        <em className="plan-q">{L("¿Cuál pago primero?", "Which first?")}</em>
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
        <span>{L("Puedo pagar", "I can pay")}</span>
        <span className="plan-input">
          <input className="field num" data-anchor="plan-amount" inputMode="decimal" placeholder={plan.pace > 0 ? (plan.pace / 100).toFixed(2) : "0.00"} value={text}
            onFocus={() => setEditing(true)} onChange={(e) => setText(e.target.value)} onBlur={saveBudget} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        </span>
      </label>
      <div className="plan-budget plan-freq-row" data-anchor="plan-freq">
        <span>{L("Cada cuánto", "How often")}</span>
        <span className="plan-freq"><FreqPick value={plan.cadence} presets={freqPresetsOf(ledger)} onChange={setCadence} /></span>
      </div>
      {!plan.debts.length ? <Note>{L("No hay préstamos ni tarjetas con saldo: nada que planear.", "No loans or cards with a balance: nothing to plan.")}</Note>
        : plan.budget <= 0 ? <Note kind="tip">{L("Pon cuánto puedes pagar al mes y verás qué pagar primero.", "Set what you can pay a month to see what to pay first.")}</Note>
          : !ch ? <Note kind="wait">{L(`Con ${fmt(plan.budget)} al mes no alcanza: el interés suma ${fmt(plan.minBudget)} al mes.`, `${fmt(plan.budget)} a month is not enough: interest adds ${fmt(plan.minBudget)} a month.`)}</Note>
            : (
              <>
                <div className="plan-facts">
                  <span><em>{L("Libre en", "Debt-free")}<Hint topic="plan-libre" /></em><strong>{monthName(monthAhead(ch.months), lang)}</strong></span>
                  <span><em>{L("Interés por pagar", "Interest to pay")}<Hint topic="plan-interes" /></em><strong className="num">{fmt(ch.interest)}</strong></span>
                  <span><em>{L("Meses", "Months")}<Hint topic="plan-meses" /></em><strong className="num">{ch.months}</strong></span>
                </div>
                <p className="plan-say">
                  {plan.saveInterest > 0 || plan.saveMonths > 0
                    ? <>{name(plan.order)} {L("ahorra", "saves")} <b className="num is-in">{fmt(Math.max(0, plan.saveInterest))}</b>{plan.saveMonths > 0 ? L(` y ${plan.saveMonths} ${plan.saveMonths === 1 ? "mes" : "meses"}`, ` and ${plan.saveMonths} ${plan.saveMonths === 1 ? "month" : "months"}`) : ""} {L("frente a", "versus")} {name(other)}.</>
                    : plan.saveInterest < 0 || plan.saveMonths < 0
                      ? <>{name(plan.order)} {L("cuesta", "costs")} <b className="num is-out">{fmt(-plan.saveInterest)}</b> {L("más que", "more than")} {name(other)}{plan.order === "snowball" ? L(", a cambio de cerrar antes la deuda más chica.", ", in exchange for closing the smallest debt sooner.") : "."}</>
                      : L("Aquí los dos órdenes cuestan lo mismo.", "Here both orders cost the same.")}
                  {!plan.fromUser ? <> {L("Uso tu ritmo de los últimos 3 meses.", "Using your pace of the last 3 months.")}</> : null}
                </p>
                {plan.first ? <p className="plan-why" data-anchor="plan-why">{plan.order === "avalanche"
                  ? L(`Primero ${plan.first.name}: ${plan.first.aprBps > 0 ? `es la tasa más alta (${(plan.first.aprBps / 100).toLocaleString("es-NI", { maximumFractionDigits: 2 })}%)` : "es la que más interés suma"}. Cada pago cubre los mínimos y el resto va a ella.`, `First ${plan.first.name}: ${plan.first.aprBps > 0 ? `it has the highest rate (${(plan.first.aprBps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%)` : "it adds the most interest"}. Each payment covers the minimums and the rest goes to it.`)
                  : L(`Primero ${plan.first.name}: es el saldo más chico, la cierras antes. Cada pago cubre los mínimos y el resto va a ella.`, `First ${plan.first.name}: it is the smallest balance, so it closes first. Each payment covers the minimums and the rest goes to it.`)}<Hint topic="plan-orden" />
                  {plan.debts.some((d) => d.aprGuess) ? <> {L("Algunas tarjetas no tienen tasa: estimo 24% al año. Añade la tasa para un plan exacto.", "Some cards have no rate: I estimate 24% a year. Add the rate for an exact plan.")}<Hint topic="plan-tasa-estimada" /></> : null}</p> : null}
                <ol className="plan-list">
                  {ch.order.map((id, i) => {
                    const d = plan.debts.find((x) => x.id === id)!;
                    return (
                      <li key={id} data-card={d.card ? "1" : undefined}>
                        <b className="num">{i + 1}</b>
                        <span>{d.name}</span>
                        <em>{d.freeMonths ? "0%" : d.aprBps > 0 ? `${d.aprGuess ? "≈" : ""}${(d.aprBps / 100).toLocaleString(lang === "en" ? "en-US" : "es-NI", { maximumFractionDigits: 2 })}%` : L("sin interés", "no interest")} · {monthName(monthAhead(ch.finish[id] ?? ch.months), lang)}{plan.perPayOf[id] ? <> · <span className="pl-pay">{fmt(plan.perPayOf[id])} {L("por pago", "a payment")}</span></> : null}</em>
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
  const tabletOne = useTabletOne();
  const { session, fmt, lang, summary } = useFaro();
  const L = useL();
  const owe = netBalance(session?.ledger).owe;
  // The sub-tab survives leaving Debo (a name link, Back, the ring swipe): Debo opens on the one you last read.
  const [tab, setTabState] = useState<"dues" | "loans">(() => { const v = nextOweTab ?? oweTabMem; nextOweTab = null; return v; });
  const setTab = (v: "dues" | "loans") => { oweTabMem = v; setTabState(v); };
  // 1.3.98: a tap on the other sub-tab (never load, Back or a link) glides the content in from the side of travel and lights the bar.
  const [flip, setFlip] = useState<{ n: number; dir: number } | null>(null);
  const pick = (v: "dues" | "loans") => {
    if (v === tab) return;
    setFlip((cur) => ({ n: (cur?.n ?? 0) + 1, dir: v === "loans" ? 1 : -1 }));
    setTab(v);
  };
  const tabsRef = useRef<HTMLDivElement>(null);
  // The amber hairline slides under the chosen tab's name (measured, so it fits each language and text size).
  useLayoutEffect(() => {
    const row = tabsRef.current;
    if (!row) return;
    const place = () => {
      // 1.3.126 tablet/desktop: the tabs are two segments and the amber light is the lit segment itself (measured the same way).
      const seg = !!row.closest(".swipe-pane") && !row.closest(".app-frame.is-split") && window.matchMedia(TABLET_ONE_MQ).matches;
      const name = row.querySelector<HTMLElement>(seg ? `.debo-tab[data-on]` : `.debo-tab[data-on] .dt-name`);
      const ink = row.querySelector<HTMLElement>(".debo-ink");
      if (!name || !ink) return;
      const a = row.getBoundingClientRect(), b = name.getBoundingClientRect();
      ink.style.width = `${Math.round(b.width)}px`;
      ink.style.transform = `translateX(${Math.round(b.left - a.left - (seg ? row.clientLeft : 0))}px)`;
      requestAnimationFrame(() => row.setAttribute("data-ready", ""));
    };
    place();
    const ro = new ResizeObserver(place); ro.observe(row);
    void document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, [tab, lang]);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id === "debt-loans" || id === "debt-plan" || id === "cobros-loans-file") { setFlip(null); setTab("loans"); }
      else if (id === "debt-dues") { setFlip(null); setTab("dues"); }
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
      <div className="debo-tabs is-lux" role="tablist" data-anchor="debt-owe-tabs" data-on={tab} data-lit={flip ? (flip.n % 2 ? "a" : "b") : undefined} ref={tabsRef}>
        <i className="debo-ink" aria-hidden />
        <span className="debo-tab" data-on={tab === "dues" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "dues"} aria-pressed={tab === "dues"} onClick={() => pick("dues")}>
            <RefreshCw className="dt-ico" strokeWidth={1.9} aria-hidden />
            <span className="dt-name">{L("Cuotas", "Dues")}</span>
            <em className="dt-sub num" aria-hidden>{fmt(summary?.subscriptions ?? 0)}</em>
          </button>
          <Hint topic="debo" />
        </span>
        <span className="debo-tab" data-on={tab === "loans" || undefined}>
          <button type="button" role="tab" aria-selected={tab === "loans"} aria-pressed={tab === "loans"} onClick={() => pick("loans")}>
            <HandCoins className="dt-ico" strokeWidth={1.9} aria-hidden />
            <span className="dt-name">{L("Préstamos", "Loans")}</span>
            <em className="dt-sub num" aria-hidden>{fmt(owe)}</em>
          </button>
          <Hint topic="prestamos" />
        </span>
      </div>
      {tab === "dues" ? <div className={`debt-dues${flip ? " is-flip" : ""}`} data-anchor="debt-dues" data-flip={flip ? (flip.n % 2 ? "a" : "b") : undefined} style={flip ? { ["--flip-x" as string]: `${flip.dir * 14}px` } : undefined}><Subs />{tabletOne ? <SideCol><DueSide /><AreaAdvisor area="subs" /></SideCol> : null}</div> : (
        <div className={`debt-loans${flip ? " is-flip" : ""}`} data-anchor="debt-loans" data-flip={flip ? (flip.n % 2 ? "a" : "b") : undefined} style={flip ? { ["--flip-x" as string]: `${flip.dir * 14}px` } : undefined}>
          <DueLoans libros onWho={openFor} facts={loanFacts} between={<><PayoffPlan /><DebtChart />{tabletOne ? <AreaAdvisor area="loans" /> : null}</>} />
        </div>
      )}
      {sheet}
    </>
  );
}

/** What Libros shows for the middle row. */
export function DebtBook({ side }: { side: DebtSide }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timers: number[] = [];
    const run = () => {
      if (!takeHello(side)) return;
      // After the pane's own entrance has started, so the light lands on what is really there.
      timers.push(window.setTimeout(() => {
        const els = [...(box.current?.querySelectorAll<HTMLElement>(HELLO[side]) ?? [])].slice(0, 3);
        els.forEach((el, i) => {
          el.classList.remove("is-hello");
          void el.offsetWidth;
          el.style.setProperty("--hello-d", `${i * 80}ms`);
          el.classList.add("is-hello");
          timers.push(window.setTimeout(() => el.classList.remove("is-hello"), 1000 + i * 80));
        });
      }, 140));
    };
    run();
    window.addEventListener("faro-debt-tap", run);
    return () => { window.removeEventListener("faro-debt-tap", run); timers.forEach((t) => window.clearTimeout(t)); };
  }, [side]);
  return (
    <div className="debt-book" data-side={side} ref={box}>
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
    }}><span>{L("Ver todo en Libros", "See all in Books")}</span><ArrowRight aria-hidden /></button>
  );
}
