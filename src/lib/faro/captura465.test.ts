import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* 1.3.465 · LOS BOTONES DE LA CONFIRMACIÓN (fallo de Oscar, con su
 * foto de la 463 en vivo): la oferta de crear en la estructura no es
 * un chip más — es un botón único, con aire sobre la pregunta; la
 * confirmación es un botón lleno con el acento; y la forma la manda
 * el tema: en Cyberpunk, ventanas cuadradas. Esta cerca clava las
 * tres piezas para que ninguna ola futura las deshaga en silencio. */
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("465 · el botón de crear es único: su clase propia, su ancla y su aire", () => {
  const box = read("../../components/faro/ask-box.tsx");
  assert.ok(box.includes('className="ask-offer"'), "la oferta lleva su envoltorio propio");
  assert.ok(box.includes('className="ask-create-btn"'), "el botón de crear lleva su clase propia, no ask-chip");
  assert.ok(box.includes('data-anchor="ask-crear-start"'), "el ancla de crear se conserva");
  const css = read("../../components/faro/advisor2.css");
  assert.match(css, /\.ask-offer \{ margin-top: 8px; \}/, "la oferta respira: aire propio sobre la pregunta");
  assert.match(css, /\.ask-create-btn \{[^}]*width: 100%/, "el botón único va a lo ancho de la tarjeta");
});

test("465 · la confirmación es un botón lleno con el acento", () => {
  const css = read("../../components/faro/advisor2.css");
  assert.match(css, /\.ask-chip\.is-fixed \{[^}]*background: var\(--accent\); color: var\(--accent-fg\)/, "is-fixed se llena con el acento y su letra");
  assert.match(css, /\.ask-chip \{[^}]*padding: 8px 15px/, "los chips ganan cuerpo");
});

test("465 · Cyberpunk cuadra los botones, como sus ventanas", () => {
  const hud = read("../../components/faro/cyberpunk-hud.css");
  assert.match(hud, /\[data-theme="cyberpunk"\] \.ask-chip \{ border-radius: 0; \}/, "los chips se cuadran en Cyberpunk");
  assert.match(hud, /\[data-theme="cyberpunk"\] \.ask-create-btn \{ border-radius: 0; clip-path: var\(--cp-cut-sm\); \}/, "el botón único lleva el corte de la casa");
});
