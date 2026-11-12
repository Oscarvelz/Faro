import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

// EL REGISTRO DE VENTANAS (Oscar, chat de ventanas, 2026-11-10): «It should be
// coming by default, so we don't need to hunt any other window later.» Toda
// ventana de Faro nace en un sistema registrado y centrada — por defecto, no
// por cacería. Esta cerca escanea TODO el CSS de src/ buscando clases de
// telón (-scrim / -back): cualquier clase nueva que aparezca sin registrar
// tumba la suite hasta que alguien la clasifique aquí y, si es ventana, la
// centre (la ley del centro, centro.test.ts). Las disposiciones:
//   center   — telón de ventana: la ventana va al centro preciso.
//   rides    — variante sobre un telón registrado (no es telón por sí sola).
//   anchored — telón cazaclics de un pop anclado a su botón (no es ventana).
//   button   — botón de regresar que lleva «back» en el nombre; no es telón.
//   state    — clase de estado que termina en «back» por casualidad; no es telón.

const REGISTRY: Record<string, "center" | "rides" | "anchored" | "button" | "state"> = {
  "ask-back": "center",
  "xp-scrim": "center",
  "fit-scrim": "center",
  "imp-scrim": "center",
  "imp-pick-scrim": "center",
  "scn-scrim": "center",
  "stm-scrim": "center",
  "shr-scrim": "center",
  "modal-back": "center",
  "debt-person-back": "rides",
  "card-scrim": "rides",
  "scn-pop-scrim": "anchored",
  "bk-back": "button",
  "mn-back": "button",
  "rp-back": "button",
  "where-back": "button",
  "is-back": "button",
  "is-pz-back": "state",
};

const root = path.join(process.cwd(), "src");
const cssFiles: string[] = [];
const walk = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".css")) cssFiles.push(p);
  }
};
walk(root);
const allCss = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

describe("el registro de ventanas — ninguna ventana nace fuera del sistema", () => {
  it("toda clase de telón (-scrim / -back) del CSS está registrada", () => {
    const found = new Set<string>();
    for (const m of allCss.matchAll(/\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*-(?:scrim|back))\b/g)) found.add(m[1]);
    const unregistered = [...found].filter((c) => !(c in REGISTRY));
    assert.deepEqual(unregistered, [], `clases de telón sin registrar: ${unregistered.join(", ")} — clasifícalas en ventanas.test.ts y centra las que sean ventana`);
  });

  it("el registro no guarda fantasmas: cada clase registrada existe en el CSS", () => {
    const missing = Object.keys(REGISTRY).filter((c) => !new RegExp(`\\.${c}\\b`).test(allCss));
    assert.deepEqual(missing, [], `clases registradas que ya no existen: ${missing.join(", ")}`);
  });

  it("la ventana modal de ayuda (.modal-back) está centrada", () => {
    assert.match(allCss, /\.modal-back\s*\{[^}]*place-items:\s*center/);
  });

  it("la puerta de GitHub vive SOLO en Eliminar cuenta, nunca en Cerrar sesión", () => {
    const provider = fs.readFileSync(path.join(root, "components/faro/provider.tsx"), "utf8");
    const gates = fs.readFileSync(path.join(root, "spa/gates.tsx"), "utf8");
    assert.match(provider, /typeText\?: string/);
    assert.match(provider, /disabled=\{!!confirmState\.typeText && confirmTyped !== confirmState\.typeText\}/);
    // Exactamente UNA puerta en Cuenta: la de eliminar. Cerrar sesión es ida y vuelta.
    assert.equal(gates.match(/typeText: user\.email \|\| undefined/g)?.length, 1);
    assert.match(gates, /title: w\("acct\.delTitle"\),\n\s+body: w\("acct\.delWarn"\),\n\s+danger: true,\n\s+typeText: user\.email \|\| undefined,/);
    const outBlock = gates.slice(gates.indexOf('title: w("acct.out")'), gates.indexOf('title: w("acct.out")') + 200);
    assert.ok(!outBlock.includes("typeText"), "Cerrar sesión no lleva typeText");
  });

  it("eliminar cuenta: la salida amable dentro de la ventana y el orden honesto del borrado", () => {
    const provider = fs.readFileSync(path.join(root, "components/faro/provider.tsx"), "utf8");
    const gates = fs.readFileSync(path.join(root, "spa/gates.tsx"), "utf8");
    const cloud = fs.readFileSync(path.join(root, "spa/cloud.ts"), "utf8");
    // La ventana puede ofrecer «Descargar mi libro» sin cerrarse.
    assert.match(provider, /extraLabel\?: string; extraRun\?: \(\) => void/);
    assert.match(provider, /className="ask-extra"/);
    assert.match(gates, /extraLabel: w\("acct\.delGetBook"\),\n\s+extraRun: \(\) => exportJson\(\),/);
    // El servidor confirma ANTES de tocar nada local; si no confirma, nada se borra.
    const run = gates.slice(gates.indexOf("const gone = await deleteAccountForever();"));
    assert.ok(run.indexOf("if (!gone)") < run.indexOf("wipeDevice(user.id)"), "sin confirmación del servidor no hay limpieza local");
    assert.match(cloud, /supabase\.rpc\("faro_delete_account"\)/);
    // La pieza del servidor existe en el repo, preparada como las demás.
    const sql = fs.readFileSync(path.join(process.cwd(), "delete-account.sql"), "utf8");
    assert.match(sql, /create or replace function public\.faro_delete_account\(\)/);
    assert.match(sql, /delete from auth\.users where id = uid;/);
  });

  it("la puerta única de salida de Ajustes vive en setUi (chat de ventanas, punto 1)", () => {
    const provider = fs.readFileSync(path.join(root, "components/faro/provider.tsx"), "utf8");
    assert.match(provider, /uiRef\.current\.section === "settings" &&\s*hasPanelExit\(\)/);
    assert.match(provider, /guardPanelExit\(\(\) => \{/);
  });

  it("las entradas (punto 5): la decisión se asienta en el centro; la hoja de trabajo sube", () => {
    // Las ventanas de decisión NACEN en el centro: desvanecido + asentada (scale),
    // sin viaje vertical. ask-rise sirve a .ask y a la ficha de persona (debt-person).
    assert.match(allCss, /@keyframes ask-rise \{ from \{ opacity: 0; transform: scale\(0\.97\); \} \}/);
    assert.ok(!/@keyframes ask-rise[^}]*translateY/.test(allCss), "ask-rise ya no viaja desde abajo");
    assert.match(allCss, /@keyframes xp-up \{ from \{ transform: scale\(0\.97\); opacity: 0; \} \}/);
    assert.match(allCss, /@keyframes modal-in \{ from \{ opacity: 0; transform: scale\(0\.97\); \} \}/);
    // Las hojas altas de trabajo conservan su subida — a su tamaño les queda bien.
    for (const [name, file] of [["fit-rise", "fit-form.css"], ["imp-up", "bank.css"], ["scn-up", "scan.css"], ["stm-up", "stmt.css"]] as const) {
      const css = fs.readFileSync(path.join(root, "components/faro", file), "utf8");
      assert.match(css, new RegExp(`@keyframes ${name} \\{ from \\{[^}]*translateY`), `${name} conserva la subida`);
    }
  });

  it("los tonos honestos del censo (punto 4): borrar y restaurar-que-pisa llevan danger", () => {
    const fit = fs.readFileSync(path.join(root, "components/faro/fit-pick.tsx"), "utf8");
    const bankSettings = fs.readFileSync(path.join(root, "components/faro/bank-settings.tsx"), "utf8");
    const bankImport = fs.readFileSync(path.join(root, "components/faro/bank-import.tsx"), "utf8");
    const screens = fs.readFileSync(path.join(root, "components/faro/screens.tsx"), "utf8");
    assert.match(fit, /"Borrar frecuencia", "Delete frequency"\),\n\s+body: [^\n]+\n\s+danger: true,/);
    assert.match(bankSettings, /"Restaurar tasas", "Restore rates"\), body: [^\n]+danger: true,/);
    assert.match(bankImport, /"Restaurar bancos", "Restore banks"\),\n\s+body: [^\n]+\n\s+danger: true,/);
    // Restaurar atajos ya no actúa al instante: pregunta, con danger y cuerpo honesto.
    assert.match(screens, /confirm\(\{ title: t\("settings\.resetKeys"\), body: t\("settings\.resetKeys\.body"\), danger: true,/);
  });
});
