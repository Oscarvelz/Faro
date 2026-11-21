/**
 * askpresets.ts — LAS PREGUNTAS PREDETERMINADAS DEL ASESOR (1.3.369).
 *
 * Fallo de Oscar (2026-11-20, ampliado 2026-11-21): la persona elige sus
 * preguntas — del catálogo canónico del banco o escritas por ella —, las
 * guarda en un pliegue de Ajustes con su icono, y viven PRIMERAS en la
 * caja de Preguntar, en EL ORDEN QUE LA PERSONA MANDA, un toque =
 * respuesta al instante. El conflicto que esta ola cierra: tras una
 * respuesta no había vuelta a verlas — por eso la fila de predeterminadas
 * NUNCA se esconde: vive sobre la respuesta, siempre.
 *
 * La fija del sistema: «¿Qué puedes hacer?» — candidata de Oscar (banco,
 * Ola 3). No se guarda, no se quita, no se mueve: la pinta la caja misma,
 * siempre primera, y su respuesta se GENERA del banco en el momento
 * (las canónicas de las familias vivas y heredadas — jamás una lista
 * escrita a mano que pueda prometer lo que el motor no responde).
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

/** La respuesta a «¿Qué puedes hacer?», generada del banco en el momento:
 * la primera canónica de cada familia VIVA o HEREDADA, en el orden del
 * banco. Las declaradas no entran — prometerlas sería mentir: el motor
 * todavía no las responde. */
export function capabilityQuestions(lang: Lang): string[] {
  const out: string[] = [];
  for (const f of QUESTION_BANK) {
    if (f.status !== "viva" && f.status !== "heredada") continue;
    const q = f.canonical[lang][0];
    if (q) out.push(q);
  }
  return out;
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
