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

  /** Módulo «La pregunta», capítulo de nacer: el mes vivo y UNA cuenta con
   *  C$20,000 — ningún fondo todavía. La cuenta la siembra sowBanco con ids
   *  estables: toda semilla del modelo que la necesite siembra LA MISMA línea. */
  "modelo-nacer": (s) => sowBanco(STAGE_SEEDS["widget-mes"](s)),

  /** Capítulo de declarar: la misma cuenta, más dos fondos que esperan con la
   *  luz gris — «Regalo» C$2,000 en Emergencia y «Moto» C$25,000 en Meta. Moto
   *  supera el libre en cualquier camino (C$20,000 recién aterrizado; C$15,000
   *  si Viaje ya monta sobre el Banco): la guardia tiene qué decir. */
  "modelo-declarar": (s) => {
    const st = sowBanco(STAGE_SEEDS["widget-mes"](s));
    const key = todayIso().slice(0, 7);
    return sow(st, key, [
      line({ id: "seed-m-regalo", kind: "expense-fixed", concept: "Regalo", amountMinor: 50_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 200_000, monthKey: key }),
      line({ id: "seed-m-moto", kind: "expense-fixed", concept: "Moto", amountMinor: 500_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 2_500_000, monthKey: key }),
    ]);
  },

  /** Capítulo del encuentro: una segunda cuenta, «Cooperativa», que existe pero
   *  no tiene un córdoba (ninguna línea: su primer saldo es el que la despierta),
   *  y «Terreno» C$3,000 esperando sin declarar en Meta. La Cooperativa lleva
   *  orden 9 — antes que el Banco (10) — para ser la primera fila del panel. */
  "modelo-encuentro": (s) => {
    let st = STAGE_SEEDS["widget-mes"](s);
    const cat = st.structure.categories.find((c) => c.id === "f-ahorro");
    if (cat && !cat.subs.some((x) => x.id === "f.ahorro.coop")) {
      st = { ...st, structure: { ...st.structure, categories: st.structure.categories.map((c) => (c.id === "f-ahorro" ? { ...c, subs: [...c.subs, { id: "f.ahorro.coop", nameKey: "", customName: "Cooperativa", icon: "vault", hidden: false, order: 9 }] } : c)) } };
    }
    st = hideFactoryVaults(st);
    // Si la corrida entra por este capítulo, Regalo y Moto nunca pasaron por la
    // lista: la semilla los deja en su estado final (aparte), para que el único
    // fondo esperando el encuentro sea Terreno — como en la corrida completa.
    const months: LedgerState["months"] = {};
    for (const [k, bucket] of Object.entries(st.months)) {
      months[k] = {
        lines: bucket.lines.map((l) => {
          const sid = l.seriesId || l.id;
          return sid === "seed-m-regalo" || sid === "seed-m-moto" ? { ...l, fund: "aparte" as const, fundHost: undefined } : l;
        }),
      };
    }
    st = { ...st, months };
    const key = todayIso().slice(0, 7);
    return sow(st, key, [
      line({ id: "seed-m-terreno", kind: "expense-fixed", concept: "Terreno", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 300_000, monthKey: key }),
    ]);
  },

  /** Módulo «Los dos totales»: la casa del modelo en cifras redondas. Banco
   *  C$20,000; Viaje del saldo C$5,000 y Emergencia del saldo C$8,000 sobre él
   *  (comprometido 13,000, libre 7,000); Casa aparte C$6,000; Regalo sin
   *  declarar C$2,000; Retiro C$10,000. Lo guardado: C$38,000. El Apartado del
   *  mes: C$6,000 = 3,000 etiquetado (las cuotas del saldo) + 3,000 movido. */
  "modelo-casa": (s) => {
    const st = sowBanco(STAGE_SEEDS["widget-mes"](s));
    const key = todayIso().slice(0, 7);
    return sow(st, key, [
      line({ id: "seed-t-viaje", kind: "expense-fixed", concept: "Viaje", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 500_000, fund: "saldo", fundHost: "f.ahorro.banco", monthKey: key }),
      line({ id: "seed-t-casa", kind: "expense-fixed", concept: "Casa", amountMinor: 150_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 600_000, fund: "aparte", monthKey: key }),
      line({ id: "seed-t-emergencia", kind: "expense-fixed", concept: "Fondo de emergencia", amountMinor: 200_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 800_000, fund: "saldo", fundHost: "f.ahorro.banco", monthKey: key }),
      line({ id: "seed-t-regalo", kind: "expense-fixed", concept: "Regalo", amountMinor: 50_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 200_000, monthKey: key }),
      line({ id: "seed-t-retiro", kind: "expense-fixed", concept: "Retiro", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.retiro", balanceMinor: 1_000_000, monthKey: key }),
    ]);
  },

  /** Módulo «El colchón»: la misma casa, pero la Emergencia vive APARTE (su
   *  propia pila) y Viaje se compone de foto + depósito — la foto (C$4,000) en
   *  el mes pasado y un depósito de C$1,000 hoy, ya con su sello: el stock lee
   *  C$5,000 y Folios tiene un movimiento de hoy que contar. Sin piso del saldo
   *  y sin sobrecompromiso: el Asesor calla lo que está cubierto. */
  "modelo-colchon": (s) => {
    const st = sowBanco(STAGE_SEEDS["widget-mes"](s));
    const today = todayIso();
    const key = today.slice(0, 7);
    const prev = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
    const withPrev = sow(st, prev, [
      line({ id: "seed-c-viaje", kind: "expense-fixed", concept: "Viaje", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 400_000, fund: "saldo", fundHost: "f.ahorro.banco", bookedOn: `${prev}-15`, monthKey: prev }),
    ]);
    return sow(withPrev, key, [
      line({ id: "seed-c-viaje-dep", seriesId: "seed-c-viaje", kind: "expense-fixed", concept: "Viaje", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", fund: "saldo", fundHost: "f.ahorro.banco", bookedOn: today, monthKey: key }),
      line({ id: "seed-c-casa", kind: "expense-fixed", concept: "Casa", amountMinor: 150_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", balanceMinor: 600_000, fund: "aparte", monthKey: key }),
      line({ id: "seed-c-emergencia", kind: "expense-fixed", concept: "Fondo de emergencia", amountMinor: 200_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 800_000, fund: "aparte", monthKey: key }),
      line({ id: "seed-c-regalo", kind: "expense-fixed", concept: "Regalo", amountMinor: 50_000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", balanceMinor: 200_000, monthKey: key }),
      line({ id: "seed-c-retiro", kind: "expense-fixed", concept: "Retiro", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.retiro", balanceMinor: 1_000_000, monthKey: key }),
    ]);
  },

  /** El eco en el Archivo: un depósito de Viaje de hace tres días, apartado
   *  con la maquinaria propia del descanso (hidePeriod registra el período:
   *  sin registro no hay tarjeta en el Archivo). Su entrada lleva la misma luz
   *  y la misma nota que en el río. No cuenta en ningún total: la caminata del
   *  ahorro salta las líneas en descanso. */
  "modelo-archivo": (s) => {
    const today = todayIso();
    const day = addDays(today, -3);
    const key = day.slice(0, 7);
    const st = sow(s, key, [
      line({ id: "seed-c-viaje-rest", seriesId: "seed-c-viaje", kind: "expense-fixed", concept: "Viaje", amountMinor: 100_000, categoryId: "f-ahorro", subId: "f.ahorro.meta", fund: "saldo", fundHost: "f.ahorro.banco", bookedOn: day, monthKey: key }),
    ]);
    return hidePeriod(st, day, day, "Depósito apartado").state;
  },

  /** Capítulo de Folios del módulo del colchón: apaga la cuota del mes vivo —
   *  su movimiento vencería en 5 días y se pondría primero en el río — para que
   *  la primera entrada sea el depósito de hoy de Viaje, con su luz y su nota. */
  "modelo-folios": (s) => {
    const months: LedgerState["months"] = {};
    for (const [k, bucket] of Object.entries(s.months)) {
      months[k] = { lines: bucket.lines.map((l) => (l.id === "seed-w-cuota" ? { ...l, active: false } : l)) };
    }
    return { ...s, months };
  },

  /** El giro del módulo del colchón: primero siembra la casa en calma y luego
   *  la mueve — la Emergencia pasa a vivir del saldo del Banco y el saldo del
   *  Banco baja a C$10,000. Comprometido 13,000, libre −3,000, piso descubierto
   *  por 3,000: las dos frases del Asesor nacen del mismo descenso. Idempotente:
   *  mapea a los mismos valores. */
  "modelo-giro": (s) => {
    const base = STAGE_SEEDS["modelo-colchon"](s);
    const months: LedgerState["months"] = {};
    for (const [k, bucket] of Object.entries(base.months)) {
      months[k] = {
        lines: bucket.lines.map((l) => {
          if ((l.seriesId || l.id) === "seed-c-emergencia") return { ...l, fund: "saldo" as const, fundHost: "f.ahorro.banco" };
          if (l.id === "seed-m-banco") return { ...l, amountMinor: 1_000_000, balanceMinor: 1_000_000 };
          return l;
        }),
      };
    }
    return { ...base, months };
  },

  /** El mes del Asesor en Esencial (módulo 17): los hechos llanos que su
   *  palabra nombra — salario, la renta que vence en 3 días, lo que Ana debe
   *  con vencimiento en 2 días (vencimientos de los dos lados), un súper
   *  grande que es lo que más pesó, y la cuota en 5 días. */
  "modos-asesor": (s) => {
    const today = todayIso();
    const key = today.slice(0, 7);
    let next = sow(s, key, [
      line({ id: "seed-ma-salario", kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000, monthKey: key }),
      line({ id: "seed-ma-renta", kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa", subId: "f.casa.renta", nextDue: addDays(today, 3), monthKey: key }),
      line({ id: "seed-ma-super", kind: "expense-variable", concept: "Súper", amountMinor: 600_000, categoryId: "v-casa", monthKey: key }),
      line({ id: "seed-ma-cuota", kind: "expense-fixed", concept: "Cuota de la refrigeradora", amountMinor: 150_000, categoryId: "f-casa", nextDue: addDays(today, 5), monthKey: key }),
    ]);
    if (!(next.lent ?? []).some((l) => l.id === "seed-ma-ana")) {
      next = addLent(next, { id: "seed-ma-ana", person: "Ana", kind: "plain", amountMinor: 500_000, currency: "NIO", aprBps: 0, startedOn: today, dueOn: addDays(today, 2), note: "" });
    }
    return next;
  },

  /** Los hechos de deuda del módulo 19: la balanza de Anotar (Ana, el Banco,
   *  la tarjeta) con los dos hechos fechados que Esencial lee — Ana gana un
   *  próximo vencimiento (+10 días) y Luis ya venció (ayer). */
  "modos-hechos": (s) => {
    const today = todayIso();
    let next = STAGE_SEEDS["anotar-deudas"](s);
    next = { ...next, lent: (next.lent ?? []).map((l) => (l.id === "seed-a-ana" ? { ...l, dueOn: addDays(today, 10) } : l)) };
    if (!(next.lent ?? []).some((l) => l.id === "seed-mh-luis")) {
      next = addLent(next, { id: "seed-mh-luis", person: "Luis", kind: "plain", amountMinor: 300_000, currency: "NIO", aprBps: 0, startedOn: addDays(today, -30), dueOn: addDays(today, -1), note: "" });
    }
    // Sin lectura de tarjeta a propósito: el grupo enmarcado lee las tarjetas
    // de la estructura, no el campo superior donde addReading escribe — una
    // lectura sembrada ahí no se vería (verificado en banco, 2026-11-15). La
    // escena de la tarjeta enseña la forma del hecho, sin cifra sembrada.
    return next;
  },
};

/** Las cuentas de fábrica (PayPal, Chase, Lafise… con su icono de bóveda)
 *  quedan fuera del escenario del modelo: la casa de la lección tiene solo las
 *  cuentas que la lección planta. Sin esto, la pregunta del anfitrión vería
 *  siete «cuentas» y el fondo no se ataría solo a la única con dinero — y el
 *  panel de cuentas abriría con filas ajenas a la historia. */
function hideFactoryVaults(s: LedgerState): LedgerState {
  const keep = new Set(["f.ahorro.banco", "f.ahorro.coop"]);
  return {
    ...s,
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => (c.role !== "savings" ? c : {
        ...c,
        subs: c.subs.map((sub) => (keep.has(sub.id) || !(sub.icon === "vault" || sub.icon.startsWith("vault:")) ? sub : { ...sub, hidden: true })),
      })),
    },
  };
}

/** La cuenta anfitriona de los módulos del modelo: el sub «Banco» (orden 10 —
 *  la Cooperativa del encuentro lleva el 9) y su línea de saldo de C$20,000,
 *  siempre con los mismos ids, para que las semillas la compartan sin duplicar. */
function sowBanco(s: LedgerState): LedgerState {
  let st = hideFactoryVaults(s);
  const cat = st.structure.categories.find((c) => c.id === "f-ahorro");
  if (cat && !cat.subs.some((x) => x.id === "f.ahorro.banco")) {
    st = { ...st, structure: { ...st.structure, categories: st.structure.categories.map((c) => (c.id === "f-ahorro" ? { ...c, subs: [...c.subs, { id: "f.ahorro.banco", nameKey: "", customName: "Banco", icon: "vault", hidden: false, order: 10 }] } : c)) } };
  }
  const key = todayIso().slice(0, 7);
  return sow(st, key, [
    line({ id: "seed-m-banco", kind: "expense-fixed", concept: "Saldo del Banco", amountMinor: 2_000_000, categoryId: "f-ahorro", subId: "f.ahorro.banco", balanceMinor: 2_000_000, monthKey: key }),
  ]);
}
