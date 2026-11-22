import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canInvite, mesaKey, plausibleEmail, previewFor, previewStale, type MesaState } from "./share.ts";
import { createInitial } from "./defaults.ts";

const book = () => createInitial("es");
const mesa = (over: Partial<MesaState> = {}): MesaState => ({ email: "maria@example.com", scope: { all: true }, role: "note", previewed: null, ...over });

test("libro395 · la llave ata el trato exacto: cambiar un paso invalida la vista previa", () => {
  const m = mesa();
  const key = mesaKey(m);
  assert.ok(key);
  const seen = { ...m, previewed: key };
  assert.equal(canInvite(seen), true);
  // Otro correo, otro alcance u otro papel: la vista vieja ya no vale.
  assert.equal(canInvite({ ...seen, email: "otra@example.com" }), false);
  assert.equal(canInvite({ ...seen, role: "view" }), false);
  assert.equal(canInvite({ ...seen, scope: { cats: ["f-comida"] } }), false);
  assert.equal(previewStale({ ...seen, role: "view" }), true);
  assert.equal(previewStale(seen), false);
});

test("libro395 · sin trato completo o sin correo plausible no hay puerta", () => {
  assert.equal(mesaKey(mesa({ scope: null })), null);
  assert.equal(mesaKey(mesa({ scope: { cats: [] } })), null); // áreas sin marcar: aún no hay trato
  assert.equal(canInvite(mesa({ email: "no-es-correo", previewed: mesaKey(mesa({ email: "no-es-correo" })) })), false);
  assert.equal(plausibleEmail("a@b.co"), true);
  assert.equal(plausibleEmail("a b@c.co"), false);
});

test("libro395 · la vista previa por alcance: lo que ve, lo que no, lo que nunca viaja", () => {
  const s = book();
  const all = previewFor(s, { all: true }, "view");
  assert.equal(all.seesCats.length, s.structure.categories.length);
  assert.deepEqual(all.notSeesCats, []);
  assert.deepEqual(all.neverTravels, ["settings", "audit", "drafts"]); // ni con alcance total (ley C2)
  const some = previewFor(s, { cats: [s.structure.categories[0].id] }, "note");
  assert.deepEqual(some.seesCats, [s.structure.categories[0].id]);
  assert.equal(some.notSeesCats.length, s.structure.categories.length - 1);
  assert.ok(some.canDo.includes("note-lines"));
  assert.ok(!all.canDo.includes("note-lines")); // solo mira: no anota
  assert.ok(some.fundedBy.every((f) => f.by === "owner")); // hoy financia el dueño (C6 traerá el dinero del invitado)
});

test("libro395 · la superficie: el botón de invitar vive SOLO dentro de la vista previa vigente", () => {
  const mesaSrc = readFileSync(new URL("../../components/faro/share-mesa.tsx", import.meta.url), "utf8");
  assert.ok(mesaSrc.includes("canInvite(mesa)"), "el envío pasa por la puerta canInvite");
  const sendBtn = mesaSrc.indexOf('data-anchor="share-send"');
  const previewBranch = mesaSrc.indexOf("previewCurrent && pv");
  assert.ok(previewBranch > 0 && sendBtn > previewBranch, "share-send se pinta solo en la rama de la vista previa vigente");
  assert.ok(mesaSrc.includes('data-anchor="share-what"'), "«qué compartí» vive en la lista de miembros");
  assert.ok(mesaSrc.includes("previewFor(ledger, m.scope, m.role)"), "la verificación reusa la MISMA cuenta de la vista previa");
});

test("libro395 · el asiento y el tema del Manual nacen con la superficie", () => {
  const mode = readFileSync(new URL("./mode.ts", import.meta.url), "utf8");
  assert.ok(mode.includes('"books.share-admin": R'), "administrar la membresía es asiento de Ritmo");
  const topics = readFileSync(new URL("../manual/topics.ts", import.meta.url), "utf8");
  assert.ok(topics.includes('id: "libro-compartido"'), "el tema del Manual existe");
});
