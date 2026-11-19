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
function resolveChains(text: string): Map<string, string> {
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
function gateWindows(text: string): { fn: string; win: string }[] {
  const out: { fn: string; win: string }[] = [];
  for (const m of text.matchAll(new RegExp(`(^|[^\\w$.])(${gateAlt(text)})\\(`, "g"))) {
    const at = m.index! + m[0].length;
    out.push({ fn: m[2]!, win: text.slice(at, at + 160) });
  }
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
function tableBodies(text: string): string[] {
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
function unresolvedGates(text: string): string[] {
  const chains = resolveChains(text); // OLA 12: la resolución sigue la cadena entera
  const out: string[] = [];
  for (const m of text.matchAll(new RegExp(`(^|[^\\w$.])(${gateAlt(text)})\\(`, "g"))) {
    const before = text.slice(Math.max(0, m.index! - 12), m.index!);
    if (/function\s*$/.test(before)) continue; // la declaración, no una llamada
    const win = text.slice(m.index! + m[0].length, m.index! + m[0].length + 160);
    if (multiArg(win)) continue; // un `has` local de varios argumentos no es la puerta
    const arg = win.replace(/^\s+/, "");
    if (/^["'`][\w.-]*["'`]/.test(arg)) continue; // (a) literal (plantilla estática incluida)
    const concat = /^\(?\s*("[^"]*"|'[^']*'|[A-Za-z_$][\w$]*)\s*\+\s*("[^"]*"|'[^']*'|[A-Za-z_$][\w$]*)/.exec(arg);
    if (concat) {
      // (e) la concatenación solo exime si sus DOS mitades resuelven —
      // la media concatenación (12E) viste el traje y ACUSA.
      const side = (x: string) => /^["']/.test(x) || chains.has(x);
      if (side(concat[1]!) && side(concat[2]!)) continue;
    }
    if (/^[A-Za-z_$][\w$]*\s*\[/.test(arg)) continue; // (c) tabla indexada
    /* OLA 13 (mut13-a T1): el acceso por PUNTO a un objeto de literales es
     * la misma doctrina que el corchete — has(SEATS.add) no acusa: su
     * asiento se lee en la declaración del objeto (consumedIn (g)). */
    if (/^[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\s*\)/.test(arg)) continue;
    /* OLA 13 (mut13-a T4): la plantilla cuyos huecos TODOS resuelven por
     * cadena no acusa — la que lleva un hueco irresoluble SÍ acusa, y su
     * prefijo estático explica al asiento (explainedByAccusedGate). */
    if (/^`/.test(arg)) {
      const holes = [...arg.matchAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g)].map((h) => h[1]!);
      if (holes.length && holes.every((h) => chains.has(h))) continue;
    }
    if (/^[A-Za-z_$][\w$]*\s+as\s/.test(arg)) continue; // flujo FeatureId (has(f as F))
    if (/^featureForGo\(/.test(arg)) continue; // el puente tema→asiento
    if (/^[A-Za-z_$][\w$]*\s*:/.test(arg)) continue; // firma de una declaración
    const idm = /^([A-Za-z_$][\w$]*)\s*\)/.exec(arg);
    if (idm && chains.has(idm[1]!)) continue; // (d) constante resuelta por cadena
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
  const accused = new Set(unresolvedGates(text));
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
      assert.ok(consumed(seat) || seat in EXENTOS || explainedByAccusedGate(CORPUS, seat),
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
 * espécimen, queda clavado como consumido. */
const FAMILIAS_REGISTRO: Record<string, string> = {
  accounts: "sus formas se eligen por la puerta negativa de la hermana (accounts.opening gobierna la forma de apertura); la familia declara el resto de sus piezas",
  advisor: "las lecturas del Asesor: cada lectura declara su piso en la tabla; las caras se componen en advisor2/screens y se gobiernan por los asientos de la superficie que las pinta",
  alerts: "los vencimientos: aviso nacido por composición de la cáscara; el asiento declara el piso del aviso",
  archive: "el Archivo: sus verbos finos llevan puerta (archive.hide-selection, archive.restore-span); la familia declara los pisos de sus vistas",
  area: "las áreas del Estudio: superficies nacidas por composición (area-advice), gobernadas por los asientos de la cara que las presenta",
  awake: "la foto al despertar: composición de Central; sus asientos declaran el piso de cada pieza que la compone",
  books: "los libros: superficies por composición (BookSection y el kit); sus verbos finos llevan puerta — books.multiselect entre ellos, consumido desde la cura 13",
  cards: "la ficha se gobierna campo a campo (cards.add-full y los asientos de captura); la familia declara los pisos de las piezas de tarjeta sin puerta propia",
  central: "Central, la pantalla de arranque: se compone entera; sus piezas declaran su piso para el conteo de desbloqueos y los temas",
  cobros: "el libro de Cobros ES su línea de tiempo: composición del libro, no un widget con puerta; sus lentes llevan sus asientos",
  debt: "el lado Debo: sus caras se componen en debts.tsx y sus verbos finos llevan puerta propia",
  desk: "el escritorio: su pieza declarada se compone con Central y declara su piso en la tabla",
  editor: "el editor de líneas: sus manos finas llevan puerta (editor.picker-manage, editor.picker-rename, editor.icon-color); la familia declara el resto de sus piezas",
  hist: "el Historial y el río: superficies por composición, gobernadas por los asientos de sus gestos y vistas (el Susurro entre ellos)",
  import: "la importación nace por composición (bank-import); la familia declara los pisos de sus piezas",
  ins: "los instrumentos: composición en instruments.tsx; sus verbos finos llevan puerta",
  lent: "el lado Me deben: sus caras se componen en debts.tsx y sus verbos finos llevan puerta propia",
  loans: "los préstamos: sus caras se componen en loans.tsx y sus verbos finos (pagar, archivar) llevan puerta propia",
  manual: "el Manual: sus temas se cruzan por la §10 y por TOPIC_SCENES; la familia declara los pisos de sus superficies",
  mode: "el propio sistema de modos: el diálogo y el Susurro se gobiernan en mode.ts y screens; la familia declara sus piezas",
  nature: "la naturaleza de las líneas: clasificación por composición (la casa de nature); sus declaraciones y guardas llevan asiento fino donde se cruzan",
  nav: "la cáscara (shell.tsx): navegación nacida por composición; sus verbos finos llevan puerta y la familia declara los pisos de cada pieza",
  pano: "el Panorama: tarjetas por composición sobre monthTotals; la familia declara los pisos de sus piezas",
  patron: "el Patrón: el motor lee sus propias reglas; la familia declara los pisos de sus avisos",
  people: "Personas: la superficie se compone en people.tsx; sus verbos finos llevan puerta",
  pres: "la Presentación: el guion y el teatro se componen desde guion.ts y presentacion.tsx; la familia declara los pisos de sus piezas",
  remit: "Remesas: composición sobre remesas.ts; sus verbos finos llevan puerta",
  rule: "las reglas del Asesor: el motor las evalúa enteras (rules.ts); la familia declara el piso de cada aviso",
  sample: "la casa de muestra nace por composición (sample.ts); sus asientos declaran sus pisos",
  scan: "las hojas de escaneo nacen por composición; sus filas llevan asientos finos (scan.card-capture y hermanas)",
  settings: "Ajustes: la pantalla se compone por territorios; sus interruptores finos llevan puerta o viven en todo piso por adjudicación escrita",
  study: "el Estudio: composición sobre studyBoard; sus caras declaran su piso y las finas llevan asiento propio donde se cruzan",
  subs: "Cuotas: el libro existe por composición del hub (su parada gatea books.subs); la familia declara los pisos de sus cadencias y piezas",
  tools: "las herramientas: composición en instruments.tsx; sus verbos finos llevan puerta (tools.rate-refresh y hermanas)",
  vault: "la bóveda: composición de sus tarjetas; sus verbos finos llevan asiento donde se cruzan (vault.retiro entre ellos)",
  widget: "el widget: su foto se compone en widget.ts sobre monthTotals; la familia declara los pisos de sus piezas",
};
describe("ola9 · §A-quater: el censo desde el REGISTRO — ningún gobernador sin mecanismo (OLA 13)", () => {
  const topicsText = SRC("../manual/topics.ts");
  const prefixOf = (seat: string) => seat.split(".")[0]!;
  const satisfied = (seat: string): boolean =>
    MAP_SEATS.has(seat) || seat in EXENTOS || topicsText.includes(`"${seat}"`) || prefixOf(seat) in FAMILIAS_REGISTRO || consumed(seat);
  it("todo asiento del registro lo conoce algún mecanismo: consumidor, mapa, exención, tema o familia declarada", () => {
    const seats = Object.keys(FEATURES);
    assert.ok(seats.length >= 490, `el censo enumera desde el registro de verdad (${seats.length} asientos)`);
    for (const seat of seats) {
      assert.ok(satisfied(seat),
        `${seat}: asiento del REGISTRO sin ningún mecanismo — ni consumidor, ni mapa §10, ni exención, ni tema, ni familia declarada: un gobernador invisible (así nació CARA-1)`);
    }
  });
  it("el espécimen de la clase queda clavado: books.multiselect tiene consumidor desde la cura 13", () => {
    assert.ok(consumed("books.multiselect"), "el kit de los libros consulta has(\"books.multiselect\"): el asiento invisible de la ola 13 ya no lo es");
  });
  it("espécimen: un asiento de una familia que no existe ACUSA por su nombre", () => {
    assert.equal(satisfied("fantasma13.multiselect"), false,
      "ni consumidor, ni mapa, ni familia: la cerca lo nombra y lo acusa — la clase de CARA-1 no vuelve en silencio");
  });
  it("la higiene de las familias: cada familia declarada cubre al menos un asiento que ningún otro mecanismo conoce", () => {
    const seats = Object.keys(FEATURES);
    for (const [prefix, mechanism] of Object.entries(FAMILIAS_REGISTRO)) {
      assert.ok(mechanism.length > 10, `${prefix}: la familia lleva su mecanismo escrito`);
      const mine = seats.filter((s) => prefixOf(s) === prefix);
      assert.ok(mine.length > 0, `${prefix}: familia sin asientos en el registro — declaración podrida`);
      assert.ok(mine.some((s) => !(MAP_SEATS.has(s) || s in EXENTOS || topicsText.includes(`"${s}"`) || consumed(s))),
        `${prefix}: todos sus asientos ya los conoce otro mecanismo — la familia sobra y debe morir`);
    }
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
