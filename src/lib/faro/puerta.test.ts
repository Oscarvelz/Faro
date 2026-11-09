// Oleada de la puerta (1.3.168): el libro abre sin conexión, la capa del aparato viaja en el
// respaldo, y ninguna vía decide por reloj. Las sondas de la revisión de la puerta
// (2026-11-09: con «Mantener sesión» apagado, el Login se paraba delante de un libro local
// completo e intacto hasta que hubiera red; el respaldo llevaba el libro gordo y solo el
// libro) convertidas en pruebas permanentes. Datos sintéticos solamente.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookUidForKeys,
  bootDecision,
  clearExplicitOut,
  clearOwnerMark,
  readExplicitOut,
  readOwnerMark,
  setExplicitOut,
  writeOwnerMark,
  type BootInputs,
} from "./door.ts";
import {
  applyDeviceLayer,
  deviceSectionOf,
  isDeviceLayerKey,
  snapshotDeviceLayer,
} from "./devicelayer.ts";
import type { PackStorage } from "./packguard.ts";

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
const OTHER = "u-other";
const decide = (over: Partial<BootInputs>): string =>
  bootDecision({ hasSession: false, remembered: false, keep: true, markUid: null, bookUid: null, explicitOut: false, ...over });

// ---------- La puerta: la matriz de arranque ----------
describe("puerta — bootDecision: la matriz completa", () => {
  it("con sesión viva manda la sesión, siempre", () => {
    assert.equal(decide({ hasSession: true }), "session");
    assert.equal(decide({ hasSession: true, keep: false, markUid: UID, bookUid: UID, explicitOut: true }), "session");
  });

  it("EL CASO TITULAR: keep OFF + sin sesión + libro + marca que coincide → la puerta abre", () => {
    assert.equal(decide({ keep: false, markUid: UID, bookUid: UID }), "door");
  });

  it("keep OFF + la marca es de otra cuenta que el libro → login (el libro ajeno nunca abre sin sesión)", () => {
    assert.equal(decide({ keep: false, markUid: UID, bookUid: OTHER }), "login");
  });

  it("keep OFF + libro sin marca → login (un libro sin dueño marcado no abre)", () => {
    assert.equal(decide({ keep: false, bookUid: UID }), "login");
  });

  it("keep OFF + marca sin libro → login", () => {
    assert.equal(decide({ keep: false, markUid: UID }), "login");
  });

  it("primer arranque de la historia (sin libro, sin marca) → login, con keep en cualquier posición", () => {
    assert.equal(decide({ keep: true }), "login");
    assert.equal(decide({ keep: false }), "login");
  });

  it("keep ON no cambia: recordado abre como sesión; sin recordado, login", () => {
    assert.equal(decide({ keep: true, remembered: true }), "session");
    assert.equal(decide({ keep: true, remembered: false }), "login");
    // Ni con marca y libro: con keep ON la vía es la de siempre, no la puerta.
    assert.equal(decide({ keep: true, remembered: true, markUid: UID, bookUid: UID }), "session");
    assert.equal(decide({ keep: true, remembered: false, markUid: UID, bookUid: UID }), "login");
  });

  it("keep OFF: el recordado de sessionStorage NO abre por sí solo — solo la marca abre la puerta", () => {
    assert.equal(decide({ keep: false, remembered: true }), "login");
  });

  it("la salida explícita cierra la puerta aunque queden marca y libro", () => {
    assert.equal(decide({ keep: false, markUid: UID, bookUid: UID, explicitOut: true }), "login");
  });
});

// ---------- La marca de dueño y la salida explícita ----------
describe("puerta — la marca vive fuera de la sesión", () => {
  it("escribir/leer/borrar la marca sobre el almacén del aparato", () => {
    const s = fakeStorage();
    assert.equal(readOwnerMark(s), null);
    writeOwnerMark(s, { id: UID, email: "o@x", name: "O" });
    assert.deepEqual(readOwnerMark(s), { id: UID, email: "o@x", name: "O" });
    clearOwnerMark(s);
    assert.equal(readOwnerMark(s), null);
  });

  it("una marca dañada no abre nada: se lee como ausencia", () => {
    assert.equal(readOwnerMark(fakeStorage({ "faro.owner": "{roto" })), null);
    assert.equal(readOwnerMark(fakeStorage({ "faro.owner": JSON.stringify({ email: "o@x" }) })), null);
  });

  it("la bandera de salida explícita se pone y se quita", () => {
    const s = fakeStorage();
    assert.equal(readExplicitOut(s), false);
    setExplicitOut(s);
    assert.equal(readExplicitOut(s), true);
    clearExplicitOut(s);
    assert.equal(readExplicitOut(s), false);
  });

  it("bookUidForKeys: el libro del aparato es el de la marca; la cuarentena no cuenta como libro", () => {
    const keys = [`faro.pack.${UID}`, `faro.pack.corrupt.${UID}.1730000000000`, "faro-lang"];
    assert.equal(bookUidForKeys(keys, UID), UID);
    assert.equal(bookUidForKeys([`faro.pack.${OTHER}`], UID), OTHER); // libro ajeno: la matriz lo rechaza
    assert.equal(bookUidForKeys([`faro.pack.${OTHER}`, `faro.pack.${UID}`], UID), UID);
    assert.equal(bookUidForKeys([`faro.pack.${OTHER}`, "faro.pack.u-third"], UID), null); // varios y ninguno de la marca
    assert.equal(bookUidForKeys(["faro-lang"], UID), null);
    assert.equal(bookUidForKeys([`faro.pack.corrupt.${UID}.1730000000000`], UID), null);
  });
});

// ---------- La capa del aparato en el respaldo ----------
describe("puerta — devicelayer: la lista explícita", () => {
  it("la lista admite lo nombrado y rechaza sesión, maquinaria y datos ajenos", () => {
    for (const k of ["faro-lang", "faro-theme", "faro-day-theme", "faro-night-theme", "faro-money-size", "faro-money-size-land", "faro.tree.folded", "faro-float", "faro-float-section", "faro-debo-tab", "faro-split-ratio", "faro-calc-geo", "faro-cv-prefs", "faro-widget-hide", "faro-study-unfold", "faro-vault-blocks:fixed", "faro-vault-pocket:meta", "faro-vault-lever:retiro", "faro-vault-years:meta", `faro.conflict.${UID}`, `faro.conflict.${UID}.tab`]) {
      assert.equal(isDeviceLayerKey(k), true, k);
    }
    for (const k of ["faro-auth", "faro.lastUser", "faro.keep", "faro.owner", "faro.out", "faro.device", `faro.lock.${UID}`, `faro.seen.${UID}`, `faro.pack.${UID}`, `faro.pack.corrupt.${UID}.1`, "faro.vault.device.u1", "faro-awake-log", "faro-awake-dismiss", "faro-due-file", "faro-slips", "faro-cobros", "faro-report-draft-in", "faro-send-to", "faro-sample-mode", "faro-quiet-boot"]) {
      assert.equal(isDeviceLayerKey(k), false, k);
    }
  });

  const seeded = () => fakeStorage({
    "faro-lang": "en",
    "faro-theme": "claro",
    "faro-night-theme": "tron",
    "faro-money-size": "3",
    "faro.tree.folded": JSON.stringify(["fixed"]),
    "faro-debo-tab": "loans",
    [`faro.conflict.${UID}`]: "{\"ledger\":1}",
    [`faro.conflict.${UID}.tab`]: "{\"ledger\":2}",
    [`faro.conflict.${OTHER}`]: "{\"ledger\":9}", // el conflicto de OTRA cuenta no viaja en este respaldo
    "faro-auth": "SECRET",
    "faro.device": "dev-1",
    [`faro.pack.${UID}`]: "{\"ledger\":{}}",
    "faro-awake-log": "[]",
    "faro-due-file": "[]",
  });

  it("la foto captura la capa del dueño y nada de sesión/maquinaria/libro", () => {
    const snap = snapshotDeviceLayer(seeded(), UID);
    assert.equal(snap["faro-lang"], "en");
    assert.equal(snap["faro-night-theme"], "tron");
    assert.equal(snap["faro.tree.folded"], JSON.stringify(["fixed"]));
    assert.equal(snap[`faro.conflict.${UID}`], "{\"ledger\":1}");
    assert.equal(snap[`faro.conflict.${UID}.tab`], "{\"ledger\":2}");
    assert.equal(snap[`faro.conflict.${OTHER}`], undefined);
    assert.equal(snap["faro-auth"], undefined);
    assert.equal(snap["faro.device"], undefined);
    assert.equal(snap[`faro.pack.${UID}`], undefined);
    assert.equal(snap["faro-awake-log"], undefined);
    assert.equal(snap["faro-due-file"], undefined);
  });

  it("EL VIAJE DE IDA Y VUELTA: foto → aparato vacío → aplicar → la capa está en vigor", () => {
    const snap = snapshotDeviceLayer(seeded(), UID);
    const fresh = fakeStorage();
    const applied = applyDeviceLayer(fresh, snap);
    assert.equal(fresh.getItem("faro-lang"), "en");
    assert.equal(fresh.getItem("faro-night-theme"), "tron");
    assert.equal(fresh.getItem("faro-money-size"), "3");
    assert.equal(fresh.getItem("faro.tree.folded"), JSON.stringify(["fixed"]));
    assert.equal(fresh.getItem(`faro.conflict.${UID}`), "{\"ledger\":1}");
    assert.ok(applied.includes("faro-lang"));
  });

  it("aplicar es solo-poner: lo que la foto no trae, el aparato lo conserva", () => {
    const fresh = fakeStorage({ "faro-calc-geo": "geo-previa" });
    applyDeviceLayer(fresh, { "faro-lang": "en" });
    assert.equal(fresh.getItem("faro-calc-geo"), "geo-previa");
    assert.equal(fresh.getItem("faro-lang"), "en");
  });

  it("una sección hostil no escribe fuera de la lista (ni sesión, ni libro, ni identidad)", () => {
    const fresh = fakeStorage();
    applyDeviceLayer(fresh, {
      "faro-auth": "ROBADO",
      [`faro.pack.${UID}`]: "ROBADO",
      "faro.device": "ROBADO",
      "faro-lang": "en",
    } as Record<string, string>);
    assert.equal(fresh.getItem("faro-auth"), null);
    assert.equal(fresh.getItem(`faro.pack.${UID}`), null);
    assert.equal(fresh.getItem("faro.device"), null);
    assert.equal(fresh.getItem("faro-lang"), "en");
  });

  it("deviceSectionOf: ausente → null; presente → filtrada; dañada → null sin bloquear el libro", () => {
    assert.equal(deviceSectionOf({ app: "FARO", v: 1, ledger: {} }), null);
    assert.equal(deviceSectionOf({ ledger: {} }), null); // libro pelado, sin envoltorio
    assert.deepEqual(
      deviceSectionOf({ app: "FARO", v: 1, ledger: {}, device: { "faro-lang": "en", "faro-auth": "X", "faro-money-size": 3 } }),
      { "faro-lang": "en" },
    );
    assert.equal(deviceSectionOf({ app: "FARO", v: 1, ledger: {}, device: "no-es-objeto" }), null);
    assert.equal(deviceSectionOf({ app: "FARO", v: 1, ledger: {}, device: [] }), null);
    assert.equal(deviceSectionOf(null), null);
    assert.equal(deviceSectionOf("texto"), null);
  });
});
