/**
 * FARO — OLA 7 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: EL GRANO FINO — la cura de la ola 6 cruzó los
 * temas contra el LIBRO y la superficie gruesa; lo que quedaba cruza contra
 * el asiento del CAMPO (CARA-1/2/3), contra textos fijos ciegos al modo
 * (CARA-4, CARA-6), contra un botón sin puerta (CARA-5), contra prosa de
 * capítulo que describe otra cara (CARA-7), contra la maquinaria de saltos
 * que resalta el primer «+» que encuentra (CARA-9), contra el aviso que
 * escribe lo que el campo puertado no pinta (G7-1) y contra las costuras
 * de la Presentación (E7-1, E7-2). Y la cerca que el Guardián VII pidió:
 * la CONSERVACIÓN de los campos puertados no tenía ni un pin — bajo la
 * mutación M3 la suite entera pasaba verde (§D).
 *
 * C7-1 no se cura aquí: su raíz (el `nowrap` del toast) la curó el carril
 * de la 1.3.307 en canon; su pin (§M) guarda esa cura contra regresiones.
 * Donde la rotura vive en un componente, la cerca es de fuente y el banco
 * CDP de la ronda la acompaña (shots-cura7/). Jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { MODULES, TOPIC_SCENES } from "./guion.ts";
import { FEATURES, type Mode } from "./mode.ts";
import { findTopic, topicMode } from "../manual/topics.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

/* ═══════════ §A · CARA-1/2/3 + OLA 8 CARA-1: LA VALLA TEMA↔CAMPO, DERIVADA ═══════════
 * Cada tema de campo vive en el modo del ASIENTO DE SU CAMPO — no en el del
 * libro donde el campo casualmente se abre. La ola 7 la escribió como LISTA
 * de 14 pares; la ola 8 (CARA-1) demostró con su mutación M3 que una lista
 * no basta: re-asentar f-prestamo-monto de forma CONSISTENTE (el mapa §10 y
 * los conteos enmendados a la vez) pasaba la suite entera, porque ningún pin
 * cruzaba el mapa contra el CÓDIGO. Desde la ola 8 los pares se DERIVAN del
 * mapa §10 (modos-ola5): todo tema f-* con campo declarado entra solo, y dos
 * familias se cruzan además contra su gobernador legible en el código — las
 * monturas del editor (tras has() en line-form.tsx) y la puerta de la forma
 * de Cobros (el has() que abre el alta en debts.tsx). Si el mapa declara
 * otra cosa que el campo, la cerca acusa la discrepancia mapa↔campo. */
describe("ola7+8 · el tema sigue al CAMPO: los pares se derivan del mapa §10", () => {
  const mapaSrc = SRC("./modos-ola5.test.ts");
  const DECLARED = new Map<string, string>();
  for (const m of mapaSrc.matchAll(/"(f-[a-z0-9-]+)": \{ f: "([a-z0-9.-]+)", m: "(esencial|ritmo|completo)" \}/g)) {
    DECLARED.set(m[1]!, m[2]!);
  }
  it("la derivación encuentra la familia entera de campos declarados del mapa", () => {
    assert.ok(DECLARED.size >= 45,
      `el mapa §10 declara ${DECLARED.size} campos f-*: si el parseo cae en silencio, la cerca derivada no deriva nada`);
  });
  for (const [id, seat] of DECLARED) {
    it(`${id} vive en el modo de su campo (${seat})`, () => {
      const tp = findTopic(id);
      assert.ok(tp, `el tema ${id} existe`);
      const seatMode = (FEATURES as Record<string, Mode>)[seat];
      assert.ok(seatMode, `el asiento ${seat} existe en el registro`);
      assert.equal(topicMode(tp), seatMode,
        `${id}: el tema vive en ${topicMode(tp)} y su campo en ${seatMode} — la (?) mentiría sobre el campo que enseña`);
    });
  }

  /* El cruce de fuente, derivado: la montura de cada (?) del editor vive
   * tras la puerta de su campo en line-form.tsx (al menos una montura
   * gobernada por el asiento declarado; los campos de cadencia montan
   * también en el bloque de la suscripción, donde manda la marca —
   * subs.brand-library). El brazo corre sobre todo par derivado cuyo
   * asiento se ejerce en el editor y cuyo tema monta en él: sin lista. */
  const form = SRC("../../components/faro/line-form.tsx");
  const governingSeats = (topic: string): Set<string> => {
    const out = new Set<string>();
    let at = 0;
    for (;;) {
      const i = form.indexOf(`"${topic}"`, at);
      if (i < 0) break;
      const before = form.slice(0, i);
      const g = before.lastIndexOf('has("');
      if (g >= 0) out.add(before.slice(g + 5, before.indexOf('"', g + 5)));
      at = i + 1;
    }
    return out;
  };
  /* Declarada, con su razón (la disciplina del trinquete): una montura
   * cuyo gobernador la heurística no puede nombrar. El bloque de cadencia
   * de la suscripción no lleva has() propio — ES el editor básico del
   * fallo 5: sus campos pintan por la rama del kind, y el asiento
   * subs.cadence-basic se consume en el bloque gemelo de los recurrentes
   * que no son suscripción. La heurística nombra al has() textual
   * anterior, el del campo de la marca, que gobierna solo ese campo.
   * La exención no puede crecer sin escribir aquí su razón. */
  const MOUNT_SIN_GOBERNADOR_LEGIBLE: Record<string, string> = {
    "f-proximo-cobro": "su única montura vive en el bloque de cadencia de la suscripción, sin has() propio (el editor básico del fallo 5)",
  };
  for (const [id, seat] of DECLARED) {
    if (!form.includes(`has("${seat}")`) || !form.includes(`"${id}"`)) continue;
    if (id in MOUNT_SIN_GOBERNADOR_LEGIBLE) continue;
    it(`la (?) de ${id} monta tras la puerta de su campo (${seat})`, () => {
      assert.ok(governingSeats(id).has(seat),
        `${id}: ninguna montura está gobernada por ${seat} (gobiernan: ${[...governingSeats(id)].join(", ")})`);
    });
  }
  it("las exenciones de montura son las declaradas y de verdad carecen de gobernador legible", () => {
    for (const id of Object.keys(MOUNT_SIN_GOBERNADOR_LEGIBLE)) {
      assert.ok(DECLARED.has(id), `${id}: la exención nombra un tema con campo declarado en el mapa`);
      assert.ok(!governingSeats(id).has(DECLARED.get(id)!),
        `${id}: si su asiento ya gobierna una montura legible, la exención sobra y debe salir`);
    }
  });

  /* La puerta de Cobros (el brazo que mata la mutación M3 de la ola 8):
   * la forma LoanForm monta en loans.tsx, pero su ALTA la abre un has() en
   * debts.tsx. Todo tema montado en loans.tsx con campo declarado declara
   * ESE asiento: si el mapa lo re-asienta a otra parte — aunque enmiende
   * también su modo y los conteos — el tema viviría en otro modo que la
   * forma que enseña, y esta cerca lo acusa contra el código, no contra
   * otra declaración. */
  it("la familia de Cobros declara el asiento que abre su forma (debts.tsx)", () => {
    const debts = SRC("../../components/faro/debts.tsx");
    const loans = SRC("../../components/faro/loans.tsx");
    const plus = debts.indexOf("cobro-plus");
    assert.ok(plus > 0, "el botón de alta de Cobros existe");
    const before = debts.slice(0, plus);
    const g = before.lastIndexOf('has("');
    assert.ok(g >= 0, "la puerta del alta es un has()");
    const door = before.slice(g + 5, before.indexOf('"', g + 5));
    const mounted = new Set([...loans.matchAll(/"(f-[a-z0-9-]+)"/g)].map((m) => m[1]!));
    const family = [...mounted].filter((id) => DECLARED.has(id));
    assert.ok(family.length >= 10, `la familia de Cobros con campo declarado: ${family.length} temas`);
    for (const id of family) {
      assert.equal(DECLARED.get(id), door,
        `${id} monta en la forma de Cobros pero el mapa declara ${DECLARED.get(id)} y la puerta es ${door}: el tema viviría en otro modo que su forma (M3)`);
    }
  });
});

/* ═══════════ §B · CARA-9 (dato): el «go» de f-proveedor es de Compras ═══════════ */
describe("ola7 · CARA-9: el dato del salto de f-proveedor", () => {
  it("f-proveedor apunta al libro Compras, como sus hermanos de bloque", () => {
    const tp = findTopic("f-proveedor");
    assert.equal(tp?.go?.screen, "shops", "su campo vive en el editor de Compras, no en Cuotas");
    assert.equal(findTopic("f-codigo")?.go?.screen, "shops");
    assert.equal(findTopic("f-enlace")?.go?.screen, "shops");
  });
});

/* ═══════════ §C · CARA-9 (maquinaria): el salto resalta el «+» DE SU LIBRO ═══════════ */
describe("ola7 · CARA-9: la maquinaria conmuta al libro antes de resaltar", () => {
  const host = SRC("../../components/faro/focus-host.tsx");
  const screens = SRC("../../components/faro/screens.tsx");
  const provider = SRC("../../components/faro/provider.tsx");
  it("cada bloque de libro declara su libro en el DOM (data-book)", () => {
    assert.ok(screens.includes("data-book="), "el bloque de líneas marca a qué libro pertenece su «+»");
  });
  it("goTopic entrega la pantalla destino a la petición de foco", () => {
    const at = provider.indexOf("requestFocus(");
    assert.ok(provider.slice(at, at + 220).includes("screen: go.screen"),
      "sin la pantalla destino, el foco no puede acotar la búsqueda al libro del salto");
  });
  it("el foco busca primero dentro del libro destino", () => {
    assert.ok(host.includes("data-book"), "la búsqueda del ancla se acota al libro del «go» antes de caer a la global");
  });
});

/* ═══════════ §D · G7-1 + LA CONSERVACIÓN (la cerca que faltaba) ═══════════ */
describe("ola7 · G7-1: el aviso aprendido obedece el mismo asiento que la pintura", () => {
  const form = SRC("../../components/faro/line-form.tsx");
  it("el efecto del aviso consulta editor.paid-with antes de sellar", () => {
    assert.ok(form.includes('if (existing || payTouched || !has("editor.paid-with")) return;'),
      "sin la puerta, el aviso sella sourceId en silencio donde el campo no se pinta (Esencial)");
  });
});

describe("ola7 · la conservación de los campos puertados, fijada por fin", () => {
  const form = SRC("../../components/faro/line-form.tsx");
  it("el estado «pay» nace del sourceId guardado (la mutación M3 del Guardián VII corre roja aquí)", () => {
    assert.ok(form.includes('useState(existing?.sourceId ?? "")'),
      "si el estado naciera vacío, TODA edición borraría el «Pagado con» por el delete nombrado — en cualquier modo");
  });
  it("el estado «active» nace del active guardado", () => {
    assert.ok(form.includes("useState(existing?.active ?? true)"),
      "si el estado naciera en true, editar en un modo sin el interruptor resucitaría la línea pausada");
  });
  it("la raíz de la fusión sigue verbatim (séptima vuelta)", () => {
    assert.ok(form.includes("const line: Line = existing ? { ...existing, ...fresh } : fresh;"),
      "el esparcido que conserva lo no pintado no se toca");
  });
  it("el sourceId solo se borra por el delete nombrado, nunca por omisión", () => {
    assert.ok(form.includes("if (!payEff) delete line.sourceId"),
      "el borrado deliberado es el del sello efectivo que la mano vació con el campo despierto, no un efecto del modo (ola 8: la condición es payEff, la guardia de la puerta de G8-4)");
  });
  /* OLA 8 · G8-1/2/3: la cerca crece al CENSO CERRADO. El Guardián VIII mutó
   * tres hermanas y la suite pasaba entera: §D fijaba el inicializador de
   * «active», no su SALIDA en el literal fresh (MA: active: true resucita
   * toda línea pausada al editarla); el inicializador de payTouched no
   * estaba fijado en ninguna parte (MB: nacido en true, el aviso jamás
   * sella y todo guardado «aprende» de un pay no tocado); y el pin del
   * delete miraba PRESENCIA, no EXCLUSIVIDAD (MC: un segundo delete de
   * sourceId escondido entre los legítimos lo borraría en cada edición).
   * Las tres mutaciones corren rojas bajo los tres pines de aquí abajo. */
  it("la SALIDA del literal fresh: «active» sale del estado, no true (mutación MA)", () => {
    const at = form.indexOf("const fresh: Line = {");
    assert.ok(at > 0, "el literal fresh existe");
    const block = form.slice(at, form.indexOf("const line: Line", at));
    assert.ok(block.includes("\n      active,\n"), "el literal lleva el estado tal cual: editar una línea pausada no la resucita");
    assert.ok(!block.includes("active: true"), "con active: true el guardado resucitaría toda línea pausada, en cualquier modo");
  });
  it("el testigo payTouched nace en false (mutación MB)", () => {
    assert.ok(form.includes("const [payTouched, setPayTouched] = useState(false);"),
      "si naciera en true, el aviso jamás sellaría y todo guardado «aprendería» de un pay que la mano no tocó en esta forma — también de una línea importada");
  });
  /* OLA 9 · G9-1: la cerca crece a los testigos del ICONO. La
   * restauración G-6 — si la mano no eligió icono ni tocó la marca, el
   * guardado conserva el icono guardado — cuelga de DOS testigos, y la
   * §D no fijaba el nacimiento de ninguno: el Guardián IX mutó
   * iconPicked a nacer en true y la suite entera pasaba verde
   * (1773/1773), con la restauración muerta en silencio (toda edición
   * conservaría el icono recién calculado y perdería el guardado). Los
   * dos nacimientos quedan fijados aquí, junto a los de su especie; la
   * mutación M-B corre roja bajo estos pines. */
  it("el testigo iconPicked nace en false (mutación M-B del Guardián IX)", () => {
    assert.ok(form.includes("const [iconPicked, setIconPicked] = useState(false);"),
      "si naciera en true, la restauración G-6 jamás correría: editar una línea perdería su icono guardado en cualquier modo");
  });
  it("el testigo brandTouched nace en false (la otra mitad de la guardia G-6)", () => {
    assert.ok(form.includes("const [brandTouched, setBrandTouched] = useState(false);"),
      "si naciera en true, la restauración G-6 jamás correría por la otra puerta: el icono guardado se perdería al editar");
  });
  it("los testigos que la ola 10 cazó sin pin nacen como deben (G10-1, G10-2 y su primo)", () => {
    /* OLA 10: la §D fijaba los testigos que ya habían mordido, no la
     * familia. natureDraft nació sin pin: nacido no-nulo, TODA la suite
     * pasaba (1789/1789) mientras cada guardado de una línea de fondo
     * quedaría bloqueado por la pregunta de naturaleza que la mano nunca
     * tocó — la restauración del sello, muerta. El acoplamiento
     * tone/toneStart tampoco tenía pin: tone nacido desacoplado
     * (useState("")), la suite pasaba y cada edición de gasto o compra
     * estamparía color: "" sobre el color elegido y guardado. Y el primo
     * hintRef (un ref, fuera del alcance de los pines de useState):
     * nacido desigual, la pista aprendida dejaría de rellenar «Pagado
     * con» para siempre — función muerta, ningún byte guardado dañado.
     * Los nacimientos quedan fijados verbatim; el censo completo de la
     * familia, con su completitud, vive en la §F de modos-ola10. */
    assert.ok(form.includes("const [natureDraft, setNatureDraft] = useState<{ nature: FundNature | null; host: string } | null>(null);"),
      "natureDraft nace null: un borrador de naturaleza no-nulo al nacer bloquea cada guardado de fondo con una pregunta que la mano nunca tocó (G10-1)");
    assert.ok(form.includes("const [tone, setTone] = useState(toneStart);"),
      "tone nace ACOPLADO a toneStart: desacoplado, cada edición estamparía color vacío sobre el color guardado (G10-2)");
    assert.ok(form.includes('const hintRef = useRef("");'),
      "hintRef nace vacío: nacido con un valor, la pista aprendida no volvería a rellenar «Pagado con» jamás (OBS-G10-1)");
    assert.ok(form.includes("const baseRef = useRef<Record<string, unknown> | null>(null);"),
      "baseRef nace null: su nulidad sostiene el relleno perezoso que define la base del dirty — un testigo más del censo");
  });
  it("el censo de deletes de save() es cerrado: ni uno más (mutación MC)", () => {
    const tally: Record<string, number> = {};
    for (const m of form.matchAll(/delete line\.(\w+)/g)) tally[m[1]!] = (tally[m[1]!] ?? 0) + 1;
    // ENMIENDA OLA 6 (1.3.356): el pago automático entra al censo con
    // sus dos deletes — apagarlo (o dejarlo sin cuenta) lo borra entero,
    // como sourceId: el esparcido del guardián no lo resucita.
    assert.deepEqual(tally, { personId: 1, occasionId: 2, to: 1, sourceId: 1, rc: 1, bookedOn: 1, startedOn: 1, fund: 1, fundHost: 2, autopay: 1, autopayAccountId: 1 },
      "cada delete de save() es deliberado y nombrado: un delete escondido entre los legítimos borraría su campo en cada edición, en cualquier modo");
  });
});

/* ═══════════ §E · CARA-4: la promesa de la captura sigue a la cara ═══════════ */
describe("ola7 · CARA-4: «con una captura» solo donde la captura existe", () => {
  const cards = SRC("../../components/faro/cards.tsx");
  it("el estado vacío del grupo compone su frase con el asiento de la captura", () => {
    const at = cards.indexOf("cg-empty");
    assert.ok(at > 0, "el estado vacío existe");
    const block = cards.slice(at, at + 900);
    assert.ok(block.includes('has("scan.card-capture")'), "la frase mira el asiento antes de prometer la captura");
    assert.ok(block.includes("Añade tus tarjetas a mano."), "sin captura, la frase dice solo lo que el modo puede: a mano");
  });
  it("la prosa de «tarjetas» no promete en Ritmo lo que Ritmo no tiene", () => {
    const tp = findTopic("tarjetas");
    const how = tp?.how ?? ["", ""];
    assert.ok(!how[0]!.includes("captura") && !how[1]!.toLowerCase().includes("screenshot"),
      "el «how» del tema (despierto en Ritmo) no nombra la captura, que es de Completo");
    assert.ok(!how[0]!.includes("tasa anual") && !how[1]!.includes("yearly rate"),
      "ni manda poner la tasa, que en Ritmo ninguna forma muestra (CARA-5)");
  });
});

/* ═══════════ §F · CARA-5: el botón de la tasa lleva su puerta ═══════════ */
describe("ola7 · CARA-5: «Añade la tasa» solo donde la forma trae la tasa", () => {
  const cards = SRC("../../components/faro/cards.tsx");
  it("el botón cd-ask vive tras cards.add-full", () => {
    const at = cards.indexOf("cd-ask");
    assert.ok(at > 0, "el botón existe");
    assert.ok(cards.slice(Math.max(0, at - 260), at).includes('has("cards.add-full")'),
      "sin puerta, el botón pinta en Ritmo y abre una forma sin campo de tasa: promete un acto imposible en el modo");
  });
});

/* ═══════════ §G · CARA-6: la nota del panel y el tema se recomponen por modo ═══════════ */
describe("ola7 · CARA-6: exportar dice en cada modo lo que ese modo exporta", () => {
  const panel = SRC("../../components/faro/export-panel.tsx");
  const i18n = SRC("./i18n.ts");
  it("el panel elige su nota por el modo (pdfNote / pdfNote.basic)", () => {
    assert.ok(panel.includes("export.pdfNote.basic"), "la nota tiene su forma del panel recompuesto");
    assert.ok(panel.includes('full ? "export.pdfNote" : "export.pdfNote.basic"') || panel.includes("full ? \"export.pdfNote\""),
      "la elección mira el mismo `full` que compone las banderas");
  });
  it("la nota básica existe en los dos idiomas", () => {
    assert.equal(i18n.split('"export.pdfNote.basic"').length - 1, 2, "ES y EN, sin huérfanas");
  });
  it("la prosa de «exportar» no nombra como incluibles las hojas de Completo", () => {
    const tp = findTopic("exportar");
    const how = tp?.how ?? ["", ""];
    assert.ok(!how[0]!.includes("gráficas") && !how[0]!.includes("remesas"),
      "en Ritmo el panel no ofrece gráficas ni remesas: la prosa no las promete");
    assert.ok(!how[1]!.includes("charts") && !how[1]!.includes("remittances"),
      "ni en inglés");
  });
});

/* ═══════════ §H · CARA-7: «ahorros-todas» no nombra la palanca en Ritmo ═══════════ */
describe("ola7 · CARA-7: la prosa despierta describe la cara despierta", () => {
  it("el «what» de ahorros-todas no nombra el control «Si apartas» (vault.lever = Completo)", () => {
    const tp = findTopic("ahorros-todas");
    const what = tp?.what ?? ["", ""];
    assert.ok(!what[0]!.includes("Si apartas") && !what[1]!.includes("If you set aside"),
      "el tema vive en Ritmo y en Ritmo la palanca no existe: nombrarla es describir la cara de otro modo");
  });
});

/* ═══════════ §I · G7-O2: la cara lectora de Cuotas aparece en Esencial ═══════════ */
describe("ola7 · G7-O2: la entrada «Cuotas» de Esencial abre SU cara lectora", () => {
  const shell = SRC("../../components/faro/shell.tsx");
  it("la cara de la sección «subs» sin balanza gana al aterrizaje de deudas derivado de la sección", () => {
    assert.ok(shell.includes("subsFace"),
      "sin esta distinción, debtRo (de la sección) sombrea SubsReadOnly y el botón «Cuotas» muestra Debo");
    assert.ok(shell.includes('ui.section === "subs" ? <SubsReadOnly />'), "la rama de la cara lectora sigue en el ternario");
  });
});

/* ═══════════ §J · E7-1: el puente de la lección es de la familia de la escena ═══════════ */
describe("ola7 · E7-1: «Más en el manual» en todas las caras de la escena", () => {
  const pres = SRC("../../components/faro/presentacion.tsx");
  it("el mapa escena→tema ata por familia (las variantes comparten puente)", () => {
    assert.ok(pres.includes("sceneBase") && pres.includes("topicByBase"),
      "SCENE_TOPIC se extiende agrupando las entradas por su base antes de repartirlas");
  });
  it("el algoritmo de familia, corrido sobre el guion real, ata la balanza base a deudas-hechos", () => {
    // El mismo algoritmo de la cura, sobre los datos importables: si la
    // agrupación por base dejara de producir el puente de Ritmo/Completo,
    // esta cerca corre roja aunque la forma del fuente no cambie.
    const base = (id: string) => id.replace(/-(h|c|r)$/, "");
    const byBase: Record<string, string> = {};
    for (const [topic, t] of Object.entries(TOPIC_SCENES)) byBase[base(t.sceneId)] = topic;
    assert.equal(byBase["m19-balanza"], "deudas-hechos",
      "la familia de la balanza (su cara -h) declara el tema que las demás caras heredan");
  });
  it("la familia existe en el guion: la balanza de Deudas tiene caras -h y base", () => {
    const deudas = MODULES.find((m) => m.id === "deudas");
    const ids = deudas?.scenes.map((s) => s.id) ?? [];
    assert.ok(ids.includes("m19-balanza-h") && ids.includes("m19-balanza"),
      "la ranura que abre el módulo corre en Esencial (-h) y en Ritmo/Completo (base)");
  });
});

/* ═══════════ §K · E7-2: ningún botón muerto dentro del escenario ═══════════ */
describe("ola7 · E7-2: «Ver en la presentación» no se pinta con el escenario vivo", () => {
  const hint = SRC("../../components/faro/hint.tsx");
  it("el puente a la presentación mira stageOn() al pintarse, no solo al tocarse", () => {
    const at = hint.indexOf('data-anchor="hint-pres"');
    assert.ok(at > 0, "el botón existe");
    assert.ok(hint.slice(Math.max(0, at - 320), at).includes("!stageOn()"),
      "pintado dentro de una lección, el botón no puede cumplir: la guardia lo callaba sin decirlo");
  });
});

/* ═══════════ §M · C7-1: el toast envuelve (guarda de la cura de canon 1.3.307) ═══════════ */
describe("ola7 · C7-1: el texto del toast no vuelve a salir de su píldora", () => {
  const css = SRC("../../components/faro/bank.css");
  it("la regla del span del toast no prohíbe envolver", () => {
    const at = css.indexOf(".imp-toast span");
    assert.ok(at > 0, "la regla existe");
    const rule = css.slice(at, css.indexOf("}", at));
    assert.ok(!rule.includes("nowrap"), "con nowrap el toast compuesto se pinta fuera de pantalla a 390px");
    assert.ok(rule.includes("overflow-wrap"), "la cura de la 1.3.307: el texto envuelve y la píldora crece en alto");
  });
});
