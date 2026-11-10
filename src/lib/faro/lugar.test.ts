// Oleada del lugar (1.3.180): Faro recuerda dónde estaba. Al desbloquear, al recargar o al
// arrancar en frío, el piso aterriza en la página, el mes y la pestaña de Bóveda donde se
// quedó — nunca en una hoja o un borrador a medio escribir (eso no se guarda). El lugar
// vive en la capa del aparato, bajo la clave del dueño del libro: otro dueño no hereda
// lugar ajeno, la salida explícita lo borra, y la basura guardada cae al aterrizaje por
// defecto. Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearPlace, placeKeyOf, readPlace, validPlace, writePlace, type NavPlace } from "./navplace.ts";
import { applyDeviceLayer, isDeviceLayerKey, snapshotDeviceLayer } from "./devicelayer.ts";
import type { PackStorage } from "./packguard.ts";

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
const OTHER = "u-other";
const AJUSTES: NavPlace = { section: "settings", year: 2026, month: 10, vault: null };
const META: NavPlace = { section: "income", year: 2026, month: 11, vault: "meta" };

describe("lugar — ida y vuelta", () => {
  it("lo que se escribe se lee, campo a campo", () => {
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    assert.deepEqual(readPlace(s, UID), AJUSTES);
    writePlace(s, UID, META);
    assert.deepEqual(readPlace(s, UID), META);
  });

  it("sin lugar guardado, la lectura es null (aterrizaje por defecto)", () => {
    assert.equal(readPlace(fakeStorage(), UID), null);
  });

  it("la clave es por dueño: faro.place.<uid>", () => {
    assert.equal(placeKeyOf(UID), "faro.place.u-owner");
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    assert.equal(s.map.has("faro.place.u-owner"), true);
  });

  it("un lugar inválido no se escribe jamás", () => {
    const s = fakeStorage();
    writePlace(s, UID, { section: "nope", year: 2026, month: 10, vault: null } as unknown as NavPlace);
    writePlace(s, UID, { section: "settings", year: 2026, month: 13, vault: null });
    assert.equal(s.map.size, 0);
    assert.equal(readPlace(s, UID), null);
  });
});

describe("lugar — la basura cae por defecto", () => {
  const garbage: unknown[] = [
    "no-es-json{",
    JSON.stringify(null),
    JSON.stringify([1, 2]),
    JSON.stringify({ section: "settings" }), // faltan campos
    JSON.stringify({ section: "settings", year: 2026, month: 10 }), // falta vault
    JSON.stringify({ section: "settings", year: 2026, month: 0, vault: null }),
    JSON.stringify({ section: "settings", year: 2026, month: 13, vault: null }),
    JSON.stringify({ section: "settings", year: 1800, month: 10, vault: null }),
    JSON.stringify({ section: "settings", year: 2026.5, month: 10, vault: null }),
    JSON.stringify({ section: "settings", year: "2026", month: 10, vault: null }),
    JSON.stringify({ section: "locked", year: 2026, month: 10, vault: null }), // sección inventada
    JSON.stringify({ section: "settings", year: 2026, month: 10, vault: "todo" }), // bóveda inventada
  ];
  for (const [i, g] of garbage.entries()) {
    it(`basura ${i + 1}: readPlace → null`, () => {
      const s = fakeStorage({ [placeKeyOf(UID)]: g as string });
      assert.equal(readPlace(s, UID), null);
    });
  }
  it("validPlace acepta cada sección real y cada pestaña de bóveda", () => {
    for (const section of ["desk", "income", "fixed", "variable", "shops", "subs", "stats", "advice", "settings"] as const) {
      assert.notEqual(validPlace({ section, year: 2026, month: 1, vault: null }), null);
    }
    for (const vault of ["save", "meta", "retiro", "emergencia", "owed", "owe"] as const) {
      assert.notEqual(validPlace({ section: "income", year: 2026, month: 1, vault }), null);
    }
  });
});

describe("lugar — disciplina de dueño", () => {
  it("otro dueño no lee mi lugar: su lectura es null", () => {
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    assert.equal(readPlace(s, OTHER), null);
  });

  it("la navegación del otro dueño escribe SU clave y no toca la mía", () => {
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    const before = s.map.get(placeKeyOf(UID));
    writePlace(s, OTHER, META);
    assert.equal(s.map.get(placeKeyOf(UID)), before);
    assert.deepEqual(readPlace(s, OTHER), META);
    assert.deepEqual(readPlace(s, UID), AJUSTES);
  });

  it("clearPlace borra solo el lugar de ese dueño (la salida explícita)", () => {
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    writePlace(s, OTHER, META);
    clearPlace(s, UID);
    assert.equal(readPlace(s, UID), null);
    assert.deepEqual(readPlace(s, OTHER), META);
  });
});

describe("lugar — la capa del aparato", () => {
  it("la familia faro.place.* pertenece a la capa que viaja", () => {
    assert.equal(isDeviceLayerKey(placeKeyOf(UID)), true);
    assert.equal(isDeviceLayerKey("faro.place."), false); // sin dueño, no es clave
  });

  it("la foto recoge SOLO el lugar del dueño que respalda", () => {
    const s = fakeStorage();
    writePlace(s, UID, AJUSTES);
    writePlace(s, OTHER, META);
    const snap = snapshotDeviceLayer(s, UID);
    assert.equal(snap[placeKeyOf(UID)], JSON.stringify(AJUSTES));
    assert.equal(placeKeyOf(OTHER) in snap, false);
  });

  it("aplicar una capa aterriza el lugar y la lectura lo devuelve válido", () => {
    const from = fakeStorage();
    writePlace(from, UID, META);
    const snap = snapshotDeviceLayer(from, UID);
    const to = fakeStorage();
    const applied = applyDeviceLayer(to, snap);
    assert.ok(applied.includes(placeKeyOf(UID)));
    assert.deepEqual(readPlace(to, UID), META);
  });

  it("una capa con un lugar corrupto aterriza pero la lectura lo rechaza", () => {
    const to = fakeStorage();
    applyDeviceLayer(to, { [placeKeyOf(UID)]: JSON.stringify({ section: "locked", year: 1, month: 99, vault: "x" }) });
    assert.equal(readPlace(to, UID), null);
  });
});
