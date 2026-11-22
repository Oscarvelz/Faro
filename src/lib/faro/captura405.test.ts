/**
 * captura405 — Me deben, con el acabado de su lugar (Oscar, 2026-11-22, dos
 * fotos, en Cyberpunk): la tarjeta de la persona dentro del grupo quedaba
 * casi cortada a la izquierda por su propia tarjeta y su color no se
 * integraba al lugar. La causa: el panel de Cyberpunk pinta y CHAFLANA
 * toda .cobro-card (corte de 12px), pero la tarjeta anidada vive con el
 * relleno en cero por diseño de grupo — la regla del propio tema declara
 * que solo entran superficies cuyo relleno supera el corte. La cura: la
 * tarjeta anidada respira (aire simétrico, relleno propio) y viste los
 * tokens de su lugar (el tono del lado en Cobros, el acento en Libros),
 * fuera del chaflán. La misma ola renombra la pregunta fija del Asesor.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { classifyBankQuestion } from "./ask2";
import { FIXED_PRESET_Q } from "./askpresets";
import { QUESTION_BANK } from "./questionbank";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const debtsCss = read("../../components/faro/debts.css");

describe("405 · la tarjeta de la persona dentro del grupo: respira y viste el lugar", () => {
  it("en Cobros la tarjeta anidada tiene superficie del tono del lado y queda fuera del chaflán", () => {
    assert.ok(debtsCss.includes("html body .cobros .cobro-swap .cobro-group > .cobro-card {"), "la regla de Cobros existe");
    assert.ok(debtsCss.includes("border: 1px solid color-mix(in oklab, var(--tone) 22%, var(--line))"), "borde del tono del lado");
    assert.ok(debtsCss.includes("background: color-mix(in oklab, var(--tone) 5%, var(--surface-2))"), "superficie del lugar, no el panel de un tema");
    assert.ok(debtsCss.includes("clip-path: none; filter: none;"), "fuera del chaflán de Cyberpunk");
  });
  it("en Libros la misma tarjeta viste el acento del libro", () => {
    assert.ok(debtsCss.includes(".debt-book .cobro-swap .cobro-group > .cobro-card {"), "la regla del libro existe");
    assert.ok(debtsCss.includes("background: color-mix(in oklab, var(--accent) 4%, var(--surface-2))"), "superficie del acento sobre el escalón alto");
  });
  it("el grupo de Cobros da aire simétrico y la etiqueta se queda a sus 14px", () => {
    assert.ok(debtsCss.includes(".cobro-group { gap: 8px; padding: 8px 10px 10px;"), "aire de 10px a los dos lados");
    assert.ok(debtsCss.includes(".cobro-group > h3 { min-height: 40px; gap: 8px; padding-left: 4px; }"), "la etiqueta conserva su asiento");
  });
  it("la tarjeta anidada ya no vive con el relleno en cero", () => {
    assert.ok(!debtsCss.includes(".cobro-group > .cobro-card { padding-left: 0; padding-right: 6px; }"), "la regla vieja murió");
    const nested = debtsCss.split("\n").filter((l) => l.includes(".cobro-group > .cobro-card {"));
    assert.ok(nested.length >= 2, "las dos reglas anidadas existen");
  });
});

describe("405 · la pregunta fija se llama como se le pregunta: al Asesor", () => {
  it("la constante lleva la forma nueva en las dos lenguas", () => {
    assert.equal(FIXED_PRESET_Q.es, "¿Qué puede hacer el asesor?");
    assert.equal(FIXED_PRESET_Q.en, "What can the Advisor do?");
  });
  it("el oído clasifica la forma nueva como capacidades, en las dos lenguas", () => {
    assert.equal(classifyBankQuestion("¿Qué puede hacer el asesor?").family, "capacidades");
    assert.equal(classifyBankQuestion("What can the Advisor do?").family, "capacidades");
  });
  it("la canónica del banco abre con la forma nueva y conserva la vieja como variación", () => {
    const fam = QUESTION_BANK.find((f) => f.id === "capacidades");
    assert.ok(fam, "la familia existe");
    assert.equal(fam.canonical.es[0], "¿Qué puede hacer el asesor?");
    assert.equal(fam.canonical.en[0], "What can the Advisor do?");
    assert.ok(fam.canonical.es.includes("¿Qué puedes hacer?"), "la forma vieja sigue llegando");
  });
});
