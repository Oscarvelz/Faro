/**
 * funds — la naturaleza de los fondos (modelo de ahorros, oleada 2, 1.3.288).
 *
 * La oleada 1 (savings.ts) partió el stock en cinco clases; esta pone las manos:
 * declarar la naturaleza de un fondo (una serie) — «saldo» (un límite sobre el saldo
 * de UNA cuenta anfitriona) o «aparte» (su propia pila) —, leer la postura de Ajustes,
 * nombrar las cuentas anfitrionas con su Libre, y clasificar cada línea para Folios.
 *
 * Reglas que este módulo blinda:
 * - Declarar estampa la SERIE ENTERA en un solo commit (precedente paintBank): cada
 *   línea de cada mes gana `fund` (y `fundHost` si es del saldo). El Retiro y las
 *   cuentas no se estampan jamás: su clase la da su forma, no un campo.
 * - Un fondo del saldo se amarra a UNA cuenta específica; su guardia es el Libre de
 *   ESA cuenta (su saldo menos los límites que ya montan sobre ella). Un límite nunca
 *   supera la pila donde vive: dinero falso, nunca.
 * - Sin declarar se lee como pila (la semántica de hoy): declarar es el acto que
 *   mueve las cifras, y se hace con la consecuencia a la vista.
 *
 * Puro y sin pantalla: las preguntas viven en Desk/LineForm; aquí solo hay lectura
 * y la única escritura (declareSeries), siempre sobre el estado entero.
 */
import { savingsStock, type SavingsStock } from "./savings.ts";
import type { LedgerState, Line, Settings } from "./types.ts";

export type FundNature = "saldo" | "aparte";
export type NatureMode = "ask" | "balance" | "separate";

/** La postura de Ajustes, leída con desconfianza: ausente o desconocida = preguntar. */
export function natureMode(settings: Settings): NatureMode {
  const m = settings.savingsNatureMode;
  return m === "balance" || m === "separate" ? m : "ask";
}

/** ¿Es este sub una cuenta (la base misma)? La misma prueba que savingsStock: icono vault. */
export function isVaultSub(state: LedgerState, subId: string): boolean {
  if (!subId) return false;
  for (const c of state.structure.categories) {
    for (const s of c.subs) {
      if (s.id === subId) return typeof s.icon === "string" && (s.icon === "vault" || s.icon.startsWith("vault:"));
    }
  }
  return false;
}

/** El Retiro se reconoce por su sufijo, como en toda la casa: nunca lleva el campo. */
export const isRetiroSubId = (subId: string): boolean => subId.endsWith(".retiro");

/** ¿Es este sub un FONDO (bolsa que puede declarar naturaleza)? Ahorro sí, cuenta no, Retiro no. */
export function isFundSub(state: LedgerState, categoryId: string, subId: string): boolean {
  if (!subId || isRetiroSubId(subId) || isVaultSub(state, subId)) return false;
  const cat = state.structure.categories.find((c) => c.id === categoryId);
  return !!cat && cat.role === "savings";
}

/** La naturaleza que una línea declara, leída con desconfianza (como manda isLedgerDeep). */
export function fundOfLine(line: Line): FundNature | undefined {
  return line.fund === "saldo" || line.fund === "aparte" ? line.fund : undefined;
}

export type HostAccount = { id: string; minor: number };

/** Las cuentas que pueden ser anfitrionas: subs vault de las categorías de ahorro, no
 *  ocultas, en el orden de la estructura, con su stock a la fecha (la caminata canónica). */
export function hostAccounts(state: LedgerState, asOfKey: string, stock: SavingsStock = savingsStock(state, asOfKey)): HostAccount[] {
  const bySub = new Map<string, number>();
  for (const row of stock.series.values()) {
    if (row.cls === "cuenta") bySub.set(row.subId, (bySub.get(row.subId) ?? 0) + row.minor);
  }
  const out: HostAccount[] = [];
  for (const c of state.structure.categories) {
    if (c.role !== "savings" || c.hidden) continue;
    for (const s of c.subs) {
      if (s.hidden) continue;
      if (typeof s.icon === "string" && (s.icon === "vault" || s.icon.startsWith("vault:"))) out.push({ id: s.id, minor: bySub.get(s.id) ?? 0 });
    }
  }
  return out;
}

/** El saldo (stock) de una cuenta a la fecha, desde la partición. */
export function accountBalance(stock: SavingsStock, subId: string): number {
  let total = 0;
  for (const row of stock.series.values()) if (row.cls === "cuenta" && row.subId === subId) total += row.minor;
  return total;
}

/** Lo libre de una cuenta: su saldo menos los límites del saldo que ya montan sobre ella.
 *  El amarre es por cuenta; el agregado que se muestra en otros sitios es solo su suma. */
export function libreOf(stock: SavingsStock, hostId: string): number {
  return accountBalance(stock, hostId) - (stock.pledgedByHost.get(hostId) ?? 0);
}

/** El guardia: ¿cabe un límite de `amount` en el Libre de esta cuenta? Devuelve las cifras
 *  que la frase del guardia nombra (el monto y lo libre), para decirlas en el acto. */
export function guardFor(stock: SavingsStock, hostId: string, amount: number): { libre: number; fits: boolean } {
  const libre = libreOf(stock, hostId);
  return { libre, fits: amount <= libre };
}

export type PendingFund = { seriesId: string; subId: string; categoryId: string; minor: number };

/** Los fondos que aún no declaran (clase sin-declarar de la partición), en el orden en
 *  que la partición los camina. La unidad de la pregunta es la serie (§6.1). */
export function undeclaredFunds(stock: SavingsStock): PendingFund[] {
  const out: PendingFund[] = [];
  for (const [seriesId, row] of stock.series) {
    if (row.cls === "sin-declarar") out.push({ seriesId, subId: row.subId, categoryId: row.categoryId, minor: row.minor });
  }
  return out;
}

/** El nombre de una serie como el libro la nombra: el concepto de su línea más reciente
 *  (mes, luego día anotado, luego id — el mismo orden que la línea determinante). */
export function seriesName(state: LedgerState, seriesId: string): string {
  let best: { k: string; concept: string } | null = null;
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    for (const l of bucket.lines) {
      if ((l.seriesId || l.id) !== seriesId) continue;
      const day = l.bookedOn && l.bookedOn.startsWith(monthKey) ? l.bookedOn : "";
      const k = `${monthKey}|${day}|${l.id}`;
      if (!best || k > best.k) best = { k, concept: l.concept };
    }
  }
  return best?.concept ?? "";
}

/**
 * EL ACTO DE DECLARAR (§5.3): estampa la naturaleza en la serie ENTERA, en un commit.
 * «saldo» escribe también la anfitriona (sin anfitriona, el campo queda ausente y la
 * partición lo reporta bajo la clave ""); «aparte» borra cualquier anfitriona vieja.
 * Una serie de cuenta o de Retiro no se estampa jamás: devuelve el estado intacto.
 */
export function declareSeries(state: LedgerState, seriesId: string, nature: FundNature, host?: string): LedgerState {
  let target: Line | undefined;
  for (const bucket of Object.values(state.months)) {
    target = bucket.lines.find((l) => (l.seriesId || l.id) === seriesId);
    if (target) break;
  }
  if (!target) return state;
  if (!isFundSub(state, target.categoryId, target.subId)) return state;
  const months: LedgerState["months"] = {};
  for (const [monthKey, bucket] of Object.entries(state.months)) {
    months[monthKey] = {
      lines: bucket.lines.map((l) => {
        if ((l.seriesId || l.id) !== seriesId) return l;
        const next: Line = { ...l, fund: nature };
        if (nature === "saldo" && host) next.fundHost = host;
        else delete next.fundHost;
        return next;
      }),
    };
  }
  return { ...state, months };
}

/** Lo que una respuesta a la pregunta de §5.1 estampa al nacer un fondo, según el modo:
 *  preguntar sin elegir = no listo; del saldo sin cuentas = nace sin declarar (ready,
 *  sin estampa: el encuentro de §5.2 lo resuelve cuando la primera cuenta llegue);
 *  del saldo con una cuenta = se amarra solo; con varias = la anfitriona es obligada. */
export function stampFor(
  mode: NatureMode,
  pick: FundNature | null,
  host: string,
  accounts: HostAccount[],
): { fund?: FundNature; fundHost?: string; ready: boolean } {
  const nature = mode === "ask" ? pick : mode === "balance" ? "saldo" : "aparte";
  if (!nature) return { ready: false };
  if (nature === "aparte") return { fund: "aparte", ready: true };
  if (accounts.length === 0) return { ready: true };
  if (accounts.length === 1) return { fund: "saldo", fundHost: accounts[0]!.id, ready: true };
  return host ? { fund: "saldo", fundHost: host, ready: true } : { ready: false };
}

/** Lo guardado (oleada 3, §3): el dinero que existe una sola vez — cuentas + aparte
 *  + Retiro + lo sin declarar leyéndose como pila. Es el total de la partición menos
 *  lo comprometido: un fondo del saldo NUNCA suma, porque su dinero ya es el saldo
 *  de su anfitriona. Para un libro sin declaraciones vale exactamente el total de
 *  siempre. */
export function keptTotal(stock: SavingsStock): number {
  return stock.total - stock.pledged;
}

/** Lo libre que se muestra (§3): la suma de los saldos visibles menos TODO lo
 *  comprometido. El agregado vive solo en la presentación — el amarre que manda
 *  es por cuenta (libreOf) — y puede salir negativo: se muestra y se dice. */
export function freeShown(stock: SavingsStock, accountsTotal: number): number {
  return accountsTotal - stock.pledged;
}

export type CushionReading = {
  /** El colchón unificado (§3): cuánto de lo guardado aguantaría lo esencial. */
  cushion: number;
  /** Σ pisos de emergencia del saldo (con anfitriona y sin ella): lo que hay que cubrir. */
  emergencyFloor: number;
  /** Lo que de ese piso ningún saldo libre alcanza a cubrir — el Asesor lo dice con esta cifra. */
  floorShortfall: number;
  /** Anfitrionas cuyo saldo ya no cubre los límites del saldo que montan sobre él
   *  (su Libre bajó de cero), la peor primero. */
  overCommitted: { host: string; balance: number; committed: number; libre: number }[];
};

/** EL COLCHÓN (§3, oleada 4 — 1.3.290): la única fórmula, leída de la partición.
 *  Por cada cuenta: máx(0, su saldo − sus compromisos del saldo que NO son de
 *  emergencia) — un fondo de emergencia del saldo GUARDA el saldo de su anfitriona
 *  (ese tramo cuenta como colchón: es dinero de emergencia, ya está ahí), pero no
 *  suma nada por encima del saldo. Suma además el stock de emergencia APARTE (su
 *  propia pila) y todo lo sin declarar, que se lee como pila (§6.3). El Retiro
 *  nunca cuenta (ley de siempre) y un fondo aparte que no es de emergencia tampoco:
 *  su dinero ya tiene otro destino. Para un libro sin declaraciones la fórmula se
 *  reduce exactamente a la lectura de siempre: cuentas + pila sin declarar =
 *  total − Retiro. El piso de emergencia se comprueba anfitriona por anfitriona:
 *  lo que el saldo libre de cada una no alcanza a guardar es la falta; un piso sin
 *  anfitriona se cubre con lo que sobre de las demás. */
export function cushionOf(stock: SavingsStock): CushionReading {
  const emgByHost = new Map<string, number>();
  const nonEmgByHost = new Map<string, number>();
  let aparteEmg = 0;
  for (const row of stock.series.values()) {
    if (row.cls === "aparte" && row.subId.endsWith(".emergencia")) aparteEmg += row.minor;
    if (row.cls !== "saldo") continue;
    const host = row.fundHost ?? "";
    const m = row.subId.endsWith(".emergencia") ? emgByHost : nonEmgByHost;
    m.set(host, (m.get(host) ?? 0) + row.minor);
  }
  const hosts = new Set<string>();
  for (const row of stock.series.values()) if (row.cls === "cuenta") hosts.add(row.subId);
  for (const h of emgByHost.keys()) if (h) hosts.add(h);
  for (const h of nonEmgByHost.keys()) if (h) hosts.add(h);
  let cushion = stock.undeclared + aparteEmg;
  let floorShortfall = 0;
  let leftover = 0;
  let emergencyFloor = 0;
  const overCommitted: CushionReading["overCommitted"] = [];
  for (const host of hosts) {
    const balance = accountBalance(stock, host);
    const nonEmg = nonEmgByHost.get(host) ?? 0;
    const emg = emgByHost.get(host) ?? 0;
    emergencyFloor += emg;
    const libre = libreOf(stock, host);
    if (libre < 0) overCommitted.push({ host, balance, committed: emg + nonEmg, libre });
    const free = Math.max(0, balance - nonEmg);
    cushion += free;
    floorShortfall += emg - Math.min(emg, free);
    leftover += Math.max(0, free - emg);
  }
  const hostlessEmg = emgByHost.get("") ?? 0;
  emergencyFloor += hostlessEmg;
  floorShortfall += Math.max(0, hostlessEmg - leftover);
  overCommitted.sort((a, b) => a.libre - b.libre);
  return { cushion, emergencyFloor, floorShortfall, overCommitted };
}

export type SegmentAgg = { kept: number; pledged: number; undecl: number; total: number; saldoHosts: string[] };

/** Los segmentos de la banda (oleada 3, §4.1): la partición agrupada por bolsa.
 *  Cada serie cae en su sub si es una bolsa con nombre (seedIds); si su sub es una
 *  cuenta VISIBLE, no es segmento (es la base, y vive en el panel de cuentas); todo
 *  lo demás cae en «rest» — como siempre: el dinero oculto sigue contando en los
 *  totales aunque su nombre no se pinte (una cuenta oculta viaja en «rest» con su
 *  clase de cuenta sumando a kept, igual que la caminata del mes la sumaba).
 *  kept = aparte + Retiro (la clase), y la lectura de pila de cada segmento suma
 *  además su parte sin declarar en las superficies que la componen. */
export function segmentAgg(stock: SavingsStock, seedIds: ReadonlySet<string>, visibleVaultIds: ReadonlySet<string>): Map<string, SegmentAgg> {
  const out = new Map<string, SegmentAgg>();
  const forId = (id: string): SegmentAgg => {
    let a = out.get(id);
    if (!a) { a = { kept: 0, pledged: 0, undecl: 0, total: 0, saldoHosts: [] }; out.set(id, a); }
    return a;
  };
  for (const row of stock.series.values()) {
    if (visibleVaultIds.has(row.subId)) continue;
    const a = forId(seedIds.has(row.subId) ? row.subId : "rest");
    a.total += row.minor;
    if (row.cls === "aparte" || row.cls === "retiro" || row.cls === "cuenta") a.kept += row.minor;
    else if (row.cls === "saldo") {
      a.pledged += row.minor;
      if (row.fundHost && !a.saldoHosts.includes(row.fundHost)) a.saldoHosts.push(row.fundHost);
    } else a.undecl += row.minor;
  }
  return out;
}

/** El Apartado del mes partido en dos lecturas (§4.2): lo apartado a fondos del
 *  saldo (etiquetar: no mueve dinero) contra todo lo demás (aparte, sin declarar
 *  leyéndose como pila, Retiro). Las dos partes suman siempre el total de la
 *  tarjeta: la meta del mes se cumple con ambas naturalezas (§3). Las entradas
 *  llegan ya convertidas a la moneda de vista. */
export function asideSplit(entries: { seriesKey: string; minor: number }[], stock: SavingsStock): { saldo: number; moved: number } {
  let saldo = 0;
  let moved = 0;
  for (const e of entries) {
    if (stock.series.get(e.seriesKey)?.cls === "saldo") saldo += e.minor;
    else moved += e.minor;
  }
  return { saldo, moved };
}

/** La clase de Folios de una línea (§4.6): solo las entradas de ahorro la llevan —
 *  las series de las tres bolsas y las líneas propias de una cuenta (su apertura y
 *  sus depósitos, las mismas que el libro lee como la cuenta). Un gasto que solo
 *  nombra una cuenta como origen (sourceId) NO es una entrada de cuenta: aquí solo
 *  manda el sub de la línea, nunca su sourceId. */
export type SaveKind = "fund" | "retiro" | "cuenta";

export function saveKindOf(state: LedgerState, line: { categoryId: string; subId: string }): SaveKind | null {
  if (!line.subId) return null;
  const cat = state.structure.categories.find((c) => c.id === line.categoryId);
  if (!cat || cat.role !== "savings") return null;
  if (isVaultSub(state, line.subId)) return "cuenta";
  if (isRetiroSubId(line.subId)) return "retiro";
  return "fund";
}
