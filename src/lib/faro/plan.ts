/**
 * FARO — La lista-plan (D6, 1.3.357; brief BRIEF-LISTA-PLAN). Puro, sin
 * DOM: la agrupación, las recetas y las lecturas del plan.
 *
 * Las decisiones del constructor, declaradas (brief §4.2 y §4.4):
 * - La agrupación vive DENTRO del contrato de borradores: las filas de un
 *   plan son Draft kind "plan" con su planId, en la misma bandeja; el
 *   registro PlanList del libro es solo el índice mientras la lista vive.
 * - Al cerrar, las filas se escriben en el registro como foto (PlanRow[])
 *   junto a su resumen: el folio intocable del Archivo mayor. Reanudar
 *   crea una lista NUEVA que hereda el nombre y las filas que no se
 *   compraron ni salieron (después + no había); lo comprado ya es dinero
 *   y lo que salió, salió contado.
 * - El guardián de kind vive en la librería (drafts.ts): la mesa jamás
 *   convierte un plan. La única conversión es la ceremonia de cierre de
 *   esta librería, que convierte lo comprado en borradores de LÍNEA —
 *   nunca plan y línea gemelos por la misma fila.
 * - El día real manda: marcar comprado fija el día de la compra en la
 *   fila, no el día en que se planeó (cerca §7.5 del brief).
 * - La casa común con la lista de espera (5c) se declara aquí: cuando
 *   llegue, sus deseos vivirán en la misma sección «Planes» de la hoja de
 *   la bandeja y bajo el mismo envoltorio — otra forma, la misma casa.
 */
import { validateDraft } from "./drafts.ts";
import { lineDay } from "./people.ts";
import { uid } from "./money.ts";
import { normName } from "./subs.ts";
import type { Currency, Draft, LedgerState, PlanList, PlanRow } from "./types.ts";

/* ------------------------------------------------------------- lecturas */

/** CERRADO se lee de una fecha real, no de la ausencia (cura de la ola
 * 23, G23-4): un plan está cerrado si y solo si su closedAt es un texto
 * no vacío. La lectura anterior (`closedAt !== ""`) leía un closedAt
 * AUSENTE como cerrado: el plan desaparecía de los vivos y sus filas
 * quedaban huérfanas en silencio. Y las entradas que no son objetos se
 * saltan con desconfianza, como leen los lectores de drafts.ts: la
 * puerta de paquetes (defaults.ts) ya rechaza esos paquetes, y esto es
 * la segunda red, no la única. */
export function planIsClosed(p: PlanList): boolean {
  return !!p && typeof p === "object" && typeof p.closedAt === "string" && p.closedAt !== "";
}

export function planIsLive(p: PlanList): boolean {
  return !!p && typeof p === "object" && !planIsClosed(p);
}

export function livePlans(state: LedgerState): PlanList[] {
  return (state.plans ?? []).filter((p) => planIsLive(p));
}

export function closedPlans(state: LedgerState): PlanList[] {
  return (state.plans ?? []).filter((p) => planIsClosed(p));
}

export function planRows(state: LedgerState, planId: string): Draft[] {
  return (state.drafts ?? []).filter((d) => d.kind === "plan" && d.planId === planId);
}

/** Los dos totales del plan, sin mezclarse jamás (diseño §4.1): el
 * estimado suma SOLO las filas con precio (pendientes y compradas) y
 * declara su cobertura; el real suma solo lo comprado. Por moneda, como
 * los totales del bache. Ninguna de las dos cifras toca un total del
 * libro: el plan es dinero todavía no. */
export function planTotals(rows: Draft[]): {
  est: { currency: string; minor: number }[];
  real: { currency: string; minor: number }[];
  priced: number; bought: number; total: number;
} {
  const estBy = new Map<string, number>();
  const realBy = new Map<string, number>();
  let priced = 0;
  let bought = 0;
  for (const d of rows) {
    const st = d.planState ?? "pending";
    if (d.estMinor != null && d.estMinor > 0 && st !== "gone" && st !== "later") {
      priced++;
      const cur = d.currency ?? "USD";
      estBy.set(cur, (estBy.get(cur) ?? 0) + d.estMinor);
    }
    if (st === "bought") {
      bought++;
      if (d.amountMinor != null && d.currency != null) {
        realBy.set(d.currency, (realBy.get(d.currency) ?? 0) + d.amountMinor);
      }
    }
  }
  const pack = (m: Map<string, number>) => [...m.entries()].map(([currency, minor]) => ({ currency, minor })).sort((a, b) => a.currency.localeCompare(b.currency));
  return { est: pack(estBy), real: pack(realBy), priced, bought, total: rows.length };
}

/** El último precio PROPIO de un concepto: la línea viva más reciente del
 * libro con ese concepto (compras y gastos), con su día. Fabricación
 * cero: si el usuario nunca lo compró, no hay estimado — y eso se dice,
 * no se esconde (cerca §7.6). La tienda, si la línea la nombra, afina:
 * una línea de la misma tienda gana a una del mismo concepto sin ella. */
export function ownPrice(state: LedgerState, concept: string, storeId?: string): { minor: number; currency: Currency; on: string } | null {
  const key = normName(concept);
  if (!key) return null;
  let best: { minor: number; currency: Currency; on: string; store: boolean } | null = null;
  for (const bucket of Object.values(state.months)) {
    for (const l of bucket.lines) {
      if (!l.active || l.rest || l.xfer) continue;
      if (l.kind !== "purchase" && l.kind !== "expense-variable" && l.kind !== "expense-fixed") continue;
      if (!(l.amountMinor > 0)) continue;
      if (normName(l.concept) !== key) continue;
      const on = lineDay(l);
      if (!on) continue;
      const store = !!storeId && l.storeId === storeId;
      if (!best || on > best.on || (on === best.on && store && !best.store)) {
        best = { minor: l.amountMinor, currency: l.currency, on, store };
      }
    }
  }
  return best ? { minor: best.minor, currency: best.currency, on: best.on } : null;
}

/* -------------------------------------------------------------- recetas */

/** Nace la lista: su registro-índice. Las filas llegan después como
 * borradores del plan (addDrafts con kind "plan" y este planId). El id
 * puede venir dado (la puerta lo acuña antes de su commit para nombrar
 * las filas en la misma pasada). */
export function createPlan(state: LedgerState, name: string, now: string, id?: string): { state: LedgerState; plan: PlanList } {
  const plan: PlanList = { id: id ?? uid(), name: name.trim() || "Lista plan", createdAt: now, closedAt: "", rows: [] };
  return { state: { ...state, plans: [...(state.plans ?? []), plan] }, plan };
}

/** Marcar comprado — la receta con nombre del acto (brief §4.3): la fila
 * gana su monto real y su DÍA REAL de compra; el estimado queda guardado
 * junto a la fila para medir la diferencia al cierre. La fila sigue
 * siendo del plan: la conversión a línea es de la ceremonia de cierre.
 * Sin monto (null) la fila nace comprada «sin monto» (diseño §3.2): el
 * monto se pone en la fila o llega a la mesa como duda con su
 * herramienta — nunca un bloqueo en la tienda. */
export function markBought(state: LedgerState, draftId: string, realMinor: number | null, currency: Currency, today: string): LedgerState {
  const cur = state.drafts ?? [];
  const at = cur.findIndex((d) => d.id === draftId && d.kind === "plan");
  if (at < 0 || (realMinor != null && !(realMinor > 0))) return state;
  const next: Draft = { ...cur[at], planState: "bought", amountMinor: realMinor, currency, sign: "out", day: today };
  const drafts = [...cur];
  drafts[at] = next;
  return { ...state, drafts };
}

/** Compré menos (brief P3): la fila se parte — lo comprado sigue como
 * comprado con su monto real, y el resto nace como fila pendiente nueva
 * de la misma lista, con el concepto que el usuario nombra para el resto
 * (por defecto, el mismo). Nada de filas duplicadas para la diferencia:
 * son dos filas con dos verdades distintas. */
export function markBoughtLess(state: LedgerState, draftId: string, realMinor: number, currency: Currency, today: string, restConcept: string, now: string): LedgerState {
  const cur = state.drafts ?? [];
  const at = cur.findIndex((d) => d.id === draftId && d.kind === "plan");
  if (at < 0 || !(realMinor > 0)) return state;
  const src = cur[at];
  const bought: Draft = { ...src, planState: "bought", amountMinor: realMinor, currency, sign: "out", day: today };
  const rest: Draft = {
    ...src, id: uid(), planState: "pending", amountMinor: null,
    concept: restConcept.trim() || src.concept, createdAt: now, estMinor: null, estOn: undefined,
  };
  const drafts = [...cur];
  drafts[at] = bought;
  drafts.splice(at + 1, 0, rest);
  return { ...state, drafts };
}

/** El estado de compra de una fila que no se compró: después, no había,
 * o de vuelta a pendiente (tocar una fila comprada la devuelve, sin
 * preguntas — su monto real se cae, el estimado queda). */
export function markPlanState(state: LedgerState, draftId: string, st: "pending" | "later" | "gone"): LedgerState {
  const cur = state.drafts ?? [];
  const at = cur.findIndex((d) => d.id === draftId && d.kind === "plan");
  if (at < 0) return state;
  const next: Draft = st === "pending"
    ? { ...cur[at], planState: "pending", amountMinor: null }
    : { ...cur[at], planState: st };
  const drafts = [...cur];
  drafts[at] = next;
  return { ...state, drafts };
}

export type CloseDest = "next" | "archive" | "out";

/** LA CEREMONIA DE CIERRE (brief P5): una sola receta, una transacción.
 * - Lo comprado se convierte en borradores de LÍNEA en la bandeja (la
 *   mesa de siempre los recibe; llevan su procedencia en la nota) y sale
 *   del plan: nunca gemelos.
 * - Lo que quedó toma su destino: por fila si el mapa lo nombra; si no,
 *   «después» va a la lista siguiente y «no había» se archiva con el plan
 *   (los preseleccionados del diseño §7.2). Lo de la lista siguiente nace
 *   como plan nuevo con el mismo nombre; lo archivado queda en la foto;
 *   lo que sale, sale contado en el resumen.
 * - El registro gana su foto y su resumen: el folio intocable.
 * Devuelve el estado nuevo y cuántas líneas nacieron a la mesa. */
export function closePlan(state: LedgerState, planId: string, destOf: Record<string, CloseDest>, today: string, now: string):
  { state: LedgerState; born: number; nextPlanId: string | null } {
  const plan = (state.plans ?? []).find((p) => p.id === planId && planIsLive(p));
  if (!plan) return { state, born: 0, nextPlanId: null };
  const rows = planRows(state, planId);
  const keptDrafts: Draft[] = (state.drafts ?? []).filter((d) => !(d.kind === "plan" && d.planId === planId));
  const bornLines: Draft[] = [];
  const nextRows: Draft[] = [];
  const photo: PlanRow[] = [];
  let estMinor = 0, realMinor = 0;
  const currency: Currency = rows.find((d) => d.currency)?.currency ?? state.settings.display ?? "USD";
  for (const d of rows) {
    const st = d.planState ?? "pending";
    if (d.estMinor != null && d.estMinor > 0 && st !== "gone" && st !== "later" && (d.currency ?? currency) === currency) estMinor += d.estMinor;
    if (st === "bought") {
      if (d.amountMinor != null && d.currency === currency) realMinor += d.amountMinor;
      const bornDraft: Draft = {
        ...d,
        kind: "line",
        planId: undefined,
        planState: undefined,
        estMinor: undefined,
        estOn: undefined,
        note: [d.note, `del plan: ${plan.name}`].filter(Boolean).join(" · "),
        missing: [],
      };
      // La duda se deriva, no se decreta: una fila comprada sin monto
      // llega a la mesa en rojo por «amount», con su herramienta (D4).
      bornDraft.missing = validateDraft(bornDraft).missing;
      bornLines.push(bornDraft);
      photo.push({ concept: d.concept, note: d.note, state: "bought", amountMinor: d.amountMinor, currency: d.currency, estMinor: d.estMinor ?? null, day: d.day });
      continue;
    }
    // El estado de la foto nombra el CUBO final de la fila (cerca §7.7 del
    // brief: comprado + no había + después + fuera = filas, por
    // construcción): a la siguiente → «después»; fuera → «fuera»;
    // archivado → «no había» si la marca lo era, y si no, «fuera» (la
    // superficie no ofrece archivar una fila pendiente: ofrece siguiente
    // o fuera; la receta se queda total por seguridad).
    const dest: CloseDest = destOf[d.id] ?? (st === "gone" ? "archive" : "next");
    const bucket: PlanRow["state"] = dest === "next" ? "later" : dest === "out" ? "out" : st === "gone" ? "gone" : "out";
    if (dest === "next") {
      nextRows.push({ ...d, id: uid(), planState: "pending", amountMinor: null, createdAt: now });
    }
    photo.push({ concept: d.concept, note: d.note, state: bucket, amountMinor: null, currency: d.currency, estMinor: d.estMinor ?? null, day: d.day });
  }
  const count = (s: PlanRow["state"]) => photo.filter((r) => r.state === s).length;
  const closed: PlanList = {
    ...plan,
    closedAt: now,
    rows: photo,
    summary: { bought: count("bought"), later: count("later"), gone: count("gone"), out: count("out"), estMinor, realMinor, currency },
  };
  let plans = (state.plans ?? []).map((p) => (p.id === planId ? closed : p));
  let nextPlanId: string | null = null;
  let drafts = [...keptDrafts, ...bornLines];
  if (nextRows.length) {
    const np: PlanList = { id: uid(), name: plan.name, createdAt: now, closedAt: "", rows: [] };
    nextPlanId = np.id;
    plans = [...plans, np];
    drafts = [...drafts, ...nextRows.map((d) => ({ ...d, planId: np.id }))];
  }
  return { state: { ...state, plans, drafts }, born: bornLines.length, nextPlanId };
}

/** Reanudar desde el folio (brief P6): una lista NUEVA que hereda el
 * nombre y las filas que no se compraron ni salieron — después y no
 * había vuelven como pendientes, con su estimado. El folio no se toca:
 * sigue siendo el documento de aquel cierre. */
export function resumePlan(state: LedgerState, folioId: string, today: string, now: string): { state: LedgerState; planId: string | null } {
  const folio = (state.plans ?? []).find((p) => p.id === folioId && planIsClosed(p));
  if (!folio) return { state, planId: null };
  const np: PlanList = { id: uid(), name: folio.name, createdAt: now, closedAt: "", rows: [] };
  const rows: Draft[] = folio.rows
    .filter((r) => r.state === "later" || r.state === "gone")
    .map((r) => ({
      id: uid(), source: "list" as const, kind: "plan" as const, planId: np.id, planState: "pending" as const,
      raw: r.concept, createdAt: now, day: today, sign: "out" as const,
      amountMinor: null, currency: r.currency, concept: r.concept, note: r.note,
      book: "purchase" as const, estMinor: r.estMinor, unsure: [], missing: [],
    }));
  return {
    state: { ...state, plans: [...(state.plans ?? []), np], drafts: [...(state.drafts ?? []), ...rows] },
    planId: np.id,
  };
}

/** Borrar el folio para siempre: el acto aparte y explícito de siempre
 * (la superficie pide su confirmación). Solo folios cerrados. */
export function dropPlan(state: LedgerState, planId: string): LedgerState {
  const cur = state.plans ?? [];
  if (!cur.some((p) => p.id === planId && planIsClosed(p))) return state;
  return { ...state, plans: cur.filter((p) => p.id !== planId) };
}
