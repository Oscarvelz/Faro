// Oleada 2 del corazón (1.3.166): el corazón de la persistencia, solo.
// Las sondas decisivas de la auditoría del corazón (Auditoria_Corazon_Faro_2026-11-08, lente
// «Conecta» C1/C2/C5/C7 y «Procesa» P6) convertidas en pruebas permanentes:
// C1 (la validación de arranque tiene dientes y la cuarentena actúa), C2 (la pestaña vieja se
// detiene), el desempate de sync sin reloj de pared, y el Deshacer importación que respeta las
// ediciones posteriores. Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInitial, isLedger, isLedgerDeep } from "./defaults.ts";
import { listQuarantine, quarantinePack, readQuarantine, storedRevision, tabVerdict, type PackStorage } from "./packguard.ts";
import { pushWins, syncDecision } from "./syncdecide.ts";
import { applyImport, buildReview, revertImport, revertImportCounted, type ParsedFile } from "./bankparse.ts";
import type { Category, LedgerState, Line } from "./types.ts";

// ---------- utilidades ----------
function fakeStorage(seed: Record<string, string> = {}): PackStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    keys: () => [...map.keys()],
  };
}
const UID = "u-test";
const PACK = `faro.pack.${UID}`;
const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
const packOf = (ledger: unknown) => JSON.stringify({ ledger, dirty: false });

// ---------- C1: la validación profunda ----------
describe("C1 — isLedgerDeep: la forma que los motores desreferencian", () => {
  const poisoned = (): LedgerState => {
    const s = clone(createInitial("es", "claro"));
    s.revision = 4;
    const mk = Object.keys(s.months)[0] ?? "2026-11";
    s.months = { [mk]: { lines: "corrupt-string" as never } };
    return s;
  };

  it("el veneno de la auditoría: isLedger lo acepta (el hueco), isLedgerDeep lo rechaza", () => {
    const p = poisoned();
    assert.equal(isLedger(p), true); // documentado: la validación vieja es de presencia
    assert.equal(isLedgerDeep(p), false);
  });

  it("rechaza las demás formas que explotan o silencian el arranque", () => {
    const base = createInitial("es", "claro");
    const cases: Array<[string, (s: LedgerState) => void]> = [
      ["structure = {}", (s) => { s.structure = {} as never; }],
      ["settings = {}", (s) => { s.settings = {} as never; }],
      ["bucket sin lines", (s) => { s.months = { "2026-11": {} as never }; }],
      ["bucket que es un array", (s) => { s.months = { "2026-11": [] as never }; }],
      ["línea que no es objeto", (s) => { s.months = { "2026-11": { lines: ["x"] as never } }; }],
      ["amountMinor = null (NaN por JSON)", (s) => { const l = clone(s.months[Object.keys(s.months)[0]].lines[0]); s.months = { "2026-11": { lines: [{ ...l, amountMinor: null as never }] } }; }],
      ["rateE4 como texto", (s) => { s.settings = { ...s.settings, rateE4: "abc" as never }; }],
      ["imports.sources que no es array", (s) => { s.imports = { sources: "x" as never, rules: [], maps: {} }; }],
    ];
    // createInitial puede nacer sin líneas según el mes: garantizamos una línea para el caso amountMinor.
    for (const [name, spoil] of cases) {
      const s = clone(base);
      if (!Object.values(s.months).some((m) => m.lines.length)) {
        const l: Line = { id: "x1", seriesId: "x1", monthKey: "2026-11", kind: "income-fixed", concept: "Sueldo", amountMinor: 1000, currency: "NIO", active: true, note: "", categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO", icon: "", history: [] };
        s.months = { "2026-11": { lines: [l] } };
      }
      spoil(s);
      assert.equal(isLedgerDeep(s), false, name);
    }
  });

  it("acepta los libros legítimos: el inicial, el de forma vieja sin opcionales, el usado", () => {
    assert.equal(isLedgerDeep(createInitial("es", "claro")), true);
    assert.equal(isLedgerDeep(createInitial("en", "tron")), true);
    // Forma vieja (sonda p3 de migraciones): sin ningún campo opcional moderno.
    const old = clone(createInitial("es", "claro")) as Partial<LedgerState>;
    delete old.people; delete old.imports; delete old.loans; delete old.lent; delete old.cards; delete old.remitPeople; delete old.debtPlan;
    const st = old.settings as unknown as Record<string, unknown>;
    delete st.notify; delete st.seeds; delete st.shortcuts; delete st.gestures;
    assert.equal(isLedgerDeep(old), true);
  });
});

describe("C1 — la cuarentena actúa, y la rotación protege la copia buena (C4/C5)", () => {
  it("pack truncado (JSON ilegible): se aparta con el crudo exacto", () => {
    const raw = '{"ledger":{"v":1,"structure":';
    const store = fakeStorage({ [PACK]: raw });
    assert.equal(quarantinePack(store, UID, { now: 1000 }), true);
    assert.equal(readQuarantine(store, UID, 1000), raw);
  });

  it("pack con corrupción de campo (pasa isLedger): TAMBIÉN se aparta — el arreglo C1", () => {
    const s = clone(createInitial("es", "claro"));
    s.months = { "2026-11": { lines: "corrupt-string" as never } };
    const store = fakeStorage({ [PACK]: packOf(s) });
    assert.equal(quarantinePack(store, UID, { now: 1000 }), true);
    const entries = listQuarantine(store, UID);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].ok, false); // apartada, pero no restaurable: está dañada
  });

  it("pack sano: no se aparta nada; sin pack (primer arranque): jamás cuarentena", () => {
    const store = fakeStorage({ [PACK]: packOf(createInitial("es", "claro")) });
    assert.equal(quarantinePack(store, UID), false);
    assert.equal(listQuarantine(store, UID).length, 0);
    const empty = fakeStorage();
    assert.equal(quarantinePack(empty, UID), false);
    assert.equal(listQuarantine(empty, UID).length, 0);
  });

  it("el mismo crudo dos veces no duplica la copia (dedupe por contenido)", () => {
    const store = fakeStorage({ [PACK]: "{broken" });
    assert.equal(quarantinePack(store, UID, { now: 1000 }), true);
    assert.equal(quarantinePack(store, UID, { now: 2000 }), true);
    assert.equal(listQuarantine(store, UID).length, 1);
  });

  it("rotación: un bucle de corrupción nunca expulsa la última copia buena", () => {
    const store = fakeStorage({ [PACK]: packOf(createInitial("es", "claro")) });
    // La copia buena entra por la vía forzada (el catch del arranque: el pack existía y el arranque falló).
    assert.equal(quarantinePack(store, UID, { force: true, now: 1000 }), true);
    for (const t of [2000, 3000, 4000, 5000]) {
      store.map.set(PACK, `{broken-${t}`);
      assert.equal(quarantinePack(store, UID, { now: t }), true);
    }
    const entries = listQuarantine(store, UID);
    assert.deepEqual(entries.map((e) => e.ts), [5000, 4000, 3000, 1000]); // las 3 nuevas + la buena fijada
    assert.equal(entries.find((e) => e.ts === 1000)?.ok, true);
    // Control: sin copia buena, el tope es 3 como siempre.
    const store2 = fakeStorage();
    for (const t of [1, 2, 3, 4]) { store2.map.set(PACK, `{bad-${t}`); quarantinePack(store2, UID, { now: t }); }
    assert.deepEqual(listQuarantine(store2, UID).map((e) => e.ts), [4, 3, 2]);
  });

  it("la lista dice la fecha y si la copia es un libro legible (la puerta de Ajustes)", () => {
    const store = fakeStorage({ [PACK]: packOf(createInitial("es", "claro")) });
    quarantinePack(store, UID, { force: true, now: 1000 });
    store.map.set(PACK, "{broken");
    quarantinePack(store, UID, { now: 2000 });
    const entries = listQuarantine(store, UID);
    assert.equal(entries[0].ts, 2000); assert.equal(entries[0].ok, false);
    assert.equal(entries[1].ts, 1000); assert.equal(entries[1].ok, true);
    assert.equal(entries[1].at, new Date(1000).toISOString());
  });
});

// ---------- C2: la pestaña vieja se detiene ----------
describe("C2 — tabVerdict: el sello de revisión manda entre pestañas", () => {
  it("la pestaña única y el primer arranque escriben como siempre", () => {
    assert.equal(tabVerdict(null, null, 1, false), "write"); // primer arranque
    assert.equal(tabVerdict(null, 4, 5, true), "write"); // sin pack guardado: nada que pisar
    assert.equal(tabVerdict(4, null, 4, false), "write"); // esta pestaña aún no cargó sello
    assert.equal(tabVerdict(4, 4, 4, false), "write"); // el almacén está donde lo dejamos
    assert.equal(tabVerdict(3, 4, 5, true), "write"); // el almacén va detrás de nosotros
  });

  it("el almacén se movió y no tenemos ediciones: adoptar el libro guardado", () => {
    assert.equal(tabVerdict(5, 4, 4, false), "adopt");
  });

  it("el almacén se movió y tenemos ediciones sin guardar: salir a la superficie, nunca pisar", () => {
    assert.equal(tabVerdict(5, 4, 5, true), "surface");
    assert.equal(tabVerdict(5, 4, 5, false), "surface"); // sesión por delante del sello = hay trabajo nuestro
  });

  it("storedRevision lee el sello del crudo y no inventa", () => {
    assert.equal(storedRevision(packOf({ revision: 7 })), 7);
    assert.equal(storedRevision("{broken"), null);
    assert.equal(storedRevision(null), null);
    assert.equal(storedRevision(packOf({})), null);
  });
});

// ---------- Sync: desempate sin reloj de pared (C7/W5) ----------
describe("Sync — la revisión decide; el reloj nunca vota", () => {
  it("la tabla de decisiones (réplica p4 de la auditoría, con la regla nueva)", () => {
    // S1: ediciones sin conexión (dirty, rev 10) contra nube rev 9 → empujar.
    assert.equal(syncDecision({ revision: 9 }, { revision: 10, dirty: true }), "push");
    // S2: local limpio por delante de la nube → empujar (se reafirma, como hoy).
    assert.equal(syncDecision({ revision: 9 }, { revision: 10, dirty: false }), "push");
    // S3: nube con revisión mayor, local con ediciones → aplicar remoto (lo local se aparta a conflicto).
    assert.equal(syncDecision({ revision: 11 }, { revision: 10, dirty: true }), "apply-remote");
    // S4: igual revisión, local dirty → empujar; el servidor arbitra y el perdedor vuelve como conflicto.
    assert.equal(syncDecision({ revision: 10 }, { revision: 10, dirty: true }), "push");
    // S5: igual revisión, local limpio → se queda el incumbente. HOY el reloj reemplazaba en silencio.
    assert.equal(syncDecision({ revision: 10 }, { revision: 10, dirty: false }), "saved");
    // S6: sin nube y limpio → local (nada que empujar, como hoy).
    assert.equal(syncDecision(null, { revision: 1, dirty: false }), "local");
    // S7: sin nube y dirty → empujar.
    assert.equal(syncDecision(null, { revision: 2, dirty: true }), "push");
    // Determinismo: mismas revisiones, misma decisión, siempre.
    assert.equal(syncDecision({ revision: 10 }, { revision: 10, dirty: false }), syncDecision({ revision: 10 }, { revision: 10, dirty: false }));
  });

  it("pushWins: solo la revisión mayor gana; el empate conserva al incumbente", () => {
    assert.equal(pushWins(null, { revision: 1, dataJson: "A" }), true); // primera vez
    assert.equal(pushWins({ revision: 9, dataJson: "A" }, { revision: 10, dataJson: "B" }), true);
    assert.equal(pushWins({ revision: 10, dataJson: "A" }, { revision: 9, dataJson: "B" }), false);
    // C7/W5: a igual revisión, un reloj adelantado NO gana — el contenido distinto se rechaza.
    assert.equal(pushWins({ revision: 10, dataJson: "A" }, { revision: 10, dataJson: "B" }), false);
    // Re-empuje idempotente (el mismo contenido): gana sin tocar nada.
    assert.equal(pushWins({ revision: 10, dataJson: "A" }, { revision: 10, dataJson: "A" }), true);
  });
});

// ---------- P6: Deshacer importación respeta ediciones posteriores ----------
// Construcción espejo de la sonda p2 de la auditoría (helpers sintéticos).
const sub = (id: string, name: string) => ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0 });
const cat = (id: string, group: "fixed" | "variable", name: string, subs: [string, string][], role = ""): Category =>
  ({ id, nameKey: "", customName: name, icon: "Circle", hidden: false, order: 0, group, role, subs: subs.map(([a, b]) => sub(a, b)) });
function ledger(): LedgerState {
  return {
    v: 1, revision: 1, updatedAt: "", audit: [], months: {},
    settings: { lang: "es", theme: "claro", display: "USD", rateE4: 366243, rateSource: "", rateAsOf: "", savingsGoalPct: 20, debtGreenPct: 30, debtYellowPct: 40, emergencyMonths: 3, shortcuts: {} },
    structure: {
      categories: [
        cat("f-alimentos", "fixed", "Alimentos", [["f.alimentos.despensa", "Despensa"]]),
        cat("f-ahorro", "fixed", "Ahorro", [["f.ahorro.retiro", "Retiro"]], "savings"),
        cat("v-personales", "variable", "Personales", [["v.p.otros", "Otros"]]),
      ],
      purchases: [{ id: "otros", nameKey: "", customName: "Otros", icon: "Package", hidden: false, order: 0 }],
      catalog: [],
    },
  } as LedgerState;
}
const names = { cat: (id: string) => id, sub: (id: string) => id, purchase: (id: string) => id };
let seq = 0;
function manual(partial: Partial<Line>): Line {
  const id = `m-${++seq}`;
  return {
    id, seriesId: id, monthKey: "2026-10", kind: "expense-variable", concept: "Amazon", amountMinor: 2599, currency: "USD",
    active: true, note: "", categoryId: "v-personales", subId: "v.p.otros", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "USD",
    icon: "", history: [], bookedOn: "2026-10-28", startedOn: "", ...partial,
  } as Line;
}
function withLines(state: LedgerState, lines: Line[]): LedgerState {
  const months = { ...state.months };
  for (const l of lines) months[l.monthKey] = { lines: [...(months[l.monthKey]?.lines ?? []), l] };
  return { ...state, months };
}
const allLines = (s: LedgerState) => Object.values(s.months).flatMap((b) => b.lines);
const cardFile = (rows: ParsedFile["rows"], extra: Partial<ParsedFile> = {}): ParsedFile =>
  ({ name: "tarjeta.csv", format: "csv", bank: "chase", kind: "card", sig: "csv:chase-test", rows, ...extra });
const editLine = (s: LedgerState, id: string, patch: Partial<Line>): LedgerState => ({
  ...s,
  months: Object.fromEntries(Object.entries(s.months).map(([k, b]) => [k, { lines: b.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) }])),
});

/** El caso P6: la copia de la tarjeta ya está en el libro; el archivo de PayPal la renombra (mods). */
function modsCase() {
  const s0 = withLines(ledger(), [manual({ concept: "PAYPAL *STEAMGAMES", amountMinor: 1999, bookedOn: "2026-10-10", sourceId: "acct-chase-card" })]);
  const pp = cardFile([{ date: "2026-10-10", amount: -1999, desc: "STEAMGAMES", name: "Steamgames", id: "PP1", type: "Payment" }], { bank: "paypal", kind: "paypal", sig: "csv:paypal", name: "pp.csv" });
  const rv = buildReview(s0, [pp], ["acct-paypal"], names, "es");
  assert.equal(rv.mods.length, 1);
  const { state: after, undo } = applyImport(s0, rv, [pp], ["acct-paypal"], "b-mods");
  const mid = allLines(after).find((l) => l.id === rv.mods[0].id)!;
  return { s0, after, undo, mid };
}

describe("P6 — el Deshacer del lote solo deshace lo que el lote aún posee", () => {
  it("control: sin ediciones posteriores, el deshacer restaura la línea como hoy", () => {
    const { after, undo, mid } = modsCase();
    assert.match(mid.concept, /^Steamgames/); // el import la renombró
    const { state: back, preserved } = revertImportCounted(after, undo);
    assert.equal(preserved, 0);
    assert.equal(allLines(back).find((l) => l.id === mid.id)?.concept, "PAYPAL *STEAMGAMES");
    // El envoltorio histórico coincide con el algoritmo de siempre.
    assert.deepEqual(revertImport(after, undo), back);
  });

  it("la edición del usuario DESPUÉS del import sobrevive al deshacer (la sonda P6)", () => {
    const { after, undo, mid } = modsCase();
    const edited = editLine(after, mid.id, { concept: "Nombre corregido por Oscar" });
    const { state: back, preserved } = revertImportCounted(edited, undo);
    assert.equal(preserved, 1);
    assert.equal(allLines(back).find((l) => l.id === mid.id)?.concept, "Nombre corregido por Oscar");
    assert.equal(allLines(revertImport(edited, undo)).find((l) => l.id === mid.id)?.concept, "Nombre corregido por Oscar");
  });

  it("líneas creadas por el lote: intactas salen, editadas se quedan", () => {
    const s0 = ledger();
    const f = cardFile([{ date: "2026-10-05", amount: -5000, desc: "COMPRA NUEVA" }, { date: "2026-10-06", amount: -7000, desc: "OTRA COMPRA" }]);
    const rv = buildReview(s0, [f], ["acct-chase-card"], names, "es");
    const { state: after, undo } = applyImport(s0, rv, [f], ["acct-chase-card"], "b-new");
    const created = allLines(after).filter((l) => l.batch === "b-new");
    assert.equal(created.length, 2);
    const edited = editLine(after, created[0].id, { amountMinor: 5555 });
    const { state: back, preserved } = revertImportCounted(edited, undo);
    assert.equal(preserved, 1);
    const kept = allLines(back);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].id, created[0].id);
    assert.equal(kept[0].amountMinor, 5555);
  });

  it("un lote legado (sin procedencia registrada) conserva el comportamiento de hoy, sin ganar poder", () => {
    const { after, undo, mid } = modsCase();
    const edited = editLine(after, mid.id, { concept: "Nombre corregido por Oscar" });
    const legacy = { ...undo }; delete legacy.written;
    const { state: back, preserved } = revertImportCounted(edited, legacy);
    assert.equal(preserved, 0);
    // Comportamiento histórico documentado: la línea vuelve a su estado previo al import.
    assert.equal(allLines(back).find((l) => l.id === mid.id)?.concept, "PAYPAL *STEAMGAMES");
  });
});
