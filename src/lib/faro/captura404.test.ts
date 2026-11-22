/**
 * captura404 — Debo con acabado (Oscar, 2026-11-22, dos fotos): la tarjeta
 * del préstamo «Banco» se sentía sin terminar — un gris pizarra que no es
 * de ningún tema y tres líneas de hechos sueltas flotando sobre él; y el
 * Plan de pago se veía plano, sin color amigo de base, con sus textos
 * también sueltos. La cura: la tarjeta y el plan toman su base del acento
 * del tema elegido (nunca un gris propio), y los hechos viven en bandejas
 * hundidas con sus filas separadas.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const debtsCss = read("../../components/faro/debts.css");
const loans = read("../../components/faro/loans.tsx");

describe("404 · la tarjeta de préstamo: fuera el gris, hechos en su bandeja", () => {
  it("ninguna regla de la tarjeta de préstamo en Libros pinta el gris pizarra #1d2227", () => {
    const cardRules = debtsCss.split("\n").filter((l) => l.includes(".debt-loans .cobro-swap > .cobro-card"));
    assert.ok(cardRules.length >= 2, "las reglas de la tarjeta existen");
    for (const l of cardRules) assert.ok(!l.includes("#1d2227"), `sin pizarra: ${l.slice(0, 60)}`);
  });
  it("la base de la tarjeta nace del acento del tema", () => {
    assert.ok(debtsCss.includes("border: 1px solid color-mix(in oklab, var(--accent) 16%, var(--line))"), "el borde es de la familia del acento");
    assert.ok(debtsCss.includes("background: color-mix(in oklab, var(--accent) 5%, var(--surface))"), "los temas noche toman el acento, no la pizarra");
  });
  it("los hechos de la tarjeta viven en la bandeja loan-facts", () => {
    assert.ok(loans.includes('className="loan-facts"'), "la tarjeta envuelve sus hechos");
    assert.ok(debtsCss.includes(".cobro-card .loan-facts {"), "la bandeja tiene su superficie");
    assert.ok(debtsCss.includes(".loan-facts .cobro-meta + .cobro-meta"), "las filas se separan");
  });
});

describe("404 · el Plan de pago: color amigo de base, textos con casa", () => {
  it("la base del plan es el acento del tema, suave", () => {
    assert.ok(debtsCss.includes(".debt-plan { background: color-mix(in oklab, var(--accent) 5%"), "el plan lleva su color amigo");
    assert.ok(debtsCss.includes("border-color: color-mix(in oklab, var(--accent) 20%, var(--line))"), "y su borde de la misma familia");
  });
  it("los tres hechos del plan viven en una bandeja hundida, no entre dos rayitas", () => {
    assert.ok(debtsCss.includes(".plan-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 10px 12px; border-radius: 12px; background: color-mix(in oklab, var(--bg) 34%, transparent)"), "la bandeja de hechos");
  });
  it("la explicación del orden va sobre su bandeja con riel de acento", () => {
    assert.ok(debtsCss.includes(".debt-plan .plan-why {"), "la explicación tiene casa");
    assert.ok(debtsCss.includes("border-left: 2px solid color-mix(in oklab, var(--accent) 55%, transparent)"), "con su riel");
  });
});
