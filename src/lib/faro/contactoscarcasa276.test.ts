/**
 * FARO 1.3.276 — «Contactos en la carcasa» (orden de Oscar, 2026-11-14 15:05 EST:
 * «Haz la ola nativa de contactos»).
 *
 * La 1.3.273 trajo los nombres de los beneficiarios SOLO por el selector web
 * (navigator.contacts), que dentro de la carcasa Android no existe: en la app
 * instalada el botón «Desde contactos» nunca nacía. Esta ola le da a la carcasa
 * un selector del sistema para UN nombre y enseña a la mitad web a usarlo.
 *
 * La forma de privacidad es dura y se cerca aquí: el pick es
 * Intent.ACTION_PICK sobre Contacts.CONTENT_URI — Android concede acceso de
 * una sola vez al contacto elegido y SOLO su DISPLAY_NAME cruza a la página.
 * El manifiesto NO declara READ_CONTACTS: la app jamás lee la agenda.
 *
 * El contrato, fijado en los dos lados como la casa fijó el del widget (258):
 *  - sonda síncrona: el método opcional pickContactName del puente;
 *  - petición: pickContactName(id);
 *  - respuesta: el evento faronative-contact-name con {id, name};
 *    name "" = cancelado o fallido, y la página calla.
 * Carcasa vieja (android-23) → la sonda falla → el botón no nace y todo se
 * comporta como en la 1.3.275. Página vieja en carcasa nueva → inerte.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const src = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const fromRoot = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const native = src("../../spa/native.ts");
const screens = src("../../components/faro/screens.tsx");
const main = fromRoot("android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt");
const manifest = fromRoot("android/app/src/main/AndroidManifest.xml");

describe("1.3.276 — el contrato del pick único de nombre", () => {
  it("la mitad web: sonda, petición y evento con la forma exacta", () => {
    assert.ok(native.includes("pickContactName?(id: string): void"), "el puente declara el método opcional pickContactName(id)");
    assert.ok(native.includes("export function nativeCanPickContactName"), "existe la sonda nativeCanPickContactName");
    assert.ok(native.includes('typeof n.pickContactName === "function"'), "la sonda prueba el método, no adivina la carcasa");
    assert.ok(native.includes("export function nativePickContactName"), "existe la petición nativePickContactName");
    assert.ok(native.includes('if (!n?.pickContactName) return null;'), "sin método no hay promesa: null, y el llamador sigue su orden");
    assert.ok(native.includes('window.addEventListener("faronative-contact-name", on)'), "la respuesta se escucha en faronative-contact-name");
    assert.ok(native.includes("CustomEvent<{ id: string; name: string }>"), "el payload es {id, name} y nada más cruza");
    assert.ok(native.includes("resolve(name || null)"), "nombre vacío = cancelación: null, silencio");
  });

  it("el editor: el botón nace del selector web O de la sonda; cada camino llena solo el nombre", () => {
    assert.ok(screens.includes("nativeCanPickContactName, nativePickContactName"), "screens importa las dos piezas del puente");
    assert.ok(screens.includes("const nativeName = nativeCanPickContactName();"), "el editor sonda la carcasa al pintarse");
    assert.ok(screens.includes("contacts || nativeName ?"), "el botón nace si hay selector web O puente nativo");
    assert.ok(screens.includes('contacts.select(["name"], { multiple: true })'), "el camino web de la 273 queda intacto");
    assert.ok(screens.includes("const pending = nativePickContactName();"), "el camino nativo pide UN nombre");
    assert.ok(screens.includes("if (name) set({ bens: [...draft.bens, name] });"), "el nombre elegido entra como beneficiario; cancelar no toca nada");
    assert.ok(!screens.includes("nativePickContacts"), "la bandeja de personas (Agregar personas) jamás sirve a los beneficiarios");
  });

  it("la mitad nativa: ACTION_PICK único sobre Contacts, con su propio código de petición", () => {
    assert.match(main, /fun pickContactName\(id: String\)/, "MainActivity expone pickContactName(id)");
    assert.ok(main.includes("Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI)"), "el intent es el de la forma de privacidad: ACTION_PICK sobre Contacts.CONTENT_URI");
    assert.ok(main.includes("startActivityForResult(intent, RQ_CONTACT_NAME)"), "se lanza con su código propio");
    assert.ok(main.includes("private const val RQ_CONTACT_NAME = 10"), "el código es 10");
    assert.ok(main.includes("private const val RQ_CONTACTS = 9"), "y no pisa el 9 de la bandeja de personas");
    const seg = main.slice(main.indexOf("fun pickContactName"), main.indexOf("fun pickContactName") + 1400);
    assert.ok(!seg.includes("EXTRA_ALLOW_MULTIPLE"), "el pick de un nombre es ÚNICO: nada de múltiple");
    assert.ok(seg.includes("contactNameReply(id, \"\")"), "si el selector ni siquiera abre, la respuesta es cancelación");
  });

  it("la respuesta nativa: solo el DISPLAY_NAME, citado como JSON, con el id de la vuelta", () => {
    const branch = main.slice(main.indexOf("RQ_CONTACT_NAME ->"), main.indexOf("RQ_CONTACT_NAME ->") + 1100);
    assert.ok(branch.includes("arrayOf(ContactsContract.Contacts.DISPLAY_NAME)"), "se consulta SOLO el nombre visible del contacto elegido");
    assert.ok(branch.includes("contactNameReply(id, name)"), "la rama responde por el ayudante del contrato");
    assert.ok(branch.includes("contactNameId = null"), "el id pendiente se consume: ninguna respuesta tardía llena otro campo");
    const reply = main.slice(main.indexOf("private fun contactNameReply"), main.indexOf("private fun contactNameReply") + 400);
    assert.ok(reply.includes("CustomEvent('faronative-contact-name'"), "el evento es faronative-contact-name");
    assert.ok(reply.includes("JSONObject.quote(id)") && reply.includes("JSONObject.quote(name)"), "id y nombre viajan citados como JSON (un nombre con comillas no rompe el evento)");
  });

  it("la privacidad: ningún permiso de contactos, en ninguna parte", () => {
    assert.ok(!manifest.includes("READ_CONTACTS"), "el manifiesto NO declara READ_CONTACTS");
    // La carcasa sí pide POST_NOTIFICATIONS por su cuenta (1.3.148) — eso es suyo y no se
    // toca; lo que se cerca es que la maquinaria de contactos no pide NINGÚN permiso.
    const machinery = main.slice(main.indexOf("fun pickContactName"), main.indexOf("fun pickContactName") + 1400)
      + main.slice(main.indexOf("RQ_CONTACT_NAME ->"), main.indexOf("RQ_CONTACT_NAME ->") + 1100);
    assert.ok(!machinery.includes("permission") && !machinery.includes("requestPermissions"), "el pick de contactos no pide permisos: el selector del sistema es el único camino");
  });
});
