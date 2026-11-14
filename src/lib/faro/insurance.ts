/**
 * Seguro de vida (1.3.271, orden de Oscar 2026-11-14): la lógica en un solo lugar.
 *
 * La regla que lo gobierna todo: un seguro de vida es protección que se renta,
 * no dinero que se tiene. La prima es un GASTO FIJO; el cobro recurrente es una
 * OBLIGACIÓN (un vencimiento más en Pagos, por la vía única de dues.ts); la
 * póliza NUNCA es un activo — no hay bolsillo, no hay saldo, no entra en
 * savingsStock, ni en Tengo, ni en Retiro. Contarla como dinero sería el pecado
 * del dinero fantasma. La cobertura y el beneficiario viven solo como texto en
 * la nota de la pieza, jamás como una cifra.
 *
 * La pieza vive en el Catálogo (kind "ins"), sobre la maquinaria de las
 * suscripciones: misma tarjeta, misma mano, misma soberanía (ojo/papelera), y
 * SIN pin — como las suscripciones, no se puede fijar (la nota de 1.3.269
 * sigue siendo verdad: el snapshot del widget solo enumera tiendas e IA).
 *
 * El rastro del dinero es UNA línea permanente de gasto fijo (kind
 * "expense-fixed", recurring, cadence "monthly") archivada en la categoría de
 * fábrica «Seguros» bajo su subconcepto «Vida» (f-seguros / f.seguros.vida —
 * la casa ya nació con ese asiento; no se bifurca una categoría nueva), ligada
 * a la pieza por providerId — el asiento de la casa para «el servicio del
 * catálogo que esta línea nombra» (así catalogLinesSummary y el aviso al
 * borrar cuentan la verdad). La línea lleva nextDue = bookedOn = la fecha de
 * cobro del mes, de modo que duesWindow la lee como cualquier cuota, sin
 * canales laterales y sin proyecciones pieza→vencimiento que duplicarían la
 * serie. copyRecurring la rueda a los meses siguientes como a cualquier línea
 * recurrente.
 *
 * El momento del cobro es ciudadano de primera clase: día fijo del mes O
 * semana del mes (1ª–4ª). Una pieza anclada a la semana n abre su ventana el
 * día 7·(n−1)+1 y su fecha de cobro ES ese día — el aviso nace al inicio de la
 * semana, sin fingir un día que el usuario no eligió.
 *
 * Retrospectiva (steer de Oscar, 2026-11-14): la pieza guarda la fecha en que
 * el usuario empezó con la aseguradora (su dato; vacía al nacer, nada se
 * inventa) y la tarjeta cuenta los meses enteros desde entonces. Las primas
 * pagadas, si se muestran, son la SUMA DE LAS LÍNEAS ANOTADAS — nunca
 * meses × importe: los importes cambian con los años y una multiplicación
 * fabricaría dinero. Conteo y suma son lecturas de hechos: no entran en
 * ningún total, bolsillo ni stock.
 */
import { nextDueDayOn } from "./dues";
import { defaultStructure, displayName } from "./defaults";
import { uid } from "./money";
import type { CatalogItem, Currency, InsPlan, LedgerState, Line } from "./types";

/** La categoría de fábrica donde archiva la prima y su subconcepto Vida. */
export const INS_CAT_ID = "f-seguros";
export const INS_SUB_ID = "f.seguros.vida";
/** La pieza de fábrica (sin importe hasta que el usuario ponga el suyo). */
export const INS_FACTORY_ID = "primerica";

export type InsTiming = { day: number } | { week: number };

/** El momento configurado de un plan, o null si el plan no lo trae completo. */
export function insTiming(plan: InsPlan | undefined): InsTiming | null {
  if (!plan) return null;
  if (plan.day && plan.day >= 1 && plan.day <= 31) return { day: plan.day };
  if (plan.week && plan.week >= 1 && plan.week <= 4) return { week: plan.week };
  return null;
}

/** Un plan configurado de verdad: importe del usuario y momento completo.
 *  Sin plan configurado no nace línea alguna — nada se inventa. */
export function insConfigured(item: CatalogItem): boolean {
  return !!item.ins && item.ins.amt > 0 && insTiming(item.ins) !== null;
}

function lastDayOfMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

function isoOf(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** La fecha de cobro de un momento dentro de un mes ("YYYY-MM"): día fijo
 *  (acotado al fin de mes) o el primer día de la semana n — 7·(n−1)+1, que
 *  para la 4ª semana es el 22 y nunca rebasa el mes. */
export function insDraftOn(timing: InsTiming, monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if ("day" in timing) return isoOf(y, m, Math.min(timing.day, lastDayOfMonth(y, m)));
  return isoOf(y, m, Math.min(7 * (timing.week - 1) + 1, lastDayOfMonth(y, m)));
}

/** El próximo cobro en o después de hoy: el de este mes si aún no pasó; si
 *  pasó, el del mes siguiente. Para día fijo delega en la lectura de la casa
 *  (nextDueDayOn, la misma que leen las tarjetas). */
export function insNextOn(timing: InsTiming, today: string): string {
  if ("day" in timing) return nextDueDayOn(timing.day, today);
  const mk = today.slice(0, 7);
  const thisMonth = insDraftOn(timing, mk);
  if (thisMonth >= today) return thisMonth;
  const [y, m] = mk.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return insDraftOn(timing, next);
}

/** Meses ENTEROS desde la fecha de inicio hasta hoy. null cuando no hay
 *  inicio válido o el inicio está en el futuro — el contador no se pinta:
 *  ni conteos negativos ni ficción silenciosa. Inicio = hoy → 0. */
export function monthsSince(start: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start > today) return null;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let months = (ty - sy) * 12 + (tm - sm);
  if (td < sd) months -= 1;
  return months >= 0 ? months : null;
}

/** El día de una línea a efectos del conteo: el día anotado, si no el
 *  vencimiento, si no el primero de su mes. */
function lineDay(line: Line): string {
  return line.bookedOn || line.nextDue || `${line.monthKey}-01`;
}

export type InsPaid = { count: number; totals: { cur: Currency; amt: number }[] };

/** Las primas ANOTADAS de una pieza entre su inicio y hoy: el conteo y la
 *  suma por moneda de las líneas archivadas (providerId = la pieza, activas,
 *  día dentro de [inicio, hoy]). Suma líneas, nunca multiplica: un cambio de
 *  importe a mitad de historia no reescribe el pasado. Sin fecha de inicio
 *  no hay ventana honesta → null. Las monedas no se mezclan ni se convierten
 *  (regla de la casa). */
export function insPaid(state: LedgerState, itemId: string, start: string, today: string): InsPaid | null {
  if (!start || start > today) return null;
  let count = 0;
  const byCur = new Map<Currency, number>();
  for (const bucket of Object.values(state.months)) {
    for (const line of bucket.lines) {
      if (line.providerId !== itemId || line.rest || !line.active) continue;
      const day = lineDay(line);
      if (day < start || day > today) continue;
      count += 1;
      byCur.set(line.currency, (byCur.get(line.currency) ?? 0) + line.amountMinor);
    }
  }
  return { count, totals: [...byCur.entries()].map(([cur, amt]) => ({ cur, amt })) };
}

/** El asiento de la prima dentro de la estructura: la categoría de fábrica
 *  «Seguros» con su subconcepto «Vida». Si el usuario la borró de su
 *  estructura, configurar un seguro la repone AL FINAL del grupo fijo (como
 *  hace restoreDefaultCategories) — puesta por un acto explícito del usuario,
 *  nunca en silencio. Una categoría renombrada por el usuario jamás se
 *  renombra de vuelta: se enlaza por id. */
export function ensureInsSeat(state: LedgerState): LedgerState {
  const factory = defaultStructure().categories.find((c) => c.id === INS_CAT_ID);
  if (!factory) return state;
  const cats = state.structure.categories;
  const existing = cats.find((c) => c.id === INS_CAT_ID);
  if (!existing) {
    const order = cats.filter((x) => x.group === "fixed").reduce((m, x) => Math.max(m, x.order), -1) + 1;
    return { ...state, structure: { ...state.structure, categories: [...cats, { ...factory, order }] } };
  }
  if (existing.subs.some((s) => s.id === INS_SUB_ID)) return state;
  const vida = factory.subs.find((s) => s.id === INS_SUB_ID);
  if (!vida) return state;
  const sub = { ...vida, order: existing.subs.reduce((m, s) => Math.max(m, s.order), -1) + 1 };
  const categories = cats.map((c) => (c.id === INS_CAT_ID ? { ...c, subs: [...c.subs, sub] } : c));
  return { ...state, structure: { ...state.structure, categories } };
}

/** Mantiene la línea permanente de la prima al día con el plan de la pieza.
 *  Pura: devuelve el estado (el mismo si la pieza no está configurada).
 *  - Sin línea viva: nace en el mes en curso con la fecha de cobro de ese mes
 *    (gramática de Debo.addDue: bookedOn = nextDue = la fecha), reutilizando
 *    la serie de cualquier línea pasada de la pieza.
 *  - Con línea en el mes en curso: se actualiza EN SITIO (importe, moneda,
 *    concepto, asiento, cuenta de cobro, fecha) — el mes en curso es el plan
 *    vivo, no historia.
 *  - Los meses pasados NUNCA se reescriben al editar el plan: son historia.
 *  El estado activo de una línea existente se respeta tal cual: si el usuario
 *  la apagó en Fijos, guardar el plan no la resucita. */
export function syncInsLine(state: LedgerState, item: CatalogItem, today: string): LedgerState {
  if (!insConfigured(item)) return state;
  const plan = item.ins!;
  const timing = insTiming(plan)!;
  const st = ensureInsSeat(state);
  const mk = today.slice(0, 7);
  const draft = insDraftOn(timing, mk);
  const name = displayName(item, st.settings.lang);
  const patch = {
    concept: name,
    amountMinor: plan.amt,
    currency: plan.cur,
    categoryId: INS_CAT_ID,
    subId: INS_SUB_ID,
    sourceId: plan.src || undefined,
  };
  const bucket = st.months[mk];
  const lines = bucket?.lines ?? [];
  const idx = lines.findIndex((l) => l.providerId === item.id && l.kind === "expense-fixed");
  if (idx >= 0) {
    const nextLines = lines.map((l, i) => (i === idx ? { ...l, ...patch, nextDue: draft, bookedOn: draft } : l));
    return { ...st, months: { ...st.months, [mk]: { lines: nextLines } } };
  }
  let seriesId = "";
  for (const b of Object.values(st.months)) {
    const found = b.lines.find((l) => l.providerId === item.id && l.kind === "expense-fixed");
    if (found) { seriesId = found.seriesId || found.id; break; }
  }
  const line: Line = {
    id: uid(),
    seriesId: seriesId || uid(),
    monthKey: mk,
    kind: "expense-fixed",
    concept: name,
    amountMinor: plan.amt,
    currency: plan.cur,
    active: true,
    note: "",
    categoryId: INS_CAT_ID,
    subId: INS_SUB_ID,
    recurring: true,
    storeId: "",
    providerId: item.id,
    productCode: "",
    productUrl: "",
    cadence: "monthly",
    nextDue: draft,
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: plan.cur,
    icon: "Heart",
    history: [],
    bookedOn: draft,
    sourceId: plan.src || undefined,
  };
  return { ...st, months: { ...st.months, [mk]: { lines: [...lines, line] } } };
}
