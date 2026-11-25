/**
 * crear-settle — la costura de canon del puerto de la Rama Agente
 * (1.3.448): el nacimiento confirmado de lo que el diálogo de crear
 * preguntando (crear.ts) propuso.
 *
 * crear.ts es puro: pregunta (conflicto, tipo, dónde) y propone el
 * borrador de estructura con su eco. Este módulo es el toque hecho
 * código: convierte el borrador confirmado en la pieza de la
 * estructura con LAS FORMAS DE LA CASA —
 *   categoría nueva → la forma del propio editor de Estructura
 *     (id «c-…», nameKey "", el nombre del usuario en customName,
 *     icon "Circle", group "variable" — lo que nace de un relato es
 *     un movimiento variable; en Estructura se mueve si hace falta —,
 *     order = el conteo de su grupo, role "" — o "savings" si el
 *     tipo pedido fue ahorro: sus líneas cuentan como ahorro en las
 *     lecturas del Asesor, como las de la categoría de Ahorros);
 *   bajo una existente → una sub con la forma de la casa (id «s-…»,
 *     el icono de su categoría madre, order = el mayor + 1).
 *
 * LA CERCA DE CONFLICTOS SE REPITE AL NACER: si entretanto nació
 * algo con el mismo nombre (o el diálogo se confirma dos veces), no
 * nace un duplicado — se devuelve lo que ya existe, para usarlo.
 *
 * Y EL MOVIMIENTO QUE ESPERABA: si el relato que abrió la creación
 * ya se asentó sin ubicar, su línea se ubica aquí, en la pieza nueva
 * (o en la existente): crear y asentar son dos síes, y el segundo
 * deja el primero completo.
 */
import { foldQ } from "./lexicon.ts";
import { uid } from "./money.ts";
import type { CrearDraft } from "./crear.ts";
import type { makeNamer } from "./defaults.ts";
import type { RelatoDraft } from "./relato.ts";
import type { Category, LedgerState, Sub } from "./types.ts";

type Namer = ReturnType<typeof makeNamer>;

export type CrearOutcome = { state: LedgerState; categoryId: string; subId: string; created: boolean };

/** La línea asentada sin ubicar que un borrador del relato dejó,
    ubicada en la pieza dada. Solo la primera que coincide (concepto,
    monto y fecha del borrador, en su mes, todavía sin categoría). */
export function locatePendingLine(state: LedgerState, pending: RelatoDraft, categoryId: string, subId: string): LedgerState {
  if (!categoryId || pending.duplicate || pending.op === "mover") return state;
  const monthKey = pending.date.slice(0, 7);
  const bucket = state.months[monthKey];
  if (!bucket) return state;
  let done = false;
  const lines = bucket.lines.map((l) => {
    if (done) return l;
    if (l.categoryId === "" && l.concept === pending.concept && l.amountMinor === pending.amountMinor && l.bookedOn === pending.date) {
      done = true;
      return { ...l, categoryId, subId };
    }
    return l;
  });
  if (!done) return state;
  return { ...state, months: { ...state.months, [monthKey]: { lines } } };
}

/** El borrador de creación confirmado → la pieza en la estructura.
    `fixedId`: la caja puede fijar el id de nacimiento (lo necesita
    para ubicar el borrador del relato que sigue en pantalla con EL
    MISMO id que nace dentro de su commit). */
export function applyCrearDraft(state: LedgerState, names: Namer, draft: CrearDraft, pending?: RelatoDraft | null, fixedId?: string): CrearOutcome {
  const t = foldQ(draft.nombre).trim();
  // La cerca repetida: ¿ya existe algo con ese nombre?
  for (const cat of state.structure.categories) {
    if (foldQ(names.cat(cat.id)).trim() === t) {
      const s1 = pending ? locatePendingLine(state, pending, cat.id, "") : state;
      return { state: s1, categoryId: cat.id, subId: "", created: false };
    }
    for (const s of cat.subs) {
      if (foldQ(names.sub(s.id)).trim() === t) {
        const s1 = pending ? locatePendingLine(state, pending, cat.id, s.id) : state;
        return { state: s1, categoryId: cat.id, subId: s.id, created: false };
      }
    }
  }
  if (draft.esSub) {
    const parent = state.structure.categories.find((c) => c.id === draft.padreId);
    if (!parent) return { state, categoryId: "", subId: "", created: false };
    const sub: Sub = {
      id: fixedId ?? `s-${uid().slice(0, 8)}`, nameKey: "", customName: draft.nombre,
      icon: parent.icon, hidden: false,
      order: parent.subs.reduce((max, s) => Math.max(max, s.order), 0) + 1,
    };
    const categories = state.structure.categories.map((c) => (c.id === parent.id ? { ...c, subs: [...c.subs, sub] } : c));
    const s1: LedgerState = { ...state, structure: { ...state.structure, categories } };
    return { state: pending ? locatePendingLine(s1, pending, parent.id, sub.id) : s1, categoryId: parent.id, subId: sub.id, created: true };
  }
  const cat: Category = {
    id: fixedId ?? `c-${uid().slice(0, 8)}`, nameKey: "", customName: draft.nombre,
    icon: "Circle", hidden: false,
    order: state.structure.categories.filter((c) => c.group === "variable").length,
    group: "variable", role: draft.tipo === "ahorro" ? "savings" : "", subs: [],
  };
  const s1: LedgerState = { ...state, structure: { ...state.structure, categories: [...state.structure.categories, cat] } };
  return { state: pending ? locatePendingLine(s1, pending, cat.id, "") : s1, categoryId: cat.id, subId: "", created: true };
}

/** El nombre TAL COMO el usuario lo escribió en su relato («Jardinería»,
    con su acento y su mayúscula): el concepto del borrador viaja
    plegado, así que se busca en el texto crudo la ventana de palabras
    cuyo plegado coincide con el concepto. Null si no se encuentra. */
export function rawNameFor(raw: string, concept: string): string | null {
  const words = raw.split(/\s+/).filter(Boolean);
  const target = foldQ(concept).trim().split(/\s+/).filter(Boolean);
  if (!target.length || words.length < target.length) return null;
  const clean = (w: string) => foldQ(w).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  for (let i = 0; i + target.length <= words.length; i++) {
    const win = words.slice(i, i + target.length);
    if (win.map(clean).join(" ") === target.join(" ")) return win.join(" ").replace(/[.,;:]+$/, "");
  }
  return null;
}
