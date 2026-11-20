// El recibo de lado (1.3.337): el espécimen es REAL — el recibo de The UPS
// Store de Oscar (2026-11-20, total $22.04), fotografiado con el papel de
// lado. El lector lo devolvió sin leer en las dos orientaciones que probó
// («No encontré montos. Prueba otra foto.») porque el OCR lee el texto de
// lado como basura: sin un solo monto. La cura vive en scanrun: una pasada
// sin montos despierta el reintento girando la foto (90°, 270°, 180°) y
// gana la pasada más fuerte (readStrength: montos primero, letras desempata).
// Estas cercas fijan la medida y el espécimen; el giro en sí se prueba en
// el banco contra la app real con su foto.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parseScan, readStrength } from "./receiptparse.ts";

const scanrun = fs.readFileSync(path.join(process.cwd(), "src/lib/faro/scanrun.ts"), "utf8");

// Lo que el OCR leyó del espécimen TAL CUAL (de lado): basura sin montos.
const DE_LADO = [
  "os -) =|2", "his 3 ía ale s |=ls", "= ES ii ad i 2 glo", "Gu neesS 2824 5 S 532 oe = |El ht",
  "[E Sess RE = Sos 333 ne 2 |= 9]", "co des Észe ES22 és 5558 (lf = 27S) gd", "Cele #3 BeSe Boe 328 Eg SSileb:í",
];
// Lo que el mismo OCR leyó del espécimen GIRADO 90° en el sentido de leer:
// el total y la fecha, exactos.
const DE_PIE = [
  "SHIP DATE:", "Wed 18 NOV 2026", "Ground Comercial 14.12", "Service Options 1.0",
  "CMS Processing Fee 0.22", "The UPS Store #7556", "Total $22.04",
];

describe("el recibo de lado — la medida de la pasada", () => {
  it("la pasada de lado no encuentra ni un monto: es una lectura fallida", () => {
    assert.equal(readStrength(DE_LADO.map((text) => ({ text }))).amounts, 0);
  });

  it("la pasada de pie encuentra los montos del recibo", () => {
    assert.ok(readStrength(DE_PIE.map((text) => ({ text }))).amounts >= 3);
  });

  it("el espécimen de pie se parsea entero: $22.04 y el 18 de noviembre", () => {
    const [d] = parseScan(DE_PIE.join("\n"), "2026-11-20");
    assert.equal(d.amountMinor, 2204);
    assert.equal(d.date, "2026-11-18");
  });

  it("el espécimen de lado no produce monto: el fallo de Oscar, fijado", () => {
    const [d] = parseScan(DE_LADO.join("\n"), "2026-11-20");
    assert.equal(d?.amountMinor ?? null, null);
  });
});

describe("el recibo de lado — el reintento en el lector", () => {
  it("el giro existe y el orden es 90, 270, 180 (primero como se gira un papel)", () => {
    assert.ok(scanrun.includes("function rotate(c: HTMLCanvasElement, deg: 90 | 180 | 270)"), "rotate() vive en scanrun");
    assert.ok(scanrun.includes("for (const deg of [90, 270, 180] as const)"), "el reintento gira en ese orden");
  });

  it("el reintento solo despierta cuando la primera pasada no encontró montos", () => {
    assert.ok(scanrun.includes("if (!readStrength(best.lines).amounts) {"), "la puerta del reintento es la ausencia de montos");
    assert.ok(scanrun.includes("if (readStrength(best.lines).amounts) break;"), "y se detiene en cuanto una pasada lee montos");
  });

  it("el lienzo ganador viaja con sus líneas (las cajas quedan en sus coordenadas)", () => {
    assert.ok(scanrun.includes("canvas: best.canvas"), "ScanImage lleva el lienzo de la pasada ganadora");
  });
});
