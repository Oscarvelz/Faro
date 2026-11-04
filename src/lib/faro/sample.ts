import type { LedgerState, Line, LineKind } from "./types";

const MONTH = "2026-08";

function line(
  id: string,
  kind: LineKind,
  concept: string,
  major: number,
  categoryId: string,
  subId: string,
  recurring: boolean,
): Line {
  return {
    id: `demo-ago-${id}`,
    seriesId: `demo-ago-${id}`,
    monthKey: MONTH,
    kind,
    concept,
    amountMinor: Math.round(major * 100),
    currency: "NIO",
    active: true,
    note: "Muestra",
    categoryId,
    subId,
    recurring,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    icon: "",
    history: [],
  };
}

/** August presupuesto, non-zero lines only. Temporary sample. */
export function augustSampleLines(): Line[] {
  return [
    line("salario", "income-fixed", "Salario 1", 10500, "", "", true),
    line("tabletas", "income-fixed", "Depósito tabletas", 1500, "", "", true),
    line("honorarios", "income-fixed", "Honorarios", 8891, "", "", true),
    line("negocio", "income-variable", "Negocio propio", 14585, "", "", false),
    line("bono", "income-variable", "Bono o pagos", 500, "", "", false),
    line("otro", "income-variable", "Otro", 2205, "", "", false),
    line("youtube", "expense-fixed", "Youtube", 185, "f-casa", "f.casa.youtube", true),
    line("celular", "expense-fixed", "Plan o recarga celular", 400, "f-casa", "f.casa.celular", true),
    line("internet", "expense-fixed", "Internet", 500, "f-casa", "f.casa.internet", true),
    line("gasolina", "expense-fixed", "Gasolina auto/moto", 1500, "f-transporte", "f.transporte.gasolina", true),
    line("funeraria", "expense-fixed", "Funeraria", 380, "f-familia", "f.familia.funeraria", true),
    line("despensa", "expense-fixed", "Despensa y mercado", 3500, "f-alimentos", "f.alimentos.despensa", true),
    line("tarjetas", "expense-fixed", "Tarjetas (tablets)", 1299, "f-creditos", "f.creditos.tarjetas", true),
    line("mejora", "expense-variable", "Mejora del hogar", 8800, "v-casa", "v.casa.mejora", false),
    line("xuper", "expense-variable", "XUPER TV", 10596, "v-entretenimiento", "v.entretenimiento.xuper", false),
  ];
}

export function withAugustSample(ledger: LedgerState): { ledger: LedgerState; added: boolean } {
  const bucket = ledger.months[MONTH]?.lines ?? [];
  if (bucket.some((item) => item.id.startsWith("demo-ago-"))) return { ledger, added: false };
  const now = new Date().toISOString();
  return {
    added: true,
    ledger: {
      ...ledger,
      months: { ...ledger.months, [MONTH]: { lines: [...bucket, ...augustSampleLines()] } },
      revision: ledger.revision + 1,
      updatedAt: now,
      audit: [{ id: `demo-ago-${Date.now()}`, at: now, detail: "Muestra de agosto" }, ...ledger.audit].slice(0, 40),
    },
  };
}

const isDemo = (l: Line) => l.id.startsWith("demo-ago-");

/** True only when every line in the books is an August sample line still exactly as seeded
 * (no other line anywhere, nothing edited). Anything else is the user's and is kept. */
export function isPureSample(ledger: LedgerState): boolean {
  const all = Object.values(ledger.months).flatMap((m) => m?.lines ?? []);
  if (!all.length || !all.every(isDemo)) return false;
  const tpl = new Map(augustSampleLines().map((l) => [l.id, l]));
  return all.every((l) => {
    const t = tpl.get(l.id);
    return !!t && l.monthKey === t.monthKey && l.kind === t.kind && l.concept === t.concept && l.amountMinor === t.amountMinor
      && l.currency === t.currency && l.active === t.active && l.note === t.note && l.categoryId === t.categoryId
      && l.subId === t.subId && l.recurring === t.recurring && (l.history?.length ?? 0) === 0 && (l.balanceMinor ?? null) === null;
  }) && new Set(all.map((l) => l.id)).size === all.length;
}

export function countSampleRows(ledger: LedgerState): number {
  return Object.values(ledger.months).reduce((n, m) => n + (m?.lines ?? []).filter(isDemo).length, 0);
}

/** Remove the August sample lines (demo-ago-*) and nothing else. */
export function stripSample(ledger: LedgerState): LedgerState {
  const months: LedgerState["months"] = {};
  for (const [k, m] of Object.entries(ledger.months)) months[k] = { ...m, lines: (m?.lines ?? []).filter((l) => !isDemo(l)) };
  return { ...ledger, months };
}
