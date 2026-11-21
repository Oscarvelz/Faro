/* §19.3 — El vigilante de fijos que suben (1.3.366; fallos F-V1/F-V2/F-V3
 * de Oscar, 2026-11-21). LA SERIE DE PRECIOS (F-B2): un solo motor que
 * compone, desde las líneas, la historia de montos de cada cargo
 * recurrente y de cada producto — la Bitácora la consumirá para narrar
 * el año; aquí la leen el aviso del Asesor y el espacio de Estudio.
 * Dos motores de precios sería duplicación (cerca 3 del brief).
 *
 * Dos clases que NO se mezclan (cerca 1):
 *  - FIJO: un cargo recurrente (la misma identidad y la misma prueba
 *    de fijeza que el saldo proyectado: serie o concepto|categoría|sub,
 *    marcado fijo/suscripción/recurrente o presente en ≥2 meses).
 *    Cualquier cambio de monto entre dos apariciones seguidas ES la
 *    noticia — sin umbral: lo fijo no debía moverse.
 *  - PRODUCTO: una compra (kind purchase) del mismo concepto en la
 *    misma tienda. Su precio se mueve por naturaleza: solo entra si el
 *    salto entre una compra y la siguiente es de 5% o más (F-V1).
 *
 * Dicho el cambio, el monto nuevo ES el patrón (cerca 5): este motor no
 * guarda estado — el patrón de un fijo es, por construcción, su última
 * aparición, que es lo mismo que leen el saldo proyectado y la base
 * fija del Asesor. El aviso del Asesor (V2) suena una vez por cambio
 * (cerca 2) porque solo presenta los cambios cuya aparición nueva cae
 * en el mes en curso: al mes siguiente ese cambio ya es historia y
 * vive en Estudio, no en el aviso. */
import { convertMinor } from "./money.ts";
import { dateOf } from "./remit-people.ts";
import type { Currency, LedgerState, Line } from "./types.ts";

export type PriceOcc = { on: string; minor: number; concept: string };

export type PriceChange = {
  /** Identidad del grupo (serie o concepto) + la fecha del cambio. */
  id: string;
  groupId: string;
  cls: "fixed" | "product";
  name: string;
  storeId: string;
  currency: Currency;
  from: PriceOcc;
  to: PriceOcc;
  /** Firmado, en la moneda del grupo. */
  deltaMinor: number;
  /** Solo productos: el salto en puntos básicos (500 = 5%). */
  deltaBp: number | null;
  /** Fijos: el efecto al mes del cambio (delta × ritmo), sin firmar. */
  monthlyMinor: number;
  /** La llave de orden: el impacto, en la moneda de vista, sin firmar. */
  impact: number;
  /** La escalera del grupo para la gráfica: el ancla previa a la
   * ventana y cada aparición dentro de ella. */
  series: PriceOcc[];
};

function norm(value: string): string {
  return value.normalize("NFC").toLowerCase().trim().replace(/\s+/g, " ");
}

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthDiff(a: string, b: string): number {
  return (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(5, 7)) - Number(a.slice(5, 7)));
}

/** La fecha de hace 12 meses (F-V2): el mismo día del año anterior,
 * con el día ajustado si el mes destino es más corto. */
export function windowStart(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = Number(today.slice(8, 10));
  const last = new Date(y - 1, m, 0, 12).getDate();
  return `${y - 1}-${pad(m)}-${pad(Math.min(d, last))}`;
}

/** Apariciones por mes de un grupo: la cadencia escrita manda; si no,
 * se deriva del ritmo real de las apariciones. */
function perMonth(occs: PriceOcc[], cadence: string): number {
  const m = /^(\d+)([dwmy])$/.exec(cadence || "");
  if (m) {
    const n = Math.max(1, Number(m[1]));
    if (m[2] === "d") return 30 / n;
    if (m[2] === "w") return 4.3333 / n;
    if (m[2] === "m") return 1 / n;
    return 1 / (12 * n);
  }
  if (occs.length < 2) return 1;
  const span = Math.max(1, monthDiff(occs[0]!.on, occs[occs.length - 1]!.on) + 1);
  return occs.length / span;
}

type Group = {
  id: string;
  cls: "fixed" | "product";
  name: string;
  storeId: string;
  currency: Currency;
  cadence: string;
  occs: PriceOcc[];
};

function groups(state: LedgerState): Group[] {
  const fixed = new Map<string, { lines: { line: Line; on: string }[] }>();
  const products = new Map<string, { lines: { line: Line; on: string }[] }>();
  for (const [mk, bucket] of Object.entries(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active || l.rest || l.xfer) continue;
      if (!(l.amountMinor > 0)) continue;
      const on = dateOf(l, mk);
      if (l.kind === "purchase") {
        const id = `p:${norm(l.concept)}|${l.storeId}`;
        const g = products.get(id) ?? { lines: [] };
        g.lines.push({ line: l, on });
        products.set(id, g);
        continue;
      }
      // La misma criba que el saldo proyectado: ni préstamos, tarjetas o
      // encargos (tienen su propio reloj), ni fotos de saldo, ni bolsas.
      if (l.loanId || l.cardId || l.lentId) continue;
      if (typeof l.balanceMinor === "number" && Number.isFinite(l.balanceMinor)) continue;
      if (roleOf(state, l.categoryId) === "savings") continue;
      if (l.kind.startsWith("income")) continue;
      const id = l.seriesId ? `s:${l.seriesId}` : `c:${norm(l.concept)}|${l.categoryId}|${l.subId}`;
      const g = fixed.get(id) ?? { lines: [] };
      g.lines.push({ line: l, on });
      fixed.set(id, g);
    }
  }
  const out: Group[] = [];
  for (const [id, g] of fixed) {
    const sorted = [...g.lines].sort((a, b) => a.on.localeCompare(b.on));
    const latest = sorted[sorted.length - 1]!.line;
    const monthsHit = new Set(sorted.map((o) => o.on.slice(0, 7))).size;
    const marked = latest.kind === "expense-fixed" || latest.kind === "subscription" || latest.recurring === true || monthsHit >= 2;
    if (!marked) continue;
    out.push({
      id, cls: "fixed", name: latest.concept, storeId: "",
      currency: latest.currency, cadence: latest.cadence || "",
      occs: sorted.map((o) => ({ on: o.on, minor: o.line.amountMinor, concept: o.line.concept })),
    });
  }
  for (const [id, g] of products) {
    const sorted = [...g.lines].sort((a, b) => a.on.localeCompare(b.on));
    const latest = sorted[sorted.length - 1]!.line;
    out.push({
      id, cls: "product", name: latest.concept, storeId: latest.storeId,
      currency: latest.currency, cadence: "",
      occs: sorted.map((o) => ({ on: o.on, minor: o.line.amountMinor, concept: o.line.concept })),
    });
  }
  return out;
}

/** Todos los cambios de un grupo, del más viejo al más nuevo. */
function changesOf(state: LedgerState, g: Group, start: string): PriceChange[] {
  const display = state.settings.display ?? "NIO";
  const rate = state.settings.rateE4 ?? 0;
  const rhythm = g.cls === "fixed" ? perMonth(g.occs, g.cadence) : 1;
  // La escalera de la gráfica: el ancla (la última aparición antes de la
  // ventana) y todas las apariciones dentro de la ventana.
  const anchor = [...g.occs].filter((o) => o.on < start).pop();
  const series = [...(anchor ? [anchor] : []), ...g.occs.filter((o) => o.on >= start)];
  const out: PriceChange[] = [];
  for (let i = 1; i < g.occs.length; i++) {
    const from = g.occs[i - 1]!;
    const to = g.occs[i]!;
    if (from.minor === to.minor) continue;
    const deltaMinor = to.minor - from.minor;
    const deltaBp = g.cls === "product" ? Math.round((deltaMinor * 10000) / from.minor) : null;
    if (deltaBp !== null && Math.abs(deltaBp) < 500) continue; // F-V1: el temblor normal no entra
    const monthlyMinor = g.cls === "fixed" ? Math.abs(deltaMinor) * rhythm : Math.abs(deltaMinor);
    out.push({
      id: `${g.id}@${to.on}`, groupId: g.id, cls: g.cls, name: to.concept || g.name,
      storeId: g.storeId, currency: g.currency, from, to, deltaMinor, deltaBp,
      monthlyMinor,
      impact: Math.abs(convertMinor(Math.round(monthlyMinor), g.currency, display, rate)),
      series,
    });
  }
  return out;
}

function allChanges(state: LedgerState, today: string): PriceChange[] {
  const start = windowStart(today);
  const out: PriceChange[] = [];
  for (const g of groups(state)) {
    for (const c of changesOf(state, g, start)) {
      if (c.to.on > today) continue; // lo fechado en el futuro aún no pasó
      out.push(c);
    }
  }
  return out;
}

/** V2 — El aviso del Asesor: los cambios de FIJOS cuya aparición nueva
 * cae en el mes en curso (F-V3: de productos no se avisa). Una vez por
 * cambio por construcción: el mes que viene, el cambio ya no es del mes
 * en curso y el monto nuevo es el patrón. Por impacto, mayores primero. */
export function currentFixedChanges(state: LedgerState, today: string): PriceChange[] {
  const key = today.slice(0, 7);
  return allChanges(state, today)
    .filter((c) => c.cls === "fixed" && c.to.on.slice(0, 7) === key)
    .sort((a, b) => b.impact - a.impact);
}

/** V3 — El espacio de Estudio: fijos (todo cambio) y productos (≥5%) de
 * los últimos 12 meses (F-V2), ordenados por impacto. La lista se corta
 * en `limit` y declara cuántos quedaron fuera (cerca 4). */
export function priceWatch(state: LedgerState, today: string, limit = 10): { rows: PriceChange[]; hidden: number; total: number } {
  const start = windowStart(today);
  const rows = allChanges(state, today)
    .filter((c) => c.to.on >= start)
    .sort((a, b) => b.impact - a.impact || b.to.on.localeCompare(a.to.on));
  return { rows: rows.slice(0, limit), hidden: Math.max(0, rows.length - limit), total: rows.length };
}

export function hasPriceWatch(state: LedgerState, today: string): boolean {
  return priceWatch(state, today, 1).total > 0;
}
