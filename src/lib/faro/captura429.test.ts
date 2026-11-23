/**
 * Captura 429 — la tarjeta de «Me deben», la C, y LA CUENTA.
 *
 * LA ELECCIÓN, TAL COMO QUEDÓ (Oscar, 2026-11-22): a las 18:20 dijo
 * «LA D! All the way!» sobre las cuatro maquetas — y a las 20:33 lo
 * corrigió ÉL MISMO, con la foto de la C en la mano: «Sorry. Era el
 * C». La elegida es la C: «La historia en línea» — el préstamo se lee
 * como lo que es, una historia: PRESTADO con su fecha, cada ABONO con
 * su fecha y cuánto va cobrado hasta él, y HOY con su punto abierto,
 * esperando el próximo abono, con lo que queda. La pastilla de la
 * edad («hace 39 días», el número en negrita) vive DENTRO de la
 * esquina inferior derecha de la bandeja, más pequeña, sin escaparse
 * jamás (su corrección de las 18:02). Y el rider de su cuaderno
 * (foto de las 18:20): al abrir el préstamo, LA CUENTA viva — saldo
 * inicial, menos cada abono con su fecha, hasta el saldo de hoy —
 * como él la lleva a mano; su botón abre DEBAJO de la bandeja, que
 * la maqueta trae limpia.
 *
 * La primera construcción de esta ola hizo la D con extras (la
 * cuenta y un «Vence» dentro de la bandeja, «Abonar» quieto) y Oscar
 * la rechazó a las 20:21 — «Esta no fue la que seleccioné ni la que
 * elegí» — antes de aclarar que la suya era la C. La D salió entera;
 * esta cerca guarda la C.
 *
 * La tarjeta es una sola para prestar y deber (LoanCard), así que
 * Préstamos viste la misma historia con sus nombres (Recibido ·
 * Pago · pagado el %): la consistencia manda.
 *
 * El porcentaje de cada abono se calcula sobre las cifras tal como
 * se enseñan (ya redondeadas a centavos), nunca sobre los flotantes
 * de la conversión: 81.91 de 218.43 es 37.4994%, y se enseña 37% —
 * el 38% de la maqueta era dibujado a mano; la división verdadera
 * manda.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const loans = read("../../components/faro/loans.tsx");
const debts = read("../../components/faro/debts.tsx");
const debtsCss = read("../../components/faro/debts.css");
const topics = read("../../lib/manual/topics.ts");

test("429 · la bandeja cuenta la historia en línea: prestado, abonos, hoy", () => {
  assert.ok(loans.includes('className="loan-story"'), "la historia vive en la bandeja");
  assert.ok(loans.includes('className="loan-ev is-now"'), "hoy tiene su propio evento");
  assert.ok(loans.includes('"Hoy", "Today"'), "y se llama Hoy");
  assert.ok(loans.includes("quedan ${fmt(leftView)}"), "hoy dice lo que queda");
  assert.ok(loans.includes("storyRows"), "cada abono es un evento de la línea");
  assert.ok(debtsCss.includes(".loan-story::before"), "la línea une los puntos");
  assert.ok(debtsCss.includes(".loan-ev.is-now::before"), "el punto de hoy va abierto, esperando el próximo abono");
  assert.ok(!loans.includes("loan-cells"), "la D salió entera: ni una celda queda");
});

test("429 · cada abono dice cuánto va cobrado hasta él, de las cifras enseñadas", () => {
  assert.ok(loans.includes("Math.round(runPaid)"), "el porcentaje sale de las cifras ya redondeadas que el usuario ve");
  assert.ok(loans.includes("cobrado el ${r.pct}%"), "al prestar: cobrado el %");
  assert.ok(loans.includes("pagado el ${r.pct}%"), "al deber: pagado el %");
});

test("429 · la pastilla de la edad vive dentro de la esquina de la bandeja", () => {
  const foot = loans.slice(loans.indexOf("loan-tray-foot"), loans.indexOf("loan-tray-foot") + 700);
  assert.ok(foot.includes('className="loan-age"'), "la pastilla está en el pie de la bandeja");
  const tray = loans.slice(loans.indexOf('className="loan-facts"'), loans.indexOf('className="loan-facts"') + 4200);
  assert.ok(tray.includes("loan-tray-foot"), "el pie es parte de la bandeja, no de la tarjeta suelta");
  assert.ok(debtsCss.includes(".loan-age {"), "la pastilla tiene su forma");
  assert.ok(debtsCss.includes("border-radius: 99px"), "redonda, pequeña, en su esquina");
});

test("429 · LA CUENTA: el detalle del cuaderno, abono a abono hasta hoy", () => {
  assert.ok(loans.includes('className="loan-tally"'), "la cuenta tiene su lista");
  assert.ok(loans.includes("tallyRows"), "cada abono resta con su fecha y su saldo");
  assert.ok(loans.includes('"La cuenta", "The tally"'), "su botón se llama La cuenta");
  assert.ok(loans.includes("p.date <= today"), "solo cuentan los abonos que hoy cuentan — la misma cota del estado");
  assert.ok(loans.includes('className="loan-tally-what">{L("Queda", "Left")}'), "y cierra en lo que queda hoy");
  assert.ok(loans.indexOf('className="loan-cuenta"') > loans.indexOf('className="loan-tray-foot"'), "la cuenta abre FUERA de la bandeja — la maqueta la trae limpia");
  assert.ok(loans.includes('className="btn" onClick={() => onPaying(true)}'), "Abonar es el botón principal, como en la maqueta");
});

test("429 · las dos caras cuentan la misma historia con sus nombres", () => {
  assert.ok(debts.includes('leftLabel={L("Te debe", "Owes you")}'), "Me deben dice Te debe");
  assert.ok(debts.includes('storyKind="lend"'), "y cuenta como préstamo dado");
  assert.ok(loans.includes('leftLabel={lang === "en" ? "You owe" : "Debes"}'), "Préstamos dice Debes");
  assert.ok(loans.includes('storyKind="borrow"'), "y cuenta como préstamo recibido");
  assert.ok(debts.includes("interestView={view(f.interest, row.currency)}"), "el interés entra a la cuenta de Me deben");
  assert.ok(loans.includes("interestView={view(f.interest, loan.currency)}"), "y a la de Préstamos");
});

test("429 · el Manual cuenta la historia y la cuenta", () => {
  assert.ok(topics.includes("historia en línea"), "el tema me-deben nombra la historia (ES)");
  assert.ok(topics.includes("story on a line"), "y en inglés (EN)");
  assert.ok(topics.includes("como en un cuaderno"), "y la cuenta del cuaderno");
});
