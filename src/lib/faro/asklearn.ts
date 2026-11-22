/**
 * asklearn.ts — EL APRENDIZAJE DEL ASESOR (ola 11, dirección de Oscar
 * 2026-11-21): Faro se adecúa al usuario, así que el Asesor aprende
 * CÓMO PREGUNTA su usuario — sus palabras para las cosas («la luz»,
 * «mami», «el banco») — y las reconoce la próxima vez.
 *
 * LA LEY QUE LO GOBIERNA (la condición de Oscar): se guardan patrones
 * REALES, jamás adivinanzas. Por eso este módulo solo aprende de
 * eventos CONFIRMADOS por el usuario:
 *   · el toque en una tarjetita de desambiguación (la vuelta de la
 *     pregunta de la Ola 6: el usuario eligió qué quiso decir);
 *   · una corrección explícita («no, la luz es los servicios»).
 * Una pregunta sin respuesta NO enseña nada: aprender de ella sería
 * adivinar, y adivinar es lo que este motor no hace.
 *
 * Y la segunda cerca, también de Oscar: LOS DÍGITOS JAMÁS SE APRENDEN.
 * El patrón guarda la FORMA (palabra → ciudadano del mapa/estructura),
 * nunca montos, fechas ni cifras: antes de guardar, la pregunta se
 * enmascara (maskShape) y lo que se persiste no contiene un solo dígito.
 * Un patrón aprendido mapea una palabra a un id — la cifra siempre sale
 * del libro, en el momento de responder, por el motor de siempre.
 *
 * Los patrones viven con el libro (viajan con él, como las preguntas
 * predeterminadas), son del usuario y solo de él, se ven y se borran
 * en su fold de Ajustes (administrar = Ritmo), y una corrección nueva
 * reemplaza a la vieja: la última palabra del usuario manda.
 */

export type LearnedKind = "sub" | "cat" | "person" | "account";

export type LearnedAlias = {
  /** La palabra o frase del usuario, plegada (minúsculas, sin acentos). */
  word: string;
  /** El ciudadano al que la palabra apunta: un id de la estructura. */
  targetId: string;
  kind: LearnedKind;
  /** Cuántas veces el usuario ha confirmado este patrón. */
  hits: number;
  /** De qué confirmación nació: el toque en la tarjeta o la corrección. */
  learnedFrom: "card-tap" | "correction";
  /** OLA 17: cuántas veces el patrón ha DISPARADO de verdad en una
   * pregunta (el alias resolvió y la respuesta salió por él). Es la
   * frecuencia que alimenta la propuesta de predeterminada — contar
   * usos no es aprender: ningún patrón nace de un uso, solo de una
   * confirmación; el uso solo mide qué tan viva está una forma ya
   * confirmada. Los registros viejos no lo traen: se lee como 0. */
  uses?: number;
};

/** La forma de una pregunta, sin un solo dígito: cada corrida de
 * dígitos (con sus separadores y su símbolo de moneda) se vuelve «#».
 * Es la única representación de la pregunta que el aprendizaje toca. */
export function maskShape(raw: string): string {
  return raw
    .replace(/[$€]\s*/g, " ")
    .replace(/\d[\d.,]*/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** ¿Contiene la forma algún dígito? La cerca que lo impide todo: un
 * patrón con dígitos no se guarda, punto. */
function hasDigits(s: string): boolean {
  return /\d/.test(s);
}

/**
 * Aprender de una desambiguación confirmada: el usuario preguntó con
 * su palabra y tocó la tarjeta del ciudadano que quiso decir. `word`
 * es la palabra suya (ya extraída por la caja de la pregunta
 * enmascarada); `targetId`, el ciudadano tocado. Devuelve el almacén
 * nuevo (puro: no muta el recibido). Si la palabra ya apuntaba a otro
 * ciudadano, la corrección manda: se reemplaza y el conteo renace —
 * la última palabra del usuario es la ley.
 */
export function learnAlias(
  store: LearnedAlias[],
  word: string,
  targetId: string,
  kind: LearnedKind,
  learnedFrom: LearnedAlias["learnedFrom"],
): LearnedAlias[] {
  // La cerca mira la palabra CRUDA: si trae dígitos, es un dato, no
  // una forma — se rechaza antes de enmascarar (enmascarar primero
  // escondería el dígito y la cerca no lo vería: cazado por el banco).
  if (hasDigits(word)) return store;
  const w = maskShape(word);
  if (!w || w.length < 2) return store;
  const existing = store.find((a) => a.word === w);
  if (existing && existing.targetId === targetId) {
    return store.map((a) => (a.word === w ? { ...a, hits: a.hits + 1 } : a));
  }
  const fresh: LearnedAlias = { word: w, targetId, kind, hits: 1, learnedFrom };
  return [...store.filter((a) => a.word !== w), fresh];
}

/** Olvidar un patrón (el usuario lo borra en su fold): el almacén sin él. */
export function forgetAlias(store: LearnedAlias[], word: string): LearnedAlias[] {
  const w = maskShape(word);
  return store.filter((a) => a.word !== w);
}

/** OLA 17: registrar un USO — el patrón disparó en una pregunta real y
 * la respuesta salió por él. Puro, como todo el módulo: devuelve el
 * almacén nuevo y la caja lo persiste con el libro. Contar usos jamás
 * crea un patrón: solo mide la vida de uno ya confirmado. */
export function touchAlias(store: LearnedAlias[], word: string): LearnedAlias[] {
  const w = maskShape(word);
  return store.map((a) => (a.word === w ? { ...a, uses: (a.uses ?? 0) + 1 } : a));
}

/** OLA 17: los patrones VIVOS — los que el usuario usa una y otra vez
 * (usos ≥ el umbral). Son los candidatos a pregunta predeterminada: la
 * frecuencia propone; el usuario dispone al aceptarla en la caja. */
export function frequentAliases(store: LearnedAlias[], min = 3): LearnedAlias[] {
  return store.filter((a) => (a.uses ?? 0) >= min);
}

/** OLA 17: la lista LEGIBLE de lo aprendido — una línea por patrón,
 * «la luz» → el nombre del ciudadano. Es DATO para el fold de Ajustes
 * y para la propia respuesta del Asesor («¿qué has aprendido?»): el
 * nombre lo resuelve quien llama (el motor conoce su nomenclatura);
 * este módulo no importa nombres de nadie. */
export function describeLearned(
  store: LearnedAlias[],
  resolve: (targetId: string, kind: LearnedKind) => string,
): Array<{ word: string; name: string; kind: LearnedKind; hits: number; uses: number }> {
  return store.map((a) => ({ word: a.word, name: resolve(a.targetId, a.kind), kind: a.kind, hits: a.hits, uses: a.uses ?? 0 }));
}

/**
 * El alias que una pregunta invoca: la palabra aprendida que aparece
 * como palabra entera en la pregunta plegada. Si dos alias casan, gana
 * el más largo (la frase más específica), como en el filtro de historia.
 */
export function aliasIn(store: LearnedAlias[], folded: string): LearnedAlias | null {
  let best: LearnedAlias | null = null;
  for (const a of store) {
    const whole = new RegExp(`(^|[^a-z0-9])${a.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
    if (whole.test(folded) && (!best || a.word.length > best.word.length)) best = a;
  }
  return best;
}

/** OLA 27 (Familia 1; G27-1 + G27-3 + G27-4 + G27-5): EL JUEZ ÚNICO
 * DE LA FORMA DE UN PATRÓN — la ley entera del escritor, en un solo
 * sitio, para que las dos puertas (la del libro en defaults.ts y el
 * lector de abajo) juzguen lo mismo y jamás discrepen. La Ola 27 cazó
 * las dos puertas juzgando la palabra en una dimensión más débil que
 * su desreferencia: la palabra vacía pasaba y su regex casaba en
 * cualquier borde de puntuación (un ciudadano fantasma clavado en el
 * Asesor entero); «La Luz» sin plegar pasaba y jamás podía disparar
 * (zombi); `targetId` vacío entraba por una puerta y no por la otra;
 * y los contadores se juzgaban con `typeof`, dejando pasar NaN,
 * Infinity y negativos donde los campos vecinos se miden con la
 * finitud de la casa. La ley del escritor es la vara: la palabra ya
 * plegada por maskShape (así la acuña learnAlias), no vacía, con su
 * largo mínimo, sin dígitos; el ciudadano presente; y los contadores
 * finitos y no negativos — un conteo no puede ser negativo sin dejar
 * de ser un conteo. */
export function aliasShapeOk(p: unknown): p is LearnedAlias {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  if (typeof o.word !== "string" || /\d/.test(o.word)) return false;
  if (o.word !== maskShape(o.word) || o.word.length < 2) return false;
  if (typeof o.targetId !== "string" || !o.targetId) return false;
  if (o.kind !== "sub" && o.kind !== "cat" && o.kind !== "person" && o.kind !== "account") return false;
  if (typeof o.hits !== "number" || !Number.isFinite(o.hits) || o.hits < 0) return false;
  if (o.learnedFrom !== "card-tap" && o.learnedFrom !== "correction") return false;
  if (o.uses !== undefined && (typeof o.uses !== "number" || !Number.isFinite(o.uses) || o.uses < 0)) return false;
  return true;
}

/** EL LECTOR DEL ALMACÉN (integración 1.3.383): lee los patrones del
 * libro con desconfianza, como la casa lee cada campo que viaja — una
 * entrada malformada se descarta en silencio y una palabra con
 * dígitos jamás pasa (la cerca de la Ola 11 en la puerta de lectura).
 * Vive aquí, junto al tipo, para que asklearn no importe a nadie.
 *
 * OLA 27 (Familia 1, G27-3): el lector además resuelve las palabras
 * duplicadas con la ley del escritor — la corrección, la última,
 * manda: cada entrada válida desplaza a la anterior de su misma
 * palabra y toma su sitio al final, exactamente como learnAlias
 * acuña. Así el almacén que sale de aquí tiene UN ciudadano por
 * palabra (aliasIn ya no puede ganar «la primera» contra la ley) y
 * un solo olvido borra exactamente un ciudadano. La puerta del libro
 * juzga la FORMA de cada entrada (aliasShapeOk) y no la unicidad: un
 * libro con una palabra repetida no está dañado, está por corregir —
 * y corregirlo es oficio de este lector, no motivo de cuarentena. */
export function askPatternsOf(state: { askPatterns?: unknown }): LearnedAlias[] {
  const raw = state.askPatterns;
  if (!Array.isArray(raw)) return [];
  let out: LearnedAlias[] = [];
  for (const p of raw as unknown[]) {
    if (!aliasShapeOk(p)) continue;
    const entry: LearnedAlias = {
      word: p.word, targetId: p.targetId, kind: p.kind, hits: p.hits, learnedFrom: p.learnedFrom,
      ...(p.uses !== undefined ? { uses: p.uses } : {}),
    };
    out = [...out.filter((a) => a.word !== entry.word), entry];
  }
  return out;
}
