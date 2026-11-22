/**
 * questionbank.ts — EL BANCO DE PREGUNTAS DEL ASESOR (rama independiente
 * «banco del Asesor», 2026-11-20; base canon 1.3.353 — integrado a canon
 * por la decisión de fusión de Oscar del 2026-11-20, ola 1.3.355).
 *
 * Qué es: la batería completa de familias de preguntas que un usuario
 * puede hacer sobre su dinero y sobre Faro, COMPOUESTA por ejes — no
 * enumerada frase a frase (doctrina de interconexión, mapa §17). Cada
 * familia declara:
 *   · su FUENTE (ids de askmap.ts): el motor que calcula la respuesta y
 *     la pantalla que reporta la misma cifra — la respuesta jamás puede
 *     contradecir a la pantalla porque nace del mismo motor (R1);
 *   · sus EJES: las ranuras que la componen (qué × cuándo × dónde ×
 *     comparación) — decenas de familias × ejes = miles de preguntas;
 *   · sus PREGUNTAS CANÓNICAS ES/EN (las que el catálogo de Ajustes
 *     ofrecerá como predeterminadas y los chips como vecinas);
 *   · la FORMA de su respuesta (veredicto → piezas → procedencia);
 *   · su regla de CONTRADICCIÓN (cómo corrige una premisa falsa);
 *   · sus SILENCIOS (lo que NO debe dispararla — el Mandato de
 *     Patrones: toda familia nace con su batería de silencios);
 *   · su ESTADO: viva (ask2.ts la responde), heredada (ask.ts, Ola 5a)
 *     o declarada (diseñada aquí, motor pendiente — silencio honesto
 *     hasta que nazca; NUNCA una respuesta improvisada).
 *
 * Perímetros que la línea principal YA estableció (mapa §17) y este
 * banco NO repite como nuevos — los integra como familias heredadas o
 * declaradas con su dueño: GUSTOS/HISTORIA/AHORROS/CONTRADICCIÓN (la
 * expansión pedida), COMPARAR y SIMILITUD, SEGUIMIENTO, VECINDAD,
 * PROCEDENCIA, FUTURO, AUSENCIA, IDENTIDAD, EL ASESOR PREGUNTA,
 * preguntas predeterminadas y la esquina FARO MISMO. Lo NUEVO de esta
 * rama es el resto: RECENCIA, AGENDA, RANKING, REMESAS-PATRÓN y
 * CUENTA-ORIGEN salen de los especímenes del 2026-11-20 (las 13+3
 * preguntas de Oscar en su teléfono), y el banco entero queda atado al
 * mapa de funciones (askmap.ts) para que ninguna familia flote sin
 * motor.
 */

export type BankStatus = "viva" | "heredada" | "declarada";

export type BankFamily = {
  id: string;
  name: { es: string; en: string };
  /** La capacidad en una frase de prosa, para la descripción honesta de
   * «¿Qué puedes hacer?» (1.3.371): se lee dentro de una enumeración
   * («Puedo decirte: …»), en minúscula y sin punto final. */
  cap: { es: string; en: string };
  status: BankStatus;
  /** Ids de askmap.ts: de dónde sale cada número y dónde se reporta. */
  source: string[];
  /** Los ejes que componen la familia (su espacio lógico). */
  axes: string[];
  /** Preguntas canónicas: las del catálogo y los chips. */
  canonical: { es: string[]; en: string[] };
  /** La forma de la respuesta, en una frase. */
  answerShape: string;
  /** Cómo corrige esta familia una premisa falsa del usuario. */
  contradiction: string;
  /** Lo que NO debe dispararla jamás. */
  silences: string[];
};

export const QUESTION_BANK: BankFamily[] = [
  {
    id: "spend",
    name: { es: "¿Puedo gastar…? (chequeo de un gasto)", en: "Can I spend…?" },
    cap: { es: "si un gasto cabe en tu mes, antes de hacerlo", en: "whether a purchase fits your month, before you make it" },
    status: "heredada",
    source: ["asesor.lectura", "cobros.cuotas"],
    axes: ["monto × concepto", "registro (coloquial/llano/técnico)"],
    canonical: {
      es: ["¿Puedo gastar $100 en zapatos?", "¿Me alcanza para $50 de gasolina?"],
      en: ["Can I spend $100 on shoes?", "Can I afford $50 for gas?"],
    },
    answerShape: "Veredicto en el registro del usuario → queda hoy / queda con el gasto → aviso de vencimientos de la semana. «Registrarlo» deja el borrador en la bandeja; la respuesta nunca guarda.",
    contradiction: "Si no alcanza, lo dice con la cifra que falta — no suaviza el no.",
    silences: ["Sin monto no se adivina: se pide el monto (need-amount).", "«¿Puedo gastar sin tocar mis ahorros?» NO es esta familia: es free."],
  },
  {
    id: "free",
    name: { es: "Dinero libre (sin tocar lo apartado)", en: "Free money" },
    cap: { es: "cuánto dinero tienes libre sin tocar lo apartado", en: "how much money is free without touching what's set aside" },
    status: "heredada",
    source: ["central.tengo", "ahorros.stock", "ahorros.colchon", "cobros.cuotas"],
    axes: ["sin ranuras: la resta es fija"],
    canonical: {
      es: ["¿Cuánto puedo sacar sin tocar mis ahorros?", "¿Cuánto tengo libre?"],
      en: ["How much can I take out without touching my savings?", "How much do I have free?"],
    },
    answerShape: "La resta NOMBRADA, pieza por pieza: saldo en cuentas − apartado del saldo − vence en 14 días − colchón por cubrir = libre.",
    contradiction: "Si la resta da cero o negativo, lo dice y muestra por qué, pieza por pieza.",
    silences: ["«¿Cuánto me queda en ahorros?» NO es esta familia: es ahorros (la cura del desvío)."],
  },
  {
    id: "left",
    name: { es: "¿Cuánto me queda? (mes / año)", en: "How much is left?" },
    cap: { es: "cuánto te queda del mes o del año", en: "how much is left of the month or the year" },
    status: "heredada",
    source: ["central.queda"],
    axes: ["período (mes × año)"],
    canonical: {
      es: ["¿Cuánto me queda para el mes?", "¿Cuánto me queda para el año?"],
      en: ["How much do I have left for the month?", "How much do I have left for the year?"],
    },
    answerShape: "Mes: entró / salió / queda. Año: proyección con el supuesto DICHO (la queda de este mes repetida en los meses que faltan).",
    contradiction: "El año jamás se presenta como promesa: es proyección y se etiqueta.",
    silences: ["«¿Cuánto me queda en ahorros?» NO cae aquí ni en how: las palabras de ahorro pesan más (familia ahorros)."],
  },
  {
    id: "how",
    name: { es: "¿Cómo voy?", en: "How am I doing?" },
    cap: { es: "cómo vas, en una lectura honesta de tu mes", en: "how you're doing, in an honest read of your month" },
    status: "heredada",
    source: ["asesor.lectura"],
    axes: ["sin ranuras"],
    canonical: { es: ["¿Cómo voy?"], en: ["How am I doing?"] },
    answerShape: "El titular de la Lectura + la queda + la nota de ritmo. Es la familia MÁS débil a propósito: solo dispara cuando ninguna otra nombra algo concreto.",
    contradiction: "—",
    silences: ["Toda pregunta con objeto (ahorros, tiendas, cuotas, una persona) le gana a how. Responder how a otra pregunta es el desvío condenado el 2026-11-20."],
  },
  {
    id: "ahorros",
    name: { es: "Ahorros: cuánto hay, dónde y a qué ritmo", en: "Savings: how much, where, at what pace" },
    cap: { es: "cuánto tienes ahorrado, dónde está y a qué ritmo crece", en: "how much you've saved, where it sits and how fast it grows" },
    status: "viva",
    source: ["ahorros.stock", "ahorros.colchon", "ahorros.mes"],
    axes: ["qué (total × clase: cuenta/retiro/aparte/emergencia/meta) × cuándo (hoy × este mes)"],
    canonical: {
      es: ["¿Cuánto me queda en ahorros?", "¿Cuánto tengo guardado?", "¿Cuánto llevo en mi meta?", "¿Cuánto aparté este mes?", "¿Cómo va mi colchón?"],
      en: ["How much do I have in savings?", "How much have I set aside this month?", "How's my cushion?"],
    },
    answerShape: "Veredicto con el total de savingsStock → piezas por clase (las cinco clases suman el total) → el colchón y su falta. Si pide una clase (retiro/emergencia/meta), esa cifra manda el veredicto.",
    contradiction: "Si dice «mis ahorros son $X» y el stock dice otra cosa, se corrige con el stock y su desglose por clase.",
    silences: ["«Ahorrar» dentro de un gasto («¿puedo gastar sin tocar mis ahorros?») es free, no ahorros.", "El seguro de vida NO es ahorro: su prima es gasto y la póliza no es activo — jamás entra en el stock."],
  },
  {
    id: "gustos",
    name: { es: "Gustos: cuánto hay para antojos", en: "Wants: how much room for treats" },
    cap: { es: "cuánto tienes para gustos sin romper el mes", en: "how much room you have for treats without breaking the month" },
    status: "viva",
    source: ["estudio.regla", "asesor.lectura", "cobros.cuotas"],
    axes: ["monto (chequeo) × sin monto (capacidad)"],
    canonical: {
      es: ["¿Cuánto tengo para gastar en gustos?", "¿Puedo gastar $30 en gustos?", "¿Cuánto llevo en gustos este mes?"],
      en: ["How much do I have for treats?", "Can I spend $30 on a treat?"],
    },
    answerShape: "Capacidad = el dinero libre (la resta nombrada de free) cruzado con lo que la regla 50·30·20 deja para gustos según lo ya gastado en gustos este mes; se dice la MENOR de las dos y por qué. Con monto: veredicto contra esa capacidad.",
    contradiction: "«¿Puedo gastar $500 en gustos?» con $49.71 libres: corrige primero («libres hay $49.71») y responde después: no alcanza.",
    silences: ["Un gasto concreto con concepto («$100 en zapatos») es spend, no gustos, salvo que la palabra gustos/antojos aparezca."],
  },
  {
    id: "recencia",
    name: { es: "Lo último que… (recencia)", en: "The last time I… (recency)" },
    cap: { es: "lo último que pasó: pagos, compras y registros", en: "the latest thing that happened: payments, purchases and entries" },
    status: "viva",
    source: ["historial.stream", "remesas.personas", "cobros.cuotas"],
    axes: ["qué (ingreso × registro × compra × tienda × remesa a persona × pago de cuota) × quién/dónde (persona, tienda)"],
    canonical: {
      es: ["¿Cuándo fue la última vez que me pagaron?", "¿Cuál fue el último monto que envié a mamá?", "¿En qué tienda compré por última vez?", "¿Qué fue lo último que compré?", "¿Cuándo fue el último registro que hice?", "¿Cuándo fue el último pago de mis cuotas?"],
      en: ["When did I last get paid?", "What was the last amount I sent to Mom?", "What was the last thing I bought?"],
    },
    answerShape: "La línea más reciente que cumple el filtro, con fecha, concepto y monto — UNA sola máquina (el stream) para todos los «lo último». La fecha sin bookedOn se dice como mes, no como día.",
    contradiction: "Si el usuario afirma «la última vez fue $X» y la línea dice otro monto, se muestra la línea real.",
    silences: ["Sin ninguna línea que cumpla el filtro: silencio honesto («no hay ningún registro de eso»), jamás una fecha inventada."],
  },
  {
    id: "agenda",
    name: { es: "Lo que viene: cuotas y fechas de pago", en: "What's ahead: dues and paydays" },
    cap: { es: "qué cuotas vienen y en qué fechas", en: "which dues are coming and on what dates" },
    status: "viva",
    source: ["cobros.cuotas", "central.gastare"],
    axes: ["ventana (este mes × próximos 14/30 días) × clase (cuota/tarjeta/préstamo)"],
    canonical: {
      es: ["¿Cuáles son las primeras cuotas del mes que necesito pagar?", "¿Cuáles son las fechas en las que pago mis cuotas?", "¿Qué vence esta semana?"],
      en: ["What are the first dues I need to pay this month?", "When do my dues fall?"],
    },
    answerShape: "La ventana de duesWindow ordenada por fecha: nombre, fecha y monto de cada obligación; las vencidas se dicen primero y como vencidas.",
    contradiction: "Si el usuario cree que ya pagó una cuota que la ventana muestra viva, la respuesta lo corrige con la fecha de vencimiento (ver también ya-pague).",
    silences: ["«¿Cuándo FUE el último pago?» es recencia, no agenda: pasado ≠ futuro."],
  },
  {
    id: "ranking",
    name: { es: "Quién / cuál más (superlativos)", en: "Who / which most (rankings)" },
    cap: { es: "quién o cuál es el mayor: deudas, gastos, envíos", en: "who or what is biggest: debts, spending, remittances" },
    status: "viva",
    source: ["cobros.mideben", "cobros.debo", "cobros.tarjetas", "estudio.flujo"],
    axes: ["lado (me deben × debo) × objeto (persona × cuenta/tarjeta × categoría)"],
    canonical: {
      es: ["¿Quién me debe más?", "¿En cuál cuenta debo más?", "¿Cuál es mi tarjeta con más saldo?", "¿En qué gasto más?"],
      en: ["Who owes me the most?", "Which account do I owe the most on?"],
    },
    answerShape: "El primero del ranking del motor (peopleOf ordena por queda; cardFigures por tarjeta) con su cifra y la del segundo, para que el «más» se vea.",
    contradiction: "Con empate o sin datos, se dice — no se corona a nadie sin cifra.",
    silences: ["«Más» sin objeto ni lado no dispara: se pide el objeto con los chips."],
  },
  {
    id: "historia",
    name: { es: "Historia: totales por período × lugar/categoría", en: "History: totals by period × place/category" },
    cap: { es: "totales por período, categoría o lugar", en: "totals by period, category or place" },
    status: "viva",
    source: ["libros.lineas", "estudio.flujo", "historial.stream"],
    axes: ["qué (gasto × ingreso) × cuándo (hoy/semana/mes/año, este/pasado) × dónde (categoría × tienda × persona × cuenta)"],
    canonical: {
      es: ["¿Cuánto gasté el último mes en tiendas?", "¿Cuánto gasté esta semana en comida?", "¿Cuánto entró este mes?", "¿Cuánto llevo en gasolina este año?"],
      en: ["How much did I spend last month in stores?", "How much did I spend on food this week?"],
    },
    answerShape: "La suma de las líneas del período que cumplen el filtro, con el conteo de líneas (la procedencia en miniatura: «de N líneas») y el período dicho en palabras.",
    contradiction: "Si el filtro no casa ninguna línea, la respuesta es «$0 — ninguna línea de eso en ese período», que ES una respuesta, no un silencio.",
    silences: ["Sin período ni filtro, «¿cuánto gasté?» a secas es demasiado vago: cae en how o se pide el período."],
  },
  {
    id: "remesas",
    name: { es: "Remesas: patrón de envíos", en: "Remittances: sending pattern" },
    cap: { es: "tu patrón de remesas: cuánto, a quién y cada cuánto", en: "your remittance pattern: how much, to whom and how often" },
    status: "viva",
    source: ["remesas.personas", "asesor.lectura"],
    axes: ["quién (persona × todas) × cuándo (este mes × año × siempre)"],
    canonical: {
      es: ["¿Cuándo envías remesas y a quién?", "¿Cuánto he enviado a mamá este año?", "¿Cuánto envío en remesas al mes?"],
      en: ["When do I send remittances, and to whom?", "How much have I sent to Mom this year?"],
    },
    answerShape: "Destinatarios con sus totales (line.to), la frecuencia real (envíos por mes con datos) y el último envío. El promedio solo se calcula sobre meses CON envíos y se dice así.",
    contradiction: "Una persona que el usuario nombra y no recibe remesas: se dice «no hay envíos a esa persona» — no se le asigna la remesa de otra.",
    silences: ["El último envío a UNA persona es recencia con filtro de remesa, aunque comparta motor."],
  },
  {
    id: "ya-pague",
    name: { es: "¿Ya pagué…? (contradicción de premisa)", en: "Did I already pay…?" },
    cap: { es: "si algo ya lo pagaste — y corregirte si partes de un dato falso", en: "whether you already paid something — and correcting you if you start from a false premise" },
    status: "viva",
    source: ["cobros.cuotas", "libros.lineas"],
    axes: ["objeto (cuota × servicio × tarjeta × préstamo)"],
    canonical: {
      es: ["¿Ya pagué la luz?", "¿Ya pagué mi tarjeta?", "¿Ya pagué la renta de este mes?"],
      en: ["Did I already pay the electric bill?", "Did I pay my card yet?"],
    },
    answerShape: "Primero la corrección o la confirmación con su prueba: la línea de pago del mes (fecha y monto) — o la obligación viva en duesWindow con su fecha. Nunca un «sí» sin línea que lo sostenga.",
    contradiction: "ES la familia de la contradicción: la premisa se juzga contra el libro antes de responder cualquier otra cosa.",
    silences: ["Sin línea ni obligación que case: «no lo encuentro pagado ni anotado como deuda» — se dice el hueco, no se rellena."],
  },
  {
    id: "comparar",
    name: { es: "Comparar: esto contra aquello", en: "Compare: this vs that" },
    cap: { es: "comparaciones: este mes contra el pasado, esto contra aquello", en: "comparisons: this month against the last, this against that" },
    status: "viva",
    source: ["estudio.flujo", "libros.lineas", "libros.neto"],
    axes: ["objeto A × objeto B (categoría × período × tienda)"],
    canonical: {
      es: ["¿Gasté más este mes o el pasado?", "¿En qué se fue más, en comida o en transporte?", "¿Gasté más en tiendas este mes que el pasado?"],
      en: ["Did I spend more this month or last?", "Where did more go, food or transport?"],
    },
    answerShape: "Las dos cifras del MISMO motor, lado a lado, con la diferencia. Comparar períodos usa summarize de cada mes; comparar categorías, las rebanadas del mismo mes.",
    contradiction: "Si una de las dos patas no tiene datos, se dice cuál y no se compara contra un invento.",
    silences: ["«Más» sin dos patas nombrables es ranking, no comparar."],
  },
  {
    id: "cuenta-origen",
    name: { es: "¿De qué cuenta lo saco? (el Asesor pregunta)", en: "Which account should it come from?" },
    cap: { es: "de qué cuenta conviene sacar un dinero", en: "which account a sum should come from" },
    status: "viva",
    source: ["central.tengo", "ahorros.stock"],
    axes: ["monto × cuentas con saldo"],
    canonical: {
      es: ["¿De qué cuenta debería sacar $20?", "¿De dónde saco para pagar esto?"],
      en: ["Which account should I take $20 from?"],
    },
    answerShape: "Si UNA cuenta lo cubre sin tocar lo apartado (libreOf por anfitriona), se nombra con su libre. Si VARIAS pueden, el Asesor PREGUNTA de vuelta con las opciones y su libre — una sola pregunta, nunca un sermón (extensión §17.7).",
    contradiction: "Si ninguna cuenta lo cubre sin tocar lo apartado, se dice antes de sugerir ninguna.",
    silences: ["Sin monto, se pregunta el monto — no se recomienda una cuenta en el vacío."],
  },
  {
    id: "faro-mismo",
    name: { es: "Faro mismo: dónde se ve y cómo se hace", en: "Faro itself: where and how" },
    cap: { es: "dónde se ve cada cosa en Faro y cómo se hace", en: "where each thing lives in Faro and how to do it" },
    status: "viva",
    source: ["captura.bandeja", "captura.escribir", "ajustes.estructura", "cuenta.sync", "central.queda", "ahorros.stock", "cobros.tarjetas", "cambio.mesa", "account.name", "inbox.link"],
    axes: ["función (todo el askmap) × tipo (dónde veo × cómo hago)"],
    canonical: {
      es: ["¿Dónde veo mis recompensas?", "¿Cómo importo mi banco?", "¿Dónde está mi colchón?", "¿Cómo cambio el modo?"],
      en: ["Where do I see my rewards?", "How do I import my bank?"],
    },
    answerShape: "La función del mapa que la pregunta nombra: su pantalla, en una frase cómo se llega, y la puerta del Manual a su tema. Preguntar y llegar son la misma respuesta.",
    contradiction: "Si la función no existe en el mapa, se dice que Faro no la tiene — jamás se inventa una pantalla.",
    silences: ["Una pregunta de dinero con cifra («¿cuánto tengo en tarjetas?») NO es faro-mismo aunque nombre una pantalla: es de su familia de dinero."],
  },
  {
    id: "futuro",
    name: { es: "Futuro: proyecciones con supuesto dicho", en: "Future: projections with the assumption stated" },
    cap: { es: "proyecciones a futuro, con el supuesto dicho en voz alta", en: "projections into the future, with the assumption stated out loud" },
    status: "viva",
    source: ["cobros.plan", "ahorros.mes", "asesor.escenarios"],
    axes: ["qué (deuda × ahorro × queda) × horizonte (meses × fecha)"],
    canonical: {
      es: ["¿Cuándo termino de pagar mis deudas?", "¿Cuánto tendré apartado en diciembre?", "¿Cuánto me quedará el año que viene?"],
      en: ["When will I be debt-free?", "How much will I have set aside by December?"],
    },
    answerShape: "La cifra del motor de proyección (payoffPlan, ritmo de apartado) CON el supuesto en la misma respuesta (R7): presupuesto usado o ritmo real, y qué lo movería.",
    contradiction: "Sin plan ni ritmo (ningún abono en 90 días), no hay proyección: se dice qué falta para poder proyectar.",
    silences: ["«¿Debería invertir?» NO es futuro: es opinión, fuera del núcleo dinero/app — silencio honesto hasta que Oscar diga otra cosa."],
  },
  {
    id: "ausencia",
    name: { es: "Ausencia: lo que no está también es dato", en: "Absence: what's missing is data too" },
    cap: { es: "lo que falta: meses sin registro y huecos en tu libro", en: "what's missing: unrecorded months and gaps in your book" },
    status: "declarada",
    source: ["cobros.cuotas", "historial.stream"],
    axes: ["qué falta (pago × categoría × ingreso) × período"],
    canonical: {
      es: ["¿Qué no he pagado todavía?", "¿Qué gasto desapareció este mes?", "¿Qué categoría se quedó en silencio?"],
      en: ["What haven't I paid yet?", "What expense disappeared this month?"],
    },
    answerShape: "(Declarada — §17.5) Obligaciones vivas de duesWindow + categorías con historia y cero líneas en el período, nombradas como ausencia, nunca como cero disfrazado.",
    contradiction: "—",
    silences: ["Pendiente de motor propio: hasta que nazca, estas preguntas reciben silencio honesto con chips, no una respuesta a medias."],
  },
  {
    id: "identidad",
    name: { es: "Identidad / similitud: ¿qué es este cargo?", en: "Identity / similarity: what is this charge?" },
    cap: { es: "qué es un cargo que no reconoces", en: "what an unrecognized charge is" },
    status: "declarada",
    source: ["historial.stream", "estudio.flujo"],
    axes: ["monto × concepto"],
    canonical: {
      es: ["¿Qué es este cargo de $36?", "¿He pagado algo parecido antes?", "¿Este gasto es normal?"],
      en: ["What is this $36 charge?", "Have I paid something like this before?"],
    },
    answerShape: "(Declarada — §17.6) El motor casa monto+concepto contra la historia: primera vez o recurrente, su nombre usual, su frecuencia. Sobre la memoria de precios del propio libro: cero fabricación.",
    contradiction: "—",
    silences: ["Pendiente de motor propio (familia Similitud del §17): silencio honesto hasta que nazca."],
  },
  {
    id: "seguimiento",
    name: { es: "Seguimiento: la misma pregunta, un eje cambiado", en: "Follow-up: same question, one axis changed" },
    cap: { es: "seguir una respuesta cambiando un solo eje — otro mes, otra cuenta", en: "following up on an answer by changing one axis — another month, another account" },
    status: "declarada",
    source: ["asesor.lectura", "historial.stream"],
    axes: ["eje cambiado (cuándo × dónde × quién)"],
    canonical: {
      es: ["¿Y el mes pasado?", "¿Y en tiendas?", "¿Y en total?"],
      en: ["And last month?", "And in stores?"],
    },
    answerShape: "(Declarada — §17.1) La caja recuerda la última familia y sus ranuras; el seguimiento re-ejecuta la misma familia cambiando UN eje. Sin pregunta previa, un seguimiento suelto es silencio honesto.",
    contradiction: "—",
    silences: ["Sin contexto previo no dispara: «¿y en tiendas?» como primera pregunta no significa nada y no se adivina."],
  },
];

/** Las familias vivas o heredadas: las únicas que un motor puede
 * reclamar. Una familia declarada jamás produce respuesta. */
export function liveFamilies(): BankFamily[] {
  return QUESTION_BANK.filter((f) => f.status !== "declarada");
}
