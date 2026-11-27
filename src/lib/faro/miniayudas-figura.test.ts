// 1.3.494 · EL CENSO DE MINI-AYUDAS CON FIGURA — LA CURA
// El censo (ESTUDIO-MINIAYUDAS.md) midió: de 114 burbujas, ninguna tenía la
// puerta de la hoja de cálculo (el asiento calc del Hint → Explain), y 8 eran
// FORMA en palabras solas. Esta cerca guarda la cura de las 4 fuertes:
// - regla-ritmo y regla-colchon (y el piso, tema colchon) nacen en rules.ts
//   con su `explain` calculado con las cifras vivas de la regla misma.
// - En Ritmo, la hoja del ritmo DESCRIBE y no proyecta (la misma ley BR-3
//   de la fila: ni saldo de cierre ni fecha de agotamiento).
// - apartado-mes gana su Explain en la cabecera del apartado (screens.tsx)
//   con textos ES+EN en i18n (vault.aside.calc.*).
// - El colchón de Estudio pasa su explain por la Head de panorama.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { adviceRules, type Rule } from "./rules.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-10";
const TODAY = new Date(2026, 9, 10, 12);

function line(p: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">, key = KEY): Line {
  return {
    seriesId: p.id, monthKey: key, currency: "USD", active: true, note: "", categoryId: "", subId: "", recurring: false,
    storeId: "", providerId: "", productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
    balanceCurrency: "USD", icon: "", history: [], ...p, id: `${p.id}-${key}`,
  };
}
type Row = [string, LineKind, string, number, string?, string?, Partial<Line>?];
function ledgerOf(months: Record<string, Row[]>, mode?: "ritmo" | "completo"): LedgerState {
  const l = createInitial("es", "claro");
  l.settings.display = "USD";
  l.settings.rateE4 = 366243;
  l.settings.emergencyMonths = 3;
  if (mode) l.settings.mode = mode;
  for (const [k, rows] of Object.entries(months)) {
    l.months[k] = { lines: rows.map(([id, kind, concept, amountMinor, categoryId = "", subId = "", extra = {}]) => line({ id, kind, concept, amountMinor, categoryId, subId, ...extra }, k)) };
  }
  return l;
}
const run = (l: LedgerState, lang: "es" | "en" = "es") => adviceRules(l, KEY, lang, makeNamer(l.structure, lang), { today: TODAY });
const pick = (rs: Rule[], id: Rule["id"]) => rs.find((r) => r.id === id);
const base: Row[] = [
  ["pay", "income-fixed", "Salario", 300000],
  ["rent", "expense-fixed", "Renta", 90000, "f-casa", "f.casa.renta"],
  ["food", "expense-fixed", "Despensa", 40000, "f-alimentos", "f.alimentos.despensa"],
  ["var", "expense-variable", "Mercado", 20000, "f-alimentos", "f.alimentos.despensa"],
];

describe("494 · las reglas FORMA nacen con su hoja de cálculo", () => {
  it("el ritmo (Completo) trae explain con las cifras vivas de la fila", () => {
    const r = pick(run(ledgerOf({ [KEY]: base })), "pace")!;
    assert.ok(r, "la regla de ritmo nace");
    assert.ok(r.explain, "y trae su hoja");
    assert.ok(r.explain!.meaning.length > 30);
    assert.match(r.explain!.formula, /\$/);
    assert.equal(r.explain!.implication, r.say, "la implicación es la frase de la fila, no otra");
  });

  it("el ritmo en Ritmo describe en su hoja: no proyecta (BR-3)", () => {
    const r = pick(run(ledgerOf({ [KEY]: base }, "ritmo")), "pace")!;
    assert.ok(r?.explain, "la hoja existe también en Ritmo");
    assert.doesNotMatch(r.explain!.formula, /se acaba|runs out/i);
    assert.doesNotMatch(r.explain!.implication, /cierras el mes|close the month/i);
  });

  it("el colchón trae su hoja con los meses y la brecha a la meta", () => {
    const l = ledgerOf({ [KEY]: [...base, ["em", "expense-fixed", "Emergencia", 0, "f-ahorro", "f.ahorro.emergencia", { balanceMinor: 389000 }]] });
    const r = pick(run(l), "cushion")!;
    assert.ok(r?.explain, "la regla del colchón trae su hoja");
    assert.match(r.explain!.formula, /2[.,]5/, "los meses vivos van en la fórmula (389000 ÷ 150000 de esencial)");
    assert.match(r.explain!.implication, /\$610\.00/, "la brecha a la meta va nombrada (450000 − 389000)");
    const en = pick(run(l, "en"), "cushion")!;
    assert.ok(en.explain && en.explain.formula !== r.explain!.formula, "la hoja también nace en inglés");
  });

  it("solo las reglas FORMA llevan hoja: 5 asientos en rules.ts (ritmo ×3, colchón, piso)", () => {
    const src = SRC("./rules.ts");
    assert.equal((src.match(/explain: \{/g) ?? []).length, 5);
    for (const id of ["due", "category", "outlier", "goal"]) {
      const r = pick(run(ledgerOf({ [KEY]: base })), id as Rule["id"]);
      if (r) assert.equal(r.explain, undefined, `${id} es veredicto o hecho: su (?) queda en burbuja`);
    }
  });
});

describe("494 · las puertas en las superficies", () => {
  it("la fila del Asesor abre Explain cuando la regla trae hoja", () => {
    assert.ok(SRC("../../components/faro/advisor2.tsx").includes("r.explain ? <Explain"), "advisor2 pinta la hoja de la regla");
  });

  it("el apartado del mes gana su Explain con textos ES+EN", () => {
    assert.ok(SRC("../../components/faro/screens.tsx").includes("<Explain topic=\"apartado-mes\""), "la cabecera del apartado abre la hoja");
    const i18n = SRC("./i18n.ts");
    for (const k of ["vault.aside.calc.what", "vault.aside.calc.part", "vault.aside.calc.noin", "vault.aside.calc.gap", "vault.aside.calc.met", "vault.aside.calc.so"]) {
      assert.equal((i18n.match(new RegExp(`"${k}"`, "g")) ?? []).length, 2, `${k} existe en ES y en EN`);
    }
  });

  it("el colchón de Estudio pasa su hoja por la Head", () => {
    assert.ok(SRC("../../components/faro/study2.tsx").includes("cushionExplain"), "CushionCard arma su hoja");
    assert.ok(SRC("../../components/faro/panorama.tsx").includes("explain?: {"), "la Head sabe pintar Explain en vez de Hint");
  });
});
