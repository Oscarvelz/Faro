/**
 * FARO — «Los tres modos», etapa 4 (las piezas nuevas).
 *
 * Lo que cercan estas pruebas:
 *
 *  - E-1 «Puedes gastar hoy»: la fórmula contra un libro calculado a mano
 *    (lo libre del motor − los compromisos de la ventana única ÷ los días
 *    que quedan); la cuota cuya serie ya vive en el mes NO se resta dos
 *    veces; la tarjeta entra por su mínimo; el préstamo sin cifra modelada
 *    no inventa ninguna; lo prestado no es compromiso; el día negativo se
 *    lee negativo con su explicación, nunca un cero falso; la explicación
 *    ES/EN trae las cifras reales y ningún porcentaje.
 *  - La cifra viaja en la foto del widget como cifra de verdad (X-29):
 *    idéntica en los tres modos para el mismo libro.
 *  - S-1 en su forma final: la cara lectora compone la gráfica y los hechos
 *    del estudio (sin la frase de utilización de Completo, X-27) y no monta
 *    un solo verbo — su único toque abre la hoja de la persona, que es
 *    lectura.
 *  - La sugerencia de subida del Asesor: nace solo con objeto real (sin
 *    objeto, silencio — principio 5), apunta siempre al modo siguiente, su
 *    firma (razón + conteo) la re-arma cuando el objeto crece, y ni ella ni
 *    su superficie escriben jamás el campo de modo (solo el selector y la
 *    puerta inicial lo escriben).
 *  - Las anclas que la etapa acuña: desk-hoy, modo-mudos, modo-lista.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { duesWindow } from "./dues.ts";
import { summarize } from "./engine.ts";
import { FEATURES, hasFeature, type FeatureId, type Mode } from "./mode.ts";
import { roundHalfAway } from "./money.ts";
import { withSampleArc } from "./sample.ts";
import { todaySpend, todayText } from "./today.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import type { CreditCard, LedgerState, Line } from "./types.ts";

const MODES: Mode[] = ["esencial", "ritmo", "completo"];
const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const TODAY = "2026-11-16"; // noviembre: 30 días → quedan 15, hoy incluido
const KEY = "2026-11";

let seq = 0;
function line(partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }): Line {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: KEY, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
}

/** El libro calculado a mano. Noviembre 2026, hoy = 16 (quedan 15 días):
 *  entran C$30,000; salen C$6,000 variables y una cuota de C$1,500 cuya serie
 *  vive en el mes (nextDue 20) → lo libre = C$22,500. Compromisos que quedan:
 *  la cuota de octubre (C$900, nextDue 25 — su serie NO vive en noviembre) y
 *  el mínimo de la tarjeta (C$400 de un saldo de C$4,000, vence el 28) =
 *  C$1,300 en 2 compromisos. El préstamo (día 20) no trae cifra modelada y lo
 *  prestado (C$2,000, el 22) es dinero que entra: ninguno resta.
 *  → (22,500 − 1,300) ÷ 15 = C$1,413.33 → 141,333 minor. */
function handBook(mode: Mode | null = null): LedgerState {
  const book = createInitial("es", "claro");
  if (mode) book.settings.mode = mode;
  const catAny = book.structure.categories.find((c) => c.role !== "savings" && c.role !== "debt")!.id;
  const inMonth = line({ kind: "subscription", amountMinor: 150_000, categoryId: catAny, recurring: true, cadence: "monthly", nextDue: "2026-11-20", concept: "Cuota del mes" });
  inMonth.seriesId = "s-in-month";
  book.months[KEY] = { lines: [
    line({ kind: "income-fixed", amountMinor: 3_000_000, categoryId: catAny, concept: "Salario" }),
    line({ kind: "expense-variable", amountMinor: 600_000, categoryId: catAny, concept: "Mercado" }),
    inMonth,
  ] };
  const oct = line({ kind: "subscription", amountMinor: 90_000, categoryId: catAny, recurring: true, cadence: "monthly", nextDue: "2026-11-25", concept: "Cuota de octubre", monthKey: "2026-10" });
  oct.seriesId = "s-oct";
  book.months["2026-10"] = { lines: [oct] };
  const card: CreditCard = {
    id: "card-1", name: "Tarjeta Prueba", issuer: "", mark: "", color: "", last4: "1234",
    currency: "NIO", limitMinor: 1_000_000, dueDay: 28, aprBps: 0, autopay: null, rewards: "",
    snaps: [{ on: "2026-11-05", at: "2026-11-05T10:00:00", balanceMinor: 400_000, minMinor: 40_000, src: "manual" }],
  };
  book.cards = [card];
  book.loans = [{ id: "loan-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 500_000, currency: "NIO", aprBps: 0, takenOn: "2026-10-01", dueDay: 20, book: "fixed", note: "" }];
  book.lent = [{ id: "lent-1", person: "Ana", kind: "plain", amountMinor: 200_000, currency: "NIO", aprBps: 0, startedOn: "2026-11-01", dueOn: "2026-11-22", note: "" }];
  return book;
}

const cloneAs = (book: LedgerState, mode: Mode): LedgerState => {
  const c = structuredClone(book);
  c.settings.mode = mode;
  return c;
};

/* ---------- E-1: la fórmula, calculada a mano ---------- */

describe("modos298: «Puedes gastar hoy» (E-1)", () => {
  it("la fórmula contra el libro calculado a mano", () => {
    const fig = todaySpend(handBook(), TODAY);
    assert.equal(fig.freeMinor, 2_250_000, "lo libre es el opportunity del motor: 30,000 − 6,000 − 1,500");
    assert.equal(fig.dueMinor, 130_000, "compromisos: la cuota de octubre (900) + el mínimo de la tarjeta (400)");
    assert.equal(fig.dueCount, 2, "dos compromisos forman la resta (ni el préstamo sin cifra ni lo prestado)");
    assert.equal(fig.daysLeft, 15, "del 16 al 30 de noviembre, hoy incluido");
    assert.equal(fig.perDayMinor, 141_333, "(22,500 − 1,300) ÷ 15 = 1,413.33");
  });

  it("la cuota cuya serie ya vive en el mes no se resta dos veces, venga de donde venga su instancia", () => {
    const book = handBook();
    // La misma serie con una instancia vieja en octubre cuyo nextDue cae en
    // noviembre: la ventana puede traer ESA instancia (su deduplicación manda
    // la más vieja) y aun así la serie ya está dentro de lo libre.
    const ghost = line({ kind: "subscription", amountMinor: 150_000, categoryId: book.structure.categories[0]!.id, recurring: true, cadence: "monthly", nextDue: "2026-11-20", concept: "Cuota del mes", monthKey: "2026-10" });
    ghost.seriesId = "s-in-month";
    book.months["2026-10"]!.lines.push(ghost);
    const fig = todaySpend(book, TODAY);
    assert.equal(fig.dueMinor, 130_000, "la serie del mes sigue sin restarse: su dinero ya está en lo libre");
    assert.equal(fig.dueCount, 2);
  });

  it("sin la cuota de octubre, solo queda el mínimo de la tarjeta", () => {
    const book = handBook();
    book.months["2026-10"] = { lines: [] };
    const fig = todaySpend(book, TODAY);
    assert.equal(fig.dueMinor, 40_000);
    assert.equal(fig.dueCount, 1);
    assert.equal(fig.perDayMinor, roundHalfAway((2_250_000 - 40_000) / 15));
  });

  it("el día negativo se lee negativo, con su explicación — nunca un cero falso", () => {
    const book = createInitial("es", "claro");
    const catAny = book.structure.categories.find((c) => c.role !== "savings")!.id;
    book.months[KEY] = { lines: [
      line({ kind: "income-fixed", amountMinor: 100_000, categoryId: catAny }),
      line({ kind: "expense-variable", amountMinor: 300_000, categoryId: catAny }),
    ] };
    const fig = todaySpend(book, TODAY);
    assert.equal(fig.freeMinor, -200_000);
    assert.equal(fig.perDayMinor, -13_333, "(−2,000) ÷ 15 = −133.33: la cifra verdadera, en negativo");
    assert.ok(fig.perDayMinor < 0);
    const es = todayText(book, TODAY, "es");
    assert.ok(es.note.includes("sin maquillar"), "la nota del día negativo lo dice sin maquillar (ES)");
    assert.ok(es.formula.includes("-C$2,000.00"), "la fórmula enseña la cifra negativa tal cual");
    const en = todayText(book, TODAY, "en");
    assert.ok(en.note.includes("unvarnished"), "la nota del día negativo lo dice sin maquillar (EN)");
  });

  it("el último día del mes divide entre 1", () => {
    const book = createInitial("es", "claro");
    const catAny = book.structure.categories.find((c) => c.role !== "savings")!.id;
    book.months[KEY] = { lines: [line({ kind: "income-fixed", amountMinor: 50_000, categoryId: catAny })] };
    const fig = todaySpend(book, "2026-11-30");
    assert.equal(fig.daysLeft, 1);
    assert.equal(fig.perDayMinor, 50_000);
  });

  it("la explicación trae las cifras reales en los dos idiomas y ningún porcentaje", () => {
    const book = handBook();
    for (const lang of ["es", "en"] as const) {
      const txt = todayText(book, TODAY, lang);
      assert.ok(txt.formula.includes("C$22,500.00"), `la fórmula nombra lo libre (${lang})`);
      assert.ok(txt.formula.includes("C$1,300.00"), `la fórmula nombra los compromisos (${lang})`);
      assert.ok(txt.formula.includes("(2)"), `la fórmula cuenta los compromisos (${lang})`);
      assert.ok(txt.formula.includes(lang === "es" ? "15 días" : "15 days"), `la fórmula nombra los días (${lang})`);
      for (const part of [txt.what, txt.formula, txt.note]) assert.ok(!part.includes("%"), `ningún % en la explicación (${lang})`);
    }
    assert.ok(todayText(book, TODAY, "es").what.includes("compromisos que quedan"));
    assert.ok(todayText(book, TODAY, "en").what.includes("commitments still ahead"));
  });

  it("sobre la casa de ejemplo: lo libre es el opportunity del motor y la resta sale de la ventana única", () => {
    const book = withSampleArc(createInitial("es", "claro")).ledger;
    const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
    const today = `${key}-16`;
    const fig = todaySpend(book, today);
    assert.equal(fig.freeMinor, summarize(book, key, "es").opportunity, "lo libre no es una segunda verdad: es desk-left");
    const daysLeft = fig.daysLeft;
    const inMonth = new Set((book.months[key]?.lines ?? []).filter((l) => l.active && !l.rest).map((l) => l.seriesId || l.id));
    const expected = duesWindow(book, daysLeft - 1, today)
      .filter((e) => e.amt != null && (e.kind === "card" || (e.kind === "cuota" && !inMonth.has(e.line ? (e.line.seriesId || e.line.id) : e.id))))
      .reduce((a, e) => a + (e.amt ?? 0), 0);
    assert.equal(fig.dueMinor, expected, "la resta es la ventana única filtrada, sin matemática paralela");
    assert.equal(fig.perDayMinor, roundHalfAway((fig.freeMinor - fig.dueMinor) / daysLeft));
  });

  it("la cifra no conoce el modo: el mismo libro da el mismo número en los tres", () => {
    const base = handBook();
    const figs = MODES.map((m) => todaySpend(cloneAs(base, m), TODAY));
    assert.deepEqual(figs[1], figs[0]);
    assert.deepEqual(figs[2], figs[0]);
  });
});

/* ---------- la foto del widget (X-29) ---------- */

describe("modos298: la cifra de hoy viaja en la foto como cifra de verdad", () => {
  it("todaySpend de la foto = la fórmula, idéntica en los tres modos", () => {
    const base = handBook();
    for (const m of MODES) {
      const snap = buildWidgetSnapshot(cloneAs(base, m), "es", { today: TODAY, hide: false, lock: false });
      assert.equal(snap.todaySpend, 141_333, `la foto en ${m} lleva la cifra calculada a mano`);
      assert.equal(snap.mode, m);
    }
  });
});

/* ---------- S-1 en su forma final ---------- */

describe("modos298: la cara lectora de deudas, forma final (S-1)", () => {
  const debts = SRC("../../components/faro/debts.tsx");
  const body = debts.slice(debts.indexOf("export function DebtsReadOnly"), debts.indexOf("export function SeeAll"));

  it("compone la gráfica y los hechos del estudio desde los lectores puros", () => {
    assert.ok(body.includes("<DebtChart />"), "la gráfica de la deuda vive en la cara lectora");
    assert.ok(body.includes("debt-ro-study"), "el bloque de estudio vive en la cara lectora");
    assert.ok(body.includes("loanTotals(ledger)"), "los hechos salen de loanTotals, el lector del estudio");
    assert.ok(body.includes("interestPaidTotal(ledger)"), "el interés pagado sale de su lector");
    assert.ok(!body.includes("cardTotals") && !body.includes(".util") && !body.includes("of the limit") && !body.includes("del límite"),
      "sin la cifra de utilización de Completo (X-27): ni su lector (cardTotals), ni su campo (.util), ni su frase");
    assert.ok(body.includes("debt.ro.note.pre"), "su explicación muda sigue cerrando la cara");
  });

  it("no monta un solo verbo: su único toque abre la hoja de la persona, que es lectura", () => {
    assert.ok(!/(payLent|payLoan|addLent|archiveLent|restoreLent|upsertLine|deleteLine|commit|addLoan|archiveLoan)\s*\(/.test(body),
      "ninguna llamada de pago, alta, archivo o guardado vive en la cara lectora");
    const clicks = [...body.matchAll(/onClick/g)].length;
    assert.equal(clicks, 1, "un solo toque en toda la cara");
    assert.ok(body.includes("onClick={() => openFor(p.name)}"), "y ese toque abre la hoja de la persona (leer su historia)");
    assert.ok(!/CardSheet|LoanForm|FreqPick/.test(body), "ninguna hoja editable se monta");
  });
});

/* ---------- la sugerencia de subida ---------- */

describe("modos298: la sugerencia de subida del Asesor", () => {
  const coachOf = (book: LedgerState, lang: "es" | "en" = "es") =>
    readCoach(book, KEY, lang, makeNamer(book.structure, lang), new Date(`${TODAY}T12:00:00`));

  it("con deudas con saldo, Esencial oye la sugerencia hacia Ritmo, con su razón y su firma", () => {
    const hint = coachOf(handBook("esencial")).upgradeHint;
    assert.ok(hint, "la sugerencia existe");
    assert.equal(hint.to, "ritmo", "siempre al modo siguiente");
    assert.equal(hint.reason, "debt");
    assert.equal(hint.sig, "debt:3", "la firma es razón + conteo: tarjeta + préstamo + prestado");
    assert.ok(hint.text.includes("Ritmo"));
    assert.ok(!hint.text.includes("%"), "en Esencial la sugerencia habla en llano, sin porcentajes");
  });

  it("en Ritmo el mismo libro oye la sugerencia hacia Completo (el plan vive arriba)", () => {
    const hint = coachOf(handBook("ritmo")).upgradeHint;
    assert.ok(hint);
    assert.equal(hint.to, "completo");
    assert.equal(hint.reason, "plan");
    assert.equal(hint.sig, "plan:3");
    assert.ok(!hint.text.includes("%"));
  });

  it("en Completo no hay sugerencia: no tiene objeto", () => {
    assert.equal(coachOf(handBook("completo")).upgradeHint, null);
  });

  it("sin objeto, silencio (principio 5): un libro sin deudas, fondos ni cuotas no oye nada", () => {
    const book = createInitial("es", "claro");
    book.settings.mode = "esencial";
    const catAny = book.structure.categories.find((c) => c.role !== "savings")!.id;
    book.months[KEY] = { lines: [line({ kind: "income-fixed", amountMinor: 100_000, categoryId: catAny })] };
    assert.equal(coachOf(book).upgradeHint, null);
  });

  it("los fondos mudos hablan en Esencial; su naturaleza declarada habla en Ritmo", () => {
    const fundsBook = (mode: Mode): LedgerState => {
      const book = createInitial("es", "claro");
      book.settings.mode = mode;
      const cat = book.structure.categories.find((c) => c.role === "savings")!;
      const sub = cat.subs.find((s) => !(s.icon === "vault" || s.icon.startsWith("vault:")))!;
      const l = line({ kind: "expense-variable", amountMinor: 0, categoryId: cat.id, subId: sub.id, balanceMinor: 500_000 });
      l.fund = "aparte";
      book.months[KEY] = { lines: [l] };
      return book;
    };
    const e = coachOf(fundsBook("esencial")).upgradeHint;
    assert.ok(e); assert.equal(e.reason, "funds"); assert.equal(e.to, "ritmo"); assert.equal(e.sig, "funds:1");
    const r = coachOf(fundsBook("ritmo")).upgradeHint;
    assert.ok(r); assert.equal(r.reason, "nature"); assert.equal(r.to, "completo"); assert.equal(r.sig, "nature:1");
  });

  it("las cuotas solas también son objeto: en Esencial se leen como movimientos", () => {
    const book = createInitial("es", "claro");
    book.settings.mode = "esencial";
    const catAny = book.structure.categories.find((c) => c.role !== "savings" && c.role !== "debt")!.id;
    book.months[KEY] = { lines: [
      line({ kind: "income-fixed", amountMinor: 500_000, categoryId: catAny }),
      line({ kind: "subscription", amountMinor: 10_000, categoryId: catAny, recurring: true, cadence: "monthly", nextDue: "2026-11-20" }),
    ] };
    const hint = coachOf(book).upgradeHint;
    assert.ok(hint);
    assert.equal(hint.reason, "subs");
    assert.equal(hint.sig, "subs:1");
  });

  it("la firma re-arma: si el objeto crece, la firma cambia (la disciplina de la capa despierta)", () => {
    const before = coachOf(handBook("esencial")).upgradeHint!;
    const grown = handBook("esencial");
    grown.cards = [...(grown.cards ?? []), {
      id: "card-2", name: "Otra", issuer: "", mark: "", color: "", last4: "9999", currency: "NIO",
      limitMinor: 500_000, dueDay: 15, aprBps: 0, autopay: null, rewards: "",
      snaps: [{ on: "2026-11-03", at: "2026-11-03T10:00:00", balanceMinor: 100_000, minMinor: 10_000, src: "manual" }],
    } as CreditCard];
    const after = coachOf(grown).upgradeHint!;
    assert.equal(before.sig, "debt:3");
    assert.equal(after.sig, "debt:4", "un objeto más = firma nueva: lo descartado con la vieja puede volver a hablar");
  });

  it("la sugerencia nunca escribe el modo: solo el selector y la puerta inicial lo escriben", () => {
    for (const f of ["../../lib/faro/coach.ts", "../../components/faro/panorama.tsx", "../../lib/faro/today.ts", "../../lib/faro/widget.ts"]) {
      const src = SRC(f);
      assert.ok(!/settings:\s*\{[^}]*\bmode\b/.test(src), `${f} no escribe settings.mode`);
      assert.ok(!/\.mode\s*=[^=]/.test(src), `${f} no asigna ningún .mode`);
    }
    // El censo de asientos que SÍ escriben el modo (la forma del guardado):
    // provider.tsx (puerta inicial + préstamo de sellados) y screens.tsx
    // (applyMode, el selector). Ningún otro archivo de la app la trae.
    for (const f of ["advisor.ts", "rules.ts", "awake.ts", "mode.ts", "dues.ts", "engine.ts", "savings.ts"]) {
      assert.ok(!/settings:\s*\{[^}]*\bmode\s*:/.test(SRC(`../../lib/faro/${f}`)), `${f} no escribe el modo`);
    }
  });

  it("la casa de ejemplo en Esencial oye alguna sugerencia verdadera; en Completo, ninguna", () => {
    const house = (mode: Mode) => {
      const book = withSampleArc(createInitial("es", "claro")).ledger;
      book.settings.mode = mode;
      const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
      return { book, key };
    };
    const e = house("esencial");
    const hintE = readCoach(e.book, e.key, "es", makeNamer(e.book.structure, "es"), new Date(`${e.key}-16T12:00:00`)).upgradeHint;
    assert.ok(hintE, "la casa tiene deudas, fondos o cuotas: alguna razón verdadera habla");
    assert.equal(hintE.to, "ritmo");
    const c = house("completo");
    assert.equal(readCoach(c.book, c.key, "es", makeNamer(c.book.structure, "es"), new Date(`${c.key}-16T12:00:00`)).upgradeHint, null);
  });
});

/* ---------- anclas y registro ---------- */

describe("modos298: anclas acuñadas y filas del registro", () => {
  it("desk-hoy, modo-mudos y modo-lista existen sobre las superficies reales", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('data-anchor="desk-hoy"'), "la banda de hoy lleva su ancla en Central");
    assert.ok(screens.includes('data-anchor="modo-mudos"'), "la fila muda lleva el ancla que el módulo 15 espera (X-26)");
    assert.ok(screens.includes('data-anchor="modo-lista"'), "la lista de fondos mudos lleva su ancla");
    assert.ok(!screens.includes('data-anchor="desk-mudos"'), "el nombre viejo de la etapa 3.1 no queda vivo en ningún sitio");
    // X-30: la baldosa de hoy en las baldosas del Asesor NO se construye — en
    // Esencial el bloque entero (notas + baldosas) vive tras «Ver el detalle»
    // y la puerta advisor.month-detail (Ritmo), así que allí no montaría
    // nunca; la escena m17-hoy que la espera es material de la auditoría de
    // la etapa 5, declarado en el plan. Código muerto fingiendo ser la pieza
    // sería peor que su ausencia declarada.
    assert.ok(!screens.includes("todayTile"), "sin baldosa muerta en el Asesor (X-30)");
  });

  it("las filas de la etapa viven en el registro, nacidas en Esencial (principio 10)", () => {
    assert.equal(FEATURES["desk.today-spend" as FeatureId], "esencial");
    assert.equal(FEATURES["advisor.mode-hint" as FeatureId], "esencial", "la sugerencia nace en Esencial: habla ahí y en Ritmo");
    for (const m of MODES) assert.ok(hasFeature(m, "advisor.mode-hint" as FeatureId), `la fila se lee en ${m} (en Completo la sugerencia no tiene objeto, no cara)`);
  });

  it("las claves nuevas de texto existen en los dos idiomas", () => {
    const i18n = SRC("../../lib/faro/i18n.ts");
    for (const k of ["desk.today.title", "mode.list.cls.aparte", "mode.list.cls.sin-declarar", "mode.list.cls.retiro", "mode.list.total"]) {
      assert.equal(i18n.split(`"${k}"`).length - 1, 2, `${k} existe en ES y en EN`);
    }
  });
});
