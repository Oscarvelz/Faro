import { FieldTip } from "./ui";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { displayName } from "@/lib/faro/defaults";
import { PALETTE, categoryBase, categoryColor, chosenTone, themeSwatch } from "@/lib/faro/colors";
import { monthName } from "@/lib/faro/i18n";
import { parseAmount, uid } from "@/lib/faro/money";
import type { Currency, Line, LineKind } from "@/lib/faro/types";
import { BrandMark, Glyph } from "./icons";
import { useFaro } from "./provider";
import { upsertLine } from "@/lib/faro/reducer";
import { PersonPick } from "./people";

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

export function LineForm({ kind, existing, onClose, preset, money, onMoney, seed, draftKey, draftTitle, glyph, swatch, dock }: { kind: LineKind; existing?: Line; onClose: () => void; preset?: { categoryId?: string; subId?: string }; money?: Currency; onMoney?: (value: Currency) => void; seed?: ReportDraft | null; draftKey?: "in" | "out"; draftTitle?: string; glyph?: string; swatch?: string; dock?: boolean }) {
  const { t, key, session, commit, confirm, focusAmount, names, lang } = useFaro();
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
  const [icon, setIcon] = useState(existing?.icon ?? "");
  const [bookedOn, setBookedOn] = useState(existing?.bookedOn ?? seed?.bookedOn ?? "");
  const [startedOn, setStartedOn] = useState(existing?.startedOn ?? seed?.startedOn ?? "");
  const bubbleTone = kind === "expense-fixed" || kind === "expense-variable" || kind === "subscription";
  // Ahorros starts from its stored day colour so every theme (Tron too) can light the official purple; other categories unchanged.
  const [toneStart] = useState(() => chosenTone(existing?.color, existing?.categoryId) || (existing?.categoryId === "f-ahorro" ? categoryBase("f-ahorro", structure?.categories.find((c) => c.id === "f-ahorro")?.color) : categoryColor(existing?.categoryId || "otros")));
  const [tone, setTone] = useState(toneStart);
  const [err, setErr] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [storeName, setStoreName] = useState("");
  const [catName, setCatName] = useState("");

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
  const stores = structure.catalog.filter((c) => c.kind === "store" && !c.hidden);
  const ais = structure.catalog.filter((c) => c.kind === "ai" && !c.hidden);
  const subPresets = structure.catalog.filter((c) => c.kind === "sub" && !c.hidden);
  const purchases = structure.purchases.filter((p) => !p.hidden);

  function save() {
    const minor = parseAmount(amount);
    if (!concept.trim() || minor === null) {
      setErr(t("field.required"));
      return;
    }
    const aprBps = apr.trim() ? Math.round(Number(apr.replace(",", ".")) * 100) : 0;
    const bal = balance.trim() ? parseAmount(balance) : null;
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
      icon: glyph || icon,
      history: existing?.history ?? [],
      bookedOn,
      startedOn,
      // Only a colour the user actually picked is stored; an untouched default stays a default (follows the category).
      color: swatch || (existing && bubbleTone && tone !== toneStart ? tone : existing?.color),
      ...(personId ? { personId, ...(existing?.occasionId && existing.personId === personId ? { occasionId: existing.occasionId } : {}) } : {}),
    };
    commit((s) => upsertLine(s, line), `${existing ? "Editar" : "Agregar"} ${line.concept}`);
    if (draftKey) clearReportDraft(draftKey);
    onClose();
  }

  return (
    <div className="form-block">
      {existing && bubbleTone && !dock ? (
        <div className="tone-pick">
          <div className="tone-head">
            <span className="lab-head">{t("look.color")}<FieldTip topic="f-color" /></span>
            <label className="tone-custom" title={t("look.custom")} style={{ ["--c" as string]: themeSwatch(/^#[0-9a-fA-F]{6}$/.test(tone) ? tone : "#b7d4c4") }}>
              <input type="color" aria-label={t("look.custom")} value={/^#[0-9a-fA-F]{6}$/.test(tone) ? tone : "#b7d4c4"} onChange={(e) => setTone(e.target.value)} />
            </label>
          </div>
          <div className="tone-grid">
            {PALETTE.map((color) => (
              <button key={color} type="button" style={{ ["--c" as string]: themeSwatch(color) }} aria-pressed={tone.toLowerCase() === color} aria-label={color} onClick={() => setTone(color)} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid-2">
        <label className="label">
          <span className="lab-head">{t("concept")}<FieldTip topic="f-concepto" /></span>
          <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />
        </label>
        <label className="label">
          <span className="lab-head">{t("amount")}<FieldTip topic="f-monto" /></span>
          <input className="field num" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onFocus={() => focusAmount((n) => setAmount(n.toFixed(2)))} />
        </label>
        <label className="label">
          <span className="lab-head">{t("quick.date")}<FieldTip topic="f-dia" /></span>
          <DayField value={bookedOn} onChange={setBookedOn} />
        </label>
        {onMoney ? null : (
          <label className="label">
            <span className="lab-head">{t("currency")}<FieldTip topic="f-moneda" /></span>
            <ThemeSelect value={currency} onChange={(value) => setCurrency(value as Currency)} options={[{ value: "NIO", label: "C$" }, { value: "USD", label: "$" }]} />
          </label>
        )}
        {kind === "expense-fixed" || kind === "expense-variable" || kind === "purchase" ? <PersonPick value={personId} onChange={setPersonId} /> : null}
        {group ? (
          <label className="label">
            <span className="lab-head">{t("category")}<FieldTip topic="f-categoria" /></span>
            <ThemeSelect
              value={categoryId}
              onChange={(value) => { setCategoryId(value); setSubId(""); }}
              options={[{ value: "", label: "—" }, ...cats.map((c) => ({ value: c.id, label: displayName(c, lang) }))]}
            />
          </label>
        ) : null}
        {group && subs.length ? (
          <label className="label">
            <span className="lab-head">{t("sub")}<FieldTip topic="f-sub" /></span>
            <ThemeSelect
              value={subId}
              onChange={setSubId}
              options={[{ value: "", label: "—" }, ...subs.map((s) => ({ value: s.id, label: displayName(s, lang) }))]}
            />
          </label>
        ) : null}
        {kind === "purchase" ? (
          <>
            <div className="label span-all">
              <button type="button" className="fold-btn pick-fold" aria-expanded={pickOpen} onClick={() => setPickOpen((v) => !v)}>
                <span className="min-w-0">
                  <strong>{t("store")} · {t("category")}</strong>
                  <span className="block text-sm text-muted">
                    {[
                      stores.find((s) => s.id === storeId) ? displayName(stores.find((s) => s.id === storeId)!, lang) : "",
                      purchases.find((p) => p.id === categoryId) ? displayName(purchases.find((p) => p.id === categoryId)!, lang) : "",
                    ].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <ChevronDown className={pickOpen ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
              </button>
              {pickOpen ? (
                <div className="fold-body pick-body">
                  <p className="pick-kicker">{t("store")}</p>
                  <div className="shop-grid">
                    {stores.map((s) => (
                      <button key={s.id} type="button" className={`shop-card brand-${s.id}`} aria-pressed={storeId === s.id} onClick={() => setStoreId(storeId === s.id ? "" : s.id)}>
                        <BrandMark id={s.id} src={s.icon.startsWith("data:") ? s.icon : undefined} className="size-8" />
                        <span>{displayName(s, lang)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pick-add">
                    <input className="field" value={storeName} placeholder={t("shops.addStore")} aria-label={t("shops.addStore")} onChange={(e) => setStoreName(e.target.value)} />
                    <button type="button" className="icon-btn" aria-label={t("add")} onClick={() => {
                      const name = storeName.trim();
                      if (!name) return;
                      const id = `c-${uid().slice(0, 8)}`;
                      commit((st) => ({
                        ...st,
                        structure: {
                          ...st.structure,
                          catalog: [...st.structure.catalog, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99, kind: "store", urlTemplate: "" }],
                        },
                      }), name);
                      setStoreId(id);
                      setStoreName("");
                    }}>
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="pick-kicker">{t("category")}</p>
                  <div className="shop-cats">
                    {purchases.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="shop-cat"
                        style={{ ["--cat" as string]: categoryColor(p.id, p.color) }}
                        aria-pressed={categoryId === p.id}
                        onClick={() => setCategoryId(categoryId === p.id ? "" : p.id)}
                      >
                        <i />
                        {displayName(p, lang)}
                      </button>
                    ))}
                  </div>
                  <div className="pick-add">
                    <input className="field" value={catName} placeholder={t("shops.addCat")} aria-label={t("shops.addCat")} onChange={(e) => setCatName(e.target.value)} />
                    <button type="button" className="icon-btn" aria-label={t("add")} onClick={() => {
                      const name = catName.trim();
                      if (!name) return;
                      const id = `p-${uid().slice(0, 8)}`;
                      commit((st) => ({
                        ...st,
                        structure: {
                          ...st.structure,
                          purchases: [...st.structure.purchases, { id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 99 }],
                        },
                      }), name);
                      setCategoryId(id);
                      setCatName("");
                    }}>
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {categoryId === "ia" ? (
              <label className="label">
                <span className="lab-head">{t("provider")}<FieldTip topic="f-proveedor" /></span>
                <ThemeSelect value={providerId} onChange={setProviderId} options={[{ value: "", label: "—" }, ...ais.map((s) => ({ value: s.id, label: displayName(s, lang) }))]} />
              </label>
            ) : null}
            <label className="label">
              <span className="lab-head">{t("code")}<FieldTip topic="f-codigo" /></span>
              <input className="field" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="label">
              <span className="lab-head">{t("url")}<FieldTip topic="f-enlace" /></span>
              <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </label>
          </>
        ) : null}
        {kind === "subscription" ? (
          <>
            <label className="label">
              <span className="lab-head">{t("presets")}<FieldTip topic="f-lista" /></span>
              <ThemeSelect
                value={providerId}
                onChange={(id) => {
                  setProviderId(id);
                  const preset = subPresets.find((p) => p.id === id);
                  if (preset && !concept.trim()) setConcept(displayName(preset, lang));
                  if (preset) setIcon(preset.icon);
                }}
                options={[{ value: "", label: "—" }, ...subPresets.map((s) => ({ value: s.id, label: displayName(s, lang) }))]}
              />
            </label>
            <label className="label">
              <span className="lab-head">{t("cadence")}<FieldTip topic="f-frecuencia" /></span>
              <ThemeSelect
                value={cadence}
                onChange={(value) => setCadence(value as Line["cadence"])}
                options={[
                  { value: "weekly", label: t("weekly") },
                  { value: "biweekly", label: t("biweekly") },
                  { value: "monthly", label: t("monthly") },
                  { value: "yearly", label: t("yearly") },
                ]}
              />
            </label>
            <label className="label">
              <span className="lab-head">{t("pot.first")}<FieldTip topic="f-primer-pago" /></span>
              <DayField value={startedOn} onChange={setStartedOn} />
            </label>
            <label className="label">
              <span className="lab-head">{t("due")}<FieldTip topic="f-proximo-cobro" /></span>
              <DayField value={nextDue} onChange={setNextDue} />
            </label>
          </>
        ) : null}
        {role === "debt" ? (
          <>
            <label className="label">
              <span className="lab-head">{t("apr")}<FieldTip topic="f-tasa-anual" /></span>
              <input className="field num" inputMode="decimal" value={apr} onChange={(e) => setApr(e.target.value)} />
            </label>
            <label className="label">
              <span className="lab-head">{t("balance.debt")}<FieldTip topic="f-saldo-deuda" /></span>
              <input className="field num" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} onFocus={() => focusAmount((n) => setBalance(n.toFixed(2)))} />
            </label>
          </>
        ) : null}
        {role === "savings" ? (
          <label className="label">
            <span className="lab-head">{t("balance.save")}<FieldTip topic="f-saldo-ahorro" /></span>
            <input className="field num" inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} onFocus={() => focusAmount((n) => setBalance(n.toFixed(2)))} />
          </label>
        ) : null}
        <label className="label">
          <span className="lab-head">{t("note")}<FieldTip topic="f-nota" /></span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="row mt-3 form-toggles">
        <label className="row text-sm form-toggle">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t("active")}<FieldTip topic="f-activo" />
        </label>
        {kind !== "subscription" ? (
          <label className="row text-sm form-toggle">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            {t("recurring")}<FieldTip topic="f-recurrente" />
          </label>
        ) : null}
        {icon ? <Glyph name={icon} /> : null}
      </div>
      {recurring && kind !== "subscription" ? (
        <div className="grid-2 mt-3 form-repeat">
          <label className="label">
            <span className="lab-head">{t("pot.first")}<FieldTip topic="f-primer-pago" /></span>
            <DayField value={startedOn} onChange={setStartedOn} />
          </label>
          <label className="label">
            <span className="lab-head">{t("cadence")}<FieldTip topic="f-frecuencia" /></span>
            <ThemeSelect
              value={cadence || "monthly"}
              onChange={(value) => setCadence(value as Line["cadence"])}
              options={[
                { value: "weekly", label: t("weekly") },
                { value: "biweekly", label: t("biweekly") },
                { value: "monthly", label: t("monthly") },
                { value: "yearly", label: t("yearly") },
              ]}
            />
          </label>
        </div>
      ) : null}
      {err ? <p className="bad mt-2 text-sm">{err}</p> : null}
      <div className="row mt-3 form-actions">
        <button type="button" className="btn secondary" onClick={() => confirm({ title: t("entry.leave"), body: concept.trim() || t("amount"), yes: t("entry.leave.yes"), run: onClose })}>{t("cancel")}</button>
        <button type="button" className="btn" onClick={() => confirm({ title: t("entry.save"), body: concept.trim() || t("amount"), yes: t("entry.save.yes"), run: save })}>{t("save")}</button>
      </div>
    </div>
  );
}

export function QuickAdd({ mode, onClose, jump }: { mode: "in" | "out"; onClose: () => void; jump?: { kind: LineKind; categoryId: string; title: string } | null }) {
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
      closeRef.current();
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
