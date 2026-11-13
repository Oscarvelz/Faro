/**
 * LA CERCA ANTI-FUGA (brief «Historial por períodos», ley de Oscar 2026-11-12): ocultar es un
 * filtro EN LA FUENTE. Un libro con una compra grande y distintiva; se aparta su semana; y
 * TODA lectura — totales, el Asesor y sus reglas que NOMBRAN cosas (categoría, atípico, ritmo),
 * el río y su búsqueda, la ventana de vencimientos — debe leer EXACTAMENTE como el mismo libro
 * construido sin ese dinero. Ni el nombre ni la cifra pueden aparecer, ni siquiera implicados
 * en un total. Restaurar lo devuelve todo; eliminar lo borra del estado; y el respaldo guarda
 * lo apartado marcado como apartado (copiar no es mostrar).
 * Datos sintéticos solamente.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { backupBlob, gunzip } from "../../spa/vault.ts";
import { readAdvisor } from "./advisor.ts";
import { savingsPicture } from "./awake.ts";
import { rewardsMonth } from "./bankbook.ts";
import { createInitial, isLedgerDeep, makeNamer } from "./defaults.ts";
import { deleteSpan, hidePeriod, restingEntries, restoreSpan, spansOf } from "./descanso.ts";
import { duesWindow } from "./dues.ts";
import { summarize } from "./engine.ts";
import { buildSheets, type ExportPick } from "./export-docs.ts";
import { buildStream, periodRange, streamTotals } from "./historial.ts";
import { peopleOf, personLines, personTotals } from "./people.ts";
import { blankSession, commit, commitFinal, copyRecurring, undo, upsertLine } from "./reducer.ts";
import { addRemitPerson, remitHistory } from "./remit-people.ts";
import { adviceRules } from "./rules.ts";
import { searchLedger } from "./search.ts";
import type { LedgerState, Line, RestingSpan } from "./types.ts";

const KEY = "2026-11";
const TODAY = new Date(2026, 10, 12);
const TV = 999_900; // C$9,999.00 — la compra distintiva
const TV_NAME = "Televisor gigante X9000";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "NIO",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    icon: "",
    history: [],
    ...partial,
  };
}

/** El mismo libro en dos versiones: con la compra de noviembre y sin ella. */
function book(withTv: boolean): LedgerState {
  const s = createInitial("es", "oscuro");
  const months: LedgerState["months"] = {};
  for (const mk of ["2026-08", "2026-09", "2026-10", KEY]) {
    months[mk] = {
      lines: [
        line({ id: `sal-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 5_000_000, monthKey: mk, bookedOn: `${mk}-01` }),
        line({ id: `nfx-${mk}`, kind: "subscription", concept: "Netflix", amountMinor: 2_500, monthKey: mk, categoryId: "f-casa", recurring: true, cadence: "monthly", nextDue: `${mk}-20` }),
        line({ id: `tv-${mk}`, kind: "purchase", concept: TV_NAME, amountMinor: 10_000, monthKey: mk, categoryId: "v-entretenimiento", seriesId: "tv", bookedOn: `${mk}-10` }),
      ],
    };
  }
  if (withTv) {
    months[KEY]!.lines[2] = line({ id: "tv-11", kind: "purchase", concept: TV_NAME, amountMinor: TV, monthKey: KEY, categoryId: "v-entretenimiento", seriesId: "tv", bookedOn: "2026-11-10" });
  } else {
    months[KEY]!.lines = months[KEY]!.lines.filter((l) => l.id !== `tv-${KEY}`);
  }
  // Un gasto diario pequeño y VIVO en noviembre: hace disparar la regla de ritmo en los tres
  // libros, para que la cerca compare una regla presente — no una ausencia compartida.
  months[KEY]!.lines.push(line({ id: "taxi-11", kind: "expense-variable", concept: "Taxi", amountMinor: 3_000, monthKey: KEY, categoryId: "v-transporte", bookedOn: "2026-11-05" }));
  s.months = months;
  return s;
}

const names = (s: LedgerState) => makeNamer(s.structure, "es");
const rulesOf = (s: LedgerState) => adviceRules(s, KEY, "es", names(s), { today: TODAY });
const readingOf = (s: LedgerState) => readAdvisor(s, KEY, "es", names(s), { today: TODAY });

describe("anti-fuga — la puerta en la fuente", () => {
  it("el libro CON la compra sí la lee (la cerca no es vacía)", () => {
    const withTv = book(true);
    const rules = rulesOf(withTv);
    assert.ok(rules.some((r) => r.id === "outlier"), "la regla del atípico dispara con la compra presente");
    assert.ok(JSON.stringify(rules).includes("Televisor"), "el atípico NOMBRA la compra mientras está viva");
    assert.equal(summarize(withTv, KEY, "es").purchases, TV);
  });

  it("apartada su semana, toda lectura es la del libro SIN ese dinero", () => {
    const withTv = book(true);
    const without = book(false);
    const week = periodRange("week", "2026-11-10");
    const hid = hidePeriod(withTv, week.from, week.to, "Semana del televisor");
    assert.equal(hid.count, 1);
    assert.equal(hid.outMinor, TV);
    assert.deepEqual(hid.months, [KEY]);
    const hidden = hid.state;

    // Totales del motor (Central; el widget hereda de aquí).
    assert.deepEqual(summarize(hidden, KEY, "es"), summarize(without, KEY, "es"));
    // El Asesor entero: cifras y textos.
    const ra = readingOf(hidden);
    const rb = readingOf(without);
    assert.deepEqual(
      { income: ra.income, outTotal: ra.outTotal, realSpend: ra.realSpend, left: ra.left, subsTotal: ra.subsTotal, uniqueMinor: ra.uniqueMinor, uniqueCount: ra.uniqueCount, recurrentMinor: ra.recurrentMinor, headline: ra.headline, action: ra.action, alert: ra.alert },
      { income: rb.income, outTotal: rb.outTotal, realSpend: rb.realSpend, left: rb.left, subsTotal: rb.subsTotal, uniqueMinor: rb.uniqueMinor, uniqueCount: rb.uniqueCount, recurrentMinor: rb.recurrentMinor, headline: rb.headline, action: rb.action, alert: rb.alert },
    );
    // Las reglas que nombran: iguales a las del libro sin el dinero, y sin rastro del apartado.
    assert.deepEqual(rulesOf(hidden), rulesOf(without));
    const allText = JSON.stringify(rulesOf(hidden));
    assert.ok(!allText.includes("Televisor"), "ninguna regla nombra lo apartado");
    assert.ok(!allText.includes(String(TV)), "ninguna cifra de lo apartado aparece");
    // El río y los totales de la vista: idénticos a los del libro sin el dinero.
    assert.deepEqual(buildStream(hidden), buildStream(without));
    assert.deepEqual(streamTotals(hidden, buildStream(hidden)), streamTotals(without, buildStream(without)));
    // La búsqueda no lo presenta: queda la serie de otros meses, no la de noviembre.
    const hits = searchLedger(hidden, "televisor", "es", names(hidden));
    assert.ok(hits.length > 0 && hits.every((h) => h.lineId !== "tv-11"), "la búsqueda no resucita la línea apartada");
    // El estado original no se mutó por el camino.
    assert.equal(withTv.months[KEY]!.lines.find((l) => l.id === "tv-11")?.rest, undefined);
  });

  it("el Archivo puro: cuenta y sumas del período; una línea, un solo período", () => {
    const withTv = book(true);
    const hid = hidePeriod(withTv, "2026-11-09", "2026-11-15");
    assert.ok(hid.span);
    const entry = restingEntries(hid.state)[0]!;
    assert.equal(restingEntries(hid.state).length, 1);
    assert.equal(entry.count, 1);
    assert.equal(entry.outMinor, TV);
    assert.deepEqual(entry.months, [KEY]);
    // Un segundo apartado que se cruza NO reclama la línea que ya descansa.
    const again = hidePeriod(hid.state, "2026-11-01", "2026-11-30");
    assert.ok(again.span);
    assert.ok(!again.span!.lineIds.includes("tv-11"), "la línea ya apartada pertenece a su primer período");
    assert.deepEqual(spansOf(again.state).length, 2);
  });

  it("restaurar lo devuelve todo; eliminar lo borra del estado", () => {
    const withTv = book(true);
    const hid = hidePeriod(withTv, "2026-11-09", "2026-11-15");
    const back = restoreSpan(hid.state, hid.span!.id);
    assert.equal(spansOf(back).length, 0);
    assert.equal(back.months[KEY]!.lines.find((l) => l.id === "tv-11")?.rest, undefined);
    assert.deepEqual(rulesOf(back), rulesOf(withTv));
    assert.deepEqual(summarize(back, KEY, "es"), summarize(withTv, KEY, "es"));

    const gone = deleteSpan(hid.state, hid.span!.id);
    assert.equal(spansOf(gone).length, 0);
    assert.equal(gone.months[KEY]!.lines.some((l) => l.id === "tv-11"), false);
    assert.deepEqual(summarize(gone, KEY, "es"), summarize(book(false), KEY, "es"));
    // Restaurar o eliminar un período que no existe no toca el libro.
    assert.equal(restoreSpan(withTv, "no-existe"), withTv);
    assert.equal(deleteSpan(withTv, "no-existe"), withTv);
  });

  it("la ventana de vencimientos no anuncia una cuota apartada", () => {
    const s = createInitial("es", "oscuro");
    s.months = {
      [KEY]: {
        lines: [
          line({ id: "gym-11", kind: "subscription", concept: "Gym oculto", amountMinor: 5_000, categoryId: "v-personales", recurring: true, cadence: "monthly", nextDue: "2026-11-15" }),
        ],
      },
    };
    assert.ok(duesWindow(s, 14, "2026-11-12").some((e) => e.id === "gym-11"), "la cuota vence en público mientras está viva");
    const hid = hidePeriod(s, "2026-11-15", "2026-11-15");
    assert.equal(hid.count, 1);
    assert.ok(!duesWindow(hid.state, 14, "2026-11-12").some((e) => e.id === "gym-11"), "apartada, la cuota no vence en ninguna lectura");
  });

  it("el respaldo guarda lo apartado marcado como apartado, y la lectura sigue cerrada", async () => {
    const hid = hidePeriod(book(true), "2026-11-09", "2026-11-15");
    // El paquete local (JSON entero) sobrevive tal cual.
    const packed = JSON.parse(JSON.stringify({ ledger: hid.state })) as { ledger: LedgerState };
    assert.ok(isLedgerDeep(packed.ledger));
    assert.equal(packed.ledger.months[KEY]!.lines.find((l) => l.id === "tv-11")?.rest, true);
    assert.equal(spansOf(packed.ledger).length, 1);
    // Y por la vía real del respaldo (vault.backupBlob → gunzip → la puerta de restauración).
    const bytes = await backupBlob(hid.state);
    const parsed = JSON.parse(await gunzip(bytes)) as { app?: string; ledger?: LedgerState };
    assert.equal(parsed.app, "FARO");
    assert.ok(isLedgerDeep(parsed.ledger));
    const restored = parsed.ledger!;
    assert.equal(restored.months[KEY]!.lines.find((l) => l.id === "tv-11")?.rest, true);
    assert.equal(spansOf(restored).length, 1);
    assert.deepEqual(summarize(restored, KEY, "es"), summarize(book(false), KEY, "es"));
  });
});

/**
 * LA SEGUNDA PASADA (auditoría adversarial 2026-11-13): las puertas de arriba aguantaron;
 * los escapes vivían en lectores que reimplementan sumas y listas — Personas, Remesas, las
 * recompensas, la foto de Ahorros al despertar y las hojas de exportar. La misma ley, en
 * cada uno: con el dinero apartado, la lectura es la del libro sin ese dinero. Y las tres
 * cercas de integridad (D1/D2/D3) y la de membresía (W1) que la auditoría pidió.
 */
describe("anti-fuga — la segunda pasada de la auditoría", () => {
  /** Un libro con cuatro secretos fechados el 10 y cuatro gemelos visibles el 20. */
  function leakBook(withSecrets: boolean): LedgerState {
    let s = createInitial("es", "oscuro");
    s = addRemitPerson(s, "Destino Uno", "rp1").state;
    s.people = [{ id: "p1", name: "Ana", birthday: "", note: "", dates: [] }];
    s.structure = {
      ...s.structure,
      categories: [
        ...s.structure.categories,
        { id: "ahorro-x", nameKey: "", customName: "Ahorro prueba", icon: "PiggyBank", hidden: false, order: 99, group: "fixed" as const, role: "savings", subs: [{ id: "ahorro-x.meta", nameKey: "", customName: "Meta", icon: "Circle", hidden: false, order: 0 }] },
      ],
    };
    const lines: Line[] = [
      line({ id: "sal-11", kind: "income-fixed", concept: "Salario", amountMinor: 5_000_000, bookedOn: "2026-11-01" }),
      line({ id: "pers-ok", kind: "expense-variable", concept: "Regalo visible", amountMinor: 20_000, categoryId: "v-familia", personId: "p1", bookedOn: "2026-11-20" }),
      line({ id: "rem-ok", kind: "expense-fixed", concept: "Remesa visible", amountMinor: 100_000, categoryId: "f-remesas", to: "rp1", bookedOn: "2026-11-20" }),
      line({ id: "card-ok", kind: "purchase", concept: "Compra visible", amountMinor: 20_000, currency: "USD", sourceId: "acct-chase-card", bookedOn: "2026-11-20" }),
      line({ id: "sav-ok", kind: "expense-fixed", concept: "Aporte visible", amountMinor: 40_000, categoryId: "ahorro-x", subId: "ahorro-x.meta", bookedOn: "2026-11-20" }),
    ];
    if (withSecrets) {
      lines.push(
        line({ id: "pers-x", kind: "expense-variable", concept: "Regalo secreto", amountMinor: 77_700, categoryId: "v-familia", personId: "p1", bookedOn: "2026-11-10" }),
        line({ id: "rem-x", kind: "expense-fixed", concept: "Remesa secreta", amountMinor: 185_000, categoryId: "f-remesas", to: "rp1", bookedOn: "2026-11-10" }),
        line({ id: "card-x", kind: "purchase", concept: "Compra secreta", amountMinor: 10_000, currency: "USD", sourceId: "acct-chase-card", bookedOn: "2026-11-10" }),
        // Con saldo escrito: la foto de Ahorros lo leería por stockOf, sin pasar por viewOf.
        line({ id: "sav-x", kind: "expense-fixed", concept: "Aporte secreto", amountMinor: 300_000, categoryId: "ahorro-x", subId: "ahorro-x.meta", bookedOn: "2026-11-10", balanceMinor: 300_000, balanceCurrency: "NIO" }),
      );
    }
    s.months = { [KEY]: { lines } };
    return s;
  }
  const PICK: ExportPick = { scope: "month", activeOnly: false, kinds: ["income-fixed", "expense-fixed", "expense-variable", "purchase", "subscription"], savings: true, debt: true, summary: false, charts: false, advice: false, remit: false };

  it("los lectores nuevos leen el libro CON secretos (la cerca no es vacía)", () => {
    const s = leakBook(true);
    assert.equal(personLines(s, "p1").length, 2);
    assert.equal(remitHistory(s, "rp1").length, 2);
    assert.equal(rewardsMonth(s, KEY, "USD", 366243)!.count, 2);
    assert.equal(savingsPicture(s, KEY).meta, 340_000);
    assert.ok(JSON.stringify(buildSheets(s, KEY, "es", names(s), PICK)).includes("Compra secreta"));
  });

  it("apartados los secretos, Personas, Remesas, recompensas, la foto y las hojas leen como el libro sin ellos", () => {
    const hid = hidePeriod(leakBook(true), "2026-11-09", "2026-11-15");
    assert.equal(hid.count, 4);
    const hidden = hid.state;
    const without = leakBook(false);
    const ana = peopleOf(without)[0]!;
    assert.deepEqual(personLines(hidden, "p1"), personLines(without, "p1"));
    assert.deepEqual(personTotals(hidden, ana, "NIO", 366243), personTotals(without, ana, "NIO", 366243));
    assert.deepEqual(remitHistory(hidden, "rp1"), remitHistory(without, "rp1"));
    assert.deepEqual(rewardsMonth(hidden, KEY, "USD", 366243), rewardsMonth(without, KEY, "USD", 366243));
    assert.deepEqual(savingsPicture(hidden, KEY), savingsPicture(without, KEY));
    const sheetsHidden = buildSheets(hidden, KEY, "es", names(hidden), PICK);
    assert.deepEqual(sheetsHidden, buildSheets(without, KEY, "es", names(without), PICK));
    assert.ok(!JSON.stringify(sheetsHidden).includes("secret"), "ninguna hoja impresa nombra lo apartado");
  });

  it("D1: copiar el mes no da a luz copias apartadas — ni por la vía llana ni por intervalos", () => {
    const s = createInitial("es", "oscuro");
    s.months = {
      [KEY]: {
        lines: [
          line({ id: "sub-11", kind: "subscription", concept: "Streaming", amountMinor: 2_500, recurring: true, cadence: "monthly", nextDue: "2026-11-20", bookedOn: "2026-11-20" }),
          line({ id: "seg-11", kind: "expense-fixed", concept: "Seguro trimestral", amountMinor: 90_000, recurring: true, cadence: "3m", nextDue: "2026-11-15", bookedOn: "2026-11-15" }),
        ],
      },
    };
    const hid = hidePeriod(s, "2026-11-01", "2026-11-30");
    assert.equal(hid.count, 2);
    const r = copyRecurring(hid.state, KEY, "2027-02");
    assert.equal(r.count, 2);
    const copies = r.state.months["2027-02"]!.lines;
    assert.ok(copies.every((l) => l.rest === undefined), "ninguna copia nace apartada: una copia no tiene período");
    assert.deepEqual(
      buildStream(r.state, { from: "2027-02-01", to: "2027-02-28" }).map((m) => m.concept).sort(),
      ["Seguro trimestral", "Streaming"],
      "las copias se ven y cuentan como movimientos nuevos",
    );
  });

  it("D2: una entrada malformada del registro sobrevive a apartar, mostrar y eliminar", () => {
    const raw = [{ id: 42 }, null, { nope: true }] as unknown as RestingSpan[];
    const damaged: LedgerState = { ...book(true), restingSpans: raw };
    const hid = hidePeriod(damaged, "2026-11-09", "2026-11-15");
    assert.equal(hid.count, 1);
    assert.equal(hid.state.restingSpans!.length, 4, "la escritura carga el registro crudo y añade el período");
    assert.deepEqual(hid.state.restingSpans!.slice(0, 3), raw, "las entradas malformadas no se entierran al escribir");
    assert.equal(spansOf(hid.state).length, 1, "la lectura sigue viendo solo el período válido");
    const back = restoreSpan(hid.state, hid.span!.id);
    assert.deepEqual(back.restingSpans, raw, "mostrar tampoco filtra el registro al escribir");
    const gone = deleteSpan(hid.state, hid.span!.id);
    assert.deepEqual(gone.restingSpans, raw, "ni eliminar: se va solo el período nombrado");
  });

  it("D3: el commit final no deja nada que deshacer", () => {
    const hid = hidePeriod(book(true), "2026-11-09", "2026-11-15");
    const withPast = commit(blankSession(hid.state), (s) => s, "un paso cualquiera");
    assert.equal(withPast.past.length, 1, "el commit ordinario sí deja historia");
    const fin = commitFinal(withPast, (s) => deleteSpan(s, hid.span!.id), "Eliminar período");
    assert.equal(fin.past.length, 0, "sin pasado: no hay snapshot que resucite lo borrado");
    assert.equal(fin.future.length, 0);
    assert.equal(fin.ledger.months[KEY]!.lines.some((l) => l.id === "tv-11"), false, "lo borrado se borró");
    assert.equal(undo(fin), fin, "deshacer ya no tiene de dónde agarrar");
  });

  it("W1: ocultar aparta exactamente el conjunto del río — la intención inactiva no se aparta", () => {
    const s = createInitial("es", "oscuro");
    s.months = {
      [KEY]: {
        lines: [
          line({ id: "vivo", kind: "purchase", concept: "Compra viva", amountMinor: 10_000, bookedOn: "2026-11-10" }),
          line({ id: "intencion", kind: "expense-variable", concept: "Gasto pensado", amountMinor: 55_000, bookedOn: "2026-11-11", active: false }),
          line({ id: "traspaso", kind: "purchase", concept: "Pago tarjeta", amountMinor: 70_000, bookedOn: "2026-11-12", active: false, xfer: true }),
        ],
      },
    };
    const range = { from: "2026-11-01", to: "2026-11-30" };
    const stream = buildStream(s, range);
    assert.equal(stream.length, 2, "el río trae la compra y la transferencia; la intención, no");
    const hid = hidePeriod(s, range.from, range.to);
    assert.equal(hid.count, stream.length, "la ventana, el río y el verbo cuentan los mismos movimientos");
    assert.equal(hid.outMinor, streamTotals(s, stream).outMinor);
    const intention = hid.state.months[KEY]!.lines.find((l) => l.id === "intencion")!;
    assert.equal(intention.rest, undefined, "la intención no se aparta: no es un movimiento");
    // El daño que W1 cura: activada después, la intención cuenta como cualquier línea viva —
    // no queda visible y contando en ninguna parte por haber nacido apartada.
    const on = upsertLine(hid.state, { ...intention, active: true });
    assert.ok(buildStream(on).some((m) => m.lineId === "intencion"));
  });
});
