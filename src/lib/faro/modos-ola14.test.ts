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
      for (const m of code.matchAll(/\bclass\s+(\w+)\s*\(([^)]*)\)/g)) {
        const fields = [...m[2]!.matchAll(/\bval\s+(\w+)\s*:\s*Long\??\b/g)].map((x) => x[1]!);
        if (fields.length) tipos.set(m[1]!, new Set([...(tipos.get(m[1]!) ?? []), ...fields]));
        const props = new Map<string, { w: string; fi: number }>();
        for (const p of m[2]!.matchAll(/\bval\s+(\w+)\s*:\s*(\w+)\b/g)) props.set(p[1]!, { w: p[2]!, fi });
        if (props.size) propTypes.set(m[1]!, props);
      }
    }
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
    const resolveComposed = (written: string, fi: number): string => {
      let cur = written;
      let ctx = fi;
      for (let i = 0; i < 10; i++) {
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
    const fmtPropsOf = (binds: Map<string, string>, names: Set<string>): Set<string> => {
      const props = new Set<string>();
      for (const [n, rhs] of binds) {
        // el valor atado, limpio de la puntuación del ámbito que lo
        // envuelve («val fmt = Fmt }» dentro de un companion): el
        // último segmento del nombre es la grafía que cuenta.
        const clean = rhs.trim().replace(/[}\])\s]+$/, "");
        if (names.has(clean) || names.has(clean.split(".").pop()!)) props.add(n);
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
    /* (iii) El formateador guardado en una propiedad atada a NIVEL DE
     * PAQUETE en otro archivo (M19-7): `val fmtCasa = Fmt` en la cima
     * de un archivo es visible en todo el paquete, como un typealias —
     * la cosecha de propiedades se hace también a ese nivel (las
     * ataduras de nivel superior de cada archivo, juzgadas con los
     * nombres de SU archivo). Una atadura local del mismo nombre en el
     * archivo juzgado sombrea a la de paquete: el juicio por archivo
     * solo hereda los nombres que el archivo no ata. */
    const pkgFmtProps = new Set<string>();
    scanned.forEach(({ code }, fi) => {
      const top = new Map<string, string>();
      for (const m of code.matchAll(/(?:^|;\s*)(?:val|var)\s+(\w+)\s*(?::\s*[\w?<>,. ]+?)?=\s*([^\n;]+)/gm)) top.set(m[1]!, m[2]!.trim());
      for (const p of fmtPropsOf(top, fmtNamesOf(fi))) pkgFmtProps.add(p);
    });
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
    for (let round = 0; round < 8; round++) {
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
      for (const m of code.matchAll(new RegExp(`\\b(\\w+)\\s*:\\s*(${receiverTypeNames})\\b`, "g"))) receivers.set(m[1]!, resolveWrittenType(m[2]!, fi));
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
      for (let round = 0; round < 8; round++) {
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
      const fmtProps = new Set([...fmtPropsOf(bindings, fmtNames), ...[...pkgFmtProps].filter((p) => !bindings.has(p))]);
      // OLA 19 (M19-6): los alias de miembro de este archivo — la
      // llamada desnuda renombrada ES una llamada al formateador.
      const memberAliases = memberAliasesOf(fi);
      const spellRe = [...fmtNames].map(escRe18).join("|");
      const propRe = [...fmtProps].map(escRe18).join("|");
      const fmtCallish = (t: string): boolean =>
        new RegExp(`\\b(?:${spellRe})\\.\\w+\\s*\\(`).test(t) ||
        (fmtProps.size > 0 && new RegExp(`(?:\\b\\w+\\.(?:${propRe})|(?<![\\w.])(?:${propRe}))\\.\\w+\\s*\\(`).test(t)) ||
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
        for (const m of code.matchAll(new RegExp(`\\b\\w+\\.(?:${propRe})\\.(\\w+)\\s*\\(([^)]*)\\)`, "g"))) {
          if (m[2]!.includes(":")) continue;
          if (fmtFormatters.has(m[1]!) || exprDerived(m[2]!)) judgedCall(`Fmt.${m[1]!}(${m[2]!})`);
        }
      }
      // OLA 17 (M17-4): el formateador por REFERENCIA — val f =
      // Fmt::money ES Fmt.money; sus llamadas son forma 1 con el
      // nombre resuelto, y se juzgan como la llamada que son.
      for (const m of code.matchAll(new RegExp(`\\b(?:val|var)\\s+(\\w+)\\s*=\\s*(?:${spellRe})::(\\w+)\\b`, "g"))) {
        if (!fmtFormatters.has(m[2]!)) continue;
        const alias = m[1]!, target = m[2]!;
        for (const c of code.matchAll(new RegExp(`(?<![\\w.])${alias}\\s*\\(([^)]*)\\)`, "g"))) {
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
      const propsSitio = new Set([...fmtPropsOf(binds, namesSitio), ...[...pkgFmtProps].filter((p) => !binds.has(p))]);
      let texto = f.code;
      for (const s of namesSitio) if (s !== "Fmt") texto = texto.replace(new RegExp(`\\b${escRe18(s)}\\.`, "g"), "Fmt.");
      for (const p of propsSitio) {
        texto = texto.replace(new RegExp(`\\b\\w+\\.${escRe18(p)}\\.`, "g"), "Fmt.");
        texto = texto.replace(new RegExp(`(?<![\\w.])${escRe18(p)}\\.`, "g"), "Fmt.");
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
