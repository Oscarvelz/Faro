/**
 * El Historial (Oscar, 2026-11-12): los libros leídos como un solo río.
 *
 * Su eje es el TIEMPO, no la categoría: cada movimiento vivo del libro baja por la
 * pantalla en orden cronológico, agrupado por día, con su procedencia puesta (la placa
 * de su categoría, su libro, su origen). La lente de período (semana · mes · año ·
 * rango) y el filtrado impresionante viven en la cabecera fija; los totales son DE LA
 * VISTA filtrada (historial.streamTotals), así que cada combinación responde con su
 * propio entró / salió / neto.
 *
 * La puerta anti-fuga corre primero POR CONSTRUCCIÓN: el río nace de
 * historial.buildStream, que jamás convierte una línea apartada en movimiento — ningún
 * filtro, búsqueda ni vista guardada de esta pantalla puede resucitar lo que descansa
 * en el Archivo. Al ocultar un período, la vista previa se calcula con la MISMA función
 * pura que luego lo aparta (descanso.hidePeriod sin comprometer), así que la ventana
 * nombra y cuenta exactamente lo que el verbo tocará.
 *
 * Las vistas guardadas son preferencia de ESTE aparato (localStorage
 * `faro.hist.views`, como el pliegue del catálogo): nombre del dueño, su idioma, jamás
 * dato del libro.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Search, SlidersHorizontal, X } from "lucide-react";
import { useFaro } from "./provider";
import { useLongPress } from "./use-longpress";
import { SelectionBar, SelMark, useSelection } from "./selection";
import { PiecePlate } from "./fit-pick";
import { Note } from "./finish";
import { buildStream, periodRange, streamTotals, type Movement, type PeriodKind, type StreamFilters } from "@/lib/faro/historial";
import { hidePeriod as hidePeriodDryRun } from "@/lib/faro/descanso";
import { namedIconFor, subIconFor } from "@/lib/faro/faces";
import { categoryColor, subColorFor } from "@/lib/faro/colors";
import { displayName } from "@/lib/faro/defaults";
import { cardsOf } from "@/lib/faro/cards";
import { formatMoney, parseAmount } from "@/lib/faro/money";
import { monthName } from "@/lib/faro/i18n";
import { todayIso } from "@/lib/faro/loans";
import type { Lang, LedgerState } from "@/lib/faro/types";
import "./historial.css";
import "./hist-temas.css";

type Lens = PeriodKind | "range";
type SavedView = { name: string; lens: Lens; filters: StreamFilters };
const VIEWS_KEY = "faro.hist.views";
const DAY_CHUNK = 14;

function readViews(): SavedView[] {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((v): v is SavedView => !!v && typeof v.name === "string" && typeof v.filters === "object" && v.filters !== null);
  } catch { return []; }
}

const at = (iso: string) => new Date(`${iso}T12:00:00`);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function dayLabel(lang: Lang, iso: string): string {
  return cap(new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { weekday: "long", day: "numeric", month: "long" }).format(at(iso)));
}
export function shortDay(lang: Lang, iso: string): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(at(iso)).replace(".", "");
}
export function bookLabel(lang: Lang, monthKey: string): string {
  return `${monthName(lang, Number(monthKey.slice(5, 7)), true).replace(".", "")} ${monthKey.slice(0, 4)}`;
}

/** Una fila del río, con su procedencia puesta. Compartida con el Archivo (archivo.tsx). */
/** La fila interactiva del motor de selección: la pantalla presta su presión larga
 *  y su toque; la fila solo sabe mostrarse (su marca y su marco, en su color). */
export type RowSel = {
  mode: boolean;
  marked: boolean;
  bind: ReturnType<typeof useLongPress>["bind"];
  consumeClick: () => boolean;
  onTap: (m: Movement) => void;
};

export function StreamRow({ m, state, sel }: { m: Movement; state: LedgerState; sel?: RowSel }) {
  const { names, lang, t } = useFaro();
  const structure = state.structure;
  const cat = structure.categories.find((c) => c.id === m.categoryId);
  // Una compra lleva su categoría de Compras (structure.purchases), no una del árbol.
  const purchase = !cat ? structure.purchases.find((p) => p.id === m.categoryId) : undefined;
  const tone = m.subId && cat
    ? subColorFor(structure, m.categoryId, m.subId)
    : cat
      ? categoryColor(cat.id, cat.color)
      : purchase
        ? categoryColor(purchase.id, purchase.color)
        : "var(--faint)";
  const plate = m.subId && cat
    ? <PiecePlate small color={subColorFor(structure, m.categoryId, m.subId)} icon={subIconFor(structure, m.categoryId, m.subId)} />
    : cat
      ? <PiecePlate small color={categoryColor(cat.id, cat.color)} icon={namedIconFor(cat)} />
      : purchase
        ? <PiecePlate small color={categoryColor(purchase.id, purchase.color)} icon={namedIconFor(purchase)} />
        : <PiecePlate small color="var(--faint)" icon="Package" />;
  const meta = [
    bookLabel(lang, m.monthKey),
    names.cat(m.categoryId) || names.purchase(m.categoryId),
    m.subId ? names.sub(m.subId) : "",
    m.merchantId ? names.catalog(m.merchantId) : "",
  ].filter(Boolean).join(" · ");
  return (
    <div
      className={`hist-row is-${m.kind}${sel?.marked ? " is-selected" : ""}`}
      data-line-id={m.lineId}
      {...(sel ? sel.bind(m.lineId) : {})}
      onClick={sel ? () => { if (!sel.consumeClick()) sel.onTap(m); } : undefined}
      style={sel ? ({ "--selc": tone } as CSSProperties) : undefined}
    >
      {sel?.mode ? <SelMark on={sel.marked} /> : null}
      {plate}
      <div className="hist-row-main">
        <strong className="hist-row-concept">{m.concept}</strong>
        <span className="hist-row-meta">{meta}</span>
      </div>
      {m.origin !== "manual" ? <span className="hist-badge">{t(`hist.origin.${m.origin}`)}</span> : null}
      <strong className={`hist-row-amt num ${m.kind === "in" ? "is-in" : m.kind === "xfer" ? "is-xfer" : ""}`}>
        {m.kind === "in" ? "+" : m.kind === "out" ? "−" : ""}{formatMoney(m.amountMinor, m.currency, lang)}
      </strong>
    </div>
  );
}

export function HistorialScreen() {
  const { session, t, lang, fmt, names, confirm, hidePeriodRange, hideLineSelection } = useFaro();
  const state = session?.ledger ?? null;
  const today = todayIso();
  const [lens, setLens] = useState<Lens>("month");
  const [anchor, setAnchor] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(`${today.slice(0, 7)}-01`);
  const [rangeTo, setRangeTo] = useState(today);
  // Los filtros del dueño (sin from/to: eso lo pone la lente).
  const [f, setF] = useState<StreamFilters>({});
  const [text, setText] = useState("");
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [views, setViews] = useState<SavedView[]>(readViews);
  const [shownDays, setShownDays] = useState(DAY_CHUNK);

  // El inicio de semana del locale del aparato (brief, pregunta abierta 2): el inglés
  // de EE. UU. empieza en domingo; el español, en lunes.
  const weekStart: 0 | 1 = lang === "en" ? 0 : 1;
  const range = useMemo(
    () => (lens === "range" ? { from: rangeFrom, to: rangeTo } : periodRange(lens, anchor, weekStart)),
    [lens, anchor, rangeFrom, rangeTo, weekStart],
  );
  const filters: StreamFilters = useMemo(() => {
    const out: StreamFilters = { ...f, from: range.from, to: range.to };
    const min = parseAmount(minText);
    const max = parseAmount(maxText);
    if (min !== null && min > 0) out.minMinor = min; else delete out.minMinor;
    if (max !== null && max > 0) out.maxMinor = max; else delete out.maxMinor;
    if (text.trim()) out.text = text; else delete out.text;
    return out;
  }, [f, range, minText, maxText, text]);

  const stream = useMemo(() => (state ? buildStream(state, filters) : []), [state, filters]);
  const totals = useMemo(() => (state ? streamTotals(state, stream) : { inMinor: 0, outMinor: 0, netMinor: 0, count: 0 }), [state, stream]);
  const days = useMemo(() => {
    const out: { date: string; moves: Movement[] }[] = [];
    for (const m of stream) {
      const last = out[out.length - 1];
      if (last && last.date === m.date) last.moves.push(m);
      else out.push({ date: m.date, moves: [m] });
    }
    return out;
  }, [stream]);
  useEffect(() => { setShownDays(DAY_CHUNK); }, [filters, lens]);

  if (!state) return null;

  // La firma de la vista (lente + rango + filtros estructurales): remontar la
  // cabecera de totales al cambiarla re-dispara la ceremonia del tema (en
  // Cyberpunk, el escaneo del borde de los totales — hist-temas.css). El texto
  // libre y los montos quedan fuera a propósito: teclear no debe ametrallar la
  // ceremonia con cada tecla.
  const viewSig = [lens, range.from, range.to, JSON.stringify(f)].join("|");
  const periodLabel = lens === "month"
    ? `${monthName(lang, Number(range.from.slice(5, 7)))} ${range.from.slice(0, 4)}`
    : lens === "year"
      ? range.from.slice(0, 4)
      : `${shortDay(lang, range.from)} – ${shortDay(lang, range.to)}${range.from.slice(0, 4) !== range.to.slice(0, 4) ? ` ${range.to.slice(0, 4)}` : ""}`;
  const shift = (dir: number) => {
    const d = at(anchor);
    if (lens === "week") d.setDate(d.getDate() + dir * 7);
    else if (lens === "month") d.setMonth(d.getMonth() + dir);
    else if (lens === "year") d.setFullYear(d.getFullYear() + dir);
    setAnchor(isoOf(d));
  };

  // Volver al presente (Oscar, 2026-11-13): tocar la placa del período salta
  // directo al período en curso, sin desandar flechas — el mismo reinicio que
  // applyView ya usa (setAnchor(today)). La comparación es por el RANGO de la
  // lente, así que semana, mes y año comparten la semántica; estando ya en el
  // presente, el toque no hace nada (ni ventana ni animación de adorno).
  const presentRange = lens === "range" ? null : periodRange(lens, today, weekStart);
  const onPresent = !!presentRange && range.from === presentRange.from && range.to === presentRange.to;
  const goPresent = () => { if (!onPresent) setAnchor(today); };

  // «Mes actual» (Oscar, 2026-11-13, a imagen del «Current Week» de Weekly):
  // SOLO la placa del navegador dice «actual» cuando el período mirado ES el
  // presente — estando en él no hace falta que la placa te diga dónde estás, y
  // fuera de él la placa conserva el nombre verdadero porque sí hace falta
  // saberlo. La prueba es la misma onPresent de la 255 (ninguna segunda noción
  // de presente) y la etiqueta es SOLO de la placa: periodLabel sigue intacta
  // para la identidad del folio en el panel de totales, para la ventana de
  // ocultar y para el nombre con que el tramo descansa en el Archivo.
  const plateLabel = onPresent
    ? t(lens === "week" ? "hist.now.week" : lens === "year" ? "hist.now.year" : "hist.now.month")
    : periodLabel;

  const cats = state.structure.categories;
  const subs = f.categoryId ? cats.find((c) => c.id === f.categoryId)?.subs ?? [] : [];
  const catalog = state.structure.catalog;
  const accounts = [
    ...catalog.filter((c) => c.kind === "acct").map((c) => ({ id: c.id, name: displayName(c, lang) })),
    ...cardsOf(state).map((c) => ({ id: c.id, name: c.name })),
  ];
  const batches = [...new Set(buildStream(state, { origin: "import" }).map((m) => m.batchId).filter((b): b is string => !!b))];

  type Chip = { key: string; label: string; clear: () => void };
  const chips: Chip[] = [];
  if (f.direction) chips.push({ key: "direction", label: t(`hist.f.${f.direction}`), clear: () => setF({ ...f, direction: undefined }) });
  if (f.categoryId) chips.push({ key: "category", label: `${names.cat(f.categoryId)}${f.subId ? ` · ${names.sub(f.subId)}` : ""}`, clear: () => setF({ ...f, categoryId: undefined, subId: undefined }) });
  if (f.group) chips.push({ key: "group", label: t(f.group === "fixed" ? "hist.f.fixed" : "hist.f.variable"), clear: () => setF({ ...f, group: undefined }) });
  if (f.merchantId) chips.push({ key: "merchant", label: names.catalog(f.merchantId) || f.merchantId, clear: () => setF({ ...f, merchantId: undefined }) });
  if (f.accountId) chips.push({ key: "account", label: accounts.find((a) => a.id === f.accountId)?.name ?? f.accountId, clear: () => setF({ ...f, accountId: undefined }) });
  if (f.origin) chips.push({ key: "origin", label: t(`hist.f.${f.origin}`), clear: () => setF({ ...f, origin: undefined, batchId: undefined }) });
  if (f.batchId) chips.push({ key: "batch", label: `${t("hist.f.batch")} ${f.batchId}`, clear: () => setF({ ...f, batchId: undefined }) });
  if (f.recurring != null) chips.push({ key: "recurring", label: t(f.recurring ? "hist.f.recYes" : "hist.f.recNo"), clear: () => setF({ ...f, recurring: undefined }) });
  if (filters.minMinor != null) chips.push({ key: "min", label: `${t("hist.f.min")} ${fmt(filters.minMinor)}`, clear: () => setMinText("") });
  if (filters.maxMinor != null) chips.push({ key: "max", label: `${t("hist.f.max")} ${fmt(filters.maxMinor)}`, clear: () => setMaxText("") });
  if (text.trim()) chips.push({ key: "text", label: `“${text.trim()}”`, clear: () => setText("") });

  const clearAll = () => { setF({}); setText(""); setMinText(""); setMaxText(""); };
  const saveViews = (next: SavedView[]) => { setViews(next); try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const applyView = (v: SavedView) => {
    const { from: _from, to: _to, text: vtext, minMinor, maxMinor, ...rest } = v.filters;
    setLens(v.lens);
    setAnchor(today);
    setF(rest);
    setText(vtext ?? "");
    setMinText(minMinor != null ? String(minMinor / 100) : "");
    setMaxText(maxMinor != null ? String(maxMinor / 100) : "");
    setViewsOpen(false);
  };

  const preview = hidePeriodDryRun(state, range.from, range.to);
  const askHide = () => {
    if (!preview.count) return;
    const count = preview.count === 1 ? t("hist.count1") : t("hist.count").replace("{n}", String(preview.count));
    confirm({
      title: t("hist.hide.title"),
      body: t("hist.hide.body")
        .replace("{count}", count)
        .replace("{period}", periodLabel)
        .replace("{inn}", fmt(preview.inMinor))
        .replace("{out}", fmt(preview.outMinor)),
      yes: t("hist.hide.yes"),
      run: () => hidePeriodRange(range.from, range.to, periodLabel),
    });
  };
  const hideLabel = t(lens === "week" ? "hist.hide.week" : lens === "month" ? "hist.hide.month" : lens === "year" ? "hist.hide.year" : "hist.hide.range");

  // El motor de selección en el río (Oscar, 2026-11-13): sostener una fila entra
  // al modo; tocar marca; la barra anuncia conteo, verbo y salida. El toque sin
  // modo ofrece ocultar ESE movimiento solo (S4) — la misma puerta de descanso
  // que el período, con su ventana. Ocultar hereda las guardas del período:
  // ventana honesta y commit deshacible.
  const selection = useSelection();
  const lp = useLongPress((id) => (selection.mode ? selection.toggle(id) : selection.enter(id)));
  const rowTap = (m: Movement) => {
    if (selection.mode) { selection.toggle(m.lineId); return; }
    confirm({
      title: t("hist.hideOne.title"),
      body: t("hist.hideOne.body")
        .replace("{concept}", m.concept)
        .replace("{amount}", formatMoney(m.amountMinor, m.currency, lang))
        .replace("{day}", dayLabel(lang, m.date)),
      yes: t("hist.hide.yes"),
      run: () => hideLineSelection([m.lineId]),
    });
  };
  const askHideSel = () => {
    const ids = [...selection.sel];
    if (!ids.length) return;
    confirm({
      title: t(ids.length === 1 ? "hist.hideSel.title.one" : "hist.hideSel.title").replace("{n}", String(ids.length)),
      body: t("hist.hideSel.body"),
      yes: t("hist.hide.yes"),
      run: () => { hideLineSelection(ids); selection.exit(); },
    });
  };

  const segBtn = (id: string, pressed: boolean, onPress: () => void, label: string) => (
    <button key={id} type="button" aria-pressed={pressed} onClick={onPress}>{label}</button>
  );

  return (
    <>
      {/* Las pastillas de Folios ya no viven en esta pantalla (1.3.249): las
          sienta shell.tsx en el padre persistente, como el par de Estudio —
          dentro de la pantalla la píldora renacía a cada cambio y la vuelta
          al Historial caía «demasiado fuerte». */}
      <div className="hist">
      <header className="hist-head">
        <p className="hist-sub">{t("hist.sub")}</p>
        <div className="seg hist-lens" role="tablist" aria-label={t("hist.title")}>
          {segBtn("week", lens === "week", () => setLens("week"), t("hist.week"))}
          {segBtn("month", lens === "month", () => setLens("month"), t("hist.month"))}
          {segBtn("year", lens === "year", () => setLens("year"), t("hist.year"))}
          {segBtn("range", lens === "range", () => setLens("range"), t("hist.range"))}
        </div>
        {lens === "range" ? (
          <div className="hist-range">
            <label className="hist-range-lab">{t("hist.from")}<input type="date" className="field" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} /></label>
            <label className="hist-range-lab">{t("hist.to")}<input type="date" className="field" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} /></label>
          </div>
        ) : (
          <div className="hist-navrow">
            <button type="button" className="icon-btn" aria-label={t("hist.prev")} onClick={() => shift(-1)}><ChevronLeft /></button>
            {/* El mes con casa (Oscar, 2026-11-13): el nombre del período vive
                en su placa — la gramática del panel de totales — y la placa
                entera es el botón que devuelve al presente. En el presente no
                promete acción alguna (sin aria-label) y su toque no hace nada. */}
            <button type="button" className="hist-period" onClick={goPresent} aria-label={onPresent ? undefined : t("hist.now")}>{plateLabel}</button>
            <button type="button" className="icon-btn" aria-label={t("hist.next")} onClick={() => shift(1)}><ChevronRight /></button>
          </div>
        )}
        {/* El veredicto (Oscar eligió el panel B del estudio, 2026-11-13): NETO
            manda a la izquierda como héroe y los flujos son la evidencia a la
            derecha. La cuenta NO vive en la línea de NETO (corrección de Oscar
            al espécimen): va archivada en la fila de folio, junto a la identidad
            del período, como metadato de la vista. La ley del color se completa:
            SALIÓ pinta is-neg cuando salió algo e is-zero (tenue) en cero. */}
        <div key={viewSig} className="hist-totals" data-anchor="hist-totals">
          <div className="hist-folio">
            <span className="hist-folio-period">{periodLabel}</span>
            <span className="hist-total-count">{totals.count === 1 ? t("hist.count1") : t("hist.count").replace("{n}", String(totals.count))}</span>
          </div>
          <div className="tb-net">
            <i>{t("hist.net")}</i>
            <b className={`num ${totals.netMinor < 0 ? "is-neg" : "is-in"}`}>{fmt(totals.netMinor)}</b>
          </div>
          <div className="tb-flows">
            <span className="tb-flow"><i>{t("hist.in")}</i><b className="num is-in">{fmt(totals.inMinor)}</b></span>
            <span className="tb-flow"><i>{t("hist.out")}</i><b className={`num ${totals.outMinor !== 0 ? "is-neg" : "is-zero"}`}>{fmt(totals.outMinor)}</b></span>
          </div>
        </div>
        <div className="hist-tools">
          <label className="search-pill hist-search">
            <Search className="size-4" aria-hidden />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("hist.search")} aria-label={t("hist.search")} />
            {text ? <button type="button" className="hist-x" aria-label={t("hist.clearFilters")} onClick={() => setText("")}><X className="size-4" /></button> : null}
          </label>
          <button type="button" className={`btn secondary hist-tool-btn${filtersOpen ? " is-on" : ""}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((on) => !on)}>
            <SlidersHorizontal className="size-4" aria-hidden />{t("hist.filters")}{chips.length ? <b className="hist-tool-n">{chips.length}</b> : null}
          </button>
          <button type="button" className={`btn secondary hist-tool-btn${viewsOpen ? " is-on" : ""}`} aria-expanded={viewsOpen} onClick={() => setViewsOpen((on) => !on)}>{t("hist.views")}</button>
        </div>
        {chips.length ? (
          <div className="hist-chips">
            {chips.map((c) => (
              <button key={c.key} type="button" className="hist-chip" onClick={c.clear}>{c.label}<X className="size-3.5" aria-hidden /></button>
            ))}
            <button type="button" className="hist-chip is-clear" onClick={clearAll}>{t("hist.clearFilters")}</button>
          </div>
        ) : null}
        {viewsOpen ? (
          <div className="hist-panel">
            {views.length ? views.map((v) => (
              <span key={v.name} className="hist-view">
                <button type="button" className="hist-view-go" onClick={() => applyView(v)}>{v.name}</button>
                <button type="button" className="hist-x" aria-label={v.name} onClick={() => saveViews(views.filter((x) => x.name !== v.name))}><X className="size-4" /></button>
              </span>
            )) : <p className="hist-panel-note">{t("hist.views.empty")}</p>}
            <div className="hist-view-save">
              <input className="field" value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder={t("hist.views.name")} aria-label={t("hist.views.name")} />
              <button type="button" className="btn" disabled={!viewName.trim()} onClick={() => {
                const name = viewName.trim();
                if (!name) return;
                saveViews([...views.filter((x) => x.name !== name), { name, lens, filters }]);
                setViewName("");
              }}>{t("hist.views.save")}</button>
            </div>
          </div>
        ) : null}
        {filtersOpen ? (
          <div className="hist-panel">
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.direction")}</span>
              <div className="chips">
                {segBtn("d-all", !f.direction, () => setF({ ...f, direction: undefined }), t("hist.f.all"))}
                {segBtn("d-in", f.direction === "in", () => setF({ ...f, direction: "in" }), t("hist.f.in"))}
                {segBtn("d-out", f.direction === "out", () => setF({ ...f, direction: "out" }), t("hist.f.out"))}
                {segBtn("d-xfer", f.direction === "xfer", () => setF({ ...f, direction: "xfer" }), t("hist.f.xfer"))}
              </div>
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.category")}</span>
              <select className="select hist-select" value={f.categoryId ?? ""} onChange={(e) => setF({ ...f, categoryId: e.target.value || undefined, subId: undefined })} aria-label={t("hist.f.category")}>
                <option value="">{t("hist.f.all")}</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{displayName(c, lang)}</option>)}
              </select>
              {f.categoryId ? (
                <select className="select hist-select" value={f.subId ?? ""} onChange={(e) => setF({ ...f, subId: e.target.value || undefined })} aria-label={t("hist.f.sub")}>
                  <option value="">{t("hist.f.all")}</option>
                  {subs.map((s) => <option key={s.id} value={s.id}>{displayName(s, lang)}</option>)}
                </select>
              ) : null}
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.group")}</span>
              <div className="chips">
                {segBtn("g-all", !f.group, () => setF({ ...f, group: undefined }), t("hist.f.all"))}
                {segBtn("g-fixed", f.group === "fixed", () => setF({ ...f, group: "fixed" }), t("hist.f.fixed"))}
                {segBtn("g-var", f.group === "variable", () => setF({ ...f, group: "variable" }), t("hist.f.variable"))}
              </div>
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.merchant")}</span>
              <select className="select hist-select" value={f.merchantId ?? ""} onChange={(e) => setF({ ...f, merchantId: e.target.value || undefined })} aria-label={t("hist.f.merchant")}>
                <option value="">{t("hist.f.all")}</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{displayName(c, lang)}</option>)}
              </select>
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.account")}</span>
              <select className="select hist-select" value={f.accountId ?? ""} onChange={(e) => setF({ ...f, accountId: e.target.value || undefined })} aria-label={t("hist.f.account")}>
                <option value="">{t("hist.f.all")}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.amount")}</span>
              <input className="field hist-amt" inputMode="decimal" value={minText} onChange={(e) => setMinText(e.target.value)} placeholder={t("hist.f.min")} aria-label={t("hist.f.min")} />
              <input className="field hist-amt" inputMode="decimal" value={maxText} onChange={(e) => setMaxText(e.target.value)} placeholder={t("hist.f.max")} aria-label={t("hist.f.max")} />
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.origin")}</span>
              <div className="chips">
                {segBtn("o-all", !f.origin, () => setF({ ...f, origin: undefined, batchId: undefined }), t("hist.f.all"))}
                {segBtn("o-manual", f.origin === "manual", () => setF({ ...f, origin: "manual", batchId: undefined }), t("hist.f.manual"))}
                {segBtn("o-widget", f.origin === "widget", () => setF({ ...f, origin: "widget", batchId: undefined }), t("hist.f.widget"))}
                {segBtn("o-import", f.origin === "import", () => setF({ ...f, origin: "import" }), t("hist.f.import"))}
              </div>
              {f.origin === "import" && batches.length ? (
                <select className="select hist-select" value={f.batchId ?? ""} onChange={(e) => setF({ ...f, batchId: e.target.value || undefined })} aria-label={t("hist.f.batch")}>
                  <option value="">{t("hist.f.all")}</option>
                  {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : null}
            </div>
            <div className="hist-frow">
              <span className="hist-flab">{t("hist.f.recurring")}</span>
              <div className="chips">
                {segBtn("r-all", f.recurring == null, () => setF({ ...f, recurring: undefined }), t("hist.f.all"))}
                {segBtn("r-yes", f.recurring === true, () => setF({ ...f, recurring: true }), t("hist.f.recYes"))}
                {segBtn("r-no", f.recurring === false, () => setF({ ...f, recurring: false }), t("hist.f.recNo"))}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {days.length ? (
        <div className="hist-days">
          {days.slice(0, shownDays).map((d) => (
            <section key={d.date} className="hist-day">
              <h3 className="hist-day-head">{dayLabel(lang, d.date)}</h3>
              {d.moves.map((m) => (
                <StreamRow
                  key={m.lineId}
                  m={m}
                  state={state}
                  sel={{ mode: selection.mode, marked: selection.sel.has(m.lineId), bind: lp.bind, consumeClick: lp.consumeClick, onTap: rowTap }}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <Note>{chips.length || text.trim() ? t("hist.emptyFilters") : t("hist.empty")}</Note>
      )}
      {days.length > shownDays ? (
        <button type="button" className="btn secondary hist-more" onClick={() => setShownDays((n) => n + DAY_CHUNK)}>{t("hist.more")}</button>
      ) : null}

      {!selection.mode ? (
        <div className="hist-hidebar">
          <button type="button" className="btn secondary hist-hide-btn" disabled={!preview.count} onClick={askHide}>
            <EyeOff className="size-4" aria-hidden />{hideLabel}
          </button>
        </div>
      ) : null}
      {selection.mode ? (
        <SelectionBar count={selection.count} onExit={selection.exit}>
          <button type="button" className="btn secondary" disabled={!selection.count} onClick={askHideSel} data-testid="sel-hide">
            <EyeOff className="size-4" aria-hidden />{t("sel.hide")}
          </button>
        </SelectionBar>
      ) : null}
      </div>
    </>
  );
}
