/**
 * FARO — OLA 14 DE PREJUICIOS contra los tres modos: la cura y sus pines.
 *
 * La ola cazó en cuatro frentes y un hueco: el Asesor sumaba el apartado
 * como gasto en dos casas gemelas que la cura 13 no alcanzó (A1: los
 * totales de persona; A2: el cuarto del plan) y la CÁSCARA NATIVA vivía
 * fuera de todo censo (A3: el aviso de ritmo decidía «Ya gastaste» con
 * la suma ancha; A4: la barra héroe del widget se llenaba con otra
 * cifra que su texto); el Guardián cazó un fantasma que MIENTE (G14-5:
 * el anuncio de guardado no distinguía archivado de destruido), una
 * composición desde la foto en el editor de catálogo (G14-4) y los
 * escritores de línea entera fuera de line-form.tsx (G14-6); Cambios,
 * una confirmación que decidía con las premisas de AYER (BR14-1: la
 * llegada de otra pestaña adoptada en la misma tarea no refrescaba el
 * cierre del manejador). Las cercas de la ola (la obediencia, no la
 * forma) viven en modos-ola9/11/12; aquí se clavan las caras curadas:
 * a nivel de función donde la función existe, y de fuente donde la
 * conducta vive en un componente o en la cáscara.
 * Los libros son especímenes fijados a mano; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";

import { cardExistence, dropCard, putCard, storedCards } from "./cards.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { buildBudget, studyBoard, summarize } from "./engine.ts";
import { peopleAdvice, personTotals } from "./people.ts";
import { patchLine, patchLineWith } from "./reducer.ts";
import { buildWidgetSnapshot } from "./widget.ts";
import type { CreditCard, LedgerState, Line, Person } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

let seq = 0;
const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }, key: string): Line => {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: key, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
};
const book = (months: Record<string, Line[]>, people: Person[] = []): LedgerState => {
  const b = createInitial("es", "claro");
  b.settings.mode = "completo";
  b.people = people;
  for (const [k, lines] of Object.entries(months)) b.months[k] = { lines };
  return b;
};
const AHORRO = { categoryId: "f-ahorro", subId: "f.ahorro.meta" };

/* ═══════════ §A · ASESOR A1/A2: LAS CASAS GEMELOS DEL PREDICADO ═════ */
describe("ola14 · §A: el apartado no se suma como dado ni sobra dos veces (A1/A2)", () => {
  it("A1 · personTotals solo suma lo DADO: el apartado etiquetado de Ana no nace como regalo", () => {
    const ana: Person = { id: "ana", name: "Ana", birthday: "1990-12-25", note: "", dates: [] } as Person;
    const b = book({
      "2025-12": [line({ kind: "expense-variable", concept: "Apartado cumpleaños Ana", amountMinor: 500_000, personId: "ana", occasionId: "birthday", ...AHORRO }, "2025-12")],
    }, [ana]);
    const t = personTotals(b, ana, b.settings.display, b.settings.rateE4);
    assert.equal(t.total, 0, "el total dado es C$0: lo apartado se muestra como apartado, nunca sumado a lo dado");
    assert.equal(t.count, 0, "y no cuenta como ocasión dada");
    const a = peopleAdvice(b, b.settings.display, b.settings.rateE4, "2026-12-10", "es");
    assert.ok(!a || a.last === 0, "el consejo no nace del apartado: nada de «el cumpleaños pasado le diste C$5,000»");
    // control: un regalo de verdad SÍ suma
    const b2 = book({
      "2025-12": [line({ kind: "expense-variable", concept: "Regalo Ana", amountMinor: 200_000, personId: "ana", occasionId: "birthday", categoryId: "f-ocio" }, "2025-12")],
    }, [ana]);
    assert.equal(personTotals(b2, ana, b2.settings.display, b2.settings.rateE4).total, 200_000, "lo dado de verdad sigue sumando");
  });
  it("A1 · la fuente: occasionYear y personTotals filtran por isSpendLine; personLines no se amputa", () => {
    const src = SRC("./people.ts");
    assert.match(src, /personLines\(state, person\.id\)\.filter\(\(line\) => isSpendLine\(state\.structure, line\)\)/);
    const oy = src.slice(src.indexOf("function occasionYear"), src.indexOf("export function peopleAdvice"));
    assert.match(oy, /isSpendLine\(state\.structure, line\)/, "el año de la ocasión juzga con el mismo predicado");
  });
  it("A2 · el cuarto del plan debita el flujo del apartado: «Sobran C$2,700» en el Libro Mentira", () => {
    const K = "2026-11";
    const b = book({
      [K]: [
        line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }, K),
        line({ kind: "expense-fixed", concept: "Renta", amountMinor: 800_000, categoryId: "f-casa" }, K),
        line({ kind: "expense-variable", concept: "Mercado", amountMinor: 430_000, categoryId: "f-comida" }, K),
        line({ kind: "expense-variable", concept: "Apartado", amountMinor: 1_500_000, ...AHORRO }, K),
      ],
    });
    const plan = buildBudget(b, K, "es", makeNamer(b.structure, "es"));
    assert.equal(plan.room, 700_000, "el cuarto excluye lo apartado y lo que aún se debe a la meta");
    assert.match(plan.note, /Sobran C\$2,700\.00/, "la nota del plan imprime lo que de verdad sobra");
    const board = studyBoard(b, K, "es", makeNamer(b.structure, "es"));
    const env = board.envelopes.find((e) => e.name === "Día a día");
    assert.equal(env?.budget, 700_000, "el Estudio lee el mismo cuarto: una sola cifra del plan en las dos casas");
  });
});

/* ═══════════ §B · ASESOR A3/A4: LA CÁSCARA ENTRA AL CENSO ════════════ */
describe("ola14 · §B: la cáscara decide y pinta con la cifra del gasto (A3/A4)", () => {
  it("A3 · la foto lleva el gasto verdadero: spent = s.spend y spend − spent = savingsFlow", () => {
    const K = "2026-11";
    const b = book({
      [K]: [
        line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 }, K),
        line({ kind: "expense-variable", concept: "Mercado", amountMinor: 430_000, categoryId: "f-comida" }, K),
        line({ kind: "expense-variable", concept: "Apartado", amountMinor: 1_500_000, ...AHORRO }, K),
      ],
    });
    const s = summarize(b, K, "es");
    const snap = buildWidgetSnapshot(b, "es", { today: "2026-11-19", hide: false, lock: false });
    assert.equal(snap.spent, s.spend, "spent es el gasto verdadero del motor");
    assert.equal(snap.spend - snap.spent, s.savingsFlow, "la identidad de la foto: lo ancho menos lo gastado es el apartado, siempre");
    assert.equal(snap.usedPct, Math.round(s.spentPct!), "usedPct sigue siendo spentPct: el texto y la barra cuentan la misma cifra");
  });
  it("A3 · checkPace decide el hecho con el gasto y nombra el apartado cuando es lo que cruza", () => {
    const kt = SRC("../../../android/app/src/main/java/com/oscarvelz/faro/FaroNotify.kt");
    assert.match(kt, /val bad = s\.spent >= s\.have/, "el hecho «Ya gastaste» se juzga con spent, no con la suma ancha");
    assert.match(kt, /val wideCross = s\.spend >= s\.have/, "el cruce ancho se pregunta aparte");
    assert.match(kt, /Eso es guardar, no gastar/, "y cuando lo que cruza es el apartado, el aviso lo nombra: guardar, no gastar");
    assert.match(kt, /lo que cruza es apartado, no gasto/, "la variante sin cifras dice la misma verdad");
    assert.ok(!/val bad = s\.spend >= s\.have/.test(kt), "la decisión vieja (la suma ancha como gasto) no vuelve");
  });
  it("A4 · la barra héroe del widget se llena con la misma cifra que su texto", () => {
    const kt = SRC("../../../android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt");
    assert.match(kt, /val used = if \(s\.have <= 0\) \(if \(s\.spent > 0\) 1000 else 0\) else pct\(s\.spent, s\.have\)/,
      "la barra es pct(spent, have): la cifra de usedPct, no la de la lente ancha");
  });
  /* EL CENSO DE LA CÁSCARA: toda superficie nativa que imprime una cifra
   * de dinero nombra su productor y su clase en este registro. Una cifra
   * nueva sin productor declarado acusa — la cáscara ya no vive fuera. */
  const SUPERFICIES_CASCARA: [RegExp, string, string][] = [
    // [patrón de la llamada, productor en la foto, clase]
    [/money\(s, s\.spent\)|Fmt\.money\(s\.spent,/, "spent ← summarize.spend", "gasto"],
    [/money\(s, s\.spend\)|Fmt\.money\(s\.spend,/, "spend ← summarize.expense (la lente «Gastaré»)", "ancha nombrada"],
    [/Fmt\.money\(s\.savedOut,/, "savedOut ← spend − spent (derivado en la cáscara)", "apartado"],
    [/money\(s, s\.have\)|Fmt\.money\(s\.have,/, "have ← summarize.income", "ingreso"],
    [/money\(s, s\.left\)/, "left ← la foto (have − spend de la lente ancha, nombrada en su cara)", "derivado"],
    [/money\(s, s\.owed\)|money\(s, s\.owe\)/, "owed/owe ← saldos de Cobros de la foto", "saldo"],
    [/money\(s, s\.pay\)/, "pay ← por pagar de la foto", "saldo"],
    [/money\(s, s\.saveTotal\)|money\(s, s\.saveMonth\)|Fmt\.money\(s\.saveMonth,|Fmt\.money\(s\.saveGoal,/, "save* ← savingsOf de la foto", "ahorro"],
    [/Fmt\.money\(pace\.projected,|Fmt\.money\(pace\.income,|Fmt\.money\(pace\.spent,|Fmt\.money\(pace\.expected,/, "pace.* ← el bloque del Patrón de la foto (sobre el gasto)", "gasto proyectado"],
    [/Fmt\.money\(projected,/, "projected ← la recta del respaldo, desde spent", "gasto proyectado"],
    [/Fmt\.money\(f\.inn,|Fmt\.money\(f\.out,|Fmt\.money\(left,/, "f.* / left ← el flujo del aviso de cierre", "flujo"],
    [/Fmt\.money\(it,|money\(s, it\)|money\(s, [a-z]\.amt\)|amt\?\.let \{ Fmt\.money\(it|amt\?\.let \{ money\(s, it\)|Fmt\.money\(minor,/, "amt/minor ← el monto de la fila/vencimiento que la superficie recibió", "monto de fila"],
    [/Fmt\.money\(s\.rateE4,/, "rateE4 ← la tasa de la foto", "tasa"],
    [/money\(s, total\)/, "total ← la suma de vencimientos en la cáscara", "suma de filas"],
    [/Fmt\.money\(s\.owed - s\.owe,/, "owed − owe ← el neto de Cobros", "derivado"],
  ];
  /* Ola 15 (Asesor): el censo camina el PAQUETE ENTERO y juzga toda
   * forma de imprimir una cifra. La primera vida del censo cazaba por
   * enumeración — dos archivos nombrados y una sola forma de llamada —
   * y la caza lo probó: una cifra en QuickAdd.kt (M15-2) y una
   * interpolación cruda dentro del propio FaroWidgets.kt (M15-3)
   * corrían verdes. Ahora el universo es el directorio, las formas son
   * tres (llamadas a formateadores, interpolaciones crudas de campos
   * de dinero de la foto dentro de cadenas, y String.format con
   * marcador numérico sobre un campo de dinero) y el escaneo retira
   * los comentarios antes de juzgar (una mención money() en un
   * comentario ya no acusa en falso). El dinero se imprime por los
   * formateadores — es lo que hace su productor declarable: una
   * interpolación cruda de un campo de dinero no tiene productor que
   * declarar y acusa siempre. Los porcentajes de la foto (usedPct) no
   * son cifras de dinero y no entran. */
  const scanKt = (kt: string): { code: string; literals: string[] } => {
    let out = "";
    const literals: string[] = [];
    let i = 0;
    const n = kt.length;
    while (i < n) {
      const c = kt[i]!, d = kt[i + 1] ?? "";
      if (c === "/" && d === "/") { while (i < n && kt[i] !== "\n") { out += " "; i++; } continue; }
      if (c === "/" && d === "*") {
        out += "  "; i += 2;
        while (i < n && !(kt[i] === "*" && kt[i + 1] === "/")) { out += kt[i] === "\n" ? "\n" : " "; i++; }
        if (i < n) { out += "  "; i += 2; }
        continue;
      }
      if (c === '"') {
        let lit = "";
        out += c; i++;
        while (i < n && kt[i] !== '"') {
          if (kt[i] === "\\") { lit += kt[i]! + (kt[i + 1] ?? ""); out += kt[i]! + (kt[i + 1] ?? ""); i += 2; continue; }
          lit += kt[i]; out += kt[i]; i++;
        }
        if (i < n) { out += '"'; i++; }
        literals.push(lit);
        continue;
      }
      if (c === "'") {
        out += c; i++;
        while (i < n && kt[i] !== "'" && kt[i] !== "\n") {
          if (kt[i] === "\\") { out += kt[i]! + (kt[i + 1] ?? ""); i += 2; continue; }
          out += kt[i]; i++;
        }
        if (i < n && kt[i] === "'") { out += "'"; i++; }
        continue;
      }
      out += c; i++;
    }
    return { code: out, literals };
  };
  const DINERO_RE = /\b(?:s|pace|f)\.(?:spent|spend|have|left|pay|saveMonth|saveGoal|saveTotal|owed|owe|rateE4|savedOut|expected|projected|income|inn|out)\b/;
  const censoCascara = (files: { name: string; text: string }[]): string[] => {
    const acusadas: string[] = [];
    for (const { name, text } of files) {
      const { code, literals } = scanKt(text);
      // forma 1: llamadas a formateadores — cada una nombra su productor
      for (const m of code.matchAll(/(?:Fmt\.money|money)\(([^)]*)\)/g)) {
        if (m[1]!.includes(":")) continue; // las declaraciones de Fmt.money/money llevan tipos (minor: Long): no son superficies
        if (!SUPERFICIES_CASCARA.some(([re]) => re.test(m[0]))) acusadas.push(`${name}: ${m[0].slice(0, 70)}`);
      }
      // forma 2: interpolaciones crudas de campos de dinero dentro de cadenas
      for (const lit of literals) {
        for (const m of lit.matchAll(/\$\{([^}]*)\}|\$([A-Za-z_][\w.]*)/g)) {
          const expr = m[1] ?? m[2] ?? "";
          if (/(?:Fmt\.)?money\(/.test(expr)) continue; // la cifra la produce el formateador: la juzga la forma 1
          if (DINERO_RE.test(expr)) acusadas.push(`${name}: interpolación cruda de una cifra: «${lit.slice(0, 60)}»`);
        }
      }
      // forma 3: String.format con marcador numérico sobre un campo de dinero
      for (const m of code.matchAll(/String\.format\(/g)) {
        let depth = 0, j = m.index + m[0].length - 1;
        const start = j;
        for (; j < code.length; j++) {
          if (code[j] === "(") depth++;
          else if (code[j] === ")") { depth--; if (depth === 0) break; }
        }
        const call = code.slice(start, j + 1);
        if (/%[\d,.]*[df]/.test(call) && DINERO_RE.test(call)) acusadas.push(`${name}: String.format sobre una cifra: «${call.slice(0, 60)}»`);
      }
    }
    return acusadas;
  };
  it("el censo de la cáscara: ninguna cifra nativa sin productor ni clase declarados, en todo el paquete y en cualquier forma", () => {
    const dir = new URL("../../../android/app/src/main/java/com/oscarvelz/faro/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".kt")).map((name) => ({ name, text: readFileSync(new URL(name, dir), "utf8") }));
    assert.ok(files.length >= 5, "el universo es el directorio entero, no una lista escrita a mano");
    assert.deepEqual(censoCascara(files), [], "cifras sin productor declarado");
  });
  it("especímenes M15: el control acusa dentro del perímetro viejo, y los dos escapes de la ola acusan en el nuevo", () => {
    // M15-1 (control): una cifra con productor no declarado dentro de FaroNotify acusa
    const m1 = censoCascara([{ name: "FaroNotify.kt", text: "class X { fun a(s: Snap) = Fmt.money(s.owed - s.spent, s.cur) }" }]);
    assert.equal(m1.length, 1, "M15-1: el perímetro funciona — la cifra sin productor acusa");
    // M15-2: la misma cifra sin productor, plantada en un archivo que el censo viejo ni caminaba
    const m2 = censoCascara([{ name: "QuickAdd.kt", text: "class Q { fun a(s: Snap) = Fmt.money(s.owed - s.spent, s.cur) }" }]);
    assert.equal(m2.length, 1, "M15-2: el universo es el paquete — QuickAdd ya no es invisible");
    // M15-3: la cifra impresa por interpolación cruda dentro del archivo vigilado
    const m3 = censoCascara([{ name: "FaroWidgets.kt", text: "class W { fun a(s: Snap) = \"−C$${s.spend / 100}\" }" }]);
    assert.equal(m3.length, 1, "M15-3: la forma nueva acusa — la interpolación cruda no tiene productor");
    // y String.format sobre un campo de dinero, la tercera forma
    const m4 = censoCascara([{ name: "FaroWidgets.kt", text: "class W { fun a(s: Snap) = String.format(Locale.US, \"%.2f\", s.spent / 100.0) }" }]);
    assert.equal(m4.length, 1, "String.format con marcador numérico sobre la foto acusa");
  });
  it("controles del censo nuevo: el comentario no acusa, el porcentaje no es dinero, la fecha no es cifra", () => {
    const ok = censoCascara([{ name: "FaroNotify.kt", text: [
      "class N {",
      "  // una mención en un comentario: Fmt.money(s.owed - s.spent, s.cur) no es una superficie",
      "  fun a(s: Snap) = \"${s.usedPct}%\"",
      "  fun b() = String.format(Locale.US, \"%04d-%02d\", 2026, 11)",
      "}",
    ].join("\n") }]);
    assert.deepEqual(ok, [], "ni el comentario, ni el porcentaje de la foto, ni el formato de fecha acusan");
  });
});

/* ═══════════ §C · GUARDIÁN: EL FANTASMA, EL PLAN Y LOS PARCHES ═══════ */
describe("ola14 · §C: la existencia en tres estados y la composición contra lo vivo (G14-5/4/6)", () => {
  const card = (id: string, preset?: string): CreditCard => ({
    id, name: "Banco", issuer: "", mark: "", color: "#079ed9", last4: "1234", currency: "USD",
    limitMinor: null, dueDay: 0, aprBps: 0, autopay: null, rewards: "", snaps: [], ...(preset ? { preset } : {}),
  } as CreditCard);
  it("G14-5 · cardExistence distingue vivo, archivado y destruido — una sola pregunta", () => {
    let s = createInitial("es", "claro");
    s = putCard(s, card("cc-viva", "p-viva"));
    assert.equal(cardExistence(s, "cc-viva"), "alive", "la que vive, vive");
    // con historial: «Empezar de cero» ARCHIVA — el anuncio debe decirlo
    const conHistoria = { ...card("cc-arch", "p-arch"), snaps: [{ on: "2026-11-01", at: "2026-11-01T10:00:00.000Z", balanceMinor: 100, src: "manual" } as CreditCard["snaps"][number]] };
    s = putCard(s, conHistoria);
    s = dropCard(s, "cc-arch");
    assert.equal(storedCards(s).find((c) => c.id === "cc-arch")?.archived, true, "el hecho: dropCard con historial archiva");
    assert.equal(cardExistence(s, "cc-arch"), "archived", "y la pregunta lo dice: archivado, no destruido");
    // sin historial ni registro: destruido
    s = putCard(s, card("cc-fugaz", "p-fugaz"));
    s = dropCard(s, "cc-fugaz");
    assert.equal(cardExistence(s, "cc-fugaz"), "gone", "sin registro en ninguna lista: destruido");
    assert.equal(cardExistence(s, "cc-nunca"), "gone");
    assert.equal(cardExistence(null, "cc-viva"), "gone", "sin libro no hay existencia que anunciar");
  });
  it("G14-5 · la forma pregunta con cardExistence en save() y dentro del commit; restaurar tiene su salida nombrada", () => {
    const src = SRC("../../components/faro/cards.tsx");
    const seg = src.slice(src.indexOf("function CardForm"), src.indexOf("const ISS"));
    assert.match(seg, /cardExistence\(session\?\.ledger, bornId\)/, "save() pregunta al libro, no a la prop del render");
    assert.match(seg, /cardExistence\(s, bornId\)/, "el commit pregunta dentro de su propio actualizador");
    // ENMIENDA OLA 15 (G15-3): el retorno intacto ahora deja primero su
    // veredicto en saveVerdict — la doctrina clavada no cambia (lo
    // destruido devuelve el estado intacto); lo que la ola 15 cierra es
    // el silencio DESPUÉS del retorno: el efecto anuncia el estado nuevo.
    assert.match(seg, /if \(existence === "gone"\) \{ saveVerdict\.current = \{ applied: false, existence \}; return s; \}/, "destruido: el commit devuelve el estado intacto (y deja su veredicto)");
    assert.match(seg, /data-anchor="card-form-restore-save"|card-form-restore-save/, "la salida de restaurar-y-guardar existe y se nombra");
    assert.ok(seg.includes("se archivó mientras la editabas"), "el anuncio del archivado dice la verdad en ES");
    assert.ok(seg.includes("was archived while you were editing it"), "y en EN");
  });
  it("G14-4 · savePlan compone desde la pieza viva dentro del commit, como saveRename", () => {
    const src = SRC("../../components/faro/screens.tsx");
    const seg = src.slice(src.indexOf("const savePlan"), src.indexOf("const savePlan") + 1600);
    assert.match(seg, /catalog\.map\(\(c\) => \{[\s\S]*?updated = \{ \.\.\.c, ins: r\.plan, bens/,
      "updated nace de la pieza viva c dentro del map del commit — el renombre cruzado de otra pestaña sobrevive");
    assert.match(seg, /if \(!updated\) return s;/, "la pieza que ya no vive no se resucita: estado intacto");
    assert.ok(!/\{ \.\.\.item, ins: r\.plan/.test(seg), "la composición desde la foto del render no vuelve");
  });
  it("G14-6 · patchLine compone contra lo vivo: el cruce sobrevive, el ausente no resucita", () => {
    const K = "2026-11";
    const base = book({ [K]: [line({ kind: "expense-variable", concept: "Nombre de A", amountMinor: 100_00, categoryId: "f-comida" }, K)] });
    const id = base.months[K]!.lines[0]!.id;
    // B renombró la línea en su pestaña (el estado vivo ya lleva su nombre)
    const vivo = patchLine(base, id, { concept: "Nombre de B" });
    // A cambia SOLO el color desde su foto vieja: el parche no toca el concepto
    const tras = patchLine(vivo, id, { color: "#123456" } as Partial<Line>);
    const l = tras.months[K]!.lines[0]!;
    assert.equal(l.concept, "Nombre de B", "el campo que el parche no nombra se lee de lo vivo");
    assert.equal((l as { color?: string }).color, "#123456", "y el campo parchado aterriza");
    // patchLineWith lee la línea viva para componer (el historial se anexa a lo vivo)
    const tras2 = patchLineWith(tras, id, (live) => ({ history: [...live.history, { at: "2026-11-19", note: "uso" } as unknown as Line["history"][number]] }));
    assert.equal(tras2.months[K]!.lines[0]!.history.length, 1);
    assert.equal(tras2.months[K]!.lines[0]!.concept, "Nombre de B", "la anexión tampoco pisa el cruce");
    // ausente: el estado vuelve intacto, jamás una línea resucitada
    assert.equal(patchLine(tras, "l-inexistente", { concept: "X" }), tras, "id ausente → el mismo estado");
  });
});

/* ═══════════ §D · CAMBIOS BR14-1: LA CONFIRMACIÓN DECIDE EN VIVO ════ */
describe("ola14 · §D: la confirmación compara sus premisas contra el estado vivo (BR14-1)", () => {
  const src = SRC("../../components/faro/screens.tsx");
  const seg = src.slice(src.indexOf("const applyModeConfirmed"), src.indexOf("const applyModeConfirmed") + 5200);
  it("la receta relee el modo dentro del actualizador del propio commit", () => {
    assert.match(seg, /const liveNow = modeOf\(s\.settings\);/, "la premisa se lee de s, el estado que el commit está escribiendo — no del cierre del render");
    assert.match(seg, /if \(liveNow === ctx\.target\) \{[\s\S]*?"already"[\s\S]*?return s;/, "si la llegada ya aplicó el objetivo, la confirmación calla y no toca nada");
    assert.match(seg, /if \(liveNow !== ctx\.live\) \{[\s\S]*?"moved"[\s\S]*?return s;/, "si las premisas se movieron, la confirmación NO aplica: devuelve el estado intacto");
    assert.match(seg, /"recount"/, "y si el impacto se movió, convierte a recuento fresco en vez de aplicar");
  });
  it("los dos onConfirm enrutan su aplicación por la receta viva", () => {
    const calls = src.match(/applyModeConfirmed\(\{/g) ?? [];
    assert.ok(calls.length >= 3, `las aplicaciones de los dos diálogos pasan por applyModeConfirmed (${calls.length} sitios: impacto ×2, re-planteado ×2 contando la definición de tipos)`);
    assert.match(src, /const v = confirmVerdict\.current;/, "el veredicto viaja por el canal del detalle y un efecto anuncia o re-plantea");
  });
});
