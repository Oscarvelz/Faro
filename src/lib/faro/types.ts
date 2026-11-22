import type { LearnedAlias } from "./asklearn.ts";

export type Lang = "es" | "en";
export type Currency = "NIO" | "USD";
export type ThemeId = "claro" | "lino" | "costa" | "marfil" | "niebla" | "piedra" | "ion" | "oscuro" | "oled" | "naturaleza" | "oceano" | "sunset" | "tinta" | "bosque" | "humo" | "ion-noche" | "tron" | "cyberpunk";
export type Group = "fixed" | "variable";
export type LineKind =
  | "income-fixed"
  | "income-variable"
  | "expense-fixed"
  | "expense-variable"
  | "purchase"
  | "subscription";
/** Old words load unchanged; 1.3.76 adds any interval "<n><d|w|m|y>" (see cadence.ts). */
export type Cadence = "weekly" | "biweekly" | "monthly" | "yearly" | "" | `${number}${"d" | "w" | "m" | "y"}`;
/** "acct": a bank or card account that statements are imported from (bank-import, Nov 2026). */
export type CatalogKind = "store" | "ai" | "sub" | "acct" | "ins";
/** El plan de un seguro de vida (1.3.271): la prima es un gasto fijo que se
 *  cobra de una cuenta; la póliza NUNCA es un activo — no hay saldo, no hay
 *  bolsillo, no entra en ningún total. «start» es la fecha en que el usuario
 *  empezó con la aseguradora (su dato, vacío al nacer: nada se inventa) y
 *  sostiene el conteo retrospectivo de la tarjeta. «note» es texto libre
 *  (cobertura, beneficiario): texto, nunca una cifra en ningún total. */
export type InsPlan = {
  /** La prima en unidades menores (> 0). Sin plan = la pieza no está configurada. */
  amt: number;
  cur: Currency;
  /** Día fijo del mes (1–31). Exactamente uno de day/week está puesto. */
  day?: number;
  /** Semana del mes (1–4): el cobro cae en esa semana; su fecha es el primer día de la semana. */
  week?: number;
  /** La cuenta (pieza del catálogo de kind "acct") de la que se cobra; "" = sin especificar. */
  src: string;
  /** Fecha de inicio (ISO) o "" si el usuario no la puso. */
  start: string;
  /** Nota libre (cobertura, beneficiario): solo texto. */
  note: string;
};
export type TemplateId = "soltero" | "familia" | "estudiante" | "negocio";

export const DAY_THEMES: ThemeId[] = ["claro", "lino", "costa", "marfil", "niebla", "piedra"];
export const NIGHT_THEMES: ThemeId[] = ["oscuro", "oled", "naturaleza", "oceano", "sunset", "tinta", "bosque", "humo", "ion-noche", "tron", "cyberpunk"];
/** "ion" (the old light Ion) is still accepted from saved data; it now opens as Ion in Noche. */
export const THEME_IDS: ThemeId[] = [...DAY_THEMES, "ion", ...NIGHT_THEMES];

export const SECTIONS = [
  "desk",
  "income",
  "fixed",
  "variable",
  "shops",
  "subs",
  "stats",
  "advice",
  "settings",
  // Historial y Archivo (Oscar, 2026-11-12; el contenedor, 2026-11-13): las dos
  // pastillas de Folios — el diario de los libros y el lugar de descanso universal —
  // bajo un solo ciudadano del dock (entre Libros y Estudio), sin conexión de datos
  // entre ellas. Libros no las guarda: ya está a su capacidad. Ambos son lugares
  // principales a efectos del lugar guardado (navplace): la salida puede nacer en
  // ellos y el arranque puede volver a ellos, como a cualquier página principal.
  "archivo",
  "historial",
  // La Bitácora (1.3.367): la tercera pastilla de Folios — el registro
  // callado de los meses y las ediciones anuales encuadernadas.
  "bitacora",
] as const;
export type SectionId = (typeof SECTIONS)[number];

/** Sections the finger can loop through. Settings stays out of the swipe.
 *  Las pastillas de Folios van juntas y en su orden interno (historial → archivo):
 *  un deslizamiento sencillo va de la una a la otra (Oscar, 2026-11-13). */
export const SWIPE_SECTIONS: SectionId[] = ["desk", "income", "fixed", "variable", "shops", "subs", "stats", "advice", "historial", "archivo", "bitacora"];

export type Named = {
  id: string;
  nameKey: string;
  customName: string;
  icon: string;
  hidden: boolean;
  order: number;
};

export type Sub = Named & {
  /** The sub's OWN colour (congruency pass, Oscar 2026-11-11): every sub is born with a preset shade of its
   *  category's family (colors.subPresetColor) and the user can change it; absent = the preset rules. */
  color?: string;
};

export type Category = Named & {
  group: Group;
  role: string;
  subs: Sub[];
  color?: string;
};

export type PurchaseCat = Named & { color?: string };

export type CatalogItem = Named & {
  kind: CatalogKind;
  urlTemplate: string;
  /** Solo kind "ins": su plan de seguro de vida (1.3.271). Ausente = pieza sin configurar. */
  ins?: InsPlan;
  /** Solo kind "ins" (1.3.273): los beneficiarios que el usuario nombró — solo
   *  nombres, en su orden. Viven en la pieza (viajan con el libro: respaldo y
   *  sincronización), fuera del plan: quitar el importe no los borra. */
  bens?: string[];
};

/** The registered starting point of a structure: the last template applied, or "completa"
 * for a book born with everything visible. «Personalizada» is never stored: it is the reading
 * of a base plus the user's own hand (userVis). */
export type StructureBase = TemplateId | "completa";

export type Structure = {
  categories: Category[];
  purchases: PurchaseCat[];
  catalog: CatalogItem[];
  /** The last template applied, written by applyTemplate in the same commit as its patch, so
   * undoing restores base and patch together. Birth = "completa". Missing in older ledgers
   * and backups (= no base registered; the UI says so, it never guesses one backwards). */
  base?: StructureBase;
  /** Visibility the user set by hand (the eyes in Estructura, the pickers' hide), by category/sub id.
   * Templates set only a baseline and never override it: the user's word wins.
   * Missing in older ledgers and backups (= no hand-set choices yet). */
  userVis?: Record<string, boolean>;
};

export type Charge = {
  id: string;
  date: string;
  amountMinor: number;
  currency: Currency;
  note: string;
};

export type Line = {
  id: string;
  seriesId: string;
  monthKey: string;
  kind: LineKind;
  concept: string;
  amountMinor: number;
  currency: Currency;
  active: boolean;
  note: string;
  categoryId: string;
  subId: string;
  recurring: boolean;
  storeId: string;
  providerId: string;
  productCode: string;
  productUrl: string;
  cadence: Cadence;
  nextDue: string;
  aprBps: number;
  balanceMinor: number | null;
  balanceCurrency: Currency;
  icon: string;
  history: Charge[];
  bookedOn?: string;
  startedOn?: string;
  color?: string;
  /** Optional tag: the person this spending was for (a gift). See people.ts. */
  personId?: string;
  /** Optional: which of that person's occasions the gift was for ("birthday" or a PersonDate id). */
  occasionId?: string;
  /** Bank import (Nov 2026). Exact statement keys ("ofx:<acct>:<FITID>", "pp:<Transaction ID>"), several joined by "|". */
  importId?: string;
  /** The account (catalog item of kind "acct") the money moved through. */
  sourceId?: string;
  /** Paid through PayPal with sourceId's card: the PayPal account id. */
  via?: string;
  /** A transfer between the user's own accounts (card payment, PayPal ↔ bank). Saved inactive: never counts in totals. */
  xfer?: boolean;
  /** Rewards class of a card purchase ("dining", "grocery", "drug", "gas", "online", "other"). */
  rc?: string;
  /** Import batch id, so one Deshacer removes the whole import. */
  batch?: string;
  /** A payment toward a received loan (Debo → Préstamos). See loans.ts. */
  loanId?: string;
  /** 1.3.149: on a loan payment line, the part of amountMinor that paid interest (the rest is principal).
   *  Absent = a legacy payment: no split was recorded and NO total invents one for it. See loans.ts. */
  interestMinor?: number;
  /** A payment received toward money the user lent (Libros → Me deben, 1.3.92). An income line. See debts.ts. */
  lentId?: string;
  /** Pago automático (Ola 6, 1.3.356; orden de Oscar 2026-11-20): en una
   * cuota, Faro anota solo el cargo de cada período en su fecha, desde la
   * cuenta elegida. Vive en la instancia más reciente de la serie y las
   * instancias que el asentamiento crea lo heredan. Ver autopay.ts. */
  autopay?: boolean;
  /** La cuenta (ítem del catálogo de clase "acct") de la que sale el pago
   * automático: viaja como sourceId de las instancias asentadas. */
  autopayAccountId?: string;
  /** Removed from a pocket but kept for its money history (1.3.81): inactive and hidden from the pocket list. */
  archived?: boolean;
  /** Birthmark of a factory preset line (ola de prejuicio 1): seedRetiro stamps
   *  its seed with the preset's id ("primerica"). Labels (concept, icon) are
   *  the person's to change and never touch this — so the factory series is
   *  recognised by its birth, not by its labels, and renaming or re-iconing
   *  the seed can never "institute" it. Only seedRetiro writes it. */
  preset?: string;
  /** 1.3.107: a payment toward a credit card (Debo → Préstamos → Tarjetas). Always a transfer (xfer, inactive): the
   *  purchases were already spending, so paying the card lowers its balance without counting twice. See cards.ts. */
  cardId?: string;
  /** 1.3.109: a card rewards redemption (Canjear). With cardId + xfer = a statement credit (lowers the card balance, not
   *  spending, not income); alone on an income line = a deposit to the bank (income, source "Recompensas de tarjetas"). */
  rwCard?: string;
  /** 1.3.118: a remittance line's recipient (RemitPerson id in ledger.remitPeople). Missing = "Sin persona". See remit-people.ts. */
  to?: string;
  /** El descanso (Historial/Archivo): la línea está apartada — no cuenta en NINGUNA lectura
   *  (la puerta anti-fuga de descanso.ts) y su período vive en LedgerState.restingSpans.
   *  Ausente = activa en las lecturas, como siempre. Lo pone y lo quita SOLO descanso.ts. */
  rest?: boolean;
  /** Naturaleza declarada del fondo (serie) al que pertenece la línea (modelo de ahorros,
   *  1.3.287): "saldo" = límite sobre el saldo de una cuenta específica; "aparte" = pila
   *  separada. Ausente = sin declarar (libros anteriores al modelo, o fondo nacido antes
   *  de que existiera una cuenta): se lee como pila, como siempre. Se lee por serie, de
   *  su línea determinante, y se escribe a la serie entera. El Retiro nunca lo lleva. */
  fund?: "saldo" | "aparte";
  /** Cuenta anfitriona de un fondo "saldo": el sub de la cuenta cuyo saldo sostiene el
   *  límite. Vive junto a `fund` en la misma serie y se declara una sola vez, con la
   *  naturaleza. Sin sentido en fondos "aparte" ni en el Retiro: ahí no se escribe. */
  fundHost?: string;
};

/** Un período apartado desde el Historial (descanso.ts): las líneas cuyos movimientos caen en
 *  [from, to] llevan `rest` y este registro dice cuáles son, para que Restaurar y Eliminar
 *  actúen sobre exactamente el mismo conjunto. Las fechas son días ISO "YYYY-MM-DD". */
export type RestingSpan = {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Cuándo se apartó (epoch ms): el orden de llegada al Archivo. */
  hiddenAt: number;
  lineIds: string[];
};

/** Money the user lent to someone (Me deben). Interest follows the same rule as Loan (simple, by the day, from startedOn). */
export type Lent = {
  id: string;
  person: string;
  kind: "plain" | "interest";
  amountMinor: number;
  currency: Currency;
  aprBps: number;
  /** Interest counts from here (the day it was recorded). */
  startedOn: string;
  /** The day the user expects to collect (calendar). */
  dueOn: string;
  note: string;
  archived?: boolean;
  archivedOn?: string;
  unpaidMinor?: number;
};

/** `monthlyMinor` is the amount per payment (name kept for old data); `cadence` (1.3.107) is how often; absent = monthly. */
export type DebtPlan = { order: "avalanche" | "snowball"; monthlyMinor: number; currency: Currency; cadence?: string };

/** A loan the user received (Debo → Préstamos). Payments are normal lines with `loanId`; see loans.ts. */
export type Loan = {
  id: string;
  lender: string;
  who: "person" | "entity";
  kind: "plain" | "interest";
  amountMinor: number;
  currency: Currency;
  /** Yearly rate in basis points (simple, by the day). 0 = no interest. */
  aprBps: number;
  /** Day the money was received; interest counts from here. */
  takenOn: string;
  /** 1.3.149: day of the month a payment is due (1–31, like CreditCard.dueDay). Absent/0 = no due day:
   *  the loan simply never enters the dues window, exactly as before this field existed. */
  dueDay?: number;
  /** Book the payments go to. */
  book: Group;
  note: string;
  archived?: boolean;
  archivedOn?: string;
  /** Pending when archived. */
  unpaidMinor?: number;
};

/** 1.3.107: one reading of a credit card's balance (a screenshot, a manual update or a payment's effect is NOT one).
 *  Kept forever, oldest first, so the trend and the sparkline are real. Amounts in the card's currency. */
export type CardSnap = {
  /** Day the reading is for (YYYY-MM-DD) and when it was saved (ISO). */
  on: string;
  at: string;
  balanceMinor: number;
  availMinor?: number;
  limitMinor?: number;
  minMinor?: number;
  /** Payment due date shown by the bank (YYYY-MM-DD). */
  dueOn?: string;
  statementMinor?: number;
  /** APR the bank showed in this reading (bps). */
  aprBps?: number;
  src: "shot" | "manual";
  /** 1.3.109: last payment the bank showed, and other labelled numbers kept as notes ("Otros datos"). */
  lastPayMinor?: number;
  lastPayOn?: string;
  notes?: { label: string; text: string }[];
  /** Card payment lines already in the ledger when this reading was saved (the bank balance already reflects them). */
  seen?: string[];
};

/**
 * 1.3.109: a card's rewards balance (cash back) at a date. Money the bank holds for the user: an asset, never subtracted
 * from the card debt. `amountMinor` in the card currency; `points` is a note only (points are not money). A redemption
 * ("Canjear") stores a reading with the amount left (src "redeem"), how it was used and the line it wrote.
 */
export type RewardSnap = {
  on: string;
  at: string;
  amountMinor?: number;
  points?: number;
  /** Rewards EARNED as the bank shows them (year to date or lifetime): info for Estudio, never money the user has. */
  earnedMinor?: number;
  earnedSpan?: "year" | "life";
  src: "shot" | "manual" | "redeem";
  redeemed?: number;
  how?: "credit" | "deposit";
  lineId?: string;
};

/** 1.3.107: a credit card, a revolving loan under Debo → Préstamos. Presets (Chase/Wells Fargo/PayPal) carry no numbers. */
export type CreditCard = {
  id: string;
  name: string;
  issuer: string;
  /** Mark id ("chase", "wellsfargo", "paypal", "capitalone", "discover", "amex", "citi", "bofa", "") and plate colour. */
  mark: string;
  color: string;
  /** Card art style: an issuer's ("chase", "wellsfargo", "paypal") or a generic one ("wave", "band", "glow", "plain"). */
  art?: string;
  /** "visa" | "mastercard" | "amex" | "discover" | "". */
  network?: string;
  last4: string;
  currency: Currency;
  /** Credit limit typed by the user (else the latest reading's limit, else balance + available). */
  limitMinor: number | null;
  /** Day of the month the payment is due (1–31, 0 unknown). */
  dueDay: number;
  /** Yearly rate in basis points (payoff plan). 0 unknown. */
  aprBps: number;
  /** Promotional 0% APR until this day (YYYY-MM-DD); "" none. */
  promoUntil?: string;
  autopay: boolean | null;
  rewards: string;
  /** "manual": the bank blocks screenshots (Chase), so the card is updated by hand. */
  manualOnly?: boolean;
  snaps: CardSnap[];
  /** 1.3.109: rewards readings (cash back balance), oldest first. */
  rw?: RewardSnap[];
  /** Preset id when it came from the defaults. */
  preset?: string;
  archived?: boolean;
  archivedOn?: string;
};

/** Someone the user spends on (gifts). Entered by hand; money lives in normal lines tagged with personId. */
export type OccasionKind = "anniversary" | "mother" | "father" | "christmas" | "graduation" | "saint" | "custom";
/** A yearly date. `kind` names a preset; "custom" uses `label`. Old data has no kind (read as custom or a matching preset). */
export type PersonDate = { id: string; label: string; date: string; kind?: OccasionKind };
export type Person = {
  id: string;
  name: string;
  /** YYYY-MM-DD (the year may be unknown: then any year is fine). */
  birthday: string;
  dates: PersonDate[];
  note: string;
  color?: string;
  /** Deleted by the user: hidden from Personas and the pickers, but their lines keep personId and history shows the name. */
  archived?: boolean;
};

export type RewardClass = "travel" | "dining" | "grocery" | "drug" | "gas" | "online" | "other";
export type AcctKind = "checking" | "card" | "paypal" | "savings";
/** Import settings of one account; its name and icon live in its catalog item (kind "acct"), same id. Rates in basis points. */
/**
 * `rates` keys are reward rows: a RewardClass or a bonus row id ("b-…"). `off` (ISO day) = archived: out of daily use
 * (rewards table, import picker, Estudio/Asesor advice) but its lines, rules and past rewards stay. `mine` = added by the user.
 * `color` (1.3.151, optional hex) = the mark colour the user picked; missing = the bank's own colour.
 */
export type BankSource = { id: string; bank: string; kind: AcctKind; rates: Partial<Record<string, number>>; elig?: number; pocketId?: string; apyBps?: number; off?: string; mine?: boolean; color?: string };
/** A named reward row of the user's own ("Hogar", "Viajes Chase"); `target` links it to one of their categories (a "<kind>|<cat>|<sub>" value, sub may be empty = the whole category). */
export type BonusRow = { id: string; name: string; target?: string };
/** Learned filing: merchant key → "<kind>|<categoryId>|<subId>". */
export type MerchantRule = { key: string; label: string; target: string; rc?: string; elig?: boolean; n: number; at: string };
export type ColumnMap = { date: number; desc: number; amount: number; debit: number; credit: number; invert: boolean; dmy: boolean; typeCol?: number };
/** A "how to download" chip in the importer (1.3.79). Built-ins are "chase" | "wellsfargo" | "paypal" (manual topic);
 * own ones ("g-…") carry a name, an optional data-URL icon, free-text steps, and `acct`, the card/bank they made in Bancos y recompensas. */
export type BankGuide = { id: string; name?: string; icon?: string; steps?: string; acct?: string };
/** 1.3.155: the REAL rewards balance Oscar noted from his bank app for one account: his figure, money only (never points), with the day it was true. */
export type RewardRealFig = { amountMinor: number; asOf: string; currency: Currency };
export type ImportBook = { sources: BankSource[]; rules: MerchantRule[]; maps: Record<string, ColumnMap>; files?: Record<string, string>; bonus?: BonusRow[]; guides?: BankGuide[]; /** 1.3.153: how Oscar usually pays each merchant (merchantKey → account id or "cash"), learned only from his own manual entries. */ payHints?: Record<string, string>; /** 1.3.155: real rewards balances he noted, per account id; the latest note replaces the previous one. */ rewardReal?: Record<string, RewardRealFig> };

export type AuditEntry = { id: string; at: string; detail: string; /** Ola 20 (§A/§B): la entrada nació de un aborto ANUNCIADO (commitAnnounced): es contenido del registro, no foto del libro — sobrevive a Deshacer/Rehacer vecinos y cuenta como trabajo local entre pestañas. */ announced?: boolean };

export type Settings = {
  lang: Lang;
  theme: ThemeId;
  display: Currency;
  rateE4: number;
  rateSource: string;
  rateAsOf: string;
  /** La moneda invitada (Captura Inteligente F7, 1.3.344): una moneda de
   * SOLO LECTURA que vive en la capa que pinta — jamás en una línea ni en
   * un total del libro. guestCur = su código ("EUR"…); ausente = sin
   * invitada. guestRate.per = cuántas unidades de invitada por 1 USD, con
   * su fecha y su fuente, la misma disciplina que rateE4/rateAsOf/
   * rateSource para el córdoba; source "manual" = la tasa del usuario,
   * que la fuente pública nunca pisa. El estado «estoy viendo en
   * invitada» NO vive aquí: es del aparato y de la sesión (provider), y
   * Faro siempre reabre en la moneda oficial (fallo D3). */
  guestCur?: string;
  guestRate?: { per: number; asOf: string; source: string };
  /** La lista de espera (5c, 1.3.360): el plazo que rige para los deseos
   * NUEVOS, en horas — pasos cerrados 24 / 48 / 72 / 168 (una semana);
   * ausente = 48. Cada deseo guarda su propio plazo al nacer (su foto del
   * ajuste): cambiar esto jamás mueve una espera en curso. El ajuste vive
   * en Ajustes (asiento settings.wait-time, Ritmo); la lista, en el
   * Asesor (advisor.waitlist, Esencial). */
  waitHours?: number;
  savingsGoalPct: number;
  /** La postura ante la naturaleza de los fondos NUEVOS (modelo de ahorros, 1.3.288):
   *  "ask" = preguntar en cada fondo; "balance" = todo nace como parte del saldo;
   *  "separate" = todo nace como dinero aparte. Ausente = "ask". Gobierna solo la
   *  pregunta y lo ofrecido: JAMÁS reescribe la naturaleza de un fondo que ya existe
   *  (cada fondo conserva lo que su dueño declaró, línea `fund`/`fundHost`). */
  savingsNatureMode?: "ask" | "balance" | "separate";
  /** El modo de uso de Faro (tres modos: Esencial · Ritmo · Completo): un filtro de
   *  lectura y de capacidades sobre el MISMO libro — jamás una regla de almacenamiento
   *  ni una partición de datos. Es dato de la PERSONA: viaja con su cuenta y su libro
   *  (sincronía, copias, restauración) como el idioma y el tema, y los libros sellados
   *  (ejemplo/escenario) lo toman prestado del espejo del aparato (`faro-mode`, el
   *  patrón de `faro-lang`). Ausente = "completo": el Faro de siempre, entero — un
   *  libro que ya existe no pierde ni una pieza el día que el campo nace. Lo escriben
   *  SOLO el selector de Ajustes y la pantalla inicial de elección (cerca en
   *  modos293.test.ts); la lectura canónica es `modeOf` en lib/faro/mode.ts. */
  mode?: "esencial" | "ritmo" | "completo";
  debtGreenPct: number;
  debtYellowPct: number;
  emergencyMonths: number;
  shortcuts: Record<string, string>;
  gestures?: Record<string, string>;
  /** 1.3.148: the phone notifications (Android app) on/off as the user set it in Ajustes. Missing = on. */
  notify?: boolean;
  /** 1.3.377 (Oscar, 2026-11-21): los tipos de notificación, uno por uno —
   * la fila de Ajustes se despliega y cada tipo lleva su interruptor.
   * Missing por tipo = encendido, como notify: un libro que ya existe no
   * pierde ningún tipo el día que nacen. El maestro (notify) manda sobre
   * todos: apagado él, ningún tipo llega. */
  notifyKinds?: { dues?: boolean; pace?: boolean; close?: boolean };
  /** Ola 8 (1.3.388): la escucha de la billetera por notificaciones —
   * su interruptor (ausente = apagada: escuchar es una elección, nunca
   * un defecto) y las apps elegidas por paquete (ausente = ninguna
   * elegida todavía). La cáscara lee ambas por el puente; el permiso es
   * del sistema y se lee de él, jamás se guarda aquí. */
  noticesListen?: boolean;
  noticesApps?: string[];
  /** Ola 6 (1.3.356): los avisos DENTRO de la app de los pagos que se
   * acercan (Central los muestra con su puerta). Missing = on, como
   * notify: un libro que ya existe no pierde el aviso el día que nace. */
  dueAlerts?: boolean;
  /** 1.3.381 (Oscar, 2026-11-21): la tarjeta de Central quitada «por
   * ahora» — la firma del conjunto de pagos que se mostraba y el día
   * en que se quitó. La tarjeta vuelve mañana, o en cuanto el conjunto
   * cambie (un pago nuevo entra en la ventana, o uno se paga y sale):
   * quitarla de Central es momentáneo y JAMÁS toca dueAlerts ni los
   * avisos del teléfono. Missing = la tarjeta se muestra. */
  dueAlertsDismissed?: { sig: string; day: string };
  /** One-time seeds already applied (e.g. "remesas"), so a default the user deleted is not added again. */
  seeds?: string[];
  /** 1.3.246: las categorías fijas del widget — los pares (categoría, sub) que la tarjeta
   *  de apuntes ofrece SIEMPRE, antes que las casas por hábito (quickadd.quickPins).
   *  Viven en los ajustes del LIBRO (viajan con él: sincronía y copias), no en el aparato.
   *  El signo NO se guarda: se deriva de los recibos de la categoría en el libro
   *  (quickadd.pinSigns). Missing en libros viejos (= ninguna fija). */
  widgetPins?: WidgetPin[];
};

/** 1.3.246: una categoría fija del widget: `c` = categoría, `s` = subcategoría ("" = la categoría misma). */
/** Una fija del widget. Dos familias en la misma lista, en el orden en que él las fijó:
 *  la de Estructura ({ c, s } — categoría y sub, s = "" cuando la fija es la categoría)
 *  y la del catálogo ({ c: "", s: "", store } — la pieza de Tiendas o de IA, 1.3.251).
 *  Las piezas de Suscripciones NO se fijan: ninguna línea del libro guarda su id (las
 *  cuotas viven de presets con nombre libre), así que una fija suya no tendría dónde
 *  archivar — la mitad honesta de 1.3.251 se detuvo ahí y se declaró. */
export type WidgetPin = { c: string; s: string; store?: string };

/** 1.3.118: a remittance recipient: a name, an optional colour and Faro icon. The money stays in normal lines (`line.to`). */
export type RemitPerson = { id: string; name: string; color?: string; icon?: string };

export type SubPreset = { id: string; name?: string; icon?: string };

/** Captura Inteligente, Ola 1 (brief BRIEF-OLA-1 §4): la única forma de
 * borrador de Faro. Todo lo que entra — foto, texto, voz, archivo — cae en la
 * bandeja como un Draft, se revisa en la mesa universal y solo se vuelve
 * línea por un commit del usuario. `raw` es lo que entró, tal cual, y nunca
 * se reescribe: es la prueba. Los campos `book` e `icon` no están en el
 * pliego original porque el pliego no miraba la conversión; tienen casa en
 * Line (kind e icon) y sin ellos un borrador del escaneo no podría volverse
 * la misma línea que hoy produce DraftCard — el código ganó y el brief se
 * corrige con esta nota. */
export type DraftSource = "text" | "voice" | "photo" | "excel" | "pdf" | "list" | "notice" | "bank" | "wish" | "share";
export type Draft = {
  id: string;
  source: DraftSource;
  /** "line" = un movimiento listo para revisar; "plan" reservado (D6, llega con su diseño). */
  kind: "line" | "plan";
  /** Lo que entró, tal cual: la frase, la fila, el texto de la notificación. Nunca se reescribe. */
  raw: string;
  createdAt: string;              // ISO — cuándo cayó en la bandeja
  day: string;                    // YYYY-MM-DD propuesto para la línea
  sign: "in" | "out" | null;
  amountMinor: number | null;
  currency: Currency | null;      // solo USD/NIO — el dinero real no gana monedas (mapa §F7)
  concept: string;
  note: string;
  /** La lista-plan a la que pertenece la fila (solo kind "plan", D6 1.3.357):
   *  el id de su PlanList. La agrupación vive dentro del contrato de
   *  borradores — nada de un segundo almacén. */
  planId?: string;
  /** El estado de compra de la fila del plan (solo kind "plan"):
   *  pendiente / comprado (con su monto real en amountMinor y su día real
   *  en day) / después / no había. Vocabulario propio: una fila sin monto
   *  es pendiente, jamás «en rojo» — el ámbar y el rojo son de la mesa. */
  planState?: "pending" | "bought" | "later" | "gone";
  /** El precio estimado de la fila del plan y su procedencia: el último
   *  precio propio del mismo concepto, con su fecha en estOn (YYYY-MM-DD).
   *  Sin estOn, el estimado lo escribió el usuario en el plan. El estimado
   *  jamás entra a un total del libro: es dinero todavía no. */
  estMinor?: number | null;
  estOn?: string;
  /** El libro destino (casa en Line.kind). El adaptador del escaneo lo fija
   *  con su enrutado de siempre; sin fijar, la conversión cae a expense-variable. */
  book: LineKind;
  /** La app que puso la notificación (solo source "notice", Ola 8): su
   *  nombre legible — «Samsung Wallet» — para que la bandeja y la mesa
   *  digan el origen. La notificación cruda vive en `raw` y muere con el
   *  borrador al guardar o descartar: el libro guarda la línea, nunca la
   *  notificación. */
  fromApp?: string;
  /** El paquete de esa app (solo source "notice"): la llave con la que
   *  la mesa enseña «esto no es un movimiento» para esa forma. */
  fromPkg?: string;
  cat?: string; sub?: string;     // la casa sugerida (ids de Estructura)
  store?: string;                 // la pieza del catálogo, si aplica (casa en Line.storeId)
  cadence?: string;               // solo borradores de suscripción (del escaneo)
  icon?: string;                  // la marca ya resuelta de la suscripción (casa en Line.icon)
  unsure: string[];               // nombres de campo adivinados → ámbar
  missing: string[];              // nombres de campo no entendidos → rojo, con su herramienta
  dupOf?: string;                 // id de la línea existente si parece duplicado
};

/** Una fila del folio de un plan cerrado (D6): la foto de la fila tal como
 * quedó al cerrar — su estado final y sus dos cifras. Intocable: el folio
 * es documento, no superficie de edición. */
export type PlanRow = {
  concept: string;
  note: string;
  state: "bought" | "later" | "gone" | "out";
  amountMinor: number | null;
  currency: Currency | null;
  estMinor: number | null;
  /** El día real de compra de la fila comprada (YYYY-MM-DD). */
  day: string;
};

/** Un deseo de la lista de espera (5c, 1.3.360): un gusto no esencial en
 * cuarentena. Vive FUERA de months — ningún total, estudio ni lectura lo
 * ve: es dinero todavía no, como la bandeja. Su plazo es SUYO (waitHours,
 * la foto del ajuste al nacer): dueAt manda, y cambiar el ajuste jamás lo
 * mueve. askedAt sella la pregunta «¿Todavía lo quieres?» — una vez por
 * plazo. renewals cuenta las renovaciones: la primera rearma el plazo;
 * la segunda lo hace permanent (sin más preguntas). status: waiting en
 * cuarentena; left = dinero no gastado (suma a la cuenta del año);
 * bought = salió por la captura prerrellenada (su rastro queda en la
 * misma cuenta, sin sumar a lo ahorrado). Sin precio (amountMinor null)
 * no hay escenario ni cuenta — la tarjeta lo dice y trae su herramienta. */
export type Wish = {
  id: string;
  concept: string;
  amountMinor: number | null;
  currency: Currency;
  store: string;
  createdAt: string;               // ISO
  waitHours: number;               // su plazo prometido (24/48/72/168)
  dueAt: string;                   // ISO — cuándo vence la espera en curso
  askedAt: string;                 // "" = la pregunta no ha llegado
  renewals: number;
  permanent: boolean;              // sin más preguntas
  status: "waiting" | "left" | "bought";
  closedAt: string;                // ISO al dejarse o comprarse; "" en espera
  /** Las puertas de compartir (mapa §18, 1.3.362): el enlace del producto
   * cuando el deseo nació de uno compartido — es la puerta de vuelta al
   * producto y la dirección del precio mirado de nuevo. Ausente = el
   * deseo nació a mano o del catálogo, sin enlace. */
  link?: string;
  /** El precio mirado de nuevo (diseño 5c §3.3): UNA lectura en línea del
   * enlace, guardada con su fecha y atada a su dueAt (forDue) — renovar
   * la espera la rearma. Es una lectura etiquetada, jamás un precio
   * sellado: la hoja de compra lo ofrece y la persona lo corrige. */
  look?: { priceMinor: number; currency: Currency; at: string; forDue: string };
};

/** Una lista-plan (D6, 1.3.357): nace como índice (closedAt "") con sus
 * filas vivas en la bandeja; al cerrarse gana su foto de filas y su
 * resumen — el conteo completo del cierre: comprado + no había + después
 * + fuera = filas del plan, dicho en el folio para siempre. */
export type PlanList = {
  id: string;
  name: string;
  createdAt: string;               // ISO
  closedAt: string;                // "" mientras vive
  rows: PlanRow[];                 // la foto al cerrar; [] mientras vive
  summary?: {
    bought: number; later: number; gone: number; out: number;
    estMinor: number; realMinor: number; currency: Currency;
  };
};

/** Un texto de la Bitácora, congelado en los dos idiomas: la edición se
 * contó una vez y se lee para siempre tal como se contó. */
export type LogText = { es: string; en: string };

/** Una tarjeta de la serie anual. Tres tipos con cifra (big, compare,
 * trend) y dos de relato (cover, close) — la gramática fija del estudio.
 * Las cifras se congelan como monto + su moneda del día: la edición no se
 * convierte ni se recalcula al reabrirla. */
export type LogCard = {
  kind: "cover" | "big" | "compare" | "trend" | "close";
  title: LogText;
  figure?: { minor: number; currency: Currency };
  figureLabel?: LogText;
  before?: { minor: number; currency: Currency };
  context: LogText;
  explain: { what: LogText; how: LogText; so: LogText };
  /** trend: los 12 valores del año (en la moneda de la edición). */
  points?: number[];
  /** trend: el mes protagonista, 0–11. */
  mark?: number;
};

/** La edición anual encuadernada: el documento «Tu año en Faro». */
export type LogEdition = {
  year: number;
  /** El día en que se contó (ISO): el pie de la edición. */
  countedOn: string;
  /** Año parcial (el libro nació a mitad de año): la apertura lo declara. */
  partial: boolean;
  /** El primer mes con registro ("2025-08") cuando es parcial. */
  since: string;
  /** La moneda de lectura del día en que se contó. */
  currency: Currency;
  cards: LogCard[];
  /** "" hasta que la serie se cierra por primera vez (retira el anuncio). */
  seenAt: string;
};

/** La foto callada de un mes cerrado: el registro vivo del año en curso. */
export type LogMonth = {
  month: string; // "2026-10"
  countedOn: string;
  currency: Currency;
  income: number;
  expense: number;
  net: number;
  savedFlow: number;
  topName: LogText | null;
  topMinor: number;
};

export type Logbook = {
  months: Record<string, LogMonth>;
  editions: Record<string, LogEdition>;
};

/** Una pregunta predeterminada del Asesor (1.3.369): el texto tal como la
 * persona lo eligió del catálogo del banco o lo escribió ella. El ORDEN
 * de la lista es el orden de la persona — la caja las pinta en ese orden
 * y jamás desaparecen tras una respuesta. La fija del sistema («¿Qué
 * puedes hacer?») NO vive aquí: la pinta la caja misma, siempre primera. */
export type AskPreset = {
  id: string;
  text: string;
};

/** Una forma silenciada de la billetera por notificaciones (Ola 8):
 * la llave es app + forma del texto con las cifras plegadas, para que
 * el mismo aviso con otro monto también calle; la etiqueta es lo que
 * Ajustes muestra (la app y el principio del aviso, legible). */
/** La lápida de una línea borrada en un libro compartido (Pieza C3,
 * 1.3.392): el hecho, firmado — nunca la línea. Ver LedgerState. */
export type Tombstone = {
  /** El id de la línea borrada. */
  id: string;
  /** Cuándo se borró (ISO). */
  at: string;
  /** La cuenta que la borró. */
  by: string;
};

export type NoticeRule = {
  key: string;
  app: string;
  label: string;
  at: string;
};

export type LedgerState = {
  v: 1;
  structure: Structure;
  months: Record<string, { lines: Line[] }>;
  settings: Settings;
  audit: AuditEntry[];
  /** Added Nov 2026; missing in older ledgers and backups (= nobody). */
  people?: Person[];
  /** Bank import settings (Nov 2026): accounts, merchant rules, column maps. Missing in older ledgers and backups. */
  imports?: ImportBook;
  /** Ola 1 captura inteligente: la bandeja de borradores por revisar. Vive FUERA de months:
   *  ningún total, estudio ni lectura del Asesor puede verla — es dinero todavía no.
   *  Ausente en libros viejos = bandeja vacía. Viaja con el libro (D1). */
  drafts?: Draft[];
  /** La lista-plan (D6, 1.3.357): el índice de listas y, al cerrar, su
   *  folio. Una lista viva (closedAt "") tiene sus filas en drafts como
   *  Draft kind "plan" con su planId; al cerrarse, las filas se escriben
   *  en el registro como foto intocable junto a su resumen — el folio que
   *  vive en el Archivo mayor y del que la lista se reanuda. Ausente en
   *  libros viejos = ningún plan. Viaja con el libro, como la bandeja. */
  plans?: PlanList[];
  /** La lista de espera (5c, 1.3.360): los deseos en cuarentena y su
   * historia (la cuenta del año se deriva de aquí, nunca se almacena).
   * Ausente en libros viejos = ningún deseo. Viaja con el libro (D1). */
  wishes?: Wish[];
  /** La Bitácora (1.3.367): las fotos congeladas de los meses cerrados y
   * las ediciones anuales encuadernadas de «Tu año en Faro». Vive FUERA de
   * months y ningún total la lee: es un documento, no dinero. Una edición
   * guardada jamás se recalcula — corregir el libro no reescribe la
   * historia. Ausente en libros viejos = ninguna bitácora. Viaja con el
   * libro (D1). */
  logbook?: Logbook;
  /** Las preguntas predeterminadas del Asesor (1.3.369): la lista de la
   * persona, en SU orden, fuera de months — ningún total la lee. Ausente
   * en libros viejos = ninguna guardada. Viaja con el libro (D1). */
  askPresets?: AskPreset[];
  /** Las formas que la mesa enseñó que NO son un movimiento (Ola 8,
   * 1.3.388): «esto no es un movimiento» sobre un borrador de aviso
   * guarda la forma (app + texto con las cifras plegadas) y esa forma
   * deja de producir borradores. Viven en el libro, se administran en
   * Ajustes (Ritmo) y se borran una a una. Fuera de months: ningún
   * total las lee. */
  noticeRules?: NoticeRule[];
  /** Las lápidas del libro compartido (Pieza C3, 1.3.392): el hecho
   * firmado de que una línea se borró — su id, cuándo y quién — para
   * que ninguna copia vieja la resucite en la fusión (F-C2: lo borrado
   * se borra definitivamente). Vive FUERA de months: ningún total la
   * lee, y el historial conserva el hecho, nunca la línea. Ausente en
   * libros viejos y personales = ninguna lápida. */
  tombstones?: Tombstone[];
  /** Los patrones aprendidos del Asesor (Ola 11 del banco, integrados
   * en 1.3.383): las palabras del usuario para sus cosas, confirmadas
   * por su toque o su corrección — palabra → ciudadano, jamás una
   * cifra. Fuera de months: ningún total los lee. Ausente en libros
   * viejos = nada aprendido. Viaja con el libro (D1). */
  askPatterns?: LearnedAlias[];
  /** Loans received (Nov 2026). Missing in older ledgers and backups (= none). */
  loans?: Loan[];
  /** Money the user lent (Me deben, 1.3.92; device-only before). Abonos are income lines with `lentId`. See debts.ts. */
  lent?: Lent[];
  /** Old device Me deben ids already moved into the ledger, so the one-time move never runs twice (even after an archive). */
  lentMoved?: string[];
  /** Debt payoff plan (1.3.92): order and what the user can pay a month toward Préstamos. */
  debtPlan?: DebtPlan;
  /** Cuotas preset chips (Nov 2026, 1.3.75): pool ids, or own ones with a name and an optional data-URL icon. Missing in older ledgers (= defaults). */
  subPresets?: SubPreset[];
  /** 1.3.100: Cuotas icon-library presets the user deleted (ids from SUB_POOL). Absent = the whole library. */
  subIconsOff?: string[];
  /** Cuotas frequency chips (1.3.76): cadence tokens in order. Missing in older ledgers (= the four defaults). */
  freqPresets?: string[];
  /** 1.3.100: frequencies the user set with "Otro…" ("3w", "10d"…), newest first, at most 4. Absent = none. */
  freqCustom?: string[];
  /** Custom colours the user saved in the colour picker (1.3.99), newest first, at most 6. Missing in older ledgers (= none). */
  myColors?: string[];
  /** Default Retiro presets the user removed (1.3.81, e.g. "primerica"). Missing = all offered. See retiro.ts. */
  retiroOff?: string[];
  /** 1.3.107: credit cards (Debo → Préstamos → Tarjetas). Missing in older ledgers (= only the presets, empty). */
  cards?: CreditCard[];
  /** 1.3.107: preset cards the user removed ("chase", "wellsfargo", "paypal"). Missing = all offered. */
  cardsOff?: string[];
  /** 1.3.118: the people the user sends remittances to (Remesas → Para). Missing in older ledgers (= none). */
  remitPeople?: RemitPerson[];
  /** Los períodos apartados (Historial → Archivo, descanso.ts). Missing in older ledgers and
   *  backups (= nada apartado). Viaja con el libro: lo apartado en un aparato, apartado en todos. */
  restingSpans?: RestingSpan[];
  revision: number;
  updatedAt: string;
};

/** El Archivo de Debo (screens.tsx, DueOwe): una serie archivada con su historial de pagos.
 *  Vive FUERA del libro, en la clave global `faro-due-file` de localStorage (duefile.ts). */
export type DueFile = {
  id: string;
  seriesId: string;
  name: string;
  maxMinor: number;
  currency: Currency;
  archivedOn: string;
  pays: { date: string; amountMinor: number }[];
};

export type BackupFile = {
  app: "FARO";
  v: 1;
  exportedAt: string;
  ledger: LedgerState;
  /** 1.3.168 (la puerta): la capa del aparato (devicelayer.ts) como sección hermana — el
   *  contenido del libro no cambia. Ausente en respaldos viejos: la capa queda intacta. */
  device?: Record<string, string>;
  /** 1.3.169: el Archivo de Debo (duefile.ts) como su PROPIA sección hermana — es dato del
   *  dueño, no capa del aparato. Ausente en respaldos viejos: el Archivo del aparato que
   *  restaura queda intacto (una sección ausente jamás borra). */
  dueFile?: DueFile[];
};

export type Tone = "neutral" | "good" | "warn" | "bad";

export type Insight = {
  id: string;
  title: string;
  value: string;
  detail: string;
  tone: Tone;
  meaning: string;
  formula: string;
  implication: string;
  /** Optional picture data for the Números clave card. */
  viz?: InsightViz;
};

export type InsightViz =
  | { kind: "ring"; pct: number; mark?: number }
  | { kind: "parts"; parts: { name: string; share: number; color: string }[]; cut: number }
  | { kind: "split"; a: number; b: number; aLabel: string; bLabel: string }
  | { kind: "cover"; months: number; goal: number }
  | { kind: "days"; day: number | null; days: number }
  | { kind: "delta"; now: number; prev: number }
  | { kind: "share"; pct: number };

export type Slice = { id: string; name: string; minor: number; color: string };

export type Summary = {
  income: number;
  fixed: number;
  variable: number;
  purchases: number;
  subscriptions: number;
  expense: number;
  /** Ola 11 (BR11-2): el gasto de verdad — las clases de gasto sin el rol
   * ahorro. `expense` sigue siendo la salida por clases (de ella vive
   * opportunity, lo libre); `spend` es lo que las superficies que dicen
   * «gastó» deben sumar, y spentPct se calcula sobre él. */
  spend: number;
  opportunity: number;
  spentPct: number | null;
  debt: number;
  debtPct: number | null;
  debtAllowance: number;
  savingsFlow: number;
  savingsGoal: number;
  petty: number;
  remittance: number;
  housing: number;
  tone: Tone;
  semaphore: string;
};

export type Cut = { name: string; minor: number };
export type BudgetPlan = {
  income: number;
  savingsTarget: number;
  fixed: number;
  debt: number;
  room: number;
  variableActual: number;
  gap: number;
  cuts: Cut[];
  feasible: boolean;
  note: string;
};

export type AdvicePoint = { label: string; value: string; note: string; emphasis?: boolean };
export type AdviceMeter = { pct: number; caption: string };
export type AdviceCard = {
  horizon: "short" | "medium" | "long";
  title: string;
  lead: string;
  body: string;
  evidence: string;
  points: AdvicePoint[];
  meter: AdviceMeter | null;
  nums?: Record<string, number>;
};

export type MonthPoint = { key: string; label: string; income: number; expense: number; saved: number };
/* Ola 11 (BR11-3): `expense` en un punto es SOLO-GASTO (la definición del
 * coach: lo no-ingreso sin el rol ahorro) y `saved` nombra el apartado del
 * periodo aparte — income − expense − saved sigue siendo el neto en
 * efectivo, derivable y verdadero en cada superficie que lee puntos. */

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  "nav-prev": "ArrowLeft",
  "nav-next": "ArrowRight",
  undo: "Mod+Z",
  redo: "Mod+Y",
  "redo-alt": "Mod+Shift+Z",
  search: "Mod+K",
  sync: "Mod+S",
  export: "Mod+E",
  "toggle-currency": "Mod+\\",
  "new-line": "Mod+N",
  settings: "Mod+,",
  "month-prev": "Mod+ArrowLeft",
  "month-next": "Mod+ArrowRight",
  calculator: "Mod+J",
  help: "Shift+/",
};

export const SHORTCUT_ACTIONS = Object.keys(DEFAULT_SHORTCUTS);
