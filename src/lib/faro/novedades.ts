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
   * del anuncio no lleva puerta: las puertas viven en el pliegue.
   * OLA 31 (Familia 9): la nota que ANUNCIA una pregunta o una
   * función lleva su puerta como las de la .382/.383 — la de la
   * .403 anunciaba la pregunta nueva del Asesor sin topic y la de
   * la .400 hacía lo mismo con el «¿por qué?»: el mecanismo es uno,
   * y la cerca de modos-ola31 lo clava. */
  topic?: string;
}

/** De la más nueva a la más vieja — el orden de esta lista ES el orden
 * en que se leen en Ajustes. */
export const NEWS: NewsEntry[] = [
  {
    version: "1.3.424",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Tres rincones, con su envoltorio", en: "Three corners, wrapped" },
    points: {
      es: [
        "La Lista de espera ahora vive en su propia bandeja: el título y sus tarjetas ya no quedan sueltos sobre el fondo.",
        "En la vista del año, las filas de lo guardado y los meses respiran: ya no pegan contra los bordes de la tabla.",
        "El Saldo proyectado lleva su relleno: el texto ya no corre de borde a borde ni la última línea se corta.",
      ],
      en: [
        "The Waiting list now lives in its own tray: its title and cards no longer sit loose on the background.",
        "In the year view, the saved rows and the months breathe: they no longer hug the table's edges.",
        "The Projected balance carries its padding: the text no longer runs edge to edge nor clips its last line.",
      ],
    },
    topic: "lista-espera",
  },
  {
    version: "1.3.423",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El detalle de precio respira", en: "The price detail breathes" },
    points: {
      es: [
        "En el detalle de un cambio de precio, el efecto («más al mes») ya no se corta contra el borde: si no cabe, baja a su propia línea dentro de la tarjeta.",
        "La cabecera que nombra el lente en Central ahora viste el color de su ficha: «Tengo» con el acento, «Gastaré» con el frente y «Pagos» con el color de su semáforo.",
      ],
      en: [
        "In a price change's detail, the effect (“more per month”) no longer clips against the edge: if it does not fit, it drops to its own line inside the card.",
        "The header naming the lens on Central now wears its tile's color: “Have” in the accent, “Will spend” in the foreground and “Payments” in its semaphore color.",
      ],
    },
    topic: "cambios-precio",
  },
  {
    version: "1.3.422",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La guía es tuya", en: "The guide is yours" },
    points: {
      es: [
        "La regla 50 · 30 · 20 ya no es fija: en su tarjeta de Estudio tocas «Ajustar mi guía» y repartes tus propios porcentajes.",
        "El título, las rayitas y los veredictos de la tarjeta — y la respuesta del Asesor — se recalculan con tu guía.",
        "Con «Volver a la clásica» regresas al 50 · 30 · 20 cuando quieras.",
      ],
      en: [
        "The 50 · 30 · 20 rule is no longer fixed: on its Study card you tap \"Adjust my guide\" and split your own percentages.",
        "The card's title, ticks and verdicts — and the Advisor's answer — recalculate with your guide.",
        "\"Back to the classic\" returns you to 50 · 30 · 20 whenever you want.",
      ],
    },
    topic: "regla-50-30-20",
  },
  {
    version: "1.3.421",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Lo desplegado lleva su nombre", en: "What opens carries its name" },
    points: {
      es: [
        "La lista de un lente se abre con su nombre por cabecera: Tengo, Gastaré o Pagos.",
        "La vista de un bolsillo de Ahorros se encabeza con el nombre del bolsillo, no con su clase.",
      ],
      en: [
        "A lens's list now opens with its name as the header: Have, Spending or Payments.",
        "A savings pocket's view is headed by the pocket's own name, not its kind.",
      ],
    },
    topic: "lentes",
  },
  {
    version: "1.3.420",
    date: "2026-11-22",
    level: "grande",
    title: { es: "El Manual, con forma nueva y su primera figura", en: "The Manual, in a new form with its first figure" },
    points: {
      es: [
        "Cada tema del Manual se abre ahora con su tarjeta de cabecera — su número en placa, su capítulo y su título — y cada parte (Qué es, Cómo, Consejo) vive en su propia bandeja, con su ícono y la línea dorada tras su nombre.",
        "La idea clave de un tema gana su tarjeta ✦, los ejemplos de la casa salen de en medio del párrafo a su propio asiento, y cada renglón de una enumeración lleva su tarjetita con su título en negritas.",
        "Y el Manual dibuja por primera vez: el tema «La salud de tu dinero» trae tu nota en su escala, con las barras de cada parte sumando tu nota y el nombre de donde más te falta — con los números de tu libro, no una ilustración.",
      ],
      en: [
        "Every Manual topic now opens with its own head card — its number on a plate, its chapter and its title — and each part (What it is, How, Tip) lives in its own tray, with its icon and the golden line fading after its name.",
        "A topic's key idea gains its ✦ card, the house examples step out of the middle of the paragraph into their own seat, and every row of a list carries its little card with its title in bold.",
        "And the Manual draws for the first time: the topic \"Your money's health\" brings your grade on its scale, with each part's bars adding up to your grade and the name of where you have most to gain — with your book's numbers, not an illustration.",
      ],
    },
    topic: "salud",
  },
  {
    version: "1.3.419",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Remesas más certeras, salidas verificadas", en: "Truer remittance answers, verified exits" },
    points: {
      es: [
        "El Asesor entiende mejor tus preguntas de remesas: «esta quincena», «en agosto», «a Al en octubre» — la persona y el período ya no se confunden, y cuando un nombre no está en tu libro lo dice sin inventar cifras.",
        "Al salir de un libro compartido, el registro de tu tiempo en él solo se anuncia cuando de verdad quedó guardado; y el empalme del servidor ahora juzga cada línea que guarda, como la puerta de la app.",
        "Las novedades de la 1.3.400 y la 1.3.403 ya llevan su puerta: tocan y abren el tema del Asesor en el Manual.",
      ],
      en: [
        "The Advisor reads your remittance questions better: \"this pay period\", \"in August\", \"to Al in October\" — the person and the period no longer blur, and when a name is not in your book it says so without inventing figures.",
        "When you leave a shared book, the record of your time in it is only announced once it truly landed; and the server's splice now judges every line it stores, just like the app's own gate.",
        "The 1.3.400 and 1.3.403 news entries now carry their door: tap them and they open the Advisor's topic in the Manual.",
      ],
    },
    topic: "preguntar-asesor",
  },
  {
    version: "1.3.418",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El botón de añadir, a su medida", en: "The add button, at its right size" },
    points: {
      es: [
        "El botón «+ Añadir» de «Preguntas a la mano» baja a su medida: menos relleno, la palabra y el signo más pequeños.",
        "Con el ancho que el botón suelta, muchas preguntas del catálogo ahora caben en una sola línea y cada tarjeta se ordena mejor.",
      ],
      en: [
        "The \"+ Add\" button in \"Questions at hand\" comes down to its right size: less padding, the word and the plus sign smaller.",
        "With the width the button gives back, many catalog questions now fit on a single line and each card arranges itself better.",
      ],
    },
    topic: "preguntas-a-la-mano",
  },
  {
    version: "1.3.417",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Cada cambio de precio, en su tarjetita", en: "Each price change, in its own little card" },
    points: {
      es: [
        "En «Cambios de precio», la lista de cambios ya no es texto suelto: cada cambio lleva su propia tarjetita, con su borde y su superficie.",
        "Las tarjetitas permanecen apagadas — atenuadas — hasta que tocas una: la elegida se enciende con el acento del tema, a juego con su detalle y su escalón en la escalera.",
      ],
      en: [
        "In \"Price changes\", the list of changes is no longer loose text: each change carries its own little card, with its border and its surface.",
        "The little cards stay dimmed until you tap one: the chosen one lights up with the theme's accent, matching its detail and its step on the staircase.",
      ],
    },
    topic: "cambios-precio",
  },
  {
    version: "1.3.416",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El catálogo de preguntas, en tarjetas", en: "The question catalog, in cards" },
    points: {
      es: [
        "En «Preguntas a la mano», el catálogo de sugerencias deja la lista interminable: ahora vive en tarjetas por territorio — tu mes, tus movimientos, tus cuotas y deudas — con títulos cortos y su conteo a la vista.",
        "Las tarjetas llegan cerradas y se abre una a la vez: eliges el territorio, ves sus preguntas y añades las tuyas a un toque, como siempre.",
      ],
      en: [
        "In \"Questions at hand\", the suggestions catalog leaves the endless list behind: it now lives in cards by territory — your month, your movements, your dues and debts — with short titles and their count in view.",
        "The cards arrive closed and only one opens at a time: you pick the territory, see its questions and add yours in one tap, as always.",
      ],
    },
    topic: "preguntas-a-la-mano",
  },
  {
    version: "1.3.412",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Lo que sé hacer, en tarjetas", en: "What I can do, in cards" },
    points: {
      es: [
        "La respuesta a «¿Qué puede hacer el asesor?» deja la lista interminable: cada territorio — tu mes, tus movimientos, tus cuotas y deudas — es ahora una tarjeta que se abre al tocarla.",
        "Las tarjetas llegan cerradas y se abre una a la vez: lees el mapa de un vistazo y abres solo lo que te interesa.",
        "El texto es el mismo de siempre, generado de lo que el Asesor sabe hacer en el momento — cambia la forma, no la honestidad.",
      ],
      en: [
        "The answer to \"What can the Advisor do?\" leaves the endless list behind: each territory — your month, your movements, your dues and debts — is now a card that opens when tapped.",
        "The cards arrive closed and only one opens at a time: you read the map at a glance and open only what interests you.",
        "The text is the same as always, generated from what the Advisor can do at that moment — the form changes, not the honesty.",
      ],
    },
    topic: "preguntar-asesor",
  },
  {
    version: "1.3.411",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La escalera de precios, con su detalle", en: "The price staircase, with its detail" },
    points: {
      es: [
        "En Estudio, «Cambios de precio» estrena su acabado: la escalera vive en su bandeja, con el tramo del cambio elegido encendido.",
        "Bajo la escalera, una tarjeta de detalle responde por el cambio: de cuánto a cuánto, qué suma o resta al mes y cuánto lleva a ese precio.",
        "Y la selección es de doble vía: tocar el renglón de la lista o el escalón mismo en la escalera es el mismo toque.",
      ],
      en: [
        "In Study, \"Price changes\" gets its finish: the staircase lives in its tray, with the chosen change's stretch lit.",
        "Under the staircase, a detail card answers for the change: from how much to how much, what it adds or takes per month, and how long it has sat at that price.",
        "And the selection runs both ways: tapping the row in the list or the step itself on the staircase is the same tap.",
      ],
    },
    topic: "cambios-precio",
  },
  {
    version: "1.3.410",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El aviso de cierre te lleva a su mes", en: "The close notice takes you to its month" },
    points: {
      es: [
        "Tocar el aviso de cierre de un mes ya no te deja en la puerta de Estudio: Faro abre puesto en ese mes, con «Entra, sale y queda» abierto en él — su Entró, su Salió y su Quedó a la vista.",
        "El aviso nombra un mes, y ahora el toque llega a ese mes.",
        "Y dos retoques de la ola pasada: en el teléfono, las tarjetas de dónde vive el dinero de un fondo van una sobre la otra, a todo el ancho — lado a lado queda para la tableta —; y el botón principal de las ventanas de confirmación ya no lleva el marco blanco que el navegador le ponía alrededor.",
      ],
      en: [
        "Tapping a month's close notice no longer leaves you at the door of Stats: Faro opens set on that month, with \"In, out and left\" open on it — its In, its Out and its Left in view.",
        "The notice names a month, and now the tap arrives at that month.",
        "And two touches from the last wave: on the phone, the cards for where a fund's money lives now stack one above the other, full width — side by side is for the tablet —; and the confirmation windows' main button no longer wears the white frame the browser put around it.",
      ],
    },
    topic: "avisos-app",
  },
  {
    version: "1.3.409",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Las cajas del fondo, más bajas; los formularios, con relieve", en: "The fund boxes, lower; the forms, with relief" },
    points: {
      es: [
        "En la pregunta de dónde vive el dinero de un fondo, la lucecita de cada tarjeta ya no ocupa su propio renglón: se achica y vive en la misma línea del título — «Parte de mi saldo» y «Dinero aparte» se leen de una vez, y las cajas quedan más bajas.",
        "Los formularios de añadir y editar dejan de verse planos: el panel se asienta como una bandeja y cada campo se hunde en él con su sombra, como las demás superficies de la casa.",
        "Y esta misma ventana ya no se estira fuera de la pantalla cuando una novedad es larga: guarda sus límites y el texto se desliza por dentro.",
        "La ventana de confirmación — la de «¿Salir de Faro?» y sus hermanas — compone mejor: su texto se centra y sus dos botones llenan la fila, sin dejar la derecha hueca.",
      ],
      en: [
        "In the question of where a fund's money lives, each card's little light no longer takes a line of its own: it shrinks and lives on the title's line — \"Part of my balance\" and \"Money set aside\" read at a glance, and the boxes sit lower.",
        "The add and edit forms no longer look flat: the panel settles in like a tray and each field sinks into it with its shadow, like the house's other surfaces.",
        "And this very window no longer stretches off the screen when an announcement runs long: it keeps its bounds and the text scrolls inside.",
        "The confirmation window — the \"Leave Faro?\" one and its sisters — composes better: its text centres and its two buttons fill the row, leaving no hollow on the right.",
      ],
    },
    topic: "donde-vive",
  },
  {
    version: "1.3.408",
    date: "2026-11-22",
    level: "grande",
    title: { es: "La cámara del widget, y widgets que no prometen de más", en: "The widget camera, and widgets that promise nothing extra" },
    points: {
      es: [
        "El widget gana un tercer botón junto a + y −: la cámara. Abre la cámara del teléfono, la foto entra como un recibo y cae en la revisión de siempre — verificas, corriges, eliges la categoría y pones la nota antes de guardar. Llega con la próxima actualización de la app.",
        "El widget ya no esconde nada: «Próximo pago» nombra el pago vencido, en su color, en vez de decir «Nada en 31 días»; si un pago pasa de «vence pronto» a vencido, vuelve a avisar — cada etapa avisa la suya —; y el cierre de un mes ya no se pierde si te saltas un cambio de mes sin abrir Faro: al volver, se reporta.",
        "La cara honesta: el widget del teléfono ahora dice a qué hora llegó su foto, como el Panel y el de Vencimientos; en el selector del teléfono, las vistas previas ya no inventan cifras — enseñan la cara de montos ocultos —; y la tarjeta rápida ya lee bien la coma decimal: «68,26» se anota como $68.26, no cien veces más.",
        "La lucecita de tus fondos se achica un poco y se pega a la palabra, como un signo de grado; el lápiz también se achica y queda alineado con ella, un escalón abajo. En las píldoras de los bolsillos la luz se separa un poco y sube, y las letras de los nombres crecen un poco, con aire.",
      ],
      en: [
        "The widget gains a third button beside + and −: the camera. It opens the phone's camera, the photo comes in as a receipt and lands in the usual review — you check it, fix it, pick the category and add the note before saving. It arrives with the next app update.",
        "The widget hides nothing now: \"Next payment\" names the overdue payment, in its colour, instead of reading \"Nothing in 31 days\"; if a payment moves from \"due soon\" to overdue, it announces again — each stage announces its own —; and a month's close is no longer lost if you skip a month turn without opening Faro: when you return, it is reported.",
        "The honest face: the phone widget now says when its photo arrived, like the Panel and the Due dates widget; in the phone's widget picker, the previews no longer invent figures — they show the hidden-amounts face —; and the quick card now reads the decimal comma right: \"68,26\" is noted as $68.26, not a hundred times more.",
        "Your funds' little light shrinks a bit and hugs the word, like a degree sign; the pencil shrinks too and lines up with it, one step below. On the pocket pills the light moves a little away and rises, and the names' letters grow a bit, with room to breathe.",
      ],
    },
    topic: "widget-android",
  },
  {
    version: "1.3.407",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La luz, como un grado", en: "The light, like a degree sign" },
    points: {
      es: [
        "La lucecita de color que dice dónde vive cada bolsa ya no flota a media palabra, apretada contra el lápiz: sube a la esquina de arriba de la palabra, como el signo de grado, y el lápiz se queda con el asiento de abajo — la fila se balancea.",
        "Las píldoras de los bolsillos llevan la luz en el mismo asiento nuevo, junto a su nombre.",
      ],
      en: [
        "The small coloured light that says where each pocket lives no longer floats mid-word, crowded against the pencil: it rises to the word's top corner, like a degree sign, and the pencil keeps the lower seat — the row balances.",
        "The pocket pills wear the light in the same new seat, beside their name.",
      ],
    },
  },
  {
    version: "1.3.406",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La pantalla sube a enseñar", en: "The screen rises to show you" },
    points: {
      es: [
        "Tocar una ficha de Central — Tengo, Gastaré o Pagos — ahora sube la pantalla a enseñarte su lista, como ya hacían las bolsas de Ahorros. También suben la lista de cuentas al abrirla, el editor de cada cuenta y el panel de retiro.",
        "El botoncito para volver arriba aparece antes: a media pantalla de bajada, no casi al fondo.",
        "El panel de retiro de una cuenta vive ahora en su bandeja, con su explicación separada por un filete, y la ventana del color de la burbuja ocupa el ancho entero de su fila.",
      ],
      en: [
        "Tapping a Central tile — I have, I'll spend or Payments — now raises the screen to show you its list, just as the savings pockets already did. The accounts list rising to meet you, each account's editor and the retirement panel rise too.",
        "The back-to-top button appears sooner: halfway down the screen, not near the bottom.",
        "An account's retirement panel now lives in its own tray, with its explanation set off by a rule, and the bubble colour window spans the full width of its row.",
      ],
    },
  },
  {
    version: "1.3.405",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Me deben, con el acabado de su lugar", en: "Owed to me, finished like its place" },
    points: {
      es: [
        "La tarjeta de cada persona en Me deben respira: tiene aire a los dos lados y una superficie propia con el color de su lugar — ya no queda cortada contra el borde de su grupo, y en Cyberpunk ya no se pinta del panel café de ese tema.",
        "La pregunta fija del Asesor se llama ahora «¿Qué puede hacer el asesor?», sin ambigüedad — en la ficha de Preguntas a la mano y cuando la escribes tú mismo.",
      ],
      en: [
        "Each person's card in Owed to me breathes: it has air on both sides and a surface of its own in its place's color — it no longer sits cut against its group's edge, and in Cyberpunk it no longer wears that theme's brown panel.",
        "The Advisor's fixed question is now “What can the Advisor do?”, with no ambiguity — on the At-hand questions chip and when you type it yourself.",
      ],
    },
  },
  {
    version: "1.3.404",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Debo, con acabado", en: "I owe, finished" },
    points: {
      es: [
        "La tarjeta de cada préstamo deja el gris que no era de ningún tema: su base y su borde nacen ahora del color de tu tema, como el resto de la casa.",
        "Los hechos del préstamo (lo recibido, el interés, el día de pago, cuándo quedas libre) ya no flotan sueltos: viven ordenados en su bandeja, fila por fila.",
        "El Plan de pago gana un color amigo de base — el de tu tema — y sus tres cifras y su explicación se sientan en bandejas propias: ya no se ve plano.",
      ],
      en: [
        "Each loan's card drops the grey that belonged to no theme: its base and border now come from your theme's color, like the rest of the house.",
        "The loan's facts (what you received, the interest, the payment day, when you're free) no longer float loose: they live in order in their own tray, row by row.",
        "The Payoff plan gains a friendly base color — your theme's — and its three figures and its explanation sit in trays of their own: it no longer looks flat.",
      ],
    },
  },
  {
    version: "1.3.403",
    date: "2026-11-22",
    level: "menor",
    topic: "preguntar-asesor",
    title: { es: "El Asesor oye las remesas por período", en: "The Advisor hears remittances by period" },
    points: {
      es: [
        "Nueva pregunta viva en el Asesor: «¿Cuánto mandé esta semana?» — y este mes, el mes pasado, la semana pasada o una quincena — responde con la cifra de ese período, en los tres modos.",
        "Si nombras a la persona y el período («¿cuánto le mandé a Rosa este mes?»), la suma es de esa persona en ese período; y si la frase no deja claro a quién, el Asesor lo dice en vez de darte la remesa de todos disfrazada.",
        "La fusión de libros compartidos y los registros guardados al salir de un libro compartido juzgan ahora su contenido con la misma vara que el resto del libro: nada entra a pedazos.",
      ],
      en: [
        "A new live question in the Advisor: “How much did I send this week?” — or this month, last month, last week or a fortnight — answered with that period's figure, in all three modes.",
        "If you name the person and the period (“how much did I send Rosa this month?”), the sum is that person's within that period; and if the phrasing leaves the person unclear, the Advisor says so instead of handing you everyone's remittance in disguise.",
        "Shared-book merging and the records kept when leaving a shared book now judge their content by the same measure as the rest of the book: nothing gets in piecemeal.",
      ],
    },
  },
  {
    version: "1.3.402",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Central, directa y con aire", en: "Central, direct and with room" },
    points: {
      es: [
        "El botón de Pagos abre Cobros directo: la pantalla intermedia que preguntaba a qué parte ir ya no está — las cuatro partes se ven dentro de Cobros, más sencillo.",
        "Al abrir el selector, el editor o Cobros desde las fichas de Tengo, Gastaré y Pagos, la pantalla sube y la hoja se despliega desde arriba, no desde el medio.",
        "La tarjeta «Pagos que se acercan» ahora se pliega: cerrada muestra solo el resumen — cuántos pagos vencieron y cuántos vienen — y el detalle aparece al desplegarla. Central gana espacio.",
        "La primera puerta del selector cambió de ícono: una hoja con renglones, para no confundirla con Escribir.",
      ],
      en: [
        "The Payments button now opens Collections directly: the in-between screen that asked which part you wanted is gone — the four parts are right there in Collections, simpler.",
        "Opening the chooser, the editor or Collections from the Have, Spending and Payments tiles, the screen rises and the sheet unfolds from the top, not from the middle.",
        "The “Payments coming up” card now folds: closed it shows only the summary — how many payments are overdue and how many are coming — and the detail appears when you unfold it. Central gains room.",
        "The chooser's first door has a new icon: a sheet with rows, so it is no longer confused with Write.",
      ],
    },
  },
  {
    version: "1.3.401",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Las novedades pasan suaves", en: "The news cards glide now" },
    points: {
      es: ["Al pasar de una tarjeta de novedades a la otra, el contenido entra suave desde el lado hacia el que vas — sin el parpadeo de antes."],
      en: ["Moving from one news card to the next, the content now glides in from the side you're heading to — no more flicker."],
    },
  },
  {
    version: "1.3.400",
    date: "2026-11-22",
    level: "grande",
    topic: "preguntar-asesor",
    title: { es: "El Asesor recuerda la conversación", en: "The Advisor remembers the conversation" },
    points: {
      es: [
        "Cada respuesta del Asesor nace ahora con su marco: pregúntale «¿y el mes pasado?» o «¿y Ana?» y cambia solo ese eje, diciéndote qué cambió. Y si le preguntas «¿por qué?», te enseña la cuenta anterior pieza por pieza, con su fuente.",
        "Si una cuenta pide un dato que tu libro no guarda — tu patrimonio entero, tu puntaje de crédito — el Asesor cuenta la parte que sí puede y nombra el dato que falta, en vez de inventar una cifra.",
        "Las suscripciones se miden contra sí mismas: una subida se compara con la mediana de la propia serie, la cuota que no llegó se reporta como ausencia en tu libro, y el costo al año dice su ritmo. La quincena (del 1 al 15 y del 16 al fin) es ya un período con nombre propio, y el oído entiende el voseo, los diminutivos y los verbos con su «lo» pegado.",
      ],
      en: [
        "Every Advisor answer is now born with its frame: ask “and last month?” or “and Ana?” and it changes only that axis, telling you what changed. And if you ask “why?”, it shows you the previous reckoning piece by piece, with its source.",
        "If a reckoning needs a datum your book doesn't hold — your whole net worth, your credit score — the Advisor counts the part it can and names the missing datum, instead of inventing a figure.",
        "Subscriptions are measured against themselves: a rise is compared with the series' own median, a charge that didn't arrive is reported as an absence in your book, and the yearly cost states its pace. The pay period (the 1st–15th and the 16th–end) is now a period with its own name, and the ear understands voseo, diminutives and verbs with their clitics attached.",
      ],
    },
  },
  {
    version: "1.3.399",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La Cura de la Ola 29, integrada", en: "The Wave 29 Cure, integrated" },
    points: {
      es: [
        "El Asesor sigue la conversación de remesas con el idioma entero: «al doctor Pérez» y «para la niña Rosa» ya nombran a su persona, y cuando una negativa nombra a alguien, nombra a la persona de verdad.",
        "Las lápidas del libro compartido se juzgan ahora con un solo juez en la puerta, en el lector y en el escritor — una fecha imposible ya no pasa — y la unión compara instantes, no textos. Las cercas del banco de preguntas barren ahora los 12 chips y el mapa entero por el turno real.",
      ],
      en: [
        "The Advisor now follows remittance talk in the full language: “al doctor Pérez” and “para la niña Rosa” name their person, and when a refusal names someone, it names the real person.",
        "Shared-book tombstones are now judged by one judge at the gate, in the reader and in the writer — an impossible date no longer passes — and fusion compares instants, not text. The question-bank fences now sweep all 12 chips and the whole map through the real turn.",
      ],
    },
  },
  {
    version: "1.3.398",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Salir de un libro compartido, con serenidad", en: "Leaving a shared book, calmly" },
    points: {
      es: [
        "En «Compartidos conmigo», salir no pide razones: tu acceso termina, la copia se retira de tu teléfono y lo que anotaste queda en el libro, con tu firma.",
        "Al salir eliges qué hacer con tu copia: guardarla como registro en tu Archivo — historia que se lee, no toca ninguna cuenta y se borra cuando quieras sin tocar el libro de su dueño —, exportarla como archivo, o no llevarte nada. Y si te ofrecen un libro en traspaso, aceptarlo también vive ahí; ofrecerlo vive en la mesa del dueño.",
      ],
      en: [
        "Under “Shared with me”, leaving asks for no reasons: your access ends, the copy is withdrawn from your phone and what you noted stays in the book, with your signature.",
        "When you leave you choose what to do with your copy: keep it as a record in your Archive — history that reads, touches no account and can be deleted whenever you like without touching its owner's book —, export it as a file, or take nothing. And if a book is offered to you in transfer, accepting it lives there too; offering it lives on the owner's mesa.",
      ],
    },
  },
  {
    version: "1.3.397",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido se abre: tu mundo, y solo tu mundo", en: "The shared book opens: your world, and only your world" },
    points: {
      es: [
        "En Ajustes → El libro compartido, «Compartidos conmigo» abre los libros donde eres miembro: ves solo tu alcance — la copia se recorta en el servidor y otra vez en tu teléfono antes de enseñar una línea.",
        "Al tocar una cifra ves su composición: qué líneas la forman, quién las anotó y de quién fue el dinero, con las declaraciones marcadas como lo que son. Aceptar una invitación pide su código; el enlace solo no es una llave.",
      ],
      en: [
        "In Settings → The shared book, “Shared with me” opens the books where you are a member: you see only your scope — the copy is trimmed on the server and again on your phone before a single line is shown.",
        "Tapping a figure shows its composition: which lines form it, who noted them and whose money it was, with declarations marked as what they are. Accepting an invitation asks for its code; the link alone is not a key.",
      ],
    },
  },
  {
    version: "1.3.396",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido: el dinero de cada área", en: "The shared book: each area's money" },
    points: {
      es: [
        "Cada área del libro compartido tiene quién la financia: tú desde tus cuentas, o una persona del libro con su dinero. La vista previa de la invitación ahora lo dice área por área, leyendo ese mapa.",
        "La línea pagada por un invitado nace marcada como dinero suyo y no mueve tus cuentas; en su propio libro queda su reflejo, contado una sola vez. Y un pago suelto suyo en un área tuya entra como lo que es: una declaración firmada, nunca un hecho verificado.",
      ],
      en: [
        "Each area of the shared book has its funder: you from your accounts, or a person in the book with their money. The invitation preview now says so area by area, reading that map.",
        "A line paid by a guest is born marked as their money and moves none of your accounts; in their own book its reflection stays, counted once. And a one-off payment of theirs in one of your areas enters as what it is: a signed declaration, never a verified fact.",
      ],
    },
  },
  {
    version: "1.3.395",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido: la mesa de invitación", en: "The shared book: the invitation mesa" },
    points: {
      es: [
        "En Ajustes → El libro compartido puedes invitar a alguien a tu libro: eliges quién, qué verá y si puede anotar o solo mirar, en el orden que quieras.",
        "Ninguna invitación sale sin la vista previa por los ojos del otro: qué verá, qué podrá hacer, qué no verá y quién financia cada área. Y en «Quiénes están en este libro» queda tu «qué compartí», verificable cuando quieras.",
      ],
      en: [
        "In Settings → The shared book you can invite someone to your book: you choose who, what they will see, and whether they can note or only look, in any order you like.",
        "No invitation leaves without the preview through the other person's eyes: what they will see, what they can do, what they will not see and who funds each area. And in “Who is in this book” your “what I shared” stays, checkable whenever you like.",
      ],
    },
  },
  {
    version: "1.3.394",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La Cura de la Ola 28, integrada", en: "The Wave 28 Cure, integrated" },
    points: {
      es: [
        "El Asesor resuelve a las personas con una sola ley: ya no confunde a una persona con otra de nombre parecido, ni responde de alguien cuando le preguntan por un desconocido.",
        "Las preguntas del banco pasan ahora por el turno real de conversación, y las formas aprendidas de avisos agrupan mejor: menos borradores repetidos por la misma compra.",
      ],
      en: [
        "The Advisor resolves people under one law: it no longer confuses one person with a similar-named other, nor answers about someone when asked about a stranger.",
        "The bank's questions now run through the real conversation turn, and learned notice shapes group better: fewer duplicate drafts for the same purchase.",
      ],
    },
  },
  {
    version: "1.3.393",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido: las firmas", en: "The shared book: signatures" },
    points: {
      es: [
        "Cuarta pieza del cimiento: cada línea de un libro compartido podrá decir quién la anotó, con el nombre que esa persona tenía al anotar — renombrarse después no reescribe ninguna firma.",
        "Lo que Faro anota solo firma «Faro», y la firma se ve igual en las líneas, en el Historial y en la actividad: discreta, en el color del tema, sin competir con la cifra.",
      ],
      en: [
        "Fourth piece of the foundation: every line in a shared book will be able to say who noted it, with the name that person had when noting — renaming later rewrites no signature.",
        "What Faro notes on its own signs «Faro», and the signature looks the same on lines, in History and in activity: quiet, in the theme's colour, never competing with the figure.",
      ],
    },
  },
  {
    version: "1.3.392",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido: dos personas, un solo libro", en: "The shared book: two people, one book" },
    points: {
      es: [
        "Tercera pieza del cimiento: ya existe el motor que compone lo que dos personas anotan a la vez en el mismo libro — sin duplicados, y lo borrado no resucita desde ningún teléfono.",
        "Si los dos tocan la misma línea, se compone campo a campo; la estructura sigue ganando por revisión, con la puerta de conflicto de siempre si hiciera falta.",
      ],
      en: [
        "Third piece of the foundation: the engine now exists that composes what two people note at the same time in the same book — no duplicates, and what is deleted never comes back from any phone.",
        "If both touch the same line, it composes field by field; structure still wins by revision, with the usual conflict door if it is ever needed.",
      ],
    },
  },
  {
    version: "1.3.391",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El libro compartido: el alcance se cumple en el servidor", en: "The shared book: scope is enforced on the server" },
    points: {
      es: [
        "Segunda pieza del cimiento: quien comparta solo algunas categorías, su invitado recibirá del servidor únicamente esas líneas — las demás nunca salen del servidor, ni sus categorías ni sus tiendas.",
        "Y hay cosas que no viajan nunca, ni compartiendo el libro entero: tus ajustes, tu auditoría y tu bandeja son de tu cuenta, no del libro.",
      ],
      en: [
        "Second piece of the foundation: if you share only some categories, your guest will receive only those lines from the server — the rest never leaves the server, nor their categories or stores.",
        "And some things never travel, not even when sharing the whole book: your settings, your audit and your tray belong to your account, not to the book.",
      ],
    },
  },
  {
    version: "1.3.390",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Los cimientos del libro compartido", en: "The shared book's foundation" },
    points: {
      es: [
        "El libro compartido empieza por su base: la membresía ya puede vivir en el servidor — invitar a una cuenta, aceptar, salir, remover y pasar la batuta, con su vencimiento de 30 días y su tope de 10 personas.",
        "Todavía no hay botones nuevos: la mesa de invitación, con su previa, es la siguiente pieza. Esto es el cimiento, puesto y verificado.",
      ],
      en: [
        "The shared book starts with its base: membership can now live on the server — invite an account, accept, leave, remove and hand over the book, with its 30-day expiry and its 10-people cap.",
        "No new buttons yet: the invitation desk, with its preview, is the next piece. This is the foundation, laid and verified.",
      ],
    },
  },
  {
    version: "1.3.389",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El Asesor, más justo con tus palabras", en: "The Advisor, fairer with your words" },
    points: {
      es: [
        "Si preguntas cuánto le mandaste a una persona, el Asesor suma los envíos de esa persona — y si el nombre no está en tu libro, lo dice en vez de darte la remesa de otro.",
        "Tus palabras aprendidas ahora también sirven al seguir una respuesta («¿y solo en…?»), y olvidar o aprender una palabra ya no puede pisar otra aprendida después.",
        "La descripción de lo que el Asesor sabe hacer ya cuenta el seguimiento de respuestas, que llevaba vivo desde la 1.3.380 sin ser nombrado.",
      ],
      en: [
        "Ask how much you sent to a person and the Advisor adds up that person's sends — and if the name isn't in your book, it says so instead of handing you someone else's remittance.",
        "Your learned words now also serve when you follow up on an answer (\"and only in…?\"), and forgetting or learning a word can no longer overwrite one learned later.",
        "The description of what the Advisor can do now names follow-ups, alive since 1.3.380 but never counted.",
      ],
    },
  },
  {
    version: "1.3.388",
    date: "2026-11-22",
    level: "menor",
    topic: "billetera-notificaciones",
    title: { es: "La billetera por notificaciones", en: "The wallet by notifications" },
    points: {
      es: [
        "Solo en la app de Android: si lo activas en Ajustes, Faro escucha los avisos de pago de Samsung Wallet y Google Wallet.",
        "Cada aviso con forma de movimiento se vuelve un borrador en la bandeja, con su origen dicho: nada se anota sin tu mesa.",
        "Los códigos de verificación se ignoran por construcción — no se leen, no se guardan, no llegan a la bandeja.",
      ],
      en: [
        "Android app only: if you turn it on in Settings, Faro listens to Samsung Wallet and Google Wallet payment notices.",
        "Every notice with a movement's shape becomes a draft in the tray, with its origin stated: nothing is noted without your table.",
        "Verification codes are ignored by construction — never read, never kept, never reaching the tray.",
      ],
    },
  },
  {
    version: "1.3.387",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Tus vencimientos, a tu calendario", en: "Your dues, to your calendar" },
    points: {
      es: [
        "En Exportar, «Al calendario» saca los vencimientos del mes que estás viendo en un archivo estándar para el calendario de tu aparato.",
        "Es una foto fechada, no una sincronía: si un vencimiento cambia después en Faro, tu calendario no lo sigue — la nota lo dice en el mismo panel.",
        "El Manual anuncia la pantalla grande en el tema de la bandeja: la mesa se trabaja también en el navegador de una computadora, con tu misma cuenta.",
      ],
      en: [
        "In Export, “To calendar” takes the dues of the month you're viewing out in a standard file for your device's calendar.",
        "It's a dated photo, not a sync: if a due changes in Faro later, your calendar won't follow it — the note says so in the same panel.",
        "The Manual announces the big screen in the tray topic: the table can also be worked in a computer's browser, with your same account.",
      ],
    },
    topic: "exportar",
  },
  {
    version: "1.3.386",
    date: "2026-11-22",
    level: "menor",
    title: { es: "Ahorros: la elegida se lee, y una a la vez", en: "Savings: the chosen one reads, one at a time" },
    points: {
      es: [
        "La tarjeta de ahorros elegida — Meta, Retiro, Emergencia o una cuenta — se marca con más fuerza: su color llena más, la rodea un aro y su nombre va en su color.",
        "Al pasar de una parada de ahorros a otra, la nueva se presenta primero: la tarjeta abierta de la anterior se cierra sola.",
      ],
      en: [
        "The chosen savings card — Goal, Retirement, Emergency or an account — now marks itself more strongly: its color fills more, a ring surrounds it and its name wears its color.",
        "Moving from one savings stop to another, the new one presents first: the previous stop's open card closes on its own.",
      ],
    },
    topic: "ahorros-tabs",
  },
  {
    version: "1.3.385",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El anuncio trae todas las novedades", en: "The announcement brings every major note" },
    points: {
      es: [
        "Si te perdiste más de una actualización importante, el anuncio ahora las presenta todas, una tras otra: puedes pasar de una a la siguiente y cada una lleva su puerta.",
        "Cerrar el anuncio sin terminar no marca nada como visto: las notas siguen esperándote en Ajustes → Novedades.",
      ],
      en: [
        "If you missed more than one major update, the announcement now presents them all, one after another: you can move from one to the next and each carries its door.",
        "Closing the announcement unfinished marks nothing as seen: the notes keep waiting for you in Settings → What's new.",
      ],
    },
    topic: "novedades",
  },
  {
    version: "1.3.384",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El Asesor conoce más casas de Faro", en: "The Advisor knows more of Faro's homes" },
    points: {
      es: [
        "Preguntar ya sabe dónde viven el saldo proyectado, los cambios de precio, el aviso de precio, la Bitácora y tus preguntas a la mano — y te lleva a su casa.",
        "En inglés, cada respuesta nombra su área en inglés (Desk, Study, Account…): nada de Spanglish.",
        "La Bitácora ya no pierde lo que no reconoce: lo guarda intacto, aunque no lo pinte.",
      ],
      en: [
        "Ask now knows where the projected balance, price changes, the price alert, the Logbook and your questions at hand live — and takes you to their home.",
        "In English, every answer names its area in English (Desk, Study, Account…): no Spanglish.",
        "The Logbook no longer loses what it doesn't recognize: it keeps it intact, even when it doesn't paint it.",
      ],
    },
    topic: "preguntar-asesor",
  },
  {
    version: "1.3.383",
    date: "2026-11-22",
    level: "grande",
    topic: "preguntar-asesor",
    title: { es: "El Asesor, con todo su banco", en: "The Advisor, with its whole bank" },
    points: {
      es: [
        "La batería completa llegó: dos preguntas en una, el ensayo de un pago contra tu plan, el reparto entre personas, tu mes más fuerte y la calculadora en tus palabras.",
        "Debajo de muchas respuestas van sus acciones: la puerta a donde la cifra vive y el verbo que sugiere — la respuesta propone y tú dispones.",
        "El Asesor aprende tus palabras — solo las que confirmas con un toque — y en Ajustes las ves y las borras cuando quieras.",
      ],
      en: [
        "The whole battery is here: two questions in one, trying a payment against your plan, splitting among people, your strongest month and the calculator in your words.",
        "Under many answers ride their actions: the door to where the figure lives and the verb it suggests — the answer proposes, you decide.",
        "The Advisor learns your words — only the ones you confirm with a tap — and in Settings you see them and delete them whenever you like.",
      ],
    },
  },
  {
    version: "1.3.382",
    date: "2026-11-22",
    level: "grande",
    topic: "buscar",
    title: { es: "Buscar encuentra; preguntar, al Asesor", en: "Search finds; questions go to the Advisor" },
    points: {
      es: [
        "La lupa ahora encuentra en grupos: Lugares, Funciones y Líneas — tus cuentas y categorías primero cuando las nombras, y las funciones de la app con una línea de qué hacen y dónde viven.",
        "Si escribes una pregunta en la lupa, su puerta con la brújula la lleva al Asesor tal como la escribiste: la búsqueda no calcula respuestas, y al volver atrás tu búsqueda te espera intacta.",
        "Escribe como hablas: las palabras de relleno ya no estorban, y los chips bajo las líneas estrechan por mes, ingresos o gastos sin salir de la búsqueda.",
      ],
      en: [
        "The magnifier now finds in groups: Places, Functions and Lines — your accounts and categories first when you name them, and the app's functions with one line on what they do and where they live.",
        "If you type a question into the magnifier, its compass door takes it to the Advisor exactly as you wrote it: search does not compute answers, and going back, your search waits for you untouched.",
        "Type the way you talk: filler words no longer get in the way, and the chips under the lines narrow by month, income or spending without leaving search.",
      ],
    },
  },
  {
    version: "1.3.381",
    date: "2026-11-22",
    level: "menor",
    topic: "avisos-pagos",
    title: { es: "«Pagos que se acercan», arriba y a tu mano", en: "“Payments coming up”, up top and at hand" },
    points: {
      es: [
        "La tarjeta vive ahora arriba de Tengo · Gastaré · Pagos, para que las fichas se desplieguen normalmente.",
        "Su ✕ la quita de Central solo por ahora, tras preguntarte: vuelve mañana, o en cuanto cambie un pago. Los avisos de tu teléfono no se tocan.",
      ],
      en: [
        "The card now sits above I have · I will spend · Payments, so the tiles unfold normally below it.",
        "Its ✕ removes it from Central only for now, after asking you: it comes back tomorrow, or as soon as a payment changes. Your phone notices are untouched.",
      ],
    },
  },
  {
    version: "1.3.380",
    date: "2026-11-21",
    level: "grande",
    topic: "preguntar-asesor",
    title: { es: "El Asesor sigue la conversación", en: "The Advisor follows the conversation" },
    points: {
      es: [
        "Ahora puedes seguir preguntando sobre la respuesta que acabas de recibir: «¿en qué gasté más?», «¿y en comida?», «¿y el mes anterior?» — el Asesor recuerda el hilo.",
        "Cada respuesta de seguimiento nombra su hilo en la primera línea, y la cuenta cierra exacta: las subidas menos las bajadas dan la diferencia.",
        "El hilo vive solo en la caja de preguntas: no entra en tu libro ni viaja con él.",
      ],
      en: [
        "Now you can keep asking about the answer you just got: “what did I spend the most on?”, “and on food?”, “and the month before?” — the Advisor remembers the thread.",
        "Every follow-up answer names its thread in the first line, and the account closes exactly: the rises minus the falls give the difference.",
        "The thread lives only in the ask box: it never enters your book or travels with it.",
      ],
    },
  },
  {
    version: "1.3.379",
    date: "2026-11-21",
    level: "grande",
    topic: "manual",
    title: { es: "El Manual, con forma", en: "The Manual, given form" },
    points: {
      es: [
        "Todo el Manual se reescribió en su presentación: párrafos cortos, de una sola idea, y las listas como grupos con su renglón — la información es la misma, ya no abruma.",
        "Cada enumeración se lee en su propio renglón, con la marca del color de tu tema: la forma se adapta a tu tema, no impone la suya.",
        "Y queda la cerca: ningún texto del Manual puede volver a crecer como un muro de párrafo.",
      ],
      en: [
        "The whole Manual was rewritten in its presentation: short paragraphs, one idea each, and lists as groups with their own line — the information is the same, it no longer overwhelms.",
        "Every enumeration reads on its own line, marked with your theme's colour: the form adapts to your theme, it doesn't impose its own.",
        "And the fence stays: no Manual text can ever grow back into a paragraph wall.",
      ],
    },
  },
  {
    version: "1.3.378",
    date: "2026-11-21",
    level: "menor",
    title: { es: "Lo que se borra ya no se lleva el pago automático", en: "Deleting no longer takes the autopay with it" },
    points: {
      es: [
        "Si borras la línea que llevaba el pago automático de una serie — también desde el Archivo o deshaciendo una importación —, la instrucción pasa a la instancia más nueva que quede: la serie sigue pagándose sola.",
        "Preguntar «¿Cómo cambio mi nombre?» ahora lleva a su sitio: el Asesor conoce «Tu nombre en Faro» y «Compartir con Faro», sin confundirlos con la mesa de cambio.",
      ],
      en: [
        "If you delete the line that carried a series' autopay — from the Archive or by undoing an import, too — the instruction moves to the newest remaining instance: the series keeps paying itself.",
        "Asking “How do I change my name?” now leads to its place: the Advisor knows “Your name in Faro” and “Sharing with Faro”, without mistaking them for the exchange desk.",
      ],
    },
  },
  {
    version: "1.3.377",
    date: "2026-11-21",
    level: "menor",
    title: { es: "Notificaciones, a tu manera", en: "Notifications, your way" },
    points: {
      es: [
        "Avisos se llama ahora Notificaciones, y su tarjeta se despliega: eliges qué tipos quieres recibir — vencimientos, ritmo de gasto y cierre del mes — cada uno con su interruptor.",
        "«Avisos de pagos», la tarjeta de Central, conserva su nombre.",
      ],
      en: [
        "Notices are now called Notifications, and their card unfolds: you choose which kinds you want — due dates, spending pace and the month's close — each with its own switch.",
        "“Payment notices”, the Desk card, keeps its name.",
      ],
    },
  },
  {
    version: "1.3.376",
    date: "2026-11-21",
    level: "menor",
    title: { es: "Tus preguntas, primeras de verdad", en: "Your questions, truly first" },
    points: {
      es: [
        "En la caja del Asesor, tus preguntas a la mano van primeras, como promete Ajustes; las sugerencias del banco van debajo, con su propio rótulo.",
        "Las sugerencias son solo tres, y cambian cada vez que entras al Asesor.",
      ],
      en: [
        "In the Advisor's box, your questions at hand come first, as Settings promises; the bank's suggestions sit below them, under their own label.",
        "The suggestions are only three, and they change every time you enter the Advisor.",
      ],
    },
  },
  {
    version: "1.3.375",
    date: "2026-11-21",
    level: "menor",
    title: { es: "La barra vuelve a su orden", en: "The bar returns to its order" },
    points: {
      es: [
        "La barra superior vuelve a leerse como antes: tema, Asesor, lupa, calendario y moneda. Entre el calendario y la lupa queda el espacio que la rejilla les guarda.",
        "Todo lo demás de la nota anterior queda: la brújula del Asesor, el aterrizaje en la caja entera, los botones más pequeños y su esquina sobre el Manual.",
      ],
      en: [
        "The top bar reads as it did before: theme, Advisor, search, calendar and the coin. Between the calendar and the search there is the space the grid keeps for them.",
        "Everything else from the previous note stays: the Advisor's compass, the landing on the whole box, the smaller buttons and their corner over the Manual.",
      ],
    },
  },
  {
    version: "1.3.374",
    date: "2026-11-21",
    level: "menor",
    title: { es: "La barra, en su orden; el aterrizaje, completo", en: "The bar, in its order; the landing, whole" },
    points: {
      es: [
        "La barra superior se lee ahora: tema, calendario, Asesor, lupa y moneda. El acceso al Asesor lleva la brújula, su marca en Faro.",
        "Tocar ese acceso te lleva a la caja de preguntas entera — cabecera, campo, sugeridas y tus preguntas a la mano — no a un pedazo de ella.",
        "El botón flotante de Vista y el de subir miden menos: otro 13 % más pequeños, sin cambiar su forma de viajar con la barra.",
        "Con el Manual abierto, los dos botones bajan a su esquina — no hay barra que sostenerlos — y el de Vista vive también sobre el Manual: eliges una vista y el Manual se cierra con tu vista delante.",
      ],
      en: [
        "The top bar now reads: theme, calendar, Advisor, search and the coin. The Advisor shortcut wears the compass, its mark in Faro.",
        "Tapping that shortcut takes you to the whole question box — header, field, suggestions and your questions at hand — not to a piece of it.",
        "The floating View button and the back-to-top button are smaller: another 13 % down, with their way of travelling with the bar unchanged.",
        "With the Manual open, both buttons settle into their corner — there is no bar to hold them up — and the View button lives over the Manual too: pick a view and the Manual closes with your view in front.",
      ],
    },
  },
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

/** TODAS las notas grandes sin ver (1.3.385, Oscar): el anuncio las
 * ofrece como SERIE — de la más nueva a la más vieja, cada una con su
 * puerta — en vez de anunciar solo la más nueva y dejar las demás
 * mudas en el pliegue. announcementFor sigue siendo la primera de
 * esta lista (su cerca lo clava); la serie es la que la tarjeta
 * presenta. Las menores nunca entran en el anuncio: viven en Ajustes. */
export function announcementsFor(seen: string, current: string): NewsEntry[] {
  return newsBetween(seen, current).filter((n) => n.level === "grande");
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
