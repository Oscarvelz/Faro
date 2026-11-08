import { FieldTip } from "./ui";
import { cadenceLabel, freqPresetsOf } from "@/lib/faro/cadence";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Banknote, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { displayName } from "@/lib/faro/defaults";
import { categoryBase, categoryColor, chosenTone } from "@/lib/faro/colors";
import { monthName } from "@/lib/faro/i18n";
import { parseAmount, uid } from "@/lib/faro/money";
import type { Currency, Line, LineKind } from "@/lib/faro/types";
import { useFaro } from "./provider";
import { upsertLine } from "@/lib/faro/reducer";
import { PersonPick } from "./people";
import { RemitToField } from "./remit-people";
import { isRemitCat } from "@/lib/faro/remit-people";
import { BrandIconPick, CategoryPick, FreqPick, LookPick, PurchaseCatPick, StorePick, SubPick, type Look } from "./fit-pick";
import { iconForName, libraryOff, poolName } from "@/lib/faro/subs";
import { accounts, CASH_SOURCE, importBook, learnPayHint, manualLineRc, payAcctLabel, payHintFor, targets } from "@/lib/faro/bankbook";
import { BankMark } from "./bank-mark";

export function DayField({ value, onChange, min, max }: { value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seed = value || min || "";
  const seeded = seed ? new Date(`${seed.slice(0, 10)}T12:00:00`) : new Date();
  const [year, setYear] = useState(seeded.getFullYear());
  const [month, setMonth] = useState(seeded.getMonth() + 1);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const locked = !!min && !!max && min.slice(0, 7) === max.slice(0, 7);
  const label = value
    ? `${Number(value.slice(8, 10))} ${monthName(lang, Number(value.slice(5, 7)), true)}${value.startsWith("1904-") ? "" : ` ${value.slice(0, 4)}`}` // 1904 = year unknown (imported --MMDD)
    : "—";
  const shift = (dir: number) => {
    if (locked) return;
    const next = new Date(year, month - 1 + dir, 1);
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    if (min && dir < 0 && key < min.slice(0, 7)) return;
    if (max && dir > 0 && key > max.slice(0, 7)) return;
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };
  const today = new Date();
  const pad = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  const days: (number | null)[] = [...Array(pad).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  return (
    <div className={`day-field${open ? " is-open" : ""}`} ref={ref}>
      <button
        type="button"
        className="field day-field-btn"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const base = value || min || "";
          const at = base ? new Date(`${base.slice(0, 10)}T12:00:00`) : new Date();
          setYear(at.getFullYear());
          setMonth(at.getMonth() + 1);
          setOpen(true);
        }}
      >
        <span>{label}</span>
        <CalendarDays className="size-4" />
      </button>
      {open ? (
        <div className="day-pop">
          <div className="day-pop-head">
            <button type="button" aria-label={lang === "en" ? "Previous month" : "Mes anterior"} disabled={locked} onClick={() => shift(-1)}><ChevronLeft className="size-4" /></button>
            <strong>{monthName(lang, month)} {year}</strong>
            <button type="button" aria-label={lang === "en" ? "Next month" : "Mes siguiente"} disabled={locked} onClick={() => shift(1)}><ChevronRight className="size-4" /></button>
          </div>
          <div className="day-pop-grid" aria-hidden>
            {(lang === "en" ? ["M", "T", "W", "T", "F", "S", "S"] : ["L", "M", "X", "J", "V", "S", "D"]).map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="day-pop-grid">
            {days.map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const blocked = Boolean((min && iso < min) || (max && iso > max));
              const on = value === iso;
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
              return (
                <button key={iso} type="button" className={on ? "is-on" : isToday ? "is-today" : undefined} disabled={blocked} aria-pressed={on} onClick={() => { onChange(iso); setOpen(false); }}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ThemeSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div className="theme-select" ref={ref}>
      <button type="button" className="theme-select-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>{current?.label || "—"}</span>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
      </button>
      {open ? (
        <div className="theme-select-menu" role="listbox">
          {options.map((o) => (
            <button key={o.value || "empty"} type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label || "—"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 1.3.156: ThemeSelect's own idiom with a face — an option may carry a mark (a bank's plate, the cash
 * glyph), shown in the open list and on the closed field, so «Pagado con» never offers a bare name.
 * Same panel, same selected green, same listbox semantics; only this control renders marks.
 */
export function MarkSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string; mark?: ReactNode }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const current = options.find((o) => o.value === value);
  return (
    <div className="theme-select theme-select--mark" ref={ref}>
      <button type="button" className="theme-select-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ts-face">{current?.mark}<span className="ts-txt">{current?.label || "—"}</span></span>
        <ChevronDown className={open ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
      </button>
      {open ? (
        <div className="theme-select-menu" role="listbox">
          {options.map((o) => (
            <button key={o.value || "empty"} type="button" role="option" aria-selected={o.value === value} onClick={() => { onChange(o.value); setOpen(false); }}>
              <span className="ts-face">{o.mark}<span className="ts-txt">{o.label || "—"}</span></span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ReportDraft = {
  kind: LineKind;
  categoryId: string;
  title: string;
  concept: string;
  amount: string;
  note: string;
  currency: Currency;
  subId: string;
  storeId: string;
  providerId: string;
  code: string;
  url: string;
  cadence: Line["cadence"];
  nextDue: string;
  apr: string;
  balance: string;
  bookedOn: string;
  startedOn: string;
  recurring: boolean;
};

function draftKeyFor(mode: "in" | "out") {
  return `faro-report-draft-${mode}`;
}

function readReportDraft(mode: "in" | "out"): ReportDraft | null {
  try {
    const raw = localStorage.getItem(draftKeyFor(mode));
    if (!raw) return null;
    const data = JSON.parse(raw) as ReportDraft;
    if (!data || typeof data.kind !== "string") return null;
    const wrote = [data.concept, data.amount, data.note, data.code, data.url, data.apr, data.balance].some((v) => typeof v === "string" && v.trim());
    return wrote ? data : null;
  } catch {
    return null;
  }
}

function writeReportDraft(mode: "in" | "out", draft: ReportDraft) {
  localStorage.setItem(draftKeyFor(mode), JSON.stringify(draft));
}

function clearReportDraft(mode: "in" | "out") {
  localStorage.removeItem(draftKeyFor(mode));
}

export function LineForm({ kind, existing, onClose, preset, money, onMoney, seed, draftKey, draftTitle, glyph, swatch, dock, look, scan }: { kind: LineKind; existing?: Line; onClose: () => void; preset?: { categoryId?: string; subId?: string }; money?: Currency; onMoney?: (value: Currency) => void; seed?: ReportDraft | null; draftKey?: "in" | "out"; draftTitle?: string; glyph?: string; swatch?: string; dock?: boolean; look?: Look; scan?: ReactNode }) {
  const { t, key, session, commit, confirm, focusAmount, names, lang, goTopic } = useFaro();
  const settings = session?.ledger.settings;
  const structure = session?.ledger.structure;
  const [concept, setConcept] = useState(existing?.concept ?? seed?.concept ?? "");
  const [amount, setAmount] = useState(existing ? (existing.amountMinor / 100).toFixed(2) : seed?.amount ?? "");
  const [currencyState, setCurrencyState] = useState<Currency>(existing?.currency ?? seed?.currency ?? settings?.display ?? "NIO");
  const currency = money ?? currencyState;
  const setCurrency = (value: Currency) => {
    setCurrencyState(value);
    onMoney?.(value);
  };
  const [note, setNote] = useState(existing?.note ?? seed?.note ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? seed?.categoryId ?? preset?.categoryId ?? "");
  const [subId, setSubId] = useState(existing?.subId ?? seed?.subId ?? preset?.subId ?? "");
  const [recurring, setRecurring] = useState(existing?.recurring ?? seed?.recurring ?? (kind === "expense-fixed" || kind === "subscription" || kind === "income-fixed"));
  const [storeId, setStoreId] = useState(existing?.storeId ?? seed?.storeId ?? "");
  const [providerId, setProviderId] = useState(existing?.providerId ?? seed?.providerId ?? "");
  const [code, setCode] = useState(existing?.productCode ?? seed?.code ?? "");
  const [url, setUrl] = useState(existing?.productUrl ?? seed?.url ?? "");
  const [cadence, setCadence] = useState<Line["cadence"]>(existing?.cadence || seed?.cadence || "monthly");
  const [nextDue, setNextDue] = useState(existing?.nextDue ?? seed?.nextDue ?? "");
  const [apr, setApr] = useState(existing?.aprBps ? String(existing.aprBps / 100) : seed?.apr ?? "");
  const [balance, setBalance] = useState(existing?.balanceMinor !== null && existing?.balanceMinor !== undefined ? (existing.balanceMinor / 100).toFixed(2) : seed?.balance ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [personId, setPersonId] = useState(existing?.personId ?? "");
  // 1.3.153: how this entry was paid (an account id, "cash", or "" = not specified). The import hunts duplicates with it.
  const [pay, setPay] = useState(existing?.sourceId ?? "");
  const [payTouched, setPayTouched] = useState(false);
  const hintRef = useRef("");
  // The accounts the picker offers: the live ones, plus the line's own when it points at one since removed.
  const payAccts = (() => {
    const led = session?.ledger;
    if (!led) return [];
    const live = accounts(led);
    const cur = existing?.sourceId;
    if (cur && cur !== CASH_SOURCE && !live.some((a) => a.id === cur)) {
      const old = accounts(led, true).find((a) => a.id === cur);
      if (old) return [...live, old];
    }
    return live;
  })();
  // 1.3.156: every account wears its bank's mark and its kind word — the bare wallet "PayPal" reads «PayPal · Billetera».
  const payOptions = [{ value: "", label: lang === "en" ? "Not specified" : "Sin especificar" }, ...payAccts.map((a) => ({ value: a.id, label: payAcctLabel(a, lang), mark: <BankMark a={a} /> })), { value: CASH_SOURCE, label: lang === "en" ? "Cash" : "Efectivo", mark: <span className="pay-cash-mark"><Banknote className="size-4" /></span> }];
  // A merchant Oscar usually pays one way gets that way prefilled — visibly, and his own pick always wins.
  useEffect(() => {
    if (existing || payTouched) return;
    const led = session?.ledger;
    const hint = led ? payHintFor(importBook(led), concept) : "";
    if (pay === hintRef.current && hint !== pay) {
      hintRef.current = hint;
      setPay(hint);
    }
  }, [concept, existing, payTouched, pay, session?.ledger]);
  // 1.3.118: a Remesas line's recipient ("Para"). Kept only while the category is a Remesas one.
  const [to, setTo] = useState(existing?.to ?? "");
  const [icon, setIcon] = useState(existing?.icon ?? "");
  const [brandTouched, setBrandTouched] = useState(false);
  const [bookedOn, setBookedOn] = useState(existing?.bookedOn ?? seed?.bookedOn ?? "");
  const [startedOn, setStartedOn] = useState(existing?.startedOn ?? seed?.startedOn ?? "");
  const bubbleTone = kind === "expense-fixed" || kind === "expense-variable" || kind === "subscription";
  // Ahorros starts from its stored day colour so every theme (Tron too) can light the official purple; other categories unchanged.
  const [toneStart] = useState(() => chosenTone(existing?.color, existing?.categoryId) || (existing?.categoryId === "f-ahorro" ? categoryBase("f-ahorro", structure?.categories.find((c) => c.id === "f-ahorro")?.color) : categoryColor(existing?.categoryId || "otros")));
  const [tone, setTone] = useState(toneStart);
  const [err, setErr] = useState("");

  useEffect(() => {
    focusAmount((n) => setAmount(n.toFixed(2)));
    return () => focusAmount(null);
  }, [focusAmount]);

  useEffect(() => {
    if (!draftKey || existing) return;
    const wrote = [concept, amount, note, code, url, apr, balance].some((v) => v.trim());
    if (!wrote) return;
    writeReportDraft(draftKey, {
      kind,
      categoryId,
      title: draftTitle ?? "",
      concept,
      amount,
      note,
      currency,
      subId,
      storeId,
      providerId,
      code,
      url,
      cadence,
      nextDue,
      apr,
      balance,
      bookedOn,
      startedOn,
      recurring,
    });
  }, [draftKey, existing, kind, categoryId, draftTitle, concept, amount, note, currency, subId, storeId, providerId, code, url, cadence, nextDue, apr, balance, bookedOn, startedOn, recurring]);

  if (!structure || !settings) return null;
  const group = kind === "expense-fixed" ? "fixed" : kind === "expense-variable" ? "variable" : null;
  const cats = structure.categories.filter((c) => !c.hidden && (!group || c.group === group)).sort((a, b) => a.order - b.order);
  const cat = cats.find((c) => c.id === categoryId);
  const subs = (cat?.subs ?? []).filter((s) => !s.hidden).sort((a, b) => a.order - b.order);
  const role = cat?.role ?? "";
  const ais = structure.catalog.filter((c) => c.kind === "ai" && !c.hidden);

  function save() {
    const minor = parseAmount(amount);
    if (!concept.trim() || minor === null) {
      setErr(t("field.required"));
      return;
    }
    const aprBps = apr.trim() ? Math.round(Number(apr.replace(",", ".")) * 100) : 0;
    const bal = balance.trim() ? parseAmount(balance) : null;
    // Rewards class for a hand-entered line paid by card: derived from the filed category with the import
    // review's own derivation, so the line earns at its category's rate (a meal at the dining rate) exactly
    // like its imported twin. Imported lines keep the class their statement gave them — never re-derived.
    const payTarget = `${kind}|${categoryId}|${subId}`;
    const payTargets = structure ? targets(structure, names) : [];
    const payLabel = payTargets.find((x) => x.value === payTarget)?.label ?? payTargets.find((x) => x.value === `${kind}|${categoryId}|`)?.label ?? "";
    const rcDerived = !existing?.importId && session && pay && pay !== CASH_SOURCE && (kind === "expense-fixed" || kind === "expense-variable" || kind === "purchase")
      ? manualLineRc(importBook(session.ledger), payTarget, payLabel)
      : undefined;
    const line: Line = {
      id: existing?.id ?? uid(),
      seriesId: existing?.seriesId ?? uid(),
      monthKey: existing?.monthKey ?? key,
      kind,
      concept: concept.trim(),
      amountMinor: minor,
      currency,
      active,
      note: note.trim(),
      categoryId,
      subId,
      recurring: kind === "subscription" ? true : recurring,
      storeId,
      providerId,
      productCode: code.trim(),
      productUrl: url.trim(),
      cadence: kind === "subscription" || recurring ? cadence : "",
      nextDue,
      aprBps: Number.isFinite(aprBps) ? aprBps : 0,
      balanceMinor: bal,
      balanceCurrency: currency,
      // Cuotas: a library icon the user picked here wins; else the look pill's glyph, the line's own icon, or the brand the name suggests.
      // ("Circle" is the look pill's untouched default, so a brand suggestion still wins over it.)
      icon: kind === "subscription"
        ? brandTouched ? icon : (glyph && glyph !== "Circle" ? glyph : (!icon || icon === "RefreshCw" ? iconForName(concept, [], lang, libraryOff(session?.ledger)) || glyph || icon : icon))
        : glyph || icon,
      history: existing?.history ?? [],
      bookedOn,
      startedOn,
      // Only a colour the user actually picked is stored; an untouched default stays a default (follows the category).
      color: swatch || ((bubbleTone || kind === "purchase") && tone !== toneStart ? tone : existing?.color),
      ...(personId ? { personId, ...(existing?.occasionId && existing.personId === personId ? { occasionId: existing.occasionId } : {}) } : {}),
      ...(to && group && session && isRemitCat(session.ledger, categoryId) ? { to } : {}),
      // Unspecified stays absent: the line keeps exactly the shape it had before this field existed.
      ...(pay ? { sourceId: pay } : {}),
      // An imported line's reward class is its statement's own — preserved untouched; a hand-entered
      // card line carries the class derived above; anything else carries none (base rate / no rewards).
      ...(existing?.importId && existing.rc ? { rc: existing.rc } : rcDerived ? { rc: rcDerived } : {}),
    };
    commit((s) => {
      const next = upsertLine(s, line);
      // Learn how he pays this merchant — only from a source he picked or changed here himself, never from an import.
      return pay && payTouched ? { ...next, imports: learnPayHint(importBook(next), line.concept, pay) } : next;
    }, `${existing ? "Editar" : "Agregar"} ${line.concept}`);
    if (draftKey) clearReportDraft(draftKey);
    onClose();
  }

  const off = libraryOff(session?.ledger);
  // Cuotas: a typed brand ("Netflix", "HBO", "Office 365") suggests its library icon until the user picks one.
  const plainIcon = !icon || icon === "RefreshCw";
  const suggest = kind === "subscription" && plainIcon ? iconForName(concept, [], lang, off) : "";
  // The line's look lives in its identifying field (no floating pill): the editor's own look when handed one, else this
  // form's icon + colour (Fijos, Variables, Compras, Cuotas; Ingresos have no bubble colour).
  const lookHere: Look | null = look ?? (bubbleTone || kind === "purchase" ? { glyph: icon || "Circle", color: tone, onGlyph: (n) => { setIcon(n); if (kind === "subscription") setBrandTouched(true); }, onColor: (hex) => setTone(hex) } : null);
  const head = (label: string, topic: string) => <span className="lab-head">{label}<FieldTip topic={topic} /></span>;
  // A chosen name too long for half a row takes the whole row (never cut, never "…").
  const long = (name: string | undefined) => ((name ?? "").length > 12 ? " is-long" : "");
  const nameOf = (list: { id: string; nameKey: string; customName: string }[], id: string) => { const hit = list.find((x) => x.id === id); return hit ? displayName(hit, lang) : ""; };

  return (
    <div className="fit-host">
    <div className="form-block is-fit" data-kind={kind}>
      <div className="fit-fields">
        <label className="label fit-f is-wide" data-f="concept">
          {head(t("concept"), "f-concepto")}
          {lookHere && kind !== "subscription" && kind !== "purchase" ? (
            <span className="fit-concept-row" onClick={(e) => { if ((e.target as Element).closest(".fit-pick-btn")) e.preventDefault(); }}>
              <LookPick look={lookHere} />
              <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />
            </span>
          ) : <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />}
          {scan}
        </label>
        <label className="label fit-f is-num" data-f="amount">
          {head(t("amount"), "f-monto")}
          <input className="field num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onFocus={() => focusAmount((n) => setAmount(n.toFixed(2)))} />
        </label>
        <div className="label fit-f is-day" data-f="day">
          {head(t("quick.date"), "f-dia")}
          <DayField value={bookedOn} onChange={setBookedOn} />
        </div>
        {onMoney ? null : (
          <div className="label fit-f is-small" data-f="currency">
            {head(t("currency"), "f-moneda")}
            <ThemeSelect value={currency} onChange={(value) => setCurrency(value as Currency)} options={[{ value: "NIO", label: "C$" }, { value: "USD", label: "$" }]} />
          </div>
        )}
        <div className="label fit-f" data-f="pay">
          {head(lang === "en" ? "Paid with" : "Pagado con", "f-pagado-con")}
          <MarkSelect value={pay} onChange={(v) => { setPay(v); setPayTouched(true); }} options={payOptions} />
        </div>
        {kind === "expense-fixed" || kind === "expense-variable" || kind === "purchase" ? <PersonPick value={personId} onChange={setPersonId} /> : null}
        {group ? (
          <div className={`label fit-f${long(nameOf(structure.categories, categoryId))}`} data-f="category">
            {head(t("category"), "f-categoria")}
            <CategoryPick group={group} value={categoryId} onChange={(value) => { setCategoryId(value); setSubId(""); }} />
            <button type="button" className="fit-manage" onClick={() => goTopic("arbol", { screen: "settings", fold: "structure", anchor: "aj-tree" })}>{t("cats.manage")}</button>
          </div>
        ) : null}
        {group && cat && (subs.length || subId) ? (
          <div className={`label fit-f${long(nameOf(cat.subs, subId))}`} data-f="sub">
            {head(t("sub"), "f-sub")}
            <SubPick categoryId={cat.id} value={subId} onChange={setSubId} />
          </div>
        ) : null}
        {group && session && categoryId && isRemitCat(session.ledger, categoryId) ? <RemitToField value={to} onChange={setTo} className={`label fit-f${to ? long(session.ledger.remitPeople?.find((p) => p.id === to)?.name) : ""}`} /> : null}
        {kind === "purchase" ? (
          <>
            <div className={`label fit-f${long(nameOf(structure.catalog, storeId))}`} data-f="store">
              {head(t("store"), "f-tienda-elegir")}
              <StorePick value={storeId} onChange={setStoreId} look={lookHere ?? undefined} />
            </div>
            <div className={`label fit-f${long(nameOf(structure.purchases, categoryId))}`} data-f="pcat">
              {head(t("category"), "f-cat-elegir")}
              <PurchaseCatPick value={categoryId} onChange={setCategoryId} />
            </div>
            {categoryId === "ia" ? (
              <div className={`label fit-f${long(nameOf(ais, providerId))}`} data-f="provider">
                {head(t("provider"), "f-proveedor")}
                <ThemeSelect value={providerId} onChange={setProviderId} options={[{ value: "", label: "—" }, ...ais.map((s) => ({ value: s.id, label: displayName(s, lang) }))]} />
              </div>
            ) : null}
            <label className="label fit-f" data-f="code">
              {head(t("code"), "f-codigo")}
              <input className="field" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="label fit-f" data-f="url">
              {head(t("url"), "f-enlace")}
              <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </label>
          </>
        ) : null}
        {kind === "subscription" ? (
          <>
            <div className={`label fit-f${long(poolName((icon || suggest).replace(/^sub:/, ""), lang))}`} data-f="brand">
              {head(lookHere ? (lang === "en" ? "Icon, colour" : "Ícono y color") : lang === "en" ? "Brand" : "Marca", "f-icono-cuota")}
              <BrandIconPick value={icon} suggest={suggest} look={lookHere ?? undefined} onChange={(next, name) => { setIcon(next); setBrandTouched(true); if (next && name && !concept.trim()) setConcept(name); }} />
            </div>
            <div className={`label fit-f${long(cadenceLabel(cadence || "monthly", lang))}`} data-f="cadence">
              {head(t("cadence"), "f-frecuencia")}
              <FreqPick value={cadence || "monthly"} presets={freqPresetsOf(session?.ledger)} onChange={(value) => setCadence(value as Line["cadence"])} />
            </div>
            <div className="label fit-f is-day" data-f="first">
              {head(t("pot.first"), "f-primer-pago")}
              <DayField value={startedOn} onChange={setStartedOn} />
            </div>
            <div className="label fit-f is-day" data-f="due">
              {head(t("due"), "f-proximo-cobro")}
              <DayField value={nextDue} onChange={setNextDue} />
            </div>
          </>
        ) : null}
        {role === "debt" ? (
          <>
            <label className="label fit-f is-num" data-f="apr">
              {head(t("apr"), "f-tasa-anual")}
              <input className="field num" inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} />
            </label>
            <label className="label fit-f is-num" data-f="balance">
              {head(t("balance.debt"), "f-saldo-deuda")}
              <input className="field num" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} onFocus={() => focusAmount((n) => setBalance(n.toFixed(2)))} />
            </label>
          </>
        ) : null}
        {role === "savings" ? (
          <label className="label fit-f is-num" data-f="balance">
            {head(t("balance.save"), "f-saldo-ahorro")}
            <input className="field num" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} onFocus={() => focusAmount((n) => setBalance(n.toFixed(2)))} />
          </label>
        ) : null}
        <label className={`label fit-f${kind === "subscription" ? "" : " is-note"}`} data-f="note">
          {head(t("note"), "f-nota")}
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {kind === "subscription" ? (
          <label className="form-toggle fit-chip is-inline">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>{t("active")}</span><FieldTip topic="f-activo" />
          </label>
        ) : null}
      </div>
      {kind !== "subscription" ? (
        <div className="fit-toggles">
          <label className="form-toggle fit-chip">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>{t("active")}</span><FieldTip topic="f-activo" />
          </label>
          <label className="form-toggle fit-chip">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            <span>{t("recurring")}</span><FieldTip topic="f-recurrente" />
          </label>
        </div>
      ) : null}
      {recurring && kind !== "subscription" ? (
        <div className="fit-fields fit-repeat">
          <div className="label fit-f is-day" data-f="first">
            {head(t("pot.first"), "f-primer-pago")}
            <DayField value={startedOn} onChange={setStartedOn} />
          </div>
          <div className={`label fit-f${long(cadenceLabel(cadence || "monthly", lang))}`} data-f="cadence">
            {head(t("cadence"), "f-frecuencia")}
            <FreqPick value={cadence || "monthly"} presets={freqPresetsOf(session?.ledger)} onChange={(value) => setCadence(value as Line["cadence"])} />
          </div>
        </div>
      ) : null}
      {err ? <p className="bad text-sm fit-err">{err}</p> : null}
      <div className="fit-actions">
        <button type="button" className="btn secondary" onClick={() => confirm({ title: t("entry.leave"), body: concept.trim() || t("amount"), yes: t("entry.leave.yes"), run: onClose })}>{t("cancel")}</button>
        <button type="button" className="btn" onClick={() => confirm({ title: t("entry.save"), body: concept.trim() || t("amount"), yes: t("entry.save.yes"), run: save })}>{t("save")}</button>
      </div>
    </div>
    </div>
  );
}

export function QuickAdd({ mode, onClose, jump }: { mode: "in" | "out"; onClose: (how?: "back") => void; jump?: { kind: LineKind; categoryId: string; title: string } | null }) {
  const { t, session, lang, confirm } = useFaro();
  const structure = session?.ledger.structure;
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState<null | { kind: LineKind; categoryId: string; title: string }>(jump ?? null);
  const [held, setHeld] = useState<ReportDraft | null>(null);
  const [gate, setGate] = useState<"ask" | "go">(() => (jump ? "go" : readReportDraft(mode) ? "ask" : "go"));
  const closeRef = useRef(onClose);
  const pickRef = useRef(pick);
  const layer = useRef(0);
  closeRef.current = onClose;
  pickRef.current = pick;
  useEffect(() => {
    const state = history.state as { faroQuick?: string } | null;
    if (state?.faroQuick) history.replaceState({ faroQuick: "sheet" }, "");
    else history.pushState({ faroQuick: "sheet" }, "");
    layer.current = 1;
    const onPop = (e: Event) => {
      if (document.querySelector(".look-dock")) return;
      const hold = window as Window & { __faroSkipPop?: number };
      if ((hold.__faroSkipPop ?? 0) > 0) {
        hold.__faroSkipPop = 0;
        e.stopImmediatePropagation();
        return;
      }
      if (layer.current <= 0) return;
      if (document.querySelector(".modal-back")) return;
      e.stopImmediatePropagation();
      layer.current -= 1;
      const sheet = document.querySelector(".where-sheet");
      const dayBtn = sheet?.querySelector(".day-field.is-open .day-field-btn");
      const menuBtn = sheet?.querySelector(".theme-select-btn[aria-expanded='true']");
      const closer = dayBtn instanceof HTMLElement ? dayBtn : menuBtn instanceof HTMLElement ? menuBtn : null;
      if (closer) {
        closer.click();
        history.pushState({ faroQuick: "stay" }, "");
        layer.current += 1;
        return;
      }
      if (pickRef.current) {
        setPick(null);
        return;
      }
      closeRef.current("back");
    };
    window.addEventListener("popstate", onPop, true);
    return () => {
      window.removeEventListener("popstate", onPop, true);
      const left = layer.current;
      const hold = window as Window & { __faroSkipPop?: number; __faroQuickSwap?: boolean };
      if (hold.__faroQuickSwap) {
        hold.__faroQuickSwap = false;
        layer.current = 0;
        return;
      }
      if (left > 0) {
        layer.current = 0;
        hold.__faroSkipPop = left;
        history.go(-left);
      }
    };
  }, []);
  useEffect(() => {
    if (!pick) return;
    history.pushState({ faroQuick: "entry" }, "");
    layer.current += 1;
  }, [pick]);
  useEffect(() => {
    if (!pick) return;
    const onBack = (e: Event) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      confirm({ title: t("entry.back"), body: pick.title, yes: t("entry.back.yes"), run: () => setPick(null) });
    };
    window.addEventListener("faro-back", onBack, true);
    return () => window.removeEventListener("faro-back", onBack, true);
  }, [pick, confirm, t]);
  if (!structure) return null;

  const toneOf = (id: string, tone: string, chosen?: string) => categoryColor(id || tone, chosen || tone);
  const groups: { id: string; title: string; tone: string; kind: LineKind; items: { id: string; label: string; color: string }[] }[] =
    mode === "in"
      ? [
          { id: "income-fixed", title: t("income.fixed"), tone: "#1b6b48", kind: "income-fixed", items: [] },
          { id: "income-variable", title: t("income.variable"), tone: "#0c5a6e", kind: "income-variable", items: [] },
        ]
      : [
          {
            id: "fixed",
            title: t("group.fixed"),
            tone: "#8a5a12",
            kind: "expense-fixed",
            items: structure.categories.filter((c) => !c.hidden && c.group === "fixed").sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, label: displayName(c, lang), color: toneOf(c.id, "#8a5a12", c.color) })),
          },
          {
            id: "variable",
            title: t("group.variable"),
            tone: "#1b5e43",
            kind: "expense-variable",
            items: structure.categories.filter((c) => !c.hidden && c.group === "variable").sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, label: displayName(c, lang), color: toneOf(c.id, "#1b5e43", c.color) })),
          },
          {
            id: "shops",
            title: t("nav.shops"),
            tone: "#3a4a6b",
            kind: "purchase",
            items: structure.purchases.filter((p) => !p.hidden).sort((a, b) => a.order - b.order).map((p) => ({ id: p.id, label: displayName(p, lang), color: toneOf(p.id, "#3a4a6b", p.color) })),
          },
          { id: "subs", title: t("tab.subs"), tone: "#3a5574", kind: "subscription", items: [] },
        ];

  if (gate === "ask") {
    const draft = readReportDraft(mode);
    return (
      <section className={`card where-sheet${mode === "in" ? " is-in" : " is-out"}`}>
        <h2 className="serif text-xl">{mode === "in" ? t("desk.addIn") : t("desk.addOut")}</h2>
        <div className="where-draft">
          <p>{t("draft.ask")}</p>
          {draft ? <p className="text-sm text-muted">{[draft.title, draft.concept].filter(Boolean).join(" · ")}</p> : null}
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (!draft) {
                setGate("go");
                return;
              }
              setHeld(draft);
              setPick({ kind: draft.kind, categoryId: draft.categoryId, title: draft.title || draft.concept });
              setGate("go");
            }}
          >
            {t("draft.keep")}
          </button>
          <button type="button" className="btn ghost" onClick={() => { clearReportDraft(mode); setHeld(null); setGate("go"); }}>
            {t("draft.fresh")}
          </button>
        </div>
      </section>
    );
  }

  if (pick) {
    const resume = held && held.kind === pick.kind && held.categoryId === pick.categoryId ? held : null;
    const finish = () => {
      clearReportDraft(mode);
      setHeld(null);
      onClose();
    };
    return (
      <section className={`card where-sheet where-form${mode === "in" ? " is-in" : " is-out"}`} data-reporting="true">
        <button type="button" className="where-back" onClick={() => confirm({ title: t("entry.back"), body: pick.title, yes: t("entry.back.yes"), run: () => setPick(null) })}>
          <ChevronLeft className="size-4" />
          <span className="serif">{pick.title}</span>
        </button>
        <LineForm key={`${pick.kind}-${pick.categoryId}-${resume ? "keep" : "new"}`} kind={pick.kind} preset={{ categoryId: pick.categoryId }} seed={resume} draftKey={mode} draftTitle={pick.title} onClose={finish} />
      </section>
    );
  }

  return (
    <section className={`card where-sheet${mode === "in" ? " is-in" : " is-out"}`}>
      <h2 className="serif text-xl">{mode === "in" ? t("desk.addIn") : t("desk.addOut")}</h2>
      {groups.map((group) => {
        const shown = group.items.length ? group.items : [{ id: "", label: t("add"), color: group.tone }];
        const on = open === group.id;
        return (
          <div key={group.id} className={`where-fold${on ? " is-open" : ""}`}>
            <button type="button" className="where-head" aria-expanded={on} onClick={() => setOpen(on ? null : group.id)}>
              <i className="where-mark" style={{ background: group.tone }} />
              <span className="min-w-0">
                <strong>{group.title}</strong>
                <em>{group.items.length ? String(group.items.length) : t("add")}</em>
              </span>
              <ChevronDown className={on ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
            </button>
            <div className="where-list">
              <div className="where-clip">
                {shown.map((item) => (
                  <button
                    key={item.id || group.id}
                    type="button"
                    className="where-item"
                    onClick={() => setPick({ kind: group.kind, categoryId: item.id, title: item.id ? item.label : group.title })}
                  >
                    <i style={{ background: item.color }} />
                    <span>{item.label}</span>
                    <Plus className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
