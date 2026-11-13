/**
 * EL MOTOR DE SELECCIÓN (Oscar, 2026-11-13): las cercas de la oleada que llevó la
 * selección por presión larga a sus tres casas.
 *
 * Lo que se cerca, en las palabras del encargo:
 *  - S1: el par Historial⇄Archivo recorre su propio bucle en goSection, con la
 *    MISMA maquinaria del par de Estudio (el bucle del proveedor, sin gesto nuevo);
 *  - S2/S4: apartar líneas ELEGIDAS (hideLines) es la misma puerta anti-fuga que
 *    apartar un período — toda lectura lee el libro como si ese dinero no
 *    estuviera, ni el nombre ni la cifra — y borrar líneas apartadas
 *    (deleteRestingLines) solo toca lo que descansa, poda los registros y deja
 *    ir el registro que vacía;
 *  - la presión larga es la familia de la casa: 200ms de espera, 12px de
 *    tolerancia (los números de Estructura desde 1.3.227), en un solo gancho;
 *  - el proveedor es el único camino: ocultar la selección compromete (se
 *    deshace, como apartar un período) y borrarla compromete FINAL (como borrar
 *    un período) — nunca al revés.
 * Datos sintéticos solamente.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { readAdvisor } from "./advisor.ts";
import { rewardsByCard, rewardsMonth } from "./bankbook.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { deleteRestingLines, hideLines, hidePeriod, restingEntries, restoreSpan, spansOf } from "./descanso.ts";
import { duesWindow } from "./dues.ts";
import { summarize } from "./engine.ts";
import { buildStream, streamTotals } from "./historial.ts";
import { searchLedger } from "./search.ts";
import { adviceRules } from "./rules.ts";
import type { LedgerState, Line } from "./types.ts";

const KEY = "2026-11";
const TODAY = new Date(2026, 10, 12);
const TV = 999_900;
const TV_NAME = "Televisor gigante X9000";

function line(partial: Partial<Line> & Pick<Line, "id" | "kind" | "concept" | "amountMinor">): Line {
  return {
    seriesId: partial.id,
    monthKey: KEY,
    currency: "NIO",
    active: true,
    note: "",
    categoryId: "",
    subId: "",
    recurring: false,
    storeId: "",
    providerId: "",
    productCode: "",
    productUrl: "",
    cadence: "",
    nextDue: "",
    aprBps: 0,
    balanceMinor: null,
    balanceCurrency: "NIO",
    icon: "",
    history: [],
    ...partial,
  };
}

/** El mismo libro en dos versiones: con la compra de noviembre y sin ella. */
function book(withTv: boolean): LedgerState {
  const s = createInitial("es", "oscuro");
  const months: LedgerState["months"] = {};
  for (const mk of ["2026-08", "2026-09", "2026-10", KEY]) {
    months[mk] = {
      lines: [
        line({ id: `sal-${mk}`, kind: "income-fixed", concept: "Salario", amountMinor: 5_000_000, monthKey: mk, bookedOn: `${mk}-01` }),
        line({ id: `nfx-${mk}`, kind: "subscription", concept: "Netflix", amountMinor: 2_500, monthKey: mk, categoryId: "f-casa", recurring: true, cadence: "monthly", nextDue: `${mk}-20` }),
        line({ id: `tv-${mk}`, kind: "purchase", concept: TV_NAME, amountMinor: 10_000, monthKey: mk, categoryId: "v-entretenimiento", seriesId: "tv", bookedOn: `${mk}-10` }),
      ],
    };
  }
  if (withTv) {
    months[KEY]!.lines[2] = line({ id: "tv-11", kind: "purchase", concept: TV_NAME, amountMinor: TV, monthKey: KEY, categoryId: "v-entretenimiento", seriesId: "tv", bookedOn: "2026-11-10" });
  } else {
    months[KEY]!.lines = months[KEY]!.lines.filter((l) => l.id !== `tv-${KEY}`);
  }
  months[KEY]!.lines.push(line({ id: "taxi-11", kind: "expense-variable", concept: "Taxi", amountMinor: 3_000, monthKey: KEY, categoryId: "v-transporte", bookedOn: "2026-11-05" }));
  s.months = months;
  return s;
}

const names = (s: LedgerState) => makeNamer(s.structure, "es");
const rulesOf = (s: LedgerState) => adviceRules(s, KEY, "es", names(s), { today: TODAY });
const readingOf = (s: LedgerState) => readAdvisor(s, KEY, "es", names(s), { today: TODAY });
const byId = (s: LedgerState, id: string) => Object.values(s.months).flatMap((b) => b.lines).find((l) => l.id === id);

describe("selección — apartar líneas elegidas es la misma puerta que apartar un período", () => {
  it("el libro CON la compra sí la lee (la cerca no es vacía)", () => {
    const withTv = book(true);
    assert.equal(summarize(withTv, KEY, "es").purchases, TV);
    assert.ok(JSON.stringify(rulesOf(withTv)).includes("Televisor"));
  });

  it("apartada por SELECCIÓN, toda lectura es la del libro SIN ese dinero", () => {
    const withTv = book(true);
    const without = book(false);
    const hid = hideLines(withTv, ["tv-11"]);
    assert.equal(hid.count, 1);
    assert.equal(hid.outMinor, TV);
    assert.deepEqual(hid.months, [KEY]);
    assert.ok(hid.span);
    assert.equal(hid.span!.from, "2026-11-10");
    assert.equal(hid.span!.to, "2026-11-10");
    const hidden = hid.state;

    assert.deepEqual(summarize(hidden, KEY, "es"), summarize(without, KEY, "es"));
    const ra = readingOf(hidden);
    const rb = readingOf(without);
    assert.deepEqual(
      { income: ra.income, outTotal: ra.outTotal, realSpend: ra.realSpend, left: ra.left, subsTotal: ra.subsTotal, uniqueMinor: ra.uniqueMinor, uniqueCount: ra.uniqueCount, recurrentMinor: ra.recurrentMinor, headline: ra.headline, action: ra.action, alert: ra.alert },
      { income: rb.income, outTotal: rb.outTotal, realSpend: rb.realSpend, left: rb.left, subsTotal: rb.subsTotal, uniqueMinor: rb.uniqueMinor, uniqueCount: rb.uniqueCount, recurrentMinor: rb.recurrentMinor, headline: rb.headline, action: rb.action, alert: rb.alert },
    );
    assert.deepEqual(rulesOf(hidden), rulesOf(without));
    const allText = JSON.stringify(rulesOf(hidden));
    assert.ok(!allText.includes("Televisor"), "ninguna regla nombra lo apartado por selección");
    assert.ok(!allText.includes(String(TV)), "ninguna cifra de lo apartado aparece");
    assert.deepEqual(buildStream(hidden), buildStream(without));
    assert.deepEqual(streamTotals(hidden, buildStream(hidden)), streamTotals(without, buildStream(without)));
    const hits = searchLedger(hidden, "televisor", "es", names(hidden));
    assert.ok(hits.length > 0 && hits.every((h) => h.lineId !== "tv-11"), "la búsqueda no resucita la línea apartada");
    assert.deepEqual(
      rewardsMonth(hidden, KEY, hidden.settings.display, hidden.settings.rateE4),
      rewardsMonth(without, KEY, without.settings.display, without.settings.rateE4),
    );
    // El estado original no se mutó por el camino.
    assert.equal(byId(withTv, "tv-11")?.rest, undefined);
  });

  it("la membresía es la del río: la inactiva sin transferencia no se aparta; la transferencia sí", () => {
    const s = createInitial("es", "oscuro");
    s.months = {
      [KEY]: {
        lines: [
          line({ id: "due-off", kind: "subscription", concept: "Cuota archivada", amountMinor: 5_000, monthKey: KEY, active: false, nextDue: "2026-11-15" }),
          line({ id: "xfer-1", kind: "expense-variable", concept: "Traslado", amountMinor: 7_000, monthKey: KEY, xfer: true, bookedOn: "2026-11-03" }),
          line({ id: "gym-1", kind: "subscription", concept: "Gym", amountMinor: 5_000, monthKey: KEY, categoryId: "v-personales", recurring: true, cadence: "monthly", nextDue: "2026-11-15", bookedOn: "2026-11-02" }),
        ],
      },
    };
    assert.ok(duesWindow(s, 14, "2026-11-12").some((e) => e.id === "gym-1"), "la cuota vence en público mientras está viva");
    const hid = hideLines(s, ["due-off", "xfer-1", "gym-1", "no-existe"]);
    assert.equal(hid.count, 2, "solo entran la transferencia y la cuota viva");
    assert.deepEqual([...hid.span!.lineIds].sort(), ["gym-1", "xfer-1"]);
    assert.equal(hid.outMinor, 5_000, "la transferencia no suma como gasto (la regla de hidePeriod)");
    assert.equal(byId(hid.state, "due-off")?.rest, undefined);
    assert.ok(!duesWindow(hid.state, 14, "2026-11-12").some((e) => e.id === "gym-1"), "apartada por selección, la cuota no vence en ninguna lectura");
  });

  it("el período de una selección abarca de su primer a su último día, y Restaurar lo devuelve entero", () => {
    const withTv = book(true);
    const hid = hideLines(withTv, ["taxi-11", "tv-11"]);
    assert.equal(hid.count, 2);
    assert.equal(hid.span!.from, "2026-11-05");
    assert.equal(hid.span!.to, "2026-11-10");
    const entry = restingEntries(hid.state)[0]!;
    assert.equal(entry.count, 2);
    const back = restoreSpan(hid.state, hid.span!.id);
    assert.equal(spansOf(back).length, 0);
    assert.equal(byId(back, "tv-11")?.rest, undefined);
    assert.deepEqual(summarize(back, KEY, "es"), summarize(withTv, KEY, "es"));
  });

  it("una línea que ya descansa pertenece a su período: la selección no la reclama dos veces", () => {
    const withTv = book(true);
    const per = hidePeriod(withTv, "2026-11-09", "2026-11-15");
    const sel = hideLines(per.state, ["tv-11", "taxi-11"]);
    assert.equal(sel.count, 1, "solo el taxi entra: el televisor ya descansa en su período");
    assert.deepEqual(sel.span!.lineIds, ["taxi-11"]);
    assert.equal(spansOf(sel.state).length, 2);
  });
});

describe("selección — borrar líneas apartadas, la puerta del Archivo", () => {
  it("borra la línea, poda su registro y deja ir el registro que vacía", () => {
    const withTv = book(true);
    const hid = hideLines(withTv, ["tv-11", "taxi-11"]);
    const one = deleteRestingLines(hid.state, ["tv-11"]);
    assert.equal(byId(one, "tv-11"), undefined, "la línea salió del libro");
    assert.equal(byId(one, "taxi-11")?.rest, true, "la otra sigue descansando");
    assert.deepEqual(spansOf(one)[0]!.lineIds, ["taxi-11"], "el registro se podó, no se vació");
    const both = deleteRestingLines(one, ["taxi-11"]);
    assert.equal(spansOf(both).length, 0, "el registro vacío se va con sus líneas");
    // La lectura final es la del libro construido sin ninguna de las dos líneas.
    const bare = book(false);
    bare.months[KEY]!.lines = bare.months[KEY]!.lines.filter((l) => l.id !== "taxi-11");
    assert.deepEqual(summarize(both, KEY, "es"), summarize(bare, KEY, "es"));
  });

  it("jamás toca una línea que cuenta: la puerta solo acepta lo que descansa", () => {
    const withTv = book(true);
    const out = deleteRestingLines(withTv, ["tv-11", "taxi-11"]);
    assert.equal(out, withTv, "sin líneas apartadas entre las nombradas, el estado ni se toca");
    assert.ok(byId(out, "tv-11"));
  });

  it("convive con los períodos: borrar una línea de un período deja el resto del período en pie", () => {
    const withTv = book(true);
    const per = hidePeriod(withTv, "2026-11-01", "2026-11-30");
    assert.ok(per.count >= 3);
    const out = deleteRestingLines(per.state, ["tv-11"]);
    assert.equal(byId(out, "tv-11"), undefined);
    const entry = restingEntries(out)[0]!;
    assert.equal(entry.count, per.count - 1);
    assert.ok(!entry.lines.some((l) => l.id === "tv-11"));
    // Y lo que queda del período sigue sin contar: la lectura es la del libro
    // con el mes entero apartado, no la del libro sin el televisor.
    assert.deepEqual(summarize(out, KEY, "es"), summarize(per.state, KEY, "es"));
  });
});

describe("selección — el cableado", () => {
  const root = path.join(process.cwd(), "src");
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

  it("S1: goSection recorre el bucle de Folios, como el par de Estudio recorre el suyo", () => {
    const provider = read("components/faro/provider.tsx");
    assert.ok(provider.includes('const folios = ["historial", "archivo"] as const;'), "el bucle de Folios existe en el proveedor");
    const go = provider.slice(provider.indexOf("const goSection"), provider.indexOf("const goSection") + 1600);
    assert.ok(go.includes('const study = ["stats", "advice"] as const;'), "el par de Estudio sigue en su bucle");
    assert.ok(go.includes("(folios as readonly string[]).includes(u.section)"), "goSection consulta el bucle de Folios");
  });

  it("la presión larga es UNA familia: 200ms y 12px, los números de Estructura (1.3.227)", () => {
    const hook = read("components/faro/use-longpress.ts");
    assert.ok(hook.includes("export const LONG_PRESS_MS = 200;"));
    assert.ok(hook.includes("export const LONG_PRESS_TOLERANCE_PX = 12;"));
    assert.ok(hook.includes('window.addEventListener("pointermove", moveWatch)'), "la tolerancia se vigila en la ventana: la captura de <main> re-apunta el movimiento fuera de la fila");
    // Las tres casas beben del mismo gancho.
    for (const f of ["components/faro/historial.tsx", "components/faro/archivo.tsx", "components/faro/screens.tsx"]) {
      assert.ok(read(f).includes("useLongPress"), `${f} usa el gancho de la casa`);
      assert.ok(read(f).includes("useSelection"), `${f} usa el estado de selección de la casa`);
    }
  });

  it("el proveedor: ocultar la selección se deshace (commit); borrarla es final (commitFinal)", () => {
    const provider = read("components/faro/provider.tsx");
    assert.ok(provider.includes("hideLineSelection: (ids, label) => {"));
    assert.ok(provider.includes("commit((s) => hideLines(s, ids, label).state"), "ocultar compromete deshacible, como apartar un período");
    assert.ok(provider.includes("commitFinal((s) => deleteRestingLines(s, ids)"), "borrar compromete final, como borrar un período");
  });

  it("el borrado en el Archivo — el lote y el suelto — pasa por la puerta escrita de la casa", () => {
    const archivo = read("components/faro/archivo.tsx");
    assert.ok(archivo.includes("typeText: user?.email || undefined"), "la misma puerta que el borrado de período: el correo de la sesión, o ninguna sin cuenta");
    assert.ok(archivo.includes("deleteRestingLineSelection(lines.map((l) => l.id))"), "el verbo del proveedor hace el borrado, nunca la pantalla a mano");
    const historial = read("components/faro/historial.tsx");
    assert.ok(!historial.includes("typeText"), "ocultar NO lleva puerta escrita: es ida y vuelta (el gradiente de puertas de Oscar, 2026-11-13)");
  });

  it("descanso.ts nombra las puertas nuevas en su registro de cabecera", () => {
    const src = read("lib/faro/descanso.ts");
    const head = src.slice(0, src.indexOf("import"));
    assert.ok(head.includes("hideLines"), "el registro nombra hideLines");
    assert.ok(head.includes("deleteRestingLines"), "el registro nombra deleteRestingLines");
  });

  it("la barra del modo se anuncia y Atrás/ESC sale sin aplicar (la capa de la casa)", () => {
    const sel = read("components/faro/selection.tsx");
    assert.ok(sel.includes("useLayer(mode, exit)"), "salir del modo es una capa: Atrás/ESC no aplica nada");
    assert.ok(sel.includes('data-testid="sel-bar"'), "la barra existe y se nombra");
    const css = read("components/faro/selection.css");
    assert.ok(css.includes(".sel-bar"), "la barra viste la superficie de la casa");
    assert.ok(css.includes("inset 0 -3px 0 var(--selc, var(--accent))"), "el marco elegido lleva la barra inferior de la gramática (1.3.199)");
  });

  it("las recompensas no resucitan lo apartado por selección", () => {
    const withTv = book(true);
    const hidden = hideLines(withTv, ["tv-11"]).state;
    const bare = book(false);
    assert.deepEqual(
      rewardsByCard(hidden, KEY, hidden.settings.display, hidden.settings.rateE4),
      rewardsByCard(bare, KEY, bare.settings.display, bare.settings.rateE4),
    );
  });
});
