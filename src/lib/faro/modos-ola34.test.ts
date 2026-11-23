/* ════════════════════════════════════════════════════════════════════
 * MODOS · OLA 34 — LA CURA (equipo amigo). Diez familias:
 *
 *  F1 · LA EXCLUSIÓN MANDA EN EL §20 (Q34-1, Asesor + Cara): el
 *       AskFrame gana su ranura de exclusión y §20 la respeta en
 *       sus tres caras — el desplazamiento la aplica (la nueva
 *       reemplaza; sin nueva, la del marco viaja), el estrechamiento
 *       jamás convierte «sin X» en «solo en X» (hay verbo propio:
 *       excluir sobre el marco) y la descomposición sale neta; la
 *       horquilla nombra la exclusión de la cifra en pantalla.
 *  F2 · LA EXCLUSIÓN FRESCA QUE NO RESUELVE MUERE NOMBRADA
 *       (Q34-2): la pregunta fresca con «sin Juan» irresoluble
 *       rehúsa el total entero y nombra la cabeza del segmento —
 *       la misma honestidad que el seguimiento ya tenía.
 *  F3 · EL DESEMPATE DEL NOMBRE CORTO LO CONSULTA EL MARCO
 *       (Q34-3): «¿Y Juan?» sobre el marco de Juan Pérez sirve a
 *       Juan Pérez en cualquier orden de lista, sin eco de cambio.
 *  F4 · LA CAMINATA OYE LA FRASE DE TIEMPO (Q34-4): «hace N meses»
 *       (el juego de números de periodOf) se consume como frase
 *       desde el frente y se recorta de la cola; el año suelto
 *       («2025») es vocabulario de tiempo, jamás una candidata.
 *  F5 · «EL AÑO PASADO» TIENE SU PUERTA (Q34-5): periodOf sirve el
 *       año anterior con su nombre en remesas y en historia; la
 *       rama del año ya no oye «ano» dentro de «ano pasado».
 *  F6 · MITAD+MES SE COSE ENTERO (Q34-6): la sustitución del eje
 *       de período reemplaza la frase ENTERA (la mitad por la
 *       mitad, con su mes): nada de «la primera quincena de
 *       segunda quincena» ni servir la mitad contraria a la del eco.
 *  F7 · «THE WEEK» SE OYE (Q34-7): la forma corta inglesa entra en
 *       FRAME_PERIODS junto a «la semana» — el vocabulario del
 *       marco es uno en los dos idiomas.
 *  F8 · LA COMA ENTRA EN LA PUERTA DE LA REGLA (Q34-8): «50,30,20»
 *       y «50, 30, 20» abren la familia la nombre o no la pregunta.
 *  F9 · EL FOLIO DEVUELVE LA FORMA DE SOLO DÍA TAL CUAL (G34-1):
 *       cableado declarado — folioDay devuelve la forma ISO_DAY
 *       como se escribió; solo los instantes pasan por todayIso.
 *       (Su banco corrido en cuatro zonas vive en bench-cura34.)
 *  F10 · EL MARCO DE LA CUENTA NO NACE CON PERSONA (Q34-2-Cara):
 *       la persona cuya única aparición vive dentro del nombre de
 *       la cuenta no es persona del marco; «¿Y Rosa?» sobre ese
 *       marco nombra a la CUENTA y re-sirve el fondo; «¿Y Ana?»
 *       muere honesto — nunca cose dentro del nombre.
 *
 * NO TOCADO (ante Oscar o declarado): OBS-34-A1, OBS-34-C1-Cara,
 * OBS-33-A1/A2/A3/G1, OBS-32-G1/G2, OBS-29-A1, OBS-28-C1,
 * OBS-30-A1, A23-4 (CERRADO), F27-3, SOS-1, OBS-1 — y los gemelos
 * UTC de la bandeja y del span del Archivo, fuera del alcance
 * declarado de la Familia 9.
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
const gasto = (id: string, monthKey: string, amountMinor: number, concept: string, day: string): Line =>
  line({ id, kind: "expense-variable" as LineKind, concept, amountMinor, categoryId: "f-alimentos", monthKey, bookedOn: `${monthKey}-${day}` });

function book(people: { id: string; name: string }[], lines: Line[], prevLines: Line[] = []): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.remitPeople = people;
  ledger.months[KEY] = { lines };
  if (prevLines.length) ledger.months[PREV] = { lines: prevLines };
  ledger.settings.display = "USD";
  return ledger;
}
/** El libro H de la Ola 34: octubre — Casa $200, Casa Grande $260,
 * Carro $120, Comida $80, Juan Pérez $300 (total $960);
 * septiembre — Casa $90, Carro $60, Comida $40 (total $190). */
const fixtureH = () => book([],
  [gasto("g-casa", KEY, 20000, "Casa", "03"), gasto("g-grande", KEY, 26000, "Casa Grande", "05"),
   gasto("g-carro", KEY, 12000, "Carro", "07"), gasto("g-comida", KEY, 8000, "Comida", "09"),
   gasto("g-juanp", KEY, 30000, "Juan Pérez", "11")],
  [gasto("g-casa0", PREV, 9000, "Casa", "03"), gasto("g-carro0", PREV, 6000, "Carro", "07"),
   gasto("g-comida0", PREV, 4000, "Comida", "09")]);
/** Los dos Juanes: Gómez $180 (oct-08), Pérez $210 (oct-09), Rosa
 * $150. El ORDEN de remitPeople es el parámetro — el desempate
 * viejo era el orden de la lista. */
const fixtureJuanes = (gomezPrimero: boolean) => book(
  gomezPrimero
    ? [{ id: "juan-gomez", name: "Juan Gómez" }, { id: "juan-perez", name: "Juan Pérez" }, { id: "rosa", name: "Rosa" }]
    : [{ id: "juan-perez", name: "Juan Pérez" }, { id: "juan-gomez", name: "Juan Gómez" }, { id: "rosa", name: "Rosa" }],
  [remit("r-gomez", KEY, 18000, "juan-gomez", "08"), remit("r-perez", KEY, 21000, "juan-perez", "09"), remit("r-rosa", KEY, 15000, "rosa", "15")],
);
/** Remesas por mes: agosto $200, septiembre $280, octubre $320. */
const fixtureMeses = () => {
  const ledger = book([{ id: "rosa", name: "Rosa" }], [remit("r-oct", KEY, 32000, "rosa", "05")]);
  ledger.months["2026-08"] = { lines: [remit("r-ago", "2026-08", 20000, "rosa", "10")] };
  ledger.months[PREV] = { lines: [remit("r-sep", PREV, 28000, "rosa", "12")] };
  return ledger;
};
/** Años: 2025 — Rosa $500 (junio); 2026 — Rosa $480 (enero) +
 * $320 (octubre) = $800. */
const fixtureAnos = () => {
  const ledger = book([{ id: "rosa", name: "Rosa" }], [remit("r-oct", KEY, 32000, "rosa", "05")]);
  ledger.months["2025-06"] = { lines: [remit("r-25", "2025-06", 50000, "rosa", "10")] };
  ledger.months["2026-01"] = { lines: [remit("r-ene", "2026-01", 48000, "rosa", "10")] };
  return ledger;
};
/** Mitad+mes: octubre — primera quincena $140 (día 03), segunda
 * $180 (día 20); el mes, $320. */
const fixtureMitadMes = () => book(
  [{ id: "rosa", name: "Rosa" }],
  [remit("r-p1", KEY, 14000, "rosa", "03"), remit("r-p2", KEY, 18000, "rosa", "20")],
);
/** La semana inglesa: Rosa $120 el día 20 (la semana del 19–25),
 * Primo $80 el día 05 (fuera de la semana). */
const fixtureSemana = () => book(
  [{ id: "rosa", name: "Rosa" }, { id: "primo", name: "Primo" }],
  [remit("r-rosa", KEY, 12000, "rosa", "20"), remit("r-primo", KEY, 8000, "primo", "05")],
);
/** El libro de la regla: ingreso $3,000; necesidades $1,800 (60%),
 * gustos $450, ahorro $300. */
function guiaBook(): LedgerState {
  const ledger = createInitial("es", "oscuro");
  ledger.months[KEY] = { lines: [
    line({ id: "i-1", kind: "income-fixed" as LineKind, concept: "Salario", amountMinor: 300000, monthKey: KEY, bookedOn: `${KEY}-01` }),
    line({ id: "e-renta", kind: "expense-fixed" as LineKind, concept: "Renta", amountMinor: 120000, categoryId: "f-casa", subId: "f.casa.renta", monthKey: KEY, bookedOn: `${KEY}-02` }),
    line({ id: "e-despensa", kind: "expense-variable" as LineKind, concept: "Despensa", amountMinor: 60000, categoryId: "f-alimentos", subId: "f.alimentos.despensa", monthKey: KEY, bookedOn: `${KEY}-09` }),
    line({ id: "e-restaurante", kind: "expense-variable" as LineKind, concept: "Restaurante", amountMinor: 45000, categoryId: "v-entretenimiento", subId: "v.entretenimiento.restaurantes", monthKey: KEY, bookedOn: `${KEY}-14` }),
    line({ id: "e-apartado", kind: "expense-variable" as LineKind, concept: "Apartado", amountMinor: 30000, categoryId: "f-ahorro", subId: "f.ahorro.meta", monthKey: KEY, bookedOn: `${KEY}-05` }),
  ] };
  ledger.settings.display = "USD";
  return ledger;
}
/** El Fondo Rosa: apartados — Fondo Rosa $700, Fondo Carro $300
 * (el stock entero, $1,000); personas Rosa ($150) y Ana ($100). */
const fixtureFondoRosa = () => {
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

/* La conversación conducida COMO LA CAJA (ask-box.tsx): el §20
 * primero; la cascada con el ConvoFrame Y el AskFrame enhebrados;
 * cada marco se reemplaza con la respuesta que lo trae. */
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
const total = (r: BankResult): number => (r.kind === "answer" ? r.pieces.reduce((a, p) => a + p.minor, 0) : -1);
const accuses = (r: BankResult, word: string) => verdict(r).includes(`«${word}»`) || verdict(r).includes(`"${word}"`);

describe("ola34 · F1 — la exclusión manda en el §20", () => {
  it("el marco de historia nace CON su exclusión: «sin la casa» deja la ranura guardada", () => {
    const c = new Convo(fixtureH());
    const t1 = c.ask("¿Cuánto gasté sin la casa?");
    assert.match(verdict(t1), /\$760\.00/);
    assert.match(verdict(t1), /Sin contar «Casa» \(\$200\.00\)/);
    assert.equal(c.frame?.kind, "period1");
    assert.equal((c.frame as Extract<AskFrame, { kind: "period1" }>).exclusion?.folded, "casa");
  });
  it("cara a: el desplazamiento APLICA la exclusión nueva — «¿Y el mes pasado sin el carro?» sirve $130, no el bruto $190, y la horquilla lo nombra", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    const t2 = c.ask("¿Y el mes pasado sin el carro?");
    assert.match(verdict(t2), /\$130\.00/);
    assert.match(verdict(t2), /Sin contar «Carro» \(\$60\.00\)/);
    assert.doesNotMatch(verdict(t2), /\$190\.00/);
    assert.equal(c.convo?.forkName, "el mes pasado · sin carro");
    assert.equal(c.convo?.exclusionName, "carro");
  });
  it("cara a': sin exclusión nueva, la del marco VIAJA — «¿Y el mes pasado?» sirve $100 (190 − Casa $90), no el bruto", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    const t2 = c.ask("¿Y el mes pasado?");
    assert.match(verdict(t2), /\$100\.00/);
    assert.match(verdict(t2), /Sin contar «Casa» \(\$90\.00\)/);
  });
  it("cara b: el estrechamiento NO invierte — «¿Y sin la casa y el carro?» excluye sobre el marco ($760), jamás «solo en Casa»", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté?");
    const t2 = c.ask("¿Y sin la casa y el carro?");
    assert.match(verdict(t2), /\$760\.00/);
    assert.match(verdict(t2), /Sin contar «Casa»/);
    assert.doesNotMatch(verdict(t2), /solo en Casa/);
  });
  it("cara b': la exclusión nueva REEMPLAZA a la del marco — «¿Y sin casa grande?» sirve $700 (960 − 260)", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    const t2 = c.ask("¿Y sin casa grande?");
    assert.match(verdict(t2), /\$700\.00/);
    assert.match(verdict(t2), /Sin contar «Casa Grande» \(\$260\.00\)/);
    assert.doesNotMatch(verdict(t2), /solo en/);
  });
  it("la descomposición sale NETA de la exclusión del marco: las piezas suman $760, no $960", () => {
    const c = new Convo(fixtureH());
    c.ask("¿Cuánto gasté sin la casa?");
    const t2 = c.ask("¿En qué gasté?");
    assert.equal(total(t2), 76000);
  });
});

describe("ola34 · F2 — la exclusión fresca que no resuelve muere nombrada", () => {
  it("«¿Cuánto gasté sin Juan?» (solo existe Juan Pérez) rehúsa el total entero y nombra a «juan» — no sirve los $960 con Juan Pérez dentro", () => {
    const r = loose(fixtureH(), "es", "¿Cuánto gasté sin Juan?");
    assert.equal(family(r), "historia");
    assert.match(verdict(r), /sin «juan»/);
    assert.match(verdict(r), /no tengo nada anotado con ese nombre/);
    assert.doesNotMatch(verdict(r), /\$960\.00/);
    assert.equal(r.kind === "answer" ? r.pieces.length : -1, 0);
  });
  it("control: la exclusión que SÍ resuelve sirve su resta nombrada ($760, «Sin contar «Casa»»)", () => {
    const r = loose(fixtureH(), "es", "¿Cuánto gasté sin la casa?");
    assert.match(verdict(r), /\$760\.00/);
    assert.match(verdict(r), /Sin contar «Casa» \(\$200\.00\)/);
  });
});

describe("ola34 · F3 — el desempate del nombre corto lo consulta el marco", () => {
  for (const gomezPrimero of [true, false]) {
    const tag = gomezPrimero ? "Gómez primero" : "Pérez primero";
    it(`con ${tag}: «¿Y Juan?» sobre el marco de Juan Pérez sirve a PÉREZ ($210), sin eco de cambio`, () => {
      const c = new Convo(fixtureJuanes(gomezPrimero));
      const t1 = c.ask("¿Cuánto le mandé a Juan Pérez?");
      assert.equal(total(t1), 21000);
      const t2 = c.ask("¿Y Juan?");
      assert.equal(total(t2), 21000);
      assert.doesNotMatch(note(t2), /cambié solo la persona/);
      assert.match(verdict(t2), /Juan Pérez/);
    });
  }
});

describe("ola34 · F4 — la caminata oye la frase de tiempo", () => {
  it("«¿Cuánto mandé hace dos meses?» sirve agosto ($200) — no acusa a «hace dos»", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto mandé hace dos meses?");
    assert.ok(!accuses(r, "hace dos"));
    assert.match(verdict(r), /\$200\.00/);
  });
  it("«¿Cuánto mandé hace 2 meses?» sirve agosto ($200) — no acusa a «hace 2»", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto mandé hace 2 meses?");
    assert.ok(!accuses(r, "hace 2"));
    assert.match(verdict(r), /\$200\.00/);
  });
  it("«¿Cuánto mandé hace tres meses?» no acusa a «hace tres»", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto mandé hace tres meses?");
    assert.ok(!accuses(r, "hace tres"));
  });
  it("«¿Cuánto mandé en el 2025?» no acusa a «2025» como persona", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto mandé en el 2025?");
    assert.ok(!accuses(r, "2025"));
  });
  it("control: «¿Cuánto le mandé a Rosa hace dos meses?» sirve agosto de Rosa ($200)", () => {
    const r = loose(fixtureMeses(), "es", "¿Cuánto le mandé a Rosa hace dos meses?");
    assert.match(verdict(r), /\$200\.00/);
  });
});

describe("ola34 · F5 — «el año pasado» tiene su puerta", () => {
  it("remesas: «¿Cuánto mandé el año pasado?» sirve 2025 ($500) con su nombre — no este año ($800)", () => {
    const r = loose(fixtureAnos(), "es", "¿Cuánto mandé el año pasado?");
    assert.match(verdict(r), /año pasado/);
    assert.match(verdict(r), /\$500\.00/);
    assert.doesNotMatch(verdict(r), /\$800\.00/);
  });
  it("remesas EN: \"How much did I send last year?\" sirve 2025 ($500) — no muere en unknown ni sirve este año", () => {
    const r = loose(fixtureAnos(), "en", "How much did I send last year?");
    assert.match(verdict(r), /[Ll]ast year/);
    assert.match(verdict(r), /\$500\.00/);
  });
  it("control: «¿Cuánto mandé este año?» sigue sirviendo 2026 ($800)", () => {
    const r = loose(fixtureAnos(), "es", "¿Cuánto mandé este año?");
    assert.match(verdict(r), /\$800\.00/);
  });
  it("historia: «¿Cuánto gasté el año pasado?» sirve 2025 ($70) con su nombre — no este año ($195)", () => {
    const ledger = book([], [gasto("g-26", KEY, 19500, "Comida", "10")]);
    ledger.months["2025-05"] = { lines: [gasto("g-25", "2025-05", 7000, "Comida", "10")] };
    const r = loose(ledger, "es", "¿Cuánto gasté el año pasado?");
    assert.match(verdict(r), /año pasado/);
    assert.match(verdict(r), /\$70\.00/);
    assert.doesNotMatch(verdict(r), /\$195\.00/);
  });
  it("historia EN: \"How much did I spend last year?\" sirve 2025 ($70)", () => {
    const ledger = book([], [gasto("g-26", KEY, 19500, "Comida", "10")]);
    ledger.months["2025-05"] = { lines: [gasto("g-25", "2025-05", 7000, "Comida", "10")] };
    const r = loose(ledger, "en", "How much did I spend last year?");
    assert.match(verdict(r), /last year/);
    assert.match(verdict(r), /\$70\.00/);
  });
});

describe("ola34 · F6 — mitad+mes se cose entero", () => {
  it("«¿Y la segunda quincena?» sobre «la primera quincena de octubre» no fabrica la pregunta ni sirve la primera mitad: el porqué cita «la segunda quincena de octubre»", () => {
    const c = new Convo(fixtureMitadMes());
    const t1 = c.ask("¿Cuánto mandé la primera quincena de octubre?");
    assert.equal(total(t1), 32000);
    assert.equal(c.convo?.periodPhrase, "octubre");
    const t2 = c.ask("¿Y la segunda quincena?");
    assert.equal(total(t2), 32000);
    assert.doesNotMatch(verdict(t2), /\$140\.00/);
    assert.match(note(t2), /segunda quincena/);
    const t3 = c.ask("¿Por qué?");
    assert.match(verdict(t3), /segunda quincena de octubre/);
    assert.doesNotMatch(verdict(t3), /primera quincena de segunda/);
  });
});

describe("ola34 · F7 — «the week» se oye", () => {
  it("\"And the week?\" tras \"this week\" sigue el hilo y sirve la semana ($120) — no muere en unknown", () => {
    const c = new Convo(fixtureSemana());
    const t1 = c.ask("How much did I send this week?", "completo", "en");
    assert.equal(total(t1), 12000);
    const t2 = c.ask("And the week?", "completo", "en");
    assert.equal(total(t2), 12000);
  });
});

describe("ola34 · F8 — la coma entra en la puerta de la regla", () => {
  it("«¿Cómo voy con la 50,30,20?» abre la familia regla, no la how", () => {
    const r = loose(guiaBook(), "es", "¿Cómo voy con la 50,30,20?");
    assert.equal(family(r), "regla");
  });
  it("«¿Cómo voy con la 50, 30, 20?» abre la familia regla, no la how", () => {
    const r = loose(guiaBook(), "es", "¿Cómo voy con la 50, 30, 20?");
    assert.equal(family(r), "regla");
  });
});

describe("ola34 · F9 — el folio devuelve la forma de solo día tal cual (cableado)", () => {
  it("folioDay devuelve la forma ISO_DAY como se escribió y los instantes siguen por todayIso", () => {
    const src = readFileSync(new URL("../../components/faro/passive-folios.tsx", import.meta.url), "utf8");
    assert.match(src, /if \(ISO_DAY\.test\(at\)\) return at;/);
    assert.match(src, /todayIso\(d\)/);
  });
});

describe("ola34 · F10 — el marco de la cuenta no nace con persona", () => {
  it("«¿Cuánto tengo en el Fondo Rosa?» deja accountName «fondo rosa» y NINGUNA personName", () => {
    const c = new Convo(fixtureFondoRosa());
    const t1 = c.ask("¿Cuánto tengo en el Fondo Rosa?");
    assert.match(verdict(t1), /\$700\.00/);
    assert.equal(c.convo?.accountName, "fondo rosa");
    assert.equal(c.convo?.personName, undefined);
  });
  it("«¿Y Ana?» sobre ese marco no sirve el stock entero ($1,000) ni cose «fondo ana»: muere honesto", () => {
    const c = new Convo(fixtureFondoRosa());
    c.ask("¿Cuánto tengo en el Fondo Rosa?");
    const t2 = c.ask("¿Y Ana?");
    assert.doesNotMatch(verdict(t2), /\$1,000\.00/);
    assert.doesNotMatch(note(t2), /cambié solo la persona/);
    const t3 = c.ask("¿Por qué?");
    assert.doesNotMatch(verdict(t3), /fondo ana/);
  });
  it("control: «¿Y Rosa?» sobre ese marco nombra a la CUENTA y re-sirve el fondo limpio ($700)", () => {
    const c = new Convo(fixtureFondoRosa());
    c.ask("¿Cuánto tengo en el Fondo Rosa?");
    const t2 = c.ask("¿Y Rosa?");
    assert.match(verdict(t2), /\$700\.00/);
  });
});
