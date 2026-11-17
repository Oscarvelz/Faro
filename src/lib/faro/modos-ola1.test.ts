/**
 * FARO — OLA 1 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * Cada espécimen de los cinco informes de la ola (OLA1-CARA, OLA1-CAMBIOS,
 * OLA1-ASESOR, OLA1-SALIDAS, OLA1-GUARDIAN) convertido en cerca que pasa:
 * lo que el prejuicio rompió no puede volver en silencio. Donde la rotura
 * vive en un componente (la forma, la hoja de escaneo), la cerca es de
 * fuente — el mismo estilo de las cercas de grep de modos293/294 — y el
 * banco con fotos de la campaña la acompaña; donde vive en un motor, la
 * cerca es funcional, sobre libros de banco calculados a mano.
 *
 * La cerca estructural (familia 2): el registro contra la cara. El registro
 * es el censo hecho código y gran parte se consume por tablas espejo
 * (modos296 las cerca contra el registro) o por puertas gruesas de
 * pantalla; lo que la ola condenó fue el asiento SIN consumidor o puertado
 * por otro. El trinquete de abajo congela el conjunto exacto de asientos
 * R/C sin consumidor literal fuera del registro: un asiento nuevo que nazca
 * sin consumidor rompe la cerca, y un consumidor que se borre también —
 * el conjunto solo puede encogerse, asiento a asiento, con su razón.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { overallProgress, resumeSceneId, type Module, type Scene } from "./guion.ts";
import { FEATURES, hasFeature, modeImpact, pocketModeOf, unlockedGroups, type FeatureId, type Mode } from "./mode.ts";
import { seedRetiro } from "./retiro.ts";
import { adviceRules } from "./rules.ts";
import { withSampleArc } from "./sample.ts";
import type { CreditCard, LedgerState, Lent, Line, Loan, Person } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const TODAY = "2026-11-16";

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

const cloneAs = (book: LedgerState, mode: Mode): LedgerState => {
  const c = structuredClone(book);
  c.settings.mode = mode;
  return c;
};

/* ================= EL GUARDIÁN (G-1…G-4, G-6) ================= */

describe("ola1 · el Guardián: guardar fusiona, no reemplaza", () => {
  const form = SRC("../../components/faro/line-form.tsx");

  it("save() esparce `existing` sobre el literal fresco (la raíz, en los tres modos)", () => {
    assert.ok(form.includes("existing ? { ...existing, ...fresh } : fresh"),
      "la línea guardada nace de la que ya existía: lo que la forma no pinta (loanId, lentId, cardId, importId, batch, via, rest, archived) sobrevive a la edición");
    assert.ok(!/const line: Line = \{/.test(form), "el literal fresco a secas — la construcción que borraba — no existe");
  });

  it("lo gestionado y borrado a propósito no resucita por la esparcida", () => {
    for (const pin of ["delete line.personId", "delete line.occasionId", "delete line.to", "delete line.sourceId", "delete line.rc", "delete line.fund", "delete line.fundHost"]) {
      assert.ok(form.includes(pin), `la esparcida no resucita lo que la persona quitó: falta ${pin}`);
    }
  });

  it("G-6: sin gesto de icono no se estampa el glifo heredado; sin fechas no se estampan vacías", () => {
    assert.ok(form.includes("iconPicked"), "la forma recuerda si la persona tocó el icono");
    assert.ok(form.includes("line.icon = existing.icon"), "sin gesto, el icono guardado es el que la línea ya traía");
    assert.ok(form.includes('delete line.bookedOn') && form.includes('delete line.startedOn'), "bookedOn/startedOn vacíos no se inventan donde no había nada");
  });

  it("las puertas de line-form son de su familia: ningún asiento de libro puertaba un bloque del editor (B2)", () => {
    const gates = [...new Set([...form.matchAll(/has\("([a-z0-9.-]+)"\)/g)].map((m) => m[1]!))].sort();
    // books.shops / books.subs solo responden preguntas DE LIBRO (qué libros
    // ofrece el editor y si un borrador de ese libro está despierto); los
    // bloques del editor se puertan por asientos del editor o de su familia.
    const allowed = (id: string) => id.startsWith("editor.") || id.startsWith("subs.") || id.startsWith("nature.") || id === "books.shops" || id === "books.subs";
    assert.ok(gates.every(allowed), `puertas fuera de familia en line-form: ${gates.filter((g) => !allowed(g)).join(", ")}`);
    assert.ok(form.includes('has("editor.shop-fields")'), "la compra declara tienda y categoría por SU asiento (fallo 9)");
    assert.ok(form.includes('has("editor.shop-fine")'), "proveedor, código y URL esperan a Ritmo por su asiento");
  });

  it("B3: la cadencia básica se declara en Esencial por su propio asiento (fallo 5)", () => {
    assert.ok(form.includes('has("subs.cadence-basic")'), "el bloque de repetición se abre con la cadencia básica, no solo con la maquinaria");
    assert.ok(hasFeature("esencial", "subs.cadence-basic"));
  });
});

/* ================= LA CARA (B1, B4, B7) ================= */

describe("ola1 · la cara obedece al registro", () => {
  it("B1: los verbos de los períodos apartados viven en Esencial (fallo 15), cada uno con su asiento", () => {
    for (const f of ["archive.restore-span", "archive.delete-span", "archive.delete-lines"] as FeatureId[]) {
      assert.equal(FEATURES[f], "esencial", `${f} es existencia (Fo-1), no gestión`);
    }
    const arch = SRC("../../components/faro/archivo.tsx");
    for (const f of ["archive.restore-span", "archive.delete-span", "archive.delete-lines"]) {
      assert.ok(arch.includes(`has("${f}")`), `archivo.tsx consume ${f} por su propio nombre`);
    }
  });

  it("B4: la hoja de escaneo obedece al modo (fallo 16)", () => {
    assert.equal(FEATURES["scan.receipt-full-review"], "ritmo", "la revisión completa — destino y cadencia — es de Ritmo");
    assert.equal(FEATURES["scan.receipt-rewards-row"], "completo");
    const scan = SRC("../../components/faro/receipt-scan.tsx");
    assert.ok(scan.includes('has("scan.receipt-full-review")'), "la hoja pregunta por la revisión completa");
    assert.ok(scan.includes('has("scan.receipt-rewards-row")'), "la fila de recompensas se puertaba por su asiento: ni se pinta ni se guarda fuera de Completo");
    assert.ok(scan.includes("is-static"), "en Esencial el destino se lee como texto, no se elige");
  });

  it("B7: «Meses de colchón» deja de ser huérfano — su asiento es Completo, como todos sus lectores", () => {
    assert.equal(FEATURES["settings.cushion-months"], "completo");
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('has("settings.cushion-months")'), "la fila aj-months se puertaba por su asiento");
  });
});

/* ================= CAMBIOS: la pantalla de impacto y la fila muda dicen la verdad ================= */

/** Libro de banco: dos tarjetas (una archivada), tres personas (una archivada),
 *  una cuota, una serie declarada aparte y una importación. */
function impactBook(mode: Mode | null): LedgerState {
  const book = createInitial("es", "claro");
  if (mode) book.settings.mode = mode;
  const catAny = book.structure.categories.find((c) => c.role !== "savings")!.id;
  const sub = line({ kind: "subscription", amountMinor: 1500, categoryId: catAny, recurring: true, cadence: "monthly", concept: "Cuota" });
  const meta = line({ kind: "expense-fixed", amountMinor: 5000, categoryId: "f-ahorro", subId: "f.ahorro.meta", fund: "aparte", concept: "Viaje" });
  book.months[KEY] = { lines: [sub, meta] };
  const card = (id: string, archived?: boolean): CreditCard => ({
    id, name: id, issuer: "", mark: "", color: "", last4: "1234", currency: "NIO",
    limitMinor: null, dueDay: 1, aprBps: 0, autopay: null, rewards: "", snaps: [], ...(archived ? { archived: true } : {}),
  } as CreditCard);
  book.cards = [card("cc-viva"), card("cc-archivada", true)];
  book.people = [
    { id: "p-1", name: "Ana", birthday: "", dates: [], note: "" },
    { id: "p-2", name: "Luis", birthday: "", dates: [], note: "" },
    { id: "p-3", name: "Mara", birthday: "", dates: [], note: "", archived: true },
  ] as Person[];
  book.imports = { sources: [{ id: "bs-1", bank: "Banco", kind: "checking", rates: {} }], rules: [], maps: {} };
  return book;
}

describe("ola1 · el impacto cuenta la verdad (B-1, B-2)", () => {
  it("B-1: lo archivado no cuenta como dormido — ni tarjetas ni personas", () => {
    const imp = modeImpact(impactBook(null), "esencial", "es");
    assert.equal(imp.groups.find((g) => g.id === "tarjetas")?.count, 1, "la tarjeta archivada no se anuncia como dormida");
    assert.equal(imp.groups.find((g) => g.id === "personas")?.count, 2, "la persona archivada no se anuncia como dormida");
  });

  it("B-2: bajando de Ritmo a Esencial no se anuncia como recién dormido lo que ya dormía en Ritmo", () => {
    const imp = modeImpact(impactBook("ritmo"), "esencial", "es");
    const ids = imp.groups.map((g) => g.id);
    assert.ok(ids.includes("cuotas"), "las cuotas (Ritmo) sí se duermen al bajar a Esencial");
    assert.ok(!ids.includes("naturalezas"), "las naturalezas (Completo) ya dormían en Ritmo: no se anuncian otra vez");
    assert.ok(!ids.includes("importacion"), "la importación (Completo) ya dormía en Ritmo");
    // Y desde Completo sí se anuncia todo:
    const impC = modeImpact(impactBook("completo"), "esencial", "es");
    assert.ok(impC.groups.map((g) => g.id).includes("naturalezas"));
  });

  it("los textos del impacto ya no mienten: se deja de GESTIONAR, nada «deja de verse»", () => {
    const i18n = SRC("./i18n.ts");
    const impactLines = i18n.split("\n").filter((l) => l.includes('"mode.impact.')).join("\n");
    assert.ok(impactLines.includes("que en {name} no se gestiona"), "el intro dice gestión, no desaparición (los hechos se siguen viendo)");
    assert.ok(!/dejará de mostrarse|will stop showing|stop showing/.test(impactLines), "ninguna clave del impacto promete desaparición");
    assert.ok(impactLines.includes("al volver a subir, todo está como lo dejaste"), "el keeper promete el viaje redondo, no una pérdida");
  });
});

describe("ola1 · subir nombra lo que ESTE libro destapa (B-4)", () => {
  it("un libro sin cuotas no oye «cuotas» al subir; uno con cuotas, sí", () => {
    const empty = createInitial("es", "claro");
    assert.equal(unlockedGroups(empty, "esencial", "ritmo").length, 0, "sin objeto, el aviso no nombra nada");
    const withSub = impactBook(null);
    assert.ok(unlockedGroups(withSub, "esencial", "ritmo").map((g) => g.id).includes("cuotas"));
    assert.ok(!unlockedGroups(withSub, "esencial", "ritmo").map((g) => g.id).includes("importacion"),
      "la importación es de Completo: no se destapa subiendo a Ritmo");
    assert.ok(unlockedGroups(withSub, "ritmo", "completo").map((g) => g.id).includes("importacion"));
  });
});

describe("ola1 · la fila muda nombra el modo verdadero (B-5)", () => {
  it("pocketModeOf: cada bolsillo dice en qué MODO se gestiona; el segmento llano de Ahorros nunca es mudo", () => {
    assert.equal(pocketModeOf("f.ahorro.retiro"), "ritmo", "el Retiro se gestiona en Ritmo — la fila ya no dice «Completo» a ciegas");
    assert.equal(pocketModeOf("f.ahorro.meta"), "ritmo");
    assert.equal(pocketModeOf("f.ahorro.emergencia"), "ritmo");
    assert.equal(pocketModeOf("f.ahorro.libre"), null, "un fondo en el bolsillo de Ahorros se gestiona en Esencial: no es mudo");
    assert.equal(FEATURES["vault.retiro"], "ritmo");
    const i18n = SRC("./i18n.ts");
    assert.ok(i18n.includes('"mode.mute.title": "Fondos en otro modo"'), "el título ya no nombra un modo equivocado");
    assert.ok(i18n.includes("se gestionan en {name}"), "el texto recibe el modo verdadero por nombre");
  });
});

/* ================= LA CURA PRIMERICA SIN RÓTULOS (B-3 / G-7) ================= */

describe("ola1 · Primerica: apartados, no rótulos", () => {
  const seedBook = (seed: Partial<Line>): LedgerState => {
    const book = createInitial("es", "claro");
    const at = { catId: "f-ahorro", subId: "f.ahorro.retiro" };
    const s = line({
      kind: "expense-fixed", amountMinor: 0, concept: "Primerica", icon: "brand:primerica",
      categoryId: at.catId, subId: at.subId, balanceMinor: null, ...seed,
    });
    book.months[KEY] = { lines: [s] };
    return book;
  };
  const bolsillos = (book: LedgerState) => modeImpact(book, "esencial", "es").groups.find((g) => g.id === "bolsillos")?.count ?? 0;

  it("la semilla sembrada (con su marca) se renombra y re-iconiza libre: NO se instituye", () => {
    // El camino real de la cura: seedRetiro siembra con marca de nacimiento;
    // desde ahí, ningún rótulo la instituye — solo un acto de dinero.
    const seeded = seedRetiro(seedBook({}), KEY);
    const renamed: LedgerState = {
      ...seeded,
      months: { [KEY]: { lines: (seeded.months[KEY]?.lines ?? []).map((l) => ({ ...l, concept: "Mi retiro", icon: "Star" })) } },
    };
    assert.equal(bolsillos(renamed), 0, "dos gestos de aspecto no crean un bolsillo dormido");
    const marked = seedBook({ concept: "Fondo 2035", icon: "Rocket", preset: "primerica" });
    assert.equal(bolsillos(marked), 0);
  });

  it("LÍMITE DECLARADO: la semilla heredada renombrada ANTES de toda siembra es indetectable y cuenta", () => {
    // Sin marca y sin etiqueta, ninguna lectura puede distinguir la semilla
    // renombrada de una línea propia — por eso seedRetiro cura el libro al
    // primer pase (la cerca de abajo). Este pin fija el límite: si un día
    // cambia, se declara, no se descubre.
    const book = seedBook({ concept: "Mi retiro", icon: "Star" });
    assert.equal(bolsillos(book), 1);
  });

  it("un acto de dinero SÍ la instituye: la serie cuenta como bolsillo", () => {
    const book = seedBook({ amountMinor: 25000 });
    assert.equal(bolsillos(book), 1, "un apartado con monto es un bolsillo de la persona");
  });

  it("seedRetiro cura el libro heredado: la semilla intacta recibe su marca y no se duplica", () => {
    const book = seedBook({});
    const seeded = seedRetiro(book, KEY);
    const seeds = (seeded.months[KEY]?.lines ?? []).filter((l) => l.subId === "f.ahorro.retiro");
    assert.equal(seeds.length, 1, "no nace una segunda semilla");
    assert.equal(seeds[0]!.preset, "primerica", "la semilla heredada queda marcada: renombrarla ya no la instituirá");
  });
});

/* ================= EL ASESOR SIN DISFRACES (BR-1, BR-2, BR-3) ================= */

/** El libro calculado a mano de modos298, reducido: salario, un gasto, la
 *  tarjeta con saldo y mínimo (vence el 28), un préstamo y un prestado. */
function handBook(mode: Mode | null): LedgerState {
  const book = createInitial("es", "claro");
  if (mode) book.settings.mode = mode;
  const catAny = book.structure.categories.find((c) => c.role !== "savings" && c.role !== "debt")!.id;
  book.months[KEY] = { lines: [
    line({ kind: "income-fixed", amountMinor: 3_000_000, categoryId: catAny, concept: "Salario" }),
    line({ kind: "expense-variable", amountMinor: 600_000, categoryId: catAny, concept: "Mercado" }),
  ] };
  book.cards = [{
    id: "card-1", name: "Tarjeta Prueba", issuer: "", mark: "", color: "", last4: "1234",
    currency: "NIO", limitMinor: 1_000_000, dueDay: 28, aprBps: 0, autopay: null, rewards: "",
    snaps: [{ on: "2026-11-05", at: "2026-11-05T10:00:00", balanceMinor: 400_000, minMinor: 40_000, src: "manual" }],
  } as CreditCard];
  book.loans = [{ id: "loan-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 500_000, currency: "NIO", aprBps: 0, takenOn: "2026-10-01", dueDay: 20, book: "fixed", note: "" } as Loan];
  book.lent = [{ id: "lent-1", person: "Ana", kind: "plain", amountMinor: 200_000, currency: "NIO", aprBps: 0, startedOn: "2026-11-01", dueOn: "2026-11-22", note: "" } as Lent];
  return book;
}

const coachOf = (book: LedgerState, lang: "es" | "en" = "es") =>
  readCoach(book, KEY, lang, makeNamer(book.structure, lang), new Date(`${TODAY}T12:00:00`));

describe("ola1 · el Asesor sin disfraces", () => {
  it("BR-1: el glosario se filtra en la fuente — en Esencial la regla 50/30/20 no existe, ni deletreada", () => {
    const es = coachOf(handBook("esencial"));
    assert.ok(!es.glossary.some((g) => /50\/30\/20/.test(g.term)), "el término no nace en Esencial");
    const allText = JSON.stringify(es);
    assert.ok(!/de cada 100|of every 100/.test(allText), "la proporción deletreada no se cuela por ningún texto del coach en Esencial");
    const ri = coachOf(handBook("ritmo"));
    assert.ok(ri.glossary.some((g) => /50\/30\/20/.test(g.term)), "en Ritmo la regla vive con su nombre (fallo 26)");
  });

  it("BR-2: la insignia de la torre habla en dinero bajo el asiento pano.hundred", () => {
    const adv2 = SRC("../../components/faro/advisor2.tsx");
    assert.ok(adv2.includes('has("pano.hundred")'), "la proporción de la torre se puertaba por su asiento");
    assert.ok(adv2.includes("came in"), "bajo ese asiento, la insignia dice el dinero que entró");
  });

  it("BR-3: en Ritmo la regla lineal DESCRIBE — ni saldo de cierre ni fecha de agotamiento, tampoco de teaser", () => {
    const book = withSampleArc(createInitial("es", "claro")).ledger;
    book.settings.mode = "ritmo";
    const key = Object.keys(book.months).filter((k) => (book.months[k]?.lines.length ?? 0) > 0).sort().at(-1)!;
    const names = makeNamer(book.structure, "es");
    const pace = adviceRules(book, key, "es", names, { today: new Date() }).find((r) => r.id === "pace");
    assert.ok(pace, "la casa de muestra hace hablar a la regla pace en Ritmo");
    assert.ok(!/cierras el mes con|se acaba el|close the month with|runs out on/.test(pace.say), `proyección en la frase: ${pace.say}`);
    assert.ok(!/días$|days$/.test(pace.num.trim()), `la cifra-teaser ya no es «días que dura»: ${pace.num}`);
    assert.ok(/llevas .* en \d+ días/.test(pace.say), `la forma es descripción de hoy: ${pace.say}`);
  });
});

/* ================= EL ASESOR NO CALLA NI MIENTE (BR-5, BR-6, SOS-1) ================= */

describe("ola1 · el Asesor dice la verdad y no calla", () => {
  it("BR-5: la Agenda conoce las tarjetas y los préstamos con fecha — no afirma un vacío falso", () => {
    const book = handBook("esencial");
    book.months[KEY] = { lines: [
      line({ kind: "income-fixed", amountMinor: 3_000_000, categoryId: book.structure.categories[0]!.id, concept: "Salario" }),
    ] };
    const coach = coachOf(book);
    assert.ok(coach.dues.some((d) => d.id === "card-1"), "la tarjeta que vence el 28 está en la Agenda");
    assert.ok(coach.dues.some((d) => d.id === "loan-1"), "el préstamo con día 20 está en la Agenda");
  });

  it("BR-6: lo vencido se dice en la Reading — la cara del Asesor que el teléfono sí monta, en todo modo", () => {
    const book = handBook("esencial");
    book.lent = [{ id: "lent-9", person: "Ana", kind: "plain", amountMinor: 500_000, currency: "NIO", aprBps: 0, startedOn: "2026-10-01", dueOn: "2026-11-06", note: "" } as Lent];
    const names = makeNamer(book.structure, "es");
    for (const m of ["esencial", "ritmo", "completo"] as Mode[]) {
      const r = readAdvisor(cloneAs(book, m), KEY, "es", names, { today: new Date(`${TODAY}T12:00:00`) });
      assert.ok(r.overdueNote, `en ${m} lo vencido se dice`);
      assert.ok(r.overdueNote!.includes("Ana") && r.overdueNote!.includes("hace 10 días"), `nombre, dinero y días: ${r.overdueNote}`);
    }
    const clean = readAdvisor(handBook("completo"), KEY, "es", names, { today: new Date(`${TODAY}T12:00:00`) });
    assert.equal(clean.overdueNote, null, "sin vencidos, silencio — la nota no nace");
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('data-anchor="advice-overdue"') && screens.includes("reading.overdueNote"),
      "la nota se pinta en su franja propia de la pila del Asesor — fuera del detalle de la torre, que es de Ritmo y en Esencial no se pinta");
  });

  it("SOS-1 (adjudicado): un prestado solo, sin fecha y sin pagos, no dispara la sugerencia — el uso sí", () => {
    const lone = createInitial("es", "claro");
    lone.settings.mode = "esencial";
    const catAny = lone.structure.categories.find((c) => c.role !== "savings")!.id;
    lone.months[KEY] = { lines: [line({ kind: "income-fixed", amountMinor: 3_000_000, categoryId: catAny, concept: "Salario" })] };
    lone.lent = [{ id: "lent-1", person: "Ana", kind: "plain", amountMinor: 15_000, currency: "NIO", aprBps: 0, startedOn: "2026-11-01", dueOn: "", note: "" } as Lent];
    assert.equal(coachOf(lone).upgradeHint, null,
      "C$150 prestados a alguien, sin fecha ni pagos: un HECHO que Esencial ya habla, no una gestión que pida Ritmo");
    const dated = structuredClone(lone);
    dated.lent = [{ ...dated.lent![0]!, dueOn: "2026-12-01" }];
    assert.equal(coachOf(dated).upgradeHint?.reason, "debt", "con fecha que seguir, el uso pide Ritmo");
    // ENMIENDA OLA 2 (BR2-2): este pin afirmaba que DOS prestados sin fecha ni
    // pagos disparan por conteo desnudo. El espécimen S3 de la ola 2 (dos
    // prestados de C$50, sin fechas) condenó esa señal: el conteo es
    // existencia, no uso — la ley escrita pide uso. El pin se enmienda con su
    // razón: dos hechos sin uso callan, como uno. La cerca completa del
    // gatillo nuevo (con tarjetas) vive en modos-ola2.test.ts.
    const two = structuredClone(lone);
    two.lent = [...two.lent!, { id: "lent-2", person: "Luis", kind: "plain", amountMinor: 20_000, currency: "NIO", aprBps: 0, startedOn: "2026-11-02", dueOn: "", note: "" } as Lent];
    assert.equal(coachOf(two).upgradeHint, null, "dos prestados sin fecha ni pagos: existencia, no uso — la ola 2 enmienda este pin");
  });
});

/* ================= LOS SALTOS QUE ATERRIZAN (SALIDAS-1, SALIDAS-2) ================= */

describe("ola1 · los saltos aterrizan", () => {
  it("SALIDAS-1: la caída abre una explicación que EXISTE — el llamador declara la viva", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    assert.ok(provider.includes("explain?: string"), "goTopic acepta la explicación declarada de la caída");
    assert.ok(provider.includes("openManual(explain ?? id)"), "la caída abre la explicación declarada, no un tema filtrado");
    const manual = SRC("../../components/faro/manual.tsx");
    assert.ok(manual.includes("!topicAlive(tp) ? entryId : undefined"), "el Manual declara su entrada viva cuando el tema destino duerme");
    assert.ok(manual.includes("currentDormant"), "y si aun así un tema dormido queda abierto, el Manual vuelve a su índice");
    const hint = SRC("../../components/faro/hint.tsx");
    assert.ok(hint.includes("data.topicMode(tp)"), "la burbuja declara su propio tema vivo con la misma regla");
  });

  it("SALIDAS-2: el hit de compra de la búsqueda cae al Historial cuando Tiendas duerme, como su hermano del calendario", () => {
    const shell = SRC("../../components/faro/shell.tsx");
    const hits = shell.slice(shell.indexOf("const renderBookHits"), shell.indexOf("const [exportOpen"));
    assert.ok(hits.includes('hit.section === "shops" && !has("books.shops") ? "historial"'), "la caída vive en el propio hit de libros");
  });
});

/* ================= «SIGUE DONDE IBAS» TRADUCE POR IDENTIDAD (G-5) ================= */

describe("ola1 · la reanudación traduce el índice por identidad (G-5)", () => {
  const scene = (id: string, chapter: string, minMode?: Mode): Scene =>
    ({ id, chapter, ...(minMode ? { minMode } : {}), anchors: [], keys: [], steps: [] }) as Scene;
  const mod: Module = {
    id: "mx", n: 99, title: ["Módulo X", "Module X"], promise: ["", ""], ready: true,
    chapters: [{ id: "a", title: ["A", "A"] }, { id: "b", title: ["B", "B"] }, { id: "c", title: ["C", "C"] }],
    scenes: [scene("s1", "a"), scene("s2", "b", "completo"), scene("s3", "b"), scene("s4", "c", "ritmo")],
  };

  it("guardado en Completo sobre s3 (índice 2), reanudado en Esencial: el capítulo de s3, no otra escena", () => {
    // La vista de Esencial es [s1, s3]: el índice crudo 2 ni siquiera existe.
    assert.equal(resumeSceneId(mod, "esencial", { scene: 2, sceneId: "s3", done: false }), "s3");
    assert.equal(resumeSceneId(mod, "ritmo", { scene: 2, sceneId: "s3", done: false }), "s3");
  });

  it("si el capítulo entero duerme en el modo nuevo, se reanuda en la primera escena visible después", () => {
    // s4 vive en el capítulo c, que en Esencial no tiene escenas: después de s4 no hay nada → el principio.
    assert.equal(resumeSceneId(mod, "esencial", { scene: 3, sceneId: "s4", done: false }), "s1");
    // En Ritmo el capítulo c sí vive:
    assert.equal(resumeSceneId(mod, "ritmo", { scene: 3, sceneId: "s4", done: false }), "s4");
  });

  it("los guardados viejos (sin identidad) se leen por índice, como siempre", () => {
    assert.equal(resumeSceneId(mod, "completo", { scene: 1, done: false }), "s2");
  });

  it("el avance general también traduce: la fracción se mide en el modo que mira", () => {
    const prog = overallProgress([mod], { mx: { scene: 2, sceneId: "s3", done: false } }, "esencial");
    // En Esencial hay 2 escenas visibles y 1 va antes de s3: la fracción es 1/2, no 2/2.
    assert.equal(prog.pct, 50);
  });

  it("el guardado escribe la identidad junto al índice", () => {
    const pres = SRC("../../components/faro/presentacion.tsx");
    assert.ok(pres.includes("sceneId: r.mod.scenes[r.sceneIdx]?.id"), "saveProgress guarda sceneId");
    assert.ok(pres.includes("resumeSceneId(mod, mode, saved)"), "la ficha reanuda por identidad");
  });
});

/* ================= EL REGISTRO CONTRA LA CARA: el trinquete ================= */

describe("ola1 · el registro contra la cara — ningún asiento R/C pierde a su consumidor en silencio", () => {
  it("el conjunto de asientos sin consumidor literal fuera del registro es exactamente el declarado", () => {
    const walk = (dir: URL, acc: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const child = new URL(name, dir);
        if (statSync(child).isDirectory()) { if (name !== "node_modules" && name !== "dist") walk(new URL(`${name}/`, dir), acc); }
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) acc.push(child.pathname);
      }
      return acc;
    };
    const files = walk(new URL("../../", import.meta.url));
    const modeSrc = SRC("./mode.ts");
    const regStart = modeSrc.indexOf("export const FEATURES");
    const modeRest = modeSrc.slice(0, regStart) + modeSrc.slice(modeSrc.indexOf("};", regStart) + 2);
    const corpus = files.map((f) => (f.endsWith("lib/faro/mode.ts") ? modeRest : readFileSync(f, "utf8"))).join("\n");
    const orphans = Object.entries(FEATURES)
      .filter(([, min]) => min !== "esencial")
      .map(([id]) => id)
      .filter((id) => !corpus.includes(`"${id}"`))
      .sort();
    assert.deepEqual(orphans, [...SIN_CONSUMIDOR_LITERAL].sort(),
      "un asiento R/C cambió de estado: si ganó un consumidor, quítalo de la lista con su razón; si lo perdió (o nació sin él), la clase de la ola 1 volvió — dale su consumidor o declara aquí su canal");
  });
});

/** LOS SIN CONSUMIDOR LITERAL (foto del trinquete, 2026-11-17): asientos R/C
 *  que hoy se consumen por tablas espejo (advisor.*, rule.*, area.* — cercadas
 *  contra el registro en modos296), por datos declarados (manual.* por
 *  CHAPTER_MODE y topic.mode; pres.* por Module.mode en guion.ts; widget.*
 *  por el constructor de la foto) o por puertas gruesas de pantalla ya
 *  cercadas por las suites de comportamiento de cada familia. La lista solo
 *  puede encogerse.
 *  ENMIENDAS OLA 2 (con su razón, como la cerca manda): salen
 *  archive.restore-{card,lent,loan,owe}, nav.float-window, nav.ring y
 *  pres.m11-puertas porque el registro dejó de fallarlos R/C — la Ola 2
 *  corrigió las mentiras del registro (C-1/C-2/C-5: la cara y la ley
 *  asentada los viven en Esencial) y ya no son asientos R/C. Salen
 *  cards.add-full y tools.calculator-float porque GANARON consumidor
 *  literal: la ficha de tarjeta y la hoja de instrumentos entraron al
 *  sistema de modos (C-6/C-4).
 *  ENMIENDAS OLA 3 (con su razón, como la cerca manda): salen
 *  pano.runway-patron — la PaceCard lo lee por fin en literal (BR3-1: la
 *  puerta que mantiene el horizonte de agotamiento fuera de Ritmo) — y
 *  salen scan.card-capture, cards.capture-add, tools.converter-send y remit.for
 *  porque GANARON consumidor literal — la Cara III los encontró declarados
 *  sin cablear (las puertas «Foto o captura» de Tarjetas, el «Enviar a» del
 *  conversor y el campo «Para» del panel de envío pintaban y guardaban por
 *  debajo de su modo) y la cura les dio su `has(...)` en el componente.
 *  ENTRA advisor.kicker: su único consumidor literal era el mapeo de
 *  featureForGo que mandaba el salto de la franja de oportunidad de
 *  Central a su asiento — un mapeo falso (la franja es el resto declarado,
 *  de Esencial; la cura C3-4 de la Cara lo retiró). El asiento queda
 *  consumido por su canal verdadero, el de sus hermanas advisor.*: la
 *  frase del Asesor que interpreta la cifra en el texto de consejo
 *  (buildInsights), en superficies de Completo.
 *  ENMIENDAS OLA 4 (con su razón, como la cerca manda): sale
 *  tools.converter-chips-admin porque GANÓ consumidor literal — la Cara IV
 *  lo encontró declarado sin cablear desde la ola 1 (O4-C1: el engranaje
 *  del conversor abría entero el panel de administración de monedas en
 *  Esencial y en Ritmo) y la cura le dio su `has(...)` en instruments.tsx:
 *  el botón del engranaje y la montura del panel viven solo en Completo. */
const SIN_CONSUMIDOR_LITERAL: readonly string[] = [
  "accounts.panel", "accounts.pin-panel", "advisor.credit-note", "advisor.daily-note",
  "advisor.diagnosis", "advisor.income-stability", "advisor.income-stability-floor", "advisor.levers-month",
  "advisor.kicker", "advisor.misclass-note", "advisor.month-tone", "advisor.not-habit-note", "advisor.plan-short",
  "advisor.remit-note", "advisor.start-route", "advisor.step-close-gap", "advisor.step-cushion",
  "advisor.step-debts", "advisor.step-set-aside", "advisor.step-subs", "advisor.step-wants-30",
  "advisor.subs-note", "advisor.three-parts", "advisor.top5-rich", "advisor.trend-note",
  "advisor.undestined-note", "advisor.verdict-sub", "archive.hide-one", "archive.hide-period",
  "archive.span-card", "area.debt-free", "area.debt-stuck", "area.emergency-months",
  "area.income-drift", "area.loans-path", "area.meta-path", "area.owed-track",
  "area.plain-phrase", "area.remit-up", "area.retiro-paused", "area.rules-split",
  "area.setaside", "awake.destination-projection", "awake.goals-horizon", "awake.recalc-notices",
  "awake.savings-photo", "awake.stale-plan", "awake.undestined", "books.bookkit",
  "books.bubble-editor", "books.cloud", "books.multiselect", "books.shop-catalog-gear",
  "cards.add", "cards.edit-delete",
  "cards.factory", "cards.ficha", "cards.group", "cards.pay",
  "cards.rewards-reconcile", "cards.rewards-redeem", "cards.update", "cards.usage-advice",
  "central.debt-light", "cobros.quick-list", "cobros.see-all", "cobros.timeline",
  "debt.line-balance", "debt.total", "editor.active-toggle", "editor.icon-color",
  "editor.nature", "editor.paid-with", "editor.picker-manage", "import.guides",
  "ins.beneficiaries", "ins.change-notice", "ins.not-money", "ins.piece",
  "ins.premium-line", "lent.bulk-edit", "lent.history", "lent.no-interest",
  "loans.add", "loans.archive", "loans.bulk-edit", "loans.due-day",
  "loans.pay", "loans.pay-split", "loans.payoff-est-rate", "loans.payoff-params",
  "manual.ch10-ajustes", "manual.ch11-importar", "manual.ch3-cobros", "manual.ch5-ahorros",
  "manual.ch7-estudio", "manual.ch8-asesor", "manual.ch9-cambio", "manual.topic-apartar",
  "manual.topic-card-fine", "manual.topic-export", "manual.topic-float", "manual.topic-retiro",
  "nature.band-migration", "nature.class-cuenta", "nature.cushion", "nature.declare-series",
  "nature.free-guard", "nature.overcommit", "nav.books-subs-entry",
  "nav.scale-topbar", "pano.closes", "pano.health-help",
  "pano.pillar-cushion", "pano.pillar-debt", "pano.pillar-save", "pano.pillar-spend",
  "pano.pillar-stability", "patron.history-rules", "patron.learning",
  "patron.linear-pace", "patron.model-rules", "patron.month-rules", "patron.sayings",
  "people.add-contacts", "people.add-manual", "people.dates", "people.delete",
  "people.gift", "people.import-vcf", "people.share-in", "people.totals",
  "pres.m10-estructura", "pres.m12-pregunta", "pres.m13-totales",
  "pres.m14-colchon", "pres.m3-balance-chapter", "pres.m4-cambio", "pres.m6-ahorros",
  "pres.m7-estadisticas", "pres.m8-asesor", "pres.m9-folios-rest", "pres.my-scenes",
  "remit.manage", "remit.send", "rule.category",
  "rule.cushion", "rule.floor", "rule.goal", "rule.insurance",
  "rule.outlier", "rule.overcommit", "rule.pace", "rule.recurring",
  "scan.retirement-stmt", "settings.bank-rewards-real", "settings.pin-in-card",
  "settings.widget-pins", "subs.brand-detect", "subs.brand-icon-admin", "subs.cadence-machinery",
  "subs.dues-window", "subs.own-chips", "tools.calculator-use",
  "tools.slip-to-category", "tools.slips-bulk",
  "tools.slips-reuse", "vault.delete", "vault.factory-restore", "vault.free",
  "vault.meta-plan", "vault.order-pockets", "vault.pin-block", "vault.retiro-fields",
  "vault.retiro-sheet", "vault.savings-goal-pct", "widget.face-dues", "widget.face-flow",
  "widget.face-pagos", "widget.face-pins", "widget.face-savings", "widget.face-scale",
  "widget.face-top5-compare", "widget.habit-homes", "widget.home-suggestion", "widget.note-with-home",
];
