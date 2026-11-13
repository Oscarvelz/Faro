// 1.3.244 — «El recuadro fantasma» (Oscar, 2026-11-13 07:05 EST): en TRON, al
// tocar el botón de Ajustes a veces aparecía un recuadro de luz en el cromo.
// La causa, probada en banco con toques reales: el engranaje conserva el foco
// tras el toque y una tecla tardía (Escape/Atrás al salir de Ajustes) voltea
// la modalidad del navegador, encendiendo `:focus-visible` sobre un control
// que ya nadie toca. Estas cercas guardan la cura: el anillo de TRON nace del
// sello `data-fv` que la puerta de modalidad (modality.ts) pone al nacer el
// foco — nunca del `:focus-visible` crudo — y los campos de texto conservan
// su pintura nativa de siempre.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { focusRingAllowed } from "./modality";

const css = fs.readFileSync(new URL("../../components/faro/tron.css", import.meta.url), "utf8");
const gate = fs.readFileSync(new URL("./modality.ts", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../../components/faro/shell.tsx", import.meta.url), "utf8");
const strip = css.replace(/\/\*[\s\S]*?\*\//g, "");
const PAINT = "outline: 2px solid #3fd6f5 !important; outline-offset: 2px; box-shadow: 0 0 12px rgba(63, 214, 245, .6);";

/** Every style rule's selector list (keyframe steps excluded). */
function selectors(src: string): string[] {
  const out: string[] = [];
  const body = src.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const re = /([^{}@;]+)\{[^{}]*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push(m[1].trim());
  return out.filter(Boolean);
}

test("recuadro: no bare global :focus-visible paint survives under Tron", () => {
  for (const sel of selectors(strip)) {
    for (const one of sel.split(/,(?![^(]*\))/).map((s) => s.trim())) {
      assert.notEqual(one, '[data-theme="tron"] :focus-visible', `bare focus-visible rule is back: ${one}`);
    }
  }
});

test("recuadro: the ring paints on the [data-fv] stamp with the exact Tron paint", () => {
  assert.ok(strip.includes(`[data-theme="tron"] [data-fv]:focus { ${PAINT} }`), "the stamped ring rule is missing or its paint moved");
});

test("recuadro: text fields keep their native focus-visible paint, unchanged", () => {
  assert.ok(
    strip.includes(`[data-theme="tron"] :is(.field, .select, input, textarea, select):focus-visible { ${PAINT} }`),
    "the fields' focus-visible rule is missing or its paint moved",
  );
});

test("recuadro: the base sheet's accent ring is fenced off for unstamped elements", () => {
  assert.ok(
    strip.includes('[data-theme="tron"] :focus-visible:not([data-fv]):not(:active) { outline: none; }'),
    "the kill rule for the base :focus-visible paint is missing",
  );
});

test("recuadro: the gate decides by the focus's birth, never by a late key", () => {
  const button = { matches: () => false };
  const field = { matches: (s: string) => s.includes("input") };
  assert.equal(focusRingAllowed(button, "kb"), true, "keyboard-born focus on a button earns the ring");
  assert.equal(focusRingAllowed(button, "touch"), false, "finger-born focus on a button earns nothing");
  assert.equal(focusRingAllowed(field, "touch"), true, "text fields are focus-visible by nature");
  assert.equal(focusRingAllowed(field, "kb"), true);
});

test("recuadro: the gate listens in capture and stamps at focusin; the shell installs it", () => {
  assert.match(gate, /addEventListener\("keydown", \(\) => \{ modality = "kb"; \}, true\)/);
  assert.match(gate, /addEventListener\("pointerdown", \(\) => \{ modality = "touch"; \}, true\)/);
  assert.match(gate, /addEventListener\("focusin"/);
  assert.ok(gate.includes('setAttribute("data-fv", "1")'), "the stamp is missing");
  assert.ok(shell.includes("installModalityGate();"), "the shell must install the gate");
});
