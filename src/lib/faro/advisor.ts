import { convertMinor, formatMoney, formatPct } from "./money.ts";
import type { Currency, Lang, LedgerState, Line, Structure } from "./types.ts";

type Namer = {
  cat: (id: string) => string;
  sub: (id: string) => string;
  purchase: (id: string) => string;
  catalog: (id: string) => string;
};

export type OutClass =
  | "essential-fixed"
  | "essential-variable"
  | "discretionary"
  | "unique"
  | "credit"
  | "transfer";

export type ReadLine = {
  id: string;
  name: string;
  categoryId: string;
  category: string;
  minor: number;
  cls: OutClass;
  recurrent: boolean;
  unconfirmed: boolean;
  vague: boolean;
};

export type FigurePart = {
  id: string;
  label: string;
  minor: number;
  signed: number;
  rule: string;
  lines: { id: string; name: string; minor: number }[];
};

export type Lever = {
  id: string;
  verb: string;
  amountMinor: number;
  when: string;
  effectMinor: number;
  text: string;
};

export type ScenarioId = "base" | "repeat" | "plan";

export type Reading = {
  currency: Currency;
  monthTag: string;
  tone: "good" | "amber" | "bad";
  toneLabel: string;
  headline: string;
  action: string;
  alert: string;
  creditBlurb: string;
  baseSurplus: number;
  uniqueMinor: number;
  uniqueCount: number;
  transferMinor: number;
  recurrentMinor: number;
  income: number;
  incomeFixed: number;
  incomeVariable: number;
  outTotal: number;
  realSpend: number;
  left: number;
  leftIfTransferCovers: number;
  naiveFixed: number;
  classificationError: string | null;
  cushionMinor: number;
  variablePct: number | null;
  topSourceName: string;
  topSourceMinor: number;
  topSourcePct: number | null;
  debtMinor: number;
  debtPct: number | null;
  debtTermKnown: boolean;
  creditAsk: string | null;
  pocketAside: number;
  savingsFlow: number;
  contradiction: string | null;
  vagueQuestion: string | null;
  vagueName: string;
  vagueMinor: number;
  vaguePct: number | null;
  splitNote: string | null;
  ironmanMinor: number;
  gasMinor: number;
  ironmanPct: number | null;
  parts: { base: FigurePart; unique: FigurePart; transfer: FigurePart };
  top: { name: string; minor: number; pctOfOut: number | null; cls: OutClass }[];
  levers: Lever[];
  plan: string;
  antNote: string | null;
  paceNote: string;
  calendarNote: string;
  compareNote: string;
  balanceGap: number;
  lines: ReadLine[];
  scenarios: { id: ScenarioId; label: string; detail: string; left: number }[];
};

const ESSENTIAL = new Set(["housing", "transport", "food", "family", "insurance", "pets", "remittance", "health"]);
const VAGUE = /^(carga|otro|otros|otra|reparaci[oó]n|varios|misc|miscellaneous|other|repair|repairs|cosa|pago|gastos?|stuff|xxx|n\/a|na)$/i;

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

function roleOf(structure: Structure, categoryId: string): string {
  return structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

function isVaultSub(structure: Structure, subId: string): boolean {
  if (!subId) return false;
  for (const category of structure.categories) {
    const sub = category.subs.find((item) => item.id === subId);
    if (!sub) continue;
    return sub.icon === "vault" || sub.icon.startsWith("vault:");
  }
  return false;
}

function inView(line: Line, display: Currency, rateE4: number): number {
  if (!line.active) return 0;
  return convertMinor(line.amountMinor, line.currency, display, rateE4);
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

function shiftKey(key: string, delta: number): string {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function lastKeys(key: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) keys.push(shiftKey(key, -i));
  return keys;
}

function seenIn(state: LedgerState, line: Line, key: string): number {
  let hits = 0;
  for (const month of lastKeys(key, 3)) {
    const bucket = state.months[month]?.lines ?? [];
    const found = bucket.some((item) => {
      if (!item.active || item.kind.startsWith("income")) return false;
      if (line.seriesId && item.seriesId === line.seriesId) return true;
      return norm(item.concept) !== "" && norm(item.concept) === norm(line.concept) && item.categoryId === line.categoryId;
    });
    if (found) hits += 1;
  }
  return hits;
}

function lineName(line: Line, names: Namer): string {
  return line.concept || names.sub(line.subId) || names.cat(line.categoryId) || names.purchase(line.categoryId) || line.kind;
}

function categoryName(line: Line, names: Namer): string {
  return names.cat(line.categoryId) || names.purchase(line.categoryId) || line.categoryId || line.kind;
}

function classify(line: Line, state: LedgerState, key: string): { cls: OutClass; recurrent: boolean; unconfirmed: boolean } {
  const role = roleOf(state.structure, line.categoryId);
  if (role === "savings") return { cls: "transfer", recurrent: false, unconfirmed: false };
  const hits = seenIn(state, line, key);
  const marked = line.kind === "expense-fixed" || line.kind === "subscription" || line.recurring === true || hits >= 2;
  if (role === "debt") return { cls: "credit", recurrent: marked, unconfirmed: false };
  if (!marked) return { cls: "unique", recurrent: false, unconfirmed: true };
  if (line.kind === "subscription") return { cls: "discretionary", recurrent: true, unconfirmed: false };
  const roleName = role || "";
  if (!ESSENTIAL.has(roleName) && roleName) return { cls: "discretionary", recurrent: true, unconfirmed: false };
  if (line.kind === "expense-variable") return { cls: "essential-variable", recurrent: true, unconfirmed: false };
  return { cls: "essential-fixed", recurrent: true, unconfirmed: false };
}

function isVague(name: string): boolean {
  return VAGUE.test(name.trim());
}

export type AdvisorOptions = { today?: Date };

export function readAdvisor(state: LedgerState, key: string, lang: Lang, names: Namer, options: AdvisorOptions = {}): Reading {
  const today = options.today ?? new Date();
  const { display, rateE4 } = state.settings;
  const money = (n: number) => formatMoney(n, display, lang);
  const pct = (n: number | null) => formatPct(n, lang);
  const lines = (state.months[key]?.lines ?? []).filter((line) => line.active);
  const read: ReadLine[] = [];
  for (const line of lines) {
    if (line.kind.startsWith("income")) continue;
    const minor = inView(line, display, rateE4);
    if (!minor) continue;
    const cls = classify(line, state, key);
    const name = lineName(line, names);
    read.push({
      id: line.id,
      name,
      categoryId: line.categoryId,
      category: categoryName(line, names),
      minor,
      cls: cls.cls,
      recurrent: cls.recurrent,
      unconfirmed: cls.unconfirmed,
      vague: isVague(name),
    });
  }

  const sumCls = (pred: (line: ReadLine) => boolean) => read.filter(pred).reduce((acc, line) => acc + line.minor, 0);
  const recurrentMinor = sumCls((line) => line.cls !== "unique" && line.cls !== "transfer");
  const uniqueMinor = sumCls((line) => line.cls === "unique");
  const transferMinor = sumCls((line) => line.cls === "transfer");
  const outTotal = recurrentMinor + uniqueMinor + transferMinor;
  const incomeLines = lines.filter((line) => line.kind.startsWith("income"));
  const incomeOf = (kind: Line["kind"]) =>
    incomeLines.filter((line) => line.kind === kind).reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const incomeFixed = incomeOf("income-fixed");
  const incomeVariable = incomeOf("income-variable");
  const income = incomeFixed + incomeVariable;
  const realSpend = outTotal - transferMinor;
  const left = income - outTotal;
  const baseSurplus = income - recurrentMinor;
  const leftIfTransferCovers = income - realSpend;
  const balanceGap = baseSurplus - uniqueMinor - transferMinor - left;

  const naiveFixed = lines
    .filter((line) => line.kind === "expense-fixed")
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const transferInsideFixed = lines
    .filter((line) => line.kind === "expense-fixed" && roleOf(state.structure, line.categoryId) === "savings")
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const classificationError =
    transferInsideFixed > 0
      ? L(
          lang,
          `Tus “fijos” de ${money(naiveFixed)} incluyen ${money(transferInsideFixed)} que en realidad es ahorro. Ahorrar no es gastar: muévelo a la categoría Ahorro y tus fijos se verán como son.`,
          `The “fixed” total of ${money(naiveFixed)} includes the ${money(transferInsideFixed)} transfer. A transfer is not spending and it is not fixed: that is a classification error.`,
        )
      : null;

  const savingsFlow = transferMinor;
  const pocketAside = lines
    .filter(
      (line) =>
        line.kind === "expense-fixed" &&
        roleOf(state.structure, line.categoryId) === "savings" &&
        !isVaultSub(state.structure, line.subId),
    )
    .reduce((acc, line) => acc + inView(line, display, rateE4), 0);
  const contradiction =
    pocketAside === 0 && savingsFlow > 0
      ? L(
          lang,
          `Mandaste ${money(savingsFlow)} a una cuenta de ahorro, pero tus metas (Meta, Retiro, Emergencia) siguen en ${money(0)}. Decide a cuál meta va ese dinero para que el avance se vea.`,
          `This month's set-aside shows ${money(0)} and Savings shows ${money(savingsFlow)}. The pockets have to be reconciled: moving money to an account is not the same as funding the goal.`,
        )
      : null;

  const debtLines = read.filter((line) => line.cls === "credit");
  const debtMinor = debtLines.reduce((acc, line) => acc + line.minor, 0);
  const debtPct = income > 0 ? (debtMinor / income) * 100 : null;
  const rawDebts = lines.filter((line) => roleOf(state.structure, line.categoryId) === "debt");
  const debtTermKnown = rawDebts.length > 0 && rawDebts.every((line) => line.balanceMinor !== null && line.aprBps > 0);
  const creditAsk = !debtTermKnown && debtMinor > 0
    ? L(
        lang,
        "Por ahora solo veo la cuota de este mes. Anota cuánto debes, la tasa anual y el pago mínimo, y te digo en cuántos meses terminas.",
        "On the credit I can only judge this month's load. Enter the balance, the annual rate, and the minimum payment: without those three there is no payoff date.",
      )
    : null;

  const variablePct = income > 0 ? (incomeVariable / income) * 100 : null;
  const variableLines = incomeLines.filter((line) => line.kind === "income-variable");
  const topSource = [...(variableLines.length ? variableLines : incomeLines)].sort((a, b) => inView(b, display, rateE4) - inView(a, display, rateE4))[0];
  const topSourceMinor = topSource ? inView(topSource, display, rateE4) : 0;
  const topSourcePct = income > 0 && topSource ? (topSourceMinor / income) * 100 : null;
  const topSourceName = topSource ? lineName(topSource, names) : "";

  const uniqueLines = read.filter((line) => line.cls === "unique").sort((a, b) => b.minor - a.minor);
  const uniqueCount = uniqueLines.length;
  const biggestUnique = uniqueLines[0];
  const byCategory = new Map<string, ReadLine[]>();
  for (const line of read.filter((item) => item.cls !== "transfer")) {
    const bucket = byCategory.get(line.categoryId) ?? [];
    bucket.push(line);
    byCategory.set(line.categoryId, bucket);
  }
  let splitNote: string | null = null;
  let ironmanMinor = 0;
  let gasMinor = 0;
  let ironmanPct: number | null = null;
  for (const group of byCategory.values()) {
    const uniques = group.filter((line) => line.cls === "unique");
    const recurrent = group.filter((line) => line.cls !== "unique");
    if (!uniques.length || !recurrent.length) continue;
    const big = [...uniques].sort((a, b) => b.minor - a.minor)[0];
    if (!big) continue;
    const recurrentSum = recurrent.reduce((acc, line) => acc + line.minor, 0);
    const share = income > 0 ? (big.minor / income) * 100 : null;
    const note = L(
      lang,
      `${big.category} no es un hábito: ${money(big.minor)} fue una sola compra (${big.name})${share !== null ? `, el ${pct(share)} de lo que entra` : ""}. Lo que sí se repite ahí cada mes son ${money(recurrentSum)}${recurrent[0] ? ` (${recurrent.map((line) => line.name).join(", ")})` : ""}.`,
      `${big.category} is not a habit. ${money(big.minor)} is one purchase (${big.name})${share !== null ? `, ${pct(share)} of what comes in` : ""}. What does repeat in that category is ${money(recurrentSum)}${recurrent[0] ? ` (${recurrent.map((line) => line.name).join(", ")})` : ""}.`,
    );
    if (!splitNote || big.minor > ironmanMinor) {
      splitNote = note;
      ironmanMinor = big.minor;
      gasMinor = recurrentSum;
      ironmanPct = share;
    }
  }

  const vagueCandidates = read
    .filter((line) => line.vague && line.cls !== "transfer" && (income <= 0 || line.minor * 10 > income))
    .sort((a, b) => b.minor - a.minor);
  const vague = vagueCandidates[0];
  const vaguePct = vague && income > 0 ? (vague.minor / income) * 100 : null;
  const vagueQuestion = vague
    ? L(
        lang,
        `«${vague.name}» son ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} de lo que entra)` : ""}, pero el nombre no dice qué es. Ponle un nombre claro y te digo si conviene moverlo.`,
        `${vague.name} is ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} of what comes in)` : ""} and the name does not say what it is. What is ${vague.name}, before any advice on that line?`,
      )
    : null;

  const prior = lastKeys(key, 6).filter((month) => month !== key && (state.months[month]?.lines.length ?? 0) > 0);
  const compareNote =
    prior.length === 0
      ? L(
          lang,
          "Es tu primer mes con datos, así que todavía no hay promedios para comparar. Las compras de una vez no cuentan como hábito.",
          "This is the first month with data. There is no 3-month or 6-month average. One-off purchases stay events and do not enter an average.",
        )
      : L(
          lang,
          `Comparo solo lo que se repite contra ${prior.length} mes${prior.length === 1 ? "" : "es"} anterior${prior.length === 1 ? "" : "es"}. Las compras de una vez no entran al promedio.`,
          `I compare only what repeats against ${prior.length} earlier month${prior.length === 1 ? "" : "s"}. One-offs do not enter the average.`,
        );

  const days = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate() || 30;
  const perDay = days > 0 ? Math.round(recurrentMinor / days) : 0;
  const dated = lines
    .filter((line) => !line.kind.startsWith("income") && line.bookedOn)
    .map((line) => ({ line, minor: inView(line, display, rateE4), day: line.bookedOn || "" }))
    .filter((item) => item.minor > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
  let paceNote = L(
    lang,
    `Lo que se repite cada mes te cuesta ${money(perDay)} al día. Si anotas cuánto tienes en el banco, te digo cuántos días aguantarías si dejara de entrar dinero.`,
    `Repeating spending is ${money(perDay)} a day. I will not invent runway days (how many days you could last if nothing else came in): there is no cash balance on file.`,
  );
  if (dated.length && income > 0) {
    let running = 0;
    let crossed: { name: string; day: string } | null = null;
    for (const item of dated) {
      running += item.minor;
      if (!crossed && running > income) crossed = { name: lineName(item.line, names), day: item.day };
    }
    paceNote = crossed
      ? L(
          lang,
          `El ${crossed.day}, con ${crossed.name}, lo que sale pasa a ser más de lo que entra. Ese es el día que hay que cuidar.`,
          `The day the month stops covering is ${crossed.day}, when ${crossed.name} lands. That is not a blind average: it is that outflow.`,
        )
      : L(
          lang,
          `Con las fechas anotadas, ningún pago deja el mes en rojo. Lo que se repite te cuesta ${money(perDay)} al día.`,
          `With the dates on file, no single outflow crosses income by itself. Repeating spending is ${money(perDay)} a day.`,
        );
  } else if (uniqueMinor > 0 && left < 0) {
    paceNote = L(
      lang,
      `El hueco no viene del gasto de todos los días: son compras de una vez por ${money(uniqueMinor)} que ya salieron. Ponles fecha a tus pagos y te digo qué día aprieta.`,
      `There are no dates, so I will not invent a break day. The hole is not a daily pace: it is ${money(uniqueMinor)} of one-off purchases that already left.`,
    );
  }

  const warnAt = Math.max(display === "USD" ? 5000 : convertMinor(5000, "USD", display, rateE4), income > 0 ? Math.round(income * 0.05) : 0);
  const horizonEnd = addDays(today, 30);
  const upcoming = lines.filter((line) => {
    if (line.kind.startsWith("income")) return false;
    const when = line.nextDue || line.bookedOn || "";
    if (!when) return false;
    const day = new Date(`${when.slice(0, 10)}T12:00:00`);
    return day >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) && day <= horizonEnd;
  });
  const loud = upcoming.filter((line) => inView(line, display, rateE4) >= warnAt);
  const calendarNote = upcoming.length
    ? L(
        lang,
        loud.length
          ? `En los próximos 30 días tienes ${upcoming.length} pagos con fecha. Los más grandes (más de ${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `En los próximos 30 días tienes ${upcoming.length} pagos con fecha, ninguno mayor de ${money(warnAt)}.`,
        loud.length
          ? `The next 30 days have ${upcoming.length} dated outflows. ${loud.length} cross the warning (${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `The next 30 days have ${upcoming.length} dated outflows. None cross the ${money(warnAt)} warning.`,
      )
    : L(
        lang,
        "No hay pagos con fecha en los próximos 30 días. Ponles fecha a tus pagos fijos y te aviso antes de que venzan.",
        "No outflows are dated in the next 30 days. With no date I will not warn about a due day.",
      );

  const subs = read.filter((line) => line.cls === "discretionary" && lines.find((raw) => raw.id === line.id)?.kind === "subscription");
  const antNote = subs.length
    ? L(
        lang,
        `${subs.map((line) => `${line.name}: ${money(line.minor)} al mes son ${money(line.minor * 12)} al año`).join(". ")}. Revísalas, pero primero mira lo grande: los gastos hormiga (chiquitos que se repiten) importan después.`,
        `${subs.map((line) => `${line.name} ${money(line.minor)} a month is ${money(line.minor * 12)} a year`).join(". ")}. This does not close your hole; it is housekeeping, not a rescue. Leak spending (small repeats you stop noticing) comes after the large lines.`,
      )
    : null;

  const monthDate = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1);
  const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthTag =
    monthDate.getTime() > todayMonth.getTime()
      ? L(lang, "proyección", "projection")
      : monthDate.getTime() < todayMonth.getTime()
        ? L(lang, "hecho", "closed")
        : L(lang, "hasta hoy", "so far");

  const red = left < 0;
  const atypical = baseSurplus >= 0 && uniqueMinor > 0 && red;
  const tone: Reading["tone"] = income <= 0 ? "amber" : !red ? "good" : atypical ? "amber" : "bad";
  const toneLabel =
    tone === "good"
      ? L(lang, "Vas bien: tus gastos de cada mes caben en lo que entra.", "You're on track: your monthly bills fit in what comes in.")
      : tone === "amber"
        ? L(lang, "Mes raro, pero manejable: lo desbalancearon compras de una vez, no tu día a día.", "An unusual month, but manageable: one-time buys tipped it, not your everyday spending.")
        : L(lang, "Alerta: tus gastos de cada mes ya no caben en lo que entra. Hay que bajar algo o subir el ingreso.", "Alert: your monthly bills no longer fit in what comes in. Something has to come down or income has to go up.");

  const cushionMinor = recurrentMinor * (state.settings.emergencyMonths || 3);
  const goalMinor = income > 0 ? Math.round((income * state.settings.savingsGoalPct) / 100) : 0;
  const hundred = display === "USD" ? 10000 : convertMinor(10000, "USD", display, rateE4);

  let headline = "";
  let action = "";
  if (income <= 0) {
    headline = L(
      lang,
      "Este mes todavía no tiene ingresos. Anota lo que te entra y te digo cómo vas.",
      "This month has no income. Without it I will not judge percents or invent a plan. Enter what comes in.",
    );
    action = L(lang, "Qué hacer: anota el ingreso de este mes, aunque sea uno.", "What to do: enter this month's income, even one line.");
  } else if (baseSurplus < 0 && uniqueMinor === 0) {
    headline = L(
      lang,
      `Tus gastos de cada mes, sin contar compras de una vez, ya son más grandes que lo que entra: faltan ${money(-baseSurplus)}. Esto no se arregla solo.`,
      `There is a structural deficit (your usual bills, without one-off purchases, are already larger than income): ${money(baseSurplus)}. Waiting does not fix that.`,
    );
    action = L(
      lang,
      `Qué hacer: baja un gasto que se repite o consigue un ingreso seguro de al menos ${money(-baseSurplus)} al mes.`,
      `Action #1: lower a repeating bill or raise the income floor by at least ${money(-baseSurplus)}.`,
    );
  } else if (atypical && transferMinor > 0) {
    headline = L(
      lang,
      `Tu día a día está bien. Lo que desbalanceó el mes fueron ${uniqueCount} compra${uniqueCount === 1 ? "" : "s"} grande${uniqueCount === 1 ? "" : "s"} y un ahorro que salió en el peor momento.`,
      `Your daily spending did not fail. ${uniqueCount} large purchases and a transfer in the wrong month broke it.`,
    );
    action = L(
      lang,
      `Qué hacer: decide qué pasa con los ${money(transferMinor)} que ahorraste. Si pueden tapar el hueco, lo que falta baja a ${money(Math.abs(leftIfTransferCovers))}. Si son intocables, hay que recortar en otro lado.`,
      `Action #1: decide the transfer. If that ${money(transferMinor)} can cover the hole, the month's real gap falls to ${money(Math.abs(leftIfTransferCovers))}. If it was untouchable, the plan is different.`,
    );
  } else if (atypical) {
    headline = L(
      lang,
      `Tu día a día está bien. Lo que desbalanceó el mes fueron ${uniqueCount} compra${uniqueCount === 1 ? "" : "s"} grande${uniqueCount === 1 ? "" : "s"}. Sin ellas, te sobraban ${money(baseSurplus)}.`,
      `Your daily spending did not fail. ${uniqueCount} large purchases broke it. The base, without them, closed at ${money(baseSurplus)}.`,
    );
    action = biggestUnique
      ? L(
          lang,
          `Qué hacer: mira si ${biggestUnique.name} (${money(biggestUnique.minor)}) se puede devolver o vender. Ya se gastó, así que recortar el día a día no lo arregla.`,
          `Action #1: check whether ${biggestUnique.name} (${money(biggestUnique.minor)}) can be returned or offset. It is already spent: it cannot be “cut” from everyday spending.`,
        )
      : L(lang, "Qué hacer: marca qué compra fue de una vez y cuál se repite.", "What to do: mark which purchase was one-time and which repeats.");
  } else if (!red) {
    headline = L(
      lang,
      `Tus gastos de cada mes caben y te sobran ${money(baseSurplus)}. ${uniqueMinor > 0 ? `Aparte hubo ${money(uniqueMinor)} en compras de una vez.` : "No hubo compras grandes de una vez."}`,
      `The base closes ahead: ${money(baseSurplus)}. ${uniqueMinor > 0 ? `One-off purchases are ${money(uniqueMinor)}.` : "There are no one-off purchases to cut."}`,
    );
    action = L(
      lang,
      `Qué hacer: no recortes lo que ya cabe. Si vas a ahorrar, usa lo que sobra (${money(Math.max(0, left))}) antes de que se vaya en gastos pequeños.`,
      `Action #1: do not cut what already fits. If you set money aside, use what is left (${money(Math.max(0, left))}), not money you already spent.`,
    );
  } else {
    headline = L(
      lang,
      `El mes cierra en ${money(left)}. Lo de cada mes deja ${money(baseSurplus)}; las compras de una vez fueron ${money(uniqueMinor)} y el ahorro ${money(transferMinor)}.`,
      `The month closes at ${money(left)}. The repeating base is ${money(baseSurplus)}; one-offs are ${money(uniqueMinor)}; the transfer is ${money(transferMinor)}.`,
    );
    action = L(
      lang,
      `Qué hacer: empieza por el gasto más grande que todavía puedes cambiar, no por el más chiquito.`,
      `Action #1: move the largest line you can still decide, not the smallest one.`,
    );
  }

  const floorPhrase = L(
    lang,
    `ingreso seguro (lo que entra casi seguro cada mes)`,
    `income floor (what almost certainly comes in each month, even if everything else fails)`,
  );
  const alert =
    income <= 0
      ? L(lang, "Sin ingresos anotados no puedo medir tus compromisos.", "With no income recorded I can't measure your commitments.")
      : L(
          lang,
          `El ${pct(variablePct)} de lo que entra cambia de mes a mes${topSourceName ? ` (${topSourceName} es el ${pct(topSourcePct)})` : ""}. Lo prudente es pagar tus gastos de cada mes (${money(recurrentMinor)}) con tu ${floorPhrase}: ${money(incomeFixed)}.`,
          `${pct(variablePct)} of what comes in is variable. ${topSourceName ? `${topSourceName} is ${pct(topSourcePct)}.` : ""} Your commitments (${money(recurrentMinor)}) are judged against the ${floorPhrase}: ${money(incomeFixed)}.`,
        );

  const creditBlurb =
    debtMinor <= 0
      ? L(lang, "Este mes no hay pagos de crédito.", "No credit payments this month.")
      : debtPct !== null && debtPct < state.settings.debtGreenPct
        ? L(
            lang,
            `Tu crédito va bien: pagas ${money(debtMinor)}, el ${pct(debtPct)} de lo que entra. ${creditAsk ?? ""}`,
            `Your credit is fine: you pay ${money(debtMinor)}, ${pct(debtPct)} of what comes in. ${creditAsk ?? ""}`,
          )
        : L(
            lang,
            `El pago del crédito es ${money(debtMinor)}${debtPct !== null ? ` (${pct(debtPct)} de lo que entra)` : ""}. ${creditAsk ?? ""}`,
            `The credit payment is ${money(debtMinor)}${debtPct !== null ? ` (${pct(debtPct)} of what comes in)` : ""}. ${creditAsk ?? ""}`,
          );

  const partOf = (id: string, label: string, minor: number, signed: number, rule: string, pred: (line: ReadLine) => boolean): FigurePart => ({
    id,
    label,
    minor,
    signed,
    rule,
    lines: read.filter(pred).map((line) => ({ id: line.id, name: line.name, minor: line.minor })),
  });
  const parts = {
    base: partOf(
      "base",
      L(lang, "De siempre", "Usual"),
      recurrentMinor,
      baseSurplus,
      L(
        lang,
        "Lo que entra menos lo que pagas todos los meses (casa, comida, créditos, cuotas). Sin contar compras de una vez ni ahorro.",
        "Income minus what repeats (essentials, credit, and subscriptions). No one-off purchases and no transfers.",
      ),
      (line) => line.cls !== "unique" && line.cls !== "transfer",
    ),
    unique: partOf(
      "unique",
      L(lang, "De una vez", "One-time"),
      uniqueMinor,
      -uniqueMinor,
      L(
        lang,
        "Compras que no aparecen en tus meses anteriores ni están marcadas como fijas. Parecen de una sola vez; si alguna se repite, márcala fija.",
        "It left once. Without a history of 2 of the last 3 months, and not marked fixed: looks one-off — unconfirmed.",
      ),
      (line) => line.cls === "unique",
    ),
    transfer: partOf(
      "transfer",
      L(lang, "Ahorro", "Saved"),
      transferMinor,
      -transferMinor,
      L(
        lang,
        "Dinero que pasó a tus bolsas de ahorro. No es gasto: sigue siendo tuyo. Si el mes cierra en rojo, vale la pena revisar si era el momento.",
        "Money moving between pockets. It is not spending and it is not fixed. In a red month it is a decision to review, not a win.",
      ),
      (line) => line.cls === "transfer",
    ),
  };

  const top = [...read]
    .sort((a, b) => b.minor - a.minor)
    .slice(0, 5)
    .map((line) => ({
      name: line.name,
      minor: line.minor,
      pctOfOut: outTotal > 0 ? (line.minor / outTotal) * 100 : null,
      cls: line.cls,
    }));

  const when0 = iso(today);
  const when7 = iso(addDays(today, 7));
  const when30 = iso(addDays(today, 30));
  const when90 = iso(addDays(today, 90));
  const fmtDay = (value: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-NI", { day: "numeric", month: "short" }).format(
      new Date(`${value}T12:00:00`),
    );

  const levers: Lever[] = [];
  if (transferMinor > 0 && red) {
    levers.push({
      id: "transfer",
      verb: L(lang, "Decidir", "Decide"),
      amountMinor: transferMinor,
      when: when0,
      effectMinor: leftIfTransferCovers,
      text: L(
        lang,
        `Hoy (${fmtDay(when0)}): decide si los ${money(transferMinor)} ahorrados tapan el hueco. Si sí, el mes pasa de ${money(left)} a ${money(leftIfTransferCovers)}.`,
        `Decide the ${money(transferMinor)} transfer on ${fmtDay(when0)}. If it covers the hole, the month's real gap moves from ${money(left)} to ${money(leftIfTransferCovers)}.`,
      ),
    });
  }
  if (biggestUnique && red) {
    const after = left + biggestUnique.minor;
    levers.push({
      id: "return",
      verb: L(lang, "Devolver", "Return"),
      amountMinor: biggestUnique.minor,
      when: when7,
      effectMinor: after,
      text: L(
        lang,
        `Antes del ${fmtDay(when7)}: pregunta si ${biggestUnique.name} (${money(biggestUnique.minor)}) se puede devolver. Si te reembolsan, el mes pasa de ${money(left)} a ${money(after)}.`,
        `Check a return of ${biggestUnique.name} (${money(biggestUnique.minor)}) before ${fmtDay(when7)}. If it comes back, the hole moves from ${money(left)} to ${money(after)}. It is already spent: it is not an everyday cut.`,
      ),
    });
  }
  const nextUnique = uniqueLines[1];
  if (nextUnique && red) {
    const after = left + nextUnique.minor;
    levers.push({
      id: "sell",
      verb: L(lang, "Vender", "Sell"),
      amountMinor: nextUnique.minor,
      when: when30,
      effectMinor: after,
      text: L(
        lang,
        `Antes del ${fmtDay(when30)}: vende o recupera ${nextUnique.name} (${money(nextUnique.minor)}). Si entra ese dinero, el mes pasa de ${money(left)} a ${money(after)}.`,
        `Sell or offset ${nextUnique.name} (${money(nextUnique.minor)}) before ${fmtDay(when30)}. If that amount comes in, the hole moves from ${money(left)} to ${money(after)}.`,
      ),
    });
  }
  if (!red && baseSurplus >= 0) {
    levers.push({
      id: "keep",
      verb: L(lang, "Mantener", "Keep"),
      amountMinor: Math.max(0, left),
      when: when0,
      effectMinor: left,
      text: L(
        lang,
        `No hace falta recortar nada: el mes cierra con ${money(left)} a favor.`,
        `Keep the base. On ${fmtDay(when0)} there is no cut to make: the month closes at ${money(left)}.`,
      ),
    });
  }
  if (income <= 0) {
    levers.push({
      id: "income",
      verb: L(lang, "Anotar", "Enter"),
      amountMinor: 0,
      when: when0,
      effectMinor: 0,
      text: L(
        lang,
        `Anota hoy lo que te entra este mes.`,
        `Enter income on ${fmtDay(when0)}. Without that amount there is no effect to calculate.`,
      ),
    });
  }

  const transferNames = read
    .filter((line) => line.cls === "transfer")
    .map((line) => line.name)
    .slice(0, 3)
    .join("/");
  const day24 = levers[0]
    ? levers[0].text
    : L(lang, `Hoy no hay nada urgente. Revisa solo los pagos que tienen fecha.`, `On ${fmtDay(when0)} there is no large lever. Review only what has a date.`);
  const day7 = L(
    lang,
    `Para el ${fmtDay(when7)}: paga primero lo que tiene fecha con tu ${floorPhrase} (${money(incomeFixed)})${debtMinor > 0 ? `. No subas la cuota del crédito (${money(debtMinor)}) este mes y anota cuánto debes, la tasa y el pago mínimo` : ""}.`,
    `Cover dated payments with the ${floorPhrase} (${money(incomeFixed)})${debtMinor > 0 ? `; do not raise the credit payment (${money(debtMinor)}) this month; enter the balance, the annual rate, and the minimum payment` : ""}. Date: ${fmtDay(when7)}.`,
  );
  const day30 = L(
    lang,
    `Para el ${fmtDay(when30)}: antes de cualquier compra de más de ${money(hundred)}, espera 24 horas y decide de dónde sale el dinero. Cuando te entre un ingreso extra, repártelo así: 50% a tapar huecos, 30% al colchón y 20% para ti.`,
    `No one-off purchase above ${money(hundred)} without a 24-hour rule and a written source. The next variable income splits 50% hole / 30% cushion / 20% free. Date: ${fmtDay(when30)}.`,
  );
  const day90 = L(
    lang,
    `Para el ${fmtDay(when90)}: arma un colchón (dinero solo para emergencias) de ${money(cushionMinor)}, que son ${state.settings.emergencyMonths || 3} meses de lo esencial. Ahorra tu ${state.settings.savingsGoalPct}% (${money(goalMinor)}) en los meses que cierren a favor.`,
    `Minimum cushion (money kept for a shock; a sound goal is 3 months of essentials) of ${money(cushionMinor)}, reconciled between Savings and the set-aside. The ${state.settings.savingsGoalPct}% goal (${money(goalMinor)}) only in months where the base closes green. Date: ${fmtDay(when90)}.`,
  );
  const plan = [
    L(lang, `Plan Faro — este mes (te queda: ${money(left)})`, `Faro plan — this month (left: ${money(left)})`),
    L(lang, `24 horas: ${day24}`, `24 hours: ${day24}`),
    L(lang, `7 días: ${day7}`, `7 days: ${day7}`),
    L(lang, `30 días: ${day30}`, `30 days: ${day30}`),
    L(lang, `90 días: ${day90}`, `90 days: ${day90}`),
    transferNames ? L(lang, `Cuentas de ahorro: ${transferNames}.`, `Transfer accounts: ${transferNames}.`) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const scenarios = [
    {
      id: "base" as const,
      label: L(lang, "Solo lo de siempre", "Usual bills only"),
      detail: L(lang, "Sin compras de una vez y sin ahorro.", "No one-time buys and no savings."),
      left: baseSurplus,
    },
    {
      id: "repeat" as const,
      label: L(lang, "Repetir el mes", "Repeat the month"),
      detail: L(lang, "Todo lo anotado se queda, incluidas compras de una vez y ahorro.", "Everything recorded stays, one-time buys and savings included."),
      left,
    },
    {
      id: "plan" as const,
      label: L(lang, "Plan sugerido", "Suggested plan"),
      detail: L(
        lang,
        "El ahorro tapa el hueco y no cuenta como gasto. Las compras de una vez se quedan porque ya salieron.",
        "The transfer covers the hole and is not counted as spending. One-offs stay because they already left.",
      ),
      left: leftIfTransferCovers,
    },
  ];

  return {
    currency: display,
    monthTag,
    tone,
    toneLabel,
    headline,
    action,
    alert,
    creditBlurb,
    baseSurplus,
    uniqueMinor,
    uniqueCount,
    transferMinor,
    recurrentMinor,
    income,
    incomeFixed,
    incomeVariable,
    outTotal,
    realSpend,
    left,
    leftIfTransferCovers,
    naiveFixed,
    classificationError,
    cushionMinor,
    variablePct,
    topSourceName,
    topSourceMinor,
    topSourcePct,
    debtMinor,
    debtPct,
    debtTermKnown,
    creditAsk,
    pocketAside,
    savingsFlow,
    contradiction,
    vagueQuestion,
    vagueName: vague?.name ?? "",
    vagueMinor: vague?.minor ?? 0,
    vaguePct,
    splitNote,
    ironmanMinor,
    gasMinor,
    ironmanPct,
    parts,
    top,
    levers,
    plan,
    antNote,
    paceNote,
    calendarNote,
    compareNote,
    balanceGap,
    lines: read,
    scenarios,
  };
}

/** What-if over real lines. Dropping a line improves "left". It does not write the ledger. */
export function projectLeft(reading: Reading, preset: ScenarioId, dropIds: string[]): number {
  const dropped = reading.lines.filter((line) => dropIds.includes(line.id));
  const dropSpend = dropped.filter((line) => line.cls !== "transfer").reduce((acc, line) => acc + line.minor, 0);
  const dropTransfer = dropped.filter((line) => line.cls === "transfer").reduce((acc, line) => acc + line.minor, 0);
  if (preset === "base") return reading.baseSurplus;
  if (preset === "plan") return reading.leftIfTransferCovers + dropSpend;
  return reading.left + dropSpend + dropTransfer;
}
