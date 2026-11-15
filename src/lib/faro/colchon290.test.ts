// Oleada 4 del modelo de ahorros (1.3.290): el Asesor y Estudio leen la partición.
// Lo que se cerca aquí:
//  - EL COLCHÓN UNIFICADO (§3, funds.cushionOf): por cuenta, máx(0, saldo − sus
//    compromisos del saldo no-emergencia); la emergencia del saldo GUARDA el saldo
//    (no suma); la emergencia aparte SUMA su pila; el Retiro nunca cuenta; lo sin
//    declarar se lee como pila — y para un libro sin declaraciones la fórmula se
//    reduce EXACTAMENTE a la lectura de 1.3.289 (total − Retiro): la paridad A/B.
//  - EL PISO (§4.3): la frase del piso dispara si y solo si falta, con su cifra;
//    silencio cuando el piso está cubierto o no hay fondo de emergencia del saldo.
//  - EL LIBRE QUE BAJA (§4.3): una anfitriona sobre-comprometida se nombra una vez,
//    con su monto y su libre negativo.
//  - LA CONTRADICCIÓN CON NATURALEZAS (§4.3): el dinero mandado a una cuenta que
//    anfitriona fondos del saldo ya no se lee como dinero sin hogar.
//  - ESTUDIO (§4.4): la pista de studyBoard es Lo guardado (keptTotal) — la misma
//    cifra que la banda — y la foto de awake sale de la partición, sin doble conteo.
//  - LA REGLA DE LA META lee su stock de la partición (su caminata privada contaba
//    dos veces los depósitos que una foto ya incluía).
//  - POR CONSTRUCCIÓN: ninguna caminata divergente queda en pie (grep de fuentes,
//    el idioma de la casa).
// Diseño: ~/workspace/faro-savings-model-design/DESIGN.md §3, §4.3, §4.4, §12.4.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import { createInitial, makeNamer } from "./defaults.ts";
import { cushionOf, declareSeries, keptTotal } from "./funds.ts";
import { savingsStock } from "./savings.ts";
import { adviceRules } from "./rules.ts";
import { readAdvisor } from "./advisor.ts";
import { studyBoard } from "./engine.ts";
import { savingsPicture } from "./awake.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";
const TODAY = new Date(2026, 10, 10, 12);

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: p.id, monthKey: KEY, currency: "USD", active: true, note: "", categoryId: "", subId: "",
    recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "",
    nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...p,
  };
}

function base(): LedgerState {
  const s = createInitial("es", "claro");
  return {
    ...s,
    settings: { ...s.settings, display: "USD", rateE4: 366243, emergencyMonths: 3 },
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => c.id === "f-ahorro" ? { ...c, subs: [...c.subs,
        { id: "f.ahorro.viaje", nameKey: "f.ahorro.viaje", customName: "Viaje", icon: "Circle", hidden: false, order: 3 },
        { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "Banco", icon: "vault:chase", hidden: false, order: 5 }] } : c),
    },
  };
}

const dep = (id: string, subId: string, amountMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor, categoryId: "f-ahorro", subId, bookedOn: "2026-11-03", ...extra });
const snap = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });

/** El libro mixto de la oleada: cuenta de $500; sobre ella, una Meta del saldo de
 *  $50 y una Emergencia del saldo de $600 (más que lo libre: el piso no se cubre);
 *  una Emergencia aparte de $100 y Retiro de $200. */
function mixed(): LedgerState {
  const s = base();
  const raw: LedgerState = {
    ...s,
    months: {
      [KEY]: { lines: [
        snap("b", "f.ahorro.banco", 50000, { seriesId: "f.ahorro.banco" }),
        dep("v", "f.ahorro.viaje", 5000, { seriesId: "serie-viaje" }),
        snap("e", "f.ahorro.emergencia", 60000, { seriesId: "serie-emerg-saldo" }),
        dep("ea", "f.ahorro.emergencia", 10000, { seriesId: "serie-emerg-aparte" }),
        snap("r", "f.ahorro.retiro", 20000, { seriesId: "serie-retiro" }),
      ] },
    },
  };
  let out = declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco");
  out = declareSeries(out, "serie-emerg-saldo", "saldo", "f.ahorro.banco");
  out = declareSeries(out, "serie-emerg-aparte", "aparte");
  return out;
}

/** El mismo esqueleto con el piso cubierto: Emergencia del saldo de $300. */
function covered(): LedgerState {
  const s = base();
  const raw: LedgerState = {
    ...s,
    months: {
      [KEY]: { lines: [
        snap("b", "f.ahorro.banco", 50000, { seriesId: "f.ahorro.banco" }),
        dep("v", "f.ahorro.viaje", 5000, { seriesId: "serie-viaje" }),
        snap("e", "f.ahorro.emergencia", 30000, { seriesId: "serie-emerg-saldo" }),
      ] },
    },
  };
  let out = declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco");
  out = declareSeries(out, "serie-emerg-saldo", "saldo", "f.ahorro.banco");
  return out;
}

/** El libro mixto sin declarar nada: el mundo de 1.3.289. */
function undeclared(): LedgerState {
  const s = base();
  return {
    ...s,
    months: {
      [KEY]: { lines: [
        snap("b", "f.ahorro.banco", 50000, { seriesId: "f.ahorro.banco" }),
        dep("v", "f.ahorro.viaje", 5000, { seriesId: "serie-viaje" }),
        snap("e", "f.ahorro.emergencia", 60000, { seriesId: "serie-emerg-saldo" }),
        dep("ea", "f.ahorro.emergencia", 10000, { seriesId: "serie-emerg-aparte" }),
        snap("r", "f.ahorro.retiro", 20000, { seriesId: "serie-retiro" }),
      ] },
    },
  };
}

const names = (s: LedgerState) => makeNamer(s.structure, "es");
const rules = (s: LedgerState) => adviceRules(s, KEY, "es", names(s), { today: TODAY });

describe("colchon290: la fórmula unificada del colchón (§3)", () => {
  it("libro mixto: la emergencia del saldo guarda sin sumar; la aparte suma una vez", () => {
    const st = savingsStock(mixed(), KEY);
    const c = cushionOf(st);
    // Cuenta: máx(0, 500 − 50 de Meta del saldo) = 450; + emergencia aparte 100.
    assert.equal(c.cushion, 55000);
    // El piso es 600 y lo libre tras la Meta es 450: faltan 150.
    assert.equal(c.emergencyFloor, 60000);
    assert.equal(c.floorShortfall, 15000);
    // La anfitriona está sobre-comprometida: 500 de saldo contra 650 apartados.
    assert.deepEqual(c.overCommitted, [{ host: "f.ahorro.banco", balance: 50000, committed: 65000, libre: -15000 }]);
  });

  it("el ejemplo del diseño (§1): saldo 50,000 con Meta 5,000 y Emergencia 10,000 del saldo → colchón 45,000, piso cubierto", () => {
    const s = base();
    const raw: LedgerState = { ...s, months: { [KEY]: { lines: [
      snap("b", "f.ahorro.banco", 50000, { seriesId: "f.ahorro.banco" }),
      dep("v", "f.ahorro.viaje", 5000, { seriesId: "serie-viaje" }),
      snap("e", "f.ahorro.emergencia", 10000, { seriesId: "serie-emerg-saldo" }),
    ] } } };
    let out = declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco");
    out = declareSeries(out, "serie-emerg-saldo", "saldo", "f.ahorro.banco");
    const c = cushionOf(savingsStock(out, KEY));
    assert.equal(c.cushion, 45000);
    assert.equal(c.floorShortfall, 0);
    assert.deepEqual(c.overCommitted, []);
  });

  it("el ejemplo del diseño (§1): el mismo libro con saldo 12,000 → colchón 7,000 y faltan 3,000 de piso", () => {
    const s = base();
    const raw: LedgerState = { ...s, months: { [KEY]: { lines: [
      snap("b", "f.ahorro.banco", 12000, { seriesId: "f.ahorro.banco" }),
      dep("v", "f.ahorro.viaje", 5000, { seriesId: "serie-viaje" }),
      snap("e", "f.ahorro.emergencia", 10000, { seriesId: "serie-emerg-saldo" }),
    ] } } };
    let out = declareSeries(raw, "serie-viaje", "saldo", "f.ahorro.banco");
    out = declareSeries(out, "serie-emerg-saldo", "saldo", "f.ahorro.banco");
    const c = cushionOf(savingsStock(out, KEY));
    assert.equal(c.cushion, 7000);
    assert.equal(c.floorShortfall, 3000);
  });

  it("un piso sin anfitriona se cubre con lo que sobra de las cuentas; sin cuentas, falta entero", () => {
    const s = base();
    const raw: LedgerState = { ...s, months: { [KEY]: { lines: [
      snap("b", "f.ahorro.banco", 5000, { seriesId: "f.ahorro.banco" }),
      snap("e", "f.ahorro.emergencia", 8000, { seriesId: "serie-emerg-saldo" }),
    ] } } };
    const out = declareSeries(raw, "serie-emerg-saldo", "saldo");
    const c = cushionOf(savingsStock(out, KEY));
    assert.equal(c.emergencyFloor, 8000);
    assert.equal(c.floorShortfall, 3000);
    assert.equal(c.cushion, 5000);
  });

  it("una Meta aparte NO es colchón: su dinero ya tiene otro destino (§3)", () => {
    const s = base();
    const raw: LedgerState = { ...s, months: { [KEY]: { lines: [
      snap("b", "f.ahorro.banco", 10000, { seriesId: "f.ahorro.banco" }),
      dep("v", "f.ahorro.viaje", 40000, { seriesId: "serie-viaje" }),
    ] } } };
    const out = declareSeries(raw, "serie-viaje", "aparte");
    assert.equal(cushionOf(savingsStock(out, KEY)).cushion, 10000);
  });

  it("PARIDAD: sin declaraciones, la fórmula se reduce a total − Retiro, la lectura de 1.3.289", () => {
    const s = undeclared();
    const st = savingsStock(s, KEY);
    const c = cushionOf(st);
    assert.equal(c.cushion, st.total - st.retirement);
    assert.equal(c.cushion, 125000);
    assert.equal(c.floorShortfall, 0);
    assert.deepEqual(c.overCommitted, []);
    // Y el Asesor cita exactamente esa cifra, como en 289.
    const reading = readAdvisor(s, KEY, "es", names(s), { today: TODAY });
    assert.equal(reading.cushionStock, 125000);
  });
});

describe("colchon290: la frase del piso y el libre que baja (§4.3)", () => {
  it("el piso dispara si y solo si falta, con su cifra y su frase", () => {
    const floor = rules(mixed()).find((r) => r.id === "floor");
    assert.ok(floor, "la regla del piso existe en el libro mixto");
    assert.equal(floor.v.shortfall, 15000);
    assert.equal(floor.v.floor, 60000);
    assert.match(floor.say, /Tu piso de emergencia no está cubierto: faltan/);
    assert.match(floor.say, /\$150\.00/);
  });

  it("silencio cuando el piso está cubierto, y cuando no hay emergencia del saldo", () => {
    assert.equal(rules(covered()).find((r) => r.id === "floor"), undefined);
    assert.equal(rules(undeclared()).find((r) => r.id === "floor"), undefined);
  });

  it("la sobre-compromiso se nombra una vez, con el libre negativo; silencio si el libre aguanta", () => {
    const over = rules(mixed()).filter((r) => r.id === "overcommit");
    assert.equal(over.length, 1);
    assert.equal(over[0]!.v.libre, -15000);
    assert.equal(over[0]!.v.committed, 65000);
    assert.equal(over[0]!.v.balance, 50000);
    assert.equal(rules(covered()).find((r) => r.id === "overcommit"), undefined);
  });

  it("la contradicción ya no trata como sin-hogar el dinero mandado a la cuenta anfitriona", () => {
    // Este mes entran $70 a la cuenta que anfitriona la Meta del saldo: puede estar
    // cumpliendo ese fondo. Sin la declaración, la misma entrada era «contradicción».
    const s = covered();
    const withSend: LedgerState = { ...s, months: { [KEY]: { lines: [
      ...s.months[KEY]!.lines,
      dep("send", "f.ahorro.banco", 7000, { seriesId: "send-1", bookedOn: "2026-11-05" }),
    ] } } };
    const reading = readAdvisor(withSend, KEY, "es", names(withSend), { today: TODAY });
    assert.equal(reading.contradiction, null);
    const plain = undeclared();
    const plainSend: LedgerState = { ...plain, months: { [KEY]: { lines: [
      dep("send", "f.ahorro.banco", 7000, { seriesId: "send-1", bookedOn: "2026-11-05" }),
    ] } } };
    const reading2 = readAdvisor(plainSend, KEY, "es", names(plainSend), { today: TODAY });
    assert.ok(reading2.contradiction?.includes("Decide a cuál meta"), "sin fondos declarados, la lectura de siempre sigue");
  });
});

describe("colchon290: Estudio y la foto leen la partición (§4.4, §2.3)", () => {
  it("la pista de Estudio es Lo guardado: la misma cifra que la banda", () => {
    const s = mixed();
    const st = savingsStock(s, KEY);
    assert.equal(keptTotal(st), 80000);
    const board = studyBoard(s, KEY, "es", names(s));
    assert.equal(board.runwayHave, keptTotal(st));
    assert.equal(board.runwayHave, 80000);
  });

  it("la foto de awake: total = Lo guardado, sin doble conteo del saldo", () => {
    const pic = savingsPicture(mixed(), KEY);
    assert.equal(pic.savingsTotal, 80000);
    assert.equal(pic.accounts, 50000);
    // La Emergencia de la foto es su pila aparte; la del saldo ya vive en «accounts».
    assert.equal(pic.emergencia, 10000);
    assert.equal(pic.meta, 0);
    assert.equal(pic.retiro, 20000);
    assert.equal(pic.unassigned, 80000 - 0 - 20000 - 10000);
  });

  it("la regla de la Meta lee el stock de la partición: la foto manda, el depósito ya incluido no se duplica", () => {
    const s = base();
    const book: LedgerState = { ...s, months: {
      "2026-10": { lines: [dep("m-oct", "f.ahorro.meta", 40000, { seriesId: "serie-meta", monthKey: "2026-10", bookedOn: "2026-10-05" })] },
      [KEY]: { lines: [snap("m-nov", "f.ahorro.meta", 30000, { seriesId: "serie-meta" })] },
    } };
    const goal = rules(book).find((r) => r.id === "goal");
    assert.ok(goal, "la regla de la Meta existe");
    assert.equal(goal.v.stock, 30000, "la caminata vieja habría dicho 70000");
  });
});

describe("colchon290: ninguna caminata divergente queda en pie (por construcción)", () => {
  const read = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");
  it("el Asesor ya no resta el Retiro del total: cita cushionOf", () => {
    const src = read("./advisor.ts");
    assert.ok(!src.includes("stock.total - stock.retirement"));
    assert.ok(src.includes("cushionOf(stock).cushion"));
  });
  it("la pista de Estudio ya no es el total crudo", () => {
    assert.ok(!read("./engine.ts").includes("runwayHave = savingsStock(state, key).total"));
  });
  it("la regla de la Meta ya no camina sus propias fotos", () => {
    assert.ok(!read("./rules.ts").includes("const snaps"));
  });
  it("la foto de awake nace de la partición", () => {
    assert.ok(read("./awake.ts").includes("savingsStock(state, monthKey)"));
  });
  it("la tarjeta del faro ya no suma su dinero de las barras del mes", () => {
    assert.ok(!read("../../components/faro/study2.tsx").includes("pockets.reduce"));
    assert.ok(read("../../components/faro/screens.tsx").includes("keptTotalOf(stockNow)"));
  });
});
