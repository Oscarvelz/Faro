/**
 * stage-seeds — las semillas del escenario de las presentaciones.
 *
 * Cada módulo corre sobre la app vacía y construye SOLO lo que su lección necesita
 * (ley del escenario construido). Una semilla es una receta pura sobre el libro de
 * escenario (`faro.stage:`): jamás toca el libro real — el conductor solo corre
 * dentro del escenario sellado, y el libro de escenario se borra entero al salir.
 * Cifras redondas de enseñanza: la aritmética se ve de un vistazo.
 */
import type { LedgerState, Line } from "./types.ts";
import { addLent } from "./debts.ts";
import { hidePeriod } from "./descanso.ts";
import { addLoan, todayIso } from "./loans.ts";
import { addReading, cardsOf, putCard } from "./cards.ts";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const line = (p: Partial<Line> & Pick<Line, "id" | "kind" | "amountMinor" | "monthKey">): Line => ({
  seriesId: p.id, concept: p.id, currency: "NIO", active: true, note: "", categoryId: "", subId: "",
  recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
  nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO", icon: "", history: [], ...p,
});

/** Idempotente: siembra sin duplicar si la escena se repite. */
function sow(s: LedgerState, key: string, fresh: Line[]): LedgerState {
  const have = new Set((s.months[key]?.lines ?? []).map((l) => l.id));
  const add = fresh.filter((l) => !have.has(l.id));
  if (!add.length) return s;
  return { ...s, months: { ...s.months, [key]: { lines: [...(s.months[key]?.lines ?? []), ...add] } } };
}

export const STAGE_SEEDS: Record<string, (s: LedgerState) => LedgerState> = {
  /** El mes vivo del capítulo del widget: salario, renta, súper y una cuota que vence en 5 días. */
  "widget-mes": (s) => {
    const today = todayIso();
    const key = today.slice(0, 7);
    return sow(s, key, [
      line({ id: "seed-w-salario", kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000, monthKey: key }),
      line({ id: "seed-w-renta", kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: key }),
      line({ id: "seed-w-super", kind: "expense-variable", concept: "Súper", amountMinor: 250_000, categoryId: "v-casa", monthKey: key }),
      line({ id: "seed-w-cuota", kind: "expense-fixed", concept: "Cuota de la refrigeradora", amountMinor: 150_000, categoryId: "f-casa", nextDue: addDays(today, 5), monthKey: key }),
    ]);
  },
  /** El mes del módulo 3: dos burbujas en Fijos para que la nube tenga peso.
   *  Traen cadencia y fecha de inicio: sin ellas el informe del bote no existe. */
  "anotar-mes": (s) => {
    const today = todayIso();
    const key = today.slice(0, 7);
    return sow(s, key, [
      line({ id: "seed-a-renta", kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa", subId: "f.casa.renta", recurring: true, cadence: "monthly", startedOn: addDays(today, -60), monthKey: key }),
      line({ id: "seed-a-internet", kind: "expense-fixed", concept: "Internet", amountMinor: 120_000, categoryId: "f-casa", recurring: true, cadence: "monthly", startedOn: addDays(today, -30), monthKey: key }),
    ]);
  },
  /** La balanza del módulo 3: Ana debe C$5,000; se deben C$20,000 al Banco; una tarjeta con saldo. */
  "anotar-deudas": (s) => {
    const today = todayIso();
    let next = s;
    if (!(next.lent ?? []).some((l) => l.id === "seed-a-ana")) {
      next = addLent(next, { id: "seed-a-ana", person: "Ana", kind: "plain", amountMinor: 500_000, currency: "NIO", aprBps: 0, startedOn: today, dueOn: "", note: "" });
    }
    if (!(next.loans ?? []).some((l) => l.id === "seed-a-banco")) {
      next = addLoan(next, { id: "seed-a-banco", lender: "Banco", who: "entity", kind: "plain", amountMinor: 2_000_000, currency: "NIO", aprBps: 0, takenOn: today, book: "fixed", note: "" });
    }
    const card = cardsOf(next).find((c) => c.id === "card-paypal");
    if (card && !card.last4) {
      next = putCard(next, { ...card, last4: "4242" });
      next = addReading(next, card.id, { balanceMinor: 420_000, availMinor: null, minMinor: 35_000, dueOn: addDays(today, 9), src: "shot", on: today }, today);
    }
    return next;
  },
  /** El mes del módulo 6: el mes vivo más dos bolsillos con plata — Meta C$6,000
   *  apartados de a C$2,000, y Emergencia C$3,000. El saldo vive en balanceMinor,
   *  que es lo que la banda suma. */
  "ahorros-mes": (s) => {
    const base = STAGE_SEEDS["widget-mes"](s);
    const today = todayIso();
    const key = today.slice(0, 7);
    // Una cuenta bancaria de la bóveda: sub con icono vault + su saldo como línea.
    let st = base;
    const cat = st.structure.categories.find((c) => c.id === "f-ahorro");
    if (cat && !cat.subs.some((x) => x.id === "f.ahorro.banco")) {
      st = { ...st, structure: { ...st.structure, categories: st.structure.categories.map((c) => (c.id === "f-ahorro" ? { ...c, subs: [...c.subs, { id: "f.ahorro.banco", nameKey: "", customName: "Banco", icon: "vault", hidden: false, order: 9 }] } : c)) } };
    }
    return sow(st, key, [
      line({ id: "seed-s-meta", kind: "expense-fixed", concept: "Apartado para la meta", amountMinor: 200_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", recurring: true, cadence: "monthly", startedOn: addDays(today, -90), balanceMinor: 600_000, monthKey: key }),
      line({ id: "seed-s-emergencia", kind: "expense-fixed", concept: "Fondo de emergencia", amountMinor: 300_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 300_000, monthKey: key }),
      line({ id: "seed-s-banco", kind: "expense-fixed", concept: "Saldo del Banco", amountMinor: 1_200_000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 1_200_000, monthKey: key }),
    ]);
  },
  /** Tres meses de historia para Estudio: el mes vivo con bolsillos, y dos meses
   *  pasados con la misma renta y mercados distintos — las tarjetas tienen qué leer. */
  "estudio-meses": (s) => {
    let st = STAGE_SEEDS["ahorros-mes"](s);
    const today = todayIso();
    const back = (n: number) => { const d = new Date(`${today}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 7); };
    const k1 = back(1);
    const k2 = back(2);
    st = sow(st, k1, [
      line({ id: "seed-e-salario-1", kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000, monthKey: k1 }),
      line({ id: "seed-e-renta-1", kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: k1 }),
      line({ id: "seed-e-mercado-1", kind: "expense-variable", concept: "Mercado", amountMinor: 220_000, categoryId: "v-casa", monthKey: k1 }),
    ]);
    st = sow(st, k2, [
      line({ id: "seed-e-salario-2", kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000, monthKey: k2 }),
      line({ id: "seed-e-renta-2", kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: k2 }),
      line({ id: "seed-e-mercado-2", kind: "expense-variable", concept: "Mercado", amountMinor: 150_000, categoryId: "v-casa", monthKey: k2 }),
    ]);
    return st;
  },
  /** El escenario del módulo 9: la historia de Estudio, con el mes más viejo
   *  apartado por la maquinaria propia del descanso — el Archivo nace con un
   *  período dentro y el río sin él. */
  "folios-mes": (s) => {
    const st = STAGE_SEEDS["estudio-meses"](s);
    const today = todayIso();
    const d = new Date(`${today}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - 2);
    const k2 = d.toISOString().slice(0, 7);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    return hidePeriod(st, `${k2}-01`, last, "Mes apartado").state;
  },
  /** El mes del módulo 8: la historia de Estudio más la tarjeta con saldo de
   *  Anotar — sin tarjeta viva, el bloque de tarjetas del Asesor ni siquiera nace. */
  "asesor-meses": (s) => STAGE_SEEDS["anotar-deudas"](STAGE_SEEDS["estudio-meses"](s)),
};
