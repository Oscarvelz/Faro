/* Novedades — la nota de cada versión, escrita para el usuario
 * (Oscar, 2026-11-20): cada cambio mayor llega con su nota breve en el
 * idioma del usuario, en lenguaje llano — no el asiento técnico. Las
 * notas viven aquí, como dato, y se alimentan en la MISMA entrega que
 * trae el cambio (la cerca novedades346 exige que la versión vigente
 * tenga su nota: ninguna entrega futura la olvida).
 *
 * Dos niveles, como Oscar lo pidió: «grande» se anuncia UNA vez al
 * abrir tras la actualización (la app compara su versión con la última
 * que este teléfono ya vio — funciona igual si la actualización llega
 * por la web, sin tocar el APK); «menor» se acumula en silencio en
 * Ajustes, en el pliegue «Novedades». Después del anuncio, silencio:
 * la nota queda guardada en Ajustes para releerla.
 *
 * El área «Acerca de» vive en el mismo pliegue de Ajustes: qué es Faro
 * y qué busca, con la versión al pie. */

export type NewsLevel = "grande" | "menor";

export interface NewsEntry {
  version: string;
  date: string; // ISO yyyy-mm-dd
  level: NewsLevel;
  title: { es: string; en: string };
  points: { es: string[]; en: string[] };
  /** La puerta de la nota (1.3.354, Oscar): el tema del Manual cuyo
   * lugar nombra la nota. En el pliegue, la nota lleva su «Ir allí»
   * por la vía de ese tema y atrás devuelve a Novedades. Sin tema,
   * la nota es solo texto — nunca una puerta inventada. La tarjeta
   * del anuncio no lleva puerta: las puertas viven en el pliegue. */
  topic?: string;
}

/** De la más nueva a la más vieja — el orden de esta lista ES el orden
 * en que se leen en Ajustes. */
export const NEWS: NewsEntry[] = [
  {
    version: "1.3.373",
    date: "2026-11-21",
    level: "menor",
    title: { es: "La descripción, ordenada; la pregunta, cierra", en: "The description, in order; the question, closes" },
    points: {
      es: [
        "La respuesta a «¿Qué puedes hacer?» se presenta ahora en grupos — tu mes, tus movimientos, tus cuotas, tus ahorros — con una línea corta por capacidad, en vez de un solo párrafo.",
        "Tocar la tarjeta «Tu pregunta» cierra la respuesta y vuelven a aparecer las preguntas sugeridas.",
      ],
      en: [
        "The answer to “What can you do?” now comes in groups — your month, your movements, your dues, your savings — with one short line per capability, instead of a single paragraph.",
        "Tapping the “Your question” card closes the answer and brings the suggested questions back.",
      ],
    },
  },
  {
    version: "1.3.372",
    date: "2026-11-21",
    level: "menor",
    title: { es: "El Asesor en la barra; las vistas, flotantes", en: "The Advisor in the bar; the views, floating" },
    points: {
      es: [
        "El icono de la pregunta en la barra superior te lleva directo a Preguntar al Asesor, con la caja lista para escribir.",
        "Las vistas (una pantalla, dos pisos, ventana flotante) viven ahora en un botón flotante abajo a la izquierda: se sienta sobre la barra inferior y se hunde con ella cuando la barra se oculta, junto al botón de subir. Ambos son un poco más pequeños.",
      ],
      en: [
        "The question icon in the top bar takes you straight to Ask the Advisor, with the box ready to type in.",
        "The views (one screen, two floors, floating window) now live in a floating button at the bottom left: it sits above the bottom bar and sinks with it when the bar hides, together with the back-to-top button. Both are a little smaller.",
      ],
    },
  },
  {
    version: "1.3.371",
    date: "2026-11-21",
    level: "menor",
    title: { es: "La fija describe; la respuesta, arriba", en: "The fixed one describes; the answer, on top" },
    points: {
      es: [
        "«¿Qué puedes hacer?» ya no entrega una lista de preguntas: describe con honestidad lo que tu Asesor sabe hacer, lo que todavía no, y sus límites. La descripción se actualiza sola cuando el Asesor aprende algo nuevo.",
        "La fila «A la mano» vive ahora debajo de la respuesta: primero tu pregunta y su respuesta; tus preguntas guardadas, después, siempre a la vista.",
      ],
      en: [
        "“What can you do?” no longer hands you a list of questions: it honestly describes what your Advisor knows how to do, what it doesn't yet, and its limits. The description updates itself when the Advisor learns something new.",
        "The “At hand” row now lives below the answer: first your question and its answer; your saved questions after, always in sight.",
      ],
    },
  },
  {
    version: "1.3.370",
    date: "2026-11-21",
    level: "menor",
    title: { es: "Folios en armonía", en: "Folios in harmony" },
    points: {
      es: [
        "Las pastillas de Folios van ahora en una sola línea y en su orden: Bitácora · Historial · Archivo.",
        "La Bitácora estrena el acabado de la casa en su aviso y en su estado vacío: nada de textos sueltos.",
      ],
      en: [
        "The Folios chips now sit on a single line and in their order: Logbook · History · Archive.",
        "The Logbook gains the house finish on its notice and its empty state: no more loose text.",
      ],
    },
  },
  {
    version: "1.3.369",
    date: "2026-11-21",
    level: "grande",
    topic: "preguntas-a-la-mano",
    title: { es: "Tus preguntas, a la mano", en: "Your questions, at hand" },
    points: {
      es: [
        "La caja del Asesor trae ahora una fila que nunca se esconde: «A la mano». Tus preguntas están ahí también tras una respuesta.",
        "La primera es de Faro: «¿Qué puedes hacer?» — su respuesta es todo lo que el Asesor sabe responder, y tocar una pregunta la pregunta de verdad.",
        "Guarda las tuyas desde el engranaje de la caja o en Ajustes → Preguntas a la mano: elige del catálogo o escribe la tuya, y ordénalas como quieras.",
      ],
      en: [
        "The Advisor's box now carries a row that never hides: “At hand”. Your questions are there even after an answer.",
        "The first one is Faro's: “What can you do?” — its answer is everything the Advisor knows how to answer, and tapping a question really asks it.",
        "Save yours from the gear in the box or in Settings → Questions at hand: pick from the catalog or write your own, and order them as you like.",
      ],
    },
  },
  {
    version: "1.3.368",
    date: "2026-11-21",
    level: "menor",
    title: { es: "Pulido: la línea del modo y la tarjeta de precios", en: "Polish: the mode line and the price card" },
    points: {
      es: [
        "La línea del modo en Ajustes cabe ahora en una sola línea, en los tres modos.",
        "La tarjeta de cambios de precio de Estudio estrena su envoltorio acabado, con sus bordes, y su gráfica marca cada escalón con su valor y su fecha.",
      ],
      en: [
        "The mode line in Settings now fits on a single line, in all three modes.",
        "The price-changes card in Study gains its finished wrapper, with its borders, and its chart now marks each step with its value and its date.",
      ],
    },
  },
  {
    version: "1.3.367",
    date: "2026-11-21",
    level: "grande",
    topic: "bitacora",
    title: { es: "La Bitácora: tu año, contado una vez", en: "The Logbook: your year, counted once" },
    points: {
      es: [
        "Folios gana un tercer cuarto: la [[Bitácora]]. Cada mes que cierra guarda ahí su foto, callada.",
        "Al cerrar el año, tus meses se encuadernan en [[Tu año en Faro]]: una serie de tarjetas con tus propios números, que Central anuncia una vez.",
        "La edición queda congelada tal como se contó: corregir el libro después no reescribe tu historia.",
      ],
      en: [
        "Folios gains a third room: the [[Logbook]]. Each month that closes quietly keeps its photo there.",
        "When the year closes, your months are bound into [[Your year in Faro]]: a series of cards with your own numbers, which Central announces once.",
        "The edition stays frozen exactly as counted: correcting the book later does not rewrite your history.",
      ],
    },
  },
  {
    version: "1.3.366",
    date: "2026-11-21",
    level: "grande",
    topic: "cambios-precio",
    title: { es: "El vigilante de fijos", en: "The fixed-charge watch" },
    points: {
      es: [
        "Si un cargo fijo — la renta, el internet, una suscripción — llega con un monto distinto al de siempre, el Asesor te lo dice una vez, con las dos anotaciones que lo prueban. El monto nuevo se vuelve el patrón desde ese momento.",
        "En Estudio, la carpeta Cambios de precio guarda la evidencia de los últimos 12 meses: qué cambió, de cuánto a cuánto y cuándo, ordenado por su efecto, con su gráfica de escalones.",
        "De los precios de tienda no hay aviso: solo entran a la evidencia cuando una compra salta 5% o más contra la anterior del mismo producto en la misma tienda.",
      ],
      en: [
        "If a fixed charge — rent, internet, a subscription — arrives at a different amount than usual, the Advisor tells you once, with the two entries that prove it. The new amount becomes the pattern from that moment on.",
        "In Study, the Price changes fold keeps the last 12 months of evidence: what changed, from how much to how much and when, ordered by its effect, with its step chart.",
        "There is no notice for store prices: they enter the evidence only when a purchase jumps 5% or more against the previous one of the same product at the same store.",
      ],
    },
  },
  {
    version: "1.3.365",
    date: "2026-11-21",
    level: "grande",
    topic: "saldo-proyectado",
    title: { es: "Tu saldo, día a día", en: "Your balance, day by day" },
    points: {
      es: [
        "El Asesor ahora camina tu saldo día a día hasta el fin del mes que viene, solo con lo que ya está comprometido: tus cuotas en su fecha, tus tarjetas con el pago del mes pasado y tus fijos de cada mes.",
        "El veredicto se lee sobre lo libre — tu saldo menos lo apartado — y si un día aprieta más que los demás, queda marcado en el camino. Toca una cifra y el camino se abre: cada evento con su fuente dicha.",
        "También puedes preguntarle: «¿llego al día 20?», «¿cómo llego a fin de mes?», «¿cuál es mi día más apretado?» — responde del mismo camino.",
      ],
      en: [
        "The Advisor now walks your balance day by day to the end of next month, with only what is already committed: your installments on their date, your cards at last month's payment and your every-month fixed charges.",
        "The verdict reads on the free balance — your balance minus what you set aside — and if one day squeezes tighter than the rest, it stays marked along the way. Tap a figure and the way opens: every event with its source stated.",
        "You can also ask it: “will I make it to day 20?”, “how do I get to the end of the month?”, “what's my tightest day?” — it answers from the same walk.",
      ],
    },
  },
  {
    version: "1.3.364",
    date: "2026-11-21",
    level: "menor",
    topic: "lista-espera",
    title: { es: "La lista de espera y los pagos automáticos, afinados", en: "The waiting list and automatic payments, tuned" },
    points: {
      es: [
        "La pregunta de la lista de espera ya no escribe nada en tu libro al aparecer: el Deshacer ahora alcanza todo, siempre, aunque la lista esté abierta.",
        "Si una serie despierta a mitad del día, su pago automático se asienta ese mismo día; y borrar una anotación vieja ya no apaga la instrucción de su serie: pasa a la anotación más nueva que quede.",
        "Los libros de versiones anteriores ya no anuncian como vencido un período que ya pagaste.",
      ],
      en: [
        "The waiting list's question no longer writes anything into your book when it appears: Undo now reaches everything, always, even while the list is open.",
        "If a series wakes up mid-day, its automatic payment settles that same day; and deleting an old note no longer switches off its series' instruction: it moves to the newest note that remains.",
        "Books from earlier versions no longer announce a period you already paid as overdue.",
      ],
    },
  },
  {
    version: "1.3.363",
    date: "2026-11-21",
    level: "menor",
    topic: "nombre",
    title: { es: "Tu nombre en Faro", en: "Your name in Faro" },
    points: {
      es: [
        "Faro ya puede nombrarte: el Asesor te habla por tu nombre al abrir su lectura, y la lista de espera también al preguntarte por un deseo vencido.",
        "El nombre vive en tu cuenta: ponlo, cámbialo o quítalo en Ajustes → Cuenta → «Cómo te nombra Faro». Sin nombre, Faro te habla como siempre.",
      ],
      en: [
        "Faro can now call you by name: the Advisor uses it as its reading opens, and the waiting list does too when it asks about a wish that came due.",
        "The name lives in your account: add it, change it or remove it in Settings → Account → “How Faro names you”. With no name, Faro speaks to you as it always has.",
      ],
    },
  },
  {
    version: "1.3.362",
    date: "2026-11-21",
    level: "grande",
    topic: "compartir",
    title: { es: "Compartir con Faro", en: "Sharing with Faro" },
    points: {
      es: [
        "Comparte un enlace de una tienda con Faro y elige su puerta: a la lista de espera, a un plan, anotarlo como compra o guardar la tienda — con lo leído ya puesto y la puerta sugerida marcada.",
        "El correo de una compra en línea se lee como recibo digital, sin foto y con su texto exacto; y una captura puede ser un producto, con el precio leído de la imagen cuando se ve.",
        "Al vencer la espera de un deseo con enlace, Faro mira su precio otra vez en la página y lo dice junto a la pregunta. La tasa del dólar también se trae sola al abrir, con su fuente y su fecha — la manual siempre manda.",
      ],
      en: [
        "Share a store link with Faro and choose its door: to the waiting list, to a plan, noted as a purchase, or save the store — with what was read already filled in and the suggested door marked.",
        "An online purchase's email reads as a digital receipt, no photo and with its exact text; and a screenshot can be a product, with the price read from the picture when it shows.",
        "When a linked wish's wait is up, Faro looks at its price again on the page and says it next to the question. The dollar rate also fetches itself on opening, with its source and date — the manual one always rules.",
      ],
    },
  },
  {
    version: "1.3.361",
    date: "2026-11-21",
    level: "menor",
    topic: "avisos-pagos",
    title: { es: "Pagos y mesa, juzgados con justicia", en: "Payments and the tray, judged fairly" },
    points: {
      es: [
        "El pago automático camina ahora todo su calendario: un vencimiento lejano ya no frena los que vienen después, y deshacer un asiento no lo vuelve a cobrar el mismo día.",
        "La tarjeta de pagos ya no anuncia como vencido lo que ya pagaste, la mesa distingue una corrección de un reemplazo hecho en otra parte, y el Asesor dice en cada modo hasta dónde llegan sus respuestas.",
      ],
      en: [
        "Autopay now walks its whole calendar: a far-off due date no longer stalls the ones after it, and undoing an entry does not charge it again the same day.",
        "The payments card no longer shows as overdue what you already paid, the review table tells a correction apart from a replacement made elsewhere, and the Advisor says in each mode how far its answers reach.",
      ],
    },
  },
  {
    version: "1.3.360",
    date: "2026-11-21",
    level: "grande",
    topic: "lista-espera",
    title: { es: "La lista de espera: el freno de impulso", en: "The waiting list: the impulse brake" },
    points: {
      es: [
        "¿Un gusto que todavía no decides comprar? Anótalo en la lista de espera del Asesor, con su precio y su tienda: espera 48 horas (el plazo se cambia en Ajustes) con su cuenta atrás a la vista.",
        "Mientras espera, su botón «¿Qué pasaría si lo compro?» corre el escenario sobre tu mes real. Al vencer el plazo, Faro te pregunta una vez si todavía lo quieres: comprarlo lo manda a la bandeja ya rellenado; dejarlo suma a lo que la espera te ahorró este año.",
      ],
      en: [
        "A treat you have not decided to buy? Note it on the Advisor's waiting list, with its price and store: it waits 48 hours (the time can be changed in Settings) with its countdown in view.",
        "While it waits, its “What if I buy it?” button runs the scenario over your real month. When the time is up, Faro asks once if you still want it: buying sends it to the tray already filled in; leaving it adds to what the wait saved you this year.",
      ],
    },
  },
  {
    version: "1.3.359",
    date: "2026-11-21",
    level: "menor",
    topic: "importar",
    title: { es: "El PDF de Faro vuelve a casa", en: "Faro's PDF comes home" },
    points: {
      es: [
        "El PDF que exportas de Faro ahora puede volver por Importar: Faro lo reconoce como suyo. Desde esta versión el PDF trae una copia de datos invisible, y cada línea regresa exacta, a su mes y a su casa.",
        "Los PDF exportados antes vuelven por lo impreso: mes, tipo, nombre y monto. Lo que el papel no guarda — el día exacto, la nota — cada fila lo declara en la revisión, sin inventar nada.",
      ],
      en: [
        "The PDF you export from Faro can now come back through Import: Faro recognizes it as its own. From this version on, the PDF carries an invisible data copy, and every line returns exact, to its month and its house.",
        "PDFs exported earlier return by the print: month, kind, name and amount. What paper does not keep — the exact day, the note — each row declares in the review, inventing nothing.",
      ],
    },
  },
  {
    version: "1.3.358",
    date: "2026-11-21",
    level: "menor",
    topic: "captura-mesa",
    title: { es: "La mesa juzga contra su foto", en: "The table judges against its photo" },
    points: {
      es: [
        "La mesa de revisión ahora compara contra la foto de cuando la abriste: si una fila cambió mientras tanto en otra pestaña, la mesa lo nombra — «Cambió mientras tanto: …» — y al guardar, la corrección más nueva manda en lo suyo y lo tuyo en lo tuyo. Nada se pisa en silencio.",
        "La ayuda de los botones + y − decía una cosa que no era: el de + abre el mismo selector que el de −, sin Escanear, porque Faro no escanea ingresos. El texto ya dice la verdad en los dos idiomas.",
      ],
      en: [
        "The review table now compares against the photo from when you opened it: if a row changed meanwhile in another tab, the table names it — “Changed meanwhile: …” — and on saving, the newest correction rules its fields and yours rule yours. Nothing is overwritten in silence.",
        "The help for the + and − buttons said something untrue: the + opens the same chooser as the −, without Scan, because Faro does not scan income. The text now tells the truth in both languages.",
      ],
    },
  },
  {
    version: "1.3.357",
    date: "2026-11-20",
    level: "grande",
    topic: "lista-plan",
    title: { es: "La lista-plan", en: "The plan list" },
    points: {
      es: [
        "La lista que escribes antes de comprar vive ahora como plan en tu bandeja (modo Ritmo): abre Lista, elige Planear, y sus filas nacen pendientes con el precio estimado de tus propios precios.",
        "En la tienda, un toque marca lo comprado con su monto real; «No había» y «Después» nombran lo que no se compró, y «Compré menos» parte la fila.",
        "Al cerrar, «A la mesa» lleva lo comprado a la mesa de siempre, lo que quedó elige destino, y la lista cerrada vive en el Archivo como folio: desde ahí se reanuda.",
      ],
      en: [
        "The list you write before shopping now lives as a plan in your tray (Rhythm mode): open List, choose Plan, and its rows are born pending with estimates from your own prices.",
        "In the store, one tap marks what you bought with its real amount; “Sold out” and “Later” name what you didn't buy, and “Got fewer” splits the row.",
        "On closing, “To review” takes what you bought to the usual table, what's left chooses where it goes, and the closed list lives in the Archive as a record: from there it resumes.",
      ],
    },
  },
  {
    version: "1.3.356",
    date: "2026-11-20",
    level: "grande",
    title: { es: "Avisos y pago automático", en: "Payment notices and autopay" },
    topic: "avisos-pagos",
    points: {
      es: [
        "Central avisa cuando un pago se acerca — tres días antes, o si ya venció — aunque el banco lo cobre automáticamente en línea; cada aviso es la puerta a ese pago, a tiempo de cambiar el monto, la fecha o la cuenta.",
        "Una cuota puede pagarse sola: enciende el pago automático en la cuota, elige la cuenta, y Faro anota el cargo en su fecha al abrir la app — y te lo dice.",
        "El aviso se apaga en Ajustes → Avisos de pagos; el pago automático se apaga en la propia cuota.",
      ],
      en: [
        "Central warns when a payment is coming up — three days ahead, or if it is already overdue — even if the bank charges it automatically online; each warning is the door to that payment, in time to change the amount, the date or the account.",
        "A cuota can pay itself: turn autopay on in the cuota, choose the account, and Faro books the charge on its date when you open the app — and tells you.",
        "The warning turns off in Settings → Payment notices; autopay turns off on the cuota itself.",
      ],
    },
  },
  {
    version: "1.3.355",
    date: "2026-11-20",
    level: "grande",
    title: { es: "El Asesor responde mucho más", en: "The Advisor answers much more" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Preguntar al Asesor aprendió la batería entera: cuánto tienes ahorrado y para gustos, lo último que entró, compraste o enviaste, las cuotas que vienen y sus fechas, cuánto gastaste en un período, una categoría o una tienda, quién te debe más, cuándo terminas de pagar tus deudas y dónde vive cada cosa en Faro — con su puerta.",
        "Si una pregunta necesita un dato que solo tú sabes — de cuál cuenta sacar un monto, con ahorros en varios bolsillos — el Asesor te pregunta de vuelta con chips antes de calcular. Y si tu premisa es falsa, te corrige primero con el dato real.",
      ],
      en: [
        "Ask the Advisor learned the whole battery: how much you have saved and for treats, the latest that came in, you bought or you sent, the dues coming up and their dates, how much you spent in a period, a category or a store, who owes you the most, when you finish paying your debts, and where each thing lives in Faro — with its door.",
        "If a question needs a fact only you know — which account a withdrawal should come from, with savings in several pockets — the Advisor asks back with chips before computing. And if your premise is false, it corrects you first with the real figure.",
      ],
    },
  },
  {
    version: "1.3.354",
    date: "2026-11-20",
    level: "grande",
    title: { es: "Novedades que saltan", en: "What's new, with doors" },
    topic: "novedades",
    points: {
      es: [
        "Las notas de Novedades ahora llevan su puerta: cuando una nota nombra un lugar de Faro, su «Ir allí» te lleva a esa función por la misma vía del Manual, y el atrás de tu teléfono te devuelve a Novedades.",
        "El pliegue guarda las diez notas más recientes — y una nota que aún no has visto nunca desaparece sin verse: se queda junto a las diez hasta que la veas.",
      ],
      en: [
        "What's new notes now carry their door: when a note names a place in Faro, its “Go there” takes you to that function by the Manual's own route, and your phone's back brings you back to What's new.",
        "The fold keeps the ten most recent notes — and a note you haven't seen yet never disappears unseen: it stays beside the ten until you see it.",
      ],
    },
  },
  {
    version: "1.3.353",
    date: "2026-11-20",
    level: "grande",
    topic: "atajos-mas-menos",
    title: { es: "Una sola selección", en: "One selection at a time" },
    points: {
      es: [
        "Los botones de Central muestran su selección: el +, el − y el de Pagos se encienden con el color de su ficha cuando su panel está abierto — y solo uno a la vez: abrir Pagos ya no se combina con lo que hubiera abierto.",
        "Pagos estrena selector: un toque abre Me deben, Debo, Cuotas y Préstamos, y te deja en esa parte de Cobros — como el + y el − con sus puertas.",
        "Escribir ya no te saca de la hoja: tocar Interpretar deja tu frase en la bandeja y te muestra el resultado, sin cerrar nada. Y «pesos» se entiende como córdobas: «200 pesos de caramelo» nace con su monto en córdobas.",
        "En el Asesor, tu pregunta queda en su propia tarjeta sobre la respuesta — la caja se vacía, el contexto no — y la siguiente pregunta la reemplaza. Y el botón «Ver en la presentación» de la búsqueda ya se lee en todos los temas.",
      ],
      en: [
        "Central's buttons now show their selection: the +, the − and the Payments button light up in their card's colour when their panel is open — and only one at a time: opening Payments no longer combines with whatever was open.",
        "Payments gets its own chooser: one tap opens Owed to me, I owe, Plans and Loans, and lands you on that part of Collections — like the + and the − with their doors.",
        "Write no longer throws you out of the sheet: tapping Interpret leaves your phrase in the tray and shows you the result, closing nothing. And “pesos” is understood as córdobas: “200 pesos de caramelo” is born with its amount in córdobas.",
        "In the Advisor, your question stays in its own card above the answer — the box empties, the context doesn't — and the next question replaces it. And the search's “See it in the presentation” button now reads well in every theme.",
      ],
    },
  },
  {
    version: "1.3.352",
    date: "2026-11-20",
    level: "menor",
    topic: "captura-mesa",
    title: { es: "La mesa dice su foto", en: "The table tells its photo" },
    points: {
      es: [
        "La mesa de revisión dice su foto: si una fila se resuelve en otra pestaña mientras revisas, la mesa la retira y lo nombra — «Ya no están en la bandeja: …» — en vez de guardarla a ciegas. Lo que escribiste en las filas vivas nunca se repone.",
        "Dos pestañas abiertas ya no se pisan: si ambas anuncian entradas sobre la misma revisión, Faro aparta el conflicto y conserva las dos entradas, para que decidas con calma.",
      ],
      en: [
        "The review table tells its photo: if a row is resolved in another tab while you review, the table removes it and names it — “No longer in the tray: …” — instead of saving it blind. What you typed in the live rows is never put back.",
        "Two open tabs no longer step on each other: if both announce entries over the same revision, Faro sets the conflict aside and keeps both entries, so you can decide calmly.",
      ],
    },
  },
  {
    version: "1.3.351",
    date: "2026-11-20",
    level: "grande",
    topic: "preguntar-asesor",
    title: { es: "El Asesor, en su sitio", en: "The Advisor, in its place" },
    points: {
      es: [
        "«Pregúntale a tu Asesor» vuelve debajo de «Palabras claras»: primero el consejo general, después tu pregunta — y su envoltorio luce ahora el material del héroe, con el resplandor de tu tema.",
        "«Palabras claras» estrena presentación: cada término vive en su propia pieza acabada, con su definición respirando — ya no es texto suelto.",
        "Las barras de búsqueda de Faro aprenden dos modales: al tocarlas, todo el texto queda seleccionado para escribir encima; y si quedan en reposo, se limpian solas tras 30 segundos.",
      ],
      en: [
        "“Ask your Advisor” returns below “Plain words”: the general counsel first, then your question — and its wrapper now wears the hero's material, with your theme's glow.",
        "“Plain words” gets a finished presentation: each term lives in its own finished piece, its definition breathing — no longer loose text.",
        "Faro's search bars learn two manners: tap one and all its text is selected, ready to type over; leave one resting and it clears itself after 30 seconds.",
      ],
    },
  },
  {
    version: "1.3.350",
    date: "2026-11-20",
    level: "grande",
    topic: "atajos-mas-menos",
    title: { es: "Las puertas de Central", en: "Central's doors" },
    points: {
      es: [
        "Toca el + o el − de Central y elige cómo anotar: Anotar, Escribir, Lista o Escanear — cada puerta abre directo en su modo.",
        "Los gestos de los botones aprenden las puertas: mantener, doble toque o deslizar el dedo puede abrir Escribir, Lista o Escanear sin pasos intermedios.",
        "Todo se asigna en Ajustes → Atajos de Central, con los botones de captura y el de Pagos bien separados; el botón de Pagos también acepta deslizar hacia Me Deben, Debo, Cuotas o Préstamos.",
      ],
      en: [
        "Tap Central's + or − and choose how to add: Note it, Write, List or Scan — each door opens straight into its mode.",
        "The buttons' gestures learn the doors: hold, double tap or swipe can open Write, List or Scan with no steps in between.",
        "Everything is assigned in Settings → Central shortcuts, with the capture buttons and the Pagos button kept well apart; the Pagos button also takes a swipe to Owed to me, I owe, Plans or Loans.",
      ],
    },
  },
  {
    version: "1.3.349",
    date: "2026-11-20",
    level: "menor",
    title: { es: "La fila que cabe", en: "The row that fits" },
    points: {
      es: [
        "Escribir, Lista y Escanear ya caben dentro de su caja en cualquier teléfono: su fila es completa y las pastillas nunca se salen.",
      ],
      en: [
        "Write, List and Scan now fit inside their box on any phone: the row is fully theirs and the pills never spill out.",
      ],
    },
  },
  {
    version: "1.3.348",
    date: "2026-11-20",
    level: "menor",
    topic: "preguntar-asesor",
    title: { es: "La caja que respira", en: "The box that breathes" },
    points: {
      es: [
        "La caja de Preguntar al Asesor crece con lo que escribes, para que veas tu pregunta entera.",
        "Al preguntar, la caja vuelve a su tamaño y tu pregunta queda en la respuesta.",
      ],
      en: [
        "The Ask your Advisor box grows as you write, so you can see your whole question.",
        "When you ask, the box returns to its size and your question lives in the answer.",
      ],
    },
  },
  {
    version: "1.3.347",
    date: "2026-11-20",
    level: "menor",
    topic: "captura-mesa",
    title: { es: "La mesa, contra lo vivo", en: "The table, against the live books" },
    points: {
      es: [
        "La mesa de revisión ahora guarda contra tus libros vivos: si corregiste algo en otro lugar con la mesa abierta, tu corrección ya no se pierde.",
        "La barra de listas en bache ahora cabe en cualquier teléfono, y los consejos del Manual cuentan la verdad entera: los borradores viajan con tu libro y las recompensas de un escaneo entran directas a su tarjeta.",
      ],
      en: [
        "The review table now saves against your live books: fix something elsewhere while the table is open, and your fix is never lost.",
        "The batch bar now fits any phone, and the Manual's tips tell the whole truth: drafts travel with your book, and a scan's rewards go straight onto their card.",
      ],
    },
  },
  {
    version: "1.3.346",
    date: "2026-11-20",
    level: "grande",
    topic: "novedades",
    title: { es: "Novedades y Acerca de", en: "What's new and About" },
    points: {
      es: [
        "Cada cambio importante de Faro llega ahora con su nota: la ves una vez al abrir, como esta, y después vive en Ajustes.",
        "En Ajustes → Novedades están las notas de las versiones recientes, para releerlas cuando quieras.",
        "Y el Acerca de cuenta qué es Faro y qué busca, con la versión al pie.",
      ],
      en: [
        "Every major change in Faro now arrives with its note: you see it once when you open the app, like this one, and then it lives in Settings.",
        "In Settings → What's new you'll find the notes of recent versions, to re-read whenever you like.",
        "And About tells what Faro is and what it seeks, with the version at its foot.",
      ],
    },
  },
  {
    version: "1.3.345",
    date: "2026-11-20",
    level: "grande",
    topic: "preguntar-asesor",
    title: { es: "Preguntar al Asesor", en: "Ask your Advisor" },
    points: {
      es: [
        "El Asesor responde preguntas en tus palabras: «¿puedo gastar $100 en zapatos?», «¿cuánto puedo sacar sin tocar mis ahorros?», «¿cuánto me queda?».",
        "Cada respuesta es un cálculo de tu libro, con sus piezas a la vista — Faro no inventa cifras.",
        "Si la respuesta es un gasto, «Registrarlo» lo deja en la bandeja para revisarlo.",
      ],
      en: [
        "Your Advisor answers questions in your own words: “can I spend $100 on shoes?”, “how much can I take out without touching my savings?”, “how much is left?”.",
        "Every answer is a calculation from your book, with its pieces in sight — Faro never makes numbers up.",
        "If the answer is a purchase, “Register it” leaves it in the tray for review.",
      ],
    },
  },
  {
    version: "1.3.344",
    date: "2026-11-20",
    level: "grande",
    title: { es: "La moneda invitada", en: "The guest currency" },
    points: {
      es: [
        "Toca dos veces la monedita y todo Faro se lee en otra moneda — euros, pesos, la que elijas entre 16 — sin tocar una sola línea de tu libro.",
        "Es solo lectura: tu dinero sigue viviendo en dólares y córdobas, y Faro siempre reabre en tu moneda oficial.",
      ],
      en: [
        "Double-tap the little coin and all of Faro reads in another currency — euros, pesos, your pick among 16 — without touching a single line of your book.",
        "It's read-only: your money keeps living in dollars and córdobas, and Faro always reopens in your official currency.",
      ],
    },
  },
  {
    version: "1.3.343",
    date: "2026-11-20",
    level: "menor",
    title: { es: "El Excel entra por la misma puerta", en: "Excel comes in the same door" },
    points: {
      es: [
        "El importador del banco lee también tus Excel: te muestra el mapa de columnas antes que las filas, y las filas de total quedan fuera, contadas en voz alta.",
      ],
      en: [
        "The bank importer also reads your Excel files: it shows you the column map before the rows, and total rows stay out, counted out loud.",
      ],
    },
  },
  {
    version: "1.3.342",
    date: "2026-11-20",
    level: "menor",
    title: { es: "Pegar una lista", en: "Paste a list" },
    points: {
      es: [
        "Pega la lista del día — una compra por línea, con monto o sin él — y Faro la reparte en borradores en la bandeja, para revisarlos en la mesa.",
      ],
      en: [
        "Paste the day's list — one purchase per line, amount or not — and Faro splits it into drafts in the tray, ready for the review table.",
      ],
    },
  },
  {
    version: "1.3.340",
    date: "2026-11-20",
    level: "grande",
    title: { es: "Escribir como pienso", en: "Write as I think" },
    points: {
      es: [
        "Escribe «pagué 200 de luz y 150 de agua» y Faro lo entiende: dos borradores en la bandeja, con sus dudas dichas.",
        "Lo que no entiende, lo pregunta en la mesa — nunca guarda en silencio.",
      ],
      en: [
        "Write “I paid 200 for power and 150 for water” and Faro understands: two drafts in the tray, with their doubts spoken.",
        "What it doesn't understand, it asks at the table — it never saves in silence.",
      ],
    },
  },
  {
    version: "1.3.339",
    date: "2026-11-20",
    level: "menor",
    title: { es: "La carpeta de Cuotas", en: "The Dues folder" },
    points: {
      es: [
        "Las cuotas archivadas tienen su carpeta en Debo, con su récord y el botón Mover para reactivarlas.",
      ],
      en: [
        "Archived dues have their own folder in Dues, with their record and the Move button to bring them back.",
      ],
    },
  },
  {
    version: "1.3.337",
    date: "2026-11-20",
    level: "menor",
    title: { es: "El lector gira el papel", en: "The reader turns the paper" },
    points: {
      es: [
        "Si la foto de un recibo sale de lado, el lector ahora gira el papel solo hasta leerlo.",
      ],
      en: [
        "If a receipt photo comes out sideways, the reader now turns the paper by itself until it reads.",
      ],
    },
  },
  {
    version: "1.3.331",
    date: "2026-11-19",
    level: "grande",
    title: { es: "La bandeja y la mesa", en: "The tray and the table" },
    points: {
      es: [
        "Todo lo que Faro captura — recibos escaneados y más — cae primero en la bandeja: una mesa de revisión donde cada duda trae su herramienta para corregirla.",
        "Nada entra a tu libro sin pasar por tus ojos.",
      ],
      en: [
        "Everything Faro captures — scanned receipts and more — lands first in the tray: a review table where every doubt carries its own tool to fix it.",
        "Nothing enters your book without passing your eyes.",
      ],
    },
  },
];

/** Compara dos versiones «1.3.345» por partes: -1, 0 o 1. */
export function cmpVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** Las notas que el usuario aún no ha visto: seen < versión ≤ current. */
export function newsBetween(seen: string, current: string): NewsEntry[] {
  return NEWS.filter((n) => cmpVersion(n.version, seen) > 0 && cmpVersion(n.version, current) <= 0);
}

/** El anuncio de la primera apertura: la nota GRANDE más nueva entre lo
 * no visto — una sola tarjeta, nunca una pila. Si solo hubo cambios
 * menores, silencio (null): viven en Ajustes. */
export function announcementFor(seen: string, current: string): NewsEntry | null {
  const fresh = newsBetween(seen, current);
  return fresh.find((n) => n.level === "grande") ?? null;
}

/** Cuántas notas recientes guarda el pliegue (1.3.354, Oscar). */
export const NEWS_KEEP = 10;

/** Las notas que el pliegue MUESTRA (1.3.354, Oscar): las NEWS_KEEP más
 * recientes, en su orden — MÁS cualquier nota que el usuario aún no ha
 * visto (su versión es mayor que la última vista en este teléfono):
 * una nota no vista nunca desaparece sin verse; convive junto a las
 * diez hasta que se ve. Sin marca de visto (seen null: instalación o
 * sin almacenamiento), el pliegue muestra las diez recientes. */
export function visibleNews(seen: string | null): NewsEntry[] {
  return NEWS.filter((n, i) => i < NEWS_KEEP || (seen != null && cmpVersion(n.version, seen) > 0));
}
