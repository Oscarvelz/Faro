// EL LIBRO DE PRUEBA FIJO DEL EXAMEN DE CONVERSACIONES (2026-11-28).
// Lo construye esta línea a pedido de Hark, para su corrida única del
// examen: 9 conversaciones dictadas por Oscar y 51 escritas por Hark,
// selladas en su lado. Este libro es el suelo: datos inventados,
// regulares, cada cifra calculable a mano desde el listado que lo
// acompaña. Hoy fijo del libro: 2026-11-28. Moneda de vista: USD.
// Tasa del libro: la de fábrica (36.6243 NIO por USD).
//
// LAS REGLAS DEL LIBRO (cada mes, de 2024-01 a 2026-11, salvo nota):
// · Salario quincenal: dos líneas de $1,150.00, días 14 y 28
//   (febrero: 27). Overtime: $180.00 el día 20 de marzo, junio,
//   septiembre y diciembre. Clases de inglés: $250.00 el día 10,
//   de 2024-01 a 2026-03; después dejó de llegar.
// · Renta $950.00 día 3. Luz día 5: $45.00 de noviembre a febrero,
//   $62.00 de junio a septiembre, $53.00 los demás meses. Agua
//   $31.00 día 5. Internet $59.99 día 5.
// · Súper: cuatro líneas de $95.00, días 5, 12, 19 y 26. Comida:
//   $42.00 día 9 y $38.00 día 23. Delivery: tres de $27.50, días
//   7, 17 y 24. Gasolina: dos de $55.00, días 8 y 22.
// · Ropa $89.00 día 18, solo meses impares. Terapia $120.00 día 12.
//   Farmacia $36.00 día 15, solo meses pares. Salidas: dos de
//   $46.00, días 13 y 27. IA: ChatGPT $20.00 y Claude $15.00, día 6.
// · Seguro de vida: $45.00 día 4, desde 2024-03.
// · Suscripciones: Netflix $15.49 hasta 2025-12 y $17.99 desde
//   2026-01 (la que subió), día 9. Spotify $11.99 día 9. iCloud
//   $2.99 día 9. Gimnasio $35.00 día 2, desde 2024-06. Prime
//   $14.99 día 21, desde 2025-02. HBO Max $16.99 día 16, desde
//   2025-09, y en 2026-09 cobró DOS veces (días 16 y 17).
// · Remesas: a Mamá $150.00 día 15, todos los meses. A Tía Rosa
//   $80.00 día 15, meses impares. A Primo Diego C$18,312.15
//   (= $500.00 a la tasa del libro) día 15, en febrero, mayo,
//   agosto y noviembre.
// · Apartados día 2: Chase $300.00, Emergencia $150.00, Carro
//   $200.00 desde 2024-07, Viaje $100.00 desde 2025-06.
// · Regalos: Mamá $75.00 el 10 de diciembre, Papá $60.00 el 18 de
//   junio, Lucía $50.00 el 6 de abril, Mateo $45.00 el 27 de agosto.
// · Deudas: Carlos debe $800.00 desde 2025-08-05; abonó $100.00 el
//   2025-09-10, $100.00 el 2025-11-10, $150.00 el 2026-02-10 y
//   $150.00 el 2026-05-10 (debe $300.00). A Alvin se le deben
//   $450.00 desde 2025-10-20; abonos de $50.00 el 2025-11-20,
//   2026-01-20 y 2026-03-20 (se le deben $300.00). Préstamo del
//   carro: $12,000.00 del Banco Nacional, tomado el 2025-03-01,
//   sin interés anotado, cuota plana de $285.00 el día 28 de cada
//   mes desde 2025-03 (21 cuotas pagadas: queda $6,015.00).
// · Tarjetas: Visa ····1234, límite $2,000.00, vence el día 15;
//   lecturas de saldo: $620.00 el 2026-10-20 (mínimo $20.00) y
//   $845.00 el 2026-11-20 (mínimo $25.00); un pago de $200.00 el
//   2026-11-25 (saldo de hoy: $645.00; el mínimo vigente es el de
//   la última lectura: $25.00). Mastercard ····5678, límite
//   $1,500.00, vence el día 25; lectura de saldo: $237.00 el
//   2026-11-10 (mínimo $15.00), sin pagos.
// · Presupuestos (la versión viva los tiene desde la 1.3.522, como
//   tope por categoría): Alimentos $500.00, Entretenimiento
//   $150.00 y Transporte $150.00 al mes. Las demás categorías no
//   tienen tope en este libro.
import { createInitial } from "./defaults.ts";
import { addLent, payLent } from "./debts.ts";
import { addLoan, payLoan } from "./loans.ts";
import { addRemitPerson } from "./remit-people.ts";
import { putCard } from "./cards.ts";
import type { LedgerState, Line, LineKind } from "./types.ts";

export const HOY_PRUEBA = "2026-11-28";
export const KEY_PRUEBA = "2026-11";

/** Datos del libro que el motor no tiene casilla para guardar:
 * los cumpleaños y los beneficiarios. Viajan con el libro como
 * anotación declarada, no como líneas; un turno sobre ellos se
 * mide contra esta anotación. */
export const ANOTACIONES_PRUEBA = {
  titular: "Andrés",
  cumpleanos: [
    { persona: "Mamá", fecha: "13 de diciembre" },
    { persona: "Papá", fecha: "21 de junio" },
    { persona: "Lucía", fecha: "9 de abril" },
    { persona: "Mateo", fecha: "30 de agosto" },
  ],
  seguroVida: { prima: 4500, inicio: "2024-03-04", beneficiarios: ["Mamá", "Lucía"] },
} as const;

const MESES: string[] = [];
for (let y = 2024; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  const k = `${y}-${String(m).padStart(2, "0")}`;
  if (k > KEY_PRUEBA) break;
  MESES.push(k);
}

const luzDe = (m: number): number => (m === 11 || m === 12 || m === 1 || m === 2) ? 4500 : (m >= 6 && m <= 9) ? 6200 : 5300;

export function libroPrueba(): LedgerState {
  let l = createInitial("es", "claro");
  l.settings.display = "USD";
  const cat = (id: string) => l.structure.categories.find((c) => c.id === id);
  const sub = (cid: string, sid: string, name: string, icon: string, order: number) => {
    const c = cat(cid);
    if (c && !c.subs.some((s) => s.id === sid)) c.subs.push({ id: sid, nameKey: sid, customName: name, icon, hidden: false, order });
  };
  const despensa = cat("f-alimentos")?.subs.find((s) => s.id === "f.alimentos.despensa");
  if (despensa) despensa.customName = "Súper";
  sub("f-alimentos", "f.alimentos.comida", "Comida", "Utensils", 10);
  sub("f-alimentos", "f.alimentos.delivery", "Delivery", "Bike", 11);
  sub("f-ahorro", "f.ahorro.chase", "Chase", "vault:chase", 10);
  sub("f-ahorro", "f.ahorro.carro", "Carro", "vault:carro", 11);
  sub("f-ahorro", "f.ahorro.viaje", "Viaje", "vault:viaje", 12);
  sub("v-familia", "v.familia.regalos", "Regalos", "Gift", 10);
  l.structure.categories.push(
    { id: "f-ia", nameKey: "c.ia", customName: "IA", icon: "Bot", hidden: false, order: 30, group: "fixed", role: "personal", subs: [
      { id: "f.ia.chatgpt", nameKey: "f.ia.chatgpt", customName: "ChatGPT", icon: "Bot", hidden: false, order: 0 },
      { id: "f.ia.claude", nameKey: "f.ia.claude", customName: "Claude", icon: "Bot", hidden: false, order: 1 },
    ] },
    { id: "f-suscripciones", nameKey: "c.suscripciones", customName: "Suscripciones", icon: "Repeat", hidden: false, order: 31, group: "fixed", role: "personal", subs: [
      { id: "f.suscripciones.netflix", nameKey: "f.suscripciones.netflix", customName: "Netflix", icon: "Film", hidden: false, order: 0 },
      { id: "f.suscripciones.spotify", nameKey: "f.suscripciones.spotify", customName: "Spotify", icon: "Music", hidden: false, order: 1 },
      { id: "f.suscripciones.gimnasio", nameKey: "f.suscripciones.gimnasio", customName: "Gimnasio", icon: "Dumbbell", hidden: false, order: 2 },
      { id: "f.suscripciones.icloud", nameKey: "f.suscripciones.icloud", customName: "iCloud", icon: "Cloud", hidden: false, order: 3 },
      { id: "f.suscripciones.prime", nameKey: "f.suscripciones.prime", customName: "Prime", icon: "Package", hidden: false, order: 4 },
      { id: "f.suscripciones.hbo", nameKey: "f.suscripciones.hbo", customName: "HBO Max", icon: "Film", hidden: false, order: 5 },
    ] },
  );
  for (const [cid, cap] of [["f-alimentos", 50000], ["v-entretenimiento", 15000], ["f-transporte", 15000]] as const) {
    const c = cat(cid);
    if (c) { c.capMinor = cap; c.capCurrency = "USD"; }
  }

  l = addRemitPerson(l, "Mamá", "mama").state;
  l = addRemitPerson(l, "Tía Rosa", "tiarosa").state;
  l = addRemitPerson(l, "Primo Diego", "primodiego").state;

  type P = Partial<Line> & { kind: LineKind; amountMinor: number; concept: string };
  for (const mk of MESES) {
    const m = Number(mk.slice(5, 7));
    const q2 = m === 2 ? 27 : 28;
    const lines: Line[] = [];
    const put = (id: string, day: number, p: P) => lines.push({
      id: `${mk}-${id}`, seriesId: id, monthKey: mk, currency: "USD", active: true,
      bookedOn: `${mk}-${String(day).padStart(2, "0")}`, subId: "", ...p,
    } as Line);
    put("sal1", 14, { kind: "income-fixed", amountMinor: 115000, concept: "Salario" });
    put("sal2", q2, { kind: "income-fixed", amountMinor: 115000, concept: "Salario" });
    if (m % 3 === 0) put("ot", 20, { kind: "income-variable", amountMinor: 18000, concept: "Overtime" });
    if (mk <= "2026-03") put("clases", 10, { kind: "income-variable", amountMinor: 25000, concept: "Clases de inglés" });
    put("renta", 3, { kind: "expense-fixed", amountMinor: 95000, concept: "Renta", categoryId: "f-casa", subId: "f.casa.renta" });
    put("luz", 5, { kind: "expense-fixed", amountMinor: luzDe(m), concept: "Luz", categoryId: "f-casa", subId: "f.casa.servicios" });
    put("agua", 5, { kind: "expense-fixed", amountMinor: 3100, concept: "Agua", categoryId: "f-casa", subId: "f.casa.agua" });
    put("internet", 5, { kind: "expense-fixed", amountMinor: 5999, concept: "Internet", categoryId: "f-casa", subId: "f.casa.internet" });
    [5, 12, 19, 26].forEach((d, i) => put(`super${i + 1}`, d, { kind: "expense-variable", amountMinor: 9500, concept: "Súper", categoryId: "f-alimentos", subId: "f.alimentos.despensa" }));
    put("comida1", 9, { kind: "expense-variable", amountMinor: 4200, concept: "Comida", categoryId: "f-alimentos", subId: "f.alimentos.comida" });
    put("comida2", 23, { kind: "expense-variable", amountMinor: 3800, concept: "Comida", categoryId: "f-alimentos", subId: "f.alimentos.comida" });
    [7, 17, 24].forEach((d, i) => put(`delivery${i + 1}`, d, { kind: "expense-variable", amountMinor: 2750, concept: "Delivery", categoryId: "f-alimentos", subId: "f.alimentos.delivery" }));
    [8, 22].forEach((d, i) => put(`gasolina${i + 1}`, d, { kind: "expense-variable", amountMinor: 5500, concept: "Gasolina", categoryId: "f-transporte", subId: "f.transporte.gasolina" }));
    if (m % 2 === 1) put("ropa", 18, { kind: "expense-variable", amountMinor: 8900, concept: "Ropa", categoryId: "v-personales", subId: "v.personales.ropa" });
    put("terapia", 12, { kind: "expense-fixed", amountMinor: 12000, concept: "Terapia", categoryId: "v-personales", subId: "v.personales.salud" });
    if (m % 2 === 0) put("farmacia", 15, { kind: "expense-variable", amountMinor: 3600, concept: "Farmacia", categoryId: "v-personales", subId: "v.personales.salud" });
    [13, 27].forEach((d, i) => put(`salidas${i + 1}`, d, { kind: "expense-variable", amountMinor: 4600, concept: "Salidas", categoryId: "v-entretenimiento", subId: "v.entretenimiento.restaurantes" }));
    put("chatgpt", 6, { kind: "expense-fixed", amountMinor: 2000, concept: "ChatGPT", categoryId: "f-ia", subId: "f.ia.chatgpt" });
    put("claude", 6, { kind: "expense-fixed", amountMinor: 1500, concept: "Claude", categoryId: "f-ia", subId: "f.ia.claude" });
    if (mk >= "2024-03") put("seguro", 4, { kind: "expense-fixed", amountMinor: 4500, concept: "Seguro de vida", categoryId: "f-seguros", subId: "f.seguros.vida" });
    const subs = (id: string, day: number, amountMinor: number, concept: string, sid: string) =>
      put(id, day, { kind: "subscription", amountMinor, concept, categoryId: "f-suscripciones", subId: sid });
    subs("netflix", 9, mk <= "2025-12" ? 1549 : 1799, "Netflix", "f.suscripciones.netflix");
    subs("spotify", 9, 1199, "Spotify", "f.suscripciones.spotify");
    subs("icloud", 9, 299, "iCloud", "f.suscripciones.icloud");
    if (mk >= "2024-06") subs("gimnasio", 2, 3500, "Gimnasio", "f.suscripciones.gimnasio");
    if (mk >= "2025-02") subs("prime", 21, 1499, "Prime", "f.suscripciones.prime");
    if (mk >= "2025-09") {
      subs("hbo", 16, 1699, "HBO Max", "f.suscripciones.hbo");
      if (mk === "2026-09") subs("hbo2", 17, 1699, "HBO Max", "f.suscripciones.hbo");
    }
    put("rem-mama", 15, { kind: "expense-variable", amountMinor: 15000, concept: "Remesa", categoryId: "f-remesas", subId: "f.remesas.envios", to: "mama" });
    if (m % 2 === 1) put("rem-tia", 15, { kind: "expense-variable", amountMinor: 8000, concept: "Remesa", categoryId: "f-remesas", subId: "f.remesas.envios", to: "tiarosa" });
    if (m === 2 || m === 5 || m === 8 || m === 11) lines.push({
      id: `${mk}-rem-diego`, seriesId: "rem-diego", monthKey: mk, currency: "NIO", active: true,
      bookedOn: `${mk}-15`, concept: "Remesa", categoryId: "f-remesas", subId: "f.remesas.envios", to: "primodiego", amountMinor: 1831215, kind: "expense-variable",
    } as Line);
    put("ap-chase", 2, { kind: "expense-fixed", amountMinor: 30000, concept: "Chase", categoryId: "f-ahorro", subId: "f.ahorro.chase" });
    put("ap-emergencia", 2, { kind: "expense-fixed", amountMinor: 15000, concept: "Emergencia", categoryId: "f-ahorro", subId: "f.ahorro.emergencia" });
    if (mk >= "2024-07") put("ap-carro", 2, { kind: "expense-fixed", amountMinor: 20000, concept: "Carro", categoryId: "f-ahorro", subId: "f.ahorro.carro" });
    if (mk >= "2025-06") put("ap-viaje", 2, { kind: "expense-fixed", amountMinor: 10000, concept: "Viaje", categoryId: "f-ahorro", subId: "f.ahorro.viaje" });
    if (m === 12) put("reg-mama", 10, { kind: "expense-variable", amountMinor: 7500, concept: "Regalo para Mamá", categoryId: "v-familia", subId: "v.familia.regalos" });
    if (m === 6) put("reg-papa", 18, { kind: "expense-variable", amountMinor: 6000, concept: "Regalo para Papá", categoryId: "v-familia", subId: "v.familia.regalos" });
    if (m === 4) put("reg-lucia", 6, { kind: "expense-variable", amountMinor: 5000, concept: "Regalo para Lucía", categoryId: "v-familia", subId: "v.familia.regalos" });
    if (m === 8) put("reg-mateo", 27, { kind: "expense-variable", amountMinor: 4500, concept: "Regalo para Mateo", categoryId: "v-familia", subId: "v.familia.regalos" });
    if (mk === KEY_PRUEBA) lines.push({
      id: `${mk}-pago-visa`, seriesId: "pago-visa", monthKey: mk, currency: "USD", active: true,
      bookedOn: `${mk}-25`, concept: "Pago Visa", categoryId: "f-creditos", subId: "f.creditos.tarjetas", amountMinor: 20000, kind: "expense-variable", cardId: "visa",
    } as Line);
    l.months[mk] = { lines };
  }

  l = addLent(l, { id: "lent-carlos", person: "Carlos", kind: "plain", amountMinor: 80000, currency: "USD", aprBps: 0, startedOn: "2025-08-05", dueOn: "2026-08-05", note: "" });
  l = payLent(l, "lent-carlos", 10000, "2025-09-10", "ab-carlos-1", "Abono de Carlos");
  l = payLent(l, "lent-carlos", 10000, "2025-11-10", "ab-carlos-2", "Abono de Carlos");
  l = payLent(l, "lent-carlos", 15000, "2026-02-10", "ab-carlos-3", "Abono de Carlos");
  l = payLent(l, "lent-carlos", 15000, "2026-05-10", "ab-carlos-4", "Abono de Carlos");
  l = addLoan(l, { id: "loan-alvin", lender: "Alvin", who: "person", kind: "plain", amountMinor: 45000, currency: "USD", aprBps: 0, takenOn: "2025-10-20", dueDay: 20, book: "variable", note: "" });
  l = payLoan(l, "loan-alvin", 5000, "2025-11-20", "ab-alvin-1", "Abono a Alvin");
  l = payLoan(l, "loan-alvin", 5000, "2026-01-20", "ab-alvin-2", "Abono a Alvin");
  l = payLoan(l, "loan-alvin", 5000, "2026-03-20", "ab-alvin-3", "Abono a Alvin");
  l = addLoan(l, { id: "loan-carro", lender: "Banco Nacional", who: "entity", kind: "plain", amountMinor: 1200000, currency: "USD", aprBps: 0, takenOn: "2025-03-01", dueDay: 28, book: "fixed", note: "Préstamo del carro" });
  let n = 0;
  for (const mk of MESES) {
    if (mk < "2025-03") continue;
    n++;
    l = payLoan(l, "loan-carro", 28500, `${mk}-28`, `cuota-carro-${n}`, "Cuota del carro");
  }
  l = putCard(l, { id: "visa", name: "Visa", issuer: "", mark: "", color: "", network: "visa", last4: "1234", currency: "USD", limitMinor: 200000, dueDay: 15, aprBps: 0, autopay: null, rewards: "", snaps: [
    { on: "2026-10-20", at: "2026-10-20T12:00:00.000Z", balanceMinor: 62000, minMinor: 2000, src: "manual" },
    { on: "2026-11-20", at: "2026-11-20T12:00:00.000Z", balanceMinor: 84500, minMinor: 2500, src: "manual" },
  ] });
  l = putCard(l, { id: "mc", name: "Mastercard", issuer: "", mark: "", color: "", network: "mastercard", last4: "5678", currency: "USD", limitMinor: 150000, dueDay: 25, aprBps: 0, autopay: null, rewards: "", snaps: [
    { on: "2026-11-10", at: "2026-11-10T12:00:00.000Z", balanceMinor: 23700, minMinor: 1500, src: "manual" },
  ] });
  return l;
}
