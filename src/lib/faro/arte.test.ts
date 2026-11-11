// El arte como letrero (1.3.216): Oscar pidió que las cuatro ilustraciones
// — el faro del Asesor, la ruta del mar nocturno, el frasco y el semáforo
// de deuda — se reemitan como letreros Cyberpunk (planos, de imprenta), y
// decidió una sola cosa sobre el estudio: las bandas son LADRILLO #B44A40
// en AMBOS faros; el #FF003C queda reservado a la lámpara en corto. La ola
// es solo pintura CSS bajo la cerca del tema; esta suite fija los valores
// aprobados y, con la misma fuerza, lo que la ola no tocó (la pintura base
// de los demás temas, Tron nombrado, y los hexes-dato del semáforo).
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const cyber = fs.readFileSync(new URL("../../components/faro/cyberpunk.css", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const study2 = fs.readFileSync(new URL("../../components/faro/study2.css", import.meta.url), "utf8");
const advisor2 = fs.readFileSync(new URL("../../components/faro/advisor2.css", import.meta.url), "utf8");
const tron = fs.readFileSync(new URL("../../components/faro/tron.css", import.meta.url), "utf8");

const sectionStart = cyber.lastIndexOf("/*", cyber.indexOf("1.3.216:"));
const section = cyber.slice(sectionStart); // la sección cierra la hoja (tras el bloque Stillness, como la cerca de la 1.3.214 exige)

describe("arte 216: la cerca", () => {
  it("toda regla de la sección vive bajo la cerca cyberpunk", () => {
    const selectors = section.split("\n").filter((l) => l.trimEnd().endsWith("{") && !l.trim().startsWith("/*") && !l.trim().startsWith("*"));
    assert.ok(selectors.length >= 20, "la sección tiene menos reglas de las esperadas");
    for (const s of selectors) assert.ok(s.includes('[data-theme="cyberpunk"]'), `regla fuera de la cerca: ${s.trim()}`);
  });

  it("el rojo del tema aparece solo donde Oscar lo reservó (lámpara en corto, cifra en corto, punto en corto)", () => {
    const paint = section.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.equal(paint.split("#ff003c").length - 1, 3, "el #ff003c escapó de sus tres casas de corto");
    assert.ok(!paint.includes("#FF003C"), "el rojo no debe aparecer en otra capitalización");
  });
});

describe("arte 216: el faro (MonthTower)", () => {
  it("la pared imprime en dos tonos planos sobre las paradas del propio gradiente", () => {
    assert.ok(section.includes('linearGradient:nth-of-type(1) stop:nth-child(1) { stop-color: #ede7d6; }'));
    assert.ok(section.includes('linearGradient:nth-of-type(1) stop:nth-child(3) { stop-color: #c9c0a8; }'));
  });

  it("las bandas y el techo son ladrillo #B44A40, y el remate también", () => {
    assert.ok(section.includes('linearGradient:nth-of-type(2) stop { stop-color: #b44a40; }'));
    assert.ok(section.includes('circle[fill="#c9584d"] { fill: #b44a40; }'));
  });

  it("el haz es una cuña plana amarilla con la opacidad atada al dato (--glow × 0.5), sin barrido ni mezcla", () => {
    assert.ok(section.includes("opacity: calc(var(--glow) * .5);"));
    assert.ok(section.includes(".a2-beam path { fill: #fcee0a; }"));
    const beam = section.slice(section.indexOf(".a2-beam {"), section.indexOf("}", section.indexOf(".a2-beam {")));
    assert.ok(beam.includes("animation: none") && beam.includes("mix-blend-mode: normal"), "el haz conserva movimiento o mezcla");
  });

  it("la lámpara es un disco plano amarillo; en corto, el disco rojo reservado", () => {
    assert.ok(section.includes(".a2-lamp { fill: #fcee0a; filter: none; animation: none; r: 7px; }"));
    assert.ok(section.includes(".a2-tower.is-short .a2-lamp { fill: #ff003c; }"));
    assert.ok(section.includes(".a2-halo { display: none; }"));
  });

  it("la micro-letra del plato es «FARO · MES EN CURSO» en mono", () => {
    assert.ok(section.includes('content: "FARO · MES EN CURSO";'));
  });
});

describe("arte 216: la ruta del mar (CushionCard)", () => {
  it("el mar son tres bandas cálidas planas — cero azul", () => {
    assert.ok(section.includes('.s2-voyage svg rect[fill="#0c1520"] { fill: #0b0a08; }'));
    assert.ok(section.includes('.s2-voyage svg rect[fill="url(#s2-sea)"] { fill: #2d261d; }'));
    assert.ok(section.includes(".s2-wave { fill: #211b14; opacity: 1; animation: none; }"));
    assert.ok(section.includes(".s2-wave.b { fill: #15120f; opacity: 1; }"));
  });

  it("el haz es la banda plana única aceptada (.35) sobre el ápice corregido", () => {
    assert.ok(section.includes(".s2-beamcone { fill: #fcee0a; opacity: .35; animation: none; }"));
  });

  it("el cian vive en una sola familia: la ruta no navegada y las marcas no alcanzadas", () => {
    assert.ok(section.includes(".s2-route { stroke: var(--cp-data); opacity: .8; }"));
    assert.ok(section.includes(".s2-tick circle { fill: #15120f; stroke: var(--cp-data); stroke-width: 1.2; }"));
    assert.ok(section.includes(".s2-tick.is-on circle { fill: #fcee0a; stroke: none; }"));
    assert.ok(section.includes(".s2-route-on { stroke: #fcee0a; stroke-width: 2.2; }"));
  });

  it("el faro miniatura viste ladrillo, por la palabra de Oscar (no el rojo del previo)", () => {
    assert.ok(section.includes('.s2-house path[fill="#c45c4a"] { fill: #b44a40; }'));
    assert.ok(section.includes('.s2-house path[fill="#e9e2d0"] { fill: #f2eee3; }'));
  });

  it("la leyenda del plato es «RUTA · COLCHÓN» y al llegar la lámpara queda encendida y quieta", () => {
    assert.ok(section.includes('content: "RUTA · COLCHÓN";'));
    assert.ok(section.includes(".s2-lamp { fill: #fcee0a; animation: none; }"));
    assert.ok(section.includes("drop-shadow(0 0 5px rgb(252 238 10 / .85))"));
    assert.ok(section.includes('.s2-boat path[fill="#d7b48a"] { fill: #d9a441; }'));
  });
});

describe("arte 216: el frasco", () => {
  it("el relleno es una banda plana verde con la cima escalonada; la ola animada se retira", () => {
    assert.ok(section.includes("background: #00e67a;"));
    assert.ok(section.includes("clip-path: polygon(0 min(5px, 45%), 34% min(5px, 45%), 34% min(2px, 20%), 67% min(2px, 20%), 67% 0, 100% 0, 100% 100%, 0 100%);"));
    assert.ok(section.includes(".s2-jar-water svg { display: none; }"));
  });

  it("la cifra vive sobre su placa de color fondo, nunca sobre el relleno", () => {
    const span = section.slice(section.indexOf(".s2-jar-glass span {"), section.indexOf("}", section.indexOf(".s2-jar-glass span {")));
    assert.ok(span.includes("background: #0b0a08; border: 1px solid #3a332a;"), "la placa de la cifra cambió");
    assert.ok(span.includes("text-shadow: none"), "la cifra conserva sombra de legibilidad");
  });

  it("la tapa es ocre plana chaflanada y el sello «MES · META» va al pie", () => {
    assert.ok(section.includes("background-color: #d9a441; border-radius: 0;"));
    assert.ok(section.includes('content: "MES · META";'));
    assert.ok(section.includes("border-radius: 0 0 6px 6px;"));
  });
});

describe("arte 216: el semáforo de deuda", () => {
  const traffic = section.slice(section.indexOf("— 4 · THE TRAFFIC LIGHT"));

  it("la carcasa es un plinto plano elevado con chaflanes y su anillo de pelo", () => {
    assert.ok(traffic.includes("background: #201b16; border-radius: 0;"));
    assert.ok(traffic.includes("box-shadow: inset 0 0 0 1px #57503f;"));
  });

  it("las lámparas encendidas guardan sus hexes-dato con el halo racionado a 6px al 65%", () => {
    assert.ok(traffic.includes(".signal-light.bad.is-on { background: #e15b52; box-shadow: 0 0 6px rgb(225 91 82 / .65); }"));
    assert.ok(traffic.includes(".signal-light.warn.is-on { background: #e2b04a; box-shadow: 0 0 6px rgb(226 176 74 / .65); }"));
    assert.ok(traffic.includes(".signal-light.good.is-on { background: #2f9a62; box-shadow: 0 0 6px rgb(47 154 98 / .65); }"));
  });

  it("la apagada es un zócalo oscuro con anillo; la viva no mostrada lleva el anillo de tinta", () => {
    assert.ok(traffic.includes(".signal-light { background: #0b0a08; box-shadow: inset 0 0 0 1.5px #57503f; }"));
    assert.ok(traffic.includes("0 0 0 2px #201b16, 0 0 0 4px #f2eee3"));
  });

  it("ningún amarillo señal toca esta tarjeta; la placa dice «SEMÁFORO · DEUDA»", () => {
    assert.ok(!traffic.includes("#fcee0a"), "el amarillo señal apareció en la tarjeta del semáforo");
    assert.ok(traffic.includes('content: "SEMÁFORO · DEUDA";'));
  });
});

describe("arte 216: lo que no se tocó", () => {
  it("la pintura base de los motivos sobrevive intacta para los demás temas", () => {
    assert.ok(advisor2.includes(".a2-lamp { filter: drop-shadow(0 0 7px #fff1c4);"), "la lámpara base cambió");
    assert.ok(study2.includes(".s2-lamp { fill: #ffd98a; animation: s2-glow 3s ease-in-out infinite; }"), "la lámpara miniatura base cambió");
    assert.ok(study2.includes(".s2-wave { fill: #1d3a4f; opacity: .55; animation: s2-drift 9s linear infinite; }"), "el mar base cambió");
  });

  it("el repintado propio de Tron sobre esta misma torre queda intacto", () => {
    assert.ok(tron.includes('[data-theme="tron"] .a2-tower-art defs linearGradient:nth-of-type(1) stop:nth-child(1) { stop-color: #0a161b; }'), "la pared de Tron cambió");
  });

  it("los hexes-dato del semáforo en la hoja base no se movieron", () => {
    assert.ok(styles.includes(".signal-light.bad.is-on { background: #e15b52; box-shadow: 0 0 12px rgb(225 91 82 / 70%)"), "el rojo base del semáforo cambió");
    assert.ok(styles.includes(".signal-light.warn.is-on { background: #e2b04a; box-shadow: 0 0 12px rgb(226 176 74 / 70%)"), "el ámbar base del semáforo cambió");
    assert.ok(styles.includes(".signal-light.good.is-on { background: #2f9a62; box-shadow: 0 0 12px rgb(47 154 98 / 70%)"), "el verde base del semáforo cambió");
  });
});
