/**
 * FARO — OLA 2 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * Cada espécimen de los cinco informes de la ola 2 (OLA2-ASESOR, OLA2-CAMBIOS,
 * OLA2-CARA, OLA2-ENSENANZA, OLA2-GUARDIAN) convertido en cerca que pasa.
 * Los libros son los del banco de la ola (cosecha2 y hermanos), fijados a
 * mano sobre el 2026-11-16; jamás producción. Donde la rotura vive en un
 * componente, la cerca es de fuente y el banco CDP de la campaña la acompaña.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { MODULES, moduleView, resumeSceneId } from "./guion.ts";
import { FEATURES, featureForGo, modeOf } from "./mode.ts";
import { blankSession, commit, copyRecurring, redo, undo } from "./reducer.ts";
import { adviceRules } from "./rules.ts";
import type { CreditCard, LedgerState, Lent, Line, Loan } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const TODAY = "2026-11-16";
const todayDate = new Date(`${TODAY}T12:00:00`);
const iso = (off: number) => {
  const d = new Date(2026, 10, 16 + off, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayOf = (off: number) => new Date(2026, 10, 16 + off, 12).getDate();

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

function baseBook(mode: "esencial" | "ritmo" | "completo", lang: "es" | "en" = "es"): LedgerState {
  const b = createInitial(lang, "claro");
  b.settings.mode = mode;
  b.months[KEY] = { lines: [line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 })] };
  return b;
}
const coachOf = (book: LedgerState, lang: "es" | "en" = "es") =>
  readCoach(book, KEY, lang, makeNamer(book.structure, lang), todayDate);
const hintOf = (book: LedgerState) => coachOf(book).upgradeHint;

const mkCard = (id: string, name: string, balance: number, min: number | null, dueOff: number, extra: object = {}): CreditCard => ({
  id, name, issuer: "", mark: "", color: "", last4: "1234", currency: "NIO", limitMinor: 2_000_000,
  dueDay: dayOf(dueOff), aprBps: 2400, autopay: null, rewards: "",
  snaps: [{ on: iso(-6), at: `${iso(-6)}T12:00:00.000Z`, balanceMinor: balance, ...(min !== null ? { minMinor: min } : {}) }],
  ...extra,
} as unknown as CreditCard);
const mkLoan = (id: string, lender: string, amount: number, dueDay: number | undefined, takenOff = -60): Loan => ({
  id, lender, who: "entity", kind: "plain", amountMinor: amount, currency: "NIO", aprBps: 0,
  takenOn: iso(takenOff), ...(dueDay ? { dueDay } : {}), book: "fixed", note: "",
} as unknown as Loan);
const mkLent = (id: string, person: string, amount: number, dueOn: string): Lent => ({
  id, person, kind: "plain", amountMinor: amount, currency: "NIO", aprBps: 0, startedOn: iso(-40), dueOn, note: "",
} as unknown as Lent);

/* ================= EL ASESOR II (BR2-1…BR2-7) ================= */

describe("ola2 · el gatillo SOS-1 mide uso, no estructura (BR2-1/BR2-2)", () => {
  it("S1/S2: una tarjeta sola con saldo — su fecha es el ciclo, no un uso: silencio (ES y EN)", () => {
    for (const balance of [10_000, 100_000]) {
      const b = baseBook("esencial");
      b.cards = [mkCard("c1", "Visa Banco", balance, 2_500, 10)];
      assert.equal(hintOf(b), null, `tarjeta sola de C$${balance / 100}: la sugerencia no salta ante la estructura`);
    }
  });

  it("S3: dos prestados diminutos sin fecha ni pagos — existencia, no uso: silencio", () => {
    const b = baseBook("esencial");
    b.lent = [mkLent("l1", "Ana", 5_000, ""), mkLent("l2", "Luis", 5_000, "")];
    assert.equal(hintOf(b), null);
  });

  it("S4: una fecha a 300 días no es un seguimiento cercano: silencio", () => {
    const b = baseBook("esencial");
    b.lent = [mkLent("l1", "Ana", 5_000, iso(300)), mkLent("l2", "Luis", 3_000, "")];
    assert.equal(hintOf(b), null);
  });

  it("S5: un préstamo de C$200,000 sin día de pago y sin pagos: silencio (la existencia ya la habla Esencial)", () => {
    const b = baseBook("esencial");
    b.loans = [mkLoan("ln1", "Banco", 20_000_000, undefined)];
    assert.equal(hintOf(b), null);
  });

  it("S5b: el mismo préstamo CON un pago anotado este mes: el uso pide Ritmo", () => {
    const b = baseBook("esencial");
    b.loans = [mkLoan("ln1", "Banco", 20_000_000, undefined)];
    b.months[KEY]!.lines.push(line({ kind: "expense-fixed", concept: "Cuota banco", amountMinor: 500_000, loanId: "ln1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number }));
    assert.equal(hintOf(b)?.reason, "debt");
  });

  it("S6: un prestado grande que vence en 7 días: la ventana lo sigue de cerca, la sugerencia salta", () => {
    const b = baseBook("esencial");
    b.lent = [mkLent("l1", "Ana", 8_000_000, iso(7))];
    assert.equal(hintOf(b)?.reason, "debt");
  });

  it("S7: una tarjeta con saldo pero sin fecha por ningún lado: silencio", () => {
    const b = baseBook("esencial");
    b.cards = [{ id: "c1", name: "Visa Banco", issuer: "", mark: "", color: "", last4: "1234", currency: "NIO", limitMinor: 2_000_000, dueDay: 0, aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: iso(-6), at: `${iso(-6)}T12:00:00.000Z`, balanceMinor: 500_000, minMinor: 25_000 }] } as unknown as CreditCard];
    assert.equal(hintOf(b), null);
  });

  it("S8: prestado ya cobrado del todo — ninguna rama afirma «Tienes deudas con saldo» sin deudas", () => {
    const b = baseBook("esencial");
    b.lent = [mkLent("l1", "Ana", 15_000, "")];
    b.months[KEY]!.lines.push(line({ kind: "income-variable", concept: "Abono de Ana", amountMinor: 20_000, lentId: "l1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number }));
    const hint = hintOf(b);
    assert.equal(hint, null, "sin deuda viva no hay sugerencia de deudas — la firma debt:0 con su frase falsa no vuelve");
  });

  it("la tarjeta VENCIDA sí es un uso que seguir: su fecha pasada dispara", () => {
    const b = baseBook("esencial");
    b.cards = [{ id: "c1", name: "Visa Banco", issuer: "", mark: "", color: "", last4: "1234", currency: "NIO", limitMinor: 2_000_000, dueDay: dayOf(-6), aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: iso(-20), at: `${iso(-20)}T12:00:00.000Z`, balanceMinor: 800_000, minMinor: 25_000, dueOn: iso(-6) }] } as unknown as CreditCard];
    assert.equal(hintOf(b)?.reason, "debt", "una tarjeta vencida y sin pagar es gestión viva, no estructura");
  });

  it("el préstamo con día declarado entra por su fecha (la app lo sigue cada mes)", () => {
    const b = baseBook("esencial");
    b.loans = [mkLoan("ln1", "Banco", 9_000_000, dayOf(5))];
    assert.equal(hintOf(b)?.reason, "debt");
  });

  it("S9: en Ritmo, una tarjeta sola y tranquila no sugiere el plan de Completo", () => {
    const b = baseBook("ritmo");
    b.cards = [mkCard("c1", "Visa Banco", 10_000, 2_500, 10)];
    assert.equal(hintOf(b), null);
  });
});

describe("ola2 · el Asesor sin disfraces ni cifras inventadas (BR2-3…BR2-7)", () => {
  const tightBook = (lang: "es" | "en") => {
    const b = createInitial(lang, "claro");
    b.settings.mode = "esencial";
    b.months[KEY] = { lines: [
      line({ kind: "income-fixed", concept: "Salario", amountMinor: 2_000_000 }),
      line({ kind: "expense-fixed", concept: "Renta", amountMinor: 1_500_000 }),
      line({ kind: "expense-fixed", concept: "Comida", amountMinor: 900_000 }),
    ] };
    return b;
  };

  it("BR2-3: el Plan de Esencial ya no deletrea la 50/30/20 en décimos (ES y EN); Ritmo conserva su forma con nombre", () => {
    for (const lang of ["es", "en"] as const) {
      const b = tightBook(lang);
      const r = readAdvisor(b, KEY, lang, makeNamer(b.structure, lang), { today: todayDate });
      assert.ok(!/de cada 10|of every 10/.test(r.plan), `en Esencial (${lang}) ningún décimo deletrea la regla: ${r.plan}`);
      assert.ok(lang === "es" ? r.plan.includes("más al colchón que para ti") : r.plan.includes("more to the cushion than for you"),
        "el reparto se dice en orden y en palabras llanas");
      const rr = readAdvisor((() => { const c = structuredClone(b); c.settings.mode = "ritmo"; return c; })(), KEY, lang, makeNamer(b.structure, lang), { today: todayDate });
      assert.ok(lang === "es" ? rr.plan.includes("30% al colchón") : rr.plan.includes("30% to the cushion"),
        "en Ritmo la forma con porcentajes sigue viva — la cura es de Esencial");
    }
  });

  it("BR2-4: la paceNote de Ritmo describe — hechos de hoy, sin día de agotamiento (ES y EN); Completo conserva la proyección", () => {
    const paceBook = (mode: "ritmo" | "completo", lang: "es" | "en", heavy: boolean) => {
      const b = createInitial(lang, "claro");
      b.settings.mode = mode;
      const lines: Line[] = [line({ kind: "income-fixed", concept: "Salario", amountMinor: 2_000_000 })];
      const amt = heavy ? 310_000 : 60_000;
      for (let d = 2; d <= 16; d += 2) lines.push(line({ kind: "expense-variable", concept: `Gasto ${d}`, amountMinor: amt, bookedOn: `2026-11-${String(d).padStart(2, "0")}` } as Partial<Line> & { kind: Line["kind"]; amountMinor: number }));
      b.months[KEY] = { lines };
      return b;
    };
    const heavy = coachOf(paceBook("ritmo", "es", true));
    assert.ok(!/se acaba el día|faltan \d+ días/.test(heavy.paceNote), `Ritmo no anuncia el agotamiento: «${heavy.paceNote}»`);
    assert.ok(heavy.paceNote.includes("al día") && heavy.paceNote.includes("faltan"), "describe el hoy: ritmo, lo que salió y lo que falta");
    const light = coachOf(paceBook("ritmo", "es", false));
    assert.ok(light.paceNote.includes("en 16 días") && light.paceNote.includes("te queda"), `la forma con saldo también es descripción: «${light.paceNote}»`);
    const lightEn = coachOf(paceBook("ritmo", "en", false), "en");
    assert.ok(!/runs out on day/.test(lightEn.paceNote) && lightEn.paceNote.includes("is left"), `EN describe igual: «${lightEn.paceNote}»`);
    const completo = coachOf(paceBook("completo", "es", true));
    assert.ok(/se acaba el día|patrón|aprendiendo/.test(completo.paceNote), "en Completo la proyección (lineal o del Patrón) sigue siendo legal");
  });

  it("BR2-5: el préstamo sin importe modelado no nace como C$0.00 en ninguna superficie", () => {
    const b = baseBook("esencial");
    b.loans = [mkLoan("ln1", "Banco", 9_000_000, dayOf(5))];
    const names = makeNamer(b.structure, "es");
    const due = adviceRules(b, KEY, "es", names, { today: todayDate }).find((x) => x.id === "due");
    assert.ok(due, "la regla due nace");
    assert.ok(due!.num !== "C$0.00" && !due!.kicker.includes("C$0.00"), `ni el titular ni el kicker imprimen el cero inventado: num=«${due!.num}» kicker=«${due!.kicker}»`);
    assert.ok(due!.say.includes("no se conoce el importe"), `la frase declara el importe desconocido: «${due!.say}»`);
    const coach = coachOf(b);
    const loanDue = coach.dues.find((d) => d.id === "ln1");
    assert.ok(loanDue && loanDue.minor === null, "la Agenda recibe el préstamo con minor null — la ventana no se convierte en cero al fundirse");
    // Mezcla: tarjeta con mínimo + el mismo préstamo — el total cuenta la tarjeta y declara el préstamo.
    const b2 = baseBook("esencial");
    b2.cards = [mkCard("c1", "Visa Banco", 800_000, 25_000, 3)];
    b2.loans = [mkLoan("ln1", "Banco", 9_000_000, dayOf(5))];
    const due2 = adviceRules(b2, KEY, "es", makeNamer(b2.structure, "es"), { today: todayDate }).find((x) => x.id === "due");
    assert.equal(due2!.num, "C$250.00", "el titular es la suma de lo que tiene cifra");
    assert.ok(due2!.say.includes("De uno no se conoce el importe"), `y la frase lo declara: «${due2!.say}»`);
    const r2 = readAdvisor(b2, KEY, "es", makeNamer(b2.structure, "es"), { today: todayDate });
    assert.ok(r2.calendarNote.includes("sin importe conocido"), `el calendarNote tampoco presenta la suma parcial como total: «${r2.calendarNote}»`);
    // La fuente: ninguna fusión convierte el null en cero.
    const coachSrc = SRC("./coach.ts");
    assert.ok(!coachSrc.includes("minor: e.amt ?? 0"), "coach.ts no funde la ventana con ?? 0");
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes("d.minor != null"), "la Agenda pinta el importe solo cuando existe");
  });

  it("BR2-6: ante un libro de solo vencidos, ni la Agenda ni el calendarNote afirman el vacío falso", () => {
    const b = baseBook("esencial");
    b.lent = [mkLent("l1", "Ana", 500_000, iso(-10))];
    b.cards = [{ id: "c1", name: "Visa Banco", issuer: "", mark: "", color: "", last4: "1234", currency: "NIO", limitMinor: 2_000_000, dueDay: dayOf(-6), aprBps: 2400, autopay: null, rewards: "", snaps: [{ on: iso(-20), at: `${iso(-20)}T12:00:00.000Z`, balanceMinor: 800_000, minMinor: 25_000, dueOn: iso(-6) }] } as unknown as CreditCard];
    b.loans = [mkLoan("ln1", "Banco", 9_000_000, dayOf(-8))];
    const coach = coachOf(b);
    assert.equal(coach.dues.length, 0, "nada por vencer — el futuro sí está vacío");
    assert.ok(coach.overdueCount >= 3, `pero el pasado existe y el coach lo cuenta: ${coach.overdueCount}`);
    const r = readAdvisor(b, KEY, "es", makeNamer(b.structure, "es"), { today: todayDate });
    assert.ok(!r.calendarNote.includes("Ponles fecha"), `el calendarNote ya no aconseja poner fechas a lo que venció: «${r.calendarNote}»`);
    assert.ok(r.calendarNote.includes("nota de vencidos"), "y remite a la nota que dice la verdad");
    assert.ok(r.overdueNote, "la nota de vencidos dice la verdad en la misma lectura");
    const pano = SRC("../../components/faro/panorama.tsx");
    assert.ok(pano.includes("coach.overdueCount"), "el vacío de la Agenda se decide con el conteo de vencidos, no a ciegas");
  });

});

/* ================= LOS CAMBIOS II (C2-1…C2-3) ================= */

describe("ola2 · el Deshacer se detiene en la frontera del modo (C2-1)", () => {
  const bookWith = (mode: "esencial" | "ritmo" | "completo" | undefined) => {
    const b = createInitial("es", "claro");
    if (mode === undefined) delete (b.settings as { mode?: string }).mode;
    else b.settings.mode = mode;
    return b;
  };
  const setMode = (target: "esencial" | "ritmo" | "completo") => (s: LedgerState) => ({ ...s, settings: { ...s.settings, mode: target } });
  const addLine = (s: LedgerState) => {
    const lines = [...(s.months[KEY]?.lines ?? []), line({ kind: "expense-variable", concept: "Mercado", amountMinor: 10_000 })];
    return { ...s, months: { ...s.months, [KEY]: { lines } } };
  };

  it("bajar por la puerta y deshacer: la edición posterior se deshace, el modo NO vuelve en silencio", () => {
    let s = blankSession(bookWith("completo"));
    s = commit(s, setMode("esencial"), "esencial");
    s = commit(s, addLine, "línea");
    const afterEdit = undo(s);
    assert.equal(modeOf(afterEdit.ledger.settings), "esencial", "deshacer la edición no toca el modo");
    assert.equal((afterEdit.ledger.months[KEY]?.lines ?? []).length, 0, "la edición sí se deshizo");
    const atFrontier = undo(afterEdit);
    assert.equal(atFrontier, afterEdit, "el segundo Deshacer se detiene en la frontera — no restaura la foto de Completo");
    assert.equal(modeOf(atFrontier.ledger.settings), "esencial");
    assert.ok(atFrontier.ledger.audit.some((a) => a.detail === "esencial"),
      "la entrada de Actividad del cambio de modo SOBREVIVE al Deshacer");
  });

  it("subir por la puerta y deshacer: la bajada silenciosa por historia no existe", () => {
    let s = blankSession(bookWith("esencial"));
    s = commit(s, setMode("completo"), "completo");
    const back = undo(s);
    assert.equal(back, s, "deshacer la subida se detiene en la frontera: bajar exige su pantalla, no un toque");
    assert.equal(modeOf(back.ledger.settings), "completo");
  });

  it("el Rehacer tampoco cruza la frontera en ningún sentido", () => {
    const s = { ...blankSession(bookWith("esencial")), future: [bookWith("completo")] };
    assert.equal(redo(s), s, "rehacer hacia otro modo se detiene en la frontera");
    const s2 = { ...blankSession(bookWith("completo")), future: [bookWith("esencial")] };
    assert.equal(redo(s2), s2);
  });

  it("la elección de la puerta inicial tampoco se anula por Deshacer (el corolario)", () => {
    let s = blankSession(bookWith(undefined));
    s = commit(s, setMode("esencial"), "esencial");
    const back = undo(s);
    assert.equal(back, s, "la foto sin modo (Completo por ausencia) queda al otro lado de la frontera");
    assert.equal(modeOf(back.ledger.settings), "esencial");
  });

  it("dentro del mismo modo, Deshacer y Rehacer caminan como siempre", () => {
    let s = blankSession(bookWith("ritmo"));
    s = commit(s, addLine, "línea");
    const back = undo(s);
    assert.equal((back.ledger.months[KEY]?.lines ?? []).length, 0);
    const fwd = redo(back);
    assert.equal((fwd.ledger.months[KEY]?.lines ?? []).length, 1, "el Rehacer del mismo modo sigue vivo");
  });
});

describe("ola2 · la pantalla de impacto confirma la verdad de ahora (C2-2)", () => {
  it("onConfirm recuenta el impacto sobre el libro vivo antes de aplicar", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    const dialog = screens.slice(screens.indexOf("<ModeImpactDialog"));
    // ENMIENDA OLA 3 (Cambios C3-2): el reconteo sigue siendo sobre el
    // libro vivo (la doctrina C2-2 no cambia), pero lleva además la fecha
    // de referencia fijada al abrir — la comparación es contra las mismas
    // premisas, para que la medianoche no se disfrace de cambio del libro.
    assert.ok(dialog.includes("modeImpact(session.ledger, target, lang, modeImpactState.refDay)"), "la confirmación recalcula modeImpact con la sesión actual y la fecha de referencia");
    assert.ok(dialog.includes("refreshed: true"), "si la foto cambió, el diálogo se repone con los conteos frescos y no aplica");
    assert.ok(dialog.includes("fresh.total === 0"), "y si el impacto se evaporó, aplica con el aviso de bajada sin impacto");
    const gate = SRC("../../components/faro/mode-gate.tsx");
    assert.ok(gate.includes("mode.impact.refreshed"), "el diálogo dice que sus conteos son los de ahora");
  });

  it("los atajos globales respetan todo modal local abierto (aria-modal), no solo el confirm propio", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes("document.querySelector('[aria-modal=\"true\"]')"),
      "el manejador global se detiene ante cualquier modal vivo — Mod+Z ya no deshace bajo la pantalla de impacto");
  });
});

describe("ola2 · el modo que llega se anuncia (C2-3)", () => {
  it("apply-remote nombra el modo que aterriza cuando difiere del vigente", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes("mode.arrived.notice"), "la llegada por sincronía avisa con el nombre del modo");
    assert.ok(provider.includes("landedMode !== prevMode"), "y solo cuando el modo cambia de verdad");
  });

  it("las dos restauraciones nombran el modo de la copia en su confirmación", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    const hits = provider.split("mode.restore.names").length - 1;
    assert.ok(hits >= 2, `restoreConflict y askRestore nombran el modo que viene dentro (${hits} usos)`);
    const i18n = SRC("./i18n.ts");
    for (const k of ["mode.arrived.notice", "mode.restore.names", "mode.undo.frontier", "mode.impact.refreshed"]) {
      assert.ok(i18n.split(`"${k}"`).length - 1 >= 2, `la clave ${k} existe en ES y EN`);
    }
  });

  it("el proveedor anuncia la frontera al tocar Deshacer/Rehacer contra ella", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes("mode.undo.frontier"), "la detención en la frontera se dice, no se calla");
  });
});

/* ================= LA CARA II (C-1…C-6 + el cadáver) ================= */

describe("ola2 · el registro deja de mentir (C-1/C-2/C-3/C-5)", () => {
  it("los asientos corregidos dicen el modo que la cara y la ley asentada viven", () => {
    assert.equal(FEATURES["nav.tablet-views"], "esencial", "las vistas son cromo universal de la barra");
    assert.equal(FEATURES["nav.float-window"], "esencial", "la ventana flotante de vistas, igual");
    assert.equal(FEATURES["nav.global-search"], "esencial", "la lupa es ciega al modo (fallo 14)");
    assert.equal(FEATURES["nav.ring"], "esencial", "el anillo camina en todo modo; sus paradas se filtran una a una");
    assert.equal(FEATURES["people.card"], "esencial", "añadir una persona es declarar (criterio asentado)");
    for (const seat of ["archive.restore-lent", "archive.restore-loan", "archive.restore-card", "archive.restore-owe"] as const) {
      assert.equal(FEATURES[seat], "esencial", `${seat}: restaurar entidades propias es existencia (Fo-1)`);
    }
    assert.equal(FEATURES["pres.m11-puertas"], "esencial", "el asiento sigue al dato del módulo y al MAPA asentado");
    const puertas = MODULES.find((m) => m.id === "puertas");
    assert.equal(puertas?.mode, FEATURES["pres.m11-puertas"], "registro y Module.mode por fin dicen lo mismo");
  });

  it("featureForGo ya no declara dormidos los destinos universales de la barra (cerca cruzada)", () => {
    const view = featureForGo({ screen: "top", anchor: "top-view" });
    const search = featureForGo({ screen: "top", anchor: "top-search" });
    assert.ok(view && FEATURES[view] === "esencial", "el salto a las vistas no cae a una explicación falsa");
    assert.ok(search && FEATURES[search] === "esencial", "el salto a la lupa tampoco");
    const shell = SRC("../../components/faro/shell.tsx");
    for (const seat of ["nav.tablet-views", "nav.float-window", "nav.global-search"]) {
      assert.ok(!shell.includes(`has("${seat}")`), `la cara del shell sigue sin puertabar ${seat} — registro y cara de acuerdo`);
    }
  });
});

describe("ola2 · las superficies fuera del sistema entran (C-4/C-6, study.reorder)", () => {
  it("instruments.tsx: la calculadora, su flotante y los papelitos entran por su asiento (fallo 8)", () => {
    const src = SRC("../../components/faro/instruments.tsx");
    assert.ok(src.includes('has("tools.calculator")'), "el lanzador y el panel viven desde Ritmo");
    assert.ok(src.includes('has("tools.calculator-float")'), "la ventana flotante libre es de Completo");
    assert.ok(src.includes('has("tools.slips")'), "la sección de papelitos y su «Guardar» son de Ritmo");
    assert.ok(src.includes("floatOk") && src.includes("canSave"), "el panel recibe sus dos puertas y las honra (sin arrastrar ni expandir bajo Completo)");
  });

  it("cards.tsx: la ficha gana su forma corta de Ritmo y la entera es de Completo (fallo 10)", () => {
    const src = SRC("../../components/faro/cards.tsx");
    assert.ok(src.includes('has("cards.add-full")'), "la forma se decide por el asiento de la ficha entera");
    assert.ok(src.includes("const full = has(\"cards.add-full\")"), "una sola lectura gobierna la forma");
    // La forma corta conserva lo que no pinta: el borrador nace de la tarjeta entera.
    assert.ok(src.includes("draftOf(card, seed)"), "el borrador sigue naciendo de la ficha completa — guardar en Ritmo no amputa campos");
  });

  it("study.reorder tiene por fin una puerta real en su ruta de render (fallo 33)", () => {
    const charts = SRC("../../components/faro/charts.tsx");
    assert.ok(charts.includes('has("study.reorder")'), "el control de reordenar consulta su asiento");
    assert.ok(charts.includes("sorting && canReorder"), "y la lista de ordenación también — sin puerta no nace");
    // El orden guardado se respeta en todo modo: el `placed` no mira el modo.
    assert.ok(!/const placed = useMemo\(\(\) => \{[^}]*has\(/.test(charts), "el orden guardado se consume sin puerta — se respeta en los tres modos");
  });
});

describe("ola2 · cerca estructural: todo componente de cara nombra al sistema de modos o está exento por escrito", () => {
  // EXENTOS, con su razón: (1) cromo puro o presentacional sin superficie
  // propia de modo — card-art, color-pick, finish, focus-host, icons,
  // to-top, ui, manual-text (pinta el texto; el filtro vive en manual.tsx y
  // en los datos de topics), folios-chips (chips de navegación cuya cara
  // madre nombra el sistema); (2) piezas cuya única montura vive tras la
  // puerta de su cara madre, que sí nombra el sistema — la familia de bancos
  // e importación (bank-dock, bank-settings, bank-guides, bank-import,
  // bank-mark, bank-pick, rewards-real, stmt-scan: tras settings.banks /
  // import.bank), book-kit y book-side (el kit de los libros; las caras que
  // lo montan nombran el sistema), selection (cromo de Archivo/Historial),
  // sub-presets (editores dentro del formulario de línea),
  // remit-people y earnings (tarjetas cuyas caras madre — Cobros y Estudio
  // — nombran el sistema y filtran en la fuente), slip-apply (hija de la
  // sección de papelitos, puertabada en instruments.tsx), battery-row (una
  // fila de Ajustes; Ajustes se recompone en screens.tsx); (3) sample-mode:
  // el control de la casa de ejemplo — nombra el sistema de la CASA
  // (samplemode), no el de modos; el modo del escenario se gobierna en
  // presentacion.tsx y samplemode.ts (familia Enseñanza).
  // ENMIENDA OLA 3 (Cara C3-2): remesas.tsx SALE de los exentos — el
  // SendPanel dejó de «cabalgar» el conversor: su campo «Para» guardaba el
  // destinatario (dato de Ritmo) en Esencial porque el panel nunca nombraba
  // el sistema, y la exención de la ola 2 («las caras madre filtran en la
  // fuente») era falsa para esta montura. El panel ahora lee remit.for
  // él mismo, en la pintura y en el camino de guardado.
  const EXEMPT = [
    "bank-dock.tsx", "bank-guides.tsx", "bank-import.tsx", "bank-mark.tsx", "bank-pick.tsx",
    "bank-settings.tsx", "battery-row.tsx", "book-kit.tsx", "book-side.tsx", "card-art.tsx",
    "color-pick.tsx", "earnings.tsx", "finish.tsx", "focus-host.tsx", "folios-chips.tsx",
    "icons.tsx", "manual-text.tsx", "remit-people.tsx", "rewards-real.tsx",
    "sample-mode.tsx", "selection.tsx", "slip-apply.tsx", "stmt-scan.tsx", "sub-presets.tsx",
    "to-top.tsx", "ui.tsx",
  ];
  const NAMES_SYSTEM = /has\("|hasFeature|modeOf|modeReaches|featureForGo|topicMode|bookMode|modeRank|modeImpact|unlockedGroups|settings\.mode|lib\/faro\/mode/;

  it("el conjunto de componentes que no nombran al sistema es exactamente el exento declarado", () => {
    const dir = new URL("../../components/faro/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
    const silent = files.filter((f) => !NAMES_SYSTEM.test(readFileSync(new URL(f, dir), "utf8"))).sort();
    assert.deepEqual(silent, [...EXEMPT].sort(),
      "un componente de cara nació (o creció) fuera del sistema de modos: dale su puerta o declara aquí su exención con su razón — la clase de C-4/C-6 no vuelve en silencio");
  });
});

/* ================= LA ENSEÑANZA II (E2-1/E2-2) ================= */

describe("ola2 · el escenario viste el modo de la persona (E2-1/E2-2)", () => {
  it("el libro de escenario toma el modo del espejo AL NACER, y su sesión no reescribe el espejo", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    // ENMIENDA OLA 3 (E3-1): las dos formas se ensanchan de stageOn() a
    // sealedOn() — el nacimiento vestido y la prohibición de escribir el
    // espejo cubren también a la CASA DE EJEMPLO, que nacía desnuda (su
    // cara efectiva era Completo: índice de 21 módulos para todos) y cuya
    // sesión dejaba «completo» escrito en el espejo al entrar, envenenando
    // toda lección lanzada desde dentro de la casa. La doctrina de la
    // ola 2 queda intacta y gana su segundo libro sellado.
    assert.ok(provider.includes("sealedOn() && !saved && isMode(modeMirror)"),
      "el préstamo ocurre también sin paquete guardado: el libro sellado nace vestido, no en Completo por ausencia");
    assert.ok(provider.includes('if (!sealedOn()) localStorage.setItem("faro-mode"'),
      "ninguna sesión sellada reescribe el espejo faro-mode con su modo");
  });

  it("la vista que el escenario representa en Esencial es la de Esencial (los especímenes de la caminata)", () => {
    const m3 = MODULES.find((m) => m.id === "anotar")!;
    const v3 = moduleView(m3, "esencial");
    // ENMIENDA OLA 3 (E3-2): la vista honesta de Esencial es 13, no 14 —
    // la escena 14 era m3-bote, cuyo ancla (book-pot, vault.pot) vive en
    // Ritmo por el fallo 6 y el conductor la saltaba EN SILENCIO en cada
    // caminata de Esencial: contarla como caminable era la mentira. La
    // escena gana su minMode y la vista dice por fin la verdad.
    assert.equal(v3.scenes.length, 13, "el módulo 3 en Esencial camina 13 escenas, no las 16 de Completo");
    assert.ok(!v3.scenes.some((s) => s.id.includes("import") || s.id.includes("estructura")),
      "ningún pie ajeno: ni la importación ni Estructura existen en la vista de Esencial");
    const m21 = MODULES.find((m) => m.scenes.some((s) => s.id === "m19-debo-h"))!;
    const v21 = moduleView(m21, "esencial");
    assert.ok(v21.scenes.length > 0 && v21.scenes.every((s) => s.id.endsWith("-h") || s.id === "m19-medeben"),
      "el módulo de deudas en Esencial se representa con sus pies de hechos (-h), no con los de gestión");
  });

  it("la reanudación por identidad aterriza en la vista del modo de la persona (E2-2)", () => {
    const modos = MODULES.find((m) => m.id === "modos")!;
    const viewE = moduleView(modos, "esencial");
    const landedE = resumeSceneId(modos, "esencial", { scene: 0, sceneId: "m15-mudos", done: false });
    assert.equal(landedE, "m15-mudos");
    assert.equal(viewE.scenes.findIndex((s) => s.id === landedE) + 1, 5, "kicker 5/8: la escena guardada abre la actuación en su sitio");
    assert.equal(viewE.scenes.length, 8);
    const viewR = moduleView(modos, "ritmo");
    const landedR = resumeSceneId(modos, "ritmo", { scene: 0, sceneId: "m15-impacto", done: false });
    assert.equal(viewR.scenes.findIndex((s) => s.id === landedR) + 1, 4, "kicker 4/10: el inicio del capítulo, en la vista de Ritmo");
    assert.equal(viewR.scenes.length, 10);
  });
});

/* ================= EL GUARDIÁN II (G2-1/G2-2) ================= */

describe("ola2 · la copia de mes nace sin procedencia ni vínculos ciegos (G2-1/G2-2)", () => {
  const bookWith = (lines: Line[]) => {
    const b = createInitial("es", "claro");
    b.months[KEY] = { lines };
    b.months["2026-12"] = { lines: [] };
    return b;
  };

  it("G2-2: la copia de una línea importada nace sin importId, batch ni via — una línea nueva de la persona", () => {
    const imported = line({ kind: "expense-fixed", concept: "Mercado importado", amountMinor: 50_000, recurring: true, importId: "ofx:chk-9:FTID-777", batch: "lot-42", via: "pp-wallet-1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number });
    const { state, count } = copyRecurring(bookWith([imported]), KEY, "2026-12");
    assert.equal(count, 1, "la copia nace — la cura no mata la copia, mata la herencia");
    const copy = state.months["2026-12"]!.lines[0]!;
    assert.equal(copy.importId, undefined, "sin importId: la deduplicación ya no la confunde con el original");
    assert.equal(copy.batch, undefined, "sin batch: el deshacer del lote original no la alcanza");
    assert.equal(copy.via, undefined, "sin via");
    assert.equal(copy.concept, "Mercado importado", "y el resto de la línea es la del usuario, entera");
    assert.notEqual(copy.id, imported.id, "con su id propio, como siempre");
  });

  it("G2-1 (motor): una cuota con vínculo de pago NO se reproduce por la rama ciega; la cuota limpia sí", () => {
    const linked = line({ kind: "subscription", concept: "Abono · Banco", amountMinor: 10_000, loanId: "ln-1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number });
    const clean = line({ kind: "subscription", concept: "Streaming", amountMinor: 1_500 });
    const { state, count } = copyRecurring(bookWith([linked, clean]), KEY, "2026-12");
    assert.equal(count, 1, "solo la cuota limpia se trae");
    assert.equal(state.months["2026-12"]!.lines[0]!.concept, "Streaming", "ningún abono fantasma contra el préstamo");
    // La marca recurring de la persona sigue trayendo lo que ella marcó: el
    // acto deliberado no es la rama ciega.
    const marked = line({ kind: "subscription", concept: "Abono marcado", amountMinor: 10_000, loanId: "ln-1", recurring: true } as Partial<Line> & { kind: Line["kind"]; amountMinor: number });
    assert.equal(copyRecurring(bookWith([marked]), KEY, "2026-12").count, 1, "con recurring explícito, la copia es decisión de la persona");
  });

  it("G2-1 (cara): el conmutador de Central se niega en la raíz y consulta el modo", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('kind === "subscription" && (line.loanId || line.lentId || line.cardId)'),
      "rekind se niega a volver cuota una línea con vínculo de pago, en cualquier modo");
    assert.ok(screens.includes('kind === "subscription" && !has("subs.cuota")'),
      "y se niega donde Cuotas duerme (Esencial): el verbo de gestión no existe allí");
    assert.ok(screens.includes("const toSubs = !linked && has(\"subs.cuota\")"),
      "el botón «Cuotas» ni se pinta cuando la conversión está prohibida — un botón muerto es peor que ninguno");
  });

  it("la fusión de la ola 1 no se tocó: line-form sigue esparciendo sobre la existente", () => {
    const form = SRC("../../components/faro/line-form.tsx");
    assert.ok(form.includes("existing ? { ...existing, ...fresh } : fresh"),
      "la raíz que aguantó todo sigue byte a byte como la dejó la cura de la ola 1");
  });
});

describe("ola2 · el Asesor sin disfraces (BR2-7)", () => {
  it("BR2-7: la nota de vencidos nombra tres, declara los que calla y suma los cinco", () => {
    const b = baseBook("esencial");
    b.lent = [
      mkLent("l1", "Ana", 100_000, iso(-12)), mkLent("l2", "Luis", 200_000, iso(-11)),
      mkLent("l3", "Mara", 300_000, iso(-10)), mkLent("l4", "José", 400_000, iso(-9)),
      mkLent("l5", "Inés", 500_000, iso(-8)),
    ];
    const r = readAdvisor(b, KEY, "es", makeNamer(b.structure, "es"), { today: todayDate });
    assert.ok(r.overdueNote!.includes("y 2 más"), `el recorte se declara: «${r.overdueNote}»`);
    assert.ok(r.overdueNote!.includes("En total C$15,000.00"), "y el total es el de los cinco nombrados y callados");
  });
});
