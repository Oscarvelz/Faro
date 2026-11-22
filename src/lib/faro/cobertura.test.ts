/* cobertura.test.ts — OLA 20: LA COBERTURA DESDE EL ESQUEMA.
   El producto cruzado ciudadanos del libro × plantillas de pregunta
   (la idea de SynQL: esquema × plantillas = el conjunto respondible;
   el complemento es el mapa de los silencios). Las celdas se GENERAN
   desde el propio fixture — sus categorías con líneas, sus personas,
   sus suscripciones — y cada celda que una familia declara suya debe
   responder. Un hueco conocido se declara en HUECOS con su razón; si
   un hueco declarado empieza a responder, el instrumento también
   falla: la lista debe seguir siendo verdad. */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addRemitPerson } from "./remit-people.ts";
import { answerBankQuestion } from "./ask2.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  } as Line;
}
function fixture(): LedgerState {
  let ledger = createInitial("es", "oscuro");
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
  ledger.months[KEY] = {
    lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041 }),
      line({ id: "negocio", kind: "income-variable" as LineKind, concept: "Negocio propio", amountMinor: 39823 }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 2457, categoryId: "f-casa", subId: "f.casa.servicios" }),
      line({ id: "paypal", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      line({ id: "compra1", kind: "purchase" as LineKind, concept: "Zapatos", amountMinor: 8000, categoryId: "ropa", storeId: "amazon" }),
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", monthKey: PREV }),
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, monthKey: PREV }),
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

/* Los huecos declarados: pregunta generada → por qué hoy no responde.
   La lista vacía es una afirmación: el instrumento la verifica. */
const HUECOS: Record<string, string> = {};

describe("cobertura · el producto cruzado esquema × plantillas", () => {
  const ledger = fixture();
  const names = makeNamer(ledger.structure, "es");
  const ask = (raw: string) => answerBankQuestion(ledger, KEY, "es", names, raw,
    { ledger, lang: "es", today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` }, TODAY);

  const cells: Array<{ cell: string; question: string }> = [];
  // × categoría del ESQUEMA con líneas de gasto: historia y conteo por
  // su nombre. (Solo categorías que existen en la estructura: una
  // línea puede citar un categoryId sin entrada — «ropa» en este
  // fixture — y esa no es una celda del esquema, es un concepto.)
  const inLines = new Set(Object.values(ledger.months).flatMap((m) => m.lines).filter((l) => l.kind !== "income-fixed" && l.kind !== "income-variable").map((l) => l.categoryId));
  const expenseCats = ledger.structure.categories.map((c) => c.id).filter((id) => inLines.has(id) && names.cat(id));
  for (const catId of expenseCats) {
    const nm = names.cat(catId);
    cells.push({ cell: `historia×${catId}`, question: `¿Cuánto gasté en ${nm.toLowerCase()} este mes?` });
    cells.push({ cell: `conteo×${catId}`, question: `¿Cuántas veces pagué ${nm.toLowerCase()} este mes?` });
  }
  // × concepto anotado: historia por el nombre de la línea.
  for (const concept of ["Zapatos", "Internet", "Camisa", "Salario"]) {
    cells.push({ cell: `historia×concepto:${concept}`, question: `¿Cuánto gasté en ${concept.toLowerCase()} este mes?` });
  }
  // × persona del libro: los dos lados de la deuda.
  for (const person of ["Carlos", "Ana"]) {
    cells.push({ cell: `deudas-owed×${person}`, question: `¿Cuánto me debe ${person}?` });
    cells.push({ cell: `deudas-owe×${person}`, question: `¿Cuánto le debo a ${person}?` });
  }
  // × suscripción con vencimiento: el calendario la nombra.
  cells.push({ cell: "calendario×Internet", question: "¿Cuándo vence el internet?" });
  cells.push({ cell: "calendario×Internet-días", question: "¿Cuántos días faltan para el internet?" });
  // × cuenta de ahorro: el dueño por su nombre.
  cells.push({ cell: "dueño×PayPal", question: "¿Cuánto tengo en PayPal?" });
  // Los totales del esquema.
  cells.push({ cell: "historia×mes", question: "¿Cuánto gasté este mes?" });
  cells.push({ cell: "historia×mes-pasado", question: "¿Cuánto gasté el mes pasado?" });
  cells.push({ cell: "ingreso×mes", question: "¿Cuánto entró este mes?" });

  for (const { cell, question } of cells) {
    test(`celda ${cell}: «${question}»`, () => {
      const r = ask(question);
      const gap = HUECOS[question];
      if (gap) {
        assert.equal(r.kind, "unknown", `el hueco declarado ya no existe (responde): ${question} — quita la declaración`);
      } else {
        assert.equal(r.kind, "answer", `SILENCIO no declarado en la celda ${cell}: «${question}» — cúralo o decláralo en HUECOS con su razón`);
      }
    });
  }
});
