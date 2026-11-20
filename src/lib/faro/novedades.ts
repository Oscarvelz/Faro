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
}

/** De la más nueva a la más vieja — el orden de esta lista ES el orden
 * en que se leen en Ajustes. */
export const NEWS: NewsEntry[] = [
  {
    version: "1.3.350",
    date: "2026-11-20",
    level: "grande",
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
