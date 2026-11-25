/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 35 — LA CURA (equipo amigo). Trece familias:
 *
 *  F1 · LA SEGUNDA EXCLUSIÓN TAMBIÉN MANDA (Q35-1): «sin X y sin Y»
 *       sirve el neto de AMBAS, nombra cada resta con su cifra y
 *       jamás sirve el bruto con la primera resta disfrazada de
 *       filtro («en eso»); la segunda irresoluble muere nombrada.
 *  F2 · LA COSTURA DE PERSONA NO CORTA DENTRO DEL NOMBRE DE LA
 *       CUENTA (Q35-2): «¿Y Ana?» sobre «¿Cuánto tengo en el Fondo
 *       Rosa de Rosa?» cose la «rosa» de FUERA del nombre (la del
 *       «de Rosa») y sirve el Fondo Rosa ($700) — jamás corta la
 *       de dentro («fondo ana de rosa», el stock entero); si la
 *       persona SOLO vive dentro del nombre, muere honesta.
 *  F3 · EL SALTO DE ESCALA NO SE DISFRAZA DE DESPLAZAMIENTO
 *       (Q35-3): «¿Y el año pasado?» sobre un marco de MES no
 *       re-sirve el mes con eco de año: cede a la puerta fresca
 *       del año, que sirve el año verdadero.
 *  F4 · EL ARTÍCULO Y EL NÚMERO EN LETRAS SON VOCABULARIO DE
 *       TIEMPO (Q35-4): «hace un mes / una semana / un año» y
 *       «a month ago / two months ago» los oye periodOf, y la
 *       caminata de remesas consume «hace un…» sin acusar «un».
 *  F5 · LA COMPARACIÓN DE AÑOS TIENE SU PUERTA TAMBIÉN TRAS UNA
 *       MUERTE (Q35-5): la forma comparativa servida por remesas
 *       cede a anoContraAno («¿Cuánto mandé el año pasado
 *       comparado con este año?» sirve el lado por periodOf y la
 *       comparación entera por su puerta); las formas sí/no —
 *       también «¿Gasté más este año o el año pasado?» — sirven
 *       la comparación, no mueren en «no está claro».
 *  F6 · EL MARCO DE LA COMPARACIÓN SE ESTRECHA A UN LADO (Q35-6):
 *       «¿Y el año pasado?» / «¿Y este año?» sobre el veredicto
 *       comparado sirven SOLO ese lado, con su eco verdadero.
 *  F7 · EL PORQUÉ CITA LA EXCLUSIÓN VIVA (Q35-7): cuando el turno
 *       reemplaza la exclusión del marco, la pregunta citada por
 *       el porqué cose la exclusión NUEVA, no la muerta.
 *  F8 · «AGO» NO ES UNA PERSONA (Q35-8): «How much did I send a
 *       month ago?» sirve el período; nadie acusa a «ago».
 *  F9 · EL MARCO «TOTAL» NO ECOA UN PERÍODO QUE NO CAMBIÓ (Q35-9):
 *       «¿Y el mes pasado?» sobre el saldo no re-sirve la misma
 *       cifra con eco de período: muere en la reparación honesta.
 *  F10 · EL FOLIO DEVUELVE LA FORMA DE SOLO DÍA CON ZONA (G35-1):
 *       «2026-11-22Z» es la forma de solo día con su zona escrita:
 *       folioDay la devuelve tal cual (el día escrito), como la
 *       forma sin zona — un solo lector para las formas de día.
 *  F11 · LA EXCLUSIÓN CUYO CIUDADANO MURIÓ CALLA (G35-2): si el
 *       ciudadano de la ranura ya no resuelve a ninguna línea del
 *       libro (renombre, borrado, cáscara vacía), el seguimiento
 *       sirve el bruto nombrado como bruto: sin cola a $0.00, sin
 *       pieza fantasma, sin herencia — y el total del marco se
 *       recompone para que la partición cierre.
 *  F12 · LA EXCLUSIÓN INGLESA FRESCA SE OYE (Q35-1-Cara):
 *       «without the house» sirve el neto nombrando la resta;
 *       «without the car» irresoluble muere nombrada en inglés —
 *       la cláusula no se traga en silencio.
 *  F13 · EL DESEMPATE DEL CIUDADANO CONSULTA EL PERÍODO (C35-1):
 *       cuando dos ciudadanos comparten nombre (el concepto «Casa»
 *       de otros meses y la categoría Casa de este mes), la
 *       exclusión se ata al que de verdad excluye en el período
 *       preguntado: la resta nombrada es la verdadera.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-34-A1, OBS-34-C1-Cara,
 * OBS-35-C1/C2-Cara, OBS-33-A1/A2/A3/G1, OBS-32-G1/G2, OBS-29-A1,
 * OBS-28-C1, OBS-30-A1, A23-4 (CERRADO), F27-3, SOS-1, OBS-1 — y
 * los gemelos UTC de la bandeja y del span del Archivo.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { answerBankQuestion, answerFollowUp, convoAfterFollowUp, type AskFrame, type BankResult, type ConvoFrame } from "./ask2";
import { createInitial, makeNamer } from "./defaults";
import type { ParseCtx } from "./textparse";
import type { LedgerState, Line, LineKind } from "./types";

const KEY = "2026-10";
const PREV = "2026-09";
const TODAY = "2026-10-22";
type Mode3 = "esencial" | "ritmo" | "completo";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  } as Line;
}
const remit = (id: string, monthKey: string, amountMinor: number, to: string, day: string): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept: "Remesa", amountMinor, categoryId: "f-remesas", to, monthKey, bookedOn: `${monthKey}-${day}` });
const gasto = (id: string, monthKey: string, amountMinor: number, concept: string, day: string, cat = "f-alimentos"): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept, amountMinor, categoryId: cat, monthKey, bookedOn: `${monthKey}-${day}` });

function book(people: { id: string; name: string }[], lines: Line[], prevLines: Line[] = []): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = people;
  ledger.months[KEY] = { lines };
  if (prevLines.length) ledger.months[PREV] = { lines: prevLines };
  ledger.settings.display = "USD";
  return ledger;
}
/** El libro H: octubre — Casa $200, Casa Grande $260, Carro $120,
 * Comida $80, Juan Pérez $300 (total $960); septiembre — Casa $90,
 * Carro $60, Comida $40 (total $190). */
const fixtureH = () => book([],
  [gasto("g-casa", KEY, 20000, "Casa", "03"), gasto("g-grande", KEY, 26000, "Casa Grande", "05"),
   gasto("g-carro", KEY, 12000, "Carro", "07"), gasto("g-comida", KEY, 8000, "Comida", "09"),
   gasto("g-juanp", KEY, 30000, "Juan Pérez", "11")],
  [gasto("g-casa0", PREV, 9000, "Casa", "03"), gasto("g-carro0", PREV, 6000, "Carro", "07"),
   gasto("g-comida0", PREV, 4000, "Comida", "09")]);
/** El libro C (doble exclusión, el del banco): octubre — Renta
 * $200 (cat Casa), Bus $120 (cat Transporte), Carro $60 (cat
 * Transporte), Comida $80 (cat Alimentos); total $460. */
const fixtureC = () => book([],
  [gasto("c-renta", KEY, 20000, "Renta", "06", "f-casa"), gasto("c-bus", KEY, 12000, "Bus", "07", "f-transporte"),
   gasto("c-carro", KEY, 6000, "Carro", "08", "f-transporte"), gasto("c-comida", KEY, 8000, "Comida", "09", "f-alimentos")],
  [gasto("c-renta0", PREV, 9000, "Renta", "05", "f-casa"), gasto("c-bus0", PREV, 6000, "Bus", "06", "f-transporte"),
   gasto("c-comida0", PREV, 4000, "Comida", "07", "f-alimentos")]);
/** Años en historia: 2025 — $500 (junio); 2026 — $800 (marzo);
 * septiembre 2026 — $340 (para el marco de mes de F3). */
const fixtureAnos = () => {
  const ledger = book([], [gasto("a-26", KEY, 80000, "Gasto", "10")]);
  ledger.months["2026-03"] = { lines: [gasto("a-26m", "2026-03", 80000, "Gasto", "10")] };
  ledger.months["2025-06"] = { lines: [gasto("a-25", "2025-06", 50000, "Gasto", "10")] };
  ledger.months[PREV] = { lines: [gasto("a-sep1", PREV, 20000, "Gasto", "03"), gasto("a-sep2", PREV, 14000, "Gasto", "07")] };
  ledger.months[KEY] = { lines: [] };
  return ledger;
};
/** Remesas por mes: agosto $200, septiembre $280, octubre $320. */
const fixtureMeses = () => {
  const ledger = book([{ id: "rosa", name: "Rosa" }], [remit("r-oct", KEY, 32000, "rosa", "05")]);
  ledger.months["2026-08"] = { lines: [remit("r-ago", "2026-08", 20000, "rosa", "10")] };
  ledger.months[PREV] = { lines: [remit("r-sep", PREV, 28000, "rosa", "12")] };
  return ledger;
};
/** Años en remesas: 2025 — Rosa $500 (junio); 2026 — Rosa $480
 * (enero) + $320 (octubre) = $800. */
const fixtureAnosRemit = () => {
  const ledger = book([{ id: "rosa", name: "Rosa" }], [remit("r-oct", KEY, 32000, "rosa", "05")]);
  ledger.months["2025-06"] = { lines: [remit("r-25", "2025-06", 50000, "rosa", "10")] };
  ledger.months["2026-01"] = { lines: [remit("r-ene", "2026-01", 48000, "rosa", "10")] };
  return ledger;
};
/** El libro de fondos del banco marco2: Fondo Rosa $700, Fondo
 * Carro $300 (stock $1,000); personas Rosa ($150) y Ana ($100). */
const fixtureFondoRosaDe = () => {
  const ledger = book(
    [{ id: "rosa", name: "Rosa" }, { id: "ana", name: "Ana" }],
    [remit("r-rosa", KEY, 15000, "rosa", "15"), remit("r-ana", KEY, 10000, "ana", "19")],
  );
  const cat = ledger.structure.categories.find((c) => c.id === "f-ahorro")!;
  cat.subs.push(
    { id: "f.ahorro.fondorosa", nameKey: "f.ahorro.fondorosa", customName: "Fondo Rosa", icon: "vault", hidden: false, order: 9 },
    { id: "f.ahorro.fondocarro", nameKey: "f.ahorro.fondocarro", customName: "Fondo Carro", icon: "vault", hidden: false, order: 10 },
  );
  ledger.months[KEY].lines.push(
    line({ id: "s-rosa", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 70000, categoryId: "f-ahorro", subId: "f.ahorro.fondorosa", monthKey: KEY, bookedOn: `${KEY}-05` }),
    line({ id: "s-carro", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.fondocarro", monthKey: KEY, bookedOn: `${KEY}-06` }),
  );
  return ledger;
};
/** La sombra del ciudadano (C35-1): octubre — Renta $200 bajo la
 * CATEGORÍA Casa (f-casa) y Comida $60; el CONCEPTO «Casa» solo
 * vive en otros meses (agosto $50, septiembre $45). */
const fixtureSombra = () => {
  const ledger = book([],
    [gasto("s-renta", KEY, 20000, "Renta", "03", "f-casa"), gasto("s-comida", KEY, 6000, "Comida", "09")],
    [gasto("s-casa0", PREV, 4500, "Casa", "03", "f-otros")]);
  ledger.months["2026-08"] = { lines: [gasto("s-casa8", "2026-08", 5000, "Casa", "03", "f-otros")] };
  return ledger;
};
/** El libro inglés de la Cara: Renta $200 bajo f-casa, Comida $60. */
const fixtureEN = () => book([],
  [gasto("e-rent", KEY, 20000, "Rent", "03", "f-casa"), gasto("e-food", KEY, 6000, "Food", "09")]);
/** El Libro T del banco: ingreso $3,000; gasto Casa $200;
 * apartado al Fondo Rosa $700 → total $2,800 (queda $2,100 +
 * ahorros $700 + por cobrar $0). */
const fixtureTotal = () => {
  const ledger = book([], [
    line({ id: "t-inc", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000, monthKey: KEY, bookedOn: `${KEY}-01` }),
    line({ id: "t-casa", kind: "expense-variable" as LineKind, concept: "Casa", amountMinor: 20000, categoryId: "f-casa", monthKey: KEY, bookedOn: `${KEY}-06` }),
    line({ id: "t-ap", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 70000, categoryId: "f-ahorro", subId: "f.ahorro.fondorosa", monthKey: KEY, bookedOn: `${KEY}-05` }),
  ]);
  const cat = ledger.structure.categories.find((c) => c.id === "f-ahorro")!;
  cat.subs.push({ id: "f.ahorro.fondorosa", nameKey: "f.ahorro.fondorosa", customName: "Fondo Rosa", icon: "vault", hidden: false, order: 9 });
  return ledger;
};

/* La conversación conducida COMO LA CAJA (ask-box.tsx). */
class Convo {
  frame: AskFrame | null = null;
  convo: ConvoFrame | null = null;
  ledger: LedgerState;
  constructor(ledger: LedgerState) { this.ledger = ledger; }
  ask(raw: string, mode: Mode3 = "completo", lang: "es" | "en" = "es"): BankResult {
    const names = makeNamer(this.ledger.structure, lang);
    const ctx: ParseCtx = { ledger: this.ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
    const fu = answerFollowUp(this.ledger, KEY, lang, names, raw, ctx, TODAY, this.frame, mode, []);
    const r = fu ?? answerBankQuestion(this.ledger, KEY, lang, names, raw, ctx, TODAY, undefined, mode, [], this.convo, this.frame);
    if (r.kind === "answer") {
      this.frame = r.frame ?? null;
      this.convo = fu ? convoAfterFollowUp(this.ledger, KEY, names, this.convo, raw, TODAY, r) : (r.convo ?? null);
    }
    return r;
  }
}
function loose(ledger: LedgerState, lang: "es" | "en", raw: string, mode: Mode3 = "completo"): BankResult {
  const names = makeNamer(ledger.structure, lang);
  const ctx: ParseCtx = { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
  return answerBankQuestion(ledger, KEY, lang, names, raw, ctx, TODAY, undefined, mode, [], null, null);
}
const verdict = (r: BankResult): string => (r.kind === "answer" ? r.verdict : "");
const note = (r: BankResult): string => (r.kind === "answer" ? r.note ?? "" : "");
const family = (r: BankResult): string => (r.kind === "answer" ? r.family : r.kind);

describe("ola35 · F1 — la segunda exclusión también manda (Q35-1)", () => {
  it("«sin el carro y sin la renta» sirve el neto de AMBAS ($200) y nombra cada resta", () => {
    const r = loose(fixtureC(), "es", "¿Cuánto gasté sin el carro y sin la renta?");
    assert.match(verdict(r), /\$200\.00/);
    assert.match(verdict(r), /Sin contar «Carro» \(\$60\.00\)/);
    assert.match(verdict(r), /Sin contar «Renta» \(\$200\.00\)/);
    assert.doesNotMatch(verdict(r), /en eso|only in/i);
    assert.doesNotMatch(verdict(r), /\$0\.00\)/);
  });
  it("«sin transporte y sin alimentos» sirve $200 con ambas restas nombradas, sin inversión", () => {
    const r = loose(fixtureC(), "es", "¿Cuánto gasté sin transporte y sin alimentos?");
    assert.match(verdict(r), /\$200\.00/);
    assert.match(verdict(r), /Sin contar «Transporte» \(\$180\.00\)/);
    assert.match(verdict(r), /Sin contar «Alimentos» \(\$80\.00\)/);
    assert.doesNotMatch(verdict(r), /en eso/);
  });
  it("control: la exclusión única sigue sirviendo su neto ($280 sin Transporte)", () => {
    const r = loose(fixtureC(), "es", "¿Cuánto gasté sin transporte?");
    assert.match(verdict(r), /\$280\.00/);
    assert.match(verdict(r), /Sin contar «Transporte» \(\$180\.00\)/);
  });
});

describe("ola35 · F2 — la persona dentro del nombre de la cuenta (Q35-2)", () => {
  it("«¿Y Ana?» sobre «el Fondo Rosa de Rosa» sirve el Fondo Rosa ($700), no el stock entero ($1,000)", () => {
    const c = new Convo(fixtureFondoRosaDe());
    const t1 = c.ask("¿Cuánto tengo en el Fondo Rosa de Rosa?");
    assert.match(verdict(t1), /\$700\.00/);
    const t2 = c.ask("¿Y Ana?");
    assert.match(verdict(t2), /\$700\.00/);
    assert.doesNotMatch(verdict(t2), /\$1,000\.00/);
  });
  it("el porqué cita la costura verdadera («fondo rosa de ana»), jamás «fondo ana de rosa»", () => {
    const c = new Convo(fixtureFondoRosaDe());
    c.ask("¿Cuánto tengo en el Fondo Rosa de Rosa?");
    c.ask("¿Y Ana?");
    const t3 = c.ask("¿Por qué?");
    assert.match(verdict(t3), /fondo rosa de ana/);
    assert.doesNotMatch(verdict(t3), /fondo ana/);
  });
});

describe("ola35 · F3 — el salto de escala no se disfraza (Q35-3)", () => {
  it("«¿Y el año pasado?» sobre el marco de septiembre sirve el AÑO 2025 ($500), no el mes con eco de año", () => {
    const c = new Convo(fixtureAnos());
    const t1 = c.ask("¿Cuánto gasté el mes pasado?");
    assert.match(verdict(t1), /\$340\.00/);
    const t2 = c.ask("¿Y el año pasado?");
    assert.match(verdict(t2), /\$500\.00/);
    assert.doesNotMatch(verdict(t2), /\$340\.00/);
  });
});

describe("ola35 · F4 — el artículo y el número en letras son tiempo (Q35-4)", () => {
  it("«hace un mes» sirve septiembre ($190 en 2026-09), no el mes en curso", () => {
    const r = loose(fixtureH(), "es", "¿Cuánto gasté hace un mes?");
    assert.match(verdict(r), /\$190\.00/);
    assert.match(verdict(r), /2026-09/);
    assert.doesNotMatch(verdict(r), /\$960\.00/);
  });
  it("«hace un año» sirve 2025 ($500)", () => {
    const r = loose(fixtureAnos(), "es", "¿Cuánto gasté hace un año?");
    assert.match(verdict(r), /\$500\.00/);
  });
  it("la remesa de persona oye «hace un mes»: Rosa $280 en septiembre, sin acusar «un»", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto le mandé a Rosa hace un mes?");
    assert.match(verdict(r), /\$280\.00/);
    assert.doesNotMatch(verdict(r), /«un»/);
  });
  it("«two months ago» en historia sirve agosto ($80)", () => {
    const led = fixtureH();
    led.months["2026-08"] = { lines: [gasto("h-ago", "2026-08", 8000, "Comida", "10")] };
    const r = loose(led, "en", "How much did I spend two months ago?");
    assert.match(verdict(r), /\$80\.00/);
  });
});

describe("ola35 · F5 — la comparación de años tras una muerte (Q35-5)", () => {
  it("las formas sí/no sirven la comparación ($1,140 contra $500)", () => {
    for (const q of ["¿Gasté más este año que el año pasado?", "¿Gasté más este año o el año pasado?", "¿Gasté menos este año que el año pasado?"]) {
      const r = loose(fixtureAnos(), "es", q);
      assert.equal(family(r), "historia", q);
      assert.match(verdict(r), /\$1,140\.00/, q);
      assert.match(verdict(r), /\$500\.00/, q);
      assert.doesNotMatch(verdict(r), /no está claro/i, q);
    }
  });
  it("la comparativa de remesas sirve el lado por periodOf: «comparado con este año» → 2025, $500", () => {
    const r = loose(fixtureAnosRemit(), "es", "¿Cuánto mandé el año pasado comparado con este año?");
    assert.match(verdict(r), /\$500\.00/);
    assert.doesNotMatch(verdict(r), /no está claro qué quieres comparar/i);
  });
});

describe("ola35 · F6 — el marco de la comparación se estrecha (Q35-6)", () => {
  it("«¿Y el año pasado?» sirve SOLO 2025 ($500); «¿Y este año?» sirve SOLO 2026 ($1,140)", () => {
    const c = new Convo(fixtureAnos());
    const t1 = c.ask("¿Gasté más este año que el año pasado?");
    assert.match(verdict(t1), /\$1,140\.00/);
    const t2 = c.ask("¿Y el año pasado?");
    assert.match(verdict(t2), /\$500\.00/);
    assert.doesNotMatch(verdict(t2), /\$1,140\.00/);
    const t3 = c.ask("¿Y este año?");
    assert.match(verdict(t3), /\$1,140\.00/);
    assert.doesNotMatch(verdict(t3), /\$500\.00/);
  });
});

describe("ola35 · F7 — el porqué cita la exclusión viva (Q35-7)", () => {
  it("tras reemplazar casa→carro, el porqué cita «sin carro» y no «sin la casa»", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    const t2 = c.ask("¿Y el mes pasado sin el carro?");
    assert.match(verdict(t2), /\$130\.00/);
    const t3 = c.ask("¿Por qué?");
    assert.match(verdict(t3), /sin carro/);
    assert.doesNotMatch(verdict(t3), /sin la casa/);
  });
});

describe("ola35 · F8 — «ago» no es una persona (Q35-8)", () => {
  it("«How much did I send a month ago?» sirve septiembre ($280) sin acusar a «ago»", () => {
    const r = loose(fixtureMeses(), "en", "How much did I send a month ago?");
    assert.match(verdict(r), /\$280\.00/);
    assert.doesNotMatch(verdict(r), /"ago"|«ago»/);
  });
});

describe("ola35 · F9 — el marco «total» no ecoa un período (Q35-9)", () => {
  it("«¿Y el mes pasado?» sobre el saldo no re-sirve $2,800 con eco de período", () => {
    const c = new Convo(fixtureTotal());
    const t1 = c.ask("¿Cuánto dinero tengo en total?");
    assert.match(verdict(t1), /\$2,800\.00/);
    const t2 = c.ask("¿Y el mes pasado?");
    assert.doesNotMatch(verdict(t2), /\$2,800\.00/);
    assert.doesNotMatch(note(t2), /cambié solo el período/);
  });
});

describe("ola35 · F10 — el folio devuelve la forma de solo día con zona (G35-1, cableado)", () => {
  it("folioDay devuelve «YYYY-MM-DDZ» tal cual (el día escrito), como la forma sin zona", () => {
    const src = readFileSync(new URL("../../components/faro/passive-folios.tsx", import.meta.url), "utf8");
    assert.match(src, /\[zZ\]\$\//);
    assert.match(src, /return at\.slice\(0, 10\)/);
    assert.match(src, /if \(ISO_DAY\.test\(at\)\) return at;/);
  });
});

describe("ola35 · F11 — la exclusión cuyo ciudadano murió calla (G35-2)", () => {
  it("tras el renombre Casa→Hogar, el desplazamiento sirve el bruto $190 SIN cola ni pieza fantasma", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    for (const mk of Object.keys(c.ledger.months)) for (const l of c.ledger.months[mk].lines) if (l.concept === "Casa") l.concept = "Hogar";
    const t2 = c.ask("¿Y el mes pasado?");
    assert.match(verdict(t2), /\$190\.00/);
    assert.doesNotMatch(verdict(t2), /Sin contar/);
    assert.equal((t2.kind === "answer" ? t2.pieces.some((p) => p.label.includes("Fuera de la cuenta")) : true), false);
    assert.equal((c.frame as Extract<AskFrame, { kind: "period1" }> | null)?.exclusion ?? null, null);
  });
  it("la descomposición tras el renombre cierra contra el total del marco sano", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    for (const mk of Object.keys(c.ledger.months)) for (const l of c.ledger.months[mk].lines) if (l.concept === "Casa") l.concept = "Hogar";
    const t3 = c.ask("¿En qué gasté?");
    const sum = t3.kind === "answer" ? t3.pieces.reduce((a, p) => a + p.minor, 0) : -1;
    assert.equal(sum, 96000);
    assert.equal((c.frame as Extract<AskFrame, { kind: "period1" }> | null)?.total, 96000);
  });
});

describe("ola35 · F12 — la exclusión inglesa fresca se oye (Q35-1-Cara)", () => {
  it("«without the home» (el nombre inglés del libro) sirve el neto ($60) nombrando la resta", () => {
    const r = loose(fixtureEN(), "en", "How much did I spend this month without the home?");
    assert.match(verdict(r), /\$60\.00/);
    assert.match(verdict(r), /Not counting "Home" \(\$200\.00\)/);
    assert.doesNotMatch(verdict(r), /\$260\.00/);
  });
  it("«without the house» no se traga en silencio: o sirve el neto o muere nombrando lo no oído — jamás el total entero disfrazado", () => {
    const r = loose(fixtureEN(), "en", "How much did I spend this month without the house?");
    const servedNet = /\$60\.00/.test(verdict(r));
    const diedNamed = /without "house"/.test(verdict(r));
    assert.ok(servedNet || diedNamed, verdict(r));
    assert.doesNotMatch(verdict(r), /spent \$260\.00|gastaste \$260/);
    if (!servedNet) assert.doesNotMatch(verdict(r), /\$260\.00/);
  });
  it("«without the car» irresoluble muere nombrada en inglés", () => {
    const r = loose(fixtureEN(), "en", "How much did I spend this month without the car?");
    assert.match(verdict(r), /total without "car"/);
    assert.doesNotMatch(verdict(r), /\$260\.00/);
  });
});

describe("ola35 · F13 — el desempate del ciudadano consulta el período (C35-1)", () => {
  it("«sin la casa» se ata a la categoría que excluye en octubre: neto $60, resta $200 nombrada", () => {
    const r = loose(fixtureSombra(), "es", "¿Cuánto gasté sin la casa?");
    assert.match(verdict(r), /\$60\.00/);
    assert.match(verdict(r), /Sin contar «Casa» \(\$200\.00\)/);
    assert.doesNotMatch(verdict(r), /\$0\.00\)/);
    assert.doesNotMatch(verdict(r), /\$260\.00/);
  });
});
