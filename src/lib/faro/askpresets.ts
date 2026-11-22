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
 * 18:46): una DESCRIPCIÓN honesta en prosa, generada del banco en el
 * momento — nunca un folio de preguntas, porque ni siquiera son las
 * únicas que el motor contiene. Cuatro piezas: la apertura (leo tu libro
 * y respondo con tus números), lo que SÍ sabe (la frase `cap` de cada
 * familia viva o heredada, en el orden del banco), lo que TODAVÍA NO
 * (las declaradas, nombradas como límite — reconocerlas es la
 * honestidad que se pidió), y los límites de siempre. Cuando una
 * familia declarada se vuelva viva, esta misma descripción lo contará
 * sola: se mudará de párrafo sin que nadie reescriba el texto. */
export function capabilitiesText(lang: Lang): { intro: string; areas: string; notYet: string; limits: string } {
  const capsOf = (ok: (s: string) => boolean) => QUESTION_BANK.filter((f) => ok(f.status)).map((f) => f.cap[lang]);
  const join = (xs: string[]) => (lang === "en" ? xs.join("; ") : xs.join("; "));
  const live = capsOf((s) => s === "viva" || s === "heredada");
  const pending = capsOf((s) => s === "declarada");
  return lang === "en"
    ? {
        intro: "I read your book and answer with your own numbers. This is what I know how to do — and what I don't, yet.",
        areas: `I can tell you: ${join(live)}.`,
        notYet: `What I still can't do: ${join(pending)}. When I learn it, this same description will say so on its own.`,
        limits: "My limits, stated plainly: I only use what's written in your book — if something isn't there, I tell you instead of making it up. I don't give advice or opinions on what to do with your money. And if I can't answer a question, I say so.",
      }
    : {
        intro: "Leo tu libro y respondo con tus propios números. Esto es lo que sé hacer — y lo que todavía no.",
        areas: `Puedo decirte: ${join(live)}.`,
        notYet: `Lo que todavía no sé: ${join(pending)}. Cuando lo aprenda, esta misma descripción lo contará sola.`,
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
