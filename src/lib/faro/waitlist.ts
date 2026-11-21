/**
 * waitlist.ts — la lista de espera (5c, 1.3.360): el freno de impulso.
 *
 * Un deseo no esencial se anota con su precio y su tienda y espera el
 * plazo del usuario. Los deseos viven en el libro, FUERA de months
 * (state.wishes): ningún total, estudio ni lectura los ve — son dinero
 * todavía no, como la bandeja, y viajan con el libro (D1). Cada deseo
 * guarda SU plazo (la foto del ajuste al nacer): cambiar el ajuste jamás
 * mueve una espera en curso. Cumplido el plazo, el Asesor pregunta una
 * vez «¿Todavía lo quieres?» — una por plazo: la MARCA de ya preguntado
 * vive en el aparato, atada al libro (abajo, la casa de la marca); el
 * hecho puede sellarse en el libro (askedAt) por un acto deliberado,
 * pero ninguna pantalla lo escribe al mostrarse y el candado no vive
 * en el libro (cura de la ola 24, Q24-C1); la primera renovación
 * rearma, la segunda hace el deseo permanente.
 *
 * El escenario («¿Qué pasaría si lo compro?») se calcula con los motores
 * de siempre — readAdvisor para el mes y savingsStock para el colchón —
 * así que la tarjeta jamás contradice las pantallas. Comprar no guarda
 * nada por su cuenta: nace el borrador en la bandeja (source "wish") y
 * la mesa decide (cerca 2 del diseño). La cuenta del año se DERIVA de
 * los deseos cerrados — nunca se almacena — y cuadra por construcción:
 * ahorrado = Σ deseos dejados con precio, ni uno más.
 */
import { readAdvisor } from "./advisor.ts";
import { makeNamer } from "./defaults.ts";

type Namer = ReturnType<typeof makeNamer>;
import { savingsStock } from "./savings.ts";
import { hostAccounts, libreOf } from "./funds.ts";
import { convertMinor, formatMoney } from "./money.ts";
import type { Currency, Draft, Lang, LedgerState, Wish } from "./types.ts";

/** Los pasos cerrados del ajuste (fallo de Oscar, 2026-11-20). */
export const WAIT_STEPS = [24, 48, 72, 168] as const;
export const WAIT_DEFAULT = 48;

/** El plazo vigente para los deseos NUEVOS: el ajuste, saneado a un paso. */
export function waitHoursOf(state: LedgerState): number {
  const v = state.settings.waitHours;
  return typeof v === "number" && (WAIT_STEPS as readonly number[]).includes(v) ? v : WAIT_DEFAULT;
}

/** Lectura con desconfianza (la forma que isLedgerDeep promete): solo los
 * deseos con la forma que los motores desreferencian. */
export function wishesOf(state: LedgerState): Wish[] {
  const raw = state.wishes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((w): w is Wish =>
    !!w && typeof w === "object"
    && typeof (w as Wish).id === "string" && typeof (w as Wish).concept === "string"
    && typeof (w as Wish).createdAt === "string" && typeof (w as Wish).dueAt === "string"
    && typeof (w as Wish).status === "string");
}

export function waitingWishes(state: LedgerState): Wish[] {
  return wishesOf(state).filter((w) => w.status === "waiting");
}

/** ¿Venció su plazo y aún espera respuesta? (los permanentes no vencen). */
export function isRipe(w: Wish, now: Date): boolean {
  return w.status === "waiting" && !w.permanent && now.getTime() >= new Date(w.dueAt).getTime();
}

/** Lo que le queda de espera, en ms (≤ 0 = vencido), y su fracción. */
export function remainingMs(w: Wish, now: Date): number {
  return new Date(w.dueAt).getTime() - now.getTime();
}
export function remainingFraction(w: Wish, now: Date): number {
  const total = w.waitHours * 3600_000;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, remainingMs(w, now) / total));
}

let wishSeq = 0;
function wishId(now: Date): string {
  wishSeq += 1;
  return `wish-${now.getTime().toString(36)}-${wishSeq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function addWish(
  state: LedgerState,
  input: { concept: string; amountMinor: number | null; currency: Currency; store: string; link?: string },
  now: Date,
): { state: LedgerState; wish: Wish } {
  const hours = waitHoursOf(state);
  const wish: Wish = {
    id: wishId(now),
    concept: input.concept.trim(),
    amountMinor: input.amountMinor != null && Number.isFinite(input.amountMinor) && input.amountMinor > 0 ? Math.trunc(input.amountMinor) : null,
    currency: input.currency,
    store: input.store.trim(),
    createdAt: now.toISOString(),
    waitHours: hours,
    dueAt: new Date(now.getTime() + hours * 3600_000).toISOString(),
    askedAt: "",
    renewals: 0,
    permanent: false,
    status: "waiting",
    closedAt: "",
    ...(input.link ? { link: input.link } : {}),
  };
  return { state: { ...state, wishes: [...wishesOf(state), wish] }, wish };
}

/** El precio mirado de nuevo (5c §3.3): guarda UNA lectura en línea por
 * espera — atada a su dueAt; una segunda lectura para la misma espera no
 * pisa la primera, y renovar (dueAt nuevo) la rearma sola. Sin enlace o
 * sin espera viva, no hay nada que mirar. */
export function lookWish(
  state: LedgerState,
  id: string,
  look: { priceMinor: number; currency: Currency; at: string },
): LedgerState {
  const list = wishesOf(state);
  const w = list.find((x) => x.id === id);
  if (!w || !w.link || w.status !== "waiting") return state;
  if (w.look && w.look.forDue === w.dueAt) return state;
  const next = { ...w, look: { ...look, forDue: w.dueAt } };
  return { ...state, wishes: list.map((x) => (x.id === id ? next : x)) };
}

function patchWish(state: LedgerState, id: string, patch: Partial<Wish>): LedgerState {
  return { ...state, wishes: wishesOf(state).map((w) => (w.id === id ? { ...w, ...patch } : w)) };
}

/** El HECHO de la pregunta, en el libro: «se preguntó el día X» (askedAt).
 * Es un dato, no un candado: lo estampa un acto deliberado que lo quiera
 * registrar, y Deshacer puede retirarlo como retira cualquier anotación.
 * Ninguna pantalla lo escribe al mostrarse — hasta la cura de la ola 24
 * la sección lo sellaba con un commit ordinario desde su efecto, y el
 * Deshacer peleaba contra el efecto montado: deshacía el sello de
 * arriba y el efecto lo resellaba con marca nueva, con la pila entera
 * bajo los sellos inalcanzable (Q24-C1 de Cambios). El candado — «ya
 * preguntado por ESTE plazo» — vive en el aparato, en la casa de abajo. */
export function askStamp(state: LedgerState, id: string, now: Date): LedgerState {
  const w = wishesOf(state).find((x) => x.id === id);
  if (!w || w.askedAt) return state;
  return patchWish(state, id, { askedAt: now.toISOString() });
}

/* ═══ OLA 24 (Q24-C1): LA MARCA DE LA PREGUNTA VIVE EN EL APARATO ═══
 * La misma casa que la cura 23 eligió para el sello del autopay: fuera
 * del libro, en el almacenamiento del aparato, atada al libro por su
 * uid — el Deshacer reescribe el libro y no toca esta casa, así que la
 * marca aguanta lo que el Deshacer haga y ningún efecto pelea con él.
 * La marca guarda, por deseo, el PLAZO (su dueAt) por el que ya se
 * preguntó: renovar cambia el dueAt y la pregunta se rearma sola, sin
 * que nadie tenga que desmarcar nada. Mostrar la lista escribe SOLO
 * esta marca — jamás un commit — y la pregunta se hace una vez por
 * plazo. Si el aparato no guarda la marca, la pregunta puede repetirse
 * en otra visita: un daño menor y dicho, nunca una pila bloqueada. */
export interface WishAskStorage {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
}

export function wishAskKey(userId: string): string {
  return `faro-wish-asked.${userId}`;
}

/** Las marcas del libro, leídas con desconfianza: mapa deseo → dueAt. */
export function wishAskMarks(storage: WishAskStorage, userId: string): Record<string, string> {
  try {
    const raw = storage.read(wishAskKey(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** ¿Ya se preguntó por ESTE deseo en ESTE plazo? */
export function wishAskedFor(storage: WishAskStorage, userId: string, wish: Wish): boolean {
  return wishAskMarks(storage, userId)[wish.id] === wish.dueAt;
}

/** Marcar los deseos como ya preguntados por su plazo actual. */
export function markWishAsked(storage: WishAskStorage, userId: string, wishes: Wish[]): void {
  if (!wishes.length) return;
  const marks = wishAskMarks(storage, userId);
  for (const w of wishes) marks[w.id] = w.dueAt;
  try {
    storage.write(wishAskKey(userId), JSON.stringify(marks));
  } catch {
    /* El aparato no guarda: la marca degrada a esta visita (declarado
     * en la doctrina de arriba); el libro jamás se entera. */
  }
}

/** «Dame más tiempo»: la primera renovación rearma el plazo (con SU
 * plazo, no el del ajuste de hoy); la segunda lo hace permanente. */
export function renewWish(state: LedgerState, id: string, now: Date): LedgerState {
  const w = wishesOf(state).find((x) => x.id === id);
  if (!w || w.status !== "waiting" || w.permanent) return state;
  if (w.renewals >= 1) return patchWish(state, id, { permanent: true, askedAt: now.toISOString() });
  return patchWish(state, id, {
    renewals: w.renewals + 1,
    askedAt: "",
    dueAt: new Date(now.getTime() + w.waitHours * 3600_000).toISOString(),
  });
}

/** «Lo dejo»: dinero no gastado — suma a la cuenta del año. */
export function leaveWish(state: LedgerState, id: string, now: Date): LedgerState {
  const w = wishesOf(state).find((x) => x.id === id);
  if (!w || w.status !== "waiting") return state;
  return patchWish(state, id, { status: "left", closedAt: now.toISOString() });
}

/** Borrar un deseo (la soberanía del usuario; la cara arma el toque). */
export function dropWish(state: LedgerState, id: string): LedgerState {
  return { ...state, wishes: wishesOf(state).filter((w) => w.id !== id) };
}

/** La herramienta del «sin precio todavía» (D4): poner o corregir el precio. */
export function setWishPrice(state: LedgerState, id: string, amountMinor: number, currency: Currency): LedgerState {
  if (!Number.isFinite(amountMinor) || amountMinor <= 0) return state;
  return patchWish(state, id, { amountMinor: Math.trunc(amountMinor), currency });
}

/**
 * «Lo compro»: el deseo entra por la Puerta de captura ya rellenado —
 * nace el borrador en la bandeja (source "wish", libro purchase, la
 * tienda en su nota y en su store cuando la pieza existe no se adivina:
 * store queda como texto en la nota) y el deseo se marca bought, en UNA
 * sola mutación. Nada se guarda en el libro: la mesa decide (cerca 2).
 */
export function buyWish(
  state: LedgerState,
  id: string,
  now: Date,
  edit?: { concept: string; amountMinor: number | null; currency: Currency; store: string },
): { state: LedgerState; draft: Draft | null } {
  const found = wishesOf(state).find((x) => x.id === id);
  if (!found || found.status !== "waiting") return { state, draft: null };
  // La hoja de compra viene prerrellenada y el usuario puede corregir el
  // monto real: lo que entra a la bandeja es lo que la hoja dice al guardar.
  const w: Wish = edit
    ? { ...found, concept: edit.concept.trim() || found.concept, amountMinor: edit.amountMinor, currency: edit.currency, store: edit.store.trim() }
    : found;
  const today = now.toISOString().slice(0, 10);
  const draft: Draft = {
    id: `d-${w.id}`,
    source: "wish",
    kind: "line",
    raw: w.concept,
    createdAt: now.toISOString(),
    day: today,
    sign: "out",
    amountMinor: w.amountMinor,
    currency: w.amountMinor != null ? w.currency : null,
    concept: w.concept,
    note: w.store ? (state.settings.lang === "en" ? `Store: ${w.store}` : `Tienda: ${w.store}`) : "",
    book: "purchase",
    unsure: [],
    missing: w.amountMinor == null ? ["amount"] : [],
  };
  const next = patchWish(state, id, { status: "bought", closedAt: now.toISOString() });
  return { state: { ...next, drafts: [...(next.drafts ?? []), draft] }, draft };
}

/** La cuenta del año, derivada: lo ahorrado y sus piezas. */
export type YearAccount = {
  saved: { currency: Currency; minor: number }[];
  pieces: Wish[];
};
export function yearAccount(state: LedgerState, year: number): YearAccount {
  const closed = wishesOf(state).filter((w) =>
    (w.status === "left" || w.status === "bought")
    && w.closedAt.slice(0, 4) === String(year));
  const byCur = new Map<Currency, number>();
  for (const w of closed) {
    if (w.status === "left" && w.amountMinor != null) {
      byCur.set(w.currency, (byCur.get(w.currency) ?? 0) + w.amountMinor);
    }
  }
  return {
    saved: [...byCur.entries()].map(([currency, minor]) => ({ currency, minor })),
    pieces: closed.sort((a, b) => (a.closedAt < b.closedAt ? 1 : -1)),
  };
}

/**
 * El escenario del deseo sobre el mes en curso, con los motores de
 * siempre. Devuelve las frases en el idioma pedido, o null sin precio
 * (sin precio no hay escenario — la tarjeta lo dice). `deep` añade la
 * cuenta que lo cubre (la profundidad del Asesor en su modo).
 */
export function wishScenario(
  state: LedgerState,
  key: string,
  wish: Wish,
  lang: Lang,
  names: Namer,
  today: Date,
  deep: boolean,
): string[] | null {
  if (wish.amountMinor == null) return null;
  const { display, rateE4 } = state.settings;
  const price = convertMinor(wish.amountMinor, wish.currency, display, rateE4);
  const money = (n: number) => formatMoney(n, display, lang);
  const reading = readAdvisor(state, key, lang, names, { today });
  const leftAfter = reading.left - price;
  const lines: string[] = [];
  if (leftAfter >= 0) {
    lines.push(lang === "en"
      ? `If you buy it today, you would have ${money(leftAfter)} left this month.`
      : `Si lo compras hoy, te quedan ${money(leftAfter)} este mes.`);
  } else {
    const short = -leftAfter;
    const stock = savingsStock(state, key);
    lines.push(lang === "en"
      ? `This month alone does not cover it: you would be ${money(short)} short.`
      : `Este mes solo no lo cubre: te faltarían ${money(short)}.`);
    if (stock.total >= short) {
      lines.push(lang === "en"
        ? `It would come out of what you have set aside (${money(stock.total)} in total), leaving ${money(stock.total - short)}.`
        : `Saldría de lo que tienes apartado (${money(stock.total)} en total) y quedarían ${money(stock.total - short)}.`);
    } else if (stock.total > 0) {
      lines.push(lang === "en"
        ? `Even with everything you have set aside (${money(stock.total)}), you would still be ${money(short - stock.total)} short.`
        : `Ni con todo lo que tienes apartado (${money(stock.total)}) alcanza: faltarían ${money(short - stock.total)}.`);
    }
  }
  if (deep) {
    const stock = savingsStock(state, key);
    const host = hostAccounts(state, key, stock)
      .map((h) => ({ id: h.id, libre: libreOf(stock, h.id) }))
      .filter((h) => h.libre >= price)
      .sort((a, b) => b.libre - a.libre)[0];
    if (host) {
      lines.push(lang === "en"
        ? `Your ${names.sub(host.id)} account could cover it from its free ${money(host.libre)}.`
        : `Tu cuenta ${names.sub(host.id)} podría cubrirlo con su libre de ${money(host.libre)}.`);
    }
  }
  return lines;
}
