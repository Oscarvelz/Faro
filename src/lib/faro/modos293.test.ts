/**
 * FARO — «Los tres modos», etapa 1 (Esencial · Ritmo · Completo).
 *
 * La etapa 1 no recompone ninguna cara: nace el DATO (Settings.mode), el lector
 * (modeOf), el selector universal de Ajustes, la pantalla de impacto y la
 * pantalla inicial de elección. Lo que cercan estas pruebas:
 *
 *  - Ausente = Completo: un libro sin el campo se lee Completo, y un valor
 *    ilegible también (la lectura desconfía, como isLedgerDeep manda).
 *  - El viaje redondo: el modo sobrevive a guardar/recargar (el JSON del pack)
 *    y a la copia de seguridad (el blob que vault.ts produce), porque vive
 *    dentro del ledger — sin fontanería nueva.
 *  - La pantalla de impacto cuenta DE VERDAD: cada grupo dormido se cuenta
 *    contra un libro rico sintético, y un libro vacío da impacto cero (sin
 *    objeto no hay pantalla: principio 5).
 *  - Solo dos manos escriben settings.mode: el selector (screens.tsx) y la
 *    puerta del proveedor (provider.tsx, que incluye la pantalla inicial y el
 *    préstamo a los libros sellados). La cerca recorre src entero.
 *  - El espejo faro-mode es llave COMPARTIDA de aparato (no se namespacea en
 *    modo ejemplo/escenario): sin eso, un libro sellado no podría vestir el
 *    modo de la persona (D-2).
 *  - lock.ts no se tocó: su md5 es el de siempre.
 *  - Paridad i18n exacta de las claves nuevas y el tema del Manual sembrado
 *    con su go (fold «modo», anchor «aj-modo»).
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, it } from "node:test";
import { createInitial, isLedgerDeep, withSeguroDeVida } from "./defaults.ts";
import { isDataKey } from "./samplemode.ts";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import { queryWords, searchTopics } from "../manual/search.ts";
import { DORMANT_GROUPS, isMode, modeImpact, modeOf, unlockedGroups } from "./mode.ts";
import { seedRetiro } from "./retiro.ts";
import type { LedgerState, Line } from "./types.ts";
import { backupBlob } from "../../spa/vault.ts";

const KEY = "2026-11";
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

/** Un libro rico: cada grupo dormido tiene algo real que contar. */
function richBook(): LedgerState {
  const base = withSeguroDeVida(createInitial("es", "claro")).ledger;
  const insItems = base.structure.catalog.map((i) => (i.kind === "ins" ? { ...i, ins: { amt: 12000, cur: "USD" as const, src: "", start: "2026-01-01", note: "" } } : i));
  const lines: Line[] = [
    line({ id: "sub-1a", seriesId: "sub-1", kind: "subscription", concept: "Streaming", amountMinor: 1500, categoryId: "v-ocio", subId: "v.ocio.stream" }),
    line({ id: "sub-1b", seriesId: "sub-1", kind: "subscription", concept: "Streaming", amountMinor: 1500, categoryId: "v-ocio", subId: "v.ocio.stream" }),
    line({ id: "sub-2a", seriesId: "sub-2", kind: "subscription", concept: "Nube", amountMinor: 900, categoryId: "v-ocio", subId: "v.ocio.nube" }),
    line({ id: "meta-1", seriesId: "meta-1", kind: "expense-fixed", concept: "Viaje", amountMinor: 5000, categoryId: "f-ahorro", subId: "f.ahorro.meta", fund: "aparte" }),
    line({ id: "ret-1", seriesId: "ret-1", kind: "expense-fixed", concept: "Retiro", amountMinor: 7000, categoryId: "f-ahorro", subId: "f.ahorro.retiro" }),
  ];
  return {
    ...base,
    structure: { ...base.structure, catalog: insItems },
    months: { [KEY]: { lines } },
    loans: [
      { id: "ln-1", lender: "Banco", who: "entity", kind: "plain", amountMinor: 100000, currency: "USD", aprBps: 0, takenOn: "2026-01-01", book: "fixed", note: "" },
      { id: "ln-2", lender: "Banco", who: "entity", kind: "plain", amountMinor: 50000, currency: "USD", aprBps: 0, takenOn: "2025-01-01", book: "fixed", note: "", archived: true },
    ],
    lent: [
      { id: "lt-1", person: "Ana", kind: "plain", amountMinor: 20000, currency: "USD", aprBps: 0, startedOn: "2026-01-01", dueOn: "2026-12-01", note: "" },
      { id: "lt-2", person: "Luis", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-02-01", dueOn: "2026-12-01", note: "" },
    ],
    cards: [
      { id: "cc-1", name: "Azul", issuer: "", mark: "", color: "", last4: "1234", currency: "USD", limitMinor: null, dueDay: 1, aprBps: 0, autopay: null, rewards: "", snaps: [] },
      { id: "cc-2", name: "Gris", issuer: "", mark: "", color: "", last4: "9876", currency: "USD", limitMinor: null, dueDay: 15, aprBps: 0, autopay: null, rewards: "", snaps: [] },
    ],
    people: [
      { id: "p-1", name: "Ana", birthday: "", dates: [], note: "" },
      { id: "p-2", name: "Luis", birthday: "", dates: [], note: "" },
      { id: "p-3", name: "Mara", birthday: "", dates: [], note: "" },
    ],
    remitPeople: [{ id: "rp-1", name: "Casa" }],
    restingSpans: [{ id: "rs-1", from: "2026-03", to: "2026-05", hiddenAt: 1, lineIds: [] }],
    imports: { sources: [{ id: "bs-1", bank: "Banco", kind: "checking", rates: {} }], rules: [], maps: {} },
  };
}

const groupCount = (book: LedgerState, target: "esencial" | "ritmo" | "completo", id: string): number =>
  modeImpact(book, target, "es").groups.find((g) => g.id === id)?.count ?? 0;

describe("tres modos, etapa 1 — el dato y su lectura", () => {
  it("ausente = completo; cada valor se lee a sí mismo; lo ilegible cae a completo", () => {
    const base = createInitial("es", "claro");
    assert.equal(base.settings.mode, undefined, "un libro nace sin el campo: la pantalla inicial es quien lo escribe");
    assert.equal(modeOf(base.settings), "completo");
    for (const m of ["esencial", "ritmo", "completo"] as const) {
      assert.equal(modeOf({ ...base.settings, mode: m }), m);
    }
    assert.equal(modeOf({ ...base.settings, mode: "mixto" as never }), "completo", "un valor que no es un modo no se lee como modo");
    assert.ok(isMode("ritmo") && !isMode("mixto") && !isMode(undefined));
  });

  it("el viaje redondo: pack (guardar/recargar) y copia de seguridad conservan el modo", async () => {
    for (const m of ["esencial", "ritmo", "completo"] as const) {
      const book: LedgerState = { ...createInitial("es", "claro"), settings: { ...createInitial("es", "claro").settings, mode: m } };
      const revived = JSON.parse(JSON.stringify(book)) as LedgerState;
      assert.ok(isLedgerDeep(revived), "el libro con modo sigue pasando la guarda profunda");
      assert.equal(modeOf(revived.settings), m, `el pack conserva ${m}`);
      const blob = await backupBlob(book);
      const parsed = JSON.parse(gunzipSync(blob).toString("utf8")) as { ledger: LedgerState };
      assert.equal(modeOf(parsed.ledger.settings), m, `la copia de seguridad conserva ${m}`);
    }
  });

  it("el espejo faro-mode es llave compartida: no se aparta en los libros sellados", () => {
    assert.equal(isDataKey("faro-mode"), false, "faro-mode viaja compartida, como faro-lang");
    assert.equal(isDataKey("faro-lang"), false);
  });
});

describe("tres modos, etapa 1 — la pantalla de impacto cuenta de verdad", () => {
  it("cada grupo dormido se cuenta contra el libro rico, por destino", () => {
    const book = richBook();
    // Hacia Esencial duerme todo lo de Ritmo y lo de Completo.
    assert.equal(groupCount(book, "esencial", "cuotas"), 2, "dos series de suscripción (la repetida cuenta una)");
    assert.equal(groupCount(book, "esencial", "prestamos"), 1, "el préstamo archivado no cuenta");
    assert.equal(groupCount(book, "esencial", "medeben"), 2);
    assert.equal(groupCount(book, "esencial", "tarjetas"), 2);
    assert.equal(groupCount(book, "esencial", "personas"), 3);
    assert.equal(groupCount(book, "esencial", "remesas"), 1);
    assert.equal(groupCount(book, "esencial", "bolsillos"), 2, "Meta y Retiro; Emergencia no tiene series aquí");
    assert.equal(groupCount(book, "esencial", "naturalezas"), 1, "solo la serie declarada aparte");
    assert.equal(groupCount(book, "esencial", "seguro"), 1);
    assert.equal(groupCount(book, "esencial", "apartados"), 1);
    assert.equal(groupCount(book, "esencial", "importacion"), 1);
    // Hacia Ritmo solo duerme lo de Completo.
    assert.equal(groupCount(book, "ritmo", "cuotas"), 0);
    assert.equal(groupCount(book, "ritmo", "bolsillos"), 0);
    assert.equal(groupCount(book, "ritmo", "naturalezas"), 1);
    assert.equal(groupCount(book, "ritmo", "seguro"), 1);
    // Hacia Completo no duerme nada.
    assert.equal(modeImpact(book, "completo", "es").groups.length, 0);
  });

  it("un libro vacío da impacto cero: sin objeto no hay pantalla", () => {
    const empty: LedgerState = { ...createInitial("es", "claro"), months: {} };
    assert.equal(modeImpact(empty, "esencial", "es").total, 0);
    assert.equal(modeImpact(empty, "ritmo", "es").total, 0);
  });

  it("subir destapa por tramos: lo que nombra el aviso posterior", () => {
    // Ola 1 (B-4): el aviso lee el LIBRO — unlockedGroups recibe el estado y
    // solo nombra los grupos que ESTE libro tiene (count > 0). Antes la
    // función no recibía el libro y nombraba el tramo entero, tuviera la
    // persona el dato o no.
    const book = richBook();
    const ids = (from: "esencial" | "ritmo" | "completo", to: "esencial" | "ritmo" | "completo") => unlockedGroups(book, from, to).map((g) => g.id);
    assert.ok(ids("esencial", "ritmo").includes("cuotas") && !ids("esencial", "ritmo").includes("naturalezas"));
    assert.ok(ids("ritmo", "completo").includes("naturalezas") && !ids("ritmo", "completo").includes("cuotas"));
    assert.equal(ids("completo", "completo").length, 0);
    assert.equal(DORMANT_GROUPS.length, 11, "la tabla mínima de la etapa 1: once grupos censados");
  });
});

describe("tres modos, etapa 1 — las cercas de la casa", () => {
  it("solo el selector y la puerta del proveedor escriben settings.mode", () => {
    const walk = (dir: URL, acc: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const child = new URL(name, dir);
        if (statSync(child).isDirectory()) { if (name !== "node_modules" && name !== "dist") walk(new URL(`${name}/`, dir), acc); }
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) acc.push(child.pathname);
      }
      return acc;
    };
    const files = walk(new URL("../../", import.meta.url));
    const writes = [
      /settings:\s*\{[\s\S]{0,220}?\bmode\s*:/, // settings: { …, mode: x }
      /settings:\s*\{[\s\S]{0,220}?\bmode\s*\}/, // settings: { …, mode } (a secas)
      /\.settings\.mode\s*=/, // settings.mode = x
    ];
    const writers = new Set<string>();
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      if (writes.some((re) => re.test(text))) writers.add(f.split("/src/")[1] ?? f);
    }
    assert.deepEqual(
      [...writers].sort(),
      ["components/faro/provider.tsx", "components/faro/screens.tsx"],
      `las únicas manos que escriben el modo son el selector y el proveedor; apareció: ${[...writers].join(", ")}`,
    );
  });

  it("lock.ts intacto (md5 de siempre) y la puerta/selector sembrados con sus anclas", () => {
    const lock = readFileSync(new URL("../../spa/lock.ts", import.meta.url));
    assert.equal(createHash("md5").update(lock).digest("hex"), "40a3b9bf05cf0553dc1f9b2c9d86f85e");
    const screens = read("../../components/faro/screens.tsx");
    assert.ok(screens.includes('<Fold id="modo"'), "el selector vive en Ajustes con su pliegue");
    assert.ok(screens.includes('"lang", "theme", "modo"'), "la búsqueda de Ajustes abre el pliegue del modo");
    const provider = read("../../components/faro/provider.tsx");
    assert.ok(provider.includes("<ModeGate"), "la pantalla inicial la pone el proveedor");
    assert.ok(provider.includes('localStorage.setItem("faro-mode"'), "el espejo del modo se escribe al guardar");
  });

  it("paridad i18n exacta de las claves nuevas (es y en, ninguna vacía)", () => {
    const i18n = read("./i18n.ts");
    const keys = [
      "settings.mode", "mode.esencial", "mode.ritmo", "mode.completo",
      "mode.esencial.line", "mode.ritmo.line", "mode.completo.line", "mode.current",
      ...DORMANT_GROUPS.map((g) => g.labelKey),
      "mode.a.category", "mode.a.outlier", "mode.a.recurring", "mode.a.pace", "mode.a.goal", "mode.a.cushion", "mode.a.floor", "mode.a.overcommit", "mode.a.insurance",
      "mode.impact.title", "mode.impact.intro", "mode.impact.alerts", "mode.impact.keeper", "mode.impact.yes",
      "mode.up.notice", "mode.up.notice.plain", "mode.down.notice", "mode.andmore",
      "mode.gate.kicker", "mode.gate.title", "mode.gate.sub", "mode.gate.choose", "mode.gate.skip", "mode.skip.notice",
      ...(["esencial", "ritmo", "completo"] as const).flatMap((m) => [1, 2, 3, 4].map((i) => `mode.gate.b.${m}.${i}`)),
    ];
    for (const k of keys) assert.equal(i18n.split(`"${k}"`).length - 1, 2, `${k} debe existir en es y en en`);
  });

  it("el tema del Manual existe, con su go al selector y los nombres en el mapa de enlaces", () => {
    const topics = read("../manual/topics.ts");
    assert.ok(topics.includes('id: "modos"'), "el tema «Modo» existe");
    assert.ok(topics.includes('fold: "modo", anchor: "aj-modo"'), "su go abre el pliegue del selector");
    const links = read("../manual/links.ts");
    for (const name of ["Esencial", "Essential", "Ritmo", "Rhythm", "Completo", "Complete"]) {
      assert.ok(links.includes(`${name}: "modos"`), `[[${name}]] lleva al tema de los modos`);
    }
  });

  it("la búsqueda del Manual encuentra el selector por su nombre en los dos idiomas", () => {
    const es = searchTopics(MANUAL_TOPICS, queryWords("modo"), "es");
    assert.ok(es.some((tp) => tp.id === "modos"), "«modo» encuentra el tema en español");
    const en = searchTopics(MANUAL_TOPICS, queryWords("mode"), "en");
    assert.ok(en.some((tp) => tp.id === "modos"), "«mode» finds the topic in English");
    const byTerm = searchTopics(MANUAL_TOPICS, queryWords("esencial"), "es");
    assert.ok(byTerm.some((tp) => tp.id === "modos"), "«esencial» también lo encuentra (terms del tema)");
  });
});

describe("tres modos — el fallo Primerica (Oscar, 2026-11-15 23:02)", () => {
  // La serie que seedRetiro siembra en todo libro arrancado (una línea de C$0
  // con la marca de fábrica en el bolsillo Retiro) le pertenece a Oscar; en el
  // libro de otra persona no es un bolsillo suyo y NO cuenta como dormido en
  // la pantalla de impacto — a menos que la persona la instituya con un acto
  // propio de dinero (su apartado en ella, o el saldo que ella misma pone).
  const seededBook = (): LedgerState => seedRetiro({ ...createInitial("es", "claro"), months: {} }, KEY);
  const seedLineOf = (book: LedgerState): Line => {
    const found = Object.values(book.months).flatMap((m) => m.lines).find((l) => l.concept === "Primerica");
    assert.ok(found, "el libro sembrado trae la línea de fábrica");
    return found;
  };

  it("la Primerica de fábrica sin tocar NO cuenta como bolsillo dormido", () => {
    const book = seededBook();
    assert.ok(seedLineOf(book), "la semilla está en el libro (visible en Central con C$0.00)");
    assert.equal(groupCount(book, "esencial", "bolsillos"), 0, "sin instituir, no es un bolsillo de la persona");
    assert.equal(groupCount(book, "ritmo", "bolsillos"), 0);
    const unseeded: LedgerState = { ...createInitial("es", "claro"), months: {} };
    assert.equal(
      modeImpact(book, "esencial", "es").groups.find((g) => g.id === "bolsillos")?.count ?? 0,
      modeImpact(unseeded, "esencial", "es").groups.find((g) => g.id === "bolsillos")?.count ?? 0,
      "el impacto de un libro con la semilla intacta es el de un libro sin ella",
    );
  });

  it("instituida con un apartado propio, la misma serie SÍ cuenta", () => {
    const book = seededBook();
    const seed = seedLineOf(book);
    const own = line({
      id: "propio-1", seriesId: seed.seriesId, kind: "expense-fixed", concept: "Primerica",
      amountMinor: 5000, categoryId: seed.categoryId, subId: seed.subId, icon: "brand:primerica",
    });
    const grown: LedgerState = { ...book, months: { [KEY]: { lines: [...book.months[KEY]!.lines, own] } } };
    assert.equal(groupCount(grown, "esencial", "bolsillos"), 1, "un apartado propio la instituye: ya es su bolsillo");
  });

  it("instituida poniendo el saldo en la línea de fábrica, también cuenta", () => {
    const book = seededBook();
    const seed = seedLineOf(book);
    const lines = book.months[KEY]!.lines.map((l) => (l.id === seed.id ? { ...l, balanceMinor: 20000 } : l));
    const grown: LedgerState = { ...book, months: { [KEY]: { lines } } };
    assert.equal(groupCount(grown, "esencial", "bolsillos"), 1, "el saldo que la persona pone es su acto: la serie es suya");
  });

  it("una serie de Retiro propia (no Primerica) cuenta como siempre, aunque esté en cero", () => {
    const base = createInitial("es", "claro");
    const own = line({ id: "ret-propio", kind: "expense-fixed", concept: "Mi retiro", amountMinor: 0, categoryId: "f-ahorro", subId: "f.ahorro.retiro" });
    const book: LedgerState = { ...base, months: { [KEY]: { lines: [own] } } };
    assert.equal(groupCount(book, "esencial", "bolsillos"), 1, "la excepción es solo para la semilla de fábrica");
  });
});
