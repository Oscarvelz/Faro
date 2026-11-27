/**
 * ola74 — EL INSTRUMENTO SE ENDURECE: la batería permanente de la
 * Ola 74. Pares direccionales (DIR), cercas de invariancia (INV),
 * la clase de la reparación falsa medida aparte, el álgebra de la
 * exclusión con excepción, la adversaria de silencios y el par
 * same_abstention. El diseño vive en OLA74-DIR-INV-DISENO.md y el
 * acta de la medición, en el cierre de la ola.
 *
 * La vara de los pares DIR es el RESULTADO, no la etiqueta: el
 * fallo crítico es misma familia, mismo signo y misma cifra en
 * los dos miembros del par. La vara de las INV es la igualdad
 * EXACTA en centavos (solo INV-5 admite el redondeo declarado de
 * la tasa, un centavo como máximo).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerBankQuestion, repairGateTypos } from "./ask2.ts";
import type { BankResult } from "./ask2.ts";
import { foldQ } from "./lexicon.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { addRemitPerson } from "./remit-people.ts";
import { addLent } from "./debts.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";
function ctx(ledger: LedgerState, lang: "es" | "en" = "es"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}
function ask(ledger: LedgerState, raw: string, lang: "es" | "en" = "es"): BankResult {
  return answerBankQuestion(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, ctx(ledger, lang), TODAY);
}
function ans(ledger: LedgerState, raw: string, lang: "es" | "en" = "es"): Extract<BankResult, { kind: "answer" }> {
  const r = ask(ledger, raw, lang);
  assert.equal(r.kind, "answer", `se esperaba respuesta para «${raw}», llegó ${r.kind}`);
  return r as Extract<BankResult, { kind: "answer" }>;
}
function total74(r: Extract<BankResult, { kind: "answer" }>): number {
  return r.pieces.length ? r.pieces[0].minor : 0;
}
function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], bookedOn: `${KEY}-01`, ...partial,
  };
}
/** El libro de la ola: gasto de octubre $1,480 en 9 líneas (renta
 * $800, comida $150, gasolina $60, remesas $170+$50, mercado $100,
 * farmacia $50, mercado $70, taxi $30), septiembre con renta $800
 * y comida $120; Carlos debe $300 y a Pedro se le deben $200. */
function libro74(): LedgerState {
  let l = createInitial("es", "oscuro");
  l.settings.display = "USD";
  l = addRemitPerson(l, "Mamá", "mama").state;
  l.months[KEY] = { lines: [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-10-05" }),
    line({ id: "renta", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-10-01" }),
    line({ id: "comida", kind: "expense" as LineKind, concept: "Comida", amountMinor: 15000, categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: "2026-10-11" }),
    line({ id: "gasolina", kind: "expense" as LineKind, concept: "Gasolina", amountMinor: 6000, categoryId: "f-transporte", subId: "f.transporte.gas", bookedOn: "2026-10-09" }),
    line({ id: "rm1", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 17000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-10", to: "mama" }),
    line({ id: "rm2", kind: "expense-fixed" as LineKind, concept: "Remesa", amountMinor: 5000, categoryId: "f-remesas", subId: "f.remesas.envios", bookedOn: "2026-10-12", to: "mama" }),
    line({ id: "q1a", kind: "expense" as LineKind, concept: "Mercado", amountMinor: 10000, categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: "2026-10-03" }),
    line({ id: "q1b", kind: "expense" as LineKind, concept: "Farmacia", amountMinor: 5000, categoryId: "personales", subId: "v.personales.salud", bookedOn: "2026-10-15" }),
    line({ id: "q2a", kind: "expense" as LineKind, concept: "Mercado", amountMinor: 7000, categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: "2026-10-16" }),
    line({ id: "q2b", kind: "expense" as LineKind, concept: "Taxi", amountMinor: 3000, categoryId: "f-transporte", subId: "f.transporte.taxi", bookedOn: "2026-10-28" }),
  ] };
  l.months[PREV] = { lines: [
    line({ id: "renta9", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 80000, categoryId: "f-casa", subId: "f.casa.renta", bookedOn: "2026-09-01", monthKey: PREV }),
    line({ id: "comida9", kind: "expense" as LineKind, concept: "Comida", amountMinor: 12000, categoryId: "f-alimentos", subId: "f.alimentos.super", bookedOn: "2026-09-11", monthKey: PREV }),
  ] };
  l = addLent(l, { id: "lent1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-15", dueOn: "", note: "" });
  l.loans = [{ id: "loan1", lender: "Pedro", who: "person", kind: "plain", amountMinor: 20000, currency: "USD", aprBps: 0, takenOn: "2026-09-01", book: "variable", note: "" }];
  return l;
}

describe("banco · ola 74 · DIR-A2 la dirección de la deuda", () => {
  it("cada lado responde su cifra y el lado contrario se corrige en voz alta", () => {
    const l = libro74();
    const a = ans(l, "¿Cuánto me debe Carlos?");
    assert.match(a.verdict, /\$300\.00/);
    const b = ans(l, "¿Cuánto le debo a Carlos?");
    assert.match(b.verdict, /al revés/i);
    assert.match(b.verdict, /\$300\.00/);
    const c = ans(l, "¿Cuánto le debo a Pedro?");
    assert.match(c.verdict, /\$200\.00/);
    const d = ans(l, "¿Cuánto me debe Pedro?");
    assert.match(d.verdict, /al revés/i);
    assert.match(d.verdict, /\$200\.00/);
    // El fallo crítico del par: misma familia, mismo signo, misma cifra.
    assert.notEqual(a.verdict, b.verdict);
    assert.notEqual(c.verdict, d.verdict);
  });
});

describe("banco · ola 74 · DIR-B2 lo recibido no es remesa", () => {
  it("lo recibido se lee como ingreso, jamás como remesa enviada", () => {
    const l = libro74();
    const r = ans(l, "¿Cuánto he recibido de Nicaragua?");
    assert.equal(r.family, "historia");
    assert.match(r.verdict, /entraron/i);
    const e = ask(l, "¿Cuánto he enviado a Nicaragua?");
    // ENMIENDA DE CANON (integración de la Ola 74): la copia calla
    // («unknown»), pero canon responde la NEGATIVA NOMBRADA de la
    // suma por persona (Ola 27): «No sé quién es «nicaragua» en tu
    // libro… no voy a darte la remesa de otra persona». La
    // propiedad del par se sostiene entera — ninguna cifra ajena
    // se sirve como suya — y la forma de canon nombra el miss en
    // vez de callarlo, la honestidad de la casa desde la Ola 12.
    // La aserción se re-apunta a esa forma, con su razón escrita.
    assert.equal(e.kind, "answer", "sin país en el libro, el envío no fabrica: rehúsa nombrando");
    if (e.kind === "answer") {
      assert.equal(e.family, "remesas");
      assert.match(e.verdict, /nicaragua/i);
      assert.doesNotMatch(e.verdict, /\$220\.00|\$170\.00/, "ninguna remesa ajena se da como suya");
    }
  });
});

describe("banco · ola 74 · DIR-D1/D2 e INV-4/INV-3 las particiones exactas", () => {
  it("el total es la parte más el todo sin la parte (INV-4)", () => {
    const l = libro74();
    const tot = total74(ans(l, "¿Cuánto gasté en octubre?"));
    const sin = total74(ans(l, "¿Cuánto gasté en octubre sin la renta?"));
    const con = total74(ans(l, "¿Cuánto gasté en la renta en octubre?"));
    assert.equal(tot, 148000);
    assert.equal(sin + con, tot, "INV-4 exige igualdad exacta");
  });
  it("el umbral tiene dos lados y el igual no cae en ninguno (DIR-D2)", () => {
    const l = libro74();
    const over = ans(l, "¿Cuánto gasté en cosas de más de $100?");
    const under = ans(l, "¿Cuánto gasté en cosas de menos de $100?");
    assert.equal(total74(over), 112000);
    assert.equal(total74(under), 26000);
    // La línea de exactamente $100 queda fuera de los dos lados:
    // 112000 + 26000 + 10000 = el total del mes.
    assert.equal(total74(over) + total74(under) + 10000, 148000);
  });
  it("el mes es su primera quincena más su segunda (INV-3)", () => {
    const l = libro74();
    const mes = total74(ans(l, "¿Cuánto gasté este mes?"));
    const q1 = total74(ans(l, "¿Cuánto gasté en la primera quincena?"));
    const q2 = total74(ans(l, "¿Cuánto gasté en la segunda quincena?"));
    assert.equal(q1 + q2, mes, "INV-3 exige igualdad exacta: ni días huérfanos ni días dobles");
    assert.equal(total74(ans(l, "¿Cuánto gasté esta quincena?")), q2, "hoy es 22: esta quincena es la segunda");
  });
});

describe("banco · ola 74 · INV-1 la unión de dos ciudadanos", () => {
  it("dos ciudadanos unidos se suman como unión, con cada parte nombrada", () => {
    const l = libro74();
    const u = ans(l, "¿Cuánto gasté en comida y transporte?");
    assert.equal(total74(u), 24000);
    assert.match(u.verdict, /Comida \$150\.00/);
    assert.match(u.verdict, /Transporte \$90\.00/);
    const o = ans(l, "¿Cuánto gasté en comida o gasolina?");
    assert.equal(total74(o), 21000);
    // Y la unión es la suma de las preguntas por separado (INV-1).
    assert.equal(total74(ans(l, "¿Cuánto gasté en comida?")) + total74(ans(l, "¿Cuánto gasté en transporte?")), 24000);
  });
});

describe("banco · ola 74 · INV-5 y las filas nuevas de la matriz", () => {
  it("la conversión conmuta entre sus dos formas (INV-5)", () => {
    const l = libro74();
    const a = ans(l, "¿Cuánto son 100 dólares en córdobas?");
    const b = ans(l, "¿Cuánto es 100 USD en NIO?");
    assert.match(a.verdict, /C\$3,662\.43/);
    assert.equal(a.verdict, b.verdict);
  });
  it("los sinónimos de período dan la misma cifra", () => {
    const l = libro74();
    const a = total74(ans(l, "¿Cuánto gasté este mes?"));
    assert.equal(total74(ans(l, "¿Cuánto gasté en el mes actual?")), a);
    assert.equal(total74(ans(l, "¿Cuánto llevo gastado este mes?")), a);
  });
  it("el alias del libro: el nombre del usuario da la cifra del nombre de fábrica", () => {
    const a = libro74();
    const b = libro74();
    for (const cat of b.structure.categories) for (const s of cat.subs) if (s.id === "f.casa.renta") s.customName = "El alquiler";
    assert.equal(total74(ans(a, "¿Cuánto gasté en renta?")), 80000);
    assert.equal(total74(ans(b, "¿Cuánto gasté en el alquiler?")), 80000);
  });
});

describe("banco · ola 74 · la puerta del pretérito de recibir", () => {
  it("recibí, cobré, me pagaron y me depositaron son historia de ingreso", () => {
    const l = libro74();
    for (const q of ["¿Cuánto recibí este mes?", "¿Cuánto cobré este mes?", "¿Cuánto me pagaron este mes?", "¿Cuánto me depositaron este mes?", "¿Cuánto recibo al mes?", "¿Cuánto dinero recibí?", "¿Cuánto dinero gané?"]) {
      const r = ans(l, q);
      assert.equal(r.family, "historia", q);
      assert.match(r.verdict, /entraron/i, q);
      assert.equal(total74(r), 100000, q);
    }
    // El guardián: «recibos» como cosa no se vuelve ingreso.
    const g = ans(l, "¿Cuánto gasté en recibos?");
    assert.match(g.verdict, /nada anotado como/i);
  });
});

describe("banco · ola 74 · la reparación falsa, medida aparte", () => {
  it("la reparación no deforma las palabras correctas del mundo", () => {
    const words = ["cobre", "ganado", "cargo", "tasa", "saldo", "cuenta", "pago", "gasto", "ingreso", "deuda", "ahorro", "recibo", "factura", "tarjeta", "banco", "dinero", "moneda", "quincena", "semana", "renta", "comida", "salud", "sueldo", "salario", "credito", "prestamo", "interes", "efectivo", "ahorros", "cuentas"];
    for (const w of words) {
      assert.equal(repairGateTypos(foldQ(w), undefined, "es"), w, `«${w}» no debe deformarse`);
    }
    // Y el espécimen que cazó la clase: «cobré» llega como «cobre»
    // tras el plegado y ya no sale como «cover».
    assert.equal(repairGateTypos(foldQ("¿cuánto cobré este mes?"), undefined, "es"), "¿cuanto cobre este mes?");
  });
});

describe("banco · ola 74 · la exclusión con excepción y el cruce con la comparación", () => {
  it("salvo re-incluye dentro de lo excluido, y excluye dentro del filtro", () => {
    const l = libro74();
    const a = ans(l, "¿Cuánto gasté sin la comida, salvo el mercado?");
    assert.equal(total74(a), 133000, "el total menos el concepto Comida; el mercado nunca salió bajo esta lectura");
    const a2 = ans(l, "¿Cuánto gasté sin los alimentos, salvo el mercado?");
    assert.equal(total74(a2), 133000, "bajo la lectura de categoría: fuera los alimentos, el mercado re-incluido");
    assert.match(a2.verdict, /Salvo «Mercado» \(\$170\.00\), que sí entra/);
    const b = ans(l, "¿Cuánto gasté en salud, salvo la farmacia?");
    assert.equal(total74(b), 0);
    assert.match(b.verdict, /Sin contar «Farmacia» \(\$50\.00\)/);
    const c = ans(l, "¿Cuánto gasté excepto la renta?");
    assert.equal(total74(c), 68000, "«excepto» como primer operador es la exclusión misma");
  });
  it("la comparación con exclusión compara los dos meses con la exclusión aplicada", () => {
    /* REESCRITO 2026-11-26 por el fallo de los meses de Oscar (a
     * propuesta de Hark): la comparación es A IGUAL TRAMO. La forma
     * vieja sumaba el mapa entero de este mes ($680) contra el mes
     * pasado; el tramo justo (del 1 al 22) deja fuera la línea de
     * $30 fechada después de hoy: este mes $650. La cerca nueva vive
     * en comparacion-tramos.test.ts; aquí queda el cruce con la
     * exclusión bajo la regla nueva. */
    const l = libro74();
    const r = ans(l, "¿Cuánto gasté este mes sin la renta, comparado con el mes pasado?");
    assert.equal(r.family, "comparar");
    assert.match(r.verdict, /Sin contar «Renta»/);
    assert.match(r.verdict, /a igual tramo/);
    assert.match(r.verdict, /este mes \$650\.00 y el mes pasado \$120\.00/);
  });
});

describe("banco · ola 74 · la adversaria de silencios y same_abstention", () => {
  it("lo que el libro no tiene ni el mundo no le toca: silencio honesto", () => {
    const l = libro74();
    for (const q of [
      "¿Cuánto tiene mi hermano en su cuenta?",
      "¿Gasto más que otros usuarios?",
      "¿Cuánto cobra el banco por una transferencia?",
      "¿A cuánto estará el dólar en diciembre?",
      "¿Cuál será la tasa de cambio el próximo mes?",
    ]) {
      assert.equal(ask(l, q).kind, "unknown", q);
    }
  });
  it("el límite de inversión se dice igual en sus tres formas (same_abstention)", () => {
    const l = libro74();
    for (const q of ["¿Debería invertir en acciones?", "¿En qué invierto mis ahorros?", "¿Me conviene invertir?"]) {
      assert.equal(ans(l, q).family, "frontera", q);
    }
  });
  it("la presuposición falsa no fabrica la cifra (el recibo que no llegó)", () => {
    const l = libro74();
    l.months[PREV].lines.push(line({ id: "agua9", kind: "expense" as LineKind, concept: "Agua", amountMinor: 4000, categoryId: "f-casa", subId: "f.casa.agua", bookedOn: "2026-09-05", monthKey: PREV }));
    assert.equal(ask(l, "¿En qué porcentaje subió mi recibo de agua este mes respecto al mes pasado?").kind, "unknown");
    const cero = ans(l, "¿Cuánto gasté en agua este mes?");
    assert.match(cero.verdict, /\$0\.00/);
    assert.match(cero.verdict, /de 0 líneas/);
  });
});
