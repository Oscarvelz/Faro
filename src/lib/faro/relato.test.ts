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
