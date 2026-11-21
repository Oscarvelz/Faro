/**
 * Ola 6 (1.3.356) — los avisos de pagos que se acercan y el pago
 * automático, por orden de Oscar (2026-11-20): «notificar cuando un pago
 * recurrente con fecha se aproxima — aunque el cargo sea automático en
 * línea — invitando a aplicar cambios; y pago automático por pago: Faro
 * descuenta solo el monto en su fecha, de la cuenta elegida».
 *
 * LOS AVISOS leen la ÚNICA ventana de vencimientos (dues.ts): cuotas y
 * tarjetas con fecha dentro del horizonte (y lo vencido, que la ventana
 * nunca esconde). Nada se calcula dos veces: la tarjeta de Central y
 * cualquier otra superficie leen de aquí.
 *
 * EL PAGO AUTOMÁTICO es un asentamiento al abrir: una PWA no corre sola,
 * así que «Faro paga solo» quiere decir que al abrir Faro, toda cuota con
 * pago automático cuya fecha ya llegó y cuyo período aún no tiene
 * instancia queda anotada — la instancia del período, con su fecha y su
 * cuenta (sourceId) — y Faro lo DICE. Reglas de la casa:
 *  - La configuración vive en la instancia más reciente de la serie y las
 *    instancias asentadas la heredan: la serie sigue sola.
 *  - Idempotente por construcción: el id de la instancia asentada es
 *    determinista (serie + fecha) y un período con instancia no se toca.
 *  - Solo se asienta lo reciente (62 días): un período más viejo se le
 *    deja al usuario en Cobros, no se le inventa historia antigua.
 *  - Una serie inactiva o en descanso no asienta nada.
 */
import { intervalOf, stepDate } from "./cadence.ts";
import { duesWindow, type DueEntry } from "./dues.ts";
import { todayIso } from "./loans.ts";
import type { LedgerState, Line } from "./types.ts";

/** Días hacia adelante que el aviso de Central mira (lo vencido entra siempre). */
export const DUE_ALERT_HORIZON_DAYS = 3;
/** Cuánto hacia atrás asienta el pago automático al abrir. */
export const AUTOPAY_SETTLE_WINDOW_DAYS = 62;

/** Los pagos que se acercan: cuotas y tarjetas de la ventana única,
 * ordenados por fecha (la ventana ya ordena). Préstamos fuera: su importe
 * no está modelado y un aviso sin cifra no invita a ningún cambio. */
export function dueAlerts(state: LedgerState, today: string = todayIso()): DueEntry[] {
  return duesWindow(state, DUE_ALERT_HORIZON_DAYS, today).filter((e) => e.kind === "cuota" || e.kind === "card");
}

export type SettledPayment = {
  seriesId: string;
  concept: string;
  amountMinor: number;
  currency: Line["currency"];
  /** La fecha del cargo asentado (YYYY-MM-DD). */
  on: string;
  /** La cuenta elegida (sourceId de la instancia creada). */
  accountId: string;
};

const dayOf = (line: Line): string => line.bookedOn || line.nextDue || `${line.monthKey}-01`;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Asienta los períodos vencidos de las cuotas con pago automático.
 * Puro: devuelve el estado nuevo (el mismo objeto si nada se asentó) y
 * la lista de lo asentado, en orden de fecha.
 */
export function settleAutopay(state: LedgerState, today: string = todayIso()): { state: LedgerState; settled: SettledPayment[] } {
  const windowStart = addDays(today, -AUTOPAY_SETTLE_WINDOW_DAYS);
  const series = new Map<string, Line[]>();
  for (const month of Object.values(state.months)) {
    for (const line of month.lines) {
      if (line.kind !== "subscription") continue;
      const key = line.seriesId || line.id;
      const arr = series.get(key);
      if (arr) arr.push(line); else series.set(key, [line]);
    }
  }
  const settled: SettledPayment[] = [];
  let months = state.months;
  let touched = false;
  for (const [seriesId, instances] of series) {
    const sorted = [...instances].sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
    const latest = sorted[sorted.length - 1]!;
    if (!latest.autopay || !latest.autopayAccountId || !latest.active || latest.rest) continue;
    if (!intervalOf(latest.cadence)) continue;
    const anchor = Number((latest.nextDue || "").slice(8, 10)) || Number(dayOf(latest).slice(8, 10)) || 1;
    // Un período está cubierto por FECHA, no por mes: una cadencia
    // semanal vive varias veces en el mismo mes. Cada instancia cubre
    // su fecha de cargo y su fecha anotada (un pago tardío anota la
    // segunda y debe la primera: ambas cuentan como el mismo período).
    const covered = new Set<string>();
    for (const l of instances) {
      if (/^\d{4}-\d{2}-\d{2}/.test(l.nextDue || "")) covered.add(l.nextDue.slice(0, 10));
      if (/^\d{4}-\d{2}-\d{2}/.test(l.bookedOn || "")) covered.add(l.bookedOn!.slice(0, 10));
    }
    let due = stepDate(latest.nextDue || dayOf(latest), latest.cadence, anchor);
    for (let guard = 0; guard < 64 && due <= today; guard += 1) {
      const key = due.slice(0, 7);
      if (due >= windowStart && !covered.has(due)) {
        // La instancia nueva hereda la serie, no la identidad del papel:
        // las claves de importación y el lote de la última instancia no
        // se duplican jamás (una clave repetida corrompería Deshacer).
        const { importId: _imp, batch: _batch, ...base } = latest;
        const instance: Line = {
          ...base,
          id: `auto-${seriesId}-${due}`,
          monthKey: key,
          bookedOn: due,
          nextDue: due,
          sourceId: latest.autopayAccountId,
          history: [],
        };
        const bucket = months[key] ?? { lines: [] };
        months = { ...months, [key]: { lines: [...bucket.lines, instance] } };
        covered.add(due);
        touched = true;
        settled.push({ seriesId, concept: latest.concept, amountMinor: latest.amountMinor, currency: latest.currency, on: due, accountId: latest.autopayAccountId });
      }
      due = stepDate(due, latest.cadence, anchor);
    }
  }
  settled.sort((a, b) => a.on.localeCompare(b.on));
  return { state: touched ? { ...state, months } : state, settled };
}
