// Captura 436 — LOS NÚMEROS DEJAN DE GRITAR (Oscar, 2026-11-23, dos veces
// el mismo día: en la línea de Q&A sobre la respuesta del Asesor — «the
// response should not be in bold. It looks too awful» — y en esta línea,
// con la foto de los montos de su bóveda: «La negrita de estos números
// sobresale demasiado, está demasiado ofensiva a la vista»).
// La cura tiene dos pisos:
//  (1) LA RESPUESTA DEL ASESOR: el veredicto es prosa y pesa como prosa
//      (400, no 650); las piezas conservan una énfasis suave (560).
//  (2) LOS MONTOS DE LA BÓVEDA Y LAS BARRAS: bolsillos, palanca, fichas de
//      segmento, cabecera de Ahorros y las barras de los libros pesan 560
//      — presentes sin gritar. Los NOMBRES no se tocan: lo que se castiga
//      es el peso de las CIFRAS, no el de las palabras.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const advisor = readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

test("436 · el veredicto del Asesor se lee como prosa, no en negrita", () => {
  assert.ok(
    advisor.includes(".ask-verdict { margin: 0; font-size: 1rem; font-weight: 400; line-height: 1.35; }"),
    "el veredicto pesa 400: la respuesta no va en negrita",
  );
  assert.ok(
    advisor.includes(".ask-piece strong { color: var(--ink); font-weight: 560;"),
    "las piezas conservan solo una énfasis suave (560)",
  );
});

test("436 · los montos de la bóveda pesan 560", () => {
  assert.ok(styles.includes(".bank-sum { margin-left: auto; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 560; }"), "los bolsillos (bank-sum)");
  assert.ok(styles.includes("color: var(--seg, #d5e2ea); font-weight: 560; }"), "la cifra de la palanca");
  assert.ok(styles.includes(".save-ledger-head strong { font-family: var(--font-serif); font-size: 1.15rem; font-weight: 560; }"), "la cabecera del segmento");
  assert.ok(styles.includes(".save-seg .num { font-family: var(--font-serif); font-size: 1.05rem; font-weight: 560; }"), "la ficha del segmento");
  assert.ok(styles.includes(".save-tools strong { font-weight: 560; }"), "el total de la cabecera de Ahorros");
});

test("436 · el total grande de Central pesa 560", () => {
  assert.ok(
    styles.includes(".desk-kicker strong { font-weight: 560; }"),
    "la cifra de «Oportunidad de mejora» (1.75rem) no grita",
  );
});

test("436 · las barras de los libros pesan 560", () => {
  assert.ok(
    styles.includes("font-size: 1.05rem; font-weight: 560; letter-spacing: -0.03em;"),
    "el monto de la barra de tramo (span-fold-main) no grita",
  );
});
