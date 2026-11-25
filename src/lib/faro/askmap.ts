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

import type { BookMode } from "./advisor.ts";

export type FunctionEntry = {
  /** Id estable de la función (lo citan las familias del banco). */
  id: string;
  /** El modo mínimo en que las CARAS de esta función viven (cura de la
   * ola 23, A23-5): solo se declara donde una ola lo midió — la familia
   * «Faro mismo» no dice su fórmula («ahí ves las mismas cifras que yo
   * uso») de una cara que el modo de la persona no muestra; nombra el
   * piso. Sin declaración, la función se presume visible en todo modo
   * (las presunciones del mapa no se inventan: se miden). */
  minMode?: BookMode;
  /** Área / capítulo del Manual al que pertenece, en los dos idiomas.
   * OLA 26 (Familia 10; fallo de Oscar, 2026-11-21 23:42 EST: «No es
   * Spanglish. Cada idioma preserva su autoría»): era una cadena única
   * en español y el veredicto EN de Faro mismo nombraba «Cuenta»,
   * «Mesa de cambio» y «Captura» en un libro en inglés. Cada entrada
   * declara el nombre de su zona en cada idioma — el de la cara viva
   * de la app en ese idioma (Desk, Collections, Exchange desk,
   * Account…), jamás una traducción que la app no muestre. */
  area: { es: string; en: string };
  /** OLA 26 (Familia 5, Q26-1 de Cara): la función cuya casa NO guarda
   * cifras — el nombre, el compartir, la fila de preguntas. La fórmula
   * «ahí ves las mismas cifras que yo uso para responderte» se dice
   * SOLO donde el destino guarda cifras; las entradas con esta marca
   * componen su veredicto sin la fórmula, también bajo su piso. Solo
   * se declara donde una ola lo midió. */
  sinCifras?: boolean;
  /** Nombre de la función en la voz de la app. */
  name: { es: string; en: string };
  /** §21 (1.3.382): qué hace, en UNA línea y en la voz del usuario —
   * la línea que el índice de búsqueda de las funciones muestra bajo
   * el nombre. Sin eslóganes: dice el oficio, no lo vende. La cerca
   * de captura382 exige esta línea en TODA entrada (L-B7). */
  does: { es: string; en: string };
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
    area: { es: "Central", en: "Desk" },
    name: { es: "La Queda de Central", en: "Desk's Left" },
    does: { es: "Lo que queda del mes: lo que entró menos lo que salió.", en: "What's left this month: what came in minus what went out." },
    screen: { es: "Central, cifra mayor", en: "Desk, headline figure" },
    engine: "advisor.ts · readAdvisor → Reading.left",
    figures: ["left (queda del mes)", "income", "outTotal", "realSpend"],
    counts: "Entró (ingresos del mes) − salió (salidas del mes), líneas activas del bucket del mes, en moneda de vista. Es la MISMA cifra de Central y de la Lectura: una sola.",
    keys: ["queda", "cuanto me queda", "left", "central"],
  },
  {
    id: "central.tengo",
    area: { es: "Central", en: "Desk" },
    name: { es: "Tengo (saldos y cuentas)", en: "Have (balances and accounts)" },
    does: { es: "Tus saldos por cuenta y el total que tienes.", en: "Your balances by account and your total." },
    screen: { es: "Central, ficha Tengo", en: "Desk, Have chip" },
    engine: "savings.ts · savingsStock (clase cuenta) + funds.ts · hostAccounts",
    figures: ["saldo por cuenta", "saldo total en cuentas"],
    counts: "Por serie: la última foto de saldo manda; los depósitos posteriores a la foto se suman; los anteriores ya están dentro de la foto y jamás se cuentan dos veces.",
    keys: ["tengo", "saldo", "cuentas", "balance", "accounts"],
  },
  {
    id: "central.gastare",
    area: { es: "Central", en: "Desk" },
    name: { es: "Gastaré (lo que viene del mes)", en: "Spending (what's ahead this month)" },
    does: { es: "Lo que el mes todavía te va a pedir: cuotas y fijos por venir.", en: "What the month will still ask of you: dues and fixed costs ahead." },
    screen: { es: "Central, ficha Gastaré", en: "Desk, Spending chip" },
    engine: "dues.ts · duesWindow + engine.ts · summarize",
    figures: ["cuotas por vencer", "gasto fijo comprometido"],
    counts: "Obligaciones con nextDue dentro de la ventana, deduplicadas por serie+día; tarjetas por su mínimo si el banco lo mostró, si no por el saldo entero.",
    keys: ["gastare", "voy a gastar", "viene", "spending ahead"],
  },
  {
    id: "central.pagos",
    area: { es: "Central", en: "Desk" },
    name: { es: "Pagos (Me deben · Debo · Cuotas · Préstamos)", en: "Payments" },
    does: { es: "Lo que te deben, lo que debes, tus cuotas y préstamos, cada lado en su sitio.", en: "What you're owed, what you owe, your dues and loans, each in its place." },
    screen: { es: "Central, ficha Pagos → Cobros", en: "Desk, Payments chip → Collections" },
    engine: "debts.ts · lentTotals/loanTotals + cards.ts · cardTotals + dues.ts · duesWindow",
    figures: ["me deben", "debo", "cuotas del mes", "préstamos"],
    counts: "Cada lado con su motor: lo prestado (lent), lo recibido (loans), tarjetas (cards) y cuotas (dues) nunca se mezclan en una sola suma sin nombrar sus piezas.",
    keys: ["pagos", "payments", "cobros"],
  },
  {
    id: "central.hoy",
    area: { es: "Central", en: "Desk" },
    name: { es: "Puedes gastar hoy", en: "What you can spend today" },
    does: { es: "Cuánto puedes gastar hoy sin romper el ritmo del mes.", en: "How much you can spend today without breaking the month's pace." },
    screen: { es: "Central, lente del día", en: "Desk, today's lens" },
    engine: "advisor.ts · readAdvisor (ritmo del mes) + funds.ts · cushionOf",
    figures: ["gasto diario seguro", "ritmo del mes"],
    counts: "La queda repartida en los días que faltan del mes, con el colchón intacto: es una lectura del ritmo, no una autorización.",
    keys: ["puedo gastar hoy", "gasto de hoy", "spend today"],
  },
  {
    id: "libros.lineas",
    area: { es: "Libros", en: "Books" },
    name: { es: "Los libros del mes (Ingresos · Fijos · Variables · Compras)", en: "The month's books" },
    does: { es: "Tus ingresos, fijos, variables y compras del mes, libro por libro.", en: "Your income, fixed, variable and purchases this month, book by book." },
    screen: { es: "Libros, las cuatro tarjetas", en: "Books, the four cards" },
    engine: "engine.ts · summarize / monthLines",
    figures: ["income", "fixed", "variable", "purchases", "subscriptions", "expense", "spend (gasto de verdad, sin rol ahorro)"],
    counts: "Por clase de línea del bucket del mes. `spend` excluye las líneas de rol ahorro: apartar no es gastar (R5). Las suscripciones son su propia clase.",
    keys: ["libros", "ingresos", "fijos", "variables", "compras", "books"],
  },
  {
    id: "libros.neto",
    area: { es: "Libros", en: "Books" },
    name: { es: "Balance neto y últimos 6 meses", en: "Net balance and last 6 months" },
    does: { es: "Tu balance neto y cómo viene la serie de los últimos 6 meses.", en: "Your net balance and the last 6 months' trend." },
    screen: { es: "Libros, balance neto", en: "Books, net balance" },
    engine: "debts.ts · netBalance + engine.ts · yearPoints/compareSpans",
    figures: ["balance neto (activos − deuda total)", "serie de 6 meses"],
    counts: "El neto cruza libros: saldos y por cobrar contra la deuda total (tarjetas + préstamos + líneas de deuda). Cada pieza se nombra.",
    keys: ["balance neto", "neto", "net balance", "ultimos meses"],
  },
  {
    id: "cobros.mideben",
    area: { es: "Cobros", en: "Collections" },
    name: { es: "Me deben (préstamos dados)", en: "Owed to me" },
    does: { es: "Quién te debe, cuánto queda por persona y cuándo abonaron.", en: "Who owes you, what's left per person and when they last paid." },
    screen: { es: "Cobros → Me deben", en: "Collections → Owed to me" },
    engine: "debts.ts · lentOf/lentState/lentTotals/peopleOf('owed')",
    figures: ["queda por persona", "total por cobrar", "último abono", "días desde el último abono"],
    counts: "Por préstamo dado: monto − abonos (líneas de ingreso con lentId). Archivado = cerrado, queda 0. El ranking por persona sale de peopleOf, ordenado por queda.",
    keys: ["me deben", "preste", "quien me debe", "owed to me", "lent"],
  },
  {
    id: "cobros.debo",
    area: { es: "Cobros", en: "Collections" },
    name: { es: "Debo (préstamos recibidos)", en: "I owe (loans received)" },
    does: { es: "Tus préstamos recibidos: cuánto queda y cuánto interés llevas.", en: "Your loans received: what's left and the interest so far." },
    screen: { es: "Cobros → Debo → Préstamos", en: "Collections → I owe → Loans" },
    engine: "loans.ts · loansOf/loanState/loanTotals/interestPaidTotal",
    figures: ["queda por préstamo", "interés pagado (año/total)", "interés devengado sin pagar"],
    counts: "Interés simple por días (loans.ts · simpleInterest). Un abono sin desglose registrado NO inventa su parte de interés (1.3.149).",
    keys: ["debo", "prestamo", "me prestaron", "i owe", "loan"],
  },
  {
    id: "cobros.tarjetas",
    area: { es: "Cobros", en: "Collections" },
    name: { es: "Tarjetas de crédito", en: "Credit cards" },
    does: { es: "Tus tarjetas: saldo, disponible, mínimo, fecha de pago y recompensas.", en: "Your cards: balance, available, minimum, due date and rewards." },
    screen: { es: "Cobros → Debo → Tarjetas", en: "Collections → I owe → Cards" },
    engine: "cards.ts · cardFigures/cardTotals/rewardsTotals",
    figures: ["saldo", "disponible", "límite", "mínimo", "fecha de pago", "uso %", "interés al mes", "recompensas"],
    counts: "Las cifras viven en las lecturas (snapshots) de la tarjeta: la última lectura manda. Pagar la tarjeta es transferencia (xfer): baja el saldo sin contarse como gasto — el gasto ya contó al comprar.",
    keys: ["tarjeta", "card", "saldo de la tarjeta", "minimo", "recompensas", "rewards"],
  },
  {
    id: "cobros.cuotas",
    area: { es: "Cobros", en: "Collections" },
    name: { es: "Cuotas y suscripciones", en: "Dues and subscriptions" },
    does: { es: "Tus cuotas y suscripciones: próximo pago, fecha y monto.", en: "Your dues and subscriptions: next payment, date and amount." },
    screen: { es: "Cobros → Cuotas · Central → Pagos", en: "Collections → Dues" },
    engine: "dues.ts · duesWindow (kinds: cuota/card/loan/lent)",
    figures: ["próximo pago", "fecha", "monto", "vencidas"],
    counts: "La ventana une las cuatro clases de obligación con su fecha real (nextDue de la línea, dueOn de la tarjeta, día de pago del préstamo). Vencida se dice vencida.",
    keys: ["cuota", "cuotas", "suscripcion", "vencimiento", "due", "subscription"],
  },
  {
    id: "cobros.plan",
    minMode: "completo",
    area: { es: "Cobros", en: "Collections" },
    name: { es: "Plan de pago de deudas", en: "Debt payoff plan" },
    does: { es: "Un plan para salir de deudas: meses que faltan e interés por cada orden.", en: "A plan to get out of debt: months left and interest per order." },
    screen: { es: "Cobros → Plan de pago", en: "Collections → Payoff plan" },
    engine: "debts.ts · payoffPlan/simulatePlan (avalancha y bola de nieve)",
    figures: ["meses hasta libre", "interés total por orden", "ahorro de un orden contra el otro", "primera deuda"],
    counts: "Simulación mes a mes con el presupuesto del usuario o, si no lo fijó, con su ritmo real de abonos de 90 días — y la respuesta DICE cuál de los dos usó (R7).",
    keys: ["plan de pago", "salir de deudas", "avalancha", "payoff", "debt plan"],
  },
  {
    id: "ahorros.stock",
    area: { es: "Ahorros", en: "Savings" },
    name: { es: "El ahorro total y sus clases", en: "Total savings and its classes" },
    does: { es: "Tu ahorro total y sus clases: cuenta, retiro, emergencia y apartado.", en: "Your total savings and its classes: account, retirement, emergency and set-aside." },
    screen: { es: "Ahorros · Central, banda de ahorros", en: "Savings · Desk savings band" },
    engine: "savings.ts · savingsStock",
    figures: ["total", "cuenta", "retiro", "aparte", "saldo (comprometido)", "sin declarar", "emergencia"],
    counts: "LA caminata única del ahorro: por serie, la última foto de saldo + depósitos posteriores. Las cinco clases suman EXACTAMENTE el total. Apartado del saldo (pledged) es una lectura sobre cuentas, no una suma aparte (R5).",
    keys: ["ahorro", "ahorros", "guardado", "apartado", "savings", "meta", "emergencia", "retiro"],
  },
  {
    id: "ahorros.colchon",
    area: { es: "Ahorros", en: "Savings" },
    name: { es: "El colchón", en: "The cushion" },
    does: { es: "Tu colchón: cuántos meses de esenciales cubre lo guardado.", en: "Your cushion: how many months of essentials your savings cover." },
    screen: { es: "Estudio → Colchón real · Asesor", en: "Study → Real cushion" },
    engine: "funds.ts · cushionOf (sobre savingsStock)",
    figures: ["colchón en dinero", "meses de colchón", "lo que falta para cubrirlo (floorShortfall)"],
    counts: "Meses de esenciales (ajuste del usuario) contra lo guardado en cuentas/emergencia. Lo que falta es la pieza que la resta del dinero libre descuenta.",
    keys: ["colchon", "cushion", "emergencia", "fondo de emergencia"],
  },
  {
    id: "ahorros.mes",
    area: { es: "Ahorros", en: "Savings" },
    name: { es: "Apartado del mes y ritmo de la meta", en: "Set aside this month and goal pace" },
    does: { es: "Lo que apartaste este mes y cómo va el ritmo hacia tu meta.", en: "What you set aside this month and the pace toward your goal." },
    screen: { es: "Central → Si apartas · Asesor", en: "Desk → If you set aside" },
    engine: "engine.ts · summarize → savingsFlow/savingsGoal + advisor.ts (ritmo de la Meta)",
    figures: ["apartado del mes", "meta de apartado (% del ingreso)", "ritmo hacia la meta"],
    counts: "savingsFlow cuenta solo SALIDAS hacia el ahorro: un ingreso archivado en la categoría de ahorro no es apartado. La meta es el % del ingreso fijado en Ajustes.",
    keys: ["aparte este mes", "apartado del mes", "meta de ahorro", "ritmo de ahorro"],
  },
  {
    id: "estudio.salud",
    area: { es: "Estudio", en: "Study" },
    name: { es: "La salud de tu dinero (nota y cinco chequeos)", en: "Your money's health" },
    does: { es: "La nota de tu dinero y sus cinco chequeos.", en: "Your money's grade and its five checks." },
    screen: { es: "Estudio, primera tarjeta", en: "Study, first card" },
    engine: "engine.ts · studyBoard/buildInsights",
    figures: ["nota", "cinco chequeos", "hasta dónde alcanza"],
    counts: "Los chequeos leen los mismos motores (queda, deuda, colchón, ritmo): la nota nunca contradice a Central porque nace de las mismas cifras.",
    keys: ["salud", "nota", "chequeos", "health", "grade"],
  },
  {
    id: "estudio.flujo",
    minMode: "ritmo",
    area: { es: "Estudio", en: "Study" },
    name: { es: "Recorrido del dinero y en qué se va", en: "Cash flow and where it goes" },
    does: { es: "El recorrido de tu dinero y en qué se va el gasto.", en: "Your money's flow and where the spending goes." },
    screen: { es: "Estudio → Recorrido · En qué se va el gasto", en: "Study → Flow" },
    engine: "engine.ts · cashSankey/categorySlices/spendCategorySlices",
    figures: ["flujo entrada→categoría→salida", "rebanadas por categoría", "dónde se va el 80%"],
    counts: "Rebanadas sobre el gasto de verdad (spend, sin rol ahorro). La tienda de una compra es su storeId; la categoría, su categoryId — nunca el texto libre solo.",
    keys: ["en que se va", "recorrido", "flujo", "donde se va", "flow", "tienda", "store"],
  },
  {
    id: "estudio.regla",
    area: { es: "Estudio", en: "Study" },
    name: { es: "La regla 50·30·20 y los números clave", en: "The 50·30·20 rule and key numbers" },
    does: { es: "La regla 50·30·20 con tus números y los números clave del mes.", en: "The 50·30·20 rule with your numbers, and the month's key numbers." },
    screen: { es: "Estudio → Regla · Números clave", en: "Study → Rule · Key numbers" },
    engine: "engine.ts · buildBudget/buildInsights + keynumbers.ts",
    figures: ["necesidades/gustos/ahorro %", "ingreso comprometido", "rigidez", "hormiga en un año", "día en que el mes no alcanza"],
    counts: "GUSTOS = el gasto variable de ocio/personales/hormiga contra el 30% del ingreso: es la casa de la pregunta «¿cuánto tengo para gustos?», cruzada con el dinero libre antes de autorizar un monto.",
    keys: ["gustos", "antojos", "50 30 20", "hormiga", "numeros clave", "wants"],
  },
  {
    id: "asesor.lectura",
    area: { es: "Asesor", en: "Advisor" },
    name: { es: "La Lectura del Asesor", en: "The Advisor's Reading" },
    does: { es: "La lectura completa de tu mes, con sus escenarios y palancas.", en: "Your month's full reading, with its scenarios and levers." },
    screen: { es: "Asesor, la tarjeta mayor", en: "Advisor, the main card" },
    engine: "advisor.ts · readAdvisor → Reading",
    figures: ["headline", "left", "escenarios base/repetir/plan", "palancas", "remesas del mes", "ritmo", "contradicción interna"],
    counts: "La Lectura es la ÚNICA fuente de las respuestas de Preguntar: si una cifra no está en la Lectura ni en un motor nombrado de este mapa, el Asesor no la dice.",
    keys: ["asesor", "como voy", "lectura", "advisor", "how am i doing"],
  },
  {
    id: "asesor.escenarios",
    minMode: "completo",
    area: { es: "Asesor", en: "Advisor" },
    name: { es: "¿Qué pasa si…? (escenarios)", en: "What if…? (scenarios)" },
    does: { es: "Qué pasaría con tu queda si quitaras gastos o repitieras el mes.", en: "What would happen to what's left if you cut spending or repeated the month." },
    screen: { es: "Asesor → ¿Qué pasa si…?", en: "Advisor → What if…?" },
    engine: "advisor.ts · projectLeft (base/repeat/plan)",
    figures: ["queda si se repite el mes", "queda con el plan", "efecto de quitar gastos"],
    counts: "Proyección = la queda recalculada sin las líneas que el escenario quita. El supuesto se nombra en la respuesta (R7). Asiento advisor.ask-scenarios (Completo).",
    keys: ["que pasa si", "escenario", "what if", "scenario"],
  },
  {
    // OLA 17 del banco, adoptada en la integración (1.3.383): la
    // familia aprendizaje cita esta función como su fuente — nace con
    // su fold de Ajustes («Lo que tu Asesor ha aprendido», asiento
    // settings.ask-learned, Ritmo: administrar; el aprendizaje mismo
    // funciona en todo modo, como mandó la Ola 11).
    id: "asesor.aprender",
    minMode: "ritmo",
    area: { es: "Asesor", en: "Advisor" },
    name: { es: "Lo que tu Asesor ha aprendido", en: "What your Advisor has learned" },
    does: { es: "Guarda tus palabras para tus cosas — solo las que tú confirmaste — y te deja verlas y borrarlas.", en: "It keeps your words for your things — only the ones you confirmed — and lets you see and delete them." },
    screen: { es: "Ajustes → Lo que tu Asesor ha aprendido", en: "Settings → What your Advisor has learned" },
    engine: "asklearn.ts · learnAlias/forgetAlias/touchAlias + el almacén askPatterns del libro",
    figures: ["la lista de tus patrones: palabra → cosa"],
    counts: "El Asesor aprende solo de eventos confirmados (el toque en su pregunta de vuelta, una corrección tuya) y los dígitos jamás se aprenden: cada cifra sale del libro al responder. Los patrones viven con el libro, fuera de los meses — ningún total los lee.",
    keys: ["aprendido", "aprender", "patrones", "mis palabras", "learned", "patterns", "my words", "lo que has aprendido"],
  },
  {
    id: "historial.stream",
    area: { es: "Folios", en: "Folios" },
    name: { es: "El Historial (Folios): todo movimiento", en: "Historial: every movement" },
    does: { es: "Todo movimiento de todos tus meses, con filtros.", en: "Every movement from all your months, with filters." },
    screen: { es: "Folios / Historial, con sus filtros", en: "Folios / Historial" },
    engine: "historial.ts · buildStream/streamTotals + periodRange",
    figures: ["entró", "salió", "neto", "conteo", "último movimiento de un filtro"],
    counts: "El stream cruza TODOS los meses (no solo el abierto): es la casa de «lo último que…» y de la historia por período. La fecha de una línea es su bookedOn; sin bookedOn, el día 1 de su mes — y la respuesta lo trata como fecha de mes, no de día exacto.",
    keys: ["historial", "ultimo", "ultima vez", "cuando fue", "history", "last time"],
  },
  {
    id: "remesas.personas",
    area: { es: "Ajustes", en: "Settings" },
    name: { es: "Remesas por persona", en: "Remittances by person" },
    does: { es: "Cuánto enviaste a cada persona, este mes, el año y en total.", en: "How much you sent each person, this month, this year and in total." },
    screen: { es: "Ajustes → Remesas · Estudio → Remesas", en: "Settings → Remittances" },
    engine: "advisor.ts (remitNote) + remit-people.ts + líneas de rol remittance (line.to)",
    figures: ["enviado este mes/año/total por persona", "contra el mes pasado", "% del ingreso"],
    counts: "Solo líneas de rol remittance; la persona es line.to (catálogo remitPeople). Sin persona = «Sin persona», jamás asignada por el texto.",
    keys: ["remesa", "remesas", "envie", "mande", "mama", "remittance", "sent"],
  },
  {
    id: "captura.bandeja",
    area: { es: "Captura", en: "Capture" },
    name: { es: "La bandeja y la mesa de revisión", en: "The tray and the review table" },
    does: { es: "Tus borradores por revisar antes de que sean líneas.", en: "Your drafts waiting for review before they become lines." },
    screen: { es: "Libros → La bandeja y la mesa", en: "Books → The tray and the table" },
    engine: "drafts.ts · addDrafts/validateDraft/commitDrafts/findDup",
    figures: ["borradores por revisar", "dudas (ámbar)", "faltantes (rojo)", "posible duplicado"],
    counts: "R4: el borrador NO es dinero. Solo al guardar en la mesa nace la línea, y solo entonces cualquier total puede verla. El duplicado se avisa, no se bloquea.",
    keys: ["bandeja", "mesa", "borrador", "tray", "draft"],
  },
  {
    id: "captura.escribir",
    area: { es: "Captura", en: "Capture" },
    name: { es: "Escribir como pienso / Pegar una lista / Escanear", en: "Write it as I think it / Paste a list / Scan" },
    does: { es: "Anotar escribiendo como piensas, pegando una lista o escaneando.", en: "Jot entries by writing as you think, pasting a list or scanning." },
    screen: { es: "Hoja de Captura (+ / −)", en: "Capture sheet (+ / −)" },
    engine: "textparse.ts · parsePhrase/parseList + receiptparse/cardparse/bankparse",
    figures: ["borradores interpretados", "qué no se entendió (con su herramienta)"],
    counts: "Interpretar compone ejes de FORMA (monto × fecha × concepto × lugar × libro), orden libre. Lo no entendido cae en la mesa con su herramienta manual (ley D4): nunca se descarta en silencio.",
    keys: ["escribir", "pegar una lista", "escanear", "captura", "write", "scan", "paste"],
  },
  {
    id: "captura.importar",
    area: { es: "Captura", en: "Capture" },
    name: { es: "Importar (banco, Excel, PDF de Faro)", en: "Import (bank, Excel, Faro's own PDF)" },
    does: { es: "Traer movimientos de tu banco, de Excel o de un PDF de Faro.", en: "Bring entries from your bank, Excel or a Faro PDF." },
    screen: { es: "Importar del banco · Hoja de Importar", en: "Import from your bank" },
    engine: "bankparse.ts + xlsxread (mapa de columnas SIEMPRE antes que las filas)",
    figures: ["nuevos", "duplicados", "transferencias detectadas"],
    counts: "Todo importado pasa por la mesa antes de ser línea. El mapa de columnas se muestra siempre primero: Faro no adivina una columna en silencio.",
    keys: ["importar", "banco", "excel", "import", "bank file"],
  },
  {
    // Ola 8 (1.3.388): la billetera por notificaciones nace con su
    // entrada en el índice (L-B7), su tema («billetera-notificaciones»)
    // y sus asientos (capture.notices Esencial, capture.notices-admin
    // Ritmo). Solo Android, por construcción.
    id: "captura.billetera",
    minMode: "esencial",
    area: { es: "Captura", en: "Capture" },
    name: { es: "La billetera por notificaciones", en: "The wallet by notifications" },
    does: { es: "Escucha los avisos de pago de Samsung Wallet y Google Wallet y redacta borradores en la bandeja. Solo Android.", en: "Listens to Samsung Wallet and Google Wallet payment notices and drafts entries in the tray. Android only." },
    screen: { es: "Ajustes → Billetera por notificaciones", en: "Settings → Wallet by notifications" },
    engine: "notices.ts · interpretNotice (la cáscara escucha; la página interpreta; solo la mesa escribe)",
    figures: ["borradores de avisos", "formas silenciadas"],
    counts: "Los códigos de verificación se ignoran por construcción, antes de todo patrón. Sin forma de movimiento no hay borrador. El aviso crudo muere con el borrador: el libro guarda la línea, nunca la notificación.",
    keys: ["billetera", "notificaciones", "samsung wallet", "google wallet", "wallet", "avisos de pago", "escuchar"],
  },
  {
    id: "cambio.mesa",
    area: { es: "Mesa de cambio", en: "Exchange desk" },
    name: { es: "Mesa de cambio: tasa, conversión y moneda invitada", en: "Exchange desk: rate, converter, guest currency" },
    does: { es: "La tasa dólar–córdoba, el conversor y la moneda invitada.", en: "The dollar–córdoba rate, the converter and the guest currency." },
    screen: { es: "Mesa de cambio · píldora de moneda", en: "Exchange desk · currency pill" },
    engine: "money.ts · convertMinor (rateE4) + guestRate (solo lectura)",
    figures: ["tasa dólar–córdoba", "conversión", "vista en moneda invitada"],
    counts: "R6: una sola casa de tasas; la manual del usuario manda sobre la traída de la red, y la traída dice su fecha y fuente. La invitada convierte la VISTA, jamás el libro.",
    keys: ["tasa", "cambio", "convertir", "cordobas", "dolares", "rate", "exchange", "invitada"],
  },
  {
    id: "ajustes.estructura",
    area: { es: "Ajustes", en: "Settings" },
    name: { es: "Estructura, modos y reglas", en: "Structure, modes and rules" },
    does: { es: "Tus categorías, el modo del libro y las reglas aprendidas.", en: "Your categories, the book's mode and the learned rules." },
    screen: { es: "Ajustes → Estructura · Modo", en: "Settings → Structure · Mode" },
    engine: "mode.ts (los asientos de modo) + rules.ts (reglas de comercios aprendidas)",
    figures: ["modo del libro (Esencial/Ritmo/Completo)", "categorías y subconceptos", "reglas aprendidas de la mesa"],
    counts: "El modo gobierna la gestión, nunca la existencia: lo que un modo no muestra, ese modo no lo toca al guardar. Las reglas aprendidas solo sugieren; el usuario las ve y las borra.",
    keys: ["modo", "esencial", "ritmo", "completo", "estructura", "categorias", "reglas", "mode"],
  },
  {
    // §21 (1.3.382): exportar nació con tema («exportar», Ritmo) y
    // asiento (export.panel, Ritmo) y el mapa no la aprendió — la
    // búsqueda de funciones no podía encontrarla, y el espécimen 7
    // del estudio §21 la nombra («exportar» → su función, con su
    // casa). Esta es su entrada, con su puerta al tema «exportar»:
    // L-B7 — ninguna función sin su entrada en el índice.
    id: "ajustes.exportar",
    minMode: "ritmo",
    area: { es: "Ajustes", en: "Settings" },
    name: { es: "Exportar", en: "Export" },
    does: { es: "Saca tus números a Excel o PDF: eliges el período y qué incluir. También lleva los vencimientos del mes a tu calendario, como foto fechada.", en: "Take your numbers out to Excel or PDF: you pick the period and what to include. It also takes the month's dues to your calendar, as a dated photo." },
    screen: { es: "Arriba a la derecha, el panel de Exportar", en: "Top right, the Export panel" },
    engine: "shell.tsx · ExportPanel (asiento export.panel) + los constructores de Excel/PDF y el de calendario (calendar-export)",
    figures: ["archivo Excel del período", "archivo PDF del presupuesto", "archivo de calendario del mes"],
    counts: "El panel ofrece en cada modo las hojas de ese modo (export.full-sheets es Completo). Exportar no altera el libro: crea un archivo fuera de él, para guardar, imprimir o compartir. El calendario es una foto fechada del mes que se ve: no promete sincronía.",
    keys: ["exportar", "excel", "pdf", "imprimir", "export", "print", "descargar", "download", "sacar mis numeros", "calendario", "calendar", "vencimientos al calendario"],
  },
  {
    id: "cuenta.sync",
    area: { es: "Cuenta", en: "Account" },
    name: { es: "Cuenta, sincronía y sin internet", en: "Account, sync and offline" },
    does: { es: "Tu cuenta, la sincronía y trabajar sin internet.", en: "Your account, sync and working offline." },
    screen: { es: "Barra de arriba (punto de sincronía) · Ajustes → Cuenta", en: "Top bar (sync dot)" },
    engine: "spa/cloud.ts + vault.ts (cifrado local)",
    figures: ["estado de sincronía", "sesión", "copias de seguridad"],
    counts: "La puerta de Faro es permanente: entrar sin internet, trabajar, guardar local y sincronizar al volver la conexión. Ninguna respuesta del Asesor depende de la red.",
    keys: ["cuenta", "sincron", "sin internet", "offline", "copia de seguridad", "backup", "account"],
  },
  {
    // OLA 25 (Q25-1): la función nació en la .363 (Pieza 0) con tema y
    // asiento (account.name, Esencial) y el mapa no la aprendió: sus
    // preguntas caían en silencio — y la de «¿cómo cambio mi nombre?»
    // caía PEOR, en la mesa de cambio, por la palabra «cambio». La
    // entrada existe desde esta cura; el desempate contra la mesa lo
    // manda el patrón del nombre propio en ask2 (faroMismoAnswer).
    id: "account.name",
    sinCifras: true,
    area: { es: "Cuenta", en: "Account" },
    name: { es: "Tu nombre en Faro", en: "Your name in Faro" },
    does: { es: "El nombre con el que Faro te nombra, y cambiarlo.", en: "The name Faro calls you, and changing it." },
    screen: { es: "Ajustes → Cuenta → Cómo te nombra Faro", en: "Settings → Account → How Faro names you" },
    engine: "personname.ts · chosenNameOf (el lector único del nombre)",
    figures: ["el nombre con el que Faro te nombra"],
    counts: "El nombre vive en la CUENTA, nunca en un libro, y se gasta solo en dos umbrales de lista cerrada: la apertura de la Lectura del Asesor y la pregunta de la lista de espera cuando un deseo vence. Nunca aparece en una cifra, en un aviso ni en una respuesta de Preguntar. El correo jamás se lee como nombre.",
    keys: ["mi nombre", "cambio mi nombre", "cambiar mi nombre", "como me llama", "como me llamo", "nombre con que me saluda", "my name", "change my name", "faro call me"],
  },
  {
    // OLA 25 (Q25-1): compartir nació en la .362 con tema y asiento
    // (inbox.link, Esencial) y el mapa tampoco la aprendió — sus
    // preguntas caían en silencio en los dos motores. Esta es su
    // entrada, con su puerta al tema «compartir».
    id: "inbox.link",
    sinCifras: true,
    area: { es: "Captura", en: "Capture" },
    name: { es: "Compartir con Faro", en: "Sharing with Faro" },
    does: { es: "Lo que compartes con Faro desde otra app, y sus puertas.", en: "What you share with Faro from another app, and its doors." },
    screen: { es: "La hoja de Compartir, al compartir desde otra app (sus puertas caen en Central)", en: "The Share sheet, when you share from another app (its doors land on the Desk)" },
    engine: "sharelink.ts + link-inbox.tsx / share-product.tsx (la hoja y sus puertas)",
    figures: ["lo leído del enlace o la captura: nombre, tienda y precio si venía"],
    counts: "Compartir trae, la persona decide: nada entra a los libros sin pasar por la mesa. La hoja ofrece sus puertas (la espera, un plan en Ritmo, la compra en la bandeja, guardar la tienda) y el precio jamás se inventa: si la página no lo publica, el campo nace vacío.",
    keys: ["compartir", "comparto", "compartieron", "compartido", "share", "shared with me"],
  },
  {
    // OLA 26 (Familia 5, Q26-1 de Asesor): el saldo proyectado nació en
    // la .365 (el Camino, §19) con tema («saldo-proyectado») y piso
    // (advisor.projection, Completo) y el mapa no lo aprendió: «¿dónde
    // veo mi saldo proyectado?» caía en la ficha Tengo de Central con
    // la fórmula de las mismas cifras — una casa sin ninguna proyección
    // diaria. La precedencia de patrón en ask2 («saldo proyectado»
    // gana a central.tengo) acompaña a esta entrada.
    id: "advisor.projection",
    minMode: "completo",
    area: { es: "Asesor", en: "Advisor" },
    name: { es: "El saldo proyectado, día a día", en: "The projected balance, day by day" },
    does: { es: "Tu saldo proyectado día a día, tu día más apretado y el primer día en rojo.", en: "Your projected balance day by day, your tightest day and the first day in the red." },
    screen: { es: "Asesor → Saldo proyectado, día a día", en: "Advisor → Projected balance, day by day" },
    engine: "projection.ts · projectWalk/readProjection (la caminata del saldo, día a día)",
    figures: ["saldo proyectado por día", "día más apretado", "primer día en rojo"],
    counts: "La caminata parte del saldo de hoy y aplica lo que viene con su fecha (cuotas, tarjetas, préstamos, apartados): es la misma caminata de la familia reach y de la Lectura — una sola. Lo que no tiene fecha no se finge.",
    keys: ["saldo proyectado", "projected balance", "proyeccion", "projection", "dia mas apretado", "tightest day"],
  },
  {
    // OLA 26 (Familia 5, Q26-2 de Asesor): los cambios de precio viven
    // en Estudio desde la .372 (tema «cambios-precio», piso Completo)
    // y el mapa no los aprendió: «¿dónde veo los cambios de precio?»
    // caía en la Mesa de cambio por la palabra «cambio» — la puerta de
    // la conversión por preguntar por la memoria de precios del libro.
    id: "study.prices",
    minMode: "completo",
    area: { es: "Estudio", en: "Study" },
    name: { es: "Los cambios de precio", en: "Price changes" },
    does: { es: "Los productos cuyo precio cambió, con el precio de antes y el de ahora.", en: "The products whose price changed, with the price before and the price now." },
    screen: { es: "Estudio → Con el tiempo → Cambios de precio", en: "Study → Over time → Price changes" },
    engine: "prices.ts · currentFixedChanges (la memoria de precios del propio libro)",
    figures: ["precio anterior y precio nuevo por producto", "fecha del cambio"],
    counts: "La memoria sale de las compras del libro: cada producto con su precio de antes y el de ahora, leídos de las líneas mismas — ningún precio se trae de fuera.",
    keys: ["cambios de precio", "cambios de precios", "cambio de precio", "price changes", "price change"],
  },
  {
    // OLA 26 (Familia 5, Q26-2 de Asesor): el Vigilante — el aviso
    // cuando un precio se mueve del precio fijo que la persona fijó
    // (asiento advisor.price-watch, Completo) — comparte motor y tema
    // con los cambios de precio, pero su pregunta es otra («¿dónde veo
    // el aviso de precio?»): el mapa lo nombra por su cuenta.
    id: "advisor.price-watch",
    minMode: "completo",
    area: { es: "Asesor", en: "Advisor" },
    name: { es: "El aviso de precio (el Vigilante)", en: "The price alert (the Watchman)" },
    does: { es: "El aviso cuando un precio se mueve del precio fijo que fijaste.", en: "The alert when a price moves from the fixed price you set." },
    screen: { es: "Asesor → el aviso cuando un precio se mueve", en: "Advisor → the alert when a price moves" },
    engine: "prices.ts · priceWatch/hasPriceWatch (el precio fijo de la persona contra el precio de hoy)",
    figures: ["precio fijado", "precio de hoy del producto", "aviso pendiente"],
    counts: "El Vigilante compara el precio fijo que la persona fijó contra el precio más reciente del mismo producto en su libro: si no se movió, no hay aviso — jamás se avisa de un precio que no cambió.",
    keys: ["aviso de precio", "price alert", "precio subio", "subio de precio", "price went up", "vigilante", "price watch"],
  },
  {
    // OLA 26 (Familia 5, completitud): la Bitácora nació en la .367
    // (tema «bitacora», sin piso: vive en Esencial) y el mapa no la
    // aprendió: sus preguntas caían en silencio en los tres modos.
    id: "folios.logbook",
    area: { es: "Folios", en: "Folios" },
    name: { es: "La Bitácora y Tu año en Faro", en: "The Logbook and Your year in Faro" },
    does: { es: "La foto de cada mes al cerrar y la edición de tu año en tarjetas.", en: "Each month's snapshot at close and your year's edition in cards." },
    screen: { es: "Folios → Bitácora", en: "Folios → Logbook" },
    engine: "bitacora.ts · logbookOf/settleLogbook (las fotos del mes y la edición del año)",
    figures: ["foto del mes (entró, salió, neto, apartado)", "la edición del año en tarjetas"],
    counts: "Las fotos se congelan al cerrar el mes y la edición se encuaderna al cerrar el año, desde los motores de siempre: es un documento contado una sola vez, no un cálculo vivo.",
    keys: ["bitacora", "logbook", "ano en faro", "year in faro", "edicion del ano", "year edition", "tu ano"],
  },
  {
    // OLA 26 (Familia 5, completitud): la fila de preguntas a la mano
    // nació en la .369 (tema «preguntas-a-la-mano»; administrarla es de
    // Ritmo, settings.ask-presets) y el mapa no la aprendió: el Asesor
    // no podía explicar la fila de su propia caja. Su casa no guarda
    // cifras (sinCifras): el veredicto nombra el piso sin la fórmula.
    id: "settings.ask-presets",
    minMode: "ritmo",
    sinCifras: true,
    area: { es: "Ajustes", en: "Settings" },
    name: { es: "Tus preguntas a la mano", en: "Your questions at hand" },
    does: { es: "Tu lista de preguntas guardadas, en tu orden, y administrarla.", en: "Your list of saved questions, in your order, and managing it." },
    screen: { es: "Ajustes → Preguntas a la mano · la fila bajo la caja de Preguntar", en: "Settings → Questions at hand · the row under the Ask box" },
    engine: "askpresets.ts · askPresetsOf (la lista de la persona, en su orden)",
    figures: ["la lista de preguntas guardadas, en el orden de la persona"],
    counts: "La lista es de la persona: sus preguntas, en su orden, un toque = respuesta al instante. Administrarla vive en Ajustes; usarla, en la caja de Preguntar.",
    keys: ["a la mano", "preguntas guardadas", "saved questions", "mis preguntas", "my questions", "guardo una pregunta", "save a question", "preguntas predeterminadas", "preset questions"],
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
  "asesor.aprender": "preguntar-asesor",
  "account.name": "nombre",
  "inbox.link": "compartir",
  "ajustes.exportar": "exportar",
  "advisor.projection": "saldo-proyectado",
  "study.prices": "cambios-precio",
  "advisor.price-watch": "cambios-precio",
  "folios.logbook": "bitacora",
  "settings.ask-presets": "preguntas-a-la-mano",
  "captura.billetera": "billetera-notificaciones",
  // 1.3.456 (Oscar, en su teléfono): LAS ACCIONES PROMETIDAS SE VEN —
  // el banco emitía estas puertas como datos (las tres acciones de
  // «quiero enviarle 200 a mi mamá», los reportDoor de Ahorros e
  // Historial y las fuentes de varias familias) y la caja las
  // descartaba en silencio porque su función no estaba en este mapa:
  // la respuesta prometía «abajo te propongo la acción» y abajo no
  // había nada. Cada entrada de abajo resuelve a un tema con ruta
  // verificada, y la cerca de captura456 exige que TODO target que el
  // banco emita resuelva aquí o por las llaves de un tema con ruta.
  "remesas.personas": "remesas-personas",
  "cambio.mesa": "mesa-cambio",
  "captura.bandeja": "captura-mesa",
  "captura.escribir": "captura-texto",
  "ahorros.stock": "ahorros-banda",
  "ahorros.colchon": "bolsas",
  "ahorros.mes": "apartado-mes",
  "historial.stream": "folios",
  "ajustes.estructura": "estructura",
  "cuenta.sync": "sync",
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
