/**
 * FARO — OLA 10 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: EL PAPEL QUE LA CARA NO RESPALDA. Una exención
 * del censo declaraba que las plantillas «pintan dentro de la tarjeta de
 * estructura» — y pintaban, y APLICABAN, un piso por debajo de su asiento
 * (CARA-1); una prosa enseñaba en Esencial los verbos del lápiz que
 * Esencial no tiene (CARA-2, cuya mitad viva ya había curado la pieza del
 * renombre del carril en la .315 — aquí se fija la doctrina); el desnudado
 * de comentarios del censo dejaba vivo un comentario de cola y su mención
 * contaba como consumo (CARA-3); la adopción desmontaba los flujos de la
 * pantalla de Deudas con el trabajo sin guardar dentro (C10-1); el diálogo
 * de impacto abierto no comparaba premisas contra las llegadas que
 * aterrizaban en su propio destino (C10-2); la familia de testigos de
 * LineForm seguía creciendo pin a pin tras cada mordida (G10-1/G10-2 y su
 * primo hintRef); y la cerca de familias de la Presentación medía la
 * herencia por módulo mientras el algoritmo hereda por base GLOBAL, con
 * la llave de TOPIC_SCENES sin censo de colisiones (E10-1). Cada familia
 * queda clavada aquí o en la casa de su cerca (la §A/§E de modos-ola9, la
 * §D de modos-ola7), con su espécimen corriendo rojo antes y verde
 * después. Donde la rotura vive en un componente, la cerca es de fuente
 * y el banco CDP de la ronda la acompaña (shots-cura10/).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import ts from "typescript";
import { createInitial } from "./defaults.ts";
import { MODULES, TOPIC_SCENES } from "./guion.ts";
import { FEATURES, modeDialogReaction, modeImpact, unlockedGroups, type Mode } from "./mode.ts";
import type { LedgerState, Line } from "./types.ts";
import { findTopic } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ §A · CARA-1: LAS PLANTILLAS OBEDECEN EL FALLO 35 ══════════
 * El fallo 35 declara las plantillas de Estructura de COMPLETO
 * (settings.templates = C, el tema «plantillas» = completo), pero la
 * cara las pintaba — y las APLICABA — dentro de la tarjeta de estructura
 * de screens.tsx, gobernada por settings.structure-card (Ritmo): en
 * Ritmo las 5 selecciones abrían su confirmación verdadera y aplicaban
 * la reestructura del libro entero (espécimen vivo de la caza). La
 * exención del censo de la ola 9 lo cubría con papel («pintan dentro de
 * la tarjeta…») sin mirar el piso del gobernador. La cura NO enmienda el
 * fallo: la cara gana la puerta — las selecciones quedan tras
 * has("settings.templates") dentro de la tarjeta (que sigue siendo de
 * Ritmo) — y la exención muere porque el asiento gana por fin su
 * consumidor real. */
describe("ola10 · §A: las plantillas viven tras su asiento (fallo 35)", () => {
  const screens = SRC("../../components/faro/screens.tsx");
  it("el registro no se enmienda: settings.templates sigue en Completo", () => {
    assert.equal(FEATURES["settings.templates"], "completo",
      "el fallo 35 manda: la cura mueve la cara, no el registro");
  });
  it("las selecciones de plantilla quedan tras has(\"settings.templates\") dentro de la tarjeta", () => {
    const at = screens.indexOf('className="aj-picks"');
    assert.ok(at > 0, "el bloque de selecciones existe");
    const gate = screens.slice(Math.max(0, at - 400), at);
    assert.ok(gate.includes('has("settings.templates")'),
      "sin la puerta, las plantillas de Completo pintan y aplican en Ritmo tras la tarjeta de Ritmo (espécimen de la caza)");
    assert.ok(gate.includes('has("settings.structure-card")'),
      "la tarjeta sigue siendo la de Ritmo: en Ritmo la tarjeta pinta entera, sin el selector");
  });
  it("la exención del censo murió: el asiento ya tiene consumidor real", () => {
    const ola9 = SRC("./modos-ola9.test.ts");
    const exentos = ola9.slice(ola9.indexOf("const EXENTOS"), ola9.indexOf("describe(\"ola9 · §A"));
    assert.ok(!exentos.includes('"settings.templates"'),
      "una exención sobre un asiento con consumidor real es papel podrido: la higiene de la §A la acusa");
  });
});

/* ═══════════ §B · CARA-2: LA PROSA DEL LÁPIZ EN ESENCIAL ════════════════
 * La caza condenó (sobre la .314) la prosa de f-tienda-elegir y
 * f-cat-elegir: enseñaban el lápiz de administración — ocultar, el
 * color — como presente en Esencial. Sobre la base real de esta cura
 * (.315) la pieza del renombre del carril ya había reescrito los dos
 * temas: el lápiz en Esencial corrige el nombre (verdad nueva, fallo de
 * las 18:11) y ocultar/el color se nombran SOLO como de Ritmo. La
 * doctrina que aquí se fija es exactamente esa línea: en la lectura de
 * Esencial, ocultar y recolorear pueden NOMBRARSE únicamente con su
 * atribución a Ritmo — jamás enseñarse como presentes. El espécimen de
 * la caza (las cláusulas viejas, sin atribución) corre rojo bajo esta
 * regla; la prosa viva pasa porque atribuye. */
describe("ola10 · §B: en Esencial, ocultar y el color solo se nombran como de Ritmo", () => {
  const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
  for (const id of ["f-tienda-elegir", "f-cat-elegir"]) {
    it(`${id}: ninguna frase enseña ocultar sin atribuirlo a Ritmo (ES y EN)`, () => {
      const topic = findTopic(id);
      assert.ok(topic?.what, `el tema ${id} existe y trae prosa`);
      for (const text of topic!.what!) {
        for (const s of sentences(text)) {
          if (/ocult|escond|hide|hiding/i.test(s)) {
            assert.ok(/\[\[Ritmo\]\]|\[\[Rhythm\]\]|de Ritmo|to Rhythm/i.test(s),
              `${id}: la frase «${s.trim()}» enseña ocultar en la lectura de Esencial sin decir que vive en Ritmo`);
          }
        }
      }
    });
    it(`${id}: las cláusulas condenadas por la caza no vuelven (ES y EN)`, () => {
      const topic = findTopic(id);
      const [es, en] = topic!.what!;
      assert.ok(!es.includes("renombra u oculta") && !en.includes("renames or hides"),
        "la cláusula vieja de f-tienda-elegir prometía ocultar en Esencial");
      assert.ok(!es.includes("cambia nombre y color") && !en.includes("changes name and colour"),
        "la cláusula vieja de f-cat-elegir prometía el color en Esencial");
    });
  }
});

/* ═══════════ §F · LA FAMILIA DE TESTIGOS, CERRADA COMO CLASE ══════════
 * Tres olas seguidas cazaron testigos de LineForm sin pin: pay y active
 * (ola 1), iconPicked y brandTouched (ola 9), natureDraft, el
 * acoplamiento tone/toneStart y el ref hintRef (ola 10). Cada pin nuevo
 * llegaba DESPUÉS de la mordida porque la §D fijaba los testigos que ya
 * habían mordido, no la familia. Esta cerca cierra la clase: enumera
 * TODOS los estados y refs del tramo de LineForm, clasifica cada uno —
 * TESTIGO (su nacimiento decide al guardar: conservar, borrar o estampar
 * un campo que la mano quizá no tocó), PORTADOR (carga el valor de un
 * campo del borrador: es la forma misma) o MUESTRA (solo se pinta) — y
 * acusa a cualquier hook que nazca fuera del censo. Un testigo nuevo sin
 * clasificar corre rojo el día que nace, no el día que muerde. */
describe("ola10 · §F: el censo de testigos de LineForm, con completitud", () => {
  const form = (() => {
    const src = SRC("../../components/faro/line-form.tsx");
    return src.slice(src.indexOf("export function LineForm"), src.indexOf("export function QuickAdd"));
  })();
  /* Cada testigo con su nacimiento verbatim: el valor con el que nace
   * ES la decisión de conservación que tomará al guardar. */
  const TESTIGOS: Record<string, string> = {
    pay: 'const [pay, setPay] = useState(existing?.sourceId ?? "");',
    active: "const [active, setActive] = useState(existing?.active ?? true);",
    payTouched: "const [payTouched, setPayTouched] = useState(false);",
    iconPicked: "const [iconPicked, setIconPicked] = useState(false);",
    brandTouched: "const [brandTouched, setBrandTouched] = useState(false);",
    natureDraft: "const [natureDraft, setNatureDraft] = useState<{ nature: FundNature | null; host: string } | null>(null);",
    toneStart: "const [toneStart] = useState(() => chosenTone(existing?.color, existing?.categoryId)",
    tone: "const [tone, setTone] = useState(toneStart);",
    hintRef: 'const hintRef = useRef("");',
    baseRef: "const baseRef = useRef<Record<string, unknown> | null>(null);",
  };
  /* Los portadores cargan el valor que la mano ve y edita: son los
   * campos del borrador, no testigos sobre él — su nacimiento lee el
   * registro o la semilla porque eso ES el campo. */
  const PORTADORES = new Set([
    "concept", "amount", "currencyState", "note", "categoryId", "subId",
    "recurring", "storeId", "providerId", "code", "url", "cadence",
    "nextDue", "apr", "balance", "personId", "to", "icon", "bookedOn",
    "startedOn",
  ]);
  /* err solo se pinta: lo escribe la validación al guardar y lo lee el
   * render; ninguna decisión de guardado lo consulta. */
  const MUESTRA = new Set(["err"]);
  /* ── OLA 12 · G12-1: EL CENSO LEE LLAMADAS DE VERDAD (AST) ─────────
   * La medición por llamadas de la ola 11 contaba con una regex cuyo
   * grupo de genérico `<[^()]*>` no cruza paréntesis: un testigo nacido
   * `useState<() => boolean>` en variable (V1), su forma con namespace
   * (V3) y un alias de import declarado fuera del tramo (V6) corrían
   * 213/213 VERDE con el testigo vivo dentro; y en la dirección
   * contraria, un COMENTARIO que nombraba useState( contaba como
   * llamada y corría la cerca roja sin hook alguno (V4). La regex
   * contaba texto, no llamadas. Desde esta ola el censo camina el AST
   * del tramo (el compilador de TypeScript, como la §A de la ola 12):
   * los comentarios y las cadenas no son llamadas; los genéricos con
   * paréntesis, el namespace React.* y los alias de import (leídos del
   * archivo entero, porque su declaración vive fuera del tramo) SÍ.
   * Un nombre nace del AST: el primer elemento de la desestructuración,
   * el identificador de la variable-tupla y los nombres que de esa
   * variable se desestructuran un salto después. */
  const HOOKS_BASE = new Set(["useState", "useRef"]);
  const hookAliases = (fileText: string): Set<string> => {
    const out = new Set(HOOKS_BASE);
    const sf = ts.createSourceFile("f.tsx", fileText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const walk = (n: ts.Node): void => {
      if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) {
        for (const el of n.importClause.namedBindings.elements) {
          const orig = (el.propertyName ?? el.name).text;
          if (HOOKS_BASE.has(orig)) out.add(el.name.text);
        }
      }
      n.forEachChild(walk);
    };
    walk(sf);
    return out;
  };
  const ALIASES = hookAliases(SRC("../../components/faro/line-form.tsx"));
  const isHookCall = (n: ts.Node, aliases: Set<string>): n is ts.CallExpression => {
    if (!ts.isCallExpression(n)) return false;
    const e = n.expression;
    if (ts.isIdentifier(e)) return aliases.has(e.text);
    if (ts.isPropertyAccessExpression(e)) return HOOKS_BASE.has(e.name.text); // React.useState / React.useRef
    return false;
  };
  const parseSpan = (text: string) => ts.createSourceFile("span.tsx", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hooksOf = (text: string) => {
    const names = new Set<string>();
    const sf = parseSpan(text);
    const tupleVars = new Map<string, ts.VariableDeclaration>();
    const decls: ts.VariableDeclaration[] = [];
    const collect = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n)) decls.push(n);
      n.forEachChild(collect);
    };
    collect(sf);
    for (const d of decls) {
      if (!d.initializer || !isHookCall(d.initializer, ALIASES)) continue;
      if (ts.isArrayBindingPattern(d.name)) {
        const first = d.name.elements[0];
        if (first && ts.isBindingElement(first)) names.add(first.name.getText());
      } else if (ts.isIdentifier(d.name)) {
        names.add(d.name.text);
        tupleVars.set(d.name.text, d);
      }
    }
    // el salto de la tupla: const [a, b] = s — el nombre que la mano usa
    for (const d of decls) {
      if (!d.initializer || !ts.isIdentifier(d.initializer) || !tupleVars.has(d.initializer.text)) continue;
      if (ts.isArrayBindingPattern(d.name)) {
        const first = d.name.elements[0];
        if (first && ts.isBindingElement(first)) names.add(first.name.getText());
      }
    }
    return names;
  };
  const hooks = () => hooksOf(form);
  const callSites = (text: string): { at: number; ctx: string }[] => {
    const out: { at: number; ctx: string }[] = [];
    const sf = parseSpan(text);
    const walk = (n: ts.Node): void => {
      if (isHookCall(n, ALIASES)) {
        out.push({ at: n.getStart(), ctx: text.slice(Math.max(0, n.getStart() - 30), n.getStart() + 30).replace(/\s+/g, " ") });
      }
      n.forEachChild(walk);
    };
    walk(sf);
    return out;
  };
  /* Sin reclamar = una llamada que no es el inicializador de ninguna
   * declaración del tramo: nació fuera de la gramática de nacimiento
   * (suelta en un cuerpo, devuelta, pasada) y el censo de nombres no la
   * ata a nombre alguno. */
  const unclaimed = (text: string): { at: number; ctx: string }[] => {
    const sf = parseSpan(text);
    const claimed = new Set<ts.Node>();
    const collect = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && n.initializer && isHookCall(n.initializer, ALIASES)) claimed.add(n.initializer);
      n.forEachChild(collect);
    };
    collect(sf);
    return callSites(text).filter((c) => {
      let found = false;
      const seek = (n: ts.Node): void => {
        if (isHookCall(n, ALIASES) && n.getStart() === c.at) found = claimed.has(n);
        n.forEachChild(seek);
      };
      seek(sf);
      return !found;
    });
  };
  it("cada testigo del censo nace con su valor fijado, verbatim", () => {
    for (const [name, birth] of Object.entries(TESTIGOS)) {
      assert.ok(form.includes(birth), `${name}: su nacimiento cambió — ${birth}`);
    }
  });
  it("todo hook del tramo está clasificado: un testigo nuevo fuera del censo corre rojo al nacer", () => {
    const names = hooks();
    assert.equal(names.size, 31, `el tramo declara 31 hooks (${[...names].join(", ")})`);
    for (const name of names) {
      assert.ok(name in TESTIGOS || PORTADORES.has(name) || MUESTRA.has(name),
        `${name}: hook sin clasificar en el tramo de LineForm — si testifica al guardar, entra en TESTIGOS con su nacimiento; si carga un campo, en PORTADORES; si solo se pinta, en MUESTRA`);
    }
  });
  it("el censo no nombra fantasmas: cada entrada existe en el tramo", () => {
    const names = hooks();
    for (const name of [...Object.keys(TESTIGOS), ...PORTADORES, ...MUESTRA]) {
      assert.ok(names.has(name), `${name}: el censo lo nombra y el tramo ya no lo declara — censo podrido`);
    }
  });
  it("G11-1: toda LLAMADA useState/useRef del tramo tiene su declaración extraída", () => {
    const calls = callSites(form);
    assert.equal(calls.length, 31, `el tramo hace 31 llamadas de hook (${calls.length})`);
    assert.deepEqual(unclaimed(form), [],
      "llamadas sin declaración extraída: un hook nacido por otra gramática (la tupla en variable de M11-c3) es invisible para el censo de declaraciones");
  });
  it("G11-1 · el espécimen M11-c3 (la tupla en variable) corre rojo", () => {
    const staged = `${form}\n  const s = useState(false); const [a, b] = s;\n`;
    // Ola 12: bajo el AST la tupla SÍ se ve — nace dos veces en el censo
    // de nombres (la variable y el nombre desestructurado), sin clasificar:
    // la acusación llega por el censo, que es donde la doctrina la quiere.
    const names = hooksOf(staged);
    assert.equal(names.size, 33, "la variable-tupla y su desestructuración entran al censo");
    assert.ok(names.has("s") && names.has("a"), "los dos nombres del espécimen, censados");
    assert.ok(!("s" in TESTIGOS) && !PORTADORES.has("s") && !MUESTRA.has("s"), "y sin clasificar: la clasificación corre roja");
    assert.equal(callSites(staged).length, 32, "la llamada se cuenta: el conteo de completitud también acusa");
  });
  /* OLA 12 · G12-1: los especímenes de la caza, en sus dos direcciones —
   * los que evadían (V1/V3/V6) ahora acusan, el que acusaba en falso
   * (V4) ahora calla, y los que aguantaban (V2/V5/V7) siguen acusando. */
  it("G12-1 · V1 — tupla en variable con genérico de paréntesis: el testigo acusa", () => {
    const staged = `${form}\n  const stampFnState = useState<() => boolean>(() => false);\n  const [stampFnTouched, setStampFnTouched] = stampFnState;\n`;
    const names = hooksOf(staged);
    assert.ok(names.has("stampFnTouched") && names.has("stampFnState"), "el AST cruza el genérico con paréntesis y la tupla");
    assert.equal(callSites(staged).length, 32, "la llamada cuenta: la completitud corre roja");
    assert.ok(!PORTADORES.has("stampFnTouched") && !("stampFnTouched" in TESTIGOS), "y el nombre nace sin clasificar");
  });
  it("G12-1 · V3 — namespace con genérico de paréntesis: el testigo acusa", () => {
    const staged = `${form}\n  const nsState = React.useState<() => boolean>(() => false);\n  const [nsTouched, setNsTouched] = nsState;\n`;
    assert.ok(hooksOf(staged).has("nsTouched"), "React.useState<…> es una llamada de hook para el AST");
    assert.equal(callSites(staged).length, 32);
  });
  it("G12-1 · V6 — el alias de import, declarado fuera del tramo: el testigo acusa", () => {
    const stagedFile = `import { useState as useSt } from "react";\n${form}\n  const [aliasTouched, setAliasTouched] = useSt(false);\n`;
    const aliases = hookAliases(stagedFile);
    assert.ok(aliases.has("useSt"), "el alias se lee del archivo entero, no del tramo");
    const names = new Set<string>();
    const sf = parseSpan(stagedFile);
    const walk = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && n.initializer && isHookCall(n.initializer, aliases) && ts.isArrayBindingPattern(n.name)) {
        const first = n.name.elements[0];
        if (first && ts.isBindingElement(first)) names.add(first.name.getText());
      }
      n.forEachChild(walk);
    };
    walk(sf);
    assert.ok(names.has("aliasTouched"), "la llamada aliasada es una llamada de hook");
  });
  it("G12-1 · V4 — un comentario que nombra useState( NO es una llamada: la cerca calla", () => {
    const staged = `${form}\n  // (antes esto nacía de un useState(…) y hoy es derivado)\n`;
    assert.equal(callSites(staged).length, 31, "el comentario no cuenta: el AST no lee papel");
    assert.deepEqual(unclaimed(staged), []);
  });
  it("G12-1 · V2/V5/V7 — las formas que aguantaban siguen acusando", () => {
    const v2 = `${form}\n  const [nsTouched, setNsTouched] = React.useState(false);\n`;
    assert.equal(callSites(v2).length, 32, "V2: el namespace directo cuenta");
    assert.ok(hooksOf(v2).has("nsTouched"));
    const v5 = `${form}\n  const [splitTouched, setSplitTouched] =\n    useState(false);\n`;
    assert.ok(hooksOf(v5).has("splitTouched"), "V5: la declaración partida en líneas nace igual en el AST");
    const v7 = `${form}\n  const lazyRef = useRef<number | null>(\n    null\n  );\n`;
    assert.ok(hooksOf(v7).has("lazyRef"), "V7: el ref con el argumento partido se extrae");
    assert.equal(callSites(v7).length, 32);
  });
});

/* ═══════════ §G · E10-1: EL ÁMBITO DE LA HERENCIA Y LA LLAVE DEL MAPA ══
 * El algoritmo (presentacion.tsx) hereda por base GLOBAL: topicByBase no
 * conoce módulos. La cerca medía por (módulo, base) — un ámbito más
 * estrecho que el del algoritmo — y dos especímenes escenificados por
 * Enseñanza X pasaron con la suite entera verde: (MUT-A) una pareja de
 * variantes trasplantada a otro módulo se daba hermandad a sí misma y
 * heredaba el tema de las deudas dentro de «Anotar»; (MUT-D) dos temas
 * nombran la misma escena en TOPIC_SCENES y Object.fromEntries deja vivo
 * solo al último escritor: el perdedor pierde su puente en silencio.
 * Esta cerca replica la construcción EXACTA del algoritmo y acusa las
 * dos formas; un pin de fuente ata la réplica al algoritmo para que no
 * se separen en silencio. */
describe("ola10 · §G: la herencia se mide con el ámbito del algoritmo y la llave tiene censo", () => {
  const SCENE_TOPIC: Record<string, string> = Object.fromEntries(
    Object.entries(TOPIC_SCENES)
      .filter(([, t]) => t.moduleId !== "manual")
      .map(([topic, t]) => [t.sceneId, topic]),
  );
  const sceneBase = (id: string) => id.replace(/-(h|c|r)$/, "");
  const topicByBase: Record<string, string> = {};
  for (const [sceneId, topic] of Object.entries(SCENE_TOPIC)) topicByBase[sceneBase(sceneId)] = topic;
  const sceneModule = new Map<string, string>();
  for (const m of MODULES) for (const s of m.scenes) sceneModule.set(s.id, m.id);
  const inheritedPairs: Array<{ scene: string; topic: string }> = [];
  for (const m of MODULES) for (const s of m.scenes) {
    if (!SCENE_TOPIC[s.id] && topicByBase[sceneBase(s.id)]) inheritedPairs.push({ scene: s.id, topic: topicByBase[sceneBase(s.id)]! });
  }
  it("el censo de la llave: una escena, un tema — ninguna escritura pisa a otra en la construcción", () => {
    const byScene = new Map<string, string[]>();
    for (const [topic, t] of Object.entries(TOPIC_SCENES)) {
      if (t.moduleId === "manual") continue;
      byScene.set(t.sceneId, [...(byScene.get(t.sceneId) ?? []), topic]);
    }
    for (const [sceneId, topics] of byScene) {
      assert.equal(topics.length, 1,
        `la escena ${sceneId} la nombran ${topics.length} temas (${topics.join(", ")}): Object.fromEntries deja vivo solo al último y el perdedor pierde su puente en silencio (MUT-D)`);
    }
    for (const [topic, t] of Object.entries(TOPIC_SCENES)) {
      if (t.moduleId === "manual") continue;
      assert.equal(SCENE_TOPIC[t.sceneId], topic,
        `el tema ${topic} no llega vivo a SCENE_TOPIC tras la construcción: otra escritura lo pisó`);
    }
    assert.ok(byScene.size >= 20, `el censo mira el mapa de verdad (${byScene.size} escenas nombradas)`);
  });
  it("la herencia no cruza módulos: el tema heredado se declara en el módulo de la escena que hereda", () => {
    assert.ok(inheritedPairs.length >= 1, "la herencia existe y esta cerca la está mirando (m19-balanza hereda de su cara -h)");
    for (const { scene, topic } of inheritedPairs) {
      assert.equal(TOPIC_SCENES[topic]!.moduleId, sceneModule.get(scene),
        `la escena ${scene} (módulo ${sceneModule.get(scene)}) hereda «${topic}», declarado en el módulo ${TOPIC_SCENES[topic]!.moduleId}: el algoritmo hereda por base global — una pareja trasplantada se daría hermandad a sí misma y heredaría un tema ajeno (MUT-A)`);
    }
  });
  it("la réplica es el algoritmo: presentacion.tsx construye así, o esta cerca lo acusa", () => {
    const pres = SRC("../../components/faro/presentacion.tsx");
    assert.ok(pres.includes("Object.fromEntries(") && pres.includes('.filter(([, t]) => t.moduleId !== "manual")'),
      "SCENE_TOPIC ya no se construye como la réplica supone: la cerca debe re-escribirse con el algoritmo, no al revés");
    assert.ok(pres.includes("topicByBase[sceneBase(sceneId)] = topic") && pres.includes("SCENE_TOPIC[s.id] = topicByBase[sceneBase(s.id)]"),
      "la herencia por base global cambió de forma: la cerca debe re-escribirse con el algoritmo");
  });
});

/* ═══════════ §E · C10-2: EL DIÁLOGO ABIERTO VIGILA LAS LLEGADAS ════════
 * La geometría escenificada por Cambios X: diálogo Completo→Esencial
 * abierto; la llegada 1 baja el libro a Esencial (el diálogo seguía
 * preguntando «¿Bajar a Esencial?» byte por byte); la llegada 2 lo sube
 * a Ritmo (el diálogo, intacto); y confirmar no ejecutaba nada y no
 * explicaba nada. La cura pone la comparación de premisas DONDE OCURRE
 * el cambio — un vigilante sobre el modo vivo — y la decisión pura vive
 * en modeDialogReaction (mode.ts), clavada aquí sobre las geometrías de
 * la caza; el banco en vivo de la ronda la acompaña (shots-cura10/). */
describe("ola10 · §E: modeDialogReaction — el diálogo abierto contra las llegadas", () => {
  const KEY = "2026-11";
  let seq = 0;
  const line = (partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }): Line => {
    seq += 1;
    const id = `l${seq}`;
    return {
      id, seriesId: id, monthKey: KEY, concept: "", currency: "NIO", active: true, note: "",
      categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
      productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
      icon: "", history: [], ...partial,
    } as Line;
  };
  /** Libro con N cuotas (duermen en Esencial) y una fuente de importación
   *  (duerme bajo Completo), nacido en el modo dado. */
  const watchBook = (mode: Mode, subs = 1): LedgerState => {
    const book = createInitial("es", "claro");
    book.settings.mode = mode;
    const catAny = book.structure.categories.find((c) => c.role !== "savings")!.id;
    const lines: Line[] = [];
    for (let i = 0; i < subs; i++) lines.push(line({ kind: "subscription", amountMinor: 1500, categoryId: catAny, recurring: true, cadence: "monthly", concept: `Cuota ${i + 1}` }));
    book.months[KEY] = { lines };
    book.imports = { sources: [{ id: "bs-1", bank: "Banco", kind: "checking", rates: {} }], rules: [], maps: {} } as LedgerState["imports"];
    return book;
  };
  const impact = (args: Omit<Parameters<typeof modeDialogReaction>[0], "dialog" | "lang">) => modeDialogReaction({ ...args, dialog: "impact", lang: "es" });

  it("llegada sobre el destino: el diálogo se cierra (la llegada ya se anunció por su puerta)", () => {
    const posed = watchBook("completo");
    const r = impact({ from: "completo", target: "esencial", live: "esencial", state: watchBook("esencial"), currentImpact: modeImpact(posed, "esencial", "es") });
    assert.equal(r.kind, "close");
  });
  it("llegada entre el origen y el destino: el diálogo se re-plantea con el origen y el conteo vivos", () => {
    const posed = watchBook("completo");
    const liveBook = watchBook("ritmo");
    const r = impact({ from: "completo", target: "esencial", live: "ritmo", state: liveBook, currentImpact: modeImpact(posed, "esencial", "es") });
    assert.equal(r.kind, "refresh-impact");
    if (r.kind === "refresh-impact") {
      assert.equal(r.from, "ritmo", "el origen del diálogo es el modo vivo, no el congelado");
      assert.equal(r.impact.total, modeImpact(liveBook, "esencial", "es").total, "el conteo es el vivo: lo que ya dormía en Ritmo no se anuncia otra vez");
    }
  });
  it("segunda llegada consecutiva sobre el destino tras el refresco: el diálogo se cierra", () => {
    const posed = watchBook("completo");
    const first = impact({ from: "completo", target: "esencial", live: "ritmo", state: watchBook("ritmo"), currentImpact: modeImpact(posed, "esencial", "es") });
    assert.equal(first.kind, "refresh-impact");
    const second = impact({
      from: first.kind === "refresh-impact" ? first.from : "completo", target: "esencial", live: "esencial",
      state: watchBook("esencial"), currentImpact: first.kind === "refresh-impact" ? first.impact : undefined,
    });
    assert.equal(second.kind, "close", "la geometría entera de la caza: destino alcanzado tras dos llegadas — nada queda por preguntar");
  });
  it("dirección invertida bajo el diálogo de impacto: se convierte en su hermano repuesto", () => {
    const posed = watchBook("completo");
    const r = impact({ from: "completo", target: "ritmo", live: "esencial", state: watchBook("esencial"), currentImpact: modeImpact(posed, "ritmo", "es") });
    assert.equal(r.kind, "to-reposed", "ir a Ritmo desde Esencial ya es subir: la pregunta cambia de signo y de diálogo");
    if (r.kind === "to-reposed") {
      assert.equal(r.from, "esencial");
      assert.ok(r.unlocked.length > 0, "el repuesto nombra lo que se destapa con los conteos vivos (las cuotas)");
    }
  });
  it("mismo modo, conteos movidos: el diálogo se refresca sin cambiar de pregunta", () => {
    const before = watchBook("completo", 1);
    const after = watchBook("completo", 2);
    const r = impact({ from: "completo", target: "esencial", live: "completo", state: after, currentImpact: modeImpact(before, "esencial", "es") });
    assert.equal(r.kind, "refresh-impact");
    if (r.kind === "refresh-impact") assert.ok(r.impact.total > modeImpact(before, "esencial", "es").total, "el conteo refrescado es el vivo");
  });
  it("sin cambios, el vigilante no toca el diálogo (stay — sin bucles)", () => {
    const book = watchBook("completo");
    const r = impact({ from: "completo", target: "esencial", live: "completo", state: book, currentImpact: modeImpact(book, "esencial", "es") });
    assert.equal(r.kind, "stay");
  });
  it("el impacto se evaporó (total 0): la advertencia sin objeto se cierra — principio 5", () => {
    const posed = watchBook("ritmo", 1);
    const r = impact({ from: "ritmo", target: "esencial", live: "ritmo", state: watchBook("ritmo", 0), currentImpact: modeImpact(posed, "esencial", "es") });
    assert.equal(r.kind, "close", "sin nada que duerma, el diálogo no pregunta: un toque nuevo aplica directo por el camino de pickMode");
  });
  it("el repuesto vigila igual: destino alcanzado → cierra; inversión → vuelve al impacto; conteos → refresca", () => {
    const bookE = watchBook("esencial");
    const unlocked = unlockedGroups(bookE, "esencial", "ritmo");
    const base = { dialog: "reposed" as const, from: "esencial" as Mode, target: "ritmo" as Mode, lang: "es" as const, currentUnlocked: unlocked };
    assert.equal(modeDialogReaction({ ...base, live: "ritmo", state: watchBook("ritmo") }).kind, "close");
    const inv = modeDialogReaction({ ...base, live: "completo", state: watchBook("completo") });
    assert.equal(inv.kind, "to-impact", "desde Completo, ir a Ritmo ya es bajar: la pregunta vuelve a su pantalla verdadera");
    const grown = modeDialogReaction({ ...base, live: "esencial", state: watchBook("esencial", 2) });
    assert.equal(grown.kind, "refresh-reposed", "más cuotas vivas: la lista de destapados se refresca con el conteo vivo");
    assert.equal(modeDialogReaction({ ...base, live: "esencial", state: bookE }).kind, "stay");
  });
  it("los vigilantes están cableados en Ajustes sobre los dos diálogos", () => {
    const screens = SRC("../../components/faro/screens.tsx");
    assert.ok(screens.includes('dialog: "impact"') && screens.includes('dialog: "reposed"'),
      "modeDialogReaction sin vigilante sería un ayudante huérfano: los dos efectos viven junto a los estados de los diálogos");
    assert.ok(screens.includes("modeDialogReaction("), "el vigilante consume la decisión pura, no una copia de su geometría");
  });
});

/* ═══════════ §D · C10-1: LA ADOPCIÓN YA NO DESMONTA EL TRABAJO ═════════
 * Los especímenes de Cambios X: el alta rápida de Cobros con «Prueba
 * Ola10» y 1500 tecleados, y el editor corto de tarjeta con el límite
 * 5000 tecleado, abiertos sobre la pantalla de Deudas cuando una
 * adopción (pestaña) bajó el libro a Esencial — los dos flujos
 * desaparecieron del DOM y lo tecleado se perdió en silencio, sin
 * resucitar al volver el modo. El contra-espécimen: la revisión de
 * escaneo sobrevivió porque vive como portal y se recompone en el sitio.
 * La cura da a los flujos alojados la otra mitad de esa forma: el
 * borrador se aparca fuera del árbol (flow-park.ts) a cada tecleo; la
 * adopción que cruza la frontera de la gestión (debt.scale) marca lo
 * aparcado como RASGADO antes de recomponer la cara; y la casa, al
 * volver a pintarse, restaura el flujo rasgado con su borrador. Guardar
 * o salir por las reglas propias retira el aparcamiento; navegar sin
 * rasgadura lo descarta (navegar nunca resucitó borradores). Los pines
 * de fuente atan el cableado; el protocolo del módulo se prueba como
 * unidad aquí mismo; el banco en vivo corre los dos especímenes y el
 * control (shots-cura10/). */
describe("ola10 · §D: el aparcamiento de flujos — la adopción no se lleva el trabajo", () => {
  it("el protocolo del módulo: aparcar, rasgar, restaurar, asentar", async () => {
    const fp = await import("./flow-park.ts");
    fp.clearFlow("t:new");
    fp.parkFlow("t:new", { name: "Prueba Ola10", amount: "1500" });
    assert.equal(fp.tornParkedKey(["t:new"]), null, "sin rasgadura no hay restauración: navegar no resucita");
    fp.markTornFlows();
    assert.equal(fp.tornParkedKey(["t:new"]), "t:new", "la adopción rasgó el flujo aparcado");
    assert.deepEqual(fp.peekFlow("t:new"), { name: "Prueba Ola10", amount: "1500" }, "el borrador sobrevive entero fuera del árbol");
    fp.settleFlowParks(["t:new"]);
    assert.equal(fp.flowWasTorn("t:new"), false, "la marca se consume al montar la casa");
    assert.deepEqual(fp.peekFlow("t:new"), { name: "Prueba Ola10", amount: "1500" }, "asentar no borra el borrador del flujo restaurado: lo guarda su forma");
    fp.parkFlow("t:stale", { name: "resto" });
    fp.settleFlowParks(["t:stale"]);
    assert.equal(fp.peekFlow("t:stale"), undefined, "un aparcamiento sin rasgar se descarta al montar: resto de navegación");
    fp.clearFlow("t:new");
    assert.equal(fp.peekFlow("t:new"), undefined, "guardar o salir por las reglas propias retira el aparcamiento");
  });
  it("las dos puertas de adopción marcan lo rasgado solo al cruzar la frontera de la gestión", () => {
    const provider = SRC("../../components/faro/provider.tsx");
    const crossings = provider.split('hasFeature(prevMode, "debt.scale") !== hasFeature(landedMode, "debt.scale")').length - 1;
    assert.equal(crossings, 2, "la puerta de la pestaña (adoptStoredPack) y la de la nube (applyRemote) marcan con la misma condición");
    assert.equal(provider.split("markTornFlows()").length - 1, 2, "cada puerta marca una vez, antes de aplicar la sesión adoptada");
  });
  it("LoanForm aparca al teclear, nace de lo aparcado y retira al guardar o salir por sus reglas", () => {
    const loans = SRC("../../components/faro/loans.tsx");
    assert.ok(loans.includes("parkFlow(parkKey, { kind, who, name, amount, currency, date, apr, book, dueDay })"), "el borrador se aparca a cada tecleo");
    assert.ok(loans.includes("restored?.name ?? initial?.name"), "la forma restaurada nace de lo aparcado, que manda sobre el registro");
    assert.ok(loans.includes("if (parkKey) clearFlow(parkKey);\n    onSave({"), "guardar retira el aparcamiento antes de entregar el borrador");
    assert.ok(loans.includes('parkKey="loan-new:borrow"'), "el alta de Debo aparca bajo su llave");
    assert.ok(SRC("../../components/faro/debts.tsx").includes('parkKey="loan-new:lend"'), "el alta de Me deben aparca bajo su llave");
    assert.ok(loans.includes('parkKey={`loan-edit:borrow:${loan.id}`}'), "la edición de Debo aparca bajo su préstamo");
    assert.ok(SRC("../../components/faro/debts.tsx").includes('parkKey={`loan-edit:lend:${row.id}`}'), "la edición de Me deben aparca bajo su fila");
    assert.ok(loans.includes("tornParkedKey(borrowParkKeys)") && SRC("../../components/faro/debts.tsx").includes("tornParkedKey(lendParkKeys)"),
      "las dos casas consultan la rasgadura al pintarse");
  });
  it("CardForm aparca su borrador entero y lo restaura; CardsGroup le pasa su llave por modo", () => {
    const cards = SRC("../../components/faro/cards.tsx");
    // ENMIENDA OLA 11 (G11-2): el aparcado lleva { d, born } — el borrador
    // nacido es el testigo de toque de la fusión al guardar, y viaja con
    // el borrador para que el guardado restaurado fusione como el
    // directo. La intención de este pin queda: la ficha restaurada nace
    // del aparcado, no de la ficha guardada, y se aparca a cada cambio.
    assert.ok(cards.includes("useState<Draft>(() => restored?.d ?? born)"), "la ficha restaurada nace del aparcado, no de la ficha guardada");
    assert.ok(cards.includes("useState<Draft>(() => restored?.born ?? draftOf(card, seed))"), "el nacido también nace del aparcado");
    assert.ok(cards.includes("parkFlow(parkKey, { d, born })"), "el borrador y su nacido se aparcan a cada cambio");
    assert.ok(cards.includes('`card-form:${form.mode}:${form.id}`') && cards.includes("tornParkedKey(cardParkKeys)"), "la casa de tarjetas restaura por llave (add / edit / update)");
  });
  it("el control queda intacto: la revisión de escaneo no entra en el aparcamiento (su forma es el portal)", () => {
    for (const f of ["stmt-scan.tsx", "receipt-scan.tsx"]) {
      assert.ok(!SRC(`../../components/faro/${f}`).includes("flow-park"), `${f}: el contra-espécimen conserva su forma — vive como portal y se recompone en el sitio`);
    }
  });
});
