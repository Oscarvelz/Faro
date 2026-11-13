// El patrón de ritmo (1.3.248) — los TRES lectores de patron.ts: la regla del
// Asesor (rules.ts), la nota de Central (coach.ts) y la notificación vía la foto
// del widget (widget.ts → FaroNotify). Un solo modelo: las superficies no pueden
// contar historias distintas. Datos sintéticos.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { adviceRules } from "./rules.ts";
import { readCoach } from "./coach.ts";
import { paceReading, paceSay } from "./patron.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { formatMoney } from "./money.ts";
import type { Charge, LedgerState, Line, LineKind } from "./types.ts";

const KEY = "2026-11"; // 30 días; el 12 es el 40% del mes.
const TODAY = new Date(2026, 10, 12, 12);

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">, key: string): Line {
  return {
    seriesId: p.id, monthKey: key, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "USD", icon: "", history: [], ...p, id: `${p.id}-${key}`,
  };
}
const ch = (date: string, amountMinor: number): Charge => ({ id: `c-${date}-${amountMinor}`, date, amountMinor, currency: "USD", note: "" });
type Row = [string, LineKind, string, number, Partial<Line>?];
function ledgerOf(months: Record<string, Row[]>): LedgerState {
  const l = createInitial("es", "claro");
  l.settings.display = "USD";
  l.settings.rateE4 = 366243;
  for (const [k, rows] of Object.entries(months)) {
    l.months[k] = { lines: rows.map(([id, kind, concept, amountMinor, extra = {}]) => line({ id, kind, concept, amountMinor, ...extra }, k)) };
  }
  return l;
}
/** El mes del pagador de inicio (USD): renta d2, servicios d4, subs d6, cola variable. Total 182000. */
const frontMonth = (k: string): Row[] => [
  ["rent", "expense-fixed", "Renta", 150000, { categoryId: "f-casa", history: [ch(`${k}-02`, 150000)] }],
  ["util", "expense-fixed", "Servicios", 18000, { categoryId: "f-casa", history: [ch(`${k}-04`, 18000)] }],
  ["subs", "expense-fixed", "Suscripciones", 2000, { categoryId: "f-casa", history: [ch(`${k}-06`, 2000)] }],
  ["var", "expense-variable", "Variable", 12000, { categoryId: "v-personales", history: [ch(`${k}-09`, 3000), ch(`${k}-15`, 3000), ch(`${k}-21`, 3000), ch(`${k}-27`, 3000)] }],
];
const payRow: Row = ["pay", "income-fixed", "Salario", 300000, {}];
const readyBook = (cur: Row[]): LedgerState => ledgerOf({
  "2026-08": frontMonth("2026-08"), "2026-09": frontMonth("2026-09"), "2026-10": frontMonth("2026-10"),
  [KEY]: [payRow, ...cur],
});
const names = (l: LedgerState) => makeNamer(l.structure, "es");

describe("lector 1 — la regla de ritmo del Asesor", () => {
  it("con el patrón listo, la superficie de la regla ES el patrón: frase, tono y cifras de paceSay", () => {
    const l = readyBook(frontMonth(KEY));
    const r = adviceRules(l, KEY, "es", names(l), { today: TODAY }).find((x) => x.id === "pace")!;
    assert.ok(r, "la regla existe");
    assert.equal(r.kicker, "Contra tu patrón");
    assert.equal(r.v.verdict, "on");
    assert.equal(r.v.pSpent, 173000);
    assert.equal(r.v.pExpected, 173000);
    assert.equal(r.v.pProjected, 182000);
    assert.equal(r.num, formatMoney(182000, "USD", "es"), "el número es el cierre que el patrón proyecta, no la recta");
    assert.equal(r.tone, "calm");
    assert.ok(r.say.includes("tu patrón"), "la frase nombra su comparación");
  });

  it("bajo su ritmo, la regla canta «good» con el delta exacto del patrón", () => {
    const l = readyBook(frontMonth(KEY).filter(([id]) => id !== "util"));
    const r = adviceRules(l, KEY, "es", names(l), { today: TODAY }).find((x) => x.id === "pace")!;
    assert.equal(r.v.verdict, "under");
    assert.equal(r.v.pDelta, -18000);
    assert.equal(r.tone, "good");
    assert.ok(r.say.includes("bajo tu propio ritmo"));
  });

  it("sin gasto variable, el patrón solo también enciende la regla (el pagador de puros fijos)", () => {
    const fixedOnly = frontMonth(KEY).filter(([id]) => id !== "var");
    const l = readyBook(fixedOnly);
    const r = adviceRules(l, KEY, "es", names(l), { today: TODAY }).find((x) => x.id === "pace")!;
    assert.ok(r, "la regla existe aunque el gasto variable sea cero");
    assert.equal(r.v.spent, 0, "el andamiaje variable no vio nada");
    assert.equal(r.v.verdict, "on");
    assert.equal(r.v.pSpent, 170000);
  });

  it("mientras aprende (un mes cerrado), la regla conserva su superficie de siempre, intacta", () => {
    const l = ledgerOf({ "2026-10": frontMonth("2026-10"), [KEY]: [payRow, ...frontMonth(KEY)] });
    const r = adviceRules(l, KEY, "es", names(l), { today: TODAY }).find((x) => x.id === "pace")!;
    assert.ok(r, "la regla existe");
    assert.equal(r.v.perDay, 1000, "el promedio diario variable de siempre: 12000 ÷ 12");
    assert.equal(r.v.verdict, undefined, "sin veredicto del patrón todavía");
    assert.ok(r.kicker.includes("al día"));
  });
});

describe("lector 2 — la nota de ritmo de Central (coach)", () => {
  it("con el patrón listo, la nota ES la frase del patrón — la misma del Asesor", () => {
    const l = readyBook(frontMonth(KEY).filter(([id]) => id !== "util"));
    const coach = readCoach(l, KEY, "es", names(l), TODAY);
    const rd = paceReading(l, KEY, TODAY);
    assert.equal(coach.paceNote, paceSay(rd, "es", (n) => formatMoney(n, "USD", "es"), coach.income).say);
    assert.ok(coach.paceNote.includes("bajo tu propio ritmo"));
  });

  it("mientras aprende, la nota avisa honesto y debajo corre el andamiaje de siempre", () => {
    const l = ledgerOf({ "2026-10": frontMonth("2026-10"), [KEY]: [payRow, ...frontMonth(KEY)] });
    const coach = readCoach(l, KEY, "es", names(l), TODAY);
    assert.ok(coach.paceNote.startsWith("Todavía estoy aprendiendo tu patrón"), "el aviso va primero");
    assert.ok(coach.paceNote.includes("al día"), "y el promedio diario sigue diciendo lo suyo");
  });

  it("sin datos no hay aviso ni patrón: la frase de arranque de siempre", () => {
    const l = ledgerOf({ [KEY]: [] });
    const coach = readCoach(l, KEY, "es", names(l), TODAY);
    assert.equal(coach.paceNote, "Anota ingresos y gastos para ver tu ritmo.");
  });
});

describe("lector 3 — el bloque pace de la foto del widget", () => {
  it("la foto lleva la lectura exacta del patrón: estado, veredicto y cifras", () => {
    const l = readyBook(frontMonth(KEY).filter(([id]) => id !== "util"));
    const snap = buildWidgetSnapshot(l, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.deepEqual(snap.pace, { status: "ready", verdict: "under", spent: 155000, expected: 173000, projected: 164000, income: 300000 });
  });

  it("mientras aprende, la foto lo dice: estado learning y veredicto null", () => {
    const l = ledgerOf({ "2026-10": frontMonth("2026-10"), [KEY]: [payRow, ...frontMonth(KEY)] });
    const snap = buildWidgetSnapshot(l, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.equal(snap.pace.status, "learning");
    assert.equal(snap.pace.verdict, null);
    assert.equal(snap.pace.spent, 173000, "lo gastado con fecha sí se describe");
    assert.equal(snap.pace.income, 300000);
  });
});

describe("el shell — la costura de la notificación", () => {
  it("la foto se parsea con su bloque pace y checkPace juzga por él; la recta queda verbatim como respaldo", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const notify = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroNotify.kt"), "utf8");
    assert.match(widgets, /class Pace\(/);
    assert.match(widgets, /optJSONObject\("pace"\)/);
    // Listo: la puerta es el veredicto del patrón o el hecho (gasto ≥ ingreso).
    assert.match(notify, /pace\.status == "ready"/);
    assert.match(notify, /pace\.verdict != "over"/);
    // El cuerpo del aviso nombra el patrón y gasta SUS cifras, no las de la recta.
    assert.ok(notify.includes("tu patrón suele llevar"), "el cuerpo nombra el patrón");
    assert.match(notify, /pace\.projected/);
    assert.match(notify, /pace\.expected/);
    // 'your' jamás en mayúsculas en la prosa del patrón (corrección de Oscar, 2026-11-12).
    assert.ok(!notify.includes("YOUR"), "sin «YOUR» en mayúsculas");
    // Respaldo por degradación: sin bloque, la recta original sigue escrita tal cual.
    assert.match(notify, /s\.spend \* dim \/ elapsed/);
    assert.ok(notify.includes("A este ritmo cerrarías en"), "la frase de la recta sobrevive como respaldo");
  });

  it("el registro de la puerta (descanso.ts) nombra a patron.ts entre sus lectores", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/faro/descanso.ts"), "utf8");
    assert.ok(src.includes("patron.ts"), "el registro nombra al patrón");
    assert.ok(src.includes("pacePattern/paceReading"), "y nombra sus dos lecturas");
  });
});
