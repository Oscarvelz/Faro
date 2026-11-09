// El Archivo también viaja en el respaldo (1.3.169). La 1.3.168 dejó fuera faro-due-file a
// propósito y lo nombró en voz alta: no es maquinaria — es DATO vivo del dueño (el Archivo de
// Debo: series archivadas con nombres, montos y fechas) que vive fuera del libro, en su propia
// clave GLOBAL de localStorage, y un respaldo no lo llevaba: restaurar en otro aparato lo
// perdía en silencio. Oscar ordenó que viaje. Viaja en su PROPIA sección hermana (`dueFile`),
// no dentro de la capa del aparato (la lista de devicelayer sigue sin admitirlo: no es una
// preferencia del aparato, es contenido). El libro no cambia de bytes y la envoltura sigue v:1.
// Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DUE_FILE_KEY,
  applyDueFile,
  dueFileSectionOf,
  parseDueFileRows,
  readDueFileRows,
  snapshotDueFile,
} from "./duefile.ts";
import { applyDeviceLayer, deviceSectionOf, snapshotDeviceLayer } from "./devicelayer.ts";
import { backupBlob, gunzip } from "../../spa/vault.ts";
import type { PackStorage } from "./packguard.ts";
import type { DueFile, LedgerState } from "./types.ts";

// ---------- utilidades ----------
function fakeStorage(seed: Record<string, string> = {}): PackStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
    keys: () => [...map.keys()],
  };
}
const UID = "u-owner";
const ROWS: DueFile[] = [
  { id: "df-1", seriesId: "s-netflix", name: "Netflix Archivado", maxMinor: 1599, currency: "USD", archivedOn: "2026-10-03", pays: [{ date: "2026-09-15", amountMinor: 1599 }, { date: "2026-10-15", amountMinor: 1599 }] },
  { id: "df-2", seriesId: "s-gym", name: "Gimnasio Viejo", maxMinor: 250000, currency: "NIO", archivedOn: "2026-08-21", pays: [{ date: "2026-08-01", amountMinor: 250000 }] },
];
const seeded = () => fakeStorage({
  [DUE_FILE_KEY]: JSON.stringify(ROWS),
  "faro-lang": "es",
  "faro-night-theme": "tron",
  [`faro.conflict.${UID}`]: "{\"ledger\":1}",
});

// ---------- La lectura: la misma regla que readDueFile en pantalla ----------
describe("archivo — parseDueFileRows / readDueFileRows: la regla de la pantalla", () => {
  it("las filas sanas pasan; las que no tienen nombre en texto se quedan fuera", () => {
    const mixed = [...ROWS, { id: "df-x" }, { name: 42 }, null, "texto"];
    assert.deepEqual(parseDueFileRows(mixed).map((r) => r.id), ["df-1", "df-2"]);
  });

  it("lo que no es un arreglo no es un Archivo: []", () => {
    assert.deepEqual(parseDueFileRows("no"), []);
    assert.deepEqual(parseDueFileRows({}), []);
    assert.deepEqual(parseDueFileRows(null), []);
    assert.deepEqual(parseDueFileRows(undefined), []);
  });

  it("leer del almacén: JSON corrupto o clave ausente → [] (como la pantalla)", () => {
    assert.deepEqual(readDueFileRows(fakeStorage()), []);
    assert.deepEqual(readDueFileRows(fakeStorage({ [DUE_FILE_KEY]: "{roto" })), []);
    assert.deepEqual(readDueFileRows(seeded()).map((r) => r.name), ["Netflix Archivado", "Gimnasio Viejo"]);
  });
});

// ---------- La foto: cuándo la sección existe ----------
describe("archivo — snapshotDueFile: la sección nace solo de un Archivo legible", () => {
  it("clave ausente → null (el respaldo no lleva sección y el aparato restaurado conserva el suyo)", () => {
    assert.equal(snapshotDueFile(fakeStorage({ "faro-lang": "es" })), null);
  });

  it("Archivo legible → sus filas, filtradas con la regla de la pantalla", () => {
    assert.deepEqual(snapshotDueFile(seeded()), ROWS);
  });

  it("valor corrupto o que no es arreglo → null: un dato local dañado jamás fabrica una sección vacía con autoridad", () => {
    assert.equal(snapshotDueFile(fakeStorage({ [DUE_FILE_KEY]: "{roto" })), null);
    assert.equal(snapshotDueFile(fakeStorage({ [DUE_FILE_KEY]: "{\"no\":1}" })), null);
  });

  it("Archivo vacío pero legible ([]) → la sección viaja como []: vacío también es un estado", () => {
    assert.deepEqual(snapshotDueFile(fakeStorage({ [DUE_FILE_KEY]: "[]" })), []);
  });
});

// ---------- La sección en el archivo ----------
describe("archivo — dueFileSectionOf: ausente nunca borra, dañada nunca bloquea", () => {
  it("respaldo 1.3.168 (sin sección) → null", () => {
    assert.equal(dueFileSectionOf({ app: "FARO", v: 1, ledger: {}, device: { "faro-lang": "en" } }), null);
    assert.equal(dueFileSectionOf({ ledger: {} }), null); // libro pelado
  });

  it("sección presente → las filas filtradas; [] presente → [] (reemplazo explícito)", () => {
    assert.deepEqual(dueFileSectionOf({ dueFile: ROWS }), ROWS);
    assert.deepEqual(dueFileSectionOf({ dueFile: [] }), []);
    assert.deepEqual(dueFileSectionOf({ dueFile: [...ROWS, { sin: "nombre" }] })?.map((r) => r.id), ["df-1", "df-2"]);
  });

  it("sección dañada (no arreglo) → null: se trata como ausente, el libro manda", () => {
    assert.equal(dueFileSectionOf({ dueFile: "texto" }), null);
    assert.equal(dueFileSectionOf({ dueFile: { rows: ROWS } }), null);
    assert.equal(dueFileSectionOf({ dueFile: 42 }), null);
    assert.equal(dueFileSectionOf(null), null);
  });
});

// ---------- Aplicar: la clave global, tal cual ----------
describe("archivo — applyDueFile: aterriza en la clave global faro-due-file", () => {
  it("escribe el arreglo serializado en la clave única (no es por usuario)", () => {
    const fresh = fakeStorage();
    assert.equal(applyDueFile(fresh, ROWS), true);
    assert.equal(fresh.getItem(DUE_FILE_KEY), JSON.stringify(ROWS));
    assert.deepEqual(readDueFileRows(fresh), ROWS);
  });
});

// ---------- EL VIAJE COMPLETO por la vía real (vault.backupBlob) ----------
describe("archivo — el viaje de ida y vuelta por la vía real del respaldo", () => {
  const ledger = { revision: 7, updatedAt: "2026-11-09T00:00:00.000Z", settings: { lang: "es" }, months: {}, structure: { categories: [] } } as unknown as LedgerState;

  it("exportar con Archivo → el archivo lo trae en su sección; restaurar en vacío → el Archivo vuelve, y la capa también", async () => {
    const from = seeded();
    const bytes = await backupBlob(ledger, snapshotDeviceLayer(from, UID), snapshotDueFile(from));
    const parsed = JSON.parse(await gunzip(bytes)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), ["app", "device", "dueFile", "exportedAt", "ledger", "v"]);
    assert.ok(!(parsed.device as Record<string, string>)[DUE_FILE_KEY], "el Archivo NO va dentro de la capa");
    assert.deepEqual(dueFileSectionOf(parsed), ROWS);

    const fresh = fakeStorage();
    const layer = deviceSectionOf(parsed);
    if (layer) applyDeviceLayer(fresh, layer);
    const rows = dueFileSectionOf(parsed);
    assert.ok(rows, "la sección debe existir en un respaldo con Archivo");
    applyDueFile(fresh, rows);
    assert.equal(fresh.getItem(DUE_FILE_KEY), JSON.stringify(ROWS));
    assert.equal(fresh.getItem("faro-night-theme"), "tron");
    assert.deepEqual(readDueFileRows(fresh), ROWS);
  });

  it("exportar SIN Archivo → el archivo no lleva la sección (gramática 1.3.168 intacta)", async () => {
    const from = fakeStorage({ "faro-lang": "es" });
    const bytes = await backupBlob(ledger, snapshotDeviceLayer(from, UID), snapshotDueFile(from));
    const parsed = JSON.parse(await gunzip(bytes)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed).sort(), ["app", "device", "exportedAt", "ledger", "v"]);
    assert.equal(dueFileSectionOf(parsed), null);
  });

  it("REGLA DE LA SECCIÓN AUSENTE: restaurar un respaldo viejo sobre un aparato CON Archivo no lo toca", async () => {
    const from = fakeStorage({ "faro-lang": "en" }); // respaldo «viejo»: capa sí, Archivo no
    const bytes = await backupBlob(ledger, snapshotDeviceLayer(from, UID), snapshotDueFile(from));
    const parsed = JSON.parse(await gunzip(bytes)) as Record<string, unknown>;
    const device = fakeStorage({ [DUE_FILE_KEY]: JSON.stringify(ROWS) }); // el aparato destino SÍ tiene Archivo
    const rows = dueFileSectionOf(parsed);
    assert.equal(rows, null);
    if (rows) applyDueFile(device, rows); // la puerta de restauración solo aplica si hay sección
    assert.equal(device.getItem(DUE_FILE_KEY), JSON.stringify(ROWS));
  });
});
