import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { savingsStock } from "./savings.ts";
import { asideSplit, cushionOf, declareSeries, freeShown, keptTotal, libreOf } from "./funds.ts";
import type { LedgerState, Line } from "./types.ts";

// AUDIT-3 (vía de ventanas, 2026-11-16): sondas adversarias contra el MODELO
// de ahorro — las leyes del propio diseño, atacadas con libros sintéticos:
// conservación, el saldo nunca suma, la anfitriona y su Libre, lo sin
// declarar, el Retiro, la foto (snapshot) y su clase determinante.

const M = "2026-11";
let seq = 0;
function line(partial: Partial<Line> & { subId: string }): Line {
  seq += 1;
  return {
    id: `l${seq}`,
    seriesId: "",
    monthKey: M,
    kind: "expense",
    concept: "sonda",
    amountMinor: 0,
    currency: "NIO",
    active: true,
    note: "",
    categoryId: "ahorro",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "monthly",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    icon: "",
    history: [],
    ...partial,
  } as Line;
}

function book(lines: Line[]): LedgerState {
  const base = createInitial("es");
  return {
    ...base,
    structure: {
      ...base.structure,
      categories: [
        {
          id: "ahorro", role: "savings", hidden: false, nameKey: "", icon: "", color: "",
          subs: [
            { id: "cta", icon: "vault", hidden: false, nameKey: "", color: "" },
            { id: "cta-oculta", icon: "vault", hidden: true, nameKey: "", color: "" },
            { id: "bolsa.meta", icon: "", hidden: false, nameKey: "", color: "" },
            { id: "bolsa.emergencia", icon: "", hidden: false, nameKey: "", color: "" },
            { id: "bolsa.retiro", icon: "", hidden: false, nameKey: "", color: "" },
          ],
        } as never,
      ],
    },
    months: { [M]: { lines } },
  } as LedgerState;
}
const snap = (partial: Partial<Line> & { subId: string }) => line({ balanceMinor: 0, ...partial });

describe("AUDIT-3 — el modelo contra sus propias leyes", () => {
  it("P1 conservación: las cinco clases suman el total; Lo guardado = total − comprometido", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s-ap", balanceMinor: 30_000, fund: "aparte" }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 40_000, fund: "saldo", fundHost: "cta" }),
      snap({ subId: "bolsa.meta", seriesId: "s-hl", balanceMinor: 10_000, fund: "saldo" }),
      snap({ subId: "bolsa.meta", seriesId: "s-sd", balanceMinor: 20_000 }),
      snap({ subId: "bolsa.retiro", seriesId: "s-re", balanceMinor: 50_000 }),
    ]), M);
    const sum = Object.values(s.byClass).reduce((a, b) => a + b, 0);
    assert.equal(sum, s.total);
    assert.equal(s.total, 250_000);
    assert.equal(keptTotal(s), 250_000 - 50_000);
    assert.equal(s.kept, 30_000 + 50_000);
    assert.equal(s.pledged, 50_000);
    assert.equal(s.undeclared, 20_000);
  });

  it("P2 el saldo nunca suma: su dinero ya es el saldo de la anfitriona", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 40_000, fund: "saldo", fundHost: "cta" }),
    ]), M);
    assert.equal(keptTotal(s), 100_000);
    assert.equal(libreOf(s, "cta"), 60_000);
  });

  it("P3 sobre-compromiso: el Libre sale negativo y el colchón lo nombra, sin inventar dinero", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 150_000, fund: "saldo", fundHost: "cta" }),
    ]), M);
    assert.equal(libreOf(s, "cta"), -50_000);
    const c = cushionOf(s);
    assert.equal(c.overCommitted.length, 1);
    assert.equal(c.overCommitted[0]!.host, "cta");
    assert.equal(keptTotal(s), 100_000);
  });

  it("P4 saldo sin anfitriona: compromete bajo la clave vacía y no suma", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.emergencia", seriesId: "s-hl", balanceMinor: 10_000, fund: "saldo" }),
    ]), M);
    assert.equal(s.pledgedByHost.get(""), 10_000);
    assert.equal(keptTotal(s), 100_000);
    const c = cushionOf(s);
    assert.equal(c.emergencyFloor, 10_000);
    assert.equal(c.floorShortfall, 0); // el sobrante de la cuenta lo cubre
  });

  it("P5 la foto manda: depósitos anteriores no cuentan dos veces; sin día, tampoco", () => {
    const mk = (deps: Line[]) => savingsStock(book([
      snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 100_000, bookedOn: "2026-11-10", fund: "aparte" }),
      ...deps,
    ]), M);
    const dep = (amountMinor: number, bookedOn?: string) => line({ subId: "bolsa.meta", seriesId: "s1", amountMinor, fund: "aparte", ...(bookedOn ? { bookedOn } : {}) });
    assert.equal(mk([dep(20_000, "2026-11-05")]).total, 100_000);
    assert.equal(mk([dep(20_000, "2026-11-15")]).total, 120_000);
    assert.equal(mk([dep(20_000)]).total, 100_000);
  });

  it("P6 la clase la dice la FOTO, no el depósito más nuevo: la línea del saldo manda", () => {
    // La línea determinante es la foto mientras exista (savings.ts: snap ?? último
    // depósito): un depósito posterior suma dinero pero NO reclasifica la serie.
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 40_000, bookedOn: "2026-11-02", fund: "saldo", fundHost: "cta" }),
      line({ subId: "bolsa.meta", seriesId: "s1", amountMinor: 5_000, bookedOn: "2026-11-20", fund: "aparte" }),
    ]), M);
    assert.equal(s.series.get("s1")!.cls, "saldo");
    assert.equal(s.byClass.saldo, 45_000);
    assert.equal(s.pledged, 45_000);
    // Sin foto, sí manda el depósito más reciente:
    const s2 = savingsStock(book([
      line({ subId: "bolsa.meta", seriesId: "s2", amountMinor: 4_000, bookedOn: "2026-11-02", fund: "saldo", fundHost: "cta" }),
      line({ subId: "bolsa.meta", seriesId: "s2", amountMinor: 5_000, bookedOn: "2026-11-20", fund: "aparte" }),
    ]), M);
    assert.equal(s2.series.get("s2")!.cls, "aparte");
    assert.equal(s2.byClass.aparte, 9_000);
  });

  it("P13 la foto más reciente por mes manda; el futuro no existe para la fecha de corte", () => {
    const st = book([
      snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 100_000, fund: "aparte" }),
    ]);
    st.months["2026-10"] = { lines: [snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 70_000, fund: "aparte" })] };
    st.months["2026-12"] = { lines: [snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 999_000, fund: "aparte" })] };
    assert.equal(savingsStock(st, "2026-10").total, 70_000);
    assert.equal(savingsStock(st, M).total, 100_000);
  });

  it("P15 líneas inactivas o en reposo no existen para la caminata", () => {
    const s = savingsStock(book([
      snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 100_000, fund: "aparte", active: false }),
      line({ subId: "bolsa.meta", seriesId: "s1", amountMinor: 5_000, fund: "aparte", rest: true } as Partial<Line> & { subId: string }),
      line({ subId: "bolsa.meta", seriesId: "s1", amountMinor: 7_000, fund: "aparte" }),
    ]), M);
    assert.equal(s.total, 7_000);
  });

  it("P19 una cuenta oculta viaja en «rest» y su clase suma a Lo guardado del segmento", async () => {
    const { segmentAgg } = await import("./funds.ts");
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "cta-oculta", seriesId: "s-hid", balanceMinor: 80_000 }),
    ]), M);
    const agg = segmentAgg(s, new Set(["bolsa.meta"]), new Set(["cta"]));
    assert.equal(agg.get("rest")!.kept, 80_000);
    assert.equal(agg.get("rest")!.total, 80_000);
  });

  it("P8 declarar: cuenta y Retiro jamás se estampan; aparte borra la anfitriona", () => {
    const st = book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.retiro", seriesId: "s-re", balanceMinor: 50_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s1", balanceMinor: 40_000, fund: "saldo", fundHost: "cta" }),
    ]);
    assert.equal(declareSeries(st, "s-cta", "aparte"), st);
    assert.equal(declareSeries(st, "s-re", "aparte"), st);
    const after = declareSeries(st, "s1", "aparte");
    const l = Object.values(after.months)[0]!.lines.find((x) => x.seriesId === "s1")!;
    assert.equal(l.fund, "aparte");
    assert.equal(l.fundHost, undefined);
  });

  it("P9 asideSplit: lo sin declarar cae en «movido» (la convención que el texto ya declara)", () => {
    const s = savingsStock(book([
      snap({ subId: "bolsa.meta", seriesId: "s-sd", balanceMinor: 20_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 40_000, fund: "saldo", fundHost: "cta" }),
    ]), M);
    const parts = asideSplit([
      { seriesKey: "s-sd", minor: 7_000 },
      { seriesKey: "s-sa", minor: 3_000 },
    ], s);
    assert.deepEqual(parts, { saldo: 3_000, moved: 7_000 });
  });

  it("P10 anfitriona oculta: su compromiso resta de lo libre mostrado (declarado en el diseño)", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "cta-oculta", seriesId: "s-hid", balanceMinor: 80_000 }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 30_000, fund: "saldo", fundHost: "cta-oculta" }),
    ]), M);
    assert.equal(freeShown(s, 100_000), 70_000);
  });

  it("P11 el piso de emergencia se comprueba anfitriona por anfitriona", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000 }),
      snap({ subId: "bolsa.emergencia", seriesId: "s-em", balanceMinor: 80_000, fund: "saldo", fundHost: "cta" }),
      snap({ subId: "bolsa.meta", seriesId: "s-sa", balanceMinor: 50_000, fund: "saldo", fundHost: "cta" }),
    ]), M);
    const c = cushionOf(s);
    assert.equal(c.emergencyFloor, 80_000);
    assert.equal(c.floorShortfall, 30_000); // libre tras lo no-emergencia: 50_000; faltan 30_000 del piso
    assert.equal(c.cushion, 50_000 + 0); // máx(0, 100_000 − 50_000) y nada aparte/sin declarar
  });

  it("P12 una estampa extraviada en una cuenta no la reclasifica: la forma manda", () => {
    const s = savingsStock(book([
      snap({ subId: "cta", seriesId: "s-cta", balanceMinor: 100_000, fund: "saldo", fundHost: "cta" }),
    ]), M);
    assert.equal(s.series.get("s-cta")!.cls, "cuenta");
    assert.equal(s.pledged, 0);
    assert.equal(keptTotal(s), 100_000);
  });
});
