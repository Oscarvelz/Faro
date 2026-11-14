// La oferta de huella al registrarse (1.3.257): la decisión es pura y se cerca aquí —
// primera entrada en el aparato Y cuenta nueva, o no hay oferta. Y las cercas de
// cableado: el gesto vive en rememberUser() ANTES de que escriba sus marcas, la marca
// de «ya se preguntó» sobrevive a la salida, el componente vive en la carcasa, y ni
// lock.ts ni door.ts se tocaron (sus huellas de contenido siguen siendo las suyas).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LOCK_ASK_KEY,
  LOCK_PENDING_KEY,
  NEW_ACCOUNT_MS,
  accountIsNew,
  clearPending,
  isFirstEntry,
  markAsked,
  pendOffer,
  pendOfferIfFirst,
  readPending,
  shouldPendOffer,
  tracesOf,
  wasAsked,
  type EntryTraces,
} from "./lockoffer.ts";
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
const UID = "u-nueva";
const OTHER = "u-vieja";
const NOW = Date.parse("2026-11-13T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const CLEAN: EntryTraces = { hasPack: false, hasLock: false, hasAsked: false, rememberedUid: null, ownerUid: null };

describe("lockoffer — la primera entrada", () => {
  it("sin ninguna huella, es primera entrada", () => {
    assert.equal(isFirstEntry(CLEAN, UID), true);
    assert.equal(isFirstEntry({ ...CLEAN, rememberedUid: OTHER, ownerUid: OTHER }, UID), true);
  });

  it("cada huella, por sí sola, la desmiente", () => {
    assert.equal(isFirstEntry({ ...CLEAN, hasPack: true }, UID), false);
    assert.equal(isFirstEntry({ ...CLEAN, hasLock: true }, UID), false);
    assert.equal(isFirstEntry({ ...CLEAN, hasAsked: true }, UID), false);
    assert.equal(isFirstEntry({ ...CLEAN, rememberedUid: UID }, UID), false);
    assert.equal(isFirstEntry({ ...CLEAN, ownerUid: UID }, UID), false);
  });

  it("las huellas de OTRA cuenta no cuentan: el aparato es de quien registra", () => {
    const s = fakeStorage({
      [`faro.pack.${OTHER}`]: "{}",
      [`faro.lock.${OTHER}`]: "native",
      [`faro.lockask.${OTHER}`]: "1",
      "faro.owner": JSON.stringify({ id: OTHER, email: "o@x", name: "O" }),
    });
    const t = tracesOf(s, UID, OTHER);
    assert.deepEqual(t, { hasPack: false, hasLock: false, hasAsked: false, rememberedUid: OTHER, ownerUid: OTHER });
    assert.equal(isFirstEntry(t, UID), true);
  });

  it("la marca de dueño corrupta no rompe la lectura (cae a null, como la puerta)", () => {
    const s = fakeStorage({ "faro.owner": "{roto" });
    assert.equal(tracesOf(s, UID, null).ownerUid, null);
  });
});

describe("lockoffer — la cuenta nueva", () => {
  it("recién creada, de minutos o de días dentro de la semana: nueva", () => {
    assert.equal(accountIsNew(iso(NOW), NOW), true);
    assert.equal(accountIsNew(iso(NOW - 3 * 24 * 3600_000), NOW), true);
    assert.equal(accountIsNew(iso(NOW - NEW_ACCOUNT_MS), NOW), true);
    assert.equal(accountIsNew(iso(NOW + 60_000), NOW), true); // el reloj apenas adelantado
  });

  it("pasada la semana, ausente o ilegible: no es nueva — ante la duda, no se ofrece", () => {
    assert.equal(accountIsNew(iso(NOW - NEW_ACCOUNT_MS - 1), NOW), false);
    assert.equal(accountIsNew(iso(NOW - 365 * 24 * 3600_000), NOW), false);
    assert.equal(accountIsNew(null, NOW), false);
    assert.equal(accountIsNew(undefined, NOW), false);
    assert.equal(accountIsNew("no-es-fecha", NOW), false);
    assert.equal(accountIsNew(iso(NOW + 3600_000), NOW), false); // del futuro lejano
  });
});

describe("lockoffer — la decisión entera", () => {
  it("el registro genuino queda pendiente, una sola vez por aparato", () => {
    const s = fakeStorage();
    assert.equal(pendOfferIfFirst(s, { uid: UID, createdAt: iso(NOW - 60_000), rememberedUid: null, now: NOW }), true);
    assert.equal(readPending(s, UID), true);
    // La segunda adopción (la sesión ya escribió sus marcas: recordado y dueño son ella)
    // ya no es primera entrada — la pendiente no se duplica ni se repone.
    s.setItem("faro.owner", JSON.stringify({ id: UID, email: "n@x", name: "N" }));
    clearPending(s, UID);
    assert.equal(pendOfferIfFirst(s, { uid: UID, createdAt: iso(NOW - 60_000), rememberedUid: UID, now: NOW }), false);
    assert.equal(readPending(s, UID), false);
  });

  it("el que vuelve NUNCA queda pendiente: su libro está en el aparato", () => {
    const s = fakeStorage({ [`faro.pack.${UID}`]: "{}" });
    assert.equal(pendOfferIfFirst(s, { uid: UID, createdAt: iso(NOW - 60_000), rememberedUid: UID, now: NOW }), false);
  });

  it("una cuenta vieja en un aparato virgen tampoco: registrada hace años, aunque el aparato no la conozca", () => {
    const s = fakeStorage();
    assert.equal(pendOfferIfFirst(s, { uid: UID, createdAt: iso(NOW - 400 * 24 * 3600_000), rememberedUid: null, now: NOW }), false);
    assert.equal(readPending(s, UID), false);
  });

  it("si ya trae huella puesta en este aparato, no hay nada que ofrecer", () => {
    assert.equal(shouldPendOffer({ ...CLEAN, hasLock: true }, UID, iso(NOW), NOW), false);
  });
});

describe("lockoffer — preguntado es para siempre (en este aparato)", () => {
  it("la marca de preguntado va y viene, y apaga la decisión entera", () => {
    const s = fakeStorage();
    assert.equal(wasAsked(s, UID), false);
    markAsked(s, UID);
    assert.equal(wasAsked(s, UID), true);
    assert.equal(tracesOf(s, UID, null).hasAsked, true);
    assert.equal(pendOfferIfFirst(s, { uid: UID, createdAt: iso(NOW), rememberedUid: null, now: NOW }), false);
  });

  it("la pendiente se consume y no deja rastro", () => {
    const s = fakeStorage();
    pendOffer(s, UID);
    assert.equal(readPending(s, UID), true);
    clearPending(s, UID);
    assert.equal(readPending(s, UID), false);
    assert.equal(s.map.has(LOCK_PENDING_KEY(UID)), false);
  });

  it("las claves son por cuenta: preguntar a una no pregunta a la otra", () => {
    const s = fakeStorage();
    markAsked(s, UID);
    assert.equal(wasAsked(s, OTHER), false);
    assert.equal(s.map.get(LOCK_ASK_KEY(UID)), "1");
  });
});

describe("lockoffer — el cableado (cercas de fuente)", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

  it("rememberUser() toma la foto de las huellas ANTES de escribir sus marcas", () => {
    const cloud = read("../../spa/cloud.ts");
    const gesto = cloud.indexOf("pendOfferIfFirst(");
    assert.ok(gesto > 0, "cloud.ts llama al gesto de la oferta");
    assert.ok(gesto < cloud.indexOf("writeOwnerMark(store, u)"), "el gesto precede a la marca de dueño");
    assert.ok(gesto < cloud.indexOf("box().setItem(LAST"), "el gesto precede al usuario recordado");
  });

  it("la salida conserva la marca de preguntado, como conserva la credencial", () => {
    const gates = read("../../spa/gates.tsx");
    assert.match(gates, /k === `faro\.lock\.\$\{uid\}`\) continue;/);
    assert.match(gates, /k === LOCK_ASK_KEY\(uid\)\) continue;/);
  });

  it("la carcasa monta la oferta una vez, junto al anfitrión del widget", () => {
    const shell = read("../../components/faro/shell.tsx");
    assert.match(shell, /import \{ LockOffer \} from "@\/spa\/lockoffer";/);
    assert.equal(shell.split("<LockOffer />").length - 1, 1);
  });

  it("la oferta activa la MISMA maquinaria que el botón de Cuenta (enableLock de lock.ts)", () => {
    const offer = read("../../spa/lockoffer.tsx");
    assert.match(offer, /enableLock\(user\.id, user\.email\)/);
    assert.match(offer, /lockSupported\(\)/);
    assert.match(offer, /markAsked\(store, uid\)/); // uid = user.id (la cuenta de useFaroUser)
    assert.match(offer, /clearPending\(store, uid\)/);
  });

  it("ni la oferta ni el gesto escriben en lock.ts ni en door.ts: solo los leen", () => {
    const offer = read("../../spa/lockoffer.tsx");
    const mod = read("./lockoffer.ts");
    for (const src of [offer, mod]) {
      assert.ok(!/disableLock|unlock\(/.test(src), "nadie desarma ni abre la cerradura desde la oferta");
    }
    assert.match(mod, /from "\.\/door\.ts"/); // readOwnerMark: lectura, no escritura
    assert.ok(!/writeOwnerMark|clearOwnerMark|setExplicitOut/.test(mod), "la puerta no se escribe desde aquí");
  });
});
