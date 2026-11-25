/**
 * captura456 — LA CAJA OBEDECE (1.3.456): cuatro fallos que Oscar
 * cazó en su teléfono quedan cercados. (1) EL LAPICITO: la tarjeta
 * de lo dicho lleva su botón de reeditar, que devuelve el texto a
 * la caja. (2) LO DICHO QUEDA ARRIBA TAMBIÉN EN LAS ÓRDENES: la
 * condición de la tarjeta nombra los cuatro flujos del agente, no
 * solo la respuesta. (3) EL ECO CON SUS LÍNEAS: el veredicto y la
 * nota conservan los saltos con que el texto nace (pre-line).
 * (4) LAS ACCIONES PROMETIDAS SE VEN: TODO target que el banco
 * emite como acción o como fuente-puerta resuelve a un tema del
 * Manual con ruta — por FUNCTION_TOPIC o por las llaves del tema —
 * con la misma regla que la caja usa para pintar (topicForAction):
 * una acción sin puerta no se pinta, y una puerta prometida en el
 * texto que no se pinta es una falsa promesa.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { FUNCTION_TOPIC } from "./askmap";
import { MANUAL_TOPICS, findTopic } from "../manual/topics";
import { QUESTION_BANK } from "./questionbank";

const ask2 = readFileSync(new URL("./ask2.ts", import.meta.url), "utf8");
const box = readFileSync(new URL("../../components/faro/ask-box.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");

/** La misma resolución que la caja aplica en topicForAction. */
function resolves(target: string): boolean {
  const tid = FUNCTION_TOPIC[target];
  const byMap = tid ? findTopic(tid) : null;
  if (byMap?.go) return true;
  return MANUAL_TOPICS.some((t) => t.go && (t.keys ?? []).includes(target));
}

/** Todo target que el banco puede emitir: los reportDoor, las
 * acciones literales, la primera fuente de cada resultado literal
 * y la primera fuente declarada de cada familia del registro. */
function emittedTargets(): Set<string> {
  const out = new Set<string>();
  for (const m of ask2.matchAll(/reportDoor\(c, "([^"]+)"/g)) out.add(m[1]);
  for (const m of ask2.matchAll(/target: "([^"]+)"/g)) out.add(m[1]);
  for (const m of ask2.matchAll(/source: \[([^\]]*)\]/g)) {
    const first = /"([^"]+)"/.exec(m[1]);
    if (first) out.add(first[1]);
  }
  for (const f of QUESTION_BANK) if (f.source?.[0]) out.add(f.source[0]);
  return out;
}

describe("captura456 · la caja obedece", () => {
  it("las tres acciones de Oscar resuelven a su tema con ruta", () => {
    assert.equal(FUNCTION_TOPIC["remesas.personas"], "remesas-personas");
    assert.equal(FUNCTION_TOPIC["cambio.mesa"], "mesa-cambio");
    assert.equal(FUNCTION_TOPIC["captura.bandeja"], "captura-mesa");
    for (const t of ["remesas.personas", "cambio.mesa", "captura.bandeja"]) {
      assert.ok(resolves(t), `${t} resuelve a un tema con ruta`);
    }
  });

  it("todo target que el banco emite resuelve a un tema con ruta", () => {
    const targets = emittedTargets();
    assert.ok(targets.size >= 20, `el censo respira (${targets.size} targets)`);
    for (const t of targets) {
      assert.ok(resolves(t), `el target «${t}» no resuelve a ningún tema con ruta: la caja lo descartaría en silencio`);
    }
  });

  it("el lapicito vive en la tarjeta y devuelve lo dicho a la caja", () => {
    assert.ok(box.includes('data-anchor="ask-q-edit"'), "el ancla del lápiz está");
    assert.ok(box.includes("Pencil"), "el icono Pencil está");
    assert.ok(box.includes("function editAsked()"), "editAsked está");
    assert.ok(box.includes("setText(asked)"), "lo dicho vuelve a la caja tal como se escribió");
    assert.ok(css.includes(".ask-q-edit"), "el lápiz tiene su estilo");
    assert.ok(css.includes(".ask-q-wrap"), "la envoltura del lápiz está");
  });

  it("lo dicho queda arriba también en las órdenes: la tarjeta nombra los cuatro flujos", () => {
    assert.ok(
      box.includes("(result || caps || relato || programa || orden || crear) && asked"),
      "la condición de la tarjeta cubre relato, programa, orden y crear",
    );
  });

  it("el eco conserva sus líneas en la presentación", () => {
    const verdict = /\.ask-verdict \{[^}]*\}/.exec(css)?.[0] ?? "";
    const note = /\.ask-note \{[^}]*\}/.exec(css)?.[0] ?? "";
    assert.ok(verdict.includes("white-space: pre-line"), ".ask-verdict conserva los saltos");
    assert.ok(note.includes("white-space: pre-line"), ".ask-note conserva los saltos");
  });

  it("la batería corre en test:faro", () => {
    assert.ok(pkg.includes("captura456.test.ts"), "captura456 está registrada en package.json");
  });
});
