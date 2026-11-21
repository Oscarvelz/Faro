/**
 * Captura Inteligente — PIEZA 0: EL NOMBRE PROPIO (mapa §19.5, brief
 * BRIEF-PIEZA-0-NOMBRE.md, ola 1.3.363). Las cercas del brief:
 * (1) sin nombre, habla idéntica a hoy; (2) el nombre solo entra por los
 * umbrales de la lista cerrada; (3) el correo no es un nombre; (4)
 * renombrar no reescribe el pasado; (5) el nombre vive en la cuenta,
 * nunca en los datos de un libro.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { addressHeadline, chosenNameOf, NAME_ASK_KEY, waitQuestion } from "./personname";
import { FEATURES, modeReaches } from "./mode";
import { createInitial } from "./defaults";

const src = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

test("363 cerca 3 — el correo no es un nombre: el repuesto se lee como «sin nombre»", () => {
  // Lo escrito al registrarse (name || email): si quedó el correo, no hay nombre.
  assert.equal(chosenNameOf({ given: "oscar@example.com", name: "oscar@example.com", email: "oscar@example.com" }), null);
  assert.equal(chosenNameOf({ name: "oscar@example.com", email: "oscar@example.com" }), null);
  assert.equal(chosenNameOf({ given: "", name: "", email: "oscar@example.com" }), null);
  assert.equal(chosenNameOf(null), null);
  assert.equal(chosenNameOf(undefined), null);
});

test("363 cerca 1 — el nombre escrito ES el nombre, y sin nombre el texto vuelve intacto", () => {
  assert.equal(chosenNameOf({ given: "María", name: "María", email: "maria@example.com" }), "María");
  assert.equal(chosenNameOf({ given: null, name: "María", email: "maria@example.com" }), "María");
  assert.equal(chosenNameOf({ given: "  María  ", email: "maria@example.com" }), "María");
  const h = "Este mes cerraste debiendo menos que el anterior.";
  assert.equal(addressHeadline(h, null), h); // palabra por palabra, como hoy
  assert.equal(waitQuestion("es", null), "¿Todavía lo quieres?");
  assert.equal(waitQuestion("en", null), "Do you still want it?");
});

test("363 umbrales — la apertura y la pregunta gastan el nombre una vez, delante", () => {
  assert.equal(
    addressHeadline("Este mes cerraste debiendo menos que el anterior.", "María"),
    "María, este mes cerraste debiendo menos que el anterior.",
  );
  assert.equal(
    addressHeadline("You closed the month owing less.", "María"),
    "María, you closed the month owing less.",
  );
  // Lo que no empieza con letra mayúscula no se toca tras el nombre.
  assert.equal(addressHeadline("$340 es tu saldo.", "María"), "María, $340 es tu saldo.");
  assert.equal(waitQuestion("es", "María"), "María, ¿todavía lo quieres?");
  assert.equal(waitQuestion("en", "María"), "María, do you still want it?");
});

test("363 cerca 2 — la lista cerrada: solo la apertura del Asesor y la pregunta de la espera gastan el nombre", () => {
  // El Reading se compone sin nombre: ni el motor del Asesor ni Preguntar
  // conocen chosenNameOf — el nombre se antepone SOLO al presentar la
  // apertura (screens) y en la tarjeta de la espera (waitlist).
  assert.ok(!src("./advisor.ts").includes("chosenNameOf"), "advisor.ts no conoce el nombre");
  assert.ok(!src("./ask.ts").includes("chosenNameOf"), "ask.ts no conoce el nombre");
  assert.ok(!src("./ask2.ts").includes("chosenNameOf"), "ask2.ts no conoce el nombre");
  assert.ok(!src("./engine.ts").includes("chosenNameOf"), "engine.ts no conoce el nombre");
  const dir = new URL("../../components/faro/", import.meta.url);
  const spenders = readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .filter((f) => readFileSync(join(dir.pathname, f), "utf8").includes("chosenNameOf"))
    .sort();
  assert.deepEqual(spenders, ["screens.tsx", "waitlist.tsx"]);
  const screens = src("../../components/faro/screens.tsx");
  assert.ok(screens.includes("addressHeadline(reading.headline, personName)"), "la apertura se presenta con nombre");
});

test("363 cerca 5 — el nombre vive en la cuenta: ningún libro lo guarda y el lector no toca libros", () => {
  const book = createInitial("es", "oscuro");
  assert.ok(!JSON.stringify(book).includes("chosenName"), "el libro no nace con campo de nombre");
  assert.ok(!src("./personname.ts").includes('from "./types"'), "el lector no importa el libro");
  assert.ok(!src("./personname.ts").includes('from "./reducer"'), "el lector no importa la sesión del libro");
  // La escritura va a la cuenta (cloud.saveChosenName → user_metadata).
  const cloud = src("../../spa/cloud.ts");
  assert.ok(cloud.includes("saveChosenName"), "cloud guarda el nombre en la cuenta");
  assert.ok(cloud.includes("user_metadata"), "la fuente es la cuenta");
});

test("363 cerca 4 y la pregunta — renombrar no reescribe el pasado; la pregunta se hace una vez", () => {
  // Nada en el historial ni en las líneas interpola el nombre: el nombre
  // nuevo solo rige las presentaciones futuras (apertura y pregunta).
  assert.ok(!src("../../components/faro/historial.tsx").includes("chosenNameOf"), "el historial no se reescribe");
  assert.equal(NAME_ASK_KEY("u1"), "faro-name-asked.u1");
  const gates = src("../../spa/gates.tsx");
  assert.ok(gates.includes("NameAsk"), "la pregunta existe en la puerta");
  assert.ok(gates.includes("NameRow"), "la fila espera en Ajustes");
  assert.ok(gates.includes("NAME_ASK_KEY(user.id)"), "la pregunta se marca por cuenta");
});

test("363 el asiento — corregir el propio nombre es Esencial", () => {
  assert.equal(FEATURES["account.name"], "esencial");
  assert.ok(modeReaches("esencial", FEATURES["account.name"]));
});
