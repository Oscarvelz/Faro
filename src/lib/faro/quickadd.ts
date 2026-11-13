/**
 * Apuntes rápidos desde el widget (línea de ventanas, 2026-11-12): los botones + / − del widget ya no
 * abren la app — levantan la tarjeta rápida del propio shell (QuickAddActivity), donde el usuario
 * escribe el monto sin abrir Faro. El apunte queda en la cola del shell (SharedPreferences) y la app
 * lo recoge con FaroNative.takeQuickEntries() la próxima vez que está abierta y desbloqueada,
 * archivándolo en el libro por el camino normal (commit + upsertLine, con Deshacer y sincronía).
 *
 * El contrato que hace seguro el traspaso:
 * - El id del apunte ES el id de la línea (y su seriesId): recoger dos veces el mismo apunte
 *   actualiza la misma línea — nunca duplica.
 * - La línea cae en el mes del DÍA DEL APUNTE (su monthKey sale de `day`, no de hoy): recoger
 *   tarde no mueve el dinero de mes.
 * - La moneda es la que el widget mostraba al anotar (la moneda de vista de la foto, `cur`).
 * - Sin categoría a propósito: kind manda en los totales (income-variable / expense-variable) y
 *   Estudio agrupa las líneas sin categoría por kind; el concepto dice «Apunte rápido» y la nota
 *   «Widget», para que el usuario la reconozca y la reclasifique si quiere.
 * - Con casa (la tarjeta ofrece las suyas desde 2026-11-12): la foto lleva las casas que ya
 *   reciben cada signo (quickHomes) y el apunte guarda los ids elegidos; al recoger, la casa se
 *   resuelve contra la Estructura viva y el kind sale de su grupo — si la casa ya no existe, el
 *   apunte cae sin categoría, jamás en un lugar equivocado ni se pierde.
 */
import { upsertLine } from "./reducer";
import { makeNamer } from "./defaults";
import type { Currency, Lang, LedgerState, Line, LineKind } from "./types";

export type QuickEntry = {
  id: string;
  sign: "in" | "out";
  /** Monto en unidades menores (centavos) de `cur`, entero > 0. */
  minor: number;
  cur: Currency;
  /** Día local del apunte, YYYY-MM-DD. */
  day: string;
  /** La casa elegida en la tarjeta (categoría/sub de Estructura); "" = apunte sin categoría. */
  cat?: string;
  sub?: string;
};

/** Una casa elegible en la tarjeta: ids de Estructura + el nombre a mostrar («Casa · Renta»,
 *  o solo la categoría — «Salario» — cuando la casa es la categoría misma, con s = ""). */
export type QuickHome = { c: string; s: string; n: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Techo sano: $999,999,999.99 — el shell ya lo impone; aquí se repite porque la cola no es de fiar. */
export const QUICK_MAX_MINOR = 99_999_999_999;

/** Lo que el shell entrega (un JSON array como texto); cualquier pieza mala se descarta, nunca rompe. */
export function parseQuickEntries(raw: string): QuickEntry[] {
  if (!raw) return [];
  let arr: unknown;
  try { arr = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: QuickEntry[] = [];
  for (const x of arr) {
    if (!x || typeof x !== "object") continue;
    const e = x as Record<string, unknown>;
    const minor = typeof e.minor === "number" ? Math.round(e.minor) : NaN;
    if (typeof e.id !== "string" || e.id.length < 8) continue;
    if (e.sign !== "in" && e.sign !== "out") continue;
    if (!Number.isFinite(minor) || minor <= 0 || minor > QUICK_MAX_MINOR) continue;
    if (e.cur !== "NIO" && e.cur !== "USD") continue;
    if (typeof e.day !== "string" || !DAY.test(e.day)) continue;
    // Una casa mal formada no mata el apunte: se degrada a «sin categoría» y la
    // resolución contra la Estructura viva (ingestQuick) vuelve a validar.
    const cat = typeof e.cat === "string" && e.cat.length <= 64 ? e.cat : "";
    const sub = typeof e.sub === "string" && e.sub.length <= 64 ? e.sub : "";
    out.push({ id: e.id, sign: e.sign, minor, cur: e.cur, day: e.day, cat, sub });
  }
  return out;
}

/**
 * Las casas que la tarjeta ofrece para cada signo: los destinos que YA reciben ese signo,
 * contados en los últimos 3 meses (la costumbre manda), en orden de uso y luego de Estructura.
 * Una casa es una subcategoría («Casa · Renta») O la categoría misma cuando el hábito cae a
 * nivel de categoría, sin sub (s = ""): archivar ahí es archivar en la categoría sin sub, el
 * mismo destino que la resolución ya conocía. Hasta 1.3.240 solo se contaban las líneas CON
 * sub — un libro cuyo ingreso cae sin categoría o a nivel de categoría (el de Oscar: su
 * ENTRÓ vive en «Ingresos variables» sin subs) devolvía la lista VACÍA y la tarjeta ni
 * siquiera dibujaba la pregunta. Las líneas sin categoría no forman casa (no hay carpeta que
 * nombrar): las cubre el «Sin categoría» que la tarjeta siempre ofrece. Solo uso real: una
 * casa que nunca recibió un ingreso no se ofrece para ingresos — ofrecerla invitaría a
 * archivar mal. Fuera: categorías ocultas, subs ocultas y las de Ahorros (su dinero es stock
 * con series propias; un apunte genérico ahí corrompería la cifra). Tope 10 por signo.
 */
export function quickHomes(state: LedgerState, key: string, lang: Lang): { inn: QuickHome[]; out: QuickHome[] } {
  const names = makeNamer(state.structure, lang);
  const counts = new Map<string, number>();
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7));
  for (let back = 0; back < 3; back++) {
    const mm = ((m - 1 - back) % 12 + 12) % 12 + 1;
    const yy = y + Math.floor((m - 1 - back) / 12);
    const k = `${yy}-${String(mm).padStart(2, "0")}`;
    for (const l of state.months[k]?.lines ?? []) {
      if (!l.categoryId || l.xfer || l.rest) continue;
      const sign = l.kind.startsWith("income") ? "in" : l.kind.startsWith("expense") ? "out" : null;
      if (!sign) continue;
      const id = `${sign}|${l.categoryId}|${l.subId}`;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const build = (sign: "in" | "out"): QuickHome[] => {
    const homes: (QuickHome & { n0: number; o0: number })[] = [];
    for (const c of state.structure.categories) {
      if (c.hidden || c.role === "savings") continue;
      const nCat = counts.get(`${sign}|${c.id}|`) ?? 0;
      if (nCat > 0) homes.push({ c: c.id, s: "", n: names.cat(c.id), n0: nCat, o0: c.order * 1000 });
      for (const s of c.subs) {
        if (s.hidden) continue;
        const n0 = counts.get(`${sign}|${c.id}|${s.id}`) ?? 0;
        if (n0 <= 0) continue;
        homes.push({ c: c.id, s: s.id, n: `${names.cat(c.id)} · ${names.sub(s.id)}`, n0, o0: c.order * 1000 + s.order + 1 });
      }
    }
    return homes.sort((a, b) => b.n0 - a.n0 || a.o0 - b.o0).slice(0, 10).map(({ c, s, n }) => ({ c, s, n }));
  };
  return { inn: build("in"), out: build("out") };
}

/**
 * La casa del apunte, resuelta contra la Estructura VIVA al recoger (pudo cambiar desde la
 * foto): categoría borrada o de Ahorros → el apunte cae sin categoría, como siempre; sub
 * borrada → se archiva en su categoría sin sub (el patrón de relocate); el kind sale del
 * grupo de la categoría elegida (fijo/variable) y del signo — nunca de la cola.
 */
function resolveHome(state: LedgerState, e: QuickEntry): { categoryId: string; subId: string; kind: LineKind } {
  const fallback: { categoryId: string; subId: string; kind: LineKind } = {
    categoryId: "", subId: "", kind: e.sign === "in" ? "income-variable" : "expense-variable",
  };
  if (!e.cat) return fallback;
  const cat = state.structure.categories.find((c) => c.id === e.cat);
  if (!cat || cat.role === "savings") return fallback;
  return {
    categoryId: cat.id,
    subId: e.sub && cat.subs.some((s) => s.id === e.sub) ? e.sub : "",
    kind: `${e.sign === "in" ? "income" : "expense"}-${cat.group}` as LineKind,
  };
}

/** El apunte como línea del libro. Pura: la misma entrada (y la misma casa resuelta) siempre
 *  produce la misma línea. Sin casa resuelta, la forma original: variable y sin categoría. */
export function quickLine(e: QuickEntry, lang: Lang, home?: { categoryId: string; subId: string; kind: LineKind }): Line {
  return {
    id: e.id,
    seriesId: e.id,
    monthKey: e.day.slice(0, 7),
    kind: home?.kind ?? (e.sign === "in" ? "income-variable" : "expense-variable"),
    concept: lang === "en" ? "Quick entry" : "Apunte rápido",
    amountMinor: e.minor,
    currency: e.cur,
    active: true,
    note: "Widget",
    categoryId: home?.categoryId ?? "",
    subId: home?.subId ?? "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: e.cur,
    icon: "",
    history: [],
    bookedOn: e.day,
  };
}

/** Archiva los apuntes en el libro (idempotente por id). El estado no se muta: pasa por upsertLine. */
export function ingestQuick(state: LedgerState, entries: QuickEntry[], lang: Lang): LedgerState {
  let s = state;
  for (const e of entries) s = upsertLine(s, quickLine(e, lang, resolveHome(s, e)));
  return s;
}
