import { readAdvisor } from "./advisor";
import { convertMinor, formatMoney, formatPct } from "./money";
import type { AdviceCard, Currency, Lang, LedgerState, Line } from "./types";

/**
 * Listening layer on top of the advisor. It does not replace buildAdvice or
 * readAdvisor. Turning it off hides every new surface and leaves those intact.
 */

export type HorizonGoal = { id: "meta" | "retiro" | "emergencia"; totalMinor: number; years: number };

export type WakeNames = { cat: (id: string) => string; sub: (id: string) => string };

export type WakeCardPrint = { horizon: string; lead: string; points: { label?: string; value: string }[] };

export type WakeFinding = { id: string; title: string; body: string; cause: string; reason: string };

export type WakeLog = {
  at: string;
  event: string;
  recalculated: string[];
  changed: string[];
  silent: boolean;
  error?: string;
};

export type SavingsPicture = {
  savingsTotal: number;
  accounts: number;
  unassigned: number;
  meta: number;
  retiro: number;
  emergencia: number;
  income: number;
  floor: number;
  left: number;
  monthGoal: number;
};

export type WakeResult = {
  events: string[];
  log: WakeLog;
  snapshot: SavingsPicture;
  findings: WakeFinding[];
  causes: Record<string, string>;
  notice: string | null;
  stalePlan: boolean;
  silent: boolean;
  fresh: string[];
};

export type WakeInput = {
  before: LedgerState | null;
  after: LedgerState;
  monthKey: string;
  lang: Lang;
  names: WakeNames;
  goalsBefore?: HorizonGoal[];
  goalsAfter?: HorizonGoal[];
  adviceBefore?: WakeCardPrint[];
  adviceAfter?: WakeCardPrint[];
  planCopied?: boolean;
  dismissed?: { id: string; reason: string }[];
  enabled?: boolean;
  opened?: boolean;
  at?: string;
};

const DEPS: Record<string, string[]> = {
  "ingreso-creado": ["ingreso", "corto", "largo"],
  "ingreso-editado": ["ingreso", "corto", "largo"],
  "ingreso-borrado": ["ingreso", "corto", "largo"],
  "gasto-creado": ["gasto", "corto"],
  "gasto-editado": ["gasto", "corto"],
  "gasto-borrado": ["gasto", "corto"],
  "destino-movido": ["colchon", "largo"],
  "destino-editado": ["horizonte"],
  "credito-editado": ["credito", "medio"],
  "cuota-editada": ["cuota", "corto"],
  "tasa-editada": ["corto", "medio", "largo"],
  "calendario": ["calendario", "largo"],
  apertura: ["reconciliacion"],
};

const HORIZON_OF: Record<string, string[]> = {
  ingreso: ["short", "long"],
  corto: ["short"],
  largo: ["long"],
  gasto: ["short"],
  colchon: ["long"],
  horizonte: ["long"],
  credito: ["medium"],
  medio: ["medium"],
  cuota: ["short"],
  calendario: ["long"],
  reconciliacion: ["long"],
};

function L(lang: Lang, es: string, en: string): string {
  return lang === "en" ? en : es;
}

function money(minor: number, currency: Currency, lang: Lang): string {
  return formatMoney(minor, currency, lang);
}

function viewOf(line: Line, display: Currency, rateE4: number): number {
  if (!line.active) return 0;
  return convertMinor(line.amountMinor, line.currency, display, rateE4);
}

function stockOf(line: Line, display: Currency, rateE4: number): number {
  if (!line.active) return 0;
  if (line.balanceMinor === null || line.balanceMinor === undefined) return viewOf(line, display, rateE4);
  return convertMinor(line.balanceMinor, line.balanceCurrency || line.currency, display, rateE4);
}

function roleOf(state: LedgerState, categoryId: string): string {
  return state.structure.categories.find((c) => c.id === categoryId)?.role ?? "";
}

function isVault(state: LedgerState, subId: string): boolean {
  for (const cat of state.structure.categories) {
    const sub = cat.subs.find((item) => item.id === subId);
    if (sub && (sub.icon === "vault" || sub.icon.startsWith("vault:"))) return true;
  }
  return false;
}

function destOf(subId: string): "meta" | "retiro" | "emergencia" | null {
  if (subId.endsWith(".meta")) return "meta";
  if (subId.endsWith(".retiro")) return "retiro";
  if (subId.endsWith(".emergencia")) return "emergencia";
  return null;
}

function linesOf(state: LedgerState): Line[] {
  return Object.values(state.months).flatMap((month) => month.lines);
}

export function savingsPicture(state: LedgerState, monthKey: string): SavingsPicture {
  const { display, rateE4, savingsGoalPct } = state.settings;
  const empty = { savingsTotal: 0, accounts: 0, unassigned: 0, meta: 0, retiro: 0, emergencia: 0, income: 0, floor: 0, left: 0, monthGoal: 0 };
  let accounts = 0;
  let meta = 0;
  let retiro = 0;
  let emergencia = 0;
  let other = 0;
  let income = 0;
  let floor = 0;
  let out = 0;
  for (const line of linesOf(state)) {
    if (roleOf(state, line.categoryId) !== "savings") continue;
    const stock = stockOf(line, display, rateE4);
    if (isVault(state, line.subId)) accounts += stock;
    else {
      const dest = destOf(line.subId);
      if (dest === "meta") meta += stock;
      else if (dest === "retiro") retiro += stock;
      else if (dest === "emergencia") emergencia += stock;
      else other += stock;
    }
  }
  for (const line of state.months[monthKey]?.lines ?? []) {
    if (!line.active) continue;
    const n = viewOf(line, display, rateE4);
    if (line.kind.startsWith("income")) {
      income += n;
      if (line.kind === "income-fixed") floor += n;
    } else out += n;
  }
  const savingsTotal = accounts + meta + retiro + emergencia + other;
  const monthGoal = Math.round((income * savingsGoalPct) / 100);
  return { savingsTotal, accounts, unassigned: savingsTotal - meta - retiro - emergencia, meta, retiro, emergencia, income, floor, left: income - out, monthGoal };
}

function material(delta: number, income: number): boolean {
  const abs = Math.abs(delta);
  if (abs >= 500) return true;
  if (income > 0 && abs * 100 >= income) return true;
  return false;
}

function printCard(card: WakeCardPrint): string {
  return `${card.lead}|${card.points.map((point) => point.value).join("|")}`;
}

function indexLines(state: LedgerState): Map<string, Line> {
  const map = new Map<string, Line>();
  for (const line of linesOf(state)) map.set(line.id, line);
  return map;
}

function eventName(line: Line, state: LedgerState, action: "creado" | "editado" | "borrado"): string {
  if (line.kind.startsWith("income")) return `ingreso-${action}`;
  if (roleOf(state, line.categoryId) === "savings") return action === "editado" || action === "creado" || action === "borrado" ? "destino-movido" : "destino-movido";
  if (roleOf(state, line.categoryId) === "debt") return "credito-editado";
  if (line.kind === "subscription") return "cuota-editada";
  return `gasto-${action}`;
}

function lineDelta(before: Line | undefined, after: Line | undefined, display: Currency, rateE4: number): number {
  const from = before ? stockOf(before, display, rateE4) || viewOf(before, display, rateE4) : 0;
  const to = after ? stockOf(after, display, rateE4) || viewOf(after, display, rateE4) : 0;
  return to - from;
}

function monthlyOf(goal: HorizonGoal): number {
  const months = goal.years * 12;
  if (months <= 0 || !Number.isFinite(goal.totalMinor)) return 0;
  return Math.round(goal.totalMinor / months);
}

function goalKey(goals: HorizonGoal[]): string {
  return goals.map((goal) => `${goal.id}:${goal.totalMinor}:${goal.years}`).sort().join(",");
}

function destLabel(id: "meta" | "retiro" | "emergencia", lang: Lang): string {
  if (id === "meta") return L(lang, "destino Meta", "Meta destination");
  if (id === "retiro") return L(lang, "destino Retiro", "Retirement destination");
  return L(lang, "destino Emergencia", "Emergency destination");
}

function hidden(dismissed: { id: string; reason: string }[], id: string, reason: string): boolean {
  return dismissed.some((item) => item.id === id && item.reason === reason);
}

export function wake(input: WakeInput): WakeResult {
  const lang = input.lang;
  const after = input.after;
  const display = after.settings.display;
  const rate = after.settings.rateE4;
  const snap = savingsPicture(after, input.monthKey);
  const beforeSnap = input.before ? savingsPicture(input.before, input.monthKey) : null;
  const goalsBefore = input.goalsBefore ?? [];
  const goalsAfter = input.goalsAfter ?? [];
  const dismissed = input.dismissed ?? [];
  const enabled = input.enabled !== false;
  const at = input.at ?? new Date().toISOString();
  const events: string[] = [];
  const touched = new Set<string>();

  if (!input.before || input.opened) events.push(input.opened && input.before ? "calendario" : "apertura");

  if (input.before) {
    const prev = indexLines(input.before);
    const next = indexLines(after);
    for (const [id, line] of next) {
      const old = prev.get(id);
      if (!old) {
        events.push(eventName(line, after, "creado"));
        touched.add(id);
      } else if (
        old.amountMinor !== line.amountMinor ||
        old.balanceMinor !== line.balanceMinor ||
        old.active !== line.active ||
        old.categoryId !== line.categoryId ||
        old.subId !== line.subId ||
        old.kind !== line.kind ||
        old.concept !== line.concept ||
        old.nextDue !== line.nextDue ||
        old.monthKey !== line.monthKey
      ) {
        events.push(eventName(line, after, "editado"));
        touched.add(id);
      }
    }
    for (const [id, line] of prev) {
      if (!next.has(id)) {
        events.push(eventName(line, input.before, "borrado"));
        touched.add(id);
      }
    }
    if (input.before.settings.rateE4 !== after.settings.rateE4) events.push("tasa-editada");
    if (input.before.settings.savingsGoalPct !== after.settings.savingsGoalPct) events.push("ingreso-editado");
  }
  if (goalKey(goalsBefore) !== goalKey(goalsAfter)) events.push("destino-editado");

  const uniqueEvents = [...new Set(events)];
  const recalculated = [...new Set(uniqueEvents.flatMap((name) => DEPS[name] ?? []))];
  const horizons = new Set(recalculated.flatMap((tag) => HORIZON_OF[tag] ?? []));

  let delta = 0;
  if (input.before) {
    const prev = indexLines(input.before);
    const next = indexLines(after);
    const ids = new Set([...prev.keys(), ...next.keys()]);
    for (const id of ids) delta += Math.abs(lineDelta(prev.get(id), next.get(id), display, rate));
  }
  for (const goal of goalsAfter) {
    const old = goalsBefore.find((item) => item.id === goal.id);
    delta += Math.abs((old ? old.totalMinor : 0) - goal.totalMinor);
    if (old && old.years !== goal.years) delta += Math.abs(monthlyOf(goal) - monthlyOf(old));
  }
  const loud = uniqueEvents.some((name) => name !== "apertura" && name !== "calendario") && material(delta, Math.max(snap.income, beforeSnap?.income ?? 0));
  const silent = !loud;

  const fmt = (n: number) => money(n, display, lang);
  const monthGoalName = L(lang, "meta de ahorro del mes", "this month's savings goal");
  let notice: string | null = null;
  const causes: Record<string, string> = {};
  const findings: WakeFinding[] = [];
  const fresh: string[] = [];

  const unassignedReason = `unassigned:${snap.unassigned}:${snap.savingsTotal}`;
  if (snap.savingsTotal > 0 && snap.unassigned !== 0 && !hidden(dismissed, "unassigned", unassignedReason)) {
    const share = snap.savingsTotal > 0 ? (snap.unassigned / snap.savingsTotal) * 100 : null;
    const body = L(
      lang,
      `Ahorros son ${fmt(snap.savingsTotal)}. Destino Meta + destino Retiro + destino Emergencia suman ${fmt(snap.meta + snap.retiro + snap.emergencia)}. Sin asignar: ${fmt(snap.unassigned)} (${formatPct(share, lang)}). Asignarle destino convierte el saldo en un plan.`,
      `Savings are ${fmt(snap.savingsTotal)}. Meta destination + Retirement destination + Emergency destination add up to ${fmt(snap.meta + snap.retiro + snap.emergencia)}. Unassigned: ${fmt(snap.unassigned)} (${formatPct(share, lang)}). Giving it a destination is what turns a balance into a plan.`,
    );
    const changed = beforeSnap ? beforeSnap.unassigned !== snap.unassigned || beforeSnap.emergencia !== snap.emergencia || beforeSnap.meta !== snap.meta || beforeSnap.retiro !== snap.retiro : true;
    const move = beforeSnap ? snap.emergencia - beforeSnap.emergencia : 0;
    const cause = move > 0
      ? L(lang, `Actualizado porque asignaste ${fmt(move)} a Emergencia.`, `Updated because you assigned ${fmt(move)} to Emergency.`)
      : changed && beforeSnap
        ? L(lang, "Actualizado porque cambió el reparto de Ahorros.", "Updated because the savings split changed.")
        : L(lang, "Reconciliado al abrir: el consejo refleja hoy.", "Reconciled on open: the advice matches today.");
    findings.push({ id: "unassigned", title: L(lang, "Dinero sin destino", "Money with no destination"), body, cause, reason: unassignedReason });
    if (changed && loud) fresh.push("unassigned");
  }

  const safeNames = {
    cat: input.names.cat,
    sub: input.names.sub,
    purchase: (id: string) => ("purchase" in input.names ? (input.names as { purchase: (value: string) => string }).purchase(id) : ""),
    catalog: () => "",
  };
  const reading = readAdvisor(after, input.monthKey, lang, safeNames);
  const essentials = reading.recurrentMinor;
  for (const goal of goalsAfter) {
    if (goal.totalMinor <= 0 || goal.years <= 0) continue;
    const old = goalsBefore.find((item) => item.id === goal.id);
    const changed = !old || old.totalMinor !== goal.totalMinor || old.years !== goal.years;
    if (!changed) continue;
    const monthly = monthlyOf(goal);
    const oldMonthly = old ? monthlyOf(old) : 0;
    const pace = goal.id === "meta" ? snap.meta : goal.id === "retiro" ? snap.retiro : snap.emergencia;
    const reason = `horizon:${goal.id}:${goal.totalMinor}:${goal.years}:${pace}`;
    if (hidden(dismissed, `horizon-${goal.id}`, reason)) continue;
    const moved = material(old ? goal.totalMinor - old.totalMinor : goal.totalMinor, snap.income)
      || material(monthly - oldMonthly, snap.income);
    if (!moved) continue;
    const yearsLabel = (n: number) => L(lang, n === 1 ? "año" : "años", n === 1 ? "year" : "years");
    const body = L(
      lang,
      `Proyección del ${destLabel(goal.id, lang)}: con ese apartado, esta bolsa llegaría a ${fmt(goal.totalMinor)} en ${goal.years} ${yearsLabel(goal.years)}.`,
      `Projection for the ${destLabel(goal.id, lang)}: with that set-aside, this bag would reach ${fmt(goal.totalMinor)} in ${goal.years} ${yearsLabel(goal.years)}.`,
    );
    const cause = old
      ? L(
          lang,
          `Actualizado porque la proyección del ${destLabel(goal.id, lang)} pasó de ${fmt(old.totalMinor)} en ${old.years} ${yearsLabel(old.years)} a ${fmt(goal.totalMinor)} en ${goal.years} ${yearsLabel(goal.years)}.`,
          `Updated because the ${destLabel(goal.id, lang)} projection went from ${fmt(old.totalMinor)} in ${old.years} ${yearsLabel(old.years)} to ${fmt(goal.totalMinor)} in ${goal.years} ${yearsLabel(goal.years)}.`,
        )
      : L(
          lang,
          `Actualizado porque anotaste la proyección del ${destLabel(goal.id, lang)}: ${fmt(goal.totalMinor)} en ${goal.years} ${yearsLabel(goal.years)}.`,
          `Updated because you set the ${destLabel(goal.id, lang)} projection: ${fmt(goal.totalMinor)} in ${goal.years} ${yearsLabel(goal.years)}.`,
        );
    findings.push({ id: `horizon-${goal.id}`, title: L(lang, `Proyección · ${destLabel(goal.id, lang)}`, `Projection · ${destLabel(goal.id, lang)}`), body, cause, reason });
    fresh.push(`horizon-${goal.id}`);
  }

  const prior = input.before;
  const deleted: Line[] = [];
  if (prior) {
    const next = indexLines(after);
    for (const line of linesOf(prior)) if (!next.has(line.id)) deleted.push(line);
  }
  const createdIncomes = prior
    ? linesOf(after).filter((line) => line.kind.startsWith("income") && !indexLines(prior).has(line.id))
    : [];

  if (createdIncomes.length && loud) {
    const added = createdIncomes.reduce((sum, line) => sum + viewOf(line, display, rate), 0);
    const names = createdIncomes.map((line) => line.concept || L(lang, "un ingreso", "an income")).join(", ");
    notice = L(
      lang,
      `Actualizado porque anotaste ${names} (${added >= 0 ? "+" : ""}${fmt(added)}): la ${monthGoalName} quedó en ${fmt(snap.monthGoal)}, el ingreso piso (lo que entra casi seguro cada mes) en ${fmt(snap.floor)} y lo que queda en ${fmt(snap.left)}.`,
      `Updated because you entered ${names} (${added >= 0 ? "+" : ""}${fmt(added)}): ${monthGoalName} is now ${fmt(snap.monthGoal)}, the income floor (what almost certainly comes in each month) is ${fmt(snap.floor)} and what is left is ${fmt(snap.left)}.`,
    );
  } else if (deleted.length && loud) {
    const name = deleted.map((line) => line.concept || L(lang, "una partida", "a line")).join(", ");
    notice = L(
      lang,
      `Actualizado porque borraste ${name}: ese consejo ya no aplica y se corrigió con lo que quedó.`,
      `Updated because you deleted ${name}: that advice no longer applies and it was corrected with what remains.`,
    );
  } else if (loud && uniqueEvents.includes("destino-movido")) {
    const move = beforeSnap ? snap.emergencia - beforeSnap.emergencia : snap.emergencia;
    if (move !== 0) {
      const months = essentials > 0 ? Math.abs(move) / essentials : null;
      const monthBit = months === null
        ? L(lang, " No hay esenciales anotados, así que no convierto el colchón en meses.", " There are no essentials on record, so the cushion is not turned into months.")
        : L(lang, ` Tu colchón dejó de ser ${fmt(beforeSnap?.emergencia ?? 0)} y ahora cubre unos ${months.toFixed(2)} meses de esenciales.`, ` Your cushion is no longer ${fmt(beforeSnap?.emergencia ?? 0)} and now covers about ${months.toFixed(2)} months of essentials.`);
      notice = L(
        lang,
        `Actualizado porque asignaste ${fmt(Math.abs(move))} a Emergencia.${monthBit}`,
        `Updated because you assigned ${fmt(Math.abs(move))} to Emergency.${monthBit}`,
      );
    }
  } else if (loud && uniqueEvents.includes("destino-editado")) {
    const goal = goalsAfter.find((item) => {
      const old = goalsBefore.find((prev) => prev.id === item.id);
      return !old || old.totalMinor !== item.totalMinor || old.years !== item.years;
    });
    if (goal) {
      const old = goalsBefore.find((item) => item.id === goal.id);
      notice = old
        ? L(
            lang,
            `Actualizado porque la proyección del ${destLabel(goal.id, lang)} pasó de ${fmt(old.totalMinor)} en ${old.years} años a ${fmt(goal.totalMinor)} en ${goal.years} años.`,
            `Updated because the ${destLabel(goal.id, lang)} projection went from ${fmt(old.totalMinor)} in ${old.years} years to ${fmt(goal.totalMinor)} in ${goal.years} years.`,
          )
        : L(
            lang,
            `Actualizado porque anotaste la proyección del ${destLabel(goal.id, lang)}: ${fmt(goal.totalMinor)} en ${goal.years} años.`,
            `Updated because you set the ${destLabel(goal.id, lang)} projection: ${fmt(goal.totalMinor)} in ${goal.years} years.`,
          );
    }
  }

  const beforePrint = new Map((input.adviceBefore ?? []).map((card) => [card.horizon, printCard(card)]));
  const changedCards: string[] = [];
  for (const card of input.adviceAfter ?? []) {
    if (beforePrint.get(card.horizon) === printCard(card)) continue;
    if (!horizons.has(card.horizon) && !input.opened) continue;
    if (silent) continue;
    changedCards.push(card.horizon);
    if (notice) causes[card.horizon] = notice;
  }
  if (notice && uniqueEvents.includes("destino-movido")) causes.long = notice;

  const stalePlan = Boolean(input.planCopied && loud && (deleted.length > 0 || changedCards.length > 0 || fresh.length > 0));
  const log: WakeLog = {
    at,
    event: uniqueEvents.join(" + ") || "sin-cambio",
    recalculated,
    changed: silent ? [] : [...changedCards, ...fresh],
    silent,
  };

  if (!enabled) {
    return { events: uniqueEvents, log, snapshot: snap, findings: [], causes: {}, notice: null, stalePlan: false, silent, fresh: [] };
  }
  return { events: uniqueEvents, log, snapshot: snap, findings, causes, notice: silent ? null : notice, stalePlan, silent, fresh };
}

const VAULT_TONE: Record<string, string> = {
  meta: "#8fb9a6",
  retiro: "#72b4b2",
  emergencia: "#7aa2c4",
  save: "#d5e2ea",
};

function vaultKey(prefix: string, id: string): string {
  return `${prefix}:${VAULT_TONE[id] ?? id}`;
}

/** Widget and Libros fichas share this one key. There is no second copy to sync. */
export function readVaultPref(prefix: string, id: string): string | null {
  try {
    const value = localStorage.getItem(vaultKey(prefix, id));
    return value !== null && value !== "" ? value : null;
  } catch {
    return null;
  }
}

export function writeVaultPref(prefix: string, id: string, value: string): void {
  try {
    localStorage.setItem(vaultKey(prefix, id), value);
  } catch { /* ignore */ }
}

export function readStoredGoals(display: Currency, rateE4: number): HorizonGoal[] {
  const tones = ["meta", "retiro", "emergencia"] as const;
  const goals: HorizonGoal[] = [];
  for (const id of tones) {
    let monthlyUsd: number | null = null;
    let years = 10;
    const raw = readVaultPref("faro-vault-lever", id);
    if (raw === null) continue;
    const stored = Number(raw);
    if (!Number.isFinite(stored) || stored < 0) continue;
    monthlyUsd = stored;
    const storedYears = Number(readVaultPref("faro-vault-years", id));
    if (Number.isInteger(storedYears) && storedYears >= 1 && storedYears <= 80) years = storedYears;
    if (monthlyUsd === null) continue;
    const monthly = convertMinor(monthlyUsd, "USD", display, rateE4);
    goals.push({ id, totalMinor: monthly * 12 * years, years });
  }
  return goals;
}

export function advicePrints(cards: AdviceCard[]): WakeCardPrint[] {
  return cards.map((card) => ({ horizon: card.horizon, lead: card.lead, points: card.points.map((point) => ({ label: point.label, value: point.value })) }));
}
