/**
 * relato — la batería del Escalón 1 de la rama agente: el relato que se
 * asienta. Los especímenes son las formas del relato real (la de Alvin:
 * varias cosas contadas de un tirón) y las cercas son las de la
 * propuesta: un borrador por cláusula, el concepto UBICADO en el libro
 * cuando el libro ya lo conoce, eco en palabras llanas, deduplicación
 * contra lo ya asentado, y la regla de oro — casilla obligatoria vacía
 * = pregunta, nunca adivinanza. La capa es pura: no toca el estado.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import { parsePrograma, parseRelato, vigilancia } from "./relato.ts";
import type { Lang, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function fixture(conLuzDeHoy = false): LedgerState {
  const ledger = createInitial("es", "oscuro");
  // Un solo bolsillo y una sola cuenta: el libro de los especímenes.
  const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
  if (!ahorro) throw new Error("missing savings");
  ahorro.subs = [{ id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 }];
  ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
  ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
  const lines: Line[] = [
    line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" }),
    line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
    line({ id: "internet", kind: "subscription" as LineKind, concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", recurring: true, nextDue: "2026-10-28", bookedOn: "2026-09-28" }),
  ];
  if (conLuzDeHoy) {
    lines.push(line({ id: "luz-hoy", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 4500, categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: TODAY }));
  }
  ledger.months[KEY] = { lines };
  ledger.settings.display = "USD";
  return ledger;
}

function relato(ledger: LedgerState, raw: string, lang: Lang = "es") {
  return parseRelato(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}

describe("relato E1 · el relato simple", () => {
  it("un gasto se ubica en el libro: concepto, categoría y sub del libro", () => {
    const r = relato(fixture(), "pagué la luz 45");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    const d = r.drafts[0];
    assert.equal(d.op, "gasto");
    assert.equal(d.amountMinor, 4500);
    assert.equal(d.concept, "Luz");
    assert.equal(d.categoryId, "f-casa");
    assert.equal(d.subId, "f.casa.servicios");
    assert.equal(d.date, TODAY);
    assert.equal(d.duplicate, null);
    assert.ok(r.echo.includes("$45.00"), r.echo);
    assert.ok(r.echo.includes("¿Lo asiento así?"), r.echo);
  });

  it("un verbo, dos gastos: «pagué 45 de luz y 30 de flores» da dos borradores", () => {
    const r = relato(fixture(), "pagué 45 de luz y 30 de flores");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 2);
    assert.equal(r.drafts[0].amountMinor, 4500);
    assert.equal(r.drafts[0].concept, "Luz");
    assert.equal(r.drafts[1].amountMinor, 3000);
    assert.equal(r.drafts[1].concept, "Flores");
    assert.equal(r.drafts[1].categoryId, ""); // el libro no conoce «flores»: queda sin ubicar, no se inventa
  });

  it("el monto en palabras se oye: «cuarenta y cinco dólares»", () => {
    const r = relato(fixture(), "pagué la luz cuarenta y cinco dólares");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    assert.equal(r.drafts[0].amountMinor, 4500);
    assert.equal(r.drafts[0].concept, "Luz");
  });

  it("«ayer» mueve la fecha del borrador", () => {
    const r = relato(fixture(), "ayer pagué la luz 45");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].date, "2026-10-21");
  });

  it("la lista con verbo de cabecera: «hoy pagué: luz 45, agua 30, internet 50»", () => {
    const r = relato(fixture(), "hoy pagué: luz 45, agua 30, internet 50");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 3);
    assert.deepEqual(r.drafts.map((d) => d.concept), ["Luz", "Agua", "Internet"]);
    assert.equal(r.drafts[1].subId, "f.casa.agua"); // «agua» se ubica sola: la estructura de la casa la conoce
    assert.equal(r.drafts[2].subId, "f.casa.internet");
  });
});

describe("relato E1 · el relato compuesto de Alvin", () => {
  it("mover + pagar + ingreso en una sola frase: tres borradores en orden", () => {
    const r = relato(fixture(), "moví 200 del banco al colchón, pagué la luz 45 y me entró el salario 1200");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 3);
    const [mv, g, ing] = r.drafts;
    assert.equal(mv.op, "mover");
    assert.equal(mv.amountMinor, 20000);
    assert.equal(mv.from?.label, "Banco");
    assert.equal(mv.to?.label, "Colchón");
    assert.equal(g.op, "gasto");
    assert.equal(g.amountMinor, 4500);
    assert.equal(ing.op, "ingreso");
    assert.equal(ing.amountMinor, 120000);
    assert.equal(ing.concept, "Salario");
    assert.ok(r.echo.includes("Mover $200.00 de Banco a Colchón"), r.echo);
  });

  it("la capa es pura: el estado queda intacto", () => {
    const ledger = fixture();
    const before = JSON.stringify(ledger);
    relato(ledger, "moví 200 del banco al colchón, pagué la luz 45 y me entró el salario 1200");
    assert.equal(JSON.stringify(ledger), before);
  });
});

describe("relato E1 · deduplicación", () => {
  it("lo ya asentado hoy se dice y no se duplica", () => {
    const r = relato(fixture(true), "pagué la luz 45");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    assert.ok(r.drafts[0].duplicate, "el borrador debe venir marcado como duplicado");
    assert.ok(r.echo.includes("ya estaba asentado"), r.echo);
    assert.ok(r.echo.includes("No hay nada nuevo que asentar."), r.echo);
  });
});

describe("relato E1 · si no está seguro, pregunta", () => {
  it("mover sin origen: pregunta el origen, no lo adivina", () => {
    const r = relato(fixture(), "moví 200 al colchón");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "origen");
  });

  it("gasto sin monto: pregunta el monto", () => {
    const r = relato(fixture(), "pagué la luz");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
  });

  it("gasto sin concepto: pregunta de qué fue", () => {
    const r = relato(fixture(), "pagué 45");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "concepto");
  });

  it("lo que no es relato queda en silencio honesto", () => {
    const r = relato(fixture(), "qué lindo está el día");
    assert.equal(r.kind, "unknown");
  });
});

describe("relato E2 · el modismo y lo figurado", () => {
  it("EL ESPÉCIMEN DE LA CASA: «me comí un pollo con tajadas, quedé palmado, vale 150»", () => {
    const ledger = fixture();
    const r = relato(ledger, "me comí un pollo con tajadas, quedé palmado, vale 150");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    // Un solo asiento: la comida con su monto. La figura no asienta
    // estado alguno ni produce un segundo borrador.
    assert.equal(r.drafts.length, 1);
    const d = r.drafts[0];
    assert.equal(d.op, "gasto");
    assert.equal(d.amountMinor, 15000);
    assert.equal(d.concept, "Pollo con tajadas");
    assert.equal(d.categoryId, "f-alimentos");
    assert.deepEqual(r.figures, ["estado-bajo"]);
    // El eco responde la figura con el número, sin desmentirla: trae la
    // queda proyectada del mes y ninguna corrección («no estás…»).
    const left = readAdvisor(ledger, KEY, "es", makeNamer(ledger.structure, "es"), { today: new Date(`${TODAY}T12:00:00`) }).left;
    assert.ok(r.echo.includes(`quedaría en ${formatMoney(left - 15000, "USD", "es")}`), r.echo);
    assert.ok(!/no est[aá]s|en realidad/.test(r.echo), r.echo);
  });

  it("la cosa sin precio pregunta el monto, nombrándola: «compré un pollo con tajadas»", () => {
    const r = relato(fixture(), "compré un pollo con tajadas");
    // «compré» trae verbo y la cosa queda ubicada; sin monto se pregunta por él, nombrando la cosa.
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
    assert.ok(r.question.includes("pollo con tajadas"), r.question);
  });

  it("la cosa comida sin verbo ni precio: «me comí un pollo con tajadas» pregunta el monto", () => {
    const r = relato(fixture(), "me comí un pollo con tajadas");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "monto");
    assert.ok(r.question.includes("pollo con tajadas"), r.question);
  });

  it("la cantidad figurada no es un monto faltante: «gasté una fortuna en zapatos» no pregunta", () => {
    const r = relato(fixture(), "gasté una fortuna en zapatos");
    assert.equal(r.kind, "unknown");
    if (r.kind !== "unknown") return;
    assert.deepEqual(r.figures, ["cantidad-grande"]);
  });

  it("el modismo de dinero certifica el monto en palabras: «gasté cincuenta reales en tajadas»", () => {
    const r = relato(fixture(), "gasté cincuenta reales en tajadas");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    assert.equal(r.drafts[0].amountMinor, 5000);
    assert.equal(r.drafts[0].concept, "Tajadas");
    assert.equal(r.drafts[0].categoryId, "f-alimentos");
  });

  it("la figura sola no es relato: «quedé palmado» queda en silencio con la figura registrada", () => {
    const r = relato(fixture(), "quedé palmado");
    assert.equal(r.kind, "unknown");
    if (r.kind !== "unknown") return;
    assert.deepEqual(r.figures, ["estado-bajo"]);
  });
});

function programa(ledger: LedgerState, raw: string, lang: "es" | "en" = "es") {
  return parsePrograma(ledger, KEY, lang, makeNamer(ledger.structure, lang), raw, TODAY);
}

describe("relato E3 · programar por relato", () => {
  it("el fijo: «programa la luz 45 cada mes el día 1»", () => {
    const r = programa(fixture(), "programa la luz 45 cada mes el día 1");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts.length, 1);
    const d = r.drafts[0];
    assert.equal(d.op, "gasto");
    assert.equal(d.clase, "fijo");
    assert.equal(d.amountMinor, 4500);
    assert.equal(d.concept, "Luz");
    assert.equal(d.subId, "f.casa.servicios");
    assert.equal(d.cadence, "monthly");
    assert.equal(d.firstDate, "2026-11-01");
    assert.ok(r.echo.includes("cada mes, el día 1"), r.echo);
    assert.ok(r.echo.includes("¿Lo dejo programado así?"), r.echo);
  });

  it("el recordatorio: «recuérdame pagar el internet cada mes el día 28» — sin monto, la clase variable", () => {
    const r = programa(fixture(), "recuérdame pagar el internet cada mes el día 28");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    const d = r.drafts[0];
    assert.equal(d.clase, "recordatorio");
    assert.equal(d.amountMinor, null);
    assert.equal(d.concept, "Internet");
    assert.equal(d.cadence, "monthly");
    assert.equal(d.firstDate, "2026-10-28");
    assert.ok(r.echo.includes("sin monto fijo (solo recordatorio)"), r.echo);
  });

  it("el ingreso que se repite: «cada quincena me entran 400 del negocio, prográmalo»", () => {
    const r = programa(fixture(), "cada quincena me entran 400 del negocio, prográmalo");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    const d = r.drafts[0];
    assert.equal(d.op, "ingreso");
    assert.equal(d.clase, "fijo");
    assert.equal(d.amountMinor, 40000);
    assert.equal(d.cadence, "biweekly");
    assert.equal(d.firstDate, "2026-11-06");
  });

  it("el programa compuesto: «programa el internet 50 cada mes y recuérdame pagar la luz cada mes» — dos borradores (enmienda de canon 1.3.446)", () => {
    const r = programa(fixture(), "programa el internet 50 cada mes y recuérdame pagar la luz cada mes");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts.length, 2, r.echo);
    assert.equal(r.drafts[0].concept, "Internet");
    assert.equal(r.drafts[0].clase, "fijo");
    assert.equal(r.drafts[1].concept, "Luz");
    assert.equal(r.drafts[1].clase, "recordatorio");
    assert.equal(r.drafts[1].amountMinor, null);
  });

  it("sin cadencia ni fecha se pregunta el cuándo: «programa el pago de la renta»", () => {
    const r = programa(fixture(), "programa el pago de la renta");
    assert.equal(r.kind, "ask");
    if (r.kind !== "ask") return;
    assert.equal(r.missing, "cuando");
  });

  it("lo ya programado no se duplica: nace marcado y el eco lo dice", () => {
    const ledger = fixture();
    const net = (ledger.months[KEY]?.lines ?? []).find((l) => l.concept === "Internet");
    if (net) net.cadence = "monthly";
    const r = programa(ledger, "programa el internet 50 cada mes");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    assert.equal(r.drafts[0].duplicate, "Internet");
    assert.ok(r.echo.includes("No hay nada nuevo que programar"), r.echo);
  });

  it("el espejo en inglés: «schedule rent 1200 every month»", () => {
    const r = programa(fixture(), "schedule rent 1200 every month", "en");
    assert.equal(r.kind, "schedules", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "schedules") return;
    const d = r.drafts[0];
    assert.equal(d.clase, "fijo");
    assert.equal(d.amountMinor, 120000);
    assert.equal(d.cadence, "monthly");
  });

  it("parsePrograma es pura: el libro queda intacto", () => {
    const ledger = fixture();
    const before = JSON.stringify(ledger.months);
    programa(ledger, "programa la luz 45 cada mes el día 1");
    assert.equal(JSON.stringify(ledger.months), before);
  });
});

describe("relato E3 · la vigilancia en datos", () => {
  it("lo que llega: el internet vence dentro de la ventana de 7 días", () => {
    const cs = vigilancia(fixture(), KEY, "es", TODAY);
    const llega = cs.find((c) => c.kind === "llega");
    assert.ok(llega, JSON.stringify(cs).slice(0, 200));
    assert.equal(llega?.concept, "Internet");
    assert.equal(llega?.amountMinor, 4999);
    assert.equal(llega?.date, "2026-10-28");
  });

  it("lo que NO llegó y lo que se repite sin programar, en un libro de tres meses", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months["2026-10"] = { lines: [
      line({ id: "gym10", kind: "purchase" as LineKind, concept: "Gimnasio", amountMinor: 3000, bookedOn: "2026-10-03" }),
    ] };
    ledger.months["2026-09"] = { lines: [
      line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 100000, bookedOn: "2026-09-05", monthKey: "2026-09" }),
      line({ id: "gym9", kind: "purchase" as LineKind, concept: "Gimnasio", amountMinor: 3000, bookedOn: "2026-09-03", monthKey: "2026-09" }),
    ] };
    ledger.months["2026-08"] = { lines: [
      line({ id: "gym8", kind: "purchase" as LineKind, concept: "Gimnasio", amountMinor: 3200, bookedOn: "2026-08-03", monthKey: "2026-08" }),
    ] };
    ledger.settings.display = "USD";
    const cs = vigilancia(ledger, KEY, "es", TODAY);
    const kinds = cs.map((c) => c.kind).sort();
    assert.deepEqual(kinds, ["no-llego", "sin-programar"]);
    const nl = cs.find((c) => c.kind === "no-llego");
    assert.equal(nl?.concept, "Salario");
    assert.equal(nl?.amountMinor, 100000);
    assert.equal(nl?.date, "2026-10-05");
    const sp = cs.find((c) => c.kind === "sin-programar");
    assert.equal(sp?.concept, "Gimnasio");
    assert.equal(sp?.amountMinor, 3000);
  });
});

describe("relato · la moneda del libro (LA MONEDA SE OYE)", () => {
  it("en un libro en córdobas, «pagué 500 de luz» asienta C$500, no $500", () => {
    const ledger = createInitial("es", "oscuro");
    ledger.months[KEY] = { lines: [
      line({ id: "luz", kind: "expense-fixed" as LineKind, concept: "Luz", amountMinor: 164809, currency: "NIO", categoryId: "f-casa", subId: "f.casa.servicios", bookedOn: "2026-09-28" }),
    ] };
    ledger.settings.display = "NIO";
    const r = parseRelato(ledger, KEY, "es", makeNamer(ledger.structure, "es"), "pagué 500 de luz", TODAY);
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].amountMinor, 50000);
    assert.equal(r.drafts[0].currency, "NIO");
  });
});

describe("relato E1 · el espejo en inglés", () => {
  it("paid + received en una frase: dos borradores", () => {
    const r = relato(fixture(), "I paid 45 for electricity and received my salary 1200", "en");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 2);
    assert.equal(r.drafts[0].op, "gasto");
    assert.equal(r.drafts[0].amountMinor, 4500);
    assert.equal(r.drafts[1].op, "ingreso");
    assert.equal(r.drafts[1].amountMinor, 120000);
    assert.ok(r.echo.includes("Shall I post it like this?"), r.echo);
  });

  it("mover en inglés con lugares genéricos: «from the bank to my savings»", () => {
    const r = relato(fixture(), "I moved 200 from the bank to my savings", "en");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    assert.equal(r.drafts[0].op, "mover");
    assert.equal(r.drafts[0].from?.label, "Banco");
    assert.equal(r.drafts[0].to?.label, "Colchón");
  });
});

describe("relato · la campaña de mutaciones de la rama (2026-11-25)", () => {
  it("el verbo con una letra caída se oye: «paué la luz 45» asienta la luz", () => {
    const r = relato(fixture(), "paué la luz 45");
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].amountMinor, 4500);
    assert.equal(r.drafts[0].concept, "Luz");
  });

  it("la cortesía no es una cláusula: «pagué la luz 45, por favor» asienta la luz y nada más", () => {
    const r = relato(fixture(), "pagué la luz 45, por favor");
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts.length, 1);
    assert.equal(r.drafts[0].concept, "Luz");
  });

  it("la lista sin comas no corre los conceptos: «luz 45 agua 30 internet 50» tras «hoy pagué:»", () => {
    const r = relato(fixture(), "hoy pagué: luz 45 agua 30 internet 50");
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.deepEqual(r.drafts.map((d) => `${d.concept}:${d.amountMinor}`), ["Luz:4500", "Agua:3000", "Internet:5000"]);
  });

  it("dos cláusulas pegadas sin coma se cortan en el verbo: «moví 200… pagué la luz 45 y me entró el salario 1200»", () => {
    const r = relato(fixture(), "moví 200 del banco al colchón pagué la luz 45 y me entró el salario 1200");
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.deepEqual(r.drafts.map((d) => d.op), ["mover", "gasto", "ingreso"]);
  });

  it("el número en palabras con errata se oye: «gasté cincenta reales en tajadas» son 50", () => {
    const r = relato(fixture(), "gasté cincenta reales en tajadas");
    assert.equal(r.kind, "drafts", JSON.stringify(r).slice(0, 200));
    if (r.kind !== "drafts") return;
    assert.equal(r.drafts[0].amountMinor, 5000);
    assert.equal(r.drafts[0].concept, "Tajadas");
  });
});

describe("relato · el punto y el temporizador (caza de Oscar, 2026-11-25)", () => {
  it("el espécimen exacto de Oscar: dos operaciones, cada una con su fecha, sin fantasmas", () => {
    const r = relato(fixture(), "Gasté $200 en comida el mes pasado. Y añadí 300 a mi banco. The chase. Hace 2 días.");
    if (r.kind !== "drafts") assert.fail(`debió dar borradores, dio ${r.kind}`);
    assert.equal(r.drafts.length, 2);
    const [g, i] = r.drafts;
    assert.equal(g.op, "gasto");
    assert.equal(g.concept, "Comida");
    assert.equal(g.amountMinor, 20000);
    assert.equal(g.date, "2026-09-22"); // el mes pasado, mismo día
    assert.equal(i.op, "ingreso");
    assert.equal(i.amountMinor, 30000);
    assert.equal(i.concept, "Banco"); // el destino nombra el ingreso; la «Y» inicial jamás es concepto (enmienda de canon 1.3.459, cazada en el banco vivo)
    assert.equal(i.date, "2026-10-20"); // el «Hace 2 días.» suelto cierra sobre el último sin ancla
    assert.ok(i.to && i.to.kind === "acct", "el destino es la cuenta");
    assert.ok(!r.echo.includes("—"), r.echo); // sin guiones largos
    assert.ok(!r.echo.includes("$2.00"), r.echo); // el 2 de «hace 2 días» no es dinero
  });

  it("el número del tiempo jamás es dinero: «hace 2 días» no deja un gasto de $2", () => {
    const r = relato(fixture(), "gasté 200 en comida hace 2 días");
    if (r.kind !== "drafts") assert.fail("debió dar borradores");
    assert.equal(r.drafts.length, 1);
    assert.equal(r.drafts[0].amountMinor, 20000);
    assert.equal(r.drafts[0].date, "2026-10-20");
    assert.equal(r.drafts[0].concept, "Comida");
  });

  it("los anclas del pasado atan por cláusula, en español y en inglés", () => {
    const a = relato(fixture(), "pagué la luz 45 antier");
    if (a.kind !== "drafts") assert.fail("antier debió oírse");
    assert.equal(a.drafts[0].date, "2026-10-20");
    const b = relato(fixture(), "gasté 100 en el súper la semana pasada");
    if (b.kind !== "drafts") assert.fail("semana pasada debió oírse");
    assert.equal(b.drafts[0].date, "2026-10-15");
    assert.equal(b.drafts[0].concept, "Super");
    const c = relato(fixture(), "I paid 45 for the light 2 days ago", "en");
    if (c.kind !== "drafts") assert.fail("2 days ago debió oírse");
    assert.equal(c.drafts[0].date, "2026-10-20");
    const d = relato(fixture(), "I spent 100 at the supermarket last week", "en");
    if (d.kind !== "drafts") assert.fail("last week debió oírse");
    assert.equal(d.drafts[0].date, "2026-10-15");
    const e = relato(fixture(), "pagué la luz 45 el mes pasado");
    if (e.kind !== "drafts") assert.fail("mes pasado debió oírse");
    assert.equal(e.drafts[0].date, "2026-09-22");
    assert.equal(e.drafts[0].concept, "Luz");
  });

  it("añadir a la cuenta es dinero que entra, no un gasto", () => {
    const r = relato(fixture(), "añadí 300 a mi banco");
    if (r.kind !== "drafts") assert.fail("debió dar borradores");
    assert.equal(r.drafts[0].op, "ingreso");
    assert.equal(r.drafts[0].amountMinor, 30000);
    const en = relato(fixture(), "I added 300 to my bank", "en");
    if (en.kind !== "drafts") assert.fail("added debió oírse");
    assert.equal(en.drafts[0].op, "ingreso");
  });

  it("el futuro no se asienta como pasado: su casa es el programa, de una sola vez y con su fecha", () => {
    const r = relato(fixture(), "mañana pago 60 de internet");
    assert.equal(r.kind, "unknown");
    const p = programa(fixture(), "mañana pago 60 de internet");
    if (p.kind !== "schedules") assert.fail("mañana debió programarse");
    assert.equal(p.drafts[0].cadence, "once");
    assert.equal(p.drafts[0].firstDate, "2026-10-23");
    assert.equal(p.drafts[0].amountMinor, 6000);
    const p2 = programa(fixture(), "en 2 días pago 60 de internet");
    if (p2.kind !== "schedules") assert.fail("en 2 días debió programarse");
    assert.equal(p2.drafts[0].firstDate, "2026-10-24");
    const p3 = programa(fixture(), "gastaré 500 el próximo mes en regalos");
    if (p3.kind !== "schedules") assert.fail("el próximo mes debió programarse");
    assert.equal(p3.drafts[0].firstDate, "2026-11-22");
    const p4 = programa(fixture(), "next month I'll spend 500 on gifts", "en");
    if (p4.kind !== "schedules") assert.fail("next month debió programarse");
    assert.equal(p4.drafts[0].firstDate, "2026-11-22");
    assert.equal(p4.drafts[0].concept, "Gifts");
    const p5 = programa(fixture(), "tomorrow I'll pay 60 for internet", "en");
    if (p5.kind !== "schedules") assert.fail("tomorrow debió programarse");
    assert.equal(p5.drafts[0].firstDate, "2026-10-23");
  });

  it("el punto protege el decimal: 45.50 es un monto, no dos cláusulas", () => {
    const r = relato(fixture(), "pagué la luz 45.50. Ayer pagué el agua 30.");
    if (r.kind !== "drafts") assert.fail("debió dar borradores");
    assert.equal(r.drafts.length, 2);
    assert.equal(r.drafts[0].amountMinor, 4550);
    assert.equal(r.drafts[1].date, "2026-10-21");
  });
});

describe("relato · las cazas del teléfono de Oscar (2026-11-25): el marco, la moneda de la frase y el imperativo", () => {
  function libroImperativo(display: "USD" | "NIO"): LedgerState {
    const ledger = createInitial("es", "oscuro");
    const ahorro = ledger.structure.categories.find((c) => c.id === "f-ahorro");
    if (!ahorro) throw new Error("missing savings");
    ahorro.subs = [
      { id: "f.ahorro.colchon", nameKey: "f.ahorro.colchon", customName: "Colchón", icon: "vault:generic", hidden: false, order: 10 },
      { id: "f.ahorro.meta", nameKey: "", customName: "Meta", icon: "", hidden: false, order: 20 },
      { id: "f.ahorro.emergencia", nameKey: "", customName: "Emergencia", icon: "", hidden: false, order: 30 },
    ];
    ledger.structure.catalog = ledger.structure.catalog.filter((c) => c.kind !== "acct");
    ledger.structure.catalog.push({ id: "acct-banco", nameKey: "", customName: "Banco", icon: "", hidden: false, order: 90, kind: "acct", urlTemplate: "" });
    ledger.structure.catalog.push({ id: "acct-chase", nameKey: "", customName: "Chase", icon: "", hidden: false, order: 91, kind: "acct", urlTemplate: "" });
    ledger.months[KEY] = { lines: [line({ id: "salario", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 120000, bookedOn: "2026-10-05" })] };
    ledger.settings.display = display;
    return ledger;
  }

  it("el marco no paría concepto ni pregunta, y la moneda nombrada manda sobre la frase entera", () => {
    for (const display of ["USD", "NIO"] as const) {
      const l = libroImperativo(display);
      const r = parseRelato(l, KEY, "es", makeNamer(l.structure, "es"), "compré un pollo por 20 pesos y una licuadora por 300, añádelos a mi cuenta", TODAY);
      if (r.kind !== "drafts") assert.fail(`debió dar borradores en ${display}`);
      assert.equal(r.drafts.length, 2);
      assert.equal(r.drafts[0].concept, "Pollo");
      assert.equal(r.drafts[0].amountMinor, 2000);
      assert.equal(r.drafts[0].currency, "NIO");
      assert.equal(r.drafts[1].concept, "Licuadora");
      assert.equal(r.drafts[1].amountMinor, 30000);
      assert.equal(r.drafts[1].currency, "NIO");
    }
    const solo = libroImperativo("USD");
    const marco = parseRelato(solo, KEY, "es", makeNamer(solo.structure, "es"), "añádelos a mi cuenta", TODAY);
    assert.equal(marco.kind, "unknown");
  });

  it("el imperativo se oye: mover entre lugares e ingresar con su elipsis", () => {
    const l = libroImperativo("USD");
    const names = makeNamer(l.structure, "es");
    const mv = parseRelato(l, KEY, "es", names, "mueve 200 pesos de meta a emergencia", TODAY);
    if (mv.kind !== "drafts") assert.fail("debió dar el borrador de mover");
    assert.equal(mv.drafts.length, 1);
    assert.equal(mv.drafts[0].op, "mover");
    assert.equal(mv.drafts[0].amountMinor, 20000);
    assert.equal(mv.drafts[0].currency, "NIO");
    assert.equal(mv.drafts[0].from?.label, "Meta");
    assert.equal(mv.drafts[0].to?.label, "Emergencia");

    const ing = parseRelato(l, KEY, "es", names, "Ingresa 500 pesos a mi cuenta de Meta, 200 a emergencia", TODAY);
    if (ing.kind !== "drafts") assert.fail("debió dar los dos ingresos");
    assert.equal(ing.drafts.length, 2);
    assert.equal(ing.drafts[0].op, "ingreso");
    assert.equal(ing.drafts[0].to?.label, "Meta");
    assert.equal(ing.drafts[0].amountMinor, 50000);
    assert.equal(ing.drafts[0].currency, "NIO");
    assert.equal(ing.drafts[1].to?.label, "Emergencia");
    assert.equal(ing.drafts[1].amountMinor, 20000);
    assert.equal(ing.drafts[1].currency, "NIO");

    const en = parseRelato(l, KEY, "en", makeNamer(l.structure, "en"), "move 100 from banco to colchon", TODAY);
    if (en.kind !== "drafts") assert.fail("debió oír el move en inglés");
    assert.equal(en.drafts[0].op, "mover");
    assert.equal(en.drafts[0].from?.label, "Banco");
    assert.equal(en.drafts[0].to?.label, "Colchón");
  });

  it("la casilla vacía del imperativo se pregunta por su nombre: origen y destino, no silencio", () => {
    const l = libroImperativo("USD");
    const names = makeNamer(l.structure, "es");
    const mete = parseRelato(l, KEY, "es", names, "mete 100 a la meta", TODAY);
    if (mete.kind !== "ask") assert.fail("debió preguntar el origen");
    assert.equal(mete.missing, "origen");
    const dep = parseRelato(l, KEY, "es", names, "deposita 300 en mi cuenta", TODAY);
    if (dep.kind !== "ask") assert.fail("debió preguntar el destino");
    assert.equal(dep.missing, "destino");
    const una = libroImperativo("USD");
    una.structure.catalog = una.structure.catalog.filter((c) => c.id !== "acct-chase");
    const depUna = parseRelato(una, KEY, "es", makeNamer(una.structure, "es"), "deposita 300 en mi cuenta", TODAY);
    if (depUna.kind !== "drafts") assert.fail("con una sola cuenta debió asentar el borrador");
    assert.equal(depUna.drafts[0].op, "ingreso");
    assert.equal(depUna.drafts[0].to?.label, "Banco");
  });
});

describe("relato · el formato del eco (fallo de Oscar, 2026-11-26)", () => {
  it("el monto se separa con guion corto y el eco respira: aire tras la cabecera y antes de la pregunta", () => {
    const r = relato(fixture(), "compré un pollo por 20 pesos y una licuadora por 300, añádelos a mi cuenta");
    assert.equal(r.kind, "drafts");
    if (r.kind !== "drafts") return;
    // El guion corto separa concepto y monto — nunca el segundo dos puntos.
    assert.ok(r.echo.includes("Gasto: Pollo - C$20.00"), r.echo);
    assert.ok(r.echo.includes("Gasto: Licuadora - C$300.00"), r.echo);
    assert.ok(!r.echo.includes("Pollo: C$"), r.echo);
    assert.ok(!r.echo.includes("—"), r.echo); // el guion largo sigue retirado
    // El aire de la ley de envoltorio: línea en blanco tras la
    // cabecera y línea en blanco antes de la pregunta.
    assert.ok(r.echo.startsWith("Esto es lo que entendí:\n\n• "), r.echo);
    assert.ok(r.echo.includes("\n\n¿Lo asiento así?"), r.echo);
  });
});
