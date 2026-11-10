// La versión, con una sola fuente de verdad (1.3.184): el número que la app
// muestra al fondo de Ajustes sale de build-version.ts, que build.sh estampa
// desde el VERSION de public/sw.js en cada publicación. Este archivo es el
// alambre de tropiezo: si alguien sube la versión en sw.js sin pasar por la
// construcción (o edita el estampado a mano), la suite truena antes de que
// un número viejo pueda llegar al teléfono.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { FARO_VERSION } from "./build-version.ts";

const sw = fs.readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
const swVersion = /VERSION\s*=\s*"faro-([0-9]+\.[0-9]+\.[0-9]+)"/.exec(sw)?.[1];

describe("versión: una sola fuente de verdad", () => {
  it("sw.js declara una versión con forma faro-X.Y.Z", () => {
    assert.ok(swVersion, "public/sw.js no declara VERSION");
  });
  it("el número estampado en el paquete es exactamente el de sw.js", () => {
    assert.equal(FARO_VERSION, swVersion);
  });
  it("el número estampado tiene forma X.Y.Z", () => {
    assert.match(FARO_VERSION, /^[0-9]+\.[0-9]+\.[0-9]+$/);
  });
});
