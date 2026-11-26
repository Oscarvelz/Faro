/* ================================================================== */
/* LA RAMA DEL AGENTE · E5 — CREAR PREGUNTANDO                         */
/*                                                                     */
/* La idea de Oscar (2026-11-23): el Asesor no solamente ejecuta —     */
/* pregunta para clarificar y evitar errores y conflictos. Cuando el   */
/* relato nombra una categoría que no existe («pagué 80 de             */
/* jardinería»), en vez de dejar el movimiento sin ubicar para         */
/* siempre, el Asesor ayuda a crearla: pregunta SOLO lo que el relato  */
/* no ya sabe (si el verbo fue «pagué», el tipo es gasto y no se       */
/* pregunta), una pregunta por vez, y la creación nace como borrador   */
/* de estructura con su eco y su SÍ, como todo lo demás.               */
/*                                                                     */
/* La cerca de conflictos va PRIMERO: si ya existe una categoría o     */
/* sub con el mismo nombre o casi el mismo, el Asesor lo dice y        */
/* pregunta si es esa o una nueva — ningún duplicado entra sin que     */
/* el usuario lo decida sabiéndolo.                                    */
/*                                                                     */
/* El diálogo es sin estado: la propuesta viaja en datos entre         */
/* turnos (la caja la guarda, como guarda el marco de conversación),   */
/* y cada función es pura.                                             */
/* ================================================================== */

import { foldQ } from "./lexicon.ts";
import { normalizeEs, oneDropAway, oneSwapAway, phonFold, repairAgentText } from "./ask2.ts";
import type { makeNamer } from "./defaults.ts";
import type { Lang, LedgerState } from "./types.ts";
import type { RelatoDraft } from "./relato.ts";

type Namer = ReturnType<typeof makeNamer>;
const L = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

export type CrearTipo = "gasto" | "ingreso" | "ahorro";
export type CrearPropuesta = {
  nombre: string;
  tipo: CrearTipo | null;
  /** "" = categoría de primer nivel (decidido); null = aún sin decidir. */
  padreId: string | null;
  pendiente: "conflicto" | "tipo" | "donde" | null;
  conflictoId: string | null;
  conflictoEsSub: boolean;
};
export type CrearDraft = { nombre: string; tipo: CrearTipo; padreId: string; esSub: boolean };
export type CrearStep =
  | { kind: "pregunta"; propuesta: CrearPropuesta; question: string }
  | { kind: "draft"; draft: CrearDraft; echo: string }
  | { kind: "usar"; categoryId: string; subId: string; nombre: string; text: string };

/** La cerca de conflictos: el nombre exacto o casi — compartir una
    palabra de 4+ letras, o que uno contenga al otro. */
function parecida(state: LedgerState, names: Namer, nombre: string): { id: string; esSub: boolean; nombre: string; padreId: string } | null {
  const t = foldQ(nombre).trim();
  if (!t) return null;
  const toks = new Set(t.split(/\s+/).filter((w) => w.length >= 4));
  let near: { id: string; esSub: boolean; nombre: string; padreId: string } | null = null;
  const judge = (id: string, esSub: boolean, nom: string, padreId: string) => {
    const f = foldQ(nom).trim();
    if (f === t) return { id, esSub, nombre: nom, padreId };
    if (!near && f.length >= 4 && t.length >= 4 && (f.includes(t) || t.includes(f) || f.split(/\s+/).some((w) => toks.has(w)))) {
      near = { id, esSub, nombre: nom, padreId };
    }
    return null;
  };
  for (const cat of state.structure.categories) {
    const hit = judge(cat.id, false, names.cat(cat.id), "");
    if (hit) return hit;
    for (const s of cat.subs) {
      const hitS = judge(s.id, true, names.sub(s.id), cat.id);
      if (hitS) return hitS;
    }
  }
  return near;
}

function preguntaTipo(lang: Lang, p: CrearPropuesta): CrearStep {
  return {
    kind: "pregunta",
    propuesta: { ...p, pendiente: "tipo" },
    question: L(lang,
      `«${p.nombre}» no está en tu estructura. Para crearla bien: ¿es de gasto, de ingreso o de ahorro?`,
      `"${p.nombre}" isn't in your structure. To create it properly: is it for spending, income, or saving?`),
  };
}
function preguntaDonde(state: LedgerState, lang: Lang, names: Namer, p: CrearPropuesta): CrearStep {
  // Si alguna categoría comparte palabra con el nombre, se sugiere.
  const t = foldQ(p.nombre);
  const sugerida = state.structure.categories.find((cat) => {
    const f = foldQ(names.cat(cat.id));
    return f.split(/\s+/).some((w) => w.length >= 4 && t.includes(w));
  });
  return {
    kind: "pregunta",
    propuesta: { ...p, pendiente: "donde" },
    question: L(lang,
      `¿La creo como categoría nueva, aparte, o bajo una que ya tienes${sugerida ? ` (por ejemplo, ${names.cat(sugerida.id)})` : ""}?`,
      `Shall I create it as a new top-level category, or under one you already have${sugerida ? ` (for example, ${names.cat(sugerida.id)})` : ""}?`),
  };
}
function aDraft(lang: Lang, names: Namer, p: CrearPropuesta): CrearStep {
  const draft: CrearDraft = { nombre: p.nombre, tipo: p.tipo ?? "gasto", padreId: p.padreId ?? "", esSub: (p.padreId ?? "") !== "" };
  const tipoTxt = L(lang, draft.tipo === "gasto" ? "de gasto" : draft.tipo === "ingreso" ? "de ingreso" : "de ahorro", draft.tipo === "gasto" ? "spending" : draft.tipo === "ingreso" ? "income" : "saving");
  const dondeTxt = draft.esSub
    ? L(lang, `bajo ${names.cat(draft.padreId)}`, `under ${names.cat(draft.padreId)}`)
    : L(lang, "como categoría nueva", "as a new top-level category");
  return {
    kind: "draft", draft,
    echo: [
      L(lang, "Esto es lo que entendí:", "Here's what I understood:"),
      `• ${L(lang, "Crear", "Create")} «${draft.nombre}», ${tipoTxt}, ${dondeTxt}`,
      L(lang, "¿La creo así?", "Shall I create it like this?"),
    ].join("\n"),
  };
}
function siguiente(state: LedgerState, lang: Lang, names: Namer, p: CrearPropuesta): CrearStep {
  if (p.tipo === null) return preguntaTipo(lang, p);
  if (p.padreId === null) return preguntaDonde(state, lang, names, p);
  return aDraft(lang, names, p);
}

export function crearInicio(
  state: LedgerState, lang: Lang, names: Namer, nombreCrudo: string,
  pista?: { tipo?: CrearTipo },
): CrearStep {
  const nombre = nombreCrudo.trim().replace(/\s+/g, " ");
  const base: CrearPropuesta = { nombre, tipo: pista?.tipo ?? null, padreId: null, pendiente: null, conflictoId: null, conflictoEsSub: false };
  const hit = parecida(state, names, nombre);
  if (hit) {
    return {
      kind: "pregunta",
      propuesta: { ...base, pendiente: "conflicto", conflictoId: hit.id, conflictoEsSub: hit.esSub },
      question: L(lang,
        `Ya tienes «${hit.nombre}» en tu estructura. ¿Es esa misma, o quieres una nueva llamada «${nombre}»?`,
        `You already have "${hit.nombre}" in your structure. Is it that same one, or do you want a new one called "${nombre}"?`),
    };
  }
  return siguiente(state, lang, names, base);
}

export function crearRespuesta(
  state: LedgerState, lang: Lang, names: Namer, propuesta: CrearPropuesta, respuestaCruda: string,
): CrearStep {
  /* LA CAMPAÑA DE MUTACIONES DE LA RAMA (puerto 1.3.457): la
   * respuesta del diálogo también se oye con su escritura
   * imperfecta — «es de gato» no contestaba el tipo y «una nuva»
   * no contestaba el conflicto. La reparación de dos pasadas
   * corre contra el vocabulario de las puertas más los nombres
   * de la estructura, que se protegen. */
  const protect = new Set<string>();
  for (const cat of state.structure.categories) {
    for (const w of foldQ(names.cat(cat.id)).split(/[^a-zñ]+/)) if (w.length >= 3) protect.add(w);
    for (const s of cat.subs) {
      for (const w of foldQ(names.sub(s.id)).split(/[^a-zñ]+/)) if (w.length >= 3) protect.add(w);
      if (s.customName) for (const w of foldQ(s.customName).split(/[^a-zñ]+/)) if (w.length >= 3) protect.add(w);
    }
  }
  const repaired = repairAgentText(foldQ(respuestaCruda), protect, lang);
  const r = (lang === "es" ? normalizeEs(repaired) : repaired).trim();
  const rRaw = foldQ(respuestaCruda).trim();
  const p: CrearPropuesta = { ...propuesta };
  if (p.pendiente === "conflicto") {
    if (/\b(esa|ese|la misma|el mismo|misma|same|that one)\b/.test(r)) {
      const nombre = p.conflictoEsSub ? names.sub(p.conflictoId ?? "") : names.cat(p.conflictoId ?? "");
      return {
        kind: "usar",
        categoryId: p.conflictoEsSub ? "" : (p.conflictoId ?? ""),
        subId: p.conflictoEsSub ? (p.conflictoId ?? "") : "",
        nombre,
        text: L(lang, `Perfecto: uso «${nombre}», la que ya tienes. No creo nada.`, `Got it: I'll use "${nombre}", the one you already have. I won't create anything.`),
      };
    }
    if (/\b(nueva|nuevo|otra|otro|new|another)\b/.test(r)) {
      p.pendiente = null; p.conflictoId = null;
      return siguiente(state, lang, names, p);
    }
    return { kind: "pregunta", propuesta: p, question: L(lang, "¿Es la que ya tienes, o una nueva?", "Is it the one you already have, or a new one?") };
  }
  if (p.pendiente === "tipo") {
    const tipo: CrearTipo | null = /\b(gasto|gastos|spend|spending|expense)\b/.test(r) ? "gasto"
      : /\b(ingreso|ingresos|income)\b/.test(r) ? "ingreso"
        : /\b(ahorro|ahorros|saving|savings)\b/.test(r) ? "ahorro" : null;
    if (!tipo) return preguntaTipo(lang, p);
    p.tipo = tipo; p.pendiente = null;
    return siguiente(state, lang, names, p);
  }
  if (p.pendiente === "donde") {
    if (/\b(nueva|nuevo|aparte|sola|solo|new|apart|separate|top)\b/.test(r)) {
      p.padreId = ""; p.pendiente = null;
      return aDraft(lang, names, p);
    }
    // «bajo Casa», «en Casa», o el nombre a secas: se busca la categoría.
    for (const cat of state.structure.categories) {
      if (r.includes(foldQ(names.cat(cat.id)))) { p.padreId = cat.id; p.pendiente = null; return aDraft(lang, names, p); }
      for (const s of cat.subs) {
        if (r.includes(foldQ(names.sub(s.id)))) { p.padreId = cat.id; p.pendiente = null; return aDraft(lang, names, p); }
      }
    }
    /* LA PASADA DIFUSA DEL DÓNDE (campaña de la Rama, puerto
     * 1.3.457): «bajo Caa» no incluía «casa» y la pregunta se
     * repetía como si no hubiera respuesta. Si el nombre exacto
     * no casó, una palabra de la respuesta a una deformación
     * honesta de una palabra del nombre (4+ letras) basta — la
     * misma disciplina de la pasada difusa de nombres del banco.
     * Empate entre dos casas: no se adivina. */
    /* Las palabras se leen de la respuesta reparada Y de la cruda:
     * la reparación misma puede mover una palabra corta («caa» se
     * vuelve «cara») y la pasada difusa merece ver la original. */
    const ansWords = [...new Set([...r.split(/[^a-zñ]+/), ...rRaw.split(/[^a-zñ]+/)].filter((w) => w.length >= 3))];
    let fuzzyCat: string | null = null;
    let fuzzyName = "";
    let fuzzyTie = false;
    for (const cat of state.structure.categories) {
      const nameWords = [foldQ(names.cat(cat.id)), ...cat.subs.map((s) => foldQ(names.sub(s.id)))]
        .flatMap((n) => n.split(/[^a-zñ]+/)).filter((w) => w.length >= 4);
      const hit = ansWords.some((w) => nameWords.some((n) => phonFold(w) === phonFold(n) || oneDropAway(w, n) || oneSwapAway(w, n)));
      if (!hit) continue;
      /* La estructura trae casas con el MISMO nombre («Casa» la de
       * fijos y «Casa» la de variables): empatar entre dos con el
       * mismo nombre no es ambigüedad — la pasada exacta también
       * resuelve a la primera. El empate que frena es entre
       * nombres DISTINTOS. */
      const nm = foldQ(names.cat(cat.id));
      if (!fuzzyCat) { fuzzyCat = cat.id; fuzzyName = nm; }
      else if (nm !== fuzzyName) fuzzyTie = true;
    }
    if (fuzzyCat && !fuzzyTie) { p.padreId = fuzzyCat; p.pendiente = null; return aDraft(lang, names, p); }
    return preguntaDonde(state, lang, names, p);
  }
  return siguiente(state, lang, names, p);
}

/** La puerta desde el relato: un borrador sin ubicar cuyo concepto no
    existe en la estructura abre la creación; el tipo se hereda del
    verbo (pagué = gasto) y NO se pregunta lo ya sabido. Si el concepto
    sí existe (solo falta la sub), no hay nada que crear: null. */
export function crearDesdeRelato(
  state: LedgerState, lang: Lang, names: Namer, draft: RelatoDraft, nombreCrudo?: string,
): CrearStep | null {
  if (draft.categoryId || draft.op === "mover") return null;
  const hit = parecida(state, names, draft.concept);
  if (hit && foldQ(hit.nombre) === foldQ(draft.concept)) {
    return null; // existe con ese nombre: la ubicación es otro problema, no creación
  }
  // El nombre se crea con la ortografía del usuario («Jardinería», con
  // su acento): el concepto del borrador viaja plegado, así que la caja
  // — que guarda el texto tal cual entró — pasa el nombre crudo.
  return crearInicio(state, lang, names, nombreCrudo ?? draft.concept, { tipo: draft.op === "ingreso" ? "ingreso" : "gasto" });
}
