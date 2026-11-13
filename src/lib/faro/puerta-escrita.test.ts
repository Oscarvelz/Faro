// LA PUERTA ESCRITA, cercada entera (Oscar, 2026-11-12): la confirmación irreversible
// exige escribir el correo de la sesión A MANO — comparación exacta y CASE SENSITIVE,
// sin que ningún autocorrector ni autocompletado del teclado lo presente para un toque
// perezoso. La comparación estricta ya la cercaba ventanas.test.ts; lo que faltaba era
// cercar el CAMPO: sus atributos de «sin ayuda» vivían sin cerca, y una edición futura
// podía quitárselos sin romper una sola prueba. Esta cerca los fija en provider.tsx,
// que es donde la ventana de confirmación (la única que sabe pedir texto) se dibuja.
// La puerta tiene dos casas: Eliminar cuenta (gates.tsx) y eliminar un período
// apartado en el Archivo universal (archivo.tsx) — el mismo ritual en ambas.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(process.cwd(), "src");
const provider = fs.readFileSync(path.join(root, "components/faro/provider.tsx"), "utf8");
const archivo = fs.readFileSync(path.join(root, "components/faro/archivo.tsx"), "utf8");

/** El bloque JSX del campo donde se escribe el texto de la puerta. */
function askTypeInput(src: string): string {
  const at = src.indexOf('className="field ask-type"');
  assert.ok(at >= 0, "provider.tsx ya no dibuja el campo de la puerta escrita");
  const start = src.lastIndexOf("<input", at);
  const end = src.indexOf("/>", at);
  assert.ok(start >= 0 && end > start, "el campo de la puerta no es un <input> autocerrado");
  return src.slice(start, end + 2);
}

describe("la puerta escrita: el campo no acepta ayuda del teclado", () => {
  it("autocompletado, autocorrección y mayúsculas automáticas: apagados", () => {
    const input = askTypeInput(provider);
    assert.match(input, /autoComplete="off"/, "el teclado no debe presentar el correo");
    assert.match(input, /autoCorrect="off"/, "sin autocorrector: cada letra la escribe el dueño");
    assert.match(input, /autoCapitalize="off"/, "sin mayúsculas automáticas: la comparación es case sensitive");
  });

  it("corrección ortográfica apagada y ningún nombre para que el navegador lo recuerde", () => {
    const input = askTypeInput(provider);
    assert.match(input, /spellCheck=\{false\}/);
    assert.ok(!/\sname=/.test(input), "el campo no lleva name: nada a lo que el navegador pueda colgar el correo");
    assert.match(input, /type="text"/, "texto plano: un campo type=email invitaría la libreta de correos");
  });

  it("la comparación que arma el botón es estricta (case sensitive, sin recortes)", () => {
    // El botón nace desarmado y solo la igualdad exacta lo arma: ni toLowerCase ni trim.
    assert.match(provider, /disabled=\{!!confirmState\.typeText && confirmTyped !== confirmState\.typeText\}/);
    const askTypeAt = provider.indexOf('className="field ask-type"');
    const around = provider.slice(Math.max(0, askTypeAt - 400), askTypeAt + 800);
    assert.ok(!/toLowerCase|trim\(\)/.test(around.replace("confirmTyped", "x")), "nada normaliza lo escrito junto a la puerta");
  });

  it("el Archivo pide la misma puerta para eliminar un período, con su salida amable", () => {
    assert.match(archivo, /typeText: user\?\.email \|\| undefined/, "eliminar un período exige el correo de la sesión");
    assert.match(archivo, /extraRun: \(\) => exportJson\(\)/, "«Descargar mi libro primero» vive dentro de la ventana");
    assert.match(archivo, /danger: true/);
  });
});
