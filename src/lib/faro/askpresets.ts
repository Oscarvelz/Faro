/**
 * askpresets.ts — LAS PREGUNTAS PREDETERMINADAS DEL ASESOR (1.3.369).
 *
 * Fallo de Oscar (2026-11-20, ampliado 2026-11-21): la persona elige sus
 * preguntas — del catálogo canónico del banco o escritas por ella —, las
 * guarda en un pliegue de Ajustes con su icono, y viven en la caja de
 * Preguntar, en EL ORDEN QUE LA PERSONA MANDA, un toque = respuesta al
 * instante. El conflicto que la .369 cierra: tras una respuesta no había
 * vuelta a verlas — por eso la fila de predeterminadas NUNCA se esconde.
 * Su sitio lo corrigió Oscar en su teléfono (2026-11-21 18:46, .371):
 * la fila vive DEBAJO de la respuesta — primero la pregunta y su
 * respuesta; las predeterminadas, después, siempre a la vista.
 *
 * La fija del sistema: «¿Qué puedes hacer?» — candidata de Oscar (banco,
 * Ola 3). No se guarda, no se quita, no se mueve: la pinta la caja misma,
 * siempre primera. Su respuesta la corrigió el mismo fallo de las 18:46:
 * no es un folio de preguntas — ni siquiera son las únicas que el motor
 * contiene — sino una DESCRIPCIÓN honesta en prosa de lo que el Asesor
 * puede hacer y de lo que todavía no, con sus limitaciones dichas. La
 * descripción se GENERA del banco en el momento (la frase `cap` de cada
 * familia), así que crece sola cuando el Asesor aprende algo nuevo.
 *
 * El campo vive fuera de months (askPresets) y ningún total lo lee.
 * Administrar la lista es de Ritmo (settings.ask-presets, el precedente
 * de los pines de widgets); usarla es de Esencial (advisor.ask).
 */
import { QUESTION_BANK } from "./questionbank";
import type { AskPreset, Lang, LedgerState } from "./types";
import { uid } from "./money";

/** La pregunta fija del sistema, en la lengua de la persona. */
export const FIXED_PRESET_Q: Record<Lang, string> = {
  es: "¿Qué puedes hacer?",
  en: "What can you do?",
};

/** Las predeterminadas del libro, leídas con desconfianza: solo entran
 * entradas con id y texto de texto; el orden del libro se respeta tal
 * cual — es el orden de la persona. */
export function askPresetsOf(state: LedgerState): AskPreset[] {
  const raw = state.askPresets;
  if (!Array.isArray(raw)) return [];
  const out: AskPreset[] = [];
  for (const p of raw as unknown[]) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.text !== "string") continue;
    const text = o.text.trim();
    if (!text) continue;
    out.push({ id: o.id, text });
  }
  return out;
}

function normQ(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Añade una pregunta (del catálogo o escrita). Si ya está — mismo texto,
 * sin distinguir mayúsculas — no duplica: devuelve el libro intacto. */
export function addAskPreset(state: LedgerState, text: string): LedgerState {
  const clean = text.trim();
  if (!clean) return state;
  const list = askPresetsOf(state);
  if (list.some((p) => normQ(p.text) === normQ(clean))) return state;
  return { ...state, askPresets: [...list, { id: uid(), text: clean }] };
}

/** Mueve una pregunta un paso en la dirección dada (−1 sube, +1 baja);
 * en los extremos no hace nada. El orden es de la persona: se guarda. */
export function moveAskPreset(state: LedgerState, id: string, dir: -1 | 1): LedgerState {
  const list = askPresetsOf(state);
  const i = list.findIndex((p) => p.id === id);
  if (i < 0) return state;
  const j = i + dir;
  if (j < 0 || j >= list.length) return state;
  const next = [...list];
  const [it] = next.splice(i, 1);
  next.splice(j, 0, it);
  return { ...state, askPresets: next };
}

/** Quita una pregunta de la lista. La fija del sistema no vive aquí y
 * por tanto no se puede quitar: siempre estará primera. */
export function removeAskPreset(state: LedgerState, id: string): LedgerState {
  const list = askPresetsOf(state);
  if (!list.some((p) => p.id === id)) return state;
  return { ...state, askPresets: list.filter((p) => p.id !== id) };
}

/** La respuesta a «¿Qué puedes hacer?» (corrección de Oscar, 2026-11-21
 * 18:46): una DESCRIPCIÓN honesta generada del banco en el momento —
 * nunca un folio de preguntas, porque ni siquiera son las únicas que
 * el motor contiene.
 *
 * 1.3.373 (Oscar, 2026-11-21 19:42, sobre la .371 en su teléfono): la
 * descripción en prosa seguida — un párrafo cosido con punto y coma —
 * se leía como TEXTO SUELTO: «no hay orden… debería presentarse de
 * una forma mucho más ordenada y más concreta». La descripción se
 * presenta ahora en GRUPOS con renglón propio: cada capacidad viva o
 * heredada es UNA línea bajo el kicker de su territorio, sin cadena
 * de punto y coma. Los grupos son de presentación; el contenido sigue
 * saliendo del banco en el momento (la frase `cap` de cada familia),
 * y la cerca exige que toda familia viva o heredada viva en
 * exactamente un grupo: una capacidad nueva sin grupo rompe la
 * cerca, no se esconde. Lo que todavía no (las declaradas) va en su
 * propio grupo, con su nota; y los límites de siempre cierran, en la
 * forma que a Oscar le gustó tal cual. */
const CAP_GROUPS: { title: { es: string; en: string }; families: string[] }[] = [
  { title: { es: "Tu mes", en: "Your month" }, families: ["how", "left", "free", "spend", "gustos"] },
  { title: { es: "Tus movimientos", en: "Your movements" }, families: ["recencia", "historia", "comparar"] },
  { title: { es: "Tus cuotas y deudas", en: "Your dues and debts" }, families: ["agenda", "ya-pague", "ranking"] },
  { title: { es: "Tus ahorros y envíos", en: "Your savings and remittances" }, families: ["ahorros", "cuenta-origen", "remesas"] },
  { title: { es: "Faro y tu futuro", en: "Faro and your future" }, families: ["faro-mismo", "futuro"] },
];

export function capabilitiesText(lang: Lang): {
  intro: string;
  groups: { title: string; items: string[] }[];
  notYetTitle: string;
  notYet: string[];
  notYetNote: string;
  limits: string;
} {
  const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const capOf = (id: string) => QUESTION_BANK.find((f) => f.id === id)?.cap[lang];
  const groups = CAP_GROUPS.map((g) => ({
    title: g.title[lang],
    items: g.families.map(capOf).filter((x): x is string => !!x).map(sentence),
  })).filter((g) => g.items.length > 0);
  const notYet = QUESTION_BANK.filter((f) => f.status === "declarada").map((f) => sentence(f.cap[lang]));
  return lang === "en"
    ? {
        intro: "I read your book and answer with your own numbers. This is what I know how to do — and what I don't, yet.",
        groups,
        notYetTitle: "What I still can't do",
        notYet,
        notYetNote: "When I learn it, this same description will say so on its own.",
        limits: "My limits, stated plainly: I only use what's written in your book — if something isn't there, I tell you instead of making it up. I don't give advice or opinions on what to do with your money. And if I can't answer a question, I say so.",
      }
    : {
        intro: "Leo tu libro y respondo con tus propios números. Esto es lo que sé hacer — y lo que todavía no.",
        groups,
        notYetTitle: "Lo que todavía no sé",
        notYet,
        notYetNote: "Cuando lo aprenda, esta misma descripción lo contará sola.",
        limits: "Mis límites, dichos claros: solo uso lo que está anotado en tu libro — si algo no está, te lo digo en vez de inventarlo. No doy consejos ni opiniones sobre qué hacer con tu dinero. Y si una pregunta no la sé responder, te lo digo.",
      };
}

/** El catálogo ofrecido en el pliegue de Ajustes: por familia viva o
 * heredada, sus canónicas en la lengua vigente. */
export function presetCatalog(lang: Lang): { family: string; questions: string[] }[] {
  const out: { family: string; questions: string[] }[] = [];
  for (const f of QUESTION_BANK) {
    if (f.status !== "viva" && f.status !== "heredada") continue;
    const qs = f.canonical[lang].filter((q) => q.trim());
    if (qs.length) out.push({ family: f.name[lang], questions: qs });
  }
  return out;
}

/** LAS SUGERENCIAS DEL BANCO (1.3.376; fallo de Oscar, 2026-11-21
 * 21:07): en la caja en reposo el banco ofrece SOLO TRES sugerencias,
 * bajo su propio rótulo y DEBAJO de «A la mano» — las preguntas de la
 * persona son las primeras, como promete Ajustes — y el trío cambia en
 * cada entrada al Asesor: la entrada n sirve el trío que empieza en
 * (3n) mód el tamaño de la bolsa, envolviendo al final, así las
 * visitas recorren la bolsa entera sin repetir un trío hasta agotar
 * el ciclo. Función pura: la cerca la ejecuta sin pantalla. */
export function suggestionTrio(pool: string[], entry: number): string[] {
  if (pool.length <= 3) return [...pool];
  const start = ((entry * 3) % pool.length + pool.length) % pool.length;
  return [0, 1, 2].map((i) => pool[(start + i) % pool.length]);
}

/** El contador de entradas a la caja vive fuera del libro y fuera de
 * React: es estado de la sesión de pantalla, como el marco del
 * Seguimiento — nace y muere con la app abierta. */
let askEntryCount = 0;
export function nextAskEntry(): number {
  return askEntryCount++;
}
