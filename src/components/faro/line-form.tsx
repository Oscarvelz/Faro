import { FieldTip } from "./ui";
import { cadenceLabel, freqPresetsOf } from "@/lib/faro/cadence";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { formDirty } from "@/lib/faro/dirty";
import { clearEditorExit, setEditorExit, type EditorExit } from "@/lib/faro/editor-exit";
import { declareSeries, guardFor, hostAccounts, isFundSub, isRetiroSubId, natureMode, stampFor, type FundNature } from "@/lib/faro/funds";
import { savingsStock } from "@/lib/faro/savings";
import { NaturePick } from "./fund-light";
import { suggestHome } from "@/lib/faro/quickadd";
import { BankMark } from "./bank-mark";

export function DayField({ value, onChange, min, max }: { value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const { lang } = useFaro();
  const [open, setOpen] = useState(false);
  const [flipX, setFlipX] = useState(false);
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
  // The open calendar must land fully on screen: if it would run past the right edge it
  // re-anchors to the field's right side (the cobro/ah forms already do this by label), and
  // if its bottom would hide under the sheet's fixed foot, the sheet body scrolls just
  // enough to show it whole — direction and size never change.
  useLayoutEffect(() => {
    if (!open) { setFlipX(false); return; }
    const root = ref.current;
    const pop = root?.querySelector<HTMLElement>(".day-pop");
    if (!root || !pop) return;
    const pr = pop.getBoundingClientRect();
    if (!flipX && pr.right > window.innerWidth - 4) { setFlipX(true); return; }
    // 1.3.174: on tablet widths the +/− sheet is narrower than the screen, so a pop can
    // stay on screen yet spill past its sheet's right edge — anchor it to the field's
    // right instead, provided the flipped pop still starts inside the sheet. Phone
    // widths keep the viewport rule alone.
    if (!flipX && window.innerWidth >= 1100) {
      const sheet = root.closest<HTMLElement>(".where-sheet");
      if (sheet) {
        const sr = sheet.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        if (pr.right > sr.right - 2 && rr.right - pr.width >= sr.left + 2) { setFlipX(true); return; }
      }
    }
    let sc: HTMLElement | null = root.parentElement;
    while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
    const box = sc ?? (document.scrollingElement as HTMLElement | null);
    if (!box) return;
    const limit = sc ? sc.getBoundingClientRect().bottom : window.innerHeight;
    const need = pr.bottom - limit;
    if (need > 2) {
      const room = box.scrollHeight - box.clientHeight - box.scrollTop;
      if (room > 0) box.scrollTop += Math.min(need + 8, room);
    }
  }, [open, flipX, month, year]);
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
        <div className={`day-pop${flipX ? " is-right" : ""}`}>
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

export function LineForm({ kind, existing, onClose, preset, money, onMoney, seed, draftKey, draftTitle, glyph, swatch, dock, look, scan, onDirtyChange }: { kind: LineKind; existing?: Line; onClose: () => void; preset?: { categoryId?: string; subId?: string }; money?: Currency; onMoney?: (value: Currency) => void; seed?: ReportDraft | null; draftKey?: "in" | "out"; draftTitle?: string; glyph?: string; swatch?: string; dock?: boolean; look?: Look; scan?: ReactNode; onDirtyChange?: (dirty: boolean) => void }) {
  const { t, key, session, commit, confirm, focusAmount, names, lang, goTopic, fmt, has } = useFaro();
  const settings = session?.ledger.settings;
  const structure = session?.ledger.structure;
  // 1.3.246 (P6): un apunte del widget SIN categoría y con concepto propio abre con la
  // casa que su propio historial de conceptos vota — preseleccionada en el selector,
  // jamás guardada por ella: si él la cambia o no guarda, nada pasó. Solo para gastos:
  // el editor de ingresos no tiene selector de categoría (su group es null), así que
  // ahí no existe asiento donde preseleccionar.
  const widgetSuggestion = (() => {
    if (!existing || existing.categoryId || existing.note !== "Widget" || !session) return null;
    const concept = (existing.concept ?? "").trim();
    if (!concept || concept === "Apunte rápido" || concept === "Quick entry") return null;
    const group = kind === "expense-fixed" ? "fixed" : kind === "expense-variable" ? "variable" : null;
    if (!group) return null;
    const sug = suggestHome(session.ledger, concept, "out", group);
    if (!sug) return null;
    const cat = session.ledger.structure.categories.find((c) => c.id === sug.c);
    if (!cat || cat.hidden) return null;
    if (sug.s && !cat.subs.some((s) => s.id === sug.s && !s.hidden)) return null;
    return sug;
  })();
  const [concept, setConcept] = useState(existing?.concept ?? seed?.concept ?? "");
  const [amount, setAmount] = useState(existing ? (existing.amountMinor / 100).toFixed(2) : seed?.amount ?? "");
  const [currencyState, setCurrencyState] = useState<Currency>(existing?.currency ?? seed?.currency ?? settings?.display ?? "NIO");
  const currency = money ?? currencyState;
  const setCurrency = (value: Currency) => {
    setCurrencyState(value);
    onMoney?.(value);
  };
  const [note, setNote] = useState(existing?.note ?? seed?.note ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId || widgetSuggestion?.c || seed?.categoryId || preset?.categoryId || "");
  const [subId, setSubId] = useState(existing?.subId || widgetSuggestion?.s || seed?.subId || preset?.subId || "");
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
  // Oscar (2026-11-20): activar o desactivar Activo/Recurrente se confirma
  // siempre, con una nota breve de qué hace cada interruptor — «y así evitar
  // errores». El interruptor es controlado: si la ventana se cancela, el
  // estado nunca cambió y el interruptor vuelve solo a su sitio.
  const askToggle = (which: "active" | "recurring", next: boolean) => {
    const base = which === "active" ? (next ? "line.active.on" : "line.active.off") : (next ? "line.recurring.on" : "line.recurring.off");
    confirm({
      title: t(`${base}.title`),
      body: t(`${base}.body`),
      yes: t(`${base}.yes`),
      no: t("cancel"),
      center: true,
      run: () => { if (which === "active") setActive(next); else setRecurring(next); },
    });
  };
  const [personId, setPersonId] = useState(existing?.personId ?? "");
  // 1.3.153: how this entry was paid (an account id, "cash", or "" = not specified). The import hunts duplicates with it.
  const [pay, setPay] = useState(existing?.sourceId ?? "");
  const [payTouched, setPayTouched] = useState(false);
  // Ola 6 (1.3.356): el pago automático de la cuota — Faro anota solo el
  // cargo en su fecha, desde la cuenta elegida. Asiento editor.autopay
  // (Ritmo): sin el asiento, el guardado conserva el de la línea, con el
  // mismo patrón que payEff (principio 2: lo que el modo no muestra, el
  // modo no lo toca).
  const [autopay, setAutopay] = useState(existing?.autopay ?? false);
  const [autopayAcct, setAutopayAcct] = useState(existing?.autopayAccountId ?? existing?.sourceId ?? "");
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
    if (existing || payTouched || !has("editor.paid-with")) return;
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
  // Ola de prejuicio 1 (G-6): si la mano no eligió icono en ESTA forma, guardar no
  // estampa ninguno — la línea conserva el suyo, incluido el vacío (heredar el
  // glifo de la categoría es una lectura, no un dato de la línea).
  const [iconPicked, setIconPicked] = useState(false);
  const [bookedOn, setBookedOn] = useState(existing?.bookedOn ?? seed?.bookedOn ?? "");
  const [startedOn, setStartedOn] = useState(existing?.startedOn ?? seed?.startedOn ?? "");
  const bubbleTone = kind === "expense-fixed" || kind === "expense-variable" || kind === "subscription";
  // Ahorros starts from its stored day colour so every theme (Tron too) can light the official purple; other categories unchanged.
  const [toneStart] = useState(() => chosenTone(existing?.color, existing?.categoryId) || (existing?.categoryId === "f-ahorro" ? categoryBase("f-ahorro", structure?.categories.find((c) => c.id === "f-ahorro")?.color) : categoryColor(existing?.categoryId || "otros")));
  const [tone, setTone] = useState(toneStart);
  const [err, setErr] = useState("");
  // El modelo de ahorros (§5.1 al crear, §5.3 al cambiar): si la línea vive en un sub de fondo
  // (Meta/Emergencia — ni cuenta ni Retiro), la forma pregunta dónde vive el dinero. El borrador
  // nace intacto (null): sin tocar, una línea existente conserva la naturaleza de su serie, leída
  // de la partición; una nueva nace sin elegir (en modo «preguntar», guardar exige responder).
  const [natureDraft, setNatureDraft] = useState<{ nature: FundNature | null; host: string } | null>(null);
  const ledNow = session?.ledger ?? null;
  const fundSubNow = !!ledNow && isFundSub(ledNow, categoryId, subId);
  const stockNow = useMemo(() => (ledNow ? savingsStock(ledNow, key) : null), [ledNow, key]);
  const seriesRow = existing && stockNow ? stockNow.series.get(existing.seriesId || existing.id) : undefined;
  const curNature: FundNature | null = seriesRow?.fund ?? null;
  const curHost = seriesRow?.fundHost ?? "";
  const nature: FundNature | null = natureDraft ? natureDraft.nature : existing ? curNature : null;
  const host = natureDraft ? natureDraft.host : existing ? curHost : "";
  const setNature = (n: FundNature) => setNatureDraft({ nature: n, host });
  const setHost = (h: string) => setNatureDraft({ nature, host: h });
  const natureChanged = !!existing && fundSubNow && (nature !== curNature || (nature === "saldo" && host !== curHost));
  const namedAccounts = ledNow && stockNow ? hostAccounts(ledNow, key, stockNow).map((a) => ({ id: a.id, name: names.sub(a.id) || a.id, minor: a.minor })) : [];
  const modeNow = ledNow ? natureMode(ledNow.settings) : "ask";
  // Oleada de botones 4 (R7): la política única de confirmación — Guardar y Cancelar
  // preguntan solo si la forma cambió desde que abrió; intacta, hacen lo suyo en
  // silencio. La bolsa de apertura se captura en el primer render y se compara por
  // contenido (dirty.ts). El «Pagado con» que el sistema rellena solo desde el aviso
  // del comercio no cuenta como toque: la cuenta sigue el aviso vigente si la mano
  // nunca la tocó.
  const bag = () => ({ concept, amount, currency, note, categoryId, subId, recurring, storeId, providerId, code, url, cadence, nextDue, apr, balance, active, personId, pay, autopay, autopayAcct, to, icon, bookedOn, startedOn, tone, natureKey: fundSubNow ? `${nature ?? ""}|${host}` : "" });
  const baseRef = useRef<Record<string, unknown> | null>(null);
  if (baseRef.current === null) baseRef.current = bag();
  const baseBag = baseRef.current;
  const hintFilled = !payTouched && pay === hintRef.current && baseBag.pay !== pay;
  const dirty = formDirty(hintFilled ? { ...baseBag, pay } : baseBag, bag());
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  // Oscar (2026-11-20): la salida registrada del editor (editor-exit.ts) — la
  // puerta única de setUi entrega aquí toda navegación que cambiaría de
  // sección con este editor abierto, para que ninguna carpeta se lo lleve en
  // silencio: limpio, se cierra y la navegación sigue; sucio, manda el mismo
  // aviso que levanta su Cancelar, y un rechazo lo deja todo como estaba.
  const exitRef = useRef({ dirty, concept, onClose, confirm, t });
  exitRef.current = { dirty, concept, onClose, confirm, t };
  useEffect(() => {
    const exit: EditorExit = (proceed) => {
      const s = exitRef.current;
      if (!s.dirty) { s.onClose(); proceed(); return; }
      s.confirm({ title: s.t("entry.leave"), body: s.concept.trim() || s.t("entry.this"), yes: s.t("entry.leave.yes"), run: () => { s.onClose(); proceed(); } });
    };
    setEditorExit(exit);
    return () => clearEditorExit(exit);
  }, []);

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
    // Ola 8 (G8-4): la guardia simétrica en la puerta del guardado. El efecto
    // del aviso ya obedecía el asiento (ola 7, G7-1), pero el guardado
    // esparcía el estado `pay` sin mirar el modo VIGENTE: si el modo bajaba
    // con la forma abierta (la bajada llega de otra pestaña), el campo
    // desaparecía de la cara y el guardado sellaba igual el «Pagado con»
    // que el modo ya no pinta — el byte exacto que el principio 2 prohíbe
    // («lo que el modo no muestra, el modo no lo toca»). Al guardar, si el
    // asiento no alcanza, el sello efectivo es el que la línea YA traía:
    // editar conserva el suyo y crear nace sin sello; el aprendizaje, que
    // aprende del efectivo, tampoco aprende de una mano que en este modo
    // no pudo tocar el campo. Con el asiento despierto, payEff === pay.
    const payEff = has("editor.paid-with") ? pay : (existing?.sourceId ?? "");
    const autopayEff = has("editor.autopay") ? autopay : (existing?.autopay ?? false);
    const autopayAcctEff = has("editor.autopay") ? autopayAcct : (existing?.autopayAccountId ?? "");
    const fresh: Line = {
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
      ...(payEff ? { sourceId: payEff } : {}),
      // Ola 6: el pago automático solo existe entero — interruptor y cuenta;
      // a medias no se guarda (y el borrado de abajo no lo resucita).
      ...(autopayEff && autopayAcctEff ? { autopay: true, autopayAccountId: autopayAcctEff } : {}),
      // An imported line's reward class is its statement's own — preserved untouched; a hand-entered
      // card line carries the class derived above; anything else carries none (base rate / no rewards).
      ...(existing?.importId && existing.rc ? { rc: existing.rc } : rcDerived ? { rc: rcDerived } : {}),
    };
    // EL GUARDIÁN (principio 2; ola de prejuicio 1, G-1…G-4): la línea editada
    // parte de sí misma. El literal de arriba pinta solo lo que la forma conoce;
    // debajo queda la línea entera, así que todo campo que la forma NO pinta
    // sobrevive a la edición en cualquier modo y en cualquier cara que abra
    // esta forma: los enlaces (loanId, interestMinor, lentId, cardId, rwCard),
    // la transferencia (xfer), la identidad de importación (importId, batch,
    // via) y las marcas del descanso y del usuario (rest, archived). Antes el
    // literal fresco los borraba en silencio: editar el concepto de un abono
    // resucitaba su préstamo, su tarjeta o su «me deben», y una línea importada
    // editada perdía su llave de deduplicación.
    const line: Line = existing ? { ...existing, ...fresh } : fresh;
    if (existing) {
      // Lo que la forma SÍ pinta y la mano dejó en blanco se borra de verdad:
      // el esparcido no resucita lo que el usuario quitó a propósito.
      if (!personId) { delete line.personId; delete line.occasionId; }
      else if (existing.personId !== personId) delete line.occasionId;
      if (!(to && group && session && isRemitCat(session.ledger, categoryId))) delete line.to;
      if (!payEff) delete line.sourceId;
      if (!(autopayEff && autopayAcctEff)) { delete line.autopay; delete line.autopayAccountId; }
      if (!((existing.importId && existing.rc) || rcDerived)) delete line.rc;
      // G-6: la forma no materializa lo que la línea no traía — ni el glifo que
      // solo heredaba de su categoría, ni las fechas de alta vacías.
      if (!iconPicked && !brandTouched) line.icon = existing.icon ?? "";
      if (existing.bookedOn === undefined && line.bookedOn === "") delete line.bookedOn;
      if (existing.startedOn === undefined && line.startedOn === "") delete line.startedOn;
      // Sin sub de fondo a la vista, la estampa no sobrevive por el esparcido:
      // el bloque de naturaleza la reescribe cuando el sub vive.
      if (!fundSubNow) { delete line.fund; delete line.fundHost; }
    }
    // El modelo de ahorros: la naturaleza se estampa en la línea al nacer (§5.1); al cambiar,
    // la serie entera se declara en el mismo commit (§5.3), tras pasar el guardia de la
    // anfitriona — un límite nunca supera el Libre de la cuenta donde vive.
    let declare: { nature: FundNature; host?: string } | null = null;
    if (fundSubNow && ledNow && stockNow) {
      const accountsNow = hostAccounts(ledNow, key, stockNow);
      if (!existing) {
        const stamp = stampFor(modeNow, nature, host, accountsNow);
        if (!stamp.ready) { setErr(t("fund.q")); return; }
        if (stamp.fund) {
          line.fund = stamp.fund;
          if (stamp.fundHost) line.fundHost = stamp.fundHost;
        }
      } else if (natureDraft) {
        const stamp = stampFor("ask", nature, host, accountsNow);
        if (!stamp.ready) { setErr(t("fund.q")); return; }
        if (!stamp.fund) { setErr(t("fund.host.none")); return; }
        if (natureChanged && stamp.fund === "saldo") {
          const g = guardFor(stockNow, stamp.fundHost ?? "", seriesRow?.minor ?? 0);
          if (!g.fits) { setErr(t("fund.guard").replace("{x}", fmt(seriesRow?.minor ?? 0)).replace("{y}", fmt(g.libre))); return; }
        }
        line.fund = stamp.fund;
        if (stamp.fundHost) line.fundHost = stamp.fundHost;
        else delete line.fundHost;
        if (natureChanged) declare = { nature: stamp.fund, host: stamp.fundHost };
      } else if (existing.fund) {
        // Sin tocar la pregunta, la línea conserva la estampa que ya traía.
        line.fund = existing.fund;
        if (existing.fundHost) line.fundHost = existing.fundHost;
      }
    }
    commit((s) => {
      const next = upsertLine(s, line);
      const withNature = declare ? declareSeries(next, line.seriesId, declare.nature, declare.host) : next;
      // Learn how he pays this merchant — only from a source he picked or changed here himself, never from an import.
      return payEff && payTouched ? { ...withNature, imports: learnPayHint(importBook(withNature), line.concept, payEff) } : withNature;
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
  const lookHere: Look | null = look ?? (bubbleTone || kind === "purchase" ? { glyph: icon || "Circle", color: tone, onGlyph: (n) => { setIcon(n); setIconPicked(true); if (kind === "subscription") setBrandTouched(true); }, onColor: (hex) => setTone(hex) } : null);
  const head = (label: string, topic: string) => <span className="lab-head">{label}<FieldTip topic={topic} /></span>;
  // A chosen name too long for half a row takes the whole row (never cut, never "…").
  const long = (name: string | undefined) => ((name ?? "").length > 12 ? " is-long" : "");
  const nameOf = (list: { id: string; nameKey: string; customName: string }[], id: string) => { const hit = list.find((x) => x.id === id); return hit ? displayName(hit, lang) : ""; };

  return (
    <div className="fit-host">
    <div className="form-block is-fit" data-kind={kind}>
      <div className="fit-fields">
        <label className="label fit-f is-wide" data-f="concept" data-anchor="line-concept">
          {head(t("concept"), "f-concepto")}
          {lookHere && kind !== "subscription" && kind !== "purchase" ? (
            <span className="fit-concept-row" onClick={(e) => { if ((e.target as Element).closest(".fit-pick-btn")) e.preventDefault(); }}>
              <LookPick look={lookHere} />
              <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />
            </span>
          ) : <input className="field" value={concept} onChange={(e) => setConcept(e.target.value)} />}
        </label>
        {/* Oscar (2026-11-20): el botón de escaneo baja de la línea del concepto
            a su propia fila, con aire — pegado a la gráfica de arriba no respiraba. */}
        {scan ? <div className="fit-scan-row">{scan}</div> : null}
        <label className="label fit-f is-num" data-f="amount" data-anchor="line-amount">
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
        {/* Ola 6 (CARA-1): «Pagado con» y el interruptor «Activo» son asientos
            de Ritmo (editor.paid-with / editor.active-toggle) y el editor de
            Esencial los pintaba y los dejaba usar sin puerta — la cara
            excedía al registro. La puerta manda, como aguantaron
            recurrent-toggle y debt-balance: ocultos, su estado nace del
            registro guardado y la fusión lo conserva (pay solo se aprende
            si payTouched; active viaja en el spread). */}
        {has("editor.paid-with") ? (
        <div className="label fit-f" data-f="pay">
          {head(kind === "income-fixed" || kind === "income-variable" ? (lang === "en" ? "Received into" : "Recibido en") : (lang === "en" ? "Paid with" : "Pagado con"), "f-pagado-con")}
          <MarkSelect value={pay} onChange={(v) => { setPay(v); setPayTouched(true); }} options={payOptions} />
        </div>
        ) : null}
        {(kind === "expense-fixed" || kind === "expense-variable" || kind === "purchase") && has("editor.person") ? <PersonPick value={personId} onChange={setPersonId} /> : null}
        {group ? (
          <div className={`label fit-f${long(nameOf(structure.categories, categoryId))}`} data-f="category">
            {head(t("category"), "f-categoria")}
            <CategoryPick group={group} value={categoryId} onChange={(value) => { setCategoryId(value); setSubId(""); }} />
            {widgetSuggestion && categoryId === widgetSuggestion.c && subId === widgetSuggestion.s ? (
              <span className="fit-suggest">{t("widget.suggested")}</span>
            ) : null}
          </div>
        ) : null}
        {group && cat && (subs.length || subId) ? (
          <div className={`label fit-f${long(nameOf(cat.subs, subId))}`} data-f="sub">
            {head(t("sub"), "f-sub")}
            <SubPick categoryId={cat.id} value={subId} onChange={setSubId} />
          </div>
        ) : null}
        {/* Oscar (2026-11-20): «Gestionar categorías» vivía dentro de la
            columna de Categoría — centrada, subrayada y partida en dos
            líneas, «completamente fuera de lo normal». Ahora tiene su
            propio renglón, a la izquierda, bajo Categoría/Subconcepto. */}
        {group ? (
          <div className="fit-manage-row">
            <button type="button" className="fit-manage" onClick={() => goTopic("arbol", { screen: "settings", fold: "structure", anchor: "aj-tree" })}>{t("cats.manage")}</button>
          </div>
        ) : null}
        {group && session && categoryId && isRemitCat(session.ledger, categoryId) && has("editor.for-remit") ? <RemitToField value={to} onChange={setTo} className={`label fit-f${to ? long(session.ledger.remitPeople?.find((p) => p.id === to)?.name) : ""}`} /> : null}
        {kind === "purchase" && has("editor.shop-fields") ? (
          <>
            <div className={`label fit-f${long(nameOf(structure.catalog, storeId))}`} data-f="store">
              {head(t("store"), "f-tienda-elegir")}
              <StorePick value={storeId} onChange={setStoreId} look={lookHere ?? undefined} />
            </div>
            <div className={`label fit-f${long(nameOf(structure.purchases, categoryId))}`} data-f="pcat">
              {head(t("category"), "f-cat-elegir")}
              <PurchaseCatPick value={categoryId} onChange={setCategoryId} />
            </div>
            {has("editor.shop-fine") ? (
              <>
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
          </>
        ) : null}
        {kind === "subscription" ? (
          <>
            {has("subs.brand-library") ? (
            <div className={`label fit-f${long(poolName((icon || suggest).replace(/^sub:/, ""), lang))}`} data-f="brand">
              {head(lookHere ? (lang === "en" ? "Icon, colour" : "Ícono y color") : lang === "en" ? "Brand" : "Marca", "f-icono-cuota")}
              <BrandIconPick value={icon} suggest={suggest} look={lookHere ?? undefined} onChange={(next, name) => { setIcon(next); setIconPicked(true); setBrandTouched(true); if (next && name && !concept.trim()) setConcept(name); }} />
            </div>
            ) : null}
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
            {has("editor.autopay") ? (
            <div className="label fit-f is-wide" data-f="autopay">
              {head(lang === "en" ? "Autopay" : "Pago automático", "avisos-pagos")}
              <label className="form-toggle fit-chip is-inline">
                <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
                <span>{lang === "en" ? "Faro books it on its date" : "Faro lo anota solo en su fecha"}</span>
              </label>
              {autopay ? (
                payAccts.length ? (
                  <MarkSelect value={autopayAcct} onChange={setAutopayAcct} options={payAccts.map((a) => ({ value: a.id, label: payAcctLabel(a, lang), mark: <BankMark a={a} /> }))} />
                ) : (
                  <p className="fund-note">{lang === "en" ? "Add an account first and Faro can pay from it." : "Agrega primero una cuenta y Faro podrá pagar desde ella."}</p>
                )
              ) : null}
            </div>
            ) : null}
          </>
        ) : null}
        {role === "debt" && has("editor.debt-balance") ? (
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
        {role === "savings" && fundSubNow ? (
          <div className="label fit-f is-wide" data-f="nature">
            <NaturePick mode={modeNow} value={nature} onPick={setNature} host={host} onHost={setHost} accounts={namedAccounts} simple={!has("nature.naturepick-full")} armed={natureDraft !== null || !existing} />
          </div>
        ) : null}
        {role === "savings" && isRetiroSubId(subId) ? (
          <p className="fund-note fit-f is-wide">{t("fund.retiro.note")}</p>
        ) : null}
        <label className={`label fit-f${kind === "subscription" ? "" : " is-note"}`} data-f="note">
          {head(t("note"), "f-nota")}
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {kind === "subscription" && has("editor.active-toggle") ? (
          <label className="form-toggle fit-chip is-inline">
            <input type="checkbox" checked={active} onChange={(e) => askToggle("active", e.target.checked)} />
            <span>{t("active")}</span><FieldTip topic="f-activo" />
          </label>
        ) : null}
      </div>
      {kind !== "subscription" ? (
        <div className="fit-toggles">
          {has("editor.active-toggle") ? (
          <label className="form-toggle fit-chip">
            <input type="checkbox" checked={active} onChange={(e) => askToggle("active", e.target.checked)} />
            <span>{t("active")}</span><FieldTip topic="f-activo" />
          </label>
          ) : null}
          {has("editor.recurrent-toggle") ? (
          <label className="form-toggle fit-chip">
            <input type="checkbox" checked={recurring} onChange={(e) => askToggle("recurring", e.target.checked)} />
            <span>{t("recurring")}</span><FieldTip topic="f-recurrente" />
          </label>
          ) : null}
        </div>
      ) : null}
      {recurring && kind !== "subscription" && (has("editor.recurrent-toggle") || has("subs.cadence-basic")) ? (
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
        <button type="button" className="btn secondary" onClick={() => { if (!dirty) { onClose(); return; } confirm({ title: t("entry.leave"), body: concept.trim() || t("entry.this"), yes: t("entry.leave.yes"), run: onClose }); }}>{t("cancel")}</button>
        <button type="button" className="btn" data-anchor="line-save" onClick={() => {
          if (natureChanged && stockNow) {
            // §5.3: cambiar la naturaleza — o la anfitriona — lleva la confirmación de la casa
            // con la consecuencia escrita; el guardia habla antes si el fondo no cabe.
            if (nature === "saldo") {
              const g = guardFor(stockNow, host, seriesRow?.minor ?? 0);
              if (!g.fits) { setErr(t("fund.guard").replace("{x}", fmt(seriesRow?.minor ?? 0)).replace("{y}", fmt(g.libre))); return; }
            }
            const hostName = names.sub(host) || host;
            const body = nature === "saldo" && curNature === "saldo"
              ? t("fund.change.host").replace("{x}", hostName)
              : nature === "saldo"
                ? t("fund.change.toSaldo").replace("{x}", hostName)
                : t("fund.change.toAparte");
            confirm({ title: t("fund.q"), body, yes: t("save"), run: save });
            return;
          }
          if (!dirty) { save(); return; }
          confirm({ title: t("entry.save"), body: concept.trim() || t("entry.this"), yes: t("entry.save.yes"), run: save });
        }}>{t("save")}</button>
      </div>
    </div>
    </div>
  );
}

export function QuickAdd({ mode, onClose, jump, scanFor }: { mode: "in" | "out"; onClose: (how?: "back") => void; jump?: { kind: LineKind; categoryId: string; title: string } | null; scanFor?: (kind: LineKind) => ReactNode }) {
  const { t, session, lang, confirm, has } = useFaro();
  const structure = session?.ledger.structure;
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState<null | { kind: LineKind; categoryId: string; title: string }>(jump ?? null);
  const [held, setHeld] = useState<ReportDraft | null>(null);
  const [heldDegraded, setHeldDegraded] = useState(false);
  // F-3 (etapa 3.1): el borrador se filtra AL LEER, nunca se reescribe — si su
  // clase duerme en el modo, reanuda degradado a línea normal (concepto e
  // importe intactos; cadencia, próximo cobro y APR duermen en el borrador
  // guardado y vuelven solos al subir de modo). La sesión degradada no lleva
  // draftKey: su autoguardado no puede pisar los campos dormidos.
  const draftAwake = (d: ReportDraft) => (d.kind === "subscription" ? has("books.subs") : d.kind === "purchase" ? has("books.shops") : true);
  const seedFor = (d: ReportDraft): ReportDraft => (draftAwake(d) ? d : { ...d, kind: "expense-variable", categoryId: "", subId: "", cadence: "", nextDue: "", apr: has("editor.debt-balance") ? d.apr : "", recurring: false });
  const [gate, setGate] = useState<"ask" | "go">(() => (jump ? "go" : readReportDraft(mode) ? "ask" : "go"));
  const closeRef = useRef(onClose);
  const pickRef = useRef(pick);
  // Oleada de botones 4 (R7): el paso atrás de la hoja sigue la misma política — la
  // forma abierta reporta si está sucia y solo entonces se pregunta al volver.
  const formDirtyRef = useRef(false);
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
      if (!formDirtyRef.current) { setPick(null); return; }
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
          ...(has("books.shops") ? [{
            id: "shops",
            title: t("nav.shops"),
            tone: "#3a4a6b",
            kind: "purchase" as LineKind,
            items: structure.purchases.filter((p) => !p.hidden).sort((a, b) => a.order - b.order).map((p) => ({ id: p.id, label: displayName(p, lang), color: toneOf(p.id, "#3a4a6b", p.color) })),
          }] : []),
          ...(has("books.subs") ? [{ id: "subs", title: t("tab.subs"), tone: "#3a5574", kind: "subscription" as LineKind, items: [] as { id: string; label: string; color: string }[] }] : []),
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
              const seed = seedFor(draft);
              setHeld(seed);
              setHeldDegraded(seed !== draft);
              setPick({ kind: seed.kind, categoryId: seed.categoryId, title: draft.title || draft.concept });
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
        <button type="button" className="where-back" onClick={() => { if (!formDirtyRef.current) { setPick(null); return; } confirm({ title: t("entry.back"), body: pick.title, yes: t("entry.back.yes"), run: () => setPick(null) }); }}>
          <ChevronLeft className="size-4" />
          <span className="serif">{pick.title}</span>
        </button>
        <LineForm key={`${pick.kind}-${pick.categoryId}-${resume ? "keep" : "new"}`} kind={pick.kind} preset={{ categoryId: pick.categoryId }} seed={resume} draftKey={heldDegraded ? undefined : mode} draftTitle={pick.title} scan={scanFor?.(pick.kind)} onClose={finish} onDirtyChange={(d) => { formDirtyRef.current = d; }} />
      </section>
    );
  }

  return (
    <section className={`card where-sheet${mode === "in" ? " is-in" : " is-out"}`}>
      <h2 className="serif text-xl">{mode === "in" ? t("desk.addIn") : t("desk.addOut")}</h2>
      {groups.map((group, gi) => {
        const shown = group.items.length ? group.items : [{ id: "", label: t("add"), color: group.tone }];
        const on = open === group.id;
        return (
          <div key={group.id} className={`where-fold${on ? " is-open" : ""}`}>
            <button type="button" className="where-head" data-anchor={gi === 0 ? "quick-fold" : undefined} aria-expanded={on} onClick={() => setOpen(on ? null : group.id)}>
              <i className="where-mark" style={{ background: group.tone }} />
              <span className="min-w-0">
                <strong>{group.title}</strong>
                <em>{group.items.length ? String(group.items.length) : t("add")}</em>
              </span>
              <ChevronDown className={on ? "size-4 fold-chev is-open" : "size-4 fold-chev"} />
            </button>
            <div className="where-list">
              <div className="where-clip">
                {shown.map((item, ii) => (
                  <button
                    key={item.id || group.id}
                    type="button"
                    className="where-item"
                    data-anchor={gi === 0 && ii === 0 ? "quick-house" : undefined}
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
