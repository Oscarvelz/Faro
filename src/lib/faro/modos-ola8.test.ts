/**
 * FARO — OLA 8 DE PREJUICIO contra los tres modos: la cura y sus cercas.
 *
 * La enfermedad de la ola: LAS CURAS VECINAS — la raíz cuadrada que la
 * 1.3.311 trajo a la Agenda sin el dominio de la recta que reemplazó
 * (BR8-1), la guardia de la ola 7 que miró el DISPARO del aviso y no la
 * PUERTA del guardado (G8-4), la cerca §D que fijaba inicializadores y
 * presencias pero no salidas ni exclusividades (G8-1/2/3), la valla
 * tema↔campo escrita como lista que una re-declaración consistente
 * atravesaba (CARA-1, en modos-ola7 §A derivada), los administradores del
 * catálogo y de las marcas pintados una planta por debajo de su asiento
 * (CARA-2/3), la prosa que prometía el libro entero y la bóveda entera
 * (CARA-4/5) y la familia de escenas -r que el algoritmo de familia no
 * ataba (OBS-E8-1). Donde la rotura vive en un componente, la cerca es de
 * fuente y el banco CDP de la ronda la acompaña (shots-cura8/). Los libros
 * son especímenes fijados a mano sobre el 2026-11-17; jamás producción.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readCoach } from "./coach.ts";
import { createInitial, makeNamer } from "./defaults.ts";
import { MODULES } from "./guion.ts";
import { FEATURES } from "./mode.ts";
import { findTopic } from "../manual/topics.ts";
import type { LedgerState, Line } from "./types.ts";

const SRC = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const KEY = "2026-11";
const iso = (off: number) => {
  const d = new Date(2026, 10, 17 + off, 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let seq = 0;
function line(partial: Partial<Line> & { kind: Line["kind"]; amountMinor: number }): Line {
  seq += 1;
  const id = `l${seq}`;
  return {
    id, seriesId: id, monthKey: KEY, concept: "", currency: "NIO", active: true, note: "",
    categoryId: "", subId: "", recurring: false, storeId: "", providerId: "", productCode: "",
    productUrl: "", cadence: "", nextDue: "", aprBps: 0, balanceMinor: null, balanceCurrency: "NIO",
    icon: "", history: [], ...partial,
  } as Line;
}

/* ═══════════ §A · BR8-1: la raíz de la Agenda y el importe negativo ═══════════
 * La 1.3.311 cambió la escala lineal del tamaño de burbujas por una raíz
 * cuadrada; la raíz no tolera lo que la recta sí: un vencimiento de importe
 * negativo (un abono, un crédito) daba size = NaN y su burbuja no pintaba.
 * La cura acota el dominio dentro de la raíz; el espécimen es el B1 del
 * informe del Asesor VIII, corrido sobre el readCoach real. */
describe("ola8 · BR8-1: ningún vencimiento pinta una burbuja NaN", () => {
  const pano = SRC("../../components/faro/panorama.tsx");
  it("el tamaño acota el dominio de la raíz (el negativo pinta al mínimo, como el cero)", () => {
    assert.ok(pano.includes("Math.sqrt(Math.max(0, (d.minor ?? 0) / peak))"),
      "sin la cota, sqrt de un cociente negativo es NaN y el CSS de esa burbuja es inválido");
    assert.ok(!pano.includes("Math.sqrt((d.minor ?? 0) / peak)"),
      "la forma sin cota de la 1.3.311 no vuelve");
  });
  it("el espécimen B1: la cuota de −C$200 entra en dues y su tamaño curado es 10, no NaN", () => {
    const b: LedgerState = createInitial("es", "claro");
    b.settings.mode = "ritmo";
    b.months[KEY] = { lines: [line({ kind: "income-fixed", concept: "Salario", amountMinor: 3_000_000 })] };
    b.months[KEY]!.lines.push(line({ kind: "subscription", concept: "Crédito tienda", amountMinor: -20_000, nextDue: iso(5), recurring: true }));
    b.months[KEY]!.lines.push(line({ kind: "subscription", concept: "Internet", amountMinor: 50_000, nextDue: iso(8), recurring: true }));
    const c = readCoach(b, KEY, "es", makeNamer(b.structure, "es"), new Date(2026, 10, 17, 12));
    const neg = c.dues.find((d) => d.name === "Crédito tienda");
    assert.ok(neg, "la cuota negativa entra en la ventana de vencimientos (dues.ts no filtra el signo)");
    assert.equal(neg!.minor, -20_000);
    const peak = Math.max(1, ...c.dues.map((d) => d.minor ?? 0));
    assert.equal(peak, 50_000);
    const sinCota = 10 + Math.sqrt(((neg!.minor ?? 0) / peak)) * 8;
    assert.ok(Number.isNaN(sinCota), "el espécimen muerde: la fórmula de la 1.3.311 da NaN sobre este libro");
    const conCota = 10 + Math.sqrt(Math.max(0, (neg!.minor ?? 0) / peak)) * 8;
    assert.equal(conCota, 10, "con la cota, el negativo pinta al tamaño mínimo, como una cuota en cero");
  });
});

/* ═══════════ §B · G8-4: la guardia simétrica en la puerta del guardado ═══════════
 * La ola 7 puertó el DISPARO del aviso aprendido (el efecto), pero save()
 * esparcía el estado `pay` sin consultar el asiento vigente: con la forma
 * abierta en Ritmo y el aviso sellado a la vista, una bajada desde otra
 * pestaña hacía desaparecer el campo — y el guardado nacía la línea con el
 * sourceId sellado en un modo que no lo pinta. La cura calcula el sello
 * EFECTIVO al guardar: sin asiento, vale lo que la línea ya traía (editar
 * conserva; crear nace sin sello), y el aprendizaje aprende del efectivo. */
describe("ola8 · G8-4: el guardado consulta el mismo asiento que la pintura", () => {
  const form = SRC("../../components/faro/line-form.tsx");
  it("save() calcula el sello efectivo contra el asiento vigente", () => {
    assert.ok(form.includes('const payEff = has("editor.paid-with") ? pay : (existing?.sourceId ?? "");'),
      "sin la guardia de la puerta, la bajada a mitad de forma sella en silencio (espécimen de dos pestañas del Guardián VIII)");
  });
  it("el literal fresh esparce el sello efectivo, no el estado crudo", () => {
    assert.ok(form.includes("...(payEff ? { sourceId: payEff } : {})"),
      "el nacimiento de la línea usa payEff: en Esencial una línea nueva nace sin sourceId aunque el aviso lo hubiera sellado en Ritmo");
    const at = form.indexOf("const fresh: Line = {");
    const block = form.slice(at, form.indexOf("const line: Line", at));
    assert.ok(!block.includes("...(pay ? { sourceId: pay }"), "el esparcido crudo no vuelve al literal");
  });
  it("el aprendizaje aprende del sello efectivo", () => {
    assert.ok(form.includes("return payEff && payTouched ? { ...withNature, imports: learnPayHint(importBook(withNature), line.concept, payEff) } : withNature;"),
      "aprender de un pay que el modo vigente no pinta enseñaría el sello a escondidas del modo");
  });
  it("la raíz de la fusión sigue verbatim (octava vuelta)", () => {
    assert.ok(form.includes("const line: Line = existing ? { ...existing, ...fresh } : fresh;"),
      "el esparcido que conserva lo no pintado no se toca");
  });
});

/* ═══════════ §C · CARA-2/3: administrar vive en su planta ═══════════
 * Administrar el catálogo (renombrar, ocultar, color de categoría) es de
 * Ritmo (fallo de Catálogo de Oscar) y administrar los íconos de marca
 * (borrar, restaurar de fábrica) es de Completo; ambos asientos existían
 * sin un solo consumidor y los selectores administraban en cualquier modo.
 * Elegir y crear en el punto de uso sigue en Esencial: lo que se puertea
 * es el `manage`, no el selector. Y la mentira hermana del registro:
 * editor.icon-color asentaba en Completo el look PROPIO de la línea, que
 * es dato de creación — su tema f-color vive en Esencial y la cara ya lo
 * pintaba allí; el asiento era la mentira, y se re-asienta a Esencial. */
describe("ola8 · CARA-2/3: los selectores administran solo donde su asiento alcanza", () => {
  const fit = SRC("../../components/faro/fit-pick.tsx");
  it("los cuatro selectores de catálogo puertean su manage por editor.picker-manage", () => {
    assert.equal(fit.split('has("editor.picker-manage")').length - 1, 4,
      "tiendas, categorías de compra, categorías y suscripciones: administrar (renombrar, ocultar, color) solo desde Ritmo");
  });
  it("el selector de marcas puertea su manage por subs.brand-icon-admin", () => {
    assert.equal(fit.split('has("subs.brand-icon-admin")').length - 1, 1,
      "borrar y restaurar de fábrica íconos de marca: solo Completo; elegir el ícono sigue donde estaba");
  });
  it("los asientos dicen su planta verdadera", () => {
    assert.equal(FEATURES["editor.picker-manage"], "ritmo", "administrar el catálogo es de Ritmo (fallo de Catálogo)");
    assert.equal(FEATURES["subs.brand-icon-admin"], "completo", "administrar las marcas es de Completo");
    assert.equal(FEATURES["editor.icon-color"], "esencial", "el look propio de la línea se elige al crear: es dato de creación, no administración");
  });
});

/* ═══════════ §D · CARA-4: «exportar» dice las hojas de su modo ═══════════
 * Principio 4: cada salida imprime exactamente lo que su panel presenta.
 * La nota del panel ya se recompuso por modo en la ola 7 (CARA-6); la
 * prosa del Manual quedó un paso atrás prometiendo «todas las hojas» en
 * Ritmo, cuyo Excel omite por construcción las hojas de Completo. */
describe("ola8 · CARA-4: la prosa de exportar no promete el libro entero", () => {
  it("el «how» de exportar nombra las hojas del modo, no todas", () => {
    const tp = findTopic("exportar");
    const how = tp?.how ?? ["", ""];
    assert.ok(!how[0]!.includes("todas las hojas"), "en Ritmo el Excel no trae las hojas de deudas, tarjetas, remesas ni plan");
    assert.ok(!how[1]!.includes("every sheet"), "ni en inglés");
    assert.ok(how[0]!.includes("tu modo") && how[1]!.includes("your mode"),
      "la frase dice la verdad de los dos modos donde el tema vive: las hojas que el panel de tu modo ofrece");
  });
});

/* ═══════════ §E · CARA-5: «ahorros-todas» describe la bóveda de Ritmo ═══════════
 * La ola 7 quitó «Si apartas» de la prosa; quedaron tres superficies de
 * Completo descritas como si fueran la cara de Ritmo: la gráfica del
 * periodo (vault.segments), la cabecera compuesta con sus partes
 * nombradas y la lectura nombre/libre bajo cada saldo (nature.class-saldo).
 * En Ritmo la cabecera dice solo «Lo guardado» y el panel «Todas las
 * cuentas» suma solo cuentas: eso es lo que la prosa puede decir. */
describe("ola8 · CARA-5: la prosa despierta describe la cara despierta de la bóveda", () => {
  it("el «what» de ahorros-todas no describe superficies de Completo", () => {
    const tp = findTopic("ahorros-todas");
    const what = tp?.what ?? ["", ""];
    assert.ok(!what[0]!.includes("gráfica del periodo") && !what[1]!.includes("period chart"),
      "la gráfica del periodo es vault.segments (Completo): en Ritmo no se pinta");
    assert.ok(!what[0]!.includes("partes nombradas") && !what[1]!.includes("parts named"),
      "la cabecera de partes nombradas es de Completo: en Ritmo dice solo «Lo guardado»");
    assert.ok(!what[0]!.includes("lo que ya tiene nombre y lo que queda libre") && !what[1]!.includes("what already has a name and what stays free"),
      "la lectura nombre/libre bajo el saldo es nature.class-saldo (Completo)");
    assert.ok(what[0]!.includes("Todas las cuentas") && what[1]!.includes("All accounts"),
      "lo que sí es verdad en Ritmo se queda: el panel de cuentas suma solo cuentas");
  });
});

/* ═══════════ §F · OBS-E8-1: la familia -r también es familia ═══════════
 * sceneBase desnudaba -(h|c)$; el módulo «Los modos» ya trae variantes -r
 * (m15-mudos-r, m15-solo-lectura-r) que quedaban FUERA de su familia: el
 * día que TOPIC_SCENES nombre la cara de Esencial, la cara -r perdería su
 * puente «Más en el manual» en silencio — la recaída exacta de E7-1. La
 * cura desnuda también -r y este censo corre sobre el guion real: toda
 * variante comparte base con al menos una hermana de su módulo. */
describe("ola8 · OBS-E8-1: el algoritmo de familia ata también la familia -r", () => {
  const pres = SRC("../../components/faro/presentacion.tsx");
  it("sceneBase desnuda los tres sufijos de variante", () => {
    assert.ok(pres.includes('id.replace(/-(h|c|r)$/, "")'),
      "con solo -(h|c)$, las caras -r no heredan el puente de su familia");
  });
  it("las caras -r de «Los modos» comparten base con su cara de Esencial", () => {
    const base = (id: string) => id.replace(/-(h|c|r)$/, "");
    assert.equal(base("m15-mudos-r"), "m15-mudos");
    assert.equal(base("m15-solo-lectura-r"), "m15-solo-lectura");
  });
  it("el censo de familias del guion real: toda variante tiene hermana en su módulo", () => {
    const base = (id: string) => id.replace(/-(h|c|r)$/, "");
    for (const mod of MODULES) {
      const ids = mod.scenes.map((s) => s.id);
      for (const id of ids) {
        if (!/-(h|c|r)$/.test(id)) continue;
        const b = base(id);
        assert.ok(ids.some((other) => other !== id && base(other) === b),
          `${mod.id}/${id}: su base ${b} no la comparte ninguna hermana — la variante quedó fuera de su familia`);
      }
    }
  });
});
