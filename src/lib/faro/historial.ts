/**
 * historial — el Historial: los libros leídos como un solo río (brief «Historial por períodos»).
 *
 * Su eje es el TIEMPO, no la categoría: cada línea viva del libro es un movimiento con su día
 * (descanso.movementDate), ordenado del más nuevo al más viejo, y cada movimiento lleva su
 * PROCEDENCIA puesta — nunca deducida: su línea, su libro, su categoría y sub, su grupo, su
 * tienda, su origen (a mano · widget · importación, con su lote) y su cuenta o tarjeta.
 *
 * La orden de operaciones es ley: primero corre la puerta anti-fuga (descanso.ts) — el río
 * se construye SOLO con líneas que no descansan, así que ningún filtro, búsqueda ni vista
 * guardada puede resucitar lo que vive en el Archivo — y después corren los filtros del
 * usuario, que se combinan con AND. Los totales son DE LA VISTA FILTRADA: cada combinación
 * responde con su propio entró / salió / neto, en la moneda de vista.
 *
 * Puro y sin pantalla: la navegación por períodos, las vistas guardadas y el render en
 * ventana viven en la capa de UI; aquí solo hay matemáticas de períodos y el río.
 */
import { ISO_DAY, movementDate } from "./descanso.ts";
import { convertMinor } from "./money.ts";
import type { Currency, Group, LedgerState, Line } from "./types.ts";

const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export type PeriodKind = "week" | "month" | "year";
export type DateRange = { from: string; to: string };

/**
 * El rango [from, to] (días ISO, inclusivo) del período que contiene a `anchor`.
 * La semana empieza el día `weekStart` (0 = domingo, 1 = lunes; por defecto lunes) —
 * la pantalla pasa el del locale del aparato, como manda el brief.
 * Un ancla inválida devuelve el rango vacío "".."" (ningún día cae en él).
 */
export function periodRange(kind: PeriodKind, anchor: string, weekStart: 0 | 1 = 1): DateRange {
  const a = (anchor || "").slice(0, 10);
  if (!ISO_DAY.test(a)) return { from: "", to: "" };
  const y = Number(a.slice(0, 4));
  const m = Number(a.slice(5, 7));
  if (kind === "year") return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (kind === "month") {
    const last = new Date(y, m, 0).getDate();
    return { from: dayOf(y, m, 1), to: dayOf(y, m, last) };
  }
  const d = new Date(y, m - 1, Number(a.slice(8, 10)), 12);
  const back = (d.getDay() - weekStart + 7) % 7;
  const start = new Date(y, m - 1, Number(a.slice(8, 10)) - back, 12);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 12);
  return {
    from: dayOf(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    to: dayOf(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  };
}

export type MovementKind = "in" | "out" | "xfer";
export type MovementOrigin = "manual" | "widget" | "import";

/** Un movimiento del río, con su procedencia puesta. Los montos van en su moneda propia;
 *  los totales de la vista (streamTotals) convierten a la moneda de vista. */
export type Movement = {
  lineId: string;
  monthKey: string;
  date: string;
  concept: string;
  note: string;
  categoryId: string;
  subId: string;
  group: Group;
  merchantId?: string;
  accountId?: string;
  origin: MovementOrigin;
  batchId?: string;
  amountMinor: number;
  currency: Line["currency"];
  kind: MovementKind;
  recurring: boolean;
};

export type StreamFilters = {
  /** Rango de días ISO inclusivo (periodRange lo construye desde semana/mes/año). */
  from?: string;
  to?: string;
  direction?: MovementKind;
  categoryId?: string;
  subId?: string;
  group?: Group;
  merchantId?: string;
  /** Cuenta o tarjeta: casa con el sourceId o el cardId de la línea. */
  accountId?: string;
  /** Umbrales de monto EN LA MONEDA DE VISTA (como los teclea y los lee el usuario):
   *  cada movimiento se convierte a ella antes de comparar (W2). */
  minMinor?: number;
  maxMinor?: number;
  origin?: MovementOrigin;
  /** Lote de importación exacto (solo con origen importación tiene sentido). */
  batchId?: string;
  recurring?: boolean;
  /** Texto libre sobre concepto y nota, sin acentos ni mayúsculas. */
  text?: string;
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

function originOf(l: Line): MovementOrigin {
  if (l.batch || l.importId) return "import";
  // El apunte del widget se escribe con la nota «Widget» (quickadd, 1.3.233): su única marca.
  if ((l.note || "").trim().toLowerCase() === "widget") return "widget";
  return "manual";
}

function groupOf(state: LedgerState, l: Line): Group {
  const cat = state.structure.categories.find((c) => c.id === l.categoryId);
  if (cat) return cat.group;
  return l.kind === "expense-fixed" || l.kind === "income-fixed" || l.kind === "subscription" ? "fixed" : "variable";
}

function toMovement(state: LedgerState, monthKey: string, l: Line): Movement {
  const origin = originOf(l);
  return {
    lineId: l.id,
    monthKey,
    date: movementDate(l),
    concept: l.concept,
    note: l.note,
    categoryId: l.categoryId,
    subId: l.subId,
    group: groupOf(state, l),
    ...(l.storeId || l.providerId ? { merchantId: l.storeId || l.providerId } : {}),
    ...(l.sourceId || l.cardId ? { accountId: l.sourceId || l.cardId } : {}),
    origin,
    ...(origin === "import" && l.batch ? { batchId: l.batch } : {}),
    amountMinor: l.amountMinor,
    currency: l.currency,
    kind: l.xfer ? "xfer" : l.kind.startsWith("income") ? "in" : "out",
    recurring: l.recurring,
  };
}

function passes(m: Movement, f: StreamFilters, text: string, display: Currency, rateE4: number): boolean {
  if (f.from && m.date < f.from) return false;
  if (f.to && m.date > f.to) return false;
  if (f.direction && m.kind !== f.direction) return false;
  if (f.categoryId && m.categoryId !== f.categoryId) return false;
  if (f.subId && m.subId !== f.subId) return false;
  if (f.group && m.group !== f.group) return false;
  if (f.merchantId && m.merchantId !== f.merchantId) return false;
  if (f.accountId && m.accountId !== f.accountId) return false;
  if (f.minMinor != null || f.maxMinor != null) {
    // W2: el umbral vive en la moneda de vista; el movimiento se convierte a ella
    // antes de comparar — comparar el menor crudo de otra moneda filtraba mal.
    const v = Math.abs(convertMinor(m.amountMinor, m.currency, display, rateE4));
    if (f.minMinor != null && v < f.minMinor) return false;
    if (f.maxMinor != null && v > f.maxMinor) return false;
  }
  if (f.origin && m.origin !== f.origin) return false;
  if (f.batchId && m.batchId !== f.batchId) return false;
  if (f.recurring != null && m.recurring !== f.recurring) return false;
  if (text && !fold(`${m.concept} ${m.note}`).includes(text)) return false;
  return true;
}

/**
 * El río: todos los movimientos vivos del libro, del más nuevo al más viejo (a igual día,
 * el orden del libro manda), ya filtrados. La puerta corre primero por construcción:
 * una línea que descansa jamás se convierte en movimiento.
 */
export function buildStream(state: LedgerState, filters: StreamFilters = {}): Movement[] {
  const text = filters.text ? fold(filters.text) : "";
  const { display, rateE4 } = state.settings;
  const out: Movement[] = [];
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    for (const l of bucket.lines) {
      if (l.rest) continue; // LA PUERTA: lo apartado no entra al río, bajo ningún filtro.
      // Un movimiento es dinero que se movió: la línea activa, o la transferencia — que se
      // guarda inactiva por diseño y aun así ES un movimiento (el filtro la nombra). La
      // instancia inactiva de una serie es una intención, no un movimiento: no entra.
      if (!l.active && !l.xfer) continue;
      const m = toMovement(state, monthKey, l);
      if (passes(m, filters, text, display, rateE4)) out.push(m);
    }
  }
  // Estable: fecha descendente; el empate conserva el orden de lectura (libro, luego línea).
  return out
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.date.localeCompare(a.m.date) || a.i - b.i)
    .map((x) => x.m);
}

export type StreamTotals = { inMinor: number; outMinor: number; netMinor: number; count: number };

/** Los totales DE ESTA VISTA (la filtrada), en la moneda de vista, convertidos con la
 *  conversión canónica de la casa. Las transferencias no son ni entró ni salió:
 *  cuentan en `count` y en ningún total. */
export function streamTotals(state: LedgerState, movements: Movement[]): StreamTotals {
  const { display, rateE4 } = state.settings;
  let inMinor = 0;
  let outMinor = 0;
  for (const m of movements) {
    if (m.kind === "xfer") continue;
    const v = convertMinor(m.amountMinor, m.currency, display, rateE4);
    if (m.kind === "in") inMinor += v; else outMinor += v;
  }
  return { inMinor, outMinor, netMinor: inMinor - outMinor, count: movements.length };
}
