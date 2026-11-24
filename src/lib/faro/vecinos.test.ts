/* LOS VECINOS (el instrumento, paso 3) — pares mínimos estilo PAWS:
 * dos preguntas casi idénticas que significan cosas DISTINTAS. Cada
 * par se corre entero: si un lado lo responde otra familia, el par
 * está confundido. La tasa de confusión con el vecino es el número
 * permanente de este instrumento — mide el fallo más peligroso del
 * asesor, responder otra pregunta con cara de respuesta. Como el
 * generador, mide y reporta: los pares confundidos son agenda. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createInitial, makeNamer } from "./defaults.ts";
import { answerBankQuestion } from "./ask2.ts";
import { addLent } from "./debts.ts";
import type { ParseCtx } from "./textparse.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-10";
const TODAY = "2026-10-22";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id, monthKey: KEY, currency: "USD", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "",
    productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0,
    balanceMinor: null, balanceCurrency: "USD", icon: "", history: [], ...partial,
  };
}

function libroVecinos(): LedgerState {
  let l = createInitial("es", "oscuro");
  for (const mk of ["2026-08", "2026-09", KEY]) {
    l.months[mk] = { lines: [
      line({ id: `sal-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 150000, bookedOn: `${mk}-05`, monthKey: mk }),
      line({ id: `ren-${mk}`, kind: "expense-fixed", concept: "Renta", amountMinor: 45000, categoryId: "f-casa", recurring: true, bookedOn: `${mk}-01`, monthKey: mk }),
      line({ id: `sup-${mk}`, kind: "expense-fixed", concept: "Súper", amountMinor: 25000, categoryId: "f-alimentos", bookedOn: `${mk}-10`, monthKey: mk }),
      line({ id: `apa-${mk}`, kind: "expense-fixed", concept: "Apartado", amountMinor: 20000, categoryId: "f-ahorro", subId: "f.ahorro.emergencia", bookedOn: `${mk}-10`, monthKey: mk }),
      line({ id: `int-${mk}`, kind: "expense-fixed", concept: "Internet", amountMinor: 4999, categoryId: "f-casa", subId: "f.casa.internet", bookedOn: `${mk}-28`, monthKey: mk, nextDue: mk === KEY ? "2026-10-28" : "" }),
    ] };
  }
  l.months[KEY].lines.push(line({ id: "sup-x", kind: "expense-fixed", concept: "Súper", amountMinor: 9000, categoryId: "f-alimentos", bookedOn: "2026-10-14" }));
  l.months[KEY].lines.push(line({ id: "tv-1", kind: "expense-fixed", concept: "Tarjeta Visa", amountMinor: 8500, categoryId: "f-creditos", bookedOn: "2026-09-28", nextDue: "2026-10-25", balanceMinor: 120000, aprBps: 2400 }));
  l = addLent(l, { id: "len-1", person: "Carlos", kind: "plain", amountMinor: 30000, currency: "USD", aprBps: 0, startedOn: "2026-09-10", dueOn: "2026-12-01", note: "" });
  l.settings.display = "USD";
  return l;
}

function ctx(ledger: LedgerState, lang: "es" | "en"): ParseCtx {
  return { ledger, lang, today: TODAY, display: "USD", makeId: () => "q1", now: `${TODAY}T12:00:00.000Z` };
}

type Side = { q: string; lang: "es" | "en"; fam: string; si?: string; no?: string };
type Pair = { nombre: string; a: Side; b: Side; difieren?: boolean };

const PAIRS: Pair[] = [
  { nombre: "la dirección de la deuda",
    a: { q: "¿Cuánto debo en total?", lang: "es", fam: "deudas", no: "Te deben" },
    b: { q: "¿Cuánto me deben en total?", lang: "es", fam: "deudas", si: "Te deben" } },
  { nombre: "la dirección de la deuda, en inglés",
    a: { q: "How much do I owe in total?", lang: "en", fam: "deudas" },
    b: { q: "How much am I owed in total?", lang: "en", fam: "deudas" } },
  { nombre: "estado contra historia del mismo pago",
    a: { q: "¿Ya pagué internet?", lang: "es", fam: "ya-pague" },
    b: { q: "¿Cuánto pagué de internet este mes?", lang: "es", fam: "historia" } },
  { nombre: "la queda contra la queda en ahorros",
    a: { q: "¿Cuánto me queda?", lang: "es", fam: "left" },
    b: { q: "¿Cuánto me queda en ahorros?", lang: "es", fam: "ahorros" } },
  { nombre: "ahorros contra el total de todo",
    a: { q: "¿Cuánto tengo en ahorros?", lang: "es", fam: "ahorros" },
    b: { q: "¿Cuánto tengo en total?", lang: "es", fam: "total" } },
  { nombre: "el interés que pago contra el que gano",
    a: { q: "¿Cuánto pago de interés al mes?", lang: "es", fam: "deudas" },
    b: { q: "¿Cuánto interés he ganado en mis ahorros?", lang: "es", fam: "falta" } },
  { nombre: "gastar hoy contra gastar en gustos",
    a: { q: "¿Cuánto puedo gastar hoy?", lang: "es", fam: "promedio" },
    b: { q: "¿Cuánto puedo gastar en gustos?", lang: "es", fam: "gustos" } },
  { nombre: "ahorrar contra gastar en el mismo mes",
    a: { q: "¿Cuánto ahorré este mes?", lang: "es", fam: "ahorros" },
    b: { q: "¿Cuánto gasté este mes?", lang: "es", fam: "historia" } },
  { nombre: "el extremo por arriba contra el extremo por abajo",
    a: { q: "¿Cuál fue mi gasto más grande este mes?", lang: "es", fam: "extremos" },
    b: { q: "¿Cuál fue mi gasto más chico este mes?", lang: "es", fam: "extremos" }, difieren: true },
  { nombre: "el mismo gasto en dos meses distintos",
    a: { q: "¿Cuánto gasté en súper en septiembre?", lang: "es", fam: "historia" },
    b: { q: "¿Cuánto gasté en súper este mes?", lang: "es", fam: "historia" }, difieren: true },
  { nombre: "el ciudadano presente contra el ausente",
    a: { q: "¿Cuánto gasté en comida?", lang: "es", fam: "historia" },
    b: { q: "¿Cuánto gasté en carros?", lang: "es", fam: "historia", si: "«carros»" } },
  { nombre: "la verificación contra la capacidad compuesta",
    a: { q: "¿Me alcanza para gastar $100?", lang: "es", fam: "promedio" },
    b: { q: "Si gasto $500 en un boleto y $1200 en una casa, ¿podría asumir el gasto?", lang: "es", fam: "factibilidad" } },
  { nombre: "la cadencia contra la suma del ingreso",
    a: { q: "¿Cada cuánto me pagan?", lang: "es", fam: "ingreso" },
    b: { q: "¿Cuánto gané este mes?", lang: "es", fam: "historia" } },
  { nombre: "el patrón del día contra el día como período",
    a: { q: "¿Qué día de la semana gasto más?", lang: "es", fam: "frecuencia" },
    b: { q: "¿Cuánto gasté el sábado?", lang: "es", fam: "historia" } },
];

function runSide(book: LedgerState, s: Side): { estado: string; verdict: string } {
  const r = answerBankQuestion(book, KEY, s.lang, makeNamer(book.structure, s.lang), s.q, ctx(book, s.lang), TODAY);
  if (r.kind !== "answer") return { estado: `silencio (${r.kind})`, verdict: "" };
  if (r.family !== s.fam) return { estado: `vecino → ${r.family}`, verdict: r.verdict };
  if (s.si && !r.verdict.includes(s.si)) return { estado: `marcador ausente («${s.si}»)`, verdict: r.verdict };
  if (s.no && r.verdict.includes(s.no)) return { estado: `marcador prohibido («${s.no}»)`, verdict: r.verdict };
  return { estado: "ok", verdict: r.verdict };
}

describe("vecinos · pares mínimos que significan otra cosa", () => {
  it("mide la tasa de confusión con el vecino", () => {
    const book = libroVecinos();
    let confundidos = 0;
    const detalle: string[] = [];
    for (const p of PAIRS) {
      const ra = runSide(book, p.a);
      const rb = runSide(book, p.b);
      let mal = ra.estado !== "ok" || rb.estado !== "ok";
      let nota = "";
      if (!mal && p.difieren && ra.verdict === rb.verdict) { mal = true; nota = "los dos lados dieron el mismo veredicto"; }
      if (mal) {
        confundidos++;
        detalle.push(`PAR CONFUNDIDO «${p.nombre}»: A ${ra.estado} | B ${rb.estado}${nota ? " | " + nota : ""}`);
        detalle.push(`   A «${p.a.q}» → ${ra.verdict.slice(0, 110)}`);
        detalle.push(`   B «${p.b.q}» → ${rb.verdict.slice(0, 110)}`);
      } else {
        detalle.push(`par limpio «${p.nombre}»`);
      }
    }
    console.log(`VECINOS: ${PAIRS.length} pares — confundidos ${confundidos} (tasa de confusión ${Math.round((confundidos / PAIRS.length) * 100)}%)`);
    for (const d of detalle) console.log(`  ${d}`);
    assert.ok(PAIRS.length >= 12);
  });
});
