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
    version: "1.3.519",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Preguntar por tu presupuesto ya no cae en otra respuesta", en: "Asking about your budget no longer lands on another answer" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si preguntas por tu presupuesto o tu tope («¿Cuánto me queda de mi presupuesto de alimentos?», «¿Ya me pasé de mi presupuesto?»), el Asesor ya no lo disfraza de la queda del mes: te dice la verdad — todavía no tienes presupuesto fijado, porque tu libro aún no guarda topes — y te cuenta la mitad que sí sabe, lo que llevas gastado en esa categoría este mes.",
      ],
      en: [
        "If you ask about your budget or your cap (“How much of my food budget do I have left?”, “Am I over budget?”), the Advisor no longer dresses it up as the month's left: it tells you the truth — you have no budget set yet, because your book doesn't keep caps yet — and counts the half it does know, what you've spent in that category this month.",
      ],
    },
  },
  {
    version: "1.3.518",
    date: "2026-11-27",
    level: "menor",
    title: { es: "«¿Tengo alguna deuda?» ya se responde", en: "“Do I have any debt?” now gets an answer" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "La pregunta más sencilla de las deudas ya tiene respuesta: «¿Tengo alguna deuda?», «¿Debo algo?», «¿Estoy endeudado?» y sus hermanas reciben el sí o el no con tu cifra total (préstamos, tarjetas y saldos anotados, de la misma fuente única de siempre).",
      ],
      en: [
        "The simplest debt question now has an answer: “Do I have any debt?”, “Do I owe anything?”, “Am I in debt?” and their siblings get the yes or no with your total figure (loans, cards and recorded balances, from the same single source as always).",
      ],
    },
  },
  {
    version: "1.3.517",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Preguntar qué puede hacer el Asesor ya funciona en tus palabras", en: "Asking what the Advisor can do now works in your words" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "La pregunta sobre el Asesor mismo ya se oye como la haces: «¿qué sabes hacer?», «enumera tus funciones», «¿puedes decirme quién me debe?» o «¿qué no puedes hacer?» reciben el menú, la confirmación del poder con su ejemplo, o la frontera dicha — sin calcular ninguna cifra.",
      ],
      en: [
        "Asking about the Advisor itself is now heard the way you say it: “what do you know how to do?”, “list your functions”, “can you tell me who owes me?” or “what can't you do?” get the menu, the named power confirmed with its example question, or the boundary stated — without computing any figure.",
      ],
    },
  },
  {
    version: "1.3.516",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La proyección ya tiene su puerta", en: "Projection now has its own door" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«Si sigo poniendo 100 al mes, ¿cuánto tendré en diciembre?» ya lo responde la proyección con su nombre: oye tu aporte con su cadencia (también «los 100 mensuales» o «50 x quincena»), la meta con nombre aunque tu libro aún no la traiga, y la llegada con fecha o sin ella, siempre con el supuesto dicho.",
      ],
      en: [
        "“If I keep putting in 100 a month, how much will I have by December?” is now answered by projection under its own name: it hears your set-aside with its cadence (also “the monthly 100” or “50 per paycheck”), a named goal even if your book doesn't carry it yet, and the arrival with or without a date, always with the assumption stated.",
      ],
    },
  },
  {
    version: "1.3.515",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La deriva ya lee una serie por su nombre", en: "Drift now reads a series by name" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Mis gastos de comida vienen subiendo?» ya tiene respuesta: la deriva lee la serie nombrada mes contra mes y dice su forma (sube de a poco, dio un salto, o se mantiene en su nivel), con la vara declarada. Y si tu libro no trae esa serie, lo declara en vez de leer el total en su lugar.",
      ],
      en: [
        "“Are my food expenses creeping up?” now has an answer: drift reads the named series month by month and names its shape (creeping up, jumped, or holding its level), with the bar stated. And if your book doesn't carry that series, it says so instead of reading the total in its place.",
      ],
    },
  },
  {
    version: "1.3.514",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La respuesta se afina a la pregunta", en: "The answer now fits the question" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Cuánta lana me debe Carlos?» ya responde de Carlos y su cifra, no con la lista entera de deudores: la forma de monto cede del conteo a deudas. Y cuando sí pides el conteo («¿cuántas personas me deben?»), cada persona lleva lo que de veras debe, nunca ceros.",
      ],
      en: [
        "“How much money does Carlos owe me?” now answers about Carlos and his figure, not with the whole list of debtors: the amount form yields from counting to debts. And when you do ask for the count (“how many people owe me?”), each person carries what they truly owe, never zeros.",
      ],
    },
  },
  {
    version: "1.3.513",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La tasa de ahorro ya se puede preguntar en tus palabras", en: "The savings rate can now be asked in your own words" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Qué porcentaje de lo que entró logré ahorrar este año?», «¿qué parte de mi ingreso terminé guardando?» y «¿estoy guardando más proporción que de costumbre?» ya llegan a la tasa de ahorro, que antes solo oía su nombre técnico y el resto caía en ahorros.",
      ],
      en: [
        "“What percentage of what came in did I manage to save this year?”, “what part of my income did I end up putting away?” and “am I saving a bigger share than usual?” now reach the savings rate, which before only heard its technical name while the rest fell to savings.",
      ],
    },
  },
  {
    version: "1.3.512",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El oído deja de deformar las palabras de todos los días", en: "The ear stops bending everyday words" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El corrector de erratas ya no convierte palabras correctas en otras: «ahora» no se vuelve «ahorra», «anda» no se vuelve un nombre, «suelo» no se vuelve «sueldo», y los nombres como Ana, Carlos o Luis quedan intactos aunque tu libro no los traiga.",
      ],
      en: [
        "The typo fixer no longer turns correct words into others: “ahora” doesn't become “ahorra”, “anda” doesn't become a name, “suelo” doesn't become “sueldo”, and names like Ana, Carlos or Luis stay intact even if your book doesn't carry them.",
      ],
    },
  },
  {
    version: "1.3.511",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Los colores de la gráfica, un pelo más suaves", en: "The chart colors, a touch softer" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Los colores con que la gráfica distingue a cada persona bajan un pelo su intensidad: la familia entera se lee igual de clara, sin gritar.",
      ],
      en: [
        "The colors the chart uses to tell each person apart drop a touch in intensity: the whole family reads just as clearly, without shouting.",
      ],
    },
  },
  {
    version: "1.3.510",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Cada persona, su color en la gráfica", en: "Each person gets their own color in the chart" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "En la gráfica de barras del Asesor, cada persona lleva ahora su propio color, y el mismo color aparece junto a su nombre en la lista: el segmento y la persona se leen de un vistazo, sin adivinar por la posición.",
      ],
      en: [
        "In the Advisor's bar chart, each person now carries their own color, and the same color appears next to their name in the list: the segment and the person read at a glance, with no guessing by position.",
      ],
    },
  },
  {
    version: "1.3.509",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El reparto ya oye dividir y suma los aportes con nombre", en: "Splitting now hears dividing and adds up named contributions" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«Divide la cuenta entre Ana, Luis y yo» y «¿a cuánto salimos si somos cuatro?» ya responden: el reparto lee los nombres tal como los traes, aunque no estén en tu libro, y lo dice en la nota.",
        "Los aportes con nombre también suman: «Ramón 40, Lissette 25 y yo 45» da el total con cada aporte a la vista, sin anotar nada.",
      ],
      en: [
        "“Divide the bill between Ana, Luis and me” and “how much does each of us owe if there are four of us?” now answer: the split reads the names just as you bring them, even if they're not in your book, and says so in the note.",
        "Named contributions add up too: “Ramón 40, Lissette 25 and me 45” gives the total with each contribution in view, recording nothing.",
      ],
    },
  },
  {
    version: "1.3.508",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Comparar ya oye la semana, la quincena y los meses por nombre", en: "Comparing now hears the week, the pay period and months by name" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«Compara esta semana con la pasada», «esta quincena contra la anterior» y «compara agosto con septiembre» ya responden, a igual tramo y con el corte dicho, como mandaba el fallo de los meses.",
        "Si tu libro no existía en el tramo anterior, el Asesor lo declara en vez de comparar contra cero.",
      ],
      en: [
        "“Compare this week with last week”, “this pay period against the previous one” and “compare August with September” now answer, over the same stretch and with the cut stated, as the months ruling required.",
        "If your book didn't exist in the earlier stretch, the Advisor says so instead of comparing against zero.",
      ],
    },
  },
  {
    version: "1.3.507",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La lista de movimientos ya se puede pedir", en: "You can now ask for the list of movements" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«Muéstrame los movimientos de este mes» o «dame el historial de septiembre» ya responden: la lista del período, en orden, con la suma dicha arriba y la puerta a verla en Estudio.",
        "Las sumas del habla también entran: «¿cuánto se me fue en transporte?» y «gasto en comida este mes» suman como las formas de siempre.",
      ],
      en: [
        "“Show me this month's movements” or “give me September's history” now answer: the period's list, in order, with the total said up top and the door to see it in Study.",
        "Everyday sum phrasings count too: “how much slipped away on transport?” and “spending on food this month” add up like the usual forms.",
      ],
    },
  },
  {
    version: "1.3.506",
    date: "2026-11-27",
    level: "menor",
    title: { es: "«Done» y «donde» ya no se confunden", en: "“Done” and “donde” no longer get mixed up" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si escribes en español «¿done gasté más?», el Asesor lo lee como «¿dónde gasté más?»: el par se desempata por el idioma de la conversación.",
        "En inglés, «done» sigue siendo «done», intacta: el desempate solo corre en las frases en español.",
      ],
      en: [
        "If you type “¿done gasté más?” in Spanish, the Advisor reads it as “¿dónde gasté más?”: the pair is settled by the language of the conversation.",
        "In English, “done” stays “done”, untouched: the tie-break only runs on Spanish sentences.",
      ],
    },
  },
  {
    version: "1.3.505",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El oído inglés se afina", en: "The English ear gets sharper" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Una errata como escribir «donde» por «done» ya no deja al Asesor sin oír la pregunta en inglés: la palabra entró a su vocabulario de reparación.",
        "Las contracciones reales del inglés (don't, can't, isn't…) quedan protegidas al reparar, para que ninguna se parta y se pierda por el camino.",
      ],
      en: [
        "A typo like writing “donde” for “done” no longer leaves the Advisor unable to hear the English question: the word joined its repair vocabulary.",
        "Real English contractions (don't, can't, isn't…) are now protected while repairing, so none of them gets split and lost along the way.",
      ],
    },
  },
  {
    version: "1.3.504",
    date: "2026-11-27",
    level: "menor",
    title: { es: "«¿Cuánto aportó…?» ya tiene respuesta", en: "“How much did … bring in?” now has an answer" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Preguntar cuánto aportó una fuente — «¿Cuánto aportó el salario este mes?» — caía en silencio; ahora el Asesor suma esa fuente en el período y dice el total con su nombre.",
        "La puerta solo se abre cuando el nombre es una fuente de tu libro: preguntar cuánto aportó una persona no se disfraza de suma de ingreso.",
      ],
      en: [
        "Asking how much a source brought in — “How much did my salary bring in this month?” — used to fall silent; now the Advisor adds up that source over the period and says the total with its name.",
        "The door only opens when the name is a source in your book: asking how much a person brought in does not dress itself up as an income sum.",
      ],
    },
  },
  {
    version: "1.3.503",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El ranking aprende las fuentes y el peso", en: "Ranking learns the sources and the weight" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Ahora puedes preguntar qué fuente de ingreso te aportó más o menos en un período, y pedir el orden entero de tus fuentes por lo que aportaron.",
        "Y también qué salida pesó más contra lo que entró: la respuesta da la mayor con su porcentaje de lo que entró en el mismo período; si no entró nada anotado, lo dice en vez de inventar un porcentaje.",
      ],
      en: [
        "You can now ask which income source brought in the most or the least in a period, and ask for the full order of your sources by what they brought in.",
        "And also which outflow weighed most against what came in: the answer gives the largest with its percentage of what came in over the same period; if nothing came in on record, it says so instead of inventing a percentage.",
      ],
    },
  },
  {
    version: "1.3.502",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El botón de la casa, en voz baja", en: "The house button, in a lower voice" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El botón «¿Qué puede hacer el asesor?» ya no lleva el fondo lleno de color: vuelve a su color de siempre, dicho en un tinte suave, con su borde y su letra en ese color.",
        "Su forma y su brújula se quedan como estaban; solo baja la voz.",
      ],
      en: [
        "The “What can the Advisor do?” button no longer wears the solid fill of color: it goes back to its usual color, spoken in a soft tint, with its border and text in that color.",
        "Its shape and its compass stay as they were; only the voice comes down.",
      ],
    },
  },
  {
    version: "1.3.501",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La vigilancia propone y cumple", en: "The watch proposes and does it" },
    topic: "vigilancia",
    points: {
      es: [
        "Cada aviso de la tarjeta se lee ahora con el concepto primero y el problema después: «Salario - No llegó».",
        "El gasto que se repite sin estar programado trae su botón «Programarlo»: su programa mensual nace ahí mismo, por la mediana y en su día usual.",
        "El ingreso que no llegó trae «Anotarlo hoy»: queda asentado hoy por el monto que se esperaba.",
      ],
      en: [
        "Each flag on the card now reads with the concept first and the problem after: “Salary - Did not arrive”.",
        "The expense that repeats without being scheduled carries its “Schedule it” button: its monthly schedule is born right there, at the median and on its usual day.",
        "The income that did not arrive carries “Book it today”: it is recorded today at the expected amount.",
      ],
    },
  },
  {
    version: "1.3.500",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La vigilancia respira", en: "The watch breathes" },
    topic: "vigilancia",
    points: {
      es: [
        "En la tarjeta «La vigilancia» de Central, el detalle de cada aviso ahora corre a todo el ancho de su renglón: la cifra y la ✕ viven en la línea de arriba y ya no dejan una banda vacía a la derecha.",
      ],
      en: [
        "On Central's “The watch” card, each notice's detail now runs the full width of its row: the amount and the ✕ live on the top line and no longer leave an empty band on the right.",
      ],
    },
  },
  {
    version: "1.3.499",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Las respuestas de historia, en palabras llanas", en: "History answers, in plain words" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Las sumas del Asesor ya nombran aquello por lo que preguntas y cuentan gastos o ingresos, sin palabras internas: «En este mes gastaste C$7,691.10 en alimentos (2 gastos). En dólares, los de tu libro, son $210.00».",
      ],
      en: [
        "The Advisor's sums now name what you asked about and count expenses or income, with no internal words: “In this month you spent C$7,691.10 on food (2 expenses). In dollars, your book's own, that's $210.00”.",
      ],
    },
  },
  {
    version: "1.3.498",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La moneda que nombras, se oye", en: "The currency you name is heard" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si preguntas un gasto «en córdobas» en un libro en dólares — o al revés — el Asesor responde primero en la moneda que nombraste, con la tasa de tu libro dicha y el mismo total en tu moneda al lado.",
      ],
      en: [
        "If you ask about spending “in córdobas” in a dollar book — or the other way around — the Advisor answers first in the currency you named, with your book's rate stated and the same total in your currency beside it.",
      ],
    },
  },
  {
    version: "1.3.497",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El saldo ya se puede preguntar", en: "You can ask for your balance now" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Cuál es mi saldo?», «¿cuánto tengo de saldo?» y «¿mi saldo?» ya reciben su respuesta: el Asesor suma tu queda, tu ahorro y lo que te deben.",
        "Y si preguntas por una persona que está en tu libro sin deuda — por un envío, por ejemplo — el Asesor lo dice: no le debes nada, en vez de callar.",
      ],
      en: [
        "“What is my balance?”, “how much balance do I have?” and “my balance” now get their answer: the Advisor adds your left, your savings and what you are owed.",
        "And if you ask about a person who is in your book with no debt — from a remittance, say — the Advisor says so: you owe them nothing, instead of staying silent.",
      ],
    },
  },
  {
    version: "1.3.496",
    date: "2026-11-27",
    level: "menor",
    title: { es: "La vigilancia se presenta sola", en: "The watch presents itself" },
    topic: "vigilancia",
    points: {
      es: [
        "Central gana la tarjeta «La vigilancia»: lo que cambió en tu libro — una deriva, un salto, un ingreso que no llegó, un gasto sin programar — se presenta sin que preguntes.",
        "Cada aviso se puede quitar por su mes con su ✕, y un recordatorio ya no se anuncia como un pago de $0.00.",
      ],
      en: [
        "Central gains the “Watch” card: what changed in your book — a drift, a jump, income that did not arrive, an unscheduled expense — presents itself without your asking.",
        "Each flag can be removed for its month with its ✕, and a reminder is no longer announced as a $0.00 payment.",
      ],
    },
  },
  {
    version: "1.3.495",
    date: "2026-11-27",
    level: "menor",
    title: { es: "El libro compartido explica sus pasos", en: "The shared book explains its steps" },
    topic: "libro-compartido",
    points: {
      es: [
        "La mesa de invitar, la vista previa, la lista de personas y la salida de un libro compartido llevan ahora su signo de interrogación: cada uno explica su paso en dos idiomas.",
        "El Manual suma cuatro temas nuevos: invitar a tu libro, la vista previa, quiénes están en tu libro y salir de un libro compartido.",
      ],
      en: [
        "The invitation mesa, the preview, the list of people and leaving a shared book now carry their question mark: each one explains its step in both languages.",
        "The Manual gains four new topics: inviting to your book, the preview, who is in your book and leaving a shared book.",
      ],
    },
  },
  {
    version: "1.3.494",
    date: "2026-11-27",
    level: "menor",
    title: { es: "Las ayudas con forma muestran su cálculo", en: "Shape-shaped helps show their working" },
    topic: "colchon",
    points: {
      es: [
        "El (?) del ritmo, del colchón y del piso de emergencia ahora abre su hoja de cálculo: qué es, cómo se calcula y qué significa, con tus cifras vivas y la brecha nombrada.",
        "El apartado del mes y el colchón de Estudio ganan la misma hoja. Las demás ayudas quedan en su burbuja de siempre: su texto basta.",
      ],
      en: [
        "The (?) on pace, the cushion and the emergency floor now opens its worked sheet: what it is, how it is calculated and what it means, with your live figures and the gap named.",
        "The month's set-aside and the Study cushion gain the same sheet. The other helps stay with their usual bubble: their text is enough.",
      ],
    },
  },
  {
    version: "1.3.493",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El editor ya no es una caja dentro de otra caja", en: "The editor is no longer a box inside a box" },
    topic: "editor",
    points: {
      es: [
        "El editor de una línea era una caja propia dentro de la tarjeta del mes, con su borde, su tinte y su relleno: entre su borde y los campos quedaba una banda muerta a cada lado. Ya no es una caja — vive sobre la superficie de la tarjeta y sus campos caen en la misma columna que las filas.",
      ],
      en: [
        "The line editor was a box of its own inside the month's card, with its own border, tint and padding: a dead band sat on each side between its border and the fields. It is no longer a box — it lives on the card's surface and its fields fall in the same column as the rows.",
      ],
    },
  },
  {
    version: "1.3.492",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los botones del editor respiran", en: "The editor's buttons breathe" },
    topic: "f-compartido",
    points: {
      es: [
        "Los interruptores del editor — el de «Esto se compartió», los nombres de «Con quién» y también «Activo» y «Recurrente» — iban pegados a su caja por dentro; ahora llevan aire simétrico a los lados y el texto ya no toca los bordes.",
        "El bloque de «Compartido» separa más sus filas: el interruptor, el número de personas y los nombres ya no se amontonan.",
      ],
      en: [
        "The editor's toggles — “This was shared”, the “With whom” names and also “Active” and “Recurring” — were glued to their box from inside; they now carry even air on both sides and the text no longer touches the edges.",
        "The “Shared” block spaces its rows further apart: the toggle, the people count and the names no longer crowd together.",
      ],
    },
  },
  {
    version: "1.3.491",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los pliegues de Ajustes respiran", en: "The Settings folds breathe" },
    topic: "preguntas-a-la-mano",
    points: {
      es: [
        "El título largo de «Lo que tu Asesor ha aprendido» se salía de su renglón y se montaba sobre su signo de ayuda; ahora parte en dos líneas dentro de su sitio y nada se monta sobre nada.",
        "Las notas de «Preguntas a la mano» y de «Lo que tu Asesor ha aprendido» ya no van sueltas sobre el fondo: visten la tarjeta de notas de la casa, como sus hermanas de Ajustes.",
      ],
      en: [
        "The long title of “What your Advisor has learned” spilled out of its row and over its help sign; it now wraps onto two lines inside its place and nothing rides over anything.",
        "The notes in “Questions at hand” and “What your Advisor has learned” no longer sit loose on the background: they wear the house note card, like their Settings sisters.",
      ],
    },
  },
  {
    version: "1.3.490",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El anillo de las novedades ya se ve entero", en: "The what's-new ring now shows whole" },
    topic: "novedades",
    points: {
      es: [
        "El anillo que nace del disco de esta ventana salía cortado por arriba y por un lado; ahora se ve completo, sin que nada más se mueva.",
      ],
      en: [
        "The ring that blooms from this window's disc used to come out clipped at the top and one side; it now shows whole, with nothing else moved.",
      ],
    },
  },
  {
    version: "1.3.489",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los gastos compartidos ya se pueden marcar", en: "Shared spending can now be marked" },
    topic: "f-compartido",
    points: {
      es: [
        "Abre una línea en Libros, en su editor, y en «Compartido» di entre cuántas personas se repartió, contándote, y con quién, si quieres los nombres.",
        "Con la marca puesta, pregúntale a tu Asesor cuánto puso cada uno: te dice tu parte y lo que pusiste por otros. Tus totales no cambian: el gasto sigue contando entero.",
      ],
      en: [
        "Open a line in Books, in its editor, and under “Shared” say among how many people it was split, counting you, and with whom, if you want the names.",
        "With the mark set, ask your Advisor how much each person put in: it tells you your share and what you put in for others. Your totals don't change: the spend keeps counting whole.",
      ],
    },
  },
  {
    version: "1.3.488",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El pago de la tarjeta también se programa como abono", en: "A card payment also schedules as a payment" },
    topic: "asesor-relato",
    points: {
      es: [
        "Si le dices a tu Asesor «pagaré la tarjeta mañana» o «programa el pago de la Visa cada mes», el borrador ya no es de gasto: es de abono contra esa tarjeta.",
        "Queda asentado como transferencia con su fecha, y el saldo de la tarjeta lo cuenta desde esa fecha. Con dos tarjetas y sin nombrar cuál, pregunta cuál.",
      ],
      en: [
        "If you tell your Advisor “I'll pay the card tomorrow” or “schedule the Visa payment every month”, the draft is no longer a spend: it's a payment against that card.",
        "It is posted as a transfer with its date, and the card's balance counts it from that date. With two cards and none named, it asks which.",
      ],
    },
  },
  {
    version: "1.3.487",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Las comparaciones, a igual tramo", en: "Comparisons, over the same stretch" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Cuando preguntas si gastaste más este mes o el pasado, tu Asesor compara a igual tramo: del día 1 a hoy contra los mismos días del mes pasado. El mes pasado completo va en la nota.",
        "Si el mes pasado fue más corto, el corte se nombra; si no hay mes pasado (es el primer mes de tu libro, o el pasado quedó sin anotar), se dice así, nunca se compara contra cero.",
      ],
      en: [
        "When you ask whether you spent more this month or last, your Advisor compares over the same stretch: the 1st to today against the same days of last month. Last month in full goes in the note.",
        "If last month was shorter, the cut is named; if there is no last month (it's your book's first month, or last month has nothing recorded), it says so — it never compares against zero.",
      ],
    },
  },
  {
    version: "1.3.486",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El abono guarda los dos montos", en: "The card payment keeps both amounts" },
    topic: "asesor-relato",
    points: {
      es: [
        "Si le cuentas al Asesor un abono en otra moneda — «pagué 7,000 córdobas de la tarjeta desde el banco» — la tarjetita guarda los dos extremos: lo que salió de tu cuenta en su moneda y lo que llega a la tarjeta en la suya.",
        "Si solo cuentas el monto de fuera, el de la tarjeta se estima con la tasa de tu libro y la tarjetita lo dice: corrígelo en la confirmación si tu banco aplicó otra, y quedan asentados los dos montos verdaderos.",
        "Nunca nace una línea de «diferencia cambiaria»: la tasa de la operación es la que sale de los dos montos.",
      ],
      en: [
        "If you tell the Advisor a card payment in another currency — “I paid 7,000 córdobas to my card from the bank” — the little card keeps both ends: what left your account in its currency and what reaches the card in its own.",
        "If you only tell the outside amount, the card's amount is estimated at your book's rate and the little card says so: correct it at the confirmation if your bank applied a different one, and both true amounts are what get posted.",
        "No “exchange difference” line is ever born: the operation's rate is the one the two amounts give.",
      ],
    },
  },
  {
    version: "1.3.485",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los nombres que no están, se dicen", en: "Names that aren't there get said" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si preguntas «¿cuánto le debo a Kenia?» y no tienes a ninguna Kenia en tu libro, el Asesor te lo dice con su nombre, en vez de quedarse callado.",
        "Y si preguntas por un nombre de tu estructura que no tiene ni un solo movimiento en todo tu libro, como Mascotas, lo declara así: ya no recibes un «$0.00» que suena a nombre vivo medido en cero.",
        "El nombre que sí tiene historia conserva su respuesta de siempre: si este mes da cero, el cero es la respuesta, con el nombre bajo el que se midió.",
      ],
      en: [
        "If you ask “How much do I owe Kenia?” and there's no Kenia anywhere in your book, the Advisor now says so, naming her, instead of staying silent.",
        "And if you ask about a name in your structure that has no movement anywhere in your book, like Pets, it says exactly that: you no longer get a “$0.00” that sounds like a living name measured at zero.",
        "A name with history keeps its usual answer: if this month comes to zero, the zero is the answer, with the name it was measured under.",
      ],
    },
  },
  {
    version: "1.3.484",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El pago de vuelta abona el préstamo", en: "The payment back pays down the loan" },
    topic: "asesor-relato",
    points: {
      es: [
        "Si alguien te debe y le cuentas al Asesor «me pagó Alvin 30», ese ingreso ya no queda suelto: abona el préstamo de Alvin, y su tarjetita declara lo que queda pendiente, o que con esto queda saldado.",
        "El espejo también: si tú le debes a alguien y cuentas «le pagué 30 a Alvin», el gasto abona tu deuda con él.",
        "Si el pago se pasa de lo que se debe, o hay dos préstamos vivos con la misma persona, el Asesor pregunta antes de asentar y no toca nada. Y en inglés el pago que entra ya se oye bien: «Alvin paid me 50» es un ingreso que abona, no un gasto.",
      ],
      en: [
        "If someone owes you and you tell the Advisor “Alvin paid me 30”, that income no longer floats loose: it pays toward Alvin's loan, and its little card states what is left, or that this settles it in full.",
        "The mirror too: if you owe someone and you tell it “I paid Alvin 30”, the spend pays toward your debt with him.",
        "If the payment exceeds what is owed, or there are two live loans with the same person, the Advisor asks before posting and touches nothing. And in English the incoming payment is now heard right: “Alvin paid me 50” is income that pays down a loan, not a spend.",
      ],
    },
  },
  {
    version: "1.3.483",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Prestar también se cuenta", en: "Lending is told too" },
    topic: "asesor-relato",
    points: {
      es: [
        "Ahora el Asesor también oye los préstamos cuando se los cuentas: «le presté 50 a Alvin» nace en Me deben, y «Alvin me prestó 50» nace en Debo, cada deuda en su lado.",
        "Prestar no es gastar y que te presten no es un ingreso: el flujo de tu mes no se mueve, solo nace el registro de la deuda.",
        "Sin el monto o sin el nombre, el Asesor pregunta por ese dato antes de asentar; y «pagué el préstamo» sigue siendo lo que era, pagar una deuda que ya existe.",
      ],
      en: [
        "Now the Advisor also hears loans when you tell them: “I lent Alvin 50” is born in Owed to me, and “Alvin lent me 50” is born in I owe, each debt on its own side.",
        "Lending is not spending and being lent to is not income: your month's flow does not move, only the debt record is born.",
        "With no amount or no name, the Advisor asks for that fact before posting; and “I paid the loan” stays what it was, paying a debt that already exists.",
      ],
    },
  },
  {
    version: "1.3.482",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Pagar la tarjeta ya no es un gasto", en: "Paying the card is no longer a spend" },
    topic: "asesor-relato",
    points: {
      es: [
        "Corrección importante: si le contabas al Asesor «pagué 200 de la tarjeta», eso se asentaba como un gasto más, y el mes contaba la compra dos veces. Ya no: ahora nace un abono contra la tarjeta, que liquida su deuda y no suma gasto — el gasto ya contó al comprar.",
        "La tarjeta queda nombrada en su tarjetita, con su palabra «Abono» arriba y la cuenta de origen como detalle cuando la nombras («desde el banco»).",
        "Con dos tarjetas y sin nombrar cuál, el Asesor pregunta cuál antes de asentar; y pagar CON la tarjeta sigue siendo gasto, como debe ser: «compré un pollo con la tarjeta» no cambia.",
      ],
      en: [
        "An important fix: if you told the Advisor “I paid 200 to my credit card”, that posted as one more spend, and the month counted the purchase twice. No longer: now a payment against the card is born, which settles its debt and adds no spend — the spend already counted when you bought.",
        "The card is named on its little card, with its word “Payment” above and the origin account as a detail when you name it (“from my bank”).",
        "With two cards and none named, the Advisor asks which before posting; and paying WITH the card is still a spend, as it should be: “I bought a chicken with the card” doesn't change.",
      ],
    },
  },
  {
    version: "1.3.481",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La puerta inglesa: el Asesor oye el «did»", en: "The English door: the Advisor hears the “did”" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«How much did I send Mom?» ya responde: la puerta de remesas oye el «send» del «did» además del participio, y «Mom» encuentra a la persona anotada como «Mamá» por el puente de parentesco — responde con su nombre anotado y su cifra.",
        "«How much did I pay in rent?» confirma la renta pagada, con su cifra y su fecha: la búsqueda de lo ya pagado ahora trae los nombres en los dos idiomas, y el ciudadano resuelto manda cuando la palabra no casa.",
        "Y el cero con filtro nombra su ciudadano también en inglés: «no line falls in that period under “Groceries”» — el cero dice bajo qué nombre se midió.",
      ],
      en: [
        "“How much did I send Mom?” now answers: the remittances door hears the “send” of the “did” beside the participle, and “Mom” finds the person recorded as “Mamá” through the kinship bridge — it answers with her recorded name and her figure.",
        "“How much did I pay in rent?” confirms the rent as paid, with its figure and its date: the already-paid search now carries names in both languages, and the resolved citizen rules when the word doesn't match.",
        "And the zero with a filter names its citizen in English too: “no line falls in that period under “Groceries”” — the zero says under what name it was measured.",
      ],
    },
  },
  {
    version: "1.3.480",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los tres frentes declarados, cerrados", en: "The three declared fronts, closed" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Cuánto tengo?», a secas, ya tiene respuesta: el total de tu libro, con la queda de hoy como primera bolsa, nombrada. Antes callaba entero en los dos idiomas: nadie lo respondía.",
        "La conversión desnuda también convierte: «100 dólares a córdobas», dicho como orden de mostrador y sin voz de pregunta, usa la tasa de tu Mesa de cambio, con las cercas de siempre.",
        "Y si preguntas «¿cuánto gasté en comida o en efectivo?», la respuesta suma la comida y declara lo otro: tu libro no anota el medio de cada línea, así que esa parte no se puede medir — dicho, no callado.",
      ],
      en: [
        "“How much do I have?”, bare, now has an answer: your book's total, with today's left as its first bag, named. Before, it was wholly silent in both languages: nobody answered it.",
        "The bare conversion converts too: “100 dollars to cordobas”, said as a counter order with no question voice, uses your Exchange desk's rate, with the usual fences.",
        "And if you ask “how much did I spend on food or in cash?”, the answer adds up the food and declares the rest: your book doesn't record each line's payment method, so that side can't be measured — said, not silenced.",
      ],
    },
  },
  {
    version: "1.3.479",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El hilo sin veneno: cambiar de asunto en el seguimiento", en: "The thread, unpoisoned: switching subjects mid-follow-up" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si preguntas «¿cuánto gasté en el supermercado?» y luego «¿y en gasolina?», la respuesta ya es la de la gasolina. Antes el seguimiento no sabía cambiar de concepto y repetía la cifra anterior como si fuera la nueva.",
        "Cambiar de asunto sin nombrar período vuelve al período de tu pregunta original, y el eco lo declara. Si nombras un período en el mismo turno («¿y en gasolina el mes pasado?»), ese manda.",
        "Y cuando un ajuste no se puede aplicar, la explicación ya no trae las cifras de la pregunta anterior: explica los ejes que sí se pueden cambiar, sin presentar números viejos como respuesta.",
      ],
      en: [
        "If you ask “how much did I spend at the supermarket?” and then “and on gas?”, the answer is now the gas figure. Before, the follow-up couldn't switch concepts and repeated the previous figure as if it were the new one.",
        "Switching subjects without naming a period returns to your original question's period, and the echo says so. If you name a period in the same turn (“and on gas last month?”), that one rules.",
        "And when an adjustment can't be applied, the explanation no longer carries the previous question's figures: it explains the axes that can change, without presenting old numbers as the answer.",
      ],
    },
  },
  {
    version: "1.3.478",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El stock no es el flujo", en: "The stock is not the flow" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Cuánto ahorro tengo?» ya responde el total guardado («En ahorros tienes $…»), no el promedio de lo que apartas al mes. El stock y el flujo dejaron de confundirse: cada pregunta recibe su cifra.",
        "El flujo conserva su casa cuando trae su período: «¿cuánto ahorro al mes?», «¿cuánto guardo al mes?» y “how much do I save per month?” responden el promedio, como antes.",
      ],
      en: [
        "“How much savings do I have?” now answers the saved total (“In savings you have $…”), not the average of what you set aside per month. Stock and flow are no longer confused: each question gets its own figure.",
        "The flow keeps its home when it carries its period: “how much do I save per month?” answers the average, as before.",
      ],
    },
  },
  {
    version: "1.3.477",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Las anclas de un día: ayer es ayer", en: "One-day anchors: yesterday is yesterday" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«¿Cuánto gasté ayer?», «¿cuánto gasté hoy?» y «¿cuánto gasté el viernes pasado?» ya responden ese día, con su fecha nombrada en la respuesta. Antes caían al mes entero sin decirlo.",
        "«El fin de semana» también es el suyo: el sábado y el domingo últimos vividos, con sus fechas. Antes tomaba prestada la semana corriente y respondía otra cosa con el rótulo del fin de semana.",
        "Lo heredan el historial, el conteo, la frecuencia y la comparación: el día nombrado es un rango de un día en el motor de períodos, no un parche de una sola familia.",
      ],
      en: [
        "“How much did I spend yesterday?”, “today?” and “last Friday?” now answer that day, with its date named in the answer. Before, they fell back to the whole month without saying so.",
        "“The weekend” is its own too: the last Saturday and Sunday lived, with their dates. Before, it borrowed the current week and answered something else under the weekend's label.",
        "History, counting, frequency and comparisons all inherit it: the named day is a one-day range in the period engine, not a one-family patch.",
      ],
    },
  },
  {
    version: "1.3.476",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La batería del hilo: la conversación aguanta", en: "The thread battery: the conversation holds" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El seguimiento ya aguanta la reformulación: «¿y cuánto fue el mes pasado?» da la misma cifra y el mismo veredicto que «¿y el mes pasado?». La voz de pregunta es envoltura, no una pregunta nueva escondida.",
        "La corrección reemplaza: «en realidad quise decir septiembre» cambia el período y el hilo sigue desde ahí, sin caer en el mensaje de reparación. Y la suma añade: «muéstrame septiembre también» responde los dos períodos y declara que el primero no desaparece.",
        "La exclusión se revoca: tras «sin la renta», un «con la renta, mejor» vuelve a contarla y el eco declara el estado del filtro. Y todo seguimiento ahora nombra la pregunta que hereda («Viene de tu pregunta anterior («…»): …»): heredar declarándolo, nunca en silencio.",
      ],
      en: [
        "Follow-ups now survive rewording: “and how much was it last month?” gives the same figure and the same verdict as “and last month?”. The question voice is wrapping, not a hidden new question.",
        "Correction replaces: “actually, I meant September” changes the period and the thread continues from there, without falling into the repair message. And addition adds: “show me September too” answers both periods and declares the first one does not disappear.",
        "Exclusion can be revoked: after “without the rent”, a “with the rent, better” counts it again and the echo declares the filter's state. And every follow-up now names the question it inherits (“From your previous question (“…”): …”): inheriting by declaring it, never in silence.",
      ],
    },
  },
  {
    version: "1.3.475",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El instrumento se endurece: pares e invariancias", en: "The instrument hardens: pairs and invariances" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Tu historial ya oye el pretérito de recibir: «¿cuánto recibí?», «¿cuánto cobré?», «¿cuánto me pagaron?», «¿cuánto me depositaron?» y «¿cuánto dinero gané?» responden con lo que entró. Antes caían en silencio con el libro lleno.",
        "El umbral tiene dos lados: «gastos de más de $100» suma lo que supera la vara, igual que «de menos de $20» suma lo de abajo; lo que vale exactamente la vara no cae en ningún lado, y las dos mitades con el igual suman tu total exacto.",
        "Dos ciudadanos unidos se suman como unión: «¿cuánto gasté en comida y transporte?» nombra cada parte con su subtotal, y la excepción tiene su álgebra: «sin la comida, salvo el mercado» re-incluye el mercado, y «en salud, salvo la farmacia» excluye la farmacia del filtro. La comparación también lleva la exclusión en los dos meses.",
        "Y en el relato: «le pagué 50 a Juan» ya no asienta un gasto llamado «Le», y «Juan me pagó 50» ya se oye como el ingreso que es.",
      ],
      en: [
        "Your history now hears the preterite of receiving: “how much did I get paid?”, “how much was I deposited?” style forms in Spanish («¿cuánto recibí?», «¿cuánto cobré?», «¿cuánto me pagaron?») answer with what came in. Before, they fell silent with the book full.",
        "The yardstick has two sides: “expenses over $100” adds up what clears the bar, just as “under $20” adds up what's below; what is worth exactly the bar falls on neither side, and the two halves plus the equal sum your exact total.",
        "Two citizens joined add up as a union: “how much did I spend on food and transport?” names each part with its subtotal, and the exception has its algebra: “without food, except the market” re-includes the market, and “on health, except the pharmacy” excludes the pharmacy from the filter. Comparisons also carry the exclusion in both months.",
        "And in the telling: “le pagué 50 a Juan” no longer settles an expense called “Le”, and “Juan me pagó 50” is now heard as the income it is.",
      ],
    },
  },
  {
    version: "1.3.474",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La exclusión ya oye los dos idiomas", en: "Exclusion now hears both languages" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "La exclusión de tus preguntas ya es bilingüe: «sin la renta», «without the rent», «except the food», «excluding the car» y «minus the fees» restan lo mismo. Antes, con el operador en inglés, la palabra siguiente se volvía el blanco y la respuesta te daba justo la cifra de lo excluido: la cuenta salía invertida.",
        "Y la exclusión anunciada ahora sí excluye: si tu línea se llama «Renta» y tu subcategoría se llama «Rent», el nombre en cualquiera de los dos idiomas ata la misma línea, la lleve o no puesta la subcategoría.",
        "Un nombre de persona que también es un mes ya no secuestra el período: «¿cuánto le envié a April en mayo?» responde mayo, porque la preposición marca que April es la persona. Sin preposición, el mes manda como siempre.",
      ],
      en: [
        "Exclusion in your questions is now bilingual: “sin la renta”, “without the rent”, “except the food”, “excluding the car” and “minus the fees” all subtract the same. Before, with the operator in English, the next word became the target and the answer handed you the very figure of what you excluded: the sum came out inverted.",
        "And an announced exclusion now truly excludes: if your line is called “Renta” and your subcategory is called “Rent”, the name in either language binds the same line, whether or not the line carries the subcategory.",
        "A person's name that is also a month no longer hijacks the period: “how much did I send to April in May?” answers May, because the preposition marks April as the person. Without the preposition, the month rules as always.",
      ],
    },
  },
  {
    version: "1.3.473",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La calculadora desnuda y el quién con ventana", en: "The bare calculator and the who with a window" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "La calculadora ahora responde también la operación desnuda: «¿cuánto es 5 por 15?» da «5 por 15 es 75.», como número llano, en dígitos o en palabras y en los dos idiomas. La división y la resta entran igual, y dividir entre cero se dice imposible en llano.",
        "La forma está cercada: la pregunta entera tiene que ser la operación. Una cadena («5 por 15 más 3») no entra y no se finge, y «¿cuánto gasté menos la renta?» sigue siendo tu historia, no una resta.",
        "Y en remesas, el quién con ventana manda: «¿a quién le envié remesas el mes pasado?» responde la lista de ese período, cada destinatario con su suma y su conteo de envíos. Si en esa ventana no enviaste nada, lo dice y nombra tu último envío real.",
      ],
      en: [
        "The calculator now also answers the bare operation: “how much is 5 times 15?” gives “5 times 15 is 75.”, as a plain number, in digits or words and in both languages. Division and subtraction enter the same way, and dividing by zero is said to be impossible, plainly.",
        "The form is fenced: the whole question has to be the operation. A chain (“5 times 15 plus 3”) doesn't enter and isn't faked, and “how much did I spend minus the rent?” stays your history, not a subtraction.",
        "And in remittances, the who with a window rules: “who did I send remittances to last month?” answers with that period's list, each recipient with their sum and send count. If you sent nothing in that window, it says so and names your last real send.",
      ],
    },
  },
  {
    version: "1.3.472",
    date: "2026-11-26",
    level: "grande",
    title: { es: "La frontera, dicha en voz alta", en: "The frontier, said out loud" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Hay preguntas que tu Asesor no falla: en qué invertir, qué deducir de tus impuestos, si te pueden embargar, cómo subir tu puntaje, si rentar o comprar. Ahora lo dice en voz alta, explica por qué el límite te protege, y te da lo que tu libro sí responde del mismo tema, con su cifra.",
        "Para invertir, por ejemplo, no te da un consejo: te da la materia prima de tu libro, cuánto tienes apartado hoy y cuánto te queda libre este mes, para que decidas tú.",
        "Y las definiciones ya no van en el aire: «¿qué es el APR?» se define en palabras llanas y se ata a tus propias tarjetas, con lo que ese porcentaje te sale al mes sobre tu saldo de hoy. Si tu tarjeta no trae la tasa anotada, lo dice y no inventa ninguna.",
      ],
      en: [
        "Some questions your Advisor won't call: what to invest in, what to deduct from your taxes, whether they can garnish you, how to raise your score, whether to rent or buy. Now it says so out loud, explains why the limit protects you, and gives you what your book does answer on the same topic, with its figure.",
        "For investing, for example, it gives you no advice: it gives you the raw material from your book, how much you have set aside today and how much is left free this month, so the decision stays yours.",
        "And definitions no longer float: “what is APR?” is defined in plain words and tied to your own cards, with what that percent comes to per month on today's balance. If your card carries no rate recorded, it says so and invents none.",
      ],
    },
  },
  {
    version: "1.3.471",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La premisa con «tengo»: tu cifra manda", en: "The premise with “I have”: your figure rules" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si partes de lo que tienes («si tengo 300 en PayPal y gasto 100»), el Asesor corre la cuenta con tu cifra, declarada como premisa, y nunca la suma como si fuera un gasto más.",
        "Cuando nombras una cuenta, la nota confronta tu libro: si trae otra cifra en ese lugar, lo dice y te da también el resultado con la cifra del libro; si coinciden, lo dice; si no ata saldo a ese nombre, lo dice también.",
        "La forma ya no exige el «si»: «tengo 200 y gasto 50, ¿cuánto me queda?» se responde igual. Y si la frase trae una entrada además del gasto, la entrada también camina: la premisa es la base y cada movimiento entra con su signo.",
      ],
      en: [
        "If you start from what you have (“if I have 300 in PayPal and spend 100”), the Advisor runs the sum on your figure, stated as a premise, and never adds it in as if it were one more expense.",
        "When you name an account, the note checks your book: if it shows a different figure there, it says so and also gives you the result on the book's figure; if they agree, it says so; if no balance ties to that name, it says that too.",
        "The form no longer needs the “if”: “I have 200 and spend 50, how much is left?” is answered the same way. And if the sentence brings income beside the spending, the income walks too: the premise is the base and each movement enters with its sign.",
      ],
    },
  },
  {
    version: "1.3.470",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La pareja se reparte y la casa tiene su color", en: "The pair shares the row and the house has its color" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Los botones de confirmar y de «ahora no» ahora se reparten la fila entera de su tarjeta: cada uno con su parte igual, sin hueco muerto a un lado.",
        "La pregunta «¿Qué puede hacer el asesor?» estrena color propio, distinto del amarillo de confirmar, para que no se confundan: cada tema lo dice con su paleta, y lleva la brújula del Asesor al frente.",
        "El botón de crear en tu estructura se queda como estaba: único, ancho y con su aire.",
      ],
      en: [
        "The confirm and \"not now\" buttons now share the whole row of their card: each with its equal part, no dead gap at one side.",
        "The \"What can the advisor do?\" question gets its own color, distinct from the confirm yellow, so they're never confused: each theme voices it with its own palette, and it carries the Advisor's compass up front.",
        "The create-in-your-structure button stays as it was: unique, wide and with its air.",
      ],
    },
  },
  {
    version: "1.3.469",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El hipotético cerrado: la cuenta de la pregunta misma", en: "The closed hypothetical: the question's own sum" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "«Si tengo 200 pesos y los gasto, ¿cuánto me queda?» ya se responde con la aritmética de la pregunta: te quedan C$0.00, en la moneda de la pregunta y sin tocar tu libro.",
        "El sobregasto se dice en llano: si gastas más de lo que traes, la respuesta dice cuánto más gastarías.",
        "Si el punto de partida vive en una cuenta nombrada, la forma no se cierra: esa pregunta es de tu libro y la juzgan sus ramas.",
      ],
      en: [
        "\"If I have 200 pesos and I spend them, how much is left?\" is now answered with the question's own arithmetic: you'd have C$0.00 left, in the question's currency and without touching your book.",
        "Overspending is said plainly: if you spend more than you bring, the answer says how much more you'd spend.",
        "If the starting point lives in a named account, the form doesn't close: that question belongs to your book and its branches judge it.",
      ],
    },
  },
  {
    version: "1.3.468",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Las preguntas de la casa: el cómo se hace", en: "Questions about the house: how things are done" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El Asesor ahora responde el cómo se hace dentro de Faro: cómo anotas a mano, cómo importas, cómo das de alta una tarjeta, cómo creas una meta, cómo armas el plan de pagos, cada respuesta con su pantalla y su puerta.",
        "El idioma se cambia en Ajustes y ya no se confunde con la Mesa de cambio: preguntarlo por su nombre lleva a su casa.",
        "Y la casa dice su verdad negativa: marcar un gasto como compartido todavía no se puede, y te dice lo más cercano que hoy sí existe.",
      ],
      en: [
        "The Advisor now answers how things are done inside Faro: how you write by hand, how you import, how you register a card, how you create a goal, how you build the payoff plan, each answer with its screen and its door.",
        "The language is changed in Settings and is no longer confused with the Exchange desk: asking for it by name leads to its home.",
        "And the house states its negative truth: marking an expense as shared can't be done yet, and it tells you the closest thing that exists today.",
      ],
    },
  },
  {
    version: "1.3.467",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El reparto sobre lo anotado, dicho con honestidad", en: "Splits over what's recorded, answered honestly" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Si preguntas cuánto puso cada uno en un gasto que ya anotaste, el Asesor te dice el total que salió de tu mano, entero, y nombra lo que falta: ninguna línea marca todavía si fue compartida ni entre cuántos.",
        "Nunca parte un total entre personas imaginadas: sin la marca en la línea, cualquier parte sería inventada.",
        "La marca de gasto compartido ya quedó especificada para construirse en la captura; cuando exista, esta misma pregunta responderá con la parte de cada uno.",
      ],
      en: [
        "If you ask how much each person put in for an expense you already recorded, the Advisor tells you the whole total that left your hand and names what's missing: no line yet marks whether it was shared or among how many.",
        "It never splits a total among imagined people: without the mark on the line, any share would be invented.",
        "The shared-expense mark is already specified to be built into capture; when it exists, this same question will answer with each person's share.",
      ],
    },
  },
  {
    version: "1.3.466",
    date: "2026-11-26",
    level: "menor",
    title: { es: "La vigilancia aprende tres avisos más", en: "The watch learns three more flags" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Cuando preguntas qué cambió en tu libro, el Asesor ahora también avisa de un cobro repetido: la misma serie cobrando el mismo monto dos veces en el mes, dicho sin acusar, porque repetido no es automáticamente un error.",
        "Avisa del primer cobro de un compromiso nuevo: la primera vez que una suscripción o un cargo fijo aparece en tu libro.",
        "Y avisa del descubierto: cuando lo que vence en los próximos 14 días supera lo que hoy te queda del mes, nombra cuánto falta.",
      ],
      en: [
        "When you ask what changed in your book, the Advisor now also flags a repeated charge: the same series charging the same amount twice in the month, said without accusing, because repeated isn't automatically an error.",
        "It flags the first charge of a new commitment: the first time a subscription or a fixed charge appears in your book.",
        "And it flags an uncovered due: when what comes due in the next 14 days exceeds what's left of your month today, it names how much is short.",
      ],
    },
  },
  {
    version: "1.3.465",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Los botones de la confirmación, con su forma", en: "The confirmation buttons, in their shape" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Cuando el Asesor te ofrece crear algo en tu estructura, ese botón ya es un botón único, a lo ancho de la tarjeta y con aire sobre la pregunta, no un chip más.",
        "«Asentarlo así» y las demás confirmaciones ahora son botones llenos con el color de tu tema, y «Ahora no» un botón tranquilo a su lado.",
        "La forma sigue a tu tema: en Cyberpunk los botones se cuadran, como sus ventanas.",
      ],
      en: [
        "When the Advisor offers to create something in your structure, that button is now a unique button, across the card and with air above the question, not one more chip.",
        "“Post it like this” and the other confirmations are now filled buttons in your theme's color, with “Not now” as a quiet button beside them.",
        "The shape follows your theme: in Cyberpunk the buttons square up, like its windows.",
      ],
    },
  },
  {
    version: "1.3.464",
    date: "2026-11-26",
    level: "grande",
    title: { es: "Tu tasa de ahorro, contra la referencia", en: "Your savings rate, against the reference" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Pregunta «¿cuál es mi tasa de ahorro?» y el Asesor la mide de tu libro: lo apartado entre lo que entró, con su derivación a la vista.",
        "La tasa se juzga contra dos referencias, en orden: primero tu propio promedio medido, y después la guía — la tuya si fijaste una en tu libro; si no, la regla publicada 50·30·20, nombrada como referencia y nunca como sentencia.",
        "También responde «¿qué porcentaje de mi ingreso ahorro?» y «¿estoy ahorrando lo suficiente?», y dice la tendencia contra el mes anterior cuando existe.",
        "Sin ingreso anotado no inventa porcentajes: dice que no hay tasa que medir.",
      ],
      en: [
        "Ask “What is my savings rate?” and the Advisor measures it from your book: what you set aside divided by what came in, with the working shown.",
        "The rate is judged against two references, in order: first your own measured average, then the guide — yours if you set one in your book; if not, the published 50·30·20 rule, named as a reference and never as a sentence.",
        "It also answers “What percentage of my income do I save?” and “Am I saving enough?”, and tells the trend against the month before when there is one.",
        "With no income recorded it invents no percentages: it says there's no rate to measure.",
      ],
    },
  },
  {
    version: "1.3.463",
    date: "2026-11-26",
    level: "menor",
    title: { es: "Sin repetir: la palabra corona la tarjeta", en: "No repeats: the word crowns the card" },
    topic: "asesor-relato",
    points: {
      es: [
        "La confirmación ya no repite lo mismo dos veces: el eco dice «Esto es lo que entendí» y su pregunta, y cada tarjetita lleva arribita su palabra — Gasto, Ingreso o Mover — con su fecha y su cuenta adentro cuando hacen falta.",
      ],
      en: [
        "Confirmation no longer says the same thing twice: the echo gives “Here's what I understood” and its question, and each little card wears its word on top — Expense, Income or Move — with its date and account inside when they're needed.",
      ],
    },
  },
  {
    version: "1.3.462",
    date: "2026-11-26",
    level: "menor",
    title: { es: "El eco, con su aire", en: "The echo, with room to breathe" },
    topic: "asesor-relato",
    points: {
      es: [
        "El eco de confirmación respira mejor: una línea de por medio tras «Esto es lo que entendí:» y otra antes de la pregunta, y el monto se separa con un guion corto — «Gasto: Chocolate - $6» — en vez del segundo dos puntos.",
      ],
      en: [
        "The confirmation echo breathes better: a blank line after “Here's what I understood:” and another before the question, and the amount is set off with a short dash — “Expense: Chocolate - $6” — instead of the second colon.",
      ],
    },
  },
  {
    version: "1.3.461",
    date: "2026-11-25",
    level: "grande",
    title: { es: "Pregunta por un cargo suelto", en: "Ask about a single charge" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El Asesor ya responde por UN cargo: «¿cuál fue el cargo de Amazon?», «¿de qué es el cargo de $49.99?» — te lo identifica con lo que tu libro sabe de él: nombre, categoría, monto y fecha.",
        "Si no reconoces un cargo, dilo tal cual: «tengo un cargo de $12.34 que no reconozco». Te muestra lo anotado y te dice el límite con claridad: la disputa va con el banco que lo cobró; el libro guarda lo que se anotó, no juzga si un cargo es legítimo.",
        "También oye «¿me cobraron dos veces el internet?» y «¿de qué cuenta salió este cargo?»: si hay dos cobros iguales te los compara con sus fechas, y la cuenta o tarjeta de origen solo se nombra si la línea la trae anotada — si no, se dice que el libro no lo guarda.",
      ],
      en: [
        "The Advisor now answers about a SINGLE charge: “what was the Amazon charge?”, “what is the $49.99 charge?” — it identifies it with what your book knows about it: name, category, amount and date.",
        "If you don't recognize a charge, say it just like that: “I don't recognize a $12.34 charge”. It shows you what's recorded and states the limit plainly: the dispute goes to the bank that charged it; the book keeps what was recorded, it doesn't judge whether a charge is legitimate.",
        "It also hears “was I charged twice for the internet?” and “which account did this charge come from?”: if there are two matching charges it compares them with their dates, and the source account or card is named only if the line carries it — otherwise it says the book doesn't keep it.",
      ],
    },
  },
  {
    version: "1.3.460",
    date: "2026-11-25",
    level: "grande",
    title: { es: "Las órdenes también se oyen", en: "Orders are heard too" },
    topic: "asesor-relato",
    points: {
      es: [
        "Ya puedes ordenar en vez de contar: «mueve 200 pesos de meta a emergencia» e «ingresa 500 pesos a mi cuenta» se oyen como lo que son y llegan como borrador, con tu confirmación antes de asentarse — oír la orden la propone, no la ejecuta.",
        "La moneda que nombras manda sobre la frase entera: en «compré un pollo por 20 pesos y una licuadora por 300», el 300 también es en pesos, no en la moneda del libro.",
        "El cierre «añádelos a mi cuenta» ya no se vuelve una cosa más que asentar: es el marco de tu relato, no un gasto. Y si a una orden le falta el origen o el destino, la pregunta nombra esa casilla — «¿de dónde salió?», «¿a dónde fue?» — en vez de callar.",
      ],
      en: [
        "You can now give orders instead of telling stories: “move 200 pesos from savings goal to emergency” and “deposit 500 pesos into my account” are heard for what they are and arrive as a draft, with your confirmation before anything posts — hearing the order proposes it, it does not execute it.",
        "The currency you name rules the whole sentence: in “I bought a chicken for 20 pesos and a blender for 300”, the 300 is in pesos too, not in the book's currency.",
        "The closing “add them to my account” no longer becomes one more thing to post: it is the frame of your story, not an expense. And if an order is missing its origin or its destination, the question names that slot — “where from?”, “where to?” — instead of going silent.",
      ],
    },
  },
  {
    version: "1.3.459",
    date: "2026-11-25",
    level: "grande",
    title: { es: "El relato, con su tiempo", en: "Your story, with its time" },
    topic: "asesor-relato",
    points: {
      es: [
        "La confirmación de tu relato ahora se lee como las tarjetas: cada cosa en su propia línea y el monto separado con dos puntos — «Gasto: Comida: $200.00» — sin textos corridos cosidos con guiones.",
        "Cada parte de tu relato trae su propia fecha: «el mes pasado», «antier», «hace 2 días», «la semana pasada» — y el número del tiempo nunca se asienta como dinero: el 2 de «hace 2 días» ya no nace como un gasto de $2. Lo mismo en inglés: «2 days ago», «last week».",
        "Lo que cuentas en futuro no se asienta como si ya hubiera pasado: «mañana pago 60 de internet» se programa una sola vez, con su fecha, y «añadí 300 a mi banco» se oye como lo que es: dinero que entra.",
      ],
      en: [
        "Your story's confirmation now reads like the cards: each thing on its own line and the amount set off with a colon — “Expense: Food: $200.00” — no more run-on text stitched with dashes.",
        "Each part of your story carries its own date: “last month”, “day before yesterday”, “2 days ago”, “last week” — and the time's number is never posted as money: the 2 in “2 days ago” no longer becomes a $2 expense. The same in Spanish: “hace 2 días”, “la semana pasada”.",
        "What you tell in the future is not posted as if it had already happened: “tomorrow I'll pay 60 for internet” is scheduled once, with its date, and “I added 300 to my bank” is heard for what it is: money coming in.",
      ],
    },
  },
  {
    version: "1.3.458",
    date: "2026-11-25",
    level: "menor",
    title: { es: "La voz del «hay»", en: "The “is there” voice" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Preguntar «¿cuánto billete hay?» ya tiene respuesta: es el mismo total de tu dinero — la queda de hoy, tus ahorros y lo que te deben — con cada bolsa nombrada y su cifra. Antes esa forma callaba aunque el libro tuviera dinero.",
        "Su par en inglés también entra: «how much money is there?» y «how much cash is there?» preguntan por el mismo total.",
      ],
      en: [
        "Asking “how much cash is there?” now gets its answer: the same total of your money — what's left today, your savings and what's owed to you — with each bag named and its figure. Before, that form stayed silent even with money in the book.",
        "Its Spanish twin came in too: “¿cuánto billete hay?” asks for the same total.",
      ],
    },
  },
  {
    version: "1.3.457",
    date: "2026-11-25",
    level: "grande",
    title: { es: "El Asesor oye tus erratas", en: "The Advisor hears your typos" },
    topic: "asesor-relato",
    points: {
      es: [
        "Cuando le cuentas al Asesor lo que ya hiciste — un gasto, un ingreso, un movimiento — una letra caída o cambiada en el verbo ya no tumba el relato: «paué la luz 45» se entiende y se asienta como la luz.",
        "Lo mismo al programar, al dar una orden y al crear algo nuevo: «apga los avisos» apaga los avisos, y las respuestas del diálogo de creación se oyen aunque vengan con errata.",
        "Un «por favor» al final ya no se vuelve una cosa más que asentar, y si olvidas las comas de una lista, cada monto se queda con su cosa: «luz 45 agua 30 internet 50» asienta las tres, cada una con lo suyo.",
        "Los nombres de tu libro nunca se «corrigen»: la palabra del idioma manda primero y tus cuentas y categorías se leen tal como las llamas.",
      ],
      en: [
        "When you tell the Advisor what you already did — an expense, an income, a move — a dropped or swapped letter in the verb no longer kills the story: “paué la luz 45” is understood and posts as the power bill.",
        "The same when scheduling, giving an order and creating something new: “apga los avisos” turns the alerts off, and the creation dialogue hears your answers even with a typo in them.",
        "A “please” at the end no longer becomes one more thing to post, and if you skip the commas in a list, each amount keeps its own thing: “luz 45 agua 30 internet 50” posts all three, each with its own.",
        "Your book's names are never “corrected”: the language's word rules first, and your accounts and categories are read exactly as you call them.",
      ],
    },
  },
  {
    version: "1.3.456",
    date: "2026-11-25",
    level: "grande",
    title: { es: "La caja obedece", en: "The box obeys" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Tu pregunta ahora trae un lapicito en su esquina: tócalo y lo que preguntaste vuelve a la caja tal como lo escribiste, para corregirlo sin reescribirlo. La respuesta se queda en pantalla hasta que envíes la nueva versión.",
        "Lo que le cuentas al Asesor para asentar, programar u ordenar ya no desaparece: tu texto queda arriba, en su tarjeta, igual que cuando preguntas, mientras decides si se hace.",
        "El resumen de lo que el Asesor entendió de tu relato ahora se lee en sus renglones, uno por cosa, en el mismo orden en que abajo ves cada borrador con su monto.",
        "Cuando una respuesta te propone acciones abajo — enviarlo como remesa, convertirlo, dejarlo en la bandeja — los botones ahora sí están: antes la respuesta los prometía y la caja no los mostraba.",
      ],
      en: [
        "Your question now carries a little pencil in its corner: tap it and what you asked returns to the box exactly as you wrote it, so you can fix it without retyping. The answer stays on screen until you send the new version.",
        "What you tell the Advisor to post, schedule or carry out no longer disappears: your words stay on top, in their card, just as when you ask, while you decide whether it happens.",
        "The summary of what the Advisor understood from your story now reads in its own lines, one per thing, in the same order as the drafts you see below with their amounts.",
        "When an answer proposes actions below — send it as a remittance, convert it, leave it in the tray — the buttons are now actually there: before, the answer promised them and the box never showed them.",
      ],
    },
  },
  {
    version: "1.3.455",
    date: "2026-11-25",
    level: "grande",
    title: { es: "Escribir ya no se pega", en: "Typing no longer sticks" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Escribir ya no se pega: cuando empiezas a escribir en cualquier campo, la app pausa las animaciones de la decoración que estén corriendo, y vuelven en cuanto terminas. El tema se ve exactamente igual; solo deja de moverse mientras tecleas.",
        "La causa era una pelea: cada tecla competía contra el repintado continuo de la decoración del tema, y en los temas con mucho movimiento el texto se quedaba atrás, tramo a tramo, hasta que la app podía llegar a cerrarse.",
        "Vale en todas partes donde escribes: la pregunta del Asesor, los campos de Anotar, los ajustes. La regla es de toda la app y de todo tema: escribir manda sobre decorar.",
        "Nada de lo que escribes cambia con la pausa: es solo la decoración la que se calla, y lo que el campo muestra y hace mientras escribes queda intacto.",
      ],
      en: [
        "Typing no longer sticks: when you start writing in any field, the app pauses the decorative animations that are running, and they come back as soon as you finish. The theme looks exactly the same; it just stops moving while you type.",
        "The cause was a fight: every keystroke competed against the theme decoration's constant repainting, and in the busiest themes the text fell behind, stretch by stretch, until the app could even be closed by the system.",
        "It holds everywhere you write: the Advisor's question, the fields in Add, the settings. The rule belongs to the whole app and every theme: writing outranks decorating.",
        "Nothing you write changes with the pause: only the decoration goes quiet, and what the field shows and does while you write stays untouched.",
      ],
    },
  },
  {
    version: "1.3.454",
    date: "2026-11-25",
    level: "grande",
    title: { es: "Tu ortografía ya no mata la pregunta", en: "Your spelling no longer kills the question" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Escribe como escribes: «¿cuánto ahoro tengo?», «¿cuánto me quda este mes?» o «¿estoy palado?» se entienden igual — el Asesor repara la letra caída o cambiada en la palabra que abre la puerta, en español y en inglés, antes de juzgar tu pregunta.",
        "La reparación es cuidadosa: si una palabra podría ser dos, no se toca; los nombres de tu libro (tus cuentas, tus bolsillos, tus personas) están protegidos y jamás se “corrigen”; y las palabras que ya son palabras de verdad nunca se tratan como erratas.",
        "La forma tampoco mata: «dime cuánto gasto», «quiero saber cuánto me queda» o la misma pregunta sin signos y sin «por favor» llegan a la misma respuesta — la envoltura de la pregunta no es la pregunta.",
        "Y el dinero se oye con su nombre de todos los días: «¿tengo billete?» te responde que sí o que no, con tu cifra total delante.",
      ],
      en: [
        "Write the way you write: “how much do I have lfet this month?”, “Am I brke?” — the Advisor repairs the dropped or swapped letter in the word that opens the door, in English and Spanish, before judging your question.",
        "The repair is careful: if a word could be two words, it's left untouched; your book's names (your accounts, pockets and people) are protected and never “corrected”; and words that are already real words are never treated as typos.",
        "The wrapping doesn't kill it either: “tell me how much I spend”, the same question with no question marks and no “please” — all reach the same answer. The wrapping of the question is not the question.",
        "And money is heard by its everyday name: “do I have any cash?” gets a yes or a no, with your total figure in front.",
      ],
    },
  },
  {
    version: "1.3.453",
    date: "2026-11-25",
    level: "grande",
    title: { es: "El área de ahorros, mapeada entera", en: "The savings area, fully mapped" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "La clase que nombras manda su cifra: «¿cuánto tengo en mi fondo de emergencia?», «¿cuánto me falta para mi meta?» y «¿cuánto hay en mi retiro?» se responden con la cifra de esa clase — el total llega de escolta, nunca en su lugar.",
        "Sacar y meter con nombre: «¿puedo sacar $100 de PayPal?», «si aparto $100 más a mi emergencia, ¿cuánto tendría?» — el movimiento se mide contra la cifra del blanco que nombras, no contra todo tu guardado.",
        "Las comparaciones del ahorro se responden: «¿tengo más en el Banco o en PayPal?» trae las dos cifras y su diferencia, y «¿en qué cuenta tengo más dinero?» compite solo entre cuentas.",
        "Familia nueva: el seguro de vida. Cuánto pagas de prima, cuándo se cobra, de qué cuenta sale, quién es el beneficiario y desde cuándo lo tienes salen de tu pieza — y la ley queda dicha: la póliza no es un ahorro, no guarda saldo y no suma en ningún total.",
      ],
      en: [
        "The class you name rules its figure: “how much do I have in my emergency fund?”, “how much am I missing for my goal?” and “how much is in my retirement?” are answered with that class's figure — the total comes along as escort, never in its place.",
        "Taking out and putting in by name: “can I take $100 from PayPal?”, “if I set $100 more aside into my emergency fund, how much would I have?” — the move is measured against the figure of the target you name, not against all your savings.",
        "Savings comparisons are answered: “do I have more in the Bank or in PayPal?” brings both figures and their difference, and “which account holds the most money?” competes only among accounts.",
        "A new family: life insurance. How much premium you pay, when it's charged, which account it comes from, who the beneficiary is and since when you've had it come from your piece — and the law is stated: the policy is not savings, holds no balance and adds into no total.",
      ],
    },
  },
  {
    version: "1.3.452",
    date: "2026-11-25",
    level: "grande",
    title: { es: "Cada monto obedece a su verbo", en: "Every amount obeys its verb" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "El Asesor ya oye el porcentaje en palabras: «el quince por ciento de mil quinientos» y «ten percent of three hundred» tienen su respuesta, en dígitos o en letras.",
        "Cada monto obedece a su verbo: si ingresas 200 y gastas 100, ya no sale un gasto de 300 — la diferencia se dice firmada, a tu favor o en tu contra, y apartar a ahorros sigue siendo tuyo.",
        "Familia nueva: la proyección de ahorro. «Si aparto $100 cada semana, ¿cuánto tendría a fin de año?» se responde con tu guardado de hoy más los aportes completos que caben, con el supuesto dicho y su camino dibujado. Sin cadencia, el Asesor pregunta cada cuánto en vez de adivinar.",
        "Las preguntas de dos hechos se responden enteras: la última paga y la próxima (fechada de tu libro, nunca inventada), los dos extremos con su diferencia, y el juicio de las dos cosas — lo apartado y el gasto, medidos por separado.",
      ],
      en: [
        "The Advisor now hears percentages in words: “fifteen percent of fifteen hundred” and “el quince por ciento de mil quinientos” get their answer, in digits or in letters.",
        "Every amount obeys its verb: if you take in 200 and spend 100, it no longer comes out as 300 spent — the difference is stated signed, in your favor or against you, and setting money aside into savings keeps it yours.",
        "A new family: the savings projection. “If I save $100 each week, how much would I have by the end of the year?” is answered with today's savings plus the full set-asides that fit, the assumption stated and its path drawn. With no pace given, the Advisor asks how often instead of guessing.",
        "Two-fact questions are answered whole: the last pay and the next one (dated from your book, never invented), both extremes with their difference, and the judgment of the two things — what's set aside and what's spent, measured separately.",
      ],
    },
  },
  {
    version: "1.3.451",
    date: "2026-11-25",
    level: "menor",
    title: { es: "Seguir preguntando, con mejor memoria", en: "Asking on, with a better memory" },
    points: {
      es: [
        "Puedes excluir dos cosas en una misma pregunta de historia: «sin el carro y sin la renta» resta las dos y nombra cada una con su cifra. En inglés, el «without» de la pregunta fresca también se oye.",
        "Las comparaciones con el año pasado llegan a su puerta: «¿y el año pasado?» sirve solo ese lado, con su cifra verdadera, y el porqué que sigue cita la exclusión que sigue viva, no la que ya cambiaste.",
        "El tiempo también se oye en palabras: «hace un mes», «hace una semana» y «a month ago» sirven su período. Y si lo que excluiste ya no está en tu libro, el seguimiento calla esa parte en vez de arrastrar una cifra fantasma.",
      ],
      en: [
        "You can leave two things out of one history question: “without the car and without the rent” takes both out and names each one with its figure. A fresh question's “without” is heard in English too.",
        "Comparisons with last year reach their door: “and last year?” serves only that side, with its true figure, and the why that follows quotes the exclusion that's still alive, not the one you already changed.",
        "Time is heard in words too: “a month ago”, “a week ago” and “hace un mes” serve their period. And if what you left out is no longer in your book, the follow-up goes quiet on that part instead of dragging a phantom figure along.",
      ],
    },
  },
  {
    version: "1.3.450",
    date: "2026-11-24",
    level: "grande",
    title: { es: "Las figuras se dibujan", en: "The figures are drawn" },
    topic: "preguntar-asesor",
    points: {
      es: [
        "Cuando la cifra de una respuesta es una forma, la respuesta ahora la DIBUJA bajo sus piezas: el camino de tu saldo día a día, con su día más bajo marcado, cuando preguntas si llegas a fin de mes.",
        "La escala de tu colchón y de tu meta, con su piso y su mediana como muescas. El mapa de tus meses de ingreso y de gasto, con el mejor mes encendido y las líneas de tu piso y tu mediana.",
        "Dos caminos lado a lado — avalancha contra bola de nieve, tu ritmo contra el pago que ensayas —, el árbol de un porqué con el signo de cada pieza, y las barras que suman tu queda: una barra partida cuando las piezas suman el total.",
        "Todo se dibuja con los números reales de tu libro y los colores de tu tema, y la brecha sigue nombrada en palabras junto a la figura. Donde una cifra no se puede medir con exactitud, la respuesta no trae figura: el texto manda.",
      ],
      en: [
        "When an answer's number is a shape, the answer now DRAWS it under its pieces: the path of your balance day by day, with its lowest day marked, when you ask whether you'll make it to month's end.",
        "The scale of your cushion and of your goal, with its floor and median as notches. The map of your income and spending months, with the best month lit and the lines of your floor and your median.",
        "Two paths side by side — avalanche against snowball, your pace against the payment you're trying on —, the tree of a why with the sign of each piece, and the bars that add up to what's left: one split bar when the pieces sum the total.",
        "Everything is drawn with your book's real numbers and your theme's colors, and the gap stays named in words beside the figure. Where a number cannot be measured exactly, the answer carries no figure: the text rules.",
      ],
    },
  },
  {
    version: "1.3.449",
    date: "2026-11-24",
    level: "menor",
    title: { es: "Las figuras, declaradas", en: "The figures, declared" },
    points: {
      es: [
        "El banco del Asesor ya declara la figura de cada respuesta cuya cifra es una forma: el camino de tu saldo día a día, la escala de tu colchón, el mapa de tus meses, dos caminos lado a lado, el árbol de un porqué y las barras que suman tu queda.",
        "Cada figura se declara con los números reales de tu libro — las piezas de una figura de barras suman su total, centavo a centavo — y donde una cifra no se puede medir con exactitud, la respuesta no trae figura: el texto honesto manda.",
        "Todavía no se dibujan: el dibujo, con los colores de tu tema, llega en la próxima versión. Esta deja las figuras declaradas y cercadas, una por una, dentro del motor.",
      ],
      en: [
        "The Advisor's bank now declares the figure of every answer whose number is a shape: the path of your balance day by day, the scale of your cushion, the map of your months, two paths side by side, the tree of a why, and the bars that add up to what's left.",
        "Each figure is declared with your book's real numbers — the pieces of a bars figure sum their total, cent by cent — and where a number cannot be measured exactly, the answer carries no figure: honest text rules.",
        "They aren't drawn yet: the drawing, in your theme's colors, arrives in the next version. This one leaves the figures declared and fenced, one by one, inside the engine.",
      ],
    },
  },
  {
    version: "1.3.448",
    date: "2026-11-24",
    level: "grande",
    title: { es: "Crear preguntando", en: "Creating by asking" },
    topic: "asesor-relato",
    points: {
      es: [
        "Si cuentas algo que tu estructura no conoce — «pagué 80 de jardinería» — el Asesor ya no lo deja sin ubicar: la tarjeta del relato trae el botón para crear ese lugar, con tu nombre tal como lo escribiste.",
        "Crear es preguntar: primero, si ya tienes algo con el mismo nombre o casi, te pregunta si es esa misma o una nueva — ningún duplicado entra sin que lo decidas sabiéndolo.",
        "Después pregunta solo lo que el relato no sabe: si es de gasto, de ingreso o de ahorro, y si va como categoría nueva o bajo una que ya tienes. Lo que tu verbo ya dijo — «pagué» es gasto — no se pregunta.",
        "La creación nace como borrador con su eco, como todo en la caja, y tu movimiento queda ubicado en la pieza nueva. También puedes pedirlo directo: «crea una categoría jardinería». Todo queda explicado en el Manual, en «Contarle al Asesor».",
      ],
      en: [
        "If you tell something your structure doesn't know — “I paid 80 for gardening” — the Advisor no longer leaves it unplaced: the story card brings the button to create that place, with your name spelled the way you wrote it.",
        "Creating is asking: first, if you already have something with the same name or nearly, it asks whether it's that same one or a new one — no duplicate comes in without your deciding it knowingly.",
        "Then it asks only what the story doesn't already say: whether it's for spending, income or saving, and whether it goes as a new category or under one you already have. What your verb already said — “I paid” is spending — is not asked.",
        "The creation is born as a draft with its echo, like everything in the box, and your movement ends up placed in the new piece. You can also ask directly: “create a category gardening”. It's all explained in the Manual, under “Telling the Advisor”.",
      ],
    },
  },
  {
    version: "1.3.447",
    date: "2026-11-24",
    level: "grande",
    title: { es: "El Asesor también obedece", en: "The Advisor takes orders too" },
    topic: "asesor-relato",
    points: {
      es: [
        "Ahora el Asesor también obedece órdenes sobre lo que ya tienes anotado: «archiva la luz» aparta esa línea al Archivo, nombrada con su monto y su fecha para que confirmes esa y no otra.",
        "Corregir es contar el arreglo: «corrige la luz, no fueron 45, fueron 50» cambia el monto, y «mueve la luz al día 15» cambia su fecha — siempre con su eco y tu sí antes de tocar el libro.",
        "Preguntar «¿dónde está el dato de la luz?» no toca nada: te dice dónde vive — en el historial, en la Bandeja o en tu estructura.",
        "Y cambia seis ajustes si se los nombras: la moneda de vista, el idioma, el modo, la tasa, las notificaciones y los avisos de pagos — cada uno con su antes y su después. Todo queda explicado en el Manual, en «Contarle al Asesor».",
      ],
      en: [
        "Now the Advisor also takes orders about what you already have posted: “archive the power bill” sets that line aside into the Archive, named with its amount and its date so you confirm that one and not another.",
        "Correcting is telling the fix: “correct the power bill, it wasn't 45, it was 50” changes the amount, and “move the power bill to day 15” changes its date — always with its echo and your yes before the book is touched.",
        "Asking “where is the power bill entry?” touches nothing: it tells you where it lives — in the history, in the Tray or in your structure.",
        "And it changes six settings if you name them: the display currency, the language, the mode, the rate, the notifications and the payment alerts — each with its before and after. It's all explained in the Manual, under “Telling the Advisor”.",
      ],
    },
  },
  {
    version: "1.3.446",
    date: "2026-11-24",
    level: "grande",
    title: { es: "Programar contándolo", en: "Scheduling by telling" },
    topic: "asesor-relato",
    points: {
      es: [
        "La misma caja del Asesor ahora también mira adelante: dile «programa la luz 45 cada mes el día 1» y nace el borrador de dejarlo programado — su monto, su cadencia y su primera fecha — cada uno con su tarjetita, como el relato.",
        "Nada se programa sin tu sí: la tarjeta te repite lo oído y pregunta «¿Lo dejo programado así?». Con «Dejarlo programado» queda escrito como una línea fija de su mes; con «Ahora no», nada se toca. Lo que ya estaba programado no se programa dos veces: su tarjetita lo dice.",
        "Sin monto no inventa ninguno: «recuérdame pagar la luz cada mes» queda como solo recordatorio — Faro recuerda y el monto se confirma cuando llega, como pasa con la luz de verdad.",
        "Y si falta el cuándo — ni cadencia ni fecha — pregunta antes de programar: sin eso no sabe cómo dejarlo programado.",
      ],
      en: [
        "The Advisor's same box now also looks ahead: say “schedule the power bill 45 every month on day 1” and the draft to schedule it is born — its amount, its cadence and its first date — each with its own little card, like the story.",
        "Nothing is scheduled without your yes: the card repeats what it heard and asks “Shall I schedule it like this?”. With “Schedule it” it is written as a fixed line of its month; with “Not now”, nothing is touched. What was already scheduled is never scheduled twice: its little card says so.",
        "With no amount it invents none: “remind me to pay the power bill every month” stays as a reminder only — Faro remembers, and the amount is confirmed when it arrives, the way the real power bill works.",
        "And if the when is missing — no cadence and no date — it asks before scheduling: without that it doesn't know how to schedule it.",
      ],
    },
  },
  {
    version: "1.3.445",
    date: "2026-11-24",
    level: "grande",
    title: { es: "El relato que se asienta", en: "The story that posts itself" },
    topic: "asesor-relato",
    points: {
      es: [
        "Ahora le puedes CONTAR al Asesor lo que ya hiciste en tu banco, de un tirón: «moví 200 del banco al colchón, pagué la luz 45 y me entró el salario 1200». Lo oye como un relato y te lo devuelve en borradores, cada uno con su tarjetita y ubicado en tu libro cuando tu libro ya lo conoce.",
        "Nada se asienta sin tu sí: la tarjeta te repite lo oído en palabras llanas y pregunta «¿Lo asiento así?». Con tu toque queda escrito en tu libro; con «Ahora no», nada se toca. Y lo que ya estaba asentado ese día no se asienta dos veces: su tarjetita lo dice.",
        "Si falta un dato — el monto, el concepto, el destino de un traslado — pregunta por ese dato y no adivina. Asentar en la cuenta equivocada es el error que esta capacidad no comete.",
        "También entiende tu forma de hablar: «me comí un pollo con tajadas, quedé palmado, vale 150» asienta el gasto de comida por 150, y lo de «palmado» se escucha como forma de hablar, no como un dato. Y si le preguntas «¿estoy palmado?» o «¿tengo un dineral?», responde el juicio contra tu libro: lo que te queda contra los pagos que aún vienen.",
      ],
      en: [
        "Now you can TELL the Advisor what you already did at your bank, all at once: “I moved 200 from the bank to my mattress, paid the power bill 45 and my salary 1200 came in”. It hears it as a story and hands it back as drafts, each with its own little card, filed in your book when your book already knows it.",
        "Nothing posts without your yes: the card repeats what it heard in plain words and asks “Shall I post it like this?”. With your tap it is written into your book; with “Not now”, nothing is touched. And what was already posted that day is never posted twice: its little card says so.",
        "If a fact is missing — the amount, the concept, a move's destination — it asks for that fact and does not guess. Posting into the wrong account is the one error this capability does not make.",
        "It also understands your way of speaking: “I ate a chicken with plantains, I'm wiped out, it was 150” posts the 150 food spend, and the “wiped out” is heard as a way of speaking, not as a fact. And if you ask it “am I broke?” or “do I have a fortune?”, it answers the judgment against your book: what you have left against the payments still coming.",
      ],
    },
  },
  {
    version: "1.3.444",
    date: "2026-11-24",
    level: "menor",
    title: { es: "La moneda se oye", en: "The currency is heard" },
    points: {
      es: [
        "El monto que no nombra su moneda se oye en la moneda de tu libro: si tu libro corre en córdobas, «pagué 500 de luz» son C$500, no $500. El signo $ y la palabra «dólares» o «córdobas» mandan cuando los escribes.",
        "La moneda invitada ya convierte: «¿cuánto es 100 dólares en euros?» usa la tasa de tu Mesa de cambio y la nombra, con su fecha. Si tu libro no tiene la tasa de esa moneda, el Asesor lo dice y no inventa ninguna.",
        "Y tras una respuesta puedes seguir con «¿y en córdobas?» o «¿y en euros?»: convierte la cifra que acabas de ver, nombrándola.",
        "También: «Puedo ir a cenar si la cena me cuesta 200 córdobas» ya recibe su juicio — el costo se convierte con la tasa de tu libro y la respuesta lo dice — y «¿puedo gastar cien en zapatos?» ya no pide el monto que escribiste en palabras.",
      ],
      en: [
        "An amount that doesn't name its currency is heard in your book's currency: if your book runs in córdobas, “I paid 500 for electricity” is C$500, not $500. The $ sign and the words “dollars” or “córdobas” rule when you write them.",
        "Your guest currency now converts: “how much is 100 dollars in euros?” uses your Exchange desk's rate and names it, with its date. If your book holds no rate for that currency, the Advisor says so and invents none.",
        "And after an answer you can follow with “and in córdobas?” or “and in euros?”: it converts the figure you just saw, naming it.",
        "Also: “Can I go out to dinner if dinner costs 200 cordobas?” now gets its judgment — the cost is converted at your book's rate and the answer says so — and “can I spend a hundred on shoes?” no longer asks for the amount you wrote in words.",
      ],
    },
  },
  {
    version: "1.3.443",
    date: "2026-11-24",
    level: "menor",
    title: { es: "La suma desnuda y el «cuánto sería»", en: "The bare sum and “how much would it be”" },
    points: {
      es: [
        "Si escribes solo la cuenta — «10 + 25 + 104 + 30», en dígitos o en palabras — el Asesor la suma: no hace falta preguntar nada más.",
        "Y «si envío 30 + 104 + 25 + 60, ¿cuánto sería?» recibe la suma, $219.00, no un juicio de capacidad que nadie pidió. El «cuánto sería» que nombra tu libro («el gasto total si compro…») sigue juzgándose como capacidad, como debe ser.",
      ],
      en: [
        "If you write just the math — “10 + 25 + 104 + 30”, in digits or in words — the Advisor adds it: nothing else needs asking.",
        "And “if I send 30 + 104 + 25 + 60, how much would it be?” gets the sum, $219.00, not a capacity judgment nobody asked for. The “how much would it be” that names your book (“the total spend if I buy…”) is still judged as capacity, as it should be.",
      ],
    },
  },
  {
    version: "1.3.442",
    date: "2026-11-24",
    level: "menor",
    title: { es: "Los números en palabras", en: "Numbers in words" },
    points: {
      es: [
        "El Asesor ya suma lo que dictas en palabras: «veinticinco dólares más ciento cuatro más treinta, ¿cuánto serían?» — $159.00, con cada parte a la vista. También en inglés: “two hundred fifty plus fifty”.",
        "Y el «si gasto…» oye el monto dictado: «si gasto doscientos dólares, ¿cuánto me queda?» resta de verdad. Lo que no es monto no se inventa: «una» no cuenta como número.",
      ],
      en: [
        "The Advisor now adds what you dictate in words: “veinticinco dólares más ciento cuatro más treinta” — $159.00, with each part in view. In English too: “two hundred fifty plus fifty.”",
        "And the “if I spend…” hears the dictated amount: “if I spend two hundred dollars, how much is left?” really subtracts. What isn't an amount isn't invented: “one” as an article doesn't count as a number.",
      ],
    },
  },
  {
    version: "1.3.441",
    date: "2026-11-24",
    level: "menor",
    title: { es: "El voseo, cercado entero", en: "The voseo, fenced whole" },
    points: {
      es: [
        "El Asesor ya oía el voseo — «¿qué podés hacer?» llega a sus capacidades —; ahora cada par del mapa está cercado por una prueba: tenés, querés, podés, venís, decís. Si una forma se pierde en una versión futura, la cerca lo dice el mismo día.",
      ],
      en: [
        "The Advisor already heard the voseo — “¿qué podés hacer?” reaches its capabilities —; now every pair of the map is fenced by a test: tenés, querés, podés, venís, decís. If a form is ever lost in a future version, the fence says so the same day.",
      ],
    },
  },
  {
    version: "1.3.440",
    date: "2026-11-24",
    level: "menor",
    title: { es: "Una sola casa por significado", en: "One home per meaning" },
    points: {
      es: [
        "«¿Me alcanza para gastar $100?» y “Can I afford to spend $100?” son la misma pregunta, y ahora reciben la misma respuesta: la de la verificación, en los dos idiomas.",
        "Y lo que se repite no se confunde con un gasto de una vez: “Can I afford $100 per month for the gym?” se juzga como lo que es — un compromiso de cada mes — en la capacidad.",
      ],
      en: [
        "“¿Me alcanza para gastar $100?” and “Can I afford to spend $100?” are the same question, and now they get the same answer: the verification's, in both languages.",
        "And what repeats is no longer mistaken for a one-time expense: “Can I afford $100 per month for the gym?” is judged as what it is — a monthly commitment — by capacity.",
      ],
    },
  },
  {
    version: "1.3.439",
    date: "2026-11-24",
    level: "menor",
    title: { es: "El extremo por abajo oye «más chico»", en: "The low end hears “smallest” in your words" },
    points: {
      es: [
        "«¿Cuál fue mi gasto más chico este mes?» ya tiene respuesta: el Asesor oye «más chico» y «más chica» como lo que son — el menor — en vez de quedarse en silencio.",
        "Y el adjetivo concuerda con lo que nombra: «tu compra más pequeña», «tu cuota más pequeña», no un masculino prestado.",
      ],
      en: [
        "“What was my smallest expense this month?” — asked your way, as “más chico” — now gets an answer: the Advisor hears those words as the minimum they mean instead of staying silent.",
        "And the adjective agrees with what it names: “your smallest purchase”, with the grammar to match.",
      ],
    },
  },
  {
    version: "1.3.438",
    date: "2026-11-23",
    level: "menor",
    title: { es: "La costura bilingüe", en: "The bilingual seam" },
    points: {
      es: [
        "Si anotaste una línea como «Renta» sin ponerle su subcategoría, el Asesor ya la encuentra preguntes como preguntes: «¿cuánto gasto en renta al mes?», «How much do I spend on rent per month?», «How many times did I pay rent?» — antes, en inglés, la línea quedaba invisible y la respuesta medía cero.",
        "La costura cose en los dos sentidos y en todas las puertas: la pregunta, su marco y el seguimiento («¿y el mes pasado?») usan el mismo filtro, así que la cifra no cambia al seguir preguntando.",
      ],
      en: [
        "If you wrote a line as “Rent” without filing it under its subcategory, the Advisor now finds it however you ask: “¿cuánto gasto en renta al mes?”, “How much do I spend on rent per month?”, “How many times did I pay rent?” — before, in English, the line stayed invisible and the answer measured zero.",
        "The seam sews both ways and through every door: the question, its frame and the follow-up (“and last month?”) use the same filter, so the figure doesn't change as you keep asking.",
      ],
    },
  },
  {
    version: "1.3.437",
    date: "2026-11-23",
    level: "menor",
    title: { es: "El conteo de veces, en su casa", en: "Counting the times, in its own home" },
    points: {
      es: [
        "Preguntar «¿cuántas veces pagué…?» — también en inglés — ya no se confunde con «¿ya pagué?»: el conteo lo responde su propia familia, con las veces en palabras y el total en dinero.",
        "Un conteo ya no se disfraza de dinero: las veces y los días dejaron de aparecer como cifras en moneda en las respuestas de frecuencia, y la gramática concuerda — «fue 1 vez», «1 vez anotada».",
      ],
      en: [
        "Asking \"how many times did I pay…?\" is no longer mistaken for \"did I already pay?\": the count is answered by its own family, with the times in words and the total in money.",
        "A count no longer dresses up as money: times and days stopped appearing as currency figures in frequency answers, and the grammar agrees — \"it was 1 time\", \"recorded 1 time\".",
      ],
    },
  },
  {
    version: "1.3.436",
    date: "2026-11-23",
    level: "menor",
    title: { es: "Los números dejan de gritar", en: "Numbers stop shouting" },
    points: {
      es: [
        "La respuesta de tu Asesor ya no viene en negrita: su texto se lee como prosa normal, y sus cifras llevan solo una énfasis suave.",
        "Los montos de tu bóveda — bolsillos, palanca, segmentos y el total de Ahorros —, el total grande de tu Central y los de las barras de tus libros bajan el peso de su negrita: se siguen viendo claros, sin sobresalir a la vista.",
      ],
      en: [
        "Your Advisor's answer no longer comes in bold: its text reads as plain prose, and its figures carry only a gentle emphasis.",
        "The amounts in your vault — pockets, the lever, segments and the Savings total —, Central's big total and those on your books' bars ease their bold weight: still clear, without glaring at the eye.",
      ],
    },
  },
  {
    version: "1.3.435",
    date: "2026-11-23",
    level: "menor",
    title: { es: "Bordes que se ven, en todo Estudio", en: "Borders you can see, across Study" },
    points: {
      es: [
        "Todos los bordes de Estudio ganan presencia a la vez — las tarjetas, sus filetes y sus rieles se leen con claridad en cualquier tema, sin que nada cambie de sitio ni de orden.",
        "La burbuja de ayuda — la de «¿Qué significa mi nota?» y sus hermanas — lleva ahora el borde más claro de la casa, casado con el color de tu tema, y se despega de su tarjeta con una sombra suave.",
      ],
      en: [
        "Every border in Study gains presence at once — the cards, their hairlines and their rails read clearly in any theme, with nothing moving or changing order.",
        "The help bubble — the one behind \"What does my score mean?\" and its sisters — now wears the clearest border in the house, married to your theme's color, and lifts off its card with a soft shadow.",
      ],
    },
  },
  {
    version: "1.3.434",
    date: "2026-11-23",
    level: "menor",
    title: { es: "El acabado que pediste, foto a foto", en: "The finish you asked for, photo by photo" },
    points: {
      es: [
        "El candadito de la palanca «Si apartas» es más pequeño y subió a la altura de la tarjeta del año; las tarjetas de tus bolsillos — Casa, Viaje y las demás — ya no se tocan: cada una respira con su hueco.",
        "La Lista de espera se lee de un vistazo: su título y su botón caben en una sola línea, y su tarjeta ganó el contraste y la presencia de las demás.",
        "El Saldo proyectado, día a día, conserva el orden de su texto y gana el acabado: el veredicto en su propia tarjeta, la cifra del día más apretado en su pastilla — la línea ya no la cruza —, la flecha que no respondía ahora despliega el camino, y cada día del camino y cada renglón del año van en su tarjetita.",
      ],
      en: [
        "The little lock on the \"If you set aside\" lever is smaller and rose to the height of the year card; your pocket cards — Casa, Viaje and the rest — no longer touch: each one breathes with its own gap.",
        "The Waiting list reads at a glance: its title and its button each fit on a single line, and its card gained the contrast and presence of the others.",
        "The Projected balance, day by day, keeps its text order and gains the finish: the verdict in its own card, the tightest day's figure in its pill — the line no longer crosses it —, the arrow that never answered now unfolds the path, and every day of the path and every row of the year sits in its own little card.",
      ],
    },
  },
  {
    version: "1.3.433",
    date: "2026-11-23",
    level: "menor",
    title: { es: "Seguir preguntando, sin perder el hilo", en: "Asking on, without losing the thread" },
    points: {
      es: [
        "Los seguimientos respetan tus exclusiones: si preguntas «sin» alguien o «sin» una cuenta, el Asesor mantiene esa exclusión al estrechar, al desplazar y al descomponer la cifra — nunca la convierte en su contrario.",
        "El Asesor oye más tiempo y más nombres: «el año pasado», «hace tres meses» y «the week» sirven su período, y un nombre completo manda sobre su primer nombre («Ana María» gana a «ana») al resolver de quién hablas.",
      ],
      en: [
        "Follow-ups respect your exclusions: if you ask \"without\" someone or \"without\" an account, the Advisor keeps that exclusion when narrowing, shifting and breaking down the figure — it never turns it into its opposite.",
        "The Advisor hears more time and more names: \"last year\", \"three months ago\" and \"the week\" serve their period, and a full name beats its first name (\"Ana María\" wins over \"ana\") when resolving who you mean.",
      ],
    },
  },
  {
    version: "1.3.432",
    date: "2026-11-23",
    level: "menor",
    title: { es: "Faro escucha mejor tus avisos de pago", en: "Faro hears your payment alerts better" },
    points: {
      es: [
        "Cuando compartes un aviso de pago de tu billetera o de tu banco, Faro lo lee con más cuidado: si el aviso nombra la tarjeta, el comercio se busca en el cuerpo del aviso, y el código de tienda que lo sigue se ignora como ruido.",
        "Si el aviso trae dos montos, el movimiento es el que pagaste — el saldo disponible nunca nace como gasto —, y cuando la billetera y el emisor avisan del mismo pago, Faro lo recoge una sola vez, como un solo movimiento.",
      ],
      en: [
        "When you share a payment alert from your wallet or your bank, Faro reads it more carefully: if the alert names the card, the store is looked for in the alert's body, and the store code after it is ignored as noise.",
        "If the alert carries two amounts, the movement is the one you paid — the available balance is never born as spending —, and when the wallet and the issuer both report the same payment, Faro picks it up once, as a single movement.",
      ],
    },
  },
  {
    version: "1.3.431",
    date: "2026-11-23",
    level: "menor",
    title: { es: "El Asesor, más fino en cada modo", en: "The Advisor, sharper in every mode" },
    points: {
      es: [
        "El Asesor entiende más formas de hablar del tiempo: «la primera quincena», «la segunda quincena» y sus hermanas en inglés ya sirven su período, en Esencial, Ritmo y Completo por igual.",
        "Los seguimientos cambian de persona o de período por palabra entera — una palabra parecida dentro de otra ya no se toca —, el aviso de cambio solo aparece cuando algo cambió de verdad, y el «¿Por qué?» ya no corta el hilo de la conversación.",
      ],
      en: [
        "The Advisor understands more ways of speaking about time: \"the first half of the month\", \"the second half\" and their Spanish sisters now serve their period, in Essential, Rhythm and Complete alike.",
        "Follow-ups switch person or period by whole word — a similar word inside another is never touched —, the change note only appears when something truly changed, and \"Why?\" no longer cuts the conversation's thread.",
      ],
    },
  },
  {
    version: "1.3.430",
    date: "2026-11-23",
    level: "menor",
    title: { es: "El candadito de las proyecciones", en: "The little lock for projections" },
    points: {
      es: [
        "Bajo la palanca de «Si apartas» — y junto a la de «¿Y si apartara cada mes…?» en Estudio — vive ahora un candadito: un toque lo pone o lo quita.",
        "Con el candado puesto, la palanca no se mueve por accidente al tocarla o arrastrarla; en su lugar, una nota corta te recuerda que está asegurada. Faro recuerda tu elección en cada libro.",
      ],
      en: [
        "Under the \"If you set aside\" lever — and beside the \"What if I set aside each month…?\" lever in Study — there is now a little lock: one tap sets it or releases it.",
        "With the lock on, the lever will not move by accident when touched or dragged; instead, a short note reminds you it is secured. Faro remembers your choice in each ledger.",
      ],
    },
    topic: "si-apartas",
  },
  {
    version: "1.3.429",
    date: "2026-11-23",
    level: "menor",
    title: { es: "Me deben, como una historia", en: "Owed to you, told as a story" },
    points: {
      es: [
        "La tarjeta de un préstamo en «Me deben» ahora se lee como su historia: lo prestado con su fecha, cada abono con su fecha y cuánto va cobrado hasta él, y hoy, con lo que queda por cobrar.",
        "Al abrir el préstamo ves LA CUENTA tal como la llevas a mano: el saldo inicial, menos cada abono con su fecha, hasta el saldo de hoy. «Préstamos» cuenta la misma historia con sus nombres.",
      ],
      en: [
        "A loan's card in \"Owed to you\" now reads as its story: what was lent with its date, each payment with its date and how much has been collected by then, and today, with what is still owed.",
        "Opening the loan shows THE ACCOUNT just as you keep it by hand: the starting balance, minus each payment with its date, down to today's balance. \"Loans\" tells the same story with its own names.",
      ],
    },
    topic: "me-deben",
  },
  {
    version: "1.3.428",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La espera con su cara, el saldo con su línea", en: "The wait with its face, the balance with its line" },
    points: {
      es: [
        "La Lista de espera estrena cara: su título lleva el medallón del reloj de arena, como su hoja de anotar, y cuando no hay deseos en espera, el aviso vive en su propia tarjetita apagada, no en una línea suelta.",
        "El Saldo proyectado ahora dibuja su camino: una línea con lo libre de cada día, y tu día más apretado marcado sobre ella con su cifra.",
      ],
      en: [
        "The Waiting list has a face now: its title wears the hourglass medallion, like its note-a-wish sheet, and when no wishes are waiting, the notice lives in its own dimmed little card, not in a loose line.",
        "The Projected balance now draws its path: a line with each day's free balance, and your tightest day marked on it with its figure.",
      ],
    },
    topic: "saldo-proyectado",
  },
  {
    version: "1.3.427",
    date: "2026-11-22",
    level: "menor",
    title: { es: "La cabecera del lente, con la cara de su ficha", en: "The lens header, wearing its tile's face" },
    points: {
      es: [
        "Al desplegar Tengo, Gastaré o Pagos, la cabecera de abajo ya no es un título común: lleva el mismo ícono, la misma fuente y el mismo color que la ficha que tocaste.",
        "Cada lente se reconoce por su cara también abajo — el verde de Tengo, el ámbar de Gastaré y el rojo de Pagos, en cada tema.",
      ],
      en: [
        "When you open Have, Will spend or Payments, the header below is no longer a plain title: it wears the same icon, the same font and the same color as the tile you tapped.",
        "Each lens is recognizable by its face below too — Have's green, Will spend's amber and Payments' red, in every theme.",
      ],
    },
    topic: "lentes",
  },
  {
    version: "1.3.425",
    date: "2026-11-22",
    level: "menor",
    title: { es: "El cumpleaños, en Central", en: "The birthday, on Central" },
    points: {
      es: [
        "Cuando el cumpleaños de alguien llega en tres días o menos, Central lo anuncia con su propia tarjeta, de acabado especial: dice quién es y cuándo cumple.",
        "Al tocarla se despliega con lo básico: la fecha, la edad que cumple, lo que ya anotaste para este cumpleaños y lo del pasado.",
        "La tarjeta permanece el día del cumpleaños y se retira sola al pasar; también puedes quitarla con la ✕ cuando quieras.",
        "El pastel de la tarjeta viste el color de la persona, como su cara en Personas — no el color de siempre. Y de paso: el botón «Verlo» de tu año en Faro ya no lleva texto blanco sobre la píldora de acento.",
      ],
      en: [
        "When someone's birthday is three days away or less, Central announces it with its own card, specially finished: it says who it is and when the day falls.",
        "Tap it and it opens with the basics: the date, the age they turn, what you already noted for this birthday and last year's.",
        "The card stays through the birthday itself and retires on its own after; you can also dismiss it with the ✕ anytime.",
        "The card's cake wears the person's own color, like their face in People — not the usual theme color. And while at it: the “See it” button on your year in Faro no longer puts white text on the accent pill.",
      ],
    },
    topic: "asesor-personas",
  },
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
