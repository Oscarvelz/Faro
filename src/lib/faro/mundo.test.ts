/**
 * mundo.test.ts — INSTRUMENTO DE CAZA (no es suite del banco): corre la
 * batería de preguntas ordinarias que el mundo le hace a su dinero
 * contra el motor real e imprime la clasificación. Las clases que
 * rompen se curan en ask2.ts con su espécimen en banco.test.ts.
 */
import { describe, it } from "node:test";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addRemitPerson } from "./remit-people.ts";
import { answerBankQuestion } from "./ask2.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const PPREV = "2026-08";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-10-05" }),
      line({ id: "negocio", kind: "income-variable" as LineKind, concept: "Negocio propio", amountMinor: 39823, bookedOn: "2026-10-18" }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "compra1", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 8000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-15" }),
      line({ id: "super1", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 15000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-08" }),
      line({ id: "super2", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 13500, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-10-19" }),
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      line({ id: "super0", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 14000, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-09-09", monthKey: PREV }),
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
    ],
  };
  ledger.months[PPREV] = {
    lines: [
      line({ id: "salario00", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-08-05", monthKey: PPREV }),
      line({ id: "super00", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 12800, categoryId: "ropa", storeId: "amazon", bookedOn: "2026-08-11", monthKey: PPREV }),
    ],
  };
  const added = addRemitPerson(ledger, "Mamá", "mama");
  ledger = added.state;
  ledger = addLent(ledger, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-01", dueOn: "2026-12-01", note: "" });
  ledger = addLent(ledger, { id: "lent2", person: "Ana", kind: "plain", amountMinor: 10000, currency: "USD", aprBps: 0, startedOn: "2026-09-02", dueOn: "2026-12-01", note: "" });
  ledger.settings.display = "USD";
  ledger.settings.emergencyMonths = 3;
  return ledger;
}

function ctx(ledger: LedgerState): ParseCtx {
  return { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

const BATTERY: [string, string][] = [
  // Estado general
  ["estado", "¿Cómo voy este mes?"],
  ["estado", "¿Cómo estoy de dinero?"],
  ["estado", "¿Me alcanza para llegar a fin de mes?"],
  ["estado", "¿Estoy gastando más de lo que gano?"],
  ["estado", "¿Cuánto he ganado este mes?"],
  ["estado", "¿Cuánto dinero ha entrado este mes?"],
  ["estado", "¿Cuánto es mi ingreso mensual?"],
  ["estado", "¿Cuál es mi gasto fijo mensual?"],
  ["estado", "¿Cuánto gasto al mes en promedio?"],
  ["estado", "¿Cuánto gasto al día?"],
  ["estado", "¿Cuánto puedo gastar al día sin pasarme?"],
  // A dónde va el dinero
  ["destino", "¿En qué se me va el dinero?"],
  ["destino", "¿En qué gasto más?"],
  ["destino", "¿Cuál es mi mayor gasto?"],
  ["destino", "¿Cuánto gasto en el súper?"],
  ["destino", "¿Cuánto gasto en comida?"],
  ["destino", "¿Cuánto he gastado en compras este año?"],
  ["destino", "¿Cuántas veces fui al súper este mes?"],
  ["destino", "¿Cada cuánto voy al súper?"],
  ["destino", "¿Cuánto gasto en suscripciones?"],
  ["destino", "¿Qué suscripciones tengo?"],
  ["destino", "¿Cuánto pago de internet al año?"],
  // Ahorro
  ["ahorro", "¿Cuánto tengo ahorrado?"],
  ["ahorro", "¿Cuánto debería tener de fondo de emergencia?"],
  ["ahorro", "¿Tengo fondo de emergencia suficiente?"],
  ["ahorro", "¿Cuánto ahorro al mes?"],
  ["ahorro", "¿Qué porcentaje de mi ingreso ahorro?"],
  ["ahorro", "¿Cuánto necesito ahorrar al mes para tener 2000 en diciembre?"],
  ["ahorro", "¿Cuánto tardaría en juntar 3000 dólares?"],
  ["ahorro", "Si dejo de ir al súper una vez al mes, ¿cuánto junto en un año?"],
  // Deudas
  ["deudas", "¿Cuánto debo en total?"],
  ["deudas", "¿A quién le debo?"],
  ["deudas", "¿Quién me debe dinero?"],
  ["deudas", "¿Cuánto me debe Carlos?"],
  ["deudas", "¿Cuándo termino de pagar lo que debo?"],
  ["deudas", "¿Cuánto pago en deudas al mes?"],
  // Puedo o no puedo
  ["puedo", "¿Puedo comprarme unos zapatos de 80 dólares?"],
  ["puedo", "¿Puedo gastar 100 dólares este fin de semana?"],
  ["puedo", "¿Me alcanza para un viaje de 500 dólares?"],
  ["puedo", "¿Puedo darme un gusto de 50 dólares?"],
  ["puedo", "¿Cuánto es lo más que puedo gastar hoy?"],
  // Comparaciones
  ["comparar", "¿Gasté más este mes o el pasado?"],
  ["comparar", "¿Este mes voy mejor o peor que el pasado?"],
  ["comparar", "¿Cuánto más gasté este mes que el pasado?"],
  ["comparar", "¿Gano más de lo que gasto?"],
  ["comparar", "¿En qué mes gasté más, en agosto o en septiembre?"],
  ["comparar", "¿Gasté más en el súper o en zapatos?"],
  // Futuro y planes
  ["futuro", "¿Cuánto tendré ahorrado en diciembre?"],
  ["futuro", "Si sigo así, ¿cómo termino el mes?"],
  ["futuro", "¿Cuánto dinero tendré a fin de mes?"],
  ["futuro", "¿Qué pasa si me quedo sin trabajo?"],
  ["futuro", "¿Cuántos meses puedo vivir sin ingresos?"],
  ["futuro", "¿Cuándo es mi próximo pago?"],
  ["futuro", "¿Qué pagos vienen esta semana?"],
  ["futuro", "¿Cuánto tengo que pagar antes de fin de mes?"],
  // Precios y trabajo
  ["precio-tiempo", "¿Cuántos días de trabajo me cuestan los zapatos de 80 dólares?"],
  ["precio-tiempo", "¿Cuántas horas trabajo para pagar el internet?"],
  ["precio-tiempo", "¿Cuánto gano por día?"],
  ["precio-tiempo", "¿Cuánto gano por hora si trabajo 40 horas a la semana?"],
  // Hábitos y patrones
  ["habitos", "¿Cuál es mi gasto más frecuente?"],
  ["habitos", "¿Qué día gasto más?"],
  ["habitos", "¿Estoy gastando más que antes en el súper?"],
  ["habitos", "¿Ha subido el precio de algo que pago?"],
  ["habitos", "¿Tengo algún gasto duplicado?"],
  ["habitos", "¿Cómo fue mi mes pasado?"],
  ["habitos", "¿Cómo fue mi septiembre?"],
  ["habitos", "¿En qué mes me fue mejor?"],
  // Presupuesto y reglas
  ["reglas", "¿Cuánto debería gastar en gustos según la regla?"],
  ["reglas", "¿Cuánto debería gastar en necesidades?"],
  ["reglas", "¿Estoy dentro de la regla 50 30 20?"],
  ["reglas", "¿Cuánto me falta para mi fondo de emergencia?"],
  // Conversión y cuentas
  ["cuentas", "¿Cuánto tengo en PayPal?"],
  ["cuentas", "¿De qué cuenta me conviene sacar 50 dólares?"],
  ["cuentas", "¿Cuánto son 100 dólares en córdobas?"],
  ["cuentas", "¿A cómo está el cambio?"],
  // English ordinary
  ["en", "How much did I spend this month?"],
  ["en", "Can I afford a $200 trip?"],
  ["en", "How much do I save each month?"],
  ["en", "Where does my money go?"],
  ["en", "How much do I owe in total?"],
  ["en", "What's my biggest expense?"],
];

// ── OLA 18 · LA BATERÍA DEL MUNDO II — el habla real contra las
// familias jóvenes (13–17) y contra el motor entero: sin acentos,
// coloquial, con el orden revuelto, en inglés de la calle. La misma
// disciplina: cero silencios, cero disfraces. Lo que rompa se cura en
// ask2.ts con su espécimen en banco.test.ts, en la misma ola.
const BATTERY2: [string, string][] = [
  ["simulador", "si le meto 50 mas al mes a la tarjeta cuando termino"],
  ["simulador", "pagando 100 al mes de mis deudas en cuanto salgo"],
  ["simulador", "what if i pay 200 a month on my card, when am i done"],
  ["estacionalidad", "que mes es el que mas gasto"],
  ["estacionalidad", "en que mes se me va mas dinero"],
  ["estacionalidad", "which month do i spend the most"],
  ["reparto", "reparti 100 dolares entre mama y carlos, cuanto le toca a cada quien"],
  ["reparto", "la cuenta fue de 60, eramos mama, carlos y yo, cuanto nos toca"],
  ["reparto", "40 para mama, 30 para carlos y 50 para mi, cuanto es el total"],
  ["aprendizaje", "que has aprendido de mi"],
  ["aprendizaje", "what have you learned from me"],
  ["compuesta", "cuanto gaste en zapatos y cuanto me debe carlos"],
  ["compuesta", "cuanto tengo en ahorros y cuando vence el internet"],
  ["habla", "cuanto me queda pa la quincena"],
  ["habla", "gaste mucho este mes?"],
  ["habla", "mi tarjeta cuanto debo"],
  ["habla", "cuando me toca pagar el internet"],
  ["habla", "si gasto 30 en comida cuanto me queda"],
  ["habla", "me entraron 200 mas, cuanto tengo en ahorros ahora"],
  ["habla", "how much is left in my savings"],
  ["habla", "when is my internet due"],
  ["habla", "cuanto es la mitad de 90 dolares"],
  ["habla", "el doble de 45 dolares cuanto es"],
  ["habla", "cuanto debo en total entre tarjetas y prestamos"],
  ["habla", "que dia cae el 28"],
  ["habla", "cuantos dias faltan para fin de mes"],
];

describe("mundo · la batería del mundo II (ola 18, el habla real)", () => {
  it("clasifica cada pregunta", () => {
    const ledger = fixture();
    let ok = 0, sil = 0, ask = 0;
    for (const [theme, q] of BATTERY2) {
      const r = answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), q, ctx(ledger), TODAY);
      const tag = r.kind === "answer" ? `OK ${(r as { family: string }).family}` : r.kind === "ask-back" ? "ASK" : "SIL";
      if (r.kind === "answer") ok++; else if (r.kind === "ask-back") ask++; else sil++;
      const head = r.kind === "answer" ? (r as { verdict: string }).verdict.slice(0, 95) : "";
      console.log(`${tag.padEnd(16)} [${theme}] ${q} ${head ? "→ " + head : ""}`);
    }
    console.log(`TOTAL2: ${BATTERY2.length} · responden ${ok} · preguntan de vuelta ${ask} · silencio ${sil}`);
  });
});

describe("mundo · la batería del mundo contra el motor", () => {
  it("clasifica cada pregunta", () => {
    const ledger = fixture();
    let ok = 0, sil = 0, ask = 0;
    for (const [theme, q] of BATTERY) {
      const r = answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), q, ctx(ledger), TODAY);
      const tag = r.kind === "answer" ? `OK ${(r as { family: string }).family}` : r.kind === "ask-back" ? "ASK" : "SIL";
      if (r.kind === "answer") ok++; else if (r.kind === "ask-back") ask++; else sil++;
      const head = r.kind === "answer" ? (r as { verdict: string }).verdict.slice(0, 95) : "";
      console.log(`${tag.padEnd(16)} [${theme}] ${q} ${head ? "→ " + head : ""}`);
    }
    console.log(`TOTAL: ${BATTERY.length} · responden ${ok} · preguntan de vuelta ${ask} · silencio ${sil}`);
  });
});
