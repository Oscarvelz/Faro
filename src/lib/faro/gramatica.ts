/* LA GRAMÁTICA DEL ESPACIO DE PREGUNTAS (el instrumento, paso 2).
 *
 * Escrita desde el CENSO DE FORMAS — intención × objeto × tiempo ×
 * voz — y NO desde el código del motor. La advertencia es parte del
 * instrumento: una gramática derivada de ask2.ts solo podría parir
 * las preguntas que el motor ya entiende, y la medición se volvería
 * circular (la investigación de generalización, 2026-11-23). Las
 * operaciones salen de los ejes que el banco declara por familia;
 * las entidades, de los objetos que un libro de verdad trae; los
 * tiempos, del inventario de formas temporales que un usuario usa
 * al hablar de su dinero.
 *
 * Cada caso generado nace con su INTERPRETACIÓN ESPERADA escrita:
 * la familia que debe responder. Eso disuelve el problema del
 * oráculo en la capa de interpretación — no hay que adivinar qué
 * debió pasar; la gramática lo declara antes de correr.
 *
 * El generador es exhaustivo y determinista: el producto cruzado
 * completo de sus ranuras, sin azar. Lo que el motor hace con cada
 * caso — responder su familia, responder OTRA (el vecino), o
 * callar — es el dato que el instrumento mide. */

export type GenCase = {
  q: string;
  lang: "es" | "en";
  operacion: string;
  familia: string; // la familia esperada
  entidad: string;
  tiempo: string;
};

/* Las entidades: objetos del libro con dos voces. El español nombra
 * conceptos del libro; el inglés pasa por los nombres de la
 * estructura y el puente de sinónimos — como le pasa al usuario. */
const ENT_ES = ["renta", "súper", "gasolina", "internet", "comida"] as const;
const ENT_EN = ["rent", "internet", "groceries"] as const;
const ENT_PAGABLE_ES = ["renta", "internet", "gasolina"] as const;
const ENT_PAGABLE_EN = ["rent", "internet"] as const;

/* Los tiempos: la ranura que el diagnóstico encontró hambrienta. */
const TIME_ES: Record<string, string> = {
  "este-mes": "este mes",
  "mes-pasado": "el mes pasado",
  "mes-nombrado": "en septiembre",
  "este-ano": "este año",
  "semana-pasada": "la semana pasada",
  "sin-tiempo": "",
};
const TIME_EN: Record<string, string> = {
  "este-mes": "this month",
  "mes-pasado": "last month",
  "mes-nombrado": "in September",
  "este-ano": "this year",
  "semana-pasada": "last week",
  "sin-tiempo": "",
};
const TIMES = Object.keys(TIME_ES);

function withTime(base: string, t: string): string {
  return t ? `${base} ${t}` : base;
}

export function generateCases(): GenCase[] {
  const out: GenCase[] = [];
  const push = (q: string, lang: "es" | "en", operacion: string, familia: string, entidad: string, tiempo: string) =>
    out.push({ q, lang, operacion, familia, entidad, tiempo });

  /* 1 · LA SUMA DE UN PERÍODO (historia): operación × entidad × tiempo × voz */
  for (const e of ENT_ES) for (const t of TIMES)
    push(`¿Cuánto gasté en ${e}${TIME_ES[t] ? " " + TIME_ES[t] : ""}?`, "es", "suma", "historia", e, t);
  for (const e of ENT_EN) for (const t of TIMES)
    push(withTime(`How much did I spend on ${e}`, TIME_EN[t]) + "?", "en", "suma", "historia", e, t);

  /* 2 · EL PROMEDIO MENSUAL (promedio): la ranura de tiempo es «al mes» misma */
  for (const e of ENT_ES) push(`¿Cuánto gasto en ${e} al mes?`, "es", "promedio", "promedio", e, "al-mes");
  for (const e of ENT_EN) push(`How much do I spend on ${e} per month?`, "en", "promedio", "promedio", e, "al-mes");

  /* 3 · LA RECENCIA (recencia): cuándo fue la última vez */
  for (const e of ENT_PAGABLE_ES) push(`¿Cuándo fue la última vez que pagué ${e}?`, "es", "recencia", "recencia", e, "sin-tiempo");
  for (const e of ENT_PAGABLE_EN) push(`When was the last time I paid ${e}?`, "en", "recencia", "recencia", e, "sin-tiempo");

  /* 4 · EL EXTREMO (extremos): el gasto más grande de un tramo */
  for (const t of ["este-mes", "mes-pasado", "este-ano", "sin-tiempo"])
    push(withTime("¿Cuál fue mi gasto más grande", TIME_ES[t]) + "?", "es", "extremo", "extremos", "global", t);
  for (const t of ["este-mes", "mes-pasado", "este-ano", "sin-tiempo"])
    push(withTime("What was my biggest expense", TIME_EN[t]) + "?", "en", "extremo", "extremos", "global", t);

  /* 5 · EL CONTEO DE EVENTOS (frecuencia): cuántas veces pasó algo
   * en un tramo. ACTA (la Caza III, Ola 50): la primera corrida lo
   * esperaba en «conteo» y el banco tenía razón — el nombre de la
   * familia frecuencia en el censo es «cuántas veces y cada
   * cuánto», y conteo cuenta CIUDADANOS (cuotas, tarjetas,
   * personas), no eventos. La gramática se corrigió contra el
   * censo; los defectos reales que quedaron de la clase fueron la
   * precedencia del inglés y la concordancia, curados en la Ola 50. */
  for (const e of ENT_PAGABLE_ES) for (const t of ["este-mes", "mes-pasado", "este-ano", "sin-tiempo"])
    push(`¿Cuántas veces pagué ${e}${TIME_ES[t] ? " " + TIME_ES[t] : ""}?`, "es", "conteo-eventos", "frecuencia", e, t);
  for (const e of ENT_PAGABLE_EN) for (const t of ["este-mes", "mes-pasado", "este-ano", "sin-tiempo"])
    push(withTime(`How many times did I pay ${e}`, TIME_EN[t]) + "?", "en", "conteo-eventos", "frecuencia", e, t);

  /* 6 · LA COMPARACIÓN ENTRE DOS (comparar) */
  const PARES_ES: Array<[string, string]> = [["renta", "súper"], ["súper", "gasolina"], ["internet", "gasolina"]];
  const PARES_EN: Array<[string, string]> = [["rent", "groceries"], ["groceries", "internet"]];
  for (const [a, b] of PARES_ES) push(`¿Gasté más en ${a} o en ${b}?`, "es", "comparacion", "comparar", `${a}|${b}`, "sin-tiempo");
  for (const [a, b] of PARES_EN) push(`Did I spend more on ${a} or ${b}?`, "en", "comparacion", "comparar", `${a}|${b}`, "sin-tiempo");

  /* 7 · EL ESTADO DE UN PAGO (ya-pague): ¿ya lo pagué? */
  for (const e of ["internet", "renta"]) push(`¿Ya pagué ${e}?`, "es", "estado", "ya-pague", e, "sin-tiempo");
  for (const e of ["internet", "rent"]) push(`Did I already pay ${e}?`, "en", "estado", "ya-pague", e, "sin-tiempo");

  /* 8 · LA VERIFICACIÓN (promedio): ¿me alcanza para gastar un monto
   * suelto, hoy? Su casa en el banco es la verificación de la Ola 25
   * (familia promedio) — la primera corrida del generador lo midió:
   * la gramática esperaba factibilidad y el MOTOR tenía razón. La
   * gramática se corrigió, no el motor: queda asentado en el acta.
   * ACTA DE UNIFICACIÓN (la Caza III, Ola 53): la primera corrida
   * registraba el inglés en factibilidad PORQUE ASÍ RESPONDÍA el
   * motor — el mismo significado cambiaba de casa según el idioma.
   * La caza decidió la casa única: la forma desnuda es de la
   * verificación en los dos idiomas, y la capacidad cedió la forma
   * en su puerta. La gramática ahora espera promedio en los dos. */
  for (const m of [100, 500]) push(`¿Me alcanza para gastar $${m}?`, "es", "verificacion", "promedio", "global", "sin-tiempo");
  for (const m of [100, 500]) push(`Can I afford to spend $${m}?`, "en", "verificacion", "promedio", "global", "sin-tiempo");

  /* 9 · LA CAPACIDAD COMPUESTA (factibilidad): dos gastos traídos,
   * el veredicto sobre el mes entero — la pregunta del centro. */
  for (const [a, b] of [[500, 1200], [200, 800]] as Array<[number, number]>)
    push(`Si gasto $${a} en un boleto y $${b} en una casa, ¿podría asumir el gasto?`, "es", "capacidad", "factibilidad", "global", "sin-tiempo");
  for (const [a, b] of [[500, 1200], [200, 800]] as Array<[number, number]>)
    push(`If I spend $${a} on a ticket and $${b} on a house, could I afford it?`, "en", "capacidad", "factibilidad", "global", "sin-tiempo");

  return out;
}
