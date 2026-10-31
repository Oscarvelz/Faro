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
          `Los “fijos” de ${money(naiveFixed)} incluyen el apartado de ${money(transferInsideFixed)}. Un apartado no es gasto ni es fijo: es un error de clasificación.`,
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
          `Apartado del mes marca ${money(0)} y Ahorro marca ${money(savingsFlow)}. Hay que reconciliar las bolsas: mover a una cuenta no es lo mismo que apartar en la meta.`,
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
        "Del crédito solo puedo juzgar la carga de este mes. Anota el saldo, la tasa anual y el pago mínimo: sin esos tres datos no hay plazo.",
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
      `${big.category} no es un hábito. ${money(big.minor)} es una sola compra (${big.name})${share !== null ? `, el ${pct(share)} de lo que entra` : ""}. Lo que sí se repite en esa categoría son ${money(recurrentSum)}${recurrent[0] ? ` (${recurrent.map((line) => line.name).join(", ")})` : ""}.`,
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
        `${vague.name} son ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} de lo que entra)` : ""} y el nombre no dice qué es. ¿Qué es ${vague.name}, antes de aconsejar sobre esa partida?`,
        `${vague.name} is ${money(vague.minor)}${vaguePct !== null ? ` (${pct(vaguePct)} of what comes in)` : ""} and the name does not say what it is. What is ${vague.name}, before any advice on that line?`,
      )
    : null;

  const prior = lastKeys(key, 6).filter((month) => month !== key && (state.months[month]?.lines.length ?? 0) > 0);
  const compareNote =
    prior.length === 0
      ? L(
          lang,
          "Es el primer mes con datos. No hay promedio de 3 ni de 6 meses. Las compras únicas se quedan como eventos y no entran a un promedio.",
          "This is the first month with data. There is no 3-month or 6-month average. One-off purchases stay events and do not enter an average.",
        )
      : L(
          lang,
          `Comparo solo lo recurrente contra ${prior.length} mes${prior.length === 1 ? "" : "es"} previo${prior.length === 1 ? "" : "s"}. Las únicas no entran al promedio.`,
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
    `El gasto que se repite son ${money(perDay)} al día. No invento días de pista (cuántos días podrías vivir si mañana no entrara nada): no hay un saldo de caja anotado.`,
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
          `El día en que el mes no alcanza es el ${crossed.day}, cuando entra ${crossed.name}. No es un promedio ciego: es esa salida.`,
          `The day the month stops covering is ${crossed.day}, when ${crossed.name} lands. That is not a blind average: it is that outflow.`,
        )
      : L(
          lang,
          `Con las fechas anotadas, ninguna salida cruza el ingreso por sí sola. El gasto que se repite son ${money(perDay)} al día.`,
          `With the dates on file, no single outflow crosses income by itself. Repeating spending is ${money(perDay)} a day.`,
        );
  } else if (uniqueMinor > 0 && left < 0) {
    paceNote = L(
      lang,
      `No hay fechas, así que no invento un día de quiebre. El hueco no es un ritmo diario: son compras únicas de ${money(uniqueMinor)} que ya salieron.`,
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
          ? `En 30 días hay ${upcoming.length} salidas fechadas. ${loud.length} pasan el aviso (${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `En 30 días hay ${upcoming.length} salidas fechadas. Ninguna pasa el aviso de ${money(warnAt)}.`,
        loud.length
          ? `The next 30 days have ${upcoming.length} dated outflows. ${loud.length} cross the warning (${money(warnAt)}): ${loud.map((line) => lineName(line, names)).slice(0, 3).join(", ")}.`
          : `The next 30 days have ${upcoming.length} dated outflows. None cross the ${money(warnAt)} warning.`,
      )
    : L(
        lang,
        "No hay salidas con fecha en los próximos 30 días. Sin fecha no aviso un vencimiento.",
        "No outflows are dated in the next 30 days. With no date I will not warn about a due day.",
      );

  const subs = read.filter((line) => line.cls === "discretionary" && lines.find((raw) => raw.id === line.id)?.kind === "subscription");
  const antNote = subs.length
    ? L(
        lang,
        `${subs.map((line) => `${line.name} ${money(line.minor)} al mes son ${money(line.minor * 12)} al año`).join(". ")}. Esto no cierra tu hueco; es orden, no rescate. El gasto hormiga (gastos chiquitos que se repiten) importa después de las partidas grandes.`,
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
      ? L(lang, "Verde: la base cierra.", "Green: the base closes.")
      : tone === "amber"
        ? L(lang, "Ámbar: atípico, manejable. No es una emergencia de todos los meses.", "Amber: unusual, manageable. Not an every-month emergency.")
        : L(lang, "Rojo: la base ya no alcanza. Eso sí hay que bajar o cubrir.", "Red: the base itself does not cover. That does have to come down or be covered.");

  const cushionMinor = recurrentMinor * (state.settings.emergencyMonths || 3);
  const goalMinor = income > 0 ? Math.round((income * state.settings.savingsGoalPct) / 100) : 0;
  const hundred = display === "USD" ? 10000 : convertMinor(10000, "USD", display, rateE4);

  let headline = "";
  let action = "";
  if (income <= 0) {
    headline = L(
      lang,
      "Este mes no tiene ingresos. Sin eso no juzgo porcentajes ni invento un plan. Anota lo que entra.",
      "This month has no income. Without it I will not judge percents or invent a plan. Enter what comes in.",
    );
    action = L(lang, "Acción #1: anota el ingreso de este mes, aunque sea uno.", "Action #1: enter this month's income, even one line.");
  } else if (baseSurplus < 0 && uniqueMinor === 0) {
    headline = L(
      lang,
      `Hay un déficit estructural (tus gastos de siempre, sin compras únicas, ya son más grandes que el ingreso): ${money(baseSurplus)}. Eso no se arregla esperando.`,
      `There is a structural deficit (your usual bills, without one-off purchases, are already larger than income): ${money(baseSurplus)}. Waiting does not fix that.`,
    );
    action = L(
      lang,
      `Acción #1: baja un gasto que se repite o sube el ingreso piso en al menos ${money(-baseSurplus)}.`,
      `Action #1: lower a repeating bill or raise the income floor by at least ${money(-baseSurplus)}.`,
    );
  } else if (atypical && transferMinor > 0) {
    headline = L(
      lang,
      `No falló tu gasto diario. Lo rompieron ${uniqueCount} compras grandes y un apartado en el mes equivocado.`,
      `Your daily spending did not fail. ${uniqueCount} large purchases and a transfer in the wrong month broke it.`,
    );
    action = L(
      lang,
      `Acción #1: decide el apartado. Si esos ${money(transferMinor)} pueden cubrir el hueco, la deuda real del mes baja a ${money(Math.abs(leftIfTransferCovers))}. Si eran intocables, el plan es otro.`,
      `Action #1: decide the transfer. If that ${money(transferMinor)} can cover the hole, the month's real gap falls to ${money(Math.abs(leftIfTransferCovers))}. If it was untouchable, the plan is different.`,
    );
  } else if (atypical) {
    headline = L(
      lang,
      `No falló tu gasto diario. Lo rompieron ${uniqueCount} compras grandes. La base, sin ellas, cerraba ${money(baseSurplus)}.`,
      `Your daily spending did not fail. ${uniqueCount} large purchases broke it. The base, without them, closed at ${money(baseSurplus)}.`,
    );
    action = biggestUnique
      ? L(
          lang,
          `Acción #1: revisa si ${biggestUnique.name} (${money(biggestUnique.minor)}) admite devolución o se compensa. Ya se gastó: no se “baja” del día a día.`,
          `Action #1: check whether ${biggestUnique.name} (${money(biggestUnique.minor)}) can be returned or offset. It is already spent: it cannot be “cut” from everyday spending.`,
        )
      : L(lang, "Acción #1: anota qué compra fue única y cuál se repite.", "Action #1: mark which purchase was one-off and which one repeats.");
  } else if (!red) {
    headline = L(
      lang,
      `La base cierra a favor: ${money(baseSurplus)}. ${uniqueMinor > 0 ? `Las compras únicas son ${money(uniqueMinor)}.` : "No hay compras únicas que recortar."}`,
      `The base closes ahead: ${money(baseSurplus)}. ${uniqueMinor > 0 ? `One-off purchases are ${money(uniqueMinor)}.` : "There are no one-off purchases to cut."}`,
    );
    action = L(
      lang,
      `Acción #1: no recortes lo que ya cabe. Si vas a apartar, hazlo con lo que sobra (${money(Math.max(0, left))}), no con dinero del gasto.`,
      `Action #1: do not cut what already fits. If you set money aside, use what is left (${money(Math.max(0, left))}), not money you already spent.`,
    );
  } else {
    headline = L(
      lang,
      `El mes cierra ${money(left)}. La base recurrente es ${money(baseSurplus)}; las únicas son ${money(uniqueMinor)}; el apartado es ${money(transferMinor)}.`,
      `The month closes at ${money(left)}. The repeating base is ${money(baseSurplus)}; one-offs are ${money(uniqueMinor)}; the transfer is ${money(transferMinor)}.`,
    );
    action = L(
      lang,
      `Acción #1: mueve primero la partida más grande que todavía se puede decidir, no la más chica.`,
      `Action #1: move the largest line you can still decide, not the smallest one.`,
    );
  }

  const floorPhrase = L(
    lang,
    `ingreso piso (lo que entra casi seguro cada mes, aunque todo lo demás falle)`,
    `income floor (what almost certainly comes in each month, even if everything else fails)`,
  );
  const alert =
    income <= 0
      ? L(lang, "Sin ingreso no hay piso contra el cual medir compromisos.", "With no income there is no floor to measure commitments against.")
      : L(
          lang,
          `El ${pct(variablePct)} de lo que entra es variable. ${topSourceName ? `${topSourceName} es el ${pct(topSourcePct)}.` : ""} Tus compromisos (${money(recurrentMinor)}) se miden contra el ${floorPhrase}: ${money(incomeFixed)}.`,
          `${pct(variablePct)} of what comes in is variable. ${topSourceName ? `${topSourceName} is ${pct(topSourcePct)}.` : ""} Your commitments (${money(recurrentMinor)}) are judged against the ${floorPhrase}: ${money(incomeFixed)}.`,
        );

  const creditBlurb =
    debtMinor <= 0
      ? L(lang, "Este mes no hay un pago de crédito. No invento un plazo.", "No credit payment this month. I will not invent a payoff date.")
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
      L(lang, "Base", "Base"),
      recurrentMinor,
      baseSurplus,
      L(
        lang,
        "Ingreso menos lo que se repite (esencial, crédito y cuotas). Sin compras únicas y sin apartados.",
        "Income minus what repeats (essentials, credit, and subscriptions). No one-off purchases and no transfers.",
      ),
      (line) => line.cls !== "unique" && line.cls !== "transfer",
    ),
    unique: partOf(
      "unique",
      L(lang, "Únicas", "One-offs"),
      uniqueMinor,
      -uniqueMinor,
      L(
        lang,
        "Salió una vez. Sin historia de 2 de los últimos 3 meses, ni marcada fija: parece único — sin confirmar.",
        "It left once. Without a history of 2 of the last 3 months, and not marked fixed: looks one-off — unconfirmed.",
      ),
      (line) => line.cls === "unique",
    ),
    transfer: partOf(
      "transfer",
      L(lang, "Apartado", "Transfer"),
      transferMinor,
      -transferMinor,
      L(
        lang,
        "Dinero que cambia de bolsa. No es gasto y no es fijo. En un mes rojo es una decisión a revisar, no un logro.",
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
        `Decidir el apartado de ${money(transferMinor)} el ${fmtDay(when0)}. Si cubre el hueco, la deuda real del mes pasa de ${money(left)} a ${money(leftIfTransferCovers)}.`,
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
        `Revisar devolución de ${biggestUnique.name} (${money(biggestUnique.minor)}) antes del ${fmtDay(when7)}. Si vuelve, el hueco pasa de ${money(left)} a ${money(after)}. Ya se gastó: no se recorta del día a día.`,
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
        `Vender o compensar ${nextUnique.name} (${money(nextUnique.minor)}) antes del ${fmtDay(when30)}. Si entra ese monto, el hueco pasa de ${money(left)} a ${money(after)}.`,
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
        `Mantener la base. El ${fmtDay(when0)} no hay un recorte que hacer: el mes cierra ${money(left)}.`,
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
        `Anotar el ingreso el ${fmtDay(when0)}. Sin ese monto no hay efecto que calcular.`,
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
    : L(lang, `El ${fmtDay(when0)} no hay una palanca grande. Revisa solo lo que tenga fecha.`, `On ${fmtDay(when0)} there is no large lever. Review only what has a date.`);
  const day7 = L(
    lang,
    `Cubrir los pagos fechados con el ${floorPhrase} (${money(incomeFixed)})${debtMinor > 0 ? `; no subir el pago del crédito (${money(debtMinor)}) este mes; anotar saldo, tasa anual y pago mínimo` : ""}. Fecha: ${fmtDay(when7)}.`,
    `Cover dated payments with the ${floorPhrase} (${money(incomeFixed)})${debtMinor > 0 ? `; do not raise the credit payment (${money(debtMinor)}) this month; enter the balance, the annual rate, and the minimum payment` : ""}. Date: ${fmtDay(when7)}.`,
  );
  const day30 = L(
    lang,
    `Ninguna compra única mayor a ${money(hundred)} sin una regla de 24 horas y sin una fuente escrita. El próximo ingreso variable se reparte 50% hueco / 30% colchón / 20% libre. Fecha: ${fmtDay(when30)}.`,
    `No one-off purchase above ${money(hundred)} without a 24-hour rule and a written source. The next variable income splits 50% hole / 30% cushion / 20% free. Date: ${fmtDay(when30)}.`,
  );
  const day90 = L(
    lang,
    `Colchón mínimo (dinero guardado para un golpe; meta sana: 3 meses de esenciales) de ${money(cushionMinor)}, reconciliado entre Ahorro y Apartado. La meta del ${state.settings.savingsGoalPct}% (${money(goalMinor)}) solo en meses donde la base cierre en verde. Fecha: ${fmtDay(when90)}.`,
    `Minimum cushion (money kept for a shock; a sound goal is 3 months of essentials) of ${money(cushionMinor)}, reconciled between Savings and the set-aside. The ${state.settings.savingsGoalPct}% goal (${money(goalMinor)}) only in months where the base closes green. Date: ${fmtDay(when90)}.`,
  );
  const plan = [
    L(lang, `Plan Faro — este mes (queda: ${money(left)})`, `Faro plan — this month (left: ${money(left)})`),
    L(lang, `24 horas: ${day24}`, `24 hours: ${day24}`),
    L(lang, `7 días: ${day7}`, `7 days: ${day7}`),
    L(lang, `30 días: ${day30}`, `30 days: ${day30}`),
    L(lang, `90 días: ${day90}`, `90 days: ${day90}`),
    transferNames ? L(lang, `Cuentas del apartado: ${transferNames}.`, `Transfer accounts: ${transferNames}.`) : "",
  ]
    .filter(Boolean)
    .join("\n");

  const scenarios = [
    {
      id: "base" as const,
      label: L(lang, "Solo la base", "Base only"),
      detail: L(lang, "Sin compras únicas y sin apartado.", "No one-off purchases and no transfer."),
      left: baseSurplus,
    },
    {
      id: "repeat" as const,
      label: L(lang, "Repetir el mes", "Repeat the month"),
      detail: L(lang, "Todo lo anotado se queda, incluidas únicas y apartado.", "Everything recorded stays, one-offs and the transfer included."),
      left,
    },
    {
      id: "plan" as const,
      label: L(lang, "Plan sugerido", "Suggested plan"),
      detail: L(
        lang,
        "El apartado cubre hueco y no se cuenta como gasto. Las únicas se quedan porque ya salieron.",
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
