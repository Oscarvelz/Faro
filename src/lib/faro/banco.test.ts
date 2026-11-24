/**
 * banco — el banco ampliado del Asesor (rama independiente, 2026-11-20).
 * Los especímenes son las preguntas REALES de Oscar en su teléfono:
 * las tres de la primera prueba («¿Cuánto tengo para gastar en gustos?»,
 * «¿Cuánto gasté el último mes en tiendas?», «¿Cuánto me queda en
 * ahorros?») y las trece de la segunda ronda (recencia, agenda,
 * ranking, remesas). Cada respuesta se verifica contra el motor que la
 * produce — nunca contra una cifra escrita a mano sin fuente.
 *
 * Las cercas: (1) el desvío está curado — ahorros no cae en how;
 * (2) «sin tocar mis ahorros» sigue siendo free (su trampa manda);
 * (3) toda familia viva declara fuentes que existen en el mapa;
 * (4) las familias declaradas (ausencia/identidad/seguimiento) y la
 * opinión («¿debería invertir?») siguen en silencio honesto;
 * (5) el motor no conoce commit ni upsertLine (cero fabricación).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FARO_FUNCTION_MAP } from "./askmap.ts";
import { answerBankQuestion, answerFollowUp, bankChips, bankSourceIds, classifyBankQuestion, convoAfterFollowUp, driftCandidates, normalizeEs, validateGraph, type AskNode } from "./ask2.ts";
import { describeLearned, forgetAlias, frequentAliases, learnAlias, maskShape, touchAlias, type LearnedAlias } from "./asklearn.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addLoan } from "./loans.ts";
import { addReading } from "./cards.ts";
import { duesWindow } from "./dues.ts";
import { formatMoney } from "./money.ts";
import { QUESTION_BANK, liveFamilies } from "./questionbank.ts";
import { addRemitPerson } from "./remit-people.ts";
import { savingsStock } from "./savings.ts";
import type { ParseCtx } from "./textparse.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
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
      line({ id: "remesa1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
      line({ id: "cuota1", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ],
  };
  ledger.months[PREV] = {
    lines: [
      line({ id: "compra0", kind: "purchase" as LineKind, concept: "Camisa", amountMinor: 5000, categoryId: "ropa", storeId: "temu", bookedOn: "2026-09-12", monthKey: PREV }),
      line({ id: "salario0", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 57041, bookedOn: "2026-09-05", monthKey: PREV }),
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

function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}

describe("banco · los especímenes de Oscar responden", () => {
  const ledger = fixture();

  it("AHORROS ya no se desvía a «cómo voy»: responde el stock", () => {
    const r = ask(ledger, "¿Cuánto me queda en ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    const stock = savingsStock(ledger, KEY);
    assert.ok(r.verdict.includes(formatMoney(stock.total, "USD", "es")), r.verdict);
    assert.ok(r.source.includes("ahorros.stock"));
  });

  it("GUSTOS responde la capacidad con la resta del dinero libre", () => {
    const r = ask(ledger, "¿Cuánto tengo para gastar en gustos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "gustos");
    assert.equal(r.pieces.length, 4);
  });

  it("HISTORIA: el último mes en tiendas suma las compras de ese mes", () => {
    const r = ask(ledger, "¿Cuánto gasté el último mes en tiendas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 5000);
    assert.equal(r.lines, 1);
  });

  it("RECENCIA: la última vez que me pagaron, la última compra, la última tienda, la remesa a mamá", () => {
    const pay = ask(ledger, "¿Cuándo fue la última vez que me pagaron?");
    assert.equal(pay.kind, "answer");
    if (pay.kind === "answer") assert.ok(pay.verdict.includes("18 de octubre de 2026"), pay.verdict);
    const buy = ask(ledger, "¿Qué fue lo último que compré?");
    assert.equal(buy.kind, "answer");
    if (buy.kind === "answer") assert.ok(buy.verdict.includes("Zapatos"), buy.verdict);
    const rem = ask(ledger, "¿Cuál fue el último monto que envié a mamá?");
    assert.equal(rem.kind, "answer");
    if (rem.kind === "answer") {
      assert.equal(rem.family, "recencia");
      assert.ok(rem.verdict.includes(formatMoney(17000, "USD", "es")), rem.verdict);
    }
  });

  it("AGENDA: las primeras cuotas salen de la ventana de Cobros", () => {
    const r = ask(ledger, "¿Cuáles son las primeras cuotas del mes que necesito pagar?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "agenda");
    const dues = duesWindow(ledger, 31, TODAY);
    assert.ok(dues.length > 0);
    assert.ok(r.pieces.some((p) => p.label.includes("Internet")), JSON.stringify(r.pieces));
  });

  it("RANKING: quién me debe más sale de peopleOf", () => {
    const r = ask(ledger, "¿Quién me debe más?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ranking");
    assert.ok(r.verdict.includes("Carlos"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
  });

  it("REMESAS: el patrón nombra a la persona y su total", () => {
    const r = ask(ledger, "¿Cuándo envías remesas y a quién?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "remesas");
    assert.ok(r.verdict.includes("Mamá"), r.verdict);
  });

  it("HISTORIA sin filtro: «gasté» no se lee como filtro de «gas» (palabra entera)", () => {
    const r = ask(ledger, "¿Cuánto gasté este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    // Casa 2457 + Zapatos 8000 + Remesa 17000 + Internet 4999; el apartado a PayPal (rol ahorro) NO es gasto.
    assert.equal(r.pieces[0].minor, 32456);
    assert.equal(r.lines, 4);
  });

  it("COMPARAR: este mes contra el pasado, del mismo summarize", () => {
    const r = ask(ledger, "¿Gasté más este mes o el mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.equal(r.pieces.length, 2);
  });
});

describe("banco · ola 2: los especímenes del 2026-11-21", () => {
  const ledger = fixture();

  it("CONTEO: «¿cuántas cuotas estoy pagando?» cuenta las series vivas y suma por cobro", () => {
    for (const q of ["¿Cuántas cuotas tengo?", "¿Cuántas cuotas estoy pagando?"]) {
      const r = ask(ledger, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") return;
      assert.equal(r.family, "conteo", q);
      assert.ok(r.verdict.includes("1 cuota"), r.verdict);
      assert.ok(r.verdict.includes(formatMoney(4999, "USD", "es")), r.verdict);
      assert.ok(r.source.includes("cobros.cuotas"));
    }
  });

  it("CONTEO se generaliza: personas que deben y cuentas con saldo", () => {
    const p = ask(ledger, "¿Cuántas personas me deben?");
    assert.equal(p.kind, "answer");
    if (p.kind === "answer") { assert.equal(p.family, "conteo"); assert.ok(p.verdict.includes("2"), p.verdict); }
    const en = ask(ledger, "How many dues am I paying?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.equal(en.family, "conteo");
  });

  it("EXTREMOS: el gasto más grande y el más pequeño salen del stream, sin el rol ahorro", () => {
    const big = ask(ledger, "¿Cuál ha sido el gasto más grande que he hecho?");
    assert.equal(big.kind, "answer");
    if (big.kind === "answer") {
      assert.equal(big.family, "extremos");
      // La remesa ($170) es el gasto mayor; el apartado a PayPal (rol ahorro) NO compite.
      assert.ok(big.verdict.includes("Remesa"), big.verdict);
      assert.ok(big.verdict.includes(formatMoney(17000, "USD", "es")), big.verdict);
    }
    const small = ask(ledger, "¿Cuál ha sido el gasto más pequeño que he hecho?");
    assert.equal(small.kind, "answer");
    if (small.kind === "answer") {
      assert.equal(small.family, "extremos");
      assert.ok(small.verdict.includes(formatMoney(2457, "USD", "es")), small.verdict);
    }
    const buy = ask(ledger, "¿Cuál fue mi compra más grande?");
    assert.equal(buy.kind, "answer");
    if (buy.kind === "answer") { assert.equal(buy.family, "extremos"); assert.ok(buy.verdict.includes("Zapatos"), buy.verdict); }
    const en = ask(ledger, "What has been my biggest expense?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.equal(en.family, "extremos");
  });

  it("RECENCIA de cuota y RECENCIA AMPLIA: la última vez que pagué una cuota / pagué zapatos", () => {
    const cuota = ask(ledger, "¿Cuándo fue la última vez que pagué una cuota?");
    assert.equal(cuota.kind, "answer");
    if (cuota.kind === "answer") { assert.equal(cuota.family, "recencia"); assert.ok(cuota.verdict.includes("Internet"), cuota.verdict); }
    const amplia = ask(ledger, "¿Cuál fue la última vez que pagué zapatos?");
    assert.equal(amplia.kind, "answer");
    if (amplia.kind === "answer") { assert.equal(amplia.family, "recencia"); assert.ok(amplia.verdict.includes("Zapatos"), amplia.verdict); }
  });
});

describe("banco · ola 3: el Asesor se describe, honesto", () => {
  const ledger = fixture();

  it("CAPACIDADES: la lista sale del banco — nombra familias vivas y ninguna declarada como capaz", () => {
    const r = ask(ledger, "¿Qué puedes hacer?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "capacidades");
    const labels = r.pieces.map((p) => p.label).join(" · ");
    assert.ok(labels.includes("Ahorros") || labels.toLowerCase().includes("ahorr"), labels);
    // Las declaradas (ausencia/identidad/seguimiento) NO se venden como capacidad.
    const live = liveFamilies();
    assert.equal(r.pieces.length, live.length);
  });

  it("LÍMITES: nombra lo que no puede — opinar, inventar, guardar solo — y las declaradas como «todavía no»", () => {
    for (const q of ["¿Qué no puedes hacer?", "¿Qué no puedo hacer?"]) {
      const r = ask(ledger, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") return;
      assert.equal(r.family, "limites", q);
      const labels = r.pieces.map((p) => p.label).join(" · ");
      // ENMIENDA (integración de la Ola 35): la aserción vieja pedía
      // una pieza «Todavía no» — esas piezas nacen de las familias
      // DECLARADAS del banco, y la promoción de ausencia/identidad a
      // vivas (Ola 35) dejó el conjunto declarado VACÍO: ya no hay
      // ningún «todavía no» honesto que nombrar. La cerca ahora sigue
      // al dato: «Todavía no» aparece si y solo si queda alguna
      // familia declarada.
      const declaredLeft = QUESTION_BANK.filter((f) => f.status === "declarada");
      assert.equal(labels.includes("Todavía no"), declaredLeft.length > 0, labels);
      assert.ok(/inventar/i.test(labels), labels);
    }
    const en = ask(ledger, "What can you do?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.equal(en.family, "capacidades");
  });
});

describe("banco · ola 4: hipotéticos y calculadora (capturas del 2026-11-21)", () => {
  const ledger = fixture();

  it("CALCULADORA suma pura: 300 de cumpleaños + 200 de aumento + 150 de mamá = 650, sin tocar el libro", () => {
    const r = ask(ledger, "Si me regalaron 300 dólares de cumpleaños, 200 de aumento en mi salario y mamá me dio 150, ¿cuánto sería?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(65000, "USD", "es")), r.verdict);
    assert.equal(r.pieces.length, 3);
  });

  it("CALCULADORA reparto: 1500 en tres partes = 500 cada una", () => {
    const r = ask(ledger, "Si divido 1500 dólares en tres partes, ¿cómo me quedaría?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(50000, "USD", "es")), r.verdict);
  });

  it("CALCULADORA porcentaje: el 20% de 1500 = 300", () => {
    const r = ask(ledger, "¿Cuánto es el 20% de 1500 dólares?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
  });

  it("HIPOTÉTICO sobre la cuenta: la base es el saldo en cuentas y el supuesto se dice", () => {
    const r = ask(ledger, "Si por un vuelo a Madrid pago 200 dólares, la estadía 300 y por comida 500, ¿cuánto dinero me quedaría en mi cuenta?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    const stock = savingsStock(ledger, KEY);
    const expected = (stock.byClass.cuenta ?? 0) - 100000;
    assert.ok(r.verdict.includes(formatMoney(expected, "USD", "es")), r.verdict);
    assert.ok(/supuesto|si\b/i.test(r.note ?? ""), r.note ?? "");
  });

  it("HIPOTÉTICO en pesos (= córdobas): la suma se convierte y se resta de la Queda", () => {
    const r = ask(ledger, "Si gasto 30 pesos en golosinas, 50 en comida y 30 en arroz, ¿cuánto me queda?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.equal(r.pieces.length, 4); // la base + los tres gastos
    assert.ok(r.source.includes("central.queda"));
  });
});

describe("banco · ola 5: acciones sugeridas (idea de Oscar, 2026-11-21)", () => {
  const ledger = fixture();

  it("«Quiero enviarle dinero a mamá» propone la remesa y la conversión, sin monto todavía", () => {
    const r = ask(ledger, "Quiero enviarle dinero a mamá");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "acciones");
    assert.ok(r.actions?.some((a) => a.target === "remesas.personas"), JSON.stringify(r.actions));
    assert.ok(r.actions?.some((a) => a.target === "cambio.mesa"));
    assert.ok(r.actions?.every((a) => bankSourceIds().has(a.target)));
  });

  it("«Envío 50 a mamá, 30 para los niños, 40 para resolver y 10 para la comida» hace la cuenta y propone", () => {
    const r = ask(ledger, "Envío 50 a mamá, 30 para los niños, 40 para resolver y 10 para la comida");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "acciones");
    assert.ok(r.verdict.includes(formatMoney(13000, "USD", "es")), r.verdict);
    assert.equal(r.pieces.length, 4);
    assert.ok(r.actions?.length === 3);
  });

  it("el patrón de remesas sigue siendo pregunta, no acción: «¿cuándo envías remesas y a quién?»", () => {
    const r = ask(ledger, "¿Cuándo envías remesas y a quién?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "remesas");
  });
});

describe("banco · ola 6: el contexto se pide con tarjetitas", () => {
  function twoAccounts(): LedgerState {
    const ledger = fixture();
    const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
    if (!ahorro) throw new Error("missing savings");
    ahorro.subs.push({ id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "Banco", icon: "vault:bank", hidden: false, order: 11 });
    ledger.months[KEY].lines.push(line({ id: "banco1", kind: "expense-fixed" as LineKind, concept: "Banco", amountMinor: 50000, categoryId: "f-ahorro", subId: "f.ahorro.banco" }));
    return ledger;
  }

  it("«Si uso 300 dólares, ¿cuánto me queda en mi cuenta?» con DOS cuentas: pregunta de vuelta con las dos", () => {
    const ledger = twoAccounts();
    const r = ask(ledger, "Si uso 300 dólares, ¿cuánto dinero me queda en mi cuenta?");
    assert.equal(r.kind, "ask-back");
    if (r.kind !== "ask-back") return;
    assert.equal(r.family, "hipotetico");
    assert.equal(r.options.length, 2);
  });

  it("clavada en la cuenta elegida: la respuesta es de ESA cuenta (saldo y libre)", () => {
    const ledger = twoAccounts();
    const r = answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"),
      "Si uso 300 dólares, ¿cuánto dinero me queda en mi cuenta?", ctx(ledger), TODAY, { accountId: "f.ahorro.paypal" });
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes("PayPal"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(129900 - 30000, "USD", "es")), r.verdict);
  });
});

describe("banco · ola 7: la caja de herramientas", () => {
  const ledger = fixture();

  it("CONVERSOR: 100 dólares en córdobas con la tasa del libro; el euro se rehúsa honesto", () => {
    const r = ask(ledger, "¿Cuánto es 100 dólares en córdobas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "conversor");
    // La cifra sale de convertMinor con el rateE4 del propio libro.
    assert.ok(r.source.includes("cambio.mesa"));
    const eur = ask(ledger, "¿Cuánto es 100 euros en dólares?");
    assert.equal(eur.kind, "answer");
    if (eur.kind === "answer") { assert.equal(eur.family, "conversor"); assert.ok(/invitada|guest/i.test(eur.verdict), eur.verdict); }
  });

  it("CALENDARIO: días hasta la cuota nombrada y hasta el día N", () => {
    const r = ask(ledger, "¿En cuántos días vence mi Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calendario");
    assert.ok(r.verdict.includes("6 día"), r.verdict); // 22 → 28 de octubre
    const d = ask(ledger, "¿Cuántos días faltan para el día 15?");
    assert.equal(d.kind, "answer");
    if (d.kind === "answer") { assert.equal(d.family, "calendario"); assert.ok(d.verdict.includes("15 de noviembre de 2026"), d.verdict); }
  });

  it("RITMO dentro de la calculadora: 50 a la semana al mes, con su supuesto", () => {
    const r = ask(ledger, "¿Cuánto es 50 dólares a la semana al mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(Math.round((5000 * 52) / 12), "USD", "es")), r.verdict);
  });
});

describe("banco · ola 8: contrafactual, colchón y meta inversa", () => {
  const ledger = fixture();

  it("CONTRAFACTUAL medido: dejar de pagar el Internet junta su promedio × 12", () => {
    const r = ask(ledger, "Si dejo de pagar el internet, ¿cuánto junto en un año?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "contrafactual");
    // El promedio medido del fixture: Internet 4999 en 2 meses con libro.
    const avg = Math.round(4999 / 2);
    assert.ok(r.verdict.includes(formatMoney(avg * 12, "USD", "es")), r.verdict);
    assert.ok(/medido|MEDIDO|measured/i.test(r.note ?? ""), r.note ?? "");
  });

  it("COLCHÓN: lo guardado dura sus meses al ritmo medido del gasto", () => {
    const stock = savingsStock(ledger, KEY);
    const r = ask(ledger, "¿Cuántos meses me dura lo que tengo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "respaldo");
    assert.ok(r.verdict.includes(formatMoney(stock.total, "USD", "es")), r.verdict);
    assert.ok(/medida|measure/i.test(r.note ?? ""), r.note ?? "");
  });

  it("META INVERSA: (meta − lo guardado) ÷ meses, con las tres piezas", () => {
    const stock = savingsStock(ledger, KEY);
    const r = ask(ledger, "¿Cuánto tengo que ahorrar al mes para llegar a 2000 dólares en 10 meses?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
    const perMonth = Math.ceil((200000 - stock.total) / 10);
    assert.ok(r.verdict.includes(formatMoney(perMonth, "USD", "es")), r.verdict);
    assert.equal(r.pieces.length, 3);
  });
});

describe("banco · ola 9: las curas de la caza (espécimen por clase)", () => {
  const ledger = fixture();
  const stock = savingsStock(ledger, KEY);

  it("PERÍODO NOMBRADO (cazas TIEMPO/DIARIA): «¿Cuánto gasté en septiembre?» responde SEPTIEMBRE", () => {
    const r = ask(ledger, "¿Cuánto gasté en septiembre?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes(formatMoney(5000, "USD", "es")), r.verdict); // la Camisa de septiembre
    assert.ok(/septiembre/i.test(r.verdict), r.verdict);
  });

  it("RECENCIA CON DIRECCIÓN (CAZA-DIARIA C1): la última cosa PAGADA jamás es un ingreso", () => {
    const r = ask(ledger, "¿Cuál fue la última cosa que pagué?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "recencia");
    assert.ok(r.verdict.includes("Zapatos"), r.verdict);
    assert.ok(!/Negocio/.test(r.verdict), r.verdict);
  });

  it("SIGNO Y ESCALA (CAZA-TRAMPAS 1): −200 resta y «2 mil» son 2000", () => {
    const r = ask(ledger, "Si me regalaron 300 dólares y tuve -200 de aumento, ¿cuánto sería?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(10000, "USD", "es")), r.verdict);
    const s = ask(ledger, "¿Cuánto sería 2 mil dólares más 500 dólares en total?");
    assert.equal(s.kind, "answer");
    if (s.kind === "answer") assert.ok(s.verdict.includes(formatMoney(250000, "USD", "es")), s.verdict);
  });

  it("CONVERSOR SIN SECUESTRO (CAZA-TRAMPAS 2): el 20% de 1500 «en córdobas» es porcentaje, no conversión del 20", () => {
    const r = ask(ledger, "¿El 20% de 1500 dólares en córdobas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
  });

  it("CALENDARIO ALCANZABLE (cazas TIEMPO/DIARIA C7): «¿Cuándo vence mi Internet?» responde su fecha", () => {
    const r = ask(ledger, "¿Cuándo vence mi Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calendario");
    assert.ok(r.verdict.includes("28 de octubre de 2026"), r.verdict);
  });

  it("YA-PAGUÉ CRUZADO (CAZA-TRAMPAS 3): no inventa el día y nombra el próximo cobro de la ventana", () => {
    const r = ask(ledger, "¿Ya pagué el Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ya-pague");
    assert.ok(!r.verdict.includes("2026-10-01"), r.verdict);
    assert.ok((r.note ?? "").includes("28 de octubre de 2026"), r.note ?? "");
  });

  it("META SOBRE RITMO (CAZA-TIEMPO 2): ahorrar a la semana para llegar a una meta es META", () => {
    const r = ask(ledger, "¿Cuánto tengo que ahorrar a la semana para llegar a 2000 dólares en 10 meses?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
    assert.ok(r.verdict.includes(formatMoney(Math.ceil((200000 - stock.total) / 10), "USD", "es")), r.verdict);
  });

  it("GUARDA DE HORIZONTE (CAZA-TIEMPO 4, doctrina ola 12): el futuro no se responde con el stock de hoy — se PROYECTA con el ritmo y el supuesto dicho; sin horizonte legible, silencio", () => {
    const r = ask(ledger, "¿Cuánto tendré ahorrado en 6 meses si sigo así?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    // La proyección: hoy 129900 + ritmo (129900 ÷ 2 meses anotados =
    // 64950) × 6 = 519600. Jamás el stock de hoy a secas.
    assert.ok(r.verdict.includes(formatMoney(519600, "USD", "es")), r.verdict);
    assert.ok(!r.verdict.startsWith("En ahorros tienes"), r.verdict);
    const noHorizon = ask(ledger, "¿Cuánto tendré ahorrado?");
    assert.equal(noHorizon.kind, "unknown");
  });

  it("DEUDAS PLANAS (CAZA-DIARIA C5): por persona, el total y la contradicción de dirección", () => {
    const r = ask(ledger, "¿Cuánto me debe Carlos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
    const rev = ask(ledger, "¿Cuánto le debo a Carlos?");
    assert.equal(rev.kind, "answer");
    if (rev.kind === "answer") { assert.equal(rev.family, "deudas"); assert.ok(/Al revés/.test(rev.verdict), rev.verdict); }
    const who = ask(ledger, "¿Quién me debe?");
    assert.equal(who.kind, "answer");
    if (who.kind === "answer") assert.equal(who.family, "deudas");
  });

  it("HISTORIA EN PRESENTE (CAZA-DIARIA C4): «¿Cuánto pago de Internet?» responde la cuota del mes", () => {
    const r = ask(ledger, "¿Cuánto pago de Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes(formatMoney(4999, "USD", "es")), r.verdict);
  });

  it("CONFIRMACIÓN (CAZA-TRAMPAS 4): la premisa falsa se corrige con la cifra real", () => {
    const r = ask(ledger, "Mis ahorros son 500, ¿verdad?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "confirmacion");
    assert.ok(r.verdict.startsWith("No:"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(stock.total, "USD", "es")), r.verdict);
    const cmp = ask(ledger, "¿Ana me debe más que Carlos?");
    assert.equal(cmp.kind, "answer");
    if (cmp.kind === "answer") { assert.equal(cmp.family, "confirmacion"); assert.ok(cmp.verdict.startsWith("No:"), cmp.verdict); }
  });

  it("ACCIONES SIN SECUESTRO (CAZA-DIARIA C9): una consulta con verbo de envío no es una acción", () => {
    const r = ask(ledger, "¿A quién mando dinero normalmente?");
    if (r.kind === "answer") assert.notEqual(r.family, "acciones");
  });

  it("SÍNTESIS (doctrina de Oscar): a estas alturas y el cierre comparado, con sus dos tiempos nombrados", () => {
    const r = ask(ledger, "¿Estoy gastando más rápido que el mes pasado a estas alturas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "sintesis");
    assert.ok(r.verdict.includes(formatMoney(32456, "USD", "es")), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(5000, "USD", "es")), r.verdict);
    const close = ask(ledger, "¿Cómo terminaré el mes comparado con el pasado?");
    assert.equal(close.kind, "answer");
    if (close.kind !== "answer") return;
    assert.equal(close.family, "sintesis");
    const projected = Math.round((32456 / 22) * 31);
    assert.ok(close.verdict.includes(formatMoney(projected, "USD", "es")), close.verdict);
    assert.ok(/supuesto/i.test(close.note ?? ""), close.note ?? "");
  });
});

describe("banco · ola 10: el puente a lo ya reportado", () => {
  const ledger = fixture();

  it("la respuesta de historia lleva su puerta a Estudio · Flujo, con el target en el mapa", () => {
    const r = ask(ledger, "¿Cuánto gasté el último mes en tiendas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    const door = (r.actions ?? []).find((a) => a.id === "goto");
    assert.ok(door, "la puerta viaja en la respuesta");
    assert.equal(door?.target, "estudio.flujo");
    assert.ok(bankSourceIds().has(door?.target ?? ""), "el destino existe en el mapa");
  });

  it("la síntesis también: su cifra vive en Estudio", () => {
    const r = ask(ledger, "¿Estoy gastando más rápido que el mes pasado a estas alturas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok((r.actions ?? []).some((a) => a.target === "estudio.flujo"));
  });

  it("la calculadora NO lleva puerta: su cifra no vive en ningún área", () => {
    const r = ask(ledger, "¿Cuánto sería 300 dólares más 200 dólares en total?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(!(r.actions ?? []).some((a) => a.id === "goto"));
  });
});

describe("banco · ola 11: el aprendizaje (patrones reales, dígitos jamás)", () => {
  const ledger = fixture();

  it("la forma se enmascara: ningún dígito sobrevive en lo que se guarda", () => {
    const shape = maskShape("¿Cuánto gasté 300 dólares en la luz el 15 de octubre?");
    assert.ok(!/\d/.test(shape), shape);
    // Y un «patrón» con dígitos se rechaza entero, por construcción.
    const store = learnAlias([], "cuenta 42", "f.casa.servicios", "sub", "card-tap");
    assert.equal(store.length, 0);
  });

  it("el toque en la tarjeta enseña: «la luz» pasa a ser los servicios, y la pregunta ya responde por él", () => {
    const store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    assert.equal(store.length, 1);
    const r = answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"),
      "¿Cuánto gasté en la luz este mes?", ctx(ledger), TODAY, undefined, undefined, store);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes(formatMoney(2457, "USD", "es")), r.verdict); // solo la línea de servicios
  });

  it("sin confirmación no hay patrón: la misma pregunta sin enseñar no resuelve «la luz» a servicios", () => {
    const r = ask(ledger, "¿Cuánto gasté en la luz este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    // Sin alias, «la luz» no es filtro: responde el gasto entero del mes.
    assert.ok(!r.verdict.includes(formatMoney(2457, "USD", "es")) || r.verdict.includes(formatMoney(32456, "USD", "es")), r.verdict);
  });

  it("la corrección manda: re-enseñar la palabra a otro ciudadano reemplaza el patrón", () => {
    let store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    store = learnAlias(store, "la luz", "f.casa.internet", "sub", "correction");
    assert.equal(store.length, 1);
    assert.equal(store[0].targetId, "f.casa.internet");
    assert.equal(store[0].hits, 1);
    store = forgetAlias(store, "la luz");
    assert.equal(store.length, 0);
  });
});

describe("banco · ola 12: la batería del mundo (81 preguntas, 0 silencios)", () => {
  const ledger = fixture();

  it("la dirección ingreso habla el idioma del mundo: «he ganado», «ha entrado»", () => {
    const r = ask(ledger, "¿Cuánto he ganado este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(96864, "USD", "es")), r.verdict); // 57041 + 39823
    assert.ok(!r.verdict.includes("gastaste"), r.verdict);
  });

  it("el filtro caza conceptos libres y clases; lo que no existe se nombra, no se disfraza", () => {
    const sup = ask(ledger, "¿Cuánto gasto en suscripciones?");
    assert.equal(sup.kind, "answer");
    if (sup.kind === "answer") assert.ok(sup.verdict.includes(formatMoney(4999, "USD", "es")), sup.verdict);
    const stray = ask(ledger, "¿Cuánto gasto en comida?");
    assert.equal(stray.kind, "answer");
    if (stray.kind === "answer") assert.ok(stray.verdict.includes("«comida»"), stray.verdict);
  });

  it("el promedio es la media medida, no el mes en curso; el ritmo diario divide por los días corridos", () => {
    const r = ask(ledger, "¿Cuánto gasto al mes en promedio?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    // (32456 de octubre + 5000 de septiembre) ÷ 2 meses = 18728
    assert.ok(r.verdict.includes(formatMoney(18728, "USD", "es")), r.verdict);
  });

  it("el fondo de emergencia se mide contra la meta del propio Asesor", () => {
    const r = ask(ledger, "¿Tengo fondo de emergencia suficiente?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(/fondo de emergencia/.test(r.verdict), r.verdict);
  });

  it("la cuenta nombrada responde su saldo: «¿Cuánto tengo en PayPal?»", () => {
    const r = ask(ledger, "¿Cuánto tengo en PayPal?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("PayPal") && r.verdict.includes(formatMoney(129900, "USD", "es")), r.verdict);
  });

  it("el precio del tiempo: los zapatos de $80 en días de trabajo, con el supuesto dicho", () => {
    const r = ask(ledger, "¿Cuántos días de trabajo me cuestan los zapatos de 80 dólares?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "precio-tiempo");
    assert.ok(/supuesto/.test(r.note ?? ""), r.note ?? "");
  });

  it("la frecuencia cuenta y cadencia: veces del mes y cada cuántos días", () => {
    const r = ask(ledger, "¿Qué suscripciones tengo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
    assert.ok(r.verdict.includes("Internet"), r.verdict);
  });

  it("el relator cuenta el mes con sus piezas y su puerta", () => {
    const r = ask(ledger, "¿Cómo fue mi mes pasado?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "relator");
    assert.ok((r.actions ?? []).some((a) => a.target === "estudio.flujo"));
  });

  it("comparar: el ingreso contra el gasto, y dos meses nombrados", () => {
    const r = ask(ledger, "¿Estoy gastando más de lo que gano?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    const two = ask(ledger, "¿En qué mes gasté más, en agosto o en septiembre?");
    assert.equal(two.kind, "answer");
  });

  it("la tasa a secas: «¿a cómo está el cambio?» responde la tasa del libro", () => {
    const r = ask(ledger, "¿A cómo está el cambio?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "conversor");
  });
});

describe("banco · ola 13: la puerta generosa (el oído de la referencia, §21)", () => {
  const ledger = fixture();
  const CASES: Array<[string, string | null]> = [
    ["¿Cuánto me queda en ahorros?", "ahorros"],
    ["¿Cuánto tengo para gastar en gustos?", "gustos"],
    ["¿De qué cuenta saco $20 para la remesa?", "cuenta-origen"],
    ["¿Qué puedes hacer?", "capacidades"],
    ["¿Qué no puedes hacer?", "limites"],
    ["¿Cuántas cuotas tengo?", "conteo"],
    ["¿Cuál ha sido mi gasto más grande?", "extremos"],
    ["¿Cuándo fue la última vez que pagué una cuota?", "recencia"],
    ["¿Cuánto gasté en septiembre?", "historia"],
    ["¿Cuánto he ganado este mes?", "historia"],
    ["¿Cuánto le debo a Carlos?", "deudas"],
    ["¿Quién me debe más?", "ranking"],
    ["¿Cuánto son 100 dólares en córdobas?", "conversor"],
    ["¿A cómo está el cambio?", "conversor"],
    ["Si gasto 30 en golosinas y 50 en comida, ¿cuánto me queda?", "hipotetico"],
    ["Si divido 1500 dólares en tres partes, ¿cómo me quedaría?", "calculadora"],
    ["¿Cuánto necesito ahorrar al mes para tener 2000 en diciembre?", "meta"],
    ["¿Cuánto tendré ahorrado en 6 meses si sigo así?", "ahorros"],
    ["¿Cuándo termino de pagar la tarjeta?", "futuro"],
    ["¿Cómo fue mi mes pasado?", "relator"],
    ["¿En qué gasto más?", "relator"],
    ["¿Qué suscripciones tengo?", "frecuencia"],
    ["¿Cuántos días de trabajo me cuestan los zapatos de 80 dólares?", "precio-tiempo"],
    ["¿Estoy dentro de la regla 50/30/20?", "regla"],
    ["Mis ahorros son 500, ¿verdad?", "confirmacion"],
    ["¿Cuánto gasto al mes en promedio?", "promedio"],
    ["¿Cuánto puedo gastar hoy sin descuadrarme?", "promedio"],
    ["Quiero enviarle dinero a mamá", "acciones"],
    ["¿Cuánto me dura lo ahorrado si me quedo sin trabajo?", "respaldo"],
    ["PayPal", null],
    ["internet", null],
  ];

  it("el oído nombra la puerta sin calcular: forma y familia por pregunta", () => {
    for (const [q, fam] of CASES) {
      const c = classifyBankQuestion(q);
      if (fam === null) {
        assert.equal(c.isQuestion, false, `«${q}» no es pregunta`);
      } else {
        assert.equal(c.isQuestion, true, `«${q}» es pregunta`);
        assert.equal(c.family, fam, `«${q}» → ${fam}, no ${c.family}`);
      }
    }
  });

  it("CERCA DE CONSISTENCIA: donde el motor responde con familia, el oído nombra la misma", () => {
    for (const [q, fam] of CASES) {
      if (!fam) continue;
      const r = ask(ledger, q);
      if (r.kind === "answer") assert.equal(r.family, fam, `«${q}»: el motor dice ${r.family}, el oído ${fam}`);
    }
  });

  it("el oído no recibe el libro: su firma es solo texto (compila sin estado)", () => {
    assert.equal(classifyBankQuestion.length, 1);
  });
});

describe("banco · ola 14: la segunda mitad (la doble intención)", () => {
  const ledger = fixture();

  it("dos preguntas, dos respuestas: la compuesta trae ambas patas con sus fuentes", () => {
    const r = ask(ledger, "¿Cuánto gasté en zapatos y cuánto me debe Carlos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(8000, "USD", "es")), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(30000, "USD", "es")), r.verdict);
    assert.ok(r.source.length >= 2, r.source.join(","));
  });

  it("la pata que no se puede responder se NOMBRA, no se pierde en silencio", () => {
    const r = ask(ledger, "¿Cuánto gasté en zapatos y cuándo es mi cumpleaños?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(8000, "USD", "es")), r.verdict);
    assert.ok((r.note ?? "").includes("cumpleaños"), r.note ?? "");
    assert.ok(/no la pierdo en silencio/.test(r.note ?? ""), r.note ?? "");
  });

  it("la conjunción dentro de UNA pregunta no la parte: «comida y bebida» sigue entera", () => {
    const r = ask(ledger, "¿Cuánto gasté en comida y bebida?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(!(r.note ?? "").includes("otra pregunta"), r.note ?? "");
  });
});

describe("banco · ola 15: el simulador y la estacionalidad", () => {
  const withCard = () => addReading(fixture(), "card-chase", { balanceMinor: 100000, src: "manual", on: "2026-10-05" }, "2026-10-05");

  it("el extra ensayado corre por el motor del Plan: meses, término y el supuesto dicho", () => {
    const r = ask(withCard(), "Si abono 50 dólares más al mes a mi tarjeta, ¿cuándo termino?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "simulador");
    assert.ok(/sales de deudas en \d+ mes/.test(r.verdict), r.verdict);
    assert.ok(/supuesto/.test(r.note ?? ""), r.note ?? "");
    assert.ok((r.actions ?? []).some((a) => a.target === "cobros.plan"));
  });

  it("sin deudas anotadas, el simulador lo dice y no inventa una", () => {
    const r = ask(fixture(), "Si abono 50 dólares más al mes a mi tarjeta, ¿cuándo termino?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(/No tienes deudas anotadas/.test(r.verdict), r.verdict);
  });

  it("FRONTERA MOVIDA (enmienda de la integración de la Ola 29): «¿puedo pagarlo el día D?» ES del banco — la factibilidad la responde como prueba; la forma SIN día sigue siendo de la delegación spend", () => {
    // La Ola 15 selló esta frontera al revés; la Ola 29 del banco la
    // movió a propósito (OLA2.md: «LA FRONTERA DE LA OLA 15 SE
    // MUEVE»): el delegado restaba el monto de la queda de hoy e
    // ignoraba el día — decía «sí» a un pago que el día 28 no cabe.
    // La prueba camina lo programado hasta el día y entonces cobra.
    const r = ask(fixture(), "¿Puedo pagar 100 dólares el día 28?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    const sinDia = ask(fixture(), "¿Puedo pagar 100 dólares?");
    assert.equal(sinDia.kind, "answer");
    if (sinDia.kind !== "answer") return;
    assert.equal(sinDia.family, "spend");
  });

  it("la estacionalidad nombra el mes mayor y la media", () => {
    const r = ask(fixture(), "¿En qué mes gasto más?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "estacionalidad");
    assert.ok(r.verdict.includes("octubre 2026"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(32456, "USD", "es")), r.verdict);
  });
});

describe("banco · ola 16: el reparto entre personas", () => {
  it("los repartos nombrados se suman, se nombran y cuadran con el total", () => {
    const r = ask(fixture(), "Reparte los 120 dólares: 40 para mamá, 30 para Carlos y 50 para mí");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 3);
    assert.ok(r.pieces.some((p) => p.label === "Mamá" && p.minor === 4000), JSON.stringify(r.pieces));
    assert.ok(r.pieces.some((p) => p.label === "Tú" && p.minor === 5000), JSON.stringify(r.pieces));
    assert.ok((r.actions ?? []).some((a) => a.target === "remesas.personas"));
  });

  it("el reparto igual entre la lista nombrada divide el total y declara el centavo", () => {
    const r = ask(fixture(), "La cuenta fue de 90 dólares, reparte entre mamá, Carlos y yo");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.equal(r.pieces.length, 3);
    assert.ok(r.pieces.every((p) => p.minor === 3000), JSON.stringify(r.pieces));
  });

  it("la contradicción se dice: los repartos no pueden sumar más que el total", () => {
    const r = ask(fixture(), "Reparte los 100 dólares: 60 para mamá y 60 para Carlos");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.ok(/se pasan/.test(r.verdict), r.verdict);
  });

  it("el reparto ANÓNIMO sigue siendo de la calculadora — nada se roba", () => {
    const r = ask(fixture(), "Si divido 1500 dólares en tres partes, ¿cómo me quedaría?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
  });
});

describe("banco · ola 17: el aprendizaje que se cuenta y que propone", () => {
  const ledger = fixture();
  const askL = (raw: string, store: LearnedAlias[]) => answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY, undefined, undefined, store);

  it("el uso se cuenta sin aprender nada nuevo: touchAlias mide, no crea", () => {
    let store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    store = touchAlias(store, "la luz");
    store = touchAlias(store, "la luz");
    assert.equal(store.length, 1);
    assert.equal(store[0].uses, 2);
    assert.equal(frequentAliases(store).length, 0);
    store = touchAlias(store, "la luz");
    assert.equal(frequentAliases(store).length, 1);
    assert.equal(store[0].hits, 1); // las confirmaciones no se inflan con usos
  });

  it("«¿qué has aprendido?» cuenta la lista legible — y con 3+ usos, PROPONE la predeterminada", () => {
    let store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    store = touchAlias(touchAlias(touchAlias(store, "la luz"), "la luz"), "la luz");
    const r = askL("¿Qué has aprendido de mí?", store);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "aprendizaje");
    assert.ok(r.verdict.includes("«la luz»"), r.verdict);
    assert.ok(r.proposal && r.proposal.word === "la luz", JSON.stringify(r.proposal));
  });

  it("sin patrones, el vacío honesto: cómo se aprende, sin lista inventada", () => {
    const r = askL("¿Qué has aprendido de mí?", []);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "aprendizaje");
    assert.ok(/Todavía no he aprendido/.test(r.verdict), r.verdict);
    assert.equal(r.proposal, undefined);
  });

  it("«olvida el patrón de la luz» viaja como señal: la caja aplica el olvido", () => {
    const store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    const r = askL("Olvida el patrón de la luz", store);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "aprendizaje");
    assert.equal(r.forgetWord, "la luz");
  });

  it("el alias de PERSONA manda en la acción de remesa: «mami» propone a Mamá", () => {
    const store = learnAlias([], "mami", "mama", "person", "correction");
    const r = askL("Quiero enviarle 50 dólares a mami", store);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "acciones");
    assert.ok((r.actions ?? []).some((a) => /Mamá/.test(a.label)), JSON.stringify(r.actions));
  });

  it("describeLearned da la lista como dato: palabra → ciudadano, con sus conteos", () => {
    const store = learnAlias([], "la luz", "f.casa.servicios", "sub", "card-tap");
    const rows = describeLearned(store, (id) => (id === "f.casa.servicios" ? "Servicios" : id));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].word, "la luz");
    assert.equal(rows[0].name, "Servicios");
    assert.equal(rows[0].uses, 0);
  });
});

describe("banco · ola 18: la batería del mundo II (el habla real, las clases cazadas)", () => {
  const withCard = () => addReading(fixture(), "card-chase", { balanceMinor: 100000, src: "manual", on: "2026-10-05" }, "2026-10-05");

  it("el simulador oye la calle: «le meto», «pagando», «if I pay»", () => {
    const r = ask(withCard(), "si le meto 50 mas al mes a la tarjeta cuando termino");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "simulador");
    const r2 = ask(withCard(), "pagando 100 al mes de mis deudas en cuanto salgo");
    assert.equal(r2.kind, "answer");
    if (r2.kind === "answer") assert.equal(r2.family, "simulador");
  });

  it("la estacionalidad oye «se me va» — y comparar ya no la disfraza de «mejor mes»", () => {
    const r = ask(fixture(), "en que mes se me va mas dinero");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "estacionalidad");
    const r2 = ask(fixture(), "which month do i spend the most");
    assert.equal(r2.kind, "answer");
    if (r2.kind === "answer") assert.equal(r2.family, "estacionalidad");
  });

  it("el reparto oye «éramos» y oye los repartos sin verbo", () => {
    const r = ask(fixture(), "la cuenta fue de 60, eramos mama, carlos y yo, cuanto nos toca");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "reparto");
    assert.ok(r.pieces.every((p) => p.minor === 2000), JSON.stringify(r.pieces));
    const r2 = ask(fixture(), "40 para mama, 30 para carlos y 50 para mi, cuanto es el total");
    assert.equal(r2.kind, "answer");
    if (r2.kind !== "answer") return;
    assert.equal(r2.family, "reparto");
    assert.ok(r2.verdict.includes(formatMoney(12000, "USD", "es")), r2.verdict);
  });

  it("«mi tarjeta cuanto debo» — la preposición se busca como palabra entera, no dentro de «tarjeta»", () => {
    const r = ask(fixture(), "mi tarjeta cuanto debo");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "deudas");
  });

  it("el calendario oye «cuando me toca pagar» y el día a secas trae su día de la semana", () => {
    const r = ask(fixture(), "cuando me toca pagar el internet");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "calendario");
    const r2 = ask(fixture(), "que dia cae el 28");
    assert.equal(r2.kind, "answer");
    if (r2.kind !== "answer") return;
    assert.equal(r2.family, "calendario");
    assert.ok(r2.verdict.includes("miércoles"), r2.verdict); // 2026-10-28
  });

  it("la calculadora oye las fracciones en palabras: la mitad, el doble", () => {
    const r = ask(fixture(), "cuanto es la mitad de 90 dolares");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.verdict.includes(formatMoney(4500, "USD", "es")), r.verdict);
  });

  it("«¿gasté mucho?» se responde con medidas, no con un adjetivo vendido", () => {
    const r = ask(fixture(), "gaste mucho este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(/no te vendo un adjetivo/.test(r.verdict), r.verdict);
  });

  it("la premisa sin «si» se separa del dato: consta hoy X, con tu premisa serían Y", () => {
    const r = ask(fixture(), "me entraron 200 mas, cuanto tengo en ahorros ahora");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes(formatMoney(149900, "USD", "es")), r.verdict);
  });
});

describe("banco · ola 19: el marco que queda (el seguimiento por sustitución de eje)", () => {
  const ledger = fixture();
  const askF = (raw: string, convo?: import("./ask2.ts").ConvoFrame | null) =>
    answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY, undefined, undefined, undefined, convo ?? undefined);

  it("toda respuesta nace con su marco: pregunta, familia y ejes detectados", () => {
    const r = askF("¿Cuánto gasté este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.convo, "sin marco");
    assert.equal(r.convo?.periodPhrase, "este mes");
    assert.equal(r.convo?.family, r.family);
  });

  it("«¿y el mes pasado?» sustituye SOLO el período y hace eco del cambio", () => {
    const first = askF("¿Cuánto gasté este mes?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const r = askF("¿Y el mes pasado?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, first.family);
    assert.ok(r.verdict.includes(formatMoney(5000, "USD", "es")), r.verdict); // septiembre: la camisa
    assert.ok(/cambié solo el período/.test(r.note ?? ""), r.note ?? "");
    // Y la cadena sigue: el marco nuevo trae la pregunta reescrita.
    assert.ok((r.convo?.question ?? "").includes("mes pasado"), r.convo?.question);
  });

  it("«¿y Ana?» sustituye solo la persona; «no, en septiembre» repara el período", () => {
    const first = askF("¿Cuánto me debe Carlos?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    assert.equal(first.convo?.personName, "carlos");
    const r = askF("¿Y Ana?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(10000, "USD", "es")), r.verdict);
    const g = askF("¿Cuánto gasté este mes?");
    assert.equal(g.kind, "answer");
    if (g.kind !== "answer") return;
    const rep = askF("No, en septiembre", g.convo);
    assert.equal(rep.kind, "answer");
    if (rep.kind === "answer") assert.ok(rep.verdict.includes(formatMoney(5000, "USD", "es")), rep.verdict);
  });

  it("sin marco, el seguimiento solo sigue en silencio honesto — nada se inventa", () => {
    assert.equal(askF("¿Y el mes pasado?").kind, "unknown");
    assert.equal(askF("¿Y Ana?").kind, "unknown");
  });

  it("una pregunta NUEVA con forma de seguimiento no se secuestra: el resto tras el eje la delata", () => {
    const first = askF("¿Cuánto gasté este mes?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const r = askF("¿Y en septiembre cuánto me debe Carlos?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "deudas");
  });
});

describe("banco · ola 20: las dos cazas del instrumento (horizonte y contraste)", () => {
  const ledger = fixture();

  it("la agenda oye «¿qué tengo que pagar…?» y el horizonte nombrado manda sobre la ventana", () => {
    const manana = ask(ledger, "¿Qué tengo que pagar mañana?");
    assert.equal(manana.kind, "answer");
    if (manana.kind === "answer") {
      assert.equal(manana.family, "agenda");
      assert.ok(!manana.pieces.some((p) => p.label.includes("Internet")), manana.verdict);
      assert.ok(/mañana/.test(manana.verdict), manana.verdict);
    }
    const mes = ask(ledger, "¿Qué tengo que pagar este mes?");
    assert.equal(mes.kind, "answer");
    if (mes.kind === "answer") assert.ok(mes.pieces.some((p) => p.label.includes("Internet")), mes.verdict);
  });

  it("el contraste manda: «no quiero saber cuánto debo, quiero saber cuánto me deben» responde el lado pedido", () => {
    const r = ask(ledger, "No quiero saber cuánto debo, quiero saber cuánto me deben");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes(formatMoney(40000, "USD", "es")), r.verdict); // Carlos 300 + Ana 100
    assert.ok(!/No debes nada/.test(r.verdict), r.verdict);
  });
});

describe("banco · ola 21: qué dato te falta + ¿por qué?", () => {
  const ledger = fixture();
  const askF = (raw: string, convo?: import("./ask2.ts").ConvoFrame | null) =>
    answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY, undefined, undefined, undefined, convo ?? undefined);

  it("el patrimonio: cuenta la parte que el libro sí guarda y NOMBRA el dato que falta", () => {
    const r = ask(ledger, "¿Cuál es mi patrimonio neto?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes(formatMoney(129900, "USD", "es")), r.verdict); // el stock
    assert.ok(/valor de tus bienes/.test(r.note ?? ""), r.note ?? "");
  });

  it("el puntaje: no vive en el libro, y se dice dónde vive", () => {
    const r = ask(ledger, "¿Cuál es mi puntaje de crédito?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(/burós/.test(r.verdict), r.verdict);
  });

  it("el «¿por qué?» despliega las piezas y la fuente del marco — y el marco sobrevive", () => {
    const first = askF("¿Cuánto gasté este mes?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const r = askF("¿De dónde sale ese número?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(r.verdict.includes(formatMoney(32456, "USD", "es")), r.verdict);
    assert.ok((r.source ?? []).includes("libros.lineas"), JSON.stringify(r.source));
    // El marco sobrevive al porqué: el seguimiento sigue funcionando.
    const fu = askF("¿Y el mes pasado?", r.convo);
    assert.equal(fu.kind, "answer");
  });

  it("la costura §20↔banco: tras un seguimiento §20, el «¿por qué?» despliega la respuesta DE LA PANTALLA", () => {
    // La caja viva, imitada paso a paso: la primera respuesta trae
    // los dos marcos; el §20 responde el seguimiento; la costura
    // renueva el marco conversacional con ESA respuesta; el porqué
    // despliega las piezas del seguimiento, no las de la primera.
    const first = askF("¿Cuánto gasté este mes?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const names = makeNamer(ledger.structure, "es");
    const fu = answerFollowUp(ledger, KEY, "es", names, "¿Y el mes pasado?", ctx(ledger), TODAY, first.frame ?? null, undefined, undefined);
    assert.ok(fu && fu.kind === "answer", "el §20 responde el seguimiento");
    if (!fu || fu.kind !== "answer") return;
    const convo2 = convoAfterFollowUp(ledger, KEY, names, first.convo ?? null, "¿Y el mes pasado?", TODAY, fu);
    const r = askF("¿Por qué?", convo2);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(r.verdict.includes("el mes pasado"), r.verdict);
    for (const p of fu.pieces) assert.ok(r.pieces.some((x) => x.minor === p.minor), r.verdict);
  });

  it("el «¿por qué?» sin marco no inventa una cuenta: pide la cifra primero", () => {
    const r = askF("¿Por qué dices eso?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(/pregúntame primero la cifra/.test(r.verdict), r.verdict);
  });

  it("la puerta estrecha: «¿por qué medio…?» NO es el porqué de la procedencia", () => {
    const first = askF("¿Cuánto gasté este mes?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const r = askF("¿Por qué medio pagué el internet?", first.convo);
    if (r.kind === "answer") assert.notEqual(r.family, "porque");
  });

  it("el oído nombra las dos familias nuevas", () => {
    assert.equal(classifyBankQuestion("¿Cuál es mi patrimonio neto?").family, "falta");
    assert.equal(classifyBankQuestion("¿De dónde sale ese número?").family, "porque");
  });
});

describe("banco · ola 22: las series recurrentes", () => {
  it("la subida se mide contra la MEDIANA de la serie, no contra el primer precio", () => {
    const ledger = fixture();
    ledger.months["2026-08"] = { lines: [line({ id: "cuotaA", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4599, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, bookedOn: "2026-08-28", monthKey: "2026-08" })] };
    const r = ask(ledger, "¿Me subió alguna suscripción?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "series");
    assert.ok(r.verdict.includes("Internet"), r.verdict);
    assert.ok(r.verdict.includes(formatMoney(4999, "USD", "es")), r.verdict);
  });

  it("una serie que siempre baila no acusa por bailar: su variación es la cerca", () => {
    const ledger = fixture();
    ledger.months["2026-08"] = { lines: [line({ id: "cuotaA", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, bookedOn: "2026-08-28", monthKey: "2026-08" })] };
    ledger.months[PREV].lines.push(line({ id: "cuotaS", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 5199, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, bookedOn: "2026-09-28", monthKey: PREV }));
    const r = ask(ledger, "¿Ha subido el precio de algo que pago?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "series");
    assert.ok(/Ninguna suscripción anotada subió/.test(r.verdict), r.verdict);
  });

  it("la cuota que no llegó: la fecha pasó y no hay cobro nuevo anotado — la ausencia se reporta, no se afirma", () => {
    const ledger = fixture();
    const cuota = ledger.months[KEY].lines.find((l) => l.id === "cuota1");
    if (cuota) cuota.nextDue = "2026-10-10";
    const r = ask(ledger, "¿Qué suscripción no se cobró?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "series");
    assert.ok(r.verdict.includes("Internet"), r.verdict);
    assert.ok(/hace 12 días/.test(r.verdict), r.verdict);
    const clean = ask(fixture(), "¿Qué suscripción no se cobró?");
    assert.equal(clean.kind, "answer");
    if (clean.kind === "answer") assert.ok(/Nada falta por cobrarse/.test(clean.verdict), clean.verdict);
  });

  it("el costo anualizado: por serie nombrada y el conjunto, con el ritmo dicho", () => {
    const ledger = fixture();
    const one = ask(ledger, "¿Cuánto me cuesta el internet al año?");
    assert.equal(one.kind, "answer");
    if (one.kind === "answer") {
      assert.equal(one.family, "series");
      assert.ok(one.verdict.includes(formatMoney(59988, "USD", "es")), one.verdict);
    }
    const all = ask(ledger, "¿Cuánto me cuestan mis suscripciones al año?");
    assert.equal(all.kind, "answer");
    if (all.kind === "answer") assert.ok(all.verdict.includes(formatMoney(59988, "USD", "es")), all.verdict);
  });

  it("el oído nombra la familia series", () => {
    assert.equal(classifyBankQuestion("¿Me subió alguna suscripción?").family, "series");
  });
});

describe("banco · ola 23: la quincena, período propio", () => {
  const ledger = fixture(); // hoy = 22 de octubre: la quincena en curso es la segunda (16–31)

  it("la primera quincena suma SOLO sus días (la línea sin día del mes vive el día 1, la convención de lineDate)", () => {
    const r = ask(ledger, "¿Cuánto gasté en la primera quincena?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    // casa (día 1) + internet (su fecha cae el día 1 por convención) +
    // remesa (10) + zapatos (15) = el mes entero en este fixture, pero
    // por la ventana 1–15, no por el mes: la segunda mitad da cero.
    assert.ok(r.verdict.includes(formatMoney(32456, "USD", "es")), r.verdict);
    assert.ok(/primera quincena/.test(r.verdict), r.verdict);
  });

  it("esta quincena (16–31) y la pasada (1–15) NO son la misma ventana — ni el mes disfrazado", () => {
    const esta = ask(ledger, "¿Cuánto gasté esta quincena?");
    const pasada = ask(ledger, "¿Cuánto gasté la quincena pasada?");
    assert.equal(esta.kind, "answer");
    assert.equal(pasada.kind, "answer");
    if (esta.kind === "answer" && pasada.kind === "answer") {
      assert.ok(esta.verdict.includes(formatMoney(0, "USD", "es")), esta.verdict);
      assert.ok(/esta quincena/.test(esta.verdict), esta.verdict);
      assert.ok(pasada.verdict.includes(formatMoney(32456, "USD", "es")), pasada.verdict);
    }
  });

  it("una línea del día 20 cae SOLO en la segunda quincena: la ventana corta de verdad", () => {
    const local = fixture();
    local.months[KEY].lines.push(line({ id: "tarde", kind: "purchase" as LineKind, concept: "Libros", amountMinor: 3000, categoryId: "f-otros", bookedOn: "2026-10-20" }));
    const esta = ask(local, "¿Cuánto gasté esta quincena?");
    const primera = ask(local, "¿Cuánto gasté en la primera quincena?");
    assert.equal(esta.kind, "answer");
    assert.equal(primera.kind, "answer");
    if (esta.kind === "answer") assert.ok(esta.verdict.includes(formatMoney(3000, "USD", "es")), esta.verdict);
    if (primera.kind === "answer") assert.ok(!primera.verdict.includes(formatMoney(35456, "USD", "es")), primera.verdict);
  });

  it("el marco hereda la quincena: el seguimiento cambia de mitad", () => {
    const askF = (raw: string, convo?: import("./ask2.ts").ConvoFrame | null) =>
      answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY, undefined, undefined, undefined, convo ?? undefined);
    const first = askF("¿Cuánto gasté la quincena pasada?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    assert.equal(first.convo?.periodPhrase, "la quincena pasada");
    const r = askF("¿Y esta quincena?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(r.verdict.includes(formatMoney(0, "USD", "es")), r.verdict);
  });
});

describe("banco · ola 24: el oído fino + la sensibilidad", () => {
  const ledger = fixture();

  it("el diminutivo se oye: «zapatitos» encuentra los Zapatos del libro", () => {
    const r = ask(ledger, "¿Cuánto gasté en zapatitos este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes(formatMoney(8000, "USD", "es")), r.verdict);
  });

  it("la excepción manda: «zapatillas» NO son los Zapatos — la palabra lexicalizada no se toca", () => {
    const r = ask(ledger, "¿Cuánto gasté en zapatillas este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(/zapatillas/.test(r.verdict), r.verdict); // la cerca de lo no anotado, con su nombre intacto
  });

  it("la excepción raíz: «necesito» no se despoja — la meta sigue oyéndose", () => {
    const r = ask(ledger, "¿Cuánto necesito ahorrar al mes para tener 2000 en diciembre?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "meta");
  });

  it("el enclítico se separa: «dejándolo de gastar» oye el contrafactual", () => {
    const r = ask(ledger, "¿Cuánto ahorraría dejándolo de gastar en zapatos?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.equal(r.family, "contrafactual");
  });

  it("el voseo se oye: «¿cuánto tenés en ahorros?» llega a su familia", () => {
    const r = ask(ledger, "¿Cuánto tenés en ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.ok(r.verdict.includes(formatMoney(129900, "USD", "es")), r.verdict);
  });

  it("la sensibilidad absoluta: «si el internet sube a 60» recalcula el mes con esa línea sustituida", () => {
    const r = ask(ledger, "¿Y si el internet sube a 60 dólares?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes(formatMoney(33457, "USD", "es")), r.verdict); // 32456 − 4999 + 6000
    assert.ok(r.verdict.includes(formatMoney(1001, "USD", "es")), r.verdict);
  });

  it("la sensibilidad delta: «si la casa sube 10 dólares» suma el delta, no sustituye el precio", () => {
    const r = ask(ledger, "¿Y si la casa sube 10 dólares?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes(formatMoney(33456, "USD", "es")), r.verdict); // 32456 + 1000
  });
});

describe("banco · las trampas y los silencios", () => {
  const ledger = fixture();

  it("«sin tocar mis ahorros» sigue siendo free, no ahorros", () => {
    const r = ask(ledger, "¿Cuánto puedo sacar sin tocar mis ahorros?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "free");
  });

  it("la opinión y lo desconocido siguen en silencio honesto", () => {
    assert.equal(ask(ledger, "¿Debería invertir mi dinero?").kind, "unknown");
    assert.equal(ask(ledger, "¿Cuál es el sentido de la vida?").kind, "unknown");
    assert.equal(ask(ledger, "¿Y en tiendas?").kind, "unknown");
  });

  it("lo heredado de la 5a sigue vivo a través del banco", () => {
    const spend = ask(ledger, "¿Puedo gastar $100 en zapatos?");
    assert.equal(spend.kind, "answer");
    if (spend.kind === "answer") assert.equal(spend.family, "spend");
    const how = ask(ledger, "¿Cómo voy?");
    assert.equal(how.kind, "answer");
    if (how.kind === "answer") assert.equal(how.family, "how");
  });

  it("FARO MISMO responde desde el mapa, con pantalla", () => {
    const r = ask(ledger, "¿Dónde veo mis recompensas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "faro-mismo");
    assert.ok(r.source.includes("cobros.tarjetas"));
  });

  it("los chips del banco son las preguntas de Oscar", () => {
    assert.equal(bankChips("es").length, 6);
    assert.ok(bankChips("es")[0].includes("ahorros"));
  });
});

describe("banco · las cercas del mapa y del banco", () => {
  it("toda familia viva declara fuentes que existen en el mapa", () => {
    const ids = new Set(FARO_FUNCTION_MAP.map((f) => f.id));
    for (const fam of liveFamilies()) {
      assert.ok(fam.source.length > 0, fam.id);
      for (const s of fam.source) assert.ok(ids.has(s), `${fam.id} → ${s}`);
    }
  });

  it("toda familia del banco trae canónicas en los dos idiomas y sus silencios", () => {
    for (const fam of QUESTION_BANK) {
      assert.ok(fam.canonical.es.length > 0, fam.id);
      assert.ok(fam.canonical.en.length > 0, fam.id);
      assert.ok(fam.silences.length > 0, fam.id);
      assert.ok(fam.axes.length > 0, fam.id);
    }
  });

  it("el mapa cubre las trece áreas de Faro", () => {
    // OLA 26 (Familia 10): el área es un par {es, en} desde esta cura;
    // la cobertura se sigue juzgando sobre el nombre español, y la
    // completitud de los dos nombres la clava la cerca de la ola 26.
    const areas = new Set(FARO_FUNCTION_MAP.map((f) => f.area.es));
    for (const a of ["Central", "Libros", "Cobros", "Ahorros", "Estudio", "Asesor", "Folios", "Captura", "Mesa de cambio", "Ajustes", "Cuenta"]) {
      assert.ok(areas.has(a), a);
    }
  });

  it("cero fabricación: el motor de respuestas no conoce commit ni upsertLine", () => {
    const src = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
    assert.ok(!/upsertLine|commitDrafts/.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
  });
});

describe("banco · ola 25: la respuesta que se entiende y la verificación (especímenes de Oscar en su teléfono)", () => {
  const ledger = fixture();
  // Un libro con queda positiva y sin inundación de ahorro: el
  // fixture grande vierte $1,299 a PayPal y su queda nace negativa,
  // así que las tres ramas de la verificación se miden aquí.
  // Queda $750.01; días que quedan, 10; ritmo seguro, $75.00.
  const libroVerificacion = (() => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.servicios" }),
        line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
      ],
    };
    l.settings.display = "USD";
    return l;
  })();

  it("el hipotético en pesos nombra la conversión y la base por su naturaleza — nada de «base de hoy» ni «del si»", () => {
    const r = ask(ledger, "¿Cuánto me queda si gasto 300 pesos en zapatos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes("C$300.00"), r.verdict);
    assert.ok(r.verdict.includes("Mesa de cambio"), r.verdict);
    // OLA 26 (U1): la base del fixture es negativa — se traduce, no se
    // imprime entre paréntesis.
    assert.ok(r.verdict.includes("ya va en negativo"), r.verdict);
    assert.ok(r.verdict.includes("salió más de lo que entró"), r.verdict);
    assert.ok(!r.verdict.includes("base de hoy"), r.verdict);
    assert.ok(!r.verdict.includes("del «si»"), r.verdict);
    assert.ok(r.pieces.every((p) => p.label !== "Monto 1"), JSON.stringify(r.pieces));
  });

  it("el hipotético en la moneda de la vista nombra el monto por su papel, no por clave interna", () => {
    const r = ask(ledger, "¿Cuánto me queda si gasto $50 en zapatos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes("que gastarías"), r.verdict);
    assert.ok(!r.verdict.includes("del «si»"), r.verdict);
  });

  it("la verificación: el monto que cabe en el ritmo de hoy dice que sí, con las dos varas a la vista", () => {
    const r = ask(libroVerificacion, "¿Tengo $20 para gastar hoy?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.startsWith("Sí:"), r.verdict);
    assert.ok(r.pieces.some((p) => p.label === "Tu ritmo seguro de hoy"), JSON.stringify(r.pieces));
    assert.ok((r.actions ?? []).length > 0);
  });

  it("la verificación: el monto que pasa el ritmo pero no la queda dice el costo en días y el ritmo nuevo", () => {
    const r = ask(libroVerificacion, "¿Tengo $100 para gastar hoy?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("pasa tu ritmo seguro de hoy"), r.verdict);
    assert.ok(r.verdict.includes("desde mañana tu ritmo baja"), r.verdict);
  });

  it("la verificación: el monto que no alcanza dice cuánto falta", () => {
    const r = ask(libroVerificacion, "¿Tengo $900 para gastar hoy?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("No alcanza"), r.verdict);
    assert.ok(r.verdict.includes("te faltan"), r.verdict);
  });

  it("la verificación en pesos nombra la conversión en la nota", () => {
    const r = ask(libroVerificacion, "¿Tengo 300 pesos para gastar hoy?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok((r.note ?? "").includes("C$300.00"), r.note ?? "");
    assert.ok((r.note ?? "").includes("Mesa de cambio"), r.note ?? "");
  });

  it("la verificación habla inglés y no secuestra la pregunta de la tienda (esa pide su cuenta)", () => {
    const en = ask(libroVerificacion, "Do I have $20 to spend today?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") assert.equal(en.family, "promedio");
    const shop = ask(ledger, "¿Puedo gastar $100 en zapatos?");
    assert.ok(!(shop.kind === "answer" && shop.family === "promedio" && shop.verdict.includes("ritmo seguro")), "la de zapatos no es verificación");
  });

  it("la forma nombrada: el monto lo sabe el libro — «¿me alcanza para pagar el Internet?» ya no pide la cifra", () => {
    for (const q of ["¿Me alcanza para pagar el Internet?", "¿Puedo pagar el Internet?", "¿Tengo para pagar el Internet de este mes?"]) {
      const r = ask(libroVerificacion, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "promedio", q);
      assert.ok(r.verdict.includes("Internet"), `${q} → ${r.verdict}`);
      assert.ok(r.verdict.includes("$49.99"), `${q} → ${r.verdict}`);
    }
  });

  it("la forma desnuda del ritmo: «¿cuánto puedo gastar?» y «¿tengo dinero para hoy?» reciben LA cifra, no una petición de cifra", () => {
    for (const q of ["¿Cuánto puedo gastar?", "¿Tengo dinero para hoy?"]) {
      const r = ask(libroVerificacion, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "promedio", q);
      assert.ok(r.verdict.includes("$75.00"), `${q} → ${r.verdict}`);
    }
    const gustos = ask(libroVerificacion, "¿Cuánto puedo gastar en gustos?");
    assert.ok(!(gustos.kind === "answer" && gustos.family === "promedio"), "los gustos no son del promedio desnudo");
  });
});

describe("banco · ola 26: la respuesta útil (la caza de utilidad, clase por clase)", () => {
  const ledger = fixture();
  it("U2 · la regla juzga sus tres cubos, y el apartado por encima es a favor — dicho", () => {
    const r = ask(ledger, "¿Estoy dentro de la regla 50 30 20?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "regla");
    assert.ok(r.verdict.includes("En palabras:"), r.verdict);
    assert.ok(r.verdict.includes("apartado por encima de su número — y en este cubo, por encima juega a tu favor"), r.verdict);
  });

  it("U3 · extremos: el segundo también tiene nombre", () => {
    const r = ask(ledger, "¿Cuál ha sido el gasto más grande que he hecho?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "extremos");
    assert.ok(r.pieces.some((p) => p.label === "El segundo: Zapatos"), JSON.stringify(r.pieces));
  });

  it("U3 · la calculadora: el rótulo también vive atrás — «mamá me dio 150» ya no es «Monto 3»", () => {
    const r = ask(ledger, "Si me regalaron 300 dólares de cumpleaños, 200 de aumento y mamá me dio 150, ¿cuánto sería?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora");
    assert.ok(r.pieces.some((p) => p.label === "mamá"), JSON.stringify(r.pieces));
    assert.ok(r.pieces.every((p) => !/^Monto \d+$/.test(p.label)), JSON.stringify(r.pieces));
  });

  it("U4 · historia concuerda: «de 1 línea», no «de 1 líneas»", () => {
    const r = ask(ledger, "¿Cuánto gasté el mes pasado en tiendas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("de 1 línea."), r.verdict);
    assert.ok(!r.verdict.includes("de 1 líneas"), r.verdict);
  });

  it("U5 · estacionalidad ya no disfraza: el filtro que no resuelve nombra su ausencia", () => {
    const r = ask(ledger, "¿En qué mes gasto más en el súper?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "estacionalidad");
    assert.ok(r.verdict.includes("No tengo nada anotado como «super»"), r.verdict);
    const plain = ask(ledger, "¿En qué mes gasto más?");
    assert.equal(plain.kind, "answer");
    if (plain.kind === "answer") assert.ok(plain.verdict.includes("Tu mes más fuerte es"), plain.verdict);
  });

  it("U5 · frecuencia: la palabra sin ciudadano nombra su ausencia en vez de callar", () => {
    const r = ask(ledger, "¿Cuántas veces fui al súper este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
    assert.ok(r.verdict.includes("No tengo nada anotado como «super»"), r.verdict);
  });

  it("U5 · el contrafactual: dejar de gastar en lo que no existe junta $0 — dicho, no callado", () => {
    const r = ask(ledger, "Si dejo de gastar en comida rápida, ¿cuánto junto en un año?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "contrafactual");
    assert.ok(r.verdict.includes("No tienes gasto anotado como «comida»"), r.verdict);
    assert.ok(r.verdict.includes("$0"), r.verdict);
  });

  it("U5 · comparar: los dos lados vacíos se nombran, y el lado vacío va en $0 dicho", () => {
    const r = ask(ledger, "¿En qué se fue más, en comida o en transporte?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("En «comida» no tienes nada anotado"), r.verdict);
    assert.ok(r.verdict.includes("en «transporte» tampoco hay gasto anotado este mes"), r.verdict);
    assert.ok(r.verdict.includes("no hay un «más» que declarar"), r.verdict);
    const one = ask(ledger, "¿Gasté más en zapatos o en transporte?");
    assert.equal(one.kind, "answer");
    if (one.kind !== "answer") return;
    assert.equal(one.family, "comparar");
    assert.ok(one.verdict.includes("en «transporte» no tienes nada anotado ($0)"), one.verdict);
    assert.ok(one.verdict.includes("gana «zapatos» por $80.00"), one.verdict);
  });

  it("U8 · remesas persona × período: el año, el total y el período vacío con su cero", () => {
    const year = ask(ledger, "¿Cuánto he enviado a mamá este año?");
    assert.equal(year.kind, "answer");
    if (year.kind === "answer") {
      assert.equal(year.family, "remesas");
      assert.ok(year.verdict.includes("este año"), year.verdict);
      assert.ok(year.verdict.includes("$170.00"), year.verdict);
      assert.ok(year.verdict.includes("1 envío"), year.verdict);
    }
    const total = ask(ledger, "¿Cuánto he enviado a mamá?");
    assert.equal(total.kind, "answer");
    if (total.kind === "answer") {
      assert.equal(total.family, "remesas");
      assert.ok(total.verdict.includes("en total"), total.verdict);
      assert.ok(total.verdict.includes("$170.00"), total.verdict);
    }
    const empty = ask(ledger, "¿Cuánto he enviado a mamá en septiembre?");
    assert.equal(empty.kind, "answer");
    if (empty.kind === "answer") {
      assert.equal(empty.family, "remesas");
      // En el canon la sirve remesaPersonaAnswer (Q27-3/Q30-2): el
      // cero del período se dice CON el total al lado — el contrato U8.
      assert.ok(empty.verdict.includes("No hay envíos a Mamá"), empty.verdict);
      assert.ok(empty.verdict.includes("En total le van $170.00"), empty.verdict);
    }
    // El presente con monto sigue siendo intención (acciones), no patrón:
    const intent = ask(ledger, "Envío 50 a mamá, 30 para los niños, 40 para resolver y 10 para la comida");
    assert.ok(!(intent.kind === "answer" && intent.family === "remesas"), "la intención con monto no es remesas");
  });

  it("U1 · el promedio con la queda en negativo traduce el cero: el mes ya va por encima", () => {
    const r = ask(ledger, "¿Cuánto puedo gastar?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("Hoy no hay margen"), r.verdict);
    assert.ok(r.verdict.includes("más de lo que entró"), r.verdict);
  });

  it("U6 · las fechas se dicen en palabras: la agenda y las suscripciones", () => {
    const ag = ask(ledger, "¿Cuáles son las primeras cuotas del mes que necesito pagar?");
    assert.equal(ag.kind, "answer");
    if (ag.kind === "answer") {
      assert.ok(ag.verdict.includes("28 de octubre de 2026"), ag.verdict);
      assert.ok(ag.pieces.some((p) => p.label.includes("28 de octubre de 2026")), JSON.stringify(ag.pieces));
    }
    const subs = ask(ledger, "¿Qué suscripciones tengo?");
    assert.equal(subs.kind, "answer");
    if (subs.kind === "answer") assert.ok(subs.verdict.includes("vence el 28 de octubre de 2026"), subs.verdict);
  });
});

/* OLA 27 integrada del banco: en el canon el grafo viaja en el
 * ConvoFrame (no en el marco §20 de la copia) — el askF de este
 * bloque pasa el marco conversacional, como el de la Ola 21. */
describe("banco · ola 27: el grafo que explica (el DAG tipado, el porqué recursivo, la ablación)", () => {
  const ledger = fixture();
  const libroChico = (() => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.servicios" }),
        line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
      ],
    };
    l.settings.display = "USD";
    return l;
  })();
  const askF = (book: LedgerState, raw: string, convo?: import("./ask2.ts").ConvoFrame | null) =>
    answerBankQuestion(book, KEY, "es", makeNamer(book.structure, "es"), raw, ctx(book), TODAY, undefined, undefined, undefined, convo ?? undefined);

  it("las familias compuestas nacen con grafo, y todo grafo vivo pasa sus cercas de tipo", () => {
    const cases: Array<[LedgerState, string]> = [
      [ledger, "¿Cuánto me queda si gasto $50 en zapatos?"],
      [ledger, "¿Cómo termino el mes?"],
      [libroChico, "¿Tengo $20 para gastar hoy?"],
      [libroChico, "¿Cuánto puedo gastar?"],
      [libroChico, "¿Cuánto me quedaría si gasto $100?"],
      [libroChico, "¿Me alcanza para pagar el Internet?"],
    ];
    for (const [book, q] of cases) {
      const r = ask(book, q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.ok(r.graph?.length, `sin grafo: ${q}`);
      assert.deepEqual(validateGraph(r.graph ?? []), [], `grafo inválido: ${q}`);
    }
  });

  it("el ¿por qué? nombra el nodo: el ritmo se explica como proyección con su regla", () => {
    const first = askF(libroChico, "¿Tengo $20 para gastar hoy?");
    assert.equal(first.kind, "answer");
    if (first.kind !== "answer") return;
    const r = askF(libroChico, "¿Por qué el ritmo?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(r.verdict.includes("Tu ritmo seguro de hoy"), r.verdict);
    assert.ok(r.verdict.includes("proyección"), r.verdict);
    assert.ok((r.note ?? "").includes("reparte parejo"), r.note ?? "");
    assert.equal(r.convo?.whyId, "ritmo");
  });

  it("el descenso: un «¿por qué?» desnudo baja a la pieza mayor, y la hoja se dice hoja", () => {
    const first = askF(libroChico, "¿Tengo $20 para gastar hoy?");
    if (first.kind !== "answer") return assert.fail("sin primera respuesta");
    const w1 = askF(libroChico, "¿Por qué el ritmo?", first.convo);
    if (w1.kind !== "answer") return assert.fail("sin porqué");
    const w2 = askF(libroChico, "¿Por qué?", w1.convo);
    assert.equal(w2.kind, "answer");
    if (w2.kind !== "answer") return;
    assert.ok(w2.verdict.includes("Queda del mes"), w2.verdict);
    assert.ok(w2.verdict.includes("el dato mismo"), w2.verdict);
    const w3 = askF(libroChico, "¿Por qué?", w2.convo);
    if (w3.kind === "answer") assert.ok(w3.verdict.includes("el dato mismo"), w3.verdict);
  });

  it("el ¿por qué? por la cifra: nombrar el monto abre su nodo", () => {
    const first = askF(libroChico, "¿Cuánto me quedaría si gasto $100?");
    if (first.kind !== "answer") return assert.fail("sin hipotético");
    const r = askF(libroChico, "¿Por qué $650.01?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(r.verdict.includes("proyección"), r.verdict);
    assert.ok(r.verdict.includes("Tu queda de hoy"), r.verdict);
  });

  it("el libro de supuestos: el «si» se lista con su origen, y la ablación lo quita con aritmética exacta", () => {
    const first = askF(libroChico, "¿Cuánto me quedaría si gasto $100?");
    if (first.kind !== "answer") return assert.fail("sin hipotético");
    const list = askF(libroChico, "¿Qué asumiste?", first.convo);
    assert.equal(list.kind, "answer");
    if (list.kind !== "answer") return;
    assert.ok(list.verdict.includes("el «si» que trajiste"), list.verdict);
    assert.ok(list.verdict.includes("vino de ti"), list.verdict);
    const abl = askF(libroChico, "¿Y sin ese supuesto?", first.convo);
    assert.equal(abl.kind, "answer");
    if (abl.kind !== "answer") return;
    assert.ok(abl.verdict.includes("$750.01"), abl.verdict);
  });

  it("la ablación de una regla: sin la regla no hay ritmo — y se ofrece la cifra medida que sí hay", () => {
    const first = askF(libroChico, "¿Cuánto puedo gastar?");
    if (first.kind !== "answer") return assert.fail("sin promedio");
    const abl = askF(libroChico, "¿Y sin ese supuesto?", first.convo);
    assert.equal(abl.kind, "answer");
    if (abl.kind !== "answer") return;
    assert.ok(abl.verdict.includes("no existe"), abl.verdict);
    assert.ok(abl.verdict.includes("Queda del mes"), abl.verdict);
    assert.ok(abl.verdict.includes("$750.01"), abl.verdict);
  });

  it("la síntesis nace proyectada y su supuesto es la regla del ritmo", () => {
    const r = ask(ledger, "¿Cómo termino el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    const root = (r.graph ?? []).find((n) => n.id === "cierre-proyectado");
    assert.ok(root, "sin nodo de cierre");
    assert.equal(root?.tense, "proyectado");
    assert.equal(root?.assumption?.origin, "regla");
  });

  it("las cercas del grafo cazan a sus mutantes: tiempo, moneda y stock×flujo", () => {
    const usd = "USD" as const;
    const badTime: AskNode[] = [{ id: "a", label: "A", minor: 1, tense: "medido", flow: "flujo", currency: usd, children: [{ id: "b", label: "B", minor: 1, tense: "proyectado", flow: "flujo", currency: usd }] }];
    assert.ok(validateGraph(badTime).some((v) => v.includes("tiempo")), JSON.stringify(validateGraph(badTime)));
    const badMoney: AskNode[] = [{ id: "a", label: "A", minor: 1, tense: "medido", flow: "flujo", currency: usd, children: [{ id: "b", label: "B", minor: 1, tense: "medido", flow: "flujo", currency: "NIO" as const }] }];
    assert.ok(validateGraph(badMoney).some((v) => v.includes("moneda")), JSON.stringify(validateGraph(badMoney)));
    const badFlow: AskNode[] = [{ id: "a", label: "A", minor: 1, tense: "stock", flow: "stock", currency: usd, children: [{ id: "b", label: "B", minor: 1, tense: "medido", flow: "flujo", currency: usd }] }];
    assert.ok(validateGraph(badFlow).some((v) => v.includes("stock×flujo")), JSON.stringify(validateGraph(badFlow)));
  });

  it("sin grafo, el ¿por qué? heredado sigue desplegando las piezas de siempre", () => {
    const first = askF(ledger, "¿Cuánto gasté este mes?");
    if (first.kind !== "answer") return assert.fail("sin total");
    assert.ok(!first.convo?.graph, "el total no declara grafo en v1");
    const r = askF(ledger, "¿De dónde sale ese número?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.ok(r.verdict.includes("Sale de tu pregunta"), r.verdict);
  });
});

/* OLA 28 integrada del banco: la pila vive en el ConvoFrame del
 * canon (forkName/exclusionName/repairs), y la reescritura conserva
 * las curas de la Ola 32 (palabra entera, eco solo al cambiar). */
describe("banco · ola 28: la pila de marcos (multi-eje, exclusión, presupuesto de reparación)", () => {
  const ledger = fixture();
  const askF = (raw: string, convo?: import("./ask2.ts").ConvoFrame | null) =>
    answerBankQuestion(ledger, KEY, "es", makeNamer(ledger.structure, "es"), raw, ctx(ledger), TODAY, undefined, undefined, undefined, convo ?? undefined);

  it("la exclusión directa: «sin la casa» resta su ciudadano y lo nombra con su cifra", () => {
    const r = ask(ledger, "¿Cuánto gasté este mes sin la casa?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 29999, JSON.stringify(r.pieces));
    assert.ok(r.verdict.includes("Sin contar «Casa»"), r.verdict);
    assert.ok(r.verdict.includes("$24.57"), r.verdict);
    assert.ok(r.pieces.some((p) => p.label.includes("Fuera de la cuenta") && p.minor === -2457), JSON.stringify(r.pieces));
  });

  it("la sobre-respuesta se absorbe entera: período y exclusión en un solo turno, con su eco doble", () => {
    const first = askF("¿Cuánto gasté este mes?");
    if (first.kind !== "answer") return assert.fail("sin base");
    assert.equal(first.convo?.forkName, "este mes");
    const r = askF("¿Y el mes pasado sin la camisa?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.equal(r.pieces[0].minor, 0, JSON.stringify(r.pieces));
    assert.ok(r.pieces.some((p) => p.minor === -5000), JSON.stringify(r.pieces));
    assert.ok((r.note ?? "").includes("el período a «el mes pasado»"), r.note ?? "");
    assert.ok((r.note ?? "").includes("la exclusión de «Camisa»"), r.note ?? "");
    assert.equal(r.convo?.exclusionName, "camisa");
    assert.ok((r.convo?.forkName ?? "").includes("sin camisa"), r.convo?.forkName);
  });

  it("la exclusión sola también es un eje: «¿y sin los zapatos?»", () => {
    const first = askF("¿Cuánto gasté este mes?");
    if (first.kind !== "answer") return assert.fail("sin base");
    const r = askF("¿Y sin los zapatos?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.pieces[0].minor, 24456, JSON.stringify(r.pieces));
    assert.ok((r.note ?? "").includes("excluí solo «Zapatos»"), r.note ?? "");
  });

  it("el presupuesto de reparación: la primera vez explica los ejes; la segunda abre la puerta", () => {
    const first = askF("¿Cuánto gasté este mes?");
    if (first.kind !== "answer") return assert.fail("sin base");
    const r1 = askF("¿Y Ana?", first.convo);
    assert.equal(r1.kind, "answer");
    if (r1.kind !== "answer") return;
    assert.equal(r1.family, "porque");
    assert.ok(r1.verdict.includes("no logro aplicarlo"), r1.verdict);
    assert.equal(r1.convo?.repairs, 1);
    assert.ok(!(r1.actions ?? []).length, "la primera reparación no abre la puerta todavía");
    const r2 = askF("¿Y Ana?", r1.convo);
    assert.equal(r2.kind, "answer");
    if (r2.kind !== "answer") return;
    assert.equal(r2.convo?.repairs, 2);
    assert.ok(r2.verdict.includes("camino seguro"), r2.verdict);
    assert.equal((r2.actions ?? []).length, 1);
  });

  it("la exclusión sobre un marco que no es de totales no se disfraza: cae en la reparación honesta", () => {
    const first = askF("¿Cuánto me debe Carlos?");
    if (first.kind !== "answer") return assert.fail("sin base");
    const r = askF("¿Y sin la camisa?", first.convo);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "porque");
    assert.equal(r.convo?.repairs, 1);
  });

  it("un seguimiento que SÍ se aplica resetea el presupuesto: el marco nuevo nace sin reparaciones", () => {
    const first = askF("¿Cuánto gasté este mes?");
    if (first.kind !== "answer") return assert.fail("sin base");
    const r1 = askF("¿Y Ana?", first.convo);
    if (r1.kind !== "answer") return assert.fail("sin reparación");
    const ok = askF("¿Y el mes pasado?", r1.convo);
    assert.equal(ok.kind, "answer");
    if (ok.kind !== "answer") return;
    assert.equal(ok.family, "historia");
    assert.ok(!ok.convo?.repairs, "el marco nuevo no hereda las reparaciones");
  });
});

/* OLA 29 integrada del banco: la prueba camina la ventana de
 * vencimientos expandida por cadencia; el menú de vueltas del pago
 * y del mes es de la Ola 32 y no se afirma aquí. */
describe("banco · ola 29: la factibilidad (la prueba sobre lo anotado, el pago en su día, el punto bajo)", () => {
  const PREV2 = "2026-09";
  const libroFactible = (() => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.servicios" }),
      ],
    };
    l.months[PREV2] = {
      lines: [
        line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, cadence: "monthly", nextDue: "2026-10-28", bookedOn: "2026-09-28", monthKey: PREV2 }),
      ],
    };
    l.settings.display = "USD";
    return l;
  })();
  const libroConflicto = (() => {
    let l = libroFactible;
    l = { ...l, months: { ...l.months, [PREV2]: { lines: [...(l.months[PREV2]?.lines ?? []), line({ id: "carro", kind: "subscription" as LineKind, concept: "Cuota carro", amountMinor: 90000, recurring: true, cadence: "monthly", nextDue: "2026-10-25", bookedOn: "2026-09-25", monthKey: PREV2 })] } } };
    return addLent(l, { id: "lentF", person: "Carlos", kind: "plain", amountMinor: 60000, currency: "USD", aprBps: 0, startedOn: "2026-10-01", dueOn: "2026-10-30", note: "" });
  })();

  it("«¿me alcanza el mes?» por fin responde: la prueba camina lo programado y cierra con su punto bajo", () => {
    const r = ask(libroFactible, "¿Me alcanza el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("Sí, con lo anotado sí"), r.verdict);
    assert.ok(r.verdict.includes("$750.01"), r.verdict);
    assert.ok(r.verdict.includes("28 de octubre"), r.verdict);
    assert.deepEqual(validateGraph(r.graph ?? []), []);
    assert.equal(classifyBankQuestion("¿Me alcanza el mes?").family, "factibilidad");
  });

  it("el conflicto se nombra: qué obligación, qué día, por cuánto — y el día no es el mes", () => {
    const r = ask(libroConflicto, "¿Me alcanza el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("No, con lo anotado no cabe todo"), r.verdict);
    assert.ok(r.verdict.includes("Cuota carro"), r.verdict);
    assert.ok(r.verdict.includes("25 de octubre"), r.verdict);
    assert.ok(r.verdict.includes("te faltan $100.00") || r.verdict.includes("faltan $100.00"), r.verdict);
    assert.ok(r.verdict.includes("no el mes"), r.verdict);
    assert.ok(r.verdict.includes("$450.01"), r.verdict);
  });

  it("el pago en su día: la prueba camina hasta el día y entonces cobra", () => {
    const si = ask(libroFactible, "¿Puedo pagar $200 el día 28?");
    assert.equal(si.kind, "answer");
    if (si.kind !== "answer") return;
    assert.equal(si.family, "factibilidad");
    assert.ok(si.verdict.includes("$550.01"), si.verdict);
    const no = ask(libroFactible, "¿Puedo pagar $800 el día 28?");
    assert.equal(no.kind, "answer");
    if (no.kind !== "answer") return;
    assert.ok(no.verdict.includes("te faltan $49.99"), no.verdict);
    const roll = ask(libroFactible, "¿Puedo pagar $100 el día 5?");
    assert.equal(roll.kind, "answer");
    if (roll.kind !== "answer") return;
    assert.ok(roll.verdict.includes("$650.01"), roll.verdict);
    assert.ok(roll.verdict.includes("5 de noviembre"), roll.verdict);
  });

  it("el punto bajo de 13 semanas: solo lo programado, y el ritmo aparte con su vara", () => {
    const r = ask(libroFactible, "¿Cuál es mi punto más bajo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("la 10"), r.verdict);
    assert.ok(r.verdict.includes("$650.03"), r.verdict);
    assert.ok(r.verdict.includes("$63.64"), r.verdict);
    assert.ok(r.verdict.includes("la 13"), r.verdict);
    assert.deepEqual(validateGraph(r.graph ?? []), []);
  });

  it("la queda que ya va en negativo se dice primero: no es lo que viene, es lo que ya salió", () => {
    const r = ask(fixture(), "¿Me alcanza el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("ya va en"), r.verdict);
    assert.ok(r.verdict.includes("654.92"), r.verdict);
    assert.ok((r.note ?? "").includes("ya está contado en tu queda"), r.note ?? "");
  });

  it("las formas de la verificación no se tocan: la de hoy y la de la cuota nombrada siguen suyas", () => {
    const hoy = ask(libroFactible, "¿Tengo $20 para gastar hoy?");
    assert.equal(hoy.kind, "answer");
    if (hoy.kind === "answer") assert.equal(hoy.family, "promedio");
    const named = ask(libroFactible, "¿Me alcanza para pagar el Internet?");
    assert.equal(named.kind, "answer");
    if (named.kind === "answer") assert.equal(named.family, "promedio");
  });
});

describe("banco · ola 30: la meta contra el piso (el fondo de amortización y el kit del ingreso volátil)", () => {
  const libroIngreso = (() => {
    const l = createInitial("es", "oscuro");
    const ahorro = l.structure.categories.find((c) => c.id === "f-ahorro");
    ahorro?.subs.push({ id: "f.ahorro.paypal", nameKey: "f.ahorro.paypal", customName: "PayPal", icon: "vault:paypal", hidden: false, order: 10 });
    const sal = (id: string, mk: string, minor: number) => line({ id, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: minor, bookedOn: `${mk}-05`, monthKey: mk });
    l.months["2026-07"] = { lines: [sal("s7", "2026-07", 80000)] };
    l.months["2026-08"] = { lines: [sal("s8", "2026-08", 120000)] };
    l.months["2026-09"] = { lines: [sal("s9", "2026-09", 90000)] };
    l.months[KEY] = {
      lines: [
        sal("s10", KEY, 100000),
        line({ id: "pp", kind: "expense-fixed" as LineKind, concept: "PayPal", amountMinor: 129900, categoryId: "f-ahorro", subId: "f.ahorro.paypal" }),
      ],
    };
    l.settings.display = "USD";
    return l;
  })();

  it("el kit: mediana, piso percentil 25 declarado, y el excedente de los meses buenos aparte", () => {
    const r = ask(libroIngreso, "¿Cuál es mi ingreso piso?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ingreso");
    assert.ok(r.verdict.includes("$800.00"), r.verdict);
    assert.ok(r.verdict.includes("$950.00"), r.verdict);
    assert.ok(r.verdict.includes("percentil 25"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.equal(classifyBankQuestion("¿Cuál es mi ingreso piso?").family, "ingreso");
  });

  it("la meta recta se juzga contra el piso, no contra el promedio — y el caso i=0 se declara", () => {
    const r = ask(libroIngreso, "¿Cuánto debo ahorrar para juntar $2000 en 4 meses?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
    assert.ok(r.verdict.includes("$175.25"), r.verdict);
    assert.ok(r.verdict.includes("22% de tu ingreso piso"), r.verdict);
    assert.ok((r.note ?? "").includes("a interés cero"), r.note ?? "");
    assert.deepEqual(validateGraph(r.graph ?? []), []);
  });

  it("con la tasa traída, el fondo de amortización despeja el apartado: lo guardado crece y el apartado cubre el resto", () => {
    const r = ask(libroIngreso, "¿Cuánto debo ahorrar para juntar $2000 en 4 meses con un interés del 12%?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
    assert.ok(r.verdict.includes("12%"), r.verdict);
    assert.ok(r.verdict.includes("crece a $1,351.74"), r.verdict);
    assert.ok(r.verdict.includes("$159.66"), r.verdict);
  });

  it("si el interés solo ya llega, se dice: no necesitas apartar más", () => {
    const r = ask(libroIngreso, "¿Cuánto debo ahorrar para juntar $1300 en 4 meses con un interés del 12%?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("Ni siquiera necesitas apartar más"), r.verdict);
  });

  it("con un solo mes de ingreso, el kit no inventa piso", () => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [line({ id: "s", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" })] };
    l.settings.display = "USD";
    const r = ask(l, "¿Mi ingreso es estable?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ingreso");
    assert.ok(r.verdict.includes("Solo hay un mes"), r.verdict);
  });

  it("«¿cuánto gano al mes?» no es del kit: sigue siendo de historia", () => {
    const r = ask(libroIngreso, "¿Cuánto gano al mes?");
    assert.equal(r.kind, "answer");
    if (r.kind === "answer") assert.notEqual(r.family, "ingreso");
  });
});

describe("banco · ola 31: el comparador de deudas (los dos caminos, el intermedio, cero recomendaciones)", () => {
  const deuda = (id: string, concept: string, balance: number, aprBps: number) =>
    line({ id, kind: "expense-fixed" as LineKind, concept, amountMinor: 1000, categoryId: "f-creditos", balanceMinor: balance, aprBps });
  const libroComparador = (() => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        deuda("da", "Tarjeta grande", 300000, 3600),
        deuda("db", "Préstamo amigo", 20000, 0),
        deuda("dc", "Consumo", 100000, 1000),
      ],
    };
    l.settings.display = "USD";
    return l;
  })();

  it("los dos caminos lado a lado: interés, meses, primer cierre y cierres al mes 6 — y el intermedio corrido por el mismo motor", () => {
    const r = ask(libroComparador, "Con $500 al mes, ¿qué orden me conviene más, avalancha o bola de nieve?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("$803.30"), r.verdict);
    assert.ok(r.verdict.includes("$1,014.99"), r.verdict);
    assert.ok(r.verdict.includes("$811.63"), r.verdict);
    assert.ok(r.verdict.includes("$211.69 menos de interés"), r.verdict);
    assert.ok(r.verdict.includes("noviembre 2026"), r.verdict);
    assert.ok(r.verdict.includes("al mes 6 llevas 2 cerradas"), r.verdict);
    assert.ok(r.verdict.includes("sin recomendarte ninguno"), r.verdict);
    assert.ok(!/te recomiendo|deberías pagar|te conviene (la|el|pagar)/.test(r.verdict), r.verdict);
  });

  it("sin monto traído ni plan guardado, el comparador pide el monto en vez de inventarlo", () => {
    const r = ask(libroComparador, "¿En qué orden pago mis deudas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("necesito el monto mensual del plan"), r.verdict);
  });

  it("cuando los dos órdenes coinciden, la ventaja es cero y se dice cero", () => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        deuda("dx", "Chica cara", 20000, 3600),
        deuda("dy", "Mediana", 100000, 1000),
        deuda("dz", "Grande gratis", 300000, 0),
      ],
    };
    l.settings.display = "USD";
    const r = ask(l, "Con $500 al mes, ¿avalancha o bola de nieve?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("EL MISMO camino"), r.verdict);
    assert.ok(r.verdict.includes("la ventaja de uno sobre otro es cero"), r.verdict);
  });

  it("con una sola deuda no hay orden que comparar", () => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [deuda("du", "Única", 50000, 1200)] };
    l.settings.display = "USD";
    const r = ask(l, "¿Avalancha o bola de nieve?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("no hay orden que comparar"), r.verdict);
    assert.equal(classifyBankQuestion("¿Avalancha o bola de nieve?").family, "deudas");
  });
});

describe("banco · ola 32: el menú de vueltas (para cada no, el cambio mínimo; para cada sí, el margen)", () => {
  const libroBase = (conConflicto: boolean) => {
    let l = createInitial("es", "oscuro");
    l.months[KEY] = {
      lines: [
        line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
        line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.servicios" }),
      ],
    };
    const prev: Line[] = [
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, cadence: "monthly", nextDue: "2026-10-28", bookedOn: "2026-09-28", monthKey: PREV }),
    ];
    if (conConflicto) prev.push(line({ id: "carro", kind: "subscription" as LineKind, concept: "Cuota carro", amountMinor: 90000, recurring: true, cadence: "monthly", nextDue: "2026-10-25", bookedOn: "2026-09-25", monthKey: PREV }));
    l.months[PREV] = { lines: prev };
    if (conConflicto) l = addLent(l, { id: "lentC", person: "Carlos", kind: "plain", amountMinor: 60000, currency: "USD", aprBps: 0, startedOn: "2026-10-01", dueOn: "2026-10-30", note: "" });
    l.settings.display = "USD";
    return l;
  };

  it("el no del mes trae sus vueltas mínimas: la fecha, el ingreso, la baja — en orden tornado", () => {
    const r = ask(libroBase(true), "¿Me alcanza el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("El menú de vueltas"), r.verdict);
    assert.ok(r.verdict.includes("31 de octubre"), r.verdict);
    assert.ok(r.verdict.includes("que entren $100.00 más antes del 25 de octubre"), r.verdict);
    assert.ok(r.verdict.includes("que «Cuota carro» baje $100.00"), r.verdict);
    assert.ok(r.verdict.indexOf("31 de octubre") < r.verdict.indexOf("que entren"), r.verdict);
  });

  it("el sí del mes trae su margen: el punto más bajo es lo máximo que se puede gastar de más", () => {
    const r = ask(libroBase(false), "¿Me alcanza el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("Tu margen de seguridad: podrías gastar hasta $750.01 más"), r.verdict);
  });

  it("el no del día trae la cifra exacta que sí cabe", () => {
    const r = ask(libroBase(false), "¿Puedo pagar $800 el día 28?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("pagando $750.01 ese día sí cabe"), r.verdict);
  });

  it("la vuelta de la fecha se recalcula: pagar cuando entra lo debido, solo si ese día cabe de verdad", () => {
    const r = ask(libroBase(true), "¿Puedo pagar $400 el día 26?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("pagarlo el 30 de octubre"), r.verdict);
    assert.ok(r.verdict.includes("cuando entra «Carlos»"), r.verdict);
    assert.ok(r.verdict.includes("ese día sí cabe"), r.verdict);
  });

  it("el sí del día trae su margen: lo máximo que ese día aguanta", () => {
    const r = ask(libroBase(false), "¿Puedo pagar $200 el día 28?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("Tu margen de seguridad ese día: podrías pagar hasta $750.01"), r.verdict);
  });
});

describe("banco · ola 33: la deriva que avisa (CUSUM, la cerca de Tukey, la ausencia — candidatas en datos)", () => {
  const libroSerie = (comida: number[], conInternetViejo = false) => {
    const l = createInitial("es", "oscuro");
    const meses = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
    meses.forEach((mk, i) => {
      const lines: Line[] = [line({ id: `s${i}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk })];
      if (comida[i] > 0) lines.push(line({ id: `c${i}`, kind: "expense-fixed" as LineKind, concept: "Comida", amountMinor: comida[i], categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }));
      if (conInternetViejo && i >= 2 && i <= 4) lines.push(line({ id: "netS", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, cadence: "monthly", bookedOn: `${mk}-28`, monthKey: mk }));
      l.months[mk] = { lines };
    });
    l.settings.display = "USD";
    return l;
  };

  it("la deriva: la suma paciente de los excesos pasa la vara — no es un solo mes caro", () => {
    const l = libroSerie([20000, 21000, 19000, 20500, 19500, 24000, 28000]);
    const r = ask(l, "¿Algo cambió en mi libro?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("viene subiendo de a poco"), r.verdict);
    assert.ok(r.verdict.includes("+30%"), r.verdict);
    assert.ok(r.verdict.includes("$260.00"), r.verdict);
    assert.equal(classifyBankQuestion("¿Algo cambió en mi libro?").family, "deriva");
    const alerts = driftCandidates(l, KEY, "es", makeNamer(l.structure, "es"), "2026-10-22");
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].kind, "deriva");
    const sup = driftCandidates(l, KEY, "es", makeNamer(l.structure, "es"), "2026-10-22", new Set([alerts[0].id]));
    assert.equal(sup.length, 0);
  });

  it("el salto: un mes pasa la cerca y el anterior no pasaba — es salto, no deriva", () => {
    const l = libroSerie([20000, 21000, 19000, 20500, 19500, 20500, 34000]);
    const r = ask(l, "¿Hay algo raro?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("saltó este mes"), r.verdict);
    assert.ok(!r.verdict.includes("viene subiendo"), r.verdict);
  });

  it("la ausencia: la serie regular que no llegó se nombra con su atraso contra su propio ritmo", () => {
    const l = libroSerie([0, 0, 0, 0, 0, 0, 0], true);
    const r = ask(l, "¿Qué debería saber?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("no llegó"), r.verdict);
    assert.ok(r.verdict.includes("Internet"), r.verdict);
    assert.ok(r.verdict.includes("55 días"), r.verdict);
  });

  it("sin nada que pase la vara, la respuesta lo dice y declara el instrumento", () => {
    const r = ask(fixture(), "¿Hay algo raro en mi libro?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deriva");
    assert.ok(r.verdict.includes("Nada que avisar"), r.verdict);
    assert.ok((r.note ?? "").includes("CUSUM"), r.note ?? "");
  });
});

describe("banco · ola 34: los objetos que faltaban (la tanda nombrada, la antigüedad en cubetas, Allen, la remesa descompuesta)", () => {
  it("la tanda: el objeto no existe y FALTA lo nombra — jamás disfraz de suscripción ni de ahorro", () => {
    const r = ask(fixture(), "¿Cuánto llevo puesto en la tanda?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes("no lleva tandas"), r.verdict);
    assert.ok(r.verdict.includes("turno"), r.verdict);
    assert.equal(classifyBankQuestion("¿Cuánto llevo puesto en la tanda?").family, "falta");
  });

  it("la antigüedad: cubetas del libro con la de más tiempo nombrada, sin adjetivos", () => {
    let l = createInitial("es", "oscuro");
    l = addLoan(l, { id: "lb", lender: "Banco", who: "entity", kind: "plain", amountMinor: 100000, currency: "USD", aprBps: 0, takenOn: "2026-06-15", book: "fixed", note: "" });
    l = addLoan(l, { id: "lv", lender: "Vecino", who: "person", kind: "plain", amountMinor: 20000, currency: "USD", aprBps: 0, takenOn: "2026-10-10", book: "fixed", note: "" });
    l.settings.display = "USD";
    const r = ask(l, "¿Qué tan viejas son mis deudas?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("de más de 90 días"), r.verdict);
    assert.ok(r.verdict.includes("«Banco»"), r.verdict);
    assert.ok(r.verdict.includes("129 días"), r.verdict);
    assert.ok(r.verdict.includes("de 1 a 30 días"), r.verdict);
    assert.equal(r.pieces.length, 2);
    assert.equal(classifyBankQuestion("¿Qué tan viejas son mis deudas?").family, "deudas");
  });

  it("la antigüedad sin fechas: se nombra el monto y no se inventa una edad", () => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [line({ id: "tg", kind: "expense-fixed" as LineKind, concept: "Tarjeta grande", amountMinor: 1, categoryId: "f-creditos", balanceMinor: 50000, aprBps: 3600 })] };
    l.settings.display = "USD";
    const r = ask(l, "¿Desde cuándo debo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("fecha de inicio anotada"), r.verdict);
    assert.ok(r.verdict.includes("$500.00"), r.verdict);
  });

  it("Allen: dos ciudadanos, sus intervalos y la relación — antes, con su hueco en días", () => {
    const l = createInitial("es", "oscuro");
    l.months["2026-09"] = { lines: [
      line({ id: "z1", kind: "expense-variable" as LineKind, concept: "Zapatos", amountMinor: 8000, bookedOn: "2026-09-05", monthKey: "2026-09" }),
      line({ id: "z2", kind: "expense-variable" as LineKind, concept: "Zapatos", amountMinor: 8000, bookedOn: "2026-09-20", monthKey: "2026-09" }),
    ] };
    l.months[KEY] = { lines: [line({ id: "cs", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", bookedOn: "2026-10-10" })] };
    l.settings.display = "USD";
    const r = ask(l, "¿Los zapatos fueron antes o después de la casa?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("ANTES"), r.verdict);
    assert.ok(r.verdict.includes("20 días"), r.verdict);
    assert.equal(classifyBankQuestion("¿Los zapatos fueron antes o después de la casa?").family, "historia");
  });

  it("la remesa descompuesta: la equivalencia a TU tasa, y el margen que el libro no trae se nombra", () => {
    const f = addRemitPerson(fixture(), "Mamá", "mama").state;
    const r = ask(f, "¿Cuánto me cuesta la remesa a Mamá?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "remesas");
    assert.ok(r.verdict.includes("salieron $170.00"), r.verdict);
    assert.ok(r.verdict.includes("A TU tasa anotada"), r.verdict);
    assert.ok(r.verdict.includes("NO está en tu libro"), r.verdict);
    assert.ok(r.verdict.includes("promedios de corredor"), r.verdict);
    assert.equal(classifyBankQuestion("¿Cuánto me cuesta la remesa a Mamá?").family, "remesas");
  });
});

describe("banco · ola 35: la cola larga con censo (la ausencia en el libro, la identidad del cargo, el estado del ítem)", () => {
  it("la ausencia: la serie que no llegó y el gasto que desapareció, dichos del libro", () => {
    const l = createInitial("es", "oscuro");
    const meses = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
    meses.forEach((mk, i) => {
      const lines: Line[] = [line({ id: `s${i}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: `${mk}-05`, monthKey: mk })];
      if (i <= 5) lines.push(line({ id: `c${i}`, kind: "expense-fixed" as LineKind, concept: "Comida", amountMinor: 20000, categoryId: "f-alimentos", bookedOn: `${mk}-10`, monthKey: mk }));
      if (i >= 2 && i <= 4) lines.push(line({ id: "netS", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, cadence: "monthly", bookedOn: `${mk}-28`, monthKey: mk }));
      l.months[mk] = { lines };
    });
    l.settings.display = "USD";
    const r = ask(l, "¿Qué me falta este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ausencia");
    assert.ok(r.verdict.includes("no llegó"), r.verdict);
    assert.ok(r.verdict.includes("no aparece nada"), r.verdict);
    assert.ok((r.note ?? "").includes("EN EL LIBRO"), r.note ?? "");
    assert.equal(classifyBankQuestion("¿Qué me falta este mes?").family, "ausencia");
  });

  it("la identidad por monto: el cargo de $80 es los Zapatos, con su evidencia", () => {
    const r = ask(fixture(), "¿Qué es este cargo de $80?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "identidad");
    assert.ok(r.verdict.includes("Zapatos"), r.verdict);
    assert.ok(r.verdict.includes("$80.00"), r.verdict);
    assert.equal(classifyBankQuestion("¿Qué es este cargo de $80?").family, "identidad");
  });

  it("la identidad por nombre: Internet es la suscripción, con su ritmo y su monto típico", () => {
    const r = ask(fixture(), "¿Qué es Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "identidad");
    assert.ok(r.verdict.includes("suscripción"), r.verdict);
    assert.ok(r.verdict.includes("$49.99"), r.verdict);
  });

  it("el estado del ítem: el préstamo de Carlos con lo puesto, lo devuelto y lo que queda", () => {
    const r = ask(fixture(), "¿Cómo va el préstamo de Carlos?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ya-pague");
    assert.ok(r.verdict.includes("prestaste $300.00"), r.verdict);
    assert.ok(r.verdict.includes("quedan $300.00"), r.verdict);
    assert.ok(r.verdict.includes("Sin pagos anotados"), r.verdict);
    assert.equal(classifyBankQuestion("¿Cómo va el préstamo de Carlos?").family, "ya-pague");
  });
});

describe("banco · ola 37: la capacidad y sus voces (la caza de Oscar, 2026-11-22)", () => {
  /* La pregunta de la captura: «Si me compro un boleto de avión por
   * $500, y rento una casa por $1200, ¿podría asumir el gasto?» — las
   * compras podrían ser cualquier cosa; la pregunta trae MONTOS, unos
   * de una vez y otros que se repiten, y mezcla los tiempos (comprar
   * hoy, rentar cada mes, planificar el futuro). Antes de esta ola:
   * silencio en toda la familia «asumir», o el delegado spend sumando
   * SOLO el primer monto y diciendo «sí» a un plan de $1,700 con
   * $750 de queda. */
  const PREV = "2026-09";
  function libroCap(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "casa", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", bookedOn: "2026-10-01" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ] };
    l.settings.display = "USD";
    return l; // queda $750.01; el Internet ya vive en la queda (contado)
  }
  function libroCamino(): LedgerState {
    const l = libroCap();
    const net = l.months[KEY].lines.find((x) => x.id === "net")!;
    net.monthKey = PREV; net.recurring = true; net.cadence = "monthly";
    l.months[PREV] = { lines: [{ ...net }] };
    l.months[KEY].lines = l.months[KEY].lines.filter((x) => x.id !== "net");
    return l; // queda $800.00; el Internet CAMINA el 28 (−$49.99)
  }
  function libroRitmo(): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", PREV, KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s-${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `c-${mk}`, kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 100000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk }),
      ] };
    }
    l.settings.display = "USD";
    return l; // mes típico: +$2,000 libres; queda de octubre $2,000.00
  }
  function libroDesnivel(): LedgerState {
    const l = createInitial("es", "oscuro");
    const nets: Record<string, number> = { "2026-08": 200000, "2026-09": 200000, "2026-10": 350000 };
    for (const mk of ["2026-08", PREV, KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s-${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: nets[mk], bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `c-${mk}`, kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 100000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk }),
      ] };
    }
    l.settings.display = "USD";
    return l; // meses típicos +$1,000; octubre deja $2,500 (un mes bueno no es el ritmo)
  }
  const OSCAR_Q = "Si me compro un boleto de avion por $500, y rento una casa por $1200, podría asumir el gasto?";

  it("la pregunta de Oscar, entera: NO con su menú — la renta se lee como gasto que se repite", () => {
    const r = ask(libroCap(), OSCAR_Q);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.startsWith("No"), r.verdict);
    assert.ok(r.verdict.includes("$750.01"), r.verdict);
    assert.ok(r.verdict.includes("te faltan $949.99"), r.verdict);
    assert.ok(r.verdict.includes("fuera de $250.01 o menos"), r.verdict);
    assert.ok((r.note ?? "").includes("Cruzo los tiempos"), r.note ?? "");
    assert.deepEqual(validateGraph(r.graph ?? []), []);
    assert.equal(classifyBankQuestion(OSCAR_Q).family, "factibilidad");
  });

  it("con libro que la sostiene: SÍ, y mes a mes también cabe contra el mes típico", () => {
    const r = ask(libroRitmo(), OSCAR_Q);
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.startsWith("Sí"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.ok(r.verdict.includes("mes a mes también cabe"), r.verdict);
    assert.ok(r.verdict.includes("$2,000.00"), r.verdict);
  });

  it("la renta que el mes aguanta pero el ritmo no: el NO es de los meses que vienen", () => {
    const r = ask(libroDesnivel(), "Si rento una casa por $1200, ¿podría asumir el gasto?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("mes a mes no cabe"), r.verdict);
    assert.ok(r.verdict.includes("te faltarían $200.00 cada mes"), r.verdict);
  });

  it("el sí mentiroso del delegado queda pre-emptado: dos montos se SUMAN", () => {
    const r = ask(libroCap(), "Si gasto $500 en un boleto y $1200 en una casa, ¿me alcanza?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.startsWith("No"), r.verdict);
  });

  it("las voces: quedaría con renta, la cuenta sin cuentas, llegaría desnuda, el total, asumir sin monto", () => {
    const q1 = ask(libroCap(), "¿Cuánto me quedaría si rento la casa en $1200?");
    assert.equal(q1.kind, "answer");
    if (q1.kind === "answer") { assert.equal(q1.family, "factibilidad"); assert.ok(q1.verdict.includes("debiendo $449.99"), q1.verdict); }
    const q2 = ask(libroCap(), "¿Cuánto me quedaría en la cuenta si compro el boleto de $500 y rento la casa por $1200?");
    assert.equal(q2.kind, "answer");
    if (q2.kind === "answer") { assert.equal(q2.family, "factibilidad"); assert.ok(q2.verdict.includes("debiendo $949.99"), q2.verdict); }
    const q3 = ask(libroCamino(), "¿Con cuánto llegaría a fin de mes?");
    assert.equal(q3.kind, "answer");
    if (q3.kind === "answer") { assert.equal(q3.family, "factibilidad"); assert.ok(q3.verdict.includes("$750.01"), q3.verdict); }
    const q4 = ask(libroCap(), "¿Cuánto gastaría en total si compro el boleto de $500 y rento la casa por $1200?");
    assert.equal(q4.kind, "answer");
    if (q4.kind === "answer") { assert.ok(q4.verdict.includes("En total son $1,700.00"), q4.verdict); assert.ok(q4.verdict.includes("se repiten cada mes"), q4.verdict); }
    const q5 = ask(libroCap(), "¿Podría asumir el gasto?");
    assert.equal(q5.kind, "answer");
    if (q5.kind === "answer") { assert.equal(q5.family, "factibilidad"); assert.ok(q5.verdict.includes("me falta el monto"), q5.verdict); }
    const q6 = ask(libroCap(), "Can I afford a $500 ticket and $1200 rent?", "en");
    assert.equal(q6.kind, "answer");
    if (q6.kind === "answer") { assert.equal(q6.family, "factibilidad"); assert.ok(q6.verdict.includes("can't take that expense on"), q6.verdict); }
  });

  it("los guardianes: lo cercado de los vecinos no se toca", () => {
    const g1 = ask(libroCap(), "¿Puedo gastar $100 en zapatos?");
    assert.equal(g1.kind, "answer");
    if (g1.kind === "answer") assert.equal(g1.family, "spend");
    const g2 = ask(libroCamino(), "¿Puedo pagar $200 el día 28?");
    assert.equal(g2.kind, "answer");
    if (g2.kind === "answer") { assert.equal(g2.family, "factibilidad"); assert.ok(g2.verdict.includes("ese día"), g2.verdict); }
    const g3 = ask(libroCap(), "¿Puedo gastar $20 hoy?");
    assert.equal(g3.kind, "answer");
    if (g3.kind === "answer") assert.equal(g3.family, "promedio");
    const g4 = ask(libroCap(), "Si abono 50 dólares más al mes a mi tarjeta, ¿cuándo termino?");
    assert.equal(g4.kind, "answer");
    if (g4.kind === "answer") assert.notEqual(g4.family, "factibilidad");
    const g5 = ask(libroCap(), "Si me regalaron 300 dólares y tuve -200 de aumento, ¿cuánto sería?");
    assert.equal(g5.kind, "answer");
    if (g5.kind === "answer") assert.equal(g5.family, "calculadora");
    const g6 = ask(libroCap(), "¿Cuánto me quedaría si gasto $1700?");
    assert.equal(g6.kind, "answer");
    if (g6.kind === "answer") assert.equal(g6.family, "hipotetico");
  });
});


describe("banco · ola 38: la caza del centro — la capacidad social y las curas de la 37", () => {
  /* LA CAZA DEL CENTRO (orden de Oscar, 2026-11-22 18:18: «El centro
   * debe estar limpio. Pulido. Poderoso»): 61 preguntas del centro ×
   * 3 libros. La Ola 37 dejó dos defectos propios — la premisa que
   * reemplaza se contaba dos veces y el «¿cuánto me queda?» pedía un
   * monto — y el centro traía silencios enteros: prestar, ayudar,
   * invitar, el gusto, el máximo sin premisa, el próximo pago. */
  function libroSensible(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      // La renta vive como CONCEPTO libre, sin sub de la estructura:
      // la trampa exacta que tapaba el filtro y dejaba pasar la
      // premisa que reemplaza a la capacidad (doble cuenta).
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-10-01", recurring: true, cadence: "monthly" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ] };
    l.settings.display = "USD";
    return l; // queda $1,000.01
  }
  function libroCentro38(): LedgerState {
    const l = createInitial("es", "oscuro");
    const L = (mk: string, p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">) => line({ ...p, monthKey: mk });
    l.months["2026-08"] = { lines: [
      L("2026-08", { id: "sA", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-08-05" }),
      L("2026-08", { id: "rA", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-08-01" }),
      L("2026-08", { id: "cA", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 28000, bookedOn: "2026-08-14" }),
      L("2026-08", { id: "nA", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, bookedOn: "2026-08-28" }),
    ] };
    l.months["2026-09"] = { lines: [
      L("2026-09", { id: "sS", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-09-05" }),
      L("2026-09", { id: "rS", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-09-01" }),
      L("2026-09", { id: "cS", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 31000, bookedOn: "2026-09-13" }),
      L("2026-09", { id: "nS", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, bookedOn: "2026-09-28" }),
    ] };
    l.months[KEY] = { lines: [
      L(KEY, { id: "s", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      L(KEY, { id: "r", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-10-01" }),
      L(KEY, { id: "c1", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 10000, bookedOn: "2026-10-10" }),
      L(KEY, { id: "c2", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 8000, bookedOn: "2026-10-17" }),
      L(KEY, { id: "n", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ] };
    l.settings.display = "USD";
    return l; // queda de octubre $820.01; mes típico deja $720.01
  }
  function libroSinRenta(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "neg", kind: "income-variable" as LineKind, concept: "Negocio propio", amountMinor: 95000, bookedOn: "2026-10-18" }),
      line({ id: "cas", kind: "expense-fixed" as LineKind, concept: "Casa", amountMinor: 30000, bookedOn: "2026-10-03" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ] };
    l.settings.display = "USD";
    return l; // queda $400.01; la vivienda se llama «Casa», no «Renta»
  }

  it("la premisa que reemplaza va al hipotético con el valor NUEVO, no sumada encima", () => {
    const r = ask(libroSensible(), "¿Si la renta sube a $550, cómo quedo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico");
    assert.ok(r.verdict.includes("$550.00"), r.verdict);
    assert.ok(r.verdict.includes("$100.00 más"), r.verdict);
    assert.ok(!r.verdict.includes("$1,000.00"), r.verdict);
    const net = ask(libroSensible(), "¿Si el internet sube a $60, cómo quedo?");
    assert.equal(net.kind, "answer");
    if (net.kind === "answer") { assert.equal(net.family, "hipotetico"); assert.ok(net.verdict.includes("$10.01 más"), net.verdict); }
    const baja = ask(libroSensible(), "¿Si la renta baja a $400, cómo quedo?");
    assert.equal(baja.kind, "answer");
    if (baja.kind === "answer") { assert.equal(baja.family, "hipotetico"); assert.ok(baja.verdict.includes("$50.00 menos"), baja.verdict); }
  });

  it("la capacidad social camina el mes: prestar, ayudar, invitar, el gusto, cambiar", () => {
    const casos: Array<[string, string]> = [
      ["¿Puedo prestarle $200 a mi hermano?", "Sí, puedes con ese gasto"],
      ["¿Puedo ayudar a mi mamá con $300 este mes?", "Sí, puedes con ese gasto"],
      ["¿Puedo invitar a comer a mi familia? Serían como $150", "Sí, puedes con ese gasto"],
      ["¿Me puedo dar el gusto de unos zapatos de $120?", "Sí, puedes con ese gasto"],
      ["¿Puedo cambiar el celular por uno de $900?", "No, con lo anotado no puedes con ese gasto"],
    ];
    for (const [q, lead] of casos) {
      const r = ask(libroCentro38(), q);
      assert.equal(r.kind, "answer", q);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "factibilidad", q);
      assert.ok(r.verdict.startsWith(lead), `${q} → ${r.verdict}`);
    }
    const en = ask(libroCentro38(), "Can I lend my brother $200?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") { assert.equal(en.family, "factibilidad"); assert.ok(en.verdict.includes("can take that expense on"), en.verdict); }
  });

  it("«¿cuánto me queda?» ya no se secuestra: la queda es de su familia, y «me da para» sigue en la capacidad", () => {
    const r = ask(libroCentro38(), "¿Cuánto me queda para el resto del mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.notEqual(r.family, "factibilidad");
    assert.ok(r.verdict.includes("$820.01"), r.verdict);
    assert.ok(!/me falta el monto/.test(r.verdict), r.verdict);
    const da = ask(libroCentro38(), "¿Me da para un gasto de $100?");
    assert.equal(da.kind, "answer");
    if (da.kind === "answer") assert.equal(da.family, "factibilidad");
  });

  it("el máximo sin premisa: el tope sale del mes típico y se prueba su grafo", () => {
    const r = ask(libroCentro38(), "¿Cuánto es lo máximo que puedo pagar de renta?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("$1,170.01"), r.verdict); // 450.00 de hoy + 720.01 del mes típico
    assert.ok(r.graph && validateGraph(r.graph).length === 0, "el grafo del tope valida");
  });

  it("el próximo pago se camina hasta el día patrón del ingreso fijo", () => {
    const r = ask(libroCentro38(), "¿Me alcanza hasta el próximo pago?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("5 de noviembre de 2026"), r.verdict);
    assert.ok(r.verdict.includes("$820.01"), r.verdict);
  });

  it("si el gasto nombrado no existe, la capacidad camina el monto como nuevo — y lo dice", () => {
    const r = ask(libroSinRenta(), "¿Si la renta sube a $550, cómo quedo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok((r.note ?? "").includes("no encontré ese gasto con ese nombre"), r.note ?? "sin nota");
  });

  it("guardianes: el gasto simple sigue del delegado y cambiar moneda es conversión", () => {
    const g1 = ask(libroCentro38(), "¿Puedo gastar $100 en zapatos?");
    assert.equal(g1.kind, "answer");
    if (g1.kind === "answer") assert.equal(g1.family, "spend");
    const g2 = ask(libroCentro38(), "¿Puedo cambiar $100 a córdobas?");
    if (g2.kind === "answer") assert.notEqual(g2.family, "factibilidad");
  });
});


describe("banco · ola 39: el día del cero y el cierre (la caza del centro)", () => {
  /* Tres voces del mismo paseo que callaban enteras: el signo del
   * cierre, el faltante para terminar y el día en que el dinero se
   * acaba. El motor ya caminaba el mes día por día — nadie le
   * preguntaba en este idioma. */
  function libroCero(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 90000, bookedOn: "2026-10-05" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-10-01" }),
    ] };
    l.months["2026-09"] = { lines: [
      line({ id: "tar", kind: "expense-fixed" as LineKind, concept: "Tarjeta Visa", amountMinor: 48000, categoryId: "f-creditos", balanceMinor: 120000, balanceCurrency: "USD", aprBps: 2400, recurring: true, cadence: "monthly", nextDue: "2026-10-25", bookedOn: "2026-09-25", monthKey: "2026-09" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, recurring: true, cadence: "monthly", nextDue: "2026-10-28", bookedOn: "2026-09-28", monthKey: "2026-09" }),
    ] };
    l.settings.display = "USD";
    return l; // queda $450.00; el 25 la tarjeta deja −$30.00; el mes cierra en −$79.99
  }
  function libroSano39(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-10-01" }),
      line({ id: "c1", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 10000, bookedOn: "2026-10-10" }),
      line({ id: "c2", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 8000, bookedOn: "2026-10-17" }),
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
    ] };
    l.settings.display = "USD";
    return l; // queda y cierre $820.01; ritmo medido $30.91/día
  }

  it("el signo del cierre: sí, con el primer día en rojo nombrado; no, en el libro sano", () => {
    const r = ask(libroCero(), "¿Voy a terminar el mes en negativo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.startsWith("Sí"), r.verdict);
    assert.ok(r.verdict.includes("-$79.99"), r.verdict);
    assert.ok(r.verdict.includes("25 de octubre de 2026"), r.verdict);
    assert.ok(r.verdict.includes("Tarjeta Visa"), r.verdict);
    const sano = ask(libroSano39(), "¿Voy a terminar el mes en negativo?");
    assert.equal(sano.kind, "answer");
    if (sano.kind === "answer") { assert.equal(sano.family, "factibilidad"); assert.ok(sano.verdict.startsWith("No"), sano.verdict); }
  });

  it("el faltante para terminar: el del cierre en el libro que cruza; nada, en el sano", () => {
    const r = ask(libroCero(), "¿Cuánto necesito para terminar el mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("necesitas $79.99 más"), r.verdict);
    const sano = ask(libroSano39(), "¿Cuánto necesito para terminar el mes?");
    assert.equal(sano.kind, "answer");
    if (sano.kind === "answer") assert.ok(sano.verdict.includes("No necesitas nada más"), sano.verdict);
  });

  it("el día del cero: por lo programado cuando el cruce ya está en el libro", () => {
    const r = ask(libroCero(), "¿Cuándo se me acaba el dinero?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("25 de octubre de 2026"), r.verdict);
    assert.ok(r.verdict.includes("Tarjeta Visa"), r.verdict);
    const en = ask(libroCero(), "When do I run out of money?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") { assert.equal(en.family, "factibilidad"); assert.ok(/October 25/.test(en.verdict), en.verdict); }
  });

  it("el día del cero: por el ritmo medido cuando lo programado no cruza, con su vara declarada", () => {
    const r = ask(libroSano39(), "¿Qué día me quedo en cero?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
    assert.ok(r.verdict.includes("ritmo medido de gasto ($30.91 por día)"), r.verdict);
    assert.ok(r.verdict.includes("18 de noviembre de 2026"), r.verdict);
    assert.ok(r.verdict.includes("NO conté ingresos futuros"), r.verdict);
  });
});


describe("banco · ola 40: las prioridades y el interés (la caza del centro)", () => {
  /* Cinco preguntas de cada mes en silencio y una desviada: el
   * interés no es una línea del libro — es saldo × tasa, y el libro
   * trae los dos factores. Las prioridades se enseñan como hechos
   * ordenados; la decisión queda del usuario. */
  function libroDeudas40(): LedgerState {
    let l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      line({ id: "ren", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, bookedOn: "2026-10-01", recurring: true, cadence: "monthly" }),
      line({ id: "sup", kind: "purchase" as LineKind, concept: "Súper", amountMinor: 18000, bookedOn: "2026-10-12" }),
      line({ id: "tar", kind: "expense-fixed" as LineKind, concept: "Tarjeta Visa", amountMinor: 8500, categoryId: "f-creditos", balanceMinor: 120000, balanceCurrency: "USD", aprBps: 2400, recurring: true, nextDue: "2026-10-25", bookedOn: "2026-09-28" }),
    ] };
    l.months["2026-09"] = { lines: [
      line({ id: "net", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, recurring: true, cadence: "monthly", nextDue: "2026-10-28", bookedOn: "2026-09-28", monthKey: "2026-09" }),
    ] };
    l = addLoan(l, { id: "ln1", lender: "Banco", who: "entity", kind: "interest", amountMinor: 600000, currency: "USD", aprBps: 1200, takenOn: "2026-08-15", book: "fixed", note: "" });
    l.settings.display = "USD";
    return l; // tarjeta $1,200 al 24% ($24.00/mes); préstamo $6,000 al 12% ($60.00/mes); queda $785.01
  }

  it("el interés del mes se calcula de los saldos y las tasas — no se busca como línea", () => {
    const r = ask(libroDeudas40(), "¿Cuánto pago de intereses al mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("$84.00"), r.verdict);
    assert.ok(r.verdict.includes("Tarjeta Visa"), r.verdict);
    assert.ok(r.verdict.includes("$24.00"), r.verdict);
    assert.ok(r.verdict.includes("Banco"), r.verdict);
    assert.ok(r.graph && validateGraph(r.graph).length === 0, "el grafo del interés valida");
    const en = ask(libroDeudas40(), "How much interest do I pay a month?", "en");
    assert.equal(en.kind, "answer");
    if (en.kind === "answer") { assert.equal(en.family, "deudas"); assert.ok(en.verdict.includes("$84.00"), en.verdict); }
  });

  it("la deuda más cara se dice en sus dos lecturas cuando no coinciden", () => {
    const r = ask(libroDeudas40(), "¿Cuál deuda me sale más cara?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("en dinero"), r.verdict);
    assert.ok(r.verdict.includes("Banco"), r.verdict); // en dinero: $60.00 del préstamo
    assert.ok(r.verdict.includes("En tasa"), r.verdict);
    assert.ok(r.verdict.includes("Tarjeta Visa"), r.verdict); // en tasa: 24%
  });

  it("completa o mínimo: los dos caminos de la tarjeta, sin recomendar", () => {
    const r = ask(libroDeudas40(), "¿Me conviene pagar la tarjeta completa o el mínimo?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("$1,200.00"), r.verdict);
    assert.ok(r.verdict.includes("sin recomendarte ninguno"), r.verdict);
    assert.ok(r.verdict.includes("La diferencia entre los dos caminos"), r.verdict);
  });

  it("si no pago: el saldo crece con el interés y la multa se nombra como dato ausente", () => {
    const r = ask(libroDeudas40(), "¿Qué pasa si no pago la tarjeta este mes?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("$1,224.00"), r.verdict);
    assert.ok(r.verdict.includes("multa por atraso"), r.verdict);
    assert.ok(r.verdict.includes("no lo invento"), r.verdict);
  });

  it("qué pago primero: el orden de vencimiento con la queda caminando", () => {
    const r = ask(libroDeudas40(), "¿Qué pago primero?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    const iTar = r.verdict.indexOf("Tarjeta Visa");
    const iNet = r.verdict.indexOf("Internet");
    assert.ok(iTar >= 0 && iNet > iTar, r.verdict); // el 25 antes que el 28
    assert.ok(r.verdict.includes("$785.00"), r.verdict);
  });

  it("esto o aquello: caben las dos, y se dice con las fechas y las cifras", () => {
    const r = ask(libroDeudas40(), "¿Pago la tarjeta o guardo para la renta?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("caben las dos"), r.verdict);
    assert.ok(r.verdict.includes("Tarjeta Visa"), r.verdict);
    assert.ok(r.verdict.includes("Renta"), r.verdict);
  });
});


describe("banco · ola 41: el ahorro con su vara (la caza del centro)", () => {
  /* El ahorro juzgado caía en el stock a secas o en silencio. La
   * vara es la del usuario: su meta de Ajustes (3 meses de colchón)
   * contra sus meses medidos. Tres meses de libro: salario $1,500,
   * renta $450, súper $200, apartado $100 al mes a la emergencia. */
  function libroAhorro41(): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s-${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r-${mk}`, kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk }),
        line({ id: `p-${mk}`, kind: "purchase" as LineKind, concept: "Súper", amountMinor: 20000, bookedOn: `${mk}-12`, monthKey: mk }),
        line({ id: `a-${mk}`, kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 10000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-10`, monthKey: mk }),
      ] };
    }
    l.months[KEY].lines.push(line({ id: "tar41", kind: "expense-fixed" as LineKind, concept: "Tarjeta Visa", amountMinor: 8500, categoryId: "f-creditos", balanceMinor: 120000, balanceCurrency: "USD", aprBps: 2400, recurring: true, nextDue: "2026-10-25", bookedOn: "2026-09-28" }));
    l.settings.display = "USD";
    return l; // guardado $300 ($100 × 3, todo emergencia); mes típico de gasto $650; interés de la tarjeta $24/mes
  }

  it("«¿cuánto debería estar ahorrando?» se mide con su vara: su meta, su ritmo, su mes típico", () => {
    const r = ask(libroAhorro41(), "¿Cuánto debería estar ahorrando?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.verdict.includes("tu propia vara"), r.verdict);
    assert.ok(r.verdict.includes("$100.00"), r.verdict); // su ritmo medido de apartado
  });

  it("«¿estoy ahorrando bien?» responde con los meses cubiertos contra su meta — sin sermón", () => {
    const r = ask(libroAhorro41(), "¿Estoy ahorrando bien?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.verdict.includes("3 meses de meta"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
  });

  it("«¿cuánto me falta para un mes de gastos?» usa el mes típico entero como peldaño", () => {
    const r = ask(libroAhorro41(), "¿Cuánto me falta para tener un mes de gastos guardado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.verdict.includes("$650.00"), r.verdict); // el mes típico de gasto
    assert.ok(r.verdict.includes("$350.00"), r.verdict); // 650 − 300 guardados
  });

  it("sacar de los ahorros se camina contra el stock y el colchón; pasar del stock, se dice", () => {
    const book = libroAhorro41();
    const r = ask(book, "¿Puedo sacar $200 de mis ahorros?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.verdict.includes("$100.00"), r.verdict); // 300 − 200
    const over = ask(book, "¿Puedo sacar $500 de mis ahorros?");
    assert.equal(over.kind, "answer", JSON.stringify(over).slice(0, 200));
    if (over.kind !== "answer") return;
    assert.ok(over.verdict.includes("más de lo que hay"), over.verdict);
    assert.ok(over.verdict.includes("$300.00"), over.verdict);
  });

  it("«¿ahorros o deudas?» presenta los dos lados con sus números y no escoge", () => {
    const r = ask(libroAhorro41(), "¿Me conviene meter más a ahorros o pagar deudas?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ahorros");
    assert.ok(r.verdict.includes("$24.00"), r.verdict); // el interés mensual de la tarjeta
    assert.ok(r.verdict.includes("la decisión es tuya"), r.verdict);
  });

  it("la meta sin monto pide el monto con el plazo ya contado — no calla", () => {
    const r = ask(libroAhorro41(), "¿Cuánto tengo que guardar al mes para el viaje de diciembre?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "meta");
    assert.ok(r.verdict.includes("2 meses de apartado"), r.verdict);
    assert.ok(r.verdict.includes("¿cuánto cuesta"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict); // lo ya guardado
  });
});


describe("banco · ola 42: el costo de vida y las proporciones (la caza del centro)", () => {
  /* El mes entero como forma de vida callaba: vivir, las partes
   * del ingreso, el costo mensual por cosa. Todo se mide sobre el
   * MES TÍPICO — la mediana de los meses — nunca sobre el mes en
   * curso disfrazado. Libro: salario $1,500; renta $450; súper
   * $280/$310/$180; gasolina $120; internet $49.99 en octubre. */
  function libroCentro42(): LedgerState {
    const l = createInitial("es", "oscuro");
    const superMes: Record<string, number> = { "2026-08": 28000, "2026-09": 31000, [KEY]: 18000 };
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s-${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r-${mk}`, kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk, recurring: true }),
        line({ id: `p-${mk}`, kind: "purchase" as LineKind, concept: "Súper", amountMinor: superMes[mk], categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
        line({ id: `g-${mk}`, kind: "purchase" as LineKind, concept: "Gasolina", amountMinor: 12000, categoryId: "f-transporte", bookedOn: `${mk}-15`, monthKey: mk }),
      ] };
    }
    l.months[KEY].lines.push(line({ id: "net42", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", nextDue: "2026-10-28", bookedOn: "2026-09-28" }));
    l.settings.display = "USD";
    return l; // mes típico de gasto $850 (mediana de 850/880/799.99); ingreso típico $1,500
  }

  it("«¿cuánto necesito para vivir?» devuelve el mes típico, no el mes en curso", () => {
    const r = ask(libroCentro42(), "¿Cuánto necesito al mes para vivir?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("$850.00"), r.verdict);
    assert.ok(r.verdict.includes("mes típico"), r.verdict);
    const en = ask(libroCentro42(), "How much do I need to live on per month?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.ok(en.verdict.includes("$850.00"), en.verdict);
  });

  it("la parte de la renta se dice en porcentaje y en frecuencia natural", () => {
    const r = ask(libroCentro42(), "¿Qué porcentaje de lo que gano se va en la renta?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("30%"), r.verdict);
    assert.ok(r.verdict.includes("de cada $100"), r.verdict);
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
  });

  it("«comida» oye a la categoría Alimentos, y el rótulo nombra lo que la cifra suma", () => {
    const r = ask(libroCentro42(), "¿Qué parte de mi sueldo se va en comida?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$256.67"), r.verdict); // el promedio del súper
    assert.ok(r.verdict.includes("Súper"), r.verdict);
  });

  it("«¿cuánto me cuesta la casa?» suma la categoría entera y la nombra Casa, no Renta", () => {
    const r = ask(libroCentro42(), "¿Cuánto me cuesta la casa al mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("$466.66"), r.verdict); // (450 + 450 + 499.99) / 3
    assert.ok(r.verdict.startsWith("Casa te cuesta"), r.verdict);
  });

  it("lo que no está en el libro se nombra como ausencia, no como cero disfrazado", () => {
    const r = ask(libroCentro42(), "¿Cuánto me cuesta el carro al mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("«carro»"), r.verdict);
    assert.ok(r.verdict.includes("no aparece"), r.verdict);
  });

  it("«¿me alcanza con lo que gano?» juzga ingreso típico contra gasto típico", () => {
    const r = ask(libroCentro42(), "¿Me alcanza con lo que gano?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("Sí, con lo que ganas alcanza"), r.verdict);
    assert.ok(r.verdict.includes("$650.00"), r.verdict); // 1,500 − 850
  });
});


describe("banco · ola 43: el ingreso que se mueve y el juicio propio (la caza del centro)", () => {
  /* La sensibilidad y el contrafactual existían solo para el
   * gasto; el respaldo no oía su inglés ni su forma desnuda; el
   * juicio «¿he gastado mucho?» no tenía la vara de la mediana.
   * Libro: salario $1,500, negocio $600/$600/$400, renta $450,
   * súper $250, apartado $300 al mes — guardado $900. */
  function libroMovil43(): LedgerState {
    const l = createInitial("es", "oscuro");
    const negocio: Record<string, number> = { "2026-08": 60000, "2026-09": 60000, [KEY]: 40000 };
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s-${mk}`, kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `n-${mk}`, kind: "income-variable" as LineKind, concept: "Negocio", amountMinor: negocio[mk], bookedOn: `${mk}-18`, monthKey: mk }),
        line({ id: `r-${mk}`, kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk, recurring: true }),
        line({ id: `p-${mk}`, kind: "purchase" as LineKind, concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
        line({ id: `a-${mk}`, kind: "expense-fixed" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-10`, monthKey: mk }),
      ] };
    }
    l.settings.display = "USD";
    return l;
  }

  it("el respaldo oye su forma desnuda y su inglés: aguanto sin ingresos, lose my job", () => {
    const book = libroMovil43();
    for (const [q, lang] of [["¿Cuánto tiempo aguanto sin ingresos?", "es"], ["What if I lose my job?", "en"], ["How long could I go without income?", "en"]] as Array<[string, Lang]>) {
      const r = ask(book, q, lang);
      assert.equal(r.kind, "answer", `«${q}» → ${JSON.stringify(r).slice(0, 160)}`);
      if (r.kind !== "answer") continue;
      assert.equal(r.family, "respaldo", q);
      assert.ok(r.verdict.includes("$900.00"), r.verdict);
    }
  });

  it("la baja del sueldo — en porcentaje y en monto — recalcula el mes", () => {
    const book = libroMovil43();
    const pct = ask(book, "¿Y si me bajan el sueldo un 20%?");
    assert.equal(pct.kind, "answer", JSON.stringify(pct).slice(0, 200));
    if (pct.kind === "answer") {
      assert.equal(pct.family, "hipotetico");
      assert.ok(pct.verdict.includes("$1,200.00"), pct.verdict);
      assert.ok(pct.verdict.includes("$600.00"), pct.verdict); // el mes cierra 900 − 300
    }
    const abs = ask(book, "¿Si me bajan el sueldo a $1,200, cómo quedo?");
    assert.equal(abs.kind, "answer", JSON.stringify(abs).slice(0, 200));
    if (abs.kind === "answer") assert.ok(abs.verdict.includes("$600.00"), abs.verdict);
    const en = ask(book, "What if my salary drops by 20%?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.ok(en.verdict.includes("$600.00"), en.verdict);
  });

  it("el contrafactual del ingreso: si no entra el negocio, el mes se recalcula sin él", () => {
    const book = libroMovil43();
    const r = ask(book, "¿Qué pasa si este mes no me entra el negocio?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "contrafactual");
    assert.ok(r.verdict.includes("Negocio"), r.verdict);
    assert.ok(r.verdict.includes("$600.00"), r.verdict); // su mes típico
    assert.ok(r.verdict.includes("$500.00"), r.verdict); // el mes sin los $400 que ya entraron
    const vender = ask(book, "¿Y si este mes no vendo nada?");
    assert.equal(vender.kind, "answer", JSON.stringify(vender).slice(0, 200));
    if (vender.kind === "answer") {
      assert.equal(vender.family, "contrafactual");
      assert.ok(vender.verdict.includes("Negocio"), vender.verdict); // lo que se vende, no el sueldo
    }
  });

  it("«¿en qué se me está yendo el dinero?» llega al relator", () => {
    const r = ask(libroMovil43(), "¿En qué se me está yendo el dinero?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "relator");
  });

  it("«¿he gastado mucho?» se juzga también contra el mes típico propio, no solo contra el pasado", () => {
    const r = ask(libroMovil43(), "¿Este mes he gastado mucho?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "comparar");
    assert.ok(r.verdict.includes("tu mes típico de gasto es $700.00"), r.verdict);
    assert.ok(r.verdict.includes("no te vendo un adjetivo"), r.verdict);
    const en = ask(libroMovil43(), "Have I spent a lot this month?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.equal(en.family, "comparar");
  });
});


describe("banco · ola 44 — la deuda se cuenta de una sola fuente (D1, la Caza II)", () => {
  /* El libro de la contradicción: la tarjeta vive SOLO como línea
   * con saldo (sin registro de tarjetas) y hay un préstamo de
   * entidad. Antes de la cura: «¿cuánto debo en total?» → «no debes
   * nada» y el patrimonio restaba $0, mientras el interés de la
   * Ola 40 calculaba $24/mes sobre esa misma tarjeta. */
  function libroContradiccion(): LedgerState {
    let l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal44", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      line({ id: "tar44", kind: "expense-fixed", concept: "Tarjeta Visa", amountMinor: 8500, categoryId: "f-creditos", balanceMinor: 120000, balanceCurrency: "USD", aprBps: 2400, recurring: true, nextDue: "2026-10-25", bookedOn: "2026-09-28" }),
    ] };
    l = addLoan(l, { id: "ln44", lender: "Banco", who: "entity", kind: "interest", amountMinor: 600000, currency: "USD", aprBps: 1200, takenOn: "2026-08-15", book: "fixed", note: "" });
    l.settings.display = "USD";
    return l;
  }

  it("el total ve la tarjeta-línea y el préstamo de entidad, de la misma fuente que el interés", () => {
    const book = libroContradiccion();
    const total = ask(book, "¿Cuánto debo en total?");
    assert.equal(total.kind, "answer", JSON.stringify(total).slice(0, 200));
    if (total.kind !== "answer") return;
    assert.equal(total.family, "deudas");
    assert.ok(total.verdict.includes("$1,200.00"), total.verdict);
    assert.ok(total.verdict.includes("saldos anotados en líneas de deuda"), total.verdict);
    assert.ok(total.verdict.includes("en préstamos"), total.verdict);
    assert.ok(!total.verdict.includes("No debes nada"), total.verdict);
    // La consistencia misma: el interés de la Ola 40 y el total nombran la misma tarjeta y su saldo.
    const interes = ask(book, "¿Cuánto pago de intereses al mes?");
    assert.equal(interes.kind, "answer");
    if (interes.kind !== "answer") return;
    assert.ok(interes.verdict.includes("$24.00"), interes.verdict);
    assert.ok(interes.verdict.includes("$1,200.00"), interes.verdict);
  });

  it("el patrimonio resta la deuda única, no la suma ciega", () => {
    const book = libroContradiccion();
    const r = ask(book, "¿Cuál es mi patrimonio neto?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes("$1,200.00") || r.verdict.includes("$7,3"), r.verdict);
    assert.ok(!r.verdict.includes("debes $0.00"), r.verdict);
  });

  it("el ranking y el «a quién le debo» ven la tarjeta-línea", () => {
    const book = libroContradiccion();
    // En este libro el préstamo del Banco ($6,134 con interés corrido) es mayor que la tarjeta: el ranking lo nombra a él — y eso también es la cura: los préstamos de entidad rankean.
    const rank = ask(book, "¿En cuál tarjeta debo más?");
    assert.equal(rank.kind, "answer", JSON.stringify(rank).slice(0, 200));
    if (rank.kind !== "answer") return;
    assert.ok(rank.verdict.includes("Banco"), rank.verdict);
    const quien = ask(book, "¿A quién le debo?");
    assert.equal(quien.kind, "answer", JSON.stringify(quien).slice(0, 200));
    if (quien.kind !== "answer") return;
    assert.ok(quien.verdict.includes("$1,200.00") || quien.pieces.some((p) => p.minor === 120000), quien.verdict);
    // Y con la tarjeta-línea como única deuda, el ranking la nombra a ella.
    const solo = createInitial("es", "oscuro");
    solo.months[KEY] = { lines: [
      line({ id: "sal44s", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      line({ id: "tar44s", kind: "expense-fixed", concept: "Tarjeta Visa", amountMinor: 8500, categoryId: "f-creditos", balanceMinor: 120000, balanceCurrency: "USD", aprBps: 2400, recurring: true, nextDue: "2026-10-25", bookedOn: "2026-09-28" }),
    ] };
    solo.settings.display = "USD";
    const rank2 = ask(solo, "¿En cuál tarjeta debo más?");
    assert.equal(rank2.kind, "answer", JSON.stringify(rank2).slice(0, 200));
    if (rank2.kind !== "answer") return;
    assert.ok(rank2.verdict.includes("Tarjeta Visa"), rank2.verdict);
    assert.ok(rank2.verdict.includes("$1,200.00"), rank2.verdict);
  });

  it("el cero honesto sigue: sin deudas de ninguna clase, el total dice cero", () => {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [line({ id: "sal44z", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" })] };
    l.settings.display = "USD";
    const r = ask(l, "¿Cuánto debo en total?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("No debes nada anotado"), r.verdict);
  });
});


describe("banco · ola 45 — el oído que dobla (D2, la Caza II)", () => {
  /* El libro de los nombres hermanos: el seguro vive como
   * «Seguro del carro» y los regalos como «Regalo» — las preguntas
   * en plural recibían un cero falso («$0.00 en eso, de 0 líneas»)
   * con el dinero presente. */
  function libroNombres(): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s45-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `sg45-${mk}`, kind: "subscription", concept: "Seguro del carro", amountMinor: 15000, bookedOn: `${mk}-08`, monthKey: mk, recurring: true, cadence: "monthly" }),
        line({ id: `rg45-${mk}`, kind: "purchase", concept: "Regalo", amountMinor: 6000, bookedOn: `${mk}-20`, monthKey: mk }),
        line({ id: `zp45-${mk}`, kind: "purchase", concept: "Zapato", amountMinor: 5000, bookedOn: `${mk}-15`, monthKey: mk }),
      ] };
    }
    l.settings.display = "USD";
    return l;
  }

  it("«seguros» encuentra a «Seguro del carro» por su primera palabra flexionada", () => {
    const r = ask(libroNombres(), "¿Cuánto pago en seguros al mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$150.00"), r.verdict);
    assert.ok(!r.verdict.includes("de 0 líneas"), r.verdict);
    assert.ok(!r.verdict.includes("$0.00 en eso"), r.verdict);
  });

  it("«regalos» encuentra a «Regalo» por la flexión de número", () => {
    const r = ask(libroNombres(), "¿Cuánto llevo gastado en regalos?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$60.00") || r.verdict.includes("$180.00"), r.verdict);
    assert.ok(!r.verdict.includes("de 0 líneas"), r.verdict);
  });

  it("«zapatos» encuentra a «Zapato», y «gas» jamás encuentra un prefijo", () => {
    const book = libroNombres();
    const z = ask(book, "¿Cuánto gasté en zapatos este mes?");
    assert.equal(z.kind, "answer", JSON.stringify(z).slice(0, 200));
    if (z.kind === "answer") assert.ok(z.verdict.includes("$50.00"), z.verdict);
    // Guardián: sin ciudadano «gas», la pregunta no inventa filtro — la ausencia se nombra o cae, pero nunca suma otra cosa.
    const g = ask(book, "¿Cuánto gasté en gas este mes?");
    if (g.kind === "answer") {
      assert.ok(!g.verdict.includes("$50.00") && !g.verdict.includes("$150.00"), g.verdict);
    }
  });

  it("la pasada exacta sigue mandando: el nombre entero no pasa por la flexión", () => {
    const r = ask(libroNombres(), "¿Cuánto gasté en el seguro del carro este mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$150.00"), r.verdict);
  });
});

describe("banco · ola 46 — el total de todo y lo que me deben en total (F1 + F4, la Caza II)", () => {
  /* El libro de las tres bolsas: queda $600 (salario 1500 − renta
   * 450 − súper 250 − apartado 200), ahorros $600 (tres apartados
   * de $200) y un préstamo dado de $300. */
  function libroTotal46(): LedgerState {
    let l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s46-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r46-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk, recurring: true }),
        line({ id: `p46-${mk}`, kind: "purchase", concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
        line({ id: `a46-${mk}`, kind: "expense-fixed", concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-10`, monthKey: mk }),
      ] };
    }
    l = addLent(l, { id: "lt46", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-10", dueOn: "2026-12-01", note: "" });
    l.settings.display = "USD";
    return l;
  }

  it("el total suma las tres bolsas sin duplicar y declara su borde", () => {
    const r = ask(libroTotal46(), "¿Cuánto dinero tengo en total?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "total");
    assert.ok(r.verdict.includes("$1,500.00"), r.verdict);
    assert.ok(r.verdict.includes("$600.00"), r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.ok(r.verdict.includes("no resta lo que debes"), r.verdict);
    const en = ask(libroTotal46(), "How much money do I have in total?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.equal(en.family, "total");
  });

  it("«¿cuánto me deben en total?» — la mitad que callaba de la familia deudas", () => {
    const r = ask(libroTotal46(), "¿Cuánto me deben en total?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "deudas");
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
    assert.ok(r.verdict.includes("préstamos dados"), r.verdict);
    const en = ask(libroTotal46(), "How much am I owed in total?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.equal(en.family, "deudas");
  });

  it("guardianes: la queda a secas no es el total, y el libro vacío lo dice", () => {
    const book = libroTotal46();
    const q = ask(book, "¿Cuánto tengo?");
    if (q.kind === "answer") assert.notEqual(q.family, "total");
    const empty = createInitial("es", "oscuro");
    empty.settings.display = "USD";
    const r = ask(empty, "¿Cuánto dinero tengo en total?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "total");
    assert.ok(r.verdict.includes("no guarda dinero en ningún lado"), r.verdict);
  });
});


describe("banco · ola 47 — el año contra el año (F5, la Caza II)", () => {
  /* Dos años, enero a octubre: en 2025 el salario era $1,400 y el
   * súper $300; en 2026 el salario es $1,500 y el súper $250. La
   * renta no se movió ($450). */
  function libroDosAnos(soloEste: boolean): LedgerState {
    const l = createInitial("es", "oscuro");
    const years: Array<[number, number, number]> = soloEste ? [[2026, 150000, 25000]] : [[2025, 140000, 30000], [2026, 150000, 25000]];
    for (const [y, sal, sup] of years) {
      for (let m = 1; m <= 10; m++) {
        const mk = `${y}-${String(m).padStart(2, "0")}`;
        l.months[mk] = { lines: [
          line({ id: `s47-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: sal, bookedOn: `${mk}-05`, monthKey: mk }),
          line({ id: `r47-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk, recurring: true }),
          line({ id: `p47-${mk}`, kind: "purchase", concept: "Súper", amountMinor: sup, categoryId: "f-alimentos", bookedOn: `${mk}-12`, monthKey: mk }),
        ] };
      }
    }
    l.settings.display = "USD";
    return l;
  }

  it("el gasto se compara tramo contra tramo: $500 menos, con su porcentaje", () => {
    const r = ask(libroDosAnos(false), "¿Cuánto gasté este año comparado con el año pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$7,000.00"), r.verdict);
    assert.ok(r.verdict.includes("$7,500.00"), r.verdict);
    assert.ok(r.verdict.includes("$500.00 menos"), r.verdict);
    assert.ok(r.verdict.includes("de enero a octubre"), r.verdict);
  });

  it("el ingreso compara en su dirección: $1,000 más", () => {
    const r = ask(libroDosAnos(false), "¿Cuánto gané este año contra el año pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$15,000.00"), r.verdict);
    assert.ok(r.verdict.includes("$14,000.00"), r.verdict);
    assert.ok(r.verdict.includes("$1,000.00 más"), r.verdict);
    const en = ask(libroDosAnos(false), "How much did I spend this year compared to last year?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.ok(en.verdict.includes("$500.00 less") || en.verdict.includes("less than last year"), en.verdict);
  });

  it("sin segundo lado, la ausencia se nombra y la cifra de este año se da", () => {
    const r = ask(libroDosAnos(true), "¿Cuánto gasté este año comparado con el año pasado?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("no tienes nada anotado"), r.verdict);
    assert.ok(r.verdict.includes("$7,000.00"), r.verdict);
  });

  it("guardián: el año a secas sigue siendo la historia plana, sin comparación inventada", () => {
    const r = ask(libroDosAnos(false), "¿Cuánto gasté este año?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(!r.verdict.includes("mismos meses del año pasado"), r.verdict);
  });
});


describe("banco · ola 48 — la cadencia del ingreso y el gasto por umbral (F2 + F3, la Caza II)", () => {
  function libroCadencia(): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s48-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r48-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: `${mk}-01`, monthKey: mk, recurring: true }),
      ] };
    }
    l.settings.display = "USD";
    return l;
  }

  it("la cadencia se mide de las fechas: mensual, con el próximo pago proyectado y declarado", () => {
    const r = ask(libroCadencia(), "¿Cada cuánto me pagan?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ingreso");
    assert.ok(r.verdict.includes("mensual"), r.verdict);
    assert.ok(r.verdict.includes("5 de noviembre de 2026"), r.verdict);
    const en = ask(libroCadencia(), "How often do I get paid?", "en");
    assert.equal(en.kind, "answer", JSON.stringify(en).slice(0, 200));
    if (en.kind === "answer") assert.ok(en.verdict.includes("monthly"), en.verdict);
  });

  it("los huecos que bailan se dicen irregulares, y con dos pagos no hay patrón", () => {
    const l = createInitial("es", "oscuro");
    l.months["2026-08"] = { lines: [line({ id: "n48a", kind: "income-variable", concept: "Negocio", amountMinor: 60000, bookedOn: "2026-08-03", monthKey: "2026-08" })] };
    l.months["2026-09"] = { lines: [line({ id: "n48b", kind: "income-variable", concept: "Negocio", amountMinor: 90000, bookedOn: "2026-09-20", monthKey: "2026-09" })] };
    l.months[KEY] = { lines: [line({ id: "n48c", kind: "income-variable", concept: "Negocio", amountMinor: 50000, bookedOn: "2026-10-08", monthKey: KEY })] };
    l.settings.display = "USD";
    const r = ask(l, "¿Cada cuánto me pagan?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("no trae un ritmo fijo"), r.verdict);
    assert.ok(r.verdict.includes("de 18 a 48 días"), r.verdict);
    const l2 = createInitial("es", "oscuro");
    l2.months["2026-09"] = { lines: [line({ id: "s48x", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-09-05", monthKey: "2026-09" })] };
    l2.months[KEY] = { lines: [line({ id: "s48y", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05", monthKey: KEY })] };
    l2.settings.display = "USD";
    const r2 = ask(l2, "¿Cada cuánto me pagan?");
    assert.equal(r2.kind, "answer", JSON.stringify(r2).slice(0, 200));
    if (r2.kind === "answer") assert.ok(r2.verdict.includes("no hay patrón que medir"), r2.verdict);
  });

  function libroUmbral(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "s48u", kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: "2026-10-05" }),
      line({ id: "r48u", kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", bookedOn: "2026-10-01", recurring: true }),
      line({ id: "p48u", kind: "purchase", concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: "2026-10-12" }),
      line({ id: "c48a", kind: "purchase", concept: "Café", amountMinor: 500, bookedOn: "2026-10-03" }),
      line({ id: "c48b", kind: "purchase", concept: "Café", amountMinor: 500, bookedOn: "2026-10-10" }),
      line({ id: "c48c", kind: "purchase", concept: "Café", amountMinor: 500, bookedOn: "2026-10-17" }),
      line({ id: "h48a", kind: "purchase", concept: "Chicle", amountMinor: 200, bookedOn: "2026-10-06" }),
      line({ id: "h48b", kind: "purchase", concept: "Chicle", amountMinor: 200, bookedOn: "2026-10-13" }),
      line({ id: "b48a", kind: "purchase", concept: "Pasaje", amountMinor: 800, bookedOn: "2026-10-07" }),
      line({ id: "b48b", kind: "purchase", concept: "Pasaje", amountMinor: 800, bookedOn: "2026-10-14" }),
    ] };
    l.settings.display = "USD";
    return l;
  }

  it("el gasto por umbral suma lo chico: conteo, suma y parte del período", () => {
    const r = ask(libroUmbral(), "¿Cuánto he gastado en cosas de menos de $20 este mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$35.00"), r.verdict);
    assert.ok(r.verdict.includes("son 7"), r.verdict);
    assert.ok(r.verdict.includes("5%"), r.verdict);
  });

  it("el gasto hormiga sin monto declara su vara de $20, y el guardián protege la suma plana", () => {
    const r = ask(libroUmbral(), "¿Cuánto es mi gasto hormiga?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("Cuento como hormiga"), r.verdict);
    assert.ok(r.verdict.includes("$35.00"), r.verdict);
    const plain = ask(libroUmbral(), "¿Cuánto gasté este mes?");
    assert.equal(plain.kind, "answer", JSON.stringify(plain).slice(0, 200));
    if (plain.kind === "answer") assert.ok(!plain.verdict.includes("gastos de menos de"), plain.verdict);
  });
});


describe("banco · ola 55 — los números en palabras (la captura de Oscar, 2026-11-23)", () => {
  function libro55(): LedgerState {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = { lines: [
      line({ id: "o55-sal", kind: "income-fixed", concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
      line({ id: "o55-rem", kind: "expense-fixed", concept: "Remesa a Mamá", amountMinor: 17000, categoryId: "f-remesas", bookedOn: "2026-10-10" }),
    ] };
    ledger.settings.display = "USD";
    return ledger;
  }

  it("la pregunta de la captura: la suma dictada en palabras se suma", () => {
    const r = ask(libro55(), "Si envío a Nicaragua veinticinco dólares más ciento cuatro más treinta, ¿cuánto serían?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora", r.verdict);
    assert.ok(r.verdict.includes("$159.00"), r.verdict);
    assert.deepEqual(r.pieces.map((p) => p.minor), [2500, 10400, 3000]);
  });

  it("las formas compuestas: «treinta y cinco», «dos mil», «quinientos»", () => {
    const a = ask(libro55(), "¿Cuánto son treinta y cinco más quince?");
    assert.equal(a.kind, "answer", JSON.stringify(a).slice(0, 200));
    if (a.kind === "answer") assert.ok(a.verdict.includes("$50.00"), a.verdict);
    const b = ask(libro55(), "¿Cuánto es dos mil más quinientos?");
    assert.equal(b.kind, "answer", JSON.stringify(b).slice(0, 200));
    if (b.kind === "answer") assert.ok(b.verdict.includes("$2,500.00"), b.verdict);
  });

  it("el inglés también dicta: «two hundred fifty plus fifty»", () => {
    const r = ask(libro55(), "How much is two hundred fifty plus fifty?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora", r.verdict);
    assert.ok(r.verdict.includes("$300.00"), r.verdict);
  });

  it("la suma en dígitos con su voz natural: «¿cuánto son 25 más 30?»", () => {
    const r = ask(libro55(), "¿Cuánto son 25 más 30?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "calculadora", r.verdict);
    assert.ok(r.verdict.includes("$55.00"), r.verdict);
  });

  it("la escala tras dígitos no se lee dos veces: «5 mil más 500» son $5,500", () => {
    const r = ask(libro55(), "¿Cuánto son 5 mil más 500?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("$5,500.00"), r.verdict);
    assert.ok(!r.verdict.includes("$6,500.00"), r.verdict);
  });

  it("el hipotético oye el monto en palabras: «si gasto doscientos» resta de verdad", () => {
    const r = ask(libro55(), "Si gasto doscientos dólares, ¿cuánto me queda?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "hipotetico", r.verdict);
    assert.ok(r.verdict.includes("$630.00"), r.verdict);
  });

  it("los falsos amigos callan: «una» no es monto y el total sigue siendo del total", () => {
    const a = ask(libro55(), "¿Cuánto son una más dos?");
    assert.ok(!(a.kind === "answer" && a.family === "calculadora"), JSON.stringify(a).slice(0, 200));
    const b = ask(libro55(), "¿Cuánto tengo en total?");
    assert.equal(b.kind, "answer", JSON.stringify(b).slice(0, 200));
    if (b.kind === "answer") assert.equal(b.family, "total", b.verdict);
  });
});

describe("banco · ola 54 — el mutante del voseo muere (la Caza III, agenda f)", () => {
  it("el mapa de voseo entero está cercado, par por par", () => {
    assert.equal(normalizeEs("tenes"), "tienes");
    assert.equal(normalizeEs("queres"), "quieres");
    assert.equal(normalizeEs("podes"), "puedes");
    assert.equal(normalizeEs("venis"), "vienes");
    assert.equal(normalizeEs("decis"), "dices");
    assert.equal(normalizeEs("deci"), "di");
  });

  it("la ruta que depende de la normalización: «¿qué podés hacer?» llega a capacidades", () => {
    const r = ask(fixture(), "¿Qué podés hacer?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "capacidades");
  });

  it("y su espejo: «¿qué no podés hacer?» llega a límites", () => {
    const r = ask(fixture(), "¿Qué no podés hacer?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "limites");
  });
});

describe("banco · ola 53 — una sola casa por significado (la Caza III, agenda e)", () => {
  function libro53(): LedgerState {
    const l = createInitial("es", "oscuro");
    l.months[KEY] = { lines: [
      line({ id: "sal53", kind: "income-fixed", concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05", monthKey: KEY }),
      line({ id: "casa53", kind: "expense-fixed", concept: "Casa", amountMinor: 20000, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-10-03", monthKey: KEY }),
      line({ id: "net53", kind: "subscription", concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28", monthKey: KEY }),
    ] };
    l.settings.display = "USD";
    return l;
  }

  it("la capacidad desnuda en inglés va a la verificación, como en español", () => {
    const r = ask(libro53(), "Can I afford to spend $100?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("$750.01"), r.verdict);
  });

  it("la misma pregunta en los dos idiomas recibe la misma familia", () => {
    const es = ask(libro53(), "¿Me alcanza para gastar $100?");
    const en = ask(libro53(), "Can I afford to spend $100?", "en");
    assert.equal(es.kind, "answer");
    assert.equal(en.kind, "answer");
    if (es.kind !== "answer" || en.kind !== "answer") return;
    assert.equal(es.family, en.family);
  });

  it("guardián: la premisa compuesta sigue en la capacidad, en inglés también", () => {
    const r = ask(libro53(), "If I buy a $500 ticket and rent a house for $1,200, could I afford it?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
  });

  it("guardián: lo que se repite cada mes no se cede — «per month» sigue en la capacidad", () => {
    const r = ask(libro53(), "Can I afford $100 per month for the gym?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "factibilidad");
  });
});

describe("banco · ola 52 — el extremo por abajo oye «más chico» (la Caza III, agenda d)", () => {
  it("«¿Cuál fue mi gasto más chico este mes?» responde el menor, no el silencio", () => {
    const ledger = fixture();
    const r = ask(ledger, "¿Cuál fue mi gasto más chico este mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "extremos");
    assert.ok(r.verdict.includes("más pequeño"), r.verdict);
    assert.ok(r.verdict.includes("$24.57"), r.verdict);
  });

  it("el par mínimo se separa: más chico y más grande dan veredictos distintos", () => {
    const ledger = fixture();
    const a = ask(ledger, "¿Cuál fue mi gasto más grande este mes?");
    const b = ask(ledger, "¿Cuál fue mi gasto más chico este mes?");
    assert.equal(a.kind, "answer");
    assert.equal(b.kind, "answer");
    if (a.kind !== "answer" || b.kind !== "answer") return;
    assert.ok(a.verdict.includes("$170.00"), a.verdict);
    assert.notEqual(a.verdict, b.verdict);
  });

  it("«más chica» también oye, sobre las compras — y el adjetivo concuerda", () => {
    const r = ask(fixture(), "¿Cuál fue mi compra más chica?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "extremos");
    assert.ok(r.verdict.includes("«Camisa»"), r.verdict);
    assert.ok(r.verdict.includes("$50.00"), r.verdict);
    assert.ok(r.verdict.includes("compra más pequeña"), r.verdict);
  });
});

describe("banco · ola 51 — la costura bilingüe (la Caza III, agenda b)", () => {
  function libroCostura51(concepto: string): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s51-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r51-${mk}`, kind: "expense-fixed", concept: concepto, amountMinor: 45000, categoryId: "f-casa", recurring: true, bookedOn: `${mk}-01`, monthKey: mk }),
      ] };
    }
    l.settings.display = "USD";
    return l;
  }

  it("el promedio en inglés encuentra la renta anotada en español: $450.00, no un cero", () => {
    const r = ask(libroCostura51("Renta"), "How much do I spend on rent per month?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
  });

  it("la historia en inglés ya no imprime el cero falso sobre la misma costura", () => {
    const r = ask(libroCostura51("Renta"), "How much did I spend on rent this month?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
    assert.ok(!r.verdict.includes("$0.00"), r.verdict);
  });

  it("el conteo en inglés cobra su cifra sobre la costura (la frontera que la Ola 50 declaró)", () => {
    const r = ask(libroCostura51("Renta"), "How many times did I pay rent this month?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
    assert.ok(r.verdict.includes("1 time"), r.verdict);
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
  });

  it("la costura cose en los dos sentidos: concepto en inglés, pregunta en español", () => {
    const r = ask(libroCostura51("Rent"), "¿Cuánto gasto en renta al mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "promedio");
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
  });
});

describe("banco · ola 50 — el conteo de eventos en su casa (la Caza III, agenda a+c)", () => {
  function libroConteo50(): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s50-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `r50-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", recurring: true, bookedOn: `${mk}-01`, monthKey: mk }),
        line({ id: `i50-${mk}`, kind: "expense-fixed", concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", bookedOn: `${mk}-28`, monthKey: mk, nextDue: mk === KEY ? "2026-10-28" : "" }),
      ] };
    }
    l.settings.display = "USD";
    return l;
  }

  it("el conteo en inglés ya no cae en ya-pagué: lo responde frecuencia, con su conteo", () => {
    const r = ask(libroConteo50(), "How many times did I pay internet this month?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
    assert.ok(r.verdict.includes("1 time"), r.verdict);
    assert.ok(r.verdict.includes("$49.99"), r.verdict);
    // Con «rent» la familia ya es frecuencia (la precedencia quedó
    // curada); su CIFRA depende de la costura bilingüe — «rent»
    // contra el concepto «Renta» sin sub en la línea — que es la
    // Ola 51, y allí se cerca. Aquí se cerca la casa, no la cifra.
    const rr = ask(libroConteo50(), "How many times did I pay rent this month?", "en");
    assert.equal(rr.kind, "answer");
    if (rr.kind === "answer") assert.equal(rr.family, "frecuencia");
  });

  it("el conteo en español dice «fue 1 vez» — y el conteo no viaja como pieza de dinero", () => {
    const r = ask(libroConteo50(), "¿Cuántas veces pagué renta este mes?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
    assert.ok(r.verdict.includes("fue 1 vez"), r.verdict);
    assert.ok(r.verdict.includes("$450.00"), r.verdict);
    assert.equal(r.pieces.length, 1);
    assert.equal(r.pieces[0].minor, 45000);
  });

  it("el conteo en inglés sin tiempo también llega a frecuencia", () => {
    const r = ask(libroConteo50(), "How many times did I pay internet?", "en");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "frecuencia");
  });

  it("guardianes: el estado sigue en ya-pagué y los ciudadanos en conteo", () => {
    const a = ask(libroConteo50(), "¿Ya pagué internet?");
    assert.equal(a.kind, "answer");
    if (a.kind === "answer") assert.equal(a.family, "ya-pague");
    const b = ask(libroConteo50(), "How many cards do I have?", "en");
    assert.equal(b.kind, "answer");
    if (b.kind === "answer") assert.equal(b.family, "conteo");
  });
});

describe("banco · ola 49 — las ausencias con nombre (F6 + F7, la Caza II)", () => {
  function libroAhorro49(conIntereses: boolean): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      l.months[mk] = { lines: [
        line({ id: `s49-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
        line({ id: `a49-${mk}`, kind: "expense-fixed", concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-10`, monthKey: mk }),
      ] };
    }
    if (conIntereses) l.months[KEY].lines.push(line({ id: "i49", kind: "income-variable", concept: "Intereses", amountMinor: 1500, bookedOn: "2026-10-15" }));
    l.settings.display = "USD";
    return l;
  }

  it("el rendimiento sin anotar nombra su dato ausente — no contesta con el stock", () => {
    const r = ask(libroAhorro49(false), "¿Cuánto interés he ganado en mis ahorros?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes("no lo guarda"), r.verdict);
    assert.ok(r.verdict.includes("el rendimiento"), r.verdict);
    assert.ok(r.verdict.includes("$600.00"), r.verdict);
  });

  it("el rendimiento anotado como ingreso se suma y se responde de verdad", () => {
    const r = ask(libroAhorro49(true), "¿Cuánto interés he ganado en mis ahorros?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "falta");
    assert.ok(r.verdict.includes("$15.00"), r.verdict);
    assert.ok(r.verdict.includes("tienes anotados"), r.verdict);
  });

  function libroImpuestos(conLinea: boolean): LedgerState {
    const l = createInitial("es", "oscuro");
    for (const mk of ["2026-08", "2026-09", KEY]) {
      const lines: Line[] = [line({ id: `s49i-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk })];
      if (conLinea) lines.push(line({ id: `t49-${mk}`, kind: "expense-fixed", concept: "Impuestos", amountMinor: 12000, bookedOn: `${mk}-18`, monthKey: mk }));
      l.months[mk] = { lines };
    }
    l.settings.display = "USD";
    return l;
  }

  it("«pagué de X» llega a la historia: con la línea presente, suma el año", () => {
    const r = ask(libroImpuestos(true), "¿Cuánto pagué de impuestos este año?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.equal(r.family, "historia");
    assert.ok(r.verdict.includes("$360.00"), r.verdict);
  });

  it("«pagué de X» sin la línea: la ausencia se nombra, no se disfraza", () => {
    const r = ask(libroImpuestos(false), "¿Cuánto pagué de impuestos este año?");
    assert.equal(r.kind, "answer", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "answer") return;
    assert.ok(r.verdict.includes("«impuestos»"), r.verdict);
  });
});

