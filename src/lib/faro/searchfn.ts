/**
 * searchfn.ts — §21 (1.3.382): LA REFERENCIA y EL ÍNDICE DE FUNCIONES.
 *
 * La separación de identidades (fallo de Oscar, 2026-11-21 21:03): la
 * búsqueda ENCUENTRA lo que existe; el Asesor CALCULA lo que no existe
 * como objeto. Este módulo es el oficio propio de la búsqueda:
 *
 *  - questionShape reconoce la FORMA de pregunta (patrones ES/EN) para
 *    ofrecer la puerta al Asesor. No clasifica familias, no calcula
 *    nada, no importa al intérprete del Asesor (ask.ts / ask2.ts /
 *    questionbank.ts): la clasificación vive solo dentro de Preguntar
 *    (cerca 2 de la pieza). La detección es GENEROSA a propósito
 *    (L-B3): una puerta de más no daña; los resultados quedan intactos
 *    debajo, y un falso negativo es el comportamiento de siempre.
 *  - searchFunctions caza en el ÍNDICE derivado del registro real
 *    (askmap.FARO_FUNCTION_MAP): cada función con su nombre oficial,
 *    su línea de qué hace (does), su casa (área › pantalla), su piso
 *    (minMode) y sus sinónimos declarados (keys). Encontrar NO ejecuta
 *    (cerca 9): el resultado es una puerta a su casa, nada más.
 *  - Ninguna cifra del Asesor cruza a la búsqueda, jamás (L-B1): este
 *    módulo no recibe el libro; solo el texto, el idioma y el modo.
 */

import { FARO_FUNCTION_MAP, FUNCTION_TOPIC, type FunctionEntry } from "./askmap.ts";
import type { BookMode } from "./advisor.ts";
import type { Lang } from "./types.ts";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Aperturas interrogativas ES/EN: la forma, no el tema. */
const OPENERS = [
  "cuanto", "cuanta", "cuantos", "cuantas", "cuando", "donde", "como", "que", "cual", "cuales", "quien", "quienes",
  "puedo", "podria", "debo", "tengo", "hay", "es ", "son ", "vale", "cuesta", "alcanza", "conviene", "deberia",
  "how much", "how many", "how", "when", "where", "what", "which", "who", "can i", "could i", "should i", "do i",
  "does", "did", "is it", "is there", "are there", "will", "would",
];

/**
 * ¿Tiene este texto FORMA de pregunta? Verdadero si trae los signos
 * (¿ o ? en cualquier parte) o si, despojado de signos, EMPIEZA por
 * una apertura interrogativa ES/EN. Nada más se juzga: ni el tema ni
 * la familia ni si el Asesor podrá contestarla — la puerta promete la
 * habitación, nunca la respuesta (L-B2).
 */
export function questionShape(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 3) return false;
  if (/[¿?]/.test(raw)) return true;
  const f = fold(raw).replace(/^[^a-z0-9]+/, "");
  return OPENERS.some((o) => f === o.trim() || f.startsWith(o.endsWith(" ") ? o : `${o} `) || f.startsWith(`${o},`) || f.startsWith(`${o}:`));
}

/**
 * La referencia: la puerta con la pregunta del usuario, VERBATIM —
 * carácter a carácter como la escribió en la barra (cerca 5). La
 * puerta no lleva texto del banco ni cifra alguna: solo su pregunta.
 */
export function referenceFor(text: string): { question: string } | null {
  return questionShape(text) ? { question: text } : null;
}

/** ¿La consulta trae forma de VERBO (una acción: exportar, apartar,
 * imprimir…)? Manda el orden de los grupos: con verbo, Funciones va
 * primero; con sustantivo, Lugares (estudio §5b). Heurística de forma:
 * infinitivos ES (-ar/-er/-ir) o un verbo de acción declarado, o su
 * par EN. */
const ACTION_WORDS = new Set([
  "exportar", "importar", "imprimir", "apartar", "compartir", "escanear", "pegar", "escribir", "anotar", "agregar",
  "crear", "borrar", "eliminar", "cambiar", "convertir", "pagar", "cobrar", "buscar", "ver", "abrir", "cerrar",
  "export", "import", "print", "share", "scan", "paste", "write", "add", "create", "delete", "remove", "change",
  "convert", "pay", "open", "close", "set", "put",
]);

const NOT_VERBS = new Set(["ayer", "hogar", "lugar", "mujer", "taller"]);

export function looksVerbal(text: string): boolean {
  const words = fold(text).split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => ACTION_WORDS.has(w) || (/(ar|er|ir)$/.test(w) && w.length > 4 && !NOT_VERBS.has(w)));
}

export type FunctionHit = {
  id: string;
  name: string;
  /** Qué hace, en una línea (del registro: does). */
  does: string;
  /** Su casa: «Área › Pantalla». */
  path: string;
  /** Su piso, si vive sobre el modo de quien busca: se NOMBRA, sin
   * contenido (como las puertas de El Puente). */
  floor?: BookMode;
  /** El tema del Manual cuya puerta aterriza en su casa, si lo hay. */
  topic?: string;
};

const entryWords = (e: FunctionEntry, lang: Lang): string[] => {
  const bag = new Set<string>();
  const add = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1).forEach((w) => bag.add(w));
  add(e.name[lang]); add(e.name[lang === "es" ? "en" : "es"]);
  add(e.does[lang]); add(e.area); add(e.screen[lang]);
  for (const k of e.keys) add(k);
  return [...bag];
};

/**
 * Las funciones que la consulta nombra: por sus sinónimos declarados
 * (keys), por las palabras de su nombre o de su línea. El nombre manda
 * sobre la línea: coincidir con el nombre oficial pesa el doble.
 */
export function searchFunctions(query: string, lang: Lang, mode: BookMode): FunctionHit[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const fq = fold(q);
  const words = fq.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const scored: { e: FunctionEntry; score: number }[] = [];
  for (const e of FARO_FUNCTION_MAP) {
    let score = 0;
    const nameF = fold(e.name[lang]);
    // Frase declarada completa (un key o el nombre entero dentro de la consulta).
    if (e.keys.some((k) => fq.includes(fold(k))) || fq.includes(nameF)) score += 4;
    const nameWords = new Set(fold(e.name[lang]).split(/[^a-z0-9]+/).filter((w) => w.length > 1));
    const bag = new Set(entryWords(e, lang));
    for (const w of words) {
      if (nameWords.has(w)) score += 2;
      else if (bag.has(w)) score += 1;
    }
    if (score >= 2) scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map(({ e }) => ({
    id: e.id,
    name: e.name[lang],
    does: e.does[lang],
    path: `${e.area} › ${e.screen[lang]}`,
    floor: e.minMode && modeRank(mode) < modeRank(e.minMode) ? e.minMode : undefined,
    topic: FUNCTION_TOPIC[e.id],
  }));
}

const modeRank = (m: BookMode): number => (m === "esencial" ? 0 : m === "ritmo" ? 1 : 2);
