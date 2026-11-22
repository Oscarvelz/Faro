/**
 * captura402 — la ola de Central de Oscar (2026-11-22): fuera el
 * intermediario de Pagos (su cerca vive en captura353, enmendada), y
 * tres cosas más de sus fotos: la pantalla SUBE al abrir las hojas de
 * las fichas (se despliegan desde arriba, no desde el medio); la
 * tarjeta «Pagos que se acercan» se pliega a una línea de resumen
 * real; y la puerta del editor deja el lápiz que la confundía con
 * Escribir.
 *
 * ENMIENDA 1.3.402 (la misma ola, antes de publicar): el ícono nuevo
 * nació como ListPlus, pero el banco de la ola mostró que «Lista»
 * ya viste ListPlus en el mismo selector — dos puertas con el mismo
 * glifo. La puerta del editor lleva ClipboardList: la hoja con
 * renglones, suya y de nadie más en el selector.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const screens = read("../../components/faro/screens.tsx");
const dueAlerts = read("../../components/faro/due-alerts.tsx");

describe("402 · la pantalla sube: las hojas se despliegan desde arriba", () => {
  it("la ventana rápida y el selector se revelan con revealEditor, no con «nearest»", () => {
    assert.ok(screens.includes("revealEditor(quickRef.current)"), "la ventana rápida sube");
    assert.ok(screens.includes("revealEditor(chooseRef.current)"), "el selector sube");
    assert.ok(!screens.includes("quickRef.current?.scrollIntoView"), "sin «nearest» en la ventana rápida");
    assert.ok(!screens.includes("chooseRef.current?.scrollIntoView"), "sin «nearest» en el selector");
  });

  it("Cobros nace y vuelve desde arriba, no desde el medio", () => {
    assert.ok(screens.includes("revealEditor(box.current)"), "al nacer, Cobros se revela desde arriba");
    assert.ok(screens.includes("if (ping !== firstPing.current) revealEditor(el);"), "al llamarlo, sube entero");
    assert.ok(!screens.includes('scrollIntoView({ block: "nearest" })'), "ningún «nearest» queda en Cobros");
  });
});

describe("402 · «Pagos que se acercan» se pliega a su resumen", () => {
  it("la tarjeta nace plegada, recuerda su estado y despliega con su ancla", () => {
    assert.ok(dueAlerts.includes('data-anchor="due-alerts-toggle"'), "el despliegue tiene su ancla");
    assert.ok(dueAlerts.includes('localStorage.getItem("faro-due-alerts-open")'), "su estado se recuerda");
    assert.ok(dueAlerts.includes("aria-expanded={open}"), "el estado se anuncia");
    assert.ok(dueAlerts.includes("{open ? ("), "el detalle solo vive desplegado");
  });

  it("el resumen es real: cuenta vencidos y por venir desde los avisos vivos", () => {
    assert.ok(dueAlerts.includes("alerts.filter((a) => days(a.on) < 0).length"), "los vencidos se cuentan de lo vivo");
    assert.ok(dueAlerts.includes("alerts.length - overdue"), "los por venir, el resto");
    assert.ok(dueAlerts.includes("vencido"), "la palabra del resumen en español");
    assert.ok(dueAlerts.includes("overdue"), "y en inglés");
    assert.ok(dueAlerts.includes('data-anchor="due-alerts-dismiss"'), "la ✕ de quitar sigue en su sitio");
  });
});

describe("402 · la puerta del editor deja el lápiz", () => {
  it("Anotar lleva ClipboardList; ni el lápiz de Escribir ni el ListPlus de Lista", () => {
    assert.ok(screens.includes('<ClipboardList aria-hidden /><span>{t("choose.note")}</span>'), "la puerta lleva su propio ícono");
    assert.ok(!screens.includes('<Pencil aria-hidden /><span>{t("choose.note")}</span>'), "el lápiz se fue de la puerta");
  });
});
