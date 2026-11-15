// Oleada 2 del modelo de ahorros (1.3.288): la pregunta. El modelo se vuelve PREGUNTABLE
// y VISIBLE sin mover ninguna cifra: la declaración estampa la serie entera, la elección
// de anfitriona sigue las reglas de §5.1.1 (0/1/2+ cuentas), el modo de Ajustes manda
// solo en la pregunta y jamás reescribe naturalezas, el guardia del encuentro compara
// contra el Libre de la anfitriona, y Folios clasifica sus notas por clase (§4.6) con
// el anti-fuga intacto: una entrada descansando no produce movimiento en el río, y su
// luz y su nota viajan con ella al Archivo porque viven en la propia línea.
// Diseño: ~/workspace/faro-savings-model-design/DESIGN.md §4.6, §5, §6.2, §7, §8, §12.2.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial } from "./defaults.ts";
import { restingEntries } from "./descanso.ts";
import {
  declareSeries, guardFor, hostAccounts, isFundSub, libreOf, natureMode, saveKindOf, stampFor, undeclaredFunds,
} from "./funds.ts";
import { buildStream } from "./historial.ts";
import { copyRecurring } from "./reducer.ts";
import { savingsStock } from "./savings.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";

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
    settings: { ...s.settings, display: "USD", rateE4: 366243 },
    structure: {
      ...s.structure,
      categories: s.structure.categories.map((c) => c.id === "f-ahorro" ? { ...c, subs: [...c.subs,
        { id: "f.ahorro.viaje", nameKey: "f.ahorro.viaje", customName: "Viaje", icon: "Circle", hidden: false, order: 3 },
        { id: "f.ahorro.banco", nameKey: "f.ahorro.banco", customName: "CuentaBanco", icon: "vault:chase", hidden: false, order: 4 },
        { id: "f.ahorro.banco2", nameKey: "f.ahorro.banco2", customName: "CuentaDos", icon: "vault:boa", hidden: false, order: 5 }] } : c),
    },
  };
}

const dep = (id: string, subId: string, amountMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor, categoryId: "f-ahorro", subId, bookedOn: "2026-11-03", ...extra });
const snap = (id: string, subId: string, balanceMinor: number, extra: Partial<Line> = {}): Line =>
  line({ id, kind: "expense-fixed", concept: id, amountMinor: balanceMinor, categoryId: "f-ahorro", subId, balanceMinor, bookedOn: "2026-11-02", ...extra });

/** Un fondo «Viaje» con dos meses de serie, una cuenta con C$700.00 y la Emergencia sin declarar. */
function book(): LedgerState {
  const s = base();
  return {
    ...s,
    months: {
      "2026-10": { lines: [dep("v-oct", "f.ahorro.viaje", 10000, { monthKey: "2026-10", seriesId: "serie-viaje", bookedOn: "2026-10-05" })] },
      "2026-11": { lines: [
        dep("v-nov", "f.ahorro.viaje", 15000, { seriesId: "serie-viaje" }),
        dep("e-nov", "f.ahorro.emergencia", 20000, { seriesId: "serie-emerg" }),
        snap("b-nov", "f.ahorro.banco", 70000, { seriesId: "f.ahorro.banco" }),
        snap("r-nov", "f.ahorro.retiro", 50000, { seriesId: "serie-retiro" }),
      ] },
    },
  };
}

describe("pregunta288: declarar estampa la serie entera (§5.3)", () => {
  it("todas las líneas de la serie, en todos los meses, llevan fund y fundHost; las demás no se tocan", () => {
    const s = book();
    const out = declareSeries(s, "serie-viaje", "saldo", "f.ahorro.banco");
    const viaje = [...out.months["2026-10"]!.lines, ...out.months["2026-11"]!.lines].filter((l) => (l.seriesId || l.id) === "serie-viaje");
    assert.equal(viaje.length, 2);
    for (const l of viaje) { assert.equal(l.fund, "saldo"); assert.equal(l.fundHost, "f.ahorro.banco"); }
    const emerg = out.months["2026-11"]!.lines.find((l) => l.id === "e-nov")!;
    assert.equal(emerg.fund, undefined);
    // La partición lee la serie declarada: clase saldo, comprometido contra su anfitriona.
    const st = savingsStock(out, KEY);
    assert.equal(st.series.get("serie-viaje")?.cls, "saldo");
    assert.equal(st.pledgedByHost.get("f.ahorro.banco"), 25000);
  });

  it("declarar aparte borra la anfitriona; declarar una cuenta o el Retiro se rehúsa (identidad)", () => {
    const s = declareSeries(book(), "serie-viaje", "saldo", "f.ahorro.banco");
    const out = declareSeries(s, "serie-viaje", "aparte");
    const l = out.months["2026-11"]!.lines.find((x) => x.id === "v-nov")!;
    assert.equal(l.fund, "aparte");
    assert.equal(l.fundHost, undefined);
    assert.equal(declareSeries(s, "f.ahorro.banco", "aparte"), s);
    assert.equal(declareSeries(s, "serie-retiro", "saldo", "f.ahorro.banco"), s);
    assert.equal(declareSeries(s, "serie-que-no-existe", "aparte"), s);
  });

  it("copyRecurring sigue cargando fund y fundHost a la copia del mes siguiente", () => {
    const s = declareSeries(book(), "serie-viaje", "saldo", "f.ahorro.banco");
    const nov = s.months["2026-11"]!.lines.map((l) => l.id === "v-nov" ? { ...l, recurring: true } : l);
    const withRec = { ...s, months: { ...s.months, "2026-11": { lines: nov } } };
    const { state: out, count } = copyRecurring(withRec, "2026-11", "2026-12");
    assert.equal(count, 1);
    const copy = out.months["2026-12"]!.lines.find((l) => (l.seriesId || l.id) === "serie-viaje")!;
    assert.equal(copy.fund, "saldo");
    assert.equal(copy.fundHost, "f.ahorro.banco");
  });
});

describe("pregunta288: la anfitriona — 0, 1, 2+ cuentas (§5.1.1)", () => {
  const none: { id: string; minor: number }[] = [];
  const one = [{ id: "f.ahorro.banco", minor: 70000 }];
  const two = [{ id: "f.ahorro.banco", minor: 70000 }, { id: "f.ahorro.banco2", minor: 30000 }];

  it("preguntar sin elegir no está listo; aparte siempre está listo", () => {
    assert.equal(stampFor("ask", null, "", two).ready, false);
    assert.deepEqual(stampFor("ask", "aparte", "", none), { fund: "aparte", ready: true });
  });

  it("del saldo sin cuentas: listo pero SIN estampa — la declaración espera (§5.1, cero cuentas)", () => {
    assert.deepEqual(stampFor("ask", "saldo", "", none), { ready: true });
  });

  it("con una sola cuenta se amarra solo, sin pregunta inútil", () => {
    assert.deepEqual(stampFor("ask", "saldo", "", one), { fund: "saldo", fundHost: "f.ahorro.banco", ready: true });
  });

  it("con dos o más, la anfitriona es obligada", () => {
    assert.equal(stampFor("ask", "saldo", "", two).ready, false);
    assert.deepEqual(stampFor("ask", "saldo", "f.ahorro.banco2", two), { fund: "saldo", fundHost: "f.ahorro.banco2", ready: true });
  });

  it("las posturas fijas deciden la naturaleza sin selector, pero no la anfitriona", () => {
    assert.deepEqual(stampFor("separate", null, "", none), { fund: "aparte", ready: true });
    assert.equal(stampFor("balance", null, "", two).ready, false);
    assert.deepEqual(stampFor("balance", null, "f.ahorro.banco", two), { fund: "saldo", fundHost: "f.ahorro.banco", ready: true });
  });

  it("hostAccounts enumera las cuentas de bóveda con su stock; el Retiro y los fondos no son cuentas", () => {
    const s = book();
    const hosts = hostAccounts(s, KEY);
    assert.deepEqual(hosts.map((h) => h.id), ["f.ahorro.banco", "f.ahorro.banco2"]);
    assert.equal(hosts[0]!.minor, 70000);
    assert.equal(hosts[1]!.minor, 0); // existe como cuenta aunque aún no tenga saldo: puede ser anfitriona
  });
});

describe("pregunta288: el modo manda solo en la pregunta (§8)", () => {
  it("sin ajuste, el modo es preguntar; un valor inválido también", () => {
    const s = base();
    assert.equal(natureMode(s.settings), "ask");
    assert.equal(natureMode({ ...s.settings, savingsNatureMode: "balance" }), "balance");
    assert.equal(natureMode({ ...s.settings, savingsNatureMode: "separate" }), "separate");
    assert.equal(natureMode({ ...s.settings, savingsNatureMode: "mixto" as never }), "ask");
  });

  it("ningún modo reescribe naturalezas: la partición es idéntica con cualquier ajuste", () => {
    const declared = declareSeries(book(), "serie-viaje", "saldo", "f.ahorro.banco");
    const cls = (s: LedgerState) => [...savingsStock(s, KEY).series.entries()].map(([id, r]) => `${id}:${r.cls}`).sort();
    const a = cls(declared);
    for (const m of ["ask", "balance", "separate"] as const) {
      assert.deepEqual(cls({ ...declared, settings: { ...declared.settings, savingsNatureMode: m } }), a);
    }
  });
});

describe("pregunta288: migración y encuentro — nacimiento y muerte de la pregunta (§5.2, §6.2)", () => {
  it("los fondos sin declarar con su monto son la lista; declarar saca al fondo de ella", () => {
    const s = book();
    const pending = undeclaredFunds(savingsStock(s, KEY));
    assert.deepEqual(pending.map((f) => f.seriesId).sort(), ["serie-emerg", "serie-viaje"]);
    assert.equal(pending.find((f) => f.seriesId === "serie-viaje")?.minor, 25000);
    const out = declareSeries(s, "serie-viaje", "aparte");
    const after = undeclaredFunds(savingsStock(out, KEY));
    assert.deepEqual(after.map((f) => f.seriesId), ["serie-emerg"]);
    // Sin fondos pendientes, la línea de migración no nace: la lista queda vacía.
    const done = declareSeries(out, "serie-emerg", "aparte");
    assert.equal(undeclaredFunds(savingsStock(done, KEY)).length, 0);
  });

  it("el guardia compara contra el Libre de la anfitriona, con las cifras exactas", () => {
    // Cuenta de 700.00; Viaje declarado del saldo por 250.00 → Libre 450.00.
    const s = declareSeries(book(), "serie-viaje", "saldo", "f.ahorro.banco");
    const st = savingsStock(s, KEY);
    assert.equal(libreOf(st, "f.ahorro.banco"), 45000);
    assert.deepEqual(guardFor(st, "f.ahorro.banco", 45000), { libre: 45000, fits: true });
    assert.deepEqual(guardFor(st, "f.ahorro.banco", 45001), { libre: 45000, fits: false });
    // El exceso del encuentro: lo marcado dentro (800.00) supera el saldo (700.00).
    const fresh = savingsStock(book(), KEY);
    assert.equal(guardFor(fresh, "f.ahorro.banco", 80000).fits, false);
    assert.equal(guardFor(fresh, "f.ahorro.banco", 70000).fits, true);
  });

  it("isFundSub separa fondo, Retiro y cuenta dentro del rol de ahorro", () => {
    const s = base();
    assert.equal(isFundSub(s, "f-ahorro", "f.ahorro.meta"), true);
    assert.equal(isFundSub(s, "f-ahorro", "f.ahorro.emergencia"), true);
    assert.equal(isFundSub(s, "f-ahorro", "f.ahorro.retiro"), false);
    assert.equal(isFundSub(s, "f-ahorro", "f.ahorro.banco"), false);
    assert.equal(isFundSub(s, "f-gastos", "f.ahorro.meta"), false);
  });
});

describe("pregunta288: las luces por clase (§7)", () => {
  it("cada serie lleva su clase; el Retiro es «retiro» (sin luz) y la cuenta es «cuenta»", () => {
    let s = book();
    s = declareSeries(s, "serie-viaje", "aparte");
    s = declareSeries(s, "serie-emerg", "saldo", "f.ahorro.banco");
    const st = savingsStock(s, KEY);
    assert.equal(st.series.get("serie-viaje")?.cls, "aparte");
    assert.equal(st.series.get("serie-emerg")?.cls, "saldo");
    assert.equal(st.series.get("serie-retiro")?.cls, "retiro");
    assert.equal(st.series.get("f.ahorro.banco")?.cls, "cuenta");
    const fresh = savingsStock(book(), KEY);
    assert.equal(fresh.series.get("serie-viaje")?.cls, "sin-declarar");
  });
});

describe("pregunta288: Folios — las cinco clases de nota y el anti-fuga (§4.6)", () => {
  it("saveKindOf clasifica la línea; un gasto que solo NOMBRA la cuenta no es entrada de cuenta", () => {
    const s = book();
    assert.equal(saveKindOf(s, dep("a", "f.ahorro.viaje", 100)), "fund");
    assert.equal(saveKindOf(s, dep("b", "f.ahorro.retiro", 100)), "retiro");
    assert.equal(saveKindOf(s, snap("c", "f.ahorro.banco", 100)), "cuenta");
    // La frontera de §4.6: sourceId apuntando a la cuenta NO convierte un gasto en depósito.
    const gasto = line({ id: "g", kind: "expense-variable", concept: "Super", amountMinor: 500, categoryId: "f-gastos", subId: "", sourceId: "f.ahorro.banco" });
    assert.equal(saveKindOf(s, gasto), null);
    assert.equal(saveKindOf(s, line({ id: "h", kind: "income-fixed", concept: "Sueldo", amountMinor: 1000, categoryId: "f-ingresos", subId: "" })), null);
  });

  it("el río levanta saveKind, fund y fundHost de la propia línea; el Retiro y la cuenta no llevan naturaleza", () => {
    let s = book();
    s = declareSeries(s, "serie-viaje", "saldo", "f.ahorro.banco");
    const moves = buildStream(s, { from: "2026-11-01", to: "2026-11-30" });
    const viaje = moves.find((m) => m.lineId === "v-nov")!;
    assert.equal(viaje.saveKind, "fund");
    assert.equal(viaje.fund, "saldo");
    assert.equal(viaje.fundHost, "f.ahorro.banco");
    const retiro = moves.find((m) => m.lineId === "r-nov")!;
    assert.equal(retiro.saveKind, "retiro");
    assert.equal(retiro.fund, undefined);
    const cuenta = moves.find((m) => m.lineId === "b-nov")!;
    assert.equal(cuenta.saveKind, "cuenta");
    const emerg = moves.find((m) => m.lineId === "e-nov")!;
    assert.equal(emerg.saveKind, "fund");
    assert.equal(emerg.fund, undefined); // sin declarar: la nota lo dice, no se inventa naturaleza
  });

  it("anti-fuga: una entrada de ahorro DESCANSANDO no produce movimiento en el río…", () => {
    const s = book();
    const resting = { ...s, months: { ...s.months, "2026-11": { lines: s.months["2026-11"]!.lines.map((l) => l.id === "v-nov" ? { ...l, rest: true } : l) } } };
    const moves = buildStream(resting, { from: "2026-11-01", to: "2026-11-30" });
    assert.equal(moves.some((m) => m.lineId === "v-nov"), false);
  });

  it("…y la luz y la nota VIAJAN con ella al Archivo: la línea descansando conserva sus campos", () => {
    let s = declareSeries(book(), "serie-viaje", "aparte");
    s = {
      ...s,
      restingSpans: [{ id: "span-1", from: "2026-11-01", to: "2026-11-30", hiddenAt: 1, lineIds: ["v-nov"] }],
      months: { ...s.months, "2026-11": { lines: s.months["2026-11"]!.lines.map((l) => l.id === "v-nov" ? { ...l, rest: true } : l) } },
    };
    const entries = restingEntries(s);
    const traveled = entries.flatMap((e) => e.lines).find((l) => l.id === "v-nov");
    assert.ok(traveled, "la línea descansando aparece en el Archivo");
    assert.equal(traveled!.fund, "aparte");
    assert.equal(saveKindOf(s, traveled!), "fund");
  });
});
