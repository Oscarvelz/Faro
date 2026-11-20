/* ════════════════════════════════════════════════════════════════════
 * OLA 20 · LA MESA JUZGA CONTRA LO VIVO, LA ENTRADA ANUNCIADA PERSISTE
 * Y EL CENSO APRENDE LA FORMA RESUELTA (G20-1…G20-5, Q20-1/Q20-2,
 * C20-1/C20-2, Enseñanza Q1/Q2/Q3)
 *
 * La caza XX cazó en la superficie NUEVA de la casa (la mesa de
 * Captura, la tercera puerta) y en las cercas mismas. Esta cerca clava
 * la cura familia a familia:
 *   §A — commitDrafts se niega por identidad cuando no convierte nada,
 *        y la receta de la mesa (puerta guardada, parejas desde lo
 *        vivo, parches por diferencia) no deja marco sobre una bandeja
 *        ya resuelta por otra mano (G20-1/§C).
 *   §B — la entrada anunciada nace marcada, sobrevive a Deshacer y
 *        Rehacer vecinos, y cuenta como trabajo local entre pestañas
 *        aunque la revisión no se mueva (§A/§B de Cambios, A3 de
 *        Guardián). G20-3 queda declarado en la puerta y vigilado
 *        aquí: la puerta anunciada tiene UN solo llamante legítimo.
 *   §C — EL BORDE DECLARADO (G20-2): las puertas juzgan lo que la
 *        receta devuelve, jamás lo que toca. Los especímenes M1–M3
 *        clavan la mutación en el sitio como el límite asentado de la
 *        garantía escrita: si una cura futura lo mueve, este pin se
 *        enmienda con su razón, no se descubre en la próxima ola.
 *   §D — el gobierno dentro del render condicional interno de la mesa
 *        (C20-1): cada herramienta de la cara completa cuelga de una
 *        condición que nombra la consulta `full` — presencia no es
 *        gobierno, tampoco en esta forma. Y el guardia anti-cadáver
 *        de la tarjeta de la bandeja gana su pin (C20-2).
 *   §E — la enseñanza dice la verdad de los pisos (Q1/Q2/Q3) y los
 *        dos silencios se cierran: los borradores viajan con el libro
 *        (fallo D1) y el verbo descartar se enseña en su tema.
 *   §F — la barra de bache apilada (Q20-2): su CSS queda clavado; la
 *        prueba renderizada vive en el cierre en vivo de la cura.
 * ════════════════════════════════════════════════════════════════════ */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { createInitial } from "./defaults.ts";
import { blankSession, commit, commitAnnounced, commitFinal, commitGuarded, redo, undo } from "./reducer.ts";
import { addDrafts, commitDrafts, learnFromSaved, type DraftCtx } from "./drafts.ts";
import { announcedAbsent, localWorkVerdict } from "./packguard.ts";
import { MANUAL_TOPICS } from "../manual/topics.ts";
import type { Draft, LedgerState } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const base = (): LedgerState => createInitial("es", "claro");
const ctx = (s: LedgerState): DraftCtx => ({ monthKey: "2026-11", structure: s.structure, lang: "es" });
let seq = 0;
const mkDraft = (patch: Partial<Draft> = {}): Draft => ({
  id: `d${++seq}`, source: "photo", kind: "line", raw: "FOTO: recibo crudo", createdAt: "2026-11-19T20:00:00.000Z",
  day: "2026-11-18", sign: "out", amountMinor: 12500, currency: "USD", concept: "Publix", note: "",
  book: "expense-variable", unsure: [], missing: [], ...patch,
});

/* ═══════════ §A · LA MESA JUZGA CONTRA LO VIVO (G20-1/§C) ═══════════ */
describe("ola20 · §A: commitDrafts se niega por identidad y la mesa no enmarca fantasmas", () => {
  it("commitDrafts devuelve el MISMO objeto cuando no convierte nada", () => {
    let s = base();
    const a = mkDraft({ concept: "Uno" });
    s = addDrafts(s, [a]);
    const after = commitDrafts(s, [a.id], ctx(s));
    assert.notEqual(after, s, "el primer guardado sí mueve: crea la línea y retira el borrador");
    assert.equal(after.months["2026-11"]!.lines.length, 1);
    assert.equal(commitDrafts(after, [a.id], ctx(after)), after, "el id ya no vive (otra mano lo guardó): identidad, no objeto fabricado");
    const red = mkDraft({ concept: "Rojo", amountMinor: null });
    const s2 = addDrafts(base(), [red]);
    assert.equal(commitDrafts(s2, [red.id], ctx(s2)), s2, "el borrador en rojo no se convierte: identidad");
    assert.equal(commitDrafts(s2, ["id-ajeno"], ctx(s2)), s2, "ids que no viven en la bandeja: identidad");
  });

  it("la composición de la receta de la mesa sobre la bandeja ya resuelta no deja marco ni aprende", () => {
    // la otra mano ya guardó el borrador: el libro vivo ya no lo trae
    let s = base();
    const a = mkDraft({ concept: "Publix" });
    s = addDrafts(s, [a]);
    const resuelto = commitDrafts(s, [a.id], ctx(s));
    const sesion = blankSession(resuelto);
    // la receta con la forma exacta de la mesa (los pines de fuente de
    // abajo atan el componente a esta composición): parejas desde lo
    // vivo (ninguna), commitDrafts (identidad), aprendizaje sin parejas
    const out = commitGuarded(sesion, (live) => {
      const pairs: { draft: Draft; line: never; force?: boolean }[] = [];
      let next = commitDrafts(live, [a.id], ctx(live));
      next = learnFromSaved(next, pairs as never[]);
      return next;
    }, "Revisión 1");
    assert.equal(out.ledger, sesion.ledger, "sin marco: el libro es el mismo objeto — ni entrada, ni revisión");
    assert.equal(out.past, sesion.past, "sin fotograma de Deshacer vacío");
    assert.equal(out.ledger.audit.length, sesion.ledger.audit.length, "el registro no gana la línea fantasma «Revisión 1»");
    assert.equal(out.ledger.imports, sesion.ledger.imports, "y la casa no aprende ninguna regla de un guardado que no ocurrió");
  });

  it("la receta viva SÍ aterriza cuando el borrador sigue esperando (la cura no mata el guardado sano)", () => {
    let s = base();
    const a = mkDraft({ concept: "Publix" });
    s = addDrafts(s, [a]);
    const sesion = blankSession(s);
    const out = commitGuarded(sesion, (live) => commitDrafts(live, [a.id], ctx(live)), "Revisión 1");
    assert.notEqual(out.ledger, sesion.ledger, "con el borrador vivo, el guardado enmarca como siempre");
    assert.equal(out.ledger.months["2026-11"]!.lines.length, 1, "la línea nació");
    assert.equal((out.ledger.drafts ?? []).length, 0, "y el borrador se retiró");
  });

  it("save() de la mesa: la puerta es la guardada y todo se calcula dentro, contra lo vivo", () => {
    const src = SRC("../../components/faro/review-table.tsx");
    const save = src.slice(src.indexOf("function save()"), src.indexOf("const applyBatchHouse"));
    assert.ok(src.includes("const { session, commitGuarded, key, lang, names, has } = useFaro();"), "la mesa toma la puerta guardada de useFaro");
    assert.ok(save.includes("commitGuarded((s) => {"), "el guardado viaja por commitGuarded");
    assert.ok(!save.includes("commit((s)"), "la puerta ordinaria ya no enmarca el guardado de la mesa");
    assert.ok(save.includes("const before = (s.drafts ?? []).find((x) => x.id === id) ?? liveNow;"), "la pareja del aprendizaje nace del libro que la receta recibió (s), no de la foto");
    assert.ok(save.includes("const line = draftToLine(liveNow, ctx);"), "la línea se convierte desde el borrador VIVO ya parchado");
    assert.ok(save.includes("JSON.stringify(d[k]) !== JSON.stringify(orig[k]) && JSON.stringify(d[k]) !== JSON.stringify(live[k])"),
      "el parche es por diferencia contra el original Y contra lo vivo: la corrección concurrente a otro campo sobrevive (C3)");
    assert.ok(save.includes("`Revisión ${landed}`"), "el detalle nombra las líneas que ESTE guardado creó, no las de la foto");
  });

  it("save() pregunta el asiento de «recordar» AL GUARDAR, no al armar (Q20-1)", () => {
    const src = SRC("../../components/faro/review-table.tsx");
    const save = src.slice(src.indexOf("function save()"), src.indexOf("const applyBatchHouse"));
    assert.ok(save.includes("const fullNow = has(\"capture.review-full\");"), "la consulta se hace dentro de save(), con la cara actual");
    assert.ok(save.includes("force: fullNow && !!forceWanted.get(id)"), "la fuerza es fullNow Y lo armado: en Esencial la instrucción de Ritmo no se ejecuta");
  });
});

/* ═══════════ §B · LA ENTRADA ANUNCIADA PERSISTE (§A/§B, G20-3) ═══════════ */
describe("ola20 · §B: la entrada anunciada sobrevive a la pila y cuenta entre pestañas", () => {
  const aterrizaje = (s: LedgerState): LedgerState => ({ ...s, settings: { ...s.settings, rateE4: 369900 } });

  it("el aborto anunciado marca su entrada; el aterrizaje por la misma puerta, no", () => {
    let ses = blankSession(base());
    const revBase = ses.ledger.revision;
    ses = commitAnnounced(ses, (s) => s, "La confirmación no aplicó");
    assert.equal(ses.ledger.audit[0]!.announced, true, "la entrada del aborto nace marcada");
    assert.equal(ses.ledger.revision, revBase, "y la revisión no se movió");
    let ses2 = blankSession(base());
    ses2 = commitAnnounced(ses2, aterrizaje, "Aplicó");
    assert.equal(ses2.ledger.audit[0]!.announced, undefined, "la entrada de un aterrizaje es una entrada ordinaria, sin marca");
  });

  it("§A-1: aterrizaje → aborto anunciado → Deshacer: el aterrizaje se deshace y la entrada QUEDA", () => {
    let ses = blankSession(base());
    const tasaBase = ses.ledger.settings.rateE4;
    ses = commit(ses, aterrizaje, "Tasa nueva");
    ses = commitAnnounced(ses, (s) => s, "La confirmación no aplicó: ya estabas ahí");
    const deshecho = undo(ses);
    assert.notEqual(deshecho, ses, "el Deshacer sí actuó");
    assert.equal(deshecho.ledger.settings.rateE4, tasaBase, "el aterrizaje se deshizo");
    assert.ok(deshecho.ledger.audit.some((e) => e.announced && e.detail.includes("no aplicó")),
      "la entrada anunciada sobrevive: el registro no vuelve a cero ni pierde la línea veraz");
  });

  it("§A-2: aterrizaje → Deshacer → aborto anunciado → Rehacer: la línea vuelve y la entrada QUEDA", () => {
    let ses = blankSession(base());
    ses = commit(ses, aterrizaje, "Tasa nueva");
    ses = undo(ses);
    ses = commitAnnounced(ses, (s) => s, "La confirmación no aplicó");
    const rehecho = redo(ses);
    assert.equal(rehecho.ledger.settings.rateE4, 369900, "el Rehacer trae el aterrizaje de vuelta");
    assert.ok(rehecho.ledger.audit.some((e) => e.announced && e.detail.includes("no aplicó")),
      "la entrada anunciada, acuñada entre el Deshacer y el Rehacer, también sobrevive a la restauración");
  });

  it("§B: localWorkVerdict — la diferencia de registro con revisión igual ES trabajo local", () => {
    const b = base();
    const entrada = { id: "ea-1", at: "2026-11-20T10:00:00.000Z", detail: "La confirmación no aplicó", announced: true };
    const mine: LedgerState = { ...b, audit: [entrada, ...b.audit] };
    const stored: LedgerState = { ...b, revision: b.revision + 1, audit: [{ id: "otra-1", at: "2026-11-20T10:01:00.000Z", detail: "Línea" }, ...b.audit] };
    assert.equal(announcedAbsent(mine, stored), true, "la entrada anunciada no está en el pack guardado");
    assert.equal(localWorkVerdict(JSON.stringify(mine), JSON.stringify(stored), mine, stored, b.revision), true,
      "§B clavado: mi única diferencia es la entrada y la revisión no se movió — hay trabajo local, se aparta, no se evapora");
    // los controles de la doctrina vieja siguen diciendo su verdad
    assert.equal(localWorkVerdict(JSON.stringify(mine), JSON.stringify(mine), mine, mine, b.revision), false,
      "contenido idéntico al guardado: no hay trabajo (la siembra sucia no aparta fantasmas, OBS-C5-1)");
    assert.equal(localWorkVerdict(JSON.stringify(mine), null, mine, null, b.revision), true,
      "sin pack legible, la preservación gana el empate");
    const movida: LedgerState = { ...b, revision: b.revision + 1, updatedAt: "2026-11-20T10:02:00.000Z" };
    assert.equal(localWorkVerdict(JSON.stringify(movida), JSON.stringify(b), movida, b, b.revision), true,
      "la revisión movida sigue siendo trabajo local, como siempre");
    const yaGuardada: LedgerState = { ...b, audit: mine.audit, months: {} };
    assert.equal(localWorkVerdict(JSON.stringify(mine), JSON.stringify(yaGuardada), mine, yaGuardada, b.revision), false,
      "si el pack ya guarda la entrada, la entrada está a salvo: no hay trabajo que apartar por ella");
  });

  it("G20-3 vigilado: la puerta anunciada tiene UN solo llamante legítimo en los componentes", () => {
    const dir = new URL("../../components/faro/", import.meta.url);
    const llamantes: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isFile() || !/\.tsx$/.test(e.name) || e.name === "provider.tsx") continue;
      const text = readFileSync(new URL(e.name, dir), "utf8");
      const n = (text.match(/commitAnnounced\(/g) ?? []).length;
      if (n) llamantes.push(`${e.name} ×${n}`);
    }
    assert.deepEqual(llamantes, ["screens.tsx ×1"],
      "el único llamante es la confirmación de modo en screens.tsx; todo llamante nuevo acusa aquí hasta ser clasificado (el límite declarado de la puerta vive en reducer.ts)");
  });
});

/* ═══════════ §C · EL BORDE DECLARADO (G20-2, M1–M3) ═══════════ */
describe("ola20 · §C: las puertas juzgan lo devuelto, jamás lo tocado — el borde asentado", () => {
  // La mutación en el sitio: la receta TOCA el estado y devuelve el
  // mismo objeto. Las tres puertas leen la identidad de lo devuelto:
  // la mutación aterriza sin marco. Esto NO es un descuido por curar
  // en silencio — es el límite declarado de la garantía (reducer.ts,
  // comentario de las tres puertas), clavado aquí para que sea
  // doctrina: el barrido de producción corre limpio (toda mutación de
  // la casa trabaja sobre copias frescas) y si un día las puertas
  // aprenden a juzgar el tacto, este pin se enmienda CON SU RAZÓN.
  const mutante = (s: LedgerState): LedgerState => {
    s.audit.push({ id: "mx-1", at: "2026-11-20T10:00:00.000Z", detail: "mutación en el sitio" });
    return s;
  };

  it("M2 · commitGuarded: la mutación en el sitio aterriza sin marco (el borde, no un descuido)", () => {
    const ses = blankSession(base());
    const antes = ses.ledger.audit.length;
    const out = commitGuarded(ses, mutante, "detalle");
    assert.equal(out.ledger, ses.ledger, "la puerta devuelve la sesión sin marco: el libro es el mismo objeto");
    assert.equal(out.ledger.audit.length, antes + 1, "…y sin embargo la mutación ESTÁ en el libro: ese es exactamente el borde declarado");
    assert.equal(out.past, ses.past, "sin fotograma");
    assert.equal(out.ledger.revision, ses.ledger.revision, "sin revisión");
  });

  it("M1 · commitFinal: la mutación en el sitio no vacía el pasado ni enmarca (el borde)", () => {
    const ses = blankSession(base());
    const antes = ses.ledger.audit.length;
    const out = commitFinal(ses, mutante, "detalle");
    assert.equal(out.past, ses.past, "el pasado NO se vacía: la identidad devuelta cortocircuita la finalidad");
    assert.equal(out.ledger.audit.length, antes + 1, "la mutación aterrizó en silencio: el borde, clavado");
  });

  it("M3 · commitAnnounced: la mutación en el sitio aterriza bajo la entrada del aborto (el borde)", () => {
    const ses = blankSession(base());
    const antes = ses.ledger.audit.length;
    const out = commitAnnounced(ses, mutante, "La confirmación no aplicó");
    assert.equal(out.ledger.audit.length, antes + 2, "la entrada anunciada Y la mutación: la puerta juzgó lo devuelto (identidad ⇒ aborto), no lo tocado");
    assert.equal(out.ledger.revision, ses.ledger.revision, "sin revisión");
    assert.equal(out.past, ses.past, "sin fotograma");
  });
});

/* ═══════════ §D · EL GOBIERNO DENTRO DEL RENDER (C20-1/C20-2) ═══════════ */
describe("ola20 · §D: la cara completa gobierna sus herramientas dentro de la mesa, y la tarjeta no nace vacía", () => {
  const file = new URL("../../components/faro/review-table.tsx", import.meta.url);
  const sf = ts.createSourceFile("review-table.tsx", readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const parents = new Map<ts.Node, ts.Node>();
  const index = (n: ts.Node) => { ts.forEachChild(n, (c) => { parents.set(c, n); index(c); }); };
  index(sf);
  const subtreeHas = (root: ts.Node, pred: (n: ts.Node) => boolean): boolean => {
    let hit = false;
    const walk = (n: ts.Node) => { if (hit) return; if (pred(n)) { hit = true; return; } ts.forEachChild(n, walk); };
    walk(root);
    return hit;
  };
  const namesFull = (n: ts.Node) => subtreeHas(n, (x) => ts.isIdentifier(x) && x.text === "full");
  /** ¿El nodo cuelga de una condición que nombra `full`, por su rama verdadera? */
  const governedByFull = (node: ts.Node): boolean => {
    let cur: ts.Node | undefined = node;
    while (cur) {
      const p = parents.get(cur);
      if (!p) return false;
      if (ts.isConditionalExpression(p) && cur === p.whenTrue && namesFull(p.condition)) return true;
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && cur === p.right && namesFull(p.left)) return true;
      cur = p;
    }
    return false;
  };
  const jsxWith = (cls: string): ts.Node[] => {
    const out: ts.Node[] = [];
    const walk = (n: ts.Node) => {
      if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))) {
        const open = ts.isJsxElement(n) ? n.openingElement : n;
        const attr = open.attributes.properties.find((a) => ts.isJsxAttribute(a) && ts.isIdentifier(a.name) && a.name.text === "className");
        const val = attr && ts.isJsxAttribute(attr) ? attr.initializer : undefined;
        if (val && ts.isStringLiteral(val) && val.text.split(/\s+/).includes(cls)) out.push(n);
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
    return out;
  };
  const jsxTag = (tag: string): ts.Node[] => {
    const out: ts.Node[] = [];
    const walk = (n: ts.Node) => {
      if (ts.isJsxSelfClosingElement(n) && ts.isIdentifier(n.tagName) && n.tagName.text === tag) out.push(n);
      if (ts.isJsxElement(n) && ts.isIdentifier(n.openingElement.tagName) && n.openingElement.tagName.text === tag) out.push(n);
      ts.forEachChild(n, walk);
    };
    walk(sf);
    return out;
  };

  it("la consulta vive y se llama `full`", () => {
    let found = false;
    const walk = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === "full" && n.initializer && ts.isCallExpression(n.initializer)) {
        const callee = n.initializer.expression;
        const arg = n.initializer.arguments[0];
        if (ts.isIdentifier(callee) && callee.text === "has" && arg && ts.isStringLiteral(arg) && arg.text === "capture.review-full") found = true;
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
    assert.ok(found, "const full = has(\"capture.review-full\") — la consulta que gobierna");
  });

  it("la barra de bache, el FreqPick y «recordar» cuelgan de la condición que nombra la consulta", () => {
    const batch = jsxWith("rev-batch");
    assert.equal(batch.length, 1, "la barra de bache existe una vez");
    assert.ok(governedByFull(batch[0]!), "la barra de bache: despuertarla conservando la consulta corre rojo aquí (C20-1)");
    const freq = jsxTag("FreqPick");
    assert.equal(freq.length, 1, "el FreqPick existe una vez");
    assert.ok(governedByFull(freq[0]!), "el FreqPick cuelga de `recur && full`: sin full en su condición, rojo");
    const remember = jsxWith("rev-remember");
    assert.equal(remember.length, 1, "el bloque «recordar» existe una vez");
    assert.ok(governedByFull(remember[0]!), "«recordar esta tienda así» solo se pinta bajo la cara completa");
  });

  it("la casa editable y la casa de texto se eligen por la misma condición", () => {
    // el condicional que enfrenta <ThemeSelect> (rev-house) contra el
    // texto estático (is-static) pregunta por `full` en su condición
    let seen = 0;
    const walk = (n: ts.Node) => {
      if (ts.isConditionalExpression(n)
        && subtreeHas(n.whenTrue, (x) => ts.isJsxSelfClosingElement(x) && ts.isIdentifier(x.tagName) && x.tagName.text === "ThemeSelect")
        && subtreeHas(n.whenFalse, (x) => ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x))) {
        seen++;
        assert.ok(namesFull(n.condition), "la elección casa editable / casa de texto nombra la consulta en su condición");
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
    assert.equal(seen, 1, "hay exactamente un condicional de casa en la fila");
  });

  it("C20-2: la tarjeta de la bandeja no nace con la bandeja vacía — su guardia tiene pin", () => {
    const tray = SRC("../../components/faro/tray.tsx");
    assert.match(tray, /if \(!has\("capture\.tray"\) \|\| drafts\.length === 0\) return null;/,
      "TrayCard devuelve null sin borradores: retirar `|| drafts.length === 0` corre rojo aquí — nada de tarjetas fantasma");
  });
});

/* ═══════════ §E · LA ENSEÑANZA DICE SU PISO (Q1/Q2/Q3 + silencios) ═══════════ */
describe("ola20 · §E: los tips de Captura enseñan la verdad de cada modo", () => {
  const topic = (id: string) => {
    const t = MANUAL_TOPICS.find((x) => x.id === id);
    assert.ok(t, `el tema ${id} existe`);
    return t!;
  };

  it("Q1: el tip de la mesa nombra [[Ritmo]] para corregir la casa y recordar la tienda", () => {
    const t = topic("captura-mesa");
    assert.ok(t.tip?.[0].includes("en [[Ritmo]]"), "ES: el acto de Ritmo nombra su piso, como manda la convención de la casa");
    assert.ok(t.tip?.[1].includes("in [[Rhythm]]"), "EN: the Rhythm act names its floor");
    assert.ok(!t.tip?.[0].includes("cuando corriges la casa de una tienda y guardas, Faro lo recuerda"),
      "la frase vieja — que enseñaba en Esencial un acto de Ritmo sin nombrarlo — ya no está");
  });

  it("Q2+Q3: el tip de escanear nombra [[Completo]] y la cláusula falsa de la bandeja murió", () => {
    const t = topic("escanear");
    assert.ok(t.tip?.[0].includes("en [[Completo]]"), "ES: la fila de recompensas nombra su piso");
    assert.ok(t.tip?.[1].includes("in [[Complete]]"), "EN: the rewards row names its floor");
    assert.ok(!t.tip?.[0].includes("antes de que caiga en la bandeja"), "la cláusula falsa murió en ES: las recompensas nunca caen en la bandeja");
    assert.ok(!t.tip?.[1].includes("before anything lands in the tray"), "the false clause died in EN too");
    assert.ok(t.tip?.[0].includes("sin caer en la bandeja"), "y el camino verdadero se dice: entran directas a la tarjeta");
    assert.ok(t.tip?.[1].includes("never landing in the tray"), "and the true path is said in EN");
  });

  it("Q3 en su casa: el tema de la bandeja enseña la excepción — las recompensas no esperan", () => {
    const t = topic("captura-mesa");
    assert.ok(t.what[0].includes("las recompensas de un escaneo no caen en la bandeja"), "ES: la excepción al «todo espera» queda enseñada donde se enseña la bandeja");
    assert.ok(t.what[1].includes("a scan's rewards never land in the tray"), "EN: the exception is taught where the tray is taught");
  });

  it("los dos silencios se cierran: los borradores viajan con el libro (D1) y descartar se enseña", () => {
    const t = topic("captura-mesa");
    assert.ok(t.what[0].includes("Los borradores viajan con el libro"), "ES: el fallo D1 de Oscar, dicho en el tema de la bandeja");
    assert.ok(t.what[1].includes("Drafts travel with the book"), "EN: Oscar's D1 ruling, said in the tray topic");
    assert.ok(t.how?.[0].includes("la descarta"), "ES: el verbo descartar se enseña en su tema");
    assert.ok(t.how?.[1].includes("discards it"), "EN: the discard verb is taught in its topic");
  });
});

/* ═══════════ §F · LA BARRA DE BACHE CABE (Q20-2) ═══════════ */
describe("ola20 · §F: la barra de la mesa, apilada — su CSS queda clavado", () => {
  const css = SRC("../../components/faro/scan.css");
  it("la etiqueta respira en su línea y el texto del selector se corta dentro de su píldora", () => {
    assert.match(css, /\.rev-batch \{[^}]*flex-wrap: wrap/, "la barra envuelve: etiqueta arriba, controles abajo");
    assert.match(css, /\.rev-batch-lab \{[^}]*flex: 1 1 100%/, "la etiqueta ocupa su propia línea entera");
    assert.match(css, /\.rev-batch \.theme-select-btn > span:first-child \{[^}]*text-overflow: ellipsis/,
      "el texto del selector se corta con elipsis dentro de la píldora: una casa larga se lee cortada, jamás derramada sobre «Aplicar»");
    assert.match(css, /\.rev-batch \.theme-select-btn \.fold-chev \{[^}]*flex: none/, "el chevron no se sale de su píldora");
  });
});
