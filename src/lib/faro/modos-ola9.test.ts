/**
 * FARO — OLA 9 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: LOS ASIENTOS FANTASMA. El mapa §10 nombraba
 * dos asientos que ningún código consume — accounts.panel y
 * vault.retiro-fields — y las cercas cruzaban contra el fantasma y
 * quedaban verdes mientras la cara trabajaba en otro modo: el
 * formulario de movimiento de cuentas trabaja en Esencial y sus temas
 * anunciaban «Eso vive en Ritmo» (CARA-1); «Acumulado si no se toca»
 * pinta y se lee en Ritmo y su tema anunciaba Completo (CARA-2); y la
 * hermana f-cuenta-nombre colgaba del mismo fantasma, salvada solo por
 * la coincidencia de modos. La cura re-asienta los temas al asiento que
 * gobierna de verdad su superficie y hace nacer el CENSO DE
 * CONSUMIDORES (§A): todo asiento que el mapa nombra tiene un
 * consumidor real en el árbol, o una exención escrita con su mecanismo
 * — un fantasma ya no puede volver en silencio. La misma ola dejó dos
 * hallazgos de cerca: los testigos iconPicked/brandTouched, de cuyo
 * nacimiento falso cuelga la restauración del icono G-6, quedan fijados
 * junto a su especie en la §D de modos-ola7 (G9-1); y el censo de
 * familias de la Presentación, que ataba por ORTOGRAFÍA, se deriva
 * aquí de las BANDERAS de modo (§E, E9-1): un sufijo sin bandera y una
 * bandera con sufijo desconocido corren rojos en los dos sentidos.
 * Donde la rotura vive en un componente, la cerca es de fuente y el
 * banco CDP de la ronda la acompaña (shots-cura9/). Los libros son
 * especímenes fijados a mano sobre el 2026-11-17; jamás producción.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ts from "typescript";
import { MODULES, TOPIC_SCENES, type Scene } from "./guion.ts";
import { FEATURES } from "./mode.ts";
import { MANUAL_TOPICS, topicMode } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const modeOf = (id: string) => {
  const t = MANUAL_TOPICS.find((x) => x.id === id);
  assert.ok(t, `el tema ${id} existe`);
  return topicMode(t!);
};

/* ═══════════ §A · EL CENSO DE CONSUMIDORES (la raíz de CARA-1/2) ═══════
 * El mapa §10 nombra 99 asientos. Hasta la ola 8, ninguna cerca
 * preguntaba si el árbol los CONSUME: §A (ola7) cruzaba tema↔asiento y
 * el asiento podía ser un fantasma — declarado en el registro, cruzado
 * en el mapa, y sin una sola puerta en el código. El censo deriva los
 * asientos del propio mapa y exige, para cada uno, una mención real
 * fuera de su declaración (una has(), un gate(), un featureForGo, una
 * tabla de composición) o una exención escrita aquí con su mecanismo
 * estructural. El corpus excluye los tests, el propio mapa, topics.ts
 * (que nombra temas, no asientos) e i18n.ts (cuyas claves coinciden a
 * veces con nombres de asiento sin serlo), y desnuda los comentarios:
 * una mención en un comentario no consume nada.
 * ENMIENDA OLA 11 (CARA-3/4): «mención real» significa desde esta ola un
 * SITIO DE LLAMADA (ver consumedIn): la forma anterior contaba menciones
 * entre comillas, y el texto — regex, plantilla, cadena sin uso —
 * resucitaba puertas muertas mientras una puerta construida era acusada
 * de fantasma. */
const MAPA_SRC = SRC("./modos-ola5.test.ts");
const MAP_SEATS = new Set<string>();
for (const m of MAPA_SRC.matchAll(/\{ f: "([a-z0-9.-]+)", m: "(esencial|ritmo|completo)" \}/g)) MAP_SEATS.add(m[1]!);

/* El desnudado de comentarios (OLA 10 · CARA-3): la primera forma quitaba
 * los comentarios de bloque y las líneas que EMPIEZAN por // — pero un
 * comentario al final de una línea de código sobrevivía entero, y su
 * mención de un asiento entre comillas contaba como consumo: la caza
 * escenificó una puerta muerta (has("accounts.add") convertido en true)
 * que volvía a la vida con solo añadir `// la puerta muerta de
 * "accounts.add" ya no se consulta` a una línea viva (la suite pasaba
 * 14/14). Este desnudado camina el texto como un lexer mínimo: conoce las
 * cadenas ('…' y "…"), las plantillas con sus ${} anidados, las regex por
 * su contexto, y los comentarios de línea y de bloque EN CUALQUIER
 * POSICIÓN. Una mención solo cuenta si vive en código o en una cadena del
 * código — nunca en un comentario. Las comillas y las barras solo abren
 * cadena o regex en contexto de expresión (tras un operador, un paréntesis,
 * una palabra clave…): el apóstrofo de un texto JSX («Don't») es una letra,
 * no el arranque de una cadena, y la barra de un cierre JSX (</div>) es
 * texto, no una regex. Límite declarado: una regex tras `=>` sin
 * paréntesis ni tras un `>` de comparación se leería como división — en
 * este corpus no existe ninguna, y el censo de abajo verifica que los
 * conteos sobre el corpus real no cambian contra la forma vieja en
 * ningún asiento. */
const STRIP_KEYWORDS = new Set(["return", "typeof", "case", "in", "of", "new", "delete", "void", "yield", "await", "throw", "else", "do"]);
const STRIP_CTX = new Set([..."(,=:[!&|?{};+-*%~^"]);
export function stripComments(src: string): string {
  let out = "";
  let prev = ""; // último carácter significativo emitido ("" = arranque)
  let sig = ""; // los dos últimos, para reconocer «=>»
  let word = ""; // identificador en curso
  let lastWord = ""; // último identificador completado
  type Frame = { tpl: true } | { expr: true; depth: number };
  const stack: Frame[] = [];
  let mode: "code" | "sq" | "dq" | "tpl" | "line" | "block" | "regex" | "regexClass" = "code";
  const emit = (s: string) => { out += s; };
  const note = (c: string) => { prev = c; sig = (sig + c).slice(-2); };
  const flushWord = () => { if (word) { lastWord = word; word = ""; } };
  const exprContext = () => prev === "" || STRIP_CTX.has(prev) || sig === "=>" || STRIP_KEYWORDS.has(lastWord);
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    const next = src[i + 1] ?? "";
    if (mode === "line") { if (c === "\n") { mode = "code"; emit(c); } continue; }
    if (mode === "block") {
      if (c === "\n") emit(c);
      if (c === "*" && next === "/") { i++; mode = "code"; emit(" "); }
      continue;
    }
    if (mode === "sq" || mode === "dq") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) { mode = "code"; note('"'); lastWord = ""; }
      continue;
    }
    if (mode === "regex" || mode === "regexClass") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if (mode === "regex" && c === "[") mode = "regexClass";
      else if (mode === "regexClass" && c === "]") mode = "regex";
      else if (mode === "regex" && c === "/") { mode = "code"; note('"'); lastWord = ""; }
      continue;
    }
    if (mode === "tpl") {
      emit(c);
      if (c === "\\") { if (i + 1 < src.length) emit(src[++i]!); continue; }
      if (c === "`") { stack.pop(); mode = "code"; note('"'); lastWord = ""; continue; }
      if (c === "$" && next === "{") { emit(next); i++; stack.push({ expr: true, depth: 0 }); mode = "code"; note("{"); }
      continue;
    }
    /* mode === "code" */
    if (/[A-Za-z0-9_$]/.test(c)) { word += c; emit(c); note(c); continue; }
    flushWord();
    if (c === " " || c === "\t" || c === "\r" || c === "\n") { emit(c); continue; }
    if (c === "/" && next === "/") { i++; mode = "line"; continue; }
    if (c === "/" && next === "*") { i++; mode = "block"; continue; }
    if (c === "'" || c === '"') {
      if (exprContext()) mode = c === "'" ? "sq" : "dq";
      emit(c); note(c); continue;
    }
    if (c === "`") { stack.push({ tpl: true }); mode = "tpl"; emit(c); note(c); continue; }
    if (c === "/") {
      if (exprContext()) mode = "regex";
      emit(c); note(c); continue;
    }
    if (c === "{") {
      const top = stack[stack.length - 1];
      if (top && "expr" in top) top.depth++;
      emit(c); note(c); continue;
    }
    if (c === "}") {
      const top = stack[stack.length - 1];
      if (top && "expr" in top) {
        if (top.depth === 0) { stack.pop(); mode = "tpl"; emit(c); note(c); continue; }
        top.depth--;
      }
      emit(c); note(c); continue;
    }
    emit(c); note(c);
  }
  return out;
}

function corpus(): string {
  const root = new URL("../../", import.meta.url);
  const strip = stripComments;
  let out = "";
  const walk = (dir: URL, rel: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { walk(new URL(`${e.name}/`, dir), r); continue; }
      if (!/\.(ts|tsx)$/.test(e.name) || /\.test\.ts$/.test(e.name)) continue;
      if (r === "lib/manual/topics.ts" || r === "lib/faro/i18n.ts") continue;
      out += "\n" + strip(readFileSync(new URL(e.name, dir), "utf8"));
    }
  };
  walk(root, "");
  return out;
}
const CORPUS = corpus();
/* ── OLA 11 · CARA-3/4: EL CENSO CUENTA GOBIERNO, NO TEXTO ─────────────
 * Hasta la ola 10, `consumed` contaba MENCIONES: el nombre del asiento
 * entre comillas dos veces en el corpus desnudado. La caza de la ola 11
 * probó que el texto miente en las dos direcciones: una regex
 * (/"accounts.add"/), el texto de una plantilla y una cadena jamás
 * llamada resucitaban una puerta muerta a 22/22 verde (M3-a/b/c); y una
 * puerta viva construida — has(("accounts." + "add")) — era acusada de
 * fantasma porque su nombre nunca aparece entero (M3-d). Desde esta ola
 * el censo cuenta SITIOS DE LLAMADA:
 *   (a) llamada directa con literal: has("x") / gate("x") /
 *       featureForGo("x"), con cualquier comilla (la de plantilla
 *       estática incluida);
 *   (b) el literal dentro de los argumentos de una llamada (el
 *       `?? "study.fold-…"` tras una tabla);
 *   (c) el literal en el cuerpo de una TABLA que una llamada indexa
 *       (has(TABLA[id] ?? …) — la tabla de composición de la doctrina);
 *   (d) una constante de cadena resuelta: const X = "x" y has(X) en el
 *       mismo corpus — la cadena sin la llamada NO consume (M3-c);
 *   (e) la concatenación estática resuelta dentro de una llamada:
 *       has(("accounts." + "add")) consume accounts.add (M3-d);
 *   (f) el asiento que el mapeo de featureForGo DEVUELVE (el puente
 *       tema→asiento es su gobierno: nav.tablet-views vive solo ahí).
 * Una llamada de varios argumentos nunca es la puerta (has/gate toman
 * un solo FeatureId): el `has` local de bankparse.ts no acusa ni consume.
 * Y la dirección contraria tiene su propia cerca: toda llamada has/gate
 * cuyo argumento no se resuelve por ninguna forma estática ACUSA EN VOZ
 * ALTA (unresolvedGates) en vez de condenar a un asiento por fantasma —
 * salvo los flujos de tipo FeatureId (has(f as F), el paseo genérico de
 * shell.tsx) y el resultado de featureForGo(), que son mecanismos, no
 * nombres. */
const SEAT_ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/* ── OLA 12 · CARA-3: EL CENSO SIGUE EL GOBIERNO, NO EL NOMBRE ────────
 * La vuelta anterior resolvía formas estáticas con nombres literales:
 * la media concatenación vestía el traje de la estática y la puerta no
 * era acusada (12E); un `has` importado con alias era invisible para el
 * consumo y para la acusación (12F); una tabla invocada por su alias no
 * emparejaba con su declaración (12G2); y la cadena de dos saltos traía
 * DOBLE sentencia — la puerta acusada por su nombre y el asiento
 * condenado por fantasma a la vez (12H2). La cura: las constantes se
 * resuelven por CADENA (salto a salto hasta el literal o el callejón);
 * los alias de importación de las funciones puerta se recogen de los
 * propios import del corpus; las tablas emparejan por su SITIO DE
 * DECLARACIÓN siguiendo los alias; la concatenación solo exime si sus
 * dos mitades resuelven; y un asiento al final de una puerta acusada se
 * reporta consumido-por-puerta-acusada (defecto de la puerta), jamás
 * fantasma: una sola sentencia, sobre el culpable que la doctrina
 * nombra. */
function gateNames(text: string): string[] {
  const names = new Set(["has", "gate"]);
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const a of m[1]!.matchAll(/\b(has|gate|featureForGo)\s+as\s+([A-Za-z_$][\w$]*)/g)) names.add(a[2]!);
  }
  /* OLA 13 (mut13-a T2): los alias LOCALES de puerta entran en la tabla de
   * nombres — `const puede2 = puede` (puede = has importado con alias) ES
   * la puerta: sin este paso la llamada era un fantasma EN SILENCIO (nadie
   * la acusaba: gateNames no la conocía y el asiento no se consumía). Se
   * sigue la cadena de asignaciones nombre = nombre hasta punto fijo. */
  for (let round = 0; round < 8; round++) {
    let grew = false;
    for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g)) {
      if (names.has(m[2]!) && !names.has(m[1]!)) { names.add(m[1]!); grew = true; }
    }
    if (!grew) break;
  }
  return [...names];
}
const gateAlt = (text: string, extra: string[] = []) => [...gateNames(text), ...extra].join("|");
/** Resolución por cadena: nombre → literal final, siguiendo los saltos
 * nombre = nombre hasta el literal o el callejón (con guarda de ciclo). */
function resolveChainsRaw(text: string): Map<string, string> {
  const litOf = new Map<string, string>();
  const edge = new Map<string, string>();
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*["'`]([\w.-]*)["'`]/g)) litOf.set(m[1]!, m[2]!);
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g)) edge.set(m[1]!, m[2]!);
  const out = new Map<string, string>();
  const resolve = (name: string): string | undefined => {
    const seen = new Set<string>();
    let cur: string | undefined = name;
    while (cur !== undefined && !seen.has(cur)) {
      if (litOf.has(cur)) return litOf.get(cur);
      seen.add(cur);
      cur = edge.get(cur);
    }
    return undefined;
  };
  for (const name of new Set([...litOf.keys(), ...edge.keys()])) {
    const v = resolve(name);
    if (v !== undefined) out.set(name, v);
  }
  return out;
}
/* OLA 14: la resolución se memoiza por texto — los censos preguntan
 * por cientos de asientos sobre el mismo corpus y la cadena de un
 * texto no cambia entre preguntas (sin esto, la §A-quater tardaba
 * minutos: cada consumed() re-resolvía el corpus entero). */
const chainsMemo = new Map<string, Map<string, string>>();
function resolveChains(text: string): Map<string, string> {
  const hit = chainsMemo.get(text);
  if (hit) return hit;
  const out = resolveChainsRaw(text);
  chainsMemo.set(text, out);
  return out;
}
/** El nombre raíz de una tabla: sigue los alias nombre = nombre hasta
 * el sitio de declaración.
 * OLA 13 (mut13-a T3): la raíz también sigue los ALIAS DE IMPORTACIÓN
 * entre archivos — `import { TABLA as ALIAS }` y `has(ALIAS[id])`: la
 * declaración vive bajo el nombre ORIGEN; sin este salto la tabla era un
 * fantasma en silencio (ni consumía ni acusaba). */
function importAliasRoot(text: string, name: string): string {
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const a of m[1]!.matchAll(/([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)/g)) {
      if (a[2] === name) return a[1]!;
    }
  }
  return name;
}
function tableRoot(text: string, name: string): string {
  const edge = new Map<string, string>();
  for (const m of text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g)) edge.set(m[1]!, m[2]!);
  const seen = new Set<string>();
  let cur = importAliasRoot(text, name);
  while (edge.has(cur) && !seen.has(cur)) { seen.add(cur); cur = edge.get(cur)!; }
  return importAliasRoot(text, cur);
}
const gateWindowsMemo = new Map<string, { fn: string; win: string }[]>();
function gateWindows(text: string): { fn: string; win: string }[] {
  const hit = gateWindowsMemo.get(text);
  if (hit) return hit;
  const out: { fn: string; win: string }[] = [];
  for (const m of text.matchAll(new RegExp(`(^|[^\\w$.])(${gateAlt(text)})\\(`, "g"))) {
    const at = m.index! + m[0].length;
    out.push({ fn: m[2]!, win: text.slice(at, at + 160) });
  }
  gateWindowsMemo.set(text, out);
  return out;
}
/* ¿La ventana es una llamada de VARIOS argumentos? Entonces no es la
 * puerta de modo (has/gate toman un solo FeatureId): es un `has` local
 * con el mismo nombre — el de bankparse.ts, que pregunta por cabeceras
 * de estado de cuenta («transaction date», «post date», …). */
function multiArg(win: string): boolean {
  let depth = 0;
  for (const c of win) {
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") { if (depth === 0) return false; depth--; }
    else if (c === "," && depth === 0) return true;
  }
  return false;
}
/* El cuerpo de featureForGo: los asientos que su mapeo DEVUELVE quedan
 * gobernados por el puente tema→asiento (nav.tablet-views vive solo ahí:
 * registro + el retorno del mapeo para el ancla «top-view»). */
function featureForGoBody(text: string): string {
  const at = text.search(/function featureForGo\(/);
  if (at < 0) return "";
  let i = text.indexOf("{", at);
  const start = i;
  let depth = 0;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) break; }
  }
  return text.slice(start, i + 1);
}
const tableBodiesMemo = new Map<string, string[]>();
function tableBodies(text: string): string[] {
  const hit = tableBodiesMemo.get(text);
  if (hit) return hit;
  const bodies = tableBodiesRaw(text);
  tableBodiesMemo.set(text, bodies);
  return bodies;
}
function tableBodiesRaw(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(new RegExp(`(?:${gateAlt(text)})\\(\\s*([A-Za-z_$][\\w$]*)\\s*\\[`, "g"))) names.add(m[1]!);
  const bodies: string[] = [];
  for (const invoked of names) {
    const name = tableRoot(text, invoked); // OLA 12: la tabla empareja por su sitio de declaración, no por el nombre de invocación
    const at = text.search(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\{`));
    if (at < 0) continue;
    let i = text.indexOf("{", at);
    const start = i;
    let depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") { depth--; if (depth === 0) break; }
    }
    bodies.push(text.slice(start, i + 1));
  }
  return bodies;
}
/* OLA 13 (mut13-a T1/T1b): el cuerpo de un objeto literal declarado en el
 * texto y el literal de cadena de una de sus propiedades — la cadena por
 * un OBJETO (`has(SEATS.add)` / `has(SEATS["add"])`) es UNA sola doctrina
 * con dos ortografías: el punto y el corchete resuelven igual. */
function objectBodyOf(text: string, name: string): string {
  const at = text.search(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\{`));
  if (at < 0) return "";
  let i = text.indexOf("{", at);
  const start = i;
  let depth = 0;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) break; }
  }
  return text.slice(start, i + 1);
}
function memberSeat(text: string, obj: string, prop: string): string | undefined {
  const body = objectBodyOf(text, obj);
  if (!body) return undefined;
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`(?:\\b${esc}\\b|["']${esc}["'])\\s*:\\s*["'\`]([\\w.-]*)["'\`]`).exec(body);
  return m?.[1];
}
function consumedIn(text: string, seat: string): boolean {
  const esc = SEAT_ESC(seat);
  const alt = gateAlt(text, ["featureForGo"]);
  // (a) llamada directa con literal (también bajo un alias de importación)
  if (new RegExp(`(^|[^\\w$.])(?:${alt})\\(\\s*["'\`]${esc}["'\`]`).test(text)) return true;
  // (b) el literal dentro de los argumentos de una llamada (fallbacks ??)
  if (new RegExp(`(^|[^\\w$.])(?:${alt})\\([^)]*["'\`]${esc}["'\`]`).test(text)) return true;
  // (e) concatenación / plantilla estática resuelta dentro de una llamada
  for (const { win } of gateWindows(text)) {
    if (multiArg(win)) continue;
    for (const m of win.matchAll(/["']([\w.-]*)["']\s*\+\s*["']([\w.-]*)["']/g)) {
      if (m[1]! + m[2]! === seat) return true;
    }
    for (const m of win.matchAll(/`([\w.-]*)\$\{\s*["']([\w.-]*)["']\s*\}`/g)) {
      if (m[1]! + m[2]! === seat) return true;
    }
  }
  // (f) el asiento que el mapeo de featureForGo devuelve: el puente lo gobierna
  if (new RegExp(`["'\`]${esc}["'\`]`).test(featureForGoBody(text))) return true;
  // (c) el literal en el cuerpo de una tabla indexada por una llamada
  for (const body of tableBodies(text)) {
    if (new RegExp(`["'\`]${esc}["'\`]`).test(body)) return true;
  }
  // (d) constante resuelta POR CADENA (los saltos que haya) y LLAMADA
  // por cualquiera de sus nombres — OLA 12: la cadena de dos saltos
  // consume a su asiento; ya no hay sentencia de fantasma sobre él.
  const chains = resolveChains(text);
  for (const [name, lit] of chains) {
    if (lit !== seat) continue;
    if (new RegExp(`(^|[^\\w$.])(?:${alt})\\(\\s*${name}\\s*\\)`).test(text)) return true;
  }
  /* OLA 13 (mut13-a): las dos formas que la ola 13 cazó ciegas.
   * (g) acceso a propiedad sobre un objeto de literales: has(SEATS.add)
   * y has(SEATS["add"]) consumen el asiento que la propiedad declara —
   * antes la forma de punto caía en DOBLE sentencia (el asiento por
   * fantasma y la puerta acusada a la vez).
   * (h) plantilla con hueco RESOLUBLE: has(`accounts.${SUF}`) con SUF
   * constante de cadena consume el asiento que la plantilla compone. */
  for (const { win } of gateWindows(text)) {
    if (multiArg(win)) continue;
    const arg = win.replace(/^\s+/, "");
    const dot = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\)/.exec(arg);
    const bracket = /^([A-Za-z_$][\w$]*)\[\s*["']([\w$-]+)["']\s*\]\s*\)/.exec(arg);
    const member = dot ?? bracket;
    if (member && memberSeat(text, member[1]!, member[2]!) === seat) return true;
    for (const m of arg.matchAll(/`([\w.-]*)\$\{\s*([A-Za-z_$][\w$]*)\s*\}([\w.-]*)`/g)) {
      const mid = chains.get(m[2]!);
      if (mid !== undefined && m[1]! + mid + m[3]! === seat) return true;
    }
  }
  return false;
}
/* OLA 14 (Cara A1): el argumento se juzga ENTERO. La exención (a) leía
 * solo la CABEZA de la ventana: `has("tools.mut14-" + SUF)` vestía el
 * traje del literal y la puerta quedaba absuelta con su segunda mitad
 * irresoluble — y CON cast la misma forma acusaba (12E): la doctrina
 * dependía del cast, no de la composición. La cura extrae el argumento
 * completo (balance de paréntesis y estados de cadena/plantilla), le
 * quita el cast de nivel superior y los paréntesis que lo envuelven, y
 * juzga CADA PIEZA de la composición: literal, constante de la cadena,
 * miembro de un objeto de literales, plantilla de huecos resolubles o
 * el puente featureForGo. Una pieza irresoluble acusa a la puerta,
 * venga con cast o sin él. */
function extractArg(win: string): string {
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = 0; i < win.length; i++) {
    const c = win[i]!;
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (quote === "`" && c === "$" && win[i + 1] === "{") { stack.push("`"); quote = null; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "(" || c === "[" || c === "{") { stack.push(c); continue; }
    if (c === ")" || c === "]" || c === "}") {
      if (stack.length === 0) return win.slice(0, i);
      if (stack[stack.length - 1] === "`" && c === "}") { stack.pop(); quote = "`"; continue; }
      stack.pop();
      continue;
    }
    if (c === "," && stack.length === 0) return win.slice(0, i);
  }
  return win;
}
/** Recorre `a` llamando a `at(i, depth0)` en cada posición de nivel
 * superior fuera de cadenas; devuelve los cortes pedidos. */
function scanTopLevel(a: string, at: (i: number) => boolean): number[] {
  const cuts: number[] = [];
  const stack: string[] = [];
  let quote: string | null = null;
  for (let i = 0; i < a.length; i++) {
    const c = a[i]!;
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (quote === "`" && c === "$" && a[i + 1] === "{") { stack.push("`"); quote = null; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "(" || c === "[" || c === "{") { stack.push(c); continue; }
    if (c === ")" || c === "]" || c === "}") {
      if (stack[stack.length - 1] === "`" && c === "}") { stack.pop(); quote = "`"; continue; }
      stack.pop();
      continue;
    }
    if (stack.length === 0 && at(i)) cuts.push(i);
  }
  return cuts;
}
function stripArg(a0: string): { arg: string; cast: boolean } {
  let a = a0.trim();
  let cast = false;
  const asAt = scanTopLevel(a, (i) => a.startsWith(" as ", i));
  if (asAt.length) { a = a.slice(0, asAt[asAt.length - 1]).trim(); cast = true; }
  for (;;) {
    if (!a.startsWith("(")) break;
    // ¿el primer paréntesis cierra exactamente al final?
    let depth = 0; let closeAt = -1;
    const stack: string[] = [];
    let quote: string | null = null;
    for (let i = 0; i < a.length; i++) {
      const c = a[i]!;
      if (quote) {
        if (c === "\\") { i++; continue; }
        if (quote === "`" && c === "$" && a[i + 1] === "{") { stack.push("`"); quote = null; i++; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
      if (c === "(" || c === "[" || c === "{") { stack.push(c); if (c === "(") depth++; continue; }
      if (c === ")" || c === "]" || c === "}") {
        if (stack[stack.length - 1] === "`" && c === "}") { stack.pop(); quote = "`"; continue; }
        stack.pop();
        if (c === ")") { depth--; if (depth === 0) { closeAt = i; break; } }
      }
    }
    if (closeAt === a.length - 1) { a = a.slice(1, -1).trim(); continue; }
    break;
  }
  return { arg: a, cast };
}
function unresolvedGates(text: string): string[] {
  const chains = resolveChains(text); // OLA 12: la resolución sigue la cadena entera
  const pieceResolves = (raw: string, outerCast = false, allowCast = false): boolean => {
    const { arg: p, cast } = stripArg(raw);
    if (!p) return false;
    if (/^["'][\w.-]*["']$/.test(p)) return true; // literal
    if (p.startsWith("`")) { // plantilla: estática, o de huecos TODOS resolubles
      if (!p.includes("${")) return /^`[\w.-]*`$/.test(p);
      const holes = [...p.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g)].map((h) => h[1]!);
      return holes.length > 0 && holes.every((h) => chains.has(h));
    }
    if (/^[A-Za-z_$][\w$]*$/.test(p)) return chains.has(p) || (allowCast && (cast || outerCast)); // (d) cadena; el cast solo absuelve al argumento-identificador entero (el flujo FeatureId), nunca a una pieza de composición (12E)
    const member = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(p) ?? /^([A-Za-z_$][\w$]*)\[\s*["']([\w$-]+)["']\s*\]$/.exec(p);
    if (member) return memberSeat(text, member[1]!, member[2]!) !== undefined; // la cadena por un objeto (13-T1)
    if (/^featureForGo\(/.test(p)) return true; // el puente tema→asiento
    if (/^[A-Za-z_$][\w$]*\s*\[/.test(p)) return true; // (c) tabla indexada: su cuerpo consume
    return false;
  };
  const argResolves = (raw: string): boolean => {
    const { arg, cast } = stripArg(raw);
    if (/^[A-Za-z_$][\w$]*\s*:/.test(arg)) return true; // firma de una declaración
    const cuts = scanTopLevel(arg, (i) => arg[i] === "+" && arg[i + 1] !== "+" && arg[i - 1] !== "+");
    if (!cuts.length) return pieceResolves(arg, cast, true);
    const pieces: string[] = [];
    let prev = 0;
    for (const at of cuts) { pieces.push(arg.slice(prev, at)); prev = at + 1; }
    pieces.push(arg.slice(prev));
    return pieces.every((p) => pieceResolves(p)); // (e) TODA pieza de la composición resuelve
  };
  const out: string[] = [];
  for (const m of text.matchAll(new RegExp(`(^|[^\\w$.])(${gateAlt(text)})\\(`, "g"))) {
    const before = text.slice(Math.max(0, m.index! - 12), m.index!);
    if (/function\s*$/.test(before)) continue; // la declaración, no una llamada
    const win = text.slice(m.index! + m[0].length, m.index! + m[0].length + 160);
    if (multiArg(win)) continue; // un `has` local de varios argumentos no es la puerta
    if (argResolves(extractArg(win))) continue;
    out.push(`${m[2]}(${win.slice(0, 60).replace(/\s+/g, " ")}…`);
  }
  return out;
}
/** OLA 12 · la otra mitad de la doctrina: un asiento al final de una
 * puerta ACUSADA no es un fantasma — es un defecto de la puerta. El
 * asiento queda explicado si alguna ventana acusada lleva un literal
 * que es prefijo de su nombre (la media concatenación que lo construía)
 * o su nombre entero dentro de una expresión irresoluble. La sentencia
 * es una sola y cae sobre la puerta (§A-ter la nombra en el corpus). */
function explainedByAccusedGate(text: string, seat: string): boolean {
  // OLA 14: memo por texto — la satisfacción compartida (A2) pregunta
  // por cientos de asientos sobre el mismo corpus; la respuesta de la
  // puerta acusada no cambia entre preguntas.
  let accused = accusedMemo.get(text);
  if (!accused) { accused = new Set(unresolvedGates(text)); accusedMemo.set(text, accused); }
  for (const m of text.matchAll(new RegExp(`(^|[^\\w$.])(${gateAlt(text)})\\(`, "g"))) {
    const win = text.slice(m.index! + m[0].length, m.index! + m[0].length + 160);
    if (multiArg(win)) continue;
    if (!accused.has(`${m[2]}(${win.slice(0, 60).replace(/\s+/g, " ")}…`)) continue;
    for (const lit of win.matchAll(/["'`]([\w.-]*)["'`]/g)) {
      if (lit[1] === seat) return true;
      if (lit[1]!.length >= 4 && seat.startsWith(lit[1]!)) return true;
    }
    /* OLA 13 (mut13-a T4): el prefijo ESTÁTICO de una plantilla se lee
     * como se lee un literal — `accounts.${sufijo}` explica a
     * accounts.add aunque el hueco no resuelva: una sola sentencia,
     * sobre la puerta. */
    for (const lit of win.matchAll(/`([\w.-]*)\$\{/g)) {
      if (lit[1]!.length >= 4 && seat.startsWith(lit[1]!)) return true;
    }
  }
  return false;
}
const consumed = (seat: string) => consumedIn(CORPUS, seat);
const accusedMemo = new Map<string, Set<string>>();

/* Las exenciones: asientos cuyo consumo es ESTRUCTURAL — la superficie
 * nace por composición (el libro, la sección, la hoja) y sus verbos
 * finos llevan sus propios asientos. Cada exención nombra el mecanismo
 * y su coordenada; la higiene de abajo exige que una exención muera el
 * día que nazca un consumidor textual, para que la tabla no pudra. */
const EXENTOS: Record<string, string> = {
  "accounts.move": "el movimiento nace en Esencial (fallo 7) y no necesita puerta positiva: la rama del editor de cuentas (screens.tsx) elige la forma por la puerta NEGATIVA de su hermana — sin accounts.opening despierto, la forma es siempre la de movimiento; accounts.opening gobierna la otra forma",
  "archive.hide-period": "los verbos del Archivo llevan sus asientos (archive.hide-selection en historial.tsx, archive.restore-span/delete-span en archivo.tsx); este declara la adjudicación del periodo apartado",
  "cards.ficha": "la ficha se gobierna campo a campo (cards.add-full gobierna la forma completa en cards.tsx; scan.card-capture, la captura): el asiento declara la adjudicación de la ficha entera en Completo",
  "cards.group": "el grupo de tarjetas pinta por composición dentro del lado Debo de Cobros (debts.tsx); su subgrupo de premios lleva cards.rewards-group",
  "cobros.timeline": "la línea de tiempo ES el libro de Cobros: su ordenación no es un widget con puerta, es la composición del libro (debts.tsx); sus lentes llevan sus asientos",
  "scan.receipt": "la hoja de escaneo nace por composición (share-inbox.tsx la monta; receipt-scan.tsx puertea sus filas con scan.receipt-full-review y scan.receipt-rewards-row); la entrada es de Esencial por el fallo 16",
  "settings.catalog-add": "el formulario de alta del CatalogEditor pinta sin puerta por adjudicación escrita en screens.tsx: añadir es Esencial; administrar lleva settings.catalog-admin",
  "subs.fixed-exists": "la existencia del libro de Cuotas se deriva en el hub (shell.tsx: la sección y su parada gate(\"books.subs\")); el asiento declara el fallo de que los cargos fijos existen y se leen en Esencial",
  "tools.converter": "el convertidor nace en Esencial y no tiene piso inferior que ocultar (instruments.tsx); sus verbos finos llevan sus asientos (tools.converter-send, tools.converter-chips-admin)",
  "tools.rate-view": "ver la tasa es de Esencial (instruments.tsx y la tasa del escritorio); refrescarla y fijarla a mano llevan tools.rate-refresh y tools.rate-manual",
  "vault.retiro-sheet": "la hoja del estado de cuenta de la serie de fábrica se revisa dentro del flujo de lectura del estado (stmt-scan.tsx, cuya entrada lleva scan.retirement-stmt); el asiento declara la adjudicación de la hoja completa en Completo",
};

describe("ola9 · §A: el censo de consumidores — ningún asiento fantasma", () => {
  it("todo asiento nombrado por el mapa §10 tiene un consumidor real o una exención escrita", () => {
    assert.ok(MAP_SEATS.size >= 95, `el censo deriva del mapa de verdad (${MAP_SEATS.size} asientos)`);
    for (const seat of MAP_SEATS) {
      // OLA 12: un asiento al final de una puerta acusada no es fantasma —
      // es defecto de la puerta, y la sentencia cae sobre ella (§A-ter).
      // OLA 14 (A2): la §A hereda TODAS las rutas de satisfacción de la
      // §A-quater — un asiento que su familia ENUMERA (familyCovers) es
      // un gobernador declarativo, no un fantasma: dos censos, una verdad.
      assert.ok(consumed(seat) || seat in EXENTOS || explainedByAccusedGate(CORPUS, seat) || familyCovers(seat),
        `${seat}: el mapa lo nombra y nadie lo consume — un asiento fantasma (así nacieron CARA-1 y CARA-2)`);
    }
  });
  it("la higiene de las exenciones: cada una nombra un asiento del mapa que hoy no tiene consumidor textual", () => {
    for (const seat of Object.keys(EXENTOS)) {
      assert.ok(MAP_SEATS.has(seat), `${seat}: la exención nombra un asiento que el mapa ya no nombra — exención podrida`);
      assert.ok(!consumed(seat), `${seat}: ya tiene un consumidor textual — la exención sobra y debe morir`);
    }
  });
  it("los dos fantasmas probados no vuelven: el mapa ya no nombra accounts.panel ni vault.retiro-fields", () => {
    assert.ok(!MAP_SEATS.has("accounts.panel"),
      "accounts.panel no gobernaba nada (el panel se ancla en accounts.panel-simple y su desglose en nature.class-saldo): sus temas se re-asientan, el fantasma no se exime");
    assert.ok(!MAP_SEATS.has("vault.retiro-fields"),
      "vault.retiro-fields no gobernaba nada (la forma de Retiro no lleva puerta): su tema se re-asienta a vault.retiro");
  });
});

/* ═══════════ §A-quater (OLA 13 · CARA-1, LA CLASE) ══════════════════
 * El censo §A enumeraba desde el MAPA §10 (99 asientos): un asiento que
 * el mapa no nombraba era INVISIBLE para él — books.multiselect vivía
 * declarado en el registro, sin consumidor, sin cruce y sin exención,
 * mientras la superficie que gobierna (la mano de administrar del kit
 * de los libros) trabajaba sin puerta en Esencial (CARA-1). Este censo
 * enumera DESDE EL REGISTRO (FEATURES, 500 asientos) y acusa POR SU
 * NOMBRE a todo asiento que ningún mecanismo conoce: ni un consumidor
 * de puerta (consumedIn), ni el mapa §10, ni una exención de la §A, ni
 * un tema que lo nombre, ni una FAMILIA DECLARADA con su mecanismo.
 * La medición que fija la doctrina (asentada en CURA-OLA13): 397
 * asientos del registro son adjudicaciones declarativas — declaran el
 * piso de superficies que nacen por composición, y el motor de modos
 * consume la TABLA ENTERA (hasFeature sirve cualquier llave, el conteo
 * de desbloqueos camina las familias, el espejo de modos294 clava la
 * tabla): exigir un has() por asiento acusaría a la tabla misma, no a
 * un fantasma. Lo que esta cerca caza es la clase de CARA-1: un
 * gobernador que NINGÚN mecanismo nombra — y books.multiselect, su
 * espécimen, queda clavado como consumido.
 * OLA 14 (Q1): la familia absolvía POR APELLIDO — cualquier asiento con
 * el prefijo de una familia declarada pasaba, aunque el mecanismo
 * escrito no lo cubriera: la caza escenificó books.erase-month y
 * alerts.phantom-alert (sin consumidor, sin mención, fuera de toda
 * enumeración) y la cerca corrió verde 48/48. La cura: la satisfacción
 * familiar es VERIFICADA POR ASIENTO — cada familia ENUMERA en `cubre`
 * los asientos que absuelve (los que ningún otro mecanismo conoce), la
 * higiene exige que cada enumerado exista, sea del prefijo y no lo
 * conozca otro mecanismo, y un asiento no enumerado exige adjudicación
 * individual escrita. El apellido ya no absuelve a nadie. */
const TOPICS_TEXT = SRC("../manual/topics.ts");
const familyCovers = (seat: string): boolean => {
  const fam = FAMILIAS_REGISTRO[seat.split(".")[0]!];
  return !!fam && fam.cubre.includes(seat);
};
const FAMILIAS_REGISTRO: Record<string, { mecanismo: string; cubre: string[] }> = {
  accounts: { mecanismo: "sus formas se eligen por la puerta negativa de la hermana (accounts.opening gobierna la forma de apertura); la familia declara el resto de sus piezas", cubre: ["accounts.panel", "accounts.seed-banks", "accounts.pin-panel"] },
  advisor: { mecanismo: "las lecturas del Asesor: cada lectura declara su piso en la tabla; las caras se componen en advisor2/screens y se gobiernan por los asientos de la superficie que las pinta", cubre: ["advisor.verdict", "advisor.verdict-sub", "advisor.step-income", "advisor.step-name", "advisor.step-keep", "advisor.step-close-gap", "advisor.step-set-aside", "advisor.step-wants-30", "advisor.step-subs", "advisor.step-cushion", "advisor.step-debts", "advisor.headline", "advisor.diagnosis", "advisor.month-tone", "advisor.time-label", "advisor.dues-note", "advisor.rate-note", "advisor.vague-name", "advisor.method-note", "advisor.lever-keep", "advisor.lever-income", "advisor.misclass-note", "advisor.not-habit-note", "advisor.trend-note", "advisor.subs-note", "advisor.remit-note", "advisor.daily-note", "advisor.three-parts", "advisor.top5", "advisor.top5-rich", "advisor.levers-month", "advisor.plan-short", "advisor.income-stability", "advisor.income-stability-floor", "advisor.credit-note", "advisor.undestined-note", "advisor.month-done", "advisor.heaviest", "advisor.cards-card", "advisor.start-route", "advisor.rate-foot", "advisor.kicker"] },
  alerts: { mecanismo: "los vencimientos: aviso nacido por composición de la cáscara; el asiento declara el piso del aviso", cubre: ["alerts.due"] },
  archive: { mecanismo: "el Archivo: sus verbos finos llevan puerta (archive.hide-selection, archive.restore-span); la familia declara los pisos de sus vistas", cubre: ["archive.rest-gate", "archive.hide-one", "archive.span-card", "archive.restore-lent", "archive.restore-loan", "archive.restore-card", "archive.restore-owe", "archive.pair"] },
  area: { mecanismo: "las áreas del Estudio: superficies nacidas por composición (area-advice), gobernadas por los asientos de la cara que las presenta", cubre: ["area.plain-phrase", "area.overdue", "area.owed-marks", "area.owed-track", "area.income-drift", "area.setaside", "area.retiro-paused", "area.remit-up", "area.meta-path", "area.emergency-months", "area.loans-path", "area.debt-free", "area.debt-stuck", "area.rules-split"] },
  awake: { mecanismo: "la foto al despertar: composición de Central; sus asientos declaran el piso de cada pieza que la compone", cubre: ["awake.savings-photo", "awake.goals-horizon", "awake.undestined", "awake.destination-projection", "awake.recalc-notices", "awake.recalc-simple", "awake.stale-plan", "awake.materiality"] },
  books: { mecanismo: "los libros: superficies por composición (BookSection y el kit); sus verbos finos llevan puerta — books.multiselect entre ellos, consumido desde la cura 13", cubre: ["books.list", "books.add-line", "books.edit-line", "books.currency", "books.cloud", "books.bubble-editor", "books.bookkit", "books.income", "books.fixed", "books.variable", "books.shop-catalog-gear"] },
  cards: { mecanismo: "la ficha se gobierna campo a campo (cards.add-full y los asientos de captura); la familia declara los pisos de las piezas de tarjeta sin puerta propia", cubre: ["cards.add", "cards.update", "cards.pay", "cards.edit-delete", "cards.factory", "cards.usage-advice", "cards.rewards-reconcile"] },
  central: { mecanismo: "Central, la pantalla de arranque: se compone entera; sus piezas declaran su piso para el conteo de desbloqueos y los temas", cubre: ["central.month-left", "central.month-used", "central.month-rate", "central.lens-have", "central.lens-spend", "central.list", "central.edit-line", "central.debt-light", "central.first-line", "central.quickadd", "central.save-band"] },
  cobros: { mecanismo: "el libro de Cobros ES su línea de tiempo: composición del libro, no un widget con puerta; sus lentes llevan sus asientos", cubre: ["cobros.quick-list", "cobros.see-all"] },
  debt: { mecanismo: "el lado Debo: sus caras se componen en debts.tsx y sus verbos finos llevan puerta propia", cubre: ["debt.total", "debt.line-balance"] },
  desk: { mecanismo: "el escritorio: su pieza declarada se compone con Central y declara su piso en la tabla", cubre: ["desk.today-spend"] },
  editor: { mecanismo: "el editor de líneas: sus manos finas llevan puerta (editor.picker-manage, editor.picker-rename, editor.icon-color); la familia declara el resto de sus piezas", cubre: ["editor.core", "editor.currency", "editor.category", "editor.note", "editor.savings-balance", "editor.nature", "editor.icon-color", "editor.save-guard", "editor.draft"] },
  hist: { mecanismo: "el Historial y el río: superficies por composición, gobernadas por los asientos de sus gestos y vistas (el Susurro entre ellos)", cubre: ["hist.river", "hist.row-origin", "hist.lens-week-month", "hist.lens-year", "hist.nav", "hist.totals", "hist.search-text", "hist.search-global", "hist.synonyms", "hist.filter-direction", "hist.filter-category", "hist.paging", "hist.search-people-cards"] },
  import: { mecanismo: "la importación nace por composición (bank-import); la familia declara los pisos de sus piezas", cubre: ["import.guides"] },
  ins: { mecanismo: "los instrumentos: composición en instruments.tsx; sus verbos finos llevan puerta", cubre: ["ins.piece", "ins.premium-line", "ins.beneficiaries", "ins.start", "ins.change-notice", "ins.not-money"] },
  lent: { mecanismo: "el lado Me deben: sus caras se componen en debts.tsx y sus verbos finos llevan puerta propia", cubre: ["lent.no-interest", "lent.history", "lent.bulk-edit"] },
  loans: { mecanismo: "los préstamos: sus caras se componen en loans.tsx y sus verbos finos (pagar, archivar) llevan puerta propia", cubre: ["loans.add", "loans.due-day", "loans.pay", "loans.pay-split", "loans.archive", "loans.bulk-edit", "loans.payoff-params", "loans.payoff-est-rate"] },
  manual: { mecanismo: "el Manual: sus temas se cruzan por la §10 y por TOPIC_SCENES; la familia declara los pisos de sus superficies", cubre: ["manual.ch1-arriba", "manual.topic-export", "manual.topic-float", "manual.ch2-central", "manual.ch3-cobros", "manual.topic-card-fine", "manual.ch4-libros", "manual.ch5-ahorros", "manual.topic-retiro", "manual.ch6-folios", "manual.topic-apartar", "manual.ch7-estudio", "manual.ch8-asesor", "manual.ch9-cambio", "manual.ch10-ajustes", "manual.ch11-importar", "manual.ch12-editor", "manual.ch13-cuenta"] },
  mode: { mecanismo: "el propio sistema de modos: el diálogo y el Susurro se gobiernan en mode.ts y screens; la familia declara sus piezas", cubre: ["mode.impact-screen", "mode.gate", "mode.mute-row"] },
  nature: { mecanismo: "la naturaleza de las líneas: clasificación por composición (la casa de nature); sus declaraciones y guardas llevan asiento fino donde se cruzan", cubre: ["nature.class-cuenta", "nature.class-undeclared", "nature.ask", "nature.declare-series", "nature.free-guard", "nature.band-migration", "nature.cushion", "nature.overcommit"] },
  nav: { mecanismo: "la cáscara (shell.tsx): navegación nacida por composición; sus verbos finos llevan puerta y la familia declara los pisos de cada pieza", cubre: ["nav.dock", "nav.books-hub", "nav.books-subs-entry", "nav.vault-bar", "nav.scale-topbar", "nav.float-window", "nav.undo", "nav.sync-light", "nav.view-currency-bar", "nav.day-night", "nav.swipe", "nav.ring", "nav.toolsheet"] },
  pano: { mecanismo: "el Panorama: tarjetas por composición sobre monthTotals; la familia declara los pisos de sus piezas", cubre: ["pano.closes", "pano.health-help", "pano.pillar-spend", "pano.pillar-save", "pano.pillar-debt", "pano.pillar-cushion", "pano.pillar-stability"] },
  patron: { mecanismo: "el Patrón: el motor lee sus propias reglas; la familia declara los pisos de sus avisos", cubre: ["patron.learning", "patron.sayings", "patron.linear-pace", "patron.history-rules", "patron.month-rules", "patron.model-rules"] },
  people: { mecanismo: "Personas: la superficie se compone en people.tsx; sus verbos finos llevan puerta", cubre: ["people.add-contacts", "people.add-manual", "people.dates", "people.gift", "people.import-vcf", "people.share-in", "people.totals", "people.delete"] },
  pres: { mecanismo: "la Presentación: el guion y el teatro se componen desde guion.ts y presentacion.tsx; la familia declara los pisos de sus piezas", cubre: ["pres.driver", "pres.m1-mapa", "pres.m2-manual", "pres.m3-anotar", "pres.m3-balance-chapter", "pres.m4-cambio", "pres.m5-mes", "pres.m6-ahorros", "pres.m7-estadisticas", "pres.m8-asesor", "pres.m9-folios-river", "pres.m9-folios-rest", "pres.m10-estructura", "pres.m11-puertas", "pres.m12-pregunta", "pres.m13-totales", "pres.m14-colchon", "pres.my-scenes"] },
  // OLA 16 (Cara G3, en vivo): remit.manage SALE de la familia — su
  // consumidor nació (RemitToPick entrega su manage bajo
  // has("remit.manage"), remit-people.tsx): la higiene de esta tabla
  // manda que la enumeración muera el día que el asiento gana su
  // puerta, y ese día es hoy. La familia sigue cubriendo remit.send.
  remit: { mecanismo: "Remesas: composición sobre remesas.ts; sus verbos finos llevan puerta", cubre: ["remit.send"] },
  rule: { mecanismo: "las reglas del Asesor: el motor las evalúa enteras (rules.ts); la familia declara el piso de cada aviso", cubre: ["rule.due", "rule.category", "rule.outlier", "rule.recurring", "rule.pace", "rule.goal", "rule.cushion", "rule.floor", "rule.overcommit", "rule.insurance"] },
  sample: { mecanismo: "la casa de muestra nace por composición (sample.ts); sus asientos declaran sus pisos", cubre: ["sample.door", "sample.house-filtered"] },
  scan: { mecanismo: "las hojas de escaneo nacen por composición; sus filas llevan asientos finos (scan.card-capture y hermanas)", cubre: ["scan.receipt-review"] },
  settings: { mecanismo: "Ajustes: la pantalla se compone por territorios; sus interruptores finos llevan puerta o viven en todo piso por adjudicación escrita", cubre: ["settings.mode-selector", "settings.manual-row", "settings.presentations-row", "settings.notify", "settings.install-app", "settings.backup-auto", "settings.backup-quarantine", "settings.backup-download", "settings.backup-restore", "settings.backup-folder", "settings.backup-conflict", "settings.account", "settings.version", "settings.battery-row", "settings.hide-amounts", "settings.view-currency", "settings.bank-rewards-real", "settings.widget-pins", "settings.pin-in-card", "settings.sample-row"] },
  study: { mecanismo: "el Estudio: composición sobre studyBoard; sus caras declaran su piso y las finas llevan asiento propio donde se cruzan", cubre: ["study.empty-rule", "study.columns"] },
  subs: { mecanismo: "Cuotas: el libro existe por composición del hub (su parada gatea books.subs); la familia declara los pisos de sus cadencias y piezas", cubre: ["subs.cadence-machinery", "subs.own-chips", "subs.brand-detect", "subs.cadences-base", "subs.dues-window"] },
  tools: { mecanismo: "las herramientas: composición en instruments.tsx; sus verbos finos llevan puerta (tools.rate-refresh y hermanas)", cubre: ["tools.rate-refresh", "tools.rate-manual", "tools.converter-use", "tools.calculator-use", "tools.slips-reuse", "tools.slip-to-category", "tools.slips-bulk"] },
  vault: { mecanismo: "la bóveda: composición de sus tarjetas; sus verbos finos llevan asiento donde se cruzan (vault.retiro entre ellos)", cubre: ["vault.free", "vault.savings-goal-pct", "vault.order-pockets", "vault.pin-block", "vault.add-line", "vault.delete", "vault.factory-restore", "vault.meta-plan", "vault.retiro-fields"] },
  widget: { mecanismo: "el widget: su foto se compone en widget.ts sobre monthTotals; la familia declara los pisos de sus piezas", cubre: ["widget.feed", "widget.quick-note", "widget.note-with-home", "widget.habit-homes", "widget.home-suggestion", "widget.hide-amounts", "widget.face-pagos", "widget.face-dues", "widget.face-savings", "widget.face-scale", "widget.face-pins", "widget.face-top5-compare", "widget.face-flow"] },
};
describe("ola9 · §A-quater: el censo desde el REGISTRO — ningún gobernador sin mecanismo (OLA 13)", () => {
  const topicsText = TOPICS_TEXT;
  const prefixOf = (seat: string) => seat.split(".")[0]!;
  /* OLA 14 (A2): UNA satisfacción para los dos censos — consumidor,
   * exención, puerta acusada que lo explica, familia que lo ENUMERA o
   * tema que lo nombra (y el mapa §10, que es la ruta propia de esta
   * sección). «Fantasma» queda solo para el asiento que ninguna ruta
   * satisface: la §A y la §A-quater ya no cuentan dos verdades. */
  const satisfied = (seat: string): boolean =>
    MAP_SEATS.has(seat) || seat in EXENTOS || topicsText.includes(`"${seat}"`) || familyCovers(seat) || explainedByAccusedGate(CORPUS, seat) || consumed(seat);
  it("todo asiento del registro lo conoce algún mecanismo: consumidor, mapa, exención, tema o familia declarada", () => {
    const seats = Object.keys(FEATURES);
    assert.ok(seats.length >= 490, `el censo enumera desde el registro de verdad (${seats.length} asientos)`);
    for (const seat of seats) {
      assert.ok(satisfied(seat),
        `${seat}: asiento del REGISTRO sin ningún mecanismo — ni consumidor, ni mapa §10, ni exención, ni tema, ni familia que lo enumere: un gobernador invisible (así nació CARA-1)`);
    }
  });
  it("el espécimen de la clase queda clavado: books.multiselect tiene consumidor desde la cura 13", () => {
    assert.ok(consumed("books.multiselect"), "el kit de los libros consulta has(\"books.multiselect\"): el asiento invisible de la ola 13 ya no lo es");
  });
  it("espécimen: un asiento de una familia que no existe ACUSA por su nombre", () => {
    assert.equal(satisfied("fantasma13.multiselect"), false,
      "ni consumidor, ni mapa, ni familia: la cerca lo nombra y lo acusa — la clase de CARA-1 no vuelve en silencio");
  });
  it("espécimen Q1 (ola 14): la familia absuelve solo lo que ENUMERA — el apellido no absuelve", () => {
    assert.equal(satisfied("books.erase-month"), false,
      "books es familia declarada, pero erase-month no está enumerado ni lo nombra mecanismo alguno: con la regla del apellido corría verde; a doctrina acusa");
    assert.equal(satisfied("alerts.phantom-alert"), false,
      "alerts.due está enumerado; alerts.phantom-alert no existe en mecanismo alguno y acusa");
    assert.equal(satisfied("alerts.due"), true, "el enumerado sí se satisface por su familia");
  });
  it("espécimen A2 (ola 14): books.list vive SOLO de su enumeración — y ningún censo lo llama fantasma", () => {
    assert.ok(!consumed("books.list") && !MAP_SEATS.has("books.list") && !("books.list" in EXENTOS) && !topicsText.includes("\"books.list\""),
      "ninguna otra ruta conoce a books.list: si la enumeración familiar no contara en ambos censos, un censo lo condenaría y el otro lo absolvería en la misma corrida");
    assert.ok(familyCovers("books.list") && satisfied("books.list"),
      "la enumeración de su familia es su mecanismo, en la §A como en la §A-quater");
  });
  /* OLA 15 (Cara Q1-menor) · LA ADJUDICACIÓN: el mecanismo escrito de
   * una familia nunca se contrastaba — sustituido por una mentira
   * llana, la corrida seguía verde, porque de la prosa solo se
   * verifica su longitud. No hay cura mecánica general para la prosa,
   * y la caza misma lo dice: la práctica de la casa es clavar las
   * afirmaciones que CARGAN PESO como especímenes contra el código.
   * Esta es la afirmación viva que cargaba peso sin clavija: la
   * exención de «subs.fixed-exists» y el mecanismo de la familia subs
   * descansan sobre que la parada de Cuotas del hub gatea
   * «books.subs» en shell.tsx — si esa línea se mueve o se borra, dos
   * textos del libro mienten a la vez. Aquí queda clavada. */
  it("Q1-menor (ola 15): la afirmación que carga peso de la familia subs está clavada contra el código", () => {
    assert.match(CORPUS, /stop\.id === "subs"\) return gate\("books\.subs"\)/,
      "la parada de Cuotas gatea books.subs en el despacho de paradas del hub (shell.tsx): la exención de subs.fixed-exists y el mecanismo de la familia subs dicen exactamente eso — si el código cambia, los dos textos se reescriben con él");
    assert.ok(consumed("books.subs"), "y el asiento tiene consumidor real: la puerta del hub lo consulta");
  });
  it("la higiene de las familias: cada asiento enumerado existe, es del prefijo y ningún otro mecanismo lo conoce", () => {
    const seats = Object.keys(FEATURES);
    for (const [prefix, fam] of Object.entries(FAMILIAS_REGISTRO)) {
      assert.ok(fam.mecanismo.length > 10, `${prefix}: la familia lleva su mecanismo escrito`);
      const mine = seats.filter((s) => prefixOf(s) === prefix);
      assert.ok(mine.length > 0, `${prefix}: familia sin asientos en el registro — declaración podrida`);
      assert.ok(fam.cubre.length > 0, `${prefix}: la familia no enumera ningún asiento — una familia que no absuelve a nadie sobra y debe morir`);
      for (const seat of fam.cubre) {
        assert.ok(seats.includes(seat), `${seat}: ${prefix} lo enumera y el registro ya no lo nombra — enumeración podrida`);
        assert.equal(prefixOf(seat), prefix, `${seat}: enumerado por ${prefix} sin ser de su prefijo`);
        assert.ok(!(MAP_SEATS.has(seat) || seat in EXENTOS || topicsText.includes(`"${seat}"`) || consumed(seat) || explainedByAccusedGate(CORPUS, seat)),
          `${seat}: otro mecanismo ya lo conoce — la enumeración sobra en este asiento y debe morir (el día que nazca su consumidor, su mapa o su tema, sale de la lista)`);
      }
    }
  });
});

/* ═══════════ §A-quinquies (OLA 14 · CARA-Q2): EL CENSO DE SUPERFICIES ═
 * Todos los censos de la casa partían del registro o del mapa: ninguno
 * caminaba las SUPERFICIES. La caza escenificó en el kit de los libros
 * una mano de borrado total — `onDrop(rows.map(r => r.id))`, el canal
 * genuino del kit — nacida sin asiento, sin has(), activa en los tres
 * modos, y la suite entera corrió verde 2019/2019: la forma pura de la
 * enfermedad de CARA-1 (allí el asiento existía sin consumidor; aquí ni
 * el asiento existe). La cura es el espejo del censo de formas de
 * guardado de la §B de la ola 12: el censo camina los componentes y
 * enumera toda MANO EN MASA — una invocación de un canal de
 * borrado/archivo/ocultado alimentada por una lista de ids mapeada, por
 * una variable atada a esa lista, o el canal mismo (onDropMany,
 * …Selection, drop) con el argumento que lleve — y cada sitio nombra
 * su asiento gobernante en la tabla, con su razón. Un sitio sin
 * clasificar es sentencia; una clasificación sin sitio, pudrición. */
const MASS_VERBS = /drop|delete|remove|archive|wipe|erase|bulk/i;
const MASS_CHANNEL = /^(onDrop|onDropMany|dropMany|deleteMany|removeMany|archiveMany|drop|wipe)$|Many$|Selection$/;
/** ¿El callback produce ids? Las grafías de la casa: `.id` sobre el
 * elemento, o el elemento DESCOMPUESO en el parámetro —
 * `({id}) => id` — donde el id nace de la desestructuración y el
 * cuerpo lo devuelve desnudo (la grafía que la ola 16 cazó escapando:
 * su texto no lleva «.id» en el cuerpo, solo en el parámetro). */
function cbMapsIds(cb: ts.Node | undefined): boolean {
  if (!cb || !(ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) return false;
  for (const p of cb.parameters) {
    if (ts.isObjectBindingPattern(p.name) && p.name.elements.some((el) => (el.propertyName && !ts.isComputedPropertyName(el.propertyName) ? el.propertyName.text : ts.isIdentifier(el.name) ? el.name.text : "") === "id")) return true;
  }
  return /\.id\b/.test(cb.getText());
}
/** ¿El subárbol contiene una producción de ids? Las grafías: map,
 * flatMap y reduce con callback productor, Array.from con mapeador, la
 * llamada a un mapeador conocido, el esparcido de una variable-lista
 * conocida y la cadena sobre un valor productor (la expresión unida). */
function nodeMapsIds(root: ts.Node, mappers: Set<string>, vars: Set<string>, isRoot = true): boolean {
  if (isRoot && ts.isIdentifier(root)) return vars.has(root.text);
  let found = false;
  const walk = (n: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(n)) {
      const cal = n.expression;
      if (ts.isPropertyAccessExpression(cal)) {
        const nm = cal.name.text;
        if ((nm === "map" || nm === "flatMap" || nm === "reduce") && cbMapsIds(n.arguments[0])) { found = true; return; }
        if (nm === "from" && ts.isIdentifier(cal.expression) && cal.expression.text === "Array" && (cbMapsIds(n.arguments[1]) || nodeMapsIds(n.arguments[0]!, mappers, vars, false))) { found = true; return; }
      }
      if (ts.isIdentifier(cal) && mappers.has(cal.text)) { found = true; return; }
    }
    if (ts.isSpreadElement(n) && ts.isIdentifier(n.expression) && vars.has(n.expression.text)) { found = true; return; }
    ts.forEachChild(n, walk);
  };
  walk(root);
  return found;
}
/** Los cuerpos (por nombre) de un archivo que mapean ids: la materia
 * con la que la prueba de alimentación sigue el VALOR (S1, abajo).
 * OLA 16 (Cara V): el índice aprende las grafías (map/flatMap/reduce/
 * Array.from, la desestructuración) y el SEGUNDO SALTO — un cuerpo que
 * llama a un mapeador conocido también mapea, por punto fijo con los
 * mapeadores externos que el llamante ya conoce. */
function idMapperBodies(text: string, external: Set<string> = new Set()): Map<string, string> {
  const sf = ts.createSourceFile("indice.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bodies = new Map<string, ts.Node>();
  const walk = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.body) bodies.set(n.name.text, n.body);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) bodies.set(n.name.text, n.initializer);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  const names = new Set<string>(external);
  for (let pass = 0; pass < 6; pass++) {
    let grew = false;
    for (const [nm, body] of bodies) {
      if (names.has(nm)) continue;
      if (nodeMapsIds(body, names, new Set(), false)) { names.add(nm); grew = true; }
    }
    if (!grew) break;
  }
  const out = new Map<string, string>();
  for (const nm of names) { const b = bodies.get(nm); if (b) out.set(nm, b.getText()); }
  return out;
}
function massHandNodes(file: string, text: string, idMappers: Map<string, string> = new Map()): Map<string, ts.CallExpression> {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  /* OLA 15 (Cara S1) · LA MANO PARTIDA: la prueba de alimentación
   * sigue el VALOR, no la expresión. La caza partió una mano en masa
   * entre dos componentes — `preparaIds` (devuelve `rows.map(r => r.id)`)
   * en un archivo, `aplicaWipe(preparaIds(rows))` en otro — y el censo
   * vio CERO sitios (57/57 verde), porque la lista se recogía por
   * archivo y el argumento debía llevar el mapa en su propio texto. Un
   * argumento que es la llamada a un ayudante (local o importado) cuyo
   * cuerpo mapea ids ALIMENTA la mano, igual que el censo de
   * formularios aprendió a seguir la delegación; y una variable atada
   * a esa llamada es una variable de lista como cualquier otra. */
  const localMappers = idMapperBodies(text);
  const mapperNames = new Set<string>([...localMappers.keys(), ...idMappers.keys()]);
  /* OLA 16 (Cara V): las variables-lista se recogen por punto fijo con
   * el seguidor entero — una variable atada a una expresión productora
   * (cualquier grafía), a la llamada de un mapeador o a OTRA
   * variable-lista es una variable-lista (el segundo salto: A mapea,
   * B reenvía, la mano se alimenta de B). */
  const idListVars = new Set<string>();
  for (let pass = 0; pass < 6; pass++) {
    let grew = false;
    const collect = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && !idListVars.has(n.name.text) && nodeMapsIds(n.initializer, mapperNames, idListVars)) { idListVars.add(n.name.text); grew = true; }
      ts.forEachChild(n, collect);
    };
    collect(sf);
    if (!grew) break;
  }
  const sites = new Map<string, ts.CallExpression>();
  const ordinals = new Map<string, number>();
  const walk = (n: ts.Node, fn: string) => {
    let cur = fn;
    if (ts.isFunctionDeclaration(n) && n.name) cur = n.name.text;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) cur = n.name.text;
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (name && name !== "removeEventListener" && (MASS_VERBS.test(name) || MASS_CHANNEL.test(name))) {
        for (const arg of n.arguments) {
          const fed = nodeMapsIds(arg, mapperNames, idListVars) || MASS_CHANNEL.test(name);
          if (fed) {
            const k = `${file}:${cur}`;
            const ord = (ordinals.get(k) ?? 0) + 1;
            ordinals.set(k, ord);
            sites.set(`${k}#${ord}`, n);
            break;
          }
        }
      }
    }
    ts.forEachChild(n, (c) => walk(c, cur));
  };
  walk(sf, "(raíz)");
  return sites;
}
function massHandSites(file: string, text: string, idMappers: Map<string, string> = new Map()): string[] {
  return [...massHandNodes(file, text, idMappers).keys()];
}
const MANOS_EN_MASA: Record<string, [string, string]> = {
  "components/faro/archivo.tsx:askDeleteLines#1": ["archive.delete-lines", "el run de la confirmación de borrado de líneas apartadas: solo se alcanza bajo has(\"archive.delete-lines\") (canDeleteLines, archivo.tsx), que gobierna la entrada de la selección de borrado"],
  "components/faro/fit-pick.tsx:dropSelected#1": ["editor.picker-manage", "EL CANAL: la hoja dispara solo el onDropMany que una composición gobernada le entregó — editor.picker-manage en los editores (fit-pick), books.multiselect en el kit de libros; la composición que no gobierna (picker-rename) no lleva onDropMany"],
  "components/faro/historial.tsx:rowTap#1": ["archive.hide-selection", "el apartado de UNA fila desde su toque: la mano de apartar del Historial vive bajo has(\"archive.hide-selection\") (canRest, historial.tsx) en sus dos formas, la de una y la de la selección"],
  "components/faro/historial.tsx:askHideSel#1": ["archive.hide-selection", "el apartado de la selección entera: la misma puerta (canRest) gobierna la entrada al modo selección que alimenta la lista"],
  "components/faro/remit-people.tsx:RemitToPick#1": ["remit.manage", "el canal: RemitToPick entrega su manage SOLO bajo has(\"remit.manage\") en el propio archivo (la cura de la ola 16 — antes la entrega no llevaba puerta y la cita era prosa); la hoja dispara solo el onDropMany que esa entrega gobernada le pasó"],
};
/* OLA 15 (Cara S3) · CITAR NO BASTA: la clasificación se verifica
 * contra el sitio. La caza clasificó la mano de borrado total del kit
 * citando «books.list» — asiento de Esencial, declarativo, que ningún
 * código consulta con has() en parte alguna — y la corrida entera fue
 * verde: la cerca comprobaba que la cita EXISTE y que su razón pasa de
 * diez caracteres, jamás que el asiento citado GOBIERNE. La
 * verificación tiene dos mitades, y cada una absuelve a un gobierno
 * vivo que la otra condenaría:
 *   (a) EL PISO: el asiento citado vive en Ritmo o arriba — el piso
 *       doctrinal de una mano en masa (administrar es de Ritmo). Un
 *       asiento así es una puerta de administración de verdad en el
 *       registro, y su gobierno — por consulta o por el flujo que lo
 *       monta — lo vigilan los censos del §A.
 *   (b) LA CONSULTA: un asiento de Esencial solo gobierna el sitio si
 *       el propio archivo del sitio lo consulta con has() — así
 *       gobierna «archive.delete-lines» (Esencial en el registro,
 *       consultado en archivo.tsx, que es quien abre la selección):
 *       el registro manda sobre su piso, y la cerca no lo desdice
 *       cuando la consulta es real.
 * «books.list» no cumple ninguna: Esencial, sin consulta en el archivo
 * que lo cita ni en parte alguna. Y donde el asiento tiene forma de
 * consumidor (algún has() lo consume en el corpus), la mitad (b) es la
 * que manda cuando el piso no alcanza: la satisfacción por asiento
 * del §A-quater, aplicada al gobierno por sitio. */
const MODO_RANGO: Record<string, number> = { esencial: 0, ritmo: 1, completo: 2 };
/* OLA 16 (Cara G1/G2/G3): CITAR NO BASTA — y gobernar se VERIFICA.
 * La verificación de la ola 15 tenía dos mitades que la caza desnudó:
 * el piso absolvía SOLO (un asiento de Ritmo citado por una mano que
 * jamás lo consulta — ni en su archivo, ni por importación, ni por el
 * componente que monta — pasaba entero: G3), y la consulta contaba
 * sitios en el TEXTO del archivo (una consulta muerta — tras un
 * return, en una función jamás llamada, en un componente hermano —
 * absolvía igual: G1), mientras el gobierno verdadero entre archivos
 * (la puerta en un hook importado) acusaba en esta cerca y contaba
 * como consumo en la §A: los dos censos se contradecían (G2). Ahora
 * la cita gobierna solo por un MECANISMO verificable:
 *   M1 · LA CONSULTA EN EL CAMINO — un has(asiento) VIVO en el propio
 *        archivo: no tras un return en su bloque, y en el camino del
 *        código de la mano — dentro de la misma función envolvente
 *        (el componente que compone la mano), o inicializando una
 *        atadura que esa función usa, o dentro de una función local
 *        alcanzable desde ella.
 *   M2 · EL GOBIERNO IMPORTADO — la función de la mano llama a un
 *        hook/ayudante importado cuyo cuerpo consulta el asiento en
 *        su camino (useCanDeleteLines gobierna la mano que lo
 *        importa): el gobierno entre archivos cuenta, y esta cerca y
 *        la §A por fin concuerdan.
 *   M3 · EL COMPONENTE MONTADO (composiciones) — el elemento que la
 *        composición monta consulta el asiento en su propio cuerpo
 *        (BookKit y su canManage): el kit ES la puerta de la entrega.
 *   M4 · EL CANAL (manos) — la mano dispara un canal que le llega por
 *        un prop (el manage de la hoja): gobierna si alguna
 *        composición censada de ese componente entrega el canal bajo
 *        este mismo asiento por M1/M2/M3 — las entregas las juzga la
 *        §A-sexies, y el canal hereda su gobierno, no una prosa.
 * Sin mecanismo no hay gobierno: ni el piso solo, ni la mención, ni
 * la razón escrita absuelven. */
const isFnOla9 = (n: ts.Node): boolean => ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n);
const fnNameOfNode = (n: ts.Node): string | null => {
  if (ts.isFunctionDeclaration(n) && n.name) return n.name.text;
  const p = n.parent;
  if (p && ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return null;
};
const fnChainOf = (node: ts.Node): ts.Node[] => {
  const chain: ts.Node[] = [];
  let cur: ts.Node | undefined = node.parent;
  while (cur && !ts.isSourceFile(cur)) { if (isFnOla9(cur)) chain.push(cur); cur = cur.parent; }
  return chain;
};
const outermostFn = (node: ts.Node): ts.Node | null => { const c = fnChainOf(node); return c.length ? c[c.length - 1]! : null; };
const deadPosition = (node: ts.Node): boolean => {
  let child: ts.Node = node;
  let cur: ts.Node | undefined = node.parent;
  while (cur && !ts.isSourceFile(cur)) {
    if (ts.isBlock(cur)) {
      const idx = cur.statements.indexOf(child as ts.Statement);
      if (idx > 0 && cur.statements.slice(0, idx).some((s) => ts.isReturnStatement(s) || ts.isThrowStatement(s))) return true;
    }
    if (isFnOla9(cur)) break;
    child = cur;
    cur = cur.parent;
  }
  return false;
};
const gateCallSites = (sf: ts.SourceFile, seat: string): ts.CallExpression[] => {
  const gateNames = new Set<string>(["has"]);
  const seatConsts = new Set<string>();
  const visit0 = (n: ts.Node) => {
    if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
      for (const el of n.importClause.namedBindings.elements) if ((el.propertyName?.text ?? el.name.text) === "has") gateNames.add(el.name.text);
    }
    if (ts.isVariableDeclaration(n)) {
      if (ts.isIdentifier(n.name) && n.initializer && ts.isStringLiteral(n.initializer) && n.initializer.text === seat) seatConsts.add(n.name.text);
      if (ts.isObjectBindingPattern(n.name)) for (const el of n.name.elements) {
        const orig = el.propertyName && !ts.isComputedPropertyName(el.propertyName) ? el.propertyName.text : (ts.isIdentifier(el.name) ? el.name.text : "");
        if (orig === "has" && ts.isIdentifier(el.name)) gateNames.add(el.name.text);
      }
    }
    ts.forEachChild(n, visit0);
  };
  visit0(sf);
  const out: ts.CallExpression[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && gateNames.has(n.expression.text) && n.arguments.length) {
      const a = n.arguments[0]!;
      if (((ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && a.text === seat) || (ts.isIdentifier(a) && seatConsts.has(a.text))) out.push(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
};
const calledNamesOf = (root: ts.Node): Set<string> => {
  const out = new Set<string>();
  const w = (n: ts.Node) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) out.add(n.expression.text); ts.forEachChild(n, w); };
  w(root);
  return out;
};
const localFnMap = (sf: ts.SourceFile): Map<string, ts.Node> => {
  const out = new Map<string, ts.Node>();
  const w = (n: ts.Node) => {
    if (isFnOla9(n)) { const nm = fnNameOfNode(n); if (nm && !out.has(nm)) out.set(nm, n); }
    ts.forEachChild(n, w);
  };
  w(sf);
  return out;
};
const reachableFrom = (root: ts.Node, sf: ts.SourceFile): Set<string> => {
  const fns = localFnMap(sf);
  const out = new Set<string>();
  let frontier = [...calledNamesOf(root)];
  while (frontier.length) {
    const nm = frontier.pop()!;
    if (out.has(nm)) continue;
    out.add(nm);
    const b = fns.get(nm);
    if (b) frontier.push(...calledNamesOf(b));
  }
  return out;
};
/** M1: la consulta viva en el camino del código de handFn. */
const onPathInFile = (sf: ts.SourceFile, seat: string, handFn: ts.Node | null): boolean => {
  if (!handFn) return false;
  const calls = gateCallSites(sf, seat).filter((c) => !deadPosition(c));
  if (!calls.length) return false;
  const reachable = reachableFrom(handFn, sf);
  for (const c of calls) {
    const chain = fnChainOf(c);
    if (chain.includes(handFn)) return true; // la consulta vive en la función que compone la mano (o en un cierre dentro de ella)
    let decl: ts.Node | undefined = c;
    while (decl && !ts.isVariableDeclaration(decl)) decl = decl.parent;
    if (decl && ts.isIdentifier((decl as ts.VariableDeclaration).name)) {
      const nm = ((decl as ts.VariableDeclaration).name as ts.Identifier).text;
      let used = false;
      const w = (n: ts.Node) => { if (ts.isIdentifier(n) && n.text === nm && n !== (decl as ts.VariableDeclaration).name) used = true; ts.forEachChild(n, w); };
      w(handFn);
      if (used) return true; // la atadura que la consulta inicializa gobierna la cara de la mano
    }
    const enc = chain[0];
    if (enc) { const nm = fnNameOfNode(enc); if (nm && reachable.has(nm)) return true; } // una función alcanzable desde la mano consulta
  }
  return false;
};
const resolveSpecOla9 = (fromRel: string, spec: string, files: Map<string, string>): string | null => {
  let parts: string[];
  const dir = fromRel.split("/").slice(0, -1);
  if (spec.startsWith("@/")) parts = ["src", ...spec.slice(2).split("/")];
  else if (spec.startsWith(".")) {
    parts = [...dir];
    for (const seg of spec.split("/")) { if (seg === "..") parts.pop(); else if (seg !== ".") parts.push(seg); }
  } else return null;
  const base = parts.join("/");
  for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`, base]) if (files.has(cand)) return cand;
  return null;
};
const findFnIn = (sf: ts.SourceFile, name: string): ts.Node | null => localFnMap(sf).get(name) ?? null;
/** M2: un hook/ayudante importado, llamado desde la función de la mano, consulta el asiento en su camino. */
const governsViaImport = (siteRel: string, sf: ts.SourceFile, seat: string, handFn: ts.Node | null, files: Map<string, string>): boolean => {
  if (!handFn) return false;
  const called = calledNamesOf(handFn);
  let yes = false;
  const visit = (n: ts.Node) => {
    if (yes) return;
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
      const target = resolveSpecOla9(siteRel, n.moduleSpecifier.text, files);
      if (target && files.has(target)) {
        const tsf = ts.createSourceFile(target, files.get(target)!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        for (const el of n.importClause.namedBindings.elements) {
          if (!called.has(el.name.text)) continue;
          const orig = el.propertyName?.text ?? el.name.text;
          const fnNode = findFnIn(tsf, orig);
          if (fnNode && onPathInFile(tsf, seat, fnNode)) { yes = true; return; }
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return yes;
};
/** M3: el componente que la composición monta consulta el asiento en su cuerpo. */
const governsViaMount = (siteRel: string, sf: ts.SourceFile, seat: string, compNode: ts.Node, files: Map<string, string>): boolean => {
  let tag: string | null = null;
  if (ts.isJsxAttribute(compNode) || ts.isJsxSpreadAttribute(compNode)) {
    const elNode = compNode.parent?.parent as ts.Node | undefined;
    if (elNode && (ts.isJsxOpeningElement(elNode) || ts.isJsxSelfClosingElement(elNode))) tag = elNode.tagName.getText();
  } else if (ts.isCallExpression(compNode) && compNode.arguments.length && ts.isIdentifier(compNode.arguments[0]!)) {
    tag = (compNode.arguments[0] as ts.Identifier).text;
  }
  if (!tag) return false;
  const local = findFnIn(sf, tag);
  if (local && onPathInFile(sf, seat, local)) return true;
  // el componente importado: su cuerpo, en su archivo
  let yes = false;
  const visit = (n: ts.Node) => {
    if (yes) return;
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
      for (const el of n.importClause.namedBindings.elements) {
        if (el.name.text !== tag) continue;
        const target = resolveSpecOla9(siteRel, n.moduleSpecifier.text, files);
        if (!target || !files.has(target)) continue;
        const tsf = ts.createSourceFile(target, files.get(target)!, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const fnNode = findFnIn(tsf, el.propertyName?.text ?? el.name.text);
        if (fnNode && onPathInFile(tsf, seat, fnNode)) { yes = true; return; }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return yes;
};
/** Reubica un nodo de un parseo en otro parseo del mismo texto, por
 * posición y clase — los censos parsean su propio árbol y la
 * identidad de nodos no cruza parseos. */
const relocateIn = (root: ts.Node, target: ts.Node): ts.Node | null => {
  let found: ts.Node | null = null;
  const w = (n: ts.Node) => {
    if (found) return;
    if (n.kind === target.kind && n.getStart() === target.getStart() && n.end === target.end) { found = n; return; }
    ts.forEachChild(n, w);
  };
  w(root);
  return found;
};
function citaGobierna(site: string, seat: string, files: Map<string, string>, kind: "hand" | "composition", idMappers: Map<string, string> = new Map(), viaChannel = true): string | null {
  const piso = (FEATURES as Record<string, string>)[seat];
  const rel = site.split(":")[0]!;
  const text = files.get(rel);
  if (text === undefined) return `${site}: su asiento citado «${seat}» no se puede verificar — el archivo del sitio no está en el universo caminado (G16)`;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handNode: ts.Node | undefined;
  if (kind === "hand") handNode = massHandNodes(rel, text, idMappers).get(site);
  else handNode = compositionNodes(rel, text).get(site);
  if (!handNode) return `${site}: el sitio no se encuentra en su archivo — la cita no se puede verificar (G16)`;
  /* Los censos parsean su propio árbol: el nodo de la mano se reubica
   * en ESTE parseo por posición y clase, para que las cadenas de
   * funciones comparen nodos del mismo árbol. */
  const ownNode = relocateIn(sf, handNode) ?? handNode;
  const handFn = outermostFn(ownNode);
  if (onPathInFile(sf, seat, handFn)) return null; // M1
  if (governsViaImport(rel, sf, seat, handFn, files)) return null; // M2
  if (kind === "composition" && governsViaMount(rel, sf, seat, ownNode, files)) return null; // M3
  if (kind === "hand" && viaChannel && piso && (MODO_RANGO[piso] ?? 0) >= MODO_RANGO["ritmo"]!) {
    // M4 · el canal: la mano dispara un canal que le llega por un prop;
    // las composiciones que montan su componente y entregan ese canal
    // bajo este asiento (por M1/M2/M3) son su gobierno verificable. El
    // canal puede llegar desnudo (manage.onDropMany) o por una atadura
    // local de un salto (const dropMany = manage.onDropMany, la forma
    // viva de la hoja desde 1.3.315): la raíz se sigue igual.
    const callee = (handNode as ts.CallExpression).expression;
    const rootOf = (e: ts.Node): string | null => {
      let r: ts.Node = e;
      while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r)) r = r.expression;
      return ts.isIdentifier(r) ? r.text : null;
    };
    let rootId: string | null = null;
    if (ts.isPropertyAccessExpression(callee)) rootId = rootOf(callee);
    else if (ts.isIdentifier(callee) && handFn) {
      const find = (n: ts.Node) => {
        if (rootId) return;
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === (callee as ts.Identifier).text && n.initializer) rootId = rootOf(n.initializer);
        ts.forEachChild(n, find);
      };
      find(handFn);
    }
    if (rootId && handFn) {
      const root = { text: rootId };
      {
        const compName = fnNameOfNode(handFn);
        const params = (handFn as ts.FunctionLikeDeclarationBase).parameters ?? [];
        const isProp = params.some((p) => p.name.getText() === root.text || (ts.isObjectBindingPattern(p.name) && p.name.elements.some((el) => (ts.isIdentifier(el.name) ? el.name.text : "") === root.text)));
        if (compName && isProp) {
          for (const [otherRel, otherText] of files) {
            for (const [osite, onode] of compositionNodes(otherRel, otherText)) {
              let otag: string | null = null;
              if (ts.isJsxAttribute(onode) || ts.isJsxSpreadAttribute(onode)) {
                const elNode = onode.parent?.parent as ts.Node | undefined;
                if (elNode && (ts.isJsxOpeningElement(elNode) || ts.isJsxSelfClosingElement(elNode))) otag = elNode.tagName.getText();
              } else if (ts.isCallExpression(onode) && onode.arguments.length && ts.isIdentifier(onode.arguments[0]!)) otag = (onode.arguments[0] as ts.Identifier).text;
              if (otag !== compName) continue;
              const osf = ts.createSourceFile(otherRel, otherText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
              const oOwn = relocateIn(osf, onode) ?? onode;
              const oFn = outermostFn(oOwn);
              if (onPathInFile(osf, seat, oFn) || governsViaImport(otherRel, osf, seat, oFn, files) || governsViaMount(otherRel, osf, seat, oOwn, files)) return null;
            }
          }
        }
      }
    }
  }
  return `${site}: su asiento citado «${seat}» NO gobierna el sitio — vive en ${piso ?? "?"} y ningún mecanismo verificable lo ata a la mano: ni consulta viva en su camino, ni gobierno importado, ni componente montado, ni canal gobernado: citar no es gobernar (S3/G16)`;
}
/* OLA 16 (Cara X1): el universo de los censos de superficies es el
 * ÁRBOL entero de src/components — recursivo, .ts y .tsx: una
 * superficie en un subdirectorio, en un .ts con createElement o fuera
 * de components/faro ya no es invisible. El mapa de archivos es
 * también el universo contra el que citaGobierna resuelve el gobierno
 * entre archivos (M2/M3), con la librería como segundo piso. */
const walkComponentFiles = (dir: URL, prefix: string): { rel: string; text: string }[] => {
  const out: { rel: string; text: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${e.name}`;
    if (e.isDirectory()) out.push(...walkComponentFiles(new URL(`${e.name}/`, dir), rel));
    else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) out.push({ rel, text: readFileSync(new URL(e.name, dir), "utf8") });
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
};
const censusFiles = (): Map<string, string> => {
  const files = new Map<string, string>();
  for (const f of walkComponentFiles(new URL("../../components/", import.meta.url), "components")) files.set(f.rel, f.text);
  const libDir = new URL("../../lib/faro/", import.meta.url);
  for (const f of readdirSync(libDir).filter((x) => x.endsWith(".ts") || x.endsWith(".tsx")).sort()) {
    files.set(`lib/faro/${f}`, readFileSync(new URL(f, libDir), "utf8"));
  }
  return files;
};
const mapperIndexOf = (files: Map<string, string>): Map<string, string> => {
  const index = new Map<string, string>();
  let known = new Set<string>();
  for (let round = 0; round < 3; round++) {
    for (const [rel, text] of files) {
      if (!rel.startsWith("components/")) continue;
      for (const [k, v] of idMapperBodies(text, known)) if (!index.has(k)) index.set(k, v);
    }
    const now = new Set(index.keys());
    if (now.size === known.size) break;
    known = now;
  }
  return index;
};
describe("ola9 · §A-quinquies: el censo de superficies — toda mano en masa nombra su asiento (OLA 14)", () => {
  const liveSites = (): string[] => {
    const files = censusFiles();
    const index = mapperIndexOf(files);
    const out: string[] = [];
    for (const [rel, text] of files) {
      if (!rel.startsWith("components/")) continue;
      out.push(...massHandSites(rel, text, index));
    }
    return out;
  };
  it("toda mano en masa del árbol vivo está clasificada con su asiento gobernante — y la cita GOBIERNA (S3/G16)", () => {
    const sites = liveSites();
    const files = censusFiles();
    const index = mapperIndexOf(files);
    assert.ok(sites.length >= 5, `el censo camina las superficies de verdad (${sites.length} sitios)`);
    for (const site of sites) {
      const entry = MANOS_EN_MASA[site];
      assert.ok(entry, `${site}: mano en masa SIN asiento nombrado en el sitio — la clase de CARA-Q2: nace, actúa en los tres modos y ningún censo la veía`);
      assert.ok(entry[0] in FEATURES, `${site}: su asiento gobernante «${entry[0]}» no existe en el registro`);
      assert.ok(entry[1].length > 10, `${site}: la clasificación lleva su razón escrita`);
      const acus = citaGobierna(site, entry[0], files, "hand", index);
      assert.equal(acus, null, acus ?? "");
    }
  });
  it("la higiene: ninguna clasificación sin sitio vivo", () => {
    const sites = new Set(liveSites());
    for (const site of Object.keys(MANOS_EN_MASA)) {
      assert.ok(sites.has(site), `${site}: clasificación sin sitio — la mano murió o se movió; la tabla se reescribe, no pudre`);
    }
  });
  it("espécimen Q2 (ola 14): el borrado total del libro por el canal del kit, sin asiento, ACUSA", () => {
    const staged = `export function KitMalo({ rows, onDrop }: { rows: { id: string }[]; onDrop: (ids: string[]) => void }) {
      const wipeAll = () => onDrop(rows.map((r) => r.id));
      return { wipeAll };
    }`;
    const sites = massHandSites("components/faro/inventada14.tsx", staged);
    assert.equal(sites.length, 1, "el censo VE la mano escenificada: canal de borrado alimentado por la lista mapeada de todo el libro");
    assert.ok(!(sites[0]! in MANOS_EN_MASA), "y no tiene asiento nombrado: es sentencia — con la cerca vieja la suite corría verde entera");
  });
  it("espécimen Q2: la misma mano alimentada por una variable atada a la lista mapeada también se ve", () => {
    const staged = `export function KitMalo2({ rows, dropMany }: { rows: { id: string }[]; dropMany: (ids: string[]) => void }) {
      const ids = rows.map((r) => r.id);
      const wipeAll = () => dropMany(ids);
      return { wipeAll };
    }`;
    assert.equal(massHandSites("components/faro/inventada14.tsx", staged).length, 1,
      "la lista mapeada atada a una variable no esconde la mano del censo");
  });
  it("control: la mano de UNA fila (sin lista, sin canal en masa) no es mano en masa", () => {
    const staged = `export function Fila({ line, dropLine }: { line: { id: string }; dropLine: (id: string) => void }) {
      const tap = () => dropLine(line.id);
      return { tap };
    }`;
    assert.deepEqual(massHandSites("components/faro/inventada14.tsx", staged), [],
      "borrar UNA línea por su id es la mano fina de siempre: el censo caza la masa, no el gesto");
  });
  it("espécimen S3 (ola 15) + G16: la cita que no gobierna ACUSA — y el gobierno verdadero absuelve por su mecanismo", () => {
    const mkKit = (pre: string) => new Map([["components/faro/book-kit.tsx", `export function BookKit({ rows, onDrop }: { rows: { id: string }[]; onDrop: (ids: string[]) => void }) {
      ${pre}
      const wipeAll = () => onDrop(rows.map((r) => r.id));
      return { wipeAll };
    }`]]);
    const site = "components/faro/book-kit.tsx:wipeAll#1";
    const acus = citaGobierna(site, "books.list", mkKit(""), "hand");
    assert.ok(acus && /S3\/G16/.test(acus), "el espécimen de la caza: la mano del kit clasificada citando «books.list» (Esencial, sin consulta ni mecanismo) — la cita existe y la razón pasa, y aun así no gobierna: ACUSA");
    assert.equal(citaGobierna(site, "books.multiselect", mkKit(`const canManage = has("books.multiselect");`), "hand"), null, "la cita verdadera del kit: la consulta viva en el componente que compone la mano gobierna (M1)");
    const mkArchivo = (pre: string) => new Map([["components/faro/archivo.tsx", `export function Archivo({ lines, dropMany }: { lines: { id: string }[]; dropMany: (ids: string[]) => void }) {
      ${pre}
      const askDeleteLines = () => dropMany(lines.map((l) => l.id));
      return askDeleteLines;
    }`]]);
    assert.equal(citaGobierna("components/faro/archivo.tsx:askDeleteLines#1", "archive.delete-lines", mkArchivo(`const canDeleteLines = has("archive.delete-lines");`), "hand"), null,
      "el gobierno vivo de Esencial: el registro lo puso en Esencial y el componente lo consulta en el camino de la mano — la consulta real absuelve");
    assert.ok(citaGobierna("components/faro/archivo.tsx:askDeleteLines#1", "archive.delete-lines", mkArchivo(""), "hand"),
      "y el mismo asiento citado por un archivo que NO lo consulta acusa: la consulta es el gobierno, no el nombre");
  });
  it("espécimen G1 (ola 16): la consulta MUERTA no absuelve — tras un return, en función jamás llamada, en componente hermano", () => {
    const site = "components/faro/archivo.tsx:askDeleteLines#1";
    const hand = `const askDeleteLines = () => dropMany(lines.map((l) => l.id));`;
    const props = `{ lines, dropMany }: { lines: { id: string }[]; dropMany: (ids: string[]) => void }`;
    const trasReturn = new Map([["components/faro/archivo.tsx", `export function Archivo(${props}) {
      ${hand}
      return askDeleteLines;
      const canDeleteLines = has("archive.delete-lines");
    }`]]);
    assert.ok(citaGobierna(site, "archive.delete-lines", trasReturn, "hand"), "G1a: la consulta tras un return es un cadáver en el archivo: no está en el camino de la mano y no absuelve");
    const jamasLlamada = new Map([["components/faro/archivo.tsx", `const puertaMuerta = () => has("archive.delete-lines");
    export function Archivo(${props}) {
      ${hand}
      return askDeleteLines;
    }`]]);
    assert.ok(citaGobierna(site, "archive.delete-lines", jamasLlamada, "hand"), "G1b: la consulta en una función que nadie llama no gobierna la mano de otro");
    const hermano = new Map([["components/faro/archivo.tsx", `export function Otro() { const canDeleteLines = has("archive.delete-lines"); return canDeleteLines; }
    export function Archivo(${props}) {
      ${hand}
      return askDeleteLines;
    }`]]);
    assert.ok(citaGobierna(site, "archive.delete-lines", hermano, "hand"), "G1c: la consulta en un componente hermano no gobierna esta mano");
    const viva = new Map([["components/faro/archivo.tsx", `export function Archivo(${props}) {
      const canDeleteLines = has("archive.delete-lines");
      ${hand}
      const ui = canDeleteLines ? askDeleteLines : null;
      return ui;
    }`]]);
    assert.equal(citaGobierna(site, "archive.delete-lines", viva, "hand"), null, "control: la consulta viva en el componente, con su atadura usada por la cara, absuelve");
  });
  it("espécimen G2+G3 (ola 16): el gobierno importado cuenta y los censos concuerdan; la cita sin mecanismo acusa", () => {
    // G2: la puerta vive en un hook importado — gobierna la mano que lo llama
    const files = new Map([
      ["components/faro/inventada16-hooks.ts", `export const useCanDeleteLines = () => has("archive.delete-lines");`],
      ["components/faro/archivo.tsx", `import { useCanDeleteLines } from "./inventada16-hooks";
      export function Archivo({ lines, dropMany }: { lines: { id: string }[]; dropMany: (ids: string[]) => void }) {
        const canDeleteLines = useCanDeleteLines();
        const askDeleteLines = () => dropMany(lines.map((l) => l.id));
        const ui = canDeleteLines ? askDeleteLines : null;
        return ui;
      }`],
    ]);
    assert.equal(citaGobierna("components/faro/archivo.tsx:askDeleteLines#1", "archive.delete-lines", files, "hand"), null,
      "G2: la puerta extraída al hook importado gobierna la mano que lo importa (M2) — la cerca vieja la sentenciaba mientras la §A la contaba consumida");
    assert.equal(consumedIn(stripComments(files.get("components/faro/inventada16-hooks.ts")!), "archive.delete-lines"), true,
      "y la §A cuenta el mismo consumo en el mismo corpus: los dos censos concuerdan");
    // G3: citar un asiento de Ritmo que gobierna OTRO archivo no absuelve a la mano que no lo consulta ni por importación
    const sinMecanismo = new Map([["components/faro/inventada16.tsx", `export function ManoNueva({ rows, onDrop }: { rows: { id: string }[]; onDrop: (ids: string[]) => void }) {
      const wipeAll = () => onDrop(rows.map((r) => r.id));
      return { wipeAll };
    }`]]);
    assert.ok(citaGobierna("components/faro/inventada16.tsx:wipeAll#1", "books.multiselect", sinMecanismo, "hand"),
      "G3: books.multiselect gobierna el kit en book-kit.tsx — esta mano no lo consulta, no lo importa, no monta el kit: el piso solo ya no absuelve");
  });
  it("espécimen S1 (ola 15): la mano partida entre dos archivos se VE — la alimentación sigue el valor", () => {
    const ayuda = `export const preparaIds = (rows: { id: string }[]) => rows.map((r) => r.id);`;
    const hoja = `import { preparaIds } from "./inventada15-ayuda";
export function Hoja({ rows, aplicaWipe }: { rows: { id: string }[]; aplicaWipe: (ids: string[]) => void }) {
  const wipeAll = () => aplicaWipe(preparaIds(rows));
  return { wipeAll };
}`;
    assert.deepEqual(massHandSites("components/faro/inventada15-hoja.tsx", hoja), [],
      "sin el índice de valores, la mano partida es invisible: el control que prueba que el índice es el que ve");
    const index = idMapperBodies(ayuda);
    assert.deepEqual(massHandSites("components/faro/inventada15-hoja.tsx", hoja, index), ["components/faro/inventada15-hoja.tsx:wipeAll#1"],
      "con el índice, el argumento que es la llamada al ayudante que mapea ids alimenta la mano: el sitio nace y exige su asiento");
    const unida = `export function Hoja({ rows, aplicaWipe }: { rows: { id: string }[]; aplicaWipe: (ids: string[]) => void }) {
  const wipeAll = () => aplicaWipe(rows.map((r) => r.id));
  return { wipeAll };
}`;
    assert.equal(massHandSites("components/faro/inventada15-hoja.tsx", unida).length, 1, "control de la caza: la misma mano unida en una expresión se veía desde siempre");
  });
  it("espécimen V (ola 16): el seguidor de valores aprende las grafías — segundo salto, reduce, flatMap, Array.from, desestructuración", () => {
    const mk = (arg: string, pre = "") => `export function Hoja({ rows, aplicaWipe }: { rows: { id: string }[]; aplicaWipe: (ids: string[]) => void }) {
      ${pre}
      const wipeAll = () => aplicaWipe(${arg});
      return { wipeAll };
    }`;
    const f = "components/faro/inventada16-hoja.tsx";
    assert.equal(massHandSites(f, mk("ids", `const directos = rows.map((r) => r.id); const ids = [...directos];`)).length, 1,
      "V1: el segundo salto — A mapea, B reenvía por esparcido, la mano se alimenta de B: la variable-lista se sigue por punto fijo");
    assert.equal(massHandSites(f, mk("rows.reduce((acc: string[], r) => [...acc, r.id], [])")).length, 1,
      "V2: el reduce que acumula ids alimenta la mano");
    assert.equal(massHandSites(f, mk("rows.flatMap((r) => [r.id])")).length, 1,
      "V3: el flatMap que produce ids alimenta la mano");
    assert.equal(massHandSites(f, mk("Array.from(rows, (r) => r.id)")).length, 1,
      "V4: Array.from con mapeador alimenta la mano");
    assert.equal(massHandSites(f, mk("rows.map(({ id }) => id)")).length, 1,
      "V5: la desestructuración ({id}) => id — el id nace en el parámetro y el cuerpo lo devuelve desnudo: también es la grafía canónica");
    assert.equal(massHandSites(f, mk("rows.map(({ id }) => id).concat(otros)", `const otros: string[] = [];`)).length, 1,
      "V6: la misma grafía como expresión unida en la mano (la cadena sobre el valor productor)");
    assert.equal(massHandSites(f, mk("rows.map((r) => r.name)")).length, 0,
      "control: mapear otra cosa no alimenta una mano en masa");
  });
});

/* ═══════════ §A-sexies (OLA 15 · Cara S2): EL CENSO DE COMPOSICIONES ═
 * El censo de superficies clasificaba el CANAL dentro de fit-pick.tsx,
 * y su razón afirmaba de TODAS las composiciones que «la hoja dispara
 * solo el onDropMany que una composición gobernada le entregó» — una
 * afirmación que ningún censo verificaba composición a composición.
 * La caza montó una superficie NUEVA con la hoja compartida y un
 * `manage` con onDropMany sin gobernar, y la corrida amplia fue verde:
 * el gobierno vivo es real, pero vivía clavado textualmente dentro de
 * cada archivo que compone, y una quinta superficie quedaba fuera de
 * todas las clavijas. Ahora el censo enumera también las
 * COMPOSICIONES: cada entrega de un canal de masa como prop — un
 * `manage` que lleva onDropMany (la hoja), un onDropMany suelto, el
 * onDrop del kit (BookKit) — es un sitio que nombra su asiento
 * gobernante, y la cita se verifica con la misma regla de S3/G16
 * (citaGobierna): un mecanismo verificable — la consulta viva en el
 * camino, el gobierno importado o el componente montado. Desde la
 * ola 16 el censo camina el árbol entero y juzga también las
 * entregas no literales (X1/X2). */
function compositionNodes(file: string, text: string): Map<string, ts.Node> {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  /* OLA 16 (Cara X2): la entrega no literal también compone — el
   * censo viejo solo veía el literal (o el condicional de literales)
   * escrito en el atributo, y la caza montó la hoja de cinco formas
   * que escapaban enteras: manage por variable, manage tras un &&, la
   * entrega por spread de props, el montaje por spread de JSX y el kit
   * bajo alias de importación. Ahora las ataduras del archivo se
   * resuelven, los alias del kit se honran y createElement compone
   * como el JSX. Una entrega por referencia irresoluble (el prop que
   * se reenvía) también es sitio: la composición existe y nombra su
   * asiento, o acusa por no tenerlo. */
  const bindings = new Map<string, ts.Node>();
  const kitOrig = new Map<string, string>([["BookKit", "BookKit"], ["PickSheet", "PickSheet"]]);
  const collect = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) bindings.set(n.name.text, n.initializer);
    if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
      for (const el of n.importClause.namedBindings.elements) {
        const orig = el.propertyName?.text ?? el.name.text;
        if (orig === "BookKit" || orig === "PickSheet") kitOrig.set(el.name.text, orig);
      }
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);
  const unwrap = (e: ts.Node): ts.Node[] => {
    if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e)) return unwrap(e.expression);
    if (ts.isConditionalExpression(e)) return [...unwrap(e.whenTrue), ...unwrap(e.whenFalse)];
    if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return [...unwrap(e.left), ...unwrap(e.right)];
    return [e];
  };
  const litHas = (e: ts.Node, prop: string, deep = false): boolean => unwrap(e).some((x) => {
    if (ts.isObjectLiteralExpression(x)) {
      return x.properties.some((p) => {
        if (!((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name && p.name.getText() === prop)) return false;
        return true;
      }) || (deep && x.properties.some((p) => ts.isPropertyAssignment(p) && litHas(p.initializer, prop, true)));
    }
    if (ts.isIdentifier(x)) { const b = bindings.get(x.text); return b ? litHas(b, prop, deep) : false; }
    return false;
  });
  const byReference = (e: ts.Node): boolean => unwrap(e).some((x) => {
    let r: ts.Node = x;
    while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r)) r = r.expression;
    return ts.isIdentifier(r) && r.text !== "undefined" && r.text !== "null" && !bindings.has(r.text);
  });
  const sites = new Map<string, ts.Node>();
  const ordinals = new Map<string, number>();
  const walk = (n: ts.Node, fn: string) => {
    let cur = fn;
    if (ts.isFunctionDeclaration(n) && n.name) cur = n.name.text;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) cur = n.name.text;
    let massNode: ts.Node | null = null;
    if (ts.isJsxAttribute(n)) {
      const attr = n.name.getText();
      const elNode = n.parent?.parent as ts.Node | undefined;
      const el = elNode && (ts.isJsxOpeningElement(elNode) || ts.isJsxSelfClosingElement(elNode)) ? elNode.tagName.getText() : "";
      if (attr === "onDropMany") massNode = n;
      else if (attr === "manage" && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression) {
        if (litHas(n.initializer.expression, "onDropMany") || byReference(n.initializer.expression)) massNode = n;
      } else if (attr === "onDrop") {
        if (kitOrig.get(el) === "BookKit") massNode = n;
      }
    } else if (ts.isJsxSpreadAttribute(n)) {
      const elNode = n.parent?.parent as ts.Node | undefined;
      const el = elNode && (ts.isJsxOpeningElement(elNode) || ts.isJsxSelfClosingElement(elNode)) ? elNode.tagName.getText() : "";
      const orig = kitOrig.get(el);
      if (orig === "PickSheet" && (litHas(n.expression, "onDropMany", true) || byReference(n.expression))) massNode = n;
      else if (orig === "BookKit" && (litHas(n.expression, "onDrop", true) || byReference(n.expression))) massNode = n;
    } else if (ts.isCallExpression(n)) {
      const cal = n.expression;
      const isCE = (ts.isIdentifier(cal) && cal.text === "createElement") || (ts.isPropertyAccessExpression(cal) && cal.name.text === "createElement");
      if (isCE && n.arguments.length >= 2 && ts.isIdentifier(n.arguments[0]!)) {
        const orig = kitOrig.get((n.arguments[0] as ts.Identifier).text);
        if (orig === "PickSheet" && (litHas(n.arguments[1]!, "onDropMany", true) || byReference(n.arguments[1]!))) massNode = n;
        else if (orig === "BookKit" && (litHas(n.arguments[1]!, "onDrop", true) || byReference(n.arguments[1]!))) massNode = n;
      }
    }
    if (massNode) {
      const k = `${file}:${cur}`;
      const ord = (ordinals.get(k) ?? 0) + 1;
      ordinals.set(k, ord);
      sites.set(`${k}#${ord}`, massNode);
    }
    ts.forEachChild(n, (c) => walk(c, cur));
  };
  walk(sf, "(raíz)");
  return sites;
}
function compositionSites(file: string, text: string): string[] {
  return [...compositionNodes(file, text).keys()];
}
const COMPOSICIONES_EN_MASA: Record<string, [string, string]> = {
  "components/faro/book-kit.tsx:BookKit#1": ["books.multiselect", "el propio kit compone la hoja: su manage nace de canManage = has(\"books.multiselect\") en este mismo archivo (book-kit.tsx:60-61) y la hoja solo recibe el canal bajo esa puerta — sitio que el censo plano no veía y la caminata del árbol de la ola 16 desnudó"],
  "components/faro/debts.tsx:OwedSide#1": ["books.multiselect", "el kit de «Me deben»: su onDrop archiva la selección que books.multiselect gobierna dentro del propio kit (canManage, book-kit.tsx); la composición entrega el canal bajo esa misma puerta"],
  "components/faro/fit-pick.tsx:StorePick#1": ["editor.picker-manage", "el manage de la hoja de tiendas solo se entrega bajo has(\"editor.picker-manage\") en este mismo archivo (fit-pick.tsx:402-410); sin la puerta, la composición entrega la hoja sin manage"],
  "components/faro/fit-pick.tsx:PurchaseCatPick#1": ["editor.picker-manage", "el manage de la hoja de categorías de compra solo se entrega bajo has(\"editor.picker-manage\") en este mismo archivo"],
  "components/faro/fit-pick.tsx:CategoryPick#1": ["editor.picker-manage", "el manage de la hoja de categorías solo se entrega bajo has(\"editor.picker-manage\") en este mismo archivo"],
  "components/faro/fit-pick.tsx:SubPick#1": ["editor.picker-manage", "el manage de la hoja de subconceptos solo se entrega bajo has(\"editor.picker-manage\") en este mismo archivo"],
  "components/faro/fit-pick.tsx:BrandIconPick#1": ["subs.brand-icon-admin", "CORRECCIÓN OLA 16: esta composición citaba «editor.picker-manage» y la cerca vieja la absolvía por el piso solo — el gobierno verdadero, clavado desde la ola 8, es has(\"subs.brand-icon-admin\") (Completo) en este mismo archivo (fit-pick.tsx:588): la cita ahora nombra el asiento que gobierna"],
  "components/faro/loans.tsx:DueLoans#1": ["books.multiselect", "el kit de préstamos: su onDrop archiva la selección que books.multiselect gobierna dentro del propio kit (canManage, book-kit.tsx); la composición entrega el canal bajo esa misma puerta"],
  "components/faro/remit-people.tsx:RemitToPick#1": ["remit.manage", "el manage de la hoja de personas de remesa se entrega bajo has(\"remit.manage\") en este mismo archivo y componente (la cura de la ola 16: la puerta nació aquí; antes ninguna cara consultaba el asiento)"],
  "components/faro/remit-people.tsx:RemitPeople#1": ["books.multiselect", "el kit de personas de remesa: su onDrop retira la selección que books.multiselect gobierna dentro del propio kit (canManage, book-kit.tsx)"],
  "components/faro/screens.tsx:LinesBlock#1": ["books.multiselect", "el kit del mes: su onDrop borra la selección que books.multiselect gobierna dentro del propio kit (canManage, book-kit.tsx); la composición entrega el canal bajo esa misma puerta"],
  "components/faro/screens.tsx:savKit#1": ["books.multiselect", "el kit del apartado: su onDrop aparta/archiva la selección que books.multiselect gobierna dentro del propio kit (canManage, book-kit.tsx)"],
};
describe("ola9 · §A-sexies: el censo de composiciones — cada montaje de un canal de masa nombra su asiento (OLA 15)", () => {
  const liveCompositions = (): string[] => {
    const out: string[] = [];
    for (const [rel, text] of censusFiles()) {
      if (!rel.startsWith("components/")) continue;
      out.push(...compositionSites(rel, text));
    }
    return out;
  };
  it("toda composición viva está clasificada y su cita gobierna el montaje", () => {
    const sites = liveCompositions();
    const files = censusFiles();
    assert.ok(sites.length >= 11, `el censo enumera las composiciones de verdad (${sites.length} sitios)`);
    for (const site of sites) {
      const entry = COMPOSICIONES_EN_MASA[site];
      assert.ok(entry, `${site}: composición de un canal de masa SIN asiento nombrado — la clase de S2: la superficie nueva monta la mano de administrar en todo piso y ningún censo la veía`);
      assert.ok(entry[0] in FEATURES, `${site}: su asiento gobernante «${entry[0]}» no existe en el registro`);
      assert.ok(entry[1].length > 10, `${site}: la clasificación lleva su razón escrita`);
      const acus = citaGobierna(site, entry[0], files, "composition");
      assert.equal(acus, null, acus ?? "");
    }
  });
  it("la higiene: ninguna clasificación sin composición viva", () => {
    const sites = new Set(liveCompositions());
    for (const site of Object.keys(COMPOSICIONES_EN_MASA)) {
      assert.ok(sites.has(site), `${site}: clasificación sin composición — el montaje murió o se movió; la tabla se reescribe, no pudre`);
    }
  });
  it("espécimen S2 (ola 15): la superficie nueva que monta la hoja sin gobernar NACE como sitio y no tiene asiento", () => {
    const staged = `export function SuperficieNueva({ rows }: { rows: { id: string }[] }) {
      return <PickSheet title="X" items={rows} manage={{ word: ["cosa", "cosas", "thing", "things"], onDropMany: (ids: string[]) => dropMany(ids), onRename: (id: string, n: string) => {} }} />;
    }`;
    const sites = compositionSites("components/faro/inventada15.tsx", staged);
    assert.deepEqual(sites, ["components/faro/inventada15.tsx:SuperficieNueva#1"], "el censo de composiciones VE el montaje nuevo: la entrega del canal como prop es el sitio");
    assert.ok(!(sites[0]! in COMPOSICIONES_EN_MASA), "y no tiene asiento nombrado: es sentencia — con la cerca vieja la corrida amplia era verde");
    const kit = `export function KitNuevo({ rows }: { rows: { id: string }[] }) {
      return <BookKit title="X" rows={rows} onDrop={(ids: string[]) => dropMany(ids)} />;
    }`;
    assert.deepEqual(compositionSites("components/faro/inventada15.tsx", kit), ["components/faro/inventada15.tsx:KitNuevo#1"], "el onDrop del kit compone el otro canal de la librería de gestos: también es sitio");
    const hojaSinMasa = `export function SoloElegir({ rows }: { rows: { id: string }[] }) {
      return <PickSheet title="X" items={rows} onPick={(id: string) => choose(id)} />;
    }`;
    assert.deepEqual(compositionSites("components/faro/inventada15.tsx", hojaSinMasa), [], "control: montar la hoja SIN el canal de masa no es composición en masa");
  });
  it("espécimen X2 (ola 16): las cinco entregas no literales COMPONEN — el censo las ve", () => {
    const hoja = (inner: string, pre = "") => `export function Editor() {
      ${pre}
      return <PickSheet title="X" ${inner} />;
    }`;
    const cuerpo = "onDrop: () => {}, onDropMany: () => {}";
    assert.equal(compositionSites("components/faro/x2.tsx", hoja(`manage={gestion}`, `const gestion = { ${cuerpo} };`)).length, 1, "X2a: manage entregado por variable — la atadura se resuelve y la entrega compone");
    assert.equal(compositionSites("components/faro/x2.tsx", hoja(`manage={activo && { ${cuerpo} }}`)).length, 1, "X2b: manage tras un && — el desenvuelto llega al literal");
    assert.equal(compositionSites("components/faro/x2.tsx", hoja(`manage={props.gestion}`)).length, 1, "X2c: manage por reenvío de prop — la entrega por referencia también es composición y nombra su asiento");
    assert.equal(compositionSites("components/faro/x2.tsx", hoja(`{...entrega}`, `const entrega = { manage: { ${cuerpo} } };`)).length, 1, "X2d: el montaje por spread de JSX entrega el canal igual que el atributo");
    assert.equal(compositionSites("components/faro/x2.tsx", `import { BookKit as Kit } from "./book-kit";
    export function Editor() { return <Kit onDrop={() => {}} />; }`).length, 1, "X2e: el kit bajo alias de importación sigue siendo el kit");
    assert.equal(compositionSites("components/faro/x2.tsx", hoja(`manage={undefined}`)).length, 0, "control: sin canal no hay composición");
  });
});

/* ── §A-bis (OLA 10 · CARA-3): EL DESNUDADO, PROBADO EN SUS ESQUINAS ──
 * El espécimen de la caza (M-c) y las esquinas que un lexer ingenuo se
 * comería: la URL dentro de una cadena no es un comentario, el /* dentro
 * de una cadena no abre un comentario, y el apóstrofo de un texto no
 * abre una cadena que se trague la puerta siguiente. */
describe("ola9 · §A-bis: el desnudado de comentarios no cuenta papel ni se come código", () => {
  it("M-c: un comentario al final de línea con el asiento entre comillas NO cuenta como consumo", () => {
    const muerto = `const open = true; // la puerta muerta de "accounts.add" ya no se consulta\nexport const x = open;`;
    assert.ok(!stripComments(muerto).includes('"accounts.add"'),
      "la mención vive en un comentario de cola: contarla resucita una puerta muerta (espécimen de la caza)");
  });
  it("un comentario de bloque con el asiento entre comillas tampoco cuenta, en cualquier posición", () => {
    assert.ok(!stripComments(`const a = 1; /* "cards.ficha" */ const b = 2;`).includes('"cards.ficha"'));
    assert.ok(!stripComments(`/* "cards.ficha" */\nconst b = 2;`).includes('"cards.ficha"'));
  });
  it("la puerta viva tras un comentario en la misma línea SÍ cuenta", () => {
    const vivo = `const g = has(/* el gobernador */ "cards.ficha");`;
    assert.ok(stripComments(vivo).includes('"cards.ficha"'), "el comentario se va; la llamada queda");
  });
  it("las cadenas no se desnudan: la URL y el // dentro de una cadena sobreviven", () => {
    const t = stripComments(`const u = "https://example.com/a//b"; const g = has("tools.rate-view");`);
    assert.ok(t.includes("https://example.com/a//b"), "una URL en una cadena no es un comentario");
    assert.ok(t.includes('"tools.rate-view"'), "la puerta tras la cadena sigue contando");
  });
  it("el /* dentro de una cadena no abre un comentario que se trague la puerta", () => {
    const t = stripComments(`const s = "/*"; const g = has("subs.fixed-exists");`);
    assert.ok(t.includes('"subs.fixed-exists"'));
  });
  it("la plantilla tampoco: el // dentro de un literal de plantilla es texto", () => {
    const t = stripComments("const s = `a//b ${1 + 1}`; const g = has(\"cards.ficha\");");
    assert.ok(t.includes("a//b") && t.includes('"cards.ficha"'));
  });
  it("el apóstrofo de un texto no abre una cadena: la puerta de la misma línea sobrevive", () => {
    const t = stripComments(`const el = <p>Don't wait</p>; const g = has("subs.fixed-exists");`);
    assert.ok(t.includes('"subs.fixed-exists"'), "si el apóstrofo abriera cadena, la puerta quedaría dentro de ella o tras un comentario falso");
  });
  it("la regex por contexto no se confunde con comentario ni se come la puerta", () => {
    const t = stripComments(`const ok = /^https?:\\/\\//.test(u); const g = has("tools.rate-view");`);
    assert.ok(t.includes('"tools.rate-view"'), "los \\/\\// de la regex no son un comentario de línea");
  });
});

/* ── §A-ter (OLA 11 · CARA-3/4): EL CENSO CUENTA GOBIERNO, NO TEXTO ────
 * Los especímenes de la caza, escenificados sobre corpus sintéticos que
 * pasan por el MISMO desnudado que el corpus real: la declaración del
 * asiento en el registro más UN artefacto. Con el conteo de menciones de
 * la ola 10, M3-a/b/c volvían verde con la puerta muerta (22/22 en la
 * copia de la caza) y M3-d corría rojo acusando de fantasma a un asiento
 * gobernado. Aquí cada artefacto dice su verdad en las dos direcciones. */
describe("ola9 · §A-ter: el censo cuenta sitios de llamada, no texto (OLA 11)", () => {
  const REG = `"accounts.add": "esencial",`; // la declaración en el registro
  const census = (artefacto: string) => stripComments(`${REG}\n${artefacto}`);
  it("M3-a · la regex con el nombre entre comillas NO consume", () => {
    assert.equal(consumedIn(census(`const seatRe = /"accounts.add"/;`), "accounts.add"), false);
  });
  it("M3-b · el nombre en el TEXTO de una plantilla NO consume", () => {
    assert.equal(consumedIn(census("const s = `la puerta \"accounts.add\" vive en Ritmo`;"), "accounts.add"), false);
  });
  it("M3-c · la cadena jamás llamada NO consume", () => {
    assert.equal(consumedIn(census(`const SEAT = "accounts.add";`), "accounts.add"), false);
  });
  it("M3-c′ · la misma constante, LLAMADA por su nombre, SÍ consume (es gobierno)", () => {
    assert.equal(consumedIn(census(`const SEAT = "accounts.add"; const g = has(SEAT);`), "accounts.add"), true);
  });
  it("M3-d · la puerta construida por concatenación SÍ consume: su asiento no es fantasma", () => {
    assert.equal(consumedIn(census(`const g = has(("accounts." + "add") as never);`), "accounts.add"), true);
  });
  it("la puerta de plantilla estática SÍ consume", () => {
    assert.equal(consumedIn(census("const g = has(`accounts.add`);"), "accounts.add"), true);
  });
  it("la tabla de composición SÍ consume (la doctrina de FOLD_FEATURE)", () => {
    const c = census(`const TABLA = { fold: "accounts.add" }; const g = has(TABLA[id] ?? "study.fold-x");`);
    assert.equal(consumedIn(c, "accounts.add"), true);
    assert.equal(consumedIn(c, "study.fold-x"), true); // el fallback también es llamada
  });
  it("la llamada directa de siempre SÍ consume (control)", () => {
    assert.equal(consumedIn(census(`const g = has("accounts.add");`), "accounts.add"), true);
  });
  it("la puerta irresoluble ACUSA EN VOZ ALTA en vez de condenar a un asiento", () => {
    const acus = unresolvedGates(census(`const g = has(algunNombre);`));
    assert.equal(acus.length, 1);
    assert.match(acus[0]!, /has\(algunNombre/);
  });
  it("ninguna forma resoluble acusa: literal, concatenación, tabla, constante, flujo FeatureId", () => {
    const c = census([
      `const a = has("accounts.add");`,
      `const b = has(("accounts." + "add") as never);`,
      "const c = has(`accounts.add`);",
      `const TABLA = { fold: "accounts.add" }; const d = has(TABLA[id] ?? "study.fold-x");`,
      `const SEAT = "accounts.add"; const e = has(SEAT);`,
      `const f = has(fid as never);`,
    ].join("\n"));
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("en el corpus vivo no hay ni una puerta irresoluble (CARA-4, dirección viva)", () => {
    assert.deepEqual(unresolvedGates(CORPUS), []);
  });
  /* OLA 12 · CARA-3, segunda vuelta: los cuatro disfraces de la caza
   * corren a doctrina — consumo o acusación en voz alta sobre la puerta;
   * jamás la sentencia muda de fantasma sobre el asiento. */
  it("12E · la media concatenación ACUSA a la puerta y el asiento no paga la sentencia", () => {
    const c = census(`const g = has(("accounts." + ola12Suffix) as never);`);
    assert.equal(consumedIn(c, "accounts.add"), false, "la media concatenación no consume: su segunda mitad no resuelve");
    const acus = unresolvedGates(c);
    assert.equal(acus.length, 1, `la puerta es acusada en voz alta: ${acus.join(" | ")}`);
    assert.equal(explainedByAccusedGate(c, "accounts.add"), true,
      "el asiento al final de la puerta acusada se reporta consumido-por-puerta-acusada, no fantasma");
  });
  it("12F · el `has` importado con alias consume y no acusa", () => {
    const c = census(`import { has as ola12Puede } from "./provider";\nconst g = ola12Puede("accounts.add");`);
    assert.equal(consumedIn(c, "accounts.add"), true, "la llamada renombrada ES la puerta: el gobierno manda, no el nombre");
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("12G2 · la tabla invocada por su alias empareja con su sitio de declaración", () => {
    const c = census(`const OLA12_TABLA = { fold: "accounts.add" }; const OLA12_ALIAS = OLA12_TABLA; const g = has(OLA12_ALIAS[id] ?? "study.fold-x");`);
    assert.equal(consumedIn(c, "accounts.add"), true, "el cuerpo se lee en la declaración, se invoque como se invoque");
    assert.equal(consumedIn(c, "study.fold-x"), true);
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("12H2 · la cadena de dos saltos consume a su asiento: una sola sentencia, el consumo", () => {
    const c = census(`const OLA12_A = "accounts.add"; const OLA12_B = OLA12_A; const g = has(OLA12_B);`);
    assert.equal(consumedIn(c, "accounts.add"), true, "la resolución sigue la cadena hasta el literal");
    assert.deepEqual(unresolvedGates(c), [], "y la puerta no es acusada: la doble sentencia de la ola 12 no vuelve");
  });
  it("control · la cadena que muere en un cómputo acusa a la puerta y no consume", () => {
    const c = census(`const A = "accounts.add"; const B = compute(A); const g = has(B);`);
    assert.equal(consumedIn(c, "accounts.add"), false);
    assert.equal(unresolvedGates(c).length, 1, "el callejón acusa en voz alta");
  });
  /* OLA 13 · mut13-a entero a doctrina: ni doble sentencia ni fantasma
   * en silencio — cada forma consume, o acusa una sola vez sobre la
   * puerta que la doctrina nombra. */
  it("13-T1 · la cadena por un OBJETO consume por el punto, sin acusar a la puerta", () => {
    const c = census(`const SEATS = { add: "accounts.add" };\nconst g = has(SEATS.add);`);
    assert.equal(consumedIn(c, "accounts.add"), true, "has(SEATS.add) consume el asiento que la propiedad declara");
    assert.deepEqual(unresolvedGates(c), [], "ni doble sentencia: la puerta no es acusada por la forma que consume");
  });
  it("13-T1b · el gemelo por corchete consume igual: el punto y el corchete son la misma doctrina", () => {
    const c = census(`const SEATS = { add: "accounts.add" };\nconst g = has(SEATS["add"]);`);
    assert.equal(consumedIn(c, "accounts.add"), true);
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("13-T2 · el alias LOCAL de la puerta consume y no deja fantasma en silencio", () => {
    const c = census(`import { has as puede } from "./mode";\nconst puede2 = puede;\nconst g = puede2("accounts.add");`);
    assert.equal(consumedIn(c, "accounts.add"), true, "puede2 ES la puerta: la tabla de nombres sigue los alias locales");
    assert.deepEqual(unresolvedGates(c), [], "y la llamada se ve: nadie la deja pasar en silencio");
  });
  it("13-T3 · la tabla invocada por ALIAS DE IMPORTACIÓN empareja con su declaración", () => {
    const c = census(`export const TABLA = { a: "accounts.add" };\nimport { TABLA as ALIAS } from "./a";\nconst g = has(ALIAS[id]);`);
    assert.equal(consumedIn(c, "accounts.add"), true, "la raíz sigue el alias de importación hasta el nombre declarado");
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("13-T4 · la plantilla con hueco resoluble consume el asiento que compone", () => {
    const c = census("const SUF = \"add\";\nconst g = has(`accounts.${SUF}`);");
    assert.equal(consumedIn(c, "accounts.add"), true, "el hueco resuelve por cadena y la plantilla compone el asiento");
    assert.deepEqual(unresolvedGates(c), []);
  });
  it("13-T4b · la plantilla con hueco IRRESOLUBLE acusa a la puerta y su prefijo explica al asiento", () => {
    const c = census("const g = has(`accounts.${sufijo}`);");
    assert.equal(consumedIn(c, "accounts.add"), false);
    assert.equal(unresolvedGates(c).length, 1, "la puerta acusa en voz alta");
    assert.equal(explainedByAccusedGate(c, "accounts.add"), true,
      "el prefijo estático de la plantilla se lee como un literal: el asiento queda explicado, no fantasma");
  });
  /* OLA 14 · Cara A1: la media concatenación SIN cast vestía el traje
   * del literal por la cabeza y la puerta quedaba absuelta, mientras
   * la misma forma CON cast acusaba — la doctrina colgaba del cast.
   * A doctrina: el argumento se juzga entero, pieza a pieza. */
  it("14-A1 · la media concatenación SIN cast acusa igual que con cast: la doctrina es la composición, no el cast", () => {
    const sin = census(`const SUF = computeSuffix(); const g = has("accounts." + SUF);`);
    const con = census(`const SUF = computeSuffix(); const g = has(("accounts." + SUF) as never);`);
    assert.equal(unresolvedGates(sin).length, 1, "sin cast: la segunda pieza no resuelve y la puerta acusa");
    assert.equal(unresolvedGates(con).length, 1, "con cast: la misma sentencia — una sola doctrina");
    assert.equal(explainedByAccusedGate(sin, "accounts.add"), true,
      "y el asiento queda explicado por el prefijo de la puerta acusada: una sentencia, sobre la puerta");
  });
  it("14-A1 · la concatenación ENTERA sin cast no acusa: cada pieza resuelve", () => {
    const c = census(`const SUF = "add"; const g = has("accounts." + SUF);`);
    assert.deepEqual(unresolvedGates(c), [], "literal + constante de la cadena: composición resuelta, sin cast de por medio");
    assert.equal(consumedIn(c, "accounts.add"), false, "consumedIn no la cuenta como consumo directo — pero la puerta no es acusada: su composición resuelve");
  });
});

/* ═══════════ §B · LOS TEMAS RE-ASENTADOS (CARA-1/2 y la hermana) ═══════
 * El tema sigue al asiento que GOBIERNA su superficie, no al que el
 * mapa soñaba. El formulario de movimiento de cuentas trabaja en
 * Esencial (la rama que lo pinta no conoce accounts.panel: en Esencial
 * siempre es el formulario de movimiento, fallo 7: accounts.move = E);
 * la forma de dar de alta una cuenta ES accounts.add (la envuelve su
 * has()); y «Acumulado si no se toca» se monta dentro de la forma de
 * Retiro, cuyo bolsillo gobierna vault.retiro = R. */
describe("ola9 · §B: los temas caídos se re-asientan a su gobernador real", () => {
  it("cuenta-movimiento y f-cuenta-monto viven en Esencial, bajo accounts.move", () => {
    assert.equal(modeOf("cuenta-movimiento"), "esencial", "el (?) del movimiento anuncia el modo donde el formulario trabaja");
    assert.equal(modeOf("f-cuenta-monto"), "esencial", "el (?) del importe, la misma verdad");
    assert.equal(FEATURES["accounts.move"], "esencial", "el registro confirma el asiento (fallo 7)");
  });
  it("f-cuenta-nombre vive en Ritmo, bajo accounts.add — su forma sí lleva la puerta", () => {
    assert.equal(modeOf("f-cuenta-nombre"), "ritmo");
    assert.equal(FEATURES["accounts.add"], "ritmo", "la forma de alta se envuelve en has(\"accounts.add\") en screens.tsx");
  });
  it("f-retiro-acumulado vive en Ritmo, bajo vault.retiro — la cara que lo pinta", () => {
    assert.equal(modeOf("f-retiro-acumulado"), "ritmo", "el campo pinta y se lee en la forma de Retiro de Ritmo; Completo era el fantasma");
    assert.equal(FEATURES["vault.retiro"], "ritmo");
  });
  it("la fuente ata los temas a la forma sin puerta: ningún has() nombra a los fantasmas", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('topic="cuenta-movimiento"') && screens.includes('topic="f-cuenta-monto"'),
      "los dos (?) se montan en el formulario de movimiento de screens.tsx");
    assert.ok(!CORPUS.includes('has("accounts.panel")') && !CORPUS.includes('has("vault.retiro-fields")'),
      "ninguna puerta del árbol nombra a los fantasmas: por eso el cruce contra ellos quedaba verde");
  });
});

/* ═══════════ §C · CARA-3: «tiendas» sigue a su función ═══════════════════
 * El tema enseñaba en Esencial «Toca una para mostrarla u ocultarla»,
 * un toque que en Esencial no existe en ninguna superficie: el único
 * (?) del tema se monta en la tira del engranaje del libro Compras, que
 * es cara de Ritmo, y su propio go ya confesaba el piso. El tema se
 * re-asienta a Ritmo ENTERO — la enseñanza de mostrar/ocultar se queda,
 * porque en su piso es verdad — y crear/elegir tiendas en el momento de
 * uso lo siguen enseñando en Esencial f-tienda y f-cat-compra
 * (settings.catalog-add), que es donde la mano crea de verdad. */
describe("ola9 · §C: «tiendas» vive donde vive su toque", () => {
  it("el tema es de Ritmo, bajo books.shops — el asiento de su único (?) y de su go", () => {
    assert.equal(modeOf("tiendas"), "ritmo", "en Esencial el tema dormía tras un anuncio falso; su superficie es la tira de Ritmo");
    assert.equal(FEATURES["books.shops"], "ritmo");
  });
  it("la enseñanza de mostrar/ocultar NO se borra: se queda, verdadera en su piso", () => {
    const t = MANUAL_TOPICS.find((x) => x.id === "tiendas");
    assert.ok(t!.what[0]!.includes("mostrarla u ocultarla"),
      "la cláusula era verdad en Ritmo y mentira en Esencial: la cura mueve el tema, no amputa la enseñanza");
  });
});

/* ═══════════ §D · LA DEUDA DE REGISTRO: books.shop-catalog-gear ═════════
 * El engranaje del catálogo de tiendas pinta y trabaja en Ritmo —
 * dentro de la sección del libro gobernada por books.shops — haciendo
 * exactamente el negocio de Ritmo (administrar el catálogo), y el
 * registro lo declaraba de Completo sin un solo consumidor que lo
 * desmintiera en una cara. Higiene del registro: el asiento dice el
 * piso donde su superficie trabaja; ninguna cara cambia. */
describe("ola9 · §D: books.shop-catalog-gear declara el piso donde trabaja", () => {
  it("el asiento es de Ritmo, como la tira que pinta", () => {
    assert.equal(FEATURES["books.shop-catalog-gear"], "ritmo",
      "declarado en Completo, el registro mentía sobre una superficie de Ritmo que ninguna cerca cruzaba");
  });
});

/* ═══════════ §E · E9-1: LA FAMILIA SE DERIVA DE LAS BANDERAS ═══════════
 * La §F de la ola 8 censaba las familias por ORTOGRAFÍA: conocía los
 * sufijos {h, c, r} y nada más. Dos especímenes escenificados por
 * Enseñanza IX lo probaron con la suite entera verde: una variante
 * verdadera con sufijo -x (m19-balanza-x, con su bandera de modo) no
 * heredaba puente alguno, y una lección inocente con sufijo -r y SIN
 * bandera heredaba el tema «libros» por su sola ortografía. Hoy
 * ortografía y condición de variante coinciden exactamente en el guion
 * (271 escenas) — y esta cerca lo FIJA en los dos sentidos: la variante
 * es la que lleva bandera (mode / notMode / minMode), y el sufijo solo
 * vale si la bandera lo acompaña y sceneBase sabe desnudarlo. */
const sceneBase = (id: string) => id.replace(/-(h|c|r)$/, "");
const SCENE_TOPIC: Record<string, string> = Object.fromEntries(
  Object.entries(TOPIC_SCENES)
    .filter(([, t]) => t.moduleId !== "manual")
    .map(([topic, t]) => [t.sceneId, topic]),
);
const topicByBase: Record<string, string> = {};
for (const [sceneId, topic] of Object.entries(SCENE_TOPIC)) topicByBase[sceneBase(sceneId)] = topic;
const inherited = (id: string) => SCENE_TOPIC[id] ?? topicByBase[sceneBase(id)];
const flagged = (s: Scene) => s.mode !== undefined || s.notMode !== undefined || s.minMode !== undefined;

describe("ola9 · §E: la familia de escenas se deriva de las banderas, no de la ortografía", () => {
  it("ortografía ⇒ bandera: toda escena con sufijo de una letra es una variante declarada", () => {
    for (const mod of MODULES) for (const s of mod.scenes) {
      if (!/-[a-z]$/.test(s.id)) continue;
      assert.ok(flagged(s),
        `${mod.id}/${s.id}: termina en sufijo de variante pero no lleva bandera de modo — heredaría (o perdería) el puente por su sola ortografía (espécimen m3-fijos-r)`);
    }
  });
  it("bandera ⇒ sufijo conocido: toda variante usa una letra que sceneBase desnuda (h, c, r)", () => {
    for (const mod of MODULES) for (const s of mod.scenes) {
      if (!flagged(s)) continue;
      const m = /-([a-z])$/.exec(s.id);
      if (!m) continue;
      assert.ok(["h", "c", "r"].includes(m[1]!),
        `${mod.id}/${s.id}: variante con sufijo -${m[1]}, que sceneBase no desnuda — su familia no la ata y su puente no llega (espécimen m19-balanza-x)`);
    }
  });
  it("el puente es de la familia por banderas: dentro de una familia, toda variante hereda lo mismo", () => {
    /* OLA 10 (E10-1): la familia se agrupa por base GLOBAL, no por
     * módulo — topicByBase, el algoritmo, no conoce módulos, y medir con
     * un ámbito más estrecho que el suyo dejaba fuera de la foto a una
     * familia repartida entre dos módulos. Hoy ninguna base vive en dos
     * módulos y el agrupamiento coincide con el local; la herencia
     * cruzada en sí la acusa la §G de modos-ola10. */
    const gbase = (id: string) => id.replace(/-[a-z]$/, "");
    const fams = new Map<string, Scene[]>();
    for (const mod of MODULES) for (const s of mod.scenes) {
      const g = gbase(s.id);
      fams.set(g, [...(fams.get(g) ?? []), s]);
    }
    for (const [g, members] of fams) {
      if (members.length < 2) continue;
      const topics = new Set(members.filter(flagged).map((s) => inherited(s.id) ?? null));
      assert.ok(topics.size <= 1,
        `familia ${g}: las variantes heredan puentes distintos (${[...topics].join(", ")}) — una cara quedó fuera del puente de su familia`);
    }
  });
  it("toda variante con sufijo comparte su base con una hermana de su módulo (la §F, ahora por banderas)", () => {
    for (const mod of MODULES) {
      const scenes = mod.scenes;
      for (const s of scenes) {
        if (!flagged(s) || !/-(h|c|r)$/.test(s.id)) continue;
        const b = sceneBase(s.id);
        assert.ok(scenes.some((o) => o.id !== s.id && sceneBase(o.id) === b),
          `${mod.id}/${s.id}: su base ${b} no la comparte ninguna hermana — la variante quedó fuera de su familia`);
      }
    }
  });
});
