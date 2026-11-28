import { isSpendLine, monthLines, roleOf } from "./engine";
import { convertMinor } from "./money";
import type { Category, Currency, LedgerState } from "./types";

/**
 * EL PRESUPUESTO (1.3.522, diseño aprobado por Oscar el 2026-11-27) —
 * LA ÚNICA CUENTA del tope: el gasto del mes en curso en la categoría
 * contra el tope que el usuario fijó en ella (Category.capMinor en su
 * capCurrency). Alimenta las tres superficies — la tarjeta de Central,
 * el pliegue de Estudio y el Asesor — para que las tres digan la misma
 * cifra. El criterio del gasto es el de la casa (isSpendLine: las
 * clases de salida, nunca el rol de ahorro; las subcategorías suman a
 * su categoría; inactivo, en descanso o transferencia no cuenta).
 *
 * MONEDAS MEZCLADAS (añadido de Oscar): el gasto en la moneda del tope
 * cuenta directo; el gasto en la otra moneda se convierte con la tasa
 * anotada en el libro (settings.rateE4) y la cuenta lo DECLARA
 * (convertedFrom). Sin tasa válida, esa parte NO se convierte ni se
 * inventa: queda en uncounted, por moneda, para que cada superficie
 * la declare. Sin arrastre: solo cuenta el mes pedido.
 */
export type BudgetFigure = {
  cat: Category;
  capMinor: number;
  capCurrency: Currency;
  /** El gasto del mes, ya en la moneda del tope. */
  spentMinor: number;
  leftMinor: number;
  overMinor: number;
  over: boolean;
  /** True si alguna línea se convirtió con la tasa del libro. */
  converted: boolean;
  /** La tasa usada (córdobas por dólar), cuando hubo conversión. */
  rateE4: number;
  /** Lo que no se pudo contar por falta de tasa, por moneda. */
  uncounted: { currency: Currency; minor: number; count: number }[];
};

export function budgetOf(state: LedgerState, cat: Category, key: string): BudgetFigure | null {
  const cap = cat.capMinor;
  if (cap === undefined || !Number.isFinite(cap) || cap <= 0) return null;
  const capCurrency = (cat.capCurrency === "NIO" ? "NIO" : "USD") as Currency;
  const rateE4 = state.settings.rateE4;
  const rateOk = Number.isFinite(rateE4) && rateE4 > 0;
  const subIds = new Set(cat.subs.map((s) => s.id));
  let spent = 0;
  let converted = false;
  const uncountedMap = new Map<Currency, { minor: number; count: number }>();
  for (const l of monthLines(state, key)) {
    if (!l.active || l.rest || l.xfer) continue;
    if (!isSpendLine(state.structure, l)) continue;
    if (l.categoryId !== cat.id && !(l.subId && subIds.has(l.subId))) continue;
    if (roleOf(state.structure, l.categoryId) === "savings") continue;
    if (l.currency === capCurrency) { spent += l.amountMinor; continue; }
    if (rateOk) { spent += convertMinor(l.amountMinor, l.currency, capCurrency, rateE4); converted = true; continue; }
    const u = uncountedMap.get(l.currency) ?? { minor: 0, count: 0 };
    u.minor += l.amountMinor; u.count += 1;
    uncountedMap.set(l.currency, u);
  }
  const left = cap - spent;
  return {
    cat,
    capMinor: cap,
    capCurrency,
    spentMinor: spent,
    leftMinor: Math.max(0, left),
    overMinor: Math.max(0, -left),
    over: left < 0,
    converted,
    rateE4,
    uncounted: [...uncountedMap.entries()].map(([currency, u]) => ({ currency, minor: u.minor, count: u.count })),
  };
}

/** Todas las categorías con tope, PEOR PRIMERO: las pasadas por su
 * monto, luego por la fracción del tope usada. Sin topes, la lista
 * nace vacía y ninguna superficie nace. */
export function budgetFigures(state: LedgerState, key: string): BudgetFigure[] {
  const rows: BudgetFigure[] = [];
  for (const cat of state.structure.categories) {
    const f = budgetOf(state, cat, key);
    if (f) rows.push(f);
  }
  rows.sort((a, b) => (b.overMinor - a.overMinor) || ((b.spentMinor / b.capMinor) - (a.spentMinor / a.capMinor)));
  return rows;
}
