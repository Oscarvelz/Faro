/**
 * FARO — Captura Inteligente, Ola 1: la bandeja y su contrato (brief
 * BRIEF-OLA-1 §5-P1). Puro, sin DOM: la única forma de borrador, sus estados,
 * su conversión a línea y las recetas de estado de la bandeja.
 *
 * Las leyes del contrato (cerca §7.2):
 * - Un Draft jamás se convierte en línea sin pasar por la mesa y un commit
 *   del usuario; `draftToLine` se niega (null) si el borrador está en rojo.
 * - Guardar un borrador lo retira de la bandeja en la misma receta que crea
 *   su línea: nunca existen los dos.
 * - `raw` es intocable tras la creación.
 * - La bandeja vive fuera de months: ningún total puede verla (cerca reina).
 */
import { dayGap, importBook, learnRule, lineDay, matchKey, merchantKey, merchantLabel, similarKeys } from "./bankbook.ts";
import { displayName } from "./defaults.ts";
import { uid } from "./money.ts";
import { isRealDay } from "./quickadd.ts";
import { upsertLine } from "./reducer.ts";
import { normName } from "./subs.ts";
import type { Cadence, Draft, Lang, LedgerState, Line, Structure } from "./types.ts";

/** El contexto que la conversión necesita y el estado no lleva: el mes
 * abierto al guardar (la conducta viva del escaneo: la línea cae en el mes
 * en curso con su bookedOn en el día del movimiento), la Estructura para
 * validar la casa y el idioma para casar la tienda por su nombre visible. */
export type DraftCtx = { monthKey: string; structure: Structure; lang: Lang };

/** La fuente única de los estados. `missing` se deriva de los valores:
 * monto nulo o ≤ 0, moneda nula, signo nulo, día no real (la regla de
 * quickadd, PJ-9). `unsure` es lo que el productor adivinó y el usuario aún
 * no confirma: vive en el borrador y `patchDraft` lo limpia campo a campo. */
export function validateDraft(d: Draft): { unsure: string[]; missing: string[] } {
  const missing: string[] = [];
  if (d.amountMinor == null || d.amountMinor <= 0) missing.push("amount");
  if (d.currency == null) missing.push("currency");
  if (d.sign == null) missing.push("sign");
  if (!isRealDay(d.day)) missing.push("day");
  return { unsure: [...d.unsure], missing };
}

/** La conversión única a línea del libro — la misma línea que el escaneo
 * guardaba desde DraftCard (su save() es la conducta que se preserva):
 * la tienda de una compra se casa por el concepto, la casa se valida contra
 * la Estructura de su libro, la suscripción lleva su cadencia y su próximo
 * cobro, y todo cae en el mes abierto con bookedOn en el día del borrador. */
export function draftToLine(d: Draft, ctx: DraftCtx): Line | null {
  if (validateDraft(d).missing.length > 0) return null;
  const st = ctx.structure;
  const kind = d.book;
  const sub = kind === "subscription";
  const fixed = kind === "expense-fixed";
  const store = kind === "purchase"
    ? (d.store && st.catalog.some((s) => s.id === d.store && s.kind === "store" && !s.hidden)
      ? st.catalog.find((s) => s.id === d.store)
      : st.catalog.find((s) => s.kind === "store" && !s.hidden && normName(d.concept).includes(normName(displayName(s, ctx.lang)))))
    : undefined;
  const catOk = kind === "purchase"
    ? st.purchases.some((p) => p.id === d.cat)
    : kind === "expense-variable"
      ? st.categories.some((p) => p.id === d.cat && p.group === "variable")
      : kind === "expense-fixed"
        ? st.categories.some((p) => p.id === d.cat && p.group === "fixed")
        : false;
  return {
    id: uid(), seriesId: uid(), monthKey: ctx.monthKey, kind,
    concept: d.concept.trim(), amountMinor: d.amountMinor!, currency: d.currency!,
    active: true, note: d.note.trim(),
    categoryId: catOk ? (d.cat ?? "") : "",
    subId: catOk && kind === "expense-variable" ? (d.sub ?? "") : "",
    recurring: sub || fixed, storeId: store?.id ?? "", providerId: "", productCode: "", productUrl: "",
    cadence: (sub || fixed ? (d.cadence as Cadence) || "monthly" : "") as Cadence,
    nextDue: sub ? d.day : "",
    aprBps: 0, balanceMinor: null, balanceCurrency: d.currency!, icon: sub ? (d.icon ?? "") : "", history: [],
    bookedOn: sub ? "" : d.day, startedOn: "",
  };
}

/** Los totales del bache para el pie de la mesa, por moneda y signo. Jamás
 * se suman a ningún total del libro: son dinero todavía no.
 *
 * EL GUARDIÁN DE KIND (D6, 1.3.357; brief §4.4): las recetas de conversión
 * y totales de esta librería operan SOLO sobre líneas. Las filas del plan
 * (kind "plan") tienen su propia librería (plan.ts) y su propia ceremonia;
 * el guardián vive aquí, en la librería, no como disciplina de superficie:
 * draftTotals las ignora, findDup no las casa y commitDrafts jamás las
 * convierte — un plan solo se vuelve línea por la receta de su cierre. */
export function draftTotals(ds: Draft[]): { currency: string; inMinor: number; outMinor: number }[] {
  const by = new Map<string, { inMinor: number; outMinor: number }>();
  for (const d of ds) {
    if (d.kind !== "line") continue;
    if (d.currency == null || d.amountMinor == null) continue;
    const row = by.get(d.currency) ?? { inMinor: 0, outMinor: 0 };
    if (d.sign === "in") row.inMinor += d.amountMinor;
    else if (d.sign === "out") row.outMinor += d.amountMinor;
    by.set(d.currency, row);
  }
  return [...by.entries()].map(([currency, r]) => ({ currency, ...r })).sort((a, b) => a.currency.localeCompare(b.currency));
}

/** El duplicado probable de un borrador entre las líneas vivas: el criterio
 * del importador bancario (misma moneda y monto, día a ≤ 4 días, concepto
 * emparentado por la llave común de bankbook). El borrador no nombra cuenta,
 * así que el camino es el del nombre, como el importador cuando la fila
 * tampoco la nombra. */
export function findDup(d: Draft, state: LedgerState): Line | undefined {
  if (d.kind !== "line") return undefined; // el guardián de kind: un plan no se casa con líneas
  if (d.amountMinor == null || d.currency == null || !isRealDay(d.day)) return undefined;
  const key = matchKey(d.concept);
  if (!key) return undefined;
  for (const bucket of Object.values(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active) continue;
      if (l.currency !== d.currency || l.amountMinor !== d.amountMinor) continue;
      if (dayGap(lineDay(l), d.day) > 4) continue;
      if (similarKeys(matchKey(l.concept), key)) return l;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ recetas */

export function addDrafts(state: LedgerState, ds: Draft[]): LedgerState {
  if (!ds.length) return state;
  return { ...state, drafts: [...(state.drafts ?? []), ...ds] };
}

/** Corregir un campo limpia su estado (la conducta de fieldsOf en el
 * escaneo): el parche manda, unsure pierde los campos tocados y missing se
 * re-deriva. `raw`, `id`, `source`, `kind` y `createdAt` no se parchan:
 * son la prueba y la identidad del borrador. */
export function patchDraft(state: LedgerState, id: string, patch: Partial<Draft>): LedgerState {
  const cur = state.drafts ?? [];
  const at = cur.findIndex((d) => d.id === id);
  if (at < 0) return state;
  const { id: _id, source: _s, kind: _k, raw: _r, createdAt: _c, ...safe } = patch;
  const next: Draft = { ...cur[at], ...safe };
  // El vocabulario de estados nombra «amount»; la propiedad se llama amountMinor.
  const ALIAS: Record<string, string> = { amountMinor: "amount" };
  const touched = Object.keys(safe).map((k) => ALIAS[k] ?? k);
  next.unsure = next.unsure.filter((f) => !touched.includes(f));
  next.missing = validateDraft(next).missing;
  const drafts = [...cur];
  drafts[at] = next;
  return { ...state, drafts };
}

export function dropDraft(state: LedgerState, id: string): LedgerState {
  const cur = state.drafts ?? [];
  if (!cur.some((d) => d.id === id)) return state;
  return { ...state, drafts: cur.filter((d) => d.id !== id) };
}

/** Ola 21 (Q21-1): las filas de la mesa abierta que YA NO VIVEN en la
 * bandeja — otra mano las guardó o las descartó mientras la mesa
 * respiraba. La mesa trabaja sobre la foto de su montaje; esta es la
 * sustracción con la que se re-sincroniza contra lo vivo: una fila de
 * la foto cayó si su borrador no está en la bandeja viva Y la persona
 * no la descartó en esta misma mesa (las de `gone` ya las retiró ella:
 * nombrarlas otra vez sería decir dos veces la misma salida). Lo que
 * llega de nuevo NO cae ni entra: la mesa revisa lo que abrió, y la
 * tarjeta — cuyo conteo sí es vivo — lo cuenta al cerrar. Pura: la
 * mesa la usa en su efecto y la cerca la clava en composición. */
export function fallenDrafts(work: Draft[], live: Draft[], gone: ReadonlySet<string>): Draft[] {
  const liveIds = new Set(live.map((d) => d.id));
  return work.filter((d) => !liveIds.has(d.id) && !gone.has(d.id));
}

/** Guardar: crea las líneas de los borradores pedidos y los retira de la
 * bandeja en la misma receta. Un borrador en rojo no se convierte ni por
 * llamada directa (doble candado con draftToLine): se queda esperando.
 *
 * Ola 20 (G20-1): si NINGÚN borrador se convierte — porque ya no vive
 * (otra mano lo guardó o lo descartó) o porque sigue en rojo — el estado
 * vuelve INTACTO, el mismo objeto. El `{...next, drafts: kept}`
 * incondicional de antes fabricaba un objeto nuevo aunque nada se
 * hubiera movido, y quien llamaba por la puerta ordinaria enmarcaba un
 * guardado que no guardó nada: marco, entrada y revisión por cero
 * líneas. La identidad es la señal con la que la mesa (puerta guardada)
 * distingue «aterrizó» de «no pasó nada». */
export function commitDrafts(state: LedgerState, ids: string[], ctx: DraftCtx): LedgerState {
  const want = new Set(ids);
  let next = state;
  let moved = 0;
  const kept: Draft[] = [];
  for (const d of state.drafts ?? []) {
    if (!want.has(d.id)) { kept.push(d); continue; }
    if (d.kind !== "line") { kept.push(d); continue; } // el guardián de kind: la mesa nunca convierte un plan
    const line = draftToLine(d, ctx);
    if (!line) { kept.push(d); continue; }
    next = upsertLine(next, line);
    moved++;
  }
  if (!moved) return state;
  return { ...next, drafts: kept };
}

/** El gancho de aprendizaje (ley 9, su primera instancia): por cada borrador
 * guardado cuya casa final difiere de la sugerida, se aprende la regla por
 * comercio con la mecánica viva de bankbook. La pareja (borrador, línea)
 * trae la verdad de los dos lados: lo sugerido vive en el borrador y lo
 * guardado en la línea. Sin comercio reconocible no se aprende nada. */
export function learnFromSaved(state: LedgerState, saved: { draft: Draft; line: Line; force?: boolean }[]): LedgerState {
  let rules = importBook(state).rules;
  let changed = false;
  for (const { draft, line, force } of saved) {
    const key = merchantKey(draft.concept);
    if (!key) continue;
    const suggested = `${draft.book}|${draft.cat ?? ""}|${draft.sub ?? ""}`;
    const final = `${line.kind}|${line.categoryId}|${line.subId}`;
    if (!force && suggested === final) continue;
    rules = learnRule(rules, key, merchantLabel(draft.concept), final);
    changed = true;
  }
  if (!changed) return state;
  return { ...state, imports: { ...importBook(state), rules } };
}
