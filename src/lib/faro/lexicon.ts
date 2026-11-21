/**
 * lexicon.ts — el mapa de lenguaje del Asesor (Captura Inteligente, mapa
 * §8.4; Ola 5a, 1.3.345). DATO, no código duro: las familias de sinónimos
 * viven aquí como tablas para que añadir una palabra no toque el motor.
 *
 * El usuario pregunta como habla; el motor escucha en su registro y
 * responde en el registro del usuario — sin corregirlo y sin sonar a
 * banco. Tres registros que significan lo mismo para el motor: el
 * COLOQUIAL («¿cuánto me sobra?», «¿me alcanza?»), el LLANO («¿cuánto me
 * queda?», «ahorrar») y el TÉCNICO («saldo disponible», «liquidez»).
 * Español e inglés son UNA sola familia por intención.
 *
 * Las intenciones de 5a: spend (¿puedo gastar X en Y?), free (¿cuánto
 * puedo sacar sin tocar lo apartado?), left (¿cuánto me queda — para el
 * mes o para el año?) y how (¿cómo voy?). Las familias de escenarios
 * (encadenado, pagar hoy o no, ahorro que sigue) nacen en el léxico con
 * sus palabras y reciben su motor en 5b — aquí todavía son silencio
 * honesto: parseQuestion devuelve null y la caja responde «eso todavía
 * no lo sé responder» con los chips de lo que sí sabe.
 *
 * Cero fabricación, por construcción: este módulo solo CLASIFICA la
 * pregunta y extrae sus datos (monto, moneda, concepto) con el lector de
 * frases de la casa (textparse). Ninguna cifra nace aquí: las respuestas
 * las calcula ask.ts desde la Lectura del Asesor.
 *
 * El orden de las familias es ley: free va ANTES que spend porque su
 * frase lleva la trampa («¿cuánto puedo gastar SIN TOCAR mis ahorros?»
 * es free, no spend), y left va antes que spend porque «¿cuánto me
 * queda para gastar?» pregunta la queda, no un gasto concreto.
 */
import { parsePhrase, type ParseCtx } from "./textparse.ts";
import type { Currency } from "./types.ts";

export type AskIntent = "spend" | "free" | "left" | "how" | "reach";
export type Register = "coloquial" | "llano" | "tecnico";

export type ParsedQuestion = {
  intent: AskIntent;
  register: Register;
  /** El monto preguntado, en su moneda (null = la pregunta no lo trae). */
  amountMinor: number | null;
  currency: Currency | null;
  /** El concepto del gasto, tal como lo dijo el usuario ("" si no hay). */
  concept: string;
  /** Solo para left: true cuando la pregunta es por el año. */
  year: boolean;
  /** Solo para reach: el día del mes preguntado (null = fin de mes). */
  day: number | null;
  /** Solo para reach: true cuando pregunta por su día más apretado. */
  tightest: boolean;
};

const FOLD_MAP: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
};
export function foldQ(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[áéíóúüñ]/g, (c) => FOLD_MAP[c] ?? c);
}

/** Las familias de disparo, por intención, en texto plegado. Una familia
 * es una lista de patrones; basta UNO para clasificar. El orden del
 * array ES el orden de juicio (free → left → spend → how). */
export const INTENT_FAMILIES: { intent: AskIntent; patterns: RegExp[] }[] = [
  {
    intent: "free",
    patterns: [
      /sin (tocar|afectar|mover|usar).{0,24}(ahorro|apartad|guardad)/,
      /sin (tocar|afectar|mover) (mi|mis|lo|el|los|la)/,
      /cuanto puedo (sacar|retirar|gastar sin)/,
      /cuanto (tengo|hay|queda) libre/,
      /cuanto me sobra/,
      /dinero libre/,
      /libre para (gastar|sacar)/,
      /que puedo sacar/,
      /how much can i (take out|withdraw|pull out)/,
      /how much (do i have|is) free/,
      /without touching (my |the )?(savings|set[- ]aside)/,
      /what('s| is) left over/,
      /spare cash/,
    ],
  },
  {
    // El saldo proyectado (§19.1, 1.3.365): llegar a un día con lo ya
    // comprometido. Va ANTES que left y que spend: «¿llego al día 20?»
    // no pregunta la queda del mes ni un gasto — pregunta el camino.
    intent: "reach",
    patterns: [
      /llego al dia \d{1,2}/,
      /llegare al dia \d{1,2}/,
      /llego a fin de mes/,
      /como llego/,
      /dia mas apretado/,
      /cual es mi dia/,
      /el dia que mas aprieta/,
      /will i make it to (day \d{1,2}|the end)/,
      /do i make it to (day \d{1,2}|the end)/,
      /make it to day \d{1,2}/,
      /tightest day/,
      /how do i get to the end of the month/,
    ],
  },
  {
    intent: "left",
    patterns: [
      /cuanto me queda/,
      /cuanto queda/,
      /cuanto (tengo|hay) para (el|este|fin de) (mes|ano)/,
      /cuanto me (queda|falta) para (el|este) (mes|ano)/,
      /para fin de (mes|ano)/,
      /how much (do i have|is) left/,
      /how much (do i have )?left/,
      /left (for|until) (the|this) (month|year)/,
      /until the end of the (month|year)/,
    ],
  },
  {
    intent: "spend",
    patterns: [
      /puedo (gastar|comprar|pagar|darme|permitirme)/,
      /me alcanza/,
      /me da para/,
      /puedo (con|gastarme)/,
      /can i (spend|buy|afford|pay|get)/,
      /\bafford\b/,
      /should i buy/,
    ],
  },
  {
    intent: "how",
    patterns: [
      /como voy/,
      /como va (el|mi|este) mes/,
      /como estoy/,
      /como anda (el|mi) mes/,
      /que tal (voy|el mes|mi mes)/,
      /how am i( doing)?/,
      /how('s| is) (the|my) month/,
      /how are (my|the) finances/,
    ],
  },
];

/** Marcas de registro: palabras que delatan cómo habla el usuario. El
 * técnico se reconoce por su jerga; el coloquial, por la suya; todo lo
 * demás es llano. */
const TECHNICAL_MARKS = [
  "saldo disponible", "flujo", "liquidez", "proyeccion", "presupuesto mensual",
  "available balance", "cash flow", "liquidity", "projection", "monthly budget",
];
const COLLOQUIAL_MARKS = [
  "me sobra", "sobra", "alcanza", "feria", "lana", "plata", "billete", "cuanto hay pa",
  "bucks", "cash", "spare", "left over",
];

export function registerOf(folded: string): Register {
  if (TECHNICAL_MARKS.some((m) => folded.includes(m))) return "tecnico";
  if (COLLOQUIAL_MARKS.some((m) => folded.includes(m))) return "coloquial";
  return "llano";
}

/**
 * Clasifica la pregunta y extrae sus datos. null = ninguna familia la
 * reconoce (silencio honesto: la caja lo dice y ofrece los chips).
 * El monto y el concepto salen del lector de frases de la casa sobre la
 * MISMA pregunta: «¿puedo gastar 200 en zapatos?» lee 200 y «zapatos».
 */
export function parseQuestion(raw: string, ctx: ParseCtx): ParsedQuestion | null {
  const folded = foldQ(raw);
  let intent: AskIntent | null = null;
  for (const fam of INTENT_FAMILIES) {
    if (fam.patterns.some((p) => p.test(folded))) { intent = fam.intent; break; }
  }
  if (!intent) return null;
  let amountMinor: number | null = null;
  let currency: Currency | null = null;
  let concept = "";
  if (intent === "spend") {
    const drafts = parsePhrase(raw, ctx);
    const d = drafts[0];
    if (d) {
      amountMinor = d.amountMinor;
      currency = d.currency;
      concept = d.concept;
    }
  }
  const dayMatch = intent === "reach" ? folded.match(/(?:dia|day) (\d{1,2})/) : null;
  return {
    intent,
    register: registerOf(folded),
    amountMinor,
    currency,
    concept,
    year: intent === "left" && /\bano\b|\byear\b/.test(folded),
    day: dayMatch ? Math.min(31, Math.max(1, Number(dayMatch[1]))) : null,
    tightest: intent === "reach" && /apretado|aprieta|tightest/.test(folded),
  };
}

/** Los chips de la caja: las preguntas que el Asesor SÍ sabe, empezando
 * por las de Oscar (mapa F8). Enseñan la función sin manual. */
export function askChips(lang: "es" | "en"): string[] {
  return lang === "en"
    ? ["Can I spend $100 on shoes?", "How much can I take out without touching my savings?", "How much do I have left for the month?", "How am I doing?"]
    : ["¿Puedo gastar $100 en zapatos?", "¿Cuánto puedo sacar sin tocar mis ahorros?", "¿Cuánto me queda para el mes?", "¿Cómo voy?"];
}
