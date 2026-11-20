/**
 * FARO — Captura Inteligente, Ola 2: la batería del intérprete (mapa F2).
 * Patrones con estructura, disparo y silencio: cada caso nombra qué debe
 * disparar y qué debe callar. Material de dos clases: los especímenes del
 * mapa y frases tramposas (conteos, monedas que el libro no conoce, dos
 * montos sin partición segura) donde lo correcto es NO inventar.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePhrase, type ParseCtx } from "./textparse.ts";
import type { LedgerState } from "./types.ts";

const TODAY = "2026-11-20"; // viernes

function ledger(extra?: Partial<LedgerState>): LedgerState {
  return {
    v: 1,
    structure: { categories: [], purchases: [], catalog: [], groups: [] } as unknown as LedgerState["structure"],
    months: {},
    settings: {} as LedgerState["settings"],
    imports: { rules: [], seen: [] },
    ...extra,
  } as LedgerState;
}

let seq = 0;
const ctx = (over?: Partial<ParseCtx>): ParseCtx => ({
  ledger: ledger(),
  lang: "es",
  today: TODAY,
  display: "USD",
  makeId: () => `d${++seq}`,
  now: "2026-11-20T15:00:00.000Z",
  ...over,
});

describe("ola2 · el intérprete: los especímenes del mapa", () => {
  it("«Almuerzo, $300»: monto firmado USD; sin verbo, el signo se pregunta", () => {
    const [d] = parsePhrase("Almuerzo, $300", ctx());
    assert.equal(d.amountMinor, 30000);
    assert.equal(d.currency, "USD");
    assert.ok(!d.unsure.includes("currency"));
    assert.equal(d.sign, null);
    assert.ok(d.missing.includes("sign"), "sin señal de dirección, la mesa pregunta");
    assert.equal(d.concept, "Almuerzo");
    assert.equal(d.source, "text");
    assert.equal(d.day, TODAY);
  });

  it("«300 pesos nicaragüenses en el mercado»: la moneda por su nombre es NIO", () => {
    const [d] = parsePhrase("300 pesos nicaragüenses en el mercado", ctx());
    assert.equal(d.amountMinor, 30000);
    assert.equal(d.currency, "NIO");
    assert.equal(d.concept, "Mercado");
  });

  it("«$300 en eBay, me compré un celular nuevo»: salida, con su tienda en el concepto", () => {
    const [d] = parsePhrase("$300 en eBay, me compré un celular nuevo", ctx());
    assert.equal(d.sign, "out");
    assert.equal(d.amountMinor, 30000);
    assert.equal(d.currency, "USD");
    assert.match(d.concept, /eBay/);
    assert.match(d.concept, /celular nuevo/);
  });

  it("«Me pagaron 500 dólares de la remesa»: entrada — «me pagaron» manda sobre la raíz de pagar", () => {
    const [d] = parsePhrase("Me pagaron 500 dólares de la remesa", ctx());
    assert.equal(d.sign, "in");
    assert.equal(d.amountMinor, 50000);
    assert.equal(d.currency, "USD");
    assert.equal(d.concept, "Remesa");
  });

  it("«pagué 200 de luz y 150 de agua»: dos movimientos hermanos, un solo verbo", () => {
    const ds = parsePhrase("pagué 200 de luz y 150 de agua", ctx());
    assert.equal(ds.length, 2);
    assert.deepEqual(ds.map((d) => d.amountMinor), [20000, 15000]);
    assert.deepEqual(ds.map((d) => d.concept), ["Luz", "Agua"]);
    assert.ok(ds.every((d) => d.sign === "out"));
    assert.ok(ds.every((d) => d.unsure.includes("currency")), "sin señal de moneda: la de vista, en ámbar");
    assert.ok(ds.every((d) => d.currency === "USD"));
  });

  it("«gasté trescientos en el mercado»: el monto en palabras", () => {
    const [d] = parsePhrase("gasté trescientos en el mercado", ctx());
    assert.equal(d.amountMinor, 30000);
    assert.equal(d.sign, "out");
    assert.equal(d.concept, "Mercado");
    assert.ok(d.unsure.includes("currency"));
  });

  it("«two hundred dollars on books»: palabras en inglés con su moneda", () => {
    const [d] = parsePhrase("two hundred dollars on books", ctx({ lang: "en" }));
    assert.equal(d.amountMinor, 20000);
    assert.equal(d.currency, "USD");
    assert.ok(!d.unsure.includes("currency"));
  });
});

describe("ola2 · el intérprete: el signo, con estructura", () => {
  it("«me cobraron 45 dólares» es SALIDA aunque «cobrar» solo sería entrada", () => {
    const [d] = parsePhrase("me cobraron 45 dólares de la tarjeta", ctx());
    assert.equal(d.sign, "out");
    assert.equal(d.amountMinor, 4500);
  });

  it("«cobré 200 dólares» es entrada", () => {
    const [d] = parsePhrase("cobré 200 dólares", ctx());
    assert.equal(d.sign, "in");
  });

  it("«recibí mi salario de 2000 dólares»: entrada con monto enmarcado", () => {
    const [d] = parsePhrase("recibí mi salario de 2000 dólares", ctx());
    assert.equal(d.sign, "in");
    assert.equal(d.amountMinor, 200000);
  });

  it("«debo 300 dólares»: un estado, no un movimiento — el signo calla", () => {
    const [d] = parsePhrase("debo 300 dólares", ctx());
    assert.equal(d.sign, null);
    assert.ok(d.missing.includes("sign"));
  });
});

describe("ola2 · el intérprete: los días", () => {
  it("«ayer gasté $50 en gasolina»: ayer es ayer", () => {
    const [d] = parsePhrase("ayer gasté $50 en gasolina", ctx());
    assert.equal(d.day, "2026-11-19");
    assert.equal(d.concept, "Gasolina");
  });

  it("«el lunes pagué C$1,200 de renta»: el lunes más reciente, en córdobas firmados", () => {
    const [d] = parsePhrase("el lunes pagué C$1,200 de renta", ctx());
    assert.equal(d.day, "2026-11-16");
    assert.equal(d.currency, "NIO");
    assert.equal(d.amountMinor, 120000);
  });

  it("sin día dicho, hoy — y sin ámbar: es el defecto declarado del mapa", () => {
    const [d] = parsePhrase("compré pan por 100", ctx());
    assert.equal(d.day, TODAY);
    assert.ok(!d.unsure.includes("date"));
  });
});

describe("ola2 · el intérprete: los silencios honestos (la batería de ataque)", () => {
  it("«pagué la luz con la tarjeta de mi hermano»: sin monto NO se inventa uno", () => {
    const [d] = parsePhrase("pagué la luz con la tarjeta de mi hermano", ctx());
    assert.equal(d.amountMinor, null);
    assert.ok(d.missing.includes("amount"));
    assert.equal(d.sign, "out");
  });

  it("«3 tacos»: un conteo no es dinero", () => {
    const [d] = parsePhrase("3 tacos", ctx());
    assert.equal(d.amountMinor, null);
    assert.ok(d.missing.includes("amount"));
  });

  it("«compré 2 camisas por 300»: el conteo calla y la ranura «por» habla", () => {
    const [d] = parsePhrase("compré 2 camisas por 300", ctx());
    assert.equal(d.amountMinor, 30000);
  });

  it("«compré un regalo de 20 euros»: el euro no se convierte — la moneda se pregunta", () => {
    const [d] = parsePhrase("compré un regalo de 20 euros", ctx());
    assert.equal(d.amountMinor, 2000);
    assert.equal(d.currency, null);
    assert.ok(d.missing.includes("currency"), "el libro no conoce euros: jamás se convierte dinero real");
  });

  it("«pan y queso por 100»: la «y» sin monto en un lado no parte la frase", () => {
    const ds = parsePhrase("pan y queso por 100", ctx());
    assert.equal(ds.length, 1);
    assert.equal(ds[0].amountMinor, 10000);
  });

  it("frase vacía: ningún borrador", () => {
    assert.deepEqual(parsePhrase("   ", ctx()), []);
  });
});

describe("ola2 · el intérprete: el aprendizaje manda", () => {
  it("una regla aprendida clasifica la frase al nacer, sin ámbar en la casa", () => {
    const led = ledger({
      imports: {
        sources: [],
        maps: {},
        rules: [{ key: "netflix", label: "Netflix", target: "expense-fixed|streaming|", n: 3, at: "2026-11-01" }],
      },
      structure: {
        categories: [{ id: "streaming", group: "fixed", name: "Streaming", subs: [] }],
        purchases: [], catalog: [], groups: [],
      } as unknown as LedgerState["structure"],
    });
    const [d] = parsePhrase("pagué Netflix 15 dólares", ctx({ ledger: led }));
    assert.equal(d.book, "expense-fixed");
    assert.equal(d.cat, "streaming");
    assert.ok(!d.unsure.includes("book"), "lo aprendido nace clasificado");
  });
});
