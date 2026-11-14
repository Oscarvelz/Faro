/**
 * Los apuntes rápidos del widget: el parseo desconfía de la cola, la línea cae en el mes del
 * apunte (no en el de la recogida) y recoger dos veces nunca duplica (el id manda).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ingestQuick, parseQuickEntries, pinSigns, quickHomes, quickLine, quickPins, suggestHome, toggleWidgetPin, QUICK_MAX_MINOR, type QuickEntry } from "./quickadd.ts";
import { createInitial } from "./defaults.ts";
import { packLedgerOk } from "./packguard.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import type { LedgerState, Line } from "./types.ts";

const blank = () => ({ revision: 1, updatedAt: "2026-11-12T00:00:00.000Z", settings: { lang: "es" }, months: {}, structure: { categories: [] } }) as unknown as LedgerState;

const GOOD: QuickEntry = { id: "q-12345678-ab", sign: "out", minor: 125050, cur: "NIO", day: "2026-10-31" };

describe("apuntes rápidos del widget", () => {
  it("parsea la cola y descarta cada pieza mala sin romper", () => {
    const raw = JSON.stringify([
      GOOD,
      { id: "x", sign: "out", minor: 100, cur: "USD", day: "2026-10-31" }, // id corto
      { id: "q-87654321-cd", sign: "sideways", minor: 100, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 0, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: -50, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: QUICK_MAX_MINOR + 1, cur: "USD", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 100, cur: "EUR", day: "2026-10-31" },
      { id: "q-87654321-cd", sign: "in", minor: 100, cur: "USD", day: "31/10/2026" },
      "basura", null, 42,
    ]);
    assert.deepEqual(parseQuickEntries(raw), [{ ...GOOD, cat: "", sub: "" }]);
    assert.deepEqual(parseQuickEntries(""), []);
    assert.deepEqual(parseQuickEntries("{no json"), []);
    assert.deepEqual(parseQuickEntries("{}"), []);
  });

  it("la línea: kind por signo, mes del día del apunte, id y serie = el id del apunte", () => {
    const l = quickLine(GOOD, "es");
    assert.equal(l.kind, "expense-variable");
    assert.equal(l.monthKey, "2026-10"); // octubre, aunque se recoja en noviembre
    assert.equal(l.id, GOOD.id);
    assert.equal(l.seriesId, GOOD.id);
    assert.equal(l.amountMinor, 125050);
    assert.equal(l.currency, "NIO");
    assert.equal(l.categoryId, "");
    assert.equal(l.subId, "");
    assert.equal(l.active, true);
    assert.equal(l.bookedOn, "2026-10-31");
    const inn = quickLine({ ...GOOD, sign: "in" }, "en");
    assert.equal(inn.kind, "income-variable");
    assert.equal(inn.concept, "Quick entry");
    assert.equal(l.concept, "Apunte rápido");
  });

  it("recoger dos veces no duplica; el libro ajeno queda intacto", () => {
    const base = blank();
    const once = ingestQuick(base, [GOOD], "es");
    const twice = ingestQuick(once, [GOOD], "es");
    assert.equal(once.months["2026-10"]?.lines.length, 1);
    assert.equal(twice.months["2026-10"]?.lines.length, 1);
    assert.equal(base.months["2026-10"], undefined); // el estado original no se mutó
  });

  it("las casas: solo las que ya reciben el signo, por uso; Ahorros y lo oculto quedan fuera", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-casa", "Casa", 1, { group: "fixed", role: "housing", subs: [named("s-renta", "Renta", 1), named("s-luz", "Luz", 2), named("s-oculta", "Oculta", 3, { hidden: true })] }),
      named("c-comida", "Comida", 2, { group: "variable", role: "food", subs: [named("s-super", "Súper", 1)] }),
      named("c-ahorro", "Ahorro", 3, { group: "variable", role: "savings", subs: [named("s-boveda", "Bóveda", 1)] }),
      named("c-salario", "Salario", 4, { group: "fixed", role: "", subs: [named("s-sueldo", "Sueldo", 1)] }),
    ];
    const mk = (kind: string, categoryId: string, subId: string) =>
      ({ id: `${kind}-${categoryId}-${subId}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "NIO", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
    st.months = { "2026-11": { lines: [
      mk("expense-fixed", "c-casa", "s-renta"), mk("expense-fixed", "c-casa", "s-renta"),
      mk("expense-variable", "c-comida", "s-super"),
      mk("expense-fixed", "c-casa", "s-oculta"),
      mk("expense-variable", "c-ahorro", "s-boveda"),
      mk("income-fixed", "c-salario", "s-sueldo"),
      mk("income-variable", "c-comida", "s-super"), // Comida recibió UN ingreso: es casa de ambos signos
    ] } };
    const homes = quickHomes(st, "2026-11", "es");
    assert.deepEqual(homes.out.map((h) => h.n), ["Casa · Renta", "Comida · Súper"]);
    assert.deepEqual(homes.inn.map((h) => h.n), ["Comida · Súper", "Salario · Sueldo"]); // empate a 1 uso: gana el orden de Estructura
    assert.ok(!homes.out.some((h) => h.c === "c-ahorro"), "Ahorros nunca es casa de un apunte");
  });

  it("las casas a nivel de categoría: el libro de Oscar (ingreso sin subs) ya no devuelve la lista vacía", () => {
    // El censo de 1.3.241 sobre su cuarta prueba: quickHomes solo contaba líneas CON
    // subcategoría — su ingreso cae sin categoría o a nivel de categoría («Ingresos
    // variables» sin subs) y qhIn volvía []: la tarjeta ni dibujaba el «¿Dónde va?».
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-salario", "Salario", 1, { group: "fixed", role: "", subs: [] }),
      named("c-casa", "Casa", 2, { group: "fixed", role: "housing", subs: [named("s-renta", "Renta", 1)] }),
      named("c-comida", "Comida", 3, { group: "variable", role: "food", subs: [named("s-super", "Súper", 1)] }),
    ];
    const mk = (kind: string, categoryId: string, subId: string) =>
      ({ id: `${kind}-${categoryId}-${subId}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "USD", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
    st.months = { "2026-11": { lines: [
      mk("income-fixed", "c-salario", ""), mk("income-fixed", "c-salario", ""), // su hábito: la categoría, sin sub
      mk("income-variable", "", ""), mk("income-variable", "", ""), mk("income-variable", "", ""), // y apuntes sin categoría
      mk("expense-fixed", "c-casa", "s-renta"),
    ] } };
    const homes = quickHomes(st, "2026-11", "es");
    // La casa de ingreso ES la categoría: s = "" y el nombre sin «· sub».
    assert.deepEqual(homes.inn, [{ c: "c-salario", s: "", n: "Salario" }]);
    assert.deepEqual(homes.out.map((h) => h.n), ["Casa · Renta"]);
    // Un libro donde TODO cae sin categoría no inventa casas: la lista queda vacía y la
    // tarjeta ofrece su «Sin categoría» siempre presente (cerca del shell, abajo).
    const bare = blank();
    (bare.structure as unknown as { categories: unknown[] }).categories = [
      named("c-salario", "Salario", 1, { group: "fixed", role: "", subs: [] }),
    ];
    bare.months = { "2026-11": { lines: [mk("income-variable", "", "")] } };
    assert.deepEqual(quickHomes(bare, "2026-11", "es"), { inn: [], out: [] });
  });

  it("con casa a nivel de categoría: el apunte cae en la categoría sin sub, con el kind de su grupo", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-salario", "Salario", 1, { group: "fixed", role: "", subs: [] }),
    ];
    const filed = ingestQuick(st, [{ ...GOOD, id: "q-66666666-ff", sign: "in", cat: "c-salario", sub: "" }], "es")
      .months["2026-10"]?.lines[0];
    assert.equal(filed?.categoryId, "c-salario"); // exactamente donde la tarjeta dijo
    assert.equal(filed?.subId, "");
    assert.equal(filed?.kind, "income-fixed"); // el grupo de la categoría, no el variable por defecto
  });

  it("la foto trae las monedas del libro: la de vista primero y siempre se puede alternar", () => {
    const init = createInitial("es", "tron"); // vista NIO por defecto
    const snapNio = buildWidgetSnapshot(init, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.deepEqual(snapNio.curs, ["NIO", "USD"]); // el Córdoba de vista y el dólar al que alternar
    const usd = createInitial("es", "tron");
    (usd.settings as unknown as { display: string }).display = "USD"; // el libro de Oscar: vista en dólares
    const snapUsd = buildWidgetSnapshot(usd, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.equal(snapUsd.cur, "USD");
    assert.deepEqual(snapUsd.curs, ["USD", "NIO"]); // su dólar primero; tocar el signo trae el Córdoba
  });

  it("con casa: el kind sale del grupo de la categoría; las caídas son honestas", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-casa", "Casa", 1, { group: "fixed", role: "housing", subs: [named("s-renta", "Renta", 1)] }),
      named("c-ahorro", "Ahorro", 2, { group: "variable", role: "savings", subs: [named("s-boveda", "Bóveda", 1)] }),
    ];
    const filed = (e: QuickEntry) => ingestQuick(st, [e], "es").months["2026-10"]?.lines[0];
    const housed = filed({ ...GOOD, cat: "c-casa", sub: "s-renta" });
    assert.equal(housed?.kind, "expense-fixed"); // el grupo de Casa, no el «variable» por defecto
    assert.equal(housed?.categoryId, "c-casa");
    assert.equal(housed?.subId, "s-renta");
    const subGone = filed({ ...GOOD, id: "q-22222222-bb", cat: "c-casa", sub: "s-borrada" });
    assert.equal(subGone?.categoryId, "c-casa"); // la categoría se queda…
    assert.equal(subGone?.subId, ""); // …la sub borrada cae en la categoría, no en otro lugar
    const catGone = filed({ ...GOOD, id: "q-33333333-cc", cat: "c-fantasma", sub: "s-x" });
    assert.equal(catGone?.categoryId, "");
    assert.equal(catGone?.kind, "expense-variable"); // el apunte nunca se pierde ni se archiva mal
    const savings = filed({ ...GOOD, id: "q-44444444-dd", cat: "c-ahorro", sub: "s-boveda" });
    assert.equal(savings?.categoryId, ""); // Ahorros jamás recibe un apunte genérico
    const badHome = parseQuickEntries(JSON.stringify([{ ...GOOD, id: "q-55555555-ee", cat: 42, sub: null }]));
    assert.equal(badHome[0]?.cat, ""); // una casa mal formada degrada, no mata el apunte
  });

  it("el shell: los + / − levantan la tarjeta rápida, no la app; el puente recoge la cola", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const main = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt"), "utf8");
    const manifest = fs.readFileSync(path.join(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    assert.match(widgets, /R\.id\.w_add_in, FaroWidgets\.quickIntent\(ctx, "in"\)/);
    assert.match(widgets, /R\.id\.w_add_out, FaroWidgets\.quickIntent\(ctx, "out"\)/);
    assert.ok(!widgets.includes('openIntent(ctx, "add-in")') && !widgets.includes('openIntent(ctx, "add-out")'),
      "los botones ya no abren la app");
    assert.match(main, /fun takeQuickEntries\(\): String/);
    assert.match(manifest, /android:name="\.QuickAddActivity"/);
    // La tarjeta no lee el libro: solo la foto (idioma/moneda) y su propia cola.
    assert.match(quick, /FaroWidgets\.load\(this\)/);
    assert.ok(!quick.includes("faro_ledgers") && !quick.includes("supabase"), "la tarjeta no toca el libro ni la red");
  });

  it("el shell 1.3.234: entrega en dos fases, señal de regreso y widgets que se curan", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const main = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/MainActivity.kt"), "utf8");
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    const host = fs.readFileSync(path.join(root, "src/components/faro/widget-host.tsx"), "utf8");
    // Dos fases: peek mira sin vaciar y ack retira solo los ids archivados; el drain de
    // 1.3.233 queda intacto para las páginas que recogen en una sola vez.
    assert.match(main, /fun peekQuickEntries\(\): String/);
    assert.match(main, /fun ackQuickEntries\(idsJson: String\)/);
    assert.match(quick, /fun peek\(ctx: Context\): String/);
    assert.match(quick, /fun ack\(ctx: Context, idsJson: String\)/);
    assert.match(quick, /fun drain\(ctx: Context\): String/);
    // La página prefiere la entrega en dos fases y cae a la de una vez en shells viejos.
    assert.match(host, /n\.peekQuickEntries && n\.ackQuickEntries/);
    assert.match(host, /n\.takeQuickEntries\?\.\(\)/);
    // El regreso a la app tiene señal propia (onResume) y la página la escucha.
    assert.match(main, /override fun onResume\(\)/);
    assert.match(main, /faronative-resume/);
    assert.match(host, /addEventListener\("faronative-resume", drain\)/);
    // Al arrancar, el shell re-dibuja los widgets: ninguna instancia conserva botones de
    // un shell anterior tras abrir la app una vez.
    assert.match(main, /FaroWidgets\.refreshAll\(applicationContext\)/);
    // (La cuarta parte de esta cerca — la «foto vieja» que la tarjeta decía en voz alta —
    // se retiró en 1.3.237: la cerca nueva de abajo la sustituye. La línea que pedía abrir
    // la app murió por la ley de Oscar en su tercera prueba.)
  });

  it("1.3.237: la foto es del libro real en cualquier sesión, la tarjeta no pide abrir la app y los botones respiran", () => {
    const root = process.cwd();
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    const host = fs.readFileSync(path.join(root, "src/components/faro/widget-host.tsx"), "utf8");
    // La desacoplación: con el ejemplo en pantalla, el feed calcula la foto desde el pack
    // personal guardado (el canal que salta el prefijo del ejemplo) y lo valida en
    // profundidad. El ejemplo jamás se fotografía: lo que se fotografía es el libro real.
    assert.match(host, /personalGet\(packKeyOf\(userId\)\)/);
    assert.match(host, /packLedgerOk/);
    // La línea amarilla murió y el shell ya no calcula «foto vieja».
    assert.ok(!quick.includes("activar tus categorías") && !quick.includes("enable your categories"),
      "ningún texto de la tarjeta pide abrir la app");
    assert.ok(!quick.includes("snap.stale"), "la tarjeta ya no conoce el estado «foto vieja»");
    assert.ok(!widgets.includes("stale"), "el shell ya no calcula «foto vieja»");
    // Los botones respiran: hueco declarado de 10dp entre las fichas y aire propio dentro
    // de cada una (la tercera prueba: Cancelar y Guardar se dibujaban pegadas).
    const row = quick.slice(quick.indexOf("val buttons"));
    assert.match(row, /leftMargin = dp\(10\)/);
    assert.match(row, /setPadding\(dp\(18\), 0, dp\(18\), 0\)/);
  });

  it("1.3.241: el «¿Dónde va?» nunca desaparece y el signo de moneda alterna la moneda del apunte", () => {
    const root = process.cwd();
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    // La sección se compone siempre que hay foto: la pregunta impresa y el grupo existen
    // fuera de toda condición sobre las casas. (En 1.3.240 un `if (homes.isNotEmpty())`
    // envolvía la sección entera: sin casas no había ni pregunta.)
    assert.match(quick, /val group = RadioGroup\(this\)/);
    assert.ok(!/if \(homes\.isNotEmpty\(\)\) \{\s*card\.addView\(TextView/.test(quick),
      "la sección ya no vive dentro de la condición de las casas");
    assert.ok(quick.includes("¿DÓNDE VA?") && quick.includes("WHERE DOES IT GO?"), "la pregunta va impresa siempre");
    // Re-fijado en 1.3.246: la lista pasó a ser filas = fijas + hábitos, así que el
    // asiento de «Sin categoría» es rows.size (la intención de la cerca — sin última
    // casa usada, «Sin categoría» queda marcada — se conserva intacta).
    assert.match(quick, /group\.check\(1000 \+ if \(lastIdx >= 0\) lastIdx else rows\.size\)/,
      "sin hábito, «Sin categoría» queda marcada y legible");
    // El signo alterna: la moneda elegida es la que viaja en el apunte (ya no la de la foto
    // a la fuerza) y se recuerda por signo, como la casa.
    assert.match(quick, /val cursCycle: List<String>/);
    assert.match(quick, /fun lastCur\(ctx: Context, sign: String\)/);
    assert.match(quick, /fun rememberCur\(ctx: Context, sign: String, cur: String\)/);
    assert.ok(quick.includes('.put("cur", cur)'), "el apunte lleva la moneda elegida en la tarjeta");
    assert.ok(!quick.includes('.put("cur", snap.cur)'), "la moneda de la foto ya no se impone");
    assert.match(quick, /curChipBg\(\)/);
    // La foto trae las monedas del libro; sin ellas el shell alterna por su cuenta.
    assert.ok(widgets.includes("\"curs\""), "el shell lee las monedas de la foto");
    assert.match(widgets, /val curs: List<String> = emptyList\(\)/);
  });

  it("1.3.237: la foto que el feed empuja con el ejemplo en pantalla es función pura del pack personal", () => {
    const init = createInitial("es", "tron");
    const renta = {
      id: "renta", seriesId: "renta", concept: "renta", currency: "USD", active: true, note: "",
      categoryId: "f-casa", subId: "f.casa.renta", recurring: false, storeId: "", providerId: "",
      productCode: "", productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null,
      balanceCurrency: "USD", icon: "", history: [],
      kind: "expense-fixed", amountMinor: 95000, monthKey: "2026-11",
    } as unknown as Line;
    const real: LedgerState = { ...init, months: { "2026-11": { lines: [renta] } } };
    const raw = JSON.stringify({ ledger: real, dirty: false });
    assert.equal(packLedgerOk(raw), true, "el pack personal del libro real valida en profundidad");
    assert.equal(packLedgerOk("{roto"), false);
    assert.equal(packLedgerOk(JSON.stringify({ ledger: { nope: 1 } })), false, "un pack sin libro válido nunca se fotografía");
    const parsed = (JSON.parse(raw) as { ledger: LedgerState }).ledger;
    const snap = buildWidgetSnapshot(parsed, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.ok(snap.qhOut.some((h) => h.n.includes("Renta")), "la foto trae las casas del libro real");
  });

  it("1.3.243: la pasada fina — los seis defectos medidos del censo no vuelven", () => {
    const root = process.cwd();
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    // (1) La ventana va a todo lo ancho tras montar el contenido: la tarjeta corre a
    // pantalla − 40dp por el aire del marco (≈90 %), no a su mínimo de 288dp (75 %).
    assert.ok((quick.match(/window\.setLayout\(\s*WindowManager\.LayoutParams\.MATCH_PARENT/g) ?? []).length >= 2,
      "los dos caminos de setContentView fijan la ventana a todo lo ancho");
    // (2) El campo del monto nace sin el relleno de fábrica del tema.
    const amountBlock = quick.slice(quick.indexOf("val amount = EditText"), quick.indexOf("val row = LinearLayout"));
    assert.match(amountBlock, /background = null\s*\n\s*\/\/ 1\.3\.243[\s\S]*?setPadding\(0, 0, 0, 0\)/,
      "tras background = null el relleno queda en cero");
    // (3) La caja de línea de la cifra es la del espécimen: 44dp (line-height: 1).
    assert.match(amountBlock, /lineHeight = dp\(44\)/, "la cifra vive en su caja de 44dp");
    // (6) El cursor es el color de signo, sólido y de 2dp — nunca el turquesa de fábrica.
    assert.match(amountBlock, /textCursorDrawable = GradientDrawable\(\)/, "el cursor lleva su propio dibujo");
    assert.match(amountBlock, /setColor\(accent\); setSize\(dp\(2\), dp\(44\)\)/, "cursor sólido de signo, 2dp");
    // (4) La lengüeta de Señal vuela 1dp por encima de la tarjeta o no se ve.
    assert.match(quick, /elevation = dp\(25\)\.toFloat\(\)/, "la lengüeta se eleva sobre la tarjeta (24dp)");
    // (5) El cuadrado del radio viaja remetido 14dp en su lienzo: la barra queda visible
    // y el texto cae en los 44dp del espécimen por el ancho intrínseco del dibujo.
    assert.match(quick, /private fun insetSquare\(d: Drawable\): Drawable = LayerDrawable\(arrayOf\(d\)\)/,
      "el cuadrado viaja dentro de su lienzo");
    assert.match(quick, /setLayerInset\(0, dp\(14\), 0, 0, 0\)/, "el cuadrado se remete 14dp desde la izquierda");
    assert.match(quick, /addState\(intArrayOf\(android\.R\.attr\.state_checked\), insetSquare\(on\)\)/,
      "el estado marcado usa el lienzo remetido");
    assert.match(quick, /addState\(intArrayOf\(\), insetSquare\(off\)\)/, "el estado en reposo también");
  });

  it("1.3.246: las fijas — la foto las trae primero, la deduplicación quita el par y el hábito rellena el hueco", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    // Doce casas de gasto con uso 12..1: sin fijas, la tarjeta ofrece las diez primeras.
    const cats: unknown[] = [];
    const lines: Line[] = [];
    const mk = (kind: string, categoryId: string, subId: string) =>
      ({ id: `${kind}-${categoryId}-${subId}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "NIO", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
    for (let i = 0; i < 12; i++) {
      const id = `c-h${i}`;
      cats.push(named(id, `Casa ${i}`, i + 1, { group: "variable", role: "", subs: [named(`s-h${i}`, "Sub", 1)] }));
      for (let n = 0; n < 12 - i; n++) lines.push(mk("expense-variable", id, `s-h${i}`));
    }
    // Y una de ingreso a nivel de categoría, sin subs (la forma del libro de Oscar).
    cats.push(named("c-salario", "Salario", 20, { group: "fixed", role: "", subs: [] }));
    lines.push(mk("income-fixed", "c-salario", ""), mk("income-fixed", "c-salario", ""));
    (st.structure as unknown as { categories: unknown[] }).categories = cats;
    (st.structure as unknown as { purchases: unknown[] }).purchases = [];
    (st.structure as unknown as { catalog: unknown[] }).catalog = [];
    st.months = { "2026-11": { lines } };
    const sinFijas = buildWidgetSnapshot(st, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.equal(sinFijas.qhOut.length, 10);
    assert.deepEqual(sinFijas.qpOut, []);
    // Fija la tercera casa por uso (12, 11, 10…): la foto la trae como fija, su par sale
    // de las de hábito y la undécima (2 usos) RELLENA el hueco — la lista sigue con 10.
    (st.settings as unknown as { widgetPins: unknown }).widgetPins = [{ c: "c-h2", s: "s-h2" }, { c: "c-salario", s: "" }];
    const snap = buildWidgetSnapshot(st, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.deepEqual(snap.qpOut, [{ c: "c-h2", s: "s-h2", n: "Casa 2 · Sub" }]);
    assert.ok(!snap.qhOut.some((h) => h.c === "c-h2"), "el par fijado no aparece dos veces");
    assert.equal(snap.qhOut.length, 10, "el hábito rellena: siguen siendo diez");
    assert.ok(snap.qhOut.some((h) => h.c === "c-h10"), "la undécima casa sube al hueco");
    assert.ok(!snap.qhOut.some((h) => h.c === "c-h11"), "la duodécima sigue fuera");
    // La de ingreso vive en su tarjeta (su signo sale de sus recibos) y en la otra, no.
    assert.deepEqual(snap.qpIn, [{ c: "c-salario", s: "", n: "Salario" }]);
    assert.ok(!snap.qpOut.some((h) => h.c === "c-salario"));
    // Desfijar devuelve el asiento al hábito por su propio mérito.
    (st.settings as unknown as { widgetPins: unknown }).widgetPins = toggleWidgetPin([{ c: "c-h2", s: "s-h2" }], "c-h2", "s-h2");
    const libre = buildWidgetSnapshot(st, "es", { today: "2026-11-12", hide: false, lock: false });
    assert.deepEqual(libre.qpOut, []);
    assert.ok(libre.qhOut.some((h) => h.c === "c-h2"), "al desfijar, la casa de hábito vuelve");
  });

  it("1.3.246: las fijas se validan contra la Estructura viva y su signo sale de los recibos", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-visible", "Visible", 1, { group: "variable", role: "", subs: [named("s-ok", "Ok", 1), named("s-oculta", "Oculta", 2, { hidden: true })] }),
      named("c-oculta", "Oculta", 2, { group: "variable", role: "", hidden: true, subs: [] }),
      named("c-ahorro", "Ahorro", 3, { group: "variable", role: "savings", subs: [] }),
      named("c-nueva", "Nueva", 4, { group: "fixed", role: "", subs: [] }),
    ];
    const mk = (kind: string, categoryId: string, subId: string) =>
      ({ id: `${kind}-${categoryId}-${subId}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept: "x", amountMinor: 100, currency: "NIO", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "" }) as unknown as Line;
    st.months = { "2026-11": { lines: [mk("expense-variable", "c-visible", "s-ok")] } };
    (st.settings as unknown as { widgetPins: unknown }).widgetPins = [
      { c: "c-oculta", s: "" },        // categoría oculta → cae
      { c: "c-fantasma", s: "" },      // categoría borrada → cae
      { c: "c-ahorro", s: "" },        // Ahorros → cae
      { c: "c-visible", s: "s-oculta" }, // sub oculta → cae
      { c: "c-visible", s: "s-borrada" }, // sub borrada → cae
      { c: "c-visible", s: "s-ok" },   // la única sana
      { c: "c-nueva", s: "" },         // sin recibos todavía: vive en las dos tarjetas
    ];
    const pins = quickPins(st, "es");
    assert.deepEqual(pins.out, [{ c: "c-visible", s: "s-ok", n: "Visible · Ok" }, { c: "c-nueva", s: "", n: "Nueva" }]);
    assert.deepEqual(pins.inn, [{ c: "c-nueva", s: "", n: "Nueva" }]);
    // El signo derivado: solo gastos → [out]; de ambos → las dos; de ninguno → las dos.
    assert.deepEqual(pinSigns(st, { c: "c-visible", s: "s-ok" }), ["out"]);
    st.months["2026-11"].lines.push(mk("income-variable", "c-visible", ""));
    assert.deepEqual(pinSigns(st, { c: "c-visible", s: "" }), ["in", "out"]);
    assert.deepEqual(pinSigns(st, { c: "c-nueva", s: "" }), ["in", "out"]);
    // Fijar/desfijar: la lista es el orden de fijado y no duplica pares.
    assert.deepEqual(toggleWidgetPin(undefined, "c-a", ""), [{ c: "c-a", s: "" }]);
    assert.deepEqual(toggleWidgetPin([{ c: "c-a", s: "" }], "c-b", "s-1"), [{ c: "c-a", s: "" }, { c: "c-b", s: "s-1" }]);
    assert.deepEqual(toggleWidgetPin([{ c: "c-a", s: "" }], "c-a", ""), []);
  });

  it("1.3.246: el concepto del apunte — sus palabras o el genérico, nunca otra cosa", () => {
    // El parseo normaliza: una línea, espacios colapsados, techo de 120; vacío = ausente.
    const parsed = parseQuickEntries(JSON.stringify([
      { ...GOOD, id: "q-11111111-aa", concept: "  gasolina\n  del  carro " },
      { ...GOOD, id: "q-22222222-bb", concept: "   " },
      { ...GOOD, id: "q-33333333-cc", concept: "x".repeat(200) },
      { ...GOOD, id: "q-44444444-dd", concept: 42 },
    ]));
    assert.equal(parsed[0]?.concept, "gasolina del carro");
    assert.ok(!("concept" in (parsed[1] ?? {})), "el concepto vacío no viaja");
    assert.equal(parsed[2]?.concept?.length, 120);
    assert.ok(!("concept" in (parsed[3] ?? {})), "un concepto que no es texto no viaja");
    // La línea lleva SUS palabras como concepto; sin ellas, el genérico de siempre.
    const suya = quickLine({ ...GOOD, concept: "almuerzo" }, "es");
    assert.equal(suya.concept, "almuerzo");
    assert.equal(suya.note, "Widget"); // la procedencia no se toca
    assert.equal(quickLine(GOOD, "es").concept, "Apunte rápido");
    const filed = ingestQuick(blank(), [{ ...GOOD, id: "q-55555555-ee", concept: "el mandado" }], "es")
      .months["2026-10"]?.lines[0];
    assert.equal(filed?.concept, "el mandado");
  });

  it("1.3.246: la sugerencia al clasificar — la moda de su historial, con sus umbrales", () => {
    const st = blank();
    const named = (id: string, customName: string, order: number, extra: object = {}) =>
      ({ id, nameKey: "", customName, icon: "", hidden: false, order, ...extra });
    (st.structure as unknown as { categories: unknown[] }).categories = [
      named("c-trans", "Transporte", 1, { group: "variable", role: "", subs: [named("s-gas", "Gasolina", 1)] }),
      named("c-comida", "Comida", 2, { group: "variable", role: "", subs: [] }),
      named("c-casa", "Casa", 3, { group: "fixed", role: "", subs: [] }),
    ];
    const mk = (kind: string, concept: string, categoryId: string, subId: string, extra: object = {}) =>
      ({ id: `${kind}-${concept}-${Math.random()}`, seriesId: "x", monthKey: "2026-11", kind, concept, amountMinor: 100, currency: "NIO", active: true, note: "", categoryId, subId, recurring: false, cadence: "", nextDue: "", color: "", icon: "", ...extra }) as unknown as Line;
    st.months = { "2026-11": { lines: [
      mk("expense-variable", "Gasolina", "c-trans", "s-gas"),
      mk("expense-variable", " gasolina ", "c-trans", "s-gas"), // coincide sin mayúsculas ni espacios
      mk("expense-variable", "gasolina", "c-comida", ""),       // 2 de 3 para Transporte: 66 % ≥ 60 %
      mk("expense-variable", "taxi", "c-trans", ""),            // un solo voto: no basta
      mk("expense-variable", "cine", "c-comida", ""),
      mk("expense-variable", "cine", "c-casa", ""),             // empate 1-1: la moda no manda
      mk("income-variable", "gasolina", "c-comida", ""),        // otro signo: no vota para gastos
      mk("expense-variable", "gasolina", "c-casa", "", { rest: true }), // apartada: no vota
      mk("expense-fixed", "renta", "c-casa", ""),
      mk("expense-fixed", "renta", "c-casa", ""),
    ] } };
    assert.deepEqual(suggestHome(st, "GASOLINA", "out"), { c: "c-trans", s: "s-gas" });
    assert.equal(suggestHome(st, "taxi", "out"), null);       // menos de 2 votos
    assert.equal(suggestHome(st, "cine", "out"), null);       // sin mayoría del 60 %
    assert.equal(suggestHome(st, "nada", "out"), null);       // sin historial
    // Con grupo, solo votan las de ese grupo: «renta» es de fijos y manda ahí; en variables, nada.
    assert.deepEqual(suggestHome(st, "renta", "out", "fixed"), { c: "c-casa", s: "" });
    assert.equal(suggestHome(st, "renta", "out", "variable"), null);
    assert.equal(suggestHome(st, "gasolina", "in"), null);    // para ingresos solo hay un voto: no basta
  });

  it("1.3.246: el shell — las fijas primero con su marca, la nota tras su ícono y el anuncio sin fijas", () => {
    const root = process.cwd();
    const quick = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/QuickAdd.kt"), "utf8");
    const widgets = fs.readFileSync(path.join(root, "android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt"), "utf8");
    // La foto trae las fijas y el shell las lee con las casas.
    assert.ok(widgets.includes("\"qpIn\"") && widgets.includes("\"qpOut\""), "el shell lee las fijas de la foto");
    assert.match(widgets, /val qpIn: List<QHome> = emptyList\(\)/);
    // La lista de la tarjeta: fijas primero — la misma fila de 48dp, la misma geometría —
    // y solo la marca discreta las distingue (ley de espacio de Oscar: nada más grande).
    // RE-FIJADO en 1.3.251: la fila ahora lleva su CLASE (0 hábito, 1 fija de categoría,
    // 2 fija del catálogo) porque la lista creció una familia — la geometría no cambió.
    assert.match(quick, /val pins = if \(sign == "in"\) snap\.qpIn else snap\.qpOut/);
    assert.match(quick, /val rows = pins\.map \{ it to 1 \} \+ storePins\.map \{ it to 2 \} \+ homes\.map \{ it to 0 \}/,
      "una sola lista: fijas de categoría, fijas del catálogo y hábito comparten fila");
    assert.match(quick, /private fun pinMark\(\): Drawable/, "la marca de fija existe como dibujo propio");
    assert.match(quick, /if \(kind > 0\) pinMark\(\) else null, null\)/,
      "la marca de fija cuelga del extremo de la fila, sin tocar su geometría");
    // Sin fijas, la sección anuncia dónde viven (su principio: lo que no se anuncia no
    // existe); con fijas, la línea no existe.
    // RE-FIJADO en 1.3.251: la frase es la que Oscar acortó con su orden de la foto
    // 234813 (una sola línea, letra menor) — la tarjeta ya dice Faro en su título.
    assert.ok(quick.includes("Fija tus categorías en el editor de cada categoría."));
    assert.ok(quick.includes("Pin your categories in each category's editor."));
    assert.match(quick, /if \(pins\.isEmpty\(\)\)/, "el anuncio solo vive sin fijas");
    // La nota: un ícono la abre; el campo es una línea con su pregunta impresa como hint,
    // mayúscula de frase y techo de 60; el concepto viaja SOLO si escribió algo.
    assert.match(quick, /private fun noteIconDrawable\(color: Int\): Drawable/, "el ícono de la nota se dibuja en código");
    assert.ok(quick.includes("¿Qué fue?") && quick.includes("What was it?"), "el campo pregunta «¿Qué fue?»");
    assert.match(quick, /LengthFilter\(60\)/, "el concepto de la tarjeta tiene techo de 60");
    assert.match(quick, /TYPE_TEXT_FLAG_CAP_SENTENCES/, "mayúscula de frase");
    assert.match(quick, /if \(concept\.isNotEmpty\(\)\) entry\.put\("concept", concept\)/,
      "sin palabras, el apunte no lleva concepto (el genérico sigue mandando)");
  });
});
