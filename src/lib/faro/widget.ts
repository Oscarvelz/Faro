/**
 * Faro for Android home-screen widgets (1.3.121). The web app builds this small, privacy-safe snapshot and hands it to
 * the app (FaroNative.setWidgetData) whenever the ledger changes and when Faro opens; the app keeps it in its own private
 * storage and draws the phone widget and the tablet panel from it. The widgets never touch the network or the account.
 *
 * Rules:
 * - Amounts are integers in minor units (cents), already in the view currency (`cur`), so the app formats them without
 *   converting anything. Days left are counted by the app from the ISO dates, so they stay right after midnight.
 * - Only what the widgets show: no account numbers, no card digits, no people's names, no notes.
 * - Every figure is the one Faro shows: Tengo / Gastaré / Queda / Usado / Pagos come from summarize() (Central),
 *   Me deben / Debo from netBalance() (the scale), the savings total is Central's Ahorros figure (pockets + accounts),
 *   spending by category is Estudio's categorySlices().
 * - 1.3.291 (savings model, §4.5): the photo also carries saveKept / savePledged — the savings total split by the
 *   partition — and each pocket's nature for the light. saveTotal keeps its old meaning on purpose: an old shell
 *   must never read a new figure under the old label.
 */
import { categorySlices, summarize } from "./engine";
import { keptTotal } from "./funds";
import { modeOf, type Mode } from "./mode";
import { paceReading } from "./patron";
import { quickHomesRanked, quickPins, quickStorePins, type QuickHome } from "./quickadd";
import { savingsStock } from "./savings";
import { duesWindow } from "./dues";
import { todaySpend } from "./today";
import { makeNamer } from "./defaults";
import { monthKey } from "./money";
import { netBalance } from "./debts";
import { cardsOf } from "./cards";
import type { Lang, LedgerState } from "./types";

/** Where a tap on the widget lands (routed by the web app, see components/faro/widget-host.tsx). */
export type WidgetGo =
  | "desk" | "pagos" | "cobros" | "add-in" | "add-out" | "tools" | "stats"
  | "income" | "fixed" | "variable" | "shops" | "subs"
  | "vault-save" | "vault-meta" | "vault-retiro" | "vault-emergencia" | "vault-owed" | "vault-owe" | "vault-loans";

export type WidgetDue = { name: string; kind: "cuota" | "card" | "loan"; on: string; amt: number | null; go: WidgetGo };
/** El juicio del patrón de ritmo (1.3.248): la lectura de patron.ts tal cual, en
 *  cifras de vista — estado, veredicto (null mientras aprende) y los montos que la
 *  notificación del shell nombra (gastado, lo que el patrón suele llevar, el cierre
 *  proyectado por el patrón y el ingreso). El shell juzga contra esto, nunca contra
 *  su propia recta; una foto de una página anterior no lo trae y la recta queda
 *  como respaldo exacto. */
export type WidgetPace = { status: "learning" | "ready"; verdict: "under" | "on" | "over" | null; spent: number; expected: number; projected: number; income: number };
export type WidgetCat = { name: string; amt: number; prev: number; save: boolean; go: WidgetGo };
export type WidgetFlow = { key: string; label: string; inn: number; out: number };
/** La naturaleza de un bolsillo en la foto (1.3.291, oleada 5 del modelo de ahorros,
 *  §4.5): la luz que el shell pinta junto al nombre — disco lleno «aparte», anillo
 *  «saldo», disco gris «sin-declarar» (el código de §7). Viaja solo cuando TODAS las
 *  series del bolsillo comparten la misma naturaleza: un bolsillo mezclado (una meta
 *  aparte y otra del saldo bajo la misma bolsa) no lleva el campo — una sola luz no
 *  puede decir dos verdades. El Retiro y las cuentas no lo llevan nunca: la naturaleza
 *  del Retiro es su nombre, y la cuenta es la base misma. */
export type WidgetPocketNature = "aparte" | "saldo" | "sin-declarar";
export type WidgetPocket = { name: string; amt: number; go: WidgetGo; fund?: WidgetPocketNature };

export type WidgetSnapshot = {
  v: 1;
  /** When the web app built it (ISO). */
  at: string;
  lang: Lang;
  /** Etapa 2 (tres modos): el modo de uso de la persona, leído de su libro
   *  (ausente = Completo). La foto lo lleva para que el shell pueda recomponer
   *  su cara por modo (etapa 3.3); en esta etapa es solo fontanería — ningún
   *  bloque de la foto cambia por él — y un shell viejo lo ignora, como ya
   *  ignora saveKept o qsOut. */
  mode: Mode;
  cur: "NIO" | "USD";
  /** Las monedas que el libro conoce, en orden de la tarjeta (1.3.241): primero la de vista,
   *  luego las que sus líneas y saldos usan, y al final la otra moneda del sistema — el
   *  universo de monedas de Faro es exactamente {NIO, USD} (types.ts), así que la lista
   *  siempre permite alternar. La tarjeta + / − recorre ESTA lista al tocar el signo; una
   *  foto vieja no la trae y el shell alterna entre las dos por su cuenta. */
  curs: ("NIO" | "USD")[];
  /** C$ per US$ × 10 000 (Faro's rateE4), its source and date. */
  rateE4: number;
  rateSrc: string;
  rateAsOf: string;
  month: string;
  monthLabel: string;
  /** Hide amounts on the widget (dots; a tap opens Faro, which asks for the fingerprint). */
  hide: boolean;
  /** 1.3.148: the user's Avisos switch from Ajustes — FaroNotify posts nothing while this is false. */
  notify: boolean;
  /** The fingerprint lock is on for this device. */
  lock: boolean;
  /** Central: Tengo, Gastaré, Queda (Tengo − Gastaré), Usado % (null with no income — and, ola 3
   *  BR3-3, null outside Completo: in the photo its only consuming face is the pace tower), Pagos and its signal. */
  have: number;
  spend: number;
  left: number;
  usedPct: number | null;
  /** Etapa 4 (tres modos, X-29): «Puedes gastar hoy» — la cifra de E-1 como
   *  cifra de verdad: la misma fórmula en los tres modos, idéntica entre
   *  modos para el mismo libro (como dues y flow, no es un bloque de cara).
   *  La foto siempre es del mes en curso, así que la cifra siempre viaja;
   *  qué cara nativa la pinta lo decide el shell con el `mode` de la foto
   *  (la cara de Esencial la lleva, CENSO T-1). Un shell viejo la ignora. */
  todaySpend: number;
  pay: number;
  tone: "neutral" | "good" | "warn" | "bad";
  /** Ahorros: saved this month (savings lines), the month's goal (savingsGoalPct of income), the whole savings figure. */
  saveMonth: number;
  saveGoal: number;
  saveTotal: number;
  /** 1.3.291 (modelo de ahorros, §4.5): Lo guardado — el dinero que existe una sola vez
   *  (cuentas + fondos aparte + Retiro + la pila sin declarar leyéndose como aparte) — y
   *  Lo comprometido del saldo, que nunca suma: es una lectura sobre las cuentas.
   *  saveTotal NO se redefine: sigue siendo bolsas + cuentas, la cifra que los shelles
   *  en la calle ya leen con su etiqueta «Ahorros»; los campos nuevos viajan aparte y un
   *  shell viejo los ignora, como ya ignora curs o qsOut. saveKept + savePledged ==
   *  saveTotal, siempre: partir el total no lo mueve. */
  saveKept: number;
  savePledged: number;
  pockets: WidgetPocket[];
  /** The scale: Me deben (lent + card rewards) · Debo (loans + cards). */
  owed: number;
  owe: number;
  /** What is due: overdue cuotas and everything in the next 31 days, by date (at most 8). */
  dues: WidgetDue[];
  /** Spending by category this month (top 5) with last month's figure for the same category. */
  cats: WidgetCat[];
  /** Tengo vs Gastaré for the last six months, this month last. */
  flow: WidgetFlow[];
  /** Apuntes rápidos: las casas que la tarjeta + / − ofrece para cada signo (quickadd.ts).
   *  Solo nombres e ids — la foto sigue sin llevar montos por línea ni notas. */
  qhIn: QuickHome[];
  qhOut: QuickHome[];
  /** 1.3.246: las categorías FIJAS del dueño (settings.widgetPins), validadas contra la
   *  Estructura viva — la tarjeta las pinta primero, con su marca de fija. Las casas por
   *  hábito (qhIn/qhOut) ya vienen SIN ninguna fija y con el hueco relleno: la
   *  deduplicación y el relleno se calculan aquí, una sola vez, para cada superficie. */
  qpIn: QuickHome[];
  qpOut: QuickHome[];
  /** 1.3.251: las fijas del CATÁLOGO (Tiendas e IA), validadas contra el catálogo
   *  vivo — solo gasto: una compra no entra. Viajan aparte de qpOut porque su casa
   *  no es una categoría: cada una trae su pieza en `store` y la tarjeta la pinta
   *  con la marca de su clase. Una foto vieja no las trae y un shell viejo las
   *  ignora: la degradación es limpia en los dos sentidos. */
  qsOut: QuickHome[];
  /** 1.3.248: el patrón de ritmo, calculado por patron.paceReading sobre el libro
   *  ya filtrado por la puerta anti-fuga (su isOut lleva el mismo !rest). */
  pace: WidgetPace;
};

const SAVINGS = "savings";

export function shiftKey(key: string, d: number): string {
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1 + d;
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return monthKey(yy, mm + 1);
}

const isVault = (icon: string) => icon === "vault" || icon.startsWith("vault:");

/** Savings exactly as Central's Ahorros band adds them: pockets (Meta, Retiro, Emergencia, own ones, rest) + accounts.
 * Contrato, regla 3 (R-4): el total es siempre la cifra del motor para las mismas líneas. Solo los bolsillos
 * CON NOMBRE siguen la visibilidad; el dinero de categorías/subconceptos ocultos suma como resto genérico —
 * incluso si la categoría de ahorro entera está oculta, su dinero no desaparece del total.
 * 1.3.147: los montos salen del stock único (savings.ts) — la misma cifra que el colchón del Asesor
 * y la pista de Estudio — atribuidos a bolsillos por la línea que determina cada serie (su saldo,
 * o su depósito más reciente). Antes esto leía solo las líneas del mes en curso, sin deduplicar
 * series: ahorrar en septiembre y abrir octubre sin líneas daba $0. */
export function savingsOf(state: LedgerState, key: string, lang: Lang) {
  const names = makeNamer(state.structure, lang);
  const allCats = state.structure.categories.filter((c) => c.role === SAVINGS);
  const visibleCats = allCats.filter((c) => !c.hidden);
  const namedVaultIds = new Set(visibleCats.flatMap((c) => c.subs.filter((s) => !s.hidden && isVault(s.icon)).map((s) => s.id)));
  const seed = visibleCats.flatMap((c) => c.subs.filter((s) => !s.hidden && !isVault(s.icon)).map((s) => ({ id: s.id, name: names.sub(s.id) })));
  const stock = savingsStock(state, key);
  const buckets = new Map<string, number>();
  const acctPockets = new Map<string, number>();
  // 1.3.291 (§4.5): la naturaleza por bolsillo, leída de la MISMA partición — las clases
  // de las series que caen en cada bolsa. Una bolsa con dos naturalezas no gana luz en
  // la foto (ver WidgetPocketNature); el resto genérico tampoco (mezcla por definición).
  const natures = new Map<string, Set<WidgetPocketNature>>();
  let accounts = 0;
  for (const s of stock.series.values()) {
    if (namedVaultIds.has(s.subId)) { accounts += s.minor; acctPockets.set(s.subId, (acctPockets.get(s.subId) ?? 0) + s.minor); continue; }
    const id = s.subId && seed.some((x) => x.id === s.subId) ? s.subId : "rest";
    buckets.set(id, (buckets.get(id) ?? 0) + s.minor);
    if (id !== "rest" && s.minor !== 0 && (s.cls === "aparte" || s.cls === "saldo" || s.cls === "sin-declarar")) {
      const set = natures.get(id) ?? new Set<WidgetPocketNature>();
      set.add(s.cls);
      natures.set(id, set);
    }
  }
  const natureOf = (id: string): WidgetPocketNature | undefined => {
    const set = natures.get(id);
    return set && set.size === 1 ? [...set][0] : undefined;
  };
  const rest = buckets.get("rest") ?? 0;
  const pockets = seed.map((s) => {
    const fund = natureOf(s.id);
    return { id: s.id, name: s.name, amt: buckets.get(s.id) ?? 0, ...(fund ? { fund } : {}) };
  });
  if (rest !== 0) pockets.push({ id: "rest", name: lang === "en" ? "Savings" : "Ahorros", amt: rest });
  const pocketTotal = pockets.reduce((a, p) => a + p.amt, 0);
  // 1.3.163 (audit D1): the accounts lump, broken down per named vault sub — the widget snapshot
  // lists them as their own pockets so its pocket list can add up to `total` (it never could while
  // the accounts rode along only inside the total).
  const accountPockets = [...acctPockets.entries()].map(([id, amt]) => ({ id, name: names.sub(id), amt }));
  // 1.3.291 (§4.5): el total partido por la partición — kept es la fórmula única de
  // funds.keptTotal sobre este mismo stock (ninguna caminata nueva), pledged su resto.
  return { pockets, pocketTotal, accounts, accountPockets, total: pocketTotal + accounts, kept: keptTotal(stock), pledged: stock.pledged };
}

const goOfPocket = (id: string): WidgetGo => (id.endsWith(".meta") ? "vault-meta" : id.endsWith(".retiro") ? "vault-retiro" : id.endsWith(".emergencia") ? "vault-emergencia" : "vault-save");

export type WidgetOptions = { today: string; hide: boolean; lock: boolean; now?: string };

/** The snapshot for the calendar month of `today` (YYYY-MM-DD), whatever month the screen is showing. */
export function buildWidgetSnapshot(state: LedgerState, lang: Lang, opts: WidgetOptions): WidgetSnapshot {
  const { today } = opts;
  const key = today.slice(0, 7);
  const { display, rateE4 } = state.settings;
  const names = makeNamer(state.structure, lang);
  const s = summarize(state, key, lang);
  const nb = netBalance(state, today);
  const sav = savingsOf(state, key, lang);
  // Etapa 3.3 (T-1): la foto se compone por el modo del libro EN LA FUENTE. El
  // cerebro nunca duerme — todo se calcula igual — pero lo que la foto LLEVA
  // sigue la cara del modo (§1.25): los bloques de cara dormidos salen en cero
  // o vacíos (Pagos y la balanza desde Ritmo; ahorros y sus bolsillos desde
  // Ritmo; las casas por hábito y las fijas del catálogo, solo Completo; la
  // luz de naturaleza de un bolsillo, solo Completo). Dos familias NO se
  // componen: los datos de los que vive un aviso universal — los vencimientos
  // (aviso de vencimientos, Esencial) y el flujo de seis meses (aviso de
  // cierre, todos los modos) — viajan reales siempre, porque su cara duerma
  // no apaga su aviso. Y el bloque pace viaja SIEMPRE presente (X-17): vacío
  // en Esencial y descriptivo sin veredicto ni proyección en Ritmo, porque un
  // pace ausente haría que el shell calculara su propia proyección lineal.
  const mode = modeOf(state.settings);
  const ritmoUp = mode !== "esencial";
  const completo = mode === "completo";

  // Dues (1.3.163, audit D1): the snapshot consumes the ONE dues window (dues.ts) at its own
  // 31-day horizon — the same entries Central's «Próximos 30 días» shows. The private math it
  // replaces read only the current month's lines (a cuota filed in a future or past bucket was
  // invisible), took a card's minimum UNCAPPED (a $400 minimum on a $250 balance), omitted a due
  // card whose minimum was unknown instead of showing its balance, and never saw loans at all:
  // on the audit's book it showed $655.99 against the window's $743.76. Lent money stays OUT on
  // purpose: the widget's contract is no people's names, and Me deben already rides as `owed`.
  // Cards keep their short bank name ("PayPal"), unless two cards share it (then their own names);
  // a loan shows no lender either (privacy), just the word and its day.
  const cards = cardsOf(state);
  const issuers = new Map<string, number>();
  for (const c of cards) if (c.issuer) issuers.set(c.issuer, (issuers.get(c.issuer) ?? 0) + 1);
  const dues: WidgetDue[] = duesWindow(state, 31, today)
    .filter((e) => e.kind !== "lent")
    .map((e): WidgetDue => {
      if (e.kind === "card") {
        const c = cards.find((x) => x.id === e.id);
        const name = c ? (((c.issuer && issuers.get(c.issuer) === 1 ? c.issuer : c.name) || c.issuer || "").trim() || (lang === "en" ? "Card" : "Tarjeta")) : e.name;
        return { name, kind: "card", on: e.on, amt: e.amt, go: "vault-loans" };
      }
      if (e.kind === "loan") return { name: lang === "en" ? "Loan" : "Préstamo", kind: "loan", on: e.on, amt: e.amt, go: "vault-loans" };
      return { name: e.name || (lang === "en" ? "Plan" : "Cuota"), kind: "cuota", on: e.on, amt: e.amt, go: "pagos" };
    });

  // Spending by category (Estudio's slices), with last month for the same category.
  const prevSlices = new Map(categorySlices(state, shiftKey(key, -1), names, lang).map((x) => [x.id, x.minor]));
  const goOfCat = (id: string): WidgetGo => {
    const c = state.structure.categories.find((x) => x.id === id);
    if (c) return c.role === SAVINGS ? "vault-save" : c.group === "fixed" ? "fixed" : "variable";
    if (state.structure.purchases.some((p) => p.id === id) || id === "purchase") return "shops";
    if (id === "subscription") return "subs";
    if (id === "expense-fixed") return "fixed";
    return "variable";
  };
  // Lines with no category are grouped by kind (Estudio names them after one of their lines); the widget names the group.
  const KIND: Record<string, [string, string]> = {
    subscription: ["Cuotas", "Plans"], purchase: ["Compras", "Shopping"],
    "expense-fixed": ["Fijos", "Fixed"], "expense-variable": ["Variables", "Variable"],
  };
  const slices = categorySlices(state, key, names, lang).slice(0, 5).map((x) => ({ ...x, name: KIND[x.id] ? KIND[x.id][lang === "en" ? 1 : 0] : x.name }));
  // Two categories with one name (Casa in Fijos and in Variables) get their book beside it.
  const seen = new Map<string, number>();
  for (const x of slices) seen.set(x.name, (seen.get(x.name) ?? 0) + 1);
  const bookWord = (id: string) => {
    const g = state.structure.categories.find((c) => c.id === id)?.group;
    return g === "fixed" ? (lang === "en" ? "fixed" : "fijos") : g === "variable" ? (lang === "en" ? "variable" : "variables") : "";
  };
  const cats: WidgetCat[] = slices.map((x) => ({
    name: ((seen.get(x.name) ?? 0) > 1 && bookWord(x.id) ? `${x.name} · ${bookWord(x.id)}` : x.name) || "—",
    amt: x.minor,
    prev: prevSlices.get(x.id) ?? 0,
    save: state.structure.categories.find((c) => c.id === x.id)?.role === SAVINGS,
    go: goOfCat(x.id),
  }));

  // Las monedas del libro (1.3.241): la de vista manda, las de sus líneas y saldos siguen,
  // y la otra moneda del sistema cierra la lista — tocar el signo de la tarjeta siempre
  // puede alternar (el Córdoba que Oscar pidió junto a su dólar de vista).
  const curs: ("NIO" | "USD")[] = [];
  const pushCur = (c: string) => { if ((c === "NIO" || c === "USD") && !curs.includes(c)) curs.push(c); };
  pushCur(display);
  for (const b of Object.values(state.months)) for (const l of b.lines) { pushCur(l.currency); pushCur(l.balanceCurrency ?? ""); }
  pushCur("NIO"); pushCur("USD");

  const loc = lang === "en" ? "en-US" : "es-NI";
  const mid = (k: string) => new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 15));
  const shortFmt = new Intl.DateTimeFormat(loc, { month: "short", timeZone: "UTC" });
  const flow: WidgetFlow[] = [];
  for (let i = 5; i >= 0; i--) {
    const k = shiftKey(key, -i);
    const m = i === 0 ? s : summarize(state, k, lang);
    // Three letters in both languages ("sept" → "Sep"), so the six labels line up.
    const label = shortFmt.format(mid(k)).replace(".", "").slice(0, 3);
    flow.push({ key: k, label: label.charAt(0).toUpperCase() + label.slice(1), inn: m.income, out: m.expense });
  }
  const longMonth = new Intl.DateTimeFormat(loc, { month: "long", timeZone: "UTC" }).format(mid(key));

  return {
    v: 1,
    at: opts.now ?? new Date().toISOString(),
    lang,
    mode,
    cur: display,
    curs,
    rateE4,
    rateSrc: state.settings.rateSource || "",
    rateAsOf: state.settings.rateAsOf || "",
    month: key,
    monthLabel: longMonth.charAt(0).toUpperCase() + longMonth.slice(1),
    hide: opts.hide,
    notify: state.settings.notify !== false,
    lock: opts.lock,
    have: s.income,
    spend: s.expense,
    left: s.opportunity,
    // Ola 3 (BR3-3, SOS2-1 condenado): usedPct es spentPct, la cifra semilla
    // de la proyección que la ola 2 expulsó de la torre en palabras — en la
    // foto su única cara consumidora es la torre de ritmo, Completo por la
    // misma doctrina X-6/X-17 que deja el bloque pace sin veredicto ni
    // proyección fuera de Completo. No alimenta ningún aviso y no es
    // dinero: fuera de Completo viaja null, como el resto de su familia.
    // (tone NO cae con él: es el color del semáforo de deuda — pagos contra
    // los topes que la persona se marcó — cuya cara vive en los tres
    // modos; estado honesto, no la cifra de ritmo ni su veredicto.)
    usedPct: completo ? (s.spentPct === null ? null : Math.round(s.spentPct)) : null,
    todaySpend: todaySpend(state, today).perDayMinor,
    pay: ritmoUp ? s.debt : 0,
    tone: s.tone,
    saveMonth: ritmoUp ? s.savingsFlow : 0,
    saveGoal: ritmoUp ? s.savingsGoal : 0,
    saveTotal: ritmoUp ? sav.total : 0,
    saveKept: ritmoUp ? sav.kept : 0,
    savePledged: ritmoUp ? sav.pledged : 0,
    // 1.3.163 (audit D1): EVERY pocket with money, plus the savings accounts as their own entries.
    // The old slice(0, 4) dropped the fifth pocket while saveTotal kept counting it, and the
    // accounts never appeared at all — the snapshot disagreed with itself by $1,100 on the
    // audit's book. Now Σ pockets == saveTotal, always.
    // 1.3.291: cada bolsillo lleva su naturaleza cuando la tiene (savingsOf la leyó de la
    // partición); las cuentas, nunca — son la base, no un fondo.
    pockets: ritmoUp ? [
      ...sav.pockets.filter((p) => p.amt !== 0).map((p) => ({ name: p.name, amt: p.amt, go: goOfPocket(p.id), ...("fund" in p && p.fund && completo ? { fund: p.fund } : {}) })),
      ...sav.accountPockets.filter((p) => p.amt !== 0).map((p) => ({ name: p.name, amt: p.amt, go: "vault-save" as WidgetGo })),
    ] : [],
    owed: ritmoUp ? nb.owed : 0,
    owe: ritmoUp ? nb.owe : 0,
    dues: dues.slice(0, 8),
    // La comparación con el mes pasado es la cara Completo (face-top5-compare):
    // en Ritmo las categorías viajan con su cifra y prev en cero — prev solo lo
    // consume la pintura de la comparación, ningún número impreso sale de él.
    cats: ritmoUp ? cats.map((c) => (completo ? c : { ...c, prev: 0 })) : [],
    flow,
    // Las casas de la tarjeta (1.3.246): las fijas mandan y el hábito rellena. La lista
    // ordenada SIN tope pierde los pares ya fijados (por signo: una fija de la tarjeta +
    // no toca la lista de la −) y solo entonces se corta a 10 — así ninguna categoría
    // aparece dos veces y ninguna sugerencia se pierde por el camino.
    ...(() => {
      const ranked = quickHomesRanked(state, key, lang);
      const pins = quickPins(state, lang);
      const drop = (homes: QuickHome[], pinned: QuickHome[]): QuickHome[] => {
        const set = new Set(pinned.map((p) => `${p.c}|${p.s}`));
        return homes.filter((h) => !set.has(`${h.c}|${h.s}`)).slice(0, 10);
      };
      // Etapa 3.3 (T-1): las fijas dormidas se filtran de la foto y vuelven al
      // subir de modo — las del dueño desde Ritmo (face-pins), las del catálogo
      // y las casas por hábito solo en Completo. La lista guardada no se toca.
      return {
        qhIn: completo ? drop(ranked.inn, pins.inn) : [],
        qhOut: completo ? drop(ranked.out, pins.out) : [],
        qpIn: ritmoUp ? pins.inn : [],
        qpOut: ritmoUp ? pins.out : [],
      };
    })(),
    // Las fijas del catálogo (1.3.251): su propia lista, solo para la tarjeta del
    // gasto — no deduplican contra el hábito (una compra en Temu no es una casa de
    // Estructura) ni cuentan contra su tope de 10.
    qsOut: completo ? quickStorePins(state, lang) : [],
    // El patrón de ritmo (1.3.248): la web calcula, el shell juzga — la costura de
    // siempre (como vencimientos y cierre). La lectura sale del libro filtrado:
    // patron.ts nunca ve una línea apartada.
    // Etapa 3.3 (X-17): la cara de ritmo es Completo (fallo 22/X-6), así que
    // fuera de Completo el bloque viaja sin veredicto y sin proyección — en
    // Ritmo con su descripción real (lo gastado y lo esperado, que el shell
    // no imprime con status «learning») y en Esencial vacío. El bloque nunca
    // falta: sin él, el shell proyectaría por su cuenta (FaroNotify).
    ...(() => {
      const r = paceReading(state, key, new Date(`${today}T12:00:00`));
      if (completo) return { pace: { status: r.status, verdict: r.verdict, spent: r.spentMinor, expected: r.expectedMinor, projected: r.projectedMinor, income: s.income } };
      if (ritmoUp) return { pace: { status: "learning" as const, verdict: null, spent: r.spentMinor, expected: r.expectedMinor, projected: 0, income: s.income } };
      return { pace: { status: "learning" as const, verdict: null, spent: 0, expected: 0, projected: 0, income: 0 } };
    })(),
  };
}

/** Device-only choice "Widget: ocultar montos": "1" hide, "0" show, absent = follow the fingerprint lock. */
export const WIDGET_HIDE_KEY = "faro-widget-hide";

export function widgetHide(pref: string | null, lockOn: boolean): boolean {
  if (pref === "1") return true;
  if (pref === "0") return false;
  return lockOn;
}

/**
 * 1.3.258: el último empujón de la foto, registrado en el equipo (nunca en el libro:
 * la llave se lee y se escribe por el canal crudo de samplemode, así que el modo de
 * ejemplo no la esconde en su espacio — el parte vale en los dos modos). Hasta
 * 1.3.257 todo resultado del empujón se tragaba en silencio y una foto vieja no se
 * podía diagnosticar desde fuera (estudio faro-pinsdiag-257); ahora cada empujón
 * deja su parte: cuándo, por qué rama y si la foto salió o por qué no. Sin
 * contenido del paquete, sin montos, sin datos personales: solo el resultado.
 */
export const WIDGET_LASTPUSH_KEY = "faro-widget-lastpush";

export type WidgetPushBranch = "real" | "sample" | "out";
export type WidgetPushWhy = "nopack" | "pack" | "error";
export type WidgetPushRecord = { at: string; branch: WidgetPushBranch; sent: boolean; why?: WidgetPushWhy };

/** Lee un parte guardado sin fiarse de su forma: cualquier cosa rara no es un parte. */
export function parseWidgetPushRecord(raw: string | null): WidgetPushRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<WidgetPushRecord>;
    if (typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) return null;
    if (r.branch !== "real" && r.branch !== "sample" && r.branch !== "out") return null;
    if (typeof r.sent !== "boolean") return null;
    if (r.why !== undefined && r.why !== "nopack" && r.why !== "pack" && r.why !== "error") return null;
    return { at: r.at, branch: r.branch, sent: r.sent, ...(r.why ? { why: r.why } : {}) };
  } catch { return null; }
}
