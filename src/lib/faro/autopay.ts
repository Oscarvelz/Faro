/**
 * Ola 6 (1.3.356) — los avisos de pagos que se acercan y el pago
 * automático, por orden de Oscar (2026-11-20): «notificar cuando un pago
 * recurrente con fecha se aproxima — aunque el cargo sea automático en
 * línea — invitando a aplicar cambios; y pago automático por pago: Faro
 * descuenta solo el monto en su fecha, de la cuenta elegida».
 *
 * LOS AVISOS leen la ÚNICA ventana de vencimientos (dues.ts): cuotas y
 * tarjetas con fecha dentro del horizonte (y lo vencido, que la ventana
 * nunca esconde). Nada se calcula dos veces: la tarjeta de Central y
 * cualquier otra superficie leen de aquí.
 *
 * EL PAGO AUTOMÁTICO es un asentamiento al abrir: una PWA no corre sola,
 * así que «Faro paga solo» quiere decir que al abrir Faro, toda cuota con
 * pago automático cuya fecha ya llegó y cuyo período aún no tiene
 * instancia queda anotada — la instancia del período, con su fecha y su
 * cuenta (sourceId) — y Faro lo DICE. Reglas de la casa:
 *  - La configuración se resuelve DESDE LA SERIE (cura de la ola 23,
 *    Q23-C2): manda la instancia más reciente QUE LA LLEVA, no la última.
 *    Una instancia manual — que nace sin los campos, porque las recetas
 *    de siempre no los escriben — ya no apaga el pago automático de su
 *    serie. Y el apagado es un acto con señal: una instancia con
 *    autopay === false explícito (lo escribe el editor al apagar sobre
 *    la línea que lo traía encendido) detiene la búsqueda: apagar manda
 *    sobre heredar. Las instancias asentadas heredan la configuración
 *    del portador: la serie sigue sola.
 *  - La configuración SOBREVIVE A SU PAPEL (cura de la ola 24, G24-3;
 *    universal de verdad desde la cura de la ola 25, G25-1): la
 *    instrucción resuelta es de la SERIE, no de la anotación que la
 *    porta. Borrar la instancia portadora no revoca una instrucción
 *    permanente, POR NINGUNA puerta: la migración es un paso único de
 *    este módulo (migrateAutopayConfig, abajo) que toda receta que
 *    quita líneas de `months` compone sobre su resultado — el borrado
 *    del Historial, las dos puertas del Archivo, el bolsillo de Retiro
 *    y el retiro por subcategoría — usando ESTA misma resolución: una
 *    sola lectura para el motor y para todo borrado.
 *  - La caminata juzga cada período POR SU PROPIA FECHA (cura de la ola
 *    23, G23-1): recorre la parrilla de la serie desde su primera fecha,
 *    no hacia adelante desde la última instancia — una instancia futura
 *    creada por adelantado ya no deja el período debido fuera. Los
 *    períodos anteriores a la ventana se saltan sin asentarse (la
 *    ventana honesta manda) y sin consumir presupuesto de asentamiento.
 *  - Idempotente por construcción: el id de la instancia asentada es
 *    determinista (serie + fecha) y un período con instancia no se toca.
 *  - Solo se asienta lo reciente (62 días): un período más viejo se le
 *    deja al usuario en Cobros, no se le inventa historia antigua.
 *  - Una serie inactiva o en descanso no asienta nada.
 */
import { intervalOf, stepDate } from "./cadence.ts";
import { duesWindow, type DueEntry } from "./dues.ts";
import { todayIso } from "./loans.ts";
import type { LedgerState, Line } from "./types.ts";

/** Días hacia adelante que el aviso de Central mira (lo vencido entra siempre). */
export const DUE_ALERT_HORIZON_DAYS = 3;
/** Cuánto hacia atrás asienta el pago automático al abrir. */
export const AUTOPAY_SETTLE_WINDOW_DAYS = 62;
/** Techo de pasos de la caminata de una serie. NO es política — la
 * política es la ventana de 62 días — : es el seguro anti-bucle de la
 * casa (el mismo 4000 de cadence.ts) ante una cadencia corrupta. A la
 * cadencia más fina (diaria) cubre unos 11 años de vencimientos, muy
 * por encima de cualquier libro real; la guarda anterior de 64 pasos sí
 * era política disfrazada y quemaba el presupuesto en los vencimientos
 * anteriores a la ventana (G23-1). */
export const AUTOPAY_WALK_MAX_STEPS = 4000;

/** Los pagos que se acercan: cuotas y tarjetas de la ventana única,
 * ordenados por fecha (la ventana ya ordena). Préstamos fuera: su importe
 * no está modelado y un aviso sin cifra no invita a ningún cambio. */
export function dueAlerts(state: LedgerState, today: string = todayIso()): DueEntry[] {
  return duesWindow(state, DUE_ALERT_HORIZON_DAYS, today).filter((e) => e.kind === "cuota" || e.kind === "card");
}

export type SettledPayment = {
  seriesId: string;
  concept: string;
  amountMinor: number;
  currency: Line["currency"];
  /** La fecha del cargo asentado (YYYY-MM-DD). */
  on: string;
  /** La cuenta elegida (sourceId de la instancia creada). */
  accountId: string;
};

const dayOf = (line: Line): string => line.bookedOn || line.nextDue || `${line.monthKey}-01`;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** La instrucción permanente de una serie, resuelta desde sus
 * instancias: de la más nueva a la más vieja, la primera que MENCIONA
 * el pago automático manda — encendido con su cuenta, o apagado
 * explícito (autopay === false, la señal del editor). Las que no lo
 * mencionan no dicen nada. Devuelve null si ninguna lo menciona. Es LA
 * resolución de la casa: la lee el asentamiento y la lee el borrado
 * (deleteLine migra con ella lo que un papel se llevaría, G24-3). */
export function seriesAutopayConfig(instances: Line[]): { on: boolean; accountId: string } | null {
  const sorted = [...instances].sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const l = sorted[i]!;
    if (l.autopay === false) return { on: false, accountId: "" };
    if (l.autopay && l.autopayAccountId) return { on: true, accountId: l.autopayAccountId };
  }
  return null;
}

/**
 * OLA 25 (G25-1): LA MIGRACIÓN ES UN PASO, NO UN GESTO REPETIDO. La
 * cura de la ola 24 (G24-3) dejó la migración DENTRO de deleteLine y la
 * enunció como universal («la receta que todas las puertas de borrado
 * componen») — y la frase era falsa: las puertas del Archivo
 * (deleteRestingLines y deleteSpan, en descanso.ts) borran líneas por
 * filtro sin componer deleteLine, y una portadora apartada con
 * hidePeriod salía por ahí sin migrar: la serie perdía su instrucción
 * y no asentaba nunca más, en silencio. La cura no es copiar el gesto
 * en cada puerta: es ESTE paso único, que toda receta que quita líneas
 * de `months` compone sobre su resultado — deleteLine (reducer.ts),
 * las dos puertas del Archivo (descanso.ts), el bolsillo de Retiro
 * (retiro.ts) y el retiro por subcategoría (defaults.ts, en su forma
 * de meses) — y que la cerca de la ola 25 censa puerta por puerta.
 *
 * El paso, por serie que perdió algún papel entre `before` y `after`:
 * si la instrucción resuelta CAMBIA al quitar los papeles, la de antes
 * se estampa en la instancia más nueva restante — encendida con su
 * cuenta, o el apagado explícito, en las dos direcciones. Si la serie
 * entera salió, no queda papel que porte su palabra y no hay estampa.
 * Sin pérdida o sin cambio, el paso devuelve los mismos meses que
 * recibió (la misma referencia): componerlo no cuesta nada donde no
 * hay nada que migrar.
 */
export function migrateAutopayConfigMonths(
  before: LedgerState["months"],
  after: LedgerState["months"],
): LedgerState["months"] {
  const beforeBySeries = new Map<string, Line[]>();
  for (const bucket of Object.values(before)) {
    for (const l of bucket.lines) {
      if (l.kind !== "subscription") continue;
      const key = l.seriesId || l.id;
      const arr = beforeBySeries.get(key);
      if (arr) arr.push(l); else beforeBySeries.set(key, [l]);
    }
  }
  let result = after;
  for (const [seriesKey, beforeLines] of beforeBySeries) {
    const remaining: Line[] = [];
    for (const bucket of Object.values(result)) {
      for (const l of bucket.lines) {
        if (l.kind === "subscription" && (l.seriesId || l.id) === seriesKey) remaining.push(l);
      }
    }
    if (remaining.length === beforeLines.length) continue; // esta serie no perdió ningún papel
    if (!remaining.length) continue; // la serie entera salió: no queda papel que porte su palabra
    const beforeCfg = seriesAutopayConfig(beforeLines);
    if (!beforeCfg) continue;
    const afterCfg = seriesAutopayConfig(remaining);
    if (afterCfg && afterCfg.on === beforeCfg.on && afterCfg.accountId === beforeCfg.accountId) continue;
    const newest = [...remaining].sort((a, b) => dayOf(a).localeCompare(dayOf(b)))[remaining.length - 1]!;
    const stamped: Line = beforeCfg.on
      ? { ...newest, autopay: true, autopayAccountId: beforeCfg.accountId }
      : { ...newest, autopay: false };
    const bucket = result[newest.monthKey];
    if (!bucket) continue;
    result = { ...result, [newest.monthKey]: { lines: bucket.lines.map((l) => (l.id === newest.id ? stamped : l)) } };
  }
  return result;
}

/** El paso de migración sobre estados enteros (la forma que componen
 * las recetas que devuelven un LedgerState). */
export function migrateAutopayConfig(before: LedgerState, after: LedgerState): LedgerState {
  const months = migrateAutopayConfigMonths(before.months, after.months);
  return months === after.months ? after : { ...after, months };
}

/**
 * Asienta los períodos vencidos de las cuotas con pago automático.
 * Puro: devuelve el estado nuevo (el mismo objeto si nada se asentó) y
 * la lista de lo asentado, en orden de fecha. `skipSeries` (cura de la
 * ola 24, G24-2): las series que el sello del aparato ya asentó hoy en
 * este aparato no se caminan — el proveedor las pasa desde el sello;
 * sin el parámetro, el motor no tiene memoria, como siempre.
 */
export function settleAutopay(state: LedgerState, today: string = todayIso(), skipSeries?: ReadonlySet<string>): { state: LedgerState; settled: SettledPayment[] } {
  const windowStart = addDays(today, -AUTOPAY_SETTLE_WINDOW_DAYS);
  const series = new Map<string, Line[]>();
  for (const month of Object.values(state.months)) {
    for (const line of month.lines) {
      if (line.kind !== "subscription") continue;
      const key = line.seriesId || line.id;
      const arr = series.get(key);
      if (arr) arr.push(line); else series.set(key, [line]);
    }
  }
  const settled: SettledPayment[] = [];
  let months = state.months;
  let touched = false;
  for (const [seriesId, instances] of series) {
    if (skipSeries?.has(seriesId)) continue;
    const sorted = [...instances].sort((a, b) => dayOf(a).localeCompare(dayOf(b)));
    const latest = sorted[sorted.length - 1]!;
    if (!latest.active || latest.rest) continue;
    // LA CONFIGURACIÓN SE RESUELVE DESDE LA SERIE (Q23-C2), por la
    // única resolución de la casa (seriesAutopayConfig, arriba).
    const config = seriesAutopayConfig(instances);
    if (!config || !config.on) continue;
    const accountId = config.accountId;
    if (!accountId) continue; // la resolución solo nombra portadora a quien trae su cuenta; esto lo deja dicho para el tipo
    if (!intervalOf(latest.cadence)) continue;
    const anchor = Number((latest.nextDue || "").slice(8, 10)) || Number(dayOf(latest).slice(8, 10)) || 1;
    // Un período está cubierto por FECHA, no por mes: una cadencia
    // semanal vive varias veces en el mismo mes. Cada instancia cubre
    // su fecha de cargo y su fecha anotada (un pago tardío anota la
    // segunda y debe la primera: ambas cuentan como el mismo período).
    // EXCEPCIÓN DECLARADA (cura de la ola 23, Q23-C1 de Cara): el
    // nextDue de una instancia NACIDA de este asentamiento (su id
    // determinista la nombra) no cubre — en su forma, nextDue es el
    // período SIGUIENTE, todavía debido (abajo, al nacer); su período
    // pagado lo cubre su bookedOn. Las instancias de la forma vieja
    // (nextDue = su propia fecha = bookedOn) quedan cubiertas por el
    // bookedOn igualmente: ninguna se re-asienta.
    const covered = new Set<string>();
    for (const l of instances) {
      const bornHere = l.id.startsWith(`auto-${seriesId}-`);
      if (!bornHere && /^\d{4}-\d{2}-\d{2}/.test(l.nextDue || "")) covered.add(l.nextDue.slice(0, 10));
      if (/^\d{4}-\d{2}-\d{2}/.test(l.bookedOn || "")) covered.add(l.bookedOn!.slice(0, 10));
    }
    // LA CAMINATA (G23-1): la parrilla se recorre desde la PRIMERA
    // fecha de la serie y cada período se juzga por su propia fecha.
    // El primer período es el de la primera instancia (cubierto por
    // construcción); los anteriores a la ventana se saltan sin asentar
    // y sin gastar el techo de pasos en vano — el techo solo acota el
    // total, nunca decide qué se asienta.
    const first = sorted[0]!;
    let due = /^\d{4}-\d{2}-\d{2}/.test(first.nextDue || "") ? first.nextDue.slice(0, 10) : dayOf(first);
    for (let step = 0; step < AUTOPAY_WALK_MAX_STEPS && due <= today; step += 1) {
      const key = due.slice(0, 7);
      if (due >= windowStart && !covered.has(due)) {
        // La instancia nueva hereda la serie, no la identidad del papel:
        // las claves de importación y el lote de la última instancia no
        // se duplican jamás (una clave repetida corrompería Deshacer).
        // El cuerpo es el de la instancia más reciente; la configuración
        // es la del PORTADOR de la serie, que puede ser otra instancia.
        const { importId: _imp, batch: _batch, ...base } = latest;
        const instance: Line = {
          ...base,
          id: `auto-${seriesId}-${due}`,
          monthKey: key,
          bookedOn: due,
          // LA FORMA DE LA INSTANCIA ASENTADA (cura de la ola 23,
          // Q23-C1 de Cara): su nextDue es el período SIGUIENTE, no el
          // que acaba de pagar. La ventana única (dues.ts) lee nextDue
          // como la obligación que la línea anuncia — con la forma
          // vieja (nextDue = su propia fecha, ya pasada, en el cubo del
          // mes corriente) la instancia se anunciaba a sí misma como
          // vencida en Central, y la fila falsa renacía cada mes. El
          // período pagado vive en bookedOn, que es donde la cobertura
          // de arriba lo juzga.
          nextDue: stepDate(due, latest.cadence, anchor),
          autopay: true,
          autopayAccountId: accountId,
          sourceId: accountId,
          history: [],
        };
        const bucket = months[key] ?? { lines: [] };
        months = { ...months, [key]: { lines: [...bucket.lines, instance] } };
        covered.add(due);
        touched = true;
        settled.push({ seriesId, concept: latest.concept, amountMinor: latest.amountMinor, currency: latest.currency, on: due, accountId });
      }
      due = stepDate(due, latest.cadence, anchor);
    }
  }
  settled.sort((a, b) => a.on.localeCompare(b.on));
  return { state: touched ? { ...state, months } : state, settled };
}

/* ------------------------------------------------------- el sello del día */

/**
 * EL SELLO DEL DÍA (cura de la ola 23, G23-2 = Q23-C1 de Cambios): la
 * marca de «ya corrí el asentamiento de hoy». Antes era un useRef del
 * proveedor: moría con el montaje, y Deshacer + reabrir (o una segunda
 * pestaña) el mismo día re-asentaba en silencio los períodos que la
 * persona acababa de deshacer — contra la promesa escrita del propio
 * efecto («la marca del día hace que un Deshacer aguante el resto del
 * día») y del Manual («al período siguiente»).
 *
 * LA CASA DEL SELLO ES EL APARATO, con su razón: el sello no es un hecho
 * del libro — no dice qué se asentó, dice que ESTE aparato ya asentó
 * hoy. (El proveedor lo escribe solo cuando el pase asienta: un pase
 * vacío no sella, para que la serie que despierta el mismo día — creada,
 * activada, restaurada o adoptada tras la primera apertura — conserve
 * la conducta de siempre y asiente a la siguiente apertura; el sello
 * existe para aguantar un Deshacer, y sin asentamiento no hay nada
 * que aguantar.) Dentro del libro moriría con Deshacer (la
 * foto restaurada lo traería sin sellar: la enfermedad misma), y un
 * hecho de dinero no es: ningún total lo lee. Vive en una clave durable
 * del aparato atada al libro por su uid, como la clave del paquete
 * (faro.pack.<uid>) y con la convención de las claves del aparato de la
 * casa (faro-news-seen es estado del aparato por diseño declarado). Que
 * dos aparatos del mismo libro corran su pasada el mismo día no cobra
 * dos veces: los ids asentados son deterministas y el que adopta el
 * libro ya asentado no re-asienta (medido, ola 23 Cambios A5) — la
 * convergencia es del motor, no del sello. Y Deshacer NO borra el sello:
 * deshacer el cargo es un acto sobre el libro; el día, en este aparato,
 * ya pasó por su apertura.
 *
 * EL SELLO GUARDA QUÉ SERIES ASENTARON (cura de la ola 24, G24-2,
 * enmienda de esta doctrina): el sello todo-o-nada de la cura 23
 * bloqueaba también a la serie que despertaba DESPUÉS del asentamiento
 * de otra — activada al mediodía venciendo hoy, no asentaba a su
 * siguiente apertura y asentaba mañana, en silencio, contra la promesa
 * del párrafo anterior. Desde esta cura el sello guarda el CONJUNTO de
 * series asentadas hoy en este aparato: el pase corre cuando existe
 * una serie con vencimientos debidos que NO está en el conjunto (el
 * proveedor pasa el conjunto al motor como skipSeries y el motor no
 * camina las selladas); asentar añade la serie al conjunto; y Deshacer
 * NO la saca — por serie, la misma doctrina de siempre: el sello hace
 * que el Deshacer de ESA serie aguante el resto del día. La forma
 * legada (el valor = la fecha, escrita por la .361) se lee como lo que
 * era: el día sellado entero.
 *
 * CADA SERIE SELLA BAJO SU PROPIA LLAVE (cura de la ola 25, G25-2 +
 * Q25-C1 de Cambios): la forma de la ola 24 guardaba el conjunto como
 * UN JSON bajo la llave del día, y sellar era leer–mezclar–escribir
 * ese JSON. localStorage no es atómico entre pestañas: una pestaña que
 * sellaba calculando sobre una lectura tomada antes de la escritura de
 * otra pisaba su mezcla, y la serie de la primera SALÍA del conjunto
 * duradero — tras deshacer su asentamiento, re-asentaba a la siguiente
 * apertura: el Deshacer no aguantaba el resto del día, la promesa
 * exacta que este sello existe para guardar. Desde esta cura NO HAY
 * FUSIÓN: cada serie sella bajo su propia llave
 * (`faro-autopay-day.<uid>.<serie>` = el día), y el camino de escritura
 * no lee nada — dos pestañas no pueden perderse sellos entre sí porque
 * no comparten ningún valor que pisar. El conjunto se lee enumerando
 * las llaves propias del sello (el almacenamiento de la casa sabe
 * listar las suyas). Y el Deshacer aguanta el resto del día TAMBIÉN
 * bajo intercalado entre pestañas desfasadas: esa es la doctrina que
 * este párrafo promete desde hoy. Las formas legadas se siguen leyendo
 * como lo que eran: la fecha a secas (la .361) = el día entero
 * sellado, y el JSON del conjunto (la forma de la ola 24) = las series
 * que nombra, selladas ese día.
 */
export interface AutopaySealStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  /** Las llaves del aparato que empiezan por el prefijo — la casa del
   * sello sabe listar las suyas: el conjunto de series selladas se lee
   * enumerando las llaves por serie (cura de la ola 25). */
  keys(prefix: string): string[];
}

export function autopaySealKey(userId: string): string {
  return `faro-autopay-day.${userId}`;
}

/** La llave PROPIA de una serie (cura de la ola 25): cada serie sella
 * bajo la suya, con el día por valor — sin ningún valor compartido que
 * dos pestañas puedan pisarse. */
export function autopaySeriesSealKey(userId: string, seriesId: string): string {
  return `${autopaySealKey(userId)}.${seriesId}`;
}

/** La lectura de las formas LEGADAS del sello, bajo la llave del día:
 * la fecha a secas (la .361 = el día entero sellado) y el JSON del
 * conjunto (la forma de la ola 24 = las series que nombra). Cualquier
 * otra cosa no es un sello. La forma viva desde la ola 25 no vive
 * aquí: vive en las llaves por serie, que autopaySealedSeries enumera. */
function readSeal(storage: AutopaySealStorage, userId: string): { day: string; all: boolean; series: string[] } | null {
  let raw: string | null;
  try {
    raw = storage.read(autopaySealKey(userId));
  } catch {
    return null;
  }
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { day: raw, all: true, series: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.day !== "string") return null;
    const series = Array.isArray(o.series) ? o.series.filter((x): x is string => typeof x === "string") : [];
    return { day: o.day, all: false, series };
  } catch {
    return null;
  }
}

/** ¿Está el DÍA entero sellado en este aparato? (La forma legada, o un
 * sellado sin lista: sellar sin series sella el día, como siempre.) */
export function autopaySealedOn(storage: AutopaySealStorage, userId: string, today: string): boolean {
  const seal = readSeal(storage, userId);
  return !!seal && seal.day === today && seal.all;
}

/** Las series que este aparato ya asentó hoy (vacío si no hay sello de
 * hoy; si el día está sellado entero, el proveedor ni llega aquí:
 * autopaySealedOn ya lo detuvo). El conjunto une las dos lecturas: las
 * llaves por serie de la forma viva (cada una vale su día) y las series
 * que la forma legada en JSON aún nombra para hoy — un aparato que
 * selló con la forma vieja no pierde sus sellos al actualizar. */
export function autopaySealedSeries(storage: AutopaySealStorage, userId: string, today: string): Set<string> {
  const out = new Set<string>();
  const seal = readSeal(storage, userId);
  if (seal && seal.day === today) for (const id of seal.series) out.add(id);
  const prefix = `${autopaySealKey(userId)}.`;
  try {
    for (const key of storage.keys(prefix)) {
      if (storage.read(key) === today) out.add(key.slice(prefix.length));
    }
  } catch {
    /* Sin enumeración no hay conjunto por serie que leer: quedan las
     * formas legadas de arriba, y el sello degrada como degrada. */
  }
  return out;
}

/** Sellar: sin lista de series, el día entero (la forma de siempre,
 * bajo la llave del día); con lista, CADA serie sella bajo su propia
 * llave con el día por valor (cura de la ola 25) — el camino de
 * escritura no lee nada, así que no hay fusión que una pestaña
 * desfasada pueda pisar: sellar dos series en dos pestañas deja los
 * dos sellos, siempre. */
export function sealAutopayDay(storage: AutopaySealStorage, userId: string, today: string, seriesIds?: string[]): void {
  try {
    if (!seriesIds) {
      storage.write(autopaySealKey(userId), today);
      return;
    }
    for (const id of seriesIds) storage.write(autopaySeriesSealKey(userId, id), today);
  } catch {
    /* El aparato no guarda (modo privado, cuota): el sello degrada a la
     * sesión en el proveedor, declarado allí. El motor sigue siendo
     * idempotente por construcción. */
  }
}
