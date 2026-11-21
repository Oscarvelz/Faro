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
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  const SUPERFICIES_CASCARA: [RegExp, string, string, string?][] = [
    // [patrón de la llamada, productor en la foto, clase, sitio (archivo) si la entrada lo declara]
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
    // OLA 16 (Asesor): la entrada de la tasa nombra su llamada VIVA —
    // la superficie de la tasa es Fmt.rate(s.rateE4) (FaroWidgets.kt:575);
    // la entrada vieja nombraba Fmt.money y el censo juzgaba la tasa por
    // una forma que la cara no usa. La llamada con Fmt.money es el
    // ejemplo «US$100 = …» de la línea 579: las dos nombran su sitio.
    // OLA 17 (Asesor M17-7): el sitio deja de ser prosa — es el cuarto
    // campo de la entrada y la cerca lo VERIFICA: una entrada con sitio
    // cuya llamada ya no vive en ese archivo acusa como superficie
    // muerta, y la llamada se juzga sobre su texto RESUELTO por las
    // ataduras (Fmt.rate(r4) con r4 = s.rateE4 ES esta llamada).
    [/Fmt\.rate\(s\.rateE4\)/, "rateE4 ← la tasa de la foto, por Fmt.rate (FaroWidgets.kt:575)", "tasa", "FaroWidgets.kt"],
    [/Fmt\.money\(s\.rateE4,/, "rateE4 ← la tasa leída como monto en el ejemplo «US$100 = …» (FaroWidgets.kt:579)", "tasa", "FaroWidgets.kt"],
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
  /* OLA 16 (Asesor): el censo, TERCERA VIDA — por CONSTRUCCIÓN, no por
   * enumeración. La segunda vida caminaba el directorio pero seguía
   * cazando por listas escritas a mano un piso más abajo: los nombres
   * de los formateadores (Fmt.rate escapaba: M16-2), los nombres de
   * los receptores (s|pace|f: un receptor llamado foto escapaba,
   * M16-7), la grafía del campo (un local renombrado, un ayudante que
   * compone, escapaban: M16-6/M16-8) y tres formas de imprimir
   * (StringBuilder, DecimalFormat local, String.format por extensión,
   * el log: M16-3/4/5/9) — y el universo era plano (un subdirectorio
   * escapaba: M16-1). Ahora el censo DERIVA su doctrina del paquete:
   *   · los campos de dinero de cada tipo de la foto son sus campos
   *     Long declarados (la tabla-semilla de abajo se verifica contra
   *     las declaraciones vivas de FaroWidgets.kt en su propio test, y
   *     toda clase declarada en los archivos escaneados entra sola);
   *   · los formateadores numéricos de Fmt son sus funciones que
   *     devuelven String con primer parámetro Long (money, rate, y el
   *     que nazca mañana) — leídos de la declaración de `object Fmt`;
   *   · un receptor es dinero por su TIPO DECLARADO (Snap/Pace/Flow/…),
   *     se llame como se llame;
   *   · el valor se sigue por punto fijo: accesos a campos de dinero,
   *     ataduras locales que derivan de ellos y ayudantes cuyo cuerpo
   *     devuelve una expresión derivada (o que entregan un parámetro a
   *     un formateador: conductos, juzgados como llamadas al
   *     formateador);
   *   · la casa del productor (el cuerpo de `object Fmt`) se retira
   *     antes de juzgar: su DecimalFormat interno ES el productor
   *     declarado;
   *   · y TODA impresión de una cifra derivada sin productor declarado
   *     acusa, en cualquier forma: llamada a formateador no registrada,
   *     interpolación cruda, String.format (clásico o por extensión),
   *     StringBuilder/append, DecimalFormat/NumberFormat local,
   *     concatenación con cadena y Log.
   * Los comentarios se retiran antes de juzgar (scanKt, ola 15 — no
   * regresar). Los porcentajes no son dinero: usedPct es Int y pct()
   * compone dos Long en un porcentaje — su resultado no deriva. */
  const CASCARA_TIPOS_SEMILLA: Record<string, string[]> = {
    Snap: ["have", "left", "owe", "owed", "pay", "rateE4", "saveGoal", "saveMonth", "saveTotal", "savedOut", "spend", "spent"],
    Pace: ["expected", "income", "projected", "spent"],
    Flow: ["inn", "out"],
    Due: ["amt"],
    Cat: ["amt", "prev"],
    Pocket: ["amt"],
  };
  const blankRegion = (code: string, start: number, open: string, close: string): string => {
    let depth = 0, i = start;
    for (; i < code.length; i++) {
      if (code[i] === open) depth++;
      else if (code[i] === close) { depth--; if (depth === 0) { i++; break; } }
    }
    return code.slice(0, start) + code.slice(start, i).replace(/[^\n]/g, " ") + code.slice(i);
  };
  const censoCascara = (files: { name: string; text: string }[], sitios = false): string[] => {
    const acusadas: string[] = [];
    // paso 0: el paquete declara su doctrina — tipos y formateadores
    const tipos = new Map<string, Set<string>>(Object.entries(CASCARA_TIPOS_SEMILLA).map(([k, v]) => [k, new Set(v)]));
    const scannedRaw = files.map(({ name, text }) => ({ name, ...scanKt(text) }));
    // OLA 17: la casa del productor se retira UNA vez, aquí, y todo el
    // censo (el paso de paquete y el juicio por archivo) trabaja sobre
    // el código ya vaciado — la verificación de sitios de la §B-17 lee
    // este mismo texto: las llamadas registradas viven fuera de Fmt.
    const scanned = scannedRaw.map(({ name, code, literals }) => {
      const fmtAt = code.search(/\bobject\s+Fmt\s*\{/);
      return { name, literals, code: fmtAt >= 0 ? blankRegion(code, fmtAt, "{", "}") : code };
    });
    // OLA 17: los tipos de PROPIEDAD de cada clase (foto: Snap dentro
    // de SobreM17) — la cadena se resuelve por la declaración, nazca
    // en el archivo que nazca (M17-6b).
    // OLA 19 (M19-5): el tipo de la propiedad se guarda CON su archivo
    // declarante — la cadena lo resuelve con los nombres de ESE archivo
    // (su alias de importación de Snap), no solo con el mapa de
    // typealias: la geometría de M18-4 con el otro mecanismo de nombre
    // en la declaración escapaba entera.
    const propTypes = new Map<string, Map<string, { w: string; fi: number }>>();
    for (const [fi, { code }] of scanned.entries()) {
      // OLA 22 (M22-2): la regex de clase admite el grupo genérico —
      // `class Caja<T>(val fmt: T)` ni siquiera casaba (el grupo
      // `<T>` rompía el patrón) y la clase entera era invisible: ni
      // sus campos Long ni el tipo de sus propiedades entraban.
      for (const m of code.matchAll(/\bclass\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g)) {
        const fields = [...m[2]!.matchAll(/\bval\s+(\w+)\s*:\s*Long\??\b/g)].map((x) => x[1]!);
        if (fields.length) tipos.set(m[1]!, new Set([...(tipos.get(m[1]!) ?? []), ...fields]));
        const props = new Map<string, { w: string; fi: number }>();
        for (const p of m[2]!.matchAll(/\bval\s+(\w+)\s*:\s*(\w+)\b/g)) props.set(p[1]!, { w: p[2]!, fi });
        if (props.size) propTypes.set(m[1]!, props);
      }
    }
    /* OLA 24 (M24-4g): LA EXPRESIÓN ENTERA DE LA PROPIEDAD — la
     * cosecha de arriba guarda el tipo de la propiedad como UNA
     * palabra (`\w+`): `caja: Caja<Fmt>` entraba como «Caja» y el
     * argumento `<Fmt>` se perdía en la cosecha misma, antes de que
     * ningún caminante pudiera sustituirlo. Aquí se cosecha, para la
     * misma declaración, la expresión completa del tipo de cada
     * propiedad del constructor — partida con su anidamiento, como
     * parseTipoExpr parte las expresiones — para que el caminante de
     * cadenas siga la expresión declarada en CADA salto, no solo en
     * la raíz. */
    const propExprs = new Map<string, Map<string, { e: string; fi: number }>>();
    for (const [fi, { code }] of scanned.entries()) {
      for (const m of code.matchAll(/\bclass\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g)) {
        const params = m[2]!;
        const exprs = new Map<string, { e: string; fi: number }>();
        for (const vm of params.matchAll(/\bval\s+(\w+)\s*:\s*/g)) {
          let i = vm.index + vm[0].length;
          let depth = 0, expr = "";
          while (i < params.length) {
            const ch = params[i]!;
            if (ch === "<") depth++;
            if (ch === ">") depth--;
            if (depth === 0 && (ch === "," || ch === ")")) break;
            expr += ch; i++;
          }
          const e = expr.trim();
          if (e) exprs.set(vm[1]!, { e, fi });
        }
        if (exprs.size) propExprs.set(m[1]!, exprs);
      }
    }
    /* OLA 22 (M22-2): EL DUEÑO GENÉRICO — los parámetros de tipo de
     * cada clase y las propiedades declaradas CON un parámetro: una
     * propiedad `fmt: T` en `class Caja<T>` no es de Fmt ni de Otro
     * en la declaración — es del ARGUMENTO con que el receptor se
     * declara en su sitio de uso (`Caja<Fmt>` la ata a Fmt;
     * `Caja<Otro>` la bloquea). El juicio por dueño (bloqueadaPor-
     * Dueno y su gemela del sitio) sustituye el argumento declarado
     * del receptor antes de juzgar. Una propiedad genérica que
     * NINGUNA clase declara jamás con un tipo que resuelva a Fmt
     * (genericOnlyProps) no juzga por su nombre desnudo donde el
     * dueño no se conoce: su nombre solo no promete el formateador. */
    const classTypeParams = new Map<string, string[]>();
    for (const { code } of scanned) {
      for (const m of code.matchAll(/\bclass\s+(\w+)\s*<([^>]*)>\s*\(/g)) {
        classTypeParams.set(m[1]!, m[2]!.split(",").map((p) => p.trim().split(/\s+/).pop()!));
      }
    }
    // (genericProps/genericOnlyProps se computan tras el resolvedor
    // compuesto, que vive unas líneas más abajo: la propiedad genérica
    // se distingue de la que alguna clase declara con tipo Fmt.)
    /* OLA 18 (Asesor): LA CAPA DE NOMBRES — la cuarta vida resolvía
     * VALORES, no NOMBRES: ninguna parte del censo leía una declaración
     * `import` ni una `typealias`, así que el alias de importación del
     * formateador (M18-1), su typealias (M18-1b), el typealias del tipo
     * foto (M18-2, que apagaba el receptor entero), el formateador
     * guardado en una propiedad (M18-3) y el typealias dentro de la
     * cadena entre archivos (M18-4) imprimían sin juicio — y la
     * verificación de sitios declaraba muerta la superficie viva
     * re-expresada por su alias (M18-5). Aquí se cosecha la capa de
     * nombres del paquete ANTES de juzgar: los typealias (resueltos en
     * cadena) y, por archivo, los alias de importación; todo juicio
     * posterior trabaja con los nombres YA resueltos — el receptor se
     * guarda por su tipo canónico y la llamada se juzga con su grafía
     * canónica «Fmt.<fn>». */
    const typealiasRaw = new Map<string, string>();
    const typealiasFile = new Map<string, number>();
    scanned.forEach(({ code }, fi) => {
      for (const m of code.matchAll(/\btypealias\s+(\w+)\s*=\s*([\w.]+)/g)) {
        typealiasRaw.set(m[1]!, m[2]!.split(".").pop()!);
        typealiasFile.set(m[1]!, fi);
      }
    });
    const importAliasesOf = (code: string): Map<string, string> => {
      const out = new Map<string, string>();
      for (const m of code.matchAll(/\bimport\s+([\w.]+)\s+as\s+(\w+)\b/g)) out.set(m[2]!, m[1]!.split(".").pop()!);
      return out;
    };
    const fileImports = scanned.map(({ code }) => importAliasesOf(code));
    // el mapa de alias de importación del PAQUETE (el primer archivo que
    // ata el nombre manda): el tercer paso de la resolución compuesta.
    const pkgImports = new Map<string, string>();
    for (const mp of fileImports) for (const [a, t] of mp) if (!pkgImports.has(a)) pkgImports.set(a, t);
    /* OLA 19 (Asesor, hallazgos 1 y 2): LA RESOLUCIÓN COMPUESTA — la
     * cura 18 componía las capas para el NOMBRE ESCRITO, nunca DENTRO
     * de la cadena: `resolveTypeName` seguía solo el mapa de typealias
     * y, cuando un eslabón aterrizaba en un nombre que era alias de
     * IMPORTACIÓN, la cadena moría un paso antes del tipo verdadero —
     * el receptor `x: Foto` con `typealias Foto = FotoBase` (FotoBase =
     * alias de Snap) imprimía en crudo 20/20 verde (M19-4), FmtCasa
     * sobre FmtBase imprimía sin productor (M19-10), y la verificación
     * de sitios declaraba muerta la superficie viva re-expresada por
     * esa misma cadena mixta (M19-8b). Aquí CADA SALTO compone: el
     * nombre se pregunta primero a los alias de importación del
     * archivo en contexto, luego a los typealias (y el contexto pasa a
     * ser el archivo que declara el typealias, porque su destino se
     * lee con los nombres de SU archivo), y por último a los alias de
     * importación de cualquier archivo del paquete — la forma de cura
     * que la propia caza escribió («un nombre que algún archivo del
     * paquete ata como alias de importación, se sigue hasta su
     * destino»). Toda resolución posterior lee solo este resolvedor. */
    /* OLA 20 (Asesor, hallazgo 4): EL TOPE SE LEVANTA, CON SU RAZÓN.
     * El resolvedor iteraba `i < 10`: una cadena de once typealias
     * corría verde (M20-9) y la de diez acusaba (M20-9c) — una
     * constante sin declarar decidía qué es el formateador. Los demás
     * resolvedores de esta misma cerca iteran a punto fijo, y las
     * cadenas de alias son texto finito: se resuelve hasta que el
     * nombre ya no se mueve, con el conjunto de visitados como guarda
     * de ciclo (una cadena que se muerde la cola se detiene en el
     * primer nombre repetido, como antes se detenía en el décimo
     * salto — pero ahora la guarda es la estructura, no un número). */
    /* OLA 21 (M21-2c): LA GUARDA DE CICLO SE CLAVA POR (NOMBRE,
     * CONTEXTO) — la guarda vieja era por nombre desnudo: una cadena
     * que aterrizaba en un nombre ya visitado EN OTRO ARCHIVO se
     * detenía un salto antes de su tipo, aunque en ese archivo el
     * nombre significara otra cosa (el sombreado por importación
     * fabricaba un ciclo falso: X en el archivo B, alias de Snap,
     * moría porque X ya se había visitado en el archivo A, donde era
     * un typealias). El par (nombre, archivo en contexto) es la
     * identidad verdadera de cada salto: la cadena se detiene solo
     * cuando vuelve al mismo nombre EN el mismo contexto, y los
     * pares son finitos, así que el punto fijo sigue terminando por
     * estructura. */
    const resolveComposed = (written: string, fi: number): string => {
      let cur = written;
      let ctx = fi;
      const seen = new Set<string>();
      while (!seen.has(`${ctx}|${cur}`)) {
        seen.add(`${ctx}|${cur}`);
        const imp = fileImports[ctx]?.get(cur);
        if (imp !== undefined) { cur = imp; continue; }
        const ta = typealiasRaw.get(cur);
        if (ta !== undefined) { ctx = typealiasFile.get(cur) ?? ctx; cur = ta; continue; }
        const pkg = pkgImports.get(cur);
        if (pkg !== undefined) { cur = pkg; continue; }
        break;
      }
      return cur;
    };
    const resolveTypeName = (n: string): string => resolveComposed(n, typealiasFile.get(n) ?? -1);
    const resolveWrittenType = (written: string, fi: number): string => resolveComposed(written, fi);
    /* OLA 22 (M22-2): las propiedades GENÉRICAS del paquete — las que
     * alguna clase declara con un parámetro de tipo por tipo — y las
     * PURAMENTE genéricas: ninguna clase las declara jamás con un
     * tipo que resuelva a Fmt. */
    const genericProps = new Set<string>();
    const fmtTypedProps22 = new Set<string>();
    for (const [clase, props] of propTypes) {
      const params = classTypeParams.get(clase);
      for (const [pn, u] of props) {
        if (params?.includes(u.w)) genericProps.add(pn);
        if (resolveComposed(u.w, u.fi) === "Fmt") fmtTypedProps22.add(pn);
      }
    }
    const genericOnlyProps = new Set([...genericProps].filter((p) => !fmtTypedProps22.has(p)));
    /* OLA 23 (M23-3b): LAS EXPRESIONES DE TIPO CON ANIDAMIENTO — la
     * captura de argumentos `<([^>]*)>` moría en el primer «>»:
     * `Caja<Caja<Fmt>>` se leía como dueño «Caja» con argumento
     * «Caja<Fmt», y la cadena c.fmt.fmt ni siquiera entraba al juicio
     * por dueño. Aquí la expresión se parte con su anidamiento (una
     * clase y sus argumentos de nivel superior, partidos por comas de
     * nivel superior), se resuelve por su cabeza en el archivo que la
     * escribe, y el juicio por dueño camina la CADENA de propiedades
     * sustituyendo el argumento en cada salto: el tipo tras una
     * propiedad cuyo tipo declarado es un parámetro es el argumento
     * del receptor — que puede ser a su vez una aplicación genérica, y
     * se vuelve a partir. Lo que muere no es un salto: es la resolución
     * del argumento compuesto, y se cura resolviéndolo. */
    const parseTipoExpr = (expr: string): { clase: string; args: string[] } => {
      const t = expr.trim().replace(/\?$/, "");
      const lt = t.indexOf("<");
      if (lt < 0) return { clase: t.split(".").pop()!, args: [] };
      const inner = t.slice(lt + 1, t.lastIndexOf(">"));
      const args: string[] = [];
      let depth = 0, cur = "";
      for (const ch of inner) {
        if (ch === "<") depth++;
        if (ch === ">") depth--;
        if (ch === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      if (cur.trim()) args.push(cur.trim());
      return { clase: t.slice(0, lt).split(".").pop()!, args };
    };
    /* OLA 24 (M24-3): EL RETORNO DECLARADO DE LAS FUNCIONES — la
     * cosecha de tipos nunca consultaba el retorno de una función,
     * aunque la mitad de valores ata fábricas desde la ola 22: un
     * argumento genérico que ES una fábrica (`Caja<MakeFmt>` con
     * `fun MakeFmt(): Fmt`) quedaba como un nombre sin resolver y la
     * cadena entera corría sin juicio. Aquí se cosecha la expresión
     * de retorno declarada de cada función del paquete, con la
     * unanimidad de la casa: un nombre es fábrica-de-un-tipo solo si
     * TODAS sus declaraciones devuelven la misma expresión (en
     * crudo, tras recortar — la grafía distinta del mismo tipo no
     * ata: la dirección segura es no resolver). El resolvedor de
     * expresiones la consulta cuando un nombre desnudo no es clase
     * ni nombre de la capa de alias: la fábrica se resuelve por su
     * retorno, en cadena y con guarda de ciclo. */
    const funReturnExprs = new Map<string, { e: string; fi: number }>();
    {
      const raw = new Map<string, { e: string; fi: number }[]>();
      scanned.forEach(({ code }, fi) => {
        for (const m of code.matchAll(/\bfun\s+(\w+)\s*\([^)]*\)\s*:\s*([A-Za-z_][\w.]*(?:\s*<[^={;]*>)?)/g)) {
          const arr = raw.get(m[1]!) ?? [];
          arr.push({ e: m[2]!.trim(), fi });
          raw.set(m[1]!, arr);
        }
      });
      for (const [n, arr] of raw) {
        const first = arr[0]!;
        if (arr.every((x) => x.e === first.e)) funReturnExprs.set(n, first);
      }
    }
    const resuelveExprTipo = (expr: string, fi: number, seen: ReadonlySet<string> = new Set()): string => {
      const p = parseTipoExpr(expr);
      // OLA 24 (M24-3): el nombre desnudo que es una FÁBRICA se
      // resuelve por el retorno declarado de la función — solo si la
      // capa de nombres no lo mueve (no es alias ni typealias) y no
      // es una clase declarada del paquete: la clase manda como tipo.
      if (!p.args.length && !seen.has(p.clase) && resolveComposed(p.clase, fi) === p.clase
        && !propTypes.has(p.clase) && !tipos.has(p.clase)) {
        const fr = funReturnExprs.get(p.clase);
        if (fr) return resuelveExprTipo(fr.e, fr.fi, new Set([...seen, p.clase]));
      }
      const head = resolveComposed(p.clase, fi);
      return p.args.length ? `${head}<${p.args.map((a) => resuelveExprTipo(a, fi, seen)).join(", ")}>` : head;
    };
    /* El juicio por dueño sobre una CADENA de receptor: el tipo del
     * primer segmento (el declarado, o la clase misma si el segmento
     * nombra una clase), caminando cada propiedad intermedia con la
     * sustitución de su clase, hasta juzgar la propiedad final con la
     * regla de siempre. Sin dueño conocido manda la regla de la
     * propiedad puramente genérica, como en el juicio de un salto. */
    const bloqueadaPorCadenaEn = (
      receivers: Map<string, string>, receiverArgs: Map<string, string[]>,
      path: string, prop: string,
    ): boolean => {
      const segs = path.split(".");
      let tipo: string | undefined = receivers.get(segs[0]!) ?? (propTypes.has(segs[0]!) ? segs[0]! : undefined);
      if (!tipo) return genericOnlyProps.has(prop);
      let args: string[] | undefined = receiverArgs.get(segs[0]!);
      for (let i = 1; i < segs.length; i++) {
        const u = propTypes.get(tipo)?.get(segs[i]!);
        if (!u) return false;
        const params = classTypeParams.get(tipo);
        if (params?.includes(u.w)) {
          const arg = args?.[params.indexOf(u.w)];
          if (arg === undefined) return true;
          const p = parseTipoExpr(arg);
          tipo = p.clase;
          args = p.args;
        } else {
          // OLA 24 (M24-4g): el salto sigue la EXPRESIÓN DECLARADA
          // ENTERA de la propiedad (propExprs), no su primera palabra:
          // `caja: Caja<Fmt>` a mitad de cadena entra a Caja CON su
          // argumento, y el parámetro de la propiedad siguiente se
          // sustituye como en la raíz. Antes este salto dejaba los
          // argumentos en undefined y la cadena moría bloqueada un
          // paso antes de su formateador.
          const pe = propExprs.get(tipo)?.get(segs[i]!);
          const p = parseTipoExpr(pe ? resuelveExprTipo(pe.e, pe.fi) : resolveComposed(u.w, u.fi));
          tipo = p.clase;
          args = p.args.length ? p.args : undefined;
        }
      }
      const u = propTypes.get(tipo)?.get(prop);
      if (!u) return false;
      const params = classTypeParams.get(tipo);
      if (params?.includes(u.w)) {
        const arg = args?.[params.indexOf(u.w)];
        return arg === undefined || arg !== "Fmt";
      }
      // OLA 24: la propiedad final también se juzga por su expresión
      // entera resuelta — su cabeza manda (una fábrica por nombre se
      // resuelve por su retorno, como en cada salto).
      const pe = propExprs.get(tipo)?.get(prop);
      return (pe ? parseTipoExpr(resuelveExprTipo(pe.e, pe.fi)).clase : resolveComposed(u.w, u.fi)) !== "Fmt";
    };
    const aliasSpellings = new Set<string>([...typealiasRaw.keys(), ...fileImports.flatMap((mp) => [...mp.keys()])]);
    const escRe18 = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    /* los nombres que EN ESTE ARCHIVO son el objeto Fmt: el suyo, sus
     * alias de importación y sus typealias — y las propiedades cuyo
     * valor atado es uno de esos nombres (el formateador guardado). */
    const fmtNamesOf = (fi: number): Set<string> => {
      const names = new Set<string>(["Fmt"]);
      // OLA 19: cada nombre se pregunta al resolvedor COMPUESTO, desde
      // el archivo que lo ata (el typealias, desde su archivo
      // declarante): FmtCasa = FmtBase con FmtBase alias de importación
      // ES un nombre del formateador (M19-10), aquí y en su sitio
      // (M19-8b).
      for (const [alias, target] of fileImports[fi] ?? []) if (resolveComposed(target, fi) === "Fmt") names.add(alias);
      for (const a of typealiasRaw.keys()) if (resolveComposed(a, typealiasFile.get(a) ?? fi) === "Fmt") names.add(a);
      return names;
    };
    /* OLA 20 (Asesor, hallazgo 1): la cosecha de propiedades itera a
     * PUNTO FIJO — `val fmtB = fmtA` con fmtA ya cosechada ES una
     * propiedad del formateador, en el mismo archivo (M20-3b) y, vía
     * la cosecha de paquete, entre archivos (M20-3). La pasada única
     * de antes solo veía el primer eslabón: la cadena imprimía en
     * crudo con el censo verde. */
    const fmtPropsOf = (binds: Map<string, string>, names: Set<string>, factories?: ReadonlySet<string>): Set<string> => {
      const props = new Set<string>();
      let grew = true;
      while (grew) {
        grew = false;
        for (const [n, rhs] of binds) {
          if (props.has(n)) continue;
          // OLA 22 (M22-3): el valor que ES una llamada a una fábrica
          // ata al formateador por la firma de la llamada, aunque el
          // texto del valor no nombre a Fmt en ninguna parte.
          const callM = rhs.trim().match(/^(\w+)\s*\(/);
          if (callM && factories?.has(callM[1]!)) { props.add(n); grew = true; continue; }
          // el valor atado, limpio de la puntuación del ámbito que lo
          // envuelve («val fmt = Fmt }» dentro de un companion): el
          // último segmento del nombre es la grafía que cuenta.
          const clean = rhs.trim().replace(/[}\])\s]+$/, "");
          const last = clean.split(".").pop()!;
          if (names.has(clean) || props.has(clean) || names.has(last) || props.has(last)) { props.add(n); grew = true; }
        }
      }
      return props;
    };
    const fmtFormatters = new Set<string>();
    // OLA 17: esta lectura va sobre el código SIN retirar la casa —
    // scanned ya la trae retirada del paso 0 y aquí la casa es la
    // evidencia (la primera forma de la cuarta vida la leyó sobre el
    // código retirado y fmtFormatters nació vacío: M17-4b lo cazó).
    for (const { code } of scannedRaw) {
      const at = code.search(/\bobject\s+Fmt\s*\{/);
      if (at < 0) continue;
      const raw = code.slice(at);
      let depth = 0, end = raw.length;
      for (let i = raw.indexOf("{"); i < raw.length; i++) {
        if (raw[i] === "{") depth++;
        else if (raw[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      for (const m of raw.slice(0, end).matchAll(/\bfun\s+(\w+)\s*\(\s*\w+\s*:\s*Long\b[^)]*\)\s*:\s*String\b/g)) fmtFormatters.add(m[1]!);
      /* OLA 22 (M22-5): la casa también declara formateadores como
       * PROPIEDADES DE TIPO FUNCIÓN — `val rateFn: (Long) -> String`
       * dentro de `object Fmt` ES un formateador (primer parámetro
       * Long, devuelve String), pero la cosecha solo leía
       * declaraciones `fun`: su alias de miembro era invisible para
       * memberAliasesOf mientras su llamada directa acusaba — las
       * dos grafías de la misma función se juzgaban distinto. Desde
       * hoy la propiedad-función entra en el mismo registro que sus
       * hermanas `fun`, y el alias acusa como la llamada directa. */
      for (const m of raw.slice(0, end).matchAll(/\bval\s+(\w+)\s*:\s*\(\s*(?:\w+\s*:\s*)?Long\b[^)]*\)\s*->\s*String\b/g)) fmtFormatters.add(m[1]!);
    }
    /* OLA 19 (Asesor, hallazgo 3): LAS TRES GRAFÍAS QUE LA COSECHA NO
     * CONOCÍA. (ii) El alias de importación de un MIEMBRO —
     * `import …Fmt.money as plata`: la cosecha vieja guardaba el último
     * segmento del destino («money») y preguntaba si resolvía a «Fmt»;
     * resuelve a la FUNCIÓN, y la llamada desnuda renombrada no tenía
     * receptor ni nombre literal que ninguna forma reconociera
     * (M19-6). Aquí se distingue el destino-objeto del destino-miembro:
     * si el penúltimo segmento resuelve (compuesto) a «Fmt» y el último
     * es una función declarada de la casa, el nombre desnudo ata a esa
     * función y sus llamadas se juzgan como la llamada canónica. */
    const memberAliasesOf = (fi: number): Map<string, string> => {
      const out = new Map<string, string>();
      for (const m of scanned[fi]!.code.matchAll(/\bimport\s+([\w.]+)\s+as\s+(\w+)\b/g)) {
        const segs = m[1]!.split(".");
        const member = segs[segs.length - 1]!;
        const parent = segs[segs.length - 2];
        if (parent && fmtFormatters.has(member) && resolveComposed(parent, fi) === "Fmt") out.set(m[2]!, member);
      }
      return out;
    };
    /* OLA 22 (M22-3): LAS FÁBRICAS — el formateador entregado por una
     * LLAMADA. La cosecha leía el valor atado solo si nombraba al
     * formateador (`val f = Fmt`) o si el tipo declarado lo decía
     * (M21-6): `val f = makeFmt()` y `val f = wrap(Fmt)` ataban f a
     * Fmt por la FIRMA de la función llamada y corrían invisibles.
     * Aquí se cosecha el tipo de RETORNO declarado de cada función
     * del paquete: un nombre es fábrica si TODAS sus declaraciones
     * resuelven su retorno (compuesto, desde su archivo) a Fmt — la
     * unanimidad guarda contra la colisión de un nombre desnudo que
     * en otro archivo devuelva otra cosa. fmtPropsOf aprende la
     * grafía con este registro: una atadura cuyo valor ES una llamada
     * a una fábrica ata al formateador. */
    const fmtFactories = new Set<string>();
    {
      const retornos = new Map<string, string[]>();
      scanned.forEach(({ code }, fi) => {
        for (const m of code.matchAll(/\bfun\s+(\w+)\s*\([^)]*\)\s*:\s*([\w.]+)\??/g)) {
          const arr = retornos.get(m[1]!) ?? [];
          arr.push(resolveComposed(m[2]!.split(".").pop()!, fi));
          retornos.set(m[1]!, arr);
        }
      });
      for (const [n, rs] of retornos) if (rs.length > 0 && rs.every((r) => r === "Fmt")) fmtFactories.add(n);
    }
    /* (iii) El formateador guardado en una propiedad atada a NIVEL DE
     * PAQUETE en otro archivo (M19-7): `val fmtCasa = Fmt` en la cima
     * de un archivo es visible en todo el paquete, como un typealias —
     * la cosecha de propiedades se hace también a ese nivel (las
     * ataduras de nivel superior de cada archivo, juzgadas con los
     * nombres de SU archivo). Una atadura local del mismo nombre en el
     * archivo juzgado sombrea a la de paquete: el juicio por archivo
     * solo hereda los nombres que el archivo no ata. */
    /* OLA 20 (Asesor, hallazgos 1 y 2): la cosecha de paquete itera a
     * punto fijo ENTRE ARCHIVOS (la cadena fmtB = fmtA con fmtA atada
     * en otro archivo, M20-3) y conoce la atadura tras una llave — el
     * miembro de un objeto (`object Casa { val fmt = Fmt }`, M20-6)
     * nace tras «{», no a comienzo de línea ni tras un punto y coma, y
     * la cosecha vieja no lo veía.
     * OLA 21 (M21-4): EL TOPE MUERE TAMBIÉN AQUÍ. Este bucle iteraba
     * `round < 8` con la señal `grew` ya calculada: una cadena de
     * propiedades de NUEVE archivos en orden inverso corría verde — el
     * noveno eslabón nunca se cosechaba y su superficie imprimía sin
     * juicio. Es la enfermedad de M20-9 en el bucle que la propia cura
     * 20 escribió. Desde hoy los tres bucles de derivación de esta
     * cerca (esta cosecha, el punto fijo de valores del paquete y el
     * local por archivo) iteran MIENTRAS la señal crece: los conjuntos
     * solo crecen y los nombres son texto finito, así que el punto
     * fijo termina por estructura, no por un número. (Las expansiones
     * por sustitución de texto — `expand` y la del sitio — conservan
     * su guarda de 4: no derivan conocimiento, reescriben texto, y una
     * pareja de ataduras cíclica oscilaría para siempre; su guarda es
     * de ciclo, no de conocimiento.) */
    const pkgFmtProps = new Set<string>();
    const pkgTopBinds = scanned.map(({ code }) => {
      const top = new Map<string, string>();
      for (const m of code.matchAll(/(?:^|[;{]\s*)\s*(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/gm)) top.set(m[1]!, m[2]!.trim());
      return top;
    });
    for (;;) {
      let grew = false;
      scanned.forEach((_, fi) => {
        for (const p of fmtPropsOf(pkgTopBinds[fi]!, new Set([...fmtNamesOf(fi), ...pkgFmtProps]), fmtFactories)) {
          if (!pkgFmtProps.has(p)) { pkgFmtProps.add(p); grew = true; }
        }
      });
      if (!grew) break;
    }
    /* OLA 23 (M23-2): LA REFERENCIA CRUZA ARCHIVOS, COMO EL VALOR. La
     * cosecha de valores de la ola 20/21 es del paquete entero (la
     * cadena fmtB = fmtA entre archivos se cosecha a punto fijo entre
     * archivos), pero la de REFERENCIAS (M22-4) se quedó por archivo:
     * el mapa refsResueltas nacía y se cerraba dentro de cada archivo,
     * así que una cadena de identidad con UN eslabón en otro archivo
     * corría verde en el juicio (`val r = Fmt::rate` en E1, `val t = r`
     * en E2, `u(t)` en Spec: u jamás se resolvía) — y la verificación
     * de sitios declaraba muerta la superficie viva deletreada por esa
     * misma cadena, porque su mapa gemelo tampoco cruzaba. Las dos
     * mitades erraban en direcciones opuestas sobre la misma identidad.
     * Aquí la resolución se hace UNA vez para el paquete: las semillas
     * son las ataduras directas `val x = <Fmt>::<fn>` de cada archivo
     * (con las grafías de SU archivo), y la cadena se cierra a punto
     * fijo sobre la unión de ataduras del paquete. La unanimidad manda,
     * como en las fábricas: una semilla con dos destinos, o un eslabón
     * con dos valores distintos en el paquete, es ambiguo y NO resuelve
     * por paquete (el archivo que lo ata manda en su juicio, como la
     * sombra de las propiedades de paquete). El juicio y el sitio
     * heredan de este mapa solo los nombres que su archivo no ata. */
    const pkgRefsResueltas = new Map<string, string>();
    {
      const ambiguas = new Set<string>();
      const todosBinds = new Map<string, Set<string>>();
      scanned.forEach(({ code }, fi) => {
        const spell = [...fmtNamesOf(fi)].map(escRe18).join("|");
        if (spell) {
          for (const m of code.matchAll(new RegExp(`\\b(?:val|var)\\s+(\\w+)\\s*=\\s*(?:${spell})::(\\w+)\\b`, "g"))) {
            if (!fmtFormatters.has(m[2]!)) continue;
            const prev = pkgRefsResueltas.get(m[1]!);
            if (prev === undefined) pkgRefsResueltas.set(m[1]!, m[2]!);
            else if (prev !== m[2]!) ambiguas.add(m[1]!);
          }
        }
        for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/g)) {
          const s = todosBinds.get(m[1]!) ?? new Set<string>();
          s.add(m[2]!.trim());
          todosBinds.set(m[1]!, s);
        }
      });
      for (const a of ambiguas) pkgRefsResueltas.delete(a);
      for (;;) {
        let grew = false;
        for (const [n, rhss] of todosBinds) {
          if (pkgRefsResueltas.has(n) || ambiguas.has(n) || rhss.size !== 1) continue;
          const rhs = [...rhss][0]!;
          if (/^\w+$/.test(rhs) && pkgRefsResueltas.has(rhs)) { pkgRefsResueltas.set(n, pkgRefsResueltas.get(rhs)!); grew = true; }
        }
        if (!grew) break;
      }
    }
    /* OLA 17 (Asesor): CUARTA VIDA — el punto fijo del valor se
     * calcula sobre el PAQUETE antes de juzgar archivo a archivo. La
     * tercera vida seguía el valor dentro de cada archivo y solo
     * hacia afuera (ataduras que contienen un acceso, retornos): el
     * ayudante construido en otro archivo (M17-2), el parámetro que
     * ENTRA (M17-3, las dos formas), la cadena cuya declaración vive
     * en otro archivo (M17-6b) y la atadura de identidad (M17-1)
     * escapaban por la frontera del archivo. Aquí se derivan, una
     * sola vez: los receptores del paquete (la unión de las
     * declaraciones de tipo), los ayudantes del paquete y las
     * PUERTAS de parámetro — qué parámetro de qué función recibe
     * una cifra, por su valor por defecto o en algún sitio de
     * llamada del paquete.
     * La forma final lleva tres correcciones que la propia caza en
     * vivo de esta cura impuso, y quedan escritas porque son la
     * doctrina: (1) los nombres derivados del paquete viven POR
     * ARCHIVO — un nombre significa lo que su archivo ata a él — y
     * un nombre derivado usado como contenedor (n.first, n?.go) no
     * entrega su valor; (2) los ayudantes del paquete nacen solo de
     * funciones de NIVEL SUPERIOR (las llamables por su nombre
     * desnudo desde otro archivo): la unión con los miembros de
     * clase derivó media casa por colisión de nombres (parse, save,
     * take…); (3) lo que entra por una puerta es el VALOR entregado
     * — una selección if/else cuyas ramas son literales elige un
     * destino, no pinta la cifra que la decidió — y el parámetro se
     * juzga ACOTADO al cuerpo de su función, nunca inyectado al
     * archivo entero (id, name, days acusaron sanos en la primera
     * forma). El registro, además, ata a la llamada RESUELTA en su
     * SITIO verificado (M17-7): la superficie muerta con su texto
     * plantado en otro archivo acusa, y la re-expresión con el
     * mismo productor (r4 = s.rateE4) absuelve. */
    const receiverTypeNames = [...new Set([...tipos.keys(), ...propTypes.keys(), ...aliasSpellings])].join("|");
    const pkgReceivers = new Map<string, string>();
    for (const [fi, { code }] of scanned.entries()) {
      for (const m of code.matchAll(new RegExp(`\\b(\\w+)\\s*:\\s*(${receiverTypeNames})\\b`, "g"))) pkgReceivers.set(m[1]!, resolveWrittenType(m[2]!, fi));
    }
    const pkgAccessRe = pkgReceivers.size
      ? new RegExp([...pkgReceivers].filter(([, t]) => (tipos.get(t)?.size ?? 0) > 0)
        .map(([r, t]) => `\\b${r}\\.(${[...tipos.get(t)!].join("|")})\\b`).join("|"))
      : /$^/;
    const pkgWordIn = (n: string, t: string) => new RegExp(`(?<![\\w.])${n}\\b`).test(t);
    type FunDecl17 = { name: string; params: { name: string; type?: string; def?: string }[]; file: number };
    const funDecls: FunDecl17[] = [];
    const pkgFunBodies: [string, string, number][] = [];
    scanned.forEach(({ code }, fi) => {
      for (const m of code.matchAll(/\bfun\s+(\w+)\s*\(([^)]*)\)/g)) {
        const params = m[2]!.split(",").map((p) => {
          const pm = p.trim().match(/^(\w+)\s*(?::\s*([^=]+))?(?:=\s*(.+))?$/);
          return pm ? { name: pm[1]!, type: pm[2]?.trim(), def: pm[3] } : { name: p.trim() };
        }).filter((p) => p.name);
        funDecls.push({ name: m[1]!, params, file: fi });
      }
      /* OLA 17, segunda forma (la caza en vivo de esta misma cura):
       * los cuerpos que siembran ayudantes de PAQUETE son solo los de
       * las funciones de NIVEL SUPERIOR — las únicas llamables por su
       * nombre desnudo desde otro archivo. La primera forma recogió
       * también los miembros de clase (monthName, parse, save, take…)
       * y el punto fijo del paquete derivó media casa: cualquier
       * archivo que llamara a un parse(…) heredaba su «derivación».
       * La declaración de nivel superior nace a comienzo de línea o
       * tras un «;» (la grafía compacta de los especímenes), nunca
       * sangrada como un miembro, y nunca private (privada de su
       * archivo). Los miembros siguen juzgándose en su archivo por el
       * punto fijo local, como siempre. */
      for (const m of code.matchAll(/(?:^|;\s*)(?!private\b)(?:suspend\s+)?fun\s+(\w+)\s*\(([^)]*)\)[^{=]*=\s*([^\n]+)/gm)) pkgFunBodies.push([m[1]!, m[3]!, fi]);
      for (const m of code.matchAll(/(?:^|;\s*)(?!private\b)(?:suspend\s+)?fun\s+(\w+)\s*\([^)]*\)[^{]*\{/gm)) {
        const open = m.index + m[0].length - 1;
        let depth = 0, end = code.length;
        for (let i = open; i < code.length; i++) {
          if (code[i] === "{") depth++;
          else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        pkgFunBodies.push([m[1]!, code.slice(open, end), fi]);
      }
    });
    /* OLA 20 (Asesor, hallazgo 2): EL PRODUCTOR EN POSICIÓN TIPADA.
     * La cosecha vieja solo veía el formateador ATADO a un valor
     * (`val fmt = Fmt`): el que entra por la firma — un parámetro
     * `fmt: Fmt` (M20-4), el mismo por typealias (M20-4b), una
     * propiedad de constructor `class Casa(val fmt: Fmt)` usada desde
     * otro archivo (M20-5) — no tenía cosecha y sus llamadas
     * imprimían sin juicio. Aquí esos nombres entran al conjunto de
     * paquete: el tipo se pregunta al resolvedor compuesto desde el
     * archivo que lo declara, y propTypes — que ya guardaba el tipo
     * de cada propiedad para las cadenas de la foto — responde
     * también por el formateador. El nombre entra solo cuando su
     * TIPO resuelve a Fmt: es la declaración, no la grafía. */
    for (const d of funDecls) {
      for (const p of d.params) {
        if (!p.type) continue;
        const tname = p.type.trim().replace(/\?$/, "").split(/[<,]/)[0]!.trim().split(".").pop()!;
        if (tname && resolveComposed(tname, d.file) === "Fmt") pkgFmtProps.add(p.name);
      }
    }
    for (const [, props] of propTypes) {
      for (const [pn, u] of props) if (resolveComposed(u.w, u.fi) === "Fmt") pkgFmtProps.add(pn);
    }
    /* OLA 21 (M21-6): LA COSECHA TIPADA LEE TAMBIÉN LA ATADURA `val`.
     * La ola 20 cosechó el productor en posición tipada de la FIRMA
     * (parámetros) y del CONSTRUCTOR (propTypes), pero una atadura con
     * tipo declarado y valor opaco escapaba entera: `val f: Fmt =
     * makeFmt()`, `val f: MiFmt = …` (por typealias) y el miembro
     * tipado de un objeto solo se salvaban si el VALOR nombraba al
     * formateador — la declaración, que es lo que el tipo promete, no
     * se leía. Aquí toda atadura `val`/`var` con tipo declarado cuyo
     * tipo resuelve (compuesto, desde su archivo) a Fmt entra al
     * conjunto de paquete por su nombre, nazca a nivel superior, como
     * miembro de clase o dentro de un objeto: es la misma doctrina de
     * la ola 20 — manda la declaración, no la grafía del valor. */
    for (const [fi, { code }] of scanned.entries()) {
      for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*:\s*([\w.]+)\??\s*(?:=|get\b)/g)) {
        if (resolveComposed(m[2]!.split(".").pop()!, fi) === "Fmt") pkgFmtProps.add(m[1]!);
      }
    }
    /* OLA 17, tercera forma (la misma caza en vivo): el punto fijo
     * del paquete ata cada nombre a SU archivo — pkgDerived es por
     * archivo, porque un nombre significa lo que su archivo ata a
     * él (el id derivado de un archivo no deriva el id-puente de
     * otro). Y lo que entra por una puerta es el VALOR: una
     * selección (if/else, ?:) cuya condición mira una cifra pero
     * cuyas ramas son literales entrega la literal, no la cifra —
     * openIntent(ctx, if (s.owe >= s.owed) "vault-owe" else
     * "vault-owed") no pinta dinero, elige destino. valueFlows juzga
     * la rama que se entrega; el acceso desnudo (pinta(s.spent)) y el
     * valor por defecto derivado siguen entrando, como clavaron
     * M17-3a y M17-3b. */
    const pkgDerivedByFile = new Map<number, Set<string>>();
    const pkgSet = (fi: number): Set<string> => {
      let s = pkgDerivedByFile.get(fi);
      if (!s) { s = new Set(); pkgDerivedByFile.set(fi, s); }
      return s;
    };
    const pkgHelpers = new Set<string>();
    // un nombre derivado usado como CONTENEDOR (n.first, n?.go) no
    // entrega su valor: entrega el campo final, que se juzga por su
    // propio tipo. pkgWordValue solo cuenta el nombre cuando el
    // carácter que lo sigue no es un acceso — el par del próximo
    // vencimiento deriva como contenedor, y su .go (una cadena) no
    // es la cifra que el par envuelve.
    const pkgWordValue = (n: string, t: string): boolean => {
      const re = new RegExp(`(?<![\\w.])${n}\\b`, "g");
      for (const m of t.matchAll(re)) {
        const next = t.slice(m.index + m[0].length).trimStart()[0];
        if (next !== "." && next !== "?") return true;
      }
      return false;
    };
    const pkgExprDerived = (t: string, fi: number): boolean =>
      pkgAccessRe.test(t) || [...pkgSet(fi)].some((n) => pkgWordValue(n, t)) || [...pkgHelpers].some((h) => new RegExp(`(?<![\\w.])${h}\\s*\\(`).test(t));
    const splitTop = (v: string, sep: string): number => {
      let depth = 0, inStr = false;
      for (let i = 0; i + sep.length <= v.length; i++) {
        const ch = v[i]!;
        if (inStr) { if (ch === '"') inStr = false; continue; }
        if (ch === '"') { inStr = true; continue; }
        if (ch === "(" || ch === "{") depth++;
        else if (ch === ")" || ch === "}") depth--;
        else if (depth === 0 && v.startsWith(sep, i)) return i;
      }
      return -1;
    };
    const valueFlows = (t: string, fi: number): boolean => {
      const v = t.trim();
      const elseAt = splitTop(v, " else ");
      if (elseAt >= 0) return valueFlows(v.slice(elseAt + 6), fi);
      if (/^if\s*\(/.test(v) || /^when\b/.test(v)) return false;
      const elvisAt = splitTop(v, "?:");
      if (elvisAt >= 0) return valueFlows(v.slice(0, elvisAt), fi) || valueFlows(v.slice(elvisAt + 2), fi);
      return pkgExprDerived(v, fi);
    };
    const paramFlow = new Map<string, Set<number>>();
    const flowParam = (fn: string, i: number) => {
      if (!paramFlow.has(fn)) paramFlow.set(fn, new Set());
      paramFlow.get(fn)!.add(i);
    };
    // OLA 21 (M21-4): sin tope — itera mientras `grew`, como sus dos
    // hermanos (ver la nota en la cosecha de paquete): el conjunto de
    // derivados y el de puertas son finitos y solo crecen.
    for (;;) {
      let grew = false;
      scanned.forEach(({ code }, fi) => {
        for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/g)) {
          if (/\.toInt\(\)/.test(m[2]!) && m[2]!.includes("/")) continue; // el porcentaje tampoco deriva en el paquete
          if (!pkgSet(fi).has(m[1]!) && pkgExprDerived(m[2]!, fi)) { pkgSet(fi).add(m[1]!); grew = true; }
        }
      });
      for (const [fn, body, fi] of pkgFunBodies) {
        if (!pkgHelpers.has(fn) && pkgExprDerived(body, fi)) { pkgHelpers.add(fn); grew = true; }
      }
      for (const d of funDecls) {
        d.params.forEach((p, i) => {
          if (p.def !== undefined && valueFlows(p.def, d.file) && !paramFlow.get(d.name)?.has(i)) { flowParam(d.name, i); grew = true; }
        });
        const callRe = new RegExp(`\\b${d.name}\\s*\\(([^)]*)\\)`, "g");
        scanned.forEach(({ code }, fi) => {
          for (const m of code.matchAll(callRe)) {
            if (code.slice(Math.max(0, m.index - 4), m.index) === "fun ") continue; // la declaración no es un sitio de llamada
            m[1]!.split(",").forEach((a, i) => {
              if (i < d.params.length && valueFlows(a, fi) && !paramFlow.get(d.name)?.has(i)) { flowParam(d.name, i); grew = true; }
            });
          }
        });
      }
      if (!grew) break;
    }
    const typeNames = [...tipos.keys()].join("|");
    for (const [fi, { name, code: rawCode, literals }] of scanned.entries()) {
      // la casa del productor ya se retiró en el paso 0 (ola 17)
      const code = rawCode;
      // receptores por TIPO DECLARADO, no por nombre — el universo de
      // tipos incluye toda clase declarada en el paquete (ola 17)
      const receivers = new Map<string, string>();
      // OLA 22 (M22-2): el receptor guarda también sus ARGUMENTOS de
      // tipo declarados (`c: Caja<Fmt>`), resueltos desde su archivo —
      // son la sustitución que el juicio por dueño aplica a las
      // propiedades genéricas de su clase.
      const receiverArgs = new Map<string, string[]>();
      // OLA 23 (M23-3b): la captura de argumentos admite UN nivel de
      // anidamiento (`Caja<Caja<Fmt>>`) y cada argumento se resuelve
      // como EXPRESIÓN completa desde su archivo — la captura vieja
      // moría en el primer «>» y el argumento anidado entraba roto.
      for (const m of code.matchAll(new RegExp(`\\b(\\w+)\\s*:\\s*(${receiverTypeNames})\\b\\s*(?:<((?:[^<>]|<[^<>]*>)*)>)?`, "g"))) {
        receivers.set(m[1]!, resolveWrittenType(m[2]!, fi));
        if (m[3] !== undefined) receiverArgs.set(m[1]!, parseTipoExpr(`X<${m[3]}>`).args.map((a) => resuelveExprTipo(a, fi)));
      }
      const buildAccess = (): RegExp => {
        const pats = [...receivers].filter(([, t]) => (tipos.get(t)?.size ?? 0) > 0)
          .map(([r, t]) => `\\b${r}\\.(${[...tipos.get(t)!].join("|")})\\b`);
        return pats.length ? new RegExp(pats.join("|")) : /$^/;
      };
      // OLA 17: las cadenas se resuelven por el tipo DECLARADO de la
      // propiedad — h.foto.spent con foto: Snap ES un acceso a la
      // foto, nazca la declaración de SobreM17 donde nazca (M17-6/6b)
      const buildChains = (): RegExp => {
        const pats: string[] = [];
        for (const [r, t] of receivers) {
          const props = propTypes.get(t);
          if (!props) continue;
          for (const [f, u] of props) {
            // OLA 19 (M19-5): el tipo de la propiedad se resuelve con
            // la composición DESDE SU ARCHIVO DECLARANTE (u.fi): su
            // alias de importación vale lo que el typealias valía.
            const fields = tipos.get(resolveComposed(u.w, u.fi));
            if (fields?.size) pats.push(`\\b${r}\\.${f}\\.(${[...fields].join("|")})\\b`);
          }
        }
        return pats.length ? new RegExp(pats.join("|")) : /$^/;
      };
      let accessRe = buildAccess();
      let chainRe = buildChains();
      // el valor se sigue: ataduras locales y ayudantes, por punto fijo
      // OLA 21 (M21-4): por punto fijo DE VERDAD — el `round < 8` mudo
      // que truncaba esta derivación muere con sus hermanos (la nota
      // entera vive en la cosecha de paquete).
      const derived = new Set<string>();
      const bindings = new Map<string, string>();
      const helpers = new Set<string>(pkgHelpers);
      const conduits = new Set<string>();
      const wordIn = (n: string, t: string) => new RegExp(`(?<![\\w.])${n}\\b`).test(t);
      const exprDerived = (t: string): boolean =>
        accessRe.test(t) || chainRe.test(t) || [...derived].some((n) => wordIn(n, t)) || [...helpers].some((h) => new RegExp(`(?<![\\w.])${h}\\s*\\(`).test(t));
      const funBodies: [string, string][] = [];
      const exprBodies: [string, string][] = [];
      for (const m of code.matchAll(/\bfun\s+(\w+)\s*\(([^)]*)\)[^{=]*=\s*([^\n]+)/g)) { funBodies.push([m[1]!, m[3]!]); exprBodies.push([m[1]!, m[3]!]); }
      for (const m of code.matchAll(/\bfun\s+(\w+)\s*\([^)]*\)[^{]*\{/g)) {
        const open = m.index + m[0].length - 1;
        let depth = 0, end = code.length;
        for (let i = open; i < code.length; i++) {
          if (code[i] === "{") depth++;
          else if (code[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
        }
        funBodies.push([m[1]!, code.slice(open, end)]);
      }
      for (;;) {
        let grew = false;
        for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/g)) {
          bindings.set(m[1]!, m[2]!.trim());
          // OLA 17 (M17-1): la atadura de IDENTIDAD — val mismo = s —
          // no contiene acceso alguno y no derivaba: la foto entera
          // viajaba bajo otro nombre. El alias ES el receptor, con su
          // tipo, y los accesos y las cadenas se reconstruyen con él.
          const rhsName = m[2]!.trim();
          if (/^\w+$/.test(rhsName) && receivers.has(rhsName) && !receivers.has(m[1]!)) {
            receivers.set(m[1]!, receivers.get(rhsName)!);
            accessRe = buildAccess();
            chainRe = buildChains();
            grew = true;
          }
          // CALIBRACIÓN VIVA (ola 16): un cociente de dos cifras,
          // escalado y convertido a Int, es un PORCENTAJE, no una
          // cifra — la misma doctrina que deja fuera usedPct:
          // `val shown = Math.round(s.saveMonth * 100.0 / s.saveGoal).toInt()`
          // se pinta como «$shown%» y no imprime dinero alguno.
          if (/\.toInt\(\)/.test(m[2]!) && m[2]!.includes("/")) continue;
          if (!derived.has(m[1]!) && exprDerived(m[2]!)) { derived.add(m[1]!); grew = true; }
        }
        for (const [fn, body] of funBodies) {
          if (!helpers.has(fn) && exprDerived(body)) { helpers.add(fn); grew = true; }
        }
        if (!grew) break;
      }
      // (las puertas de M17-3 se juzgan abajo, acotadas al cuerpo de
      // cada función: un nombre de parámetro derivado NO tiñe el
      // archivo entero — la caza en vivo lo probó: id, name, days y
      // hasta d pasaron a «derivar» en archivos que declaran funciones
      // con esos parámetros, y el censo acusó superficies sanas)
      /* OLA 18 (Asesor): los nombres del formateador EN ESTE ARCHIVO —
       * se computan aquí, con las ataduras ya cerradas por el punto
       * fijo, porque los conductos y todas las formas los consumen.
       * La llamada se juzga por su grafía canónica «Fmt.<fn>» venga
       * por el nombre, por el alias, por el typealias o por la
       * propiedad que lo guarda (directa o tras su clase: Casa.fmt). */
      const fmtNames = fmtNamesOf(fi);
      // OLA 19 (M19-7): las propiedades-formateador del archivo, más
      // las de nivel de paquete que este archivo no sombrea con una
      // atadura propia del mismo nombre.
      // OLA 20 (M20-3): la cosecha local lee TAMBIÉN los nombres de
      // paquete como semilla — el eslabón local de una cadena entre
      // archivos (`val fmtB = fmtA` con fmtA de paquete) se resuelve
      // en su archivo; una atadura local con OTRO valor sigue
      // sombreando (el filtro de abajo no la hereda).
      const fmtProps = new Set([...fmtPropsOf(bindings, new Set([...fmtNames, ...pkgFmtProps]), fmtFactories), ...[...pkgFmtProps].filter((p) => !bindings.has(p))]);
      // OLA 21 (M21-6): las ataduras tipadas de ESTE archivo entran por
      // su declaración, aunque el filtro de paquete las excluya por
      // sombra de nombre (están atadas aquí, y su valor no nombra al
      // formateador): el tipo declarado del propio archivo manda sobre
      // su sombra. La cosecha gemela a nivel de paquete vive junto a
      // la cosecha tipada de la ola 20.
      for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*:\s*([\w.]+)\??\s*(?:=|get\b)/g)) {
        if (resolveComposed(m[2]!.split(".").pop()!, fi) === "Fmt") fmtProps.add(m[1]!);
      }
      // OLA 19 (M19-6): los alias de miembro de este archivo — la
      // llamada desnuda renombrada ES una llamada al formateador.
      const memberAliases = memberAliasesOf(fi);
      const spellRe = [...fmtNames].map(escRe18).join("|");
      const propRe = [...fmtProps].map(escRe18).join("|");
      /* OLA 22 (M22-2): el candidato ANCHO de la forma receptor.
       * propiedad.función — las propiedades genéricas entran como
       * candidatas y la puerta es bloqueadaPorDueno, que sustituye
       * el argumento del receptor: `Caja<Fmt>` juzga, `Caja<Otro>`
       * bloquea, y sin dueño conocido la puramente genérica no
       * juzga por su nombre. La forma desnuda (sin receptor) sigue
       * con propRe: sin receptor no hay sustitución posible. */
      const propReAncho = [...new Set([...fmtProps, ...genericProps])].map(escRe18).join("|");
      const hayPropsAnchas = fmtProps.size > 0 || genericProps.size > 0;
      /* OLA 21 (M21-5): LA PROPIEDAD LLEVA SU TIPO DUEÑO. El conjunto
       * de propiedades era un conjunto de NOMBRES desnudos: la
       * propiedad homónima de una clase ajena (`class SinFmt(val fmt:
       * Otro)`) acusaba y absolvía por el registro de Fmt — una
       * llamada `w.fmt.money(…)` con w de esa clase se juzgaba como
       * llamada al formateador aunque su `fmt` es Otro. Desde hoy,
       * cuando el receptor tiene tipo declarado conocido y ESE tipo
       * declara la propiedad con un tipo que no resuelve a Fmt, la
       * llamada es de la clase ajena: ni acusa ni absuelve por el
       * registro de Fmt (otras formas juzgarán lo que imprima). El
       * nombre desnudo sigue mandando donde el dueño no se conoce —
       * la propiedad de paquete, la del companion, la local sin tipo:
       * la cosecha de nombres no se debilita, se le añade el dueño
       * donde el dueño está declarado. */
      /* OLA 22 (M22-2): si el tipo declarado de la propiedad es un
       * PARÁMETRO de la clase dueña, manda el argumento con que el
       * receptor se declaró: `Caja<Fmt>` la ata a Fmt y la llamada
       * se juzga; `Caja<Otro>` la bloquea; sin argumento declarado
       * no se puede jurar que sea Fmt y se bloquea. Sin dueño
       * conocido, una propiedad PURAMENTE genérica no juzga por su
       * nombre desnudo — su nombre solo no promete el formateador
       * en ninguna clase.
       * OLA 23 (M23-3b): el juicio vive en bloqueadaPorCadenaEn — el
       * caminante de cadenas del censo: este delegado de un salto es
       * su caso más corto, y la forma ancha de abajo lo invoca con el
       * camino entero del receptor (c.fmt.fmt.…). */
      const bloqueadaPorDueno = (recv: string, prop: string): boolean => bloqueadaPorCadenaEn(receivers, receiverArgs, recv, prop);
      const propCallish = (t: string): boolean => {
        if (!hayPropsAnchas) return false;
        for (const m of t.matchAll(new RegExp(`\\b(\\w+)\\.(${propReAncho})\\.\\w+\\s*\\(`, "g"))) if (!bloqueadaPorDueno(m[1]!, m[2]!)) return true;
        if (fmtProps.size === 0) return false;
        return new RegExp(`(?<![\\w.])(?:${propRe})\\.\\w+\\s*\\(`).test(t);
      };
      const fmtCallish = (t: string): boolean =>
        new RegExp(`\\b(?:${spellRe})\\.\\w+\\s*\\(`).test(t) ||
        propCallish(t) ||
        [...memberAliases.keys()].some((b) => new RegExp(`(?<![\\w.])${escRe18(b)}\\s*\\(`).test(t));
      /* Un CONDUCTO es otra cosa que un ayudante que deriva: una función
       * de cuerpo-expresión que ENTREGA el valor formateado (el
       * envoltorio `money(s, minor)` de la casa) — sus llamadas se
       * juzgan como llamadas al formateador. Una función de bloque que
       * llama a Fmt en sus sentencias es una SUPERFICIE, no un conducto:
       * sus sitios de llamada no imprimen por ella. */
      for (const [fn, body] of exprBodies) {
        if ([...fmtFormatters].some((f) => new RegExp(`\\b(?:${spellRe})\\.${f}\\s*\\(`).test(body)) || /(?<![\w.])money\s*\(/.test(body)) conduits.add(fn);
      }
      /* OLA 17 (M17-7b): el registro ata a la llamada RESUELTA, no a
       * su grafía — la absolución sigue la procedencia del argumento
       * por sus ataduras: Fmt.rate(r4) con val r4 = s.rateE4 ES la
       * llamada registrada de la tasa. La expansión sustituye solo
       * identificadores desnudos (ni miembros tras un punto ni
       * nombres de función) y se prueba junto al texto crudo: lo que
       * no resuelve a una entrada sigue acusando. */
      const expand = (t: string): string => {
        let out = t;
        for (let r = 0; r < 4; r++) {
          let changed = false;
          for (const [n, rhs] of bindings) {
            out = out.replace(new RegExp(`(?<![\\w.])${n}(?![\\w(])`, "g"), () => { changed = true; return rhs; });
          }
          if (!changed) break;
        }
        return out;
      };
      const judgedCall = (call: string) => {
        if (!SUPERFICIES_CASCARA.some(([re]) => re.test(call) || re.test(expand(call)))) acusadas.push(`${name}: ${call.slice(0, 70)}`);
      };
      // forma 1: llamadas a formateadores — cada una nombra su productor
      // (los nombres resueltos — fmtNames/fmtProps/spellRe/fmtCallish —
      // se computan arriba, tras el punto fijo, para todas las formas)
      for (const m of code.matchAll(new RegExp(`\\b(?:${spellRe})\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))) {
        if (m[2]!.includes(":")) continue; // declaración, no superficie
        if (fmtFormatters.has(m[1]!) || exprDerived(m[2]!)) judgedCall(`Fmt.${m[1]!}(${m[2]!})`);
      }
      // OLA 19 (M19-6): la llamada desnuda por alias de miembro se
      // juzga como la llamada canónica que es — plata(…) ES
      // Fmt.money(…), con su productor o sin él.
      for (const [bare, fn] of memberAliases) {
        for (const m of code.matchAll(new RegExp(`(?<![\\w.])${escRe18(bare)}\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[1]!.includes(":")) continue;
          judgedCall(`Fmt.${fn}(${m[1]!})`);
        }
      }
      if (fmtProps.size > 0) {
        for (const m of code.matchAll(new RegExp(`(?<![\\w.])(?:${propRe})\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[2]!.includes(":")) continue;
          if (fmtFormatters.has(m[1]!) || exprDerived(m[2]!)) judgedCall(`Fmt.${m[1]!}(${m[2]!})`);
        }
      }
      if (hayPropsAnchas) {
        // OLA 23 (M23-3b): el receptor de la forma ancha es un CAMINO
        // (c.fmt.fmt.money): la propiedad que nombra la llamada es la
        // última antes de la función, y el dueño se juzga caminando
        // el camino entero con la sustitución de cada salto. Con un
        // solo salto es exactamente el juicio de antes.
        for (const m of code.matchAll(new RegExp(`\\b(\\w+(?:\\.\\w+)*)\\.(${propReAncho})\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[4]!.includes(":")) continue;
          // OLA 21 (M21-5): el receptor cuya clase declara la
          // propiedad con otro tipo no llama a Fmt por esa propiedad.
          // OLA 22 (M22-2): y si el tipo declarado es un parámetro de
          // la clase, manda el argumento del receptor — la misma
          // puerta resuelve las dos.
          if (bloqueadaPorCadenaEn(receivers, receiverArgs, m[1]!, m[2]!)) continue;
          if (fmtFormatters.has(m[3]!) || exprDerived(m[4]!)) judgedCall(`Fmt.${m[3]!}(${m[4]!})`);
        }
      }
      // OLA 17 (M17-4): el formateador por REFERENCIA — val f =
      // Fmt::money ES Fmt.money; sus llamadas son forma 1 con el
      // nombre resuelto, y se juzgan como la llamada que son.
      /* OLA 22 (M22-4): LA REFERENCIA SE CIERRA SOBRE LA IDENTIDAD.
       * El mapa de referencias se resuelve a punto fijo sobre las
       * ataduras del archivo: `val t = r` con r ya resuelto HEREDA
       * el destino de r, en cadena — la grafía re-atada ya no escapa
       * del juicio (antes el mapa solo nacía de la atadura directa y
       * `t(…)` corría sin juzgar mientras el sitio declaraba muerta
       * la superficie viva deletreada `t(…)`: las dos mitades se
       * contradecían sobre la misma identidad, la lección de
       * M20-8/M21-7 que esta ola cierra en las dos a la vez). */
      const refsResueltas = new Map<string, string>();
      for (const m of code.matchAll(new RegExp(`\\b(?:val|var)\\s+(\\w+)\\s*=\\s*(?:${spellRe})::(\\w+)\\b`, "g"))) {
        if (fmtFormatters.has(m[2]!)) refsResueltas.set(m[1]!, m[2]!);
      }
      // OLA 23 (M23-2): la herencia de paquete — un nombre que este
      // archivo NO ata puede venir resuelto de la cosecha del paquete
      // (la cadena con un eslabón en otro archivo); el cierre de abajo
      // lo compone con las ataduras locales. Una atadura local del
      // mismo nombre sombrea: no se hereda lo que el archivo ata.
      for (const [n, fn] of pkgRefsResueltas) {
        if (!bindings.has(n) && !refsResueltas.has(n)) refsResueltas.set(n, fn);
      }
      for (;;) {
        let grew = false;
        for (const [n, rhs] of bindings) {
          if (refsResueltas.has(n)) continue;
          const clean = rhs.trim();
          if (/^\w+$/.test(clean) && refsResueltas.has(clean)) { refsResueltas.set(n, refsResueltas.get(clean)!); grew = true; }
        }
        if (!grew) break;
      }
      for (const [alias, target] of refsResueltas) {
        for (const c of code.matchAll(new RegExp(`(?<![\\w.])${escRe18(alias)}\\s*\\(([^)]*)\\)`, "g"))) {
          if (c[1]!.includes(":")) continue;
          judgedCall(`Fmt.${target}(${c[1]!})`);
        }
      }
      for (const m of code.matchAll(/(?<![\w.])money\s*\(([^)]*)\)/g)) {
        if (m[1]!.includes(":")) continue; // la declaración del envoltorio local lleva tipos
        judgedCall(m[0]);
      }
      for (const c of conduits) {
        if (c === "money") continue;
        for (const m of code.matchAll(new RegExp(`(?<![\\w.])${c}\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[1]!.includes(":")) continue;
          judgedCall(m[0]);
        }
      }
      // forma 2: interpolaciones crudas de una cifra derivada dentro de cadenas
      for (const lit of literals) {
        for (const m of lit.matchAll(/\$\{([^}]*)\}|\$([A-Za-z_][\w.]*)/g)) {
          const expr = m[1] ?? m[2] ?? "";
          if (fmtCallish(expr) || /(?<![\w.])money\s*\(/.test(expr)) continue; // la produce el formateador: la juzga la forma 1
          if ([...conduits].some((c) => new RegExp(`\\b${c}\\s*\\(`).test(expr))) continue;
          if (exprDerived(expr)) acusadas.push(`${name}: interpolación cruda de una cifra: «${lit.slice(0, 60)}»`);
        }
      }
      // forma 3: String.format — clásico o por extensión — con marcador numérico sobre una cifra derivada
      // OLA 17 (M17-5b): el marcador %s entra en la lista — imprime los
      // mismos dígitos que %d; la guarda sigue siendo el argumento
      // derivado (la fecha sana con %04d y literales no deriva y no acusa)
      const fmtCallArgs = (from: number): string => {
        let depth = 0, j = from;
        for (; j < code.length; j++) {
          if (code[j] === "(") depth++;
          else if (code[j] === ")") { depth--; if (depth === 0) break; }
        }
        return code.slice(from, j + 1);
      };
      for (const m of code.matchAll(/\bString\.format\s*\(/g)) {
        const call = fmtCallArgs(m.index + m[0].length - 1);
        if (/%[\d,.]*[dfs]/.test(call) && exprDerived(call)) acusadas.push(`${name}: String.format sobre una cifra: «${call.slice(0, 60)}»`);
      }
      for (const m of code.matchAll(/"([^"]*)"\s*\.format\s*\(/g)) {
        const call = fmtCallArgs(m.index + m[0].length - 1);
        if (/%[\d,.]*[dfs]/.test(m[1]!) && exprDerived(call)) acusadas.push(`${name}: String.format por extensión sobre una cifra: «${call.slice(0, 60)}»`);
      }
      // forma 4: StringBuilder/append de una cifra derivada
      for (const m of code.matchAll(/\.append\s*\(([^)]*)\)/g)) {
        if (exprDerived(m[1]!)) acusadas.push(`${name}: append de una cifra sin productor: «${m[0].slice(0, 60)}»`);
      }
      // forma 5: DecimalFormat/NumberFormat local (fuera de la casa de Fmt, ya retirada)
      const localFmts = new Set<string>();
      for (const m of code.matchAll(/\b(?:val|var)\s+(\w+)\s*=\s*(?:DecimalFormat|NumberFormat)\b/g)) localFmts.add(m[1]!);
      for (const m of code.matchAll(/(?:DecimalFormat|NumberFormat)\s*\([^)]*\)\s*\.format\s*\(([^)]*)\)/g)) {
        if (exprDerived(m[1]!)) acusadas.push(`${name}: DecimalFormat local sobre una cifra: «${m[0].slice(0, 60)}»`);
      }
      for (const lf of localFmts) {
        for (const m of code.matchAll(new RegExp(`\\b${lf}\\.format\\s*\\(([^)]*)\\)`, "g"))) {
          if (exprDerived(m[1]!)) acusadas.push(`${name}: el formateador local «${lf}» imprime una cifra sin productor: «${m[0].slice(0, 60)}»`);
        }
      }
      // forma 7 (OLA 17, M17-5a): replace cuyo REEMPLAZO deriva de una
      // cifra — la plantilla construida en un archivo y pintada en
      // otro con replace("{m}", s.spent.toString()) imprime la cifra
      // sin productor, como el append y la concatenación. Si el
      // reemplazo lo produce un formateador, lo juzga la forma 1.
      for (const m of code.matchAll(/\.replace\s*\(([^)]*)\)/g)) {
        const args = m[1]!;
        const comma = args.indexOf(",");
        if (comma < 0) continue;
        const repl = args.slice(comma + 1);
        if (fmtCallish(repl) || /(?<![\w.])money\s*\(/.test(repl)) continue;
        if (exprDerived(repl)) acusadas.push(`${name}: replace con un reemplazo derivado sin productor: «${m[0].slice(0, 60)}»`);
      }
      // forma 6: concatenación con cadena y Log — la cifra derivada fuera de todo formateador
      const maskCalls = (line: string): string => {
        let out = line;
        const heads = [...line.matchAll(new RegExp(`\\b(?:${spellRe})\\s*\\.\\s*\\w+\\s*\\(|(?<![\\w.])money\\s*\\(`, "g")),
          ...(fmtProps.size > 0 ? [...line.matchAll(new RegExp(`(?:\\b\\w+\\.(?:${propRe})|(?<![\\w.])(?:${propRe}))\\.\\w+\\s*\\(`, "g"))] : [])];
        for (const m of heads) {
          let depth = 0, j = m.index + m[0].length - 1;
          for (; j < line.length; j++) {
            if (line[j] === "(") depth++;
            else if (line[j] === ")") { depth--; if (depth === 0) { j++; break; } }
          }
          out = out.slice(0, m.index) + " ".repeat(j - m.index) + out.slice(j);
        }
        return out;
      };
      for (const line of code.split("\n")) {
        if (!line.includes('"') || !line.includes("+")) continue;
        // la cifra debe ser OPERANDO de la concatenación, no una
        // premisa de la línea: en la viva «if (s.rateE4 > 0) "US$100 = "
        // + Fmt.money(…)» la tasa se COMPARA en la condición y se
        // imprime por su formateador — la comparación no imprime.
        const masked = maskCalls(line);
        const tokenRes: RegExp[] = [new RegExp(accessRe.source, "g"),
          ...[...derived].map((n) => new RegExp(`(?<![\\w.])${n}\\b`, "g")),
          ...[...helpers].map((h) => new RegExp(`\\b${h}\\s*\\(`, "g"))];
        let operand = false;
        for (const re of tokenRes) {
          for (const mm of masked.matchAll(re)) {
            const before = masked.slice(Math.max(0, mm.index - 4), mm.index);
            const after = masked.slice(mm.index + mm[0].length, mm.index + mm[0].length + 4);
            if (/\+\s*$/.test(before) || /^\s*\+/.test(after)) { operand = true; break; }
          }
          if (operand) break;
        }
        if (operand) acusadas.push(`${name}: concatenación que imprime una cifra sin productor: «${line.trim().slice(0, 60)}»`);
      }
      for (const m of code.matchAll(/\bLog\.\w+\s*\(([^)]*)\)/g)) {
        if (exprDerived(m[1]!)) acusadas.push(`${name}: una cifra derivada en un Log: «${m[0].slice(0, 60)}»`);
      }
      /* OLA 17 (M17-3): las PUERTAS, acotadas a su cuerpo — un
       * parámetro que recibe una cifra (en un sitio de llamada del
       * paquete o por su valor por defecto derivado) hace derivado a
       * ese nombre SOLO dentro del cuerpo de su función, y ahí sus
       * usos se juzgan con las formas de la casa (la llamada al
       * formateador la juzga judgedCall; la interpolación cruda
       * acusa). Fuera del cuerpo el nombre no deriva: la primera
       * forma de esta cura inyectó el parámetro al archivo entero y
       * el árbol vivo acusó superficies sanas con nombres comunes
       * (id, name, days, d) — la puerta es de la función, no del
       * archivo, y esta segunda forma queda clavada por ese mismo
       * árbol vivo, que vuelve a correr limpio. */
      for (const d of funDecls) {
        if (d.file !== fi) continue;
        const flowed = paramFlow.get(d.name);
        if (!flowed || flowed.size === 0) continue;
        const body = funBodies.find(([n]) => n === d.name)?.[1];
        if (!body) continue;
        const extra = new Set(derived);
        for (const i of flowed) {
          const p = d.params[i];
          if (!p) continue;
          // un parámetro cuyo tipo declarado es una clase con cifras
          // (Snap, Pace, Due…) es un RECEPTOR, no el valor: su nombre
          // desnudo no deriva — sus accesos ya los juzgan accessRe y
          // las cadenas. Solo el parámetro escalar (Long, String, sin
          // tipo) ES la cifra que entró por la puerta.
          const tbase = (p.type ?? "").replace(/[<>?,]/g, " ").split(/\s+/).filter(Boolean).pop();
          if (tbase && (tipos.has(resolveComposed(tbase, d.file)) || propTypes.has(resolveComposed(tbase, d.file)))) continue;
          extra.add(p.name);
        }
        const spanDerived = (e: string): boolean =>
          accessRe.test(e) || (chainRe !== null && chainRe.test(e)) ||
          [...extra].some((w) => new RegExp(`\\b${w}\\b`).test(e)) ||
          [...helpers].some((fn) => new RegExp(`\\b${fn}\\s*\\(`).test(e));
        for (const m of body.matchAll(new RegExp(`\\b(?:${spellRe})\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[2]!.includes(":")) continue;
          if (fmtFormatters.has(m[1]!) || spanDerived(m[2]!)) judgedCall(`Fmt.${m[1]!}(${m[2]!})`);
        }
        for (const lit of scanKt(body).literals) {
          for (const m of lit.matchAll(/\$\{([^}]*)\}|\$([A-Za-z_][\w.]*)/g)) {
            const expr = m[1] ?? m[2] ?? "";
            if (fmtCallish(expr) || /(?<![\w.])money\s*\(/.test(expr)) continue;
            if ([...conduits].some((c) => new RegExp(`\\b${c}\\s*\\(`).test(expr))) continue;
            if (spanDerived(expr)) acusadas.push(`${name}: el parámetro de ${d.name} pinta una cifra sin productor: «${lit.slice(0, 60)}»`);
          }
        }
      }
    }
    /* OLA 17 (M17-7a): las entradas con SITIO se verifican contra su
     * archivo — la llamada registrada debe VIVIR ahí, en su texto
     * crudo o resuelto por las ataduras de ese archivo (la misma
     * resolución con que se juzga). Una superficie registrada que ya
     * no está en su sitio acusa como superficie muerta, con la misma
     * severidad con que la §A sentencia el asiento fantasma: borrar
     * la línea de la tasa del widget y plantar su texto en otro
     * archivo ya no corre verde. La verificación de sitios es del
     * censo del PAQUETE (sitios = true): los especímenes sueltos no
     * la invocan, salvo el que la clava (M17-7a, que la pide). */
    if (sitios) for (const [re, productor, , sitio] of SUPERFICIES_CASCARA) {
      if (!sitio) continue;
      const f = scanned.find((x) => x.name === sitio);
      if (!f) continue; // el sitio se verifica cuando su archivo está en el universo escaneado (en el paquete vivo, siempre)
      if (re.test(f.code)) continue;
      const binds = new Map<string, string>();
      for (const m of f.code.matchAll(/\b(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/g)) binds.set(m[1]!, m[2]!.trim());
      /* OLA 18 (M18-5): el sitio se lee con los nombres RESUELTOS del
       * archivo — la superficie viva re-expresada por su alias de
       * importación («F.rate(s.rateE4)») ES la llamada registrada; la
       * muerta, sin llamada en ninguna grafía, sigue acusando. */
      const fiSitio = scanned.findIndex((x) => x.name === sitio);
      const namesSitio = fmtNamesOf(fiSitio);
      // OLA 19: el sitio se lee con la misma cosecha entera del juicio
      // (la composición de capas y las propiedades de paquete): la
      // superficie re-expresada por la cadena mixta vive (M19-8b).
      const propsSitio = new Set([...fmtPropsOf(binds, new Set([...namesSitio, ...pkgFmtProps]), fmtFactories), ...[...pkgFmtProps].filter((p) => !binds.has(p))]);
      let texto = f.code;
      for (const s of namesSitio) if (s !== "Fmt") texto = texto.replace(new RegExp(`\\b${escRe18(s)}\\.`, "g"), "Fmt.");
      /* OLA 21 (M21-5): la reescritura del sitio respeta el mismo
       * dueño que el juicio — `w.fmt.` con w declarado de una clase
       * cuya `fmt` es Otro NO se reescribe a «Fmt.»: la superficie
       * registrada no vive en una llamada de la clase ajena, y
       * declararla viva por la homónima era la absolución falsa. */
      const receiversSitio = new Map<string, string>();
      // OLA 22 (M22-2): el sitio guarda los argumentos del receptor,
      // como el juicio — la sustitución genérica es la misma.
      const receiverArgsSitio = new Map<string, string[]>();
      for (const m of f.code.matchAll(new RegExp(`\\b(\\w+)\\s*:\\s*(${receiverTypeNames})\\b\\s*(?:<((?:[^<>]|<[^<>]*>)*)>)?`, "g"))) {
        receiversSitio.set(m[1]!, resolveWrittenType(m[2]!, fiSitio));
        if (m[3] !== undefined) receiverArgsSitio.set(m[1]!, parseTipoExpr(`X<${m[3]}>`).args.map((a) => resuelveExprTipo(a, fiSitio)));
      }
      // OLA 23 (M23-3b): el sitio juzga al dueño por la MISMA cadena
      // que el juicio — un solo caminante para las dos mitades.
      const bloqueadaSitio = (r: string, prop: string): boolean => bloqueadaPorCadenaEn(receiversSitio, receiverArgsSitio, r, prop);
      for (const p of propsSitio) {
        texto = texto.replace(new RegExp(`\\b(\\w+)\\.${escRe18(p)}\\.`, "g"), (whole: string, r: string) => (bloqueadaSitio(r, p) ? whole : "Fmt."));
        texto = texto.replace(new RegExp(`(?<![\\w.])${escRe18(p)}\\.`, "g"), "Fmt.");
      }
      /* OLA 22 (M22-2): la superficie deletreada por una propiedad
       * GENÉRICA vive si el argumento de su receptor la ata a Fmt —
       * la reescritura pasa por la misma puerta del dueño (con
       * `Caja<Otro>` la llamada queda como está y no salva el
       * sitio). Sin receptor no hay reescritura: la forma desnuda
       * de una propiedad genérica no promete a Fmt. */
      for (const p of genericProps) {
        // OLA 23 (M23-3b): la reescritura camina el camino entero del
        // receptor, como el juicio — `c.fmt.fmt.` con c: Caja<Caja<Fmt>>
        // ES la superficie del formateador en su sitio.
        texto = texto.replace(new RegExp(`\\b(\\w+(?:\\.\\w+)*)\\.${escRe18(p)}\\.`, "g"), (whole: string, r: string) => (bloqueadaSitio(r, p) ? whole : "Fmt."));
      }
      /* OLA 20 (Asesor, hallazgo 3): el sitio se lee también con los
       * alias de MIEMBRO del archivo — la superficie viva re-expresada
       * como llamada desnuda renombrada («tasa20(s.rateE4)» por
       * `import …Fmt.rate as tasa20`) ES la llamada registrada: el
       * juicio ya la absolvía como llamada del productor (M19-6) y la
       * verificación la declaraba muerta — las dos mitades se
       * contradecían sobre la grafía que la cura 19 creó para una de
       * ellas. La muerta de verdad, sin llamada en ninguna grafía,
       * sigue acusando (M20-8c). */
      for (const [bare, fn] of memberAliasesOf(fiSitio)) {
        texto = texto.replace(new RegExp(`(?<![\\w.])${escRe18(bare)}\\s*\\(`, "g"), `Fmt.${fn}(`);
      }
      /* OLA 21 (M21-7): el sitio aprende la grafía de REFERENCIA — el
       * juicio absolvía `val r = Fmt::rate; r(s.rateE4)` como la
       * llamada registrada desde la ola 17 (M17-4), pero la
       * verificación de sitios nunca aprendió esa grafía y declaraba
       * muerta la superficie viva re-expresada por referencia: la
       * contradicción de M20-8, una grafía más allá. Aquí toda atadura
       * `val x = <Fmt>::<fn>` del archivo del sitio reescribe las
       * llamadas de x a su llamada canónica, y juicio y verificación
       * coinciden en las cuatro grafías (nombre, alias, miembro,
       * referencia). La muerta sin llamada en ninguna grafía sigue
       * acusando. */
      const spellSitio = [...namesSitio].map(escRe18).join("|");
      /* OLA 22 (M22-4): el sitio cierra la referencia sobre la
       * identidad, como el juicio — el mapa directo más la cadena
       * `val t = r` a punto fijo sobre las ataduras del archivo, y
       * cada nombre resuelto reescribe sus llamadas a la canónica:
       * la superficie viva deletreada por la cadena vive, y juicio y
       * verificación dejan de contradecirse sobre la misma grafía. */
      const refsSitio = new Map<string, string>();
      for (const m of f.code.matchAll(new RegExp(`\\b(?:val|var)\\s+(\\w+)\\s*=\\s*(?:${spellSitio})::(\\w+)\\b`, "g"))) {
        refsSitio.set(m[1]!, m[2]!);
      }
      // OLA 23 (M23-2): la herencia de paquete, también en el sitio —
      // la superficie deletreada por una cadena con un eslabón en otro
      // archivo vive; la que no tiene llamada en ninguna grafía ni
      // cadena sigue acusando, como siempre.
      for (const [n, fn] of pkgRefsResueltas) {
        if (!binds.has(n) && !refsSitio.has(n)) refsSitio.set(n, fn);
      }
      for (;;) {
        let grew = false;
        for (const [n, rhs] of binds) {
          if (refsSitio.has(n)) continue;
          const clean = rhs.trim();
          if (/^\w+$/.test(clean) && refsSitio.has(clean)) { refsSitio.set(n, refsSitio.get(clean)!); grew = true; }
        }
        if (!grew) break;
      }
      for (const [alias, target] of refsSitio) {
        texto = texto.replace(new RegExp(`(?<![\\w.])${escRe18(alias)}\\s*\\(`, "g"), `Fmt.${target}(`);
      }
      if (re.test(texto)) continue;
      for (let r = 0; r < 4; r++) {
        let changed = false;
        for (const [n, rhs] of binds) {
          texto = texto.replace(new RegExp(`(?<![\\w.])${n}(?![\\w(])`, "g"), () => { changed = true; return rhs; });
        }
        if (!changed) break;
      }
      if (!re.test(texto)) acusadas.push(`registro: la superficie «${productor}» ya no vive en su sitio (${sitio})`);
    }
    return acusadas;
  };
  const walkKtFiles = (dir: URL, prefix = ""): { name: string; text: string }[] => {
    const out: { name: string; text: string }[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) out.push(...walkKtFiles(new URL(`${e.name}/`, dir), rel));
      else if (e.name.endsWith(".kt")) out.push({ name: rel, text: readFileSync(new URL(e.name, dir), "utf8") });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  };
  it("el censo de la cáscara: ninguna cifra nativa sin productor ni clase declarados, en todo el paquete y en cualquier forma", () => {
    const dir = new URL("../../../android/app/src/main/java/com/oscarvelz/faro/", import.meta.url);
    const files = walkKtFiles(dir);
    assert.ok(files.length >= 5, "el universo es el paquete entero, caminando el árbol");
    for (const known of ["FaroNotify.kt", "FaroWidgets.kt", "MainActivity.kt", "QuickAdd.kt", "WidgetConfigActivity.kt"]) {
      assert.ok(files.some((f) => f.name === known), `el universo camina ${known}`);
    }
    assert.deepEqual(censoCascara(files, true), [], "cifras sin productor declarado");
  });
  it("la semilla de tipos dice la verdad de las declaraciones vivas (los campos Long de cada tipo de la foto)", () => {
    const kt = readFileSync(new URL("../../../android/app/src/main/java/com/oscarvelz/faro/FaroWidgets.kt", import.meta.url), "utf8");
    for (const [tipo, semilla] of Object.entries(CASCARA_TIPOS_SEMILLA)) {
      const at = kt.search(new RegExp(`\\bclass\\s+${tipo}\\b`));
      assert.ok(at >= 0, `${tipo}: la clase vive en FaroWidgets.kt`);
      // la región de la clase: hasta la siguiente declaración de clase u
      // objeto al mismo nivel (las clases de la foto viven en columna)
      const rest = kt.slice(at + 6);
      const nextAt = rest.search(/\n(?:class|object)\s+\w+/);
      const region = nextAt < 0 ? rest : rest.slice(0, nextAt);
      const declared = new Set<string>();
      for (const m of region.matchAll(/\bval\s+(\w+)\s*:\s*Long\??\b/g)) declared.add(m[1]!);
      for (const m of region.matchAll(/\bval\s+(\w+)\s*:\s*Long\s+get\(\)/g)) declared.add(m[1]!);
      assert.deepEqual([...declared].sort(), [...semilla].sort(), `${tipo}: la semilla del censo y la clase declaran los mismos campos de dinero`);
    }
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
  it("especímenes M16 (ola 16): el censo por construcción caza los nueve escapes de la caza", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\"; fun daysWord(n: Long, en: Boolean): String = \"\" }",
    };
    const caza = (text: string) => censoCascara([fmtDecl, { name: "Spec.kt", text }]);
    // M16-0 (control): la forma de la ola 15 sigue acusando en el censo nuevo
    assert.equal(caza("class W { fun a(s: Snap) = \"−C$${s.spend / 100}\" }").length, 1, "M16-0: la interpolación cruda de siempre acusa");
    // M16-2: un formateador numérico de Fmt que la enumeración no nombraba
    assert.ok(caza("class W { fun a(s: Snap) = Fmt.rate(s.spent) }").length >= 1, "M16-2: Fmt.rate sobre el gasto no nombra productor de tasa: acusa");
    assert.deepEqual(caza("class W { fun a(s: Snap) = Fmt.rate(s.rateE4) }"), [], "control: la llamada viva de la tasa (FaroWidgets.kt:575) está registrada y absuelve");
    assert.deepEqual(caza("class W { fun a(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }"), [], "control: el ejemplo «US$100 = …» (línea 579) está registrado y absuelve");
    // M16-3: StringBuilder/append
    assert.ok(caza("class W { fun a(s: Snap): String { val b = StringBuilder(); b.append(s.spent); return b.toString() } }").length >= 1, "M16-3: el append de una cifra acusa");
    // M16-4: DecimalFormat local
    assert.ok(caza("class W { fun a(s: Snap) = DecimalFormat(\"0.00\").format(s.spent / 100.0) }").length >= 1, "M16-4: el DecimalFormat local acusa");
    assert.ok(caza("class W { val df = DecimalFormat(\"0.00\"); fun a(s: Snap) = df.format(s.spent / 100.0) }").length >= 1, "M16-4b: el formateador local con nombre acusa");
    // M16-5: String.format por extensión
    assert.ok(caza("class W { fun a(s: Snap) = \"%.2f\".format(s.spent / 100.0) }").length >= 1, "M16-5: el String.format por extensión acusa");
    // M16-6: el local renombrado
    assert.ok(caza("class W { fun a(s: Snap): String { val gastado = s.spent; return \"Gastado: $gastado\" } }").length >= 1, "M16-6: la cifra con nombre local sigue derivando de la foto: acusa");
    // M16-7: el receptor por su tipo, no por su nombre
    assert.ok(caza("class W { fun a(foto: Snap) = \"${foto.spent}\" }").length >= 1, "M16-7: el receptor se resuelve por su tipo declarado (Snap), se llame foto o s");
    // M16-8: el ayudante que compone la cifra
    assert.ok(caza("class W { fun crudo(s: Snap) = s.spent / 100; fun a(s: Snap) = \"C$${crudo(s)}\" }").length >= 1, "M16-8: el valor se sigue a través del ayudante: acusa");
    // M16-9: la concatenación en un Log
    assert.ok(caza("class W { fun a(s: Snap) { Log.d(\"Faro\", \"spent=\" + s.spent) } }").length >= 1, "M16-9: la cifra concatenada en un log acusa");
    // y los sanos de siempre: el productor registrado, el porcentaje, la fecha
    assert.deepEqual(caza("class W { fun a(s: Snap) = Fmt.money(s.spent, s.cur) }"), [], "sano: el gasto por su productor registrado absuelve");
    assert.deepEqual(caza("class W { fun a(s: Snap) = \"${s.usedPct}%\" }"), [], "sano: el porcentaje de la foto no es una cifra de dinero");
  });
  it("espécimen M16-1: el universo camina el ÁRBOL — una cifra sucia en un subdirectorio acusa por su nombre", () => {
    const root = mkdtempSync(join(tmpdir(), "faro-cascara16-"));
    mkdirSync(join(root, "sub"), { recursive: true });
    writeFileSync(join(root, "Limpio.kt"), "class L { fun a(s: Snap) = Fmt.money(s.spent, s.cur) }");
    writeFileSync(join(root, "sub", "Sucio.kt"), "class S { fun a(s: Snap) = \"${s.spent}\" }");
    const files = walkKtFiles(new URL(`file://${root}/`));
    assert.deepEqual(files.map((f) => f.name), ["Limpio.kt", "sub/Sucio.kt"], "la caminata es recursiva y nombra la ruta entera");
    const fmtDecl = { name: "Fmt.kt", text: "object Fmt { fun money(minor: Long, cur: String): String = \"\" }" };
    const acus = censoCascara([fmtDecl, ...files]);
    assert.ok(acus.some((a) => a.startsWith("sub/Sucio.kt")), `la cifra del subdirectorio acusa por su nombre: ${acus.join(" | ")}`);
  });
  it("especímenes M17 (ola 17): el censo sigue el valor hacia adentro, entre archivos, por parámetros y por referencia — y el registro ata a la llamada resuelta en su sitio", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\" }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M17-1: la atadura de identidad — la foto entera bajo otro nombre
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(s: Snap): String { val mismo = s; return \"Debes ${mismo.spent}\" } }" }]).length >= 1,
      "M17-1: val mismo = s ya no esconde la foto: el alias ES el receptor y su interpolación acusa");
    // M17-2: la clase de datos intermedia construida en OTRO archivo
    const caja = { name: "Caja.kt", text: "class CajaM17(val monto: Long); fun cajaDe(s: Snap) = CajaM17(s.spent)" };
    const pintor = { name: "Pintor.kt", text: "class W { fun a(s: Snap): String { val c = cajaDe(s); return \"Debes ${c.monto}\" } }" };
    assert.ok(caza([caja, pintor]).length >= 1, "M17-2: el valor que cruza dentro de un objeto construido en otro archivo acusa");
    // M17-2c (control de la caza): la misma construcción en un solo archivo acusaba y acusa
    assert.ok(caza([{ name: "Uno.kt", text: "class CajaM17(val monto: Long); fun cajaDe(s: Snap) = CajaM17(s.spent); class W { fun a(s: Snap): String { val c = cajaDe(s); return \"Debes ${c.monto}\" } }" }]).length >= 1,
      "M17-2c: el control de un archivo acusa, como en la caza");
    // M17-3a: el parámetro que entra por un sitio de llamada
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun pinta(monto: Long) = \"Debes $monto\"; fun a(s: Snap) = pinta(s.spent) }" }]).length >= 1,
      "M17-3a: el parámetro llenado con una cifra en su llamada es puerta: el cuerpo que lo pinta acusa");
    // M17-3b: el parámetro con valor por defecto derivado
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun b(s: Snap, monto: Long = s.spent) = \"Debes $monto\" }" }]).length >= 1,
      "M17-3b: el valor por defecto derivado abre la misma puerta");
    // M17-4: el formateador por referencia — juzgado como la llamada que es, en las dos direcciones
    assert.deepEqual(caza([{ name: "Spec.kt", text: "class W { val f = Fmt::money; fun a(s: Snap) = f(s.spent, s.cur) }" }]), [],
      "M17-4: val f = Fmt::money y f(s.spent, …) ES la llamada registrada del gasto: absuelve por su nombre");
    assert.ok(caza([{ name: "Spec.kt", text: "class W { val f = Fmt::money; fun a(s: Snap) = f(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M17-4b: la misma referencia con un productor no declarado acusa");
    // M17-5a: la plantilla pintada con replace de un reemplazo derivado
    assert.ok(caza([
      { name: "Plantilla.kt", text: "const val DEUDA = \"Debes {m}\"" },
      { name: "Pintor.kt", text: "class W { fun a(s: Snap) = DEUDA.replace(\"{m}\", s.spent.toString()) }" },
    ]).length >= 1, "M17-5a: el replace con reemplazo derivado imprime la cifra sin productor: acusa");
    // M17-5b: String.format con %s sobre una cifra
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(s: Snap) = String.format(\"Debes %s\", s.spent) }" }]).length >= 1,
      "M17-5b: el %s imprime los mismos dígitos que el %d: acusa");
    // M17-6b: la cadena cuya declaración vive en OTRO archivo — resuelta por el tipo de la propiedad
    assert.ok(caza([
      { name: "Sobre.kt", text: "class SobreM17(val foto: Snap)" },
      { name: "Pintor.kt", text: "class W { fun a(h: SobreM17) = \"Debes ${h.foto.spent}\" }" },
    ]).length >= 1, "M17-6b: h.foto.spent se resuelve por la declaración (foto: Snap), nazca donde nazca");
    // M17-6 (control de la caza): la misma cadena en un solo archivo acusaba y acusa — ahora por resolución
    assert.ok(caza([{ name: "Uno.kt", text: "class SobreM17(val foto: Snap); class W { fun a(h: SobreM17) = \"Debes ${h.foto.spent}\" }" }]).length >= 1,
      "M17-6: el control de un archivo acusa, como en la caza");
    // M17-7b: la re-expresión inocente del mismo productor absuelve por su nombre
    assert.deepEqual(caza([{ name: "FaroWidgets.kt", text: "class W { fun a(s: Snap): String { val r4 = s.rateE4; return Fmt.rate(r4) }; fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" }]), [],
      "M17-7b: Fmt.rate(r4) con r4 = s.rateE4 ES la llamada registrada de la tasa: absuelve resuelta");
    // M17-7a: la superficie muerta — su texto plantado en otro archivo no la salva
    const sinTasa = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "class N { fun a(s: Snap) = Fmt.rate(s.rateE4) }" },
    ], true);
    assert.ok(sinTasa.some((a) => a.includes("ya no vive en su sitio")), `M17-7a: la entrada de la tasa acusa su sitio vacío: ${sinTasa.join(" | ")}`);
  });
  it("especímenes M18 (ola 18): la capa de nombres — alias de importación, typealias en cadena y el formateador en una propiedad se juzgan por su nombre resuelto", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\" }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M18-1: el alias de importación del formateador
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt as F\nclass W { fun a(s: Snap) = F.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M18-1: F.money(…) con F = alias de Fmt ES Fmt.money: el productor no declarado acusa por su nombre resuelto");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt as F\nclass W { fun a(s: Snap) = F.money(s.spent, s.cur) }" }]), [],
      "M18-1c (control): el alias con el productor registrado absuelve");
    // M18-1b: el typealias del objeto formateador
    assert.ok(caza([{ name: "Spec.kt", text: "typealias FmtCasa = Fmt\nclass W { fun a(s: Snap) = FmtCasa.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M18-1b: el typealias del formateador se resuelve: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "typealias FmtCasa = Fmt\nclass W { fun a(s: Snap) = FmtCasa.money(s.spent, s.cur) }" }]), [],
      "M18-1b-c (control): el typealias con el productor registrado absuelve");
    // M18-2: el typealias del tipo foto — el receptor entero se apagaba
    assert.ok(caza([{ name: "Spec.kt", text: "typealias Foto = Snap\nclass W { fun a(x: Foto) = \"Debes ${x.spent}\" }" }]).length >= 1,
      "M18-2: x: Foto ES un receptor de la foto: su interpolación cruda acusa");
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(x: Snap) = \"Debes ${x.spent}\" }" }]).length >= 1,
      "M18-2c (control de la caza): la misma geometría con el nombre canónico acusaba y acusa");
    // M18-3: el formateador guardado en una propiedad — local y de companion
    assert.ok(caza([{ name: "Spec.kt", text: "class W { val fmt = Fmt; fun a(s: Snap) = fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M18-3: val fmt = Fmt hace de fmt.money una llamada al formateador: acusa");
    assert.ok(caza([{ name: "Spec.kt", text: "class CasaM18 { companion object { val fmt = Fmt }; fun a(s: Snap) = CasaM18.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M18-3b: la propiedad del companion juzga igual a través de su clase: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "class W { val fmt = Fmt; fun a(s: Snap) = fmt.money(s.spent, s.cur) }" }]), [],
      "M18-3c (control): la propiedad con el productor registrado absuelve");
    // M18-4: el typealias dentro de la cadena, entre archivos
    assert.ok(caza([
      { name: "Sobre.kt", text: "typealias Foto = Snap\nclass SobreM18(val foto: Foto)" },
      { name: "Pintor.kt", text: "class W { fun a(h: SobreM18) = \"Debes ${h.foto.spent}\" }" },
    ]).length >= 1, "M18-4: h.foto.spent se resuelve a través del typealias declarado en otro archivo: acusa");
    // M18-5: la verificación de sitios resuelve el nombre — la superficie viva por alias absuelve…
    const vivaAlias = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "import com.oscarvelz.faro.Fmt as F\nclass W { fun a(s: Snap) = F.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaAlias.some((a) => a.includes("ya no vive en su sitio")), `M18-5: F.rate(s.rateE4) bajo su alias ES la superficie registrada en su sitio: ${vivaAlias.join(" | ")}`);
    // …y la muerta, sin llamada en ninguna grafía, sigue acusando
    const muerta = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "import com.oscarvelz.faro.Fmt as F\nclass N { fun a(s: Snap) = F.rate(s.rateE4) }" },
    ], true);
    assert.ok(muerta.some((a) => a.includes("ya no vive en su sitio")), `M18-5b: la tasa plantada en otro archivo, aunque sea por alias, no salva su sitio vacío: ${muerta.join(" | ")}`);
  });
  it("especímenes M19 (ola 19): el CRUCE de capas — la resolución compone en cada salto, y las tres grafías sin cosechar ya se juzgan", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\" }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M19-4: la cadena mixta del tipo foto — typealias que aterriza en un alias de importación
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Snap as FotoBase\ntypealias Foto = FotoBase\nclass W { fun a(x: Foto) = \"Debes ${x.spent}\" }" }]).length >= 1,
      "M19-4: Foto = FotoBase (alias de Snap) ES un receptor de la foto: la cadena cruza de capa y su interpolación cruda acusa");
    // M19-4c (control de la caza): el mismo receptor escrito con el alias de importación acusaba y acusa
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Snap as FotoBase\nclass W { fun a(x: FotoBase) = \"Debes ${x.spent}\" }" }]).length >= 1,
      "M19-4c: x: FotoBase acusa, como en la caza");
    // M19-10: la cadena mixta hasta el formateador, en las dos direcciones
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt as FmtBase\ntypealias FmtCasa = FmtBase\nclass W { fun a(s: Snap) = FmtCasa.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M19-10: FmtCasa = FmtBase (alias de Fmt) ES Fmt: la cifra sin productor por el alias compuesto acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt as FmtBase\ntypealias FmtCasa = FmtBase\nclass W { fun a(s: Snap) = FmtCasa.money(s.spent, s.cur) }" }]), [],
      "M19-10c (control): la misma cadena mixta con el productor registrado absuelve");
    // M19-5: el tipo de la propiedad escrito con alias en el archivo DECLARANTE de la clase
    assert.ok(caza([
      { name: "Sobre.kt", text: "import com.oscarvelz.faro.Snap as Foto\nclass SobreM19(val foto: Foto)" },
      { name: "Pintor.kt", text: "class W { fun a(h: SobreM19) = \"Debes ${h.foto.spent}\" }" },
    ]).length >= 1, "M19-5: h.foto.spent se resuelve con los alias del archivo que declara la clase: acusa");
    // M19-6: el alias de importación de un MIEMBRO — la llamada desnuda renombrada
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt.money as plata\nclass W { fun a(s: Snap) = plata(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M19-6: plata(…) ES Fmt.money(…): la cifra sin productor por el alias de miembro acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt.money as plata\nclass W { fun a(s: Snap) = plata(s.spent, s.cur) }" }]), [],
      "M19-6c (control): el alias de miembro con el productor registrado absuelve");
    // M19-7: el formateador en una propiedad atada a nivel de paquete en OTRO archivo
    assert.ok(caza([
      { name: "Casa.kt", text: "val fmtCasa = Fmt" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = fmtCasa.money(s.owed - s.spent, s.cur) }" },
    ]).length >= 1, "M19-7: la atadura de paquete se cosecha como los typealias: fmtCasa.money acusa desde otro archivo");
    // M19-7c (control de la caza): la misma atadura en el mismo archivo acusaba y acusa
    assert.ok(caza([{ name: "Spec.kt", text: "val fmtCasa = Fmt\nclass W { fun a(s: Snap) = fmtCasa.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M19-7c: la atadura de nivel superior en el mismo archivo acusa, como en la caza");
    // M19-8b: la verificación de sitios con la composición — la superficie viva por la cadena mixta absuelve…
    const vivaMixta = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "import com.oscarvelz.faro.Fmt as FmtBase\nclass W { fun a(s: Snap) = FmtCasa.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "Aliases.kt", text: "typealias FmtCasa = FmtBase" },
    ], true);
    assert.ok(!vivaMixta.some((a) => a.includes("ya no vive en su sitio")), `M19-8b: FmtCasa.rate(s.rateE4) por la cadena mixta ES la superficie registrada en su sitio: ${vivaMixta.join(" | ")}`);
    // …y la muerta por la misma cadena sigue acusando su sitio vacío
    const muertaMixta = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "import com.oscarvelz.faro.Fmt as FmtBase\ntypealias FmtCasa = FmtBase\nclass N { fun a(s: Snap) = FmtCasa.rate(s.rateE4) }" },
    ], true);
    assert.ok(muertaMixta.some((a) => a.includes("ya no vive en su sitio")), `M19-8b-c: la tasa por la cadena mixta plantada en otro archivo no salva su sitio vacío: ${muertaMixta.join(" | ")}`);
  });
  it("especímenes M20 (ola 20): la cadena de propiedades a punto fijo, el productor en posición tipada, el sitio que conoce el alias de miembro y el resolvedor sin tope", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\" }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M20-3b: la cadena de propiedades en el mismo archivo — fmtB = fmtA ES el formateador
    assert.ok(caza([{ name: "Spec.kt", text: "val fmtA = Fmt\nval fmtB = fmtA\nclass W { fun a(s: Snap) = fmtB.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M20-3b: val fmtB = fmtA hace de fmtB.money una llamada al formateador: la cosecha a punto fijo acusa");
    // M20-3: la misma cadena entre archivos
    assert.ok(caza([
      { name: "Casa.kt", text: "val fmtA = Fmt" },
      { name: "Puente.kt", text: "val fmtB = fmtA" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = fmtB.money(s.owed - s.spent, s.cur) }" },
    ]).length >= 1, "M20-3: la cadena de propiedades cruza archivos a punto fijo de paquete: acusa");
    assert.deepEqual(caza([
      { name: "Casa.kt", text: "val fmtA = Fmt" },
      { name: "Puente.kt", text: "val fmtB = fmtA" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = fmtB.money(s.spent, s.cur) }" },
    ]), [], "M20-3c (control): la cadena con el productor registrado absuelve");
    // M20-4: el productor como PARÁMETRO tipado
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(fmt: Fmt, s: Snap) = fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M20-4: fun a(fmt: Fmt, …) — el parámetro ES el formateador dentro de su función: acusa");
    // M20-4b: el parámetro tipado por typealias
    assert.ok(caza([{ name: "Spec.kt", text: "typealias FmtCasa = Fmt\nclass W { fun a(fmt: FmtCasa, s: Snap) = fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M20-4b: el tipo del parámetro se resuelve compuesto: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "class W { fun a(fmt: Fmt, s: Snap) = fmt.money(s.spent, s.cur) }" }]), [],
      "M20-4c (control): el parámetro-formateador con el productor registrado absuelve");
    // M20-5: la propiedad de CONSTRUCTOR tipada, usada desde otro archivo
    assert.ok(caza([
      { name: "Casa.kt", text: "class Casa20(val fmt: Fmt)" },
      { name: "Spec.kt", text: "class W { fun a(c: Casa20, s: Snap) = c.fmt.money(s.owed - s.spent, s.cur) }" },
    ]).length >= 1, "M20-5: class Casa20(val fmt: Fmt) — propTypes responde también por el formateador: c.fmt.money acusa");
    // M20-6: el miembro de un OBJETO atado al formateador
    assert.ok(caza([
      { name: "Casa.kt", text: "object Casa20b { val fmt = Fmt }" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = Casa20b.fmt.money(s.owed - s.spent, s.cur) }" },
    ]).length >= 1, "M20-6: la atadura tras la llave del objeto se cosecha a nivel de paquete: acusa");
    // M20-8: la verificación de sitios conoce el alias de miembro — la viva por alias absuelve en su sitio…
    const vivaTasa = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "import com.oscarvelz.faro.Fmt.rate as tasa20\nclass W { fun a(s: Snap) = tasa20(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaTasa.some((a) => a.includes("ya no vive en su sitio")), `M20-8: tasa20(s.rateE4) por su alias de miembro ES la superficie registrada en su sitio: ${vivaTasa.join(" | ")}`);
    // …y la muerta con el alias presente sigue acusando
    const muertaTasa = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "import com.oscarvelz.faro.Fmt.rate as tasa20\nclass W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "import com.oscarvelz.faro.Fmt.rate as tasa20\nclass N { fun a(s: Snap) = tasa20(s.rateE4) }" },
    ], true);
    assert.ok(muertaTasa.some((a) => a.includes("ya no vive en su sitio")), `M20-8c (control): la tasa por alias plantada en otro archivo no salva su sitio vacío: ${muertaTasa.join(" | ")}`);
    // M20-9: la cadena de ONCE typealias — el tope levantado la resuelve entera
    const chain = Array.from({ length: 11 }, (_, i) => "typealias A" + (i + 1) + " = " + (i === 0 ? "Fmt" : "A" + i)).join("\n");
    const specChain = (arg: string) => chain + "\nclass W { fun a(s: Snap) = A11.money(" + arg + ", s.cur) }";
    assert.ok(caza([{ name: "Spec.kt", text: specChain("s.owed - s.spent") }]).length >= 1,
      "M20-9: once eslabones ya no corren verdes: el resolvedor a punto fijo llega a Fmt y acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: specChain("s.spent") }]), [],
      "M20-9c (control): la cadena de once con el productor registrado absuelve — resuelta, no detenida");
  });
  it("especímenes M21 (ola 21): el tope muerto en los tres bucles, la referencia en el sitio, el tipo declarado de la atadura, el ciclo por (nombre, contexto) y la propiedad con dueño", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\" }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M21-4: la cadena de propiedades de NUEVE archivos en orden inverso —
    // el bucle de paquete iteraba `round < 8` con `grew` ya calculado: el
    // noveno eslabón nunca se cosechaba y su superficie corría verde.
    const links: { name: string; text: string }[] = [];
    for (let i = 9; i >= 1; i--) links.push({ name: `L${i}.kt`, text: `val f${i} = ${i === 1 ? "Fmt" : `f${i - 1}`}` });
    const specF9 = (arg: string) => ({ name: "Spec.kt", text: `class W { fun a(s: Snap) = f9.money(${arg}, s.cur) }` });
    assert.ok(caza([specF9("s.owed - s.spent"), ...links]).length >= 1,
      "M21-4: nueve eslabones entre archivos se cosechan enteros: f9.money sin productor acusa");
    assert.deepEqual(caza([specF9("s.spent"), ...links]), [],
      "M21-4c (control): la misma cadena de nueve con el productor registrado absuelve");
    // M21-4b: el bucle LOCAL de valores, la misma enfermedad — nueve
    // ataduras en orden inverso dentro de un archivo.
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(s: Snap): String { val v9 = v8; val v8 = v7; val v7 = v6; val v6 = v5; val v5 = v4; val v4 = v3; val v3 = v2; val v2 = v1; val v1 = s.spent; return \"Debes $v9\" } }" }]).length >= 1,
      "M21-4b: la derivación local itera a punto fijo: la novena atadura inversa deriva y su interpolación acusa");
    // M21-6: la atadura con TIPO DECLARADO y valor opaco ES el formateador
    assert.ok(caza([{ name: "Spec.kt", text: "class W { val f: Fmt = makeFmt(); fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M21-6: val f: Fmt = makeFmt() — manda la declaración, no el valor: f.money sin productor acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "class W { val f: Fmt = makeFmt(); fun a(s: Snap) = f.money(s.spent, s.cur) }" }]), [],
      "M21-6c (control): la atadura tipada con el productor registrado absuelve");
    assert.ok(caza([{ name: "Spec.kt", text: "typealias MiFmt = Fmt\nclass W { val f: MiFmt = makeFmt(); fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M21-6b: el tipo declarado se resuelve compuesto (MiFmt = Fmt): acusa");
    assert.ok(caza([
      { name: "Casa.kt", text: "object Casa21 { val f: Fmt = makeFmt() }" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = Casa21.f.money(s.owed - s.spent, s.cur) }" },
    ]).length >= 1, "M21-6d: el miembro tipado de un objeto se cosecha a nivel de paquete: Casa21.f.money acusa desde otro archivo");
    // M21-2c: la guarda de ciclo por (nombre, contexto) — X en el archivo B
    // es alias de Snap; la cadena que llega a X desde el archivo A no muere
    // por haber visitado X en A, donde era un typealias.
    assert.ok(caza([
      { name: "A.kt", text: "import com.oscarvelz.faro.Z as Y\ntypealias X = Y\nclass W { fun a(q: X) = \"Debes ${q.spent}\" }" },
      { name: "B.kt", text: "import com.oscarvelz.faro.Snap as X\ntypealias Z = X" },
    ]).length >= 1, "M21-2c: la cadena X→Y→Z→X(B)→Snap se resuelve en el contexto de cada archivo: el receptor ES la foto y su interpolación acusa");
    // M21-5: la propiedad homónima de una clase ajena ni acusa ni absuelve
    const casas = { name: "Casa.kt", text: "class Otro { fun money(x: Long, c: String): String = \"\"; fun rate(e4: Long): String = \"\" }\nclass SinFmt(val fmt: Otro)\nclass CasaFmt(val fmt: Fmt)" };
    assert.deepEqual(caza([casas, { name: "Spec.kt", text: "class W { fun a(s: Snap, w: SinFmt) = w.fmt.money(s.owed - s.spent, s.cur) }" }]), [],
      "M21-5: w.fmt.money con w: SinFmt (fmt: Otro) NO es una llamada a Fmt: el registro de Fmt no acusa a la clase ajena");
    assert.ok(caza([casas, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: CasaFmt) = c.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M21-5c (control): la misma grafía con el dueño verdadero (fmt: Fmt) sigue juzgándose: acusa");
    const sitioAjeno = censoCascara([fmtDecl, casas,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap, w: SinFmt) = w.fmt.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(sitioAjeno.some((a) => a.includes("ya no vive en su sitio")),
      `M21-5b: la tasa «viva» solo por la propiedad homónima ajena no salva su sitio: ${sitioAjeno.join(" | ")}`);
    // M21-7: la verificación de sitios conoce la grafía de referencia
    const vivaRef = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { val r = Fmt::rate; fun a(s: Snap) = r(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaRef.some((a) => a.includes("ya no vive en su sitio")),
      `M21-7: val r = Fmt::rate; r(s.rateE4) ES la superficie registrada en su sitio — juicio y verificación coinciden: ${vivaRef.join(" | ")}`);
    const muertaRef = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "class N { val r = Fmt::rate; fun a(s: Snap) = r(s.rateE4) }" },
    ], true);
    assert.ok(muertaRef.some((a) => a.includes("ya no vive en su sitio")),
      "M21-7c (control): la tasa por referencia plantada en otro archivo no salva su sitio vacío");
  });
  it("especímenes M22 (ola 22): la identidad cerrada en las dos mitades, la fábrica por su retorno, el dueño genérico en su sitio de uso y la propiedad-función de la casa", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\"; val rateFn: (Long) -> String = { \"\" } }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M22-4 (juicio): la cadena de identidad sobre la referencia —
    // `val t = r` hereda lo que r ata, y sus llamadas se juzgan.
    assert.ok(caza([{ name: "Spec.kt", text: "class W { val r = Fmt::rate; val t = r; fun a(s: Snap) = t(s.spent) }" }]).length >= 1,
      "M22-4: val t = r hereda la referencia — t(s.spent) ES Fmt.rate sin productor de tasa: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "class W { val r = Fmt::rate; val t = r; fun a(s: Snap) = t(s.rateE4) }" }]), [],
      "M22-4c (control): la misma cadena con el productor registrado absuelve");
    // M22-4 (sitio): la superficie viva deletreada por la cadena vive en su sitio…
    const vivaCadena = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { val r = Fmt::rate; val t = r; fun a(s: Snap) = t(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaCadena.some((a) => a.includes("ya no vive en su sitio")),
      `M22-4s: t(s.rateE4) por la cadena de identidad ES la superficie registrada en su sitio — las dos mitades coinciden: ${vivaCadena.join(" | ")}`);
    // …y la muerta con la cadena plantada en otro archivo sigue acusando
    const muertaCadena = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "class N { val r = Fmt::rate; val t = r; fun a(s: Snap) = t(s.rateE4) }" },
    ], true);
    assert.ok(muertaCadena.some((a) => a.includes("ya no vive en su sitio")),
      "M22-4s-c (control): la tasa por la cadena en otro archivo no salva su sitio vacío");
    // M22-3: la fábrica y el envoltorio atan por su RETORNO declarado
    assert.ok(caza([{ name: "Spec.kt", text: "fun makeFmt(): Fmt = Fmt\nclass W { val f = makeFmt(); fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M22-3: val f = makeFmt() ata f a Fmt por el retorno declarado de la fábrica: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "fun makeFmt(): Fmt = Fmt\nclass W { val f = makeFmt(); fun a(s: Snap) = f.money(s.spent, s.cur) }" }]), [],
      "M22-3c (control): la fábrica con el productor registrado absuelve");
    assert.ok(caza([{ name: "Spec.kt", text: "fun wrap(f: Fmt): Fmt = f\nclass W { val f = wrap(Fmt); fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M22-3b: val f = wrap(Fmt) — el envoltorio devuelve Fmt por su firma: acusa");
    // M22-2: el dueño genérico se resuelve en el sitio de uso
    const cajaGen = { name: "Caja.kt", text: "class Caja<T>(val fmt: T)\nclass Otro { fun money(x: Long, c: String): String = \"\" }" };
    assert.ok(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Fmt>) = c.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M22-2: Caja<Fmt> ata la propiedad al registro de Fmt: c.fmt.money sin productor acusa");
    assert.deepEqual(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Fmt>) = c.fmt.money(s.spent, s.cur) }" }]), [],
      "M22-2c (control): Caja<Fmt> con el productor registrado absuelve");
    assert.deepEqual(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Otro>) = c.fmt.money(s.owed - s.spent, s.cur) }" }]), [],
      "M22-2b: Caja<Otro> bloquea — la llamada es de la clase ajena y el registro de Fmt no la juzga");
    // M22-5: la propiedad de tipo función de la casa, por su alias de
    // miembro, acusa exactamente como su llamada directa
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt.rateFn as tasa\nclass W { fun a(s: Snap) = tasa(s.spent) }" }]).length >= 1,
      "M22-5: el alias de la propiedad-función (tasa = Fmt.rateFn) imprime el gasto sin productor: acusa");
    assert.ok(caza([{ name: "Spec.kt", text: "import com.oscarvelz.faro.Fmt.rateFn as tasa\nclass W { fun a(s: Snap) = tasa(s.rateE4) }" }]).length >= 1,
      "M22-5b: ni con la tasa absuelve — rateFn no es la superficie registrada de Fmt.rate, en ninguna grafía");
    assert.ok(caza([{ name: "Spec.kt", text: "class W { fun a(s: Snap) = Fmt.rateFn(s.rateE4) }" }]).length >= 1,
      "M22-5c (control de la caza): la llamada directa a la propiedad-función acusaba y acusa igual — alias y directa por fin coinciden");
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
  it("especímenes M23 (ola 23): lo compuesto — el envoltorio de la fábrica, la identidad de tres eslabones entre archivos, el genérico anidado y la propiedad-función por cadena", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\"; val rateFn: (Long) -> String = { \"\" } }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M23-1a: la fábrica devuelve el ENVOLTORIO nullable — `Fmt?`
    assert.ok(caza([{ name: "Spec.kt", text: "fun makeFmt(): Fmt? = Fmt\nclass W { val f = makeFmt()!!; fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M23-1a: fun makeFmt(): Fmt? — el retorno envuelto en nullable ata igual: f.money sin productor acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "fun makeFmt(): Fmt? = Fmt\nclass W { val f = makeFmt(); fun a(s: Snap) = f.money(s.spent, s.cur) }" }]), [],
      "M23-1a-c (control): el envoltorio nullable con el productor registrado absuelve");
    // M23-1b: la fábrica devuelve un ALIAS de Fmt
    assert.ok(caza([{ name: "Spec.kt", text: "typealias FmtEnv = Fmt\nfun makeFmt(): FmtEnv = Fmt\nclass W { val f = makeFmt(); fun a(s: Snap) = f.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M23-1b: fun makeFmt(): FmtEnv (alias de Fmt) — el retorno por alias ata igual: acusa");
    assert.deepEqual(caza([{ name: "Spec.kt", text: "typealias FmtEnv = Fmt\nfun makeFmt(): FmtEnv = Fmt\nclass W { val f = makeFmt(); fun a(s: Snap) = f.money(s.spent, s.cur) }" }]), [],
      "M23-1b-c (control): el retorno por alias con el productor registrado absuelve");
    // M23-2: la cadena de identidad de TRES eslabones con archivos de por medio
    const eslabones = [
      { name: "E1.kt", text: "val r = Fmt::rate" },
      { name: "E2.kt", text: "val t = r" },
    ];
    assert.ok(caza([...eslabones, { name: "Spec.kt", text: "val u = t\nclass W { fun a(s: Snap) = u(s.spent) }" }]).length >= 1,
      "M23-2: r → t → u entre tres archivos — u(s.spent) ES Fmt.rate sin productor: acusa");
    assert.deepEqual(caza([...eslabones, { name: "Spec.kt", text: "val u = t\nclass W { fun a(s: Snap) = u(s.rateE4) }" }]), [],
      "M23-2c (control): la cadena de tres con el productor registrado absuelve");
    const vivaTres = censoCascara([fmtDecl,
      { name: "E2.kt", text: "val t = r" },
      { name: "E3.kt", text: "val u = t" },
      { name: "FaroWidgets.kt", text: "class W { val r = Fmt::rate; fun a(s: Snap) = u(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaTres.some((a) => a.includes("ya no vive en su sitio")),
      `M23-2s: u(s.rateE4) por la cadena de tres entre archivos ES la superficie en su sitio — las dos mitades coinciden: ${vivaTres.join(" | ")}`);
    const muertaTres = censoCascara([fmtDecl,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "E1.kt", text: "val r = Fmt::rate" },
      { name: "E2.kt", text: "val t = r" },
      { name: "FaroNotify.kt", text: "class N { val u = t; fun a(s: Snap) = u(s.rateE4) }" },
    ], true);
    assert.ok(muertaTres.some((a) => a.includes("ya no vive en su sitio")),
      "M23-2s-c (control): la cadena de tres plantada fuera del sitio no salva el sitio vacío");
    // M23-3a: el argumento genérico que es a su vez un ALIAS
    const cajaGen = { name: "Caja.kt", text: "typealias MiFmt = Fmt\nclass Caja<T>(val fmt: T)\nclass Otro { fun money(x: Long, c: String): String = \"\" }" };
    assert.ok(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<MiFmt>) = c.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M23-3a: Caja<MiFmt> — el argumento-alias se resuelve en el sitio de uso: acusa");
    assert.deepEqual(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<MiFmt>) = c.fmt.money(s.spent, s.cur) }" }]), [],
      "M23-3a-c (control): Caja<MiFmt> con el productor registrado absuelve");
    // M23-3b: el dueño genérico ANIDADO — Caja<Caja<Fmt>>
    assert.ok(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Caja<Fmt>>) = c.fmt.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M23-3b: Caja<Caja<Fmt>> — la cadena c.fmt.fmt llega a Fmt y se juzga: acusa");
    assert.deepEqual(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Caja<Fmt>>) = c.fmt.fmt.money(s.spent, s.cur) }" }]), [],
      "M23-3b-c (control): el anidado con el productor registrado absuelve");
    assert.deepEqual(caza([cajaGen, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Caja<Otro>>) = c.fmt.fmt.money(s.owed - s.spent, s.cur) }" }]), [],
      "M23-3b-x (control): Caja<Caja<Otro>> bloquea entero — la clase ajena anidada no la juzga el registro de Fmt");
    // M23-4: la propiedad-función alcanzada por CADENA de receptores
    const casaFmt = { name: "Casa.kt", text: "class Casa(val fmt: Fmt)" };
    assert.ok(caza([casaFmt, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Casa) = c.fmt.rateFn(s.spent) }" }]).length >= 1,
      "M23-4: c.fmt.rateFn por la cadena de receptores imprime el gasto: acusa como la directa");
    assert.ok(caza([casaFmt, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Casa) = c.fmt.rateFn(s.rateE4) }" }]).length >= 1,
      "M23-4b: ni con la tasa absuelve por la cadena — rateFn no es Fmt.rate en ninguna grafía");
    const sitioCadenaFn = censoCascara([fmtDecl, casaFmt,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap, c: Casa) = c.fmt.rateFn(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(sitioCadenaFn.some((a) => a.includes("ya no vive en su sitio")),
      `M23-4s: la tasa «viva» solo por c.fmt.rateFn no salva su sitio — la cadena no cambia la doctrina: ${sitioCadenaFn.join(" | ")}`);
    const sitioCadenaReal = censoCascara([fmtDecl, casaFmt,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap, c: Casa) = c.fmt.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!sitioCadenaReal.some((a) => a.includes("ya no vive en su sitio")),
      `M23-4s-c (control): c.fmt.rate por la cadena ES la superficie registrada en su sitio: ${sitioCadenaReal.join(" | ")}`);
  });
  it("especímenes M24 (ola 24): la identidad que vuelve, la unanimidad de tres, la fábrica como argumento genérico y el genérico a mitad de cadena", () => {
    const fmtDecl = {
      name: "Fmt.kt",
      text: "object Fmt { fun money(minor: Long, cur: String): String = \"\"; fun rate(e4: Long): String = \"\"; val rateFn: (Long) -> String = { \"\" } }",
    };
    const caza = (files: { name: string; text: string }[]) => censoCascara([fmtDecl, ...files]);
    // M24-1: la identidad cruza archivos Y VUELVE (A→B→A)
    const vuelta = [
      { name: "A.kt", text: "val r = Fmt::rate\nval u = t" },
      { name: "B.kt", text: "val t = r" },
    ];
    assert.ok(caza([...vuelta, { name: "Spec.kt", text: "class W { fun a(s: Snap) = u(s.spent) }" }]).length >= 1,
      "M24-1: r→t→u con vuelta al archivo A — u(s.spent) ES Fmt.rate sin productor: acusa");
    assert.deepEqual(caza([...vuelta, { name: "Spec.kt", text: "class W { fun a(s: Snap) = u(s.rateE4) }" }]), [],
      "M24-1c (control): la vuelta con el productor registrado absuelve");
    const vivaVuelta = censoCascara([fmtDecl, ...vuelta,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap) = u(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!vivaVuelta.some((a) => a.includes("ya no vive en su sitio")),
      `M24-1s: la superficie deletreada por la vuelta vive en su sitio: ${vivaVuelta.join(" | ")}`);
    const muertaVuelta = censoCascara([fmtDecl, ...vuelta,
      { name: "FaroWidgets.kt", text: "class W { fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
      { name: "FaroNotify.kt", text: "class N { fun a(s: Snap) = u(s.rateE4) }" },
    ], true);
    assert.ok(muertaVuelta.some((a) => a.includes("ya no vive en su sitio")),
      "M24-1s-c (control): la vuelta plantada fuera del sitio no salva el sitio vacío");
    // M24-2: la unanimidad de TRES archivos y la sombra del que ata
    const tres = [
      { name: "E1.kt", text: "val t = Fmt::rate" },
      { name: "E2.kt", text: "val t = Fmt::rate" },
      { name: "E3.kt", text: "val t = Fmt::rate" },
    ];
    assert.ok(caza([...tres, { name: "Spec.kt", text: "class W { fun a(s: Snap) = t(s.spent) }" }]).length >= 1,
      "M24-2a: tres archivos unánimes atan como uno: acusa");
    assert.deepEqual(caza([...tres, { name: "Spec.kt", text: "class W { fun a(s: Snap) = t(s.rateE4) }" }]), [],
      "M24-2d (control): la unanimidad de tres con el productor absuelve");
    assert.ok(caza([
      { name: "Otro.kt", text: "object Otro { fun rate(e4: Long): String = \"\" }" },
      { name: "E1.kt", text: "val t = Fmt::rate" },
      { name: "E2.kt", text: "val t = Fmt::rate" },
      { name: "E3.kt", text: "val t = Otro::rate" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap) = t(s.spent) }" },
    ]).length >= 1,
      "M24-2b: con desacuerdo, el juicio lee la atadura de Fmt que existe: acusa (el desacuerdo no ciega)");
    const sombra = censoCascara([fmtDecl,
      { name: "Otro.kt", text: "object Otro { fun rate(e4: Long): String = \"\" }" },
      { name: "E1.kt", text: "val t = Fmt::rate" },
      { name: "FaroWidgets.kt", text: "val t = Otro::rate\nclass W { fun a(s: Snap) = t(s.spent); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!sombra.some((a) => a.includes("Fmt.rate(s.spent)")),
      `M24-2f: el archivo que ata sombrea — su t es de Otro y no se juzga como Fmt.rate: ${sombra.join(" | ")}`);
    assert.ok(sombra.some((a) => a.includes("ya no vive en su sitio")),
      "M24-2f-c: y su sitio acusa la muerte verdadera (Fmt.rate no se usa ahí)");
    // M24-3: el genérico cuyo argumento es una FÁBRICA
    const cajaFab = { name: "Caja.kt", text: "class Caja<T>(val fmt: T)\nfun MakeFmt(): Fmt = Fmt\nclass Otro { fun money(x: Long, c: String): String = \"\" }" };
    assert.ok(caza([cajaFab, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<MakeFmt>) = c.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M24-3: Caja<MakeFmt> — el argumento-fábrica se resuelve por el retorno declarado de la función: acusa");
    assert.deepEqual(caza([cajaFab, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<MakeFmt>) = c.fmt.money(s.spent, s.cur) }" }]), [],
      "M24-3c (control): la fábrica como argumento con el productor absuelve");
    assert.ok(caza([cajaFab, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Caja<MakeFmt>>) = c.fmt.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M24-3n: el anidado con fábrica dentro se resuelve entero: acusa");
    const sitioFab = censoCascara([fmtDecl, cajaFab,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap, c: Caja<MakeFmt>) = c.fmt.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!sitioFab.some((a) => a.includes("ya no vive en su sitio")),
      `M24-3s: la superficie deletreada por Caja<MakeFmt> vive en su sitio: ${sitioFab.join(" | ")}`);
    // M24-4g: el dueño genérico a MITAD de cadena (tipo declarado de una propiedad)
    const cajaCasa = [
      { name: "Caja.kt", text: "class Caja<T>(val fmt: T)" },
      { name: "Casa.kt", text: "class Casa(val caja: Caja<Fmt>)" },
    ];
    assert.ok(caza([...cajaCasa, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Casa) = c.caja.fmt.rateFn(s.spent) }" }]).length >= 1,
      "M24-4g: c.caja.fmt.rateFn — el genérico se entra también a mitad de cadena, por el tipo de la propiedad: acusa");
    assert.ok(caza([...cajaCasa, { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Casa) = c.caja.fmt.money(s.owed - s.spent, s.cur) }" }]).length >= 1,
      "M24-4g-b: la misma cadena compuesta con money sin productor acusa");
    assert.ok(caza([
      { name: "Caja.kt", text: "class Caja<T>(val fmt: T)" },
      { name: "Casa2.kt", text: "class Casa2(val f: Fmt)" },
      { name: "Spec.kt", text: "class W { fun a(s: Snap, c: Caja<Casa2>) = c.fmt.f.rateFn(s.spent) }" },
    ]).length >= 1,
      "M24-4g-c (borde que ya aguantaba): con el genérico en la raíz, la cadena sigue acusando tras el salto llano");
    const sitioCompuesta = censoCascara([fmtDecl, ...cajaCasa,
      { name: "FaroWidgets.kt", text: "class W { fun a(s: Snap, c: Casa) = c.caja.fmt.rate(s.rateE4); fun b(s: Snap) = Fmt.money(s.rateE4, \"NIO\") }" },
    ], true);
    assert.ok(!sitioCompuesta.some((a) => a.includes("ya no vive en su sitio")),
      `M24-4gs: la superficie deletreada por la cadena compuesta vive en su sitio: ${sitioCompuesta.join(" | ")}`);
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
    // ENMIENDA OLA 18 (BR18-1): el retorno es null por la puerta
    // GUARDADA (commitGuarded) — el estado queda intacto y sin marco:
    // el aborto ya no escribe la entrada de Actividad que afirmaba el
    // guardado (BR18-1). La doctrina clavada no cambia.
    assert.match(seg, /if \(existence === "gone"\) \{ saveVerdict\.current = \{ applied: false, existence \}; return null; \}/, "destruido: el commit aborta sin marco (y deja su veredicto)");
    assert.match(seg, /data-anchor="card-form-restore-save"|card-form-restore-save/, "la salida de restaurar-y-guardar existe y se nombra");
    assert.ok(seg.includes("se archivó mientras la editabas"), "el anuncio del archivado dice la verdad en ES");
    assert.ok(seg.includes("was archived while you were editing it"), "y en EN");
  });
  it("G14-4 · savePlan compone desde la pieza viva dentro del commit, como saveRename", () => {
    const src = SRC("../../components/faro/screens.tsx");
    const seg = src.slice(src.indexOf("const savePlan"), src.indexOf("const savePlan") + 1600);
    assert.match(seg, /catalog\.map\(\(c\) => \{[\s\S]*?updated = \{ \.\.\.c, ins: r\.plan, bens/,
      "updated nace de la pieza viva c dentro del map del commit — el renombre cruzado de otra pestaña sobrevive");
    // ENMIENDA OLA 18 (BR18-1): el aborto devuelve null por la puerta
    // guardada (commitGuarded): la pieza que ya no vive no se resucita
    // y su guardado tampoco deja marco (ni entrada con su nombre, ni
    // revisión, ni Deshacer).
    assert.match(seg, /if \(!updated\) return null;/, "la pieza que ya no vive no se resucita: aborta sin marco");
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
