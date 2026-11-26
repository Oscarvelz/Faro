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
   * «¿Qué puede hacer el asesor?» (1.3.371; renombrada en 1.3.405): se lee
   * dentro de una enumeración («Puedo decirte: …»), en minúscula y sin
   * punto final. */
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
      es: ["¿Cuánto me queda en ahorros?", "¿Cuánto tengo guardado?", "¿Cuánto llevo en mi meta?", "¿Cuánto aparté este mes?", "¿Cómo va mi colchón?", "¿Cuánto debería estar ahorrando?", "¿Estoy ahorrando bien?", "¿Cuánto me falta para tener un mes de gastos guardado?", "¿Puedo sacar $200 de mis ahorros?", "¿Me conviene meter más a ahorros o pagar deudas?"],
      en: ["How much do I have in savings?", "How much have I set aside this month?", "How's my cushion?", "How much should I be saving?", "Am I saving well?", "Can I take $200 out of my savings?"],
    },
    answerShape: "Veredicto con el total de savingsStock → piezas por clase (las cinco clases suman el total) → el colchón y su falta. Si pide una clase (retiro/emergencia/meta), esa cifra manda el veredicto. OLA 41 · EL AHORRO CON SU VARA: las preguntas que JUZGAN el ahorro se miden contra la vara del propio usuario — la meta de meses de colchón que él fijó en Ajustes por su gasto esencial medido, la misma del fondo de emergencia — y nunca contra una regla importada: «¿cuánto debería ahorrar?» devuelve la brecha de su meta, su ritmo medido de apartado y lo que su mes típico deja libre; «¿estoy ahorrando bien?» responde con los meses de colchón cubiertos contra sus meses de meta y su tasa de apartado, sin vergüenza y sin sermón; «¿cuánto me falta para un mes de gastos?» usa el mes típico de gasto entero como peldaño y nombra también la meta completa; «¿puedo sacar $X de mis ahorros?» camina el retiro contra el stock y contra el colchón (los meses antes y después), y si el retiro pasa del stock, lo dice con la cifra; «¿ahorros o deudas?» presenta los dos lados con sus números — el interés mensual de las deudas y los meses de colchón cubiertos — sin escoger por el usuario. Y la meta sin monto (familia meta) pide el único dato que falta con los meses del plazo ya contados, en vez de callar.",
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
    answerShape: "La línea más reciente que cumple el filtro, con fecha, concepto y monto — UNA sola máquina (el stream) para todos los «lo último». La fecha sin bookedOn se dice como mes, no como día. Desde la ola 2 (2026-11-21) el filtro es AMPLIO: «la última vez que pagué X» resuelve X con el filtro de historia (palabra entera) o con una palabra del concepto — no solo con los cajones fijos.",
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
    id: "conteo",
    name: { es: "Conteo: ¿cuántos ciudadanos tengo?", en: "Counting: how many citizens do I have?" },
    cap: { es: "cuántas cosas tienes de cada clase: cuotas, tarjetas, préstamos y personas que te deben", en: "how many of each kind you have: dues, cards, loans and people who owe you" },
    status: "viva",
    source: ["cobros.cuotas", "cobros.tarjetas", "cobros.debo", "cobros.mideben", "central.tengo", "libros.lineas"],
    axes: ["ciudadano (cuotas × tarjetas × préstamos × personas que deben × cuentas)"],
    canonical: {
      es: ["¿Cuántas cuotas tengo?", "¿Cuántas cuotas estoy pagando?", "¿Cuántas tarjetas tengo?", "¿Cuántas personas me deben?", "¿Cuántas cuentas tengo?"],
      en: ["How many dues am I paying?", "How many cards do I have?", "How many accounts do I have?"],
    },
    answerShape: "El conteo del motor que lista al ciudadano (las series vivas de suscripción, cardsOf, loansOf, lentOf, hostAccounts) y, en cuotas, la suma por cobro de la última línea de cada serie.",
    contradiction: "Si el usuario cree pagar otra cantidad de cuotas, la lista de piezas ES la corrección: cada cuota nombrada con su monto.",
    silences: ["«¿Cuánto pago en cuotas?» sin «cuántas» es una suma (historia), no un conteo.", "Un ciudadano que el mapa no lista no se cuenta: silencio honesto."],
  },
  {
    id: "extremos",
    name: { es: "Extremos: lo más grande y lo más pequeño", en: "Extremes: the biggest and the smallest" },
    cap: { es: "tu gasto, compra o ingreso más grande y el más pequeño, con su escolta", en: "your biggest and smallest spend, purchase or income, with its runner-up" },
    status: "viva",
    source: ["historial.stream", "libros.lineas"],
    axes: ["extremo (mayor × menor) × clase (gasto × compra × ingreso × remesa × cuota) × alcance (historial × este mes × este año)"],
    canonical: {
      es: ["¿Cuál ha sido el gasto más grande que he hecho?", "¿Cuál ha sido el gasto más pequeño que he hecho?", "¿Cuál fue mi compra más cara?", "¿Cuál ha sido mi ingreso más grande?", "¿Cuál fue mi gasto más chico este mes?"],
      en: ["What has been my biggest expense?", "What was my smallest expense?", "What was my most expensive purchase?"],
    },
    answerShape: "La línea extrema del stream (por monto en moneda de vista), con concepto, monto y fecha, y su escolta: la segunda, para que el extremo se vea contra algo.",
    contradiction: "Si el usuario recuerda otro gasto como el mayor, la línea real con su fecha manda.",
    silences: ["Apartar no es gastar: el rol ahorro queda fuera del extremo de gasto.", "Sin líneas de esa clase en el alcance: silencio honesto, jamás un extremo inventado."],
  },
  {
    id: "hipotetico",
    name: { es: "Hipotéticos: si hago esto, entonces…", en: "Hypotheticals: if I do this, then…" },
    cap: { es: "qué pasaría con tu dinero si entrara o saliera lo que traes en la pregunta", en: "what would happen to your money if what you bring in the question came in or out" },
    status: "viva",
    source: ["central.queda", "central.tengo", "ahorros.stock", "asesor.lectura"],
    axes: ["lado (gasto × ingreso) × base (la Queda × el saldo en cuentas) × montos traídos (1 × varios, moneda dicha)"],
    canonical: {
      es: ["Si por un vuelo pago 200, la estadía 300 y comida 500, ¿cuánto me quedaría en mi cuenta?", "Si gasto 30 pesos en golosinas, 50 en comida y 30 en arroz, ¿cuánto me queda?", "Si me regalaran 300, ¿cuánto tendría?", "¿Y si me bajan el sueldo un 20%?", "¿Si me bajan el sueldo a $1,200, cómo quedo?"],
      en: ["If I spend 200 on a flight, 300 on the stay and 500 on food, how much would I have left in my account?", "What if my salary drops by 20%?"],
    },
    answerShape: "La base del libro (la Queda, o el saldo en cuentas si dice «cuenta») ± la suma de los montos que la pregunta trae, cada uno como pieza con su concepto; el resultado con el supuesto dicho: es un «si», nada se anota ni se guarda. EL CONTEXTO (ola 6): si dice «cuenta» y hay VARIAS, no se suman — el Asesor pregunta de vuelta con las cuentas en tarjetitas y, al tocar una, la respuesta se clava en esa cuenta (saldo y libre). Es la doctrina general de las preguntas con contexto: el eje que falta se pide con tarjetas, no se adivina ni se promedia. LA SENSIBILIDAD (ola 24, el What-If): «¿y si el internet sube a 60?» / «sube 10 dólares» — UNA línea nombrada cambia (a = valor nuevo; sin «a», el verbo pone el signo del delta) y el mes se recalcula con esa línea sustituida, la diferencia dicha y el supuesto declarado: una variable por vez. OLA 43 · LA SENSIBILIDAD DEL INGRESO: el espejo sobre lo que entra — «¿y si me bajan el sueldo un 20%?» / «a $1,200» — la fuente se resuelve por su nombre o por su naturaleza (el sueldo), la baja se lee en porcentaje o en monto nuevo, y el mes se recalcula con esa entrada sustituida (o el mes típico, si la entrada aún no está anotada este mes, declarado); el supuesto corre a la vista: la baja corre el mes entero y todo lo demás queda igual. OLA 72B · EL HIPOTÉTICO CERRADO (caza de Oscar en su teléfono, 2026-11-25): hay un «si» que no pide prestada ninguna base, porque trae la suya: «¿si tengo 200 pesos y los gasto, cuánto me queda?» — un monto gobernado por TENER (el punto de partida), un gasto (otro monto tras el verbo de gastar, o el mismo monto retomado con «los/lo») y la pregunta por lo que queda. Ese se responde con la aritmética de la pregunta, en la moneda de la pregunta, sin libro y sin viaje de conversión («Te quedan C$0.00: tienes C$200.00 y gastas C$200.00»), y la nota lo declara: tu libro no entra en este cálculo. Antes de esta ola, el camino general sumaba todos los montos como gasto contra la queda real: «si tengo 500 y gasto 200» restaba 700 y daba un cero por accidente con la derivación entera equivocada. Si el punto de partida vive en una cuenta nombrada («tengo 200 en PayPal»), no es cerrado: es del libro y lo juzgan las ramas de cuenta. OLA 72C · LA PREMISA CON «TENGO»: un monto gobernado por TENER (tengo, tuviera, tuviese, have, had) es el punto de partida que el usuario trae, jamás un movimiento: no se suma al gasto ni a ningún camino. Si la premisa nombra una cuenta (PayPal, el banco, tus ahorros), la cuenta corre con LA CIFRA DEL USUARIO declarada como premisa y la nota confronta lo que el libro trae en ese lugar — y el resultado con la cifra del libro si difiere; si coinciden, lo dice; si el libro no ata saldo a ese nombre, lo dice y la premisa manda sola. La forma cerrada cede cuando la frase trae otro signo: con una entrada o un apartado, manda el camino firmado, que excluye la premisa de sus movimientos y la toma como base («Lo que dices tener»); en el camino viejo, la suma es solo de movimientos y la base es su cifra. La puerta oye la anatomía tener + gastar + preguntar por lo que queda, con o sin «si». Y el «sí» con tilde al frente se lee del texto crudo y se declara en la nota («lo leo como tu confirmación»), sin cambiar la cuenta.",
    contradiction: "Si la pregunta trae sus números, la respuesta NO los sustituye por los del libro: el libro solo presta la base.",
    silences: ["«Si sacara $X de mi cuenta» con cuenta elegible es cuenta-origen (el injerto de escenarios), no esta familia.", "Un «si» sin montos no se calcula: cae a las demás familias o al silencio honesto."],
  },
  {
    id: "proyeccion",
    name: { es: "La proyección de ahorro: el aporte repetido contra el horizonte", en: "The savings projection: the repeated set-aside against the horizon" },
    cap: { es: "cuánto tendrías ahorrado si apartaras lo mismo cada semana o cada mes hasta una fecha", en: "how much you'd have saved if you set the same amount aside every week or month until a date" },
    status: "viva",
    source: ["ahorros.stock", "asesor.lectura"],
    axes: ["cadencia (semana × quincena × mes × año × una sola vez) × horizonte (fin de mes × fin de año × mes nombrado × en N unidades) × el guardado de hoy"],
    canonical: {
      es: ["Si ahorro doscientos dólares mensuales, ¿cuánto tendría para diciembre?", "Si ahorro mil doscientos, ¿cuánto tendría en cinco años?", "Si comenzara a ahorrar quinientos dólares semanales, ¿cuánto tendría a fin de mes?"],
      en: ["If I save $100 each week, how much money I would have by the end of the year?", "If I save $500 each month, how much would I have by the end of the year?"],
    },
    answerShape: "El guardado que consta hoy MÁS el aporte repetido por los períodos completos que caben hasta el horizonte, cada cifra como pieza; el supuesto a la vista: aporte constante, sin interés (el libro no promete ninguno), nada anotado. Sin cadencia en la pregunta, el Asesor pregunta de vuelta (cada semana / cada mes / una sola vez) en vez de adivinarla — la vuelta entra por el pin «cad:» de la caja, la misma costura del contexto de cuentas.",
    contradiction: "El monto del horizonte («en cinco años») no es un monto de la premisa: los cinco son años, no dólares.",
    silences: ["Sin horizonte no hay proyección: «si ahorro N» a secas camina por el hipotético con signo.", "La proyección no promete interés ni rendimiento: pedir rendimiento sobre lo anotado es de la familia de rendimiento, no de esta."],
  },
  {
    id: "seguro",
    name: { es: "El seguro de vida: la pieza y su plan (la póliza no es ahorro)", en: "Life insurance: the piece and its plan (the policy is not savings)" },
    cap: { es: "cuánto pagas de seguro de vida, cuándo se cobra, de qué cuenta sale, quién es el beneficiario y desde cuándo lo tienes — y por qué la póliza no es un ahorro", en: "how much you pay for life insurance, when it's charged, which account it comes from, who the beneficiary is and since when you've had it — and why the policy isn't savings" },
    status: "viva",
    source: ["libros.lineas"],
    axes: ["la pieza (configurada × sin configurar × ausente con líneas × ausente del todo) × lo preguntado (la prima × el día del cobro × la cuenta de cobro × los beneficiarios × el inicio × la ley)"],
    canonical: {
      es: ["¿Cuánto pago de seguro de vida al mes?", "¿Cuándo se cobra mi seguro de vida?", "¿De qué cuenta sale mi seguro de vida?", "¿Quién es el beneficiario de mi seguro de vida?", "¿Desde cuándo tengo mi seguro de vida?", "¿Mi seguro de vida cuenta como ahorro?"],
      en: ["How much do I pay for life insurance each month?", "Does my life insurance count as savings?"],
    },
    answerShape: "Todo sale de la pieza del catálogo (kind «ins») y su plan: la prima con su moneda, el cobro (el día fijo del mes o la semana del mes), la cuenta de la que se cobra, los beneficiarios nombrados y la fecha de inicio — cada dato que la pieza no trae escrito se dice ausente, jamás se adivina. La forma de la ley («¿cuánto tengo en mi seguro?», «¿cuenta como ahorro?») responde la ley del propio tipo: la prima es un gasto fijo y la póliza nunca es un activo — no hay saldo que tener ni suma que hacer.",
    contradiction: "La póliza jamás se presenta como saldo, bolsillo o parte del ahorro: cualquier respuesta que la sume contradice el tipo de su propio plan.",
    silences: ["Sin pieza y sin líneas de prima no se inventa póliza: se dice que el libro no trae ningún seguro de vida anotado.", "Lo pagado en un período («¿cuánto he pagado este año?») es historia sobre las líneas, no esta familia: esta lee el plan."],
  },
  {
    id: "calculadora",
    name: { es: "Calculadora en lenguaje llano", en: "Plain-language calculator" },
    cap: { es: "cuentas sueltas con los números que traes: sumas, repartos, porcentajes y fracciones en palabras", en: "loose math with the numbers you bring: sums, splits, percentages and fractions in words" },
    status: "viva",
    source: ["asesor.lectura"],
    axes: ["operación (suma × reparto × porcentaje × ritmo/cadencia) × montos traídos (con su moneda: dólares × pesos=córdobas)"],
    canonical: {
      es: ["Si me regalaron 300 dólares de cumpleaños, 200 de aumento y mamá me dio 150, ¿cuánto sería?", "Si divido 1500 dólares en tres partes, ¿cómo me quedaría?", "¿Cuánto es el 20% de 1500?", "¿Cuál es el quince por ciento de mil quinientos dólares?"],
      en: ["If I got 300 for my birthday, 200 as a raise and 150 from Mom, how much would that be?", "If I split 1500 dollars into three parts, how much is each?", "What's the 10 percent of $355?"],
    },
    answerShape: "La operación sobre los números TRAÍDOS, con cada monto como pieza con su concepto («de cumpleaños», «en comida»); el reparto dice su sobra si no es exacto. La nota lo declara: es aritmética de la pregunta, el libro no se tocó.",
    contradiction: "Si los números de la pregunta no cuadran con lo que el usuario afirma («son 700»), la suma real de sus propios montos manda.",
    silences: ["Una pregunta sobre lo ANOTADO no es calculadora aunque traiga un número: «¿puedo gastar $100?» es spend.", "Sin operación reconocible (suma/reparto/porcentaje) no se improvisa: silencio honesto."],
  },
  {
    id: "acciones",
    name: { es: "Acciones sugeridas: proponer el hacer", en: "Suggested actions: proposing the doing" },
    cap: { es: "proponerte el envío de una remesa, con su monto repartido por persona", en: "proposing a remittance for you, with its amount split by person" },
    status: "viva",
    source: ["remesas.personas", "cambio.mesa", "captura.bandeja"],
    axes: ["intención (enviar × convertir × dejar calculado) × montos traídos (0 × 1 × varios con destino)"],
    canonical: {
      es: ["Quiero enviarle dinero a mamá", "Envío 50 a mamá, 30 para los niños, 40 para resolver y 10 para la comida"],
      en: ["I want to send money to Mom", "I'm sending 50 to Mom, 30 for the kids, 40 to sort things out and 10 for food"],
    },
    answerShape: "La aritmética de los montos traídos (total + pieza por destino) y debajo las ACCIONES propuestas, cada una con su puerta del mapa (target = id de askmap): la remesa a la persona, la conversión en la Mesa de cambio, dejarlo calculado en la bandeja. La respuesta propone; el toque dispone — nada se envía ni se guarda solo (R2).",
    contradiction: "Si la persona nombrada no está en sus remesas, la acción lo dice al llegar a la puerta — el Asesor no le asigna la remesa de otra persona.",
    silences: ["Preguntar POR las remesas (cuándo, a quién, cuánto) es el patrón de remesas, no una acción: esto dispara con la intención de hacer (quiero/envío/mando).", "Sin intención de envío no hay acciones: una respuesta informativa no lleva botones de hacer."],
  },
  {
    id: "contrafactual",
    name: { es: "Tentáculo: el contrafactual medido (si dejo de gastar en…)", en: "Tentacle: the measured counterfactual (if I stop spending on…)" },
    cap: { es: "cuánto juntarías si dejaras de gastar en algo, medido de tu propio historial", en: "how much you'd gather if you stopped spending on something, measured from your own history" },
    status: "viva",
    source: ["historial.stream", "asesor.lectura"],
    axes: ["fuente del monto (medido del historial × traído con su ritmo) × horizonte (mes × año)"],
    canonical: {
      es: ["Si dejo de gastar en comida rápida, ¿cuánto junto en un año?", "Si dejara de gastar 40 dólares al mes en golosinas, ¿cuánto sería en un año?", "¿Qué pasa si este mes no me entra el negocio?", "¿Y si este mes no vendo nada?"],
      en: ["If I stop spending on fast food, how much would I keep in a year?", "What if the business doesn't come in this month?"],
    },
    answerShape: "El promedio mensual MEDIDO del filtro en el historial (o el monto traído con su ritmo) y su año (×12), con el supuesto dicho: el ritmo sigue igual. Es el hipotético con memoria: no trae el monto, lo mide. OLA 43 · EL CONTRAFACTUAL DEL INGRESO: el espejo sobre lo que entra — «¿qué pasa si este mes no me entra el negocio?» resta esa fuente del mes (lo que ya entró este mes, o su mes típico si aún no entra, declarado) y dice el cierre con y sin ella; y si la ausencia fuera de todos los meses, el hueco mensual contra el gasto típico y las veces que lo guardado lo cubre. La fuente se resuelve por su naturaleza: lo que se vende es el ingreso variable, y manda sobre la preferencia por el sueldo.",
    contradiction: "Si el usuario cree que gasta menos en eso, el promedio medido manda y las líneas están a un toque (procedencia).",
    silences: ["Sin filtro reconocible y sin monto con ritmo, no hay contrafactual: silencio honesto.", "Un «si dejo de…» sobre una DEUDA no es contrafactual de gasto: es futuro/simulador de deuda."],
  },
  {
    id: "respaldo",
    name: { es: "Tentáculo: el colchón (meses de respaldo)", en: "Tentacle: the cushion (months of runway)" },
    cap: { es: "cuántos meses te dura lo que tienes, a tu ritmo de gasto medido", en: "how many months what you have lasts you, at your measured spending pace" },
    status: "viva",
    source: ["ahorros.stock", "historial.stream"],
    axes: ["numerador (todo lo guardado) × denominador (el gasto mensual promedio medido)"],
    canonical: {
      es: ["¿Cuántos meses me dura lo que tengo?", "¿Cuántos meses de respaldo tengo?", "¿Para cuántos meses me alcanza lo guardado?", "¿Cuánto tiempo aguanto sin ingresos?", "¿Cuánto aguanto si me quedo sin trabajo?"],
      en: ["How many months would my savings last?", "How many months of runway do I have?", "What if I lose my job?", "How long could I go without income?"],
    },
    answerShape: "El stock de ahorros ÷ el gasto mensual promedio medido, en meses enteros, con las dos piezas a la vista y el supuesto dicho. Es una MEDIDA, no un consejo: la frontera de no-opinar se respeta.",
    contradiction: "Si el usuario cree que le dura más, las dos piezas (lo guardado y el ritmo) están a la vista para que juzgue él.",
    silences: ["Sin gasto anotado no hay ritmo que medir: se dice y no se inventa un promedio.", "«¿Cuánto tengo en el colchón?» es ahorros (el monto), no respaldo (la duración)."],
  },
  {
    id: "meta",
    name: { es: "Tentáculo: la meta inversa (cuánto ahorrar al mes)", en: "Tentacle: the reverse goal (how much to save per month)" },
    cap: { es: "cuánto tendrías que apartar por mes para llegar a una meta en un plazo", en: "how much you'd need to set aside per month to reach a goal by a deadline" },
    status: "viva",
    source: ["ahorros.stock"],
    axes: ["meta traída × plazo traído (meses × año) × lo ya guardado (el stock)"],
    canonical: {
      es: ["¿Cuánto tengo que ahorrar al mes para llegar a 2000 dólares en 10 meses?", "¿Cuánto debo ahorrar para tener 5000 en un año?"],
      en: ["How much do I need to save a month to reach 2000 dollars in 10 months?"],
    },
    answerShape: "(Meta − lo que ya tienes) ÷ meses, con las tres piezas; si ya llegaste, lo dice y no te manda a ahorrar de más. El supuesto: sin intereses y sin contar lo que ya apartas.",
    contradiction: "Si el usuario cree que ya tiene más guardado, el stock manda: es el mismo número que muestra Ahorros.",
    silences: ["Sin meta o sin plazo no se despeja nada: la incógnita necesita los dos datos, y no se inventa ninguno.", "Una meta CON nombre propio en Ahorros se responde desde su motor de metas cuando exista la pregunta por ella; esta familia es la cuenta recta con la meta traída."],
  },
  {
    id: "deudas",
    name: { es: "Deudas planas: cuánto debo y cuánto me deben", en: "Plain debts: how much I owe and how much I'm owed" },
    cap: { es: "tus deudas planas: cuánto debes en total, a quién y quién te debe a ti", en: "your debts laid flat: how much you owe in total, to whom, and who owes you" },
    status: "viva",
    source: ["cobros.debo", "cobros.mideben"],
    axes: ["lado (yo debo × me deben) × alcance (una persona nombrada × el total con tarjetas)"],
    canonical: {
      es: ["¿Cuánto debo en total?", "¿Cuánto me debe Ana?", "¿Cuánto le debo a Carlos?", "¿Quién me debe?", "¿Cuánto me deben en total?"],
      en: ["How much do I owe in total?", "How much does Ana owe me?", "Who owes me?", "How much am I owed in total?"],
    },
    answerShape: "El saldo vivo de peopleOf por lado (préstamos recibidos / préstamos dados) más los saldos de tarjeta en el total; por persona, su saldo — y si el nombre vive en el lado contrario, la respuesta lo dice: la contradicción de dirección es parte de la respuesta.",
    contradiction: "«¿Cuánto le debo a Carlos?» cuando Carlos te debe a ti se responde al revés y dicho: la dirección correcta con su cifra.",
    silences: ["«¿A quién le debo MÁS?» es ranking (superlativo), no deudas planas.", "Un nombre que no vive en ningún lado no se inventa: silencio honesto."],
  },
  {
    id: "confirmacion",
    name: { es: "Confirmación: juzgar la afirmación del usuario", en: "Confirmation: judging the user's claim" },
    cap: { es: "si lo que afirmas de tu dinero es verdad, juzgado contra tu libro", en: "whether what you state about your money is true, judged against your book" },
    status: "viva",
    source: ["ahorros.stock", "historial.stream", "cobros.mideben"],
    axes: ["sujeto de la afirmación (ahorros × un gasto × una comparación entre personas) × veredicto (exacto × corregido con la diferencia)"],
    canonical: {
      es: ["Mis ahorros son 500, ¿verdad?", "¿Gasté 100 en zapatos?", "¿Ana me debe más que Carlos?"],
      en: ["I have 500 saved, right?", "Did I spend 100 on shoes?", "Does Ana owe me more than Carlos?"],
    },
    answerShape: "La afirmación se extrae (sujeto + cifra/lado) y se juzga contra su motor ANTES de enrutar: sí exacto, o no con la cifra real y la diferencia. Es la contradicción de la doctrina §17 viviendo como forma propia, no solo dentro de las canónicas.",
    contradiction: "Es la familia de la contradicción misma: ninguna premisa falsa pasa con un «sí» cortés.",
    silences: ["Una afirmación sin cifra ni comparación no se juzga: no hay premisa que contrastar.", "Confirmar un PAGO concreto («¿ya pagué…?») es ya-pagué, no esta familia."],
  },
  {
    id: "sintesis",
    name: { es: "Síntesis comparativa: pasado × futuro en el presente", en: "Comparative synthesis: past × future in the present" },
    cap: { es: "tu ritmo a estas alturas del mes, y tu cierre comparado con el pasado", en: "your pace at this point of the month, and your close compared with the past" },
    status: "viva",
    source: ["historial.stream", "asesor.lectura"],
    axes: ["forma (ritmo a estas alturas × cierre comparado) × dirección (por encima × por debajo)"],
    canonical: {
      es: ["¿Estoy gastando más rápido que el mes pasado a estas alturas?", "¿Cómo terminaré el mes comparado con el pasado?", "¿Voy a cerrar el mes mejor que el anterior?"],
      en: ["Am I spending faster than last month at this point?", "How will I end the month compared to last month?"],
    },
    answerShape: "DOCTRINA DE OSCAR (2026-11-21): los tres tiempos no se mezclan sin intención. La síntesis los cruza DECLARÁNDOLO: (a) el ritmo a estas alturas compara el mismo tramo de días de cada mes; (b) el cierre comparado estira el ritmo medido hasta fin de mes contra el cierre real pasado, con el supuesto dicho («si el ritmo sigue»). Cada tiempo conserva su nombre en la respuesta.",
    contradiction: "Si el usuario cree ir mejor, las dos piezas (su tramo y el tramo pasado, o el cierre proyectado y el real) están a la vista.",
    silences: ["Sin un tramo pasado con datos no hay síntesis: no se compara contra un mes vacío sin decirlo.", "«¿Gasté más este mes o el pasado?» con ambos meses cerrados es comparar, no síntesis: la síntesis trae el futuro o el tramo abierto."],
  },
  {
    id: "promedio",
    name: { es: "El promedio verdadero y el ritmo diario", en: "The true average and the daily pace" },
    cap: { es: "tus promedios medidos: por mes, por día, y tu gasto seguro de hoy", en: "your measured averages: per month, per day, and your safe spend today" },
    status: "viva",
    source: ["historial.stream", "asesor.lectura"],
    axes: ["escala (día × mes) × forma (ritmo llevado × promedio medido × gasto seguro de hoy)"],
    canonical: {
      es: ["¿Cuánto gasto al día?", "¿Cuánto gasto al mes en promedio?", "¿Cuánto es lo más que puedo gastar hoy?", "¿Cuánto necesito al mes para vivir?", "¿Qué porcentaje de lo que gano se va en la renta?", "¿Qué parte de mi sueldo se va en comida?", "¿Cuánto me cuesta la casa al mes?", "¿Cuánto gastamos en la casa al mes?", "¿Me alcanza con lo que gano?"],
      en: ["How much do I spend a day?", "How much can I spend today?", "How much do I need to live on per month?", "What percentage of my income goes to rent?", "How much do I spend on rent per month?"],
    },
    answerShape: "OLA 12 (batería del mundo): el promedio se MIDE sobre los meses anotados — jamás el mes en curso disfrazado de promedio —; el ritmo diario es el gasto del mes entre los días corridos; el gasto seguro de hoy reparte lo que queda del mes (la Queda) entre los días que faltan, con el supuesto dicho. OLA 42 · EL COSTO DE VIDA Y LAS PROPORCIONES: el mes entero como forma de vida se mide sobre el MES TÍPICO — la mediana de los meses anotados — en cuatro voces: «¿cuánto necesito para vivir?» devuelve el mes típico con lo esencial separado de lo que se mueve (la misma medida del colchón) y el ingreso típico al lado; «¿qué parte de lo que gano se va en X?» dice la parte en porcentaje Y en frecuencia natural con su denominador («de cada $100 que ganas, $30 van a la renta»), y sin ingreso medido nombra el denominador que falta en vez de inventar el porcentaje; «¿cuánto me cuesta X al mes?» / «¿cuánto gastamos en X?» dan el promedio mensual medido de ese ciudadano con el mes en curso al lado, y la ausencia se nombra; «¿me alcanza con lo que gano?» juzga ingreso típico contra gasto típico con el veredicto que la resta manda. El rótulo del ciudadano es honesto: si un solo concepto suma todo el filtro, ese concepto nombra; si el filtro abarca varios, nombra la categoría que los junta. Y «comida» oye a la categoría Alimentos por el puente de sinónimos hablados.",
    contradiction: "Si el promedio de un solo mes se presenta como media, la respuesta lo dice: medido sobre un mes.",
    silences: ["Sin gasto anotado no hay ritmo que medir: se dice, no se estima."],
  },
  {
    id: "relator",
    name: { es: "El relator: el cuento de un período", en: "The narrator: a period's story" },
    cap: { es: "cómo fue tu mes, contado entero: entró, salió y la partida mayor", en: "how your month went, told whole: what came in, what went out, the biggest item" },
    status: "viva",
    source: ["libros.lineas", "estudio.flujo"],
    axes: ["período (este mes × mes pasado × mes nombrado) — el relato cruza entró × salió × mayor partida × línea mayor"],
    canonical: {
      es: ["¿Cómo fue mi mes pasado?", "¿Cómo fue mi septiembre?", "¿En qué se me va el dinero?"],
      en: ["How was last month?", "Where does my money go?"],
    },
    answerShape: "OLA 12: el relato se compone SOLO de piezas medidas del período (entró, salió, la categoría mayor con su porcentaje, la línea más grande) y lleva su puerta a Estudio · Flujo — el relator cuenta lo que el Flujo dibuja.",
    contradiction: "Un período sin líneas se relata como lo que es: un mes en blanco, no un mes tranquilo inventado.",
    silences: ["El relator no opina sobre el período: cuenta sus piezas, en su orden."],
  },
  {
    id: "frecuencia",
    name: { es: "La frecuencia: cuántas veces y cada cuánto", en: "Frequency: how many times and how often" },
    cap: { es: "cada cuánto pasa cada cosa: veces, cadencias y lo que se repite", en: "how often each thing happens: counts, cadences and what repeats" },
    status: "viva",
    source: ["libros.lineas", "cobros.cuotas"],
    axes: ["forma (conteo en el período × cadencia entre fechas × el listado de suscripciones) × filtro"],
    canonical: {
      es: ["¿Cuántas veces fui al súper este mes?", "¿Cada cuánto voy al súper?", "¿Qué suscripciones tengo?"],
      en: ["How many times did I go to the store?", "What subscriptions do I have?", "How many times did I pay the rent?"],
    },
    answerShape: "OLA 12: el conteo cuenta líneas del filtro en el período; la cadencia se mide entre las fechas reales (con menos de dos fechas no hay cadencia y se dice); las suscripciones se listan con su monto y su próximo vencimiento.",
    contradiction: "—",
    silences: ["Una cadencia de una sola fecha no existe: se dice el conteo y se calla el ritmo."],
  },
  {
    id: "precio-tiempo",
    name: { es: "El precio del tiempo: tu dinero en días y horas", en: "The price of time: your money in days and hours" },
    cap: { es: "lo que ganas por día o por hora, y lo que una cosa cuesta en días de tu trabajo", en: "what you earn per day or per hour, and what a thing costs in days of your work" },
    status: "viva",
    source: ["libros.lineas", "asesor.lectura"],
    axes: ["dirección (el ingreso por día/hora × el costo de una cosa en días/horas de trabajo)"],
    canonical: {
      es: ["¿Cuánto gano por día?", "¿Cuántos días de trabajo me cuestan los zapatos de 80 dólares?", "¿Cuántas horas trabajo para pagar el internet?"],
      en: ["How much do I make a day?", "How many days of work does that cost?"],
    },
    answerShape: "OLA 12: el ingreso promedio medido se convierte a día (mes de 30) y hora (día de 8) con el supuesto DICHO en cada respuesta; el costo de una cosa se divide entre ese día. Sin ingreso anotado, silencio honesto.",
    contradiction: "—",
    silences: ["Sin ingreso medido no hay precio del tiempo: no se estima un sueldo."],
  },
  {
    id: "regla",
    name: { es: "La regla 50·30·20, medida en tu mes", en: "The 50·30·20 rule, measured on your month" },
    cap: { es: "tus tres cubos contra la regla 50·30·20, con su puerta a Estudio", en: "your three buckets against the 50·30·20 rule, with its door to Study" },
    status: "viva",
    source: ["estudio.regla", "asesor.lectura"],
    axes: ["cubo (necesidades × gustos × apartado) — cada uno con su cifra, su porcentaje y el número de la regla"],
    canonical: {
      es: ["¿Estoy dentro de la regla 50 30 20?", "¿Cuánto debería gastar en necesidades?"],
      en: ["Am I inside the 50 30 20 rule?"],
    },
    answerShape: "OLA 12: los tres cubos se miden con las clases del propio Asesor (lo esencial de la Lectura, el resto del gasto como gustos, lo apartado de las líneas de ahorro) contra el ingreso del mes, y la respuesta lleva su puerta a Estudio · Regla. La pregunta de gustos con regla sigue siendo de la familia gustos.",
    contradiction: "La regla es referencia, no sentencia: la respuesta lo dice y no convierte el exceso en regaño.",
    silences: ["Sin ingreso del mes no hay reparto que medir: se dice."],
  },
  {
    id: "puente",
    name: { es: "El puente: llevarte a donde la cifra ya vive", en: "The bridge: taking you to where the figure already lives" },
    cap: { es: "llevarte a donde vive la cifra que te acabo de dar", en: "taking you to where the figure I just gave you lives" },
    status: "viva",
    source: ["estudio.flujo", "asesor.lectura"],
    axes: ["destino (Estudio × la casa de la cifra en el Asesor × Remesas) — transversal a las familias cuya cifra ya está reportada"],
    canonical: {
      es: ["¿Cuánto gasté el último mes en tiendas?", "¿Cuál es mi patrón de remesas?"],
      en: ["How much did I spend last month in stores?"],
    },
    answerShape: "IDEA DE OSCAR (2026-11-21): cuando la pregunta casa con información que la app YA reporta (una estadística de Estudio, una sección del propio Asesor), la respuesta no termina en el número: lleva su PUERTA directa a esa área — el mismo gesto con que las ayudas (?) llevan al tema exacto del Manual — y la vuelta es la lógica de atrás de la app (atrás del teléfono / ESC), con la pregunta y la respuesta intactas al volver. La puerta viaja como acción con target = el id de askmap del área que reporta la cifra: la misma fuente que la respuesta declara.",
    contradiction: "Si el área destino no puede mostrar la cifra en el modo de la persona, la puerta nombra su piso como cualquier respuesta del banco — jamás una puerta a una pared.",
    silences: ["Una cifra que solo vive en la respuesta (la calculadora, un hipotético) no lleva puerta: no hay área que la reporte y no se finge una.", "El puente nunca sustituye la respuesta: el número se dice primero; la puerta es el acceso, no el rodeo."],
  },
  {
    id: "compuesta",
    name: { es: "La segunda mitad: las preguntas con dos preguntas", en: "The second half: questions carrying two questions" },
    cap: { es: "dos preguntas en una, respondidas las dos, sin perder ninguna en silencio", en: "two questions in one, both answered, neither lost in silence" },
    status: "viva",
    source: ["asesor.lectura"],
    axes: ["las dos patas (cada una, una familia del banco) × el resultado (ambas responden × una responde y la otra se nombra)"],
    canonical: {
      es: ["¿Cuánto gasté en zapatos y cuánto me debe Carlos?", "¿Cuánto gasté en zapatos y cuándo es mi cumpleaños?"],
      en: ["How much did I spend on shoes and how much does Carlos owe me?"],
    },
    answerShape: "OLA 14: la pregunta compuesta se parte por su conjunción solo cuando AMBAS patas tienen forma de pregunta propia; cada pata se juzga por el motor de siempre y la respuesta trae las dos, cada una con su fuente y su procedencia. Si una pata no se puede responder, la respuesta lo NOMBRA en su nota — la mitad que falta se dice, jamás se pierde en silencio (la clase que CAZA-TRAMPAS cazó). Ante la duda no se parte: la conjunción dentro de una sola pregunta («comida y bebida») la deja entera.",
    contradiction: "Partir mal es peor que no partir: una pata sin forma de pregunta propia detiene la partición y la pregunta entera va a la cascada.",
    silences: ["Si ninguna pata responde, la pregunta entera merece su oportunidad en la cascada antes de cualquier silencio."],
  },
  {
    id: "simulador",
    name: { es: "El simulador: ensayar el futuro antes de vivirlo", en: "The simulator: rehearsing the future before living it" },
    cap: { es: "ensayar un pago contra tus deudas con el motor de tu propio plan", en: "trying a payment against your debts with your own plan's engine" },
    status: "viva",
    source: ["cobros.plan", "ahorros.stock", "cobros.cuotas"],
    axes: ["forma (el pago ensayado × el día D) × el contraste (contra el ritmo actual × a secas)"],
    canonical: {
      es: ["Si abono 50 dólares más al mes a mi tarjeta, ¿cuándo termino y cuánto me ahorro?", "Si pago 200 dólares al mes a mis deudas, ¿cuándo salgo?"],
      en: ["If I pay $50 extra a month on my card, when am I done and what do I save?"],
    },
    answerShape: "OLA 15: el usuario trae el monto y el motor del PROPIO Plan de la app (simulatePlan) corre el camino: meses, mes de término e interés total — y contra el ritmo actual, la diferencia en meses e intereses, ahorrada o perdida. Los supuestos se dicen: el orden de ataque del plan, tasas fijas, ningún cargo nuevo; una tasa estimada se declara heredada. FRONTERA: la forma fechada («¿puedo pagarlo el día D?») no vive aquí — la responde la delegación spend/reach de canon; el futuro con fecha tiene un solo proyector.",
    contradiction: "Si el ritmo ensayado no le gana al interés, la respuesta lo dice tal cual — con ese ritmo no se sale — en vez de prometer una fecha.",
    silences: ["Sin monto traído no hay ensayo: la pregunta cae a la familia futuro, que responde con el plan guardado.", "Sin deudas anotadas, el simulador lo dice y no inventa una deuda que simular."],
  },
  {
    id: "aprendizaje",
    name: { es: "El aprendizaje que se cuenta y que propone", en: "Learning that shows itself and proposes" },
    cap: { es: "qué palabras tuyas he aprendido — y olvidar la que me digas", en: "which of your words I've learned — and forgetting the one you name" },
    status: "viva",
    source: ["asesor.aprender"],
    axes: ["el almacén (vacío × con patrones) × la frecuencia (bajo el umbral × 3+ usos, la propuesta)"],
    canonical: {
      es: ["¿Qué has aprendido de mí?", "Olvida el patrón de la luz", "¿Cuánto gasté en la luz? (tras confirmar que «la luz» son los servicios de la casa)", "¿Cuánto le mandé a mami? (tras confirmar que «mami» es Mamá)"],
      en: ["What have you learned from me?"],
    },
    answerShape: "OLA 17: la Ola 11 enseñó las palabras; esta familia las CUENTA en voz alta — «¿qué has aprendido?» responde la lista legible (palabra → ciudadano, de describeLearned) o el vacío honesto con cómo se aprende. La frecuencia PROPONE: un patrón confirmado con 3+ usos (contados por touchAlias cuando dispara) trae su propuesta de pregunta predeterminada como dato (proposal) — la caja la vuelve tarjeta y el usuario dispone, como todo. «Olvida…» viaja como señal (forgetWord) y la caja aplica forgetAlias: el banco es puro y no muta el libro, pero la orden no se pierde. Los alias plenos: el de persona manda en las acciones de remesa y el de cuenta clava la cuenta-origen como un pin. Su función del mapa nace en esta ola (asesor.aprender, Ritmo): ninguna función nace sin su entrada.",
    contradiction: "Contar usos no es aprender: ningún patrón nace de un uso — solo de una confirmación — y ningún dígito vive en un patrón jamás.",
    silences: ["Sin patrones, la respuesta es el vacío honesto y la explicación de cómo se aprende — nunca una lista inventada."],
  },
  {
    id: "reparto",
    name: { es: "El reparto entre personas", en: "Splitting it between people" },
    cap: { es: "repartir un monto entre personas que tu libro conoce, nombrando la sobra", en: "splitting an amount among people your book knows, naming the leftover" },
    status: "viva",
    source: ["cobros.mideben", "cobros.debo"],
    axes: ["forma (los repartos traídos nombrados × el reparto igual entre una lista) × el total (traído × sumado)"],
    canonical: {
      es: ["Reparte los 120 dólares: 40 para mamá, 30 para Carlos y 50 para mí", "La cuenta fue de 90 dólares, reparte entre mamá, Carlos y yo"],
      en: ["Split the $120: 40 for mom, 30 for Carlos and 50 for me"],
    },
    answerShape: "OLA 16: la calculadora reparte entre N partes anónimas; esta familia reparte entre PERSONAS. Los repartos traídos nombrados se suman y se nombran pieza a pieza; contra el total traído, la sobra se nombra o la contradicción se dice. El reparto igual divide el total entre la lista nombrada, y el centavo indivisible se reparte de uno en uno, declarado. Solo se reparte sobre gente que el libro conoce — personas de Cobros en cualquier dirección, personas de Remesas — o el propio usuario (mí/yo = «Tú»): un nombre desconocido no se reparte, porque partir sobre un nombre adivinado sería inventar una persona. La respuesta lleva la puerta de Remesas: repartir es el primer paso de enviar, y nada se envía solo.",
    contradiction: "Los repartos traídos suman más que el total traído: se dice la pasada, no se reparte mal en silencio.",
    silences: ["Las partes por persona de un gasto YA anotado: no existen mientras la línea no lleve la marca de compartida (OLA 71 la especificó en REPARTO-SPEC.md); la pregunta se responde por «falta» nombrando la marca, jamás partiendo un total entre personas imaginadas.", "Un nombre que el libro no conoce: no hay reparto."],
  },
  {
    id: "estacionalidad",
    name: { es: "La estacionalidad: el año también tiene forma", en: "Seasonality: the year has a shape too" },
    cap: { es: "tu mes más fuerte del año y tu media por mes anotado", en: "your strongest month of the year and your average per recorded month" },
    status: "viva",
    source: ["historial.stream"],
    axes: ["filtro (todo el gasto × un ciudadano) — los meses anotados, sumados por mes"],
    canonical: {
      es: ["¿En qué mes gasto más?", "¿En qué mes gasto más en el súper?"],
      en: ["In which month do I spend the most?"],
    },
    answerShape: "OLA 15: suma el gasto (el ahorro fuera) de cada mes anotado, con o sin filtro, y nombra el mes mayor con su total y la media mensual: la distancia entre ambos es la estacionalidad del usuario, medida de su propio año.",
    contradiction: "Un mes parcial (el en curso) compite con los cerrados solo si el usuario lo pide: la media se dice «por mes anotado» y el mes en curso se nombra con su mes y año reales.",
    silences: ["Sin meses anotados con gasto, no hay forma que mostrar: se dice."],
  },
  {
    id: "series",
    name: { es: "Las series recurrentes: la suscripción como objeto", en: "Recurring series: the subscription as an object" },
    cap: { es: "si una suscripción subió de verdad, cuál no se cobró y cuánto te cuestan al año", en: "whether a subscription truly went up, which one didn't charge, and what they cost you a year" },
    status: "viva",
    source: ["libros.lineas", "cobros.cuotas"],
    axes: ["la pregunta sobre la serie (la subida × la cuota que no llegó × el costo anualizado) × la serie (una nombrada × todas)"],
    canonical: {
      es: ["¿Me subió alguna suscripción?", "¿Qué suscripción no se cobró?", "¿Cuánto me cuestan mis suscripciones al año?"],
      en: ["Did any subscription go up?", "Which subscription didn't charge?", "How much do my subscriptions cost me a year?"],
    },
    answerShape: "OLA 22 (los algoritmos de fin-infra y BankSync): la serie se agrupa por su ciudadano (subId o concepto) y se mide contra sí misma — la subida compara el último cobro con la MEDIANA de los anteriores y solo acusa lo que supera la variación que la propia serie ya mostraba (la medida vieja, primer contra último mes, se retira de frecuencia). La cuota que no llegó: la fecha pasó y no hay cobro nuevo anotado — se reporta la ausencia en el libro, sin afirmar que la compañía no cobró. El anualizado: el monto actual por el ritmo de cada línea, con el supuesto dicho.",
    contradiction: "Una serie que siempre baila no acusa por bailar: su propia variación es la cerca que la subida debe superar.",
    silences: ["Con menos de dos cobros no hay subida que medir: la serie se nombra en su monto típico, sin acusación.", "La ausencia reportada es la del libro: un cobro real no anotado la cierra al anotarse, y la respuesta lo dice."],
  },
  {
    id: "conversor",
    name: { es: "Herramienta: el conversor de moneda", en: "Tool: the currency converter" },
    cap: { es: "convertir entre tus monedas con la tasa de tu propia mesa de cambio", en: "converting between your currencies at your own exchange desk's rate" },
    status: "viva",
    source: ["cambio.mesa"],
    axes: ["dirección (USD ↔ NIO ↔ la invitada configurada) × monto traído × el seguimiento sin monto (el eco convierte la cifra anterior)"],
    canonical: {
      es: ["¿Cuánto es 100 dólares en córdobas?", "¿Cuánto son 5000 pesos en dólares?", "Convierte 250 dólares a córdobas", "¿Cuánto es 100 dólares en euros?"],
      en: ["How much is 100 dollars in córdobas?", "Convert 250 dollars to córdobas"],
    },
    answerShape: "La conversión con las tasas del libro (convertMinor/rateE4 y la tasa de la invitada configurada — la manual manda), pasando por el dólar cuando una invitada entra, y nombrando la tasa con su fecha y su fuente. El monto que no nombra su moneda se oye en la moneda del libro. El seguimiento desnudo («¿y en dólares?») convierte la cifra titular de la respuesta anterior y la nombra.",
    contradiction: "Si el usuario cree otra tasa, la respuesta no negocia: la del libro es la que la app entera usa, y se dice dónde se cambia (la Mesa).",
    silences: ["Una invitada SIN tasa en el libro no se convierte: se dice cuál es la invitada configurada (o que no hay ninguna) y que no se inventan tasas — jamás una tasa traída de fuera.", "«¿Cuánto tengo en dólares?» sobre su saldo no es conversor: es Tengo/ahorros."],
  },
  {
    id: "calendario",
    name: { es: "Herramienta: el calendario (aritmética de fechas)", en: "Tool: the calendar (date arithmetic)" },
    cap: { es: "cuentas de días y fechas: en cuántos días vence algo y qué día cae", en: "day and date math: in how many days something falls due and what day it lands on" },
    status: "viva",
    source: ["cobros.cuotas"],
    axes: ["operación (días hasta × fecha desplazada) × ancla (una cuota nombrada × el día N del mes × hoy)"],
    canonical: {
      es: ["¿En cuántos días vence mi Internet?", "¿Cuántos días faltan para el día 15?", "¿Qué día será en dos semanas?"],
      en: ["How many days until my Internet is due?", "What day will it be in two weeks?"],
    },
    answerShape: "La cuenta de días contra hoy (o la fecha desplazada), con la fecha dicha en palabras ISO; lo vencido se dice vencido y con sus días, desde la misma ventana de Cobros.",
    contradiction: "Si el usuario cree que vence otro día, la ventana manda y se muestra la fecha real.",
    silences: ["Una fecha sin ancla en el libro ni en la pregunta no se adivina: silencio honesto.", "«¿Cuándo FUE…?» es recencia, no calendario: pasado ≠ futuro."],
  },
  {
    id: "capacidades",
    name: { es: "Qué puede hacer el Asesor", en: "What the Advisor can do" },
    cap: { es: "qué sé hacer, generado de mi propio banco en el momento", en: "what I know how to do, generated from my own bank on the spot" },
    status: "viva",
    source: ["asesor.lectura"],
    axes: ["el banco entero, leído como lista"],
    canonical: {
      es: ["¿Qué puede hacer el asesor?", "¿Qué puedes hacer?", "¿Qué sabes hacer?", "¿Para qué sirves?"],
      en: ["What can the Advisor do?", "What can you do?", "What do you know how to do?"],
    },
    answerShape: "La lista GENERADA de las familias vivas del propio banco (nombre por familia): la descripción no puede prometer lo que el banco no tiene, porque sale del banco.",
    contradiction: "Si una familia deja de ser viva, desaparece de esta lista en la misma corrida — la lista nunca miente por vieja.",
    silences: ["Las familias declaradas NO aparecen aquí: aparecen en límites, como «todavía no»."],
  },
  {
    id: "limites",
    name: { es: "Qué NO puede hacer el Asesor (honesto)", en: "What the Advisor can NOT do (honest)" },
    cap: { es: "qué todavía no sé hacer, dicho sin disfraz", en: "what I still can't do, stated without disguise" },
    status: "viva",
    source: ["asesor.lectura"],
    axes: ["frontera (opinión × fabricación × acción × declaradas × pisos de modo)"],
    canonical: {
      es: ["¿Qué no puedes hacer?", "¿Qué no puedo hacer?", "¿Cuáles son tus límites?"],
      en: ["What can't you do?", "What are your limitations?"],
    },
    answerShape: "La frontera dicha en piezas: no opina, no inventa cifras, no guarda ni mueve dinero solo (a lo sumo un borrador en la bandeja), las familias declaradas nombradas como «todavía no», y los pisos de modo que no muestra.",
    contradiction: "Si el usuario cree que el Asesor puede algo de esta lista, la respuesta no cede: la frontera es la ley R2, no una opinión.",
    silences: ["«¿Qué no puedo hacer?» sobre un gasto concreto no es esta familia: es spend/free con su monto."],
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
    cap: { es: "tu patrón de remesas: cuánto, a quién y cada cuánto — en Completo", en: "your remittance pattern: how much, to whom and how often — in Complete" },
    status: "viva",
    source: ["remesas.personas", "asesor.lectura"],
    axes: ["quién (persona × todas) × cuándo (este mes × año × siempre)"],
    canonical: {
      es: ["¿Cuándo envías remesas y a quién?", "¿Cuánto he enviado a mamá este año?", "¿Cuánto envío en remesas al mes?", "¿Cuál es mi patrón de remesas?"],
      en: ["When do I send remittances, and to whom?", "How much have I sent to Mom this year?"],
    },
    answerShape: "Destinatarios con sus totales (line.to), la frecuencia real (envíos por mes con datos) y el último envío. El promedio solo se calcula sobre meses CON envíos y se dice así.",
    contradiction: "Una persona que el usuario nombra y no recibe remesas: se dice «no hay envíos a esa persona» — no se le asigna la remesa de otra.",
    silences: ["El último envío a UNA persona es recencia con filtro de remesa, aunque comparta motor."],
  },
  {
    id: "remesas-periodo",
    name: { es: "Remesas por período: cuánto mandé en un tiempo", en: "Remittances by period: how much I sent in a span" },
    cap: { es: "cuánto mandaste en remesas en un período: esta semana, este mes, el mes pasado", en: "how much you sent in remittances over a period: this week, this month, last month" },
    status: "viva",
    source: ["remesas.personas"],
    axes: ["cuándo (semana × mes × año × mes nombrado × quincena) × cuánto (la suma de las líneas de remesa del período)"],
    canonical: {
      es: ["¿Cuánto mandé esta semana?", "¿Cuánto mandé el mes pasado?"],
      en: ["How much did I send this week?", "How much did I send last month?"],
    },
    answerShape: "La suma viva de las líneas de remesa del período nombrado, con el período por su nombre y el conteo de envíos. En los tres modos: preguntar por los propios envíos es básico.",
    contradiction: "Un período sin envíos se dice vacío («no mandaste remesas en ese período») — jamás se rellena con el agregado de todos los tiempos.",
    silences: ["Sin período nombrado no es esta familia: sirve el patrón de remesas.", "Con persona nombrada manda la suma por persona con su período, no esta.", "«¿Cuánto gasté en remesas…?» con verbo de gasto es historia: su puerta va primero."],
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
    source: ["captura.bandeja", "captura.escribir", "ajustes.estructura", "cuenta.sync", "central.queda", "ahorros.stock", "cobros.tarjetas", "cambio.mesa", "advisor.projection", "study.prices", "advisor.price-watch", "folios.logbook", "settings.ask-presets"],
    axes: ["función (todo el askmap) × tipo (dónde veo × cómo hago)"],
    canonical: {
      es: ["¿Dónde veo mis recompensas?", "¿Cómo importo mi banco?", "¿Dónde está mi colchón?", "¿Cómo cambio el modo?"],
      en: ["Where do I see my rewards?", "How do I import my bank?"],
    },
    answerShape: "La función del mapa que la pregunta nombra: su pantalla, en una frase cómo se llega, y la puerta del Manual a su tema. Preguntar y llegar son la misma respuesta. OLA 72: EL CÓMO SE HACE, POR FIN SERVIDO — el registro ya reclamaba el eje («dónde se ve y cómo se hace») y el motor solo servía el dónde, por llaves sueltas: el cómo caía en silencio o lo robaba la familia de dinero del objeto («¿cómo creo una meta?» recibía el saldo). La puerta del cómo es una tabla CERRADA de tareas (verbo+objeto inconfundibles: anotar, importar, dar de alta una tarjeta, cambiar la tasa, el modo, el idioma, sincronizar, crear la meta, armar el plan) juzgada TEMPRANO, tras la tasa y antes de las familias de dinero; cada respuesta da la pantalla, lo que ahí pasa y la puerta cuando el tema la tiene, con el piso de modo declarado donde el mapa lo declara. Dos curas de la misma ola: el idioma se nombra antes de puntuar el mapa («cambio» ya no lo lee como la tasa: el idioma vive en Ajustes), y la tabla trae su verdad negativa: marcar un gasto como compartido todavía no se puede (la marca de la Ola 71 no existe en la app) y lo más cercano hoy es la nota de la línea. Lo que no está en la tabla no se improvisa: «¿cómo pago mi tarjeta?» no es una tarea de Faro.",
    contradiction: "Si la función no existe en el mapa, se dice que Faro no la tiene — jamás se inventa una pantalla.",
    silences: ["Una pregunta de dinero con cifra («¿cuánto tengo en tarjetas?») NO es faro-mismo aunque nombre una pantalla: es de su familia de dinero."],
  },
  {
    id: "futuro",
    name: { es: "Futuro: proyecciones con supuesto dicho", en: "Future: projections with the assumption stated" },
    cap: { es: "proyecciones a futuro, con el supuesto dicho en voz alta — en Completo", en: "projections into the future, with the assumption stated out loud — in Complete" },
    status: "viva",
    source: ["cobros.plan", "ahorros.mes", "asesor.escenarios"],
    axes: ["qué (deuda × ahorro × queda) × horizonte (meses × fecha)"],
    canonical: {
      es: ["¿Cuándo termino de pagar mis deudas?", "¿Cuánto tendré apartado en diciembre?", "¿Cuánto me quedará el año que viene?"],
      en: ["When will I be debt-free?", "How much will I have set aside by December?"],
    },
    answerShape: "La cifra del motor de proyección (payoffPlan, ritmo de apartado) CON el supuesto en la misma respuesta (R7): presupuesto usado o ritmo real, y qué lo movería.",
    contradiction: "Sin plan ni ritmo (ningún abono en 90 días), no hay proyección: se dice qué falta para poder proyectar.",
    silences: ["«¿Debería invertir?» NO es futuro: es opinión, fuera del núcleo dinero/app — desde la Ola 73 la responde la familia frontera diciendo el límite en voz alta; aquí sigue sin ser futuro."],
  },
  {
    // OLA 26 (Familia 6, E26-2): EL CAMINO ENTRA EN EL INVENTARIO. La
    // familia reach responde desde la .365 (ask2 la delega en su paso
    // 0b) y el banco no la llevaba: la descripción que «crece sola»
    // jamás contaba el alcance día a día — su capacidad principal
    // bajo Completo. Entra como familia viva, con su línea cap en su
    // grupo («Faro y tu futuro», en askpresets.ts). Y su cap nombra su
    // piso desde el nacimiento, como mandan las líneas de profundidad
    // Completo desde esta misma cura (Q26-3 de Asesor: el patrón de
    // remesas y las proyecciones nombran «— en Completo» en su texto,
    // para que la descripción — que sigue siendo una — no prometa en
    // presente lo que el modo vigente no entrega).
    id: "reach",
    name: { es: "El Camino: ¿llego a un día?", en: "The Path: do I reach a day?" },
    cap: { es: "si llegas a un día: tu saldo proyectado día a día y tu día más apretado — en Completo", en: "whether you reach a day: your projected balance day by day and your tightest day — in Complete" },
    status: "viva",
    source: ["advisor.projection", "asesor.lectura"],
    axes: ["día destino (fin de mes × un día nombrado)"],
    canonical: {
      es: ["¿Llego a fin de mes?", "¿Cuál es mi día más apretado?", "¿Llego al día 20?"],
      en: ["Do I make it to the end of the month?", "What's my tightest day?", "Do I reach the 20th?"],
    },
    answerShape: "La caminata del saldo proyectado (projectWalk): el saldo de cada día con lo que entra y lo que sale, y el día más apretado nombrado. Bajo Completo, el delegado nombra el piso sin cifras (la familia modelo de LA FRONTERA).",
    contradiction: "Si el día nombrado ya pasó, se dice: la caminata es hacia adelante, no una foto del ayer.",
    silences: ["«¿Cuánto me queda?» sin día ni fin de mes no es reach: es left.", "«¿Cuándo termino de pagar?» no es reach: es futuro."],
  },
  {
    id: "ausencia",
    // OLA 35 (integración): VIVA desde que su motor nació (ausenciaAnswer)
    // — la entrada vieja la seguía declarando «declarada» (§17.5) y el
    // barrido F2 cazó la mentira: sus canónicas viejas («¿qué no he
    // pagado todavía?») ahora SÍ llegan. La familia es viva, con las
    // canónicas y la forma de la Ola 35; el asiento viejo desaparece.
    name: { es: "La ausencia en el libro: lo que debería estar y no está", en: "Absence in the book: what should be there and isn't" },
    cap: { es: "lo que debería estar en tu libro y no está: la serie que no llegó y el gasto que desapareció", en: "what should be in your book and isn't: the payment that didn't arrive and the spending that vanished" },
    status: "viva",
    source: ["libros.lineas", "cobros.cuotas"],
    axes: ["la clase de ausencia (la serie que no llegó × el gasto que desapareció)"],
    canonical: {
      es: ["¿Qué me falta este mes?", "¿Qué no aparece?", "¿Qué me falta por pagar?"],
      en: ["What's missing this month?", "What hasn't shown up?", "Anything missing?"],
    },
    answerShape: "OLA 35 (la cola larga de BANKING77): la ausencia se juzga contra el ritmo del PROPIO libro — las series regulares que no llegaron (las candidatas de ausencia de la Ola 33) y las categorías con historia (≥4 meses) cuyo mes en curso va en cero y que solían empezar antes de hoy, con su mes típico. La respuesta lo dice DEL LIBRO, no del mundo: si fue a propósito o se pagó sin anotar, no falta nada — y la nota lo admite.",
    contradiction: "Una categoría que este mes va en cero pero solía empezar DESPUÉS de hoy no es ausencia todavía: la vara es su propio día típico de primera aparición.",
    silences: ["Sin ritmo medido (menos de 4 meses de historia, o series de menos de 3 apariciones) no hay ausencia que declarar: el vacío honesto de la familia lo dice."],
  },
  {
    id: "identidad",
    // OLA 35 (integración): VIVA desde que su motor nació
    // (identidadAnswer) — misma cura que ausencia: la entrada
    // declarada del §17.6 desaparece y la familia vive con su forma.
    name: { es: "La identidad del cargo: qué es esto que veo", en: "The charge's identity: what is this thing I see" },
    cap: { es: "qué es un cargo de tu libro: su nombre, su categoría y su ritmo, con la evidencia dicha", en: "what a charge in your book is: its name, its category and its rhythm, with the evidence stated" },
    status: "viva",
    source: ["libros.lineas", "historial.stream"],
    axes: ["la llave de búsqueda (el monto exacto × el nombre tal cual)"],
    canonical: {
      es: ["¿Qué es este cargo de $80?", "¿Qué es Internet?", "¿Qué es ese cargo?"],
      en: ["What is this $80 charge?", "What is Internet?", "What is that charge?"],
    },
    answerShape: "OLA 35: candidatas con la evidencia dicha y el criterio declarado — nombre o monto tal cual está anotado, categoría y subcategoría, número de apariciones con sus fechas, y el monto típico (la mediana de la serie). Si hay varias candidatas, se listan con el dato que las distingue y NO se elige por el usuario; si no hay ninguna, se dice y se pide el dato exacto. Nunca una adivinanza por parecido.",
    contradiction: "Dos cargos con el mismo monto y distinto nombre son dos candidatas: la respuesta las separa por su fecha y su ritmo, no funde una sola.",
    silences: ["Sin monto ni nombre que case con el libro, la respuesta pide el dato exacto en vez de señalar algo parecido."],
  },
  {
    id: "cargo",
    name: { es: "El cargo suelto: este cargo, ¿qué es, de dónde, dos veces?", en: "The single charge: what is this charge, from where, twice?" },
    cap: { es: "qué es un cargo suelto por su monto o su comercio, si no lo reconoces, si te lo cobraron dos veces y de qué cuenta o tarjeta salió", en: "what a single charge is by its amount or merchant, if you don't recognize it, if you were charged twice for it, and which account or card it came from" },
    status: "viva",
    source: ["libros.lineas"],
    axes: ["la llave (el monto × el comercio × el nombre) × la voz (identificar × no reconocido × dos veces × el origen × la fuente)"],
    canonical: {
      es: ["¿De qué es el cargo de $49.99?", "¿Cuál fue el cargo de Amazon?", "Tengo un cargo de $12.34 que no reconozco", "¿Me cobraron dos veces el internet?", "¿De dónde salió este cargo de $250?"],
      en: ["What was the Amazon charge?", "I don't recognize a $12.34 charge", "Which charge is the one from Amazon?"],
    },
    answerShape: "OLA 68 (el estudio de los grandes): el cargo se identifica con la evidencia del libro (nombre, categoría y subcategoría, monto, fecha, comercio y cuenta de origen cuando la línea la trae), y la respuesta nombra también lo que el libro no sabe: si el mismo mes hay otro cargo igual de la misma serie se dice, y ante el cargo no reconocido la nota declara el límite (la disputa va con el banco; el libro guarda lo anotado, no juzga legitimidad). La forma «¿qué es este cargo?» sigue siendo de identidad: esta familia entra por el comercio, el no reconocimiento, el dos veces, el origen y la fuente.",
    contradiction: "Un monto que casa con series distintas no se funde: se listan las candidatas con su fecha y su nombre, y no se elige por el usuario.",
    silences: ["Sin monto, comercio ni nombre que case con el libro, se dice que no se encuentra y se pide el dato exacto.", "La fuente (cuenta o tarjeta) solo se nombra si la línea la trae anotada: si no, se dice que el libro no lo guarda."],
  },
  {
    id: "tasa",
    name: { es: "La tasa de ahorro, contra la referencia", en: "The savings rate, against the reference" },
    cap: { es: "cuál es tu tasa de ahorro y cómo va contra tu propio promedio y contra la guía, este mes o en tu último mes con ingreso", en: "what your savings rate is and how it stands against your own average and against the guide, this month or in your last month with income" },
    status: "viva",
    source: ["ahorros.mes", "estudio.regla"],
    axes: ["la vara (la propia medida × la regla publicada) × el período (este mes × el promedio medido)"],
    canonical: {
      es: ["¿Cuál es mi tasa de ahorro?", "¿Qué porcentaje de mi ingreso ahorro?", "¿Estoy ahorrando lo suficiente?", "¿Ahorro más que el mes pasado?"],
      en: ["What is my savings rate?", "What percentage of my income do I save?", "Am I saving enough?"],
    },
    answerShape: "OLA 69 (el plan de los grandes, con el respaldo del estudio académico): la tasa es lo apartado entre lo que entró, con su derivación en piezas, y se juzga contra dos referencias en orden: primero la propia (el promedio medido del usuario) y después la referencia de la guía, nombrada como referencia y nunca como sentencia. La tendencia contra el mes anterior se dice cuando existe. «¿Cuánto debería ahorrar?» sigue siendo de ahorros: su vara es la meta de colchón de Ajustes, no la tasa. ADJUDICACIÓN DE CANON (1.3.464): la segunda referencia se lee de la guía del libro (guideOf) — con guía propia, la referencia es la suya, nombrada como suya; la regla publicada 50·30·20 solo nombra la referencia cuando el libro no trae guía propia.",
    contradiction: "La regla publicada no manda sobre la vara del usuario: si las dos referencias discrepan, la respuesta las presenta en su orden y la que manda es la propia.",
    silences: ["Sin ingreso anotado en ningún mes no hay tasa: se dice, sin dividir entre nada.", "La tasa es del apartado anotado, no del residuo del mes: lo que el mes dejó libre sin apartar no cuenta como ahorro."],
  },
  {
    id: "frontera",
    name: { es: "La frontera, dicha en voz alta: el consejo que no doy y las definiciones atadas a tu cifra", en: "The frontier, said out loud: the advice I don't give and the definitions tied to your figures" },
    cap: { es: "el consejo que no doy, dicho en voz alta, y las definiciones atadas a tus cifras — en Completo", en: "the advice I don't give, said out loud, and the definitions tied to your figures — in Complete" },
    status: "viva",
    source: ["ahorros.stock", "central.queda", "cobros.tarjetas", "cobros.debo", "libros.lineas"],
    axes: ["el tema (invertir × impuestos × lo legal × el puntaje como consejo × rentar o comprar) × la definición (APR × tasa de interés) × la cifra del libro que sí responde"],
    canonical: {
      es: ["¿Debería invertir mis ahorros?", "¿En qué me conviene invertir mi dinero?", "¿Cómo puedo pagar menos impuestos?", "¿Puedo deducir la renta de mis impuestos?", "¿Me pueden embargar la cuenta si no pago la tarjeta?", "¿Cómo subo mi puntaje de crédito?", "¿Me conviene rentar o comprar una casa?", "¿Qué es el APR?", "¿Cuál es el APR de mi tarjeta?", "¿Qué es una tasa de interés?"],
      en: ["Should I invest my savings?", "How can I pay less tax?", "Can they garnish my account?", "How do I raise my credit score?", "What is APR?", "What is an interest rate?"],
    },
    answerShape: "OLA 73 (la frontera del plan de los grandes y del censo de dominios): el Asesor no falla el consejo (en qué invertir, qué deducir, si te pueden embargar, cómo subir el puntaje, rentar o comprar), pero tampoco lo calla en seco ni lo disfraza de otra respuesta: dice el límite en llano, dice por qué el límite protege, y da lo que el libro SÍ responde del mismo tema con su cifra (el apartado y la queda para invertir; lo pagado de impuestos en el año para impuestos; la deuda en tarjetas para lo legal y el puntaje; la vivienda anotada y el apartado para rentar o comprar). Y las definiciones no van en el aire: el APR y la tasa de interés se definen en palabras llanas y se ATAN a las tarjetas del propio usuario con su costo al mes (saldo × tasa ÷ 12, la aritmética de la Ola 40); sin tasa anotada, la respuesta nombra el dato que falta. Medido antes de la ola: «¿debería invertir mis ahorros?» recibía el saldo como si fuera consejo, «¿cómo subo mi puntaje?» recibía las instrucciones de importar, «¿cómo puedo pagar menos impuestos?» pedía un monto, y «¿qué es el APR?» caía en silencio: la frontera existía como silencio declarado, pero el motor ni siquiera lo honraba.",
    contradiction: "El límite no se disfraza: ninguna respuesta de esta familia recomienda, deduce, determina derechos ni promete puntaje; lo que ofrece del libro es un hecho medido, no un consejo con otro nombre.",
    silences: ["El número del puntaje sigue siendo de la familia falta: vive en los burós, no en el libro; aquí solo entra el consejo de cómo subirlo.", "«¿Cuánto pagué de impuestos?» es historia, no frontera: lo anotado se suma sin opinar.", "Una definición sin cifra que atar se da con su ausencia nombrada; jamás se inventa una tasa para una tarjeta que no la trae."],
  },
  {
    id: "seguimiento",
    name: { es: "Seguimiento: la misma pregunta, un eje cambiado", en: "Follow-up: same question, one axis changed" },
    cap: { es: "seguir una respuesta cambiando un solo eje — otro mes, otra cuenta", en: "following up on an answer by changing one axis — another month, another account" },
    // OLA 27 (Familia 4, Q27-2/E27-1): VIVA desde que su motor nació
    // (§20, 1.3.380: answerFollowUp y sus cinco verbos), pero el banco
    // la siguió declarando «declarada» — y la descripción generada de
    // capacidades, fiel al banco, la contaba entre «Lo que todavía no
    // sé» mientras el motor la servía y el Manual la enseñaba viva:
    // el dato viejo entró con la re-cosida del banco en la .383. La
    // familia es viva, con su cap en «Faro y tu futuro» (CAP_GROUPS de
    // askpresets), junto a reach y puente: seguir una respuesta es
    // conversar con el propio libro hacia adelante, no una cifra más.
    status: "viva",
    source: ["asesor.lectura", "historial.stream"],
    axes: ["eje cambiado (período × persona × cuenta × dónde × quién) × la forma (solo el eje × la reparación «no, X» × los verbos del §20)"],
    canonical: {
      es: ["¿Y el mes pasado?", "¿Y Ana?", "No, en septiembre", "¿Y en tiendas?", "¿Y en total?"],
      en: ["And last month?", "And Ana?", "And in stores?"],
    },
    answerShape: "(Viva — §20) La caja recuerda la última familia y sus ranuras; el seguimiento re-ejecuta la misma familia cambiando UN eje. Sin pregunta previa, un seguimiento suelto es silencio honesto. OLA 19 (el marco que queda; GUS 1977, Frames 2017): cada respuesta del banco nace además con su MARCO conversacional — la pregunta que la produjo, sus ejes detectados (período, persona, cuenta) y su procedencia — y el seguimiento corto se reescribe sustituyendo UN eje de la pregunta guardada, respondido por el motor de siempre con el eco del cambio en la nota. La forma debe ser SOLO el eje: si tras el eje queda una pregunta nueva, no es seguimiento y sigue su camino. La caja guarda el marco y lo devuelve; el banco sigue puro.",
    contradiction: "La reparación («no, en septiembre») es la misma sustitución con marca de corrección: el eje nuevo manda sobre el guardado.",
    silences: ["Sin contexto previo no dispara: «¿y en tiendas?» como primera pregunta no significa nada y no se adivina.", "Sin marco previo no dispara: «¿y el mes pasado?» como primera pregunta no significa nada y no se adivina — silencio honesto."],
  },
  {
    id: "porque",
    name: { es: "¿Por qué?: la procedencia, desplegada", en: "Why?: the provenance, unfolded" },
    cap: { es: "enseñarte de dónde sale una cifra: la pregunta, sus piezas y su fuente", en: "showing you where a figure comes from: the question, its pieces and its source" },
    status: "viva",
    source: ["asesor.lectura"],
    axes: ["el marco (con respuesta previa × sin ella)"],
    canonical: {
      es: ["¿Por qué dices eso?", "¿De dónde sale ese número?", "¿Cómo calculaste eso?"],
      en: ["Why do you say that?", "Where does that number come from?"],
    },
    answerShape: "OLA 21 (MYCIN: WHY/HOW): despliega las piezas y la fuente que el marco de la respuesta anterior ya guarda — la cuenta, línea por línea, y la puerta a su fuente. La puerta de entrada es estrecha: exige la anáfora (eso, ese número, dices, sale) o el «¿por qué?» desnudo; «¿por qué medio pagué?» no es esta familia. El marco se conserva: preguntar el porqué no destruye la conversación.",
    contradiction: "Si la cifra estuviera mal, la procedencia es donde se ve: la respuesta lo dice — la misma fuente que reporta la pantalla de su área.",
    silences: ["Sin respuesta previa no hay cuenta que desplegar: se dice («pregúntame primero la cifra») en vez de explicar una cifra que nadie pidió."],
  },
  {
    id: "falta",
    name: { es: "Qué dato te falta: el metaconocimiento", en: "The missing datum: metaknowledge" },
    cap: { es: "decirte qué dato le falta a tu libro para una cuenta — y contar la parte que sí se puede", en: "telling you which datum your book lacks for a computation — and counting the part that can be counted" },
    status: "viva",
    source: ["ahorros.stock", "cobros.debo"],
    axes: ["el dato ausente (el valor de los bienes × el puntaje que vive en el buró)"],
    canonical: {
      es: ["¿Cuál es mi patrimonio neto?", "¿Cuál es mi puntaje de crédito?"],
      en: ["What is my net worth?", "What is my credit score?"],
    },
    answerShape: "OLA 21 (la categoría de metaconocimiento de la encuesta NLIDB): cuando el cálculo pide un dato que el libro no guarda, la respuesta cuenta la parte que SÍ se puede contar (ahorros menos deudas, con sus piezas), NOMBRA el dato que falta y dice lo que desbloquearía. Solo entran las formas medidas en silencio al construir la ola — patrimonio (falta el valor de los bienes) y puntaje (vive en los burós, no en el libro). OLA 34: la TANDA entra por esta puerta — el objeto no existe en el libro: la respuesta lo dice, explica qué es una tanda en palabras llanas y nombra los cinco datos que harían falta (cuota por turno, número de personas, posición, inicio, si ya recibió); la especificación completa del objeto va escrita para canon en TANDA-SPEC.md. Jamás se disfraza de suscripción ni de ahorro. OLA 71: EL REPARTO SOBRE LO ANOTADO entra por esta puerta — «¿cuánto puso cada uno en la cena?» pide la parte por persona de un gasto que el libro sí tiene, pero ninguna línea marca si fue compartida ni entre cuántos: la respuesta dice el total bruto de lo nombrado cuando existe, nombra la marca ausente (compartida, entre cuántos, con quién) y lo que desbloquearía; la marca quedó especificada en REPARTO-SPEC.md y los totales del libro no cambian por ella (la parte es una lente del reparto, no una reescritura).",
    contradiction: "Un «patrimonio» cerrado sin el valor de los bienes sería una invención: la respuesta lo declara en su nota en vez de cerrarlo.",
    silences: ["Lo que el libro sí puede calcular no es falta: el fondo de emergencia, la tasa de ahorro y demás familias responden por su casa, no por esta."],
  },
  {
    id: "total",
    cap: { es: "todo tu dinero sumado: la queda de hoy, los ahorros y lo que te deben", en: "all your money summed: today's left, your savings and what's owed to you" },
    name: { es: "El total de todo: cuánto dinero tengo, sumadas las bolsas", en: "The total of everything: how much money I have, all bags summed" },
    status: "viva",
    source: ["libros.lineas", "ahorros.stock", "cobros.mideben"],
    axes: ["las bolsas (la queda de hoy × los ahorros × lo que me deben) × el borde declarado (sin efectivo fuera del libro, sin bienes, sin restar deudas)"],
    canonical: {
      es: ["¿Cuánto dinero tengo en total?", "¿Cuánto tengo en total?", "¿Todo mi dinero cuánto es?", "¿Cuánto billete hay?"],
      en: ["How much money do I have in total?", "How much do I have in total?"],
    },
    answerShape: "OLA 46 (F1, la Caza II): la suma de las tres bolsas que el libro conoce — la queda de hoy (readAdvisor), el stock de ahorros (savingsStock) y lo que me deben (netBalance: préstamos dados + recompensas) — sin duplicar: lo apartado ya salió de la queda, porque el ahorro cuenta como salida en la lectura. La respuesta nombra cada bolsa con su cifra y declara su borde: no cuenta efectivo fuera del libro ni el valor de los bienes, y NO resta lo que debes — eso es el patrimonio, de la familia falta. Sin ninguna bolsa, se dice: el libro no guarda dinero en ningún lado todavía.",
    contradiction: "Si el usuario afirma un total («tengo como $2,000 en total, ¿verdad?»), eso es confirmación, no esta familia.",
    silences: ["«¿Cuánto tengo?» a secas es la queda del delegado: esta familia exige el «en total» o «todo mi dinero».", "«¿Cuánto debo en total?» es deudas: el total de lo que se tiene no es el total de lo que se debe."],
  },
  {
    id: "figurada",
    cap: { es: "si tienes poco o mucho este mes, preguntado en tu forma de hablar", en: "whether you have little or a lot this month, asked in your own way of speaking" },
    name: { es: "La pregunta en figurado: ¿estoy palmado?, ¿tengo un dineral?", en: "The figurative question: am I broke?, am I flush?" },
    status: "viva",
    source: ["central.queda", "central.pagos"],
    axes: ["la figura (poco × mucho) × la vara declarada (la queda del mes contra los pagos que aún vienen)"],
    canonical: {
      es: ["¿Estoy palmado?", "Dime si estoy palmado", "¿Tengo un dineral?"],
      en: ["Am I broke?", "Do I have a fortune?"],
    },
    answerShape: "RAMA AGENTE E2 (la idea de Alvin, traída por Oscar el 2026-11-23): la figura se entiende como hipérbole — «palmado» es «tengo poco», «un dineral» es «tengo mucho» — y se responde el juicio contra el libro: la queda del mes (readAdvisor) contra los pagos que aún vienen (duesWindow a fin de mes, sin lo que me deben). Poco = la queda no cubre lo que viene; mucho = sobra más del doble de lo que viene. La vara se declara en la nota; jamás se comprueba si el saldo es literalmente cero, porque la pregunta no era esa.",
    contradiction: "«¿Cuánto me queda?» sin figura es la queda del delegado; «quedé palmado» contado como relato es de la capa de relato (rama agente), no de esta familia.",
    silences: ["La figura sin forma de pregunta («gasté una fortuna en el viaje») no se responde aquí: es color del relato, no una pregunta de estado.", "«¿Cuándo me quedo en cero?» es factibilidad: pide el día, no el juicio en figurado."],
  },
  {
    id: "factibilidad",
    cap: { es: "si el mes te alcanza, caminando tus pagos día a día hasta el fin", en: "whether the month holds, walking your payments day by day to the end" },
    name: { es: "La factibilidad: la prueba sobre lo anotado", en: "Feasibility: the proof over what's recorded" },
    status: "viva",
    source: ["libros.lineas", "cobros.cuotas", "central.queda"],
    axes: ["la prueba (el mes entero × el pago en su día × el punto bajo de 13 semanas) × el resultado (cabe × no cabe, con el conflicto nombrado)"],
    canonical: {
      es: ["¿Me alcanza el mes?", "¿Puedo pagar $200 el día 28?", "¿Cuál es mi punto más bajo?"],
      en: ["Will my money last the month?", "Can I pay $200 on the 28th?", "What is my lowest point?"],
    },
    answerShape: "OLA 29 (la red de restricciones temporales, en su forma llana): la queda de hoy camina los eventos con fecha en su orden — la ventana de vencimientos expandida por cadencia — y el veredicto es la prueba: si cabe, el cierre y el punto más bajo con su día; si no cabe, el conflicto nombrado (qué obligación, qué día, por cuánto), distinguiendo el problema del día del problema del mes. El pago en su día cobra el monto traído tras lo programado hasta ese día. El punto bajo mira 13 semanas de SOLO lo programado, y el ritmo medido corre aparte, con su vara declarada. Lo fechado sin monto (un préstamo) se nombra fuera de la prueba: no se inventa su cuota.",
    contradiction: "La prueba corre sobre lo anotado: si el usuario cree que alcanza y la cadena dice que no, la respuesta muestra el eslabón que rompe — no discute, enseña el día.",
    silences: ["Sin nada programado anotado, la prueba lo dice: el cierre es la queda misma, sin gasto nuevo.", "Un día sin monto, o un monto sin día, no es esta familia: el monto sin día es de la verificación; el día sin monto, de la Agenda.", "FRONTERA DE CANON (integración de la Ola 29): «Will/Do I make it to the end of the month?» y «¿Llego a fin de mes?» son del Camino (§19.1, costura 0r): el futuro con fecha tiene UN proyector. La copia del banco no tenía delegado y su canónica inglesa era la de «make it»; en canon la forma del mes de esta familia es «last the month» / «¿me alcanza el mes?»."],
  },
  {
    id: "ingreso",
    cap: { es: "tu ingreso medido de tus meses: la mediana, el piso y lo que los meses buenos dejan de más", en: "your income measured from your months: the median, the floor and what good months leave over" },
    name: { es: "El ingreso volátil: mediana, piso y excedente", en: "Volatile income: median, floor and surplus" },
    status: "viva",
    source: ["libros.lineas", "asesor.lectura"],
    axes: ["la vara (mediana × piso percentil 25) × el excedente de los meses buenos, contado aparte"],
    canonical: {
      es: ["¿Cuál es mi ingreso piso?", "¿Mi ingreso es estable?", "¿Cuánto gano en un mes malo?"],
      en: ["What is my income floor?", "Is my income stable?", "What do I make in a bad month?"],
    },
    answerShape: "OLA 30 (el kit del ingreso volátil): el ingreso de cada mes anotado se mide entero; la mediana es la vara central, el piso es el percentil 25 por rango más cercano y se DECLARA como tal, y el excedente de los meses buenos (lo que pasó de la mediana) se suma APARTE — no es ritmo. La meta inversa (familia meta) juzga su apartado contra este piso, no contra el promedio.",
    contradiction: "Si el usuario planea contra su promedio, la respuesta no lo corrige con sermón: le enseña el piso y el porcentaje que el apartado se come de él.",
    silences: ["Con menos de dos meses anotados con ingreso, no hay piso que medir: se dice, con el único mes a la vista."],
  },
  {
    id: "deriva",
    cap: { es: "lo que cambió en tu libro sin que preguntes: gastos que suben de a poco, saltos y cuotas que no llegaron", en: "what changed in your book without you asking: spending creeping up, jumps and payments that didn't arrive" },
    name: { es: "La deriva que avisa: lo que cambió sin que preguntes", en: "Drift that flags: what changed without you asking" },
    status: "viva",
    source: ["libros.lineas", "asesor.lectura"],
    axes: ["el detector (CUSUM × cerca de Tukey × ausencia de serie) × el presupuesto de avisos (tres, por monto × evidencia)"],
    canonical: {
      es: ["¿Algo cambió en mi libro?", "¿Hay algo raro?", "¿Qué debería saber?"],
      en: ["Did anything change in my book?", "Is anything off?", "What should I know?"],
    },
    answerShape: "OLA 33: las candidatas se calculan en driftCandidates como DATOS (la superficie que las presenta sin pregunta es de canon) y esta familia las dice cuando el usuario pregunta. Tres detectores con su vara declarada en la respuesta: la DERIVA (CUSUM de Page: la suma paciente de los excesos sobre la base pasa 4σ, con el nivel reciente 15% sobre la base), el SALTO (un mes pasa la cerca de Tukey Q3 + 1.5·IQR y el anterior no pasaba) y la AUSENCIA (una serie regular, ≥3 veces con su paso medido, lleva más de paso y medio sin volver). Presupuesto: hasta tres avisos por episodio, ordenados por impacto × evidencia; el id del episodio lleva el mes (histéresis) y el descarte del usuario viaja como supresión confirmada que la función honra. OLA 70 (la vigilancia, segunda vuelta): tres detectores más en la misma función y el mismo presupuesto: el DUPLICADO (la misma serie cobra el mismo monto dos veces en el mes en curso, a 10 días o menos, contra un ritmo histórico de 20 días o más entre cobros, o la serie nació este mes y ya cobró dos veces lo mismo; repetido no es automáticamente un error y la candidata lo dice), el PRIMERO (una serie con forma de compromiso, suscripción o cargo fijo o con vencimiento anotado, cobra este mes por primera vez en la historia del libro, y el libro lleva al menos tres meses con actividad: en un libro recién nacido todo es primero y la palabra no significa nada) y el DESCUBIERTO (lo que vence en los próximos 14 días supera lo que hoy queda del mes: la candidata nombra el faltante, y las cuotas de este mes, ya contadas en la queda, no se restan dos veces).",
    contradiction: "Un mes raro solo NO es un aviso: si el usuario señala un mes caro, la respuesta distingue el salto (un mes) de la deriva (la suma paciente) — y si ninguno pasa la vara, lo dice.",
    silences: ["Con menos de cinco meses de serie en una categoría, su deriva no se juzga: no hay base con qué medirla."],
  },
];

/** Las familias vivas o heredadas: las únicas que un motor puede
 * reclamar. Una familia declarada jamás produce respuesta. */
export function liveFamilies(): BankFamily[] {
  return QUESTION_BANK.filter((f) => f.status !== "declarada");
}
