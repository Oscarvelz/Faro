/**
 * Pieza 0 — El nombre propio (1.3.363; mapa §19.5, brief
 * BRIEF-PIEZA-0-NOMBRE.md). El nombre que la persona escribió para sí
 * misma en su cuenta, y los ÚNICOS modos de gastarlo.
 *
 * El lector: un solo sitio decide qué cuenta como nombre elegido.
 * - Lo que la persona escribió (el `name`/`full_name` de la cuenta, aquí
 *   `given`) es el nombre.
 * - El correo NUNCA es un nombre: el registro de la cuenta cae al correo
 *   cuando el nombre se deja vacío (signUp manda `name || email`), así
 *   que un «nombre» idéntico al correo es el repuesto, no una elección —
 *   se lee como «sin nombre». El correo sigue valiendo como identificador
 *   en el pliegue Cuenta, que es otra cosa.
 * - Sin nombre, Faro habla exactamente como siempre: cada ayudante de
 *   abajo devuelve el texto intacto cuando el nombre es null.
 *
 * Los umbrales (lista cerrada, P4): el nombre entra SOLO por las
 * funciones de este módulo, y este módulo solo lo gastan la apertura del
 * Asesor (addressHeadline) y la pregunta de la lista de espera
 * (waitQuestion). Ni una respuesta de Preguntar, ni una cifra, ni un
 * aviso de vencimiento lo interpolan jamás: el Reading mismo no conoce
 * el nombre — se antepone al presentarlo, no al componerlo.
 *
 * El nombre vive en la cuenta, nunca en el libro (cerca 5): este módulo
 * no lee ni escribe ningún LedgerState, y renombrar no reescribe nada
 * ya guardado (cerca 4) porque nada guardado lo contiene.
 */

/** La marca de «ya se preguntó», por cuenta y aparato (precedente: la
 *  oferta de huella de 1.3.257 — el hecho de haber preguntado sobrevive
 *  a cerrar sesión en este aparato, para no preguntar dos veces). */
export const NAME_ASK_KEY = (uid: string): string => `faro-name-asked.${uid}`;

export type NameCarrier = {
  /** El nombre tal como quedó en la cuenta, sin el repuesto del correo. */
  given?: string | null;
  /** El nombre del registro recordado (puede ser el correo-repuesto). */
  name?: string | null;
  email?: string | null;
};

/** El nombre elegido por la persona, o null si nunca escribió uno. */
export function chosenNameOf(u: NameCarrier | null | undefined): string | null {
  if (!u) return null;
  const email = (u.email ?? "").trim().toLowerCase();
  const clean = (v: string | null | undefined): string | null => {
    const s = (v ?? "").trim();
    if (!s) return null;
    if (email && s.toLowerCase() === email) return null; // el repuesto no es una elección
    return s;
  };
  return clean(u.given) ?? clean(u.name);
}

/**
 * La apertura del Asesor, cuando se dirige a la persona: el nombre va
 * delante, una vez, y la frase sigue en minúscula como continuación
 * («María, este mes cerraste debiendo menos.»). Sin nombre, la frase
 * vuelve intacta, palabra por palabra.
 */
export function addressHeadline(headline: string, name: string | null): string {
  if (!name || !headline) return headline;
  const first = headline.charAt(0);
  const lowered = /[A-ZÁÉÍÓÚÑ]/.test(first) ? first.toLowerCase() + headline.slice(1) : headline;
  return `${name}, ${lowered}`;
}

/**
 * La pregunta única de la lista de espera al vencer el plazo, cuando la
 * superficie se dirige a la persona: «María, ¿todavía lo quieres?».
 * Sin nombre, la pregunta de siempre, intacta.
 */
export function waitQuestion(lang: "es" | "en", name: string | null): string {
  if (!name) return lang === "en" ? "Do you still want it?" : "¿Todavía lo quieres?";
  return lang === "en" ? `${name}, do you still want it?` : `${name}, ¿todavía lo quieres?`;
}
