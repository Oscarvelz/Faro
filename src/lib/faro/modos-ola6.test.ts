/**
 * FARO — OLA 6 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * Cada espécimen de los cinco informes de la ola 6 (OLA6-CARA, OLA6-ASESOR,
 * OLA6-CAMBIOS, OLA6-ENSENANZA, OLA6-GUARDIAN — el Guardián no trajo breaks)
 * convertido en cerca. La enfermedad de la ola: LA CARA EXCEDE AL REGISTRO
 * (puertas que el registro manda y la cara no cableó), EL TEMA VIVE EN OTRO
 * MODO QUE SU FUNCIÓN (los sospechosos congelados del §10, juzgados) y LA
 * PALABRA QUE SE ROMPE AL COMPONERSE (la confesión que el toast de llegada
 * reemplaza, el aviso que solo se pinta en Central, el texto prestado que
 * promete un Deshacer quemado). Donde la rotura vive en un componente, la
 * cerca es de fuente y el banco CDP de la ronda la acompaña (shots-cura6/).
 * Los libros son especímenes fijados a mano sobre el 2026-11-16; jamás
 * producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { MODULES, sceneInMode } from "./guion.ts";
import { translate } from "./i18n.ts";
import { FEATURES, type Mode } from "./mode.ts";
import { findTopic, topicMode, MANUAL_TOPICS } from "../manual/topics.ts";
import type { CreditCard, LedgerState, Lent, Line, Loan } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const TODAY = new Date(2026, 10, 16, 12);
const iso = (off: number) => {
  const d = new Date(2026, 10, 16 + off, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayOf = (off: number) => new Date(2026, 10, 16 + off, 12).getDate();

let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (mode: Mode, months: Record<string, Line[]>, lang: "es" | "en" = "es"): LedgerState => {
  const b = createInitial(lang, "claro");
  b.settings.mode = mode;
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const coachAt = (b: LedgerState, key: string, lang: "es" | "en" = "es") =>
  readCoach(b, key, lang, makeNamer(b.structure, lang), TODAY);
const income = (key: string) => line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }, key);
const gasto = (key: string, minor: number) => line({ kind: "expense-variable", concept: "Mercado", amountMinor: minor }, key);
const apartado = (key: string, minor: number) =>
  line({ kind: "expense-fixed", concept: "Apartado a Meta", amountMinor: minor, categoryId: "f-ahorro", subId: "f.ahorro.meta" }, key);

const mkCard = (id: string, name: string, balance: number, min: number | null, dueOff: number): CreditCard => ({
  id, name, issuer: "", mark: "", color: "", last4: "1234", currency: "NIO", limitMinor: 2_000_000,
  dueDay: dayOf(dueOff), aprBps: 2400, autopay: null, rewards: "",
  snaps: [{ on: iso(-6), at: `${iso(-6)}T12:00:00.000Z`, balanceMinor: balance, ...(min !== null ? { minMinor: min } : {}) }],
} as unknown as CreditCard);
const mkLoan = (id: string, lender: string, amount: number, dueDay: number | undefined, takenOff = -60): Loan => ({
  id, lender, who: "entity", kind: "plain", amountMinor: amount, currency: "NIO", aprBps: 0,
  takenOn: iso(takenOff), ...(dueDay ? { dueDay } : {}), book: "fixed", note: "",
} as unknown as Loan);
const mkLent = (id: string, person: string, amount: number, dueOn: string): Lent => ({
  id, person, kind: "plain", amountMinor: amount, currency: "NIO", aprBps: 0, startedOn: iso(-40), dueOn, note: "",
} as unknown as Lent);
const hintBook = (mode: Mode, lang: "es" | "en" = "es"): LedgerState => {
  const b = createInitial(lang, "claro");
  b.settings.mode = mode;
  b.months[KEY] = { lines: [line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }, KEY)] };
  return b;
};

/* ═══════════ §A · CARA-1: LA PUERTA MANDA — «Pagado con» y «Activo» ═══════════ */

describe("ola6 · CARA-1: el editor obedece los asientos editor.paid-with / editor.active-toggle", () => {
  const form = SRC("../../components/faro/line-form.tsx");
  it("el campo «Pagado con» vive dentro de su puerta", () => {
    const at = form.indexOf('data-f="pay"');
    assert.ok(at > 0, "el campo existe");
    assert.ok(form.slice(Math.max(0, at - 200), at).includes('has("editor.paid-with")'),
      "la puerta de Ritmo envuelve el campo: en Esencial ni se pinta ni se toca");
  });
  it("los DOS interruptores «Activo» viven dentro de su puerta", () => {
    const gates = form.split('has("editor.active-toggle")').length - 1;
    assert.ok(gates >= 2, `la suscripción en línea y la fila de interruptores, puertados (halladas ${gates})`);
  });
});

/* ═══════════ §B · CARA-2/3/4/8/9 + leer-estado: EL TEMA SIGUE A SU FUNCIÓN ═══════════ */

describe("ola6 · los temas re-asentados viven en el modo de su función", () => {
  const SEATS: [string, Mode, string][] = [
    ["f-pagado-con", "ritmo", "editor.paid-with"],
    ["f-activo", "ritmo", "editor.active-toggle"],
    ["f-recurrente", "ritmo", "editor.recurrent-toggle"],
    ["f-saldo-deuda", "ritmo", "editor.debt-balance"],
    ["f-tasa-anual", "ritmo", "editor.debt-balance"],
    ["f-lista", "ritmo", "cobros.quick-add"],
    ["cifras-asesor", "ritmo", "advisor.month-detail"],
    ["tc-ganado", "completo", "scan.card-capture"],
    ["tc-promo", "completo", "cards.add-full"],
    ["leer-estado", "completo", "scan.retirement-stmt"],
  ];
  for (const [id, mode, feature] of SEATS) {
    it(`${id}: el tema vive en ${mode}, el modo de ${feature}`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `${id} existe`);
      assert.equal(topicMode(tp), mode, `${id} declara el modo de su función`);
      assert.equal(FEATURES[feature as keyof typeof FEATURES], mode, `${feature} es el asiento que lo gobierna`);
    });
  }
  it("los conteos por modo tras el re-asiento: 123 · 105 · 129 sobre 357 (exactos)", () => {
    // ENMIENDA OLA 7 (CARA-1/2/3: el tema sigue al CAMPO): f-primer-pago,
    // f-frecuencia, f-tienda-elegir y f-cat-elegir R→E; f-proveedor,
    // f-codigo y f-enlace R→C. La distribución de la ola 6 (113 · 114 ·
    // 127) se mueve a 117 · 107 · 130; la valla vive en
    // modos-ola7.test.ts §A y la enmienda gemela en modos299.test.ts.
    // ENMIENDA OLA 9 (los asientos fantasma): cuenta-movimiento y
    // f-cuenta-monto R→E (accounts.move); f-retiro-acumulado C→R
    // (vault.retiro); tiendas E→R (books.shops). La distribución se
    // mueve a 118 · 107 · 129; el censo de consumidores vive en
    // modos-ola9.test.ts §A.
    // ENMIENDA 1.3.318 (palabra de Oscar, 2026-11-18 20:11): el plan es
    // esencial — nav.calendar bajó a Esencial y sus dos temas lo siguen
    // (calendario y feriados R→E). La distribución se mueve a
    // 120 · 105 · 129.
    // ENMIENDA CAPTURA OLA 1: nace captura-mesa en Esencial (capítulo
    // libros). La distribución se mueve a 121 · 105 · 129 sobre 355.
    // ENMIENDA CAPTURA OLA 2 (1.3.340): nace captura-texto en Esencial
    // (capítulo libros, función capture.text). La distribución se mueve
    // a 122 · 105 · 129 sobre 356.
    // ENMIENDA CAPTURA OLA 3 (1.3.342): nace captura-lista en Esencial
    // (capítulo libros, función capture.list). La distribución se mueve
    // a 123 · 105 · 129 sobre 357.
    // ENMIENDA CAPTURA OLA 4 (1.3.344): nace moneda-invitada en Esencial
    // (modo declarado en el tema; su función es settings.guest-currency).
    // La distribución se mueve a 124 · 105 · 129 sobre 358.
    // ENMIENDA CAPTURA OLA 5A (1.3.345): nace preguntar-asesor en Esencial
    // (modo declarado en el tema; su función es advisor.ask).
    // La distribución se mueve a 125 · 105 · 129 sobre 359.
    // ENMIENDA NOVEDADES (1.3.346): nace novedades en Esencial (modo
    // declarado en el tema; su función es settings.news).
    // La distribución se mueve a 126 · 105 · 129 sobre 360.
    // ENMIENDA OLA 6 (1.3.356): nace avisos-pagos en Esencial (modo
    // declarado en el tema; su función es settings.due-alerts).
    // La distribución se mueve a 127 · 105 · 129 sobre 361.
    // ENMIENDA LISTA-PLAN (1.3.357): nace lista-plan en Ritmo (modo
    // declarado en el tema; su función es capture.plan — planear es
    // administrar, fallo de Oscar). La distribución se mueve a
    // 127 · 106 · 129 sobre 362.
    // ENMIENDA LISTA DE ESPERA (1.3.360): nace lista-espera en Esencial
    // (modo declarado en el tema, capítulo del Asesor; su función es
    // advisor.waitlist — anotar un deseo es declarar, fallo de Oscar).
    // La distribución se mueve a 128 · 106 · 129 sobre 363.
    // ENMIENDA COMPARTIR (1.3.362): nace compartir en Esencial (modo
    // declarado en el tema; su función es inbox.link — recibir y
    // declarar, como su puerta). La distribución se mueve a
    // 129 · 106 · 129 sobre 364.
    // ENMIENDA PIEZA 0 (1.3.363): nace nombre en Esencial (su función es
    // account.name — corregir el propio nombre es esencial, precedente
    // de los renombres). La distribución se mueve a
    // 130 · 106 · 129 sobre 365.
    const count = (m: Mode) => MANUAL_TOPICS.filter((t) => topicMode(t) === m).length;
    assert.equal(MANUAL_TOPICS.length, 365);
    assert.equal(count("esencial"), 130);
    assert.equal(count("ritmo"), 106);
    assert.equal(count("completo"), 129);
  });
});

/* ═══════════ §C · CARA-5: EL PUENTE TAMBIÉN DESDE LA BURBUJA tip DORMIDA ═══════════ */

describe("ola6 · CARA-5: el mecanismo del puente — la explicación del tema dormido se alcanza", () => {
  it("hint.tsx tiende el puente cuando el tema duerme, sea manual o tip", () => {
    const hint = SRC("../../components/faro/hint.tsx");
    assert.ok(hint.includes('entry.depth === "manual" || topicSleeps'),
      "«Más en el manual →» nace también para el tema tip dormido: su explicación es alcanzable");
  });
  it("el Manual pinta la entrada dormida como explicación sin mirar su depth", () => {
    const manual = SRC("../../components/faro/manual.tsx");
    assert.ok(manual.includes("mn-entry-dormant"), "la caída con explicación existe para todo tema dormido");
  });
});

/* ═══════════ §D · CARA-6: LA PROSA DE RITMO DICE SOLO LO QUE RITMO MUESTRA ═══════════ */

describe("ola6 · CARA-6: tc-saldo, tc-limite y tc-otros ya no enseñan la revisión de capturas", () => {
  for (const id of ["tc-saldo", "tc-limite", "tc-otros"]) {
    it(`${id}: ni su qué ni su resumen nombran la captura en ningún idioma`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `${id} existe`);
      const prose = [...(tp.what ?? []), ...(tp.sum ?? [])].join(" ");
      assert.ok(!/captura|screenshot/i.test(prose), `${id} habla de la hoja que Ritmo sí muestra, no de la revisión de Completo`);
    });
  }
  it("tc-saldo dice lo que la hoja dice: del saldo salen el disponible y el mínimo", () => {
    const tp = findTopic("tc-saldo");
    assert.ok(tp?.what?.[0]?.includes("pago mínimo"), "la prosa nueva nombra hechos de la hoja");
  });
});

/* ═══════════ §E · CARA-7 ≡ E6-1: CANJEAR ES DE COMPLETO — CARA Y LECCIONES ═══════════ */

describe("ola6 · CARA-7: «Canjear» obedece su asiento cards.rewards-redeem (Completo)", () => {
  it("el botón de la hoja vive dentro de su puerta", () => {
    const cards = SRC("../../components/faro/cards.tsx");
    const at = cards.indexOf('data-anchor="card-redeem"');
    assert.ok(at > 0, "el botón existe");
    assert.ok(cards.slice(Math.max(0, at - 700), at).includes('has("cards.rewards-redeem")'),
      "sin la puerta de Completo el botón no nace: la hoja muestra el hecho, no la gestión");
  });
  it("las lecciones concuerdan: en Ritmo ninguna escena nombra Canjear; en Completo la variante -c lo enseña", () => {
    const sceneById = (id: string) => MODULES.flatMap((m) => m.scenes).find((s) => s.id === id);
    for (const base of ["m3-tarjetas", "m19-tarjeta"]) {
      const s = sceneById(base);
      assert.ok(s, `${base} existe`);
      assert.equal(sceneInMode(s, "ritmo"), true, `${base} corre en Ritmo`);
      assert.equal(sceneInMode(s, "completo"), false, `${base} no corre en Completo: allí corre su variante`);
      assert.ok(!JSON.stringify(s.steps).includes("Canjear"), `${base} en Ritmo no nombra la función dormida`);
      const c = sceneById(`${base}-c`);
      assert.ok(c, `${base}-c existe: la lección de Completo no se pierde`);
      assert.equal(sceneInMode(c!, "completo"), true, `${base}-c corre en Completo`);
      assert.equal(sceneInMode(c!, "ritmo"), false, `${base}-c no corre en Ritmo`);
      assert.ok(JSON.stringify(c!.steps).includes("Canjear"), `${base}-c enseña Canjear donde Canjear vive`);
    }
  });
});

/* ═══════════ §H · CARA-10: EL ESCANEO DE RETIRO OBEDECE SU ASIENTO ═══════════ */

describe("ola6 · CARA-10: StmtScan vive dentro de scan.retirement-stmt (Completo)", () => {
  it("la montura del bolsillo Retiro está puertada", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    const at = screens.indexOf("<StmtScan");
    assert.ok(at > 0, "la montura existe");
    assert.ok(screens.slice(Math.max(0, at - 120), at).includes('has("scan.retirement-stmt")'),
      "en Ritmo la fila del escaneo no nace: ni el botón, ni su (?), ni su cola");
  });
});

/* ═══════════ §J · BR6-1: LA NOTA SIN COBERTURA DISTINGUE ESTADO Y DIRECCIÓN ═══════════ */

describe("ola6 · BR6-1: sin cobertura, la nota dice qué hay anotado y en qué dirección", () => {
  const LEGACY = "Anota ingresos y gastos para ver tu ritmo.";
  it("el mes vacío de siempre conserva su frase byte a byte", () => {
    const b = book("esencial", { [KEY]: [] });
    assert.equal(coachAt(b, KEY).paceNote, LEGACY);
  });
  it("T1e · futuro con solo el salario: el ingreso está, falta el gasto", () => {
    const b = book("esencial", { "2026-12": [income("2026-12")] });
    const note = coachAt(b, "2026-12").paceNote;
    assert.notEqual(note, LEGACY, "no habla de un libro vacío que no está vacío");
    assert.equal(note, "Ya anotaste el ingreso de este mes; cuando anotes gastos verás su ritmo.");
  });
  it("presente con solo el ingreso: pide solo el gasto", () => {
    const b = book("esencial", { [KEY]: [income(KEY)] });
    assert.equal(coachAt(b, KEY).paceNote, "Ya anotaste el ingreso de este mes; anota gastos para ver tu ritmo.");
  });
  it("pasado con solo el ingreso: lo dice en pasado, sin prometer un ritmo invisible", () => {
    const b = book("esencial", { "2026-10": [income("2026-10")] });
    assert.equal(coachAt(b, "2026-10").paceNote, "Anotaste el ingreso de este mes, pero ningún gasto: no hay ritmo que ver.");
  });
  it("T1f · octubre cerrado con gasto y sin ingreso: la salida se nombra con su cifra", () => {
    const b = book("esencial", { "2026-10": [gasto("2026-10", 1_500_000)] });
    const note = coachAt(b, "2026-10").paceNote;
    assert.notEqual(note, LEGACY);
    assert.equal(note, "Salió C$15,000.00 en este mes, pero no hay ingreso anotado: no hay ritmo que ver.");
  });
  it("T1i · el mes en curso con gasto y sin ingreso: pide solo el ingreso", () => {
    const b = book("esencial", { [KEY]: [gasto(KEY, 1_500_000)] });
    assert.equal(coachAt(b, KEY).paceNote, "Ya salió C$15,000.00 este mes; anota el ingreso para ver tu ritmo.");
  });
  it("T1g · futuro con solo gasto: lo anotado se nombra, en futuro", () => {
    const b = book("esencial", { "2026-12": [gasto("2026-12", 1_500_000)] });
    assert.equal(coachAt(b, "2026-12").paceNote, "Ya anotaste C$15,000.00 para este mes; anota el ingreso para ver su ritmo.");
  });
  it("T1h · futuro con solo lo apartado: lo apartado también es salida anotada", () => {
    const b = book("esencial", { "2026-12": [apartado("2026-12", 1_500_000)] });
    assert.equal(coachAt(b, "2026-12").paceNote, "Ya anotaste C$15,000.00 para este mes; anota el ingreso para ver su ritmo.");
  });
  it("la misma verdad corre en Ritmo (ritmoNote delega en la misma rama)", () => {
    const b = book("ritmo", { [KEY]: [gasto(KEY, 1_500_000)] });
    assert.equal(coachAt(b, KEY).paceNote, "Ya salió C$15,000.00 este mes; anota el ingreso para ver tu ritmo.");
  });
  it("EN · el mes en curso con gasto y sin ingreso, en inglés", () => {
    const b = book("esencial", { [KEY]: [gasto(KEY, 1_500_000)] }, "en");
    assert.equal(coachAt(b, KEY, "en").paceNote, "C$15,000.00 has gone out this month; record the income to see your pace.");
  });
});

/* ═══════════ §K · BR6-2: LA FRASE DEL GATILLO NO LLAMA DEUDA A UN PRESTADO ═══════════ */

describe("ola6 · BR6-2: la frase dice cobros cuando el libro es de cobros (el disparo no se toca)", () => {
  it("Esencial, un solo Me deben con fecha cercana: salta (debt:1) y dice «Te deben»", () => {
    const b = hintBook("esencial");
    b.lent = [mkLent("l1", "Ana", 8_000_000, iso(7))];
    const hint = coachAt(b, KEY).upgradeHint;
    assert.ok(hint, "el disparo adjudicado sigue saltando ante el uso de un prestado");
    assert.equal(hint.reason, "debt");
    assert.equal(hint.sig, "debt:1", "razón y firma intactas: solo cambia la frase");
    assert.equal(hint.text, "Te deben con saldo. En Esencial ves sus hechos; en Ritmo los sigues de cerca.");
  });
  it("EN · el mismo libro en inglés: «You are owed», no «You have debts»", () => {
    const b = hintBook("esencial", "en");
    b.lent = [mkLent("l1", "Ana", 8_000_000, iso(7))];
    const hint = coachAt(b, KEY, "en").upgradeHint;
    assert.equal(hint?.text, "You are owed money with a balance. In Essential you see their facts; in Rhythm you follow them closely.");
  });
  it("Esencial, deuda propia con uso: la frase de siempre, intacta", () => {
    const b = hintBook("esencial");
    b.loans = [mkLoan("ln1", "Banco", 20_000_000, undefined)];
    b.months[KEY]!.lines.push(line({ kind: "expense-fixed", concept: "Cuota banco", amountMinor: 500_000, loanId: "ln1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number }, KEY));
    const hint = coachAt(b, KEY).upgradeHint;
    assert.equal(hint?.text, "Tienes deudas con saldo. En Esencial ves sus hechos; en Ritmo las sigues de cerca.");
  });
  it("Ritmo, libro de solo cobros con uso: ningún plan para salir de deudas que no hay", () => {
    const b = hintBook("ritmo");
    b.lent = [mkLent("l1", "Ana", 8_000_000, iso(7))];
    const hint = coachAt(b, KEY).upgradeHint;
    assert.ok(hint === null || (!hint.text.includes("salir de ellas") && hint.reason !== "plan"),
      "la oferta de Completo para deudas no tiene objeto en un libro de cobros: silencio o verdad, nunca la frase falsa");
  });
  it("Ritmo, libro mixto (tarjeta con pagos + un prestado): el plan sigue hablando de deudas, que las hay", () => {
    const b = hintBook("ritmo");
    b.cards = [mkCard("c1", "Visa Banco", 800_000, 25_000, 10)];
    b.lent = [mkLent("l1", "Ana", 8_000_000, iso(7))];
    b.months[KEY]!.lines.push(line({ kind: "expense-fixed", concept: "Pago tarjeta", amountMinor: 100_000, cardId: "c1" } as Partial<Line> & { kind: Line["kind"]; amountMinor: number }, KEY));
    const hint = coachAt(b, KEY).upgradeHint;
    assert.equal(hint?.reason, "plan");
    assert.equal(hint?.text, "Tienes deudas con saldo. En Ritmo las sigues; el plan para salir de ellas vive en Completo.");
  });
});

/* ═══════════ §L · C6-1: LA CONFESIÓN SOBREVIVE A LA COMPOSICIÓN ═══════════ */

describe("ola6 · C6-1: apartMissed viaja dentro del toast de llegada y el banner no miente", () => {
  const provider = SRC("../../components/faro/provider.tsx");
  it("la puerta de pestaña pasa la confesión a la adopción, que compone un solo toast", () => {
    assert.ok(/adoptStoredPack\(missed/.test(provider), "surfaceTabConflict entrega la confesión a adoptStoredPack");
    const adopt = provider.slice(provider.indexOf("function adoptStoredPack"), provider.indexOf("function adoptStoredPack") + 2400);
    assert.ok(adopt.includes("missed"), "la adopción compone con la confesión, no la pisa");
    assert.ok(adopt.includes("mode.arrived.tab"), "la llegada sigue nombrándose en el mismo toast");
  });
  it("cuando se intentó y no se pudo, el banner viejo cae", () => {
    const door = provider.slice(provider.indexOf("function surfaceTabConflict"), provider.indexOf("function surfaceTabConflict") + 3400);
    assert.ok(door.includes("setTabBanner(false)"), "dentro de la puerta de pestaña: tras un intento blocked, el banner no sigue afirmando la retención vieja");
  });
  it("la puerta de sync compone igual: la confesión blocked y la llegada en un solo toast", () => {
    const remote = provider.slice(provider.indexOf("const applyRemote"), provider.indexOf("const applyRemote") + 3400);
    assert.ok(remote.includes("apartMissed"), "la confesión existe en la puerta de sync");
    assert.ok(remote.includes("missed"), "y se compone con la llegada en vez de ser reemplazada por ella");
  });
});

/* ═══════════ §M · C6-2: EL AVISO SE ANUNCIA DONDE LA PERSONA ESTÁ PARADA ═══════════ */

describe("ola6 · C6-2: ui.notice se pinta en el cromo global, no solo en Central", () => {
  it("el shell pinta el aviso junto a los banners globales", () => {
    const shell = SRC("../../components/faro/shell.tsx");
    assert.ok(shell.includes("ui.notice"), "el paro de Deshacer se anuncia también desde Ajustes");
  });
  it("Desk ya no lo pinta en exclusiva (sin duplicarlo en Central)", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(!screens.includes('{ui.notice ? <p className="mt-2 text-sm">{ui.notice}</p> : null}'),
      "la pintura exclusiva de Central se retira: el cromo la cubre");
  });
});

/* ═══════════ §N/O · C6-3 Y OBS-C6-2: RESTAURAR DICE LA VERDAD ═══════════ */

describe("ola6 · C6-3: restaurar tiene su propio texto, y dice que no se puede deshacer", () => {
  it("la clave pack.restoreWarn existe en los dos idiomas y dice la verdad", () => {
    assert.notEqual(translate("es", "pack.restoreWarn"), "pack.restoreWarn", "la clave existe en español");
    assert.notEqual(translate("en", "pack.restoreWarn"), "pack.restoreWarn", "la clave existe en inglés");
    assert.ok(translate("es", "pack.restoreWarn").includes("no se puede deshacer"));
    assert.ok(translate("en", "pack.restoreWarn").includes("cannot be undone"));
  });
  it("restoreConflict usa su texto y ya no toma prestado el de borrar", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    const at = provider.indexOf("restoreConflict: () => {");
    const win = provider.slice(at, at + 2600);
    assert.ok(win.includes("pack.restoreWarn"), "la confirmación de restaurar habla de restaurar");
    assert.ok(!win.includes('t("delete.warn")'), "delete.warn promete un Deshacer que este camino quema: fuera de aquí");
  });
  it("OBS-C6-2: tras restaurar, la oferta de Copias relee las DOS ranuras", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    const at = provider.indexOf("restoreConflict: () => {");
    const win = provider.slice(at, at + 3000);
    assert.ok(/setHasConflict\(Boolean\(localStorage\.getItem\(conflictKey\(userId\)\) \|\| localStorage\.getItem\(tabConflictKey\(userId\)\)\)\)/.test(win),
      "como el arranque: si la ranura .tab aún guarda una copia, la oferta sigue viva sin recargar");
  });
});
