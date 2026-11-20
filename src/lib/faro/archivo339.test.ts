// El Archivo de Cuotas en su pestaña (1.3.339): Oscar (2026-11-20) —
// «Dale a cuotas en la pestaña de Debo su propia carpeta de archivos. Desde
// archivos, en estas tarjetas se puede reanudar una cuota o un préstamo.»
// La carpeta se quitó del panel en la 1.3.162 y el tema del Manual
// «Archivo de cuotas» quedó describiéndola, con su ancla (cobros-out-file)
// sin ninguna pantalla que la dibujara: una promesa sin superficie. Esta
// cerca fija la cura: la carpeta vive en DueOwe con su ancla y su «Mover»,
// y la mecánica de reanudar es UNA — reactivateDueSeries en duefile.ts —
// compartida por las dos puertas (la carpeta y el Archivo mayor).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { reactivateDueSeries } from "./duefile.ts";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import type { LedgerState, Line } from "./types.ts";

const screens = readFileSync(new URL("../../components/faro/screens.tsx", import.meta.url), "utf8");
const archivo = readFileSync(new URL("../../components/faro/archivo.tsx", import.meta.url), "utf8");

const line = (id: string, monthKey: string, active: boolean): Line =>
  ({ id, seriesId: id, monthKey, kind: "subscription", concept: "Netflix", amountMinor: 100, currency: "USD", active } as Line);
const book = (months: Record<string, Line[]>): LedgerState =>
  ({ months: Object.fromEntries(Object.entries(months).map(([k, lines]) => [k, { lines }])) } as unknown as LedgerState);

describe("1.3.339 — la carpeta de Cuotas y su mecánica única", () => {
  it("la carpeta vive en la pestaña de Debo, con el ancla que el Manual promete", () => {
    assert.ok(screens.includes('data-anchor="cobros-out-file"'), "DueOwe no dibuja la carpeta de cuotas (ancla cobros-out-file)");
    assert.ok(screens.includes('topic="archivo-cuotas"'), "la cabecera de la carpeta no lleva la ayuda de su tema");
    assert.ok(screens.includes('t("cobro.owe.move")'), "las tarjetas archivadas no ofrecen «Mover»");
    assert.ok(screens.includes('t("cobro.owe.file.empty")'), "la carpeta abierta y vacía no dice que no hay nada");
    const topic = MANUAL_TOPICS.find((tp) => tp.id === "archivo-cuotas");
    assert.ok(topic?.go && screens.includes(`data-anchor="${topic.go.anchor}"`),
      "el enlace del tema «Archivo de cuotas» salta a un ancla que ninguna pantalla dibuja");
  });

  it("reanudar es una sola mecánica en las dos puertas", () => {
    assert.ok(screens.includes("reactivateDueSeries(s, row.seriesId)"), "DueOwe no reanuda con la mecánica de duefile");
    assert.ok(archivo.includes("reactivateDueSeries(s, row.seriesId)"), "el Archivo mayor no reanuda con la mecánica de duefile");
  });

  it("la receta enciende la línea inactiva MÁS RECENTE de la serie", () => {
    const s = book({ "2026-09": [line("s1", "2026-09", false)], "2026-11": [line("s1", "2026-11", false)] });
    const out = reactivateDueSeries(s, "s1");
    assert.ok(out);
    assert.equal(out.months["2026-11"]!.lines[0]!.active, true);
    assert.equal(out.months["2026-09"]!.lines[0]!.active, false);
  });

  it("la receta no toca otra serie ni resucita lo que ya vive", () => {
    const s = book({ "2026-11": [line("s1", "2026-11", true), line("s2", "2026-11", false)] });
    assert.equal(reactivateDueSeries(s, "s1"), null, "una serie ya activa no se «reanuda»");
    const out = reactivateDueSeries(s, "s2");
    assert.ok(out);
    assert.equal(out.months["2026-11"]!.lines[0]!.active, true);
    assert.equal(out.months["2026-11"]!.lines[1]!.active, true);
  });

  it("una serie que ya no vive devuelve null — la puerta aborta sin marco", () => {
    const s = book({ "2026-11": [line("s1", "2026-11", false)] });
    assert.equal(reactivateDueSeries(s, "fantasma"), null);
  });
});
