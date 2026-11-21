/**
 * askmap.ts — EL MAPA DE FUNCIONES DE FARO, como DATO (rama independiente
 * «banco del Asesor», 2026-11-20; base canon 1.3.353 — integrado a canon
 * por la decisión de fusión de Oscar del 2026-11-20, ola 1.3.355).
 *
 * Para qué existe: el Asesor solo puede responder lo que el sistema sabe
 * calcular, y cada cifra que dice tiene UNA casa — el motor que la calcula
 * y la pantalla que la reporta. Este archivo es esa verdad escrita una
 * sola vez: cada función de Faro con su motor (módulo/función reales del
 * código), las cifras que produce, la pantalla donde el usuario las ve, y
 * la regla de procedencia que manda cómo se cuentan (qué líneas entran,
 * cuáles jamás: inactivas, en descanso, transferencias, borradores).
 *
 * Lo consumen: questionbank.ts (cada familia de preguntas declara su
 * fuente AQUÍ, por id) y la familia «Faro mismo» de ask2.ts (¿dónde veo
 * X? se responde desde este mapa, con la puerta del Manual).
 *
 * Reglas madre que gobiernan TODO el mapa (del MAPA-ESPACIO-LOGICO y de
 * las leyes vivas del libro):
 *  R1 Una sola fuente de verdad: la respuesta usa el MISMO motor que la
 *     pantalla; si difieren, el equivocado es el Asesor, nunca la pantalla.
 *  R2 Cero fabricación: lo que el libro no trae, la respuesta lo pide o
 *     lo declara — jamás lo estima en silencio.
 *  R3 La puerta anti-fuga: línea inactiva, en descanso (rest) o
 *     transferencia (xfer) NO cuenta en ninguna lectura.
 *  R4 La bandeja no es dinero: los borradores viven fuera de `months`;
 *     ningún total los ve hasta que la mesa los guarda como líneas.
 *  R5 Apartar no es salir: lo apartado sigue siendo del usuario; solo la
 *     resta NOMBRADA del dinero libre lo descuenta, pieza por pieza.
 *  R6 USD y NIO son procesadas (conversión con rateE4, la tasa manual
 *     manda); la moneda invitada es SOLO lectura y jamás alimenta una
 *     respuesta del Asesor como si fuera dinero del libro.
 *  R7 El supuesto se dice: toda proyección declara su supuesto en la
 *     misma respuesta.
 */

export type FunctionEntry = {
  /** Id estable de la función (lo citan las familias del banco). */
  id: string;
  /** Área / capítulo del Manual al que pertenece. */
  area: string;
  /** Nombre de la función en la voz de la app. */
  name: { es: string; en: string };
  /** Pantalla o superficie donde el usuario VE estas cifras. */
  screen: { es: string; en: string };
  /** El motor real: módulo y función del código que calculan la cifra. */
  engine: string;
  /** Las cifras que esta función produce (en la moneda de vista). */
  figures: string[];
  /** Cómo se cuenta: la regla de procedencia de esas cifras. */
  counts: string;
  /** Palabras (texto plegado) con las que un usuario nombra esta función
   * al preguntar por la app misma («¿dónde veo…?»). */
  keys: string[];
};

export const FARO_FUNCTION_MAP: FunctionEntry[] = [
  {
    id: "central.queda",
    area: "Central",
    name: { es: "La Queda de Central", en: "Desk's Left" },
    screen: { es: "Central, cifra mayor", en: "Desk, headline figure" },
    engine: "advisor.ts · readAdvisor → Reading.left",
    figures: ["left (queda del mes)", "income", "outTotal", "realSpend"],
    counts: "Entró (ingresos del mes) − salió (salidas del mes), líneas activas del bucket del mes, en moneda de vista. Es la MISMA cifra de Central y de la Lectura: una sola.",
    keys: ["queda", "cuanto me queda", "left", "central"],
  },
  {
    id: "central.tengo",
    area: "Central",
    name: { es: "Tengo (saldos y cuentas)", en: "Have (balances and accounts)" },
    screen: { es: "Central, ficha Tengo", en: "Desk, Have chip" },
    engine: "savings.ts · savingsStock (clase cuenta) + funds.ts · hostAccounts",
    figures: ["saldo por cuenta", "saldo total en cuentas"],
    counts: "Por serie: la última foto de saldo manda; los depósitos posteriores a la foto se suman; los anteriores ya están dentro de la foto y jamás se cuentan dos veces.",
    keys: ["tengo", "saldo", "cuentas", "balance", "accounts"],
  },
  {
    id: "central.gastare",
    area: "Central",
    name: { es: "Gastaré (lo que viene del mes)", en: "Spending (what's ahead this month)" },
    screen: { es: "Central, ficha Gastaré", en: "Desk, Spending chip" },
    engine: "dues.ts · duesWindow + engine.ts · summarize",
    figures: ["cuotas por vencer", "gasto fijo comprometido"],
    counts: "Obligaciones con nextDue dentro de la ventana, deduplicadas por serie+día; tarjetas por su mínimo si el banco lo mostró, si no por el saldo entero.",
    keys: ["gastare", "voy a gastar", "viene", "spending ahead"],
  },
  {
    id: "central.pagos",
    area: "Central",
    name: { es: "Pagos (Me deben · Debo · Cuotas · Préstamos)", en: "Payments" },
    screen: { es: "Central, ficha Pagos → Cobros", en: "Desk, Payments chip → Collections" },
    engine: "debts.ts · lentTotals/loanTotals + cards.ts · cardTotals + dues.ts · duesWindow",
    figures: ["me deben", "debo", "cuotas del mes", "préstamos"],
    counts: "Cada lado con su motor: lo prestado (lent), lo recibido (loans), tarjetas (cards) y cuotas (dues) nunca se mezclan en una sola suma sin nombrar sus piezas.",
    keys: ["pagos", "payments", "cobros"],
  },
  {
    id: "central.hoy",
    area: "Central",
    name: { es: "Puedes gastar hoy", en: "What you can spend today" },
    screen: { es: "Central, lente del día", en: "Desk, today's lens" },
    engine: "advisor.ts · readAdvisor (ritmo del mes) + funds.ts · cushionOf",
    figures: ["gasto diario seguro", "ritmo del mes"],
    counts: "La queda repartida en los días que faltan del mes, con el colchón intacto: es una lectura del ritmo, no una autorización.",
    keys: ["puedo gastar hoy", "gasto de hoy", "spend today"],
  },
  {
    id: "libros.lineas",
    area: "Libros",
    name: { es: "Los libros del mes (Ingresos · Fijos · Variables · Compras)", en: "The month's books" },
    screen: { es: "Libros, las cuatro tarjetas", en: "Books, the four cards" },
    engine: "engine.ts · summarize / monthLines",
    figures: ["income", "fixed", "variable", "purchases", "subscriptions", "expense", "spend (gasto de verdad, sin rol ahorro)"],
    counts: "Por clase de línea del bucket del mes. `spend` excluye las líneas de rol ahorro: apartar no es gastar (R5). Las suscripciones son su propia clase.",
    keys: ["libros", "ingresos", "fijos", "variables", "compras", "books"],
  },
  {
    id: "libros.neto",
    area: "Libros",
    name: { es: "Balance neto y últimos 6 meses", en: "Net balance and last 6 months" },
    screen: { es: "Libros, balance neto", en: "Books, net balance" },
    engine: "debts.ts · netBalance + engine.ts · yearPoints/compareSpans",
    figures: ["balance neto (activos − deuda total)", "serie de 6 meses"],
    counts: "El neto cruza libros: saldos y por cobrar contra la deuda total (tarjetas + préstamos + líneas de deuda). Cada pieza se nombra.",
    keys: ["balance neto", "neto", "net balance", "ultimos meses"],
  },
  {
    id: "cobros.mideben",
    area: "Cobros",
    name: { es: "Me deben (préstamos dados)", en: "Owed to me" },
    screen: { es: "Cobros → Me deben", en: "Collections → Owed to me" },
    engine: "debts.ts · lentOf/lentState/lentTotals/peopleOf('owed')",
    figures: ["queda por persona", "total por cobrar", "último abono", "días desde el último abono"],
    counts: "Por préstamo dado: monto − abonos (líneas de ingreso con lentId). Archivado = cerrado, queda 0. El ranking por persona sale de peopleOf, ordenado por queda.",
    keys: ["me deben", "preste", "quien me debe", "owed to me", "lent"],
  },
  {
    id: "cobros.debo",
    area: "Cobros",
    name: { es: "Debo (préstamos recibidos)", en: "I owe (loans received)" },
    screen: { es: "Cobros → Debo → Préstamos", en: "Collections → I owe → Loans" },
    engine: "loans.ts · loansOf/loanState/loanTotals/interestPaidTotal",
    figures: ["queda por préstamo", "interés pagado (año/total)", "interés devengado sin pagar"],
    counts: "Interés simple por días (loans.ts · simpleInterest). Un abono sin desglose registrado NO inventa su parte de interés (1.3.149).",
    keys: ["debo", "prestamo", "me prestaron", "i owe", "loan"],
  },
  {
    id: "cobros.tarjetas",
    area: "Cobros",
    name: { es: "Tarjetas de crédito", en: "Credit cards" },
    screen: { es: "Cobros → Debo → Tarjetas", en: "Collections → I owe → Cards" },
    engine: "cards.ts · cardFigures/cardTotals/rewardsTotals",
    figures: ["saldo", "disponible", "límite", "mínimo", "fecha de pago", "uso %", "interés al mes", "recompensas"],
    counts: "Las cifras viven en las lecturas (snapshots) de la tarjeta: la última lectura manda. Pagar la tarjeta es transferencia (xfer): baja el saldo sin contarse como gasto — el gasto ya contó al comprar.",
    keys: ["tarjeta", "card", "saldo de la tarjeta", "minimo", "recompensas", "rewards"],
  },
  {
    id: "cobros.cuotas",
    area: "Cobros",
    name: { es: "Cuotas y suscripciones", en: "Dues and subscriptions" },
    screen: { es: "Cobros → Cuotas · Central → Pagos", en: "Collections → Dues" },
    engine: "dues.ts · duesWindow (kinds: cuota/card/loan/lent)",
    figures: ["próximo pago", "fecha", "monto", "vencidas"],
    counts: "La ventana une las cuatro clases de obligación con su fecha real (nextDue de la línea, dueOn de la tarjeta, día de pago del préstamo). Vencida se dice vencida.",
    keys: ["cuota", "cuotas", "suscripcion", "vencimiento", "due", "subscription"],
  },
  {
    id: "cobros.plan",
    area: "Cobros",
    name: { es: "Plan de pago de deudas", en: "Debt payoff plan" },
    screen: { es: "Cobros → Plan de pago", en: "Collections → Payoff plan" },
    engine: "debts.ts · payoffPlan/simulatePlan (avalancha y bola de nieve)",
    figures: ["meses hasta libre", "interés total por orden", "ahorro de un orden contra el otro", "primera deuda"],
    counts: "Simulación mes a mes con el presupuesto del usuario o, si no lo fijó, con su ritmo real de abonos de 90 días — y la respuesta DICE cuál de los dos usó (R7).",
    keys: ["plan de pago", "salir de deudas", "avalancha", "payoff", "debt plan"],
  },
  {
    id: "ahorros.stock",
    area: "Ahorros",
    name: { es: "El ahorro total y sus clases", en: "Total savings and its classes" },
    screen: { es: "Ahorros · Central, banda de ahorros", en: "Savings · Desk savings band" },
    engine: "savings.ts · savingsStock",
    figures: ["total", "cuenta", "retiro", "aparte", "saldo (comprometido)", "sin declarar", "emergencia"],
    counts: "LA caminata única del ahorro: por serie, la última foto de saldo + depósitos posteriores. Las cinco clases suman EXACTAMENTE el total. Apartado del saldo (pledged) es una lectura sobre cuentas, no una suma aparte (R5).",
    keys: ["ahorro", "ahorros", "guardado", "apartado", "savings", "meta", "emergencia", "retiro"],
  },
  {
    id: "ahorros.colchon",
    area: "Ahorros",
    name: { es: "El colchón", en: "The cushion" },
    screen: { es: "Estudio → Colchón real · Asesor", en: "Study → Real cushion" },
    engine: "funds.ts · cushionOf (sobre savingsStock)",
    figures: ["colchón en dinero", "meses de colchón", "lo que falta para cubrirlo (floorShortfall)"],
    counts: "Meses de esenciales (ajuste del usuario) contra lo guardado en cuentas/emergencia. Lo que falta es la pieza que la resta del dinero libre descuenta.",
    keys: ["colchon", "cushion", "emergencia", "fondo de emergencia"],
  },
  {
    id: "ahorros.mes",
    area: "Ahorros",
    name: { es: "Apartado del mes y ritmo de la meta", en: "Set aside this month and goal pace" },
    screen: { es: "Central → Si apartas · Asesor", en: "Desk → If you set aside" },
    engine: "engine.ts · summarize → savingsFlow/savingsGoal + advisor.ts (ritmo de la Meta)",
    figures: ["apartado del mes", "meta de apartado (% del ingreso)", "ritmo hacia la meta"],
    counts: "savingsFlow cuenta solo SALIDAS hacia el ahorro: un ingreso archivado en la categoría de ahorro no es apartado. La meta es el % del ingreso fijado en Ajustes.",
    keys: ["aparte este mes", "apartado del mes", "meta de ahorro", "ritmo de ahorro"],
  },
  {
    id: "estudio.salud",
    area: "Estudio",
    name: { es: "La salud de tu dinero (nota y cinco chequeos)", en: "Your money's health" },
    screen: { es: "Estudio, primera tarjeta", en: "Study, first card" },
    engine: "engine.ts · studyBoard/buildInsights",
    figures: ["nota", "cinco chequeos", "hasta dónde alcanza"],
    counts: "Los chequeos leen los mismos motores (queda, deuda, colchón, ritmo): la nota nunca contradice a Central porque nace de las mismas cifras.",
    keys: ["salud", "nota", "chequeos", "health", "grade"],
  },
  {
    id: "estudio.flujo",
    area: "Estudio",
    name: { es: "Recorrido del dinero y en qué se va", en: "Cash flow and where it goes" },
    screen: { es: "Estudio → Recorrido · En qué se va el gasto", en: "Study → Flow" },
    engine: "engine.ts · cashSankey/categorySlices/spendCategorySlices",
    figures: ["flujo entrada→categoría→salida", "rebanadas por categoría", "dónde se va el 80%"],
    counts: "Rebanadas sobre el gasto de verdad (spend, sin rol ahorro). La tienda de una compra es su storeId; la categoría, su categoryId — nunca el texto libre solo.",
    keys: ["en que se va", "recorrido", "flujo", "donde se va", "flow", "tienda", "store"],
  },
  {
    id: "estudio.regla",
    area: "Estudio",
    name: { es: "La regla 50·30·20 y los números clave", en: "The 50·30·20 rule and key numbers" },
    screen: { es: "Estudio → Regla · Números clave", en: "Study → Rule · Key numbers" },
    engine: "engine.ts · buildBudget/buildInsights + keynumbers.ts",
    figures: ["necesidades/gustos/ahorro %", "ingreso comprometido", "rigidez", "hormiga en un año", "día en que el mes no alcanza"],
    counts: "GUSTOS = el gasto variable de ocio/personales/hormiga contra el 30% del ingreso: es la casa de la pregunta «¿cuánto tengo para gustos?», cruzada con el dinero libre antes de autorizar un monto.",
    keys: ["gustos", "antojos", "50 30 20", "hormiga", "numeros clave", "wants"],
  },
  {
    id: "asesor.lectura",
    area: "Asesor",
    name: { es: "La Lectura del Asesor", en: "The Advisor's Reading" },
    screen: { es: "Asesor, la tarjeta mayor", en: "Advisor, the main card" },
    engine: "advisor.ts · readAdvisor → Reading",
    figures: ["headline", "left", "escenarios base/repetir/plan", "palancas", "remesas del mes", "ritmo", "contradicción interna"],
    counts: "La Lectura es la ÚNICA fuente de las respuestas de Preguntar: si una cifra no está en la Lectura ni en un motor nombrado de este mapa, el Asesor no la dice.",
    keys: ["asesor", "como voy", "lectura", "advisor", "how am i doing"],
  },
  {
    id: "asesor.escenarios",
    area: "Asesor",
    name: { es: "¿Qué pasa si…? (escenarios)", en: "What if…? (scenarios)" },
    screen: { es: "Asesor → ¿Qué pasa si…?", en: "Advisor → What if…?" },
    engine: "advisor.ts · projectLeft (base/repeat/plan)",
    figures: ["queda si se repite el mes", "queda con el plan", "efecto de quitar gastos"],
    counts: "Proyección = la queda recalculada sin las líneas que el escenario quita. El supuesto se nombra en la respuesta (R7). Asiento advisor.ask-scenarios (Completo).",
    keys: ["que pasa si", "escenario", "what if", "scenario"],
  },
  {
    id: "historial.stream",
    area: "Folios",
    name: { es: "El Historial (Folios): todo movimiento", en: "Historial: every movement" },
    screen: { es: "Folios / Historial, con sus filtros", en: "Folios / Historial" },
    engine: "historial.ts · buildStream/streamTotals + periodRange",
    figures: ["entró", "salió", "neto", "conteo", "último movimiento de un filtro"],
    counts: "El stream cruza TODOS los meses (no solo el abierto): es la casa de «lo último que…» y de la historia por período. La fecha de una línea es su bookedOn; sin bookedOn, el día 1 de su mes — y la respuesta lo trata como fecha de mes, no de día exacto.",
    keys: ["historial", "ultimo", "ultima vez", "cuando fue", "history", "last time"],
  },
  {
    id: "remesas.personas",
    area: "Ajustes",
    name: { es: "Remesas por persona", en: "Remittances by person" },
    screen: { es: "Ajustes → Remesas · Estudio → Remesas", en: "Settings → Remittances" },
    engine: "advisor.ts (remitNote) + remit-people.ts + líneas de rol remittance (line.to)",
    figures: ["enviado este mes/año/total por persona", "contra el mes pasado", "% del ingreso"],
    counts: "Solo líneas de rol remittance; la persona es line.to (catálogo remitPeople). Sin persona = «Sin persona», jamás asignada por el texto.",
    keys: ["remesa", "remesas", "envie", "mande", "mama", "remittance", "sent"],
  },
  {
    id: "captura.bandeja",
    area: "Captura",
    name: { es: "La bandeja y la mesa de revisión", en: "The tray and the review table" },
    screen: { es: "Libros → La bandeja y la mesa", en: "Books → The tray and the table" },
    engine: "drafts.ts · addDrafts/validateDraft/commitDrafts/findDup",
    figures: ["borradores por revisar", "dudas (ámbar)", "faltantes (rojo)", "posible duplicado"],
    counts: "R4: el borrador NO es dinero. Solo al guardar en la mesa nace la línea, y solo entonces cualquier total puede verla. El duplicado se avisa, no se bloquea.",
    keys: ["bandeja", "mesa", "borrador", "tray", "draft"],
  },
  {
    id: "captura.escribir",
    area: "Captura",
    name: { es: "Escribir como pienso / Pegar una lista / Escanear", en: "Write it as I think it / Paste a list / Scan" },
    screen: { es: "Hoja de Captura (+ / −)", en: "Capture sheet (+ / −)" },
    engine: "textparse.ts · parsePhrase/parseList + receiptparse/cardparse/bankparse",
    figures: ["borradores interpretados", "qué no se entendió (con su herramienta)"],
    counts: "Interpretar compone ejes de FORMA (monto × fecha × concepto × lugar × libro), orden libre. Lo no entendido cae en la mesa con su herramienta manual (ley D4): nunca se descarta en silencio.",
    keys: ["escribir", "pegar una lista", "escanear", "captura", "write", "scan", "paste"],
  },
  {
    id: "captura.importar",
    area: "Captura",
    name: { es: "Importar (banco, Excel, PDF de Faro)", en: "Import (bank, Excel, Faro's own PDF)" },
    screen: { es: "Importar del banco · Hoja de Importar", en: "Import from your bank" },
    engine: "bankparse.ts + xlsxread (mapa de columnas SIEMPRE antes que las filas)",
    figures: ["nuevos", "duplicados", "transferencias detectadas"],
    counts: "Todo importado pasa por la mesa antes de ser línea. El mapa de columnas se muestra siempre primero: Faro no adivina una columna en silencio.",
    keys: ["importar", "banco", "excel", "import", "bank file"],
  },
  {
    id: "cambio.mesa",
    area: "Mesa de cambio",
    name: { es: "Mesa de cambio: tasa, conversión y moneda invitada", en: "Exchange desk: rate, converter, guest currency" },
    screen: { es: "Mesa de cambio · píldora de moneda", en: "Exchange desk · currency pill" },
    engine: "money.ts · convertMinor (rateE4) + guestRate (solo lectura)",
    figures: ["tasa dólar–córdoba", "conversión", "vista en moneda invitada"],
    counts: "R6: una sola casa de tasas; la manual del usuario manda sobre la traída de la red, y la traída dice su fecha y fuente. La invitada convierte la VISTA, jamás el libro.",
    keys: ["tasa", "cambio", "convertir", "cordobas", "dolares", "rate", "exchange", "invitada"],
  },
  {
    id: "ajustes.estructura",
    area: "Ajustes",
    name: { es: "Estructura, modos y reglas", en: "Structure, modes and rules" },
    screen: { es: "Ajustes → Estructura · Modo", en: "Settings → Structure · Mode" },
    engine: "mode.ts (los asientos de modo) + rules.ts (reglas de comercios aprendidas)",
    figures: ["modo del libro (Esencial/Ritmo/Completo)", "categorías y subconceptos", "reglas aprendidas de la mesa"],
    counts: "El modo gobierna la gestión, nunca la existencia: lo que un modo no muestra, ese modo no lo toca al guardar. Las reglas aprendidas solo sugieren; el usuario las ve y las borra.",
    keys: ["modo", "esencial", "ritmo", "completo", "estructura", "categorias", "reglas", "mode"],
  },
  {
    id: "cuenta.sync",
    area: "Cuenta",
    name: { es: "Cuenta, sincronía y sin internet", en: "Account, sync and offline" },
    screen: { es: "Barra de arriba (punto de sincronía) · Ajustes → Cuenta", en: "Top bar (sync dot)" },
    engine: "spa/cloud.ts + vault.ts (cifrado local)",
    figures: ["estado de sincronía", "sesión", "copias de seguridad"],
    counts: "La puerta de Faro es permanente: entrar sin internet, trabajar, guardar local y sincronizar al volver la conexión. Ninguna respuesta del Asesor depende de la red.",
    keys: ["cuenta", "sincron", "sin internet", "offline", "copia de seguridad", "backup", "account"],
  },
];

/** LA PUERTA DE CADA FUNCIÓN (injerto de la fusión, 1.3.355): el tema
 * del Manual cuya «Ir allí» aterriza donde la función vive. Solo entran
 * las funciones cuyo tema tiene ruta verificada; las demás se quedan con
 * la respuesta en prosa del banco (la nota nombra el tema). La cerca de
 * captura355 exige que cada entrada resuelva a un tema con `go`. */
export const FUNCTION_TOPIC: Record<string, string> = {
  "central.queda": "central",
  "central.tengo": "central",
  "central.gastare": "central",
  "central.pagos": "cobros",
  "central.hoy": "central",
  "libros.lineas": "libros",
  "libros.neto": "libros",
  "cobros.mideben": "me-deben",
  "cobros.debo": "debo",
  "cobros.tarjetas": "tarjetas",
  "cobros.cuotas": "cuotas",
  "cobros.plan": "plan-pago",
  "estudio.salud": "estudio",
  "estudio.flujo": "estudio",
  "estudio.regla": "estudio",
  "asesor.lectura": "asesor",
  "asesor.escenarios": "asesor",
};

/** Busca la función del mapa que un usuario nombra al preguntar por la
 * app misma. Devuelve la de más palabras clave coincidentes; null si
 * ninguna nombra nada del mapa (silencio honesto de la familia). */
export function functionOfQuestion(folded: string): FunctionEntry | null {
  let best: FunctionEntry | null = null;
  let bestScore = 0;
  for (const f of FARO_FUNCTION_MAP) {
    let score = 0;
    for (const k of f.keys) if (folded.includes(k)) score += k.length;
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return bestScore > 0 ? best : null;
}
