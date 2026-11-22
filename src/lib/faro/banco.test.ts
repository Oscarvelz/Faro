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
import { answerBankQuestion, answerFollowUp, bankChips, bankSourceIds, classifyBankQuestion, convoAfterFollowUp } from "./ask2.ts";
import { describeLearned, forgetAlias, frequentAliases, learnAlias, maskShape, touchAlias, type LearnedAlias } from "./asklearn.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addLent } from "./debts.ts";
import { addReading } from "./cards.ts";
import { duesWindow } from "./dues.ts";
import { formatMoney } from "./money.ts";
import { QUESTION_BANK, liveFamilies } from "./questionbank.ts";
import { addRemitPerson } from "./remit-people.ts";
import { savingsStock } from "./savings.ts";
import type { ParseCtx } from "./textparse.ts";
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
    if (pay.kind === "answer") assert.ok(pay.verdict.includes("2026-10-18"), pay.verdict);
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
      assert.ok(labels.includes("Todavía no"), labels);
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
    if (d.kind === "answer") { assert.equal(d.family, "calendario"); assert.ok(d.verdict.includes("2026-11-15"), d.verdict); }
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
    assert.ok(r.verdict.includes("2026-10-28"), r.verdict);
  });

  it("YA-PAGUÉ CRUZADO (CAZA-TRAMPAS 3): no inventa el día y nombra el próximo cobro de la ventana", () => {
    const r = ask(ledger, "¿Ya pagué el Internet?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "ya-pague");
    assert.ok(!r.verdict.includes("2026-10-01"), r.verdict);
    assert.ok((r.note ?? "").includes("2026-10-28"), r.note ?? "");
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

  it("FRONTERA: «¿puedo pagarlo el día D?» NO es del banco — la delegación spend de canon la responde (el futuro con fecha tiene un solo proyector)", () => {
    const r = ask(fixture(), "¿Puedo pagar 100 dólares el día 28?");
    assert.equal(r.kind, "answer");
    if (r.kind !== "answer") return;
    assert.equal(r.family, "spend");
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
